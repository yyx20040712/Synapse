/**
 * [F-LG15] manual 边（人工父文献连线）—— service 写守卫
 * （新增锁定面，真库夹具——lineage-import.test 同型）。
 *
 * [F-LGRAPH-01②U8] kind 四值体系退役重整：载荷无 kind 字段（应用面恒
 * 'manual' 落库）——原「豁免单父/三方互斥」用例随多父守卫+kind 区分退役
 * 删除（多入边放行断言=lineage-u8-linetype.test.ts；同端点对重复拒保留）。
 * 保留面=落库往返（label+视觉字段）/不限条数/拒环（含纯链造环）/自环拒/
 * label 后编辑（id 更新语义——created_at 保留）。
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
  // [F-ALIGN-01] deps 收窄=repo（新建分支注入面退役删——upsertEdge 守卫消费）
  svc = createLineageService({ repo })
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

describe('F-LG15 manual 边 upsertEdge 写守卫（U8 单基型重整版）', () => {
  it('落库往返：label+视觉字段（dashed/color）透传；DB kind 列恒 manual', () => {
    const { a, b } = seedNodes()
    const e = svc.upsertEdge({
      fromNode: a,
      toNode: b,
      label: '研究者补判的思想源头',
      dashed: true,
      color: '#c07a2a'
    })
    expect(e.label).toBe('研究者补判的思想源头')
    expect(e.dashed).toBe(true)
    expect(e.color).toBe('#c07a2a')
    const raw = db.prepare('SELECT kind FROM lineage_edges WHERE id = ?').get(e.id) as { kind: string }
    expect(raw.kind).toBe('manual')
    expect(svc.graph().edges).toHaveLength(1)
  })

  it('不限条数：多入边（b 三父）全通过——单父守卫随四 kind 体系退役', () => {
    const { a, b, c, d } = seedNodes()
    svc.upsertEdge({ fromNode: a, toNode: b, label: '第一父' })
    svc.upsertEdge({ fromNode: c, toNode: b, label: '第二父：方法同源' })
    svc.upsertEdge({ fromNode: d, toNode: b, label: '第三父：问题同源' })
    const g = svc.graph()
    expect(g.edges).toHaveLength(3)
    expect(g.edges.filter((x) => x.toNode === b)).toHaveLength(3)
  })

  it('拒环①两节点往返：A→B 在，挂 B→A → 中文 reason+库不变', () => {
    const { a, b } = seedNodes()
    svc.upsertEdge({ fromNode: a, toNode: b, label: '' })
    expect(() => svc.upsertEdge({ fromNode: b, toNode: a, label: '' })).toThrow('环')
    expect(svc.graph().edges).toHaveLength(1)
  })

  it('拒环②纯链造环：A→B+B→C 后挂 C→A → 拒（环检测图=全部边）', () => {
    const { a, b, c } = seedNodes()
    svc.upsertEdge({ fromNode: a, toNode: b, label: '' })
    svc.upsertEdge({ fromNode: b, toNode: c, label: '' })
    expect(() => svc.upsertEdge({ fromNode: c, toNode: a, label: '' })).toThrow('环')
    expect(svc.graph().edges).toHaveLength(2)
  })

  it('自环拒：from==to → 中文 reason+库不变', () => {
    const { a } = seedNodes()
    expect(() => svc.upsertEdge({ fromNode: a, toNode: a, label: '' })).toThrow('自环')
    expect(svc.graph().edges).toEqual([])
  })

  it('同端点对重复拒（UNIQUE 前置应用层守卫——无 kind 区分面）', () => {
    const { a, b } = seedNodes()
    svc.upsertEdge({ fromNode: a, toNode: b, label: '' })
    expect(() => svc.upsertEdge({ fromNode: a, toNode: b, label: 'dup' })).toThrow('已存在')
    expect(svc.graph().edges).toHaveLength(1)
  })

  it('label 后编辑（更新语义）：改 label → created_at 保留+graph 反映（更新非新建）', () => {
    const { a, b } = seedNodes()
    const e = svc.upsertEdge({ fromNode: a, toNode: b, label: '初判' })
    const updated = svc.upsertEdge({ id: e.id, fromNode: a, toNode: b, label: '再判：修正的逻辑线' })
    expect(updated.id).toBe(e.id)
    expect(updated.createdAt).toBe(e.createdAt)
    expect(updated.label).toBe('再判：修正的逻辑线')
    expect(svc.graph().edges).toHaveLength(1) // 更新非新建
  })
})
