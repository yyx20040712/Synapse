/**
 * [F-LINEAGE-02 ①a] chain —— 甲链六态编排（options §2-A+design-final §1：
 * direct→h-slip→band→corridor→fallback 单向不回溯+manual-override）。
 * 车道：走廊=字典序基道环形探测（4 道 9px）；同锚多边先散锚点（同侧下一
 * 空闲→邻边→对边；12 锚全满=共享原锚）。曲化后采样复检+半径收缩链（D-L2-5/6：
 * r=6→3→r<2 尖角）。确定性红线：无随机/无 Date/无三角函数；并列取字典序/
 * 几何序。纯函数零 DOM import（快照采集驻 EdgeOverlay hook 层）。
 * [F-ROUTE-02 U3] 接入：routeOne 循环→slotAssign（槽位分配+残余子 pass
 * 承袭旧 applyBandLanes——共道分组字典序偏移域内等价）→回写 skel→finish；
 * band/corridor/fallback 三态骨架携桩段（stubs）入谓词复检。
 */
import { AnchorUse, anchorPick, anchorPoint, selectAnchor, sideAnchor, stubEnd, type Pt, type Rect, type Side } from './anchors'
import { bandSkeleton, corridorSkeleton } from './bands'
import { PAD, polylineClearStubs } from './avoid'
import { buildRoundedPath, stripCollinear } from './rounding'
import { slotAssign, type AssignEdge } from './slots'
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
  /** [F-LGRAPH-01②U5] 施加后点链（槽位/残余施加毕、圆角化前——锚 A→…→
   *  锚 B 内容坐标）：手柄几何/自动线物化 via（首 via 落位）消费；渲染不变
   *  （d 才是渲染面） */
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

// ── 内部中间态（routeOne 循环→slotAssign 施加后产 d）──
interface SkelResult {
  edgeId: string
  skel: Pt[]
  route: RouteTag
  lane: number
  stubExcluded: Rect[]
  /** [F-ROUTE-02 U3] 桩段（三态骨架外法线 10px——Z 拐点禁入域；与骨架
   *  顶点按构造全等：band 出桩/终落、corridor/fallback 出桩；direct/
   *  h-slip/manual-override 骨架无桩顶点=缺省） */
  stubs?: ReadonlyArray<{ a: Pt; b: Pt }>
  /** 带车道 pass 输入（非带路由缺省） */
  bandY?: number
  bandS?: number
  bandCap?: number
  xLo?: number
  xHi?: number
}

const center = (r: Rect): Pt => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 })

/** [F-ROUTE-02 U3] 桩段派生：picks 每项 [id,side,slot]→{a: 锚点几何，b:
 *  外法线 10px 桩端}（与骨架首/末桩顶点全等——jogClearOfStub 消费） */
const stubsOf = (e: EdgeGeomInput, src: Rect, tgt: Rect, picks: ReadonlyArray<[string, Side, number]>): Array<{ a: Pt; b: Pt }> =>
  picks.map(([id, side, slot]) => {
    const a = anchorPoint(id === e.sourceId ? src : tgt, side, slot)
    return { a, b: stubEnd(a, side) }
  })
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
      stubs: stubsOf(e, src, tgt, band.picks),
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
    return { edgeId: e.edgeId, skel: corr.skel, route: 'corridor', lane: corr.lane, stubExcluded: ends, stubs: stubsOf(e, src, tgt, corr.picks) }
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
  const picks: ReadonlyArray<[string, Side, number]> = [
    [e.sourceId, pf.side, pf.slot],
    [e.targetId, pg.side, pg.slot]
  ]
  commit(picks)
  return {
    edgeId: e.edgeId,
    skel: [pf.pt, faS, { x: fx, y: faS.y }, { x: fx, y: fbS.y }, fbS, pg.pt],
    route: 'fallback',
    lane: -1,
    stubExcluded: ends,
    stubs: stubsOf(e, src, tgt, picks)
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
  assignStages([r], snap) // [F-ROUTE-02 U3] 单边数组接线=与 routeAll 同型
  const all = allObstacles(snap) // [C2·P7] 曲化复检障碍集同源（含 yearHeads）
  return { edgeId: r.edgeId, d: finish(r.skel, r.stubExcluded, all, r.route === 'manual-override'), route: r.route, lane: r.lane, pts: r.skel }
}

/** [F-ROUTE-02 U3] 分配接线（routeEdge/routeAll 同型）：routeOne 产物投影
 *  AssignEdge[]（band 族字段透传——残余子 pass 域输入）+桩段 Map（仅三态
 *  边入 Map）→slotAssign（槽位分配+Z 形施加+残余子 pass）→回写 skel；
 *  corridor/fallback/manual-override 边经 ROUTE_ELIGIBLE 门自动跳过；端点
 *  缺失边（skel=[]）经 rebuildPts len<2 原样透传；锚端不变性=残余含端迁移
 *  只动行进电平顶点（锚 y 恒≠bandY 构造性），finish 链零改动。slotAssign
 *  返回=输入序同长（slots.ts edges.map 契约——a7 字典序仅内部处理序，索引
 *  经分边数组承载）——回写按位对齐由此成立 */
function assignStages(results: SkelResult[], snap: LayoutSnapshot): void {
  const stubs = new Map<string, ReadonlyArray<{ a: Pt; b: Pt }>>()
  const inputs: AssignEdge[] = results.map((r) => {
    if (r.stubs !== undefined) stubs.set(r.edgeId, r.stubs)
    return { edgeId: r.edgeId, route: r.route, pts: r.skel, bandY: r.bandY, bandS: r.bandS, bandCap: r.bandCap, xLo: r.xLo, xHi: r.xHi }
  })
  slotAssign(inputs, snap, stubs).forEach((a, i) => {
    results[i]!.skel = a.pts
  })
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
  assignStages(results, snap) // [F-ROUTE-02 U3] 槽位+残余施加（旧 applyBandLanes 退役迁 residual.ts）
  const all = allObstacles(snap) // [C2·P7] 曲化复检障碍集同源（含 yearHeads）
  return results.map((r) => ({
    edgeId: r.edgeId,
    d: finish(r.skel, r.stubExcluded, all, r.route === 'manual-override'),
    route: r.route,
    lane: r.lane,
    pts: r.skel
  }))
}
