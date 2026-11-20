/**
 * [F-LANEGRID-01 B2a] chain —— 走线编排薄层（设计稿
 * docs/design/2026-11-19_f-lanegrid01-design.md §3.1 输入与边序/§3.3
 * AnchorUse 重建/§4 端点接驳/§6.3 载入占用）。六态链（direct/h-slip/
 * detour/band/outer-ring/overlap）与槽位/残余/Z 施加构线器已随 B2b 删除
 * （替代承载=分配器 routing/allocate.ts+车道表 grid.ts+段级占用
 * occupancy.ts）。编排序：
 * 0. AnchorUse 重建（§3.3）：输入边钉定锚全量预注册（输入序）→ carried
 *    边 anchorMarks 回放 commit（集外边锚占用固定）→ 重排边按序 pick/commit；
 * 1. 车道表 buildLaneTable（布局派生——边集变化不重建，裁决②）+段级占用表：
 *    carried 边 pts 逐段预登记（§6.3 集外不动：早到重排边避让晚到固定边）；
 * 2. 逐边（输入序=DB created_at,rowid 沿承）：端点缺失防御早退（route='grid'
 *    空路径+overlapExempt+blocked）→ manual-override 早退（via 折线；〔B3b
 *    §11-1 甲〕锚占用 commit+净空段登记 LaneOccupancy——后续自动边避让，
 *    manual 自身永不被占用阻塞/manual-manual 叠线放行；终门第三方集沿承）
 *    → 自动边：锚选择机制整体沿承（§4：钉定
 *    pin 直取禁动/selectAnchor 主向定边/AnchorUse 散开/12 满共享原锚）→
 *    allocateEdge 单边分配（错峰指派 i=同源锚已到边计数，§3.3）→ 段登记+
 *    错峰计数 → finalize 终门（r=6→3→0 防御层沿承，INV-79：blocked=空 d
 *    数据保留净空恢复自动重试）。
 * RouteTag 单态化：自动态一律 'grid'（含端点缺失空路径投影）；观测面
 * laneMarks（占道段「轴+坐标:起-止」逗号串）/overlapSpans=allocate 产出。
 * 确定性红线：无随机/无 Date/无三角函数；(edges, snap, carried) 恒同输出。
 * 纯函数零 DOM import（快照采集驻 edge-overlay-geom）。
 */
import {
  AnchorUse,
  anchorId,
  anchorPick,
  anchorPoint,
  parseAnchorId,
  selectAnchor,
  type PickedAnchor,
  type Pt,
  type Rect
} from './anchors'
import { allocateEdge, laneMarkOf } from './allocate'
import { CELL_EPS, buildLaneTable } from './grid'
import { finalizePath, type RouteClearance } from './finalize'
import { LaneOccupancy } from './occupancy'
import type { LineageAnchor, LineageViaPoint } from '@shared/models/lineage'

export type { Pt, Rect } from './anchors'

export type RouteTag = 'grid' | 'manual-override'
export interface MonthFrame extends Rect {
  year: number | null
  /** [F-LANEGRID-01 B2a §6.1] 帧身份键（DOM data-frame-key 采集；缺席=null——B3 帧差分消费） */
  frameKey: string | null
}
export interface LayoutSnapshot {
  cards: ReadonlyMap<string, Rect>
  labels: Rect[]
  frames: MonthFrame[]
  /** [F-UIRES-03 C2·P7] 年份头障碍集（.tl-year-num/.tl-year-meta rects——buildSnapshot
   *  采集；避让 PAD 同源 avoid.PAD 不另设） */
  yearHeads: Rect[]
  /** [F-DETOURW-01] 首月框内容盒宽归一化值（readFrameContentWidth 单源采集——
   *  布局/拖拽/走线三域合流 INV-169②；0=unmeasured——走线零通道守卫） */
  contentW: number
  /** [F-LANEGRID-01 B2a §6.1] 内容盒高（.tl-content 高÷s_eff——车道 y 域上界与
   *  外区带锚定源；0/非有限=退化防御：外区带空、横道族滤尽、自动边 blocked
   *  承接〔B2b 起必填——缺席即防御态〕） */
  contentH: number
  /** [F-LANEGRID-01 B2a §6.1] 卡→帧身份键映射（卡 DOM closest('.month-frame')→
   *  data-frame-key；空映射不崩——B3 帧差分消费） */
  cardFrame: ReadonlyMap<string, string | null>
}

/** [F-UIRES-03 C2·P7] 障碍集组装单源（三源并集=全部卡∪月标注∪年份头——
 *  [F-SLOTGRID-01 U2 用户裁决①] 空卡位区非障碍（空卡片可以随意穿）；manual-
 *  override 边终门同检本集的第三方子集〔[R2-C3] via 折线碰障=blocked 空 d
 *  ——承接合同，不参与重排的现行语义不变〕） */
export function allObstacles(snap: LayoutSnapshot): Rect[] {
  return [...snap.cards.values(), ...snap.labels, ...snap.yearHeads]
}
/** [F-LGRAPH-01②U8] kind/subId 随四值体系退役（路由几何不消费线型——纯结构面）。
 *  [F-VISFB-66] 端点钉定锚扩面：fromAnchor/toAnchor 提供=该端用户钉定（路由
 *  端点直取不散开；routeAll 会话内预注册占用）——缺省/undefined=未钉定=现行
 *  派生（N-01：全 NULL 图路由输出与基线全等） */
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
  pts: Pt[]
  /** [F-LANEGRID-01 B2a] 占道段观测串（laneMarkOf「轴+坐标:起-止」逗号连接——
   *  INV-117/120 观测位〔旧 slotMarks 已随六态退役删除〕；manual-override 段
   *  照常登记占用〔B3b §11-1 甲〕但不产出观测串=缺省） */
  laneMarks?: string
  /** [F-LANEGRID-01 B2a] 段级冲突区间串列（§3.4 溢出/§3.3 错峰复用登记——
   *  provenance；非空 ⟹ overlapExempt=true） */
  overlapSpans?: string[]
  overlapExempt?: boolean
  /** [F-ANCHFIX-01 批 1c] 锚占用观测串（生效锚→anchorId 逗号连接——显示真值
   *  =线视觉落点，INV-120）。均缺省=无透出 */
  anchorMarks?: string
  /** 自动路径三个半径的最终采样均碰障；d 恒空，渲染层与命中层均撤销 */
  clearance?: RouteClearance
}

const center = (r: Rect): Pt => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 })

/** [F-VISFB-66] 钉定端直取（禁动——设计书 §F F1a）：anchorPoint 几何直取，
 * 不经 pick（散开永不迁移钉定锚）；routeAll 阶段 0 已 pin 预注册（他边避让） */
const pinnedPick = (r: Rect, a: LineageAnchor): PickedAnchor => ({
  pt: anchorPoint(r, a.side, a.slot),
  side: a.side,
  slot: a.slot
})

/** 生效锚对→anchorMarks 观测串（源端+目标端） */
const anchorMarksOf = (srcId: string, pa: PickedAnchor, tgtId: string, pb: PickedAnchor): string =>
  `${anchorId(srcId, pa.side, pa.slot)},${anchorId(tgtId, pb.side, pb.slot)}`

/** carried 边锚回放：anchorMarks token→AnchorUse commit（parseAnchorId 域外
 * token 静默跳过——防御旧观测串；§3.3 重建规程第 1 步） */
function replayAnchors(use: AnchorUse, carried: ReadonlyArray<RoutedPath>): void {
  for (const c of carried) {
    if (c.anchorMarks === undefined || c.anchorMarks === '') continue
    for (const tok of c.anchorMarks.split(',')) {
      const a = parseAnchorId(tok)
      if (a !== null) use.commit(a.cardId, a.side, a.slot)
    }
  }
}

/** pts 轴对齐段→占用表登记（对角/零长残段防御跳过；登记坐标=两端均值——
 *  与 allocate.segsOf 同坍缩口径）。消费两面：carried 集外边段预登记（§6.3
 *  只读固定）+manual 边段登记（[F-LANEGRID-01 B3b §11-1 甲]——供后续自动
 *  边避让；manual 观测标记随段透传） */
function registerSegments(occ: LaneOccupancy, pts: readonly Pt[], owner: string, manual = false): void {
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i - 1]!
    const q = pts[i]!
    const dx = Math.abs(q.x - p.x)
    const dy = Math.abs(q.y - p.y)
    const flag = manual ? { manual: true } : {}
    if (dx <= CELL_EPS && dy > CELL_EPS) {
      occ.register({ axis: 'v', coord: (p.x + q.x) / 2, span: { lo: Math.min(p.y, q.y), hi: Math.max(p.y, q.y) }, owner, ...flag })
    } else if (dy <= CELL_EPS && dx > CELL_EPS) {
      occ.register({ axis: 'h', coord: (p.y + q.y) / 2, span: { lo: Math.min(p.x, q.x), hi: Math.max(p.x, q.x) }, owner, ...flag })
    }
  }
}

/** carried 边段预登记（§6.3——manual carried 段随 route 标记；〔B3 回炉⑤〕
 *  blocked manual 段跳过=不可见线不占道（伪 overlapSpans 绝源；锚回放保留
 *  ——blocked 只撤销线条不删锚数据语义沿承）；blocked grid pts 恒空自然无段） */
function replaySegments(occ: LaneOccupancy, carried: ReadonlyArray<RoutedPath>): void {
  for (const c of carried) {
    if (c.route === 'manual-override' && c.clearance === 'blocked') continue
    registerSegments(occ, c.pts, c.edgeId, c.route === 'manual-override')
  }
}

/**
 * 单边编排（routeAll 内体）：端点防御→manual 早退→锚选择→分配→登记→终门。
 * blocked 语义（§3.4 收窄）：分配器无解（端点封死族/布局性不可达）或终门
 * 三档均碰障——d=''、clearance='blocked'，anchorMarks/laneMarks 照透出
 * （锚已占、边数据保留，INV-79）。
 */
function routeOne(
  e: EdgeGeomInput,
  snap: LayoutSnapshot,
  all: readonly Rect[],
  use: AnchorUse,
  occ: LaneOccupancy,
  lanes: ReturnType<typeof buildLaneTable>,
  stubSeq: Map<string, number>,
  onWarn: (m: string) => void
): RoutedPath {
  const src = snap.cards.get(e.sourceId)
  const tgt = snap.cards.get(e.targetId)
  if (src === undefined || tgt === undefined) {
    onWarn(`lineage-routing：边 ${e.edgeId} 端点卡缺失（${e.sourceId}/${e.targetId}），跳过路由`)
    return { edgeId: e.edgeId, d: '', route: 'grid', pts: [], overlapExempt: true, clearance: 'blocked' }
  }
  const fromPin = e.fromAnchor !== undefined ? pinnedPick(src, e.fromAnchor) : undefined
  const toPin = e.toAnchor !== undefined ? pinnedPick(tgt, e.toAnchor) : undefined
  // manual-override 早退：via 在场（锚=端点卡按主向定边规则定/钉定直取）。
  // [F-LANEGRID-01 B3b §11-1 甲] manual 线入网格——锚占用 commit（与 carried
  // 回放对称：后续未钉定边散开避让）+净空路径段登记 LaneOccupancy（后续
  // **自动**边避让；manual 边自身永不被占用阻塞——manual-manual 叠线放行
  // =裁决甲承诺域；blocked 态不登记=不可见线不占道）。终门同检第三方集
  // （源/目标卡豁免——R2-C3 沿承：新 via 由提交门先行拦截，本门承接旧 via
  // 兜底）
  if (e.via !== undefined && e.via.length > 0) {
    const a = fromPin ?? selectAnchor(src, e.via[0]!)
    const b = toPin ?? selectAnchor(tgt, e.via[e.via.length - 1]!)
    use.commit(e.sourceId, a.side, a.slot)
    use.commit(e.targetId, b.side, b.slot)
    const skel: Pt[] = [a.pt, ...e.via, b.pt]
    const finalized = finalizePath(skel, [src, tgt], all.filter((o) => o !== src && o !== tgt))
    if (finalized.clearance === undefined) {
      registerSegments(occ, skel, e.edgeId, true)
      // 错峰计数对称（与 carried 预载/B3 replayStubSeq 同口径）：非直连 manual
      // 边计入同锚计数——后续同源锚自动边指派 i 与全图边序对齐
      if (skel.length > 2) {
        const key = `${e.sourceId}|${a.side}|${a.slot}`
        stubSeq.set(key, (stubSeq.get(key) ?? 0) + 1)
      }
    }
    return {
      edgeId: e.edgeId,
      d: finalized.d,
      route: 'manual-override',
      pts: skel,
      ...(finalized.clearance !== undefined ? { clearance: finalized.clearance } : {}),
      anchorMarks: anchorMarksOf(e.sourceId, a, e.targetId, b)
    }
  }
  // 自动边：锚选择（钉定直取/主向定边+AnchorUse 散开）→胜出即 commit（沿承：
  // 各终态分支均落记；blocked 边锚数据保留）
  const sa = selectAnchor(src, center(tgt))
  const sb = selectAnchor(tgt, center(src))
  const pa = fromPin ?? anchorPick(e.sourceId, src, sa.side, sa.slot, use)
  const pb = toPin ?? anchorPick(e.targetId, tgt, sb.side, sb.slot, use)
  use.commit(e.sourceId, pa.side, pa.slot)
  use.commit(e.targetId, pb.side, pb.slot)
  const marks = anchorMarksOf(e.sourceId, pa, e.targetId, pb)
  const out = allocateEdge(
    { src, srcAnchor: pa, tgt, tgtAnchor: pb, staggerIndex: stubSeq.get(`${e.sourceId}|${pa.side}|${pa.slot}`) ?? 0 },
    lanes,
    occ
  )
  if (out.status === 'blocked') {
    return { edgeId: e.edgeId, d: '', route: 'grid', pts: [], clearance: 'blocked', anchorMarks: marks }
  }
  for (const s of out.segs) {
    occ.register({ axis: s.axis, coord: s.coord, span: s.span, owner: e.edgeId, ...(s.stub ? { stub: true } : {}) })
  }
  if (!out.direct) {
    const key = `${e.sourceId}|${pa.side}|${pa.slot}`
    stubSeq.set(key, (stubSeq.get(key) ?? 0) + 1)
  }
  const finalized = finalizePath(out.pts, [src, tgt], all)
  return {
    edgeId: e.edgeId,
    d: finalized.d,
    route: 'grid',
    pts: out.pts,
    ...(finalized.clearance !== undefined ? { clearance: finalized.clearance } : {}),
    ...(out.segs.length > 0 ? { laneMarks: out.segs.map(laneMarkOf).join(',') } : {}),
    ...(out.overlapSpans.length > 0 ? { overlapSpans: out.overlapSpans, overlapExempt: true } : {}),
    anchorMarks: marks
  }
}

/**
 * carried 边错峰计数预载（§3.3 i=同锚已到边计数——[F-LANEGRID-01 B3]）：
 * 按 routeOne 增量口径（非 blocked ∧ 非直连——grid 与 manual 同计〔B3 回炉④：
 * manual carried 不回放则后继自动边增量与干净全算桩段不同〕）以 anchorMarks
 * 首令牌（源锚）回放 stubSeq，使集内同锚边的走廊指派与全图边序对齐（无预载
 * 则集内边取 i=0 撞集外边桩段）；直连/blocked/端点缺失防御态不计数。
 */
function replayStubSeq(stubSeq: Map<string, number>, carried: ReadonlyArray<RoutedPath>): void {
  for (const c of carried) {
    if (c.clearance !== undefined || c.pts.length <= 2) continue
    if (c.anchorMarks === undefined || c.anchorMarks === '') continue
    const a = parseAnchorId(c.anchorMarks.split(',')[0]!)
    if (a === null) continue
    const key = `${a.cardId}|${a.side}|${a.slot}`
    stubSeq.set(key, (stubSeq.get(key) ?? 0) + 1)
  }
}

/**
 * 全图（或重排集）路由。carried=集外边 RoutedPath 只读表（§6.3 载入占用，
 * [F-LANEGRID-01 B3] 帧差分接入）：其段预登记占用+anchorMarks 回放锚占用
 * +错峰计数预载；**边集含 carried 边时该边直通**（输出=carried 原值引用
 * ——集外不动逐字节契约；调用方传全集边+集外 carried 得全量 paths）——
 * 纯函数契约：给定 (edges, snap, carried) 恒同输出。
 */
export function routeAll(
  edges: readonly EdgeGeomInput[],
  snap: LayoutSnapshot,
  onWarn: (m: string) => void = () => undefined,
  carried: ReadonlyArray<RoutedPath> = []
): RoutedPath[] {
  const carriedById = new Map(carried.map((p) => [p.edgeId, p] as const))
  const use = new AnchorUse()
  // 阶段 0a 钉定预注册（输入边序——§4 F1a 沿承）；0b carried 锚回放（§3.3）
  for (const e of edges) {
    if (e.fromAnchor !== undefined) use.pin(e.sourceId, e.fromAnchor.side, e.fromAnchor.slot)
    if (e.toAnchor !== undefined) use.pin(e.targetId, e.toAnchor.side, e.toAnchor.slot)
  }
  replayAnchors(use, carried)
  // 阶段 1 车道表（布局派生）+占用表（carried 段预登记）
  const lanes = buildLaneTable({
    cards: [...snap.cards.values()],
    labels: snap.labels,
    yearHeads: snap.yearHeads,
    frames: snap.frames,
    contentH: snap.contentH
  })
  const occ = new LaneOccupancy()
  replaySegments(occ, carried)
  // 阶段 2 逐边（输入序）：carried 边直通（不重投影）；重排边同锚错峰计数
  // （首段指派 i）随编排序推进+carried 预载
  const stubSeq = new Map<string, number>()
  replayStubSeq(stubSeq, carried)
  const all = allObstacles(snap)
  return edges.map((e) => carriedById.get(e.edgeId) ?? routeOne(e, snap, all, use, occ, lanes, stubSeq, onWarn))
}

/**
 * [R2-C3] 提交门单边复算（谓词与 routeAll 同源——单边经同一编排体，空
 * AnchorUse/空占用起步；manual 分支锚 commit+净空段登记占用〔B3b §11-1 甲〕
 * ——单边与全图逐字节同构）。
 * [F-LANEGRID-01 B3 §7] carried=当前全图占用快照（via-only 单边重投影经
 * planRerun 接入——自动分支〔via 置空回自动〕在此消费占用避让）。
 */
export function routeEdge(
  e: EdgeGeomInput,
  snap: LayoutSnapshot,
  onWarn: (m: string) => void = () => undefined,
  carried: ReadonlyArray<RoutedPath> = []
): RoutedPath {
  return routeAll([e], snap, onWarn, carried)[0]!
}
