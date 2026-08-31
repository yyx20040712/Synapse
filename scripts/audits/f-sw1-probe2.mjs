// F-SW1 探针 2:切换课题(reload)后主内容区状态——图4「切换后空白」复现。
import { _electron as electron } from '@playwright/test'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { cpSync, rmSync, existsSync } from 'node:fs'

const SRC = process.env.APPDATA + '\\Synapse'
const userData = await mkdtemp(join(tmpdir(), 'synapse-sw2-'))
if (existsSync(SRC)) cpSync(SRC, userData, { recursive: true })

const app = await electron.launch({ args: ['out/main/index.js'], env: { ...process.env, SYNAPSE_USER_DATA: userData } })
let win = await app.firstWindow()
await win.getByRole('button', { name: '文献库' }).waitFor({ timeout: 20_000 })
await win.waitForTimeout(1500)

const listState = () => win.evaluate(() => {
  const rows = document.querySelectorAll('[data-testid="lib-row"], .lib-row, table tbody tr, li').length
  const main = document.querySelector('main')
  const mainText = main ? main.textContent.slice(0, 80) : null
  const toasts = [...document.querySelectorAll('[role="status"], .toast, [data-toast]')].map((t) => t.textContent.slice(0, 40))
  const panel = document.querySelector('.ws-panel') !== null
  return { rows, mainText, toasts, panelOpen: panel, bodyLen: document.body.textContent.length }
})
const before = await listState()
await win.getByRole('button', { name: '切换课题' }).click()
await win.waitForTimeout(300)
// 点第二项(非当前)触发 switchTo→reload
const items = win.locator('.ws-item')
const n = await items.count()
if (n >= 2) {
  await items.nth(1).click()
  // 等 reload:导航事件后新页面
  try { win = await app.firstWindow() } catch { /* 同窗 reload */ }
  await win.waitForTimeout(5000)
} else { console.log('NO_ITEMS', n) }
const after = await listState()
await win.screenshot({ path: 'scripts/audits/f-sw1-out/after-switch.png' })
await app.close()
rmSync(userData, { recursive: true, force: true })
console.log('F-SW1 PROBE2:', JSON.stringify({ before, after }, null, 1))
