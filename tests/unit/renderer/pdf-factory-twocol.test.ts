import { describe, expect, it } from 'vitest'
import {
  createTwoColumnPdf,
  PDF_TWOCOL_GUTTER,
  PDF_TWOCOL_LEFT,
  PDF_TWOCOL_RIGHT,
  PDF_TWOCOL_TITLE
} from '../../utils/pdf-factory'

/**
 * 0C 双栏 fixture 可加载验收（视检反馈战役 B0；52/53 选区票 gating 前置）。
 * 真 pdfjs 集成（corpus-extractor.test 真 getDocument 先例——node 环境 fake
 * worker 自动回退，无需 worker 配置）。always-active（新用例恒跑——不经
 * guardedDescribe）。断言面=pdf.js 视角的 fixture 几何契约：双栏哨兵到位、
 * 中缝净空带零文本交叉、全宽标题带在栏体之上、两栏行量对称。
 */
describe('0C createTwoColumnPdf —— 双栏 fixture 可加载验收', () => {
  it('真 pdfjs 加载+左右栏哨兵到位+中缝净空+全宽标题带+两栏行量对称', async () => {
    const { getDocument } = await import('pdfjs-dist')
    const pdf = await getDocument({ data: createTwoColumnPdf() }).promise
    expect(pdf.numPages).toBe(1)
    const page = await pdf.getPage(1)
    const { items } = await page.getTextContent()
    const lines = items as Array<{ str: string; transform: number[]; width: number }>

    // 全宽标题带：基线在栏体之上（y>720）
    const title = lines.find((t) => t.str === PDF_TWOCOL_TITLE)
    expect(title).toBeDefined()
    expect(title?.transform[5]).toBeGreaterThan(720)

    // 哨兵行：左栏起点在中缝左界内侧、右栏起点在中缝右界外侧
    const left = lines.find((t) => t.str === PDF_TWOCOL_LEFT)
    expect(left).toBeDefined()
    expect(left?.transform[4]).toBeLessThan(PDF_TWOCOL_GUTTER.left)
    const right = lines.find((t) => t.str === PDF_TWOCOL_RIGHT)
    expect(right).toBeDefined()
    expect(right?.transform[4]).toBeGreaterThanOrEqual(PDF_TWOCOL_GUTTER.right)

    // 中缝净空：栏体带（y≤720）任意行盒不得穿越中缝带（2pt 容差=字形度量噪声）
    const body = lines.filter((t) => t.str.trim() !== '' && (t.transform[5] ?? 0) <= 720)
    expect(body.length).toBeGreaterThanOrEqual(22)
    for (const t of body) {
      const x0 = t.transform[4] ?? 0
      const x1 = x0 + (t.width ?? 0)
      const crosses = x1 > PDF_TWOCOL_GUTTER.left + 2 && x0 < PDF_TWOCOL_GUTTER.right - 2
      expect(crosses).toBe(false)
    }

    // 两栏行量对称（各 ≥11：哨兵+ROW 01-10）
    const leftRows = body.filter((t) => (t.transform[4] ?? 0) < PDF_TWOCOL_GUTTER.mid)
    const rightRows = body.filter((t) => (t.transform[4] ?? 0) > PDF_TWOCOL_GUTTER.mid)
    expect(leftRows.length).toBeGreaterThanOrEqual(11)
    expect(rightRows.length).toBeGreaterThanOrEqual(11)

    await pdf.destroy()
  })
})
