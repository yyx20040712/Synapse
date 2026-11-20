/**
 * [F-LANEGRID-01 B4] 走线车道网格 e2e（R1-R5——车道网格分配器观测面重基线）。
 *
 * ── 夹具口径（期望几何全实测派生——车道表直算零镜面）──
 * - 视口 1280×860 固定；一切期望几何实测派生（卡 rect/月框/月标注 own 域
 *   rect÷z in-page 采集，Node 侧 grid.buildLaneTable 单源 import 直算期望
 *   坐标集），零硬编码坐标——字体度量平台差由实测吸收。
 * - [F-LANEGRID-01 B4 重基线] 六态链已换车道网格分配器：RouteTag 单态化
 *   （自动态恒 'grid'，manual-override=via 边）；[F-SLOTGRID-01 U2] 槽位
 *   分点公式与五态域断言（band/detour 绕行族/data-slot/retain 豁免支）随
 *   槽位与六态机制退役删除（历史口径申报——2026-11-20 B4）；R1/R2/R5
 *   绕行族断言=route='grid'（车道网格绕行族）。
 * - 观测钩子=data-route（grid 单态）/data-lane（占道段「轴+坐标:起-止」
 *   逗号串——laneMarkOf 单源）/data-overlap-exempt（仅 overlapSpans 非空
 *   时 '1'）/data-overlap-spans（段级冲突区间串列逗号连接）；data-slot/
 *   data-slot-fallback 已随槽位机制删除。
 * - R1 绕卡=三卡+障碍卡（2020-05 两卡/06 障碍/07 目标）→path 采样避障碍卡
 *   rect±PAD；R2 跨年=2020-12→2022-05 中隔 2021 障碍卡→path 避全部
 *   .tl-year-num/.tl-year-meta 文本区（年份头障碍集承重）；R3 同月相邻卡
 *   双向边=同缝双消费（车道坐标封闭+互异道或 overlapSpans 登记——INV-112
 *   新口径；zoom 1.0/1.5 双跑 rect÷z 恒等）；R4 重合态=grid 直连边+via
 *   手动边贴同电平（一次 launch 量电平→关应用→spec 进程 better-sqlite3
 *   直写 via→二次 launch 冷读）→点击重合段中点命中层不抛错且可选中；
 *   R5 三卡同列 1→3 探针回归（竖直段 x∈车道表坐标集——INV-SLOTGRID-02
 *   新口径+标注覆盖；月标注骑月份框上边界中轴——.month-tag rect 实测
 *   派生自吸收）。
 *
 * ── helper 落位申报 ──
 * - expectPathAvoids=本 spec helper 区（非 geo-probes 追加）：geo-probes 头注
 *   单源边界=**三类 rect 断言**（邻近/静止/无瞬跳）；路径采样判交族=本批
 *   新面（T-P1b pathClearOfTags 段化采样模式），驻消费方避免扩锁面单源域。
 * - laneGeoProbe/laneUniverse=本 spec helper 区（stress observe+buildUniverse
 *   同型子集——期望坐标集=锚∪车道表 buildLaneTable 直算，单源 import
 *   src/renderer/.../routing/grid，零镜面）。
 *
 * - R3 取景申报：产品库 UNIQUE(from,to) 使同端点对三边不可达（设计 §5 S3
 *   同锚三边=单测域；e2e 域结构证明可达最大=同单元双消费——双向边，跨卡
 *   桥边必穿中间卡被避让链拦），本 spec 断言可达核（同缝车道坐标封闭+
 *   互异道/登记+zoom 双跑），三线面由单测承载。
 */
import { test, expect, type Page } from '@playwright/test'
import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import Database from 'better-sqlite3'
import { PAD } from '../../src/renderer/features/lineage/routing/avoid'
import { buildLaneTable } from '../../src/renderer/features/lineage/routing/grid'
import { bootstrapMigrations, launch, seedLineageGraph, seedPaperRow } from './e2e-env'
import { zoomProbe } from './geo-probes'

/** 幽灵文献行（seedPaperRow——lineage.spec seedLineagePapers 同型） */
async function seedGhosts(userData: string, ids: string[], titles: string[]): Promise<void> {
  for (let i = 0; i < ids.length; i++) {
    const sha = createHash('sha256').update(`u4-r-${ids[i]}`).digest('hex')
    await seedPaperRow(userData, `${sha.slice(0, 2)}/${sha.slice(2, 4)}/${sha}.pdf`, sha, titles[i]!, ids[i])
  }
}

/** 建库+种子一步（R1-R5 夹具公共面） */
async function seedFixture(
  userData: string,
  ids: string[],
  titles: string[],
  graph: Parameters<typeof seedLineageGraph>[1]
): Promise<void> {
  await bootstrapMigrations(userData)
  await seedGhosts(userData, ids, titles)
  await seedLineageGraph(userData, graph)
}

/** 进脉络视图+等首卡在场（lineage.spec reloadToLineage 前半同型） */
async function openLineage(win: Page, firstTitle: string): Promise<void> {
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
  await win.setViewportSize({ width: 1280, height: 860 })
  await win.getByRole('button', { name: '脉络', exact: true }).click()
  await expect(win.locator('.tl-card').first()).toContainText(firstTitle, { timeout: 10_000 })
}

/** 内容缩放（.tl-content computed transform matrix——buildSnapshot contentScale 同源读法） */
async function contentZ(win: Page): Promise<number> {
  return win.evaluate(() => {
    const ct = document.querySelector('.tl-content')
    if (ct === null) throw new Error('.tl-content 不在场')
    const m = /matrix\(([\d.]+),/.exec(getComputedStyle(ct).transform)
    return m === null ? 1 : Number(m[1])
  })
}

/** 等连线渲染稳定（计数到位+全体 d 双读全等——rAF 重算收敛证据） */
async function waitForPaths(win: Page, count: number): Promise<void> {
  await expect
    .poll(async () => await win.locator('svg.tl-edges path.tl-edge').count(), { timeout: 10_000 })
    .toBe(count)
  const ds = (): Promise<string[]> => win.locator('svg.tl-edges path.tl-edge').evaluateAll((els) => els.map((e) => e.getAttribute('d') ?? ''))
  for (let i = 0; i < 20; i++) {
    const a = await ds()
    await win.waitForTimeout(120)
    if (JSON.stringify(a) === JSON.stringify(await ds())) return
  }
}

/** 障碍描述：sel=原生 CSS 选择器；hasText=在场合文本过滤（title 含混面） */
interface ObstacleSpec {
  sel: string
  hasText?: string
}

/**
 * 路径避障断言：path 沿弧长 128 点采样（T-P1b pathClearOfTags 段化采样模式
 * ——相邻采样连线段 vs 障碍 rect 集±pad 判交，Liang-Barsky 边界相触=命中）。
 * 坐标自校准：getBBox 用户坐标 vs getBoundingClientRect 缩放/平移（零 svg
 * 定位假设）；pad 单位=屏幕 px（调用方按 z 换算内容 PAD）。
 */
async function expectPathAvoids(
  win: Page,
  pathSel: string,
  obstacles: ObstacleSpec[],
  padScreen: number,
  label: string
): Promise<void> {
  const hit = await win.evaluate(
    ({ pathSel, obstacles, pad, label }) => {
      const path = document.querySelector(pathSel) as SVGPathElement | null
      if (path === null) return { label, err: `路径不存在：${pathSel}` }
      const rects: Array<{ r: DOMRect; desc: string }> = []
      for (const o of obstacles) {
        for (const el of Array.from(document.querySelectorAll(o.sel))) {
          if (o.hasText !== undefined && !(el.textContent ?? '').includes(o.hasText)) continue
          rects.push({ r: el.getBoundingClientRect(), desc: `${o.sel}"${o.hasText ?? ''}"` })
        }
      }
      if (rects.length === 0) return { label, err: '障碍集为空（恒真断言面）' }
      const bb = path.getBBox()
      const br = path.getBoundingClientRect()
      const z = bb.width === 0 ? 1 : br.width / bb.width
      const ox = br.left - bb.x * z
      const oy = br.top - bb.y * z
      const segHitsRect = (ax: number, ay: number, bx: number, by: number, l: number, tp: number, r: number, bm: number): boolean => {
        let t0 = 0
        let t1 = 1
        const dx = bx - ax
        const dy = by - ay
        const edges: Array<[number, number]> = [
          [-dx, ax - l],
          [dx, r - ax],
          [-dy, ay - tp],
          [dy, bm - ay]
        ]
        for (const [den, num] of edges) {
          if (den === 0) {
            if (num < 0) return false
            continue
          }
          const q = num / den
          if (den < 0) {
            if (q > t1) return false
            if (q > t0) t0 = q
          } else {
            if (q < t0) return false
            if (q < t1) t1 = q
          }
        }
        return true
      }
      const total = path.getTotalLength()
      const N = 128
      let prev: { x: number; y: number } | null = null
      for (let k = 0; k <= N; k++) {
        const p = path.getPointAtLength((total * k) / N)
        const px = ox + p.x * z
        const py = oy + p.y * z
        if (prev !== null) {
          for (const o of rects) {
            const l = o.r.left - pad
            const r = o.r.right + pad
            const tp = o.r.top - pad
            const bm = o.r.bottom + pad
            if (segHitsRect(prev.x, prev.y, px, py, l, tp, r, bm)) {
              return {
                label,
                err: `路径采样段 (${prev.x.toFixed(1)},${prev.y.toFixed(1)})→(${px.toFixed(1)},${py.toFixed(1)}) 命中 ${o.desc} rect[${l.toFixed(1)},${r.toFixed(1)}]×[${tp.toFixed(1)},${bm.toFixed(1)}]（pad=${pad}）`
              }
            }
          }
        }
        prev = { x: px, y: py }
      }
      return { label, err: null as string | null }
    },
    { pathSel, obstacles, pad: padScreen, label }
  )
  expect(hit.err, `${label}：${hit.err ?? '净空'}`).toBeNull()
}

/** 车道表直算布局采集面（own 域 rect÷z——stress observe 同型子集；GridInput 全五字段） */
interface LaneGeo {
  cards: Array<{ x: number; y: number; w: number; h: number }>
  labels: Array<{ x: number; y: number; w: number; h: number }>
  yearHeads: Array<{ x: number; y: number; w: number; h: number }>
  frames: Array<{ x: number; y: number; w: number; h: number }>
  /** 内容盒高=帧底最大值（stress buildUniverse 同式——v 坐标集派生不敏感，h 域上界用） */
  contentH: number
}

/** 布局采集探针：卡/月标注/年份头/月框 own rect+contentH（rect÷z——zoom 档间恒等） */
async function laneGeoProbe(win: Page): Promise<LaneGeo> {
  return win.evaluate(() => {
    const content = document.querySelector('.tl-content') as HTMLElement | null
    if (content === null) throw new Error('laneGeoProbe：.tl-content 不在场')
    const base = content.getBoundingClientRect()
    const zm = /matrix\(([\d.]+),/.exec(getComputedStyle(content).transform)
    const z = zm === null ? 1 : Number(zm[1])
    const own = (el: Element): { x: number; y: number; w: number; h: number } => {
      const r = el.getBoundingClientRect()
      return {
        x: +((r.left - base.left) / z).toFixed(3),
        y: +((r.top - base.top) / z).toFixed(3),
        w: +(r.width / z).toFixed(3),
        h: +(r.height / z).toFixed(3)
      }
    }
    const frames = Array.from(document.querySelectorAll('.month-frame')).map(own)
    if (frames.length === 0) throw new Error('laneGeoProbe：月框不在场')
    return {
      cards: Array.from(document.querySelectorAll('.tl-card[data-node-id]')).map(own),
      labels: Array.from(document.querySelectorAll('.month-tag')).map(own),
      yearHeads: Array.from(document.querySelectorAll('.tl-year-num, .tl-year-meta')).map(own),
      frames,
      contentH: +Math.max(...frames.map((f) => f.y + f.h)).toFixed(3)
    }
  })
}

/** 期望坐标集直算（Node 侧 buildLaneTable 单源 import——零镜面；v/h=轴别坐标集） */
function laneUniverse(geo: LaneGeo): { v: number[]; h: number[] } {
  const t = buildLaneTable({
    cards: geo.cards,
    labels: geo.labels,
    yearHeads: geo.yearHeads,
    frames: geo.frames,
    contentH: geo.contentH
  })
  return { v: t.v.map((l) => l.coord), h: t.h.map((l) => l.coord) }
}

/** 路径观测面（缝中点电平 y=内容坐标；twoPoint=0 拐直连族 d 形态） */
interface PathLevel {
  route: string
  y: number
  laneAttr: string
  exemptAttr: string
  spansAttr: string
  twoPoint: boolean
}
interface SeamProbe {
  cellMidX: number
  paths: PathLevel[]
}

/** 同列缝单元探针：缝中点 x+各 path 缝中点电平与观测属性（全内容坐标——rect÷z） */
async function seamProbe(win: Page): Promise<SeamProbe> {
  return win.evaluate(() => {
    const content = document.querySelector('.tl-content') as HTMLElement | null
    if (content === null) throw new Error('seamProbe：.tl-content 不在场')
    const base = content.getBoundingClientRect()
    const zm = /matrix\(([\d.]+),/.exec(getComputedStyle(content).transform)
    const z = zm === null ? 1 : Number(zm[1])
    const cards = Array.from(document.querySelectorAll('.tl-card[data-node-id]')).map((c) => c.getBoundingClientRect())
    if (cards.length !== 2) throw new Error('seamProbe：卡数≠2')
    const left = cards[0]!.right < cards[1]!.left ? cards[0]! : cards[1]!
    const right = cards[0]!.right < cards[1]!.left ? cards[1]! : cards[0]!
    // 单元 rect（内容坐标=屏 rect÷z——buildSnapshot toBox 同式；x=左卡右缘）
    const cell = {
      x: (left.right - base.left) / z,
      w: (right.left - left.right) / z
    }
    const cellMidScreen = left.right + (right.left - left.right) / 2
    const cellMidX = +(cell.x + cell.w / 2).toFixed(2)
    const paths = Array.from(document.querySelectorAll('svg.tl-edges path.tl-edge')) as SVGPathElement[]
    const levels = paths.map((p) => {
      const bb = p.getBBox()
      const br = p.getBoundingClientRect()
      const zP = bb.width === 0 ? 1 : br.width / bb.width
      const total = p.getTotalLength()
      const N = 64
      let bestUserY = Infinity
      let bestDx = Infinity
      for (let k = 0; k <= N; k++) {
        const pt = p.getPointAtLength((total * k) / N)
        const sx = br.left - bb.x * zP + pt.x * zP
        const dx = Math.abs(sx - cellMidScreen)
        if (dx < bestDx) {
          bestDx = dx
          bestUserY = pt.y
        }
      }
      return {
        route: p.dataset.route ?? '',
        y: +bestUserY.toFixed(2),
        laneAttr: p.dataset.lane ?? '',
        exemptAttr: p.dataset.overlapExempt ?? '',
        spansAttr: p.dataset.overlapSpans ?? '',
        twoPoint: (p.getAttribute('d') ?? '').split(/[ML]/).length === 3
      }
    })
    return { cellMidX, paths: levels }
  })
}

test.describe('F-LANEGRID-01 B4 走线车道网格 e2e（R1-R5）', () => {
  /**
   * R1 绕卡：三卡（甲/乙/丁）+障碍卡（丙拦甲→丁直连）→route='grid'（车道
   * 网格绕行族——RouteTag 单态化）+path 采样点避丙 rect±PAD。
   */
  test('R1 绕卡：障碍卡拦直连→路径避障 rect±PAD+route=grid', async () => {
    const userData = await mkdtemp(join(tmpdir(), 'u4-r1-'))
    await seedFixture(userData, ['u4r-a', 'u4r-a2', 'u4r-o', 'u4r-b'], ['绕卡甲', '绕卡乙', '绕障丙', '绕卡丁'], {
      nodes: [
        { paperId: 'u4r-a', title: '绕卡甲', year: 2020, month: 5, slot: 1 },
        { paperId: 'u4r-a2', title: '绕卡乙', year: 2020, month: 5, slot: 2 },
        { paperId: 'u4r-o', title: '绕障丙', year: 2020, month: 6, slot: 1 },
        { paperId: 'u4r-b', title: '绕卡丁', year: 2020, month: 7, slot: 1 }
      ],
      edges: [{ from: 'u4r-a', to: 'u4r-b', label: '' }]
    })
    const app = await launch(userData)
    const win = await app.firstWindow()
    await openLineage(win, '绕卡甲')
    await waitForPaths(win, 1)
    const route = await win.locator('svg.tl-edges path.tl-edge').first().evaluate((el) => (el as SVGPathElement).dataset.route ?? '')
    // [RR1 非空卫——门一双席共识] 空读（属性缺失/选择器漂移）恒过判别，
    // 先钉非空再判别（恒真断言防线——RR1 变异 4b 实证空读恒过）
    expect(route, 'R1 route 非空卫（data-route 缺席即红）').not.toBe('')
    expect(route, 'R1 实测 route=grid（车道网格绕行族——RouteTag 单态化）').toBe('grid')
    const z = await contentZ(win)
    await expectPathAvoids(win, 'svg.tl-edges path.tl-edge', [{ sel: '.tl-card[data-node-id]', hasText: '绕障丙' }], PAD * z, 'R1 避障丙')
    await app.close()
  })

  /**
   * R2 跨年：2020-12→2022-05（中隔 2021-01 障碍卡）→route='grid'（跨年绕行
   * =车道网格多拐）+path 避全部年份头两文本区（年份头障碍集承重证据=无该
   * 集即穿文本区）。
   */
  test('R2 跨年连线不穿 .tl-year-num/.tl-year-meta 两文本区', async () => {
    const userData = await mkdtemp(join(tmpdir(), 'u4-r2-'))
    await seedFixture(userData, ['u4r-t', 'u4r-o2', 'u4r-b2'], ['跨年甲', '跨年障', '跨年乙'], {
      nodes: [
        { paperId: 'u4r-t', title: '跨年甲', year: 2020, month: 12, slot: 1 },
        { paperId: 'u4r-o2', title: '跨年障', year: 2021, month: 1, slot: 1 },
        { paperId: 'u4r-b2', title: '跨年乙', year: 2022, month: 5, slot: 1 }
      ],
      edges: [{ from: 'u4r-t', to: 'u4r-b2', label: '' }]
    })
    const app = await launch(userData)
    const win = await app.firstWindow()
    await openLineage(win, '跨年甲')
    await waitForPaths(win, 1)
    const route = await win.locator('svg.tl-edges path.tl-edge').first().evaluate((el) => (el as SVGPathElement).dataset.route ?? '')
    // [RR1 非空卫——同 R1（门一双席共识）]
    expect(route, 'R2 route 非空卫').not.toBe('')
    expect(route, 'R2 实测 route=grid（直连被拦——跨年绕行=车道网格多拐）').toBe('grid')
    const z = await contentZ(win)
    await expectPathAvoids(win, 'svg.tl-edges path.tl-edge', [{ sel: '.tl-year-num' }, { sel: '.tl-year-meta' }], PAD * z, 'R2 避年份头文本区')
    await app.close()
  })

  /**
   * R3 同缝双消费（zoom 1.0/1.5 双跑）：同月相邻卡双向边→（a）双边在场且
   * route='grid'；（b）laneMarks 逐占道段坐标∈车道表坐标集±0.6（buildLaneTable
   * 直算——INV-SLOTGRID-02 新口径；实测横邻双向边=0 拐直连族散开互异 h 道，
   * 竖道坐标随夹具形态入集同判——轴别封闭非空卫防恒真）；（c）互异道或登记：
   * 共享道（同轴同坐标）⟹至少一边 data-overlap-spans 在场（同道重叠⟹
   * overlapSpans 登记——INV-112 新口径）；（d）rect÷z 归一化恒等：laneMarks
   * 与缝中点电平两档全等。
   */
  test('R3 同缝双消费：车道坐标封闭+互异道/overlapSpans 登记（zoom 1.0/1.5 双跑——rect÷z 恒等）', async () => {
    const userData = await mkdtemp(join(tmpdir(), 'u4-r3-'))
    await seedFixture(userData, ['u4r-l1', 'u4r-l2'], ['槽位甲', '槽位乙'], {
      nodes: [
        { paperId: 'u4r-l1', title: '槽位甲', year: 2020, month: 5, slot: 1 },
        { paperId: 'u4r-l2', title: '槽位乙', year: 2020, month: 5, slot: 2 }
      ],
      edges: [
        { from: 'u4r-l1', to: 'u4r-l2', label: '' },
        { from: 'u4r-l2', to: 'u4r-l1', label: '' }
      ]
    })
    const app = await launch(userData)
    const win = await app.firstWindow()
    await openLineage(win, '槽位甲')

    /** 断言体（tag=档位标注）：(a)双边 grid+(b)车道坐标封闭+(c)互异道/登记 */
    const runAssertions = async (tag: string): Promise<SeamProbe> => {
      await waitForPaths(win, 2)
      const m = await seamProbe(win)
      const uni = laneUniverse(await laneGeoProbe(win))
      // (a) 双边在场+grid 单态
      expect(m.paths.length, `${tag} 双边在场`).toBe(2)
      for (const p of m.paths) {
        expect(p.route, `${tag} route=grid（车道网格单态）`).toBe('grid')
      }
      // (b) 坐标集封闭：laneMarks 逐 token 轴别∈车道表坐标集±0.6（亚像素容差）
      const inSet = (c: number, set: number[]): boolean => set.some((s) => Math.abs(s - c) <= 0.6)
      const laneTokens: Array<Array<{ axis: string; coord: number }>> = []
      for (const p of m.paths) {
        expect(p.laneAttr, `${tag} data-lane 非空卫（占道段观测串——空读防恒真）`).not.toBe('')
        const toks = p.laneAttr.split(',').map((t) => /^([vh])(-?[\d.]+):/.exec(t))
        expect(
          toks.every((mt) => mt !== null),
          `${tag} laneMarks token 形如 轴+坐标:起-止（实测 lane=${p.laneAttr}）`
        ).toBe(true)
        const cs = toks.map((mt) => ({ axis: mt![1]!, coord: Number(mt![2]!) }))
        laneTokens.push(cs)
        for (const c of cs) {
          expect(
            inSet(c.coord, c.axis === 'v' ? uni.v : uni.h),
            `${tag} ${c.axis}道坐标 ${c.coord} ∈车道表坐标集±0.6（实测 lane=${p.laneAttr}）`
          ).toBe(true)
        }
        // 豁免位一致性：data-overlap-exempt='1' ⟺ data-overlap-spans 在场（DOM 发射序单源）
        expect(p.exemptAttr, `${tag} exempt⟺spans 一致（实测 exempt=${p.exemptAttr} spans=${p.spansAttr}）`).toBe(p.spansAttr !== '' ? '1' : '')
      }
      // (c) 互异道或登记：共享道（同轴同坐标）⟹至少一边 overlapSpans 登记
      const shared = laneTokens[0]!.filter((a) => laneTokens[1]!.some((b) => b.axis === a.axis && b.coord === a.coord))
      expect(
        shared.length === 0 || m.paths.some((p) => p.spansAttr !== ''),
        `${tag} 两边车道互异（共享道=${JSON.stringify(shared)}）或共享道已 overlapSpans 登记（实测 spans=${m.paths.map((p) => p.spansAttr).join('|')}）`
      ).toBe(true)
      return m
    }

    let at10: SeamProbe | undefined
    await zoomProbe(win, 1.0, async () => {
      at10 = await runAssertions('zoom1.0')
    })
    await zoomProbe(win, 1.5, async () => {
      const m = await runAssertions('zoom1.5')
      // (d) rect÷z 归一化恒等：laneMarks 与缝中点电平两档全等
      expect(m.paths.map((p) => p.laneAttr), 'R3 zoom 1.0/1.5 laneMarks 两档全等').toEqual(at10!.paths.map((p) => p.laneAttr))
      expect(m.paths.map((p) => p.y), 'R3 zoom 1.0/1.5 缝中点电平两档全等').toEqual(at10!.paths.map((p) => p.y))
    })
    await app.close()
  })

  /**
   * R4 重合态命中层抽查：grid 直连边+via 手动边贴同电平（一次 launch 量电平
   * →关应用→spec 进程直写 via→二次 launch 冷读）→两线重合→edit 态点击重合
   * 段中点不抛错+至少一条可选中（命中层 stroke 8；手动边渲染序末位=恒最上）。
   * [B4] retain 豁免概念退役：grid 边断两点直线（0 拐直连族）+无溢出登记
   * （data-overlap-spans 缺席或空）。
   */
  test('R4 重合态：grid 直连边+via 贴同电平→重合段中点可点击选中', async () => {
    const userData = await mkdtemp(join(tmpdir(), 'u4-r4-'))
    await seedFixture(userData, ['u4r-m1', 'u4r-m2'], ['重合甲', '重合乙'], {
      nodes: [
        { paperId: 'u4r-m1', title: '重合甲', year: 2020, month: 5, slot: 1 },
        { paperId: 'u4r-m2', title: '重合乙', year: 2020, month: 5, slot: 2 }
      ],
      edges: [
        { from: 'u4r-m1', to: 'u4r-m2', label: '' },
        { from: 'u4r-m2', to: 'u4r-m1', label: '' }
      ]
    })
    // 相位一：量 grid 直连边电平与缝中点（内容坐标=用户坐标）
    const app = await launch(userData)
    const win = await app.firstWindow()
    await openLineage(win, '重合甲')
    await waitForPaths(win, 2)
    const geo = await win.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.tl-card[data-node-id]')).map((c) => c.getBoundingClientRect())
      if (cards.length !== 2) throw new Error('R4：卡数≠2')
      const left = cards[0]!.right < cards[1]!.left ? cards[0]! : cards[1]!
      const right = cards[0]!.right < cards[1]!.left ? cards[1]! : cards[0]!
      const straight = Array.from(document.querySelectorAll('svg.tl-edges path.tl-edge')).find(
        (p) => (p.getAttribute('d') ?? '').split(/[ML]/).length === 3
      ) as SVGPathElement | undefined
      if (straight === null || straight === undefined) throw new Error('R4：grid 直连边不在场')
      const bb = straight.getBBox()
      return { yLevel: +(bb.y + bb.height / 2).toFixed(2), seamMid: +((left.right + right.left) / 2).toFixed(2) }
    })
    await app.close()

    // 相位二：spec 进程直写 via（validateLineageVia 轴对齐=两点同 y；锚定
    // 语义=via[0].x<源中心取左 ½/via[1].x>目标中心取右 ½——routeOne manual
    // 分支 selectAnchor 同源）。库位=workspaces 物化迁库后 default 位（
    // workspace.fs 布局；bootstrap+相位一两次启动已触发搬移——根库兜底）
    const wsDb = join(userData, 'workspaces', 'default', 'synapse.db')
    const db = new Database(existsSync(wsDb) ? wsDb : join(userData, 'synapse.db'))
    try {
      const res = db
        .prepare(
          `UPDATE lineage_edges SET via = ?
           WHERE id IN (
             SELECT e.id FROM lineage_edges e
             JOIN lineage_nodes fn ON fn.id = e.from_node
             JOIN lineage_nodes tn ON tn.id = e.to_node
             WHERE fn.paper_id = 'u4r-m2' AND tn.paper_id = 'u4r-m1'
           )`
        )
        .run(JSON.stringify([
          { x: 60, y: geo.yLevel },
          { x: 240, y: geo.yLevel }
        ]))
      if (res.changes !== 1) throw new Error(`R4：via 写入 ${res.changes} 行（期望 1）`)
    } finally {
      db.close()
    }

    // 相位三：二次 launch 冷读 via→manual 边贴 grid 电平→重合断言+命中点击
    const app2 = await launch(userData)
    const win2 = await app2.firstWindow()
    await openLineage(win2, '重合甲')
    await waitForPaths(win2, 2)
    const m = await seamProbe(win2)
    const routes = m.paths.map((p) => p.route)
    expect(routes.filter((r) => r === 'manual-override').length, 'R4 manual 边在场（via 冷读）').toBe(1)
    // [B4] retain 豁免支退役：grid 边=两点直线（0 拐直连族）+无溢出登记
    const gridPath = m.paths.find((p) => p.route !== 'manual-override')
    expect(gridPath, 'R4 grid 边在场').toBeDefined()
    expect(gridPath!.twoPoint, `R4 grid 边为两点直线（0 拐直连族——实测 d 形态=${gridPath!.twoPoint ? '两点' : '多拐'}）`).toBe(true)
    expect(gridPath!.spansAttr, 'R4 grid 边无溢出登记（data-overlap-spans 缺席或空）').toBe('')
    // 重合前提：缝中点两电平差 ≤0.5px（via 贴 grid 电平——内容坐标）
    const levels = m.paths.map((p) => p.y)
    expect(Math.abs(levels[0]! - levels[1]!), `R4 两线电平 ${levels.join('/')} 重合（±0.5）`).toBeLessThanOrEqual(0.5)
    // 命中层抽查：edit 态+点击重合段中点（stroke 8 命中带）→选中（手柄集在场=选中证据）不抛错
    await win2.getByTestId('lineage-mode-edit').click()
    const z = await contentZ(win2)
    const base = await win2.evaluate(() => {
      const r = document.querySelector('.tl-content')!.getBoundingClientRect()
      return { left: r.left, top: r.top }
    })
    await win2.mouse.click(base.left + m.cellMidX * z, base.top + geo.yLevel * z)
    await expect(win2.getByTestId('edge-handles')).toBeVisible({ timeout: 5_000 })
    await app2.close()
  })

  /**
   * R5 [F-LANEGRID-01 B4] 三卡同列 1→3 探针回归三断言：05/06/07 相邻月同
   * slot1 三卡+跨双框边 05→07→（a）route='grid'（中卡拦直连——车道网格
   * 绕行族）；（b）坐标集封闭：路径全部竖直段 x∈车道表坐标集（Node 侧
   * buildLaneTable 直算 vCoords——锚道 ¼/½/¾ 位本在车道表内，锚 x 集被子
   * 集吸收；INV-SLOTGRID-02 新口径）；（c）标注覆盖：path 采样避全部
   * .month-tag rect±PAD（月标注骑月份框上边界中轴——tag 在 .tl-month 首位
   * top:-10px，rect 实测派生自吸收）。
   */
  test('R5 三卡同列 1→3：竖直段 x∈车道表坐标集（坐标集封闭）+标注覆盖+route=grid', async () => {
    const userData = await mkdtemp(join(tmpdir(), 'u2-r5-'))
    await seedFixture(userData, ['u2r-p1', 'u2r-p2', 'u2r-p3'], ['探针甲', '探针乙', '探针丙'], {
      nodes: [
        { paperId: 'u2r-p1', title: '探针甲', year: 2020, month: 5, slot: 1 },
        { paperId: 'u2r-p2', title: '探针乙', year: 2020, month: 6, slot: 1 },
        { paperId: 'u2r-p3', title: '探针丙', year: 2020, month: 7, slot: 1 }
      ],
      edges: [{ from: 'u2r-p1', to: 'u2r-p3', label: '' }]
    })
    const app = await launch(userData)
    const win = await app.firstWindow()
    await openLineage(win, '探针甲')
    await waitForPaths(win, 1)
    const route = await win.locator('svg.tl-edges path.tl-edge').first().evaluate((el) => (el as SVGPathElement).dataset.route ?? '')
    expect(route, 'R5 route 非空卫').not.toBe('')
    expect(route, 'R5 实测 route=grid（绕行族——中卡拦直连）').toBe('grid')
    // (b) 坐标集封闭：竖直段 x∈车道表 vCoords（buildLaneTable 直算——零硬编码）
    const uni = laneUniverse(await laneGeoProbe(win))
    const runXs = await win.evaluate(() => {
      const path = document.querySelector('svg.tl-edges path.tl-edge') as SVGPathElement | null
      if (path === null) throw new Error('R5：路径不在场')
      const total = path.getTotalLength()
      const N = 256
      const pts: Array<{ x: number; y: number }> = []
      for (let k = 0; k <= N; k++) {
        const q = path.getPointAtLength((total * k) / N)
        pts.push({ x: q.x, y: q.y })
      }
      const xs: number[] = []
      let i = 0
      while (i < pts.length) {
        let j = i
        while (j + 1 < pts.length && Math.abs(pts[j + 1]!.x - pts[i]!.x) < 0.6) j++
        if (Math.abs(pts[j]!.y - pts[i]!.y) > 2) xs.push(+pts[i]!.x.toFixed(1))
        i = j + 1
      }
      return xs
    })
    expect(runXs.length, 'R5 竖直段非空卫（绕行族≥2 竖直段——空集防恒真）').toBeGreaterThanOrEqual(2)
    const open = runXs.filter((x) => !uni.v.some((s) => Math.abs(s - x) <= 0.6))
    expect(
      open,
      `R5 竖直段 x 全∈车道表坐标集（开放值=坐标集外逃逸——INV-SLOTGRID-02）实测 runXs=${JSON.stringify(runXs)} vCoords=${JSON.stringify(uni.v)}`
    ).toEqual([])
    // (c) 标注覆盖：path 采样避全部 .month-tag rect±PAD（骑线形态 rect 实测派生）
    const z = await contentZ(win)
    await expectPathAvoids(win, 'svg.tl-edges path.tl-edge', [{ sel: '.month-tag' }], PAD * z, 'R5 避月标注矩形')
    await app.close()
  })
})
