/**
 * [F-ARCH4] anchor-serialize —— 划选锚定格式与校验域（纯函数，自
 * annotation-anchor 逐行迁入——纯重构行为零变，票面=scripts/audits/f-arch4-ticket.md）
 *
 * ── 行为层（WADM textQuote 契约迁移，语义与迁入前逐条等价）──
 * - 用户划选（Selection）→ 页内锚定三元组：start/end/quote/prefix/suffix/
 *   rects；选区任一边界在 root 之外（跨页/页外）或 quote 为空（纯元素/零宽
 *   选择）返回 null；边界点→全局偏移用 probe-range 文本长度探测（文本/元素
 *   容器统一成立）；prefix/suffix 按 CONTEXT_CHARS=32 截取（WADM 惯例）
 * - [F-A10] 段末空白 affinity：边界先经 anchor-blank-snap 归一化——浏览器把
 *   行尾/段首空白点击解析为 pdf.js 空白标记 span 槽位（DOM 序≠视觉序，实测
 *   两方向跳跃：丢下半段/img2 带下一段），按标记盒视觉行重解析到本行行尾/
 *   行首；非标记边界与无量测环境语义零变（详 anchor-blank-snap 头注）
 * - verifyQuote：前缀/引文/后缀校验 start 偏移是否仍有效；失效时 textQuote
 *   自愈重定位——原位校验优先，重定位打分 score=prefix 2+suffix 1，同级取距
 *   原偏移最近者。定位核 locateQuote=纯文本函数（DOM/items 两域共享单源，
 *   F-A8 门0 提取——verifyQuote 行为零变）
 * - verifyQuoteItem [F-A8 门0]：verifyQuote 的 items 域等价物——页项文本
 *   （剔空串项逐项 str 拼接，与 buildItemOffsets 偏移表同口径——空串项零宽
 *   不入拼接，产出逐字节相同）上同核校验/自愈；偏移口径=页内文本序（两族
 *   共有——DOM/items 拼接系统性差由 S1 reconcile 守卫拦截，本函数不做口径
 *   转换）
 * - 偏移约定：verifyQuote/verifyQuoteItem 的 start 与返回值均指 quote 首字符
 *   的页内偏移（DOM 侧页内全文拼接口径在 annotation-anchor，items 侧=剔空串
 *   逐项拼接）；rects 的 page 恒为 0——实际页码由调用方在持久化时改写
 *
 * ── 接口层 ──
 * - export interface SelectionAnchor
 * - export function selectionToAnchor(root, selection): SelectionAnchor | null
 * - export function verifyQuote(root, selector): number | null
 * - export function verifyQuoteItem(items, selector): number | null [F-A8 门0]
 *   （items 参数=结构最小面 {str:string}——消费方传 PdfTextItem[] 结构兼容；
 *   不 import PdfPageCanvas 类型链的缘由见架构层）
 * - matchAt/locateQuote/CONTEXT_CHARS 保持模块私有；probeTextLength 经
 *   F-GEOM-01-G2 导出（selection-evaluate 快路径单源消费——本域复刻已删）
 * - 几何与遍历原语消费自 annotation-anchor 公共面（collectSpans/fullTextOf/
 *   offsetToPoint/rectsBetweenPoints/pixelBoxOf）——类型单一真相源，本模块
 *   零类型复写
 *
 * ── 架构层 ──
 * - 依赖单向 anchor-serialize→annotation-anchor→annotation-merge（零环）；
 *   本模块=锚定格式与校验域，未来锚定格式扩展的增长点；锚定计算域（DOM 文本
 *   遍历/偏移互转/几何管线）仍在 annotation-anchor
 * - **不 import pdf-item-geometry/PdfPageCanvas**（含 type）：本模块经受锁
 *   annotation-anchor.test.ts 可达 tsconfig.node 程序（tests 目录 .ts 文件
 *   include，无 jsx 选项），任一触 PdfPageCanvas.tsx 的边都触发 TS6142；故
 *   items 拼接就地自持（剔空串 filter+join，与 pdf-item-geometry.itemsTextOf
 *   同式——Rule of Three 第 2 次保持重复，第 3 处出现时上抽共享件并届时
 *   一并解 tsconfig.node jsx 缺陷）
 * - 文本枚举唯一发生在 annotation-anchor；本模块仅借 Range 做长度探测
 *   （probeTextLength 的 Range.toString 非遍历）
 *
 * ── 生命周期层 ──
 * - 零运行时差异（纯函数跨模块移动，模块加载图多一叶）；单页千级文本节点
 *   <10ms 约束照旧
 *
 * ── 文化层 ──
 * - 测试：tests/unit/renderer/annotation-anchor.test.ts（受锁，import 已改向
 *   本模块——用例体零改）；e2e reader-text.spec.ts 划选保存链（收口裁判）
 */
import type { AnnotationRect } from '@shared/models/annotation'
import { snapBlankBoundary } from './anchor-blank-snap'
import {
  collectSpans,
  fullTextOf,
  offsetToPoint,
  pixelBoxOf,
  rectsBetweenPoints
} from './annotation-anchor'

export function verifyQuote(
  root: HTMLElement,
  selector: { prefix: string; quote: string; suffix: string; start: number }
): number | null {
  // 空 quote 短路在 fullTextOf 之前（提取前旧码同序——空引文不触 DOM 遍历，
  // 触达面还原[门一 N1]；locateQuote 内同检查保留=两入口共用兜底防线）
  if (selector.quote.length === 0) {
    return null
  }
  return locateQuote(fullTextOf(root), selector)
}

/**
 * [F-A8 门0] items 域引文对账：页项文本（剔空串项逐项 str 拼接——与
 * buildItemOffsets 偏移表同口径，空串项零宽不入拼接产出逐字节相同；与 DOM
 * fullTextOf 同域的页内文本序）上执行与 verifyQuote 同核的定位校验。偏移口径
 * =页内文本序（两族共有——DOM 拼接与 items 拼接的系统性差由 S1 reconcile
 * 守卫拦截[b2 r3a 同构防线]，本函数不负责口径转换）。items 参数=结构最小面
 * {str:string}（PdfTextItem[] 结构兼容；不 import PdfPageCanvas 类型链的缘由
 * 见头注架构层）
 */
export function verifyQuoteItem(
  items: ReadonlyArray<{ str: string }>,
  selector: { prefix: string; quote: string; suffix: string; start: number }
): number | null {
  // 空 quote 短路在 items 拼接之前（与 verifyQuote 入口对齐——空引文不触
  // 拼接遍历，触达面对称[门二 NIT 转门 1b 顺带]；locateQuote 内同检查保留=双防线）
  if (selector.quote.length === 0) {
    return null
  }
  const text = items
    .map((it) => it.str)
    .filter((s) => s.length > 0)
    .join('')
  return locateQuote(text, selector)
}

/**
 * 引文定位核（纯文本——DOM/items 两域共享单源，F-A8 门0 自 verifyQuote 提取，
 * 行为零变）：原位校验优先（前缀/引文/后缀在 start 处全部吻合直接返回原偏移）；
 * 失效时 textQuote 自愈重定位——引文全出现扫描，打分 score=prefix 2+suffix 1，
 * 同级取距原偏移最近者
 */
function locateQuote(
  text: string,
  selector: { prefix: string; quote: string; suffix: string; start: number }
): number | null {
  const { prefix, quote, suffix, start } = selector
  if (quote.length === 0) {
    return null
  }
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
  // [F-A10] 段末空白 affinity 归一化：空白标记槽位按标记形态与边界侧重解析
  // （end=本行行尾/start=下一行首——门一回炉 C-1；非标记边界原样）
  const startBoundary = snapBlankBoundary(root, range.startContainer, range.startOffset, 'start')
  const endBoundary = snapBlankBoundary(root, range.endContainer, range.endOffset, 'end')
  // 边界点 → 全局偏移：probe-range 的文本长度（文档序拼接口径与 collectSpans 一致）
  const leadLen = probeTextLength(root, startBoundary.node, startBoundary.offset, 'start')
  const tailLen = probeTextLength(root, endBoundary.node, endBoundary.offset, 'end')
  if (leadLen === null || tailLen === null) {
    return null
  }
  // [C-1] 归一化翻转兜底：起点推进可能越过回拖终点（start>end）——互换防有效
  // 划选静默丢；原生 Range 恒 start≤end，仅归一化形态可入此支
  let start = leadLen
  let end = total - tailLen
  if (end < start) {
    ;[start, end] = [end, start]
  }
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
export function probeTextLength(
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
