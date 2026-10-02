import { test, expect, type ElectronApplication, type Page } from '@playwright/test'
import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { createTinyPdf } from '../utils/pdf-factory'
import { bootstrapMigrations, launch, seedLineageGraph, seedPaperRow } from './e2e-env'

/**
 * [F-FOLDER-02·F/S4/G④] lineage-topic-node e2e —— 图绑定三面：
 * ①主题节点 folderId=当前图（design §5 矩阵「主题节点」行——store.addThemeNode
 * 显式携键）；②S4 删除当前图→脉络页回退主图+「该文件夹无脉络图」空态；
 * ③G④ 存量幽灵边（跨图边）→graph 子图过滤+导出 lineage.json 零跨图边
 * （C2 主控终裁 2026-09-30——[F-BAKRET-01] 导入链退役后：幽灵边改由
 * seedLineageGraph 直写库模拟存量数据（产品路径 INV-90 已不可产生），
 * 导出面 INV-77 过滤兜底锚保活；git 历史导入面根治锚=548dfda~95d40c2）。
 * 断言锚真实渲染文本。测试 1/2 零真实文献场景需壳层种子破引导态（INV-87——
 * default 课题+0 篇 rail 全禁用；幽灵行不入图=图断言不受扰）。
 */

const nodeCard = (win: Page, title: string) =>
  win.locator('.tl-card[data-node-id]').filter({ hasText: title })

test('主题节点 folderId=当前图：F 图添加→主图不可见→图域隔离（reload 持久）', async () => {
  const userData = await mkdtemp(join(tmpdir(), 'synapse-ff02-topic-'))
  await bootstrapMigrations(userData)
  await seedPaperRow(userData, 'a.pdf', 'sha-topic-guide', '主题种子文献', 'e2e-topic-guide')
  const app = await launch(userData)
  const win = await app.firstWindow()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })

  // 建文件夹「主题图」（真实通道）
  const fid = await win.evaluate(async () => {
    const r = await window.api.folders.create({ name: '主题图' })
    return r.ok ? r.data.id : ''
  })
  expect(fid).not.toBe('')

  // 切到主题图→添加主题节点（工具条→主题型→添加）——[F-LGRAPH-01①] 图切换
  // 经导航窗格下拉（role=listbox option；并集切换器 select 退役）
  await win.getByRole('button', { name: '脉络', exact: true }).click()
  await win.getByTestId('lineage-nav-graph').click()
  await win.getByTestId('lineage-nav-graph-menu').getByRole('option', { name: '主题图' }).click()
  // [②U2/A11] 添加节点钮随工具组（edit 态）
  await win.getByTestId('lineage-mode-edit').click()
  await win.getByTestId('lineage-add-node').click()
  await win.getByTestId('add-node-mode-theme').click()
  await win.getByLabel('主题名称（阶段分组）').fill('阶段一分组')
  await win.getByRole('dialog').getByRole('button', { name: '添加', exact: true }).click()
  await expect(nodeCard(win, '阶段一分组')).toBeVisible({ timeout: 10_000 })
  // [②U1] 会话语义：编辑入暂存→点工具组保存钮批量落库（后续切图/reload 真
  // 持久；dirty 切图走确认分支前先落库=数据面确立）
  await win.getByTestId('lineage-save-btn').click()
  await expect(win.getByTestId('lineage-save-error')).toHaveCount(0, { timeout: 10_000 })
  // [回炉 R23] 保存后断言补：clean 回落锁定（保存钮回禁用+spinner 消退）
  await expect(win.getByTestId('lineage-save-btn')).toBeDisabled({ timeout: 10_000 })

  // 图域隔离：主图视角不可见（folderId=当前图——非主图落地）+空图提示在场
  await win.getByTestId('lineage-nav-graph').click()
  await win.getByTestId('lineage-nav-graph-menu').getByRole('option', { name: '主图' }).click()
  await expect(nodeCard(win, '阶段一分组')).toHaveCount(0)
  // [F-LGRAPH-01①] 主图空图=画布内通用空态（「该文件夹无脉络图」仅子图）
  await expect(win.getByText('暂无脉络图——添加节点')).toBeVisible({ timeout: 10_000 })

  // reload 持久（真写盘非乐观渲染）：缺省图回主图（folderScope 未选）仍不可见
  await win.reload()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
  await win.getByRole('button', { name: '脉络', exact: true }).click()
  await expect(nodeCard(win, '阶段一分组')).toHaveCount(0)
  // 切回主题图=节点在场（写盘真持久）
  await win.getByTestId('lineage-nav-graph').click()
  await win.getByTestId('lineage-nav-graph-menu').getByRole('option', { name: '主题图' }).click()
  await expect(nodeCard(win, '阶段一分组')).toBeVisible({ timeout: 10_000 })

  await app.close()
})

test('S4：删除当前图（正在查看的文件夹图）→脉络页回退主图+空态文案', async () => {
  const userData = await mkdtemp(join(tmpdir(), 'synapse-ff02-s4-'))
  await bootstrapMigrations(userData)
  await seedPaperRow(userData, 'a.pdf', 'sha-s4-guide', 'S4 种子文献', 'e2e-s4-guide')
  const app = await launch(userData)
  const win = await app.firstWindow()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })

  // 建文件夹 F 并在其中建图（主题节点=图非空锚）
  await win.getByRole('button', { name: '+ 新建文件夹' }).click()
  await win.getByLabel('新文件夹名').fill('即将删除的图')
  await win.getByLabel('新文件夹名').press('Enter')
  await win.getByRole('button', { name: '脉络', exact: true }).click()
  await win.getByTestId('lineage-nav-graph').click()
  await win.getByTestId('lineage-nav-graph-menu').getByRole('option', { name: '即将删除的图' }).click()
  // [②U2/A11] 添加节点钮随工具组（edit 态）
  await win.getByTestId('lineage-mode-edit').click()
  await win.getByTestId('lineage-add-node').click()
  await win.getByTestId('add-node-mode-theme').click()
  await win.getByLabel('主题名称（阶段分组）').fill('将随图删除的节点')
  await win.getByRole('dialog').getByRole('button', { name: '添加', exact: true }).click()
  await expect(nodeCard(win, '将随图删除的节点')).toBeVisible({ timeout: 10_000 })
  // [②U1] 会话语义：点保存落库（图非空锚=真写盘；后续删图级联有对象）
  await win.getByTestId('lineage-save-btn').click()
  await expect(win.getByTestId('lineage-save-error')).toHaveCount(0, { timeout: 10_000 })

  // 库页删除该文件夹（确认弹窗执行）
  await win.getByRole('button', { name: '文献库' }).click()
  await win.locator('.lib-fn-row').filter({ hasText: '即将删除的图' }).click({ button: 'right' })
  await win.getByTestId('folder-menu').getByRole('menuitem', { name: '删除文件夹' }).click()
  await win.getByRole('dialog').getByRole('button', { name: '删除文件夹' }).click()

  // 脉络页：当前图失效→回退主图（__main__ 恒在场）+主图空态文案
  // [F-LGRAPH-01①] 主图空图走画布内通用空态（「该文件夹无脉络图」仅子图）
  await win.getByRole('button', { name: '脉络', exact: true }).click()
  await expect(win.getByTestId('lineage-graph-title')).toHaveText('主图', { timeout: 10_000 })
  await expect(win.getByText('该文件夹无脉络图')).toHaveCount(0)
  await expect(win.getByText('暂无脉络图——添加节点')).toBeVisible({ timeout: 10_000 })
  await expect(nodeCard(win, '将随图删除的节点')).toHaveCount(0)

  await app.close()
})

/** 真实 PDF 落受管存储位+papers 行（导出链需要文件在盘——corpus-export 同型） */
async function seedRealPaper(
  userData: string,
  id: string,
  title: string,
  year: number
): Promise<void> {
  const bytes = createTinyPdf(title)
  const sha = createHash('sha256').update(bytes).digest('hex')
  const fileRef = `${sha.slice(0, 2)}/${sha.slice(2, 4)}/${sha}.pdf`
  const abs = join(userData, 'files', ...fileRef.split('/'))
  mkdirSync(dirname(abs), { recursive: true })
  writeFileSync(abs, bytes)
  await seedPaperRow(userData, fileRef, sha, title, id, { year })
}

/** main 侧对话框桩（corpus-export.spec:73 同族——路径只出自 main 对话框） */
async function stubOpenDialog(app: ElectronApplication, paths: string[]): Promise<void> {
  await app.evaluate((electronMod, fixed) => {
    ;(
      electronMod.dialog as unknown as {
        showOpenDialog: () => Promise<{ canceled: boolean; filePaths: string[] }>
      }
    ).showOpenDialog = async () => ({ canceled: false, filePaths: fixed })
  }, paths)
}

test('G④：存量幽灵边（直写库种子）→graph 子图过滤+导出 lineage.json 零跨图边（INV-77 兜底）', async () => {
  const userData = await mkdtemp(join(tmpdir(), 'synapse-ff02-g4-'))
  const exportDir = await mkdtemp(join(tmpdir(), 'synapse-ff02-g4-out-'))
  await bootstrapMigrations(userData)
  const GP1 = { id: 'e2e-g4-1', title: '夹内图文献', year: 2024 }
  const GP2 = { id: 'e2e-g4-2', title: '主图文献', year: 2023 }
  await seedRealPaper(userData, GP1.id, GP1.title, GP1.year)
  await seedRealPaper(userData, GP2.id, GP2.title, GP2.year)
  // [F-BAKRET-01] 全预置直写库（app 内 folders.create 会触发 workspaces 物化
  // 迁库——ADR-0018 L0→L1 根库移入 workspaces/，种子须在首启前落根库）：
  // 文件夹行+两节点（GP1=夹内图/GP2=主图）+幽灵边（跨图——产品路径 INV-90
  // 已不可产生，存量数据模拟）一体的 seedLineageGraph 载荷
  await seedLineageGraph(userData, {
    folders: [{ id: 'f-g4', name: '跨图夹', position: 1 }],
    nodes: [
      { paperId: GP1.id, title: GP1.title, year: GP1.year, coreIdea: '', folderId: 'f-g4' },
      { paperId: GP2.id, title: GP2.title, year: GP2.year, coreIdea: '' }
    ],
    edges: [{ from: GP1.id, to: GP2.id, label: '跨图连线' }]
  })

  // 单 launch：缺省主图视角——GP2（主图节点）在场；GP1（夹内图）子图过滤
  // 不可见（[F-LGRAPH-01①] 并集读面退役，graph() 恒显式 folderId 过滤）
  const app = await launch(userData)
  const win = await app.firstWindow()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
  await win.getByRole('button', { name: '脉络', exact: true }).click()
  await expect(nodeCard(win, GP2.title)).toBeVisible({ timeout: 10_000 })
  await expect(nodeCard(win, GP1.title)).toHaveCount(0)

  // graph() 子图过滤双向：切「跨图夹」视角——GP1 在场+GP2（主图节点）不可见
  // +幽灵边两端点不全在场→读面滤除（INV-77 兜底重心=导出面过滤，下段承载）
  await win.getByTestId('lineage-nav-graph').click()
  await win.getByTestId('lineage-nav-graph-menu').getByRole('option', { name: '跨图夹' }).click()
  await expect(nodeCard(win, GP1.title)).toBeVisible({ timeout: 10_000 })
  await expect(nodeCard(win, GP2.title)).toHaveCount(0)
  await expect(win.locator('svg.tl-edges path.tl-edge')).toHaveCount(0)

  // 导出面兜底（C2 ②）：语料导出→lineage.json 零跨图边（edges 空数组）
  await stubOpenDialog(app, [exportDir])
  await win.getByRole('button', { name: '设置' }).click()
  await win.getByRole('button', { name: '导出语料' }).click()
  await expect(win.getByText('语料导出完成：2 篇', { exact: false })).toBeVisible({
    timeout: 120_000
  })
  const lineageJson = JSON.parse(
    await (await import('node:fs/promises')).readFile(join(exportDir, 'lineage.json'), 'utf8')
  ) as { edges: unknown[]; nodes: unknown[] }
  expect(lineageJson.nodes).toHaveLength(2)
  expect(lineageJson.edges).toEqual([])

  await app.close()
})
