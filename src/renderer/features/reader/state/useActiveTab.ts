// b3: P7-B
/**
 * [TABS-01] useActiveTab —— active tab 选择器（工单附属拆分：ReaderPage
 * 行数上限达标，与 store 同工单交付）
 *
 * ── 行为层 ── / ── 接口层 ──
 * - useActiveTab()：React hook——active tab 对象或 null（无 tab）；
 *   引用稳定（无关 tab 更新不触发重渲染——zustand selector 返回 tabs[id] 原引用）
 * - readActiveTab()：非 React 上下文的 getState 快照读（快捷键/工具栏等
 *   恒定回调内取最新 active tab，替代旧顶层字段的 s.page 直读）
 *
 * ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
 * - 纯选择器薄层，无状态无副作用；测试随 reader.store.test（消费方
 *   ReaderPage/SelectionLayer 由组件测试与 e2e 覆盖）
 */
import { useReaderStore } from './reader.store'
import type { TabState } from './reader.store'

export function useActiveTab(): TabState | null {
  return useReaderStore((s) => (s.activeId === null ? null : s.tabs[s.activeId] ?? null))
}

export function readActiveTab(): TabState | undefined {
  const s = useReaderStore.getState()
  return s.activeId === null ? undefined : s.tabs[s.activeId]
}
