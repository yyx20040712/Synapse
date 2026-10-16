/**
 * [F-VISFB-52] selection-drag-controller —— 指针授权拖选控制器（视检反馈战役
 * B2·选区泳道 B2 波次；§0-4 裁决「选区语义=鼠标位置+栏布局判定；跨双栏需
 * 指针明确入栏授权」的手势层落地——51 号 selection-column-layout 几何判定面
 * 的接线消费方）。
 *
 * ── 行为层（态空间表：S0 idle / S1 dragging）──
 * - S0：mousedown（button 0，target 经 closest('.textLayer') 且在 pageRoot
 *   含域）→ 行盒量测（collectSpans 文本节点→boxOf 视口盒→textLayer 本地
 *   LineBox）→ detectColumnLayout → authorizeColumnSpan（指针形零宽 span
 *   {x0:px,x1:px}）：授权 → 记锚栏+layout+items+pointer 进 S1；未授权
 *   （cross-gutter/no-columns）→ preventDefault（拖选不启动——缝带/零文本
 *   区无「指针明确入栏」授权）停 S0。S0 的 selectionchange=纯转发（外部/
 *   程序化选区零处理——B4-3 S5 窗语义）。
 * - S1：mousemove → 仅写 session.pointer+重开写窗（禁 setState/禁选区写
 *   ——闪烁与性能面归 53 票）；selectionchange → 自写回声（canonical
 *   signature：anchor/focus 节点同一性+偏移四元组精确相等——归一化探针
 *   E1/E2/E4 实证 Chromium 对文本形态写逐字回声零归一化）→ 抑制不转发
 *   （防自身写回环）；其余 → 违例检测（focus/anchor 边界行盒 ∈ 对侧栏）→
 *   越栏边界投影回锚栏（focus 按 pointer——§0-4 鼠标位置+栏布局判定；anchor
 *   按锚盒自身 y/侧——shift+click 旧锚跨栏形态）→ setBaseAndExtent 写（限写
 *   WRITE_RETRY_CAP/超出接受浏览器终态——归一化振荡有界退出）→ 转发调度器。
 *   转发后 rAF 帧点 evaluate.visual 与 mouseup 的 evaluate.full 同读 window
 *   selection=visual-full-mouseup 共用 effective selection 单源（禁两套几何）。
 * - 投影语义：pointer y 落行带→该行（带间隙取阅读序下带）；px ≥ 锚栏 x1 →
 *   行尾（带内最右盒文本尾）、px ≤ x0 → 行首（最左盒 offset 0）；y 高于
 *   栏顶→栏首（DOM 序首项 offset 0）、低于栏底→栏尾（DOM 序末项文本尾）。
 * - 元素槽位形态边界（探针 E9：中缝悬停解析为邻行 span 槽位 (span,0)）按
 *   span 归属判栏；全宽带/旋转盒/不可解析边界（页外/工具条等）不判违例
 *   （全宽标题行内拖选不受扰——51 号头注「52 持最终语义裁量」的落法）。
 * - mouseup（SelectionLayer 链）：enforce（F-12 门前后各一核——幂等）+
 *   endSession → S0；会话终局后外部选区零拦截零清除（B4-3）。
 *
 * ── 接口层 ──
 * - export function createSelectionDragController({ pageRoot }) →
 *   { onMouseDown, enforce, endSession, onSelectionChange, dispose }；
 *   onSelectionChange 返回 true=自写回声（SelectionLayer 门不转发调度器）。
 *
 * ── 架构层 ──
 * - 依赖单向：本件→anchors/annotation-anchor（collectSpans）/anchors/
 *   anchor-blank-snap（boxOf——release-affinity 同域先例方向）+interact/
 *   selection-column-layout（51 号几何单源；行盒成员=输入引用恒定合同=
 *   行盒→量测项回映依据）。S5 窗（selection-evaluate AFFINITY_SHORTCUT_
 *   TTL_MS）语义零改：本件抑制仅限自写精确匹配，无 blanket 窗。
 *
 * ── 生命周期层 ──
 * - mousemove 监听=创建期常挂（S0 早退 O(1)——免会话生命周期挂拆错位）；
 *   dispose=SelectionLayer 卸载清理（INV-14 同型）。
 *
 * ── 文化层 ──
 * - tests/unit/renderer/selection-drag-controller.test.ts（态空间+跨格
 *   序列 10 it）+selection-drag-fixture.test.ts（0C 真 pdfjs gating 链）+
 *   selection-layer-f52.test.tsx（接线三态）；归一化探针=evidence/
 *   52-normalization-probe.{mjs,raw.txt}（B4 加严 1——结论入实施报告）。
 */
import { collectSpans } from '../anchors/annotation-anchor'
import { boxOf } from '../anchors/anchor-blank-snap'
import { authorizeColumnSpan, detectColumnLayout, type ColumnId, type ColumnLayout, type LineBox } from './selection-column-layout'

/** 归一化振荡重试上限（B4 有界退出）：单用户输入窗（mousemove 重开）内连续
 *  自写 ≤3；超出=接受浏览器终态不再写。探针 E1-E5 实证 Chromium 对文本
 *  形态写零归一化（振荡不可达）——本值=防御深度（浏览器行为演化保险） */
const WRITE_RETRY_CAP = 3

/** 控制器句柄（SelectionLayer 接线消费——头注接口层） */
export interface SelectionDragHandle {
  /** mousedown：授权判定+会话启动（未授权 preventDefault 不启动） */
  onMouseDown(e: MouseEvent): void
  /** 违例核查+钳制写（幂等；mouseup 终局核查——F-12 门前后各一核） */
  enforce(): void
  /** 会话终局（mouseup 链尾/早退路径/卸载兜底） */
  endSession(): void
  /** selectionchange 门：true=自写回声（抑制不转发）；false=处理毕应转发 */
  onSelectionChange(): boolean
  /** 卸载清理（mousemove 常挂监听摘除） */
  dispose(): void
}

/** 量测项：textLayer 本地行盒+其文本节点（行盒=layout 成员引用恒定——回映依据） */
interface DragItem {
  box: LineBox
  text: Text
}

/** 拖选会话（S1 态全量——纯可变数据，无 DOM 写缓存） */
interface DragSession {
  anchorColumn: ColumnId
  otherColumn: ColumnId
  twoColumn: boolean
  items: DragItem[]
  member: Map<LineBox, ColumnId | 'full-span' | 'rotated'>
  colItems: DragItem[]
  colX0: number
  colX1: number
  originX: number
  originY: number
  pointer: { x: number; y: number }
  writes: number
}

/** 自写回声签名（canonical：节点同一性+偏移精确四元组——探针 E1/E2 逐字回声） */
interface OwnWrite {
  anchorNode: Node
  anchorOffset: number
  focusNode: Node
  focusOffset: number
}

/** 边界点（与 setBaseAndExtent 入参同构） */
interface DragBoundary {
  node: Node
  offset: number
}

export function createSelectionDragController(opts: { pageRoot: HTMLElement }): SelectionDragHandle {
  const { pageRoot } = opts
  let session: DragSession | null = null
  let ownWrite: OwnWrite | null = null

  /** 行盒量测：collectSpans 文本节点→boxOf 视口盒→textLayer 本地 LineBox */
  function measure(textLayer: HTMLElement): { items: DragItem[]; ox: number; oy: number } {
    const layerBox = boxOf(textLayer)
    const items: DragItem[] = []
    if (layerBox === null) return { items, ox: 0, oy: 0 }
    for (const s of collectSpans(textLayer).spans) {
      const b = boxOf(s.node.parentElement)
      if (b === null) continue
      items.push({
        box: { x: b.left - layerBox.left, y: b.top - layerBox.top, w: b.right - b.left, h: b.bottom - b.top },
        text: s.node
      })
    }
    return { items, ox: layerBox.left, oy: layerBox.top }
  }

  /** 边界归属项：文本位=该文本节点项；元素槽位（探针 E9）=span 归属项 */
  function itemOf(node: Node, items: DragItem[]): DragItem | null {
    for (const it of items) {
      if (it.text === node) return it
      if (node.nodeType === Node.ELEMENT_NODE && it.text.parentElement === node) return it
    }
    return null
  }

  /** 锚栏行带（y 重叠传递链，相切不算重叠——51 号 rowBands 同式，作用域=锚栏） */
  function rowBandsOf(items: DragItem[]): Array<{ items: DragItem[]; top: number; bottom: number }> {
    const sorted = [...items].sort((a, b) => a.box.y - b.box.y)
    const bands: Array<{ items: DragItem[]; top: number; bottom: number }> = []
    for (const it of sorted) {
      const cur = bands[bands.length - 1]
      if (cur !== undefined && it.box.y < cur.bottom) {
        cur.items.push(it)
        cur.bottom = Math.max(cur.bottom, it.box.y + it.box.h)
      } else {
        bands.push({ items: [it], top: it.box.y, bottom: it.box.y + it.box.h })
      }
    }
    return bands
  }

  /** 投影目标（头注行为层投影语义）：y 越栏带→栏首/栏尾；落带/间隙→该行
   *  （间隙取阅读序下带）；行内按 rowEnd 定行尾（最右盒文本尾）/行首 */
  function projectTo(s: DragSession, y: number, rowEnd: boolean): DragBoundary | null {
    const items = s.colItems
    if (items.length === 0) return null
    const bands = rowBandsOf(items)
    if (y < bands[0]!.top) {
      return { node: items[0]!.text, offset: 0 }
    }
    if (y > bands[bands.length - 1]!.bottom) {
      const last = items[items.length - 1]!
      return { node: last.text, offset: last.text.data.length }
    }
    let band = bands[bands.length - 1]!
    for (const b of bands) {
      if (b.bottom > y) {
        band = b
        break
      }
    }
    const pick = band.items.reduce((m, it) => (rowEnd ? it.box.x + it.box.w > m.box.x + m.box.w : it.box.x < m.box.x) ? it : m)
    return rowEnd ? { node: pick.text, offset: pick.text.data.length } : { node: pick.text, offset: 0 }
  }

  /** 违例核查+钳制写（幂等；会话外/单栏/坍缩零写） */
  function enforce(): void {
    const s = session
    if (s === null || !s.twoColumn) return
    const sel = window.getSelection()
    if (sel === null || sel.rangeCount === 0 || sel.isCollapsed || sel.anchorNode === null || sel.focusNode === null) {
      return
    }
    let anchorNode: Node = sel.anchorNode
    let anchorOffset = sel.anchorOffset
    let focusNode: Node = sel.focusNode
    let focusOffset = sel.focusOffset
    let changed = false
    const aItem = itemOf(anchorNode, s.items)
    if (aItem !== null && s.member.get(aItem.box) === s.otherColumn) {
      const cy = aItem.box.y + aItem.box.h / 2
      const proj = projectTo(s, cy, aItem.box.x >= s.colX1)
      if (proj !== null && (proj.node !== anchorNode || proj.offset !== anchorOffset)) {
        anchorNode = proj.node
        anchorOffset = proj.offset
        changed = true
      }
    }
    const fItem = itemOf(focusNode, s.items)
    if (fItem !== null && s.member.get(fItem.box) === s.otherColumn) {
      const proj = projectTo(s, s.pointer.y, s.pointer.x >= s.colX1)
      if (proj !== null && (proj.node !== focusNode || proj.offset !== focusOffset)) {
        focusNode = proj.node
        focusOffset = proj.offset
        changed = true
      }
    }
    if (!changed) return
    if (s.writes >= WRITE_RETRY_CAP) return
    sel.setBaseAndExtent(anchorNode, anchorOffset, focusNode, focusOffset)
    ownWrite = { anchorNode, anchorOffset, focusNode, focusOffset }
    s.writes += 1
  }

  /** mousemove：只写 ref（pointer+写窗重开——用户输入事件；归一化事件无
   *  伴随 move，CAP 判别面即在此） */
  const onMouseMove = (e: MouseEvent): void => {
    const s = session
    if (s === null) return
    s.pointer = { x: e.clientX - s.originX, y: e.clientY - s.originY }
    s.writes = 0
  }
  document.addEventListener('mousemove', onMouseMove)

  return {
    onMouseDown(e: MouseEvent): void {
      if (e.button !== 0 || !(e.target instanceof Element)) return
      const textLayer = e.target.closest('.textLayer')
      if (textLayer === null || !pageRoot.contains(textLayer)) return
      const { items, ox, oy } = measure(textLayer as HTMLElement)
      const layout: ColumnLayout = detectColumnLayout(items.map((it) => it.box))
      const px = e.clientX - ox
      const py = e.clientY - oy
      const auth = authorizeColumnSpan(layout, { x0: px, x1: px })
      if (!auth.authorized) {
        e.preventDefault()
        session = null
        return
      }
      const member = new Map<LineBox, ColumnId | 'full-span' | 'rotated'>()
      for (const col of layout.columns) {
        for (const b of col.boxes) member.set(b, col.id)
      }
      for (const b of layout.fullSpan) member.set(b, 'full-span')
      for (const b of layout.rotated) member.set(b, 'rotated')
      const col = layout.columns.find((c) => c.id === auth.columnId)!
      session = {
        anchorColumn: auth.columnId,
        otherColumn: auth.columnId === 'left' ? 'right' : 'left',
        twoColumn: layout.kind === 'two-column',
        items,
        member,
        colItems: col.boxes.map((b) => items.find((it) => it.box === b)!),
        colX0: col.x0,
        colX1: col.x1,
        originX: ox,
        originY: oy,
        pointer: { x: px, y: py },
        writes: 0
      }
    },
    enforce,
    endSession(): void {
      session = null
    },
    onSelectionChange(): boolean {
      const sel = window.getSelection()
      if (
        sel !== null &&
        ownWrite !== null &&
        sel.anchorNode === ownWrite.anchorNode &&
        sel.anchorOffset === ownWrite.anchorOffset &&
        sel.focusNode === ownWrite.focusNode &&
        sel.focusOffset === ownWrite.focusOffset
      ) {
        return true
      }
      if (session !== null) enforce()
      return false
    },
    dispose(): void {
      document.removeEventListener('mousemove', onMouseMove)
      session = null
    }
  }
}
