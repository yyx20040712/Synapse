/**
 * [F-LANEGRID-01 B3] rerun —— 重算触发分类与执行计划纯函数（设计稿 §6.4
 * 触发分类——审查 M5：v1「inputs 引用变+布局未变」过宽，改按 edgeId+几何
 * 字段 diff；§6.3 carried 载入占用。B3 回炉：纯增删边=changed 仅增删 id
 * 〔其余边 carried 引用复用〕；渲染组结构变不作为全局信号〔月分组变属帧
 * 差分域——§6.2，全局域仅 uiScale 档变/W 变/空图复位/首算〕）。消费面=
 * use-lineage-routes（hook 保留 refs/rAF 合并/RO/发布等副作用面，本件承载
 * 全部决策）：
 * - classifyInputDiff=前次/本次 EdgeGeomInput[] 逐位 diff：equal（几何面
 *   全等——视觉字段-only〔线名/颜色/虚线不入 EdgeGeomInput〕或纯重复触发）/
 *   via-only（恰一条边 via 变、端点/钉锚/边集/序不变）/structural：同序时
 *   changed=字段变化边；异序时**纯增/纯删**（公共边相对序保持）=changed 仅
 *   增删 id（新增边无 prev 路径恒入计算集、删除边不在边集自然出局——其余
 *   边 carried 引用复用）；公共边相对序变化或增删并存=保守全集（边序=DB
 *   created_at,rowid 承载的分配优先序，序变=全图语义变）。
 * - planRerun 三模：zero（inputs 全等+快照全等+全局信号未变=零重算，paths
 *   引用整体复用）；single（via-only+布局未变=routeEdge 单边重投影+其余边
 *   carried=当前占用快照+引用复用——不经全图 routeAll）；full（其余=全局
 *   信号〔uiScale 档变——值差〕∪ 布局变化 → computeRerouteScope 计算集
 *   +routeAll）。via-only 边在 full 模式经 force 恒入计算集（布局变同帧
 *   承接）。确定性红线沿承；纯函数零 DOM import。
 */
import type { LineageAnchor, LineageViaPoint } from '@shared/models/lineage'
import type { EdgeGeomInput, LayoutSnapshot, RoutedPath } from './chain'
import { computeRerouteScope, rectEq, SCOPE_EPS, type RerouteScope } from './scope'

/** 触发分类（changed=变化边 id 集——full 模式经 force 传入计算集） */
export type InputDiff =
  | { kind: 'equal'; changed: ReadonlySet<string> }
  | { kind: 'via-only'; changed: ReadonlySet<string>; edgeId: string; input: EdgeGeomInput }
  | { kind: 'structural'; changed: ReadonlySet<string> }

const anchorEq = (a: LineageAnchor | undefined, b: LineageAnchor | undefined): boolean =>
  a === b || (a !== undefined && b !== undefined && a.side === b.side && a.slot === b.slot)

const viaEq = (a: LineageViaPoint[] | undefined, b: LineageViaPoint[] | undefined): boolean => {
  if (a === b) return true
  if (a === undefined || b === undefined || a.length !== b.length) return false
  return a.every((p, i) => p.x === b[i]!.x && p.y === b[i]!.y)
}

/** 除 via 外全等（edgeId/端点/双锚——via-only 判据） */
function equalExceptVia(a: EdgeGeomInput, b: EdgeGeomInput): boolean {
  return (
    a.edgeId === b.edgeId &&
    a.sourceId === b.sourceId &&
    a.targetId === b.targetId &&
    anchorEq(a.fromAnchor, b.fromAnchor) &&
    anchorEq(a.toAnchor, b.toAnchor)
  )
}

/** 全字段等（含 via 深等） */
function geomEqual(a: EdgeGeomInput, b: EdgeGeomInput): boolean {
  return equalExceptVia(a, b) && viaEq(a.via, b.via)
}

/** edgeId+几何字段 diff 分类（prev=null=首算 structural 全集；纯增删=
 *  changed 仅增删 id——其余边 carried 引用复用；公共边相对序变化或增删
 *  并存=保守全集） */
export function classifyInputDiff(
  prev: readonly EdgeGeomInput[] | null,
  next: readonly EdgeGeomInput[]
): InputDiff {
  if (prev === null) return { kind: 'structural', changed: new Set(next.map((e) => e.edgeId)) }
  if (prev.length === next.length && prev.every((e, i) => e.edgeId === next[i]!.edgeId)) {
    const changed = new Set<string>()
    let diffs = 0
    let viaCandidate: EdgeGeomInput | null = null
    let viaShaped = true
    for (let i = 0; i < next.length; i++) {
      const a = prev[i]!
      const b = next[i]!
      if (geomEqual(a, b)) continue
      changed.add(b.edgeId)
      diffs++
      if (!equalExceptVia(a, b)) viaShaped = false
      else if (viaCandidate === null) viaCandidate = b
    }
    if (diffs === 0) return { kind: 'equal', changed }
    if (diffs === 1 && viaShaped && viaCandidate !== null) {
      return { kind: 'via-only', changed, edgeId: viaCandidate.edgeId, input: viaCandidate }
    }
    return { kind: 'structural', changed }
  }
  // 边集差：公共边相对序保持且单侧增删=纯增/纯删（changed=增删 id ∪ 公共
  //  边几何变化 id——增删与公共边修改同批时漏比公共边=旧路径 carried 直通
  //  的混合 diff 回归，审查 mixed-diff-probe）；序变/增删并存=保守全集
  // （边序=分配优先序）
  const prevIds = new Set(prev.map((e) => e.edgeId))
  const nextIds = new Set(next.map((e) => e.edgeId))
  const prevById = new Map(prev.map((e) => [e.edgeId, e] as const))
  const added = next.filter((e) => !prevIds.has(e.edgeId)).map((e) => e.edgeId)
  const removed = prev.filter((e) => !nextIds.has(e.edgeId)).map((e) => e.edgeId)
  const commonPrev = prev.filter((e) => nextIds.has(e.edgeId)).map((e) => e.edgeId)
  const commonEdgesNext = next.filter((e) => prevIds.has(e.edgeId))
  const commonNext = commonEdgesNext.map((e) => e.edgeId)
  const orderKept = commonPrev.every((id, i) => id === commonNext[i])
  if (orderKept && (added.length === 0 || removed.length === 0)) {
    const commonChanged = commonEdgesNext
      .filter((e) => !geomEqual(prevById.get(e.edgeId)!, e))
      .map((e) => e.edgeId)
    return { kind: 'structural', changed: new Set([...added, ...removed, ...commonChanged]) }
  }
  const all = new Set<string>()
  for (const e of prev) all.add(e.edgeId)
  for (const e of next) all.add(e.edgeId)
  return { kind: 'structural', changed: all }
}

/** 布局快照全等（帧/卡/标注/年份头/尺寸 ε 等——「布局未变」判定单源） */
export function snapshotsEqual(a: LayoutSnapshot, b: LayoutSnapshot): boolean {
  if (a.contentW !== b.contentW || Math.abs(a.contentH - b.contentH) > SCOPE_EPS) return false
  if (a.frames.length !== b.frames.length) return false
  for (let i = 0; i < a.frames.length; i++) {
    const fa = a.frames[i]!
    const fb = b.frames[i]!
    if (fa.frameKey !== fb.frameKey || fa.year !== fb.year || !rectEq(fa, fb)) return false
  }
  if (a.cards.size !== b.cards.size) return false
  for (const [id, r] of a.cards) {
    const rb = b.cards.get(id)
    if (rb === undefined || !rectEq(r, rb)) return false
    if ((a.cardFrame.get(id) ?? null) !== (b.cardFrame.get(id) ?? null)) return false
  }
  if (a.labels.length !== b.labels.length || a.yearHeads.length !== b.yearHeads.length) return false
  for (let i = 0; i < a.labels.length; i++) if (!rectEq(a.labels[i]!, b.labels[i]!)) return false
  for (let i = 0; i < a.yearHeads.length; i++) if (!rectEq(a.yearHeads[i]!, b.yearHeads[i]!)) return false
  return true
}

/** 前次运行面（hook ref 持有——快照/输入/路径/全局信号键。〔B3 回炉③〕
 *  渲染组结构不入全局信号——月分组变（底部新增月等）由快照 frameKey/帧
 *  差分承载（§6.2 月域语义），全局域仅 uiScale 档变/W 变/空图复位/首算） */
export interface RerunPrev {
  snap: LayoutSnapshot
  inputs: readonly EdgeGeomInput[]
  paths: readonly RoutedPath[]
  uiScale?: number
}

/** 执行计划：zero=零重算（paths 引用整体复用）；single=单边重投影
 *  （input=变化边新输入，carried=其余边路径〔当前占用快照〕，keep=按
 *  edgeId 的引用复用表）；full=计算集 routeAll（carried=集外边路径） */
export type RerunPlan =
  | { mode: 'zero' }
  | { mode: 'single'; input: EdgeGeomInput; carried: ReadonlyArray<RoutedPath>; keep: ReadonlyMap<string, RoutedPath> }
  | { mode: 'full'; carried: ReadonlyArray<RoutedPath>; scope: RerouteScope }

/** 单次重算触发决策（纯函数：同输入恒同计划） */
export function planRerun(args: {
  prev: RerunPrev | null
  snap: LayoutSnapshot
  inputs: readonly EdgeGeomInput[]
  uiScale?: number
}): RerunPlan {
  const prev = args.prev
  if (prev === null) {
    return { mode: 'full', carried: [], scope: computeRerouteScope(null, args.snap, args.inputs, [], { global: true }) }
  }
  const diff = classifyInputDiff(prev.inputs, args.inputs)
  // 全局信号仅 uiScale 档变（值差）——组结构变/W 变/空图复位由快照差分与
  // scope 内部判定承载（〔B3 回炉③〕月分组变属帧差分域）
  const global = args.uiScale !== prev.uiScale
  if (!global && snapshotsEqual(prev.snap, args.snap)) {
    if (diff.kind === 'equal') return { mode: 'zero' }
    if (diff.kind === 'via-only') {
      const keep = new Map(prev.paths.map((p) => [p.edgeId, p] as const))
      keep.delete(diff.edgeId)
      return { mode: 'single', input: diff.input, carried: [...keep.values()], keep }
    }
  }
  const scope = computeRerouteScope(prev.snap, args.snap, args.inputs, prev.paths, { global, force: diff.changed })
  return { mode: 'full', carried: [...scope.carried.values()], scope }
}
