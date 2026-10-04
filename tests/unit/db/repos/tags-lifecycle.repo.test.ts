import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTagsRepo } from '../../../../src/main/db/repos/tags.repo'
import { createTestDb } from '../../../utils/fixtures'
import type { SqliteDb } from '../../../../src/main/db/connection'

/**
 * [P7E-01] tags.repo 生命周期四方法（always-active——三屋纪律不经 guardedDescribe）。
 *
 * 覆盖：findByName 命中/未命中；renameTag 命中/未命中；mergeTags 三步事务
 * （源挂接全迁+源行删+双挂幂等吸收）；deleteTag 两步；merge 事务原子性
 * （第二步抛错→第三步不执行且异常上抛，mock db 语句桩——better-sqlite3
 * 真实回滚语义由原库保证，桩只验"后续语句不落地"的编排面）。
 *
 * [门一 W1 回炉·如实口径] merge/delete 两处 raw COUNT 断言（paper_tags 不
 * 残留死 id）是 **schema 前瞻守卫**：001_init.sql 的 tag_id 外键为 ON DELETE
 * CASCADE，标签行删除即级联清挂接，当前 schema 下两断言恒真、变异杀伤率为
 * 零——M1（删第二步 DELETE）的**实际红锚=本文件末尾的事务编排 mock 用例**
 * （第二步语句被桩武装为抛错、变异后不再调用→toThrow 失败）。前瞻守卫保留：
 * 若未来 CASCADE 改 RESTRICT/去级联，raw COUNT 即转正为首道防线。
 */
describe('P7E-01 tags.repo —— 生命周期（rename/merge/delete）', () => {
  let db: ReturnType<typeof createTestDb>
  let repo: ReturnType<typeof createTagsRepo>

  beforeEach(() => {
    db = createTestDb()
    const seedPaper = db.prepare(
      `INSERT INTO papers (id, file_ref, sha256, added_at, updated_at) VALUES (?, 'a.pdf', ?, 't', 't')`
    )
    seedPaper.run('p-1', 'sha-1')
    seedPaper.run('p-2', 'sha-2')
    repo = createTagsRepo(db)
  })

  it('findByName：命中返回 {id,name,color}；未命中 undefined', () => {
    const tag = repo.upsertByName('必读')
    expect(repo.findByName('必读')).toEqual({ id: tag.id, name: '必读', color: null })
    expect(repo.findByName('不存在')).toBeUndefined()
  })

  it('renameTag：命中返回 true 且改名生效；未命中返回 false', () => {
    const tag = repo.upsertByName('旧名')
    expect(repo.renameTag(tag.id, '新名')).toBe(true)
    expect(repo.findByName('新名')?.id).toBe(tag.id)
    expect(repo.renameTag('no-such-id', '任意名')).toBe(false)
  })

  it('mergeTags：源挂接全迁目标+源标签行删除；双挂同文献 OR IGNORE 幂等吸收', () => {
    const src = repo.upsertByName('源')
    const tgt = repo.upsertByName('目标')
    repo.attach('p-1', src.id)
    repo.attach('p-1', tgt.id) // 双挂：p-1 同挂源与目标——迁移时复合主键冲突被吞
    repo.attach('p-2', src.id)
    repo.mergeTags(src.id, tgt.id)
    // 源标签行已删；目标吸收两篇文献
    const list = repo.listWithCounts()
    expect(list.find((t) => t.id === src.id)).toBeUndefined()
    expect(list.find((t) => t.id === tgt.id)?.paperCount).toBe(2)
    // schema 前瞻守卫（W1 如实口径）：paper_tags 不残留死源 id——当前 CASCADE
    // 下恒真、变异杀伤率为零（标签行删除即级联清挂接）；M1 实际红锚=本文件
    // 末尾的事务编排 mock 用例。若 CASCADE 改弱此处转正为首道防线
    const orphan = db
      .prepare<[string], { n: number }>('SELECT COUNT(*) AS n FROM paper_tags WHERE tag_id = ?')
      .get(src.id)?.n
    expect(orphan).toBe(0)
    expect(repo.namesByPaper('p-1')).toEqual(['目标'])
    expect(repo.namesByPaper('p-2')).toEqual(['目标'])
  })

  it('deleteTag：挂接与标签行两步全删', () => {
    const tag = repo.upsertByName('待删')
    repo.attach('p-1', tag.id)
    repo.deleteTag(tag.id)
    // schema 前瞻守卫（W1 如实口径）：同上——CASCADE 下恒真，编排锚在 merge
    // mock 用例；JOIN 视图（listWithCounts/namesByPaper）看不见孤儿行，故用 raw COUNT
    const remain = db
      .prepare<[string], { n: number }>('SELECT COUNT(*) AS n FROM paper_tags WHERE tag_id = ?')
      .get(tag.id)?.n
    expect(remain).toBe(0)
    expect(repo.findByName('待删')).toBeUndefined()
  })

  it('mergeTags 事务原子性：第二步抛错→第三步不执行且异常上抛（mock db 语句桩）', () => {
    const stmts = new Map<string, { run: ReturnType<typeof vi.fn> }>()
    const mockDb = {
      prepare: (sql: string) => {
        if (!stmts.has(sql)) stmts.set(sql, { run: vi.fn() })
        return stmts.get(sql)!
      },
      // better-sqlite3 事务直通桩：异常自然穿透（真实 BEGIN/ROLLBACK 由原库承担）
      transaction: (fn: (...args: unknown[]) => void) => (...args: unknown[]) => fn(...args)
    } as unknown as SqliteDb
    const mockedRepo = createTagsRepo(mockDb)

    const findStmt = (needle: string): { run: ReturnType<typeof vi.fn> } => {
      const hit = [...stmts.entries()].find(([sql]) => sql.includes(needle))
      if (hit === undefined) throw new Error(`语句桩缺：${needle}`)
      return hit[1]
    }
    // 第二步（清源挂接）抛错（needle 收紧到唯一文本——detachTag 语句同含
    // 'DELETE FROM paper_tags' 前缀但 WHERE 子句不同，Map 插入序会先命中它）
    findStmt('DELETE FROM paper_tags WHERE tag_id = ?').run.mockImplementation(() => {
      throw new Error('第二步炸了')
    })
    expect(() => mockedRepo.mergeTags('src-id', 'tgt-id')).toThrow('第二步炸了')
    // 第一步已执行且参数序=(target, source)（SELECT paper_id, ? … WHERE tag_id = ?）
    expect(findStmt('SELECT paper_id, ? FROM paper_tags').run).toHaveBeenCalledWith('tgt-id', 'src-id')
    // 第三步（删源标签行）不得执行——失败事务的后续语句不落地
    expect(findStmt('DELETE FROM tags').run).not.toHaveBeenCalled()
  })
})

/**
 * [A1a] tagNamesByIds 批量名查（always-active——三屋纪律不经 guardedDescribe）。
 *
 * 覆盖：空 ids 早退零语句；多文献名序判别（ORDER BY paper_id, t.name ASC
 * ——挂签顺序刻意乱序+入参乱序，漏 ORDER BY 必红）；同长度二次调用命中
 * 语句缓存（prepare 仅一次——papers.repo 语句缓存同型口径）。
 */
describe('[A1a] tags.repo.tagNamesByIds —— 批量名查（动态 IN 单语句/名序/缓存）', () => {
  let db: ReturnType<typeof createTestDb>
  let repo: ReturnType<typeof createTagsRepo>

  beforeEach(() => {
    db = createTestDb()
    const seedPaper = db.prepare(
      `INSERT INTO papers (id, file_ref, sha256, added_at, updated_at) VALUES (?, 'a.pdf', ?, 't', 't')`
    )
    seedPaper.run('p-1', 'sha-a1a')
    seedPaper.run('p-2', 'sha-a1b')
    repo = createTagsRepo(db)
  })

  it('空 ids=返回 [] 且零语句执行（早退不发 SQL）', () => {
    const prepareSpy = vi.spyOn(db, 'prepare')
    expect(repo.tagNamesByIds([])).toEqual([])
    expect(prepareSpy).not.toHaveBeenCalled()
    prepareSpy.mockRestore()
  })

  it('多文献名序判别：行序=[{p-1,alpha},{p-1,zeta},{p-2,beta}]（挂签乱序+入参乱序下仍按 paper_id, t.name ASC）', () => {
    // 标签行直插受控 id（t-a=zeta / t-z=alpha / t-b=beta，插入序=zeta 先）——
    // 无论 planner 选 paper_tags PK 序（同 paper 内按 tag_id ASC→t-a[zeta] 先）
    // 还是 tags rowid/插入序（zeta 先）还是挂接行序（zeta 先挂），自然序均
    // ≠名序——SQL 漏 ORDER BY 必红（三类扫描计划下均确定性红，非撞运）
    const insTag = db.prepare('INSERT INTO tags (id, name) VALUES (?, ?)')
    insTag.run('t-a', 'zeta')
    insTag.run('t-z', 'alpha')
    insTag.run('t-b', 'beta')
    repo.attach('p-1', 't-a') // 挂签乱序：zeta 先挂
    repo.attach('p-1', 't-z') // alpha 后挂
    repo.attach('p-2', 't-b')
    expect(repo.tagNamesByIds(['p-2', 'p-1'])).toEqual([
      // 入参乱序（p-2 在前）+断言按 paper_id ASC, t.name ASC 回收
      { paperId: 'p-1', name: 'alpha' },
      { paperId: 'p-1', name: 'zeta' },
      { paperId: 'p-2', name: 'beta' }
    ])
  })

  it('同长度二次调用命中语句缓存（IN 语句 prepare 仅一次）', () => {
    const alpha = repo.upsertByName('alpha')
    repo.attach('p-1', alpha.id)
    const prepareSpy = vi.spyOn(db, 'prepare')
    repo.tagNamesByIds(['p-1', 'p-2'])
    repo.tagNamesByIds(['p-1', 'p-2']) // 同长度→复用预编译语句（缓存键=占位符个数）
    const inPrepares = prepareSpy.mock.calls.filter(([sql]) => sql.includes(' IN (')).length
    expect(inPrepares).toBe(1)
    prepareSpy.mockRestore()
  })
})
