/**
 * [F-VISFB-52] 0C fixture gating（主控裁决 d：至少一个 fixture 级断言——
 * createTwoColumnPdf 真 pdfjs 加载→行盒量测→detectColumnLayout→锚栏授权
 * 判定链；真 pdfjs 集成单测 jsdom 外亦可在 node 承载=0C 先例
 * pdf-factory-twocol.test 同款（node 环境 fake worker 自动回退））。
 *
 * [F-SELBLK-01] 块级扩展（设计稿 §6/§7）：同一 fixture 增页眉/页脚全宽带与
 * 左栏 caption 段块样本——页级 detectColumnLayout 计数随改（左栏 11→12、
 * fullSpan 1→3），并新增块级断言（4 全局带/左栏 3 块/右栏 1 块/gutter 右界
 * 318 保持）。行盒 h 改取 item.transform[0]（真字号——18/10/8 簇信号入场；
 * 原 52 号固定 h=10 使字号簇规则无法在 fixture 面生效）。
 *
 * [审查 W1 回炉] 授权断言整体迁到块级合同：旧 authorizeColumnSpan 随
 * selection-column-layout 退役删除，指针点改经 detectBlockLayout→
 * authorizeBlockPoint（INV-143）。fixture 级验证三面：
 *  ①点命中文本盒→授权对应块（页眉/标题/页脚/左栏/右栏/caption）；
 *  ②带内缝带中点→in-gutter 不授权（mousedown 不启动）；
 *  ③缝开区间贴边（x 恰=gutter.left/right）→ 授权最近块非 in-gutter
 *    （旧「贴边相切授权所在侧」防线的块模型等价物）。
 *
 * 链路断言面（消费合同=51 号栏几何+INV-142③ 升级为块合同 INV-143）：
 *  双栏成立/中缝右界=右栏行恒起 x（fixture 单源常量 318）/两栏行量 12/11
 *  （页级：左栏哨兵+ROW 01-10+caption=12、右栏哨兵+ROW 01-10=11）/全宽标题
 *  +页眉+页脚跨缝不入任何栏（3）/块布局点授权六向+in-gutter+贴边/
 *  块分割 4 全局带+左栏 3 块+右栏 1 块+中缝右界保持。
 * 行盒量测口径：getTextContent item.transform[4]=x（用户空间）、transform[5]=
 * 基线 y（y-up——y 重叠聚类对上下翻转不变）、width=行宽、h=transform[0]（字号；
 * 行距 16>字号 10 保证正文行带不重叠；标题 18pt/基线 740 独带；页眉 8pt/
 * 基线 764 独带、页脚 8pt/基线 60 独带）。
 */
import { describe, expect, it } from 'vitest'
import {
  createTwoColumnPdf,
  PDF_TWOCOL_CAPTION,
  PDF_TWOCOL_FOOTER,
  PDF_TWOCOL_GUTTER,
  PDF_TWOCOL_HEADER,
  PDF_TWOCOL_LEFT,
  PDF_TWOCOL_RIGHT,
  PDF_TWOCOL_TITLE
} from '../../utils/pdf-factory'
import { detectColumnLayout, type LineBox } from '../../../src/renderer/features/reader/interact/selection-column-layout'
import {
  authorizeBlockPoint,
  detectBlockLayout,
  detectGlobalBands,
  type TextBlock
} from '../../../src/renderer/features/reader/interact/selection-block-layout'

describe('F-VISFB-52/F-SELBLK-01 0C fixture gating —— 真 pdfjs 行盒量测→栏检测→块授权链', () => {
  it('双栏成立+中缝右界=318+两栏 12/11 行+三条全宽带+块布局点授权（六向/in-gutter/贴边）', async () => {
    const { getDocument } = await import('pdfjs-dist')
    const pdf = await getDocument({ data: createTwoColumnPdf() }).promise
    expect(pdf.numPages).toBe(1)
    const page = await pdf.getPage(1)
    const { items } = await page.getTextContent()
    const raw = (items as Array<{ str: string; transform: number[]; width: number }>).filter((t) => t.str.trim() !== '')
    const boxes: LineBox[] = raw.map((t) => ({
      x: t.transform[4] ?? 0,
      y: t.transform[5] ?? 0,
      w: t.width ?? 0,
      h: t.transform[0] ?? 0
    }))
    // 行盒量测非空（真 pdfjs 提取面：标题+页眉+页脚+左 12+右 11=26）
    expect(boxes.length).toBe(26)

    // detectColumnLayout：双栏+中缝（右界=右栏行恒起 318——fixture 单源常量；
    // 左界由各带最宽隙交集投票得左栏参差右缘，只锁右界不做常量假设）
    const layout = detectColumnLayout(boxes)
    expect(layout.kind).toBe('two-column')
    expect(layout.gutter).not.toBeNull()
    expect(layout.gutter?.right).toBe(PDF_TWOCOL_GUTTER.right)
    // 两栏行量：左栏哨兵+ROW 01-10+caption=12（caption x∈[54,147] ≤ 缝左界归左栏）；
    // 右栏哨兵+ROW 01-10=11
    expect(layout.columns[0]?.boxes).toHaveLength(12)
    expect(layout.columns[1]?.boxes).toHaveLength(11)
    // 全宽带：标题 18pt 长行+页眉/页脚 8pt 居中行跨缝 → 3 条均不入任何栏
    const titleBox = boxes[raw.findIndex((t) => t.str === PDF_TWOCOL_TITLE)]!
    const headerBox = boxes[raw.findIndex((t) => t.str === PDF_TWOCOL_HEADER)]!
    const footerBox = boxes[raw.findIndex((t) => t.str === PDF_TWOCOL_FOOTER)]!
    const captionBox = boxes[raw.findIndex((t) => t.str === PDF_TWOCOL_CAPTION)]!
    expect(layout.fullSpan).toHaveLength(3)
    expect(layout.fullSpan).toEqual([titleBox, headerBox, footerBox])

    // [审查 W1] 块布局点授权链（52 mousedown 记锚块消费形——
    // detectBlockLayout→authorizeBlockPoint；旧 authorizeColumnSpan 已退役）
    const blockLayout = detectBlockLayout(boxes)
    const blockOf = (blockId: number): TextBlock => blockLayout.blocks[blockId]!
    const g = blockLayout.gutters[0]!
    expect(g.right).toBe(PDF_TWOCOL_GUTTER.right)
    const lx = raw.find((t) => t.str === PDF_TWOCOL_LEFT)!.transform[4]!
    const rx = raw.find((t) => t.str === PDF_TWOCOL_RIGHT)!.transform[4]!
    const headY = headerBox.y
    const footY = footerBox.y
    const titleY = titleBox.y
    // ①点命中文本盒 → 授权对应块：标题/页眉/页脚三单盒带各成 flow 块（盒内点）
    const titleAuth = authorizeBlockPoint(blockLayout, { x: titleBox.x + 10, y: titleY })
    const headerAuth = authorizeBlockPoint(blockLayout, { x: headerBox.x + 10, y: headY })
    const footerAuth = authorizeBlockPoint(blockLayout, { x: footerBox.x + 10, y: footY })
    expect(titleAuth).toEqual({ authorized: true, blockId: blockOf(titleAuth.authorized ? titleAuth.blockId : -1).id })
    expect(titleAuth.authorized && blockOf(titleAuth.blockId).boxes).toEqual([titleBox])
    expect(headerAuth.authorized && blockOf(headerAuth.blockId).boxes).toEqual([headerBox])
    expect(footerAuth.authorized && blockOf(footerAuth.blockId).boxes).toEqual([footerBox])
    // 左/右栏哨兵行点：授权含该哨兵盒的 flow 块（左块 x1≤缝左界、右块 x0=318）
    const leftAuth = authorizeBlockPoint(blockLayout, { x: lx + 20, y: 700 })
    expect(leftAuth.authorized).toBe(true)
    expect(leftAuth.authorized && blockOf(leftAuth.blockId).boxes.some((b) => b === boxes[raw.findIndex((t) => t.str === PDF_TWOCOL_LEFT)])).toBe(true)
    expect(leftAuth.authorized && blockOf(leftAuth.blockId).x1 <= g.left).toBe(true)
    const rightAuth = authorizeBlockPoint(blockLayout, { x: rx + 20, y: 700 })
    expect(rightAuth.authorized).toBe(true)
    expect(rightAuth.authorized && blockOf(rightAuth.blockId).x0).toBe(PDF_TWOCOL_GUTTER.right)
    // caption 点：授权 caption 段块（单盒块）
    const captionAuth = authorizeBlockPoint(blockLayout, { x: captionBox.x + 10, y: captionBox.y })
    expect(captionAuth.authorized && blockOf(captionAuth.blockId).boxes).toEqual([captionBox])
    // ②带内缝带中点（y 落正文带包络、x 落缝开区间）→ in-gutter 不授权（§0-4）
    const mid = (g.left + g.right) / 2
    expect(authorizeBlockPoint(blockLayout, { x: mid, y: 650 })).toEqual({ authorized: false, reason: 'in-gutter' })
    // ③缝开区间贴边：x 恰=gutter.left/right → 授权最近块而非 in-gutter
    //   （旧「贴边相切授权所在侧」防线的块模型等价物）
    const edgeLeft = authorizeBlockPoint(blockLayout, { x: g.left, y: 650 })
    const edgeRight = authorizeBlockPoint(blockLayout, { x: g.right, y: 650 })
    expect(edgeLeft.authorized).toBe(true)
    expect(edgeLeft.authorized && blockOf(edgeLeft.blockId).x1).toBe(g.left)
    expect(edgeRight.authorized).toBe(true)
    expect(edgeRight.authorized && blockOf(edgeRight.blockId).x0).toBe(g.right)

    await pdf.destroy()
  })

  it('[F-SELBLK-01] 块级分割：4 全局带（页脚/正文/标题/页眉）+左栏 3 块右栏 1 块+gutter 右界 318 保持', async () => {
    const { getDocument } = await import('pdfjs-dist')
    const pdf = await getDocument({ data: createTwoColumnPdf() }).promise
    const page = await pdf.getPage(1)
    const { items } = await page.getTextContent()
    const raw = (items as Array<{ str: string; transform: number[]; width: number }>).filter((t) => t.str.trim() !== '')
    const boxes: LineBox[] = raw.map((t) => ({
      x: t.transform[4] ?? 0,
      y: t.transform[5] ?? 0,
      w: t.width ?? 0,
      h: t.transform[0] ?? 0
    }))

    // L1 全局水平带：页脚 8pt 独带 / 正文带（左右交错 22 行+caption 同行）/ 标题带 / 页眉带
    const bands = detectGlobalBands(boxes)
    expect(bands).toHaveLength(4)
    // 正文带盒数=左 11（哨兵+ROW 01-06+ROW 07-10）+caption 1+右 11=23
    expect(bands[1]).toHaveLength(23)

    // 块分割：正文带内左栏 L3 切 3 块（上段 7/caption 1/下段 4）、右栏连续 1 块；
    // 页脚/标题/页眉单盒带各成 flow 块（单盒带无中缝候选→单栏）
    const layout = detectBlockLayout(boxes)
    const flow = layout.blocks.filter((b) => b.kind === 'flow')
    const leftFlows = flow.filter((b) => b.x1 <= 200)
    const rightFlows = flow.filter((b) => b.x0 >= PDF_TWOCOL_GUTTER.right)
    expect(leftFlows).toHaveLength(3)
    expect(rightFlows).toHaveLength(1)
    // 左栏三段盒数（上段含哨兵=7 / caption=1 / 下段=4）
    expect(leftFlows.map((b) => b.boxes.length).sort((a, b) => a - b)).toEqual([1, 4, 7])
    // 右栏单块=哨兵+ROW 01-10 连续同字号正文（无中切——与左栏不对称互证）
    expect(rightFlows[0]?.boxes).toHaveLength(11)
    // 中缝表：正文带一条，右界=右栏行恒起 318（授权 in-gutter 判定面）
    expect(layout.gutters).toHaveLength(1)
    expect(layout.gutters[0]?.right).toBe(PDF_TWOCOL_GUTTER.right)
    // 无旋转盒（本 fixture 无竖排 run）
    expect(layout.blocks.some((b) => b.kind === 'rotated')).toBe(false)

    await pdf.destroy()
  })
})
