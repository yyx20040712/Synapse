/**
 * F-V1 修复真机复验（一次性探针）——整段多行拖选/标注 band 断位与漂移修复后
 * after 相位断言。crib f-v1-diag.mjs（freshUserData/drag/行表 dump——受锁勿改，
 * 本文件为新建复验面）。跑前必 `node scripts/sqlite-abi.mjs use electron`
 * （node 态主进程加载错 ABI 直接崩——F-V2 实录）。
 *
 * 判据（票面 §5 ①~⑤）：
 *  ① 跨行拖选每视觉行恰 1 块 selection-rect：rect 按「最近中心行」指派后，
 *    指派区间内每行 count===1（中段 hit=0=丢行 / count≥2=同行双块均红），
 *    且 rect 总数=被指派行数（无孤儿块）。行-块归属用最近中心指派——diag 的
 *    宽松 hit 谓词（|Δc|<h）在修复后（带宽≈行距）会把邻行块误计入，不可 crib。
 *  ② 每块 x∈[行首有墨左缘, 行末有墨右缘]±2px（越出该行 span 端点=杂交/超界=红）。
 *  ③ 保存高亮后 annotation-rect 同判据（黄链——与蓝链同源 rectsBetweenPoints）。
 *  ④ 常规行距文献（库中第二篇）同判据回归：不变量在任意行距下成立。
 *  ⑤ pageerror 0。
 * 产物：scripts/audits/f-v1-out/{verify-sel,verify-ann,verify-doc2}.png +
 *  f-v1-verify.json；任一判据红 → exit 1。真机 Electron 短暂开窗属项目取证惯例。
 */
import { _electron as electron } from '@playwright/test'
import { cp, mkdir, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const ROOT = process.cwd()
const OUT = join(ROOT, 'scripts', 'audits', 'f-v1-out')
await mkdir(OUT, { recursive: true })

/** 真实库副本（f-v1-diag 同法；uiScale 保留用户实况） */
async function freshUserData() {
  const src = join(process.env.APPDATA, 'Synapse')
  const userData = join(tmpdir(), 'synapse-f-v1-verify')
  await rm(userData, { recursive: true, force: true })
  for (const p of ['workspaces', 'ai-sensor']) await cp(join(src, p), join(userData, p), { recursive: true })
  for (const f of ['settings.json', 'workspace.json', 'window-state.json']) {
    if (existsSync(join(src, f))) await cp(join(src, f), join(userData, f))
  }
  return userData
}

/** 真鼠标跨行拖选（f-v1-diag 同法：8 步插值+700ms 防抖等待） */
async function drag(win, from, to) {
  await win.mouse.move(from.x, from.y)
  await win.mouse.down()
  for (let i = 1; i <= 8; i += 1) {
    await win.mouse.move(from.x + ((to.x - from.x) * i) / 8, from.y + ((to.y - from.y) * i) / 8)
  }
  await win.mouse.up()
  await win.waitForTimeout(700)
}

/** 页内行表：有墨 span 按 y 中心聚类（±4px 同行）→ {cy, left, right}[]（y 升序）。
 *  页根选择：含选区/标注 rect 的 page-root（虚拟渲染下首 page-root 可能是
 *  无墨占位页）；兜底=有墨 span 最多的 page-root。 */
const rowTable = (rectSel) => {
  const roots = [...document.querySelectorAll('[data-page-root]')]
  if (roots.length === 0) return []
  const page = roots.find((rt) => rt.querySelectorAll(rectSel).length > 0)
    ?? roots.reduce((best, rt) =>
      rt.querySelectorAll('.textLayer span').length > best.querySelectorAll('.textLayer span').length ? rt : best)
  const spans = [...page.querySelectorAll('.textLayer span')]
    .filter((s) => (s.textContent ?? '').trim().length > 0)
    .map((s) => { const g = s.getBoundingClientRect(); return { x: g.x, y: g.y, w: g.width, h: g.height } })
  const rows = []
  for (const s of spans) {
    const cy = s.y + s.h / 2
    const row = rows.find((r) => Math.abs(r.cy - cy) < 4)
    if (row === undefined) rows.push({ cy, left: s.x, right: s.x + s.w })
    else { row.left = Math.min(row.left, s.x); row.right = Math.max(row.right, s.x + s.w) }
  }
  return rows.sort((a, b) => a.cy - b.cy)
}

/** 判据 ①② 核验：rect 最近中心指派行 → 区间每行恰 1 块 + x⊆行端点±2px */
function checkRects(rows, rects, label) {
  const nz = rects.filter((r) => r.w > 0.5).sort((a, b) => a.y - b.y || a.x - b.x)
  const assigned = nz.map((r) => {
    let best = -1, bestD = Infinity
    rows.forEach((row, i) => { const d = Math.abs(r.y + r.h / 2 - rows[i].cy); if (d < bestD) { bestD = d; best = i } })
    return { r, row: best }
  })
  const counts = rows.map(() => 0)
  for (const a of assigned) counts[a.row] += 1
  const first = counts.findIndex((c) => c > 0)
  const last = counts.length - 1 - [...counts].reverse().findIndex((c) => c > 0)
  const rowsCovered = first >= 0 ? last - first + 1 : 0
  const onePerRow = first >= 0 && counts.slice(first, last + 1).every((c) => c === 1)
  const noOrphan = assigned.length === rowsCovered
  const inBounds = assigned.every(({ r, row }) =>
    r.x >= rows[row].left - 2 && r.x + r.w <= rows[row].right + 2)
  const bad = assigned.filter(({ r, row }) => !(r.x >= rows[row].left - 2 && r.x + r.w <= rows[row].right + 2))
  return {
    label, rectCount: nz.length, rowsCovered, onePerRow, noOrphan, inBounds,
    counts: counts.slice(first >= 0 ? first : 0, last + 1),
    badX: bad.map(({ r, row }) => ({ rect: r, rowLeft: +rows[row].left.toFixed(1), rowRight: +rows[row].right.toFixed(1) })),
    pass: onePerRow && noOrphan && inBounds
  }
}

const userData = await freshUserData()
const app = await electron.launch({ args: ['out/main/index.js'], env: { ...process.env, SYNAPSE_USER_DATA: userData } })
const win = await app.firstWindow()
const pageErrors = []
win.on('pageerror', (e) => pageErrors.push(String(e)))
await win.getByRole('button', { name: '文献库' }).waitFor({ timeout: 20_000 })
await win.getByRole('button', { name: '文献库' }).click()
await win.waitForTimeout(800)

/** 打开第 idx 篇 → 中部连续 6 行整段拖选（f-v1-diag 同法锚点） */
async function dragMid(win, cardIdx) {
  await win.locator('button.lib-card').nth(cardIdx).dblclick()
  await win.waitForSelector('.textLayer span', { timeout: 20_000 })
  await win.waitForTimeout(1500)
  const anchors = await win.evaluate(() => {
    // 只取当前视口内的有墨 span（全文档取 mid 行可能落在折叠下方——拖选落空）
    const vh = window.innerHeight
    const spans = [...document.querySelectorAll('.textLayer span')]
      .filter((s) => (s.textContent ?? '').trim().length > 0)
      .map((s) => { const g = s.getBoundingClientRect(); return { x: g.x, y: g.y, w: g.width, h: g.height } })
      .filter((s) => s.y > 80 && s.y + s.h < vh - 80)
    if (spans.length < 10) return { err: 'spans too few', n: spans.length }
    const rows = []
    for (const s of spans) {
      const cy = s.y + s.h / 2
      const row = rows.find((r) => Math.abs(r.cy - cy) < 4)
      if (row === undefined) rows.push({ cy, spans: [s] })
      else { row.spans.push(s) }
    }
    rows.sort((a, b) => a.cy - b.cy)
    const mid = Math.floor(rows.length / 2)
    const firstRow = rows[Math.max(1, mid - 3)], lastRow = rows[Math.min(rows.length - 2, mid + 3)]
    const a = firstRow.spans[1] ?? firstRow.spans[0]
    const b = lastRow.spans[lastRow.spans.length - 2] ?? lastRow.spans[lastRow.spans.length - 1]
    return { x1: a.x + a.w * 0.3, y1: a.y + a.h * 0.5, x2: b.x + b.w * 0.7, y2: b.y + b.h * 0.5, rowsTotal: rows.length }
  })
  if (anchors.err !== undefined) return { anchors }
  await drag(win, { x: anchors.x1, y: anchors.y1 }, { x: anchors.x2, y: anchors.y2 })
  return { anchors }
}

const getRects = (sel) => win.evaluate(
  (selector) => [...document.querySelectorAll(selector)].map((r) => {
    const g = r.getBoundingClientRect()
    return { x: +g.x.toFixed(1), y: +g.y.toFixed(1), w: +g.width.toFixed(1), h: +g.height.toFixed(1) }
  }),
  sel
)

const results = []

// ── 紧凑行距文献（第一篇，f-v1-diag 同文档）①②③ ──
const d1 = await dragMid(win, 0)
if (d1.anchors.err !== undefined) throw new Error(`doc1 anchors: ${JSON.stringify(d1.anchors)}`)
const rows1 = await win.evaluate(rowTable, '[data-testid=selection-rect]')
const selRects = await getRects('[data-testid=selection-rect]')
results.push({ ...checkRects(rows1, selRects, '①② 紧凑行距·蓝链 selection-rect'), anchors: d1.anchors })
await win.screenshot({ path: join(OUT, 'verify-sel.png') })

let annResult = { label: '③ 黄链', pass: false, skipped: true }
try {
  await win.getByTestId('selection-toolbar').getByRole('button', { name: '高亮' }).click({ timeout: 4000 })
  await win.waitForTimeout(800)
  const annRects = await getRects('[data-testid=annotation-rect]')
  annResult = checkRects(rows1, annRects, '③ 紧凑行距·黄链 annotation-rect')
  results.push(annResult)
  await win.screenshot({ path: join(OUT, 'verify-ann.png') })
} catch (e) {
  annResult = { label: '③ 黄链', pass: false, error: String(e).slice(0, 160) }
  results.push(annResult)
}

// ── ④ 常规行距文献（库中第二篇）回归 ──
await win.getByRole('button', { name: '文献库' }).click()
await win.waitForTimeout(1200)
const d2 = await dragMid(win, 1)
if (d2.anchors.err !== undefined) throw new Error(`doc2 anchors: ${JSON.stringify(d2.anchors)}`)
await win.waitForTimeout(500) // 画布/选区自绘层附加稳态等待
const doc2Debug = await win.evaluate(() => {
  const sel = window.getSelection()
  const selRects = sel !== null && sel.rangeCount > 0 ? [...sel.getRangeAt(0).getClientRects()].length : 0
  return {
    spans: document.querySelectorAll('.textLayer span').length,
    inkSpans: [...document.querySelectorAll('.textLayer span')].filter((s) => (s.textContent ?? '').trim().length > 0).length,
    selTextLen: sel !== null ? sel.toString().length : 0,
    selRangeRects: selRects,
    selRectEls: document.querySelectorAll('[data-testid=selection-rect]').length,
    toolbar: document.querySelectorAll('[data-testid=selection-toolbar]').length
  }
})
const rows2 = await win.evaluate(rowTable, '[data-testid=selection-rect]')
const selRects2 = await getRects('[data-testid=selection-rect]')
results.push({
  ...checkRects(rows2, selRects2, '④ 第二篇文献·蓝链回归'),
  anchors: d2.anchors,
  debug: doc2Debug,
  rowsYX: rows2.map((rw) => ({ cy: +rw.cy.toFixed(1), left: +rw.left.toFixed(1), right: +rw.right.toFixed(1) })),
  rectsDump: selRects2
})
await win.screenshot({ path: join(OUT, 'verify-doc2.png') })

// ── ⑤ pageerror ──
const pageErrorCheck = { label: '⑤ pageerror', count: pageErrors.length, pass: pageErrors.length === 0, pageErrors }
results.push(pageErrorCheck)

const allPass = results.every((r) => r.pass)
const summary = { allPass, checks: results.map(({ label, pass, rectCount, rowsCovered, onePerRow, noOrphan, inBounds, counts, count }) => ({ label, pass, rectCount, rowsCovered, onePerRow, noOrphan, inBounds, counts, count })) }
await writeFile(join(OUT, 'f-v1-verify.json'), JSON.stringify({ summary, results }, null, 2))
console.log(JSON.stringify(summary, null, 1))
await app.close()
process.exit(allPass ? 0 : 1)
