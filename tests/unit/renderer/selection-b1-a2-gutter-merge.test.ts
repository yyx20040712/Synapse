/**
 * [B1-U1] A2 跨栏灰底含缝红测试（选区正确性战役 A1–A5，先红半场——2026-11-21）。
 *
 * 探针定谳（b1-probe note.md F9/C4）：S4b 跨栏拖选 57 块中 1 块
 * (374.3–869.8)×(346.7–358.0) 横贯左右栏盖住中缝 [622,639]——同一视觉行的
 * 左右栏行盒被几何链并成单矩形（pdf-item-geometry.baselineGroupBlocks 组内
 * x 并集 + annotation-merge.mergeRects 行内归并 x 并集 :144-152，该行几何下
 * 双层都并）；页 4 块表无中缝（F1）→ 钳制层无防线。
 *
 * 修复单元 3（主控终裁）：mergeRects 行簇内加 x 间隙断段（新语义=「每行每
 * 连续段至多一块」），断段阈值与 baselineGroupBlocks 的 COLUMN_GAP 单源
 * （geometry-types 常量）；bandsFromItems 的 x0/x1 同步按段分裂。
 *
 * 本文件用真 pdfjs 加载 tests/utils/pdf-factory 的双栏窄缝页配方
 * （createTwoColumnGapPdf——6 视觉行×左右栏，行内缝 ≥18pt > 单源断段阈值
 * 12.24pt），在**当前产品代码**上呈红：
 *  - itemSelectionGeometry 全选 → 每行应 2 块（12 块）且缝区无覆盖（现 6 块
 *    每块横贯缝——红）；
 *  - bandsFromItems 同行分段 x0/x1 不跨缝（现单带跨缝——红）；
 *  - mergeRects 直测：同行两段缝 > 阈值应 2 块（现 1 块 x 并集——红）+小缝
 *    对照恒 1 块（修复前后恒绿——锁「连续段」语义不误裂行内交叠/小隙）。
 *
 * node 环境纯函数直测（pdf-factory-twocol/selection-drag-fixture 同款真
 * pdfjs fake-worker 回退先例）；断段阈值前置断言用 geometry-types 单源常量
 * （红判别几何的自证——不复制字面量）。
 */
import { describe, expect, it } from 'vitest'
import { createTwoColumnGapPdf, PDF_GAPCOL_GUTTER } from '../../utils/pdf-factory'
import { COLUMN_GAP_H_FACTOR, COLUMN_GAP_PAGE_RATIO } from '../../../src/renderer/features/reader/anchors/geometry-types'
import type { PdfTextItem, PdfTextStyle } from '../../../src/renderer/features/reader/anchors/geometry-types'
import { bandsFromItems, itemSelectionGeometry, rectsForOffsetRange } from '../../../src/renderer/features/reader/anchors/pdf-item-geometry'
import { mergeRects } from '../../../src/renderer/features/reader/anchors/annotation-merge'

/** 真 pdfjs 提取双栏窄缝页项集（非空串项——与 buildItemOffsets 拼接口径一致） */
async function gapcolItems(): Promise<{ items: PdfTextItem[]; styles: Record<string, PdfTextStyle> }> {
  const { getDocument } = await import('pdfjs-dist')
  const pdf = await getDocument({ data: createTwoColumnGapPdf() }).promise
  const page = await pdf.getPage(1)
  const tc = (await page.getTextContent()) as unknown as {
    items: PdfTextItem[]
    styles: Record<string, PdfTextStyle>
  }
  await pdf.destroy()
  return { items: tc.items.filter((t) => t.str.length > 0), styles: tc.styles }
}

describe('B1-U1 A2 跨栏行 x 并集盖缝（先红半场——现产品代码呈红，U2 修复单元 3 转绿）', () => {
  it('itemSelectionGeometry：同视觉行左右栏 → 每行 2 块且缝区无覆盖+bands 同行分段不跨缝（现 1 块/行盖缝+单带跨缝——红）', async () => {
    const { items, styles } = await gapcolItems()
    const viewport = { scale: 1, rotate: 0, view: [0, 0, 612, 792] as [number, number, number, number] }
    const base = { x: 0, y: 0, w: 612, h: 792 }
    const total = items.map((t) => t.str).join('').length
    // 前置（红判别几何自证）：行内缝=右栏恒起 318−左栏右缘 > 单源断段阈值
    // max(1.5×行高 8, 2%×612)=12.24pt——缝大于阈值仍并块即缺陷本体
    const leftRight = Math.max(...items.filter((t) => t.transform[4]! < 200).map((t) => t.transform[4]! + t.width))
    const rowH = Math.max(...items.map((t) => t.transform[0]!))
    const threshold = Math.max(COLUMN_GAP_H_FACTOR * rowH, COLUMN_GAP_PAGE_RATIO * 612)
    expect(PDF_GAPCOL_GUTTER.right - leftRight).toBeGreaterThan(threshold)
    const gutterL = leftRight / 612
    const gutterR = PDF_GAPCOL_GUTTER.right / 612

    const out = itemSelectionGeometry({ items, styles, viewport, start: 0, end: total, base })
    expect(out).not.toBeNull()
    // 红断言 1：6 视觉行×左右栏=12 块（现 mergeRects 行内 x 并集 → 6 块）
    expect(out!.rects.length).toBe(PDF_GAPCOL_GUTTER.rows * 2)
    // 红断言 2：缝区无覆盖——任何块不得横贯 [左栏右缘,318]（现每行 1 块横贯）
    for (const r of out!.rects) {
      expect(r.x < gutterL && r.x + r.w > gutterR).toBe(false)
    }
    // 红断言 3：bands 同行分段——每带=一栏一段（x0/x1 不跨缝；现 6 带跨缝）
    expect(out!.bands.length).toBe(PDF_GAPCOL_GUTTER.rows * 2)
    for (const b of out!.bands) {
      expect((b.x0 ?? 0) < gutterL && (b.x1 ?? 1) > gutterR).toBe(false)
    }
    // bandsFromItems 直测同判别（具名红锚——修复面含其 x0/x1 按段分裂）
    const { boxes, tolPx } = rectsForOffsetRange(items, styles, viewport, 0, total)
    const bands = bandsFromItems(boxes, base, tolPx)
    expect(bands.length).toBe(PDF_GAPCOL_GUTTER.rows * 2)
    for (const b of bands) {
      expect((b.x0 ?? 0) < gutterL && (b.x1 ?? 1) > gutterR).toBe(false)
    }
  })

  it('mergeRects 行簇内 x 间隙断段：同行两段缝 > 单源阈值 → 2 块（现 1 块 x 并集——红）；小缝对照 → 1 块（恒绿）', () => {
    const h = 8 / 792
    const y = 100 / 792
    // 实测形：左段 [54,290.98]pt、右段 [318,406.46]pt——缝 27.02pt（归一化
    // 0.0442 > max(1.5×h≈0.0152, 0.02)）→「每行每连续段至多一块」=2 块
    const left = { page: 0, x: 54 / 612, y, w: 236.98 / 612, h }
    const right = { page: 0, x: 318 / 612, y, w: 88.46 / 612, h }
    expect(mergeRects([left, right]).length).toBe(2)
    // 对照（恒绿）：行内小隙 4pt < 阈值 → 连续段并 1 块（交叠/小隙并入语义保持）
    const nearLeft = { page: 0, x: 54 / 612, y, w: 260 / 612, h }
    expect(mergeRects([nearLeft, right]).length).toBe(1)
  })
})
