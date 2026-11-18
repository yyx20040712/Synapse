/**
 * R2-C1 自动路径最终净空门：钉定锚外法线起落、真实网格形状回归、
 * r=6→3→0 全半径复检与槽位施加后阻断。夹具均为合成数据，不读用户库。
 */
import { describe, expect, it } from 'vitest'
import type { LineageAnchor } from '../../../src/shared/models/lineage'
import { allObstacles, routeAll, routeEdge, type EdgeGeomInput, type LayoutSnapshot, type RoutedPath } from '../../../src/renderer/features/lineage/routing/chain'
import { polylineClearStubs } from '../../../src/renderer/features/lineage/routing/avoid'
import { buildRoundedPath, stripCollinear } from '../../../src/renderer/features/lineage/routing/rounding'
import { slotAssign } from '../../../src/renderer/features/lineage/routing/slots'
import type { Pt, Rect } from '../../../src/renderer/features/lineage/routing/anchors'

const rect = (x: number, y: number, w = 128, h = 72): Rect => ({ x, y, w, h })
const pt = (x: number, y: number): Pt => ({ x, y })
const frame = (y: number, rows: number): LayoutSnapshot['frames'][number] => ({ x: 66, y, w: 577, h: 144 * rows - 40, year: 2026 })

function geom(edgeId: string, sourceId: string, targetId: string, fromAnchor?: LineageAnchor, toAnchor?: LineageAnchor): EdgeGeomInput {
  return { edgeId, sourceId, targetId, ...(fromAnchor !== undefined ? { fromAnchor } : {}), ...(toAnchor !== undefined ? { toAnchor } : {}) }
}

function snapOf(cards: Map<string, Rect>, frames: LayoutSnapshot['frames'] = []): LayoutSnapshot {
  return {
    cards,
    labels: frames.map((f) => rect(f.x + 12, f.y + 0.5, 100, 18)),
    frames,
    yearHeads: [],
    contentW: 551
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
  it('bottom→right：先到右锚短桩外端，再沿水平短桩进锚，不回穿目标卡', () => {
    const snap = snapOf(new Map([['A', rect(79, 119)], ['B', rect(279, 263)]]), [frame(100, 2)])
    const input = geom('e1', 'A', 'B', { side: 'bottom', slot: 1 }, { side: 'right', slot: 1 })
    const path = routeEdge(input, snap)
    expect(path.route).toBe('band')
    expect(path.pts.slice(-3)).toEqual([pt(417, 227), pt(417, 299), pt(407, 299)])
    expectFinalClear(path, snap, input)
  })

  it('背向源锚：下行边钉在源顶锚时先离卡，再经网格通道进入首带', () => {
    const snap = snapOf(new Map([['A', rect(112, 100)], ['B', rect(212, 388)]]), [{ x: 98.4, y: 80.4, w: 627.2, h: 720, year: 2026 }])
    snap.labels = []
    snap.contentW = 600
    const input = geom('e1', 'A', 'B', { side: 'top', slot: 1 }, { side: 'top', slot: 1 })
    const path = routeEdge(input, snap)
    expect(path.route).toBe('band')
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
      frames: [rect(66, 70.5, 592, 104), rect(66, 200.5, 592, 104)].map((f) => ({ ...f, year: 2020 })),
      yearHeads: [rect(20, 18, 55.296875, 34.5), rect(87.296875, 34, 22.03125, 15)],
      contentW: 566
    }
    const input = geom('e1', 'A', 'B', { side: 'bottom', slot: 1 }, { side: 'top', slot: 1 })
    const [path] = routeAll([input], snap)
    // 目标锚 (143,219.5) 位于月标膨胀区 [75,145.906]×[198,226]，任何进锚路径都碰障。
    expect(path).toMatchObject({ route: 'overlap', clearance: 'blocked', d: '', anchorMarks: 'A:b1,B:t1' })
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
  return { snap: snapOf(cards, frames), edges }
}

describe('R2-C1 真实图形状的 43 节点合成回归', () => {
  it('5/5 自动路径经槽位分配与圆角化后仍净空，四条右锚目标均落 band', () => {
    const { snap, edges } = realShapeFixture()
    expect(snap.cards.size).toBe(43)
    expect(snap.frames).toHaveLength(10)
    const paths = routeAll(edges, snap)
    expect(paths.map((p) => p.route)).toEqual(['band', 'band', 'band', 'band', 'band'])
    paths.forEach((path, i) => expectFinalClear(path, snap, edges[i]!))
  })
})

describe('R2-C1 最终净空门半径分档', () => {
  it('r=6/r=3 圆弧碰障但 r=0 尖角净空时，保留 r=0 救通档且非 blocked', async () => {
    const { finalizePath } = await import('../../../src/renderer/features/lineage/routing/finalize')
    const skeleton = [pt(0, 0), pt(0, 40), pt(40, 40)]
    const obstacles = [rect(4.4, 34, 1, 1.9)]
    const r6 = buildRoundedPath(skeleton, 6)
    const r3 = buildRoundedPath(skeleton, 3)
    const r0 = buildRoundedPath(skeleton, 0)
    expect(polylineClearStubs(r6.samples, [], obstacles)).toBe(false)
    expect(polylineClearStubs(r3.samples, [], obstacles)).toBe(false)
    expect(polylineClearStubs(r0.samples, [], obstacles)).toBe(true)
    expect(finalizePath(skeleton, [], obstacles, false)).toEqual({ d: r0.d })
  })

  it('r=0 尖角仍碰障时返回 blocked 与空 d，不再输出非法线', async () => {
    const { finalizePath } = await import('../../../src/renderer/features/lineage/routing/finalize')
    const obstacles = [rect(40, -10, 20, 20)]
    const skeleton = [pt(0, 0), pt(100, 0)]
    expect(polylineClearStubs(buildRoundedPath(skeleton, 0).samples, [], obstacles)).toBe(false)
    expect(finalizePath(skeleton, [], obstacles, false)).toEqual({ d: '', clearance: 'blocked' })
  })

  it('slotAssign 施加的非法回折 jog 由最终门阻断，而非只看分配前骨架', async () => {
    const { finalizePath } = await import('../../../src/renderer/features/lineage/routing/finalize')
    const cards: Array<[string, Rect]> = [
      ['T1', rect(100, 100, 100, 70)],
      ['T2', rect(120, 100, 100, 70)],
      ['T3', rect(140, 100, 120, 70)],
      ['B', rect(100, 200, 80, 70)]
    ]
    const snap = snapOf(new Map(cards))
    const before = [pt(149, 160), pt(149, 198)]
    const assigned = slotAssign([{ edgeId: 'jog', route: 'direct', pts: before }], snap)[0]!
    expect(assigned.pts).not.toEqual(before)
    expect(assigned.pts.length).toBeGreaterThan(6)
    expect(polylineClearStubs(buildRoundedPath(stripCollinear(assigned.pts), 0).samples, [], allObstacles(snap))).toBe(false)
    expect(finalizePath(assigned.pts, [], allObstacles(snap), false)).toEqual({ d: '', clearance: 'blocked' })
  })

  it('manual-override 本段仍只做圆角化，不上自动最终门', async () => {
    const { finalizePath } = await import('../../../src/renderer/features/lineage/routing/finalize')
    const skeleton = [pt(0, 0), pt(100, 0)]
    expect(finalizePath(skeleton, [], [rect(40, -10, 20, 20)], true)).toEqual({ d: 'M 0 0 L 100 0' })
  })
})
