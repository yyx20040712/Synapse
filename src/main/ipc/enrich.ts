/**
 * [SR-IPC-06] ipc/enrich —— 元数据增强装配（工单：open / weak）
 *
 * ── 行为层 ──
 * - fetch：({ paperId }) => deps.services.enrich.enrichPaper(paperId)
 *
 * ── 接口层 ──
 * - export function createEnrichIpc(deps: IpcDeps): ApiHandlers['enrich']
 *
 * ── 架构层 ── / ── 生命周期层 ──
 * - 纯委托；增强只在此手动触发（安全负面清单：无后台自动出网）
 *
 * ── 文化层 ──
 * - 测试：tests/unit/ipc/enrich.test.ts（已锁定，services 桩）
 */
import { unimplementedObject } from '../../shared/app-error'
import type { ApiHandlers } from '../../shared/ipc/api-surface'
import type { IpcDeps } from './index'

export function createEnrichIpc(_deps: IpcDeps): ApiHandlers['enrich'] {
  return unimplementedObject<ApiHandlers['enrich']>('SR-IPC-06', 'ipc.enrich')
}
