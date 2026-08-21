import { beforeEach, expect, it } from 'vitest'
import { createNotesRepo } from '../../../../src/main/db/repos/notes.repo'
import type { SqliteDb } from '../../../../src/main/db/connection'
import { createTestDb } from '../../../utils/fixtures'
import { guardedDescribe } from '../../../utils/guard'

guardedDescribe('SR-DB-03', 'notes.repo —— 笔记 upsert 与 FTS', () => {
  let db: SqliteDb
  let repo: ReturnType<typeof createNotesRepo>

  beforeEach(() => {
    db = createTestDb()
    db.prepare(
      `INSERT INTO papers (id, file_ref, sha256, added_at, updated_at) VALUES ('p-1','a.pdf','s1','t','t')`
    ).run()
    repo = createNotesRepo(db)
  })

  it('首次 upsert 创建；同 paper 再次 upsert 更新同一条（不产生第二篇）', () => {
    const first = repo.upsert({ paperId: 'p-1', title: '标题', contentMd: '内容一' })
    const second = repo.upsert({ paperId: 'p-1', title: '新标题', contentMd: '内容二' })
    expect(second.id).toBe(first.id)
    expect(repo.findByPaper('p-1')?.title).toBe('新标题')
    expect(repo.countByPaper('p-1')).toBe(1)
  })

  it('findByPaper 无笔记返回 null；delete 生效', () => {
    expect(repo.findByPaper('p-1')).toBeNull()
    const n = repo.upsert({ paperId: 'p-1', title: '', contentMd: '' })
    expect(repo.delete(n.id)).toBe(true)
    expect(repo.findByPaper('p-1')).toBeNull()
  })

  it('search：FTS 命中标题或正文', () => {
    repo.upsert({ paperId: 'p-1', title: '漏损笔记', contentMd: '' })
    repo.upsert({ paperId: 'p-1', title: '另一篇', contentMd: '管网水力模型讨论' })
    expect(repo.search('漏损')).toHaveLength(1)
    expect(repo.search('水力模型')).toHaveLength(1)
    expect(repo.search('不存在词')).toHaveLength(0)
  })
})
