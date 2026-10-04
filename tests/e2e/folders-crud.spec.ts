import { test, expect } from '@playwright/test'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { bootstrapMigrations, launch, seedPaperRow } from './e2e-env'

/**
 * [F-FOLDER-02·A/C→F-UIRES-01 批 A] folders-crud e2e —— FolderNav 左栏全链
 * （设计稿 §2.1/§2.2；选择器自 FolderFilter chip 面迁移）：新建（底部常驻入口
 * →内联输入）/重名域错误中文 toast/右键菜单行内改名（FolderRenameDialog 退役
 * ——重命名单源=行内编辑）/删除（静默判据双路径：空夹直删+有资产保护弹窗
 * ——[F-ALIGN-01 D4 2026-10-04] 域删级联：文案预告「将永久删除夹内 N 篇文献
 * 及其脉络图、笔记与标注」+确认后夹内文献随域灭零残留）+S3 改名后脉络页图名
 * 联动+P-8 在脉络图中打开。
 * 断言全部锚真实渲染文本（宪法 e2e 纪律）。
 */

test('folders-crud：新建/重名 toast/行内改名（S3 联动）/删除弹窗文案/P-8 跳转', async () => {
  const userData = await mkdtemp(join(tmpdir(), 'synapse-ff02-crud-'))
  await bootstrapMigrations(userData)
  // 壳层种子破引导态（INV-87：default 课题+0 篇→rail 全禁用——S3 需切脉络页；
  // 幽灵行不入图不归夹，0/0/0 计数文案不受扰——shell-rail.spec 同配方）
  await seedPaperRow(userData, 'a.pdf', 'sha-crud-guide', '壳层种子文献', 'e2e-crud-guide')
  const app = await launch(userData)
  const win = await app.firstWindow()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })

  // [F-UIRES-01] 导航行定位（.lib-fn-row——FolderFilter chip 面迁移）
  const navRow = (name: string) => win.locator('.lib-fn-row').filter({ hasText: name })

  // 迁移 012 兜底行：主图导航行在场（含 mono 计数真文本）
  await expect(navRow('主图')).toBeVisible({ timeout: 10_000 })

  // S1 锚：全部文献导航行真文本（§3.9——每幕≥2 真实文本/aria 锚）；
  // [F-ALIGN-01 D5] 第三筛选行随域退役——零残留负锚
  await expect(navRow('全部文献')).toBeVisible()
  await expect(navRow('未归档')).toHaveCount(0)

  // T1 新建：底部「新建文件夹」常驻入口（svg 加号承载+语义——批 α 双加号修复）→ 内联输入 Enter → 导航行出现（×0 计数）
  await win.getByRole('button', { name: '新建文件夹', exact: true }).click()
  await win.getByLabel('新文件夹名').fill('调研计划')
  await win.getByLabel('新文件夹名').press('Enter')
  await expect(navRow('调研计划')).toBeVisible({ timeout: 10_000 })
  await expect(navRow('调研计划')).toContainText('0')

  // T2 重名：域错误中文原文 toast（CONFLICT folders.service 消息透传）+输入保留
  await win.getByRole('button', { name: '新建文件夹', exact: true }).click()
  await win.getByLabel('新文件夹名').fill('调研计划')
  await win.getByLabel('新文件夹名').press('Enter')
  await expect(win.getByText('文件夹名已被占用')).toBeVisible({ timeout: 10_000 })
  await win.getByLabel('新文件夹名').press('Escape')

  // T3 行内改名（FolderRenameDialog 退役——重命名单源=行内编辑三键范式）：
  // 右键菜单 → 重命名 → 行内输入（预填现名）Enter 提交 → 旧行退场新行在场
  await navRow('调研计划').click({ button: 'right' })
  await win.getByTestId('folder-menu').getByRole('menuitem', { name: '重命名' }).click()
  const renameInput = win.getByLabel('重命名文件夹名')
  await expect(renameInput).toHaveValue('调研计划')
  await renameInput.fill('改名后的图')
  await renameInput.press('Enter')
  await expect(navRow('改名后的图')).toBeVisible({ timeout: 10_000 })
  await expect(navRow('调研计划')).toHaveCount(0)

  // P-8「在脉络图中打开」（S2 锚第三项）：切脉络视图+图名=该文件夹
  await navRow('改名后的图').click({ button: 'right' })
  await win.getByTestId('folder-menu').getByRole('menuitem', { name: '在脉络图中打开' }).click()
  await expect(win.getByTestId('lineage-graph-title')).toHaveText('改名后的图', { timeout: 10_000 })

  // S3 脉络页联动：nav 下拉选项 1:1 文件夹名+图名真文本跟随（图名单一真相源）
  await win.getByTestId('lineage-nav-graph').click()
  await win.getByTestId('lineage-nav-graph-menu').getByRole('option', { name: '主图' }).click()
  await expect(win.getByTestId('lineage-graph-title')).toHaveText('主图')
  // [F-DELCONF-01] 造资产：给「改名后的图」移入 1 篇文献（moveFolder 产品
  // 路径——[F-ALIGN-01] 主题节点 UI 添加退役：移动迁入自动建节点〔分支②〕
  // =节点唯一来源两路之「移动」路，INV-NEW-1）。T4b 弹窗路径需有资产
  // （静默判据下空图不弹窗）
  await win.getByTestId('lineage-nav-graph').click()
  await win.getByTestId('lineage-nav-graph-menu').getByRole('option', { name: '改名后的图' }).click()
  await expect(win.getByText('该文件夹无脉络图')).toBeVisible()
  await win.evaluate(async () => {
    const r = await window.api.folders.list({})
    const fid = r.ok ? (r.data.find((f) => f.name === '改名后的图')?.id ?? '') : ''
    if (fid !== '') await window.api.papers.moveFolder({ paperId: 'e2e-crud-guide', toFolderId: fid })
  })
  // folders.changed→图重取链：节点卡在场（文献随迁自动入图）
  await expect(win.locator('.tl-card[data-node-id]').filter({ hasText: '壳层种子文献' })).toBeVisible({
    timeout: 10_000
  })

  await win.getByRole('button', { name: '文献库' }).click()

  // T4a 静默直删（F-DELCONF-01①）：空图文件夹（0 节点 0 连线）→点删除即
  // 直删，不弹确认窗（保护资产=脉络图唯一，无资产则不跳）
  await win.getByRole('button', { name: '新建文件夹', exact: true }).click()
  await win.getByLabel('新文件夹名').fill('速删验证图')
  await win.getByLabel('新文件夹名').press('Enter')
  await expect(navRow('速删验证图')).toBeVisible({ timeout: 10_000 })
  await navRow('速删验证图').click({ button: 'right' })
  await win.getByTestId('folder-menu').getByRole('menuitem', { name: '删除文件夹' }).click()
  await expect(win.getByRole('dialog')).toHaveCount(0)
  await expect(navRow('速删验证图')).toHaveCount(0, { timeout: 10_000 })

  // T4b 有资产弹窗：确认弹窗 [F-ALIGN-01 D4] 域删级联文案逐字（计数=1 节点/
  // 0 连线/1 文献——资产=moveFolder 移入文献：节点+文献各 1）+危险色按钮执行
  await navRow('改名后的图').click({ button: 'right' })
  await win.getByTestId('folder-menu').getByRole('menuitem', { name: '删除文件夹' }).click()
  const dialog = win.getByRole('dialog')
  await expect(dialog).toContainText('删除文件夹「改名后的图」？')
  await expect(dialog).toContainText(
    '将永久删除该文件夹内的 1 篇文献及其脉络图（1 个节点、0 条连线）、笔记与标注——全部不可恢复。'
  )
  await dialog.getByRole('button', { name: '删除文件夹' }).click()
  await expect(navRow('改名后的图')).toHaveCount(0, { timeout: 10_000 })
  // [F-ALIGN-01 D4] 域删级联零残留：夹内文献（壳层种子）随域灭——库行消失+
  // 全部文献计数归零（INV-NEW-3 真实渲染锚）
  await expect(win.locator('.lib-row', { hasText: '壳层种子文献' })).toHaveCount(0, {
    timeout: 10_000
  })
  await expect(navRow('全部文献').locator('.lib-fn-ct')).toHaveText('0', { timeout: 10_000 })

  await app.close()
})

/**
 * [批 α 2026-10-03] 双击文件夹行=进入重命名（用户裁决翻转——F-UIRES-02 批 A
 * 「双击不进编辑」豁免作废；与课题卡/WorkspacesPage 范式统一）。正锚：双击
 * 真实文件夹行→行内重命名输入出现且预填现名（aria-label 锚——与右键/F2 同态）。
 */
test('folders-crud：双击文件夹行进重命名（批 α 用户裁决翻转）', async () => {
  const userData = await mkdtemp(join(tmpdir(), 'synapse-fua-dbl-'))
  await bootstrapMigrations(userData)
  // 壳层种子破引导态（INV-87——同上用例配方）
  await seedPaperRow(userData, 'a.pdf', 'sha-fua-dbl', '双击种子文献', 'e2e-fua-dbl')
  const app = await launch(userData)
  const win = await app.firstWindow()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
  const navRow = (name: string) => win.locator('.lib-fn-row').filter({ hasText: name })
  await expect(navRow('主图')).toBeVisible({ timeout: 10_000 })

  await navRow('主图').dblclick()
  const input = win.getByLabel('重命名文件夹名')
  await expect(input).toBeVisible({ timeout: 5_000 })
  await expect(input).toHaveValue('主图')
  await input.press('Escape')
  await expect(input).toHaveCount(0)

  await app.close()
})
