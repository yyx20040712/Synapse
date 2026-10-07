/**
 * [F-ROUTE-02 U1] gap-cells —— 走线候选位分配·单元提取层（design §5 候选 B
 * 的提取面；U2 自 slots.ts 机械迁出零逻辑改动——分配层驻 slots.ts、残余子
 * pass 驻 residual.ts）。单元=卡对间空白：行隙 axis='x'（槽沿 x 分布·竖直段
 * 消费）/列缝 axis='y'（对称）。提取管线=卡对候选（开区间条带第三卡即弃=
 * 相邻性）→量化后全等去重（代表对=字典序最小）→带归属（行隙 y 中点/列缝
 * x 中点落带；无带=−1）→(bandId,槽轴小端,槽轴大端,idA,idB) 升序枚举 id→
 * 量化 rect。槽位=[F-SLOTGRID-01 U2 设计 §2 槽位行]：域=通道宽−2×短桩 10、
 * n=clamp(⌊(域宽−8)/8⌋,0,5)、L_min=8、封闭判据=通道宽<36⇔n=0、槽位=域内
 * k/(n+1) 分点、逐位 0.1 量化（72px 通道：域 52/n=5/槽距≈8.67）。
 * closed 三源=n=0/行进净距<2·PAD+1/非卡障碍横贯；blockedSlots=槽线±PAD
 * 走廊×行进全域 vs 非卡障碍静态预过滤。确定性红线：无随机/无 Date/无三角
 * 函数。纯函数零 DOM import。
 */
import type { Rect } from './anchors'
import { PAD } from './avoid'
import { bandsOf } from './bands'
import type { LayoutSnapshot } from './chain'

/** [F-SLOTGRID-01 U2 设计 §2] 槽位域双侧短桩（10px——通道域内缩量） */
export const SLOT_STUB = 10
/** [F-SLOTGRID-01 U2 设计 §2] 最小槽距 L_min=8（n 公式分母/封闭阈组成） */
export const SLOT_L_MIN = 8
/** 槽位上限（五候选位——72px 通道 n=5 恰满） */
export const SLOT_MAX = 5
/** 最小槽距（pitch=域宽/(n+1)≥L_min 恒成立——定理断言面，非运行时钳制） */
export const SLOT_MIN_PITCH = SLOT_L_MIN
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

/** 0.1 步进量化（×10 整数化再回除——避免 0.1 乘法浮点漂移） */
export const quant = (v: number): number => Math.round(v * 10) / 10

/** 第三卡与开区间条带 (x1,x2)×(y1,y2) 严格相交（边界相触不算=相邻性判定） */
const hitsOpenStrip = (c: Rect, x1: number, x2: number, y1: number, y2: number): boolean =>
  c.x < x2 && c.x + c.w > x1 && c.y < y2 && c.y + c.h > y1

/** 两矩形正相交（两轴重叠均>ε——ε 容差的正面积判定） */
const intersects = (a: Rect, b: Rect): boolean => {
  const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)
  const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)
  return ox > CELL_EPS && oy > CELL_EPS
}

/** [F-SLOTGRID-01 U2 设计 §2] 槽数：n=clamp(⌊(域宽−L_min)/L_min⌋,0,SLOT_MAX)，
 *  域宽=通道宽−2×短桩——封闭判据=通道宽<2×短桩+2×L_min=36 ⇔ n=0（等价阈） */
const slotCountOf = (w: number): number =>
  Math.min(SLOT_MAX, Math.max(0, Math.floor((w - 2 * SLOT_STUB - SLOT_L_MIN) / SLOT_L_MIN)))

/** 槽位坐标（pos=槽轴小端+短桩+k·域宽/(n+1)，逐位量化；n=0→[]）——
 *  detour/bands 网格通道槽位同源消费（INV-SLOTGRID-02 坐标集封闭单源） */
export const slotPositions = (axis: 'x' | 'y', r: Rect): number[] => {
  const w = axis === 'x' ? r.w : r.h
  const lo = axis === 'x' ? r.x : r.y
  const n = slotCountOf(w)
  const out: number[] = []
  for (let k = 1; k <= n; k++) out.push(quant(lo + SLOT_STUB + (k * (w - 2 * SLOT_STUB)) / (n + 1)))
  return out
}

/** [F-SLOTGRID-01 U2] 通道中位槽（横带/框间带横移 y 单源取位）：取居中
 *  分点（n 奇=正中；n 偶=居左——floor 序确定性）；n=0（宽<36）=
 *  null=带封闭不可横移（band 门/横移段调用方判空）。72px 横带中位槽=带中心
 *  （k=3 位=top+36——与旧 band.center 数值重合） */
export const midSlotOf = (axis: 'x' | 'y', r: Rect): number | null => {
  const positions = slotPositions(axis, r)
  if (positions.length < 1) return null
  return positions[Math.floor((positions.length - 1) / 2)]!
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
