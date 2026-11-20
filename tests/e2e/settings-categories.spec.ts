import { test, expect, type Page } from '@playwright/test'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { bootstrapMigrations, launch, seedPaperRow } from './e2e-env'

/**
 * [前端四期 B2] 设置页五类归并 e2e（always-active）：分类导航渲染与切换
 * （断言渲染出的真实文本/真实控件——INV-06 口径）、分类互斥只显示当前分类、
 * 长内容在设置内容区自身滚动而文档不滚（html/body overflow 锁的行为面实证）。
 * 主题卡/界面缩放/邮箱链由 theme-trio/smoke R2-SET1/settings-page-enter 各自
 * 承载，本件只锁五类结构面。
 */

/** 设置导航定位器（rail 的「设置」钮 vs 设置页 nav 分类钮消歧——域限定） */
function settingsNav(win: Page) {
  return win.locator('.settings-nav')
}

async function enterSettings(win: Page): Promise<void> {
  await win.getByRole('button', { name: '设置' }).click()
  await expect(win.locator('.syn-settings')).toBeVisible()
}

test('五类导航：默认「通用」（联系邮箱在场）；点「AI 助手」见 AI 管理节标；点「阅读与标注」见空态文案；分类互斥', async () => {
  const userData = await mkdtemp(join(tmpdir(), 'synapse-set-cats-'))
  // [F-WS-02] 种子破引导态（设置钮在引导态禁用——smoke.spec 同配方）
  await bootstrapMigrations(userData)
  const sha = 'f'.repeat(64)
  await seedPaperRow(userData, `${sha.slice(0, 2)}/${sha.slice(2, 4)}/${sha}.pdf`, sha, '五类种子文献')
  const app = await launch(userData)
  const win = await app.firstWindow()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })

  // 五类导航逐字（v2 nav 顺序与名称）
  await enterSettings(win)
  const navLabels = await settingsNav(win).locator('button').allTextContents()
  expect(navLabels, '五类导航顺序与名称逐字').toEqual(['通用', '外观', '阅读与标注', 'AI 助手', '数据与网络'])

  // 默认「通用」：页题+联系邮箱在场；AI 节不在场（互斥）
  await expect(win.getByRole('heading', { name: '通用' })).toBeVisible()
  await expect(win.locator('input[aria-label="联系邮箱"]')).toBeVisible()
  await expect(win.getByRole('heading', { name: 'AI 管理' })).toHaveCount(0)

  // 点「AI 助手」：真实节标文本在场；通用内容切走
  await settingsNav(win).getByRole('button', { name: 'AI 助手' }).click()
  await expect(win.getByRole('heading', { name: 'AI 管理' })).toBeVisible({ timeout: 10_000 })
  await expect(win.getByRole('heading', { name: 'AI 预算' })).toBeVisible()
  await expect(win.getByRole('heading', { name: 'AI 语料导出' })).toBeVisible()
  await expect(win.getByRole('heading', { name: 'AI 联动（zcode）' })).toBeVisible()
  await expect(win.locator('input[aria-label="联系邮箱"]')).toHaveCount(0)

  // 点「阅读与标注」：空态如实文案（真实文本——不新增设置字段）
  await settingsNav(win).getByRole('button', { name: '阅读与标注' }).click()
  await expect(win.getByRole('heading', { name: '阅读与标注' })).toBeVisible()
  await expect(win.getByText('阅读进度与标注自动随文献保存，当前无可配置项')).toBeVisible()
  await expect(win.locator('.settings-inner input, .settings-inner select, .settings-inner textarea')).toHaveCount(0)

  // 点「数据与网络」：网络白名单披露（§6.4——host 清单真实文本）+诊断+同步密钥
  await settingsNav(win).getByRole('button', { name: '数据与网络' }).click()
  await expect(win.getByRole('heading', { name: '同步密钥' })).toBeVisible({ timeout: 10_000 })
  await expect(win.getByRole('button', { name: '网络诊断' })).toBeVisible()
  await expect(win.getByRole('heading', { name: '网络白名单' })).toBeVisible()
  await expect(win.getByText('白名单 host（在共享常量中维护）：', { exact: false })).toBeVisible()

  // 点「外观」：主题两卡+界面缩放（分类内容互斥后重入）
  await settingsNav(win).getByRole('button', { name: '外观' }).click()
  await expect(win.locator('.settings-theme-card')).toHaveCount(2)
  await expect(win.getByRole('group', { name: '界面缩放档位' })).toBeVisible()

  await app.close()
})

test('长内容滚动边界：AI 分类内容在 .settings-content 自身滚动，文档不滚（scrollTop 恒 0）', async () => {
  const userData = await mkdtemp(join(tmpdir(), 'synapse-set-scroll-'))
  await bootstrapMigrations(userData)
  const sha = 'a'.repeat(64)
  await seedPaperRow(userData, `${sha.slice(0, 2)}/${sha.slice(2, 4)}/${sha}.pdf`, sha, '滚动种子文献')
  const app = await launch(userData)
  const win = await app.firstWindow()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })

  await enterSettings(win)
  await settingsNav(win).getByRole('button', { name: 'AI 助手' }).click()
  await expect(win.getByRole('heading', { name: 'AI 预算' })).toBeVisible({ timeout: 10_000 })

  // AI 分类（会话+管理+预算+语料+联动五节）在 1024×768 级视口必超高——内容区
  // 自身出现滚动条；滚到底后文档 scrollTop 恒 0（html/body overflow 锁行为面）
  await expect
    .poll(() =>
      win.evaluate(
        () =>
          (document.querySelector('.settings-content') as HTMLElement | null)?.scrollHeight ??
          0
      )
    )
    .toBeGreaterThan(
      await win.evaluate(
        () => (document.querySelector('.settings-content') as HTMLElement | null)?.clientHeight ?? 0
      )
    )
  await win.evaluate(() => {
    const el = document.querySelector('.settings-content') as HTMLElement | null
    if (el !== null) el.scrollTop = el.scrollHeight
  })
  const docScroll = await win.evaluate(() => ({
    top: document.scrollingElement?.scrollTop ?? 0,
    bodyTop: document.body.scrollTop
  }))
  expect(docScroll.top, '文档滚动位置恒 0（滚动只发生在内容区）').toBe(0)
  expect(docScroll.bodyTop).toBe(0)

  await app.close()
})
