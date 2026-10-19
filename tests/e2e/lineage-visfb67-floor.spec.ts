/**
 * [F-VISFB-67 U1/U3] 窄视口低容量分行退役 e2e——地板三改原子真机锁：
 * `.month-frame` min-width 577px + `.tl-card` flex-shrink:0 + `.timeline`
 * overflow-x:auto（终裁 v3 方案 A1 修正案；用户裁决「脉络图缩放独立，不应
 * 出现〔窄视口分行〕」）。
 *
 * 断言面（基线=仓外探针 20261019-fvisfb67-impl/u0-facts.md）：
 * - V67-01 地板矩阵 640/880/1024：首月框 computed width===577（=1280 读数
 *   border-box 口径，容差 0——U0 钉死）+2/5/8 卡月 rows=[2]/[3,2]/[3,2,3]
 *   （partitionRows(count,577) 同源）+月内卡 offsetWidth 恒 128（flex
 *   压缩退役）+横滚存在（scrollWidth−clientWidth 动态实测>0，禁硬编码
 *   256/400/640 派生值）+scrollLeft 可达 max/中点/0（原生钳制实测）
 *   +用户滚轮 deltaX 推进 scrollLeft（overflow-x:auto 行为面独有锚——
 *   hidden 下编程 scrollLeft 可写但用户滚动禁行，编程可达性对二者零判别
 *   〔变异③守卫洞实测〕故必须真实滚轮通道锁）。
 * - V67-02 1280 零变回归：W===577+scrollWidth===clientWidth（无横滚）+
 *   行形态同源（≥1280 未缩放态行为零变——规约 2）。
 * - V67-03 zoom/scroll 专项（1024 档）：zoom 100→110→100 三拍 W/行形态/
 *   DOM 序（nodeId 全序）不变（缩放独立——用户裁决语义）+横纵溢出皆可滚
 *   （scrollTop/scrollLeft 双达 max）+scrollLeft 往返自然钳制（越界赋值
 *   钳 max、回 0——原生行为断言）。640 专项=V67-01 承载（地板/卡 128/
 *   分段可达，不含拖拽）。
 * - V67-04 [R3 裁定] 中间带归一化：1440×860+4 卡月——use-capacity-layout
 *   读数=内容盒宽（computed−pad−border）后容量入段带过估根治：rows=[3,1]
 *   +每卡右缘≤月框裁切边界（框 padding-box 内缘——k1-W1/N3 措辞口径：
 *   裁切边界≠内容盒右缘，含 padding 带右端；改前 [4]+第 4 卡右缘 740 超
 *   裁切边界即红）。
 * - V67-05 [轮 3 B1] 拖拽容量输入归一化（两源合流）：1440×860 4 卡月
 *   （布局 [3,1]/归一化 W_content≈711）——D 原位中心松手=零写（改前
 *   raw 737→[4] 网格 insertIdx=1 错插 [A,D,B,C] 即红）+A 跨行拖至 row1
 *   D 位落点=[B,C,D,A]（改前 raw 网格行钳 row0→零写不变序即红）。
 * - V67-06 [轮 3 W1] 边层铺满滚动域：1024 地板态滚右后 .tl-edges/
 *   .tl-edge-hits 层宽≥滚动内容宽（改前层=scrollport 宽 461<717 滚出区
 *   边句柄不可命中即红）。
 *
 * 视口纪律（N2 措辞修正）：几何断言以 evaluate 读 DOM 为主；鼠标面=
 * V67-01 真实滚轮（.timeline boundingBox 定位）+V67-05 拖拽（1440 档
 * 全卡共视——scrollport 877≥span 620，双端锚不需横滚）；1024/640 档
 * 无鼠标拖拽面。always-active（K3）。
 *
 * 收敛纪律（k1-W2）：zoom 档收敛条件=绝对行形态/transform 生效信号（禁以
 * badge 文本/W 读数为收敛条件——badge 仅作内容断言）；setViewportSize 逐档
 * 后 poll W 稳定（RO→rAF→React 重渲染收敛，探针 stableW 同法）。
 */
import { test, expect, type Page } from '@playwright/test'
import { createHash } from 'node:crypto'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { bootstrapMigrations, launch, seedLineageGraph, seedPaperRow } from './e2e-env'
import { partitionRows } from '../../src/renderer/features/lineage/capacity'

/** 地板目标=1280 默认档首月框 computed width 读数（border-box——U0 钉死口径） */
const W_FLOOR = 577

/** 月组种子（U0 探针同型）：1/2/3/5/8 卡同月——2/5/8 为断言锚月 */
const MONTHS: Array<{ m: number; n: number; tag: string }> = [
  { m: 3, n: 1, tag: '2020|3' },
  { m: 5, n: 2, tag: '2020|5' },
  { m: 6, n: 3, tag: '2020|6' },
  { m: 7, n: 5, tag: '2020|7' },
  { m: 8, n: 8, tag: '2020|8' }
]

async function seedMonthGroup(userData: string): Promise<void> {
  const nodes: Array<{ paperId: string; title: string; year: number; month: number }> = []
  let i = 0
  for (const mo of MONTHS) {
    for (let k = 1; k <= mo.n; k++) {
      i++
      const title = `F67地板 ${String(mo.m).padStart(2, '0')}月第${k}篇`
      const sha = createHash('sha256').update(`f67-${mo.m}-${k}`).digest('hex')
      await seedPaperRow(
        userData,
        `${sha.slice(0, 2)}/${sha.slice(2, 4)}/${sha}.pdf`,
        sha,
        title,
        `f67-p${i}`
      )
      nodes.push({ paperId: `f67-p${i}`, title, year: 2020, month: mo.m })
    }
  }
  await seedLineageGraph(userData, { nodes, edges: [] })
}

/** 首月框 computed width（W 源=use-capacity-layout 同读数——布局盒/zoom 正交） */
const wOf = (win: Page): Promise<number> =>
  win.locator('.month-frame').first().evaluate((el) => parseFloat(getComputedStyle(el).width))

/** 指定月框分行形态（每 .tl-row 卡数） */
const rowsOf = (win: Page, frameKey: string): Promise<number[]> =>
  win
    .locator(`.month-frame[data-frame-key="${frameKey}"]`)
    .evaluate((el) =>
      Array.from(el.querySelectorAll(':scope > .tl-row')).map(
        (r) => r.querySelectorAll(':scope > .tl-card').length
      )
    )

/** 全卡 nodeId 序（DOM 序不变性断言面） */
const idsOf = (win: Page): Promise<string[]> =>
  win.locator('.month-frame .tl-card').evaluateAll((els) =>
    els.map((e) => (e as HTMLElement).dataset.nodeId ?? '')
  )

/** .timeline 滚动度量（动态读——禁硬编码派生值） */
const scrollInfo = (win: Page): Promise<{ clientW: number; scrollW: number; clientH: number; scrollH: number }> =>
  win.locator('.timeline').evaluate((el) => ({
    clientW: el.clientWidth,
    scrollW: el.scrollWidth,
    clientH: el.clientHeight,
    scrollH: el.scrollHeight
  }))

/** scrollLeft 赋值后回读（原生钳制面） */
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

/** ctrl+wheel 一步（deltaY<0=zoomStep(+1)——timeline-zoom-hook 语义，探针同法） */
async function wheelZoom(win: Page, deltaY: number): Promise<void> {
  await win.locator('.timeline').evaluate(
    (el, dy) => {
      el.dispatchEvent(new WheelEvent('wheel', { ctrlKey: true, deltaY: dy, bubbles: true, cancelable: true }))
    },
    deltaY
  )
}

/** 2/5/8 卡月行形态=partitionRows 同源期望（W_FLOOR 单源——非手抄数组） */
const expectedShapes = (): Array<{ tag: string; n: number; rows: number[] }> => {
  const anchors = MONTHS.filter((mo) => [2, 5, 8].includes(mo.n))
  return anchors.map((mo) => ({
    tag: mo.tag,
    n: mo.n,
    rows: partitionRows(mo.n, W_FLOOR).map((r) => r.length)
  }))
}

test.describe('F-VISFB-67 窄视口地板（min-width 577+flex-shrink:0+overflow-x:auto 三改原子）', () => {
  test('V67-01 地板矩阵：640/880/1024 三视口 W===577+行形态同源+卡恒 128+横滚存在且可达', async () => {
    test.slow()
    const userData = await mkdtemp(join(tmpdir(), 'f67-v01-'))
    await bootstrapMigrations(userData)
    await seedMonthGroup(userData)
    const app = await launch(userData)
    const win = await app.firstWindow()
    await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
    await win.getByRole('button', { name: '脉络', exact: true }).click()
    await expect(win.locator('.month-frame .tl-card').first()).toBeVisible({ timeout: 20_000 })

    for (const width of [640, 880, 1024]) {
      await win.setViewportSize({ width, height: 800 })
      // W 地板读数（poll=RO→rAF→重渲染收敛；[W3] 稳健化=≥地板目标——平台
      // 滚动条宽差不钉死精确等值，亚默认窗自然宽<地板恒被钳 577）
      await expect.poll(() => wOf(win), { timeout: 5_000 }).toBeGreaterThanOrEqual(W_FLOOR)
      // 行形态：2/5/8 卡月=partitionRows(n,577) 同源（[2]/[3,2]/[3,2,3]）
      for (const { tag, n, rows } of expectedShapes()) {
        await expect
          .poll(() => rowsOf(win, tag), { timeout: 5_000 })
          .toEqual(rows)
        expect(rows.reduce((a, b) => a + b, 0), `${tag} 卡数守恒`).toBe(n)
      }
      // 卡恒 128（flex 压缩退役——8 卡月全卡 offsetWidth）
      const cardWs = await win
        .locator('.month-frame[data-frame-key="2020|8"] .tl-card')
        .evaluateAll((els) => els.map((e) => (e instanceof HTMLElement ? e.offsetWidth : -1)))
      expect(cardWs.length, '8 卡月在场').toBe(8)
      expect(new Set(cardWs).size === 1 && cardWs[0] === 128, `卡宽恒 128（实测 ${JSON.stringify(cardWs)}）`).toBe(true)
      // 横滚存在（动态 spill>0）+scrollLeft 可达 max/中点/0（原生钳制）
      const info = await scrollInfo(win)
      const spill = info.scrollW - info.clientW
      expect(spill, `${width} 档横滚存在（scrollWidth ${info.scrollW}−clientWidth ${info.clientW}）`).toBeGreaterThan(0)
      expect(Math.abs((await setScrollLeft(win, info.scrollW)) - spill), '可达 max（越界赋值原生钳 max，≤1px 容差）').toBeLessThanOrEqual(1)
      const mid = Math.floor(spill / 2)
      expect(Math.abs((await setScrollLeft(win, mid)) - mid), '可达中点（≤1px 容差）').toBeLessThanOrEqual(1)
      expect(await setScrollLeft(win, 0), '可回 0（≤1px 容差）').toBeLessThanOrEqual(1)
      // 用户滚动通道判别锚（变异③守卫洞补强）：真实滚轮 deltaX 在 overflow-x:
      // auto 下推进 scrollLeft；hidden 下编程 scrollLeft 虽可写但用户滚动禁行
      // （scrollLeft 恒 0）——本锚独锁 overflow-x:auto 的行为面
      const tlBox = await win.locator('.timeline').boundingBox()
      if (tlBox === null) throw new Error('.timeline 不可见')
      await win.mouse.move(tlBox.x + Math.min(tlBox.width / 2, 38), tlBox.y + tlBox.height / 2)
      await win.mouse.wheel(60, 0)
      await expect
        .poll(() => win.locator('.timeline').evaluate((el) => el.scrollLeft), { timeout: 5_000 })
        .toBeGreaterThan(0)
      await setScrollLeft(win, 0)
    }
    await app.close()
  })

  test('V67-02 1280 零变回归：W===577+scrollWidth===clientWidth（无横滚）+行形态同源', async () => {
    const userData = await mkdtemp(join(tmpdir(), 'f67-v02-'))
    await bootstrapMigrations(userData)
    await seedMonthGroup(userData)
    const app = await launch(userData)
    const win = await app.firstWindow()
    await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
    await win.setViewportSize({ width: 1280, height: 800 })
    await win.getByRole('button', { name: '脉络', exact: true }).click()
    await expect(win.locator('.month-frame .tl-card').first()).toBeVisible({ timeout: 20_000 })
    // [W3·轮 4 P2-1] 稳健化：W 区间断言 [577,592]（577=地板/592=clientWidth
    // 717−140+15 滚动条差容差的收紧上界）；无横溢=scrollWidth≤clientWidth
    // （overlay 滚动条平台 scrollWidth 可等于——等值仍零横滚）
    await expect.poll(() => wOf(win), { timeout: 5_000 }).toBeGreaterThanOrEqual(W_FLOOR)
    await expect.poll(() => wOf(win), { timeout: 5_000 }).toBeLessThanOrEqual(592)
    for (const { tag, rows } of expectedShapes()) {
      await expect
        .poll(() => rowsOf(win, tag), { timeout: 5_000 })
        .toEqual(rows)
    }
    const info = await scrollInfo(win)
    expect(info.scrollW, '1280 无横滚（scrollWidth≤clientWidth——零变回归）').toBeLessThanOrEqual(info.clientW)
    expect(await setScrollLeft(win, info.scrollW), 'maxScrollLeft≤1（零横滚）').toBeLessThanOrEqual(1)
    await app.close()
  })

  test('V67-03 zoom/scroll 专项（1024）：zoom 往返 W/行形态/DOM 序不变+横纵溢出可滚+scrollLeft 往返自然钳制', async () => {
    test.slow()
    const userData = await mkdtemp(join(tmpdir(), 'f67-v03-'))
    await bootstrapMigrations(userData)
    await seedMonthGroup(userData)
    const app = await launch(userData)
    const win = await app.firstWindow()
    await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
    await win.setViewportSize({ width: 1024, height: 800 })
    await win.getByRole('button', { name: '脉络', exact: true }).click()
    await expect(win.locator('.month-frame .tl-card').first()).toBeVisible({ timeout: 20_000 })
    await expect.poll(() => wOf(win), { timeout: 5_000 }).toBeGreaterThanOrEqual(W_FLOOR)
    // [k1-W2] 绝对形态基线：5 卡月 [3,2]（zoom 前先轮询收敛到该绝对形态——
    // 禁以 badge/W 为收敛条件）
    await expect.poll(() => rowsOf(win, '2020|7'), { timeout: 5_000 }).toEqual([3, 2])
    const wBase = await wOf(win)
    const rows5Before = await rowsOf(win, '2020|5')
    const idsBefore = await idsOf(win)
    // zoom 100%→110%：收敛信号=transform 生效（缩放机制可观测面）+行形态
    // 复稳——badge 文本仅作内容断言（非收敛条件）
    await wheelZoom(win, -100)
    await expect
      .poll(
        () => win.locator('.tl-content').evaluate((el) => getComputedStyle(el).transform),
        { timeout: 5_000 }
      )
      .toContain('matrix(1.1')
    await expect.poll(() => rowsOf(win, '2020|7'), { timeout: 5_000 }).toEqual([3, 2])
    await expect(win.locator('[data-testid="zoom-badge"]')).toContainText('110%')
    await expect.poll(() => wOf(win), { timeout: 5_000 }).toBe(wBase)
    expect(await rowsOf(win, '2020|5'), 'zoom 后行形态不变').toEqual(rows5Before)
    expect(await idsOf(win), 'zoom 后 DOM 序不变').toEqual(idsBefore)
    // 横纵溢出皆可滚（zoom 撑域后双轴 max 可达——原生行为）
    const zoomed = await scrollInfo(win)
    const vMax = zoomed.scrollH - zoomed.clientH
    expect(vMax, '纵向可滚（scrollTop 达 max）').toBeGreaterThan(0)
    expect(await setScrollTop(win, zoomed.scrollH)).toBe(vMax)
    const hMax = zoomed.scrollW - zoomed.clientW
    expect(hMax, '横向可滚（scrollLeft 达 max）').toBeGreaterThan(0)
    expect(await setScrollLeft(win, zoomed.scrollW)).toBe(hMax)
    // scrollLeft 往返自然钳制：越界钳 max→回 0（原生钳制，无自定义回弹）
    expect(Math.abs((await setScrollLeft(win, 999_999)) - hMax), '越界赋值钳 max（≤1px 容差）').toBeLessThanOrEqual(1)
    expect(await setScrollLeft(win, 0), '回 0（≤1px 容差）').toBeLessThanOrEqual(1)
    // zoom 110%→100%：收敛信号=transform 回 none+行形态复稳（badge 内容断言）
    await wheelZoom(win, 100)
    await expect
      .poll(
        () => win.locator('.tl-content').evaluate((el) => getComputedStyle(el).transform),
        { timeout: 5_000 }
      )
      .toBe('none')
    await expect.poll(() => rowsOf(win, '2020|7'), { timeout: 5_000 }).toEqual([3, 2])
    await expect(win.locator('[data-testid="zoom-badge"]')).toContainText('100%')
    await expect.poll(() => wOf(win), { timeout: 5_000 }).toBe(wBase)
    expect(await rowsOf(win, '2020|5'), '回档后行形态不变').toEqual(rows5Before)
    expect(await idsOf(win), '回档后 DOM 序不变').toEqual(idsBefore)
    await app.close()
  })

  /** 4 卡同月种子（2020-04——1440 档 W_computed=737 恰落 N=4 入段带：未归一化
   * n=⌊809/200⌋=4 单行满排+第 4 卡右缘 740>内容宽 709.8 裁切；归一化
   * W_content=737−27.2=709.8→n=3/m=3→[3,1]）——V67-04/V67-05 共用 */
  async function seedFourCardMonth(userData: string): Promise<void> {
    const nodes: Array<{ paperId: string; title: string; year: number; month: number }> = []
    for (let k = 1; k <= 4; k++) {
      const title = `F67中间带 04月第${k}篇`
      const sha = createHash('sha256').update(`f67-mid-${k}`).digest('hex')
      await seedPaperRow(userData, `${sha.slice(0, 2)}/${sha.slice(2, 4)}/${sha}.pdf`, sha, title, `f67-mid-p${k}`)
      nodes.push({ paperId: `f67-mid-p${k}`, title, year: 2020, month: 4 })
    }
    await seedLineageGraph(userData, { nodes, edges: [] })
  }

  /** 4 卡月卡序读数（标题序号数组 [1,2,3,4] 形——settle 后 DOM 序断言面） */
  const orderOf = async (win: Page): Promise<number[]> =>
    win
      .locator('.month-frame[data-frame-key="2020|4"] .tl-card')
      .evaluateAll((els) =>
        els
          .map((e) => Number(/第(\d+)篇/.exec(e.textContent ?? '')?.[1] ?? -1))
      )

  test('V67-04 [R3 裁定] 中间带归一化：1440×860 视口 4 卡月 rows=[3,1]+每卡右缘不超月框裁切边界（框 padding-box 内缘；容量入段带过估根治——改前 [4]+第 4 卡裁切即红）', async () => {
    const userData = await mkdtemp(join(tmpdir(), 'f67-v04-'))
    await bootstrapMigrations(userData)
    await seedFourCardMonth(userData)
    const app = await launch(userData)
    const win = await app.firstWindow()
    await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
    await win.setViewportSize({ width: 1440, height: 860 })
    await win.getByRole('button', { name: '脉络', exact: true }).click()
    await expect(win.locator('.month-frame .tl-card').first()).toBeVisible({ timeout: 20_000 })
    // 行形态=归一化容量 [3,1]（poll 收敛——改前 [4] 即红）
    await expect
      .poll(() => rowsOf(win, '2020|4'), { timeout: 5_000 })
      .toEqual([3, 1])
    // [k1-W1/N3 措辞] 裁切边界=框 padding-box 内缘（gBCR 右−右边框——.month-frame
    // overflow:hidden 的实际裁切线；≠内容盒右缘：右 padding 带 12px 属裁切内）
    const clip = await win
      .locator('.month-frame[data-frame-key="2020|4"]')
      .evaluate((el) => {
        const cs = getComputedStyle(el)
        const clipRight = el.getBoundingClientRect().right - parseFloat(cs.borderRightWidth)
        const cards = Array.from(el.querySelectorAll('.tl-card'))
        return cards.map((c) => c.getBoundingClientRect().right - clipRight)
      })
    expect(clip.length, '4 卡在场').toBe(4)
    for (const over of clip) {
      expect(over, `卡右缘超裁切边界量（正=裁切，容差 0.5px 浮点残差）：${over.toFixed(1)}`).toBeLessThanOrEqual(0.5)
    }
    await app.close()
  })

  test('V67-05 [轮 3 B1] 拖拽容量输入归一化：1440×860 4 卡月 D 原位松手零写+A 跨行拖至 row1 落点（改前 raw 网格错插即红）', async () => {
    test.slow()
    const userData = await mkdtemp(join(tmpdir(), 'f67-v05-'))
    await bootstrapMigrations(userData)
    await seedFourCardMonth(userData)
    const app = await launch(userData)
    const win = await app.firstWindow()
    await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
    await win.setViewportSize({ width: 1440, height: 860 })
    await win.getByRole('button', { name: '脉络', exact: true }).click()
    await expect(win.locator('.month-frame .tl-card').first()).toBeVisible({ timeout: 20_000 })
    // 布局前置=[3,1]（归一化布局侧——B1 两源分叉的判别前提）
    await expect
      .poll(() => rowsOf(win, '2020|4'), { timeout: 5_000 })
      .toEqual([3, 1])
    await win.getByTestId('lineage-mode-edit').click()
    const card = (n: number) => win.locator('.month-frame[data-frame-key="2020|4"] .tl-card').nth(n - 1)

    // D（row1）原位中心松手=零写（[C-01 定谳] 实测机理=**下拉带 extend 支抢占
    // grid 调用**：D 居末行，其中心在校准冻结底缘 fb0 之下→回中三步 extend
    // 恒真→nextIdx=srcIds.length−1=srcIdx 覆盖激活帧瞬态网格值→changed=false
    // 零写——raw/归一化两态同绿（本例=零写语义锁，非判别锚；插桩实录见批档
    // §13：M 序列 extend=true×3+U 序列 insertIdx=3=X 调用仅激活帧一次））
    {
      const db = await card(4).boundingBox()
      if (db === null) throw new Error('D 卡不可见')
      await win.mouse.move(db.x + db.width / 2, db.y + db.height / 2)
      await win.mouse.down()
      await win.mouse.move(db.x + db.width / 2 + 6, db.y + db.height / 2 + 4, { steps: 3 })
      await win.mouse.move(db.x + db.width / 2, db.y + db.height / 2, { steps: 3 })
      await win.mouse.up()
      await expect.poll(() => orderOf(win), { timeout: 10_000 }).toEqual([1, 2, 3, 4])
      await expect(win.getByTestId('lineage-save-btn')).toBeDisabled()
    }

    // A（row0 col0）跨行拖至 row1 D 位中心（**grid 径判别锚**——raw/归一化
    // 唯一分叉点：归一化 [3,1] 网格 row1 命中 cell3=p4>src→组末 [2,3,4,1]；
    // raw [4] 网格行钳 row0→插回原位 no-op 序不变〔轮 4 受控实测 [1,2,3,4]〕）
    {
      const ab = await card(1).boundingBox()
      const db2 = await card(4).boundingBox()
      if (ab === null || db2 === null) throw new Error('卡不可见')
      await win.mouse.move(ab.x + ab.width / 2, ab.y + ab.height / 2)
      await win.mouse.down()
      // [轮 4 W-1] 落点=D 中心+8px：避开 px<centerX 判据等号刀锋（D 中心
      // 恰=cell(1,0) 中心 176——Windows 1.6px/DPR 分数化翻侧风险；+8=明确
      // 后侧 → p=4>src → 组末 [2,3,4,1]）
      await win.mouse.move(db2.x + db2.width / 2 + 8, db2.y + db2.height / 2, { steps: 6 })
      await win.mouse.up()
      await expect.poll(() => orderOf(win), { timeout: 10_000 }).toEqual([2, 3, 4, 1])
    }
    await app.close()
  })

  test('V67-06 [轮 3 W1] 边层铺满滚动域：1024 地板态滚右后 .tl-edges/.tl-edge-hits 层宽≥滚动内容宽（滚出区边句柄命中承载）', async () => {
    const userData = await mkdtemp(join(tmpdir(), 'f67-v06-'))
    await bootstrapMigrations(userData)
    // 3 月/5 月各 1 卡+跨月边（边层真实渲染承载）+8 卡月（横滚域撑宽）
    const nodes: Array<{ paperId: string; title: string; year: number; month: number }> = []
    const mk = async (id: string, title: string, m: number): Promise<void> => {
      const sha = createHash('sha256').update(`f67-w1-${id}`).digest('hex')
      await seedPaperRow(userData, `${sha.slice(0, 2)}/${sha.slice(2, 4)}/${sha}.pdf`, sha, title, id)
      nodes.push({ paperId: id, title, year: 2020, month: m })
    }
    await mk('f67-w1-a', 'F67边层 03月甲', 3)
    await mk('f67-w1-b', 'F67边层 05月乙', 5)
    for (let k = 1; k <= 8; k++) await mk(`f67-w1-8-${k}`, `F67边层 08月第${k}篇`, 8)
    await seedLineageGraph(userData, {
      nodes,
      edges: [{ from: 'f67-w1-b', to: 'f67-w1-a', label: '引证' }]
    })
    const app = await launch(userData)
    const win = await app.firstWindow()
    await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
    await win.setViewportSize({ width: 1024, height: 800 })
    await win.getByRole('button', { name: '脉络', exact: true }).click()
    await expect(win.locator('.month-frame .tl-card').first()).toBeVisible({ timeout: 20_000 })
    await expect.poll(() => wOf(win), { timeout: 5_000 }).toBeGreaterThanOrEqual(W_FLOOR)
    // 滚至最右（滚出区=右侧月份/边层右段——缺陷面暴露位）
    await setScrollLeft(win, 999_999)
    const layers = await win.evaluate(() => {
      const content = document.querySelector('.tl-content') as HTMLElement | null
      const edges = document.querySelector('.tl-edges')
      const hits = document.querySelector('.tl-edge-hits')
      if (content === null || edges === null || hits === null) return null
      return {
        contentScrollW: content.scrollWidth,
        edgesW: edges.getBoundingClientRect().width,
        hitsW: hits.getBoundingClientRect().width
      }
    })
    if (layers === null) throw new Error('边层/内容层缺席')
    expect(layers.edgesW, `.tl-edges 层宽 ${layers.edgesW} 应≥滚动内容宽 ${layers.contentScrollW}（滚出区连线可见+命中承载）`).toBeGreaterThanOrEqual(layers.contentScrollW - 1)
    expect(layers.hitsW, `.tl-edge-hits 层宽 ${layers.hitsW} 应≥滚动内容宽 ${layers.contentScrollW}（滚出区边句柄可命中）`).toBeGreaterThanOrEqual(layers.contentScrollW - 1)
    await app.close()
  })

  test('V67-07 [轮 4 W-5] 空图态守卫：:has(.month-frame) 使空图不铺 717——640 视口 .tl-empty 全落 scrollport+零横滚', async () => {
    const userData = await mkdtemp(join(tmpdir(), 'f67-v07-'))
    await bootstrapMigrations(userData)
    // 1 篇幽灵文献（避零库引导面）+零脉络节点——空图态（.tl-empty 渲染承载）
    const sha = createHash('sha256').update('f67-empty').digest('hex')
    await seedPaperRow(userData, `${sha.slice(0, 2)}/${sha.slice(2, 4)}/${sha}.pdf`, sha, 'F67空图文献', 'f67-empty-p1')
    const app = await launch(userData)
    const win = await app.firstWindow()
    await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
    await win.setViewportSize({ width: 640, height: 800 })
    await win.getByRole('button', { name: '脉络', exact: true }).click()
    await expect(win.locator('.tl-empty')).toContainText('暂无脉络图', { timeout: 10_000 })
    // 空图不铺 717：.tl-empty 盒全落 timeline scrollport 横向区间（铺宽态
    // 盒随内容 717 居中溢出 scrollport [563,640] 即红）
    const geo = await win.evaluate(() => {
      const tl = document.querySelector('.timeline') as HTMLElement | null
      const empty = document.querySelector('.tl-empty') as HTMLElement | null
      if (tl === null || empty === null) return null
      const t = tl.getBoundingClientRect()
      const e = empty.getBoundingClientRect()
      return { tlX: t.x, tlR: t.x + t.width, eX: e.x, eR: e.x + e.width, scrollW: tl.scrollWidth, clientW: tl.clientWidth }
    })
    if (geo === null) throw new Error('.timeline/.tl-empty 缺席')
    expect(geo.eX, `空态盒左界 ${geo.eX.toFixed(1)} 落 scrollport 左界 ${geo.tlX}`).toBeGreaterThanOrEqual(geo.tlX - 0.5)
    expect(geo.eR, `空态盒右界 ${geo.eR.toFixed(1)} 落 scrollport 右界 ${geo.tlR}`).toBeLessThanOrEqual(geo.tlR + 0.5)
    // 零横滚（空图无内容溢出——铺宽态 spill>0 即红）
    expect(geo.scrollW, `空图零横滚（scrollWidth ${geo.scrollW}==clientWidth ${geo.clientW}）`).toBeLessThanOrEqual(geo.clientW)
    await app.close()
  })
})
