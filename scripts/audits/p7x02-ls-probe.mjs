/**
 * P7X-02 设计链主控源码验证探针——假设④实证：Electron file:// origin 下
 * localStorage 可用性+跨重启持久性（Kimi 设计 §7.5 [假设] / deepseek 审核面④）。
 *
 * 法：同 SYNAPSE_USER_DATA 双 launch——首轮写 localStorage 标记+renderer origin
 * 读数；二轮重启读回。判定：写入成功且重启后在=设计 B 案存储面成立。
 * 用法：node scripts/audits/p7x02-ls-probe.mjs
 */
import { _electron as electron } from '@playwright/test'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { writeFileSync } from 'node:fs'

const OUT = {}
const log = (k, v) => { OUT[k] = v; console.log(k, '=', JSON.stringify(v)) }
const launch = (userData) =>
  electron.launch({ args: ['out/main/index.js'], env: { ...process.env, SYNAPSE_USER_DATA: userData } })

const userData = await mkdtemp(join(tmpdir(), 'synapse-p7x02-ls-'))
const MARK = `p7x02-ls-${Date.now()}`

// 首轮：写入+读回（同会话）
const a = await launch(userData)
const wa = await a.firstWindow()
await wa.getByRole('button', { name: '文献库' }).waitFor({ timeout: 20_000 })
const first = await wa.evaluate((mark) => {
  try {
    window.localStorage.setItem('p7x02-probe', mark)
    const read = window.localStorage.getItem('p7x02-probe')
    return { writable: true, readback: read, origin: window.location.protocol, keys: window.localStorage.length }
  } catch (e) {
    return { writable: false, err: String(e), origin: window.location.protocol }
  }
}, MARK)
log('firstRun', first)
await a.close()

// 二轮：重启读回（跨进程持久性——leveldb 落盘于 userData）
const b = await launch(userData)
const wb = await b.firstWindow()
await wb.getByRole('button', { name: '文献库' }).waitFor({ timeout: 20_000 })
const second = await wb.evaluate(() => {
  try {
    return { persisted: window.localStorage.getItem('p7x02-probe'), keys: window.localStorage.length }
  } catch (e) {
    return { err: String(e) }
  }
})
log('afterRestart', second)
await b.close()

const verdict = first.writable === true && first.readback === MARK && second.persisted === MARK
log('VERDICT', verdict ? 'PASS——file:// localStorage 可写且跨重启持久（设计 B 案存储面成立）' : 'FAIL——假设④不成立,设计 B 案存储面需复议')
writeFileSync(join(process.cwd(), 'scripts', 'audits', 'p7x02-ls-probe-out.json'), JSON.stringify(OUT, null, 2))
process.exit(verdict ? 0 : 1)
