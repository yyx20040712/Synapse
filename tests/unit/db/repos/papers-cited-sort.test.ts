import { beforeEach, describe, expect, it } from 'vitest'
import { createPapersRepo, type PaperRow } from '../../../../src/main/db/repos/papers.repo'
import { libraryQuerySchema } from '../../../../src/shared/models/paper'
import type { SqliteDb } from '../../../../src/main/db/connection'
import { createTestDb } from '../../../utils/fixtures'

/** [P7E-07] 智能排序（引用数 cited_desc）——repo+schema 层态空间锚（S1~S5）。
 *  always-active 裸 describe（P7E-06 同口径，K3：不经 guardedDescribe 守卫）。
 *  S1 NULL 垫底且与被引 0 同级（COALESCE 归零——同级相对序 rowid 决胜，M1 变异锚：
 *  种子布局下 NULL 后插于 cited=0，删 COALESCE 后 0-vs-NULL 相对序翻转即红）；
 *  S2 全 NULL 决胜稳定；S3 缺省兼容；S4 旧三值回归；S5 同键跨页不重不漏（M3 锚）。
 */
function row(over: Partial<PaperRow> = {}): PaperRow {
  return {
    id: over.id ?? 'p-1',
    file_ref: over.file_ref ?? 'ab/cd/aaa.pdf',
    sha256: over.sha256 ?? 'sha-aaa',
    title: over.title ?? '甲文献',
    authors_json: over.authors_json ?? '["张三"]',
    year: over.year ?? 2025,
    venue: over.venue ?? '水利学报',
    doi: over.doi ?? '10.1000/demo',
    arxiv_id: over.arxiv_id ?? null,
    abstract: over.abstract ?? '摘要',
    source: over.source ?? 'local',
    enrich_status: over.enrich_status ?? 'pending',
    added_at: over.added_at ?? '2026-01-01T00:00:00Z',
    updated_at: over.updated_at ?? '2026-01-01T00:00:00Z',
    last_read_page: over.last_read_page ?? 0
  }
}

describe('P7E-07 智能排序（引用数 cited_desc）', () => {
  let db: SqliteDb
  let repo: ReturnType<typeof createPapersRepo>

  beforeEach(() => {
    db = createTestDb()
    repo = createPapersRepo(db)
  })

  /** cited 落库：insert 面不含 ENR-01 三列（迁移 005 全可空默认 NULL），直 UPDATE 设置 */
  const setCited = (id: string, v: number): void => {
    db.prepare('UPDATE papers SET cited_by_count = ? WHERE id = ?').run(v, id)
  }

  /** 主种子：插入序 p-c5/p-c0/p-c12/p-cN（rowid 1~4），cited=5/0/12/NULL；
   *  added_at/year/title 三维分化（S4 旧三值回归复用同批种子） */
  const seedQuad = (): void => {
    repo.insert(row({ id: 'p-c5', title: 'B文献', year: 2022, added_at: '2026-01-01T00:00:00Z' }))
    repo.insert(row({ id: 'p-c0', sha256: 'sha-b01', title: 'A文献', year: 2024, added_at: '2026-01-02T00:00:00Z' }))
    repo.insert(row({ id: 'p-c12', sha256: 'sha-b02', title: 'C文献', year: 2023, added_at: '2026-01-03T00:00:00Z' }))
    repo.insert(row({ id: 'p-cN', sha256: 'sha-b03', title: 'D文献', year: 2021, added_at: '2026-01-04T00:00:00Z' }))
    setCited('p-c5', 5)
    setCited('p-c0', 0)
    setCited('p-c12', 12)
  }

  it('S1 NULL 垫底：cited=12/5/NULL/0 全序=[12,5,NULL,0]（NULL 与被引 0 同级=COALESCE 归零，同级 rowid 决胜后插在前）', () => {
    seedQuad()
    const r = repo.searchSummaries({ sort: 'cited_desc', offset: 0, limit: 50 })
    expect(r.items.map((i) => i.id)).toEqual(['p-c12', 'p-c5', 'p-cN', 'p-c0'])
    expect(r.total).toBe(4)
  })

  it('S2 全 NULL：三篇全未缓存 → 全同级 rowid 决胜稳定序（后插在前，不崩不随机）', () => {
    repo.insert(row({ id: 'p-x1', added_at: '2026-01-01T00:00:00Z' }))
    repo.insert(row({ id: 'p-x2', sha256: 'sha-x02', added_at: '2026-01-02T00:00:00Z' }))
    repo.insert(row({ id: 'p-x3', sha256: 'sha-x03', added_at: '2026-01-03T00:00:00Z' }))
    const r = repo.searchSummaries({ sort: 'cited_desc', offset: 0, limit: 50 })
    expect(r.items.map((i) => i.id)).toEqual(['p-x3', 'p-x2', 'p-x1'])
    expect(r.total).toBe(3)
  })

  it('S3 缺省兼容：不传 sort → schema 默认 added_desc，行为与显式 added_desc 全等', () => {
    seedQuad()
    const parsed = libraryQuerySchema.parse({})
    expect(parsed.sort).toBe('added_desc')
    const byDefault = repo.searchSummaries(parsed)
    const explicit = repo.searchSummaries({ sort: 'added_desc', offset: 0, limit: 50 })
    expect(byDefault.items.map((i) => i.id)).toEqual(['p-cN', 'p-c12', 'p-c0', 'p-c5'])
    expect(byDefault.items.map((i) => i.id)).toEqual(explicit.items.map((i) => i.id))
  })

  it('S4 旧三值回归：added_desc/year_desc/title_asc 行为与改前全等（同批种子三维分化）', () => {
    seedQuad()
    const added = repo.searchSummaries({ sort: 'added_desc', offset: 0, limit: 50 })
    expect(added.items.map((i) => i.id)).toEqual(['p-cN', 'p-c12', 'p-c0', 'p-c5'])
    const year = repo.searchSummaries({ sort: 'year_desc', offset: 0, limit: 50 })
    expect(year.items.map((i) => i.id)).toEqual(['p-c0', 'p-c12', 'p-c5', 'p-cN'])
    const title = repo.searchSummaries({ sort: 'title_asc', offset: 0, limit: 50 })
    expect(title.items.map((i) => i.id)).toEqual(['p-c0', 'p-c5', 'p-c12', 'p-cN'])
  })

  it('S5 分页跨界：同 cited 两篇跨页界 rowid 决胜不重不漏', () => {
    repo.insert(row({ id: 'p-hi', added_at: '2026-01-01T00:00:00Z' }))
    repo.insert(row({ id: 'p-a', sha256: 'sha-pa', added_at: '2026-01-02T00:00:00Z' }))
    repo.insert(row({ id: 'p-b', sha256: 'sha-pb', added_at: '2026-01-03T00:00:00Z' }))
    setCited('p-hi', 9)
    setCited('p-a', 7)
    setCited('p-b', 7)
    const page1 = repo.searchSummaries({ sort: 'cited_desc', offset: 0, limit: 2 })
    const page2 = repo.searchSummaries({ sort: 'cited_desc', offset: 2, limit: 2 })
    expect(page1.items.map((i) => i.id)).toEqual(['p-hi', 'p-b'])
    expect(page1.total).toBe(3)
    expect(page2.items.map((i) => i.id)).toEqual(['p-a'])
    const merged = [...page1.items, ...page2.items].map((i) => i.id)
    expect(merged).toEqual(['p-hi', 'p-b', 'p-a'])
    expect(new Set(merged).size).toBe(3)
  })
})
