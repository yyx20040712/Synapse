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
 * - LU-02 工具条横滚钉住（②）：edit 前置（工具条仅 edit 可见）+scrollLeft=80
 *   **前置回读断言 ===80**→.lg-toolbar bbox.x 前后差 ≤1（纯 CSS sticky 无事件
 *   依赖可单发读）。
 * - LU-03 徽记双轴钉住+点击可达（②）：横滚 80/竖滚 300（各回读断言）→
 *   zoom-badge bbox 前后差 ≤1（expect.poll——transform 由 scroll 事件驱动）；
 *   点击冒烟判别化：置 zoom 110%（V67-03 wheelZoom 路径）→containText
 *   '110%'→click→containText '100%'。always-active。
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

  test('LU-02 工具条横滚钉住：edit 前置+scrollLeft=80（回读 ===80）→.lg-toolbar bbox.x 前后差 ≤1', async () => {
    const userData = await mkdtemp(join(tmpdir(), 'lu01-2-'))
    await bootstrapMigrations(userData)
    await seedPair(userData)
    const app = await launch(userData)
    const win = await app.firstWindow()
    await openLineage1024(win, '横滚甲')
    await win.getByTestId('lineage-mode-edit').click()
    const toolbar = win.locator('.lg-toolbar')
    await expect(toolbar).toBeVisible({ timeout: 5_000 })
    const x0 = await toolbar.boundingBox()
    if (x0 === null) throw new Error('.lg-toolbar 不可见')
    const readback = await setScrollLeft(win, 80)
    expect(readback, '前置：横滚域在场（scrollLeft=80 赋值非 no-op——回读 !==80 即种子/视口面错）').toBe(80)
    const x1 = await toolbar.boundingBox()
    if (x1 === null) throw new Error('.lg-toolbar 滚后不可见')
    expect(Math.abs(x1.x - x0.x), 'LU-02 工具条横滚钉住（sticky left:0——漂移即红）').toBeLessThanOrEqual(1)
    await app.close()
  })

  test('LU-03 徽记双轴钉住+点击可达：横滚 80/竖滚 300 双轴 poll ≤1+zoom 110%→click→100%', async () => {
    test.slow()
    const userData = await mkdtemp(join(tmpdir(), 'lu01-3-'))
    await bootstrapMigrations(userData)
    await seedPair(userData)
    const app = await launch(userData)
    const win = await app.firstWindow()
    await openLineage1024(win, '横滚甲')
    const badge = win.locator('[data-testid="zoom-badge"]')
    await expect(badge).toBeVisible({ timeout: 5_000 })
    // 横轴：scrollLeft=80（回读断言）→x 前后差 ≤1（poll——transform 由 scroll 事件驱动）
    const x0 = await badge.boundingBox()
    if (x0 === null) throw new Error('zoom-badge 不可见')
    const rbx = await setScrollLeft(win, 80)
    expect(rbx, '前置：横滚位 80 回读（赋值非 no-op）').toBe(80)
    await expect
      .poll(async () => Math.abs(((await badge.boundingBox())?.x ?? -9999) - x0.x), { timeout: 5_000 })
      .toBeLessThanOrEqual(1)
    // 纵轴：注入可滚面（AS-01 先例 min-height 2400）+scrollTop=300（回读断言）→y 差 ≤1
    await win.evaluate(() => {
      const el = document.getElementById('e2e-lu01-vscroll')
      el?.remove()
      const style = document.createElement('style')
      style.id = 'e2e-lu01-vscroll'
      style.textContent = '.tl-content { min-height: 2400px !important }'
      document.head.append(style)
    })
    const y0 = await badge.boundingBox()
    if (y0 === null) throw new Error('zoom-badge（竖滚前）不可见')
    const rby = await setScrollTop(win, 300)
    expect(rby, '前置：竖滚位 300 回读（赋值非 no-op）').toBe(300)
    await expect
      .poll(async () => Math.abs(((await badge.boundingBox())?.y ?? -9999) - y0.y), { timeout: 5_000 })
      .toBeLessThanOrEqual(1)
    // 点击冒烟（判别化）：置 zoom 110%→containText→click→100%（默认 100% 下点击断言 vacuous）
    await wheelZoom(win, -100)
    await expect(badge).toContainText('110%', { timeout: 5_000 })
    await badge.click()
    await expect(badge).toContainText('100%', { timeout: 5_000 })
    await app.close()
  })
})
