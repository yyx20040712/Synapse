/**
 * [B4 L2 / 设计稿 §2.6 #41-#43、§2.5 #40、§8.3、§11.2] lineage-folder-reconcile —— 后台结构
 * 事件的全 registry 失效、后台删夹会话处置与迟到响应归属。
 *
 * ── 行为层 ──
 * - #41 结构事件失效（folders.changed/lineage.changed 空载荷事件）：全 registry 未删
 *   会话（loading/ready/error 均含）needsReload=1 且各 invalidationEpoch+1；无会话的
 *   folder 不创建会话。活动会话 IO clean（Q0∧F0∧无草稿∧ready）→立即单飞和解（读
 *   捕获新 epoch）；有 Q/F/草稿→位保留，链尾按 §2.6 10a 自动续拉（新单飞捕获新
 *   epoch）。[回炉 W-B2d] 恢复待令会话同样位保留——它的和解时点=首次命令入链，不适用
 *   立即和解（见 onStructureChanged）。历史与 U 不动。默认方案不扩事件载荷（源/目标
 *   folder 列属另一 shared 合约变更——须主控裁决，本件不做）。
 * - #43 迟到响应归属：事件前发起的旧读（读捕获 epoch<会话当前）不得清 needsReload、
 *   不得写图态——判据落位=lineage-session-loader applyKeyed（folderId+sessionGeneration
 *   +loadSeq+读捕获 epoch 全匹配才写）；本件只负责推进 epoch。
 * - #42/#40 后台删夹（活夹清单落定后判定——picker 首拉/事件后重拉）：命中会话
 *   IO clean→清会话（历史清；owner 处置经 onFolderRemoved 钩按 §8.4 转移或 null）；
 *   有未决写（Q/F/草稿）→不得静默清，会话保留走既有冲突径（退化态沿承）。活动
 *   会话被清→回退主图。
 * - 接线：bind() 订阅两类事件（App 组合根挂载一次——脉络页不在场时挂起会话同样
 *   须失效；事件面不可用=无失效源，不抛）。
 *
 * ── 接口层 ── export const lineageFolderReconcile / export function
 * bindLineageFolderEvents(): () => void / 类型 FolderReconcile
 *
 * ── 架构层 ── 纯编排件：会话读写经 registry；活动会话和解/回退主图经 deps 注入。
 */
import { apiEvents } from '../../api/client'
import { MAIN_GRAPH_ID } from '@shared/models/lineage'
import { noteDraftPending } from './lineage-note-draft'
import { useLineageStore } from './lineage.store'
import { lineageRegistry as registry, type LineageRegistry } from './lineage-session-registry'

export interface FolderReconcileDeps {
  registry: LineageRegistry
  /** 活动会话有未收口草稿（IO clean 判定并入——草稿属活动图） */
  draftPending(): boolean
  /** 活动会话立即单飞和解（#41） */
  reconcileActive(): void
  /** 活动图被删且 IO clean→回退主图（#42） */
  fallbackToMain(): void
  /** 会话清出前的 owner 处置钩（§8.4 后台删夹行：IO clean→按算法转移或 null） */
  onFolderRemoved?(folderId: string): void
}

export type FolderGoneResult = 'none' | 'fallback' | 'kept'

export interface FolderReconcile {
  /** #41：结构事件到达——全 registry 失效+活动会话和解 */
  onStructureChanged(): void
  /** #42/#40：活夹清单落定——不在清单的会话处置 */
  onFoldersRefreshed(aliveFolderIds: readonly string[]): FolderGoneResult
}

export function createFolderReconcile(deps: FolderReconcileDeps): FolderReconcile {
  /** IO clean（#42 判定）：Q0 ∧ 无在途**写**（reconcile 在途不算——权威读非用户
   *  数据；删除先拒只对真实待写，§2.5 #40「INV-91 保证 Q/F 时删除先被拒」）∧ 无草稿 */
  const ioClean = (folderId: string): boolean => {
    const entry = deps.registry.entry(folderId)
    if (entry === undefined) return true
    const draft = folderId === deps.registry.activeFolder() && deps.draftPending()
    const writing = entry.data.inflight !== null && entry.data.inflight.kind !== 'reconcile'
    return entry.data.queue.length === 0 && !writing && !draft
  }
  return {
    onStructureChanged() {
      const r = deps.registry
      for (const entry of r.sessions()) {
        r.update(entry.key, { needsReload: true, invalidationEpoch: entry.data.invalidationEpoch + 1 })
      }
      const active = r.entry(r.activeFolder())
      // 活动会话 IO clean→立即单飞和解（捕获新 epoch）；loading 会话=其旧读被 loader
      // 按 epoch 判废后续拉；Q/F/草稿会话=位保留、链尾续拉。
      // [回炉 W-B2d·主控裁定 X] 恢复待令会话（restoredAwaitingCommand——恢复载入后本会话写链尚无任务起步，
      // 定义见 lineage-session-registry 头注）同样位保留：#41 的立即和解是自动和解的一条路径，与「恢复图的
      // 和解时点=首次命令入链」（§2.5 #10a/#39）冲突。位已在上方循环置上，首次命令按当前 epoch 和解。
      // 本判定不并入 ioClean——它同时是下方 #42 后台删夹的「IO clean 可清会话」判据。
      if (active === undefined || active.data.status !== 'ready' || !ioClean(active.key) || active.data.restoredAwaitingCommand) return
      deps.reconcileActive()
    },
    onFoldersRefreshed(aliveFolderIds) {
      const r = deps.registry
      const alive = new Set(aliveFolderIds)
      let activeGone: string | null = null
      let activeKept = false
      for (const entry of r.sessions()) {
        const key = entry.key
        if (key === MAIN_GRAPH_ID || alive.has(key) || entry.data.deleted) continue
        const isActive = key === r.activeFolder()
        if (!ioClean(key)) {
          if (isActive) activeKept = true
          continue // 有未决写不得静默清（#40——既有冲突径承接）
        }
        deps.onFolderRemoved?.(key)
        r.remove(key) // 会话清：目标会话历史清
        if (isActive) activeGone = key
      }
      if (activeGone !== null) {
        deps.fallbackToMain()
        return 'fallback'
      }
      return activeKept ? 'kept' : 'none'
    }
  }
}

let folderRemovedHook: ((folderId: string) => void) | null = null

/** 会话清出前的 owner 处置钩装配（recovery-host-ports 装配期注入——§8.4 后台删夹行） */
export function setLineageFolderRemovedHook(hook: ((folderId: string) => void) | null): void {
  folderRemovedHook = hook
}

/** 模块单例（装配=真实 registry+活动会话 lane+store 切图） */
export const lineageFolderReconcile = createFolderReconcile({
  registry,
  draftPending: noteDraftPending,
  reconcileActive: () => {
    void registry.ensure(registry.activeFolder()).lane.reconcileNow()
  },
  fallbackToMain: () => useLineageStore.getState().setFolder(MAIN_GRAPH_ID),
  onFolderRemoved: (folderId) => folderRemovedHook?.(folderId)
})

/** 事件接线（App 组合根挂载一次）；返回解绑。事件面不可用=无失效源，不抛 */
export function bindLineageFolderEvents(): () => void {
  const events = apiEvents as unknown as Record<string, ((cb: () => void) => () => void) | undefined>
  const offs: Array<() => void> = []
  for (const name of ['onFoldersChanged', 'onLineageChanged']) {
    const on = events[name]
    if (typeof on !== 'function') continue
    try {
      const off = on(() => lineageFolderReconcile.onStructureChanged())
      if (typeof off === 'function') offs.push(off)
    } catch {
      // 订阅面不可用（preload 未就绪）——无失效源
    }
  }
  return () => {
    for (const off of offs) off()
  }
}
