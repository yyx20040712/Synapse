/**
 * [R2-C2] outer-ring —— 外圈末级候选（图域最外圈车道绕行）。链位=band 不可
 * 用后、overlap 兜底前（用户裁决「不可能没有路径」：稀疏图 blocked=缺陷；
 * 同行被挡零带、同列月标封顶锚、序内槽位竞争三类残余形态的合法承接）。
 * 车道四条：top/bottom 横车道 y=quant(最外障碍边∓RING_MARGIN)、left/right
 * 纵车道 x 同式——RING_MARGIN=PAD+STUB_S0（障碍外让 16px>PAD，车道全程对
 * 障碍集净空由构造成立，连接段/行程段仍经全链 polylineClearStubs 复检）。
 * 外圈车道坐标=坐标集封闭（INV-SLOTGRID-02）第四类坐标源，随批登记
 * architecture/INV。锚候选（每端有序，钉定端直取禁动 INV-119③）=全部四侧
 * ['top','bottom','left','right'] 固定序（不按车道特判——几何不相容组合由
 * 净空门 polylineClearStubs 过滤，全序 tie-break 保持确定性）——散开经
 * AnchorUse.pick（12 锚域），胜出由 chain commit。构线=锚→短桩→车道连接段
 * →车道行程→对端连接段→短桩→锚。候选全序=（曼哈顿长，车道序
 * top<bottom<left<right，源候选序，目标候选序）字典序。确定性红线：无随机/
 * 无 Date/无三角函数。纯函数零 DOM import。
 */
import { anchorPick, sideAnchor, stubEnd, STUB_S0, type AnchorUse, type PickedAnchor, type Pt, type Rect, type Side } from './anchors'
import { PAD, polylineClearStubs } from './avoid'
import { quant } from './gap-cells'

/** 外圈车道让距（障碍外让 PAD+短桩 10=16px——对障碍净空恒 >PAD） */
const RING_MARGIN = PAD + STUB_S0

/** 外圈路由结果（picks=生效锚注册——chain commit 消费） */
export interface RingRoute {
  skel: Pt[]
  picks: Array<[string, Side, number]>
}

const center = (r: Rect): Pt => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 })

/** 车道四坐标（最外障碍边 ∓ 让距，0.1 量化——同槽位量化步进） */
export function ringLanesOf(obstacles: readonly Rect[]): { top: number; bottom: number; left: number; right: number } {
  let minTop = Number.POSITIVE_INFINITY
  let maxBottom = Number.NEGATIVE_INFINITY
  let minLeft = Number.POSITIVE_INFINITY
  let maxRight = Number.NEGATIVE_INFINITY
  for (const o of obstacles) {
    if (o.y < minTop) minTop = o.y
    if (o.y + o.h > maxBottom) maxBottom = o.y + o.h
    if (o.x < minLeft) minLeft = o.x
    if (o.x + o.w > maxRight) maxRight = o.x + o.w
  }
  return {
    top: quant(minTop - RING_MARGIN),
    bottom: quant(maxBottom + RING_MARGIN),
    left: quant(minLeft - RING_MARGIN),
    right: quant(maxRight + RING_MARGIN)
  }
}

/** 端锚候选（有序）：钉定=直取单项；未钉定=anchorPick 散开（首选槽=侧内投影最近） */
const endCandidates = (
  id: string,
  r: Rect,
  toward: Pt,
  sides: readonly Side[],
  pin: PickedAnchor | undefined,
  use: AnchorUse | undefined
): PickedAnchor[] => {
  if (pin !== undefined) return [pin]
  return sides.map((side) => anchorPick(id, r, side, sideAnchor(r, side, toward).slot, use))
}

/** 车道序（枚举序=车道序 tie-break：top<bottom<left<right） */
const LANE_ORDER = ['top', 'bottom', 'left', 'right'] as const

/** 端锚候选侧全集（固定序=候选全序端内序载体；不按车道特判——不相容组合
 *  由净空门 polylineClearStubs 过滤） */
const ALL_SIDES = ['top', 'bottom', 'left', 'right'] as const

const manhattan = (pts: readonly Pt[]): number => {
  let sum = 0
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!
    const b = pts[i]!
    sum += Math.abs(b.x - a.x) + Math.abs(b.y - a.y)
  }
  return sum
}

/**
 * 外圈骨架：四车道 × 每端候选锚全组合构线，全链净空门过滤，候选全序取首。
 * 横车道连接段在锚短桩端 x 竖直接车道、纵车道在短桩端 y 横接——首段恒沿
 * 锚外法线（INV-119①带桩族同族）。无合法候选=null（chain 降 overlap 兜底）。
 */
export function ringSkeleton(
  src: Rect,
  tgt: Rect,
  obstacles: readonly Rect[],
  use: AnchorUse | undefined,
  srcId: string,
  tgtId: string,
  fromPin?: PickedAnchor,
  toPin?: PickedAnchor
): RingRoute | null {
  const lanes = ringLanesOf(obstacles)
  if (!Number.isFinite(lanes.top)) return null
  const sc = center(src)
  const tc = center(tgt)
  // 候选与车道无关（全四侧×全车道组合）——端列表循环外一次构足
  const srcList = endCandidates(srcId, src, tc, ALL_SIDES, fromPin, use)
  const tgtList = endCandidates(tgtId, tgt, sc, ALL_SIDES, toPin, use)
  const cands: Array<{ skel: Pt[]; picks: Array<[string, Side, number]>; len: number }> = []
  for (const lane of LANE_ORDER) {
    const horizontal = lane === 'top' || lane === 'bottom'
    for (const pa of srcList) {
      for (const pb of tgtList) {
        const aS = stubEnd(pa.pt, pa.side)
        const bS = stubEnd(pb.pt, pb.side)
        const skel: Pt[] = horizontal
          ? [pa.pt, aS, { x: aS.x, y: lanes[lane] }, { x: bS.x, y: lanes[lane] }, bS, pb.pt]
          : [pa.pt, aS, { x: lanes[lane], y: aS.y }, { x: lanes[lane], y: bS.y }, bS, pb.pt]
        if (!polylineClearStubs(skel, [src, tgt], obstacles)) continue
        cands.push({
          skel,
          len: manhattan(skel),
          picks: [
            [srcId, pa.side, pa.slot],
            [tgtId, pb.side, pb.slot]
          ]
        })
      }
    }
  }
  if (cands.length < 1) return null
  let best = cands[0]!
  // 候选全序=曼哈顿长升序→车道序→端内候选序——车道/端内序即枚举序，故严格
  // 小于比较下先见者胜（并列不换），确定性成立
  for (let k = 1; k < cands.length; k++) {
    const c = cands[k]!
    if (c.len < best.len) best = c
  }
  return { skel: best.skel, picks: best.picks }
}
