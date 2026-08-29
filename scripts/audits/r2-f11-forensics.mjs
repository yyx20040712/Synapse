/**
 * R2-F-11 取证器：标注矩形 vs 文本 span 矩形 偏移量化（真实保存路径）。
 * 流程：真实库副本→开第一篇文献→程序化划选 3 处（单 span 高亮/跨 span 高亮/
 * 单 span 下划线）→工具条真实保存→量测渲染出的 annotation-rect 与源 span 盒
 * 的 y 向差值 + 字体度量（canvas fontBoundingBox 量 ascent/descent 带）。
 * 用法：export PATH="/d/nodejs24:$PATH" && node scripts/audits/r2-f11-forensics.mjs
 */
import { _electron as electron } from '@playwright/test'
import { cp, mkdir, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const ROOT = process.cwd()
const OUT = join(ROOT, 'scripts', 'audits', 'r2-f11-out')
const results = {}
function log(...a) {
  console.log(`[f11 ${new Date().toISOString().slice(11, 19)}]`, ...a)
}

/** 页内程序化划选第 idx 个可见 span 的 [s,e) 字符（跨 span 用末参） */
const SELECT_SPAN = (idx, sFrac, eFrac, toIdx = null) => `(() => {
  const spans = [...document.querySelectorAll('[data-page-root] .textLayer span')]
    .filter(sp => sp.firstChild && sp.firstChild.nodeType === 3 && sp.textContent.trim().length > 3)
  const a = spans[${idx}]
  const b = ${toIdx === null ? 'null' : `spans[${toIdx}]`}
  if (a === undefined || (b === null && ${toIdx !== null})) return 'MISSING'
  const t = a.firstChild.data
  const s = Math.floor(t.length * ${sFrac}), e = Math.max(s + 3, Math.floor(t.length * ${eFrac}))
  const r = document.createRange()
  r.setStart(a.firstChild, s)
  r.setEnd(${toIdx === null ? 'a.firstChild, Math.min(e, t.length)' : 'b.firstChild, Math.max(3, Math.floor(b.firstChild.data.length * 0.5))'})
  const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r)
  return 'ok:' + r.toString().slice(0, 18)
})()`

async function main() {
  if (!existsSync(join(ROOT, 'out', 'main', 'index.js'))) throw new Error('先 build')
  await mkdir(OUT, { recursive: true })
  const src = join(process.env.APPDATA, 'Synapse')
  const userData = join(tmpdir(), 'synapse-r2f11')
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

  // ── 三处真实保存（划选→工具条→高亮/下划线）──
  async function saveOne(selectJs, buttonName, tag) {
    const picked = await win.evaluate(selectJs)
    log(tag, '划选:', picked)
    await win.waitForSelector('[data-testid="selection-toolbar"]', { timeout: 8000 })
    await win.getByRole('button', { name: buttonName }).click()
    await win.waitForTimeout(900) // 落库+层刷新（重锚 rAF）
    results[tag] = { picked }
  }
  await saveOne(SELECT_SPAN(2, 0.1, 0.8), '高亮', 'a1-single-highlight')
  await saveOne(SELECT_SPAN(10, 0.1, 0.6, 14), '高亮', 'a2-cross-highlight')
  await saveOne(SELECT_SPAN(20, 0.15, 0.85), '下划线', 'a3-underline')

  // ── 量测：每个 annotation-rect vs 源 span 盒（拼接文本精确索引匹配）──
  results.measure = await win.evaluate(`(() => {
    const layer = document.querySelector('[data-testid="annotation-layer"]')
    if (layer === null) return 'MISSING'
    const spans = [...document.querySelectorAll('[data-page-root] .textLayer span')]
      .filter(sp => sp.firstChild && sp.firstChild.nodeType === 3 && sp.textContent.length > 0)
    // 拼接全文 + 字符序号→span 映射（与 annotation-anchor collectSpans 同口径）
    const owners = []
    let full = ''
    for (const sp of spans) {
      for (let i = 0; i < sp.textContent.length; i++) owners.push(sp)
      full += sp.textContent
    }
    const out = []
    for (const el of document.querySelectorAll('[data-testid="annotation-rect"]')) {
      const quote = (el.getAttribute('aria-label') ?? '').replace(/^标注：/, '')
      const idx = full.indexOf(quote.slice(0, 12))
      if (idx < 0) { out.push({ quote: quote.slice(0, 10), err: 'quote-not-found' }); continue }
      const srcSet = new Set(owners.slice(idx, idx + quote.length))
      const src = [...srcSet]
      if (src.length === 0) { out.push({ quote: quote.slice(0, 10), err: 'no-src' }); continue }
      const dom = src.reduce((b, sp) => (sp.getBoundingClientRect().height > b.getBoundingClientRect().height ? sp : b))
      const eb = el.getBoundingClientRect()
      const sb = dom.getBoundingClientRect()
      const cs = getComputedStyle(dom)
      const cv = document.createElement('canvas').getContext('2d')
      cv.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily
      const m = cv.measureText('Hxgpy')
      const asc = m.fontBoundingBoxAscent, desc = m.fontBoundingBoxDescent
      // line-height:1 下字形带数学：内容区（asc+desc）居中于行盒 → 基线/墨带推算
      const overflow = (asc + desc - sb.height) / 2
      const baseline = sb.top - overflow + asc
      out.push({
        quote: quote.slice(0, 10),
        kind: el.style.height === '2px' ? 'underline' : 'highlight',
        annot: { top: +eb.top.toFixed(1), bottom: +eb.bottom.toFixed(1), h: +eb.height.toFixed(1) },
        span: { top: +sb.top.toFixed(1), bottom: +sb.bottom.toFixed(1), h: +sb.height.toFixed(1) },
        dTopPx: +(eb.top - sb.top).toFixed(1),
        dBottomPx: +(eb.bottom - sb.bottom).toFixed(1),
        dTopPctOfH: +(((eb.top - sb.top) / sb.height) * 100).toFixed(1),
        dBottomPctOfH: +(((eb.bottom - sb.bottom) / sb.height) * 100).toFixed(1),
        // 推算墨带（css 字体度量）相对 span 盒：负=溢出盒外
        inkTopOffsetPx: +(sb.top - overflow - sb.top).toFixed(1),
        inkBottomOverBoxPx: +((baseline + desc) - sb.bottom).toFixed(1),
        baselineFromBoxTopPx: +(baseline - sb.top).toFixed(1),
        srcSpanCount: src.length,
        font: cs.fontSize + ' ' + cs.fontFamily,
        fontBox: { ascent: +asc.toFixed(1), descent: +desc.toFixed(1),
                   descentFrac: +(desc / (asc + desc)).toFixed(3) },
        spanH_over_fontBoxH: +(sb.height / (asc + desc)).toFixed(3)
      })
    }
    return out
  })()`)

  // ── 视觉证据帧：整体页 + 第一条标注近景（含文本对照）──
  await win.screenshot({ path: join(OUT, 'F11-page-annotations.png') })
  const firstRect = win.locator('[data-testid="annotation-rect"]').first()
  await firstRect.scrollIntoViewIfNeeded()
  await win.waitForTimeout(300)
  const fb = await firstRect.boundingBox()
  if (fb !== null) {
    await win.screenshot({
      path: join(OUT, 'F11-closeup.png'),
      clip: { x: Math.max(fb.x - 60, 0), y: Math.max(fb.y - 60, 0), width: Math.min(fb.width + 120, 1280), height: fb.height + 120 }
    })
  }

  await writeFile(join(OUT, 'r2-f11-forensics.json'), JSON.stringify(results, null, 2), 'utf8')
  await app.close()
  log('完成', JSON.stringify(results.measure).slice(0, 400))
}

main().catch((e) => {
  console.error('[f11] FAIL', e)
  process.exitCode = 1
})
