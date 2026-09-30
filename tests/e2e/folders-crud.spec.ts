import { test, expect } from '@playwright/test'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { bootstrapMigrations, launch, seedPaperRow } from './e2e-env'

/**
 * [F-FOLDER-02·A/C] folders-crud e2e —— 文件夹区 chip 全链（design §4.1/§4.3）：
 * 新建（chip+×N 计数）/重名域错误中文 toast/右键菜单改名/删除确认弹窗（N2
 * 终裁文案逐字——nodeCount/edgeCount 经 lineage.graph 派生+paperCount 载荷）
 * +S3 改名后脉络页图名联动（图名=文件夹名单一真相源）。
 * 断言全部锚真实渲染文本（宪法 e2e 纪律）。
 */

test('folders-crud：新建/重名 toast/改名（S3 脉络页标题联动）/删除弹窗文案', async () => {
  const userData = await mkdtemp(join(tmpdir(), 'synapse-ff02-crud-'))
  await bootstrapMigrations(userData)
  // 壳层种子破引导态（INV-87：default 课题+0 篇→rail 全禁用——S3 需切脉络页；
  // 幽灵行不入图不归夹，0/0/0 计数文案不受扰——shell-rail.spec 同配方）
  await seedPaperRow(userData, 'a.pdf', 'sha-crud-guide', '壳层种子文献', 'e2e-crud-guide')
  const app = await launch(userData)
  const win = await app.firstWindow()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })

  const folderChip = (name: string) => win.locator('button[aria-pressed]').filter({ hasText: name })

  // 迁移 012 兜底行：主图 chip 在场（含 ×N mono 计数真文本）
  await expect(folderChip('主图')).toBeVisible({ timeout: 10_000 })

  // T1 新建：+ 新建文件夹 → Enter → chip 出现（×0 计数）
  await win.getByRole('button', { name: '+ 新建文件夹' }).click()
  await win.getByLabel('新文件夹名').fill('调研计划')
  await win.getByLabel('新文件夹名').press('Enter')
  await expect(folderChip('调研计划')).toBeVisible({ timeout: 10_000 })
  await expect(folderChip('调研计划')).toContainText('×0')

  // T2 重名：域错误中文原文 toast（CONFLICT folders.service 消息透传）
  await win.getByRole('button', { name: '+ 新建文件夹' }).click()
  await win.getByLabel('新文件夹名').fill('调研计划')
  await win.getByLabel('新文件夹名').press('Enter')
  await expect(win.getByText('文件夹名已被占用')).toBeVisible({ timeout: 10_000 })
  await win.getByLabel('新文件夹名').press('Escape')

  // T3 改名：右键菜单 → 重命名对话框 → Enter 提交 → 旧 chip 退场新 chip 在场
  await folderChip('调研计划').click({ button: 'right' })
  await win.getByRole('menuitem', { name: '重命名' }).click()
  const renameInput = win.getByRole('dialog').getByLabel('新文件夹名')
  await expect(renameInput).toHaveValue('调研计划')
  await renameInput.fill('改名后的图')
  await renameInput.press('Enter')
  await expect(folderChip('改名后的图')).toBeVisible({ timeout: 10_000 })
  await expect(folderChip('调研计划')).toHaveCount(0)

  // S3 脉络页联动：切换器选项 1:1 文件夹名+标题真文本跟随（图名单一真相源）
  await win.getByRole('button', { name: '脉络', exact: true }).click()
  await expect(win.getByTestId('lineage-graph-title')).toHaveText('脉络图：全部图（并集）')
  await win.getByLabel('脉络图切换').selectOption({ label: '改名后的图' })
  await expect(win.getByTestId('lineage-graph-title')).toHaveText('脉络图：改名后的图')
  // 空图提示（「该文件夹无脉络图」文案族——新图零节点）
  await expect(win.getByText('该文件夹无脉络图')).toBeVisible()

  // T4 删除：确认弹窗 N2 终裁文案逐字（空图计数=0/0/0）+危险色按钮执行
  await win.getByRole('button', { name: '文献库' }).click()
  await folderChip('改名后的图').click({ button: 'right' })
  await win.getByRole('menuitem', { name: '删除' }).click()
  const dialog = win.getByRole('dialog')
  await expect(dialog).toContainText('删除文件夹「改名后的图」？')
  await expect(dialog).toContainText(
    '该文件夹的脉络图将一并删除（0 个节点及 0 条连线不可恢复）；其中 0 篇文献不会被删除，将移至「未归档」。'
  )
  await dialog.getByRole('button', { name: '删除文件夹' }).click()
  await expect(folderChip('改名后的图')).toHaveCount(0, { timeout: 10_000 })

  await app.close()
})
