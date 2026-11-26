/**
 * [B4 L2 / 设计稿 §2.3/§8.1/§8.4/§9.3/§11.2] lineage-session-registry —— per-folder 会话
 * 注册表（数据面单源：Map<folderId, 会话>——会话字段表见 §2.3；注册表级 activeFolder/
 * switchSeq/workspaceGeneration/唯一 recoveryOwner）。
 *
 * ── 行为层 ──
 * - 会话字段驻 entry.data（§2.3 全表）。不进响应式快照的句柄驻 entry 旁侧：
 *   inflightGraph（keyed 读单飞句柄）、interaction（拖拽两态）、drag（桥接态）；
 *   idleTimer 驻该会话的 lane 所持有的调度件（lineage-session-lane→lineage-idle-scheduler）。ioPhase 不另存——由
 *   saveStatus 四态经 lineageIoPhase 派生；flushing=inflight 在场的既有投影。
 * - 单一写路径（apply）：[回炉 W-D2a·T-B05] 裁决体=lineage-session-projection（就地合并、
 *   仅活动会话投影、身份写越界拒收——自本件外移，行为注释随代码迁驻该件头注）；本件
 *   留委托面，公共方法名不变。
 * - 活动投影写闸：useLineageStore.setState 同样路由到 patchActive（宿主/夹具植入
 *   不得绕过 registry 直写投影）。植入携 folderId=宿主声明活动会话：同键=就地植入；
 *   异键=改键=当前会话换新身份（裁决体=lineage-session-rekey；[回炉 W-B1·R-B4] 只
 *   作用于当前会话，其他会话及其未落定写不动——原「清空其他全部会话」退役，夹具的
 *   跨用例复位走测试专用 resetLineageSessionsForTests）。ghost remap 落库后的终态迁移
 *   （[回炉 W-B1·R-remap]：被矫正会话离场、主图会话换代并失效）裁决体=lineage-session-remap。
 * - activate（§8.1 步 3/4）：离场会话 focusSet 挂起（活动 focusSet 的存储=
 *   lineage-view.store——registry 只为挂起会话持有副本）；switchSeq++；目标有会话
 *   直接整幅投影，无会话才建（取数裁决=lineage-session-loader activate）。
 *   [B5 设计稿 §5 C3] 聚焦集成员有效性（focusSet(folder) ⊆ ids(session(folder).nodes)）：entry 写的
 *   归一化与活动整幅投影统一口 projectActiveSession 全驻 lineage-session-projection（见其头注）——
 *   本件 activate／replace／resetWorkspace／syncActiveSession 只经该口委托，不另写剪枝。
 * - 聚合（rail/quit 读注册表全集，不以活动投影代替）：ioDirty=任一会话 IO 未落定
 *   （队列非空 ∨ 在途 F≠null——[B5 C2=B] 相位不再是第三输入；lineage-io-phase.
 *   ioUnsettled 单源；[回炉 W-B2·R-B3] Q/F 直判：原只以 saveStatus≠clean 判定，在
 *   「在途而相位停在 clean」时漏报）；unfinalizedAny=全 registry U OR；needsProtection=Q∨F（§8.1
 *   恢复价值谓词的会话面——草稿属活动图，由 recovery-clean-lifecycle 并入）。
 * - 恢复待令（[回炉 W-B2c] `restoredAwaitingCommand`）：真=恢复载入后、本会话写链尚无任务起步。
 *   置位=applyRecoverySession（会话替换的 patch）；清除=写链任一任务起步（lineage-session-lane
 *   入链口）与会话替换/移除/课题切换 reset（新会话初值假）；读点=LineagePage 挂载效应（真时
 *   needsReload=1 也不自动和解——和解时点=首次命令入链，§2.5 #10a/#39）。
 * - 过期历史标记（[回炉 W-B3·R-D1] `staleHistory`）：history-unit 以 CONFLICT 拒绝的方向栈顶历史项
 *   （方向＋历史项 id＋拒因与消息；定义与适用性判据=lineage-history-stale）。置位=history-unit 的
 *   拒绝分支；清除=成功移栈、显式保存清 redo、用户在保存错误行出口确认丢弃；标记项不再位于其
 *   方向栈顶时读点判失效。新会话初值 null（lineage-session-fresh）。
 * - 拖拽两态桥接（§9.3）：[回炉 W-B2] 裁决体=lineage-session-drag（桥接态 DragBridge、有界
 *   settle 等待 awaitDragSettle、落位写准入 admitDragLanding——自本件外移，行为注释随代码
 *   迁驻该件头注）；本件留委托面，公共方法名不变。
 *
 * ── 接口层 ── export const lineageRegistry / 类型 LineageSession·SessionEntry·
 * LineageRegistry·RecoveryOwnerRef
 *
 * ── 架构层 ── 模块单例；依赖 loader/lane 工厂（单向）；不 import lineage.store（避免与 store 模块
 * 顶层求值成环）；[B5 §5.2] 对 lineage-view.store 的接缝（聚焦集挂起/读点/清点、课题切换的 view
 * 复位）全经 lineage-session-projection，本件不直接读写 view.store。[回炉 W-B1] 改键/remap 裁决经
 * lineage-session-core 契约外移（remap 件消费的 note-draft/调度器调用面已含于 lane 依赖面，无新环）；
 * [回炉 W-B3] 新建会话初值外移=lineage-session-fresh（本件行数已达预算上限）；[回炉 W-D2a·T-B05]
 * 单一写路径与活动投影（apply、PROJECT_KEYS、projectPatch/projectAll、投影宿主的持有、写闸落地）
 * 外移=lineage-session-projection（本件行数超预算上限；本件留委托面，公共方法名不变）。
 */
import { api, unwrap } from '../../api/client'
import { MAIN_GRAPH_ID } from '@shared/models/lineage'
import type { FloatingNote, LineageEdge, LineageNode } from '@shared/models/lineage'
import type { LineagePaperMetrics } from '@shared/ipc/schemas'
import type { WriteAction } from '@shared/recovery/schemas'
import type {
  LineageHistoryEntry,
  LineageInflight,
  LineageInteraction,
  LineageSaveStatus,
  LineageStatus,
  LineageStore
} from './lineage-session-model'
import { lineageIoPhase } from './lineage-session-model'
import type { InflightRead } from './lineage-write-conflicts'
import { createSessionLoader, type SessionLoader } from './lineage-session-loader'
import { createSessionLane, type SessionLane } from './lineage-session-lane'
import { createRemapFinalizer } from './lineage-session-remap'
import { emptyDrag, type RegistryCore } from './lineage-session-core'
import { createSessionDrag, type DragBridge } from './lineage-session-drag'
import { ioUnsettled } from './lineage-io-phase'
import type { LineageDragTarget } from './lineage-session-model'
import { freshSession } from './lineage-session-fresh'
import type { LineageStaleHistory } from './lineage-history-stale'
import { createSessionProjection, implantProjection, projectAll } from './lineage-session-projection'
import type { RegistryProjector, StorePatch, StoreStateOf } from './lineage-session-projection'
import type { LineageWriteErrorSource } from './lineage-write-failure'

export type { DragBridge } from './lineage-session-drag'
export type { RegistryProjector, StorePatch } from './lineage-session-projection'

/** [§2.3] per-folder 会话（字段全表；graph=nodes/edges/lineTypeNames/floatingNotes） */
export interface LineageSession {
  workspaceId: string
  folderId: string
  /** 首次创建、恢复替换、删除后重建递增——迟到响应身份键之一 */
  sessionGeneration: number
  nodes: LineageNode[]
  edges: LineageEdge[]
  lineTypeNames: string[]
  floatingNotes: FloatingNote[]
  /** graph/恢复后派生读；不进入历史与 unfinalized */
  paperMetrics: Record<string, LineagePaperMetrics>
  pubNos: Record<string, number>
  tagNames: Record<string, string[]>
  status: LineageStatus
  error: string | null
  /** keyed 读发起时推进；迟到覆盖守卫 */
  loadSeq: number
  /** 失效代际：结构事件到达全 registry +1；读发起时捕获，应用要求读捕获值≥当前 */
  invalidationEpoch: number
  queue: WriteAction[]
  inflight: LineageInflight | null
  /** F≠0 的既有投影（inflight 在场） */
  flushing: boolean
  /** ioPhase×Q 四态投影（clean=idle/Q0、dirty=idle/Q≥1、saving、error） */
  saveStatus: LineageSaveStatus
  lastWriteError: string | null
  /** [B5 §6.1] 最近一次写失败的来源（消息元数据——与 message、相位同一 patch 写入或清除；定义=lineage-write-failure） */
  lastWriteErrorSource: LineageWriteErrorSource
  undoStack: LineageHistoryEntry[]
  redoStack: LineageHistoryEntry[]
  unfinalized: boolean
  editRevision: number
  needsReload: boolean
  /** 恢复待令标记（定义见头注「恢复待令」） */
  restoredAwaitingCommand: boolean
  /** 过期历史标记（[回炉 W-B3·R-D1]——定义见头注「过期历史标记」与 lineage-history-stale） */
  staleHistory: LineageStaleHistory | null
  /** 活动会话的存储=lineage-view.store（切图时挂起到此；[B5 §5] 只含该图当前 nodes 中的 id——entry 写经 apply/replace 入口剪枝） */
  focusSet: string[]
  /** [§2.6 #42] 后台删夹标记（清出前的瞬态——已删会话不留在注册表） */
  deleted: boolean
}

export type SessionPatch = Partial<LineageSession> | ((s: LineageSession) => Partial<LineageSession>)

export interface SessionEntry {
  /** 注册表 Map 键（恒等于 data.folderId——改键=换新 entry；remap 落库后被矫正会话离场，不留键偏离的中间态） */
  key: string
  data: LineageSession
  lane: SessionLane
  inflightGraph: InflightRead | null
  interaction: LineageInteraction
  drag: DragBridge
}

/** [§8] 唯一 recovery 槽允许接收哪个会话的快照（写者=recovery-owner 状态机） */
export interface RecoveryOwnerRef {
  folderId: string
  generation: number
}

const resolvePatch = (patch: SessionPatch, s: LineageSession): Partial<LineageSession> => (typeof patch === 'function' ? patch(s) : patch)

export interface LineageRegistry {
  readonly loader: SessionLoader
  activeFolder(): string
  switchSeq(): number
  workspaceGeneration(): number
  recoveryOwner(): RecoveryOwnerRef | null
  setRecoveryOwner(owner: RecoveryOwnerRef | null): void
  entry(folderId: string): SessionEntry | undefined
  ensure(folderId: string): SessionEntry
  lane(folderId: string): SessionLane
  sessions(): SessionEntry[]
  isAlive(entry: SessionEntry): boolean
  /** 按会话键写（活动会话同步投影） */
  update(folderId: string, patch: SessionPatch): void
  /** 写发起时所属的 entry（后台响应专用——孤儿 entry 只落物理账本） */
  writeEntry(entry: SessionEntry, patch: Partial<LineageSession>): void
  /** [§8.1 步 3/4] 切换活动会话（取数裁决由调用方经 loader.activate 执行）——经统一口 projectActiveSession 恢复目标集合 */
  activate(folderId: string): SessionEntry
  /** 恢复替换/删除重建：新 generation（旧 entry 成孤儿——迟到写不落新会话）；入口按 patch 后 nodes 归一化 focusSet，活动会话经统一投影口 */
  replace(folderId: string, patch: Partial<LineageSession>): SessionEntry
  remove(folderId: string): void
  /** [§2.5 #38] 课题切换：全部会话失效、owner 归 null、活动=新建主图会话；view.store 经 resetForWorkspace 归 browse */
  resetWorkspace(workspaceId: string): void
  attachProjector(projector: RegistryProjector): void
  /** 活动会话整幅投影（store 初态装配——LineageStore 全部状态字段） */
  projected(): StoreStateOf<LineageStore>
  /** 活动投影写闸（useLineageStore.setState 的落地） */
  patchActive(patch: StorePatch): void
  /** [B5 §2.2/§5.2] 活动投影同步口（LineagePage 同图 ready 重挂的零 graph IPC 分支）：恒等防御剪枝——合法集合同值同引用、既有死 id 才移除；不覆写 mode、不重置工具态 */
  syncActiveSession(): void
  focusSetOf(folderId: string): string[]
  clearFocusOf(folderId: string): void
  interactionOf(folderId: string): LineageInteraction
  ioPhaseOf(folderId: string): 'idle' | 'saving' | 'error'
  dragPending(folderId: string): boolean
  dragStart(folderId: string, generation: number, dragId: string): void
  dragSettler(folderId: string, generation: number, dragId: string, requestSettle: () => void): void
  dragFlight(folderId: string, generation: number, dragId: string, flight: Promise<void>): void
  dragLayout(folderId: string, generation: number, dragId: string, active: boolean): void
  dragEnd(folderId: string, generation: number, dragId: string): void
  /** [§9.3] 有界收口：态二 await 句柄；态一请求有界 settle 后转态二 */
  awaitDragSettle(folderId: string): Promise<void>
  /** [回炉 W-B2·R-B2/实验①] 拖拽落位写准入（folderId+generation+drag id；就地换代的存活会话按 dragId 重锚） */
  admitDragLanding(target: LineageDragTarget): boolean
  ioDirty(): boolean
  unfinalizedAny(): boolean
  needsProtection(entry: SessionEntry): boolean
  /** 需保护会话键（Q∨F——活动会话居首） */
  protectedFolders(): string[]
  cancelAllIdle(): void
  subscribe(cb: () => void): () => void
}

export function createSessionRegistry(): LineageRegistry {
  const sessions = new Map<string, SessionEntry>()
  const listeners = new Set<() => void>()
  let activeFolder = MAIN_GRAPH_ID // [F-LGRAPH-01①U4] 恒有值——主图兜底
  let switchSeq = 0
  let workspaceGeneration = 0
  let workspaceId = ''
  let recoveryOwner: RecoveryOwnerRef | null = null
  let genCounter = 0

  const notify = (): void => {
    for (const cb of listeners) cb()
  }
  const activeEntry = (): SessionEntry | undefined => sessions.get(activeFolder)
  const projection = createSessionProjection({ activeEntry, entryOf: (folderId) => sessions.get(folderId), notify })
  const apply = projection.apply // 单一写路径（裁决体=lineage-session-projection，见其头注）
  const isAlive = (entry: SessionEntry): boolean => sessions.get(entry.key) === entry && !entry.data.deleted
  const loader = createSessionLoader({
    read: (folderId) => unwrap(api.lineage.graph({ folderId })),
    write: apply,
    alive: isAlive
  })
  const makeEntry = (folderId: string): SessionEntry => {
    const entry: SessionEntry = {
      key: folderId,
      data: freshSession(workspaceId, folderId, ++genCounter),
      lane: null as unknown as SessionLane,
      inflightGraph: null,
      interaction: { dragging: false, settleFlight: null, layoutActive: false },
      drag: emptyDrag()
    }
    entry.lane = createSessionLane({
      entry,
      write: (patch) => apply(entry, resolvePatch(patch, entry.data)),
      isActive: () => activeEntry() === entry,
      dragPending: () => drag.busy(entry),
      reconcile: () => loader.reconcile(entry),
      clearFocus: () => registry.clearFocusOf(entry.key),
      onRemapLanded: (to) => remapFinalize(entry, to), // [回炉 W-B1·R-remap] 写链 drain 成功收尾
      alive: () => isAlive(entry)
    })
    return entry
  }
  const ensure = (folderId: string): SessionEntry => {
    let entry = sessions.get(folderId)
    if (entry === undefined) {
      entry = makeEntry(folderId)
      sessions.set(folderId, entry)
    }
    return entry
  }

  // ── 注册表内部面（外移裁决件共用——改键/植入、remap 终态迁移；注释随代码驻各件）──
  const core: RegistryCore = {
    sessions, ensure, makeEntry, apply, notify, loader, nextGeneration: () => ++genCounter,
    activeFolder: () => activeFolder, setActiveFolder: (folderId) => { activeFolder = folderId },
    projector: () => projection.current(), activate: (folderId) => registry.activate(folderId),
    projectActiveSession: projection.projectActiveSession // [B5 §5.2] 统一活动整幅投影口注入 core（rekey 切键后必经）
  }
  const remapFinalize = createRemapFinalizer(core)
  // ── 拖拽两态桥接（§9.3）：裁决体=lineage-session-drag（[回炉 W-B2] 自本件外移）；makeEntry 的
  //    dragPending 闭包在首次调用前已可读到本绑定（TDZ 只约束求值期）──
  const drag = createSessionDrag(core)

  const registry: LineageRegistry = {
    loader,
    activeFolder: () => activeFolder,
    switchSeq: () => switchSeq,
    workspaceGeneration: () => workspaceGeneration,
    recoveryOwner: () => recoveryOwner,
    setRecoveryOwner: (owner) => {
      recoveryOwner = owner
      notify()
    },
    entry: (folderId) => sessions.get(folderId),
    ensure,
    lane: (folderId) => ensure(folderId).lane,
    sessions: () => [...sessions.values()],
    isAlive,
    update(folderId, patch) {
      const entry = sessions.get(folderId)
      if (entry !== undefined) apply(entry, resolvePatch(patch, entry.data))
    },
    writeEntry: apply,
    activate(folderId) {
      const current = activeEntry()
      if (folderId === activeFolder && current !== undefined) return current
      if (current !== undefined) projection.suspend(current) // 按图挂起（[B5 §5.2] 离场集合按离场图自身 nodes 剪）
      switchSeq += 1
      const entry = ensure(folderId)
      activeFolder = folderId
      projection.projectActiveSession(entry) // 统一活动整幅投影口（LineageStore 字段＋view.store focusSet 同步）
      notify()
      return entry
    },
    replace(folderId, patch) {
      const old = sessions.get(folderId)
      if (old !== undefined) {
        old.data.deleted = true
        old.lane.dispose()
        sessions.delete(folderId) // 旧链在途任务落定到孤儿 entry——不投影
      }
      const entry = makeEntry(folderId)
      projection.replaceData(entry, patch) // [B5 §5.2] replace 入口归一化（读源=patch 显式 focusSet ?? 新会话初值空集；按 patch 后 nodes 剪）
      sessions.set(folderId, entry)
      if (activeFolder === folderId) projection.projectActiveSession(entry) // 活动会话：剪后的集合写回双面（entry＋view.store）
      notify()
      return entry
    },
    remove(folderId) {
      const entry = sessions.get(folderId)
      if (entry === undefined) return
      entry.data.deleted = true
      entry.lane.dispose()
      sessions.delete(folderId)
      notify()
    },
    resetWorkspace(next) {
      for (const e of sessions.values()) {
        e.data.deleted = true
        e.lane.dispose()
      }
      sessions.clear()
      workspaceGeneration += 1
      workspaceId = next
      recoveryOwner = null
      activeFolder = MAIN_GRAPH_ID
      const entry = ensure(MAIN_GRAPH_ID)
      projection.resetWorkspaceView(entry) // [B5 §5.2] 全部集合清空并归 browse（view.store 独立动作 resetForWorkspace）＋整幅投影
      notify()
    },
    attachProjector(p) {
      projection.attach(p)
      projection.projectActiveSession(ensure(activeFolder)) // 装配即整幅投影（经统一口）
    },
    projected: () => projectAll(ensure(activeFolder).data),
    patchActive: (patch) => implantProjection(core, patch), // 落地=lineage-session-projection implantProjection（裁决体=lineage-session-rekey）
    // [B5 §5.2] 聚焦集读点/清点/同步口=projection 委托面（registry 与 view.store 的聚焦集接缝单点）
    focusSetOf: projection.focusSetOf,
    clearFocusOf: projection.clearFocusOf,
    syncActiveSession: projection.resyncActive,
    interactionOf: (folderId) => ensure(folderId).interaction,
    ioPhaseOf: (folderId) => lineageIoPhase(ensure(folderId).data.saveStatus),
    dragPending: drag.pending,
    dragStart: drag.start,
    dragSettler: drag.settler,
    dragFlight: drag.flight,
    dragLayout: drag.layout,
    dragEnd: drag.end,
    awaitDragSettle: drag.awaitSettle,
    admitDragLanding: drag.admitLanding,
    ioDirty: () => [...sessions.values()].some((e) => ioUnsettled(e.data)),
    unfinalizedAny: () => {
      for (const e of sessions.values()) if (e.data.unfinalized) return true
      return false
    },
    needsProtection: (entry) => entry.data.queue.length > 0 || entry.data.inflight !== null,
    protectedFolders: () => {
      const active = activeEntry()
      const rest = [...sessions.values()].filter((e) => e !== active && registry.needsProtection(e))
      // [回炉 W-B1·R-B1b] 按注册表键返回（键=data.folderId 恒等——与 owner/claim/onClean 所用的会话键同源）
      return [...(active !== undefined && registry.needsProtection(active) ? [active.key] : []), ...rest.map((e) => e.key)]
    },
    cancelAllIdle: () => {
      for (const e of sessions.values()) e.lane.cancelIdle()
    },
    subscribe(cb) {
      listeners.add(cb)
      return () => {
        listeners.delete(cb)
      }
    }
  }
  return registry
}

/** 模块单例（活动投影=lineage.store；装配位=store 模块求值期 attachProjector） */
export const lineageRegistry = createSessionRegistry()
