/**
 * R2-SET1 开工实证探针(一次性,主控)——决策③「PDF 画布是否跟随开工时实证,
 * 跟随则阅读区豁免」+ 门一 E5(caption/挂载点)。
 *
 * 四问:
 * Q1 CSS zoom 嵌套:子 zoom:1 能否豁免父 1.1?(预期不能——相乘,只能反向补偿)
 * Q2 zoom: calc(1 / 1.1) 是否被 Chromium 接受?(不接受则 JS 算数值)
 * Q3 zoom 1.1 挂内容行:PDF canvas rect 是否×1.1(跟随实锤)+canvas.width
 *    背衬是否不变(位图拉伸证据)
 * Q4 补偿(页列 zoom=1/1.1)后 canvas rect 是否恢复基线(±0.5px)
 *
 * 配方=reader-text.spec seedAndLaunch 移植(自含:pdf-factory 内联+双 ABI 种子)。
 */
import { _electron as electron } from '@playwright/test'
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { copyFile, mkdtemp, readdir, readFile, writeFile } from 'node:fs/promises'
import { mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

const OUT = {}
const log = (k, v) => { OUT[k] = v; console.log(k, '=', JSON.stringify(v)) }

// ── pdf-factory 移植(tests/utils/pdf-factory.ts 同逻辑)──────────────
const PDF_KNOWN_TEXT = 'SMART WATER TEST DOC'
function createTinyPdf(text = PDF_KNOWN_TEXT) {
  const esc = (s) => s.replaceAll('\\', '\\\\').replaceAll('(', '\\(').replaceAll(')', '\\)')
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${new TextEncoder().encode(`BT /F1 18 Tf 72 720 Td (${esc(text)}) Tj ET`).length} >>\nstream\nBT /F1 18 Tf 72 720 Td (${esc(text)}) Tj ET\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Title (${esc(text)}) /Producer (synapse-probe) >>`
  ]
  const enc = new TextEncoder()
  const parts = []
  let byteLen = 0
  const push = (s) => { const b = enc.encode(s); parts.push(b); byteLen += b.length }
  push('%PDF-1.4\n')
  const offsets = []
  objects.forEach((body, i) => {
    offsets.push(byteLen)
    push(`${i + 1} 0 obj\n${body}\nendobj\n`)
  })
  const xrefStart = byteLen
  push(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`)
  for (const off of offsets) push(`${String(off).padStart(10, '0')} 00000 n \n`)
  push(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`)
  const out = new Uint8Array(byteLen)
  let cursor = 0
  for (const part of parts) { out.set(part, cursor); cursor += part.length }
  return out
}

// ── 双 ABI 种子(e2e-env seedPaperRow 移植)───────────────────────────
async function seedRow(userData, fileRef, sha, title) {
  const pkgDir = join(process.cwd(), 'node_modules', 'better-sqlite3')
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
      const child = spawn(process.execPath, [join(process.cwd(), 'tests', 'e2e', 'seed-paper.mjs')], {
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

function launch(userData) {
  return electron.launch({ args: ['out/main/index.js'], env: { ...process.env, SYNAPSE_USER_DATA: userData } })
}

const title = '智慧水务 zoom 探针文献'
const userData = await mkdtemp(join(tmpdir(), 'synapse-set1-'))
const seedApp = await launch(userData)
await (await seedApp.firstWindow()).waitForTimeout(500)
await seedApp.close()
const bytes = createTinyPdf(`${title} ${PDF_KNOWN_TEXT}`)
const sha = createHash('sha256').update(bytes).digest('hex')
const fileRef = `${sha.slice(0, 2)}/${sha.slice(2, 4)}/${sha}.pdf`
const abs = join(userData, 'files', ...fileRef.split('/'))
mkdirSync(dirname(abs), { recursive: true })
writeFileSync(abs, bytes)
await seedRow(userData, fileRef, sha, title)
const app = await launch(userData)
const win = await app.firstWindow()
await win.getByRole('button', { name: '文献库' }).waitFor({ timeout: 20_000 })
await win.getByText(title).first().waitFor({ timeout: 10_000 })
await win.getByText(title).first().dblclick()
try {
  await win.getByText(PDF_KNOWN_TEXT).first().waitFor({ timeout: 20_000 })
} catch (e) {
  await win.screenshot({ path: 'scripts/audits/r2-set1-out-debug.png' }).catch(() => {})
  const state = await win.evaluate(() => ({
    bodyText: document.body.innerText.slice(0, 300),
    hasCanvas: !!document.querySelector('canvas[data-pdf-canvas]'),
    hasPageCol: document.querySelector('[data-page-column]')?.getAttribute('data-page-column')
  }))
  console.log('DEBUG', JSON.stringify(state))
  throw e
}
await win.waitForTimeout(800) // 等首页渲染稳定

// ── Q3:内容行 zoom 1.1(canvas 跟随?)──────────────────────────────
const base = await win.evaluate(() => {
  const header = document.querySelector('header.app-header')
  const navItem = document.querySelector('.app-nav-item')
  const canvas = document.querySelector('canvas[data-pdf-canvas]')
  return {
    headerH: header.getBoundingClientRect().height,
    navFont: getComputedStyle(navItem).fontSize,
    canvasRectW: canvas.getBoundingClientRect().width,
    canvasRectH: canvas.getBoundingClientRect().height,
    canvasBackingW: canvas.width,
    dpr: window.devicePixelRatio
  }
})
log('base', base)

// ── Q3:内容行 zoom 1.1(canvas 跟随?)──────────────────────────────
await win.evaluate(() => {
  document.querySelector('header.app-header').nextElementSibling.style.zoom = '1.1'
})
await win.waitForTimeout(300)
const z11 = await win.evaluate(() => {
  const header = document.querySelector('header.app-header')
  const navItem = document.querySelector('.app-nav-item')
  const canvas = document.querySelector('canvas[data-pdf-canvas]')
  return {
    headerH: header.getBoundingClientRect().height,
    navFont: getComputedStyle(navItem).fontSize,
    canvasRectW: canvas.getBoundingClientRect().width,
    canvasBackingW: canvas.width
  }
})
log('zoom1.1', z11)

// ── Q1:子 zoom:1 能否豁免(预期不能)──────────────────────────────
await win.evaluate(() => {
  document.querySelector('[data-page-column="ready"]').style.zoom = '1'
})
await win.waitForTimeout(200)
const q1 = await win.evaluate(() => document.querySelector('canvas[data-pdf-canvas]').getBoundingClientRect().width)
log('Q1_childZoom1_canvasW', q1)

// ── Q2:calc(1 / 1.1) 接受?─────────────────────────────────────────
await win.evaluate(() => {
  document.querySelector('[data-page-column="ready"]').style.zoom = 'calc(1 / 1.1)'
})
const q2 = await win.evaluate(() => {
  const col = document.querySelector('[data-page-column="ready"]')
  return { computed: getComputedStyle(col).zoom, canvasW: document.querySelector('canvas[data-pdf-canvas]').getBoundingClientRect().width }
})
log('Q2_calc', q2)

// ── Q4:数值补偿 0.909…(calc 不吃时的路径)────────────────────────
await win.evaluate(() => {
  document.querySelector('[data-page-column="ready"]').style.zoom = String(1 / 1.1)
})
await win.waitForTimeout(300)
const q4 = await win.evaluate(() => {
  const canvas = document.querySelector('canvas[data-pdf-canvas]')
  return {
    canvasRectW: canvas.getBoundingClientRect().width,
    canvasRectH: canvas.getBoundingClientRect().height,
    canvasBackingW: canvas.width,
    computedZoom: getComputedStyle(document.querySelector('[data-page-column="ready"]')).zoom
  }
})
log('Q4_numericComp', q4)

// 位图重渲染观察:补偿态等 1.5s 再量 canvas.width
await win.waitForTimeout(1500)
const q5 = await win.evaluate(() => {
  const canvas = document.querySelector('canvas[data-pdf-canvas]')
  return { backingW: canvas.width, rectW: canvas.getBoundingClientRect().width }
})
log('Q5_rerenderWatch', q5)

// textLayer 对位:补偿后选区 span 与 canvas 的相对位置(标注锚定不受补偿破坏?)
const q6 = await win.evaluate(() => {
  const span = [...document.querySelectorAll('span')].find((s) => s.textContent?.includes('SMART WATER'))
  const canvas = document.querySelector('canvas[data-pdf-canvas]')
  if (!span || !canvas) return null
  const sr = span.getBoundingClientRect()
  const cr = canvas.getBoundingClientRect()
  return { spanInCanvasX: sr.x - cr.x, spanInCanvasY: sr.y - cr.y, spanH: sr.height }
})
log('Q6_textLayerOffset', q6)

await app.close()
writeFileSync(join(process.cwd(), 'scripts', 'audits', 'r2-set1-out-probe.json'), JSON.stringify(OUT, null, 2))
console.log('PROBE DONE')
