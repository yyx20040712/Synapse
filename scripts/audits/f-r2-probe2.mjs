/**
 * F-R2 P3b 补测（H2 页码误判——P3 直设 scrollTop 与懒渲染回收交互失效后的
 * 真实链补测）：三档 × fill(2..6)，走真实页码跳转链，读 {inputPage, 真视口中心页}。
 * 真中心页=视口中心 elementFromPoint 上溯 [data-page-box]（中心落间隙时 gBCR 盒比较兜底）。
 * 产物：scripts/audits/f-r2-out/f-r2-probe2.json（并入 U1 证据链）
 */
import { _electron as electron } from '@playwright/test'
import { cp, mkdir, rm } from 'node:fs/promises'
import { existsSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const ROOT = process.cwd()
const OUT = join(ROOT, 'scripts', 'audits', 'f-r2-out')
await mkdir(OUT, { recursive: true })
const log = (...a) => console.log(`[f-r2p3b ${new Date().toISOString().slice(11, 19)}]`, ...a)

async function freshUserData() {
  const src = join(process.env.APPDATA, 'Synapse')
  const userData = join(tmpdir(), 'synapse-f-r2-p3b')
  await rm(userData, { recursive: true, force: true })
  for (const p of ['workspaces', 'ai-sensor']) await cp(join(src, p), join(userData, p), { recursive: true })
  for (const f of ['settings.json', 'workspace.json', 'window-state.json']) {
    if (existsSync(join(src, f))) await cp(join(src, f), join(userData, f))
  }
  return userData
}

const app = await electron.launch({ args: ['out/main/index.js'], env: { ...process.env, SYNAPSE_USER_DATA: await freshUserData() } })
const win = await app.firstWindow()
await win.getByRole('button', { name: '文献库' }).waitFor({ timeout: 20_000 })
await win.getByRole('button', { name: '文献库' }).click()
await win.waitForTimeout(1000)
await win.locator('button.lib-card').first().dblclick()
await win.waitForSelector('[data-page-column="ready"]', { timeout: 20_000 })
await win.waitForTimeout(1500)

const INPUT = 'input[aria-label="跳转到页"]'
const evalJS = (expr) => win.evaluate(`(async () => { const r=(x)=>Math.round(x*100)/100; ${expr} })()`)
const R = { meta: { script: 'f-r2-probe2.mjs', date: new Date().toISOString() }, tiers: {} }

for (const [tier, z] of [['small_1', '1'], ['medium_1.1', '1.1'], ['large_1.25', '1.25']]) {
  await win.evaluate(`document.documentElement.style.setProperty('--ui-scale', '${z}')`)
  await win.waitForTimeout(600)
  const rows = []
  for (const p of [2, 3, 4, 5, 6]) {
    await win.locator(INPUT).fill(String(p))
    await win.locator(INPUT).press('Enter')
    await win.waitForTimeout(700)
    const m = await evalJS(`
      const input = document.querySelector('input[aria-label="跳转到页"]')
      const sc = document.querySelector('[data-page-column]')?.closest('.overflow-auto')
      const sr = sc.getBoundingClientRect()
      const cx = sr.left + sr.width / 2, cy = sr.top + sr.height / 2
      const hit = document.elementFromPoint(cx, cy)?.closest('[data-page-box]')
      let truePage = hit ? Number(hit.dataset.pageBox) : null
      if (truePage === null) {
        for (const bb of document.querySelectorAll('[data-page-box]')) {
          const g = bb.getBoundingClientRect()
          if (cy >= g.top && cy < g.bottom) { truePage = Number(bb.dataset.pageBox); break }
        }
      }
      return { input: input ? Number(input.value) : null, true: truePage, st: r(sc.scrollTop) }
    `)
    rows.push({ target: p, ...m, mismatch: m.input !== m.true })
  }
  R.tiers[tier] = rows
  log(tier, JSON.stringify(rows.map((x) => [x.target, x.input, x.true, x.mismatch])))
}

writeFileSync(join(OUT, 'f-r2-probe2.json'), JSON.stringify(R, null, 1), 'utf8')
log('落盘:', join(OUT, 'f-r2-probe2.json'))
await app.close()
