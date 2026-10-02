/**
 * [F-LGRAPH-01②U5] edge-edit-geom —— 调线几何辅助件（use-edge-edit 拆件——
 * 文件 ≤500 行红线）：全图 12 锚命中（带 side——reconnect 消费）+通道集派生
 * （磁吸候选：行隙/框间带横道+行内列缝竖道）。纯函数。
 */
import type { Pt, Rect, Side } from './routing/anchors'
import { anchorPoint } from './routing/anchors'
import { SNAP_R, type Channels } from './edge-edit'

export function nearestAnchorCard(
  cards: ReadonlyArray<{ nodeId: string; rect: Rect }>,
  p: Pt
): { nodeId: string; pt: Pt; side: Side } | null {
  let best: { nodeId: string; pt: Pt; side: Side } | null = null
  let bestD = SNAP_R
  const sides: Side[] = ['top', 'bottom', 'left', 'right']
  for (const { nodeId, rect } of cards) {
    for (const side of sides) {
      for (let slot = 0; slot <= 2; slot++) {
        const a = anchorPoint(rect, side, slot)
        const d = Math.hypot(a.x - p.x, a.y - p.y)
        if (d < bestD) {
          bestD = d
          best = { nodeId, pt: a, side }
        }
      }
    }
  }
  return best
}

/** 通道集（磁吸候选——行隙/框间带横道+行内列缝竖道；内容坐标派生） */
export function channelsFrom(cards: ReadonlyArray<{ rect: Rect }>): Channels {
  const horizontal: number[] = []
  const vertical: number[] = []
  const rows = new Map<number, Rect[]>() // y 键（容差 4 归行）
  for (const { rect } of cards) {
    const key = Math.round(rect.y / 4)
    const list = rows.get(key) ?? []
    list.push(rect)
    rows.set(key, list)
  }
  const rowArr = [...rows.entries()].sort((a, b) => a[0] - b[0])
  for (let i = 1; i < rowArr.length; i++) {
    const prevRow = rowArr[i - 1]!
    const curRow = rowArr[i]!
    const prevBottom = Math.max(...prevRow[1].map((r) => r.y + r.h))
    const curTop = Math.min(...curRow[1].map((r) => r.y))
    if (curTop - prevBottom > 0) horizontal.push((prevBottom + curTop) / 2)
  }
  for (const [, list] of rows) {
    const sorted = [...list].sort((a, b) => a.x - b.x)
    for (let i = 1; i < sorted.length; i++) {
      const gap = sorted[i]!.x - (sorted[i - 1]!.x + sorted[i - 1]!.w)
      if (gap > 0) vertical.push(sorted[i - 1]!.x + sorted[i - 1]!.w + gap / 2)
    }
  }
  return { horizontal, vertical }
}

/** 全点链最近段序（加点/段拖拽命中——点到线段投影距离） */
export function nearestSegmentIdx(pl: { anchorA: Pt; anchorB: Pt; via: Array<{ x: number; y: number }> }, p: Pt): number {
  const pts = [pl.anchorA, ...pl.via, pl.anchorB]
  let best = 0
  let bestD = Infinity
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]!
    const b = pts[i + 1]!
    const qx = Math.max(Math.min(a.x, b.x), Math.min(p.x, Math.max(a.x, b.x)))
    const qy = Math.max(Math.min(a.y, b.y), Math.min(p.y, Math.max(a.y, b.y)))
    const d = Math.hypot(p.x - qx, p.y - qy)
    if (d < bestD) {
      bestD = d
      best = i
    }
  }
  return best
}
