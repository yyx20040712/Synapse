import { test, expect } from '@playwright/test'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { bootstrapMigrations, launch, seedPaperRow } from './e2e-env'

/**
 * [T3-P2] 壳层改版 e2e（always-active）：真 Chromium 断言——
 * ①rail 七项渲染（真实文本可见）；②顶栏 wordmark/38px 高+gsearch（提示语
 * +Ctrl K 全局聚焦）；③下载 toast 文案（A8 占位）；④状态条真实文本（课题名/
 * 主题名）；⑤课题弹层开→当前项 .on→点选后 reload 联动（新课题名在状态条+
 * paperCount COUNT 实测）。
 * 视觉基准=docs/design/mockups/2026-09-26_v2_theme-light.html 壳层段；
 * 真相源=docs/design/2026-09-26_theme-trio-final-design.md §1。
 */
test('T3-P2 壳层：rail 七项真实文本+wordmark 38px 顶栏+gsearch Ctrl K+下载 toast+状态条真文本', async () => {
  const userData = await mkdtemp(join(tmpdir(), 'synapse-shell-rail-'))
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

  // 下载占位 toast（A8——mockup L766 逐字）
  await win.getByRole('button', { name: '下载', exact: true }).click()
  await expect(win.getByText('文献搜索与下载引擎 · 规划中（未实现）')).toBeVisible()

  // 状态条真实文本（课题名+主题名——THEME_LABEL 单源）
  await expect(win.locator('.app-statusbar')).toContainText('课题 默认课题 · 0 篇')
  await expect(win.locator('.app-statusbar')).toContainText('脉络 0 节点 / 0 连线')
  await expect(win.locator('.app-statusbar')).toContainText('主题：白天 · 精密仪表')

  await app.close()
})

test('T3-P2 课题弹层：开合+当前项 .on+点选后 reload 联动（状态条课题名/篇数自新）', async () => {
  const userData = await mkdtemp(join(tmpdir(), 'synapse-shell-ws-'))
  await bootstrapMigrations(userData)
  const sha = 'f'.repeat(64)
  await seedPaperRow(userData, `${sha.slice(0, 2)}/${sha.slice(2, 4)}/${sha}.pdf`, sha, '弹层联动种子文献')

  const app = await launch(userData)
  const win = await app.firstWindow()
  await expect(win.locator('.rail-ws .lb')).toHaveText('默认课题', { timeout: 20_000 })
  await expect(win.locator('.app-statusbar')).toContainText('课题 默认课题 · 1 篇')

  // 开弹层：h4 标题+课题行（色点/全名/篇数）+当前项 .on
  await win.getByRole('button', { name: '课题', exact: true }).click()
  const pop = win.locator('.ws-pop')
  await expect(pop).toBeVisible()
  await expect(pop.getByRole('heading', { name: '选 择 课 题' })).toBeVisible()
  const current = pop.locator('.ws-item', { hasText: '默认课题' })
  await expect(current).toBeVisible()
  await expect(current).toHaveClass(/\bon\b/)
  await expect(current).toContainText('1 篇')
  await expect(current.locator('.dot')).toBeVisible()

  // 外点关闭+重开
  await win.locator('main').click({ position: { x: 400, y: 200 } })
  await expect(pop).toBeHidden()
  await win.getByRole('button', { name: '课题', exact: true }).click()
  await expect(pop).toBeVisible()
  await win.keyboard.press('Escape')
  await expect(pop).toBeHidden()

  // [回炉 1 k1-W2/d1-W4] 触发钮 mousedown 自吞净关一次锁：弹层开着时点课题钮
  // =mousedown 被自吞（不触发外点关）+click toggle——净效果恰关一次。
  // 若自吞守卫被摘：mousedown 先外点关、click 再 toggle 开——弹层回到展开，
  // 断言 toBeHidden 即红（真 Chromium mousedown 序列，jsdom click() 不派发）
  await win.getByRole('button', { name: '课题', exact: true }).click()
  await expect(pop).toBeVisible()
  await win.getByRole('button', { name: '课题', exact: true }).click()
  await expect(pop, '触发钮点击=净关一次（自吞守卫在位）').toBeHidden()

  // 新建课题 B（设置页课题管理节——dirty=false 无确认直切→reload）
  await win.getByRole('button', { name: '设置', exact: true }).click()
  await win.getByLabel('新课题名称').fill('水质模型课题')
  await win.getByRole('button', { name: '创建并切换' }).click()
  await expect(win.locator('.app-statusbar')).toContainText('课题 水质模型课题 · 0 篇', {
    timeout: 20_000
  })
  await expect(win.locator('.rail-ws .lb')).toHaveText('水质模型', { timeout: 20_000 })

  // 弹层切回默认课题：当前项 .on 已随 reload 自新（=水质模型课题行），
  // 点默认课题行→reload→状态条课题名/篇数自新（A10 联动+COUNT 实测）
  await win.getByRole('button', { name: '课题', exact: true }).click()
  await expect(pop.locator('.ws-item', { hasText: '水质模型课题' })).toHaveClass(/\bon\b/)
  await pop.locator('.ws-item', { hasText: '默认课题' }).click()
  await expect(win.locator('.app-statusbar')).toContainText('课题 默认课题 · 1 篇', {
    timeout: 20_000
  })
  await expect(win.locator('.rail-ws .lb')).toHaveText('默认课题', { timeout: 20_000 })

  await app.close()
})
