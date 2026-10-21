/**
 * [F-VISFB-53CI-02] selection-effective-range —— eff 边界域件（自 selection-evaluate
 * 拆出——票面预判条款/终裁 4 行数闸门：本件=effectiveRangeOf+docOrderPair 净迁移
 * +A1 归一化镜像段 normalizedOffsetsOf 落地；行为面经 selection-evaluate.test 六形态
 * 恒等锚+组件级同源锚锁）。
 *
 * ── 行为层 ──
 * - docOrderPair：eff 边界文档序定序纯函数（含包含形态 Range 点对点比较）——
 *   自 selection-evaluate 净迁移零语义变（W-4 回炉单测消费面经 re-export 保持）。
 * - effectiveRangeOf：snapVisualBoundary 末行下方吸附（双侧，null=原始边界
 *   fallback）→docOrderPair 文档序定序→Range。visual 快路径与 settle/mouseup
 *   全量锚定同消费=快慢边界同源单源（净迁移零语义变）。
 * - **normalizedOffsetsOf（A1 区间推导同源——终裁 1 探针级镜像落法）**：eff 边界
 *   双侧各调 snapBlankBoundary(textLayer, node, offset, side)（start 侧='start'/
 *   end 侧='end'——与 rangeToAnchor :205-206 同根同侧同纯函数）→probeTextLength
 *   双侧→start>end 翻转兜底（rangeToAnchor :217-219 复刻=Rule of Three 第二次
 *   保持重复，终裁明示不抽共享辅助防 API 泛化）→退化（end<=start/probe null）
 *   =null（调用方回退全量）。
 *   **等价链=构造性等价，不依幂等性**：慢路 rangeToAnchor 内部对同一 effRange
 *   同根同侧调同一纯函数一次→双侧 probe 输入恒等→偏移恒等；snapBlankBoundary
 *   非幂等形态（多空白 span 行——P1-B/B2/D 探针实证：归一化目标落空白项文本位
 *   时二次施加再移）下快慢仍同果（各调一次）。探针形态族锚=单测锚
 *   （selection-evaluate.test「A1 区间推导同源」：幂等 3+非幂等 2+翻转 1——
 *   P1-B2 经主控裁决由翻转锚替换）。
 * - 性能面（⑤d 预算）：markerAt 未命中=O(span 文本)（与 snapVisualBoundary 现状
 *   同构——命中才 O(页) 行聚类）；快路单帧 <10ms 约束保持。
 *
 * ── 接口层 ──
 * - export docOrderPair/effectiveRangeOf/normalizedOffsetsOf；domText 可选参=
 *   调用方已算全文时传入防重复 join（visual 对账链复用；缺省内部 fullTextOf）。
 *
 * ── 架构层 ──
 * - 依赖单向：本件→anchor-blank-snap（snapVisualBoundary/snapBlankBoundary）/
 *   anchor-serialize（probeTextLength 导出面单源）/annotation-anchor（fullTextOf）
 *   ——interact→anchors 既有方向，零环；纯函数零 React 依赖。
 *
 * ── 生命周期层 ── / ── 文化层 ──
 * - 每帧消费=visual 探针段（O(1) 未命中面）；测试=tests/unit/renderer/
 *   selection-evaluate.test.tsx（六形态恒等+组件级同源锚——always-active）。
 */
import { fullTextOf } from '../anchors/annotation-anchor'
import { probeTextLength } from '../anchors/anchor-serialize'
import { snapBlankBoundary, snapVisualBoundary } from '../anchors/anchor-blank-snap'

/** [F-RDR-01 A] eff 边界文档序定序：anchor/focus 无向（snapVisualBoundary 双侧
 *  同钳位目标），而 probe 探测位 start/end 有向（文档序）——映回文档序
 *  （无吸附时与 range.start/end 同源同值=行为零变）。[W-4 回炉③] 包含关系
 *  （元素槽位边界 vs 其后代文本节点）compareDocumentPosition 只定节点树序
 *  不定槽位（祖先恒「先于」后代，槽位实际可在后代之后）——该形态经
 *  Range.compareBoundaryPoints 点对点精确比较；非包含态 FOLLOWING/PRECEDING
 *  即文档序（规范语义），同节点按 offset。导出面=W-4 回炉单测消费
 *  （纯函数域件，几何域函数导出同 selection-geometry 先例） */
export function docOrderPair(
  a: { node: Node; offset: number },
  b: { node: Node; offset: number }
): [{ node: Node; offset: number }, { node: Node; offset: number }] {
  if (a.node === b.node) {
    return a.offset <= b.offset ? [a, b] : [b, a]
  }
  const pos = a.node.compareDocumentPosition(b.node)
  if ((pos & (Node.DOCUMENT_POSITION_CONTAINS | Node.DOCUMENT_POSITION_CONTAINED_BY)) === 0) {
    return (pos & Node.DOCUMENT_POSITION_FOLLOWING) !== 0 ? [a, b] : [b, a]
  }
  // 包含形态：节点树序不定槽位——Range 点对点比较（jsdom/Chromium 同语义）
  const pa = document.createRange()
  pa.setStart(a.node, a.offset)
  pa.setEnd(a.node, a.offset)
  const pb = document.createRange()
  pb.setStart(b.node, b.offset)
  pb.setEnd(b.node, b.offset)
  return pa.compareBoundaryPoints(Range.START_TO_START, pb) <= 0 ? [a, b] : [b, a]
}

/** [F-VISFB-53] 统一快慢 effective boundary 的 eff 边界 Range（两路共用单源）：
 *  snapVisualBoundary 末行下方吸附（双侧，null=原始边界 fallback）→
 *  docOrderPair 文档序定序 → Range。visual 快路径与 settle/mouseup 全量锚定
 *  同消费本函数——快慢边界同源=闪烁根治主面（d1 归因：回退 DOM 家族+校准
 *  时机双几何交替——乱序 transform 形态下 raw 边界把行尾解到次行行首） */
export function effectiveRangeOf(sel: Selection): Range {
  const aSnap = snapVisualBoundary(sel.anchorNode!, sel.anchorOffset, 'anchor')
  const fSnap = snapVisualBoundary(sel.focusNode!, sel.focusOffset, 'focus')
  const effAnchor = aSnap ?? { node: sel.anchorNode!, offset: sel.anchorOffset }
  const effFocus = fSnap ?? { node: sel.focusNode!, offset: sel.focusOffset }
  const [startB, endB] = docOrderPair(effAnchor, effFocus)
  const range = document.createRange()
  range.setStart(startB.node, startB.offset)
  range.setEnd(endB.node, endB.offset)
  return range
}

/** [F-VISFB-53CI-02 A1] 归一化偏移区间（区间推导同源=构造性等价——头注行为层
 *  等价链）：eff 边界双侧 snapBlankBoundary 归一化（rangeToAnchor :205-206 同根
 *  同侧同纯函数）→probeTextLength 双侧→start>end 翻转兜底（:217-219 复刻）→
 *  {start,end}；probe 失败/退化区间=null（调用方回退全量）。
 *  domText=调用方已算页全文（visual 对账链复用防重复 join）；缺省内部 fullTextOf */
export function normalizedOffsetsOf(textLayer: HTMLElement, effRange: Range, domText?: string): { start: number; end: number } | null {
  // [裁决部收口 4a] collapsed 前置守卫：坍缩 effRange 与慢路 rangeToAnchor :193
  // 同态先返 null——防坍缩点恰落空白标记槽位时双侧 snapBlank 异侧解析产非退化
  // 区间（快路 paint 而慢路 anchor=null 的幻象帧，A2 preservePaint 下 settle 后驻留）
  if (effRange.collapsed) {
    return null
  }
  const startB = snapBlankBoundary(textLayer, effRange.startContainer, effRange.startOffset, 'start')
  const endB = snapBlankBoundary(textLayer, effRange.endContainer, effRange.endOffset, 'end')
  const lead = probeTextLength(textLayer, startB.node, startB.offset, 'start')
  const tail = lead === null ? null : probeTextLength(textLayer, endB.node, endB.offset, 'end')
  if (lead === null || tail === null) {
    return null
  }
  const total = (domText ?? fullTextOf(textLayer)).length
  let start = lead
  let end = total - tail
  // [C-1 镜像] 归一化翻转兜底：起点推进可能越过回拖终点——互换防有效划选静默丢
  if (end < start) {
    ;[start, end] = [end, start]
  }
  if (end <= start) {
    return null
  }
  return { start, end }
}
