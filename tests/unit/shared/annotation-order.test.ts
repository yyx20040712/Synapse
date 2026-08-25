/**
 * [SR2-C-01] annotation-order —— 片段序单源（测试：锁定合约）
 *
 * 覆盖：跨页序/同页偏移序/同偏移创建序/id 兜底全序/入参不可变/字符串字典序
 * 反例（INV-24 核心条款——排序禁字符串字典序比较）/sortKeyOf 显示形态。
 */
import { expect, it } from 'vitest'
import {
  compareAnnotations,
  sortByDocumentOrder,
  sortKeyOf
} from '../../../src/shared/annotation-order'
import type { Annotation } from '../../../src/shared/models/annotation'
import { guardedDescribe } from '../../utils/guard'

/** 最小合法标注工厂（仅排序相关字段可变，其余固定） */
function ann(over: Partial<Annotation>): Annotation {
  return {
    id: 'a-x',
    paperId: 'p-1',
    page: 0,
    kind: 'highlight',
    color: 'yellow',
    quoteText: 'q',
    prefixText: '',
    suffixText: '',
    startOffset: 0,
    endOffset: 1,
    rects: [],
    comment: '',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...over
  }
}

guardedDescribe('SR2-C-01', 'annotation-order —— 片段序单源（页→偏移→创建序→id）', () => {
  it('跨页序：page 数值升序（0 < 2 < 10）', () => {
    const a = ann({ id: 'a-10', page: 10 })
    const b = ann({ id: 'a-2', page: 2 })
    const c = ann({ id: 'a-0', page: 0 })
    expect(sortByDocumentOrder([a, b, c]).map((x) => x.id)).toEqual(['a-0', 'a-2', 'a-10'])
  })

  it('同页偏移序：startOffset 升序', () => {
    const late = ann({ id: 'off-99', startOffset: 99 })
    const early = ann({ id: 'off-5', startOffset: 5 })
    expect(sortByDocumentOrder([late, early]).map((x) => x.id)).toEqual(['off-5', 'off-99'])
  })

  it('同段创建序：同页同偏移按 createdAt 升序（ROADMAP 验收「同段创建序」）', () => {
    const newer = ann({ id: 'new', createdAt: '2026-06-02T00:00:00Z' })
    const older = ann({ id: 'old', createdAt: '2026-06-01T00:00:00Z' })
    expect(sortByDocumentOrder([newer, older]).map((x) => x.id)).toEqual(['old', 'new'])
  })

  it('id 兜底：四键全等时按 id 字典序，全序确定永无相等歧义', () => {
    const b = ann({ id: 'b' })
    const a = ann({ id: 'a' })
    expect(compareAnnotations(a, b)).toBe(-1)
    expect(compareAnnotations(b, a)).toBe(1)
    expect(compareAnnotations(a, a)).toBe(0)
  })

  it('入参不可变：sortByDocumentOrder 返回新数组，原数组保持原序（禁污染 TabState 引用语义）', () => {
    const src = [ann({ id: 'z', page: 9 }), ann({ id: 'a', page: 1 })]
    const snapshot = [...src]
    const out = sortByDocumentOrder(src)
    expect(src).toEqual(snapshot)
    expect(out).not.toBe(src)
    expect(out.map((x) => x.id)).toEqual(['a', 'z'])
  })

  it('INV-24 字符串字典序反例：page 2 与 10 的序必须按数值（"10:2"<"2:1" 字典序为真——字符串形态仅显示用）', () => {
    const p2 = ann({ id: 'p2', page: 2, startOffset: 1 })
    const p10 = ann({ id: 'p10', page: 10, startOffset: 2 })
    // 字符串形态如实展示（1 基页码，与 corpus p.N 同口径；不作比较依据）
    expect(sortKeyOf(p2)).toBe('3:1')
    expect(sortKeyOf(p10)).toBe('11:2')
    // 数值序：page 2 在 page 10 前（字符串字典序会给出相反结果）
    expect(compareAnnotations(p2, p10)).toBeLessThan(0)
    expect(sortByDocumentOrder([p10, p2]).map((x) => x.id)).toEqual(['p2', 'p10'])
  })
})
