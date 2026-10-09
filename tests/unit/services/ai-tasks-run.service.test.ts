/**
 * [F-DBCAMP-01 DB-2 U2b-1] ai-tasks.service 执行面用例（always-active 真库真 repos
 * 夹具）。覆盖简报 §3.g：状态机全合法迁移+非法迁移拒+9 handler 逐个行为+围栏负例
 * （跨锚 memoryId 拒/messageId 属他会话拒）+同锚 source_task_id 不变量+成功路径拒写
 * 分支（CAP 态 result_overflow+succeeded）+超时（now 注入——mutation 零副作用）+
 * failed 回滚零副作用+恢复扫描+cancel 律+listTasks。
 * 提交面三闸=ai-tasks-submit.service.test.ts（预筹拆分）。
 * always-active（不经 guardedDescribe）。
 */
import { describe, expect, it } from 'vitest'
import {
  createAiTasksService,
  type AiTasksServiceDeps
} from '../../../src/main/services/ai/ai-tasks.service'
import { createRepos } from '../../../src/main/db/repos'
import type { Repos } from '../../../src/main/db/repos'
import { createTestDb } from '../../utils/fixtures'

type Db = ReturnType<typeof createTestDb>

function seedPaper(db: Db, id: string): void {
  // 幂等播种（submitRun 复用调用——重复 id/sha256 静默跳过）
  db.prepare(
    `INSERT OR IGNORE INTO papers (id, file_ref, sha256, title, added_at, updated_at)
     VALUES (?, ?, ?, ?, 't', 't')`
  ).run(id, `f/${id}.pdf`, `sha-${id}`, `文献${id}`)
}

function seedMemory(
  db: Db,
  scope: 'paper' | 'lineage' | 'global',
  anchor: string | null,
  title: string,
  content = '内容'
): number {
  const category = scope === 'paper' ? 'method_note' : scope === 'lineage' ? 'node_role' : 'user_preference'
  const r = db
    .prepare(
      `INSERT INTO ai_memory (scope, anchor_id, category, title, content, origin, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'manual', '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z')`
    )
    .run(scope, anchor, category, title, content)
  return Number(r.lastInsertRowid)
}

/** 提交+执行一步到位（目标=会话锚缺省继承） */
async function submitRun(
  svc: ReturnType<typeof createAiTasksService>,
  repos: Repos,
  db: Db,
  v: {
    anchor?: string
    action: string
    payload: unknown
    target?: { scope: 'paper' | 'lineage'; anchorId: string }
  }
): Promise<{ taskId: number; final: Awaited<ReturnType<ReturnType<typeof createAiTasksService>['runTask']>> }> {
  seedPaper(db, 'p-1')
  seedPaper(db, 'p-2')
  const s = repos.aiSessions.createSession('paper', v.anchor ?? 'p-1')
  const t = await svc.submitTask({
    sessionId: s.id,
    action: v.action as never,
    payload: v.payload,
    target: v.target
  })
  const final = await svc.runTask({ taskId: t.id, sessionId: s.id })
  return { taskId: t.id, final }
}

describe('F-DBCAMP-01 DB-2 U2b-1 ai-tasks.service —— 执行面状态机+9 handler+超时+恢复', () => {
  it('R1 幽灵任务 runTask → NOT_FOUND「任务不存在」', async () => {
    const db = createTestDb()
    const repos = createRepos(db)
    const svc = createAiTasksService({ repos })
    seedPaper(db, 'p-1')
    const s = repos.aiSessions.createSession('paper', 'p-1')
    await expect(svc.runTask({ taskId: 9999, sessionId: s.id })).rejects.toMatchObject({
      code: 'NOT_FOUND',
      message: expect.stringContaining('任务不存在')
    })
    db.close()
  })

  it('R2 幽灵会话 runTask → NOT_FOUND「会话不存在」', async () => {
    const db = createTestDb()
    const repos = createRepos(db)
    const svc = createAiTasksService({ repos })
    seedPaper(db, 'p-1')
    const s = repos.aiSessions.createSession('paper', 'p-1')
    const t = await svc.submitTask({ sessionId: s.id, action: 'memory.list', payload: {} })
    await expect(svc.runTask({ taskId: t.id, sessionId: 9999 })).rejects.toMatchObject({
      code: 'NOT_FOUND'
    })
    db.close()
  })

  it('R3 全合法迁移链：queued→running→succeeded+审计序 submitted→target_resolved→mutated→succeeded', async () => {
    const db = createTestDb()
    const repos = createRepos(db)
    const svc = createAiTasksService({ repos })
    const { taskId, final } = await submitRun(svc, repos, db, {
      action: 'memory.create',
      payload: { category: 'method_note', title: '任务写入', content: '任务内容' }
    })
    expect(final.status).toBe('succeeded')
    expect(final.result).toContain('memoryId')
    expect(repos.aiTasks.listAudit(taskId).map((a) => a.kind)).toEqual([
      'submitted',
      'target_resolved',
      'mutated',
      'succeeded'
    ])
    db.close()
  })

  it('R4 非法迁移拒：终态再 run → CONFLICT「任务不在可执行状态」（每终态回迁+越序抽样）', async () => {
    const db = createTestDb()
    const repos = createRepos(db)
    const svc = createAiTasksService({ repos })
    seedPaper(db, 'p-1')
    const s = repos.aiSessions.createSession('paper', 'p-1')
    // succeeded 回迁
    const a = await svc.submitTask({ sessionId: s.id, action: 'memory.list', payload: {} })
    await svc.runTask({ taskId: a.id, sessionId: s.id })
    await expect(svc.runTask({ taskId: a.id, sessionId: s.id })).rejects.toMatchObject({
      code: 'CONFLICT',
      message: expect.stringContaining('任务不在可执行状态')
    })
    // cancelled 越序 run
    const b = await svc.submitTask({ sessionId: s.id, action: 'memory.list', payload: {} })
    await svc.cancelTask(b.id)
    await expect(svc.runTask({ taskId: b.id, sessionId: s.id })).rejects.toMatchObject({
      code: 'CONFLICT'
    })
    expect((await svc.cancelTask(b.id).catch((e) => e)).code).toBe('CONFLICT')
    db.close()
  })

  it('R5 cancel 律：queued→cancelled+审计；running 不可取消（CONFLICT）；幽灵任务 NOT_FOUND', async () => {
    const db = createTestDb()
    const repos = createRepos(db)
    const svc = createAiTasksService({ repos })
    seedPaper(db, 'p-1')
    const s = repos.aiSessions.createSession('paper', 'p-1')
    const t = await svc.submitTask({ sessionId: s.id, action: 'memory.list', payload: {} })
    const cancelled = await svc.cancelTask(t.id)
    expect(cancelled.status).toBe('cancelled')
    expect(repos.aiTasks.listAudit(t.id).map((a) => a.kind)).toEqual(['submitted', 'cancelled'])
    // running 不可取消
    const r = await svc.submitTask({ sessionId: s.id, action: 'memory.create', payload: { category: 'method_note', title: '题', content: '文' } })
    const repos2 = repos
    await repos2.aiTasks.transitionToRunning(r.id, 'd')
    await expect(svc.cancelTask(r.id)).rejects.toMatchObject({ code: 'CONFLICT' })
    await expect(svc.cancelTask(9999)).rejects.toMatchObject({ code: 'NOT_FOUND' })
    db.close()
  })

  it('R6 memory.create 落位（INV-128）：(scope,anchor)=目标+origin=agent+sourceTaskId=本任务+ai_memory epoch +1', async () => {
    const db = createTestDb()
    const repos = createRepos(db)
    const svc = createAiTasksService({ repos })
    seedPaper(db, 'p-1')
    seedPaper(db, 'p-2')
    const s = repos.aiSessions.createSession('paper', 'p-1')
    const t = await svc.submitTask({
      sessionId: s.id,
      action: 'memory.create',
      payload: { category: 'reading_insight', title: '跨锚任务写入', content: '内容甲', label: '签' },
      target: { scope: 'paper', anchorId: 'p-2' }
    })
    const epochBefore = (
      db.prepare("SELECT epoch FROM change_epochs WHERE table_name = 'ai_memory'").get() as {
        epoch: number
      }
    ).epoch
    await svc.runTask({ taskId: t.id, sessionId: s.id })
    const row = db
      .prepare('SELECT scope, anchor_id, origin, source_task_id, label FROM ai_memory')
      .get() as { scope: string; anchor_id: string; origin: string; source_task_id: number; label: string }
    expect(row.scope).toBe('paper')
    expect(row.anchor_id).toBe('p-2')
    expect(row.origin).toBe('agent')
    expect(row.source_task_id).toBe(t.id)
    expect(row.label).toBe('签')
    // r1 k3-N5：handler 写 ai_memory → epoch 触发链前进恰 +1（写→失效信号基建直证）
    const epochAfter = (
      db.prepare("SELECT epoch FROM change_epochs WHERE table_name = 'ai_memory'").get() as {
        epoch: number
      }
    ).epoch
    expect(epochAfter).toBe(epochBefore + 1)
    db.close()
  })

  it('R7 memory.create 分类档错位（paper 目标+lineage 类）→ failed 终态（19 值集过闸②/档集执行期拒）', async () => {
    const db = createTestDb()
    const repos = createRepos(db)
    const svc = createAiTasksService({ repos })
    const { final } = await submitRun(svc, repos, db, {
      action: 'memory.create',
      payload: { category: 'node_role', title: '档错位', content: '文' }
    })
    expect(final.status).toBe('failed')
    expect(final.error).toContain('分类')
    expect(db.prepare('SELECT COUNT(*) c FROM ai_memory').get()).toEqual({ c: 0 })
    db.close()
  })

  it('R8 memory.update：部分刷+updated_at 刷新+result 含 memoryId', async () => {
    const db = createTestDb()
    const repos = createRepos(db)
    const svc = createAiTasksService({ repos })
    const id = seedMemory(db, 'paper', 'p-1', '旧标题甲')
    const { final } = await submitRun(svc, repos, db, {
      action: 'memory.update',
      payload: { memoryId: id, title: '新标题乙' }
    })
    expect(final.status).toBe('succeeded')
    const row = db.prepare('SELECT title, updated_at FROM ai_memory WHERE id = ?').get(id) as {
      title: string
      updated_at: string
    }
    expect(row.title).toBe('新标题乙')
    expect(row.updated_at > '2024-01-01T00:00:00.000Z').toBe(true)
    expect(final.result).toContain(String(id))
    db.close()
  })

  it('R9 围栏负例：跨锚 memoryId（update/delete/pin 抽样）→ failed 终态+审计 failed+零副作用', async () => {
    const db = createTestDb()
    const repos = createRepos(db)
    const svc = createAiTasksService({ repos })
    const foreign = seedMemory(db, 'paper', 'p-2', '他锚记忆')
    const { taskId, final } = await submitRun(svc, repos, db, {
      action: 'memory.update',
      payload: { memoryId: foreign, title: '越权改写' }
    })
    expect(final.status).toBe('failed')
    expect(final.error).toContain('任务目标锚')
    const kinds = repos.aiTasks.listAudit(taskId).map((a) => a.kind)
    expect(kinds[kinds.length - 1]).toBe('failed')
    expect(db.prepare('SELECT title FROM ai_memory WHERE id = ?').get(foreign)).toEqual({ title: '他锚记忆' })
    db.close()
  })

  it('R10 memory.update 缺席 memoryId → failed「记忆不存在」', async () => {
    const db = createTestDb()
    const repos = createRepos(db)
    const svc = createAiTasksService({ repos })
    const { final } = await submitRun(svc, repos, db, {
      action: 'memory.update',
      payload: { memoryId: 9999, title: '无的放矢' }
    })
    expect(final.status).toBe('failed')
    expect(final.error).toContain('记忆不存在')
    db.close()
  })

  it('R24 写后抛错零副作用（r1 k3-N4）：handler 落 ai_memory 后抛 → failed+memory 行灭+审计恰三行', async () => {
    const db = createTestDb()
    const repos = createRepos(db)
    // handler 表覆盖注入（简报 §3.c 预留面）：先真写 ai_memory 再抛——构造写后炸点
    const svc = createAiTasksService({
      repos,
      handlerOverrides: {
        'memory.create': () => (ctx) => {
          repos.aiMemory.create(ctx.target.scope, ctx.target.anchor, {
            category: 'method_note',
            title: '写后抛探针',
            content: '内容',
            origin: 'agent',
            sourceTaskId: ctx.task.id
          })
          throw new Error('写后抛错点')
        }
      }
    })
    seedPaper(db, 'p-1')
    const s = repos.aiSessions.createSession('paper', 'p-1')
    const t = await svc.submitTask({
      sessionId: s.id,
      action: 'memory.create',
      payload: { category: 'method_note', title: '题', content: '文' }
    })
    const final = await svc.runTask({ taskId: t.id, sessionId: s.id })
    expect(final.status).toBe('failed')
    expect(final.error).toContain('写后抛错点')
    // SAVEPOINT 回滚：已写 memory 行灭（零副作用）+mutated 审计随回滚灭失
    expect(db.prepare('SELECT COUNT(*) c FROM ai_memory').get()).toEqual({ c: 0 })
    expect(repos.aiTasks.listAudit(t.id).map((a) => a.kind)).toEqual([
      'submitted',
      'target_resolved',
      'failed'
    ])
    db.close()
  })

  it('R11 memory.delete：行灭+FTS 同步清（MATCH 归零）', async () => {
    const db = createTestDb()
    const repos = createRepos(db)
    const svc = createAiTasksService({ repos })
    const id = seedMemory(db, 'paper', 'p-1', '删除目标标题', '删除目标内容语料')
    expect(
      db.prepare(`SELECT rowid FROM ai_memory_fts WHERE ai_memory_fts MATCH '"删除目标内容语料"'`).get()
    ).toBeTruthy()
    const { final } = await submitRun(svc, repos, db, {
      action: 'memory.delete',
      payload: { memoryId: id }
    })
    expect(final.status).toBe('succeeded')
    expect(db.prepare('SELECT COUNT(*) c FROM ai_memory').get()).toEqual({ c: 0 })
    expect(
      db.prepare(`SELECT rowid FROM ai_memory_fts WHERE ai_memory_fts MATCH '"删除目标内容语料"'`).get()
    ).toBeUndefined()
    db.close()
  })

  it('R23 摘要截断（r1 W-d1-1）：120 码点 title+300 码点 content → mutated detail 每侧 ≤200 码点（create 路直证）', async () => {
    const db = createTestDb()
    const repos = createRepos(db)
    const svc = createAiTasksService({ repos })
    const longTitle = '题'.repeat(120)
    const longContent = '文'.repeat(300)
    const { taskId, final } = await submitRun(svc, repos, db, {
      action: 'memory.create',
      payload: { category: 'method_note', title: longTitle, content: longContent }
    })
    expect(final.status).toBe('succeeded')
    const mutated = repos.aiTasks.listAudit(taskId).find((a) => a.kind === 'mutated')
    expect(mutated).toBeDefined()
    const detail = mutated!.detail ?? ''
    const afterSide = detail.split(' after=')[1] ?? ''
    // 每侧 ≤200 码点：before=(null)（恒短）；after=整体（含 id 前缀+title+content 合并截断）
    expect([...afterSide].length, 'after 侧 ≤200 码点').toBeLessThanOrEqual(200)
    // 长题完整保留（合并截断下 title 在预算内——截断面落在 content 上）
    expect(afterSide).toContain(longTitle)
    expect([...detail.split(' after=')[0]!].length).toBeLessThanOrEqual(200)
    db.close()
  })

  it('R23b 摘要截断 update 路（r2 d1-N1）：before 侧非空直证——120 码点 title+300 码点 content 播种→update 换 300 码点长文→两侧 digest 各 ≤200 码点', async () => {
    const db = createTestDb()
    const repos = createRepos(db)
    const svc = createAiTasksService({ repos })
    const longTitle = '题'.repeat(120)
    const id = seedMemory(db, 'paper', 'p-1', longTitle, '文'.repeat(300))
    const newContent = '新'.repeat(300)
    const { taskId, final } = await submitRun(svc, repos, db, {
      action: 'memory.update',
      payload: { memoryId: id, content: newContent }
    })
    expect(final.status).toBe('succeeded')
    const mutated = repos.aiTasks.listAudit(taskId).find((a) => a.kind === 'mutated')
    expect(mutated).toBeDefined()
    const detail = mutated!.detail ?? ''
    // 侧=digest 本体（before=/after= 标记置于截断外——r1 W-d1-1 口径；
    // detail 形态=`before=<digest> after=<digest>`——首标记无前置空格）
    const beforeDigest = detail.split(' after=')[0]!.slice('before='.length)
    const afterDigest = detail.split(' after=')[1] ?? ''
    expect(beforeDigest.length, 'before 侧非空（create 路 before=(null) 缺口的直证）').toBeGreaterThan(0)
    expect([...beforeDigest].length, 'before 侧 ≤200 码点').toBeLessThanOrEqual(200)
    expect([...afterDigest].length, 'after 侧 ≤200 码点').toBeLessThanOrEqual(200)
    // 旧长题在 before 侧完整保留（截断面落 content）+新长文落 after 侧
    expect(beforeDigest).toContain(longTitle)
    expect(afterDigest).toContain('新'.repeat(50))
    db.close()
  })

  it('R25 handlerOverrides 守卫（r2 d1-delta-W1+k3-N3）：typo 键构造即 throw（fail-fast 杀静默忽略面）', () => {
    const db = createTestDb()
    const repos = createRepos(db)
    const badOverrides = {
      'memory.creat': () => () => ({ result: null })
    } as unknown as NonNullable<AiTasksServiceDeps['handlerOverrides']>
    expect(() => createAiTasksService({ repos, handlerOverrides: badOverrides })).toThrow(
      'handlerOverrides 非法动作键：memory.creat'
    )
    db.close()
  })

  it('R12 memory.pin/unpin：翻转+审计 mutated；跨锚围栏 → failed', async () => {
    const db = createTestDb()
    const repos = createRepos(db)
    const svc = createAiTasksService({ repos })
    const id = seedMemory(db, 'paper', 'p-1', '待置顶记忆')
    const pin = await submitRun(svc, repos, db, { action: 'memory.pin', payload: { memoryId: id } })
    expect(pin.final.status).toBe('succeeded')
    expect(db.prepare('SELECT pinned FROM ai_memory WHERE id = ?').get(id)).toEqual({ pinned: 1 })
    const unpin = await submitRun(svc, repos, db, { action: 'memory.unpin', payload: { memoryId: id } })
    expect(unpin.final.status).toBe('succeeded')
    expect(db.prepare('SELECT pinned FROM ai_memory WHERE id = ?').get(id)).toEqual({ pinned: 0 })
    const foreign = seedMemory(db, 'paper', 'p-2', '他锚置顶目标')
    const bad = await submitRun(svc, repos, db, { action: 'memory.pin', payload: { memoryId: foreign } })
    expect(bad.final.status).toBe('failed')
    db.close()
  })

  it('R13 memory.search 1-2 码点 → LIKE 并集（本锚+global 命中/他锚隔离）+assistant 回写+result 摘要', async () => {
    const db = createTestDb()
    const repos = createRepos(db)
    const svc = createAiTasksService({ repos })
    seedMemory(db, 'paper', 'p-1', '浊度语料', 'x')
    seedMemory(db, 'paper', 'p-2', '浊度他锚', 'x')
    seedMemory(db, 'global', null, '浊度全局', 'x')
    const { final } = await submitRun(svc, repos, db, {
      action: 'memory.search',
      payload: { query: '浊度' }
    })
    expect(final.status).toBe('succeeded')
    const parsed = JSON.parse(final.result!) as { route: string; rows: Array<{ title: string }> }
    expect(parsed.route).toBe('like')
    expect(parsed.rows.map((r) => r.title).sort()).toEqual(['浊度全局', '浊度语料'])
    // 回写：dispatching session 恰一行 assistant
    const msgs = repos.aiSessions.listMessages(
      (db.prepare('SELECT session_id FROM ai_messages').get() as { session_id: number }).session_id
    )
    expect(msgs).toHaveLength(1)
    expect(msgs[0]!.role).toBe('assistant')
    expect(msgs[0]!.content).toContain('浊度语料')
    db.close()
  })

  it('R14 memory.search ≥3 码点 → MATCH 并集路', async () => {
    const db = createTestDb()
    const repos = createRepos(db)
    const svc = createAiTasksService({ repos })
    seedMemory(db, 'paper', 'p-1', 't', '跨栅栏检索语料')
    seedMemory(db, 'global', null, 't', '跨栅栏检索全局')
    const { final } = await submitRun(svc, repos, db, {
      action: 'memory.search',
      payload: { query: '跨栅栏检索' }
    })
    expect(final.status).toBe('succeeded')
    const parsed = JSON.parse(final.result!) as { route: string; rows: Array<{ title: string }> }
    expect(parsed.route).toBe('match')
    expect(parsed.rows).toHaveLength(2)
    db.close()
  })

  it('R15 memory.list：并集可见+category 过滤+回写+result 含 count', async () => {
    const db = createTestDb()
    const repos = createRepos(db)
    const svc = createAiTasksService({ repos })
    seedMemory(db, 'paper', 'p-1', '本锚甲')
    seedMemory(db, 'global', null, '全局乙')
    seedMemory(db, 'paper', 'p-2', '他锚丙')
    const { final } = await submitRun(svc, repos, db, {
      action: 'memory.list',
      payload: {}
    })
    expect(final.status).toBe('succeeded')
    const parsed = JSON.parse(final.result!) as { count: number; rows: Array<{ title: string }> }
    expect(parsed.count).toBe(2)
    expect(parsed.rows.map((r) => r.title).sort()).toEqual(['全局乙', '本锚甲'])
    expect(
      (db.prepare('SELECT COUNT(*) c FROM ai_messages WHERE role=?').get('assistant') as { c: number }).c
    ).toBe(1)
    db.close()
  })

  it('R16 memory.list limit 闸②：上限 50 拒/非法值拒（提交期 INVALID_REQUEST）', async () => {
    const db = createTestDb()
    const repos = createRepos(db)
    const svc = createAiTasksService({ repos })
    seedPaper(db, 'p-1')
    const s = repos.aiSessions.createSession('paper', 'p-1')
    await expect(
      svc.submitTask({ sessionId: s.id, action: 'memory.list', payload: { limit: 51 } })
    ).rejects.toMatchObject({ code: 'INVALID_REQUEST' })
    await expect(
      svc.submitTask({ sessionId: s.id, action: 'memory.list', payload: { limit: 0 } })
    ).rejects.toMatchObject({ code: 'INVALID_REQUEST' })
    db.close()
  })

  it('R17 message.pin/unpin：本会话消息 ok 往返+审计 mutated；他会话消息 → failed 围栏', async () => {
    const db = createTestDb()
    const repos = createRepos(db)
    const svc = createAiTasksService({ repos })
    seedPaper(db, 'p-1')
    const s = repos.aiSessions.createSession('paper', 'p-1')
    const m = repos.aiSessions.insertWithEviction(s.id, 'user', '待任务置顶')
    const t = await svc.submitTask({ sessionId: s.id, action: 'message.pin', payload: { messageId: m.id } })
    const done = await svc.runTask({ taskId: t.id, sessionId: s.id })
    expect(done.status).toBe('succeeded')
    expect(db.prepare('SELECT pinned FROM ai_messages WHERE id = ?').get(m.id)).toEqual({ pinned: 1 })
    const t2 = await svc.submitTask({ sessionId: s.id, action: 'message.unpin', payload: { messageId: m.id } })
    await svc.runTask({ taskId: t2.id, sessionId: s.id })
    expect(db.prepare('SELECT pinned FROM ai_messages WHERE id = ?').get(m.id)).toEqual({ pinned: 0 })
    // 他会话消息围栏
    const s2 = repos.aiSessions.createSession('paper', 'p-1')
    const m2 = repos.aiSessions.insertWithEviction(s2.id, 'user', '他会话消息')
    const t3 = await svc.submitTask({ sessionId: s.id, action: 'message.pin', payload: { messageId: m2.id } })
    const bad = await svc.runTask({ taskId: t3.id, sessionId: s.id })
    expect(bad.status).toBe('failed')
    expect(bad.error).toContain('本任务会话')
    db.close()
  })

  it('R18 message.pin 缺席消息 → failed「消息不存在」', async () => {
    const db = createTestDb()
    const repos = createRepos(db)
    const svc = createAiTasksService({ repos })
    const { final } = await submitRun(svc, repos, db, {
      action: 'message.pin',
      payload: { messageId: 9999 }
    })
    expect(final.status).toBe('failed')
    expect(final.error).toContain('消息不存在')
    db.close()
  })

  it('R19 超时（now 注入）：变异零副作用（memory 行灭+mutated 审计灭）+timeout 终态+error+审计 timeout', async () => {
    const db = createTestDb()
    const repos = createRepos(db)
    const times = [1_000, 7_000] // start→checkpoint=6000ms>5000
    const svc = createAiTasksService({ repos, now: () => times.shift()! })
    const { taskId, final } = await submitRun(svc, repos, db, {
      action: 'memory.create',
      payload: { category: 'method_note', title: '超时写入', content: '文' }
    })
    expect(final.status).toBe('timeout')
    expect(final.error).toContain('超时')
    expect(db.prepare('SELECT COUNT(*) c FROM ai_memory').get()).toEqual({ c: 0 })
    const kinds = repos.aiTasks.listAudit(taskId).map((a) => a.kind)
    expect(kinds).toEqual(['submitted', 'target_resolved', 'timeout'])
    db.close()
  })

  it('R19b 未超时（elapsed=4000<5000）→ 正常 succeeded（now 注入对照组）', async () => {
    const db = createTestDb()
    const repos = createRepos(db)
    const times = [1_000, 5_000]
    const svc = createAiTasksService({ repos, now: () => times.shift()! })
    const { final } = await submitRun(svc, repos, db, {
      action: 'memory.create',
      payload: { category: 'method_note', title: '未超时写入', content: '文' }
    })
    expect(final.status).toBe('succeeded')
    expect(db.prepare('SELECT COUNT(*) c FROM ai_memory').get()).toEqual({ c: 1 })
    db.close()
  })

  it('R20 成功路径拒写分支（N-6）：CAP 态回写 → result_overflow 审计+仍 succeeded+result=null+50 行不变', async () => {
    const db = createTestDb()
    const repos = createRepos(db)
    const svc = createAiTasksService({ repos })
    seedPaper(db, 'p-1')
    const s = repos.aiSessions.createSession('paper', 'p-1')
    // 满员全置顶：append 即拒写
    const seed = db.prepare(
      `INSERT INTO ai_messages (session_id, role, content, pinned, created_at, updated_at)
       VALUES (?, 'user', ?, 1, 't', 't')`
    )
    for (let i = 1; i <= 50; i++) seed.run(s.id, `消息${i}`)
    seedMemory(db, 'paper', 'p-1', '浊度语料', 'x')
    const t = await svc.submitTask({ sessionId: s.id, action: 'memory.search', payload: { query: '浊度' } })
    const final = await svc.runTask({ taskId: t.id, sessionId: s.id })
    expect(final.status).toBe('succeeded')
    expect(final.result).toBeNull()
    const audit = repos.aiTasks.listAudit(t.id)
    expect(audit.map((a) => a.kind)).toEqual(['submitted', 'target_resolved', 'result_overflow', 'succeeded'])
    expect(audit[2]!.detail).toContain('浊度')
    expect(
      (db.prepare('SELECT COUNT(*) c FROM ai_messages WHERE session_id = ?').get(s.id) as { c: number }).c
    ).toBe(50)
    db.close()
  })

  it('R21 恢复扫描：running 行 → failed(interrupted) 计数+queued 不动', async () => {
    const db = createTestDb()
    const repos = createRepos(db)
    const svc = createAiTasksService({ repos })
    seedPaper(db, 'p-1')
    const s = repos.aiSessions.createSession('paper', 'p-1')
    const r1 = await svc.submitTask({ sessionId: s.id, action: 'memory.list', payload: {} })
    const r2 = await svc.submitTask({ sessionId: s.id, action: 'memory.list', payload: {} })
    const q = await svc.submitTask({ sessionId: s.id, action: 'memory.list', payload: {} })
    repos.aiTasks.transitionToRunning(r1.id, 'd')
    repos.aiTasks.transitionToRunning(r2.id, 'd')
    await expect(svc.recoverInterruptedTasks()).resolves.toBe(2)
    for (const id of [r1.id, r2.id]) {
      expect(repos.aiTasks.getById(id)?.status).toBe('failed')
      expect(repos.aiTasks.getById(id)?.error).toBe('interrupted')
    }
    expect(repos.aiTasks.getById(q.id)?.status).toBe('queued')
    db.close()
  })

  it('R22 listTasks：scope/anchor/status 过滤+id DESC+limit 默认 50/超 200 拒/非法拒', async () => {
    const db = createTestDb()
    const repos = createRepos(db)
    const svc = createAiTasksService({ repos })
    seedPaper(db, 'p-1')
    const s = repos.aiSessions.createSession('paper', 'p-1')
    const t1 = await svc.submitTask({ sessionId: s.id, action: 'memory.list', payload: {} })
    const t2 = await svc.submitTask({ sessionId: s.id, action: 'memory.search', payload: { query: 'x' } })
    await svc.cancelTask(t1.id)
    const all = await svc.listTasks({})
    expect(all.map((t) => t.id)).toEqual([t2.id, t1.id])
    expect(await svc.listTasks({ status: 'cancelled' })).toHaveLength(1)
    expect(await svc.listTasks({ scope: 'paper', anchorId: 'p-1' })).toHaveLength(2)
    expect(await svc.listTasks({ limit: 1 })).toHaveLength(1)
    await expect(svc.listTasks({ limit: 201 })).rejects.toMatchObject({ code: 'INVALID_REQUEST' })
    await expect(svc.listTasks({ limit: 1.5 })).rejects.toMatchObject({ code: 'INVALID_REQUEST' })
    db.close()
  })
})
