/**
 * [F-DBCAMP-01 DB-2 U2b-1] ai-tasks.repo 锁定测试（always-active 真库夹具）。
 *
 * 覆盖：任务插入/读取/幂等键查询/守卫 UPDATE 各态拒/审计 seq 同任务递增跨任务
 * 独立/恢复扫描 running→failed 计数/事务 B 载体（savepoint 回滚语义+原子性）/
 * listTasks 过滤与序。审计只 INSERT 面（改删由 G2 测试锁——migrate-ai-domain 既有）。
 * always-active（不经 guardedDescribe）。
 */
import { describe, expect, it } from 'vitest'
import { createAiTasksRepo } from '../../../../src/main/db/repos/ai-tasks.repo'
import { createTestDb } from '../../../utils/fixtures'

type Db = ReturnType<typeof createTestDb>

const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/

function newRepo(db: Db): ReturnType<typeof createAiTasksRepo> {
  return createAiTasksRepo(db)
}

function queuedTask(
  db: Db,
  v: { anchor?: string; action?: string; key?: string | null } = {}
): number {
  const repo = newRepo(db)
  const row = repo.insertQueued({
    scope: 'paper',
    anchor: v.anchor ?? 'p-1',
    action: (v.action ?? 'memory.create') as never,
    payloadJson: '{}',
    idempotencyKey: v.key ?? null,
    submittedDetail: `target_resolved=(scope=paper,anchor=${v.anchor ?? 'p-1'}) action=${v.action ?? 'memory.create'}`
  })
  return row.id
}

describe('F-DBCAMP-01 DB-2 U2b-1 ai-tasks.repo —— 任务行 CRUD+守卫迁移+审计+恢复', () => {
  it('T1 insertQueued 落位：status=queued 全列+ISO 时间戳+审计 submitted 行（detail 含目标描述符+action）', () => {
    const db = createTestDb()
    const repo = newRepo(db)
    const row = repo.insertQueued({
      scope: 'lineage',
      anchor: 'c-1',
      action: 'memory.search',
      payloadJson: '{"query":"语料"}',
      idempotencyKey: 'idem-1',
      submittedDetail: 'target_resolved=(scope=lineage,anchor=c-1) action=memory.search'
    })
    expect(row.id).toBeGreaterThan(0)
    expect(row.scope).toBe('lineage')
    expect(row.anchorId).toBe('c-1')
    expect(row.action).toBe('memory.search')
    expect(row.payload).toBe('{"query":"语料"}')
    expect(row.status).toBe('queued')
    expect(row.result).toBeNull()
    expect(row.error).toBeNull()
    expect(row.idempotencyKey).toBe('idem-1')
    expect(ISO_RE.test(row.createdAt)).toBe(true)
    expect(row.updatedAt).toBe(row.createdAt)
    const audit = repo.listAudit(row.id)
    expect(audit.map((a) => a.kind)).toEqual(['submitted'])
    expect(audit[0]!.seq).toBe(1)
    expect(audit[0]!.detail).toContain('target_resolved=(scope=lineage,anchor=c-1)')
    expect(audit[0]!.detail).toContain('action=memory.search')
    db.close()
  })

  it('T2 幂等键查询：findByIdempotencyKey 命中/缺席 null+无键任务 idempotencyKey=null', () => {
    const db = createTestDb()
    const repo = newRepo(db)
    const withKey = queuedTask(db, { key: 'idem-a' })
    const noKey = queuedTask(db, { anchor: 'p-2' })
    expect(repo.findByIdempotencyKey('idem-a')?.id).toBe(withKey)
    expect(repo.findByIdempotencyKey('无此键')).toBeNull()
    expect(repo.getById(noKey)?.idempotencyKey).toBeNull()
    db.close()
  })

  it('T3 getById：在场全列映射+缺席 null', () => {
    const db = createTestDb()
    const repo = newRepo(db)
    const id = queuedTask(db)
    expect(repo.getById(id)?.action).toBe('memory.create')
    expect(repo.getById(9999)).toBeNull()
    db.close()
  })

  it('T4 transitionToRunning：queued→running+审计 target_resolved 行+行返回', () => {
    const db = createTestDb()
    const repo = newRepo(db)
    const id = queuedTask(db)
    const row = repo.transitionToRunning(id, 'target_resolved=(scope=paper,anchor=p-1)')
    expect(row?.status).toBe('running')
    expect(row && ISO_RE.test(row.updatedAt)).toBe(true)
    expect(repo.listAudit(id).map((a) => a.kind)).toEqual(['submitted', 'target_resolved'])
    db.close()
  })

  it('T5 守卫 UPDATE 拒非 queued：running 二迁→null+零审计增量+状态不动', () => {
    const db = createTestDb()
    const repo = newRepo(db)
    const id = queuedTask(db)
    repo.transitionToRunning(id, 'd')
    expect(repo.transitionToRunning(id, 'd2')).toBeNull()
    expect(repo.getById(id)?.status).toBe('running')
    expect(repo.listAudit(id).map((a) => a.kind)).toEqual(['submitted', 'target_resolved'])
    db.close()
  })

  it('T6 守卫 UPDATE 拒终态回迁：succeeded/cancelled→running 均 null（每终态回迁抽样）', () => {
    const db = createTestDb()
    const repo = newRepo(db)
    // succeeded 回迁
    const a = queuedTask(db)
    repo.transitionToRunning(a, 'd')
    repo.finalizeRunning(a, 'succeeded', { result: '{}' }, { kind: 'succeeded', detail: '完成' })
    expect(repo.transitionToRunning(a, 'd')).toBeNull()
    // cancelled 回迁
    const b = queuedTask(db, { anchor: 'p-2' })
    repo.cancelQueued(b, '用户取消')
    expect(repo.transitionToRunning(b, 'd')).toBeNull()
    expect(repo.getById(b)?.status).toBe('cancelled')
    db.close()
  })

  it('T7 cancelQueued：queued→cancelled+审计 cancelled 行', () => {
    const db = createTestDb()
    const repo = newRepo(db)
    const id = queuedTask(db)
    const row = repo.cancelQueued(id, '用户取消')
    expect(row?.status).toBe('cancelled')
    expect(repo.listAudit(id).map((a) => a.kind)).toEqual(['submitted', 'cancelled'])
    db.close()
  })

  it('T8 cancelQueued 拒 running（v1 running 不可取消）+拒已 cancelled（幂等拒）', () => {
    const db = createTestDb()
    const repo = newRepo(db)
    const id = queuedTask(db)
    repo.transitionToRunning(id, 'd')
    expect(repo.cancelQueued(id, '取消探针')).toBeNull()
    expect(repo.getById(id)?.status).toBe('running')
    const b = queuedTask(db, { anchor: 'p-2' })
    repo.cancelQueued(b, '一次')
    expect(repo.cancelQueued(b, '二次')).toBeNull()
    db.close()
  })

  it('T9 finalizeRunning 三终态：succeeded（result+审计）/failed（error+审计）/timeout（error+审计）', () => {
    const db = createTestDb()
    const repo = newRepo(db)
    const mk = (): number => {
      const id = queuedTask(db)
      repo.transitionToRunning(id, 'd')
      return id
    }
    const a = mk()
    const ra = repo.finalizeRunning(a, 'succeeded', { result: '{"memoryId":9}' }, { kind: 'succeeded', detail: '完成' })
    expect(ra?.status).toBe('succeeded')
    expect(ra?.result).toBe('{"memoryId":9}')
    expect(ra?.error).toBeNull()
    const b = mk()
    const rb = repo.finalizeRunning(b, 'failed', { error: '围栏越界' }, { kind: 'failed', detail: '围栏越界' })
    expect(rb?.status).toBe('failed')
    expect(rb?.error).toBe('围栏越界')
    expect(rb?.result).toBeNull()
    const c = mk()
    const rc = repo.finalizeRunning(c, 'timeout', { error: '任务超时' }, { kind: 'timeout', detail: '耗时 6000ms' })
    expect(rc?.status).toBe('timeout')
    expect(rc?.error).toBe('任务超时')
    for (const [id, kind] of [
      [a, 'succeeded'],
      [b, 'failed'],
      [c, 'timeout']
    ] as const) {
      expect(repo.listAudit(id).map((x) => x.kind)).toEqual(['submitted', 'target_resolved', kind])
    }
    db.close()
  })

  it('T10 appendAudit seq：同任务 1→2→3 严格递增+跨任务独立（各自从 1 起）', () => {
    const db = createTestDb()
    const repo = newRepo(db)
    const a = queuedTask(db)
    const b = queuedTask(db, { anchor: 'p-2' })
    repo.appendAudit(a, 'mutated', 'd1')
    repo.appendAudit(b, 'mutated', 'd2')
    repo.appendAudit(a, 'result_overflow', 'd3')
    expect(repo.listAudit(a).map((x) => x.seq)).toEqual([1, 2, 3])
    expect(repo.listAudit(b).map((x) => x.seq)).toEqual([1, 2])
    db.close()
  })

  it('T11 recoverInterrupted：running→failed(interrupted) 计数+逐行审计+queued/succeeded 不动', () => {
    const db = createTestDb()
    const repo = newRepo(db)
    const r1 = queuedTask(db)
    const r2 = queuedTask(db, { anchor: 'p-2' })
    const q = queuedTask(db, { anchor: 'p-3' })
    const s = queuedTask(db, { anchor: 'p-4' })
    repo.transitionToRunning(r1, 'd')
    repo.transitionToRunning(r2, 'd')
    repo.transitionToRunning(s, 'd')
    repo.finalizeRunning(s, 'succeeded', { result: '{}' }, { kind: 'succeeded', detail: '完成' })
    const n = repo.recoverInterrupted('interrupted')
    expect(n).toBe(2)
    for (const id of [r1, r2]) {
      expect(repo.getById(id)?.status).toBe('failed')
      expect(repo.getById(id)?.error).toBe('interrupted')
      const kinds = repo.listAudit(id).map((x) => x.kind)
      expect(kinds[kinds.length - 1]).toBe('failed')
      expect(repo.listAudit(id).at(-1)?.detail).toContain('interrupted')
    }
    expect(repo.getById(q)?.status).toBe('queued')
    expect(repo.getById(s)?.status).toBe('succeeded')
    db.close()
  })

  it('T12 recoverInterrupted 空扫描：零 running → 0（幂等可重跑）', () => {
    const db = createTestDb()
    const repo = newRepo(db)
    const id = queuedTask(db)
    expect(repo.recoverInterrupted('interrupted')).toBe(0)
    expect(repo.getById(id)?.status).toBe('queued')
    db.close()
  })

  it('T13 runTaskTx 原子性：fn 抛错→整体回滚（终态零残留）', () => {
    const db = createTestDb()
    const repo = newRepo(db)
    const id = queuedTask(db)
    expect(() =>
      repo.runTaskTx((api) => {
        api.appendAudit(id, 'mutated', '将回滚')
        throw new Error('事务内炸点')
      })
    ).toThrow('事务内炸点')
    expect(repo.listAudit(id).map((x) => x.kind)).toEqual(['submitted'])
    db.close()
  })

  it('T14 savepoint 语义：begin→mutate→rollback→release=变异灭；begin→mutate→release=变异存（提交后可见）', () => {
    const db = createTestDb()
    const repo = newRepo(db)
    const a = queuedTask(db)
    repo.runTaskTx((api) => {
      api.savepointBegin()
      api.appendAudit(a, 'mutated', '将回滚段')
      api.savepointRollback()
      api.savepointRelease()
      api.savepointBegin()
      api.appendAudit(a, 'mutated', '保留段')
      api.savepointRelease()
    })
    const details = repo.listAudit(a).map((x) => x.detail ?? '')
    expect(details.some((d) => d.includes('保留段'))).toBe(true)
    expect(details.some((d) => d.includes('将回滚段'))).toBe(false)
    db.close()
  })

  it('T15 savepoint 后 finalize 同事务共存：rollback→finalize timeout 落库（超时终态承载面）', () => {
    const db = createTestDb()
    const repo = newRepo(db)
    const id = queuedTask(db)
    repo.transitionToRunning(id, 'd')
    repo.runTaskTx((api) => {
      api.savepointBegin()
      api.appendAudit(id, 'mutated', '超时将回滚')
      api.savepointRollback()
      api.savepointRelease()
      api.finalizeRunning(id, 'timeout', { error: '任务超时' }, { kind: 'timeout', detail: '耗时 6000ms' })
    })
    expect(repo.getById(id)?.status).toBe('timeout')
    const kinds = repo.listAudit(id).map((x) => x.kind)
    expect(kinds).toEqual(['submitted', 'target_resolved', 'timeout'])
    db.close()
  })

  it('T16 listTasks：无过滤序=id DESC+过滤（scope/anchor/status）+limit 截断+默认上限 50', () => {
    const db = createTestDb()
    const repo = newRepo(db)
    for (let i = 1; i <= 3; i++) queuedTask(db, { anchor: `p-${i}` })
    queuedTask(db, { anchor: 'c-9', action: 'memory.list' })
    const all = repo.listTasks({ limit: 50 })
    expect(all.map((r) => r.id)).toEqual([...all.map((r) => r.id)].sort((x, y) => y - x))
    expect(all).toHaveLength(4)
    expect(repo.listTasks({ scope: 'paper', anchorId: 'p-2', limit: 50 })).toHaveLength(1)
    expect(repo.listTasks({ status: 'queued', limit: 50 })).toHaveLength(4)
    expect(repo.listTasks({ status: 'running', limit: 50 })).toHaveLength(0)
    expect(repo.listTasks({ limit: 2 })).toHaveLength(2)
    db.close()
  })

  it('T17 listTasks 默认上限 50：55 行 → 恰 50 行（id DESC 前 50）', () => {
    const db = createTestDb()
    const repo = newRepo(db)
    for (let i = 1; i <= 55; i++) queuedTask(db, { anchor: `p-${i}` })
    const rows = repo.listTasks({})
    expect(rows).toHaveLength(50)
    expect(rows[0]!.anchorId).toBe('p-55')
    db.close()
  })

  it('T18 finalize 守卫拒态（r1 k3-N2）：非 running 态调 finalizeRunning → throw+零审计增量+状态不动', () => {
    const db = createTestDb()
    const repo = newRepo(db)
    const id = queuedTask(db) // queued 非 running
    expect(() =>
      repo.finalizeRunning(id, 'succeeded', { result: '{}' }, { kind: 'succeeded', detail: 'd' })
    ).toThrow(/非 running/)
    expect(repo.getById(id)?.status).toBe('queued')
    expect(repo.listAudit(id).map((a) => a.kind)).toEqual(['submitted'])
    db.close()
  })
})
