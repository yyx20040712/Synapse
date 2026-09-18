/**
 * [F-A12] release-affinity —— 划选释放点浅探 affinity 重定向判定（纯函数）
 *
 * ── 行为层 ──
 * - 缺陷机制（F-A10 G2 遗留，f-a10-impl.report §6.1 论证）：mouseup 释放点浅
 *   下探（实测 y+6 落行间隙/下段盒顶）且释放 x 处上一行无文本（行尾空白区）时，
 *   浏览器把选区终点送进下一段 span 内 offset>0（真机实据 end=1504 带下段头）
 *   ——与「刻意深点到该处」DOM 态零信号差异，锚定层原理不可辨，须事件层
 *   手势几何裁决（本模块）。
 * - 判据（方向无关——只看 focus 与释放点几何，不依赖 down 坐标）：
 *   · 触发门槛=选区非坍缩 + focus 在 root 内 + 释放点 upY < focus 盒顶 top_f
 *     （释放点物理在 focus 行上方——正常划选释放点在 focus 行盒内/下方=零变）；
 *   · 浅探=|upY − 上一视觉行盒底 bottom_p| ≤ max(top_f − upY, 浅探余量)：
 *     距离主判据（更近上一行；等距取上一行——对齐 anchor-blank-snap C-2 等距
 *     并列取阅读序上行精神）+ 运动过冲余量兜底——【判据微调申报】预裁定纯
 *     距离判据在实测 G2 几何不触发（f-a10-verify-real2.raw.txt GEO：段间间隙
 *     仅 2.5px，释放 y+6 距上一行盒底 2.0px > 距 focus 盒顶 0.5px——紧间隙
 *     排版下距离分割失效，间隙带整体在人类瞄准精度之外），故加绝对余量
 *     SHALLOW_PROBE_MAX_PX 吞释放过冲；大间隙底部刻意释放（距上一行盒底远
 *     超余量）仍零变（单测锁定）；
 *   · 重定向目标=上一视觉行（释放 x 最近栏组）行尾（rowEndOf 语义）。
 *   · [W1 门一回炉] 触发前提编码「释放 x 处上一行无文本」（缺陷机制明示——
 *     原判据缺 x 判别）：prev 行按释放 x 定位最近栏组（columnGroups 复用），
 *     要求 upX > 该栏组最右文本盒 right+1px（1px 容差对齐 F-A10
 *     `r.box.right <= box.left + 1` 惯例）才触发；upX 落栏组水平域内（含
 *     容差）=上一行该 x 处有文本→null 零变（x 在组左缘外亦零变——同式蕴含）。
 *   · [W2 门一回炉] 防御上界：upY ≥ prev 行盒带顶（min tops）——释放点高于
 *     上一行盒顶（跨多行）时纯 y 判据恒真只上挪一行=错误终态；该形态在浏览器
 *     caret 最近文本解析下不可达，保守零变。
 * - 手势态表（状态机前置，票面口径）：
 *   无 mousedown 记录（程序化）→调用方零触（SelectionLayer dragged 门）/
 *   位移 <3px（单击双击）→现行 F-12 早退路径（判定不达）/ 释放点 ≥ focus 行
 *   盒顶（正常/深点）→null 零变 / 释放点 <top_f 且距上一行盒底 ≤ max(距
 *   top_f, 浅探余量) 且 upX > 上一行释放 x 最近栏组右缘+1 且 upY ≥ 上一行
 *   盒带顶（浅探）→重定向 / 释放点 <top_f 但更近 focus 行且超出浅探余量，
 *   或 x 落上一行栏组域内（该处有文本），或 y 高于上一行盒带顶（深点/非
 *   浅探形态）→null 零变 / jsdom 四零盒
 *   无布局→量测守卫 null 零变（F-A10 兼容面同款）。
 * - 防误伤：词间空格正常划选（释放点在 focus 行盒内）恒零触；重定向后
 *   start>end 由 selectionToAnchor 翻转兜底（C-1 同族既有面）。
 * - 事件时间线（mouseup 同帧序——门一强制审项）：
 *   ① browser mouseup（原生 selection 已按释放点解析——可能已下探到下段）
 *   ② SelectionLayer：scheduler.cancel → F-12 位移门（moved≥3px 真划选才开
 *      dragged 门；否则早退零触）
 *   ③ releaseAffinity 判定（本模块——纯读零 DOM 写）
 *   ④ 命中→selection.setBaseAndExtent(anchor 原样, target=上一行行尾)——同步
 *      写 selection；浏览器对 setBaseAndExtent 排队 selectionchange（异步派发）
 *   ⑤ evaluate.full(true) 同步执行——消费已重定向选区，先于 ④ 排队的
 *      selectionchange 派发，pending/paint 即终态
 *   ⑥ 排队的 selectionchange 后续派发→scheduler.handler→rAF→evaluate.visual
 *      幂等重渲（同选区同产物，零语义漂移）
 *
 * ── 接口层 ──
 * - export function releaseAffinity(root, selection, upX, upY): DomBoundary | null
 *   （root=选区所在页 textLayer；返回 null=零变，非 null=focus 重定向目标
 *   （node+offset——锚定侧由调用方原样保留）；零 React 依赖纯函数）
 *
 * ── 架构层 ──
 * - 几何单源：行聚类/栏聚类/行尾/量测守卫盒全部经 anchor-blank-snap 导出面
 *   复用（visualRows/columnGroups/rowEndOf/boxOf——F-A12 扩面），文本域遍历
 *   经 annotation-anchor collectSpans 公共面；依赖单向
 *   release-affinity→anchor-blank-snap→annotation-anchor（零环）。
 *   本模块与锚定归一化（snapBlankBoundary）互不替代：锚定层管标记槽位
 *   （DOM 序≠视觉序），事件层管手势几何（释放点 vs focus 行）——G2 文本位
 *   下探仅事件层可辨。
 *
 * ── 生命周期层 ──
 * - 仅 mouseup 时刻调用（非每帧）；单页千级文本节点 O(n log n)（collectSpans+
 *   行聚类+栏排序）只读一遍布局，与 anchor-blank-snap 同量级 <10ms 约束内。
 *
 * ── 文化层 ──
 * - 测试：tests/unit/renderer/release-affinity.test.ts（always-active，jsdom
 *   量测桩=getBoundingClientRect 逐元素打盒——F-A10 同款手法；覆盖面=G2 浅
 *   下探重定向/深点零变/词间空格行盒内零触/向上浅上探对称/四零盒守卫/双栏
 *   最近栏组定向/首行零变/坍缩零触/等距取上一行/紧间隙实测 G2 几何复刻/
 *   大间隙底部刻意零变+W1 x 域内（含右缘容差）零变/W2 跨多行上界零变/W3
 *   backward 翻转兜底链；接线面=selection-layer-fa12.test.tsx[W4 dragged
 *   门两态+触发态]）
 */
import { collectSpans, type NodeSpan } from './anchors/annotation-anchor'
import { boxOf, columnGroups, rowEndOf, visualRows, type Box, type DomBoundary } from './anchors/anchor-blank-snap'

/** 浅探运动过冲余量（px）：紧间隙排版（实测段间 2.5px）下释放点距上一行盒底
 *  2px 即为浅下探实态——纯距离判据会漏（头注申报）；4px=人类释放过冲量级
 *  （与 SelectionLayer DRAG_SELECT_THRESHOLD_PX=3 同量级+1px 量测松弛），
 *  大间隙底部刻意释放（~19px 级）不被误吞（单测锁定） */
const SHALLOW_PROBE_MAX_PX = 4

/** focus 边界盒：文本位=父 span 盒（pdf.js 文本层 span 单文本节点——G2 实测
 *  focus 形态）；元素槽位=折叠 Range 插字符盒（真 Chromium 有行高；jsdom
 *  四零→守卫 null）。无布局/异常 → null（判定放弃零变） */
function focusBoxAt(node: Node, offset: number): Box | null {
  if (node.nodeType === Node.TEXT_NODE) {
    return boxOf(node.parentElement)
  }
  try {
    const caret = document.createRange()
    caret.setStart(node, offset)
    caret.collapse(true)
    const b = caret.getBoundingClientRect()
    if (b.x === 0 && b.y === 0 && b.width === 0 && b.height === 0) {
      return null
    }
    return { top: b.top, bottom: b.bottom, left: b.left, right: b.right }
  } catch {
    return null
  }
}

/** focus 所在视觉行索引（visualRows 输出=中心升序阅读序）：文本节点同一性
 *  优先（focus 即行内 span——G2 实测形态，零几何歧义）；回退=与 focus 盒垂直
 *  重叠最大者（全零重叠→-1 保守零变——插字符盒不落任何行带时不可信） */
function focusRowIndex(rows: Array<Array<{ span: NodeSpan; box: Box }>>, focus: Node, focusBox: Box): number {
  for (let i = 0; i < rows.length; i += 1) {
    if (rows[i]!.some((it) => it.span.node === focus)) {
      return i
    }
  }
  const focusCenter = (focusBox.top + focusBox.bottom) / 2
  let best = -1
  let bestOverlap = 0
  let bestDist = Number.POSITIVE_INFINITY
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i]!
    const top = Math.min(...row.map((r) => r.box.top))
    const bottom = Math.max(...row.map((r) => r.box.bottom))
    const overlap = Math.min(bottom, focusBox.bottom) - Math.max(top, focusBox.top)
    const dist = Math.abs((top + bottom) / 2 - focusCenter)
    if (overlap > bestOverlap || (overlap === bestOverlap && overlap > 0 && dist < bestDist)) {
      best = i
      bestOverlap = overlap
      bestDist = dist
    }
  }
  return best
}

/** [W1] 释放 x 定向的最近栏组（columnGroups+距离式——rowEndOf 内部判别同型，
 *  Rule of Three 第 2 次保持重复）：组水平域内=0 距离，否则到组缘最小距离 */
function nearestGroupOf(row: Array<{ span: NodeSpan; box: Box }>, upX: number): Array<{ span: NodeSpan; box: Box }> | null {
  let best: Array<{ span: NodeSpan; box: Box }> | null = null
  let bestDist = Number.POSITIVE_INFINITY
  for (const g of columnGroups(row)) {
    const gLeft = g[0]!.box.left
    const gRight = g[g.length - 1]!.box.right
    const dist = upX >= gLeft && upX <= gRight ? 0 : Math.min(Math.abs(gLeft - upX), Math.abs(gRight - upX))
    if (dist < bestDist) {
      best = g
      bestDist = dist
    }
  }
  return best
}

/**
 * [F-A12] 释放点浅探 affinity 判定：释放点在 focus 行盒顶上方、距上一视觉行
 * 盒底 ≤ max(距 focus 盒顶, 浅探余量)（更近/等距/紧间隙过冲）、upX > 上一行
 * 释放 x 最近栏组右缘+1（该处无文本——W1）、upY ≥ 上一行盒带顶（W2）时返回
 * 上一行（该栏组）行尾作为 focus 重定向目标；其余形态（正常/深点/坍缩/无
 * 上一行/x 域内有文本/跨多行/无布局量测）返回 null=零变。
 */
export function releaseAffinity(root: HTMLElement, selection: Selection, upX: number, upY: number): DomBoundary | null {
  if (selection.rangeCount === 0 || selection.isCollapsed) {
    return null
  }
  const focus = selection.focusNode
  if (focus === null || !root.contains(focus)) {
    return null
  }
  const focusBox = focusBoxAt(focus, selection.focusOffset)
  if (focusBox === null || upY >= focusBox.top) {
    return null
  }
  const items: Array<{ span: NodeSpan; box: Box }> = []
  for (const span of collectSpans(root).spans) {
    const b = boxOf(span.node.parentElement)
    if (b !== null) {
      items.push({ span, box: b })
    }
  }
  if (items.length === 0) {
    return null
  }
  const rows = visualRows(items)
  const idx = focusRowIndex(rows, focus, focusBox)
  if (idx <= 0) {
    return null
  }
  const prev = rows[idx - 1]!
  // [W2] 防御上界：释放点高于上一行盒带顶（跨多行）→保守零变（不可达形态）
  if (upY < Math.min(...prev.map((r) => r.box.top))) {
    return null
  }
  // [W1] 释放 x 须在上一行该处无文本（行尾空白区——缺陷机制触发前提）：
  // x 落最近栏组水平域内（含右缘 +1px 容差）=上一行该 x 处有文本→零变
  const group = nearestGroupOf(prev, upX)
  if (group === null) {
    return null
  }
  const groupRight = Math.max(...group.map((r) => r.box.right))
  if (upX <= groupRight + 1) {
    return null
  }
  const prevBottom = Math.max(...prev.map((r) => r.box.bottom))
  // 距离主判据（更近/等距上一行）+ 浅探余量兜底（紧间隙实测 G2 几何——头注申报）
  if (Math.abs(upY - prevBottom) > Math.max(focusBox.top - upY, SHALLOW_PROBE_MAX_PX)) {
    return null
  }
  return rowEndOf(prev, { top: upY, bottom: upY, left: upX, right: upX })
}
