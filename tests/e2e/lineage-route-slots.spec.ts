/**
 * [F-ROUTE-02 U4] 走线候选位分配 e2e（R1-R4——设计稿 §6 R 系+观测钩子面）。
 *
 * ── 夹具口径（探针 20261007-froute02-u4-exec/probe-geometry.json 校准）──
 * - 视口 1280×860 固定（contentW=732 屏 px 量测单源）；一切期望几何**实测
 *   派生**（卡 rect/分点集/槽电平全 in-page 计算），零硬编码坐标——字体度量
 *   平台差由实测吸收（年份头高度漂移只挪卡 y，不断言绝对值）。
 * - R1 绕卡=三卡+障碍卡（2020-05 两卡/06 障碍/07 目标）→band 框外左绕，
 *   path 采样避障碍卡 rect±PAD；R2 跨年=2020-12→2022-05 中隔 2021 障碍卡
 *   →corridor 右缘承接，path 避全部 .tl-year-num/.tl-year-meta 文本区
 *   （年份头障碍集承重：无其集则 band 左绕候选 x≈43 穿 2021/2022 两文本区）；
 *   R3 同月相邻卡双向边=同列缝单元双消费（retain idx2+land idx4∈分点集，
 *   zoom 1.0/1.5 双跑——rect÷z 归一化恒等）；R4 重合态=retain 边
 *   （data-overlap-exempt=1）+via 手动边（一次 launch 量电平→关应用→spec
 *   进程 better-sqlite3 直写 via〔窗口=零应用进程，Windows 文件锁面空〕→
 *   二次 launch 冷读）贴同一电平→点击重合段中点命中层不抛错且可选中。
 *
 * ── helper 落位申报 ──
 * - expectPathAvoids=本 spec helper 区（非 geo-probes 追加）：geo-probes 头注
 *   单源边界=**三类 rect 断言**（邻近/静止/无瞬跳）；路径采样判交族=本批
 *   新面（T-P1b pathClearOfTags 段化采样模式），驻消费方避免扩锁面单源域。
 * - 观测钩子=data-slot/data-overlap-exempt/data-slot-fallback 三属性
 *   （data-route-state 不新增——既有 data-route 即胜出态观测位，T-P1b 已
 *   消费；重复挂同值属性=冗余，主控申报处置）。
 *
 * ── 受锁流程（门一 W3 同型）──
 * - 本文件已入 locks manifest——改动必经 locks:unlock→批内改→locks:apply
 *   +[locked-change] 尾注提交。
 * - R3 取景申报：产品库 UNIQUE(from,to) 使同端点对三边不可达（设计 §5 S3
 *   同锚三边=单测域；e2e 域结构证明可达最大=同单元双消费——双向边，跨卡
 *   桥边必穿中间卡被避让链拦），本 spec 断言可达核（同单元槽位互异+∈分点
 *   集+zoom 双跑），三线面由单测 ① 承载。
 */
import { test, expect, type Page } from '@playwright/test'
import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import Database from 'better-sqlite3'
import { bootstrapMigrations, launch, seedLineageGraph, seedPaperRow } from './e2e-env'
import { zoomProbe } from './geo-probes'

/** 避让 PAD（avoid.ts 单源同值——内容 px；屏幕域断言乘 z） */
const PAD = 4

/** 幽灵文献行（seedPaperRow——lineage.spec seedLineagePapers 同型） */
async function seedGhosts(userData: string, ids: string[], titles: string[]): Promise<void> {
  for (let i = 0; i < ids.length; i++) {
    const sha = createHash('sha256').update(`u4-r-${ids[i]}`).digest('hex')
    await seedPaperRow(userData, `${sha.slice(0, 2)}/${sha.slice(2, 4)}/${sha}.pdf`, sha, titles[i]!, ids[i])
  }
}

/** 建库+种子一步（R1-R4 夹具公共面） */
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

/** 路径电平/缝几何量测（缝中点最近采样点 y——用户坐标即内容坐标） */
interface PathLevel {
  route: string
  y: number
  slotAttr: string
  exemptAttr: string
  fallbackAttr: string
  twoPoint: boolean
}
interface SeamProbe {
  slots: number[]
  cellMidX: number
  paths: PathLevel[]
}

/** 同月相邻卡列缝单元分点集（a1 公式 in-page：L=H−2·PAD、n=min(5,⌊L/6⌋−1)、内缩 k/(n+1) 分点）+各 path 缝中点电平（全内容坐标——rect÷z） */
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
      y: (Math.max(left.top, right.top) - base.top) / z,
      w: (right.left - left.right) / z,
      h: (Math.min(left.bottom, right.bottom) - Math.max(left.top, right.top)) / z
    }
    const L = cell.h - 2 * 4
    const n = Math.min(5, Math.max(0, Math.floor(L / 6) - 1))
    const slots: number[] = []
    for (let k = 1; k <= n; k++) slots.push(+(cell.y + 4 + (k * L) / (n + 1)).toFixed(2))
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
        slotAttr: p.dataset.slot ?? '',
        exemptAttr: p.dataset.overlapExempt ?? '',
        fallbackAttr: p.dataset.slotFallback ?? '',
        twoPoint: (p.getAttribute('d') ?? '').split(/[ML]/).length === 3
      }
    })
    return { slots, cellMidX, paths: levels }
  })
}

test.describe('F-ROUTE-02 U4 走线槽位 e2e（R1-R4）', () => {
  /**
   * R1 绕卡：三卡（甲/乙/丁）+障碍卡（丙拦甲→丁直连）→path 采样点避丙 rect
   * ±PAD+data-route≠fallback（探针 p1：band 框外左绕 x≈43 下行再回兜）。
   */
  test('R1 绕卡：障碍卡拦直连→路径避障 rect±PAD+route≠fallback', async () => {
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
    // [RR1 非空卫——门一双席共识] 空读（属性缺失/选择器漂移）恒过 ≠fallback 判定，
    // 先钉非空再判别（恒真断言防线——RR1 变异 4b 实证空读恒过）
    expect(route, 'R1 route 非空卫（data-route 缺席即红）').not.toBe('')
    expect(route, `R1 实测 route=${route}（期望非 fallback）`).not.toBe('fallback')
    const z = await contentZ(win)
    await expectPathAvoids(win, 'svg.tl-edges path.tl-edge', [{ sel: '.tl-card[data-node-id]', hasText: '绕障丙' }], PAD * z, 'R1 避障丙')
    await app.close()
  })

  /**
   * R2 跨年：2020-12→2022-05（中隔 2021-01 障碍卡）→path 避全部年份头两
   * 文本区（探针 p6：corridor 右缘 x=684 承接；年份头障碍集承重证据=band
   * 左绕候选 x≈43 落 num rect[16,80.66]±PAD 内——无该障碍集即穿文本区）。
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
    expect(route, `R2 实测 route=${route}（直连被拦——期望绕行族）`).not.toBe('direct')
    const z = await contentZ(win)
    await expectPathAvoids(win, 'svg.tl-edges path.tl-edge', [{ sel: '.tl-year-num' }, { sel: '.tl-year-meta' }], PAD * z, 'R2 避年份头文本区')
    await app.close()
  })

  /**
   * R3 同单元双消费槽位互异∈分点集（zoom 1.0/1.5 双跑）：同月相邻卡双向边
   * →同列缝单元（20px 缝×72px 高→n=5 分点）retain idx2（Δ=0）+land idx4
   * （|54−57.3|<|54−46.7|）——探针 p3/p3z15 实测 126.1/147.4 两电平，两档
   * 内容坐标全等（rect÷z 归一化）。
   */
  test('R3 同单元槽位互异∈分点集（zoom 1.0/1.5 双跑——rect÷z 恒等）', async () => {
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

    /** 断言体（tag=档位标注）：marks 同单元互异+电平∈分点集+电平↔slotIdx 一致 */
    const runAssertions = async (tag: string): Promise<SeamProbe> => {
      await waitForPaths(win, 2)
      const m = await seamProbe(win)
      expect(m.slots.length, `${tag} 分点数（n=min(5,⌊L/6⌋−1)——72px 高单元）`).toBe(5)
      const marks = m.paths.map((p) => p.slotAttr).filter((x) => x !== '')
      expect(marks.length, `${tag} data-slot 双值在场（retain+land 各一）`).toBe(2)
      const parsed = marks.map((x) => x.split(':').map(Number))
      expect(
        parsed.every((pr) => pr.length === 2 && Number.isInteger(pr[0]!) && Number.isInteger(pr[1]!)),
        `${tag} data-slot 形如 cellId:slotIdx`
      ).toBe(true)
      expect(new Set(parsed.map((pr) => pr[0]!)).size, `${tag} 同单元（cellId 全等）`).toBe(1)
      const idxs = parsed.map((pr) => pr[1]!)
      expect(new Set(idxs).size, `${tag} 槽位互异（INV-1XX e2e 面）`).toBe(2)
      for (const idx of idxs) {
        expect(idx, `${tag} slotIdx∈[0,n)`).toBeGreaterThanOrEqual(0)
        expect(idx).toBeLessThan(m.slots.length)
      }
      // 实测电平双证：每边缝中点电平命中分点 ±0.6px（亚像素+采样残差）且
      // 电平分点位置与 data-slot idx 逐边一致（先按电平定分点再对 idx 集）
      const lvSlots = m.paths.map((p) => m.slots.findIndex((s) => Math.abs(s - p.y) <= 0.6))
      for (let i = 0; i < m.paths.length; i++) {
        expect(lvSlots[i], `${tag} 边${i} 电平 ${m.paths[i]!.y} 命中分点集 ${JSON.stringify(m.slots)}±0.6`).toBeGreaterThanOrEqual(0)
      }
      expect(new Set(lvSlots).size, `${tag} 两电平分属互异分点`).toBe(2)
      expect([...lvSlots].sort((a, b) => a - b), `${tag} 电平分点集=slotIdx 集（双证合流）`).toEqual([...idxs].sort((a, b) => a - b))
      expect(m.paths.some((p) => p.twoPoint), `${tag} retain 直线形态在场（Δ<1 豁免支）`).toBe(true)
      return m
    }

    let at10: SeamProbe | undefined
    await zoomProbe(win, 1.0, async () => {
      at10 = await runAssertions('zoom1.0')
    })
    await zoomProbe(win, 1.5, async () => {
      const m = await runAssertions('zoom1.5')
      // rect÷z 归一化恒等：内容坐标电平与 marks 两档全等
      expect(m.paths.map((p) => p.slotAttr)).toEqual(at10!.paths.map((p) => p.slotAttr))
      expect(m.paths.map((p) => p.y)).toEqual(at10!.paths.map((p) => p.y))
    })
    await app.close()
  })

  /**
   * R4 重合态命中层抽查：retain 边（同单元 Δ<1 豁免——data-overlap-exempt=1）
   * +via 手动边贴同电平（一次 launch 量电平→关应用→spec 进程直写 via→二次
   * launch 冷读）→两线重合→edit 态点击重合段中点不抛错+至少一条可选中
   * （命中层 stroke 8；手动边渲染序末位=恒最上）。
   */
  test('R4 重合态：retain 豁免边+via 贴同电平→重合段中点可点击选中', async () => {
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
    // 相位一：量 retain 直线边电平与缝中点（内容坐标=用户坐标）
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
      if (straight === null || straight === undefined) throw new Error('R4：直线边不在场')
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

    // 相位三：二次 launch 冷读 via→manual 边贴 retain 电平→重合断言+命中点击
    const app2 = await launch(userData)
    const win2 = await app2.firstWindow()
    await openLineage(win2, '重合甲')
    await waitForPaths(win2, 2)
    const m = await seamProbe(win2)
    const routes = m.paths.map((p) => p.route)
    expect(routes.filter((r) => r === 'manual-override').length, 'R4 manual 边在场（via 冷读）').toBe(1)
    expect(m.paths.some((p) => p.twoPoint && p.exemptAttr === '1'), 'R4 retain 边携 data-overlap-exempt=1（重合对至少一方豁免）').toBe(true)
    // 重合前提：缝中点两电平差 ≤0.5px（via 贴 retain 电平——内容坐标）
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
})
