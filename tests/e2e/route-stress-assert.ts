/**
 * [R2-C5→F-LANEGRID-01 B4] 压力走线平行间距断言器（自 lineage-route-stress.spec
 * 拆出——spec 500 行上限第二职责拆件，先例=geo-probes/e2e-env 驻位）。
 * B4 车道网格口径重写：
 * - ④b/⑥/⑥b（bandCap/maxOff 残余族+seamRects 槽域共线族）随残余/槽位
 *   机制退役**整体删除**（设计 §5/§9 关账——bandCap·maxOff 公式镜像两处
 *   随批核销；B2b 过渡期的空带/空槽域恒过代码不再保留）；
 * - ⑥c 全域平行间距**升硬**（设计 §8 定案）：任意两不同边横段投影重叠时
 *   |Δ| ≥ LANE_PITCH−TOL（8−0.6——非豁免对 Δ≥8，v2 误写 Δ≥1 的假绿面
 *   修正；采样容差 TOL 沿承）；豁免仅 overlapSpans 登记区间对——区间+
 *   标记双重校验（重叠段所在车道〔轴+坐标 ±TOL〕在任一边 data-overlap-spans
 *   登记串中有正长度相交区间）。错峰桩区对（同锚 i mod K 指派互异道）
 *   不重叠天然不入判；复用桩区对（第 K+1 条折回共线）按 §3.3 登记
 *   overlapSpans=豁免面覆盖。SHARED_LEVEL_ROUTES 豁免删除（六态值域随
 *   RouteTag 单态化恒不可达——v233 §5 F-LANEGRID-01 清偿面兑现）。
 * 常量单源：TOL/RUN_MIN_EXTENT 驻本件导出，spec 采集 cfg 与 ② 断言同源
 * import；LANE_PITCH=grid.ts 单源 import（间距承诺域=分配规则 §3.3）。
 */
import { expect } from '@playwright/test'
import { LANE_PITCH } from '../../src/renderer/features/lineage/routing/grid'

export interface Run {
  level: number
  lo: number
  hi: number
}
export interface ObservedPath {
  edgeId: string
  route: string
  anchors: string
  /** data-lane 占道段观测串（「轴+坐标:起-止」逗号连接；manual-override 缺省） */
  lane: string
  exempt: boolean
  /** data-overlap-spans 冲突登记串（逗号连接；缺省=无登记） */
  overlapSpans: string
  d: string
  hRuns: Run[]
  vRuns: Run[]
}

/** 采样段坐标集成员判定容差（route-slots R5 同型 0.6px——亚像素+采样残差） */
export const TOL = 0.6
/** 采样 runs 的最小轴跨（弧平坦段上界≈2.6px——r=6 圆角排除，R5 同型判据） */
export const RUN_MIN_EXTENT = 4

/** 坐标集成员判定（±TOL） */
export const inSet = (v: number, set: Set<number>): boolean => {
  for (const u of set) if (Math.abs(u - v) <= TOL) return true
  return false
}

/** 登记区间（overlapSpans 串解析：「轴+坐标:起-止」→轴别坐标+区间） */
interface Span {
  axis: 'v' | 'h'
  coord: number
  lo: number
  hi: number
}

/** overlapSpans/laneMarks 串解析（「v76:90-100,h63.5:69-265」逗号条目） */
export const parseLaneMarks = (s: string): Span[] => {
  const out: Span[] = []
  for (const tok of s.split(',')) {
    const m = /^([vh])([\d.]+):([\d.]+)-([\d.]+)$/.exec(tok.trim())
    if (m === null) continue
    out.push({ axis: m[1] as 'v' | 'h', coord: Number(m[2]), lo: Number(m[3]), hi: Number(m[4]) })
  }
  return out
}

/**
 * ⑥c 全域平行间距升硬断言（paths=非 blocked 采集，blocked 无 path 天然排除）：
 * 任意两不同边横段投影重叠（>RUN_MIN_EXTENT）时 |Δlevel| ≥ LANE_PITCH−TOL；
 * 豁免=重叠区间命中任一边 overlapSpans 登记（同轴同坐标 ±TOL 的登记区间与
 * 重叠段正长度相交——区间+标记双重校验），豁免对显式列名不静默跳过。
 */
export function assertParallelSpacing(paths: readonly ObservedPath[]): void {
  const glue: Array<string> = []
  const exemptPairs: Array<string> = []
  for (let i = 0; i < paths.length; i++) {
    for (let j = i + 1; j < paths.length; j++) {
      const a = paths[i]!
      const b = paths[j]!
      const spansA = parseLaneMarks(a.overlapSpans)
      const spansB = parseLaneMarks(b.overlapSpans)
      for (const ra of a.hRuns) {
        for (const rb of b.hRuns) {
          const lo = Math.max(ra.lo, rb.lo)
          const hi = Math.min(ra.hi, rb.hi)
          if (hi - lo <= RUN_MIN_EXTENT) continue
          const d = Math.abs(ra.level - rb.level)
          if (d >= LANE_PITCH - TOL) continue
          const hit = (spans: readonly Span[]): boolean =>
            spans.some(
              (s) => s.axis === 'h' && Math.abs(s.coord - ra.level) <= TOL && Math.min(s.hi, hi) - Math.max(s.lo, lo) > 0
            )
          if (hit(spansA) || hit(spansB)) {
            exemptPairs.push(
              `overlapSpans 登记：${a.edgeId.slice(0, 8)}@${ra.level.toFixed(1)}/${b.edgeId.slice(0, 8)}@${rb.level.toFixed(1)} x[${lo.toFixed(0)},${hi.toFixed(0)}] Δ=${d.toFixed(2)}`
            )
          } else {
            glue.push(`${a.edgeId.slice(0, 8)}(${a.route})/${b.edgeId.slice(0, 8)}(${b.route}) Δ=${d.toFixed(2)}@${ra.level.toFixed(1)} x[${lo.toFixed(0)},${hi.toFixed(0)}]`)
          }
        }
      }
    }
  }
  expect(
    glue,
    `⑥c 全域平行间距 ≥${LANE_PITCH}−TOL（违例=${JSON.stringify(glue.slice(0, 10))}；豁免对=${JSON.stringify(exemptPairs)}）`
  ).toEqual([])
}
