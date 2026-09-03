import { test, expect } from '@playwright/test'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { launch, seedPaperRow } from './e2e-env'

/**
 * [P7E-06] 标签多选过滤 e2e（always-active，无工单门）。
 *
 * 链路：种子三篇（甲挂 A+B/乙挂 A/丙无标签——交集分化+全列表对照锚）→
 * UI 打标签→选两标签（AND 交集→列表只甲）→取消一个（[A]→甲乙）→全清
 * （空选集收敛 undefined→甲乙丙全回归）。三态列表用 .lib-card 计数锚
 * （自带重试=load 完成锚，防 loading 空窗误判缺席）+真实文本断言。
 */
test('标签多选过滤：两标签交集→取消一个→全清回全列表', async () => {
  const userData = await mkdtemp(join(tmpdir(), 'synapse-p7e6-'))

  // 第一跳：应用自建库表（tag-lifecycle.spec 同配方——不 import src 内部模块）
  const seedApp = await launch(userData)
  await (await seedApp.firstWindow()).waitForTimeout(500)
  await seedApp.close()

  // 三篇种子（甲乙=票面双文献双标签分化主体；丙=全列表对照锚——三态列表可区分）
  const papers = [
    { id: 'e2e-p7e6-a', title: 'P7E06 甲文献', sha: 'a'.repeat(64) },
    { id: 'e2e-p7e6-b', title: 'P7E06 乙文献', sha: 'b'.repeat(64) },
    { id: 'e2e-p7e6-c', title: 'P7E06 丙文献', sha: 'c'.repeat(64) }
  ] as const
  for (const p of papers) {
    const fileRef = `${p.sha.slice(0, 2)}/${p.sha.slice(2, 4)}/${p.sha}.pdf`
    await seedPaperRow(userData, fileRef, p.sha, p.title, p.id)
  }

  const app = await launch(userData)
  const win = await app.firstWindow()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })

  // —— UI 打标签：甲=「多选A」+「多选B」；乙=「多选A」（tag-lifecycle.spec 同法）——
  const tagInput = win.getByLabel('新增标签')
  async function tagPaper(title: string, ...names: string[]): Promise<void> {
    await win.getByText(title).first().click()
    for (const name of names) {
      await tagInput.fill(name)
      await tagInput.press('Enter')
      await expect(win.getByLabel(`移除标签 ${name}`)).toBeVisible({ timeout: 10_000 })
    }
  }
  await tagPaper('P7E06 甲文献', '多选A', '多选B')
  await tagPaper('P7E06 乙文献', '多选A')

  // 视图切换强制 LibraryPage 卸载/重挂→TagFilter refresh（chips 就位——既有契约）
  await win.getByRole('button', { name: '脉络', exact: true }).click()
  await win.getByRole('button', { name: '文献库' }).click()
  await expect(win.getByRole('button', { name: '多选A（2）' })).toBeVisible({ timeout: 10_000 })
  await expect(win.getByRole('button', { name: '多选B（1）' })).toBeVisible({ timeout: 10_000 })

  // —— 交集 [A,B]：列表只甲（乙=单挂 A 出局、丙=无标签出局）——
  await win.getByRole('button', { name: '多选A（2）' }).click()
  await win.getByRole('button', { name: '多选B（1）' }).click()
  await expect(win.locator('.lib-card')).toHaveCount(1, { timeout: 10_000 })
  await expect(win.getByText('P7E06 甲文献').first()).toBeVisible()
  await expect(win.getByText('P7E06 乙文献')).toHaveCount(0)
  await expect(win.getByText('P7E06 丙文献')).toHaveCount(0)

  // —— 取消 B → [A]：甲乙在场（丙仍出局——与全清态区分的对照锚）——
  await win.getByRole('button', { name: '多选B（1）' }).click()
  await expect(win.locator('.lib-card')).toHaveCount(2, { timeout: 10_000 })
  await expect(win.getByText('P7E06 甲文献').first()).toBeVisible()
  await expect(win.getByText('P7E06 乙文献').first()).toBeVisible()
  await expect(win.getByText('P7E06 丙文献')).toHaveCount(0)

  // —— 全清 → 空选集收敛 undefined：甲乙丙全回归（零过滤全列表）——
  await win.getByRole('button', { name: '多选A（2）' }).click()
  await expect(win.locator('.lib-card')).toHaveCount(3, { timeout: 10_000 })
  for (const t of ['P7E06 甲文献', 'P7E06 乙文献', 'P7E06 丙文献']) {
    await expect(win.getByText(t).first()).toBeVisible({ timeout: 10_000 })
  }

  await app.close()
})
