/**
 * [F-LANEGRID-01 B1] occupancy —— 段级车道占用表（设计稿
 * docs/design/2026-11-19_f-lanegrid01-design.md §3.3 占用登记与间距规则；
 * 裁决④段级溢出的登记载体）。合约：register 登记已占段（同段幂等）；
 * conflicts 判候选段与已登记段冲突——跨距正重叠（开区间正长度相交，端点
 * 相触不算）∧ |Δcoord|<LANE_PITCH（同道 |Δ|≤CELL_EPS 为其真子集）；stub
 * =错峰桩区标记，本批只透传不参与判定（B2 错峰豁免消费）。AnchorUse 同型
 * 风格：仅胜出态落记。确定性红线：无随机/无 Date/无三角函数。纯函数零
 * DOM import。
 */
import { LANE_PITCH, type Interval } from './grid'

/** 占用段（axis 轴·coord 车道坐标·span 行进跨距·owner 边 id；stub=B2 错峰
 *  桩区标记；manual=[F-LANEGRID-01 B3b §11-1 甲] manual 边段标记——观测面
 *  （登记供后续自动边避让；manual 边自身永不被占用阻塞——manual-manual
 *  叠线放行=裁决甲承诺域） */
export interface OccupySeg {
  axis: 'v' | 'h'
  coord: number
  span: Interval
  owner: string
  stub?: boolean
  manual?: boolean
}

/** 段级占用注册表（B2 分配器按边序逐段登记/查询；B1 合约=register/conflicts/segments） */
export class LaneOccupancy {
  private readonly segs: OccupySeg[] = []
  private readonly keys = new Set<string>()
  /** [性能锚] 轴×坐标桶索引（桶宽=LANE_PITCH：|Δ|<LANE_PITCH 的冲突段恒在
   *  相邻 ±1 桶内——conflicts 谓词逐段不变，仅线性全表扫描改三桶扫描） */
  private readonly buckets = new Map<string, OccupySeg[]>()

  /** 段身份键（axis/coord/span/owner/stub 全等——同段重放幂等落记） */
  private keyOf(s: OccupySeg): string {
    return `${s.axis}|${s.coord}|${s.span.lo}|${s.span.hi}|${s.owner}|${s.stub === true}`
  }

  private bucketKey(axis: 'v' | 'h', coord: number): string {
    return `${axis}|${Math.floor(coord / LANE_PITCH)}`
  }

  /** 登记占用段（幂等：同段重复登记不增观测；深拷贝 span——调用方后续变异入参不污染内部态） */
  register(seg: OccupySeg): void {
    const key = this.keyOf(seg)
    if (this.keys.has(key)) return
    this.keys.add(key)
    const stored = { ...seg, span: { ...seg.span } }
    this.segs.push(stored)
    const bk = this.bucketKey(seg.axis, seg.coord)
    const arr = this.buckets.get(bk)
    if (arr === undefined) this.buckets.set(bk, [stored])
    else arr.push(stored)
  }

  /**
   * 冲突判定（§3.3 间距规则）：候选与已登记段同轴 ∧ 跨距正重叠（开区间正
   * 长度相交，端点相触不算）∧ |Δcoord|<LANE_PITCH → true。同道（|Δ|≤
   * CELL_EPS）为 <LANE_PITCH 真子集，同此分支（B2 错峰豁免另按 stub 标记
   * 区分）；|Δ|≥LANE_PITCH 或跨距不重叠 → false。
   */
  conflicts(axis: 'v' | 'h', coord: number, span: Interval): boolean {
    const bucket = Math.floor(coord / LANE_PITCH)
    for (let k = bucket - 1; k <= bucket + 1; k++) {
      for (const s of this.buckets.get(`${axis}|${k}`) ?? []) {
        if (Math.abs(s.coord - coord) >= LANE_PITCH) continue
        if (Math.max(s.span.lo, span.lo) < Math.min(s.span.hi, span.hi)) return true
      }
    }
    return false
  }

  /** 全部登记段观测（逐元素+span 深拷贝快照——断言/测试面；外部变异不回写内部态） */
  segments(): ReadonlyArray<OccupySeg> {
    return this.segs.map((s) => ({ ...s, span: { ...s.span } }))
  }
}
