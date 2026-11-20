/**
 * [F-LANEGRID-01 B3] 更新计算集推导纯函数契约测试（票号 F-LANEGRID-01 B3；
 * 设计稿 docs/design/2026-11-19_f-lanegrid01-design.md §6.2/§6.4；裁决⑥
 * 集外不动+月域语义澄清 2026-11-19）。computeRerouteScope=帧差分（frameKey
 * 对齐/rect ε 阈 0.1/帧内卡集增删移）→三源计算集（端点/穿框真实相交 vs
 * bbox 误牵对照/消失车道）+viaClear 声明域（端点在变化帧的 manual 边——
 * 穿框/消失车道手动边保留 via）+carried（集外边 prev 路径引用复用）。夹具=
 * 双帧（k1 [0,200]/k2 [220,420]、宽 450）；prevPaths 全部手工构造（被测面
 * 只读 pts/laneMarks，不耦合分配器）。期望值按 §2.3 车道锚定公式
 * 「锚定边±(10+8k)」手推，算式注于断言旁。always-active 裸 describe。
 */
import { describe, expect, it } from 'vitest'
import {
  computeRerouteScope,
  type EdgeGeomInput,
  type LayoutSnapshot,
  type MonthFrame,
  type RerouteScope,
  type RoutedPath
} from '../../../src/renderer/features/lineage/lineage-routing'
import type { Rect } from '../../../src/renderer/features/lineage/routing/anchors'

const rect = (x: number, y: number, w = 128, h = 72): Rect => ({ x, y, w, h })
const frame = (key: string, y: number, h: number): MonthFrame => ({ x: 0, y, w: 450, h, year: null, frameKey: key })
const FRAMES = [frame('k1', 0, 200), frame('k2', 220, 200)]

function snapOf(
  cards: ReadonlyArray<[string, Rect, string]>,
  frames: readonly MonthFrame[] = FRAMES,
  extra: Partial<LayoutSnapshot> = {}
): LayoutSnapshot {
  return {
    cards: new Map(cards.map(([id, r]) => [id, r] as const)),
    cardFrame: new Map(cards.map(([id, _r, fk]) => [id, fk] as const)),
    labels: [],
    yearHeads: [],
    frames: [...frames],
    contentW: 450,
    contentH: 440,
    ...extra
  }
}

/** 基夹具 S0：k1={A(12,18),C(312,18)}、k2={B(12,238),G(112,238),D(212,238)}
 *  （卡允许视觉重叠——被测面只读 rect/归属，不经分配器） */
const S0 = snapOf([
  ['A', rect(12, 18), 'k1'],
  ['C', rect(312, 18), 'k1'],
  ['B', rect(12, 238), 'k2'],
  ['G', rect(112, 238), 'k2'],
  ['D', rect(212, 238), 'k2']
])

const edge = (id: string, from: string, to: string, via?: Array<{ x: number; y: number }>): EdgeGeomInput => ({
  edgeId: id,
  sourceId: from,
  targetId: to,
  ...(via !== undefined ? { via } : {})
})

const path = (id: string, pts: ReadonlyArray<[number, number]>, extra: Partial<RoutedPath> = {}): RoutedPath => ({
  edgeId: id,
  d: '',
  route: 'grid',
  pts: pts.map(([x, y]) => ({ x, y })),
  ...extra
})

/** 默认三边+三路径：eAC（k1 内）/eBD、eDG（k2 内——k2 探针） */
const EDGES = [edge('eAC', 'A', 'C'), edge('eBD', 'B', 'D'), edge('eDG', 'D', 'G')]
const PATHS = [
  path('eAC', [
    [76, 90],
    [76, 54]
  ]), // A ½ 竖锚道 x=76（A 不动则在表）
  path('eBD', [
    [76, 274],
    [212, 274]
  ]),
  path('eDG', [
    [212, 274],
    [144, 292]
  ])
]

const ids = (s: RerouteScope): string[] => [...s.recompute].sort()
const cleared = (s: RerouteScope): string[] => [...s.viaClear].sort()

describe('F-LANEGRID-01 B3：变化帧判定（§6.2 frameKey 对齐+rect ε 阈+卡集增删移）', () => {
  it('frameRect 变：k1 高 200→260 → 变化帧={k1}——k1 端点边入集、k2 端点边 carried（引用复用）', () => {
    const next = snapOf([...S0.cards.entries()].map(([id, r]) => [id, r, S0.cardFrame.get(id)!] as [string, Rect, string]), [
      frame('k1', 0, 260),
      frame('k2', 220, 200)
    ])
    const s = computeRerouteScope(S0, next, EDGES, PATHS)
    expect(ids(s)).toEqual(['eAC'])
    expect(s.carried.get('eBD')).toBe(PATHS[1]) // 引用复用（集外不动）
    expect(s.carried.get('eDG')).toBe(PATHS[2])
    expect(cleared(s)).toEqual([])
  })

  it('卡增删：k1 新增卡 E → k1 变（卡集源）；k2 边仍 carried', () => {
    const next = snapOf([
      ['A', rect(12, 18), 'k1'],
      ['C', rect(312, 18), 'k1'],
      ['E', rect(212, 18), 'k1'],
      ['B', rect(12, 238), 'k2'],
      ['G', rect(112, 238), 'k2'],
      ['D', rect(212, 238), 'k2']
    ])
    const s = computeRerouteScope(S0, next, EDGES, PATHS)
    expect(ids(s)).toEqual(['eAC'])
    expect(s.carried.size).toBe(2)
  })

  it('卡移动：C x 312→352 → k1 变；帧 rect 未变（同分行）——卡集 rect 比较承载', () => {
    const next = snapOf([
      ['A', rect(12, 18), 'k1'],
      ['C', rect(352, 18), 'k1'],
      ['B', rect(12, 238), 'k2'],
      ['G', rect(112, 238), 'k2'],
      ['D', rect(212, 238), 'k2']
    ])
    const s = computeRerouteScope(S0, next, EDGES, PATHS)
    expect(ids(s)).toEqual(['eAC'])
  })

  it('ε 内漂移不算变：C x+0.05（<0.1 阈）→ 变化帧空 → recompute 空、全边 carried', () => {
    const next = snapOf([
      ['A', rect(12, 18), 'k1'],
      ['C', rect(312.05, 18), 'k1'],
      ['B', rect(12, 238), 'k2'],
      ['G', rect(112, 238), 'k2'],
      ['D', rect(212, 238), 'k2']
    ])
    const s = computeRerouteScope(S0, next, EDGES, PATHS)
    expect(ids(s)).toEqual([])
    expect([...s.carried.keys()].sort()).toEqual(['eAC', 'eBD', 'eDG'])
  })

  it('卡跨帧迁移：B 移入 k1 → k1、k2 都变（成员差双向）——k2 探针边 eDG 经端点源入集', () => {
    const next = snapOf([
      ['A', rect(12, 18), 'k1'],
      ['C', rect(312, 18), 'k1'],
      ['B', rect(12, 18), 'k1'],
      ['G', rect(112, 238), 'k2'],
      ['D', rect(212, 238), 'k2']
    ])
    const s = computeRerouteScope(S0, next, EDGES, PATHS)
    expect(ids(s)).toEqual(['eAC', 'eBD', 'eDG']) // eAC（k1）/eBD（B→k1）端点源；eDG（k2）=k2 变化的判据
  })
})

describe('F-LANEGRID-01 B3：计算集三源（端点/穿框真实相交 vs bbox 误牵/消失车道）', () => {
  /** C 移动夹具（k1 变化、k2 不变）：变化帧 k1 rect 并集=[0,0,450,200] */
  const MOVED = snapOf([
    ['A', rect(12, 18), 'k1'],
    ['C', rect(112, 18), 'k1'],
    ['B', rect(12, 238), 'k2'],
    ['G', rect(112, 238), 'k2'],
    ['D', rect(212, 238), 'k2']
  ])

  it('穿框真实相交：k2 端点边现路径竖段 x=400 穿 k1 [0,200] → 入集（牵出面——不重算则改月卡可压陈旧路径）', () => {
    const eCross = edge('eCross', 'B', 'D')
    const pCross = path('eCross', [
      [400, 150],
      [400, 310]
    ])
    const s = computeRerouteScope(S0, MOVED, [...EDGES, eCross], [...PATHS, pCross])
    expect(s.recompute.has('eCross')).toBe(true)
  })

  it('bbox 误牵对照（manual 探针——正交段可离车道坐标而不触发车道源）：bbox 与 k1 双轴重叠但三段全不交 → 不入集', () => {
    // manual 边（via 在场）不受消失车道源约束（M11）；pts 取框右外侧绕行：
    // 段①(460,100)→(460,316)：x=460>450 框右外；段②(460,316)→(400,316)：
    // y=316>200。bbox [400,100]-[460,316] 与 k1 bbox [0,0]-[450,200] 双轴重叠
    // （x∈[400,450]、y∈[100,200]）——粗筛过、精确段交剔除非相交（仅判 bbox 会误牵）
    const eBbox = edge('eBbox', 'B', 'D', [{ x: 460, y: 100 }])
    const pBbox = path(
      'eBbox',
      [
        [460, 100],
        [460, 316],
        [400, 316]
      ],
      { route: 'manual-override' }
    )
    const s = computeRerouteScope(S0, MOVED, [...EDGES, eBbox], [...PATHS, pBbox])
    expect(s.recompute.has('eBbox')).toBe(false)
    expect(s.carried.get('eBbox')).toBe(pBbox)
    expect(s.viaClear.has('eBbox')).toBe(false)
  })

  it('消失车道牵出（自动边）：C 移 312→352 致锚道 v344 绝源（新锚 384/416/448、行隙 150..342 均不含 344）→ k2 自动边入集；存活道对照 v254（150+8·13，移动前后均在行隙）不动', () => {
    const MOVED2 = snapOf([
      ['A', rect(12, 18), 'k1'],
      ['C', rect(352, 18), 'k1'],
      ['B', rect(12, 238), 'k2'],
      ['G', rect(112, 238), 'k2'],
      ['D', rect(212, 238), 'k2']
    ])
    const eVan = edge('eVan', 'B', 'D')
    const pVan = path('eVan', [
      [344, 250],
      [344, 300]
    ], { laneMarks: 'v344:250-300' })
    const eStay = edge('eStay', 'G', 'D')
    const pStay = path('eStay', [
      [254, 250],
      [254, 300]
    ], { laneMarks: 'v254:250-300' })
    const s = computeRerouteScope(S0, MOVED2, [...EDGES, eVan, eStay], [...PATHS, pVan, pStay])
    expect(s.recompute.has('eVan'), '引用消失车道（laneMarks v344 ⊄ 新表）→ 牵出入集').toBe(true)
    expect(s.recompute.has('eStay'), '存活道对照不牵出').toBe(false)
    expect(s.carried.get('eStay')).toBe(pStay)
    expect(cleared(s)).toEqual([]) // 自动边无清除域
  })
})

describe('F-LANEGRID-01 B3：manual 边清除域边界（§6.2 月域语义定案——穿框/消失车道手动边保留 via）', () => {
  /** C 移 312→352（k1 变化；v344 绝源）+ 三条 manual 边 */
  const MOVED = snapOf([
    ['A', rect(12, 18), 'k1'],
    ['C', rect(352, 18), 'k1'],
    ['B', rect(12, 238), 'k2'],
    ['G', rect(112, 238), 'k2'],
    ['D', rect(212, 238), 'k2']
  ])
  const eM1 = edge('eM1', 'A', 'C', [{ x: 150, y: 60 }]) // 端点在变化帧
  const eM2 = edge('eM2', 'B', 'D', [{ x: 150, y: 100 }]) // 穿框（端点 k2、路径交 k1）
  const eM3 = edge('eM3', 'G', 'D', [{ x: 344, y: 275 }]) // 消失车道手动边（端点 k2、路径不交 k1）
  const MANUAL = [eM1, eM2, eM3]
  const MANUAL_PATHS = [
    path('eM1', [
      [76, 90],
      [150, 60],
      [384, 54]
    ], { route: 'manual-override' }),
    path('eM2', [
      [76, 274],
      [150, 100],
      [212, 274]
    ], { route: 'manual-override' }),
    path('eM3', [
      [144, 292],
      [344, 275],
      [212, 274]
    ], { route: 'manual-override' })
  ]

  it('端点在变化帧的 manual 边 → viaClear+recompute；穿框 manual（路径交 k1、端点不在）→ 仅 recompute 不清 via；消失车道 manual（路径不交、端点不在）→ 保留 via 走 carried（M11 闭合）', () => {
    const s = computeRerouteScope(S0, MOVED, MANUAL, MANUAL_PATHS)
    expect(cleared(s)).toEqual(['eM1'])
    expect(s.recompute.has('eM1')).toBe(true)
    expect(s.recompute.has('eM2'), '穿框路径 (76,274)→(150,100) 穿 k1 y≤200 段 → 牵出').toBe(true)
    expect(s.viaClear.has('eM2')).toBe(false)
    expect(s.recompute.has('eM3')).toBe(false)
    expect(s.carried.get('eM3')).toBe(MANUAL_PATHS[2]) // via 保留（重投影由集内 eM2 型承接、eM3 不动）
    for (const id of s.viaClear) expect(s.recompute.has(id), `viaClear ⊆ recompute（${id}）`).toBe(true)
  })
})

describe('F-LANEGRID-01 B3：全局判定（→全图重算 carried 空——首算/档变/防御降级）', () => {
  it('调用方 global 标志：布局全等仍全图（recompute=全集、carried/viaClear 空——非用户障碍突变无清除域）', () => {
    const s = computeRerouteScope(S0, S0, EDGES, PATHS, { global: true })
    expect(ids(s)).toEqual(['eAC', 'eBD', 'eDG'])
    expect(s.carried.size).toBe(0)
    expect(cleared(s)).toEqual([])
  })

  it('无 prev（首算）→ 全图', () => {
    const s = computeRerouteScope(null, S0, EDGES, [])
    expect(ids(s)).toEqual(['eAC', 'eBD', 'eDG'])
    expect(s.carried.size).toBe(0)
  })

  it('frameKey 缺席降级：next 帧键 null → 全图（防御——对齐不能宁重算不漏算）', () => {
    const bad = snapOf([...S0.cards.entries()].map(([id, r]) => [id, r, S0.cardFrame.get(id)!] as [string, Rect, string]), [
      frame('k1', 0, 200),
      { ...frame('k2', 220, 200), frameKey: null }
    ])
    const s = computeRerouteScope(S0, bad, EDGES, PATHS)
    expect(ids(s)).toEqual(['eAC', 'eBD', 'eDG'])
  })

  it('卡无帧归属降级：cardFrame 缺该卡条目 → 全图', () => {
    const bad: LayoutSnapshot = { ...S0, cardFrame: new Map([...S0.cardFrame.entries()].filter(([id]) => id !== 'D')) }
    const s = computeRerouteScope(S0, bad, EDGES, PATHS)
    expect(ids(s)).toEqual(['eAC', 'eBD', 'eDG'])
  })

  it('W 变（contentW 450→460）→ 全图（车道 x 域整体重定）', () => {
    const s = computeRerouteScope(S0, { ...S0, contentW: 460 }, EDGES, PATHS)
    expect(ids(s)).toEqual(['eAC', 'eBD', 'eDG'])
    expect(s.carried.size).toBe(0)
  })
})

describe('F-LANEGRID-01 B3：边集变化规则（新增恒入/删除排除/force 恒入）', () => {
  it('新增边恒入 recompute（无 prev 路径——布局全等也入；端点帧空不豁免）', () => {
    const eNew = edge('eNew', 'A', 'B')
    const s = computeRerouteScope(S0, S0, [...EDGES, eNew], PATHS)
    expect(ids(s)).toEqual(['eNew'])
    expect(s.carried.size).toBe(3)
  })

  it('删除边从 carried 排除（prevPaths 残值不回灌）', () => {
    const pGone = path('eGone', [
      [76, 90],
      [76, 54]
    ])
    const s = computeRerouteScope(S0, S0, EDGES, [...PATHS, pGone])
    expect([...s.carried.keys()]).not.toContain('eGone')
    expect(s.recompute.size).toBe(0)
  })

  it('force（输入 diff 变化边——换端/锚变/via 变产物）恒入 recompute（布局全等也入）', () => {
    const s = computeRerouteScope(S0, S0, EDGES, PATHS, { force: new Set(['eBD']) })
    expect(ids(s)).toEqual(['eBD'])
    expect(s.carried.get('eAC')).toBe(PATHS[0])
  })
})
