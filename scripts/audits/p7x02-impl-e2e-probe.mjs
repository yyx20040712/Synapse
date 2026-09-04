/**
 * P7X-02 实现票 e2e 链路探针——reading-time-replay.spec 的无守卫同流程复制件
 * （spec 因 P7X-02 未翻 done 生而 skip；本探针在实现者手中实证链路可绿，
 * 主控翻状态后 CI 首跑前已有在档证据）。禁改既有工具件，故独立成件。
 * 用法：node scripts/audits/p7x02-impl-e2e-probe.mjs（需先 npm run build）
 */
import { _electron as electron } from '@playwright/test'
import { copyFile, mkdtemp, readdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { mkdirSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { spawn } from 'node:child_process'
import { createTinyPdf } from '../../tests/utils/pdf-factory.ts'

const PAPER_ID = 'e2e-replay-paper'
const OUT = {}
const log = (k, v) => {
  OUT[k] = v
  console.log(k, '=', JSON.stringify(v))
}

const launch = (userData) =>
  electron.launch({
    args: ['out/main/index.js'],
    env: { ...process.env, SYNAPSE_USER_DATA: userData }
  })

/** 活库定位（workspace.service 态②：二跳 M 迁移后活库=workspaces/default，
 * 迁移前=根——e2e 种子配方受锁兼容面） */
function liveDbPath(userData) {
  const wsDb = join(userData, 'workspaces', 'default', 'synapse.db')
  return existsSync(wsDb) ? wsDb : join(userData, 'synapse.db')
}

/** 子进程读 papers 行（node ABI 绑定切换——e2e-env.seedPaperRow 形态） */
async function readPaperRow(userData) {
  const pkgDir = join(process.cwd(), 'node_modules', 'better-sqlite3')
  const releaseBinding = join(pkgDir, 'build', 'Release', 'better_sqlite3.node')
  const cacheDir = join(pkgDir, 'abi-cache')
  const wanted = `node-v${process.versions.modules}`
  const dirs = (await readdir(cacheDir)).filter((d) => d.startsWith('node-v'))
  const pick = dirs.includes(wanted) ? wanted : (dirs.sort().at(-1) ?? '')
  if (!pick) throw new Error('abi-cache 缺 node 绑定')
  const electronBinding = await readFile(releaseBinding)
  await copyFile(join(cacheDir, pick, 'better_sqlite3.node'), releaseBinding)
  try {
    return await new Promise((resolve, reject) => {
      const child = spawn(
        process.execPath,
        [
          '-e',
          'const D=require("better-sqlite3");const db=D(process.argv[1]);try{const r=db.prepare("SELECT reading_seconds AS s, last_read_page AS p FROM papers WHERE id=?").get(process.argv[2]);console.log(JSON.stringify(r))}finally{db.close()}',
          liveDbPath(userData),
          PAPER_ID
        ],
        { env: process.env, stdio: ['ignore', 'pipe', 'pipe'] }
      )
      let out = ''
      let err = ''
      child.stdout.on('data', (d) => {
        out += String(d)
      })
      child.stderr.on('data', (d) => {
        err += String(d)
      })
      child.on('exit', (code) => {
        if (code === 0) resolve(JSON.parse(out))
        else reject(new Error(`读库子进程退出码 ${code ?? 'null'}：${err.slice(-600)}`))
      })
      child.on('error', reject)
    })
  } finally {
    await writeFile(releaseBinding, electronBinding)
  }
}

/** 种子落库（seed-paper.mjs 子进程——e2e-env 同法本地件） */
async function seedPaperRow(userData, fileRef, sha, title) {
  const pkgDir = join(process.cwd(), 'node_modules', 'better-sqlite3')
  const releaseBinding = join(pkgDir, 'build', 'Release', 'better_sqlite3.node')
  const cacheDir = join(pkgDir, 'abi-cache')
  const wanted = `node-v${process.versions.modules}`
  const dirs = (await readdir(cacheDir)).filter((d) => d.startsWith('node-v'))
  const pick = dirs.includes(wanted) ? wanted : (dirs.sort().at(-1) ?? '')
  const electronBinding = await readFile(releaseBinding)
  await copyFile(join(cacheDir, pick, 'better_sqlite3.node'), releaseBinding)
  try {
    await new Promise((resolve, reject) => {
      const child = spawn(
        process.execPath,
        [join(process.cwd(), 'tests', 'e2e', 'seed-paper.mjs')],
        {
          env: {
            ...process.env,
            SEED_DB: join(userData, 'synapse.db'),
            SEED_FILE_REF: fileRef,
            SEED_SHA: sha,
            SEED_TITLE: title,
            SEED_ID: PAPER_ID
          },
          stdio: 'inherit'
        }
      )
      child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`seed-paper 退出码 ${code}`))))
      child.on('error', reject)
    })
  } finally {
    await writeFile(releaseBinding, electronBinding)
  }
}

const title = '智慧水务 outbox 重放探针文献'
const userData = await mkdtemp(join(tmpdir(), 'synapse-obx-probe-'))
console.log('userData =', userData)

// 建库 v8
const seedApp = await launch(userData)
await (await seedApp.firstWindow()).waitForTimeout(500)
await seedApp.close()

// 种子 1 篇真实单页 PDF
const bytes = createTinyPdf(title)
const sha = createHash('sha256').update(bytes).digest('hex')
const fileRef = `${sha.slice(0, 2)}/${sha.slice(2, 4)}/${sha}.pdf`
const abs = join(userData, 'files', ...fileRef.split('/'))
mkdirSync(dirname(abs), { recursive: true })
writeFileSync(abs, bytes)
await seedPaperRow(userData, fileRef, sha, title)
log('rowAfterSeed', await readPaperRow(userData))

// 首轮：注种崩溃残留（pending 120s+in-flight 90s）→强杀
const app1 = await launch(userData)
const w1 = await app1.firstWindow()
await w1.getByRole('button', { name: '文献库' }).waitFor({ timeout: 20_000 })
await w1.evaluate((paperId) => {
  const mk = (id, seq, state, attempts, seconds) =>
    JSON.stringify({ id, paperId, page: 1, seconds, seq, attempts, state, createdAt: 1_700_000_000_000 + seq })
  window.localStorage.setItem('synapse.outbox.meta', '{"v":1}')
  window.localStorage.setItem('synapse.outbox.entry.ob-1', mk('ob-1', 1, 'pending', 0, 120))
  window.localStorage.setItem('synapse.outbox.entry.ob-2', mk('ob-2', 2, 'in-flight', 1, 90))
}, PAPER_ID)
await app1.close()
log('seeded', true)
log('rowAfterApp1', await readPaperRow(userData))

/** 有界 DB 轮询（回炉 W3：W1 渲染先行后后台回放与 UI 并行，落库完成点不确定） */
async function pollReadingRow(userData, wantS, wantP, timeoutMs) {
  const deadline = Date.now() + timeoutMs
  for (;;) {
    const row = await readPaperRow(userData)
    if (row.s === wantS && row.p === wantP) return row
    if (Date.now() > deadline) throw new Error(`回放落库轮询超时：期望 {s:${wantS},p:${wantP}} 实得 ${JSON.stringify(row)}`)
    await new Promise((r) => setTimeout(r, 500))
  }
}

// 二轮：渲染先行+后台回放（回炉 W1）→有界 DB 轮询断言（回炉 W3）
const app2 = await launch(userData)
const w2 = await app2.firstWindow()
await w2.getByRole('button', { name: '文献库' }).waitFor({ timeout: 20_000 })
await app2.close()

const row = await pollReadingRow(userData, 210, 1, 20_000)
log('row', row)
writeFileSync(join(process.cwd(), 'scripts', 'audits', 'p7x02-impl-e2e-probe-out.json'), JSON.stringify(OUT, null, 2))
const verdict = row.s === 210 && row.p === 1
log('VERDICT', verdict ? 'PASS——重放落库 210s/页 1（T5 恢复+队头序全链）' : `FAIL——期望 {s:210,p:1} 实得 ${JSON.stringify(row)}`)
process.exit(verdict ? 0 : 1)
