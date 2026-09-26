/**
 * [T3-P2] rail-shared —— Rail/WsRailPopover 共享常量与动作型收口（防
 * Rail↔WsRailPopover 相互 import 的环）。
 */
import { ApiClientError } from '../api/client'
import { showToast } from '../shared/ui/Toast'
import { OP_FAILED } from '../shared/ui-constants'

/** [T3-P2] 课题色点 6 色轮转调色板（索引 i%6——族源 token 随主题换肤） */
export const WS_DOT_PALETTE: readonly string[] = [
  'var(--accent)',
  'var(--sub2)',
  'var(--signal)',
  'var(--ok)',
  'var(--warn)',
  'var(--faint)'
]

/** [T3-P2] 下载占位文案（A8——mockup L766 逐字） */
export const DL_TOAST_TEXT = '文献搜索与下载引擎 · 规划中（未实现）'

/** 动作型失败 toast（动作型上抛契约的组件侧收口——WorkspaceSwitcher 先例） */
export function railOpFailedToast(e: unknown): void {
  showToast(e instanceof ApiClientError ? e.message : OP_FAILED, 'error')
}
