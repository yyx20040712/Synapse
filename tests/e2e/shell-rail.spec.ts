import { test, expect } from '@playwright/test'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { bootstrapMigrations, launch, seedPaperRow } from './e2e-env'

/**
 * [T3-P2] 壳层改版 e2e（always-active）：真 Chromium 断言——
 * ①rail 七项渲染（真实文本可见）；②顶栏 wordmark/38px 高+gsearch（提示语
 * +Ctrl K 全局聚焦）；③下载 toast 文案（A8 占位）；④状态条真实文本（课题名/
 * 主题名）。[F-WS-02] 弹层开合断言随 WsRailPopover 退役改写——课题钮=路由
 * workspaces 管理页；测 2 重写为引导态（INV-87）e2e：待选择+全钮禁用→
 * 管理页新建课题→解禁升格（状态条课题名自新）。
 * 视觉基准=docs/design/mockups/2026-09-26_v2_theme-light.html 壳层段；
 * 真相源=docs/design/2026-09-26_theme-trio-final-design.md §1。
 */
test('T3-P2 壳层：rail 七项真实文本+wordmark 38px 顶栏+gsearch Ctrl K+下载 toast+状态条真文本', async () => {
  const userData = await mkdtemp(join(tmpdir(), 'synapse-shell-rail-'))
  // [F-WS-02] 种子破引导态：fresh 启动=default+0 篇+默认名→rail 下方全禁用
  // （下载 toast 等常态断言需 paperCount>0——workspaces.spec 同配方）
  await bootstrapMigrations(userData)
  const sha = 'f'.repeat(64)
  await seedPaperRow(userData, `${sha.slice(0, 2)}/${sha.slice(2, 4)}/${sha}.pdf`, sha, '壳层种子文献')
  const app = await launch(userData)
  const win = await app.firstWindow()

  // rail 视图四项真实文本可见（宪法红线：渲染出真实文本；scoped 到 .rail
  // 防主区同文名文本的 strict 模式二义）
  const railText = (t: string) => win.locator('.rail').getByText(t, { exact: true })
  await expect(railText('文献库')).toBeVisible({ timeout: 20_000 })
  await expect(railText('阅读器')).toBeVisible()
  await expect(railText('脉络')).toBeVisible()
  await expect(railText('设置')).toBeVisible()
  await expect(railText('下载')).toBeVisible()
  // 课题项短名（默认课题载入后——store load 完成的锚）
  await expect(win.locator('.rail-ws .lb')).toHaveText('默认课题', { timeout: 10_000 })
  // 六 button aria-label 齐（e2e getByRole name 断言面同源）
  for (const label of ['课题', '下载', '文献库', '阅读器', '脉络', '设置']) {
    await expect(win.getByRole('button', { name: label, exact: true })).toBeVisible()
  }

  // —— F-LIBUI-01 ①② rail 全栏 3px 等距（真 Chromium 计算样式锚——⑤h③）：
  // rail-gap 12px 楔子与课题色点 span 均退役（.rail 容器 gap 单源承载间距）——
  const railGeom = await win.evaluate(() => {
    const rail = document.querySelector('nav.rail')!
    const cs = getComputedStyle(rail)
    return {
      gap: cs.rowGap,
      gapDivs: rail.querySelectorAll('.rail-gap').length,
      dots: rail.querySelectorAll('.rail-ws-dot').length
    }
  })
  expect(railGeom.gap, '全栏 3px 等距（.rail gap 单源）').toBe('3px')
  expect(railGeom.gapDivs, 'rail-gap 楔子已退役').toBe(0)
  expect(railGeom.dots, '课题色点已退役（F-WS-02 回归管理页）').toBe(0)

  // 顶栏：wordmark 签名+38px 高（裁决链：44→56[2026-08-31 增高令]→38
  // [2026-09-26 theme-trio final-design §1——后者覆盖前者]）
  const wm = win.locator('.wordmark')
  await expect(wm).toBeVisible()
  expect(await wm.textContent()).toBe('Synapse')
  const headerH = await win.evaluate(
    () => document.querySelector('header.app-header')!.getBoundingClientRect().height
  )
  expect(headerH).toBe(38)

  // gsearch：提示语+全局 Ctrl K 聚焦
  await expect(win.locator('.gsearch .ph')).toHaveText('全局搜索')
  await win.keyboard.press('Control+K')
  await expect(win.locator('.gsearch input')).toBeFocused()

  // 下载占位 toast（A8——mockup L766 逐字；种子后引导态不成立→下载钮可用）
  await win.getByRole('button', { name: '下载', exact: true }).click()
  await expect(win.getByText('文献搜索与下载引擎 · 规划中（未实现）')).toBeVisible()

  // 状态条真实文本（课题名+主题名——THEME_LABEL 单源；种子后 paperCount=1）
  await expect(win.locator('.app-statusbar')).toContainText('课题 默认课题 · 1 篇')
  await expect(win.locator('.app-statusbar')).toContainText('脉络 0 节点 / 0 连线')
  await expect(win.locator('.app-statusbar')).toContainText('主题：白天 · 精密仪表')

  await app.close()
})

test('F-WS-02 引导态：fresh 启动待选择+全钮禁用→管理页新建课题后解禁（状态条课题名自新）', async () => {
  const userData = await mkdtemp(join(tmpdir(), 'synapse-shell-ws-'))
  // 不种子：fresh 启动=L0 合成 default（0 篇+默认名）→引导态三条件全成立
  const app = await launch(userData)
  const win = await app.firstWindow()

  // 引导态锚①：课题名显示位=「待选择」（D2 批语——不显示默认课题字样）
  await expect(win.locator('.rail-ws .lb')).toHaveText('待选择', { timeout: 20_000 })
  await expect(win.locator('.app-statusbar')).toContainText('课题 待选择 · 0 篇')
  // 锚②：课题钮以下五钮全禁用（真 Chromium disabled 态），课题钮恒可用
  for (const label of ['下载', '文献库', '阅读器', '脉络', '设置']) {
    await expect(
      win.getByRole('button', { name: label, exact: true }),
      `引导态 rail「${label}」禁用（D2 下方按钮全禁用）`
    ).toBeDisabled()
  }
  // 锚②b：禁用浅色皮肤计算样式锚（R1——d1-W3：删 .rail-item:disabled 块即红）
  await expect(
    win.getByRole('button', { name: '文献库', exact: true })
  ).toHaveCSS('opacity', '0.5')
  await expect(win.getByRole('button', { name: '课题', exact: true })).toBeEnabled()

  // 锚③：点课题钮=路由管理页——引导提示行在场（课题图标进管理页引导新建），
  // 卡片仍显实名默认课题（管理面=实体管理位，不受待选择显示影响）
  await win.getByRole('button', { name: '课题', exact: true }).click()
  const page = win.locator('.ws-page')
  await expect(page).toBeVisible({ timeout: 10_000 })
  await expect(page.locator('.ws-guide')).toBeVisible()
  await expect(page.locator('.ws-card', { hasText: '默认课题' })).toContainText('0 篇')

  // 锚④：页内新建课题 B（升格三路之切换路——创建即切→reload）→解禁+实名
  await page.getByLabel('新课题名称').fill('水质模型课题')
  await page.getByRole('button', { name: '创建并切换' }).click()
  await expect(win.locator('.app-statusbar')).toContainText('课题 水质模型课题 · 0 篇', {
    timeout: 20_000
  })
  await expect(win.locator('.rail-ws .lb')).toHaveText('水质模型', { timeout: 20_000 })
  for (const label of ['下载', '文献库', '阅读器', '脉络', '设置']) {
    await expect(
      win.getByRole('button', { name: label, exact: true }),
      `升格后 rail「${label}」解禁`
    ).toBeEnabled()
  }

  await app.close()
})
