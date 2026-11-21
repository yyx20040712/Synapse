/**
 * [B1-U3] R2 机构正文行零覆盖红测试（选区正确性战役单元 5a+5c，先红半场——
 * 2026-11-21）。
 *
 * 探针定谳（b1-probe2 note.md §3 + chain-A5a-body-down.json）：A5a 页 1 机构块
 * 选区 286 字符含 b/c/d 三条机构正文行，正文行零覆盖（body 区亮度 227-232=
 * 未上色；仅行首上标处 3px 灰条；"State Key Laboratory…" 行 rectCount=0）。
 * 机制链：
 *  - M1（根）groupByBaseline 容差随被选项字高中位漂移——上标 fs4.46 主导时
 *    tol=max(2,0.5×4.46)=2.23，sup/body vProj 差 2.835>tol → 拆行（形态①）；
 *  - M3（次因）mergeRects 把 M1 拆开的 sup/body 块按 centerY 再并=261px 宽×
 *    4.46px 高杂交 rect（行簇内 x 断段已治跨栏并、未治同 x 域 centerY 再并）；
 *  - M2（直接杀手）matchBand 最近中心把杂交 rect 吸到 3px 上标带（d=0）+
 *    clampedHorizontal 把宽 rect 压缩进窄带 → 正文 256px 零覆盖。
 *
 * 修复单元 5a（行锚+碎片 x/y 邻接并入——上标与正文同行，杂交材料消失）+
 * 5c（clampedHorizontal 禁压缩：rect 水平域 ⊇ 带水平域时用 rect 自身 x/w——
 * 夹取只允许收窄溢出端，不把更宽 rect 压进窄带）后转绿。
 *
 * 红判据=覆盖 oracle（b1-probe2 逐行审计口径）：每个正文行项盒必须存在渲染盒
 * 与其垂直重叠 ≥50%×盒高 且 水平重叠 >0——现树渲染盒=上标列 4.5px 窄条，
 * 正文行水平重叠=0 → 红。另附 rects 两两不重叠契约锚（现绿，修复后保持）。
 *
 * 渲染盒=真产品模块链（itemSelectionGeometry → matchBand → bandVertical+
 * clampedHorizontal）；夹具=createSuperscriptSplitPdf（真 pdfjs 加载——A5a
 * 形态①合成等价：上标 fs5 基线抬升 3pt、正文 fs8、x 缝 ≈1.7pt；红判别几何
 * 自证断言不复制字面量）。
 */
import { describe, expect, it } from 'vitest'
import { createSuperscriptSplitPdf, PDF_AFFIL_SPLIT_GEOM } from '../../utils/pdf-factory'
import { COLUMN_GAP_H_FACTOR, COLUMN_GAP_PAGE_RATIO } from '../../../src/renderer/features/reader/anchors/geometry-types'
import type { PdfTextItem, PdfTextStyle } from '../../../src/renderer/features/reader/anchors/geometry-types'
import { itemSelectionGeometry, rectsForOffsetRange, baselineGroupBlocks, bandsFromItems } from '../../../src/renderer/features/reader/anchors/pdf-item-geometry'
import { matchBand, type RowBand } from '../../../src/renderer/features/reader/anchors/annotation-resolve'
import { bandVertical, clampedHorizontal } from '../../../src/renderer/features/reader/anchors/annotation-style'
import type { AnnotationRect } from '@shared/models/annotation'

async function affilItems(): Promise<{ items: PdfTextItem[]; styles: Record<string, PdfTextStyle> }> {
  const { getDocument } = await import('pdfjs-dist')
  const pdf = await getDocument({ data: createSuperscriptSplitPdf() }).promise
  const page = await pdf.getPage(1)
  const tc = (await page.getTextContent()) as unknown as {
    items: PdfTextItem[]
    styles: Record<string, PdfTextStyle>
  }
  await pdf.destroy()
  return { items: tc.items.filter((t) => t.str.length > 0), styles: tc.styles }
}

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

describe('B1-U3 R2 机构上标拆行零覆盖（先红半场——现产品代码呈红，单元 5a+5c 转绿）', () => {
  it('红判别几何自证：sup/body vProj 差 > tol（容差漂移拆行材料）+sup/body x 缝 < 断段阈值（再并材料）', async () => {
    const { items, styles } = await affilItems()
    const { boxes, tolPx } = rectsForOffsetRange(items, styles, VIEWPORT, 0, items.map((t) => t.str).join('').length)
    // 真字面项过滤：pdfjs 行内补位空白项 fontH 随邻项但 height=0——盒高 >0 才是实体项
    const sups = boxes.filter((b) => b.fontH === PDF_AFFIL_SPLIT_GEOM.supSize && b.rect.h > 0).sort((a, b) => a.vProj - b.vProj)
    const bodies = boxes.filter((b) => b.fontH === PDF_AFFIL_SPLIT_GEOM.bodySize && b.rect.h > 0).sort((a, b) => a.vProj - b.vProj)
    expect(sups).toHaveLength(PDF_AFFIL_SPLIT_GEOM.rows)
    expect(bodies).toHaveLength(PDF_AFFIL_SPLIT_GEOM.rows)
    for (let i = 0; i < sups.length; i += 1) {
      // 拆行材料：抬升 3pt 的 vProj 差 > 被选中位容差（现树 tol=2.5）
      expect(bodies[i]!.vProj - sups[i]!.vProj).toBeGreaterThan(tolPx)
      // 再并材料：x 缝 < 行簇断段阈值（mergeRects centerY 容差再并的材料面）
      const gap = bodies[i]!.rect.x - (sups[i]!.rect.x + sups[i]!.rect.w)
      expect(gap).toBeGreaterThan(0)
      expect(gap).toBeLessThan(Math.max(COLUMN_GAP_H_FACTOR * bodies[i]!.rect.h, COLUMN_GAP_PAGE_RATIO * 612))
    }
  })

  it('覆盖 oracle：每个机构正文行盒存在渲染盒垂直重叠 ≥50%×盒高 且 水平重叠 >0（现树渲染=上标列窄条，正文零覆盖——红）', async () => {
    const { items, styles } = await affilItems()
    const fullText = items.map((t) => t.str).join('')
    const { boxes } = rectsForOffsetRange(items, styles, VIEWPORT, 0, fullText.length)
    const geo = itemSelectionGeometry({ items, styles, viewport: VIEWPORT, start: 0, end: fullText.length, base: BASE })
    expect(geo).not.toBeNull()
    const render = renderBoxesOf(geo!.rects, geo!.bands, BASE)
    const bodyBoxes = boxes.filter((b) => b.fontH === PDF_AFFIL_SPLIT_GEOM.bodySize && b.rect.h > 0)
    expect(bodyBoxes).toHaveLength(PDF_AFFIL_SPLIT_GEOM.rows)
    for (const bb of bodyBoxes) {
      const covered = render.some((rb) => {
        const vOv = Math.min(rb.bottom, bb.rect.y + bb.rect.h) - Math.max(rb.top, bb.rect.y)
        const hOv = Math.min(rb.right, bb.rect.x + bb.rect.w) - Math.max(rb.left, bb.rect.x)
        return vOv >= 0.5 * bb.rect.h && hOv > 0
      })
      expect(covered).toBe(true)
    }
  })

  it('契约锚（现绿——修复后必须保持）：终局 rects 两两垂直不重叠（INV-A/INV-D 不经修复回退）', async () => {
    const { items, styles } = await affilItems()
    const geo = itemSelectionGeometry({ items, styles, viewport: VIEWPORT, start: 0, end: items.map((t) => t.str).join('').length, base: BASE })
    const rects = [...geo!.rects].sort((a, b) => a.y - b.y)
    for (let i = 1; i < rects.length; i += 1) {
      expect(rects[i]!.y - (rects[i - 1]!.y + rects[i - 1]!.h)).toBeGreaterThanOrEqual(-1e-9)
    }
  })

  it('[B1-RW W-1] 行分组产物结构锚（INV-179 产物级回归面——隔离变异红证）：机构行块/带数=3 且每带同时含本行上标与正文 vProj（M2 删碎片并入→上标行独立 6 块/6 带红）', async () => {
    const { items, styles } = await affilItems()
    const fullText = items.map((t) => t.str).join('')
    const { boxes, tolPx } = rectsForOffsetRange(items, styles, VIEWPORT, 0, fullText.length)
    // 真字面项过滤：pdfjs 行内补位空白项 fontH 随邻项但 height=0——盒高 >0 才是实体项
    const supVs = boxes.filter((b) => b.fontH === PDF_AFFIL_SPLIT_GEOM.supSize && b.rect.h > 0).map((b) => b.vProj).sort((a, b) => a - b)
    const bodyVs = boxes.filter((b) => b.fontH === PDF_AFFIL_SPLIT_GEOM.bodySize && b.rect.h > 0).map((b) => b.vProj).sort((a, b) => a - b)
    expect(supVs).toHaveLength(PDF_AFFIL_SPLIT_GEOM.rows)
    expect(bodyVs).toHaveLength(PDF_AFFIL_SPLIT_GEOM.rows)
    const blocks = baselineGroupBlocks(boxes, tolPx, BASE.w)
    const bands = bandsFromItems(boxes, BASE, tolPx)
    // 行数=3：碎片并入后每机构行一块/一带；M2 删并入 → 上标行独立 → 6 块/6 带红
    expect(blocks.length).toBe(PDF_AFFIL_SPLIT_GEOM.rows)
    expect(bands.length).toBe(PDF_AFFIL_SPLIT_GEOM.rows)
    // 行成员结构：每带同时含本行上标与正文 vProj（上标并入正文行——M2 后
    // 上标带不含正文 vProj → 红）；x0 达上标列（并入后块水平域跨上标列起点）
    for (let i = 0; i < PDF_AFFIL_SPLIT_GEOM.rows; i += 1) {
      const band = bands[i]!
      expect(band.top * BASE.h).toBeLessThanOrEqual(supVs[i]!)
      expect(band.bottom * BASE.h).toBeGreaterThanOrEqual(bodyVs[i]!)
      const block = blocks[i]!
      expect(block.x).toBeLessThanOrEqual(PDF_AFFIL_SPLIT_GEOM.supX + 0.5)
      expect(block.x + block.w).toBeGreaterThanOrEqual(PDF_AFFIL_SPLIT_GEOM.bodyX)
    }
  })
})
