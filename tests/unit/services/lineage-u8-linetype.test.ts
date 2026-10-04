/**
 * [F-LGRAPH-01②U8] 线型重整+ref 综述边体系退役锁定合约面——manual 单基型+
 * 边内联视觉字段（dashed/color——A3 仲裁）+色行名 6 行图级 KV（P-5 色板）
 * +守卫重整（环/重边/悬空保留；ref 守卫/多父守卫/sub 引用守卫退役）。
 * 真相源=docs/design/2026-10-01_f-lgraph01-editor-design-final.md §1 P-5/P-14
 * +mockup §3.8 退役行 6+A3/A9' 仲裁。always-active 裸 describe（K3）。
 */
import { describe, expect, it } from 'vitest'
import type { SqliteDb } from '../../../src/main/db/connection'
import { createLineageRepo } from '../../../src/main/db/repos/lineage.repo'
import { createLineageService } from '../../../src/main/services/lineage/lineage.service'
import { readUserVersion } from '../../../src/main/db/migrate'
import {
  LINE_TYPE_COLORS,
  LINE_TYPE_DEFAULT_NAME,
  LINE_TYPE_ROWS,
  defaultLineTypeNames,
  lineageEdgeSchema,
  lineageEdgeUpsertSchema,
  lineTypeNamesSchema
} from '../../../src/shared/models/lineage'
import { createTestDb } from '../../utils/fixtures'

let db: SqliteDb
let repo: ReturnType<typeof createLineageRepo>
let svc: ReturnType<typeof createLineageService>
let nA: string
let nB: string
let nC: string

function boot(): void {
  db = createTestDb()
  repo = createLineageRepo(db)
  // [F-ALIGN-01] deps 收窄=repo（新建分支注入面退役删）
  svc = createLineageService({ repo })
  const mk = (title: string): string =>
    repo.upsertNode({ paperId: null, title, coreIdea: '', year: null, x: null, y: null }).id
  nA = mk('节点A')
  nB = mk('节点B')
  nC = mk('节点C')
}

function baseEdge(patch: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'e-1',
    fromNode: 'n-a',
    toNode: 'n-b',
    label: '',
    dashed: false,
    color: '#3a5bd9',
    createdAt: 't',
    updatedAt: 't',
    ...patch
  }
}

describe('F-LGRAPH-01②U8 schema：manual 单基型+视觉字段内联（A3）', () => {
  it('lineageEdgeSchema 收 dashed/color；kind/sub 键=strict 拒收（sub 引用制退役）', () => {
    const ok = lineageEdgeSchema.safeParse(baseEdge())
    expect(ok.success).toBe(true)
    const withKind = lineageEdgeSchema.safeParse(baseEdge({ kind: 'manual' }))
    expect(withKind.success).toBe(false)
    const withSub = lineageEdgeSchema.safeParse(baseEdge({ sub: 's-1' }))
    expect(withSub.success).toBe(false)
  })

  it('upsert schema：dashed/color 可选（缺省归一在 service/repo——A8 全载荷合成消费面）', () => {
    const up = lineageEdgeUpsertSchema.safeParse({ fromNode: 'a', toNode: 'b', label: '' })
    expect(up.success).toBe(true)
    const styled = lineageEdgeUpsertSchema.safeParse({
      fromNode: 'a',
      toNode: 'b',
      label: '',
      dashed: true,
      color: '#c07a2a'
    })
    expect(styled.success).toBe(true)
  })

  it('色板常量：6 色固定行（P-5 蓝/橙/绿/紫/灰/洋红）+缺省名「待命名」+恰 6 校验', () => {
    expect(LINE_TYPE_ROWS).toBe(6)
    expect(LINE_TYPE_COLORS).toHaveLength(6)
    expect(new Set(LINE_TYPE_COLORS).size).toBe(6)
    expect(LINE_TYPE_DEFAULT_NAME).toBe('待命名')
    expect(lineTypeNamesSchema.safeParse(defaultLineTypeNames()).success).toBe(true)
    expect(lineTypeNamesSchema.safeParse(['a', 'b', 'c', 'd', 'e']).success).toBe(false)
    expect(lineTypeNamesSchema.safeParse(['a', 'b', 'c', 'd', 'e', 'f', 'g']).success).toBe(false)
    expect(defaultLineTypeNames()).toEqual(['待命名', '待命名', '待命名', '待命名', '待命名', '待命名'])
  })
})

describe('F-LGRAPH-01②U8 repo：恒 manual 落库+视觉列往返+色行名 KV', () => {
  it('upsertEdge 视觉字段往返；kind 列恒 manual（应用面单基型）', () => {
    boot()
    const saved = repo.upsertEdge({ fromNode: nA, toNode: nB, label: '', dashed: true, color: '#c07a2a' })
    expect(saved.dashed).toBe(true)
    expect(saved.color).toBe('#c07a2a')
    const raw = db.prepare('SELECT kind, dashed, color FROM lineage_edges WHERE id = ?').get(saved.id) as {
      kind: string
      dashed: number
      color: string
    }
    expect(raw.kind).toBe('manual')
    expect(raw.dashed).toBe(1)
    expect(raw.color).toBe('#c07a2a')
    // 更新语义：id 全载荷覆盖
    const updated = repo.upsertEdge({ id: saved.id, fromNode: nA, toNode: nB, label: '改名', dashed: false, color: '#0f8a6d' })
    expect(updated.dashed).toBe(false)
    expect(updated.color).toBe('#0f8a6d')
  })

  it('dashed/color 缺省归一：false+色板首色（蓝）', () => {
    boot()
    const saved = repo.upsertEdge({ fromNode: nA, toNode: nB, label: '' })
    expect(saved.dashed).toBe(false)
    expect(saved.color).toBe(LINE_TYPE_COLORS[0])
  })

  it('旧 kind 值读面收敛：直插 ref/tree 行读出不炸（kind 字段不映射丢弃）', () => {
    boot()
    db.prepare(
      `INSERT INTO lineage_edges (id, from_node, to_node, label, kind, sub, created_at, updated_at)
       VALUES ('e-legacy', ?, ?, '', 'ref', 's-old', 't', 't')`
    ).run(nA, nB)
    const edge = repo.listGraph().edges.find((e) => e.id === 'e-legacy')
    expect(edge).toBeDefined()
    expect(edge!.dashed).toBe(false)
    expect(edge!.color).toBe(LINE_TYPE_COLORS[0])
  })

  it('色行名 KV：缺省=6×待命名；整批替换往返；旧 lineTypes 四组键残留不炸（键分离）', () => {
    boot()
    expect(repo.getLineTypeNames()).toEqual(defaultLineTypeNames())
    repo.setLineTypeNames(['主线', '', '对比', '支撑', '', '否证'])
    expect(repo.getLineTypeNames()).toEqual(['主线', '', '对比', '支撑', '', '否证'])
    // 旧键残留（存量库 010 迁移 seed 行）=死数据不读
    db.prepare(`INSERT OR REPLACE INTO lineage_graph_meta (key, value, updated_at) VALUES ('lineTypes', '[{"base":"tree","subs":[]}]', 't')`)
      .run()
    expect(repo.getLineTypeNames()).toEqual(['主线', '', '对比', '支撑', '', '否证'])
  })

  it('色行名读面容错：损坏 JSON/非法形状→缺省 6 行（样式配置降级不炸图读——via 容错同精神）', () => {
    boot()
    db.prepare(`INSERT INTO lineage_graph_meta (key, value, updated_at) VALUES ('lineTypeNames', '{bad', 't')`).run()
    expect(repo.getLineTypeNames()).toEqual(defaultLineTypeNames())
    db.prepare(`UPDATE lineage_graph_meta SET value = '["a"]' WHERE key = 'lineTypeNames'`).run()
    expect(repo.getLineTypeNames()).toEqual(defaultLineTypeNames())
  })
})

describe('F-LGRAPH-01②U8 service：守卫重整（环/重边/悬空保留·ref/多父/sub 守卫退役）', () => {
  it('多入边放行（manual 不限条数=单父守卫随四 kind 体系退役）', () => {
    boot()
    svc.upsertEdge({ fromNode: nA, toNode: nC, label: '' })
    const second = svc.upsertEdge({ fromNode: nB, toNode: nC, label: '', dashed: true, color: '#c07a2a' })
    expect(second.dashed).toBe(true)
  })

  it('自环/悬空/重复端点对/成环拒绝保留（CONFLICT）', () => {
    boot()
    expect(() => svc.upsertEdge({ fromNode: nA, toNode: nA, label: '' })).toThrow()
    expect(() => svc.upsertEdge({ fromNode: 'ghost', toNode: nB, label: '' })).toThrow()
    svc.upsertEdge({ fromNode: nA, toNode: nB, label: '' })
    // 同端点对重复（更新语义 id 不同）拒
    expect(() => svc.upsertEdge({ fromNode: nA, toNode: nB, label: 'dup' })).toThrow()
    svc.upsertEdge({ fromNode: nB, toNode: nC, label: '' })
    // C→A 成环（A→B→C 已立）
    let code = ''
    try {
      svc.upsertEdge({ fromNode: nC, toNode: nA, label: '' })
    } catch (e) {
      code = (e as { code: string }).code
    }
    expect(code).toBe('CONFLICT')
  })

  it('upsertLineTypeNames：恰 6+空名归一「待命名」+graph 读面同源', () => {
    boot()
    const saved = svc.upsertLineTypeNames(['主线', '  ', '对比', '支撑', '', '否证'])
    expect(saved[1]).toBe(LINE_TYPE_DEFAULT_NAME)
    expect(saved).toEqual(['主线', '待命名', '对比', '支撑', '待命名', '否证'])
    expect(svc.graph().lineTypeNames).toEqual(saved)
    let code = ''
    try {
      svc.upsertLineTypeNames(['a', 'b', 'c'])
    } catch (e) {
      code = (e as { code: string }).code
    }
    expect(code).toBe('INVALID_REQUEST')
  })
})

describe('F-LGRAPH-01②U8 迁移 014（edges 视觉列 NOT NULL DEFAULT——存量零迁移归一）', () => {
  it('新库 user_version=14；直插无视觉列旧行读面归一（不炸）', () => {
    boot()
    expect(readUserVersion(db)).toBe(14)
    db.prepare(
      `INSERT INTO lineage_edges (id, from_node, to_node, label, kind, created_at, updated_at)
       VALUES ('e-old', ?, ?, '', 'tree', 't', 't')`
    ).run(nA, nB)
    const edge = repo.listGraph().edges.find((e) => e.id === 'e-old')
    expect(edge!.dashed).toBe(false)
    expect(edge!.color).toBe(LINE_TYPE_COLORS[0])
  })
})
