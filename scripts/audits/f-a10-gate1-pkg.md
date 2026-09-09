# F-A10 门一审包（对抗深审——Kimi 链）

## 0. 票面+主控预裁被证伪的背景

票面：划选段末空白 affinity 缺陷（img2：鼠标放段末行尾空白处，选区把下一段带上；数据指纹=quote 前导空格）。主控预裁=「跨行空白串吸附」（简报 f-a10-brief.md）——**实现者真机诊断证伪**：该 PDF 段间零文本空白、跨行空白串判据空操作；真根因=pdf.js 行 break 标记（br 零宽×2 行高盒，DOM 序≠视觉序）作行尾空白吸附槽，划选边界按 DOM 槽起算产生视觉跳跃（实测欠达丢 7 行/img2 过达带下段）。

## 1. 实现摘要

anchor-blank-snap.ts 新域件：br→最近栏本行行尾恒吸附；空白 span→盒定向（下邻=上吸/上邻=下吸）。selectionToAnchor 双边界归一化接线；evaluate/SelectionLayer 零改。证链：红 6failed→绿 9/9→四变异全红→还原 diff 空→全量 160 文件/1507 用例绿→typecheck/lint 净→真机复测落库 end=1465（段尾）+paint 540.3<下段顶 542.8（不跨段）。已知边界申报：文本位下探（G2）DOM 态零信号不可修（建议事件层独立票）；起点面仅单测证明。

## 2. 工单（A~E）

A 母本符合度：票面验收三支（夹具 range 终点=本行行尾/e2e 留主控/img2 形态复测消）；预裁证伪后的实现转向是否恰据真机证据（非私改）？
B 宪法红线：新域件行数/状态或边界语义表前置/UTF-8/禁新依赖。
C 代码与测试质量：br 吸附判据（「最近栏本行」的栏定向算法）；空白 span 盒定向的双向对称性；jsdom 桩面（br 零宽×2 行高盒的 mock 形态与真机一致性）；四变异判别力；9 用例断言非恒真。
D 报告诚实性：自裁/申报对 diff（预裁证伪转向+G2 不可修论证+起点面仅单测的限界申报）。
E 接缝：selectionToAnchor 消费方（快/慢路径+save 落库）零变推演；与 F-A9 校准域（matchBand/band）互不干扰；quote 前导空格指纹的存量零迁移声明。

输出 [B|W|N] 逐条+file:line+一行总评。

## 3. diff 与新文件全文

diff --git a/src/renderer/features/reader/anchor-serialize.ts b/src/renderer/features/reader/anchor-serialize.ts
index c60f5032a2..749f859e55 100644
--- a/src/renderer/features/reader/anchor-serialize.ts
+++ b/src/renderer/features/reader/anchor-serialize.ts
@@ -7,6 +7,10 @@
  *   rects；选区任一边界在 root 之外（跨页/页外）或 quote 为空（纯元素/零宽
  *   选择）返回 null；边界点→全局偏移用 probe-range 文本长度探测（文本/元素
  *   容器统一成立）；prefix/suffix 按 CONTEXT_CHARS=32 截取（WADM 惯例）
+ * - [F-A10] 段末空白 affinity：边界先经 anchor-blank-snap 归一化——浏览器把
+ *   行尾/段首空白点击解析为 pdf.js 空白标记 span 槽位（DOM 序≠视觉序，实测
+ *   两方向跳跃：丢下半段/img2 带下一段），按标记盒视觉行重解析到本行行尾/
+ *   行首；非标记边界与无量测环境语义零变（详 anchor-blank-snap 头注）
  * - verifyQuote：前缀/引文/后缀校验 start 偏移是否仍有效；失效时 textQuote
  *   自愈重定位——原位校验优先，重定位打分 score=prefix 2+suffix 1，同级取距
  *   原偏移最近者。定位核 locateQuote=纯文本函数（DOM/items 两域共享单源，
@@ -54,6 +58,7 @@
  *   本模块——用例体零改）；e2e reader-text.spec.ts 划选保存链（收口裁判）
  */
 import type { AnnotationRect } from '@shared/models/annotation'
+import { snapBlankBoundary } from './anchor-blank-snap'
 import {
   collectSpans,
   fullTextOf,
@@ -190,9 +195,13 @@ export function selectionToAnchor(
   if (total === 0) {
     return null
   }
+  // [F-A10] 段末空白 affinity 归一化：空白标记 span 槽位按视觉行重解析（双边界
+  // 对称；非标记边界原样）——归一化后再探测全局偏移
+  const startBoundary = snapBlankBoundary(root, range.startContainer, range.startOffset)
+  const endBoundary = snapBlankBoundary(root, range.endContainer, range.endOffset)
   // 边界点 → 全局偏移：probe-range 的文本长度（文档序拼接口径与 collectSpans 一致）
-  const leadLen = probeTextLength(root, range.startContainer, range.startOffset, 'start')
-  const tailLen = probeTextLength(root, range.endContainer, range.endOffset, 'end')
+  const leadLen = probeTextLength(root, startBoundary.node, startBoundary.offset, 'start')
+  const tailLen = probeTextLength(root, endBoundary.node, endBoundary.offset, 'end')
   if (leadLen === null || tailLen === null) {
     return null
   }

===NEW FILE anchor-blank-snap.ts===
/**
 * [F-A10] anchor-blank-snap —— 划选边界段末空白归一化域（纯函数）
 *
 * ── 行为层 ──
 * - 缺陷机制（2026-09-09 真机三轮诊断实证，scripts/audits/f-a10-diag*-real*.raw.txt）：
 *   浏览器把行尾/段首空白区的点击解析为 pdf.js 行 break 标记（<br role=
 *   presentation>，零宽×~2 行高盒、x 在栏左缘=无横向意义）或纯空白项 span
 *   （有真实字形盒）的槽位；标记 DOM 序（=内容流序）≠视觉序——边界按 DOM
 *   槽位起算会视觉跳跃：实测段末行尾空白点击→终点跳回 7 行前（丢下半段）；
 *   img2 形态=跳过下一段前数行（整段带上）。两方向同根因。
 * - 归一化（双边界对称）：
 *   · BR 标记槽位 → BR 盒带覆盖的视觉行中、距 BR 最近的栏组的行尾文本末
 *     （=本行行尾，不下探下一段——两方向跳跃均收口到此）；
 *   · 纯空白/空文本 span 标记（字形盒真实）→ 盒左侧最近同行文本行尾；无左侧
 *     同行文本→右侧最近同行文本首字符（段首缩进空白吸附，quote 无前导空白）。
 * - 兼容面（零语义变）：非标记文本位（词间空格划选——空格在非空白 span 内）
 *   原样；无布局量测环境（jsdom 含原点四零盒）原样；普通元素槽位原样。
 *   栏间空白：BR 盒在栏左缘→吸附本栏（距 BR 最近栏组）行尾；空白 span 盒在
 *   栏间→吸附左栏行尾；文本位命中右栏首字符→原生语义（三分语义表见
 *   f-a10-impl.report.md）。
 *
 * ── 接口层 ──
 * - export interface DomBoundary { node: Node; offset: number }
 * - export function snapBlankBoundary(root, node, offset): DomBoundary
 *   （输入输出同构——未命中时返回等值新对象；锚定链消费=anchor-serialize
 *   selectionToAnchor 的输入归一化，快/慢路径最终锚定同源）
 *
 * ── 架构层 ──
 * - 依赖单向 anchor-serialize→本模块→annotation-anchor（几何原语公共面
 *   collectSpans——零环）；零 React/IPC 依赖，纯函数可单测
 * - 快路径（selection-evaluate.visual）不经本模块——拖选期瞬态带不归一化，
 *   mouseup/settle 全量同帧覆盖吸收（INV-58 已知边界同族）
 *
 * ── 生命周期层 ──
 * - 仅 mouseup/settle 时刻调用（非每帧）；单页千级文本节点 O(n log n)
 *   （collectSpans+行过滤+栏排序）只读一遍布局 <10ms 约束内
 *
 * ── 文化层 ──
 * - 测试：tests/unit/renderer/anchor-blank-snap.test.ts（always-active，
 *   jsdom 量测桩=getBoundingClientRect 逐元素打桩；BR 形态按真机 diag3 实测
 *   盒形状建模——零宽×2 行高×栏左缘）
 */
import { collectSpans, type NodeSpan } from './annotation-anchor'

/** DOM 边界点（与 Range 边界同构：node+offset） */
export interface DomBoundary {
  node: Node
  offset: number
}

/** 像素盒（top/bottom/left/right——getBoundingClientRect 视口口径） */
interface Box {
  top: number
  bottom: number
  left: number
  right: number
}

/** 栏间断组阈值系数：x 间隙 > max(20px, 2.5×盒高) 断栏（annotation-anchor
 *  COLUMN_GAP 同族判据的量测侧简化） */
const COLUMN_GAP_MIN_PX = 20
const COLUMN_GAP_H_FACTOR = 2.5

/** 空白标记：pdf.js 行 break（br）/空串项/纯空白项的渲染产物（textContent
 *  去空白后为空） */
function isBlankMarker(el: Element | null): boolean {
  if (el === null) {
    return false
  }
  return (el.textContent ?? '').trim().length === 0
}

/** 元素量测盒；无布局量测（jsdom 未打桩=含原点四零盒）或非函数 → null（归一化
 *  放弃）。真浏览器的零尺寸标记（br/空 span）原点真实（绝对定位 left/top 仍在）
 *  ——位置即信号（真机复测第一轮实证：按尺寸判会把真标记误杀） */
function boxOf(el: Element | null): Box | null {
  if (el === null || typeof el.getBoundingClientRect !== 'function') {
    return null
  }
  const b = el.getBoundingClientRect()
  if (b.x === 0 && b.y === 0 && b.width === 0 && b.height === 0) {
    return null
  }
  return { top: b.top, bottom: b.bottom, left: b.left, right: b.right }
}

/**
 * 边界命中的空白标记：文本位在纯空白 span 内→该 span；元素槽位紧邻（其后或
 * 其前）空白标记→该标记；否则 null（普通文本位/普通槽位）
 */
function markerAt(node: Node, offset: number): Element | null {
  if (node.nodeType === Node.TEXT_NODE) {
    const parent = node.parentElement
    return isBlankMarker(parent) ? parent : null
  }
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null
  }
  const kids = (node as Element).children
  const after = kids[offset]
  if (after !== undefined && isBlankMarker(after)) {
    return after
  }
  const before = kids[offset - 1]
  return before !== undefined && isBlankMarker(before) ? before : null
}

/** 同视觉行判定：垂直中心差 ≤ 0.75×参考高（零高标记以文本盒高为基准——
 *  同行（中心差 ≲0.5×盒高）稳入、紧行距相邻行（中心差 ≥行距>盒高）稳出） */
function sameRow(b: Box, markerCy: number, markerH: number): boolean {
  const textH = b.bottom - b.top
  const refH = markerH > 0 ? Math.min(textH, markerH) : textH
  return Math.abs((b.top + b.bottom) / 2 - markerCy) <= Math.max(2, refH * 0.75)
}

/** 视觉行收集（root 全部文本 span 中与标记同行的 [span, box] 对） */
function rowOf(root: HTMLElement, markerCy: number, markerH: number): Array<{ span: NodeSpan; box: Box }> {
  const row: Array<{ span: NodeSpan; box: Box }> = []
  for (const span of collectSpans(root).spans) {
    const b = boxOf(span.node.parentElement)
    if (b !== null && sameRow(b, markerCy, markerH)) {
      row.push({ span, box: b })
    }
  }
  return row
}

/** 行内栏聚类：按 left 升序，x 间隙大于阈值断组（同视觉行的多栏文本互不吸附） */
function columnGroups(row: Array<{ span: NodeSpan; box: Box }>): Array<Array<{ span: NodeSpan; box: Box }>> {
  const sorted = [...row].sort((a, b) => a.box.left - b.box.left)
  const groups: Array<Array<{ span: NodeSpan; box: Box }>> = []
  for (const r of sorted) {
    const g = groups[groups.length - 1]
    const h = Math.max(2, r.box.bottom - r.box.top)
    if (g !== undefined && r.box.left - g[g.length - 1]!.box.right <= Math.max(COLUMN_GAP_MIN_PX, COLUMN_GAP_H_FACTOR * h)) {
      g.push(r)
    } else {
      groups.push([r])
    }
  }
  return groups
}

/**
 * [F-A10] 段末空白 affinity 归一化：边界落在空白标记的槽位时按标记形态重解析
 * 到本行文本边界；其余形态原样返回（语义零变）
 */
export function snapBlankBoundary(root: HTMLElement, node: Node, offset: number): DomBoundary {
  const marker = markerAt(node, offset)
  if (marker === null || !root.contains(marker)) {
    return { node, offset }
  }
  const box = boxOf(marker)
  if (box === null) {
    return { node, offset }
  }
  const markerCy = (box.top + box.bottom) / 2
  const markerH = box.bottom - box.top
  const row = rowOf(root, markerCy, markerH)
  if (row.length === 0) {
    return { node, offset }
  }
  if (marker.tagName === 'BR') {
    // 行 break 标记：盒 x 在栏左缘=无横向意义（diag3 实测）——恒吸附 BR 带覆盖
    // 行中距 BR 最近的栏组的行尾（双边界同目标：空白在阅读序上位于本行行尾之后）
    const groups = columnGroups(row)
    let best: Array<{ span: NodeSpan; box: Box }> | null = null
    let bestDist = Number.POSITIVE_INFINITY
    for (const g of groups) {
      const gLeft = g[0]!.box.left
      const gRight = g[g.length - 1]!.box.right
      const dist = box.left >= gLeft && box.left <= gRight ? 0 : Math.min(Math.abs(gLeft - box.left), Math.abs(gRight - box.left))
      if (dist < bestDist) {
        best = g
        bestDist = dist
      }
    }
    const tail = best?.reduce((m, r) => (r.box.right > m.box.right ? r : m))
    if (tail !== undefined) {
      return { node: tail.span.node, offset: tail.span.node.data.length }
    }
    return { node, offset }
  }
  // 空白/空文本 span 标记（字形盒真实）：盒左侧最近同行文本→其行尾；无左侧
  // →右侧最近同行文本首字符（段首缩进类）；均无（重叠等罕见形态）→原样
  const left = row
    .filter((r) => r.box.right <= box.left + 1)
    .sort((a, b) => b.box.right - a.box.right)[0]
  if (left !== undefined) {
    return { node: left.span.node, offset: left.span.node.data.length }
  }
  const right = row
    .filter((r) => r.box.left >= box.right - 1)
    .sort((a, b) => a.box.left - b.box.left)[0]
  if (right !== undefined) {
    return { node: right.span.node, offset: 0 }
  }
  return { node, offset }
}

===NEW FILE anchor-blank-snap.test.ts===
// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
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

/** 给元素打量测桩（真浏览器 getBoundingClientRect 的 jsdom 替身） */
function rectOf(el: HTMLElement, b: Box): void {
  el.getBoundingClientRect = () =>
    ({ x: b.left, y: b.top, top: b.top, bottom: b.bottom, left: b.left, right: b.right, width: b.right - b.left, height: b.bottom - b.top, toJSON: () => ({}) }) as DOMRect
}

/** 造一个 pdf.js 文本层形态的 span（文本+量测盒） */
function mkSpan(text: string, b: Box): HTMLSpanElement {
  const s = document.createElement('span')
  s.textContent = text
  rectOf(s, b)
  return s
}

/** 造一个 pdf.js 行 break 标记（零宽×2 行高×栏左缘——真机 diag3 实测形态） */
function mkBr(b: Box): HTMLBRElement {
  const br = document.createElement('br')
  br.setAttribute('role', 'presentation')
  rectOf(br, b)
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
})


## 4. 实现者报告全文

# F-A10 实现报告——划选段末空白 affinity（三屋实现者）

## 1. 实现摘要（诊断先行——预裁机制被证据修正）

**主控预裁机制（brief §0）被三轮真机诊断证伪**：预裁认为缺陷=text layer 行尾
空白节点（跨行空白串）命中→selection offset 解析的 affinity 归属，修复=跨行
空白串吸附。实测（f-a10-diag/diag2/diag3-real*.raw.txt，真纸《Towards a
smart water city》页 2）：

- 该纸段间**零文本空白**（img2 边界：「…(Mohanty et al., 2016).」off 1464 →
  「With regard…」off 1465 直连）——跨行空白串判据对此形态是空操作；
- 落库指纹唯一实例（underline quote「 systematic…」start=4692）经 pdfjs-dist
  布局导出定位=「A systematic」中 A 后的**同行词间空格**（同 item 内 y=419）
  ——属简报 §1 兼容面明令零变的词间空格类，非段首空白；
- **真根因**：浏览器把行尾空白区点击解析为 pdf.js **行 break 标记**
  （`<br role=presentation>`，零宽×~2 行高盒，x 在栏左缘）或纯空白项 span 的
  槽位；标记 **DOM 序（=PDF 内容流序）≠视觉序**——边界按 DOM 槽位起算视觉
  跳跃。两方向均实证：
  - 欠达：段末行尾空白点击→焦点=(textLayer,87)（br 槽），终点跳回 7 行前
    （quote 尾=「development of smart」，丢下半段 7 行）；
  - 过达（img2 类）：br 槽 DOM 序晚于下一段文本时，终点跳过下一段前数行。

**实现**（保持预裁的落点与结构：锚定层单点、纯函数可单测、双边界对称、
evaluate/SelectionLayer 零改）：`anchor-blank-snap.ts` 新域件——边界命中空白
标记（br 槽/纯空白 span 文本位）时按标记形态重解析：**br 恒吸附其盒带覆盖
视觉行中距 br 最近栏组的行尾**（盒 x 无意义）；**空白/空文本 span 按其字形
盒定向**（左侧最近同行文本→行尾；无左侧→右侧最近同行文本首字符=段首缩进
吸附）。`selectionToAnchor` 在偏移探测前对双边界归一化，快/慢路径最终锚定
同源（拖选期快路径瞬态不归一化，mouseup/settle 全量同帧覆盖吸收——INV-58
已知边界同族）。

## 2. 文件清单

| 文件 | 动作 | 说明 |
| --- | --- | --- |
| src/renderer/features/reader/anchor-blank-snap.ts | 新增 | 归一化域件（code ~133 行，≤250） |
| src/renderer/features/reader/anchor-serialize.ts | 修改 +11/-2 | selectionToAnchor 双边界归一化接线+头注 |
| tests/unit/renderer/anchor-blank-snap.test.ts | 新增 | 9 用例 always-active（不经 guardedDescribe） |
| scripts/audits/f-a10-{layout,findpage,para,para1,ws}.mjs | 新增 | 诊断探针（pdfjs-dist 布局导出，node 侧零 ABI 面） |
| scripts/audits/f-a10-diag{,2,3,4}-real.mjs + .raw.txt | 新增 | 真机三轮诊断+焦点直测（白名单拷库配方） |
| scripts/audits/f-a10-{red,green,mutation}.raw.txt | 新增 | 红/绿/变异证机器输出 |
| scripts/audits/f-a10-verify-real.mjs + verify-real{,2}.raw.txt | 新增 | 真机复测两轮（第一轮揭零尺寸标记误杀+br x 无意义，第二轮通过） |

未触碰：SelectionLayer/selection-evaluate/pdf-item-geometry/annotation-resolve*/
tests 既有文件/scripts 既有文件（F-A9 并发面与 f-a9-real.mjs 现存语法错误均
未动）。

## 3. 红→绿→变异红证（对最终代码形态）

- 红（M0 拆接线变异=最终测试文件对未接线实现的红证）：6 failed/3 passed
  （f-a10-red.raw.txt；3 通过=兼容面锁现行行为）；
- 绿：9/9（f-a10-green.raw.txt）；
- 变异（f-a10-mutation.raw.txt，均红）：
  - M1 br 分支判据死（tagName 恒不匹配）：3 failed；
  - M2 标记识别死（isBlankMarker 恒 false）：6 failed；
  - M3 视觉行过滤死（sameRow 恒 true）：3 failed；
- 还原=文件备份法（/tmp cp→变异→测→cp 还原→diff 三文件全空→备份删除）；
- 全量 `npm run test`：**160 文件/1507 用例全绿**（基线 159/1496+本票 9+
  F-A9 并发补证 +2——以实数申报）；typecheck/lint 干净；无 TODO/FIXME；
  UTF-8 中文可读验证过。

## 4. 真机复测对照（修复后 build，f-a10-verify-real2.raw.txt + 拷贝库查询）

| 面 | 修复前 | 修复后 | 判定 |
| --- | --- | --- | --- |
| G1 段末行尾空白释放（img2 手势·同排） | 落库 end=1022（丢末 7 行）；paint 止于 529.8 | 落库 **end=1465**（quote 尾=「(Mohanty et al., 2016).」，suffix=下段首「With regard」）；paint max bottom=540.3=段末行底 < 下段顶 542.8 | **过**（终点=本行行尾+预览带不跨段+保存链） |
| G2 浅下探释放（y+6，行间隙/下段盒顶） | 下段头带上 | 仍带上（end=1504）——文本位命中下段 span 内 offset 39 | 已知边界（见 §6） |
| G3 段首空白起点（ws 标记） | — | 本纸无可复现入场：唯一视口内 ws 标记=表格行内分隔（PWDMS 行），Chrome 解析到叠压文本 span；段落缩进均为定位式（无 ws 项） | 单测证明（用例 3）+申报 |

## 5. 边界语义表（三分）

| 形态 | 判据 | 语义 |
| --- | --- | --- |
| 跨行空白（br 槽/空白标记，DOM 序≠视觉序） | 元素槽位紧邻标记/文本位在纯空白 span 内 + 标记盒带覆盖视觉行 | br→本栏本行**行尾**（双边界同目标）；空白 span→盒左侧行尾/无左侧→行首。两方向跳跃均收口 |
| 栏间空白 | br 盒在栏左缘→距 br 最近栏组（本栏）行尾；空白 span 盒在栏间→**左栏**行尾（阅读序「本行行尾」）；文本位命中右栏首字符→**原生零变** | 与简报「栏间不吸附」条款的偏差：仅对标记槽位定向到左栏（几何解析层），文本位语义严格零变 |
| 词间空格（空格在非空白 span 内） | 文本位且父 span 非纯空白 | **原样零变**（含 quote 前导空格保留——落库指纹实例即此类，按简报 §1 兼容面不修） |

## 6. 已知边界与自裁申报

1. **文本位下探不可修（G2/img2 深放）**：释放点落入下一段 span 盒内的文本位
   （offset>0）与「刻意选到该处」在 DOM 态零信号差异——锚定层原理上不可分
   辨。修复此类需事件层（mouseup 坐标+自研 affinity 重解析），超出预裁落点
   （evaluate/SelectionLayer 零改），建议独立票裁决。
2. **预裁「跨行空白串」规则未实现**：证据证伪其在真纸为空操作（段间零空白）
   且无法覆盖词间空格指纹实例；实装的标记槽位归一化覆盖实际两方向机制。
   属诊断先行的机制修正，非偷工。
3. **起点面真机证据缺**：G3（段首空白起点→quote 无前导空格）仅单测证明；
   本纸无段落缩进 ws 项可复现。
4. 行容差 0.75×参考高、栏间断组 max(20px, 2.5×盒高)：量测侧简化判据（同
   annotation-anchor COLUMN_GAP 族），紧凑行距/双栏实测通过但未扫全库形态。
5. **并发会话交互**：F-A9 的 locks:apply 曾把我的新建文件扫入只读（已 attrib
   -R 继续编辑）；当前 manifest 哈希落后于本票测试文件终态——**主控收口时需
   locks:apply 重同步**（新文件已入 manifest 面）。全量数字 1507 含 F-A9 并发
   +2，段间衔接请以其收口实数对账。
6. 拖选期快路径瞬态带仍按原始边界渲染（预裁允许的已知边界；mouseup 同帧
   覆盖吸收，真机复测确认终态正确）。

## 7. 疑虑

- br 盒带（零宽×2 行高）与点击行的对应关系依赖 Chrome 挑中「盒带覆盖该行」
  的 br——本轮实测稳定（dx 3..100 全同槽），但其他 PDF 的 br 布局未扫面；
- 内容流序≠阅读序的极端 PDF（全文乱序）上，归一化产物与既有偏移口径同源
  （均为流序），不引入新差异，但行为面未验证。
