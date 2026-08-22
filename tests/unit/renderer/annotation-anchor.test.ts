// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest'
import {
  findRangeAtOffset,
  rectsFromRange,
  selectionToAnchor,
  verifyQuote
} from '../../../src/renderer/features/reader/annotation-anchor'
import { guardedDescribe } from '../../utils/guard'

/** 构造多文本节点的页根：<p>前文</p><p>中段正文</p><p>后文</p> */
function buildPage(): HTMLElement {
  const root = document.createElement('div')
  const p1 = document.createElement('p')
  p1.textContent = '前文第一段'
  const p2 = document.createElement('p')
  p2.textContent = '中段正文内容'
  const p3 = document.createElement('p')
  p3.textContent = '后文第三段'
  root.append(p1, p2, p3)
  return root
}

guardedDescribe('SR-RDR-01', 'annotation-anchor —— 文本偏移↔DOM 定位', () => {
  it('findRangeAtOffset：命中中段文本（跨节点累计偏移）', () => {
    const root = buildPage()
    // 偏移 7~9 应落在第二段 "正文" 两字（"中段正文内容" 的 2~4）
    const r = findRangeAtOffset(root, 7, 9)
    expect(r).not.toBeNull()
    // textNodes 至少记录一个命中节点
    expect(r!.textNodes.length).toBeGreaterThanOrEqual(1)
  })

  it('findRangeAtOffset：越界返回 null', () => {
    const root = buildPage()
    expect(findRangeAtOffset(root, 999, 1000)).toBeNull()
    expect(findRangeAtOffset(root, 5, 3)).toBeNull() // start>end
  })

  it('findRangeAtOffset：跨节点区间（跨 <p>）能命中两个文本节点', () => {
    const root = buildPage()
    // "一段" 结尾（4~6?）跨到下一段开头：取 4~8（跨第一段末尾与第二段开头）
    const r = findRangeAtOffset(root, 4, 8)
    expect(r).not.toBeNull()
    expect(r!.textNodes.length).toBe(2)
  })

  it('verifyQuote：前缀/引文/后缀全部吻合 → 返回原偏移', () => {
    const root = buildPage()
    const at = verifyQuote(root, { prefix: '中段', quote: '正文', suffix: '内容', start: 7 })
    expect(at).toBe(7)
  })

  it('verifyQuote：前部插入文本后仍能重定位（textQuote 自愈）', () => {
    const root = buildPage()
    // 在最前面插入两个字，原 start=7 的位置漂移为 9
    const p0 = document.createElement('p')
    p0.textContent = '插字'
    root.prepend(p0)
    const at = verifyQuote(root, { prefix: '中段', quote: '正文', suffix: '内容', start: 7 })
    expect(at).toBe(9)
  })

  it('verifyQuote：引文不存在 → null', () => {
    const root = buildPage()
    expect(verifyQuote(root, { prefix: 'x', quote: '不存在的引文', suffix: 'y', start: 0 })).toBeNull()
  })

  it('rectsFromRange：返回归一化矩形（0..1）', () => {
    const root = buildPage()
    const r = findRangeAtOffset(root, 0, 2)
    expect(r).not.toBeNull()
    const rects = rectsFromRange(r!, { w: 612, h: 792 })
    expect(rects.length).toBeGreaterThanOrEqual(1)
    for (const rect of rects) {
      expect(rect.x).toBeGreaterThanOrEqual(0)
      expect(rect.x + rect.w).toBeLessThanOrEqual(1.0001)
      expect(rect.y).toBeGreaterThanOrEqual(0)
      expect(rect.y + rect.h).toBeLessThanOrEqual(1.0001)
    }
  })

  // selectionToAnchor 需要 Selection API：jsdom 要求选区相关节点挂在文档上才可靠
  afterEach(() => {
    document.getSelection()?.removeAllRanges()
    document.body.replaceChildren()
  })

  it('selectionToAnchor：文本节点边界 → start/end/quote/prefix/suffix', () => {
    const root = buildPage()
    document.body.append(root)
    const p2Text = (root.children[1]!).firstChild as Text
    const sel = document.getSelection()
    const range = document.createRange()
    range.setStart(p2Text, 2) // "正文" 之前是 "中段"
    range.setEnd(p2Text, 4)
    sel?.removeAllRanges()
    sel?.addRange(range)
    const a = selectionToAnchor(root, sel as Selection)
    expect(a).not.toBeNull()
    expect(a!.start).toBe(7)
    expect(a!.end).toBe(9)
    expect(a!.quote).toBe('正文')
    // CONTEXT_CHARS=32 大于页内全文，prefix/suffix 覆盖到页首/页尾
    expect(a!.prefix).toBe('前文第一段中段')
    expect(a!.suffix).toBe('内容后文第三段')
    expect(a!.rects.length).toBeGreaterThanOrEqual(1)
  })

  it('selectionToAnchor：元素边界（offset 是子节点索引）同样成立', () => {
    const root = buildPage()
    document.body.append(root)
    const p2 = root.children[1]!
    const sel = document.getSelection()
    const range = document.createRange()
    range.setStart(p2, 0)
    range.setEnd(p2, p2.childNodes.length)
    sel?.removeAllRanges()
    sel?.addRange(range)
    const a = selectionToAnchor(root, sel as Selection)
    expect(a).not.toBeNull()
    expect(a!.start).toBe(5)
    expect(a!.end).toBe(11)
    expect(a!.quote).toBe('中段正文内容')
  })

  it('selectionToAnchor：选区跨出 root → null（跨页/页外不算本页锚定）', () => {
    const root = buildPage()
    const outside = document.createElement('p')
    outside.textContent = '外部文本'
    document.body.append(root, outside)
    const sel = document.getSelection()
    const range = document.createRange()
    range.setStart(outside.firstChild as Text, 0)
    range.setEnd((root.children[1]!).firstChild as Text, 2)
    sel?.removeAllRanges()
    sel?.addRange(range)
    expect(selectionToAnchor(root, sel as Selection)).toBeNull()
  })

  it('selectionToAnchor：collapsed / 空 rangeCount → null', () => {
    const root = buildPage()
    document.body.append(root)
    const sel = document.getSelection()
    const range = document.createRange()
    range.setStart((root.children[0]!).firstChild as Text, 1)
    range.collapse(true)
    sel?.removeAllRanges()
    sel?.addRange(range)
    expect(selectionToAnchor(root, sel as Selection)).toBeNull()
  })
})
