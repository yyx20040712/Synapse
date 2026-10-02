/**
 * [F-LINEAGE-02 ①a] avoid —— 甲链公共几何底座·避让件（options §1.4/§1.7；
 * design-final §1）。障碍=全部卡∪月标注（INV-79），PAD=4 膨胀，线段-矩形
 * Liang-Barsky（含边界 d≤PAD=命中——D-6 沿承）。短桩/中段分治（D-L2-4）：
 * 首末短桩（沿路径 s0）校验排除源/目标卡（桩区段仅查第三方障碍），中段
 * 复检含全卡∪标注。曲化后采样复检由 chain 编排（半径收缩链 r<2→0 尖角
 * ——D-L2-6），本件供采样链命中原语。
 * 确定性红线：无随机/无 Date/无三角函数。纯函数零 DOM import。
 */
import type { Pt, Rect } from './anchors'

/** 障碍膨胀：命中 d≤PAD 含边界（D-6） */
export const PAD = 4

/** 桩区路径长（沿折线自两端各此长度的区段=短桩免检源/目标卡区） */
export const STUB_PATH = 10

/** Liang-Barsky：线段 p1→p2 vs rect（已按 PAD 膨胀传入——含边界相触=命中）。
 *  [②U5] 导出=edge-edit 穿卡警示消费（同口径 PAD 单源） */
export function segHitsRect(p1: Pt, p2: Pt, r: Rect): boolean {
  let t0 = 0
  let t1 = 1
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  const edges: Array<[number, number]> = [
    [-dx, p1.x - r.x],
    [dx, r.x + r.w - p1.x],
    [-dy, p1.y - r.y],
    [dy, r.y + r.h - p1.y]
  ]
  for (const [den, num] of edges) {
    if (den === 0) {
      if (num < 0) return false
      continue
    }
    const q = num / den
    if (den < 0) {
      if (q > t1) return false
      if (q > t0) t0 = q
    } else {
      if (q < t0) return false
      if (q < t1) t1 = q
    }
  }
  return true
}

/** 线段 vs 障碍集（膨胀 PAD）：任一命中即 true */
export function segHitsAny(p1: Pt, p2: Pt, obstacles: readonly Rect[]): boolean {
  return obstacles.some((o) =>
    segHitsRect(p1, p2, { x: o.x - PAD, y: o.y - PAD, w: o.w + 2 * PAD, h: o.h + 2 * PAD })
  )
}

/** 沿路径取距起点 d 的点（d 钳制在 [0,total]——切割点插值） */
function pointAtDist(pts: readonly Pt[], cum: readonly number[], d: number): Pt {
  if (d <= 0) return pts[0]!
  for (let i = 1; i < pts.length; i++) {
    if (d <= cum[i]!) {
      const a = pts[i - 1]!
      const b = pts[i]!
      const segLen = cum[i]! - cum[i - 1]!
      const t = segLen === 0 ? 0 : (d - cum[i - 1]!) / segLen
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
    }
  }
  return pts[pts.length - 1]!
}

/**
 * 折线避让检（骨架/采样链通用——D-L2-4 分治）：
 * - 沿路径自两端各 STUB_PATH 长度的桩区子段：仅查第三方障碍
 *   （all 中不在 stubExcluded 内者——源/目标卡贴桩命中=设计内放行）；
 * - 中段子段：查 all 全集（含全卡∪月标注——中段复检含全卡）。
 * 桩/中段边界处插值切割（整段旗标会把源卡命中误报进中段——按位置切子段）。
 */
export function polylineClearStubs(
  pts: readonly Pt[],
  stubExcluded: readonly Rect[],
  all: readonly Rect[]
): boolean {
  if (pts.length < 2) return true
  const cum: number[] = [0]
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!
    const b = pts[i]!
    cum.push(cum[i - 1]! + Math.abs(b.x - a.x) + Math.abs(b.y - a.y))
  }
  const total = cum[cum.length - 1]!
  if (total <= 2 * STUB_PATH) {
    // 全程皆桩区（短边）：仅查第三方
    const thirdParty = all.filter((o) => !stubExcluded.includes(o))
    return !pts.some((_, i) => i > 0 && segHitsAny(pts[i - 1]!, pts[i]!, thirdParty))
  }
  const cutA = pointAtDist(pts, cum, STUB_PATH)
  const cutB = pointAtDist(pts, cum, total - STUB_PATH)
  const thirdParty = all.filter((o) => !stubExcluded.includes(o))
  // 桩区（首）：pts[0]→cutA
  for (let i = 1; i < pts.length && cum[i]! <= STUB_PATH; i++) {
    if (segHitsAny(pts[i - 1]!, pts[i]!, thirdParty)) return false
  }
  if (segHitsAny(pts[0]!, cutA, thirdParty)) return false
  // 桩区（末）：cutB→末点
  for (let i = 1; i < pts.length && cum[i - 1]! >= total - STUB_PATH; i++) {
    if (segHitsAny(pts[i - 1]!, pts[i]!, thirdParty)) return false
  }
  if (segHitsAny(cutB, pts[pts.length - 1]!, thirdParty)) return false
  // 中段：cutA→cutB（跨过的原始顶点保留——逐段插值切界）
  const middle: Pt[] = [cutA]
  for (let i = 1; i < pts.length - 1; i++) {
    if (cum[i]! > STUB_PATH && cum[i]! < total - STUB_PATH) middle.push(pts[i]!)
  }
  middle.push(cutB)
  for (let i = 1; i < middle.length; i++) {
    if (segHitsAny(middle[i - 1]!, middle[i]!, all)) return false
  }
  return true
}
