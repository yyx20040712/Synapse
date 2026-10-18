/**
 * [F-VISFB-65 U7] RecoveryBarHost —— 恢复副本确认条组合根（app 组合层——
 * 可跨 feature 聚合，quit-flush/App.tsx 同层先例；设计书 §6）。
 *
 * 职责：调度器装配（快照源=store 现值+草稿注册族；恢复载入/水化/路由注入）
 * + ws-entry 屏障接线（boot+工作区上下文变化时 peek——currentId 空窗跳过等
 * 课题清单落定）+ 确认条渲染（纯展示件=features/recovery/RecoveryBar）。
 * StrictMode 双挂载：init/enterWorkspace 均幂等（重入 peek 判废沿 generation）。
 */
import { useEffect, useRef, useSyncExternalStore } from 'react'
import { api, unwrap } from '../api/client'
import { useWorkspaceStore } from '../features/workspaces/workspace.store'
import { useLineageStore } from '../features/lineage/lineage.store'
import {
  noteDraftSnapshot,
  planDraftRehydration,
  stashRestoreDraft
} from '../features/lineage/lineage-note-draft'
import {
  discardRecoverySlot,
  deferRecoverySlot,
  enterWorkspaceRecovery,
  getRecoveryState,
  initRecoveryScheduler,
  reopenRecoveryBar,
  restoreRecoverySlot,
  subscribeRecoveryState
} from '../features/lineage/recoveryScheduler'
// [回炉 W5] 放弃分支清恢复态 store（再保存不复活已弃会话）
import { requestOpenLineage } from '../shared/open-lineage-bus'
import { RecoveryBar } from '../features/recovery/RecoveryBar'

/** [回炉 W1] 恢复后派生面拉取（乐观三面不覆盖——store.applyDerivedFields 单源） */
async function refreshDerivedFields(folderId: string): Promise<void> {
  try {
    const graph = await unwrap(api.lineage.graph({ folderId }))
    useLineageStore.getState().applyDerivedFields({
      paperMetrics: graph.paperMetrics ?? {},
      pubNos: graph.pubNos ?? {},
      tagNames: graph.tagNames ?? {}
    })
  } catch {
    // 派生面缺省——下次 load 自愈（申报：非阻塞容错）
  }
}

export function RecoveryBarHost(): JSX.Element | null {
  const wsCurrentId = useWorkspaceStore((s) => s.currentId)
  const wsError = useWorkspaceStore((s) => s.error)

  useEffect(() => {
    initRecoveryScheduler({
      workspaceId: () => useWorkspaceStore.getState().currentId,
      // 快照源：clean 会话且无草稿=null（未编辑会话零恢复面写——§4）
      snapshot: () => {
        const s = useLineageStore.getState()
        const draft = noteDraftSnapshot()
        if (s.saveStatus === 'clean' && draft === null) return null
        return {
          folderId: s.folderId,
          graph: {
            nodes: s.nodes,
            edges: s.edges,
            lineTypeNames: s.lineTypeNames,
            floatingNotes: s.floatingNotes
          },
          queue: s.queue,
          draft
        }
      },
      loadPayload: (p) => useLineageStore.getState().applyRecoverySession(p),
      // 载入+接管完成后再水化草稿（§5——去重判据+noteId 不在图归新笔记）；
      // [回炉 W1] 同沿拉 graph 派生三面（paperMetrics/pubNos/tagNames——恢复
      //  载荷不含派生数据；失败容错=缺省，下次 load 自愈）
      onRestored: (p) => {
        const plan = planDraftRehydration(p)
        if (plan !== null) stashRestoreDraft(plan)
        void refreshDerivedFields(p.folderId)
      },
      openLineageView: () => requestOpenLineage(),
      discardLoadedSession: () => useLineageStore.getState().discardSession()
    })
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
  if (state.phase === 'idle' || state.phase === 'checking') return null
  return (
    <RecoveryBar
      state={state}
      onRestore={() => void restoreRecoverySlot()}
      onDiscard={() => void discardRecoverySlot()}
      onDefer={deferRecoverySlot}
      onReopen={reopenRecoveryBar}
    />
  )
}
