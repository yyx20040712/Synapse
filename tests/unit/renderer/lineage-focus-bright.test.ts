/**
 * [F-VISFB-21 C4] focus-bright 纯函数——bright=focusSet∪双向一度邻接 单源锚。
 *
 * - 判定集单源（任务书 §5-21 主控裁决 b）：edge 的 from/to 任一端∈focusSet
 *   则另一端入 bright；卡 dim=非 bright 卡；边 dim=两端均非 bright 才 dim
 *   （至少一端 bright 保持常亮）。dim 强度/类名零改（CSS 面）——本件只锁
 *   判定集数学。always-active 裸 describe（K3）。
 */
import { describe, expect, it } from 'vitest'
import { focusBrightSet, isEdgeDimmed } from '../../../src/renderer/features/lineage/focus-bright'

function e(from: string, to: string): { fromNode: string; toNode: string } {
  return { fromNode: from, toNode: to }
}

describe('F-VISFB-21 C4 focus-bright（bright=focus∪双向一度邻接）', () => {
  it('基本型：focus={A}+边 A→B、B→C → bright={A,B}（一度邻接入集，二度 C 不入）', () => {
    const bright = focusBrightSet([e('A', 'B'), e('B', 'C')], ['A'])
    expect([...bright].sort()).toEqual(['A', 'B'])
    expect(bright.has('C')).toBe(false)
  })

  it('无边纯 focus：bright=focusSet 原样（多成员全保留）', () => {
    const bright = focusBrightSet([], ['A', 'X'])
    expect([...bright].sort()).toEqual(['A', 'X'])
  })

  it('双向邻接：边 A→B（from=A），focus 含 B（to 端）→ A 亮（from/to 任一端∈focus 即另一端入集）', () => {
    const bright = focusBrightSet([e('A', 'B')], ['B'])
    expect(bright.has('A')).toBe(true)
    expect(bright.has('B')).toBe(true)
  })

  it('边判定：两端均非 bright 才 dim——至少一端 bright 保持常亮（三态各锚）', () => {
    const bright = focusBrightSet([e('A', 'B')], ['A']) // bright={A,B}
    expect(isEdgeDimmed(e('A', 'C'), bright)).toBe(false) // from 端 bright
    expect(isEdgeDimmed(e('C', 'B'), bright)).toBe(false) // to 端 bright
    expect(isEdgeDimmed(e('C', 'D'), bright)).toBe(true) // 两端均非 bright
  })

  it('空 focus（防御锚）：bright=空集（dim 激活闸=消费面 dimActive 集非空——本函数不闸）', () => {
    const bright = focusBrightSet([e('A', 'B')], [])
    expect(bright.size).toBe(0)
  })
})
