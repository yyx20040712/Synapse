/**
 * [R2-C5] 压力走线平行间距族断言器（自 lineage-route-stress.spec 拆出——
 * spec 500 行上限第二职责拆件，先例=geo-probes/e2e-env 驻位）。承载：
 * ④b 残余 |off|≤maxOff（INV-115）；⑥ 残余互达对 ≥s（INV-115 同簇承诺；
 * cap 溢出边界对+INV-112 exempt 对豁免——豁免对显式列名不静默跳过）；
 * ⑥b 槽域内横段重合对须一方 data-overlap-exempt=1（INV-112 域=槽域内
 * ——band 中位横移/外圈车道/桩端线域外重合=INV-113/79 域外合法不入判）；
 * ⑥c 全域防贴合下限：任意两不同边横段投影重叠时 |Δ|≥GLUE_MIN（用户
 * 裁决 C——重叠/贴死必红；跨机制近距〔≥GLUE_MIN 且 <s〕=INV-115 登记
 * 域外合法形态）。常量单源：TOL/RUN_MIN_EXTENT 驻本件导出，spec 采集
 * cfg 与 ② 断言同源 import。
 */
import { expect } from '@playwright/test'
import type { Rect } from '../../src/renderer/features/lineage/routing/anchors'

export interface Run {
  level: number
  lo: number
  hi: number
}
export interface ObservedPath {
  edgeId: string
  route: string
  anchors: string
  slot: string
  exempt: boolean
  fallback: boolean
  d: string
  hRuns: Run[]
  vRuns: Run[]
}
export interface BandInfo {
  top: number
  bottom: number
  s: number
  center: number
  cap: number
  maxOff: number
}

/** 采样段坐标集成员判定容差（route-slots R5 同型 0.6px——亚像素+采样残差） */
export const TOL = 0.6
/** 采样 runs 的最小轴跨（弧平坦段上界≈2.6px——r=6 圆角排除，R5 同型判据） */
export const RUN_MIN_EXTENT = 4
/** ⑥c 全域防贴合下限（px）——用户裁决 C：重叠/贴死必红 */
export const GLUE_MIN = 1
/** ⑥c 同态共享电平豁免（现状设计形态、无防贴合承诺载体：band 跨单元同带
 *  共线重合=INV-112 域外备案不治理；outer-ring 车道单电平无槽分离。车道
 *  网格票〔用户裁决全局网格〕落地统一分配后删除本豁免升硬断言） */
const SHARED_LEVEL_ROUTES: ReadonlySet<string> = new Set(['band', 'outer-ring'])

/** 坐标集成员判定（±TOL） */
export const inSet = (v: number, set: Set<number>): boolean => {
  for (const u of set) if (Math.abs(u - v) <= TOL) return true
  return false
}

export interface ParallelUniverse {
  bands: BandInfo[]
  landedYs: Set<number>
  fixedYs: Set<number>
  seamRects: Rect[]
}

/** 平行间距族断言（④b/⑥/⑥b/⑥c——paths=非 blocked 采集，blocked 无 path 天然排除） */
export function assertParallelFamily(paths: readonly ObservedPath[], uni: ParallelUniverse): void {
  const bandOf = (y: number): BandInfo | undefined => uni.bands.find((b) => y > b.top + TOL && y < b.bottom - TOL)
  const resid = paths.flatMap((p) =>
    p.hRuns
      .filter((r) => bandOf(r.level) !== undefined && !inSet(r.level, uni.landedYs) && !inSet(r.level, uni.fixedYs))
      .map((r) => ({ edge: p, run: r, band: bandOf(r.level)! }))
  )
  for (const r of resid) {
    const off = Math.abs(r.run.level - r.band.center)
    expect(off, `④b 残余 |off|=${off.toFixed(2)} ≤maxOff=${r.band.maxOff}（边 ${r.edge.edgeId.slice(0, 8)} y=${r.run.level}——INV-115）`).toBeLessThanOrEqual(r.band.maxOff + TOL)
  }
  const violations: Array<string> = []
  const exemptPairs: Array<string> = []
  const atBoundary = (run: Run): boolean => {
    const b = bandOf(run.level)
    return b !== undefined && Math.abs(Math.abs(run.level - b.center) - b.maxOff) <= TOL
  }
  for (let i = 0; i < resid.length; i++) {
    for (let j = i + 1; j < resid.length; j++) {
      const a = resid[i]!
      const b = resid[j]!
      if (a.edge.edgeId === b.edge.edgeId || a.band.top !== b.band.top) continue
      if (Math.min(a.run.hi, b.run.hi) - Math.max(a.run.lo, b.run.lo) <= TOL) continue
      const d = Math.abs(a.run.level - b.run.level)
      if (d >= a.band.s - TOL) continue
      const cluster = resid.filter((r) => r.band.top === a.band.top && Math.min(r.run.hi, a.run.hi) - Math.max(r.run.lo, a.run.lo) > TOL)
      if (a.edge.exempt || b.edge.exempt) {
        exemptPairs.push(`INV-112 exempt：${a.edge.edgeId.slice(0, 8)}@${a.run.level}/${b.edge.edgeId.slice(0, 8)}@${b.run.level} Δ=${d.toFixed(2)}`)
      } else if (cluster.length > a.band.cap && atBoundary(a.run) && atBoundary(b.run)) {
        exemptPairs.push(`INV-115 cap 溢出边界：${a.edge.edgeId.slice(0, 8)}@${a.run.level}/${b.edge.edgeId.slice(0, 8)}@${b.run.level}（簇 ${cluster.length}>cap ${a.band.cap}）`)
      } else {
        violations.push(`${a.edge.edgeId.slice(0, 8)}@${a.run.level} × ${b.edge.edgeId.slice(0, 8)}@${b.run.level} Δ=${d.toFixed(2)}<s=${a.band.s}`)
      }
    }
  }
  expect(violations, `⑥ 残余互达对间距 ≥s（违例=${JSON.stringify(violations)}；豁免对=${JSON.stringify(exemptPairs)}）`).toEqual([])
  // ⑥b 重合对（|Δ|≤TOL——INV-112 共线面；域=槽域内：重合区落在列缝单元
  // rect 内才入判）。域内重合须一方 exempt。
  const coincide: Array<string> = []
  for (let i = 0; i < paths.length; i++) {
    for (let j = i + 1; j < paths.length; j++) {
      const a = paths[i]!
      const b = paths[j]!
      for (const ra of a.hRuns) {
        for (const rb of b.hRuns) {
          if (Math.abs(ra.level - rb.level) > TOL) continue
          const lo = Math.max(ra.lo, rb.lo)
          const hi = Math.min(ra.hi, rb.hi)
          if (hi - lo <= RUN_MIN_EXTENT) continue
          const inSlotDomain = uni.seamRects.some((s) => ra.level >= s.y - TOL && ra.level <= s.y + s.h + TOL && hi > s.x && lo < s.x + s.w)
          if (!inSlotDomain) continue
          if (a.exempt || b.exempt) {
            exemptPairs.push(`INV-112 exempt 重合：${a.edgeId.slice(0, 8)}/${b.edgeId.slice(0, 8)}@${ra.level}`)
          } else {
            coincide.push(`${a.edgeId.slice(0, 8)}(${a.route})/${b.edgeId.slice(0, 8)}(${b.route})@${ra.level.toFixed(1)} x[${lo.toFixed(0)},${hi.toFixed(0)}]`)
          }
        }
      }
    }
  }
  expect(coincide, `⑥b 槽域内横段重合对须一方 data-overlap-exempt=1（INV-112；违例=${JSON.stringify(coincide.slice(0, 10))}；豁免对=${JSON.stringify(exemptPairs)}）`).toEqual([])
  // ⑥c 全域防贴合下限：任意两不同边横段投影重叠时 |Δ|≥GLUE_MIN——合法
  // Δ<GLUE_MIN 仅 INV-112 exempt 对与 INV-115 cap 溢出同带双边界对，入豁免列名。
  const glue: Array<string> = []
  for (let i = 0; i < paths.length; i++) {
    for (let j = i + 1; j < paths.length; j++) {
      const a = paths[i]!
      const b = paths[j]!
      for (const ra of a.hRuns) {
        for (const rb of b.hRuns) {
          if (Math.min(ra.hi, rb.hi) - Math.max(ra.lo, rb.lo) <= RUN_MIN_EXTENT) continue
          const d = Math.abs(ra.level - rb.level)
          if (d >= GLUE_MIN) continue
          if (a.exempt || b.exempt) {
            exemptPairs.push(`INV-112 exempt 贴合：${a.edgeId.slice(0, 8)}/${b.edgeId.slice(0, 8)}@${ra.level}`)
          } else if (bandOf(ra.level) !== undefined && bandOf(ra.level) === bandOf(rb.level) && atBoundary(ra) && atBoundary(rb)) {
            exemptPairs.push(`INV-115 cap 溢出边界贴合：${a.edgeId.slice(0, 8)}@${ra.level}/${b.edgeId.slice(0, 8)}@${rb.level}`)
          } else if (a.route === b.route && SHARED_LEVEL_ROUTES.has(a.route)) {
            exemptPairs.push(`同态共享电平[${a.route}]：${a.edgeId.slice(0, 8)}/${b.edgeId.slice(0, 8)}@${ra.level}（车道网格票后升硬断言）`)
          } else {
            glue.push(`${a.edgeId.slice(0, 8)}(${a.route})/${b.edgeId.slice(0, 8)}(${b.route}) Δ=${d.toFixed(2)}@${ra.level}`)
          }
        }
      }
    }
  }
  expect(glue, `⑥c 全域防贴合 ≥${GLUE_MIN}px（违例=${JSON.stringify(glue.slice(0, 10))}；豁免对=${JSON.stringify(exemptPairs)}）`).toEqual([])
}
