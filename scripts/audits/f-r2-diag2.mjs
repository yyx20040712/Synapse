/**
 * F-R2 回炉诊断（主控压缩票）：e2e 同款默认档下 effectiveZoom 比值法 vs
 * computed zoom 链乘积 的量测差——「划选高亮重开原位 3.45px」污染假设实证。
 * 产物：scripts/audits/f-r2-out/f-r2-diag2.json
 */
import { _electron as electron } from '@playwright/test'
import { cp, rm } from 'node:fs/promises'
import { existsSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const OUT = join(process.cwd(), 'scripts', 'audits', 'f-r2-out')
mkdirSync(OUT, { recursive: true })
async function freshUserData() {
  const src = join(process.env.APPDATA, 'Synapse')
  const userData = join(tmpdir(), 'synapse-f-r2-diag2')
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

const diag = await win.evaluate(`(() => {
  const sc = document.querySelector('[data-page-column]')?.closest('.overflow-auto')
  const g = sc.getBoundingClientRect()
  const ratioZ = g.height / sc.clientHeight
  const chain = []
  let z = 1
  let el = sc
  while (el) {
    const cz = getComputedStyle(el).zoom
    const num = Number(cz)
    const layer = { tag: el.tagName, cls: String(el.className).slice(0, 30), cssZoom: cz, num: Number.isFinite(num) ? num : 1 }
    chain.push(layer)
    z *= layer.num
    el = el.parentElement
  }
  return {
    gbcH: g.height, clientH: sc.clientHeight, offsetH: sc.offsetHeight,
    ratioZ, chainZ: z, eps: ratioZ - 1,
    chain,
    scrollW: sc.scrollWidth, clientW: sc.clientWidth,
    hasHScrollbar: sc.scrollWidth > sc.clientWidth,
  }
})()`)
writeFileSync(join(OUT, 'f-r2-diag2.json'), JSON.stringify(diag, null, 1), 'utf8')
console.log(JSON.stringify({ gbcH: diag.gbcH, clientH: diag.clientH, ratioZ: diag.ratioZ, eps: diag.eps, chainZ: diag.chainZ, hasHScrollbar: diag.hasHScrollbar, zoomLayers: diag.chain.filter((c) => c.num !== 1) }, null, 1))
await app.close()
