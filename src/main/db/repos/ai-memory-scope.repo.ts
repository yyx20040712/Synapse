/**
 * [F-DBCAMP-01 DB-2 U2] ai-memory-scope —— AI 记忆 scope 级读面三原语（自
 * ai-memory.repo 拆出：repo 文件 300 行上限——check-quality 关卡；沿 r3 拆分
 * 先例 ai-tasks.repo→ai-task-audit.repo，同连接组装、经 AiMemoryRepo 委托面
 * 消费——消费方 import 路径零动）。
 *
 * ── 行为层 ──
 * - 三原语均 **scope 单条件（跨锚）**——与既有隔离谓词并存零动：隔离谓词=
 *   会话检索路径恒走（ai-memory-search.service），本面=管理面板 UI 列表/检索。
 *   listByScope（category 等值+pinnedOnly=1 过滤+updated_at DESC,id DESC+limit）/
 *   searchByLikeScope（title/content/label 三列 OR LIKE ESCAPE '\'——pattern=
 *   服务层 %escapeLike(q)% 成品）/searchByMatchScope（FTS MATCH——ftsQuery=
 *   服务层 escapeFtsQuery 成品，fts.ts 单源禁重写）。检索两路排序沿检索口径。
 * - 标题 JOIN=三路 CASE 模板（paper→papers.title/lineage→collections.name/
 *   global→null），返回行=AiMemoryRow & { anchorTitle }（DB 形 pinned 0|1——
 *   IPC 布尔投影归服务层）。
 *
 * ── 文化层 ──
 * - 全语句 db.prepare 预编译+参数绑定（过滤维度经 ? IS NULL OR 固定语句承载
 *   ——listByAnchorStmt 先例；无值拼接进 SQL 文本）。
 * - 测试：tests/unit/db/repos/ai-memory.repo.test.ts（经 AiMemoryRepo 委托面承载）。
 */
import type { SqliteDb } from '../connection'
import type { AiScope } from './ai-sessions.repo'
import { toMemoryRow, type AiMemoryRow, type RawMemoryRow } from './ai-memory.rows'

/** 带锚目标标题的列表行（DB 形） */
type ScopeListRawRow = RawMemoryRow & { anchor_title: string | null }
export type AiMemoryListRow = AiMemoryRow & { anchorTitle: string | null }

const SCOPE_COLS = `m.id, m.scope, m.anchor_id, m.category, m.label, m.title, m.content, m.pinned, m.origin, m.source_task_id, m.created_at, m.updated_at`
const TITLE_JOIN = `FROM ai_memory m
     LEFT JOIN papers p ON m.scope = 'paper' AND p.id = m.anchor_id
     LEFT JOIN collections c ON m.scope = 'lineage' AND c.id = m.anchor_id`
const TITLE_CASE = `CASE WHEN m.scope = 'paper' THEN p.title WHEN m.scope = 'lineage' THEN c.name ELSE NULL END AS anchor_title`

export interface AiMemoryScopeRepo {
  /** 列表模式（category/pinnedOnly 过滤；category 外值=SQL WHERE 自然空结果非拒） */
  listByScope(scope: AiScope, opts: { category?: string; pinnedOnly?: boolean; limit: number }): AiMemoryListRow[]
  /** LIKE 路（pattern=服务层成品） */
  searchByLikeScope(scope: AiScope, pattern: string, limit: number): AiMemoryListRow[]
  /** MATCH 路（ftsQuery=服务层成品） */
  searchByMatchScope(scope: AiScope, ftsQuery: string, limit: number): AiMemoryListRow[]
}

export function createAiMemoryScopeRepo(db: SqliteDb): AiMemoryScopeRepo {
  const listStmt = db.prepare(
    `SELECT ${SCOPE_COLS}, ${TITLE_CASE} ${TITLE_JOIN}
     WHERE m.scope = ? AND (? IS NULL OR m.category = ?) AND (? IS NULL OR m.pinned = 1)
     ORDER BY m.updated_at DESC, m.id DESC LIMIT ?`
  )
  const likeStmt = db.prepare(
    `SELECT ${SCOPE_COLS}, ${TITLE_CASE} ${TITLE_JOIN}
     WHERE m.scope = ? AND (m.title LIKE ? ESCAPE '\\' OR m.content LIKE ? ESCAPE '\\' OR m.label LIKE ? ESCAPE '\\')
     ORDER BY m.updated_at DESC, m.id DESC LIMIT ?`
  )
  const matchStmt = db.prepare(
    `SELECT ${SCOPE_COLS}, ${TITLE_CASE} ${TITLE_JOIN}
     WHERE m.id IN (SELECT rowid FROM ai_memory_fts WHERE ai_memory_fts MATCH ?) AND m.scope = ?
     ORDER BY m.updated_at DESC, m.id DESC LIMIT ?`
  )

  function toListRow(r: ScopeListRawRow): AiMemoryListRow {
    return { ...toMemoryRow(r), anchorTitle: r.anchor_title }
  }

  return {
    listByScope(scope, opts) {
      const rows = listStmt.all(scope, opts.category ?? null, opts.category ?? null, opts.pinnedOnly ? 1 : null, opts.limit)
      return (rows as ScopeListRawRow[]).map(toListRow)
    },

    searchByLikeScope(scope, pattern, limit) {
      return (likeStmt.all(scope, pattern, pattern, pattern, limit) as ScopeListRawRow[]).map(toListRow)
    },

    searchByMatchScope(scope, ftsQuery, limit) {
      return (matchStmt.all(ftsQuery, scope, limit) as ScopeListRawRow[]).map(toListRow)
    }
  }
}
