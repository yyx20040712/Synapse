import { beforeEach, expect, it } from 'vitest'
import { createCollectionsRepo } from '../../../../src/main/db/repos/collections.repo'
import { createTestDb } from '../../../utils/fixtures'
import { guardedDescribe } from '../../../utils/guard'

guardedDescribe('SR-DB-05', 'collections.repo —— 集合 upsert/挂接', () => {
  let db: ReturnType<typeof createTestDb>
  let repo: ReturnType<typeof createCollectionsRepo>

  beforeEach(() => {
    db = createTestDb()
    db.prepare(
      `INSERT INTO papers (id, file_ref, sha256, added_at, updated_at) VALUES ('p-1','a.pdf','s1','t','t')`
    ).run()
    repo = createCollectionsRepo(db)
  })

  it('upsertByName 幂等：同名复用既有行（position 不覆盖）', () => {
    const a = repo.upsertByName('第二时代', 0)
    const b = repo.upsertByName('第二时代', 5)
    expect(b.id).toBe(a.id)
    expect(b.position).toBe(0)
  })

  it('list 按 position 升序（[F-FOLDER-01] 迁移 012 后新库恒含主图 position=0——首行恒主图）', () => {
    repo.upsertByName('第三时代', 2)
    repo.upsertByName('第二时代', 1)
    repo.upsertByName('第五时代', 3)
    expect(repo.list().map((c) => c.name)).toEqual(['主图', '第二时代', '第三时代', '第五时代'])
  })

  // [回炉码 9] findById 用例随方法删除（本票新增面零基线残留——无需豁免；
  // attach/namesByPaper 退役豁免在档 scripts/test-surface.exemptions.json）
})
