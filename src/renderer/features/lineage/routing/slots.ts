/**
 * [F-ROUTE-02 U1+U2] slots —— 走线候选位分配·分配决策层（design §5 候选
 * B；提取层=gap-cells.ts、几何施加层=zapply.ts、残余分离子 pass=residual.ts
 * ——均 U2 自本件拆出〔300 行设计上限分件〕）。分配主循环（a7 无回溯：
 * edgeId 字典序×段自起点向终点序×单元沿段序）：L1 本单元（|槽位−ideal|
 * 升序→槽索引升序）→L2 同带邻单元（同 axis 同 bandId 检索域——行隙/列缝
 * 带表独立编号必撞号；索引差升序→tie 几何小侧左/上先；bandId=−1 同 axis
 * 自成域）→L3 全占∨全不可达（a6 两态合一）→overlapExempt 落 ideal。Z 形
 * 可行条件与施加=zapply.zInterior（S2+N-3）∧ 谓词复检（pre-commit 权威门：
 * zChainClear(allObstacles)+有桩边每桩 jogClearOfStub；失败=该槽对本段不可
 * 用续余槽，禁写 cell.blockedSlots——那是静态预过滤全局面）。Δ=|槽位−ideal|
 * 量化后<1：不偏移、几何=ideal、标 overlapExempt 且槽位占用保留（防后段
 * 重取——INV-1XX 豁免支承载）。commit 仅于可用确认后落记（AnchorUse 同型：
 * 失败尝试不占槽无需释放）。确定性红线：无随机/无 Date/无三角函数。纯函数
 * 零 DOM import。
 */
import type { Pt, Rect } from './anchors'
import { segHitsAny } from './avoid'
import { allObstacles, type LayoutSnapshot, type RouteTag } from './chain'
import { CELL_EPS, extractGapCells, quant, slotPositions, type GapCell } from './gap-cells'
import { runResidualPass } from './residual'
import { rebuildPts, zInterior, type Landed } from './zapply'

/** 槽占用注册表（AnchorUse 同型：仅胜出态落记——失败尝试不占槽无需释放） */
export class SlotUse {
  private readonly used = new Map<number, Map<number, string>>()

  has(cellId: number, slotIdx: number): boolean {
    return this.used.get(cellId)?.has(slotIdx) ?? false
  }

  commit(cellId: number, slotIdx: number, edgeId: string): void {
    const per = this.used.get(cellId)
    if (per !== undefined) per.set(slotIdx, edgeId)
    else this.used.set(cellId, new Map([[slotIdx, edgeId]]))
  }
}

/** 单元槽位坐标（closed→[]） */
export function slotsOf(cell: GapCell): number[] {
  return cell.closed ? [] : slotPositions(cell.axis, cell.rect)
}

/** 段×单元消费判定（N-2 半开：非轴对齐/closed 恒 false；行进轴严格正测度
 *  重叠 ∧ 槽轴严格正宽度（退化段=槽轴坐标严格内含）——零宽贴边/边界零测度
 *  不消费，端点恰落边界归属行进方向后继单元） */
export function segConsumesCell(cell: GapCell, p1: Pt, p2: Pt): boolean {
  if (cell.closed) return false
  if (Math.abs(p2.x - p1.x) > CELL_EPS && Math.abs(p2.y - p1.y) > CELL_EPS) return false
  const loX = Math.min(p1.x, p2.x)
  const hiX = Math.max(p1.x, p2.x)
  const loY = Math.min(p1.y, p2.y)
  const hiY = Math.max(p1.y, p2.y)
  const ov = (a1: number, a2: number, b1: number, b2: number): number => Math.min(a2, b2) - Math.max(a1, b1)
  if (cell.axis === 'x') {
    // 槽轴=x、行进轴=y
    if (ov(loY, hiY, cell.rect.y, cell.rect.y + cell.rect.h) <= 0) return false
    const s = ov(loX, hiX, cell.rect.x, cell.rect.x + cell.rect.w)
    return s > 0 || (loX === hiX && cell.rect.x < loX && hiX < cell.rect.x + cell.rect.w)
  }
  // 槽轴=y、行进轴=x（列缝）
  if (ov(loX, hiX, cell.rect.x, cell.rect.x + cell.rect.w) <= 0) return false
  const s = ov(loY, hiY, cell.rect.y, cell.rect.y + cell.rect.h)
  return s > 0 || (loY === hiY && cell.rect.y < loY && hiY < cell.rect.y + cell.rect.h)
}

/** 槽可用=①SlotUse 空闲 ∧ ②静态预过滤过（closed/blockedSlots/has 三查；
 *  谓词复检（zChainClear/jogClearOfStub）与失败续扫组装=主循环域） */
export function slotFree(use: SlotUse, cell: GapCell, slotIdx: number): boolean {
  if (cell.closed) return false
  if (cell.blockedSlots.has(slotIdx)) return false
  return !use.has(cell.id, slotIdx)
}

/** Z 形链谓词复检（pre-commit 权威门①子件）：全子段 segHitsAny=false（PAD 膨胀） */
export function zChainClear(zChain: readonly Pt[], obstacles: readonly Rect[]): boolean {
  for (let i = 1; i < zChain.length; i++) {
    if (segHitsAny(zChain[i - 1]!, zChain[i]!, obstacles)) return false
  }
  return true
}

/** 桩区禁入（pre-commit 权威门②子件）：stub 在场时全顶点不入桩段 AABB 严格
 *  内部（零膨胀；边界=允许） */
export function jogClearOfStub(zChain: readonly Pt[], stub: { a: Pt; b: Pt } | undefined): boolean {
  if (stub === undefined) return true
  const x1 = Math.min(stub.a.x, stub.b.x)
  const x2 = Math.max(stub.a.x, stub.b.x)
  const y1 = Math.min(stub.a.y, stub.b.y)
  const y2 = Math.max(stub.a.y, stub.b.y)
  return zChain.every((v) => !(v.x > x1 && v.x < x2 && v.y > y1 && v.y < y2))
}

/** 分配输入边（routeOne 骨架投影——U3 接入；pts=未偏移骨架点链；band 族
 *  字段=旧 SkelResult 投影兼容透传〔xLo/xHi 本层不消费〕） */
export interface AssignEdge {
  edgeId: string
  route: RouteTag
  pts: Pt[]
  bandY?: number
  bandS?: number
  bandCap?: number
  xLo?: number
  xHi?: number
}

/** 分配记录（一次消费一枚：落位/Δ<1 保留/L3 豁免/残余；cellId=实际落位
 *  单元、残余=−1；ideal=a6 未偏移骨架位〔段起点槽轴坐标〕） */
export interface AssignRec {
  edgeId: string
  segIdx: number
  cellId: number
  axis: 'x' | 'y'
  ideal: number
  slotIdx?: number
  overlapExempt: boolean
  residual: boolean
}

export interface AssignOut {
  pts: Pt[]
  recs: AssignRec[]
}

/** 同带检索域（axis+bandId 键——行隙/列缝带表独立编号必撞号必须分轴；含
 *  bandId=−1 同 axis 自成域；seq=槽轴小端升序序列） */
interface Domain {
  seq: GapCell[]
  indexById: Map<number, number>
}

const slotLoOf = (c: GapCell): number => (c.axis === 'x' ? c.rect.x : c.rect.y)

function domainsOf(cells: readonly GapCell[]): Map<string, Domain> {
  const byKey = new Map<string, GapCell[]>()
  for (const c of cells) {
    const k = `${c.axis}|${c.bandId}`
    const list = byKey.get(k) ?? []
    list.push(c)
    byKey.set(k, list)
  }
  const out = new Map<string, Domain>()
  for (const [k, list] of byKey) {
    list.sort((a, b) => slotLoOf(a) - slotLoOf(b) || a.id - b.id)
    out.set(k, { seq: list, indexById: new Map(list.map((c, i) => [c.id, i])) })
  }
  return out
}

/** 单元沿段序（行进方向前后序；tie=cell.id——同带重叠单元确定性定序） */
function alongTravel(p1: Pt, p2: Pt): (a: GapCell, b: GapCell) => number {
  return (a, b) => {
    if (a.axis !== b.axis) return a.axis < b.axis ? -1 : 1
    const fwd = a.axis === 'x' ? p2.y >= p1.y : p2.x >= p1.x
    const va = a.axis === 'x' ? a.rect.y : a.rect.x
    const vb = b.axis === 'x' ? b.rect.y : b.rect.x
    const d = fwd ? va - vb : vb - va
    return d !== 0 ? d : a.id - b.id
  }
}

type Attempt = { kind: 'land'; cell: GapCell; slotIdx: number; landed: Landed } | { kind: 'retain'; cell: GapCell; slotIdx: number }

/** 单元逐槽尝试（L1/L2 共用体）：|槽位−ideal| 升序→槽索引升序；slotFree
 *  →Δ 量化后<1=豁免保留占用（几何不偏移）→Z 形可行∧谓词复检（zChainClear
 *  +有桩边每桩 jogClearOfStub）→commit 落位；失败=该槽对本段不可用续余槽
 *  （段级语义——禁写 cell.blockedSlots 静态全局面） */
function attemptCell(
  use: SlotUse,
  cell: GapCell,
  edgeId: string,
  segIdx: number,
  ideal: number,
  p1: Pt,
  p2: Pt,
  obstacles: readonly Rect[],
  stubs: ReadonlyArray<{ a: Pt; b: Pt }> | undefined
): Attempt | null {
  const positions = slotsOf(cell)
  const order = positions
    .map((_, i) => i)
    .sort((a, b) => Math.abs(positions[a]! - ideal) - Math.abs(positions[b]! - ideal) || a - b)
  for (const idx of order) {
    if (!slotFree(use, cell, idx)) continue
    if (quant(Math.abs(positions[idx]! - ideal)) < 1) {
      use.commit(cell.id, idx, edgeId) // 占用保留：防后段重取（INV-1XX 豁免支承载）
      return { kind: 'retain', cell, slotIdx: idx }
    }
    const z = zInterior(cell, ideal, positions[idx]!, p1, p2)
    if (z === null) continue
    if (!zChainClear(z.chain, obstacles)) continue
    if (stubs !== undefined && stubs.some((s) => !jogClearOfStub(z.chain, s))) continue
    use.commit(cell.id, idx, edgeId)
    return { kind: 'land', cell, slotIdx: idx, landed: { segIdx, axis: cell.axis, slot: positions[idx]!, jogLo: z.jogLo, jogHi: z.jogHi } }
  }
  return null
}

function attemptOut(edgeId: string, segIdx: number, ideal: number, at: Attempt): { rec: AssignRec; landed?: Landed } {
  if (at.kind === 'retain') {
    return { rec: { edgeId, segIdx, cellId: at.cell.id, axis: at.cell.axis, ideal, slotIdx: at.slotIdx, overlapExempt: true, residual: false } }
  }
  return {
    rec: { edgeId, segIdx, cellId: at.cell.id, axis: at.cell.axis, ideal, slotIdx: at.slotIdx, overlapExempt: false, residual: false },
    landed: at.landed
  }
}

/** 三级泄压（a2/a6）：L1 本单元→L2 同带邻单元（索引差升序→tie 几何小侧
 *  左/上先；ideal 不变）→L3 全占∨全不可达两态合一→overlapExempt 落 ideal */
function assignCell(
  use: SlotUse,
  dom: Domain | undefined,
  cell: GapCell,
  edgeId: string,
  segIdx: number,
  ideal: number,
  p1: Pt,
  p2: Pt,
  obstacles: readonly Rect[],
  stubs: ReadonlyArray<{ a: Pt; b: Pt }> | undefined
): { rec: AssignRec; landed?: Landed } {
  const own = attemptCell(use, cell, edgeId, segIdx, ideal, p1, p2, obstacles, stubs)
  if (own !== null) return attemptOut(edgeId, segIdx, ideal, own)
  if (dom !== undefined) {
    const ownIdx = dom.indexById.get(cell.id) ?? -1
    const cand = dom.seq
      .map((c, i) => ({ c, i }))
      .filter((x) => x.i !== ownIdx)
      .sort((a, b) => Math.abs(a.i - ownIdx) - Math.abs(b.i - ownIdx) || slotLoOf(a.c) - slotLoOf(b.c) || a.c.id - b.c.id)
    for (const { c } of cand) {
      const at = attemptCell(use, c, edgeId, segIdx, ideal, p1, p2, obstacles, stubs)
      if (at !== null) return attemptOut(edgeId, segIdx, ideal, at)
    }
  }
  return { rec: { edgeId, segIdx, cellId: cell.id, axis: cell.axis, ideal, overlapExempt: true, residual: false } }
}

/** a3 六态消费门：band/direct 轴对齐段与 h-slip 水平段入槽（h-slip 斜段另由
 *  segConsumesCell 非轴对齐早退排除）；corridor（内容域外+旧域外双重一致）/
 *  fallback（放弃避让终态——槽位无意义）/manual-override（用户排位主权）
 *  三态不消费（门一回炉轮 1 件③） */
const ROUTE_ELIGIBLE: ReadonlySet<RouteTag> = new Set<RouteTag>(['band', 'direct', 'h-slip'])

/** 走线候选位分配主入口（候选 B 单 pass）：消费枚举（a7 序+route 门〔回炉
 *  轮 1 件③：ROUTE_ELIGIBLE 六态白名单〕）→三级泄压→
 *  Z 形施加+残余子 pass→按输入边序输出（pts=施加后点链+recs=分配记录） */
export function slotAssign(
  edges: readonly AssignEdge[],
  snap: LayoutSnapshot,
  stubs?: ReadonlyMap<string, ReadonlyArray<{ a: Pt; b: Pt }>>
): AssignOut[] {
  const cells = extractGapCells(snap)
  const obstacles = allObstacles(snap)
  const domains = domainsOf(cells)
  const use = new SlotUse()
  const recsByEdge: AssignRec[][] = edges.map(() => [])
  const landedByEdge: Landed[][] = edges.map(() => [])
  const consumed: Array<Array<Array<[number, number]>>> = edges.map((e) => e.pts.map(() => []))
  const order = edges
    .map((e, i) => ({ id: e.edgeId, i }))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : a.i - b.i))
  for (const { i } of order) {
    const e = edges[i]!
    if (!ROUTE_ELIGIBLE.has(e.route)) continue
    const edgeStubs = stubs?.get(e.edgeId)
    for (let s = 0; s + 1 < e.pts.length; s++) {
      const p1 = e.pts[s]!
      const p2 = e.pts[s + 1]!
      const hit = cells.filter((c) => segConsumesCell(c, p1, p2)).sort(alongTravel(p1, p2))
      for (const cell of hit) {
        const ideal = cell.axis === 'x' ? p1.x : p1.y
        const r = assignCell(use, domains.get(`${cell.axis}|${cell.bandId}`), cell, e.edgeId, s, ideal, p1, p2, obstacles, edgeStubs)
        recsByEdge[i]!.push(r.rec)
        if (r.landed !== undefined) landedByEdge[i]!.push(r.landed)
        // 消费区间（残余域扣除=单元 x 跨度∩段 x 域；零宽⊥记录被残余域 b>a 过滤）
        const lo = Math.max(cell.rect.x, Math.min(p1.x, p2.x))
        const hi = Math.min(cell.rect.x + cell.rect.w, Math.max(p1.x, p2.x))
        consumed[i]![s]!.push([lo, hi])
      }
    }
  }
  const resid = runResidualPass(edges, consumed)
  return edges.map((e, i) => ({
    pts: rebuildPts(e, landedByEdge[i]!, resid.apps[i]!),
    recs: [...recsByEdge[i]!, ...resid.recs[i]!]
  }))
}
