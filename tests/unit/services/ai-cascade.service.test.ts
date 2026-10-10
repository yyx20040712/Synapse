/**
 * [F-DBCAMP-01 DB-2 U2] ai-cascade.service 用例（always-active 真库夹具——
 * tests/unit/services 先例）。覆盖简报 §三-戊 1-5：paper/folder 双分支四计数
 * （N-4 空会话计入+folder 双面合计逐字段对账）+锚缺席 NOT_FOUND+W-5 级联行为
 * 断言（folder 双面复合/paper 单锚轻锚——级联本体=020 触发器，本面锁其契约：
 * AI 资源俱灭+audit 恒存+他锚零扰）。
 * always-active（不经 guardedDescribe）。
 */
import { describe, expect, it } from 'vitest'
import { createAiCascadeService } from '../../../src/main/services/ai/ai-cascade.service'
import { createRepos } from '../../../src/main/db/repos'
import { createTestDb } from '../../utils/fixtures'

type Db = ReturnType<typeof createTestDb>

function seedPaper(db: Db, id: string, folderId = '__main__'): void {
  db.prepare(
    `INSERT INTO papers (id, file_ref, sha256, title, folder_id, added_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 't', 't')`
  ).run(id, `f/${id}.pdf`, `sha-${id}`, `文献${id}`, folderId)
}

function seedCollection(db: Db, id: string): void {
  db.prepare('INSERT INTO collections (id, name, position) VALUES (?, ?, 0)').run(id, `图${id}`)
}

function seedSession(db: Db, scope: 'paper' | 'lineage', anchor: string): number {
  const r = db
    .prepare(`INSERT INTO ai_sessions (scope, anchor_id, created_at, updated_at) VALUES (?, ?, 't', 't')`)
    .run(scope, anchor)
  return Number(r.lastInsertRowid)
}

function seedMessages(db: Db, sessionId: number, n: number): void {
  const stmt = db.prepare(
    `INSERT INTO ai_messages (session_id, role, content, created_at, updated_at)
     VALUES (?, 'user', ?, 't', 't')`
  )
  for (let i = 1; i <= n; i++) stmt.run(sessionId, `消息${i}`)
}

function seedMemory(db: Db, scope: 'paper' | 'lineage', anchor: string): void {
  db.prepare(
    `INSERT INTO ai_memory (scope, anchor_id, category, title, content, origin, created_at, updated_at)
     VALUES (?, ?, ?, '记忆', '内容', 'manual', 't', 't')`
  ).run(scope, anchor, scope === 'paper' ? 'method_note' : 'node_role')
}

function seedTask(db: Db, scope: 'paper' | 'lineage', anchor: string): number {
  const r = db
    .prepare(
      `INSERT INTO ai_tasks (scope, anchor_id, action, payload, created_at, updated_at)
       VALUES (?, ?, 'memory.create', '{}', 't', 't')`
    )
    .run(scope, anchor)
  const taskId = Number(r.lastInsertRowid)
  db.prepare(
    `INSERT INTO ai_task_audit (task_id, seq, kind, detail, created_at)
     VALUES (?, 1, 'submitted', 'd', 't')`
  ).run(taskId)
  return taskId
}

function scalar(db: Db, sql: string, ...params: unknown[]): number {
  return (db.prepare(sql).get(...params) as { c: number }).c
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

describe('F-DBCAMP-01 DB-2 U2 ai-cascade.service —— 级联预览计数+触发器契约', () => {
  it('C1 paper 分支四计数：空会话计入（N-4）+他锚排除+零资源锚全 0', async () => {
    const db = createTestDb()
    const svc = createAiCascadeService({ repos: createRepos(db) })
    seedPaper(db, 'p-1')
    seedPaper(db, 'p-2')
    seedPaper(db, 'p-0')
    // p-1：两会话（一空+一两消息）+记忆+任务；p-2 噪声行（他锚排除）
    seedSession(db, 'paper', 'p-1')
    const s2 = seedSession(db, 'paper', 'p-1')
    seedMessages(db, s2, 2)
    seedMemory(db, 'paper', 'p-1')
    seedTask(db, 'paper', 'p-1')
    seedSession(db, 'paper', 'p-2')
    seedMemory(db, 'paper', 'p-2')
    seedTask(db, 'paper', 'p-2')
    expect(await svc.previewCounts({ scope: 'paper', anchorId: 'p-1' })).toEqual({
      sessions: 2,
      messages: 2,
      memories: 1,
      tasks: 1
    })
    expect(await svc.previewCounts({ scope: 'paper', anchorId: 'p-0' })).toEqual({
      sessions: 0,
      messages: 0,
      memories: 0,
      tasks: 0
    })
    db.close()
  })

  it('C2 folder 分支双面合计：夹内 papers 的 paper 档+夹 id 的 lineage 档逐字段相加', async () => {
    const db = createTestDb()
    const repos = createRepos(db)
    const svc = createAiCascadeService({ repos })
    seedCollection(db, 'f-1')
    seedPaper(db, 'p-1', 'f-1')
    seedPaper(db, 'p-2', 'f-1')
    seedPaper(db, 'p-out') // 夹外（他锚排除）
    // paper 面：p-1 会话+两消息+任务；p-2 记忆
    const s1 = seedSession(db, 'paper', 'p-1')
    seedMessages(db, s1, 2)
    seedTask(db, 'paper', 'p-1')
    seedMemory(db, 'paper', 'p-2')
    // lineage 面（anchor=夹 id）：会话+一消息+记忆+任务
    const s2 = seedSession(db, 'lineage', 'f-1')
    seedMessages(db, s2, 1)
    seedMemory(db, 'lineage', 'f-1')
    seedTask(db, 'lineage', 'f-1')
    const counts = await svc.previewCounts({ scope: 'folder', anchorId: 'f-1' })
    expect(counts).toEqual({ sessions: 2, messages: 3, memories: 2, tasks: 2 })
    // 双面对账（W-5）：folder 面=ΣcountPaperAnchor(夹内 papers)+countLineageAnchor(夹 id)
    const paperFace1 = repos.aiCascade.countPaperAnchor('p-1')
    const paperFace2 = repos.aiCascade.countPaperAnchor('p-2')
    const lineageFace = repos.aiCascade.countLineageAnchor('f-1')
    expect(counts).toEqual({
      sessions: paperFace1.sessions + paperFace2.sessions + lineageFace.sessions,
      messages: paperFace1.messages + paperFace2.messages + lineageFace.messages,
      memories: paperFace1.memories + paperFace2.memories + lineageFace.memories,
      tasks: paperFace1.tasks + paperFace2.tasks + lineageFace.tasks
    })
    db.close()
  })

  it('C3 锚缺席：paper/folder 两形 → NOT_FOUND 分流文案', async () => {
    const db = createTestDb()
    const svc = createAiCascadeService({ repos: createRepos(db) })
    await expectDomainError(
      () => svc.previewCounts({ scope: 'paper', anchorId: 'p-ghost' }),
      'NOT_FOUND',
      '锚定文献不存在'
    )
    await expectDomainError(
      () => svc.previewCounts({ scope: 'folder', anchorId: 'f-ghost' }),
      'NOT_FOUND',
      '锚定文件夹不存在'
    )
    db.close()
  })

  it('C4 folder 级联行为（W-5）：夹内 papers 先删再删夹行 → lineage+paper 档 AI 资源俱灭+audit 恒存+他锚零扰', async () => {
    const db = createTestDb()
    seedCollection(db, 'f-1')
    seedPaper(db, 'p-1', 'f-1')
    seedPaper(db, 'p-2', 'f-1')
    seedPaper(db, 'p-other')
    // paper 档（夹内两锚）
    const s1 = seedSession(db, 'paper', 'p-1')
    seedMessages(db, s1, 2)
    seedMemory(db, 'paper', 'p-1')
    const t1 = seedTask(db, 'paper', 'p-1')
    const t2 = seedTask(db, 'paper', 'p-2')
    // lineage 档（夹 id 锚）
    const s2 = seedSession(db, 'lineage', 'f-1')
    seedMessages(db, s2, 1)
    seedMemory(db, 'lineage', 'f-1')
    const t3 = seedTask(db, 'lineage', 'f-1')
    // 他锚零扰锚
    seedSession(db, 'paper', 'p-other')
    // 沿 folders.service delete 同序 db 直操作：先灭夹内 papers 再删夹行
    db.prepare(`DELETE FROM papers WHERE id IN ('p-1', 'p-2')`).run()
    db.prepare(`DELETE FROM collections WHERE id = 'f-1'`).run()
    expect(scalar(db, `SELECT COUNT(*) c FROM ai_sessions WHERE scope='lineage' AND anchor_id='f-1'`)).toBe(0)
    expect(
      scalar(db, `SELECT COUNT(*) c FROM ai_sessions WHERE scope='paper' AND anchor_id IN ('p-1','p-2')`)
    ).toBe(0)
    expect(scalar(db, `SELECT COUNT(*) c FROM ai_messages`)).toBe(0) // 会话灭→FK CASCADE 随灭
    expect(
      scalar(db, `SELECT COUNT(*) c FROM ai_memory WHERE (scope='paper' AND anchor_id IN ('p-1','p-2')) OR (scope='lineage' AND anchor_id='f-1')`)
    ).toBe(0)
    expect(
      scalar(db, `SELECT COUNT(*) c FROM ai_tasks WHERE (scope='paper' AND anchor_id IN ('p-1','p-2')) OR (scope='lineage' AND anchor_id='f-1')`)
    ).toBe(0)
    // audit 恒存（append-only 取证边界——task_id 悬挂为接受面）
    expect(scalar(db, `SELECT COUNT(*) c FROM ai_task_audit WHERE task_id IN (?, ?, ?)`, t1, t2, t3)).toBe(3)
    // 他锚零扰
    expect(scalar(db, `SELECT COUNT(*) c FROM ai_sessions WHERE anchor_id='p-other'`)).toBe(1)
    db.close()
  })

  it('C5 paper 级联回归轻锚：删 papers 行 → 该锚 AI 资源灭+他锚零扰', async () => {
    const db = createTestDb()
    seedPaper(db, 'p-1')
    seedPaper(db, 'p-2')
    const s1 = seedSession(db, 'paper', 'p-1')
    seedMessages(db, s1, 1)
    seedMemory(db, 'paper', 'p-1')
    seedTask(db, 'paper', 'p-1')
    const s2 = seedSession(db, 'paper', 'p-2')
    seedMessages(db, s2, 1)
    db.prepare(`DELETE FROM papers WHERE id = 'p-1'`).run()
    expect(scalar(db, `SELECT COUNT(*) c FROM ai_sessions WHERE anchor_id='p-1'`)).toBe(0)
    expect(scalar(db, `SELECT COUNT(*) c FROM ai_memory WHERE anchor_id='p-1'`)).toBe(0)
    expect(scalar(db, `SELECT COUNT(*) c FROM ai_tasks WHERE anchor_id='p-1'`)).toBe(0)
    expect(scalar(db, `SELECT COUNT(*) c FROM ai_messages WHERE session_id=?`, s2)).toBe(1)
    db.close()
  })
})
