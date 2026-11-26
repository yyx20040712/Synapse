/**
 * [B4 L2 / 设计稿 §2.3「所有写必须经 registry 的单一 updateSession 同步投影」「useLineageStore
 * 可作为现有组件的活动投影保留」、§11.2] lineage-session-projection —— per-folder 会话注册表的
 * 单一写路径与活动投影（PROJECT_KEYS 与 projector；[回炉 W-D2a·T-B05] 自 lineage-session-registry
 * 外移成件：registry 件行数超设计稿预算，按 r-tests/note.md 表四切面拆件——registry 留委托面，
 * 公共方法名不变）。
 *
 * ── 行为层 ──
 * - 单一写路径：一切会话写经 apply(entry, patch)——登记会话=会话数据就地合并，
 *   仅当该 entry 是注册表当前活动会话时同步投影到活动投影（useLineageStore）。
 *   后台响应一律写**发起时所属的 entry**（lane 闭包持 entry 引用，不按 key 查表）
 *   ——会话被替换/删除后旧 entry 成孤儿：迟到写只落孤儿（物理账本），不投影、
 *   不写新会话（§2.5 #19、§2.6 #43）。[回炉 W-B1·R-B4] 注册表键=data.folderId
 *   恒等（每个文件夹恰一个会话；改键=换新身份=新 entry）：携异键 folderId 的
 *   patch=身份写越界，apply 拒收整条。
 * - 聚焦集成员有效性（[B5 设计稿 §5 C3]：focusSet(folder) ⊆ ids(session(folder).nodes)）：
 *   · entry 写归一化——apply 与 replace 入口对携 nodes 的 patch 按 patch 后 nodes 剪枝
 *     （纯件=lineage-focus-membership）：活动会话的现集合读 lineage-view.store（活动
 *     focusSet 的存储面，不加入 LineageStore 投影字段表），剪枝结果与 nodes 同一写提交
 *     生效并同步 view.store（合法集合同值同引用时不写）；挂起会话读 entry.data.focusSet。
 *   · 统一活动整幅投影口 projectActiveSession(entry)——按 entry.nodes 归一化 entry.data.
 *     focusSet → 整幅写入投影宿主 → 同步 view.store focusSet。activate、活动 replace、
 *     rekey 切活动键后、课题切换 reset 的整幅投影都必须走此口，不得直接 projector.set
 *     (projectAll(...)) 绕开 focusSet（独立 setAll 接口面已删——[closeout W3 2026-11-26]
 *     零消费且留面即留旁路）。
 *   · 同图 ready 重挂（LineagePage 挂载效应的零 graph IPC 分支）经 resyncActive：先把
 *     view.store 现集合按活动会话 nodes 剪后回写 entry 副本，再经统一投影口——合法集合同值
 *     同引用，既有死 id 才移除。
 * - PROJECT_KEYS=活动投影字段=LineageStore 的全部状态字段（函数=公开动作，不投影）；
 *   PROJECTION_COVERS_STORE=投影完备性的编译期保证（LineageStore 新增状态字段而未登记
 *   即类型错误）。
 * - projectPatch：会话 patch→投影 patch（只取投影键；值 undefined 的键跳过——不以
 *   undefined 覆盖投影现值）。projectAll：会话数据→整幅投影（store 初态装配、切换
 *   活动会话、恢复替换、课题切换 reset）。
 * - 投影宿主（RegistryProjector——useLineageStore 的 set/get 面）由本件持有：attach 装配
 *   一次（装配位=store 模块求值期 registry.attachProjector）；未装配时写入为 no-op
 *   （registry 模块求值早于 store）。setPatch 是否执行由调用方判定——仅活动
 *   会话的写投影（registry.activate/replace/resetWorkspace）；整幅投影与切图时序见
 *   lineage-session-registry 头注。
 * - 聚焦集读点/清点（[B4 L2 §2.3 focusSet 行；B5 §5.2] 委托面自 registry 迁驻本件——
 *   registry 与 lineage-view.store 的聚焦集接缝全部收在本件，registry 不直接读写 view.store）：
 *   focusSetOf=挂起会话读 entry 副本、活动会话读 view.store；clearFocusOf=只清该图（ghost
 *   降级消费面）；suspend=离场会话挂起（活动集合按离场图自身 nodes 剪后落 entry 副本）；
 *   activeFocusSet=活动会话集合读点；resetWorkspaceView=课题切换 reset 的 view 复位（独立
 *   动作 resetForWorkspace：归 browse、清集合与工具态——不复用 resetForMount）＋整幅投影。
 * - implantProjection：活动投影写闸（registry.patchActive）的落地——useLineageStore.setState
 *   同样路由到 registry；同键就地植入／异键换新身份的裁决体=lineage-session-rekey。
 *
 * ── 接口层 ── 类型 RegistryProjector/StorePatch/StoreStateOf/SessionProjection/ProjectionHost；
 * export const PROJECTION_COVERS_STORE/projectPatch/projectAll；export function
 * createSessionProjection/implantProjection
 *
 * ── 架构层 ── 对 registry/model/core 为 type-only import；运行时只依赖
 * lineage-writeback-admission（身份写越界判据）、lineage-session-rekey（写闸裁决体）、
 * lineage-focus-membership（剪枝纯件）与 lineage-view.store（活动聚焦集存储——view.store
 * 零反向依赖，零环）。
 */
import type { LineageStore } from './lineage-session-model'
import type { LineageSession, SessionEntry } from './lineage-session-registry'
import type { RegistryCore } from './lineage-session-core'
import { foreignIdentityWrite } from './lineage-writeback-admission'
import { implantActive } from './lineage-session-rekey'
import { normalizeFocusInPatch, pruneFocusMembers } from './lineage-focus-membership'
import { useLineageViewStore } from './lineage-view.store'

export interface RegistryProjector {
  set(patch: Partial<LineageStore>): void
  get(): LineageStore
}

export type StorePatch = Partial<LineageStore> | ((s: LineageStore) => Partial<LineageStore>)

/** 活动投影字段=LineageStore 的全部状态字段（函数=公开动作，不投影；活动 focusSet 不在其中——存储=lineage-view.store） */
const PROJECT_KEYS = [
  'nodes', 'edges', 'paperMetrics', 'pubNos', 'tagNames', 'lineTypeNames', 'floatingNotes',
  'status', 'error', 'folderId', 'sessionGeneration', 'saveStatus', 'lastWriteError', 'lastWriteErrorSource', 'queue',
  'flushing', 'inflight', 'needsReload', 'invalidationEpoch', 'undoStack', 'redoStack',
  'unfinalized', 'editRevision', 'restoredAwaitingCommand', 'staleHistory'
] as const satisfies readonly (keyof LineageSession)[]
type ProjectedKey = (typeof PROJECT_KEYS)[number]
export type StoreStateOf<T> = Omit<T, { [K in keyof T]: T[K] extends (...args: never[]) => unknown ? K : never }[keyof T]>
/** 投影完备性（编译期）：PROJECT_KEYS 须覆盖 LineageStore 的全部状态字段 */
export const PROJECTION_COVERS_STORE: StoreStateOf<LineageStore> extends Pick<LineageSession, ProjectedKey> ? true : never = true

/** 会话 patch→投影 patch（只取投影键；值 undefined 的键跳过） */
export const projectPatch = (next: Partial<LineageSession>): Partial<LineageStore> => {
  const out: Partial<LineageStore> = {}
  for (const k of PROJECT_KEYS) {
    const v = next[k]
    if (v !== undefined) (out as Record<string, unknown>)[k] = v
  }
  return out
}

/** 会话数据→整幅投影（LineageStore 全部状态字段） */
export const projectAll = (data: LineageSession): StoreStateOf<LineageStore> =>
  Object.fromEntries(PROJECT_KEYS.map((k) => [k, data[k]])) as unknown as StoreStateOf<LineageStore>

export interface SessionProjection {
  /** 单一写路径：就地合并+仅活动会话投影+通知聚合订阅；携 nodes 的 patch 先经聚焦集归一化（[B5 §5.2]） */
  apply(entry: SessionEntry, next: Partial<LineageSession>): void
  /** 装配投影宿主（store 模块求值期——registry.attachProjector） */
  attach(p: RegistryProjector): void
  /** 已装配的投影宿主（未装配=null） */
  current(): RegistryProjector | null
  /** 活动会话写的投影（未装配=no-op；是否活动会话由调用方判定） */
  setPatch(next: Partial<LineageSession>): void
  /** [B5 §5.2] 统一活动整幅投影口：按 entry.nodes 归一化 entry.data.focusSet→整幅写入投影宿主→同步 view.store focusSet（合法集合保持引用）——[closeout W3 2026-11-26] 整幅投影唯一入口（独立 setAll 面删除，防绕开 focusSet 同步） */
  projectActiveSession(entry: SessionEntry): void
  /** [B5 §5.2] replace 入口的数据归一化：读源=patch 显式 focusSet ?? entry.data.focusSet（新会话初值=空集），按 patch 后 nodes 剪后就地合并 */
  replaceData(entry: SessionEntry, patch: Partial<LineageSession>): void
  /** [B5 §2.2/§5.2] 活动投影同步口（同图 ready 重挂——零 graph IPC）：view.store 现集合按活动会话 nodes 剪后回写 entry 副本，再经统一投影口 */
  resyncActive(): void
  /** [B5 §5.2] 离场会话的集合挂起：活动集合按离场图自身 nodes 剪后落 entry 副本 */
  suspend(entry: SessionEntry): void
  /** 活动会话聚焦集读点（活动 focusSet 的存储=view.store） */
  activeFocusSet(): string[]
  /** 会话聚焦集读点：挂起会话读 entry 副本；活动会话读 view.store */
  focusSetOf(folderId: string): string[]
  /** 只清该图的聚焦集（ghost 降级消费面）；活动会话清 view.store */
  clearFocusOf(folderId: string): void
  /** [B5 §5.2] 课题切换 reset 的 view 复位：view.store 归 browse、清集合与工具态（resetForWorkspace——不复用 resetForMount），再经统一投影口 */
  resetWorkspaceView(entry: SessionEntry): void
}

/** 写路径与投影的注册表侧读面（活动会话判定、按键查会话与聚合订阅通知——registry 注入） */
export interface ProjectionHost {
  activeEntry(): SessionEntry | undefined
  entryOf(folderId: string): SessionEntry | undefined
  notify(): void
}

export function createSessionProjection(host: ProjectionHost): SessionProjection {
  let projector: RegistryProjector | null = null
  const viewFocus = (): string[] => useLineageViewStore.getState().focusSet
  /** 活动会话的聚焦集同步到 view.store（活动 focusSet 的存储面）——同值同引用不写（不产生无意义重渲染） */
  const syncViewFocus = (focusSet: readonly string[]): void => {
    if (viewFocus() !== focusSet) useLineageViewStore.setState({ focusSet: focusSet as string[] })
  }
  const projectActiveSession = (entry: SessionEntry): void => {
    const focusSet = pruneFocusMembers(entry.data.focusSet, entry.data.nodes)
    if (focusSet !== entry.data.focusSet) entry.data.focusSet = focusSet
    projector?.set(projectAll(entry.data))
    syncViewFocus(focusSet)
  }
  return {
    apply(entry, next) {
      if (foreignIdentityWrite(entry.key, next)) return // [回炉 W-B1·R-B4] 身份写越界：改键只经 rekey 新建 entry
      const active = host.activeEntry() === entry
      // [B5 §5.2] entry 写归一化：携 nodes 的 patch 按 patch 后 nodes 剪枝——现集合读源：活动会话=view.store，否则=entry 副本
      const patch = normalizeFocusInPatch(active ? viewFocus() : entry.data.focusSet, next)
      Object.assign(entry.data, patch)
      if (active) {
        projector?.set(projectPatch(patch))
        if (patch.focusSet !== undefined) syncViewFocus(patch.focusSet) // 剪枝结果与 nodes 同一写提交生效
      }
      host.notify()
    },
    attach: (p) => {
      projector = p
    },
    current: () => projector,
    setPatch: (next) => {
      projector?.set(projectPatch(next))
    },
    projectActiveSession,
    replaceData: (entry, patch) => {
      Object.assign(entry.data, normalizeFocusInPatch(entry.data.focusSet, patch))
    },
    resyncActive() {
      const entry = host.activeEntry()
      if (entry === undefined) return
      entry.data.focusSet = pruneFocusMembers(viewFocus(), entry.data.nodes) // 现集合回写 entry 副本
      projectActiveSession(entry)
    },
    suspend: (entry) => {
      entry.data.focusSet = pruneFocusMembers(viewFocus(), entry.data.nodes)
    },
    activeFocusSet: viewFocus,
    focusSetOf: (folderId) => {
      const e = host.entryOf(folderId)
      return e !== undefined && e !== host.activeEntry() ? e.data.focusSet : viewFocus()
    },
    clearFocusOf: (folderId) => {
      const e = host.entryOf(folderId)
      if (e !== undefined && e !== host.activeEntry()) e.data.focusSet = []
      else useLineageViewStore.getState().clearFocus()
    },
    resetWorkspaceView: (entry) => {
      useLineageViewStore.getState().resetForWorkspace()
      projectActiveSession(entry)
    }
  }
}

/** 活动投影写闸的落地（registry.patchActive）：未装配投影宿主=无写面；函数式 patch 以投影现值为输入 */
export function implantProjection(core: RegistryCore, patch: StorePatch): void {
  const projector = core.projector()
  if (projector === null) return
  // [B5 §5.2 rekey①] 改键的迁移集合须在会话离场前取定：此处（调用 implantActive 之前）从 view.store 捕获当时活动集合
  implantActive(
    core,
    typeof patch === 'function' ? patch(projector.get()) : patch,
    useLineageViewStore.getState().focusSet
  ) // 改键=换新身份/同键就地植入
}
