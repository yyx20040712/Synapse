import { test, expect } from '@playwright/test'
import { mkdtemp } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { isTicketDone } from '../../tickets/registry'
import { createTinyPdf } from '../utils/pdf-factory'
import { launch, seedPaperRow } from './e2e-env'

/**
 * P7E-04 导出剪贴板 e2e（装配级，1 综合用例）。
 * 全链：种子 1 篇真实 PDF → 文献库列表选中 → 详情面板「复制 BibTeX」→
 * 主进程 clipboard.readText 读回断言含 @+title（P7-A 先例——渲染侧 readText
 * 无权限，主进程读取即真实系统剪贴板，集成语义不打折）+toast 可见（INV-02）。
 * 剪贴板竞态防线同型 reader-text.spec P7-A 用例：清场标记覆盖外部旧值+
 * 条件重读 5×200ms（标记值/空串=写入未落盘继续轮询，超时红带末次读值）。
 * 激活条件：库列表/详情面板链既有工单（本票面随实现原子生效，不依赖自身状态）。
 */
const DEPS = ['SR-LIB-01', 'SR-LIB-02', 'SR2-C-06'] as const

test.setTimeout(120_000)

test('P7E-04 导出剪贴板：详情面板「复制 BibTeX」→主进程剪贴板读回含 @+title', async () => {
  const pending = DEPS.filter((d) => !isTicketDone(d))
  test.skip(pending.length > 0, `延期：依赖工单未完成 [${pending.join(', ')}]`)

  const title = '智慧水务 剪贴板 e2e 文献'
  const userData = await mkdtemp(join(tmpdir(), 'synapse-clip-'))

  // 第一跳：让应用自己完成建库迁移（不 import src 内部模块——corpus-export 同型）
  const seedApp = await launch(userData)
  await (await seedApp.firstWindow()).waitForTimeout(500)
  await seedApp.close()

  // 种子：1 篇真实单页 PDF（sha 唯一约束——content-addressed files/ 布局）
  const bytes = createTinyPdf(title)
  const sha = createHash('sha256').update(bytes).digest('hex')
  const fileRef = `${sha.slice(0, 2)}/${sha.slice(2, 4)}/${sha}.pdf`
  const abs = join(userData, 'files', ...fileRef.split('/'))
  mkdirSync(dirname(abs), { recursive: true })
  writeFileSync(abs, bytes)
  await seedPaperRow(userData, fileRef, sha, title, 'e2e-clip-paper')

  const app = await launch(userData)
  const win = await app.firstWindow()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
  await win.getByText(title).first().click()
  await expect(win.getByRole('button', { name: '复制 BibTeX' })).toBeVisible({ timeout: 20_000 })

  await app.evaluate(({ clipboard }) => clipboard.writeText('__p7e04_cleared__'))
  await win.getByRole('button', { name: '复制 BibTeX' }).click()
  await expect(win.getByText('已复制 1 条题录到剪贴板')).toBeVisible({ timeout: 20_000 })
  let clipped = ''
  for (let i = 0; i < 5; i++) {
    clipped = await app.evaluate(({ clipboard }) => clipboard.readText())
    if (clipped.includes('@') && clipped.includes(title)) break
    await win.waitForTimeout(200)
  }
  expect(clipped, `剪贴板末次读值（标记=写入未落盘；其他=外部再改写）：${JSON.stringify(clipped)}`).toContain('@')
  expect(clipped, `剪贴板末次读值（标记=写入未落盘；其他=外部再改写）：${JSON.stringify(clipped)}`).toContain(title)
  await app.close()
})
