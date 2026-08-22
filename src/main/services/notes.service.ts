/**
 * [SR-SVC-10] notes.service —— 笔记用例（工单：done / weak）
 *
 * ── 行为层 ──
 * - get：repos.notes.findByPaper（null 合法=尚无笔记）
 * - save：repos.notes.upsert（paper 必须存在，否则 NOT_FOUND：先 papers.findById）
 * - remove：repos.notes.delete(false → NOT_FOUND)
 *
 * ── 接口层 ──
 * - export function createNotesService(deps: { repos: Repos }): ApiHandlers['notes']
 *
 * ── 架构层 ──
 * - 薄层；只依赖 repos 桶（禁止 import db/connection，ESLint 强制）
 * - NOT_FOUND 判定需要 papers.findById；域错误与 library/reader 的
 *   DomainError 同构：带 code 的 Error，register 经 toAppError 折叠为 AppError
 *
 * ── 生命周期层 ──
 * - 不做：多篇笔记/双链（负面清单）
 *
 * ── 文化层 ──
 * - 测试：tests/unit/services/notes.service.test.ts（已锁定，repos 桩）
 */
import type { AppErrorCode } from '../../shared/app-error'
import type { ApiHandlers } from '../../shared/ipc/api-surface'
import type { Repos } from '../db/repos'

/** 域错误：save 的"文献不存在"与 remove 的"笔记不存在"载体 */
class NotesDomainError extends Error {
  readonly code: AppErrorCode

  constructor(code: AppErrorCode, message: string) {
    super(message)
    this.name = 'NotesDomainError'
    this.code = code
  }
}

export function createNotesService(deps: { repos: Repos }): ApiHandlers['notes'] {
  const { papers, notes } = deps.repos

  return {
    async get(req) {
      return notes.findByPaper(req.paperId)
    },

    async save(req) {
      if (papers.findById(req.paperId) === null) {
        throw new NotesDomainError('NOT_FOUND', `文献不存在：${req.paperId}`)
      }
      return notes.upsert(req)
    },

    async remove(req) {
      if (!notes.delete(req.noteId)) {
        throw new NotesDomainError('NOT_FOUND', `笔记不存在：${req.noteId}`)
      }
      return { ok: true as const }
    }
  }
}
