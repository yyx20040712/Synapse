/**
 * [F-LGRAPH-01②U5] edge-edit —— 手动调线编辑代数（单源=F-LINEAGE-02
 * design-final §2.3——本件为实现真相源；纯函数零 DOM import）。
 *
 * 全点链=[anchorA, ...via, anchorB]（内容坐标）；锚端=被动（不随拖动迁移）
 * ——首末拐点联动止于短桩（§2.3-1）；via 不变量（正交/无重合/≥1）由编辑
 * 代数保证（service 序列化校验兜底）。确定性红线：无随机/无 Date/无三角。
 */
import type { LineageViaPoint } from '@shared/models/lineage'
import type { Pt, Rect, Side } from './routing/anchors'
import { segHitsRect, PAD } from './routing/avoid'

/** 编辑代数输入（全点链拆分形） */
export interface EditPolyline {
  anchorA: Pt
  anchorB: Pt
  via: LineageViaPoint[]
}

const eq = (a: Pt, b: Pt): boolean => a.x === b.x && a.y === b.y
const dup = (p: Pt): Pt => ({ x: p.x, y: p.y })

/** 全点链展开（代数判定工作形） */
export function fullPoints(p: EditPolyline): Pt[] {
  return [p.anchorA, ...p.via, p.anchorB]
}

const isVertical = (a: Pt, b: Pt): boolean => a.x === b.x

/** 相邻重合防御（不变量②——重合点段无轴向，编辑各处剔除） */
function hasDupNeighbor(pts: readonly Pt[]): boolean {
  for (let i = 1; i < pts.length; i++) if (eq(pts[i - 1]!, pts[i]!)) return true
  return false
}

/**
 * 拖顶点（§2.3-1 精确式——逐段独立判定轴跟随）：
 * 被拖 via 序号 idx；P=落点。入段竖直⇒前邻.x←P.x；入段水平⇒前邻.y←P.y；
 * 出段竖直⇒后邻.x←P.x；出段水平⇒后邻.y←P.y；前/后邻=锚点端⇒被动
 * （锚不动、被拖点钳锚轴坐标、沿法线自由伸缩=短桩伸缩）。
 */
export function dragVertex(p: EditPolyline, idx: number, target: Pt): EditPolyline {
  const pts = fullPoints(p)
  const k = idx + 1 // 全链下标
  if (k < 1 || k > pts.length - 2) return p
  const prev = pts[k - 1]!
  const next = pts[k + 1]!
  const prevIsAnchor = k - 1 === 0
  const nextIsAnchor = k + 1 === pts.length - 1
  const via = p.via.map(dup)
  // 被拖点落点：先取 P；锚端被动约束按段轴回钳
  let self = dup(target)
  // 入段（prev→被拖点）：轴对齐取等值轴（竖直=x 相等/水平=y 相等——正交链）
  if (!eq(prev, pts[k]!)) {
    const inV = isVertical(prev, pts[k]!)
    if (prevIsAnchor) {
      // 锚被动：被拖点钳锚轴向坐标（竖直桩=x 锚定/y 伸缩；水平桩镜像）
      self = inV ? { x: prev.x, y: target.y } : { x: target.x, y: prev.y }
    } else if (inV) {
      via[idx - 1] = { x: target.x, y: via[idx - 1]!.y } // 前邻.x←P.x
    } else {
      via[idx - 1] = { x: via[idx - 1]!.x, y: target.y } // 前邻.y←P.y
    }
  }
  // 出段（被拖点→next）
  if (!eq(pts[k]!, next)) {
    const outV = isVertical(pts[k]!, next)
    if (nextIsAnchor) {
      // 锚被动：钳锚轴（同上镜像——以出段轴向为准）
      self = outV ? { x: next.x, y: self.y } : { x: self.x, y: next.y }
    } else if (outV) {
      via[idx + 1] = { x: self.x, y: via[idx + 1]!.y } // 后邻.x←P.x
    } else {
      via[idx + 1] = { x: via[idx + 1]!.x, y: self.y } // 后邻.y←P.y
    }
  }
  via[idx] = self
  return { anchorA: p.anchorA, anchorB: p.anchorB, via: via as LineageViaPoint[] }
}

/**
 * 拖段中（§2.3-2）：段=via 内点对（序 0..via.length-2——锚端短桩段不参与）；
 * 整段平移=两端拐点绝对位移同量；相邻段伸缩（其余点不动）。
 */
export function dragSegment(p: EditPolyline, segIdx: number, dx: number, dy: number): EditPolyline {
  if (segIdx < 0 || segIdx > p.via.length - 2) return p
  const via = p.via.map(dup)
  via[segIdx] = { x: via[segIdx]!.x + dx, y: via[segIdx]!.y + dy }
  via[segIdx + 1] = { x: via[segIdx + 1]!.x + dx, y: via[segIdx + 1]!.y + dy }
  return { anchorA: p.anchorA, anchorB: p.anchorB, via: via as LineageViaPoint[] }
}

/**
 * 全链段序→via 内点对序（[回炉 R4]）：全链段 0=锚 A 短桩/末（序 via.length）
 * =锚 B 短桩——两 stub 段均不参与（null=调用方 return）；中段 i∈
 * [1, via.length-1] → via 内点对 i−1。
 */
export function segmentViaIdx(p: EditPolyline, fullSegIdx: number): number | null {
  if (fullSegIdx < 1 || fullSegIdx > p.via.length - 1) return null
  return fullSegIdx - 1
}

/**
 * 拖段投影+磁吸（[回炉 R3]——自由路径按段轴取法向分量）：
 * - 位移投影：水平段仅 dy/竖直段仅 dx（法向分量——指针斜移的切向分量丢弃）；
 *   斜段（拖开中途的非正交态）/重合段/短桩界外=不参与（原样 via）。
 * - 磁吸输入点=被拖段几何（段中点+投影位移——非指针轨迹中点）；
 *   吸附位移=snap 点对段原位差（snap 中点−原中点，按位移施加于整段）。
 */
export function segmentDrag(
  p: EditPolyline,
  segIdx: number,
  dx: number,
  dy: number,
  ch: Channels
): { via: LineageViaPoint[]; snap: { axis: 'h' | 'v'; line: number } | null } {
  if (segIdx < 0 || segIdx > p.via.length - 2) return { via: p.via, snap: null }
  const a = p.via[segIdx]!
  const b = p.via[segIdx + 1]!
  if (eq(a, b)) return { via: p.via, snap: null } // 重合段无轴向
  let proj: { dx: number; dy: number }
  if (a.y === b.y) proj = { dx: 0, dy } // 水平段：法向=竖直
  else if (a.x === b.x) proj = { dx, dy: 0 } // 竖直段：法向=水平
  else return { via: p.via, snap: null } // 斜段禁拖
  let via = dragSegment(p, segIdx, proj.dx, proj.dy).via
  const m0 = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } // 段原位中点
  // [RR3] 磁吸切向过滤：候选通道按段轴正交筛（水平段仅横通道/竖直段仅竖
  // 通道）——跨轴候选吸附会注入段轴切向位移（水平段被横移=相邻段拉斜）
  const axisCh: Channels = a.y === b.y ? { horizontal: ch.horizontal, vertical: [] } : { horizontal: [], vertical: ch.vertical }
  const snap = channelSnap({ x: m0.x + proj.dx, y: m0.y + proj.dy }, axisCh)
  if (snap.snapped) {
    via = dragSegment(p, segIdx, snap.p.x - m0.x, snap.p.y - m0.y).via
    return { via, snap: { axis: snap.axis!, line: snap.axis === 'h' ? snap.p.y : snap.p.x } }
  }
  return { via, snap: null }
}

/**
 * 加点（§2.3-3）：全链段 segIdx（0=锚 A→v0；末=末 v→锚 B）中点插入共线点
 * （初始共线渲染无差异、数据与手柄在场——§2.2 B-2）。
 */
export function addPointOnSegment(p: EditPolyline, segIdx: number): EditPolyline {
  const pts = fullPoints(p)
  if (segIdx < 0 || segIdx > pts.length - 2) return p
  const a = pts[segIdx]!
  const b = pts[segIdx + 1]!
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
  const via = p.via.map(dup)
  via.splice(segIdx, 0, mid as LineageViaPoint) // 段 i 的 via 插位=i（含锚 A 邻段=首插）
  return { anchorA: p.anchorA, anchorB: p.anchorB, via: via as LineageViaPoint[] }
}

/** via 链内共线中点消除（直删判定：prev→点→next 同轴同向共线） */
const collinearAt = (pts: readonly Pt[], k: number): boolean => {
  const a = pts[k - 1]!
  const b = pts[k]!
  const c = pts[k + 1]!
  if (eq(a, b) || eq(b, c)) return false // 重合点交由后续防御剔除
  if (a.x !== b.x && a.y !== b.y) return false
  if (b.x !== c.x && b.y !== c.y) return false
  // 同轴且同向共线（横：a.y=b.y=c.y；竖：a.x=b.x=c.x）
  return a.x === b.x && b.x === c.x ? true : a.y === b.y && b.y === c.y
}

/** 内部共线链清理（stripCollinear 同义——via 域数据面清理，渲染面纯省略不变） */
function stripInterior(via: readonly LineageViaPoint[]): LineageViaPoint[] {
  const pts = via.map(dup)
  let i = 1
  while (i < pts.length - 1) {
    if (collinearAt(pts, i)) pts.splice(i, 1)
    else i++
  }
  return pts.filter((p, j, arr) => j === 0 || !eq(p, arr[j - 1]!)) as LineageViaPoint[]
}

/**
 * 删点（§2.3-4 分治）：
 * - 共线中点（加点未拖开态）→ 直接移除无几何变化；
 * - 真拐点 → 邻点 L 形重连（入横⇒新拐=(后邻.x, 前邻.y)；入竖⇒(前邻.x,
 *   后邻.y)）替换被删点+重连后新产生共线邻点顺带消除（正交不变量下 L 角=
 *   原拐位——轴保持式 D-L2/B-1）；
 * - via 删空 ⇒ 回自动路由（via=undefined）。
 */
export function deleteVertex(p: EditPolyline, idx: number): EditPolyline {
  if (idx < 0 || idx >= p.via.length) return p
  const pts = fullPoints(p)
  const k = idx + 1
  if (collinearAt(pts, k)) {
    const via = p.via.filter((_, i) => i !== idx)
    return { anchorA: p.anchorA, anchorB: p.anchorB, via: via.length > 0 ? via : undefined } as EditPolyline
  }
  // 真拐点：L 重连（入段轴保持）
  const prev = pts[k - 1]!
  const next = pts[k + 1]!
  const inV = eq(prev, pts[k]!) ? false : isVertical(prev, pts[k]!)
  const corner = inV ? { x: prev.x, y: next.y } : { x: next.x, y: prev.y }
  const via = p.via.map(dup)
  via[idx] = corner as LineageViaPoint
  const cleaned = stripInterior(via)
  return {
    anchorA: p.anchorA,
    anchorB: p.anchorB,
    via: cleaned.length > 0 ? cleaned : undefined
  } as EditPolyline
}

/**
 * 端点重连（§2.3-6）：via 全保留+首/末段按新锚 L 重正交（入轴=新锚短桩法线
 * 向）；新锚侧横（left/right）⇒插入首拐 (V.x, A.y)；竖（top/bottom）⇒
 * (A.x, V.y)；同轴直达=零插入。锚位承载=via 首点（corner）——渲染锚选择
 * selectAnchor(src, via[0]) 自然命中新锚侧（LineageEdge 无锚字段——呈现层
 * 命中态不持久化，申报）。
 */
export function reconnectEnd(
  p: EditPolyline,
  end: 'from' | 'to',
  newAnchor: Pt,
  side: Side
): EditPolyline {
  const via = p.via.map(dup)
  const target = end === 'from' ? via[0] : via[via.length - 1]
  if (target === undefined) return p
  const horizontalSide = side === 'left' || side === 'right'
  const corner = horizontalSide ? { x: target.x, y: newAnchor.y } : { x: newAnchor.x, y: target.y }
  const aligned = horizontalSide ? corner.y === target.y : corner.x === target.x
  if (!eq(corner, target) && !aligned) {
    if (end === 'from') via.unshift(corner as LineageViaPoint)
    else via.push(corner as LineageViaPoint)
  }
  return { anchorA: end === 'from' ? newAnchor : p.anchorA, anchorB: end === 'to' ? newAnchor : p.anchorB, via: via as LineageViaPoint[] }
}

/** 通道集（磁吸候选中线——内容坐标；横=行隙/框间带、竖=列缝） */
export interface Channels {
  horizontal: number[]
  vertical: number[]
}

/** 磁吸半径（§2.3-7 ±6——内容坐标） */
export const SNAP_R = 6

/** 磁吸判定（先横后竖并列取近）：返回吸附点+吸附轴（snapped=false=原点） */
export function channelSnap(p: Pt, ch: Channels): { p: Pt; axis: 'h' | 'v' | null; snapped: boolean } {
  let bestAxis: 'h' | 'v' | null = null
  let bestLine: number | null = null
  let bestD = SNAP_R
  // 优先级：横先（并列差值取近——横竖同差取横[N-2 先横后竖]）
  for (const y of ch.horizontal) {
    const d = Math.abs(p.y - y)
    if (d < bestD || (d === bestD && bestAxis === null)) {
      bestD = d
      bestAxis = 'h'
      bestLine = y
    }
  }
  for (const x of ch.vertical) {
    const d = Math.abs(p.x - x)
    // [RR6] 恰 SNAP_R 边界两轴对称（原竖环严格小于才胜=恰 6 不吸附的不对称）；
    // 并列=横胜保持（bestAxis==='h' 时同差不夺——先横后竖）
    if (d < bestD || (d === bestD && bestAxis === null)) {
      bestD = d
      bestAxis = 'v'
      bestLine = x
    }
  }
  if (bestAxis === null || bestLine === null) return { p, axis: null, snapped: false }
  return {
    p: bestAxis === 'h' ? { x: p.x, y: bestLine } : { x: bestLine, y: p.y },
    axis: bestAxis,
    snapped: true
  }
}

/** 穿卡警示命中段（§2.3-8/PAD=4 口径）：返回穿卡段序（全链段序）；源/目标
 *  卡=excluded（短桩贴卡放行——avoid stubExcluded 同义）；零持久化（渲染期） */
export function crossCardSegments(
  p: EditPolyline,
  cards: readonly Rect[],
  excluded: readonly Rect[]
): number[] {
  const pts = fullPoints(p)
  if (hasDupNeighbor(pts)) return []
  const thirdParty = cards.filter(
    (c) => !excluded.some((e) => e.x === c.x && e.y === c.y && e.w === c.w && e.h === c.h)
  )
  const hits: number[] = []
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]!
    const b = pts[i + 1]!
    if (eq(a, b)) continue
    const puffed = thirdParty.map((c) => ({ x: c.x - PAD, y: c.y - PAD, w: c.w + 2 * PAD, h: c.h + 2 * PAD }))
    if (puffed.some((r) => segHitsRect(a, b, r))) hits.push(i)
  }
  return hits
}
