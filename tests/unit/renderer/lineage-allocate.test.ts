/**
 * [F-LANEGRID-01 B2a] 车道网格分配器契约测试（票号 F-LANEGRID-01 B2a；设计稿
 * docs/design/2026-11-19_f-lanegrid01-design.md §2.5 手推算例①②/§3.2 最小拐
 * 弯确定性搜索/§3.3 同锚错峰/§3.4 段级溢出/§6.3 carried 载入占用；裁决④⑤）。
 * 夹具=帧 padding-box 系（B1 同口径：frame {x:−1.6,y:0,w:453.2,h:250} → x 域
 * [0,450]；卡 128×72、节距 200×144、错位 100）。期望值全部从夹具几何+队列
 * 全序（拐点数,长度,y,x,方向序=上0/下1/右2/左3；settle-first-wins）手推，
 * 算式注于断言旁，禁抄实现输出。always-active 裸 describe。
 */
import { describe, expect, it } from 'vitest'
import type { LineageAnchor } from '../../../src/shared/models/lineage'
import {
  routeAll,
  routeEdge,
  type EdgeGeomInput,
  type LayoutSnapshot
} from '../../../src/renderer/features/lineage/lineage-routing'
import type { Pt, Rect } from '../../../src/renderer/features/lineage/routing/anchors'

const rect = (x: number, y: number, w = 128, h = 72): Rect => ({ x, y, w, h })
const pt = (x: number, y: number): Pt => ({ x, y })
const frame = (x: number, y: number, w: number, h: number): LayoutSnapshot['frames'][number] => ({
  ...rect(x, y, w, h),
  year: null,
  frameKey: 'k'
})
const FRAME = frame(-1.6, 0, 453.2, 250)
const an = (side: LineageAnchor['side'], slot: 0 | 1 | 2): LineageAnchor => ({ side, slot })

function snapOf(cards: ReadonlyArray<[string, Rect]>, extra: Partial<LayoutSnapshot> = {}): LayoutSnapshot {
  return {
    cards: new Map(cards),
    labels: [],
    frames: [FRAME],
    yearHeads: [],
    contentW: 450,
    contentH: 300,
    cardFrame: new Map(),
    ...extra
  }
}

function geom(
  edgeId: string,
  sourceId: string,
  targetId: string,
  fromAnchor?: LineageAnchor,
  toAnchor?: LineageAnchor,
  via?: EdgeGeomInput['via']
): EdgeGeomInput {
  return {
    edgeId,
    sourceId,
    targetId,
    ...(fromAnchor !== undefined ? { fromAnchor } : {}),
    ...(toAnchor !== undefined ? { toAnchor } : {}),
    ...(via !== undefined ? { via } : {})
  }
}

/** 双行单列夹具 F2：T 上 {12,18}、A 下 {12,162}——v 道 {2,44,76,108,150..446}、
 *  h 道 {0,8,36,54,72,100..148,180,198,216,244..284}（行隙 7 道 [90,162]→100..148） */
const F2 = snapOf([
  ['T', rect(12, 18)],
  ['A', rect(12, 162)]
])
/** 四卡双行夹具 F4：偶行 {12,18}/{212,18}、奇行 {112,162}/{312,162}（B1 双行全表） */
const F4 = snapOf([
  ['c1', rect(12, 18)],
  ['c2', rect(212, 18)],
  ['c3', rect(112, 162)],
  ['c4', rect(312, 162)]
])
/** 错峰夹具 F7：S {12,18}、A {12,162}、G {212,162}（同源锚 8 边扇出） */
const F7 = snapOf([
  ['S', rect(12, 18)],
  ['A', rect(12, 162)],
  ['G', rect(212, 162)]
])
const noop = (): void => undefined

describe('F-LANEGRID-01 B2a：0 拐直连（§3.2 首末段即整条路径）', () => {
  it('同列直连：钉 T:b1 (76,90)→A:t1 (76,162)——0 拐单竖段，laneMarks=v76:90-162，无豁免无 blocked', () => {
    const [p] = routeAll([geom('e1', 'T', 'A', an('bottom', 1), an('top', 1))], F2)
    expect(p!.route).toBe('grid')
    expect(p!.pts).toEqual([pt(76, 90), pt(76, 162)])
    expect(p!.laneMarks).toBe('v76:90-162')
    expect(p!.anchorMarks).toBe('T:b1,A:t1')
    expect(p!.overlapExempt).toBeUndefined()
    expect(p!.clearance).toBeUndefined()
    expect(p!.d).not.toBe('')
  })

  it('同排同高水平直连：c1→c2 未钉定（主向定边 r1/l1，y 同高 54）——0 拐单横段 h54:140-212', () => {
    const [p] = routeAll([geom('e1', 'c1', 'c2')], F4)
    // selectAnchor(c1,→(276,54))：|dx|≥|dy| 取横右、投影 slot1 → (140,54)；
    // 对称 c2 左锚 (212,54)；同道线相向 → 直连
    expect(p!.pts).toEqual([pt(140, 54), pt(212, 54)])
    expect(p!.laneMarks).toBe('h54:140-212')
    expect(p!.anchorMarks).toBe('c1:r1,c2:l1')
    expect(p!.clearance).toBeUndefined()
  })
})

describe('F-LANEGRID-01 B2a：设计 §2.5-② 单卡列掉头（钉定背向锚）路径逐点', () => {
  it('A:b1 (76,234)→T:t1 (76,18)（目标在正上方、源桩背向向下）：4 拐绕边侧道 x=2——全点列手推', () => {
    // 桩 (76,234)↓(76,244)（走廊首道=234+10，下带 K=6 {244..284} 取 i=0）→左
    // (2,244)（边侧道全高存活）↑(2,8)（顶带 18−10）→右 (76,8)→↓入 T:t1（末桩
    // ≥10：(76,8)→(76,18)）。并列 4 拐等长 404 经 x=150 侧到达 (76,8) 行进向左
    // （方向序 left=3>right=2）后弹——胜者=x=2 侧（设计 §2.5-② 叙述路径）
    const [p] = routeAll([geom('e1', 'A', 'T', an('bottom', 1), an('top', 1))], F2)
    expect(p!.pts).toEqual([pt(76, 234), pt(76, 244), pt(2, 244), pt(2, 8), pt(76, 8), pt(76, 18)])
    expect(p!.laneMarks).toBe('v76:234-244,h244:2-76,v2:8-244,h8:2-76,v76:8-18')
    expect(p!.anchorMarks).toBe('A:b1,T:t1')
    expect(p!.clearance).toBeUndefined()
  })

  it('镜像背向：T:t1 (76,18)→A:b1 (76,234)（源桩背向向上）——经顶带 (76,8) 与 x=2 掉头', () => {
    // 走廊自 18 上行 {8,0}（K=2 取 i=0 → 8）；对称掉头：上→左 x=2→下 236→右入
    // 末桩 (76,244)→(76,234)
    const [p] = routeAll([geom('e1', 'T', 'A', an('top', 1), an('bottom', 1))], F2)
    expect(p!.pts).toEqual([pt(76, 18), pt(76, 8), pt(2, 8), pt(2, 244), pt(76, 244), pt(76, 234)])
    expect(p!.clearance).toBeUndefined()
  })
})

describe('F-LANEGRID-01 B2a：L 形与阶梯（§2.5-③ 砖砌几何必然）', () => {
  it('同排异高 L 形 2 拐：c1→c3 未钉定（b2 (108,90)→t0 (144,162)）——桩 10px 到行隙首道 100 再右再下入锚', () => {
    // 主向定边：c1 向 (176,198) |dx|<|dy| 竖下、投影 slot2 → (108,90)；c3 向
    // (76,54) 竖上 slot0 → (144,162)。桩 (108,90)↓(108,100)（行隙首道）；右
    // (144,100)；末桩 ↓(144,162) 长 62（[156,162] 落目标卡死区=末桩豁免）
    const [p] = routeAll([geom('e1', 'c1', 'c3')], F4)
    expect(p!.pts).toEqual([pt(108, 90), pt(108, 100), pt(144, 100), pt(144, 162)])
    expect(p!.anchorMarks).toBe('c1:b2,c3:t0')
    expect(p!.clearance).toBeUndefined()
  })

  it('跨奇偶行阶梯（横移道坐标断言）：三行夹具 S:b2 (108,90)→c6:t0 (244,306)——x=108 穿奇行死区，阶梯横移至奇行列隙首道 x=250', () => {
    // 夹具：偶 {12,18}/{212,18}、奇 {112,162}/{312,162}、偶 {12,306}/{212,306}
    // （帧高 430/contentH=430）。目标 c6:t0=(244,306) 锚道 x=244 穿奇行卡
    // {112,162} 膨胀 x[106,246] 死区 y[156,240] 不可直落；源桩道 x=108 同样
    // 被杀 → 最近存活穿越道=奇行列隙 [240,312] 首道 250（150..208 全落
    // [106,246] 死区）。路径：桩 (108,100)→右 (250,100)→↓(250,244)（行隙 2
    // [234,306] 首道）→左 (244,244)→末桩 ↓(244,306)（[300,306] 目标卡死区
    // =末桩豁免）；4 拐 364 全程最短（2 拐须穿奇行死区恒不可行）
    const snap = snapOf(
      [
        ['S', rect(12, 18)],
        ['c2', rect(212, 18)],
        ['c3', rect(112, 162)],
        ['c4', rect(312, 162)],
        ['c5', rect(12, 306)],
        ['c6', rect(212, 306)]
      ],
      { frames: [frame(-1.6, 0, 453.2, 430)], contentH: 430 }
    )
    const [p] = routeAll([geom('e1', 'S', 'c6', an('bottom', 2), an('top', 0))], snap)
    expect(p!.pts).toEqual([
      pt(108, 90), pt(108, 100), pt(250, 100), pt(250, 244), pt(244, 244), pt(244, 306)
    ])
    expect(p!.pts[2]!.x).toBe(250)
    expect(p!.pts[3]!.x).toBe(250)
    expect(p!.clearance).toBeUndefined()
  })
})

describe('F-LANEGRID-01 B2a：同锚错峰（§3.3 i mod K 指派+复用登记）', () => {
  it('8 条同源锚 S:b1 边：首段长=行隙存活道序列 {100..148} 第 (i mod 7) 道——e7 折回 100 并登记复用冲突段', () => {
    const edges = Array.from({ length: 8 }, (_, i) => geom(`e${i}`, 'S', 'G', an('bottom', 1)))
    const paths = routeAll(edges, F7)
    // 走廊=行隙 7 道（卡底 90+10+8k，k=0..6）；i=0..6 逐道、i=7 折回第 0 道
    for (let i = 0; i < 8; i++) {
      expect(paths[i]!.pts[0], `e${i} 源桩起点=锚点`).toEqual(pt(76, 90))
      expect(paths[i]!.pts[1]!.x, `e${i} 桩沿锚道 x=76`).toBe(76)
      expect(paths[i]!.pts[1]!.y, `e${i} 首段长=序列第 (${i} mod 7) 道`).toBe(100 + 8 * (i % 7))
      expect(paths[i]!.route).toBe('grid')
    }
    expect(paths[0]!.overlapSpans, '首边无冲突登记').toBeUndefined()
    expect(paths[0]!.overlapExempt).toBeUndefined()
    expect(paths[7]!.overlapSpans, 'e7 折回复用 e0 桩段 [90,100]').toContain('v76:90-100')
    expect(paths[7]!.overlapExempt).toBe(true)
    expect(paths[1]!.overlapSpans, '嵌套前缀 [90,100] 与 e0 桩冲突照记').toContain('v76:90-100')
  })

  it('错峰指派前三边全点列（占用让道手推）：e0 经 x=150、e1 让道 x=158、e2 让道 x=166', () => {
    const edges = [geom('e0', 'S', 'G', an('bottom', 1)), geom('e1', 'S', 'G', an('bottom', 1)), geom('e2', 'S', 'G', an('bottom', 1))]
    const paths = routeAll(edges, F7)
    // 目标端散开 l0/l1/l2=(212,{180,198,216})；中段竖道让道：e0 取最小存活
    // x=150（76 穿卡死区、108 落 A 卡死区不可用）；e1 候选 150 与 e0 同道
    // [100,180] 重叠 → 158（|Δ|=8 合距）；e2 候选 150/158 均冲突 → 166
    expect(paths[0]!.pts).toEqual([pt(76, 90), pt(76, 100), pt(150, 100), pt(150, 180), pt(212, 180)])
    expect(paths[0]!.anchorMarks).toBe('S:b1,G:l0')
    expect(paths[1]!.pts).toEqual([pt(76, 90), pt(76, 108), pt(158, 108), pt(158, 198), pt(212, 198)])
    expect(paths[2]!.pts).toEqual([pt(76, 90), pt(76, 116), pt(166, 116), pt(166, 216), pt(212, 216)])
    for (const p of paths) expect(p!.clearance, `${p!.edgeId} 非阻塞`).toBeUndefined()
  })
})

describe('F-LANEGRID-01 B2a：段级溢出（§3.4 overlapSpans 区间值）', () => {
  it('同锚同目标双钉定直连边完全共线：e2 不避让照走直连，冲突区间整段登记 v76:90-162+边级豁免', () => {
    const e1 = geom('e1', 'T', 'A', an('bottom', 1), an('top', 1))
    const e2 = geom('e2', 'T', 'A', an('bottom', 1), an('top', 1))
    const [p1, p2] = routeAll([e1, e2], F2)
    expect(p1!.overlapSpans).toBeUndefined()
    expect(p2!.pts).toEqual([pt(76, 90), pt(76, 162)])
    expect(p2!.overlapSpans, '与 e1 登记段 v76:[90,162] 正重叠区间=整段').toEqual(['v76:90-162'])
    expect(p2!.overlapExempt).toBe(true)
    expect(p2!.laneMarks, '溢出路径照常登记占用').toBe('v76:90-162')
    expect(p2!.d, '溢出=叠加非 blocked').not.toBe('')
  })
})

describe('F-LANEGRID-01 B2a：blocked 月标压顶（§3.4 端点封死族——finalize-gate 夹具复刻）', () => {
  it('目标 top/1=(143,219.5) 落月标膨胀区 [73,147.906]×[196,228]：忽略占用仍无解 → grid/blocked/空 d，锚观测保留', () => {
    // 复刻 lineage-finalize-gate 锁定夹具（补 contentH=340 使车道表非退化——
    // 封死源=月标死区盖没目标锚道全部可达末桩位，非 y 域退化）
    const snap: LayoutSnapshot = {
      cards: new Map([['A', rect(79, 89.5)], ['B', rect(79, 219.5)]]),
      labels: [rect(79, 72, 62.90625, 20), rect(79, 202, 62.90625, 20)],
      frames: [rect(66, 70.5, 592, 104), rect(66, 200.5, 592, 104)].map((f, i) => ({ ...f, year: 2020, frameKey: `k${i}` })),
      yearHeads: [rect(20, 18, 55.296875, 34.5), rect(87.296875, 34, 22.03125, 15)],
      contentW: 566,
      contentH: 340,
      cardFrame: new Map()
    }
    const [p] = routeAll([geom('e1', 'A', 'B', an('bottom', 1), an('top', 1))], snap)
    expect(p).toMatchObject({ route: 'grid', clearance: 'blocked', d: '', pts: [], anchorMarks: 'A:b1,B:t1' })
    expect(p!.laneMarks).toBeUndefined()
  })
})

describe('F-LANEGRID-01 B2a：manual-override 与端点防御（§4/终门沿承）', () => {
  it('via 在场：manual 早退折线，不占车道（laneMarks 缺省）、锚观测取规则派生锚、终门第三方集', () => {
    const [p] = routeAll([geom('e1', 'T', 'A', undefined, undefined, [{ x: 76, y: 120 }])], F2)
    expect(p!.route).toBe('manual-override')
    expect(p!.pts).toEqual([pt(76, 90), pt(76, 120), pt(76, 162)])
    expect(p!.anchorMarks).toBe('T:b1,A:t1')
    expect(p!.laneMarks).toBeUndefined()
    expect(p!.clearance).toBeUndefined()
    expect(p!.d).not.toBe('')
  })

  it('端点卡缺失防御早退：route=grid/pts=[]/overlapExempt=true/clearance=blocked', () => {
    const p = routeEdge(geom('e1', 'T', 'ghost', an('bottom', 1), an('top', 1)), F2)
    expect(p).toMatchObject({ route: 'grid', d: '', pts: [], overlapExempt: true, clearance: 'blocked' })
  })
})

describe('F-LANEGRID-01 B2a：确定性（§3.2 红线）与 carried 载入占用（§6.3）', () => {
  it('同输入两跑逐字节同（多形态混合边批：直连/L 形/掉头/错峰）', () => {
    const batch: EdgeGeomInput[] = [
      geom('d1', 'c1', 'c2'),
      geom('d2', 'c1', 'c3'),
      geom('d3', 'c3', 'c1', an('bottom', 1), an('top', 1)),
      geom('d4', 'c3', 'c4'),
      geom('d5', 'c2', 'c4', an('bottom', 1), an('top', 1))
    ]
    const a = routeAll(batch, F4)
    const b = routeAll(batch, F4)
    expect(a.length).toBe(batch.length)
    expect(JSON.stringify(b)).toBe(JSON.stringify(a))
  })

  it('carried 段预登记+锚回放：重排集单边与全图运行逐字节同；无 carried=对照差异', () => {
    // 钉定双连边（e2 溢出依赖 e1 占用）——carried 回放后 e2 的冲突登记与
    // 全图运行一致
    const eA = geom('e-a', 'T', 'A', an('bottom', 1), an('top', 1))
    const eB = geom('e-b', 'T', 'A', an('bottom', 1), an('top', 1))
    const full = routeAll([eA, eB], F2)
    expect(full[1]!.overlapSpans).toEqual(['v76:90-162'])
    const partial = routeAll([eB], F2, noop, [full[0]!])
    expect(partial[0]).toEqual(full[1])
    const plain = routeAll([eB], F2)
    expect(plain[0]!.overlapSpans, '无 carried=无占用可撞').toBeUndefined()
  })

  it('carried 锚回放（未钉定散开重建）：u2 在 carried 下散开到 b2/t2 与全图逐字节同；无 carried 直取 b1/t1', () => {
    const u1 = geom('u-1', 'T', 'A')
    const u2 = geom('u-2', 'T', 'A')
    const full = routeAll([u1, u2], F2)
    expect(full[0]!.anchorMarks).toBe('T:b1,A:t1')
    expect(full[1]!.anchorMarks, '全图序 u2 散开到次锚').toBe('T:b2,A:t2')
    const partial = routeAll([u2], F2, noop, [full[0]!])
    expect(partial[0]).toEqual(full[1])
    const plain = routeAll([u2], F2)
    expect(plain[0]!.anchorMarks, '对照：无 carried 回放=首边直取原锚').toBe('T:b1,A:t1')
    expect(plain[0]!.pts).not.toEqual(full[1]!.pts)
  })
})

describe('F-LANEGRID-01 B2 回炉：搜索域窗口规则（B-1）+短直连（M-1）', () => {
  const rectW = (x: number, y: number, w: number, h: number): Rect => ({ x, y, w, h })
  const frameW = (w: number, h: number): LayoutSnapshot['frames'][number] => ({ x: -1.6, y: 0, w: w + 3.2, h, year: null, frameKey: 'k' })

  it('[B-1a] 平移宽墙（覆全部列位+双侧近道）→ 边侧道族恒在窗内：经右缘带 750 全点列手推（左带 2 等价对称——len 1086<1214 取右）', () => {
    // 夹具=审查反例：L(12,18)/S(312,18)/T(312,400)/R(612,18)+WALL(12,200,728,72)。
    // 手推：S:b2=(408,90)/T:b2=(408,472)。WALL 膨胀 x[6,746] 杀窗内全部中段竖道
    // （bbox x 窗 [328,488]：344/376/408/450.. 均穿墙死区 y[194,278]）；右缘带
    // 750（maxRight 740+10）>746 存活、左缘带 2<6 存活——强制绕行族恒在窗内。
    // 桩↓100（行隙首道）；底带 482（maxBottom 472+10）；len(750)=10+342+382+
    // 342+10=1086 < len(2)=1214 → 取右
    const snap: LayoutSnapshot = {
      cards: new Map([['L', rectW(12, 18, 128, 72)], ['S', rectW(312, 18, 128, 72)], ['T', rectW(312, 400, 128, 72)], ['R', rectW(612, 18, 128, 72)], ['WALL', rectW(12, 200, 728, 72)]]),
      labels: [], frames: [frameW(850, 550)], yearHeads: [], contentW: 850, contentH: 550, cardFrame: new Map()
    }
    const [p] = routeAll([{ edgeId: 'e', sourceId: 'S', targetId: 'T', fromAnchor: an('bottom', 2), toAnchor: an('bottom', 2) }], snap)
    expect(p!.clearance, '边侧道供给保证：宽墙≠无可行路径').toBeUndefined()
    expect(p!.pts).toEqual([
      pt(408, 90), pt(408, 100), pt(750, 100), pt(750, 482), pt(408, 482), pt(408, 472)
    ])
    expect(p!.laneMarks).toBe('v408:90-100,h100:408-750,v750:100-482,h482:408-750,v408:472-482')
    // 变例：墙加宽 x[12,848]（膨胀 [6,854]）灭右缘带（maxRight 848+10=858>
    // xHi 850 无右带）——左缘带 x=2（<6）唯一存活：对称左环绕行全点列
    const snapL: LayoutSnapshot = {
      cards: new Map([['L', rectW(12, 18, 128, 72)], ['S', rectW(312, 18, 128, 72)], ['T', rectW(312, 400, 128, 72)], ['R', rectW(612, 18, 128, 72)], ['WALL', rectW(12, 200, 836, 72)]]),
      labels: [], frames: [frameW(850, 550)], yearHeads: [], contentW: 850, contentH: 550, cardFrame: new Map()
    }
    const [q] = routeAll([{ edgeId: 'eL', sourceId: 'S', targetId: 'T', fromAnchor: an('bottom', 2), toAnchor: an('bottom', 2) }], snapL)
    expect(q!.clearance).toBeUndefined()
    expect(q!.pts).toEqual([
      pt(408, 90), pt(408, 100), pt(2, 100), pt(2, 482), pt(408, 482), pt(408, 472)
    ])
    expect(q!.laneMarks).toBe('v408:90-100,h100:2-408,v2:100-482,h482:2-408,v408:472-482')
  })

  it('[B-1b] 远源掉头（源 x=312 列钉 bottom、目标正上方）→ 边侧带在窗外仍可达：右缘带 450 全点列手推', () => {
    // 手推：S:b2=(408,234)/T:t2=(408,18)（bbox x 窗 [328,488]——右缘带 450
    //（maxRight 440+10）与左缘带 302 均在窗外，族员恒置窗内）。len：|408−450|
    // =42 < |408−302|=106 → 右带唯一最短。桩↓244（底带首道：maxBottom 234+10）；
    // v-450 全高存活；顶带 8（minTop 18−10）；末桩 (408,8)→(408,18) 长 10
    const snap: LayoutSnapshot = {
      cards: new Map([['T', rectW(312, 18, 128, 72)], ['S', rectW(312, 162, 128, 72)]]),
      labels: [], frames: [frameW(450, 300)], yearHeads: [], contentW: 450, contentH: 300, cardFrame: new Map()
    }
    const [p] = routeAll([{ edgeId: 'e', sourceId: 'S', targetId: 'T', fromAnchor: an('bottom', 2), toAnchor: an('top', 2) }], snap)
    expect(p!.clearance).toBeUndefined()
    expect(p!.pts).toEqual([
      pt(408, 234), pt(408, 244), pt(450, 244), pt(450, 8), pt(408, 8), pt(408, 18)
    ])
    expect(p!.laneMarks).toBe('v408:234-244,h244:408-450,v450:8-244,h8:408-450,v408:8-18')
  })

  it('[B-1c] 全表重跑触发例（窗外唯一存活走廊）→ 非 blocked：经 386 全点列手推（窗内 v 道全灭）', () => {
    // 夹具：A(512,18)/B(512,400) 同列、F 列 192、墙对 W1(−50,232,320,72)x 膨胀
    // [−16,316]+W2(400,232,260,72)x[394,666]——bbox x 窗 [496,656] 内全部竖道
    // （544/576/608/650/658）穿墙带 y[226,310] 死；唯一存活走廊=行 1/3 列隙
    // [320,512] 道 330..494 ∩ (316,394)={330..386}（窗外非族员）。手推：A ½
    // 锚 (576,90)/B:t1=(576,400)；桩↓100（行隙 1 首道 [90,222]）；h-100
    // [386,576] 存活（墙带 ∌100）；v-386 全程存活；y2 并列 {314..382}（行隙 2
    // [304,390] 道）len 恒 690 → goal y 升序取 314；末桩 (576,314)→(576,400)
    const snap: LayoutSnapshot = {
      cards: new Map([
        ['A', rectW(512, 18, 128, 72)], ['B', rectW(512, 400, 128, 72)],
        ['F1', rectW(192, 18, 128, 72)], ['F2', rectW(192, 400, 128, 72)],
        ['W1', rectW(-10, 232, 320, 72)], ['W2', rectW(400, 232, 260, 72)]
      ]),
      labels: [], frames: [frameW(660, 550)], yearHeads: [], contentW: 660, contentH: 550, cardFrame: new Map()
    }
    const [p] = routeAll([{ edgeId: 'e', sourceId: 'A', targetId: 'B' }], snap)
    expect(p!.clearance, '窗内无解→全表重跑找到窗外走廊（消灭窗剪枝假 blocked）').toBeUndefined()
    expect(p!.pts).toEqual([
      pt(576, 90), pt(576, 100), pt(386, 100), pt(386, 314), pt(576, 314), pt(576, 400)
    ])
    expect(p!.laneMarks).toBe('v576:90-100,h100:386-576,v386:100-314,h314:386-576,v576:314-400')
  })

  it('[M-1] 短直连（总长 ≤2×LANE_INSET=20）全程皆桩：gap=10/15 升降向四例合法直连+20/25 正控', () => {
    for (const gap of [10, 15, 20, 25]) {
      for (const descending of [false, true]) {
        const snap: LayoutSnapshot = {
          cards: new Map([['L', rectW(100, 100, 128, 72)], ['R', rectW(228 + gap, 100, 128, 72)]]),
          labels: [], frames: [frameW(600, 300)], yearHeads: [], contentW: 600, contentH: 300, cardFrame: new Map()
        }
        const e = descending
          ? { edgeId: `d${gap}`, sourceId: 'R', targetId: 'L', fromAnchor: an('left', 1), toAnchor: an('right', 1) }
          : { edgeId: `a${gap}`, sourceId: 'L', targetId: 'R', fromAnchor: an('right', 1), toAnchor: an('left', 1) }
        const [p] = routeAll([e], snap)
        // 手推：L:r1=(228,136)/R:l1=(228+gap,136) 同道 h136 相向；gap ≤20 时
        // 两端豁免窗 [218,238]/[228+gap−10,228+gap+10] 交叠=全程皆桩（本边
        // 两卡恒豁免，仅第三方致死）→ merged(alive∪ownDead) 整段覆盖 ✓
        expect(p!.clearance, `gap=${gap} descending=${descending} 短直连合法`).toBeUndefined()
        expect(p!.pts).toEqual(descending ? [pt(228 + gap, 136), pt(228, 136)] : [pt(228, 136), pt(228 + gap, 136)])
        expect(p!.laneMarks).toBe(`h136:228-${228 + gap}`)
      }
    }
  })
})
