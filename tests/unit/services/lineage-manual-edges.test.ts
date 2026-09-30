/**
 * [F-LG15] manual 边（人工第二父文献连线）—— service 写守卫
 * （新增锁定面，真库夹具——lineage-import.test 同型）。
 *
 * 覆盖：manual 落库往返/豁免单父+不限条数（两 manual 同子通过——用户裁决
 * 台账）/拒环双向（经 tree 父链+经 manual 父链——环检测图=tree+ref+manual
 * 全部边）/同端点对三方互斥（tree·ref·manual 任一先行后续其他 kind 拒）/
 * manual 自环拒/label 后编辑（id 更新语义——created_at 保留 kind 保持）。
 * [F-BAKRET-01] draft 协议拒绝面 describe 随草稿导入链退役删除（用户裁决
 * 2026-09-30——ADR-0022；draft schema strict 面由 lineage-tags schema 直测承载）。
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
    paperFolderOf: () => null, // [回炉码 1] 统一规则桩（未归档语义）
    ensurePaperFolder: () => '__main__',
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
    // manual → tree（[F-BAKRET-01] 清面原语退役——第二/三块改用新 paper 对
    // p-5/p-6+综述 p-7/目标 p-8，INV-89 部分唯一索引下不可复用已建节点的 paper）
    for (const [id, sha] of [
      ['p-5', 'sha-p5'],
      ['p-6', 'sha-p6'],
      ['p-7', 'sha-p7'],
      ['p-8', 'sha-p8']
    ] as const) {
      db.prepare(
        'INSERT INTO papers (id, file_ref, sha256, added_at, updated_at) VALUES (?, ?, ?, ?, ?)'
      ).run(id, 'a.pdf', sha, 't', 't')
    }
    {
      const c = repo.upsertNode({ paperId: 'p-5', title: '另一起源', coreIdea: '', year: 2019, x: null, y: null }).id
      const d = repo.upsertNode({ paperId: 'p-6', title: '另一继承', coreIdea: '', year: 2021, x: null, y: null }).id
      svc.upsertEdge({ fromNode: c, toNode: d, label: '', kind: 'manual' })
      expect(() => svc.upsertEdge({ fromNode: c, toNode: d, label: '', kind: 'tree' })).toThrow('互斥')
      expect(svc.graph().edges).toHaveLength(2)
    }
    // ref → manual（from 须综述题名——isSurveyTitle 单源）
    {
      const s = repo.upsertNode({ paperId: 'p-7', title: '领域综述回顾', coreIdea: '', year: 2020, x: null, y: null }).id
      const b = repo.upsertNode({ paperId: 'p-8', title: '研究工作', coreIdea: '', year: 2021, x: null, y: null }).id
      svc.upsertEdge({ fromNode: s, toNode: b, label: '', kind: 'ref' })
      expect(() => svc.upsertEdge({ fromNode: s, toNode: b, label: '', kind: 'manual' })).toThrow('互斥')
      expect(svc.graph().edges).toHaveLength(3)
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
