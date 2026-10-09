/**
 * [F-DBCAMP-01 DB-2 U2b-2a] ai-recovery 用例（always-active 真库夹具——
 * 必接三件①恢复扫描 bootstrap 接线的纯函数直证面）。覆盖简报 §3.d①：
 * running 行→failed(interrupted) 计数/幂等二跑 0/非 running 态不动/多行计数。
 * always-active（不经 guardedDescribe）。
 */
import { describe, expect, it } from 'vitest'
import { runStartupRecovery } from '../../../src/main/services/ai/ai-recovery'
import { createAiTasksService } from '../../../src/main/services/ai/ai-tasks.service'
import { createRepos } from '../../../src/main/db/repos'
import { createTestDb } from '../../utils/fixtures'

type Db = ReturnType<typeof createTestDb>

function setup(db: Db) {
  const repos = createRepos(db)
  db.prepare(
    `INSERT INTO papers (id, file_ref, sha256, title, added_at, updated_at)
     VALUES ('p-1', 'f/p-1.pdf', 'sha-p-1', '文献p-1', 't', 't')`
  ).run()
  const svc = createAiTasksService({ repos })
  return { repos, svc }
}

describe('F-DBCAMP-01 DB-2 U2b-2a ai-recovery —— 启动恢复扫描接线', () => {
  it('V1 running 行 → failed(interrupted)+返回 1（事务 A 已提交 running 的崩溃现场）', async () => {
    const db = createTestDb()
    const { repos, svc } = setup(db)
    const s = repos.aiSessions.createSession('paper', 'p-1')
    const t = await svc.submitTask({ sessionId: s.id, action: 'memory.list', payload: {} })
    repos.aiTasks.transitionToRunning(t.id, 'd') // 崩溃现场：running 悬置
    const n = await runStartupRecovery(svc)
    expect(n).toBe(1)
    const after = repos.aiTasks.getById(t.id)!
    expect(after.status).toBe('failed')
    expect(after.error).toBe('interrupted')
    db.close()
  })

  it('V2 幂等二跑：再扫描返回 0+行态零变化', async () => {
    const db = createTestDb()
    const { repos, svc } = setup(db)
    const s = repos.aiSessions.createSession('paper', 'p-1')
    const t = await svc.submitTask({ sessionId: s.id, action: 'memory.list', payload: {} })
    repos.aiTasks.transitionToRunning(t.id, 'd')
    await runStartupRecovery(svc)
    const second = await runStartupRecovery(svc)
    expect(second).toBe(0)
    expect(repos.aiTasks.getById(t.id)!.status).toBe('failed') // 态不动
    db.close()
  })

  it('V3 非 running 态不动（queued/succeeded 零迁移）', async () => {
    const db = createTestDb()
    const { repos, svc } = setup(db)
    const s = repos.aiSessions.createSession('paper', 'p-1')
    const queued = await svc.submitTask({ sessionId: s.id, action: 'memory.list', payload: {} })
    const done = await svc.submitTask({ sessionId: s.id, action: 'memory.list', payload: {} })
    await svc.runTask({ taskId: done.id, sessionId: s.id })
    expect(await runStartupRecovery(svc)).toBe(0)
    expect(repos.aiTasks.getById(queued.id)!.status).toBe('queued')
    expect(repos.aiTasks.getById(done.id)!.status).toBe('succeeded')
    db.close()
  })

  it('V4 多 running 行计数（3 行→3）+逐行 failed 审计在场', async () => {
    const db = createTestDb()
    const { repos, svc } = setup(db)
    const s = repos.aiSessions.createSession('paper', 'p-1')
    const ids: number[] = []
    for (let i = 0; i < 3; i++) {
      const t = await svc.submitTask({ sessionId: s.id, action: 'memory.list', payload: {} })
      repos.aiTasks.transitionToRunning(t.id, 'd')
      ids.push(t.id)
    }
    expect(await runStartupRecovery(svc)).toBe(3)
    for (const id of ids) {
      const audit = repos.aiTasks.listAudit(id)
      expect(audit[audit.length - 1]!.kind).toBe('failed')
      expect(audit[audit.length - 1]!.detail).toBe('interrupted')
    }
    db.close()
  })
})
