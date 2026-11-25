import { test, expect, type Page } from '@playwright/test'
import { mkdtemp } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { createMultiPagePdf, PDF_KNOWN_TEXT } from '../utils/pdf-factory'
import { bootstrapMigrations, launch, seedPaperRow } from './e2e-env'

/**
 * 主题两档 e2e（always-active；[B1] 暗色主题退役——原三主题场景中的
 * 「夜间 · 深灰」保存/dark 底色/dark 桥接级联/dark 纸面反色断言随主题删除；
 * [前端四期 B2] 主题控件=外观分类预览卡两张〔2026-11-20 用户裁决，非下拉〕）：
 * 设置页两卡 → 保存后 data-theme 挂 documentElement + body computed
 * backgroundColor 两主题终值实测（真实渲染断言——INV-06 口径，禁只断言
 * attr 不见色）+外观预览卡选中态主标跟随（[B5 wave C 2026-11-25] 状态条整删——原「状态条主题名」
 * 锚改预览卡 aria-pressed 选中卡主标，同为 THEME_LABEL 单源）。值源=v2 设计稿
 * （synapse-redesign-v2.html，2026-11-19 定案）：light #f2f4f1 / sepia
 * #eee6d6。收尾恢复正常模式（终态=light，防污染其他 spec 的视觉断言面）。
 */

/**
 * 阅读器纸面段共用：设置页切主题并保存→回阅读器视图（tab 驻 store 重挂恢复）。
 * [前端四期 B2 2026-11-20 用户裁决] 主题控件=v2 预览卡两张（非下拉）——
 * label=卡主标（正常模式/护眼模式）。
 */
async function switchTheme(win: Page, label: string): Promise<void> {
  await win.getByRole('button', { name: '设置' }).click()
  await win.getByRole('button', { name: '外观' }).click()
  await win.getByRole('button', { name: new RegExp(label) }).click()
  await win.getByRole('button', { name: '保存设置' }).click()
  await expect(win.getByText('设置已保存')).toBeVisible()
  await win.getByRole('button', { name: '阅读器' }).click()
}

test('主题两档：预览卡恰两张（正常/护眼）；启动初态 light；切换保存后 data-theme+body 真实渲色+预览卡选中态主标跟随；收尾恢复正常模式', async () => {
  const userData = await mkdtemp(join(tmpdir(), 'synapse-theme-trio-'))
  // [F-WS-02] 种子破引导态（设置钮在引导态禁用——smoke.spec 同配方；
  // 主题初态断言不受种子影响：settings.json 仍全新=DEFAULTS light）
  await bootstrapMigrations(userData)
  const sha = 'd'.repeat(64)
  await seedPaperRow(userData, `${sha.slice(0, 2)}/${sha.slice(2, 4)}/${sha}.pdf`, sha, '主题两档种子文献')
  const app = await launch(userData)
  const win = await app.firstWindow()
  await expect(win.getByRole('button', { name: '设置' })).toBeVisible({ timeout: 20_000 })
  await win.getByRole('button', { name: '设置' }).click()
  await win.getByRole('button', { name: '外观' }).click()

  // 预览卡恰两张（B1 暗色退役——dark 不再是可选项；[B2] 控件=卡非下拉）：
  // 卡主标+副标（v2 theme-choice-copy 文案）+aria-pressed 选中态
  const cards = win.locator('.settings-theme-card')
  await expect(cards).toHaveCount(2)
  await expect(cards.nth(0)).toContainText('正常模式')
  await expect(cards.nth(0)).toContainText('清亮中性色')
  await expect(cards.nth(1)).toContainText('护眼模式')
  await expect(cards.nth(1)).toContainText('牛皮纸暖米色')
  await expect(cards.nth(0)).toHaveAttribute('aria-pressed', 'true')

  // 启动初态：全新 userData → DEFAULTS theme=light → data-theme=light + 正常底色
  await expect(win.locator('html')).toHaveAttribute('data-theme', 'light')
  await expect
    .poll(() => win.evaluate(() => getComputedStyle(document.body).backgroundColor))
    .toBe('rgb(242, 244, 241)')
  // [B5 wave C] 原状态条「主题：正常模式」→外观预览卡选中态主标（THEME_LABEL 单源；cards.nth(0) 主标已在上方锁定）
  await expect(win.locator('.settings-theme-card[aria-pressed="true"]')).toHaveCount(1)
  await expect(win.locator('.settings-theme-card[aria-pressed="true"]')).toContainText('正常模式')

  // 护眼模式：点卡+保存落地 → data-theme=sepia + body 真实渲染色 #eee6d6
  await cards.nth(1).click()
  await expect(cards.nth(1)).toHaveAttribute('aria-pressed', 'true')
  await win.getByRole('button', { name: '保存设置' }).click()
  await expect(win.getByText('设置已保存')).toBeVisible()
  await expect(win.locator('html')).toHaveAttribute('data-theme', 'sepia')
  await expect
    .poll(() => win.evaluate(() => getComputedStyle(document.body).backgroundColor))
    .toBe('rgb(238, 230, 214)')
  // 桥接级联锚（沿门一 d1-W5/k1-N2 先例收窄两主题）：body color=--text→
  // var(--ink) 同元素级联重解析，sepia 族 #3f392e——桥断开/换回字面量/
  // 族值漂移此断言即红
  await expect
    .poll(() => win.evaluate(() => getComputedStyle(document.body).color))
    .toBe('rgb(63, 57, 46)')
  // [B5 wave C] 原状态条「主题：护眼模式」→外观预览卡选中态主标（THEME_LABEL 单源跟随）
  await expect(win.locator('.settings-theme-card[aria-pressed="true"]')).toContainText('护眼模式')

  // 收尾恢复正常模式（终态=light——防污染其他 spec）
  await cards.nth(0).click()
  await win.getByRole('button', { name: '保存设置' }).click()
  await expect(win.locator('html')).toHaveAttribute('data-theme', 'light')
  await expect
    .poll(() => win.evaluate(() => getComputedStyle(document.body).backgroundColor))
    .toBe('rgb(242, 244, 241)')
  // [B5 wave C] 原状态条「主题：正常模式」→外观预览卡选中态主标（THEME_LABEL 单源）
  await expect(win.locator('.settings-theme-card[aria-pressed="true"]')).toContainText('正常模式')

  await app.close()
})

/**
 * [T3-P4/B1] 阅读器纸面两主题 e2e（always-active）：种子 PDF（seed-paper
 * 先例+reader-text 批 1 配方）→开阅读器渲染出真实文本→两主题下
 * [data-page-box] computed backgroundColor + canvas[data-pdf-canvas]
 * computed filter 实测。值源=v2 设计稿 --paper 两主题（light=#fffefb=
 * rgb(255,254,251)/sepia=#fdf8ec=rgb(253,248,236)）；[B1] 暗色退役后
 * 两主题纸页均不反色（filter 恒 none——反色规则已删除，本断言锁「无反色
 * 回填」）。收尾必恢复正常模式（防污染他 spec——本 spec 首测同纪律）。
 */
test('阅读器纸面两主题：light 暖白纸→sepia 奶油纸，canvas 恒无反色（filter=none）；收尾恢复正常模式', async () => {
  const userData = await mkdtemp(join(tmpdir(), 'synapse-t3p4-reader-'))
  // 第一跳：应用自建库表+受管 PDF 文件（reader-text.spec 批 1 同配方）
  await bootstrapMigrations(userData)
  const bytes = createMultiPagePdf(2, PDF_KNOWN_TEXT)
  const sha = createHash('sha256').update(bytes).digest('hex')
  const fileRef = `${sha.slice(0, 2)}/${sha.slice(2, 4)}/${sha}.pdf`
  const abs = join(userData, 'files', ...fileRef.split('/'))
  mkdirSync(dirname(abs), { recursive: true })
  writeFileSync(abs, bytes)
  await seedPaperRow(userData, fileRef, sha, 'T3P4 纸面两主题文献', 'e2e-t3p4-paper')

  const app = await launch(userData)
  const win = await app.firstWindow()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
  await win.getByText('T3P4 纸面两主题文献').first().dblclick()
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
   * test-surface 提取器采集面，两主题值锚对指纹机检不可见即失守）。
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

  // —— 正常模式：页盒暖白纸（--paper=#fffefb v2 实值——reader-text.spec 同源）
  await expect(win.locator('html')).toHaveAttribute('data-theme', 'light')
  await waitForPaperState('rgb(255, 254, 251)', 'none')
  const light = await snapshot()
  expect(light.boxBg).toBe('rgb(255, 254, 251)')
  expect(light.canvasFilter, '两主题均无反色（B1 反位规则已删除）').toBe('none')

  // —— 护眼模式：页盒=--paper #fdf8ec 奶油纸（不反色——filter 仍 none）
  await switchTheme(win, '护眼模式')
  await expect(win.locator('html')).toHaveAttribute('data-theme', 'sepia')
  await expect(win.getByText(`P1 ${PDF_KNOWN_TEXT}`).first()).toBeVisible({ timeout: 20_000 })
  await waitForPaperState('rgb(253, 248, 236)', 'none')
  const sepia = await snapshot()
  expect(sepia.boxBg).toBe('rgb(253, 248, 236)')
  expect(sepia.canvasFilter, '护眼不反位（奶油纸正读）').toBe('none')

  // 收尾恢复正常模式（终态=light——防污染其他 spec，本文件两测同纪律）
  await switchTheme(win, '正常模式')
  await expect(win.locator('html')).toHaveAttribute('data-theme', 'light')
  await waitForPaperState('rgb(255, 254, 251)', 'none')
  const restored = await snapshot()
  expect(restored.boxBg).toBe('rgb(255, 254, 251)')

  await app.close()
})
