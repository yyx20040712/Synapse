import { beforeEach, describe, expect, it } from 'vitest'
import { createTagsRepo } from '../../../../src/main/db/repos/tags.repo'
import { createTestDb } from '../../../utils/fixtures'

/**
 * [F-TAGS-01] tags.repo color 面（always-active——三屋纪律不经 guardedDescribe）。
 *
 * 覆盖：011 迁移后 color 列贯通——upsertByName 新建行 color=null（存量默认
 * accent 语义）；SELECT 列面（findByName/listWithCounts）恒携带 color（wire
 * 真相=必携可空）；setColor 落库/恢复默认 null；未命中 id 返回 false。
 */
describe('F-TAGS-01 tags.repo —— color 列（011 迁移贯通）', () => {
  let db: ReturnType<typeof createTestDb>
  let repo: ReturnType<typeof createTagsRepo>

  beforeEach(() => {
    db = createTestDb()
    db.prepare(
      `INSERT INTO papers (id, file_ref, sha256, added_at, updated_at) VALUES ('p-1','a.pdf','s1','t','t')`
    ).run()
    repo = createTagsRepo(db)
  })

  it('upsertByName 新建行 color=null；findByName/listWithCounts 恒携带 color 字段', () => {
    const tag = repo.upsertByName('必读')
    expect(tag.color).toBeNull()
    expect(repo.findByName('必读')?.color).toBeNull()
    expect(repo.listWithCounts().map((t) => t.color)).toEqual([null])
  })

  it('setColor：落库生效（findByName 回读）+listWithCounts 携带', () => {
    const tag = repo.upsertByName('核心')
    expect(repo.setColor(tag.id, '#e11d48')).toBe(true)
    expect(repo.findByName('核心')?.color).toBe('#e11d48')
    expect(repo.listWithCounts().find((t) => t.id === tag.id)?.color).toBe('#e11d48')
  })

  it('setColor(null)=恢复默认：color 归 null', () => {
    const tag = repo.upsertByName('默认态')
    repo.setColor(tag.id, '#0ea5e9')
    expect(repo.setColor(tag.id, null)).toBe(true)
    expect(repo.findByName('默认态')?.color).toBeNull()
  })

  it('setColor 未命中 id：返回 false（changes=0——存在性语义归 service 预检）', () => {
    expect(repo.setColor('no-such-id', '#e11d48')).toBe(false)
  })
})
