/**
 * [B1-RW] matchBand 错行绑带红测试（B1 批回炉——独立审查 B-1 定谳的合成等价）。
 *
 * 审查定谳（b1-review-s4b-coverage.mjs + 修后裁剪图）：S4b 手势修后 ri4/ri7/ri50
 * 整行漏绘——机制=源 rect 经 INV-D 行间钳制级联下推（公式密集区行块高 > 行距，
 * 钳制把 rect 逐行下推）后，matchBand 最近中心窗（|Δcenter| ≤ rect.h）把 rect
 * 绑到**邻行带**：本行漏绘+邻行同带双绘（同一机制两症状）。修前 ri6 单行未达
 * 覆盖门，修后三行未达=本机制回归面。
 *
 * 修复规格（设计稿 §5 单元 5e）=matchBand 候选带行一致性门：
 *  - 垂直重叠门（全档）：rect 与带垂直域交叠 >0 才可匹配（零重叠带不得经最近
 *    中心窗吸附）；无重叠候选 → undefined 回退 rect 自身几何（与 5b 拒带同路径）；
 *  - 档1 顶界一致门（rowFontH 在场）：rect.top ≥ band.top——档1 产链 rect 块与
 *    带同源同界+钳制只下推 → 跨行错绑（下推 rect 绑邻行带）的候选带 top 高于
 *    rect.top，被本门排除；已知边界=mergeRects④ 同中心混合字高中位归并可令
 *    rect.top 高于同源带顶亚像素级（review2 N-1 探针 0.25px）——同源带被过滤
 *    后重选同中心满足不变量带（⑧ 锚，无漏绘/双绘）。实测形态：钳制下推 rect
 *    以 0.85×带高的正重叠绑到下一行带
 *    （S4b rect13：src[271.55,283.13] → band15[276.33,284.3]）——重叠量阈值
 *    无法同时拒它并保留合法 0.89 同带绑定（S4b rect16），故用结构判据不用量阈值。
 *  - 档2/档3（rowFontH 缺席）不启用顶界门：行盒（rect）与字形带存在结构性
 *    偏移（行盒 ⊇ 字形带——selection-paint a1 实测 1px），门会破坏既有绑定。
 *
 * 红测试两族：
 *  1. 链级（漏绘+双绘）：手造 items 走真产品链 itemSelectionGeometry →
 *     matchBand → bandVertical/clampedHorizontal 渲染盒——4 行夹具（行距 10、
 *     行块高 14>行距=钳制级联材料）修前红：第 3 正文行零覆盖+两渲染盒同带
 *     叠涂；修后绿：4 行全覆盖+零交叠对。
 *  2. 纯 matchBand（错带）：零重叠邻行带不得返回（④）；顶界高于带顶的邻行带
 *     不得返回（⑤——S4b rect13 形态）；档2 语义零变锚（⑥）+合法同带锚（⑦）。
 */
import { describe, expect, it } from 'vitest'
import type { PdfTextItem, PdfTextStyle } from '../../../src/renderer/features/reader/anchors/geometry-types'
import type { AnnotationRect } from '@shared/models/annotation'
import { itemSelectionGeometry } from '../../../src/renderer/features/reader/anchors/pdf-item-geometry'
import { matchBand, type RowBand } from '../../../src/renderer/features/reader/anchors/annotation-resolve'
import { bandVertical, clampedHorizontal } from '../../../src/renderer/features/reader/anchors/annotation-style'

const BASE = { x: 0, y: 0, w: 612, h: 792 }
const VIEWPORT = { scale: 1, rotate: 0, view: [0, 0, 612, 792] as [number, number, number, number] }

/** 横排样式（ascent 0.8/descent −0.2——盒=基线上 0.8fs 到基线下 0.2fs） */
const STYLE_H: PdfTextStyle = { fontFamily: 'serif', ascent: 0.8, descent: -0.2, vertical: false }
const STYLES = { g1: STYLE_H }

/** 造项：transform=[fs,0,0,fs,x,y]（PDF 用户空间基线点；viewport 域基线 v=792−y） */
function mkItem(str: string, x: number, yPdf: number, fs: number, w: number): PdfTextItem {
  return { str, dir: 'ltr', width: w, height: fs, transform: [fs, 0, 0, fs, x, yPdf], fontName: 'g1', hasEOL: false }
}

/** 4 行夹具（viewport 基线 v=100/110/120/130，行距 10；每行=正文项 fs8@72 宽 60
 *  +高项 fs14@136 宽 8——行联合盒高 14>行距 10=钳制级联材料，x 缝 4<断段阈值
 *  max(1.5×14,0.02×612)=21 同段）。行块域 [v−11.2, v+2.8]：相邻行块垂直重叠
 *  4px → mergeRects 行间钳制把 rect2/3/4 逐行下推 4/8/12px，rect3 中心距
 *  band4 中心 2px（≤rect.h=14）而距本行 band3 中心 8px——修前最近中心绑 band4。 */
function crossbandItems(): PdfTextItem[] {
  const rows: PdfTextItem[] = []
  for (let i = 0; i < 4; i += 1) {
    const v = 100 + i * 10
    rows.push(mkItem(`BODY${i}`, 72, 792 - v, 8, 60))
    rows.push(mkItem('H', 136, 792 - v, 14, 8))
  }
  return rows
}

/** 渲染盒（px）：真产品模块语义——matchBand 命中带 → bandVertical/clampedHorizontal
 *  替换垂直/水平几何；带缺席 → rect 自身几何（SelectionPaint 渲染分支同构） */
function renderBoxesOf(rects: AnnotationRect[], bands: RowBand[], base: { w: number; h: number }): Array<{ left: number; right: number; top: number; bottom: number }> {
  return rects.map((r) => {
    const band = matchBand(bands, r)
    const vertical = band !== undefined ? bandVertical(band) : { top: `${r.y * 100}%`, height: `${r.h * 100}%` }
    const horizontal = band !== undefined ? clampedHorizontal(r, band) : { left: `${r.x * 100}%`, width: `${r.w * 100}%` }
    const top = (parseFloat(vertical.top) / 100) * base.h
    const bottom = top + (parseFloat(vertical.height) / 100) * base.h
    const left = (parseFloat(horizontal.left) / 100) * base.w
    const right = left + (parseFloat(horizontal.width) / 100) * base.w
    return { left, right, top, bottom }
  })
}

describe('B1-RW 链级：钳制下推 rect 错绑邻行带（漏绘+双绘——修前红，行一致门转绿）', () => {
  it('夹具自证：行块高 14>行距 10（钳制级联材料）+rect3 中心距 band4 中心 2px<本行 band3 8px（错绑判别面，不随修复变）', () => {
    const items = crossbandItems()
    const fullText = items.map((t) => t.str).join('')
    const geo = itemSelectionGeometry({ items, styles: STYLES, viewport: VIEWPORT, start: 0, end: fullText.length, base: BASE })
    expect(geo).not.toBeNull()
    // 钳制级联：终局 rects（y 升序）第 3 块顶=首块顶+2×块高 14=116.8（修前形态锚）
    const rects = [...geo!.rects].sort((a, b) => a.y - b.y)
    expect(rects.length).toBe(4)
    const tops = rects.map((r) => r.y * BASE.h)
    expect(tops[2]!).toBeCloseTo(116.8, 1)
    // 带域=行块真位（不随钳制变）：band3 域 [108.8,122.8]、band4 域 [118.8,132.8]
    const bands = [...geo!.bands].sort((a, b) => a.top - b.top)
    expect(bands.length).toBe(4)
    expect(bands[2]!.top * BASE.h).toBeCloseTo(108.8, 1)
    expect(bands[3]!.top * BASE.h).toBeCloseTo(118.8, 1)
  })

  it('① 逐正文行覆盖 oracle（垂直 ≥50%×盒高 且 水平 >0——修前第 3 行零覆盖红）', () => {
    const items = crossbandItems()
    const fullText = items.map((t) => t.str).join('')
    const geo = itemSelectionGeometry({ items, styles: STYLES, viewport: VIEWPORT, start: 0, end: fullText.length, base: BASE })
    expect(geo).not.toBeNull()
    const render = renderBoxesOf(geo!.rects, geo!.bands, BASE)
    const bodyBoxes = rectsForOffsetRangeOf(items)
    expect(bodyBoxes.length).toBe(4)
    for (const bb of bodyBoxes) {
      const covered = render.some((rb) => {
        const vOv = Math.min(rb.bottom, bb.top + bb.h) - Math.max(rb.top, bb.top)
        const hOv = Math.min(rb.right, bb.left + bb.w) - Math.max(rb.left, bb.left)
        return vOv >= 0.5 * bb.h && hOv > 0
      })
      expect(covered).toBe(true)
    }
  })

  it('② 无同带满条纹双绘（任两渲染盒垂直重合 ≥90%×矮盒高=同带双涂——修前 rect3/rect4 同绑 band4 同域叠涂红；相邻带域的边缘交叠非双绘不在判据内——行块高>行距的带域天然交叠，同 S4b 真机残差对）', () => {
    const items = crossbandItems()
    const fullText = items.map((t) => t.str).join('')
    const geo = itemSelectionGeometry({ items, styles: STYLES, viewport: VIEWPORT, start: 0, end: fullText.length, base: BASE })
    expect(geo).not.toBeNull()
    const render = renderBoxesOf(geo!.rects, geo!.bands, BASE)
    for (let i = 0; i < render.length; i += 1) {
      for (let j = i + 1; j < render.length; j += 1) {
        const a = render[i]!
        const b = render[j]!
        const vOv = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
        const hOv = Math.min(a.right, b.right) - Math.max(a.left, b.left)
        const stripe = vOv >= 0.9 * Math.min(a.bottom - a.top, b.bottom - b.top)
        expect(!(stripe && hOv > 0)).toBe(true)
      }
    }
  })
})

/** 正文项像素盒（fs8 项——覆盖 oracle 的行真值；手算盒=[v−6.4, v+1.6]） */
function rectsForOffsetRangeOf(items: PdfTextItem[]): Array<{ left: number; top: number; w: number; h: number }> {
  return items
    .filter((t) => t.transform[0] === 8)
    .map((t) => {
      const v = 792 - t.transform[5]!
      return { left: t.transform[4]!, top: v - 6.4, w: t.width, h: 8 }
    })
}

describe('B1-RW 纯 matchBand：行一致性门（错带直接断言）', () => {
  const band = (top: number, bottom: number, rowFontH: number): RowBand => ({
    top,
    bottom,
    center: (top + bottom) / 2,
    x0: 0.1,
    x1: 0.9,
    rowFontH
  })

  it('④ 零重叠邻行带：rect 中心距邻带中心 ≤rect.h 但垂直域不重叠 → 不得返回邻带（修前红=返回邻带）；本行带在窗外 → undefined 回退', () => {
    // 邻带 [0.20,0.21]、本行带 [0.30,0.31]；rect [0.21,0.23]（中心 0.22：距邻带
    // 中心 0.205 差 0.015 ≤ rect.h 0.02；距本带中心 0.305 差 0.085 > 0.02 窗外）
    const bands = [band(0.3, 0.31, 0.0126), band(0.2, 0.21, 0.0126)]
    const r: AnnotationRect = { page: 0, x: 0.1, y: 0.21, w: 0.5, h: 0.02 }
    const m = matchBand(bands, r)
    expect(m).toBeUndefined()
  })

  it('⑤ 顶界高于带顶（S4b rect13 形态：正重叠 0.85×带高+top 低于带顶 4.78px@793）→ 不得返回该带；返回与本行域重叠的上行带', () => {
    // bandP（上行带 [0.2659,0.2777]）与 bandN（下一行带 [0.276,0.284]）垂直域重叠；
    // rect [0.2716,0.2862]（中心 0.2789）：距 bandN 中心 0.28 差 1.1e-3、距 bandP
    // 中心 0.2718 差 7.1e-3——修前最近中心绑 bandN（错行）；门后 bandN 顶界
    // 0.276 > rect.top 0.2716 拒用 → bandP（top 0.2659 ≤ 0.2716 且正重叠）
    const bands = [band(0.276, 0.284, 0.01), band(0.2659, 0.2777, 0.01)]
    const r: AnnotationRect = { page: 0, x: 0.1, y: 0.2716, w: 0.5, h: 0.0146 }
    const m = matchBand(bands, r)
    expect(m).not.toBeUndefined()
    expect(m!.top).toBeCloseTo(0.2659, 6)
    expect(m!.bottom).toBeCloseTo(0.2777, 6)
  })

  it('⑥a 垂直重叠门全档（含档2）：零重叠邻带（rowFontH 缺席）亦不得经最近中心窗返回（修前红=返回邻带）', () => {
    const bands: RowBand[] = [
      { top: 0.3, bottom: 0.31, center: 0.305, x0: 0.1, x1: 0.9 },
      { top: 0.2, bottom: 0.21, center: 0.205, x0: 0.1, x1: 0.9 }
    ]
    const r: AnnotationRect = { page: 0, x: 0.1, y: 0.21, w: 0.5, h: 0.02 }
    expect(matchBand(bands, r)).toBeUndefined()
  })

  it('⑥b 档2 顶界门不启用锚（a1/a2 面回退语义锁）：rect 顶高于带顶（行盒 ⊇ 字形带的半前导偏移形态）但正重叠 → 仍返回本带（修前修后同值恒绿）', () => {
    // 档2 带（rowFontH 缺席）[0.2513,0.2713]；rect 行盒 [0.25,0.275]——顶高于
    // 带顶 0.0013（1px@800，selection-paint a1 实测形态）且全域重叠
    const bands: RowBand[] = [{ top: 0.2513, bottom: 0.2713, center: 0.2613, x0: 0.1, x1: 0.9 }]
    const r: AnnotationRect = { page: 0, x: 0.1, y: 0.25, w: 0.5, h: 0.025 }
    const m = matchBand(bands, r)
    expect(m).not.toBeUndefined()
    expect(m!.top).toBeCloseTo(0.2513, 6)
    expect(m!.bottom).toBeCloseTo(0.2713, 6)
  })

  it('⑦ 合法同带锚（rect 与带同源同界）：返回本带零变（修前修后同值）', () => {
    const bands = [band(0.25, 0.26, 0.0126)]
    const r: AnnotationRect = { page: 0, x: 0.1, y: 0.25, w: 0.5, h: 0.01 }
    const m = matchBand(bands, r)
    expect(m).not.toBeUndefined()
    expect(m!.top).toBeCloseTo(0.25, 6)
    expect(m!.bottom).toBeCloseTo(0.26, 6)
  })

  it('⑧ N-1 混合字高同中心归并锚（mergeRects④ 中位归并 rect 顶高于同源带顶 0.25px）：同源带被顶界门过滤 → 重选同中心满足不变量带（重选语义固定，修后行为锚——review2 N-1）', () => {
    // 复审 N-1 探针夹具（rework/review2/mixed-height-normal-probe.mjs 逐值）：
    // 同中心三源（fs8.5/9/10 基线 125.875/128/130.5——相邻差 2.125/2.5>tol 2
    // 拆三带；tol 被远处 fs1 四项压低=max(2,0.5×中位 1)=2）+mergeRects④ 行内
    // 归并成单 rect [123.5,132.5]。同源带 [123.75,132.25]（rowFontH 8.5）顶
    // 123.75>rect 顶 123.5 → 顶界门过滤；带 [123.5,132.5]（rowFontH 9）满足
    // rect.top ≥ band.top → 重选。视觉差 0.25px 无漏绘/双绘（A/B 实测）。
    const st = (ascent: number): PdfTextStyle => ({ fontFamily: 'serif', ascent, descent: -0.2, vertical: false })
    const styles: Record<string, PdfTextStyle> = { small: st(0.25), mid: st(0.5), big: st(0.75), tiny: st(0.8) }
    const items: PdfTextItem[] = [
      { str: 'small', dir: 'ltr', width: 60, height: 8.5, transform: [8.5, 0, 0, 8.5, 72, 792 - 125.875], fontName: 'small', hasEOL: false },
      { str: 'mid', dir: 'ltr', width: 60, height: 9, transform: [9, 0, 0, 9, 72, 792 - 128], fontName: 'mid', hasEOL: false },
      { str: 'big', dir: 'ltr', width: 60, height: 10, transform: [10, 0, 0, 10, 72, 792 - 130.5], fontName: 'big', hasEOL: false },
      { str: 'a', dir: 'ltr', width: 60, height: 1, transform: [1, 0, 0, 1, 400, 792 - 600], fontName: 'tiny', hasEOL: false },
      { str: 'b', dir: 'ltr', width: 60, height: 1, transform: [1, 0, 0, 1, 400, 792 - 610], fontName: 'tiny', hasEOL: false },
      { str: 'c', dir: 'ltr', width: 60, height: 1, transform: [1, 0, 0, 1, 400, 792 - 620], fontName: 'tiny', hasEOL: false },
      { str: 'd', dir: 'ltr', width: 60, height: 1, transform: [1, 0, 0, 1, 400, 792 - 630], fontName: 'tiny', hasEOL: false }
    ]
    const total = items.reduce((n, it) => n + it.str.length, 0)
    const geo = itemSelectionGeometry({ items, styles, viewport: VIEWPORT, start: 0, end: total, base: BASE })
    expect(geo).not.toBeNull()
    const rect = geo!.rects.find((r) => Math.abs((r.y + r.h / 2) * BASE.h - 128) < 1e-6)
    const sameCenterBands = geo!.bands.filter((b) => Math.abs(b.center * BASE.h - 128) < 1e-6)
    expect(rect).toBeDefined()
    expect(sameCenterBands.length).toBeGreaterThanOrEqual(2) // 拆行三带在（N-1 形态在场）
    const m = matchBand(geo!.bands, rect!)
    expect(m).not.toBeUndefined()
    // 重选语义：返回带顶不高于 rect 顶（顶界不变量）+与 rect 垂直正重叠 ≥90%（视觉等位）
    expect(m!.top).toBeLessThanOrEqual(rect!.y + 1e-9)
    expect(Math.min(m!.bottom, rect!.y + rect!.h) - Math.max(m!.top, rect!.y)).toBeGreaterThanOrEqual(0.9 * rect!.h)
  })
})
