/**
 * [F-VISFB-66 单元一] 锚 id↔AnchorRef 映射 helper 往返 12 格（4 side×3 slot）
 * ——设计书 v1.2 §D.2（anchorIdOf/parseAnchorId；N-03r2）。always-active。
 */
import { describe, expect, it } from 'vitest'
import { anchorIdOf, parseAnchorId, type Side } from '../../../src/renderer/features/lineage/routing/anchors'

describe('F-VISFB-66·anchorIdOf/parseAnchorId 往返（12 锚体系）', () => {
  const LETTERS: Record<Side, string> = { top: 't', bottom: 'b', left: 'l', right: 'r' }

  it.each(['top', 'bottom', 'left', 'right'])('side=%s：slot 0/1/2 id 形如 card:t0 与 parse 往返', (rawSide: string) => {
    const side = rawSide as Side
    for (const slot of [0, 1, 2] as const) {
      const id = anchorIdOf('cardA', { side, slot })
      expect(id).toBe(`cardA:${LETTERS[side]}${slot}`)
      const parsed = parseAnchorId(id)
      expect(parsed).toEqual({ cardId: 'cardA', side, slot })
    }
  })

  it('非法 id：null（非锚 id 形/字母域外/序越界）', () => {
    expect(parseAnchorId('cardA')).toBeNull()
    expect(parseAnchorId('cardA:')).toBeNull()
    expect(parseAnchorId('cardA:x0')).toBeNull()
    expect(parseAnchorId('cardA:t3')).toBeNull()
    expect(parseAnchorId('cardA:t')).toBeNull()
    expect(parseAnchorId('t0')).toBeNull()
  })
})

describe('F-VISFB-66·[定点修] 含冒号 nodeId 往返（末次冒号切分——INV-120 anchorMarks 同律）', () => {
  it('card:scope:t0 形 parse 取 cardId=card:scope（多冒号 nodeId 容忍）', () => {
    const id = anchorIdOf('card:scope', { side: 'left', slot: 1 })
    expect(id).toBe('card:scope:l1')
    expect(parseAnchorId(id)).toEqual({ cardId: 'card:scope', side: 'left', slot: 1 })
    expect(parseAnchorId('a:b:c:r2')).toEqual({ cardId: 'a:b:c', side: 'right', slot: 2 })
    expect(parseAnchorId('a::t0')).toEqual({ cardId: 'a:', side: 'top', slot: 0 })
  })
})
