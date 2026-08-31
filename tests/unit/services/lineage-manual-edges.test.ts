/**
 * [F-LG15] manual 边（人工第二父文献连线）—— service 写守卫+draft 协议拒绝面
 * （新增锁定面，真库夹具——lineage-import.test 同型）。
 *
 * 覆盖：manual 落库往返/豁免单父+不限条数（两 manual 同子通过——用户裁决
 * 台账）/拒环双向（经 tree 父链+经 manual 父链——环检测图=tree+ref+manual
 * 全部边）/同端点对三方互斥（tree·ref·manual 任一先行后续其他 kind 拒）/
 * draft 协议不收 manual（edge 带 kind 字段=strict 拒；合法导入边恒 tree）/
 * manual 自环拒/label 后编辑（id 更新语义——created_at 保留 kind 保持）。
 * always-active（ADR-0017 裁决 3——不经 guardedDescribe）。
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { createLineageRepo } from '../../../src/main/db/repos/lineage.repo'
import type { SqliteDb } from '../../../src/main/db/connection'
import { createTestDb } from '../../utils/fixtures'
import { createLineageService } from '../../../src/main/services/lineage/lineage.service'

let db: SqliteDb
let repo: ReturnType<typeof createLineageRepo>
let svc: ReturnType<typeof createLineageService>

beforeEach(() => {
  db = createTestDb()
  for (const id of ['p-1', 'p-2', 'p-3', 'p-4']) {
    db.prepare(
      'INSERT INTO papers (id, file_ref, sha256, added_at, updated_at) VALUES (?,?,?,?,?)'
    ).run(id, 'a.pdf', `s-${id}`, 't', 't')
  }
  repo = createLineageRepo(db)
  svc = createLineageService({
    repo,
    paperExists: (id) => ['p-1', 'p-2', 'p-3', 'p-4'].includes(id),
    withTransaction: (fn) => db.transaction(fn)()
  })
})

/** 四节点种子：A/B/C/D 文献节点（自动布局） */
function seedNodes(): { a: string; b: string; c: string; d: string } {
  const mk = (paperId: string, title: string, year: number): string =>
    repo.upsertNode({ paperId, title, coreIdea: '', year, x: null, y: null }).id
  return {
    a: mk('p-1', '起源方法', 2019),
    b: mk('p-2', '继承工作', 2021),
    c: mk('p-3', '并行路线', 2020),
    d: mk('p-4', '后来综合', 2022)
  }
}

describe('F-LG15 manual 边 upsertEdge 写守卫', () => {
  it('manual 落库：kind=manual 往返+label 逻辑线说明在库', () => {
    const { a, b } = seedNodes()
    const e = svc.upsertEdge({ fromNode: a, toNode: b, label: '研究者补判的思想源头', kind: 'manual' })
    expect(e.kind).toBe('manual')
    expect(e.label).toBe('研究者补判的思想源头')
    const g = svc.graph()
    expect(g.edges.filter((x) => x.kind === 'manual')).toHaveLength(1)
  })

  it('manual 豁免单父+不限条数：to 已有 tree 父仍可挂 manual；两 manual 同子通过（tree 父保留不顶替）', () => {
    const { a, b, c, d } = seedNodes()
    svc.upsertEdge({ fromNode: a, toNode: b, label: '', kind: 'tree' })
    const m1 = svc.upsertEdge({ fromNode: c, toNode: b, label: '第二父：方法同源', kind: 'manual' })
    const m2 = svc.upsertEdge({ fromNode: d, toNode: b, label: '第三父：问题同源', kind: 'manual' })
    expect(m1.kind).toBe('manual')
    expect(m2.kind).toBe('manual')
    const g = svc.graph()
    expect(g.edges).toHaveLength(3)
    expect(g.edges.filter((x) => x.kind === 'tree')).toHaveLength(1) // tree 父保留
    expect(g.edges.filter((x) => x.kind === 'manual' && x.toNode === b)).toHaveLength(2) // 不限条数
  })

  it('拒环①经 tree 父链：A→B tree 在，挂 B→A manual → 中文 reason+库不变', () => {
    const { a, b } = seedNodes()
    svc.upsertEdge({ fromNode: a, toNode: b, label: '', kind: 'tree' })
    expect(() => svc.upsertEdge({ fromNode: b, toNode: a, label: '', kind: 'manual' })).toThrow('环')
    expect(svc.graph().edges).toHaveLength(1)
  })

  it('拒环②经 manual 父链（双向）：A→B manual 在，挂 B→A tree → 环检测图含 manual 边才可拦截', () => {
    const { a, b } = seedNodes()
    svc.upsertEdge({ fromNode: a, toNode: b, label: '', kind: 'manual' })
    // 多父面不拦（A 无 tree 父）；仅环检测沿 manual 父链可达（A→B）拦截 B→A
    expect(() => svc.upsertEdge({ fromNode: b, toNode: a, label: '', kind: 'tree' })).toThrow('环')
    expect(svc.graph().edges).toHaveLength(1)
  })

  it('拒环③manual 纯链造环：A→B manual+B→C manual 后挂 C→A manual → 拒', () => {
    const { a, b, c } = seedNodes()
    svc.upsertEdge({ fromNode: a, toNode: b, label: '', kind: 'manual' })
    svc.upsertEdge({ fromNode: b, toNode: c, label: '', kind: 'manual' })
    expect(() => svc.upsertEdge({ fromNode: c, toNode: a, label: '', kind: 'manual' })).toThrow('环')
    expect(svc.graph().edges).toHaveLength(2)
  })

  it('同端点对三方互斥：tree 在先 manual 后拒；manual 在先 tree 后拒；ref 在先 manual 后拒（互斥 reason）', () => {
    // tree → manual
    {
      const { a, b } = seedNodes()
      svc.upsertEdge({ fromNode: a, toNode: b, label: '', kind: 'tree' })
      expect(() => svc.upsertEdge({ fromNode: a, toNode: b, label: '', kind: 'manual' })).toThrow('互斥')
      expect(svc.graph().edges).toHaveLength(1)
    }
    // manual → tree
    repo.clearGraph()
    {
      const { a, b } = seedNodes()
      svc.upsertEdge({ fromNode: a, toNode: b, label: '', kind: 'manual' })
      expect(() => svc.upsertEdge({ fromNode: a, toNode: b, label: '', kind: 'tree' })).toThrow('互斥')
      expect(svc.graph().edges).toHaveLength(1)
    }
    // ref → manual
    repo.clearGraph()
    {
      const s = repo.upsertNode({ paperId: 'p-1', title: '领域综述回顾', coreIdea: '', year: 2020, x: null, y: null }).id
      const b = repo.upsertNode({ paperId: 'p-2', title: '研究工作', coreIdea: '', year: 2021, x: null, y: null }).id
      svc.upsertEdge({ fromNode: s, toNode: b, label: '', kind: 'ref' })
      expect(() => svc.upsertEdge({ fromNode: s, toNode: b, label: '', kind: 'manual' })).toThrow('互斥')
      expect(svc.graph().edges).toHaveLength(1)
    }
  })

  it('manual 自环拒：from==to → 中文 reason+库不变', () => {
    const { a } = seedNodes()
    expect(() => svc.upsertEdge({ fromNode: a, toNode: a, label: '', kind: 'manual' })).toThrow('自环')
    expect(svc.graph().edges).toEqual([])
  })

  it('label 后编辑（更新语义）：manual 边改 label → created_at 保留+kind 保持+graph 反映', () => {
    const { a, b } = seedNodes()
    const e = svc.upsertEdge({ fromNode: a, toNode: b, label: '初判', kind: 'manual' })
    const updated = svc.upsertEdge({ id: e.id, fromNode: a, toNode: b, label: '再判：修正的逻辑线', kind: 'manual' })
    expect(updated.id).toBe(e.id)
    expect(updated.createdAt).toBe(e.createdAt)
    expect(updated.kind).toBe('manual')
    expect(updated.label).toBe('再判：修正的逻辑线')
    expect(svc.graph().edges).toHaveLength(1) // 更新非新建
  })
})

describe('F-LG15 draft 导入协议不收 manual', () => {
  it('draft edge 带 kind 字段 → strict 拒（行级 errors+库不动）', () => {
    const r = svc.importDraft({
      nodes: [
        { paper_id: 'p-1', title: 'a', year: 2019, core_idea: '' },
        { paper_id: 'p-2', title: 'b', year: 2021, core_idea: '' }
      ],
      edges: [{ from_paper_id: 'p-1', to_paper_id: 'p-2', label: '', kind: 'manual' }]
    })
    expect(r.ok).toBe(false)
    // strict 的 unrecognized key 错误锚定在边对象级（path=edges.0）——reason
    // 含键名 kind（draft edge schema 无 kind 字段=tree 语义，F-LG15 不收）
    if (!r.ok) {
      expect(r.errors.some((e) => e.path.startsWith('edges.0') && /kind/i.test(e.reason))).toBe(true)
    }
    expect(svc.graph().nodes).toEqual([])
  })

  it('合法 draft 导入边恒 tree（draft 协议=树语义，manual 仅应用内手工创建）', () => {
    const r = svc.importDraft({
      nodes: [
        { paper_id: 'p-1', title: 'a', year: 2019, core_idea: '' },
        { paper_id: 'p-2', title: 'b', year: 2021, core_idea: '' }
      ],
      edges: [{ from_paper_id: 'p-1', to_paper_id: 'p-2', label: '主要继承' }]
    })
    expect(r).toEqual({ ok: true, nodeCount: 2, edgeCount: 1 })
    expect(svc.graph().edges.every((e) => e.kind === 'tree')).toBe(true)
  })
})
