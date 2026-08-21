/**
 * [SR-SVC-01] library.service —— 文献库用例（工单：done）
 *
 * ── 行为层 ──
 * - 列表：透传 LibraryQuery 到 papers.searchSummaries
 * - 详情：papers.detailById；不存在 → 抛 DomainError（code=NOT_FOUND，
 *   register 经 toAppError 识别 code 字段折叠为 AppError）
 * - 元数据编辑：papers.updateMeta（patch 空对象不落库、直接返回现状，
 *   避免无意义地刷新 updated_at）；repo 返回 null = 文献不存在 → NOT_FOUND
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
 * - NOT_FOUND 场景抛内置 DomainError（本文件定义并导出 class DomainError extends Error，
 *   带 code: AppErrorCode 字段）——register 会经 toAppError 折叠
 * - updateMeta 落库后重读 detailById 返回聚合详情（契约要求 PaperDetail，
 *   而 repo 的 updateMeta 只回原始表行）
 * - 测试：tests/unit/services/library.service.test.ts（已锁定，repo 用内存桩）
 */
import type { AppErrorCode } from '../../shared/app-error'
import type { ApiHandlers } from '../../shared/ipc/api-surface'
import type { Repos } from '../db/repos'

/**
 * 域错误：service 层业务语义（如"资源不存在"）的载体。
 * toAppError 对带合法 code 字段的 Error 会保留 code 与 message 折叠成 AppError，
 * 前端据此按码分支。
 */
export class DomainError extends Error {
  readonly code: AppErrorCode

  constructor(code: AppErrorCode, message: string) {
    super(message)
    this.name = 'DomainError'
    this.code = code
  }
}

/** 统一的"文献不存在"错误（detail / updateMeta 共用同一语义与文案） */
function paperNotFound(paperId: string): DomainError {
  return new DomainError('NOT_FOUND', `文献不存在：${paperId}`)
}

export function createLibraryService(deps: { repos: Repos }): ApiHandlers['library'] {
  const { papers, collections } = deps.repos

  return {
    // 查询已在上游（ipc register）过 zod 校验并补全默认值，此处原样透传
    async list(req) {
      return papers.searchSummaries(req)
    },

    async detail(req) {
      const d = papers.detailById(req.paperId)
      if (d === null) throw paperNotFound(req.paperId)
      return d
    },

    async updateMeta(req) {
      // 空 patch：不写库（避免空更新刷动 updated_at），校验存在性后直接返回现状
      if (Object.keys(req.patch).length === 0) {
        const current = papers.detailById(req.paperId)
        if (current === null) throw paperNotFound(req.paperId)
        return current
      }
      // 非空 patch：先落库（null = 目标行不存在），再重读聚合详情满足响应契约
      const row = papers.updateMeta(req.paperId, req.patch)
      if (row === null) throw paperNotFound(req.paperId)
      const updated = papers.detailById(req.paperId)
      if (updated === null) throw paperNotFound(req.paperId)
      return updated
    },

    // 请求体为空对象（voidReqSchema），无参数可用
    async collections() {
      return collections.list()
    }
  }
}
