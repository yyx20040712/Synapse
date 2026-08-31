/**
 * F-A5 一次性诊断探针 v2（修前基线定向——票面 §0b「探针先行」）。
 * v1 教训：① querySelectorAll('.textLayer span') 混入离屏缓冲页 span（负 y）
 * →行簇/拖选落点必须先过滤视口内；② ink 扫描必须取「目标块所在页」的 canvas
 * （querySelector 首个 canvas 是 DOM 首渲染页，非视口页）——v2 按锚定 y 选页。
 * 产出：paper#1（6.4px 小字号——用户图1 场景）a 面（自绘块 vs 墨带）+
 * paper#5（存量 5 标注——用户图2 场景）b 面（标注块 vs 墨带）+ c 面（块内
 * 文字像素采样）+ band 数学重演（真机字体度量）。
 */
import { _electron as electron } from '@playwright/test'
import { cp, mkdir, rm } from 'node:fs/promises'
import { existsSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const ROOT = process.cwd()
const OUT = join(ROOT, 'scripts', 'audits', 'f-a5-out')
await mkdir(OUT, { recursive: true })
const log = (...a) => console.log(`[f-a5-diag ${new Date().toISOString().slice(11, 19)}]`, ...a)

async function freshUserData(tag) {
  const src = join(process.env.APPDATA, 'Synapse')
  const userData = join(tmpdir(), `synapse-f-a5-${tag}`)
  await rm(userData, { recursive: true, force: true })
  for (const p of ['workspaces', 'ai-sensor']) await cp(join(src, p), join(userData, p), { recursive: true })
  for (const f of ['settings.json', 'workspace.json', 'window-state.json']) {
    if (existsSync(join(src, f))) await cp(join(src, f), join(userData, f))
  }
  return userData
}

/** 视口内几何快照（只取滚动容器可视区内的 span——v1 教训①） */
const DUMP = `(() => {
  const col = document.querySelector('[data-page-column="ready"]')
  const scroller = col?.closest('.overflow-auto')
  const sc = scroller?.getBoundingClientRect()
  const vis = (g) => sc ? (g.y > sc.y + 40 && g.y + g.height < sc.y + sc.height - 20) : g.y > 130
  const spans = [...document.querySelectorAll('.textLayer span')]
    .filter((s) => { const g = s.getBoundingClientRect(); return g.width > 2 && vis(g) })
    .map((s) => { const g = s.getBoundingClientRect(); const cs = getComputedStyle(s); return { x: g.x, y: g.y, w: g.width, h: g.height, fs: parseFloat(cs.fontSize), font: cs.fontFamily.slice(0, 40) } })
  const ann = [...document.querySelectorAll('[data-testid="annotation-rect"]')].filter((el) => vis(el.getBoundingClientRect())).map((el) => { const g = el.getBoundingClientRect(); return { x: g.x, y: g.y, w: g.width, h: g.height, bg: el.style.background, op: el.style.opacity } })
  const ai = [...document.querySelectorAll('[data-testid="ai-note-rect"]')].filter((el) => vis(el.getBoundingClientRect())).map((el) => { const g = el.getBoundingClientRect(); return { x: g.x, y: g.y, w: g.width, h: g.height, bg: el.style.background, op: el.style.opacity } })
  const paint = [...document.querySelectorAll('[data-testid="selection-rect"]')].map((el) => { const g = el.getBoundingClientRect(); return { x: g.x, y: g.y, w: g.width, h: g.height } })
  return { spans, ann, ai, paint, scroller: sc ? { x: sc.x, y: sc.y, w: sc.width, h: sc.height } : null }
})()`

/** 墨带扫描 v2：按锚定 y 选「覆盖该 y 的页 canvas」（v1 教训②）。
 *  亮度 <128 计墨；返回墨带四界+最暗核（CSS px 视口域）。 */
function inkScanCode(y0, y1, x0, x1, anchorY) {
  return `(() => {
    const canvases = [...document.querySelectorAll('canvas[data-pdf-canvas]')]
    const anchor = ${anchorY}
    let canvas = canvases.find((c) => { const g = c.getBoundingClientRect(); return anchor >= g.y - 2 && anchor <= g.y + g.height + 2 })
    if (!canvas) { let best = canvases[0]; for (const c of canvases) { const g = c.getBoundingClientRect(); if (Math.abs(g.y - anchor) < Math.abs(best.getBoundingClientRect().y - anchor)) best = c } canvas = best }
    const g = canvas.getBoundingClientRect()
    const sx = canvas.width / g.width, sy = canvas.height / g.height
    const ctx = canvas.getContext('2d')
    const px0 = Math.max(0, Math.floor((${x0} - g.x) * sx)), px1 = Math.min(canvas.width, Math.ceil((${x1} - g.x) * sx))
    const py0 = Math.max(0, Math.floor((${y0} - g.y) * sy)), py1 = Math.min(canvas.height, Math.ceil((${y1} - g.y) * sy))
    if (px1 <= px0 || py1 <= py0) return { err: 'empty-region', canvasY: g.y }
    const data = ctx.getImageData(px0, py0, px1 - px0, py1 - py0).data
    const rowInk = [], colInk = []
    let darkest = 765
    for (let y = 0; y < py1 - py0; y++) { let n = 0
      for (let x = 0; x < px1 - px0; x++) { const i = (y * (px1 - px0) + x) * 4
        const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
        if (lum < 128) { n++; colInk[x] = (colInk[x] ?? 0) + 1 }
        if (lum < darkest) darkest = lum }
      rowInk.push(n) }
    const cssY = (v) => g.y + v / sy, cssX = (v) => g.x + v / sx
    // 连续墨行带：包住 seed（锚定 y）的连续 ink 行——防相邻行墨漏进窗口
    const seed = Math.max(0, Math.min(Math.round((anchor - g.y) * sy - py0), rowInk.length - 1))
    let top = -1, bot = -1
    for (let y = seed; y >= 0; y--) { if (rowInk[y] >= 1) top = y; else if (top >= 0) break }
    for (let y = seed; y < rowInk.length; y++) { if (rowInk[y] >= 1) bot = y; else if (bot >= 0) break }
    let left = -1, right = -1
    if (top >= 0) for (let x = 0; x < colInk.length; x++) if ((colInk[x] ?? 0) >= 1) { if (left < 0) left = x; right = x }
    return { inkTop: top < 0 ? null : cssY(py0 + top), inkBot: bot < 0 ? null : cssY(py0 + bot), inkLeft: left < 0 ? null : cssX(px0 + left), inkRight: right < 0 ? null : cssX(px0 + right), darkest: Math.round(darkest), pageY: g.y }
  })()`
}
const inkScan = (win, y0, y1, x0, x1, anchorY) => win.evaluate(inkScanCode(y0, y1, x0, x1, anchorY))

async function openReader(win, idx) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await win.getByRole('button', { name: '文献库' }).waitFor({ timeout: 20_000 })
    await win.getByRole('button', { name: '文献库' }).click()
    await win.waitForTimeout(700)
    const cards = win.locator('button.lib-card')
    await cards.nth(idx).scrollIntoViewIfNeeded()
    await cards.nth(idx).dblclick()
    // 卡片重挂载时序（列表 re-render 吞 dblclick——dbg 实证）——3 次重试
    try {
      await win.waitForSelector('[data-page-column="ready"]', { timeout: 9_000 })
      await win.waitForSelector('.textLayer span', { timeout: 8_000 })
      await win.waitForTimeout(1200)
      return
    } catch {
      log(`paper#${idx} open 第 ${attempt + 1} 次未就绪——重试`)
    }
  }
  throw new Error(`paper#${idx} 打不开`)
}

async function closeReader(win) {
  await win.getByRole('button', { name: '文献库' }).click()
  await win.locator('button.lib-card').first().waitFor({ timeout: 8_000 })
  await win.waitForTimeout(500)
}

/** 视口内行簇（宽 span 按 y 聚行）；栏过滤=与 seed 列 x 重叠的 span 才入簇（双栏防跨选） */
function collectRows(d, columnSeedX) {
  const vis = d.spans.filter((s) => s.w > 10)
  const rows = []
  for (const s of vis) {
    if (columnSeedX !== undefined && !(s.x < columnSeedX + 320 && s.x + s.w > columnSeedX - 20)) continue
    const r = rows.find((row) => Math.abs(row.y - s.y) < 6)
    if (r === undefined) rows.push({ y: s.y, items: [s] })
    else r.items.push(s)
  }
  return rows.sort((a, b) => a.y - b.y)
}

async function drag(win, from, to) {
  await win.mouse.move(from.x, from.y)
  await win.mouse.down()
  for (let i = 1; i <= 8; i += 1) await win.mouse.move(from.x + ((to.x - from.x) * i) / 8, from.y + ((to.y - from.y) * i) / 8)
  await win.mouse.up()
  await win.waitForTimeout(700)
}

const userData = await freshUserData('diag2')
const app = await electron.launch({ args: ['out/main/index.js'], env: { ...process.env, SYNAPSE_USER_DATA: userData } })
const win = await app.firstWindow()
const pageErrors = []
win.on('pageerror', (e) => pageErrors.push(String(e)))
const report = {}

// ════ 场景 B：paper#5（存量 5 标注）——b 面（块 vs 墨带）+c 面（像素采样） ════
await openReader(win, 5)
// 存量标注页可能在后页——先扫当前视口，无则翻找（JSTOR 首页通常无标注）
let d5 = await win.evaluate(DUMP)
let tries = 0
while (d5.ann.length === 0 && tries < 6) {
  await win.evaluate(() => {
    const scroller = document.querySelector('[data-page-column]')?.closest('.overflow-auto')
    if (scroller) scroller.scrollTop += Math.round(scroller.clientHeight * 0.9)
  })
  await win.waitForTimeout(1100)
  d5 = await win.evaluate(DUMP)
  tries += 1
}
await win.screenshot({ path: join(OUT, 'diag-ann-existing.png') })
report.bFace = []
for (const b of d5.ann.slice(0, 5)) {
  const ink = await inkScan(win, b.y - b.h, b.y + b.h * 2, b.x - 2, b.x + b.w + 2, b.y + b.h / 2)
  const m = ink && ink.inkTop !== null
    ? { topDev: b.y - ink.inkTop, botDev: b.y + b.h - ink.inkBot, hRatio: b.h / (ink.inkBot - ink.inkTop), darkestInBlock: ink.darkest }
    : null
  report.bFace.push({ block: b, ink, metrics: m })
  if (m) log(`b面块: ${b.w.toFixed(0)}×${b.h.toFixed(0)} 顶差${m.topDev.toFixed(1)} 底差${m.botDev.toFixed(1)} 块高/墨高=${m.hRatio.toFixed(2)} 块内最暗=${m.darkestInBlock}`)
  else log(`b面块: ink=${JSON.stringify(ink)?.slice(0, 80)}`)
}
// c 面：块外同行文字最暗核（对照——块内 vs 块外）
if (d5.ann.length > 0) {
  const b = d5.ann[0]
  const rows5 = collectRows(d5)
  const near = rows5.find((r) => Math.abs(r.y - b.y) < 30)
  if (near !== undefined) {
    const maxX = Math.max(...near.items.map((s) => s.x + s.w))
    const yTop = Math.min(...near.items.map((s) => s.y))
    const yBot = Math.max(...near.items.map((s) => s.y + s.h))
    // 块内最暗（已有）+块 x 区间外但同行内的最暗：扫 x∈[b.x+b.w+6, maxX]
    const outside = await inkScan(win, yTop - 4, yBot + 4, Math.min(b.x + b.w + 6, maxX - 4), maxX, (yTop + yBot) / 2)
    report.cFace = { inBlock: report.bFace[0]?.metrics?.darkestInBlock ?? null, outside: outside?.darkest ?? null }
    log(`c面: 块内文字最暗=${report.cFace.inBlock} 块外同行最暗=${report.cFace.outside}（差=染色量）`)
  }
}
await closeReader(win)

// ════ 场景 A：paper#1（6.4px 最小字号）——a 面（自绘块 vs 墨带）+band 数学 ════
await openReader(win, 1)
await win.evaluate(() => {
  const scroller = document.querySelector('[data-page-column]')?.closest('.overflow-auto')
  if (scroller) scroller.scrollTop += Math.round(scroller.clientHeight * 0.9)
})
await win.waitForTimeout(1200)
let d = await win.evaluate(DUMP)
// 栏种子=x 中位 span（双栏页取其所在栏——320px 栏窗防跨栏聚行/跨栏拖选）
const wideSpans = d.spans.filter((x) => x.w > 10).sort((a, b) => a.x - b.x)
let rows = collectRows(d, wideSpans[Math.floor(wideSpans.length / 2)]?.x)
report.smallFont = { medFs: d.spans.map((s) => s.fs).sort((a, b) => a - b)[Math.floor(d.spans.length / 2)], rows: rows.length }
log(`paper#1 medFs=${report.smallFont.medFs} 可视行簇 ${rows.length}`)

if (rows.length >= 3) {
  const r1 = rows[0].items[0]
  const r3 = rows[2].items.at(-1)
  await drag(win, { x: r1.x + 2, y: r1.y + r1.h / 2 }, { x: r3.x + r3.w - 2, y: r3.y + r3.h / 2 })
  d = await win.evaluate(DUMP)
  await win.screenshot({ path: join(OUT, 'diag-small-select.png') })
  report.aFace = []
  for (const [ri, row] of [rows[0], rows[1], rows[2]].entries()) {
    const minX = Math.min(...row.items.map((s) => s.x))
    const maxX = Math.max(...row.items.map((s) => s.x + s.w))
    const yTop = Math.min(...row.items.map((s) => s.y))
    const yBot = Math.max(...row.items.map((s) => s.y + s.h))
    const ink = await inkScan(win, yTop - 3, yBot + 3, minX - 4, maxX + 4, (yTop + yBot) / 2)
    const blk = d.paint.filter((p) => Math.abs(p.y + p.h / 2 - (yTop + yBot) / 2) < (yBot - yTop) * 1.5)[0] ?? null
    const m = blk && ink && ink.inkTop !== null
      ? { blockH: blk.h, inkH: ink.inkBot - ink.inkTop, hRatio: blk.h / (ink.inkBot - ink.inkTop), topOver: blk.y - ink.inkTop, botOver: blk.y + blk.h - ink.inkBot, leftOver: blk.x - ink.inkLeft, rightOver: blk.x + blk.w - ink.inkRight, spanTop: yTop, spanH: yBot - yTop, fs: row.items[0].fs, darkest: ink.darkest }
      : null
    report.aFace.push({ row: ri, spanBox: { x: minX, y: yTop, w: maxX - minX, h: yBot - yTop }, block: blk, ink, metrics: m })
    if (m) log(`a面行${ri}: 块高${m.blockH.toFixed(1)}/墨高${m.inkH.toFixed(1)}=${m.hRatio.toFixed(2)} 顶溢${m.topOver.toFixed(1)} 底溢${m.botOver.toFixed(1)} 左越${m.leftOver.toFixed(1)} 右越${m.rightOver.toFixed(1)} span高${m.spanH.toFixed(1)} fs=${m.fs}`)
    else log(`a面行${ri}: ink=${JSON.stringify(ink)?.slice(0, 80)} blk=${JSON.stringify(blk)?.slice(0, 60)}`)
  }
  // band 数学重演（本页可视 span 前 6 个）
  report.bandMath = await win.evaluate(`(() => {
    const col = document.querySelector('[data-page-column="ready"]')
    const sc = col?.closest('.overflow-auto')?.getBoundingClientRect()
    const c = document.createElement('canvas'); const ctx = c.getContext('2d')
    const out = []
    const spans = [...document.querySelectorAll('.textLayer span')].filter((s) => { const g = s.getBoundingClientRect(); return g.width > 10 && (!sc || (g.y > sc.y + 40 && g.y + g.height < sc.y + sc.height - 20)) }).slice(0, 6)
    for (const s of spans) {
      const g = s.getBoundingClientRect(); const cs = getComputedStyle(s)
      ctx.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily
      const m = ctx.measureText((s.textContent || 'x').slice(0, 30))
      const fs = parseFloat(cs.fontSize)
      const half = (fs - m.fontBoundingBoxAscent - m.fontBoundingBoxDescent) / 2
      const baseline = g.y + half + m.fontBoundingBoxAscent
      out.push({ fs, boxY: +g.y.toFixed(1), boxH: +g.height.toFixed(1), half: +half.toFixed(2), baseline: +baseline.toFixed(1), inkAsc: +m.actualBoundingBoxAscent.toFixed(1), inkDesc: +m.actualBoundingBoxDescent.toFixed(1), fAsc: +m.fontBoundingBoxAscent.toFixed(1), fDesc: +m.fontBoundingBoxDescent.toFixed(1), bandTop: +(baseline - m.actualBoundingBoxAscent).toFixed(1), bandBot: +(baseline + m.actualBoundingBoxDescent).toFixed(1), font: cs.fontFamily.slice(0, 30), text: (s.textContent || '').slice(0, 14) })
    }
    return out
  })()`)
  for (const b of report.bandMath) log(`band: fs=${b.fs} box=${b.boxY}+${b.boxH} half=${b.half} base=${b.baseline} 墨带=[${b.bandTop},${b.bandBot}] font=${b.font} "${b.text}"`)
  // 保存高亮→b 面（小字号文档上的新标注）
  const tb = await win.$('[data-testid="selection-toolbar"]')
  if (tb !== null) {
    await win.getByTestId('selection-toolbar').getByRole('button', { name: '高亮' }).click({ timeout: 5_000 })
    await win.waitForSelector('[data-testid="annotation-rect"]', { timeout: 10_000 })
    await win.waitForTimeout(500)
    const dSaved = await win.evaluate(DUMP)
    report.smallFontAnn = { blocks: dSaved.ann.length }
    log(`paper#1 保存高亮 ${dSaved.ann.length} 块`)
  }
}
await closeReader(win)

writeFileSync(join(OUT, 'f-a5-diag.json'), JSON.stringify({ meta: { date: new Date().toISOString(), script: 'f-a5-diag.mjs v2' }, report, pageErrors }, null, 2))
await app.close()
log(`完成 → f-a5-out/f-a5-diag.json（pageerror ${pageErrors.length}）`)
