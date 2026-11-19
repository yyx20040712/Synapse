/**
 * [F-LANEGRID-01 B1] 车道网格层直测（票号 F-LANEGRID-01 B1；设计稿
 * docs/design/2026-11-19_f-lanegrid01-design.md §2 网格模型——期望值承设计
 * §2.5 手推算例与 B1 规格算例（①锚道/②行隙/③列隙/⑤死区/⑥退化/⑦确定性/
 * ⑧最小走廊=B1 规格编号，逐条标注于用例名）；裁决记录
 * docs/design/2026-11-19_lane-grid-rerouting.md 裁决②③）。夹具=帧
 * padding-box 系：frame={x:−1.6,y:0,w:453.2,h:250} → x 域
 * [−1.6+1.6, −1.6+453.2−1.6]=[0,450]；卡 A={x:12,y:18,w:128,h:72}；双行
 * 夹具=偶行 {12,18}/{212,18}+奇行 {112,162}/{312,162}（节距 200×144、错位
 * 100）。期望值全部从夹具几何手推（算式写在断言旁），禁抄实现输出。
 * always-active 裸 describe。
 */
import { describe, expect, it } from 'vitest'
import { PAD, segHitsRect } from '../../../src/renderer/features/lineage/routing/avoid'
import {
  CELL_EPS,
  LANE_INSET,
  LANE_PITCH,
  QUANT,
  buildLaneTable,
  type GridInput,
  type Lane,
  type LaneTable
} from '../../../src/renderer/features/lineage/routing/grid'
import type { Pt, Rect } from '../../../src/renderer/features/lineage/routing/anchors'

const rect = (x: number, y: number, w: number, h: number): Rect => ({ x, y, w, h })
const pt = (x: number, y: number): Pt => ({ x, y })
/** 帧 padding-box 夹具：border 内缘 x 域=[0,450]（§2.5 口径） */
const FRAME = rect(-1.6, 0, 453.2, 250)
/** 卡 A（设计 §2.5-①：{x:12,y:18,w:128,h:72}） */
const cardA = rect(12, 18, 128, 72)
/** 双行夹具：偶行 {12,18}/{212,18}、奇行 {112,162}/{312,162}（B1 规格②③） */
const cardsFull = [
  rect(12, 18, 128, 72),
  rect(212, 18, 128, 72),
  rect(112, 162, 128, 72),
  rect(312, 162, 128, 72)
]

const gridOf = (
  cards: Rect[],
  contentH = 300,
  labels: Rect[] = [],
  yearHeads: Rect[] = [],
  frames: Rect[] = [FRAME]
): LaneTable => buildLaneTable({ cards, labels, yearHeads, frames, contentH })

const coords = (lanes: readonly Lane[]): number[] => lanes.map((l) => l.coord)
const byCoord = (lanes: readonly Lane[], c: number): Lane => lanes.find((l) => l.coord === c)!

/** 双行夹具全表竖道（手推）：锚道 12（4 卡×¼/½/¾）+列隙 14（偶 [140,212]→150..198、
 *  奇 [240,312]→250..298 各 7）+边侧 2（左 2、右 450）=28 道去重升序 */
const V_FULL = [
  2, 44, 76, 108, 144, 150, 158, 166, 174, 176, 182, 190, 198, 208, 244, 250, 258, 266, 274,
  276, 282, 290, 298, 308, 344, 376, 408, 450
]
/** 双行夹具全表横道（手推）：锚道 6（两行×18/36/54 位）+行隙 7（[90,162]→100..148）
 *  +外区带 8（顶 {8,0}+底 {244..284} 6 道）=21 道去重升序 */
const H_FULL = [
  0, 8, 36, 54, 72, 100, 108, 116, 124, 132, 140, 148, 180, 198, 216, 244, 252, 260, 268, 276,
  284
]

describe('F-LANEGRID-01 B1 grid：常量与车道域（§2.1）', () => {
  it('常量冻结：LANE_PITCH=8/LANE_INSET=10/PAD=6（DEAD=avoid 单源）/QUANT=0.1/CELL_EPS=0.05（gap-cells 再导出面）', () => {
    expect(LANE_PITCH).toBe(8)
    expect(LANE_INSET).toBe(10)
    expect(PAD).toBe(6)
    expect(QUANT).toBe(0.1)
    expect(CELL_EPS).toBe(0.05)
  })

  it('车道 x 域=帧 border 内缘：frame {−1.6,453.2} → x 域 [0,450]；单卡右缘 140 → 右侧边侧道 150..446（140+10+8k≤450，k=0..37），454 不生成', () => {
    // 单卡右缘 140：边侧道 140+10+8k≤450 → 150..446（k=0..37），454>450
    const t = gridOf([cardA])
    const cs = coords(t.v)
    expect(cs).toContain(150)
    expect(cs[cs.length - 1]).toBe(446)
    expect(cs).not.toContain(454)
  })
})

describe('F-LANEGRID-01 B1 grid：设计 §2.5-① 锚道+边侧道', () => {
  it('①锚道：卡 A 产竖道 44/76/108（12+128×¼/½/¾）、横道 36/54/72（18+72×¼/½/¾）', () => {
    const t = gridOf([cardA])
    expect(coords(t.v)).toEqual(expect.arrayContaining([44, 76, 108]))
    expect(coords(t.h)).toEqual(expect.arrayContaining([36, 54, 72]))
  })

  it('①边侧道：left 锚桩端 (2,36) 所需边侧道 x=2 存在（全局最左卡左 12−10=2；2−8=−6<域下界 0 止）→ 左带恰 1 道', () => {
    const t = gridOf([cardA])
    const cs = coords(t.v)
    expect(cs).toContain(2)
    expect(cs[0]).toBe(2)
  })
})

describe('F-LANEGRID-01 B1 grid：B1 规格②③ 间隙道（列隙按相位=设计 §2.5-③ 阶梯几何）', () => {
  it('②行隙 7 道：行顶 18/162、行高 72 → 走廊 [90,162] → 横道 100,108,…,148（90+10+8k≤162−10），156>152 不生成', () => {
    const cs = coords(gridOf(cardsFull).h)
    expect(cs.filter((c) => c >= 100 && c <= 148)).toEqual([100, 108, 116, 124, 132, 140, 148])
    expect(cs).not.toContain(156)
  })

  it('③列隙偶行：卡 {12,18}/{212,18} → 走廊 [140,212] → 竖道 150,…,198（7 道）；窗内另有奇行锚道 176（设计 §2.5-④ 跨相位 2px 候选——生成不排除），206>202 不生成', () => {
    const cs = coords(gridOf(cardsFull).v)
    // 走廊道=140+10+8k≤212−10=202 → 150..198；176=112+64 奇行锚道同窗共存
    expect(cs.filter((c) => c >= 150 && c <= 198)).toEqual([
      150, 158, 166, 174, 176, 182, 190, 198
    ])
    expect(cs).not.toContain(206)
  })

  it('③列隙奇行：卡 {112,162}/{312,162} → 走廊 [240,312] → 竖道 250,…,298（7 道）；偶行锚道 276 同窗共存，306>302 不生成', () => {
    const cs = coords(gridOf(cardsFull).v)
    expect(cs.filter((c) => c >= 250 && c <= 298)).toEqual([
      250, 258, 266, 274, 276, 282, 290, 298
    ])
    expect(cs).not.toContain(306)
  })
})

describe('F-LANEGRID-01 B1 grid：设计 §2.5-⑤⑥ 外区带（障碍三源并集）', () => {
  it('⑤顶带：卡最上缘 18 → 顶道 8,0（18−10−8k≥0），−8 不生成；⑥底带：两行卡底 234、contentH=300 → 244+8k≤290 → 244,252,260,268,276,284 恰 6 道（k≤(290−244)/8=5.75），292 不生成', () => {
    const cs = coords(gridOf(cardsFull).h)
    expect(cs).toContain(8)
    expect(cs).toContain(0)
    expect(cs[0]).toBe(0)
    expect(cs.filter((c) => c >= 244)).toEqual([244, 252, 260, 268, 276, 284])
    expect(cs).not.toContain(292)
  })

  it('三源并集：仅月标 label {10,120,90,20}（无卡）→ v 表空（无卡=锚/隙/边侧三族全灭）、外区带照生（顶 110−8k≥0 → 6..110 十四道；底 140+10+8k≤290 → 150..286 十八道）', () => {
    const t = gridOf([], 300, [rect(10, 120, 90, 20)])
    expect(t.v).toEqual([])
    const cs = coords(t.h)
    expect(cs.filter((c) => c <= 110)).toEqual([
      6, 14, 22, 30, 38, 46, 54, 62, 70, 78, 86, 94, 102, 110
    ])
    expect(cs.filter((c) => c >= 150)).toEqual([
      150, 158, 166, 174, 182, 190, 198, 206, 214, 222, 230, 238, 246, 254, 262, 270, 278, 286
    ])
  })

  it('⑥末下外区带精确算例（设计 §2.5-⑥）：末卡底 508、contentH=560 → 底带 518,526,534,542,550 恰 5 道（508+10+8k≤560−10=550，含边界 550），558 不生成', () => {
    // 卡 {12,436,128,72} 底=508；帧高抬至 560 使中心点 (76,472) 落帧内（帧底带同锚去重吸收）
    const t = gridOf([rect(12, 436, 128, 72)], 560, [], [], [rect(-1.6, 0, 453.2, 560)])
    const cs = coords(t.h)
    expect(cs.filter((c) => c >= 518)).toEqual([518, 526, 534, 542, 550])
    expect(cs).not.toContain(558)
  })
})

describe('F-LANEGRID-01 B1 grid：设计 §2.5-⑤ 帧顶带回归（逐帧首行上带/末行下带独立族）', () => {
  it('⑤帧顶带：首行卡顶 89.5+月标顶 72+年份头顶 18 同场 → 横道含 79.5/71.5（89.5−10−8k≥0 步进锚定卡顶，69.5=月标顶 72−10+…非卡顶锚定不生成）；月标 x 跨度段死区杀、其右存活（h·79.5 alive=[[102.05,450]]——月标膨胀 x[0,102] 切口端收缩）', () => {
    // 月标/年份头在场时全局外区带锚定最上障碍（年份头顶 18→{8,0}），
    // 帧内首行上方带由帧内卡顶 89.5 独立派生（blocker 回归：79.5/71.5）
    const card = rect(12, 89.5, 128, 72)
    const label = rect(6, 72, 90, 14)
    const yearHead = rect(0, 18, 120, 20)
    const t = gridOf([card], 300, [label], [yearHead])
    const cs = coords(t.h)
    expect(cs).toContain(79.5)
    expect(cs).toContain(71.5)
    expect(cs).not.toContain(69.5)
    // label 膨胀 y[66,92] 含 79.5 → 死区 x[6−6,6+90+6]=[0,102]；alive=[102.05,450]
    expect(byCoord(t.h, 79.5).alive).toEqual([{ lo: 102.05, hi: 450 }])
  })
})

describe('F-LANEGRID-01 B1 grid：B1 规格⑤ 死区与存活（PAD=6 膨胀·切口端开）', () => {
  it('⑤单卡：竖道 44 alive=[[0,11.95],[96.05,300]]（卡 A y 膨胀 [18−6,18+72+6]=[12,96] 为死区，切口端收缩 CELL_EPS）；横道 36 alive=[[0,5.95],[146.05,450]]（x 膨胀 [12−6,12+128+6]=[6,146]——PAD 双侧，avoid 单源口径）', () => {
    const t = gridOf([cardA])
    expect(byCoord(t.v, 44).alive).toEqual([
      { lo: 0, hi: 11.95 },
      { lo: 96.05, hi: 300 }
    ])
    expect(byCoord(t.h, 36).alive).toEqual([
      { lo: 0, hi: 5.95 },
      { lo: 146.05, hi: 450 }
    ])
  })

  it('⑤双行死区合并：横道 36 alive=[[0,5.95],[146.05,205.95],[346.05,450]]（同行 A1/A2 死段 [6,146]/[206,346] 合并排序取补、切口端收缩）；边侧道 2/450 与行隙道 108 全程存活（离卡 ≥10>6，域界端闭原值）', () => {
    const t = gridOf(cardsFull)
    expect(byCoord(t.h, 36).alive).toEqual([
      { lo: 0, hi: 5.95 },
      { lo: 146.05, hi: 205.95 },
      { lo: 346.05, hi: 450 }
    ])
    expect(byCoord(t.v, 2).alive).toEqual([{ lo: 0, hi: 300 }])
    expect(byCoord(t.v, 450).alive).toEqual([{ lo: 0, hi: 300 }])
    expect(byCoord(t.h, 108).alive).toEqual([{ lo: 0, hi: 450 }])
  })

  it('⑤alive 空数组的道仍保留：满高卡 {12,0,128,300} 竖道 44 死区 y[−6,306] 覆全域 → alive=[] 而道在表中', () => {
    const t = gridOf([rect(12, 0, 128, 300)])
    expect(coords(t.v)).toContain(44)
    expect(byCoord(t.v, 44).alive).toEqual([])
  })

  it('⑤切口端开与 avoid 口径一致（segHitsRect 边界相触=命中）：(44,96)→(44,100) 贴膨胀缘命中（故 alive 自 96.05 起）；(44,96.05)→(44,100) 净空；(44,0)→(44,11.95) 净空（域界端闭）；alive 末区间 hi=300 原值', () => {
    const t = gridOf([cardA])
    const inflA = {
      x: cardA.x - PAD,
      y: cardA.y - PAD,
      w: cardA.w + 2 * PAD,
      h: cardA.h + 2 * PAD
    }
    expect(segHitsRect(pt(44, 96), pt(44, 100), inflA)).toBe(true)
    expect(segHitsRect(pt(44, 96.05), pt(44, 100), inflA)).toBe(false)
    expect(segHitsRect(pt(44, 0), pt(44, 11.95), inflA)).toBe(false)
    expect(byCoord(t.v, 44).alive).toEqual([
      { lo: 0, hi: 11.95 },
      { lo: 96.05, hi: 300 }
    ])
  })

  it('⑤切口恰触域界（等号态——切口性质优先于域界闭）：年份头膨胀 y[−26,0]（hi 触域下界 0）与 y[300,326]（lo 触域上界 300）同场 → v44 alive=[[0.05,11.95],[96.05,299.95]]——segHitsRect 判 (44,0)→(44,11.95) 与 (44,299.95)→(44,300) 均命中，0/300 不可作段端', () => {
    const yhLo = rect(0, -20, 100, 14) // 跨度 [−20,−6] → 膨胀 [−26,0]：hi===域下界
    const yhHi = rect(0, 306, 100, 14) // 跨度 [306,320] → 膨胀 [300,326]：lo===域上界
    const t = gridOf([cardA], 300, [], [yhLo, yhHi])
    const inflLo = { x: yhLo.x - PAD, y: yhLo.y - PAD, w: yhLo.w + 2 * PAD, h: yhLo.h + 2 * PAD }
    const inflHi = { x: yhHi.x - PAD, y: yhHi.y - PAD, w: yhHi.w + 2 * PAD, h: yhHi.h + 2 * PAD }
    expect(segHitsRect(pt(44, 0), pt(44, 11.95), inflLo)).toBe(true)
    expect(segHitsRect(pt(44, 0.05), pt(44, 11.95), inflLo)).toBe(false)
    expect(segHitsRect(pt(44, 299.95), pt(44, 300), inflHi)).toBe(true)
    expect(segHitsRect(pt(44, 96.05), pt(44, 299.95), inflHi)).toBe(false)
    expect(byCoord(t.v, 44).alive).toEqual([
      { lo: 0.05, hi: 11.95 },
      { lo: 96.05, hi: 299.95 }
    ])
  })
})

describe('F-LANEGRID-01 B1 grid：B1 规格⑥ 退化防御', () => {
  it('⑥三源全空 → 表空；frames 空 → 表空（对照：同夹具帧在+卡在 → 表非空，防退化断言恒真）', () => {
    expect(gridOf([], 300)).toEqual({ v: [], h: [] })
    expect(gridOf([cardA], 300, [], [], [])).toEqual({ v: [], h: [] })
    expect(gridOf([cardA]).v.length).toBeGreaterThan(0)
  })

  it('⑥contentH=0 与 NaN → 外区带空（横表空：顶带 8/0 不生、底带无处落）且竖道不受牵连（44 仍在——外区防御只灭外区族；y 域空同时滤尽锚道横候选）', () => {
    const t0 = gridOf([cardA], 0)
    expect(t0.h).toEqual([])
    expect(coords(t0.v)).toContain(44)
    const tN = gridOf([cardA], Number.NaN)
    expect(tN.h).toEqual([])
    expect(coords(tN.v)).toContain(44)
  })
})

describe('F-LANEGRID-01 B1 grid：B1 规格⑦ 确定性与全序', () => {
  it('⑦全表坐标枚举：v 28 道（锚 12+列隙 14+边侧 2）/h 21 道（锚 6+行隙 7+外区 8）精确数组', () => {
    const t = gridOf(cardsFull)
    expect(coords(t.v)).toEqual(V_FULL)
    expect(coords(t.h)).toEqual(H_FULL)
  })

  it('⑦确定性：同输入两次调用 deep-equal；每轴坐标严格升序无重复；id=轴内升序枚举 0..n−1', () => {
    const inp: GridInput = { cards: cardsFull, labels: [], yearHeads: [], frames: [FRAME], contentH: 300 }
    const a = buildLaneTable(inp)
    // 非空对照：防空表使下列逐道断言零执行呈恒真
    expect(a.v.length).toBe(V_FULL.length)
    expect(a.h.length).toBe(H_FULL.length)
    expect(buildLaneTable(inp)).toEqual(a)
    for (const lanes of [a.v, a.h]) {
      lanes.forEach((l, i) => {
        expect(l.id).toBe(i)
        if (i > 0) expect(l.coord).toBeGreaterThan(lanes[i - 1]!.coord)
      })
    }
  })
})

describe('F-LANEGRID-01 B1 grid：B1 规格⑧ 最小走廊（含 2×LANE_INSET 阈边界；B1 规格补充算例，非设计 §2.5 条目）', () => {
  it('⑧列隙走廊：行内卡对间隙 24 → 恰 1 道（+10：走廊 [100,124]→110≤114；118>114 止）', () => {
    // C1{0,0,100,50}/C2{124,0,100,50} 同行（量化 y=0 分组），x 升序相邻对
    const cs = coords(gridOf([rect(0, 0, 100, 50), rect(124, 0, 100, 50)]).v)
    expect(cs.filter((c) => c > 100 && c < 124)).toEqual([110])
  })

  it('⑧阈边界：间隙 20（=2×LANE_INSET）→ 恰 1 道（110≤110 含边界）；间隙 19 → 0 道（110>109）', () => {
    const cs20 = coords(gridOf([rect(0, 0, 100, 50), rect(120, 0, 100, 50)]).v)
    expect(cs20.filter((c) => c > 100 && c < 120)).toEqual([110])
    const cs19 = coords(gridOf([rect(0, 0, 100, 50), rect(119, 0, 100, 50)]).v)
    expect(cs19.filter((c) => c > 100 && c < 119)).toEqual([])
  })
})
