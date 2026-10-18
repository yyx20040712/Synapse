/**
 * [F-SLOTGRID-01 U2] bands —— 甲链带路由机件·通用态限域（设计 v1.4 §5.3
 * band 通用态：x 不对齐/多带 zigzag；同柱受阻近绕专态归 detour.ts 前置）。
 * 带模型（卡 y 区间夹缝）沿承：框边界在缝内→s=9，否则 s=6（残余子 pass 偏移
 * 参数族——residual.ts 消费）；**横移 y=带槽位中位（gap-cells midSlotOf 单源
 * ——坐标集封闭 INV-SLOTGRID-02；带封闭〔高<36⇔n=0〕不可横移=带剔除）**；
 * 72px 行隙带中位槽=带中心（k=3 位）。zigzag 骨架：每带先试目标 x 终落（末
 * 10px 桩区排除源/目标卡——D-L2-4），终落受阻经同边 slot 近序散开重试（
 * INV-79 标注属障碍集，散开=绕开非豁免）；阻塞横移目标=**下一段顺位首空槽
 * （网格通道槽位候选·同全序——byTotalOrder 字典序：拐弯数→|x−目标锚 x|→x；
 * 框外空白候选随走廊退役删除——探针 x=43 框外逃逸形态结构性禁绝）**。
 * 确定性红线：无随机/无 Date/无三角函数。纯函数零 DOM import。
 */
import { anchorPick, anchorPoint, sideAnchor, stubEnd, type AnchorUse, type PickedAnchor, type Pt, type Rect, type Side } from './anchors'
import { PAD, segHitsAny } from './avoid'
import type { LayoutSnapshot } from './chain'
import { byTotalOrder, gridChannelsOf, type ChannelUse } from './detour'
import { midSlotOf } from './gap-cells'

const center = (r: Rect): Pt => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 })

/** 带路由结果（laneY/s/cap=残余子 pass 输入；picks=胜出锚注册） */
export interface BandRoute {
  skel: Pt[]
  laneY: number
  s: number
  cap: number
  picks: Array<[string, Side, number]>
}

/** 带模型（卡 y 区间夹缝；框边界在缝内→框间带 s=9，否则行隙 s=6——残余偏移族） */
export interface Band {
  top: number
  bottom: number
  s: number
  center: number
}

/** 带表（[F-ROUTE-02 U1] 导出=slots.ts 带归属消费——行隙单元 y 中点落带→bandId；
 *  带存活判据沿承 s 车道式（⌊(h−2·PAD)/s⌋≥1），横移可用性另经 midSlotOf 判
 *  （bandSkeleton 域）——两层判据异源分工：带归属面零扰动） */
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
    if (Math.floor((h - 2 * PAD) / s) < 1) continue // 0 道=封闭（D-L2-7——带归属面）
    out.push({ top, bottom, s, center: (top + bottom) / 2 })
  }
  return out
}

const vClear = (x: number, y1: number, y2: number, obstacles: readonly Rect[]): boolean =>
  !segHitsAny({ x, y: y1 }, { x, y: y2 }, obstacles)

/** 下降 x 候选（[F-SLOTGRID-01 U2] 重写）：y 夹层〔by, nextY〕正相交的网格通道
 *  槽位全集，按候选全序（拐弯数〔x===curX=0 拐〕→|x−refX|→x）排序——**[RR1
 *  W3] 槽位级空槽判定**（ChannelUse 占用剔除——「下一段顺位首空槽」，detour
 *  与共用实例跨态共享）；框外空白/列缝中线候选随走廊退役删除（坐标集封闭） */
function descendCandidates(
  snap: LayoutSnapshot,
  y1: number,
  y2: number,
  refX: number,
  curX: number,
  chanUse: ChannelUse
): Array<{ key: string; idx: number; x: number }> {
  const lo = Math.min(y1, y2)
  const hi = Math.max(y1, y2)
  return gridChannelsOf(snap)
    .filter((ch) => ch.yLo < hi && ch.yHi > lo)
    .flatMap((ch) => ch.slots.map((x, idx) => ({ key: ch.key, idx, x })))
    .filter((c) => !chanUse.has(c.key, c.idx))
    .sort(byTotalOrder<{ x: number }>(refX, curX))
}

/** 带路由骨架（zigzag：每带先试目标 x 终落；阻塞经通道槽位候选降下一带
 *  ——[RR1 W3] 顺位首**空**槽（ChannelUse 剔除，胜出槽随成功态 commit——
 *  与 detour 共用同一实例）；横移 y=带槽位中位——midSlotOf null=带封闭剔除
 *  〔高<36 不可横移〕） */
export function bandSkeleton(
  src: Rect,
  tgt: Rect,
  down: boolean,
  snap: LayoutSnapshot,
  obstacles: readonly Rect[],
  cards: readonly Rect[],
  use: AnchorUse | undefined,
  chanUse: ChannelUse,
  srcId: string,
  tgtId: string,
  edgeId: string,
  /** [F-VISFB-66] 钉定端（提供=直取禁动：源端取该锚/终落优先该锚——设计书 §F） */
  fromPin?: PickedAnchor,
  toPin?: PickedAnchor
): BandRoute | null {
  const sc = center(src)
  const tc = center(tgt)
  const all = bandsOf(snap, cards)
  const between = all.filter((b) => {
    const moveY = midSlotOf('y', { x: 0, y: b.top, w: 0, h: b.bottom - b.top })
    if (moveY === null) return false // 带封闭（<36⇔n=0）——坐标集封闭不可横移
    if (down) return b.top >= src.y + src.h - 0.01 && b.bottom <= tgt.y + 0.01
    return b.bottom <= src.y + 0.01 && b.top >= tgt.y + tgt.h - 0.01
  })
  if (between.length === 0) return null
  const bands = down ? between : [...between].reverse()
  const sa = sideAnchor(src, down ? 'bottom' : 'top', tc)
  const sb = sideAnchor(tgt, down ? 'top' : 'bottom', sc)
  // [F-VISFB-66] 钉定源端直取（禁动——散开不迁移钉定锚）
  const pa = fromPin ?? anchorPick(srcId, src, sa.side, sa.slot, use)
  const A = pa.pt
  // 出桩=生效锚外法线（散开至左/右边后骨架首段不得横穿源卡）：竖边锚桩与
  // 原形共线（stripCollinear 收敛）；横边锚桩=竖转角引入点
  const aS = stubEnd(A, pa.side)
  const moveYOf = (b: Band): number => midSlotOf('y', { x: 0, y: b.top, w: 0, h: b.bottom - b.top })!
  const first = bands[0]!
  const skel: Pt[] = [A, aS, { x: aS.x, y: moveYOf(first) }]
  let curX = aS.x
  const thirdParty = obstacles.filter((o) => o !== src && o !== tgt)
  // 终落锚散开：首选锚受阻（月标封堵首选 slot——INV-79 标注属障碍集，散开=
  // 绕开障碍非豁免）时按 slot 近序重试——同边 [base,(base+1)%3,(base+2)%3]
  // （AnchorUse.pick 同式）；基序=sb 几何首选。首成功者=生效锚；全候选失败
  // 才降级（return null→chain 后继态）
  const endSide: Side = down ? 'top' : 'bottom'
  const base = sb.side === endSide ? sb.slot : 1
  const spread: ReadonlyArray<readonly [Side, number]> = [
    [endSide, base],
    [endSide, (base + 1) % 3],
    [endSide, (base + 2) % 3]
  ]
  // descend 目标 x=几何首选锚 x（use=undefined 时数值全等，routeAll 语义取
  // 几何首选与占用正交一致——[回炉 W2] 沿承）
  const tgtAnchorX = anchorPoint(tgt, endSide, base).x
  const pendingSlots: Array<{ key: string; idx: number }> = []
  for (let i = 0; i < bands.length; i++) {
    const band = bands[i]!
    const by = moveYOf(band)
    // [F-VISFB-66] 钉定终落（禁动）：toPin 提供=只试钉定锚（不经 use.has——
    // routeAll 阶段 0 自身预注册不阻断己边；几何检查不过=本带不落降下带，
    // 禁散开到其他槽）；全带尽=band 不可用（chain 降 overlap 兜底直取）
    if (toPin !== undefined) {
      const pinPt = toPin.pt
      const pinStub = down ? pinPt.y - 10 : pinPt.y + 10
      if (vClear(pinPt.x, by, pinStub, obstacles) && !segHitsAny({ x: pinPt.x, y: pinStub }, pinPt, thirdParty)) {
        skel.push({ x: pinPt.x, y: by }, pinPt)
        const pinCap = Math.floor((band.bottom - band.top - 2 * PAD) / band.s)
        const pinPicks: Array<[string, Side, number]> = [
          [srcId, pa.side, pa.slot],
          [tgtId, toPin.side, toPin.slot]
        ]
        for (const s of pendingSlots) chanUse.commit(s.key, s.idx, edgeId)
        return { skel, laneY: by, s: band.s, cap: pinCap, picks: pinPicks }
      }
      if (i === bands.length - 1) return null
      const pinNext = bands[i + 1]!
      const pinNextY = moveYOf(pinNext)
      let pinMoved = false
      for (const c of descendCandidates(snap, by, pinNextY, tgtAnchorX, curX, chanUse)) {
        if (vClear(c.x, by, pinNextY, obstacles)) {
          if (c.x !== curX) skel.push({ x: c.x, y: by })
          skel.push({ x: c.x, y: pinNextY })
          curX = c.x
          pendingSlots.push({ key: c.key, idx: c.idx })
          pinMoved = true
          break
        }
      }
      if (!pinMoved) return null
      continue
    }
    // 终落：目标 x 自本带直落（末 10px 桩区排除源/目标卡——D-L2-4 桩语义）
    for (const [side, slot] of spread) {
      if (use !== undefined && use.has(tgtId, side, slot)) continue
      const pt = anchorPoint(tgt, side, slot)
      const stubTop = down ? pt.y - 10 : pt.y + 10
      if (!vClear(pt.x, by, stubTop, obstacles)) continue
      if (segHitsAny({ x: pt.x, y: stubTop }, pt, thirdParty)) continue
      // 终段=生效锚外法线桩（竖边锚共线）
      skel.push({ x: pt.x, y: by }, pt)
      const cap = Math.floor((band.bottom - band.top - 2 * PAD) / band.s)
      const picks: Array<[string, Side, number]> = [
        [srcId, pa.side, pa.slot],
        [tgtId, side, slot]
      ]
      for (const s of pendingSlots) chanUse.commit(s.key, s.idx, edgeId)
      return { skel, laneY: by, s: band.s, cap, picks }
    }
    if (i === bands.length - 1) return null
    const next = bands[i + 1]!
    const nextY = moveYOf(next)
    let moved = false
    for (const c of descendCandidates(snap, by, nextY, tgtAnchorX, curX, chanUse)) {
      if (vClear(c.x, by, nextY, obstacles)) {
        if (c.x !== curX) skel.push({ x: c.x, y: by })
        skel.push({ x: c.x, y: nextY })
        curX = c.x
        pendingSlots.push({ key: c.key, idx: c.idx })
        moved = true
        break
      }
    }
    if (!moved) return null
  }
  return null
}
