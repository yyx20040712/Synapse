/**
 * [SR-DB-03] notes.repo —— notes 表仓储（工单：open / weak）
 *
 * ── 行为层 ──
 * - 每篇文献一篇笔记的 upsert（唯一性：同 paper_id 已有则更新，无则插入）
 * - 笔记 FTS 搜索（标题+内容）
 *
 * ── 接口层 ──
 * - export interface NotesRepo：
 *     upsert(input: { paperId: string; title: string; contentMd: string }): Note
 *     findByPaper(paperId: string): Note | null
 *     delete(id: string): boolean
 *     search(q: string): Note[]                // FTS：title/content
 *     countByPaper(paperId: string): number
 *
 * ── 架构层 ──
 * - 依赖：db/connection、db/fts、shared/models/note
 * - upsert 用事务保证"查后插"原子（或 INSERT ... ON CONFLICT，注意本表无唯一约束，需先 SELECT）
 *
 * ── 生命周期层 ──
 * - 不做：多笔记/笔记间链接（负面清单，v1 明确不做）
 *
 * ── 文化层 ──
 * - 测试：tests/unit/db/repos/notes.repo.test.ts（已锁定）
 */
import { unimplementedObject } from '../../../shared/app-error'
import type { Note } from '../../../shared/models/note'
import type { SqliteDb } from '../connection'

export interface NotesRepo {
  upsert(input: { paperId: string; title: string; contentMd: string }): Note
  findByPaper(paperId: string): Note | null
  delete(id: string): boolean
  search(q: string): Note[]
  countByPaper(paperId: string): number
}

export function createNotesRepo(_db: SqliteDb): NotesRepo {
  return unimplementedObject<NotesRepo>('SR-DB-03', 'notes.repo')
}
