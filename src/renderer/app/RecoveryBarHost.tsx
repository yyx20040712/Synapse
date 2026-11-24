/**
 * [F-VISFB-65 U7 → F-RECOV-04 → B4 L2 拆件] RecoveryBarHost —— 恢复副本确认条组合根薄壳
 * （app 组合层先例同 quit-flush/App.tsx）：装配（生产 init=recovery-host-ports.buildRecoverySchedulerInit：registry 快照/两谓词
 * 分流/owner keyed 源；确认框承载=本件 useState/ref）+ws-entry 屏障接线（boot/切上下文
 * peek——currentId 空窗跳过等清单落定）+确认条渲染。StrictMode 双挂载幂等。
 * 确认条渲染：呈现拆件=RecoveryBar；文案单源=recovery-decision-view。
 */
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useWorkspaceStore } from '../features/workspaces/workspace.store'
import {
  discardRecoverySlot,
  deferRecoverySlot,
  enterWorkspaceRecovery,
  getRecoveryState,
  initRecoveryScheduler,
  reopenRecoveryBar,
  restoreRecoverySlot,
  subscribeRecoveryState,
  type RestoreDecision
} from '../features/lineage/recoveryScheduler'
import { buildRecoverySchedulerInit, bindRecoveryFolderRemovedHook } from '../features/lineage/recovery-host-ports'
import { restoreDecisionView } from '../features/lineage/recovery-decision-view'
import { RecoveryBar } from '../features/recovery/RecoveryBar'
import { RecoveryRestoreDialog } from '../features/recovery/RecoveryRestoreDialog'

export function RecoveryBarHost(): JSX.Element | null {
  const wsCurrentId = useWorkspaceStore((s) => s.currentId)
  const wsError = useWorkspaceStore((s) => s.error)
  // [F-RECOV-04] 决策确认框状态（entry askRestoreDecision 回调承载——resolve 经 ref
  // 直连，避 setState updater 副作用；呈现拆件=RecoveryRestoreDialog）
  const [ask, setAsk] = useState<RestoreDecision | null>(null)
  const askResolveRef = useRef<((v: boolean) => void) | null>(null)
  const askRestoreDecision = (decision: RestoreDecision): Promise<boolean> =>
    new Promise<boolean>((resolve) => {
      askResolveRef.current = resolve
      setAsk(decision)
    })
  const settleAsk = (v: boolean): void => {
    setAsk(null)
    const resolve = askResolveRef.current
    askResolveRef.current = null
    resolve?.(v)
  }

  useEffect(() => {
    initRecoveryScheduler(buildRecoverySchedulerInit(askRestoreDecision, { workspaceId: () => useWorkspaceStore.getState().currentId }))
    bindRecoveryFolderRemovedHook() // [B4 L2 §8.4 行 11] 后台删夹 owner 钩
  }, [])

  // ws-entry 屏障：触发只认 wsCurrentId 变化（boot/切回）；[回炉轮2 Z5]
  // wsError 仅在 currentId 尚空（首次未读到）时参与放行——编辑中 wsError
  // null↔串迁移不重入屏障（gen++/冻结/peek 旧副本覆盖较新内存态封死）；
  // [回炉 W9] 首读失败态（currentId 空+error 非空）进屏障=fail-open 不恒冻结
  const enteredWsIdRef = useRef<string | null>(null)
  useEffect(() => {
    const firstReadPending = wsCurrentId === ''
    if (firstReadPending && wsError === null) return
    if (!firstReadPending && enteredWsIdRef.current === wsCurrentId) return
    enteredWsIdRef.current = wsCurrentId
    void enterWorkspaceRecovery()
  }, [wsCurrentId, wsError])

  const state = useSyncExternalStore(subscribeRecoveryState, getRecoveryState)
  const view = ask !== null ? restoreDecisionView(ask) : null
  const dialog =
    view !== null ? (
      <RecoveryRestoreDialog title={view.title} lines={view.lines} confirmLabel={view.confirmLabel} danger={view.danger} onSettle={settleAsk} />
    ) : null
  if (state.phase === 'idle' || state.phase === 'checking') return dialog
  return (
    <>
      <RecoveryBar
        state={state}
        onRestore={() => void restoreRecoverySlot()}
        onDiscard={() => void discardRecoverySlot()}
        onDefer={deferRecoverySlot}
        onReopen={reopenRecoveryBar}
      />
      {dialog}
    </>
  )
}
