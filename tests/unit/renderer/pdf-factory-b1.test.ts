/**
 * [B1-U1] 选区正确性战役合成配方验收（A1–A5 gating fixture——真 pdfjs 可加载
 * 与几何契约，2026-11-21）。三配方=探针 b1-probe 真实页形态的合成等价物：
 *  - createTwoColumnGapPdf（A2）：6 视觉行×左右栏，行内缝 > 单源断段阈值
 *    （跨栏行 x 并集可测缝）；
 *  - createFormulaPagePdf（A3）：公式行=正文/上下标字号分离（fs 8/5）+独立
 *    基线（±3pt）+行内空隙空白补位项（真 pdfjs 合并补位形态实测）+下方正文行；
 *  - createSuperscriptAffilPdf（A5）：行首上标 a–c（fs5）与机构正文列（fs8）
 *    同基线微缝 ≈1.5–1.7pt。
 *
 * 本文件断言 fixture 自身几何契约（恒绿——红断言在 selection-b1-a2/a3 文件
 * 消费同一配方）；真 pdfjs 集成=node 环境 fake worker 自动回退
 * （pdf-factory-twocol.test 同款先例）。
 */
import { describe, expect, it } from 'vitest'
import {
  createFormulaPagePdf,
  createSuperscriptAffilPdf,
  createTwoColumnGapPdf,
  PDF_AFFIL_GEOM,
  PDF_AFFIL_SUPS,
  PDF_FORMULA_BASELINE,
  PDF_GAPCOL_GUTTER,
  PDF_GAPCOL_LEFT,
  PDF_GAPCOL_RIGHT
} from '../../utils/pdf-factory'
import { COLUMN_GAP_H_FACTOR, COLUMN_GAP_PAGE_RATIO } from '../../../src/renderer/features/reader/anchors/geometry-types'

interface RawItem {
  str: string
  x: number
  y: number
  fs: number
  w: number
}

async function loadItems(make: () => Uint8Array): Promise<RawItem[]> {
  const { getDocument } = await import('pdfjs-dist')
  const pdf = await getDocument({ data: make() }).promise
  const page = await pdf.getPage(1)
  const tc = (await page.getTextContent()) as unknown as {
    items: Array<{ str: string; transform: number[]; width: number }>
  }
  await pdf.destroy()
  return tc.items
    .filter((t) => t.str.length > 0)
    .map((t) => ({ str: t.str, x: t.transform[4]!, y: t.transform[5]!, fs: t.transform[0]!, w: t.width ?? 0 }))
}

describe('B1-U1 合成配方验收 —— createTwoColumnGapPdf（A2 双栏窄缝页）', () => {
  it('12 项=左右栏各 6 行、右栏恒起 318、每行行内缝 > 单源断段阈值（无栏间补位项）', async () => {
    const items = await loadItems(createTwoColumnGapPdf)
    expect(items).toHaveLength(PDF_GAPCOL_GUTTER.rows * 2)
    const left = items.filter((t) => t.x < 200)
    const right = items.filter((t) => t.x >= 300)
    expect(left).toHaveLength(PDF_GAPCOL_GUTTER.rows)
    expect(right).toHaveLength(PDF_GAPCOL_GUTTER.rows)
    expect(left[0]!.str.startsWith(PDF_GAPCOL_LEFT)).toBe(true)
    expect(right[0]!.str.startsWith(PDF_GAPCOL_RIGHT)).toBe(true)
    // 右栏恒起 x=318；左右栏行基线一一同配（同视觉行）
    for (const r of right) expect(r.x).toBe(PDF_GAPCOL_GUTTER.right)
    const leftYs = left.map((t) => t.y).sort((a, b) => b - a)
    const rightYs = right.map((t) => t.y).sort((a, b) => b - a)
    expect(leftYs).toEqual(rightYs)
    // 行内缝=318−左栏右缘 > 断段阈值 max(1.5×行高, 2%×612)——A2 红测试判别前提
    const rowH = Math.max(...items.map((t) => t.fs))
    const threshold = Math.max(COLUMN_GAP_H_FACTOR * rowH, COLUMN_GAP_PAGE_RATIO * 612)
    for (const l of left) {
      expect(PDF_GAPCOL_GUTTER.right - (l.x + l.w)).toBeGreaterThan(threshold)
    }
  })
})

describe('B1-U1 合成配方验收 —— createFormulaPagePdf（A3 公式页）', () => {
  it('公式行：fs8 正文+fs5 脚本字号分离、≥2 独立基线、行内空隙空白补位项宽 ≥8pt；下方 4 行正文', async () => {
    const items = await loadItems(createFormulaPagePdf)
    const { y: baseY } = PDF_FORMULA_BASELINE
    const row = items.filter((t) => t.y >= baseY - 8 && t.y <= baseY + 8)
    const body = row.filter((t) => t.fs === PDF_FORMULA_BASELINE.bodySize)
    const script = row.filter((t) => t.fs === PDF_FORMULA_BASELINE.scriptSize)
    expect(body.length).toBeGreaterThanOrEqual(2)
    expect(script.length).toBeGreaterThanOrEqual(2)
    // 独立基线：脚本项基线 ≠ 正文基线（上标 +3/下标 −3）
    const baselines = new Set(row.map((t) => t.y))
    expect(baselines.size).toBeGreaterThanOrEqual(3)
    expect(script.some((t) => Math.abs(t.y - baseY) >= 2)).toBe(true)
    // 行内空隙空白补位项（真 pdfjs 对同线相邻片段插入的 gap 项——str 纯空白
    // 且宽 ≥8pt：caret 落容器槽位的「行内大空隙」形态）
    const gapWs = row.filter((t) => t.str.trim().length === 0 && t.w >= 8)
    expect(gapWs.length).toBeGreaterThanOrEqual(1)
    // 下方正文行族（槽位重定向「偏移区间爆炸」的目标行）
    const below = items.filter((t) => t.y < baseY - 20)
    expect(below).toHaveLength(4)
    for (const b of below) expect(b.fs).toBe(PDF_FORMULA_BASELINE.bodySize)
  })
})

describe('B1-U1 合成配方验收 —— createSuperscriptAffilPdf（A5 角标页）', () => {
  it('3 行：行首上标单字 fs5@54+正文 fs8@58.5 同基线，微缝 ∈(0.5,3)pt（含 pdfjs 补位空白项同宽）', async () => {
    const items = await loadItems(createSuperscriptAffilPdf)
    const sups = items.filter((t) => t.fs === PDF_AFFIL_GEOM.supSize && t.str.trim().length > 0)
    const bodies = items.filter((t) => t.fs === PDF_AFFIL_GEOM.bodySize)
    expect(sups.map((t) => t.str)).toEqual([...PDF_AFFIL_SUPS])
    expect(sups).toHaveLength(PDF_AFFIL_GEOM.rows)
    expect(bodies).toHaveLength(PDF_AFFIL_GEOM.rows)
    for (let i = 0; i < PDF_AFFIL_GEOM.rows; i += 1) {
      expect(sups[i]!.x).toBe(PDF_AFFIL_GEOM.supX)
      expect(bodies[i]!.x).toBe(PDF_AFFIL_GEOM.bodyX)
      // 同基线（同视觉行）
      expect(sups[i]!.y).toBe(bodies[i]!.y)
      // 微缝=正文起点−上标右缘 ∈(0.5,3)pt（真实页 1.5px 微缝的合成等价）
      const gap = bodies[i]!.x - (sups[i]!.x + sups[i]!.w)
      expect(gap).toBeGreaterThan(0.5)
      expect(gap).toBeLessThan(3)
    }
  })
})
