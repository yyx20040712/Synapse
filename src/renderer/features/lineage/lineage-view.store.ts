// b3: P7-H
/**
 * [F-LGRAPH-01①U3] lineage-view.store —— 脉络页模式态单源（zustand；
 * mockup §2.1/§2.3/§3.1——P-1/P-3/T1/T2 定案）。
 *
 * ── 态空间（宪法状态纪律）──
 * mode ∈ {edit, browse, focus}（互斥单选，页面级）× focusSet: string[]
 * （focus 模式内 toggle 多卡集——T2 再点同卡取消）× navCollapsed × navWidth
 * （导航窗格 P-17：缺省 208 可调 160–320——U4 消费）× [F-UIRES-03 C1] 编辑
 * 工具态三维正交：tool ∈ {select, draw-solid, draw-dashed} × paletteFor ∈
 * {null, solid, dashed}（kind 归属维——色板挂载面）× currentLineColor:
 * LineTypeColorPair（per-kind 双值——INV-108 线色双值）× [F-UIRES-03 C2·P5]
 * anchor ∈ {null, picked(nodeId)}（点两卡连边链第一卡——**迁驻本件**〔C1
 * 「驻 useDrawLine 现域」设计修订：escapeStep 单口须触达清锚+document 双
 * 监听注册序=脆弱面禁用〕；高亮消费=TimelineYears .link-src，容器经订阅
 * 直读；写点收敛=setDrawAnchor 单口+resetTool/setMode/resetForMount 沿承
 * 清——useDrawLine 下降沿清锚 effect 随迁退役）。
 *
 * ── 迁移（C1 状态机——设计稿 v1.9 §2 C1）──
 * - select+点 kind 图标→draw-X 且 paletteFor 归 null（切模式即收板——
 *   delta-W5 防「虚线模式开实线色板」错位态）；draw-X+点另一 kind 图标→
 *   draw-Y 且 paletteFor 归 null；draw-X+再点同图标=无操作〔N9 非双击退出〕。
 * - 任意 tool+点 kind K 展开钮→paletteFor=K（toggle：再点同钮→null）。
 * - paletteFor=K+点色行→paletteFor=null+写 currentLineColor[K]（per-kind
 *   独立互不影响——INV-108；localStorage 双键持久化，读写钳回色板值域）。
 * - Esc 分层退出（delta-W3a→[C2·P5] 全局面层序扩）：INPUT/IME（原生优先）
 *   ＞菜单层（EdgeMenu 两态+LineageNodeMenu 自治 Esc，单口让路）＞paletteFor
 *   ≠null 只关板＞anchor≠null 只清锚（tool 保持=连画域不退）＞退画线
 *   （→select）——键盘接线=use-lineage-esc（edit 模式+输入焦点外+菜单让路
 *   探测）。
 * - P-1 进页缺省=browse（resetForMount：色值不重置——per-kind 色跨挂载驻留）。
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
import { LINE_TYPE_COLORS, type LineTypeColorPair } from '@shared/models/lineage'

export type LineageViewMode = 'edit' | 'browse' | 'focus'

/** [F-LGRAPH-01②U2] 编辑工具态（§3.3——select=小手选择/draw-*=画线 armed） */
export type LineageTool = 'select' | 'draw-solid' | 'draw-dashed'

/** [F-UIRES-03 C1] 线型 kind（实/虚——paletteFor 归属维+per-kind 色键） */
export type LineTypeKind = 'solid' | 'dashed'

/** [F-UIRES-03 C1] per-kind 色持久化键前缀（B4 裁定冒号键形——synapse:
 *  splitpane/synapse:sidebar 仓惯例先例；完整键=前缀+kind） */
const COLOR_STORAGE_PREFIX = 'synapse:linetype:color:'

/** 读写钳制：值须在色板值域内，非法/缺省回落 LINE_TYPE_COLORS[0]（同 kind 缺省） */
function clampPaletteColor(value: string | null): string {
  return value !== null && (LINE_TYPE_COLORS as readonly string[]).includes(value)
    ? value
    : LINE_TYPE_COLORS[0]
}

/** 读面：localStorage 双键→per-kind 对（disabled/异常=缺省回落——容错不炸） */
function loadStoredColorPair(): LineTypeColorPair {
  let solid: string | null = null
  let dashed: string | null = null
  try {
    solid = window.localStorage.getItem(`${COLOR_STORAGE_PREFIX}solid`)
    dashed = window.localStorage.getItem(`${COLOR_STORAGE_PREFIX}dashed`)
  } catch {
    // localStorage 不可用（隐私态等）=缺省回落
  }
  return { solid: clampPaletteColor(solid), dashed: clampPaletteColor(dashed) }
}

/** 写面：单键持久化（选色行消费——钳制后值恒在域内） */
function storeColor(kind: LineTypeKind, color: string): void {
  try {
    window.localStorage.setItem(`${COLOR_STORAGE_PREFIX}${kind}`, color)
  } catch {
    // 写失败=会话内仍生效（下次启动回落缺省——可接受）
  }
}

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
  /** [F-UIRES-03 C1] 编辑工具态（点图标=进 draw-X；draw-X 再点同图标=no-op〔N9〕） */
  tool: LineageTool
  /** [F-UIRES-03 C1] per-kind 当前线色（INV-108 线色双值：solid/dashed 独立
   *  互不影响——6 色板值域；localStorage 双键持久化） */
  currentLineColor: LineTypeColorPair
  /** [F-UIRES-03 C1] 色板挂载归属维（null=收起；solid/dashed=挂对应展开钮
   *  锚槽——列表渲染单例随迁） */
  paletteFor: LineTypeKind | null
  /** [F-UIRES-03 C2·P5] 点两卡连边锚（picked nodeId；null=none——useDrawLine
   *  写面经 setDrawAnchor 单口；kind 切换不清/resetTool·setMode 清/Esc 层
   *  序锚层清） */
  anchor: string | null
  /** [F-UIRES-03 C2·P5] 锚维单口写（null=清锚） */
  setDrawAnchor(id: string | null): void
  /** [②U7] 画布缩放系数（P-4：50%–200% 步进 10%——transform scale 作用于
   *  内容层内容坐标不变；缺省 1=无变换） */
  zoom: number
  /** [②U7] 步进缩放（+1/-1=放大/缩小一档；钳 0.5–2） */
  zoomStep(dir: 1 | -1): void
  /** [②U7/T9] 复位 100%（缩放角标单动作） */
  resetZoom(): void
  /** [F-UIRES-03 C1] 图标本体点击：进/切 draw-X 且 paletteFor 归 null（切模式
   *  即收板——delta-W5）；draw-X 再点同图标=无操作〔N9——退出径=小手钮/Esc〕 */
  toggleLineTool(kind: LineTypeKind): void
  /** [F-UIRES-03 C1] 展开钮点击：paletteFor toggle（同钮→null；异钮→随迁） */
  togglePalette(kind: LineTypeKind): void
  /** [F-UIRES-03 C1] 点外部收板（该次点击不吞——事件正常路由；tool 不动） */
  closePalette(): void
  /** [F-UIRES-03 C1] 选色行：写 currentLineColor[kind]（per-kind）+paletteFor
   *  归 null+localStorage 持久化 */
  pickLineColor(kind: LineTypeKind, color: string): void
  /** [F-UIRES-03 C1→C2·P5] Esc 分层退出单口（全局面层序）：paletteFor≠null
   *  只关板→anchor≠null 只清锚（tool 保持）→退画线（→select）；菜单层让路
   *  探测驻接线层（use-lineage-esc——store 零 DOM）。键盘接线=LineagePage */
  escapeStep(): void
  /** [②U2] 工具态中止（切模式/切图/进入 select——画线中止无残留） */
  resetTool(): void
  /** [F-LGRAPH-01②A1] 挂载 reset（P-1「进页缺省」直读：mode='browse'+focusSet
   *  清空+工具态归位——二次进页=再进页缺省；与编辑会话数据暂存[P-2]正交；
   *  [C1] per-kind 色不随挂载重置——跨挂载驻留同 P-17 语义） */
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
  currentLineColor: loadStoredColorPair(), // [F-UIRES-03 C1] per-kind（读面钳制）
  paletteFor: null,
  anchor: null, // [F-UIRES-03 C2·P5] 点两卡链锚（迁驻）
  zoom: 1, // [②U7] 100%=无变换

  setDrawAnchor(id) {
    if (get().anchor !== id) set({ anchor: id })
  },

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
      // [F-UIRES-03 C1] 模式切换=工具态中止（armed/色板无残留——§2.4 沿承）；
      // [C2·P5] 锚随画线域退出清（写点收敛 store 动作）
      tool: 'select',
      paletteFor: null,
      anchor: null
    })
  },

  toggleLineTool(kind) {
    // [F-UIRES-03 C1] draw-X 再点同图标=无操作〔N9——非双击退出〕
    if (get().tool === (kind === 'solid' ? 'draw-solid' : 'draw-dashed')) return
    // 切模式即收板（delta-W5：防「虚线模式开实线色板」错位态）
    set({ tool: kind === 'solid' ? 'draw-solid' : 'draw-dashed', paletteFor: null })
  },

  togglePalette(kind) {
    set({ paletteFor: get().paletteFor === kind ? null : kind })
  },

  closePalette() {
    set({ paletteFor: null }) // tool 不动（点外部收板=伴随效果）
  },

  pickLineColor(kind, color) {
    const safe = clampPaletteColor(color) // 钳回色板值域（防御面）
    storeColor(kind, safe)
    set({ currentLineColor: { ...get().currentLineColor, [kind]: safe }, paletteFor: null })
  },

  escapeStep() {
    if (get().paletteFor !== null) {
      set({ paletteFor: null }) // Esc 分层①：只关板（画线态/锚保持）
      return
    }
    // [F-UIRES-03 C2·P5] Esc 分层②：锚层——只清锚（tool 保持=连画域不退）
    if (get().anchor !== null) {
      set({ anchor: null })
      return
    }
    set({ tool: 'select' }) // Esc 分层③：退画线（→select）
  },

  resetTool() {
    // [C2·P5] 锚随工具态中止清（useDrawLine 下降沿清锚 effect 随迁退役）
    set({ tool: 'select', paletteFor: null, anchor: null })
  },

  resetForMount() {
    // [②A1] 挂载恒走（不与数据暂存互斥——P-2 脏态跳过面仅数据同步，view 态
    // reset 恒定；navWidth/navCollapsed 个性化记忆不随挂载重置——P-17 语义；
    // [C1] currentLineColor 同驻留——localStorage 单源）
    set({ mode: 'browse', focusSet: [], tool: 'select', paletteFor: null, anchor: null })
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
