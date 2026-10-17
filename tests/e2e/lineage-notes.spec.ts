// b3: P7-H
/**
 * [F-VISFB-63] 悬浮笔记冒烟 e2e（62 号裁决部 ⑤-1 采纳——新 UI 零真浏览器面：
 * effectiveScale 真实换算/柄 hit-area/皮肤渲染由本 spec 承载）。断言一律
 * 真实文本（宪法 e2e 红线）。
 * [S6] 分工申报：uiScale=1 档（small 默认）使 sEff≡z——u 因子由 timeline-zoom
 * 单测承载（clientToOwnPt 两因子单源面，本 spec 不重复）；皮肤渲染锚=N1
 * computed-style（.tl-note 面板底非透明=token 生效证据）。
 *
 * 用例组：
 * - N1 创建→编辑→blur 收口→真文本→保存→reload 持久（右键空白 .tl-content
 *   空白处〔目标不在 .tl-card/.tl-edge-hit(s)/.tl-note 上〕→菜单「新建悬浮
 *   笔记」→textarea 输入→点空白 blur 收口→.tl-note-text 显真文本）；
 * - N2 书签柄拖动位移→保存→reload 位置持久（boundingBox+mouse 三段——
 *   先 scrollIntoView，F-CIFLK-01 CI 窄视口先例）；
 * - N3 draft 视图切换收口链（编辑不 blur→rail 切走再切回→.tl-note-text=
 *   草稿内容→保存→reload 持久）→笔记右键「删除笔记」→消失→保存→reload
 *   后无。
 * 种子=e2e-env.seedLineageGraph（单节点锚）+seedPaperRow 幽灵行；
 * mode=lineage-mode-edit+tool=lineage-tool-select（lineage.spec.ts:207 先例）。
 */
import { test, expect, type Page } from '@playwright/test'
import { createHash } from 'node:crypto'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { bootstrapMigrations, launch, seedLineageGraph, seedPaperRow } from './e2e-env'

const PAPER = { id: 'e2e-nt-root', title: '笔记锚文献', year: 2020 } as const

/** 种子：单节点锚（幽灵文献行+图节点直写——launch 前子进程落库） */
async function seedAll(userData: string): Promise<void> {
  const sha = createHash('sha256').update(`nt-ghost-${PAPER.id}`).digest('hex')
  const fileRef = `${sha.slice(0, 2)}/${sha.slice(2, 4)}/${sha}.pdf`
  await seedPaperRow(userData, fileRef, sha, PAPER.title, PAPER.id, { year: PAPER.year })
  await seedLineageGraph(userData, {
    nodes: [{ paperId: PAPER.id, title: PAPER.title, year: PAPER.year }],
    edges: []
  })
}

/** reload 后回脉络视图并等锚节点在场（lineage.spec reloadToLineage 同型） */
async function reloadToLineage(win: Page): Promise<void> {
  await win.reload()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
  await win.getByRole('button', { name: '脉络', exact: true }).click()
  await expect(win.locator('.tl-card[data-node-id]').filter({ hasText: PAPER.title })).toBeVisible({
    timeout: 10_000
  })
}

/** 独立数据目录+建库迁移+种子（每用例隔离） */
async function freshDir(): Promise<string> {
  const userData = await mkdtemp(join(tmpdir(), 'synapse-nt63-'))
  await bootstrapMigrations(userData)
  await seedAll(userData)
  return userData
}

/** 进脉络编辑态（edit 模式+select 工具——笔记交互门） */
async function enterEditSelect(win: Page): Promise<void> {
  await expect(win.locator('.tl-card[data-node-id]').filter({ hasText: PAPER.title })).toBeVisible({
    timeout: 10_000
  })
  await win.getByTestId('lineage-mode-edit').click()
  await win.getByTestId('lineage-tool-select').click()
}

/** 右键空白创建笔记并输入文本（不 blur——收口交调用面） */
async function createNoteTyping(win: Page, text: string): Promise<void> {
  const content = win.locator('.tl-content')
  const cb = await content.boundingBox()
  if (cb === null) throw new Error('内容层不可见')
  await content.click({ button: 'right', position: { x: cb.width - 60, y: cb.height - 60 } })
  const menu = win.getByTestId('note-anchor-menu')
  await expect(menu).toBeVisible({ timeout: 5_000 })
  await menu.getByRole('menuitem', { name: '新建悬浮笔记' }).click()
  await win.locator('.tl-note-input').fill(text)
}

/** 点空白（左键）触发 textarea blur 收口 */
async function clickBlank(win: Page): Promise<void> {
  const content = win.locator('.tl-content')
  const cb = await content.boundingBox()
  if (cb === null) throw new Error('内容层不可见')
  await content.click({ position: { x: 40, y: 40 } })
}

test.describe('悬浮笔记冒烟 e2e（F-VISFB-63——创建/拖动/删除全链真浏览器）', () => {
  test('N1 右键空白创建→输入真文本→blur 收口→保存→reload 仍在', async () => {
    const userData = await freshDir()
    const app = await launch(userData)
    const win = await app.firstWindow()
    await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
    await win.getByRole('button', { name: '脉络', exact: true }).click()
    await enterEditSelect(win)
    await createNoteTyping(win, '悬浮笔记正文甲')
    await clickBlank(win)
    await expect(win.locator('.tl-note-text')).toHaveText('悬浮笔记正文甲')
    // [S6] 皮肤渲染锚：.tl-note 面板底 token 生效（computed 非透明）
    const noteBg = await win.locator('.tl-note').evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(noteBg).not.toBe('rgba(0, 0, 0, 0)')
    await expect(win.getByTestId('lineage-save-btn')).toBeEnabled({ timeout: 10_000 })
    await win.getByTestId('lineage-save-btn').click()
    await expect(win.getByTestId('lineage-save-btn')).toBeDisabled({ timeout: 10_000 })
    await reloadToLineage(win)
    await expect(win.locator('.tl-note-text')).toHaveText('悬浮笔记正文甲')
    await app.close()
  })

  test('N2 书签柄拖动位移（非 1 缩放真实换算）→保存→reload 位置持久', async () => {
    const userData = await freshDir()
    const app = await launch(userData)
    const win = await app.firstWindow()
    await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
    await win.getByRole('button', { name: '脉络', exact: true }).click()
    await enterEditSelect(win)
    await createNoteTyping(win, '拖动笔记正文')
    await clickBlank(win)
    const note = win.locator('.tl-note')
    const before = await note.evaluate((el) => ({ left: el.style.left, top: el.style.top }))
    // [R2] ctrl+滚轮缩放三档（步 10%：1.0→1.3——deltaY<0=zoom in，zoom-hook :42）
    const timeline = win.locator('.timeline')
    const tb = await timeline.boundingBox()
    if (tb === null) throw new Error('滚动容器不可见')
    await win.mouse.move(tb.x + 40, tb.y + 40)
    await win.keyboard.down('Control')
    await win.mouse.wheel(0, -100)
    await win.mouse.wheel(0, -100)
    await win.mouse.wheel(0, -100)
    await win.keyboard.up('Control')
    // 实测有效缩放（rect.width/offsetWidth=z×uiScale——runtime 无需拆分两因子）
    const sEff = await win.locator('.tl-content').evaluate((el) => {
      const rect = el.getBoundingClientRect()
      return rect.width / (el as HTMLElement).offsetWidth
    })
    expect(sEff).toBeGreaterThan(1.05)
    const grip = win.locator('.tl-note-grip')
    // F-CIFLK-01 CI 窄视口先例：缩放后再锚定（几何随 z 变——scrollIntoView 于终态）
    await grip.evaluate((el) => el.scrollIntoView({ block: 'center' }))
    const gb = await grip.boundingBox()
    if (gb === null) throw new Error('书签柄不可见')
    // 向左上拖（创建点钳在右下角——右下方向会被内容域钳回同值=零位移）
    await win.mouse.move(gb.x + gb.width / 2, gb.y + gb.height / 2)
    await win.mouse.down()
    await win.mouse.move(gb.x + gb.width / 2 - 60, gb.y + gb.height / 2 - 40, { steps: 6 })
    await win.mouse.up()
    const after = await note.evaluate((el) => ({ left: el.style.left, top: el.style.top }))
    // own 域位移=clientΔ/s_eff（clientToOwnPt 单源换算——漏除/错乘必红）
    const dLeft = Number.parseFloat(after.left) - Number.parseFloat(before.left)
    const dTop = Number.parseFloat(after.top) - Number.parseFloat(before.top)
    expect(Math.abs(dLeft - -60 / sEff)).toBeLessThan(3)
    expect(Math.abs(dTop - -40 / sEff)).toBeLessThan(3)
    await expect(win.getByTestId('lineage-save-btn')).toBeEnabled({ timeout: 10_000 })
    await win.getByTestId('lineage-save-btn').click()
    await expect(win.getByTestId('lineage-save-btn')).toBeDisabled({ timeout: 10_000 })
    await reloadToLineage(win)
    const persisted = await win.locator('.tl-note').evaluate((el) => ({ left: el.style.left, top: el.style.top }))
    expect(persisted).toEqual(after)
    await expect(win.locator('.tl-note-text')).toHaveText('拖动笔记正文')
    await app.close()
  })

  test('N3 编辑不 blur 切换往返草稿保留→右键删除→保存→reload 后无', async () => {
    const userData = await freshDir()
    const app = await launch(userData)
    const win = await app.firstWindow()
    await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
    await win.getByRole('button', { name: '脉络', exact: true }).click()
    await enterEditSelect(win)
    await createNoteTyping(win, '切换收口草稿')
    // 编辑不 blur：rail 切走再切回（F-VISFB-63 fire-first/blur 两径收敛——草稿不丢；
    // 进页缺省 browse〔resetForMount P-1〕——回切后经产品路径再进 edit 态保存）
    await win.getByRole('button', { name: '文献库' }).click()
    await win.getByRole('button', { name: '脉络', exact: true }).click()
    await expect(win.locator('.tl-note-text')).toHaveText('切换收口草稿')
    await win.getByTestId('lineage-mode-edit').click()
    await win.getByTestId('lineage-tool-select').click()
    await expect(win.getByTestId('lineage-save-btn')).toBeEnabled({ timeout: 10_000 })
    await win.getByTestId('lineage-save-btn').click()
    await expect(win.getByTestId('lineage-save-btn')).toBeDisabled({ timeout: 10_000 })
    await reloadToLineage(win)
    await expect(win.locator('.tl-note-text')).toHaveText('切换收口草稿')
    // 删除链：回编辑态→笔记右键「删除笔记」→消失→保存→reload 后无
    await enterEditSelect(win)
    await win.locator('.tl-note').click({ button: 'right' })
    const menu = win.getByTestId('note-anchor-menu')
    await expect(menu).toBeVisible({ timeout: 5_000 })
    await menu.getByRole('menuitem', { name: '删除笔记' }).click()
    await expect(win.locator('.tl-note')).toHaveCount(0)
    await expect(win.getByTestId('lineage-save-btn')).toBeEnabled({ timeout: 10_000 })
    await win.getByTestId('lineage-save-btn').click()
    await expect(win.getByTestId('lineage-save-btn')).toBeDisabled({ timeout: 10_000 })
    await reloadToLineage(win)
    await expect(win.locator('.tl-note')).toHaveCount(0)
    await app.close()
  })
})
