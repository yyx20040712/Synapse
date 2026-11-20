/**
 * [F-LANEGRID-01 B3] scope —— 更新计算集推导纯函数（设计稿
 * docs/design/2026-11-19_f-lanegrid01-design.md §6.2/§6.4；裁决⑥集外不动
 * +月域语义澄清 2026-11-19）。computeRerouteScope(prev, next, edges,
 * prevPaths) 由 use-lineage-routes 每次重算触发消费，输出三域：
 * - recompute=须重排边集，三源并集：①端点卡落在任一变化帧（帧变化=
 *   frameRect 新旧差超阈 ∪ 帧内卡集增删/移动——卡按 cardFrame 归属）；
 *   ②现路径任一段与变化帧新旧 rect 并集真实相交（bbox 粗筛+精确段交——
 *   穿框边牵出面：不重算则改月卡可压上陈旧路径）③自动边引用消失车道
 *   （prev 路径 laneMarks/pts 坐标 ⊄ buildLaneTable(next)——车道表布局派生，
 *   卡移可致坐标绝源；manual 自由坐标不触发牵出——审查 M11 闭合）；恒入
 *   规则：新增边（无 prev 路径）与 force（输入 diff 变化边——调用方传入）。
 * - viaClear=清除域声明：manual 边端点卡落在变化帧者（⊆ recompute）。清除
 *   动作驻 store 复合动作 applyObstacleReroute（拖放 settle/增删卡——一次
 *   障碍突变=一撤销单元）；undo/redo=历史恢复不清 via（恢复的前布局=via
 *   有效布局）；全局变化（首算/档变/W 变）非用户障碍突变 → 域空。
 * - carried=集外边 prev 路径表（§6.3 载入占用——routeAll 直通+段/锚预登记）。
 * 全局判定（→全图重算 carried 空）：调用方 global 标志（uiScale 档变/渲染
 * 组结构变）∪ prev 缺席（首算）∪ 防御降级（frameKey 缺席/卡无帧归属/
 * frames 空/contentW 变——对齐不能宁重算不漏算）。
 * 确定性红线：无随机/无 Date/无三角函数。纯函数零 DOM import。
 */
import { type Pt, type Rect } from './anchors'
import { segHitsRect } from './avoid'
import { buildLaneTable, CELL_EPS, quant } from './grid'
import type { EdgeGeomInput, LayoutSnapshot, RoutedPath } from './chain'

/** 帧/卡矩形变化判定阈值（0.1=QUANT 同格——亚阈值漂移视为布局未变） */
export const SCOPE_EPS = 0.1

/** 更新计算集三域（carried 值=prev 路径引用复用——集外不动） */
export interface RerouteScope {
  recompute: Set<string>
  viaClear: Set<string>
  carried: Map<string, RoutedPath>
}

/** 附加项：global=调用方全局信号；force=输入 diff 变化边（恒入 recompute） */
export interface ScopeOptions {
  global?: boolean
  force?: ReadonlySet<string>
}

const near = (a: number, b: number): boolean => Math.abs(a - b) <= SCOPE_EPS

/** 矩形 ε 等（rerun.snapshotsEqual 共用单源） */
export const rectEq = (a: Rect, b: Rect): boolean =>
  near(a.x, b.x) && near(a.y, b.y) && near(a.w, b.w) && near(a.h, b.h)

/** 两矩形并集 bbox（缺席侧=另一侧；双缺席不可达——调用方先判） */
const unionRect = (a: Rect | undefined, b: Rect | undefined): Rect => {
  const r = a ?? b!
  const s = b ?? a!
  const x = Math.min(r.x, s.x)
  const y = Math.min(r.y, s.y)
  return { x, y, w: Math.max(r.x + r.w, s.x + s.w) - x, h: Math.max(r.y + r.h, s.y + s.h) - y }
}

/** 防御降级判定：帧键缺席/卡无帧归属/frames 空 → true（对齐不能） */
function degraded(s: LayoutSnapshot): boolean {
  if (s.frames.length === 0) return true
  for (const f of s.frames) if (f.frameKey === null) return true
  for (const id of s.cards.keys()) {
    const fk = s.cardFrame.get(id)
    if (fk === undefined || fk === null) return true
  }
  return false
}

/** 快照卡按帧归属分组（Map 缺席条目/undefined/null → null=降级信号） */
function cardsByFrame(s: LayoutSnapshot): Map<string, string[]> | null {
  const out = new Map<string, string[]>()
  for (const [id, _r] of s.cards) {
    const fk = s.cardFrame.get(id)
    if (fk === undefined || fk === null) return null
    const arr = out.get(fk)
    if (arr === undefined) out.set(fk, [id])
    else arr.push(id)
  }
  return out
}

/**
 * 变化帧推导（frameKey 对齐）：帧 rect ε 差 ∪ 帧内卡集差（增删/移动）→
 * 变化帧 → 新旧 rect 并集（路径牵出面比对域）。null=防御降级。
 */
function changedFramesOf(prev: LayoutSnapshot, next: LayoutSnapshot): Map<string, Rect> | null {
  const pf = new Map<string, Rect>()
  for (const f of prev.frames) pf.set(f.frameKey!, f)
  const nf = new Map<string, Rect>()
  for (const f of next.frames) nf.set(f.frameKey!, f)
  const pc = cardsByFrame(prev)
  const nc = cardsByFrame(next)
  if (pc === null || nc === null) return null
  const changed = new Map<string, Rect>()
  for (const key of new Set([...pf.keys(), ...nf.keys()])) {
    const a = pf.get(key)
    const b = nf.get(key)
    let hit = a === undefined || b === undefined || !rectEq(a, b)
    if (!hit) {
      const pa = pc.get(key) ?? []
      const na = nc.get(key) ?? []
      if (pa.length !== na.length) hit = true
      else {
        for (const id of pa) {
          if (!na.includes(id) || !rectEq(prev.cards.get(id)!, next.cards.get(id)!)) {
            hit = true
            break
          }
        }
      }
    }
    if (hit) changed.set(key, unionRect(a, b))
  }
  return changed
}

/** 端点卡落在变化帧（快照归属缺席=不在——该卡不在场/防御面） */
function endpointInChanged(
  e: EdgeGeomInput,
  next: LayoutSnapshot,
  changed: ReadonlyMap<string, Rect>
): boolean {
  const a = next.cardFrame.get(e.sourceId)
  if (a != null && changed.has(a)) return true
  const b = next.cardFrame.get(e.targetId)
  return b != null && changed.has(b)
}

/** 段 vs 矩形真实相交（bbox 粗筛+avoid.segHitsRect 精确段交单源——边界相触
 *  =牵出保守侧：宁多重算不留陈旧路径） */
function segIntersectsRect(p1: Pt, p2: Pt, r: Rect): boolean {
  if (
    Math.max(p1.x, p2.x) < r.x ||
    Math.min(p1.x, p2.x) > r.x + r.w ||
    Math.max(p1.y, p2.y) < r.y ||
    Math.min(p1.y, p2.y) > r.y + r.h
  ) {
    return false
  }
  return segHitsRect(p1, p2, r)
}

/** 源二：现路径任一段与变化帧并集真实相交 */
function pathCrossesChanged(pp: RoutedPath, changed: ReadonlyMap<string, Rect>): boolean {
  if (changed.size === 0 || pp.pts.length < 2) return false
  for (const r of changed.values()) {
    for (let i = 1; i < pp.pts.length; i++) {
      if (segIntersectsRect(pp.pts[i - 1]!, pp.pts[i]!, r)) return true
    }
  }
  return false
}

/** 源三：引用消失车道（laneMarks 观测串坐标+pts 轴对齐段坐标 ⊄ next 车道表；
 *  对角/零长残段跳过——防御面） */
function referencesVanishedLane(
  pp: RoutedPath,
  lanes: { v: ReadonlySet<number>; h: ReadonlySet<number> }
): boolean {
  const hasLane = (axis: 'v' | 'h', coord: number): boolean =>
    (axis === 'v' ? lanes.v : lanes.h).has(quant(coord))
  if (pp.laneMarks !== undefined && pp.laneMarks !== '') {
    for (const tok of pp.laneMarks.split(',')) {
      const m = /^([vh])(-?[\d.]+):/.exec(tok)
      if (m !== null && !hasLane(m[1] as 'v' | 'h', Number(m[2]))) return true
    }
  }
  for (let i = 1; i < pp.pts.length; i++) {
    const p = pp.pts[i - 1]!
    const q = pp.pts[i]!
    if (Math.abs(q.x - p.x) <= CELL_EPS && Math.abs(q.y - p.y) > CELL_EPS) {
      if (!hasLane('v', (p.x + q.x) / 2)) return true
    } else if (Math.abs(q.y - p.y) <= CELL_EPS && Math.abs(q.x - p.x) > CELL_EPS) {
      if (!hasLane('h', (p.y + q.y) / 2)) return true
    }
  }
  return false
}

/**
 * 更新计算集推导（纯函数：同输入恒同输出）。全局/降级分支 recompute=全集、
 * carried/viaClear 空（非用户障碍突变无清除域声明）。
 */
export function computeRerouteScope(
  prev: LayoutSnapshot | null,
  next: LayoutSnapshot,
  edges: readonly EdgeGeomInput[],
  prevPaths: ReadonlyArray<RoutedPath>,
  opts: ScopeOptions = {}
): RerouteScope {
  const ids = new Set(edges.map((e) => e.edgeId))
  if (
    opts.global === true ||
    prev === null ||
    prev.contentW !== next.contentW ||
    degraded(prev) ||
    degraded(next)
  ) {
    return { recompute: ids, viaClear: new Set(), carried: new Map() }
  }
  const changed = changedFramesOf(prev, next)
  if (changed === null) return { recompute: ids, viaClear: new Set(), carried: new Map() }
  const lanes = buildLaneTable({
    cards: [...next.cards.values()],
    labels: next.labels,
    yearHeads: next.yearHeads,
    frames: next.frames,
    contentH: next.contentH
  })
  const laneIndex = { v: new Set(lanes.v.map((l) => l.coord)), h: new Set(lanes.h.map((l) => l.coord)) }
  const prevById = new Map<string, RoutedPath>()
  for (const p of prevPaths) if (ids.has(p.edgeId)) prevById.set(p.edgeId, p)
  const recompute = new Set<string>()
  const viaClear = new Set<string>()
  for (const e of edges) {
    const manual = e.via !== undefined && e.via.length > 0
    // 源一：端点卡落在变化帧（manual 边同判=viaClear 声明域；重排态由 store
    // 是否已清 via 决定——已清=自动参算、未清〔undo 恢复〕=manual 重投影）
    if (endpointInChanged(e, next, changed)) {
      recompute.add(e.edgeId)
      if (manual) viaClear.add(e.edgeId)
      continue
    }
    const pp = prevById.get(e.edgeId)
    // 恒入：新增边（无 prev 路径）∪ force（输入 diff 变化边）
    if (pp === undefined || (opts.force !== undefined && opts.force.has(e.edgeId))) {
      recompute.add(e.edgeId)
      continue
    }
    if (pathCrossesChanged(pp, changed)) {
      recompute.add(e.edgeId)
      continue
    }
    if (!manual && referencesVanishedLane(pp, laneIndex)) recompute.add(e.edgeId)
  }
  const carried = new Map<string, RoutedPath>()
  for (const e of edges) {
    if (recompute.has(e.edgeId)) continue
    const pp = prevById.get(e.edgeId)
    if (pp !== undefined) carried.set(e.edgeId, pp)
  }
  return { recompute, viaClear, carried }
}
