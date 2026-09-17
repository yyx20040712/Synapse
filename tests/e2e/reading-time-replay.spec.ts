import { test, expect } from '@playwright/test'
import { copyFile, mkdtemp, readdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { spawn } from 'node:child_process'
import { isTicketDone } from '../../tickets/registry'
import { createTinyPdf } from '../utils/pdf-factory'
import { bootstrapMigrations, launch, seedPaperRow } from './e2e-env'

/**
 * P7X-02 阅读时长 outbox 重启重放 e2e（SYNAPSE_USER_DATA 双 launch，1 综合用例）。
 * 链：建库 v8→种子 1 篇真实 PDF→首轮 launch 后向 localStorage 注种崩溃/ack
 * 未达残留（pending 120s+in-flight 90s——等价强杀前已落盘的 outbox 条目；
 * p7x02-ls-probe 配方=evaluate 直写 LS；真实 enqueue 链由单测全锚）→app.close()
 * 强杀（LS 同步写已持久）→二轮启动：渲染先行+后台回放（回炉 W1）→有界 DB
 * 轮询断言 reading_seconds=210（120+90，队头 seq 序）+last_read_page 落账
 * （回炉 W3 同步点）。
 * 读库子进程=spawn -e（downgradeToV7 形态——ABI 切换本地第二份，Rule of
 * Three 保持重复；受锁件禁改）。
 * 激活条件：P7X-02 未 done skip（实现票收口由主控翻 registry 后 CI 首跑）。
 */
const DEPS = ['P7X-02'] as const
const PAPER_ID = 'e2e-replay-paper'

test.setTimeout(120_000)

/** 活库定位（workspace.service 态②：二跳 M 迁移后活库=workspaces/default，
 * 迁移前=根——e2e 种子配方受锁兼容面） */
function liveDbPath(userData: string): string {
  const wsDb = join(userData, 'workspaces', 'default', 'synapse.db')
  return existsSync(wsDb) ? wsDb : join(userData, 'synapse.db')
}

/** 子进程读 papers 行（node ABI——better-sqlite3 绑定切换照 e2e-env 形态） */
async function readPaperRow(userData: string): Promise<{ s: number; p: number }> {
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
    return await new Promise<{ s: number; p: number }>((resolve, reject) => {
      const child = spawn(
        process.execPath,
        [
          '-e',
          'const D=require("better-sqlite3");const db=D(process.argv[1]);try{const r=db.prepare("SELECT reading_seconds AS s, last_read_page AS p FROM papers WHERE id=?").get(process.argv[2]);console.log(JSON.stringify(r))}finally{db.close()}',
          liveDbPath(userData),
          PAPER_ID
        ],
        { env: process.env }
      )
      let out = ''
      child.stdout.on('data', (d) => {
        out += String(d)
      })
      child.on('exit', (code) => {
        if (code === 0) {
          resolve(JSON.parse(out) as { s: number; p: number })
        } else {
          reject(new Error(`读库子进程退出码 ${code ?? 'null'}`))
        }
      })
      child.on('error', reject)
    })
  } finally {
    await writeFile(releaseBinding, electronBinding)
  }
}

/** 有界 DB 轮询（回炉 W3：W1 渲染先行后「导航可见即重放毕」前提失效——后台
 * 回放与 UI 并行，落库完成点不确定。裁 DB 轮询非 evaluate store 清空：最终
 * 裁判面=真 sqlite 落账（真 IPC→service→repo 提交链直证），与最终断言同源，
 * 且无需为观察队列态在 production 面加探针口）。500ms 间隔有界重试。 */
async function pollReadingRow(
  userData: string,
  wantS: number,
  wantP: number,
  timeoutMs: number
): Promise<{ s: number; p: number }> {
  const deadline = Date.now() + timeoutMs
  for (;;) {
    const row = await readPaperRow(userData)
    if (row.s === wantS && row.p === wantP) return row
    if (Date.now() > deadline) {
      throw new Error(`回放落库轮询超时：期望 {s:${wantS},p:${wantP}} 实得 ${JSON.stringify(row)}`)
    }
    await new Promise((r) => setTimeout(r, 500))
  }
}

test('P7X-02 outbox 重放：强杀残留（pending+in-flight）→二轮启动闸门排空落库', async () => {
  const pending = DEPS.filter((d) => !isTicketDone(d))
  test.skip(pending.length > 0, `延期：工单未完成 [${pending.join(', ')}]`)

  const title = '智慧水务 outbox 重放 e2e 文献'
  const userData = await mkdtemp(join(tmpdir(), 'synapse-obx-'))

  // 第一跳：让应用自建库 v8（不 import src 内部模块——reader-reading-time 同型）
  await bootstrapMigrations(userData)

  // 种子：1 篇真实单页 PDF（sha 唯一约束——content-addressed files/ 布局）
  const bytes = createTinyPdf(title)
  const sha = createHash('sha256').update(bytes).digest('hex')
  const fileRef = `${sha.slice(0, 2)}/${sha.slice(2, 4)}/${sha}.pdf`
  const abs = join(userData, 'files', ...fileRef.split('/'))
  mkdirSync(dirname(abs), { recursive: true })
  writeFileSync(abs, bytes)
  await seedPaperRow(userData, fileRef, sha, title, PAPER_ID)

  // 首轮：注种崩溃/ack 未达残留（pending ob-1=120s+in-flight ob-2=90s——T5 面）
  // →强杀。LS 键格式=outbox localStorage 适配器单源（CO-1 每条目独立 key+meta）。
  const app1 = await launch(userData)
  const w1 = await app1.firstWindow()
  await w1.getByRole('button', { name: '文献库' }).waitFor({ timeout: 20_000 })
  await w1.evaluate((paperId: string) => {
    const mk = (id: string, seq: number, state: string, attempts: number, seconds: number): string =>
      JSON.stringify({
        id,
        paperId,
        page: 1,
        seconds,
        seq,
        attempts,
        state,
        createdAt: 1_700_000_000_000 + seq
      })
    window.localStorage.setItem('synapse.outbox.meta', '{"v":1}')
    window.localStorage.setItem('synapse.outbox.entry.ob-1', mk('ob-1', 1, 'pending', 0, 120))
    window.localStorage.setItem('synapse.outbox.entry.ob-2', mk('ob-2', 2, 'in-flight', 1, 90))
  }, PAPER_ID)
  await app1.close()

  // 二轮：后台回放（回炉 W1 渲染先行）→有界 DB 轮询断言落库（回炉 W3）
  const app2 = await launch(userData)
  const w2 = await app2.firstWindow()
  await w2.getByRole('button', { name: '文献库' }).waitFor({ timeout: 20_000 })
  await app2.close()

  const row = await pollReadingRow(userData, 210, 1, 20_000)
  expect(row.s).toBe(210)
  expect(row.p).toBe(1)
})
