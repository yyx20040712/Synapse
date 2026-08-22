/**
 * [SR-IPC-03] ipc/notes —— 笔记域装配（工单：done / weak）
 *
 * ── 行为层 ──
 * - 纯委托：get→services.notes.get；save→….save；remove→….remove
 * - 本文件没有任何业务逻辑，每方法一行转调
 *
 * ── 接口层 ──
 * - export function createNotesIpc(deps: IpcDeps): ApiHandlers['notes']
 *
 * ── 架构层 ──
 * - 只 import：IpcDeps 类型、ApiHandlers 契约类型（services 形状）
 * - 禁 import repos/db（分层单向：ipc → services）；zod 校验由 register 统一做
 *
 * ── 生命周期层 ── / ── 文化层 ──
 * - 同 ipc/library；service 抛错（NotesDomainError NOT_FOUND 等）原样上抛，
 *   由 register 折叠为 Result
 * - 测试：tests/unit/ipc/notes.test.ts（已锁定，services 桩）
 */
import type { ApiHandlers } from '../../shared/ipc/api-surface'
import type { IpcDeps } from './index'

export function createNotesIpc(deps: IpcDeps): ApiHandlers['notes'] {
  return {
    get: (req) => deps.services.notes.get(req),
    save: (req) => deps.services.notes.save(req),
    remove: (req) => deps.services.notes.remove(req)
  }
}
