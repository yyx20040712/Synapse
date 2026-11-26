/**
 * [B4 L2 / 设计稿 §2.3、§11.2] lineage-session-core —— 注册表内部面的类型契约（自
 * lineage-session-registry 外移的裁决件共用：[回炉 W-B1·R-B4] 改键/植入裁决=
 * lineage-session-rekey、[回炉 W-B1·R-remap] remap 终态迁移=lineage-session-remap）。
 *
 * registry 件的行数已达设计稿预算上限，新增的会话身份逻辑一律成件外移；外移件经本
 * 契约读写注册表内部面（会话表、活动键、代际计数、单一写路径 apply、活动投影），不 import
 * registry 运行时（类型单向依赖，零环）。
 */
import type { DragBridge, RegistryProjector, SessionEntry, SessionPatch } from './lineage-session-registry'
import type { SessionLoader } from './lineage-session-loader'

/** 活动投影整幅（LineageStore 全部状态字段） */
export type SessionProjection = Parameters<RegistryProjector['set']>[0]

/** [§9.3] 拖拽桥接态初值（registry 建 entry 与植入复位共用——自 registry 迁出，Rule of Three 前置的单源） */
export const emptyDrag = (): DragBridge => ({ dragId: null, generation: null, requestSettle: null, settleFlight: null, waiters: [] })

export interface RegistryCore {
  sessions: Map<string, SessionEntry>
  /** 取或建会话（建=登记入表） */
  ensure(folderId: string): SessionEntry
  /** 只建会话（新代际；不登记入表——调用方决定何时登记） */
  makeEntry(folderId: string): SessionEntry
  /** 推进并返回新代际（与 makeEntry 同一计数器） */
  nextGeneration(): number
  /** 单一写路径（就地合并+仅活动会话投影+通知；拒收异键 folderId） */
  apply(entry: SessionEntry, patch: SessionPatch): void
  notify(): void
  loader: SessionLoader
  activeFolder(): string
  setActiveFolder(folderId: string): void
  projector(): RegistryProjector | null
  /** [§8.1 步 3/4] 切换活动会话并整幅投影 */
  activate(folderId: string): SessionEntry
  /** [B5 设计稿 §5.2] 统一活动整幅投影口：按 entry.nodes 归一化 entry.data.focusSet→整幅写入投影宿主→
   *  同步 view.store focusSet（合法集合保持引用）。rekey 切活动键后必经此口——不得直接
   *  projector.set(projectAll(...)) 绕开 focusSet（落地=lineage-session-projection；独立整幅接口面
   *  已删——closeout W3 2026-11-26） */
  projectActiveSession(entry: SessionEntry): void
}
