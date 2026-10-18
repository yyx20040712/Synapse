/**
 * [F-VISFB-66 单元一] validateLineageAnchor 判别联合 + 边锚 schema 形状锁
 * （设计书 v1.2 §D.2/§D.5；终裁采纳清单 12）。always-active。
 */
import { describe, expect, it } from 'vitest'
import {
  lineageEdgeSchema,
  lineageEdgeUpsertSchema,
  validateLineageAnchor
} from '../../../src/shared/models/lineage'

const edgeBase = {
  id: 'e1',
  fromNode: 'a',
  toNode: 'b',
  label: '',
  dashed: false,
  color: '#1e3a8a',
  createdAt: 't',
  updatedAt: 't'
}

describe('F-VISFB-66·validateLineageAnchor（判别联合）', () => {
  it('合法锚：四 side×slot 0 过检（ok:true+value 原样）', () => {
    for (const side of ['top', 'bottom', 'left', 'right'] as const) {
      const r = validateLineageAnchor({ side, slot: 0 })
      expect(r).toEqual({ ok: true, value: { side, slot: 0 } })
    }
  })

  it('合法锚：slot 1/2 过检（0|1|2 域）', () => {
    for (const slot of [1, 2] as const) {
      expect(validateLineageAnchor({ side: 'top', slot })).toEqual({
        ok: true,
        value: { side: 'top', slot }
      })
    }
  })

  it('shape 格：非对象/缺字段→reason shape', () => {
    expect(validateLineageAnchor(null)).toEqual({ ok: false, reason: 'shape' })
    expect(validateLineageAnchor('top0')).toEqual({ ok: false, reason: 'shape' })
    expect(validateLineageAnchor({})).toEqual({ ok: false, reason: 'shape' })
    expect(validateLineageAnchor({ side: 'top' })).toEqual({ ok: false, reason: 'shape' })
    expect(validateLineageAnchor({ slot: 0 })).toEqual({ ok: false, reason: 'shape' })
  })

  it('side 格：四值域外→reason side', () => {
    expect(validateLineageAnchor({ side: 'leftt', slot: 0 })).toEqual({ ok: false, reason: 'side' })
    expect(validateLineageAnchor({ side: 'TOP', slot: 0 })).toEqual({ ok: false, reason: 'side' })
    expect(validateLineageAnchor({ side: 'up', slot: 0 })).toEqual({ ok: false, reason: 'side' })
  })

  it('slot 格：非 0|1|2 整数→reason slot', () => {
    expect(validateLineageAnchor({ side: 'top', slot: 3 })).toEqual({ ok: false, reason: 'slot' })
    expect(validateLineageAnchor({ side: 'top', slot: -1 })).toEqual({ ok: false, reason: 'slot' })
    expect(validateLineageAnchor({ side: 'top', slot: 1.5 })).toEqual({ ok: false, reason: 'slot' })
    expect(validateLineageAnchor({ side: 'top', slot: '1' })).toEqual({ ok: false, reason: 'slot' })
  })
})

describe('F-VISFB-66·边锚 schema 形状（读模型 optional/upsert 可空）', () => {
  it('lineageEdgeSchema：fromAnchor/toAnchor 可选透传（未钉定=缺省 undefined）', () => {
    const plain = lineageEdgeSchema.parse(edgeBase)
    expect(plain.fromAnchor).toBeUndefined()
    expect(plain.toAnchor).toBeUndefined()
    const pinned = lineageEdgeSchema.parse({
      ...edgeBase,
      fromAnchor: { side: 'bottom', slot: 2 }
    })
    expect(pinned.fromAnchor).toEqual({ side: 'bottom', slot: 2 })
  })

  it('lineageEdgeUpsertSchema：锚三态形（缺省/ null=清除/ 值）+via 可空扩面', () => {
    expect(lineageEdgeUpsertSchema.safeParse({ fromNode: 'a', toNode: 'b', label: '' }).success).toBe(true)
    expect(
      lineageEdgeUpsertSchema.safeParse({
        fromNode: 'a',
        toNode: 'b',
        label: '',
        fromAnchor: null,
        toAnchor: null,
        via: null
      }).success
    ).toBe(true)
    expect(
      lineageEdgeUpsertSchema.safeParse({
        fromNode: 'a',
        toNode: 'b',
        label: '',
        fromAnchor: { side: 'left', slot: 1 },
        toAnchor: { side: 'right', slot: 0 }
      }).success
    ).toBe(true)
  })
})
