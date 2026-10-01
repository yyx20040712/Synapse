import { test, expect } from '@playwright/test'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { bootstrapMigrations, launch, seedPaperRow } from './e2e-env'

/**
 * [F-FOLDER-02·A/C] folders-crud e2e —— 文件夹区 chip 全链（design §4.1/§4.3）：
 * 新建（chip+×N 计数）/重名域错误中文 toast/右键菜单改名/删除（F-DELCONF-01
 * 静默判据双路径：空图直删无弹窗+有资产保护弹窗 N2 终裁文案逐字——
 * nodeCount/edgeCount 经 lineage.graph 派生+paperCount 载荷）+S3 改名后
 * 脉络页图名联动（图名=文件夹名单一真相源）。
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

  // S3 脉络页联动：nav 下拉选项 1:1 文件夹名+图名真文本跟随（图名单一真相源；
  // [F-LGRAPH-01①] 并集退役+缺省图=库页 folderScope 未选→主图兜底+图名去前缀）
  await win.getByRole('button', { name: '脉络', exact: true }).click()
  await expect(win.getByTestId('lineage-graph-title')).toHaveText('主图')
  await win.getByTestId('lineage-nav-graph').click()
  await win.getByTestId('lineage-nav-graph-menu').getByRole('option', { name: '改名后的图' }).click()
  await expect(win.getByTestId('lineage-graph-title')).toHaveText('改名后的图')
  // 空图提示（「该文件夹无脉络图」文案族——新图零节点）
  await expect(win.getByText('该文件夹无脉络图')).toBeVisible()
  // [F-DELCONF-01] 造资产：给「改名后的图」加 1 主题节点（脉络页产品路径
  // 「添加节点·主题型」——lineage-topic-node.spec 同型；主题节点 folderId=
  // 当前图随选（INV-88：文献节点 folder=文献归属恒落主图，不走此路）。T4b
  // 弹窗路径需有资产（静默判据下空图不弹窗）。主题节点不动 paper 归属→
  // 计数=1 节点/0 连线/0 篇文献
  await win.getByTestId('lineage-add-node').click()
  await win.getByTestId('add-node-mode-theme').click()
  await win.getByLabel('主题名称（阶段分组）').fill('crud 资产节点')
  await win.getByRole('dialog').getByRole('button', { name: '添加', exact: true }).click()
  await expect(win.locator('.tl-card[data-node-id]').filter({ hasText: 'crud 资产节点' })).toBeVisible({
    timeout: 10_000
  })

  await win.getByRole('button', { name: '文献库' }).click()

  // T4a 静默直删（F-DELCONF-01①）：空图文件夹（0 节点 0 连线）→点删除即
  // 直删，不弹确认窗（保护资产=脉络图唯一，无资产则不跳）
  await win.getByRole('button', { name: '+ 新建文件夹' }).click()
  await win.getByLabel('新文件夹名').fill('速删验证图')
  await win.getByLabel('新文件夹名').press('Enter')
  await expect(folderChip('速删验证图')).toBeVisible({ timeout: 10_000 })
  await folderChip('速删验证图').click({ button: 'right' })
  await win.getByRole('menuitem', { name: '删除' }).click()
  await expect(win.getByRole('dialog')).toHaveCount(0)
  await expect(folderChip('速删验证图')).toHaveCount(0, { timeout: 10_000 })

  // T4b 有资产弹窗：确认弹窗 N2 终裁文案逐字（计数=1/0/0）+危险色按钮执行
  await folderChip('改名后的图').click({ button: 'right' })
  await win.getByRole('menuitem', { name: '删除' }).click()
  const dialog = win.getByRole('dialog')
  await expect(dialog).toContainText('删除文件夹「改名后的图」？')
  await expect(dialog).toContainText(
    '该文件夹的脉络图将一并删除（1 个节点及 0 条连线不可恢复）；其中 0 篇文献不会被删除，将移至「未归档」。'
  )
  await dialog.getByRole('button', { name: '删除文件夹' }).click()
  await expect(folderChip('改名后的图')).toHaveCount(0, { timeout: 10_000 })

  await app.close()
})
