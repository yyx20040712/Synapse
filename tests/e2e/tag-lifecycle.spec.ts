import { test, expect } from '@playwright/test'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { bootstrapMigrations, launch, seedPaperRow } from './e2e-env'

/**
 * [P7E-01] 标签生命周期 e2e（always-active，无工单门）。
 *
 * 链路：种子三篇（甲挂双标签/乙挂单标签/丙无标签——筛区分化）→UI 打标签→
 * 右键改名（chip 与 PaperRow 徽标真实文本更新；选中态 id 稳定筛选不动——S5）→
 * 合并（源 chip 消失+目标计数 1→2）→删除（选中态先筛选只剩甲乙，删除后死
 * 筛选自动清空→全列表在场含丙——S2 装配级）。全程断言渲染真实文本。
 */
test('标签生命周期：改名→合并→删除（chip/行徽标真实文本+死筛选自愈）', async () => {
  const userData = await mkdtemp(join(tmpdir(), 'synapse-p7e-'))

  // 第一跳：应用自建库表（workspaces.spec 同配方——不 import src 内部模块）
  await bootstrapMigrations(userData)

  // 三篇种子（只列行不开阅读器——无需真实 PDF 文件；sha 互异避唯一约束）
  const papers = [
    { id: 'e2e-p7e-a', title: 'P7E 甲文献', sha: 'a'.repeat(64) },
    { id: 'e2e-p7e-b', title: 'P7E 乙文献', sha: 'b'.repeat(64) },
    { id: 'e2e-p7e-c', title: 'P7E 丙文献', sha: 'c'.repeat(64) }
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
      // 已挂接 chip 的 × 按钮出现（aria-label 锚——chip span 含 × 子按钮，
      // 纯文本 exact 匹配不到；Enter→upsert+attach→onChanged 重读完成锚）
      await expect(win.getByLabel(`移除标签 ${name}`)).toBeVisible({ timeout: 10_000 })
    }
  }
  await tagPaper('P7E 甲文献', '水治', '核心')
  await tagPaper('P7E 乙文献', '水质')

  // 视图切换强制 LibraryPage 卸载/重挂→TagFilter refresh（chips 就位——
  // TagEditor 的 upsert 路径不刷新 tags.store，挂载 refresh 是既有契约）
  await win.getByRole('button', { name: '脉络', exact: true }).click()
  await win.getByRole('button', { name: '文献库' }).click()
  const menu = win.getByTestId('tag-menu')
  await expect(win.getByRole('button', { name: '水治（1）' })).toBeVisible({ timeout: 10_000 })

  // —— 改名：右键「水治」→「水质监测」——
  // 先选中该筛选（setQuery→load 后行徽标可见——改名的对照面在场）
  await win.getByRole('button', { name: '水治（1）' }).click()
  const rowA = win.locator('.lib-card', { hasText: 'P7E 甲文献' })
  await expect(rowA.locator('.lib-tag', { hasText: '水治' })).toHaveCount(1)
  await win.getByRole('button', { name: '水治（1）' }).click({ button: 'right' })
  await expect(menu).toBeVisible()
  await menu.getByRole('menuitem', { name: '重命名' }).click()
  const dialog = win.getByRole('dialog')
  const renameInput = win.getByLabel('新标签名')
  await expect(renameInput).toHaveValue('水治') // 预填现名
  await renameInput.fill('水质监测')
  await dialog.getByRole('button', { name: '保存' }).click()
  // chip 更新（store 链式 refresh）；错拼名 chip 消失
  await expect(win.getByRole('button', { name: '水质监测（1）' })).toBeVisible({ timeout: 10_000 })
  await expect(win.getByRole('button', { name: '水治（1）' })).toHaveCount(0)
  // PaperRow 徽标真实文本更新（onMutated→library load）
  await expect(rowA.locator('.lib-tag', { hasText: '水质监测' })).toHaveCount(1)
  await expect(rowA.locator('.lib-tag', { hasText: '水治' })).toHaveCount(0)
  // S5：id 稳定——筛选不动，甲行仍在筛选结果内
  await expect(rowA).toBeVisible()

  // —— 合并：「核心」→「水质」；源 chip 消失+目标计数 1→2 ——
  await win.getByRole('button', { name: '核心（1）' }).click({ button: 'right' })
  await menu.getByRole('menuitem', { name: '合并到…' }).click()
  await dialog.getByRole('button', { name: '水质（1）' }).click() // 目标 chip 点选即确认
  // 变更完成锚：对话框关闭（mutation+链式 refresh+unmount 落定）——先锚再断
  // chips，防「chips 已刷新而对话框尚未卸载」的瞬态双匹配（strict violation
  // 首次 resolve 即红不重试——两 render 间隙实测可被捕获）
  await expect(dialog).toBeHidden({ timeout: 10_000 })
  await expect(win.getByRole('button', { name: '核心（1）' })).toHaveCount(0, { timeout: 10_000 })
  await expect(win.getByRole('button', { name: '水质（2）' })).toBeVisible({ timeout: 10_000 })

  // —— 删除：选中「水质」→筛选只剩甲乙（丙被滤掉）；删除后死筛选自动清空→全列表 ——
  // P7E-06 配套：v2 多选 toggle 下「点新 chip」=叠加非换选——先取消改名段
  // 选中的「水质监测」（:62 点选其前身「水治」，id 稳定延续），恢复本段
  // 「单选水质」的换选序列语义（选中集=[水质]，甲乙均挂）
  await win.getByRole('button', { name: '水质监测（1）' }).click()
  await win.getByRole('button', { name: '水质（2）' }).click()
  // 先锚列表加载完成再断缺席（loading 中 rows 为空≠被滤掉——workspaces.spec 回炉教训）
  await expect(win.getByText('正在加载文献列表…')).toBeHidden({ timeout: 10_000 })
  await expect(win.getByText('P7E 丙文献')).toHaveCount(0) // 筛选生效中
  await expect(rowA).toBeVisible() // 合并后甲乙双挂——均在筛选结果内
  await win.getByRole('button', { name: '水质（2）' }).click({ button: 'right' })
  await menu.getByRole('menuitem', { name: '删除' }).click()
  await expect(dialog.getByText('将删除标签「水质」及其在 2 篇文献上的挂接')).toBeVisible()
  await dialog.getByRole('button', { name: '确认删除' }).click()
  // 变更完成锚（同合并段——对话框关闭先行）
  await expect(dialog).toBeHidden({ timeout: 10_000 })
  // chip 消失 + 死筛选自愈（S2 装配级）：全列表在场（丙回归证明 tagId 已清）
  await expect(win.getByRole('button', { name: '水质（2）' })).toHaveCount(0, { timeout: 10_000 })
  for (const t of ['P7E 甲文献', 'P7E 乙文献', 'P7E 丙文献']) {
    await expect(win.getByText(t).first()).toBeVisible({ timeout: 10_000 })
  }
  // 甲行徽标仅剩「水质监测」（核心已并入、水质已删）
  await expect(rowA.locator('.lib-tag')).toHaveCount(1)
  await expect(rowA.locator('.lib-tag')).toHaveText('水质监测')

  await app.close()
})
