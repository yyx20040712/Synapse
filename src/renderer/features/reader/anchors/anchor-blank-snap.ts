/**
 * [F-A10] anchor-blank-snap —— 划选边界段末空白归一化域（纯函数）
 *
 * ── 行为层 ──
 * - 缺陷机制（2026-09-09 真机三轮诊断实证，scripts/audits/f-a10-diag*-real*.raw.txt）：
 *   浏览器把行尾/段首空白区的点击解析为 pdf.js 行 break 标记（<br role=
 *   presentation>，零宽×~2 行高盒、x 在栏左缘=无横向意义）或纯空白项 span
 *   （有真实字形盒）的槽位；标记 DOM 序（=内容流序）≠视觉序——边界按 DOM
 *   槽位起算会视觉跳跃：实测段末行尾空白点击→终点跳回 7 行前（丢下半段）；
 *   img2 形态=跳过下一段前数行（整段带上）。两方向同根因。
 * - 归一化（side 区分双边界，门一回炉 C-1）：
 *   · br 槽位·end 边界 → br 盒带覆盖视觉行（**最近单行**聚类，等距并列取
 *     阅读序上行——C-2）中距 br 最近的栏组的行尾文本末（=本行行尾，不下探
 *     下一段）；
 *   · br 槽位·start 边界 → 同上定位行尾后在**阅读序文本域推进**：越过紧邻
 *     纯空白标记 span 到首个非空白字符（=下一视觉行首；页尾无后继时回退
 *     行尾）——起点在阅读序上位于本行行尾之后，且 quote 不含前导空白；
 *   · 纯空白/空文本 span 标记（字形盒真实）→ 盒左侧最近同行文本行尾；无左侧
 *     同行文本→右侧最近同行文本首字符（段首缩进空白吸附）。
 *   · 归一化可能令 start>end（起点推进越回拖终点）——调用方（selectionToAnchor）
 *     以翻转兜底互换，防有效划选静默丢（C-1）。
 * - 兼容面（零语义变）：非标记文本位（词间空格划选——空格在非空白 span 内）
 *   原样；无布局量测环境（jsdom 含原点四零盒）原样；普通元素槽位原样
 *   （元素槽位索引按 childNodes——Range 语义，防裸文本节点混入错位，C-3）。
 *   栏间空白（门二回炉细化）：空白 span 盒落在某栏组水平域内→**组内定向**
 *   （右栏行首缩进→右栏首字符，不误吸左栏）；盒在栏间→左栏行尾；文本位命中
 *   右栏首字符→原生语义（三分语义表见 f-a10-impl.report.md）。
 *
 * ── 接口层 ──
 * - export interface DomBoundary { node: Node; offset: number }
 * - export function snapBlankBoundary(root, node, offset, side): DomBoundary
 *   （side='start'|'end'——br 类吸附目标按边界侧区分；输入输出同构——未命中
 *   时返回等值新对象；锚定链消费=anchor-serialize selectionToAnchor 的输入
 *   归一化，快/慢路径最终锚定同源）
 * - [F-A12] 几何复用面（几何单源，禁两处复制聚类逻辑）：export boxOf（量测
 *   守卫盒——四零盒 null）/visualRows（中心聚类视觉行）/columnGroups（行内
 *   栏聚类）/rowEndOf（最近栏组行尾边界）+ export type Box；消费方=
 *   release-affinity（释放点浅探重定向——事件层判定，与锚定归一化互不替代）
 * - [F-RDR-01] export markerAt/isBlankMarker 供 visual 边界吸附复用；行尾
 *   语义唯一源 = rowEndOf，禁止第二套行尾实现。**导出面约束（终裁修正 12）：
 *   仅供 visual 吸附通道（snapVisualBoundary→selection-evaluate.visual）
 *   消费；锚定序列化侧继续走 snapBlankBoundary 门面，勿直引**（防 API 泛化）。
 *   snapVisualBoundary（拖选期视觉边界末行下方吸附）=快路径专用——返回
 *   {node,offset} 锚点不返回 Rect，行尾目标复用 rowEndOf，适配层零行尾几何
 *
 * ── 架构层 ──
 * - 依赖单向 anchor-serialize→本模块→annotation-anchor（几何原语公共面
 *   collectSpans——零环）；零 React/IPC 依赖，纯函数可单测
 * - [F-RDR-01 起] 快路径（selection-evaluate.visual）经 snapVisualBoundary
 *   入本模块——仅末行下方边界的视觉吸附（行尾目标复用 rowEndOf，语义单源）；
 *   全量归一化语义仍独属 snapBlankBoundary（锚定序列化面）。F-A6-c 时代的
 *   「快路径不经本模块」表述随之作废（拖选期瞬态带吸附+S5 短路双闭环后，
 *   mouseup/settle 全量同帧覆盖吸收语义保持）
 *
 * ── 生命周期层 ──
 * - 仅 mouseup/settle 时刻调用（非每帧）；单页千级文本节点 O(n log n)
 *   （collectSpans+行聚类+栏排序）只读一遍布局 <10ms 约束内
 *
 * ── 文化层 ──
 * - 测试：tests/unit/renderer/anchor-blank-snap.test.ts（always-active，
 *   jsdom 量测桩=getBoundingClientRect 逐元素打桩；br 形态按真机 diag3 实测
 *   盒形状建模——零宽×2 行高×栏左缘；C-1/C-2/C-3 回炉面=门一回炉单）
 */
import { collectSpans, type NodeSpan } from './annotation-anchor'

/** DOM 边界点（与 Range 边界同构：node+offset） */
export interface DomBoundary {
  node: Node
  offset: number
}

/** 归一化的边界侧（br 类吸附目标按此区分——C-1） */
export type BoundarySide = 'start' | 'end'

/** 像素盒（top/bottom/left/right——getBoundingClientRect 视口口径）。
 *  [F-A12] 起导出——release-affinity 事件层判定复用同型盒（几何单源） */
export interface Box {
  top: number
  bottom: number
  left: number
  right: number
}

/** 栏间断组阈值系数：x 间隙 > max(20px, 2.5×盒高) 断栏。与 pdf-item-geometry
 *  的 COLUMN_GAP_H_FACTOR（=1.5，pdf item 侧）同族判据的量测侧简化——值不同
 *  用途不同，BLANK_SNAP_ 前缀防同名混引（v57 §2-8 撞名观察收敛） */
const BLANK_SNAP_GAP_MIN_PX = 20
const BLANK_SNAP_GAP_H_FACTOR = 2.5

/** 空白标记：pdf.js 行 break（br）/空串项/纯空白项的渲染产物（textContent
 *  去空白后为空）。
 *  [F-RDR-01] 起导出——**仅供 visual 吸附通道（snapVisualBoundary）消费；
 *  锚定序列化侧继续走 snapBlankBoundary 门面，勿直引**（终裁修正 12——防
 *  API 泛化） */
export function isBlankMarker(el: Element | null): boolean {
  if (el === null) {
    return false
  }
  return (el.textContent ?? '').trim().length === 0
}

/** 元素量测盒；无布局量测（jsdom 未打桩=含原点四零盒）或非函数 → null（归一化
 *  放弃）。真浏览器的零尺寸标记（br/空 span）原点真实（绝对定位 left/top 仍在）
 *  ——位置即信号（真机复测第一轮实证：按尺寸判会把真标记误杀）。
 *  [F-A12] 起导出——release-affinity focus 盒/行盒同守卫口径 */
export function boxOf(el: Element | null): Box | null {
  if (el === null || typeof el.getBoundingClientRect !== 'function') {
    return null
  }
  const b = el.getBoundingClientRect()
  if (b.x === 0 && b.y === 0 && b.width === 0 && b.height === 0) {
    return null
  }
  return { top: b.top, bottom: b.bottom, left: b.left, right: b.right }
}

/**
 * 边界命中的空白标记：文本位在纯空白 span 内→该 span；元素槽位紧邻（其后或
 * 其前，childNodes 索引=Range 元素槽位语义——防裸文本节点混入错位，C-3）空白
 * 标记→该标记；否则 null（普通文本位/普通槽位）。
 * [F-RDR-01] 起导出——**仅供 visual 吸附通道（snapVisualBoundary）消费；
 * 锚定序列化侧继续走 snapBlankBoundary 门面，勿直引**（终裁修正 12——防
 * API 泛化）
 */
export function markerAt(node: Node, offset: number): Element | null {
  if (node.nodeType === Node.TEXT_NODE) {
    const parent = node.parentElement
    return isBlankMarker(parent) ? parent : null
  }
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null
  }
  const asMarker = (n: ChildNode | undefined): Element | null =>
    n !== undefined && n.nodeType === Node.ELEMENT_NODE && isBlankMarker(n as Element) ? (n as Element) : null
  const kids = node.childNodes
  return asMarker(kids[offset]) ?? asMarker(kids[offset - 1])
}

/** 中心聚类成视觉行：相邻中心差 ≤ max(2, 半高) 合并；输出按中心升序。
 *  [C-2] 最近单行制——容差内集在跨行居中标记下会同时纳入两行，改为聚类后
 *  取最近一行，等距并列取中心更小者（阅读序上行）。
 *  [F-A12] 起导出——release-affinity 上一直觉行定位复用（输出中心升序=阅读序） */
export function visualRows(items: Array<{ span: NodeSpan; box: Box }>): Array<Array<{ span: NodeSpan; box: Box }>> {
  const sorted = [...items].sort((a, b) => (a.box.top + a.box.bottom) / 2 - (b.box.top + b.box.bottom) / 2)
  const rows: Array<Array<{ span: NodeSpan; box: Box }>> = []
  for (const it of sorted) {
    const r = rows[rows.length - 1]
    const prev = r?.[r.length - 1]
    const merge =
      prev !== undefined &&
      Math.abs((it.box.top + it.box.bottom) / 2 - (prev.box.top + prev.box.bottom) / 2) <=
        Math.max(2, Math.min(it.box.bottom - it.box.top, prev.box.bottom - prev.box.top) / 2)
    if (merge) {
      r!.push(it)
    } else {
      rows.push([it])
    }
  }
  return rows
}

/** 标记盒带覆盖的最近视觉行（无同行文本 → null） */
function nearestRow(root: HTMLElement, markerCy: number): Array<{ span: NodeSpan; box: Box }> | null {
  const items: Array<{ span: NodeSpan; box: Box }> = []
  for (const span of collectSpans(root).spans) {
    const b = boxOf(span.node.parentElement)
    if (b !== null) {
      items.push({ span, box: b })
    }
  }
  let best: Array<{ span: NodeSpan; box: Box }> | null = null
  let bestDist = Number.POSITIVE_INFINITY
  for (const row of visualRows(items)) {
    const centers = row.map((r) => (r.box.top + r.box.bottom) / 2)
    const dist = Math.abs(centers.reduce((s, c) => s + c, 0) / centers.length - markerCy)
    if (dist < bestDist) {
      best = row
      bestDist = dist
    }
  }
  return best
}

/** 行内栏聚类：按 left 升序，x 间隙大于阈值断组（同视觉行的多栏文本互不吸附）。
 *  [F-A12] 起导出——release-affinity 经 rowEndOf 间接消费（单源不改语义） */
export function columnGroups(row: Array<{ span: NodeSpan; box: Box }>): Array<Array<{ span: NodeSpan; box: Box }>> {
  const sorted = [...row].sort((a, b) => a.box.left - b.box.left)
  const groups: Array<Array<{ span: NodeSpan; box: Box }>> = []
  for (const r of sorted) {
    const g = groups[groups.length - 1]
    const h = Math.max(2, r.box.bottom - r.box.top)
    if (g !== undefined && r.box.left - g[g.length - 1]!.box.right <= Math.max(BLANK_SNAP_GAP_MIN_PX, BLANK_SNAP_GAP_H_FACTOR * h)) {
      g.push(r)
    } else {
      groups.push([r])
    }
  }
  return groups
}

/** 行尾边界：标记最近栏组内最右文本的末尾。
 *  [F-A12] 起导出——release-affinity 重定向目标=上一视觉行（释放 x 最近栏组）行尾，
 *  box 入参即释放点合成盒（left/right=upX）——语义同一：最近栏组定向 */
export function rowEndOf(row: Array<{ span: NodeSpan; box: Box }>, box: Box): DomBoundary | null {
  const groups = columnGroups(row)
  let best: Array<{ span: NodeSpan; box: Box }> | null = null
  let bestDist = Number.POSITIVE_INFINITY
  for (const g of groups) {
    const gLeft = g[0]!.box.left
    const gRight = g[g.length - 1]!.box.right
    const dist = box.left >= gLeft && box.left <= gRight ? 0 : Math.min(Math.abs(gLeft - box.left), Math.abs(gRight - box.left))
    if (dist < bestDist) {
      best = g
      bestDist = dist
    }
  }
  const tail = best?.reduce((m, r) => (r.box.right > m.box.right ? r : m))
  return tail !== undefined ? { node: tail.span.node, offset: tail.span.node.data.length } : null
}

/** [C-1] 起点侧行首推进：自行尾 span 起在阅读序（collectSpans 文档序）向后
 *  越过紧邻纯空白 span，落在首个非空白 span 首字符；无后继非空白 → 回退行尾 */
function advancePastBlanks(root: HTMLElement, rowEnd: DomBoundary, rowEndFallback: DomBoundary): DomBoundary {
  const spans = collectSpans(root).spans
  const idx = spans.findIndex((s) => s.node === rowEnd.node)
  if (idx >= 0) {
    for (let i = idx + 1; i < spans.length; i += 1) {
      if (spans[i]!.node.data.trim().length > 0) {
        return { node: spans[i]!.node, offset: 0 }
      }
    }
  }
  return rowEndFallback
}

/**
 * [F-A10] 段末空白 affinity 归一化：边界落在空白标记的槽位时按标记形态与
 * 边界侧重解析到本行文本边界；其余形态原样返回（语义零变）
 */
export function snapBlankBoundary(root: HTMLElement, node: Node, offset: number, side: BoundarySide): DomBoundary {
  const marker = markerAt(node, offset)
  if (marker === null || !root.contains(marker)) {
    return { node, offset }
  }
  const box = boxOf(marker)
  if (box === null) {
    return { node, offset }
  }
  const row = nearestRow(root, (box.top + box.bottom) / 2)
  if (row === null) {
    return { node, offset }
  }
  if (marker.tagName === 'BR') {
    // 行 break 标记：盒 x 在栏左缘=无横向意义（diag3 实测）——最近栏组的行尾为
    // 基准；end 边界=行尾（不下探下段），start 边界=越过紧邻空白到下一行首
    const rowEnd = rowEndOf(row, box)
    if (rowEnd === null) {
      return { node, offset }
    }
    if (side === 'end') {
      return rowEnd
    }
    return advancePastBlanks(root, rowEnd, rowEnd)
  }
  // 空白/空文本 span 标记（字形盒真实）——先栏分流（门二回炉：全行横向 left
  // 过滤会把右栏行首缩进空白误吸到左栏行尾，用户库 Reynolds_1883 双栏真实面）：
  // ① 盒落在某栏组水平域内（含栏间断组阈值的容差）→ 组内定向（组内左侧文本
  //    →其行尾；无→组内右侧首字符=本栏行首）；
  // ② 盒在栏间/页边（不属任何栏组）→ 其左最近栏组的行尾（栏间空白→左栏行尾
  //    三分语义保持）；左无栏组（左页边）→ 右侧最近栏组首字符（段首缩进类）。
  const groups = columnGroups(row)
  const host = groups.find((g) => {
    const tol = Math.max(BLANK_SNAP_GAP_MIN_PX, BLANK_SNAP_GAP_H_FACTOR * Math.max(2, g[0]!.box.bottom - g[0]!.box.top))
    return box.left <= g[g.length - 1]!.box.right + tol && box.right >= g[0]!.box.left - tol
  })
  if (host !== undefined) {
    const left = host
      .filter((r) => r.box.right <= box.left + 1)
      .sort((a, b) => b.box.right - a.box.right)[0]
    if (left !== undefined) {
      return { node: left.span.node, offset: left.span.node.data.length }
    }
    const right = host
      .filter((r) => r.box.left >= box.right - 1)
      .sort((a, b) => a.box.left - b.box.left)[0]
    if (right !== undefined) {
      return { node: right.span.node, offset: 0 }
    }
    return { node, offset }
  }
  const before = groups.filter((g) => g[g.length - 1]!.box.right < box.left)
  if (before.length > 0) {
    const tail = before[before.length - 1]!.reduce((m, r) => (r.box.right > m.box.right ? r : m))
    return { node: tail.span.node, offset: tail.span.node.data.length }
  }
  const firstGroup = groups[0]
  const head = firstGroup?.reduce((m, r) => (r.box.left < m.box.left ? r : m))
  return head !== undefined ? { node: head.span.node, offset: 0 } : { node, offset }
}

/**
 * [F-RDR-01] 拖选期视觉边界末行下方吸附（快路径专用）：拖选越过末行后浏览器
 * 把边界送进末行下方的空白标记槽位，visual 快路径按原始边界算几何=视觉边界
 * 跳跃（S3 缺陷）。命中「末行下方」→末行（标记最近栏组）行尾锚点；其余形态
 * null=零吸附（调用方 fallback 原始边界——空守卫，禁非空断言）。
 *
 * 守卫序（任务书 A 路径）：
 * 1. closest('.textLayer') 上溯（无深度常量）——非 textLayer 边界零吸附；
 * 2. 空守卫：markerAt 探测 null / boxOf 无量测（jsdom 四零盒）→null；
 * 3. 末行判定：标记中心越过**真实文本**末行盒底（空白标记不入行构造——否则
 *    越末行的空白 span 自成末行，判据自吞失效）；页中标记（未越末行）→null
 *    零吸附（页中归 mouseup 全量 snapBlankBoundary 语义面，F-A10 不动）；
 * 4. 末行吸附=复用 rowEndOf（行尾语义唯一源——适配层仅类型转换/空值合并，
 *    零行尾几何、零 DOM 位置比较）。
 *
 * [W-6 回炉·行源同一性] 末行判定的行构造与 rowEndOf 消费的行构造=**同一次
 * 构造**（本函数内单一 items/rows 局部链：collectSpans+boxOf+visualRows——
 * 与 snapBlankBoundary/release-affinity 同族导出原语，无第二套行构造）；与
 * 锚定侧 nearestRow 的差异仅在**入集面**（本函数剔空白标记防判据自吞，
 * nearestRow 全集入行服务最近行锚定）——判定面差异非行源分叉，行聚类/栏
 * 聚类/行尾算法零分叉（visualRows/columnGroups/rowEndOf 单源）。
 *
 * side=调用侧标签（'anchor'=回拖起点/'focus'=前拖终点）：末行钳位双侧同
 * 目标（行尾）——方向对称语义由 selection-evaluate 的 eff 边界文档序定序
 * 承担，本参数固定 visual 吸附通道契约面（终裁修正 1 调用形）。
 */
export function snapVisualBoundary(
  node: Node,
  offset: number,
  _side: 'anchor' | 'focus'
): DomBoundary | null {
  // 守卫 1：closest('.textLayer') 上溯（文本位=父 span 起/元素槽位=该元素起）
  const host = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement
  const textLayer = (host?.closest('.textLayer') ?? null) as HTMLElement | null
  if (textLayer === null) {
    return null
  }
  // 守卫 2（空守卫）：边界未命中空白标记→null（调用方 fallback 原始边界）
  const marker = markerAt(node, offset)
  if (marker === null || !textLayer.contains(marker)) {
    return null
  }
  const box = boxOf(marker)
  if (box === null) {
    return null
  }
  // 末行判定：真实文本（剔空白标记）行构造——visualRows 输出中心升序=阅读序，
  // 末元素=最底真实文本行
  const items: Array<{ span: NodeSpan; box: Box }> = []
  for (const span of collectSpans(textLayer).spans) {
    if (isBlankMarker(span.node.parentElement)) {
      continue
    }
    const b = boxOf(span.node.parentElement)
    if (b !== null) {
      items.push({ span, box: b })
    }
  }
  if (items.length === 0) {
    return null
  }
  const rows = visualRows(items)
  const lastRow = rows[rows.length - 1]!
  const lastBottom = Math.max(...lastRow.map((r) => r.box.bottom))
  // 守卫 3：未越末行（页中/行内标记）→null 零吸附
  if ((box.top + box.bottom) / 2 <= lastBottom) {
    return null
  }
  // 末行吸附：复用 rowEndOf（标记盒定向最近栏组行尾——br 盒 x 无横向语义
  // 同 F-A10 处理；适配层零行尾几何）
  return rowEndOf(lastRow, box)
}
