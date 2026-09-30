import { test, expect } from '@playwright/test'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { bootstrapMigrations, launch, seedPaperRow } from './e2e-env'

/**
 * [R1-WS2] 课题切换 e2e（验收判据场景，ADR-0018——always-active，无工单门）。
 * [T3-P2] 壳层改版重写：顶栏 WorkspaceSwitcher 退役——新建/切换走 rail 课题
 * 入口。[F-WS-02] 弹层 WsRailPopover 退役：课题钮=路由 workspaces 管理页
 * （卡片列表/新建/改名/切换），设置页课题管理节同批退役；断言锚=状态条
 * 课题名/篇数（reload 后自新——A10 联动验收面）+管理页卡片真实文本。
 *
 * 链路（[F-WS-02] R5 定向锚：点课题按钮→新页在场→新建/改名/切换链）：
 * 旧布局种子（文献直写 userData 根——L0 兼容面，paperCount=1 打破引导态）
 * →启动（ensure 迁移 M→W-pvalid(default)）→rail 课题短名+状态条（COUNT 实测）
 * →点课题钮→管理页在场（卡片=实名/篇数/色标片/.on）→页内新建课题 B
 * （dirty=false 无确认直切）→location.reload 后文献库空+状态条示 B
 * →页内行内改名课题 B→rail 短名就地自新（不 reload）→页内切回 default
 * →种子文献在场+状态条篇数自新（课题隔离=库级分目录的字面验收）。
 *
 * reload 注意：Electron 下 location.reload 重载同 webContents，playwright 的
 * win 句柄仍有效；断言用 auto-retry expect 重同步（不手等 timeout）。
 */
test('课题切换：管理页新建课题 B 后库/脉络整体切换，改名就地生效，切回后文献在场', async () => {
  const userData = await mkdtemp(join(tmpdir(), 'synapse-ws-'))

  // 第一跳：应用自建库表（不 import src 内部模块——Playwright 不认 ?raw）
  await bootstrapMigrations(userData)

  // 旧布局种子：文献行直写 userData 根 synapse.db（e2e 种子链零改动兼容面；
  // paperCount=1 → 引导态三条件不成立——rail 全钮可用）
  const sha = 'e'.repeat(64)
  const fileRef = `${sha.slice(0, 2)}/${sha.slice(2, 4)}/${sha}.pdf`
  await seedPaperRow(userData, fileRef, sha, '智慧水务 e2e 课题文献')

  // 第二跳：迁移兼容启动——rail 课题短名+状态条课题名/篇数（COUNT 实测）+种子文献在场
  const app = await launch(userData)
  const win = await app.firstWindow()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
  await expect(win.getByText('智慧水务 e2e 课题文献')).toBeVisible()
  await expect(win.locator('.rail-ws .lb')).toHaveText('默认课题', { timeout: 10_000 })
  await expect(win.locator('.app-statusbar')).toContainText('课题 默认课题 · 1 篇')

  // 点课题钮=路由管理页（[F-WS-02] R5 锚①）：卡片=实名/篇数/色标片+当前项 .on
  await win.getByRole('button', { name: '课题', exact: true }).click()
  const page = win.locator('.ws-page')
  await expect(page).toBeVisible({ timeout: 10_000 })
  await expect(page.getByRole('heading', { name: '课题管理' })).toBeVisible()
  const defCard = page.locator('.ws-card', { hasText: '默认课题' })
  await expect(defCard).toBeVisible()
  await expect(defCard).toContainText('1 篇')
  await expect(defCard.locator('.chip')).toBeVisible()
  await expect(defCard).toHaveClass(/\bon\b/)

  // 页内新建课题 B（锚②：创建即切——dirty=false 无确认直切→reload）
  await page.getByLabel('新课题名称').fill('课题 B')
  await page.getByRole('button', { name: '创建并切换' }).click()

  // reload 后重同步：状态条/rail 短名示「课题 B」（store load 完成的锚）
  await expect(win.locator('.app-statusbar')).toContainText('课题 课题 B · 0 篇', {
    timeout: 20_000
  })
  await expect(win.locator('.rail-ws .lb')).toHaveText('课题 B', { timeout: 20_000 })
  // 先锚「列表加载完成」再断缺席（回炉 W2——假绿窗堵口：loading 中 rows 为
  // 空，直接断 toHaveCount(0) 立即通过≠空库证明。「正在加载文献列表…」与
  // papers 同 commit 置/清位（LibraryPage:99-103），其隐藏=加载终态确定信号）
  await expect(win.getByText('正在加载文献列表…')).toBeHidden({ timeout: 10_000 })
  // 文献库空（默认视图即文献库）：种子文献不在新课题库
  await expect(win.getByText('智慧水务 e2e 课题文献')).toHaveCount(0)
  // 脉络空态（真实文本——宪法 e2e 红线）
  await win.getByRole('button', { name: '脉络', exact: true }).click()
  await expect(win.getByText('暂无脉络图——添加节点')).toBeVisible({ timeout: 10_000 })

  // 页内行内改名（锚③：rename IPC+清单即时改名——不 reload，rail 短名就地
  // 自新；新名前 4 码点≠旧名——短名=name 前 4 码点截断，同名前缀不显迁移）
  await win.getByRole('button', { name: '课题', exact: true }).click()
  const bCard = page.locator('.ws-card', { hasText: '课题 B' })
  await expect(bCard).toBeVisible()
  await expect(bCard).toHaveClass(/\bon\b/)
  await page.locator('.ws-row', { hasText: '课题 B' }).getByRole('button', { name: '重命名' }).click()
  await page.getByLabel('课题名称', { exact: true }).fill('智慧水务课题 B')
  await page.getByRole('button', { name: '确定' }).click()
  await expect(page.locator('.ws-card', { hasText: '智慧水务课题 B' })).toBeVisible()
  await expect(win.locator('.rail-ws .lb')).toHaveText('智慧水务', { timeout: 10_000 })
  await expect(win.locator('.app-statusbar')).toContainText('课题 智慧水务课题 B · 0 篇')

  // 切回 default（锚④：点卡切换→reload→状态条课题名/篇数自新）
  await page.locator('.ws-card', { hasText: '默认课题' }).click()
  await expect(win.locator('.app-statusbar')).toContainText('课题 默认课题 · 1 篇', {
    timeout: 20_000
  })
  await expect(win.getByText('智慧水务 e2e 课题文献')).toBeVisible({ timeout: 10_000 })

  await app.close()
})
