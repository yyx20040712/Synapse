/**
 * [F-VISFB-52] selection-drag-controller —— 指针授权拖选控制器（视检反馈战役
 * B2·选区泳道 B2 波次；§0-4 裁决「选区语义=鼠标位置+栏布局判定；跨双栏需
 * 指针明确入栏授权」的手势层落地——51 号 selection-column-layout 几何判定面
 * 的接线消费方）。
 *
 * ── 行为层（态空间表：S0 idle / S1 dragging；[F-SELBLK-01] 锚栏→锚块泛化）──
 * - S0：mousedown（button 0，target 经 closest('.textLayer') 且在 pageRoot
 *   含域）→ 行盒量测（collectSpans 文本节点→boxOf 视口盒→textLayer 本地
 *   LineBox）→ detectBlockLayout（块分割三级）→ authorizeBlockPoint（指针形
 *   点 {x,y}）：授权 → 记锚块+layout+items+pointer 进 S1；未授权（in-gutter/
 *   no-blocks）→ preventDefault（拖选不启动——缝带/零文本区无指针明确授权）
 *   停 S0。S0 的 selectionchange=纯转发（外部/程序化选区零处理——B4-3 窗语义）。
 * - S1：mousemove → 仅写 session.pointer+重开写窗（禁 setState/禁选区写
 *   ——闪烁与性能面归 53 票）；selectionchange → 自写回声（canonical
 *   signature：anchor/focus 节点同一性+偏移四元组精确相等——**一次性消费+
 *   会话/纪边界清零**〔回炉 B-1〕）→ 抑制不转发（防自身写回环）；其余 →
 *   违例检测（focus/anchor 边界行盒的 member 存在且 ≠ 锚块——flow/full-span/
 *   rotated 统一判）→ 投影回锚块（focus 按 pointer；anchor 按锚盒自身 y/侧
 *   ——shift+click 旧锚形态）→ setBaseAndExtent 写（限写=每 mousemove 写窗
 *   ≤WRITE_RETRY_CAP——用户输入重开预算、纯振荡有界；超出接受浏览器终态）
 *   → 转发调度器。转发后 rAF 帧点 evaluate.visual 与 mouseup 的 evaluate.full
 *   同读 window selection=共用 effective selection 单源（禁两套几何）。
 * - 投影语义（[F-VISFB-53CI-02] B1/B2/B3 沿承，作用域=锚块）：pointer y 落
 *   锚块内行带→该带；y 落带间隙→距 y 最近带（等距取上带=阅读序保守防外扩）；
 *   y 越首带顶→视觉首带、越末带底→视觉末带（rowBandsOf 输出=视觉序单源）；
 *   带内 x 二值：px ≥ 锚块 x1 → 带内最右盒文本尾、px ≤ 锚块 x0 → 最左盒
 *   offset 0（块尾全选仅指针真处块底以下时成立）。
 * - 单栏页同样执行 enforce（[F-SELBLK-01] 行为变化：52 号 single 会话 no-op
 *   → 本票 flow 块违例同样投影——单栏页页眉/页脚/段块净空生效，票面主诉）。
 * - 元素槽位形态边界（探针 E9：中缝悬停解析为邻行 span 槽位 (span,0)）按
 *   span 所属块判；不可解析边界（页外/工具条等，itemOf 返回 null）不判违例。
 *   全宽带/旋转盒伪块违例由本票统一承载（52 号「不判违例」类目取消）。
 * - mouseup（SelectionLayer 链）：enforce（F-12 门前后各一核——幂等）+
 *   endSession → S0；会话终局后外部选区零拦截零清除（B4-3）。
 *
 * ── 接口层 ──
 * - export function createSelectionDragController({ pageRoot }) →
 *   { onMouseDown, enforce, endSession, onSelectionChange, dispose }；
 *   onSelectionChange 返回 true=自写回声（SelectionLayer 门不转发调度器）。
 * - [F-VISFB-53] export CanonicalSignature/canonicalSignatureOf/
 *   canonicalSignatureEquals——canonical signature 四元组单源面（53 号
 *   selection-evaluate 同签名禁重复 paint 消费；本件 echo 判据同源——
 *   禁第二套签名的落法）
 *
 * ── 架构层 ──
 * - 依赖单向：本件→anchors/annotation-anchor（collectSpans）/anchors/
 *   anchor-blank-snap（boxOf——release-affinity 同域先例方向）+interact/
 *   selection-block-layout（块分割单源；行盒成员=输入引用恒定合同=行盒→
 *   量测项回映依据）+interact/selection-column-layout（类型 LineBox）。S5 窗
 *   （selection-evaluate AFFINITY_SHORTCUT_TTL_MS）语义零改：本件抑制仅限
 *   自写精确匹配，无 blanket 窗。
 *
 * ── 生命周期层 ──
 * - mousemove 监听=创建期常挂（S0 早退 O(1)——免会话生命周期挂拆错位）；
 *   dispose=SelectionLayer 卸载清理（INV-14 同型）。
 *
 * ── 文化层 ──
 * - tests/unit/renderer/selection-drag-controller.test.ts（态空间+跨格序列）+
 *   selection-drag-fixture.test.ts（0C 真 pdfjs gating 链）+
 *   selection-layer-f52.test.tsx（接线四态）；归一化探针=evidence/
 *   52-normalization-probe.{mjs,raw.txt}（B4 加严 1——结论入实施报告）。
 */
import { collectSpans } from '../anchors/annotation-anchor'
import { boxOf } from '../anchors/anchor-blank-snap'
import { authorizeBlockPoint, detectBlockLayout, type TextBlock } from './selection-block-layout'
import type { LineBox } from './selection-column-layout'
import { bandAtY, projectCaretTo, rowBandsOf, type SlotItem } from './selection-slot-projection'

/** 归一化振荡重试上限（B4 有界退出；回炉 W-1 语义显式化）：限写=**每
 *  mousemove 写窗** ≤3——用户输入事件重开预算（归一化事件无伴随 move〔探针
 *  E10 实证〕故纯振荡有界）；drag epoch 全程写数随真实移动无界=设计语义
 *  （主控裁决接受）。探针 E1-E5 实证 Chromium 对文本形态写零归一化（振荡
 *  不可达）——本值=防御深度（浏览器行为演化保险） */
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
type DragItem = SlotItem

/** 拖选会话（S1 态全量——纯可变数据，无 DOM 写缓存）。[F-SELBLK-01] 字段
 *  迁移：anchorColumn/otherColumn/twoColumn/colItems/colX0/colX1 →
 *  anchorBlock/blockItems/blockX0/blockX1（违例判据=member≠anchorBlock，
 *  单栏会话同样 enforce）。[B1-U2 单元 1] 追加 textLayer（容器元素槽位判定
 *  宿主）与 down（mousedown 原点——容器槽位 anchor 投影依据）。 */
interface DragSession {
  anchorBlock: number
  items: DragItem[]
  member: Map<LineBox, number>
  blockItems: DragItem[]
  blockX0: number
  blockX1: number
  textLayer: HTMLElement
  originX: number
  originY: number
  down: { x: number; y: number }
  pointer: { x: number; y: number }
  writes: number
}

/** 自写回声签名（canonical：节点同一性+偏移精确四元组——探针 E1/E2 逐字回声）。
 *  [F-VISFB-53] 起导出为 canonical signature 单源面（selection-evaluate 同签名
 *  禁重复 paint 消费——主控裁决禁第二套签名；null 域=rangeCount 0/无选区） */
export interface CanonicalSignature {
  anchorNode: Node | null
  anchorOffset: number
  focusNode: Node | null
  focusOffset: number
}

/** [F-VISFB-53] canonical signature 读取（rangeCount 0 → null 域） */
export function canonicalSignatureOf(sel: Selection | null): CanonicalSignature | null {
  if (sel === null || sel.rangeCount === 0) {
    return null
  }
  return { anchorNode: sel.anchorNode, anchorOffset: sel.anchorOffset, focusNode: sel.focusNode, focusOffset: sel.focusOffset }
}

/** [F-VISFB-53] canonical signature 精确相等（52 号 echo 判据同式——节点同一性
 *  +偏移四元组；null 域与任何签名（含 null）按恒等比较） */
export function canonicalSignatureEquals(a: CanonicalSignature | null, b: CanonicalSignature | null): boolean {
  return a?.anchorNode === b?.anchorNode && a?.anchorOffset === b?.anchorOffset && a?.focusNode === b?.focusNode && a?.focusOffset === b?.focusOffset
}

/** 边界点（与 setBaseAndExtent 入参同构） */
interface DragBoundary {
  node: Node
  offset: number
}

export function createSelectionDragController(opts: { pageRoot: HTMLElement }): SelectionDragHandle {
  const { pageRoot } = opts
  let session: DragSession | null = null
  let ownWrite: CanonicalSignature | null = null

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

  /** 锚栏行带（y 重叠传递链，相切不算重叠——51 号 rowBands 同式，作用域=锚栏）
   *  [B1-U2] 实现迁至 selection-slot-projection（与槽位投影共用单源） */

  /** 投影目标（头注行为层投影语义——[F-VISFB-53CI-02] B1/B2/B3，作用域=锚块）：
   *  y→锚块内行带映射（带内=该带；间隙=距 y 最近带，等距取上带；越顶/越底=
   *  视觉首带/末带——rowBandsOf 视觉序单源）；行内按 rowEnd 定行尾（最右盒
   *  文本尾）/行首 */
  function projectTo(s: DragSession, y: number, rowEnd: boolean): DragBoundary | null {
    const items = s.blockItems
    if (items.length === 0) return null
    const band = bandAtY(rowBandsOf(items), y)
    if (band === null) return null
    const pick = band.items.reduce((m, it) => (rowEnd ? it.box.x + it.box.w > m.box.x + m.box.w : it.box.x < m.box.x) ? it : m)
    return rowEnd ? { node: pick.text, offset: pick.text.data.length } : { node: pick.text, offset: 0 }
  }

  /** [B1-U2 单元 1-②] textLayer 容器元素槽位判定：边界节点是 textLayer 容器
   *  自身（(DIV.textLayer, k) 形态——Chromium 对无 span 点的 caret 解析）。
   *  span 元素槽位（(span,0)）仍走 itemOf 既有归属路径，不在此列。 */
  function isContainerSlot(node: Node, s: DragSession): boolean {
    return node.nodeType === Node.ELEMENT_NODE && node === s.textLayer
  }

  /** [B1-U2 单元 1-②] 容器槽位 → 新投影路径（带内最近盒按 x 距离）写回。
   *  [B1-U3 单元 6] origin=session.down——同域约束域锚（focus 路径指针未命中
   *  带内任何盒时收窄 down 命中盒 x 域；anchor 路径 x/y=down 自身，指针命中
   *  盒内=收窄门不触发，收窄自洽行为零变）。 */
  function projectSlot(s: DragSession, x: number, y: number): DragBoundary | null {
    return projectCaretTo(s.blockItems, x, y, s.down)
  }

  /** 违例核查+钳制写（幂等；会话外零写）。[F-SELBLK-01] 违例判据=边界项
   *  member 存在且 ≠ 锚块（flow/full-span/rotated 统一）；单栏会话同样执行
   *  （52 号 twoColumn no-op 取消）。[B1-U2 单元 1-②] textLayer 容器元素槽位
   *  （itemOf=null）自本批起为可解析违例：focus 按 session.pointer、anchor 按
   *  mousedown 原点投影（新投影路径=带内最近盒按 x 距离；projectTo 二值路径
   *  行为零变）。坍缩选区（mousedown 默认动作覆写形态）若边界仍为容器槽位，
   *  按同一投影路径重写坍缩光标（主控终裁 1 增补规格）。 */
  function enforce(): void {
    const s = session
    if (s === null) return
    const sel = window.getSelection()
    if (sel === null || sel.rangeCount === 0 || sel.anchorNode === null || sel.focusNode === null) {
      return
    }
    if (sel.isCollapsed) {
      if (!isContainerSlot(sel.anchorNode, s)) return
      const proj = projectSlot(s, s.pointer.x, s.pointer.y)
      if (proj === null || (proj.node === sel.anchorNode && proj.offset === sel.anchorOffset)) return
      if (s.writes >= WRITE_RETRY_CAP) return
      sel.setBaseAndExtent(proj.node, proj.offset, proj.node, proj.offset)
      ownWrite = { anchorNode: proj.node, anchorOffset: proj.offset, focusNode: proj.node, focusOffset: proj.offset }
      s.writes += 1
      return
    }
    let anchorNode: Node = sel.anchorNode
    let anchorOffset = sel.anchorOffset
    let focusNode: Node = sel.focusNode
    let focusOffset = sel.focusOffset
    let changed = false
    if (isContainerSlot(anchorNode, s)) {
      // 容器槽位 anchor（shift+click/翻转态）：按 mousedown 原点投影回锚块
      const proj = projectSlot(s, s.down.x, s.down.y)
      if (proj !== null && (proj.node !== anchorNode || proj.offset !== anchorOffset)) {
        anchorNode = proj.node
        anchorOffset = proj.offset
        changed = true
      }
    } else {
      const aItem = itemOf(anchorNode, s.items)
      if (aItem !== null && s.member.get(aItem.box) !== undefined && s.member.get(aItem.box) !== s.anchorBlock) {
        const cy = aItem.box.y + aItem.box.h / 2
        const proj = projectTo(s, cy, aItem.box.x >= s.blockX1)
        if (proj !== null && (proj.node !== anchorNode || proj.offset !== anchorOffset)) {
          anchorNode = proj.node
          anchorOffset = proj.offset
          changed = true
        }
      }
    }
    if (isContainerSlot(focusNode, s)) {
      const proj = projectSlot(s, s.pointer.x, s.pointer.y)
      if (proj !== null && (proj.node !== focusNode || proj.offset !== focusOffset)) {
        focusNode = proj.node
        focusOffset = proj.offset
        changed = true
      }
    } else {
      const fItem = itemOf(focusNode, s.items)
      if (fItem !== null && s.member.get(fItem.box) !== undefined && s.member.get(fItem.box) !== s.anchorBlock) {
        const proj = projectTo(s, s.pointer.y, s.pointer.x >= s.blockX1)
        if (proj !== null && (proj.node !== focusNode || proj.offset !== focusOffset)) {
          focusNode = proj.node
          focusOffset = proj.offset
          changed = true
        }
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
      // [B1-U2 单元 2 —— A1 拦截语义恢复] 常规模式 mousedown 命中标注矩形
      // （pageRoot 内）→ preventDefault 杀原生垃圾选区链（S5/S7：矩形槽位在
      // DOM 序位于整个 textLayer 之后）+ 不启动会话。选择模式矩形带
      // pointer-events:none 恒不命中（AnnotationLayer 既有分支，本件不触）。
      // Chromium 下 mousedown preventDefault 不取消 click——标注点击开菜单
      // 语义由既有 annotation-menu 测试链承载。
      const rectEl = e.target.closest('[data-testid="annotation-rect"]')
      if (rectEl !== null && pageRoot.contains(rectEl)) {
        ownWrite = null
        session = null
        e.preventDefault()
        return
      }
      const textLayer = e.target.closest('.textLayer')
      if (textLayer === null || !pageRoot.contains(textLayer)) return
      // [回炉 B-1] 新 drag epoch=新签名域：授权/未授权两径均清旧纪自写签名
      ownWrite = null
      const { items, ox, oy } = measure(textLayer as HTMLElement)
      const layout = detectBlockLayout(items.map((it) => it.box))
      const px = e.clientX - ox
      const py = e.clientY - oy
      const auth = authorizeBlockPoint(layout, { x: px, y: py })
      if (!auth.authorized) {
        e.preventDefault()
        session = null
        return
      }
      const member = new Map<LineBox, number>()
      for (const block of layout.blocks) {
        for (const b of block.boxes) member.set(b, block.id)
      }
      const block: TextBlock = layout.blocks[auth.blockId]!
      const s: DragSession = {
        anchorBlock: auth.blockId,
        items,
        member,
        blockItems: block.boxes.map((b) => items.find((it) => it.box === b)!),
        blockX0: block.x0,
        blockX1: block.x1,
        textLayer: textLayer as HTMLElement,
        originX: ox,
        originY: oy,
        down: { x: px, y: py },
        pointer: { x: px, y: py },
        writes: 0
      }
      session = s
      // [B1-U2 单元 1-① —— 主控终裁 1 路径 a：仅写不阻默认] 非 span 授权点
      // （textLayer 容器/图区空白等，经最近块回退授权）：mousedown 时刻程序化
      // 置坍缩光标于几何投影位（新投影路径），不 preventDefault——原生拖选
      // 扩展保持启动，拖选期槽位由 selectionchange→enforce（含坍缩槽位再锚）
      // 逐帧纠正。span 命中点零变（原生锚已正确）。
      const spanEl = e.target.closest('span')
      const onSpan = spanEl !== null && (textLayer as HTMLElement).contains(spanEl)
      if (!onSpan) {
        const proj = projectSlot(s, px, py)
        const sel = window.getSelection()
        if (proj !== null && sel !== null) {
          sel.setBaseAndExtent(proj.node, proj.offset, proj.node, proj.offset)
          ownWrite = { anchorNode: proj.node, anchorOffset: proj.offset, focusNode: proj.node, focusOffset: proj.offset }
        }
      }
    },
    enforce,
    endSession(): void {
      session = null
      ownWrite = null
    },
    onSelectionChange(): boolean {
      const sel = window.getSelection()
      // [F-VISFB-53] 判据经 canonicalSignatureEquals 单源（与 53 号 paint 幂等
      // 同一四元组域——主控裁决禁第二套签名；语义=52 号 echo 精确匹配逐字同）
      if (sel !== null && ownWrite !== null && canonicalSignatureEquals(canonicalSignatureOf(sel), ownWrite)) {
        // [回炉 B-1] 一次性消费：首个精确匹配=本写的 echo，抑制后签名即失效
        //——外部后续到达同形态选区（含终局态回放）不再被吞（转发调度器）
        ownWrite = null
        return true
      }
      if (session !== null) enforce()
      return false
    },
    dispose(): void {
      document.removeEventListener('mousemove', onMouseMove)
      session = null
      ownWrite = null
    }
  }
}
