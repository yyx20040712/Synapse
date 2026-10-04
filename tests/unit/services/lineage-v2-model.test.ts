/**
 * [T3-P5] 脉络模型增量 v2 —— zod 单源+lineageOrder 排序契约纯函数（新锁定合约面）。
 *
 * 覆盖：LineageNode month 边界（0/13 拒、1/12 过、null=未定月）/slot（负拒、
 * 0 过、null 兜底）/lineageOrder 排序契约（乱序插入归位+null 组末三态+行序
 * tiebreak）/folderId 必填。
 * [F-LGRAPH-01②U8] kind 四值枚举/LineageEdge sub/LineTypeSub·LineTypeGroup/
 * 恒四组 schema 用例随四值体系退役删除（替代断言面=lineage-u8-linetype.test.ts
 * ——dashed/color 内联+色板常量+lineTypeNamesSchema 恰 6）。
 * 真相源=docs/design/2026-09-27_t3p5-lineage-data-layer-design-final.md §1/§4
 * +2026-10-01_f-lgraph01-editor-design-final.md §1（U8 重整）。
 * always-active（不经 guardedDescribe）。
 */
import { describe, expect, it } from 'vitest'
import {
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
    year: null,
    x: null,
    y: null,
    month: null,
    slot: null,
    folderId: MAIN_GRAPH_ID,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: 't',
    ...patch
  }
}

describe('T3-P5 LineageNode month/slot（zod 边界）', () => {
  const base = {
    id: 'n-1',
    paperId: null,
    title: '节点',
    year: 2023,
    x: null,
    y: null,
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
