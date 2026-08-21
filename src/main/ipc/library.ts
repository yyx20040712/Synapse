/**
 * [SR-IPC-01] ipc/library —— 文献库域装配（工单：done）
 *
 * ── 行为层 ──
 * - 纯委托：list→services.library.list；detail→….detail；updateMeta→…；collections→…
 * - 本文件没有任何业务逻辑，每方法一行转调
 *
 * ── 接口层 ──
 * - export function createLibraryIpc(deps: IpcDeps): ApiHandlers['library']
 *
 * ── 架构层 ──
 * - 只 import：IpcDeps 类型、ApiHandlers 契约类型（services 形状）
 * - 禁 import repos/db（分层单向：ipc → services）；zod 校验由 register 统一做
 *
 * ── 生命周期层 ── / ── 文化层 ──
 * - 测试：tests/unit/ipc/library.test.ts（已锁定，services 桩）
 * - service 抛错（如 DomainError NOT_FOUND）在本层原样上抛，由 register 折叠为 Result
 */
import type { ApiHandlers } from '../../shared/ipc/api-surface'
import type { IpcDeps } from './index'

export function createLibraryIpc(deps: IpcDeps): ApiHandlers['library'] {
  return {
    list: (req) => deps.services.library.list(req),
    detail: (req) => deps.services.library.detail(req),
    updateMeta: (req) => deps.services.library.updateMeta(req),
    collections: (req) => deps.services.library.collections(req)
  }
}
