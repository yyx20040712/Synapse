// @vitest-environment jsdom
/**
 * [P7E-03] 页内高亮搜索 —— 纯函数面（reader-search.ts；锁定合约，always-active，
 * 不经 guardedDescribe）。
 *
 * 覆盖：buildPageText 拼接+hasEOL 插行+字符映射（含换行哨兵）；findInText
 * 大小写不敏感/多命中不重叠/itemRanges 归组/CJK 跨 item 命中/跨 '\n' 不命中/
 * 空与纯空白查询空结果；toPageRelative 视口盒→根相对数学；spansForItems
 * 数量符/不符两径（.textLayer 缺席=null）；asSearchDoc unknown→结构收窄；
 * toTextItems 非 str 项过滤（PdfPageCanvas 同款防御）。
 */
import { describe, expect, it } from 'vitest'
import {
  asSearchDoc,
  buildPageText,
  findInText,
  spansForItems,
  toPageRelative,
  toTextItems
} from '../../../src/renderer/features/reader/view/reader-search'
import type { PdfTextItem } from '../../../src/renderer/features/reader/view/PdfPageCanvas'

function item(str: string, hasEOL = false): PdfTextItem {
  return { str, hasEOL, dir: 'ltr', width: 10, height: 10, transform: [1, 0, 0, 1, 0, 0], fontName: 'F1' }
}

/** 视口盒桩（DOMRect 结构子集——toPageRelative 只读 x/y/width/height） */
function rect(x: number, y: number, w: number, h: number): DOMRect {
  return { x, y, width: w, height: h, top: y, left: x, right: x + w, bottom: y + h, toJSON: () => ({}) } as DOMRect
}

describe('P7E-03 reader-search 纯函数 —— buildPageText', () => {
  it('拼接 items.str（保长项安全降小写入索引——门一 N2）；hasEOL 项后插换行；map 逐字符映射且换行位为哨兵', () => {
    const { text, map } = buildPageText([item('AB'), item('C', true), item('D')])
    // N2：索引文本=保长降小写（map 偏移与降值同长，对原文 DOM 同样有效）
    expect(text).toBe('abc\nd')
    // map 与 text 同长（换行占位=哨兵，保证 text 下标可直接查 map）
    expect(map).toHaveLength(text.length)
    expect(map[0]).toEqual({ itemIndex: 0, offsetInItem: 0 })
    expect(map[1]).toEqual({ itemIndex: 0, offsetInItem: 1 })
    expect(map[2]).toEqual({ itemIndex: 1, offsetInItem: 0 })
    // 换行哨兵：hasEOL 项后插入的 '\n' 无 item 归属
    expect(map[3]).toEqual({ itemIndex: -1, offsetInItem: -1 })
    expect(map[4]).toEqual({ itemIndex: 2, offsetInItem: 0 })
  })

  it('空 items 退化：空文本空映射', () => {
    const { text, map } = buildPageText([])
    expect(text).toBe('')
    expect(map).toEqual([])
  })

  it('N2 非保长降小写项（İ 类）：原 str 入索引——降值串不命中（防 map/DOM 偏移错位）', () => {
    const raw = 'smart İ water'
    // 前提自证：İ 降小写展开双码元（locale 无关 toLowerCase），长度不保
    expect(raw.toLowerCase().length).not.toBe(raw.length)
    const page = buildPageText([item(raw)])
    // 该类项不可搜（R2-N2 口径：原 str 入索引——长度守恒偏移有效，但查询侧
    // 恒降小写下永不命中；非保长语料=已知边界）
    expect(page.text).toBe(raw)
    expect(page.map).toHaveLength(raw.length)
    // 降值查询不命中——旧实现双降会产错位区间的假命中，此处为 0
    expect(findInText(page, raw.toLowerCase())).toHaveLength(0)
  })

  it('N2 混合项共存：保长项降值索引+非保长项原 str', () => {
    const page = buildPageText([item('WATER'), item('İX')])
    expect(page.text).toBe('waterİX')
    expect(page.map[4]).toEqual({ itemIndex: 0, offsetInItem: 4 })
    expect(page.map[5]).toEqual({ itemIndex: 1, offsetInItem: 0 })
    expect(findInText(page, 'water')).toHaveLength(1)
    expect(findInText(page, 'WATER')).toHaveLength(1)
  })
})

describe('P7E-03 reader-search 纯函数 —— findInText', () => {
  it('大小写不敏感（查询侧降小写——索引侧已安全降值）+多命中不重叠推进', () => {
    const page = buildPageText([item('Smart WATER smart')])
    const hits = findInText(page, 'SMART')
    expect(hits).toHaveLength(2)
    expect(hits[0]).toMatchObject({ start: 0, end: 5 })
    expect(hits[1]).toMatchObject({ start: 12, end: 17 })
  })

  it('item 内偏移命中：itemRanges 归组为单区间 {itemIndex,s0,s1}', () => {
    const page = buildPageText([item('SMART WATER')])
    const hits = findInText(page, 'art')
    expect(hits).toHaveLength(1)
    expect(hits[0]!.itemRanges).toEqual([{ itemIndex: 0, s0: 2, s1: 5 }])
  })

  it('CJK 跨 item 命中：字符映射跨多个文本项仍单命中多区间', () => {
    const page = buildPageText([item('智'), item('慧'), item('水务管理')])
    const hits = findInText(page, '智慧水务')
    expect(hits).toHaveLength(1)
    expect(hits[0]!.itemRanges).toEqual([
      { itemIndex: 0, s0: 0, s1: 1 },
      { itemIndex: 1, s0: 0, s1: 1 },
      { itemIndex: 2, s0: 0, s1: 2 }
    ])
  })

  it('跨换行不命中（hasEOL 插入的 \n 拒绝行界两侧拼接）；行内命中不受影响', () => {
    const page = buildPageText([item('AB', true), item('CD')])
    expect(findInText(page, 'BC')).toHaveLength(0)
    expect(findInText(page, 'cd')).toHaveLength(1)
  })

  it('空查询与纯空白查询=空结果（调用方拒的双保险）', () => {
    const page = buildPageText([item('SMART')])
    expect(findInText(page, '')).toEqual([])
    expect(findInText(page, '   ')).toEqual([])
  })
})

describe('P7E-03 reader-search 纯函数 —— toPageRelative / spansForItems', () => {
  it('toPageRelative：视口盒减页根盒=页根相对像素（w/h 原样透传）', () => {
    expect(toPageRelative(rect(110, 50, 30, 10), rect(100, 20, 612, 792))).toEqual({ x: 10, y: 30, w: 30, h: 10 })
    expect(toPageRelative(rect(5, 5, 8, 4), rect(5, 5, 612, 792))).toEqual({ x: 0, y: 0, w: 8, h: 4 })
  })

  it('spansForItems：.textLayer span 按序映射；数量不符→null（防御：该页不高亮）', () => {
    const root = document.createElement('div')
    const layer = document.createElement('div')
    layer.className = 'textLayer'
    root.appendChild(layer)
    const spans = ['甲', '乙'].map((t) => {
      const s = document.createElement('span')
      s.textContent = t
      layer.appendChild(s)
      return s
    })
    expect(spansForItems(root, 2)).toEqual(spans)
    expect(spansForItems(root, 3)).toBeNull()
    expect(spansForItems(root, 1)).toBeNull()
    const bare = document.createElement('div')
    expect(spansForItems(bare, 1)).toBeNull()
  })
})

describe('P7E-03 reader-search 纯函数 —— asSearchDoc / toTextItems', () => {
  it('asSearchDoc：unknown→结构收窄（numPages 正整数+getPage 函数）；不符=null', () => {
    expect(asSearchDoc(null)).toBeNull()
    expect(asSearchDoc('doc')).toBeNull()
    expect(asSearchDoc({ numPages: 3 })).toBeNull()
    expect(asSearchDoc({ getPage: (): void => undefined })).toBeNull()
    const doc = { numPages: 2, getPage: async () => ({ getTextContent: async () => ({ items: [] }) }) }
    expect(asSearchDoc(doc)).toBe(doc)
    expect(asSearchDoc({ numPages: 0, getPage: doc.getPage })).toBeNull()
    expect(asSearchDoc({ numPages: 1.5, getPage: doc.getPage })).toBeNull()
  })

  it('toTextItems：过滤无 str 的结构项（marked content）；非数组=空', () => {
    const full = item('A')
    expect(toTextItems([full, { tag: 'MCR' }])).toEqual([full])
    expect(toTextItems([full])).toEqual([full])
    expect(toTextItems('not-array')).toEqual([])
  })
})
