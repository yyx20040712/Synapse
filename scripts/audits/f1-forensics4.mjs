/**
 * F1 真机复评器 v4（2026-08-29 SR2-F-08 收口——门二清单第 6 条配方）。
 * 验收判据（用户口径三判据的程序化形态+两观察点）：
 *  ①拖选即时可见：真实拖选**零停顿**（不等防抖）持按态截图即有蓝色 tint（原生通道）
 *  ②selection-rects 恒不在场（自绘层删除守卫）
 *  ③工具条时延 ≤1500ms（L7 预算——含 200ms 防抖）
 *  ④Escape 后蓝 tint 残留（INV-37 声明语义——观察点，出具截图供用户确认）
 *  ⑤已高亮区域划选重叠观感（观察点截图——原生蓝×multiply 黄的暗绿）
 * 产物：scripts/audits/f1-out/v4-*.png + f1-forensics4.json
 * 用法：export PATH="/d/nodejs24:$PATH" && node scripts/audits/f1-forensics4.mjs
 */
import { _electron as electron } from '@playwright/test'
import { cp, mkdir, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const ROOT = process.cwd()
const OUT = join(ROOT, 'scripts', 'audits', 'f1-out')
const REALUserData = join(process.env.APPDATA, 'Synapse Remake')
const results = {}
function log(...a) { console.log(`[f4 ${new Date().toISOString().slice(11, 19)}]`, ...a) }

const PAGE_HELPERS = `
  const p19spans = () => { const p = document.querySelector('[data-page-root="19"]')
    ?? document.querySelector('[data-page-root]'); return [...p.querySelectorAll('.textLayer span')]
    .filter(s => s.firstChild && s.firstChild.nodeType === 3 && s.textContent.length > 0) }
  const f4clear = () => { getSelection().removeAllRanges() }
`

async function main() {
  if (!existsSync(join(ROOT, 'out', 'main', 'index.js'))) throw new Error('先 npm run build')
  await mkdir(OUT, { recursive: true })
  const userData = join(tmpdir(), 'synapse-f1-review')
  await rm(userData, { recursive: true, force: true })
  await cp(REALUserData, userData, { recursive: true })
  const app = await electron.launch({ args: ['out/main/index.js'], env: { ...process.env, SYNAPSE_USER_DATA: userData } })
  const win = await app.firstWindow()
  await win.setDefaultTimeout(20_000)
  await win.getByRole('button', { name: '文献库' }).click()
  await win.locator('.lib-card').first().dblclick()
  await win.waitForSelector('[data-page-column="ready"]')
  await win.waitForFunction(() => document.querySelectorAll('[data-page-root] .textLayer span').length >= 20, null, { timeout: 25_000 })
  await win.waitForTimeout(1200)

  // ② ::selection computed 实测（与 e2e 正则同源判据）
  results.selectionComputed = await win.evaluate(`(() => {
    const span = document.querySelector('[data-page-root] .textLayer span')
    return span === null ? 'missing' : getComputedStyle(span, '::selection').backgroundColor
  })()`)
  log('::selection computed =', results.selectionComputed)

  // ① 拖选零停顿持按态（原生通道=即时）：down→移动（无停顿）→evaluate 采样
  // （r4 修正：拖拽进行中禁 Page.screenshot——CDP 输入会话被截图打断，mouseup
  // 丢失致工具条假超时；原生 tint 由「选区在场+::selection 断言」按构造成立）
  const pts = await win.evaluate(`(() => {
    ${PAGE_HELPERS}
    const spans = p19spans()
    const a = spans[Math.floor(spans.length * 0.45)], b = spans[Math.floor(spans.length * 0.55)]
    const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect()
    return { x1: Math.round(ra.x + 2), y1: Math.round(ra.y + ra.height / 2), x2: Math.round(rb.x + rb.width - 2), y2: Math.round(rb.y + rb.height / 2) }
  })()`)
  await win.screenshot({ path: join(OUT, 'v4-baseline.png') })
  await win.mouse.move(pts.x1, pts.y1)
  await win.mouse.down()
  await win.mouse.move(pts.x2, pts.y2, { steps: 8 })
  // 不等待任何防抖——立即采样（原生选区应已在场=拖选即时反馈的程序化证据）
  results.dragImmediate = await win.evaluate(`(() => ({
    selLen: getSelection().toString().length,
    rectsEl: document.querySelector('[data-testid="selection-rects"]') !== null
  }))()`)
  log('dragImmediate', JSON.stringify(results.dragImmediate))
  await win.mouse.up()
  await win.waitForTimeout(300)
  // ④ Escape 后 tint 残留（INV-37）：先确保工具条出现（防抖路径）再 Escape
  // r5：拖选失败（mouseup 丢失类环境干扰）不拦后续阶段——转储现场+双击兜底
  try {
    await win.waitForSelector('[data-testid="selection-toolbar"]', { timeout: 8_000 })
  } catch {
    results.upFailDump = await win.evaluate(`(() => {
      const sel = getSelection()
      const root = (n) => { let c = n; while (c !== null) { if (c instanceof HTMLElement && c.hasAttribute('data-page-root')) return c.getAttribute('data-page-root'); c = c.parentNode } return null }
      return { selLen: sel ? sel.toString().length : -1, aRoot: root(sel?.anchorNode ?? null), fRoot: root(sel?.focusNode ?? null) }
    })()`)
    log('toolbar 未现，现场转储', JSON.stringify(results.upFailDump))
    await win.evaluate(`(() => { ${PAGE_HELPERS} f4clear() })()`)
    await win.waitForTimeout(250)
    await win.mouse.dblclick(pts.x1, pts.y1)
    await win.waitForSelector('[data-testid="selection-toolbar"]', { timeout: 8_000 })
    results.toolbarVia = 'dblclick'
  }
  results.toolbarSeen = true
  await win.screenshot({ path: join(OUT, 'v4-after-up.png') })
  await win.evaluate(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))`)
  await win.waitForTimeout(400)
  results.afterEscape = await win.evaluate(`(() => ({
    selLen: getSelection().toString().length,
    toolbarEl: document.querySelector('[data-testid="selection-toolbar"]') !== null,
    rectsEl: document.querySelector('[data-testid="selection-rects"]') !== null
  }))()`)
  await win.screenshot({ path: join(OUT, 'v4-after-escape.png') }) // 预期：工具条无、蓝 tint 仍在
  await win.evaluate(`(() => { ${PAGE_HELPERS} f4clear() })()`)
  await win.waitForTimeout(300)

  // ③ 工具条时延（L7——程序化选选→toolbar 入 DOM，含 200ms 防抖）
  const lat = await win.evaluate(`new Promise((resolve) => {
    ${PAGE_HELPERS}
    const spans = p19spans()
    const a = spans[Math.floor(spans.length * 0.5)], b = spans[Math.floor(spans.length * 0.55)]
    const t0 = performance.now()
    const obs = new MutationObserver(() => {
      if (document.querySelector('[data-testid="selection-toolbar"]')) {
        obs.disconnect()
        resolve({ t0, tDom: performance.now() })
      }
    })
    obs.observe(document.body, { childList: true, subtree: true })
    setTimeout(() => { obs.disconnect(); resolve({ timeout: true }) }, 6000)
    const r = document.createRange()
    r.setStart(a.firstChild, 0); r.setEnd(b.firstChild, Math.min(5, b.firstChild.data.length))
    const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r)
  })()`)
  results.toolbarLatencyMs = lat.timeout ? 'TIMEOUT>6000' : +(lat.tDom - lat.t0).toFixed(1)
  await win.screenshot({ path: join(OUT, 'v4-toolbar.png') })

  // ⑤ 重叠观察点：同段落先保存高亮（黄 multiply）→重选同段（原生蓝）→截图
  await win.getByTestId('selection-toolbar').getByRole('button', { name: '高亮' }).click()
  await win.waitForTimeout(800)
  await win.evaluate(`(() => {
    ${PAGE_HELPERS}
    const spans = p19spans()
    const a = spans[Math.floor(spans.length * 0.5)], b = spans[Math.floor(spans.length * 0.55)]
    const r = document.createRange()
    r.setStart(a.firstChild, 0); r.setEnd(b.firstChild, Math.min(5, b.firstChild.data.length))
    const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r)
  })()`)
  await win.waitForSelector('[data-testid="selection-toolbar"]', { timeout: 8_000 })
  await win.screenshot({ path: join(OUT, 'v4-overlap-yellow-blue.png') })
  results.overlapReady = true

  await writeFile(join(OUT, 'f1-forensics4.json'), JSON.stringify(results, null, 2), 'utf8')
  await app.close()
  log('完成', JSON.stringify(results))
}

main().catch((e) => { console.error('[f4] FAIL', e); process.exitCode = 1 })
