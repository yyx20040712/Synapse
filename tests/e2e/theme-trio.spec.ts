import { test, expect } from '@playwright/test'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { launch } from './e2e-env'

/**
 * T3-P1 主题三族 e2e（always-active）：设置页三选项（枚举退役 'system'）→
 * 保存后 data-theme 挂 documentElement + body computed backgroundColor 三族
 * 终值实测（真实渲染断言——INV-06 口径，禁只断言 attr 不见色）。值源=
 * docs/design/2026-09-26_theme-trio-final-design.md §0：
 * light #f4f6f9 / dark #14161a / sepia #e8dcc2。收尾恢复白天（终态=白天，
 * 防污染其他 spec 的视觉断言面）。
 */
test('T3-P1 主题三族：下拉恰三选项无「跟随系统」；切换保存后 data-theme+body 真实渲染色三族实测；收尾恢复白天', async () => {
  const userData = await mkdtemp(join(tmpdir(), 'synapse-theme-trio-'))
  const app = await launch(userData)
  const win = await app.firstWindow()
  await expect(win.getByRole('button', { name: '设置' })).toBeVisible({ timeout: 20_000 })
  await win.getByRole('button', { name: '设置' }).click()

  // 下拉恰三选项且无「跟随系统」（'system' 枚举退役——A6 不跟随系统）
  const select = win.getByRole('combobox', { name: '主题' })
  const labels = await select.locator('option').allTextContents()
  expect(labels, '主题下拉恰三选项（light/dark/sepia——跟随系统已退役）').toEqual([
    '白天 · 精密仪表',
    '夜间 · 深灰',
    '护眼 · 牛皮纸'
  ])

  // 初态：全新 userData → DEFAULTS theme=light → data-theme=light + 白天底色
  await expect(win.locator('html')).toHaveAttribute('data-theme', 'light')
  await expect
    .poll(() => win.evaluate(() => getComputedStyle(document.body).backgroundColor))
    .toBe('rgb(244, 246, 249)')

  // 夜间 · 深灰：保存落地 → data-theme=dark + body 真实渲染色 #14161a
  await select.selectOption({ label: '夜间 · 深灰' })
  await win.getByRole('button', { name: '保存设置' }).click()
  await expect(win.getByText('设置已保存')).toBeVisible()
  await expect(win.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect
    .poll(() => win.evaluate(() => getComputedStyle(document.body).backgroundColor))
    .toBe('rgb(20, 22, 26)')
  // 桥接级联锚（门一 d1-W5/k1-N2 补强）：body color=--text→var(--ink) 同元素级联
  // 重解析，dark 族 #e6e9ef——桥断开/换回字面量/族值漂移此断言即红
  await expect
    .poll(() => win.evaluate(() => getComputedStyle(document.body).color))
    .toBe('rgb(230, 233, 239)')

  // 护眼 · 牛皮纸：保存落地 → data-theme=sepia + body 真实渲染色 #e8dcc2
  await select.selectOption({ label: '护眼 · 牛皮纸' })
  await win.getByRole('button', { name: '保存设置' }).click()
  await expect(win.locator('html')).toHaveAttribute('data-theme', 'sepia')
  await expect
    .poll(() => win.evaluate(() => getComputedStyle(document.body).backgroundColor))
    .toBe('rgb(232, 220, 194)')

  // 收尾恢复白天（终态=白天——防污染其他 spec）
  await select.selectOption({ label: '白天 · 精密仪表' })
  await win.getByRole('button', { name: '保存设置' }).click()
  await expect(win.locator('html')).toHaveAttribute('data-theme', 'light')
  await expect
    .poll(() => win.evaluate(() => getComputedStyle(document.body).backgroundColor))
    .toBe('rgb(244, 246, 249)')

  await app.close()
})
