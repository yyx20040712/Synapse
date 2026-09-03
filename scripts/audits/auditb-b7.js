/**
 * AUDIT-B B7 取证探针 —— tags upsert 纯空格名 trim 后空串入库（P7E-01 已知边界）。
 *
 * 配方（简报 B7 行）：
 *  - 动态真库：临时 userData launch（建 schema）→ 真实 IPC 面调
 *    window.api.tags.upsert({ name: '   ' })（zod min(1) 对 3 空格放行）→
 *    断言应答形状 → 关应用 → node ABI 子进程开真库数 tags 行（name='' 计数）。
 *  - 对照组：upsert('  对照  ')（trim 正常面）+ rename 纯空格（先例 INVALID_REQUEST）
 *    + list 应答（空名标签是否浮出 UI 数据面）。
 *  - ABI 纪律：better-sqlite3 绑定备份→换 node ABI→子进程查库→finally 还原
 *    （Windows 文件锁决定必须子进程——e2e-env.ts seedPaperRow 同型）。
 * 产物：scripts/audits/auditb-out/b7.json
 * 用法：node scripts/audits/auditb-b7.js（需先 build；无头禁开可见窗口）
 */
import { _electron as electron } from '@playwright/test'
import { copyFile, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { existsSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawn } from 'node:child_process'

const ROOT = process.cwd()
const OUT = join(ROOT, 'scripts', 'audits', 'auditb-out')
const R = { meta: { script: 'auditb-b7.js', date: new Date().toISOString() }, steps: {} }
const log = (...a) => console.log(`[b7 ${new Date().toISOString().slice(11, 19)}]`, ...a)

/** node ABI 子进程执行 JS 片段（Windows 文件锁：加载过原生模块的进程不能原地还原） */
function runNodeSnippet(bindingSwapped, code) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--input-type=module', '-e', code], { stdio: ['ignore', 'pipe', 'pipe'] })
    let out = ''
    let err = ''
    child.stdout.on('data', (d) => (out += d))
    child.stderr.on('data', (d) => (err += d))
    child.on('exit', (c) => (c === 0 ? resolve(out) : reject(new Error(`snippet 退出码 ${c}: ${err}`))))
    child.on('error', reject)
  })
}

async function main() {
  if (!existsSync(join(ROOT, 'out', 'main', 'index.js'))) throw new Error('先 build')
  await mkdir(OUT, { recursive: true })
  const userData = join(tmpdir(), 'synapse-auditb-b7')
  await rm(userData, { recursive: true, force: true })

  // 1) 首次 launch 建 schema（空库初始化——reader-text.spec 同型次序）
  let app = await electron.launch({ args: ['out/main/index.js'], env: { ...process.env, SYNAPSE_USER_DATA: userData } })
  let win = await app.firstWindow()
  await win.getByRole('button', { name: '文献库' }).waitFor({ timeout: 30_000 })
  await win.waitForTimeout(600)

  // 2) 真实 IPC 面：upsert 纯空格（3 空格过 zod min(1)）+ trim 对照 + rename 对照
  R.steps.upsertSpaces = await win.evaluate(async () => {
    const r = await window.api.tags.upsert({ name: '   ' })
    return { ok: r.ok, data: r.ok ? r.data : null, error: r.ok ? null : r.error }
  })
  log('upsert(3 空格) 应答', JSON.stringify(R.steps.upsertSpaces))

  R.steps.upsertTrimControl = await win.evaluate(async () => {
    const r = await window.api.tags.upsert({ name: '  对照标签  ' })
    return { ok: r.ok, name: r.ok ? r.data.name : null }
  })
  log('upsert(  对照标签  ) 应答', JSON.stringify(R.steps.upsertTrimControl))

  // rename 先例对照：纯空格 → 期望 INVALID_REQUEST（票面 §⑤ 已知先例）
  R.steps.renameSpaces = await win.evaluate(async () => {
    const r = await window.api.tags.rename({ tagId: 'nonexistent', name: '   ' })
    if (r.ok) return { ok: true }
    return { ok: false, code: r.error?.code ?? null, message: r.error?.message ?? null }
  })
  log('rename(纯空格, 不存在 id) 应答', JSON.stringify(R.steps.renameSpaces))

  // list 数据面：空名标签是否浮出
  R.steps.list = await win.evaluate(async () => {
    const r = await window.api.tags.list()
    return r.ok ? r.data.map((t) => ({ id: t.id, name: t.name, paperCount: t.paperCount })) : null
  })
  log('list', JSON.stringify(R.steps.list))

  await app.close()

  // 3) 真库断言：换 node ABI → 子进程 SELECT → 还原（e2e-env seedPaperRow 同型）
  const pkgDir = join(ROOT, 'node_modules', 'better-sqlite3')
  const releaseBinding = join(pkgDir, 'build', 'Release', 'better_sqlite3.node')
  const cacheDir = join(pkgDir, 'abi-cache')
  const wanted = `node-v${process.versions.modules}`
  const dirs = (await readdir(cacheDir)).filter((d) => d.startsWith('node-v'))
  const pick = dirs.includes(wanted) ? wanted : (dirs.sort().at(-1) ?? '')
  if (!pick) throw new Error('abi-cache 缺 node 绑定')
  R.steps.abiPick = { wanted, pick, cacheDirs: dirs }
  const electronBinding = await readFile(releaseBinding)
  const electronSha = createHash('sha256').update(electronBinding).digest('hex')
  await copyFile(join(cacheDir, pick, 'better_sqlite3.node'), releaseBinding)
  try {
    const dbPath = join(userData, 'synapse.db').replaceAll('\\', '/')
    const code = `
      import { createRequire } from 'node:module'
      const require = createRequire(${JSON.stringify(join(ROOT, 'package.json'))})
      const Database = require('better-sqlite3')
      const db = new Database(${JSON.stringify(dbPath).replaceAll('"', "'")})
      try {
        const rows = db.prepare('SELECT id, name FROM tags').all()
        const empty = rows.filter((r) => r.name === '')
        console.log(JSON.stringify({ total: rows.length, emptyNameCount: empty.length, emptyRows: empty, allNames: rows.map((r) => r.name) }))
      } finally { db.close() }
    `
    R.steps.dbRows = JSON.parse(await runNodeSnippet(true, code))
  } finally {
    await writeFile(releaseBinding, electronBinding)
  }
  // 还原校验（哈希对账——还原失败=毒化后续 electron.launch）
  const restored = await readFile(releaseBinding)
  R.steps.bindingRestored = createHash('sha256').update(restored).digest('hex') === electronSha
  log('dbRows', JSON.stringify(R.steps.dbRows), 'bindingRestored=', R.steps.bindingRestored)

  // 判级：空名行入库且应答 ok → W（可复现）；rename 对照应 INVALID_REQUEST
  R.verdict = {
    emptyNameInserted: (R.steps.dbRows?.emptyNameCount ?? 0) > 0,
    upsertReturnedOk: R.steps.upsertSpaces.ok === true,
    renameGuardPresent: R.steps.renameSpaces.ok === false && R.steps.renameSpaces.code === 'INVALID_REQUEST'
  }
  writeFileSync(join(OUT, 'b7.json'), JSON.stringify(R, null, 2))
  log('verdict', JSON.stringify(R.verdict))
  if (R.steps.dbRows?.emptyNameCount > 0) process.exitCode = 2 // W 级信号（入库复现）
}

await main().catch((e) => {
  R.error = String(e)
  try {
    writeFileSync(join(OUT, 'b7.json'), JSON.stringify(R, null, 2))
  } catch { /* 原始错误优先 */ }
  console.error('[b7] FAIL', e)
  process.exitCode = 1
})
