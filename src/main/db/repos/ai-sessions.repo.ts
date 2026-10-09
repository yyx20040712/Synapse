/**
 * [F-DBCAMP-01 DB-2 U2a] ai-sessions.repo —— AI 会话/消息仓储原语（020 表族）。
 *
 * ── 行为层 ──
 * - 表=迁移 020 ai_sessions/ai_messages（role∈{user,assistant}——system 不入表，
 *   DDL CHECK 承载；pinned 置顶豁免淘汰）。
 * - insertWithEviction（§3.A 会话 50 上限，单事务=app-meta/级联先例 db.transaction）：
 *   ①excess=COUNT(session_id)+1-CAP；②excess≤0 直插；③excess>0 先汰最旧非置顶
 *   excess 行（victim=非置顶 id ASC=插入序语义）再插入新行；**可汰行不足（非置顶
 *   数<excess）→整体回滚+抛 SessionCapAllPinnedError**（事务回滚零副作用；存量>50
 *   收敛由同一 excess 公式天然承载）。政策不进触发器（单一真相源+typed error 面）。
 * - 淘汰错误形态：本层抛 SessionCapAllPinnedError（带 pinnedCount 实数）——分层
 *   单向（db 层禁依赖 services），服务层捕获后映射 AiDomainError CONFLICT（§3.E）。
 * - setPinned：pinned 翻转+updated_at 刷新（应用层 ISO），其余列不动；未命中 false
 *   零行变更。置顶操作本身无上限（全置顶态自然落入拒写）。
 * - listMessages=ORDER BY id ASC（装配尾段新到旧=U2b 消费面，本批只保稳定序）；
 *   读路径（list/count）永不触发淘汰。
 * - anchorExists（§3.F 多态锚无 FK=服务层校验面，SQL 单源在本层）：
 *   paper→papers.id / lineage→collections.id（ADR-0025 folder↔graph 投影）/
 *   global→无锚恒真。
 * - 时间戳=应用层 new Date().toISOString()（弃 DDL 默认——app-meta/010 口径）。
 *
 * ── 文化层 ──
 * - 全语句 db.prepare 预编译+参数绑定（victim 集经 IN 子查询——不依赖
 *   SQLITE_ENABLE_UPDATE_DELETE_LIMIT 的 DELETE ... LIMIT 方言）。
 * - 测试：tests/unit/db/repos/ai-sessions.repo.test.ts（always-active 真库夹具）。
 */
import type { SqliteDb } from '../connection'

/** 会话消息软上限（消息行计数；2026-10-09 用户裁决 200→50——§3.A） */
export const AI_SESSION_MESSAGE_CAP = 50

/** AI 域三档（020 CHECK 同源枚举） */
export type AiScope = 'paper' | 'lineage' | 'global'

export interface AiSessionRow {
  id: number
  scope: AiScope
  anchorId: string | null
  createdAt: string
  updatedAt: string
}

export interface AiMessageRow {
  id: number
  sessionId: number
  role: 'user' | 'assistant'
  content: string
  pinned: 0 | 1
  createdAt: string
  updatedAt: string
}

/** 拒写态错误（可汰行不足——非置顶数<excess；携带 pinnedCount 实数供服务层文案） */
export class SessionCapAllPinnedError extends Error {
  readonly pinnedCount: number

  constructor(pinnedCount: number) {
    super(`会话消息已达上限且可汰行不足（置顶 ${pinnedCount} 条）`)
    this.name = 'SessionCapAllPinnedError'
    this.pinnedCount = pinnedCount
  }
}

interface RawMessageRow {
  id: number
  session_id: number
  role: 'user' | 'assistant'
  content: string
  pinned: 0 | 1
  created_at: string
  updated_at: string
}

export interface AiSessionsRepo {
  createSession(scope: AiScope, anchorId: string | null): AiSessionRow
  /** 多态锚存在性（§3.F：paper→papers.id/lineage→collections.id/global 恒真） */
  anchorExists(scope: AiScope, anchorId: string | null): boolean
  /** 写时同步淘汰（§3.A 三步单事务；拒写=SessionCapAllPinnedError 整体回滚） */
  insertWithEviction(sessionId: number, role: 'user' | 'assistant', content: string): AiMessageRow
  /** 读路径计数（永不触发淘汰） */
  countMessages(sessionId: number): number
  /** 置顶翻转（updated_at 刷新）；未命中 false 零行变更 */
  setPinned(messageId: number, pinned: boolean): boolean
  listMessages(sessionId: number): AiMessageRow[]
}

export function createAiSessionsRepo(db: SqliteDb): AiSessionsRepo {
  const insertSessionStmt = db.prepare(
    `INSERT INTO ai_sessions (scope, anchor_id, created_at, updated_at) VALUES (?, ?, ?, ?)`
  )
  const sessionByIdStmt = db.prepare(
    `SELECT id, scope, anchor_id, created_at, updated_at FROM ai_sessions WHERE id = ?`
  )
  const paperAnchorStmt = db.prepare(`SELECT 1 AS hit FROM papers WHERE id = ? LIMIT 1`)
  const lineageAnchorStmt = db.prepare(`SELECT 1 AS hit FROM collections WHERE id = ? LIMIT 1`)
  const countStmt = db.prepare(`SELECT COUNT(*) AS c FROM ai_messages WHERE session_id = ?`)
  const pinnedCountStmt = db.prepare(
    `SELECT COUNT(*) AS c FROM ai_messages WHERE session_id = ? AND pinned = 1`
  )
  const evictableCountStmt = db.prepare(
    `SELECT COUNT(*) AS c FROM ai_messages WHERE session_id = ? AND pinned = 0`
  )
  // victim 集=非置顶 id ASC（插入序）——外层无过滤，victim 选择单源在子查询
  const evictStmt = db.prepare(
    `DELETE FROM ai_messages WHERE id IN (
       SELECT id FROM ai_messages WHERE session_id = ? AND pinned = 0 ORDER BY id ASC LIMIT ?
     )`
  )
  const insertMsgStmt = db.prepare(
    `INSERT INTO ai_messages (session_id, role, content, pinned, created_at, updated_at)
     VALUES (?, ?, ?, 0, ?, ?)`
  )
  const setPinnedStmt = db.prepare(
    `UPDATE ai_messages SET pinned = ?, updated_at = ? WHERE id = ?`
  )
  const listStmt = db.prepare(
    `SELECT id, session_id, role, content, pinned, created_at, updated_at FROM ai_messages
     WHERE session_id = ? ORDER BY id ASC`
  )

  function toMessage(r: RawMessageRow): AiMessageRow {
    return {
      id: r.id,
      sessionId: r.session_id,
      role: r.role,
      content: r.content,
      pinned: r.pinned,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }
  }

  // 单事务三步（§3.A）：计数→（不足即抛=整体回滚）→汰旧→插入
  const insertWithEvictionTx = db.transaction(
    (sessionId: number, role: 'user' | 'assistant', content: string): AiMessageRow => {
      const count = (countStmt.get(sessionId) as { c: number }).c
      const excess = count + 1 - AI_SESSION_MESSAGE_CAP
      if (excess > 0) {
        const evictable = (evictableCountStmt.get(sessionId) as { c: number }).c
        if (evictable < excess) {
          const pinned = (pinnedCountStmt.get(sessionId) as { c: number }).c
          throw new SessionCapAllPinnedError(pinned)
        }
        evictStmt.run(sessionId, excess)
      }
      const now = new Date().toISOString()
      const info = insertMsgStmt.run(sessionId, role, content, now, now)
      return {
        id: Number(info.lastInsertRowid),
        sessionId,
        role,
        content,
        pinned: 0,
        createdAt: now,
        updatedAt: now
      }
    }
  )

  return {
    createSession(scope, anchorId) {
      const now = new Date().toISOString()
      const info = insertSessionStmt.run(scope, anchorId, now, now)
      const row = sessionByIdStmt.get(Number(info.lastInsertRowid)) as {
        id: number
        scope: AiScope
        anchor_id: string | null
        created_at: string
        updated_at: string
      }
      return {
        id: row.id,
        scope: row.scope,
        anchorId: row.anchor_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }
    },

    anchorExists(scope, anchorId) {
      if (scope === 'global') return true
      if (anchorId === null) return false
      const stmt = scope === 'paper' ? paperAnchorStmt : lineageAnchorStmt
      return stmt.get(anchorId) !== undefined
    },

    insertWithEviction(sessionId, role, content) {
      return insertWithEvictionTx(sessionId, role, content)
    },

    countMessages(sessionId) {
      return (countStmt.get(sessionId) as { c: number }).c
    },

    setPinned(messageId, pinned) {
      const info = setPinnedStmt.run(pinned ? 1 : 0, new Date().toISOString(), messageId)
      return info.changes > 0
    },

    listMessages(sessionId) {
      return (listStmt.all(sessionId) as RawMessageRow[]).map(toMessage)
    }
  }
}
