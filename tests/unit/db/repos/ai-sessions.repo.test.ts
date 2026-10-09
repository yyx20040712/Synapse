/**
 * [F-DBCAMP-01 DB-2 U2a] ai-sessions.repo 锁定测试（always-active——app-meta.repo
 * .test 同型真库夹具）。
 *
 * 覆盖（简报 §4 矩阵 M1-M12）：会话 50 上限 5 态边界（常态直插/恰满零汰/满员汰旧/
 * 全置顶拒写/存量>50 收敛）+victim 序（非置顶 id ASC）+pin 往返+缺席零行变更+
 * 列表稳定序（id ASC）+应用层 ISO 时间戳（弃 DDL DEFAULT——app-meta/010 口径）。
 * 读路径零副作用（list/count 永不触发淘汰）随各只读断言共证。
 * always-active（不经 guardedDescribe）。
 */
import { describe, expect, it } from 'vitest'
import {
  AI_SESSION_MESSAGE_CAP,
  createAiSessionsRepo,
  SessionCapAllPinnedError
} from '../../../../src/main/db/repos/ai-sessions.repo'
import { createTestDb } from '../../../utils/fixtures'

type Db = ReturnType<typeof createTestDb>

interface RawMessageRow {
  id: number
  role: string
  content: string
  pinned: number
  created_at: string
  updated_at: string
}

/** 直插会话行（global 无锚——ai_sessions CHECK 合法形态；1970 哨兵与应用层写对比） */
function seedSession(db: Db): number {
  const r = db
    .prepare(
      `INSERT INTO ai_sessions (scope, anchor_id, created_at, updated_at)
       VALUES ('global', NULL, '1970-01-01T00:00:00.000Z', '1970-01-01T00:00:00.000Z')`
    )
    .run()
  return Number(r.lastInsertRowid)
}

/** 直插消息（绕过 repo 写面——构造 50/55 存量与置顶形态；哨兵时间戳） */
function seedMessage(db: Db, sessionId: number, i: number, pinned: 0 | 1 = 0): void {
  db.prepare(
    `INSERT INTO ai_messages (session_id, role, content, pinned, created_at, updated_at)
     VALUES (?, 'user', ?, ?, '1970-01-01T00:00:00.000Z', '1970-01-01T00:00:00.000Z')`
  ).run(sessionId, `消息${i}`, pinned)
}

function seedN(db: Db, sessionId: number, n: number, pinned: 0 | 1 = 0): void {
  for (let i = 1; i <= n; i++) seedMessage(db, sessionId, i, pinned)
}

function pinById(db: Db, id: number): void {
  db.prepare('UPDATE ai_messages SET pinned = 1 WHERE id = ?').run(id)
}

/** 直读全行（绕过 repo 读面——断言落库真值；id ASC 序） */
function rawMessages(db: Db, sessionId: number): RawMessageRow[] {
  return db
    .prepare(
      `SELECT id, role, content, pinned, created_at, updated_at FROM ai_messages
       WHERE session_id = ? ORDER BY id ASC`
    )
    .all(sessionId) as RawMessageRow[]
}

function ids(range: number, from = 1): number[] {
  return Array.from({ length: range }, (_, i) => i + from)
}

const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/

describe('F-DBCAMP-01 DB-2 U2a ai-sessions.repo —— 会话 50 上限原语', () => {
  it('M1 常态直插：<50 零淘汰+id 递增（count/列表序双证）', () => {
    const db = createTestDb()
    const repo = createAiSessionsRepo(db)
    const s = seedSession(db)
    const rows = [
      repo.insertWithEviction(s, 'user', '第一条'),
      repo.insertWithEviction(s, 'assistant', '第二条'),
      repo.insertWithEviction(s, 'user', '第三条')
    ]
    expect(rows.map((r) => r.id)).toEqual([1, 2, 3])
    expect(repo.countMessages(s)).toBe(3)
    expect(repo.listMessages(s).map((r) => r.content)).toEqual(['第一条', '第二条', '第三条'])
    db.close()
  })

  it('M2 恰满插第 50 条零汰（49 存量→excess=0 直插）', () => {
    const db = createTestDb()
    const repo = createAiSessionsRepo(db)
    const s = seedSession(db)
    seedN(db, s, AI_SESSION_MESSAGE_CAP - 1)
    repo.insertWithEviction(s, 'user', `第 ${AI_SESSION_MESSAGE_CAP} 条`)
    expect(repo.countMessages(s)).toBe(AI_SESSION_MESSAGE_CAP)
    // 零淘汰=存量行全保留（含最旧 id 1）
    expect(repo.listMessages(s).map((r) => r.id)).toEqual(ids(AI_SESSION_MESSAGE_CAP))
    db.close()
  })

  it('M3 满员有可汰：50 行含 3 置顶→插新汰最旧非置顶 1 行+置顶全保留', () => {
    const db = createTestDb()
    const repo = createAiSessionsRepo(db)
    const s = seedSession(db)
    seedN(db, s, AI_SESSION_MESSAGE_CAP)
    for (const id of [2, 5, 9]) pinById(db, id)
    repo.insertWithEviction(s, 'assistant', '新消息')
    const rows = repo.listMessages(s)
    expect(rows.length).toBe(AI_SESSION_MESSAGE_CAP)
    // victim=最旧非置顶（id 1——置顶 id 2/5/9 均比它新但受豁免）
    expect(rows.some((r) => r.id === 1)).toBe(false)
    for (const id of [2, 5, 9]) {
      expect(rows.find((r) => r.id === id)?.pinned).toBe(1)
    }
    db.close()
  })

  it('M4 全置顶拒写：typed error（SessionCapAllPinnedError 带 pinnedCount 实数）', () => {
    const db = createTestDb()
    const repo = createAiSessionsRepo(db)
    const s = seedSession(db)
    seedN(db, s, AI_SESSION_MESSAGE_CAP, 1)
    let err: unknown
    try {
      repo.insertWithEviction(s, 'user', '拒写探针')
    } catch (e) {
      err = e
    }
    expect(err).toBeInstanceOf(SessionCapAllPinnedError)
    expect((err as SessionCapAllPinnedError).pinnedCount).toBe(AI_SESSION_MESSAGE_CAP)
    db.close()
  })

  it('M5 拒写后库态逐行不变（回滚原子性——行数+逐行内容比对）', () => {
    const db = createTestDb()
    const repo = createAiSessionsRepo(db)
    const s = seedSession(db)
    seedN(db, s, AI_SESSION_MESSAGE_CAP, 1)
    const before = rawMessages(db, s)
    expect(before.length).toBe(AI_SESSION_MESSAGE_CAP)
    expect(() => repo.insertWithEviction(s, 'assistant', '再拒写探针')).toThrow(
      SessionCapAllPinnedError
    )
    expect(rawMessages(db, s)).toEqual(before)
    db.close()
  })

  it('M6 victim 序=非置顶 id ASC（乱序 pin：置顶 id 1/3 后 victim=id 2 非 id 1）', () => {
    const db = createTestDb()
    const repo = createAiSessionsRepo(db)
    const s = seedSession(db)
    seedN(db, s, AI_SESSION_MESSAGE_CAP)
    // 乱序 pin（置顶操作序≠id 序——victim 判定只看 pinned 状态+id ASC）
    pinById(db, 3)
    pinById(db, 1)
    repo.insertWithEviction(s, 'user', '触发汰旧')
    const rows = repo.listMessages(s)
    expect(rows.length).toBe(AI_SESSION_MESSAGE_CAP)
    // victim=最旧非置顶=id 2；置顶 id 1/3 豁免保留
    expect(rows.some((r) => r.id === 2)).toBe(false)
    expect(rows.find((r) => r.id === 1)?.pinned).toBe(1)
    expect(rows.find((r) => r.id === 3)?.pinned).toBe(1)
    db.close()
  })

  it('M7 存量 55 行收敛：插新汰 6 至 50（excess=55+1-50——200 时代遗留行路径）', () => {
    const db = createTestDb()
    const repo = createAiSessionsRepo(db)
    const s = seedSession(db)
    seedN(db, s, 55)
    repo.insertWithEviction(s, 'user', '收敛探针')
    const rows = repo.listMessages(s)
    expect(rows.length).toBe(AI_SESSION_MESSAGE_CAP)
    // 汰 id 1-6（最旧非置顶 6 行）；存量 7-55 保留+新行 id 56
    expect(rows.map((r) => r.id)).toEqual(ids(AI_SESSION_MESSAGE_CAP, 7))
    db.close()
  })

  it('M8 收敛态全置顶拒写：55 行全置顶→typed error（pinnedCount=55）+行数不变', () => {
    const db = createTestDb()
    const repo = createAiSessionsRepo(db)
    const s = seedSession(db)
    seedN(db, s, 55, 1)
    let err: unknown
    try {
      repo.insertWithEviction(s, 'user', 'x')
    } catch (e) {
      err = e
    }
    expect(err).toBeInstanceOf(SessionCapAllPinnedError)
    expect((err as SessionCapAllPinnedError).pinnedCount).toBe(55)
    expect(repo.countMessages(s)).toBe(55)
    db.close()
  })

  it('M9 pin 往返：pinned 翻转+updated_at 刷新+其余列不变（role/content/created_at）', () => {
    const db = createTestDb()
    const repo = createAiSessionsRepo(db)
    const s = seedSession(db)
    seedMessage(db, s, 1)
    const before = rawMessages(db, s)[0]!
    expect(repo.setPinned(1, true)).toBe(true)
    const pinnedRow = rawMessages(db, s)[0]!
    expect(pinnedRow.pinned).toBe(1)
    expect(pinnedRow.role).toBe(before.role)
    expect(pinnedRow.content).toBe(before.content)
    expect(pinnedRow.created_at).toBe(before.created_at)
    expect(ISO_RE.test(pinnedRow.updated_at)).toBe(true)
    expect(pinnedRow.updated_at > before.updated_at).toBe(true)
    expect(repo.setPinned(1, false)).toBe(true)
    expect(rawMessages(db, s)[0]!.pinned).toBe(0)
    db.close()
  })

  it('M10 setPinned 缺 id 零行变更（false+全表快照不变）', () => {
    const db = createTestDb()
    const repo = createAiSessionsRepo(db)
    const s = seedSession(db)
    seedMessage(db, s, 1)
    const before = rawMessages(db, s)
    expect(repo.setPinned(9999, true)).toBe(false)
    expect(rawMessages(db, s)).toEqual(before)
    db.close()
  })

  it('M11 listMessages 序=id ASC（置顶不改变列表序——稳定序承诺）', () => {
    const db = createTestDb()
    const repo = createAiSessionsRepo(db)
    const s = seedSession(db)
    seedN(db, s, 5)
    pinById(db, 3)
    expect(repo.listMessages(s).map((r) => r.id)).toEqual([1, 2, 3, 4, 5])
    db.close()
  })

  it('M12 时间戳=应用层 ISO（createSession/insertWithEviction 双面——弃 DDL DEFAULT）', () => {
    const db = createTestDb()
    const repo = createAiSessionsRepo(db)
    const t0 = Date.now() - 60_000
    const session = repo.createSession('global', null)
    expect(ISO_RE.test(session.createdAt)).toBe(true)
    expect(session.updatedAt).toBe(session.createdAt)
    expect(new Date(session.createdAt).getTime()).toBeGreaterThanOrEqual(t0)
    const row = db.prepare('SELECT scope, anchor_id FROM ai_sessions WHERE id = ?').get(session.id)
    expect(row).toEqual({ scope: 'global', anchor_id: null })
    const m = repo.insertWithEviction(session.id, 'user', '时间戳探针')
    expect(ISO_RE.test(m.createdAt)).toBe(true)
    expect(m.updatedAt).toBe(m.createdAt)
    expect(new Date(m.createdAt).getTime()).toBeGreaterThanOrEqual(t0)
    db.close()
  })

  it('M13 evict 已执行→insert 触 DDL CHECK 失败→事务回滚行集逐行还原（非法 role 直插 repo 路径）', () => {
    const db = createTestDb()
    const repo = createAiSessionsRepo(db)
    const s = seedSession(db)
    seedN(db, s, AI_SESSION_MESSAGE_CAP) // 满 50 有可汰行——保证走到 DELETE 步
    const before = rawMessages(db, s)
    // 非法 role 绕过类型面直插 repo（DDL CHECK 兜底面——§3.E）：excess=1→DELETE
    // 已执行→INSERT 炸→单事务整体回滚（M5 只锁「读后即抛」路径，本例锁「先写后炸」）
    expect(() => repo.insertWithEviction(s, 'system' as 'user', '触发回滚')).toThrow(/CHECK/)
    expect(rawMessages(db, s)).toEqual(before)
    db.close()
  })
})
