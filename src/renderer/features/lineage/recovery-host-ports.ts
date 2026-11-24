/**
 * [B4 L2 / 设计稿 §8/§6.3/§11.2] recovery-host-ports —— 生产宿主装配（RecoveryBarHost
 * 组合根拆件）：registry 快照（owner keyed）、flush/替换谓词（§6.3 两谓词分流）、恢复
 * 载入/水化/路由、后台删夹 owner 钩。
 *
 * ── 行为层 ──
 * - snapshot（legacy 单会话源，probe 门控用）=首个需保护会话的快照；owner 装配后
 *   dispatch 载荷=fns.owner.sessionSnapshot(target)（§8：owner keyed 快照源）。
 * - hasUnsettledWrites（§6.3/§8.1 flush 守卫=恢复价值谓词，同源单义）：任一会话
 *   Q∨F∨草稿（草稿属活动图）。
 * - hasReplaceableSession（[回炉 W-B3·R-B5 / 用户裁决 R2] §6.3 替换守卫）：副本目标
 *   会话有 Q/F/draft、unfinalized 或 undo/redo 非空（只看目标会话——活动会话≠目标时不计；
 *   草稿属活动图、在场恒真例外）——决定恢复载入前必须替换确认。
 *   仅 U/H/R（IO clean）时流程只弹确认、不预先落定；生产装配必须接线（原缺陷：
 *   谓词有定义无消费者，IO clean 但有灰点/撤销历史的图被恢复直接替换）。
 * - settleUnsettledWrites（落定步）：提交活动图草稿（既有 commit 入口）→ 全会话
 *   flush（fire-and-forget 正道：每会话写链 save()）→ 落定核验（全 registry IO clean
 *   ∧无草稿）；返回已收口计数（确认文案「已保存当前 N 项修改」数据面）。
 *   [回炉 W-B2b] 提交未能执行而草稿仍在（落库在途被跳过／编辑器已卸载）：残留经内部
 *   settle 写路径落库（lineage-note-draft-settle）——落不了库的仍走「落定不过=停条可重试」。
 * - loadPayload/discardLoadedSession 绑定恢复目标会话（其他 folder 不动——§2.5 #39）。
 * - onRestored：草稿再水化计划+派生面拉取；openLineageView=总线路由。
 * - owner host 面（registry 读）：protectedSessions（Q∨F，草稿并入活动会话）/
 *   unlandedSessions（有未落库写的会话——chip 判据面；[回炉 W-B1·R-remap/R-B1b] 仅和解读
 *   在途不算）/generationOf/sessionSnapshot（hasUnsettledWrites 判 null）/activeFolder/
 *   setUnprotectedChip（诚实 chip）/publish（registry.recoveryOwner 单源发布）。
 * - [回炉 W-B1·R-W1] 恢复后派生面补拉按发起时的 folderId＋sessionGeneration 写回原会话
 *   （§8.3「旧图响应只回写原会话」）：发起时捕获目标 entry 与身份戳，响应经脉络域唯一
 *   准入函数（lineage-writeback-admission）复核——会话已不是活动会话照写原会话；已被
 *   替换或已消亡则丢弃。
 * - 后台删夹 owner 钩（§8.4 行 11）接线=setLineageFolderRemovedHook。
 */
import { api, unwrap } from '../../api/client'
import { useLineageStore } from './lineage.store'
import { lineageRegistry, type SessionEntry } from './lineage-session-registry'
import { admitWriteback, captureStamp, targetOf } from './lineage-writeback-admission'
import { fireLineageNoteCommit, noteDraftSnapshot, planDraftRehydration, stashRestoreDraft } from './lineage-note-draft'
import { settleNoteDraftResidual } from './lineage-note-draft-settle'
import { notifyRecoveryFolderRemoved, patchRecoveryUi, type RecoverySchedulerInit, type RestoreDecision } from './recoveryScheduler'
import { setLineageFolderRemovedHook } from './lineage-folder-reconcile'
import { hasReplaceableSession, hasUnsettledWrites } from './recovery-clean-lifecycle'
import { buildPreflightView, preflightRestorePayload } from './recovery-restore-preflight'
import { requestOpenLineage } from '../../shared/open-lineage-bus'
import type { LineageRecoveryPayload } from '@shared/recovery/schemas'

/** 恢复后派生面拉取（乐观三面不覆盖——只写派生三面）。[回炉 W-B1·R-W1] 写发起时所属的
 * 会话：不再经 store.applyDerivedFields（写「调用完成时的活动 folder」）；无会话=不读 */
async function refreshDerivedFields(folderId: string): Promise<void> {
  const entry = lineageRegistry.entry(folderId)
  if (entry === undefined) return
  const stamp = captureStamp(entry.data) // 发起时捕获身份（folderId＋sessionGeneration）
  try {
    const graph = await unwrap(api.lineage.graph({ folderId }))
    if (!admitWriteback(targetOf(entry.data, lineageRegistry.isAlive(entry)), stamp)) return // 会话已替换/消亡→丢弃
    lineageRegistry.writeEntry(entry, { paperMetrics: graph.paperMetrics ?? {}, pubNos: graph.pubNos ?? {}, tagNames: graph.tagNames ?? {} })
  } catch {
    // 派生面缺省——下次 load 自愈（申报：非阻塞容错）
  }
}

/** 有未落库写的会话键（chip 判据面——Q>0 或在途 write/flush/history；草稿并入活动会话；活动居首） */
function unlandedSessions(): string[] {
  const hasWrite = (entry: SessionEntry): boolean =>
    entry.data.queue.length > 0 || (entry.data.inflight !== null && entry.data.inflight.kind !== 'reconcile')
  const active = lineageRegistry.activeFolder()
  const rest = lineageRegistry.sessions().filter((e) => e.key !== active && hasWrite(e)).map((e) => e.key)
  const activeEntry = lineageRegistry.entry(active)
  return [...(activeEntry !== undefined && (hasWrite(activeEntry) || draftOpen()) ? [active] : []), ...rest]
}

/** 某 folder 会话的可保存快照（无待保护数据=null——§8.1 谓词同源） */
function sessionSnapshotOf(folderId: string): LineageRecoveryPayload | null {
  const entry = lineageRegistry.entry(folderId)
  if (entry === undefined) return null
  const draft = folderId === lineageRegistry.activeFolder() ? noteDraftSnapshot() : null
  if (!hasUnsettledWrites(entry.data, draft !== null)) return null
  const d = entry.data
  return {
    folderId,
    graph: { nodes: d.nodes, edges: d.edges, lineTypeNames: d.lineTypeNames, floatingNotes: d.floatingNotes },
    queue: d.queue,
    draft
  }
}

/** 草稿在场（内容快照单源——pending 布尔为其子集：桥接层同点位双写） */
const draftOpen = (): boolean => noteDraftSnapshot() !== null

/** 需保护会话（Q∨F；草稿并入活动会话——活动居首） */
function protectedSessions(): string[] {
  const list = lineageRegistry.protectedFolders()
  const active = lineageRegistry.activeFolder()
  if (draftOpen() && !list.includes(active)) return [active, ...list]
  return list
}

/** 全 registry 任一会话未落定（Q∨F∨草稿——§6.3 flush 守卫） */
function anyUnsettled(): boolean {
  if (draftOpen()) return true
  return lineageRegistry.sessions().some((e) => e.data.queue.length > 0 || e.data.inflight !== null)
}

/** [回炉 W-B3·R-B5 / 用户裁决 R2 / 设计稿 §6.3「目标会话」] 替换守卫：副本目标会话（folderId）有
 *  Q/F/draft、unfinalized 或 undo/redo 非空（hasReplaceableSession 纯函数单源）。草稿属活动图：在场即真（它同时使
 *  hasUnsettledWrites 为真——落定步先行 flush）。活动会话≠目标时不计（载入不触活动会话的 H/R/U）。
 *  无会话的 folder 不计（载入只新建会话，无可替换内容） */
function anyReplaceable(folderId: string): boolean {
  if (draftOpen()) return true
  const entry = lineageRegistry.entry(folderId)
  return entry !== undefined && hasReplaceableSession(entry.data, false)
}

export interface RecoveryHostInitPorts {
  /** 课题 id 读取（app 组合根注入——feature 件不跨域引 workspaces store） */
  workspaceId(): string
}

export function buildRecoverySchedulerInit(
  askRestoreDecision: (decision: RestoreDecision) => Promise<boolean>,
  ports: RecoveryHostInitPorts
): RecoverySchedulerInit {
  /** 恢复目标会话（loadPayload 捕获——放弃分支/discardLoadedSession 绑定目标，非全局误删） */
  let loadedFolderId: string | null = null
  return {
    workspaceId: ports.workspaceId,
    snapshot: () => {
      const first = protectedSessions()[0]
      return first === undefined ? null : sessionSnapshotOf(first)
    },
    loadPayload: (p) => {
      loadedFolderId = p.folderId
      useLineageStore.getState().applyRecoverySession(p)
    },
    // 载入+接管完成后再水化草稿（§5——去重判据+noteId 不在图归新笔记）；
    // [回炉 W1] 同沿拉 graph 派生三面（失败容错=缺省，下次 load 自愈）
    onRestored: (p) => {
      const plan = planDraftRehydration(p)
      if (plan !== null) stashRestoreDraft(plan)
      void refreshDerivedFields(p.folderId)
    },
    openLineageView: () => requestOpenLineage(),
    discardLoadedSession: () => {
      const target = loadedFolderId ?? lineageRegistry.activeFolder()
      loadedFolderId = null
      useLineageStore.getState().discardSession(target) // 只清目标会话（§6.1 O2）
    },
    hasUnsettledWrites: anyUnsettled,
    hasReplaceableSession: anyReplaceable, // [回炉 W-B3·R-B5 / 裁决 R2] §6.3 替换守卫（只看目标会话）
    settleUnsettledWrites: async () => {
      const preActions = lineageRegistry.sessions().reduce((n, e) => n + e.data.queue.length, 0)
      const preDraft = draftOpen()
      fireLineageNoteCommit() // 草稿经既有 commit 入口转队列（开门由 entry 落定步承担）
      await settleNoteDraftResidual() // [回炉 W-B2b] 提交未能执行而草稿仍在：残留经内部 settle 写路径落库
      await Promise.all(lineageRegistry.sessions().filter((e) => e.data.queue.length > 0 || e.data.inflight !== null).map((e) => e.lane.save()))
      const committed = preDraft && !draftOpen()
      return {
        ok: !anyUnsettled(),
        savedActions: preActions + (committed ? 1 : 0),
        savedDraft: preDraft
      }
    },
    // [F-RECOV-04 件五] 预检装配（graph/folders 读面→纯数据清单；失败=read-failed）
    runRestorePreflight: async (payload) => {
      try {
        const [graph, folders] = await Promise.all([unwrap(api.lineage.graph({ folderId: payload.folderId })), unwrap(api.folders.list({}))])
        return { kind: 'ran', conflicts: preflightRestorePayload(payload, buildPreflightView(graph, folders.map((f) => f.id))) }
      } catch {
        return { kind: 'read-failed' }
      }
    },
    askRestoreDecision,
    owner: {
      protectedSessions,
      unlandedSessions,
      generationOf: (folderId) => lineageRegistry.entry(folderId)?.data.sessionGeneration ?? null,
      sessionSnapshot: sessionSnapshotOf,
      activeFolder: () => lineageRegistry.activeFolder(),
      setUnprotectedChip: (v) => {
        patchRecoveryUi({ unprotectedChip: v })
      },
      publish: (owner) => lineageRegistry.setRecoveryOwner(owner)
    }
  }
}

/** 后台删夹 owner 钩接线（§8.4 行 11——IO clean 会话清出前的转移/置空裁决） */
export function bindRecoveryFolderRemovedHook(): void {
  setLineageFolderRemovedHook((folderId) => notifyRecoveryFolderRemoved(folderId))
}
