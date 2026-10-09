/**
 * [F-DBCAMP-01 DB-2 U2a] ai-memory.repo —— AI 记忆检索原语（020 ai_memory/FTS）。
 *
 * ── 行为层 ──
 * - 两路检索原语（本批不做 CRUD 写面）：
 *   searchByLike（title/content/label 三列 OR——pattern 由服务层构造
 *   %escapeLike(q)%，SQL 侧恒带 ESCAPE '\'）；
 *   searchByMatch（ai_memory_fts MATCH→取 ai_memory 全列行——external content
 *   rowid 直用 id，papers_fts IN 子查询先例）。
 * - 隔离谓词（裁定①：三档完全隔离**无并集**——§3.C 逐字）：
 *   paper/lineage→scope+anchor_id 双条件（仅本锚行）；global→scope 单条件
 *   （global 行全集，不注入文献/脉络行）。两路 SQL 同一谓词；禁 UNION/并集面。
 * - 排序两路同口径 (updated_at DESC, id DESC)；LIMIT=绑定参数（topK 由服务层单源）。
 *
 * ── 文化层 ──
 * - 谓词为封闭三值常量→按 (路×scope) 预编译 6 语句（无任何值拼接进 SQL 文本）。
 * - 测试：tests/unit/services/ai-memory-search.service.test.ts（服务层路由+隔离
 *   断言承载；本件无独立测试文件——原语消费面唯一）。
 */
import type { SqliteDb } from '../connection'
import type { AiScope } from './ai-sessions.repo'

export interface AiMemoryRow {
  id: number
  scope: AiScope
  anchorId: string | null
  category: string
  label: string | null
  title: string
  content: string
  pinned: 0 | 1
  origin: 'manual' | 'agent'
  sourceTaskId: number | null
  createdAt: string
  updatedAt: string
}

interface RawMemoryRow {
  id: number
  scope: AiScope
  anchor_id: string | null
  category: string
  label: string | null
  title: string
  content: string
  pinned: 0 | 1
  origin: 'manual' | 'agent'
  source_task_id: number | null
  created_at: string
  updated_at: string
}

const MEMORY_COLS = `id, scope, anchor_id, category, label, title, content, pinned, origin, source_task_id, created_at, updated_at`

/** 隔离谓词（§3.C 逐字承载——常量内联进预编译文本，非运行时拼值） */
type ScopePredicate = { sql: string; withAnchor: boolean }
const PREDICATE: Record<AiScope, ScopePredicate> = {
  paper: { sql: `scope = 'paper' AND anchor_id = ?`, withAnchor: true },
  lineage: { sql: `scope = 'lineage' AND anchor_id = ?`, withAnchor: true },
  global: { sql: `scope = 'global'`, withAnchor: false }
}

function likeSql(pred: string): string {
  return `SELECT ${MEMORY_COLS} FROM ai_memory WHERE ${pred}
      AND (title LIKE ? ESCAPE '\\' OR content LIKE ? ESCAPE '\\' OR label LIKE ? ESCAPE '\\')
     ORDER BY updated_at DESC, id DESC LIMIT ?`
}

function matchSql(pred: string): string {
  return `SELECT ${MEMORY_COLS} FROM ai_memory
     WHERE id IN (SELECT rowid FROM ai_memory_fts WHERE ai_memory_fts MATCH ?)
       AND ${pred}
     ORDER BY updated_at DESC, id DESC LIMIT ?`
}

export interface AiMemoryRepo {
  /** LIKE 路（pattern=服务层 %escapeLike(q)% 成品；三列 OR+ESCAPE '\'） */
  searchByLike(scope: AiScope, anchorId: string | null, pattern: string, limit: number): AiMemoryRow[]
  /** MATCH 路（ftsQuery=服务层 escapeFtsQuery 成品——fts.ts 单源，本层禁重写） */
  searchByMatch(scope: AiScope, anchorId: string | null, ftsQuery: string, limit: number): AiMemoryRow[]
}

export function createAiMemoryRepo(db: SqliteDb): AiMemoryRepo {
  const stmt = {
    like: {
      paper: db.prepare(likeSql(PREDICATE.paper.sql)),
      lineage: db.prepare(likeSql(PREDICATE.lineage.sql)),
      global: db.prepare(likeSql(PREDICATE.global.sql))
    },
    match: {
      paper: db.prepare(matchSql(PREDICATE.paper.sql)),
      lineage: db.prepare(matchSql(PREDICATE.lineage.sql)),
      global: db.prepare(matchSql(PREDICATE.global.sql))
    }
  }

  function toRow(r: RawMemoryRow): AiMemoryRow {
    return {
      id: r.id,
      scope: r.scope,
      anchorId: r.anchor_id,
      category: r.category,
      label: r.label,
      title: r.title,
      content: r.content,
      pinned: r.pinned,
      origin: r.origin,
      sourceTaskId: r.source_task_id,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }
  }

  function run(
    route: 'like' | 'match',
    scope: AiScope,
    anchorId: string | null,
    value: string,
    limit: number
  ): AiMemoryRow[] {
    const s = stmt[route][scope]
    // 绑定序=SQL 占位符出现序：LIKE 路=锚(如有)→pattern×3→limit；MATCH 路=fts→锚(如有)→limit
    const params: unknown[] =
      route === 'like'
        ? PREDICATE[scope].withAnchor
          ? [anchorId, value, value, value, limit]
          : [value, value, value, limit]
        : PREDICATE[scope].withAnchor
          ? [value, anchorId, limit]
          : [value, limit]
    return (s.all(...params) as RawMemoryRow[]).map(toRow)
  }

  return {
    searchByLike(scope, anchorId, pattern, limit) {
      return run('like', scope, anchorId, pattern, limit)
    },
    searchByMatch(scope, anchorId, ftsQuery, limit) {
      return run('match', scope, anchorId, ftsQuery, limit)
    }
  }
}
