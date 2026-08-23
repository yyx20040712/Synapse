/**
 * [SR-RDR-01] annotation-anchor —— 定位纯函数（工单：done / strong，Phase 3/4）
 *
 * ── 行为层 ──
 * - 文本偏移 ↔ DOM 范围 互转（WADM textQuote/textPosition 思路）：
 *   findRangeAtOffset(root: HTMLElement, start: number, end: number): DOMRange | null
 *   —— 遍历文本节点累计字符偏移，命中区间返回 { rects, textNodes }
 * - verifyQuote(root, { prefix, quote, suffix, start }): number | null
 *   —— 用前缀/后缀/引文校验 startOffset 是否仍有效；失效时尝试重定位
 * - rectsFromRange(range, pageSize): AnnotationRect[]（归一化 0..1）
 * - selectionToAnchor(root, selection): SelectionAnchor | null（2026-08-22 契约演进，
 *   Phase 4 标注链前置）——用户划选（Selection）→ 锚定三元组
 *   { start, end, quote, prefix, suffix, rects }，SelectionLayer 的保存入口；
 *   边界点→全局偏移用 probe-range 文本长度探测（文本/元素容器统一成立）
 *
 * 偏移约定：页内全文 = 按文档序拼接全部文本节点（节点间无间隙）；区间为半开
 * [start, end)；verifyQuote 的 start 与返回值均指 quote 首字符的页内偏移。
 * rects 的 page 恒为 0：本模块只在单页根上工作，实际页码由调用方（持有 page
 * 属性的 SelectionLayer/AnnotationLayer）在持久化时改写。
 * mergeLineRects(pixels, pageWidth)（2026-08-23 Q3 修复演进）：clientRects 行级
 * 合并——同形去重/y 重叠聚行簇（高度可比带防旋转文本互并）/x 大间隙断段（防
 * 多栏桥接）/段内 x 并集+y/h 取主导矩形；rectsBetweenPoints 归一化前调用，
 * 划选保存与重开重锚两路径同口径。
 *
 * ── 接口层 ──
 * - export interface DOMRange { rects: AnnotationRect[]; textNodes: Array<{ node: Text; offset: number }> }
 * - 上述三个函数签名如行为层（全部纯/幂等，无 React 依赖）
 *
 * ── 架构层 ──
 * - 全项目唯一操作 DOM 文本遍历的地方；SelectionLayer/AnnotationLayer 只调用它
 *
 * ── 生命周期层 ──
 * - 性能约束：单页千级文本节点 <10ms；不做跨页标注（v1 负面清单）
 *
 * ── 文化层 ──
 * - 测试：tests/unit/renderer/annotation-anchor.test.ts（已锁定，jsdom 环境跑 DOM 用例：
 *   基本命中/跨节点/前后缀漂移/重定位失败 返回 null）
 */
import type { AnnotationRect } from '@shared/models/annotation'

export interface DOMRange {
  rects: AnnotationRect[]
  textNodes: Array<{ node: Text; offset: number }>
}

/** 文本节点在页内全文中的跨度（半开区间，全局偏移） */
interface NodeSpan {
  node: Text
  start: number
  end: number
}

/** DOM 边界点：某文本节点内的字符偏移 */
interface DomPoint {
  node: Text
  offset: number
}

/** 像素矩形/基准盒（origin 为视口坐标，尺寸已做 ≥1 下限防除零） */
interface PixelBox {
  x: number
  y: number
  w: number
  h: number
}

/** 按文档序收集文本节点并累计全局偏移；零长度节点不参与（避免空命中项） */
function collectSpans(root: HTMLElement): { spans: NodeSpan[]; total: number } {
  const spans: NodeSpan[] = []
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let cursor = 0
  for (let n = walker.nextNode() as Text | null; n !== null; n = walker.nextNode() as Text | null) {
    if (n.data.length > 0) {
      spans.push({ node: n, start: cursor, end: cursor + n.data.length })
      cursor += n.data.length
    }
  }
  return { spans, total: cursor }
}

/** 页内全文（与 collectSpans 同一拼接口径，保证偏移语义一致） */
function fullTextOf(root: HTMLElement): string {
  return collectSpans(root)
    .spans.map((s) => s.node.data)
    .join('')
}

export function findRangeAtOffset(
  root: HTMLElement,
  start: number,
  end: number
): DOMRange | null {
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end <= start) {
    return null
  }
  const { spans, total } = collectSpans(root)
  if (end > total) {
    return null
  }
  const textNodes: DOMRange['textNodes'] = []
  let first: NodeSpan | null = null
  let last: NodeSpan | null = null
  for (const span of spans) {
    if (span.end <= start) {
      continue
    }
    if (span.start >= end) {
      break
    }
    if (first === null) {
      first = span
    }
    last = span
    // 首节点记录区间在本节点内的起点；后续节点从 0 覆盖到区间末端
    textNodes.push({ node: span.node, offset: Math.max(0, start - span.start) })
  }
  if (first === null || last === null) {
    return null
  }
  // 精确几何：起止边界点都已知，按页根盒归一化（阅读器中页根即页面容器）
  const base = pixelBoxOf(root)
  const rects = rectsBetweenPoints(
    { node: first.node, offset: start - first.start },
    { node: last.node, offset: end - last.start },
    base
  )
  return { rects, textNodes }
}

export function verifyQuote(
  root: HTMLElement,
  selector: { prefix: string; quote: string; suffix: string; start: number }
): number | null {
  const { prefix, quote, suffix, start } = selector
  if (quote.length === 0) {
    return null
  }
  const text = fullTextOf(root)
  // 原位校验：前缀/引文/后缀在 start 处全部吻合则直接返回原偏移
  if (matchAt(text, start, prefix, quote, suffix)) {
    return start
  }
  // 重定位（textQuote 自愈）：引文仍存在但原偏移已漂移（前部文本增删）。
  // prefix+suffix 双匹配优先，其次任一单匹配；同级取距原偏移最近者。
  let best: number | null = null
  let bestScore = 0
  let bestDist = Number.POSITIVE_INFINITY
  for (let i = text.indexOf(quote); i !== -1; i = text.indexOf(quote, i + 1)) {
    const prefixOk =
      prefix.length === 0 ||
      (i - prefix.length >= 0 && text.startsWith(prefix, i - prefix.length))
    const suffixOk = suffix.length === 0 || text.startsWith(suffix, i + quote.length)
    const score = (prefixOk ? 2 : 0) + (suffixOk ? 1 : 0)
    if (score === 0) {
      continue
    }
    const dist = Math.abs(i - start)
    if (score > bestScore || (score === bestScore && dist < bestDist)) {
      best = i
      bestScore = score
      bestDist = dist
    }
  }
  return best
}

/** text[i..] 起恰为 quote，且其前恰为 prefix、其后恰为 suffix */
function matchAt(text: string, i: number, prefix: string, quote: string, suffix: string): boolean {
  if (!Number.isInteger(i) || i < 0 || i + quote.length > text.length) {
    return false
  }
  if (!text.startsWith(quote, i)) {
    return false
  }
  if (prefix.length > 0 && (i - prefix.length < 0 || !text.startsWith(prefix, i - prefix.length))) {
    return false
  }
  if (suffix.length > 0 && !text.startsWith(suffix, i + quote.length)) {
    return false
  }
  return true
}

/** 划选锚定结果：saveAnnotation 输入的全部定位字段（rects.page 恒 0，调用方改写实际页码） */
export interface SelectionAnchor {
  start: number
  end: number
  quote: string
  prefix: string
  suffix: string
  rects: AnnotationRect[]
}

/** 引文前后上下文截取窗口（prefix/suffix 长度，WADM textQuote 惯例） */
const CONTEXT_CHARS = 32

/**
 * 用户划选 → 页内锚定。选区任一边界在 root 之外（跨页/页外）返回 null，
 * 由调用方提示"仅支持单页内标注"。quote 为空（纯元素/零宽选择）同样返回 null。
 */
export function selectionToAnchor(
  root: HTMLElement,
  selection: Selection
): SelectionAnchor | null {
  if (selection.rangeCount === 0 || selection.isCollapsed) {
    return null
  }
  const range = selection.getRangeAt(0)
  if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) {
    return null
  }
  const { spans, total } = collectSpans(root)
  if (total === 0) {
    return null
  }
  // 边界点 → 全局偏移：probe-range 的文本长度（文档序拼接口径与 collectSpans 一致）
  const leadLen = probeTextLength(root, range.startContainer, range.startOffset, 'start')
  const tailLen = probeTextLength(root, range.endContainer, range.endOffset, 'end')
  if (leadLen === null || tailLen === null) {
    return null
  }
  const start = leadLen
  const end = total - tailLen
  if (end <= start) {
    return null
  }
  const text = spans.map((s) => s.node.data).join('')
  const first = offsetToPoint(spans, start)
  const last = offsetToPoint(spans, end)
  if (first === null || last === null) {
    return null
  }
  return {
    start,
    end,
    quote: text.slice(start, end),
    prefix: text.slice(Math.max(0, start - CONTEXT_CHARS), start),
    suffix: text.slice(end, Math.min(total, end + CONTEXT_CHARS)),
    rects: rectsBetweenPoints(first, last, pixelBoxOf(root))
  }
}

/**
 * probe-range 文本长度：side='start' 探 [root 起..边界) → 长度即边界全局偏移；
 * side='end' 探 [边界..root 尾) → 长度是其后文长度（调用方用 total 相减）。
 * Range.toString 按文档序拼接相交文本节点的命中区间，元素/文本容器统一成立
 */
function probeTextLength(
  root: HTMLElement,
  container: Node,
  offset: number,
  side: 'start' | 'end'
): number | null {
  try {
    const probe = document.createRange()
    probe.selectNodeContents(root)
    if (side === 'start') {
      probe.setEnd(container, offset)
    } else {
      probe.setStart(container, offset)
    }
    return probe.toString().length
  } catch {
    // 节点脱离文档等异常：无法探测，交由调用方按 null 放弃本次划选
    return null
  }
}

/** 全局偏移 → DOM 边界点；end 允许等于 total（贴页尾时取末节点终点） */
function offsetToPoint(spans: NodeSpan[], global: number): DomPoint | null {
  for (const s of spans) {
    if (global < s.end) {
      return { node: s.node, offset: global - s.start }
    }
  }
  const last = spans[spans.length - 1]
  return last === undefined ? null : { node: last.node, offset: last.end - last.start }
}

export function rectsFromRange(
  range: DOMRange,
  pageSize: { w: number; h: number }
): AnnotationRect[] {
  // findRangeAtOffset 产出的 rects 已按页根盒归一化，直接透传（真实渲染的主路径）
  if (range.rects.length > 0) {
    return range.rects
  }
  // 手工构造的 DOMRange（未经 findRangeAtOffset）：从 textNodes 重建几何，
  // 按声明的页面尺寸归一化。此路径无页根原点可扣减，仅在无布局量测的场景使用
  const first = range.textNodes[0]
  const last = range.textNodes[range.textNodes.length - 1]
  if (first === undefined || last === undefined) {
    return []
  }
  const base: PixelBox = { x: 0, y: 0, w: Math.max(pageSize.w, 1), h: Math.max(pageSize.h, 1) }
  return rectsBetweenPoints(
    { node: first.node, offset: first.offset },
    // DOMRange 不携带区间末端信息，末节点只能覆盖到其文本末尾（单节点区间精确）
    { node: last.node, offset: last.node.data.length },
    base
  )
}

/** 元素盒；无布局环境（jsdom/离屏）时各分量为 0，尺寸兜底为 1 防除零 */
function pixelBoxOf(el: Element): PixelBox {
  let x = 0
  let y = 0
  let w = 0
  let h = 0
  if (typeof el.getBoundingClientRect === 'function') {
    const b = el.getBoundingClientRect()
    x = b.x
    y = b.y
    w = b.width
    h = b.height
  }
  return { x, y, w: Math.max(w, 1), h: Math.max(h, 1) }
}

/** 两边界点之间的客户端矩形 → 相对 base 的归一化矩形（0..1，越界截断） */
function rectsBetweenPoints(a: DomPoint, b: DomPoint, base: PixelBox): AnnotationRect[] {
  // 行级合并先于归一化（像素域判间隙/高度可比）：划选保存与重开重锚两路径在此同口径收口
  const pixels = mergeLineRects(clientRectsBetween(a, b), base.w)
  if (pixels.length === 0) {
    return [zeroRect()]
  }
  const clamp01 = (v: number): number => Math.min(1, Math.max(0, v))
  return pixels.map((r) => ({
    page: 0,
    x: clamp01((r.x - base.x) / base.w),
    y: clamp01((r.y - base.y) / base.h),
    w: clamp01(r.w / base.w),
    h: clamp01(r.h / base.h)
  }))
}

// ── clientRects 行级合并（pdf.js 文本层逐 span 绝对定位、各字号/基线不同，同一
//    视觉行会产多个高矮不一且竖向重叠的矩形——逐矩形透传导致高亮叠深、下划线错落）──

/** 同形去重容差（px）：相邻节点重复量测的亚像素差 */
const DEDUP_EPSILON_PX = 0.5
/** 高度可比带：矩形高在簇主导矩形高的 [0.5,2] 倍内视为同行字号变体（上标/公式），
 *  超出按旋转/竖排文本独立成簇（高瘦矩形并入行簇会 corrupt y/h 与并集）。贪心
 *  比对当前主导：行内高度方差 ≥2.2× 时主导切换可拆行；且聚类只与末簇比较——
 *  高瘦矩形恰排在同一行两碎片之间（y 序插队）时，后碎片与真行簇"失联"另起簇。
 *  两场景后果同为同行拆两矩形（multiply 下无叠深、几何各自正确），属 ADR-0002
 *  复杂排版近似边界——修法应是把比较扩到全部簇，而非放宽可比带/重叠率（会引入
 *  跨行误并，损失大于所得） */
const HEIGHT_RATIO_MIN = 0.5
const HEIGHT_RATIO_MAX = 2
/** y 重叠率门槛：重叠像素须 ≥ 较小高度（新矩形高 vs 主导高取小）的 25% 才算同行
 *  ——同行片段（上标/基线偏移）重叠率近 1；紧行距（leading ≤ ~0.93em）下相邻行盒
 *  1~2px 亚像素重叠率 ~0.1，不得误并（并则合并矩形取主导行 y/h，次行不被覆盖） */
const Y_OVERLAP_RATIO_MIN = 0.25
/** 簇内 x 大间隙断段阈值：max(1.5×主导矩形高, 页宽 2%)——防多栏/大缩进桥接成一个矩形 */
const COLUMN_GAP_H_FACTOR = 1.5
const COLUMN_GAP_PAGE_RATIO = 0.02

function areaOf(r: PixelBox): number {
  return r.w * r.h
}

/** 簇内主导矩形（面积最大者）——行盒 y/h 的取值基准 */
function dominantOf(group: PixelBox[]): PixelBox {
  return group.reduce((best, r) => (areaOf(r) > areaOf(best) ? r : best))
}

/**
 * clientRects 行级合并（纯函数）：同形去重 → y 区间重叠且高度可比者聚行簇 →
 * 簇内 x 大间隙断段 → 段合并（x 取并集、y/h 取段内主导矩形）→ 按 (y,x) 文档序输出。
 * 每视觉行一个（或栏断后的数个）矩形：高亮不再叠深、下划线每行一条且底边平齐。
 */
export function mergeLineRects(pixels: PixelBox[], pageWidth: number): PixelBox[] {
  if (pixels.length <= 1) {
    return pixels
  }
  // ① 同形去重
  const unique: PixelBox[] = []
  for (const r of pixels) {
    const dup = unique.some(
      (u) =>
        Math.abs(u.x - r.x) <= DEDUP_EPSILON_PX &&
        Math.abs(u.y - r.y) <= DEDUP_EPSILON_PX &&
        Math.abs(u.w - r.w) <= DEDUP_EPSILON_PX &&
        Math.abs(u.h - r.h) <= DEDUP_EPSILON_PX
    )
    if (!dup) {
      unique.push(r)
    }
  }
  if (unique.length <= 1) {
    return unique
  }
  // ② y 区间重叠聚类（组内 y 区间为成员并集；排序保证同簇连续）
  const sorted = [...unique].sort((a, b) => a.y - b.y || a.x - b.x)
  const rowGroups: PixelBox[][] = []
  const groupTop: number[] = []
  const groupBottom: number[] = []
  for (const r of sorted) {
    const gi = rowGroups.length - 1
    if (gi >= 0) {
      const dom = dominantOf(rowGroups[gi]!)
      const overlapPx = Math.min(groupBottom[gi]!, r.y + r.h) - Math.max(groupTop[gi]!, r.y)
      const yOverlap =
        overlapPx >= Y_OVERLAP_RATIO_MIN * Math.min(r.h, dom.h)
      const hComparable = r.h >= dom.h * HEIGHT_RATIO_MIN && r.h <= dom.h * HEIGHT_RATIO_MAX
      if (yOverlap && hComparable) {
        rowGroups[gi]!.push(r)
        groupTop[gi] = Math.min(groupTop[gi]!, r.y)
        groupBottom[gi] = Math.max(groupBottom[gi]!, r.y + r.h)
        continue
      }
    }
    rowGroups.push([r])
    groupTop.push(r.y)
    groupBottom.push(r.y + r.h)
  }
  // ③④ 簇内 x 间隙断段与段合并
  const out: PixelBox[] = []
  for (const group of rowGroups) {
    const dom = dominantOf(group)
    const gapThreshold = Math.max(COLUMN_GAP_H_FACTOR * dom.h, COLUMN_GAP_PAGE_RATIO * pageWidth)
    const byX = [...group].sort((a, b) => a.x - b.x)
    let segment: PixelBox[] = []
    let segRight = Number.NEGATIVE_INFINITY
    for (const r of byX) {
      if (segment.length > 0 && r.x - segRight > gapThreshold) {
        out.push(mergeSegment(segment))
        segment = []
      }
      segment.push(r)
      segRight = Math.max(segRight, r.x + r.w)
    }
    if (segment.length > 0) {
      out.push(mergeSegment(segment))
    }
  }
  // ⑤ 文档序
  return out.sort((a, b) => a.y - b.y || a.x - b.x)
}

/** 段合并：x 取并集，y/h 取段内主导矩形（行盒统一基线，下划线底边随之平齐） */
function mergeSegment(segment: PixelBox[]): PixelBox {
  const dom = dominantOf(segment)
  const left = Math.min(...segment.map((r) => r.x))
  const right = Math.max(...segment.map((r) => r.x + r.w))
  return { x: left, w: right - left, y: dom.y, h: dom.h }
}

/** DOM Range 的客户端矩形；无布局量测（jsdom 未实现/返回空）时退化为命中节点父元素盒 */
function clientRectsBetween(a: DomPoint, b: DomPoint): PixelBox[] {
  const rects: PixelBox[] = []
  try {
    const range = document.createRange()
    range.setStart(a.node, Math.min(a.offset, a.node.data.length))
    range.setEnd(b.node, Math.min(b.offset, b.node.data.length))
    if (typeof range.getClientRects === 'function') {
      for (const r of Array.from(range.getClientRects())) {
        rects.push({ x: r.x, y: r.y, w: r.width, h: r.height })
      }
    }
  } catch {
    // 节点已脱离文档等异常：rects 留空，由 rectsBetweenPoints 兜底零矩形
  }
  if (rects.length === 0 && a.node.parentElement !== null) {
    const parentBox = pixelBoxOf(a.node.parentElement)
    rects.push(parentBox)
  }
  return rects
}

function zeroRect(): AnnotationRect {
  return { page: 0, x: 0, y: 0, w: 0, h: 0 }
}
