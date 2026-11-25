// b3: P7-H
/**
 * [F-LGRAPH-01①U3] lineage-view.store —— 脉络页模式态单源（zustand；
 * mockup §2.1/§2.3/§3.1——P-1/P-3/T1/T2 定案；[B5 设计稿 §2.2 全表、§14] P-1/P-3
 * 翻案——见「迁移」节）。
 *
 * ── 态空间（宪法状态纪律）──
 * mode ∈ {edit, browse, focus}（互斥单选，页面级）× focusSet: string[]
 * （focus 模式内 toggle 多卡集——T2 再点同卡取消；[B4 L2 §2.3/§14 终裁 2]
 * **按 folder 挂起**：本件的 focusSet=活动会话聚焦集的存储/适配面，切图时由
 * lineage-session-registry 挂起到离场会话、返回时恢复——切图不清其他图；课题
 * 切换全清；页面切换保留）× navCollapsed × navWidth
 * （导航窗格 P-17：缺省 208 可调 160–320——U4 消费）× [F-UIRES-03 C1] 编辑
 * 工具态三维正交：tool ∈ {select, draw-solid, draw-dashed} × paletteFor ∈
 * {null, solid, dashed}（kind 归属维——色板挂载面）× currentLineColor:
 * LineTypeColorPair（per-kind 双值——INV-108 线色双值）。[F-VISFB-66 裁定 2]
 * 点两卡链锚维（C2·P5 迁驻态族）已随唯一建边径=锚点显式拖拽整体退役删除
 * （锚维写口/清锚写点/源卡高亮消费链同批消亡）。
 *
 * ── 迁移（C1 状态机——设计稿 v1.9 §2 C1）──
 * - select+点 kind 图标→draw-X 且 paletteFor 归 null（切模式即收板——
 *   delta-W5 防「虚线模式开实线色板」错位态）；draw-X+点另一 kind 图标→
 *   draw-Y 且 paletteFor 归 null；draw-X+再点同图标=无操作〔N9 非双击退出〕。
 * - 任意 tool+点 kind K 展开钮→paletteFor=K（toggle：再点同钮→null）。
 * - paletteFor=K+点色行→paletteFor=null+写 currentLineColor[K]（per-kind
 *   独立互不影响——INV-108；localStorage 双键持久化，读写钳回色板值域）。
 * - Esc 分层退出（delta-W3a→[F-VISFB-66 删锚层后两层面层序）：INPUT/IME
 *   （原生优先）＞菜单层（EdgeMenu 两态+LineageNodeMenu 自治 Esc，单口让
 *   路）＞paletteFor≠null 只关板＞退画线（→select）——键盘接线=use-lineage-
 *   esc（edit 模式+输入焦点外+菜单让路探测；E-ESC-01：armed idle Esc 单层
 *   直达〔锚层删除后〕；dragging 期 Esc=**取消会话且工具保持**〔R19 终裁
 *   翻案——会话级一次性消费，不达本单口〕）。
 * - 挂载（[B5 设计稿 §2.2 #1/#2/#5、§14 决策 1] 原 P-1「进页缺省 browse」退役）：仅应用
 *   冷启动缺省 browse；resetForMount 只收 tool/paletteFor，**不读写 mode/focusSet**——页面
 *   卸载、重挂、folder 切换保留 mode（跨视图、跨图的工作上下文不丢；色值同理不重置）。
 *   挂载流程对活动集合的恒等防御剪枝属 registry 的活动投影同步口，不塞回本 action。
 * - 模式切换（[B5 §2.2 #6-#8、§14 决策 2] 原 P-3「退出聚焦清集」退役）：不同模式切换保
 *   focusSet（edit↔browse↔focus 全组合不清——再进 focus 恢复同一集合，不重建第二份），
 *   工具态归 select/null；同值 setMode=完全 no-op（集合与工具态均不变——T1 再点聚焦
 *   no-op 沿承）。
 * - 清空聚焦=唯一用户显式清空当前图的入口（LineageFocusClearButton——点击后停留 focus，
 *   空聚焦合法）；clearFocus 动作本身不带模式语义。
 * - focus 中切图=显示目标图自身的聚焦集（模式保持 focus——图域隔离，空集
 *   合法）；clearFocus=显式清空，只清当前图（恢复载入/ghost 降级消费面）。集合成员
 *   有效性（只含该图现存 id）由 registry 的图态写点剪枝保证（[B5 §5]）——本件不扫 nodes。
 * - 课题切换成功=resetForWorkspace：mode 归 browse、集合清空、工具态归位（[B5 §2.2 #26、
 *   §14 决策 3]；navWidth/线色/zoom 驻留不变——INV-177）；切换失败保留旧态（#25）。
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
  /** [F-UIRES-03 C1→F-VISFB-66] Esc 分层退出单口（两层面层序——锚层随点两卡
   *  链退役删）：paletteFor≠null 只关板→退画线（→select）；菜单层让路探测
   *  驻接线层（use-lineage-esc——store 零 DOM）。键盘接线=LineagePage */
  escapeStep(): void
  /** [②U2] 工具态中止（切模式/切图/进入 select——画线中止无残留） */
  resetTool(): void
  /** [F-LGRAPH-01②A1] 挂载 reset（[B5 设计稿 §2.2 #5、§14 决策 1——原 P-1 翻案] 只收 tool/paletteFor：
   *  不读写 mode/focusSet——页面切换保留模式与聚焦集，mode 记忆即此；[B4 L2 §2.5 #30] 沿承；
   *  [C1] per-kind 色不随挂载重置——跨挂载驻留同 P-17 语义） */
  resetForMount(): void
  /** [B5 设计稿 §2.2 #26、§5.2] 课题切换复位（独立动作——不复用 resetForMount，否则 mode 不复位）：
   *  mode 归 browse、focusSet 清空、工具态归位；navWidth/线色/zoom 驻留不变（INV-177） */
  resetForWorkspace(): void
  /** [B5 设计稿 §2.2 #6-#8——原 P-3 翻案] 不同模式切换保 focusSet、工具态归位；同值=完全 no-op */
  setMode(mode: LineageViewMode): void
  /** focus 模式内 toggle：加入/移出（非 focus 态 no-op） */
  toggleFocus(nodeId: string): void
  /** 显式清空当前图的聚焦集（模式保持；只清活动图——其他图驻留） */
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
    if (mode === get().mode) return // T1：再点当前模式段=完全 no-op（集合与工具态均不变）
    // [B5 设计稿 §2.2 #7——原 P-3「退出聚焦即清集」翻案] 不同模式切换保集合（focusSet 不动）；
    // [F-UIRES-03 C1] 模式切换=工具态中止（armed/色板无残留——§2.4 沿承）
    set({ mode, tool: 'select', paletteFor: null })
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
      set({ paletteFor: null }) // Esc 分层①：只关板（画线态保持）
      return
    }
    set({ tool: 'select' }) // Esc 分层②：退画线（→select）——[F-VISFB-66] 锚层删除后单层直达（E-ESC-01）
  },

  resetTool() {
    set({ tool: 'select', paletteFor: null })
  },

  resetForMount() {
    // [②A1] 挂载恒走（不与数据暂存互斥——P-2 脏态跳过面仅数据同步，view 态
    // reset 恒定；navWidth/navCollapsed 个性化记忆不随挂载重置——P-17 语义；
    // [C1] currentLineColor 同驻留——localStorage 单源）
    // [B4 L2 §2.5 #30/§12.2] focusSet 不随挂载清：页面切换保留（注册表挂起图同）
    // [B5 设计稿 §2.2 #5/§14 决策 1] mode 同样不随挂载覆写（原 P-1「进页缺省 browse」退役）——
    // 本 action 只收工具态；活动集合的恒等防御剪枝=registry 的活动投影同步口
    set({ tool: 'select', paletteFor: null })
  },

  resetForWorkspace() {
    // [B5 设计稿 §2.2 #26/§5.2] 课题切换成功：全部集合清空并归 browse（新课题不带旧 id）、工具态归位；
    // navWidth/线色/zoom 驻留不变（INV-177）
    set({ mode: 'browse', focusSet: [], tool: 'select', paletteFor: null })
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
