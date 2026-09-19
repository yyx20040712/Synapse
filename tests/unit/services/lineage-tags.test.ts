/**
 * [F-LG14] lineage 节点标签存储+draft 协议扩展+graph 含金量 join（新增锁定合约面）。
 *
 * 覆盖：迁移 007（tags 列在场/版本接续/存量行 NULL=无标签零迁移兼容）/draft tags
 * 校验（合法通过/缺省省略=旧版草稿零破坏/非数组行级中文/元素非字符串/空串元素）/
 * 导入落库+同节点同名标签去重（主控裁决 7）/repo upsert tags 往返（null 清面）/
 * service upsert 写面去重/graph 含金量 join（批量单语句禁 N+1——spy 计数锚；
 * venueTier 映射单源 venue-tier.ts；cited null 判别；0=值非缺；未映射 venue=
 * null；主题节点不入表；空图合法空表）。
 * always-active（ADR-0017 裁决 3——不经 guardedDescribe）。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SqliteDb } from '../../../src/main/db/connection'
import { MIGRATIONS, readUserVersion } from '../../../src/main/db/migrate'
import { createLineageRepo } from '../../../src/main/db/repos/lineage.repo'
import { createPapersRepo } from '../../../src/main/db/repos/papers.repo'
import {
  createLineageService,
  validateDraft
} from '../../../src/main/services/lineage/lineage.service'
import { createTestDb } from '../../utils/fixtures'

const paperExists = (id: string): boolean => id === 'p-1' || id === 'p-2' || id === 'p-3'

let db: SqliteDb
let repo: ReturnType<typeof createLineageRepo>
let papersRepo: ReturnType<typeof createPapersRepo>
let svc: ReturnType<typeof createLineageService>
/** 含金量批量查证 spy（禁 N+1 断言锚：graph() 单次单批） */
let metricsSpy: ReturnType<typeof vi.fn>

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
  metricsSpy = vi.fn((ids: string[]) => papersRepo.listMetricsByIds(ids))
  svc = createLineageService({
    repo,
    paperExists,
    withTransaction: (fn) => db.transaction(fn)(),
    paperMetrics: metricsSpy as (ids: string[]) => Array<{
      paperId: string
      venue: string
      citedByCount: number | null
    }>
  })
})

// ── 迁移 007：tags 列+存量兼容 ─────────────────────────────────

describe('F-LG14 迁移 007（lineage_nodes.tags）', () => {
  it('版本接续：MIGRATIONS 含 version 7 且 user_version=9（新库全量，009 落地后）', () => {
    expect(MIGRATIONS.some((m) => m.version === 7)).toBe(true)
    expect(readUserVersion(db)).toBe(9)
  })

  it('tags 列在场（TEXT 可空）；存量行缺列写入=tags NULL=无标签（零迁移兼容）', () => {
    const cols = (
      db.prepare('PRAGMA table_info(lineage_nodes)').all() as Array<{ name: string; notnull: number }>
    ).find((c) => c.name === 'tags')
    expect(cols).toBeDefined()
    expect(cols!.notnull).toBe(0) // 可空=缺省 NULL=无标签
    // 模拟存量行（迁移前形状——不带 tags 列写入）
    db.prepare(
      `INSERT INTO lineage_nodes (id, paper_id, title, core_idea, year, x, y, created_at, updated_at)
       VALUES ('legacy-1', NULL, '存量主题', '', 2019, NULL, NULL, 't', 't')`
    ).run()
    const legacy = repo.listGraph().nodes.find((n) => n.id === 'legacy-1')
    expect(legacy?.tags).toBeNull() // NULL=无标签（renderer 不渲染标签组）
  })
})

// ── draft 协议扩展：tags 可选字段 ───────────────────────────────

describe('F-LG14 draft tags 校验（zod 行级中文）', () => {
  const base = { paper_id: 'p-1', title: '起源', year: 2018, core_idea: '源头' }

  it('合法 tags 通过；缺省省略（旧版草稿零破坏——v1 加可选字段=向后兼容）', () => {
    expect(validateDraft({ nodes: [{ ...base, tags: ['综述', '早期'] }], edges: [] }, paperExists)).toEqual([])
    expect(validateDraft({ nodes: [{ ...base }], edges: [] }, paperExists)).toEqual([])
  })

  it('非数组拒绝：nodes.0.tags 行级中文 reason 含「数组」', () => {
    const r = validateDraft({ nodes: [{ ...base, tags: '综述' }], edges: [] }, paperExists)
    const hit = r.find((e) => e.path === 'nodes.0.tags')
    expect(hit).toBeDefined()
    expect(hit!.reason).toContain('数组')
  })

  it('元素非字符串拒绝：nodes.0.tags.0 行级中文 reason 含「标签」', () => {
    const r = validateDraft({ nodes: [{ ...base, tags: [5] }], edges: [] }, paperExists)
    expect(r.some((e) => e.path === 'nodes.0.tags.0' && e.reason.includes('标签'))).toBe(true)
  })

  it('空串元素拒绝：行级 reason 含「空」', () => {
    const r = validateDraft({ nodes: [{ ...base, tags: [''] }], edges: [] }, paperExists)
    expect(r.some((e) => e.path === 'nodes.0.tags.0' && e.reason.includes('空'))).toBe(true)
  })
})

// ── 导入落库+去重 ──────────────────────────────────────────────

describe('F-LG14 导入落库（草稿带为主，导入即有）', () => {
  it('draft tags 落库：graph 节点 tags 数组往返；无 tags 节点=null', () => {
    const r = svc.importDraft({
      nodes: [
        { paper_id: 'p-1', title: '甲', year: 2018, core_idea: '', tags: ['综述', '早期'] },
        { paper_id: 'p-2', title: '乙', year: 2021, core_idea: '' }
      ],
      edges: [{ from_paper_id: 'p-1', to_paper_id: 'p-2', label: '继承' }]
    })
    expect(r).toEqual({ ok: true, nodeCount: 2, edgeCount: 1 })
    const g = svc.graph()
    expect(g.nodes.find((n) => n.paperId === 'p-1')?.tags).toEqual(['综述', '早期'])
    expect(g.nodes.find((n) => n.paperId === 'p-2')?.tags).toBeNull()
  })

  it('同节点同名标签去重（主控裁决 7）：草稿 [a,a,b] 落库 [a,b]', () => {
    svc.importDraft({
      nodes: [{ paper_id: 'p-1', title: '甲', year: 2018, core_idea: '', tags: ['a', 'a', 'b'] }],
      edges: []
    })
    expect(svc.graph().nodes[0]!.tags).toEqual(['a', 'b'])
  })

  it('service upsertNode 写面同守去重；tags null 二次 upsert 清面', () => {
    const n = svc.upsertNode({
      paperId: 'p-1',
      title: '甲',
      coreIdea: '',
      year: 2018,
      x: null,
      y: null,
      tags: ['综述', '综述', '早期']
    })
    expect(n.tags).toEqual(['综述', '早期'])
    const n2 = svc.upsertNode({
      id: n.id,
      paperId: 'p-1',
      title: '甲',
      coreIdea: '',
      year: 2018,
      x: null,
      y: null,
      tags: null
    })
    expect(n2.tags).toBeNull()
  })
})

// ── graph 含金量 join（批量单语句禁 N+1） ──────────────────────

describe('F-LG14 graph 含金量 join（{citedByCount, venueTier} 摘要）', () => {
  it('批量单语句：graph() 单次调用 paperMetrics 一次且传全量文献 id（禁 N+1 主控裁决）', () => {
    svc.importDraft({
      nodes: [
        { paper_id: 'p-1', title: '甲', year: 2018, core_idea: '' },
        { paper_id: 'p-2', title: '乙', year: 2021, core_idea: '' }
      ],
      edges: []
    })
    metricsSpy.mockClear()
    const g = svc.graph()
    expect(metricsSpy).toHaveBeenCalledTimes(1)
    expect(metricsSpy).toHaveBeenCalledWith(['p-1', 'p-2'])
    expect(Object.keys(g.paperMetrics).sort()).toEqual(['p-1', 'p-2'])
  })

  it('含金量三元组：T1 映射+被引 42/未映射 venue+null/0=值非缺（判别 === null）', () => {
    svc.importDraft({
      nodes: [
        { paper_id: 'p-1', title: '甲', year: 2018, core_idea: '' },
        { paper_id: 'p-2', title: '乙', year: 2021, core_idea: '' },
        { paper_id: 'p-3', title: '丙', year: 2022, core_idea: '' }
      ],
      edges: []
    })
    const g = svc.graph()
    expect(g.paperMetrics['p-1']).toEqual({ citedByCount: 42, venueTier: 'T1' })
    expect(g.paperMetrics['p-2']).toEqual({ citedByCount: null, venueTier: null })
    expect(g.paperMetrics['p-3']).toEqual({ citedByCount: 0, venueTier: 'T3' })
  })

  it('主题节点（paperId null）不入 paperMetrics；空图=空表合法态', () => {
    const theme = svc.upsertNode({ paperId: null, title: '阶段分组', coreIdea: '', year: null, x: null, y: null })
    const g = svc.graph()
    expect(g.paperMetrics).toEqual({})
    expect(g.nodes.find((n) => n.id === theme.id)?.tags).toBeNull()
  })
})
