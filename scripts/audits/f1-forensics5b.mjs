/**
 * SR2-F-09 真机像素证 v5b：灰色选中在画（中性暗化，R≈G≈B）+标注不受扰。
 * 用法：export PATH="/d/nodejs24:$PATH" && node scripts/audits/f1-forensics5b.mjs
 */
import { _electron as electron } from '@playwright/test'
import { cp, mkdir, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const ROOT = process.cwd()
const OUT = join(ROOT, 'scripts', 'audits', 'f1-out')
const results = {}
function log(...a) { console.log(`[f5b ${new Date().toISOString().slice(11, 19)}]`, ...a) }

async function main() {
  if (!existsSync(join(ROOT, 'out', 'main', 'index.js'))) throw new Error('先 build')
  await mkdir(OUT, { recursive: true })
  const userData = join(tmpdir(), 'synapse-f5b')
  await rm(userData, { recursive: true, force: true })
  await cp(join(process.env.APPDATA, 'Synapse Remake'), userData, { recursive: true })
  const app = await electron.launch({ args: ['out/main/index.js'], env: { ...process.env, SYNAPSE_USER_DATA: userData } })
  const win = await app.firstWindow()
  await win.setDefaultTimeout(20_000)
  await win.getByRole('button', { name: '文献库' }).click()
  await win.locator('.lib-card').first().dblclick()
  await win.waitForSelector('[data-page-column="ready"]')
  await win.waitForFunction(() => document.querySelectorAll('[data-page-root] .textLayer span').length >= 20, null, { timeout: 25_000 })
  await win.waitForTimeout(1200)

  results.selectionComputed = await win.evaluate(`(() => {
    const span = document.querySelector('[data-page-root] .textLayer span')
    return span === null ? 'missing' : getComputedStyle(span, '::selection').backgroundColor
  })()`)

  await win.screenshot({ path: join(OUT, 'v5b-baseline.png') })
  await win.evaluate(`(() => {
    const p = document.querySelector('[data-page-root="19"]') ?? document.querySelector('[data-page-root]')
    const spans = [...p.querySelectorAll('.textLayer span')].filter(s => s.firstChild && s.firstChild.nodeType === 3 && s.textContent.length > 0)
    const a = spans[Math.floor(spans.length * 0.4)], b = spans[Math.floor(spans.length * 0.5)]
    const r = document.createRange()
    r.setStart(a.firstChild, 0); r.setEnd(b.firstChild, Math.min(5, b.firstChild.data.length))
    const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r)
  })()`)
  await win.waitForTimeout(500)
  await win.screenshot({ path: join(OUT, 'v5b-gray-selection.png') })
  results.dpr = await win.evaluate('window.devicePixelRatio')

  await writeFile(join(OUT, 'f1-forensics5b.json'), JSON.stringify(results, null, 2), 'utf8')
  await app.close()
  log('完成', JSON.stringify(results))
}

main().catch((e) => { console.error('[f5b] FAIL', e); process.exitCode = 1 })
