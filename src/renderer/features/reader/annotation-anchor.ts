/**
 * [SR-RDR-01] annotation-anchor —— 锚定计算域：DOM 文本遍历/偏移互转/几何
 * 管线（工单：done / strong，Phase 3/4；F-ARCH4 拆件后回归本域）
 *
 * ── 行为层 ──
 * - 文本偏移 ↔ DOM 范围 互转（WADM textPosition 思路）：
 *   findRangeAtOffset(root: HTMLElement, start: number, end: number): DOMRange | null
 *   —— 遍历文本节点累计字符偏移，命中区间返回 { rects, textNodes }
 * - rectsFromRange(range, pageSize): AnnotationRect[]（归一化 0..1）
 * - mergeLineRects(pixels, pageWidth)（2026-08-23 Q3 修复演进）：clientRects 行级
 *   合并——同形去重/y 重叠聚行簇（高度可比带防旋转文本互并）/x 大间隙断段（防
 *   多栏桥接）/段内 x 并集+y/h 取主导矩形；rectsBetweenPoints 归一化前调用，
 *   划选保存与重开重锚两路径同口径。[F-V1] 紧凑行距（盒高>行距）稳健化：簇判据
 *   追加实测行距钳制（estimateLinePitch——y 中心差下中位），段输出高度钳到行距
 *   （防盒高溢出行距逐行重叠→下游 INV-D 级联下推行带错绑=丢行/杂交/同行双块）。
 * - 归一化后另过 mergeRects 收口（F-A1 挂 A，2026-08-30）：归一化域滤零宽/
 *   全簇比较聚类/行内 x 并集/行间钳制——mergeLineRects 漏掉的零宽幽灵、同行
 *   碎片、同位重复、行间负间隙在此终裁（INV-A~D，见 annotation-merge.ts）。
 * - 划选锚定的格式与校验域（锚定三元组生成/前缀引文后缀校验/自愈重定位）已
 *   迁 anchor-serialize.ts（F-ARCH4 纯重构，行为零变）——本文件回归锚定计算域
 * - 偏移约定：页内全文 = 按文档序拼接全部文本节点（节点间无间隙）；区间为半开
 *   [start, end)；rects 的 page 恒为 0：本模块只在单页根上工作，实际页码由调用方（持有 page
 *   属性的 SelectionLayer/AnnotationLayer）在持久化时改写。
 *
 * ── 接口层 ──
 * - export interface DOMRange { rects: AnnotationRect[]; textNodes: Array<{ node: Text; offset: number }> }
 * - export interface NodeSpan/DomPoint/PixelBox（几何域类型——单一真相源）
 * - export function findRangeAtOffset/rectsFromRange/mergeLineRects/estimateLinePitch，
 *   及几何原语公共面 collectSpans/fullTextOf/offsetToPoint/rectsBetweenPoints/pixelBoxOf
 *   （F-ARCH4 扩面——anchor-serialize 的合法消费面；全部纯/幂等，无 React 依赖）
 *
 * ── 架构层 ──
 * - 全项目唯一操作 DOM 文本遍历的地方；消费形（F-ARCH4 拆件后）：SelectionLayer
 *   只经 anchor-serialize 间接调用；AnnotationLayer/AiAnnotationLayer 直调
 *   findRangeAtOffset（几何）+经 anchor-serialize 调 verifyQuote（校验）。
 *   几何原语公共面亦在本模块（F-ARCH4 起 anchor-serialize 消费此面——依赖
 *   单向 anchor-serialize→本模块→annotation-merge，零环）
 *
 * ── 生命周期层 ──
 * - 性能约束：单页千级文本节点 <10ms；不做跨页标注（v1 负面清单）
 *
 * ── 文化层 ──
 * - 测试：tests/unit/renderer/annotation-anchor.test.ts（已锁定，jsdom 环境跑 DOM 用例：
 *   基本命中/跨节点/前后缀漂移/重定位失败 返回 null——F-ARCH4 起格式校验用例
 *   的 import 已改向 anchor-serialize，用例体零改）
 */
import type { AnnotationRect } from '@shared/models/annotation'
import { mergeRects } from './annotation-merge'

export interface DOMRange {
  rects: AnnotationRect[]
  textNodes: Array<{ node: Text; offset: number }>
}

/** 文本节点在页内全文中的跨度（半开区间，全局偏移） */
export interface NodeSpan {
  node: Text
  start: number
  end: number
}

/** DOM 边界点：某文本节点内的字符偏移 */
export interface DomPoint {
  node: Text
  offset: number
}

/** 像素矩形/基准盒（origin 为视口坐标，尺寸已做 ≥1 下限防除零） */
export interface PixelBox {
  x: number
  y: number
  w: number
  h: number
}

/** 按文档序收集文本节点并累计全局偏移；零长度节点不参与（避免空命中项） */
export function collectSpans(root: HTMLElement): { spans: NodeSpan[]; total: number } {
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
export function fullTextOf(root: HTMLElement): string {
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

/** 全局偏移 → DOM 边界点；end 允许等于 total（贴页尾时取末节点终点） */
export function offsetToPoint(spans: NodeSpan[], global: number): DomPoint | null {
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
export function pixelBoxOf(el: Element): PixelBox {
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

/** 两边界点之间的客户端矩形 → 相对 base 的归一化矩形（0..1，越界截断）。
 *  [F-A4] 行高感知接线：选区 span 的 computed font-size 中位数=PDF 行高
 *  量测源（px，本地口径），注入 mergeLineRects（像素域判据）与 mergeRects
 *  （归一化域容差）——紧行距不再跨行并簇（INV-40 边界修复）。
 *  量测口径声明：fontSize 为本地 CSS px 而 base/pixels 为视口 px（含祖先
 *  zoom 复合）——PDF zoom≠1 时阈值等效收紧 1/zoom，方向安全（跨行更不易
 *  误并；同行片段中心距 ≲0.25×字号远低于阈值，不受影响）。 */
export function rectsBetweenPoints(a: DomPoint, b: DomPoint, base: PixelBox): AnnotationRect[] {
  const lineHpx = medianFontSizeBetween(a, b)
  // 行级合并先于归一化（像素域判间隙/高度可比）：划选保存与重开重锚两路径在此同口径收口
  const pixels = mergeLineRects(clientRectsBetween(a, b), base.w, lineHpx)
  const clamp01 = (v: number): number => Math.min(1, Math.max(0, v))
  // F-A1 挂 A：归一化后过归并器（滤零宽/聚行/并集/钳制，INV-A~D）——零宽兜底
  // 块（w:0）随之被滤：pixels 为空时返回空数组，调用方 rects.length>0 判空语义兜住
  return mergeRects(
    pixels.map((r) => ({
      page: 0,
      x: clamp01((r.x - base.x) / base.w),
      y: clamp01((r.y - base.y) / base.h),
      w: clamp01(r.w / base.w),
      h: clamp01(r.h / base.h)
    })),
    lineHpx !== undefined ? lineHpx / base.h : undefined
  )
}

/** [F-A4] 两边界点间文本的 computed font-size 中位数（下中位；PDF 行高
 *  量测源）。无相交文本/量测不可解析（jsdom 未实现/空样式）→undefined
 *  （调用方按旧行为走）。getComputedStyle 只读非遍历；本模块仍是唯一
 *  DOM 文本遍历点（TreeWalker 按 Range 相交过滤）。 */
function medianFontSizeBetween(a: DomPoint, b: DomPoint): number | undefined {
  try {
    const range = document.createRange()
    range.setStart(a.node, Math.min(a.offset, a.node.data.length))
    range.setEnd(b.node, Math.min(b.offset, b.node.data.length))
    if (typeof range.intersectsNode !== 'function') {
      return undefined
    }
    const sizes: number[] = []
    const walker = document.createTreeWalker(range.commonAncestorContainer, NodeFilter.SHOW_TEXT)
    for (let n = walker.nextNode() as Text | null; n !== null; n = walker.nextNode() as Text | null) {
      if (!range.intersectsNode(n)) {
        continue
      }
      const el = n.parentElement
      if (el === null) {
        continue
      }
      const px = parseFloat(getComputedStyle(el).fontSize)
      if (Number.isFinite(px) && px > 0) {
        sizes.push(px)
      }
    }
    if (sizes.length === 0) {
      return undefined
    }
    sizes.sort((x, y) => x - y)
    return sizes[Math.floor((sizes.length - 1) / 2)]
  } catch {
    // 节点脱离文档等异常：行高不可量测，交调用方按旧行为走
    return undefined
  }
}

// ── clientRects 行级合并（pdf.js 文本层逐 span 绝对定位、各字号/基线不同，同一
//    视觉行会产多个高矮不一且竖向重叠的矩形——逐矩形透传导致高亮叠深、下划线错落）──

/** 同形去重容差（px）：相邻节点重复量测的亚像素差 */
const DEDUP_EPSILON_PX = 0.5
/** 高度可比带：矩形高在簇主导矩形高的 [0.5,2] 倍内视为同行字号变体（上标/公式），
 *  超出按旋转/竖排文本独立成簇（高瘦矩形并入行簇会 corrupt y/h 与并集）。贪心
 *  比对当前主导：行内高度方差 ≥2.2× 时主导切换可拆行。[F-A6-b2 T3] 聚类已扩到
 *  全部簇（就近并入）——高瘦矩形排在同一行两碎片之间（y 序插队）时后碎片不再
 *  与真行簇"失联"（旧「只与末簇比较」局限的修复，修法在档=扩簇比较而非放宽
 *  可比带/重叠率——放宽会引入跨行误并，损失大于所得） */
const HEIGHT_RATIO_MIN = 0.5
const HEIGHT_RATIO_MAX = 2
/** y 重叠率门槛：重叠像素须 ≥ 较小高度（新矩形高 vs 主导高取小）的 25% 才算同行
 *  ——同行片段（上标/基线偏移）重叠率近 1；紧行距（leading ≤ ~0.93em）下相邻行盒
 *  1~2px 亚像素重叠率 ~0.1，不得误并（并则合并矩形取主导行 y/h，次行不被覆盖） */
const Y_OVERLAP_RATIO_MIN = 0.25
/** 簇内 x 大间隙断段阈值：max(1.5×主导矩形高, 页宽 2%)——防多栏/大缩进桥接成一个矩形 */
const COLUMN_GAP_H_FACTOR = 1.5
const COLUMN_GAP_PAGE_RATIO = 0.02
/** [F-V1] 行距估计：同片段对/tall-short 变体的中心差（实测 ~0.2-2.4px）不参与估计 */
const INTRA_ROW_GAP_PX = 2

/** [F-V1] 行距估计（像素域纯函数）：输入矩形 y 中心分布 → 视觉行距估计。
 *  口径：中心升序 → 相邻差 → 滤 <2px 的行内噪声差 → 下中位。下中位对少数
 *  离群差天然稳健（远距行界/零宽盒实测可制造 232px 离群差——若按最大差相对
 *  下限过滤，单个离群会把下限抬到真行距之上致全部真差被滤、估计坍缩到离群
 *  值使高度钳制失效——f-v1-verify doc2 实证）。可用差不足（单行选区/全同行
 *  片段——两行以下退化）或估计值非正 → undefined（调用方走缺省判据）。
 *  紧凑行距排版（盒高>行距）下行盒高/y 重叠率均不可靠（相邻行盒 y 区间
 *  重叠可达 44%），以实测行距为行簇与段高度的基准。 */
export function estimateLinePitch(pixels: PixelBox[]): number | undefined {
  if (pixels.length < 2) {
    return undefined
  }
  const centers = pixels.map((r) => r.y + r.h / 2).sort((a, b) => a - b)
  const gaps: number[] = []
  for (let i = 1; i < centers.length; i += 1) {
    const g = centers[i]! - centers[i - 1]!
    if (g >= INTRA_ROW_GAP_PX) {
      gaps.push(g)
    }
  }
  if (gaps.length === 0) {
    return undefined
  }
  const pitch = [...gaps].sort((a, b) => a - b)[Math.floor((gaps.length - 1) / 2)]!
  return Number.isFinite(pitch) && pitch > 0 ? pitch : undefined
}

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
 * [F-A4 行高感知]：可选 lineH（px——PDF 行高，调用方量测注入）在场时聚行
 * 判据改「中心距 ≤ lineH/2」（替代 y 区间重叠率判据）：紧行距（leading ≲
 * 0.75×行盒高——INV-40 登记边界）下 CSS 回退行盒垂直重叠率可达 25% 门槛
 * 而跨行并簇成单高块；以真行高为基准的中心距判据在保持同行动效（上标/
 * 基线偏移中心距 ≲0.25×字号）的同时把紧行距相邻行（中心距=leading ≥
 * ~1.07×字号）判为不同行。缺省=旧行为（受锁单测兼容面）。
 */
export function mergeLineRects(pixels: PixelBox[], pageWidth: number, lineH?: number): PixelBox[] {
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
  // ② y 区间重叠聚类（组内 y 区间为成员并集）——
  //    [F-A4] lineH 在场改中心距判据（头注行高感知；高度可比带两种判据通用）；
  //    [F-V1] pitch（≥2 视觉行可估）在场时中心距阈值取 min(lineH, 行距, 主导高)/2
  //    ——紧凑行距（盒高>行距）下盒高/y 重叠率/膨胀 lineH 均会把相邻视觉行聚进
  //    同簇（跨行杂交并集+丢行，真机 f-v1-diag 实证），实测行距为纲。
  //    [F-A6-b2 T3] 聚类比较扩到全部簇（annotation-merge.ts:26-28 先例语义——
  //    修「只与末簇比较」的 y 序交错失联：同行后段被相邻行高瘦段隔在末簇之外
  //    时另起簇=同行双块锯齿形态，取证 real3882 step3 sizes 序列交错在档）：
  //    在全部既有簇中取满足判据且中心距最近者并入，无满足者新建簇。
  const lh = lineH !== undefined && Number.isFinite(lineH) && lineH > 0 ? lineH : null
  const pitch = estimateLinePitch(unique)
  const sorted = [...unique].sort((a, b) => a.y - b.y || a.x - b.x)
  const rowGroups: PixelBox[][] = []
  const groupTop: number[] = []
  const groupBottom: number[] = []
  for (const r of sorted) {
    let best = -1
    let bestDist = Number.POSITIVE_INFINITY
    for (let gi = 0; gi < rowGroups.length; gi += 1) {
      const dom = dominantOf(rowGroups[gi]!)
      const overlapPx = Math.min(groupBottom[gi]!, r.y + r.h) - Math.max(groupTop[gi]!, r.y)
      const yOverlap =
        overlapPx >= Y_OVERLAP_RATIO_MIN * Math.min(r.h, dom.h)
      // [F-V1] 行距自适应上限：lineH 单独在场=F-A4 原口径（lh/2）零变；
      // pitch 在场（含与 lineH 同场）= min(行距, 主导高[, lineH])/2
      const centerLimit =
        pitch !== undefined ? Math.min(pitch, dom.h, ...(lh !== null ? [lh] : [])) : lh
      const centerOk =
        Math.abs(r.y + r.h / 2 - (dom.y + dom.h / 2)) <= (centerLimit ?? 0) / 2
      const hComparable = r.h >= dom.h * HEIGHT_RATIO_MIN && r.h <= dom.h * HEIGHT_RATIO_MAX
      if ((centerLimit !== null ? centerOk : yOverlap) && hComparable) {
        const dist = Math.abs(r.y + r.h / 2 - (dom.y + dom.h / 2))
        if (dist <= bestDist) {
          best = gi
          bestDist = dist
        }
      }
    }
    if (best >= 0) {
      rowGroups[best]!.push(r)
      groupTop[best] = Math.min(groupTop[best]!, r.y)
      groupBottom[best] = Math.max(groupBottom[best]!, r.y + r.h)
    } else {
      rowGroups.push([r])
      groupTop.push(r.y)
      groupBottom.push(r.y + r.h)
    }
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
        out.push(mergeSegment(segment, pitch))
        segment = []
      }
      segment.push(r)
      segRight = Math.max(segRight, r.x + r.w)
    }
    if (segment.length > 0) {
      out.push(mergeSegment(segment, pitch))
    }
  }
  // ⑤ 文档序
  return out.sort((a, b) => a.y - b.y || a.x - b.x)
}

/** 段合并：x 取并集，y/h 取段内主导矩形（行盒统一基线，下划线底边随之平齐）。
 *  [F-V1] 紧凑行距高度钳制：盒高>实测行距且在高度可比带内（≤2×行距——超出为
 *  旋转/竖排/标题形态，不钳）时输出高钳到行距；y 保持主导矩形不动（受锁断言锚：
 *  y 取主导）。防 14.4px 盒在 11.9px 行距上逐行 2.4px 重叠→下游 INV-D 累积钳制
 *  级联下推 1-12px→matchBand 最近中心带错绑（丢行/杂交/同行双块）。 */
function mergeSegment(segment: PixelBox[], pitch?: number): PixelBox {
  const dom = dominantOf(segment)
  const left = Math.min(...segment.map((r) => r.x))
  const right = Math.max(...segment.map((r) => r.x + r.w))
  const h =
    pitch !== undefined && pitch < dom.h && dom.h <= HEIGHT_RATIO_MAX * pitch ? pitch : dom.h
  return { x: left, w: right - left, y: dom.y, h }
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
