/**
 * [F-DBCAMP-01 DB-2 U2b-1] ai-tasks.service 提交面用例（always-active 真库真 repos
 * 夹具——ai-sessions.service.test 同型）。覆盖简报 §3.g：三闸矩阵（非法 action/
 * 未知字段/类型错/global 会话缺 target/显式 target global 拒/target 锚不存在——
 * 含形态先于存在性复合序）+目标继承/跨锚+幂等+三方对齐断言。
 * runTask/handler/超时/拒写分支面=ai-tasks-run.service.test.ts（预筹拆分）。
 * always-active（不经 guardedDescribe）。
 */
import { describe, expect, it } from 'vitest'
import { createAiTasksService } from '../../../src/main/services/ai/ai-tasks.service'
import { AiDomainError } from '../../../src/main/services/ai/ai-sessions.service'
import { AI_TASK_ACTIONS, AI_MEMORY_CATEGORIES } from '../../../src/main/services/ai/ai-tasks.actions'
import { TASK_HANDLER_ACTIONS } from '../../../src/main/services/ai/ai-tasks.service'
import { createRepos } from '../../../src/main/db/repos'
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

/** 九动作白名单硬编码镜像（三方对齐的独立 oracle——防自引自恒真） */
const NINE_ACTIONS = [
  'memory.create', 'memory.delete', 'memory.list', 'memory.pin', 'memory.search',
  'memory.unpin', 'memory.update', 'message.pin', 'message.unpin'
] as const

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

describe('F-DBCAMP-01 DB-2 U2b-1 ai-tasks.service —— 提交面三闸+目标围栏+幂等', () => {
  it('G1 非法 action → INVALID_REQUEST（白名单外）', async () => {
    const db = createTestDb()
    const repos = createRepos(db)
    const svc = createAiTasksService({ repos })
    seedPaper(db, 'p-1')
    const s = repos.aiSessions.createSession('paper', 'p-1')
    await expectDomainError(
      () =>
        svc.submitTask({
          sessionId: s.id,
          action: 'memory.wipe' as never,
          payload: {}
        }),
      'INVALID_REQUEST',
      '动作'
    )
    expect(db.prepare('SELECT COUNT(*) c FROM ai_tasks').get()).toEqual({ c: 0 })
    db.close()
  })

  it('G2 payload 非对象/未知字段/类型错 → INVALID_REQUEST（闸②白名单 schema）', async () => {
    const db = createTestDb()
    const repos = createRepos(db)
    const svc = createAiTasksService({ repos })
    seedPaper(db, 'p-1')
    const s = repos.aiSessions.createSession('paper', 'p-1')
    await expectDomainError(
      () => svc.submitTask({ sessionId: s.id, action: 'memory.create', payload: '字符串' }),
      'INVALID_REQUEST',
      '对象'
    )
    await expectDomainError(
      () =>
        svc.submitTask({
          sessionId: s.id,
          action: 'memory.create',
          payload: { category: 'method_note', title: '题', content: '文', extra: 1 }
        }),
      'INVALID_REQUEST',
      '载荷字段非法'
    )
    await expectDomainError(
      () =>
        svc.submitTask({
          sessionId: s.id,
          action: 'memory.create',
          payload: { category: 'method_note', title: 42, content: '文' }
        }),
      'INVALID_REQUEST',
      '载荷字段非法'
    )
    await expectDomainError(
      () =>
        svc.submitTask({
          sessionId: s.id,
          action: 'memory.delete',
          payload: { memoryId: 1.5 }
        }),
      'INVALID_REQUEST'
    )
    db.close()
  })

  it('G3 payload 值域错：分类不在 19 值集/title 超长/content 空白 → INVALID_REQUEST', async () => {
    const db = createTestDb()
    const repos = createRepos(db)
    const svc = createAiTasksService({ repos })
    seedPaper(db, 'p-1')
    const s = repos.aiSessions.createSession('paper', 'p-1')
    await expectDomainError(
      () =>
        svc.submitTask({
          sessionId: s.id,
          action: 'memory.create',
          payload: { category: '杜撰类', title: '题', content: '文' }
        }),
      'INVALID_REQUEST',
      '分类'
    )
    await expectDomainError(
      () =>
        svc.submitTask({
          sessionId: s.id,
          action: 'memory.create',
          payload: { category: 'method_note', title: 'x'.repeat(121), content: '文' }
        }),
      'INVALID_REQUEST',
      'title'
    )
    await expectDomainError(
      () =>
        svc.submitTask({
          sessionId: s.id,
          action: 'memory.create',
          payload: { category: 'method_note', title: '题', content: '   ' }
        }),
      'INVALID_REQUEST',
      'content'
    )
    db.close()
  })

  it('G4 幽灵会话 → NOT_FOUND「会话不存在」（闸③）', async () => {
    const db = createTestDb()
    const svc = createAiTasksService({ repos: createRepos(db) })
    await expectDomainError(
      () =>
        svc.submitTask({ sessionId: 9999, action: 'memory.list', payload: {} }),
      'NOT_FOUND',
      '会话不存在'
    )
    expect(db.prepare('SELECT COUNT(*) c FROM ai_tasks').get()).toEqual({ c: 0 })
    db.close()
  })

  it('G5 复合序：非法 action×幽灵会话 → INVALID_REQUEST 先（形态先于存在性——裁③）', async () => {
    const db = createTestDb()
    const svc = createAiTasksService({ repos: createRepos(db) })
    await expectDomainError(
      () =>
        svc.submitTask({ sessionId: 9999, action: 'x.y' as never, payload: {} }),
      'INVALID_REQUEST'
    )
    await expectDomainError(
      () =>
        svc.submitTask({ sessionId: 9999, action: 'memory.create', payload: { bogus: 1 } }),
      'INVALID_REQUEST'
    )
    db.close()
  })

  it('G6 global 会话缺 target → INVALID_REQUEST（无默认锚）', async () => {
    const db = createTestDb()
    const repos = createRepos(db)
    const svc = createAiTasksService({ repos })
    const s = repos.aiSessions.createSession('global', null)
    await expectDomainError(
      () => svc.submitTask({ sessionId: s.id, action: 'memory.list', payload: {} }),
      'INVALID_REQUEST',
      '显式'
    )
    db.close()
  })

  it('G7 显式 target scope=global → INVALID_REQUEST「全局资源不可为任务目标」', async () => {
    const db = createTestDb()
    const repos = createRepos(db)
    const svc = createAiTasksService({ repos })
    seedPaper(db, 'p-1')
    const s = repos.aiSessions.createSession('paper', 'p-1')
    await expectDomainError(
      () =>
        svc.submitTask({
          sessionId: s.id,
          action: 'memory.list',
          payload: {},
          target: { scope: 'global' as never, anchorId: 'p-1' }
        }),
      'INVALID_REQUEST',
      '全局资源不可为任务目标'
    )
    db.close()
  })

  it('G8 显式 target anchorId 空 → INVALID_REQUEST', async () => {
    const db = createTestDb()
    const repos = createRepos(db)
    const svc = createAiTasksService({ repos })
    seedPaper(db, 'p-1')
    const s = repos.aiSessions.createSession('paper', 'p-1')
    await expectDomainError(
      () =>
        svc.submitTask({
          sessionId: s.id,
          action: 'memory.list',
          payload: {},
          target: { scope: 'paper', anchorId: '' }
        }),
      'INVALID_REQUEST',
      '锚'
    )
    db.close()
  })

  it('G9 target 锚不存在：paper/lineage 各 1 → NOT_FOUND（存在性闸）', async () => {
    const db = createTestDb()
    const repos = createRepos(db)
    const svc = createAiTasksService({ repos })
    seedPaper(db, 'p-1')
    const s = repos.aiSessions.createSession('paper', 'p-1')
    await expectDomainError(
      () =>
        svc.submitTask({
          sessionId: s.id,
          action: 'memory.list',
          payload: {},
          target: { scope: 'paper', anchorId: 'p-ghost' }
        }),
      'NOT_FOUND',
      '锚'
    )
    await expectDomainError(
      () =>
        svc.submitTask({
          sessionId: s.id,
          action: 'memory.list',
          payload: {},
          target: { scope: 'lineage', anchorId: 'c-ghost' }
        }),
      'NOT_FOUND'
    )
    db.close()
  })

  it('G10 缺省 target 继承：paper/lineage 会话 → 任务行 (scope,anchor)=会话对', async () => {
    const db = createTestDb()
    const repos = createRepos(db)
    const svc = createAiTasksService({ repos })
    seedPaper(db, 'p-1')
    seedCollection(db, 'c-1')
    const sp = repos.aiSessions.createSession('paper', 'p-1')
    const sl = repos.aiSessions.createSession('lineage', 'c-1')
    const tp = await svc.submitTask({ sessionId: sp.id, action: 'memory.list', payload: {} })
    const tl = await svc.submitTask({ sessionId: sl.id, action: 'memory.list', payload: {} })
    expect([tp.scope, tp.anchorId]).toEqual(['paper', 'p-1'])
    expect([tl.scope, tl.anchorId]).toEqual(['lineage', 'c-1'])
    expect(tp.status).toBe('queued')
    expect(tp.payload).toBe('{}')
    db.close()
  })

  it('G11 显式 target 跨锚合法：paper 会话+target 他锚 → 任务行落显式目标', async () => {
    const db = createTestDb()
    const repos = createRepos(db)
    const svc = createAiTasksService({ repos })
    seedPaper(db, 'p-1')
    seedPaper(db, 'p-2')
    const s = repos.aiSessions.createSession('paper', 'p-1')
    const t = await svc.submitTask({
      sessionId: s.id,
      action: 'memory.list',
      payload: {},
      target: { scope: 'paper', anchorId: 'p-2' }
    })
    expect([t.scope, t.anchorId]).toEqual(['paper', 'p-2'])
    db.close()
  })

  it('G12 提交审计：submitted 行 detail 含 target_resolved 描述符（目标+action）', async () => {
    const db = createTestDb()
    const repos = createRepos(db)
    const svc = createAiTasksService({ repos })
    seedPaper(db, 'p-1')
    const s = repos.aiSessions.createSession('paper', 'p-1')
    const t = await svc.submitTask({ sessionId: s.id, action: 'memory.search', payload: { query: '语料' } })
    const audit = repos.aiTasks.listAudit(t.id)
    expect(audit.map((a) => a.kind)).toEqual(['submitted'])
    expect(audit[0]!.detail).toContain('target_resolved=(scope=paper,anchor=p-1)')
    expect(audit[0]!.detail).toContain('action=memory.search')
    db.close()
  })

  it('G13 幂等：同 key 二提 → 返回既有行（同 id）+审计恰一行 submitted（不重执行）', async () => {
    const db = createTestDb()
    const repos = createRepos(db)
    const svc = createAiTasksService({ repos })
    seedPaper(db, 'p-1')
    const s = repos.aiSessions.createSession('paper', 'p-1')
    const first = await svc.submitTask({
      sessionId: s.id,
      action: 'memory.list',
      payload: {},
      idempotencyKey: 'idem-x'
    })
    const second = await svc.submitTask({
      sessionId: s.id,
      action: 'memory.list',
      payload: {},
      idempotencyKey: 'idem-x'
    })
    expect(second.id).toBe(first.id)
    expect(db.prepare('SELECT COUNT(*) c FROM ai_tasks').get()).toEqual({ c: 1 })
    expect(repos.aiTasks.listAudit(first.id)).toHaveLength(1)
    db.close()
  })

  it('G14 三方对齐（r1 W-k3-1 断言改造）：DDL CHECK 正则抽取==AI_TASK_ACTIONS==dispatch 键集==独立镜像（sort 后集合等值）', async () => {
    const db = createTestDb()
    // DDL 取证出处=运行库 sqlite_master.sql（迁移 020 应用后的真实 schema 文本——
    // 非迁移文件文本；正则抽 ai_tasks.action CHECK IN 列表）
    const ddl = (
      db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='ai_tasks'").get() as {
        sql: string
      }
    ).sql
    const checkMatch = ddl.match(/action\s+TEXT\s+NOT\s+NULL\s+CHECK\s*\(\s*action\s+IN\s*\(([^)]*)\)/)
    expect(checkMatch, 'DDL action CHECK 可抽取').not.toBeNull()
    const ddlActions = [...checkMatch![1]!.matchAll(/'([^']+)'/g)].map((m) => m[1]!)
    expect(ddlActions, 'DDL 恰 9 动作').toHaveLength(9)
    // 四方 sort 后集合等值（DDL=外部真相源；NINE_ACTIONS=独立镜像防正则自欺；
    // 镜像侧同 sort——双侧对称，防未来镜像追加未按序插入的假红）
    expect([...ddlActions].sort()).toEqual([...NINE_ACTIONS].sort())
    expect([...AI_TASK_ACTIONS].sort()).toEqual([...ddlActions].sort())
    expect([...TASK_HANDLER_ACTIONS].sort()).toEqual([...ddlActions].sort())
    db.close()
  })

  it('G15 分类对齐（r1 d1-N8 并案）：AI_MEMORY_CATEGORIES 三档并集==ai_memory DDL CHECK 分类全集（逐档正则抽取集合等值）', async () => {
    const db = createTestDb()
    // DDL 取证出处同 G14=运行库 sqlite_master.sql；逐档抽 scope='X' AND category IN (...) 列表
    const ddl = (
      db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='ai_memory'").get() as {
        sql: string
      }
    ).sql
    const branches = [...ddl.matchAll(/scope='(\w+)' AND category IN \(([^)]*)\)/g)]
    expect(branches, 'DDL 恰三分支（paper/lineage/global）').toHaveLength(3)
    const union: string[] = []
    for (const [, scope, listRaw] of branches) {
      const list = listRaw ?? ''
      const ddlCats = [...list.matchAll(/'([^']+)'/g)].map((m) => m[1]!)
      const constant =
        scope === 'paper'
          ? AI_MEMORY_CATEGORIES.paper
          : scope === 'lineage'
            ? AI_MEMORY_CATEGORIES.lineage
            : AI_MEMORY_CATEGORIES.global
      expect([...ddlCats].sort(), `档 ${scope} 逐档集合等值`).toEqual([...constant].sort())
      union.push(...ddlCats)
    }
    expect(union, '19 类全集（6+7+6）').toHaveLength(19)
    db.close()
  })

  // ── [F-DBCAMP-01 DB-2 U2b-2a] 运行期输入闸（§3.d③——d1-N9）──

  it('G16 idempotencyKey 空串/非串 → INVALID_REQUEST「幂等键不能为空」', async () => {
    const db = createTestDb()
    const repos = createRepos(db)
    const svc = createAiTasksService({ repos })
    seedPaper(db, 'p-1')
    const s = repos.aiSessions.createSession('paper', 'p-1')
    await expectDomainError(
      () =>
        svc.submitTask({
          sessionId: s.id,
          action: 'memory.list',
          payload: {},
          idempotencyKey: ''
        }),
      'INVALID_REQUEST',
      '幂等键不能为空'
    )
    await expectDomainError(
      () =>
        svc.submitTask({
          sessionId: s.id,
          action: 'memory.list',
          payload: {},
          idempotencyKey: 42 as unknown as string
        }),
      'INVALID_REQUEST',
      '幂等键不能为空'
    )
    expect(db.prepare('SELECT COUNT(*) c FROM ai_tasks').get()).toEqual({ c: 0 })
    db.close()
  })

  it('G17 target.anchorId=null/非串 → INVALID_REQUEST（防 DDL 原始异常泄漏——非 SqliteError 断言）', async () => {
    const db = createTestDb()
    const repos = createRepos(db)
    const svc = createAiTasksService({ repos })
    seedPaper(db, 'p-1')
    const s = repos.aiSessions.createSession('paper', 'p-1')
    let caught: unknown = null
    try {
      await svc.submitTask({
        sessionId: s.id,
        action: 'memory.list',
        payload: {},
        target: { scope: 'paper', anchorId: null as unknown as string }
      })
      expect.unreachable('应抛域错误')
    } catch (e) {
      caught = e
    }
    expect((caught as { code?: string }).code).toBe('INVALID_REQUEST')
    expect((caught as Error).message).toContain('锚')
    expect((caught as { constructor?: { name?: string } }).constructor?.name).not.toBe('SqliteError')
    await expectDomainError(
      () =>
        svc.submitTask({
          sessionId: s.id,
          action: 'memory.list',
          payload: {},
          target: { scope: 'paper', anchorId: 7 as unknown as string }
        }),
      'INVALID_REQUEST'
    )
    expect(db.prepare('SELECT COUNT(*) c FROM ai_tasks').get()).toEqual({ c: 0 })
    db.close()
  })

  it('G18 target.scope 运行时非法值（非枚举串）→ INVALID_REQUEST（if 链核对锚）', async () => {
    const db = createTestDb()
    const repos = createRepos(db)
    const svc = createAiTasksService({ repos })
    seedPaper(db, 'p-1')
    const s = repos.aiSessions.createSession('paper', 'p-1')
    await expectDomainError(
      () =>
        svc.submitTask({
          sessionId: s.id,
          action: 'memory.list',
          payload: {},
          target: { scope: 'folder' as never, anchorId: 'p-1' }
        }),
      'INVALID_REQUEST',
      '全局资源不可为任务目标'
    )
    expect(db.prepare('SELECT COUNT(*) c FROM ai_tasks').get()).toEqual({ c: 0 })
    db.close()
  })

  it('G19 target null/非对象 → INVALID_REQUEST（r1 d1-N8：原 null 透传 else 读 null.scope=TypeError）', async () => {
    const db = createTestDb()
    const repos = createRepos(db)
    const svc = createAiTasksService({ repos })
    seedPaper(db, 'p-1')
    const s = repos.aiSessions.createSession('paper', 'p-1')
    // 域错误载体断言（防 TypeError 假绿——d1-N8 缺陷本体即 TypeError）
    await expect(
      svc.submitTask({ sessionId: s.id, action: 'memory.list', payload: {}, target: null as never })
    ).rejects.toBeInstanceOf(AiDomainError)
    await expect(
      svc.submitTask({ sessionId: s.id, action: 'memory.list', payload: {}, target: 42 as never })
    ).rejects.toMatchObject({
      code: 'INVALID_REQUEST',
      message: expect.stringContaining('任务目标非法')
    })
    expect(db.prepare('SELECT COUNT(*) c FROM ai_tasks').get()).toEqual({ c: 0 })
    db.close()
  })
})
