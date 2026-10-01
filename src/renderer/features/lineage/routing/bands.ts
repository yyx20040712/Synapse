/**
 * [F-LINEAGE-02 ①a] bands —— 甲链带路由机件（行隙带/框间带——options §2-A；
 * design-final §1）。带=卡 y 区间夹缝（框边界在缝内→框间带 s=9，否则行隙
 * s=6；车道数=⌊(带宽−2·PAD)/s⌋，0 道=封闭 D-L2-7）；zigzag 骨架：每带先试
 * 目标 x 终落（末 10px 桩区排除源/目标卡——D-L2-4），阻塞经下降 x 候选
 * （目标 x→所跨列缝中线[距目标 x 序]→框外空白）降下一带。确定性红线：
 * 无随机/无 Date/无三角函数。纯函数零 DOM import。
 */
import { anchorPick, sideAnchor, stubEnd, type AnchorUse, type Pt, type Rect, type Side } from './anchors'
import { PAD, polylineClearStubs, segHitsAny } from './avoid'
import type { LayoutSnapshot } from './chain'

const center = (r: Rect): Pt => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 })

/** 带路由结果（laneY/s/cap=车道 pass 输入；picks=胜出锚注册） */
export interface BandRoute {
  skel: Pt[]
  laneY: number
  s: number
  cap: number
  picks: Array<[string, Side, number]>
}

/** 带模型（卡 y 区间夹缝；框边界在缝内→框间带 s=9，否则行隙 s=6） */
interface Band {
  top: number
  bottom: number
  s: number
  center: number
}

function bandsOf(snap: LayoutSnapshot, cards: readonly Rect[]): Band[] {
  const ivs = cards.map((c) => [c.y, c.y + c.h] as const).sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const merged: Array<[number, number]> = []
  for (const [lo, hi] of ivs) {
    const last = merged[merged.length - 1]
    if (last !== undefined && lo <= last[1]) last[1] = Math.max(last[1], hi)
    else merged.push([lo, hi])
  }
  const out: Band[] = []
  for (let i = 1; i < merged.length; i++) {
    const top = merged[i - 1]![1]
    const bottom = merged[i]![0]
    const h = bottom - top
    if (h <= 2 * PAD) continue
    const crossesFrame = snap.frames.some(
      (f) => (f.y > top && f.y < bottom) || (f.y + f.h > top && f.y + f.h < bottom)
    )
    const s = crossesFrame ? 9 : 6
    if (Math.floor((h - 2 * PAD) / s) < 1) continue // 0 道=封闭（D-L2-7）
    out.push({ top, bottom, s, center: (top + bottom) / 2 })
  }
  return out
}

const vClear = (x: number, y1: number, y2: number, obstacles: readonly Rect[]): boolean =>
  !segHitsAny({ x, y: y1 }, { x, y: y2 }, obstacles)

/** 下降 x 候选（spec 序）：目标 x→所跨列缝中线[距目标 x 序]→框外空白 */
function descendCandidates(y1: number, y2: number, targetX: number, snap: LayoutSnapshot, cards: readonly Rect[]): number[] {
  const lo = Math.min(y1, y2)
  const hi = Math.max(y1, y2)
  const crossed = cards.filter((c) => c.y < hi && c.y + c.h > lo)
  const ivs = crossed.map((c) => [c.x, c.x + c.w] as const).sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const merged: Array<[number, number]> = []
  for (const [a, b] of ivs) {
    const last = merged[merged.length - 1]
    if (last !== undefined && a <= last[1]) last[1] = Math.max(last[1], b)
    else merged.push([a, b])
  }
  const seams: number[] = []
  for (let i = 1; i < merged.length; i++) {
    const a = merged[i - 1]![1]
    const b = merged[i]![0]
    if (b - a > 2 * PAD) seams.push((a + b) / 2)
  }
  seams.sort((p, q) => Math.abs(p - targetX) - Math.abs(q - targetX) || p - q)
  const frameXs = snap.frames.map((f) => f.x).filter((x) => x > PAD + 1)
  const blank = frameXs.length > 0 ? Math.min(...frameXs) - 23 : -1
  return [targetX, ...seams, ...(blank > PAD ? [blank] : [])]
}

/** 带路由骨架（zigzag：每带先试目标 x 终落；阻塞经候选 x 降下一带） */
export function bandSkeleton(
  src: Rect,
  tgt: Rect,
  down: boolean,
  snap: LayoutSnapshot,
  obstacles: readonly Rect[],
  cards: readonly Rect[],
  use: AnchorUse | undefined,
  srcId: string,
  tgtId: string
): BandRoute | null {
  const sc = center(src)
  const tc = center(tgt)
  const all = bandsOf(snap, cards)
  const between = all.filter((b) =>
    down
      ? b.top >= src.y + src.h - 0.01 && b.bottom <= tgt.y + 0.01
      : b.bottom <= src.y + 0.01 && b.top >= tgt.y + tgt.h - 0.01
  )
  if (between.length === 0) return null
  const bands = down ? between : [...between].reverse()
  const sa = sideAnchor(src, down ? 'bottom' : 'top', tc)
  const sb = sideAnchor(tgt, down ? 'top' : 'bottom', sc)
  const pa = anchorPick(srcId, src, sa.side, sa.slot, use)
  const pb = anchorPick(tgtId, tgt, sb.side, sb.slot, use)
  const A = pa.pt
  const B = pb.pt
  // [回炉 R3] 出桩=生效锚外法线（散开至左/右边后骨架首段不得横穿源卡）：
  // 竖边锚桩与原形共线（stripCollinear 收敛）；横边锚桩=竖转角引入点
  const aS = stubEnd(A, pa.side)
  const first = bands[0]!
  const skel: Pt[] = [A, aS, { x: aS.x, y: first.center }]
  let curX = aS.x
  for (let i = 0; i < bands.length; i++) {
    const band = bands[i]!
    const by = band.center
    // 终落：目标 x 自本带直落（末 10px 桩区排除源/目标卡——D-L2-4 桩语义）
    const stubTop = down ? B.y - 10 : B.y + 10
    const thirdParty = obstacles.filter((o) => o !== src && o !== tgt)
    if (vClear(B.x, by, stubTop, obstacles) && !segHitsAny({ x: B.x, y: stubTop }, B, thirdParty)) {
      // [回炉 R3] 终段=生效锚外法线桩（竖边锚共线；横边锚 L 形进段）
      const bS = stubEnd(B, pb.side)
      const isVerticalEnd = pb.side === 'top' || pb.side === 'bottom'
      if (isVerticalEnd) {
        skel.push({ x: B.x, y: by }, B)
      } else {
        skel.push({ x: B.x, y: by }, { x: bS.x, y: by }, bS, B)
      }
      const cap = Math.floor((band.bottom - band.top - 2 * PAD) / band.s)
      // [回炉 R2] picks=生效锚（散开身份）
      const picks: Array<[string, Side, number]> = [
        [srcId, pa.side, pa.slot],
        [tgtId, pb.side, pb.slot]
      ]
      return { skel, laneY: by, s: band.s, cap, picks }
    }
    if (i === bands.length - 1) return null
    const next = bands[i + 1]!
    let moved = false
    for (const x of descendCandidates(by, next.center, B.x, snap, cards)) {
      if (vClear(x, by, next.center, obstacles)) {
        if (x !== curX) skel.push({ x, y: by })
        skel.push({ x, y: next.center })
        curX = x
        moved = true
        break
      }
    }
    if (!moved) return null
  }
  return null
}

/** 走廊骨架（4 道环形探测——基道=字典序 rank 注入） */
export function corridorSkeleton(
  srcId: string,
  tgtId: string,
  src: Rect,
  tgt: Rect,
  snap: LayoutSnapshot,
  obstacles: readonly Rect[],
  ends: readonly Rect[],
  baseLane: number,
  use: AnchorUse | undefined
): { skel: Pt[]; lane: number; picks: Array<[string, Side, number]> } | null {
  const sc = center(src)
  const tc = center(tgt)
  const sa = sideAnchor(src, 'right', tc)
  const sb = sideAnchor(tgt, 'right', sc)
  const pa = anchorPick(srcId, src, sa.side, sa.slot, use)
  const pb = anchorPick(tgtId, tgt, sb.side, sb.slot, use)
  // [回炉 R3] 出桩=生效锚外法线：右缘面带主形（横边锚桩共线收敛）；
  // 散开至竖边锚（top/bottom）时首/末段经竖桩转横——不横穿源/目标卡
  const aS = stubEnd(pa.pt, pa.side)
  const bS = stubEnd(pb.pt, pb.side)
  const lc = snap.corridor.laneCount
  for (let i = 0; i < lc; i++) {
    const lane = (baseLane + i) % lc
    const lx = snap.corridor.left + lane * snap.corridor.laneW
    const skel: Pt[] = [pa.pt, aS, { x: lx, y: aS.y }, { x: lx, y: bS.y }, bS, pb.pt]
    if (polylineClearStubs(skel, ends, obstacles)) {
      // [回炉 R2] picks=生效锚（散开身份）
      return { skel, lane, picks: [[srcId, pa.side, pa.slot], [tgtId, pb.side, pb.slot]] }
    }
  }
  return null
}
