import { test, expect, type ElectronApplication, type Page } from '@playwright/test'
import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { createTinyPdf } from '../utils/pdf-factory'
import { bootstrapMigrations, launch, seedLineageGraph, seedPaperRow } from './e2e-env'

/**
 * [F-FOLDER-02·F/S4/G④] lineage-topic-node e2e —— 图绑定三面（历史名沿承）：
 * ②S4 删除当前图→脉络页回退主图+「该文件夹无脉络图」空态；③G④ 存量幽灵边
 * （跨图边）→graph 子图过滤+导出 lineage.json 零跨图边（C2 主控终裁
 * 2026-09-30——[F-BAKRET-01] 导入链退役后：幽灵边改由 seedLineageGraph 直写
 * 库模拟存量数据（产品路径 INV-90 已不可产生），导出面 INV-77 过滤兜底锚
 * 保活；git 历史导入面根治锚=548dfda~95d40c2）。
 * [F-ALIGN-01 2026-10-04] ①主题节点图域隔离用例随主题节点应用层退役删除
 * （节点唯一来源=入库/移动两路 INV-NEW-1——主题形态不可产生即不可断言）；
 * ②装置改种子直写（原主题节点 UI 添加=退役面——图非空锚改 paper 节点种子）。
 * 断言锚真实渲染文本。测试 1/2 零真实文献场景需壳层种子破引导态（INV-87——
 * default 课题+0 篇 rail 全禁用；幽灵行不入图=图断言不受扰）。
 */

const nodeCard = (win: Page, title: string) =>
  win.locator('.tl-card[data-node-id]').filter({ hasText: title })

test('S4：删除当前图（正在查看的文件夹图）→脉络页回退主图+空态文案', async () => {
  const userData = await mkdtemp(join(tmpdir(), 'synapse-ff02-s4-'))
  await bootstrapMigrations(userData)
  await seedPaperRow(userData, 'a.pdf', 'sha-s4-guide', 'S4 种子文献', 'e2e-s4-guide', { year: 2024 })
  // [F-ALIGN-01 改写] 图非空锚=种子直写（文件夹行+paper 节点——原主题节点
  // UI 添加面退役；paper 随种子归夹=INV-88 镜像语义）
  await seedLineageGraph(userData, {
    folders: [{ id: 'f-s4', name: '即将删除的图', position: 1 }],
    nodes: [{ paperId: 'e2e-s4-guide', title: 'S4 种子文献', year: 2024, coreIdea: '', folderId: 'f-s4' }]
  })
  const app = await launch(userData)
  const win = await app.firstWindow()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })

  // 切到该图（[F-LGRAPH-01①] 图切换经导航窗格下拉——role=listbox option）
  await win.getByRole('button', { name: '脉络', exact: true }).click()
  await win.getByTestId('lineage-nav-graph').click()
  await win.getByTestId('lineage-nav-graph-menu').getByRole('option', { name: '即将删除的图' }).click()
  await expect(nodeCard(win, 'S4 种子文献')).toBeVisible({ timeout: 10_000 })

  // 库页删除该文件夹（确认弹窗执行——图有资产〔1 节点 1 文献〕走弹窗路径）
  await win.getByRole('button', { name: '文献库' }).click()
  await win.locator('.lib-fn-row').filter({ hasText: '即将删除的图' }).click({ button: 'right' })
  await win.getByTestId('folder-menu').getByRole('menuitem', { name: '删除文件夹' }).click()
  await win.getByRole('dialog').getByRole('button', { name: '删除文件夹' }).click()

  // 脉络页：当前图失效→回退主图（__main__ 恒在场）+主图空态文案
  // [F-LGRAPH-01①] 主图空图走画布内通用空态（「该文件夹无脉络图」仅子图）
  await win.getByRole('button', { name: '脉络', exact: true }).click()
  await expect(win.getByTestId('lineage-graph-title')).toHaveText('主图', { timeout: 10_000 })
  await expect(win.getByText('该文件夹无脉络图')).toHaveCount(0)
  // [RR3/d1-ΔW1] exact 匹配：子串形态对旧文案「——添加节点」后缀同样命中
  // （文案修复无回归锁）——精确锁当前文案
  await expect(win.getByText('暂无脉络图', { exact: true })).toBeVisible({ timeout: 10_000 })
  await expect(nodeCard(win, 'S4 种子文献')).toHaveCount(0)

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
