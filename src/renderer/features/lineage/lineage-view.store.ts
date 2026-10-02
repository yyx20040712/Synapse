// b3: P7-H
/**
 * [F-LGRAPH-01①U3] lineage-view.store —— 脉络页模式态单源（zustand；
 * mockup §2.1/§2.3/§3.1——P-1/P-3/T1/T2 定案）。
 *
 * ── 态空间（宪法状态纪律）──
 * mode ∈ {edit, browse, focus}（互斥单选，页面级）× focusSet: string[]
 * （focus 模式内 toggle 多卡集——T2 再点同卡取消）× navCollapsed × navWidth
 * （导航窗格 P-17：缺省 208 可调 160–320——U4 消费）× [②U2] 编辑工具态
 * tool ∈ {select, draw-solid, draw-dashed} × currentLineColor ×
 * linetypeListOpenFor ∈ {solid, dashed, null}（A12 线型图标交互——
 * 工具态驻 view.store 申报：编辑工具选择=页面级 UI 态与模式态同域；
 * armed 持久域=页面内：切模式/切图中止回 select）。
 *
 * ── 迁移（定案）──
 * - P-1 进页缺省=browse。
 * - P-3 聚焦退出**单出口**=点浏览/编辑按钮（再点聚焦=no-op——T1 三轮裁决）
 *   →focusSet 清空；再进 focus=空集。
 * - focus 中切图=clearFocus（集清空+模式保持 focus——图域隔离，空集合法）；
 *   消费面=切图编排（setFolder 联动处）。
 * - 模式切换不丢编辑会话暂存（P-2：queue/saveStatus 驻 lineage.store 不清
 *   ——写队列天然满足，跨 store 零耦合）。
 *
 * 本件=renderer 本地 UI 态（非数据域：零 IPC——与 lineage.store 数据单源
 * 分工；「禁双取」约=window.api.lineage.graph 数据面，本件不涉）。
 */
import { create } from 'zustand'
import { LINE_TYPE_COLORS } from '@shared/models/lineage'

export type LineageViewMode = 'edit' | 'browse' | 'focus'

/** [F-LGRAPH-01②U2] 编辑工具态（§3.3——select=小手选择/draw-*=画线 armed） */
export type LineageTool = 'select' | 'draw-solid' | 'draw-dashed'

export interface LineageViewStore {
  mode: LineageViewMode
  /** 聚焦卡集（加入序；focus 模式 toggle 语义——mockup §2.3） */
  focusSet: string[]
  navCollapsed: boolean
  navWidth: number
  /** 导航窗格→画布滚动定位信号（nonce 递增=同 key 重复点击也触发） */
  navScrollTarget: { key: string; nonce: number } | null
  /** 画布→导航窗格当前视口所在月（accent 指示条数据源；Timeline 滚动上报） */
  activeFrameKey: string | null
  /** [F-LGRAPH-01②U2] 编辑工具态（A12——select 态点图标=armed；再点=取消） */
  tool: LineageTool
  /** [②U2] 当前线型色（6 色板值域——画线工具+线型图标色指示） */
  currentLineColor: string
  /** [②U2] 线型列表挂载面（null=收起；solid/dashed=挂对应图标下——A12） */
  linetypeListOpenFor: 'solid' | 'dashed' | null
  /** [②U7] 画布缩放系数（P-4：50%–200% 步进 10%——transform scale 作用于
   *  内容层内容坐标不变；缺省 1=无变换） */
  zoom: number
  /** [②U7] 步进缩放（+1/-1=放大/缩小一档；钳 0.5–2） */
  zoomStep(dir: 1 | -1): void
  /** [②U7/T9] 复位 100%（缩放角标单动作） */
  resetZoom(): void
  /** [②U2] A12 图标点击（select 态点=armed+列表展开；armed 再点同图标=取消回
   *  select+收起；armed 点另一图标=切换+列表随迁） */
  toggleLineTool(kind: 'solid' | 'dashed'): void
  /** [②U2] 列表收起（点外部/选行——armed 保持） */
  closeLinetypeList(): void
  /** [②U2] 选行：当前色变+列表收起（armed 保持——A12） */
  pickLineColor(color: string): void
  /** [②U2] 工具态中止（切模式/切图/进入 select——画线中止无残留） */
  resetTool(): void
  /** [F-LGRAPH-01②A1] 挂载 reset（P-1「进页缺省」直读：mode='browse'+focusSet
   *  清空+工具态归位——二次进页=再进页缺省；与编辑会话数据暂存[P-2]正交） */
  resetForMount(): void
  setMode(mode: LineageViewMode): void
  /** focus 模式内 toggle：加入/移出（非 focus 态 no-op） */
  toggleFocus(nodeId: string): void
  /** 图域隔离（切图消费方调用）：集清空+模式保持 */
  clearFocus(): void
  setNavCollapsed(collapsed: boolean): void
  /** 钳 160–320（P-17 边界——越界回落边界值） */
  setNavWidth(width: number): void
  /** 时间线索引点击（画布滚动定位——Timeline 消费） */
  requestFrameScroll(frameKey: string): void
  /** [回炉 R11] 定位消费方清空（不驻留——Timeline 定位 effect 调用） */
  clearNavScrollTarget(): void
  setActiveFrameKey(frameKey: string | null): void
}

/** P-17 导航窗格宽域（消费面=setNavWidth 钳制+nav-pane-prefs 写时钳——单源） */
export const NAV_WIDTH_MIN = 160
export const NAV_WIDTH_MAX = 320
export const NAV_WIDTH_DEFAULT = 208

export const useLineageViewStore = create<LineageViewStore>()((set, get) => ({
  mode: 'browse', // P-1 进页缺省
  focusSet: [],
  navCollapsed: false,
  navWidth: NAV_WIDTH_DEFAULT,
  navScrollTarget: null,
  activeFrameKey: null,
  tool: 'select', // [②U2] 缺省小手选择
  currentLineColor: LINE_TYPE_COLORS[0], // [②U2] 缺省色板首色（蓝）
  linetypeListOpenFor: null,
  zoom: 1, // [②U7] 100%=无变换

  zoomStep(dir) {
    // [②U7/P-4] 步进 10%（0.1 浮点累加误差→按档位取整：Math.round(z*10)±1；
    // 钳域 5–20 档=50%–200%）
    const step = Math.round(get().zoom * 10) + dir
    set({ zoom: Math.max(5, Math.min(20, step)) / 10 })
  },

  resetZoom() {
    set({ zoom: 1 })
  },

  setMode(mode) {
    if (mode === get().mode) return // T1：再点当前模式段=no-op（聚焦保持——单出口唯浏览/编辑）
    set({
      mode,
      // P-3：退出聚焦（→browse/edit）即清空；再进=空集
      focusSet: get().mode === 'focus' && mode !== 'focus' ? [] : get().focusSet,
      // [②U2] 模式切换=工具态中止（armed 中止无残留——§2.4；页面级 UI 态
      // 归位 select+列表收起）
      tool: 'select',
      linetypeListOpenFor: null
    })
  },

  toggleLineTool(kind) {
    const cur = get().tool
    const curKind = cur === 'draw-solid' ? 'solid' : cur === 'draw-dashed' ? 'dashed' : null
    if (curKind === kind) {
      // P-19：armed 再点同图标=取消回选择+列表收起
      set({ tool: 'select', linetypeListOpenFor: null })
      return
    }
    set({ tool: kind === 'solid' ? 'draw-solid' : 'draw-dashed', linetypeListOpenFor: kind })
  },

  closeLinetypeList() {
    set({ linetypeListOpenFor: null }) // armed 保持（A12——点外部收起不撤 armed）
  },

  pickLineColor(color) {
    set({ currentLineColor: color, linetypeListOpenFor: null }) // 选行=变色+收起（armed 保持）
  },

  resetTool() {
    set({ tool: 'select', linetypeListOpenFor: null })
  },

  resetForMount() {
    // [②A1] 挂载恒走（不与数据暂存互斥——P-2 脏态跳过面仅数据同步，view 态
    // reset 恒定；navWidth/navCollapsed 个性化记忆不随挂载重置——P-17 语义）
    set({ mode: 'browse', focusSet: [], tool: 'select', linetypeListOpenFor: null })
  },

  toggleFocus(nodeId) {
    if (get().mode !== 'focus') return // 模式级语义（非 focus 态不收）
    const cur = get().focusSet
    set({ focusSet: cur.includes(nodeId) ? cur.filter((id) => id !== nodeId) : [...cur, nodeId] })
  },

  clearFocus() {
    set({ focusSet: [] }) // 模式保持（切图≠退出聚焦模式——mockup §2.7）
  },

  setNavCollapsed(collapsed) {
    set({ navCollapsed: collapsed })
  },

  setNavWidth(width) {
    set({ navWidth: Math.min(NAV_WIDTH_MAX, Math.max(NAV_WIDTH_MIN, width)) })
  },

  requestFrameScroll(frameKey) {
    const prev = get().navScrollTarget
    set({ navScrollTarget: { key: frameKey, nonce: (prev?.nonce ?? 0) + 1 } })
  },

  clearNavScrollTarget() {
    set({ navScrollTarget: null }) // [回炉 R11] 消费即清（重挂载不重播）
  },

  setActiveFrameKey(frameKey) {
    if (get().activeFrameKey !== frameKey) set({ activeFrameKey: frameKey })
  }
}))
