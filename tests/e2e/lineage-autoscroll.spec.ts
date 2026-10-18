/**
 * [F-VISFB-66 裁定 4] 拖拽自动滚动 e2e（设计书 v1.2 §G/§H.1 自动滚动族）：
 * - AS-01 画线会话：下带触发区滚动（容器 rect 口径——容器偏移注入证「随容器
 *   非视口」）+blur suspend 多帧恒值；
 * - AS-02 卡拖会话（纯 tick 形态）：自动滚动推进+滚动不跳（§G.9 代数断言
 *   逐帧 |cardY−(cursorY+grabOffset)|≤1——W8-a 重测式）+到界停泵（scrollTop
 *   达 max 后稳定）；
 * - AS-03 笔记柄拖+调线换端冒烟（四会话共享机制——两 managed 面冒烟）。
 * CI 视口纪律：显式设 scrollTop（注入高度制造可滚面）+拖拽前 scrollIntoView
 * 滚动锚定（F-CIFLK-01 先例）。always-active。
 */
import { test, expect, type Page } from '@playwright/test'
import { createHash } from 'node:crypto'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { bootstrapMigrations, launch, seedLineageGraph, seedPaperRow } from './e2e-env'

async function seedPapers(userData: string, ids: string[], titles: string[]): Promise<void> {
  for (let i = 0; i < ids.length; i++) {
    const sha = createHash('sha256').update(`as66-${ids[i]}`).digest('hex')
    await seedPaperRow(userData, `${sha.slice(0, 2)}/${sha.slice(2, 4)}/${sha}.pdf`, sha, titles[i]!, ids[i])
  }
}

async function openLineage(win: Page, firstTitle: string): Promise<void> {
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
  await win.setViewportSize({ width: 1280, height: 860 })
  await win.getByRole('button', { name: '脉络', exact: true }).click()
  await expect(win.locator('.tl-card').first()).toContainText(firstTitle, { timeout: 10_000 })
}

/** 注入可滚面+读滚动几何（T1 先例：head <style> 注入——非产品面探针） */
async function injectScrollDomain(win: Page): Promise<void> {
  await win.evaluate(() => {
    const el = document.getElementById('e2e-as-domain')
    el?.remove()
    const style = document.createElement('style')
    style.id = 'e2e-as-domain'
    style.textContent = '.tl-content { min-height: 2400px !important }'
    document.head.append(style)
  })
}

const scrollTopOf = (win: Page): Promise<number> =>
  win.locator('.timeline').evaluate((el) => el.scrollTop)

const timelineRect = (win: Page): Promise<{ top: number; bottom: number; h: number }> =>
  win.locator('.timeline').evaluate((el) => {
    const r = el.getBoundingClientRect()
    return { top: r.top, bottom: r.bottom, h: r.height }
  })

test.describe('F-VISFB-66 拖拽自动滚动（裁定 4——容器 20% 触发区/Word 式）', () => {
  test('AS-01 画线会话：下带触发区滚动（容器口径——偏移注入证随容器非视口）+blur suspend 多帧恒值', async () => {
    test.slow()
    const userData = await mkdtemp(join(tmpdir(), 'as66-01-'))
    await bootstrapMigrations(userData)
    await seedPapers(userData, ['as-a', 'as-b'], ['滚动甲', '滚动乙'])
    await seedLineageGraph(userData, {
      nodes: [
        { paperId: 'as-a', title: '滚动甲', year: 2020, month: 5, slot: 1 },
        { paperId: 'as-b', title: '滚动乙', year: 2020, month: 5, slot: 2 }
      ],
      edges: []
    })
    const app = await launch(userData)
    const win = await app.firstWindow()
    await openLineage(win, '滚动甲')
    await injectScrollDomain(win)
    // 容器偏移注入：上移 120px+底收 120px——容器下带起界显著高于视口下带起界
    // （两域分离带出现——W-06r2 判据「触发区随容器非视口」的构造前提）
    await win.evaluate(() => {
      const el = document.getElementById('e2e-as-offset')
      el?.remove()
      const style = document.createElement('style')
      style.id = 'e2e-as-offset'
      style.textContent = '.timeline { margin-top: 120px !important; height: calc(100% - 240px) !important }'
      document.head.append(style)
    })
    await win.getByTestId('lineage-mode-edit').click()
    await win.getByTestId('lineage-tool-solid').click()
    const card = win.locator('.tl-card', { hasText: '滚动甲' }).first()
    const rb = await card.boundingBox()
    if (rb === null) throw new Error('源卡不可见')
    // 进入画线拖拽会话（按下源卡右中锚）
    await win.mouse.move(rb.x + rb.width - 2, rb.y + rb.height / 2)
    await win.mouse.down()
    // [R13] 坐标域前置不等式：采样点在容器触发区内（bottom−40 < bottom−zone）
    // 且在视口触发区外（viewportBottom−y > 视口 20% 高——两域分离=容器口径直证）
    // [S17] 域判据 clientHeight 同源（模块 zone=clientHeight×20%——非 rect.h）
    const tr = await timelineRect(win)
    const ch = await win.locator('.timeline').evaluate((el) => el.clientHeight)
    const vp = await win.evaluate(() => ({ h: window.innerHeight }))
    const zoneY = tr.bottom - 90
    expect(zoneY, `前置：采样点在容器触发区内（${Math.round(zoneY)} > containerBottom−zone=${Math.round(tr.bottom - ch * 0.2)}）`).toBeGreaterThan(tr.bottom - ch * 0.2)
    expect(vp.h - zoneY, `前置：采样点在视口触发区外（距视口底 ${Math.round(vp.h - zoneY)}px > 视口 20%=${Math.round(vp.h * 0.2)}px）`).toBeGreaterThan(vp.h * 0.2)
    await win.mouse.move(600, zoneY, { steps: 4 })
    await expect.poll(async () => await scrollTopOf(win), { timeout: 8_000 }).toBeGreaterThan(0)
    // blur 后多帧恒值（两采样点间隔 200ms——画线会话 blur 同时中止会话〔abort
    // 拆 listener〕，恒值由 suspend 阀+会话中止共同保证；**suspend 阀双向直证
    // 在 AS-02 卡拖会话承载**〔卡拖无 blur 自中止——纯阀观测面，R13 裁定〕）
    await win.evaluate(() => {
      window.dispatchEvent(new Event('blur'))
    })
    await win.waitForTimeout(200)
    const s1 = await scrollTopOf(win)
    await win.waitForTimeout(300)
    const s2 = await scrollTopOf(win)
    expect(Math.abs(s2 - s1), 'AS-01 blur 后多帧恒值（suspend 阀+会话中止）').toBeLessThanOrEqual(1)
    await win.mouse.up() // 收尾（取消径——光标在非锚区）
    await app.close()
  })

  test('AS-02 卡拖会话（纯 tick）：自动滚动推进+滚动不跳（grabOffset 代数逐帧 ≤1px）+到界停泵', async () => {
    test.slow()
    const userData = await mkdtemp(join(tmpdir(), 'as66-02-'))
    await bootstrapMigrations(userData)
    await seedPapers(userData, ['as-c'], ['拖滚甲'])
    await seedLineageGraph(userData, {
      nodes: [{ paperId: 'as-c', title: '拖滚甲', year: 2020, month: 5, slot: 1 }],
      edges: []
    })
    const app = await launch(userData)
    const win = await app.firstWindow()
    await openLineage(win, '拖滚甲')
    await injectScrollDomain(win)
    await win.getByTestId('lineage-mode-edit').click()
    const card = win.locator('.tl-card', { hasText: '拖滚甲' }).first()
    await card.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }))
    const rb = await card.boundingBox()
    if (rb === null) throw new Error('卡不可见')
    await win.mouse.move(rb.x + rb.width / 2, rb.y + rb.height / 2)
    await win.mouse.down()
    const tr = await timelineRect(win)
    const cursorY = tr.bottom - 30
    await win.mouse.move(rb.x + rb.width / 2, cursorY, { steps: 6 })
    await expect.poll(async () => await scrollTopOf(win), { timeout: 8_000 }).toBeGreaterThan(0)
    // 滚动不跳（§G.9 代数断言逐帧——[R13] 页内 rAF 采样器逐滚动帧记录：
    // grabOffset=cardScreenY−cursorClientY 同刻采样〔单次 boundingBox 解构〕；
    // 每滚动帧 |cardY−(cursorY+grab0)|≤1）
    const cb0 = await card.boundingBox()
    if (cb0 === null) throw new Error('滚动帧卡不可见')
    const grab0 = cb0.y + cb0.height / 2 - cursorY // 同刻采样（单次解构）
    await win.evaluate(() => {
      const samples: number[] = []
      let lastTop = -1
      const card = document.querySelector('.tl-card[data-node-id]') as HTMLElement | null
      if (card === null) throw new Error('AS-02 页内采样器：卡不在场')
      const frame = (): void => {
        const r = card.getBoundingClientRect()
        const top = document.querySelector('.timeline')!.scrollTop
        if (top !== lastTop) {
          lastTop = top
          samples.push(r.y + r.height / 2) // 滚动帧卡屏位逐帧记录
        }
        if (samples.length < 24) requestAnimationFrame(frame)
        else (window as unknown as { __as02Samples?: number[] }).__as02Samples = samples
      }
      requestAnimationFrame(frame)
    })
    await expect
      .poll(async () => await win.evaluate(() => (window as unknown as { __as02Samples?: number[] }).__as02Samples?.length ?? 0), { timeout: 8_000 })
      .toBeGreaterThanOrEqual(8)
    const samples = await win.evaluate(() => (window as unknown as { __as02Samples?: number[] }).__as02Samples ?? [])
    for (let i = 0; i < samples.length; i++) {
      expect(Math.abs(samples[i]! - (cursorY + grab0)), `AS-02 滚动帧 ${i}（页内 rAF 采样）：卡屏位=cursor+grabOffset ±1`).toBeLessThanOrEqual(1)
    }
    // [R13] suspend 阀双向直证（卡拖会话无 blur 自中止——纯阀观测面）：
    // blur→多帧恒值；focus→同驻留光标复滚（非单向死锁）
    await win.evaluate(() => {
      window.dispatchEvent(new Event('blur'))
    })
    await win.waitForTimeout(250)
    const frozen1 = await scrollTopOf(win)
    await win.waitForTimeout(250)
    const frozen2 = await scrollTopOf(win)
    expect(Math.abs(frozen2 - frozen1), 'AS-02 blur 后多帧恒值（suspend 阀直证——会话在场）').toBeLessThanOrEqual(1)
    await win.evaluate(() => {
      window.dispatchEvent(new Event('focus'))
    })
    await expect
      .poll(async () => await scrollTopOf(win), { timeout: 8_000 })
      .toBeGreaterThan(frozen2 + 1)
    // 到界停泵：光标驻留至 scrollTop=max 后稳定（不再增长）
    await win.mouse.move(rb.x + rb.width / 2, tr.bottom - 10, { steps: 3 })
    await expect
      .poll(async () => await scrollTopOf(win), { timeout: 12_000 })
      .toBe(await win.locator('.timeline').evaluate((el) => el.scrollHeight - el.clientHeight))
    const atMax = await scrollTopOf(win)
    await win.waitForTimeout(400)
    expect(await scrollTopOf(win)).toBe(atMax)
    await win.mouse.up()
    await app.close()
  })

  test('AS-03 笔记柄拖+调线换端冒烟（四会话共享机制——两 managed 面各一滚）', async () => {
    test.slow()
    const userData = await mkdtemp(join(tmpdir(), 'as66-03-'))
    await bootstrapMigrations(userData)
    await seedPapers(userData, ['as-d', 'as-e'], ['冒烟甲', '冒烟乙'])
    await seedLineageGraph(userData, {
      nodes: [
        { paperId: 'as-d', title: '冒烟甲', year: 2020, month: 5, slot: 1 },
        { paperId: 'as-e', title: '冒烟乙', year: 2020, month: 6, slot: 1 }
      ],
      edges: [{ from: 'as-d', to: 'as-e', label: '' }]
    })
    const app = await launch(userData)
    const win = await app.firstWindow()
    await openLineage(win, '冒烟甲')
    await injectScrollDomain(win)
    // ③a 笔记柄拖：空白右键建笔记（62 号 UI——notes.spec createNoteTyping 同
    // 型）→edit+select→拖柄入下带→滚
    await win.getByTestId('lineage-mode-edit').click()
    const content = win.locator('.tl-content')
    const cb0 = await content.boundingBox()
    if (cb0 === null) throw new Error('内容层不可见')
    await content.click({ button: 'right', position: { x: cb0.width - 60, y: cb0.height - 80 } })
    const menu = win.getByTestId('note-anchor-menu')
    await expect(menu).toBeVisible({ timeout: 5_000 })
    await menu.getByRole('menuitem', { name: '新建悬浮笔记' }).click()
    await win.locator('.tl-note-input').fill('拖滚笔记')
    await content.click({ position: { x: 40, y: 40 } }) // blur 收口
    const grip = win.locator('.tl-note-grip').first()
    await grip.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }))
    const gb = await grip.boundingBox()
    if (gb === null) throw new Error('笔记柄不可见')
    await win.mouse.move(gb.x + gb.width / 2, gb.y + gb.height / 2)
    await win.mouse.down()
    const tr1 = await timelineRect(win)
    await win.mouse.move(gb.x + gb.width / 2, tr1.bottom - 30, { steps: 5 })
    await expect.poll(async () => await scrollTopOf(win), { timeout: 8_000 }).toBeGreaterThan(0)
    await win.mouse.up()
    // ③b 调线换端（edge-drag）：选线→显式置 scrollTop（scrollIntoView 可能
    // 已回滚至 0——向上滚需要正的起点，F-CIFLK-01 视口纪律同族）→拖 from
    // 端柄入上带→向上滚
    await win.locator('.tl-edge-hit').first().evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }))
    await win.locator('.tl-edge-hit').first().click({ force: true })
    await expect(win.getByTestId('edge-handles')).toBeVisible({ timeout: 5_000 })
    // 显式置 scrollTop 在 click 之后（click 自动滚回可能清零——向上滚需正
    // 起点；150=端柄仍视口内的上限值：400 会把顶区边推出视口〔fh.y<0 探针
    // 实证〕——boundingBox+mouse 面要求目标在场）
    await win.locator('.timeline').evaluate((el) => {
      el.scrollTop = Math.min(150, el.scrollHeight - el.clientHeight)
    })
    const fh = await win.locator('[data-testid="edge-handle-end"][data-end="from"]').boundingBox()
    if (fh === null) throw new Error('端柄不可见')
    await win.mouse.move(fh.x + fh.width / 2, fh.y + fh.height / 2)
    await win.mouse.down()
    const tr2 = await timelineRect(win)
    await win.mouse.move(fh.x + fh.width / 2, tr2.top + 30, { steps: 5 })
    const topBefore = await scrollTopOf(win)
    await expect
      .poll(async () => await scrollTopOf(win), { timeout: 8_000 })
      .toBeLessThan(topBefore)
    await win.mouse.up()
    // 收尾保存（会话 dirty——防 quit 拦截）
    const saveBtn = win.getByTestId('lineage-save-btn')
    if (await saveBtn.isEnabled()) {
      await saveBtn.click()
      await expect(saveBtn).toBeDisabled({ timeout: 10_000 })
    }
    await app.close()
  })
})
