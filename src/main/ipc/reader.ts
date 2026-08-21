/**
 * [SR-IPC-02] ipc/reader —— 阅读器域装配（工单：open / weak）
 *
 * ── 行为层 ──
 * - 纯委托 services.reader 的六个方法（open/标注增改删列/进度）
 *
 * ── 接口层 ──
 * - export function createReaderIpc(deps: IpcDeps): ApiHandlers['reader']
 *
 * ── 架构层 ── / ── 生命周期层 ──
 * - 同 ipc/library；无本地状态
 *
 * ── 文化层 ──
 * - 测试：tests/unit/ipc/reader.test.ts（已锁定，services 桩）
 */
import { unimplementedObject } from '../../shared/app-error'
import type { ApiHandlers } from '../../shared/ipc/api-surface'
import type { IpcDeps } from './index'

export function createReaderIpc(_deps: IpcDeps): ApiHandlers['reader'] {
  return unimplementedObject<ApiHandlers['reader']>('SR-IPC-02', 'ipc.reader')
}
