/**
 * AUDIT-B B1+B5 取证探针（合并一次 launch）。
 *
 * B5 = workspace 切换器面板 × SET1 zoom 大档（量化转储，观感零承担）：
 *   库视图 100%/125% 两档：ws-trigger/ws-panel rect+computed font-size+
 *   scrollWidth/clientWidth 溢出判定+面板宽/视口占比+内容区对照样本
 *   （.app-nav-item rect/font——header 在缩放行外，面板字号不随档变）。
 * B1 = SET1 zoom × F-06/F-08 划选工具条+划选链定位细节：
 *   125% 与 100% 两档：程序化跨行划选（Range addRange→防抖 200ms→工具条）→
 *   工具条 gBCR × 选区 gBCR 对位转储（垂直间隙 gapV=sel.top-toolbar.bottom、
 *   水平偏移 dx、工具条高宽、ui-scale/页列补偿 zoom、挂载盒 localScale）。
 *   自洽判据：两档 gapV 差 ≤4px（亚像素）=N；>4px 或工具条遮选区=W。
 * 配方：种子多行 PDF（pdf-factory createMultiLinePdf 逐字内联——.mjs 源
 * r2-set1-forensics.mjs 同源法）；launch out/ 构建产物+临时 userData。
 * 产物：scripts/audits/auditb-out/b15.json + b15-*.png
 * 用法：node scripts/audits/auditb-b15.js（需先 build）
 */
import { _electron as electron } from '@playwright/test'
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { copyFile, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

const ROOT = process.cwd()
const OUT = join(ROOT, 'scripts', 'audits', 'auditb-out')
const R = { meta: { script: 'auditb-b15.js', date: new Date().toISOString() }, b5: {}, b1: {} }
const log = (...a) => console.log(`[b15 ${new Date().toISOString().slice(11, 19)}]`, ...a)
/** 模块级持有——catch 也能关应用（防 electron 进程残留挂死探针） */
let app = null

// ── pdf-factory 内联（tests/utils/pdf-factory.ts createMultiLinePdf 同源）──
const PDF_MULTILINE_TEXT = ['MULTILINE ALPHA ROW', 'MULTILINE BETA ROW', 'MULTILINE GAMMA ROW']
const esc = (s) => s.replaceAll('\\', '\\\\').replaceAll('(', '\\(').replaceAll(')', '\\)')
function assemblePdf(objects) {
  const enc = new TextEncoder()
  const parts = []
  let byteLen = 0
  const push = (s) => { const b = enc.encode(s); parts.push(b); byteLen += b.length }
  push('%PDF-1.4\n')
  const offsets = []
  objects.forEach((body, i) => { offsets.push(byteLen); push(`${i + 1} 0 obj\n${body}\nendobj\n`) })
  const xrefStart = byteLen
  push(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`)
  for (const off of offsets) push(`${String(off).padStart(10, '0')} 00000 n \n`)
  push(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`)
  const out = new Uint8Array(byteLen)
  let cursor = 0
  for (const part of parts) { out.set(part, cursor); cursor += part.length }
  return out
}
function createMultiLinePdf(lines = PDF_MULTILINE_TEXT) {
  const parts = lines.map((line, i) => `BT /F1 18 Tf 72 ${720 - i * 24} Td (${esc(line)}) Tj ET`)
  const stream = parts.join('\n')
  const streamBytes = new TextEncoder().encode(stream).length
  return assemblePdf([
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${streamBytes} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Title (${esc(lines[0] ?? '')}) /Producer (synapse-auditb) >>`
  ])
}

// ── 种子（e2e-env.seedPaperRow 同型：ABI 换装→子进程→还原）──
async function seedRow(userData, fileRef, sha, title) {
  const pkgDir = join(ROOT, 'node_modules', 'better-sqlite3')
  const releaseBinding = join(pkgDir, 'build', 'Release', 'better_sqlite3.node')
  const cacheDir = join(pkgDir, 'abi-cache')
  const wanted = `node-v${process.versions.modules}`
  const dirs = (await readdir(cacheDir)).filter((d) => d.startsWith('node-v'))
  const pick = dirs.includes(wanted) ? wanted : (dirs.sort().at(-1) ?? '')
  if (!pick) throw new Error('abi-cache 缺 node 绑定')
  const electronBinding = await readFile(releaseBinding)
  await copyFile(join(cacheDir, pick, 'better_sqlite3.node'), releaseBinding)
  try {
    await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [join(ROOT, 'tests', 'e2e', 'seed-paper.mjs')], {
        env: { ...process.env, SEED_DB: join(userData, 'synapse.db'), SEED_FILE_REF: fileRef, SEED_SHA: sha, SEED_TITLE: title },
        stdio: 'inherit'
      })
      child.on('exit', (c) => (c === 0 ? resolve() : reject(new Error(`seed 退出码 ${c}`))))
      child.on('error', reject)
    })
  } finally {
    await writeFile(releaseBinding, electronBinding)
  }
}

/** B5 量化：切换器面板（开态）+内容区对照 */
async function b5Measure(win) {
  return win.evaluate(() => {
    const r = (el) => { const b = el.getBoundingClientRect(); return { x: +b.x.toFixed(1), y: +b.y.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) } }
    const trigger = document.querySelector('.ws-trigger')
    const panel = document.querySelector('.ws-panel')
    const navItem = document.querySelector('.app-nav-item')
    const vw = window.innerWidth
    const vh = window.innerHeight
    const cs = (el) => (el ? getComputedStyle(el).fontSize : null)
    return {
      viewport: { w: vw, h: vh },
      uiScaleVar: getComputedStyle(document.documentElement).getPropertyValue('--ui-scale').trim(),
      trigger: trigger
        ? { rect: r(trigger), fontSize: cs(trigger), scrollW: trigger.scrollWidth, clientW: trigger.clientWidth, anim: getComputedStyle(trigger).animationName }
        : null,
      panel: panel
        ? { rect: r(panel), scrollW: panel.scrollWidth, clientW: panel.clientWidth, scrollH: panel.scrollHeight, clientH: panel.clientHeight }
        : null,
      panelItems: [...document.querySelectorAll('.ws-panel .ws-item, .ws-panel .ws-field')].map((el) => ({
        text: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 24),
        fontSize: cs(el),
        rect: r(el),
        overflow: el.scrollWidth > el.clientWidth
      })),
      contentRef: navItem ? { rect: r(navItem), fontSize: cs(navItem) } : null
    }
  })
}

/** B1 对位：程序化跨行划选→防抖出工具条→工具条×选区 gBCR 转储 */
async function b1Measure(win, tag) {
  await win.evaluate(() => {
    const spans = [...document.querySelectorAll('[data-page-root] .textLayer span')].filter(
      (sp) => sp.firstChild && sp.firstChild.nodeType === 3 && sp.textContent.length > 0
    )
    spans[0]?.scrollIntoView({ block: 'center' })
  })
  await win.waitForTimeout(400)
  const picked = await win.evaluate(() => {
    const spans = [...document.querySelectorAll('[data-page-root] .textLayer span')].filter(
      (sp) => sp.firstChild && sp.firstChild.nodeType === 3 && sp.textContent.length > 0
    )
    const vis = spans.map((s, i) => ({ i, r: s.getBoundingClientRect() })).filter((o) => o.r.y > 120 && o.r.bottom < 700 && o.r.width > 5)
    if (vis.length < 2) return null
    const a = vis[0]
    const b = vis[Math.min(vis.length - 1, 4)]
    const r1 = spans[a.i].getBoundingClientRect()
    const r2 = spans[b.i].getBoundingClientRect()
    return { ia: a.i, ib: b.i, selBox: { x: +Math.min(r1.x, r2.x).toFixed(1), y: +r1.y.toFixed(1), w: +(Math.max(r1.right, r2.right) - Math.min(r1.x, r2.x)).toFixed(1), h: +(r2.bottom - r1.y).toFixed(1) } }
  })
  if (picked === null) throw new Error(`[${tag}] 可见 span 不足`)
  // 程序化划选（跨行 Range→selectionchange→防抖 200ms→工具条；f-a3 兜底同型）
  await win.evaluate(({ ia, ib }) => {
    const spans = [...document.querySelectorAll('[data-page-root] .textLayer span')].filter(
      (sp) => sp.firstChild && sp.firstChild.nodeType === 3
    )
    const range = document.createRange()
    range.setStart(spans[ia].firstChild, 2)
    range.setEnd(spans[ib].firstChild, 4)
    const sel = getSelection()
    sel.removeAllRanges()
    sel.addRange(range)
  }, { ia: picked.ia, ib: picked.ib })
  await win.waitForSelector('[data-testid="selection-toolbar"]', { timeout: 8000 })
  await win.waitForTimeout(250)
  const dump = await win.evaluate(() => {
    const tb = document.querySelector('[data-testid="selection-toolbar"]')
    const sel = getSelection()
    const sr = sel && sel.rangeCount > 0 ? sel.getRangeAt(0).getBoundingClientRect() : null
    const tr = tb.getBoundingClientRect()
    const col = document.querySelector('[data-page-column]')
    const mount = tb.parentElement
    const mountBox = mount.getBoundingClientRect()
    const sc = document.querySelector('.min-w-0.flex-1.overflow-auto.p-3')
    const f = (n) => +n.toFixed(1)
    return {
      toolbar: { x: f(tr.x), y: f(tr.y), w: f(tr.width), h: f(tr.height), bottom: f(tr.bottom) },
      selRect: sr ? { x: f(sr.x), y: f(sr.y), w: f(sr.width), h: f(sr.height), top: f(sr.top) } : null,
      gapV: sr ? +(sr.top - tr.bottom).toFixed(1) : null,
      dx: sr ? +(tr.x - sr.x).toFixed(1) : null,
      toolbarCoversSelection: sr ? tr.bottom > sr.top && tr.top < sr.bottom && tr.right > sr.x && tr.x < sr.right : null,
      uiScaleVar: getComputedStyle(document.documentElement).getPropertyValue('--ui-scale').trim(),
      colZoom: col ? getComputedStyle(col).zoom : null,
      mountLocalScale: mount ? +(mount.clientWidth / mountBox.width).toFixed(4) : null,
      scrollerRect: sc ? { x: f(sc.getBoundingClientRect().x), y: f(sc.getBoundingClientRect().y), w: f(sc.getBoundingClientRect().width), h: f(sc.getBoundingClientRect().height) } : null,
      toolbarInsideScroller: tr.x >= sc.getBoundingClientRect().x - 1 && tr.right <= sc.getBoundingClientRect().right + 1 && tr.y >= sc.getBoundingClientRect().y - 1 && tr.bottom <= sc.getBoundingClientRect().bottom + 1
    }
  })
  return { picked, dump }
}

async function main() {
  if (!existsSync(join(ROOT, 'out', 'main', 'index.js'))) throw new Error('先 build')
  await mkdir(OUT, { recursive: true })
  const userData = join(tmpdir(), 'synapse-auditb-b15')
  await rm(userData, { recursive: true, force: true })

  // 1) 首启建 schema → 种子多行 PDF → 重启
  app = await electron.launch({ args: ['out/main/index.js'], env: { ...process.env, SYNAPSE_USER_DATA: userData } })
  let win = await app.firstWindow()
  await win.getByRole('button', { name: '文献库' }).waitFor({ timeout: 30_000 })
  await app.close()
  app = null
  const title = 'AUDITB B1 划选对位文献'
  const bytes = createMultiLinePdf()
  const sha = createHash('sha256').update(bytes).digest('hex')
  const fileRef = `${sha.slice(0, 2)}/${sha.slice(2, 4)}/${sha}.pdf`
  const abs = join(userData, 'files', ...fileRef.split('/'))
  mkdirSync(dirname(abs), { recursive: true })
  writeFileSync(abs, bytes)
  await seedRow(userData, fileRef, sha, title)
  app = await electron.launch({ args: ['out/main/index.js'], env: { ...process.env, SYNAPSE_USER_DATA: userData } })
  win = await app.firstWindow()
  await win.setDefaultTimeout(30_000)
  await win.setViewportSize({ width: 1280, height: 800 })
  await win.getByRole('button', { name: '文献库' }).waitFor()
  await win.waitForSelector('.lib-card')

  // ── B5 @100%（库视图）──
  await win.getByRole('button', { name: '切换课题' }).click()
  await win.waitForTimeout(300)
  R.b5.small = await b5Measure(win)
  await win.screenshot({ path: join(OUT, 'b15-switcher-small.png') })
  await win.keyboard.press('Escape').catch(() => {})
  await win.getByRole('button', { name: '切换课题' }).click() // 再点合上（v1 无点外关闭）
  log('B5@small', JSON.stringify(R.b5.small.panel), JSON.stringify(R.b5.small.trigger?.rect))

  // 切 125%
  await win.getByRole('button', { name: '设置' }).click()
  await win.getByRole('button', { name: '大 125%' }).click()
  await win.getByText('界面缩放已保存').waitFor({ timeout: 10_000 })
  await win.getByRole('button', { name: '文献库' }).click()
  await win.waitForSelector('.lib-card')
  await win.waitForTimeout(300)

  // ── B5 @125%（库视图）──
  await win.getByRole('button', { name: '切换课题' }).click()
  await win.waitForTimeout(300)
  R.b5.large = await b5Measure(win)
  await win.screenshot({ path: join(OUT, 'b15-switcher-large.png') })
  await win.getByRole('button', { name: '切换课题' }).click()
  log('B5@large', JSON.stringify(R.b5.large.panel), JSON.stringify(R.b5.large.trigger?.rect))

  // ── B1 @125%（阅读器）──
  await win.locator('.lib-card').first().dblclick()
  await win.waitForSelector('canvas[data-pdf-canvas]', { timeout: 30_000 })
  await win.waitForSelector('[data-page-root] .textLayer span', { timeout: 20_000 })
  await win.waitForTimeout(900)
  R.b1.large = await b1Measure(win, 'large')
  await win.screenshot({ path: join(OUT, 'b15-toolbar-large.png') })
  log('B1@large', JSON.stringify(R.b1.large.dump))

  // 切回 100% → 阅读器重挂
  await win.getByRole('button', { name: '设置' }).click()
  await win.getByRole('button', { name: '小 100%' }).click()
  await win.getByText('界面缩放已保存').waitFor({ timeout: 10_000 })
  await win.getByRole('button', { name: '阅读器' }).click()
  await win.waitForSelector('canvas[data-pdf-canvas]', { timeout: 30_000 })
  await win.waitForTimeout(900)

  // ── B1 @100%（基线）──
  R.b1.small = await b1Measure(win, 'small')
  await win.screenshot({ path: join(OUT, 'b15-toolbar-small.png') })
  log('B1@small', JSON.stringify(R.b1.small.dump))

  // 归一：两档 gapV 差（自洽判据 ≤4px）
  R.b1.summary = {
    gapV: { small: R.b1.small.dump.gapV, large: R.b1.large.dump.gapV },
    gapVDelta: +(R.b1.large.dump.gapV - R.b1.small.dump.gapV).toFixed(1),
    dx: { small: R.b1.small.dump.dx, large: R.b1.large.dump.dx },
    toolbarCoversSelection: { small: R.b1.small.dump.toolbarCoversSelection, large: R.b1.large.dump.toolbarCoversSelection },
    mountLocalScale: { small: R.b1.small.dump.mountLocalScale, large: R.b1.large.dump.mountLocalScale }
  }
  R.b5.summary = {
    triggerFontSize: { small: R.b5.small.trigger?.fontSize, large: R.b5.large.trigger?.fontSize },
    panelItemFontSize: {
      small: R.b5.small.panelItems[0]?.fontSize ?? null,
      large: R.b5.large.panelItems[0]?.fontSize ?? null
    },
    contentNavFontSize: { small: R.b5.small.contentRef?.fontSize, large: R.b5.large.contentRef?.fontSize },
    contentNavH: { small: R.b5.small.contentRef?.rect.h, large: R.b5.large.contentRef?.rect.h },
    panelOverflow: {
      small: (R.b5.small.panel?.scrollW ?? 0) > (R.b5.small.panel?.clientW ?? 1),
      large: (R.b5.large.panel?.scrollW ?? 0) > (R.b5.large.panel?.clientW ?? 1)
    },
    triggerTextOverflow: {
      small: (R.b5.small.trigger?.scrollW ?? 0) > (R.b5.small.trigger?.clientW ?? 1),
      large: (R.b5.large.trigger?.scrollW ?? 0) > (R.b5.large.trigger?.clientW ?? 1)
    },
    anyItemOverflow: {
      small: R.b5.small.panelItems.some((i) => i.overflow),
      large: R.b5.large.panelItems.some((i) => i.overflow)
    },
    panelWidthVsViewport: {
      small: R.b5.small.panel ? +(R.b5.small.panel.rect.w / R.b5.small.viewport.w).toFixed(3) : null,
      large: R.b5.large.panel ? +(R.b5.large.panel.rect.w / R.b5.large.viewport.w).toFixed(3) : null
    }
  }
  await app.close()
  writeFileSync(join(OUT, 'b15.json'), JSON.stringify(R, null, 2))
  log('B1 summary', JSON.stringify(R.b1.summary))
  log('B5 summary', JSON.stringify(R.b5.summary))
}

await main().catch(async (e) => {
  R.error = String(e)
  try { writeFileSync(join(OUT, 'b15.json'), JSON.stringify(R, null, 2)) } catch { /* 原始错误优先 */ }
  console.error('[b15] FAIL', e)
  try { if (app !== null) await app.close() } catch { /* 尽力关——残留由外层清 */ }
  process.exit(1)
})
