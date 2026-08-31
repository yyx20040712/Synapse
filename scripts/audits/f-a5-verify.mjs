/**
 * F-A5 修后真机探针（票面 §5；修前基线=f-a5-diag.json 在档——本脚本只跑 after）。
 *
 * 判据（票面 §5①~⑤）：
 * - ① a 面：自绘块高/文字行墨高比 ≤1.4（修前 1.57~1.83）+块顶贴墨顶 ≤2px
 *   （修前溢出 8~10px）+水平界=span 簇端点内（左右越出 ≤2px）；
 * - ② b 面：标注块（新保存+AI 注入段）顶贴墨顶 ≤2px+高比 ≤1.4；
 * - ③ c 面：色块内文字最暗核 ≤8（纯黑域，吞 AA 尾）+层序 computed 断言
 *   （色块 z1 < canvas z2 < 自绘 z3；multiply=normal）；
 * - ④ S4 选区叠标注（选择模式重选已存高亮带→灰块在场）/S6 Escape 清选区
 *   色块不变/zoom150 块数一致；
 * - ⑤ pageerror 0。
 * AI 段注入：主进程 evaluate 直写 ai_notes（探针副本库——只读面的逆向：
 * 副本可写；真实库零触碰）。真机 Electron 短暂开窗=LOOP 取证惯例。
 * 产物：scripts/audits/f-a5-out/after-*.png + f-a5-verify-after.json。
 */
import { _electron as electron } from '@playwright/test'
import { cp, mkdir, rm } from 'node:fs/promises'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const PHASE = 'after'
const ROOT = process.cwd()
const OUT = join(ROOT, 'scripts', 'audits', 'f-a5-out')
await mkdir(OUT, { recursive: true })
const log = (...a) => console.log(`[f-a5/${PHASE} ${new Date().toISOString().slice(11, 19)}]`, ...a)
const results = []
const check = (id, pass, detail) => {
  results.push({ id, pass, detail })
  log(`${pass ? 'PASS' : 'FAIL'} ${id} — ${detail}`)
}
const pageErrors = []

async function freshUserData() {
  const src = join(process.env.APPDATA, 'Synapse')
  const userData = join(tmpdir(), `synapse-f-a5-${PHASE}`)
  await rm(userData, { recursive: true, force: true })
  for (const p of ['workspaces', 'ai-sensor']) await cp(join(src, p), join(userData, p), { recursive: true })
  for (const f of ['settings.json', 'workspace.json', 'window-state.json']) {
    if (existsSync(join(src, f))) await cp(join(src, f), join(userData, f))
  }
  return userData
}

/** 视口内几何快照+层序 computed */
const DUMP = `(() => {
  const col = document.querySelector('[data-page-column="ready"]')
  const scroller = col?.closest('.overflow-auto')
  const sc = scroller?.getBoundingClientRect()
  const vis = (g) => sc ? (g.y > sc.y + 40 && g.y + g.height < sc.y + sc.height - 20) : g.y > 130
  const spans = [...document.querySelectorAll('.textLayer span')]
    .filter((s) => { const g = s.getBoundingClientRect(); return g.width > 2 && vis(g) })
    .map((s) => { const g = s.getBoundingClientRect(); return { x: g.x, y: g.y, w: g.width, h: g.height, fs: parseFloat(getComputedStyle(s).fontSize), text: (s.textContent || '').slice(0, 60) } })
  const box = (el) => { const g = el.getBoundingClientRect(); return { x: g.x, y: g.y, w: g.width, h: g.height } }
  const ann = [...document.querySelectorAll('[data-testid="annotation-rect"]')].filter((el) => vis(el.getBoundingClientRect())).map(box)
  const ai = [...document.querySelectorAll('[data-testid="ai-note-rect"]')].filter((el) => vis(el.getBoundingClientRect())).map((el) => ({ ...box(el), id: el.getAttribute('data-ai-note-id') }))
  const paint = [...document.querySelectorAll('[data-testid="selection-rect"]')].map(box)
  const layerZ = (sel) => { const el = document.querySelector(sel); return el ? { z: getComputedStyle(el).zIndex, blend: getComputedStyle(el).mixBlendMode } : null }
  const canvas = document.querySelector('canvas[data-pdf-canvas]')
  return {
    spans, ann, ai, paint,
    z: { ann: layerZ('[data-testid="annotation-layer"]'), ai: layerZ('[data-testid="ai-annotation-layer"]'), canvas: canvas ? { z: getComputedStyle(canvas).zIndex, pe: getComputedStyle(canvas).pointerEvents } : null, paint: layerZ('[data-testid="selection-rects"]'), text: layerZ('.textLayer') },
    scroller: sc ? { x: sc.x, y: sc.y, w: sc.width, h: sc.height } : null
  }
})()`

/** 墨带扫描（连续带=包住锚 y 的连续墨行； crib f-a5-diag） */
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
    if (px1 <= px0 || py1 <= py0) return { err: 'empty' }
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
    const seed = Math.max(0, Math.min(Math.round((anchor - g.y) * sy - py0), rowInk.length - 1))
    let top = -1, bot = -1
    for (let y = seed; y >= 0; y--) { if (rowInk[y] >= 1) top = y; else if (top >= 0) break }
    for (let y = seed; y < rowInk.length; y++) { if (rowInk[y] >= 1) bot = y; else if (bot >= 0) break }
    let left = -1, right = -1
    if (top >= 0) for (let x = 0; x < colInk.length; x++) if ((colInk[x] ?? 0) >= 1) { if (left < 0) left = x; right = x }
    return { inkTop: top < 0 ? null : cssY(py0 + top), inkBot: bot < 0 ? null : cssY(py0 + bot), inkLeft: left < 0 ? null : cssX(px0 + left), inkRight: right < 0 ? null : cssX(px0 + right), darkest: Math.round(darkest) }
  })()`
}
const inkScan = (win, y0, y1, x0, x1, anchorY) => win.evaluate(inkScanCode(y0, y1, x0, x1, anchorY))

/** AI 段注入（副本库）：quote 取目标页真实文本项（verifyQuote 逐字口径）。
 *  主进程 evaluate 无 require/import 通道（ESM bundle）→ 子进程 electron.exe
 *  直跑 f-a5-inject.mjs（ESM 主脚本+better-sqlite3 经 createRequire）。 */
async function injectAiNotes(userData, paperTitleLike, notes) {
  const { writeFile } = await import('node:fs/promises')
  const spec = join(tmpdir(), 'f-a5-inject-spec.json')
  await writeFile(spec, JSON.stringify({ userDataDir: userData, titleLike: paperTitleLike, rows: notes }), 'utf8')
  const { spawnSync } = await import('node:child_process')
  // spawnSync 管道态（默认 stdio）下 ESM 主脚本挂起（实证 60s ETIMEDOUT×3）；
  // stdio inherit 直通+结果经文件回传
  const resultPath = join(tmpdir(), 'f-a5-inject-result.json')
  const r = spawnSync(join(ROOT, 'node_modules', 'electron', 'dist', 'electron.exe'), [join(ROOT, 'scripts', 'audits', 'f-a5-inject.mjs'), spec, resultPath], { stdio: 'inherit', timeout: 60_000 })
  if (r.status !== 0) throw new Error('inject 失败：status=' + r.status + ' err=' + String(r.error))
  return readFileSync(resultPath, 'utf8')
}

async function openReader(win, idx) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await win.getByRole('button', { name: '文献库' }).waitFor({ timeout: 20_000 })
    await win.getByRole('button', { name: '文献库' }).click()
    await win.waitForTimeout(700)
    const cards = win.locator('button.lib-card')
    await cards.nth(idx).scrollIntoViewIfNeeded()
    await cards.nth(idx).dblclick()
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

/** 栏感知行簇（diag 教训：双栏页 y 聚组会把两栏混成一"行"——跨栏拖选
 *  43 块污染）。先 y 聚组，组内按 x 间隙 >40px 分段；目标栏=视口中部最长段
 *  的 x 带，行簇=与该带重叠 >50% 的段。 */
function columnRows(d) {
  const vis = d.spans.filter((s) => s.w > 10).slice().sort((a, b) => a.y - b.y)
  const yGroups = []
  for (const sp of vis) {
    const g = yGroups.find((row) => Math.abs(row.y - sp.y) < 6)
    if (g === undefined) yGroups.push({ y: sp.y, items: [sp] })
    else g.items.push(sp)
  }
  const segs = []
  for (const g of yGroups) {
    const byX = [...g.items].sort((a, b) => a.x - b.x)
    let seg = []
    let right = Number.NEGATIVE_INFINITY
    for (const sp of byX) {
      if (seg.length > 0 && sp.x - right > 40) {
        segs.push({ y: g.y, items: seg })
        seg = []
      }
      seg.push(sp)
      right = Math.max(right, sp.x + sp.w)
    }
    if (seg.length > 0) segs.push({ y: g.y, items: seg })
  }
  // 目标栏=宽度中位的段（最长段可能是全宽摘要/表——会把栏带撑满页宽）
  const allX0 = Math.min(...vis.map((x) => x.x))
  const allX1 = Math.max(...vis.map((x) => x.x + x.w))
  const byWidth = [...segs].sort((a, b) => (Math.max(...a.items.map((x) => x.x + x.w)) - Math.min(...a.items.map((x) => x.x))) - (Math.max(...b.items.map((x) => x.x + x.w)) - Math.min(...b.items.map((x) => x.x))))
  let col = byWidth[Math.floor(byWidth.length / 2)]
  if (Math.max(...col.items.map((x) => x.x + x.w)) - Math.min(...col.items.map((x) => x.x)) > (allX1 - allX0) * 0.65) {
    // 中位仍是全宽（单栏页）——直接全宽即单栏
  }
  const cx0 = Math.min(...col.items.map((x) => x.x))
  const cx1 = Math.max(...col.items.map((x) => x.x + x.w))
  const rows = segs
    .map((sg) => {
      const ox = Math.min(cx1, Math.max(...sg.items.map((x) => x.x + x.w))) - Math.max(cx0, Math.min(...sg.items.map((x) => x.x)))
      if (ox <= (cx1 - cx0) * 0.5) return null
      // 行内 span 裁剪到栏带（防对角跨栏拖选——items 端点必在栏内）
      const clipped = sg.items.filter((x) => x.x >= cx0 - 20 && x.x + x.w <= cx1 + 20)
      return clipped.length > 0 ? { y: sg.y, items: clipped } : null
    })
    .filter((r) => r !== null)
    .sort((a, b) => a.y - b.y)
  return rows
}

async function drag(win, from, to) {
  await win.mouse.move(from.x, from.y)
  await win.mouse.down()
  for (let i = 1; i <= 8; i += 1) await win.mouse.move(from.x + ((to.x - from.x) * i) / 8, from.y + ((to.y - from.y) * i) / 8)
  await win.mouse.up()
  await win.waitForTimeout(700)
}

/** 目标块 vs 行（span 锚定——墨带 ground truth 在紧行距参考区会被邻行墨
 *  粘连污染（探针实证 inkH 跨行），判据锚 pdf.js span 盒（其 y 定位=PDF 墨顶
 *  口径，F-A4 verify 同源）；ink 采样保留为 c 面纯黑判据） */
async function blockVsRow(win, blk, row) {
  // 水平参照=探针分段池（40px 间隙分段）。实测口径差：实现的带端点=选区 span
  // 盒并集（无分段+行盒偏移），与分段池差 ≤3px（0.43em@6.38px 参考区）——
  // 亚字符级；实现夹取行为由单测 a2 精确锁定（16.667%/50% 断言级）
  const minX = Math.min(...row.items.map((x) => x.x))
  const maxX = Math.max(...row.items.map((x) => x.x + x.w))
  const yTop = Math.min(...row.items.map((x) => x.y))
  const yBot = Math.max(...row.items.map((x) => x.y + x.h))
  const ink = await inkScan(win, yTop - 2, yBot + 2, minX - 4, maxX + 4, (yTop + yBot) / 2)
  return {
    ink,
    hRatio: blk.h / Math.max(0.5, yBot - yTop),
    topDev: blk.y - yTop,
    botDev: blk.y + blk.h - yBot,
    leftOver: blk.x - minX,
    rightOver: blk.x + blk.w - maxX,
    darkest: ink === null ? 999 : ink.darkest,
    fs: row.items[0].fs,
    diag: { blk: { y: +blk.y.toFixed(1), h: +blk.h.toFixed(1) }, spanY0: +yTop.toFixed(1), spanY1: +yBot.toFixed(1), inkTop: ink?.inkTop ?? null, inkBot: ink?.inkBot ?? null }
  }
}
/** 块→行（y 中心包含+x 重叠双约束——双栏页跨栏配对伪影实证：两注入段
 *  分居左右栏，纯 y 配对会把左栏块绑到右栏行，6.34px 假偏差即此） */
function rowOfBlock(rows, blk) {
  const c = blk.y + blk.h / 2
  return rows.find((r) => {
    const y0 = Math.min(...r.items.map((x) => x.y))
    const y1 = Math.max(...r.items.map((x) => x.y + x.h))
    const x0 = Math.min(...r.items.map((x) => x.x))
    const x1 = Math.max(...r.items.map((x) => x.x + x.w))
    const ox = Math.min(x1, blk.x + blk.w) - Math.max(x0, blk.x)
    return c >= y0 - 2 && c <= y1 + 2 && ox > 0
  })
}
const userData = await freshUserData()

// ── 预读：pdfjs 直读目标篇第 N 页文本项（无 app 参与——注入必须在启动前，
//    ai-notes store 同会话缓存会吞后写）──
const PDF_PATH = join(process.env.APPDATA, 'Synapse', 'workspaces', 'default', 'files')
const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs')
const { readdirSync } = await import('node:fs')
const pdfFiles = readdirSync(PDF_PATH, { recursive: true }).filter((f) => String(f).endsWith('.pdf'))
let targetDoc = null
let targetFile = null
for (const f of pdfFiles) {
  const doc = await getDocument({ data: new Uint8Array(readFileSync(join(PDF_PATH, String(f)))), useSystemFonts: false, standardFontDataUrl: join(ROOT, 'node_modules', 'pdfjs-dist', 'standard_fonts') + '/' }).promise
  const p1 = await doc.getPage(1)
  const tc1 = await p1.getTextContent()
  const title = tc1.items.map((i) => i.str || '').join(' ')
  if (title.toLowerCase().includes('smart water')) { targetDoc = doc; targetFile = f; break }
}
if (targetDoc === null) throw new Error('目标篇（smart water city，f15d）未找到')
const TARGET_PAGE = Math.min(4, targetDoc.numPages) // 正文页（字号小、行满）
const tp = await targetDoc.getPage(TARGET_PAGE)
const tpc = await tp.getTextContent()
const items = tpc.items.filter((i) => 'str' in i && i.str && i.str.trim().length >= 8)
// 引文候选=最长文本项前 3（每项连续——verifyQuote indexOf 口径）
const quotes = items.sort((a, b) => b.str.trim().length - a.str.trim().length).slice(0, 3).map((i) => i.str.trim())
log(`目标篇=${String(targetFile).slice(-12)} 页${TARGET_PAGE} 引文候选：${quotes.map((q) => q.slice(0, 14)).join(' / ')}`)
const injectRes = await injectAiNotes(userData, 'smart water city', quotes.map((q, i) => ({ question: ['Q2', 'Q5', 'Q6'][i % 3], quote: q, page: TARGET_PAGE })))
log('AI 注入完成', injectRes)

const app = await electron.launch({ args: ['out/main/index.js'], env: { ...process.env, SYNAPSE_USER_DATA: userData } })
const win = await app.firstWindow()
win.on('pageerror', (e) => pageErrors.push(`${String(e)}
[stack] ${e.stack ?? ''}`))

// ════ S1 主会话（paper#1 小字号）：a 面拖选+b 保存+AI 段+c 层序/像素 ════
await openReader(win, 1)
// 滚到注入页：data-page-box=占位盒（全页在场——data-page-root 仅已渲染页有，
// 探针实测踩坑：查 root 查无→不滚→主会话全程跑错页）；滚后等该页真渲染
await win.evaluate((pg) => {
  const scroller = document.querySelector('[data-page-column]')?.closest('.overflow-auto')
  const box = document.querySelector(`[data-page-box="${pg}"]`)
  if (scroller !== null && box !== null) {
    const g = box.getBoundingClientRect()
    scroller.scrollTop += g.y + g.height / 2 - (scroller.getBoundingClientRect().y + scroller.clientHeight / 2)
  }
}, TARGET_PAGE)
await win.waitForSelector(`[data-page-root="${TARGET_PAGE}"] .textLayer span`, { timeout: 12_000 }).catch(() => log('注入页文本层等待超时——按现状继续'))
await win.waitForTimeout(1300)
// AI 段装载：笔记 tab 挂载 AiNotesSection→loadNotes（store 单点）
try {
  await win.getByRole('tab', { name: '笔记' }).click({ timeout: 4_000 })
} catch {
  await win.getByRole('button', { name: '笔记' }).click({ timeout: 4_000 }).catch(() => log('笔记 tab 未找到'))
}
await win.waitForTimeout(1000)
const d0 = await win.evaluate(DUMP)
log(`注入页就绪：AI 块=${d0.ai.length}（按 id ${new Set(d0.ai.map((a) => a.id)).size} 组）`)
if (d0.ai.length === 0) throw new Error('AI 注入段未渲染（装载/锚定链断）')
// 拖选目标=首个 AI 段带（天然单栏——引文连续）；选择模式 ON（AI rect 穿透可发起拖选）
await win.getByRole('button', { name: '选择模式' }).click()
await win.waitForTimeout(400)
// 目标段=rects 最多的注入段（跨行最多）；拖选带向下再延两行（量测面 ≥3 块）
const byId = {}
for (const a of d0.ai) (byId[a.id] ??= []).push(a)
const targetId = Object.keys(byId).sort((x, y) => byId[y].length - byId[x].length)[0]
const band = byId[targetId] ?? []
const tx0 = Math.min(...band.map((a) => a.x))
const ty0 = Math.min(...band.map((a) => a.y))
const tx1 = Math.max(...band.map((a) => a.x + a.w))
const ty1 = Math.max(...band.map((a) => a.y + a.h))
const ys = [...new Set(band.map((a) => +a.y.toFixed(1)))].sort((a, b) => a - b)
const pitch = ys.length > 1 ? (ys.at(-1) - ys[0]) / (ys.length - 1) : 12
const dragY1 = ty1 + Math.round(2 * pitch)
await drag(win, { x: tx0 + 4, y: ty0 + 4 }, { x: tx1 - 4, y: dragY1 })
const dSel = await win.evaluate(DUMP)
await win.screenshot({ path: join(OUT, `${PHASE}-select.png`) })
let rows = columnRows(d0)
if (rows.length < 3) throw new Error(`可视行簇不足：${rows.length}`)

// —— ① a 面判据（span 锚定——墨带 ground truth 在紧行距参考区被邻行墨粘连
//    污染（探针实证），判据锚 pdf.js span 盒=y 定位即 PDF 墨顶口径）——
const paintMs = []
for (const blk of dSel.paint.slice(0, 4)) {
  const row = rowOfBlock(rows, blk)
  if (row !== undefined) paintMs.push(await blockVsRow(win, blk, row))
}
const ok1 = paintMs.length >= 2 && paintMs.every((m) => m !== null)
check('a/paint-band-height', ok1 && Math.max(...paintMs.map((m) => m.hRatio)) <= 1.3, `自绘块高/行盒高比 max=${ok1 ? Math.max(...paintMs.map((m) => m.hRatio)).toFixed(2) : 'n/a'}（≤1.3；修前 1.38=1.5~2 倍墨高口径之源）`)
check('a/paint-band-top', ok1 && Math.max(...paintMs.map((m) => Math.abs(m.topDev))) <= 2, `块顶 vs 行簇 span 顶 max=${ok1 ? Math.max(...paintMs.map((m) => Math.abs(m.topDev))).toFixed(2) : 'n/a'}px（≤2；修前上错整行 topDev −7.3~−8.9px）`)
check('a/paint-band-bottom', ok1 && paintMs.every((m) => m.botDev >= -1 && m.botDev <= 3), `块底 vs 行簇 span 底 [${ok1 ? paintMs.map((m) => m.botDev.toFixed(1)).join(',') : 'n/a'}]∈[−1,+3]（desc 尾界；修前 −4.9~−6.5=侵入下邻行）`)
check('a/paint-horizontal-span-bounds', ok1 && Math.max(...paintMs.map((m) => Math.max(m.leftOver, m.rightOver))) <= 3, `水平界越 span 簇端点 max=${ok1 ? Math.max(...paintMs.map((m) => Math.max(m.leftOver, m.rightOver))).toFixed(2) : 'n/a'}px（≤3=亚字符级口径差容差@6.38px 参考区；修前 11.5~281px；实现夹取由单测 a2 断言级锁定）`)

// —— ② b 面：保存高亮 → 标注块贴行 ——
if (dSel.paint.length > 0 && await win.$('[data-testid="selection-toolbar"]') !== null) {
  await win.getByTestId('selection-toolbar').getByRole('button', { name: '高亮' }).click({ timeout: 5_000 })
  await win.waitForSelector('[data-testid="annotation-rect"]', { timeout: 10_000 })
  await win.waitForTimeout(500)
} else {
  log('工具条未出——保存跳过')
}
const dSaved = await win.evaluate(DUMP)
await win.screenshot({ path: join(OUT, `${PHASE}-saved.png`) })
const annMs = []
for (const b of dSaved.ann.slice(0, 4)) {
  const row = rowOfBlock(rows, b)
  if (row !== undefined) annMs.push(await blockVsRow(win, b, row))
}
const ok2 = annMs.length > 0
check('b/ann-band-align', ok2 && Math.max(...annMs.map((m) => Math.abs(m.topDev))) <= 2 && annMs.every((m) => m.botDev >= -1 && m.botDev <= 3) && Math.max(...annMs.map((m) => m.hRatio)) <= 1.3, `标注块 vs 行簇 span：顶差 max=${ok2 ? Math.max(...annMs.map((m) => Math.abs(m.topDev))).toFixed(2) : 'n/a'}px（≤2）+底界 [${ok2 ? annMs.map((m) => m.botDev.toFixed(1)).join(',') : 'n/a'}]∈[−1,+3]+高比 max=${ok2 ? Math.max(...annMs.map((m) => m.hRatio)).toFixed(2) : 'n/a'}（≤1.3）`)

// —— ②' b 面：AI 段贴行（注入段） ——
const aiMs = []
for (const b of dSaved.ai.slice(0, 4)) {
  const row = rowOfBlock(rows, b)
  if (row !== undefined) aiMs.push(await blockVsRow(win, b, row))
}
const ok3 = aiMs.length > 0
check('b/ai-band-align', ok3 && Math.max(...aiMs.map((m) => Math.abs(m.topDev))) <= 2 && aiMs.every((m) => m.botDev >= -1 && m.botDev <= 3) && Math.max(...aiMs.map((m) => m.hRatio)) <= 1.3, `AI 块 vs 行簇 span：顶差 max=${ok3 ? Math.max(...aiMs.map((m) => Math.abs(m.topDev))).toFixed(2) : 'n/a'}px（≤2）+高比 max=${ok3 ? Math.max(...aiMs.map((m) => m.hRatio)).toFixed(2) : 'n/a'}（≤1.3；修前=裸 CSS 行盒——图2 下偏+侵入邻行根因）`)

// —— ③ c 面：层序 computed+块内纯黑像素 ——
const z = dSel.z
check('c/z-order-colors-under-canvas', z.ann?.z === '1' && z.ai?.z === '1' && z.canvas?.z === '2' && z.ann?.blend === 'normal', `层序 computed：ann z=${z.ann?.z}/${z.ann?.blend} ai z=${z.ai?.z} canvas z=${z.canvas?.z}（pe=${z.canvas?.pe}）——色块垫底 normal`)
check('c/z-order-paint-top', z.paint?.z === '3', `自绘层 z=${z.paint?.z}（=3 最上，拖选帧采样；text z=${z.text?.z} 官方 0）`)
const blackOk = [...annMs, ...aiMs].every((m) => m !== null && m.darkest <= 8)
check('c/text-pure-black-in-blocks', blackOk && (annMs.length + aiMs.length) > 0, `色块内文字最暗核 max=${Math.max(...[...annMs, ...aiMs].map((m) => m?.darkest ?? 999))}（≤8=纯黑域吞 AA；修前 AI 面 normal0.45 罩墨必染——图2）`)

// —— ④ S4：选择模式重选已存高亮带→灰块在场（视觉最上） ——
await win.getByRole('button', { name: '选择模式' }).click()
await win.waitForTimeout(400)
const ax0 = Math.min(...dSaved.ann.map((a) => a.x)), ay0 = Math.min(...dSaved.ann.map((a) => a.y))
const ax1 = Math.max(...dSaved.ann.map((a) => a.x + a.w)), ay1 = Math.max(...dSaved.ann.map((a) => a.y + a.h))
await drag(win, { x: ax0 + 4, y: ay0 + 4 }, { x: ax1 - 4, y: ay1 - 4 })
const dS4 = await win.evaluate(DUMP)
await win.screenshot({ path: join(OUT, `${PHASE}-s4-over-ann.png`) })
check('s4/paint-over-ann', dS4.paint.length >= 2 && dS4.ann.length >= 2, `S4 灰块 ${dS4.paint.length} 块叠在 ${dS4.ann.length} 色块上（选择模式 INV-42 穿透重选）`)
// S6a：Escape 清选区工具条+自绘随选区（此处先 Escape 后坍缩）
await win.keyboard.press('Escape')
const annCount = (await win.evaluate(DUMP)).ann.length
await win.evaluate(() => window.getSelection()?.removeAllRanges())
await win.waitForTimeout(400)
await win.evaluate(() => document.dispatchEvent(new Event('selectionchange')))
await win.waitForTimeout(600)
const dS6 = await win.evaluate(DUMP)
check('s6/escape-clears-paint-keeps-ann', dS6.paint.length === 0 && dS6.ann.length === annCount, `S6 Escape：自绘块 ${dS6.paint.length}（清）+色块 ${dS6.ann.length}（不变，前=${annCount}）`)
await closeReader(win)

// ════ S5 缩放会话：150% 块数一致性（lite） ════
await openReader(win, 1)
await win.getByRole('button', { name: '选择模式' }).click()
await win.waitForTimeout(300)
const zc = await win.evaluate(() => { const sc = document.querySelector('[data-page-column]')?.closest('.overflow-auto')?.getBoundingClientRect(); return sc ? { x: sc.x + sc.width / 2, y: sc.y + sc.height / 2 } : { x: 400, y: 400 } })
await win.mouse.move(zc.x, zc.y)
await win.keyboard.down('Control')
for (let i = 0; i < 5; i += 1) await win.mouse.wheel(0, -120)
await win.keyboard.up('Control')
await win.waitForTimeout(900)
log('zoom 后 label=', await win.locator('[data-testid="zoom-label"]').textContent().catch(() => 'n/a'))
await win.evaluate(() => {
  const scroller = document.querySelector('[data-page-column]')?.closest('.overflow-auto')
  const ann = [...document.querySelectorAll('[data-testid="annotation-rect"]')].map((el) => el.getBoundingClientRect())
  if (ann.length === 0 || scroller === null) return
  const sc = scroller.getBoundingClientRect()
  scroller.scrollTop += (Math.min(...ann.map((a) => a.y)) + Math.max(...ann.map((a) => a.y + a.height))) / 2 - (sc.y + sc.height / 2)
})
await win.waitForTimeout(700)
let dz = await win.evaluate(DUMP)
if (dz.ann.length > 0) {
  const bx0 = Math.min(...dz.ann.map((a) => a.x)), by0 = Math.min(...dz.ann.map((a) => a.y))
  const bx1 = Math.max(...dz.ann.map((a) => a.x + a.w)), by1 = Math.max(...dz.ann.map((a) => a.y + a.h))
  await win.evaluate(() => {
    const scroller = document.querySelector('[data-page-column]')?.closest('.overflow-auto')
    const ann = [...document.querySelectorAll('[data-testid="annotation-rect"]')].map((el) => el.getBoundingClientRect())
    if (ann.length === 0 || scroller === null) return
    const sc = scroller.getBoundingClientRect()
    scroller.scrollTop += (Math.min(...ann.map((a) => a.y)) + Math.max(...ann.map((a) => a.y + a.height))) / 2 - (sc.y + sc.height / 2)
  })
  await win.waitForTimeout(600)
  dz = await win.evaluate(DUMP)
  await drag(win, { x: bx0 + 4, y: by0 + 4 }, { x: bx1 - 4, y: by1 - 4 })
} else {
  log('zoom 会话：存量标注不在场（S1 保存在前一副本会话——当前会话同副本应在场）')
}
const dS5 = await win.evaluate(DUMP)
await win.screenshot({ path: join(OUT, `${PHASE}-z150.png`) })
check('s5/zoom-block-count', Math.abs(dS5.paint.length - dSaved.ann.length) <= Math.max(1, Math.round(dSaved.ann.length * 0.15)) && dS5.paint.length >= 2, `150% 自绘块 ${dS5.paint.length} vs 100% 标注块 ${dSaved.ann.length}（|Δ|≤max(1,15%)——重选带边界行包含差，F-A4 |Δ|≤1 口径的行数带扩展）`)

// —— ⑤ pageerror ——
check('f/no-pageerror', pageErrors.length === 0, `页面错误 ${pageErrors.length} 条${pageErrors.length > 0 ? '：' + pageErrors.join('; ').slice(0, 300) : ''}`)

writeFileSync(
  join(OUT, `f-a5-verify-${PHASE}.json`),
  JSON.stringify({ meta: { script: 'f-a5-verify.mjs', phase: PHASE, date: new Date().toISOString(), note: '修后判据；修前基线=f-a5-diag.json（2026-08-31 探针先行）' }, z: { ...dSaved.z, paint: dSel.z?.paint ?? null }, paintMs, annMs: annMs.map((m) => m && { hRatio: +m.hRatio.toFixed(3), topDev: +m.topDev.toFixed(2), botDev: +m.botDev.toFixed(2), darkest: m.darkest, diag: m.diag }), aiMs: aiMs.map((m) => m && { hRatio: +m.hRatio.toFixed(3), topDev: +m.topDev.toFixed(2), botDev: +m.botDev.toFixed(2), darkest: m.darkest, diag: m.diag }), scenes: { s4: { paint: dS4.paint.length, ann: dS4.ann.length }, s5: { paint: dS5.paint.length }, s6: { ann: dS6.ann.length } }, results }, null, 2)
)
await app.close()
const fails = results.filter((r) => r.pass === false)
if (fails.length === 0) console.log(`F-A5 VERIFY: PASS（${results.length}/${results.length} 项断言全过）`)
else console.log(`F-A5 VERIFY: FAIL（${fails.length}/${results.length} 项失败——红=报主控裁决）`)
process.exit(fails.length === 0 ? 0 : 1)
