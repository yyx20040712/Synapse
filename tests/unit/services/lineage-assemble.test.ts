/**
 * [T3-P5] lineage.json 第六件套（装配纯函数+会话落盘接线）锁定测试。
 *
 * 覆盖：assembleLineageJson golden **字节级**比对（递归 alphabetical 键序+
 * snake_case+2 空格缩进+末尾换行+schema_version=1）/幂等（两次调用逐字节
 * 全等）/catalog_no=按 lineageOrder 全序 1..N（与 lineageCatalogNos 同源）/
 * nodes 不含 x/y/slot、edges 含 line_type{base,sub}、line_types base 枚举序
 * 后 subs 按 id 升序/输入乱序不侵扰输出序（装配自归位）/会话接线：corpus
 * 导出会话 finalizing 写 lineage.json（deps.lineage 读通道注入——真库图 +
 * meta lineTypes；无 BOM）；通道缺席=不写（可选依赖先例=clipboard 桩零改）。
 * 真相源=docs/design/2026-09-27_t3p5-lineage-data-layer-design-final.md §5/§6。
 * always-active（不经 guardedDescribe）。
 */
import { readFile, rm } from 'node:fs/promises'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  assembleLineageJson,
  type LineageAssembleInput
} from '../../../src/main/services/export_/lineage.assemble'
import {
  createCorpusExportService,
  type CorpusExportDeps
} from '../../../src/main/services/export_/corpus.export.service'
import { createRepos, type Repos } from '../../../src/main/db/repos'
import { createTestDb } from '../../utils/fixtures'
import { lineageCatalogNos } from '../../../src/shared/models/lineage'
import type { ExtractRequestEvent, ExportCorpusEvent } from '../../../src/shared/ipc/schemas'
import type { LineageEdge, LineageNode, LineTypeGroup } from '../../../src/shared/models/lineage'

const ISO_A = '2026-01-01T00:00:00.000Z'
const ISO_B = '2026-01-02T00:00:00.000Z'

/** 三节点夹具（输入刻意乱序——装配须自归位）：A(2021,3,slot1)/B(2021,3,slot2)/C 主题(null) */
function nodes(): LineageNode[] {
  return [
    {
      id: 'nB', paperId: 'p-2', title: '乙', coreIdea: '', year: 2021, x: null, y: null,
      tags: null, month: 3, slot: 2, createdAt: ISO_A, updatedAt: 't'
    },
    {
      id: 'nA', paperId: 'p-1', title: '甲', coreIdea: 'A 思想', year: 2021, x: 5, y: 6,
      tags: ['t1'], month: 3, slot: 1, createdAt: ISO_A, updatedAt: 't'
    },
    {
      id: 'nC', paperId: null, title: '丙', coreIdea: '', year: null, x: null, y: null,
      tags: null, month: null, slot: 1, createdAt: ISO_A, updatedAt: 't'
    }
  ]
}

function edges(): LineageEdge[] {
  return [
    {
      id: 'e2', fromNode: 'nB', toNode: 'nC', label: '', kind: 'tree', sub: null,
      createdAt: ISO_B, updatedAt: 't'
    },
    {
      id: 'e1', fromNode: 'nA', toNode: 'nB', label: '继承', kind: 'tree', sub: 'lt-a',
      createdAt: ISO_A, updatedAt: 't'
    }
  ]
}

/** lineTypes 输入乱序（装配按 base 枚举序归位；subs 按 id 升序） */
function lineTypes(): LineTypeGroup[] {
  return [
    { base: 'manual', subs: [] },
    {
      base: 'tree',
      subs: [
        { id: 'lt-b', name: '乙型', color: '#111111', dash: '4 2', w: 1.5 },
        { id: 'lt-a', name: '强继承', color: '#F2773A', dash: '', w: 2 }
      ]
    },
    { base: 'ref', subs: [] },
    { base: 'inferred', subs: [] }
  ]
}

function input(): LineageAssembleInput {
  return { nodes: nodes(), edges: edges(), lineTypes: lineTypes() }
}

/** golden（手工逐字推演——字节级比对锚；递归 alphabetical 键序） */
const GOLDEN = `{
  "edges": [
    {
      "created_at": "${ISO_A}",
      "edge_id": "e1",
      "from": "nA",
      "label": "继承",
      "line_type": {
        "base": "tree",
        "sub": "lt-a"
      },
      "to": "nB"
    },
    {
      "created_at": "${ISO_B}",
      "edge_id": "e2",
      "from": "nB",
      "label": "",
      "line_type": {
        "base": "tree",
        "sub": null
      },
      "to": "nC"
    }
  ],
  "line_types": [
    {
      "base": "tree",
      "subs": [
        {
          "color": "#F2773A",
          "dash": "",
          "id": "lt-a",
          "name": "强继承",
          "w": 2
        },
        {
          "color": "#111111",
          "dash": "4 2",
          "id": "lt-b",
          "name": "乙型",
          "w": 1.5
        }
      ]
    },
    {
      "base": "inferred",
      "subs": []
    },
    {
      "base": "ref",
      "subs": []
    },
    {
      "base": "manual",
      "subs": []
    }
  ],
  "nodes": [
    {
      "catalog_no": 1,
      "core_idea": "A 思想",
      "month": 3,
      "node_id": "nA",
      "paper_id": "p-1",
      "tags": [
        "t1"
      ],
      "title": "甲",
      "year": 2021
    },
    {
      "catalog_no": 2,
      "core_idea": "",
      "month": 3,
      "node_id": "nB",
      "paper_id": "p-2",
      "tags": null,
      "title": "乙",
      "year": 2021
    },
    {
      "catalog_no": 3,
      "core_idea": "",
      "month": null,
      "node_id": "nC",
      "paper_id": null,
      "tags": null,
      "title": "丙",
      "year": null
    }
  ],
  "schema_version": 1
}
`

describe('T3-P5 assembleLineageJson（确定性装配——INV-77）', () => {
  it('golden 字节级比对（输入乱序自归位：nodes=lineageOrder 序/edges=(created_at,id)/line_types=base 枚举序后 subs id 升序）', () => {
    expect(assembleLineageJson(input())).toBe(GOLDEN)
  })

  it('幂等：两次调用逐字节全等', () => {
    expect(assembleLineageJson(input())).toBe(assembleLineageJson(input()))
  })

  it('递归 alphabetical 键序断言：顶层 edges<line_types<nodes<schema_version；节点 catalog_no<…<year；subs color<dash<id<name<w', () => {
    const text = assembleLineageJson(input())
    const topKeys = [...Object.keys(JSON.parse(text))]
    expect(topKeys).toEqual(['edges', 'line_types', 'nodes', 'schema_version'])
    // JSON.parse 保持文本键序——逐层断言（嵌套第一节点/第一边/第一 subs）
    const parsed = JSON.parse(text) as Record<string, unknown>
    const firstNode = (parsed.nodes as Array<Record<string, unknown>>)[0]!
    expect(Object.keys(firstNode)).toEqual([
      'catalog_no', 'core_idea', 'month', 'node_id', 'paper_id', 'tags', 'title', 'year'
    ])
    const firstEdge = (parsed.edges as Array<Record<string, unknown>>)[0]!
    expect(Object.keys(firstEdge)).toEqual([
      'created_at', 'edge_id', 'from', 'label', 'line_type', 'to'
    ])
    const lt = (firstEdge.line_type as Record<string, unknown>)
    expect(Object.keys(lt)).toEqual(['base', 'sub'])
    const firstGroup = (parsed.line_types as Array<Record<string, unknown>>)[0]!
    expect(Object.keys(firstGroup)).toEqual(['base', 'subs'])
    const firstSub = (firstGroup.subs as Array<Record<string, unknown>>)[0]!
    expect(Object.keys(firstSub)).toEqual(['color', 'dash', 'id', 'name', 'w'])
  })

  it('catalog_no 与 lineageOrder 全序一致（同源 lineageCatalogNos——禁双实现）+不含 x/y/slot', () => {
    const parsed = JSON.parse(assembleLineageJson(input())) as {
      nodes: Array<Record<string, unknown>>
    }
    const expectNos = lineageCatalogNos(nodes())
    expect(parsed.nodes.map((n) => n.catalog_no)).toEqual([1, 2, 3])
    for (const n of parsed.nodes) {
      expect(n.catalog_no).toBe(expectNos.get(n.node_id as string))
      expect('x' in n).toBe(false)
      expect('y' in n).toBe(false)
      expect('slot' in n).toBe(false)
    }
  })

  it('空图：nodes/edges 空数组+line_types 恒四组（空配置面）+schema_version=1', () => {
    const parsed = JSON.parse(
      assembleLineageJson({
        nodes: [],
        edges: [],
        lineTypes: [
          { base: 'tree', subs: [] },
          { base: 'inferred', subs: [] },
          { base: 'ref', subs: [] },
          { base: 'manual', subs: [] }
        ]
      })
    ) as { nodes: unknown[]; edges: unknown[]; line_types: unknown[]; schema_version: number }
    expect(parsed.nodes).toEqual([])
    expect(parsed.edges).toEqual([])
    expect(parsed.line_types).toHaveLength(4)
    expect(parsed.schema_version).toBe(1)
  })
})

describe('T3-P5 会话接线：finalizing 写 lineage.json（deps.lineage 读通道）', () => {
  interface Harness {
    db: ReturnType<typeof createTestDb>
    repos: Repos
    dir: string
    events: ExportCorpusEvent[]
    svc: ReturnType<typeof createCorpusExportService>
    dispose: () => Promise<void>
  }

  async function makeHarness(withLineage: boolean): Promise<Harness> {
    const db = createTestDb()
    const repos = createRepos(db)
    const dir = await mkdtemp(join(tmpdir(), 'lineage-json-session-'))
    const events: ExportCorpusEvent[] = []
    const deps: CorpusExportDeps = {
      repos,
      fileStore: { resolveManagedPath: (ref) => join(dir, 'files', ref) },
      sendEvent: (e) => {
        events.push(e)
      },
      now: () => '2026-09-27T00:00:00.000Z',
      ...(withLineage
        ? {
            lineage: () => ({
              nodes: repos.lineage.listGraph().nodes,
              edges: repos.lineage.listGraph().edges,
              lineTypes: repos.lineage.getLineTypes()
            })
          }
        : {})
    }
    return {
      db,
      repos,
      dir,
      events,
      svc: createCorpusExportService(deps),
      dispose: async () => {
        db.close()
        await rm(dir, { recursive: true, force: true })
      }
    }
  }

  /** 一篇文献+PDF 桩（文件存在性判定走真路径）+一节点入脉络 */
  async function seed(h: Harness): Promise<void> {
    const { mkdir, writeFile } = await import('node:fs/promises')
    await mkdir(join(h.dir, 'files'), { recursive: true })
    await writeFile(join(h.dir, 'files', 'p-1.pdf'), '%PDF-1.4 fixture')
    h.db
      .prepare('INSERT INTO papers (id, file_ref, sha256, title, added_at, updated_at) VALUES (?,?,?,?,?,?)')
      .run('p-1', 'p-1.pdf', 'sha-1', '文献甲', 't', 't')
    h.repos.lineage.upsertNode({
      paperId: 'p-1', title: '文献甲', coreIdea: '核心', year: 2021, x: null, y: null, month: 3
    })
  }

  /** 跑完一篇的最小会话（extractor 桩：两页 fulltext+complete） */
  async function runSession(h: Harness): Promise<void> {
    const done = h.svc.exportCorpusSession({ dir: h.dir })
    for (let i = 0; i < 200; i += 1) {
      const req = h.events.find((e): e is ExtractRequestEvent => e.type === 'extract-request')
      if (req !== undefined) {
        await h.svc.corpusItem({ sessionId: req.sessionId, paperId: req.paperId, kind: 'fulltext', page: 1, payload: 'T' })
        await h.svc.corpusItem({ sessionId: req.sessionId, paperId: req.paperId, kind: 'complete' })
        break
      }
      await new Promise((r) => setTimeout(r, 5))
    }
    await done
  }

  it('finalizing 写 lineage.json：字节=assembleLineageJson（含 catalog_no）；UTF-8 无 BOM', async () => {
    const h = await makeHarness(true)
    try {
      await seed(h)
      await runSession(h)
      const bytes = await readFile(join(h.dir, 'lineage.json'))
      expect(bytes[0]).not.toBe(0xef) // 无 BOM
      const text = bytes.toString('utf8')
      const g = h.repos.lineage.listGraph()
      const expectText = assembleLineageJson({
        nodes: g.nodes,
        edges: g.edges,
        lineTypes: h.repos.lineage.getLineTypes()
      })
      expect(text).toBe(expectText)
      expect((JSON.parse(text) as { nodes: Array<{ catalog_no: number; paper_id: string }> }).nodes).toEqual([
        { catalog_no: 1, core_idea: '核心', month: 3, node_id: expect.any(String), paper_id: 'p-1', tags: null, title: '文献甲', year: 2021 }
      ])
    } finally {
      await h.dispose()
    }
  })

  it('deps.lineage 缺席=不写 lineage.json（可选依赖——既有测试桩零改先例）', async () => {
    const h = await makeHarness(false)
    try {
      await seed(h)
      await runSession(h)
      await expect(readFile(join(h.dir, 'lineage.json'))).rejects.toThrow()
    } finally {
      await h.dispose()
    }
  })
})
