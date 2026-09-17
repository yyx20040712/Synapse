import { test, expect } from '@playwright/test'
import { copyFile, mkdtemp, readdir, readFile, writeFile } from 'node:fs/promises'
import { mkdirSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { spawn } from 'node:child_process'
import { isTicketDone } from '../../tickets/registry'
import { createTinyPdf } from '../utils/pdf-factory'
import { bootstrapMigrations, launch, seedPaperRow } from './e2e-env'

/**
 * P7E-05 阅读时长 e2e（装配级显示面冒烟，1 综合用例）。
 * 链：建库 v8→种子 1 篇真实 PDF→**降级 v7**（DROP COLUMN reading_seconds+
 * user_version=7——存量库形态）→重启应用（migrate 补 008 加列，存量行补 0=
 * 升级链不崩）→文献库选中→详情面板「阅读」行「0 分钟」在场（008→repo→
 * PaperDetail→UI 全链，DEFAULT 0 直读）。时间流逝不加速不断言（票面申报：
 * 计时面以注入 now 单测全锚，本 spec 只做显示面+迁移升级链冒烟）。
 * 降级子进程=spawn -e（不落盘脚本；ABI 切换照 e2e-env.seedPaperRow 形态——
 * 受锁件禁改，本地第二份，Rule of Three 保持重复）。
 * 激活条件：库列表/详情面板链既有工单（本票面随实现原子生效）。
 */
const DEPS = ['SR-LIB-01', 'SR-LIB-02', 'SR2-C-06'] as const

test.setTimeout(120_000)

/** 子进程把库降级为 v7 形（DROP COLUMN+PRAGMA user_version=7——存量库模拟） */
async function downgradeToV7(userData: string): Promise<void> {
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
    const sql = 'ALTER TABLE papers DROP COLUMN reading_seconds; PRAGMA user_version = 7;'
    await new Promise<void>((resolve, reject) => {
      const child = spawn(
        process.execPath,
        [
          '-e',
          'const D=require("better-sqlite3");const db=D(process.argv[1]);try{db.exec(process.argv[2])}finally{db.close()}',
          join(userData, 'synapse.db'),
          sql
        ],
        { env: process.env, stdio: 'inherit' }
      )
      child.on('exit', (code) => {
        if (code === 0) {
          resolve()
        } else {
          reject(new Error(`降级子进程退出码 ${code ?? 'null'}`))
        }
      })
      child.on('error', reject)
    })
  } finally {
    await writeFile(releaseBinding, electronBinding)
  }
}

test('P7E-05 阅读时长：存量库升级链不崩+详情面板「阅读 0 分钟」在场', async () => {
  const pending = DEPS.filter((d) => !isTicketDone(d))
  test.skip(pending.length > 0, `延期：依赖工单未完成 [${pending.join(', ')}]`)

  const title = '智慧水务 阅读时长 e2e 文献'
  const userData = await mkdtemp(join(tmpdir(), 'synapse-rt-'))

  // 第一跳：让应用自己完成建库迁移（不 import src 内部模块——export-clipboard 同型）
  await bootstrapMigrations(userData)

  // 种子：1 篇真实单页 PDF（sha 唯一约束——content-addressed files/ 布局）
  const bytes = createTinyPdf(title)
  const sha = createHash('sha256').update(bytes).digest('hex')
  const fileRef = `${sha.slice(0, 2)}/${sha.slice(2, 4)}/${sha}.pdf`
  const abs = join(userData, 'files', ...fileRef.split('/'))
  mkdirSync(dirname(abs), { recursive: true })
  writeFileSync(abs, bytes)
  await seedPaperRow(userData, fileRef, sha, title, 'e2e-reading-time-paper')

  // 降级 v7（存量库形态：无 reading_seconds 列+user_version=7）
  await downgradeToV7(userData)

  // 重启：migrate 补 008（加列+存量行补 0）——升级链不崩=应用可进列表
  const app = await launch(userData)
  const win = await app.firstWindow()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
  await win.getByText(title).first().click()
  // 显示面冒烟：meta 区「阅读」行「0 分钟」在场（DEFAULT 0 直读全链）
  await expect(win.getByText('阅读', { exact: true })).toBeVisible({ timeout: 20_000 })
  await expect(win.getByText('0 分钟', { exact: true })).toBeVisible()
  await app.close()
})
