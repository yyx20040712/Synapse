import { test, expect } from '@playwright/test'
import { mkdtemp } from 'node:fs/promises'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { spawn } from 'node:child_process'
import { isTicketDone } from '../../tickets/registry'
import { createTinyPdf } from '../utils/pdf-factory'
import { bootstrapMigrations, launch, seedPaperRow } from './e2e-env'

/**
 * P7X-02 outbox 重启重放 e2e（SYNAPSE_USER_DATA 双 launch，1 综合用例）。
 * [F-TIME-02] 2026-09-19 用户裁决移除阅读时长：断言面收窄为页码重放承重半边
 * （outbox 机制保留=页码三收尾口通道）；注种条目保留旧时长载荷 seconds 字段
 * =存量 localStorage 残留形态直证（回放忽略多余键不判损坏——升级路径兼容）。
 * 链：建库 v9→种子 1 篇真实 PDF→首轮 launch 后向 localStorage 注种崩溃/ack
 * 未达残留（pending 页 2+in-flight 页 1，等价强杀前已落盘的 outbox 条目；
 * LS 键格式=outbox localStorage 适配器单源 CO-1 每条目独立 key+meta）→
 * app.close() 强杀（LS 同步写已持久）→二轮启动：渲染先行+后台回放（回炉
 * W1）→有界 DB 轮询断言 last_read_page=1 落账（回炉 W3 同步点——终值=最后
 * 入队页码，队头 seq 序排空）。
 * 读库子进程=spawn -e（不经主进程 require 直读 sqlite 文件。[F-ELE-02] v13
 * N-API 单绑定后 v12 换绑段已删，此处保留子进程读库形态）。
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

/** 子进程读 papers 行（v13 N-API 单绑定——子进程直接 require，无需换绑） */
async function readPaperRow(userData: string): Promise<{ p: number }> {
  return await new Promise<{ p: number }>((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        '-e',
        'const D=require("better-sqlite3");const db=D(process.argv[1]);try{const r=db.prepare("SELECT last_read_page AS p FROM papers WHERE id=?").get(process.argv[2]);console.log(JSON.stringify(r))}finally{db.close()}',
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
        resolve(JSON.parse(out) as { p: number })
      } else {
        reject(new Error(`读库子进程退出码 ${code ?? 'null'}`))
      }
    })
    child.on('error', reject)
  })
}

/** 有界 DB 轮询（回炉 W3：W1 渲染先行后「导航可见即重放毕」前提失效——后台
 * 回放与 UI 并行，落库完成点不确定。裁 DB 轮询非 evaluate store 清空：最终
 * 裁判面=真 sqlite 落账（真 IPC→service→repo 提交链直证），与最终断言同源，
 * 且无需为观察队列态在 production 面加探针口）。500ms 间隔有界重试。 */
async function pollReadingRow(
  userData: string,
  wantP: number,
  timeoutMs: number
): Promise<{ p: number }> {
  const deadline = Date.now() + timeoutMs
  for (;;) {
    const row = await readPaperRow(userData)
    if (row.p === wantP) return row
    if (Date.now() > deadline) {
      throw new Error(`回放落库轮询超时：期望 {p:${wantP}} 实得 ${JSON.stringify(row)}`)
    }
    await new Promise((r) => setTimeout(r, 500))
  }
}

test('P7X-02 outbox 重放：强杀残留（pending+in-flight）→二轮启动闸门排空落库（页码半边）', async () => {
  const pending = DEPS.filter((d) => !isTicketDone(d))
  test.skip(pending.length > 0, `延期：工单未完成 [${pending.join(', ')}]`)

  const title = '智慧水务 outbox 重放 e2e 文献'
  const userData = await mkdtemp(join(tmpdir(), 'synapse-obx-'))

  // 第一跳：让应用自建库 v9（不 import src 内部模块——升级链由 migrate.test 锚）
  await bootstrapMigrations(userData)

  // 种子：1 篇真实单页 PDF（sha 唯一约束——content-addressed files/ 布局）
  const bytes = createTinyPdf(title)
  const sha = createHash('sha256').update(bytes).digest('hex')
  const fileRef = `${sha.slice(0, 2)}/${sha.slice(2, 4)}/${sha}.pdf`
  const abs = join(userData, 'files', ...fileRef.split('/'))
  mkdirSync(dirname(abs), { recursive: true })
  writeFileSync(abs, bytes)
  await seedPaperRow(userData, fileRef, sha, title, PAPER_ID)

  // 首轮：注种崩溃/ack 未达残留（pending ob-1 页 2+in-flight ob-2 页 1——T5 面；
  // 条目保留旧 seconds 字段=F-TIME-02 前存量残留形态，回放须忽略不炸）→强杀。
  const app1 = await launch(userData)
  const w1 = await app1.firstWindow()
  await w1.getByRole('button', { name: '文献库' }).waitFor({ timeout: 20_000 })
  await w1.evaluate((paperId: string) => {
    const mk = (id: string, seq: number, state: string, attempts: number, page: number): string =>
      JSON.stringify({
        id,
        paperId,
        page,
        seconds: 120,
        seq,
        attempts,
        state,
        createdAt: 1_700_000_000_000 + seq
      })
    window.localStorage.setItem('synapse.outbox.meta', '{"v":1}')
    window.localStorage.setItem('synapse.outbox.entry.ob-1', mk('ob-1', 1, 'pending', 0, 2))
    window.localStorage.setItem('synapse.outbox.entry.ob-2', mk('ob-2', 2, 'in-flight', 1, 1))
  }, PAPER_ID)
  await app1.close()

  // 二轮：后台回放（回炉 W1 渲染先行）→有界 DB 轮询断言落库（回炉 W3）——
  // 队头 seq 序（ob-1 页 2→ob-2 页 1）排空后终值=最后条目页 1
  const app2 = await launch(userData)
  const w2 = await app2.firstWindow()
  await w2.getByRole('button', { name: '文献库' }).waitFor({ timeout: 20_000 })
  await app2.close()

  const row = await pollReadingRow(userData, 1, 20_000)
  expect(row.p).toBe(1)
})
