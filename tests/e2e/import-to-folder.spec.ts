import { test, expect, type ElectronApplication, type Page } from '@playwright/test'
import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { createTinyPdf } from '../utils/pdf-factory'
import { bootstrapMigrations, launch } from './e2e-env'

/**
 * [F-FOLDER-02·E/S2] import-to-folder e2e —— 「导入到」选择器全链（design
 * §4.5+主控细化口径：folder 筛选态默认=该文件夹；无筛选默认=仅入文献库）：
 * ①folder 目标导入→moveFolder 挂接→脉络节点自动建（真实 PDF 经 dialog 桩
 * ——corpus-export.spec 同型 app.evaluate 覆写 showOpenDialog）；②仅入文献库
 * →零节点行；③S2 导入进行中禁切文件夹/图（busy 全局信号）。
 * 断言锚真实渲染文本。
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
  const app = await launch(userData)
  const win = await app.firstWindow()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })

  // 建文件夹并进入 folder 筛选态（「导入到」默认口径的驱动面）
  await win.getByRole('button', { name: '+ 新建文件夹' }).click()
  await win.getByLabel('新文件夹名').fill('调研计划')
  await win.getByLabel('新文件夹名').press('Enter')
  await win.locator('button[aria-pressed]').filter({ hasText: '调研计划' }).click()

  // 默认目标=当前文件夹（自动建立脉络节点）——selected option 真文本
  // （poll：folders.list 名解析异步落定，首帧空名是合法中间态）
  const target = win.getByLabel('导入到')
  await expect(target).toBeVisible()
  await expect
    .poll(
      async () =>
        await target.evaluate(
          (el: HTMLSelectElement) => el.options[el.selectedIndex]?.textContent ?? ''
        ),
      { timeout: 10_000 }
    )
    .toContain('当前文件夹「调研计划」（自动建立脉络节点）')

  // 真实导入（dialog 桩→fromDialog→importFiles 全链+进度事件）
  await stubOpenDialog(app, [writePdf(userData, '自动入图论文')])
  await win.getByRole('button', { name: '导入 PDF 文件', exact: true }).click()
  await expect(win.getByText('自动入图论文')).toBeVisible({ timeout: 30_000 })

  // 脉络页：该文件夹图含新节点（节点自动建——moveFolder 移入分支）
  await win.getByRole('button', { name: '脉络', exact: true }).click()
  // [F-LGRAPH-01①U4] 顶栏并集切换器退役——图切换=导航窗格下拉
  await win.getByTestId('lineage-nav-graph').click()
  await win.getByTestId('lineage-nav-graph-menu').getByRole('option', { name: '调研计划' }).click()
  await expect(nodeCard(win, '自动入图论文')).toBeVisible({ timeout: 10_000 })

  await app.close()
})

test('仅入文献库：导入成功零脉络节点（无节点行——design 矩阵「导入→全部」）', async () => {
  const userData = await mkdtemp(join(tmpdir(), 'synapse-ff02-imp2-'))
  await bootstrapMigrations(userData)
  const app = await launch(userData)
  const win = await app.firstWindow()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })

  // [回炉 RR1-b] fixture 先建一文件夹（同 spec 首用例先例）——全域遍历 ≥2 图
  // （否则 folders 仅主图，逐图遍历名实不符）
  await win.getByRole('button', { name: '+ 新建文件夹' }).click()
  await win.getByLabel('新文件夹名').fill('目标夹乙')
  await win.getByLabel('新文件夹名').press('Enter')
  await expect(
    win.locator('button[aria-pressed]').filter({ hasText: '目标夹乙' })
  ).toBeVisible({ timeout: 10_000 })

  // 无 folder 筛选态：默认=仅入文献库（无节点）
  const target = win.getByLabel('导入到')
  const selectedLabel = await target.evaluate(
    (el: HTMLSelectElement) => el.options[el.selectedIndex]?.textContent ?? ''
  )
  expect(selectedLabel).toBe('仅入文献库（无节点）')

  await stubOpenDialog(app, [writePdf(userData, '仅入库论文')])
  await win.getByRole('button', { name: '导入 PDF 文件', exact: true }).click()
  await expect(win.getByText('仅入库论文')).toBeVisible({ timeout: 30_000 })

  // 脉络页缺省图（库页无文件夹筛选→主图——F-LGRAPH-01①U4 并集退役）：零该文献节点行
  await win.getByRole('button', { name: '脉络', exact: true }).click()
  await expect(win.getByText('暂无脉络图——添加节点')).toBeVisible({ timeout: 10_000 })
  await expect(nodeCard(win, '仅入库论文')).toHaveCount(0)
  // [回炉 R3] 并集退役后主图视角漏检非主图误建——全域负锚：遍历导航窗格
  // 全部图逐一切换，逐图断言零该文献节点（并集视角退役的等强度补偿）
  await win.getByTestId('lineage-nav-graph').click()
  const graphOptions = await win.getByTestId('lineage-nav-graph-menu').getByRole('option').all()
  expect(graphOptions.length).toBeGreaterThanOrEqual(2) // [RR1-b] 主图+目标夹乙两图起
  for (const opt of graphOptions) {
    await opt.click()
    // [回炉 RR1-a] 落定信号先行：切图=loading（整页替换，空态文案离场）→ready
    // 后空态文案回场——两相位消除「断言打在 loading/旧图 DOM」假绿窗
    await expect(win.getByText('正在加载脉络图…')).toBeVisible({ timeout: 3_000 }).catch(() => {
      // 快机 loading 窗可能已错过——由下行消失相位兜底（文案本就不在场）
    })
    await expect(win.getByText('正在加载脉络图…')).toHaveCount(0, { timeout: 10_000 })
    await expect(win.getByText('暂无脉络图——添加节点')).toBeVisible({ timeout: 10_000 }) // ready 落定锚
    await expect(win.getByTestId('lineage-save-status')).toHaveCount(0, { timeout: 10_000 })
    await expect(nodeCard(win, '仅入库论文')).toHaveCount(0)
    await win.getByTestId('lineage-nav-graph').click()
  }

  await app.close()
})

test('S2：导入进行中禁切文件夹与图（busy 全局信号→chip/切换器 disabled）', async () => {
  const userData = await mkdtemp(join(tmpdir(), 'synapse-ff02-imp3-'))
  await bootstrapMigrations(userData)
  const app = await launch(userData)
  const win = await app.firstWindow()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })

  // 先建一文件夹（busy 断言目标 chip）；批量 PDF 拉长 busy 窗口（80 份逐一
  // copy+sha+extract——秒级窗口保障 disabled 断言可观测）
  await win.getByRole('button', { name: '+ 新建文件夹' }).click()
  await win.getByLabel('新文件夹名').fill('批量夹')
  await win.getByLabel('新文件夹名').press('Enter')
  const chip = win.locator('button[aria-pressed]').filter({ hasText: '批量夹' })
  await expect(chip).toBeVisible({ timeout: 10_000 })

  const paths = Array.from({ length: 80 }, (_, i) => writePdf(userData, `批量导入文献 ${i + 1}`))
  await stubOpenDialog(app, paths)
  await win.getByRole('button', { name: '导入 PDF 文件', exact: true }).click()

  // busy 窗口内：文件夹 chip 禁切（导入中切换会被拒——S2）。跨页消费面
  // （脉络页图下拉同 busy 禁切）=单测承载（nav-graph-picker S2 用例
  // ——e2e 跨页导航与 busy 窗口存在结构性竞态，不锚不稳定断言）
  await expect(chip).toBeDisabled({ timeout: 30_000 })
  await expect(win.locator('button[aria-pressed]').filter({ hasText: '全部文献' })).toBeDisabled()

  // 终局：导入完成 toast 可见后 busy 复位（80 份全成功+chip 回可切）
  await expect(win.getByText('导入完成：成功 80', { exact: false })).toBeVisible({
    timeout: 120_000
  })
  await expect(chip).toBeEnabled({ timeout: 30_000 })

  await app.close()
})
