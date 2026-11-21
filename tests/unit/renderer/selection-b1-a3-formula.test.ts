// @vitest-environment jsdom
/**
 * [B1-U1] A3 公式区槽位偏移爆炸红测试（选区正确性战役 A1–A5，先红半场——
 * 2026-11-21；U2 按主控裁决 1(b) 改为控制器装配）。
 *
 * 探针定谳（b1-probe note.md F10/C5）：公式区 span 形态=正文（fs 7.97px）与
 * 上下标（fs 5.18px）/w=0 帽符基线字号分离+行内大空隙使 caret 落容器槽位；
 * S6b 槽位边界经 snapBlankBoundary 空白标记重定向后偏移区间映射到 DOM 序
 * 散布项（147 字符画出 56 块纵跨 y 175→863 整页灰底）。已选字符未被漏
 * （项几何链覆盖选区字符）——问题在边界解析。
 *
 * 修复单元 4（主控终裁）：偏移爆炸由单元 1 槽位解析覆盖（边界变正确文本位
 * 后 snapBlankBoundary 既有语义正常）；公式碎片矩形本身可接受（验收=不漏
 * 已选字符+无与选区无关孤块）。本用例锚该验收面。
 *
 * **装配（主控裁决 1(b)）**：无会话槽位形态在单元 1+2 后生产不可达——未授权
 * mousedown 被 preventDefault（无原生选区）、授权 mousedown 必有会话且槽位
 * 由 enforce 解析；探针 S6b 的槽位全部发生在活动会话内。故本件经
 * createSelectionDragController 复刻 S6b 真链：mousedown 落公式行内空隙
 * （无 span 命中→坍缩投影位）→ selectionchange 带槽位形态 → enforce →
 * 终局选区再跑 effectiveRangeOf/normalizedOffsetsOf/itemSelectionGeometry。
 * 断言面（区间 ≤ 公式行字符数 / 块数 ≤3 且不出公式行 y 带）逐字保持原合约。
 *
 * 夹具=合成 DOM+合成 items 单表驱动（同序同文本——偏移域恒对齐）；DOM 盒
 * 与项声明盒按同一 y-up 换算逐值一致（transform [fs,0,0,fs,x,400−y−0.8fs]）。
 */
import { afterEach, describe, expect, it } from 'vitest'
import { stubRectOf } from '../../utils/geometry'
import { createSelectionDragController } from '../../../src/renderer/features/reader/interact/selection-drag-controller'
import { effectiveRangeOf, normalizedOffsetsOf } from '../../../src/renderer/features/reader/interact/selection-effective-range'
import { itemSelectionGeometry } from '../../../src/renderer/features/reader/anchors/pdf-item-geometry'
import { fullTextOf } from '../../../src/renderer/features/reader/anchors/annotation-anchor'
import type { PdfTextItem, PdfTextStyle } from '../../../src/renderer/features/reader/anchors/geometry-types'

/** 页高（viewport 域 px——layer 盒与 item view 同域） */
const PAGE_H = 400
/** 公式行 y 带（viewport）：上标顶 196 至下标底 213（±容差=断言带 [190,216]） */
const FORMULA_Y = { top: 196, bottom: 213 }

/** 合成表：DOM span 与 PdfTextItem 单源（id/文本/盒/字号）——公式行碎片
 *  （正文 fs8+上标 fs5 基线上移+行内空隙空白标记+下标 fs5 基线下移）+
 *  下方 5 行正文+行尾空白标记（远距标记——容器槽位 child 指向的 DOM 位置）。 */
interface Frag {
  id: string
  text: string
  box: { top: number; bottom: number; left: number; right: number }
  fs: number
}
const FRAGS: Frag[] = [
  { id: 'F1', text: 'R(t)=', box: { top: 200, bottom: 208, left: 40, right: 97 }, fs: 8 },
  { id: 'SUP', text: 'n', box: { top: 196, bottom: 201, left: 99, right: 104 }, fs: 5 },
  { id: 'W1', text: '  ', box: { top: 200, bottom: 208, left: 110, right: 118 }, fs: 8 },
  { id: 'F2', text: 'k+1', box: { top: 200, bottom: 208, left: 124, right: 150 }, fs: 8 },
  { id: 'SUB', text: 'i', box: { top: 208, bottom: 213, left: 150, right: 155 }, fs: 5 },
  { id: 'B1', text: 'LINE ONE BODY', box: { top: 240, bottom: 248, left: 40, right: 200 }, fs: 8 },
  { id: 'B2', text: 'LINE TWO BODY', box: { top: 256, bottom: 264, left: 40, right: 200 }, fs: 8 },
  { id: 'B3', text: 'LINE THREE BODY', box: { top: 272, bottom: 280, left: 40, right: 200 }, fs: 8 },
  { id: 'B4', text: 'LINE FOUR BODY', box: { top: 288, bottom: 296, left: 40, right: 200 }, fs: 8 },
  { id: 'B5', text: 'LINE FIVE BODY', box: { top: 304, bottom: 312, left: 40, right: 200 }, fs: 8 },
  { id: 'W2', text: ' ', box: { top: 304, bottom: 312, left: 202, right: 206 }, fs: 8 }
]
const FORMULA_CHAR_COUNT = FRAGS.slice(0, 5).reduce((n, f) => n + f.text.length, 0)

const STYLES: Record<string, PdfTextStyle> = {
  g_body: { fontFamily: 'serif', ascent: 0.8, descent: -0.2, vertical: false },
  g_sup: { fontFamily: 'serif', ascent: 0.8, descent: -0.2, vertical: false }
}

function makeFormulaLayer(): {
  page: HTMLElement
  layer: HTMLElement
  items: PdfTextItem[]
  textOf: (id: string) => Text
  childIndexOf: (id: string) => number
} {
  const page = document.createElement('div')
  page.setAttribute('data-page-root', '1')
  const layer = document.createElement('div')
  layer.className = 'textLayer'
  stubRectOf(layer, { top: 0, bottom: PAGE_H, left: 0, right: 612 })
  const items: PdfTextItem[] = []
  for (const f of FRAGS) {
    const s = document.createElement('span')
    s.id = f.id
    s.textContent = f.text
    stubRectOf(s, f.box)
    layer.append(s)
    // 项声明几何（与 DOM 盒同源：transform[fs,0,0,fs,x,400−top−0.8fs]——
    // viewportTransformFor(view [0,0,612,400]) 逐值还原盒 top/left/w/h）
    items.push({
      str: f.text,
      dir: 'ltr',
      width: f.box.right - f.box.left,
      height: f.fs,
      transform: [f.fs, 0, 0, f.fs, f.box.left, PAGE_H - f.box.top - 0.8 * f.fs],
      fontName: f.fs === 8 ? 'g_body' : 'g_sup',
      hasEOL: false
    })
  }
  page.append(layer)
  document.body.append(page)
  return {
    page,
    layer,
    items,
    textOf: (id) => document.getElementById(id)!.firstChild as Text,
    childIndexOf: (id) => Array.prototype.indexOf.call(layer.children, document.getElementById(id))
  }
}

const sel = (): Selection => window.getSelection()!
const down = (ctl: { onMouseDown(e: MouseEvent): void }, target: Element, x: number, y: number): MouseEvent => {
  const ev = new MouseEvent('mousedown', { bubbles: true, cancelable: true, clientX: x, clientY: y })
  target.dispatchEvent(ev)
  ctl.onMouseDown(ev)
  return ev
}
const move = (x: number, y: number): void => {
  document.dispatchEvent(new MouseEvent('mousemove', { clientX: x, clientY: y }))
}

afterEach(() => {
  document.body.innerHTML = ''
  sel().removeAllRanges()
})

describe('B1-U1 A3 公式区槽位偏移爆炸（装配经控制器=复刻 S6b 真链——主控裁决 1(b)）', () => {
  /** S6b 终局形态装配（探针 F10）：mousedown 落公式行内空隙（x=106 在 SUP
   *  与 W1 之间的无 span 点——非 span 授权点→坍缩投影位）；随后原生拖选
   *  扩展（jsdom 无原生扩展，经 setBaseAndExtent 预置）把 focus 送进公式行
   *  span，控制器 selectionchange/enforce 解析边界。 */
  function presetS6b(): { f: ReturnType<typeof makeFormulaLayer>; ctl: ReturnType<typeof createSelectionDragController> } {
    const f = makeFormulaLayer()
    const ctl = createSelectionDragController({ pageRoot: f.page })
    const e = down(ctl, f.layer, 106, 204)
    // 非 span 授权点：不 preventDefault（原生扩展保持），锚=坍缩投影位
    expect(e.defaultPrevented).toBe(false)
    expect(sel().isCollapsed).toBe(true)
    expect(sel().anchorNode).toBe(f.textOf('SUP'))
    move(151, 205)
    // 原生拖选终态形态（S6b：起点坍缩位、终点=公式行内 span）
    sel().setBaseAndExtent(sel().anchorNode!, sel().anchorOffset, f.textOf('F2'), 3)
    ctl.onSelectionChange()
    ctl.enforce()
    return { f, ctl }
  }

  it('终局偏移区间 ⊆ 公式行字符数（槽位边界解析后不覆盖下方正文行）', () => {
    const { f } = presetS6b()
    const eff = effectiveRangeOf(sel())
    const offs = normalizedOffsetsOf(f.layer, eff, fullTextOf(f.layer))
    expect(offs).not.toBeNull()
    // 修复后边界解析为公式行文本位（区间 ⊆ 公式行 12 字符）；槽位未解析时
    // snapBlankBoundary 把槽位 child（W2）重定向到 B5 行尾 → 区间覆盖下方
    // 5 行正文（实测 70 字符）→ 红
    expect(offs!.end - offs!.start).toBeLessThanOrEqual(FORMULA_CHAR_COUNT)
  })

  it('区间映射的几何块无与选区无关孤块：块数 ≤3 且不出公式行 y 带', () => {
    const { f } = presetS6b()
    const eff = effectiveRangeOf(sel())
    const offs = normalizedOffsetsOf(f.layer, eff, fullTextOf(f.layer))
    expect(offs).not.toBeNull()
    const geo = itemSelectionGeometry({
      items: f.items,
      styles: STYLES,
      viewport: { scale: 1, rotate: 0, view: [0, 0, 612, PAGE_H] },
      start: offs!.start,
      end: offs!.end,
      base: { x: 0, y: 0, w: 612, h: PAGE_H }
    })
    expect(geo).not.toBeNull()
    // 槽位未解析时实测：SUB+下方 5 行各成块（6 块、y 240..312 散布全页）
    expect(geo!.rects.length).toBeLessThanOrEqual(3)
    for (const r of geo!.rects) {
      expect(r.y).toBeGreaterThanOrEqual((FORMULA_Y.top - 6) / PAGE_H)
      expect(r.y + r.h).toBeLessThanOrEqual((FORMULA_Y.bottom + 3) / PAGE_H)
    }
  })
})
