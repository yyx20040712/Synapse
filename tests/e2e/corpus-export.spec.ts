import { test, expect, _electron as electron, type ElectronApplication } from '@playwright/test'
import { spawn } from 'node:child_process'
import { copyFile, mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { isTicketDone } from '../../tickets/registry'
import { createMultiPagePdf } from '../utils/pdf-factory'

/** 拉起子进程跑 seed-paper.mjs；退出码非 0 即拒绝（reader-text.spec 同型——
 *  本文件按 Rule of Three 第二次重复保留，第三次出现时抽共用基建） */
function runSeedScript(env: NodeJS.ProcessEnv): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [join(process.cwd(), 'tests', 'e2e', 'seed-paper.mjs')], {
      env,
      stdio: 'inherit'
    })
    child.on('exit', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`seed-paper.mjs 退出码 ${code ?? 'null'}`))
      }
    })
    child.on('error', reject)
  })
}

function launch(userData: string): Promise<ElectronApplication> {
  return electron.launch({
    args: ['out/main/index.js'],
    env: { ...process.env, SYNAPSE_USER_DATA: userData } as Record<string, string>
  })
}

/** 种子落库（better-sqlite3 双 ABI 处理——reader-text.spec 同型：备份 electron
 *  绑定→子进程用 node ABI 落库→finally 还原；Windows 文件锁决定必须子进程） */
async function seedPaperRow(
  userData: string,
  fileRef: string,
  sha: string,
  title: string,
  id: string
): Promise<void> {
  const pkgDir = join(process.cwd(), 'node_modules', 'better-sqlite3')
  const releaseBinding = join(pkgDir, 'build', 'Release', 'better_sqlite3.node')
  const cacheDir = join(pkgDir, 'abi-cache')
  const wanted = `node-v${process.versions.modules}`
  const dirs = (await readdir(cacheDir)).filter((d) => d.startsWith('node-v'))
  const pick = dirs.includes(wanted) ? wanted : (dirs.sort().at(-1) ?? '')
  if (!pick) throw new Error('abi-cache 缺 node 绑定——先跑 npm ci（postinstall 会 setup）')
  const electronBinding = await readFile(releaseBinding)
  await copyFile(join(cacheDir, pick, 'better_sqlite3.node'), releaseBinding)
  try {
    await runSeedScript({
      ...process.env,
      SEED_DB: join(userData, 'synapse.db'),
      SEED_FILE_REF: fileRef,
      SEED_SHA: sha,
      SEED_TITLE: title,
      SEED_ID: id
    } as NodeJS.ProcessEnv)
  } finally {
    await writeFile(releaseBinding, electronBinding)
  }
}

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

  // 第一跳：让应用自己完成建库迁移（不 import src 内部模块——Playwright 不认 ?raw）
  const seedApp = await launch(userData)
  await (await seedApp.firstWindow()).waitForTimeout(500)
  await seedApp.close()

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
