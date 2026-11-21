/**
 * [F-VISFB-65 U7 → F-RECOV-04] RecoveryBarHost —— 恢复副本确认条组合根（app 组合
 * 层先例同 quit-flush/App.tsx）：调度器装配（快照源=store 现值+草稿注册族；恢复
 * 载入/水化/路由注入）+[F-RECOV-04] 宿主钩子装配（未落定写谓词/落定 flush/
 * 预检读面/决策确认框——entry 经可选钩子回调）+确认框文案单源
 * restoreDecisionView（[回炉 B-1] 自 feature Dialog 拆件上移——lineage 状态
 * 读取只驻本件，展示件纯 props）+ws-entry 屏障接线（boot/切上下文 peek——
 * currentId 空窗跳过等清单落定）+确认条渲染。StrictMode 双挂载幂等。
 */
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { api, unwrap } from '../api/client'
import { useWorkspaceStore } from '../features/workspaces/workspace.store'
import { useLineageStore } from '../features/lineage/lineage.store'
import {
  fireLineageNoteCommit,
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
  subscribeRecoveryState,
  type RestoreDecision
} from '../features/lineage/recoveryScheduler'
import {
  buildPreflightView,
  preflightRestorePayload
} from '../features/lineage/recovery-restore-preflight'
// [回炉 W5] 放弃分支清恢复态 store（再保存不复活已弃会话）
import { requestOpenLineage } from '../shared/open-lineage-bus'
import { RecoveryBar } from '../features/recovery/RecoveryBar'
import { RecoveryRestoreDialog } from '../features/recovery/RecoveryRestoreDialog'

/** 恢复后派生面拉取（乐观三面不覆盖——store.applyDerivedFields 单源） */
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

/** [回炉 B-1] 决策确认框文案单源（RestoreDecision+落定计数→呈现面；对话框
 *  机制与按钮排布驻 RecoveryRestoreDialog 纯 props 件）。confirmLabel=null=
 *  通知型（单「好」钮——预检不可用，终裁②阻断态）。 */
function restoreDecisionView(d: RestoreDecision): {
  title: string
  lines: string[]
  confirmLabel: string | null
  danger: boolean
} {
  if (d.kind === 'discard') {
    const n = `该副本含待保存动作 ${d.actionCount}${d.draftPresent ? '（含未收口草稿）' : ''}，放弃后不可恢复。`
    return { title: '放弃恢复副本？', lines: [n, '放弃后，新的编辑将重新受副本保护。'], confirmLabel: '放弃副本', danger: true }
  }
  if (d.kind === 'settle-replace') {
    // 终裁⑥复审修正版：先落定后单次替换确认（落定成功才进本框——计数=落定步
    // 已收口量，含经既有 commit 入口收口的草稿）
    const draft = d.savedDraft ? '及一份未收口草稿' : ''
    return {
      title: '恢复副本并替换当前图？',
      lines: [
        `已保存当前 ${d.savedActions} 项修改${draft}。`,
        '恢复将用副本替换当前图；未包含在副本内的修改将被副本内容取代（已落库修改保留在数据库）。'
      ],
      confirmLabel: '继续恢复',
      danger: false
    }
  }
  if (d.kind === 'replace') {
    return {
      title: '用副本替换当前图？',
      lines: ['恢复将用副本替换当前图；未包含在副本内的修改将被副本内容取代（已落库修改保留在数据库）。'],
      confirmLabel: '替换并恢复',
      danger: false
    }
  }
  if (d.kind === 'conflicts') {
    const lines = d.conflicts.slice(0, 6).map((c) => c.reason)
    if (d.conflicts.length > 6) lines.push(`……等共 ${d.conflicts.length} 项动作不能原样恢复`)
    if (d.replaceWarning) lines.push('继续恢复将用副本替换当前图。')
    return { title: '部分动作无法原样恢复', lines, confirmLabel: '仍要恢复', danger: false }
  }
  return {
    title: '无法预检恢复副本',
    lines: ['恢复前的冲突预检未能读取当前库态，暂不执行恢复；可稍后重试恢复。'],
    confirmLabel: null,
    danger: false
  }
}

export function RecoveryBarHost(): JSX.Element | null {
  const wsCurrentId = useWorkspaceStore((s) => s.currentId)
  const wsError = useWorkspaceStore((s) => s.error)
  // [F-RECOV-04] 决策确认框状态（entry askRestoreDecision 回调承载——resolve 经
  // ref 直连，避 setState updater 副作用；呈现拆件=RecoveryRestoreDialog）
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
    initRecoveryScheduler({
      workspaceId: () => useWorkspaceStore.getState().currentId,
      // 快照源：clean 会话且无草稿=null（未编辑会话零恢复面写——§4）
      snapshot: () => {
        const s = useLineageStore.getState()
        const draft = noteDraftSnapshot()
        if (s.saveStatus === 'clean' && draft === null) return null
        return {
          folderId: s.folderId,
          graph: { nodes: s.nodes, edges: s.edges, lineTypeNames: s.lineTypeNames, floatingNotes: s.floatingNotes },
          queue: s.queue,
          draft
        }
      },
      loadPayload: (p) => useLineageStore.getState().applyRecoverySession(p),
      // 载入+接管完成后再水化草稿（§5——去重判据+noteId 不在图归新笔记）；
      // [回炉 W1] 同沿拉 graph 派生三面（失败容错=缺省，下次 load 自愈）
      onRestored: (p) => {
        const plan = planDraftRehydration(p)
        if (plan !== null) stashRestoreDraft(plan)
        void refreshDerivedFields(p.folderId)
      },
      openLineageView: () => requestOpenLineage(),
      discardLoadedSession: () => useLineageStore.getState().discardSession(),
      // [F-RECOV-04] 覆盖守卫判定源（queue 非空∨草稿在∨flushing——§3.4 单源）
      hasUnsettledWrites: () => {
        const s = useLineageStore.getState()
        return s.queue.length > 0 || s.flushing || noteDraftSnapshot() !== null
      },
      // [回炉 B-2] 落定（终裁⑥复审修正序：草稿经既有 commit 入口转队列+save()；
      // 落定四条件核验在此——clean∧!flushing∧queue 空∧草稿无，flushing 窗 save()
      // 早退不再误判成功；返回已收口计数供确认文案「已保存当前 N 项修改」）
      settleUnsettledWrites: async () => {
        const pre = useLineageStore.getState()
        const preDraft = noteDraftSnapshot()
        fireLineageNoteCommit() // 草稿经既有 commit 入口转队列（开门由 entry 落定步承担）
        await useLineageStore.getState().save()
        const s = useLineageStore.getState()
        const committed = preDraft !== null && noteDraftSnapshot() === null
        return {
          ok: s.saveStatus === 'clean' && !s.flushing && s.queue.length === 0 && noteDraftSnapshot() === null,
          savedActions: pre.queue.length + (committed ? 1 : 0),
          savedDraft: preDraft !== null
        }
      },
      // [F-RECOV-04 件五] 预检装配（graph/folders 读面→纯数据清单；失败=read-failed）
      runRestorePreflight: async (payload) => {
        try {
          const [graph, folders] = await Promise.all([
            unwrap(api.lineage.graph({ folderId: payload.folderId })),
            unwrap(api.folders.list({}))
          ])
          return {
            kind: 'ran',
            conflicts: preflightRestorePayload(payload, buildPreflightView(graph, folders.map((f) => f.id)))
          }
        } catch {
          return { kind: 'read-failed' }
        }
      },
      askRestoreDecision
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
  const view = ask !== null ? restoreDecisionView(ask) : null
  const dialog =
    view !== null ? (
      <RecoveryRestoreDialog
        title={view.title}
        lines={view.lines}
        confirmLabel={view.confirmLabel}
        danger={view.danger}
        onSettle={settleAsk}
      />
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
