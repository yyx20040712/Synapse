/**
 * [F-LGRAPH-01②U5] edge-edit —— 手动调线编辑代数（单源=F-LINEAGE-02
 * design-final §2.3——本件为实现真相源；纯函数零 DOM import）。
 * [F-LANEGRID-01 B3b §11-1 甲] manual 线入网格：磁吸目标=车道格（buildLaneTable
 * 坐标族——最近车道交点/法向单轴线，容差 8px=LANE_PITCH；旧通道中线磁吸
 * ±6 随 channelsFrom 退役）+提交门格点/正交校验纯函数驻本件（门接线=
 * edge-via-commit）。
 *
 * 全点链=[anchorA, ...via, anchorB]（内容坐标）；锚端=被动（不随拖动迁移）
 * ——首末拐点联动止于短桩（§2.3-1）；via 不变量（正交/无重合/≥1）由编辑
 * 代数保证（service 序列化校验兜底）。确定性红线：无随机/无 Date/无三角。
 */
import type { LineageViaPoint } from '@shared/models/lineage'
import type { Pt, Rect, Side } from './routing/anchors'
import { segHitsRect, PAD } from './routing/avoid'
import { LANE_PITCH } from './routing/grid'

/** 编辑代数输入（全点链拆分形） */
export interface EditPolyline {
  anchorA: Pt
  anchorB: Pt
  via: LineageViaPoint[]
}

const eq = (a: Pt, b: Pt): boolean => a.x === b.x && a.y === b.y
const dup = (p: Pt): Pt => ({ x: p.x, y: p.y })

/** 全点链展开（代数判定工作形） */
function fullPoints(p: EditPolyline): Pt[] {
  return [p.anchorA, ...p.via, p.anchorB]
}

const isVertical = (a: Pt, b: Pt): boolean => a.x === b.x

/** [RR 补批 RR13] via 链等值判定（no-op 短路——拖放回原位零编辑单元；
 *  坐标精确等值：正交链编辑代数产出与回放同源值，无浮点漂移面。
 *  [RRB5] z 口径：z=1 精确等值（拖回原位必短路）；z≠1 逆变换往返可注入
 *  浮点漂移=等值 miss 退化旧行为（真编辑单元写入——可接受，no-op 非承诺） */
export function viaEquals(a: LineageViaPoint[], b: LineageViaPoint[]): boolean {
  return a.length === b.length && a.every((p, i) => p.x === b[i]!.x && p.y === b[i]!.y)
}

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
 * 拖段投影+磁吸（[回炉 R3]——自由路径按段轴取法向分量；[F-LANEGRID-01 B3b]
 * 磁吸目标=车道格线——水平段 y 吸最近 h 道/竖直段 x 吸最近 v 道，容差
 * LANE_SNAP_R=8）：
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
  lines: LaneLines
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
  // [RR3] 磁吸切向过滤沿承：水平段仅 h 道/竖直段仅 v 道——跨轴吸附会注入
  // 段轴切向位移（水平段被横移=相邻段拉斜）；且保端点格封闭（竖直段 x 吸
  // v 道使两端拐点随 Δx 同落 v 道，y 原值保 h 道）
  const axis: 'h' | 'v' = a.y === b.y ? 'h' : 'v'
  const line = laneSnapAxis({ x: m0.x + proj.dx, y: m0.y + proj.dy }, axis, lines)
  if (line !== null) {
    via = dragSegment(p, segIdx, axis === 'h' ? 0 : line - m0.x, axis === 'h' ? line - m0.y : 0).via
    return { via, snap: { axis, line } }
  }
  return { via, snap: null }
}

/**
 * 加点（§2.3-3）：全链段 segIdx（0=锚 A→v0；末=末 v→锚 B）中点插入共线点
 * （初始共线渲染无差异、数据与手柄在场——§2.2 B-2）。[F-LANEGRID-01 B3b]
 * snapMid 注入时插入点=最近车道交点（无条件——新点必须落格，段中点未必
 * 在格上；缺省=原段中点〔纯代数默认，门不涉〕）。
 */
export function addPointOnSegment(p: EditPolyline, segIdx: number, snapMid?: (mid: Pt) => Pt): EditPolyline {
  const pts = fullPoints(p)
  if (segIdx < 0 || segIdx > pts.length - 2) return p
  const a = pts[segIdx]!
  const b = pts[segIdx + 1]!
  const rawMid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
  const mid = snapMid !== undefined ? snapMid(rawMid) : rawMid
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
 * [ln-C3] 自动线物化拖段代数：单 via 链无 via 内点对——段拖族（segmentDrag）
 * 不适用；被拖几何=物化中点，位移=法向投影（水平骨架段仅 dy/竖直段仅 dx
 * ——斜段零位移，口径沿承 [回炉 R3]）。[F-LANEGRID-01 B3b §11-1 甲] 落点=
 * 无条件最近车道交点（物化=新点创建必须落格不受 8px 容差限——零位移物化
 * 亦然，保「按下即松手转换」可用；指示线=主修正轴）。
 */
export function materializedSegDrag(
  base: EditPolyline,
  start: Pt,
  target: Pt,
  lines: LaneLines
): { via: LineageViaPoint[]; snap: { axis: 'h' | 'v'; line: number } | null } {
  const mid = base.via[0]!
  const horiz = base.anchorA.y === base.anchorB.y
  if (!horiz && base.anchorA.x !== base.anchorB.x) return { via: [mid], snap: null } // 斜段零位移不吸附
  const p: Pt = horiz ? { x: mid.x, y: mid.y + (target.y - start.y) } : { x: mid.x + (target.x - start.x), y: mid.y }
  const snapped = nearestLaneIntersection(p, lines)
  const dx = Math.abs(snapped.x - p.x)
  const dy = Math.abs(snapped.y - p.y)
  const axis: 'h' | 'v' = dy >= dx ? 'h' : 'v' // 主修正轴（并列取横——先横沿承）
  return { via: [snapped], snap: { axis, line: axis === 'h' ? snapped.y : snapped.x } }
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

/** [F-LANEGRID-01 B3b §11-1 甲] 车道格线集（buildLaneTable 坐标投影——升序；
 *  v=竖道 x 坐标/h=横道 y 坐标。磁吸与提交门共用单源） */
export interface LaneLines {
  v: number[]
  h: number[]
}

/** [F-VISFB-66] 换端解锚半径缺省（§2.3-7 ±6 own 域——通道磁吸面已随 B3b
 *  车道格吸附退役，本常量仅剩 nearestAnchorCard 解锚默认消费） */
export const SNAP_R = 6

/** 拖拽吸附容差（=LANE_PITCH 8px——裁决① 甲「8px 磁吸替代 ±6 通道磁吸」） */
export const LANE_SNAP_R = LANE_PITCH

/** 提交门格点容差（0.6——e2e route-stress 采样容差 TOL 同值族：吸附/代数产出
 *  精确格点，容差面=锚端被动钳制坐标的量化残差（≤0.05）+历史浮点回放裕量） */
export const GRID_TOL = 0.6

/** 升序表最近坐标（并列取先——首见最小者，确定性并列规则） */
function nearestCoord(arr: readonly number[], v: number): number | null {
  let best: number | null = null
  let bestD = Infinity
  for (const c of arr) {
    const d = Math.abs(c - v)
    if (d < bestD) {
      bestD = d
      best = c
    }
  }
  return best
}

/**
 * 顶点拖拽磁吸：最近车道交点（x∈v 道 ∧ y∈h 道——欧氏距离最近=逐轴最近
 * 分离式；距交点 ≤ LANE_SNAP_R 才吸附，带外=原点自由〔提交门兜底拒写〕）。
 * 拖拽预览与松手落点同函数同参（INV-119② 所见即所得沿承）。
 */
export function laneSnapPoint(p: Pt, lines: LaneLines, r: number = LANE_SNAP_R): { p: Pt; snapped: boolean } {
  const x = nearestCoord(lines.v, p.x)
  const y = nearestCoord(lines.h, p.y)
  if (x === null || y === null) return { p, snapped: false }
  if (Math.hypot(x - p.x, y - p.y) > r) return { p, snapped: false }
  return { p: { x, y }, snapped: true }
}

/** 无条件最近车道交点（加点插入/自动线物化——新点必须落格，不受容差限） */
export function nearestLaneIntersection(p: Pt, lines: LaneLines): Pt {
  const x = nearestCoord(lines.v, p.x) ?? p.x
  const y = nearestCoord(lines.h, p.y) ?? p.y
  return { x, y }
}

/** 法向单轴磁吸（段拖/物化段轴过滤——水平段 y 吸 h 道/竖直段 x 吸 v 道；
 *  带外=null 自由投影） */
export function laneSnapAxis(p: Pt, axis: 'h' | 'v', lines: LaneLines, r: number = LANE_SNAP_R): number | null {
  const c = nearestCoord(axis === 'h' ? lines.h : lines.v, axis === 'h' ? p.y : p.x)
  if (c === null || Math.abs(c - (axis === 'h' ? p.y : p.x)) > r) return null
  return c
}

/**
 * 提交门格点/正交校验（裁决① 甲「人工调整必须受网格约束」；〔B3 回炉①
 * blocker〕anchors 提供时正交检面=**全点链**〔含端锚〕全部段——单 via 斜端
 * 段（锚→via→锚 两段均斜）不再漏检）：
 * - 逐 via 点在车道交点上（x∈v 道 ∧ y∈h 道，容差 GRID_TOL；端锚=卡派生
 *   坐标非格点域，不检——检面=via 点，任务口径「逐点」）；
 * - anchors 缺省（纯函数/探针面）=仅 via 链内部相邻段正交；anchors=[a,b]
 *   （路由同源锚派生〔钉定直取/主向定边〕——对齐 routeOne manual 分支）
 *   =全点链 [a, ...via, b] 全部段 |dx|≤tol 或 |dy|≤tol（提交门消费面）。
 * 返回 true=过检；字符串=中文拒绝 reason（调用方回弹零写）。
 */
export function validateViaOnGrid(
  via: readonly LineageViaPoint[],
  lines: LaneLines,
  anchors: readonly Pt[] = [],
  tol: number = GRID_TOL
): true | string {
  for (const p of via) {
    const x = nearestCoord(lines.v, p.x)
    const y = nearestCoord(lines.h, p.y)
    if (x === null || y === null || Math.abs(x - p.x) > tol || Math.abs(y - p.y) > tol) {
      return `via 路点不在车道格点上（(${String(p.x)},${String(p.y)})——人工调整须受网格约束）`
    }
  }
  const chain = [...anchors.slice(0, 1), ...via, ...anchors.slice(1)]
  for (let i = 1; i < chain.length; i++) {
    const a = chain[i - 1]!
    const b = chain[i]!
    if (Math.abs(a.x - b.x) > tol && Math.abs(a.y - b.y) > tol) {
      return `via 折线必须横平竖直（(${a.x},${a.y})→(${b.x},${b.y}) 斜向段）`
    }
  }
  return true
}

/** 穿卡警示命中段（§2.3-8/PAD=6 口径）：返回穿卡段序（全链段序）；源/目标
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

/**
 * [回炉 R16] 换端落点分类纯函数（设计书 §C.3 终裁修正分层表——按卡身份分格）。
 * 输入：解锚命中（null=未命中锚）+光标 own 点+本端/对端卡 id+本端拖前锚 pt+
 * 全卡 rect。输出动作枚举（UI 仅执行，判定单源驻本件可直测）。
 */
export type ReconnectAnchorRef = { side: Side; slot: 0 | 1 | 2 }

export type ReconnectDropAction =
  /** 本端卡同锚=无操作取消（零编辑单元——RR13 短路沿承） */
  | { kind: 'no-op' }
  /** 本端卡异锚=合法换锚（端点身份变更——终裁修正恢复 C1a 口径） */
  | { kind: 're-anchor'; anchor: ReconnectAnchorRef }
  /** 对端卡任意落点=自环静默取消（store 侧 self-loop 判兜底） */
  | { kind: 'self-loop-silent' }
  /** 第三卡锚=合法换端 */
  | { kind: 'reconnect'; anchor: ReconnectAnchorRef }
  /** 第三卡非锚区=toast 落点未在连接点上+取消 */
  | { kind: 'toast-blank' }
  /** 本端/对端卡非锚区与空白=静默取消 */
  | { kind: 'silent' }

export function classifyReconnectDrop(args: {
  anchorHit: { nodeId: string; anchor: ReconnectAnchorRef; pt: Pt } | null
  cursor: Pt
  ownNode: string
  otherNode: string
  ownHomePt: Pt
  cards: ReadonlyArray<{ nodeId: string; rect: Rect }>
  snapR: number
}): ReconnectDropAction {
  const { anchorHit, cursor, ownNode, otherNode, ownHomePt, cards, snapR } = args
  if (anchorHit === null) {
    // 非锚区分层：第三卡膨胀圈内=toast；本端/对端卡与空白=静默
    const hitRect = (c: { rect: Rect }): boolean =>
      cursor.x >= c.rect.x - snapR &&
      cursor.x <= c.rect.x + c.rect.w + snapR &&
      cursor.y >= c.rect.y - snapR &&
      cursor.y <= c.rect.y + c.rect.h + snapR
    const thirdCard = cards.some(
      (c) => c.nodeId !== ownNode && c.nodeId !== otherNode && hitRect(c)
    )
    return thirdCard ? { kind: 'toast-blank' } : { kind: 'silent' }
  }
  const a = anchorHit
  if (a.nodeId === ownNode) {
    // 本端卡：同锚=无操作（pt 等值判——拖回原位零编辑单元）；异锚=换锚
    if (a.pt.x === ownHomePt.x && a.pt.y === ownHomePt.y) return { kind: 'no-op' }
    return { kind: 're-anchor', anchor: a.anchor }
  }
  if (a.nodeId === otherNode) return { kind: 'self-loop-silent' }
  return { kind: 'reconnect', anchor: a.anchor }
}
