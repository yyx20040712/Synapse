/**
 * [F-DBCAMP-01 DB-2 U2a] ai-sessions.service 用例（always-active——真库真 repos
 * 夹具，tags-domain-limits 末节同型）。覆盖简报 §4 矩阵 S1-S8：openSession 多态
 * 锚存在性校验（§3.F：paper→papers.id/lineage→collections.id/global 无锚）+
 * appendMessage typed error 形状（§3.E CONFLICT 复用预裁）+pin/unpin 缺席分流。
 * always-active（不经 guardedDescribe）。
 */
import { describe, expect, it } from 'vitest'
import { createAiSessionsService } from '../../../src/main/services/ai/ai-sessions.service'
import { createRepos } from '../../../src/main/db/repos'
import {
  AI_SESSION_MESSAGE_CAP,
  type AiScope
} from '../../../src/main/db/repos/ai-sessions.repo'
import { createTestDb } from '../../utils/fixtures'

type Db = ReturnType<typeof createTestDb>

function seedPaper(db: Db, id: string): void {
  db.prepare(
    `INSERT INTO papers (id, file_ref, sha256, title, added_at, updated_at)
     VALUES (?, ?, ?, ?, 't', 't')`
  ).run(id, `f/${id}.pdf`, `sha-${id}`, `文献${id}`)
}

function seedCollection(db: Db, id: string): void {
  db.prepare('INSERT INTO collections (id, name, position) VALUES (?, ?, 0)').run(id, `图${id}`)
}

/** 直插满员全置顶消息（构造拒写态——绕过 service 写面） */
function seedPinnedFull(db: Db, sessionId: number, n: number): void {
  const stmt = db.prepare(
    `INSERT INTO ai_messages (session_id, role, content, pinned, created_at, updated_at)
     VALUES (?, 'user', ?, 1, 't', 't')`
  )
  for (let i = 1; i <= n; i++) stmt.run(sessionId, `消息${i}`)
}

async function expectDomainError(
  run: () => Promise<unknown>,
  code: string,
  ...msgParts: string[]
): Promise<void> {
  try {
    await run()
    expect.unreachable('应抛域错误')
  } catch (e) {
    expect(e, '域错误是 Error 子类').toBeInstanceOf(Error)
    expect((e as { code?: string }).code, `错误码应为 ${code}`).toBe(code)
    for (const part of msgParts) expect((e as Error).message).toContain(part)
  }
}

describe('F-DBCAMP-01 DB-2 U2a ai-sessions.service —— 多态锚校验+上限语义', () => {
  it('S1 paper 锚在 → 会话建立（scope/anchor 落库真值）', async () => {
    const db = createTestDb()
    const svc = createAiSessionsService({ repos: createRepos(db) })
    seedPaper(db, 'p-1')
    const { sessionId } = await svc.openSession({ scope: 'paper', anchorId: 'p-1' })
    expect(sessionId).toBeGreaterThan(0)
    expect(
      db.prepare('SELECT scope, anchor_id FROM ai_sessions WHERE id = ?').get(sessionId)
    ).toEqual({ scope: 'paper', anchor_id: 'p-1' })
    db.close()
  })

  it('S2 paper 锚缺 → NOT_FOUND+零会话行残留（防悬挂会话行）', async () => {
    const db = createTestDb()
    const svc = createAiSessionsService({ repos: createRepos(db) })
    await expectDomainError(
      () => svc.openSession({ scope: 'paper', anchorId: 'p-ghost' }),
      'NOT_FOUND',
      '锚'
    )
    expect(db.prepare('SELECT COUNT(*) c FROM ai_sessions').get()).toEqual({ c: 0 })
    db.close()
  })

  it('S3 lineage 锚在+缺（锚=collections.id——ADR-0025 folder↔graph 投影）', async () => {
    const db = createTestDb()
    const svc = createAiSessionsService({ repos: createRepos(db) })
    seedCollection(db, 'c-1')
    const ok = await svc.openSession({ scope: 'lineage', anchorId: 'c-1' })
    expect(
      db.prepare('SELECT scope, anchor_id FROM ai_sessions WHERE id = ?').get(ok.sessionId)
    ).toEqual({ scope: 'lineage', anchor_id: 'c-1' })
    await expectDomainError(
      () => svc.openSession({ scope: 'lineage', anchorId: 'c-ghost' }),
      'NOT_FOUND'
    )
    db.close()
  })

  it('S4 global 带 anchor 拒（INVALID_REQUEST）+null 通过（anchor 落 NULL）', async () => {
    const db = createTestDb()
    const svc = createAiSessionsService({ repos: createRepos(db) })
    seedPaper(db, 'p-1')
    // 锚真实存在也拒——形态非法先于存在性（§3.E）
    await expectDomainError(
      () => svc.openSession({ scope: 'global', anchorId: 'p-1' }),
      'INVALID_REQUEST'
    )
    const { sessionId } = await svc.openSession({ scope: 'global', anchorId: null })
    expect(
      db.prepare('SELECT scope, anchor_id FROM ai_sessions WHERE id = ?').get(sessionId)
    ).toEqual({ scope: 'global', anchor_id: null })
    db.close()
  })

  it('S5 非法 scope → INVALID_REQUEST（封闭三值外）', async () => {
    const db = createTestDb()
    const svc = createAiSessionsService({ repos: createRepos(db) })
    seedPaper(db, 'p-1')
    await expectDomainError(
      () =>
        svc.openSession({
          scope: 'project' as AiScope,
          anchorId: 'p-1'
        }),
      'INVALID_REQUEST',
      '范围'
    )
    expect(db.prepare('SELECT COUNT(*) c FROM ai_sessions').get()).toEqual({ c: 0 })
    db.close()
  })

  it('S6 满员全置顶 append → CONFLICT（message 含 50 上限+置顶计数实数+管理面板引导）+库态不变', async () => {
    const db = createTestDb()
    const repos = createRepos(db)
    const svc = createAiSessionsService({ repos })
    seedPaper(db, 'p-1')
    const { sessionId } = await svc.openSession({ scope: 'paper', anchorId: 'p-1' })
    seedPinnedFull(db, sessionId, AI_SESSION_MESSAGE_CAP)
    await expectDomainError(
      () => svc.appendMessage({ sessionId, role: 'user', content: '第 51 条' }),
      'CONFLICT',
      `${AI_SESSION_MESSAGE_CAP} 条上限`,
      `置顶 ${AI_SESSION_MESSAGE_CAP} 条`,
      '管理面板'
    )
    expect(
      db.prepare('SELECT COUNT(*) c FROM ai_messages WHERE session_id = ?').get(sessionId)
    ).toEqual({ c: AI_SESSION_MESSAGE_CAP })
    db.close()
  })

  it('S7 role 非法+空 content → INVALID_REQUEST（双拒+零写入）', async () => {
    const db = createTestDb()
    const svc = createAiSessionsService({ repos: createRepos(db) })
    seedPaper(db, 'p-1')
    const { sessionId } = await svc.openSession({ scope: 'paper', anchorId: 'p-1' })
    await expectDomainError(
      () =>
        svc.appendMessage({ sessionId, role: 'system' as 'user', content: '内容' }),
      'INVALID_REQUEST',
      '角色'
    )
    await expectDomainError(
      () => svc.appendMessage({ sessionId, role: 'user', content: '   ' }),
      'INVALID_REQUEST',
      '内容'
    )
    expect(
      db.prepare('SELECT COUNT(*) c FROM ai_messages WHERE session_id = ?').get(sessionId)
    ).toEqual({ c: 0 })
    db.close()
  })

  it('S8 pin/unpin：在场 ok 往返+缺席 NOT_FOUND 分流', async () => {
    const db = createTestDb()
    const repos = createRepos(db)
    const svc = createAiSessionsService({ repos })
    seedPaper(db, 'p-1')
    const { sessionId } = await svc.openSession({ scope: 'paper', anchorId: 'p-1' })
    const m = await svc.appendMessage({ sessionId, role: 'user', content: '待置顶' })
    await expect(svc.pinMessage(m.id)).resolves.toEqual({ ok: true })
    expect(
      db.prepare('SELECT pinned FROM ai_messages WHERE id = ?').get(m.id)
    ).toEqual({ pinned: 1 })
    await expect(svc.unpinMessage(m.id)).resolves.toEqual({ ok: true })
    expect(
      db.prepare('SELECT pinned FROM ai_messages WHERE id = ?').get(m.id)
    ).toEqual({ pinned: 0 })
    await expectDomainError(() => svc.pinMessage(9999), 'NOT_FOUND', '消息不存在')
    await expectDomainError(() => svc.unpinMessage(9999), 'NOT_FOUND', '消息不存在')
    db.close()
  })
})
