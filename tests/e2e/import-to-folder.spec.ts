import { test, expect, type ElectronApplication, type Page } from '@playwright/test'
import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { createTinyPdf } from '../utils/pdf-factory'
import { bootstrapMigrations, launch, seedPaperRow } from './e2e-env'

/**
 * [F-FOLDER-02·E/S2→F-UIRES-01 批 A U2] import-to-folder e2e —— 导入目标恒定
 * 全链（R2：folder 态=该文件夹；无筛选/未归档=主图 MAIN_GRAPH_ID 挂接——
 * 「仅入文献库」选项随 2026-09-30 用户裁决退役，ImportTargetSelect 删除）：
 * ①folder 目标导入→moveFolder 挂接→脉络节点自动建（真实 PDF 经 dialog 桩）；
 * ②无筛选态导入→主图挂接（节点建在主图——目标恒定语义新口径）；③S2 导入
 * 进行中禁切导航行/图（busy 全局信号）。断言锚真实渲染文本（导入到：X）。
 */

/** 真实 PDF 落受管存储位（sha 寻址——corpus-export 同型）+返回路径 */
function writePdf(userData: string, title: string): string {
  const bytes = createTinyPdf(title)
  const sha = createHash('sha256').update(bytes).digest('hex')
  const abs = join(userData, 'files', sha.slice(0, 2), sha.slice(2, 4), `${sha}.pdf`)
  mkdirSync(dirname(abs), { recursive: true })
  writeFileSync(abs, bytes)
  return abs
}

/** main 侧对话框桩：showOpenDialog 恒返 paths（INV-07 路径只出自 main 对话框，
 *  e2e 以桩替真实系统对话框——corpus-export.spec:73 同族先例） */
async function stubOpenDialog(app: ElectronApplication, paths: string[]): Promise<void> {
  await app.evaluate((electronMod, fixed) => {
    ;(
      electronMod.dialog as unknown as {
        showOpenDialog: () => Promise<{ canceled: boolean; filePaths: string[] }>
      }
    ).showOpenDialog = async () => ({ canceled: false, filePaths: fixed })
  }, paths)
}

const nodeCard = (win: Page, title: string) => win.locator('.tl-card[data-node-id]').filter({ hasText: title })

test('导入到当前文件夹：真实 PDF 导入→moveFolder 挂接→脉络节点自动建', async () => {
  const userData = await mkdtemp(join(tmpdir(), 'synapse-ff02-imp1-'))
  await bootstrapMigrations(userData)
  // [RR1-14/e2e F3] 预播种破引导态（INV-87：fresh 库 0 篇=新建入口/未归档行隐藏）
  await seedPaperRow(userData, 'a.pdf', 'sha-rr14-a', 'RR1 破引导态文献', 'e2e-rr14-a')
  const app = await launch(userData)
  const win = await app.firstWindow()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })

  // 建文件夹并进入 folder 筛选态（导入目标的驱动面——FolderNav 导航行）
  await win.getByRole('button', { name: '+ 新建文件夹' }).click()
  await win.getByLabel('新文件夹名').fill('调研计划')
  await win.getByLabel('新文件夹名').press('Enter')
  await win.locator('.lib-fn-row').filter({ hasText: '调研计划' }).click()

  // 目标恒定（R2）：导入条恒显「导入到：调研计划」（poll：名解析异步落定）
  const target = win.locator('.lib-import-target')
  await expect(target).toBeVisible()
  await expect
    .poll(async () => target.evaluate((el) => el.textContent ?? ''), { timeout: 10_000 })
    .toContain('导入到：')
  await expect
    .poll(async () => target.evaluate((el) => el.textContent ?? ''), { timeout: 10_000 })
    .toContain('调研计划')

  // 真实导入（dialog 桩→fromDialog→importFiles 全链+进度事件；按钮=「导入 PDF」R4）
  await stubOpenDialog(app, [writePdf(userData, '自动入图论文')])
  await win.getByRole('button', { name: '导入 PDF', exact: true }).click()
  await expect(win.getByText('自动入图论文')).toBeVisible({ timeout: 30_000 })

  // 脉络页：该文件夹图含新节点（节点自动建——moveFolder 移入分支）
  await win.getByRole('button', { name: '脉络', exact: true }).click()
  await win.getByTestId('lineage-nav-graph').click()
  await win.getByTestId('lineage-nav-graph-menu').getByRole('option', { name: '调研计划' }).click()
  await expect(nodeCard(win, '自动入图论文')).toBeVisible({ timeout: 10_000 })

  await app.close()
})

test('无筛选态：导入→主图挂接（目标恒定=主图——「仅入文献库」退役新口径）', async () => {
  const userData = await mkdtemp(join(tmpdir(), 'synapse-ff02-imp2-'))
  await bootstrapMigrations(userData)
  const app = await launch(userData)
  const win = await app.firstWindow()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })

  // 无 folder 筛选态：目标徽标=「导入到：主图」（R2 主图挂接口径——非零节点）
  const target = win.locator('.lib-import-target')
  await expect
    .poll(async () => target.evaluate((el) => el.textContent ?? ''), { timeout: 10_000 })
    .toContain('主图')
  // 旧选择器退役负锚（ImportTargetSelect 删除）
  await expect(win.locator('select[aria-label="导入到"]')).toHaveCount(0)

  await stubOpenDialog(app, [writePdf(userData, '主图挂接论文')])
  await win.getByRole('button', { name: '导入 PDF', exact: true }).click()
  await expect(win.getByText('主图挂接论文')).toBeVisible({ timeout: 30_000 })

  // 脉络页缺省图（库页无文件夹筛选→主图）：主图含新节点（目标恒定语义）
  await win.getByRole('button', { name: '脉络', exact: true }).click()
  await expect(nodeCard(win, '主图挂接论文')).toBeVisible({ timeout: 10_000 })

  await app.close()
})

test('S2：导入进行中禁切导航行与图（busy 全局信号→导航行/切换器 disabled）', async () => {
  const userData = await mkdtemp(join(tmpdir(), 'synapse-ff02-imp3-'))
  await bootstrapMigrations(userData)
  // [RR1-14/e2e F4] 预播种破引导态（同 F3——建夹路径依赖新建入口可达）
  await seedPaperRow(userData, 'a.pdf', 'sha-rr14-b', 'RR1 破引导态文献乙', 'e2e-rr14-b')
  const app = await launch(userData)
  const win = await app.firstWindow()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })

  // 先建一文件夹（busy 断言目标行）；批量 PDF 拉长 busy 窗口（80 份逐一
  // copy+sha+extract——秒级窗口保障 disabled 断言可观测）
  await win.getByRole('button', { name: '+ 新建文件夹' }).click()
  await win.getByLabel('新文件夹名').fill('批量夹')
  await win.getByLabel('新文件夹名').press('Enter')
  const row = win.locator('.lib-fn-row').filter({ hasText: '批量夹' })
  await expect(row).toBeVisible({ timeout: 10_000 })

  const paths = Array.from({ length: 80 }, (_, i) => writePdf(userData, `批量导入文献 ${i + 1}`))
  await stubOpenDialog(app, paths)
  await win.getByRole('button', { name: '导入 PDF', exact: true }).click()

  // busy 窗口内：导航行禁切（导入中切换会被拒——S2）。跨页消费面
  // （脉络页图下拉同 busy 禁切）=单测承载（e2e 跨页导航与 busy 窗口存在
  // 结构性竞态，不锚不稳定断言）
  await expect(row).toBeDisabled({ timeout: 30_000 })
  await expect(win.locator('.lib-fn-row').filter({ hasText: '全部文献' })).toBeDisabled()

  // 终局：导入完成 toast 可见后 busy 复位（80 份全成功+导航行回可切）
  await expect(win.getByText('导入完成：成功 80', { exact: false })).toBeVisible({
    timeout: 120_000
  })
  await expect(row).toBeEnabled({ timeout: 30_000 })

  await app.close()
})
