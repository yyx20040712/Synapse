/**
 * [F-LANEGRID-01 B3] 触发分类与重跑计划契约测试（票号 F-LANEGRID-01 B3；
 * 设计稿 §6.4 触发分类——审查 M5：按 edgeId+几何字段 diff，非 inputs 引用
 * 变；§6.3 carried 载入占用）。classifyInputDiff=前次/本次 EdgeGeomInput[]
 * 逐位 diff（equal/via-only/structural）；planRerun=zero（视觉字段-only 零
 * 重算）/single（via-only 单边重投影+其余引用复用）/full（计算集+routeAll）
 * 三模；routeAll carried 直通=集外边输出逐字节不变（引用复用）+错峰计数
 * 预载（carried 非直连边计入 stubSeq——集内同锚边指派与全图边序对齐）。
 * 期望值按 B2a allocate 契约夹具手推。always-active 裸 describe。
 */
import { describe, expect, it } from 'vitest'
import type { LineageAnchor } from '../../../src/shared/models/lineage'
import {
  classifyInputDiff,
  planRerun,
  routeAll,
  snapshotsEqual,
  type EdgeGeomInput,
  type LayoutSnapshot,
  type MonthFrame,
  type RerunPrev
} from '../../../src/renderer/features/lineage/lineage-routing'
import type { Rect } from '../../../src/renderer/features/lineage/routing/anchors'

const rect = (x: number, y: number, w = 128, h = 72): Rect => ({ x, y, w, h })
const an = (side: LineageAnchor['side'], slot: 0 | 1 | 2): LineageAnchor => ({ side, slot })
const noop = (): void => undefined

/** F2 双行单列夹具（B2a 同款）：T(12,18)/A(12,162)、帧 k [0,450]×[0,250] */
const F2: LayoutSnapshot = {
  cards: new Map([
    ['T', rect(12, 18)],
    ['A', rect(12, 162)]
  ]),
  cardFrame: new Map([
    ['T', 'k'],
    ['A', 'k']
  ]),
  labels: [],
  yearHeads: [],
  frames: [{ x: -1.6, y: 0, w: 453.2, h: 250, year: null, frameKey: 'k' }],
  contentW: 450,
  contentH: 300
}

/** F7 错峰夹具（B2a 同款）：S(12,18)/A(12,162)/G(212,162)——同源锚 8 道走廊 */
const F7: LayoutSnapshot = {
  cards: new Map([
    ['S', rect(12, 18)],
    ['A', rect(12, 162)],
    ['G', rect(212, 162)]
  ]),
  cardFrame: new Map([
    ['S', 'k'],
    ['A', 'k'],
    ['G', 'k']
  ]),
  labels: [],
  yearHeads: [],
  frames: [{ x: -1.6, y: 0, w: 453.2, h: 250, year: null, frameKey: 'k' }],
  contentW: 450,
  contentH: 300
}

const geom = (id: string, from: string, to: string, via?: Array<{ x: number; y: number }>): EdgeGeomInput => ({
  edgeId: id,
  sourceId: from,
  targetId: to,
  ...(via !== undefined ? { via } : {})
})

describe('F-LANEGRID-01 B3：classifyInputDiff（edgeId+几何字段 diff——审查 M5 口径）', () => {
  const base: EdgeGeomInput[] = [geom('e1', 'T', 'A'), geom('e2', 'A', 'G', [{ x: 100, y: 100 }])]

  it('equal：全字段等（含 via 深等）→ equal、changed 空（新数组引用不触发——视觉字段不入 EdgeGeomInput）', () => {
    const again = [geom('e1', 'T', 'A'), geom('e2', 'A', 'G', [{ x: 100, y: 100 }])]
    expect(classifyInputDiff(base, again)).toEqual({ kind: 'equal', changed: new Set() })
  })

  it('via-only：恰一条边 via 变、端点/锚/边集/序不变 → via-only（changed={该边}+input 引用=新输入）', () => {
    const next = [geom('e1', 'T', 'A'), geom('e2', 'A', 'G', [{ x: 108, y: 100 }])]
    const d = classifyInputDiff(base, next)
    expect(d.kind).toBe('via-only')
    if (d.kind !== 'via-only') return
    expect(d.edgeId).toBe('e2')
    expect(d.changed).toEqual(new Set(['e2']))
    expect(d.input).toBe(next[1])
  })

  it('via→null（重置回自动）也属 via-only（via 字段差——单边重投影承载自动分配）', () => {
    const next = [geom('e1', 'T', 'A'), geom('e2', 'A', 'G')]
    expect(classifyInputDiff(base, next).kind).toBe('via-only')
  })

  it('两条边 via 变 → structural（恰一才 via-only）', () => {
    const next = [geom('e1', 'T', 'G', [{ x: 50, y: 50 }]), geom('e2', 'A', 'G', [{ x: 108, y: 100 }])]
    const d = classifyInputDiff(base, next)
    expect(d.kind).toBe('structural')
    expect(d.changed).toEqual(new Set(['e1', 'e2']))
  })

  it('换端/锚变/序变/增删并存 → structural（changed 覆盖变化边；序变/混合=全集保守）', () => {
    expect(classifyInputDiff(base, [geom('e1', 'T', 'G'), geom('e2', 'A', 'G', [{ x: 100, y: 100 }])]).kind).toBe('structural')
    const anchored: EdgeGeomInput[] = [{ ...geom('e1', 'T', 'A'), fromAnchor: an('bottom', 1) }, base[1]!]
    expect(classifyInputDiff(base, anchored).kind).toBe('structural')
    const swapped = [base[1]!, base[0]!]
    const d = classifyInputDiff(base, swapped)
    expect(d.kind).toBe('structural')
    expect(d.changed).toEqual(new Set(['e1', 'e2'])) // 公共边相对序变=边序（分配优先序）语义变——全集保守
    // 增删并存（一增一删）→ 全集保守
    expect(classifyInputDiff(base, [base[0]!, geom('e9', 'T', 'G')]).changed).toEqual(new Set(['e1', 'e2', 'e9']))
  })

  it('[B3 回炉②] 纯增边：changed 仅新增 id（中位插入同判——公共边相对序保持）', () => {
    const tail = classifyInputDiff(base, [...base, geom('e3', 'T', 'G')])
    expect(tail.kind).toBe('structural')
    expect(tail.changed).toEqual(new Set(['e3']))
    const mid = classifyInputDiff(base, [base[0]!, geom('e3', 'T', 'G'), base[1]!])
    expect(mid.changed).toEqual(new Set(['e3'])) // 公共边 e1→e2 相对序保持=纯增
  })

  it('[B3 回炉②] 纯删边：changed 仅被删 id', () => {
    const d = classifyInputDiff(base, [base[0]!])
    expect(d.kind).toBe('structural')
    expect(d.changed).toEqual(new Set(['e2']))
  })

  it('[B3 回炉② 混合 diff] 增/删边与公共边几何修改同批 → 公共变化边并入 changed（漏比=旧路径 carried 直通回归）', () => {
    // 新增 e3 + e2 via 变（公共边几何变化——base e2 via=(100,100)→(164,100)）→ changed={e2,e3}，e1 不动
    const addWithVia = classifyInputDiff(base, [base[0]!, geom('e2', 'A', 'G', [{ x: 164, y: 100 }]), geom('e3', 'T', 'G')])
    expect(addWithVia.kind).toBe('structural')
    expect(addWithVia.changed).toEqual(new Set(['e2', 'e3']))
    // 删除 e2 + e1 锚变 → changed={e1,e2}
    const delWithAnchor: EdgeGeomInput[] = [{ ...geom('e1', 'T', 'A'), fromAnchor: an('bottom', 1) }]
    const d = classifyInputDiff(base, delWithAnchor)
    expect(d.kind).toBe('structural')
    expect(d.changed).toEqual(new Set(['e1', 'e2']))
  })

  it('prev=null（首算）→ structural（changed=全集）', () => {
    const d = classifyInputDiff(null, base)
    expect(d.kind).toBe('structural')
    expect(d.changed).toEqual(new Set(['e1', 'e2']))
  })
})

describe('F-LANEGRID-01 B3：snapshotsEqual（布局不变判定）', () => {
  it('快照全等（含 0.05 亚阈漂移）→ true；卡移 1px/帧高变 1px/标注数变 → false', () => {
    expect(snapshotsEqual(F2, F2)).toBe(true)
    expect(snapshotsEqual(F2, { ...F2, cards: new Map(F2.cards).set('T', rect(12.05, 18)) })).toBe(true)
    expect(snapshotsEqual(F2, { ...F2, cards: new Map(F2.cards).set('T', rect(13, 18)) })).toBe(false)
    expect(
      snapshotsEqual(F2, {
        ...F2,
        frames: [{ ...F2.frames[0]!, h: 250.05 }]
      })
    ).toBe(true)
    expect(
      snapshotsEqual(F2, {
        ...F2,
        frames: [{ ...F2.frames[0]!, h: 251 }]
      })
    ).toBe(false)
    expect(snapshotsEqual(F2, { ...F2, labels: [rect(0, 0, 10, 10)] })).toBe(false)
    expect(snapshotsEqual(F2, { ...F2, contentW: 460 })).toBe(false)
  })

})

describe('F-LANEGRID-01 B3：planRerun 三模（zero/single/full）+其余边路径引用不变', () => {
  const inputs = [geom('e1', 'T', 'A'), geom('e2', 'T', 'A'), geom('e3', 'A', 'G')]
  const paths = routeAll(inputs, F2, noop)
  const prev: RerunPrev = { snap: F2, inputs, paths, uiScale: 1 }

  it('zero：inputs 全等+快照全等+全局信号未变 → 零重算（视觉字段-only——线名/颜色/虚线不入几何面）', () => {
    const again = [geom('e1', 'T', 'A'), geom('e2', 'T', 'A'), geom('e3', 'A', 'G')]
    const plan = planRerun({ prev, snap: F2, inputs: again, uiScale: 1 })
    expect(plan.mode).toBe('zero')
  })

  it('single：恰一边 via 变+快照全等 → 单边重投影计划（carried/keep=其余边路径引用复用）', () => {
    const nextInputs = [geom('e1', 'T', 'A'), geom('e2', 'T', 'A', [{ x: 76, y: 120 }]), geom('e3', 'A', 'G')]
    const plan = planRerun({ prev, snap: F2, inputs: nextInputs, uiScale: 1 })
    expect(plan.mode).toBe('single')
    if (plan.mode !== 'single') return
    expect(plan.input.edgeId).toBe('e2')
    expect(plan.carried).toHaveLength(2)
    expect(plan.keep.get('e1')).toBe(paths[0]) // 其余边路径引用不变（零重算）
    expect(plan.keep.get('e3')).toBe(paths[2])
    // 单边重投影与其余引用拼装后：e2 manual 折线=[a, via, b]、其余=全图原值逐字节
    const single = routeAll([nextInputs[1]!], F2, noop, [paths[0]!, paths[2]!])[0]!
    expect(single.route).toBe('manual-override')
    expect(single.pts).toEqual([
      { x: 76, y: 90 },
      { x: 76, y: 120 },
      { x: 76, y: 162 }
    ])
  })

  it('single 不被采纳当布局已变：via-only+卡移 → full（force 携该边——换算集承载）', () => {
    const nextInputs = [geom('e1', 'T', 'A'), geom('e2', 'T', 'A', [{ x: 76, y: 120 }]), geom('e3', 'A', 'G')]
    const moved: LayoutSnapshot = { ...F2, cards: new Map(F2.cards).set('T', rect(12, 19)) }
    const plan = planRerun({ prev, snap: moved, inputs: nextInputs, uiScale: 1 })
    expect(plan.mode).toBe('full')
    if (plan.mode !== 'full') return
    expect(plan.scope.recompute.has('e2'), 'via 变化边恒入计算集（force）').toBe(true)
    expect(plan.scope.recompute.has('e1'), '端点卡在变化帧 → 入集').toBe(true)
    expect(plan.scope.recompute.has('e3')).toBe(true)
  })

  it('full 全局：uiScale 档变（值差）→ 计算集=全图、carried 空', () => {
    const plan = planRerun({ prev, snap: F2, inputs, uiScale: 1.5 })
    expect(plan.mode).toBe('full')
    if (plan.mode !== 'full') return
    expect(plan.scope.recompute.size).toBe(3)
    expect(plan.carried).toHaveLength(0)
  })

  it('[B3 回炉③] 组结构变（底部新增月）不提升全局：帧差分域——既有月内边 carried 引用复用、计算集空', () => {
    // prev：单帧 k2 (0,220,450,200) 卡 B(12,238)/D(212,238)；next：新增帧 k3
    // (0,440,450,200) 卡 E(12,458)+contentH 660——k2 帧几何与卡集未变
    const frame = (key: string, y: number): MonthFrame => ({ x: 0, y, w: 450, h: 200, year: null, frameKey: key })
    const mk = (extra: { e: boolean }): LayoutSnapshot => ({
      cards: new Map([
        ['B', rect(12, 238)],
        ['D', rect(212, 238)],
        ...(extra.e ? ([['E', rect(12, 458)]] as const) : [])
      ]),
      cardFrame: new Map([
        ['B', 'k2'],
        ['D', 'k2'],
        ...(extra.e ? ([['E', 'k3']] as const) : [])
      ]),
      labels: [],
      yearHeads: [],
      frames: extra.e ? [frame('k2', 220), frame('k3', 440)] : [frame('k2', 220)],
      contentW: 450,
      contentH: extra.e ? 660 : 440
    })
    const prevSnap = mk({ e: false })
    const nextSnap = mk({ e: true })
    const eBD: EdgeGeomInput = {
      edgeId: 'm-other',
      sourceId: 'B',
      targetId: 'D',
      fromAnchor: an('bottom', 1),
      toAnchor: an('left', 1),
      via: [
        { x: 76, y: 320 },
        { x: 150, y: 320 },
        { x: 150, y: 274 }
      ]
    }
    const paths = routeAll([eBD], prevSnap, noop)
    const plan = planRerun({ prev: { snap: prevSnap, inputs: [eBD], paths, uiScale: 1 }, snap: nextSnap, inputs: [eBD], uiScale: 1 })
    expect(plan.mode).toBe('full')
    if (plan.mode !== 'full') return
    expect(plan.scope.recompute.size, 'k2 帧未变+路径不交新帧+车道存活=集空（旧全局行为=全集）').toBe(0)
    expect(plan.carried).toHaveLength(1)
    expect(plan.carried[0]).toBe(paths[0]) // 既有月内边引用复用（月域语义）
    const first = planRerun({ prev: null, snap: F2, inputs, uiScale: 1 })
    expect(first.mode).toBe('full')
    if (first.mode !== 'full') return
    expect(first.scope.recompute.size).toBe(3) // prev=null（首算）→ 全图沿承
  })

  it('[B3 回炉②] 纯增边引用复用：plan carried=其余边路径引用，routeAll 直通输出=原值引用+新边照常分配', () => {
    const inputs = [geom('e1', 'T', 'A'), geom('e2', 'T', 'A')]
    const paths = routeAll(inputs, F2, noop)
    const prev: RerunPrev = { snap: F2, inputs, paths, uiScale: 1 }
    const added = [...inputs, geom('e3', 'T', 'A')]
    const plan = planRerun({ prev, snap: F2, inputs: added, uiScale: 1 })
    expect(plan.mode).toBe('full')
    if (plan.mode !== 'full') return
    expect(plan.carried).toHaveLength(2)
    const out = routeAll(added, F2, noop, plan.carried)
    expect(out[0]).toBe(paths[0]) // 集外边直通——引用即原值
    expect(out[1]).toBe(paths[1])
    expect(out[2]!.edgeId).toBe('e3') // 新边（无 prev 路径恒入集）照常分配
    expect(out[2]!.clearance).toBeUndefined()
  })
})

describe('F-LANEGRID-01 B3：routeAll carried 直通与错峰预载（§6.3 集外不动——B2a 契约扩面）', () => {
  it('集外边直通：carried 中的边输出=carried 原值（引用复用逐字节不变）；集内边照常分配', () => {
    const eA = { edgeId: 'e-a', sourceId: 'T', targetId: 'A', fromAnchor: an('bottom', 1), toAnchor: an('top', 1) }
    const eB = { edgeId: 'e-b', sourceId: 'T', targetId: 'A', fromAnchor: an('bottom', 1), toAnchor: an('top', 1) }
    const full = routeAll([eA, eB], F2, noop)
    const out = routeAll([eA, eB], F2, noop, [full[0]!])
    expect(out[0]).toBe(full[0]) // e-a carried 直通——引用即原值
    expect(out[1]).toEqual(full[1]) // e-b 集内分配=与全图运行逐字节同（占用回放）
  })

  it('错峰计数预载：carried 非直连边计入同锚计数——集内同锚边指派与全图边序逐字节同（无预载则 e1 取 i=0 道撞 e0 桩）', () => {
    const e0 = { edgeId: 'e0', sourceId: 'S', targetId: 'G', fromAnchor: an('bottom', 1) }
    const e1 = { edgeId: 'e1', sourceId: 'S', targetId: 'G', fromAnchor: an('bottom', 1) }
    const full = routeAll([e0, e1], F7, noop)
    // 全图手推（B2a 错峰例）：e0 首段=走廊序列 {100..148} 第 0 道 y=100；
    // e1 让道取第 1 道 y=108（同锚 i=1 指派+中段竖道 150→158 让道）
    expect(full[0]!.pts[1]!.y).toBe(100)
    expect(full[1]!.pts[1]!.y).toBe(108)
    const partial = routeAll([e1], F7, noop, [full[0]!])
    expect(partial[0]).toEqual(full[1]) // carried=e0 全量路径（非直连）→ e1 staggerIndex=1 → 逐字节同全图
  })

  it('manual carried 直通+锚/段预登记（裁决①甲方向——集外 manual 占用面可观测）：集外 manual 输出=原值引用；集内未钉定边散开避让其锚', () => {
    const eAuto = geom('e-a', 'T', 'A')
    const eManual = geom('e-m', 'A', 'T', [{ x: 76, y: 120 }])
    const full = routeAll([eAuto, eManual], F2, noop)
    expect(full[1]!.route).toBe('manual-override')
    expect(full[0]!.anchorMarks).toBe('T:b1,A:t1') // 全图序 in-set manual 不占锚（甲分支全链入网格随后续批收口——申报面）
    const out = routeAll([eAuto, eManual], F2, noop, [full[1]!])
    expect(out[1]).toBe(full[1]) // manual carried 直通——引用即原值（不重投影）
    // carried manual anchorMarks 回放（§6.3）→ T:b1/A:t1 已占 → e-a 散开 b2/t2
    // （108=12+96 锚道）仍 0 拐直连；|108−76|=32 ≥8 与 manual 段不同道无冲突登记
    expect(out[0]!.anchorMarks).toBe('T:b2,A:t2')
    expect(out[0]!.pts).toEqual([
      { x: 108, y: 90 },
      { x: 108, y: 162 }
    ])
    expect(out[0]!.laneMarks).toBe('v108:90-162')
    expect(out[0]!.overlapSpans).toBeUndefined()
  })
})
