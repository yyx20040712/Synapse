/**
 * R2-F 三连修后取证：F-11 收边量测（rect vs span 差值应入 [-0.2, +1.2] 带）+
 * F-10 选中色 computed（rgba(0,0,0,0.2)）+ 叠黄标注截图 +
 * F-12 真鼠标行为证（双击选词不出条 / 真拖选即出条）。
 * 用法：export PATH="/d/nodejs24:$PATH" && node scripts/audits/r2-f-after-forensics.mjs
 */
import { _electron as electron } from '@playwright/test'
import { cp, mkdir, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const ROOT = process.cwd()
const OUT = join(ROOT, 'scripts', 'audits', 'r2-f-out')
const results = {}
function log(...a) {
  console.log(`[f-after ${new Date().toISOString().slice(11, 19)}]`, ...a)
}

async function main() {
  if (!existsSync(join(ROOT, 'out', 'main', 'index.js'))) throw new Error('先 build')
  await mkdir(OUT, { recursive: true })
  const src = join(process.env.APPDATA, 'Synapse')
  const userData = join(tmpdir(), 'synapse-r2fafter')
  await rm(userData, { recursive: true, force: true })
  for (const p of ['workspaces', 'ai-sensor']) await cp(join(src, p), join(userData, p), { recursive: true })
  for (const f of ['settings.json', 'workspace.json', 'window-state.json']) {
    if (existsSync(join(src, f))) await cp(join(src, f), join(userData, f))
  }
  const app = await electron.launch({ args: ['out/main/index.js'], env: { ...process.env, SYNAPSE_USER_DATA: userData } })
  const win = await app.firstWindow()
  await win.setDefaultTimeout(25_000)
  await win.setViewportSize({ width: 1280, height: 900 })

  await win.getByRole('button', { name: '文献库' }).click()
  await win.locator('.lib-card').first().dblclick()
  await win.waitForSelector('[data-page-column="ready"]')
  await win.waitForFunction(
    () => document.querySelectorAll('[data-page-root] .textLayer span').length >= 20,
    null,
    { timeout: 30_000 }
  )
  await win.waitForTimeout(1000)

  // ── F-10：选中色 computed ──
  results.selectionBg = await win.evaluate(`(() => {
    const span = document.querySelector('[data-page-root] .textLayer span')
    return span === null ? 'missing' : getComputedStyle(span, '::selection').backgroundColor
  })()`)

  // ── F-11：真实保存一处高亮 → 量测收边后 rect vs span ──
  await win.evaluate(`(() => {
    const spans = [...document.querySelectorAll('[data-page-root] .textLayer span')]
      .filter(sp => sp.firstChild && sp.firstChild.nodeType === 3 && sp.textContent.trim().length > 3)
    const a = spans[2], t = a.firstChild.data
    const r = document.createRange()
    r.setStart(a.firstChild, Math.floor(t.length * 0.1))
    r.setEnd(a.firstChild, Math.floor(t.length * 0.8))
    const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r)
  })()`)
  await win.waitForSelector('[data-testid="selection-toolbar"]', { timeout: 8000 })
  await win.getByRole('button', { name: '高亮' }).click()
  await win.waitForTimeout(900)

  results.trim = await win.evaluate(`(() => {
    const owners = []
    let full = ''
    const spans = [...document.querySelectorAll('[data-page-root] .textLayer span')]
      .filter(sp => sp.firstChild && sp.firstChild.nodeType === 3 && sp.textContent.length > 0)
    for (const sp of spans) {
      for (let i = 0; i < sp.textContent.length; i++) owners.push(sp)
      full += sp.textContent
    }
    const out = []
    for (const el of document.querySelectorAll('[data-testid="annotation-rect"]')) {
      const quote = (el.getAttribute('aria-label') ?? '').replace(/^标注：/, '')
      const idx = full.indexOf(quote.slice(0, 12))
      if (idx < 0) continue
      const src = [...new Set(owners.slice(idx, idx + quote.length))]
      const dom = src.reduce((b, sp) => (sp.getBoundingClientRect().height > b.getBoundingClientRect().height ? sp : b))
      const eb = el.getBoundingClientRect(), sb = dom.getBoundingClientRect()
      out.push({
        quote: quote.slice(0, 10),
        dTopPx: +(eb.top - sb.top).toFixed(2),
        dBottomPx: +(eb.bottom - sb.bottom).toFixed(2),
        spanH: +sb.height.toFixed(1),
        annotH: +eb.height.toFixed(1)
      })
    }
    return out
  })()`)
  const rect1 = win.locator('[data-testid="annotation-rect"]').first()
  await rect1.scrollIntoViewIfNeeded()
  await win.waitForTimeout(300)
  const fb = await rect1.boundingBox()
  if (fb !== null) {
    await win.screenshot({
      path: join(OUT, 'F11-after-closeup.png'),
      clip: { x: Math.max(fb.x - 80, 0), y: Math.max(fb.y - 70, 0), width: Math.min(fb.width + 160, 1280), height: fb.height + 140 }
    })
  }

  // ── F-10 视觉帧：程序化选区横跨黄标注 ──
  await win.evaluate(`(() => {
    const el = document.querySelector('[data-testid="annotation-rect"]')
    const quote = (el.getAttribute('aria-label') ?? '').replace(/^标注：/, '')
    const spans = [...document.querySelectorAll('[data-page-root] .textLayer span')]
      .filter(sp => sp.firstChild && sp.firstChild.nodeType === 3 && sp.textContent.length > 0)
    const owners = []; let full = ''
    for (const sp of spans) { for (let i = 0; i < sp.textContent.length; i++) owners.push(sp); full += sp.textContent }
    const idx = full.indexOf(quote.slice(0, 12))
    const r = document.createRange()
    const a = owners[Math.max(0, idx - 8)], b = owners[Math.min(owners.length - 1, idx + quote.length + 6)]
    r.setStart(a.firstChild, a === owners[idx] ? 0 : Math.max(0, a.firstChild.data.length - 5))
    r.setEnd(b.firstChild, Math.min(b.firstChild.data.length, 8))
    const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r)
  })()`)
  await win.waitForTimeout(500)
  await win.screenshot({ path: join(OUT, 'F10-selection-over-annotation.png') })

  // ── F-12 真鼠标行为证 ──
  // ① 双击选词（位移≈0）→ 工具条必须不在场
  await win.keyboard.press('Escape')
  await win.evaluate('getSelection().removeAllRanges()')
  await win.waitForTimeout(300)
  const wordBox = await win.evaluate(`(() => {
    const spans = [...document.querySelectorAll('[data-page-root] .textLayer span')]
      .filter(sp => sp.firstChild && sp.firstChild.nodeType === 3 && sp.textContent.trim().length > 3)
    const b = spans[6].getBoundingClientRect()
    return { x: Math.round(b.x + b.width * 0.4), y: Math.round(b.y + b.height * 0.5) }
  })()`)
  await win.mouse.dblclick(wordBox.x, wordBox.y)
  await win.waitForTimeout(600)
  results.dblclickSelectionText = await win.evaluate(`(() => {
    const sel = getSelection()
    return { collapsed: sel.isCollapsed, len: sel.toString().length }
  })()`)
  results.toolbarAfterDblclick = await win.getByTestId('selection-toolbar').count()

  // ② 真拖选（位移 >30px）→ 工具条必须 1.5s 内在场
  // 只取当前视口内的 span（CDP 出窗 mouseup 不触达 DOM——负坐标事件丢失实录）
  const dragFrom = await win.evaluate(`(() => {
    const rects = [...document.querySelectorAll('[data-testid="annotation-rect"]')].map(el => el.getBoundingClientRect())
    const clear = (b) => rects.every(r => b.left >= r.right || b.right <= r.left || b.top >= r.bottom || b.bottom <= r.top)
    const vis = [...document.querySelectorAll('[data-page-root] .textLayer span')]
      .filter(sp => sp.firstChild && sp.firstChild.nodeType === 3 && sp.textContent.trim().length > 3)
      .map(sp => sp.getBoundingClientRect())
      .filter(b => b.top >= 140 && b.bottom <= 860 && b.height > 3 && b.width > 8 && clear(b))
    const A = vis[1], B = vis[Math.min(4, vis.length - 1)]
    return { x1: Math.round(A.x + A.width * 0.3), y1: Math.round(A.y + A.height * 0.5),
             x2: Math.round(B.x + B.width * 0.7), y2: Math.round(B.y + B.height * 0.5) }
  })()`)
  log('drag', JSON.stringify(dragFrom))
  await win.mouse.move(dragFrom.x1, dragFrom.y1)
  await win.mouse.down()
  await win.mouse.move(dragFrom.x1 + 8, dragFrom.y1, { steps: 2 })
  await win.mouse.move(dragFrom.x2, dragFrom.y2, { steps: 10 })
  await win.mouse.up()
  results.dragSel = await win.evaluate(`(() => {
    const sel = getSelection()
    return { len: sel.toString().length, collapsed: sel.isCollapsed }
  })()`)
  let toolbarVisible = false
  try {
    await win.waitForSelector('[data-testid="selection-toolbar"]', { timeout: 1500 })
    toolbarVisible = true
  } catch { toolbarVisible = false }
  results.toolbarAfterDrag = toolbarVisible
  if (toolbarVisible) await win.screenshot({ path: join(OUT, 'F12-drag-toolbar.png') })

  await writeFile(join(OUT, 'r2-f-after.json'), JSON.stringify(results, null, 2), 'utf8')
  await app.close()
  log('完成', JSON.stringify(results))
}

main().catch((e) => {
  console.error('[f-after] FAIL', e)
  process.exitCode = 1
})
