/**
 * [F-DBCAMP-01 DB-2 U2a/U2b-1] ai-memory.repo —— AI 记忆原语（020 ai_memory/FTS）。
 * [r3 拆分注记] 行形状/列常量/行映射外移 ai-memory.rows.ts（repo 300 行上限——
 * check-quality 关卡；导出面经本件 re-export 零变——消费方 import 路径不动）。
 *
 * ── 行为层（U2a 面——零改动冻结） ──
 * - 两路隔离检索原语：
 *   searchByLike（title/content/label 三列 OR——pattern 由服务层构造
 *   %escapeLike(q)%，SQL 侧恒带 ESCAPE '\'）；
 *   searchByMatch（ai_memory_fts MATCH→取 ai_memory 全列行——external content
 *   rowid 直用 id，papers_fts IN 子查询先例）。
 * - 隔离谓词（裁定①：三档完全隔离**无并集**——§3.C 逐字）：
 *   paper/lineage→scope+anchor_id 双条件（仅本锚行）；global→scope 单条件
 *   （global 行全集，不注入文献/脉络行）。两路 SQL 同一谓词；禁 UNION/并集面。
 *   **用户会话检索路径（ai-memory-search.service）恒走隔离面——U2b-1 裁④零改动。**
 * - 排序两路同口径 (updated_at DESC, id DESC)；LIMIT=绑定参数（topK 由服务层单源）。
 *
 * ── 行为层（U2b-1 扩写） ──
 * - 写原语（任务系统 handler 消费）：create（origin/source_task_id 落位——INV-128
 *   同锚不变量的写入点）/update（部分字段 COALESCE+updated_at 刷新——FTS _au
 *   触发器自动同步）/delete（行灭——FTS/epoch 触发器自动）/setPinned（翻转+
 *   updated_at）/getById/listByAnchor（管理面板读面——隔离序同检索口径）。
 * - 并集检索三原语（裁④：代理可见集=目标锚∪global——**仅任务 handler 消费**）：
 *   searchByLikeUnion/searchByMatchUnion/listUnion，谓词=
 *   ((scope=target AND anchor_id=?) OR scope='global')——与隔离 PREDICATE 并存
 *   （隔离三值常量与既有 6 预编译语句零改动）。
 *
 * ── 文化层 ──
 * - 谓词为封闭常量→按路×scope 预编译（无任何值拼接进 SQL 文本）；并集谓词目标
 *   scope 经绑定参数（paper/lineage 同语句——'global' 为 SQL 字面量）。
 * - 测试：tests/unit/db/repos/ai-memory.repo.test.ts（U2b-1 写原语+并集面+
 *   隔离回归）+tests/unit/services/ai-memory-search.service.test.ts（U2a 隔离
 *   路由——497/500 行禁碰）。
 */
import type { SqliteDb } from '../connection'
import type { AiScope } from './ai-sessions.repo'
import {
  createAiMemoryScopeRepo,
  type AiMemoryListRow
} from './ai-memory-scope.repo'
import {
  MEMORY_COLS,
  toMemoryRow as toRow,
  type AiMemoryRow,
  type RawMemoryRow
} from './ai-memory.rows'

// 导出面零变（拆分前本件导出的行类型经 re-export 承载——消费方路径不动）
export type { AiMemoryRow } from './ai-memory.rows'

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

/** 并集谓词（U2b-1 裁④——代理可见集=目标锚∪global；'global'=SQL 字面量，
 *  目标 scope/anchor 经绑定参数——与隔离 PREDICATE 并存互不影响） */
const UNION_PREDICATE = `((scope = ? AND anchor_id = ?) OR scope = 'global')`

function likeUnionSql(): string {
  return `SELECT ${MEMORY_COLS} FROM ai_memory WHERE ${UNION_PREDICATE}
      AND (title LIKE ? ESCAPE '\\' OR content LIKE ? ESCAPE '\\' OR label LIKE ? ESCAPE '\\')
     ORDER BY updated_at DESC, id DESC LIMIT ?`
}

function matchUnionSql(): string {
  return `SELECT ${MEMORY_COLS} FROM ai_memory
     WHERE id IN (SELECT rowid FROM ai_memory_fts WHERE ai_memory_fts MATCH ?)
       AND ${UNION_PREDICATE}
     ORDER BY updated_at DESC, id DESC LIMIT ?`
}

function listUnionSql(): string {
  return `SELECT ${MEMORY_COLS} FROM ai_memory WHERE ${UNION_PREDICATE}
       AND (? IS NULL OR category = ?)
     ORDER BY updated_at DESC, id DESC LIMIT ?`
}

/** 任务行目标 scope（ai_tasks CHECK 面——global 不可为任务目标） */
export type AiTaskScope = 'paper' | 'lineage'

/** 记忆写原语载荷（create——origin/sourceTaskId 由任务 handler 显式落位） */
export interface AiMemoryCreateInput {
  category: string
  title: string
  content: string
  label?: string | null
  origin: 'manual' | 'agent'
  sourceTaskId?: number | null
}

/** 部分更新载荷（update——出席字段才刷，缺席=null=COALESCE 保持原值；category
 *  档级归属校验在服务层〔zod 只验 19 值并集——ai-schemas.ts 接缝注释〕） */
export interface AiMemoryUpdateInput {
  title?: string
  content?: string
  label?: string | null
  category?: string
}

export interface AiMemoryRepo {
  /** LIKE 路（pattern=服务层 %escapeLike(q)% 成品；三列 OR+ESCAPE '\'） */
  searchByLike(scope: AiScope, anchorId: string | null, pattern: string, limit: number): AiMemoryRow[]
  /** MATCH 路（ftsQuery=服务层 escapeFtsQuery 成品——fts.ts 单源，本层禁重写） */
  searchByMatch(scope: AiScope, anchorId: string | null, ftsQuery: string, limit: number): AiMemoryRow[]
  /** 单行读（任务 handler 围栏判定面） */
  getById(memoryId: number): AiMemoryRow | null
  /** 写入（INV-128 写入点：scope/anchor=任务目标，sourceTaskId 同锚任务） */
  create(scope: 'paper' | 'lineage' | 'global', anchorId: string | null, input: AiMemoryCreateInput): AiMemoryRow
  /** 部分字段更新（updated_at 刷新；缺席 id → null） */
  update(memoryId: number, input: AiMemoryUpdateInput): AiMemoryRow | null
  /** 行灭（FTS/epoch 触发器自动；缺席 false 零行变更） */
  delete(memoryId: number): boolean
  /** 置顶翻转（updated_at 刷新；缺席 false） */
  setPinned(memoryId: number, pinned: boolean): boolean
  /** 本锚清单（管理面板读面——序同检索口径；category 缺省=null 全类） */
  listByAnchor(scope: AiScope, anchorId: string, opts: { category?: string | null; limit: number }): AiMemoryRow[]
  /** 并集 LIKE 路（裁④代理可见集=目标锚∪global） */
  searchByLikeUnion(targetScope: AiTaskScope, targetAnchor: string, pattern: string, limit: number): AiMemoryRow[]
  /** 并集 MATCH 路（同上） */
  searchByMatchUnion(targetScope: AiTaskScope, targetAnchor: string, ftsQuery: string, limit: number): AiMemoryRow[]
  /** 并集清单（同上；category 缺省=null 全类） */
  listUnion(targetScope: AiTaskScope, targetAnchor: string, category: string | null, limit: number): AiMemoryRow[]
  /** [F-DBCAMP-01 DB-2 U2] scope 级三原语（跨锚——管理面板 UI 面；SQL/映射单源=
   *  ai-memory-scope.repo 拆件，本面委托——repo 300 行上限 r3 先例） */
  listByScope(scope: AiScope, opts: { category?: string; pinnedOnly?: boolean; limit: number }): AiMemoryListRow[]
  searchByLikeScope(scope: AiScope, pattern: string, limit: number): AiMemoryListRow[]
  searchByMatchScope(scope: AiScope, ftsQuery: string, limit: number): AiMemoryListRow[]
}

export function createAiMemoryRepo(db: SqliteDb): AiMemoryRepo {
  // [F-DBCAMP-01 DB-2 U2] scope 级读面拆件（同连接组装——委托面承载）
  const scope = createAiMemoryScopeRepo(db)
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
  const getByIdStmt = db.prepare(`SELECT ${MEMORY_COLS} FROM ai_memory WHERE id = ?`)
  const insertStmt = db.prepare(
    `INSERT INTO ai_memory (scope, anchor_id, category, label, title, content, pinned,
       origin, source_task_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)`
  )
  // 部分更新=COALESCE（缺席字段 null 保持原值——label 载荷仅「出席=string」形态；
  // category 同款缺席保持〔U2 扩列〕）
  const updateStmt = db.prepare(
    `UPDATE ai_memory SET title = COALESCE(?, title), content = COALESCE(?, content),
       label = COALESCE(?, label), category = COALESCE(?, category), updated_at = ? WHERE id = ?`
  )
  const deleteStmt = db.prepare(`DELETE FROM ai_memory WHERE id = ?`)
  const setPinnedStmt = db.prepare(`UPDATE ai_memory SET pinned = ?, updated_at = ? WHERE id = ?`)
  const listByAnchorStmt = db.prepare(
    `SELECT ${MEMORY_COLS} FROM ai_memory WHERE scope = ? AND anchor_id = ?
       AND (? IS NULL OR category = ?)
     ORDER BY updated_at DESC, id DESC LIMIT ?`
  )
  const likeUnionStmt = db.prepare(likeUnionSql())
  const matchUnionStmt = db.prepare(matchUnionSql())
  const listUnionStmt = db.prepare(listUnionSql())

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
    },

    getById(memoryId) {
      const row = getByIdStmt.get(memoryId) as RawMemoryRow | undefined
      return row === undefined ? null : toRow(row)
    },

    create(scope, anchorId, input) {
      const now = new Date().toISOString()
      const info = insertStmt.run(
        scope,
        anchorId,
        input.category,
        input.label ?? null,
        input.title,
        input.content,
        input.origin,
        input.sourceTaskId ?? null,
        now,
        now
      )
      return toRow(getByIdStmt.get(Number(info.lastInsertRowid)) as RawMemoryRow)
    },

    update(memoryId, input) {
      const info = updateStmt.run(
        input.title ?? null,
        input.content ?? null,
        input.label ?? null,
        input.category ?? null,
        new Date().toISOString(),
        memoryId
      )
      if (info.changes === 0) return null
      return toRow(getByIdStmt.get(memoryId) as RawMemoryRow)
    },

    delete(memoryId) {
      return deleteStmt.run(memoryId).changes > 0
    },

    setPinned(memoryId, pinned) {
      return setPinnedStmt.run(pinned ? 1 : 0, new Date().toISOString(), memoryId).changes > 0
    },

    listByAnchor(scope, anchorId, opts) {
      const params = [scope, anchorId, opts.category ?? null, opts.category ?? null, opts.limit]
      return (listByAnchorStmt.all(...params) as RawMemoryRow[]).map(toRow)
    },

    searchByLikeUnion(targetScope, targetAnchor, pattern, limit) {
      // 绑定序=并集谓词（scope,anchor）→pattern×3→limit
      return (
        likeUnionStmt.all(targetScope, targetAnchor, pattern, pattern, pattern, limit) as RawMemoryRow[]
      ).map(toRow)
    },

    searchByMatchUnion(targetScope, targetAnchor, ftsQuery, limit) {
      // 绑定序=ftsQuery→并集谓词（scope,anchor）→limit
      return (matchUnionStmt.all(ftsQuery, targetScope, targetAnchor, limit) as RawMemoryRow[]).map(
        toRow
      )
    },

    listUnion(targetScope, targetAnchor, category, limit) {
      return (listUnionStmt.all(targetScope, targetAnchor, category, category, limit) as RawMemoryRow[]).map(
        toRow
      )
    },

    listByScope(s, opts) {
      return scope.listByScope(s, opts)
    },

    searchByLikeScope(s, pattern, limit) {
      return scope.searchByLikeScope(s, pattern, limit)
    },

    searchByMatchScope(s, ftsQuery, limit) {
      return scope.searchByMatchScope(s, ftsQuery, limit)
    }
  }
}
