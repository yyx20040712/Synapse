import { test, expect, type ElectronApplication } from '@playwright/test'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createRasterFigurePdf, PDF_RASTER_TITLE } from '../utils/pdf-factory'
import { bootstrapMigrations, launch, seedPaperRow } from './e2e-env'

/**
 * [F-VISFB-43 裁决部 P1-2] 图表提取正向 e2e（任务书 §5-43/§7 票面明示验收：
 * 导入后出真实图表 `<img>` naturalWidth>0——真图加载断言，非 src 赋值即断）。
 * 全链=真实导入（dialog 桩→importFiles→进度事件）→App 提取桥（importProgress
 * done 沿）→FigureExtractor（app-file:// 加载+XObject 解码+PNG 编码）→figures/
 * store 逐笔 IPC→job ready→文献库抽屉信息区 <img src=app-file://…/figures/…>
 * →naturalWidth>0（协议分支读真 PNG 字节）。负向伴生（矢量页零提取）=单测
 * 锚在档（figure-negative-anchors+FigureExtractor 矢量用例），e2e 不重复。
 * fixture=tests/utils/pdf-factory createRasterFigurePdf（400×300px 绘制于
 * 300×225pt——三阈值全过；纯核快验=evidence/43-adjud-p1-fixture.raw.txt）。
 */

/** main 侧对话框桩（INV-07 路径只出自 main 对话框——import-to-folder 同族先例） */
async function stubOpenDialog(app: ElectronApplication, paths: string[]): Promise<void> {
  await app.evaluate((electronMod, fixed) => {
    ;(
      electronMod.dialog as unknown as {
        showOpenDialog: () => Promise<{ canceled: boolean; filePaths: string[] }>
      }
    ).showOpenDialog = async () => ({ canceled: false, filePaths: fixed })
  }, paths)
}

/** window.api 最小面（evaluate 内消费——figures/library 两域只读） */
interface ApiProbe {
  library: { list(q: Record<string, unknown>): Promise<{ ok: boolean; data: { items: { id: string; title: string }[] } }> }
  figures: {
    list(q: { paperId: string }): Promise<{
      ok: boolean
      data: { figures: { figureId: string }[]; job: { status: string; excess: number; failedCount: number } | null }
    }>
  }
}

test('导入 raster PDF→提取桥驱动→信息区真图 naturalWidth>0（§7 正向验收）', async () => {
  const userData = await mkdtemp(join(tmpdir(), 'synapse-visfb43-e2e-'))
  await bootstrapMigrations(userData)
  // 预播种破引导态（INV-87——import-to-folder 同型）
  await seedPaperRow(userData, 'a.pdf', 'sha-visfb43-guide', '破引导态文献', 'e2e-visfb43-guide')
  const src = join(userData, 'raster-figure.pdf')
  await writeFile(src, createRasterFigurePdf())

  const app = await launch(userData)
  const win = await app.firstWindow()
  // 诊断沿：renderer console（提取桥 warn 面）转测跑日志——失败归因可见
  win.on('console', (msg) => {
    const text = msg.text()
    if (text.includes('[figures]')) console.log(`[renderer-console] ${text}`)
  })
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })

  // 真实导入（dialog 桩→fromDialog 全链：file-store 拷贝→入库→建单→进度事件）
  await stubOpenDialog(app, [src])
  await win.getByRole('button', { name: '导入 PDF', exact: true }).click()
  const row = win.locator('.lib-row', { hasText: PDF_RASTER_TITLE })
  await expect(row).toBeVisible({ timeout: 20_000 })

  // 提取管线终态轮询（window.api 面——桥真实驱动非测试注入）：job ready 且 ≥1 资产
  const paperId = await win.evaluate(async (title) => {
    const api = (window as unknown as { api: ApiProbe }).api
    const r = await api.library.list({})
    if (!r.ok) return ''
    return r.data.items.find((it) => it.title === title)?.id ?? ''
  }, PDF_RASTER_TITLE)
  expect(paperId).not.toBe('')

  await expect
    .poll(
      async () =>
        win.evaluate(async (pid) => {
          const api = (window as unknown as { api: ApiProbe }).api
          const r = await api.figures.list({ paperId: pid })
          if (!r.ok) return 'err'
          if (r.data.job?.status === 'ready' && r.data.figures.length > 0) return 'ready'
          return `wait:${r.data.job?.status ?? 'none'}:${String(r.data.figures.length)}:${String(r.data.job?.failedCount ?? -1)}`
        }, paperId),
      { timeout: 60_000 }
    )
    .toBe('ready')

  // 信息区真图加载：抽屉打开→strip img 出现→naturalWidth>0（协议分支真 PNG 字节）
  await row.click()
  const drawer = win.locator('.lib-drawer')
  await expect(drawer.getByTestId('paper-info-section')).toBeVisible({ timeout: 10_000 })
  await expect
    .poll(
      async () => {
        const img = drawer.locator('.pi-strip img')
        if ((await img.count()) === 0) return -1
        return img.evaluate((el) => (el as HTMLImageElement).naturalWidth)
      },
      { timeout: 20_000 }
    )
    .toBeGreaterThan(0)

  await app.close()
})
