/**
 * [F-LINEAGE-02 ①a] via 数据模型锁定合约面——shared 校验纯函数+schema 形状+
 * repo 往返+service 写面守卫+迁移 013。
 * 真相源=docs/design/2026-10-01_f-lineage02-routing-design-final.md §2.1/§2.2
 * （四不变量：①相邻段轴对齐 ②相邻路点距 ≥1px ③via.length≥1 才 manual-override
 * ④端点不进 via=schema 形状面）；序列化口径 N-1：缺省=省略字段不产出 []。
 * always-active 裸 describe（K3）。
 */
import { describe, expect, it } from 'vitest'
import type { SqliteDb } from '../../../src/main/db/connection'
import { createLineageRepo } from '../../../src/main/db/repos/lineage.repo'
import { createLineageService } from '../../../src/main/services/lineage/lineage.service'
import { readUserVersion } from '../../../src/main/db/migrate'
import {
  lineageEdgeSchema,
  lineageEdgeUpsertSchema,
  validateLineageVia
} from '../../../src/shared/models/lineage'
import { createTestDb } from '../../utils/fixtures'

let db: SqliteDb
let repo: ReturnType<typeof createLineageRepo>
let svc: ReturnType<typeof createLineageService>
let nA: string
let nB: string

function boot(): void {
  db = createTestDb()
  repo = createLineageRepo(db)
  // [F-ALIGN-01] deps 收窄=repo（新建分支注入面退役删）
  svc = createLineageService({ repo })
  nA = repo.upsertNode({ paperId: null, title: '节点A', year: null, x: null, y: null }).id
  nB = repo.upsertNode({ paperId: null, title: '节点B', year: null, x: null, y: null }).id
}

function baseEdge(patch: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'e-1',
    fromNode: 'n-a',
    toNode: 'n-b',
    label: '',
    dashed: false,
    color: '#1e3a8a',
    createdAt: 't',
    updatedAt: 't',
    ...patch
  }
}

describe('F-LINEAGE-02 ①a validateLineageVia 纯函数（四不变量 ①②③）', () => {
  it('正交链过检：相邻段轴对齐（竖-横拐）→ null；单点/空数组=无相邻对过检', () => {
    expect(validateLineageVia([{ x: 10, y: 10 }, { x: 10, y: 40 }, { x: 60, y: 40 }])).toBeNull()
    expect(validateLineageVia([{ x: 5, y: 5 }])).toBeNull()
    expect(validateLineageVia([])).toBeNull()
  })

  it('①斜相邻段拒：dx/dy 双非零 → 中文 reason 含「正交」', () => {
    const r = validateLineageVia([{ x: 10, y: 10 }, { x: 20, y: 20 }])
    expect(r).not.toBeNull()
    expect(r).toContain('正交')
  })

  it('②重合点拒：相邻路点距 <1px → reason；恰 1px=含边界过检（≥语义）', () => {
    expect(validateLineageVia([{ x: 10, y: 10 }, { x: 10, y: 10.5 }])).not.toBeNull()
    expect(validateLineageVia([{ x: 10, y: 10 }, { x: 11, y: 10 }])).toBeNull()
  })

  it('[回炉 R6] 有限数钳：Infinity/NaN 坐标拒（k1-N5——单点过检致畸形 d）', () => {
    expect(validateLineageVia([{ x: Number.POSITIVE_INFINITY, y: 0 }, { x: Number.POSITIVE_INFINITY, y: 10 }])).not.toBeNull()
    expect(validateLineageVia([{ x: Number.NaN, y: 0 }, { x: 0, y: 10 }])).not.toBeNull()
    expect(validateLineageVia([{ x: 0, y: 0 }, { x: 10, y: Number.NEGATIVE_INFINITY }])).not.toBeNull()
    // [回炉 R9-W3] 单点形态直锁（无相邻对——距离/正交检全短路，唯钳拦）：
    // NaN 单点/−∞ 单点各一（形态锁——判别力经撤钳变异承载）
    expect(validateLineageVia([{ x: Number.NaN, y: 0 }])).not.toBeNull()
    expect(validateLineageVia([{ x: Number.NEGATIVE_INFINITY, y: 0 }])).not.toBeNull()
  })
})

describe('F-LINEAGE-02 ①a schema 形状（④端点不进 via=via 点仅 x/y 数值）', () => {
  it('lineageEdgeSchema：via 缺省解析成功且无键（不产出 []）；提供→等值透出', () => {
    const noVia = lineageEdgeSchema.safeParse(baseEdge())
    expect(noVia.success).toBe(true)
    if (noVia.success) {
      expect(noVia.data.via).toBeUndefined()
      expect('via' in noVia.data).toBe(false)
    }
    const withVia = lineageEdgeSchema.safeParse(baseEdge({ via: [{ x: 1, y: 2 }, { x: 1, y: 30 }] }))
    expect(withVia.success).toBe(true)
    if (withVia.success) {
      expect(withVia.data.via).toEqual([{ x: 1, y: 2 }, { x: 1, y: 30 }])
    }
  })

  it('upsert schema 同步 optional：via 随行可选；非数值坐标拒（形状面）', () => {
    const up = lineageEdgeUpsertSchema.safeParse({ fromNode: 'a', toNode: 'b', label: '', via: [{ x: 0, y: 0 }] })
    expect(up.success).toBe(true)
    const bad = lineageEdgeUpsertSchema.safeParse({ fromNode: 'a', toNode: 'b', label: '', via: [{ x: '0', y: 0 }] })
    expect(bad.success).toBe(false)
  })
})

describe('F-LINEAGE-02 ①a repo 往返+序列化口径（N-1 缺省省略不产出 []）', () => {
  it('via 落库 JSON TEXT 读回等值；缺省/空数组→NULL→读回 undefined', () => {
    boot()
    const via = [{ x: 100, y: 200 }, { x: 140, y: 200 }, { x: 140, y: 300 }]
    const saved = repo.upsertEdge({ fromNode: nA, toNode: nB, label: '', via })
    expect(saved.via).toEqual(via)
    const raw = db.prepare('SELECT via FROM lineage_edges WHERE id = ?').get(saved.id) as { via: string | null }
    expect(raw.via).toBe(JSON.stringify(via))
    const cleared = repo.upsertEdge({ id: saved.id, fromNode: nA, toNode: nB, label: '' })
    expect(cleared.via).toBeUndefined()
    const emptied = repo.upsertEdge({ id: saved.id, fromNode: nA, toNode: nB, label: '', via: [] })
    expect(emptied.via).toBeUndefined()
  })

  it('读面容错：库内非法 JSON/非数组形状→undefined（不炸 graph 读）', () => {
    boot()
    const saved = repo.upsertEdge({ fromNode: nA, toNode: nB, label: '' })
    db.prepare('UPDATE lineage_edges SET via = ? WHERE id = ?').run('{bad json', saved.id)
    expect(repo.listGraph().edges[0]!.via).toBeUndefined()
    db.prepare('UPDATE lineage_edges SET via = ? WHERE id = ?').run('{"x":1}', saved.id)
    expect(repo.listGraph().edges[0]!.via).toBeUndefined()
  })
})

describe('F-LINEAGE-02 ①a service 写面守卫（违者 INVALID_REQUEST）', () => {
  it('斜段/重合点 via → INVALID_REQUEST+中文 reason；合法 via 透传落库往返', () => {
    boot()
    const diagonal = (): { code: string; message: string } => {
      try {
        svc.upsertEdge({ fromNode: nA, toNode: nB, label: '', via: [{ x: 0, y: 0 }, { x: 9, y: 9 }] })
      } catch (e) {
        return { code: (e as { code: string }).code, message: (e as Error).message }
      }
      return { code: 'NOT_THROWN', message: '' }
    }
    const r1 = diagonal()
    expect(r1.code).toBe('INVALID_REQUEST')
    expect(r1.message).toContain('正交')
    try {
      svc.upsertEdge({ fromNode: nA, toNode: nB, label: '', via: [{ x: 0, y: 0 }, { x: 0, y: 0.5 }] })
      throw new Error('unreachable')
    } catch (e) {
      expect((e as { code: string }).code).toBe('INVALID_REQUEST')
    }
    // [回炉 R6] 有限数钳（service 写面同守）：Infinity 竖段（轴对齐恒真）
    // 单独拦——无钳则落库产出畸形 d
    try {
      svc.upsertEdge({
        fromNode: nA,
        toNode: nB,
        label: '',
        via: [{ x: Number.POSITIVE_INFINITY, y: 0 }, { x: Number.POSITIVE_INFINITY, y: 10 }]
      })
      throw new Error('unreachable')
    } catch (e) {
      expect((e as { code: string }).code).toBe('INVALID_REQUEST')
    }
    const via = [{ x: 10, y: 10 }, { x: 10, y: 60 }, { x: 50, y: 60 }]
    const saved = svc.upsertEdge({ fromNode: nA, toNode: nB, label: '', via })
    expect(saved.via).toEqual(via)
    expect(svc.graph().edges[0]!.via).toEqual(via)
  })
})

describe('F-LINEAGE-02 ①a 迁移 013（edges.via TEXT NULL——先例 007 tags JSON 列）', () => {
  it('新库 user_version=15（[F-UIRES-03 C1] 015 起）；直插 via=NULL 行合法（存量零迁移兼容）', () => {
    boot()
    expect(readUserVersion(db)).toBe(15)
    db.prepare(
      `INSERT INTO lineage_edges (id, from_node, to_node, label, kind, created_at, updated_at)
       VALUES ('e-legacy', ?, ?, '', 'tree', 't', 't')`
    ).run(nA, nB)
    expect(repo.listGraph().edges[0]!.via).toBeUndefined()
  })
})
