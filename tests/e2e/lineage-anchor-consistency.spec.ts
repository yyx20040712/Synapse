/**
 * [F-ANCHFIX-01 批 1b] 锚级一致 e2e（常设化——设计书 v1.2 §3.5 销项判据；
 * 受锁流程：本文件入 locks manifest，改动必经 locks:unlock→改→locks:apply
 * +[locked-change] 尾注提交）。
 *
 * ── 夹具协议（沿承 lineage-route-slots.spec.ts 同型：launch/seedLineageGraph/
 *    openLineage/waitForPaths；helper 区第 2 份复制——抽共享涉 geo-probes 受锁
 *    扩面，留主控裁决）──
 * - 视口 1280×860；一切期望几何**实测派生**（卡 rect÷z 内容坐标+selectAnchor
 *   规则金标镜像 in-page 复算），零硬编码坐标。
 * - 金标 Oracle（设计 §3.3）：期望锚=路由侧 selectAnchor 规则（主向定边
 *   |dx|≥|dy| 取横并列取横+侧内投影 ¼/½/¾ 最近并列取小序）**镜像重实现**
 *   于 in-page evaluate——禁 import anchors.ts（契约=路由行为契约）。
 *
 * ── R-零跳动（D 修复回归锁）──
 * 画线拖拽末帧读 draw-preview line x1/y1/x2/y2（内容坐标 attribute）→up 建边
 * →断言新边 path 首末点与预览两端各距 ≤0.5px（两端零跳动——所见即所得）。
 * 场景=无先占边（AnchorUse 散开面排除）+主向竖向族几何（竖向跨月/横邻/
 * 斜跨〔竖向主向〕）：direct 锚=selectAnchor 同函数同参；h-slip 近侧
 * sideAnchor≡横向主向 selectAnchor；band 竖向定边 sideAnchor(bottom/top)
 * ≡竖向主向 selectAnchor（P5 探针 S1 实测 route=band 末锚 top¼=投影结果
 * 同参印证）——三态首末锚均与预览规则锚同源故零跳动可断。corridor/fallback
 * 恒右缘（sideAnchor right）与主向 selectAnchor 不保证同锚=场景构造漂移
 * 信号（实测 route 入诊断消息；落入即零跳动断言红——红消息携带 route 供
 * 场景调参，非修复失效误读）。
 *
 * ── R-锚级一致（C2 挂账销项——六态矩阵以实测 route 断言〔设计 v1.2 勘正③〕）──
 * 播种 direct 意图/h-slip/band/corridor/manual-override（via 直写两相——
 * route-slots R4 型）五态（fallback=全部探测失败态，夹具不可稳定构造，申报
 * 在案）；各边断言：data-route 非空+path 首末点对持卡 rect 法向距 ≤1+沿框
 * 命中 ¼/½/¾ 位 ±1（无桩族 direct/h-slip/manual-override——端点=锚直落）
 * +带桩族（band/corridor/fallback）首段方向沿命中边外法线（|sin|≤0.0349
 * =±2°——设计 v1.2 随裁修正①：stripCollinear+圆角切点截短使「次点=stubEnd」
 * 结构性不成立，改断首段方向）。zoom 三档 {1.0, 0.8, 1.5}（0.75 不可达——
 * badge 步进 0.1，探针 P2 实测）。
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

/** 幽灵文献行（seedPaperRow——route-slots seedGhosts 同型） */
async function seedGhosts(userData: string, ids: string[], titles: string[]): Promise<void> {
  for (let i = 0; i < ids.length; i++) {
    const sha = createHash('sha256').update(`anchfix1b-${ids[i]}`).digest('hex')
    await seedPaperRow(userData, `${sha.slice(0, 2)}/${sha.slice(2, 4)}/${sha}.pdf`, sha, titles[i]!, ids[i])
  }
}

/** 建库+种子一步（公共面） */
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

/** 进脉络视图+等首卡在场（route-slots openLineage 同型） */
async function openLineage(win: Page, firstTitle: string): Promise<void> {
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
  await win.setViewportSize({ width: 1280, height: 860 })
  await win.getByRole('button', { name: '脉络', exact: true }).click()
  await expect(win.locator('.tl-card').first()).toContainText(firstTitle, { timeout: 10_000 })
}

/** 等连线渲染稳定（计数到位+d 双读全等——route-slots waitForPaths 同型） */
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

/** 内容缩放（.tl-content computed transform matrix——route-slots contentZ 同型） */
async function contentZ(win: Page): Promise<number> {
  return win.evaluate(() => {
    const ct = document.querySelector('.tl-content')
    if (ct === null) throw new Error('.tl-content 不在场')
    const m = /matrix\(([\d.]+),/.exec(getComputedStyle(ct).transform)
    return m === null ? 1 : Number(m[1])
  })
}

/** 卡内容坐标 rect（标题定位+gBCR÷z——buildSnapshot toBox 同式） */
async function cardContentRect(win: Page, title: string): Promise<{ x: number; y: number; w: number; h: number }> {
  const r = await win
    .locator('.tl-card', { hasText: title })
    .first()
    .evaluate((el) => el.getBoundingClientRect())
  const base = await win.evaluate(() => {
    const el = document.querySelector('.tl-content')
    if (el === null) throw new Error('.tl-content 不在场')
    const b = el.getBoundingClientRect()
    return { left: b.left, top: b.top }
  })
  const z = await contentZ(win)
  return { x: (r.left - base.left) / z, y: (r.top - base.top) / z, w: r.width / z, h: r.height / z }
}

/** 屏幕坐标换算（内容→视口：base+pt*z） */
async function contentOrigin(win: Page): Promise<{ left: number; top: number; z: number }> {
  const [base, z] = await Promise.all([
    win.evaluate(() => {
      const el = document.querySelector('.tl-content')
      if (el === null) throw new Error('.tl-content 不在场')
      const b = el.getBoundingClientRect()
      return { left: b.left, top: b.top }
    }),
    contentZ(win)
  ])
  return { left: base.left, top: base.top, z }
}

/**
 * 金标 Oracle 镜像（设计 §3.3——禁 import anchors.ts，路由规则镜像）：
 * selectAnchor 主向定边+侧内投影最近定序（并列取小序）。
 */
function oracleSelectAnchor(r: { x: number; y: number; w: number; h: number }, toward: { x: number; y: number }): { x: number; y: number } {
  const dx = toward.x - (r.x + r.w / 2)
  const dy = toward.y - (r.y + r.h / 2)
  const horizontal = Math.abs(dx) >= Math.abs(dy)
  const fr = [0.25, 0.5, 0.75]
  if (horizontal) {
    const y0 = r.y
    let best = 0
    let bestD = Math.abs(toward.y - y0 - r.h * fr[0]!)
    for (let s = 1; s <= 2; s++) {
      const d = Math.abs(toward.y - y0 - r.h * fr[s]!)
      if (d < bestD) {
        best = s
        bestD = d
      }
    }
    return dx >= 0 ? { x: r.x + r.w, y: r.y + r.h * fr[best]! } : { x: r.x, y: r.y + r.h * fr[best]! }
  }
  let best = 0
  let bestD = Math.abs(toward.x - r.x - r.w * fr[0]!)
  for (let s = 1; s <= 2; s++) {
    const d = Math.abs(toward.x - r.x - r.w * fr[s]!)
    if (d < bestD) {
      best = s
      bestD = d
    }
  }
  return dy >= 0 ? { x: r.x + r.w * fr[best]!, y: r.y + r.h } : { x: r.x + r.w * fr[best]!, y: r.y }
}

/** 画线手势：源卡右中锚起拖→move 至目标卡规则锚（金标镜像预定位）→返回末帧预览端点（内容坐标） */
async function dragPreviewEnds(
  win: Page,
  srcTitle: string,
  tgtTitle: string
): Promise<{ x1: number; y1: number; x2: number; y2: number; fromExp: { x: number; y: number }; snapExp: { x: number; y: number } }> {
  await win.getByTestId('lineage-mode-edit').click()
  await win.getByTestId('lineage-tool-solid').click()
  await win.locator('.tl-card', { hasText: srcTitle }).first().scrollIntoViewIfNeeded()
  await win.locator('.tl-card', { hasText: tgtTitle }).first().scrollIntoViewIfNeeded()
  const src = await cardContentRect(win, srcTitle)
  const tgt = await cardContentRect(win, tgtTitle)
  const snapExp = oracleSelectAnchor(tgt, { x: src.x + src.w / 2, y: src.y + src.h / 2 })
  const fromExp = oracleSelectAnchor(src, { x: tgt.x + tgt.w / 2, y: tgt.y + tgt.h / 2 })
  const o = await contentOrigin(win)
  // 起拖=源卡右中锚近旁（12 锚全域可起拖——合法手势入口）
  const srcAnchorScreen = { x: o.left + (src.x + src.w) * o.z - 2, y: o.top + (src.y + src.h / 2) * o.z }
  // move 落点=目标卡规则锚（预览实时显示最终锚位——所见即所得）
  const tgtScreen = { x: o.left + snapExp.x * o.z, y: o.top + snapExp.y * o.z }
  await win.mouse.move(srcAnchorScreen.x, srcAnchorScreen.y)
  await win.mouse.down()
  await win.mouse.move(tgtScreen.x, tgtScreen.y, { steps: 8 })
  const ends = await win
    .getByTestId('draw-preview')
    .locator('line')
    .evaluate((el) => ({
      x1: Number(el.getAttribute('x1')),
      y1: Number(el.getAttribute('y1')),
      x2: Number(el.getAttribute('x2')),
      y2: Number(el.getAttribute('y2'))
    }))
  return { ...ends, fromExp, snapExp }
}

/** 收尾保存（落边 dirty→保存防 quit 拦截——lineage.spec C2b 同型） */
async function saveAndClose(win: Page, app: Awaited<ReturnType<typeof launch>>): Promise<void> {
  const saveBtn = win.getByTestId('lineage-save-btn')
  if (await saveBtn.isEnabled()) {
    await saveBtn.click()
    await expect(saveBtn).toBeDisabled({ timeout: 10_000 })
  }
  await app.close()
}

/**
 * 锚级一致断言体（R-锚级一致各态共用——in-page 全量取数+Node 侧断言）：
 * - 每边 data-route 非空；
 * - path 首末点（getPointAtLength 0/total——用户坐标即内容坐标）对持卡 rect：
 *   法向距 ≤1（点到边线段最近距）+沿框命中 ¼/½/¾ 位 ±1；
 * - 带桩族（band/corridor/fallback）首段方向沿命中边外法线 |sin|≤0.0349（±2°）。
 */
async function expectAnchorConsistency(
  win: Page,
  edges: Array<{ fromTitle: string; toTitle: string }>,
  tag: string
): Promise<void> {
  const z = await contentZ(win)
  const data = await win.evaluate(() => {
    const paths = Array.from(document.querySelectorAll('svg.tl-edges path.tl-edge')) as SVGPathElement[]
    return paths.map((p) => {
      const total = p.getTotalLength()
      const p0 = p.getPointAtLength(0)
      const p1 = p.getPointAtLength(2)
      const pe = p.getPointAtLength(total)
      return {
        route: p.dataset.route ?? '',
        first: { x: p0.x, y: p0.y },
        last: { x: pe.x, y: pe.y },
        dir: { x: p1.x - p0.x, y: p1.y - p0.y }
      }
    })
  })
  expect(data.length, `${tag}：边数=播种数`).toBe(edges.length)
  for (let i = 0; i < edges.length; i++) {
    const e = data[i]!
    expect(e.route, `${tag} 边${i} data-route 非空卫（缺席即红）`).not.toBe('')
    const from = await cardContentRect(win, edges[i]!.fromTitle)
    const to = await cardContentRect(win, edges[i]!.toTitle)
    const stubFamily = e.route === 'band' || e.route === 'corridor' || e.route === 'fallback'
    for (const [end, rect, label] of [
      [e.first, from, '首点↔from 卡'],
      [e.last, to, '末点↔to 卡']
    ] as Array<[{ x: number; y: number }, { x: number; y: number; w: number; h: number }, string]>) {
      // 法向：点到四边线段最近距（点在框上——12 锚体系端点恒落框）
      const sides: Array<{ key: string; dist: number; along: number; span: number }> = [
        { key: 'top', dist: Math.abs(end.y - rect.y), along: end.x - rect.x, span: rect.w },
        { key: 'bottom', dist: Math.abs(end.y - (rect.y + rect.h)), along: end.x - rect.x, span: rect.w },
        { key: 'left', dist: Math.abs(end.x - rect.x), along: end.y - rect.y, span: rect.h },
        { key: 'right', dist: Math.abs(end.x - (rect.x + rect.w)), along: end.y - rect.y, span: rect.h }
      ]
      const near = sides.filter((s) => s.along >= -1 && s.along <= s.span + 1).sort((a, b) => a.dist - b.dist)[0]
      if (near === undefined) throw new Error(`${tag} 边${i} ${label}：端点 (${end.x},${end.y}) 不在任何边段投影域（rect=${JSON.stringify(rect)} z=${z}）`)
      expect(near.dist, `${tag} 边${i} ${label}（${e.route}）法向距 ≤1（端点恒落卡框）`).toBeLessThanOrEqual(1)
      const fr = [0.25, 0.5, 0.75]
      const alongBest = Math.min(...fr.map((f) => Math.abs(near.along - near.span * f)))
      expect(alongBest, `${tag} 边${i} ${label}（${e.route}）沿框命中 ¼/½/¾ 位 ±1`).toBeLessThanOrEqual(1)
      if (stubFamily) {
        // 首段方向沿命中边外法线（仅首端——出桩段；±2°）
        if (label === '首点↔from 卡') {
          const nrm = { top: { x: 0, y: -1 }, bottom: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } }[near.key as 'top' | 'bottom' | 'left' | 'right']!
          const len = Math.hypot(e.dir.x, e.dir.y)
          const sin = Math.abs((e.dir.x * nrm.y - e.dir.y * nrm.x) / len)
          expect(sin, `${tag} 边${i}（${e.route}）首段方向沿 ${near.key} 边外法线 |sin|≤0.0349（±2°）`).toBeLessThanOrEqual(0.0349)
        }
      }
    }
  }
}

test.describe('F-ANCHFIX-01 批 1b 锚级一致（R-零跳动+R-锚级一致）', () => {
  /**
   * R-零跳动①竖向跨月：上→下月画线，预览末帧端点=规则锚，up 后新边首末点
   * 与预览两端 ≤0.5px（场景自检 route=direct——竖向主向族）。
   */
  test('R-零跳动①竖向跨月：预览端点=落边端点（两端 ≤0.5px）', async () => {
    test.slow()
    const userData = await mkdtemp(join(tmpdir(), 'anchfix-r0a-'))
    await seedFixture(userData, ['af-v-src', 'af-v-tgt'], ['竖向源卡', '竖向目标卡'], {
      nodes: [
        { paperId: 'af-v-src', title: '竖向源卡', year: 2020, month: 5, slot: 1 },
        { paperId: 'af-v-tgt', title: '竖向目标卡', year: 2020, month: 7, slot: 1 }
      ],
      edges: []
    })
    const app = await launch(userData)
    const win = await app.firstWindow()
    await openLineage(win, '竖向源卡')
    const ends = await dragPreviewEnds(win, '竖向源卡', '竖向目标卡')
    // 预览末帧=规则锚（金标镜像——预览所见即路由所得）
    expect(Math.abs(ends.x1 - ends.fromExp.x), '预览起点 x=规则锚（fromEff）').toBeLessThanOrEqual(0.5)
    expect(Math.abs(ends.y1 - ends.fromExp.y), '预览起点 y=规则锚（fromEff）').toBeLessThanOrEqual(0.5)
    expect(Math.abs(ends.x2 - ends.snapExp.x), '预览吸附端 x=规则锚（snap）').toBeLessThanOrEqual(0.5)
    expect(Math.abs(ends.y2 - ends.snapExp.y), '预览吸附端 y=规则锚（snap）').toBeLessThanOrEqual(0.5)
    await win.mouse.up()
    await waitForPaths(win, 1)
    const route = await win.locator('svg.tl-edges path.tl-edge').first().evaluate((el) => (el as SVGPathElement).dataset.route ?? '')
    expect(route, 'R0a route 非空卫').not.toBe('')
    const ends2 = await win.locator('svg.tl-edges path.tl-edge').first().evaluate((p) => {
      const el = p as SVGPathElement
      const total = el.getTotalLength()
      const a = el.getPointAtLength(0)
      const b = el.getPointAtLength(total)
      return { fx: a.x, fy: a.y, lx: b.x, ly: b.y }
    })
    expect(Math.hypot(ends2.fx - ends.x1, ends2.fy - ends.y1), `R0a route=${route} 起端零跳动（首点(${ends2.fx},${ends2.fy}) vs 预览(${ends.x1},${ends.y1})）`).toBeLessThanOrEqual(0.5)
    expect(Math.hypot(ends2.lx - ends.x2, ends2.ly - ends.y2), `R0a route=${route} 末端零跳动（末点(${ends2.lx},${ends2.ly}) vs 预览(${ends.x2},${ends.y2})）`).toBeLessThanOrEqual(0.5)
    await saveAndClose(win, app)
  })

  /**
   * R-零跳动②同月横邻：slot 相邻画线（h-slip 族——缝单元直连）。
   */
  test('R-零跳动②同月横邻：预览端点=落边端点（两端 ≤0.5px）', async () => {
    test.slow()
    const userData = await mkdtemp(join(tmpdir(), 'anchfix-r0b-'))
    await seedFixture(userData, ['af-h-src', 'af-h-tgt'], ['横邻源卡', '横邻目标卡'], {
      nodes: [
        { paperId: 'af-h-src', title: '横邻源卡', year: 2020, month: 8, slot: 1 },
        { paperId: 'af-h-tgt', title: '横邻目标卡', year: 2020, month: 8, slot: 2 }
      ],
      edges: []
    })
    const app = await launch(userData)
    const win = await app.firstWindow()
    await openLineage(win, '横邻源卡')
    const ends = await dragPreviewEnds(win, '横邻源卡', '横邻目标卡')
    expect(Math.abs(ends.x1 - ends.fromExp.x), '预览起点 x=规则锚').toBeLessThanOrEqual(0.5)
    expect(Math.abs(ends.y1 - ends.fromExp.y), '预览起点 y=规则锚').toBeLessThanOrEqual(0.5)
    expect(Math.abs(ends.x2 - ends.snapExp.x), '预览吸附端 x=规则锚').toBeLessThanOrEqual(0.5)
    expect(Math.abs(ends.y2 - ends.snapExp.y), '预览吸附端 y=规则锚').toBeLessThanOrEqual(0.5)
    await win.mouse.up()
    await waitForPaths(win, 1)
    const route = await win.locator('svg.tl-edges path.tl-edge').first().evaluate((el) => (el as SVGPathElement).dataset.route ?? '')
    expect(route, 'R0b route 非空卫').not.toBe('')
    const ends2 = await win.locator('svg.tl-edges path.tl-edge').first().evaluate((p) => {
      const el = p as SVGPathElement
      const total = el.getTotalLength()
      const a = el.getPointAtLength(0)
      const b = el.getPointAtLength(total)
      return { fx: a.x, fy: a.y, lx: b.x, ly: b.y }
    })
    expect(Math.hypot(ends2.fx - ends.x1, ends2.fy - ends.y1), `R0b route=${route} 起端零跳动`).toBeLessThanOrEqual(0.5)
    expect(Math.hypot(ends2.lx - ends.x2, ends2.ly - ends.y2), `R0b route=${route} 末端零跳动`).toBeLessThanOrEqual(0.5)
    await saveAndClose(win, app)
  })

  /**
   * R-零跳动③斜跨（跨月+slot 错位——右下斜向）。
   */
  test('R-零跳动③斜跨：预览端点=落边端点（两端 ≤0.5px）', async () => {
    test.slow()
    const userData = await mkdtemp(join(tmpdir(), 'anchfix-r0c-'))
    await seedFixture(userData, ['af-d-src', 'af-d-tgt'], ['斜跨源卡', '斜跨目标卡'], {
      nodes: [
        { paperId: 'af-d-src', title: '斜跨源卡', year: 2020, month: 5, slot: 1 },
        { paperId: 'af-d-tgt', title: '斜跨目标卡', year: 2020, month: 8, slot: 2 }
      ],
      edges: []
    })
    const app = await launch(userData)
    const win = await app.firstWindow()
    await openLineage(win, '斜跨源卡')
    const ends = await dragPreviewEnds(win, '斜跨源卡', '斜跨目标卡')
    expect(Math.abs(ends.x1 - ends.fromExp.x), '预览起点 x=规则锚').toBeLessThanOrEqual(0.5)
    expect(Math.abs(ends.y1 - ends.fromExp.y), '预览起点 y=规则锚').toBeLessThanOrEqual(0.5)
    expect(Math.abs(ends.x2 - ends.snapExp.x), '预览吸附端 x=规则锚').toBeLessThanOrEqual(0.5)
    expect(Math.abs(ends.y2 - ends.snapExp.y), '预览吸附端 y=规则锚').toBeLessThanOrEqual(0.5)
    await win.mouse.up()
    await waitForPaths(win, 1)
    const route = await win.locator('svg.tl-edges path.tl-edge').first().evaluate((el) => (el as SVGPathElement).dataset.route ?? '')
    expect(route, 'R0c route 非空卫').not.toBe('')
    const ends2 = await win.locator('svg.tl-edges path.tl-edge').first().evaluate((p) => {
      const el = p as SVGPathElement
      const total = el.getTotalLength()
      const a = el.getPointAtLength(0)
      const b = el.getPointAtLength(total)
      return { fx: a.x, fy: a.y, lx: b.x, ly: b.y }
    })
    expect(Math.hypot(ends2.fx - ends.x1, ends2.fy - ends.y1), `R0c route=${route} 起端零跳动`).toBeLessThanOrEqual(0.5)
    expect(Math.hypot(ends2.lx - ends.x2, ends2.ly - ends.y2), `R0c route=${route} 末端零跳动`).toBeLessThanOrEqual(0.5)
    await saveAndClose(win, app)
  })

  /**
   * R-锚级一致①direct 意图：竖向对齐意图边（瀑布错位下 direct 结构性稀缺——
   * 以实测 route 断言〔设计 v1.2 勘正③〕，zoom 三档恒等）。
   */
  test('R-锚级一致①direct 意图：端点恒落 12 锚体系（zoom 1.0/0.8/1.5）', async () => {
    test.slow()
    const userData = await mkdtemp(join(tmpdir(), 'anchfix-r1-'))
    await seedFixture(userData, ['af-c1-a', 'af-c1-b'], ['直意甲', '直意乙'], {
      nodes: [
        { paperId: 'af-c1-a', title: '直意甲', year: 2020, month: 5, slot: 1 },
        { paperId: 'af-c1-b', title: '直意乙', year: 2020, month: 6, slot: 1 }
      ],
      edges: [{ from: 'af-c1-a', to: 'af-c1-b', label: '' }]
    })
    const app = await launch(userData)
    const win = await app.firstWindow()
    await openLineage(win, '直意甲')
    await waitForPaths(win, 1)
    const route0 = await win.locator('svg.tl-edges path.tl-edge').first().evaluate((el) => (el as SVGPathElement).dataset.route ?? '')
    // 实测 route 登记（direct 意图在瀑布错位下实测落 band 合法——断言族按实测分派）
    await zoomProbe(win, 1.0, async () => {
      await expectAnchorConsistency(win, [{ fromTitle: '直意甲', toTitle: '直意乙' }], `R1 z=1.0 route=${route0}`)
    })
    await zoomProbe(win, 0.8, async () => {
      await expectAnchorConsistency(win, [{ fromTitle: '直意甲', toTitle: '直意乙' }], `R1 z=0.8 route=${route0}`)
    })
    await zoomProbe(win, 1.5, async () => {
      await expectAnchorConsistency(win, [{ fromTitle: '直意甲', toTitle: '直意乙' }], `R1 z=1.5 route=${route0}`)
    })
    await app.close()
  })

  /**
   * R-锚级一致②h-slip：同月横邻边（无桩族——端点=锚直落）。
   */
  test('R-锚级一致②h-slip：端点恒落 12 锚体系（zoom 1.0/0.8/1.5）', async () => {
    test.slow()
    const userData = await mkdtemp(join(tmpdir(), 'anchfix-r2-'))
    await seedFixture(userData, ['af-c2-a', 'af-c2-b'], ['横邻甲', '横邻乙'], {
      nodes: [
        { paperId: 'af-c2-a', title: '横邻甲', year: 2020, month: 8, slot: 1 },
        { paperId: 'af-c2-b', title: '横邻乙', year: 2020, month: 8, slot: 2 }
      ],
      edges: [{ from: 'af-c2-a', to: 'af-c2-b', label: '' }]
    })
    const app = await launch(userData)
    const win = await app.firstWindow()
    await openLineage(win, '横邻甲')
    await waitForPaths(win, 1)
    const route0 = await win.locator('svg.tl-edges path.tl-edge').first().evaluate((el) => (el as SVGPathElement).dataset.route ?? '')
    expect(route0, 'R2 实测 route=h-slip（横邻缝直连——route-slots R3 型几何）').toBe('h-slip')
    await zoomProbe(win, 1.0, async () => {
      await expectAnchorConsistency(win, [{ fromTitle: '横邻甲', toTitle: '横邻乙' }], 'R2 z=1.0')
    })
    await zoomProbe(win, 0.8, async () => {
      await expectAnchorConsistency(win, [{ fromTitle: '横邻甲', toTitle: '横邻乙' }], 'R2 z=0.8')
    })
    await zoomProbe(win, 1.5, async () => {
      await expectAnchorConsistency(win, [{ fromTitle: '横邻甲', toTitle: '横邻乙' }], 'R2 z=1.5')
    })
    await app.close()
  })

  /**
   * R-锚级一致③band（带桩族）：障碍卡拦直连→带路由（route-slots R1 型）——
   * 端点+首段方向沿外法线。
   */
  test('R-锚级一致③band：端点恒落 12 锚体系+首段外法线（zoom 三档）', async () => {
    test.slow()
    const userData = await mkdtemp(join(tmpdir(), 'anchfix-r3-'))
    await seedFixture(userData, ['af-c3-a', 'af-c3-o', 'af-c3-b'], ['带桩甲', '带桩障', '带桩乙'], {
      nodes: [
        { paperId: 'af-c3-a', title: '带桩甲', year: 2020, month: 5, slot: 1 },
        { paperId: 'af-c3-o', title: '带桩障', year: 2020, month: 6, slot: 1 },
        { paperId: 'af-c3-b', title: '带桩乙', year: 2020, month: 7, slot: 1 }
      ],
      edges: [{ from: 'af-c3-a', to: 'af-c3-b', label: '' }]
    })
    const app = await launch(userData)
    const win = await app.firstWindow()
    await openLineage(win, '带桩甲')
    await waitForPaths(win, 1)
    const route0 = await win.locator('svg.tl-edges path.tl-edge').first().evaluate((el) => (el as SVGPathElement).dataset.route ?? '')
    expect(route0, 'R3 实测 route=band（障碍拦直连——route-slots R1 型）').toBe('band')
    await zoomProbe(win, 1.0, async () => {
      await expectAnchorConsistency(win, [{ fromTitle: '带桩甲', toTitle: '带桩乙' }], 'R3 z=1.0')
    })
    await zoomProbe(win, 0.8, async () => {
      await expectAnchorConsistency(win, [{ fromTitle: '带桩甲', toTitle: '带桩乙' }], 'R3 z=0.8')
    })
    await zoomProbe(win, 1.5, async () => {
      await expectAnchorConsistency(win, [{ fromTitle: '带桩甲', toTitle: '带桩乙' }], 'R3 z=1.5')
    })
    await app.close()
  })

  /**
   * R-锚级一致④corridor（带桩族）：跨年中隔障碍（route-slots R2 型）。
   */
  test('R-锚级一致④corridor：端点恒落 12 锚体系+首段外法线（zoom 三档）', async () => {
    test.slow()
    const userData = await mkdtemp(join(tmpdir(), 'anchfix-r4-'))
    await seedFixture(userData, ['af-c4-a', 'af-c4-o', 'af-c4-b'], ['跨年甲', '跨年障', '跨年乙'], {
      nodes: [
        { paperId: 'af-c4-a', title: '跨年甲', year: 2020, month: 12, slot: 1 },
        { paperId: 'af-c4-o', title: '跨年障', year: 2021, month: 1, slot: 1 },
        { paperId: 'af-c4-b', title: '跨年乙', year: 2022, month: 5, slot: 1 }
      ],
      edges: [{ from: 'af-c4-a', to: 'af-c4-b', label: '' }]
    })
    const app = await launch(userData)
    const win = await app.firstWindow()
    await openLineage(win, '跨年甲')
    await waitForPaths(win, 1)
    const route0 = await win.locator('svg.tl-edges path.tl-edge').first().evaluate((el) => (el as SVGPathElement).dataset.route ?? '')
    expect(route0, 'R4 实测 route=corridor（跨年绕行——route-slots R2 型）').toBe('corridor')
    await zoomProbe(win, 1.0, async () => {
      await expectAnchorConsistency(win, [{ fromTitle: '跨年甲', toTitle: '跨年乙' }], 'R4 z=1.0')
    })
    await zoomProbe(win, 0.8, async () => {
      await expectAnchorConsistency(win, [{ fromTitle: '跨年甲', toTitle: '跨年乙' }], 'R4 z=0.8')
    })
    await zoomProbe(win, 1.5, async () => {
      await expectAnchorConsistency(win, [{ fromTitle: '跨年甲', toTitle: '跨年乙' }], 'R4 z=1.5')
    })
    await app.close()
  })

  /**
   * R-锚级一致⑤manual-override（无桩族）：via 直写两相（route-slots R4 型——
   * 一次 launch 量几何→关→spec 直写 via→二次 launch 冷读）。
   */
  test('R-锚级一致⑤manual-override via 直写：端点恒落 12 锚体系（zoom 三档）', async () => {
    test.slow()
    const userData = await mkdtemp(join(tmpdir(), 'anchfix-r5-'))
    await seedFixture(userData, ['af-c5-a', 'af-c5-b'], ['手动甲', '手动乙'], {
      nodes: [
        { paperId: 'af-c5-a', title: '手动甲', year: 2020, month: 8, slot: 1 },
        { paperId: 'af-c5-b', title: '手动乙', year: 2020, month: 8, slot: 2 }
      ],
      edges: [{ from: 'af-c5-a', to: 'af-c5-b', label: '' }]
    })
    // 相位一：量两卡内容 rect（via 锚定=selectAnchor(src, via[0]) 同源——
    // via 点取卡外左/右 ½ 电平投影位）
    const app = await launch(userData)
    const win = await app.firstWindow()
    await openLineage(win, '手动甲')
    const [ra, rb] = await Promise.all([cardContentRect(win, '手动甲'), cardContentRect(win, '手动乙')])
    await app.close()
    // 相位二：直写 via（轴对齐两点同 y=源卡中电平；via[0].x<源中心→左 ½、
    // via[1].x>目标中心→右 ½——route-slots R4 锚定语义同型）
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
             WHERE fn.paper_id = 'af-c5-a' AND tn.paper_id = 'af-c5-b'
           )`
        )
        .run(JSON.stringify([
          { x: ra.x - 60, y: ra.y + ra.h / 2 },
          { x: rb.x + rb.w + 60, y: rb.y + rb.h / 2 }
        ]))
      if (res.changes !== 1) throw new Error(`R5：via 写入 ${res.changes} 行（期望 1）`)
    } finally {
      db.close()
    }
    // 相位三：二次 launch 冷读→manual-override 锚级断言（zoom 三档）
    const app2 = await launch(userData)
    const win2 = await app2.firstWindow()
    await openLineage(win2, '手动甲')
    await waitForPaths(win2, 1)
    const route0 = await win2.locator('svg.tl-edges path.tl-edge').first().evaluate((el) => (el as SVGPathElement).dataset.route ?? '')
    expect(route0, 'R5 实测 route=manual-override（via 冷读）').toBe('manual-override')
    await zoomProbe(win2, 1.0, async () => {
      await expectAnchorConsistency(win2, [{ fromTitle: '手动甲', toTitle: '手动乙' }], 'R5 z=1.0')
    })
    await zoomProbe(win2, 0.8, async () => {
      await expectAnchorConsistency(win2, [{ fromTitle: '手动甲', toTitle: '手动乙' }], 'R5 z=0.8')
    })
    await zoomProbe(win2, 1.5, async () => {
      await expectAnchorConsistency(win2, [{ fromTitle: '手动甲', toTitle: '手动乙' }], 'R5 z=1.5')
    })
    await app2.close()
  })
})
