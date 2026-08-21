/**
 * [SR-SVC-01] library.service —— 文献库用例（工单：open / weak）
 *
 * ── 行为层 ──
 * - 列表：透传 LibraryQuery 到 papers.searchSummaries
 * - 详情：papers.detailById；不存在 → 抛 AppError 形状错误（code=NOT_FOUND，
 *   用 shared/app-error 的 err() 包装成 Error？否——直接 throw class DomainError）
 * - 元数据编辑：papers.updateMeta（patch 空对象直接返回现状）
 * - 集合列表：collections.list()
 *
 * ── 接口层 ──
 * - export function createLibraryService(deps: { repos: Repos }): ApiHandlers['library']
 *
 * ── 架构层 ──
 * - 只依赖 repos 桶；禁止 import db/connection（ESLint 强制）
 * - 本服务不做 IO（文件/网络都归别的 service）
 *
 * ── 生命周期层 ──
 * - 预留：智能过滤（引用数排序）在 v2 经新 repo 方法扩展
 * - 不做：删除文献（v1 明确不做，防误删；如需清理走 DB 维护工具）
 *
 * ── 文化层 ──
 * - NOT_FOUND 场景抛内置 DomainError（在本文件定义并导出 class DomainError extends Error，
 *   带 code: AppErrorCode 字段）——register 会经 toAppError 折叠
 * - 测试：tests/unit/services/library.service.test.ts（已锁定，repo 用内存桩）
 */
import { unimplementedObject } from '../../shared/app-error'
import type { ApiHandlers } from '../../shared/ipc/api-surface'
import type { Repos } from '../db/repos'

export function createLibraryService(_deps: { repos: Repos }): ApiHandlers['library'] {
  return unimplementedObject<ApiHandlers['library']>('SR-SVC-01', 'library.service')
}
