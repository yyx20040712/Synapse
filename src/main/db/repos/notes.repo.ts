/**
 * [SR-DB-03] notes.repo —— notes 表仓储（工单：open / weak）
 * [A2 F-CONTRACTA-01 2026-10-04] title 停用：写链去列（DDL DEFAULT '' 自动
 * 生效）、读面不映射（NoteRow.title 死置=DDL 镜像，清列归 D 批）；FTS 虚表
 * 与触发器零触碰（空串零 token——命中只由 content 驱动）。
 *
 * ── 行为层 ──
 * - 每篇文献一篇笔记的 upsert（唯一性：同 paper_id 已有则更新，无则插入）
 * - 笔记 FTS 搜索（内容）
 *
 * ── 接口层 ──
 * - export interface NotesRepo：
 *     upsert(input: { paperId: string; contentMd: string }): Note
 *     findByPaper(paperId: string): Note | null
 *     delete(id: string): boolean
 *     search(q: string): Note[]                // FTS：content
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
import { randomUUID } from 'node:crypto'
import type { Note } from '../../../shared/models/note'
import { escapeFtsQuery } from '../fts'
import type { SqliteDb } from '../connection'

export interface NotesRepo {
  upsert(input: { paperId: string; contentMd: string }): Note
  findByPaper(paperId: string): Note | null
  delete(id: string): boolean
  search(q: string): Note[]
  countByPaper(paperId: string): number
}

/** notes 表行形状（列名原样，蛇形；title=[A2] 死置列——DDL 镜像保留
 *  （NOT NULL DEFAULT ''，SELECT 不取、运行时无此键；清列归 D 批）——
 *  LineageNodeRow.tags 死置先例同型） */
interface NoteRow {
  id: string
  paper_id: string
  title: string
  content_md: string
  created_at: string
  updated_at: string
}

/** 行 → 领域模型（蛇列名 → 驼峰字段；title 死置不映射——见 NoteRow 注） */
function toNote(row: NoteRow): Note {
  return {
    id: row.id,
    paperId: row.paper_id,
    contentMd: row.content_md,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

/** LIKE 兜底转义：% 与 _ 与 \ 前加反斜杠（配合 SQL 中的 ESCAPE '\'） */
function escapeLike(input: string): string {
  return input.replace(/[\\%_]/g, (ch) => `\\${ch}`)
}

export function createNotesRepo(db: SqliteDb): NotesRepo {
  const selectByPaper = db.prepare(
    'SELECT id, paper_id, content_md, created_at, updated_at FROM notes WHERE paper_id = ?'
  )
  const selectById = db.prepare(
    'SELECT id, paper_id, content_md, created_at, updated_at FROM notes WHERE id = ?'
  )
  const insertNote = db.prepare(
    'INSERT INTO notes (id, paper_id, content_md, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
  )
  const updateNote = db.prepare('UPDATE notes SET content_md = ?, updated_at = ? WHERE id = ?')
  const deleteById = db.prepare('DELETE FROM notes WHERE id = ?')
  const countStmt = db.prepare('SELECT COUNT(*) AS n FROM notes WHERE paper_id = ?')
  // FTS5 external content：行数据在 notes 表，notes_fts 只存索引（触发器自动同步）
  const selectByFts = db.prepare(
    `SELECT n.id, n.paper_id, n.content_md, n.created_at, n.updated_at
     FROM notes_fts JOIN notes n ON n.rowid = notes_fts.rowid
     WHERE notes_fts MATCH ? ORDER BY notes_fts.rank`
  )
  // trigram 分词器查询串须 ≥3 字符；更短（如 2 字中文"漏损"）用 LIKE 兜底
  // （平局决胜=rowid 插入序，DESC 序后插在前——id=随机 uuid 不作决胜键）
  const selectByLike = db.prepare(
    `SELECT id, paper_id, content_md, created_at, updated_at FROM notes
     WHERE content_md LIKE ? ESCAPE '\\'
     ORDER BY updated_at DESC, rowid DESC`
  )

  /** 按 id 回读刚写入的行；事务内紧跟写入，读不到即数据损坏，直接抛错 */
  const readById = (id: string): Note => {
    const row = selectById.get(id) as NoteRow | undefined
    if (row === undefined) {
      throw new Error(`notes.repo：写入后回读失败（id=${id}）`)
    }
    return toNote(row)
  }

  // 表无 paper_id 唯一约束，无法用 ON CONFLICT —— 事务内"先查后插/改"保证原子
  const upsertTx = db.transaction(
    (input: { paperId: string; contentMd: string }): Note => {
      const existing = selectByPaper.get(input.paperId) as NoteRow | undefined
      const now = new Date().toISOString()
      if (existing !== undefined) {
        updateNote.run(input.contentMd, now, existing.id)
        return readById(existing.id)
      }
      const id = randomUUID()
      insertNote.run(id, input.paperId, input.contentMd, now, now)
      return readById(id)
    }
  )

  return {
    upsert: (input) => upsertTx(input),
    findByPaper: (paperId) => {
      const row = selectByPaper.get(paperId) as NoteRow | undefined
      return row === undefined ? null : toNote(row)
    },
    delete: (id) => deleteById.run(id).changes > 0,
    search: (q) => {
      const trimmed = q.trim()
      if (trimmed === '') {
        return []
      }
      if (trimmed.length >= 3) {
        return (selectByFts.all(escapeFtsQuery(trimmed)) as NoteRow[]).map(toNote)
      }
      const pattern = `%${escapeLike(trimmed)}%`
      return (selectByLike.all(pattern) as NoteRow[]).map(toNote)
    },
    countByPaper: (paperId) => (countStmt.get(paperId) as { n: number }).n
  }
}
