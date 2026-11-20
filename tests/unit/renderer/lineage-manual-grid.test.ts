// @vitest-environment jsdom
/**
 * [F-LANEGRID-01 B3b §11-1 甲] manual 线入网格契约测试（票号 F-LANEGRID-01
 * B3b；用户裁决「人工调整必须受网格约束」）：拖拽吸附=最近车道交点（顶点
 * 拖 8px 容差/段拖法向单轴线；物化与加点=无条件最近交点）；提交门=逐 via
 * 点格点校验（容差 GRID_TOL=0.6）+全链正交，不合规回弹零写零单元；占用
 * 登记=manual 段入 LaneOccupancy（后续自动边避让；manual 自身永不被占用
 * 阻塞、manual-manual 叠线放行）+锚占用 commit（与 carried 回放对称化）；
 * 旧 via 自由坐标显示不改写（遗产面沿承）。期望值按车道锚定公式
 * 「锚定边±(10+8k)」手推，算式注于断言旁。always-active 裸 describe。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub, toastStoreSpy } from '../../utils/api-client-mock'

const stubApi = makeApiStub({ lineage: { graph: vi.fn() } })
void stubApi

import type { LineageAnchor, LineageEdge, LineageNode, LineageViaPoint } from '../../../src/shared/models/lineage'
import {
  laneSnapPoint,
  nearestLaneIntersection,
  validateViaOnGrid,
  type LaneLines
} from '../../../src/renderer/features/lineage/edge-edit'
import { commitEdgeVia } from '../../../src/renderer/features/lineage/edge-via-commit'
import { routeAll, type EdgeGeomInput, type LayoutSnapshot } from '../../../src/renderer/features/lineage/lineage-routing'
import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'
import type { Pt, Rect } from '../../../src/renderer/features/lineage/routing/anchors'

const pt = (x: number, y: number): Pt => ({ x, y })
const rect = (x: number, y: number, w = 128, h = 72): Rect => ({ x, y, w, h })
const an = (side: LineageAnchor['side'], slot: 0 | 1 | 2): LineageAnchor => ({ side, slot })
const noop = (): void => undefined

/** F7 错峰夹具（B2a 同款）：S(12,18)/A(12,162)/G(212,162)——v 道 {2,44,76,
 *  108,150..302}、h 道 {0,8,36,54,72,100..148,180,198,216,244..284} */
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

describe('F-LANEGRID-01 B3b：车道格吸附纯函数（裁决甲——8px 磁吸替代 ±6 通道磁吸）', () => {
  const lines: LaneLines = { v: [150, 158, 250], h: [100, 108, 200] }

  it('laneSnapPoint 8px 内吸附最近交点（逐轴最近分离式）：(155,103)→(158,100)（d=√9=4.24）；(244,203)→(250,200)（d=√45≈6.71）', () => {
    expect(laneSnapPoint(pt(155, 103), lines)).toEqual({ p: pt(158, 100), snapped: true })
    expect(laneSnapPoint(pt(244, 203), lines)).toEqual({ p: pt(250, 200), snapped: true })
  })

  it('带外不吸附：交点距离 >8（欧氏）→ 原点自由（提交门兜底拒写）；恰 8 边界含', () => {
    // 最近交点 (250,200)：dx=0、dy=9 → 距 9>8 不吸
    expect(laneSnapPoint(pt(250, 209), lines)).toEqual({ p: pt(250, 209), snapped: false })
    // dx=7、dy=5（逐轴各 ≤8）但欧氏 8.6>8 → 不吸（度量=到交点距离单判据）
    expect(laneSnapPoint(pt(243, 205), lines)).toEqual({ p: pt(243, 205), snapped: false })
    // 恰 8 边界含（dy=8、dx=0 → 交点 (150,100) 距恰 8）
    expect(laneSnapPoint(pt(150, 92), lines)).toEqual({ p: pt(150, 100), snapped: true })
    expect(laneSnapPoint(pt(150, 91), lines)).toEqual({ p: pt(150, 91), snapped: false })
  })

  it('nearestLaneIntersection 无条件最近（加点/物化——新点必须落格不受容差限）', () => {
    // v={150,158,250}：199 最近 158（d=41<51）；h={100,108,200}：103 最近 100（d=3<5）
    expect(nearestLaneIntersection(pt(199, 103), lines)).toEqual(pt(158, 100))
    // 远距也吸（无条件）：180 距 h 200（d=20）<距 108（d=72）
    expect(nearestLaneIntersection(pt(155, 180), lines)).toEqual(pt(158, 200))
  })

  it('validateViaOnGrid：格点+全点链正交过检；离格点/斜段（含〔回炉①〕单 via 斜端段）/超容差拒', () => {
    const anchors = [pt(150, 100), pt(150, 200)]
    // U 形正交链（全点链含端锚全部段轴对齐）
    expect(validateViaOnGrid([{ x: 158, y: 100 }, { x: 158, y: 200 }], lines, anchors)).toBe(true)
    // 离格点（160 ∉ v 道 {150,158,250}，距 2>0.6——点检先于正交检）
    expect(validateViaOnGrid([{ x: 160, y: 100 }, { x: 160, y: 200 }], lines, anchors)).toMatch(/不在车道格点上/)
    // via 内部斜段（两 via 点皆格点但 (158,100)→(250,108) 对角）
    expect(validateViaOnGrid([{ x: 158, y: 100 }, { x: 250, y: 108 }], lines, [pt(150, 100), pt(250, 108)])).toMatch(/横平竖直/)
    // [B3 回炉① blocker] 单 via 斜端段：via 点在格上但锚→via→锚 两端段均斜（(150,100)→(158,100) 水平过、(158,100)→(250,200) 对角拒）
    expect(validateViaOnGrid([{ x: 158, y: 100 }], lines, [pt(150, 100), pt(250, 200)])).toMatch(/横平竖直/)
    // 容差面：0.4 偏格过（量化残差承接——落库另行钳制到精确格点）、0.7 拒
    expect(validateViaOnGrid([{ x: 158.4, y: 100 }, { x: 158.4, y: 200 }], lines, anchors)).toBe(true)
    expect(validateViaOnGrid([{ x: 158.7, y: 100 }, { x: 158.7, y: 200 }], lines, anchors)).toMatch(/不在车道格点上/)
  })
})

describe('F-LANEGRID-01 B3b：提交门格点/正交校验（commitEdgeVia——与 blocked 同拦截面）', () => {
  /** 几何（own 域，content 基准 (0,0)）：A(100,100)/B(100,300) 同列、C(400,100)
   *  右侧；月框 (0,0,1000,800)。v 道：左带 {2..90}∪A/B 锚 {132,164,196}∪
   *  行隙 {238..386}∪C 锚 {432,464,496}∪右带 {538..998}；h 道：顶带 {2..90}∪
   *  锚 {118,136,154}/{318,336,354}∪行隙 {182..286}∪底带 {382..790} */
  const CARDS: Array<[string, number, number]> = [
    ['A', 100, 100],
    ['B', 100, 300],
    ['C', 400, 100]
  ]
  let content: HTMLElement | null = null

  const node = (id: string): LineageNode => ({
    id, paperId: `p-${id}`, title: id, year: 2022, x: null, y: null, month: 5, slot: null,
    folderId: '__main__', createdAt: 't', updatedAt: 't'
  })
  const edgeOf = (): LineageEdge => ({
    id: 'e1', fromNode: 'A', toNode: 'B', label: '', dashed: false, color: '#1e3a8a', createdAt: 't', updatedAt: 't'
  })

  const mountHost = (): SVGSVGElement => {
    content = document.createElement('div')
    content.className = 'tl-content'
    const stub = (el: Element, x: number, y: number, w: number, h: number): void => {
      Object.defineProperty(el, 'getBoundingClientRect', {
        value: () => ({ left: x, top: y, right: x + w, bottom: y + h, width: w, height: h, x, y, toJSON: () => ({}) }) as DOMRect,
        configurable: true
      })
    }
    stub(content, 0, 0, 1000, 800)
    const frame = document.createElement('div')
    frame.className = 'month-frame'
    frame.dataset.frameKey = 'k'
    stub(frame, 0, 0, 1000, 800)
    content.appendChild(frame)
    for (const [id, x, y] of CARDS) {
      const card = document.createElement('div')
      card.className = 'tl-card'
      card.dataset.nodeId = id
      stub(card, x, y, 128, 72)
      content.appendChild(card)
    }
    const host = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    content.appendChild(host)
    document.body.appendChild(content)
    return host
  }

  beforeEach(() => {
    toastStoreSpy.mockClear()
    useLineageStore.setState({
      nodes: CARDS.map(([id]) => node(id)),
      edges: [edgeOf()],
      saveStatus: 'clean', queue: [], undoStack: [], redoStack: []
    })
  })
  afterEach(() => {
    content?.remove()
    content = null
    useLineageStore.setState({ nodes: [], edges: [], queue: [], undoStack: [], redoStack: [], saveStatus: 'clean' })
  })

  it('格点正交 via 过检：写入+一撤销单元（302=238+8·8 行隙 v 道；136/336=A/B 锚 h 道）', () => {
    const via: LineageViaPoint[] = [
      { x: 302, y: 136 },
      { x: 302, y: 336 }
    ]
    const before = useLineageStore.getState().undoStack.length
    expect(commitEdgeVia({ host: mountHost(), edge: edgeOf(), via })).toBe(true)
    const s = useLineageStore.getState()
    expect(s.edges[0]!.via).toEqual(via)
    expect(s.undoStack.length).toBe(before + 1)
    expect(s.saveStatus).toBe('dirty')
  })

  it('离格点拒绝：零写零单元零 dirty+toast「落点未在车道格点上」恰一次（与 blocked 同拦截面、文案分立）', () => {
    // 300 ∉ v 道（行隙 238 系 8 步进：294/302——300 居间离格）
    const via: LineageViaPoint[] = [
      { x: 300, y: 136 },
      { x: 300, y: 336 }
    ]
    const before = useLineageStore.getState()
    expect(commitEdgeVia({ host: mountHost(), edge: before.edges[0]!, via })).toBe(false)
    const s = useLineageStore.getState()
    expect(s.edges[0]!.via).toBeUndefined() // 回弹：库值原样（初始无边 via）
    expect(s.undoStack.length).toBe(before.undoStack.length)
    expect(s.saveStatus).toBe('clean')
    expect(s.queue).toHaveLength(0)
    expect(toastStoreSpy).toHaveBeenCalledTimes(1)
    expect(toastStoreSpy).toHaveBeenCalledWith('落点未在车道格点上，已回弹', 'error')
  })

  it('斜段拒绝（两格点但对角）：同拦截面回弹', () => {
    const via: LineageViaPoint[] = [
      { x: 302, y: 136 },
      { x: 432, y: 154 }
    ]
    expect(commitEdgeVia({ host: mountHost(), edge: edgeOf(), via })).toBe(false)
    expect(useLineageStore.getState().edges[0]!.via).toBeUndefined()
    expect(toastStoreSpy).toHaveBeenCalledWith('落点未在车道格点上，已回弹', 'error')
  })

  it('[B3 回炉① blocker] 单 via 斜端段拒绝：via 点在格上但锚→via→锚 两端段均斜（A 右锚 (228,136)→(302,136) 水平、(302,136)→B 上锚 (196,300) 对角）', () => {
    const via: LineageViaPoint[] = [{ x: 302, y: 136 }]
    const before = useLineageStore.getState()
    expect(commitEdgeVia({ host: mountHost(), edge: before.edges[0]!, via })).toBe(false)
    const s = useLineageStore.getState()
    expect(s.edges[0]!.via).toBeUndefined() // 回弹零写
    expect(s.undoStack.length).toBe(before.undoStack.length)
    expect(toastStoreSpy).toHaveBeenCalledWith('落点未在车道格点上，已回弹', 'error')
  })

  it('[B3 回炉⑥] 近轴 0.4px 全链过门后写库=精确格点（GRID_TOL 仅判定容差）+占用生效（后继同道直连边冲突区间可观测）', () => {
    // via=(164.4,136)/(164,336)：dx=0.4≤0.6 判「竖直」过门；写库钳制到
    // (164,136)/(164,336) 精确格点——chain 登记口径（CELL_EPS 整段）对精确
    // 轴对齐段全段生效（近轴斜段不入占用表的口径分裂绝源）
    const via: LineageViaPoint[] = [
      { x: 164.4, y: 136 },
      { x: 164, y: 336 }
    ]
    const host = mountHost()
    expect(commitEdgeVia({ host, edge: edgeOf(), via })).toBe(true)
    const written = useLineageStore.getState().edges[0]!.via
    expect(written).toEqual([
      { x: 164, y: 136 },
      { x: 164, y: 336 }
    ])
    // 占用生效：写库值（精确格点）作 manual 边参算 → 同道直连自动边
    // （A:b1(164,172)→B:t1(164,300) 直连 v164）冲突区间照记 overlapSpans
    const manual: EdgeGeomInput = {
      edgeId: 'e-m', sourceId: 'A', targetId: 'B', via: written
    }
    const auto: EdgeGeomInput = {
      edgeId: 'e-a', sourceId: 'A', targetId: 'B',
      fromAnchor: { side: 'bottom', slot: 1 }, toAnchor: { side: 'top', slot: 1 }
    }
    const snap: LayoutSnapshot = {
      cards: new Map(CARDS.map(([id, x, y]) => [id, { x, y, w: 128, h: 72 }] as const)),
      cardFrame: new Map(CARDS.map(([id]) => [id, 'k'] as const)),
      labels: [],
      yearHeads: [],
      frames: [{ x: 0, y: 0, w: 1000, h: 800, year: null, frameKey: 'k' }],
      contentW: 1000,
      contentH: 800
    }
    const out = routeAll([manual, auto], snap, noop)
    expect(out[0]!.clearance).toBeUndefined()
    expect(out[1]!.overlapSpans).toEqual(['v164:172-300'])
    expect(out[1]!.overlapExempt).toBe(true)
  })
})

describe('F-LANEGRID-01 B3b：manual 段占用登记+锚 commit（chain manual 分支——与 carried 回放对称）', () => {
  /** B2a 错峰手推基线：e0（S:b1→G:l0 钉定）= (76,90)(76,100)(150,100)(150,180)(212,180)；
   *  e1（同源锚 b1 钉定、目标未钉）散开 G:l1+错峰 i=1 → (76,108)(158,108)(158,198)(212,198) */
  const E0: EdgeGeomInput = { edgeId: 'e0', sourceId: 'S', targetId: 'G', fromAnchor: an('bottom', 1), toAnchor: an('left', 0) }
  const E1: EdgeGeomInput = { edgeId: 'e1', sourceId: 'S', targetId: 'G', fromAnchor: an('bottom', 1) }
  /** manual e0 同形格点链（76/150 ∈ v、100/180 ∈ h——锚 b1/l0 钉定） */
  const M0: EdgeGeomInput = {
    edgeId: 'm0', sourceId: 'S', targetId: 'G',
    fromAnchor: an('bottom', 1), toAnchor: an('left', 0),
    via: [pt(76, 100), pt(150, 100), pt(150, 180)]
  }

  it('占用等价：manual e0（via=同形格点链）与自动 e0 同锚同段登记——后续同源锚自动边 e1 逐字节同（让道 v158/散开 l1/错峰 i=1）', () => {
    const runA = routeAll([E0, E1], F7, noop)
    expect(runA[0]!.pts).toEqual([pt(76, 90), pt(76, 100), pt(150, 100), pt(150, 180), pt(212, 180)]) // B2a 基线锚
    expect(runA[1]!.pts).toEqual([pt(76, 90), pt(76, 108), pt(158, 108), pt(158, 198), pt(212, 198)])
    const runB = routeAll([M0, E1], F7, noop)
    expect(runB[0]!.route).toBe('manual-override')
    expect(runB[0]!.pts).toEqual(runA[0]!.pts) // 同线：manual 渲染与自动分配同形
    expect(runB[1]).toEqual(runA[1]) // 锚 commit（G:l0 占→散开 l1）+段登记（v150/h100 占→v158/h108）+错峰计数（i=1）全对称
  })

  it('对照（不登记则冲突/直取）：e1 单独路由=撞道原路（v150 直取+G:l0 散开前原锚）——登记面使其让道', () => {
    const alone = routeAll([E1], F7, noop)
    expect(alone[0]!.laneMarks).toContain('v150:') // 直取 e0 原道（无 manual 挡道）
    expect(alone[0]!.anchorMarks).toBe('S:b1,G:l0')
    const withWall = routeAll([M0, E1], F7, noop)
    expect(withWall[1]!.laneMarks, 'manual 段登记→自动边让道（v150 让位 v158）').not.toContain('v150:')
    expect(withWall[1]!.anchorMarks, 'manual 锚 commit→散开 G:l1').toBe('S:b1,G:l1')
  })

  it('[B3 回炉④] carried manual 错峰计数回放：manual carried 后继自动边与全图运行逐字节一致（无回放则 i=0 桩段 100 撞道、回放后 108 让道）', () => {
    const full = routeAll([M0, E1], F7, noop) // manual 先行（占用等价例同款）
    const partial = routeAll([E1], F7, noop, [full[0]!]) // e1 单算+manual carried
    expect(full[1]!.pts[1]!.y).toBe(108) // 全图序 e1 错峰 i=1（B2a 手推基线）
    expect(partial[0]).toEqual(full[1]) // carried manual 计数回放→增量与干净全算逐字节同
  })

  it('[B3 回炉⑤] blocked manual carried 不登记占用：不可见段不入表——pts 有无不影响后继自动边（伪让道绝源；锚回放保留）', () => {
    // 夹具：manual 下探段 v150 [180,320] 穿第三方小卡 BLOCK(144,210,20,20)
    // （膨胀 [138,170]×[204,236]）=blocked；E1 自动路径 v150 止于 y=180 不入
    // 卡带=自身净空——blocked manual 段若登记（旧码）则 v150 [100,320] 冲突
    // E1 让道（判别面）；修复后 pts 有无零差
    const blockedSnap: LayoutSnapshot = {
      ...F7,
      cards: new Map(F7.cards).set('BLOCK', { x: 144, y: 210, w: 20, h: 20 }),
      cardFrame: new Map(F7.cardFrame).set('BLOCK', 'k')
    }
    const mDip: EdgeGeomInput = {
      edgeId: 'm-dip', sourceId: 'S', targetId: 'G',
      fromAnchor: an('bottom', 1), toAnchor: an('left', 2),
      via: [pt(76, 100), pt(150, 100), pt(150, 320)]
    }
    const blocked = routeAll([mDip], blockedSnap, noop)[0]!
    expect(blocked.clearance).toBe('blocked')
    expect(blocked.pts.length).toBeGreaterThan(0) // blocked manual pts 非空（防御面在——旧码会登记）
    const withPts = routeAll([E1], blockedSnap, noop, [blocked])[0]!
    const noPts = routeAll([E1], blockedSnap, noop, [{ ...blocked, pts: [] }])[0]!
    expect(withPts.clearance, 'E1 自身净空（不被 BLOCK 卡阻断）').toBeUndefined()
    expect(withPts).toEqual(noPts) // 段不登记→pts 有无零差；锚回放（S:b1/G:l2）两侧同参
  })

  it('manual-manual 叠线放行（裁决甲承诺域）：同锚同 via 两 manual 边均非阻塞同形（不互相避让）', () => {
    const via = [pt(76, 100), pt(150, 100), pt(150, 180)]
    const m1: EdgeGeomInput = { edgeId: 'm1', sourceId: 'S', targetId: 'G', fromAnchor: an('bottom', 1), toAnchor: an('left', 0), via }
    const m2: EdgeGeomInput = { edgeId: 'm2', sourceId: 'S', targetId: 'G', fromAnchor: an('bottom', 1), toAnchor: an('left', 0), via }
    const paths = routeAll([m1, m2], F7, noop)
    expect(paths[0]!.clearance).toBeUndefined()
    expect(paths[1]!.clearance).toBeUndefined() // 后到 manual 不被先到 manual 段阻塞
    expect(paths[1]!.pts).toEqual(paths[0]!.pts)
    expect(paths.map((p) => p.route)).toEqual(['manual-override', 'manual-override'])
  })
})

describe('F-LANEGRID-01 B3b：遗产面沿承（DB 旧 via 自由坐标——显示与终门不改写）', () => {
  it('离格 legacy via 照常渲染 manual-override（路由层无格约束——门只在写路径）', () => {
    const legacy: EdgeGeomInput = { edgeId: 'e-legacy', sourceId: 'S', targetId: 'A', via: [pt(76.37, 120.2)] }
    const [p] = routeAll([legacy], F7, noop)
    expect(p!.route).toBe('manual-override')
    expect(p!.pts).toEqual([pt(76, 90), pt(76.37, 120.2), pt(76, 162)]) // 坐标原样回显（不吸附不改写）
    expect(p!.clearance).toBeUndefined()
  })
})
