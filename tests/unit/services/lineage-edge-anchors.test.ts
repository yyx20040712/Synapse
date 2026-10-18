/**
 * [F-VISFB-66 单元一] 边锚持久化写面三态+service 校验两路之写面（设计书
 * v1.2 §D.2/§D.4/§D.5——N-02r2：service 写面非法锚=throw INVALID_REQUEST）。
 * repo 三态 SQL 生成面（null 写 NULL/值写 JSON/缺席归一化）。always-active。
 */
import { beforeEach, describe, expect, it } from 'vitest'
import type { SqliteDb } from '../../../src/main/db/connection'
import { createLineageRepo } from '../../../src/main/db/repos/lineage.repo'
import { createLineageService } from '../../../src/main/services/lineage/lineage.service'
import { DomainError } from '../../../src/main/services/shared/domain-error'
import type { LineageEdgeUpsert } from '../../../src/shared/models/lineage'
import { createTestDb } from '../../utils/fixtures'

let db: SqliteDb
let repo: ReturnType<typeof createLineageRepo>
let svc: ReturnType<typeof createLineageService>

beforeEach(() => {
  db = createTestDb()
  repo = createLineageRepo(db)
  svc = createLineageService({ repo })
  for (const id of ['n-1', 'n-2']) {
    db.prepare(
      'INSERT INTO lineage_nodes (id, paper_id, title, core_idea, year, x, y, created_at, updated_at) VALUES (?, NULL, ?, \'\', 2024, NULL, NULL, \'t\', \'t\')'
    ).run(id, `节点${id}`)
  }
})

describe('F-VISFB-66·repo upsertEdge 锚三态（SQL 生成面）', () => {
  it('值写 JSON：fromAnchor={side,slot} 落库 JSON 文本+读回往返', () => {
    repo.upsertEdge({
      fromNode: 'n-1',
      toNode: 'n-2',
      label: '',
      fromAnchor: { side: 'bottom', slot: 2 },
      toAnchor: { side: 'top', slot: 1 }
    })
    const row = db
      .prepare(`SELECT from_anchor, to_anchor FROM lineage_edges`)
      .get() as { from_anchor: string | null; to_anchor: string | null }
    expect(JSON.parse(row.from_anchor!)).toEqual({ side: 'bottom', slot: 2 })
    expect(JSON.parse(row.to_anchor!)).toEqual({ side: 'top', slot: 1 })
    const back = repo.listGraph().edges[0]!
    expect(back.fromAnchor).toEqual({ side: 'bottom', slot: 2 })
    expect(back.toAnchor).toEqual({ side: 'top', slot: 1 })
  })

  it('null 写 NULL（清除意图——A8 物化载荷显式清）', () => {
    const created = repo.upsertEdge({
      fromNode: 'n-1',
      toNode: 'n-2',
      label: '',
      fromAnchor: { side: 'top', slot: 0 }
    })
    repo.upsertEdge({
      id: created.id,
      fromNode: 'n-1',
      toNode: 'n-2',
      label: '',
      fromAnchor: null,
      toAnchor: null
    })
    const row = db
      .prepare(`SELECT from_anchor, to_anchor FROM lineage_edges WHERE id = ?`)
      .get(created.id) as { from_anchor: string | null; to_anchor: string | null }
    expect(row.from_anchor).toBeNull()
    expect(row.to_anchor).toBeNull()
    expect(repo.listGraph().edges[0]!.fromAnchor).toBeUndefined()
  })

  it('缺席≡undefined 归一化：缺省键落 NULL（与显式 null 同落——enqueue 归一化口径）', () => {
    repo.upsertEdge({ fromNode: 'n-1', toNode: 'n-2', label: '' })
    const row = db
      .prepare(`SELECT from_anchor, to_anchor FROM lineage_edges`)
      .get() as { from_anchor: string | null; to_anchor: string | null }
    expect(row.from_anchor).toBeNull()
    expect(row.to_anchor).toBeNull()
  })

  it('读面容错：锚列非法 JSON/非法形状→undefined（via 同族降级不炸读）', () => {
    const created = repo.upsertEdge({ fromNode: 'n-1', toNode: 'n-2', label: '' })
    db.prepare(`UPDATE lineage_edges SET from_anchor = '{bad json', to_anchor = '{"side":"top"}' WHERE id = ?`).run(created.id)
    const back = repo.listGraph().edges[0]!
    expect(back.fromAnchor).toBeUndefined()
    expect(back.toAnchor).toBeUndefined()
  })
})

describe('F-VISFB-66·service upsertEdge 锚校验（写面=INVALID_REQUEST）', () => {
  it('非法锚（side 域外/序越界/形状残缺）→INVALID_REQUEST 中文 reason（对齐 via 先例）', () => {
    const bad1 = { fromNode: 'n-1', toNode: 'n-2', label: '', fromAnchor: { side: 'leftt', slot: 0 } } as unknown as LineageEdgeUpsert
    expect(() => svc.upsertEdge(bad1)).toThrowError(DomainError)
    try {
      svc.upsertEdge(bad1)
    } catch (e) {
      expect((e as DomainError).code).toBe('INVALID_REQUEST')
      expect((e as Error).message).toContain('锚点非法')
    }
    const bad2 = { fromNode: 'n-1', toNode: 'n-2', label: '', toAnchor: { side: 'top', slot: 3 } } as unknown as LineageEdgeUpsert
    expect(() => svc.upsertEdge(bad2)).toThrowError(/锚点非法/)
    const bad3 = { fromNode: 'n-1', toNode: 'n-2', label: '', fromAnchor: 'top0' } as unknown as LineageEdgeUpsert
    expect(() => svc.upsertEdge(bad3)).toThrowError(/锚点非法/)
  })

  it('合法值/null/缺省三态过校验（null=清除仅属载荷层——validate 层不吃 null）', () => {
    expect(() =>
      svc.upsertEdge({ fromNode: 'n-1', toNode: 'n-2', label: '', fromAnchor: null, toAnchor: { side: 'left', slot: 2 } })
    ).not.toThrow()
  })

  it('via:null 显式清除过校验（setEdgeVia 约定迁移的写面透传）', () => {
    const created = svc.upsertEdge({
      fromNode: 'n-1',
      toNode: 'n-2',
      label: '',
      via: [{ x: 0, y: 10 }, { x: 40, y: 10 }]
    })
    expect(() =>
      svc.upsertEdge({ id: created.id, fromNode: 'n-1', toNode: 'n-2', label: '', via: null })
    ).not.toThrow()
    const back = repo.listGraph().edges[0]!
    expect(back.via).toBeUndefined()
  })
})
