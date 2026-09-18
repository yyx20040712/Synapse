// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import {
  estimateLinePitch,
  findRangeAtOffset,
  mergeLineRects
} from '../../../src/renderer/features/reader/anchors/annotation-anchor'
import {
  selectionToAnchor,
  verifyQuote
} from '../../../src/renderer/features/reader/anchors/anchor-serialize'
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

/** [F-V1] 紧凑行距夹具（scripts/audits/f-v1-out/f-v1-diag.json 真机实测数字）：
 *  视觉行距 ~11.9px，textLayer span 短盒 h=10 / Range 高盒 h=14.4（y 高 2.4px
 *  ——盒高>行距，相邻行盒 y 区间重叠 2.4px）+ 行界零宽盒 h=21.6@页左缘；
 *  第 5 视觉行为段落末短行（w=138.9，右缘 1249.2）。共 7 个视觉行。 */
function tightRowsFixture(): Array<{ x: number; y: number; w: number; h: number }> {
  return [
    px(1218.5, 564.1, 223.3, 14.4), // 行1 拖选起点段（高盒）
    px(1056.4, 507.6, 0, 21.6), // 行界零宽盒 ×6（页左缘，w=0 下游滤除）
    px(1122.2, 578.4, 319.6, 10), // 行2 短盒
    px(1122.2, 576.0, 319.6, 14.4), // 行2 高盒
    px(1056.4, 523.6, 0, 21.6),
    px(1110.3, 590.4, 331.6, 10), // 行3 短盒
    px(1110.3, 588.0, 331.6, 14.4), // 行3 高盒
    px(1056.4, 539.6, 0, 21.6),
    px(1110.3, 602.3, 331.6, 10), // 行4 短盒
    px(1110.3, 599.9, 331.6, 14.4), // 行4 高盒
    px(1056.4, 555.6, 0, 21.6),
    px(1110.3, 614.3, 138.9, 10), // 行5 短盒（段落末短行）
    px(1110.3, 611.9, 138.9, 14.4), // 行5 高盒
    px(1056.4, 571.6, 0, 21.6),
    px(1122.2, 626.3, 319.6, 10), // 行6 短盒
    px(1122.2, 623.9, 319.6, 14.4), // 行6 高盒
    px(1056.4, 587.6, 0, 21.6),
    px(1110.3, 635.8, 232.1, 14.4) // 行7 拖选终点段（高盒）
  ]
}

/** 修后期望：7 视觉行 → 7 块（y 升序），每块 x=该行片段并集（不跨行取值） */
function expectTightRowsOnePerLine(out: Array<{ x: number; y: number; w: number; h: number }>): void {
  expect(out.length).toBe(7)
  const lefts = [1218.5, 1122.2, 1110.3, 1110.3, 1110.3, 1122.2, 1110.3]
  const rights = [1441.8, 1441.8, 1441.9, 1441.9, 1249.2, 1441.8, 1342.4]
  out.forEach((r, i) => {
    expect(r.x).toBeCloseTo(lefts[i]!, 5)
    expect(r.x + r.w).toBeCloseTo(rights[i]!, 5)
  })
}

// always-active（ADR-0017 裁决 3：新测试不经 guardedDescribe）
describe('F-V1 mergeLineRects —— 紧凑行距（盒高>行距）行簇错联修复', () => {
  it('a: 缺省路径（无行高注入）——y 重叠率判据链并把行 1-4 并成一块（丢行）→ 行距自适应判据后每视觉行恰一块', () => {
    const out = mergeLineRects(tightRowsFixture(), 600).filter((r) => r.w > 0)
    expectTightRowsOnePerLine(out)
    // 短行（行5）右缘不跨行取值：恰为自身行尾 1249.2（修前杂交可到 1441.9/被吞丢行）
    expect(out[4]!.x + out[4]!.w).toBeCloseTo(1249.2, 5)
  })

  it('b: 行高注入（PDF 行高 12.66）——盒高 14.4>行距逐行重叠 2.4px（INV-D 级联下推/带错绑根因）→ 块高钳到行距估计且相邻行块不重叠', () => {
    const out = mergeLineRects(tightRowsFixture(), 600, 12.66).filter((r) => r.w > 0)
    expect(out.length).toBe(7)
    for (const r of out) {
      // 高度钳制：块高 ≤ 行距估计 11.8 + 0.5 容差（修前 14.4）
      expect(r.h).toBeLessThanOrEqual(12.3)
    }
    for (let i = 1; i < out.length; i += 1) {
      // 相邻行块不重叠——下游 INV-D 零驱动，无级联下推（修前逐行重叠 2.4px）
      expect(out[i - 1]!.y + out[i - 1]!.h).toBeLessThanOrEqual(out[i]!.y + 1e-6)
    }
  })

  it('c: 行高量测膨胀（24px）——中心距阈值 12px 把行 1-2/3-5/6-7 并簇（跨行杂交并集+丢行）→ 行距钳制阈值后 7 块', () => {
    const out = mergeLineRects(tightRowsFixture(), 600, 24).filter((r) => r.w > 0)
    expectTightRowsOnePerLine(out)
  })

  it('d: estimateLinePitch——真机流 y 中心差下中位 ≈11.8；单行/同行片段（中心差<2px）→ undefined；常规两行 → 30', () => {
    expect(estimateLinePitch(tightRowsFixture())).toBeCloseTo(11.8, 5)
    expect(estimateLinePitch([px(10, 100, 50, 12)])).toBeUndefined()
    // 同行两片段（y 差 1px）——行内噪声不入行距估计
    expect(estimateLinePitch([px(10, 100, 50, 12), px(60, 101, 40, 10)])).toBeUndefined()
    expect(estimateLinePitch([px(10, 100, 90, 12), px(10, 130, 80, 12)])).toBeCloseTo(30, 5)
  })

  it('e: 常规行距（盒高 12 < 行距 30）行为零变：同簇 y/h 严格取主导，高度钳制不触发', () => {
    const out = mergeLineRects([px(10, 100, 90, 12), px(100, 101, 40, 12)], 600)
    expect(out.length).toBe(1)
    expect(out[0]!.h).toBe(12)
    expect(out[0]!.y).toBe(100)
  })
})

// always-active（F-A6-b2 T3——取证 real3882 step3 sizes 序列交错拆簇在档；先红后绿）
describe('F-A6-b2 mergeLineRects —— y 序交错失联修复（聚类比较扩到全部簇，annotation-merge.ts:26-28 先例语义）', () => {
  it('T3-a 交错夹具：行 1 后段（y=102）被行 2 高瘦段（y=101，h=26 超高度可比带）隔在末簇之后——旧实现（只与末簇比较）拆 3 簇=同行双块锯齿形态，全簇比较后行 1 两段并簇', () => {
    const a1 = px(10, 100, 50, 12) // 行 1 段 1（中心 106）
    const b1 = px(10, 101, 20, 26) // 行 2 高瘦段（中心 114；h=26 > 2×12=24 不可比，独立成簇）
    const a2 = px(70, 102, 40, 10) // 行 1 段 2（中心 107）——y 序排在 b1 后，与末簇（b1）高度不可比
    const out = mergeLineRects([a1, b1, a2], 600)
    expect(out.length).toBe(2)
    // 行 1 两段并簇：x 并集 10..110（锯齿修复面——旧实现行 1 拆 10..60 与 70..110 两块）
    const row1 = out.find((r) => r.h <= 12)!
    expect(row1.x).toBe(10)
    expect(row1.x + row1.w).toBeCloseTo(110, 5)
  })

  it('T3-b 双行交替夹具：行 1/行 2 片段按 y 序交错（a1,b1,b2,a2——行 1 后段殿后），行 2 两段为高度不可比的 tall 变体——全簇比较下 2 块（各行 x 并集），旧实现拆 3 簇（行 1 双块=锯齿）', () => {
    const a1 = px(10, 100, 30, 12) // 行 1 段 1
    const b1 = px(200, 101, 30, 26) // 行 2 tall 段 1
    const a2 = px(50, 102, 30, 10) // 行 1 段 2（y 序殿后——与末簇（行 2）高度不可比）
    const b2 = px(240, 101, 30, 26) // 行 2 tall 段 2（与 b1 同基线——y 序在 a2 前）
    const out = mergeLineRects([a1, b1, a2, b2], 600)
    expect(out.length).toBe(2)
    const row1 = out.find((r) => r.h <= 12)!
    const row2 = out.find((r) => r.h > 12)!
    expect(row1.x).toBe(10)
    expect(row1.x + row1.w).toBeCloseTo(80, 5) // a1∪a2 = 10..80
    expect(row2.x).toBe(200)
    expect(row2.x + row2.w).toBeCloseTo(270, 5) // b1∪b2 = 200..270
  })
})

// always-active（F-A6-b2 门一 W1 回炉——扩簇后「排序保证同簇连续」旧不变量
// 失效的拓扑回归锁：非相邻旧簇并入拉大 groupTop/Bottom 是否影响后续聚类）。
// 机理结论（本用例=守卫，非缺陷修复）：区间膨胀不参与跨行判据——centerOk 门
// 恒为主导矩形口径（区间只喂 yOverlap 分支，该分支仅 pitch 缺省[全部相邻中心
// 差 <2px=单视觉行形态]时启用，含远距行的输入 pitch 恒有定义）；行块垂直分离
// 由 mergeSegment 的 pitch 高度钳制保住（盒高 ≤2×行距时钳到行距）。
describe('F-A6-b2 W1 mergeLineRects —— 扩簇 y 区间膨胀副作用回归', () => {
  it('W1 三行 y 序交错+跨簇中心距：行 1 后段跨过行 2 簇回并行 1（y 序 r1,r2,r3 交错），不产生跨行误并块且行块两两垂直分离（pitch 钳制后）', () => {
    const r1 = px(10, 100, 30, 20) // 行 1 锚（中心 110，h 20）
    const r2 = px(10, 116, 30, 12) // 行 2（中心 122，h 12）
    const r3 = px(60, 101.5, 30, 20) // 行 1 后段（中心 111.5——y 序在 r2 后，跨簇回并 c1）
    const r4 = px(10, 132, 30, 20) // 行 3（中心 142）
    const r5 = px(60, 133, 30, 12) // 行 3 后段（中心 139，就近并入 c3）
    const out = mergeLineRects([r1, r2, r3, r4, r5], 600)
    // 每视觉行恰一块（r3 失联另起簇的旧形态在本夹具为 4 块——T3 侧牙）
    expect(out.length).toBe(3)
    ;[100, 116, 132].forEach((y, i) => expect(out[i]!.y).toBeCloseTo(y, 5))
    // 行归属（x 并集）：行 1 = r1∪r3（跨簇回并）、行 2 = r2 独立（未被行 1/行 3 吸收=无跨行误并）、行 3 = r4∪r5
    expect(out[0]!.x).toBe(10)
    expect(out[0]!.x + out[0]!.w).toBeCloseTo(90, 5)
    expect(out[1]!.x).toBe(10)
    expect(out[1]!.x + out[1]!.w).toBeCloseTo(40, 5)
    expect(out[2]!.x).toBe(10)
    expect(out[2]!.x + out[2]!.w).toBeCloseTo(90, 5)
    // 行块两两垂直分离保持（盒高 20>行距但 ≤2×行距 → pitch 钳制到 10.5）
    for (let i = 1; i < out.length; i += 1) {
      expect(out[i - 1]!.y + out[i - 1]!.h).toBeLessThanOrEqual(out[i]!.y + 1e-6)
    }
  })
})

// always-active（F-A6-c 门二 W2——pitch 缺省+跨行中心距 ≤2px 极限单视觉行形态：
// W1 机理结论未覆盖面[其夹具 pitch 恒有定义]的守卫夹具。守卫非缺陷修复——
// 构造后实测绿，机理在档：此形态 centerLimit=lh（pitch 缺省走 lineH 单门），
// centerOk 对全部矩形恒过（|Δc|≤lh/2）不设防，防线=高度可比带 hComparable
// （[0.5,2]×主导高——高瘦碎片=多行载体[旋转/竖排形态，h≈3.3×行高]在带外）
// ——扩簇比较（F-A6-b2 T3）只在满足判据的簇中取最近，无可满足者新建簇：
// 行簇与高瘦簇互不吸收，无跨视觉行并块）。
describe('F-A6-c W2 mergeLineRects —— pitch 缺省极限形态（单视觉行判定×多行高瘦碎片）守卫', () => {
  it('W2 全部相邻中心差 <2px（pitch 缺省=单视觉行形态判定）但含多行高瘦碎片：行块几何（y/h/x 并集）不含高瘦碎片贡献、高瘦碎片自成块——centerOk（centerLimit=lh）单门不设防时高度可比带挡跨行并块', () => {
    // 行片段（h 12，中心 100/100.25）+高瘦碎片（h 40≈3.3×行高，中心 100/101）
    // ——中心链 100,100,100.25,101 相邻差全 <2px → estimateLinePitch 缺省
    const r1 = px(10, 94, 40, 12) // 行片段 1（y 序 3）
    const r2 = px(60, 94.5, 30, 12) // 行片段 2（y 序 4）
    const t1 = px(100, 80, 10, 40) // 多行高瘦碎片 1（y 序 1——跨 3 行形态）
    const t2 = px(120, 81, 10, 40) // 多行高瘦碎片 2（y 序 2）
    expect(estimateLinePitch([r1, r2, t1, t2])).toBeUndefined() // 形态前提锚：pitch 缺省
    const out = mergeLineRects([r1, r2, t1, t2], 612, 12)
    expect(out.length).toBe(2)
    // y 序输出：高瘦块（y=80）在前、行块（y=94）在后
    const tall = out[0]!
    const row = out[1]!
    // 行块：y/h=行主导矩形原样（未被高瘦碎片抬高/膨胀=无跨行并块）；x 并集
    // 10..90 不含高瘦碎片（100..130）——hComparable 删除（只 centerOk）在此红
    expect(row.y).toBeCloseTo(94, 5)
    expect(row.h).toBeCloseTo(12, 5)
    expect(row.x).toBe(10)
    expect(row.x + row.w).toBeCloseTo(90, 5)
    // 高瘦碎片自成块（y/h 本体——不被行簇吸收钳制）；两碎片 x 间隙 10<簇内
    // 断段阈值（1.5×主导高 40=60）并段
    expect(tall.y).toBeCloseTo(80, 5)
    expect(tall.h).toBeCloseTo(40, 5)
    expect(tall.x).toBe(100)
    expect(tall.x + tall.w).toBeCloseTo(130, 5)
  })
})
