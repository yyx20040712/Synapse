/**
 * [F-SLOTGRID-01 U1] capacity —— 砖砌卡槽网格布局纯函数族（U1 产出；设计书
 * docs/design/2026-10-07_f-slotgrid01-design.md v1.4 §2/§5.1/§5.2）。
 * 零依赖零 React——布局渲染（TimelineYears）/e2e 期望值/拖拽命中（U3 接线
 * INV-111）/走线（U2）共享单源。INV-SLOTGRID-01。
 *
 * 几何常量（§5.1 全实测锚定）：卡 128×72（border-box 口径——Tailwind v4
 * preflight 全局 box-sizing，卡 width/min-height 即边框盒值）；行隙=列隙=72
 * （节距 200×144）；错位 o=100（2026-10-08 用户呈裁点 1 定值）；框内容
 * 左 12/顶 18。坐标系=月框内容坐标（px）。
 *
 * W 状态机（§5.2-1）：measured（W>0 有限——网格分行）/unmeasured（W≤0/
 * NaN/±∞——capacities 返回 ∞，消费方降级=全部卡入首行单行渲染，DOM 序
 * 不变；jsdom 无 RO/空图无月框同态）。退化实测窗 0<W<228（N 或 M 不足 1）
 * 按容量钳 1 处理（W>0 恒 measured、每行至少 1 卡——防 0/负容量行死循环）。
 */
/** 卡宽（px——INV-111 卡 128 锚同源） */
export const CARD_W = 128
/** 卡高（px——卡高恒 72 假设，INV-111） */
export const CARD_H = 72
/** 行隙=列隙（px——行距=列距=72px，2026-10-07 用户裁决②） */
export const GAP = 72
/** 横节距=卡宽+列隙（行 r 卡 k 左 x=12+φ_r+200k） */
export const PITCH_X = CARD_W + GAP
/** 纵节距=卡高+行隙（行 r 顶 y=18+144r） */
export const PITCH_Y = CARD_H + GAP
/** 错位行相位 o（px——呈裁点 1 定值 100=半卡 64+半隙 36） */
export const OFFSET_O = 100
/** 月框内容左内边距（px——.month-frame padding 左） */
export const FRAME_PAD_LEFT = 12
/** 月框内容顶内边距（px——.month-frame padding 顶，月标带承载） */
export const FRAME_PAD_TOP = 18

/** 网格容量对（N=偶行〔顶格行〕容量/M=奇行〔错位行〕容量） */
export interface RowCapacities {
  n: number
  m: number
}

/** unmeasured 降级容量（W 无效态——全部卡入首行） */
const UNMEASURED: RowCapacities = { n: Number.POSITIVE_INFINITY, m: Number.POSITIVE_INFINITY }

/**
 * 容量公式（§2）：N=⌊(W+72)/200⌋、M=⌊(W+72−o)/200⌋。bond 判据：
 * r=(W+72) mod 200<o ⟺ N−M=1（错位行少一卡=砖砌 bond）——**仅 W≥228
 * （钳制窗外）成立**（0<W<228 钳制段 N=M=1 去 bond 形态）。W≤0/非有限=
 * unmeasured（∞∞）；0<W 下容量钳 ≥1（退化窗每行 1 卡）。
 */
export function capacities(w: number): RowCapacities {
  if (!Number.isFinite(w) || w <= 0) return UNMEASURED
  return {
    // 钳 1=partitionRows/positionOf 死循环防护守卫（cap=0 时贪心下标永不
    // 前进）——禁删（实测窗 W≥228 恒不触发，仅退化窗 0<W<228 生效）
    n: Math.max(1, Math.floor((w + GAP) / PITCH_X)),
    m: Math.max(1, Math.floor((w + GAP - OFFSET_O) / PITCH_X))
  }
}

/** 行 r 容量：r 偶=顶格行 N/r 奇=错位行 M */
export function capacityOfRow(r: number, w: number): number {
  const c = capacities(w)
  return r % 2 === 0 ? c.n : c.m
}

/** 行 r 相位 φ_r：r 偶=0/r 奇=o（错位行整体右移 100px） */
export function phaseOfRow(r: number): number {
  return r % 2 === 0 ? 0 : OFFSET_O
}

/**
 * 数组序贪心分行：行 r 依次取 capacityOfRow(r) 直到耗尽 count（末行可为
 * 残行）。**前置条件：count 须非负整数**（调用面=TimelineYears kids.length
 * 恒整；负/非整入参未定义）。返回每行的 kids 下标数组（数组序双射——
 * INV-75 组内序保持的布局承载）。unmeasured（W 无效）=全部入首行单行。
 */
export function partitionRows(count: number, w: number): number[][] {
  if (!(count > 0)) return []
  const rows: number[][] = []
  let idx = 0
  for (let r = 0; idx < count; r++) {
    const cap = capacityOfRow(r, w)
    // cap 恒 ≥1（capacities 钳 1/∞）——take 恒 ≥1，无死循环面
    const take = Math.min(cap, count - idx)
    const row: number[] = []
    for (let k = 0; k < take; k++) row.push(idx + k)
    rows.push(row)
    idx += take
  }
  return rows
}

/** 网格位（行/列——index↔(row,col) 双射的坐标面） */
export interface GridPos {
  row: number
  col: number
}

/** index→(row,col)：逐行扣容量（与 partitionRows 同数学——卡 i 落行 r 列 k） */
export function positionOf(index: number, w: number): GridPos {
  if (!Number.isFinite(index) || index < 0) return { row: 0, col: 0 } // 防御：非有限/负 index 直落首格
  let i = Math.floor(index)
  let row = 0
  let cap = capacityOfRow(row, w)
  while (i >= cap) {
    i -= cap
    row++
    cap = capacityOfRow(row, w)
  }
  return { row, col: i }
}

/** (row,col)→index=Σ前行容量+col（positionOf 逆——双射往返恒等；
 *  负/非有限 row/col 防御直落 0——镜像 positionOf 首格防御） */
export function indexOf(row: number, col: number, w: number): number {
  if (!Number.isFinite(row) || !Number.isFinite(col) || row < 0 || col < 0) return 0
  let sum = 0
  for (let r = 0; r < row; r++) sum += capacityOfRow(r, w)
  return sum + col
}

/** 算术命中结果（hitTest 输出——U3 拖拽 settle 消费面） */
export interface HitResult {
  row: number
  col: number
  index: number
}

/**
 * 算术命中（§5.5 INV-111 算式——本批只造函数+单测锁数学，U3 接线拖拽）：
 * row=clamp(⌊(py−18)/144⌋,0,rowCounts.length−1)、col=clamp(round((px−12−φ_r
 * −64)/200),0,upper_r)、index=Σ前行容量+col。upper_r=min(容量,该行实有卡数)
 * −1——**残行钳**（满行=cap_r−1；末残行钳实有数，不返回越出容量/实有的
 * 卡位——前提=rowCounts 为 partitionRows 输出形态：前缀行恒满、仅末行可残；
 * 「末卡之后的追加位」不属 hitTest 契约〔卡位语义，设计 §5.5 原式 col≤cap_r−1〕，
 * 插入语义 U3 接线时定）。
 * **坐标系：px/py=月框 padding-box 坐标（border 内缘起算）**——卡左=
 * 12+φ_r+200k 同系（U3 接线时 DOM 坐标换算基准=frame border-box 内缘）。
 * rowCounts=partitionRows 各行长度（空数组守卫 → {0,0,0}；px/py 非有限同守卫
 * ——防御一致性，垃圾入有界出）。
 */
export function hitTest(px: number, py: number, w: number, rowCounts: readonly number[]): HitResult {
  if (rowCounts.length === 0 || !Number.isFinite(px) || !Number.isFinite(py)) {
    return { row: 0, col: 0, index: 0 }
  }
  const row = Math.max(0, Math.min(Math.floor((py - FRAME_PAD_TOP) / PITCH_Y), rowCounts.length - 1))
  const upper = Math.min(capacityOfRow(row, w), rowCounts[row]!) - 1
  const col = Math.max(0, Math.min(Math.round((px - FRAME_PAD_LEFT - phaseOfRow(row) - CARD_W / 2) / PITCH_X), upper))
  return { row, col, index: indexOf(row, col, w) }
}
