/**
 * [SR-IPC-06] ipc/enrich —— 元数据增强装配（工单：done / weak）
 *
 * ── 行为层 ──
 * - fetch：({ paperId }) => deps.services.enrich.enrichPaper(paperId)
 *
 * ── 接口层 ──
 * - export function createEnrichIpc(deps: IpcDeps): ApiHandlers['enrich']
 *
 * ── 架构层 ──
 * - 纯委托；增强只在此手动触发（安全负面清单：无后台自动出网）
 *
 * ── 生命周期层 ── / ── 文化层 ──
 * - service 的 EnrichDomainError（NOT_FOUND）原样上抛，register 折叠为 Result
 * - 测试：tests/unit/ipc/enrich.test.ts（已锁定，services 桩）
 */
import type { ApiHandlers } from '../../shared/ipc/api-surface'
import type { IpcDeps } from './index'

export function createEnrichIpc(deps: IpcDeps): ApiHandlers['enrich'] {
  return {
    fetch: (req) => deps.services.enrich.enrichPaper(req.paperId)
  }
}
