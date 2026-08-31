// F-SW1 修复复验:面板展开/收起两态按钮位置恒定(不再上移贴顶)。
import { _electron as electron } from '@playwright/test'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { cpSync, rmSync, existsSync } from 'node:fs'

const SRC = process.env.APPDATA + '\\Synapse'
const userData = await mkdtemp(join(tmpdir(), 'synapse-sw3-'))
if (existsSync(SRC)) cpSync(SRC, userData, { recursive: true })
const app = await electron.launch({ args: ['out/main/index.js'], env: { ...process.env, SYNAPSE_USER_DATA: userData } })
const win = await app.firstWindow()
await win.getByRole('button', { name: '文献库' }).waitFor({ timeout: 20_000 })
await win.waitForTimeout(800)

const btnY = () => win.evaluate(() => Math.round(document.querySelector('.ws-trigger').getBoundingClientRect().y))
const panelPos = () => win.evaluate(() => {
  const p = document.querySelector('.ws-panel')
  const b = document.querySelector('.ws-trigger').getBoundingClientRect()
  if (!p) return null
  const r = p.getBoundingClientRect()
  return { panelY: Math.round(r.y), btnBottom: Math.round(b.bottom), panelUnderBtn: Math.round(r.y - b.bottom), panelX: Math.round(r.x - b.x) }
})

const closed = await btnY()
await win.getByRole('button', { name: '切换课题' }).click()
await win.waitForTimeout(400)
const opened = await btnY()
const pos = await panelPos()
await win.screenshot({ path: 'scripts/audits/f-sw1-out/fix-verify-panel.png' })
await app.close()
rmSync(userData, { recursive: true, force: true })
const pass = opened === closed && pos !== null && pos.panelUnderBtn >= 0 && pos.panelUnderBtn <= 6 && pos.panelX === 0
console.log('F-SW1 FIX:', JSON.stringify({ closed, opened, dy: opened - closed, ...pos, pass }))
