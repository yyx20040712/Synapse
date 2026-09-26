import { test, expect, type Page } from '@playwright/test'
import { mkdtemp } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { createMultiPagePdf, PDF_KNOWN_TEXT } from '../utils/pdf-factory'
import { bootstrapMigrations, launch, seedPaperRow } from './e2e-env'

/**
 * T3-P1 主题三族 e2e（always-active）：设置页三选项（枚举退役 'system'）→
 * 保存后 data-theme 挂 documentElement + body computed backgroundColor 三族
 * 终值实测（真实渲染断言——INV-06 口径，禁只断言 attr 不见色）。值源=
 * docs/design/2026-09-26_theme-trio-final-design.md §0：
 * light #f4f6f9 / dark #14161a / sepia #e8dcc2。收尾恢复白天（终态=白天，
 * 防污染其他 spec 的视觉断言面）。
 */

/** T3-P4 段共用：设置页切主题并保存→回阅读器视图（tab 驻 store 重挂恢复） */
async function switchTheme(win: Page, label: string): Promise<void> {
  await win.getByRole('button', { name: '设置' }).click()
  await win.getByRole('combobox', { name: '主题' }).selectOption({ label })
  await win.getByRole('button', { name: '保存设置' }).click()
  await expect(win.getByText('设置已保存')).toBeVisible()
  await win.getByRole('button', { name: '阅读器' }).click()
}
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

/**
 * [T3-P4] 阅读器纸面三态 e2e（always-active）：种子 PDF（seed-paper 先例+
 * reader-text 批 1 配方）→开阅读器渲染出真实文本→三主题下 [data-page-box]
 * computed backgroundColor + canvas[data-pdf-canvas] computed filter 实测。
 * 值源=final-design §0 --paper 三族（light=白桥接 rgb(255,255,255)/dark=
 * #242830=rgb(36,40,48)/sepia=#f7efdc=rgb(247,239,220)）+§7 案 A（dark=
 * invert(1) hue-rotate(180deg) 黑墨带→白字）。收尾必恢复白天（防污染
 * 他 spec——本 spec 首测同纪律）。
 */
test('T3-P4 阅读器纸面三态：dark 页盒暗纸+canvas 反色→light 白纸回归→sepia 奶油纸；收尾恢复白天', async () => {
  const userData = await mkdtemp(join(tmpdir(), 'synapse-t3p4-reader-'))
  // 第一跳：应用自建库表+受管 PDF 文件（reader-text.spec 批 1 同配方）
  await bootstrapMigrations(userData)
  const bytes = createMultiPagePdf(2, PDF_KNOWN_TEXT)
  const sha = createHash('sha256').update(bytes).digest('hex')
  const fileRef = `${sha.slice(0, 2)}/${sha.slice(2, 4)}/${sha}.pdf`
  const abs = join(userData, 'files', ...fileRef.split('/'))
  mkdirSync(dirname(abs), { recursive: true })
  writeFileSync(abs, bytes)
  await seedPaperRow(userData, fileRef, sha, 'T3P4 纸面三态文献', 'e2e-t3p4-paper')

  const app = await launch(userData)
  const win = await app.firstWindow()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
  await win.getByText('T3P4 纸面三态文献').first().dblclick()
  // 渲染出真实文本（INV-06 口径——先证渲染链活再断言视觉面）
  await expect(win.getByText(`P1 ${PDF_KNOWN_TEXT}`).first()).toBeVisible({ timeout: 20_000 })

  /** 页盒底+主 canvas filter 计算样式快照（首页盒） */
  const snapshot = async (): Promise<{ boxBg: string; canvasFilter: string }> =>
    win.evaluate(() => {
      const box = document.querySelector<HTMLElement>('[data-page-box]')
      const canvas = document.querySelector<HTMLCanvasElement>('canvas[data-pdf-canvas]')
      return {
        boxBg: box === null ? 'missing' : getComputedStyle(box).backgroundColor,
        canvasFilter: canvas === null ? 'missing' : getComputedStyle(canvas).filter
      }
    })

  /**
   * 等待页盒底/canvas filter 双双到达目标态（门一回炉 d1-W2：等待语义由
   * waitForFunction 承载，断言本体改 plain expect——expect.poll 形态不入
   * test-surface 提取器采集面，三族值锚对指纹机检不可见即失守）。
   */
  const waitForPaperState = async (boxBg: string, canvasFilter: string): Promise<void> => {
    await win.waitForFunction(
      (target) => {
        const box = document.querySelector<HTMLElement>('[data-page-box]')
        const canvas = document.querySelector<HTMLCanvasElement>('canvas[data-pdf-canvas]')
        return (
          box !== null &&
          canvas !== null &&
          getComputedStyle(box).backgroundColor === target!.boxBg &&
          getComputedStyle(canvas).filter === target!.canvasFilter
        )
      },
      { boxBg, canvasFilter },
      { timeout: 10_000 }
    )
  }

  // —— 夜间 · 深灰：页盒=--paper #242830 暗纸+canvas filter 反色（案 A）——
  await switchTheme(win, '夜间 · 深灰')
  await expect(win.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(win.getByText(`P1 ${PDF_KNOWN_TEXT}`).first()).toBeVisible({ timeout: 20_000 })
  await waitForPaperState('rgb(36, 40, 48)', 'invert(1) hue-rotate(180deg)')
  const dark = await snapshot()
  expect(dark.boxBg).toBe('rgb(36, 40, 48)')
  // 反位滤镜完整形态锚（invert+hue-rotate 双段——只 invert 无 hue-rotate 会偏色）
  expect(dark.canvasFilter).toContain('invert')
  expect(dark.canvasFilter).toBe('invert(1) hue-rotate(180deg)')

  // —— 白天 · 回归锚：页盒白（--paper=白桥接不变——reader-text.spec:643 同源）
  await switchTheme(win, '白天 · 精密仪表')
  await expect(win.locator('html')).toHaveAttribute('data-theme', 'light')
  await expect(win.getByText(`P1 ${PDF_KNOWN_TEXT}`).first()).toBeVisible({ timeout: 20_000 })
  await waitForPaperState('rgb(255, 255, 255)', 'none')
  const light = await snapshot()
  expect(light.boxBg).toBe('rgb(255, 255, 255)')
  expect(light.canvasFilter).toBe('none')

  // —— 护眼 · 牛皮纸：页盒=--paper #f7efdc 奶油纸（不反位——filter 仍 none）
  await switchTheme(win, '护眼 · 牛皮纸')
  await expect(win.locator('html')).toHaveAttribute('data-theme', 'sepia')
  await expect(win.getByText(`P1 ${PDF_KNOWN_TEXT}`).first()).toBeVisible({ timeout: 20_000 })
  await waitForPaperState('rgb(247, 239, 220)', 'none')
  const sepia = await snapshot()
  expect(sepia.boxBg).toBe('rgb(247, 239, 220)')
  expect(sepia.canvasFilter).toBe('none')

  // 收尾恢复白天（终态=白天——防污染其他 spec，本文件两测同纪律）
  await switchTheme(win, '白天 · 精密仪表')
  await expect(win.locator('html')).toHaveAttribute('data-theme', 'light')
  await waitForPaperState('rgb(255, 255, 255)', 'none')
  const restored = await snapshot()
  expect(restored.boxBg).toBe('rgb(255, 255, 255)')

  await app.close()
})
