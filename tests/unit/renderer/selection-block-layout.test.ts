/**
 * [F-SELBLK-01] selection-block-layout —— 文本块分割与锚块授权纯函数直测
 * （always-active，不经 guardedDescribe）。
 *
 * 用例面=设计稿 §7：L1 双规则分裂与阈值边界（0.74h 不裂/0.76h 裂；字号簇变
 * +小间隙裂；同簇+大间隙裂）/连续正文不裂/交错 caption 不产生全局分裂但 L3
 * 左栏裂/单栏页三块/flow 包络无交/伪块聚合/授权判定序六分支（rotated→
 * full-span→flow→in-gutter→最近块回退与等距阅读序→no-blocks）/y-up 域样本。
 *
 * 几何形状与 0C fixture（tests/utils/pdf-factory createTwoColumnPdf）同构：
 * 左栏 x∈[54,121]/右栏 x∈[318,387]/中缝 [121,318]；坐标取 PDF 用户空间
 * y-up 语义（纯函数只依赖排序轴间隙，方向无关——本文件同时覆盖 y-up 样本）。
 */
import { describe, expect, it } from 'vitest'
import {
  authorizeBlockPoint,
  detectBlockLayout,
  detectGlobalBands,
  type TextBlock
} from '../../../src/renderer/features/reader/interact/selection-block-layout'
import type { LineBox } from '../../../src/renderer/features/reader/interact/selection-column-layout'

/** 行盒工厂（缺省字号 10、左栏正文宽 67） */
const row = (x: number, y: number, w = 67, h = 10): LineBox => ({ x, y, w, h })
/** 左栏行（x=54） */
const lrow = (y: number, h = 10): LineBox => row(54, y, 67, h)
/** 右栏行（x=318） */
const rrow = (y: number, h = 10): LineBox => row(318, y, 69, h)
/** flow 块（排除伪块） */
const flowBlocks = (blocks: readonly TextBlock[]): TextBlock[] => blocks.filter((b) => b.kind === 'flow')

/** 两栏交错网格：左右同 y 行（y 间距 16=间隙 6，连续正文不裂） */
function twoColumnGrid(leftYs: readonly number[], rightYs: readonly number[]): LineBox[] {
  return [...leftYs.map((y) => lrow(y)), ...rightYs.map((y) => rrow(y))]
}

describe('F-SELBLK-01 selection-block-layout —— 文本块分割', () => {
  it('L1 净空分裂阈值边界：0.74×medianH 不裂、0.76×medianH 裂（medianH=10）', () => {
    const pair = (gap: number): LineBox[] => [row(54, 100, 200, 10), row(54, 110 + gap, 200, 10)]
    // gap=7.4 < 0.75×10=7.5 且同字号簇 → 一条全局带
    expect(detectGlobalBands(pair(7.4))).toHaveLength(1)
    // gap=7.6 ≥ 7.5 → 净空分裂
    expect(detectGlobalBands(pair(7.6))).toHaveLength(2)
  })

  it('L1 字号簇双规则：簇变+小间隙裂（未过净空阈）；同簇+大间隙按净空裂', () => {
    // gap=3（<7.5）但 h 10 vs 8：|2| ≥ 0.15×10=1.5 且 3 ≥ 0.25×9=2.25 → 字号簇分裂
    const fontSplit = [row(54, 100, 200, 10), row(54, 113, 200, 8)]
    expect(detectGlobalBands(fontSplit)).toHaveLength(2)
    // gap=9（≥0.75×10.25）但 h 10 vs 10.5 同簇（|0.5| < 0.15×10.5）→ 净空分裂
    const clearedSplit = [row(54, 100, 200, 10), row(54, 119, 200, 10.5)]
    expect(detectGlobalBands(clearedSplit)).toHaveLength(2)
    // 对照：同簇+小间隙不裂
    const sameCluster = [row(54, 100, 200, 10), row(54, 113, 200, 10.5)]
    expect(detectGlobalBands(sameCluster)).toHaveLength(1)
  })

  it('连续正文不裂：行距间隙 6=0.6×medianH（<0.75）恒为一条全局带', () => {
    const body = Array.from({ length: 6 }, (_, i) => lrow(100 + i * 16))
    expect(detectGlobalBands(body)).toHaveLength(1)
  })

  it('交错 caption 不产生全局分裂（右栏同行填隙），但 L3 左栏切 3 块、右栏 1 块', () => {
    const left = [100, 116, 132, 148, 164, 180].map((y) => lrow(y))
    // caption：font 8，位于左栏 ROW06 与下移段之间（x 包络仍在中缝左）
    const caption = row(54, 196, 85, 8)
    const leftTail = [212, 228].map((y) => lrow(y))
    const right = Array.from({ length: 10 }, (_, i) => rrow(100 + i * 16))
    const boxes = [...left, caption, ...leftTail, ...right]
    // 右栏行与 caption 同带 → 全局行带链致密（间隙恒 6），L1 零分裂
    expect(detectGlobalBands(boxes)).toHaveLength(1)
    const layout = detectBlockLayout(boxes)
    const flows = flowBlocks(layout.blocks)
    const leftFlows = flows.filter((b) => b.x1 <= 139)
    const rightFlows = flows.filter((b) => b.x0 >= 318)
    expect(leftFlows).toHaveLength(3)
    expect(rightFlows).toHaveLength(1)
    // 左栏三段：连续 6 行段 / caption 单盒段 / 尾段 2 行
    expect(leftFlows.map((b) => b.boxes.length).sort((a, b) => a - b)).toEqual([1, 2, 6])
    // 中缝右界=右栏行恒起 x
    expect(layout.gutters).toHaveLength(1)
    expect(layout.gutters[0]?.right).toBe(318)
  })

  it('单栏页：页眉/正文/页脚三块（净空分裂双阈；正文连续不切）', () => {
    const boxes = [
      row(54, 100, 374, 10),
      row(54, 130, 374, 10),
      row(54, 146, 374, 10),
      row(54, 162, 374, 10),
      row(54, 200, 374, 10)
    ]
    const layout = detectBlockLayout(boxes)
    expect(layout.gutters).toHaveLength(0)
    expect(layout.blocks.map((b) => b.kind)).toEqual(['flow', 'flow', 'flow'])
    expect(layout.blocks.map((b) => b.boxes.length)).toEqual([1, 3, 1])
    expect(layout.blocks[0]?.boxes[0]).toBe(boxes[0])
    expect(layout.blocks[2]?.boxes[0]).toBe(boxes[4])
  })

  it('flow 块包络两两无交（带 y 不交+带内栏 x 不交+栏内段 y 不交）', () => {
    const boxes = [
      ...[100, 116, 132, 148, 164, 180, 212, 228].map((y) => lrow(y)),
      row(54, 196, 85, 8),
      ...Array.from({ length: 10 }, (_, i) => rrow(100 + i * 16))
    ]
    const flows = flowBlocks(detectBlockLayout(boxes).blocks)
    for (let i = 0; i < flows.length; i += 1) {
      for (let j = i + 1; j < flows.length; j += 1) {
        const a = flows[i]!
        const b = flows[j]!
        const overlapX = a.x0 < b.x1 && b.x0 < a.x1
        const overlapY = a.y0 < b.y1 && b.y0 < a.y1
        expect(overlapX && overlapY, `flow 块 ${String(a.id)} 与 ${String(b.id)} 包络相交`).toBe(false)
      }
    }
  })

  it('伪块聚合：同带两枚 fullSpan 盒聚一枚 full-span 伪块、两枚旋转盒聚一枚 rotated 伪块（成员引用+输入序）', () => {
    // 同带两枚跨缝行（y 重叠成链 → 同一全局带；均跨中缝 → 均 fullSpan）
    const spanA = row(10, 2, 280, 10)
    const spanB = row(10, 6, 280, 10)
    const left = [10, 26, 42].map((y) => row(10, y, 80))
    const right = [10, 26, 42].map((y) => row(210, y, 80))
    // 两枚旋转盒（h=40 > 3×w=30）→ 全页聚一枚 rotated 伪块
    const verticalA = row(250, 200, 10, 40)
    const verticalB = row(270, 200, 10, 40)
    const input = [spanA, spanB, ...left, ...right, verticalA, verticalB]
    const layout = detectBlockLayout(input)
    const span = layout.blocks.filter((b) => b.kind === 'full-span')
    const rotated = layout.blocks.filter((b) => b.kind === 'rotated')
    // 聚合块数=1+1（逐盒成块的实现会得 2+2——本断言即负锚）
    expect(span).toHaveLength(1)
    expect(rotated).toHaveLength(1)
    // 成员=输入引用恒定且 boxes 保持输入序
    expect(span[0]?.boxes).toHaveLength(2)
    expect(span[0]?.boxes[0]).toBe(spanA)
    expect(span[0]?.boxes[1]).toBe(spanB)
    expect(rotated[0]?.boxes).toHaveLength(2)
    expect(rotated[0]?.boxes[0]).toBe(verticalA)
    expect(rotated[0]?.boxes[1]).toBe(verticalB)
    // 伪块成员不并入 flow 块（统一块表各占一枚）
    const flowIds = new Set(flowBlocks(layout.blocks).flatMap((b) => b.boxes))
    expect(flowIds.has(spanA)).toBe(false)
    expect(flowIds.has(spanB)).toBe(false)
    expect(flowIds.has(verticalA)).toBe(false)
    expect(flowIds.has(verticalB)).toBe(false)
    expect(flowBlocks(layout.blocks)).toHaveLength(2)
  })

  it('伪块按全局带聚合：两条全局带各两枚跨缝行 → 两枚 full-span 伪块（跨带不并）', () => {
    // 带 1：y=2/6 两枚跨缝行（与左/右首行 y=10 重叠成同一带）
    // 带 2：y=100/104 两枚跨缝行 + 左右栏行（带 1 底 52 到带 2 顶 100 间隙 48
    //       远超阈 → 独立全局带；带内仍需左右栏盒才立中缝、跨缝行才成 fullSpan）
    const band1a = row(10, 2, 280, 10)
    const band1b = row(10, 6, 280, 10)
    const band2a = row(10, 100, 280, 10)
    const band2b = row(10, 104, 280, 10)
    const left1 = [10, 26, 42].map((y) => row(10, y, 80))
    const right1 = [10, 26, 42].map((y) => row(210, y, 80))
    const left2 = [100, 116, 132].map((y) => row(10, y, 80))
    const right2 = [100, 116, 132].map((y) => row(210, y, 80))
    const layout = detectBlockLayout([
      band1a, band1b, ...left1, ...right1, band2a, band2b, ...left2, ...right2
    ])
    const span = layout.blocks.filter((b) => b.kind === 'full-span')
    expect(span).toHaveLength(2)
    expect(span[0]?.boxes).toEqual([band1a, band1b])
    expect(span[1]?.boxes).toEqual([band2a, band2b])
    // 跨带不并（同一伪块含两带成员=聚合键错用全页）
    expect(span[0]?.boxes).not.toContain(band2a)
    expect(span[1]?.boxes).not.toContain(band1a)
  })
})

describe('F-SELBLK-01 selection-block-layout —— 授权判定序', () => {
  /** 复合布局：fullSpan 标题 + 左右 flow + 旋转伪块（伪盒与 flow 包络重叠=判定序竞争样本） */
  function compoundLayout(): ReturnType<typeof detectBlockLayout> {
    const title = row(10, 2, 280, 10)
    const left = [10, 26, 42].map((y) => row(10, y, 80))
    const right = [10, 26, 42].map((y) => row(210, y, 80))
    const vertical = row(250, 20, 10, 40)
    return detectBlockLayout([title, ...left, ...right, vertical])
  }

  it('①rotated 成员盒含点 → 授权 rotated 伪块（与 flow 包络同点竞争时伪块优先）', () => {
    const layout = compoundLayout()
    const rotated = layout.blocks.find((b) => b.kind === 'rotated')!
    const right = flowBlocks(layout.blocks).find((b) => b.x0 === 210)!
    // 竞争证明：该点同时落在右栏 flow 包络内（包络分支若前移即红——判定序负锚）
    expect(right.x0 <= 255 && 255 <= right.x1 && right.y0 <= 30 && 30 <= right.y1).toBe(true)
    expect(authorizeBlockPoint(layout, { x: 255, y: 30 })).toEqual({ authorized: true, blockId: rotated.id })
  })

  it('②full-span 成员盒含点 → 授权 full-span 伪块（与 flow 包络同点竞争时伪块优先）', () => {
    const layout = compoundLayout()
    const span = layout.blocks.find((b) => b.kind === 'full-span')!
    const left = flowBlocks(layout.blocks).find((b) => b.x0 === 10)!
    // 竞争证明：该点同时落在左栏 flow 包络内
    expect(left.x0 <= 50 && 50 <= left.x1 && left.y0 <= 11 && 11 <= left.y1).toBe(true)
    expect(authorizeBlockPoint(layout, { x: 50, y: 11 })).toEqual({ authorized: true, blockId: span.id })
  })

  it('③flow 包络含点（行间空隙亦命中）→ 授权该 flow 块', () => {
    const layout = compoundLayout()
    const left = flowBlocks(layout.blocks).find((b) => b.x0 === 10)!
    // y=22 落左右行带间隙、x=12 在左栏包络内 → flow 包络命中
    expect(authorizeBlockPoint(layout, { x: 12, y: 22 })).toEqual({ authorized: true, blockId: left.id })
  })

  it('④带内中缝（in-gutter）→ 不授权（保持 52 缝带无指针明确入栏授权）', () => {
    const layout = compoundLayout()
    expect(authorizeBlockPoint(layout, { x: 150, y: 22 })).toEqual({ authorized: false, reason: 'in-gutter' })
  })

  it('⑤最近块回退：零文本区授权最近包络；两块包络真中点等距取块表在前（阅读序）', () => {
    const layout = detectBlockLayout(twoColumnGrid([10, 26, 42], [10, 26, 42]))
    const left = flowBlocks(layout.blocks).find((b) => b.x0 === 54)!
    const right = flowBlocks(layout.blocks).find((b) => b.x0 === 318)!
    // 页边左上：左栏最近
    expect(authorizeBlockPoint(layout, { x: 5, y: 5 })).toEqual({ authorized: true, blockId: left.id })
    // 等距点=两块包络真中点：x=(left.x1 121 + right.x0 318)/2=219.5；
    // y 取带上方（y=5 < 带 y0=10——避开 in-gutter 分支，进入最近块回退）。
    // 距左块 dx=98.5、距右块 dx=98.5（dy 同 5）→ 真等距；实现以 `<` 保留块表
    // 在前者=左块（变异成 `<=` 时后块覆盖→本断言必红）。
    expect(left.x1).toBe(121)
    expect(right.x0).toBe(318)
    const midX = (left.x1 + right.x0) / 2
    const atMid = { x: midX, y: 5 }
    const dxLeft = midX - left.x1
    const dxRight = right.x0 - midX
    expect(dxLeft).toBe(dxRight)
    expect(authorizeBlockPoint(layout, atMid)).toEqual({ authorized: true, blockId: left.id })
  })

  it('⑥零块（空 textLayer）→ 不授权 no-blocks', () => {
    expect(authorizeBlockPoint(detectBlockLayout([]), { x: 100, y: 100 })).toEqual({
      authorized: false,
      reason: 'no-blocks'
    })
  })

  it('y-up 域样本：连续正文一段 + 点命中授权（方向无关）', () => {
    const boxes = [row(54, 540, 374, 10), row(54, 556, 374, 10), row(54, 572, 374, 10)]
    const layout = detectBlockLayout(boxes)
    expect(layout.blocks).toHaveLength(1)
    const block = layout.blocks[0]!
    expect(block.kind).toBe('flow')
    expect(authorizeBlockPoint(layout, { x: 200, y: 560 })).toEqual({ authorized: true, blockId: block.id })
    // 页脚下方远端 → 最近块回退授权同一块（保守语义）
    expect(authorizeBlockPoint(layout, { x: 200, y: 60 })).toEqual({ authorized: true, blockId: block.id })
  })
})
