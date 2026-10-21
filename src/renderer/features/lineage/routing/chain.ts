/**
 * [F-SLOTGRID-01 U2] chain —— 甲链五态编排（设计 v1.4 §5.3 链序：
 * direct→h-slip→detour→band→overlap 单向不回溯+manual-override；右缘走廊
 * 两态+走廊常量族+车道基道序号随走廊彻底退役删除——2026-10-07 用户裁决③
 * 「corridor 右缘车道彻底退役、兜底=最短路线重叠」）。**链序本身=拐弯数
 * 升序（direct/h-slip 0 拐→detour 门形
 * →band 阶梯→overlap 不避让）——用户裁决「形态上尽量少拐弯」由链序+候选
 * 全序拐弯数键双层承载**。同锚多边先散锚点（12 锚全满=共享原锚）；detour
 * 通道槽占用经 ChannelUse 槽位级空槽判定。曲化后采样复检+半径收缩链
 * （r=6→3→尖角）。确定性红线：无随机/无 Date/无三角函数；并列取字典序/
 * 几何序。纯函数零 DOM import（快照采集驻 EdgeOverlay hook 层）。
 * [F-ROUTE-02 U3] 接线沿承：routeOne 循环→slotAssign（槽位分配+残余子
 * pass）→回写 skel→finish；detour/band 骨架携桩段（stubs）入谓词复检。
 */
import { AnchorUse, anchorId, anchorPick, anchorPoint, selectAnchor, sideAnchor, stubEnd, type Pt, type Rect, type Side } from './anchors'
import { bandSkeleton } from './bands'
import { PAD, polylineClearStubs } from './avoid'
import { ChannelUse, detourSkeleton } from './detour'
import { buildRoundedPath, stripCollinear } from './rounding'
import { slotAssign, type AssignEdge } from './slots'
import type { LineageAnchor, LineageViaPoint } from '@shared/models/lineage'

export type { Pt, Rect } from './anchors'

export type RouteTag = 'direct' | 'h-slip' | 'detour' | 'band' | 'overlap' | 'manual-override'
export interface MonthFrame extends Rect {
  year: number | null
}
export interface LayoutSnapshot {
  cards: ReadonlyMap<string, Rect>
  labels: Rect[]
  frames: MonthFrame[]
  /** [F-UIRES-03 C2·P7] 年份头障碍集（.tl-year-num/.tl-year-meta rects——buildSnapshot
   *  采集；避让 PAD 同源 avoid.PAD 不另设） */
  yearHeads: Rect[]
  /** [F-DETOURW-01] 首月框内容盒宽归一化值（buildSnapshot 经 readFrameContentWidth
   *  单源采集——布局 useCapacityLayout/拖拽 card-drag-session/走线 detour 三域
   *  合流 INV-169②；0=unmeasured——走线零通道守卫，与布局全卡首行降级同族）。
   *  原 corridor 时代透出残留（content 容器宽）语义随本票退役 */
  contentW: number
}

/** [F-UIRES-03 C2·P7] 障碍集组装单源（三源并集=全部卡∪月标注∪年份头——
 *  [F-SLOTGRID-01 U2 用户裁决①] 空卡位区非障碍（空卡片可以随意穿）；manual-
 *  override 边不消费本集〔via 在场不避让，现状语义沿承〕） */
export function allObstacles(snap: LayoutSnapshot): Rect[] {
  return [...snap.cards.values(), ...snap.labels, ...snap.yearHeads]
}
/** [F-LGRAPH-01②U8] kind/subId 随四值体系退役（路由几何不消费线型——纯结构面）。
 *  [F-VISFB-66] 端点钉定锚扩面（设计书 §F）：fromAnchor/toAnchor 提供=该端
 *  用户钉定（路由端点直取不散开；routeAll 会话内预注册占用）——缺省/undefined
 *  =未钉定=现行派生（N-01：全 NULL 图路由输出与基线全等） */
export interface EdgeGeomInput {
  edgeId: string
  sourceId: string
  targetId: string
  via?: LineageViaPoint[]
  fromAnchor?: LineageAnchor
  toAnchor?: LineageAnchor
}
export interface RoutedPath {
  edgeId: string
  d: string
  route: RouteTag
  /** [F-ROUTE-02 U4] 观测钩子三槽（主控预裁定语义）：slotMarks=recs 中非
   *  残余且有 slotIdx 者「cellId:slotIdx」逗号连接（retain+landed 都占槽）；
   *  overlapExempt=任一 rec.overlapExempt∨overlap 兜底态；slotFallback=存在
   *  L3 穷尽豁免 rec。均缺省=无该态 */
  pts: Pt[]
  slotMarks?: string
  overlapExempt?: boolean
  slotFallback?: boolean
  /** [F-ANCHFIX-01 批 1c] 锚占用观测串（生效 picks→anchorId 逗号连接——纯观测零行为变，INV-120）。均缺省=无透出 */
  anchorMarks?: string
  /** [F-SLOTGRID-01 U2] detour 被阻段观测串（「槽位 x:Δx」逗号连接——设计
   *  §5.3-⑦ 观测步；INV-120 面沿用）。缺省=非 detour 态 */
  detourMarks?: string
}

const ROUND_R = 6

// ── 内部中间态（routeOne 循环→slotAssign 施加后产 d）──
interface SkelResult {
  edgeId: string
  skel: Pt[]
  route: RouteTag
  stubExcluded: Rect[]
  /** [F-ROUTE-02 U3] 桩段（骨架外法线 10px——Z 拐点禁入域；与骨架顶点按构造
   *  全等：detour/band 出桩/终落；direct/h-slip/manual-override/overlap 骨架
   *  无桩顶点=缺省） */
  stubs?: ReadonlyArray<{ a: Pt; b: Pt }>
  /** 带车道 pass 输入（非带路由缺省） */
  bandY?: number
  bandS?: number
  bandCap?: number
  xLo?: number
  xHi?: number
  /** [F-ROUTE-02 U4] 观测钩子三槽（slotAssign recs 投影——assignStages 填） */
  slotMarks?: string
  overlapExempt?: boolean
  slotFallback?: boolean
  /** [F-ANCHFIX-01 批 1c] 锚占用观测串（SkelResult 中转——routeOne 填） */
  anchorMarks?: string
  /** [F-SLOTGRID-01 U2] detour 被阻段观测串（routeOne 填） */
  detourMarks?: string
}

const center = (r: Rect): Pt => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 })

/**
 * [F-VISFB-66] 钉定端直取（禁动——设计书 §F F1a）：anchorPoint 几何直取，
 * 不经 pick（散开永不迁移钉定锚）；routeAll 阶段 0 已 pin 预注册（他边避让）。
 */
const pinnedPick = (r: Rect, a: LineageAnchor): { pt: Pt; side: Side; slot: number } => ({
  pt: anchorPoint(r, a.side, a.slot),
  side: a.side,
  slot: a.slot
})

/** [F-ANCHFIX-01 批 1c] picks→anchorMarks 观测串（显示真值=线视觉落点） */
const anchorMarksOf = (picks: ReadonlyArray<[string, Side, number]>): string =>
  picks.map(([id, side, slot]) => anchorId(id, side, slot)).join(',')

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
  onWarn: (m: string) => void,
  use: AnchorUse | undefined,
  chanUse: ChannelUse
): SkelResult {
  const obstacles = allObstacles(snap) // [C2·P7] 三源并集单源（含 yearHeads）
  const ends = [src, tgt]
  const cards = [...snap.cards.values()]
  const sc = center(src)
  const tc = center(tgt)
  // [F-VISFB-66] 钉定端（W-04 优先级=钉定＞主向定边规则——各端独立判，混合
  // 边成立；NULL 端 manual 派生锚不注册 AnchorUse 不散开——现行「manual-
  // override 不 commit」沿承 N-05r2）
  const fromPin = e.fromAnchor !== undefined ? pinnedPick(src, e.fromAnchor) : undefined
  const toPin = e.toAnchor !== undefined ? pinnedPick(tgt, e.toAnchor) : undefined
  // manual-override：via 在场（锚=端点卡按主向定边规则定；不参与避让/车道）
  if (e.via !== undefined && e.via.length > 0) {
    const a = fromPin ?? selectAnchor(src, e.via[0]!)
    const b = toPin ?? selectAnchor(tgt, e.via[e.via.length - 1]!)
    // [F-ANCHFIX-01 批 1c] 不 commit（散开语义零变）——anchorMarks 从
    // 实际取数（钉定/规则）派生计入（显示真值：线视觉落在该锚）
    return { edgeId: e.edgeId, skel: [a.pt, ...e.via, b.pt], route: 'manual-override', stubExcluded: [], anchorMarks: `${anchorId(e.sourceId, a.side, a.slot)},${anchorId(e.targetId, b.side, b.slot)}` }
  }
  const commit = (picks: ReadonlyArray<[string, Side, number]>): void => {
    for (const [id, side, slot] of picks) use?.commit(id, side, slot)
  }
  // ① direct：主向竖向对齐直连（锚 x 相等单竖段）——钉定端直取（禁动）
  const sa = selectAnchor(src, tc)
  const sb = selectAnchor(tgt, sc)
  const pa = fromPin ?? anchorPick(e.sourceId, src, sa.side, sa.slot, use)
  const pb = toPin ?? anchorPick(e.targetId, tgt, sb.side, sb.slot, use)
  const aPt = pa.pt
  const bPt = pb.pt
  // [RR1 N12 防御] 生效锚恒竖侧才入 detour：AnchorUse 散开可迁横边锚（左/
  //  右）——横边锚桩 aS.x≠x₀（外法线水平伸 10px）生对角线骨架；散开迁横
  //  边=detour 前置废→band/overlap 承接（12 锚域内零死角）
  if (isVerticalSide(sa.side) && isVerticalSide(sb.side) && aPt.x === bPt.x && isVerticalSide(pa.side) && isVerticalSide(pb.side)) {
    if (polylineClearStubs([aPt, bPt], ends, obstacles)) {
      const picks: ReadonlyArray<[string, Side, number]> = [
        [e.sourceId, pa.side, pa.slot],
        [e.targetId, pb.side, pb.slot]
      ]
      commit(picks)
      return { edgeId: e.edgeId, skel: [aPt, bPt], route: 'direct', stubExcluded: ends, anchorMarks: anchorMarksOf(picks) }
    }
    // ③ detour：同柱（x_s=x_t=x₀）受阻近绕专态（段式七步——detour.ts；门形
    // 4 拐；候选枚举尽/预算超限→null 降 ④ band）
    const dt = detourSkeleton(e.sourceId, e.targetId, pa, pb, snap, obstacles, ends, chanUse, e.edgeId)
    if (dt !== null) {
      commit(dt.picks)
      return { edgeId: e.edgeId, skel: dt.skel, route: 'detour', stubExcluded: ends, stubs: stubsOf(e, src, tgt, dt.picks), anchorMarks: anchorMarksOf(dt.picks), detourMarks: dt.detourMarks }
    }
  }
  // ② h-slip：近侧水平直连（x 带分离——单段直线，y 异高斜向允许）——钉定
  //  端直取（禁动——钉定锚即端点几何，规则侧边仅未钉定端参与）
  if (src.x + src.w + 2 * PAD < tgt.x || tgt.x + tgt.w + 2 * PAD < src.x) {
    const ha = sideAnchor(src, tc.x > sc.x ? 'right' : 'left', tc)
    const hb = sideAnchor(tgt, sc.x > tc.x ? 'right' : 'left', sc)
    const ph = fromPin ?? anchorPick(e.sourceId, src, ha.side, ha.slot, use)
    const qh = toPin ?? anchorPick(e.targetId, tgt, hb.side, hb.slot, use)
    const aH = ph.pt
    const bH = qh.pt
    if (polylineClearStubs([aH, bH], ends, obstacles)) {
      const picks: ReadonlyArray<[string, Side, number]> = [
        [e.sourceId, ph.side, ph.slot],
        [e.targetId, qh.side, qh.slot]
      ]
      commit(picks)
      return { edgeId: e.edgeId, skel: [aH, bH], route: 'h-slip', stubExcluded: ends, anchorMarks: anchorMarksOf(picks) }
    }
  }
  // ④ band：通用态（x 不对齐/多带 zigzag——段全集尽或无槽 return null；
  //  [RR1 W3] 通道槽占用经 chanUse 与 detour 跨态共享；[F-VISFB-66] 钉定端
  //  透传——源端直取/终落钉定锚优先（几何检查不过=band 不可用降 overlap 兜底））
  const band = bandSkeleton(src, tgt, tc.y >= sc.y, snap, obstacles, cards, use, chanUse, e.sourceId, e.targetId, e.edgeId, fromPin, toPin)
  if (band !== null && polylineClearStubs(band.skel, ends, obstacles)) {
    commit(band.picks)
    return {
      edgeId: e.edgeId,
      skel: band.skel,
      route: 'band',
      stubExcluded: ends,
      stubs: stubsOf(e, src, tgt, band.picks),
      bandY: band.laneY,
      bandS: band.s,
      bandCap: Math.max(1, band.cap),
      xLo: Math.min(...band.skel.map((p) => p.x)),
      xHi: Math.max(...band.skel.map((p) => p.x)),
      anchorMarks: anchorMarksOf(band.picks)
    }
  }
  // ⑤ overlap 兜底：最短路线+忽略占用+overlapExempt 透出（设计 §2 overlap
  //  行——x_s≠x_t 时 L 形先横后竖〔H<V 字典序 tie-break〕；确定性红线=形态
  //  唯一，无随机；C 桥触发器观测面=overlapExempt 占比）
  const picks: ReadonlyArray<[string, Side, number]> = [
    [e.sourceId, pa.side, pa.slot],
    [e.targetId, pb.side, pb.slot]
  ]
  commit(picks)
  const skel: Pt[] = aPt.x === bPt.x ? [aPt, bPt] : [aPt, { x: bPt.x, y: aPt.y }, bPt]
  return { edgeId: e.edgeId, skel, route: 'overlap', stubExcluded: ends, anchorMarks: anchorMarksOf(picks), overlapExempt: true }
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
    return { edgeId: e.edgeId, d: '', route: 'overlap', pts: [], overlapExempt: true }
  }
  const r = routeOne(e, snap, src, tgt, onWarn, undefined, new ChannelUse())
  assignStages([r], snap) // [F-ROUTE-02 U3] 单边数组接线=与 routeAll 同型
  const all = allObstacles(snap) // [C2·P7] 曲化复检障碍集同源（含 yearHeads）
  return toPath(r, all)
}

/** [F-ROUTE-02 U3] 分配接线（routeEdge/routeAll 同型）：routeOne 产物投影
 *  AssignEdge[]（band 族字段透传——残余子 pass 域输入）+桩段 Map（detour/
 *  band 边入 Map）→slotAssign（槽位分配+Z 形施加+残余子 pass）→回写 skel；
 *  overlap（忽略占用终态——槽位无意义）/manual-override（用户排位主权）
 *  边经 ROUTE_ELIGIBLE 门自动跳过；端点缺失边（skel=[]）经 rebuildPts
 *  len<2 原样透传；锚端不变性=残余含端迁移只动行进电平顶点，finish 链
 *  零改动。slotAssign 返回=输入序同长——回写按位对齐由此成立。
 *  [F-ROUTE-02 U4] recs 诊断面投影入 SkelResult（观测字段单源） */
function assignStages(results: SkelResult[], snap: LayoutSnapshot): void {
  const stubs = new Map<string, ReadonlyArray<{ a: Pt; b: Pt }>>()
  const inputs: AssignEdge[] = results.map((r) => {
    if (r.stubs !== undefined) stubs.set(r.edgeId, r.stubs)
    return { edgeId: r.edgeId, route: r.route, pts: r.skel, bandY: r.bandY, bandS: r.bandS, bandCap: r.bandCap, xLo: r.xLo, xHi: r.xHi }
  })
  slotAssign(inputs, snap, stubs).forEach((a, i) => {
    const r = results[i]!
    r.skel = a.pts
    const marks = a.recs.filter((x) => !x.residual && x.slotIdx !== undefined).map((x) => `${x.cellId}:${x.slotIdx}`)
    if (marks.length > 0) r.slotMarks = marks.join(',')
    if (a.recs.some((x) => x.overlapExempt)) r.overlapExempt = true
    if (a.recs.some((x) => x.overlapExempt && !x.residual && x.slotIdx === undefined)) r.slotFallback = true
  })
}

const toPath = (r: SkelResult, all: readonly Rect[]): RoutedPath => ({
  edgeId: r.edgeId,
  d: finish(r.skel, r.stubExcluded, all, r.route === 'manual-override'),
  route: r.route,
  pts: r.skel,
  ...(r.slotMarks !== undefined ? { slotMarks: r.slotMarks } : {}),
  ...(r.overlapExempt === true ? { overlapExempt: true } : {}),
  ...(r.slotFallback === true ? { slotFallback: true } : {}),
  ...(r.anchorMarks !== undefined ? { anchorMarks: r.anchorMarks } : {}),
  ...(r.detourMarks !== undefined ? { detourMarks: r.detourMarks } : {})
})

export function routeAll(
  edges: readonly EdgeGeomInput[],
  snap: LayoutSnapshot,
  onWarn: (m: string) => void = () => undefined
): RoutedPath[] {
  const use = new AnchorUse()
  const chanUse = new ChannelUse()
  // [F-VISFB-66] 阶段 0 钉定预注册（§F F1a——按输入边序）：钉定锚先占集
  //（他边未钉定端 pick 避让）；阶段 1 routeOne 钉定端直取不散开（共享同锚）
  for (const e of edges) {
    if (e.fromAnchor !== undefined) use.pin(e.sourceId, e.fromAnchor.side, e.fromAnchor.slot)
    if (e.toAnchor !== undefined) use.pin(e.targetId, e.toAnchor.side, e.toAnchor.slot)
  }
  const results = edges.map((e) => {
    const src = snap.cards.get(e.sourceId)
    const tgt = snap.cards.get(e.targetId)
    if (src === undefined || tgt === undefined) {
      onWarn(`lineage-routing：边 ${e.edgeId} 端点卡缺失（${e.sourceId}/${e.targetId}），跳过路由`)
      return { edgeId: e.edgeId, skel: [] as Pt[], route: 'overlap' as RouteTag, stubExcluded: [] as Rect[], overlapExempt: true }
    }
    return routeOne(e, snap, src, tgt, onWarn, use, chanUse)
  })
  assignStages(results, snap) // [F-ROUTE-02 U3] 槽位+残余施加（旧 applyBandLanes 退役迁 residual.ts）
  const all = allObstacles(snap) // [C2·P7] 曲化复检障碍集同源（含 yearHeads）
  return results.map((r) => toPath(r, all))
}
