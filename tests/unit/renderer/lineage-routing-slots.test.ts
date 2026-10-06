/**
 * [F-ROUTE-02 U1] 走线候选位分配·单元提取+可用性谓词直测（票号 F-ROUTE-02
 * U1，runId=20261006-froute02-u1；design 2026-10-06_f-route02-design.md §5/§6）。
 * 覆盖：a1 槽位公式（分点+PAD 内缩/边界八点/pitch 不变量）、⑧非卡障碍
 * （closed/静态预过滤/单元外）、N-2 半开消费语义、提取面（相邻性/极大性/
 * 去重/id 排序 tiebreak/gap 边界）、带归属（行隙/列缝正例+窄带=−1）、
 * SlotUse/zChainClear/jogClearOfStub。期望值全部从夹具几何手推（禁抄实现
 * 输出）。always-active 裸 describe（K3）。
 */
import { describe, expect, it } from 'vitest'
import {
  CELL_EPS,
  QUANT,
  SLOT_DIV,
  SLOT_MAX,
  SLOT_MIN_PITCH,
  extractGapCells,
  type GapCell
} from '../../../src/renderer/features/lineage/routing/gap-cells'
import {
  SlotUse,
  jogClearOfStub,
  segConsumesCell,
  slotFree,
  slotsOf,
  zChainClear
} from '../../../src/renderer/features/lineage/routing/slots'
import { defaultCorridor, type LayoutSnapshot, type MonthFrame } from '../../../src/renderer/features/lineage/routing/chain'
import type { Pt, Rect } from '../../../src/renderer/features/lineage/routing/anchors'

const rect = (x: number, y: number, w: number, h: number): Rect => ({ x, y, w, h })
const pt = (x: number, y: number): Pt => ({ x, y })
const frame = (x: number, y: number, w: number, h: number): MonthFrame => ({ x, y, w, h, year: 2026 })

function snapOf(
  cards: Array<[string, Rect]>,
  labels: Rect[] = [],
  yearHeads: Rect[] = [],
  frames: MonthFrame[] = []
): LayoutSnapshot {
  return { cards: new Map(cards), labels, frames, yearHeads, contentW: 1000, corridor: defaultCorridor(1000) }
}

describe('F-ROUTE-02 U1 slots：a1 槽位公式（n=min(5,max(0,⌊L/6⌋−1))，L=W−2·PAD）', () => {
  it('常量冻结：SLOT_DIV=6/SLOT_MAX=5/SLOT_MIN_PITCH=6/CELL_EPS=0.05/QUANT=0.1', () => {
    expect(SLOT_DIV).toBe(6)
    expect(SLOT_MAX).toBe(5)
    expect(SLOT_MIN_PITCH).toBe(6)
    expect(CELL_EPS).toBe(0.05)
    expect(QUANT).toBe(0.1)
  })

  it('①分点+PAD 内缩：x∈[100,200] 单元（W=100，L=92，n=5）→ 槽位 119.3/134.7/150/165.3/180.7（逐位 0.1 量化）', () => {
    // 卡对 t1(100,100,100,70)/t2(100,200,100,70)：gap=30、x 重叠 [100,200]
    const cells = extractGapCells(snapOf([['t1', rect(100, 100, 100, 70)], ['t2', rect(100, 200, 100, 70)]]))
    expect(cells.length).toBe(1)
    expect(cells[0]).toEqual({
      id: 0,
      bandId: 0,
      axis: 'x',
      rect: { x: 100, y: 170, w: 100, h: 30 },
      closed: false,
      blockedSlots: new Set<number>()
    })
    // pos_k=100+4+k·92/6：119.33/134.67/150/165.33/180.67 → 量化 119.3/134.7/150/165.3/180.7
    expect(slotsOf(cells[0]!)).toEqual([119.3, 134.7, 150, 165.3, 180.7])
  })

  it('②边界八点：L=11.9→0 封闭/12→1/23.9→2/24→3/29.9→3/30→4/35.9→4/36→5（W=L+8 卡对 x 重叠构造）', () => {
    const points: Array<[number, number]> = [
      [19.9, 0],
      [20, 1],
      [31.9, 2],
      [32, 3],
      [37.9, 3],
      [38, 4],
      [43.9, 4],
      [44, 5]
    ]
    for (const [w, nExp] of points) {
      const cells = extractGapCells(
        snapOf([['u', rect(100, 100, w, 70)], ['d', rect(100, 200, w, 70)]])
      )
      expect(cells.length).toBe(1)
      const n = slotsOf(cells[0]!).length
      expect(n).toBe(nExp)
      expect(cells[0]!.closed).toBe(nExp === 0)
      if (n >= 1) {
        // pitch 定理：pitch=L/(n+1)≥SLOT_MIN_PITCH（测试断言非运行时钳制）
        const pitch = (w - 8) / (n + 1)
        expect(pitch).toBeGreaterThanOrEqual(SLOT_MIN_PITCH)
      }
    }
  })
})

describe('F-ROUTE-02 U1 slots：⑧非卡障碍（月标注∪年份头）closed/静态预过滤', () => {
  // 基准：卡对 a(100,100,120,70)/b(100,200,120,70) → 单元 [100,220]×[170,200]
  // W=120、L=112、n=5、槽位 122.7/141.3/160/178.7/197.3（pos=104+k·112/6）
  const baseCards: Array<[string, Rect]> = [['a', rect(100, 100, 120, 70)], ['b', rect(100, 200, 120, 70)]]
  const baseSlots = [122.7, 141.3, 160, 178.7, 197.3]

  it('障碍横贯（x 投影覆盖槽轴全域+正面积相交）→ closed；closed 单元无消费（a3）', () => {
    const label = rect(80, 180, 160, 10) // x∈[80,240]⊇[100,220]，y∈[180,190]⊂(170,200)
    const cells = extractGapCells(snapOf(baseCards, [label]))
    expect(cells.length).toBe(1)
    expect(cells[0]!.closed).toBe(true)
    expect(slotsOf(cells[0]!)).toEqual([])
    expect(cells[0]!.blockedSlots.size).toBe(0)
    expect(slotFree(new SlotUse(), cells[0]!, 0)).toBe(false)
    // closed 单元不产生消费记录（a3）：穿越段也不消费
    expect(segConsumesCell(cells[0]!, pt(150, 160), pt(150, 190))).toBe(false)
  })

  it('障碍仅盖槽 idx1 走廊（x∈[137,146] 盖 [137.3,145.3]）→ 该槽 blocked、余槽 free', () => {
    const label = rect(137, 180, 9, 10)
    const cells = extractGapCells(snapOf(baseCards, [label]))
    expect(cells.length).toBe(1)
    const cell = cells[0]!
    expect(cell.closed).toBe(false) // 未覆盖 [100,220] 全域 → 不封闭
    expect(slotsOf(cell)).toEqual(baseSlots)
    expect(cell.blockedSlots.size).toBe(1)
    expect(cell.blockedSlots.has(1)).toBe(true)
    const use = new SlotUse()
    expect(slotFree(use, cell, 1)).toBe(false)
    for (const idx of [0, 2, 3, 4]) expect(slotFree(use, cell, idx)).toBe(true)
  })

  it('障碍在单元外（y 分离——年份头 y∈[280,290]）→ 无影响（不 closed/无 blocked）', () => {
    const yearHead = rect(140, 280, 40, 10)
    const cells = extractGapCells(snapOf(baseCards, [], [yearHead]))
    expect(cells.length).toBe(1)
    const cell = cells[0]!
    expect(cell.closed).toBe(false)
    expect(cell.blockedSlots.size).toBe(0)
    expect(slotsOf(cell)).toEqual(baseSlots)
  })
})

describe('F-ROUTE-02 U1 slots：N-2 半开消费语义（行进轴严格正测度+槽轴严格正宽度/退化严格内含）', () => {
  // 单元 [100,220]×[170,200]（axis='x'：槽轴=x、行进轴=y）
  const cells = extractGapCells(snapOf([['a', rect(100, 100, 120, 70)], ['b', rect(100, 200, 120, 70)]]))
  const cell: GapCell = cells[0]!

  it('端点恰落上边界（自上方触边）→ 零测度不消费；起点恰落上边界向下穿越 → 消费', () => {
    expect(segConsumesCell(cell, pt(150, 160), pt(150, 170))).toBe(false)
    expect(segConsumesCell(cell, pt(150, 170), pt(150, 190))).toBe(true)
  })

  it('槽轴零宽贴边（段 x=单元左界）→ 不消费；x 严格内含贯穿 → 消费', () => {
    expect(segConsumesCell(cell, pt(100, 180), pt(100, 195))).toBe(false)
    expect(segConsumesCell(cell, pt(150, 160), pt(150, 210))).toBe(true)
  })

  it('双轴正宽度（|dy|=0.03≤ε 轴对齐，行进 0.03>0）→ 消费；非轴对齐段 → false', () => {
    expect(segConsumesCell(cell, pt(110, 180), pt(190, 180.03))).toBe(true)
    expect(segConsumesCell(cell, pt(150, 180), pt(160, 190))).toBe(false)
  })
})

describe('F-ROUTE-02 U1 slots：提取面（相邻性/极大性/去重/gap 边界）', () => {
  it('第三卡入条带 → 大对弃（相邻性）：中卡 c 分割为两单元，无跨 [170,210] 大单元', () => {
    // a=[100,220]×[100,170]，c=[140,180]×[185,195]，b=[100,220]×[210,280]
    const cells = extractGapCells(
      snapOf([['a', rect(100, 100, 120, 70)], ['c', rect(140, 185, 40, 10)], ['b', rect(100, 210, 120, 70)]])
    )
    expect(cells.length).toBe(2)
    // 带 [170,185]=band0、[195,210]=band1；槽轴区间同 [140,180] → bandId 定序
    expect(cells[0]).toMatchObject({ id: 0, bandId: 0, axis: 'x', rect: rect(140, 170, 40, 15), closed: false })
    expect(cells[1]).toMatchObject({ id: 1, bandId: 1, axis: 'x', rect: rect(140, 195, 40, 15), closed: false })
  })

  it('去重+极大性：共享空白多对（a1,d)/(a2,d) 量化后同 rect → 一单元（代表对=字典序最小）', () => {
    // a1=[100,200]×[100,170]、a2=[90,210]×[100,170]（同行）、d=[100,200]×[200,270]
    // 两对 x 重叠均=[100,200]、第三卡条带检查互不侵入（同行卡底边同高 170 不入开条带）
    const cells = extractGapCells(
      snapOf([['a1', rect(100, 100, 100, 70)], ['a2', rect(90, 100, 120, 70)], ['d', rect(100, 200, 100, 70)]])
    )
    expect(cells.length).toBe(1)
    expect(cells[0]).toMatchObject({ id: 0, bandId: 0, axis: 'x', rect: rect(100, 170, 100, 30), closed: false })
    expect(slotsOf(cells[0]!).length).toBe(5)
  })

  it('gap 边界三态：gap=6<9→closed；gap=9→open（严格小于）；gap=0.03≤ε→不生成', () => {
    const narrow = extractGapCells(snapOf([['p', rect(100, 100, 100, 70)], ['q', rect(100, 176, 100, 70)]]))
    expect(narrow.length).toBe(1)
    expect(narrow[0]!.closed).toBe(true)
    expect(slotsOf(narrow[0]!)).toEqual([])
    expect(narrow[0]!.bandId).toBe(-1) // 带 [170,176] 高 6≤2·PAD=8 → bandsOf 跳过
    const edge = extractGapCells(snapOf([['p', rect(100, 100, 100, 70)], ['q', rect(100, 179, 100, 70)]]))
    expect(edge.length).toBe(1)
    expect(edge[0]!.closed).toBe(false) // 2·PAD+1=9：严格小于才封闭
    expect(slotsOf(edge[0]!).length).toBe(5)
    const touching = extractGapCells(snapOf([['p', rect(100, 100, 100, 70)], ['q', rect(100, 170.03, 100, 70)]]))
    expect(touching.length).toBe(0)
  })

  it('id 排序确定性：双窄带全=−1 同槽轴区间 → idA 字典序 tiebreak（r1,r2 对先于 r2,r3 对）', () => {
    // 三行卡同 x∈[100,220]，行距均 6：(r1,r2)/(r2,r3) 各生成 closed 单元；
    // (r1,r3) 被 r2 条带阻隔；两带高 6 均被跳过 → bandId 全=−1
    const cells = extractGapCells(
      snapOf([
        ['r1', rect(100, 100, 120, 70)],
        ['r2', rect(100, 176, 120, 70)],
        ['r3', rect(100, 252, 120, 70)]
      ])
    )
    expect(cells.length).toBe(2)
    expect(cells[0]!.bandId).toBe(-1)
    expect(cells[1]!.bandId).toBe(-1)
    expect(cells[0]!.rect).toEqual(rect(100, 170, 120, 6))
    expect(cells[1]!.rect).toEqual(rect(100, 246, 120, 6))
    expect(cells[0]!.closed).toBe(true)
    expect(cells[1]!.closed).toBe(true)
  })
})

describe('F-ROUTE-02 U1 slots：带归属（行隙/列缝正例+列带合并=−1）', () => {
  it('行隙 y 中点落带 → bandId=0（带 [170,200] 高 30 容 4 道）', () => {
    const cells = extractGapCells(snapOf([['p', rect(100, 100, 120, 72)], ['q', rect(100, 204, 120, 72)]]))
    expect(cells.length).toBe(1)
    expect(cells[0]!.bandId).toBe(0)
    expect(cells[0]!.rect).toEqual(rect(100, 172, 120, 32))
  })

  it('列缝正例：L/R 卡 x 缝 [160,300] → 列带 0 归属（x 中点 230 落带）；槽沿 y（W=200→n=5）', () => {
    const cells = extractGapCells(snapOf([['L', rect(100, 100, 60, 200)], ['R', rect(300, 100, 60, 200)]]))
    expect(cells.length).toBe(1)
    expect(cells[0]).toMatchObject({ id: 0, bandId: 0, axis: 'y', rect: rect(160, 100, 140, 200), closed: false })
    // pos=104+32k（L=192、n=5）→ 136/168/200/232/264
    expect(slotsOf(cells[0]!)).toEqual([136, 168, 200, 232, 264])
  })

  it('混合三单元：列缝并入合并列簇 → bandId=−1 排最前；同行隙双单元槽轴坐标定序', () => {
    // a1=[100,200]×[100,170]、b1=[210,310]×[100,170]（同行相邻）、d1=[80,330]×[200,270]
    // 列簇 x 全并 [80,330] → 无列带 → 列缝单元 bandId=−1；行带 [170,200]=band0
    const cells = extractGapCells(
      snapOf([
        ['a1', rect(100, 100, 100, 70)],
        ['b1', rect(210, 100, 100, 70)],
        ['d1', rect(80, 200, 250, 70)]
      ])
    )
    expect(cells.length).toBe(3)
    // 排序：(−1,100,170) 列缝 → (0,100,200) 行隙 → (0,210,310) 行隙
    expect(cells[0]).toMatchObject({ id: 0, bandId: -1, axis: 'y', rect: rect(200, 100, 10, 70), closed: false })
    expect(slotsOf(cells[0]!)).toEqual([114.3, 124.7, 135, 145.3, 155.7]) // pos=104+k·62/6
    expect(cells[1]).toMatchObject({ id: 1, bandId: 0, axis: 'x', rect: rect(100, 170, 100, 30) })
    expect(cells[2]).toMatchObject({ id: 2, bandId: 0, axis: 'x', rect: rect(210, 170, 100, 30) })
  })
})

describe('F-ROUTE-02 U1 slots：SlotUse/zChainClear/jogClearOfStub', () => {
  it('SlotUse 仅胜出态落记：commit 后 has=true；未 commit（他槽/他单元）has=false', () => {
    const use = new SlotUse()
    expect(use.has(0, 2)).toBe(false)
    use.commit(0, 2, 'e1')
    expect(use.has(0, 2)).toBe(true)
    expect(use.has(0, 3)).toBe(false)
    expect(use.has(1, 2)).toBe(false)
  })

  it('zChainClear：全子段避让——穿越障碍子段 false；净空 true；第二子段命中 false', () => {
    expect(zChainClear([pt(0, 0), pt(50, 0)], [rect(100, -10, 20, 20)])).toBe(true)
    expect(zChainClear([pt(0, 0), pt(50, 0)], [rect(20, -5, 10, 10)])).toBe(false)
    // 折线第二子段 (50,0)→(50,50) 过障碍膨胀带 [42,60]×[26,44]（rect(46,30,10,10) 经 PAD=4 四边膨胀）；第一子段净空
    const chain = [pt(0, 0), pt(50, 0), pt(50, 50)]
    expect(zChainClear(chain, [rect(46, 30, 10, 10)])).toBe(false)
    expect(zChainClear(chain, [rect(100, 30, 10, 10)])).toBe(true)
  })

  it('jogClearOfStub：拐点入桩 AABB 严格内部 false；边界/外部 true；stub 缺席 true', () => {
    const stub = { a: pt(100, 100), b: pt(140, 140) } // AABB [100,140]²
    expect(jogClearOfStub([pt(90, 90), pt(120, 120), pt(160, 160)], stub)).toBe(false)
    expect(jogClearOfStub([pt(120, 100), pt(160, 160)], stub)).toBe(true) // (120,100) 落边界
    expect(jogClearOfStub([pt(200, 200), pt(220, 220)], stub)).toBe(true)
    expect(jogClearOfStub([pt(120, 120), pt(160, 160)], undefined)).toBe(true)
  })
})

describe('F-ROUTE-02 U1 回炉轮1：列缝判定面+排序判别+侧挂第三卡+axis 防御（k1-W1/d1-W3/d1-W1/d1-N4）', () => {
  // 列缝基准夹具：L=[100,160]×[100,300]、R=[300,360]×[100,300] → 单元 [160,300]×[100,300]
  // axis='y'（槽沿 y：136/168/200/232/264），行带无（y 单区间合并）
  const lrCards: Array<[string, Rect]> = [
    ['L', rect(100, 100, 60, 200)],
    ['R', rect(300, 100, 60, 200)]
  ]

  it('[k1-W1a] 列缝消费（水平段）：起点在界外穿越左界/y 退化严格内含→true；端点恰落左边界/竖直段贴下界→false', () => {
    const cells = extractGapCells(snapOf(lrCards))
    expect(cells.length).toBe(1)
    const cell = cells[0]!
    expect(segConsumesCell(cell, pt(150, 200), pt(310, 200))).toBe(true) // 起点在左界外（x=150<160）向右穿越左界（y=200 内含）
    expect(segConsumesCell(cell, pt(150, 180), pt(310, 180.04))).toBe(true) // 双轴正宽（|dy|=0.04≤ε 轴对齐）
    expect(segConsumesCell(cell, pt(150, 180), pt(160, 180))).toBe(false) // 端点恰落左界（行进轴零测度）
    expect(segConsumesCell(cell, pt(200, 50), pt(200, 100))).toBe(false) // 竖直段 y 恰贴单元下界（行进轴退化零测度）
  })

  it('[k1-W1b] 列缝障碍横贯（y 投影覆盖单元 y 全域+正相交）→ closed', () => {
    const label = rect(200, 80, 40, 240) // y∈[80,320]⊇[100,300]，x∈[200,240] 与单元正相交
    const cells = extractGapCells(snapOf(lrCards, [label]))
    expect(cells.length).toBe(1)
    expect(cells[0]!.closed).toBe(true)
    expect(slotsOf(cells[0]!)).toEqual([])
  })

  it('[k1-W1c] 列缝走廊预过滤：障碍仅盖 y 槽 idx2 走廊（y∈[195,205] 盖 [196,204]）→ 该槽 blocked、余槽 free', () => {
    const label = rect(200, 195, 50, 10)
    const cells = extractGapCells(snapOf(lrCards, [label]))
    expect(cells.length).toBe(1)
    const cell = cells[0]!
    expect(cell.closed).toBe(false) // y 投影未覆盖 [100,300] 全域 → 不封闭
    expect(cell.blockedSlots.size).toBe(1)
    expect(cell.blockedSlots.has(2)).toBe(true)
    const use = new SlotUse()
    expect(slotFree(use, cell, 2)).toBe(false)
    for (const idx of [0, 1, 3, 4]) expect(slotFree(use, cell, idx)).toBe(true)
  })

  it('[k1-W1d] frames 横贯列带判别：列缝宽 15（w−2·PAD=7：⌊7/9⌋=0 跳 vs ⌊7/6⌋=1 留）→ bandId=−1 vs 0', () => {
    // L=[100,160]、R=[175,235] → 列缝 [160,175] 宽 15；槽沿 y（W=200→n=5）行进净距 15≥9 恒 open
    const cards: Array<[string, Rect]> = [
      ['L', rect(100, 100, 60, 200)],
      ['R', rect(175, 100, 60, 200)]
    ]
    const noFrame = extractGapCells(snapOf(cards))
    expect(noFrame.length).toBe(1)
    expect(noFrame[0]!.bandId).toBe(0) // s=6 → ⌊7/6⌋=1 道留带 → x 中点 167.5 落带
    expect(noFrame[0]!.closed).toBe(false)
    const framed = extractGapCells(snapOf(cards, [], [], [frame(165, 0, 10, 50)])) // 框竖边 x=165∈(160,175) 横贯（列带横贯判别=框 x 投影、y 无关——竖边整列语义）
    expect(framed.length).toBe(1)
    expect(framed[0]!.bandId).toBe(-1) // s=9 → ⌊7/9⌋=0 道跳带
    expect(framed[0]!.closed).toBe(false) // 带跳过仅失归属，单元不封闭
  })

  it('[d1-W3] bandId 排序判别：卡对枚举序 (a,b) 先于 (m,n)，canonical 序上带 (m,n) 单元居首', () => {
    // 四卡单列：m/n 上带对（y 缝 [170,200]）、a/b 下带对（y 缝 [370,400]）；中间 (n,a)
    // 缝 [270,300] 亦成单元（无第三卡阻隔）——三单元带序 band0/1/2
    const cells = extractGapCells(
      snapOf([
        ['m', rect(100, 100, 120, 70)],
        ['n', rect(100, 200, 120, 70)],
        ['a', rect(100, 300, 120, 70)],
        ['b', rect(100, 400, 120, 70)]
      ])
    )
    expect(cells.length).toBe(3)
    // 无 sort 时 byKey 插入序（枚举序 (a,b) 先入）＝y370/y170/y270 → cells[0]=y370 必红
    expect(cells[0]!.rect).toEqual(rect(100, 170, 120, 30))
    expect(cells[1]!.rect).toEqual(rect(100, 270, 120, 30))
    expect(cells[2]!.rect).toEqual(rect(100, 370, 120, 30))
    expect(cells.map((c) => c.bandId)).toEqual([0, 1, 2])
  })

  it('[d1-W1] 侧挂第三卡：仅右侧重叠窗两单元；左侧连通空白无单元=残余子 pass 域（§5 W-4）', () => {
    // A=[100,220]×[100,170]、c=[180,300]×[180,190]、B=[100,220]×[200,270]：
    // (A,B) 大对被 c 条带阻隔；(A,c)/(c,B) 各成 10px 净距单元（行进 10≥9 open，n=4）
    const cells = extractGapCells(
      snapOf([['A', rect(100, 100, 120, 70)], ['c', rect(180, 180, 120, 10)], ['B', rect(100, 200, 120, 70)]])
    )
    expect(cells.length).toBe(2)
    // 左侧连通空白 [100,180]×[170,200] 无单元——未被单元消费的 band 段归 U2 残余子
    // pass 域=旧机制分离零丢失（设计 §5 W-4）
    expect(cells.every((c) => c.rect.x >= 180)).toBe(true)
    expect(cells[0]).toMatchObject({ bandId: -1, axis: 'x', rect: rect(180, 170, 40, 10), closed: false })
    expect(cells[1]).toMatchObject({ bandId: -1, axis: 'x', rect: rect(180, 190, 40, 10), closed: false })
  })

  it('[d1-N4①] 四卡围空：行隙对与列缝对量化后同 rect 但 axis 不同 → 两单元并存（去重键含 axis）', () => {
    // N/S 上下卡+W/E 左右卡围出 [200,300]² 空白：(N,S) 行隙对与 (W,E) 列缝对
    // 同 rect 异 axis；同轴卡贴边不入开条带（W.r=200 不>200、E.x=300 不<300）
    const cells = extractGapCells(
      snapOf([
        ['N', rect(200, 100, 100, 100)],
        ['S', rect(200, 300, 100, 100)],
        ['W', rect(100, 200, 100, 100)],
        ['E', rect(300, 200, 100, 100)]
      ])
    )
    expect(cells.length).toBe(2)
    // 卡 y/x 区间链式合并（贴边 200≤200）→ 行带/列带均无 → bandId 全=−1；
    // tie (−1,200,300) 由 idA 破：'N'<'W' → axis='x' 单元先
    expect(cells[0]).toMatchObject({ axis: 'x', rect: rect(200, 200, 100, 100), closed: false })
    expect(cells[1]).toMatchObject({ axis: 'y', rect: rect(200, 200, 100, 100), closed: false })
    expect(slotsOf(cells[0]!)).toEqual([219.3, 234.7, 250, 265.3, 280.7]) // 槽沿 x：pos=204+k·92/6（W=100,L=92,n=5）
    expect(slotsOf(cells[1]!)).toEqual([219.3, 234.7, 250, 265.3, 280.7]) // 槽沿 y：同式（对称夹具 W=100）
  })

  it('[d1-N4②] slotFree 占用分支端到端：commit 后该槽 false、他槽仍 true', () => {
    const cells = extractGapCells(snapOf([['a', rect(100, 100, 120, 70)], ['b', rect(100, 200, 120, 70)]]))
    const cell = cells[0]!
    const use = new SlotUse()
    expect(slotFree(use, cell, 2)).toBe(true)
    use.commit(cell.id, 2, 'e1')
    expect(slotFree(use, cell, 2)).toBe(false)
    for (const idx of [0, 1, 3, 4]) expect(slotFree(use, cell, idx)).toBe(true)
  })

  it('[d1-W3 收尾] 同带反序夹具（2×2 卡阵全 bandId=0）：slotLo/slotHi 破平手，规范序 [C1,R1,C2,R2]≠插入序 [R2,C1,R1,C2]', () => {
    // b/a 上排 + y/z 下排（全 100×70）：恰四单元——列缝 (b,a)/(y,z) 与行隙 (b,y)/(a,z)；
    // 交叉对 (a,y)/(b,z) x 投影零重叠不生成。行带 [170,200]=rowBand0、列带 [200,300]=
    // colBand0 → 四单元 bandId 全 0；候选插入序（外层 idA 字典序 a 先）=[R2,C1,R1,C2]
    // ——comparator 劣化为仅 bandId（稳定排序保插入序）时本例必红（与三单元夹具互补）
    const cells = extractGapCells(
      snapOf([
        ['b', rect(100, 100, 100, 70)],
        ['a', rect(300, 100, 100, 70)],
        ['y', rect(100, 200, 100, 70)],
        ['z', rect(300, 200, 100, 70)]
      ])
    )
    expect(cells.length).toBe(4)
    expect(cells.map((c) => c.bandId)).toEqual([0, 0, 0, 0])
    // 规范序=(0,100,170)<(0,100,200)<(0,200,270)<(0,300,400)
    expect(cells[0]).toMatchObject({ id: 0, axis: 'y', rect: rect(200, 100, 100, 70) }) // C1=(b,a)
    expect(cells[1]).toMatchObject({ id: 1, axis: 'x', rect: rect(100, 170, 100, 30) }) // R1=(b,y)
    expect(cells[2]).toMatchObject({ id: 2, axis: 'y', rect: rect(200, 200, 100, 70) }) // C2=(y,z)
    expect(cells[3]).toMatchObject({ id: 3, axis: 'x', rect: rect(300, 170, 100, 30) }) // R2=(a,z)
  })
})
