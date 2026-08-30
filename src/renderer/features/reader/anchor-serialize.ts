/**
 * [F-ARCH4] anchor-serialize —— 划选锚定格式与校验域（纯函数，自
 * annotation-anchor 逐行迁入——纯重构行为零变，票面=scripts/audits/f-arch4-ticket.md）
 *
 * ── 行为层（WADM textQuote 契约迁移，语义与迁入前逐条等价）──
 * - 用户划选（Selection）→ 页内锚定三元组：start/end/quote/prefix/suffix/
 *   rects；选区任一边界在 root 之外（跨页/页外）或 quote 为空（纯元素/零宽
 *   选择）返回 null；边界点→全局偏移用 probe-range 文本长度探测（文本/元素
 *   容器统一成立）；prefix/suffix 按 CONTEXT_CHARS=32 截取（WADM 惯例）
 * - verifyQuote：前缀/引文/后缀校验 start 偏移是否仍有效；失效时 textQuote
 *   自愈重定位——原位校验优先，重定位打分 score=prefix 2+suffix 1，同级取距
 *   原偏移最近者
 * - 偏移约定：verifyQuote 的 start 与返回值均指 quote 首字符的页内偏移（页内
 *   全文拼接口径在 annotation-anchor）；rects 的 page 恒为 0——实际页码由
 *   调用方在持久化时改写
 *
 * ── 接口层 ──
 * - export interface SelectionAnchor
 * - export function selectionToAnchor(root, selection): SelectionAnchor | null
 * - export function verifyQuote(root, selector): number | null
 * - matchAt/probeTextLength/CONTEXT_CHARS 保持模块私有
 * - 几何与遍历原语消费自 annotation-anchor 公共面（collectSpans/fullTextOf/
 *   offsetToPoint/rectsBetweenPoints/pixelBoxOf）——类型单一真相源，本模块
 *   零类型复写
 *
 * ── 架构层 ──
 * - 依赖单向 anchor-serialize→annotation-anchor→annotation-merge（零环）；
 *   本模块=锚定格式与校验域，未来锚定格式扩展的增长点；锚定计算域（DOM 文本
 *   遍历/偏移互转/几何管线）仍在 annotation-anchor
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
