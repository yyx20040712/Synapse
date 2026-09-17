// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { stubRectOf } from '../../utils/geometry'
import { selectionToAnchor } from '../../../src/renderer/features/reader/anchor-serialize'
import type { SelectionAnchor } from '../../../src/renderer/features/reader/anchor-serialize'

/**
 * F-A10 划选段末空白 affinity——pdf.js 行 break 标记（<br role=presentation>，
 * 零宽×~2 行高盒、x 在栏左缘）与纯空白项 span 是行尾/段首空白区的吸附槽，
 * 其 DOM 序（=内容流序）≠视觉序：边界按 DOM 槽位起算会视觉跳跃（真机实证：
 * 段末行尾空白点击→终点跳回 7 行前=丢下半段；img2=跳过下一段前数行）。
 * 归一化=按标记形态重解析到本栏本行文本边界。always-active（三屋派发条款）。
 */

interface Box { top: number; bottom: number; left: number; right: number }


/** 造一个 pdf.js 文本层形态的 span（文本+量测盒） */
function mkSpan(text: string, b: Box): HTMLSpanElement {
  const s = document.createElement('span')
  s.textContent = text
  stubRectOf(s, b)
  return s
}

/** 造一个 pdf.js 行 break 标记（零宽×2 行高×栏左缘——真机 diag3 实测形态） */
function mkBr(b: Box): HTMLBRElement {
  const br = document.createElement('br')
  br.setAttribute('role', 'presentation')
  stubRectOf(br, b)
  return br
}

function anchorOf(root: HTMLElement, from: { node: Node; offset: number }, to: { node: Node; offset: number }): SelectionAnchor | null {
  const sel = document.getSelection()
  const range = document.createRange()
  range.setStart(from.node, from.offset)
  range.setEnd(to.node, to.offset)
  sel?.removeAllRanges()
  sel?.addRange(range)
  return selectionToAnchor(root, sel as Selection)
}

afterEach(() => {
  document.getSelection()?.removeAllRanges()
  document.body.replaceChildren()
})

describe('F-A10 段末空白 affinity（anchor-blank-snap 归一化）', () => {
  it('行尾空白命中（br 槽位 DOM 序早于本行文本）→ 终点=本栏本行行尾，不下探下一段', () => {
    // 视觉：row1「AB first」；row2 本栏「CD second」+对栏「R2 tail」；row3「EF third」。
    // br1 盒=零宽×2 行高、x 在栏左缘（真机形态），DOM 槽在 row2 文本前
    const root = document.createElement('div')
    const s1 = mkSpan('AB first', { top: 100, bottom: 110, left: 10, right: 80 })
    const br1 = mkBr({ top: 118, bottom: 138, left: 5, right: 5 })
    const s2 = mkSpan('CD second', { top: 120, bottom: 130, left: 10, right: 70 })
    const c2 = mkSpan('R2 tail', { top: 120, bottom: 130, left: 150, right: 240 })
    const s3 = mkSpan('EF third', { top: 140, bottom: 150, left: 10, right: 70 })
    root.append(s1, br1, s2, c2, s3)
    document.body.append(root)
    // 浏览器把行尾空白点击解析为 (textLayer, slotBeforeBr)——元素槽位
    const a = anchorOf(root, { node: s1.firstChild!, offset: 0 }, { node: root, offset: 1 })
    expect(a).not.toBeNull()
    // 未归一化时终点=槽位前文本（8=丢掉 row2）；归一化后=本栏 row2 行尾（17）
    expect(a!.end).toBe(17)
    expect(a!.quote).toBe('AB firstCD second')
    expect(a!.quote).not.toContain('EF')
    expect(a!.quote).not.toContain('R2')
  })

  it('img2 形态（br 槽位 DOM 序晚于下段文本，盒带覆盖段末行）→ 终点回本栏本行行尾，下一段不带上', () => {
    // 视觉：row1「AB first」；row2「CD second」；row3「EF third」。br2 盒带覆盖 row1
    const root = document.createElement('div')
    const s1 = mkSpan('AB first', { top: 100, bottom: 110, left: 10, right: 80 })
    const s2 = mkSpan('CD second', { top: 120, bottom: 130, left: 10, right: 70 })
    const s3 = mkSpan('EF third', { top: 140, bottom: 150, left: 10, right: 70 })
    const br2 = mkBr({ top: 98, bottom: 118, left: 5, right: 5 })
    root.append(s1, s2, s3, br2)
    document.body.append(root)
    const a = anchorOf(root, { node: s1.firstChild!, offset: 0 }, { node: root, offset: 3 })
    expect(a).not.toBeNull()
    // 未归一化时终点=25（槽位前全部文本=把 row2/row3 整段带上）；归一化后=8
    expect(a!.end).toBe(8)
    expect(a!.quote).toBe('AB first')
    expect(a!.quote).not.toContain('CD')
  })

  it('起点对称（起点落在段首缩进空白标记 span 的文本位，DOM 序夹在早文档/晚视觉文本间）→ 起点前移到本行首字符，quote 无前导空白', () => {
    // 视觉：row1「AB」；row3「EF」；row2 行首缩进空白（E3=纯空白项 span）+「CD second」。
    // DOM 序（=内容流序）：s1, s3, e3, s2——e3 的 DOM 槽早于同视觉行的 s2
    const root = document.createElement('div')
    const s1 = mkSpan('AB', { top: 100, bottom: 110, left: 10, right: 30 })
    const s3 = mkSpan('EF', { top: 140, bottom: 150, left: 10, right: 30 })
    const e3 = mkSpan(' ', { top: 120, bottom: 130, left: 10, right: 16 })
    const s2 = mkSpan('CD second', { top: 120, bottom: 130, left: 16, right: 86 })
    root.append(s1, s3, e3, s2)
    document.body.append(root)
    // 起点落在缩进空白的文本位（ws-only span 的 Text 内）——未归一化起点含空白（quote 前导空格=落库指纹形态）
    const a = anchorOf(root, { node: e3.firstChild!, offset: 0 }, { node: s2.firstChild!, offset: 9 })
    expect(a).not.toBeNull()
    expect(a!.start).toBe(5)
    expect(a!.quote).toBe('CD second')
  })

  it('词间空格划选零变（文本位在非空白 span 内）→ quote 前导空格保留', () => {
    const root = document.createElement('div')
    const s = mkSpan('foo bar baz', { top: 100, bottom: 110, left: 10, right: 90 })
    root.append(s)
    document.body.append(root)
    const a = anchorOf(root, { node: s.firstChild!, offset: 3 }, { node: s.firstChild!, offset: 11 })
    expect(a).not.toBeNull()
    expect(a!.quote).toBe(' bar baz')
  })

  it('栏间空白：span 标记盒在栏间槽位 → 吸附左栏行尾；文本位命中右栏首字符 → 零变', () => {
    const root = document.createElement('div')
    const c1 = mkSpan('L1 tail', { top: 100, bottom: 110, left: 10, right: 100 })
    const c2 = mkSpan('R2 head', { top: 100, bottom: 110, left: 150, right: 240 })
    const e4 = mkSpan('', { top: 100, bottom: 110, left: 125, right: 125 })
    root.append(c1, c2, e4)
    document.body.append(root)
    // ①元素槽位（栏间标记）→ 左栏行尾
    const a1 = anchorOf(root, { node: c1.firstChild!, offset: 0 }, { node: root, offset: 2 })
    expect(a1).not.toBeNull()
    expect(a1!.end).toBe(7)
    expect(a1!.quote).toBe('L1 tail')
    // ②文本位（右栏首字符）→ 保持原生语义
    const a2 = anchorOf(root, { node: c1.firstChild!, offset: 0 }, { node: c2.firstChild!, offset: 3 })
    expect(a2).not.toBeNull()
    expect(a2!.quote).toBe('L1 tailR2 ')
  })

  it('无布局量测（jsdom 未打桩=含原点四零盒）→ 行为零变（未归一化原样）', () => {
    const root = document.createElement('div')
    const s1 = document.createElement('span')
    s1.textContent = 'AB first'
    const br1 = document.createElement('br') // 行 break 标记，无量测
    const s2 = document.createElement('span')
    s2.textContent = 'CD second'
    const s3 = document.createElement('span')
    s3.textContent = 'EF third'
    root.append(s1, br1, s2, s3)
    document.body.append(root)
    const a = anchorOf(root, { node: s1.firstChild!, offset: 0 }, { node: root, offset: 1 })
    expect(a).not.toBeNull()
    expect(a!.end).toBe(8)
    expect(a!.quote).toBe('AB first')
  })

  it('槽位两侧均非空白标记（普通文本 span 边界）→ 零变', () => {
    const root = document.createElement('div')
    const s1 = mkSpan('AB first', { top: 100, bottom: 110, left: 10, right: 80 })
    const s2 = mkSpan('CD second', { top: 120, bottom: 130, left: 10, right: 70 })
    root.append(s1, s2)
    document.body.append(root)
    const a = anchorOf(root, { node: s1.firstChild!, offset: 0 }, { node: root, offset: 2 })
    expect(a).not.toBeNull()
    expect(a!.quote).toBe('AB firstCD second')
  })

  it('零尺寸真标记（真浏览器空 span 形态：w=0/h=0 但原点真实）→ 归一化照常生效', () => {
    const root = document.createElement('div')
    const s1 = mkSpan('AB first', { top: 100, bottom: 110, left: 10, right: 80 })
    const e5 = mkSpan('', { top: 120, bottom: 120, left: 90, right: 90 })
    const s2 = mkSpan('CD second', { top: 120, bottom: 130, left: 10, right: 70 })
    const s3 = mkSpan('EF third', { top: 140, bottom: 150, left: 10, right: 70 })
    root.append(s1, e5, s2, s3)
    document.body.append(root)
    const a = anchorOf(root, { node: s1.firstChild!, offset: 0 }, { node: root, offset: 1 })
    expect(a).not.toBeNull()
    expect(a!.end).toBe(17)
    expect(a!.quote).toBe('AB firstCD second')
  })

  it('br 槽位双栏行：吸附距 br 最近的栏组行尾，不跨栏吸附对栏', () => {
    // 双栏同视觉行：本栏「CD se」(x10-70)，对栏「R2 tail」(x150-240)；br 在左缘 x5
    const root = document.createElement('div')
    const s1 = mkSpan('AB first', { top: 100, bottom: 110, left: 10, right: 80 })
    const br1 = mkBr({ top: 118, bottom: 138, left: 5, right: 5 })
    const s2 = mkSpan('CD se', { top: 120, bottom: 130, left: 10, right: 70 })
    const c2 = mkSpan('R2 tail', { top: 120, bottom: 130, left: 150, right: 240 })
    root.append(s1, br1, s2, c2)
    document.body.append(root)
    const a = anchorOf(root, { node: s1.firstChild!, offset: 0 }, { node: root, offset: 1 })
    expect(a).not.toBeNull()
    // 终点=本栏（最近栏组）行尾=13，quote 不含对栏文本
    expect(a!.end).toBe(13)
    expect(a!.quote).toBe('AB firstCD se')
  })

  // ── 门一回炉 C-1/C-2/C-3（2026-09-09）──

  it('C-1a 起点 br 槽位回拖：起点吸附下一视觉行首+start>end 翻转兜底 → quote=回拖段文本', () => {
    // 视觉：row1「AB first」；row2「CD second」（br 盒带覆盖 row2，DOM 槽在 row2 文本前）；row3「EF third」
    const root = document.createElement('div')
    const s1 = mkSpan('AB first', { top: 100, bottom: 110, left: 10, right: 80 })
    const br1 = mkBr({ top: 118, bottom: 138, left: 5, right: 5 })
    const s2 = mkSpan('CD second', { top: 120, bottom: 130, left: 10, right: 70 })
    const s3 = mkSpan('EF third', { top: 140, bottom: 150, left: 10, right: 70 })
    root.append(s1, br1, s2, s3)
    document.body.append(root)
    // 起笔 row2 行尾空白（br 槽），向左回拖到 row2 内 offset 3（'s' 前）
    const a = anchorOf(root, { node: root, offset: 1 }, { node: s2.firstChild!, offset: 3 })
    expect(a).not.toBeNull()
    // 起点归一化=下一视觉行首（row3=17）> end=11 → 翻转 → [11,17)='second'
    expect(a!.start).toBe(11)
    expect(a!.end).toBe(17)
    expect(a!.quote).toBe('second')
  })

  it('C-1b 翻转兜底（跨行形态）：起笔 row1 行尾空白回拖到 row1 内 → quote=行尾段', () => {
    const root = document.createElement('div')
    const s1 = mkSpan('AB first', { top: 100, bottom: 110, left: 10, right: 80 })
    const s2 = mkSpan('CD second', { top: 120, bottom: 130, left: 10, right: 70 })
    const br2 = mkBr({ top: 98, bottom: 118, left: 5, right: 5 })
    root.append(s1, s2, br2)
    document.body.append(root)
    // br 槽在 DOM 尾=文档序更晚：回拖选区的 start=(s1,4)、end=(root,2)
    const a = anchorOf(root, { node: s1.firstChild!, offset: 4 }, { node: root, offset: 2 })
    expect(a).not.toBeNull()
    // 终点归一化=本行（row1）行尾 8 → [4,8)='irst'
    expect(a!.start).toBe(4)
    expect(a!.end).toBe(8)
    expect(a!.quote).toBe('irst')
  })

  it('C-1c 起点 br 槽位正向拖：起点越过紧邻空白标记到下一行首字符，quote 无前导空白', () => {
    // row3 行首有缩进空白标记（ws-only span，DOM 序在 row3 文本前）
    const root = document.createElement('div')
    const s1 = mkSpan('AB first', { top: 100, bottom: 110, left: 10, right: 80 })
    const br1 = mkBr({ top: 118, bottom: 138, left: 5, right: 5 })
    const s2 = mkSpan('CD second', { top: 120, bottom: 130, left: 10, right: 70 })
    const e3 = mkSpan(' ', { top: 140, bottom: 150, left: 10, right: 16 })
    const s3 = mkSpan('EF third', { top: 140, bottom: 150, left: 16, right: 86 })
    root.append(s1, br1, s2, e3, s3)
    document.body.append(root)
    const a = anchorOf(root, { node: root, offset: 1 }, { node: s3.firstChild!, offset: 2 })
    expect(a).not.toBeNull()
    // 全文='AB firstCD second EF third'——起点应越过 e3 的空白=18（非 17）
    expect(a!.start).toBe(18)
    expect(a!.quote).toBe('EF')
  })

  it('C-2 跨行居中 br 盒：吸附最近单行（等距并列取阅读序上行），不同纳两行', () => {
    // rowA 中心 111「AAAA」/rowB 中心 125「BBBB」（pitch 14）；br 中心 118 等距跨行居中
    const root = document.createElement('div')
    const sA = mkSpan('AAAA', { top: 106, bottom: 116, left: 10, right: 50 })
    const br = mkBr({ top: 108, bottom: 128, left: 5, right: 5 })
    const sB = mkSpan('BBBB', { top: 120, bottom: 130, left: 10, right: 60 })
    root.append(sA, br, sB)
    document.body.append(root)
    const a = anchorOf(root, { node: sA.firstChild!, offset: 0 }, { node: root, offset: 1 })
    expect(a).not.toBeNull()
    // 容差内集会同时纳入两行并误取下行行尾（8）；最近行（并列取上行）=rowA 行尾 4
    expect(a!.end).toBe(4)
    expect(a!.quote).toBe('AAAA')
  })

  it('C-2b 跨行 br 盒偏下：吸附最近行（下行）', () => {
    const root = document.createElement('div')
    const sA = mkSpan('AAAA', { top: 106, bottom: 116, left: 10, right: 50 })
    const br = mkBr({ top: 111, bottom: 131, left: 5, right: 5 }) // 中心 121，距 rowB 近
    const sB = mkSpan('BBBB', { top: 120, bottom: 130, left: 10, right: 50 })
    root.append(sA, br, sB)
    document.body.append(root)
    const a = anchorOf(root, { node: sA.firstChild!, offset: 0 }, { node: root, offset: 1 })
    expect(a).not.toBeNull()
    expect(a!.end).toBe(8)
    expect(a!.quote).toBe('AAAABBBB')
  })

  it('C-3 裸文本节点混入：元素槽位按 childNodes 索引（非 children），槽位不邻标记→零变', () => {
    // childNodes=[s1, '裸文本', s2, br]——槽位 (root,2)=s2 前，childNodes 语义下不邻任何标记
    const root = document.createElement('div')
    const s1 = mkSpan('AAAA', { top: 100, bottom: 110, left: 10, right: 50 })
    const bare = document.createTextNode('裸文本')
    const s2 = mkSpan('BBBB', { top: 120, bottom: 130, left: 10, right: 50 })
    const br = mkBr({ top: 108, bottom: 128, left: 5, right: 5 })
    root.append(s1, bare, s2, br)
    document.body.append(root)
    const a = anchorOf(root, { node: s1.firstChild!, offset: 0 }, { node: root, offset: 2 })
    expect(a).not.toBeNull()
    // children 索引会把 children[1]=br 误当槽前标记而吸附；childNodes 语义=零变
    expect(a!.end).toBe(4 + bare.data.length)
    expect(a!.quote).toBe('AAAA' + bare.data)
  })

  // ── 门二末轮回炉（deepseek 撞限推理发现+主控核实，2026-09-09）──

  it('D-1 双栏右栏行首缩进空白（blank span 分支栏分流）：start 边界→右栏首字符，不误吸左栏行尾', () => {
    // 同视觉行双栏：左栏「L1 tail」[10..100]｜栏间｜右栏缩进空白「 」[150..156]+「R2 head」[156..240]
    const root = document.createElement('div')
    const c1 = mkSpan('L1 tail', { top: 100, bottom: 110, left: 10, right: 100 })
    const w2 = mkSpan(' ', { top: 100, bottom: 110, left: 150, right: 156 })
    const c2 = mkSpan('R2 head', { top: 100, bottom: 110, left: 156, right: 240 })
    root.append(c1, w2, c2)
    document.body.append(root)
    // 起点落在右栏缩进空白的文本位（DOM 序在右栏文本前）
    const a = anchorOf(root, { node: w2.firstChild!, offset: 0 }, { node: c2.firstChild!, offset: 7 })
    expect(a).not.toBeNull()
    // 全文='L1 tail R2 head'（15）——起点应=右栏首字符 8（旧 left 全行过滤误吸左栏行尾 7→前导空格）
    expect(a!.start).toBe(8)
    expect(a!.quote).toBe('R2 head')
  })
})
