import { test, expect } from '@playwright/test'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { bootstrapMigrations, launch, seedPaperRow } from './e2e-env'

/**
 * [v2 第二期 2026-11-19] 文献库详情抽屉收起/展开 e2e（计划 §4 第二期验收：
 * 1280×800 初始收起列表题名完整可见；1440×900 初始展开；会话选择后切换/
 * 选择不重置；双入口「详情」开关钮/详情头「收起详情」钮）。
 *
 * 视口控制=BrowserWindow.setContentSize（library-density 先例）。CI 虚拟屏
 * 可能钳制内容宽 ≤1024：宽档分支按实测 getContentSize 分流，钳制态断言
 * 「窄档初始收起」等值面（d1-W2 两分支皆硬断言口径——零静默跳过）。
 */
test('详情抽屉状态机：窄视口首进收起→「详情」钮展开→切文献不重置→详情头收起', async () => {
  const userData = await mkdtemp(join(tmpdir(), 'synapse-dcollapse-'))
  await bootstrapMigrations(userData)
  const seeds = [
    { id: 'e2e-dc-a', title: '收起机甲文献：管网水力模型', sha: 'd'.repeat(64) },
    { id: 'e2e-dc-b', title: '收起机乙文献：漏损检测方法', sha: 'e'.repeat(64) }
  ] as const
  for (const p of seeds) {
    await seedPaperRow(
      userData,
      `${p.sha.slice(0, 2)}/${p.sha.slice(2, 4)}/${p.sha}.pdf`,
      p.sha,
      p.title,
      p.id
    )
  }

  const app = await launch(userData)
  const win = await app.firstWindow()
  // 窄档（1285≤1320——CI 钳 1024 同样落在窄档）：setContentSize 前置直证
  await app.evaluate(({ BrowserWindow }) => {
    const main = BrowserWindow.getAllWindows()[0]
    if (main === undefined) throw new Error('主窗口不在 BrowserWindow.getAllWindows() 中')
    main.setContentSize(1285, 800)
  })
  const cw = await app.evaluate(({ BrowserWindow }) => {
    const main = BrowserWindow.getAllWindows()[0]
    if (main === undefined) throw new Error('主窗口不在 BrowserWindow.getAllWindows() 中')
    return main.getContentSize()[0] ?? 0
  })
  expect(cw, '内容宽应落在窄档（≤1320）——CI 钳制后同样满足').toBeLessThanOrEqual(1320)

  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
  // 首进默认收起：抽屉不在 DOM（条件渲染——零残留空抽屉）
  await expect(win.locator('.lib-drawer')).toHaveCount(0)
  await expect(win.locator('[role="separator"][aria-label="右栏宽度"]')).toHaveCount(0)
  // 列表真实题名完整可见（收起态列表占满）
  await expect(win.getByText(seeds[0].title).first()).toBeVisible()

  // 「详情」钮（FilterBar 行尾）展开：抽屉挂载+真实详情标题文本
  const detailBtn = win.locator('.lib-detail-toggle')
  await expect(detailBtn).toHaveAttribute('aria-pressed', 'false')
  await detailBtn.click()
  await expect(win.locator('.lib-drawer')).toHaveCount(1)
  await expect(detailBtn).toHaveAttribute('aria-pressed', 'true')

  // 选中乙篇：抽屉随选切换且不因选择重置（仍展开）
  await win.getByText(seeds[1].title).first().click()
  await expect(win.locator('.lib-dr-title')).toHaveText(seeds[1].title)
  await expect(win.locator('.lib-drawer')).toHaveCount(1)

  // 详情头「收起详情」钮：抽屉卸载
  await win.getByRole('button', { name: '收起详情' }).click()
  await expect(win.locator('.lib-drawer')).toHaveCount(0)
  await expect(detailBtn).toHaveAttribute('aria-pressed', 'false')

  await app.close()
})

test('宽视口（1440×900）首进默认展开；CI 钳制窄档时断言等值收起面', async () => {
  const userData = await mkdtemp(join(tmpdir(), 'synapse-dcollapse-w-'))
  await bootstrapMigrations(userData)
  const sha = 'f'.repeat(64)
  await seedPaperRow(
    userData,
    `${sha.slice(0, 2)}/${sha.slice(2, 4)}/${sha}.pdf`,
    sha,
    '宽档种子文献：需水预测综述',
    'e2e-dc-w'
  )

  const app = await launch(userData)
  const win = await app.firstWindow()
  await app.evaluate(({ BrowserWindow }) => {
    const main = BrowserWindow.getAllWindows()[0]
    if (main === undefined) throw new Error('主窗口不在 BrowserWindow.getAllWindows() 中')
    main.setContentSize(1440, 900)
  })
  const cw = await app.evaluate(({ BrowserWindow }) => {
    const main = BrowserWindow.getAllWindows()[0]
    if (main === undefined) throw new Error('主窗口不在 BrowserWindow.getAllWindows() 中')
    return main.getContentSize()[0] ?? 0
  })
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })

  if (cw > 1320) {
    // 宽档可达（本地/大屏 CI）：初始展开
    await expect(win.locator('.lib-drawer')).toHaveCount(1)
    await expect(win.locator('.lib-detail-toggle')).toHaveAttribute('aria-pressed', 'true')
  } else {
    // CI 虚拟屏钳制：窗口内容宽恒 ≤1320（ getContentSize 实测 cw）——默认
    // 收起为同一状态机在钳制视口下的正确输出（等值硬断言，非跳过）
    expect(cw, '钳制分支前置：内容宽应 ≤1320').toBeLessThanOrEqual(1320)
    await expect(win.locator('.lib-drawer')).toHaveCount(0)
    await expect(win.locator('.lib-detail-toggle')).toHaveAttribute('aria-pressed', 'false')
  }

  await app.close()
})
