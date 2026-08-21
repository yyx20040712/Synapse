/**
 * [SR-SVC-10] notes.service —— 笔记用例（工单：open / weak）
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
 * - 薄层；NOT_FOUND 判定需要 papers.findById
 *
 * ── 生命周期层 ──
 * - 不做：多篇笔记/双链（负面清单）
 *
 * ── 文化层 ──
 * - 测试：tests/unit/services/notes.service.test.ts（已锁定，repos 桩）
 */
import { unimplementedObject } from '../../shared/app-error'
import type { ApiHandlers } from '../../shared/ipc/api-surface'
import type { Repos } from '../db/repos'

export function createNotesService(_deps: { repos: Repos }): ApiHandlers['notes'] {
  return unimplementedObject<ApiHandlers['notes']>('SR-SVC-10', 'notes.service')
}
