/**
 * [F-LG14] lineage graph 含金量 join+标签读链（新增锁定合约面）。
 *
 * 覆盖：迁移 007（tags 列在场/版本接续——[A1b F-CONTRACTA-01 2026-10-04]
 * 脉络私有标签域退役：列死置保留（清列归 D 批）、读面不映射 DTO 无 tags 键/
 * repo upsert tags 写面用例随写链去列删除）/graph 含金量
 * join（批量单语句禁 N+1——spy 计数锚；venueTier 映射单源 venue-tier.ts；
 * cited null 判别；0=值非缺；未映射 venue=null；空图合法空表）。draft tags
 * 校验面已随导入链退役删除（[F-BAKRET-01] 2026-09-30，
 * ADR-0022——schema 单源 lineageDraftSchema 同步删除）。
 * [A1a] +graph tagNames 伴生 map（文献库标签域读链——Record<paperId,
 * string[]> 批量一次装配；名序=namesByPaper 同序；无标签文献无键）。
 * [F-ALIGN-01] 主题节点两用例（不入 paperMetrics/不在 tagNames map）随
 * 主题节点应用层退役删除（2026-10-04——节点唯一来源=入库/移动
 * 两路；paperId null 过滤=DDL 窗口期防御，语义不再专测）。
 * always-active（ADR-0017 裁决 3——不经 guardedDescribe）。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SqliteDb } from '../../../src/main/db/connection'
import { MIGRATIONS, readUserVersion } from '../../../src/main/db/migrate'
import { createLineageRepo } from '../../../src/main/db/repos/lineage.repo'
import { createPapersRepo } from '../../../src/main/db/repos/papers.repo'
import { createTagsRepo } from '../../../src/main/db/repos/tags.repo'
import { createLineageService } from '../../../src/main/services/lineage/lineage.service'
import { createTestDb } from '../../utils/fixtures'

let db: SqliteDb
let repo: ReturnType<typeof createLineageRepo>
let papersRepo: ReturnType<typeof createPapersRepo>
let tagsRepo: ReturnType<typeof createTagsRepo>
let svc: ReturnType<typeof createLineageService>
/** 含金量批量查证 spy（禁 N+1 断言锚：graph() 单次单批） */
let metricsSpy: ReturnType<typeof vi.fn>
/** [A1a] 文献库标签批量查证 spy（禁 N+1 断言锚——tagNames 伴生 map 装配） */
let tagNamesSpy: ReturnType<typeof vi.fn>

function seedPaper(id: string, venue: string, cited: number | null): void {
  db.prepare(
    'INSERT INTO papers (id, file_ref, sha256, venue, cited_by_count, added_at, updated_at) VALUES (?,?,?,?,?,?,?)'
  ).run(id, `${id}.pdf`, `sha-${id}`, venue, cited, 't', 't')
}

beforeEach(() => {
  db = createTestDb()
  seedPaper('p-1', 'Nature Water', 42) // T1 映射+有被引
  seedPaper('p-2', '某未映射期刊', null) // 未映射+从未抓到（null 判别）
  seedPaper('p-3', 'Water', 0) // T3 映射+0=已抓到且为 0（值非缺）
  repo = createLineageRepo(db)
  papersRepo = createPapersRepo(db)
  tagsRepo = createTagsRepo(db)
  metricsSpy = vi.fn((ids: string[]) => papersRepo.listMetricsByIds(ids))
  tagNamesSpy = vi.fn((ids: string[]) => tagsRepo.tagNamesByIds(ids))
  // [F-ALIGN-01] deps 收窄=repo+伴生 map spy（新建分支注入面退役删）
  svc = createLineageService({
    repo,
    paperMetrics: metricsSpy as (ids: string[]) => Array<{
      paperId: string
      venue: string
      citedByCount: number | null
    }>,
    tagNames: tagNamesSpy as (ids: string[]) => Array<{ paperId: string; name: string }>
  })
})

// ── 迁移 007：tags 列死置锚（[A1b] 应用面退役、DDL 待 D 批清列） ──

describe('F-LG14 迁移 007（lineage_nodes.tags——[A1b] 死置列）', () => {
  it('版本接续：MIGRATIONS 含 version 7 且 user_version=15（新库全量，[F-UIRES-03 C1] 015 落地后）', () => {
    expect(MIGRATIONS.some((m) => m.version === 7)).toBe(true)
    expect(readUserVersion(db)).toBe(15)
  })

  it('tags 列在场（TEXT 可空——死置保留清列归 D 批）；存量行零迁移可读且 DTO 无 tags 键（[A1b] 读面不映射）', () => {
    const cols = (
      db.prepare('PRAGMA table_info(lineage_nodes)').all() as Array<{ name: string; notnull: number }>
    ).find((c) => c.name === 'tags')
    expect(cols).toBeDefined()
    expect(cols!.notnull).toBe(0) // 可空列保留（D 批清列前锚）
    // 模拟存量行（迁移前形状——不带 tags 列写入；列带历史 JSON 值也不入 DTO）
    db.prepare(
      `INSERT INTO lineage_nodes (id, paper_id, title, core_idea, year, x, y, tags, created_at, updated_at)
       VALUES ('legacy-1', NULL, '存量主题', '', 2019, NULL, NULL, '["历史标签"]', 't', 't')`
    ).run()
    const legacy = repo.listGraph().nodes.find((n) => n.id === 'legacy-1')
    expect(legacy?.title).toBe('存量主题') // 存量行零迁移可读
    expect(legacy !== undefined && 'tags' in legacy).toBe(false) // [A1b] DTO 无 tags 键（读面不映射）
  })
})

// [A1b F-CONTRACTA-01] 「F-LG14 写面落库（repo upsertNode 去重/null 清面）」
// describe 随 repo 写链去 tags 列整体删除（写面无该列——载荷结构性不可表达）。

// ── graph 含金量 join（批量单语句禁 N+1） ──────────────────────

describe('F-LG14 graph 含金量 join（{citedByCount, venueTier} 摘要）', () => {
  it('批量单语句：graph() 单次调用 paperMetrics 一次且传全量文献 id（禁 N+1 主控裁决）', () => {
    repo.upsertNode({ paperId: 'p-1', title: '甲', year: 2018, x: null, y: null })
    repo.upsertNode({ paperId: 'p-2', title: '乙', year: 2021, x: null, y: null })
    metricsSpy.mockClear()
    const g = svc.graph()
    expect(metricsSpy).toHaveBeenCalledTimes(1)
    expect(metricsSpy).toHaveBeenCalledWith(['p-1', 'p-2'])
    expect(Object.keys(g.paperMetrics).sort()).toEqual(['p-1', 'p-2'])
  })

  it('含金量三元组：T1 映射+被引 42/未映射 venue+null/0=值非缺（判别 === null）；[②U4] venue 透传+impact_factor null=缺席', () => {
    repo.upsertNode({ paperId: 'p-1', title: '甲', year: 2018, x: null, y: null })
    repo.upsertNode({ paperId: 'p-2', title: '乙', year: 2021, x: null, y: null })
    repo.upsertNode({ paperId: 'p-3', title: '丙', year: 2022, x: null, y: null })
    const g = svc.graph()
    expect(g.paperMetrics['p-1']).toEqual({ citedByCount: 42, venueTier: 'T1', venue: 'Nature Water', impactFactor: null })
    expect(g.paperMetrics['p-2']).toEqual({ citedByCount: null, venueTier: null, venue: '某未映射期刊', impactFactor: null })
    expect(g.paperMetrics['p-3']).toEqual({ citedByCount: 0, venueTier: 'T3', venue: 'Water', impactFactor: null })
  })

  it('[F-ALIGN-01 改写] 空图=空表合法态（原主题节点不入 paperMetrics 断言随主题节点应用层退役删）', () => {
    const g = svc.graph()
    expect(g.paperMetrics).toEqual({})
  })
})

// ── [A1a] graph tagNames（文献库标签伴生 map——卡标签行换源读链） ──

describe('A1a graph tagNames（文献库标签域伴生 map——Record<paperId, string[]>）', () => {
  it('文献节点带其文献库标签名（名序=namesByPaper 同序口径）+批量一次单批（禁 N+1）', () => {
    repo.upsertNode({ paperId: 'p-1', title: '甲', year: 2018, x: null, y: null })
    repo.upsertNode({ paperId: 'p-2', title: '乙', year: 2021, x: null, y: null })
    // 挂接序乱序（调度→方法→流域）：断言按名序回收（ORDER BY t.name ASC 单源）
    for (const name of ['调度', '方法', '流域']) {
      tagsRepo.attach('p-1', tagsRepo.upsertByName(name).id)
    }
    tagNamesSpy.mockClear()
    const g = svc.graph()
    expect(tagNamesSpy).toHaveBeenCalledTimes(1) // 单次单批（paperMetrics 同型禁 N+1）
    expect(tagNamesSpy).toHaveBeenCalledWith(['p-1', 'p-2'])
    expect(g.tagNames).toEqual({ 'p-1': ['方法', '流域', '调度'] }) // 名序断言
  })

  it('[F-ALIGN-01 改写] 无标签文献不在 map（无键非空数组）；孤儿标签面不入 map；空图=空 map（原主题节点断言随退役删）', () => {
    repo.upsertNode({ paperId: 'p-2', title: '乙（无库标签）', year: 2021, x: null, y: null })
    tagsRepo.attach('p-3', tagsRepo.upsertByName('孤儿标签面').id) // p-3 无节点行——不入 map
    const g = svc.graph()
    expect(g.tagNames).toEqual({})
    expect('p-2' in g.tagNames).toBe(false) // 无标签=无键（非空数组）
  })
})
