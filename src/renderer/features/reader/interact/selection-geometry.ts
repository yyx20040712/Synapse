/**
 * [F-A4] selection-geometry —— 划选几何域（纯函数+常量，自 SelectionLayer 拆出
 * ——组件 ≤250 行红线预裁；票面 §3 拆件结构）。
 *
 * ── 行为层 ──
 * - closestPageRoot/pageIndexOf 自 SelectionLayer 迁入（F-02 纯函数页盒遍历，
 *   行为零变；原导出面经 SelectionLayer 再导出保持 API 零变——票面 §2）。
 * - localScale（c 面「坐标系双重放大」根治单源）：视口 px 差值 ÷ 有效 zoom
 *   归一到挂载盒本地 px。比值=el.clientWidth（CSS 本地布局 px，不含祖先
 *   zoom）/el.gBCR.width（根框视觉 px，含全部祖先 zoom 复合）——任意嵌套
 *   zoom（.app-content-row 的 ui-scale 等）自动复合，零 CSS 类耦合（不查
 *   挂载点类名——改挂载点/加档不破）。思想 crib lineage-viewport
 *   rootToLocalScale（F-L2/INV-43——源模块已随 T3-P6 SVG 画布方案退役
 *   删除，此处为历史设计指针），reader 域新写不复用跨域 import
 *   （票面 §0c 裁决）。任一量测 ≤0（未挂载/不可量测——jsdom 桩面
 *   clientWidth 恒 0）→1（防御：退化直通，不产生除零/NaN）。
 * - toolbarViewportPos：工具条视口域定位（票面 §1c）——选区上方 TOOLBAR_ABOVE
 *   常规位；选区顶距滚动容器可视区顶 <TOOLBAR_ABOVE（工具条高+间隙）时
 *   **下翻转**（放选区下方 TOOLBAR_BELOW_GAP）；随后对滚动容器可视区做
 *   **夹取**（工具条不越滚动容器）。scroller=null（无滚动容器上下文——
 *   单测桩面/非阅读器挂载）不翻转不夹取，落点=选区原生位置。
 *
 * ── 接口层 ── / ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
 * - 全纯函数零 React/DOM 写依赖（gBCR/clientWidth 只读）；组件测试：
 *   tests/unit/renderer/selection-layer.test.tsx（P1 归一）+
 *   tests/unit/renderer/selection-paint.test.tsx（c 面三态）。
 */
/** 工具条定位：估算宽度（水平夹取）与选区上方留白（F-07 既有值） */
export const TOOLBAR_WIDTH = 180
export const TOOLBAR_ABOVE = 42
/** 工具条估算高度（垂直夹取）与下翻转间隙（F-A4 c 面新增） */
export const TOOLBAR_HEIGHT = 32
export const TOOLBAR_BELOW_GAP = 8

/** 视口矩形（gBCR 口径——getBoundingClientRect 的结构化形状） */
export interface ViewportBox {
  x: number
  y: number
  width: number
  height: number
}

/** F-02：节点向上最近页盒（[data-page-root] 元素——页列渲染窗内页才有；
 *  锚定根动态遍历的纯函数，测试直测） */
export function closestPageRoot(node: Node | null): HTMLElement | null {
  let cur: Node | null = node
  while (cur !== null) {
    if (cur instanceof HTMLElement && cur.hasAttribute('data-page-root')) {
      return cur
    }
    cur = cur.parentNode
  }
  return null
}

/** F-02：页盒页号（data-page-root 值 1 基→0 基页码；缺失/非法值 null） */
export function pageIndexOf(root: HTMLElement): number | null {
  const no = Number(root.getAttribute('data-page-root'))
  return Number.isInteger(no) && no >= 1 ? no - 1 : null
}

/** 视口→挂载盒本地坐标比值（1/有效 zoom；量测退化→1 直通）。
 * [F-GEOM-01-G3] 域声明：本换算=UI 布局域（视口→挂载盒本地 px），非 PDF
 * 几何域——不参与锚定/归一化数学（INV-58 坐标域边界注；r3a 型域差防线参照） */
export function localScale(el: Element, rect?: DOMRect): number {
  const rw = (rect ?? el.getBoundingClientRect()).width
  const cw = el.clientWidth
  return rw > 0 && cw > 0 ? cw / rw : 1
}

/** 工具条视口域定位：上方常规位→近顶下翻转→滚动容器可视区夹取（纯函数） */
export function toolbarViewportPos(sel: ViewportBox, scroller: ViewportBox | null): { x: number; y: number } {
  let y = sel.y - TOOLBAR_ABOVE
  let x = sel.x
  if (scroller !== null) {
    // 下翻转：选区顶距可视区顶不足一个常规位（工具条高+间隙≈TOOLBAR_ABOVE）
    // ——放选区下方（票面 §1c「选区近顶时下翻转」）
    if (sel.y - scroller.y < TOOLBAR_ABOVE) {
      y = sel.y + sel.height + TOOLBAR_BELOW_GAP
    }
    // 视口夹取：工具条整体落在滚动容器可视区内（票面 §1c「不越滚动容器可视区」）
    const maxY = Math.max(scroller.y + scroller.height - TOOLBAR_HEIGHT, scroller.y)
    y = Math.min(Math.max(y, scroller.y), maxY)
    const maxX = Math.max(scroller.x + scroller.width - TOOLBAR_WIDTH, scroller.x)
    x = Math.min(Math.max(x, scroller.x), maxX)
  }
  return { x, y }
}

/** [F-A4 c 面] 工具条挂载盒本地落点装配：视口域定位（翻转+夹取）→÷有效 zoom
 *  归一（挂载盒在 ui-scale 缩放子树内——直写视口差会被 CSS zoom 二次放大） */
export function toolbarMountPos(pageRoot: HTMLElement, sel: ViewportBox): { x: number; y: number } {
  const mountBox = pageRoot.getBoundingClientRect()
  const scale = localScale(pageRoot, mountBox)
  const scBox = pageRoot.closest('.overflow-auto')?.getBoundingClientRect()
  const vp = toolbarViewportPos(
    sel,
    scBox === undefined ? null : { x: scBox.x, y: scBox.y, width: scBox.width, height: scBox.height }
  )
  return { x: (vp.x - mountBox.x) * scale, y: (vp.y - mountBox.y) * scale }
}

/** [B1 回炉→F-A6-c rAF 对齐] selectionchange 双路调度器（设计书 §5.2）：
 *  视觉路=首事件即排 requestAnimationFrame（leading ≤16ms——S1b 零反馈红线），
 *  已排程则不重排=帧内合帧去重（同帧多次 selectionchange 恰一次 evaluateVisual
 *  ——60Hz 上限+帧内天然合帧，取代 B1 的 200ms leading+trailing 节流[5Hz 步进
 *  =D2a 病根，取证 §7 实测 mutation 间隔 ~200ms]）；settle 路=防抖 200ms 与
 *  mouseup 即时全量逐字保持（工具条弹出语义/S1b 后半零变）。工厂返回 handler
 *  （addEventListener 直用）+cancel（mouseup/卸载成对清理——rAF 句柄与防抖
 *  双清，INV-14 同型）。rAF×React 并发面申报（设计书 §5.2）：rAF 后台/遮挡
 *  暂停影响面=隐藏态程序化选区视觉陈旧（cosmetic——Electron 单窗口+拖选需
 *  前台输入，真拖选不可触发）。 */
export function createVisualScheduler(ops: {
  onVisual(): void
  onSettled(): void
  windowMs: number
}): { handler(): void; cancel(): void } {
  let debounce: number | null = null
  let raf: number | null = null
  return {
    handler: () => {
      // 视觉路：本帧未排程才排 rAF（帧内合帧去重）；回调读当下选区=帧随动
      if (raf === null) {
        raf = window.requestAnimationFrame(() => {
          raf = null
          ops.onVisual()
        })
      }
      // settle 路：防抖（每事件重置——弹出语义零变）
      if (debounce !== null) window.clearTimeout(debounce)
      debounce = window.setTimeout(() => ops.onSettled(), ops.windowMs)
    },
    cancel: () => {
      if (debounce !== null) {
        window.clearTimeout(debounce)
        debounce = null
      }
      if (raf !== null) {
        window.cancelAnimationFrame(raf)
        raf = null
      }
    }
  }
}
