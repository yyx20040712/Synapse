/**
 * [T3-P5] 脉络模型增量 v2 —— zod 单源+lineageOrder 排序契约纯函数（新锁定合约面）。
 *
 * 覆盖：kind 四值枚举（inferred 先行——P5 无产生入口防退化）/LineageNode
 * month 边界（0/13 拒、1/12 过、null=未定月）/slot（负拒、0 过、null 兜底）/
 * LineageEdge sub（string|null）/draft v1.2（旧草稿零破坏+month 透传+越界拒）/
 * LineTypeSub·LineTypeGroup 形状（空串 dash=实线、w positive、空 id 拒）/
 * 恒四组强校验 schema（base 集合恰四枚举各一）/lineageOrder 排序契约
 * （乱序插入归位+null 组末三态+行序 tiebreak）+lineageCatalogNos 全序编号。
 * 真相源=docs/design/2026-09-27_t3p5-lineage-data-layer-design-final.md §1/§4。
 * always-active（不经 guardedDescribe）。
 */
import { describe, expect, it } from 'vitest'
import {
  LINE_TYPE_BASE_ORDER,
  lineTypeGroupSchema,
  lineTypeGroupsSchema,
  lineageDraftNodeSchema,
  lineageEdgeKindSchema,
  lineageEdgeSchema,
  lineageNodeSchema,
  lineageOrder,
  MAIN_GRAPH_ID,
  type LineageNode
} from '../../../src/shared/models/lineage'

/** 最小合法节点（v2 字段面全携） */
function node(patch: Partial<LineageNode> & { id: string }): LineageNode {
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
    folderId: MAIN_GRAPH_ID,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: 't',
    ...patch
  }
}

describe('T3-P5 kind 四值枚举（inferred 先行）', () => {
  it('tree/inferred/ref/manual 四值全过；旧值域外串拒', () => {
    for (const k of ['tree', 'inferred', 'ref', 'manual']) {
      expect(lineageEdgeKindSchema.parse(k)).toBe(k)
    }
    expect(lineageEdgeKindSchema.safeParse('dashed').success).toBe(false)
  })
})

describe('T3-P5 LineageNode month/slot（zod 边界）', () => {
  const base = {
    id: 'n-1',
    paperId: null,
    title: '节点',
    coreIdea: '',
    year: 2023,
    x: null,
    y: null,
    tags: null,
    folderId: '__main__', // [F-FOLDER-01] 必填图归属
    createdAt: 't',
    updatedAt: 't'
  }

  it('month 1..12 过、0/13/1.5 拒、null=未定月过；必填键（缺 month strict 拒）', () => {
    expect(lineageNodeSchema.safeParse({ ...base, month: 1, slot: null }).success).toBe(true)
    expect(lineageNodeSchema.safeParse({ ...base, month: 12, slot: null }).success).toBe(true)
    expect(lineageNodeSchema.safeParse({ ...base, month: null, slot: null }).success).toBe(true)
    expect(lineageNodeSchema.safeParse({ ...base, month: 0, slot: null }).success).toBe(false)
    expect(lineageNodeSchema.safeParse({ ...base, month: 13, slot: null }).success).toBe(false)
    expect(lineageNodeSchema.safeParse({ ...base, month: 1.5, slot: null }).success).toBe(false)
    expect(lineageNodeSchema.safeParse({ ...base, slot: null }).success).toBe(false)
  })

  it('slot ≥0 过、负拒、null 兜底过；必填键（缺 slot strict 拒）', () => {
    expect(lineageNodeSchema.safeParse({ ...base, month: null, slot: 0 }).success).toBe(true)
    expect(lineageNodeSchema.safeParse({ ...base, month: null, slot: -1 }).success).toBe(false)
    expect(lineageNodeSchema.safeParse({ ...base, month: null, slot: 1.5 }).success).toBe(false)
    expect(lineageNodeSchema.safeParse({ ...base, month: null }).success).toBe(false)
  })
})

describe('T3-P5 LineageEdge sub（string|null 必填键）', () => {
  const base = {
    id: 'e-1',
    fromNode: 'a',
    toNode: 'b',
    label: '',
    kind: 'tree',
    createdAt: 't',
    updatedAt: 't'
  }

  it('sub 字符串过、null=基础型默认样式过、缺 sub strict 拒', () => {
    expect(lineageEdgeSchema.safeParse({ ...base, sub: 'lt-1' }).success).toBe(true)
    expect(lineageEdgeSchema.safeParse({ ...base, sub: null }).success).toBe(true)
    expect(lineageEdgeSchema.safeParse(base).success).toBe(false)
    expect(lineageEdgeSchema.safeParse({ ...base, sub: 5 }).success).toBe(false)
  })
})

describe('T3-P5 draft v1.2（仅 month optional 新增）', () => {
  const base = { paper_id: 'p-1', title: '起源', year: 2018, core_idea: '源头' }

  it('旧草稿（无 month）零破坏；month 透传 6；null 显式过', () => {
    expect(lineageDraftNodeSchema.safeParse(base).success).toBe(true)
    const parsed = lineageDraftNodeSchema.parse({ ...base, month: 6 })
    expect(parsed.month).toBe(6)
    expect(lineageDraftNodeSchema.parse({ ...base, month: null }).month).toBeNull()
  })

  it('month 越界拒（0/13）；未知字段仍 strict 拒（其余字段未放松）', () => {
    // 判别锚：合法 month 必须过（旧 schema strict 未知键拒——本断言红即未落 month）
    expect(lineageDraftNodeSchema.safeParse({ ...base, month: 6 }).success).toBe(true)
    expect(lineageDraftNodeSchema.safeParse({ ...base, month: 0 }).success).toBe(false)
    expect(lineageDraftNodeSchema.safeParse({ ...base, month: 13 }).success).toBe(false)
    // B-1 回退锚：title 必填、core_idea 必填面不动
    expect(lineageDraftNodeSchema.safeParse({ ...base, title: '' }).success).toBe(false)
    expect(lineageDraftNodeSchema.safeParse({ paper_id: 'p-1', year: 2018, core_idea: '' }).success).toBe(false)
  })
})

describe('T3-P5 LineTypeSub/LineTypeGroup 形状', () => {
  const sub = { id: 'lt-a', name: '强继承', color: '#F2773A', dash: '', w: 2 }

  it('合法组过（空串 dash=实线）；w 非正拒、空 id/name 拒、未知键拒', () => {
    expect(lineTypeGroupSchema.safeParse({ base: 'tree', subs: [sub] }).success).toBe(true)
    expect(lineTypeGroupSchema.safeParse({ base: 'inferred', subs: [] }).success).toBe(true)
    expect(lineTypeGroupSchema.safeParse({ base: 'tree', subs: [{ ...sub, w: 0 }] }).success).toBe(false)
    expect(lineTypeGroupSchema.safeParse({ base: 'tree', subs: [{ ...sub, id: '' }] }).success).toBe(false)
    expect(lineTypeGroupSchema.safeParse({ base: 'tree', subs: [{ ...sub, name: '' }] }).success).toBe(false)
    expect(
      lineTypeGroupSchema.safeParse({ base: 'tree', subs: [{ ...sub, extra: 1 }] }).success
    ).toBe(false)
  })
})

describe('T3-P5 恒四组强校验 schema（upsertLineTypes 请求面）', () => {
  const g = (base: string, subs: unknown[] = []): unknown => ({ base, subs })

  it('四组各一过（乱序亦过）；缺组/重复组/超集均拒', () => {
    const four = [g('tree'), g('inferred'), g('ref'), g('manual')]
    expect(lineTypeGroupsSchema.safeParse(four).success).toBe(true)
    expect(lineTypeGroupsSchema.safeParse([g('manual'), g('ref'), g('inferred'), g('tree')]).success).toBe(true)
    expect(lineTypeGroupsSchema.safeParse(four.slice(0, 3)).success).toBe(false)
    expect(lineTypeGroupsSchema.safeParse([...four, g('tree')]).success).toBe(false)
    expect(lineTypeGroupsSchema.safeParse([g('tree'), g('tree'), g('ref'), g('manual')]).success).toBe(false)
  })

  it('LINE_TYPE_BASE_ORDER 导出=base 枚举序（tree,inferred,ref,manual）', () => {
    expect(LINE_TYPE_BASE_ORDER).toEqual(['tree', 'inferred', 'ref', 'manual'])
  })
})

describe('T3-P5 lineageOrder 排序契约（唯一纯函数）', () => {
  it('乱序插入归位：year 升序→month 升序→slot 升序（输入序打乱）', () => {
    const ordered = lineageOrder([
      node({ id: 'b', year: 2020, month: 3, slot: 1 }),
      node({ id: 'a', year: 2020, month: 1, slot: 2 }),
      node({ id: 'd', year: 2021, month: null, slot: 1 }),
      node({ id: 'c', year: 2020, month: 3, slot: 0 })
    ])
    expect(ordered.map((n) => n.id)).toEqual(['a', 'c', 'b', 'd'])
  })

  it('null 组末三态：year null 组末；同 year 内 month null 组内末；slot null 末', () => {
    const ordered = lineageOrder([
      node({ id: 'yn', year: null, month: 5, slot: 1 }),
      node({ id: 'mn', year: 2020, month: null, slot: 1 }),
      node({ id: 'sn', year: 2020, month: 5, slot: null }),
      node({ id: 'reg', year: 2020, month: 5, slot: 1 })
    ])
    expect(ordered.map((n) => n.id)).toEqual(['reg', 'sn', 'mn', 'yn'])
  })

  it('行序 tiebreak：year/month/slot 全平 → created_at 升序，再平 → id 升序', () => {
    const ordered = lineageOrder([
      node({ id: 'z-2', year: 2020, month: 1, slot: 1, createdAt: '2026-01-03T00:00:00.000Z' }),
      node({ id: 'a-9', year: 2020, month: 1, slot: 1, createdAt: '2026-01-05T00:00:00.000Z' }),
      node({ id: 'm-1', year: 2020, month: 1, slot: 1, createdAt: '2026-01-05T00:00:00.000Z' }),
      node({ id: 'b-0', year: 2020, month: 1, slot: 1, createdAt: '2026-01-01T00:00:00.000Z' })
    ])
    expect(ordered.map((n) => n.id)).toEqual(['b-0', 'z-2', 'a-9', 'm-1'])
  })

  it('纯函数性质：不改输入数组（新数组返回）+空数组合法', () => {
    const input = [node({ id: 'b', year: 2022, month: 1, slot: 1 }), node({ id: 'a', year: 2023, month: 1, slot: 1 })]
    const snapshot = input.map((n) => n.id)
    const out = lineageOrder(input)
    expect(input.map((n) => n.id)).toEqual(snapshot)
    expect(out).not.toBe(input)
    expect(lineageOrder([])).toEqual([])
  })
})

describe('F-FOLDER-01 节点图归属 folderId（catalogNo 呈现编号退役——编号职责移交 pubNo/INV-92）', () => {
  it('folderId 必填非空：缺失拒、空串拒、合法值过；MAIN_GRAPH_ID 主图锚=__main__', () => {
    expect(() => {
      const { folderId: _omit, ...rest } = node({ id: 'n-1' })
      return lineageNodeSchema.parse(rest)
    }).toThrow()
    expect(lineageNodeSchema.safeParse({ ...node({ id: 'n-1' }), folderId: '' }).success).toBe(false)
    expect(lineageNodeSchema.safeParse({ ...node({ id: 'n-1' }), folderId: 'f-1' }).success).toBe(true)
    expect(MAIN_GRAPH_ID).toBe('__main__')
  })
})
