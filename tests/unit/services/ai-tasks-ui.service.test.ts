/**
 * [F-DBCAMP-01 DB-2 U2 r1 R1] ai-tasks.service UI 读面用例（always-active 真库
 * 夹具——主控简报清单漏列的测试缺口补齐，门一双席审处置单）。
 * 覆盖：listTasksForUi（死过滤形双路短路〔global/裸 anchorId:null〕+limit 运行期
 * 闸+status/scope 外值运行期闸+投影〔剥 payload+targetTitle 精确值+scope/anchorId
 * 平铺〕）；cancelTaskForUi（payload 剥离+targetTitle 回查+与 aiTaskSchema 字面集
 * 对齐的键集+幽灵 NOT_FOUND+非 queued CONFLICT）；listAudit（afterSeq 游标+缺省
 * limit=100+剥 id 投影+幽灵空 rows 非抛）。
 * always-active（不经 guardedDescribe）。
 */
import { describe, expect, it } from 'vitest'
import { createAiTasksService } from '../../../src/main/services/ai/ai-tasks.service'
import { createRepos } from '../../../src/main/db/repos'
import { aiTaskSchema } from '../../../src/shared/models/ai-domain'
import { createTestDb } from '../../utils/fixtures'

type Db = ReturnType<typeof createTestDb>

function seedPaper(db: Db, id: string, title: string): void {
  db.prepare(
    `INSERT INTO papers (id, file_ref, sha256, title, added_at, updated_at)
     VALUES (?, ?, ?, ?, 't', 't')`
  ).run(id, `f/${id}.pdf`, `sha-${id}`, title)
}

function seedCollection(db: Db, id: string, name: string): void {
  db.prepare('INSERT INTO collections (id, name, position) VALUES (?, ?, 0)').run(id, name)
}

function seedTask(
  db: Db,
  v: { scope: 'paper' | 'lineage'; anchor: string; payload?: string } = { scope: 'paper', anchor: 'p-1' }
): number {
  const r = db
    .prepare(
      `INSERT INTO ai_tasks (scope, anchor_id, action, payload, created_at, updated_at)
       VALUES (?, ?, 'memory.create', ?, 't', 't')`
    )
    .run(v.scope, v.anchor, v.payload ?? '{"memoryId":9}')
  return Number(r.lastInsertRowid)
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

/** aiTaskSchema 字面键集（单源消费——键集对齐断言基线） */
const TASK_KEYS = Object.keys(aiTaskSchema.shape).sort()

describe('F-DBCAMP-01 DB-2 U2 r1 ai-tasks.service —— UI 读面（listTasksForUi/cancelTaskForUi/listAudit）', () => {
  it('R1-1 listTasksForUi 死过滤形双路短路：scope:global / 裸 anchorId:null → 恒空 []（DDL 无 global 任务行）', async () => {
    const db = createTestDb()
    const svc = createAiTasksService({ repos: createRepos(db) })
    seedPaper(db, 'p-1', '文献甲')
    seedTask(db) // paper 档行在场——恒空非「无行」假象
    expect(await svc.listTasksForUi({ scope: 'global' })).toEqual([])
    expect(await svc.listTasksForUi({ anchorId: null })).toEqual([])
    // 对照组：同库无过滤面可见（短路非过滤面吞行）
    expect(await svc.listTasksForUi({})).toHaveLength(1)
    db.close()
  })

  it('R1-2 listTasksForUi limit 运行期闸：0/201/非整数 → INVALID_REQUEST；1-200 过', async () => {
    const db = createTestDb()
    const svc = createAiTasksService({ repos: createRepos(db) })
    seedPaper(db, 'p-1', '文献甲')
    seedTask(db)
    await expectDomainError(() => svc.listTasksForUi({ limit: 0 }), 'INVALID_REQUEST', 'limit')
    await expectDomainError(() => svc.listTasksForUi({ limit: 201 }), 'INVALID_REQUEST', 'limit')
    await expectDomainError(() => svc.listTasksForUi({ limit: 1.5 }), 'INVALID_REQUEST', 'limit')
    expect(await svc.listTasksForUi({ limit: 1 })).toHaveLength(1)
    expect(await svc.listTasksForUi({ limit: 200 })).toHaveLength(1)
    db.close()
  })

  it('R1-3 listTasksForUi 运行期值域闸：status 外值拒+scope 外值拒（global=zod 合法值走短路〔R1-1 已锚〕，此处锚闸拒路径）', async () => {
    const db = createTestDb()
    const svc = createAiTasksService({ repos: createRepos(db) })
    seedPaper(db, 'p-1', '文献甲')
    seedTask(db)
    await expectDomainError(
      () => svc.listTasksForUi({ status: 'weird' as 'queued' }),
      'INVALID_REQUEST',
      '状态'
    )
    await expectDomainError(
      () => svc.listTasksForUi({ scope: 'project' as 'paper' }),
      'INVALID_REQUEST',
      '范围'
    )
    db.close()
  })

  it('R1-4 listTasksForUi 投影：剥 payload+targetTitle 精确值（paper→papers.title/lineage→collections.name）+scope/anchorId 平铺恒在', async () => {
    const db = createTestDb()
    const svc = createAiTasksService({ repos: createRepos(db) })
    seedPaper(db, 'p-1', '文献甲')
    seedCollection(db, 'c-1', '图丙')
    seedTask(db, { scope: 'paper', anchor: 'p-1' })
    seedTask(db, { scope: 'lineage', anchor: 'c-1' })
    const tasks = await svc.listTasksForUi({})
    expect(tasks).toHaveLength(2)
    for (const t of tasks) {
      expect('payload' in t).toBe(false)
      expect(t.scope === 'paper' || t.scope === 'lineage').toBe(true)
      expect(typeof t.anchorId).toBe('string')
      expect(t.anchorId.length).toBeGreaterThan(0)
    }
    const byScope = new Map(tasks.map((t) => [t.scope, t]))
    expect(byScope.get('paper')?.targetTitle).toBe('文献甲')
    expect(byScope.get('lineage')?.targetTitle).toBe('图丙')
    db.close()
  })

  it('R1-5 cancelTaskForUi：payload 剥离+targetTitle 回查+键集与 aiTaskSchema 字面集对齐；幽灵 NOT_FOUND；非 queued CONFLICT', async () => {
    const db = createTestDb()
    const svc = createAiTasksService({ repos: createRepos(db) })
    seedPaper(db, 'p-1', '文献甲')
    const id = seedTask(db, { scope: 'paper', anchor: 'p-1' })
    const cancelled = await svc.cancelTaskForUi(id)
    expect('payload' in cancelled).toBe(false)
    expect(cancelled.targetTitle).toBe('文献甲')
    expect(cancelled.status).toBe('cancelled')
    expect(Object.keys(cancelled).sort()).toEqual(TASK_KEYS)
    await expectDomainError(() => svc.cancelTaskForUi(9999), 'NOT_FOUND', '任务不存在')
    await expectDomainError(() => svc.cancelTaskForUi(id), 'CONFLICT', '可取消')
    db.close()
  })

  it('R1-6 listAudit：afterSeq=2+limit=2 → 恰 seq 3,4 升序；缺省 limit=100（105 行断言 100）+缺省 afterSeq=0 含 seq1；剥 id 投影；幽灵空 rows 非抛', async () => {
    const db = createTestDb()
    const repos = createRepos(db)
    const svc = createAiTasksService({ repos })
    const id = seedTask(db) // seedTask=裸 INSERT 无审计行——追加 5 行=seq 1..5
    for (let i = 1; i <= 5; i++) repos.aiTasks.appendAudit(id, 'mutated', `d${i}`)
    const page = await svc.listAudit({ taskId: id, afterSeq: 2, limit: 2 })
    expect(page.map((r) => r.seq)).toEqual([3, 4])
    for (const r of page) expect('id' in r).toBe(false)
    // 缺省档：105 追加行=seq 1..105 → 缺省调用恰前 100 行（limit=100 锁定）
    const id2 = seedTask(db, { scope: 'paper', anchor: 'p-2' })
    for (let i = 1; i <= 105; i++) repos.aiTasks.appendAudit(id2, 'mutated', `b${i}`)
    const defaulted = await svc.listAudit({ taskId: id2 })
    expect(defaulted).toHaveLength(100)
    expect(defaulted[0]!.seq).toBe(1) // 缺省 afterSeq=0 含首行
    for (const r of defaulted.slice(0, 3)) expect('id' in r).toBe(false)
    expect(await svc.listAudit({ taskId: 9999 })).toEqual([])
    db.close()
  })
})
