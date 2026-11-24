/**
 * [B4 L1 / 设计稿 §10.1/§10.4] use-lineage-command-state —— 活动会话命令状态投影
 * （HistoryCommandState 装配点：IO 输入读活动会话 IO、U 输入读 unfinalized；
 * 纯投影=lineage-session-model lineageCommandState 单源）。
 *
 * ── 行为层 ──
 * - saveState=aggregateSaveUiState(IO+U)：saving=任一在途写（含普通写）；failed=
 *   error 相位；dirty=U 或 Q；saved=U0 且无 IO 工作。
 * - canSave=图 ready ∧ 非冻结 ∧ 非 busy（#20 拒重复命令——finalize/history/reconcile
 *   在途禁用；普通写 saving 不置 busy）。
 * - canUndo/canRedo=栈深 ∧ 图 ready ∧ 非冻结（#12 no-op 判据；reconcile/history
 *   在途不禁用——点击按 #13d 排队不并发）。
 * - frozen=quit closing/recovery 屏障/conflict 挂起（与 store 命令入口同判据——
 *   按钮禁用不另立口径；模块级门非 React 态，随 store 其他字段变更沿重渲染）。
 * - L1 单图=唯一会话；L2 registry 化后本 hook 的 IO/U 读点切活动会话（接口不变）。
 */
import { useLineageStore } from './lineage.store'
import { conflictWaitBlocked } from './conflictResolution'
import { recoveryBlocked } from './recoveryScheduler'
import { quitWriteBlocked } from '../../app/quit-closing-gate'
import { lineageCommandState } from './lineage-session-model'
import type { HistoryCommandState } from '../../shared/history-command'

export function useLineageCommandState(): HistoryCommandState {
  const status = useLineageStore((s) => s.status)
  const saveStatus = useLineageStore((s) => s.saveStatus)
  const queueLength = useLineageStore((s) => s.queue.length)
  const inflight = useLineageStore((s) => s.inflight)
  const unfinalized = useLineageStore((s) => s.unfinalized)
  const undoDepth = useLineageStore((s) => s.undoStack.length)
  const redoDepth = useLineageStore((s) => s.redoStack.length)
  return lineageCommandState({
    graphReady: status === 'ready',
    frozen: quitWriteBlocked() || recoveryBlocked() || conflictWaitBlocked(),
    inflight,
    ioError: saveStatus === 'error',
    pending: queueLength > 0,
    unfinalized,
    undoDepth,
    redoDepth
  })
}
