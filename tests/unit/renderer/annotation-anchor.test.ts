// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest'
import {
  findRangeAtOffset,
  mergeLineRects,
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

/** 合成像素矩形（mergeLineRects 纯函数用例：jsdom 无布局，不经 DOM 量测） */
function px(x: number, y: number, w: number, h: number): { x: number; y: number; w: number; h: number } {
  return { x, y, w, h }
}

guardedDescribe('SR-RDR-01', 'mergeLineRects —— clientRects 行级合并', () => {
  it('同行两片段（y 重叠、x 相邻）合并为一个矩形：x 并集、y/h 取主导（面积最大者）', () => {
    const out = mergeLineRects([px(10, 100, 50, 12), px(60, 101, 40, 10)], 600)
    expect(out.length).toBe(1)
    expect(out[0]!.x).toBe(10)
    expect(out[0]!.w).toBe(90) // 10..100 并集
    expect(out[0]!.y).toBe(100) // 主导 = 50×12 首矩形
    expect(out[0]!.h).toBe(12)
  })

  it('不同行（y 区间不重叠）不合并：两矩形按 y 升序输出', () => {
    const out = mergeLineRects([px(10, 130, 80, 12), px(10, 100, 90, 12)], 600)
    expect(out.length).toBe(2)
    expect(out[0]!.y).toBe(100)
    expect(out[1]!.y).toBe(130)
  })

  it('同行大 x 间隙断段（防多栏桥接）：间隙 > max(1.5×主导高, 页宽 2%) 处分开', () => {
    // 主导高 12 → 1.5×12=18 > 600×2%=12 → 阈值 18；间隙 100 > 18 必断
    const out = mergeLineRects([px(10, 100, 90, 12), px(200, 100, 60, 12)], 600)
    expect(out.length).toBe(2)
    expect(out[0]!.x).toBe(10)
    expect(out[1]!.x).toBe(200)
    // 对照：间隙 8 ≤ 18 不断段（同一行连续文本）
    const joined = mergeLineRects([px(10, 100, 90, 12), px(108, 100, 42, 12)], 600)
    expect(joined.length).toBe(1)
    expect(joined[0]!.w).toBe(140)
  })

  it('同形重复矩形（亚像素量测差）去重', () => {
    const out = mergeLineRects([px(10, 100, 50, 12), px(10.2, 100.1, 50, 12)], 600)
    expect(out.length).toBe(1)
  })

  it('高瘦矩形（旋转/竖排形态，h 超主导高 2 倍）不并入行簇：独立成簇输出', () => {
    const tall = px(300, 100, 10, 80) // h=80，行高 12 的 6.7 倍
    const line1 = px(10, 110, 90, 12) // y 与 tall 区间重叠但高度不可比
    const out = mergeLineRects([tall, line1], 600)
    expect(out.length).toBe(2)
    const tallOut = out.find((r) => r.h === 80)
    const lineOut = out.find((r) => r.h === 12)
    expect(tallOut).toBeDefined() // 高瘦矩形保持自身几何，未被行簇 y/h 吞并
    expect(lineOut!.y).toBe(110)
    expect(lineOut!.w).toBe(90)
  })

  it('混排字号同行（上标 h=8 vs 主文本 h=12）同簇合并，y/h 取主导', () => {
    const out = mergeLineRects([px(10, 100, 60, 12), px(70, 103, 10, 8)], 600)
    expect(out.length).toBe(1)
    expect(out[0]!.w).toBe(70) // 10..80
    expect(out[0]!.y).toBe(100)
    expect(out[0]!.h).toBe(12) // 主导（60×12 > 10×8）
  })

  it('相邻行亚像素重叠（紧行距舍入，重叠 <25% 较小高度）不并簇', () => {
    // 行盒 h=12、行间重叠 1.2px（重叠率 0.1）：同行片段重叠率近 1，判别带清晰
    const out = mergeLineRects([px(10, 100, 90, 12), px(10, 111.2, 80, 12)], 600)
    expect(out.length).toBe(2)
    expect(out[0]!.y).toBe(100)
    expect(out[1]!.y).toBeCloseTo(111.2, 5)
  })

  it('单矩形与空数组透传', () => {
    expect(mergeLineRects([], 600)).toEqual([])
    const one = px(5, 5, 5, 5)
    expect(mergeLineRects([one], 600)).toEqual([one])
  })
})
