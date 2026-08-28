import { beforeEach, describe, expect, it } from 'vitest'
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
    db.prepare(
      `INSERT INTO papers (id, file_ref, sha256, added_at, updated_at) VALUES ('p-2','b.pdf','s2','t','t')`
    ).run()
    repo.upsert({ paperId: 'p-1', title: '漏损笔记', contentMd: '' })
    repo.upsert({ paperId: 'p-2', title: '另一篇', contentMd: '管网水力模型讨论' })
    expect(repo.search('漏损')).toHaveLength(1)
    expect(repo.search('水力模型')).toHaveLength(1)
    expect(repo.search('不存在词')).toHaveLength(0)
  })
})

/** 排序雷清扫回归锁：search 短串 LIKE 兜底路径（selectByLike）同 updated_at
 *  平局=rowid 插入序决胜（DESC 序后插在前——「最新优先」列语义）。夹具=
 *  db.prepare 直插两行（绕过 repo 的 id/时间戳生成）、同 updated_at、id 反
 *  字典序于插入序——对无决胜键的现状（引擎扫描序=rowid ASC）必红。
 *  FTS rank 序（≥3 字路径）不在本锁面。always-active 裸 describe（ADR-0017）。 */
describe('notes.repo search LIKE 兜底排序确定性（排序雷清扫）', () => {
  let db: SqliteDb
  let repo: ReturnType<typeof createNotesRepo>

  beforeEach(() => {
    db = createTestDb()
    repo = createNotesRepo(db)
  })

  it('selectByLike：同 updated_at 平局按插入序决胜（rowid DESC 后插在前）', () => {
    db.prepare(
      `INSERT INTO papers (id, file_ref, sha256, added_at, updated_at) VALUES ('p-1','a.pdf','s-1','t','t')`
    ).run()
    db.prepare(
      `INSERT INTO papers (id, file_ref, sha256, added_at, updated_at) VALUES ('p-2','b.pdf','s-2','t','t')`
    ).run()
    const seed = (id: string, paperId: string): void => {
      db.prepare(
        `INSERT INTO notes (id, paper_id, title, content_md, created_at, updated_at)
         VALUES (?, ?, '漏损笔记', '', '2026-08-27T00:00:00.000Z', '2026-08-27T00:00:00.000Z')`
      ).run(id, paperId)
    }
    seed('z-first', 'p-1') // 先插
    seed('a-second', 'p-2') // 后插；id 字典序与插入序刻意相反
    const list = repo.search('漏损') // 2 字 → LIKE 兜底（trigram 要求 ≥3 字）
    expect(list.map((n) => n.id)).toEqual(['a-second', 'z-first'])
  })
})
