/**
 * [F-LINEAGE-02 ①a] bands —— 甲链带路由机件（行隙带/框间带——options §2-A；
 * design-final §1）。带=卡 y 区间夹缝（框边界在缝内→框间带 s=9，否则行隙
 * s=6；车道数=⌊(带宽−2·PAD)/s⌋，0 道=封闭 D-L2-7）；zigzag 骨架：每带先试
 * 目标 x 终落（末 10px 桩区排除源/目标卡——D-L2-4），终落受阻经同边 slot
 * 近序散开重试（[批3] 月标封堵首选 slot 的绕右修正；同边三槽全挡的邻边
 * 逃逸挂账后续票——主控挂账），阻塞经下降 x 候选（目标 x→所跨列缝中线
 * [距目标 x 序]→框外空白）降下一带。确定性红线：
 * 无随机/无 Date/无三角函数。纯函数零 DOM import。
 */
import { anchorPick, anchorPoint, sideAnchor, stubEnd, type AnchorUse, type Pt, type Rect, type Side } from './anchors'
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
export interface Band {
  top: number
  bottom: number
  s: number
  center: number
}

/** [F-ROUTE-02 U1] 导出=slots.ts 带归属消费（行隙单元 y 中点落带→bandId） */
export function bandsOf(snap: LayoutSnapshot, cards: readonly Rect[]): Band[] {
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
  const A = pa.pt
  // [回炉 R3] 出桩=生效锚外法线（散开至左/右边后骨架首段不得横穿源卡）：
  // 竖边锚桩与原形共线（stripCollinear 收敛）；横边锚桩=竖转角引入点
  const aS = stubEnd(A, pa.side)
  const first = bands[0]!
  const skel: Pt[] = [A, aS, { x: aS.x, y: first.center }]
  let curX = aS.x
  const thirdParty = obstacles.filter((o) => o !== src && o !== tgt)
  // [批3] 终落锚散开：首选锚受阻（月标封堵首选 slot——INV-79 标注属障碍
  // 集，散开=绕开障碍非豁免障碍）时按 slot 近序重试——同边 [base,(base+1)
  // %3,(base+2)%3]（AnchorUse.pick 同式）；基序=sb 几何首选（[回炉 W2] 非
  // use 散开后的 pb——占用域经候选循环 has 预检正交互避）。首成功者=生效
  // 锚；全候选失败才维持降级 corridor（return null）。[回炉 B1] 候选域收窄
  // 为同边三槽（月标封堵主场景已覆盖；邻边逃逸挂账后续票）
  const endSide: Side = down ? 'top' : 'bottom'
  const base = sb.side === endSide ? sb.slot : 1
  const spread: ReadonlyArray<readonly [Side, number]> = [
    [endSide, base],
    [endSide, (base + 1) % 3],
    [endSide, (base + 2) % 3]
  ]
  // [回炉 W2] 死码清理随动：descend 目标 x 换几何首选锚 x（原 B=pb.pt 随
  // 终落段改锚候选域而退役——use=undefined 时数值全等，routeAll 语义取
  // 几何首选与占用正交一致）
  const tgtAnchorX = anchorPoint(tgt, endSide, base).x
  for (let i = 0; i < bands.length; i++) {
    const band = bands[i]!
    const by = band.center
    // 终落：目标 x 自本带直落（末 10px 桩区排除源/目标卡——D-L2-4 桩语义）
    for (const [side, slot] of spread) {
      // [回炉 B2] 先占用后几何（几何候选须避开已 commit 锚——省无谓取点）
      if (use !== undefined && use.has(tgtId, side, slot)) continue
      const pt = anchorPoint(tgt, side, slot)
      const stubTop = down ? pt.y - 10 : pt.y + 10
      if (!vClear(pt.x, by, stubTop, obstacles)) continue
      if (segHitsAny({ x: pt.x, y: stubTop }, pt, thirdParty)) continue
      // [回炉 R3] 终段=生效锚外法线桩（竖边锚共线——B1 收窄后恒竖边）
      skel.push({ x: pt.x, y: by }, pt)
      const cap = Math.floor((band.bottom - band.top - 2 * PAD) / band.s)
      // [回炉 R2] picks=生效锚（散开身份——仅胜出态落记，失败尝试不 commit）
      const picks: Array<[string, Side, number]> = [
        [srcId, pa.side, pa.slot],
        [tgtId, side, slot]
      ]
      return { skel, laneY: by, s: band.s, cap, picks }
    }
    if (i === bands.length - 1) return null
    const next = bands[i + 1]!
    let moved = false
    for (const x of descendCandidates(by, next.center, tgtAnchorX, snap, cards)) {
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
