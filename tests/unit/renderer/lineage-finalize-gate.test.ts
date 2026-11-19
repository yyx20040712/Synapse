/**
 * R2-C1 自动路径最终净空门：钉定锚外法线起落、真实网格形状回归、
 * r=6→3→0 全半径复检。[F-LANEGRID-01 B2b] 按 route='grid' 重推导（六态枚举
 * 退役）；夹具全量补齐 contentH/cardFrame/frameKey（快照必填面）。
 * 夹具均为合成数据，不读用户库。期望值从夹具几何+车道表手推（判式注于
 * 断言旁），禁抄实现输出。
 */
import { describe, expect, it } from 'vitest'
import type { LineageAnchor } from '../../../src/shared/models/lineage'
import { allObstacles, routeAll, routeEdge, type EdgeGeomInput, type LayoutSnapshot, type RoutedPath } from '../../../src/renderer/features/lineage/routing/chain'
import { polylineClearStubs } from '../../../src/renderer/features/lineage/routing/avoid'
import { buildRoundedPath, stripCollinear } from '../../../src/renderer/features/lineage/routing/rounding'
import type { Pt, Rect } from '../../../src/renderer/features/lineage/routing/anchors'

const rect = (x: number, y: number, w = 128, h = 72): Rect => ({ x, y, w, h })
const pt = (x: number, y: number): Pt => ({ x, y })
const frame = (y: number, rows: number): LayoutSnapshot['frames'][number] => ({ x: 66, y, w: 577, h: 144 * rows - 40, year: 2026, frameKey: `f${y}` })

function geom(edgeId: string, sourceId: string, targetId: string, fromAnchor?: LineageAnchor, toAnchor?: LineageAnchor): EdgeGeomInput {
  return { edgeId, sourceId, targetId, ...(fromAnchor !== undefined ? { fromAnchor } : {}), ...(toAnchor !== undefined ? { toAnchor } : {}) }
}

function snapOf(cards: Map<string, Rect>, frames: LayoutSnapshot['frames'] = [], contentH = 551): LayoutSnapshot {
  return {
    cards,
    labels: frames.map((f) => rect(f.x + 12, f.y + 0.5, 100, 18)),
    frames,
    yearHeads: [],
    contentW: 551,
    contentH,
    cardFrame: new Map()
  }
}

/** 独立按同一公开几何口径复算：输出必须等于首个净空的最终采样链。 */
function expectFinalClear(path: RoutedPath, snap: LayoutSnapshot, input: EdgeGeomInput): void {
  expect(path.clearance, `${input.edgeId} 不得进入 blocked`).toBeUndefined()
  expect(path.d, `${input.edgeId} 可见路径非空`).not.toBe('')
  const ends = [snap.cards.get(input.sourceId)!, snap.cards.get(input.targetId)!]
  const obstacles = allObstacles(snap)
  const stripped = stripCollinear(path.pts)
  for (const radius of [6, 3, 0]) {
    const built = buildRoundedPath(stripped, radius)
    if (polylineClearStubs(built.samples, ends, obstacles)) {
      expect(path.d, `${input.edgeId} r=${radius} 最终采样链`).toBe(built.d)
      return
    }
  }
  throw new Error(`${input.edgeId} 三个半径的最终采样链均碰障：${JSON.stringify(path.pts)}`)
}

describe('R2-C1 钉定锚方向化起落', () => {
  it('bottom→right：桩下 10 到行隙首道 201，右行至目标右缘带 417，下行入水平短桩进锚（全点列手推）', () => {
    const snap = snapOf(new Map([['A', rect(79, 119)], ['B', rect(279, 263)]]), [frame(100, 2)])
    const input = geom('e1', 'A', 'B', { side: 'bottom', slot: 1 }, { side: 'right', slot: 1 })
    const path = routeEdge(input, snap)
    expect(path.route).toBe('grid')
    // 手推：A:b1=(143,191) 走廊 i=0=行隙首道 201（[191,201] 桩，余段 [201,cand]
    // 存活）；h-201 [143,417] 净空（B y 带 [257,341] ∌201）；B:r1=(407,299) 末桩
    // 须 x2≥417 且 v-x2 存活——右缘带首道 417（B x 膨胀 [273,413] 外）唯一最短
    //（425 起 +16/步）；末桩 (417,299)→(407,299) 长 10（[407,413] 自卡豁免）
    expect(path.pts).toEqual([
      pt(143, 191), pt(143, 201), pt(417, 201), pt(417, 299), pt(407, 299)
    ])
    // d 手推：三拐 r=min(6,10/2,·)=5/6/5（首/末拐贴 10px 桩段钳 5）
    expect(path.d).toBe('M 143 191 L 143 196 Q 143 201 148 201 L 411 201 Q 417 201 417 207 L 417 294 Q 417 299 412 299 L 407 299')
    expect(path.laneMarks).toBe('v143:191-201,h201:143-417,v417:201-299,h299:407-417')
    expect(path.anchorMarks).toBe('A:b1,B:r1')
    expectFinalClear(path, snap, input)
  })

  it('背向源锚：下行边钉在源顶锚时先离卡，再经车道进入（桩上 10 到顶带 90）', () => {
    const snap: LayoutSnapshot = {
      cards: new Map([['A', rect(112, 100)], ['B', rect(212, 388)]]),
      labels: [],
      frames: [{ x: 98.4, y: 80.4, w: 627.2, h: 720, year: 2026, frameKey: 'f1' }],
      yearHeads: [],
      contentW: 600,
      contentH: 800.4,
      cardFrame: new Map()
    }
    const input = geom('e1', 'A', 'B', { side: 'top', slot: 1 }, { side: 'top', slot: 1 })
    const path = routeEdge(input, snap)
    expect(path.route).toBe('grid')
    // 手推：A:t1=(176,100) 上行走廊 i=0=90（100−10；[90,94) 存活+[94,100) 自卡
    // 豁免——A y 膨胀 [94,178]）；越段 (176,90)→(x,90) 转竖入 B:t1=(284,388)
    expect(path.pts[0]).toEqual(pt(176, 100))
    expect(path.pts[1]).toEqual(pt(176, 90))
    expect(path.pts[2]?.y).toBe(90)
    expect(path.pts[2]?.x).not.toBe(176)
    expectFinalClear(path, snap, input)
  })

  it('真实 e2e 几何：目标 top/1 锚落在月标 PAD 内时不可达，blocked 仍保留双端 anchorMarks', () => {
    const snap: LayoutSnapshot = {
      cards: new Map([['A', rect(79, 89.5)], ['B', rect(79, 219.5)]]),
      labels: [rect(79, 72, 62.90625, 20), rect(79, 202, 62.90625, 20)],
      frames: [rect(66, 70.5, 592, 104), rect(66, 200.5, 592, 104)].map((f, i) => ({ ...f, year: 2020, frameKey: `f${i}` })),
      yearHeads: [rect(20, 18, 55.296875, 34.5), rect(87.296875, 34, 22.03125, 15)],
      contentW: 566,
      contentH: 340,
      cardFrame: new Map()
    }
    const input = geom('e1', 'A', 'B', { side: 'bottom', slot: 1 }, { side: 'top', slot: 1 })
    const [path] = routeAll([input], snap)
    // 目标锚 (143,219.5) 位于月标膨胀区 [73,147.906]×[196,228]（±6——[R2-C4]），任何进锚路径都碰障。
    expect(path).toMatchObject({ route: 'grid', clearance: 'blocked', d: '', anchorMarks: 'A:b1,B:t1' })
  })
})

/** 43 卡/10 框；后三框复现诊断中五条边的卡位与 y 坐标，其余为网格填充卡。 */
function realShapeFixture(): { snap: LayoutSnapshot; edges: EdgeGeomInput[] } {
  const cards = new Map<string, Rect>()
  const frames = [100, 234, 368, 502, 636, 770].map((y) => frame(y, 1))
  frames.push(frame(1562, 1), frame(1990, 1), frame(2134, 1), frame(2278, 9))
  for (let i = 0; i < 12; i++) {
    const f = i % 6
    cards.set(`fill-early-${i}`, rect(79 + (i % 2) * 200, frames[f]!.y + 19))
  }
  cards.set('block-edge-1', rect(179, 2153))
  cards.set('fill-edge-1', rect(479, 2153))
  cards.set('target-up', rect(79, 1581))
  cards.set('fill-target-up-1', rect(279, 1581))
  cards.set('fill-target-up-2', rect(479, 1581))
  cards.set('A', rect(79, 2009))
  cards.set('fill-A-1', rect(279, 2009))
  cards.set('fill-A-2', rect(479, 2009))
  const last = new Map<number, Array<[string, number]>>([
    [0, [['fill-last-0', 79], ['B', 279], ['C', 479]]],
    [1, [['D', 179], ['fill-last-1', 379]]],
    [2, [['fill-last-2', 79], ['fill-last-3', 279], ['fill-last-4', 479]]],
    [3, [['target-right-2', 179], ['E', 379]]],
    [4, [['fill-last-5', 79], ['fill-last-6', 279], ['fill-last-7', 479]]],
    [5, [['fill-last-8', 179], ['target-right-1', 379]]],
    [6, [['fill-last-9', 79], ['fill-last-10', 279], ['fill-last-11', 479]]],
    [7, [['fill-last-12', 179], ['fill-last-13', 379]]],
    [8, [['target-last', 79], ['fill-last-14', 279], ['fill-last-15', 479]]]
  ])
  for (const [row, entries] of last) {
    for (const [id, x] of entries) cards.set(id, rect(x, 2297 + row * 144))
  }
  const edges = [
    geom('edge-1', 'A', 'B', { side: 'bottom', slot: 1 }, { side: 'top', slot: 1 }),
    geom('edge-2', 'B', 'target-right-2', { side: 'bottom', slot: 2 }, { side: 'right', slot: 2 }),
    geom('edge-3', 'C', 'target-right-1', { side: 'bottom', slot: 2 }, { side: 'right', slot: 1 }),
    geom('edge-4', 'D', 'target-last', { side: 'bottom', slot: 0 }, { side: 'right', slot: 1 }),
    geom('edge-5', 'E', 'target-up', { side: 'right', slot: 1 }, { side: 'right', slot: 1 })
  ]
  return { snap: snapOf(cards, frames, 3534), edges }
}

describe('R2-C1 真实图形状的 43 节点合成回归', () => {
  it('5/5 自动路径经分配与圆角化后仍净空（route 全=grid——四条右锚目标沿右缘带入锚）', () => {
    const { snap, edges } = realShapeFixture()
    expect(snap.cards.size).toBe(43)
    expect(snap.frames).toHaveLength(10)
    const paths = routeAll(edges, snap)
    expect(paths.map((p) => p.route)).toEqual(['grid', 'grid', 'grid', 'grid', 'grid'])
    paths.forEach((path, i) => expectFinalClear(path, snap, edges[i]!))
  })
})

describe('R2-C1 最终净空门半径分档', () => {
  it('r=6/r=3 圆弧碰障但 r=0 尖角净空时，保留 r=0 救通档且非 blocked', async () => {
    const { finalizePath } = await import('../../../src/renderer/features/lineage/routing/finalize')
    const skeleton = [pt(0, 0), pt(0, 40), pt(40, 40)]
    // [R2-C4] PAD=6 重推：障碍平移 (+2,−2) 保持膨胀缘边距同值——旧 (4.4,34)
    // 膨胀 [0.4,9.4]×[30,39.9]；新 (6.4,32) 膨胀 [0.4,13.4]×[26,39.9]（直角边
    // x=0/y=40 仍各距 0.4/0.1 外净空，r=6/3 弧内切点 (1.5,38.5)/(0.9,39.4) 仍命中）
    const obstacles = [rect(6.4, 32, 1, 1.9)]
    const r6 = buildRoundedPath(skeleton, 6)
    const r3 = buildRoundedPath(skeleton, 3)
    const r0 = buildRoundedPath(skeleton, 0)
    expect(polylineClearStubs(r6.samples, [], obstacles)).toBe(false)
    expect(polylineClearStubs(r3.samples, [], obstacles)).toBe(false)
    expect(polylineClearStubs(r0.samples, [], obstacles)).toBe(true)
    expect(finalizePath(skeleton, [], obstacles)).toEqual({ d: r0.d })
  })

  it('r=0 尖角仍碰障时返回 blocked 与空 d，不再输出非法线', async () => {
    const { finalizePath } = await import('../../../src/renderer/features/lineage/routing/finalize')
    const obstacles = [rect(40, -10, 20, 20)]
    const skeleton = [pt(0, 0), pt(100, 0)]
    expect(polylineClearStubs(buildRoundedPath(skeleton, 0).samples, [], obstacles)).toBe(false)
    expect(finalizePath(skeleton, [], obstacles)).toEqual({ d: '', clearance: 'blocked' })
  })

  it('[R2-C3] manual-override 同上终门：碰障骨架三档均 blocked 空 d（终门对所有 route 态统一）', async () => {
    const { finalizePath } = await import('../../../src/renderer/features/lineage/routing/finalize')
    const skeleton = [pt(0, 0), pt(100, 0)]
    expect(finalizePath(skeleton, [], [rect(40, -10, 20, 20)])).toEqual({ d: '', clearance: 'blocked' })
  })
})
