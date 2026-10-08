/**
 * [F-DBCAMP-01 DB-1 U2 / F-STAR-01] papers/set-starred 数据面锁定测试
 * （service+repo+shared schema 契约——folders-move-paper/papers-delete 批 B
 * 先例形态；UI 点亮=DB-4 视检轮前批——PaperRow P-9 占位不动）。
 *
 * 真相源=2026-10-08 U2 简报主控裁决③（IPC 单通道 papers/set-starred；service
 * 归 library.service；repo setStarred 返回形态沿 setFolderId Row|null；未命中
 * 走 paperNotFound NOT_FOUND；paperSetStarredReqSchema strict；事件面不广播
 * ——星标非图/夹结构面，列表行本地状态即可）。
 * always-active（不经 guardedDescribe）。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createRepos } from '../../../src/main/db/repos'
import { createPapersService } from '../../../src/main/services/library.service'
import { paperSetStarredReqSchema } from '../../../src/shared/models/paper'
import { createTestDb } from '../../utils/fixtures'
import type { SqliteDb } from '../../../src/main/db/connection'

describe('F-STAR-01 papers/set-starred 数据面（service+repo）', () => {
  let db: SqliteDb
  let repos: ReturnType<typeof createRepos>
  let papers: ReturnType<typeof createPapersService>
  let foldersChanged: ReturnType<typeof vi.fn>
  let lineageChanged: ReturnType<typeof vi.fn>
  let pending: boolean

  function seedPaper(id: string): void {
    db.prepare(
      'INSERT INTO papers (id, file_ref, sha256, title, added_at, updated_at) VALUES (?,?,?,?,?,?)'
    ).run(id, `f/${id}.pdf`, `sha-${id}`, `文献${id}`, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')
  }

  beforeEach(() => {
    db = createTestDb()
    repos = createRepos(db)
    pending = false
    foldersChanged = vi.fn()
    lineageChanged = vi.fn()
    papers = createPapersService({
      repos,
      lineagePending: () => pending,
      sendFoldersChanged: foldersChanged,
      sendLineageChanged: lineageChanged
    })
  })

  it('repo setStarred：true→1/false→0 往返+返回受影响行；未命中返回 null（setFolderId 形态——UPDATE 受影响行→Row|null）', () => {
    seedPaper('p-1')
    const row = repos.papers.setStarred('p-1', true)
    expect(row?.id).toBe('p-1')
    expect(db.prepare("SELECT is_starred FROM papers WHERE id='p-1'").get()).toEqual({ is_starred: 1 })
    const back = repos.papers.setStarred('p-1', false)
    expect(back?.id).toBe('p-1')
    expect(db.prepare("SELECT is_starred FROM papers WHERE id='p-1'").get()).toEqual({ is_starred: 0 })
    expect(repos.papers.setStarred('ghost', true)).toBeNull()
    db.close()
  })

  it('查询面布尔映射：is_starred 0/1→isStarred false/true（searchSummaries+detailById——SUMMARY/DETAIL_SQL 增列+toSummary 映射）', () => {
    seedPaper('p-plain')
    seedPaper('p-star')
    repos.papers.setStarred('p-star', true)
    const list = repos.papers.searchSummaries({ sort: 'added_desc', offset: 0, limit: 50 })
    const byId = new Map(list.items.map((i) => [i.id, i]))
    expect(byId.get('p-plain')?.isStarred).toBe(false)
    expect(byId.get('p-star')?.isStarred).toBe(true)
    expect(repos.papers.detailById('p-star')?.isStarred).toBe(true)
    expect(repos.papers.detailById('p-plain')?.isStarred).toBe(false)
    db.close()
  })

  it('service setStarred：成功 {ok:true}+落库+零广播（裁决⑧——星标非图/夹结构面）+pending 期不拒（星标写零结构耦合=INV-91 互斥面外）', async () => {
    seedPaper('p-1')
    pending = true // 对照 moveFolder/delete 的 S1 拒面：星标切换不属队列互斥域
    await expect(papers.setStarred({ paperId: 'p-1', starred: true })).resolves.toEqual({ ok: true })
    expect(db.prepare("SELECT is_starred FROM papers WHERE id='p-1'").get()).toEqual({ is_starred: 1 })
    expect(foldersChanged).not.toHaveBeenCalled()
    expect(lineageChanged).not.toHaveBeenCalled()
    db.close()
  })

  it('service setStarred 未命中：DomainError NOT_FOUND（paperNotFound 单源语义沿 papers/delete 先例）+拒时零库副作用', async () => {
    seedPaper('p-1')
    await expect(papers.setStarred({ paperId: 'ghost', starred: true })).rejects.toMatchObject({
      code: 'NOT_FOUND'
    })
    expect(db.prepare("SELECT is_starred FROM papers WHERE id='p-1'").get()).toEqual({ is_starred: 0 })
    db.close()
  })
})

describe('F-STAR-01 paperSetStarredReqSchema strict 契约（models/paper 单源）', () => {
  it('双 boolean 值过；缺 starred/非 boolean（字符串/数值）/未知字段/空 paperId 全拒', () => {
    expect(paperSetStarredReqSchema.safeParse({ paperId: 'p1', starred: true }).success).toBe(true)
    expect(paperSetStarredReqSchema.safeParse({ paperId: 'p1', starred: false }).success).toBe(true)
    expect(paperSetStarredReqSchema.safeParse({ paperId: 'p1' }).success).toBe(false)
    expect(paperSetStarredReqSchema.safeParse({ paperId: 'p1', starred: 'yes' }).success).toBe(false)
    expect(paperSetStarredReqSchema.safeParse({ paperId: 'p1', starred: 1 }).success).toBe(false)
    expect(paperSetStarredReqSchema.safeParse({ paperId: 'p1', starred: true, extra: 1 }).success).toBe(
      false
    )
    expect(paperSetStarredReqSchema.safeParse({ paperId: '', starred: true }).success).toBe(false)
  })
})
