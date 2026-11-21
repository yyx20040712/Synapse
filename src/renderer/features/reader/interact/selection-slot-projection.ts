/**
 * [B1-U2 单元 1-②] selection-slot-projection —— 元素槽位违例解析的投影件
 * （自 selection-drag-controller.ts 拆出；设计稿 docs/design/2026-11-21_
 * selection-correctness-a1-a5.md §6 行数预算「槽位投影拆独立件」）。
 *
 * ── 行为层 ──
 * - 槽位投影（新路径，与控制器既有 projectTo 二值路径并存且互不替代）：
 *   y 先按行带映射（rowBands 视觉序单源：带内=该带；带间隙=距 y 最近带、
 *   等距取上带；越首带顶=视觉首带、越末带底=视觉末带）→ 带内取与指针 x
 *   水平距离最小的盒（距盒左/右缘的净空；盒内=0；等距取 x 更小者）→ 取该
 *   盒的最近字符边界（盒左缘=offset 0 / 盒右缘=文本尾；盒内取较近一侧）。
 *   x 语义=「带内最近盒按 x 距离」（设计稿 §2 新路径定义）。
 *   [B1-U3 单元 6] origin 可选参（控制器传 session.down）：指针未命中带内
 *   任何盒且 origin 在场 → 候选收窄 origin 命中盒 x 域重叠盒；收窄集空降级
 *   全带最近盒；指针命中盒内=明确入栏，现行为零变（INV-181 同域约束）。
 * - projectTo（既有二值路径：px≥blockX1→行尾 / px≤blockX0→行首）留在控制器
 *   本件不触——受锁 F-SELBLK-01 测试链锁死其行为。
 *
 * ── 接口层 ──
 * - export interface SlotItem { box: LineBox; text: Text }（控制器 DragItem 同构）
 * - export interface RowBandOfItems { items: SlotItem[]; top: number; bottom: number }
 * - export function rowBandsOf(items): RowBandOfItems[]（y 重叠传递链；相切不算
 *   重叠——控制器 projectTo 与槽位投影共用单源）
 * - export function projectCaretTo(items, x, y, origin?): {node, offset} | null
 *
 * ── 架构层 ──
 * - 依赖单向：本件→selection-column-layout（LineBox 类型）；零 DOM 写、零
 *   React——只读元素盒字段与 Text.data（量测面由调用方传入的引用承载）。
 *
 * ── 生命周期层 ── / ── 文化层 ──
 * - 每次 selectionchange 违例核查调用一次，O(行带成员数)；测试=
 *   selection-b1-a4-slot.test（经控制器装配）+ selection-drag-controller.test
 *   受锁链（rowBandsOf 单源迁移后行为零变）。
 */
import type { LineBox } from './selection-column-layout'

/** 量测项：textLayer 本地行盒+其文本节点（控制器 DragItem 同构） */
export interface SlotItem {
  box: LineBox
  text: Text
}

/** 行带（items=带内项；top/bottom=带纵向界） */
export interface RowBandOfItems {
  items: SlotItem[]
  top: number
  bottom: number
}

/** 锚块行带（y 重叠传递链，相切不算重叠——51 号 rowBands 同式）：控制器
 *  projectTo 二值路径与槽位投影新路径共用（行带单源）。 */
export function rowBandsOf(items: readonly SlotItem[]): RowBandOfItems[] {
  const sorted = [...items].sort((a, b) => a.box.y - b.box.y)
  const bands: RowBandOfItems[] = []
  for (const it of sorted) {
    const cur = bands[bands.length - 1]
    if (cur !== undefined && it.box.y < cur.bottom) {
      cur.items.push(it)
      cur.bottom = Math.max(cur.bottom, it.box.y + it.box.h)
    } else {
      bands.push({ items: [it], top: it.box.y, bottom: it.box.y + it.box.h })
    }
  }
  return bands
}

/** y → 行带（带内=该带；间隙=距 y 最近带、等距取上带；越顶/越底=视觉首/末带） */
export function bandAtY(bands: readonly RowBandOfItems[], y: number): RowBandOfItems | null {
  if (bands.length === 0) return null
  const first = bands[0]!
  const last = bands[bands.length - 1]!
  if (y > last.bottom) return last
  if (y < first.top) return first
  for (let i = 0; i < bands.length; i += 1) {
    const b = bands[i]!
    if (y > b.bottom) continue
    if (y >= b.top) return b
    const prev = bands[i - 1]!
    return y - prev.bottom <= b.top - y ? prev : b
  }
  return last
}

/** 指针 x 到盒的水平净空（盒内=0） */
function xGapTo(item: SlotItem, x: number): number {
  if (x < item.box.x) return item.box.x - x
  if (x > item.box.x + item.box.w) return x - (item.box.x + item.box.w)
  return 0
}

/** 两盒 x 域重叠 >0 判定（同域约束收窄集判据） */
function xDomainsOverlap(a: SlotItem['box'], b: SlotItem['box']): boolean {
  return Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > 0
}

/** [B1-U3 单元 6] 槽位投影（新路径）：带内最近盒按 x 距离 → 该盒最近字符
 *  边界。origin（mousedown 原点，可选）同域约束：指针未命中带内任何盒
 *  （xGapTo>0 对带内全体成立——缝带悬停/栏外空白形态）且 origin 在场 →
 *  候选收窄为「origin 命中盒」（origin.x 落入其 x 域的带内盒；origin 未命中
 *  任何盒=页边形态 → 取距 origin.x 最近盒为域锚）x 域重叠 >0 的盒；收窄集
 *  空 → 降级=现状全带最近盒（巨块极端形态不崩、无选区丢失）。指针命中盒内
 *  （xGapTo=0）→ 收窄门不触发，现行为零变——与 F-VISFB-52「跨双栏需指针
 *  明确入栏授权」相容：指针未明确入栏（未落入任何盒）时 focus 不得越过缝带
 *  投向对栏（plan §3.2-A4 中缝条款的投影层表达——巨块无栏表时授权层防线
 *  失守的兜底）。 */
export function projectCaretTo(items: readonly SlotItem[], x: number, y: number, origin?: { x: number; y: number }): { node: Text; offset: number } | null {
  if (items.length === 0) return null
  const band = bandAtY(rowBandsOf(items), y)
  if (band === null) return null
  let candidates = band.items
  if (origin !== undefined && band.items.every((it) => xGapTo(it, x) > 0)) {
    const anchorBox = band.items.find((it) => origin.x >= it.box.x && origin.x <= it.box.x + it.box.w)
      ?? [...band.items].sort((a, b) => xGapTo(a, origin.x) - xGapTo(b, origin.x) || a.box.x - b.box.x)[0]!
    const narrowed = band.items.filter((it) => xDomainsOverlap(it.box, anchorBox.box))
    if (narrowed.length > 0) candidates = narrowed
  }
  let best = candidates[0]!
  let bestGap = xGapTo(best, x)
  for (const it of candidates) {
    const gap = xGapTo(it, x)
    if (gap < bestGap || (gap === bestGap && it.box.x < best.box.x)) {
      best = it
      bestGap = gap
    }
  }
  const offset = x - best.box.x <= best.box.x + best.box.w - x ? 0 : best.text.data.length
  return { node: best.text, offset }
}
