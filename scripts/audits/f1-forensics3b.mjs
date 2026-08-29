/**
 * F1 取证三号机 b（r5）——全 rect 几何转储 + 选区态/基线态全屏像素差分。
 * 用法：export PATH="/d/nodejs24:$PATH" && node scripts/audits/f1-forensics3b.mjs
 */
import { _electron as electron } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const ROOT = process.cwd()
const OUT = join(ROOT, 'scripts', 'audits', 'f1-out')
const userData = join(tmpdir(), 'synapse-f1-forensics')
const results = {}
function log(...a) { console.log(`[f3b ${new Date().toISOString().slice(11, 19)}]`, ...a) }

async function main() {
  if (!existsSync(userData)) throw new Error('临时 userData 不在')
  await mkdir(OUT, { recursive: true })
  const app = await electron.launch({ args: ['out/main/index.js'], env: { ...process.env, SYNAPSE_USER_DATA: userData } })
  const win = await app.firstWindow()
  await win.setDefaultTimeout(20_000)
  await win.getByRole('button', { name: '文献库' }).click()
  await win.locator('.lib-card').first().dblclick()
  await win.waitForSelector('[data-page-column="ready"]')
  await win.waitForFunction(() => document.querySelectorAll('[data-page-root] .textLayer span').length >= 20, null, { timeout: 25_000 })
  await win.waitForTimeout(1200)

  const doSelect = async (kind) => {
    await win.evaluate(`(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      getSelection().removeAllRanges()
      const p19 = document.querySelector('[data-page-root="19"]')
      const spans = [...p19.querySelectorAll('.textLayer span')].filter(s => s.firstChild && s.firstChild.nodeType === 3)
      let a, b, aOff = 0, bOff
      if ('${kind}' === 'word') {
        a = spans[Math.floor(spans.length * 0.5)]; b = a
        bOff = Math.min(8, a.firstChild.data.length)
      } else {
        a = spans[Math.floor(spans.length * 0.35)]; b = spans[Math.floor(spans.length * 0.45)]
        bOff = Math.min(5, b.firstChild.data.length)
      }
      const r = document.createRange()
      r.setStart(a.firstChild, aOff); r.setEnd(b.firstChild, bOff)
      const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r)
    })()`)
    await win.waitForSelector('[data-testid="selection-rect"]', { timeout: 8_000, state: 'attached' })
    await win.waitForTimeout(200)
  }

  for (const kind of ['word', 'para']) {
    await doSelect(kind)
    const dump = await win.evaluate(`(() => {
      const rects = [...document.querySelectorAll('[data-testid="selection-rect"]')].map(r => {
        const b = r.getBoundingClientRect()
        return { x: +b.x.toFixed(1), y: +b.y.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) }
      })
      const selLen = getSelection().toString().length
      const cont = document.querySelector('[data-testid="selection-rects"]').getBoundingClientRect()
      const tb = document.querySelector('[data-testid="selection-toolbar"]')?.getBoundingClientRect()
      return { selLen, cont: { x: +cont.x.toFixed(0), y: +cont.y.toFixed(0), w: +cont.width.toFixed(0), h: +cont.height.toFixed(0) }, toolbar: tb ? { x: +tb.x.toFixed(0), y: +tb.y.toFixed(0) } : null, rects }
    })()`)
    results[kind] = dump
    log(kind, JSON.stringify(dump))
    await win.screenshot({ path: join(OUT, `T3b-${kind}.png`) })
    await win.evaluate(`(() => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); getSelection().removeAllRanges() })()`)
    await win.waitForTimeout(300)
    await win.screenshot({ path: join(OUT, `T3b-${kind}-base.png`) })
  }

  await writeFile(join(OUT, 'f1-forensics3b.json'), JSON.stringify(results, null, 2), 'utf8')
  await app.close()
  log('完成')
}

main().catch((e) => { console.error('[f3b] FAIL', e); process.exitCode = 1 })
