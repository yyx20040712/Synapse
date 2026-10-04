/**
 * [T3-P3] detail lineage 装配（service 级组合+repo 只读对真库）。
 * 设计真相源=docs/design/2026-09-26_theme-trio-final-design.md §2/§3
 * （跨域关联行=脉络月框；month=P5 落位前恒 null）。
 *
 * service 级：paper_id 命中节点→lineage {year 透出, month 恒 null,
 * edgeCount}；未命中→整键省略。repo 级：nodeByPaperId 命中/未命中+
 * edgeCountByNode 双端计数（from/to 任一端命中均计一条——真库）。
 * always-active 裸 describe（K3：不经 guardedDescribe 守卫）。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createLibraryService } from '../../../src/main/services/library.service'
import { createLineageRepo } from '../../../src/main/db/repos/lineage.repo'
import { paperSummarySchema, paperDetailSchema } from '../../../src/shared/models/paper'
import type { LineageNode } from '../../../src/shared/models/lineage'
import type { PaperDetail } from '../../../src/shared/models/paper'
import type { Repos } from '../../../src/main/db/repos'
import type { SqliteDb } from '../../../src/main/db/connection'
import { createTestDb } from '../../utils/fixtures'

function makeDetail(): PaperDetail {
  return {
    id: 'p-1',
    title: '样例论文',
    authors: ['张三'],
    year: 2023,
    venue: 'Journal of Testing',
    doi: null,
    tagNames: [],
    folderId: null,
    impactFactor: null,
    annotationCount: 0,
    noteCount: 0,
    lastReadPage: 0,
    addedAt: 't',
    abstract: '',
    arxivId: null,
    source: 'local',
    enrichStatus: 'pending',
    fileUrl: 'app-file://p-1',
    fileName: 'a.pdf',
    updatedAt: 't',
    tags: []
  }
}

/** 桩 repos：detail 固定回体+lineage 桩（T3-P3 组合通道；T3-P5 增 listGraph
 *  编号 join 面——catalogNo 按全图 nodes 计算） */
function stubRepos(lineage: unknown): Repos {
  const detail = makeDetail()
  return {
    papers: {
      searchSummaries: () => ({ items: [], total: 0 }),
      detailById: () => detail,
      updateMeta: () => detail,
      listSummariesByIds: () => []
    },
    collections: { list: () => [] },
    lineage
  } as unknown as Repos
}

describe('T3-P3 library.service detail——lineage 组合装配（service 级）', () => {
  it('命中：paper_id 节点透出 lineage={year, month 真值, edgeCount=双端计数}（[F-FOLDER-01] catalogNo 移交 summary.pubNo）', async () => {
    const node: LineageNode = {
      id: 'n-1',
      paperId: 'p-1',
      title: '节点甲',
      coreIdea: '',
      year: 2023,
      x: null,
      y: null,
      month: null,
      slot: null,
      folderId: '__main__',
      createdAt: 't',
      updatedAt: 't'
    }
    const nodeByPaperId = vi.fn(() => node)
    const edgeCountByNode = vi.fn(() => 3)
    const listGraph = vi.fn(() => ({ nodes: [node], edges: [] }))
    const svc = createLibraryService({
      repos: stubRepos({ nodeByPaperId, edgeCountByNode, listGraph })
    })
    const d = await svc.detail({ paperId: 'p-1' })
    expect(d.lineage).toEqual({ year: 2023, month: null, edgeCount: 3 })
    expect(nodeByPaperId).toHaveBeenCalledWith('p-1')
    // 计数锚定在命中节点 id 上（非 paperId）
    expect(edgeCountByNode).toHaveBeenCalledWith('n-1')
  })

  it('未命中：无 paper_id 节点 → lineage 整键省略（"lineage" 不在对象上）', async () => {
    const svc = createLibraryService({
      repos: stubRepos({
        nodeByPaperId: () => null,
        edgeCountByNode: () => 0,
        listGraph: () => ({ nodes: [], edges: [] })
      })
    })
    const d = await svc.detail({ paperId: 'p-1' })
    expect('lineage' in d).toBe(false)
  })

  it('month/year 真值透传（T3-P5 摘「恒 null」注释——节点数据直达；[F-FOLDER-01] 编号非 detail 装配面）', async () => {
    const first: LineageNode = {
      id: 'n-0',
      paperId: 'p-9',
      title: '前驱',
      coreIdea: '',
      year: 2022,
      x: null,
      y: null,
      month: 1,
      slot: 1,
      folderId: '__main__',
      createdAt: 't',
      updatedAt: 't'
    }
    const node: LineageNode = {
      id: 'n-2',
      paperId: 'p-1',
      title: '节点乙',
      coreIdea: '',
      year: null,
      x: null,
      y: null,
      month: 6,
      slot: null,
      folderId: '__main__',
      createdAt: 't',
      updatedAt: 't'
    }
    const svc = createLibraryService({
      repos: stubRepos({
        nodeByPaperId: () => node,
        edgeCountByNode: () => 0,
        listGraph: () => ({ nodes: [first, node], edges: [] })
      })
    })
    const d = await svc.detail({ paperId: 'p-1' })
    expect(d.lineage?.month).toBe(6)
    expect(d.lineage?.year).toBeNull()
  })
})

describe('T3-P3 zod 契约面向后兼容（可选增量——旧夹具解析通过）', () => {
  it('旧 summary 夹具（无 citedByCount）strict 解析通过；带值/非整数值分流', () => {
    // 旧夹具=纯列表行形状（T3-P3 前字段面——detail 全量对象会被 strict 拒）
    const legacySummary = {
      id: 'p-1',
      title: '样例论文',
      authors: ['张三'],
      year: 2023,
      venue: 'Journal of Testing',
      doi: null,
      tagNames: [],
      folderId: null,
      impactFactor: null,
      annotationCount: 0,
      noteCount: 0,
      lastReadPage: 0,
      addedAt: 't'
    }
    expect(() => paperSummarySchema.parse(legacySummary)).not.toThrow()
    const withCount = paperSummarySchema.parse({ ...legacySummary, citedByCount: 17 })
    expect(withCount.citedByCount).toBe(17)
    expect(() => paperSummarySchema.parse({ ...legacySummary, citedByCount: 1.5 })).toThrow()
  })

  it('旧 detail 夹具（无 lineage）strict 解析通过；lineage 形状严格（缺子键/未知子键均拒——[F-FOLDER-01] catalogNo 退役后形={year,month,edgeCount}）', () => {
    const legacy = makeDetail()
    expect(() => paperDetailSchema.parse(legacy)).not.toThrow()
    const withLineage = paperDetailSchema.parse({
      ...legacy,
      lineage: { year: 2023, month: null, edgeCount: 3 }
    })
    expect(withLineage.lineage).toEqual({ year: 2023, month: null, edgeCount: 3 })
    // catalogNo 已退役：携旧键 strict 拒（未知子键面）
    expect(() =>
      paperDetailSchema.parse({ ...legacy, lineage: { year: 2023, month: null, edgeCount: 3, catalogNo: 7 } })
    ).toThrow()
    // 缺 month（必填键）拒
    expect(() =>
      paperDetailSchema.parse({ ...legacy, lineage: { year: 2023, edgeCount: 3 } })
    ).toThrow()
    // 未知子键拒（门一 d1-W7 回炉补——strict() 真断言，非仅缺键）
    expect(() =>
      paperDetailSchema.parse({
        ...legacy,
        lineage: { year: 2023, month: null, edgeCount: 3, extra: 1 }
      })
    ).toThrow()
  })
})

describe('T3-P3 lineage.repo 只读对——nodeByPaperId/edgeCountByNode（真库）', () => {
  let db: SqliteDb
  let repo: ReturnType<typeof createLineageRepo>

  beforeEach(() => {
    db = createTestDb()
    repo = createLineageRepo(db)
    // FK 前置：lineage_nodes.paper_id 外键指 papers——先种三行文献
    for (const id of ['p-a', 'p-b', 'p-c']) {
      db.prepare(
        'INSERT INTO papers (id, file_ref, sha256, title, added_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(id, `ab/${id}.pdf`, `sha-${id}`, `文献 ${id}`, 't', 't')
    }
    db.prepare(
      'INSERT INTO papers (id, file_ref, sha256, title, added_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run('p-1', 'ab/p1.pdf', 'sha-p1', '文献 p-1', 't', 't')
  })

  it('nodeByPaperId：命中回节点行；未命中回 null；paper_id 空值行不计', () => {
    const hit = repo.upsertNode({
      paperId: 'p-1',
      title: '节点甲',
      coreIdea: '',
      year: 2023,
      x: null,
      y: null
    })
    repo.upsertNode({ paperId: null, title: '纯主题节点', coreIdea: '', year: null, x: null, y: null })
    expect(repo.nodeByPaperId('p-1')?.id).toBe(hit.id)
    expect(repo.nodeByPaperId('ghost')).toBeNull()
  })

  it('edgeCountByNode：双端计数——from 命中与 to 命中各计一条，无关边不计', () => {
    const a = repo.upsertNode({ paperId: 'p-a', title: 'A', coreIdea: '', year: 2023, x: null, y: null })
    const b = repo.upsertNode({ paperId: 'p-b', title: 'B', coreIdea: '', year: 2023, x: null, y: null })
    const c = repo.upsertNode({ paperId: 'p-c', title: 'C', coreIdea: '', year: 2024, x: null, y: null })
    repo.upsertEdge({ fromNode: a.id, toNode: b.id, label: '' })
    repo.upsertEdge({ fromNode: c.id, toNode: a.id, label: '' })
    repo.upsertEdge({ fromNode: b.id, toNode: c.id, label: '' })
    expect(repo.edgeCountByNode(a.id)).toBe(2)
    expect(repo.edgeCountByNode(b.id)).toBe(2)
    expect(repo.edgeCountByNode(c.id)).toBe(2)
    expect(repo.edgeCountByNode('ghost')).toBe(0)
  })
})
