/**
 * [F-LINEUI-01] 横向 drag-autoscroll+工具条/徽记横向钉住 e2e（设计书 v2.1 §4.2）：
 * - LU-01 卡拖横滚（①行为面）：1024 视口+最小非空图两卡（地板 577+:has 守卫
 *   ——非空图必有横滚域）；edit 模式；拖拽源按 data-node-id 精确取卡（禁
 *   querySelector 首卡）；scrollIntoView 锚定（F-CIFLK-01）；单向时间线：
 *   拖至右带深带（clientX=containerRight−10）→poll scrollLeft>50→驻留至 max
 *   +400ms 稳定→拖至左带（containerLeft+10）→poll 回 0。拖影代数断言=实测
 *   偏移不变式：激活步（+10px 过阈）后、**首次横滚前**安装页内 rAF 采样器
 *   记 cardX−cursorX（pointermove 光标追踪——左回段光标位变化），滚动帧
 *   |差−基准|≤1，采样窗覆盖全程含左回段；test.slow()。
 * - LU-02 工具栏自身横滚（②）：[B5 设计稿 §11.3「lineage-lineui01：LU-02 改工具栏自身横滚、
 *   百分比复位和实际 transform；删 .lg-toolbar 相对 .timeline sticky 钉住、ZoomBadge 双轴
 *   transform 补偿」——wave C 2026-11-25 断言翻转] 工具栏=页面顶部稳定外壳（不在画布滚动
 *   容器内）：1024×768 下 .lg-toolbar-scroll scrollWidth>clientWidth；滚动容器 scrollLeft=40
 *   **前置回读断言 ===40**→壳层 bbox.x 不变（±1）而轨道内控件 bbox.x 前移 40（±1——
 *   真实横滚，非 sticky 钉住）；滚到最右后右详情开关全落壳层可视区。
 * - LU-03 工具栏不随画布滚动位移＋百分比复位+实际 transform（②）：[B5 §3.1/§4.2——同上翻转]
 *   画布横滚 40/竖滚 300（各回读断言）→zoom-badge（工具栏百分比复位钮）bbox 前后差 ≤1
 *   （工具栏在画布外——无 transform 补偿，单发读即可）；置 zoom 110%（V67-03 wheelZoom 路径）
 *   →.tl-content computed transform=matrix(1.1…)+containText '110%'→click→containText '100%'
 *   +transform 回 none。always-active。
 */
import { test, expect, type Page } from '@playwright/test'
import { createHash } from 'node:crypto'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { bootstrapMigrations, launch, seedLineageGraph, seedPaperRow } from './e2e-env'

/** 最小非空图两卡（同月双卡——LU-01 拖拽源/邻卡，LU-02/03 共用种子） */
async function seedPair(userData: string): Promise<void> {
  const ids = ['lu1-a', 'lu1-b']
  const titles = ['横滚甲', '横滚乙']
  for (let i = 0; i < ids.length; i++) {
    const sha = createHash('sha256').update(`lu1-${ids[i]}`).digest('hex')
    await seedPaperRow(userData, `${sha.slice(0, 2)}/${sha.slice(2, 4)}/${sha}.pdf`, sha, titles[i]!, ids[i])
  }
  await seedLineageGraph(userData, {
    nodes: [
      { paperId: 'lu1-a', title: '横滚甲', year: 2020, month: 5, slot: 1 },
      { paperId: 'lu1-b', title: '横滚乙', year: 2020, month: 5, slot: 2 }
    ],
    edges: []
  })
}

/** 1024 视口开图（CI 1024×768 同构——V67-01 基线口径） */
async function openLineage1024(win: Page, firstTitle: string): Promise<void> {
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
  await win.setViewportSize({ width: 1024, height: 800 })
  await win.getByRole('button', { name: '脉络', exact: true }).click()
  await expect(win.locator('.tl-card').first()).toContainText(firstTitle, { timeout: 10_000 })
}

const scrollLeftOf = (win: Page): Promise<number> =>
  win.locator('.timeline').evaluate((el) => el.scrollLeft)

const setScrollLeft = (win: Page, v: number): Promise<number> =>
  win.locator('.timeline').evaluate((el, x) => {
    el.scrollLeft = x
    return el.scrollLeft
  }, v)

const setScrollTop = (win: Page, v: number): Promise<number> =>
  win.locator('.timeline').evaluate((el, x) => {
    el.scrollTop = x
    return el.scrollTop
  }, v)

/** ctrl+wheel 一步（V67-03 形态——deltaY<0=zoomStep(+1)） */
async function wheelZoom(win: Page, deltaY: number): Promise<void> {
  await win.locator('.timeline').evaluate(
    (el, dy) => {
      el.dispatchEvent(new WheelEvent('wheel', { ctrlKey: true, deltaY: dy, bubbles: true, cancelable: true }))
    },
    deltaY
  )
}

test.describe('F-LINEUI-01 横向 drag-autoscroll+横向钉住', () => {
  test('LU-01 卡拖横滚：右深带推进→驻留至 max 稳定→左带回 0+拖影偏移不变式（滚动帧 |cardX−cursorX−基准|≤1）', async () => {
    test.slow()
    const userData = await mkdtemp(join(tmpdir(), 'lu01-1-'))
    await bootstrapMigrations(userData)
    await seedPair(userData)
    const app = await launch(userData)
    const win = await app.firstWindow()
    await openLineage1024(win, '横滚甲')
    await win.getByTestId('lineage-mode-edit').click()
    // 拖拽源按 data-node-id 精确取卡（禁 querySelector 首卡——测到静止卡=假绿）：
    // 种子节点 id=randomUUID 不可预知——唯一标题解析源卡→读其 data-node-id 贯穿
    const nodeId = await win
      .locator('.tl-card', { hasText: '横滚甲' })
      .first()
      .evaluate((el) => (el as HTMLElement).dataset.nodeId ?? '')
    expect(nodeId, '拖拽源 data-node-id 解析（非空）').not.toBe('')
    const card = win.locator(`.tl-card[data-node-id="${nodeId}"]`)
    await card.evaluate((el) => el.scrollIntoView({ block: 'center', inline: 'start', behavior: 'instant' }))
    const cb = await card.boundingBox()
    if (cb === null) throw new Error('拖拽源卡不可见')
    const tlBox = await win.locator('.timeline').boundingBox()
    if (tlBox === null) throw new Error('.timeline 不可见')
    const spill = await win.locator('.timeline').evaluate((el) => el.scrollWidth - el.clientWidth)
    expect(spill, '1024 档横滚域在场（地板 577>scrollport——非空图必有横滚）').toBeGreaterThan(0)
    // 光标 y=容器中线（纵中带——纯横轴面）；深带目标=右 −10/左 +10（带内边界速度≈0 会超时）
    const midY = tlBox.y + tlBox.height / 2
    const rightX = tlBox.x + tlBox.width - 10
    const leftX = tlBox.x + 10
    const startX = cb.x + cb.width / 2
    await win.mouse.move(startX, cb.y + cb.height / 2)
    await win.mouse.down()
    // 激活步：+10px 过 5px 阈（.dragging transform 随 React 重渲染在场）——
    // 仍处纵中带零滚动、未入横触发带（首次横滚未发生）
    await win.mouse.move(startX + 10, cb.y + cb.height / 2, { steps: 2 })
    // 拖影代数采样器（激活后、首次横滚前安装——d1-W1：覆盖首个滚动帧，基准=
    // 首样本）：滚动帧记 cardCenterX−cursorX（pointermove 光标追踪——左回段
    // 光标位变化）；stop 旗收口——采样窗覆盖全程含左回段
    await win.evaluate(
      (init) => {
        const w = window as unknown as { __lu01Samples?: number[]; __lu01Stop?: boolean }
        const cardEl = document.querySelector(`.tl-card[data-node-id="${init.nid}"]`)
        const tl = document.querySelector('.timeline')
        if (!(cardEl instanceof HTMLElement) || !(tl instanceof HTMLElement)) {
          throw new Error('LU-01 采样器：卡/滚动容器缺席')
        }
        const samples: number[] = []
        // 光标初值=安装时驻留位（此后首个 pointermove 前无事件——0 初值会污染基准）
        const cur = { x: init.cursorX }
        document.addEventListener(
          'pointermove',
          (e) => {
            cur.x = e.clientX
          },
          { passive: true }
        )
        let lastLeft = tl.scrollLeft
        const frame = (): void => {
          const r = cardEl.getBoundingClientRect()
          if (tl.scrollLeft !== lastLeft) {
            lastLeft = tl.scrollLeft
            samples.push(r.x + r.width / 2 - cur.x)
          }
          if (w.__lu01Stop === true) w.__lu01Samples = samples
          else requestAnimationFrame(frame)
        }
        requestAnimationFrame(frame)
      },
      { nid: nodeId, cursorX: startX + 10 }
    )
    // 拖至右带深带（采样器已在场——首滚动帧即被观测）
    await win.mouse.move(rightX, midY, { steps: 6 })
    // ① 右带推进
    await expect.poll(() => scrollLeftOf(win), { timeout: 8_000 }).toBeGreaterThan(50)
    // ② 驻留至 max+400ms 稳定（到界停）
    await expect
      .poll(
        () => win.locator('.timeline').evaluate((el) => el.scrollLeft - (el.scrollWidth - el.clientWidth)),
        { timeout: 12_000 }
      )
      .toBe(0)
    const atMax = await scrollLeftOf(win)
    await win.waitForTimeout(400)
    expect(await scrollLeftOf(win), 'LU-01 到界停（驻留 400ms 稳定）').toBe(atMax)
    // ③ 拖至左带→回 0
    await win.mouse.move(leftX, midY, { steps: 8 })
    await expect.poll(() => scrollLeftOf(win), { timeout: 8_000 }).toBe(0)
    // 停采样→不变式断言（首样本=基准）
    await win.evaluate(() => {
      ;(window as unknown as { __lu01Stop?: boolean }).__lu01Stop = true
    })
    await expect
      .poll(
        () => win.evaluate(() => (window as unknown as { __lu01Samples?: number[] }).__lu01Samples?.length ?? 0),
        { timeout: 5_000 }
      )
      .toBeGreaterThanOrEqual(1)
    const samples = await win.evaluate(() => (window as unknown as { __lu01Samples?: number[] }).__lu01Samples ?? [])
    expect(samples.length, 'LU-01 采样窗覆盖左回段（滚动帧样本≥8）').toBeGreaterThanOrEqual(8)
    for (let i = 0; i < samples.length; i++) {
      expect(
        Math.abs(samples[i]! - samples[0]!),
        `LU-01 滚动帧 ${i}：cardX−cursorX 偏移不变 ±1（实测 ${samples[i]!.toFixed(1)} vs 基准 ${samples[0]!.toFixed(1)}）`
      ).toBeLessThanOrEqual(1)
    }
    await win.mouse.up()
    await app.close()
  })

  test('LU-02 工具栏自身横滚：1024×768 scrollWidth>clientWidth+scrollLeft=步长（回读 ===步长）→壳层不动、轨道内控件前移同步+滚到最右右详情开关可视', async () => {
    const userData = await mkdtemp(join(tmpdir(), 'lu01-2-'))
    await bootstrapMigrations(userData)
    await seedPair(userData)
    const app = await launch(userData)
    const win = await app.firstWindow()
    await openLineage1024(win, '横滚甲')
    // [B5 §3.2/§12 E09 视口] 1024×768（CI runner 档）
    await win.setViewportSize({ width: 1024, height: 768 })
    const shell = win.locator('.lg-toolbar-shell')
    const scroll = win.locator('.lg-toolbar-scroll')
    const track = win.locator('.lg-toolbar')
    await expect(track).toBeVisible({ timeout: 5_000 })
    // 横滚域在场：轨道内容宽>滚动容器可视宽（原生横向滚动承载——不做第二排/溢出菜单）
    const metrics = await scroll.evaluate((el) => ({ scrollW: el.scrollWidth, clientW: el.clientWidth }))
    expect(metrics.scrollW, `1024×768 工具栏横滚（scrollWidth ${metrics.scrollW}>clientWidth ${metrics.clientW}）`).toBeGreaterThan(metrics.clientW)
    // 滚动步长：沿用旧断言的 40，并夹到工具栏实际可滚范围内（Linux 实测 browse 态轨道 989−容器 952=37——
    // 原生滚动条占 15px；Windows runner 字宽/滚动条厚度不同，范围随之变化）；下限 20=横滚量必须可观
    const range = metrics.scrollW - metrics.clientW
    const STEP = Math.min(40, range)
    expect(range, `工具栏可滚范围 ${range}px（≥20——不足即种子/视口面错）`).toBeGreaterThanOrEqual(20)
    const probe = win.getByTestId('lineage-focus-clear')
    const shellBefore = (await shell.boundingBox())!
    const probeBefore = (await probe.boundingBox())!
    const readback = await scroll.evaluate((el, x) => {
      el.scrollLeft = x
      return el.scrollLeft
    }, STEP)
    expect(readback, '前置：横滚域在场（scrollLeft 赋值非 no-op——回读 !==步长即夹具面错）').toBe(STEP)
    const shellAfter = (await shell.boundingBox())!
    const probeAfter = (await probe.boundingBox())!
    expect(Math.abs(shellAfter.x - shellBefore.x), '壳层（页面外壳）不随轨道滚动位移').toBeLessThanOrEqual(1)
    expect(
      Math.abs(probeBefore.x - STEP - probeAfter.x),
      `轨道内控件随滚动前移 ${STEP}（实测前移 ${(probeBefore.x - probeAfter.x).toFixed(1)}）——真实横滚，非 sticky 钉住`
    ).toBeLessThanOrEqual(1)
    // 滚到最右：右详情开关全落壳层可视区（原生 scrollIntoView 等价——编程滚到 max）
    await scroll.evaluate((el) => {
      el.scrollLeft = el.scrollWidth
    })
    await expect.poll(() => scroll.evaluate((el) => el.scrollLeft - (el.scrollWidth - el.clientWidth))).toBe(0)
    const toggleBox = (await win.getByTestId('lineage-sidebar-collapse').boundingBox())!
    const shellRight = (await shell.boundingBox())!
    expect(toggleBox.x + toggleBox.width, '滚到最右后右详情开关右缘≤壳层右缘').toBeLessThanOrEqual(shellRight.x + shellRight.width + 0.5)
    expect(toggleBox.x, '滚到最右后右详情开关左缘≥壳层左缘（完整可视）').toBeGreaterThanOrEqual(shellRight.x - 0.5)
    await app.close()
  })

  test('LU-03 工具栏不随画布滚动位移（横滚 40/竖滚 300）+zoom 110%→百分比复位钮点击→100%：.tl-content 实际 transform 同步', async () => {
    test.slow()
    const userData = await mkdtemp(join(tmpdir(), 'lu01-3-'))
    await bootstrapMigrations(userData)
    await seedPair(userData)
    const app = await launch(userData)
    const win = await app.firstWindow()
    await openLineage1024(win, '横滚甲')
    const badge = win.locator('[data-testid="zoom-badge"]')
    await expect(badge).toHaveText('100%', { timeout: 5_000 }) // 纯 N%（原「100% ▾」）
    const transform = (): Promise<string> =>
      win.evaluate(() => {
        const ct = document.querySelector('.tl-content')
        return ct === null ? '' : getComputedStyle(ct).transform
      })
    expect(await transform(), '100%=无变换（内容坐标域基线）').toBe('none')
    // 横轴：画布 scrollLeft=40（回读断言）→工具栏百分比钮 x 前后差 ≤1（工具栏在画布外——
    // [B5 §4.2] 右下角角标及其滚动 transform 补偿退役；无事件依赖，单发读即可）
    const x0 = (await badge.boundingBox())!
    const rbx = await setScrollLeft(win, 40)
    expect(rbx, '前置：画布横滚位 40 回读（赋值非 no-op）').toBe(40)
    const x1 = (await badge.boundingBox())!
    expect(Math.abs(x1.x - x0.x), '画布横滚不带动工具栏控件').toBeLessThanOrEqual(1)
    // 纵轴：注入可滚面（AS-01 先例 min-height 2400）+scrollTop=300（回读断言）→y 差 ≤1
    await win.evaluate(() => {
      document.getElementById('e2e-lu01-vscroll')?.remove()
      const style = document.createElement('style')
      style.id = 'e2e-lu01-vscroll'
      style.textContent = '.tl-content { min-height: 2400px !important }'
      document.head.append(style)
    })
    const y0 = (await badge.boundingBox())!
    const rby = await setScrollTop(win, 300)
    expect(rby, '前置：画布竖滚位 300 回读（赋值非 no-op）').toBe(300)
    const y1 = (await badge.boundingBox())!
    expect(Math.abs(y1.y - y0.y), '画布竖滚不带动工具栏控件').toBeLessThanOrEqual(1)
    // 缩放（判别化：画布此刻已横竖双滚——transform 仍作用于 .tl-content）：ctrl+wheel 置 110%
    // →.tl-content computed transform=matrix(1.1,…)+百分比钮 '110%'
    await wheelZoom(win, -100)
    await expect(badge).toHaveText('110%', { timeout: 5_000 })
    await expect.poll(transform, { timeout: 5_000 }).toBe('matrix(1.1, 0, 0, 1.1, 0, 0)')
    // 百分比复位钮（工具栏内——点击前滚动可见）→100%+transform 回 none
    await badge.scrollIntoViewIfNeeded()
    await badge.click()
    await expect(badge).toHaveText('100%', { timeout: 5_000 })
    await expect.poll(transform, { timeout: 5_000 }).toBe('none')
    await app.close()
  })
})
