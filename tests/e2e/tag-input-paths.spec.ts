import { test, expect } from '@playwright/test'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { TAG_COLOR_PRESETS } from '../../src/shared/constants'
import { bootstrapMigrations, launch, seedPaperRow } from './e2e-env'

/**
 * [F-TAGS-01] 标签输入三路提交 e2e（always-active，无工单门）。
 *
 * 票面 c 项：真实标签 IPC 链首锚（此前 e2e 零覆盖该链——unit 全 stub）：
 * ①真键盘中文输入（pressSequentially CJK——Playwright 无法驱动真 IME，此处
 * 为逐字符真实键盘事件而非组合输入法会话，如实口径）+Enter→chip 在场→同
 * userData 复 launch 持久断言（DB 落库证明——tags/paper_tags 双行）；
 * ②blur 路（输入后点击别处→失焦提交→chip 在场）；③「添加」按钮路；
 * ④着色 computed style 锚（真 Chromium 计算样式——F-LIBUI-01 先例口径，
 * 背景/边框计算值断言，hex alpha 后缀序列化宽容匹配 rgb 三元组）。
 */
test('标签三路提交：CJK 回车→持久/失焦/按钮/着色计算样式', async () => {
  const userData = await mkdtemp(join(tmpdir(), 'synapse-ftags-'))
  await bootstrapMigrations(userData)
  const sha = 'f'.repeat(64)
  await seedPaperRow(userData, `${sha.slice(0, 2)}/${sha.slice(2, 4)}/${sha}.pdf`, sha, 'F-T1 文献')

  const app = await launch(userData)
  const win = await app.firstWindow()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
  await win.getByText('F-T1 文献').first().click()

  // —— ① Enter 路：真键盘中文逐字符+回车 → 已挂接 chip 在场 ——
  const tagInput = win.getByLabel('新增标签')
  await tagInput.click()
  await tagInput.pressSequentially('水质')
  await tagInput.press('Enter')
  await expect(win.getByLabel('移除标签 水质')).toBeVisible({ timeout: 10_000 })

  // —— ② blur 路：输入后点击别处（搜索框夺焦）→ 失焦提交 → chip 在场 ——
  await tagInput.click()
  await tagInput.pressSequentially('水文')
  await win.getByLabel('搜索文献').click()
  await expect(win.getByLabel('移除标签 水文')).toBeVisible({ timeout: 10_000 })

  // —— ③ 按钮路：「添加」显式提交 ——
  await tagInput.click()
  await tagInput.pressSequentially('水泵')
  await win.getByLabel('添加标签').click()
  await expect(win.getByLabel('移除标签 水泵')).toBeVisible({ timeout: 10_000 })

  // —— ④ 着色 computed style 锚：[F-UIRES-03 B1] TagDropdown 面板行「编辑」钮→
  // 行编辑态色点阵（TAG_COLOR_PRESETS 8 圆点）→预设圆点→「保存」（右键菜单/
  // TagColorDialog 通道随 B1 批退役；着色呈现=面板行 chip .lib-dd-chip）——
  await win.getByRole('button', { name: '脉络', exact: true }).click()
  await win.getByRole('button', { name: '文献库' }).click()
  await win.locator('.lib-dd-btn').click()
  const panel = win.locator('.lib-dd-panel')
  await expect(panel).toBeVisible({ timeout: 10_000 })
  const colorRow = panel.locator('.lib-dd-row').filter({ hasText: '水质' })
  await colorRow.locator('.lib-dd-edit-btn').click()
  await panel.getByLabel(`预设颜色 ${TAG_COLOR_PRESETS[0]}`).click()
  await panel.getByRole('button', { name: '保存' }).click()
  // 真 Chromium 计算样式：chip 背景=#e11d48+18% alpha（三元组严格锚）
  const preset = TAG_COLOR_PRESETS[0]
  const rgb = [1, 3, 5].map((i) => parseInt(preset.slice(i, i + 2), 16)).join(', ')
  const chip = colorRow.locator('.lib-dd-chip')
  await expect
    .poll(async () => chip.evaluate((el) => getComputedStyle(el).backgroundColor))
    .toContain(rgb)

  // —— ① 续：同 userData 复 launch 持久断言（reload 持久——DB 落库证明） ——
  await app.close()
  const app2 = await launch(userData)
  const win2 = await app2.firstWindow()
  await expect(win2.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
  await win2.getByText('F-T1 文献').first().click()
  for (const name of ['水质', '水文', '水泵']) {
    await expect(win2.getByLabel(`移除标签 ${name}`)).toBeVisible({ timeout: 10_000 })
  }
  // 着色持久：复 launch 后面板行 chip 计算样式仍携带色值
  await win2.getByRole('button', { name: '脉络', exact: true }).click()
  await win2.getByRole('button', { name: '文献库' }).click()
  await win2.locator('.lib-dd-btn').click()
  const panel2 = win2.locator('.lib-dd-panel')
  await expect(panel2).toBeVisible({ timeout: 10_000 })
  const chip2 = panel2.locator('.lib-dd-row').filter({ hasText: '水质' }).locator('.lib-dd-chip')
  await expect
    .poll(async () => chip2.evaluate((el) => getComputedStyle(el).backgroundColor))
    .toContain(rgb)

  await app2.close()
})
