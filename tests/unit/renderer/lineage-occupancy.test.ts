/**
 * [F-LANEGRID-01 B1] 段级占用表直测（票号 F-LANEGRID-01 B1；设计稿
 * docs/design/2026-11-19_f-lanegrid01-design.md §3.3 占用登记与间距规则；
 * 裁决④段级溢出的登记载体）。冲突合约：候选与已登记段跨距正重叠（开区间
 * 正长度相交，端点相触不算）∧ |Δcoord|<LANE_PITCH=8 → 冲突；|Δ|≥8 或
 * 跨距不重叠 → 不冲突；同道（|Δ|≤CELL_EPS）为 <|8 真子集。stub 标记本批
 * 只透传不参与判定。期望全部按规则手推，禁抄实现输出。always-active 裸
 * describe。
 */
import { describe, expect, it } from 'vitest'
import { CELL_EPS } from '../../../src/renderer/features/lineage/routing/grid'
import {
  LANE_PITCH,
  type Interval
} from '../../../src/renderer/features/lineage/routing/grid'
import { LaneOccupancy, type OccupySeg } from '../../../src/renderer/features/lineage/routing/occupancy'

const iv = (lo: number, hi: number): Interval => ({ lo, hi })
const seg = (coord: number, lo: number, hi: number, owner = 'e1', stub?: boolean): OccupySeg => ({
  axis: 'v',
  coord,
  span: iv(lo, hi),
  owner,
  stub
})

describe('F-LANEGRID-01 B1 occupancy：段级占用与冲突判定（§3.3）', () => {
  it('空表恒不冲突；LANE_PITCH=8 冻结', () => {
    expect(new LaneOccupancy().conflicts('v', 100, iv(0, 50))).toBe(false)
    expect(LANE_PITCH).toBe(8)
  })

  it('同道（|Δ|=0）跨距正重叠=冲突：登记 v·100 [0,50]，查 v·100 [20,80] → true', () => {
    const occ = new LaneOccupancy()
    occ.register(seg(100, 0, 50))
    expect(occ.conflicts('v', 100, iv(20, 80))).toBe(true)
  })

  it('同道端点相触不冲突：[0,50] vs [50,120]/[−10,0] 开区间零测度（对照：[20,80] 正重叠为 true）', () => {
    const occ = new LaneOccupancy()
    occ.register(seg(100, 0, 50))
    expect(occ.conflicts('v', 100, iv(20, 80))).toBe(true)
    expect(occ.conflicts('v', 100, iv(50, 120))).toBe(false)
    expect(occ.conflicts('v', 100, iv(-10, 0))).toBe(false)
  })

  it('同道跨距分离不冲突：[0,50] vs [60,80]（对照：同查 [40,60] 正重叠 true）', () => {
    const occ = new LaneOccupancy()
    occ.register(seg(100, 0, 50))
    expect(occ.conflicts('v', 100, iv(40, 60))).toBe(true)
    expect(occ.conflicts('v', 100, iv(60, 80))).toBe(false)
  })

  it('异道 |Δ|=4 且跨距重叠=冲突：登记 v·100 [0,50]，查 v·104 [20,30] → true', () => {
    const occ = new LaneOccupancy()
    occ.register(seg(100, 0, 50))
    expect(occ.conflicts('v', 104, iv(20, 30))).toBe(true)
  })

  it('异道 |Δ|=8（=LANE_PITCH，双侧 108/92）跨距重叠不冲突（|Δ|<8 才阻塞；对照 |Δ|=7.9 冲突）', () => {
    const occ = new LaneOccupancy()
    occ.register(seg(100, 0, 50))
    expect(occ.conflicts('v', 108, iv(20, 30))).toBe(false)
    expect(occ.conflicts('v', 92, iv(20, 30))).toBe(false)
    expect(occ.conflicts('v', 107.9, iv(20, 30))).toBe(true)
  })

  it('同道容差口径：|Δ|=0.02≤CELL_EPS=0.05 同道冲突；|Δ|=0.5（异格但 <8）冲突——同道为 <8 真子集', () => {
    const occ = new LaneOccupancy()
    occ.register(seg(100, 0, 50))
    expect(CELL_EPS).toBe(0.05)
    expect(occ.conflicts('v', 100.02, iv(20, 80))).toBe(true)
    expect(occ.conflicts('v', 99.5, iv(20, 80))).toBe(true)
  })

  it('异轴正交不冲突：登记 v·100 [0,50]，查 h·100 [0,50] → false（对照同轴 true）', () => {
    const occ = new LaneOccupancy()
    occ.register(seg(100, 0, 50))
    expect(occ.conflicts('v', 100, iv(20, 80))).toBe(true)
    expect(occ.conflicts('h', 100, iv(20, 80))).toBe(false)
  })

  it('零长跨距恒不冲突：[50,50] 与 [0,50] 相交零测度（对照：正长 [49,51] 冲突）', () => {
    const occ = new LaneOccupancy()
    occ.register(seg(100, 0, 50))
    expect(occ.conflicts('v', 100, iv(49, 51))).toBe(true)
    expect(occ.conflicts('v', 100, iv(50, 50))).toBe(false)
  })

  it('register 幂等：同段两次登记=1 条；不同 owner 同几何=2 条（owner 是占用身份成分）', () => {
    const occ = new LaneOccupancy()
    occ.register(seg(100, 0, 50))
    occ.register(seg(100, 0, 50))
    expect(occ.segments()).toEqual([{ axis: 'v', coord: 100, span: iv(0, 50), owner: 'e1' }])
    occ.register(seg(100, 0, 50, 'e2'))
    expect(occ.segments().length).toBe(2)
  })

  it('segments()=只读快照：外部 push 变异不改内部观测', () => {
    const occ = new LaneOccupancy()
    occ.register(seg(100, 0, 50))
    const snap = occ.segments() as OccupySeg[]
    snap.push(seg(200, 0, 10))
    expect(occ.segments().length).toBe(1)
  })

  it('stub 透传不参与判定：stub 段照常登记（segments()[0].stub===true）且照常冲突（重叠 true）', () => {
    const occ = new LaneOccupancy()
    occ.register(seg(100, 0, 50, 'e1', true))
    expect(occ.segments()[0]!.stub).toBe(true)
    expect(occ.conflicts('v', 100, iv(20, 80))).toBe(true)
    expect(occ.conflicts('v', 108, iv(20, 80))).toBe(false)
  })

  it('register 深拷贝 span：登记后变异入参（coord/span）不污染内部——观测与冲突仍按原值', () => {
    const occ = new LaneOccupancy()
    const s = seg(100, 0, 50)
    occ.register(s)
    s.coord = 200
    s.span.lo = -1000
    s.span.hi = -999
    expect(occ.segments()).toEqual([{ axis: 'v', coord: 100, span: iv(0, 50), owner: 'e1' }])
    expect(occ.conflicts('v', 100, iv(20, 80))).toBe(true)
    expect(occ.conflicts('v', 200, iv(-1000, -999))).toBe(false)
  })

  it('segments 元素拷贝：返回元素 coord 变异不回写内部', () => {
    const occ = new LaneOccupancy()
    occ.register(seg(100, 0, 50))
    const snap = occ.segments() as OccupySeg[]
    snap[0]!.coord = 999
    expect(occ.segments()[0]!.coord).toBe(100)
  })

  it('segments span 嵌套拷贝：返回 span 变异不回写（conflicts 判定仍按原跨距）', () => {
    const occ = new LaneOccupancy()
    occ.register(seg(100, 0, 50))
    const snap = occ.segments() as OccupySeg[]
    snap[0]!.span.lo = -1
    snap[0]!.span.hi = 1000
    expect(occ.segments()[0]!.span).toEqual(iv(0, 50))
    expect(occ.conflicts('v', 100, iv(60, 80))).toBe(false)
  })
})
