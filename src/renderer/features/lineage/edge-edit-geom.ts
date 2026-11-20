/**
 * [F-LGRAPH-01②U5] edge-edit-geom —— 调线几何辅助件（use-edge-edit 拆件——
 * 文件 ≤500 行红线）：全图 12 锚命中（带 side——reconnect 消费）+车道格线
 * 集派生（[F-LANEGRID-01 B3b] buildLaneTable 同源直算——磁吸/提交门共用；
 * 旧通道集 channelsFrom 随通道磁吸 ±6 退役删除）。纯函数（快照入参——DOM
 * 采集驻 use-edge-edit/buildSnapshot）。
 */
import type { Pt, Rect, Side } from './routing/anchors'
import { anchorPoint } from './routing/anchors'
import { buildLaneTable } from './routing/grid'
import { SNAP_R, type LaneLines } from './edge-edit'
import type { LayoutSnapshot } from './lineage-routing'

export function nearestAnchorCard(
  cards: ReadonlyArray<{ nodeId: string; rect: Rect }>,
  p: Pt,
  /** [F-VISFB-66] 解锚半径（缺省=调线磁吸 6；换端解锚传 DRAW_SNAP_R=12 own 域） */
  r: number = SNAP_R
): { nodeId: string; pt: Pt; side: Side; slot: number } | null {
  let best: { nodeId: string; pt: Pt; side: Side; slot: number } | null = null
  let bestD = r
  const sides: Side[] = ['top', 'bottom', 'left', 'right']
  for (const { nodeId, rect } of cards) {
    for (const side of sides) {
      for (let slot = 0; slot <= 2; slot++) {
        const a = anchorPoint(rect, side, slot)
        const d = Math.hypot(a.x - p.x, a.y - p.y)
        if (d < bestD) {
          bestD = d
          best = { nodeId, pt: a, side, slot }
        }
      }
    }
  }
  return best
}

/** [F-LANEGRID-01 B3b] 车道格线集（buildLaneTable 布局直算——与路由同源
 *  同参；id 序=坐标升序投影。编辑磁吸与提交门共用单源） */
export function laneLinesOf(snap: LayoutSnapshot): LaneLines {
  const t = buildLaneTable({
    cards: [...snap.cards.values()],
    labels: snap.labels,
    yearHeads: snap.yearHeads,
    frames: snap.frames,
    contentH: snap.contentH
  })
  return { v: t.v.map((l) => l.coord), h: t.h.map((l) => l.coord) }
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
