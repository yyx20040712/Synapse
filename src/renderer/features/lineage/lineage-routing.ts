// b3: T3-P7A
/**
 * [T3-P7A] lineage-routing —— 连线路由纯函数（design-final §1-§3/§5；
 * D-P7-1..22 终裁决定表兑现）。零 DOM import（快照采集 buildSnapshot 驻
 * EdgeOverlay hook 层=唯一不纯点，本件可脱离 DOM 单测）。
 *
 * 确定性红线（§5.2）：无随机/无 Date/无三角函数——全部加减乘除；车道=
 * edgeId 字典序（D-5）、降级链单向不回溯（§3.2）、采样步长/车道参数=
 * 本文件头常量。四检 PAD=4 命中语义 d≤PAD 含边界（D-6）。
 */
// ── 类型（§5 接口全集——EdgeKind 四值=shared lineageEdgeKindSchema，无 survey）──
export interface Pt { x: number; y: number }
export interface Rect { x: number; y: number; w: number; h: number }
export type EdgeKind = 'tree' | 'inferred' | 'ref' | 'manual'
export type RouteTag = 'vertical' | 'arc' | 'detour' | 'detour-bottom' | 'fallback'
/** 月框（year 承载跨年直进判定 §2.3；D-9 空隙中线推导输入） */
export interface MonthFrame extends Rect { year: number | null }
export interface Corridor { left: number; laneW: number; laneCount: number }
export interface LayoutSnapshot {
  cards: ReadonlyMap<string, Rect>
  labels: Rect[]
  frames: MonthFrame[]
  contentW: number
  corridor: Corridor
}
export interface EdgeGeomInput { edgeId: string; sourceId: string; targetId: string; kind: EdgeKind; subId?: string }
export interface RoutedPath { edgeId: string; d: string; route: RouteTag; lane: number }

// ── 文件头常量（D-5/D-6/D-9/D-14/D-15——采样/车道参数单源）──
const PAD = 4 // 障碍膨胀：命中 d≤PAD 含边界（D-6）
const BEZIER_SAMPLES = 20 // 贝塞尔采样步长 0.05=1/20（整数循环防浮点累积）
const K_MIN = 12
const K_MAX = 80 // 垂直式控制柄 k=clamp(dy/2,12,80)
const BAND_MARGIN = 6 // C1 外包带水平余量
const ARC_R = 10 // 平级弧圆角（D-14 同行直线分支除外）
const CORRIDOR_W = 58 // 右侧绕行走廊宽（.tl-month margin-right 预留）
const CORRIDOR_INSET = 10 // 起偏（D-5：laneX=contentW−58+10+i×9）
const LANE_W = 9
const LANE_COUNT = 4 // 4 道容量（D-5 算术自洽）
const FALLBACK_INSET = 6 // 全道耗尽 laneX=contentW−6 贴边
const GAP_FALLBACK = 13 // 年内末框 gapY=框底+13（D-9）

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v))
const fmt = (n: number): string => `${Math.round(n * 10) / 10}`
/** 外包带粗筛（带/障碍均按 PAD 膨胀后 AABB 相接判定——粗筛偏宽无害，精判收口） */
const rectsOverlap = (a: Rect, b: Rect): boolean =>
  a.x < b.x + b.w + PAD && a.x + a.w + PAD > b.x && a.y < b.y + b.h + PAD && a.y + a.h + PAD > b.y

/** D-5 车道参数单源（buildSnapshot/测试夹具共用——laneX(i)=contentW−58+10+i×9） */
export function defaultCorridor(contentW: number): Corridor {
  return { left: contentW - CORRIDOR_W + CORRIDOR_INSET, laneW: LANE_W, laneCount: LANE_COUNT }
}

// ── 锚点与路径生成（§2）──
export function anchor(r: Rect, side: 'top' | 'bottom' | 'right'): Pt {
  if (side === 'top') return { x: r.x + r.w / 2, y: r.y }
  if (side === 'bottom') return { x: r.x + r.w / 2, y: r.y + r.h }
  return { x: r.x + r.w, y: r.y + r.h / 2 }
}

export function verticalPath(s: Pt, t: Pt): string {
  const k = clamp((t.y - s.y) / 2, K_MIN, K_MAX)
  return `M ${fmt(s.x)} ${fmt(s.y)} C ${fmt(s.x)} ${fmt(s.y + k)} ${fmt(t.x)} ${fmt(t.y - k)} ${fmt(t.x)} ${fmt(t.y)}`
}

export function arcPath(s: Pt, t: Pt, laneX: number, r = ARC_R): string {
  if (s.y === t.y) {
    return `M ${fmt(s.x)} ${fmt(s.y)} L ${fmt(laneX)} ${fmt(s.y)} L ${fmt(t.x)} ${fmt(t.y)}` // D-14 同行直线分支
  }
  const dir = t.y > s.y ? 1 : -1
  return [
    `M ${fmt(s.x)} ${fmt(s.y)}`,
    `L ${fmt(laneX - r)} ${fmt(s.y)}`,
    `Q ${fmt(laneX)} ${fmt(s.y)} ${fmt(laneX)} ${fmt(s.y + dir * r)}`,
    `L ${fmt(laneX)} ${fmt(t.y - dir * r)}`,
    `Q ${fmt(laneX)} ${fmt(t.y)} ${fmt(laneX - r)} ${fmt(t.y)}`,
    `L ${fmt(t.x)} ${fmt(t.y)}`
  ].join(' ')
}

export function detourPath(s: Pt, t: Pt, laneX: number): string {
  return `M ${fmt(s.x)} ${fmt(s.y)} L ${fmt(laneX)} ${fmt(s.y)} L ${fmt(laneX)} ${fmt(t.y)} L ${fmt(t.x)} ${fmt(t.y)}`
}

export function detourBottomPath(src: Rect, t: Pt, laneX: number, gapY: number): string {
  const s0 = anchor(src, 'bottom')
  return [
    `M ${fmt(s0.x)} ${fmt(s0.y)}`,
    `L ${fmt(s0.x)} ${fmt(gapY)}`,
    `L ${fmt(laneX)} ${fmt(gapY)}`,
    `L ${fmt(laneX)} ${fmt(t.y)}`,
    `L ${fmt(t.x)} ${fmt(t.y)}`
  ].join(' ')
}

// ── 障碍命中原语（§3——膨胀 PAD 后线段-rect 相交，边界相触=命中）──
/** Liang-Barsky：线段 p1→p2 vs rect（已按 PAD 膨胀传入） */
function segHitsRect(p1: Pt, p2: Pt, r: Rect): boolean {
  let t0 = 0
  let t1 = 1
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  const edges: Array<[number, number]> = [
    [-dx, p1.x - r.x],
    [dx, r.x + r.w - p1.x],
    [-dy, p1.y - r.y],
    [dy, r.y + r.h - p1.y]
  ]
  for (const [den, num] of edges) {
    if (den === 0) {
      if (num < 0) return false
      continue
    }
    const q = num / den
    if (den < 0) {
      if (q > t1) return false
      if (q > t0) t0 = q
    } else {
      if (q < t0) return false
      if (q < t1) t1 = q
    }
  }
  return true
}

/** 线段 vs 障碍集（膨胀 PAD）：任一命中即 true（含边界 D-6） */
export function segHitsAny(p1: Pt, p2: Pt, obstacles: readonly Rect[]): boolean {
  return obstacles.some((o) =>
    segHitsRect(p1, p2, { x: o.x - PAD, y: o.y - PAD, w: o.w + 2 * PAD, h: o.h + 2 * PAD })
  )
}

function bezierPt(t: number, p0: Pt, p1: Pt, p2: Pt, p3: Pt): Pt {
  const u = 1 - t
  return {
    x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y
  }
}

// ── 避让四检（§3.1——true=被挡）──
export function checkVerticalBand(s: Pt, t: Pt, obstacles: readonly Rect[]): boolean {
  const dy = t.y - s.y
  if (dy <= 0) return true // 几何不适用=被挡（routeEdge 已前置 D-3，防御面）
  const band: Rect = { x: Math.min(s.x, t.x) - BAND_MARGIN, y: s.y, w: Math.abs(t.x - s.x) + 2 * BAND_MARGIN, h: dy }
  const near = obstacles.filter((o) => rectsOverlap(band, o))
  if (near.length === 0) return false
  const k = clamp(dy / 2, K_MIN, K_MAX)
  let prev = s
  for (let i = 1; i <= BEZIER_SAMPLES; i++) {
    const p = bezierPt(i / BEZIER_SAMPLES, s, { x: s.x, y: s.y + k }, { x: t.x, y: t.y - k }, t)
    if (segHitsAny(prev, p, near)) return true
    prev = p
  }
  return false
}

export function checkArcEntry(s: Pt, laneX: number, obstacles: readonly Rect[]): boolean {
  return segHitsAny(s, { x: laneX, y: s.y }, obstacles)
}

function sweepBlocked(laneX: number, yLo: number, yHi: number, obstacles: readonly Rect[]): boolean {
  return segHitsAny({ x: laneX, y: yLo }, { x: laneX, y: yHi }, obstacles)
}

export function checkSweepBand(s: Pt, t: Pt, laneX: number, obstacles: readonly Rect[]): boolean {
  return sweepBlocked(laneX, Math.min(s.y, t.y), Math.max(s.y, t.y), obstacles)
}

// ── 编排（§3.2 降级链单向不回溯）──
export function laneIndex(edgeId: string, all: readonly string[]): number {
  return [...all].sort().indexOf(edgeId)
}

function frameOf(card: Rect, frames: readonly MonthFrame[]): MonthFrame | undefined {
  const cx = card.x + card.w / 2
  const cy = card.y + card.h / 2
  return frames.find((f) => cx >= f.x && cx <= f.x + f.w && cy >= f.y && cy <= f.y + f.h)
}

/** D-9 空隙中线：源月框底与同年下一框顶差/2；年内末框=框底+13 */
function gapBelow(src: Rect, snap: LayoutSnapshot): number {
  const frame = frameOf(src, snap.frames)
  if (frame === undefined) return src.y + src.h + GAP_FALLBACK
  const next = snap.frames.find((f) => f !== frame && f.year === frame.year && f.y >= frame.y + frame.h)
  if (next === undefined) return frame.y + frame.h + GAP_FALLBACK
  return (frame.y + frame.h + next.y) / 2
}

function fallbackPath(
  e: EdgeGeomInput,
  s: Pt,
  t: Pt,
  snap: LayoutSnapshot,
  obstacles: readonly Rect[],
  onWarn: (msg: string) => void
): RoutedPath {
  const lx = snap.contentW - FALLBACK_INSET
  const d = detourPath(s, t, lx)
  const segs: Array<[Pt, Pt]> = [
    [s, { x: lx, y: s.y }],
    [{ x: lx, y: s.y }, { x: lx, y: t.y }],
    [{ x: lx, y: t.y }, t]
  ]
  // 不静默（§3.2+票面 D-7）：车道耗尽/不可行本身即降级信号；采样穿透另注记
  const hit = segs.some(([a, b]) => segHitsAny(a, b, obstacles))
  onWarn(
    `lineage-routing：边 ${e.edgeId} ${hit ? 'fallback 采样仍穿障碍' : '车道耗尽 fallback 贴边'}（laneX=${fmt(lx)}）`
  )
  return { edgeId: e.edgeId, d, route: 'fallback', lane: -1 }
}

function routeOne(e: EdgeGeomInput, snap: LayoutSnapshot, baseLane: number, onWarn: (msg: string) => void): RoutedPath {
  const src = snap.cards.get(e.sourceId)
  const tgt = snap.cards.get(e.targetId)
  if (src === undefined || tgt === undefined) {
    onWarn(`lineage-routing：边 ${e.edgeId} 端点卡缺失（${e.sourceId}/${e.targetId}），跳过路由`)
    return { edgeId: e.edgeId, d: '', route: 'fallback', lane: -1 }
  }
  const obstacles = [
    ...[...snap.cards.entries()].filter(([id]) => id !== e.sourceId && id !== e.targetId).map(([, r]) => r),
    ...snap.labels
  ]
  const verticalFirst = e.kind === 'tree' || e.kind === 'inferred'
  const crossYear = frameOf(src, snap.frames)?.year !== frameOf(tgt, snap.frames)?.year
  const sTop = anchor(src, 'bottom')
  const tTop = anchor(tgt, 'top')
  const dy = tTop.y - sTop.y
  if (verticalFirst && !crossYear && dy > 0 && !checkVerticalBand(sTop, tTop, obstacles)) {
    return { edgeId: e.edgeId, d: verticalPath(sTop, tTop), route: 'vertical', lane: -1 }
  }
  // 走廊流：arc/detour/detour-bottom/fallback（dy≤0 前置直进 detour=D-3——
  // dy 概念仅 tree/inferred 垂直式候选；ref/manual 初路由 arc 无 dy 判定）
  const s = anchor(src, 'right')
  const t = anchor(tgt, 'right')
  const wantDetour = crossYear || (verticalFirst && dy <= 0)
  // 车道回卷（回炉 2 ①）：探测序=baseLane 起始的环形序（起始序=字典序稳定
  // 保持+全道探测——四道全被检测占用才 fallback，INV-79 语义正解）
  const lc = snap.corridor.laneCount
  for (let i = 0; i < lc; i++) {
    const lane = (baseLane + i) % lc
    const lx = snap.corridor.left + lane * snap.corridor.laneW
    const bottomOut = checkArcEntry(s, lx, obstacles) // C2（含同行右邻）
    const gapY = bottomOut ? gapBelow(src, snap) : 0
    if (bottomOut) {
      // C2.5（回炉 1 B-2）：底部出前两段检测——竖段 x 固定换道无解，
      // 任一命中（障碍含卡）=bottomOut 不可行直落 fallback
      const s0 = anchor(src, 'bottom')
      if (
        segHitsAny(s0, { x: s0.x, y: gapY }, obstacles) ||
        segHitsAny({ x: s0.x, y: gapY }, { x: lx, y: gapY }, obstacles)
      ) {
        return fallbackPath(e, s, t, snap, obstacles, onWarn)
      }
    }
    const yA = bottomOut ? gapY : s.y
    // 回程横道恒检（回炉 1 d1-B1+回炉 2 ③：含卡∪标注全障碍——严格蕴含
    // C4 标注压口[D-13 防御面——标注居左现状恒不命中]，命中即车道升级；
    // [D-P7B-7] resolveLabelEntry 已随让行遗迹裁撤删除——零生产调用死代码）
    if (segHitsAny({ x: lx, y: t.y }, t, obstacles)) continue
    if (sweepBlocked(lx, Math.min(yA, t.y), Math.max(yA, t.y), obstacles)) continue // C3
    if (bottomOut) {
      return { edgeId: e.edgeId, d: detourBottomPath(src, t, lx, gapY), route: 'detour-bottom', lane }
    }
    const d = wantDetour ? detourPath(s, t, lx) : arcPath(s, t, lx)
    return { edgeId: e.edgeId, d, route: wantDetour ? 'detour' : 'arc', lane }
  }
  return fallbackPath(e, s, t, snap, obstacles, onWarn)
}

export function routeEdge(
  e: EdgeGeomInput,
  snap: LayoutSnapshot,
  onWarn: (msg: string) => void = () => undefined
): RoutedPath {
  // 单边独立语义：无批次上下文 → 基车道 0（车道字典序排名由 routeAll 批量注入）
  return routeOne(e, snap, 0, onWarn)
}

export function routeAll(
  edges: readonly EdgeGeomInput[],
  snap: LayoutSnapshot,
  onWarn: (msg: string) => void = () => undefined
): RoutedPath[] {
  const ids = edges.map((e) => e.edgeId)
  // 回炉 1 W3：循环占道 baseLane=rank%laneCount——同边恒同道确定性保持，
  // >4 边不堆 fallback（四道全被检测占用才 fallback）
  return edges.map((e) => routeOne(e, snap, laneIndex(e.edgeId, ids) % snap.corridor.laneCount, onWarn))
}
