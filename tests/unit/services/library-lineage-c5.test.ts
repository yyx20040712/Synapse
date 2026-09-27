/**
 * [T3-P5] C5 双升级 service join（list 挂键+detail 真值/编号）锁定测试。
 *
 * 覆盖：list() 单次 listGraph（禁 N+1）→lineageCatalogNos→当页入脉络行挂
 * lineage{year,month,catalogNo}/未入脉络整键省略/当页外节点不误挂；detail()
 * month 真值透传（摘「month 恒 null」注释）+catalogNo 编号；catalog_no 计算
 * 与 lineageCatalogNos 同源（呈现时确定性 1..N——INV-76）。
 * 真相源=docs/design/2026-09-27_t3p5-lineage-data-layer-design-final.md §6/§7。
 * always-active（不经 guardedDescribe）。
 */
import { describe, expect, it, vi } from 'vitest'
import { createLibraryService } from '../../../src/main/services/library.service'
import { lineageCatalogNos, type LineageNode } from '../../../src/shared/models/lineage'
import type { PaperSummary } from '../../../src/shared/models/paper'
import type { Repos } from '../../../src/main/db/repos'

/** 脉络节点（v2 字段面） */
function lnode(patch: Partial<LineageNode> & { id: string }): LineageNode {
  return {
    paperId: null,
    title: `节点${patch.id}`,
    coreIdea: '',
    year: null,
    x: null,
    y: null,
    tags: null,
    month: null,
    slot: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: 't',
    ...patch
  }
}

/** 脉络图（乱序插入——catalogNo 按 lineageOrder 全序）：2019 在前→2021→未定年 */
function graphNodes(): LineageNode[] {
  return [
    lnode({ id: 'n-2021', paperId: 'p-2021', year: 2021, month: 3, slot: 1 }),
    lnode({ id: 'n-2019', paperId: 'p-2019', year: 2019, month: null, slot: 1 }),
    lnode({ id: 'n-undated', paperId: 'p-x', year: null, month: 5, slot: 1 })
  ]
}

function summary(id: string): PaperSummary {
  return {
    id,
    title: `论文${id}`,
    authors: [],
    year: 2024,
    venue: '',
    doi: null,
    tagNames: [],
    collectionNames: [],
    annotationCount: 0,
    noteCount: 0,
    lastReadPage: 0,
    addedAt: 't'
  }
}

/** 桩 repos：list 回定页+lineage 桩（listGraph spy=禁 N+1 断言锚） */
function stubRepos(nodes: LineageNode[]): { repos: Repos; listGraph: ReturnType<typeof vi.fn> } {
  const listGraph = vi.fn(() => ({ nodes, edges: [] }))
  const page = {
    items: [summary('p-2019'), summary('p-2021'), summary('p-none')],
    total: 3
  }
  const repos = {
    papers: {
      searchSummaries: () => page,
      detailById: () => null,
      updateMeta: () => null,
      listSummariesByIds: () => []
    },
    collections: { list: () => [] },
    lineage: { listGraph, nodeByPaperId: () => null, edgeCountByNode: () => 0 }
  } as unknown as Repos
  return { repos, listGraph }
}

describe('T3-P5 list() join（禁 N+1：单次 listGraph→lineageOrder→catalogNo map→当页行挂键）', () => {
  it('入脉络行挂 lineage{year,month,catalogNo}=lineageCatalogNos 同源；未入脉络整键省略', async () => {
    const { repos, listGraph } = stubRepos(graphNodes())
    const svc = createLibraryService({ repos })
    const res = await svc.list({ sort: 'added_desc', offset: 0, limit: 50 })
    expect(listGraph).toHaveBeenCalledTimes(1) // 禁 N+1——全图一次
    const nos = lineageCatalogNos(graphNodes())
    const byId = new Map(res.items.map((p) => [p.id, p]))
    expect(byId.get('p-2019')!.lineage).toEqual({
      year: 2019,
      month: null,
      catalogNo: nos.get('n-2019')
    })
    expect(byId.get('p-2021')!.lineage).toEqual({
      year: 2021,
      month: 3,
      catalogNo: nos.get('n-2021')
    })
    expect('lineage' in byId.get('p-none')!).toBe(false)
    // 全序编号：2019(null 月)→2021(3 月)→未定年
    expect(byId.get('p-2019')!.lineage!.catalogNo).toBe(1)
    expect(byId.get('p-2021')!.lineage!.catalogNo).toBe(2)
  })

  it('当页外脉络节点不误挂（分页面——仅当页行 join）', async () => {
    // 图含 p-off（不在当页）——不影响当页行
    const nodes = [...graphNodes(), lnode({ id: 'n-off', paperId: 'p-off', year: 1900, month: 1, slot: 1 })]
    const { repos } = stubRepos(nodes)
    const svc = createLibraryService({ repos })
    const res = await svc.list({ sort: 'added_desc', offset: 0, limit: 50 })
    expect(res.items.some((p) => p.id === 'p-off')).toBe(false)
    // p-off 排最前（1900 年）→当页三行编号=2..4（呈现序含页外节点——全序语义）
    const hit = res.items.find((p) => p.id === 'p-2019')!
    expect(hit.lineage!.catalogNo).toBe(2)
  })
})

describe('T3-P5 detail() 真值透传（month 真值+catalogNo——摘恒 null 注释）', () => {
  it('node.month 真值透传+catalogNo 编号；lineage 形={year,month,edgeCount,catalogNo}', async () => {
    const nodes = graphNodes()
    const node = nodes.find((n) => n.id === 'n-2021')!
    const listGraph = vi.fn(() => ({ nodes, edges: [] }))
    const detail = {
      id: 'p-2021', title: 't', authors: [], year: 2024, venue: '', doi: null,
      tagNames: [], collectionNames: [], annotationCount: 0, noteCount: 0,
      lastReadPage: 0, addedAt: 't', abstract: '', arxivId: null, source: 'local' as const,
      enrichStatus: 'pending' as const, fileUrl: 'app-file://p-2021', fileName: 'a.pdf',
      updatedAt: 't', tags: [], collections: []
    }
    const repos = {
      papers: {
        searchSummaries: () => ({ items: [], total: 0 }),
        detailById: () => detail,
        updateMeta: () => detail,
        listSummariesByIds: () => []
      },
      collections: { list: () => [] },
      lineage: {
        listGraph,
        nodeByPaperId: (id: string) => (id === 'p-2021' ? node : null),
        edgeCountByNode: () => 4
      }
    } as unknown as Repos
    const svc = createLibraryService({ repos })
    const d = await svc.detail({ paperId: 'p-2021' })
    expect(d.lineage).toEqual({ year: 2021, month: 3, edgeCount: 4, catalogNo: 2 })
  })

  it('未命中整键省略（既有语义零动）', async () => {
    const detail = {
      id: 'p-1', title: 't', authors: [], year: 2024, venue: '', doi: null,
      tagNames: [], collectionNames: [], annotationCount: 0, noteCount: 0,
      lastReadPage: 0, addedAt: 't', abstract: '', arxivId: null, source: 'local' as const,
      enrichStatus: 'pending' as const, fileUrl: 'app-file://p-1', fileName: 'a.pdf',
      updatedAt: 't', tags: [], collections: []
    }
    const repos = {
      papers: {
        searchSummaries: () => ({ items: [], total: 0 }),
        detailById: () => detail,
        updateMeta: () => detail,
        listSummariesByIds: () => []
      },
      collections: { list: () => [] },
      lineage: {
        listGraph: () => ({ nodes: [], edges: [] }),
        nodeByPaperId: () => null,
        edgeCountByNode: () => 0
      }
    } as unknown as Repos
    const svc = createLibraryService({ repos })
    const d = await svc.detail({ paperId: 'p-1' })
    expect('lineage' in d).toBe(false)
  })
})
