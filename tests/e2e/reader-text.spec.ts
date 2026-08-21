import { test, expect, _electron as electron, type ElectronApplication } from '@playwright/test'
import { mkdtemp } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import Database from 'better-sqlite3'
import { isTicketDone } from '../../tickets/registry'
import { createTinyPdf, PDF_KNOWN_TEXT } from '../utils/pdf-factory'

/**
 * 阅读器 e2e：断言渲染出 PDF 里的真实文本。
 * 历史教训 D1/L7：Synapse 52 个测试全绿但文字不可见——运行时视觉验证必须存在。
 * 激活条件：SR-RDR-02（PDF 渲染）完成（翻 registry 状态）。
 */
const TICKET = 'SR-RDR-02'
test.skip(!isTicketDone(TICKET), `${TICKET} 延期：阅读器未实现`)

function launch(userData: string): Promise<ElectronApplication> {
  return electron.launch({
    args: ['out/main/index.js'],
    env: { ...process.env, SYNAPSE_USER_DATA: userData } as Record<string, string>
  })
}

test('打开文献后页面渲染出已知文本', async () => {
  const userData = await mkdtemp(join(tmpdir(), 'synapse-reader-'))

  // 第一跳：让应用自己完成建库迁移（不 import src 内部模块——Playwright 不认 ?raw）
  const seedApp = await launch(userData)
  await (await seedApp.firstWindow()).waitForTimeout(500)
  await seedApp.close()

  // 落库：一篇文献 + 受管文件（绕过 UI 导入——导入流程由 smoke/单测覆盖）
  const bytes = createTinyPdf(`智慧水务 e2e 测试文献 ${PDF_KNOWN_TEXT}`)
  const sha = createHash('sha256').update(bytes).digest('hex')
  const fileRef = `${sha.slice(0, 2)}/${sha.slice(2, 4)}/${sha}.pdf`
  const abs = join(userData, 'files', ...fileRef.split('/'))
  mkdirSync(dirname(abs), { recursive: true })
  writeFileSync(abs, bytes)
  const db = new Database(join(userData, 'synapse.db'))
  db.prepare(
    `INSERT INTO papers (id, file_ref, sha256, title, added_at, updated_at)
     VALUES (?, ?, ?, ?, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')`
  ).run('e2e-seed-paper', fileRef, sha, '智慧水务 e2e 测试文献')
  db.close()

  // 第二跳：真实断言
  const app = await launch(userData)
  const win = await app.firstWindow()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })

  await win.getByText('智慧水务 e2e 测试文献').first().dblclick()
  await expect(win.getByText(PDF_KNOWN_TEXT).first()).toBeVisible({ timeout: 20_000 })
  await app.close()
})
