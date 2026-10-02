import { test, expect } from '@playwright/test'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { TAG_COLOR_PRESETS } from '../../src/shared/constants'
import { bootstrapMigrations, launch, seedPaperRow } from './e2e-env'

/**
 * [P7E-01→F-UIRES-01 批 A U3] 标签生命周期 e2e（下拉行右键=改名+颜色两件
 * [P-11 用户终裁]；merge/delete UI 入口随批退役——IPC 通道与 main 面零触碰）。
 *
 * 链路：种子两篇（甲挂双标签/乙挂单标签）→UI 打标签→下拉面板行右键改名
 * （TagRenameDialog：行名与 PaperRow 徽标真实文本更新；id 稳定筛选不动）→
 * 颜色（TagColorDialog：预设 swatch→确定→面板行色点着色）。全程断言渲染
 * 真实文本。
 */
test('标签生命周期（两件版）：下拉行右键改名→行/徽标真文本更新+颜色→色点着色', async () => {
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
  const menu = win.getByTestId('tag-menu')

  // —— 改名：行右键「水治」→对话框→「水质监测」（预填现名）——
  // 先选中该筛选（setQuery→load 后行徽标可见——改名的对照面在场）
  await panel.getByRole('menuitemcheckbox').filter({ hasText: '水治' }).click()
  const rowA = win.locator('.lib-row', { hasText: 'P7E 甲文献' })
  await expect(rowA.locator('.lib-t-mini', { hasText: '水治' })).toHaveCount(1)
  await panel.getByRole('menuitemcheckbox').filter({ hasText: '水治' }).click({ button: 'right' })
  await expect(menu).toBeVisible()
  await menu.getByRole('menuitem', { name: '重命名' }).click()
  const dialog = win.getByRole('dialog')
  const renameInput = win.getByLabel('新标签名')
  await expect(renameInput).toHaveValue('水治') // 预填现名
  await renameInput.fill('水质监测')
  await dialog.getByRole('button', { name: '保存' }).click()
  await expect(dialog).toBeHidden({ timeout: 10_000 })
  // 面板行更新（store 链式 refresh）；错拼名行消失
  await expect(panel.getByRole('menuitemcheckbox').filter({ hasText: '水质监测' })).toBeVisible({
    timeout: 10_000
  })
  await expect(panel.getByRole('menuitemcheckbox').filter({ hasText: '水治' })).toHaveCount(0)
  // PaperRow 徽标真实文本更新（onMutated→library load）
  await expect(rowA.locator('.lib-t-mini', { hasText: '水质监测' })).toHaveCount(1)
  await expect(rowA.locator('.lib-t-mini', { hasText: '水治' })).toHaveCount(0)
  // S5：id 稳定——筛选不动，甲行仍在筛选结果内
  await expect(rowA).toBeVisible()

  // —— 颜色：行右键「水质」→颜色…→预设 swatch→确定→面板行色点着色 ——
  // [RR1-16/e2e F6] 「水质」hasText 撞「水质监测」——行全文正则锚「名+计数」
  // （主控亲执修正：filter({has}) 内定位器在行子树重根评估，panel 根链恒不匹配）
  const rowOfExactName = (name: string) =>
    panel.getByRole('menuitemcheckbox').filter({ hasText: new RegExp(`^${name}\\d+$`) })
  await rowOfExactName('水质').click({ button: 'right' })
  await menu.getByRole('menuitem', { name: '颜色…' }).click()
  await expect(dialog).toBeVisible()
  await dialog.getByLabel(`预设颜色 ${TAG_COLOR_PRESETS[0]}`).click()
  await dialog.getByRole('button', { name: '确定' }).click()
  await expect(dialog).toBeHidden({ timeout: 10_000 })
  // 色点着色（真 Chromium 计算样式：#e11d48 → rgb 三元组）
  const preset = TAG_COLOR_PRESETS[0]
  const rgb = [1, 3, 5].map((i) => parseInt(preset.slice(i, i + 2), 16)).join(', ')
  const dot = rowOfExactName('水质').locator('.lib-dd-dot')
  await expect
    .poll(async () => dot.evaluate((el) => getComputedStyle(el).backgroundColor))
    .toContain(rgb)

  await app.close()
})
