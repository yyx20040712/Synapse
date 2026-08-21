import { test, expect, _electron as electron, type ElectronApplication } from '@playwright/test'
import { copyFile, mkdtemp, readdir, readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { isTicketDone } from '../../tickets/registry'
import { createTinyPdf, PDF_KNOWN_TEXT } from '../utils/pdf-factory'

/**
 * 阅读器 e2e：断言渲染出 PDF 里的真实文本。
 * 历史教训 D1/L7：Synapse 52 个测试全绿但文字不可见——运行时视觉验证必须存在。
 * 激活条件：渲染链路的全部依赖工单完成（PdfCanvas 渲染 / 列表 / 页面组装）——
 * 只看 SR-RDR-02 会在依赖未就绪时以「非实现错误」的方式误红。
 */
const DEPS = ['SR-RDR-02', 'SR-LIB-01', 'SR-LIB-02', 'SR-RDR-04'] as const
const pending = DEPS.filter((d) => !isTicketDone(d))
test.skip(pending.length > 0, `延期：依赖工单未完成 [${pending.join(', ')}]`)

function launch(userData: string): Promise<ElectronApplication> {
  return electron.launch({
    args: ['out/main/index.js'],
    env: { ...process.env, SYNAPSE_USER_DATA: userData } as Record<string, string>
  })
}

/**
 * 种子落库（better-sqlite3 双 ABI 处理）：
 * e2e 前构建链已把 build/Release 切到 electron ABI，而本测试进程是 Node——
 * 直接 new Database 会 NODE_MODULE_VERSION 崩溃。做法：备份当前绑定 → 换上
 * abi-cache 里本进程 ABI 的 node 绑定 → 动态 import 落库 → finally 恢复 electron
 * 绑定（后续 electron.launch 依赖它）。
 */
async function seedPaperRow(userData: string, fileRef: string, sha: string, title: string): Promise<void> {
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
    const { default: Database } = await import('better-sqlite3')
    const db = new Database(join(userData, 'synapse.db'))
    try {
      db.prepare(
        `INSERT INTO papers (id, file_ref, sha256, title, added_at, updated_at)
         VALUES ('e2e-seed-paper', ?, ?, ?, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')`
      ).run(fileRef, sha, title)
    } finally {
      db.close()
    }
  } finally {
    await writeFile(releaseBinding, electronBinding)
  }
}

test('打开文献后页面渲染出已知文本', async () => {
  const userData = await mkdtemp(join(tmpdir(), 'synapse-reader-'))

  // 第一跳：让应用自己完成建库迁移（不 import src 内部模块——Playwright 不认 ?raw）
  const seedApp = await launch(userData)
  await (await seedApp.firstWindow()).waitForTimeout(500)
  await seedApp.close()

  // 受管文件（绕过 UI 导入——导入流程由 smoke/单测覆盖）
  const bytes = createTinyPdf(`智慧水务 e2e 测试文献 ${PDF_KNOWN_TEXT}`)
  const sha = createHash('sha256').update(bytes).digest('hex')
  const fileRef = `${sha.slice(0, 2)}/${sha.slice(2, 4)}/${sha}.pdf`
  const abs = join(userData, 'files', ...fileRef.split('/'))
  mkdirSync(dirname(abs), { recursive: true })
  writeFileSync(abs, bytes)
  await seedPaperRow(userData, fileRef, sha, '智慧水务 e2e 测试文献')

  // 第二跳：真实断言
  const app = await launch(userData)
  const win = await app.firstWindow()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })

  await win.getByText('智慧水务 e2e 测试文献').first().dblclick()
  await expect(win.getByText(PDF_KNOWN_TEXT).first()).toBeVisible({ timeout: 20_000 })
  await app.close()
})
