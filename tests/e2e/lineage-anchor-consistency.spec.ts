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
 * ── R-零跳动（[F-VISFB-66] 钉定基座改写）──
 * 画线拖拽末帧读 draw-preview line x1/y1/x2/y2（内容坐标 attribute）→up 建边
 * →断言新边 path 首末点与预览两端各距 ≤0.5px。钉定模型下两端零跳动=
 * **结构性承诺**：预览起点恒=按下锚、终点=命中锚；落边双端=同两锚（持久
 * 化钉定→装配→routeAll 直取）——同锚恒等不再依赖「预览模拟 selectAnchor
 * 规则」的同源耦合（裁决 D 翻案：两端锚用户钉定，预览不 morph）。from 侧
 * 恒等新增格：mid-drag 掠动后 x1 恒=按下锚。散开态（多边同锚）=域外沿承。
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
 *
 * ── R-占用协同（批 1c——呈裁 C 落点：armed 12 锚小型化全显+占用槽高亮）──
 * armed 态每卡 .card-anchor-dot 恰 12；解析全 path data-anchors→逐锚断言
 * 对应卡 dot[data-anchor-side][data-anchor-slot] 挂 data-occupied="1"、无锚
 * 不挂（占用集精确相等——INV-120 强制方式承载面）。SYNAPSE_SHOT_DIR 环境
 * 变量在场时顺带落两态视觉存证截图（仓外档案区通道——CI 未设即跳过）。
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
 * [F-VISFB-66] 钉定画线手势：源卡右中锚按下→move 至目标卡左中锚（两锚
 * 均为刻意按落位——非规则锚）→返回末帧预览两端与两锚期望（own 域）。
 */
async function dragPreviewEnds(
  win: Page,
  srcTitle: string,
  tgtTitle: string
): Promise<{ x1: number; y1: number; x2: number; y2: number; fromAnchor: { x: number; y: number }; toAnchor: { x: number; y: number } }> {
  await win.getByTestId('lineage-mode-edit').click()
  await win.getByTestId('lineage-tool-solid').click()
  await win.locator('.tl-card', { hasText: srcTitle }).first().scrollIntoViewIfNeeded()
  await win.locator('.tl-card', { hasText: tgtTitle }).first().scrollIntoViewIfNeeded()
  const src = await cardContentRect(win, srcTitle)
  const tgt = await cardContentRect(win, tgtTitle)
  // 按下锚=源右中；落点锚=目标左中（钉定模型：两锚即端点）
  const fromAnchor = { x: src.x + src.w, y: src.y + src.h / 2 }
  const toAnchor = { x: tgt.x, y: tgt.y + tgt.h / 2 }
  const o = await contentOrigin(win)
  await win.mouse.move(o.left + fromAnchor.x * o.z - 2, o.top + fromAnchor.y * o.z)
  await win.mouse.down()
  await win.mouse.move(o.left + toAnchor.x * o.z + 3, o.top + (toAnchor.y - 2) * o.z, { steps: 8 })
  const ends = await win
    .getByTestId('draw-preview')
    .locator('line')
    .evaluate((el) => ({
      x1: Number(el.getAttribute('x1')),
      y1: Number(el.getAttribute('y1')),
      x2: Number(el.getAttribute('x2')),
      y2: Number(el.getAttribute('y2'))
    }))
  return { ...ends, fromAnchor, toAnchor }
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

test.describe('F-ANCHFIX-01 批 1b 锚级一致（R-零跳动+R-锚级一致）', () => {
  /**
   * R-零跳动①竖向同列跨行（[F-SLOTGRID-01 U2] 夹具迁移——原「竖向跨月」
   * 同柱跨框对在网格时代 ½ 入桩锚恒被月标注膨胀带封堵〔标签宽 65.1>卡 ½
   * 偏移 64+PAD——实测锚定〕→band 散开 ¾=INV-119 域外〔预览无法模拟全图
   * 路由〕；直连族零跳动承诺面迁至同列跨行对：row0 col0→row2 col0〔奇行
   * φ=100 错位不拦 col0 竖线〕，route=direct 预览锚≡路由锚）。
   */
  test('R-零跳动①竖向同列跨行（网格直连族）：预览端点=落边端点（两端 ≤0.5px）', async () => {
    test.slow()
    const userData = await mkdtemp(join(tmpdir(), 'anchfix-r0a-'))
    await seedFixture(
      userData,
      ['af-v-src', 'af-v-f1', 'af-v-f2', 'af-v-f3', 'af-v-f4', 'af-v-tgt'],
      ['竖向源卡', '竖向占位一', '竖向占位二', '竖向占位三', '竖向占位四', '竖向目标卡'],
      {
        nodes: [
          { paperId: 'af-v-src', title: '竖向源卡', year: 2020, month: 5, slot: 1 },
          { paperId: 'af-v-f1', title: '竖向占位一', year: 2020, month: 5, slot: 2 },
          { paperId: 'af-v-f2', title: '竖向占位二', year: 2020, month: 5, slot: 3 },
          { paperId: 'af-v-f3', title: '竖向占位三', year: 2020, month: 5, slot: 4 },
          { paperId: 'af-v-f4', title: '竖向占位四', year: 2020, month: 5, slot: 5 },
          { paperId: 'af-v-tgt', title: '竖向目标卡', year: 2020, month: 5, slot: 6 }
        ],
        edges: []
      }
    )
    const app = await launch(userData)
    const win = await app.firstWindow()
    await openLineage(win, '竖向源卡')
    const ends = await dragPreviewEnds(win, '竖向源卡', '竖向目标卡')
    // [F-VISFB-66] 预览末帧=两钉定锚（按下锚/命中锚——源卡须滚动可见：6 卡跨三行占位链）
    expect(Math.abs(ends.x1 - ends.fromAnchor.x), '预览起点 x=按下锚（恒定）').toBeLessThanOrEqual(0.5)
    expect(Math.abs(ends.y1 - ends.fromAnchor.y), '预览起点 y=按下锚（恒定）').toBeLessThanOrEqual(0.5)
    expect(Math.abs(ends.x2 - ends.toAnchor.x), '预览吸附端 x=命中锚').toBeLessThanOrEqual(0.5)
    expect(Math.abs(ends.y2 - ends.toAnchor.y), '预览吸附端 y=命中锚').toBeLessThanOrEqual(0.5)
    // [F-VISFB-66] from 侧恒等新增格：掠离命中锚后 x1/y1 恒=按下锚（钉定端
    // 不随 move 重算——fromEff morph 面已删）
    const o = await contentOrigin(win)
    const fromAnchor = ends.fromAnchor
    await win.mouse.move(o.left + 400 * o.z, o.top + 520 * o.z, { steps: 4 })
    const endsAfter = await win
      .getByTestId('draw-preview')
      .locator('line')
      .evaluate((el) => ({ x1: Number(el.getAttribute('x1')), y1: Number(el.getAttribute('y1')) }))
    expect(Math.abs(endsAfter.x1 - fromAnchor.x), '掠动后预览起点 x 仍=按下锚（恒定）').toBeLessThanOrEqual(0.5)
    expect(Math.abs(endsAfter.y1 - fromAnchor.y), '掠动后预览起点 y 仍=按下锚（恒定）').toBeLessThanOrEqual(0.5)
    // 回目标锚再松手（掠动段=恒等观测，非落点——落点回命中锚）
    const tgt2 = { x: o.left + ends.toAnchor.x * o.z, y: o.top + ends.toAnchor.y * o.z }
    await win.mouse.move(tgt2.x + 3, tgt2.y - 2, { steps: 4 })
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
    expect(Math.abs(ends.x1 - ends.fromAnchor.x), '预览起点 x=按下锚').toBeLessThanOrEqual(0.5)
    expect(Math.abs(ends.y1 - ends.fromAnchor.y), '预览起点 y=按下锚').toBeLessThanOrEqual(0.5)
    expect(Math.abs(ends.x2 - ends.toAnchor.x), '预览吸附端 x=命中锚').toBeLessThanOrEqual(0.5)
    expect(Math.abs(ends.y2 - ends.toAnchor.y), '预览吸附端 y=命中锚').toBeLessThanOrEqual(0.5)
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
   * R-零跳动③斜跨（[F-SLOTGRID-01 U2] 夹具迁移——原跨月+slot 错位对在网格
   * 时代 x 带分离恒触发 h-slip〔侧锚〕而预览=竖向主向 selectAnchor〔顶/底
   * 锚〕——两锚族互斥=INV-119 等价性前提〔主向与态族一致〕破坏；斜跨零跳动
   * 承诺面迁至同框跨行错列对：row0 col0→row1 col0〔φ=100 错位 100px——
   * dx<dy 竖向主向，x_s≠x_t→band 竖向定边 sideAnchor≡竖向主向
   * selectAnchor，无月标注封堵〔row1 无标注带〕→无散开〕）。
   */
  test('R-零跳动③斜跨（同框跨行错列——竖向主向 band 族）：预览端点=落边端点（两端 ≤0.5px）', async () => {
    test.slow()
    const userData = await mkdtemp(join(tmpdir(), 'anchfix-r0c-'))
    await seedFixture(
      userData,
      ['af-d-src', 'af-d-f1', 'af-d-f2', 'af-d-tgt'],
      ['斜跨源卡', '斜跨占位一', '斜跨占位二', '斜跨目标卡'],
      {
        nodes: [
          { paperId: 'af-d-src', title: '斜跨源卡', year: 2020, month: 5, slot: 1 },
          { paperId: 'af-d-f1', title: '斜跨占位一', year: 2020, month: 5, slot: 2 },
          { paperId: 'af-d-f2', title: '斜跨占位二', year: 2020, month: 5, slot: 3 },
          { paperId: 'af-d-tgt', title: '斜跨目标卡', year: 2020, month: 5, slot: 4 }
        ],
        edges: []
      }
    )
    const app = await launch(userData)
    const win = await app.firstWindow()
    await openLineage(win, '斜跨源卡')
    const ends = await dragPreviewEnds(win, '斜跨源卡', '斜跨目标卡')
    expect(Math.abs(ends.x1 - ends.fromAnchor.x), '预览起点 x=按下锚').toBeLessThanOrEqual(0.5)
    expect(Math.abs(ends.y1 - ends.fromAnchor.y), '预览起点 y=按下锚').toBeLessThanOrEqual(0.5)
    expect(Math.abs(ends.x2 - ends.toAnchor.x), '预览吸附端 x=命中锚').toBeLessThanOrEqual(0.5)
    expect(Math.abs(ends.y2 - ends.toAnchor.y), '预览吸附端 y=命中锚').toBeLessThanOrEqual(0.5)
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
   * [F-VISFB-66] R-锚级①-⑤改写=落端钉定锚×5（等势置换：同点数同强度换
   * 基座——豁免#8 置换说明附档）：种子边经 spec 直写锚列（better-sqlite3
   * ——迁移 025 列），断言路径首末点=两钉定锚几何点 ±1（zoom 三档恒等）；
   * route 实测非空卫沿承（钉定端直取仍走五态链——走线仍自动）。
   */
  const seedPinned = async (
    userData: string,
    fromTitle: string,
    toTitle: string,
    fa: { side: string; slot: number },
    ta: { side: string; slot: number }
  ): Promise<void> => {
    const wsDb = join(userData, 'workspaces', 'default', 'synapse.db')
    const db = new Database(existsSync(wsDb) ? wsDb : join(userData, 'synapse.db'))
    try {
      const res = db
        .prepare(
          `UPDATE lineage_edges SET from_anchor = ?, to_anchor = ?
           WHERE id IN (
             SELECT e.id FROM lineage_edges e
             JOIN lineage_nodes fn ON fn.id = e.from_node
             JOIN lineage_nodes tn ON tn.id = e.to_node
             WHERE fn.title = ? AND tn.title = ?
           )`
        )
        .run(JSON.stringify(fa), JSON.stringify(ta), fromTitle, toTitle)
      if (res.changes !== 1) throw new Error(`锚列直写 ${res.changes} 行（期望 1）`)
    } finally {
      db.close()
    }
  }

  /**
   * 钉定端点断言体（[回炉 R4] 恢复强度）：每案预期路由态断言+首末点=
   * anchorPoint ±1（own 域）+带桩族（band/detour）首段沿命中边外法线
   * |sin|≤0.0349（±2°——v1.2 随裁修正①）。
   */
  const expectPinnedEndpoints = async (
    win: Page,
    spec: Array<{
      fromTitle: string
      toTitle: string
      fa: { side: string; slot: number }
      ta: { side: string; slot: number }
      /** 预期路由态（undefined=非空卫；数组=限定族） */
      expectRoute?: string | string[]
    }>,
    tag: string
  ): Promise<void> => {
    const ends = await win.evaluate(() => {
      const paths = Array.from(document.querySelectorAll('svg.tl-edges path.tl-edge')) as SVGPathElement[]
      return paths.map((p) => {
        const total = p.getTotalLength()
        const p0 = p.getPointAtLength(0)
        const p1 = p.getPointAtLength(2)
        const pe = p.getPointAtLength(total)
        return { route: p.dataset.route ?? '', first: { x: p0.x, y: p0.y }, last: { x: pe.x, y: pe.y }, dir: { x: p1.x - p0.x, y: p1.y - p0.y } }
      })
    })
    expect(ends.length, `${tag}：边数=播种数`).toBe(spec.length)
    const ptOf = (r: { x: number; y: number; w: number; h: number }, side: string, slot: number): { x: number; y: number } => {
      const f = [0.25, 0.5, 0.75][slot]!
      if (side === 'top') return { x: r.x + r.w * f, y: r.y }
      if (side === 'bottom') return { x: r.x + r.w * f, y: r.y + r.h }
      if (side === 'left') return { x: r.x, y: r.y + r.h * f }
      return { x: r.x + r.w, y: r.y + r.h * f }
    }
    for (let i = 0; i < spec.length; i++) {
      const e = ends[i]!
      const sp = spec[i]!
      if (typeof sp.expectRoute === 'string') {
        expect(e.route, `${tag} 边${i} route=${sp.expectRoute}（[回炉 R4] 预期路由态恢复）`).toBe(sp.expectRoute)
      } else if (Array.isArray(sp.expectRoute)) {
        expect(sp.expectRoute, `${tag} 边${i} route=${e.route}∈限定族`).toContain(e.route)
      } else {
        expect(e.route, `${tag} 边${i} data-route 非空卫（钉定端直取仍走五态链）`).not.toBe('')
      }
      const from = await cardContentRect(win, sp.fromTitle)
      const to = await cardContentRect(win, sp.toTitle)
      const fa = ptOf(from, sp.fa.side, sp.fa.slot)
      const ta = ptOf(to, sp.ta.side, sp.ta.slot)
      expect(Math.hypot(e.first.x - fa.x, e.first.y - fa.y), `${tag} 边${i}（${e.route}）首点=from 钉定锚 ±1`).toBeLessThanOrEqual(1)
      expect(Math.hypot(e.last.x - ta.x, e.last.y - ta.y), `${tag} 边${i}（${e.route}）末点=to 钉定锚 ±1`).toBeLessThanOrEqual(1)
      if (e.route === 'band' || e.route === 'detour') {
        const nrm = { top: { x: 0, y: -1 }, bottom: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } }[sp.fa.side as 'top' | 'bottom' | 'left' | 'right']!
        const len = Math.hypot(e.dir.x, e.dir.y)
        const sin = Math.abs((e.dir.x * nrm.y - e.dir.y * nrm.x) / len)
        expect(sin, `${tag} 边${i}（${e.route}）首段沿 ${sp.fa.side} 边外法线 |sin|≤0.0349（±2°）`).toBeLessThanOrEqual(0.0349)
      }
    }
  }

  test('R-锚级一致①（钉定基座）：直意对落端=钉定锚（zoom 1.0/0.8/1.5）', async () => {
    test.slow()
    const userData = await mkdtemp(join(tmpdir(), 'anchfix-r1-'))
    await seedFixture(userData, ['af-c1-a', 'af-c1-b'], ['直意甲', '直意乙'], {
      nodes: [
        { paperId: 'af-c1-a', title: '直意甲', year: 2020, month: 5, slot: 1 },
        { paperId: 'af-c1-b', title: '直意乙', year: 2020, month: 6, slot: 1 }
      ],
      edges: [{ from: 'af-c1-a', to: 'af-c1-b', label: '' }]
    })
    await seedPinned(userData, '直意甲', '直意乙', { side: 'bottom', slot: 2 }, { side: 'top', slot: 0 })
    const app = await launch(userData)
    const win = await app.firstWindow()
    await openLineage(win, '直意甲')
    await waitForPaths(win, 1)
    const route0 = await win.locator('svg.tl-edges path.tl-edge').first().evaluate((el) => (el as SVGPathElement).dataset.route ?? '')
    // [S15] 预期态固化：该夹具（5月→6月跨月直列+钉定 ¾→¼ 错列）真实基线=
    // 'overlap'（钉定错列 x 不等→direct/detour 门不入；band 带封闭→兜底态。
    // 探针实测定死——禁启动时实测自引用；变异路由器即红）
    expect(route0, 'R1 route=overlap（固定字面值——夹具真实基线族 [S15]）').toBe('overlap')
    await zoomProbe(win, 1.0, async () => {
      await expectPinnedEndpoints(win, [{ fromTitle: '直意甲', toTitle: '直意乙', fa: { side: 'bottom', slot: 2 }, ta: { side: 'top', slot: 0 }, expectRoute: 'overlap' }], 'R1 z=1.0')
    })
    await zoomProbe(win, 0.8, async () => {
      await expectPinnedEndpoints(win, [{ fromTitle: '直意甲', toTitle: '直意乙', fa: { side: 'bottom', slot: 2 }, ta: { side: 'top', slot: 0 }, expectRoute: 'overlap' }], 'R1 z=0.8')
    })
    await zoomProbe(win, 1.5, async () => {
      await expectPinnedEndpoints(win, [{ fromTitle: '直意甲', toTitle: '直意乙', fa: { side: 'bottom', slot: 2 }, ta: { side: 'top', slot: 0 }, expectRoute: 'overlap' }], 'R1 z=1.5')
    })
    await app.close()
  })

  test('R-锚级一致②（钉定基座）：横邻对落端=钉定锚（zoom 三档）', async () => {
    test.slow()
    const userData = await mkdtemp(join(tmpdir(), 'anchfix-r2-'))
    await seedFixture(userData, ['af-c2-a', 'af-c2-b'], ['横邻甲', '横邻乙'], {
      nodes: [
        { paperId: 'af-c2-a', title: '横邻甲', year: 2020, month: 8, slot: 1 },
        { paperId: 'af-c2-b', title: '横邻乙', year: 2020, month: 8, slot: 2 }
      ],
      edges: [{ from: 'af-c2-a', to: 'af-c2-b', label: '' }]
    })
    await seedPinned(userData, '横邻甲', '横邻乙', { side: 'right', slot: 1 }, { side: 'left', slot: 1 })
    const app = await launch(userData)
    const win = await app.firstWindow()
    await openLineage(win, '横邻甲')
    await waitForPaths(win, 1)
    const route0 = await win.locator('svg.tl-edges path.tl-edge').first().evaluate((el) => (el as SVGPathElement).dataset.route ?? '')
    expect(route0, 'R2 实测 route=h-slip（横邻缝直连——[回炉 R4] 恢复预期态）').toBe('h-slip')
    for (const z of [1.0, 0.8, 1.5]) {
      await zoomProbe(win, z, async () => {
        await expectPinnedEndpoints(win, [{ fromTitle: '横邻甲', toTitle: '横邻乙', fa: { side: 'right', slot: 1 }, ta: { side: 'left', slot: 1 }, expectRoute: 'h-slip' }], `R2 z=${z}`)
      })
    }
    await app.close()
  })

  test('R-锚级一致③（钉定基座）：带桩族（双障夹中——band）落端=钉定锚+首段外法线（zoom 三档）', async () => {
    test.slow()
    const userData = await mkdtemp(join(tmpdir(), 'anchfix-r3-'))
    await seedFixture(userData, ['af-c3-a', 'af-c3-o1', 'af-c3-o2', 'af-c3-b'], ['带桩甲', '带桩障一', '带桩障二', '带桩乙'], {
      nodes: [
        { paperId: 'af-c3-a', title: '带桩甲', year: 2020, month: 5, slot: 1 },
        { paperId: 'af-c3-o1', title: '带桩障一', year: 2020, month: 6, slot: 0 },
        { paperId: 'af-c3-o2', title: '带桩障二', year: 2020, month: 6, slot: 2 },
        { paperId: 'af-c3-b', title: '带桩乙', year: 2020, month: 7, slot: 1 }
      ],
      edges: [{ from: 'af-c3-a', to: 'af-c3-b', label: '' }]
    })
    // 钉定：fa=b1/ta=t2（探针实证 band 可达槽对——t1 被月标注带拦）
    await seedPinned(userData, '带桩甲', '带桩乙', { side: 'bottom', slot: 1 }, { side: 'top', slot: 2 })
    const app = await launch(userData)
    const win = await app.firstWindow()
    await openLineage(win, '带桩甲')
    await waitForPaths(win, 1)
    const route0 = await win.locator('svg.tl-edges path.tl-edge').first().evaluate((el) => (el as SVGPathElement).dataset.route ?? '')
    expect(route0, 'R3 实测 route=band（[回炉 R4] 恢复预期态——钉定=b1/t2 探针实证可达槽）').toBe('band')
    for (const z of [1.0, 0.8, 1.5]) {
      await zoomProbe(win, z, async () => {
        await expectPinnedEndpoints(win, [{ fromTitle: '带桩甲', toTitle: '带桩乙', fa: { side: 'bottom', slot: 1 }, ta: { side: 'top', slot: 2 }, expectRoute: 'band' }], `R3 z=${z}`)
      })
    }
    await app.close()
  })

  test('R-锚级一致④（钉定基座）：跨年绕行族落端=钉定锚（zoom 三档）', async () => {
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
    await seedPinned(userData, '跨年甲', '跨年乙', { side: 'bottom', slot: 0 }, { side: 'top', slot: 2 })
    const app = await launch(userData)
    const win = await app.firstWindow()
    await openLineage(win, '跨年甲')
    await waitForPaths(win, 1)
    const route0 = await win.locator('svg.tl-edges path.tl-edge').first().evaluate((el) => (el as SVGPathElement).dataset.route ?? '')
    expect(['band', 'detour'], `R4 实测 route=${route0}（跨年绕行族——[回炉 R4] 收回放宽）`).toContain(route0)
    for (const z of [1.0, 0.8, 1.5]) {
      await zoomProbe(win, z, async () => {
        await expectPinnedEndpoints(win, [{ fromTitle: '跨年甲', toTitle: '跨年乙', fa: { side: 'bottom', slot: 0 }, ta: { side: 'top', slot: 2 }, expectRoute: ['band', 'detour'] }], `R4 z=${z}`)
      })
    }
    await app.close()
  })

  test('R-锚级一致⑤（钉定基座）：manual-override via 直写+钉定锚（优先级=钉定＞主向——W-04 e2e 面）', async () => {
    test.slow()
    const userData = await mkdtemp(join(tmpdir(), 'anchfix-r5-'))
    await seedFixture(userData, ['af-c5-a', 'af-c5-b'], ['手动甲', '手动乙'], {
      nodes: [
        { paperId: 'af-c5-a', title: '手动甲', year: 2020, month: 8, slot: 1 },
        { paperId: 'af-c5-b', title: '手动乙', year: 2020, month: 8, slot: 2 }
      ],
      edges: [{ from: 'af-c5-a', to: 'af-c5-b', label: '' }]
    })
    // 相位一：量两卡内容 rect
    const app = await launch(userData)
    const win = await app.firstWindow()
    await openLineage(win, '手动甲')
    const [ra, rb] = await Promise.all([cardContentRect(win, '手动甲'), cardContentRect(win, '手动乙')])
    await app.close()
    // 相位二：直写 via+钉定锚（from=左 ½/to=右 ½——非主向规则锚=判别位）
    const wsDb = join(userData, 'workspaces', 'default', 'synapse.db')
    const db = new Database(existsSync(wsDb) ? wsDb : join(userData, 'synapse.db'))
    try {
      const res = db
        .prepare(
          `UPDATE lineage_edges SET via = ?, from_anchor = ?, to_anchor = ?
           WHERE id IN (
             SELECT e.id FROM lineage_edges e
             JOIN lineage_nodes fn ON fn.id = e.from_node
             JOIN lineage_nodes tn ON tn.id = e.to_node
             WHERE fn.title = '手动甲' AND tn.title = '手动乙'
           )`
        )
        .run(
          JSON.stringify([
            { x: ra.x - 60, y: ra.y + ra.h / 2 },
            { x: rb.x + rb.w + 60, y: rb.y + rb.h / 2 }
          ]),
          JSON.stringify({ side: 'left', slot: 1 }),
          JSON.stringify({ side: 'right', slot: 1 })
        )
      if (res.changes !== 1) throw new Error(`R5：via+锚写入 ${res.changes} 行（期望 1）`)
    } finally {
      db.close()
    }
    // 相位三：二次 launch 冷读→manual-override 钉定端点断言（zoom 三档）
    const app2 = await launch(userData)
    const win2 = await app2.firstWindow()
    await openLineage(win2, '手动甲')
    await waitForPaths(win2, 1)
    const route0 = await win2.locator('svg.tl-edges path.tl-edge').first().evaluate((el) => (el as SVGPathElement).dataset.route ?? '')
    expect(route0, 'R5 实测 route=manual-override（via 冷读）').toBe('manual-override')
    for (const z of [1.0, 0.8, 1.5]) {
      await zoomProbe(win2, z, async () => {
        await expectPinnedEndpoints(win2, [{ fromTitle: '手动甲', toTitle: '手动乙', fa: { side: 'left', slot: 1 }, ta: { side: 'right', slot: 1 }, expectRoute: 'manual-override' }], `R5 z=${z}`)
      })
    }
    await app2.close()
  })
})

test.describe('F-ANCHFIX-01 批 1c 占用协同（armed 12 锚全显+占用槽高亮）', () => {
  /**
   * R-占用协同：armed 态每卡 .card-anchor-dot 恰 12（INV-120 显示域=可吸附
   * 判定域）；解析全 path data-anchors→逐锚断言对应卡 dot[data-anchor-side]
   * [data-anchor-slot] 挂 data-occupied="1"；无锚 dot 不挂（占用集精确相等
   * ——多标/漏标即红）。占用标记单源=routeAll anchorMarks（EdgeOverlay
   * data-anchors 透出）。SYNAPSE_SHOT_DIR 在场时落 armed/edit-hover 两态
   * 视觉存证截图（⑤b——CI 未设即跳过）。
   */
  test('1c 占用协同：armed 每卡 12 dot+data-anchors 逐锚占用标记+无锚不挂', async () => {
    test.slow()
    const userData = await mkdtemp(join(tmpdir(), 'anchfix-1c-'))
    await seedFixture(userData, ['af-o1-a', 'af-o1-b'], ['占协甲', '占协乙'], {
      nodes: [
        { paperId: 'af-o1-a', title: '占协甲', year: 2020, month: 5, slot: 1 },
        { paperId: 'af-o1-b', title: '占协乙', year: 2020, month: 7, slot: 1 }
      ],
      edges: [{ from: 'af-o1-a', to: 'af-o1-b', label: '' }]
    })
    // [F-VISFB-66] 扩展：钉定锚预注册占用（§F——routeAll 阶段 0 pin→dot 高亮）
    const wsDb0 = join(userData, 'workspaces', 'default', 'synapse.db')
    const db0 = new Database(existsSync(wsDb0) ? wsDb0 : join(userData, 'synapse.db'))
    try {
      const r0 = db0
        .prepare(
          `UPDATE lineage_edges SET from_anchor = ?, to_anchor = ?
           WHERE id IN (
             SELECT e.id FROM lineage_edges e
             JOIN lineage_nodes fn ON fn.id = e.from_node
             JOIN lineage_nodes tn ON tn.id = e.to_node
             WHERE fn.paper_id = 'af-o1-a' AND tn.paper_id = 'af-o1-b'
           )`
        )
        .run(JSON.stringify({ side: 'bottom', slot: 1 }), JSON.stringify({ side: 'top', slot: 1 }))
      if (r0.changes !== 1) throw new Error(`1c 钉定直写 ${r0.changes} 行（期望 1）`)
    } finally {
      db0.close()
    }
    const app = await launch(userData)
    const win = await app.firstWindow()
    await openLineage(win, '占协甲')
    await waitForPaths(win, 1)
    await win.getByTestId('lineage-mode-edit').click()
    await win.getByTestId('lineage-tool-solid').click()
    // armed：每卡恰 12 dot 且可见（显示域=判定域）
    for (const title of ['占协甲', '占协乙']) {
      const card = win.locator('.tl-card', { hasText: title }).first()
      await expect(card.locator('.card-anchor-dot')).toHaveCount(12)
      await expect(card.locator('.card-anchor-dot[data-anchor-side="top"][data-anchor-slot="0"]')).toBeVisible()
      await expect(card.locator('.card-anchor-dot[data-anchor-side="right"][data-anchor-slot="2"]')).toBeVisible()
    }
    // 占用发布 settle（rAF 单写者→订阅重渲一拍余量）
    await expect
      .poll(async () => await win.evaluate(() => document.querySelectorAll('.card-anchor-dot[data-occupied="1"]').length), { timeout: 10_000 })
      .toBeGreaterThan(0)
    // in-page 取数：每卡占用标记清单（side 名→字母映射=data-anchors token 形）
    // +全 path data-anchors
    const data = await win.evaluate(() => {
      const LETTER: Record<string, string> = { top: 't', bottom: 'b', left: 'l', right: 'r' }
      const cards = Array.from(document.querySelectorAll('.tl-card[data-node-id]')) as HTMLElement[]
      const occ: Record<string, string[]> = {}
      for (const c of cards) {
        occ[c.dataset.nodeId ?? ''] = Array.from(c.querySelectorAll('.card-anchor-dot[data-occupied="1"]')).map(
          (d) => `${LETTER[(d as HTMLElement).dataset.anchorSide ?? ''] ?? '?'}${(d as HTMLElement).dataset.anchorSlot}`
        )
      }
      const anchors = Array.from(document.querySelectorAll('svg.tl-edges path.tl-edge')).map((p) => (p as SVGPathElement).dataset.anchors ?? '')
      return { occ, anchors }
    })
    // 期望占用集=解析 data-anchors（token=cardId:side字母+slot——末冒号切分）
    const expected: Record<string, string[]> = {}
    for (const marks of data.anchors) {
      expect(marks, '1c data-anchors 非空卫（占用单源在场）').not.toBe('')
      for (const tok of marks.split(',')) {
        const i = tok.lastIndexOf(':')
        expect(i, `1c token 形卫（cardId:side+slot）：${tok}`).toBeGreaterThan(0)
        const nodeId = tok.slice(0, i)
        const mark = tok.slice(i + 1)
        ;(expected[nodeId] ??= []).push(mark)
      }
    }
    expect(Object.keys(expected).length, '1c 占用卡数=2（边两端卡）').toBe(2)
    for (const [nodeId, marks] of Object.entries(expected)) {
      const got = [...data.occ[nodeId] ?? []].sort()
      // 逐锚协同（data-anchors 每锚↔dot 占用标记）+无锚不挂（集精确相等）
      expect(got, `1c 卡 ${nodeId} 占用标记集=期望（逐锚协同+无锚不挂）`).toEqual([...marks].sort())
    }

    // ⑤b 视觉存证（env 门控——CI 未设即跳过）
    const shotDir = process.env.SYNAPSE_SHOT_DIR
    if (shotDir !== undefined && shotDir !== '') {
      await win.screenshot({ path: join(shotDir, 'b1c-shot-armed.png') })
    }
    // edit-hover 态存证：中点 4 锚（slot1——hover 通道 ½ 子集沿承）
    await win.getByTestId('lineage-tool-select').click()
    const cardA = win.locator('.tl-card', { hasText: '占协甲' }).first()
    const rb = await cardA.boundingBox()
    if (rb === null) throw new Error('1c hover 态卡不可见')
    await win.mouse.move(rb.x + rb.width / 2, rb.y + rb.height / 2)
    await expect(cardA.locator('.card-anchor-dot[data-anchor-slot="1"]').first()).toBeVisible()
    if (shotDir !== undefined && shotDir !== '') {
      await win.screenshot({ path: join(shotDir, 'b1c-shot-hover.png') })
    }
    await app.close()
  })

  /**
   * [F-VISFB-66 §F 扩展+回炉 R14-①] 钉定注册占用直证（独立用例——基线 1c
   * 增强断言外迁：routeAll 阶段 0 pin→dot 避让可见性）。
   */
  test('1c 钉定注册占用直证：钉定锚 dot（b1/t1）恒挂 data-occupied（[F-VISFB-66] 扩展）', async () => {
    test.slow()
    const userData = await mkdtemp(join(tmpdir(), 'anchfix-1c-pin-'))
    await seedFixture(userData, ['af-o2-a', 'af-o2-b'], ['钉占甲', '钉占乙'], {
      nodes: [
        { paperId: 'af-o2-a', title: '钉占甲', year: 2020, month: 5, slot: 1 },
        { paperId: 'af-o2-b', title: '钉占乙', year: 2020, month: 7, slot: 1 }
      ],
      edges: [{ from: 'af-o2-a', to: 'af-o2-b', label: '' }]
    })
    const wsDb = join(userData, 'workspaces', 'default', 'synapse.db')
    const db = new Database(existsSync(wsDb) ? wsDb : join(userData, 'synapse.db'))
    try {
      const r0 = db
        .prepare(
          `UPDATE lineage_edges SET from_anchor = ?, to_anchor = ?
           WHERE id IN (
             SELECT e.id FROM lineage_edges e
             JOIN lineage_nodes fn ON fn.id = e.from_node
             JOIN lineage_nodes tn ON tn.id = e.to_node
             WHERE fn.paper_id = 'af-o2-a' AND tn.paper_id = 'af-o2-b'
           )`
        )
        .run(JSON.stringify({ side: 'bottom', slot: 1 }), JSON.stringify({ side: 'top', slot: 1 }))
      if (r0.changes !== 1) throw new Error(`钉定直写 ${r0.changes} 行（期望 1）`)
    } finally {
      db.close()
    }
    const app = await launch(userData)
    const win = await app.firstWindow()
    await openLineage(win, '钉占甲')
    await waitForPaths(win, 1)
    await win.getByTestId('lineage-mode-edit').click()
    await win.getByTestId('lineage-tool-solid').click()
    await expect
      .poll(async () => await win.evaluate(() => document.querySelectorAll('.card-anchor-dot[data-occupied="1"]').length), { timeout: 10_000 })
      .toBeGreaterThan(0)
    const pinned = await win.evaluate(() => {
      const out: string[] = []
      for (const d of Array.from(document.querySelectorAll('.card-anchor-dot[data-occupied="1"]'))) {
        const el = d as HTMLElement
        if (el.dataset.anchorSide === 'bottom' && el.dataset.anchorSlot === '1') out.push('b1')
        if (el.dataset.anchorSide === 'top' && el.dataset.anchorSlot === '1') out.push('t1')
      }
      return out.sort()
    })
    expect(pinned, '钉定锚 dot 占用直证（b1/t1 双在场——阶段 0 pin）').toEqual(['b1', 't1'])
    await app.close()
  })
})
