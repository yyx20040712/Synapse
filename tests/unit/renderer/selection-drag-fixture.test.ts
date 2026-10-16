/**
 * [F-VISFB-52] 0C fixture gating（主控裁决 d：至少一个 fixture 级断言——
 * createTwoColumnPdf 真 pdfjs 加载→行盒量测→detectColumnLayout→锚栏授权
 * 判定链；真 pdfjs 集成单测 jsdom 外亦可在 node 承载=0C 先例
 * pdf-factory-twocol.test 同款（node 环境 fake worker 自动回退））。
 *
 * 链路断言面（消费合同=51 号 selection-column-layout 头注+INV-142 几何判定面）：
 *  双栏成立/中缝右界=右栏行恒起 x（fixture 单源常量 318）/两栏行量对称
 *  （哨兵+ROW 01-10 各 11）/全宽标题带跨缝不入任何栏/指针形零宽 span 与
 *  拖选 span 的授权三分支（左右栏授权、缝带与跨栏不授权）。
 * 行盒量测口径：getTextContent item.transform[4]=x（用户空间）、transform[5]=
 * 基线 y（y-up——y 重叠聚类对上下翻转不变）、width=行宽、h=字号 10
 * （行距 16>10 保证行带不重叠）；标题 18pt/基线 740 独带。
 */
import { describe, expect, it } from 'vitest'
import {
  createTwoColumnPdf,
  PDF_TWOCOL_GUTTER,
  PDF_TWOCOL_LEFT,
  PDF_TWOCOL_RIGHT,
  PDF_TWOCOL_TITLE
} from '../../utils/pdf-factory'
import { authorizeColumnSpan, detectColumnLayout, type LineBox } from '../../../src/renderer/features/reader/interact/selection-column-layout'

describe('F-VISFB-52 0C fixture gating —— 真 pdfjs 行盒量测→栏检测→指针授权链', () => {
  it('双栏成立+中缝右界=318+两栏 11/11 行+标题入全宽带+指针/拖选 span 授权三分支', async () => {
    const { getDocument } = await import('pdfjs-dist')
    const pdf = await getDocument({ data: createTwoColumnPdf() }).promise
    expect(pdf.numPages).toBe(1)
    const page = await pdf.getPage(1)
    const { items } = await page.getTextContent()
    const raw = (items as Array<{ str: string; transform: number[]; width: number }>).filter((t) => t.str.trim() !== '')
    const boxes: LineBox[] = raw.map((t) => ({ x: t.transform[4] ?? 0, y: t.transform[5] ?? 0, w: t.width ?? 0, h: 10 }))
    // 行盒量测非空（真 pdfjs 提取面）
    expect(boxes.length).toBeGreaterThanOrEqual(23)

    // detectColumnLayout：双栏+中缝（右界=右栏行恒起 318——fixture 单源常量）
    const layout = detectColumnLayout(boxes)
    expect(layout.kind).toBe('two-column')
    expect(layout.gutter).not.toBeNull()
    expect(layout.gutter?.right).toBe(PDF_TWOCOL_GUTTER.right)
    // 两栏行量对称（哨兵+ROW 01-10 各 11）
    expect(layout.columns[0]?.boxes).toHaveLength(11)
    expect(layout.columns[1]?.boxes).toHaveLength(11)
    // 全宽标题带跨缝（18pt 长行 x1 越过参差栏缘）→ 不入任何栏
    const titleBox = boxes[raw.findIndex((t) => t.str === PDF_TWOCOL_TITLE)]!
    expect(layout.fullSpan).toHaveLength(1)
    expect(layout.fullSpan[0]).toBe(titleBox)

    // authorizeColumnSpan 指针授权判定链（52 mousedown 记锚栏消费形）
    const g = layout.gutter!
    const lx = raw.find((t) => t.str === PDF_TWOCOL_LEFT)!.transform[4]!
    const rx = raw.find((t) => t.str === PDF_TWOCOL_RIGHT)!.transform[4]!
    // 指针形零宽 span：左/右栏文本上 → 授权所在栏
    expect(authorizeColumnSpan(layout, { x0: lx + 20, x1: lx + 20 })).toEqual({ authorized: true, columnId: 'left' })
    expect(authorizeColumnSpan(layout, { x0: rx + 20, x1: rx + 20 })).toEqual({ authorized: true, columnId: 'right' })
    // 指针形零宽 span：缝带中点（左行参差右缘与右栏之间）→ 不授权（§0-4）
    const mid = (g.left + g.right) / 2
    expect(authorizeColumnSpan(layout, { x0: mid, x1: mid })).toEqual({ authorized: false, reason: 'cross-gutter' })
    // 拖选 span：跨栏（左栏内→右栏内）→ 不授权；栏内 → 授权所在栏
    expect(authorizeColumnSpan(layout, { x0: lx + 10, x1: rx + 10 })).toEqual({ authorized: false, reason: 'cross-gutter' })
    expect(authorizeColumnSpan(layout, { x0: lx + 10, x1: g.left - 5 })).toEqual({ authorized: true, columnId: 'left' })

    await pdf.destroy()
  })
})
