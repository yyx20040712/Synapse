/**
 * F1 取证二号机（2026-08-29 r3）——「真机拖选零反馈」根因定位。
 *
 * 一号机已证：程序化选选（防抖路径）≈203ms 出层；O(n) 因子≈0；拖选持按 600ms
 * 零反馈（DOM+像素双证）；松手后画面零变化。二号机目标=回答「拖选到底有没有
 * 产生原生选区」：每阶段全状态转储（选区/层/命中目标/未捕获异常/控制台）。
 *
 * 用法：export PATH="/d/nodejs24:$PATH" && node scripts/audits/f1-forensics2.mjs
 * 复用一号机临时 userData（无落库写入——一号机在保存标注前已失败）。
 */
import { _electron as electron } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const ROOT = process.cwd()
const OUT = join(ROOT, 'scripts', 'audits', 'f1-out')
const userData = join(tmpdir(), 'synapse-f1-forensics')
const results = { phases: {}, dumps: {}, consoleErrors: [], pageErrors: [] }
let appRef = null

function log(...a) { console.log(`[f2 ${new Date().toISOString().slice(11, 19)}]`, ...a) }

/** 页内全状态转储（选区/自绘层/工具条/命中目标） */
const DUMP = `(() => {
  const sel = getSelection()
  const hit = (x, y) => { const el = document.elementFromPoint(x, y); return el ? el.tagName + '.' + String(el.className).slice(0, 40) : 'none' }
  return {
    selLen: sel ? sel.toString().length : -1,
    rangeCount: sel ? sel.rangeCount : -1,
    collapsed: sel ? sel.isCollapsed : null,
    anchorTag: sel && sel.anchorNode ? (sel.anchorNode.nodeType === 3 ? 'text:' + (sel.anchorNode.parentElement?.className || '').slice(0, 30) : sel.anchorNode.nodeName) : null,
    rectsEl: document.querySelector('[data-testid="selection-rect"]') !== null,
    toolbarEl: document.querySelector('[data-testid="selection-toolbar"]') !== null,
    textLayerCount: document.querySelectorAll('.textLayer').length
  }
})()`

async function main() {
  if (!existsSync(userData)) throw new Error('临时 userData 不在（先跑一号机）')
  await mkdir(OUT, { recursive: true })
  const app = await electron.launch({ args: ['out/main/index.js'], env: { ...process.env, SYNAPSE_USER_DATA: userData } })
  appRef = app
  const win = await app.firstWindow()
  await win.setDefaultTimeout(20_000)
  win.on('console', (m) => { if (m.type() === 'error') results.consoleErrors.push(m.text().slice(0, 300)) })
  win.on('pageerror', (e) => { results.pageErrors.push(String(e).slice(0, 300)) })
  await win.evaluate(`(() => {
    window.__f1errs = []
    window.addEventListener('error', (e) => window.__f1errs.push(String(e.message).slice(0, 200)))
    window.addEventListener('unhandledrejection', (e) => window.__f1errs.push('rej:' + String(e.reason).slice(0, 200)))
  })()`)
  await win.getByRole('button', { name: '文献库' }).click()
  await win.locator('.lib-card').first().dblclick()
  await win.waitForSelector('[data-page-column="ready"]')
  await win.waitForFunction(() => document.querySelectorAll('[data-page-root] .textLayer span').length >= 20, null, { timeout: 25_000 })
  await win.waitForTimeout(1200)

  // 目标点：页 19（中间页）内的两 span；顺带命中目标核验
  const pts = await win.evaluate(`(() => {
    const page19 = document.querySelector('[data-page-root="19"]')
    const spans = [...page19.querySelectorAll('.textLayer span')].filter(s => s.firstChild && s.firstChild.nodeType === 3)
    const a = spans[Math.floor(spans.length * 0.35)], b = spans[Math.floor(spans.length * 0.45)]
    const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect()
    const hitA = document.elementFromPoint(Math.round(ra.x + 2), Math.round(ra.y + ra.height / 2))
    return {
      x1: Math.round(ra.x + 2), y1: Math.round(ra.y + ra.height / 2),
      x2: Math.round(rb.x + rb.width - 2), y2: Math.round(rb.y + rb.height / 2),
      hitA: hitA ? hitA.tagName + '.' + String(hitA.className).slice(0, 50) : 'none',
      dpr: window.devicePixelRatio, zoom: getComputedStyle(document.body).zoom,
      spansP19: spans.length
    }
  })()`)
  log('pts', JSON.stringify(pts))
  results.dumps.env = pts

  // 策略 A：普通 CDP 拖选（同一号机）
  await win.mouse.move(pts.x1, pts.y1)
  await win.mouse.down()
  await win.mouse.move(pts.x2, pts.y2, { steps: 12 })
  await win.waitForTimeout(600)
  results.dumps.aHold = await win.evaluate(DUMP)
  await win.screenshot({ path: join(OUT, 'T2a-hold.png') })
  await win.mouse.up()
  await win.waitForTimeout(1200)
  results.dumps.aUp = await win.evaluate(DUMP)
  await win.screenshot({ path: join(OUT, 'T2a-up.png') })
  log('A', JSON.stringify(results.dumps.aHold), JSON.stringify(results.dumps.aUp))
  await win.evaluate(`getSelection().removeAllRanges()`)
  await win.waitForTimeout(400)

  // 策略 B：双击选词（原生词选——最简原生选区通道）
  await win.mouse.dblclick(pts.x1, pts.y1)
  await win.waitForTimeout(700)
  results.dumps.bDbl = await win.evaluate(DUMP)
  await win.screenshot({ path: join(OUT, 'T2b-dbl.png') })
  log('B', JSON.stringify(results.dumps.bDbl))
  await win.evaluate(`getSelection().removeAllRanges()`)
  await win.waitForTimeout(400)

  // 策略 C：慢拖（40 步+停顿——模拟真人慢速拖选）
  await win.mouse.move(pts.x1, pts.y1)
  await win.mouse.down()
  for (let i = 1; i <= 8; i++) {
    const t = i / 8
    await win.mouse.move(Math.round(pts.x1 + (pts.x2 - pts.x1) * t), Math.round(pts.y1 + (pts.y2 - pts.y1) * t))
    await win.waitForTimeout(80)
  }
  await win.waitForTimeout(500)
  results.dumps.cHold = await win.evaluate(DUMP)
  await win.screenshot({ path: join(OUT, 'T2c-hold.png') })
  await win.mouse.up()
  await win.waitForTimeout(1200)
  results.dumps.cUp = await win.evaluate(DUMP)
  await win.screenshot({ path: join(OUT, 'T2c-up.png') })
  log('C', JSON.stringify(results.dumps.cHold), JSON.stringify(results.dumps.cUp))
  await win.evaluate(`getSelection().removeAllRanges()`)
  await win.waitForTimeout(400)

  // 对照：程序化选选同一段（防抖路径应 200ms 出层——一号机已证，此处带工具条断言）
  await win.evaluate(`(() => {
    const page19 = document.querySelector('[data-page-root="19"]')
    const spans = [...page19.querySelectorAll('.textLayer span')].filter(s => s.firstChild && s.firstChild.nodeType === 3)
    const a = spans[Math.floor(spans.length * 0.35)], b = spans[Math.floor(spans.length * 0.45)]
    const r = document.createRange()
    r.setStart(a.firstChild, 0); r.setEnd(b.firstChild, Math.min(5, b.firstChild.data.length))
    const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r)
  })()`)
  await win.waitForTimeout(800)
  results.dumps.prog = await win.evaluate(DUMP)
  await win.screenshot({ path: join(OUT, 'T2d-prog.png') })
  log('PROG', JSON.stringify(results.dumps.prog))

  // 大段（页内——修一号机跨页误选）：页 19 全页文本的 10%..90%
  const t0 = Date.now()
  await win.evaluate(`(() => {
    const page19 = document.querySelector('[data-page-root="19"]')
    const spans = [...page19.querySelectorAll('.textLayer span')].filter(s => s.firstChild && s.firstChild.nodeType === 3)
    const a = spans[Math.floor(spans.length * 0.1)], b = spans[Math.floor(spans.length * 0.9)]
    const r = document.createRange()
    r.setStart(a.firstChild, 0); r.setEnd(b.firstChild, b.firstChild.data.length)
    const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r)
  })()`)
  try {
    await win.waitForSelector('[data-testid="selection-rect"]', { timeout: 8_000, state: 'attached' })
    results.phases.largeInPage = { appeared: true, ms: Date.now() - t0 }
  } catch {
    results.phases.largeInPage = { appeared: false, ms: Date.now() - t0 }
  }
  results.dumps.large = await win.evaluate(DUMP)
  await win.screenshot({ path: join(OUT, 'T2e-large.png') })
  log('LARGE', JSON.stringify(results.phases.largeInPage), JSON.stringify(results.dumps.large))

  results.dumps.errors = await win.evaluate(`window.__f1errs`)
  await writeFile(join(OUT, 'f1-forensics2.json'), JSON.stringify(results, null, 2), 'utf8')
  await app.close()
  log('完成')
}

main().catch(async (e) => {
  console.error('[f2] FAIL', e)
  process.exitCode = 1
  try { await writeFile(join(OUT, 'f1-forensics2.json'), JSON.stringify(results, null, 2), 'utf8') } catch { /* 尽力留档 */ }
  try { await appRef?.close() } catch { /* 尽力清理 */ }
})
