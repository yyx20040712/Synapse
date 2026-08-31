// F-SW1 排查探针:切换课题面板在 SET1 两档下的几何与层叠(对偶矩阵未验项
// 「切换器面板×zoom 大档字号反差」用户实况触发——图3/4 现象定位)。
// crib f-a4/f-r1 verify 同环:Electron 真机+真实用户数据副本+CDP 量测。
import { _electron as electron } from '@playwright/test'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { cpSync, rmSync, existsSync } from 'node:fs'

const SRC = process.env.APPDATA + '\\Synapse'
const userData = await mkdtemp(join(tmpdir(), 'synapse-sw1-'))
if (existsSync(SRC)) cpSync(SRC, userData, { recursive: true })

const app = await electron.launch({ args: ['out/main/index.js'], env: { ...process.env, SYNAPSE_USER_DATA: userData } })
const win = await app.firstWindow()
await win.getByRole('button', { name: '文献库' }).waitFor({ timeout: 20_000 })

const probe = () => win.evaluate(() => {
  const btn = document.querySelector('.ws-trigger')
  const panel = document.querySelector('.ws-panel')
  const header = document.querySelector('.app-header')
  const zoomRow = getComputedStyle(document.querySelector('.app-content-row')).zoom
  const r = (el) => el ? { x: Math.round(el.getBoundingClientRect().x), y: Math.round(el.getBoundingClientRect().y), w: Math.round(el.getBoundingClientRect().width), h: Math.round(el.getBoundingClientRect().height), fs: getComputedStyle(el).fontSize, zi: getComputedStyle(el).zIndex } : null
  return { btn: r(btn), panel: r(panel), header: r(header), zoomRow, panelUnderBtnX: panel && btn ? Math.round(panel.getBoundingClientRect().x - btn.getBoundingClientRect().x) : null, panelOverlapHeaderBottom: panel && header ? Math.round(panel.getBoundingClientRect().y - (header.getBoundingClientRect().y + header.getBoundingClientRect().height)) : null }
})

const out = { small: null, large: null, shots: [] }
await win.getByRole('button', { name: '切换课题' }).click()
await win.waitForTimeout(400)
out.small = await probe()
await win.screenshot({ path: 'scripts/audits/f-sw1-out/small-panel.png' })
await win.keyboard.press('Escape')
await win.getByRole('button', { name: '切换课题' }).click(); await win.keyboard.press('Escape')

await win.getByRole('button', { name: '设置' }).click()
await win.getByRole('button', { name: '大 125%' }).click()
await win.waitForTimeout(600)
await win.getByRole('button', { name: '文献库' }).click()
await win.getByRole('button', { name: '切换课题' }).click()
await win.waitForTimeout(400)
out.large = await probe()
await win.screenshot({ path: 'scripts/audits/f-sw1-out/large-panel.png' })
out.shots = ['small-panel.png', 'large-panel.png']
await app.close()
rmSync(userData, { recursive: true, force: true })
console.log('F-SW1 PROBE:', JSON.stringify(out, null, 1))
