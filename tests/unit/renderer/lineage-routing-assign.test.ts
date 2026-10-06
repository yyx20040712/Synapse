/**
 * [F-ROUTE-02 U2] 走线候选位分配·分配主循环+Z 形施加+残余子 pass 直测
 * （票号 F-ROUTE-02 U2，runId=20261006-froute02-u2；design 2026-10-06
 * _f-route02-design.md §2 a6/a7/§5/§6）。覆盖：③先占次序+tie→小索引、
 * ④邻缝扫描左/上先（同 axis 同 bandId 域+索引差+tie 几何小侧）、⑤L3 双态
 * （全占/全不可达→overlapExempt）、⑥谓词复检失败流（slotFree 过但
 * zChainClear 失败→槽级不可用→穷尽→豁免）、⑦跨单元穿越逐单元独立、
 * ⑧分配侧 blockedSlots 消费、⑨残余子 pass 旧式等价（对照旧 chain.ts
 * applyBandLanes 字面语义手推）、⑩确定性双跑序列化全等、⑪r=0 仍不清→
 * 路径仍产出（finish 收缩链复现）；专项 A=N-3 部分穿越段 [j1,j2]⊆交、
 * 专项 B=d1-N2 slotFree 调用侧索引域、S2=H∈[9,12) 开放但全槽不可用、
 * Δ<1 豁免保留占用（防后段重取）、桩区禁入（有桩续扫/无桩直入）。
 * 期望值全部从夹具几何手推（禁抄实现输出）。always-active 裸 describe（K3）。
 */
import { describe, expect, it } from 'vitest'
import {
  slotAssign,
  slotFree,
  slotsOf,
  SlotUse,
  type AssignEdge,
  type AssignRec
} from '../../../src/renderer/features/lineage/routing/slots'
import { extractGapCells, type GapCell } from '../../../src/renderer/features/lineage/routing/gap-cells'
import { allObstacles, defaultCorridor, type LayoutSnapshot, type MonthFrame } from '../../../src/renderer/features/lineage/routing/chain'
import type { Pt, Rect } from '../../../src/renderer/features/lineage/routing/anchors'
import { buildRoundedPath, stripCollinear } from '../../../src/renderer/features/lineage/routing/rounding'
import { polylineClearStubs } from '../../../src/renderer/features/lineage/routing/avoid'

const rect = (x: number, y: number, w: number, h: number): Rect => ({ x, y, w, h })
const pt = (x: number, y: number): Pt => ({ x, y })

function snapOf(
  cards: Array<[string, Rect]>,
  labels: Rect[] = [],
  yearHeads: Rect[] = [],
  frames: MonthFrame[] = []
): LayoutSnapshot {
  return { cards: new Map(cards), labels, frames, yearHeads, contentW: 1000, corridor: defaultCorridor(1000) }
}

/** 基准行隙单元夹具：a/b 卡对 → 单元 [100,220]×[170,200]（axis='x'，band0，
 *  槽位 122.7/141.3/160/178.7/197.3，j1=175/j2=195） */
const baseCards: Array<[string, Rect]> = [['a', rect(100, 100, 120, 70)], ['b', rect(100, 200, 120, 70)]]
/** 整数槽位变体（tie 判别专用浮点安全）：W=116→L=108 → 槽位 122/140/158/176/194 */
const tieCards: Array<[string, Rect]> = [['a', rect(100, 100, 116, 70)], ['b', rect(100, 200, 116, 70)]]

const ed = (edgeId: string, pts: Pt[]): AssignEdge => ({ edgeId, route: 'direct', pts })
const band = (edgeId: string, pts: Pt[], bandY: number, bandS: number, bandCap: number): AssignEdge => ({
  edgeId,
  route: 'band',
  pts,
  bandY,
  bandS,
  bandCap
})
const vseg = (x: number): Pt[] => [pt(x, 160), pt(x, 210)]
const hseg = (y: number): Pt[] => [pt(150, y), pt(350, y)]
const cellAt = (cells: GapCell[], x: number, y: number): GapCell =>
  cells.find((c) => c.rect.x === x && c.rect.y === y)!

describe('F-ROUTE-02 U2 ③先占次序+tie→小索引', () => {
  it('理想位最近槽先占：e1(ideal=145)→140(idx1)、e2 同 ideal→158(idx2)；输入逆序仍按 edgeId 字典序处理', () => {
    const out = slotAssign([ed('e2', vseg(145)), ed('e1', vseg(145))], snapOf(tieCards))
    expect(out.length).toBe(2)
    // 处理序=edgeId 字典序：e1 先占最近槽 140（|145−140|=5<|145−158|=13）
    expect(out[1]!.recs[0]).toMatchObject({ edgeId: 'e1', segIdx: 0, axis: 'x', ideal: 145, slotIdx: 1, overlapExempt: false, residual: false })
    expect(out[1]!.pts).toEqual([pt(145, 160), pt(145, 175), pt(140, 175), pt(140, 195), pt(145, 195), pt(145, 210)])
    expect(out[0]!.recs[0]).toMatchObject({ edgeId: 'e2', slotIdx: 2 })
    expect(out[0]!.pts[2]).toEqual(pt(158, 175))
  })

  it('两槽等距 ideal=149（|149−140|=|149−158|=9）→ tie 取小索引 idx1=140', () => {
    const out = slotAssign([ed('t1', vseg(149))], snapOf(tieCards))
    expect(out[0]!.recs[0]).toMatchObject({ slotIdx: 1, overlapExempt: false })
    expect(out[0]!.pts).toEqual([pt(149, 160), pt(149, 175), pt(140, 175), pt(140, 195), pt(149, 195), pt(149, 210)])
  })
})

describe('F-ROUTE-02 U2 ④邻缝扫描左/上先（L2 同带域：axis+bandId 限定）', () => {
  // 2×3 卡阵：三列行隙单元 C_a=[100,200]/C_b=[250,350]/C_c=[400,500]×[170,200]（同 band0）
  const gridCards: Array<[string, Rect]> = [
    ['T1', rect(100, 100, 100, 70)],
    ['T2', rect(250, 100, 100, 70)],
    ['T3', rect(400, 100, 100, 70)],
    ['B1', rect(100, 200, 100, 70)],
    ['B2', rect(250, 200, 100, 70)],
    ['B3', rect(400, 200, 100, 70)]
  ]

  it('L1 本单元先占：e1(ideal=290) 落 C_b 最近槽 284.7', () => {
    const cells = extractGapCells(snapOf(gridCards))
    const Cb = cellAt(cells, 250, 170)
    expect(slotsOf(Cb)).toEqual([269.3, 284.7, 300, 315.3, 330.7])
    const out = slotAssign([ed('e1', vseg(290))], snapOf(gridCards))
    expect(out[0]!.recs[0]).toMatchObject({ cellId: Cb.id, slotIdx: 1 })
    expect(out[0]!.pts).toEqual([pt(290, 160), pt(290, 175), pt(284.7, 175), pt(284.7, 195), pt(290, 195), pt(290, 210)])
  })

  it('L1 穷尽→L2 左右等距邻缝 tie → 几何小侧（左）先：中单元 C_b 满员后落 C_a 而非 C_c', () => {
    const cells = extractGapCells(snapOf(gridCards))
    const Ca = cellAt(cells, 100, 170)
    const filler = ['e1', 'e2', 'e3', 'e4', 'e5'].map((id) => ed(id, vseg(290)))
    const out = slotAssign([...filler, ed('e6', vseg(290))], snapOf(gridCards))
    // 填充五边各占一槽（e1→284.7/e2→300/e3→269.3/e4→315.3/e5→330.7）
    expect(filler.map((_, i) => out[i]!.recs[0]!.slotIdx).sort()).toEqual([0, 1, 2, 3, 4])
    // e6：C_b 五槽全占 → L2 候选 C_a/C_c 索引差均 1 → tie 几何小侧 C_a（slotLo=100<400）先
    const r6 = out[5]!.recs[0]!
    expect(r6).toMatchObject({ edgeId: 'e6', ideal: 290, overlapExempt: false })
    expect(r6.cellId).toBe(Ca.id)
    expect(r6.slotIdx).toBe(4) // C_a 槽位 [119.3,134.7,150,165.3,180.7] 中距 290 最近=180.7
    expect(out[5]!.pts).toEqual([pt(290, 160), pt(290, 175), pt(180.7, 175), pt(180.7, 195), pt(290, 195), pt(290, 210)])
  })

  it('列缝对称（上先）：三行 y 单元（y=100/220/340）满中带后 tie 落上侧 Y0', () => {
    const lrCards: Array<[string, Rect]> = [
      ['L1', rect(100, 100, 60, 60)],
      ['R1', rect(300, 100, 60, 60)],
      ['L2', rect(100, 220, 60, 60)],
      ['R2', rect(300, 220, 60, 60)],
      ['L3', rect(100, 340, 60, 60)],
      ['R3', rect(300, 340, 60, 60)]
    ]
    const cells = extractGapCells(snapOf(lrCards))
    const Y0 = cells.find((c) => c.axis === 'y' && c.rect.y === 100)!
    const Y1 = cells.find((c) => c.axis === 'y' && c.rect.y === 220)!
    expect(slotsOf(Y1)).toEqual([232.7, 241.3, 250, 258.7, 267.3]) // W=60：pos=224+k·52/6
    const filler = ['e1', 'e2', 'e3', 'e4', 'e5'].map((id) => ed(id, hseg(240)))
    const out = slotAssign([...filler, ed('e6', hseg(240))], snapOf(lrCards))
    expect(filler.map((_, i) => out[i]!.recs[0]!.slotIdx).sort()).toEqual([0, 1, 2, 3, 4])
    // e6：Y1 满员 → L2 候选 Y0/Y2 索引差均 1 → tie 上侧 Y0（slotLo=100<340）先
    const r6 = out[5]!.recs[0]!
    expect(r6.cellId).toBe(Y0.id)
    expect(r6.slotIdx).toBe(4) // Y0 槽位 [112.7,121.3,130,138.7,147.3] 距 ideal=240 最近=147.3
    expect(out[5]!.pts).toEqual([
      pt(150, 240),
      pt(165, 240),
      pt(165, 147.3),
      pt(295, 147.3),
      pt(295, 240),
      pt(350, 240)
    ])
  })
})

describe('F-ROUTE-02 U2 ⑤L3 双态触发（全占∨全不可达→overlapExempt）', () => {
  it('全占态：六边同 ideal=150，前五边占满五槽，第六边穷尽→豁免落 ideal 不偏移', () => {
    const edges = ['e1', 'e2', 'e3', 'e4', 'e5', 'e6'].map((id) => ed(id, vseg(150)))
    const out = slotAssign(edges, snapOf(baseCards))
    // 槽序（距 150）：141.3(idx1)/160(idx2)/122.7(idx0)/178.7(idx3)/197.3(idx4)
    expect(out.map((o) => o.recs[0]!.slotIdx)).toEqual([1, 2, 0, 3, 4, undefined])
    expect(out[4]!.recs[0]).toMatchObject({ overlapExempt: false })
    const r6 = out[5]!.recs[0]!
    expect(r6).toMatchObject({ edgeId: 'e6', cellId: 0, axis: 'x', ideal: 150, overlapExempt: true, residual: false })
    expect(r6.slotIdx).toBeUndefined()
    expect(out[5]!.pts).toEqual(vseg(150)) // a6：豁免几何=ideal 未偏移
  })
})

describe('F-ROUTE-02 U2 ⑥谓词复检失败流（pre-commit 权威门）', () => {
  // 标签 x∈[146,150]：静态走廊全不沾（corridor 隅 [137.3,145.3]/[156,164] 均无正叠）
  // 但膨胀后 [142,150] 覆盖 ideal=148 的 jog 起点 (148,175) → 全槽谓词失败
  const snap = snapOf(baseCards, [rect(146, 171, 4, 28)])

  it('前置：单元开放、无 blocked、五槽 slotFree 全 true（失败源=谓词非静态）', () => {
    const cell = extractGapCells(snap)[0]!
    expect(cell.closed).toBe(false)
    expect(cell.blockedSlots.size).toBe(0)
    expect(slotsOf(cell).length).toBe(5)
    const use = new SlotUse()
    for (let i = 0; i < 5; i++) expect(slotFree(use, cell, i)).toBe(true)
  })

  it('slotFree 过但 zChainClear 失败→槽级不可用续扫→穷尽→豁免（几何不变）', () => {
    const out = slotAssign([ed('e1', vseg(148))], snap)
    const r = out[0]!.recs[0]!
    expect(r).toMatchObject({ ideal: 148, overlapExempt: true, residual: false })
    expect(r.slotIdx).toBeUndefined()
    expect(out[0]!.pts).toEqual(vseg(148))
  })
})

describe('F-ROUTE-02 U2 ⑦跨单元穿越逐单元独立（同带重叠单元）', () => {
  // 三上卡阶梯（同行互叠）×一下卡 → 三个同 band 重叠单元 [100,180]/[120,180]/[140,180]×[170,200]
  const cards: Array<[string, Rect]> = [
    ['T1', rect(100, 100, 100, 70)],
    ['T2', rect(120, 100, 100, 70)],
    ['T3', rect(140, 100, 120, 70)],
    ['B', rect(100, 200, 80, 70)]
  ]

  it('一竖段穿三单元→三 AssignRec 各落各槽+逐单元 Z 形（同 span 依次施加）', () => {
    const cells = extractGapCells(snapOf(cards))
    const cA = cellAt(cells, 100, 170)
    const cB = cellAt(cells, 120, 170)
    const cC = cellAt(cells, 140, 170)
    expect(slotsOf(cA)).toEqual([116, 128, 140, 152, 164]) // W=80：pos=104+k·12
    expect(slotsOf(cB)).toEqual([132.7, 141.3, 150, 158.7, 167.3]) // W=60：pos=124+k·52/6
    expect(slotsOf(cC)).toEqual([150.4, 156.8, 163.2, 169.6]) // W=40：n=4，pos=144+k·6.4
    const out = slotAssign([ed('e1', [pt(149, 160), pt(149, 198)])], snapOf(cards))
    const recs = out[0]!.recs
    expect(recs.length).toBe(3)
    expect(recs[0]).toMatchObject({ cellId: cA.id, slotIdx: 3, ideal: 149, overlapExempt: false })
    expect(recs[1]).toMatchObject({ cellId: cB.id, slotIdx: 2 })
    expect(recs[2]).toMatchObject({ cellId: cC.id, slotIdx: 0 })
    expect(out[0]!.pts).toEqual([
      pt(149, 160),
      pt(149, 175), pt(152, 175), pt(152, 195), pt(149, 195),
      pt(149, 175), pt(150, 175), pt(150, 195), pt(149, 195),
      pt(149, 175), pt(150.4, 175), pt(150.4, 195), pt(149, 195),
      pt(149, 198)
    ])
  })
})

describe('F-ROUTE-02 U2 ⑧分配侧 blockedSlots 消费（主循环跳过 blocked 槽）', () => {
  it('blocked 槽（U1 标签 x∈[137,146] 盖 idx1 走廊）被主循环跳过→次近槽落位；对照无标签=Δ<1 保留', () => {
    const snapBlocked = snapOf(baseCards, [rect(137, 180, 9, 10)])
    const cell = extractGapCells(snapBlocked)[0]!
    expect(cell.blockedSlots.has(1)).toBe(true)
    const out = slotAssign([ed('e1', vseg(141))], snapBlocked)
    // idx1(141.3, Δ=0.3) blocked 跳过 → 次近=idx0(122.7, Δ=18.3) 落位
    expect(out[0]!.recs[0]).toMatchObject({ slotIdx: 0, overlapExempt: false })
    expect(out[0]!.pts).toEqual([pt(141, 160), pt(141, 175), pt(122.7, 175), pt(122.7, 195), pt(141, 195), pt(141, 210)])
    // 对照：无标签时 idx1 Δ=0.3<1 → 豁免保留占用（几何不变）
    const outCtl = slotAssign([ed('e1', vseg(141))], snapOf(baseCards))
    expect(outCtl[0]!.recs[0]).toMatchObject({ slotIdx: 1, overlapExempt: true })
    expect(outCtl[0]!.pts).toEqual(vseg(141))
  })
})

describe('F-ROUTE-02 U2 ⑨残余子 pass 旧式等价（对照旧 applyBandLanes 字面语义）', () => {
  const openField = snapOf([]) // 无卡=无单元：全残余域（开阔域共道分离零丢失）

  it('s=9 框间带两成员：off=∓((cap−1)/2)·s=∓4.5 → 180.5/189.5', () => {
    const e1 = band('e1', [pt(100, 185), pt(300, 185)], 185, 9, 2)
    const e2 = band('e2', [pt(100, 185), pt(300, 185)], 185, 9, 2)
    const out = slotAssign([e1, e2], openField)
    expect(out[0]!.pts).toEqual([pt(100, 180.5), pt(300, 180.5)])
    expect(out[1]!.pts).toEqual([pt(100, 189.5), pt(300, 189.5)])
    expect(out[0]!.recs).toEqual([
      { edgeId: 'e1', segIdx: 0, cellId: -1, axis: 'y', ideal: 185, overlapExempt: false, residual: true }
    ])
    expect(out[1]!.recs[0]).toMatchObject({ residual: true, cellId: -1, ideal: 185 })
  })

  it('s=6 行隙三成员：中位 off=0 跳过（不动+无 rec），两侧 ∓6', () => {
    const edges = ['e1', 'e2', 'e3'].map((id) => band(id, [pt(100, 185), pt(300, 185)], 185, 6, 3))
    const out = slotAssign(edges, openField)
    expect(out[0]!.pts).toEqual([pt(100, 179), pt(300, 179)])
    expect(out[1]!.pts).toEqual([pt(100, 185), pt(300, 185)]) // off=0 跳过
    expect(out[1]!.recs).toEqual([])
    expect(out[2]!.pts).toEqual([pt(100, 191), pt(300, 191)])
  })

  it('cap 溢出钳：五成员 s=6/cap=3 → off=(i−2)·6 钳 ±6 → 边界重合（旧语义）', () => {
    const edges = ['e1', 'e2', 'e3', 'e4', 'e5'].map((id) => band(id, [pt(100, 185), pt(300, 185)], 185, 6, 3))
    const out = slotAssign(edges, openField)
    expect(out[0]!.pts).toEqual([pt(100, 179), pt(300, 179)])
    expect(out[1]!.pts).toEqual([pt(100, 179), pt(300, 179)]) // −12 钳至 −6：e1/e2 重合
    expect(out[2]!.pts).toEqual([pt(100, 185), pt(300, 185)])
    expect(out[3]!.pts).toEqual([pt(100, 191), pt(300, 191)])
    expect(out[4]!.pts).toEqual([pt(100, 191), pt(300, 191)]) // +12 钳至 +6：e4/e5 重合
  })

  it('x 投影不互达不聚簇：[100,150]/[200,250] 两单成员簇跳过；[100,180]/[170,300] 重叠→聚簇偏移', () => {
    const far = slotAssign(
      [band('e1', [pt(100, 185), pt(150, 185)], 185, 6, 3), band('e2', [pt(200, 185), pt(250, 185)], 185, 6, 3)],
      openField
    )
    expect(far[0]!.pts).toEqual([pt(100, 185), pt(150, 185)]) // 单成员簇跳过
    expect(far[0]!.recs).toEqual([])
    expect(far[1]!.pts).toEqual([pt(200, 185), pt(250, 185)])
    const near = slotAssign(
      [band('e1', [pt(100, 185), pt(180, 185)], 185, 6, 3), band('e2', [pt(170, 185), pt(300, 185)], 185, 6, 3)],
      openField
    )
    expect(near[0]!.pts).toEqual([pt(100, 182), pt(180, 182)]) // 互达（170≤180）→一簇：off=(i−0.5)·6=∓3
    expect(near[1]!.pts).toEqual([pt(170, 188), pt(300, 188)])
  })

  it('混合组：band 跑段垂直穿越 y 单元（槽占用区间退出残余域）+残余区间簇偏移', () => {
    // 高 L/R 卡夹列缝单元 [160,300]×[100,290]（y 槽沿 y 分布，bandY=185 严格
    // 内含→垂直穿越消费）：e1 落槽 idx2(195)/e2 落 idx1(164.7)；残余区间
    // [80,160]/[300,340] 两簇各 off=(i−0.5)·6=∓3；跑段零测度不消费 x 单元
    // （U1 半开语义）→开阔域分离零丢失（W-4）
    const cards: Array<[string, Rect]> = [
      ['L', rect(100, 100, 60, 190)],
      ['R', rect(300, 100, 60, 190)]
    ]
    const cell = extractGapCells(snapOf(cards))[0]!
    expect(cell).toMatchObject({ axis: 'y', rect: rect(160, 100, 140, 190) })
    expect(slotsOf(cell)).toEqual([134.3, 164.7, 195, 225.3, 255.7]) // W=190：pos=104+k·182/6
    const e1 = band('e1', [pt(80, 185), pt(340, 185)], 185, 6, 3)
    const e2 = band('e2', [pt(80, 185), pt(340, 185)], 185, 6, 3)
    const out = slotAssign([e1, e2], snapOf(cards))
    // 槽 pass：e1→idx2(195, Δ=10)、e2→idx1(164.7, Δ=20.3)；jog 区 [165,295]
    expect(out[0]!.recs[0]).toMatchObject({ cellId: cell.id, axis: 'y', ideal: 185, slotIdx: 2, overlapExempt: false, residual: false })
    expect(out[1]!.recs[0]).toMatchObject({ slotIdx: 1 })
    // 残余 pass：两簇 [80,160]/[300,340] 各 off=(i−0.5)·6=∓3（cellId=−1/axis='y'/residual）
    expect(out[0]!.recs.filter((r) => r.residual).length).toBe(2)
    expect(out[0]!.pts).toEqual([
      pt(80, 182), pt(160, 182), pt(160, 185), pt(165, 185), pt(165, 195),
      pt(295, 195), pt(295, 185), pt(300, 185), pt(300, 182), pt(340, 182)
    ])
    expect(out[1]!.pts).toEqual([
      pt(80, 188), pt(160, 188), pt(160, 185), pt(165, 185), pt(165, 164.7),
      pt(295, 164.7), pt(295, 185), pt(300, 185), pt(300, 188), pt(340, 188)
    ])
  })
})

describe('F-ROUTE-02 U2 ⑩确定性双跑序列化全等', () => {
  it('同输入两次 slotAssign→JSON 序列化全等（含 pts+recs）', () => {
    const snap = snapOf(baseCards)
    const edges = [ed('eB', vseg(148)), ed('eA', vseg(150)), band('eC', [pt(100, 185), pt(300, 185)], 185, 6, 3)]
    const stubs = new Map([['eA', [{ a: pt(90, 90), b: pt(95, 95) }]]])
    const a = slotAssign(edges, snap, stubs)
    const b = slotAssign(edges, snap, stubs)
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })
})

describe('F-ROUTE-02 U2 ⑪r=0 仍不清→路径仍产出（finish 收缩链现行语义锁定）', () => {
  it('r=6/3 采样均不清→r=0 档 d 非空（无 onWarn 增配）', () => {
    const snap = snapOf(baseCards, [rect(146, 171, 4, 28)])
    const obstacles = allObstacles(snap)
    const pts = vseg(150)
    const stripped = stripCollinear(pts)
    const r6 = buildRoundedPath(stripped, 6)
    expect(polylineClearStubs(r6.samples, [], obstacles)).toBe(false)
    const r3 = buildRoundedPath(stripped, 3)
    expect(polylineClearStubs(r3.samples, [], obstacles)).toBe(false)
    const r0 = buildRoundedPath(stripped, 0)
    expect(r0.d).not.toBe('')
    expect(r0.d.startsWith('M')).toBe(true)
  })
})

describe('F-ROUTE-02 U2 专项 A（N-3 验收勾）：部分穿越段 [j1,j2]⊆段∩单元跨度', () => {
  it('仅覆盖上部（段止于 185<[j2]=195）→ 全槽不可用→豁免、几何不变', () => {
    const out = slotAssign([ed('u1', [pt(150, 160), pt(150, 185)])], snapOf(baseCards))
    const r = out[0]!.recs[0]!
    expect(r).toMatchObject({ overlapExempt: true, residual: false })
    expect(r.slotIdx).toBeUndefined()
    expect(out[0]!.pts).toEqual([pt(150, 160), pt(150, 185)])
  })

  it('仅覆盖下部（段起于 185>[j1]=175）→ 全槽不可用→豁免、几何不变', () => {
    const out = slotAssign([ed('d1', [pt(150, 185), pt(150, 230)])], snapOf(baseCards))
    expect(out[0]!.recs[0]).toMatchObject({ overlapExempt: true })
    expect(out[0]!.pts).toEqual([pt(150, 185), pt(150, 230)])
  })

  it('边界恰容（段 [175,195]===jog 区）→ 可行落位（⊆ 含等号）；正控：全穿落位', () => {
    const edge = slotAssign([ed('b1', [pt(150, 175), pt(150, 195)])], snapOf(baseCards))
    expect(edge[0]!.recs[0]).toMatchObject({ slotIdx: 1, overlapExempt: false })
    expect(edge[0]!.pts).toEqual([pt(150, 175), pt(141.3, 175), pt(141.3, 195), pt(150, 195)])
    const full = slotAssign([ed('b2', vseg(150))], snapOf(baseCards))
    expect(full[0]!.recs[0]).toMatchObject({ slotIdx: 1 })
  })
})

describe('F-ROUTE-02 U2 专项 B（d1-N2 验收勾）：slotFree 调用侧索引域保证', () => {
  it('blockedSlots 索引域 ⊆ slotsOf 输出序 0..n−1（提取面与输出一致）', () => {
    const cell = extractGapCells(snapOf(baseCards, [rect(137, 180, 9, 10)]))[0]!
    const n = slotsOf(cell).length
    expect(n).toBe(5)
    expect([...cell.blockedSlots].every((idx) => idx >= 0 && idx < n)).toBe(true)
  })

  it('越界索引 slotFree 会放行（虚拟槽无占用）→ 主循环构造上不可达：全 battery rec.slotIdx 恒在域内', () => {
    const cell = extractGapCells(snapOf(baseCards))[0]!
    expect(slotFree(new SlotUse(), cell, 99)).toBe(true) // 危险面在案：越界=放行
    const snap = snapOf(baseCards)
    const battery = slotAssign(
      ['e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7'].map((id) => ed(id, vseg(150))),
      snap
    )
    const cells = extractGapCells(snap)
    const allRecs: AssignRec[] = battery.flatMap((o) => o.recs)
    expect(allRecs.length).toBeGreaterThan(0)
    for (const r of allRecs) {
      if (r.slotIdx !== undefined) {
        expect(r.cellId).toBeGreaterThanOrEqual(0)
        expect(r.slotIdx).toBeGreaterThanOrEqual(0)
        expect(r.slotIdx).toBeLessThan(slotsOf(cells[r.cellId]!).length) // 0..n−1 域内
      }
    }
  })
})

describe('F-ROUTE-02 U2 S2 例：H∈[9,12) 单元开放但全槽不可用→续扫', () => {
  it('gap=9（净距=2·PAD+1 边界开放）：j2−j1=9−10<2→全槽不可行→豁免（无邻缝可续→L3）', () => {
    const snap = snapOf([['p', rect(100, 100, 100, 70)], ['q', rect(100, 179, 100, 70)]])
    const cell = extractGapCells(snap)[0]!
    expect(cell.rect).toEqual(rect(100, 170, 100, 9))
    expect(slotsOf(cell).length).toBe(5) // 开放（travel=9 不封闭）
    // ideal=142 距各槽均≥1（Δ<1 保留不触发）→全槽 Z 不可行→穷尽豁免
    const out = slotAssign([ed('e1', [pt(142, 160), pt(142, 178)])], snap)
    const r = out[0]!.recs[0]!
    expect(r).toMatchObject({ overlapExempt: true, residual: false })
    expect(r.slotIdx).toBeUndefined()
    expect(out[0]!.pts).toEqual([pt(142, 160), pt(142, 178)])
  })
})

describe('F-ROUTE-02 U2 Δ<1 豁免保留占用（防后段重取）', () => {
  it('e1 ideal=141.3=槽 idx1 → Δ=0 豁免保留（几何不变+slotIdx 落记）；e2 同 ideal→异槽 idx0', () => {
    const out = slotAssign([ed('e1', vseg(141.3)), ed('e2', vseg(141.3))], snapOf(baseCards))
    expect(out[0]!.recs[0]).toMatchObject({ slotIdx: 1, overlapExempt: true, residual: false })
    expect(out[0]!.pts).toEqual(vseg(141.3))
    // idx1 被保留占用 → e2 不可重取：次近=idx0(122.7, Δ=18.6) 先于 idx2(160, Δ=18.7)
    expect(out[1]!.recs[0]).toMatchObject({ slotIdx: 0, overlapExempt: false })
    expect(out[1]!.pts[2]).toEqual(pt(122.7, 175))
  })
})

describe('F-ROUTE-02 U2 桩区禁入（有桩段续扫/无桩段直入）', () => {
  const stubs = new Map<string, ReadonlyArray<{ a: Pt; b: Pt }>>([
    ['e1', [{ a: pt(155, 174), b: pt(165, 196) }]] // AABB [155,165]×[174,196] 盖 idx2 槽线 jog 角
  ])

  it('有桩边：最近槽 idx2(160, Δ=5) 拐点 (160,175) 入桩 AABB 严格内部→不可用→续扫落 idx1(141.3)', () => {
    const out = slotAssign([ed('e1', vseg(155))], snapOf(baseCards), stubs)
    expect(out[0]!.recs[0]).toMatchObject({ slotIdx: 1, overlapExempt: false })
    expect(out[0]!.pts).toEqual([pt(155, 160), pt(155, 175), pt(141.3, 175), pt(141.3, 195), pt(155, 195), pt(155, 210)])
  })

  it('无桩边同几何：无桩区约束→最近槽 idx2(160) 直入（对照）', () => {
    const out = slotAssign([ed('e1', vseg(155))], snapOf(baseCards))
    expect(out[0]!.recs[0]).toMatchObject({ slotIdx: 2, overlapExempt: false })
    expect(out[0]!.pts[2]).toEqual(pt(160, 175))
  })
})
