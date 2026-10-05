import { test, expect } from '@playwright/test'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { TAG_COLOR_PRESETS } from '../../src/shared/constants'
import { bootstrapMigrations, launch, seedPaperRow } from './e2e-env'

/**
 * [P7E-01→F-UIRES-01 批 A U3→批 tagrows→F-UIRES-03 B1 2026-10-05] 标签生命
 * 周期 e2e（B1 批：行内「编辑」钮=唯一编辑入口——名称 input+色点阵+「保存」
 * 钮；右键菜单/TagRenameDialog/TagColorDialog/TagColorPopover 四件退役；
 * 头部新增全选框（三态）+「删除」danger 钮→确认窗批量删除链）。
 *
 * 链路：种子两篇（甲挂双标签/乙挂单标签）→UI 打标签→勾选框（role=checkbox）
 * 选中→行「编辑」→改名（行名与 PaperRow 徽标真实文本更新；id 稳定筛选不动）
 * →色点阵取色（预设圆点→保存→面板行 chip 着色）→删除链（勾选→确认窗列名
 * →确认→行消失+徽标消失+筛选自愈全列表）。全程断言渲染真实文本。
 * 行容器=.lib-dd-row（[勾选框][椭圆 chip][mono 计数][「编辑」钮]）。
 */
test('标签生命周期（B1 编辑态+删除链）：编辑钮改名/取色→行/徽标真文本更新+确认窗批量删除', async () => {
  const userData = await mkdtemp(join(tmpdir(), 'synapse-p7e-'))

  // 第一跳：应用自建库表（workspaces.spec 同配方——不 import src 内部模块）
  await bootstrapMigrations(userData)

  // 两篇种子（只列行不开阅读器——无需真实 PDF 文件；sha 互异避唯一约束）
  const papers = [
    { id: 'e2e-p7e-a', title: 'P7E 甲文献', sha: 'a'.repeat(64) },
    { id: 'e2e-p7e-b', title: 'P7E 乙文献', sha: 'b'.repeat(64) }
  ] as const
  for (const p of papers) {
    const fileRef = `${p.sha.slice(0, 2)}/${p.sha.slice(2, 4)}/${p.sha}.pdf`
    await seedPaperRow(userData, fileRef, p.sha, p.title, p.id)
  }

  const app = await launch(userData)
  const win = await app.firstWindow()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })

  // —— UI 打标签：甲=「水治」（错拼）+「核心」；乙=「水质」 ——
  const tagInput = win.getByLabel('新增标签')
  async function tagPaper(title: string, ...names: string[]): Promise<void> {
    await win.getByText(title).first().click()
    for (const name of names) {
      await tagInput.fill(name)
      await tagInput.press('Enter')
      // 已挂接 chip 的 × 按钮出现（aria-label 锚——Enter→upsert+attach→
      // onChanged 重读完成锚）
      await expect(win.getByLabel(`移除标签 ${name}`)).toBeVisible({ timeout: 10_000 })
    }
  }
  await tagPaper('P7E 甲文献', '水治', '核心')
  await tagPaper('P7E 乙文献', '水质')

  // 视图切换强制 LibraryPage 卸载/重挂→TagDropdown refresh（数据就位——
  // TagEditor 的 upsert 路径不刷新 tags.store，挂载 refresh 是既有契约）
  await win.getByRole('button', { name: '脉络', exact: true }).click()
  await win.getByRole('button', { name: '文献库' }).click()
  await win.locator('.lib-dd-btn').click()
  const panel = win.locator('.lib-dd-panel')
  await expect(panel).toBeVisible({ timeout: 10_000 })
  // 行全文正则锚「名+计数+编辑」（B1 行常态文本形）
  const rowOfExactName = (name: string) =>
    panel.locator('.lib-dd-row').filter({ hasText: new RegExp(`^${name}\\d+编辑$`) })

  // —— 改名：勾选「水治」（筛选在场——改名的对照面）→行「编辑」→「水质监测」 ——
  await rowOfExactName('水治').getByRole('checkbox').click()
  const rowA = win.locator('.lib-row', { hasText: 'P7E 甲文献' })
  await expect(rowA.locator('.lib-t-mini', { hasText: '水治' })).toHaveCount(1)
  await rowOfExactName('水治').locator('.lib-dd-edit-btn').click()
  const renameInput = panel.getByLabel('重命名标签：水治')
  await expect(renameInput).toHaveValue('水治') // 预填现名
  await renameInput.fill('水质监测')
  await panel.getByRole('button', { name: '保存' }).click()
  // 面板行更新（store 链式 refresh）；错拼名行消失
  await expect(rowOfExactName('水质监测')).toBeVisible({ timeout: 10_000 })
  await expect(panel.locator('.lib-dd-row').filter({ hasText: '水治' })).toHaveCount(0)
  // PaperRow 徽标真实文本更新（onMutated→library load）
  await expect(rowA.locator('.lib-t-mini', { hasText: '水质监测' })).toHaveCount(1)
  await expect(rowA.locator('.lib-t-mini', { hasText: '水治' })).toHaveCount(0)
  // S5：id 稳定——筛选不动，甲行仍在筛选结果内
  await expect(rowA).toBeVisible()

  // —— 颜色：行「水质」编辑→预设圆点→保存→面板行 chip 着色 ——
  // [RR1-16/e2e F6] 「水质」hasText 撞「水质监测」——行全文正则锚区分
  await rowOfExactName('水质').locator('.lib-dd-edit-btn').click()
  const colorEdit = panel.getByLabel('重命名标签：水质')
  await expect(colorEdit).toHaveValue('水质')
  await panel.getByLabel(`预设颜色 ${TAG_COLOR_PRESETS[0]}`).click()
  await panel.getByRole('button', { name: '保存' }).click()
  await expect(rowOfExactName('水质')).toBeVisible({ timeout: 10_000 })
  // chip 着色（真 Chromium 计算样式：#e11d48+18% alpha → rgba 三元组）
  const preset = TAG_COLOR_PRESETS[0]
  const rgb = [1, 3, 5].map((i) => parseInt(preset.slice(i, i + 2), 16)).join(', ')
  const chip = rowOfExactName('水质').locator('.lib-dd-chip')
  await expect
    .poll(async () => chip.evaluate((el) => getComputedStyle(el).backgroundColor))
    .toContain(rgb)

  // —— 删除链（B1 新增）：先退改名步骤的旧筛选勾→勾选「核心」→头部「删除」
  // →确认窗列名（=勾选集）→确认→行/徽标消失 ——
  await rowOfExactName('水质监测').getByRole('checkbox').click() // 退选
  await rowOfExactName('核心').getByRole('checkbox').click()
  await panel.getByRole('button', { name: '删除已选标签' }).click()
  const confirmDialog = win.getByRole('dialog')
  await expect(confirmDialog).toBeVisible()
  await expect(confirmDialog.getByText('核心')).toBeVisible() // 确认窗列名清单
  await expect(confirmDialog.getByText('水质监测')).toHaveCount(0) // 清单=勾选集（负锚）
  await confirmDialog.getByRole('button', { name: '删除', exact: true }).click()
  await expect(confirmDialog).toBeHidden({ timeout: 10_000 })
  await expect(panel.locator('.lib-dd-row').filter({ hasText: '核心' })).toHaveCount(0)
  // paper_tags 级联：甲行「核心」徽标真实消失（onMutated→library load）
  await expect(rowA.locator('.lib-t-mini', { hasText: '核心' })).toHaveCount(0, { timeout: 10_000 })
  await expect(rowA.locator('.lib-t-mini', { hasText: '水质监测' })).toHaveCount(1)
  // INV-53 自愈：被删 id 从筛选集剔除→空选集收敛 undefined→全列表回归
  await expect(win.locator('.lib-row')).toHaveCount(2, { timeout: 10_000 })

  await app.close()
})

/**
 * [批 tagrows RR1-B1→F-UIRES-03 B1] 行编辑态 e2e（真实浏览器面——jsdom
 * fireEvent.click 不移焦，保存钮×失焦竞态结构性检不出，须真鼠标 mousedown
 * 夺焦路径）：点「编辑」钮→行内 input（预填现名）→改值→鼠标点「保存」钮→
 * 保存生效（行名+PaperRow 徽标真文本=onMutated 刷新链）且不回滚；Enter=保存
 * 变体。
 */
test('标签行编辑态（B1）：编辑钮→保存钮保存不回滚+Enter 保存', async () => {
  const userData = await mkdtemp(join(tmpdir(), 'synapse-tagrows-'))
  await bootstrapMigrations(userData)
  const sha = 'a'.repeat(64)
  await seedPaperRow(userData, `${sha.slice(0, 2)}/${sha.slice(2, 4)}/${sha}.pdf`, sha, 'tagrows 甲文献', 'e2e-tagrows-a')

  const app = await launch(userData)
  const win = await app.firstWindow()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })

  // UI 打两标签（保存钮路与 Enter 路各一）
  const tagInput = win.getByLabel('新增标签')
  await win.getByText('tagrows 甲文献').first().click()
  for (const name of ['原名', '二名']) {
    await tagInput.fill(name)
    await tagInput.press('Enter')
    await expect(win.getByLabel(`移除标签 ${name}`)).toBeVisible({ timeout: 10_000 })
  }
  // 视图切换强制 LibraryPage 卸载/重挂→TagDropdown refresh（数据就位——既有契约）
  await win.getByRole('button', { name: '脉络', exact: true }).click()
  await win.getByRole('button', { name: '文献库' }).click()
  await win.locator('.lib-dd-btn').click()
  const panel = win.locator('.lib-dd-panel')
  await expect(panel).toBeVisible({ timeout: 10_000 })
  const rowOfExactName = (name: string) =>
    panel.locator('.lib-dd-row').filter({ hasText: new RegExp(`^${name}\\d+编辑$`) })

  // —— 保存钮路：真鼠标点击（mousedown 夺焦竞态面——失焦=恢复防线与保存钮的边界）——
  await rowOfExactName('原名').locator('.lib-dd-edit-btn').click()
  const edit = panel.getByLabel('重命名标签：原名')
  await expect(edit).toHaveValue('原名') // 预填现名
  await edit.fill('新名甲')
  await panel.getByRole('button', { name: '保存' }).click()
  const rowNew = rowOfExactName('新名甲')
  await expect(rowNew).toBeVisible({ timeout: 10_000 })
  await expect(panel.locator('.lib-dd-row').filter({ hasText: '原名' })).toHaveCount(0)
  // onMutated 刷新链：PaperRow 徽标真实文本更新
  await expect(win.locator('.lib-t-mini', { hasText: '新名甲' })).toHaveCount(1, { timeout: 10_000 })
  await expect(win.locator('.lib-t-mini', { hasText: '原名' })).toHaveCount(0)
  // 不回滚（B1 竞态负锚：真浏览器失焦路径若失守，blur 恢复会即时回旧名——
  // 600ms 后复断言仍为新名，corpus-export waitForTimeout 先例口径）
  await win.waitForTimeout(600)
  await expect(rowNew).toBeVisible()
  await expect(panel.locator('.lib-dd-row').filter({ hasText: '原名' })).toHaveCount(0)

  // —— Enter 路变体（第二标签）——
  await rowOfExactName('二名').locator('.lib-dd-edit-btn').click()
  const edit2 = panel.getByLabel('重命名标签：二名')
  await edit2.fill('新名乙')
  await edit2.press('Enter')
  await expect(rowOfExactName('新名乙')).toBeVisible({ timeout: 10_000 })
  await expect(panel.locator('.lib-dd-row').filter({ hasText: '二名' })).toHaveCount(0)

  await app.close()
})
