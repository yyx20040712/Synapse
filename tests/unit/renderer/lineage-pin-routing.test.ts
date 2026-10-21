/**
 * [F-VISFB-66 单元一] 钉定锚路由面（设计书 v1.2 §F——AnchorUse.pin 三格/
 * W-04 manual 优先级三格/N-01 全 NULL 夹具零回归/N-06 水合边往返端点断言）
 * +装配自检降级（pinOf：非法锚按未钉定+console warn）。always-active。
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { LineageEdge, LineageViaPoint } from '../../../src/shared/models/lineage'
import { AnchorUse, anchorIdOf, anchorPoint, parseAnchorId } from '../../../src/renderer/features/lineage/routing/anchors'
import { routeAll, routeEdge, type EdgeGeomInput, type LayoutSnapshot } from '../../../src/renderer/features/lineage/lineage-routing'
import { pinOf } from '../../../src/renderer/features/lineage/edge-overlay-geom'

/** 两卡上下排布夹具（own 域 rect——direct 态可达） */
function snapshotTwoCards(): LayoutSnapshot {
  const cards = new Map<string, { x: number; y: number; w: number; h: number }>([
    ['A', { x: 100, y: 100, w: 128, h: 72 }],
    ['B', { x: 100, y: 400, w: 128, h: 72 }]
  ])
  return { cards, labels: [], frames: [], yearHeads: [], contentW: 1000 }
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

describe('F-VISFB-66·N-01 全 NULL 锚夹具零回归（[回炉 R8] 金标冻结——自比较形态已删）', () => {
  const snap: LayoutSnapshot = {
    cards: new Map([
      ['A', { x: 100, y: 100, w: 128, h: 72 }],
      ['B', { x: 100, y: 400, w: 128, h: 72 }],
      ['C', { x: 500, y: 250, w: 128, h: 72 }]
    ]),
    labels: [],
    frames: [],
    yearHeads: [],
    contentW: 1000
  }
  const baseInputs: EdgeGeomInput[] = [
    { edgeId: 'e-direct', sourceId: 'A', targetId: 'B' },
    { edgeId: 'e-manual', sourceId: 'A', targetId: 'B', via: [{ x: 164, y: 200 }, { x: 164, y: 300 }] },
    { edgeId: 'e-hslip', sourceId: 'A', targetId: 'C' },
    { edgeId: 'e-hslip2', sourceId: 'B', targetId: 'C' }
  ]
  /**
   * [回炉 R8] 等价性论证：NULL 输入（fromAnchor/toAnchor 缺省）≡66 前
   * EdgeGeomInput 形态（字段缺席→routeOne 走现行 selectAnchor/anchorPick 派
   * 生路径——与 66 前代码同构：钉定分支以 undefined 短路进原路径）；派生
   * 逻辑未动→输出逐字节等于 66 前基线。金标=fixtures/lineage-null-anchor-
   * golden.json（字面值冻结——改派生逻辑即红，非自比较恒真）。
   */
  /**
   * [S6③] 金标 fixture 生成命令（回放单源）：
   *   临时件（tmp-dump/dump.test.ts）console.log('FIXTURE_JSON='+
   *   JSON.stringify(routeAll(baseInputs, snap))) → vitest run 采 stdout →
   *   落 fixtures/lineage-null-anchor-golden.json（本批已执行——值冻结）。
   * 等价性论证补强：全 NULL 输入（锚字段缺席）≡66 前 EdgeGeomInput 形态恒等
   * （routeOne 钉定分支以 undefined 短路进原 selectAnchor/anchorPick 派生路
   * 径——形态同构）；66 批未动 detour/bands/slots/rounding 派生路径→输出
   * 逐字节等于 66 前基线。改派生逻辑即红（金标字面值非自比较恒真）。
   */
  const golden = JSON.parse(
    readFileSync(join(process.cwd(), 'tests/unit/renderer/fixtures/lineage-null-anchor-golden.json'), 'utf8')
  ) as ReturnType<typeof routeAll>

  it('多态边图（direct/manual/h-slip×2）：全 NULL 输入输出=冻结金标逐字节全等', () => {
    expect(routeAll(baseInputs, snap)).toEqual(golden)
  })

  it('锚字段显式 undefined 与缺省全等（归一化面——载荷装配层契约）', () => {
    const withUndef = baseInputs.map((e) => ({ ...e, fromAnchor: undefined, toAnchor: undefined }))
    expect(routeAll(withUndef, snap)).toEqual(golden)
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

describe('F-VISFB-66·[回炉 R4] band 钉定族（bandSkeleton fromPin/toPin 消费面+不可达降级）', () => {
  /** 同列三卡+双月框带（band 域在场——探测定谳几何：oy=220 拦直连） */
  const snapBand = (): LayoutSnapshot => ({
    cards: new Map([
      ['A', { x: 100, y: 100, w: 128, h: 72 }],
      ['O', { x: 100, y: 220, w: 128, h: 72 }],
      ['B', { x: 100, y: 400, w: 128, h: 72 }]
    ]),
    labels: [],
    frames: [
      { x: 20, y: 60, w: 900, h: 250, year: 2020 },
      { x: 20, y: 330, w: 900, h: 250, year: 2021 }
    ],
    yearHeads: [],
    contentW: 872.8 // [F-DETOURW-01] 对齐=f.w−27.2（声明口径——N=4/M=4 档行为保持；走线消费 contentW 后 frames 非空例逐例对齐）
  })

  it('toPin 终落=钉定锚且 route=band（bandSkeleton 钉定终落分支——禁散开到其他槽）', () => {
    const r = routeEdge(
      { edgeId: 'e1', sourceId: 'A', targetId: 'B', toAnchor: { side: 'top', slot: 0 } },
      snapBand()
    )
    expect(r.route).toBe('band')
    expect(r.pts[r.pts.length - 1]).toEqual({ x: 132, y: 400 }) // B top/0=¼ 位钉定锚
    expect(r.anchorMarks!.split(',')[1]!.endsWith(':t0')).toBe(true)
  })

  it('fromPin 源端直取=钉定锚（bandSkeleton fromPin 分支——不散开）', () => {
    const r = routeEdge(
      { edgeId: 'e1', sourceId: 'A', targetId: 'B', fromAnchor: { side: 'left', slot: 2 } },
      snapBand()
    )
    expect(r.pts[0]).toEqual({ x: 100, y: 154 }) // A left/2=¾ 位
  })

  it('钉定不可达→band 降 overlap（终落检查不过=兜底态——端点仍=钉定锚）', () => {
    // toAnchor bottom/0：终落桩向下撞 B 卡身——band 终落检查不过
    const r = routeEdge(
      { edgeId: 'e1', sourceId: 'A', targetId: 'B', toAnchor: { side: 'bottom', slot: 0 } },
      snapBand()
    )
    expect(r.route).toBe('overlap') // 降级兜底
    expect(r.pts[r.pts.length - 1]).toEqual({ x: 132, y: 472 }) // overlap 端点=钉定锚直取
  })
})

describe('F-VISFB-66·[回炉 S6] 双边共享锚避让+真 repo 水合集成', () => {
  const snapTwo = (): LayoutSnapshot => ({
    cards: new Map([
      ['rA', { x: 100, y: 100, w: 128, h: 72 }],
      ['rB', { x: 100, y: 400, w: 128, h: 72 }]
    ]),
    labels: [],
    frames: [],
    yearHeads: [],
    contentW: 1000
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
      labels: [], frames: [], yearHeads: [], contentW: 1000
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
