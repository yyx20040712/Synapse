// b3: P7-H
/**
 * [F-LGRAPH-01①U3] lineage-view.store —— 脉络页模式态单源（zustand；
 * mockup §2.1/§2.3/§3.1——P-1/P-3/T1/T2 定案）。
 *
 * ── 态空间（宪法状态纪律）──
 * mode ∈ {edit, browse, focus}（互斥单选，页面级）× focusSet: string[]
 * （focus 模式内 toggle 多卡集——T2 再点同卡取消）× navCollapsed × navWidth
 * （导航窗格 P-17：缺省 208 可调 160–320——U4 消费）。
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

export type LineageViewMode = 'edit' | 'browse' | 'focus'

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

  setMode(mode) {
    if (mode === get().mode) return // T1：再点当前模式段=no-op（聚焦保持——单出口唯浏览/编辑）
    set({
      mode,
      // P-3：退出聚焦（→browse/edit）即清空；再进=空集
      focusSet: get().mode === 'focus' && mode !== 'focus' ? [] : get().focusSet
    })
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
