/**
 * [F-LANEGRID-01 B2 回炉] clearance —— 段净空谓词族单源（自 allocate 拆件：
 * 行数红线 +区间工具与 grid 死区口径的互指单源化）。承载：区间合并/二分
 * 覆盖（性能锚热点）、端点豁免死区（ownDeadOf——与 grid.deadOf 同口径）、
 * 桩段净空（§2.2 端点豁免）、直连段净空（B2b 双向口径+B2 回炉 M-1 短直连
 * 全程皆桩）、交点可用性。结构化最小类型（lo/hi、coord/alive）——零类型
 * 循环（值依赖单向：grid 常量+avoid.PAD）。确定性红线：无随机/无 Date/无
 * 三角函数。纯函数零 DOM import。
 */
import { PAD } from './avoid'
import { CELL_EPS, LANE_INSET, type Interval } from './grid'
import type { Rect } from './anchors'

type Axis = 'v' | 'h'

/** 道最小面（coord=坐标常量；alive=合并排序存活区间）——Lane 的结构子集 */
export interface ClearLane {
  coord: number
  alive: Interval[]
}

/** 区间合并（升序；相触/重叠合一） */
export function mergeIntervals(ivs: readonly Interval[]): Interval[] {
  const sorted = [...ivs].sort((a, b) => a.lo - b.lo || a.hi - b.hi)
  const out: Interval[] = []
  for (const iv of sorted) {
    const last = out[out.length - 1]
    if (last !== undefined && iv.lo <= last.hi) last.hi = Math.max(last.hi, iv.hi)
    else out.push({ ...iv })
  }
  return out
}

/** 升序不相交区间列中首个 hi ≥ x 的下标（二分——区间列按 lo 排序且不相交
 *  ⟹ hi 亦升序；[性能锚] 线性扫描在大夹具 ~10⁵ 段判定量级是热点） */
function firstEndingAtOrAfter(ivs: readonly Interval[], x: number): number {
  let lo = 0
  let hi = ivs.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (ivs[mid]!.hi + CELL_EPS < x) lo = mid + 1
    else hi = mid
  }
  return lo
}

/** [lo,hi] 被区间列覆盖（区间列升序不相交前提；CELL_EPS 容差〔grid 单源〕
 *  吸收 0.1 格浮点残差） */
export function covered(lo: number, hi: number, ivs: readonly Interval[]): boolean {
  let cur = lo
  for (let i = firstEndingAtOrAfter(ivs, cur); i < ivs.length; i++) {
    const iv = ivs[i]!
    if (iv.lo - CELL_EPS > cur) return false
    cur = Math.max(cur, iv.hi)
    if (cur >= hi - CELL_EPS) return true
  }
  return false
}

/** 本边源/目标卡在道上的死区间（桩段豁免集——与 grid.deadOf 同口径：坐标轴
 *  膨胀窗判定+行进轴膨胀区间） */
export function ownDeadOf(own: readonly Rect[], axis: Axis, coord: number): Interval[] {
  const out: Interval[] = []
  for (const r of own) {
    const c0 = axis === 'v' ? r.x - PAD : r.y - PAD
    const c1 = axis === 'v' ? r.x + r.w + PAD : r.y + r.h + PAD
    if (coord >= c0 - CELL_EPS && coord <= c1 + CELL_EPS) {
      const s0 = axis === 'v' ? r.y - PAD : r.x - PAD
      out.push({ lo: s0, hi: s0 + (axis === 'v' ? r.h : r.w) + 2 * PAD })
    }
  }
  return out
}

/** 桩段净空（§2.2 端点豁免）：锚端（from）LANE_INSET 内豁免本边两卡死区、
 *  余段（向 to 侧）对全障碍 alive——豁免段恒含 from 端，余段在对侧 */
export function stubClear(lane: ClearLane, axis: Axis, from: number, to: number, own: readonly Rect[]): boolean {
  const lo = Math.min(from, to)
  const hi = Math.max(from, to)
  const eEnd = from < to ? Math.min(from + LANE_INSET, hi) : Math.max(from - LANE_INSET, lo)
  const eLo = Math.min(from, eEnd)
  const eHi = Math.max(from, eEnd)
  const merged = mergeIntervals([...lane.alive, ...ownDeadOf(own, axis, lane.coord)])
  if (!covered(eLo, eHi, merged)) return false
  if (from < to) {
    if (hi - eHi > CELL_EPS && !covered(eHi, hi, lane.alive)) return false
  } else if (eLo - lo > CELL_EPS && !covered(lo, eLo, lane.alive)) return false
  return true
}

/** 直连段净空：两端各 LANE_INSET 豁免本边两卡（各向对端伸展）、中段（若正
 *  长）对全障碍 alive。[B2b 缺陷修复] 双向口径：降向直连（源端坐标大于目标
 *  端——上行/左行直连）端窗随行进向取位，中段=两端窗内侧界之间——旧升向
 *  单口径下降向端窗坍缩为单点且中段窗口倒置被跳过，中障直连假阳性产出
 *  （终门兜底 blocked——s3 同列上行边实测立案）。[B2 回炉 M-1] 短直连
 *  （总长 ≤2×LANE_INSET）两端豁免窗交叉=全程皆桩（avoid.polylineClearStubs
 *  同口径：仅第三方障碍致死，本边两卡恒豁免）——按 merged 整段判净空，
 *  不构造中段 */
export function directClear(lane: ClearLane, axis: Axis, aEnd: number, bEnd: number, own: readonly Rect[]): boolean {
  const lo = Math.min(aEnd, bEnd)
  const hi = Math.max(aEnd, bEnd)
  const merged = mergeIntervals([...lane.alive, ...ownDeadOf(own, axis, lane.coord)])
  if (hi - lo <= 2 * LANE_INSET + CELL_EPS) {
    return covered(lo, hi, merged)
  }
  const dir = bEnd >= aEnd ? 1 : -1
  const eaFar = Math.min(hi, Math.max(lo, aEnd + dir * LANE_INSET))
  const ebFar = Math.min(hi, Math.max(lo, bEnd - dir * LANE_INSET))
  const eaLo = Math.min(aEnd, eaFar)
  const eaHi = Math.max(aEnd, eaFar)
  const ebLo = Math.min(bEnd, ebFar)
  const ebHi = Math.max(bEnd, ebFar)
  if (!covered(eaLo, eaHi, merged) || !covered(ebLo, ebHi, merged)) return false
  const aInner = dir === 1 ? eaHi : eaLo
  const bInner = dir === 1 ? ebLo : ebHi
  const mLo = Math.min(aInner, bInner)
  const mHi = Math.max(aInner, bInner)
  if (mHi - mLo > CELL_EPS && !covered(mLo, mHi, lane.alive)) return false
  return true
}

/** 交点可用性（桩端=转弯点）：点落在转向道 alive 内（桩道侧由 stubClear 承担） */
export function crossAlive(perpLane: ClearLane, at: number): boolean {
  return covered(at, at, perpLane.alive)
}
