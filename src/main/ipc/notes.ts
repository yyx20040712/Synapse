/**
 * [SR-IPC-03] ipc/notes —— 笔记域装配（工单：open / weak）
 *
 * ── 行为层 ──
 * - 纯委托 services.notes（get/save/remove）
 *
 * ── 接口层 ──
 * - export function createNotesIpc(deps: IpcDeps): ApiHandlers['notes']
 *
 * ── 架构层 ── / ── 生命周期层 ──
 * - 同 ipc/library
 *
 * ── 文化层 ──
 * - 测试：tests/unit/ipc/notes.test.ts（已锁定，services 桩）
 */
import { unimplementedObject } from '../../shared/app-error'
import type { ApiHandlers } from '../../shared/ipc/api-surface'
import type { IpcDeps } from './index'

export function createNotesIpc(_deps: IpcDeps): ApiHandlers['notes'] {
  return unimplementedObject<ApiHandlers['notes']>('SR-IPC-03', 'ipc.notes')
}
