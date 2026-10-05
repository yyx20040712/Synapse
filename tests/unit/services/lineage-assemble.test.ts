/**
 * [T3-P5] lineage.json 第六件套（装配纯函数+会话落盘接线）锁定测试。
 * [F-LGRAPH-01②U8] A9' golden 重锁：schema_version=3——edges 扩 via+内联
 * 视觉字段（dashed/color 替代 line_type{base,sub} 引用）+line_types 四组→
 * 色行名 6 行新形状（LINE_TYPE_COLORS 固定序 zip）。
 *
 * 覆盖：assembleLineageJson golden **字节级**比对（递归 alphabetical 键序+
 * snake_case+2 空格缩进+末尾换行+schema_version=3）/幂等（两次调用逐字节
 * 全等）/pub_no 直取（INV-92）/nodes 不含 x/y/slot/edges via 缺省省略不产
 * []/输入乱序不侵扰输出序/会话接线：corpus 导出会话 finalizing 写
 * lineage.json（deps.lineage 读通道注入——真库图；无 BOM）；通道缺席=不写。
 * 真相源=docs/design/2026-09-27_t3p5-lineage-data-layer-design-final.md §5/§6
 * +2026-10-01_f-lgraph01-editor-design-final.md A9'（v3 重锁）。
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
import type { ExtractRequestEvent, ExportCorpusEvent } from '../../../src/shared/ipc/schemas'
import type { LineageEdge, LineageNode } from '../../../src/shared/models/lineage'

const ISO_A = '2026-01-01T00:00:00.000Z'
const ISO_B = '2026-01-02T00:00:00.000Z'

/** 三节点夹具（输入刻意乱序——装配须自归位）：A(2021,3,slot1)/B(2021,3,slot2)/C 主题(null)。
 *  [A1b F-CONTRACTA-01] tags 字段随脉络私有标签域退役删除（LineageNode 契约收窄）；
 *  [A3 F-CONTRACTA-01 2026-10-04] coreIdea 随 core_idea 全退役删除（同型收窄） */
function nodes(): LineageNode[] {
  return [
    {
      id: 'nB', paperId: 'p-2', title: '乙', year: 2021, x: null, y: null,
      month: 3, slot: 2, folderId: '__main__', createdAt: ISO_A, updatedAt: 't'
    },
    {
      id: 'nA', paperId: 'p-1', title: '甲', year: 2021, x: 5, y: 6,
      month: 3, slot: 1, folderId: '__main__', createdAt: ISO_A, updatedAt: 't'
    },
    {
      id: 'nC', paperId: null, title: '丙', year: null, x: null, y: null,
      month: null, slot: 1, folderId: '__main__', createdAt: ISO_A, updatedAt: 't'
    }
  ]
}

function edges(): LineageEdge[] {
  return [
    {
      id: 'e2', fromNode: 'nB', toNode: 'nC', label: '', dashed: true, color: '#c07a2a',
      via: [{ x: 1, y: 2 }, { x: 1, y: 30 }],
      createdAt: ISO_B, updatedAt: 't'
    },
    {
      id: 'e1', fromNode: 'nA', toNode: 'nB', label: '继承', dashed: false, color: '#1e3a8a',
      createdAt: ISO_A, updatedAt: 't'
    }
  ]
}

/** 色行名（恰 6——LINE_TYPE_COLORS zip 导出） */
function lineTypeNames(): string[] {
  return ['主线', '副线', '对比', '支撑', '衍生', '否证']
}

function input(): LineageAssembleInput {
  // [F-FOLDER-01] pubNo map（库级编号样例——装配直取透传）
  return {
    nodes: nodes(),
    edges: edges(),
    lineTypeNames: lineTypeNames(),
    pubNos: new Map([
      ['p-1', 7],
      ['p-2', 9]
    ])
  }
}

/** golden（手工逐字推演——字节级比对锚；递归 alphabetical 键序；v3。
 *  [A1b F-CONTRACTA-01 2026-10-04] 重冻结：nodes 各行 tags 键消失=唯一差异
 *  （人工核对 diff——设计稿 §4.2/§5.3；schema_version 不动=导出面无消费方）；
 *  [A3 F-CONTRACTA-01 2026-10-04] 再冻结：nodes 各行 core_idea 键消失=唯一
 *  差异（人工核对 diff——同 A1b 口径） */
const GOLDEN = `{
  "edges": [
    {
      "color": "#1e3a8a",
      "created_at": "${ISO_A}",
      "dashed": false,
      "edge_id": "e1",
      "from": "nA",
      "label": "继承",
      "to": "nB"
    },
    {
      "color": "#c07a2a",
      "created_at": "${ISO_B}",
      "dashed": true,
      "edge_id": "e2",
      "from": "nB",
      "label": "",
      "to": "nC",
      "via": [
        {
          "x": 1,
          "y": 2
        },
        {
          "x": 1,
          "y": 30
        }
      ]
    }
  ],
  "line_types": [
    {
      "color": "#1e3a8a",
      "name": "主线"
    },
    {
      "color": "#c07a2a",
      "name": "副线"
    },
    {
      "color": "#0f8a6d",
      "name": "对比"
    },
    {
      "color": "#8a4fbf",
      "name": "支撑"
    },
    {
      "color": "#8a8f98",
      "name": "衍生"
    },
    {
      "color": "#c2447f",
      "name": "否证"
    }
  ],
  "nodes": [
    {
      "month": 3,
      "node_id": "nA",
      "paper_id": "p-1",
      "pub_no": 7,
      "title": "甲",
      "year": 2021
    },
    {
      "month": 3,
      "node_id": "nB",
      "paper_id": "p-2",
      "pub_no": 9,
      "title": "乙",
      "year": 2021
    },
    {
      "month": null,
      "node_id": "nC",
      "paper_id": null,
      "pub_no": null,
      "title": "丙",
      "year": null
    }
  ],
  "schema_version": 3
}
`

describe('T3-P5 assembleLineageJson（确定性装配——INV-77；U8 v3 重锁）', () => {
  it('golden 字节级比对（输入乱序自归位：nodes=lineageOrder 序/edges=(created_at,id)/line_types=色板固定序 6 行）', () => {
    expect(assembleLineageJson(input())).toBe(GOLDEN)
  })

  it('幂等：两次调用逐字节全等', () => {
    expect(assembleLineageJson(input())).toBe(assembleLineageJson(input()))
  })

  it('递归 alphabetical 键序断言：顶层 edges<line_types<nodes<schema_version；节点 month<…<year（[A3] core_idea 键随退役消失）；边 color<created_at<dashed<…<via', () => {
    const text = assembleLineageJson(input())
    const topKeys = [...Object.keys(JSON.parse(text))]
    expect(topKeys).toEqual(['edges', 'line_types', 'nodes', 'schema_version'])
    // JSON.parse 保持文本键序——逐层断言（嵌套第一节点/第一边/色行）
    const parsed = JSON.parse(text) as Record<string, unknown>
    const firstNode = (parsed.nodes as Array<Record<string, unknown>>)[0]!
    expect(Object.keys(firstNode)).toEqual([
      'month', 'node_id', 'paper_id', 'pub_no', 'title', 'year'
    ])
    const firstEdge = (parsed.edges as Array<Record<string, unknown>>)[0]!
    expect(Object.keys(firstEdge)).toEqual([
      'color', 'created_at', 'dashed', 'edge_id', 'from', 'label', 'to'
    ])
    const viaEdge = (parsed.edges as Array<Record<string, unknown>>)[1]!
    expect(Object.keys(viaEdge)).toEqual([
      'color', 'created_at', 'dashed', 'edge_id', 'from', 'label', 'to', 'via'
    ])
    const firstRow = (parsed.line_types as Array<Record<string, unknown>>)[0]!
    expect(Object.keys(firstRow)).toEqual(['color', 'name'])
  })

  it('pub_no=入参 pubNos 同源直取（INV-92 库级编号）；主题节点 null；不含 x/y/slot/core_idea；via 缺省省略不产 []（N-1）', () => {
    const parsed = JSON.parse(assembleLineageJson(input())) as {
      nodes: Array<Record<string, unknown>>
      edges: Array<Record<string, unknown>>
    }
    expect(parsed.nodes.map((n) => n.pub_no)).toEqual([7, 9, null])
    for (const n of parsed.nodes) {
      expect('x' in n).toBe(false)
      expect('y' in n).toBe(false)
      expect('slot' in n).toBe(false)
      expect('core_idea' in n).toBe(false) // [A3] core_idea 全退役——导出键消失负锚
    }
    expect('via' in parsed.edges[0]!).toBe(false) // 无 via 边缺省省略
    expect(parsed.edges[1]!.via).toEqual([{ x: 1, y: 2 }, { x: 1, y: 30 }])
  })

  it('空图：nodes/edges 空数组+line_types 恒 6 行（空配置面缺省「待命名」）+schema_version=3（A9&apos; 序列化变更递增）', () => {
    const parsed = JSON.parse(
      assembleLineageJson({ nodes: [], edges: [], lineTypeNames: [] })
    ) as { nodes: unknown[]; edges: unknown[]; line_types: Array<{ name: string }>; schema_version: number }
    expect(parsed.nodes).toEqual([])
    expect(parsed.edges).toEqual([])
    expect(parsed.line_types).toHaveLength(6)
    expect(parsed.line_types.every((r) => r.name === '待命名')).toBe(true)
    expect(parsed.schema_version).toBe(3)
  })

  it('[F-FOLDER-02·C2] 跨图边过滤兜底：端点 folderId 不同的存量幽灵边不携出（同图边保留）', () => {
    const parsed = JSON.parse(
      assembleLineageJson({
        nodes: [
          {
            id: 'nA', paperId: 'p-1', title: '主图甲', year: 2021, x: null, y: null,
            month: 1, slot: 1, folderId: '__main__', createdAt: ISO_A, updatedAt: 't'
          },
          {
            id: 'nC', paperId: null, title: '主图主题', year: null, x: null, y: null,
            month: null, slot: 1, folderId: '__main__', createdAt: ISO_A, updatedAt: 't'
          },
          {
            id: 'nD', paperId: 'p-2', title: '他图乙', year: 2022, x: null, y: null,
            month: 2, slot: 1, folderId: 'f-x', createdAt: ISO_A, updatedAt: 't'
          }
        ],
        edges: [
          {
            id: 'e-same', fromNode: 'nA', toNode: 'nC', label: '同图', dashed: false, color: '#1e3a8a',
            createdAt: ISO_A, updatedAt: 't'
          },
          {
            id: 'e-cross', fromNode: 'nA', toNode: 'nD', label: '跨图幽灵', dashed: false, color: '#1e3a8a',
            createdAt: ISO_B, updatedAt: 't'
          }
        ],
        lineTypeNames: []
      })
    ) as { edges: Array<{ edge_id: string }> }
    expect(parsed.edges.map((e) => e.edge_id)).toEqual(['e-same'])
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
              lineTypeNames: repos.lineage.getLineTypeNames(),
              // [F-FOLDER-01] pubNos 装配（services/index 生产接线同源——pub_no 字段）
              pubNos: new Map(repos.papers.pubNoByIds(
                repos.lineage.listGraph().nodes.flatMap((n) => (n.paperId !== null ? [n.paperId] : []))
              ).map((r) => [r.paperId, r.pubNo]))
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
      paperId: 'p-1', title: '文献甲', year: 2021, x: null, y: null, month: 3
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

  it('finalizing 写 lineage.json：字节=assembleLineageJson（含 pub_no）；UTF-8 无 BOM', async () => {
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
        lineTypeNames: h.repos.lineage.getLineTypeNames(),
        pubNos: new Map(
          h.repos.papers
            .pubNoByIds(g.nodes.flatMap((n) => (n.paperId !== null ? [n.paperId] : [])))
            .map((r) => [r.paperId, r.pubNo])
        )
      })
      expect(text).toBe(expectText)
      expect((JSON.parse(text) as { nodes: Array<{ pub_no: number; paper_id: string }> }).nodes).toEqual([
        { month: 3, node_id: expect.any(String), paper_id: 'p-1', pub_no: 1, title: '文献甲', year: 2021 }
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
