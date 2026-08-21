/**
 * [SR-IPC-01] ipc/library —— 文献库域装配（工单：open / weak）
 *
 * ── 行为层 ──
 * - 纯委托：list→services.library.list；detail→….detail；updateMeta→…；collections→…
 * - 本文件没有任何业务逻辑，每方法一行转调
 *
 * ── 接口层 ──
 * - export function createLibraryIpc(deps: IpcDeps): ApiHandlers['library']
 *
 * ── 架构层 ──
 * - 只 import：IpcDeps 类型、unimplementedObject（完成后删除）
 * - 实现后形状：{ list: (req) => deps.services.library.list(req), ... }
 *
 * ── 生命周期层 ── / ── 文化层 ──
 * - 测试：tests/unit/ipc/library.test.ts（已锁定，services 桩）
 */
import { unimplementedObject } from '../../shared/app-error'
import type { ApiHandlers } from '../../shared/ipc/api-surface'
import type { IpcDeps } from './index'

export function createLibraryIpc(_deps: IpcDeps): ApiHandlers['library'] {
  return unimplementedObject<ApiHandlers['library']>('SR-IPC-01', 'ipc.library')
}
