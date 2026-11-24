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
 * - PROJECT_KEYS=活动投影字段=LineageStore 的全部状态字段（函数=公开动作，不投影）；
 *   PROJECTION_COVERS_STORE=投影完备性的编译期保证（LineageStore 新增状态字段而未登记
 *   即类型错误）。
 * - projectPatch：会话 patch→投影 patch（只取投影键；值 undefined 的键跳过——不以
 *   undefined 覆盖投影现值）。projectAll：会话数据→整幅投影（store 初态装配、切换
 *   活动会话、恢复替换、课题切换 reset）。
 * - 投影宿主（RegistryProjector——useLineageStore 的 set/get 面）由本件持有：attach 装配
 *   一次（装配位=store 模块求值期 registry.attachProjector）；未装配时写入为 no-op
 *   （registry 模块求值早于 store）。setPatch/setAll 是否执行由调用方判定——仅活动
 *   会话的写投影（registry.activate/replace/resetWorkspace）；整幅投影与切图时序见
 *   lineage-session-registry 头注。
 * - implantProjection：活动投影写闸（registry.patchActive）的落地——useLineageStore.setState
 *   同样路由到 registry；同键就地植入／异键换新身份的裁决体=lineage-session-rekey。
 *
 * ── 接口层 ── 类型 RegistryProjector/StorePatch/StoreStateOf/SessionProjection/ProjectionHost；
 * export const PROJECTION_COVERS_STORE/projectPatch/projectAll；export function
 * createSessionProjection/implantProjection
 *
 * ── 架构层 ── 对 registry/model/core 为 type-only import；运行时只依赖
 * lineage-writeback-admission（身份写越界判据）与 lineage-session-rekey（写闸裁决体，零环）。
 */
import type { LineageStore } from './lineage-session-model'
import type { LineageSession, SessionEntry } from './lineage-session-registry'
import type { RegistryCore } from './lineage-session-core'
import { foreignIdentityWrite } from './lineage-writeback-admission'
import { implantActive } from './lineage-session-rekey'

export interface RegistryProjector {
  set(patch: Partial<LineageStore>): void
  get(): LineageStore
}

export type StorePatch = Partial<LineageStore> | ((s: LineageStore) => Partial<LineageStore>)

/** 活动投影字段=LineageStore 的全部状态字段（函数=公开动作，不投影） */
const PROJECT_KEYS = [
  'nodes', 'edges', 'paperMetrics', 'pubNos', 'tagNames', 'lineTypeNames', 'floatingNotes',
  'status', 'error', 'folderId', 'sessionGeneration', 'saveStatus', 'lastWriteError', 'queue',
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
  /** 单一写路径：就地合并+仅活动会话投影+通知聚合订阅 */
  apply(entry: SessionEntry, next: Partial<LineageSession>): void
  /** 装配投影宿主（store 模块求值期——registry.attachProjector） */
  attach(p: RegistryProjector): void
  /** 已装配的投影宿主（未装配=null） */
  current(): RegistryProjector | null
  /** 活动会话写的投影（未装配=no-op；是否活动会话由调用方判定） */
  setPatch(next: Partial<LineageSession>): void
  /** 整幅投影（未装配=no-op；是否活动会话由调用方判定） */
  setAll(data: LineageSession): void
}

/** 写路径与投影的注册表侧读面（活动会话判定与聚合订阅通知——registry 注入） */
export interface ProjectionHost {
  activeEntry(): SessionEntry | undefined
  notify(): void
}

export function createSessionProjection(host: ProjectionHost): SessionProjection {
  let projector: RegistryProjector | null = null
  return {
    apply(entry, next) {
      if (foreignIdentityWrite(entry.key, next)) return // [回炉 W-B1·R-B4] 身份写越界：改键只经 rekey 新建 entry
      Object.assign(entry.data, next)
      if (host.activeEntry() === entry) projector?.set(projectPatch(next))
      host.notify()
    },
    attach: (p) => {
      projector = p
    },
    current: () => projector,
    setPatch: (next) => {
      projector?.set(projectPatch(next))
    },
    setAll: (data) => {
      projector?.set(projectAll(data))
    }
  }
}

/** 活动投影写闸的落地（registry.patchActive）：未装配投影宿主=无写面；函数式 patch 以投影现值为输入 */
export function implantProjection(core: RegistryCore, patch: StorePatch): void {
  const projector = core.projector()
  if (projector === null) return
  implantActive(core, typeof patch === 'function' ? patch(projector.get()) : patch) // 改键=换新身份/同键就地植入
}
