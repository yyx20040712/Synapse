// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { stubRectOf } from '../../utils/geometry'
import { releaseAffinity } from '../../../src/renderer/features/reader/interact/release-affinity'
import { selectionToAnchor } from '../../../src/renderer/features/reader/anchors/anchor-serialize'
import type { SelectionAnchor } from '../../../src/renderer/features/reader/anchors/anchor-serialize'

/**
 * F-A12 划选释放点浅探 affinity（release-affinity 事件层重定向）——F-A10 G2 遗留：
 * mouseup 释放点浅下探（行间隙/下段盒顶）且释放 x 处上一行无文本（行尾空白区）时，
 * 浏览器把终点送进下一段 span 内 offset>0（与刻意深点零 DOM 信号差异——锚定层
 * 原理不可辨，须事件层手势几何裁决）。判定=释放点在 focus 行盒顶上方且更近上一
 * 视觉行（等距取上一行）→ 重定向 focus=上一行行尾；锚定侧原样。always-active。
 */

interface Box { top: number; bottom: number; left: number; right: number }


/** 造一个 pdf.js 文本层形态的 span（文本+量测盒） */
function mkSpan(text: string, b: Box): HTMLSpanElement {
  const s = document.createElement('span')
  s.textContent = text
  stubRectOf(s, b)
  return s
}

interface Pt { node: Node; offset: number }

/** 程序化设选区（anchor/focus 精确控制——backward 形态须 setBaseAndExtent） */
function selOf(anchor: Pt, focus: Pt): Selection {
  const sel = document.getSelection()
  sel?.removeAllRanges()
  sel?.setBaseAndExtent(anchor.node, anchor.offset, focus.node, focus.offset)
  return sel as Selection
}

/** 接线等价链：判定→setBaseAndExtent（锚定侧原样）→selectionToAnchor 三元组 */
function redirectedAnchor(root: HTMLElement, sel: Selection, upX: number, upY: number): SelectionAnchor | null {
  const target = releaseAffinity(root, sel, upX, upY)
  if (target === null) return null
  // releaseAffinity 非 null 蕴含选区非坍缩（anchorNode 必在）
  sel.setBaseAndExtent(sel.anchorNode!, sel.anchorOffset, target.node, target.offset)
  return selectionToAnchor(root, sel)
}

afterEach(() => {
  document.getSelection()?.removeAllRanges()
  document.body.replaceChildren()
})

describe('F-A12 释放点浅探 affinity（release-affinity 重定向判定）', () => {
  it('G2 浅下探：释放点在 focus 行上方间隙且更近上一行 → 重定向上一行行尾，落库终点不带下段头', () => {
    // 视觉：row1「AB first」y[100,110]；row2「CD second」y[130,140]（间隙 [110,130]）
    // 浏览器浅下探把 focus 送进 row2 span offset 3（实测 G2 形态）；释放点 y=115 更近 row1
    const root = document.createElement('div')
    const s1 = mkSpan('AB first', { top: 100, bottom: 110, left: 10, right: 80 })
    const s2 = mkSpan('CD second', { top: 130, bottom: 140, left: 10, right: 70 })
    root.append(s1, s2)
    document.body.append(root)
    const sel = selOf({ node: s1.firstChild!, offset: 0 }, { node: s2.firstChild!, offset: 3 })
    // 释放 x=100 在 s1 行尾空白区（右缘 80 外——G2 实测形态：上一行该 x 处无文本）
    const target = releaseAffinity(root, sel, 100, 115)
    expect(target).not.toBeNull()
    expect(target!.node).toBe(s1.firstChild)
    expect(target!.offset).toBe(8)
    const a = redirectedAnchor(root, sel, 100, 115)
    expect(a).not.toBeNull()
    expect(a!.end).toBe(8)
    expect(a!.quote).toBe('AB first')
    expect(a!.quote).not.toContain('CD')
  })

  it('深点（释放点更近 focus 行）= 用户刻意 → 零变 null', () => {
    const root = document.createElement('div')
    const s1 = mkSpan('AB first', { top: 100, bottom: 110, left: 10, right: 80 })
    const s2 = mkSpan('CD second', { top: 130, bottom: 140, left: 10, right: 70 })
    root.append(s1, s2)
    document.body.append(root)
    // 释放 y=125：距 row1 盒底 15 > 距 row2 盒顶 5 → 深点零变
    const sel = selOf({ node: s1.firstChild!, offset: 0 }, { node: s2.firstChild!, offset: 3 })
    expect(releaseAffinity(root, sel, 60, 125)).toBeNull()
  })

  it('词间空格正常划选（释放点在 focus 行盒内）→ 零触 null', () => {
    const root = document.createElement('div')
    const s = mkSpan('foo bar baz', { top: 100, bottom: 110, left: 10, right: 90 })
    root.append(s)
    document.body.append(root)
    // 词间空格划选（offset 3..11 含空格），释放点 y=105 在行盒内（upY ≥ 行盒顶）
    const sel = selOf({ node: s.firstChild!, offset: 3 }, { node: s.firstChild!, offset: 11 })
    expect(releaseAffinity(root, sel, 50, 105)).toBeNull()
  })

  it('向上浅上探对称：backward 划选 focus 被解析到下侧行、释放点更近上一行 → focus 重定向上一行行尾', () => {
    // 视觉：r0「EF third」y[80,90]；r1「AB first」y[100,110]；r2「CD second」y[120,130]
    // 向上划选（anchor=r2 尾），释放点 y=93 在 r1 上方间隙、更近 r0（3 ≤ 7）
    const root = document.createElement('div')
    const r0 = mkSpan('EF third', { top: 80, bottom: 90, left: 10, right: 70 })
    const r1 = mkSpan('AB first', { top: 100, bottom: 110, left: 10, right: 80 })
    const r2 = mkSpan('CD second', { top: 120, bottom: 130, left: 10, right: 70 })
    root.append(r0, r1, r2)
    document.body.append(root)
    // 释放 x=75 在 r0 文本右缘外（行尾空白区——浏览器下探把 focus 送进 r1 offset 2）
    const sel = selOf({ node: r2.firstChild!, offset: 9 }, { node: r1.firstChild!, offset: 2 })
    const target = releaseAffinity(root, sel, 75, 93)
    expect(target).not.toBeNull()
    expect(target!.node).toBe(r0.firstChild)
    expect(target!.offset).toBe(8)
    // 接线等价链：全文 'EF thirdAB firstCD second'（25）——重定向后选区 [8,25)
    const a = redirectedAnchor(root, sel, 75, 93)
    expect(a).not.toBeNull()
    expect(a!.start).toBe(8)
    expect(a!.quote).toBe('AB firstCD second')
  })

  it('无布局量测（jsdom 未打桩=含原点四零盒）→ 量测守卫零变 null', () => {
    const root = document.createElement('div')
    const s1 = document.createElement('span')
    s1.textContent = 'AB first'
    const s2 = document.createElement('span')
    s2.textContent = 'CD second'
    root.append(s1, s2)
    document.body.append(root)
    const sel = selOf({ node: s1.firstChild!, offset: 0 }, { node: s2.firstChild!, offset: 3 })
    expect(releaseAffinity(root, sel, 60, 115)).toBeNull()
  })

  it('双栏：上一视觉行双栏组，释放 x 定向最近（右）栏组行尾，不跨栏误吸', () => {
    // row0 双栏：左「L1 tail」x[10,100]｜右「R1 end」x[150,240]，y[100,110]
    // row1（focus 行）：右栏「CD second」x[150,240]，y[130,140]
    const root = document.createElement('div')
    const l0 = mkSpan('L1 tail', { top: 100, bottom: 110, left: 10, right: 100 })
    const r0 = mkSpan('R1 end', { top: 100, bottom: 110, left: 150, right: 240 })
    const s1 = mkSpan('CD second', { top: 130, bottom: 140, left: 150, right: 240 })
    root.append(l0, r0, s1)
    document.body.append(root)
    // 释放 (260,115)：间隙更近 row0；x=260 在右栏组行尾空白区（右缘 240 外）
    // → 最近栏组=右栏 → 右栏行尾（R1 end 长度 6）
    const sel = selOf({ node: s1.firstChild!, offset: 0 }, { node: s1.firstChild!, offset: 3 })
    const target = releaseAffinity(root, sel, 260, 115)
    expect(target).not.toBeNull()
    expect(target!.node).toBe(r0.firstChild)
    expect(target!.offset).toBe(6)
  })

  it('focus 行=首行（无上一视觉行）→ 零变 null', () => {
    const root = document.createElement('div')
    const s1 = mkSpan('AB first', { top: 100, bottom: 110, left: 10, right: 80 })
    const s2 = mkSpan('CD second', { top: 130, bottom: 140, left: 10, right: 70 })
    root.append(s1, s2)
    document.body.append(root)
    // focus 在首行 s1，释放点 y=75 在其上方 → 无上一行可归
    const sel = selOf({ node: s2.firstChild!, offset: 9 }, { node: s1.firstChild!, offset: 2 })
    expect(releaseAffinity(root, sel, 60, 75)).toBeNull()
  })

  it('坍缩选区 → 零触 null', () => {
    const root = document.createElement('div')
    const s1 = mkSpan('AB first', { top: 100, bottom: 110, left: 10, right: 80 })
    const s2 = mkSpan('CD second', { top: 130, bottom: 140, left: 10, right: 70 })
    root.append(s1, s2)
    document.body.append(root)
    const sel = selOf({ node: s1.firstChild!, offset: 2 }, { node: s1.firstChild!, offset: 2 })
    expect(releaseAffinity(root, sel, 60, 115)).toBeNull()
  })

  it('等距（距上一行盒底=距 focus 行盒顶）→ 取上一行重定向（对齐 blank-snap C-2 等距取上行精神）', () => {
    const root = document.createElement('div')
    const s1 = mkSpan('AB first', { top: 100, bottom: 110, left: 10, right: 80 })
    const s2 = mkSpan('CD second', { top: 130, bottom: 140, left: 10, right: 70 })
    root.append(s1, s2)
    document.body.append(root)
    // 释放 y=120：距 row1 盒底 10 = 距 row2 盒顶 10 → 等距取上一行（x=100 行尾空白区）
    const sel = selOf({ node: s1.firstChild!, offset: 0 }, { node: s2.firstChild!, offset: 3 })
    const target = releaseAffinity(root, sel, 100, 120)
    expect(target).not.toBeNull()
    expect(target!.offset).toBe(8)
  })

  it('紧间隙实测 G2 几何复刻（间隙 2.5px，释放仅高 focus 盒顶 0.5px、低于上一行盒底 2px）→ 浅探余量内重定向', () => {
    // f-a10-verify-real2.raw.txt GEO 实测：last [532.3,540.3] / next [542.8,550.7]
    // 释放 y+6=542.3——纯距离判据（2.0 > 0.5）不触发，须运动过冲余量兜住
    const root = document.createElement('div')
    const s1 = mkSpan('technologies (Mohanty et al., 2016).', { top: 532.3, bottom: 540.3, left: 748.9, right: 877.7 })
    const s2 = mkSpan('With regard to urban water', { top: 542.8, bottom: 550.7, left: 760.9, right: 997.5 })
    root.append(s1, s2)
    document.body.append(root)
    // 释放 x=907.7（s1 右缘外 30px 行尾空白区——浏览器下探 focus 进 s2 内部文本位）
    const sel = selOf({ node: s1.firstChild!, offset: 0 }, { node: s2.firstChild!, offset: 20 })
    const target = releaseAffinity(root, sel, 907.7, 542.3)
    expect(target).not.toBeNull()
    expect(target!.node).toBe(s1.firstChild)
    expect(target!.offset).toBe(s1.textContent!.length)
  })

  it('大间隙底部刻意释放（深点：距上一行盒底 19px、距 focus 盒顶 1px）→ 零变 null', () => {
    const root = document.createElement('div')
    const s1 = mkSpan('AB first', { top: 100, bottom: 110, left: 10, right: 80 })
    const s2 = mkSpan('CD second', { top: 130, bottom: 140, left: 10, right: 70 })
    root.append(s1, s2)
    document.body.append(root)
    // 释放 y=129：距 row1 盒底 19 > max(距 row2 盒顶 1, 浅探余量) → 深点零变
    const sel = selOf({ node: s1.firstChild!, offset: 0 }, { node: s2.firstChild!, offset: 3 })
    expect(releaseAffinity(root, sel, 100, 129)).toBeNull()
  })

  // ── 门一 R1 回炉 W1/W2/W3（2026-09-10）──

  it('W1 释放 x 落上一行栏组水平域内（含右缘容差——上一行该 x 处有文本）→ 紧间隙刻意释放零变', () => {
    // 紧间隙 G2 同款几何（间隙 2.5px）：y 判据满足浅探，但 x=800 在 s1 栏组
    // [748.9,877.7] 域内=上一行该 x 处有文本→缺陷机制（行尾空白区）不成立
    const root = document.createElement('div')
    const s1 = mkSpan('technologies (Mohanty et al., 2016).', { top: 532.3, bottom: 540.3, left: 748.9, right: 877.7 })
    const s2 = mkSpan('With regard to urban water', { top: 542.8, bottom: 550.7, left: 760.9, right: 997.5 })
    root.append(s1, s2)
    document.body.append(root)
    const sel = selOf({ node: s1.firstChild!, offset: 0 }, { node: s2.firstChild!, offset: 20 })
    expect(releaseAffinity(root, sel, 800, 542.3)).toBeNull()
    // 右缘 +1px 容差内（878.7）同判零变——F-A10 `<= right + 1` 惯例对齐
    expect(releaseAffinity(root, sel, 878.7, 542.3)).toBeNull()
  })

  it('W2 释放 y 高于上一视觉行盒顶（跨多行）→ 零变 null（防御上界）', () => {
    // r0[80,90] / r1[100,110]：focus 在 r1，释放 y=75 高于 r0 盒顶 80——
    // 纯 y 判据下恒真（|75-90|=15 ≤ max(100-75, 4)）只上挪一行=错误终态
    const root = document.createElement('div')
    const r0 = mkSpan('EF third', { top: 80, bottom: 90, left: 10, right: 70 })
    const r1 = mkSpan('AB first', { top: 100, bottom: 110, left: 10, right: 80 })
    root.append(r0, r1)
    document.body.append(root)
    const sel = selOf({ node: r1.firstChild!, offset: 0 }, { node: r1.firstChild!, offset: 2 })
    expect(releaseAffinity(root, sel, 100, 75)).toBeNull()
  })

  it('W3 backward 链翻转兜底：anchor 下行中部+释放上行间隙→target 行尾 DOM 序在 anchor 前→start/end 翻转正确', () => {
    // r0「EF third」/r1「AB first」/r2「CD second」（全文 25 字）；anchor=(r2,5)
    // （下行中部），focus 被 browser 解析到 r1，释放 (75,93) 在 r1 上方间隙偏近
    // r0、x=75 在 r0 行尾空白区（右缘 70 外）→target=r0 行尾（全局 8 < anchor 21）
    const root = document.createElement('div')
    const r0 = mkSpan('EF third', { top: 80, bottom: 90, left: 10, right: 70 })
    const r1 = mkSpan('AB first', { top: 100, bottom: 110, left: 10, right: 80 })
    const r2 = mkSpan('CD second', { top: 120, bottom: 130, left: 10, right: 70 })
    root.append(r0, r1, r2)
    document.body.append(root)
    const sel = selOf({ node: r2.firstChild!, offset: 5 }, { node: r1.firstChild!, offset: 2 })
    const a = redirectedAnchor(root, sel, 75, 93)
    expect(a).not.toBeNull()
    // 重定向后 selection=[anchor 21, focus 8] backward→selectionToAnchor 翻转
    expect(a!.start).toBe(8)
    expect(a!.end).toBe(21)
    expect(a!.quote).toBe('AB firstCD se')
  })
})
