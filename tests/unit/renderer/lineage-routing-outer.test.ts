/**
 * [R2-C2] 走线搜索空间增强例集——「无可行路径（blocked）」在现实布局接近
 * 不发生（用户裁决「不可能没有路径」：稀疏图 blocked=缺陷）。三类残余形态
 * 夹具（诊断岗结论+2026-11-18 仓外探针复核定基线）：①同行被挡（源/目标同
 * 行中间有卡——band 零带）②同列+月标封顶锚（标签矩形覆顶锚桩区——direct/
 * detour/band 顶锚全死）③序内槽位竞争（贪婪无回溯——单边合法、序内 blocked）。
 * 修复合同=候选域扩展：目标续侧带（bands.ts）+外圈末级候选 outer-ring
 * （routing/outer-ring.ts——图域最外圈车道，排 overlap 之前）。终门与
 * blocked 呈现语义零改动（INV-79 合同不变）。全部期望值独立手推/探针几何，
 * 禁抄实现输出；43 节点烘焙布局=2026-11-18 仓外探针自诊断 DB 重建快照
 * （10 年头+10 月框+43 卡 128×72——layout 与 capacity.partitionRows 同式）。
 */
import { describe, expect, it } from 'vitest'
import { polylineClearStubs } from '../../../src/renderer/features/lineage/routing/avoid'
import { allObstacles, routeAll, type EdgeGeomInput, type LayoutSnapshot, type Rect } from '../../../src/renderer/features/lineage/routing/chain'

const CARD_W = 128
const CARD_H = 72
type Anchor = { side: 'top' | 'bottom' | 'left' | 'right'; slot: 0 | 1 | 2 }

const rect = (x: number, y: number, w = CARD_W, h = CARD_H): Rect => ({ x, y, w, h })
const geom = (edgeId: string, sourceId: string, targetId: string, fromAnchor?: Anchor, toAnchor?: Anchor): EdgeGeomInput => ({ edgeId, sourceId, targetId, fromAnchor, toAnchor })
const blocked = (p: { clearance?: string; d: string }): boolean => p.clearance === 'blocked' || p.d === ''

// ── 43 节点真实形状烘焙（探针快照：卡 [id,x,y]、月标 [x,y]、年头 [x,y]、月框 [x,y,w,h]）──
const CARDS: Array<[string, number, number]> = [['65885596-c54d-4c42-9535-75fc52ca745d',79,83],['fae34730-2bcc-4a78-8987-adeea44acb7c',79,297],['0ad645cf-5169-4b2d-9173-d76aaf602ac1',79,511],['471fd6ff-c9fa-4b3b-9c01-337513d66936',79,725],['c96384c4-506f-4b23-826a-903472eb32f5',79,939],['0b972b4d-8703-4d36-b4aa-26e5290321fe',279,939],['bcbe8ca1-9682-41c2-8514-fbfc352b1bc3',479,939],['434ed733-693a-4b0c-9c31-d04035f2705d',79,1153],['a4fd030a-9e70-4ea2-9203-ef83c1d3c509',279,1153],['fbd4cc0b-814d-4005-89b4-301b3921906e',79,1367],['70835920-1b52-472b-848e-e4777d9e2772',279,1367],['f126fb78-f5ff-4154-b33a-bb4243599077',79,1581],['e50d32ec-a3ad-469e-82f1-18f916fdb714',79,1795],['5a965ccd-7b01-44d2-b25e-2e451af08f2b',79,2009],['69a0df4b-afae-4b04-a8b9-14ea95e09663',279,2009],['7110013c-7022-427d-94b0-22be0fb2471f',479,2009],['041d7bd9-914f-40ef-b992-dbe2dc28a5f9',179,2153],['397cda7d-f883-4aa6-8f8d-5946044fe879',379,2153],['fefa138e-55fd-4322-854e-4029fdcfd4b1',79,2297],['01561d8f-7127-415f-90c5-52eaf1232135',279,2297],['32a3178d-20e7-4c82-8848-27e0625ee219',479,2297],['a7404ba5-75ea-425e-adf0-b07713957487',179,2441],['2caf4324-ec40-40f0-b701-4ad0382dc8ac',379,2441],['1c8a28df-2709-408f-90ce-489017e58bac',79,2585],['510353f8-c605-4892-871a-bdad56efd4ba',279,2585],['0367d592-4f62-4fad-a06b-922fbd312331',479,2585],['9ed28898-7e66-41e0-b2c6-efa727dff90c',179,2729],['62d9e1bc-28f7-4ef0-864e-fb568c39c549',379,2729],['adc75dfc-0c8a-4b59-9bfd-dfa33aa0894b',79,2873],['37f3fa16-e666-4b68-884f-70695eb0750f',279,2873],['0d11ac6f-232f-4c2d-942e-4412c8ed80e9',479,2873],['43baaf11-5db0-485c-8183-6a0bd6b72ca1',179,3017],['81089189-296b-4ce5-bd69-57ae853adea7',379,3017],['29cbfb16-564c-42f8-9f18-bed8c4c84ed0',79,3161],['d9e462f9-6b0a-4826-b17d-2987d2283f26',279,3161],['3db44639-a6fe-43bb-a22b-a7e351781996',479,3161],['b58a9a27-42dc-4604-b45f-cbf714f4138c',179,3305],['e06016a2-6b66-4aba-badc-3269a356cd65',379,3305],['bbaa9241-1023-4b1f-aa32-718ee22e0c43',79,3449],['1df07802-1cc2-4a32-a0fd-ffe8c308d9a2',279,3449],['6adfcf29-5b1b-49db-b4ee-a0bdff458620',479,3449],['2c79546f-4e61-4e29-82ab-5cda50cfb508',179,3593],['87ddc25e-c5f5-417d-93fc-72c1294565a1',379,3593]]
const LABELS: Array<[number, number]> = [[78,64.5],[78,278.5],[78,492.5],[78,706.5],[78,920.5],[78,1134.5],[78,1348.5],[78,1562.5],[78,1776.5],[78,1990.5]]
const HEADS: Array<[number, number]> = [[20,18],[20,232],[20,446],[20,660],[20,874],[20,1088],[20,1302],[20,1516],[20,1730],[20,1944]]
const FRAMES: Array<[number, number, number, number]> = [[66,64,577,104],[66,278,577,104],[66,492,577,104],[66,706,577,104],[66,920,577,104],[66,1134,577,104],[66,1348,577,104],[66,1562,577,104],[66,1776,577,104],[66,1990,577,1688]]

function realSnap(): LayoutSnapshot {
  return {
    cards: new Map(CARDS.map(([id, x, y]) => [id, rect(x, y)])),
    labels: LABELS.map(([x, y]) => rect(x, y, 100, 18)),
    yearHeads: HEADS.map(([x, y]) => rect(x, y, 80, 28)),
    frames: FRAMES.map(([x, y, w, h]) => ({ x, y, w, h, year: null })),
    contentW: 551
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

describe('R2-C2 走线搜索空间增强——blocked 接近不发生', () => {
  it('① 同行三卡单边（源/目标同行中间有卡）→ 合法路径非 blocked（旧实现 blocked——外圈通道承接）', () => {
    const snap: LayoutSnapshot = {
      cards: new Map([['A', rect(79, 119)], ['W', rect(279, 119)], ['B', rect(479, 119)]]),
      labels: [rect(78, 100.5, 100, 18)],
      frames: [{ x: 66, y: 100, w: 577, h: 104, year: null }],
      yearHeads: [],
      contentW: 551
    }
    const p = routeAll([geom('e1', 'A', 'B')], snap)[0]!
    expect(blocked(p), '同行被挡不再是无可行路径（外圈/续侧带候选承接）').toBe(false)
    expect(p.route, '承接态为合法自动态（非 overlap 兜底）').not.toBe('overlap')
    expect(p.route).not.toBe('manual-override')
    // 独立几何复检：终门同式 polylineClearStubs（首末 10px 豁免源/目标卡）
    expect(polylineClearStubs(p.pts, [snap.cards.get('A')!, snap.cards.get('B')!], allObstacles(snap)), '输出 pts 独立复核净空').toBe(true)
  })

  it('② 钉定背向源锚同行（源 bottom 钉定+目标 right 钉定，同行）→ 合法（旧实现 blocked——目标续侧带承接）', () => {
    // 两行网格：行0 A/W/B 顶格、行1 X/Y 错位——同行走带需目标下方带（源下方带=行间带）
    const snap: LayoutSnapshot = {
      cards: new Map([['A', rect(79, 100)], ['W', rect(279, 100)], ['B', rect(479, 100)], ['X', rect(179, 244)], ['Y', rect(379, 244)]]),
      labels: [],
      frames: [{ x: 66, y: 80, w: 577, h: 248, year: null }],
      yearHeads: [],
      contentW: 551
    }
    const p = routeAll([geom('e1', 'A', 'B', { side: 'bottom', slot: 0 }, { side: 'right', slot: 1 })], snap)[0]!
    expect(blocked(p), '钉定背向源锚同行边合法').toBe(false)
    expect(p.route).not.toBe('overlap')
    expect(polylineClearStubs(p.pts, [snap.cards.get('A')!, snap.cards.get('B')!], allObstacles(snap))).toBe(true)
  })

  it('②b [审查 B1] 钉定 right→top 同行（目标顶锚自上方进入被 U 卡封死+外圈四向断）→ 目标背侧带承接（旧实现 overlap blocked）', () => {
    // 审查岗反例原样：A/M/B 同行、U 悬于 B 上方一行——行间带 [266,342] 在
    // 目标背侧（down 边的目标上方）；前向侧无带（卡下无夹缝）
    const snap: LayoutSnapshot = {
      cards: new Map([['A', rect(79, 342)], ['M', rect(262, 342)], ['B', rect(438, 342)], ['U', rect(438, 194)]]),
      labels: [],
      frames: [{ x: 66, y: 175, w: 577, h: 104, year: null }, { x: 66, y: 323, w: 577, h: 104, year: null }],
      yearHeads: [],
      contentW: 551
    }
    const p = routeAll([geom('e1', 'A', 'B', { side: 'right', slot: 2 }, { side: 'top', slot: 2 })], snap)[0]!
    expect(blocked(p), 'right→top 钉定同行边合法（背侧带 U 形绕行）').toBe(false)
    expect(p.route).toBe('band')
    // 手推（审查岗几何同款）：A 右 ¾ (207,396)→桩 (217,396)→背侧带中位
    // (217,304)〔带 [266,342] h=76·s=9·n=5 槽位中位=304〕→横移 (534,304)
    // →B 顶 ¾ 桩 (534,332)→锚 (534,342)
    expect(p.pts).toEqual([
      { x: 207, y: 396 }, { x: 217, y: 396 }, { x: 217, y: 304 },
      { x: 534, y: 304 }, { x: 534, y: 332 }, { x: 534, y: 342 }
    ])
    expect(polylineClearStubs(p.pts, [snap.cards.get('A')!, snap.cards.get('B')!], allObstacles(snap)), 'pts 独立复核净空').toBe(true)
  })

  it('②c [审查 B1] 钉定方向矩阵：right→top 三槽组合全部合法（同背侧带形态）', () => {
    const snap: LayoutSnapshot = {
      cards: new Map([['A', rect(79, 342)], ['M', rect(262, 342)], ['B', rect(438, 342)], ['U', rect(438, 194)]]),
      labels: [],
      frames: [{ x: 66, y: 175, w: 577, h: 104, year: null }, { x: 66, y: 323, w: 577, h: 104, year: null }],
      yearHeads: [],
      contentW: 551
    }
    const combos: Array<[Anchor, Anchor]> = [
      [{ side: 'right', slot: 0 }, { side: 'top', slot: 0 }],
      [{ side: 'right', slot: 1 }, { side: 'top', slot: 1 }]
    ]
    for (const [fa, ta] of combos) {
      const p = routeAll([geom(`e-${fa.slot}-${ta.slot}`, 'A', 'B', fa, ta)], snap)[0]!
      expect(blocked(p), `right/${fa.slot}→top/${ta.slot} 合法`).toBe(false)
      expect(p.route, `right/${fa.slot}→top/${ta.slot} 背侧带承接`).toBe('band')
      expect(polylineClearStubs(p.pts, [snap.cards.get('A')!, snap.cards.get('B')!], allObstacles(snap))).toBe(true)
    }
  })

  it('③ 同列+月标封顶锚（标签覆目标顶锚桩区）→ 合法（旧实现 blocked——侧锚进入承接）', () => {
    // 两框纵叠同列：B 框月标 [78,280.5,100,18] 覆 B 顶锚 x∈{111,143,175} 桩区——顶锚全死
    const snap: LayoutSnapshot = {
      cards: new Map([['A', rect(79, 100)], ['B', rect(79, 300)]]),
      labels: [rect(78, 80.5, 100, 18), rect(78, 280.5, 100, 18)],
      frames: [{ x: 66, y: 80, w: 577, h: 104, year: null }, { x: 66, y: 280, w: 577, h: 104, year: null }],
      yearHeads: [],
      contentW: 551
    }
    const p = routeAll([geom('e1', 'A', 'B')], snap)[0]!
    expect(blocked(p), '月标封顶锚不构成无可行路径').toBe(false)
    expect(p.route).not.toBe('overlap')
    expect(polylineClearStubs(p.pts, [snap.cards.get('A')!, snap.cards.get('B')!], allObstacles(snap))).toBe(true)
  })

  it('④ 43 节点真实形状 5 边保持全合法（C1 后基线 5/5——回归卫）', () => {
    const ps = routeAll(REAL_EDGES, realSnap())
    expect(ps).toHaveLength(5)
    for (const p of ps) expect(blocked(p), '边 ' + p.edgeId + ' 合法').toBe(false)
  })

  it('⑤ 30 边压力样本（未钉定）blocked=0（旧实现 4——s1/s4 同列标签封锚、s22/s23 序内槽位竞争）', () => {
    const ps = routeAll(STRESS.map(([id, s, t]) => geom(id, s, t)), realSnap())
    const bad = ps.filter(blocked)
    expect(bad.map((p) => p.edgeId), 'blocked 边清零').toEqual([])
    // 全量独立几何复检：每边 pts 净空（终门同式谓词）
    const snap = realSnap()
    const obstacles = allObstacles(snap)
    for (const p of ps) {
      const e = STRESS.find(([id]) => id === p.edgeId)!
      expect(polylineClearStubs(p.pts, [snap.cards.get(e[1])!, snap.cards.get(e[2])!], obstacles), '边 ' + p.edgeId + ' pts 独立复核净空').toBe(true)
    }
  })

  it('⑥ 30 边压力样本（钉定 bottom/right 族）blocked=0（旧实现 1——s9 同行钉定背向）', () => {
    const ps = routeAll(STRESS.map(([id, s, t], i) => geom(id, s, t, { side: 'bottom', slot: (i % 3) as 0 | 1 | 2 }, { side: 'right', slot: ((i + 1) % 3) as 0 | 1 | 2 })), realSnap())
    expect(ps.filter(blocked).map((p) => p.edgeId), 'blocked 边清零').toEqual([])
  })

  it('⑦ 确定性：同输入连跑 3 次输出逐字节全等（外圈/续侧带候选全序承载）', () => {
    const run = (): string => JSON.stringify(routeAll(STRESS.map(([id, s, t]) => geom(id, s, t)), realSnap()))
    expect(run()).toBe(run())
    expect(run()).toBe(run())
  })
})
