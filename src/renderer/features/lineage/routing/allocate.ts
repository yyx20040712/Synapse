/**
 * [F-LANEGRID-01 B2a] allocate —— 车道网格单边分配器（设计稿
 * docs/design/2026-11-19_f-lanegrid01-design.md §3：§3.2 最小拐弯确定性
 * 搜索/§3.3 同锚错峰与占用登记/§3.4 段级溢出；裁决④叠加/⑤少拐优先）。
 * 输入=锚选择产出的两端锚（chain.ts 编排层）+车道表（grid.ts，仅布局派生）
 * +段级占用表（occupancy.ts，只读——登记由编排层执行）；输出=折线 pts+
 * 占道段（登记/观测载体）+冲突区间串。算法合约：
 * - 0 拐直连（§3.2）：两锚同轴同车道线且相向、整长 ≥LANE_INSET——首末段
 *   即整条路径，不参与错峰、不查占用（共线冲突按 §3.4 语义经 overlapSpans
 *   登记，与现状「12 锚全满共享原锚」一致）；
 * - 首段=源锚外法线桩（长 ≥LANE_INSET，桩端=车道交点）：走廊存活道序列
 *   按 (i mod K) 指派（§3.3 错峰；i=编排层按边序传入的同锚计数）；走廊空
 *   （K=0）=全部存活交叉道自由枚举（防御分支）；桩段占用豁免（错峰桩区
 *   ——阻塞不判，实际冲突照记 overlapSpans）；
 * - 中段搜索=车道交点图 Dijkstra：状态=(交点, 来向车道轴)，代价向量
 *   (拐点数, 曼哈顿长度) 字典序，队列全序补 (y, x, 方向序=上0/下1/右2/左3)，
 *   settle-first-wins——确定性红线：无随机/无 Date/无三角函数；
 * - 末段=目标锚外法线桩（长 ≥LANE_INSET；占用参与阻塞，无豁免）；
 * - 段可行性=alive 覆盖 ∧（非桩段）占用无冲突；本边源/目标卡死区豁免仅
 *   首/末桩段 LANE_INSET 内（avoid.polylineClearStubs 同口径：两卡同豁免、
 *   第三方永不豁免）；
 * - 溢出（§3.4）：占用阻塞无解→忽略占用重跑（alive 恒生效）→产
 *   overlapSpans（「轴+坐标:起-止」段级 provenance）+边级 overlapExempt；
 *   忽略占用仍无解→blocked（端点封死族/布局性不可达——INV-79 合同沿承）。
 * 观测条目格式 laneMarkOf=`v76:90-100`（0.1 量化）。纯函数零 DOM import。
 */
import { type PickedAnchor, type Pt, type Rect } from './anchors'
// CELL_EPS/quant=grid 单源（量化域容差族——同柱直连/道身份/覆盖/堆比较消费）
import { CELL_EPS, LANE_INSET, LANE_PITCH, quant, type Interval, type Lane, type LaneTable } from './grid'
import { covered, crossAlive, directClear, stubClear } from './clearance'
import type { LaneOccupancy } from './occupancy'

type Axis = 'v' | 'h'
type Dir = 'up' | 'down' | 'left' | 'right'

/** 队列并列时的方向全序（§3.2「方向序」可执行定义：上0/下1/右2/左3） */
const DIR_ORDER: Record<Dir, number> = { up: 0, down: 1, right: 2, left: 3 }

/** 占道段（axis 轴·coord 车道坐标·span 行进跨距；stub=错峰桩区标记——编排层登记透传，B4 ⑥c 双重校验消费） */
export interface AllocSeg {
  axis: Axis
  coord: number
  span: Interval
  stub: boolean
}

/** 单边分配产物（status='blocked'=端点封死/布局不可达：pts/segs 空、不占道） */
export interface AllocateOutcome {
  status: 'ok' | 'blocked'
  direct: boolean
  pts: Pt[]
  segs: AllocSeg[]
  overlapSpans: string[]
}

/** 分配输入（锚=chain 锚选择胜出态；staggerIndex=同 (卡,锚) 已到边计数——§3.3 指派 i） */
export interface AllocateInput {
  src: Rect
  srcAnchor: PickedAnchor
  tgt: Rect
  tgtAnchor: PickedAnchor
  staggerIndex: number
}

/** 观测条目：「轴+坐标:起-止」（0.1 量化——laneMarks/overlapSpans 同格式单源） */
export const laneMarkOf = (seg: AllocSeg): string =>
  `${seg.axis}${r1(seg.coord)}:${r1(seg.span.lo)}-${r1(seg.span.hi)}`

const r1 = (n: number): number => Math.round(n * 10) / 10

/** 锚几何（axis=桩所在车道轴；sign=外法线符号；dir=外法线方向=首段行进方向） */
interface AnchorGeom {
  pt: Pt
  axis: Axis
  sign: 1 | -1
  dir: Dir
}

const geomOf = (p: PickedAnchor): AnchorGeom => {
  if (p.side === 'top') return { pt: p.pt, axis: 'v', sign: -1, dir: 'up' }
  if (p.side === 'bottom') return { pt: p.pt, axis: 'v', sign: 1, dir: 'down' }
  if (p.side === 'left') return { pt: p.pt, axis: 'h', sign: -1, dir: 'left' }
  return { pt: p.pt, axis: 'h', sign: 1, dir: 'right' }
}

/** 车道按坐标取道（CELL_EPS 容差〔grid 单源〕——锚点坐标浮点残差不蚀道身份） */
const laneAt = (lanes: readonly Lane[], coord: number): Lane | undefined =>
  lanes.find((l) => Math.abs(l.coord - coord) <= CELL_EPS)

/** 走廊存活道序列（§3.3 错峰指派域）：候选=锚定边±(LANE_INSET+LANE_PITCH·k) 逐 k 枚举，
 *  候选不在表=走廊尽（族间断链即止——行隙 7 道/左缘带 1 道口径）；死道（桩段不通或交点
 *  不可用）滤除不断链；空序列=自由枚举防御分支 */
function corridorLanes(lanes: LaneTable, a: AnchorGeom, aLane: Lane, own: readonly Rect[]): Lane[] {
  const perp = a.axis === 'v' ? lanes.h : lanes.v
  const anchorC = a.axis === 'v' ? a.pt.y : a.pt.x
  const crossC = a.axis === 'v' ? a.pt.x : a.pt.y
  const out: Lane[] = []
  for (let k = 0; ; k++) {
    const cand = quant(anchorC + a.sign * (LANE_INSET + k * LANE_PITCH))
    const lane = laneAt(perp, cand)
    if (lane === undefined) break
    if (stubClear(aLane, a.axis, anchorC, cand, own) && crossAlive(lane, crossC)) out.push(lane)
  }
  return out
}

/** 自由桩端枚举（K=0 防御）：外法线侧全部存活交叉道（距锚 ≥LANE_INSET） */
function freeStubStarts(
  lanes: LaneTable,
  a: AnchorGeom,
  aLane: Lane,
  own: readonly Rect[]
): Array<{ pt: Pt; len: number }> {
  const perp = a.axis === 'v' ? lanes.h : lanes.v
  const anchorC = a.axis === 'v' ? a.pt.y : a.pt.x
  const crossC = a.axis === 'v' ? a.pt.x : a.pt.y
  const out: Array<{ pt: Pt; len: number }> = []
  for (const lane of perp) {
    if ((lane.coord - anchorC) * a.sign < LANE_INSET - CELL_EPS) continue
    if (!stubClear(aLane, a.axis, anchorC, lane.coord, own) || !crossAlive(lane, crossC)) continue
    const pt = a.axis === 'v' ? { x: aLane.coord, y: lane.coord } : { x: lane.coord, y: aLane.coord }
    out.push({ pt, len: Math.abs(lane.coord - anchorC) })
  }
  return out
}

// ── 交点图 Dijkstra（§3.2）──────────────────────────────────────────────

/** 队列条目（优先级=(turns,len,y,x,dir) 全序；key/prev=数值状态键（拐点坐标
 *  =条目 x/y——重构期零额外分配） */
interface Entry {
  turns: number
  len: number
  y: number
  x: number
  dir: Dir
  key: number
  prev: number
}

function cmpEntry(a: Entry, b: Entry): number {
  if (a.turns !== b.turns) return a.turns - b.turns
  if (Math.abs(a.len - b.len) > CELL_EPS) return a.len - b.len
  if (Math.abs(a.y - b.y) > CELL_EPS) return a.y - b.y
  if (Math.abs(a.x - b.x) > CELL_EPS) return a.x - b.x
  return DIR_ORDER[a.dir] - DIR_ORDER[b.dir]
}

/** 最小堆（cmpEntry 全序——同输入恒同弹出序，确定性红线承载件；换位用
 *  临时变量——数组解构换位在 ~10⁵ 量级条目下产生临时分配热点） */
class MinHeap {
  private readonly a: Entry[] = []
  push(e: Entry): void {
    this.a.push(e)
    let i = this.a.length - 1
    while (i > 0) {
      const p = (i - 1) >> 1
      if (cmpEntry(this.a[p]!, this.a[i]!) <= 0) break
      const t = this.a[p]!
      this.a[p] = this.a[i]!
      this.a[i] = t
      i = p
    }
  }
  pop(): Entry | undefined {
    const top = this.a[0]
    const last = this.a.pop()
    if (this.a.length > 0 && last !== undefined) {
      this.a[0] = last
      let i = 0
      for (;;) {
        const l = 2 * i + 1
        const r = l + 1
        let m = i
        if (l < this.a.length && cmpEntry(this.a[l]!, this.a[m]!) < 0) m = l
        if (r < this.a.length && cmpEntry(this.a[r]!, this.a[m]!) < 0) m = r
        if (m === i) break
        const t = this.a[m]!
        this.a[m] = this.a[i]!
        this.a[i] = t
        i = m
      }
    }
    return top
  }
  get size(): number {
    return this.a.length
  }
}

/** 搜索上下文（useOcc=false=溢出重跑：占用不判、alive 恒生效；坐标→道
 *  索引映射与 nv/nh 供数值状态键——字符串拼接在 ~10⁵ 转移量级是热点）。
 *  [搜索域定义·F-LANEGRID-01 B2 回炉 B-1] lanes/vBy/hBy=**窗口搜索子表**：
 *  窗=两锚 bbox±SEARCH_WINDOW ∪ 边侧道族 ∪ 外区带族（grid.bands 界内族员
 *  恒置窗内——强制绕行族不被裁）∪ 桩端道/两锚道（corridor starts 与
 *  aLane/bLane 逐道并回）。窗内无解 → **全表重跑**（消灭窗剪枝假 blocked）。
 *  已知边界：窗内成功但全局更少拐走廊在窗外的理论态仍取窗内解——搜索域
 *  ≠全表的残余边界，B4 随设计 §3.2 补「搜索域=窗口规则」段呈裁 */
interface SearchPlan {
  lanes: LaneTable
  occ: LaneOccupancy
  useOcc: boolean
  own: readonly Rect[]
  a: AnchorGeom
  b: AnchorGeom
  aLane: Lane
  bLane: Lane
  nv: number
  nh: number
  vBy: ReadonlyMap<number, Lane>
  hBy: ReadonlyMap<number, Lane>
  /** 搜索期副作用标记：占用表是否真实拦截过候选段（false 时溢出重跑与首轮
   *  逐判定恒同——重跑可跳过的可靠依据） */
  occHit: boolean
}

/** [搜索域定义] 搜索窗口（两锚 bbox 外扩量——px；80=10 道步长：覆盖局部
 *  绕行到最近行隙/列隙道的合理域——强制绕行族另由 bands 恒置窗内；43 卡
 *  大夹具全表搜索的 ~10⁷ 转移量级降至 ~10⁴） */
const SEARCH_WINDOW = 80

/** 状态键（数值）：来向轴 v=0 区/h=nv·nh 区 + 竖道 id×nh+横道 id（交点图
 *  上界 |V|·|H|·2 ~10⁴——设计 §9 性能锚口径；GOAL/START 用负数保留位） */
const GOAL_KEY = -1
const START_KEY = -2

function stateKey(plan: SearchPlan, inAxis: Axis, vLane: Lane, hLane: Lane): number {
  return (inAxis === 'v' ? 0 : plan.nv * plan.nh) + vLane.id * plan.nh + hLane.id
}

/** 段可行性（中段/末桩共用）：alive 覆盖 ∧（useOcc 时）占用无冲突 */
function segOpen(plan: SearchPlan, lane: Lane, axis: Axis, lo: number, hi: number): boolean {
  if (!covered(lo, hi, lane.alive)) return false
  if (!plan.useOcc) return true
  if (plan.occ.conflicts(axis, lane.coord, { lo, hi })) {
    plan.occHit = true
    return false
  }
  return true
}

/** 状态扩张：来向轴垂直转向，沿转向道行进至任一交叉（直通=跳过中间交点的
 *  长转移；已 settle 状态不再入队——弹出端兜底之外的前置减流）。[性能锚]
 *  劣势条目先于段净空判定剪除（被支配候选的 segOpen 是长程边热点——剪除
 *  不改变 settle 胜者：劣势条目本会在弹出时被弃） */
function expand(
  plan: SearchPlan,
  st: { x: number; y: number; inAxis: Axis },
  base: Entry,
  heap: MinHeap,
  settled: ReadonlyMap<number, unknown>,
  pendingBest: ReadonlyMap<number, Entry>,
  push: (e: Entry) => void
): void {
  if (st.inAxis === 'v') {
    const hl = plan.hBy.get(st.y)
    if (hl === undefined) return
    const vl0 = plan.vBy.get(st.x)
    if (vl0 === undefined) return
    for (const vl of plan.lanes.v) {
      if (vl.id === vl0.id) continue
      const key = stateKey(plan, 'h', vl, hl)
      if (settled.has(key)) continue // [性能锚] settle 前置（段判定是热点）
      const cand: Entry = {
        turns: base.turns + 1,
        len: base.len + Math.abs(vl.coord - st.x),
        y: st.y,
        x: vl.coord,
        dir: vl.coord > st.x ? 'right' : 'left',
        key,
        prev: base.key
      }
      const cur = pendingBest.get(key)
      if (cur !== undefined && cmpEntry(cur, cand) <= 0) continue
      if (!segOpen(plan, hl, 'h', Math.min(st.x, vl.coord), Math.max(st.x, vl.coord))) continue
      push(cand)
    }
  } else {
    const vl = plan.vBy.get(st.x)
    if (vl === undefined) return
    const hl0 = plan.hBy.get(st.y)
    if (hl0 === undefined) return
    for (const hl of plan.lanes.h) {
      if (hl.id === hl0.id) continue
      const key = stateKey(plan, 'v', vl, hl)
      if (settled.has(key)) continue
      const cand: Entry = {
        turns: base.turns + 1,
        len: base.len + Math.abs(hl.coord - st.y),
        y: hl.coord,
        x: st.x,
        dir: hl.coord > st.y ? 'down' : 'up',
        key,
        prev: base.key
      }
      const cur = pendingBest.get(key)
      if (cur !== undefined && cmpEntry(cur, cand) <= 0) continue
      if (!segOpen(plan, vl, 'v', Math.min(st.y, hl.coord), Math.max(st.y, hl.coord))) continue
      push(cand)
    }
  }
}

/** 末桩转移：状态落目标锚道垂轴交点时转向入桩（占用参与阻塞；豁免=目标锚端 LANE_INSET） */
function goalEntry(plan: SearchPlan, st: { x: number; y: number; inAxis: Axis }, base: Entry): Entry | null {
  const push = (len: number, y: number, x: number, dir: Dir): Entry => ({
    turns: base.turns + 1,
    len: base.len + len,
    y,
    x,
    dir,
    key: GOAL_KEY,
    prev: base.key
  })
  if (plan.b.axis === 'v') {
    if (st.inAxis !== 'h' || Math.abs(st.x - plan.bLane.coord) > CELL_EPS) return null
    const y2 = st.y
    if ((y2 - plan.b.pt.y) * plan.b.sign <= 0) return null
    const len = Math.abs(y2 - plan.b.pt.y)
    if (len < LANE_INSET - CELL_EPS) return null
    if (!stubClear(plan.bLane, 'v', plan.b.pt.y, y2, plan.own)) return null
    if (plan.useOcc && plan.occ.conflicts('v', plan.bLane.coord, { lo: Math.min(y2, plan.b.pt.y), hi: Math.max(y2, plan.b.pt.y) })) {
      plan.occHit = true
      return null
    }
    return push(len, y2, st.x, y2 < plan.b.pt.y ? 'down' : 'up')
  }
  if (st.inAxis !== 'v' || Math.abs(st.y - plan.bLane.coord) > CELL_EPS) return null
  const x2 = st.x
  if ((x2 - plan.b.pt.x) * plan.b.sign <= 0) return null
  const len = Math.abs(x2 - plan.b.pt.x)
  if (len < LANE_INSET - CELL_EPS) return null
  if (!stubClear(plan.bLane, 'h', plan.b.pt.x, x2, plan.own)) return null
  if (plan.useOcc && plan.occ.conflicts('h', plan.bLane.coord, { lo: Math.min(x2, plan.b.pt.x), hi: Math.max(x2, plan.b.pt.x) })) {
    plan.occHit = true
    return null
  }
  return push(len, plan.b.pt.y, x2, x2 < plan.b.pt.x ? 'right' : 'left')
}

/** 单轮搜索：starts=桩端集（turns=0 计）；返回拐点列 [P1..Pk]（不含两端锚点），无解=null。
 *  [性能锚] pendingBest=每状态键在堆内的最优条目（cmpEntry 全序）：劣与恰等
 *  的后到条目皆不入堆（decrease-key 语义——劣条目本会在弹出时被弃；恰等并列
 *  =先到胜，旧堆内部序对恰等并列无既定承诺，等价性由 B2b 基线〔allocate 15
 *  例+金标+routing 手推例〕逐字节复核承载——大夹具重复条目 ~10²/键量级是
 *  长程边热点根因）。 */
function runSearch(plan: SearchPlan, starts: ReadonlyArray<{ pt: Pt; len: number }>): Pt[] | null {
  const heap = new MinHeap()
  const settled = new Map<number, { prev: number; x: number; y: number }>()
  const pendingBest = new Map<number, Entry>()
  const push = (e: Entry): void => {
    const cur = pendingBest.get(e.key)
    if (cur !== undefined && cmpEntry(cur, e) <= 0) return
    pendingBest.set(e.key, e)
    heap.push(e)
  }
  for (const s of starts) {
    const vl = plan.vBy.get(s.pt.x)
    const hl = plan.hBy.get(s.pt.y)
    if (vl === undefined || hl === undefined) continue
    push({
      turns: 0,
      len: s.len,
      y: s.pt.y,
      x: s.pt.x,
      dir: plan.a.dir,
      key: stateKey(plan, plan.a.axis, vl, hl),
      prev: START_KEY
    })
  }
  while (heap.size > 0) {
    const e = heap.pop()!
    if (settled.has(e.key)) continue // settle-first-wins
    pendingBest.delete(e.key)
    const inAxis: Axis = e.key === GOAL_KEY ? (plan.b.axis === 'v' ? 'h' : 'v') : e.key < plan.nv * plan.nh ? 'v' : 'h'
    settled.set(e.key, { prev: e.prev, x: e.x, y: e.y })
    if (e.key === GOAL_KEY) {
      const pts: Pt[] = []
      let cur = e.prev
      while (cur !== START_KEY) {
        const s = settled.get(cur)
        if (s === undefined) break
        pts.push({ x: s.x, y: s.y })
        cur = s.prev
      }
      return pts.reverse()
    }
    const st = { x: e.x, y: e.y, inAxis }
    const goal = goalEntry(plan, st, e)
    if (goal !== null && !settled.has(GOAL_KEY)) push(goal)
    expand(plan, st, e, heap, settled, pendingBest, push)
  }
  return null
}

/** 折线→占道段列（stubFirst=搜索路径首段错峰桩标记；直连整段非桩——坐标=两端均值量化，
 *  锚点浮点残差坍缩回道格） */
function segsOf(pts: readonly Pt[], stubFirst: boolean): AllocSeg[] {
  const out: AllocSeg[] = []
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i - 1]!
    const q = pts[i]!
    const dx = Math.abs(q.x - p.x)
    const dy = Math.abs(q.y - p.y)
    if (dx <= CELL_EPS && dy > CELL_EPS) {
      out.push({ axis: 'v', coord: quant((p.x + q.x) / 2), span: { lo: Math.min(p.y, q.y), hi: Math.max(p.y, q.y) }, stub: stubFirst && i === 1 })
    } else if (dy <= CELL_EPS && dx > CELL_EPS) {
      out.push({ axis: 'h', coord: quant((p.y + q.y) / 2), span: { lo: Math.min(p.x, q.x), hi: Math.max(p.x, q.x) }, stub: stubFirst && i === 1 })
    }
  }
  return out
}

/** 与占用表逐段比对（§3.4/§3.3 复用登记）：实际冲突区间（正重叠 ∧ |Δcoord|<LANE_PITCH）→串列（去重保序） */
function overlapAgainst(occ: LaneOccupancy, segs: readonly AllocSeg[]): string[] {
  const marks = new Set<string>()
  for (const s of segs) {
    for (const r of occ.segments()) {
      if (r.axis !== s.axis || Math.abs(r.coord - s.coord) >= LANE_PITCH) continue
      const lo = Math.max(s.span.lo, r.span.lo)
      const hi = Math.min(s.span.hi, r.span.hi)
      if (hi - lo > CELL_EPS) marks.add(laneMarkOf({ ...s, span: { lo, hi } }))
    }
  }
  return [...marks]
}

/** 搜索计划构造（lane 子表→稠密 id 重编+索引映射；窗口/全表两处复用——
 *  id 重编 0..n−1 稠密序：stateKey 轴区编码以 plan.nv/nh 为界，全表稀疏 id
 *  会跨区碰撞〔窗口内 id ≥ nv 的竖道被误读为横道区〕） */
function buildPlan(
  lanes: LaneTable,
  subV: Lane[],
  subH: Lane[],
  occ: LaneOccupancy,
  useOcc: boolean,
  own: readonly Rect[],
  a: AnchorGeom,
  b: AnchorGeom,
  aLane: Lane,
  bLane: Lane
): SearchPlan {
  const lanesSub: LaneTable = { v: subV, h: subH }
  return {
    lanes: lanesSub,
    occ,
    useOcc,
    own,
    a,
    b,
    aLane,
    bLane,
    nv: subV.length,
    nh: subH.length,
    vBy: new Map(subV.map((l) => [l.coord, l] as const)),
    hBy: new Map(subH.map((l) => [l.coord, l] as const)),
    occHit: false
  }
}

/** 子表过滤（keep 谓词+id 重编） */
const subOf = (full: readonly Lane[], keep: (l: Lane) => boolean): Lane[] =>
  full.filter(keep).map((l, i) => ({ ...l, id: i }))

/** 单边分配主口（编排层逐边调用；确定性：同 (输入, 车道表, 占用表) 恒同输出） */
export function allocateEdge(inp: AllocateInput, lanes: LaneTable, occ: LaneOccupancy): AllocateOutcome {
  const a = geomOf(inp.srcAnchor)
  const b = geomOf(inp.tgtAnchor)
  const own = [inp.src, inp.tgt]
  const aLanes = a.axis === 'v' ? lanes.v : lanes.h
  const bLanes = b.axis === 'v' ? lanes.v : lanes.h
  const aLane = laneAt(aLanes, a.axis === 'v' ? a.pt.x : a.pt.y)
  const bLane = laneAt(bLanes, b.axis === 'v' ? b.pt.x : b.pt.y)
  if (aLane === undefined || bLane === undefined) {
    return { status: 'blocked', direct: false, pts: [], segs: [], overlapSpans: [] }
  }
  // ── 0 拐直连（§3.2/§3.3）：同轴同道线相向、整长 ≥LANE_INSET；不查占用（冲突按 §3.4 登记） ──
  if (
    a.axis === b.axis &&
    Math.abs(aLane.coord - bLane.coord) <= CELL_EPS
  ) {
    const from = a.axis === 'v' ? a.pt.y : a.pt.x
    const to = b.axis === 'v' ? b.pt.y : b.pt.x
    const delta = to - from
    if (Math.abs(delta) >= LANE_INSET - CELL_EPS && delta * a.sign > 0 && delta * b.sign < 0 && directClear(aLane, a.axis, from, to, own)) {
      const segs = segsOf([a.pt, b.pt], false)
      return { status: 'ok', direct: true, pts: [a.pt, b.pt], segs, overlapSpans: overlapAgainst(occ, segs) }
    }
  }
  // ── 首段锚定：走廊错峰指派（§3.3）→空走廊自由枚举（防御） ──
  const corridor = corridorLanes(lanes, a, aLane, own)
  let starts: Array<{ pt: Pt; len: number }>
  if (corridor.length > 0) {
    const lane = corridor[((inp.staggerIndex % corridor.length) + corridor.length) % corridor.length]!
    const anchorC = a.axis === 'v' ? a.pt.y : a.pt.x
    starts = [
      {
        pt: a.axis === 'v' ? { x: aLane.coord, y: lane.coord } : { x: lane.coord, y: aLane.coord },
        len: Math.abs(lane.coord - anchorC)
      }
    ]
  } else {
    starts = freeStubStarts(lanes, a, aLane, own)
  }
  // ── 搜索：占用阻塞无解→忽略占用重跑（§3.4 溢出）→仍无解=blocked ──
  // [搜索域定义] 窗=两锚 bbox±SEARCH_WINDOW ∪ 强制绕行族（bands 界）∪
  // 桩端道/两锚道；窗内无解→全表重跑（消灭窗剪枝假 blocked——B-1 修复）
  const xWinLo = Math.min(a.pt.x, b.pt.x) - SEARCH_WINDOW
  const xWinHi = Math.max(a.pt.x, b.pt.x) + SEARCH_WINDOW
  const yWinLo = Math.min(a.pt.y, b.pt.y) - SEARCH_WINDOW
  const yWinHi = Math.max(a.pt.y, b.pt.y) + SEARCH_WINDOW
  const bands = lanes.bands
  const inBandV = (l: Lane): boolean =>
    (bands?.vLeft !== undefined && l.coord <= bands.vLeft + CELL_EPS) ||
    (bands?.vRight !== undefined && l.coord >= bands.vRight - CELL_EPS)
  const inBandH = (l: Lane): boolean =>
    (bands?.hTop !== undefined && l.coord <= bands.hTop + CELL_EPS) ||
    (bands?.hBottom !== undefined && l.coord >= bands.hBottom - CELL_EPS)
  const keepV = (l: Lane): boolean => (l.coord >= xWinLo && l.coord <= xWinHi) || inBandV(l)
  const keepH = (l: Lane): boolean => (l.coord >= yWinLo && l.coord <= yWinHi) || inBandH(l)
  const mustV = new Set<Lane>()
  const mustH = new Set<Lane>()
  for (const s of starts) {
    const vl = laneAt(lanes.v, s.pt.x)
    const hl = laneAt(lanes.h, s.pt.y)
    if (vl !== undefined) mustV.add(vl)
    if (hl !== undefined) mustH.add(hl)
  }
  if (a.axis === 'v') mustV.add(aLane)
  else mustH.add(aLane)
  if (b.axis === 'v') mustV.add(bLane)
  else mustH.add(bLane)
  const plan = buildPlan(
    lanes,
    subOf(lanes.v, (l) => keepV(l) || mustV.has(l)),
    subOf(lanes.h, (l) => keepH(l) || mustH.has(l)),
    occ,
    true,
    own,
    a,
    b,
    aLane,
    bLane
  )
  // ── 搜索序：窗内（占用→溢出）→全表（占用→溢出）——全表重跑消灭窗剪枝
  //    假 blocked（B-1）；全表仍无解=真不可达（端点封死/布局性）
  let found = runSearch(plan, starts)
  if (found === null && plan.occHit) {
    found = runSearch({ ...plan, useOcc: false }, starts)
  }
  if (found === null && starts.length > 0) {
    // starts 空（桩端封死）=起点集与窗口无关地空——全表重跑恒同无解，跳过
    const fullPlan = buildPlan(lanes, subOf(lanes.v, () => true), subOf(lanes.h, () => true), occ, true, own, a, b, aLane, bLane)
    found = runSearch(fullPlan, starts)
    if (found === null && fullPlan.occHit) {
      found = runSearch({ ...fullPlan, useOcc: false }, starts)
    }
  }
  if (found === null) {
    return { status: 'blocked', direct: false, pts: [], segs: [], overlapSpans: [] }
  }
  const pts = [a.pt, ...found, b.pt]
  const segs = segsOf(pts, true)
  return { status: 'ok', direct: false, pts, segs, overlapSpans: overlapAgainst(occ, segs) }
}
