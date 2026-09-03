import { beforeEach, describe, expect, it } from 'vitest'
import { createPapersRepo, type PaperRow } from '../../../../src/main/db/repos/papers.repo'
import { libraryQuerySchema } from '../../../../src/shared/models/paper'
import type { SqliteDb } from '../../../../src/main/db/connection'
import { createTestDb } from '../../../utils/fixtures'

/** [P7E-06] 标签多选过滤（tagIds AND 交集）——repo 层态空间锚。
 *  always-active 裸 describe（SR2-ENR-01 同口径，K3：不经 guardedDescribe 守卫）。
 *  T1 交集=逐标签 EXISTS AND（任一缺失即出局）；T4 单元素=单选等价特例；
 *  无 tagIds=零过滤兼容锚；T8 schema 上界（>20 拒收）+空数组拒收
 *  （min(1)——UI 层收敛 undefined，schema 级防歧义防线，M3 变异锚）。
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

describe('P7E-06 标签多选过滤（tagIds AND 交集）', () => {
  let db: SqliteDb
  let repo: ReturnType<typeof createPapersRepo>

  beforeEach(() => {
    db = createTestDb()
    repo = createPapersRepo(db)
  })

  /** 种子：甲挂 A+B、乙挂 A（票面 T1 分化主体——单挂乙是交集判定的混入探针） */
  const seedPair = (): void => {
    repo.insert(row({ id: 'p-1', title: '甲文献', added_at: '2026-01-01T00:00:00Z' }))
    repo.insert(row({ id: 'p-2', sha256: 'sha-bbb', title: '乙文献', added_at: '2026-01-02T00:00:00Z' }))
    db.prepare(`INSERT INTO tags (id, name) VALUES ('t-a','水质')`).run()
    db.prepare(`INSERT INTO tags (id, name) VALUES ('t-b','机器学习')`).run()
    db.prepare(`INSERT INTO paper_tags (paper_id, tag_id) VALUES ('p-1','t-a')`).run()
    db.prepare(`INSERT INTO paper_tags (paper_id, tag_id) VALUES ('p-1','t-b')`).run()
    db.prepare(`INSERT INTO paper_tags (paper_id, tag_id) VALUES ('p-2','t-a')`).run()
  }

  it('T1 交集：tagIds=[A,B] 只命中同时双挂的甲（单挂乙不混入）', () => {
    seedPair()
    const r = repo.searchSummaries({ tagIds: ['t-a', 't-b'], sort: 'added_desc', offset: 0, limit: 50 })
    expect(r.items.map((i) => i.id)).toEqual(['p-1'])
    expect(r.total).toBe(1)
  })

  it('T4 单元素特例：tagIds=[A] 命中挂 A 全部（甲乙——与 v1 单选行为等价）', () => {
    seedPair()
    const r = repo.searchSummaries({ tagIds: ['t-a'], sort: 'added_desc', offset: 0, limit: 50 })
    expect(r.items.map((i) => i.id)).toEqual(['p-2', 'p-1'])
    expect(r.total).toBe(2)
  })

  it('兼容锚：无 tagIds = 零标签过滤（全量返回，既有查询面不受契约切换影响）', () => {
    seedPair()
    const r = repo.searchSummaries({ sort: 'added_desc', offset: 0, limit: 50 })
    expect(r.items.map((i) => i.id)).toEqual(['p-2', 'p-1'])
  })

  it('T8 schema 上界：tagIds 含 21 个元素拒收（max(20)——单查询爆炸上界）', () => {
    const ids = Array.from({ length: 21 }, (_, i) => `t-${i + 1}`)
    expect(() => libraryQuerySchema.parse({ tagIds: ids, sort: 'added_desc', offset: 0, limit: 50 })).toThrow()
    // 上界内（恰 20）放行——边界两侧各锚一爪
    expect(() =>
      libraryQuerySchema.parse({ tagIds: ids.slice(0, 20), sort: 'added_desc', offset: 0, limit: 50 })
    ).not.toThrow()
  })

  it('空数组拒收（min(1) 防歧义——空选集由 UI 层收敛 undefined，不得进查询通道）', () => {
    expect(() => libraryQuerySchema.parse({ tagIds: [], sort: 'added_desc', offset: 0, limit: 50 })).toThrow()
  })
})
