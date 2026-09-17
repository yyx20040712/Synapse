import { test, expect } from '@playwright/test'
import { mkdtemp, readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { isTicketDone } from '../../tickets/registry'
import { createMultiPagePdf } from '../utils/pdf-factory'
import { bootstrapMigrations, launch, seedPaperRow } from './e2e-env'

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

function sha256hex(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex')
}

/**
 * AI 语料导出 e2e（SR2-AI-04，受锁）。
 * 全链：设置页发起（目录选择经 main 对话框——e2e 桩 showOpenDialog）→
 * AI-03 会话编排 → AI-02 提取器（真 pdfjs render→canvas→PNG——**渲染面首次
 * 真环境覆盖**，jsdom 单测不可达面）→ 磁盘五件套+manifest 一致（sha 口径
 * INV-17；e2e 面 INV-18）。
 * 中断语义不杀进程（CI 不稳定——票面裁决）：①篇失败序列=幽灵文献（源缺失→
 * errors[] 部分成功可见）②残留清空重建=旧产物+tmp 消失、目录根用户文件不动。
 * 会话超时兜底观察项（AI-03 r2 W1 不采记录）：v1=进程组同死语义——renderer
 * 挂死则窗口挂死，重启即清（无 manifest=工具不可激活），e2e 不模拟挂死场景。
 * 激活条件：main 侧链条三单 done（renderer 面随本工单原子提交——不依赖自身状态）。
 */
const DEPS = ['SR2-AI-01', 'SR2-AI-02', 'SR2-AI-03'] as const

test('AI 语料导出全链：设置页发起→五件套落盘+manifest 一致+部分成功可见+残留清空重建', async () => {
  const pending = DEPS.filter((d) => !isTicketDone(d))
  test.skip(pending.length > 0, `延期：依赖工单未完成 [${pending.join(', ')}]`)

  const userData = await mkdtemp(join(tmpdir(), 'synapse-aicorpus-'))
  const exportDir = await mkdtemp(join(tmpdir(), 'synapse-aicorpus-out-'))

  // 第一跳：让应用自己完成建库迁移（不 import src 内部模块——Playwright 不认 ?raw；
  // e2e-env.ts 单源——W1C 收敛）
  await bootstrapMigrations(userData)

  // 种子：两篇真实多页 PDF（提取面；标记词各异——sha 唯一约束）+一篇幽灵
  // （行在文件缺——篇失败序列）
  const papers = [
    { id: 'e2e-ai-a', title: 'AI 语料导出 e2e 甲文献', marker: 'AISENSOR-A-MARK' },
    { id: 'e2e-ai-b', title: 'AI 语料导出 e2e 乙文献', marker: 'AISENSOR-B-MARK' }
  ] as const
  for (const p of papers) {
    const bytes = createMultiPagePdf(2, p.marker)
    const sha = createHash('sha256').update(bytes).digest('hex')
    const fileRef = `${sha.slice(0, 2)}/${sha.slice(2, 4)}/${sha}.pdf`
    const abs = join(userData, 'files', ...fileRef.split('/'))
    mkdirSync(dirname(abs), { recursive: true })
    writeFileSync(abs, bytes)
    await seedPaperRow(userData, fileRef, sha, p.title, p.id)
  }
  const ghostSha = createHash('sha256').update('ai-sensor-ghost').digest('hex')
  const ghostRef = `${ghostSha.slice(0, 2)}/${ghostSha.slice(2, 4)}/${ghostSha}.pdf`
  await seedPaperRow(userData, ghostRef, ghostSha, 'AI 语料 e2e 幽灵文献', 'e2e-ai-ghost')

  // 残留布置：旧产物+tmp（清空重建断言面）+目录根用户文件（不动断言面）
  mkdirSync(join(exportDir, 'corpus'), { recursive: true })
  writeFileSync(join(exportDir, 'corpus', 'stale.md'), 'STALE PRODUCT')
  writeFileSync(join(exportDir, 'manifest.tmp.json'), '{"stale":true}')
  writeFileSync(join(exportDir, 'user-notes.txt'), 'USER FILE KEEPS')

  const app = await launch(userData)
  const win = await app.firstWindow()
  await expect(win.getByRole('button', { name: '设置' })).toBeVisible({ timeout: 20_000 })

  // 目录选择对话框桩（app.evaluate 注入 main——quit-dirty showMessageBox 同型；
  // INV-07 路径只出自 main 对话框，e2e 以桩替真实系统对话框）
  await app.evaluate((electronMod, dir) => {
    ;(
      electronMod.dialog as unknown as {
        showOpenDialog: () => Promise<{ canceled: boolean; filePaths: string[] }>
      }
    ).showOpenDialog = async () => ({ canceled: false, filePaths: [dir] })
  }, exportDir)

  await win.getByRole('button', { name: '设置' }).click()
  await win.getByRole('button', { name: '导出语料' }).click()

  // 终局反馈两锚：toast（INV-02——部分成功文案）+进度行（持久终局态）
  await expect(win.getByText('语料导出完成：2 篇（1 篇失败）')).toBeVisible({ timeout: 60_000 })
  await expect(win.getByTestId('corpus-export-progress')).toHaveText('完成 3/3，1 篇失败')

  // ── 磁盘五件套+manifest 一致（测试进程直读导出目录——路径在桩里已知） ──
  const manifest = JSON.parse(await readFile(join(exportDir, 'manifest.json'), 'utf8')) as {
    schemaVersion: number
    papers: Array<{
      paperId: string
      file: string
      title: string
      contentSha: string
      fulltextSha: string
      figures: string[]
    }>
    errors: Array<{ paperId: string; reason: string }>
  }
  expect(manifest.schemaVersion).toBe(1)
  expect(manifest.papers).toHaveLength(2)
  expect(new Set(manifest.papers.map((p) => p.paperId))).toEqual(new Set(papers.map((p) => p.id)))
  // 篇失败序列：幽灵文献进 errors[]（部分成功可见——与 toast/进度行三面一致）
  expect(manifest.errors).toEqual([{ paperId: 'e2e-ai-ghost', reason: '源 PDF 文件缺失' }])

  // INTERFACE.md（五件套成员）
  const interfaceMd = await readFile(join(exportDir, 'INTERFACE.md'), 'utf8')
  expect(interfaceMd).toContain('corpus')

  for (const p of manifest.papers) {
    // corpus md 存在+front-matter 头
    const md = await readFile(join(exportDir, p.file), 'utf8')
    expect(md.startsWith('---')).toBe(true)
    // 幂等 sha 口径（INV-17 e2e 面）：contentSha/fulltextSha=文件字节 sha256
    expect(sha256hex(md)).toBe(p.contentSha)
    const fulltext = await readFile(join(exportDir, 'fulltext', `${p.paperId}.txt`), 'utf8')
    expect(sha256hex(fulltext)).toBe(p.fulltextSha)
    // 全文=多页文本+\f 页界（真 pdfjs getTextContent 真环境链）
    const marker = papers.find((q) => q.id === p.paperId)?.marker
    expect(marker).toBeDefined()
    expect(fulltext).toContain(`P1 ${marker}`)
    expect(fulltext).toContain(`P2 ${marker}`)
    expect(fulltext.split('\f')).toHaveLength(2)
    // 页快照图（真 pdfjs render→canvas→PNG——AI-02 渲染面首次真环境覆盖）：
    // PNG magic bytes+非平凡体积（纯白页快照也有页框体积，>1KB 吞编码开销下限）
    for (let n = 1; n <= 2; n += 1) {
      const figPath = join(exportDir, 'figures', p.paperId, `page-${n}.png`)
      expect(existsSync(figPath), `页快照存在：${figPath}`).toBe(true)
      const png = await readFile(figPath)
      expect(png.length).toBeGreaterThan(1000)
      expect(png.subarray(0, 8).equals(PNG_MAGIC)).toBe(true)
    }
    // manifest figures 清单与磁盘一致（page-1/page-2）
    expect(p.figures).toEqual([
      `figures/${p.paperId}/page-1.png`,
      `figures/${p.paperId}/page-2.png`
    ])
  }

  // 残留清空重建（INV-18 e2e 面）：旧产物+tmp 消失；目录根用户文件不动
  expect(existsSync(join(exportDir, 'corpus', 'stale.md'))).toBe(false)
  expect(existsSync(join(exportDir, 'manifest.tmp.json'))).toBe(false)
  expect(await readFile(join(exportDir, 'user-notes.txt'), 'utf8')).toBe('USER FILE KEEPS')

  await app.close()
})

/**
 * F-SESS-01 renderer 重载格（受锁）：streaming 中 renderer reload（main 存活）
 * →webContents did-start-navigation→abortActiveSession→单飞锁释放；重进设置页
 * 再发起不再 EXPORT_BUSY，第二会话全链完成（端到端实证）。dialog 桩不随
 * renderer 重置（main 进程对象）。崩溃格（render-process-gone）同一 abort
 * 通道，e2e 不注入崩溃（同型处置单测覆盖）。always-active：实现与本测试同票
 * 原子落地，无依赖延期面（亦不新增 skipSites——指纹门 B2 口径）。
 */
test('F-SESS-01 renderer 重载格：streaming 中 reload→会话中止单飞释放→再发起全链完成', async () => {
  test.info().annotations.push({ type: 'note', description: 'F-SESS-01 renderer 重载格' })

  const userData = await mkdtemp(join(tmpdir(), 'synapse-aicorpus-'))
  const exportDir = await mkdtemp(join(tmpdir(), 'synapse-aicorpus-out-'))
  await bootstrapMigrations(userData)

  // 两篇种子（无幽灵——本格焦点=重载中止，非篇失败序列）
  const papers = [
    { id: 'e2e-ai-a', title: 'AI 语料导出 e2e 甲文献', marker: 'AISENSOR-A-MARK' },
    { id: 'e2e-ai-b', title: 'AI 语料导出 e2e 乙文献', marker: 'AISENSOR-B-MARK' }
  ] as const
  for (const p of papers) {
    const bytes = createMultiPagePdf(2, p.marker)
    const sha = createHash('sha256').update(bytes).digest('hex')
    const fileRef = `${sha.slice(0, 2)}/${sha.slice(2, 4)}/${sha}.pdf`
    const abs = join(userData, 'files', ...fileRef.split('/'))
    mkdirSync(dirname(abs), { recursive: true })
    writeFileSync(abs, bytes)
    await seedPaperRow(userData, fileRef, sha, p.title, p.id)
  }

  // 残留同旧 test（第二会话清空重建面照走）
  mkdirSync(join(exportDir, 'corpus'), { recursive: true })
  writeFileSync(join(exportDir, 'corpus', 'stale.md'), 'STALE PRODUCT')
  writeFileSync(join(exportDir, 'manifest.tmp.json'), '{"stale":true}')
  writeFileSync(join(exportDir, 'user-notes.txt'), 'USER FILE KEEPS')

  const app = await launch(userData)
  const win = await app.firstWindow()
  await expect(win.getByRole('button', { name: '设置' })).toBeVisible({ timeout: 20_000 })

  // 目录选择对话框桩（main 进程对象——reload 后仍在）
  await app.evaluate((electronMod, dir) => {
    ;(
      electronMod.dialog as unknown as {
        showOpenDialog: () => Promise<{ canceled: boolean; filePaths: string[] }>
      }
    ).showOpenDialog = async () => ({ canceled: false, filePaths: [dir] })
  }, exportDir)

  await win.getByRole('button', { name: '设置' }).click()
  await win.getByRole('button', { name: '导出语料' }).click()

  // streaming 实证：任一篇页快照落盘即 figure 回传在途（篇序=库序，不写死
  // 首篇身份——两篇任一 page-1.png 出现即 streaming）
  await expect
    .poll(() => papers.some((p) => existsSync(join(exportDir, 'figures', p.id, 'page-1.png'))), {
      timeout: 60_000
    })
    .toBe(true)

  // renderer 重载（main 存活）→did-start-navigation→abort（1-2s 跑完）
  await win.reload()
  await win.waitForTimeout(1500)

  // reload 后 UI 从库页起：重进设置页再发起——断言不再 EXPORT_BUSY（第二会话
  // 全链完成的端到端实证）
  await expect(win.getByRole('button', { name: '设置' })).toBeVisible({ timeout: 20_000 })
  await win.getByRole('button', { name: '设置' }).click()
  await win.getByRole('button', { name: '导出语料' }).click()
  await expect(win.getByText('语料导出完成：2 篇')).toBeVisible({ timeout: 60_000 })

  await app.close()
})
