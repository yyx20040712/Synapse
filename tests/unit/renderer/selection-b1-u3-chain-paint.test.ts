/**
 * [B1-U3] R1 公式密集双绘红测试（选区正确性战役单元 5a+5b，先红半场——2026-11-21）。
 *
 * 探针定谳（b1-probe2 note.md §4/§6 + chain-G5f-gutter-end.json）：G5f 左栏公式
 * 密集区 rect 两两交叠 5 对，主对垂直重叠 7.97px（像素实测双绘条纹 163 vs 邻行
 * 203≈0.36 层）。机制链：
 *  - M1（根）groupByBaseline 与「上一成员 vTail」比距——公式碎片（fs5.58）相邻
 *    vProj 差 2.89 ≤ tol 3.985 逐步传递，把两行正文链成一行（链行 vSpread
 *    14.23px > 行距 10.44；pdfRows 57 < domRows 59）；
 *  - M2（直接画手）bandVertical 用带垂直几何替换 rect 垂直几何——链行两 x 段的
 *    带 [0.5774,0.6049]/[0.5949,0.6222] 交叠 7.94px，rect 本身不重叠（INV-A
 *    成立）→ 两 div 同屏叠涂；
 *  - M4（放大）calibrateBandsWithSpans 把带撑到两行 span 并集（21.84px）。
 *
 * 修复单元 5a（行锚断链+碎片 x/y 邻接并入）+5b（异常带护栏）后转绿：
 *  - 5a 断传递链：簇界比较改「行锚」（簇首成员 vProj），碎片行按 y 包络重叠+
 *    x 净空最近并入正文行——链行拆回两个正文行；
 *  - 5b 异常带不驱动渲染：带垂直域高 > BAND_GUARD_ROW_RATIO×行主导字高（1.3）
 *    的带在 matchBand 拒用 → 渲染回退 rect 自身 y/h（INV-D 钳制保证不重叠）。
 *
 * 本文件在**当前产品代码**上呈红（红驱动=断言 ①渲染盒两两垂直不重叠：现树
 * 链行两段带垂直域交叠 3.5px）；断言 ②/③ 为修复契约锚（现树已绿，修复后必须
 * 保持绿）：
 *  - ② 终局 rects 两两垂直不重叠（INV-A/INV-D——修复不得经 rects 路线作弊）；
 *  - ③ 逐正文行覆盖 oracle（垂直重叠 ≥50%×行盒高 且 水平重叠 >0——修复不得
 *    经「拒用全部带」退化为漏行）。
 *
 * 渲染盒=真产品模块链（itemSelectionGeometry 产物 rects/bands → matchBand →
 * bandVertical+clampedHorizontal 语义）逐值计算——b1-probe2 chain.mjs 已证该
 * Node 侧链与页面真实渲染盒差 ≤1px（60/60 rect）。夹具=createFormulaChainPdf
 * （真 pdfjs 加载；链行碎片 vProj 台阶 3≤tol 3.25、行距 16、左右段 x 缝
 * 56.7pt>断段阈值——红判别几何自证断言不复制字面量）。
 */
import { describe, expect, it } from 'vitest'
import { createFormulaChainPdf, PDF_CHAIN_GEOM } from '../../utils/pdf-factory'
import { COLUMN_GAP_H_FACTOR, COLUMN_GAP_PAGE_RATIO } from '../../../src/renderer/features/reader/anchors/geometry-types'
import type { PdfTextItem, PdfTextStyle } from '../../../src/renderer/features/reader/anchors/geometry-types'
import type { AnnotationRect } from '@shared/models/annotation'
import { itemSelectionGeometry, rectsForOffsetRange, baselineGroupBlocks, bandsFromItems } from '../../../src/renderer/features/reader/anchors/pdf-item-geometry'
import { matchBand, type RowBand } from '../../../src/renderer/features/reader/anchors/annotation-resolve'
import { bandVertical, clampedHorizontal } from '../../../src/renderer/features/reader/anchors/annotation-style'

/** 真 pdfjs 提取公式链行页项集（剔空串项——与 buildItemOffsets 拼接口径一致） */
async function chainItems(): Promise<{ items: PdfTextItem[]; styles: Record<string, PdfTextStyle> }> {
  const { getDocument } = await import('pdfjs-dist')
  const pdf = await getDocument({ data: createFormulaChainPdf() }).promise
  const page = await pdf.getPage(1)
  const tc = (await page.getTextContent()) as unknown as {
    items: PdfTextItem[]
    styles: Record<string, PdfTextStyle>
  }
  await pdf.destroy()
  return { items: tc.items.filter((t) => t.str.length > 0), styles: tc.styles }
}

/** 渲染盒（px）：真模块语义——matchBand 命中带 → bandVertical/clampedHorizontal
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

const BASE = { x: 0, y: 0, w: 612, h: 792 }
const VIEWPORT = { scale: 1, rotate: 0, view: [0, 0, 612, 792] as [number, number, number, number] }

describe('B1-U3 R1 公式链行双绘（先红半场——现产品代码呈红，单元 5a+5b 转绿）', () => {
  it('红判别几何自证：链行材料（相邻 vProj 差 ≤tol 跨行距传递）+行内 x 缝 > 断段阈值', async () => {
    const { items, styles } = await chainItems()
    const { boxes, tolPx } = rectsForOffsetRange(items, styles, VIEWPORT, 0, items.map((t) => t.str).join('').length)
    // tol=被选项 fontH 下中位口径不变（6 正文/碎片项 → 下中位=fs6.5 → 3.25）
    expect(tolPx).toBeCloseTo(Math.max(2, 0.5 * PDF_CHAIN_GEOM.scriptSize), 6)
    const vSorted = boxes.map((b) => b.vProj).sort((a, b) => a - b)
    // 链行区 [88,110]（两正文行 vProj 92/108，行距 16）内相邻差全 ≤tol=传递链材料
    const chainZone = vSorted.filter((v) => v >= 88 && v <= 110)
    expect(chainZone.length).toBeGreaterThanOrEqual(8)
    for (let i = 1; i < chainZone.length; i += 1) {
      expect(chainZone[i]! - chainZone[i - 1]!).toBeLessThanOrEqual(tolPx)
    }
    // 行距（两正文行 vProj 差 16）> tol——链行吞行的判别面（传递链才能跨过它）
    expect(PDF_CHAIN_GEOM.pitch).toBeGreaterThan(tolPx)
    // 左右段 x 缝 > 断段阈值 max(1.5×行联合盒高, 2%×页宽)——行内断段材料
    const leftRight = Math.max(...boxes.filter((b) => b.vProj <= 100).map((b) => b.rect.x + b.rect.w))
    const rightLeft = Math.min(...boxes.filter((b) => b.vProj >= 100 && b.vProj <= 110).map((b) => b.rect.x))
    const unionTop = Math.min(...boxes.filter((b) => b.vProj <= 110).map((b) => b.rect.y))
    const unionBottom = Math.max(...boxes.filter((b) => b.vProj <= 110).map((b) => b.rect.y + b.rect.h))
    const threshold = Math.max(COLUMN_GAP_H_FACTOR * (unionBottom - unionTop), COLUMN_GAP_PAGE_RATIO * 612)
    expect(rightLeft - leftRight).toBeGreaterThan(threshold)
  })

  it('① 渲染盒两两垂直不重叠（bandVertical 带几何替换不得产生叠涂——现树链行两段带交叠 3.5px——红）', async () => {
    const { items, styles } = await chainItems()
    const geo = itemSelectionGeometry({ items, styles, viewport: VIEWPORT, start: 0, end: items.map((t) => t.str).join('').length, base: BASE })
    expect(geo).not.toBeNull()
    const render = renderBoxesOf(geo!.rects, geo!.bands, BASE).sort((a, b) => a.top - b.top)
    for (let i = 1; i < render.length; i += 1) {
      expect(render[i]!.top - render[i - 1]!.bottom).toBeGreaterThanOrEqual(-1e-6)
    }
  })

  it('② 契约锚（现绿——修复后必须保持）：终局 rects 两两垂直不重叠（INV-A/INV-D 不经修复回退）', async () => {
    const { items, styles } = await chainItems()
    const geo = itemSelectionGeometry({ items, styles, viewport: VIEWPORT, start: 0, end: items.map((t) => t.str).join('').length, base: BASE })
    const rects = [...geo!.rects].sort((a, b) => a.y - b.y)
    for (let i = 1; i < rects.length; i += 1) {
      expect(rects[i]!.y - (rects[i - 1]!.y + rects[i - 1]!.h)).toBeGreaterThanOrEqual(-1e-9)
    }
  })

  it('③ 契约锚（现绿——修复后必须保持）：每个正文行盒被 ≥1 渲染盒覆盖（垂直 ≥50%×盒高 且 水平 >0——拒带修复不得退化为漏行）', async () => {
    const { items, styles } = await chainItems()
    const fullText = items.map((t) => t.str).join('')
    const { boxes } = rectsForOffsetRange(items, styles, VIEWPORT, 0, fullText.length)
    const geo = itemSelectionGeometry({ items, styles, viewport: VIEWPORT, start: 0, end: fullText.length, base: BASE })
    const render = renderBoxesOf(geo!.rects, geo!.bands, BASE)
    // 真字面项过滤：pdfjs 行内补位空白项 fontH 随邻项但 height=0——盒高 >0 才是实体项
    const bodyBoxes = boxes.filter((b) => b.fontH === PDF_CHAIN_GEOM.bodySize && b.rect.h > 0)
    expect(bodyBoxes.length).toBe(4)
    for (const bb of bodyBoxes) {
      const covered = render.some((rb) => {
        const vOv = Math.min(rb.bottom, bb.rect.y + bb.rect.h) - Math.max(rb.top, bb.rect.y)
        const hOv = Math.min(rb.right, bb.rect.x + bb.rect.w) - Math.max(rb.left, bb.rect.x)
        return vOv >= 0.5 * bb.rect.h && hOv > 0
      })
      expect(covered).toBe(true)
    }
  })

  it('④ [B1-RW W-1] 行分组产物结构锚（INV-179 产物级回归面——M2 隔离变异红证）：链行区块/带数=2（左右段）且正文行 vProj 行归属唯一（M2 删碎片并入→碎片行独立 4 块/4 带红；注：本夹具左右段 x 分裂使 vTail 传递链产物与行锚逐值同——M1 判别面=⑤）', async () => {
    const { items, styles } = await chainItems()
    const fullText = items.map((t) => t.str).join('')
    const { boxes, tolPx } = rectsForOffsetRange(items, styles, VIEWPORT, 0, fullText.length)
    const chainZone: [number, number] = [88, 110]
    const bodyVs = [...new Set(boxes
      .filter((b) => b.fontH === PDF_CHAIN_GEOM.bodySize && b.rect.h > 0 && b.vProj >= chainZone[0] && b.vProj <= chainZone[1])
      .map((b) => b.vProj))].sort((a, b) => a - b)
    expect(bodyVs.length).toBe(2)
    const blocks = baselineGroupBlocks(boxes, tolPx, BASE.w).filter((b) => b.y < chainZone[1] && b.y + b.h > chainZone[0])
    const bands = bandsFromItems(boxes, BASE, tolPx).filter((b) => b.center * BASE.h >= chainZone[0] && b.center * BASE.h <= chainZone[1])
    // 行数=2（左右段各一行一块/一带）：碎片并入后无独立碎片行；M2 删并入 →
    // 碎片行独立 → 链行区 4 块/4 带红
    expect(blocks.length).toBe(2)
    expect(bands.length).toBe(2)
    // 行归属唯一性：每正文 vProj 恰被一带包含（行锚断簇+碎片并入的行归属
    // 结构；M2 后正文带域收窄仍各自唯一——计数是本夹具的红判别面）
    for (const v of bodyVs) {
      const containing = bands.filter((b) => b.top * BASE.h <= v && b.bottom * BASE.h >= v)
      expect(containing.length).toBe(1)
    }
    // blocks 同构（同一 groupByBaseline 产物——rects/bands 同源 INV-58 面锚）
    for (const v of bodyVs) {
      const containing = blocks.filter((b) => b.y <= v && b.y + b.h >= v)
      expect(containing.length).toBe(1)
    }
  })

  it('⑤ [B1-RW W-1] M1 判别面（同段跨行桥接夹具——手造 items 产物级断言）：行锚断簇+碎片并入 → 双正文行两带、每带至多含一个正文行 vProj（M1 恢复 vTail 传递链→同段链成单带含双正文行红）', () => {
    // 同 x 段内 vProj 阶梯桥接：正文1@92、碎片@95/98.25/101.5（相邻差全
    // ≤tol=max(2,0.5×6.5)=3.25=vTail 传递链材料）、正文2@104.75。行锚：98.25
    // 距簇首 92 差 6.25>tol 断簇（碎片行 [98.25,101.5] 经碎片并入回正文1 行）；
    // vTail：与上一成员比距全 ≤tol → 双正文行链成单行=单带跨双正文行。
    const style = { fontFamily: 'serif', ascent: 0.8, descent: -0.2, vertical: false }
    const styles = { g1: style }
    const mk = (str: string, fs: number, v: number): PdfTextItem => ({
      str, dir: 'ltr', width: 60, height: fs,
      transform: [fs, 0, 0, fs, 72, 792 - v], fontName: 'g1', hasEOL: false
    })
    const items = [mk('body1', 8, 92), mk('f1', 6.5, 95), mk('f2', 6.5, 98.25), mk('f3', 6.5, 101.5), mk('body2', 8, 104.75)]
    const fullText = items.map((t) => t.str).join('')
    const { boxes, tolPx } = rectsForOffsetRange(items, styles, VIEWPORT, 0, fullText.length)
    expect(tolPx).toBeCloseTo(3.25, 6)
    const bodyVs = boxes.filter((b) => b.fontH === 8).map((b) => b.vProj).sort((a, b) => a - b)
    expect(bodyVs.length).toBe(2)
    const blocks = baselineGroupBlocks(boxes, tolPx, BASE.w)
    const bands = bandsFromItems(boxes, BASE, tolPx)
    // 行锚+碎片并入：双正文行两带（碎片行并入后无独立行）；M1 vTail → 单带红
    expect(blocks.length).toBe(2)
    expect(bands.length).toBe(2)
    // 行成员结构：每带至多含一个正文行 vProj（M1 下单带含双正文行 → 红）；
    // 每正文行恰被一带包含
    for (const b of bands) {
      const inside = bodyVs.filter((v) => b.top * BASE.h <= v && b.bottom * BASE.h >= v)
      expect(inside.length).toBeLessThanOrEqual(1)
    }
    for (const v of bodyVs) {
      const containing = bands.filter((b) => b.top * BASE.h <= v && b.bottom * BASE.h >= v)
      expect(containing.length).toBe(1)
    }
  })
})
