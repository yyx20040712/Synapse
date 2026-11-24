/**
 * [B4 L1 / 设计稿 §2.4/§10.1/§10.4/§11.2] lineage-command-state-model —— 脉络会话的
 * 命令状态纯投影（[回炉 W-D2a·T-B05] 自 lineage-session-model 外移成件：model 件行数超
 * 设计稿预算，按 r-tests/note.md 表四切面拆件——isLineageBusy/lineageIoPhase/
 * lineageCommandState 及其输入类型驻本件；model 留 re-export，既有导入面零改动，类型
 * 不双写）。
 *
 * ── 行为层 ──
 * - 命令状态（§10.4 HistoryCommandState）：saveState=IO+U 聚合（save-status
 *   aggregateSaveUiState 单源）；canSave=图 ready ∧ 非冻结 ∧ 非 busy；
 *   canUndo/canRedo=栈深 ∧ 图 ready ∧ 非冻结（reconcile/history 在途不禁用——
 *   点击按 #13d 排队不并发）。
 * - IO 轴、saveStatus 四态与 inflight kind 的类型定义驻 lineage-session-model（本件
 *   只做纯投影：输入=会话面的结构子集，不读全局）。
 *
 * ── 接口层 ──
 * - 类型：LineageCommandStateInput
 * - 纯函数：isLineageBusy/lineageIoPhase/lineageCommandState
 *
 * ── 架构层 ── 纯函数件：只依赖 shared 与域内类型（type-only import，零环）。
 */
import type { HistoryCommandState } from '../../shared/history-command'
import { aggregateSaveUiState } from '../../shared/save-status'
import type { LineageInflight, LineageIoPhase, LineageSaveStatus } from './lineage-session-model'

/** [§10.4] busy=finalize/history/reconcile 在途；普通写 saving 不置 */
export function isLineageBusy(inflight: LineageInflight | null): boolean {
  return inflight !== null && inflight.kind !== 'write'
}

/** [§2.3] ioPhase 派生（saving/error 原样；clean/dirty=idle——由 Q 区分） */
export function lineageIoPhase(saveStatus: LineageSaveStatus): LineageIoPhase {
  return saveStatus === 'saving' || saveStatus === 'error' ? saveStatus : 'idle'
}

export interface LineageCommandStateInput {
  /** 图读面状态（loading/error 下保存/undo/redo 禁用——不清 U，§10.1） */
  graphReady: boolean
  /** quit/closing/recovery/conflict 冻结（#12 no-op 判据） */
  frozen: boolean
  inflight: LineageInflight | null
  /** error 相位=无在途时的可重试 IO 错误 */
  ioError: boolean
  pending: boolean
  unfinalized: boolean
  undoDepth: number
  redoDepth: number
}

/** [§10.4] 命令状态投影（纯函数——保存钮/撤销重做钮/B5·B6 订阅面单源） */
export function lineageCommandState(input: LineageCommandStateInput): HistoryCommandState {
  const busy = isLineageBusy(input.inflight)
  const writing = input.inflight !== null
  const enabled = input.graphReady && !input.frozen
  return {
    saveState: aggregateSaveUiState({ busy: writing, error: input.ioError, pending: input.pending, unfinalized: input.unfinalized }),
    canSave: enabled && !busy,
    canUndo: enabled && input.undoDepth > 0,
    canRedo: enabled && input.redoDepth > 0,
    busy
  }
}
