/**
 * [F-LANEGRID-01 B2b] lineage-routing —— routeAll 级契约例集（车道网格统一
 * 分配——设计 docs/design/2026-11-19_f-lanegrid01-design.md §3/§5；六态链
 * direct/h-slip/detour/band/outer-ring/overlap 随 B2b 删除，本文件按新几何
 * 重推导）。判定口径同 lineage-allocate.test.ts：Dijkstra 队列全序
 * (拐点数,长度,y,x,方向序=上0/下1/右2/左3) settle-first-wins；车道表=grid.
 * buildLaneTable 直算（B1 例集单源）。**期望值独立手推**：全部 pts/d/
 * laneMarks 自夹具几何+车道表算例手推（算式注于断言旁），禁抄实现输出。
 * 夹具=帧 padding-box 系（frame {−1.6,0,453.2,·} → x 域 [0,450]；卡 128×72、
 * 节距 200×144）。always-active 裸 describe（K3）。
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { polylineClearStubs } from '../../../src/renderer/features/lineage/routing/avoid'
import { allObstacles, routeAll, routeEdge, type EdgeGeomInput, type LayoutSnapshot, type Rect } from '../../../src/renderer/features/lineage/routing/chain'
import { buildLaneTable } from '../../../src/renderer/features/lineage/routing/grid'

// ── 夹具工具（纯数据）──

function rect(x: number, y: number, w: number, h: number): Rect {
  return { x, y, w, h }
}

const CARD_W = 128
const CARD_H = 72

/** 标准帧（border-box {−1.6,0,453.2,·} → 车道 x 域 [0,450]——B1/B2a 同口径） */
const frame = (h: number): LayoutSnapshot['frames'][number] => ({ x: -1.6, y: 0, w: 453.2, h, year: 2022, frameKey: 'k' })

function makeSnap(partial: Partial<LayoutSnapshot> = {}): LayoutSnapshot {
  return {
    cards: partial.cards ?? new Map<string, Rect>(),
    labels: partial.labels ?? [],
    frames: partial.frames ?? [],
    yearHeads: partial.yearHeads ?? [],
    contentW: partial.contentW ?? 450,
    // [F-LANEGRID-01 B2b] contentH/cardFrame 必填（0=横道族退化防御——自动边
    // 例须显式给值；manual 例不消费）
    contentH: partial.contentH ?? 0,
    cardFrame: partial.cardFrame ?? new Map()
  }
}

function geom(id: string, from: string, to: string, via?: Array<{ x: number; y: number }>): EdgeGeomInput {
  return { edgeId: id, sourceId: from, targetId: to, via }
}

describe('F-LANEGRID-01 B2b 0 拐直连族（§3.2 首末段即整条路径）', () => {
  /** 同列双卡 A(12,18)/B(12,306)（帧高 430/contentH=430）：v 道 {2,44,76,108}+右缘带
   *  150..442；h 道=锚道 {36,54,72,180,198,216,324,342,360}+行隙 100..148/244..292+外区带 */
  const colSnap = (): LayoutSnapshot =>
    makeSnap({
      cards: new Map<string, Rect>([
        ['A', rect(12, 18, CARD_W, CARD_H)],
        ['B', rect(12, 306, CARD_W, CARD_H)]
      ]),
      frames: [frame(430)],
      contentH: 430
    })

  it('同柱 EPS 容差（ln-C1 沿承）：B 卡 x 差 0.03≤CELL_EPS → 同道直连，量化坍缩回 v76，d 域 0.1 取整亚像素无感', () => {
    const snap = makeSnap({
      cards: new Map<string, Rect>([
        ['A', rect(12, 18, CARD_W, CARD_H)],
        ['B', rect(12.03, 306, CARD_W, CARD_H)]
      ]),
      frames: [frame(430)],
      contentH: 430
    })
    const r = routeEdge(geom('e1', 'A', 'B'), snap)
    expect(r.route).toBe('grid')
    // 手推：A 底锚=投影 tc.x=76.03→|76.03−76|=0.03 最小→slot1 (76,90)；B 顶锚
    // =投影 sc.x=76→slot1 (76.03,306)。两锚道 |76−76.03|=0.03≤CELL_EPS=0.05
    // →同车道判定；delta=216≥10 相向 → 直连。segsOf 坐标=两端均值量化
    // quant(76.015)=76；d 的 fmt 同取整 → 与完美对齐夹具全等
    expect(r.pts).toEqual([{ x: 76, y: 90 }, { x: 76.03, y: 306 }])
    expect(r.d).toBe('M 76 90 L 76 306')
    expect(r.laneMarks).toBe('v76:90-306')
    expect(r.anchorMarks).toBe('A:b1,B:t1')
    expect(r.clearance).toBeUndefined()
  })

  it('同对第二边锚散开：e1 直连 v76、e2 散开 b2/t2 直连 v108——同道表内互异电平（|Δ|=32≥8）', () => {
    const snap = colSnap()
    const paths = routeAll([geom('e1', 'A', 'B'), geom('e2', 'A', 'B')], snap)
    // 手推：e1 ½/½ 锚 b1/t1=(76,90)/(76,306) 同道直连；e2 pick 散开序
    // [1,2,0]→slot2：b2/t2=(108,90)/(108,306) 同道直连（A/B 膨胀 x[6,146] ∋108
    // 死区仅卡带 y[12,96]/[300,378]，中段 [100,296] 存活）
    expect(paths.map((p) => p.route)).toEqual(['grid', 'grid'])
    expect(paths[0]!.pts).toEqual([{ x: 76, y: 90 }, { x: 76, y: 306 }])
    expect(paths[1]!.pts).toEqual([{ x: 108, y: 90 }, { x: 108, y: 306 }])
    expect(paths[0]!.laneMarks).toBe('v76:90-306')
    expect(paths[1]!.laneMarks).toBe('v108:90-306')
    expect(paths[1]!.overlapSpans, '|Δ|=32≥8 无冲突登记').toBeUndefined()
  })
})

describe('F-LANEGRID-01 B2b 同列中障绕行（§3.2 搜索产出——旧 detour 族承载）', () => {
  /** 三行同列 A(12,18)/W(12,162)/B(12,306)：v76 中段死区 [156,240]（W 膨胀） */
  const wallSnap = (): LayoutSnapshot =>
    makeSnap({
      cards: new Map<string, Rect>([
        ['A', rect(12, 18, CARD_W, CARD_H)],
        ['W', rect(12, 162, CARD_W, CARD_H)],
        ['B', rect(12, 306, CARD_W, CARD_H)]
      ]),
      frames: [frame(430)],
      contentH: 430
    })

  it('全点列手推：v76 被W杀段→桩 10 到行隙首道 100→左缘带 x=2（与右缘带 150 等距并列，方向序 right<left 定）→行隙 2 首道 244 回锚道→末桩入 B', () => {
    const r = routeEdge(geom('e1', 'A', 'B'), wallSnap())
    expect(r.route).toBe('grid')
    // 手推：锚 A:b1(76,90)/B:t1(76,306)。v76 死区=[12,96]∪[156,240]∪[300,378]
    // （W y[162,234]±6）→直连中段不净空；走廊 K=5（行隙 1 道 100..214 中
    // stubClear 存活前 5 道，222 起入 W 死区滤除）取 i=0=100。4 拐族横道候选：
    // 卡锚道 {44,108} 竖段 [100,y2] 穿 W 死区 [156,240]（W x 膨胀 [6,146] 全
    // 含）✗；左缘带 x=2（全部卡 x 膨胀自 6 起——2 在死区外全程存活）与右缘带
    // x=150（W 膨胀右缘 146 外）等距 |Δ|=74 并列——末段回锚道 (76,244)h 状态
    // 入向并列由方向序 right(2)<left(3) 定 x=2。末桩约束：目标桩 [y2,306] 须
    // alive→y2≥240.05→行隙 2 道 {244..292}；len=10+2·74+(y2−100)+(306−y2)
    // =364 与 y2 无关并列→goal 条目 y 升序定 y2=244
    expect(r.pts).toEqual([
      { x: 76, y: 90 }, { x: 76, y: 100 }, { x: 2, y: 100 },
      { x: 2, y: 244 }, { x: 76, y: 244 }, { x: 76, y: 306 }
    ])
    expect(r.laneMarks).toBe('v76:90-100,h100:2-76,v2:100-244,h244:2-76,v76:244-306')
    expect(r.anchorMarks).toBe('A:b1,B:t1')
    // d 手推：四拐 r=min(6,10/2,·)=5/6/6/6（首拐入段=桩 10 → r=5）
    expect(r.d).toBe(
      'M 76 90 L 76 95 Q 76 100 71 100 L 8 100 Q 2 100 2 106 L 2 238 Q 2 244 8 244 L 70 244 Q 76 244 76 250 L 76 306'
    )
    expect(r.clearance).toBeUndefined()
    expect(r.overlapExempt).toBeUndefined()
  })

  it('宽墙覆全部列位但边侧道存活（车道供给保证）→ 非 blocked+坐标封闭+独立净空复核（性质合约——旧巨墙 outer-ring 承载）', () => {
    // 墙 x[12,428]（覆三列位）膨胀 [6,434]：左缘带 x=2（minLeft−10 ≥0）在墙
    // 死区外存活；右缘带 438 ∈[6,434] 死、446 活但更远——供给三路冗余下非 blocked
    const snap = makeSnap({
      cards: new Map<string, Rect>([
        ['A', rect(12, 18, CARD_W, CARD_H)],
        ['WALL', rect(12, 162, 416, CARD_H)],
        ['B', rect(12, 306, CARD_W, CARD_H)]
      ]),
      frames: [frame(430)],
      contentH: 430
    })
    const r = routeEdge(geom('e1', 'A', 'B'), snap)
    expect(r.clearance, '车道供给保证：宽墙≠无可行路径').toBeUndefined()
    expect(r.d).not.toBe('')
    const src = snap.cards.get('A')!
    const tgt = snap.cards.get('B')!
    expect(polylineClearStubs(r.pts, [src, tgt], allObstacles(snap)), 'pts 独立复核净空').toBe(true)
    // 坐标封闭（INV-SLOTGRID-02）：段坐标 ⊆ 锚坐标∪车道表坐标（grid 直算比对）
    const lanes = buildLaneTable({
      cards: [...snap.cards.values()],
      labels: snap.labels,
      yearHeads: snap.yearHeads,
      frames: snap.frames,
      contentH: snap.contentH
    })
    const anchorXs = new Set<number>()
    const anchorYs = new Set<number>()
    for (const c of snap.cards.values()) {
      for (const f of [0.25, 0.5, 0.75]) {
        anchorXs.add(Math.round((c.x + c.w * f) * 10) / 10)
        anchorYs.add(Math.round((c.y + c.h * f) * 10) / 10)
      }
      // 12 锚全坐标面：top/bottom 锚的 y=卡上下缘、left/right 锚的 x=卡左右缘
      anchorXs.add(Math.round(c.x * 10) / 10)
      anchorXs.add(Math.round((c.x + c.w) * 10) / 10)
      anchorYs.add(Math.round(c.y * 10) / 10)
      anchorYs.add(Math.round((c.y + c.h) * 10) / 10)
    }
    const xs = new Set<number>([...lanes.v.map((l) => l.coord), ...anchorXs])
    const ys = new Set<number>([...lanes.h.map((l) => l.coord), ...anchorYs])
    for (const p of r.pts) {
      expect(xs.has(p.x), `x=${p.x} ∈锚∪车道表`).toBe(true)
      expect(ys.has(p.y), `y=${p.y} ∈锚∪车道表`).toBe(true)
    }
  })

  it('整框宽墙（x[0,453.2] 膨胀覆 x 域全域含边侧道）→ 布局性不可达=blocked（端点封死族承载——空 d/锚观测保留）', () => {
    const snap = makeSnap({
      cards: new Map<string, Rect>([
        ['A', rect(12, 18, CARD_W, CARD_H)],
        ['WALL', rect(0, 162, 453.2, CARD_H)],
        ['B', rect(12, 306, CARD_W, CARD_H)]
      ]),
      frames: [frame(430)],
      contentH: 430
    })
    const r = routeEdge(geom('e1', 'A', 'B'), snap)
    // 手推：墙膨胀 x[−6,459.2] 杀 x 域内全部 v 道中段（含左缘带 x=2/右缘带
    // 450）——除 A/B 自身死区外无存活竖段 → 搜索无解（非占用性）→ blocked
    expect(r).toMatchObject({ route: 'grid', d: '', pts: [], clearance: 'blocked' })
    expect(r.anchorMarks).toBe('A:b1,B:t1')
  })
})

describe('F-UIRES-03 C2·P7 穿年份头避让（障碍集=卡∪月标注∪年份头——PAD 同源）', () => {
  /** 同列上下卡（帧 {90,60,600,400}→x 域 [91.6,688.4]/contentH=500：
   *  v 道 {132,164,196}+右缘带 238..686；h 道=锚道 {118,136,154,318,336,354}+
   *  行隙 182..286（172+10+8k≤290）+外区带） */
  const columnSnap = (yearHeads: Rect[]): LayoutSnapshot =>
    makeSnap({
      cards: new Map<string, Rect>([
        ['A', rect(100, 100, CARD_W, CARD_H)],
        ['B', rect(100, 300, CARD_W, CARD_H)]
      ]),
      yearHeads,
      frames: [{ x: 90, y: 60, w: 600, h: 400, year: 2022, frameKey: 'k' }],
      contentH: 500
    })

  it('对照基线：无 yearHead→0 拐直连 v164', () => {
    const r = routeEdge(geom('e1', 'A', 'B'), columnSnap([]))
    expect(r.route).toBe('grid')
    expect(r.pts).toEqual([{ x: 164, y: 172 }, { x: 164, y: 300 }])
    expect(r.laneMarks).toBe('v164:172-300')
  })

  it('yearHead 杀 v164 中段→绕行全点列手推：桩到 182→左 132（并列等距 132/196 由方向序 right<left 定）→246（头死区带 [218,240] 上方首道）→末桩入 B', () => {
    // yearHead(144,224,40,10) 膨胀 [138,190]×[218,240]（h=10 计入）：v164 死区
    // 中段 [218,240]→直连废。手推：桩 (164,172)↓(164,182)（走廊 K=5={182..214}，
    // 222 起入头死区滤除，i=0）。4 拐族 len=10+2Δ+(y2−182)+(300−y2)=192
    // （Δ=|x′−164|、y2∈[182,300] 恒并）；x′∈{132,196} 等距 32 并列——横移
    // 越段 [x′,164] 须避头 y 死区 [218,240]（[138,190]∩越段非空）→y2≥240.05
    // →行隙道 {246..286}；goal y 升序定 y2=246；x′ 并列由 (164,246)h 状态入向
    // 方向序 right(2)<left(3) 定 x′=132
    const r = routeEdge(geom('e1', 'A', 'B'), columnSnap([rect(144, 224, 40, 10)]))
    expect(r.route).toBe('grid')
    expect(r.pts).toEqual([
      { x: 164, y: 172 }, { x: 164, y: 182 }, { x: 132, y: 182 },
      { x: 132, y: 246 }, { x: 164, y: 246 }, { x: 164, y: 300 }
    ])
    expect(r.d).toBe(
      'M 164 172 L 164 177 Q 164 182 159 182 L 138 182 Q 132 182 132 188 L 132 240 Q 132 246 138 246 L 158 246 Q 164 246 164 252 L 164 300'
    )
    expect(r.laneMarks).toBe('v164:172-182,h182:132-164,v132:182-246,h246:132-164,v164:246-300')
    expect(r.clearance).toBeUndefined()
  })

  it('障碍集组装：yearHeads 与卡/月标注同源并入（allObstacles 三源并集）', () => {
    const snap = makeSnap({
      cards: new Map<string, Rect>([['A', rect(0, 0, 10, 10)]]),
      labels: [rect(20, 20, 5, 5)],
      yearHeads: [rect(40, 40, 6, 6)]
    })
    expect(allObstacles(snap)).toHaveLength(3)
  })

  it('manual-override 终门承接（via 穿 yearHead → route 仍 manual-override 但 clearance=blocked 空 d——[R2-C3]）', () => {
    // yearHead(290,224,40,10) 膨胀 [284,336]×[218,230]——via 竖段 x=300 穿头：
    // 终门承接合同：三档均碰障=blocked，数据保留不删边
    const r = routeEdge(
      geom('e1', 'A', 'B', [
        { x: 300, y: 136 },
        { x: 300, y: 336 }
      ]),
      columnSnap([rect(290, 224, 40, 10)])
    )
    expect(r.route).toBe('manual-override')
    expect(r.clearance).toBe('blocked')
    expect(r.d).toBe('')
  })

  it('manual-override 障碍集=第三方（源/目标卡全链豁免——[R2-C3] 审查反例回归锚）', () => {
    const gap = makeSnap({
      cards: new Map<string, Rect>([
        ['A', rect(0, 0, CARD_W, CARD_H)],
        ['B', rect(148, 0, CARD_W, CARD_H)]
      ])
    })
    const pins = { fromAnchor: { side: 'right' as const, slot: 1 as const }, toAnchor: { side: 'left' as const, slot: 1 as const } }
    for (const dy of [15, 30, 40]) {
      const r = routeEdge({ edgeId: 'e', sourceId: 'A', targetId: 'B', via: [{ x: 138, y: 36 + dy }], ...pins }, gap)
      expect(r.clearance, `dy=${dy}`).toBeUndefined()
      expect(r.d.length, `dy=${dy}`).toBeGreaterThan(0)
    }
    // 贴自家端卡边（竖段 x=230 距卡缘 2px，在 PAD=6 带内）=用户主权放行
    const hug = routeEdge(
      geom('h1', 'A2', 'B2', [
        { x: 230, y: 136 },
        { x: 230, y: 336 }
      ]),
      makeSnap({ cards: new Map<string, Rect>([['A2', rect(100, 100, CARD_W, CARD_H)], ['B2', rect(100, 300, CARD_W, CARD_H)]]) })
    )
    expect(hug.clearance).toBeUndefined()
    // 同一 V 形沉降但第三方卡落在下沉带 → blocked（承接合同不受豁免稀释）
    const third = makeSnap({
      cards: new Map<string, Rect>([
        ['A', rect(0, 0, CARD_W, CARD_H)],
        ['B', rect(148, 0, CARD_W, CARD_H)],
        ['C', rect(100, 60, 60, 60)]
      ])
    })
    const hit = routeEdge({ edgeId: 'e', sourceId: 'A', targetId: 'B', via: [{ x: 138, y: 120 }], ...pins }, third)
    expect(hit.clearance).toBe('blocked')
    expect(hit.d).toBe('')
  })
})

describe('F-LINEAGE-02 manual-override（via 在场——design-final §2.2）', () => {
  const snap = (): LayoutSnapshot =>
    makeSnap({
      cards: new Map<string, Rect>([
        ['A', rect(100, 100, CARD_W, CARD_H)],
        ['B', rect(100, 300, CARD_W, CARD_H)]
      ])
    })

  it('via 折线构造：锚=端点卡主向定边（右 ½ 序）；route=manual-override；r=6 圆角 pass+共线剔除', () => {
    const via = [
      { x: 300, y: 136 },
      { x: 300, y: 336 }
    ]
    const r = routeEdge(geom('e1', 'A', 'B', via), snap())
    expect(r.route).toBe('manual-override')
    expect(r.d).toBe('M 228 136 L 294 136 Q 300 136 300 142 L 300 330 Q 300 336 294 336 L 228 336')
    expect(r.laneMarks, 'manual 不占车道').toBeUndefined()
  })

  it('via 优先于分配器（在场即 manual）+缺省 via 不触发（自动边走 grid）', () => {
    const withVia = routeEdge(geom('e1', 'A', 'B', [{ x: 250, y: 136 }]), snap())
    expect(withVia.route).toBe('manual-override')
    const gridSnap = makeSnap({
      cards: new Map<string, Rect>([['A', rect(12, 18, CARD_W, CARD_H)], ['B', rect(12, 162, CARD_W, CARD_H)]]),
      frames: [frame(250)],
      contentH: 250
    })
    expect(routeEdge(geom('e2', 'A', 'B'), gridSnap)).toMatchObject({ route: 'grid' })
  })
})

describe('F-LANEGRID-01 B2b 端点防御与态域', () => {
  it('端点卡缺失：d 空+route=grid（自动态单态化）+overlapExempt+onWarn 一次（防御面沿承）', () => {
    const snap = makeSnap({
      cards: new Map<string, Rect>([['A', rect(12, 18, CARD_W, CARD_H)]]),
      frames: [frame(250)],
      contentH: 250
    })
    const onWarn = vi.fn()
    const r = routeEdge(geom('e1', 'A', 'GHOST'), snap, onWarn)
    expect(r.d).toBe('')
    expect(r.route).toBe('grid')
    expect(r.pts).toEqual([])
    expect(r.overlapExempt).toBe(true)
    expect(r.clearance).toBe('blocked')
    expect(onWarn).toHaveBeenCalledTimes(1)
  })

  it('routeAll 态域：混合夹具（同排直连/L 形/跨行/manual）全产出 route∈{grid,manual-override}+d 非空', () => {
    const snap = makeSnap({
      cards: new Map<string, Rect>([
        ['c1', rect(12, 18, CARD_W, CARD_H)],
        ['c2', rect(212, 18, CARD_W, CARD_H)],
        ['c3', rect(112, 162, CARD_W, CARD_H)],
        ['c4', rect(312, 162, CARD_W, CARD_H)]
      ]),
      frames: [frame(250)],
      contentH: 250
    })
    const paths = routeAll(
      [
        geom('e1', 'c1', 'c2'),
        geom('e2', 'c1', 'c3'),
        geom('e3', 'c2', 'c4'),
        geom('e4', 'c3', 'c1'),
        geom('e5', 'c1', 'c2', [{ x: 112, y: 90 }])
      ],
      snap
    )
    const allowed = new Set(['grid', 'manual-override'])
    for (const p of paths) {
      expect(allowed.has(p.route), `route=${p.route} ∈ 新二值域（六态枚举退役）`).toBe(true)
      expect(p.d.length, `${p.edgeId} d 非空`).toBeGreaterThan(0)
    }
  })

  it('源面负锚：routing/ 桶零六态构线器 import 残留（方案切换=删旧——防回潮）', () => {
    const chain = readFileSync(join(process.cwd(), 'src/renderer/features/lineage/routing/chain.ts'), 'utf8')
    expect(chain).not.toMatch(/from '\.\/(detour|bands|outer-ring|slots|residual|zapply|gap-cells)'/)
    expect(chain).not.toMatch(/'direct'|'h-slip'|'detour'|'band'|'outer-ring'|'overlap'/)
    const facade = readFileSync(join(process.cwd(), 'src/renderer/features/lineage/lineage-routing.ts'), 'utf8')
    expect(facade).not.toMatch(/slotMarks|detourMarks|slotFallback/)
  })
})

describe('F-LINEAGE-02 确定性（§1.5 无随机/无 Date/无三角函数）', () => {
  it('同输入 routeEdge 100 次输出全等+routeAll 单边一致（中障绕行夹具——搜索确定性）', () => {
    const snap = makeSnap({
      cards: new Map<string, Rect>([
        ['A', rect(12, 18, CARD_W, CARD_H)],
        ['W', rect(12, 162, CARD_W, CARD_H)],
        ['B', rect(12, 306, CARD_W, CARD_H)]
      ]),
      frames: [frame(430)],
      contentH: 430
    })
    const e = geom('e1', 'A', 'B')
    const first = routeEdge(e, snap)
    expect(first.clearance).toBeUndefined()
    for (let i = 0; i < 100; i++) {
      expect(routeEdge(e, snap)).toEqual(first)
    }
    expect(routeAll([e], snap)).toEqual([first])
  })
})
