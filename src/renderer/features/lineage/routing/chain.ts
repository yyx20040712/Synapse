/**
 * [F-LINEAGE-02 ①a] chain —— 甲链六态编排（options §2-A+design-final §1：
 * direct→h-slip→band→corridor→fallback 单向不回溯+manual-override）。
 * 车道：走廊=字典序基道环形探测（4 道 9px）；带=中心探测+共道分组字典序
 * 偏移 (i−(k−1)/2)·s 钳容量内（s∈{9,6}——框间带 9/行隙 6；车道数=
 * ⌊(带宽−2·PAD)/s⌋，0 道=封闭 D-L2-7）。同锚多边先散锚点（同侧下一空闲→
 * 邻边→对边；12 锚全满=共享原锚）。曲化后采样复检+半径收缩链（D-L2-5/6：
 * r=6→3→r<2 尖角）。确定性红线：无随机/无 Date/无三角函数；并列取字典序/
 * 几何序。纯函数零 DOM import（快照采集驻 EdgeOverlay hook 层）。
 */
import { AnchorUse, anchorPick, selectAnchor, sideAnchor, stubEnd, type Pt, type Rect, type Side } from './anchors'
import { bandSkeleton, corridorSkeleton } from './bands'
import { PAD, polylineClearStubs } from './avoid'
import { buildRoundedPath, stripCollinear } from './rounding'
import type { LineageViaPoint } from '@shared/models/lineage'

export type { Pt, Rect } from './anchors'

export type RouteTag = 'direct' | 'h-slip' | 'band' | 'corridor' | 'fallback' | 'manual-override'
export interface MonthFrame extends Rect {
  year: number | null
}
export interface Corridor {
  left: number
  laneW: number
  laneCount: number
}
export interface LayoutSnapshot {
  cards: ReadonlyMap<string, Rect>
  labels: Rect[]
  frames: MonthFrame[]
  /** [F-UIRES-03 C2·P7] 年份头障碍集（.tl-year-head rects——buildSnapshot
   *  采集；避让 PAD 同源 avoid.PAD 不另设） */
  yearHeads: Rect[]
  contentW: number
  corridor: Corridor
}

/** [F-UIRES-03 C2·P7] 障碍集组装单源（三源并集=全部卡∪月标注∪年份头——
 *  manual-override 边不消费本集〔via 在场不避让，现状语义沿承〕） */
export function allObstacles(snap: LayoutSnapshot): Rect[] {
  return [...snap.cards.values(), ...snap.labels, ...snap.yearHeads]
}
/** [F-LGRAPH-01②U8] kind/subId 随四值体系退役（路由几何不消费线型——纯结构面） */
export interface EdgeGeomInput {
  edgeId: string
  sourceId: string
  targetId: string
  via?: LineageViaPoint[]
}
export interface RoutedPath {
  edgeId: string
  d: string
  route: RouteTag
  lane: number
  /** [F-LGRAPH-01②U5] 骨架点链（圆角化前——锚 A→…→锚 B 内容坐标）：手柄
   *  几何/自动线物化 via（首 via 落位）消费；渲染不变（d 才是渲染面） */
  pts: Pt[]
}

const CORRIDOR_W = 58
const CORRIDOR_INSET = 10
const LANE_W = 9
const LANE_COUNT = 4
const FALLBACK_INSET = 6
const ROUND_R = 6

/** D-5 车道参数单源（buildSnapshot/测试夹具共用——laneX(i)=contentW−58+10+i×9） */
export function defaultCorridor(contentW: number): Corridor {
  return { left: contentW - CORRIDOR_W + CORRIDOR_INSET, laneW: LANE_W, laneCount: LANE_COUNT }
}

export function laneIndex(edgeId: string, all: readonly string[]): number {
  return [...all].sort().indexOf(edgeId)
}

// ── 内部中间态（routeAll 车道 pass 后产 d）──
interface SkelResult {
  edgeId: string
  skel: Pt[]
  route: RouteTag
  lane: number
  stubExcluded: Rect[]
  /** 带车道 pass 输入（非带路由缺省） */
  bandY?: number
  bandS?: number
  bandCap?: number
  xLo?: number
  xHi?: number
}

const center = (r: Rect): Pt => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 })
const isVerticalSide = (side: Side): boolean => side === 'top' || side === 'bottom'

/** 骨架→终态 d（共线剔除+圆角化+采样复检收缩链 r=6→3→尖角）；
 *  manual-override=纯圆角化 pass 不走避让复检（design-final §2.2——用户
 *  排位主权，穿卡警示归 F-LGRAPH-01 ②渲染面） */
function finish(skel: readonly Pt[], stubExcluded: readonly Rect[], obstacles: readonly Rect[], manual: boolean): string {
  const stripped = stripCollinear(skel)
  if (manual) return buildRoundedPath(stripped, ROUND_R).d
  for (const r of [ROUND_R, ROUND_R / 2]) {
    const built = buildRoundedPath(stripped, r)
    if (polylineClearStubs(built.samples, stubExcluded, obstacles)) return built.d
  }
  return buildRoundedPath(stripped, 0).d
}

function routeOne(
  e: EdgeGeomInput,
  snap: LayoutSnapshot,
  src: Rect,
  tgt: Rect,
  baseLane: number,
  onWarn: (m: string) => void,
  use: AnchorUse | undefined
): SkelResult {
  const obstacles = allObstacles(snap) // [C2·P7] 三源并集单源（含 yearHeads）
  const ends = [src, tgt]
  const cards = [...snap.cards.values()]
  const sc = center(src)
  const tc = center(tgt)
  // manual-override：via 在场（锚=端点卡按主向定边规则定；不参与避让/车道）
  if (e.via !== undefined && e.via.length > 0) {
    const a = selectAnchor(src, e.via[0]!)
    const b = selectAnchor(tgt, e.via[e.via.length - 1]!)
    return { edgeId: e.edgeId, skel: [a.pt, ...e.via, b.pt], route: 'manual-override', lane: -1, stubExcluded: [] }
  }
  const commit = (picks: ReadonlyArray<[string, Side, number]>): void => {
    for (const [id, side, slot] of picks) use?.commit(id, side, slot)
  }
  // ① direct：主向竖向对齐直连（锚 x 相等单竖段）
  const sa = selectAnchor(src, tc)
  const sb = selectAnchor(tgt, sc)
  const pa = anchorPick(e.sourceId, src, sa.side, sa.slot, use)
  const pb = anchorPick(e.targetId, tgt, sb.side, sb.slot, use)
  const aPt = pa.pt
  const bPt = pb.pt
  if (isVerticalSide(sa.side) && isVerticalSide(sb.side) && aPt.x === bPt.x) {
    if (polylineClearStubs([aPt, bPt], ends, obstacles)) {
      commit([
        [e.sourceId, pa.side, pa.slot],
        [e.targetId, pb.side, pb.slot]
      ])
      return { edgeId: e.edgeId, skel: [aPt, bPt], route: 'direct', lane: -1, stubExcluded: ends }
    }
  }
  // ② h-slip：近侧水平直连（x 带分离——单段直线，y 异高斜向允许）
  if (src.x + src.w + 2 * PAD < tgt.x || tgt.x + tgt.w + 2 * PAD < src.x) {
    const ha = sideAnchor(src, tc.x > sc.x ? 'right' : 'left', tc)
    const hb = sideAnchor(tgt, sc.x > tc.x ? 'right' : 'left', sc)
    const ph = anchorPick(e.sourceId, src, ha.side, ha.slot, use)
    const qh = anchorPick(e.targetId, tgt, hb.side, hb.slot, use)
    const aH = ph.pt
    const bH = qh.pt
    if (polylineClearStubs([aH, bH], ends, obstacles)) {
      commit([
        [e.sourceId, ph.side, ph.slot],
        [e.targetId, qh.side, qh.slot]
      ])
      return { edgeId: e.edgeId, skel: [aH, bH], route: 'h-slip', lane: -1, stubExcluded: ends }
    }
  }
  // ③ band：行隙/框间带路由（zigzag 下降候选吸收瀑布错位）
  const band = bandSkeleton(src, tgt, tc.y >= sc.y, snap, obstacles, cards, use, e.sourceId, e.targetId)
  if (band !== null && polylineClearStubs(band.skel, ends, obstacles)) {
    commit(band.picks)
    return {
      edgeId: e.edgeId,
      skel: band.skel,
      route: 'band',
      lane: -1,
      stubExcluded: ends,
      bandY: band.laneY,
      bandS: band.s,
      bandCap: Math.max(1, band.cap),
      xLo: Math.min(...band.skel.map((p) => p.x)),
      xHi: Math.max(...band.skel.map((p) => p.x))
    }
  }
  // ④ corridor：右缘面带 4 道环形探测（lane≥0=corridor/fallback 划界）
  const corr = corridorSkeleton(e.sourceId, e.targetId, src, tgt, snap, obstacles, ends, baseLane, use)
  if (corr !== null) {
    commit(corr.picks)
    return { edgeId: e.edgeId, skel: corr.skel, route: 'corridor', lane: corr.lane, stubExcluded: ends }
  }
  // ⑤ fallback：贴边（面带探测失败——数值退化不静默，lane=−1）
  const fx = snap.contentW - FALLBACK_INSET
  const fa = sideAnchor(src, 'right', tc)
  const fb = sideAnchor(tgt, 'right', sc)
  const pf = anchorPick(e.sourceId, src, fa.side, fa.slot, use)
  const pg = anchorPick(e.targetId, tgt, fb.side, fb.slot, use)
  // [回炉 R3] 贴边骨架同经生效锚外法线桩（退化态锚向语义一致）
  const faS = stubEnd(pf.pt, pf.side)
  const fbS = stubEnd(pg.pt, pg.side)
  onWarn(`lineage-routing：边 ${e.edgeId} fallback 贴边（laneX=${fx}）`)
  // [回炉 R2 补面] fallback 锚=实际占用同样落记（漏记则后续边重取同锚——
  // 13 边零盒实测 e12 应共享原锚却重取左侧锚落 fallback）
  commit([
    [e.sourceId, pf.side, pf.slot],
    [e.targetId, pg.side, pg.slot]
  ])
  return {
    edgeId: e.edgeId,
    skel: [pf.pt, faS, { x: fx, y: faS.y }, { x: fx, y: fbS.y }, fbS, pg.pt],
    route: 'fallback',
    lane: -1,
    stubExcluded: ends
  }
}

export function routeEdge(
  e: EdgeGeomInput,
  snap: LayoutSnapshot,
  onWarn: (m: string) => void = () => undefined
): RoutedPath {
  const src = snap.cards.get(e.sourceId)
  const tgt = snap.cards.get(e.targetId)
  if (src === undefined || tgt === undefined) {
    onWarn(`lineage-routing：边 ${e.edgeId} 端点卡缺失（${e.sourceId}/${e.targetId}），跳过路由`)
    return { edgeId: e.edgeId, d: '', route: 'fallback', lane: -1, pts: [] }
  }
  const r = routeOne(e, snap, src, tgt, 0, onWarn, undefined)
  const all = allObstacles(snap) // [C2·P7] 曲化复检障碍集同源（含 yearHeads）
  return { edgeId: r.edgeId, d: finish(r.skel, r.stubExcluded, all, r.route === 'manual-override'), route: r.route, lane: r.lane, pts: r.skel }
}

/** 带共道分组（同带同轴+投影重叠链）字典序偏移 (i−(k−1)/2)·s 钳容量内 */
function applyBandLanes(results: SkelResult[]): void {
  const byBand = new Map<number, SkelResult[]>()
  for (const r of results) {
    if (r.route !== 'band' || r.bandY === undefined) continue
    const list = byBand.get(r.bandY) ?? []
    list.push(r)
    byBand.set(r.bandY, list)
  }
  for (const list of byBand.values()) {
    if (list.length < 2) continue
    // 投影重叠链（xLo 升序——簇内互达）
    list.sort((a, b) => (a.xLo ?? 0) - (b.xLo ?? 0) || (a.edgeId < b.edgeId ? -1 : 1))
    let cluster: SkelResult[] = []
    let clusterHi = -Infinity
    const flush = (): void => {
      if (cluster.length < 2) {
        cluster = []
        return
      }
      const s = cluster[0]!.bandS ?? 6
      const cap = cluster[0]!.bandCap ?? 1
      const maxOff = ((cap - 1) / 2) * s
      const ordered = [...cluster].sort((a, b) => (a.edgeId < b.edgeId ? -1 : 1))
      ordered.forEach((r, i) => {
        const off = Math.max(-maxOff, Math.min(maxOff, (i - (ordered.length - 1) / 2) * s))
        if (off === 0) return
        const from = r.bandY
        const to = (r.bandY ?? 0) + off
        r.skel = r.skel.map((p) => (p.y === from ? { x: p.x, y: to } : p))
        r.bandY = to
      })
      cluster = []
    }
    for (const r of list) {
      if (cluster.length > 0 && (r.xLo ?? 0) > clusterHi) flush()
      cluster.push(r)
      clusterHi = Math.max(clusterHi, r.xHi ?? 0)
    }
    flush()
  }
}

export function routeAll(
  edges: readonly EdgeGeomInput[],
  snap: LayoutSnapshot,
  onWarn: (m: string) => void = () => undefined
): RoutedPath[] {
  const ids = edges.map((e) => e.edgeId)
  const use = new AnchorUse()
  const results = edges.map((e) => {
    const src = snap.cards.get(e.sourceId)
    const tgt = snap.cards.get(e.targetId)
    if (src === undefined || tgt === undefined) {
      onWarn(`lineage-routing：边 ${e.edgeId} 端点卡缺失（${e.sourceId}/${e.targetId}），跳过路由`)
      return { edgeId: e.edgeId, skel: [] as Pt[], route: 'fallback' as RouteTag, lane: -1, stubExcluded: [] as Rect[] }
    }
    return routeOne(e, snap, src, tgt, laneIndex(e.edgeId, ids) % snap.corridor.laneCount, onWarn, use)
  })
  applyBandLanes(results)
  const all = allObstacles(snap) // [C2·P7] 曲化复检障碍集同源（含 yearHeads）
  return results.map((r) => ({
    edgeId: r.edgeId,
    d: finish(r.skel, r.stubExcluded, all, r.route === 'manual-override'),
    route: r.route,
    lane: r.lane,
    pts: r.skel
  }))
}
