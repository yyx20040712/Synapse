/**
 * 路径最终净空门。输入必须是槽位分配、Z 形 jog 与残余偏移施加后的骨架；
 * 每个半径都检查 buildRoundedPath 的最终采样链，r=0 也不例外。
 * [R2-C3] 终门对所有 route 态统一（含 manual-override，免检分支已退役）：
 * 三档均碰障=blocked 空 d。新 via 的写入由提交门（edge-via-commit.ts）
 * 先行拦截，本门承接旧 via 与重排后非法 via 的兜底。
 */
import type { Pt, Rect } from './anchors'
import { polylineClearStubs } from './avoid'
import { buildRoundedPath, stripCollinear } from './rounding'

export type RouteClearance = 'blocked'

export interface FinalizedPath {
  d: string
  clearance?: RouteClearance
}

const RADII = [6, 3, 0] as const

/** 共线剔除、圆角化与最终采样复检；不可布通时显式返回空 d。 */
export function finalizePath(
  skel: readonly Pt[],
  stubExcluded: readonly Rect[],
  obstacles: readonly Rect[]
): FinalizedPath {
  const stripped = stripCollinear(skel)
  if (stripped.length < 2) return { d: '', clearance: 'blocked' }
  for (const radius of RADII) {
    const built = buildRoundedPath(stripped, radius)
    if (polylineClearStubs(built.samples, stubExcluded, obstacles)) return { d: built.d }
  }
  return { d: '', clearance: 'blocked' }
}
