/**
 * [SR-IPC-04] ipc/tags —— 标签域装配（工单：open / weak）
 *
 * ── 行为层 ──
 * - 纯委托 services.tags（list/upsert/attach/detach）
 *
 * ── 接口层 ──
 * - export function createTagsIpc(deps: IpcDeps): ApiHandlers['tags']
 *
 * ── 架构层 ── / ── 生命周期层 ──
 * - 同 ipc/library
 *
 * ── 文化层 ──
 * - 测试：tests/unit/ipc/tags.test.ts（已锁定，services 桩）
 */
import { unimplementedObject } from '../../shared/app-error'
import type { ApiHandlers } from '../../shared/ipc/api-surface'
import type { IpcDeps } from './index'

export function createTagsIpc(_deps: IpcDeps): ApiHandlers['tags'] {
  return unimplementedObject<ApiHandlers['tags']>('SR-IPC-04', 'ipc.tags')
}
