/**
 * [B4-A R2 §10.4/§11.1] history-command —— B5/B6 只消费的命令状态类型
 * （reader/lineage 两域共用形态；驻 renderer/shared 不 import feature——防分层倒挂）。
 *
 * ── 行为层（§10.4）──
 * - saveState：保存钮四态（IO+U 聚合——save-status.aggregateSaveUiState 单源）
 * - canSave：false=PDF 未 ready/closing 冻结/finalize-history 在途（#20 拒重复）
 * - canUndo/canRedo：#12 no-op 判据投影（栈空、PDF 未 ready、quit/closing/
 *   recovery 冻结；reconcile/history 在途不禁用——#13d 排队不并发）
 * - busy：finalize/history（及 lineage 和解）在途——仅运行中指示；普通写
 *   saving 不置 busy
 *
 * ── 接口层 ──
 * - export interface HistoryCommandState（ReaderHistoryCommands/
 *   LineageHistoryCommands 的命令实现随 reader-save-coordinator（R1 已驻）与
 *   L1 lineage 接线；本件只有状态形态——B5/B6 工具栏订阅）
 *
 * ── 架构层 ──
 * - 纯类型件（零运行时代码）；R2 消费方=reader 域命令状态投影 hook
 *   （tab-dirty.ts useReaderHistoryCommands——ReaderNotesPanel 保存钮四态）。
 */
import type { SaveUiState } from './save-status'

/** undo/redo 方向独立消费（library 只用本形状）。 */
export interface UndoCommandState {
  canUndo: boolean
  canRedo: boolean
  busy: boolean
}

/** 显式保存独立消费；saveState 是 IO+U 聚合显示态，canSave 是命令门。 */
export interface SaveCommandState {
  saveState: SaveUiState
  canSave: boolean
}

/** [B4-A R2 §10.4] B5/B6 兼容形状=两份独立状态的交集投影。 */
export type HistoryCommandState = UndoCommandState & SaveCommandState
