/**
 * [F-VISFB-66 单元一] 钉定锚路由面（设计书 v1.2 §F——AnchorUse.pin 三格/
 * W-04 manual 优先级三格/N-01 全 NULL 夹具零回归/N-06 水合边往返端点断言）
 * +装配自检降级（pinOf：非法锚按未钉定+console warn）+[R2-C5] 12 锚全满
 * 回退共享原锚（INV-119③ 散开兜底锚）。always-active。
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { LineageEdge, LineageViaPoint } from '../../../src/shared/models/lineage'
import { AnchorUse, anchorIdOf, anchorPoint, parseAnchorId } from '../../../src/renderer/features/lineage/routing/anchors'
import { routeAll, routeEdge, type EdgeGeomInput, type LayoutSnapshot } from '../../../src/renderer/features/lineage/lineage-routing'
import { pinOf } from '../../../src/renderer/features/lineage/edge-overlay-geom'

/** 两卡上下排布夹具（own 域 rect——直连态可达；[B2b] 补帧/contentH/cardFrame
 *  必填面：帧 {66,60,700,460} → 车道 x 域 [67.6,764.4]、y 域 [0,520]） */
function snapshotTwoCards(): LayoutSnapshot {
  const cards = new Map<string, { x: number; y: number; w: number; h: number }>([
    ['A', { x: 100, y: 100, w: 128, h: 72 }],
    ['B', { x: 100, y: 400, w: 128, h: 72 }]
  ])
  return {
    cards,
    labels: [],
    frames: [{ x: 66, y: 60, w: 700, h: 460, year: null, frameKey: 'k' }],
    yearHeads: [],
    contentW: 1000,
    contentH: 520,
    cardFrame: new Map()
  }
}

function edgeInput(patch: Partial<EdgeGeomInput> = {}): EdgeGeomInput {
  return { edgeId: 'e1', sourceId: 'A', targetId: 'B', ...patch }
}

describe('F-VISFB-66·AnchorUse.pin 三格（禁动/避让/共享）', () => {
  it('避让：pin 后他边 pick 不落占用锚（同侧次空闲槽承接）', () => {
    const use = new AnchorUse()
    use.pin('A', 'bottom', 1)
    const picked = use.pick('A', 'bottom', 1)
    expect(picked).not.toEqual({ side: 'bottom', slot: 1 })
    expect(use.has('A', 'bottom', 1)).toBe(true)
  })

  it('禁动：pin 的锚经 pick 恒不迁移（直取路径不散开——routeOne 钉定端不走 pick）', () => {
    const use = new AnchorUse()
    use.pin('A', 'bottom', 1)
    // 第二边同样 prefer bottom/1：散开避让；第一边钉定端不受影响（直取）
    const picked2 = use.pick('A', 'bottom', 1)
    expect(picked2.slot).not.toBe(1)
    // 钉定端自身取点=anchorPoint 直取（无 pick 介入——几何断言）
    const r = { x: 100, y: 100, w: 128, h: 72 }
    expect(anchorPoint(r, 'bottom', 1)).toEqual({ x: 100 + 128 * 0.5, y: 172 })
  })

  it('注册面：pin 幂等+has 可查（[定点修 N-r4-07] 注释更正——本格=注册表单元面；双边 routeAll 真共享见下方〔定点修〕describe）', () => {
    const use = new AnchorUse()
    use.pin('A', 'bottom', 1)
    expect(() => use.pin('A', 'bottom', 1)).not.toThrow()
    expect(use.has('A', 'bottom', 1)).toBe(true)
  })
})

describe('R2-C5·F2 12 锚全满回退共享原锚（INV-119③ 散开兜底）', () => {
  it('全侧全槽 commit 后 pick 回退首选 (side,slot)=共享原锚（后边与占锚边几何共点）', () => {
    const use = new AnchorUse()
    for (const s of ['top', 'bottom', 'left', 'right'] as const) {
      for (const k of [0, 1, 2]) use.commit('A', s, k)
    }
    expect(use.pick('A', 'bottom', 1)).toEqual({ side: 'bottom', slot: 1 })
    expect(use.pick('A', 'left', 0)).toEqual({ side: 'left', slot: 0 })
  })
})

describe('F-VISFB-66·W-04 manual-override 端点优先级三格（钉定＞主向规则）', () => {
  const via: LineageViaPoint[] = [{ x: 164, y: 200 }, { x: 164, y: 300 }]
  const snap = snapshotTwoCards()

  it('双钉定：skel 端点=两钉定锚几何点（非 selectAnchor 规则锚）', () => {
    const r = routeEdge(
      edgeInput({ via, fromAnchor: { side: 'left', slot: 2 }, toAnchor: { side: 'right', slot: 0 } }),
      snap
    )
    expect(r!.pts[0]).toEqual({ x: 100, y: 100 + 72 * 0.75 })
    expect(r!.pts[r!.pts.length - 1]).toEqual({ x: 228, y: 418 })
    expect(r.anchorMarks).toBe(`${anchorIdOf('A', { side: 'left', slot: 2 })},${anchorIdOf('B', { side: 'right', slot: 0 })}`)
  })

  it('双 NULL：端点=selectAnchor 主向规则锚（现状沿承——A 卡直上锚/B 卡直下锚）', () => {
    const r = routeEdge(edgeInput({ via }), snap)
    // 主向规则锚：A 卡 selectAnchor(A, via[0]=164,200)→bottom/1=(164,172)；
    // B 卡 selectAnchor(B, via 末=164,300)→top/1=(164,400)——非卡几何上下缘
    expect(r!.pts[0]).toEqual({ x: 164, y: 172 })
    expect(r!.pts[r!.pts.length - 1]).toEqual({ x: 164, y: 400 })
    expect(parseAnchorId(r.anchorMarks!.split(',')[0]!)!).toEqual({ cardId: 'A', side: 'bottom', slot: 1 })
  })

  it('混合边：仅 from 钉定生效（钉定端取钉定锚、规则端取规则锚）', () => {
    const r = routeEdge(edgeInput({ via, fromAnchor: { side: 'bottom', slot: 0 } }), snap)
    expect(r!.pts[0]).toEqual({ x: 132, y: 172 })
    expect(r!.pts[r!.pts.length - 1]).toEqual({ x: 164, y: 400 })
  })
})

describe('F-VISFB-66·N-01 全 NULL 锚夹具零回归（[B2b] 金标重冻结——车道网格分配基线）', () => {
  /** [B2b 重冻结·B2 回炉 M-2 更正] 夹具重设计理由=取简单可手推形态（C 与
   *  A 同排→直连/L 两种 0-2 拐形态）；旧 C(500,250) 场景在新几何下仍可达
   *  （4/4 非 blocked——B2 审查探针实测），不因重冻结丢失：旧场景另立可达
   *  性契约例（本 describe 下方「旧 C 场景可达性」）。车道表（手推）：
   *  v={74,82,90,132,164,196,238..486(32),532,564,596,638..758}、
   *  h={10..90,118,136,154,182..390(27),418,436,454,482..542}
   *  逐边期望路径手推算式（禁抄实现输出——金标字节=算式结论冻结）：
   *  - e-direct A→B：selectAnchor 竖向→A:b1(164,172)/B:t1(164,400) 同道 v164
   *    相向、中段 [182,390] 存活（A/B 死区 [94,178]/[394,478] 外）→0 拐直连
   *    v164:172-400；
   *  - e-manual A→B via：manual 早退折线 [(164,172),(164,200),(164,300),
   *    (164,400)]，共线剔除→d='M 164 172 L 164 400'；
   *  - e-hslip A→C：|dx|>|dy| 横向→A:r1(228,136)/C:l1(500,136)（tc.y=sc.y=
   *    136 恰 ½ 位锚道）同道 h136 相向→0 拐直连 h136:228-500；
   *  - e-hslip2 B→C：B:r0=投影 136 越上界取最近 ¼ 序 (228,418)；C:l2=投影
   *    436 越下界取最近 ¾ 序 (500,154)。B 右缘走廊=行内隙道族首道 238
   *    （228+10）桩端；唯一 2 拐 L：(238,418)↑(238,154)→末桩 [490,500] 目标
   *    豁免入锚——laneMarks=h418:228-238,v238:154-418,h154:238-500（拐角
   *    r=min(6,10/2,·)=5/6）。
   *  生成命令（回放单源）：临时件 console.log(JSON.stringify(routeAll(
   *  baseInputs, snap))) → 落 fixtures/lineage-null-anchor-golden.json。 */
  const snap: LayoutSnapshot = {
    cards: new Map([
      ['A', { x: 100, y: 100, w: 128, h: 72 }],
      ['B', { x: 100, y: 400, w: 128, h: 72 }],
      ['C', { x: 500, y: 100, w: 128, h: 72 }]
    ]),
    labels: [],
    frames: [{ x: 66, y: 40, w: 700, h: 512, year: null, frameKey: 'k' }],
    yearHeads: [],
    contentW: 1000,
    contentH: 552,
    cardFrame: new Map()
  }
  const baseInputs: EdgeGeomInput[] = [
    { edgeId: 'e-direct', sourceId: 'A', targetId: 'B' },
    { edgeId: 'e-manual', sourceId: 'A', targetId: 'B', via: [{ x: 164, y: 200 }, { x: 164, y: 300 }] },
    { edgeId: 'e-hslip', sourceId: 'A', targetId: 'C' },
    { edgeId: 'e-hslip2', sourceId: 'B', targetId: 'C' }
  ]
  const golden = JSON.parse(
    readFileSync(join(process.cwd(), 'tests/unit/renderer/fixtures/lineage-null-anchor-golden.json'), 'utf8')
  ) as ReturnType<typeof routeAll>

  it('多态边图（直连×2/manual/L 形）：全 NULL 输入输出=冻结金标逐字节全等', () => {
    expect(routeAll(baseInputs, snap)).toEqual(golden)
  })

  it('锚字段显式 undefined 与缺省全等（归一化面——载荷装配层契约）', () => {
    const withUndef = baseInputs.map((e) => ({ ...e, fromAnchor: undefined, toAnchor: undefined }))
    expect(routeAll(withUndef, snap)).toEqual(golden)
  })

  it('[B2 回炉 M-2] 旧 C(500,250) 场景可达性契约：同帧/contentH 下四边全非 blocked+e-hslip2 全点列手推', () => {
    // 夹具=旧金标坐标（帧 {66,40,700,512}/contentH=552 不变，仅 C 回
    // (500,250)）——异高跨行场景仍可达（B2 审查探针 4/4 实测立案）。
    // e-hslip2' 手推：B:r0=(228,418)（投影 136 越上界取 ¼ 序）/C:l2=(500,304)
    //（投影 436 越下界取 ¾ 序）。单卡行无列隙道→走廊空→自由桩端=B 锚道 532
    //（≥238 最近存活：h-418 余段 [238,532] 存活——B 死区 x[94,234] 外）；
    // v-532 上行至 388（B 行隙 [322,390] 末道：|418−388|=30 最短且 h-388
    // [196,532] 存活——A 死区 y[94,178]/B y[394,478]/C y[244,326] 皆不含）；
    // 左行至 196（A/B 锚道——v-196 [304,388] 存活：A 死区 y[94,178] ∌）；
    // ↓(196,304) 转右末桩 [490,500] C 豁免入锚（4 拐 len=304+30+336+84+304=1058）
    const oldSnap: LayoutSnapshot = {
      cards: new Map([
        ['A', { x: 100, y: 100, w: 128, h: 72 }],
        ['B', { x: 100, y: 400, w: 128, h: 72 }],
        ['C', { x: 500, y: 250, w: 128, h: 72 }]
      ]),
      labels: [],
      frames: [{ x: 66, y: 40, w: 700, h: 512, year: null, frameKey: 'k' }],
      yearHeads: [],
      contentW: 1000,
      contentH: 552,
      cardFrame: new Map()
    }
    const oldEdges: EdgeGeomInput[] = [
      { edgeId: 'e-direct', sourceId: 'A', targetId: 'B' },
      { edgeId: 'e-manual', sourceId: 'A', targetId: 'B', via: [{ x: 164, y: 200 }, { x: 164, y: 300 }] },
      { edgeId: 'e-hslip', sourceId: 'A', targetId: 'C' },
      { edgeId: 'e-hslip2', sourceId: 'B', targetId: 'C' }
    ]
    const ps = routeAll(oldEdges, oldSnap)
    for (const p of ps) expect(p.clearance, `${p.edgeId} 旧 C 场景可达`).toBeUndefined()
    expect(ps[0]!.pts).toEqual([{ x: 164, y: 172 }, { x: 164, y: 400 }])
    expect(ps[2]!.anchorMarks).toBe('A:r2,C:l0')
    expect(ps[3]!.anchorMarks).toBe('B:r0,C:l2')
    expect(ps[3]!.pts).toEqual([
      { x: 228, y: 418 }, { x: 532, y: 418 }, { x: 532, y: 388 },
      { x: 196, y: 388 }, { x: 196, y: 304 }, { x: 500, y: 304 }
    ])
    expect(ps[3]!.laneMarks).toBe('h418:228-532,v532:388-418,h388:196-532,v196:304-388,h304:196-500')
  })
})

describe('F-VISFB-66·N-06 水合边往返（repo 序列化→解析→routeAll 端点断言）', () => {
  it('钉定边：routeAll 端点=钉定锚（routeEdge 单边直取不注册+routeAll 预注册共享同点）', () => {
    const snap = snapshotTwoCards()
    const pinned: EdgeGeomInput = {
      edgeId: 'e-pin',
      sourceId: 'A',
      targetId: 'B',
      fromAnchor: { side: 'left', slot: 0 },
      toAnchor: { side: 'top', slot: 2 }
    }
    const single = routeEdge(pinned, snap)
    const [multi] = routeAll([pinned], snap)
    expect(multi).toBeDefined()
    expect(single.pts[0]).toEqual({ x: 100, y: 118 })
    expect(multi!.pts[0]).toEqual({ x: 100, y: 118 })
    expect(multi!.pts[multi!.pts.length - 1]).toEqual({ x: 100 + 128 * 0.75, y: 400 })
  })

  it('未钉定边（NULL 水合）：端点=规则锚（与基线同——E2 读时派生零写面）', () => {
    const snap = snapshotTwoCards()
    const unpinned: EdgeGeomInput = { edgeId: 'e-null', sourceId: 'A', targetId: 'B' }
    const [r] = routeAll([unpinned], snap)
    expect(r).toBeDefined()
    expect(r!.pts[0]).toEqual({ x: 164, y: 172 })
    expect(r!.pts[r!.pts.length - 1]).toEqual({ x: 164, y: 400 })
  })
})

describe('F-VISFB-66·[回炉 R4] 钉定族（[B2b] grid 重推导——钉定端直取/禁散开沿承 §4）', () => {
  /** 同列三卡+双月框带（B2b 补帧键/contentH=580——末下外区带 482..570 在册：
   *  底锚钉定边自下方带进锚的供给面） */
  const snapBand = (): LayoutSnapshot => ({
    cards: new Map([
      ['A', { x: 100, y: 100, w: 128, h: 72 }],
      ['O', { x: 100, y: 220, w: 128, h: 72 }],
      ['B', { x: 100, y: 400, w: 128, h: 72 }]
    ]),
    labels: [],
    frames: [
      { x: 20, y: 60, w: 900, h: 250, year: 2020, frameKey: 'k1' },
      { x: 20, y: 330, w: 900, h: 250, year: 2021, frameKey: 'k2' }
    ],
    yearHeads: [],
    contentW: 872.8, // [F-DETOURW-01] 对齐=f.w−27.2（声明口径；走线消费 contentW 后 frames 非空例逐例对齐）
    contentH: 580,
    cardFrame: new Map()
  })

  it('toPin 终落=钉定锚且 route=grid（v164 被 O 杀段→左缘带 x=90 绕行——禁散开到其他槽）', () => {
    const r = routeEdge(
      { edgeId: 'e1', sourceId: 'A', targetId: 'B', toAnchor: { side: 'top', slot: 0 } },
      snapBand()
    )
    expect(r.route).toBe('grid')
    // 手推：A:b1(164,172) 桩↓182；O 死区 y[214,298] 杀 v164 直落与近途——左缘
    // 带 x=90（minLeft 100−10）全高存活；B:t0(132,400) 自 h-302（行隙 2 首道）
    // 入末桩
    expect(r.pts).toEqual([
      { x: 164, y: 172 }, { x: 164, y: 182 }, { x: 90, y: 182 },
      { x: 90, y: 302 }, { x: 132, y: 302 }, { x: 132, y: 400 }
    ])
    expect(r.anchorMarks).toBe('A:b1,B:t0')
    expect(r.clearance).toBeUndefined()
  })

  it('fromPin 源端直取=钉定锚（不散开）：A:l2 桩←90→行隙 302→B:t1 末桩', () => {
    const r = routeEdge(
      { edgeId: 'e1', sourceId: 'A', targetId: 'B', fromAnchor: { side: 'left', slot: 2 } },
      snapBand()
    )
    expect(r.route).toBe('grid')
    expect(r.pts[0]).toEqual({ x: 100, y: 154 }) // A left/2=¾ 位（直取——pick 不介入）
    expect(r.pts).toEqual([
      { x: 100, y: 154 }, { x: 90, y: 154 }, { x: 90, y: 302 },
      { x: 164, y: 302 }, { x: 164, y: 400 }
    ])
  })

  it('钉定底锚（背向进锚）：末下外区带 482 自下方进锚（端点仍=钉定锚——主权不变）', () => {
    // toAnchor bottom/0=(132,472)：自上方进锚撞 B 卡身——末桩自下方 h-482
    //（末下外区带首道：maxBottom 472+10）上行入锚（旧=outer-ring 底环同语义）
    const r = routeEdge(
      { edgeId: 'e1', sourceId: 'A', targetId: 'B', toAnchor: { side: 'bottom', slot: 0 } },
      snapBand()
    )
    expect(r.route).toBe('grid')
    expect(r.pts[r.pts.length - 1]).toEqual({ x: 132, y: 472 }) // 端点=钉定锚直取（主权不变）
    expect(r.pts[r.pts.length - 2]).toEqual({ x: 132, y: 482 }) // 末桩=下带 482 自下方进锚
    expect(r.clearance).toBeUndefined()
  })
})

describe('F-VISFB-66·[回炉 S6] 双边共享锚避让+真 repo 水合集成', () => {
  const snapTwo = (): LayoutSnapshot => ({
    cards: new Map([
      ['rA', { x: 100, y: 100, w: 128, h: 72 }],
      ['rB', { x: 100, y: 400, w: 128, h: 72 }]
    ]),
    labels: [],
    frames: [{ x: 66, y: 60, w: 700, h: 460, year: null, frameKey: 'k' }],
    yearHeads: [],
    contentW: 1000,
    contentH: 520,
    cardFrame: new Map()
  })

  it('① 双边共享同锚：两未钉定边同 pair 端锚被 AnchorUse 散开（第二边不落同锚）', () => {
    const snap = snapTwo()
    const edges: EdgeGeomInput[] = [
      { edgeId: 'e1', sourceId: 'rA', targetId: 'rB' },
      { edgeId: 'e2', sourceId: 'rA', targetId: 'rB' }
    ]
    const rs = routeAll(edges, snap)
    const m1 = rs[0]!.anchorMarks!.split(',')
    const m2 = rs[1]!.anchorMarks!.split(',')
    // 双边共享锚已被 pin 预注册+pick 避让：e2 至少一端 != e1 同端锚
    const same = m1[0] === m2[0] && m1[1] === m2[1]
    expect(same, `第二边散开避让（e1=${rs[0]!.anchorMarks} e2=${rs[1]!.anchorMarks}）`).toBe(false)
  })

  it('② 真 repo 水合集成：repo.upsertEdge 写锚列→listGraph 读回→水合边 routeAll 端点=钉定锚', async () => {
    const { createTestDb } = await import('../../utils/fixtures')
    const { createLineageRepo } = await import('../../../src/main/db/repos/lineage.repo')
    const db = createTestDb()
    const repo = createLineageRepo(db)
    for (const id of ['rA', 'rB']) {
      db.prepare(
        `INSERT INTO lineage_nodes (id, paper_id, title, core_idea, year, x, y, created_at, updated_at) VALUES (?, NULL, ?, '', 2020, NULL, NULL, 't', 't')`
      ).run(id, id)
    }
    repo.upsertEdge({
      fromNode: 'rA',
      toNode: 'rB',
      label: '',
      fromAnchor: { side: 'bottom', slot: 2 },
      toAnchor: { side: 'top', slot: 0 }
    })
    const hydrated = repo.listGraph().edges[0]!
    expect(hydrated.fromAnchor).toEqual({ side: 'bottom', slot: 2 })
    expect(hydrated.toAnchor).toEqual({ side: 'top', slot: 0 })
    // 水合边→EdgeGeomInput 装配→routeAll（端点=钉定锚直取）
    const input: EdgeGeomInput = {
      edgeId: hydrated.id,
      sourceId: hydrated.fromNode,
      targetId: hydrated.toNode,
      ...(hydrated.fromAnchor !== undefined ? { fromAnchor: hydrated.fromAnchor } : {}),
      ...(hydrated.toAnchor !== undefined ? { toAnchor: hydrated.toAnchor } : {})
    }
    const rs = routeAll([input], snapTwo())
    const r = rs[0]
    expect(r, `routeAll 产出在场（实测=${JSON.stringify(rs)}`).toBeDefined()
    expect(r!.pts[0]).toEqual({ x: 196, y: 172 }) // A bottom/2=¾
    expect(r!.pts[r!.pts.length - 1]).toEqual({ x: 132, y: 400 }) // B top/0=¼
    db.close()
  })
})

describe('F-VISFB-66·装配自检降级（renderer 读侧：非法锚按未钉定+console warn）', () => {
  afterEach(() => vi.restoreAllMocks())
  it('[S14] 同一非法锚不重复告警（指纹去重）+不同载荷各自一警；合法/null/undefined→原样/undefined 零 warn', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    // 同一非法锚（side 域违例——逐字同载荷）两次：仅一警（指纹去重判别位）
    expect(pinOf({ side: 'leftt', slot: 0 } as unknown as LineageEdge['fromAnchor'])).toBeUndefined()
    expect(pinOf({ side: 'leftt', slot: 0 } as unknown as LineageEdge['fromAnchor'])).toBeUndefined()
    expect(warn).toHaveBeenCalledTimes(1) // [S14] 不重复
    // 不同载荷（slot 域违例）：各自一警（不被 reason 一刀切吞）
    expect(pinOf({ side: 'top', slot: 3 } as unknown as LineageEdge['fromAnchor'])).toBeUndefined()
    expect(warn).toHaveBeenCalledTimes(2)
    expect(pinOf({ side: 'top', slot: 1 })).toEqual({ side: 'top', slot: 1 })
    expect(pinOf(null)).toBeUndefined()
    expect(pinOf(undefined)).toBeUndefined()
    expect(warn).toHaveBeenCalledTimes(2)
  })
})

describe('F-VISFB-66·[定点修] routeAll 真·同锚共享（S6① 补格——非仅 pin 幂等）', () => {
  // 两边钉 **A 卡同一锚**（bottom/1——e1/e2 异对端不违 UNIQUE）→routeAll
  // 两边起点=同一钉定锚点（共享不散开）+第三条未钉定边 pick 避让该锚
  it('双边同锚直取同点+未钉定边避让（routeAll 全链）', () => {
    const snap: LayoutSnapshot = {
      cards: new Map([
        ['A', { x: 100, y: 100, w: 128, h: 72 }],
        ['B', { x: 100, y: 400, w: 128, h: 72 }],
        ['C', { x: 400, y: 400, w: 128, h: 72 }]
      ]),
      labels: [],
      frames: [{ x: 66, y: 60, w: 700, h: 460, year: null, frameKey: 'k' }],
      yearHeads: [],
      contentW: 1000,
      contentH: 520,
      cardFrame: new Map()
    }
    const pinned = { side: 'bottom' as const, slot: 1 as const }
    const out = routeAll(
      [
        { edgeId: 'e1', sourceId: 'A', targetId: 'B', fromAnchor: pinned },
        { edgeId: 'e2', sourceId: 'A', targetId: 'C', fromAnchor: pinned },
        { edgeId: 'e3', sourceId: 'A', targetId: 'B' }
      ],
      snap
    )
    const p = anchorPoint(snap.cards.get('A')!, 'bottom', 1)
    expect(out[0]!.pts[0], 'e1 起点=钉定锚').toEqual(p)
    expect(out[1]!.pts[0], 'e2 起点=同一钉定锚（共享不散开——真同锚格）').toEqual(p)
    const e3mark = out[2]!.anchorMarks ?? ''
    expect(e3mark, `未钉定边避让钉定锚（marks=${e3mark}）`).not.toContain(anchorIdOf('A', { side: 'bottom', slot: 1 }))
  })
})
