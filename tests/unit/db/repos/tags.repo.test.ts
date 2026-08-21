import { beforeEach, expect, it } from 'vitest'
import { createTagsRepo } from '../../../../src/main/db/repos/tags.repo'
import { createTestDb } from '../../../utils/fixtures'
import { guardedDescribe } from '../../../utils/guard'

guardedDescribe('SR-DB-04', 'tags.repo —— 标签 upsert/挂接/计数', () => {
  let db: ReturnType<typeof createTestDb>
  let repo: ReturnType<typeof createTagsRepo>

  beforeEach(() => {
    db = createTestDb()
    db.prepare(
      `INSERT INTO papers (id, file_ref, sha256, added_at, updated_at) VALUES ('p-1','a.pdf','s1','t','t')`
    ).run()
    repo = createTagsRepo(db)
  })

  it('upsertByName 幂等：同名两次返回同 id', () => {
    const a = repo.upsertByName('必读')
    const b = repo.upsertByName('必读')
    expect(a.id).toBe(b.id)
  })

  it('attach 幂等（重复挂接不报错）；detach 后计数归零', () => {
    const tag = repo.upsertByName('重点')
    repo.attach('p-1', tag.id)
    expect(() => repo.attach('p-1', tag.id)).not.toThrow()
    expect(repo.listWithCounts().find((t) => t.id === tag.id)?.paperCount).toBe(1)
    repo.detach('p-1', tag.id)
    expect(repo.listWithCounts().find((t) => t.id === tag.id)?.paperCount).toBe(0)
  })

  it('listWithCounts：paperCount 降序、同数字典序', () => {
    const t1 = repo.upsertByName('b-tag')
    const _t2 = repo.upsertByName('a-tag')
    repo.attach('p-1', t1.id)
    const list = repo.listWithCounts()
    expect(list.map((t) => t.name)).toEqual(['b-tag', 'a-tag']) // 1 在前 0 在后
  })

  it('namesByPaper：字典序', () => {
    const t1 = repo.upsertByName('zeta')
    const t2 = repo.upsertByName('alpha')
    repo.attach('p-1', t1.id)
    repo.attach('p-1', t2.id)
    expect(repo.namesByPaper('p-1')).toEqual(['alpha', 'zeta'])
  })
})
