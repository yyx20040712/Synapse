import { test, expect } from '@playwright/test'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { launch, seedPaperRow } from './e2e-env'

/**
 * [R1-WS2] 课题切换 e2e（验收判据场景，ADR-0018——always-active，无工单门）。
 *
 * 链路：旧布局种子（库+文献直写 userData 根——L0 兼容面）→启动（ensure 迁移
 * M→W-pvalid(default)）→侧栏见默认课题+种子文献在场→新建课题 B（dirty=false
 * 无确认直切）→location.reload 后文献库空+脉络空态+切换器示 B→切回 default→
 * 种子文献在场（课题隔离=库级分目录的字面验收）。
 *
 * reload 注意：Electron 下 location.reload 重载同 webContents，playwright 的
 * win 句柄仍有效；断言用 auto-retry expect 重同步（不手等 timeout）。
 */
test('课题切换：新建课题 B 后库/脉络整体切换，切回后文献在场', async () => {
  const userData = await mkdtemp(join(tmpdir(), 'synapse-ws-'))

  // 第一跳：应用自建库表（不 import src 内部模块——Playwright 不认 ?raw）
  const seedApp = await launch(userData)
  await (await seedApp.firstWindow()).waitForTimeout(500)
  await seedApp.close()

  // 旧布局种子：文献行直写 userData 根 synapse.db（e2e 种子链零改动兼容面）
  const sha = 'e'.repeat(64)
  const fileRef = `${sha.slice(0, 2)}/${sha.slice(2, 4)}/${sha}.pdf`
  await seedPaperRow(userData, fileRef, sha, '智慧水务 e2e 课题文献')

  // 第二跳：迁移兼容启动——侧栏默认课题 + 种子文献在场
  const app = await launch(userData)
  const win = await app.firstWindow()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
  await expect(win.getByRole('button', { name: '切换课题' })).toContainText('默认课题')
  await expect(win.getByText('智慧水务 e2e 课题文献')).toBeVisible()

  // 新建课题 B：dirty=false（未开文献/无脉络改动）→ 无确认直切 → reload
  await win.getByRole('button', { name: '切换课题' }).click()
  await win.getByRole('button', { name: '新建课题…' }).click()
  await win.getByLabel('新课题名称').fill('课题 B')
  await win.getByRole('button', { name: '创建', exact: true }).click()

  // reload 后重同步：切换器示「课题 B」（store load 完成的锚）
  await expect(win.getByRole('button', { name: '切换课题' })).toContainText('课题 B', {
    timeout: 20_000
  })
  // 先锚「列表加载完成」再断缺席（回炉 W2——假绿窗堵口：loading 中 rows 为
  // 空，直接断 toHaveCount(0) 立即通过≠空库证明。「正在加载文献列表…」与
  // papers 同 commit 置/清位（LibraryPage:99-103），其隐藏=加载终态确定信号）
  await expect(win.getByText('正在加载文献列表…')).toBeHidden({ timeout: 10_000 })
  // 文献库空（默认视图即文献库）：种子文献不在新课题库
  await expect(win.getByText('智慧水务 e2e 课题文献')).toHaveCount(0)
  // 脉络空态（真实文本——宪法 e2e 红线）
  await win.getByRole('button', { name: '脉络', exact: true }).click()
  await expect(win.getByText('暂无脉络图——导入草稿或添加节点')).toBeVisible({ timeout: 10_000 })

  // 切回 default：文献在场（隔离库各自完整）
  await win.getByRole('button', { name: '切换课题' }).click()
  await win.getByRole('button', { name: '默认课题', exact: true }).click()
  await expect(win.getByRole('button', { name: '切换课题' })).toContainText('默认课题', {
    timeout: 20_000
  })
  await expect(win.getByText('智慧水务 e2e 课题文献')).toBeVisible({ timeout: 10_000 })

  await app.close()
})
