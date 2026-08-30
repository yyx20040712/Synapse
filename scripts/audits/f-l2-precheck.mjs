/**
 * F-L2 修票前置实测——Chromium legacy zoom 下量测口径三问(修法定向依据)。
 * Q1 svg.clientWidth/clientHeight 在祖先 zoom(.app-content-row)下返回本
 *    地布局 px 还是视觉 px?(对照 getBoundingClientRect)
 * Q2 缩放因子可读性:getComputedStyle(html).zoom vs closest('.app-content-row').zoom
 * Q3 事件坐标空间:CDP 真鼠标 move 到 svg 视觉中心,捕获 clientX——与视觉
 *    位置相等(根框 px)还是除以 zoom(本地 px)?
 * 附:三档(1/1.1/1.25)现状 fit 基线(修前对照,非修复验证)。
 * 产物:scripts/audits/f-l2-out/f-l2-precheck.json
 */
import { _electron as electron } from '@playwright/test'
import { cp, mkdir, rm } from 'node:fs/promises'
import { existsSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const ROOT = process.cwd()
const OUT = join(ROOT, 'scripts', 'audits', 'f-l2-out')
await mkdir(OUT, { recursive: true })
const log = (...a) => console.log(`[f-l2pre ${new Date().toISOString().slice(11, 19)}]`, ...a)

async function freshUserData() {
  const src = join(process.env.APPDATA, 'Synapse')
  const userData = join(tmpdir(), 'synapse-f-l2-precheck')
  await rm(userData, { recursive: true, force: true })
  for (const p of ['workspaces', 'ai-sensor']) await cp(join(src, p), join(userData, p), { recursive: true })
  for (const f of ['settings.json', 'workspace.json', 'window-state.json']) {
    if (existsSync(join(src, f))) await cp(join(src, f), join(userData, f))
  }
  return userData
}

const userData = await freshUserData()
const app = await electron.launch({ args: ['out/main/index.js'], env: { ...process.env, SYNAPSE_USER_DATA: userData } })
const win = await app.firstWindow()
await win.getByRole('button', { name: '脉络' }).waitFor({ timeout: 20_000 })
await win.waitForTimeout(800)
await win.getByRole('button', { name: '脉络' }).click()
await win.waitForTimeout(1500)

// clientX 捕获器(svg 上冒泡 mousemove)
await win.evaluate(`(() => {
  window.__cap = []
  const svg = document.querySelector('[data-viewport]')?.closest('svg')
  svg?.addEventListener('mousemove', (e) => window.__cap.push({ clientX: e.clientX, clientY: e.clientY }))
})()`)

const R = { meta: { script: 'f-l2-precheck.mjs', date: new Date().toISOString() }, tiers: {} }
for (const [name, z] of [['small', '1'], ['medium', '1.1'], ['large', '1.25']]) {
  await win.evaluate(`document.documentElement.style.setProperty('--ui-scale', '${z}')`)
  await win.waitForTimeout(500)
  // 现状 fit(基线):点适应视图后 dump transform+节点右溢
  await win.getByRole('button', { name: '适应视图' }).click()
  await win.waitForTimeout(900)
  const m = await win.evaluate(`(() => {
    const svgEl = document.querySelector('[data-viewport]')?.closest('svg')
    if (!svgEl) return null
    const r = svgEl.getBoundingClientRect()
    const row = svgEl.closest('.app-content-row')
    const cs = (el) => (el === null ? null : getComputedStyle(el).zoom)
    const transform = document.querySelector('[data-viewport]')?.getAttribute('transform') || ''
    const nodes = [...document.querySelectorAll('[data-node-id]')].map((e) => {
      const b = e.getBoundingClientRect()
      return { id: e.dataset.nodeId, right: b.right, bottom: b.bottom, x: b.x, y: b.y }
    })
    return {
      gBCR: { w: r.width, h: r.height, x: r.x, y: r.y, right: r.right, bottom: r.bottom },
      client: { w: svgEl.clientWidth, h: svgEl.clientHeight },
      zoomChain: { html: cs(document.documentElement), row: cs(row), svgSelf: cs(svgEl) },
      transform,
      nodeCount: nodes.length,
      maxNodeRight: Math.max(...nodes.map((n) => n.right)),
      maxNodeBottom: Math.max(...nodes.map((n) => n.bottom))
    }
  })()`)
  // Q3:真鼠标 move 到 svg 视觉中心
  const mx = m.gBCR.x + m.gBCR.w / 2
  const my = m.gBCR.y + m.gBCR.h / 2
  await win.mouse.move(mx, my)
  await win.waitForTimeout(250)
  const cap = await win.evaluate(`window.__cap.slice(-1)[0] || null`)
  R.tiers[name] = { ...m, mouse: { movedTo: { x: mx, y: my }, captured: cap } }
  log(name, JSON.stringify({ gBCRw: m.gBCR.w, clientW: m.client.w, zoomRow: m.zoomChain.row, maxNodeRight: m.maxNodeRight, svgRight: m.gBCR.right }))
}

writeFileSync(join(OUT, 'f-l2-precheck.json'), JSON.stringify(R, null, 2))
await app.close()
console.log('F-L2 PRECHECK: done -> f-l2-out/f-l2-precheck.json')
