/**
 * [F-DBCAMP-01 DB-4 / F-STAR-01 A3] lineage graph 载荷 isStarred 搭载
 * （tagNames 同路伴生面——papers.repo starredByIds 批查单语句注入）。
 *
 * 覆盖：文献节点按 papers.is_starred 携带 isStarred（true/false 两态）；
 * 主题节点（paperId null——DDL 窗口期防御）与 papers 行缺席节点不携带该键
 * （undefined——卡面星标域判 paperId 渲染）；starred 批查单次单批（禁 N+1
 * 主控裁决同锚）；starred 注入缺席（旧装配兼容）=零搭载零炸。
 * always-active（不经 guardedDescribe）。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SqliteDb } from '../../../src/main/db/connection'
import { createLineageRepo } from '../../../src/main/db/repos/lineage.repo'
import { createPapersRepo } from '../../../src/main/db/repos/papers.repo'
import { createLineageService } from '../../../src/main/services/lineage/lineage.service'
import { createTestDb } from '../../utils/fixtures'

let db: SqliteDb
let repo: ReturnType<typeof createLineageRepo>
let papersRepo: ReturnType<typeof createPapersRepo>
let starredSpy: ReturnType<typeof vi.fn>
let svc: ReturnType<typeof createLineageService>

function seedPaper(id: string, starred: boolean): void {
  db.prepare(
    'INSERT INTO papers (id, file_ref, sha256, title, added_at, updated_at) VALUES (?,?,?,?,?,?)'
  ).run(id, `${id}.pdf`, `sha-${id}`, `文献${id}`, 't', 't')
  if (starred) papersRepo.setStarred(id, true)
}

beforeEach(() => {
  db = createTestDb()
  repo = createLineageRepo(db)
  papersRepo = createPapersRepo(db)
  seedPaper('p-1', true)
  seedPaper('p-2', false)
  starredSpy = vi.fn((ids: string[]) => papersRepo.starredByIds(ids))
  svc = createLineageService({
    repo,
    starred: starredSpy as (ids: string[]) => Array<{ paperId: string; isStarred: boolean }>
  })
})

describe('F-DBCAMP-01 DB-4 A3 lineage graph isStarred 搭载', () => {
  it('文献节点携带 isStarred（true/false 两态——papers.is_starred 单源）', () => {
    repo.upsertNode({ paperId: 'p-1', title: '甲', year: 2018, x: null, y: null })
    repo.upsertNode({ paperId: 'p-2', title: '乙', year: 2021, x: null, y: null })
    const g = svc.graph()
    const n1 = g.nodes.find((n) => n.paperId === 'p-1')
    const n2 = g.nodes.find((n) => n.paperId === 'p-2')
    expect(n1?.isStarred).toBe(true)
    expect(n2?.isStarred).toBe(false)
  })

  it('主题节点（paperId null——DDL 窗口期防御）：不携带 isStarred 键（papers 行缺席节点经 FK 不可存在）', () => {
    repo.upsertNode({ paperId: 'p-1', title: '甲', year: 2018, x: null, y: null })
    db.prepare(
      `INSERT INTO lineage_nodes (id, paper_id, title, core_idea, year, x, y, created_at, updated_at)
       VALUES ('legacy-theme', NULL, '存量主题', '', 2019, NULL, NULL, 't', 't')`
    ).run()
    const g = svc.graph()
    const theme = g.nodes.find((n) => n.id === 'legacy-theme')
    expect(theme !== undefined && 'isStarred' in theme).toBe(false)
    expect(g.nodes.find((n) => n.paperId === 'p-1')?.isStarred).toBe(true)
  })

  it('批量单语句：graph() 单次调用 starred 一次且传全量文献 id（禁 N+1）', () => {
    repo.upsertNode({ paperId: 'p-1', title: '甲', year: 2018, x: null, y: null })
    repo.upsertNode({ paperId: 'p-2', title: '乙', year: 2021, x: null, y: null })
    starredSpy.mockClear()
    svc.graph()
    expect(starredSpy).toHaveBeenCalledTimes(1)
    expect(starredSpy).toHaveBeenCalledWith(['p-1', 'p-2'])
  })

  it('starred 注入缺席（旧装配兼容）：零搭载零炸（isStarred 键全图缺省）', () => {
    const bare = createLineageService({ repo })
    repo.upsertNode({ paperId: 'p-1', title: '甲', year: 2018, x: null, y: null })
    const g = bare.graph()
    expect(g.nodes.find((n) => n.paperId === 'p-1') !== undefined).toBe(true)
    expect(g.nodes.every((n) => !('isStarred' in n))).toBe(true)
  })
})

describe('F-DBCAMP-01 DB-4 A3 papers.repo starredByIds（批查读法）', () => {
  it('窄查询：命中行带布尔映射，缺席 id 无行；空 ids=空数组', () => {
    expect(papersRepo.starredByIds([])).toEqual([])
    const rows = papersRepo.starredByIds(['p-1', 'p-2', 'p-none'])
    expect(rows).toEqual([
      { paperId: 'p-1', isStarred: true },
      { paperId: 'p-2', isStarred: false }
    ])
  })
})
