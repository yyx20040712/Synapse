/**
 * [F-LANEGRID-01 B2b] 走线压力与不变量性质例集（设计
 * docs/design/2026-11-19_f-lanegrid01-design.md §8 INV 重写面——旧 R2-C2
 * 「blocked 接近不发生」按新 blocked 语义收窄重推导：端点封死族（月标压顶/
 * 锚散开压标签/末行底锚无下带）=合法数据态；布局性不可达=预期零触发）。
 * 大夹具（43 节点/30 边压力）按不变量合约断言（任务映射：复杂夹具性质断言）：
 * ①坐标封闭（INV-SLOTGRID-02：段坐标 ⊆ 锚坐标∪车道表坐标——grid 直算比对）
 * ②平行间距（INV-112 分配结果断言：非豁免段对 |Δ|≥LANE_PITCH−TOL；豁免=
 *   后到边 overlapSpans 登记区间）
 * ③拐点数上界（≤2·跨行数+4——每行一次横移至多 2 拐+接驳 4 拐，手推注于断言）
 * ④blocked 语义（压力样本 blocked 恰=端点封死族清单——月标压顶/末行底锚）
 * ⑤确定性（同输入两跑序列化全等）。
 * 小夹具（同行被挡/钉定背向）保留全点列手推（判式注于断言旁——对拍口径=
 * Dijkstra (拐点数,长度,y,x,方向序上0/下1/右2/左3) settle-first-wins）。
 * 43 节点烘焙布局=2026-11-18 仓外探针自诊断 DB 重建快照（10 年头+10 月框+
 * 43 卡 128×72）；20 卡单月压力=e2e stress spec 2020-05 同源形状。
 * always-active 裸 describe。
 */
import { describe, expect, it } from 'vitest'
import { polylineClearStubs } from '../../../src/renderer/features/lineage/routing/avoid'
import { allObstacles, routeAll, type EdgeGeomInput, type LayoutSnapshot, type Rect, type RoutedPath } from '../../../src/renderer/features/lineage/routing/chain'
import { buildLaneTable } from '../../../src/renderer/features/lineage/routing/grid'

const CARD_W = 128
const CARD_H = 72
type Anchor = { side: 'top' | 'bottom' | 'left' | 'right'; slot: 0 | 1 | 2 }

const rect = (x: number, y: number, w = CARD_W, h = CARD_H): Rect => ({ x, y, w, h })
const geom = (edgeId: string, sourceId: string, targetId: string, fromAnchor?: Anchor, toAnchor?: Anchor): EdgeGeomInput => ({ edgeId, sourceId, targetId, fromAnchor, toAnchor })
/** 采样容差（route-stress 同值 0.6——量化/圆角采样残差吸收） */
const TOL = 0.6
/** 间距承诺下限=LANE_PITCH−TOL（设计 §8 ⑥c 口径——route-stress 常量随批对齐） */
const SPACING_MIN = 8 - TOL

// ── 43 节点真实形状烘焙（探针快照：卡 [id,x,y]、月标 [x,y]、年头 [x,y]、月框 [x,y,w,h]）──
const CARDS: Array<[string, number, number]> = [['65885596-c54d-4c42-9535-75fc52ca745d',79,83],['fae34730-2bcc-4a78-8987-adeea44acb7c',79,297],['0ad645cf-5169-4b2d-9173-d76aaf602ac1',79,511],['471fd6ff-c9fa-4b3b-9c01-337513d66936',79,725],['c96384c4-506f-4b23-826a-903472eb32f5',79,939],['0b972b4d-8703-4d36-b4aa-26e5290321fe',279,939],['bcbe8ca1-9682-41c2-8514-fbfc352b1bc3',479,939],['434ed733-693a-4b0c-9c31-d04035f2705d',79,1153],['a4fd030a-9e70-4ea2-9203-ef83c1d3c509',279,1153],['fbd4cc0b-814d-4005-89b4-301b3921906e',79,1367],['70835920-1b52-472b-848e-e4777d9e2772',279,1367],['f126fb78-f5ff-4154-b33a-bb4243599077',79,1581],['e50d32ec-a3ad-469e-82f1-18f916fdb714',79,1795],['5a965ccd-7b01-44d2-b25e-2e451af08f2b',79,2009],['69a0df4b-afae-4b04-a8b9-14ea95e09663',279,2009],['7110013c-7022-427d-94b0-22be0fb2471f',479,2009],['041d7bd9-914f-40ef-b992-dbe2dc28a5f9',179,2153],['397cda7d-f883-4aa6-8f8d-5946044fe879',379,2153],['fefa138e-55fd-4322-854e-4029fdcfd4b1',79,2297],['01561d8f-7127-415f-90c5-52eaf1232135',279,2297],['32a3178d-20e7-4c82-8848-27e0625ee219',479,2297],['a7404ba5-75ea-425e-adf0-b07713957487',179,2441],['2caf4324-ec40-40f0-b701-4ad0382dc8ac',379,2441],['1c8a28df-2709-408f-90ce-489017e58bac',79,2585],['510353f8-c605-4892-871a-bdad56efd4ba',279,2585],['0367d592-4f62-4fad-a06b-922fbd312331',479,2585],['9ed28898-7e66-41e0-b2c6-efa727dff90c',179,2729],['62d9e1bc-28f7-4ef0-864e-fb568c39c549',379,2729],['adc75dfc-0c8a-4b59-9bfd-dfa33aa0894b',79,2873],['37f3fa16-e666-4b68-884f-70695eb0750f',279,2873],['0d11ac6f-232f-4c2d-942e-4412c8ed80e9',479,2873],['43baaf11-5db0-485c-8183-6a0bd6b72ca1',179,3017],['81089189-296b-4ce5-bd69-57ae853adea7',379,3017],['29cbfb16-564c-42f8-9f18-bed8c4c84ed0',79,3161],['d9e462f9-6b0a-4826-b17d-2987d2283f26',279,3161],['3db44639-a6fe-43bb-a22b-a7e351781996',479,3161],['b58a9a27-42dc-4604-b45f-cbf714f4138c',179,3305],['e06016a2-6b66-4aba-badc-3269a356cd65',379,3305],['bbaa9241-1023-4b1f-aa32-718ee22e0c43',79,3449],['1df07802-1cc2-4a32-a0fd-ffe8c308d9a2',279,3449],['6adfcf29-1b1b-49db-b4ee-a0bdff458620',479,3449],['2c79546f-4e61-4e29-82ab-5cda50cfb508',179,3593],['87ddc25e-c5f5-417d-93fc-72c1294565a1',379,3593]]
const LABELS: Array<[number, number]> = [[78,64.5],[78,278.5],[78,492.5],[78,706.5],[78,920.5],[78,1134.5],[78,1348.5],[78,1562.5],[78,1776.5],[78,1990.5]]
const HEADS: Array<[number, number]> = [[20,18],[20,232],[20,446],[20,660],[20,874],[20,1088],[20,1302],[20,1516],[20,1730],[20,1944]]
const FRAMES: Array<[number, number, number, number]> = [[66,64,577,104],[66,278,577,104],[66,492,577,104],[66,706,577,104],[66,920,577,104],[66,1134,577,104],[66,1348,577,104],[66,1562,577,104],[66,1776,577,104],[66,1990,577,1688]]

/** 43 节点快照（contentH=末框底 3678——供给自适应口径：末行底带 0 道的事实源） */
function realSnap(): LayoutSnapshot {
  return {
    cards: new Map(CARDS.map(([id, x, y]) => [id, rect(x, y)])),
    labels: LABELS.map(([x, y]) => rect(x, y, 100, 18)),
    yearHeads: HEADS.map(([x, y]) => rect(x, y, 80, 28)),
    frames: FRAMES.map(([x, y, w, h]) => ({ x, y, w, h, year: null, frameKey: `y${y}` })),
    contentW: 551,
    contentH: 3678,
    cardFrame: new Map()
  }
}

/** 真实 5 边（诊断 DB 同源：钉定锚原样） */
const REAL_EDGES: EdgeGeomInput[] = [
  geom('r1', '5a965ccd-7b01-44d2-b25e-2e451af08f2b', '01561d8f-7127-415f-90c5-52eaf1232135', { side: 'bottom', slot: 1 }, { side: 'top', slot: 1 }),
  geom('r2', '01561d8f-7127-415f-90c5-52eaf1232135', '9ed28898-7e66-41e0-b2c6-efa727dff90c', { side: 'bottom', slot: 2 }, { side: 'right', slot: 2 }),
  geom('r3', '32a3178d-20e7-4c82-8848-27e0625ee219', '81089189-296b-4ce5-bd69-57ae853adea7', { side: 'bottom', slot: 2 }, { side: 'right', slot: 1 }),
  geom('r4', 'a7404ba5-75ea-425e-adf0-b07713957487', 'bbaa9241-1023-4b1f-aa32-718ee22e0c43', { side: 'bottom', slot: 0 }, { side: 'right', slot: 1 }),
  geom('r5', '62d9e1bc-28f7-4ef0-864e-fb568c39c549', 'f126fb78-f5ff-4154-b33a-bb4243599077', { side: 'right', slot: 1 }, { side: 'right', slot: 1 })
]

/** 30 边压力样本（诊断岗同式：DB 序 i→(i+7)%43；pinned=bottom i%3→right (i+1)%3） */
const STRESS: Array<[string, string, string]> = [
  ['s0', '65885596-c54d-4c42-9535-75fc52ca745d', '397cda7d-f883-4aa6-8f8d-5946044fe879'],
  ['s1', '5a965ccd-7b01-44d2-b25e-2e451af08f2b', 'c96384c4-506f-4b23-826a-903472eb32f5'],
  ['s2', '0ad645cf-5169-4b2d-9173-d76aaf602ac1', 'fefa138e-55fd-4322-854e-4029fdcfd4b1'],
  ['s3', '69a0df4b-afae-4b04-a8b9-14ea95e09663', '0b972b4d-8703-4d36-b4aa-26e5290321fe'],
  ['s4', '471fd6ff-c9fa-4b3b-9c01-337513d66936', '434ed733-693a-4b0c-9c31-d04035f2705d'],
  ['s5', '7110013c-7022-427d-94b0-22be0fb2471f', 'fae34730-2bcc-4a78-8987-adeea44acb7c'],
  ['s6', '041d7bd9-914f-40ef-b992-dbe2dc28a5f9', 'a4fd030a-9e70-4ea2-9203-ef83c1d3c509'],
  ['s7', '397cda7d-f883-4aa6-8f8d-5946044fe879', 'fbd4cc0b-814d-4005-89b4-301b3921906e'],
  ['s8', 'c96384c4-506f-4b23-826a-903472eb32f5', '70835920-1b52-472b-848e-e4777d9e2772'],
  ['s9', 'fefa138e-55fd-4322-854e-4029fdcfd4b1', '01561d8f-7127-415f-90c5-52eaf1232135'],
  ['s10', '0b972b4d-8703-4d36-b4aa-26e5290321fe', '32a3178d-20e7-4c82-8848-27e0625ee219'],
  ['s11', '434ed733-693a-4b0c-9c31-d04035f2705d', 'a7404ba5-75ea-425e-adf0-b07713957487'],
  ['s12', 'fae34730-2bcc-4a78-8987-adeea44acb7c', '2caf4324-ec40-40f0-b701-4ad0382dc8ac'],
  ['s13', 'a4fd030a-9e70-4ea2-9203-ef83c1d3c509', '1c8a28df-2709-408f-90ce-489017e58bac'],
  ['s14', 'fbd4cc0b-814d-4005-89b4-301b3921906e', '510353f8-c605-4892-871a-bdad56efd4ba'],
  ['s15', '70835920-1b52-472b-848e-e4777d9e2772', 'bcbe8ca1-9682-41c2-8514-fbfc352b1bc3'],
  ['s16', '01561d8f-7127-415f-90c5-52eaf1232135', '0367d592-4f62-4fad-a06b-922fbd312331'],
  ['s17', '32a3178d-20e7-4c82-8848-27e0625ee219', '9ed28898-7e66-41e0-b2c6-efa727dff90c'],
  ['s18', 'a7404ba5-75ea-425e-adf0-b07713957487', '62d9e1bc-28f7-4ef0-864e-fb568c39c549'],
  ['s19', '2caf4324-ec40-40f0-b701-4ad0382dc8ac', 'adc75dfc-0c8a-4b59-9bfd-dfa33aa0894b'],
  ['s20', '1c8a28df-2709-408f-90ce-489017e58bac', '2c79546f-4e61-4e29-82ab-5cda50cfb508'],
  ['s21', '510353f8-c605-4892-871a-bdad56efd4ba', '37f3fa16-e666-4b68-884f-70695eb0750f'],
  ['s22', 'bcbe8ca1-9682-41c2-8514-fbfc352b1bc3', '0d11ac6f-232f-4c2d-942e-4412c8ed80e9'],
  ['s23', '0367d592-4f62-4fad-a06b-922fbd312331', 'f126fb78-f5ff-4154-b33a-bb4243599077'],
  ['s24', '9ed28898-7e66-41e0-b2c6-efa727dff90c', '43baaf11-5db0-485c-8183-6a0bd6b72ca1'],
  ['s25', '62d9e1bc-28f7-4ef0-864e-fb568c39c549', '81089189-296b-4ce5-bd69-57ae853adea7'],
  ['s26', 'adc75dfc-0c8a-4b59-9bfd-dfa33aa0894b', '29cbfb16-564c-42f8-9f18-bed8c4c84ed0'],
  ['s27', '2c79546f-4e61-4e29-82ab-5cda50cfb508', 'd9e462f9-6b0a-4826-b17d-2987d2283f26'],
  ['s28', '37f3fa16-e666-4b68-884f-70695eb0750f', '3db44639-a6fe-43bb-a22b-a7e351781996'],
  ['s29', '0d11ac6f-232f-4c2d-942e-4412c8ed80e9', 'b58a9a27-42dc-4604-b45f-cbf714f4138c']
]

// ── 性质断言器（单源小件——本文件内三例共用）──

interface PathSeg {
  axis: 'v' | 'h'
  coord: number
  lo: number
  hi: number
  edgeId: string
}

/** pts → 轴对齐段列（对角/零长残段跳过——防御） */
const segsOfPts = (p: RoutedPath): PathSeg[] => {
  const out: PathSeg[] = []
  for (let i = 1; i < p.pts.length; i++) {
    const a = p.pts[i - 1]!
    const b = p.pts[i]!
    if (Math.abs(b.x - a.x) <= TOL && Math.abs(b.y - a.y) > TOL) {
      out.push({ axis: 'v', coord: a.x, lo: Math.min(a.y, b.y), hi: Math.max(a.y, b.y), edgeId: p.edgeId })
    } else if (Math.abs(b.y - a.y) <= TOL && Math.abs(b.x - a.x) > TOL) {
      out.push({ axis: 'h', coord: a.y, lo: Math.min(a.x, b.x), hi: Math.max(a.x, b.x), edgeId: p.edgeId })
    }
  }
  return out
}

/** ①坐标封闭（INV-SLOTGRID-02）：全部 pts 坐标 ∈ 锚坐标∪车道表坐标 */
function expectClosure(paths: readonly RoutedPath[], snap: LayoutSnapshot): void {
  const lanes = buildLaneTable({
    cards: [...snap.cards.values()],
    labels: snap.labels,
    yearHeads: snap.yearHeads,
    frames: snap.frames,
    contentH: snap.contentH
  })
  const xs = new Set<number>(lanes.v.map((l) => l.coord))
  const ys = new Set<number>(lanes.h.map((l) => l.coord))
  for (const c of snap.cards.values()) {
    for (const f of [0.25, 0.5, 0.75]) {
      xs.add(Math.round((c.x + c.w * f) * 10) / 10)
      ys.add(Math.round((c.y + c.h * f) * 10) / 10)
    }
    xs.add(Math.round(c.x * 10) / 10)
    xs.add(Math.round((c.x + c.w) * 10) / 10)
    ys.add(Math.round(c.y * 10) / 10)
    ys.add(Math.round((c.y + c.h) * 10) / 10)
  }
  for (const p of paths) {
    for (const q of p.pts) {
      let hit = false
      for (const u of xs) if (Math.abs(u - q.x) <= TOL) hit = true
      expect(hit, `${p.edgeId} x=${q.x} ∈锚∪车道表`).toBe(true)
      hit = false
      for (const u of ys) if (Math.abs(u - q.y) <= TOL) hit = true
      expect(hit, `${p.edgeId} y=${q.y} ∈锚∪车道表`).toBe(true)
    }
  }
}

/** ②平行间距（INV-112 分配结果断言）：非豁免同轴重叠段对 |Δ|≥SPACING_MIN；
 *  豁免=后到边 overlapSpans 登记区间（「轴+坐标:起-止」串解析比对） */
function expectSpacing(paths: readonly RoutedPath[]): void {
  const segs = paths.flatMap(segsOfPts)
  const byId = new Map(paths.map((p) => [p.edgeId, p]))
  const violations: string[] = []
  for (let i = 0; i < segs.length; i++) {
    for (let j = 0; j < segs.length; j++) {
      if (i === j) continue
      const a = segs[i]!
      const b = segs[j]!
      if (a.edgeId === b.edgeId || a.axis !== b.axis) continue
      const d = Math.abs(a.coord - b.coord)
      if (d >= SPACING_MIN) continue
      const lo = Math.max(a.lo, b.lo)
      const hi = Math.min(a.hi, b.hi)
      if (hi - lo <= TOL) continue
      // 先登记者为占位方：后到边（序大者）承担豁免登记义务（mark 坐标=后到边自身段坐标）
      const ia = paths.findIndex((p) => p.edgeId === a.edgeId)
      const ib = paths.findIndex((p) => p.edgeId === b.edgeId)
      const laterSeg = ia > ib ? a : b
      const exempt = (byId.get(laterSeg.edgeId)?.overlapSpans ?? []).some((m) => {
        const mt = /^([vh])(-?[\d.]+):(-?[\d.]+)-(-?[\d.]+)$/.exec(m)
        if (mt === null || mt[1] !== laterSeg.axis) return false
        if (Math.abs(Number(mt[2]) - laterSeg.coord) > TOL) return false
        return Math.max(Number(mt[3]), lo) < Math.min(Number(mt[4]), hi) + TOL
      })
      if (!exempt) violations.push(`${a.edgeId}@${a.coord}×${b.edgeId}@${b.coord} Δ=${d.toFixed(2)}`)
    }
  }
  expect(violations, `②非豁免段对间距 ≥${SPACING_MIN}（违例=${JSON.stringify([...new Set(violations)].slice(0, 8))}）`).toEqual([])
}

/** ④独立净空复检（终门同式谓词）+③拐点上界（逐边推导：界=2·⌈|Δy|/104⌉+4
 *  ——每行一次横移至多 2 拐、两端接驳 4 拐；104=最小行距口径〔帧高〕。
 *  砖砌列族（同列跨行）按设计 §2.5-③ 阶梯为几何必然，逐行 2 拐达界非缺陷） */
function expectClearAndTurns(paths: readonly RoutedPath[], snap: LayoutSnapshot, edges: readonly EdgeGeomInput[]): void {
  const obstacles = allObstacles(snap)
  for (const p of paths) {
    if (p.clearance === 'blocked') continue
    const e = edges.find((x) => x.edgeId === p.edgeId)!
    const src = snap.cards.get(e.sourceId)!
    const tgt = snap.cards.get(e.targetId)!
    expect(polylineClearStubs(p.pts, [src, tgt], obstacles), `${p.edgeId} pts 独立复核净空`).toBe(true)
    const bound = 2 * Math.ceil(Math.abs(src.y - tgt.y) / 104) + 4
    expect(p.pts.length - 3, `${p.edgeId} 拐点数 ≤2·⌈|Δy|/104⌉+4=${bound}`).toBeLessThanOrEqual(bound)
  }
}

describe('F-LANEGRID-01 B2b 搜索空间供给（blocked 语义收窄后）', () => {
  it('① 同行三卡单边（源/目标同行中间有卡）→ 绕行合法全点列手推：桩 217→行下带 201→右缘带 417 回锚', () => {
    const snap: LayoutSnapshot = {
      cards: new Map([['A', rect(79, 119)], ['W', rect(279, 119)], ['B', rect(479, 119)]]),
      labels: [rect(78, 100.5, 100, 18)],
      frames: [{ x: 66, y: 100, w: 577, h: 104, year: null, frameKey: 'k' }],
      yearHeads: [], contentW: 551, contentH: 304, cardFrame: new Map()
    }
    const p = routeAll([geom('e1', 'A', 'B')], snap)[0]!
    expect(p.route).toBe('grid')
    // 手推：锚 A:r1(207,155)/B:l1(479,155) 同横道 155——直连中段 [217,469] 穿
    // W 死区 x[273,413]（W y 带 [113,187] ∋155）废。桩 (207,155)→(217,155)
    // （走廊 i=0=+10；行内 W 锚道 317 与右缘带 617 外，217 为列隙? 无——同排
    // 单行无行隙：217=A/W 卡间列隙首道〔A 右 207+10〕）。W y 带 [113,187] 杀
    // 137/155/173 横道越段 → 越行道 ∈ 顶带 {109,…}∪底带 {201,…}；等距并列
    // （len=10+46+200+46+62=364）由 (417,155)v 入向方向序 up(0)<down(1) 定
    // 底带 201；目标桩 (417,155)→(479,155) 长 62
    expect(p.pts).toEqual([
      { x: 207, y: 155 }, { x: 217, y: 155 }, { x: 217, y: 201 },
      { x: 417, y: 201 }, { x: 417, y: 155 }, { x: 479, y: 155 }
    ])
    expect(p.laneMarks).toBe('h155:207-217,v217:155-201,h201:217-417,v417:155-201,h155:417-479')
    expect(p.d).toBe('M 207 155 L 212 155 Q 217 155 217 160 L 217 195 Q 217 201 223 201 L 411 201 Q 417 201 417 195 L 417 161 Q 417 155 423 155 L 479 155')
    expect(p.clearance).toBeUndefined()
    expectClosure([p], snap)
  })

  it('② 钉定 bottom→right 两行网格 → 绕行合法全点列手推：桩 182→右缘带 617 上行入右锚', () => {
    const snap: LayoutSnapshot = {
      cards: new Map([['A', rect(79, 100)], ['W', rect(279, 100)], ['B', rect(479, 100)], ['X', rect(179, 244)], ['Y', rect(379, 244)]]),
      labels: [],
      frames: [{ x: 66, y: 80, w: 577, h: 248, year: null, frameKey: 'k' }],
      yearHeads: [], contentW: 551, contentH: 328, cardFrame: new Map()
    }
    const p = routeAll([geom('e1', 'A', 'B', { side: 'bottom', slot: 0 }, { side: 'right', slot: 1 })], snap)[0]!
    // 手推：A:b0(111,172) 桩↓(111,182)（行隙 [172,234] 首道）；X/Y y 带
    // [238,322] 杀 234+ 越段、行 0 带 [94,178] 杀 178− 横越 → h-182 全宽越
    // 行；B:r1(607,136) 目标桩须 x2>607 → 右缘带 617（607+10，v-617 全程
    // 存活）；(617,182)↑(617,136)→桩←(607,136) 长 10
    expect(p.pts).toEqual([
      { x: 111, y: 172 }, { x: 111, y: 182 }, { x: 617, y: 182 },
      { x: 617, y: 136 }, { x: 607, y: 136 }
    ])
    expect(p.d).toBe('M 111 172 L 111 177 Q 111 182 116 182 L 611 182 Q 617 182 617 176 L 617 141 Q 617 136 612 136 L 607 136')
    expect(p.clearance).toBeUndefined()
    expectClosure([p], snap)
  })

  it('②b/②c 钉定 right→top 三槽组合（目标上方 U 卡）→ 全部合法+净空+封闭（性质——并列 lane 多态全点列不可手推）', () => {
    const snap: LayoutSnapshot = {
      cards: new Map([['A', rect(79, 342)], ['M', rect(262, 342)], ['B', rect(438, 342)], ['U', rect(438, 194)]]),
      labels: [],
      frames: [
        { x: 66, y: 175, w: 577, h: 104, year: null, frameKey: 'k1' },
        { x: 66, y: 323, w: 577, h: 104, year: null, frameKey: 'k2' }
      ],
      yearHeads: [], contentW: 551, contentH: 427, cardFrame: new Map()
    }
    const combos: Array<[Anchor, Anchor]> = [
      [{ side: 'right', slot: 2 }, { side: 'top', slot: 2 }],
      [{ side: 'right', slot: 0 }, { side: 'top', slot: 0 }],
      [{ side: 'right', slot: 1 }, { side: 'top', slot: 1 }]
    ]
    const paths: RoutedPath[] = []
    for (const [fa, ta] of combos) {
      const p = routeAll([geom(`e-${fa.slot}-${ta.slot}`, 'A', 'B', fa, ta)], snap)[0]!
      expect(p.clearance, `right/${fa.slot}→top/${ta.slot} 合法`).toBeUndefined()
      expect(p.route).toBe('grid')
      paths.push(p)
    }
    expectClosure(paths, snap)
    expectClearAndTurns(paths, snap, combos.map(([fa, ta]) => geom(`e-${fa.slot}-${ta.slot}`, 'A', 'B', fa, ta)))
  })

  it('③ 同列+月标封顶锚 → blocked（端点封死族——月标压顶：锚选择沿承无侧锚回退，终段被锚构造锁定）', () => {
    // [B2b 语义迁移] 旧 R2-C2「侧锚进入承接」随六态锚降级链退役：selectAnchor
    // 主向定边（§4 沿承）后 t1 锚的进锚桩被月标死区封死=INV-79 合法 blocked
    const snap: LayoutSnapshot = {
      cards: new Map([['A', rect(79, 100)], ['B', rect(79, 300)]]),
      labels: [rect(78, 80.5, 100, 18), rect(78, 280.5, 100, 18)],
      frames: [
        { x: 66, y: 80, w: 577, h: 104, year: null, frameKey: 'k1' },
        { x: 66, y: 280, w: 577, h: 104, year: null, frameKey: 'k2' }
      ],
      yearHeads: [], contentW: 551, contentH: 384, cardFrame: new Map()
    }
    const p = routeAll([geom('e1', 'A', 'B')], snap)[0]!
    expect(p).toMatchObject({ route: 'grid', clearance: 'blocked', d: '', anchorMarks: 'A:b1,B:t1' })
  })
})

describe('F-LANEGRID-01 B2b 43 节点真实形状压力（不变量合约）', () => {
  it('④ 5 条钉定边全合法+净空+封闭+拐点界（逐边 2·⌈|Δy|/104⌉+4）', () => {
    const snap = realSnap()
    const ps = routeAll(REAL_EDGES, snap)
    expect(ps).toHaveLength(5)
    for (const p of ps) expect(p.clearance, `边 ${p.edgeId} 合法`).toBeUndefined()
    expectClosure(ps, snap)
    expectClearAndTurns(ps, snap, REAL_EDGES)
  })

  it('⑤ 30 边压力（未钉定）blocked 恰={s1,s4}（同列标签封锚=端点封死族）；余量净空+封闭+间距+拐点界', () => {
    const snap = realSnap()
    const edges = STRESS.map(([id, s, t]) => geom(id, s, t))
    const ps = routeAll(edges, snap)
    expect(ps.filter((p) => p.clearance === 'blocked').map((p) => p.edgeId), '④ blocked 语义=端点封死族清单').toEqual(['s1', 's4'])
    expectClosure(ps, snap)
    expectSpacing(ps)
    expectClearAndTurns(ps, snap, edges)
  })

  it('⑥ 30 边压力（钉定 bottom/right 族）blocked 恰={s27}（末行底锚+contentH=末框底 → 下带 0 道端点封死——§2.5-⑥ 供给自适应）', () => {
    const snap = realSnap()
    const edges = STRESS.map(([id, s, t], i) => geom(id, s, t, { side: 'bottom', slot: (i % 3) as 0 | 1 | 2 }, { side: 'right', slot: ((i + 1) % 3) as 0 | 1 | 2 }))
    const ps = routeAll(edges, snap)
    expect(ps.filter((p) => p.clearance === 'blocked').map((p) => p.edgeId)).toEqual(['s27'])
    expectClosure(ps, snap)
    expectSpacing(ps)
    expectClearAndTurns(ps, snap, edges)
  })

  it('⑦ 确定性：同输入两跑输出序列化逐字节全等（完整 30 边——含直连/绕行/封死三态）', () => {
    const snap = realSnap()
    const sub = STRESS.map(([id, s, t]) => geom(id, s, t))
    const a = JSON.stringify(routeAll(sub, snap))
    const b = JSON.stringify(routeAll(sub, snap))
    expect(b).toBe(a)
  })
})

// ── 20 卡单月压力布局（e2e stress 2020-05 夹具同形状——探针 observed.json
//    2026-11-19：卡 128×72 砖砌 8 行 3/2 交替；月标 (79,72,68.547,20)；年头
//    两区。旧 R2-C5 ⑧⑨ ringSkeleton 直测例的 routeAll 级替代承载面）──
const STRESS20: ReadonlyArray<readonly [string, number, number]> = [
  ['压1', 79, 89.5], ['压2', 279, 89.5], ['压3', 479, 89.5],
  ['压4', 179, 233.5], ['压5', 379, 233.5],
  ['压6', 79, 377.5], ['压7', 279, 377.5], ['压8', 479, 377.5],
  ['压9', 179, 521.5], ['压10', 379, 521.5],
  ['压11', 79, 665.5], ['压12', 279, 665.5], ['压13', 479, 665.5],
  ['压14', 179, 809.5], ['压15', 379, 809.5],
  ['压16', 79, 953.5], ['压17', 279, 953.5], ['压18', 479, 953.5],
  ['压19', 179, 1097.5], ['压20', 379, 1097.5]
]

const stress20Snap = (): LayoutSnapshot => ({
  cards: new Map(STRESS20.map(([t, x, y]) => [t, rect(x, y)])),
  labels: [rect(79, 72, 68.547, 20)],
  yearHeads: [rect(20, 18, 55.297, 34.5), rect(87.297, 34, 28.031, 15)],
  frames: [{ x: 66, y: 70, w: 577, h: 1120, year: 2020, frameKey: 'k' }],
  contentW: 551,
  contentH: 1190,
  cardFrame: new Map()
})

describe('F-LANEGRID-01 B2 回炉 m-1：旧⑧⑨ 20 卡长程场景的 routeAll 级替代', () => {
  it('⑧ 同列中障钉定边（压7 bottom/1→压2 top/1）→ 非 blocked+净空+坐标封闭（上外区带 8 跨行供给）', () => {
    const snap = stress20Snap()
    const edges = [geom('e8', '压7', '压2', { side: 'bottom', slot: 1 }, { side: 'top', slot: 1 })]
    const ps = routeAll(edges, snap)
    for (const p of ps) expect(p.clearance, `${p.edgeId} 同列中障钉定边合法`).toBeUndefined()
    expectClosure(ps, snap)
    expectClearAndTurns(ps, snap, edges)
  })

  it('⑨ 跨 8 行钉定边（压20 bottom/0→压1 left/2）→ 非 blocked+净空+坐标封闭', () => {
    const snap = stress20Snap()
    const edges = [geom('e9', '压20', '压1', { side: 'bottom', slot: 0 }, { side: 'left', slot: 2 })]
    const ps = routeAll(edges, snap)
    for (const p of ps) expect(p.clearance, `${p.edgeId} 跨 8 行钉定边合法`).toBeUndefined()
    expectClosure(ps, snap)
    expectClearAndTurns(ps, snap, edges)
  })
})
