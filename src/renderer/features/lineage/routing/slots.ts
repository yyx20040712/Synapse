/**
 * [F-ROUTE-02 U1] slots —— 走线候选位分配·单元提取+可用性谓词（design §5
 * 候选 B 后处理槽位分配的提取/谓词层；分配主循环+Z 形施加=U2、chain 接入=U3，
 * 本件暂无生产消费方=设计 §8 分批授权在册）。单元=卡对间空白：行隙 axis='x'
 * （槽沿 x 分布·竖直段消费）/列缝 axis='y'（对称）。提取管线=卡对候选（开
 * 区间条带第三卡即弃=相邻性）→量化后全等去重（代表对=字典序最小）→带归属
 * （行隙 y 中点/列缝 x 中点落带；无带=−1）→(bandId,槽轴小端,槽轴大端,idA,
 * idB) 升序枚举 id→量化 rect。槽位=a1：L=W−2·PAD、n=min(SLOT_MAX,max(0,
 * ⌊L/SLOT_DIV⌋−1))、内缩区间 k/(n+1) 分点、逐位 0.1 量化（n=0 封闭）。
 * closed 三源=n=0/行进净距<2·PAD+1/非卡障碍横贯；blockedSlots=槽线±PAD
 * 走廊×行进全域 vs 非卡障碍静态预过滤。消费=轴对齐段（|dx|∨|dy|≤ε）∧行进
 * 轴严格正测度重叠∧槽轴严格正宽度（退化=坐标严格内含）重叠（N-2 半开：贴
 * 边/零测度不消费；closed 单元恒不消费）。槽索引=slotsOf 输出 0 起数组序
 * （公式 k=1..n ↔ idx 0..n−1）。确定性红线：无随机/无 Date/无三角函数。
 * 纯函数零 DOM import。
 */
import type { Pt, Rect } from './anchors'
import { PAD, segHitsAny } from './avoid'
import { bandsOf } from './bands'
import type { LayoutSnapshot } from './chain'

/** a1：槽距除数（间隙六分语义） */
export const SLOT_DIV = 6
/** a1：槽位上限（五候选位） */
export const SLOT_MAX = 5
/** a1：最小槽距（pitch=L/(n+1)≥本值恒成立——定理断言面，非运行时钳制） */
export const SLOT_MIN_PITCH = 6
/** 相等类判定容差（间距≤ε 不生成/投影覆盖/正相交判定） */
export const CELL_EPS = 0.05
/** 提取几何量化步进（rect 端点/槽位坐标——×10 取整再回除） */
export const QUANT = 0.1

/** 间隙单元（行隙/列缝空白；id=排序枚举序、bandId=带表索引无带=−1） */
export interface GapCell {
  id: number
  bandId: number
  axis: 'x' | 'y'
  rect: Rect
  closed: boolean
  blockedSlots: ReadonlySet<number>
}

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

/** 0.1 步进量化（×10 整数化再回除——避免 0.1 乘法浮点漂移） */
const quant = (v: number): number => Math.round(v * 10) / 10

/** 第三卡与开区间条带 (x1,x2)×(y1,y2) 严格相交（边界相触不算=相邻性判定） */
const hitsOpenStrip = (c: Rect, x1: number, x2: number, y1: number, y2: number): boolean =>
  c.x < x2 && c.x + c.w > x1 && c.y < y2 && c.y + c.h > y1

/** 两矩形正相交（两轴重叠均>ε——ε 容差的正面积判定） */
const intersects = (a: Rect, b: Rect): boolean => {
  const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)
  const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)
  return ox > CELL_EPS && oy > CELL_EPS
}

/** a1 槽数：n=min(SLOT_MAX, max(0, ⌊(W−2·PAD)/SLOT_DIV⌋−1)) */
const slotCountOf = (w: number): number =>
  Math.min(SLOT_MAX, Math.max(0, Math.floor((w - 2 * PAD) / SLOT_DIV) - 1))

/** 槽位坐标（pos=槽轴小端+PAD+k·L/(n+1)，逐位量化；n=0→[]） */
const slotPositions = (axis: 'x' | 'y', r: Rect): number[] => {
  const w = axis === 'x' ? r.w : r.h
  const lo = axis === 'x' ? r.x : r.y
  const n = slotCountOf(w)
  const out: number[] = []
  for (let k = 1; k <= n; k++) out.push(quant(lo + PAD + (k * (w - 2 * PAD)) / (n + 1)))
  return out
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
 *  谓词复检（zChainClear/jogClearOfStub）与失败续扫组装=U2 主循环域） */
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
 *  内部（零膨胀；边界=允许）。真实骨架校准=U2 */
export function jogClearOfStub(zChain: readonly Pt[], stub: { a: Pt; b: Pt } | undefined): boolean {
  if (stub === undefined) return true
  const x1 = Math.min(stub.a.x, stub.b.x)
  const x2 = Math.max(stub.a.x, stub.b.x)
  const y1 = Math.min(stub.a.y, stub.b.y)
  const y2 = Math.max(stub.a.y, stub.b.y)
  return zChain.every((v) => !(v.x > x1 && v.x < x2 && v.y > y1 && v.y < y2))
}

/** 提取候选（量化前载体；矩形=投影重叠列×净距空白域） */
interface Candidate {
  axis: 'x' | 'y'
  x1: number
  x2: number
  y1: number
  y2: number
  idA: string
  idB: string
}

/** 列缝列带（bandsOf 同型对称：卡 x 区间合并→带；0 道=跳过；驻本件） */
function columnBands(snap: LayoutSnapshot, cards: readonly Rect[]): Array<{ lo: number; hi: number }> {
  const ivs = cards.map((c) => [c.x, c.x + c.w] as const).sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const merged: Array<[number, number]> = []
  for (const [lo, hi] of ivs) {
    const last = merged[merged.length - 1]
    if (last !== undefined && lo <= last[1]) last[1] = Math.max(last[1], hi)
    else merged.push([lo, hi])
  }
  const out: Array<{ lo: number; hi: number }> = []
  for (let i = 1; i < merged.length; i++) {
    const lo = merged[i - 1]![1]
    const hi = merged[i]![0]
    const w = hi - lo
    if (w <= 2 * PAD) continue
    const crosses = snap.frames.some((f) => (f.x > lo && f.x < hi) || (f.x + f.w > lo && f.x + f.w < hi))
    const s = crosses ? 9 : 6
    if (Math.floor((w - 2 * PAD) / s) < 1) continue // 0 道=跳过（bandsOf 同型）
    out.push({ lo, hi })
  }
  return out
}

/** 带归属：中点落带区间（ε 容差）→带表索引；无带容纳=−1 */
function bandIdOf(bands: ReadonlyArray<{ lo: number; hi: number }>, mid: number): number {
  for (let i = 0; i < bands.length; i++) {
    if (mid >= bands[i]!.lo - CELL_EPS && mid <= bands[i]!.hi + CELL_EPS) return i
  }
  return -1
}

/** 非卡障碍横贯（closed 源三）：正相交 ∧ 障碍槽轴投影覆盖单元槽轴全域（ε 容差） */
function obstacleCrosses(o: Rect, r: Rect, axis: 'x' | 'y'): boolean {
  if (!intersects(o, r)) return false
  if (axis === 'x') return o.x <= r.x + CELL_EPS && o.x + o.w >= r.x + r.w - CELL_EPS
  return o.y <= r.y + CELL_EPS && o.y + o.h >= r.y + r.h - CELL_EPS
}

/** 单元提取（管线=卡对候选→量化全等去重→带归属→排序枚举 id→closed/blocked） */
export function extractGapCells(snap: LayoutSnapshot): GapCell[] {
  const entries = [...snap.cards.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))
  const cards = entries.map((e) => e[1])
  const nonCard = [...snap.labels, ...snap.yearHeads]
  const candidates: Candidate[] = []
  for (const [idA, A] of entries) {
    for (const [idB, B] of entries) {
      if (idA === idB) continue
      // 行隙：A 底=B 顶之上（垂直净距>ε）∧ x 投影重叠>ε ∧ 开条带无第三卡
      if (B.y - (A.y + A.h) > CELL_EPS) {
        const ovL = Math.max(A.x, B.x)
        const ovR = Math.min(A.x + A.w, B.x + B.w)
        if (ovR - ovL > CELL_EPS && !cards.some((c) => c !== A && c !== B && hitsOpenStrip(c, ovL, ovR, A.y + A.h, B.y))) {
          candidates.push({ axis: 'x', x1: ovL, x2: ovR, y1: A.y + A.h, y2: B.y, idA, idB })
        }
      }
      // 列缝对称：A 左 B 右（水平净距>ε）∧ y 投影重叠>ε ∧ 开条带无第三卡
      if (B.x - (A.x + A.w) > CELL_EPS) {
        const ovLo = Math.max(A.y, B.y)
        const ovHi = Math.min(A.y + A.h, B.y + B.h)
        if (ovHi - ovLo > CELL_EPS && !cards.some((c) => c !== A && c !== B && hitsOpenStrip(c, A.x + A.w, B.x, ovLo, ovHi))) {
          candidates.push({ axis: 'y', x1: A.x + A.w, x2: B.x, y1: ovLo, y2: ovHi, idA, idB })
        }
      }
    }
  }
  // 去重：量化后 (axis,x,y) 全等合并；代表对=(idA,idB) 字典序最小生成对
  const byKey = new Map<string, Candidate>()
  for (const c of candidates) {
    const k = `${c.axis}|${quant(c.x1)},${quant(c.x2)},${quant(c.y1)},${quant(c.y2)}`
    const prev = byKey.get(k)
    if (prev === undefined || c.idA < prev.idA || (c.idA === prev.idA && c.idB < prev.idB)) byKey.set(k, c)
  }
  const rowBands = bandsOf(snap, cards).map((b) => ({ lo: b.top, hi: b.bottom }))
  const colBands = columnBands(snap, cards)
  const items = [...byKey.values()].map((c) => {
    const x1 = quant(c.x1)
    const x2 = quant(c.x2)
    const y1 = quant(c.y1)
    const y2 = quant(c.y2)
    const mid = c.axis === 'x' ? (y1 + y2) / 2 : (x1 + x2) / 2
    return {
      axis: c.axis,
      rect: { x: x1, y: y1, w: quant(x2 - x1), h: quant(y2 - y1) },
      bandId: bandIdOf(c.axis === 'x' ? rowBands : colBands, mid),
      slotLo: c.axis === 'x' ? x1 : y1,
      slotHi: c.axis === 'x' ? x2 : y2,
      idA: c.idA,
      idB: c.idB
    }
  })
  items.sort(
    (a, b) =>
      a.bandId - b.bandId ||
      a.slotLo - b.slotLo ||
      a.slotHi - b.slotHi ||
      (a.idA < b.idA ? -1 : a.idA > b.idA ? 1 : 0) ||
      (a.idB < b.idB ? -1 : a.idB > b.idB ? 1 : 0)
  )
  return items.map((it, i) => {
    const positions = slotPositions(it.axis, it.rect)
    const travel = it.axis === 'x' ? it.rect.h : it.rect.w
    const closed = positions.length < 1 || travel < 2 * PAD + 1 || nonCard.some((o) => obstacleCrosses(o, it.rect, it.axis))
    const blocked = new Set<number>()
    if (!closed) {
      // 静态预过滤：槽线±PAD×行进全域走廊 vs 非卡障碍正相交 → 该槽 blocked
      positions.forEach((pos, idx) => {
        const corridor =
          it.axis === 'x'
            ? { x: pos - PAD, y: it.rect.y, w: 2 * PAD, h: it.rect.h }
            : { x: it.rect.x, y: pos - PAD, w: it.rect.w, h: 2 * PAD }
        if (nonCard.some((o) => intersects(o, corridor))) blocked.add(idx)
      })
    }
    return { id: i, bandId: it.bandId, axis: it.axis, rect: it.rect, closed, blockedSlots: blocked }
  })
}
