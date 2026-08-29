/**
 * R2-SET1 真机取证（⑤b/⑤f——真实库副本实景，三档遍历）。
 *
 * 取证面（每档 small/medium/large）：
 *  - header 高（结构性豁免锁——恒 44）
 *  - nav 首项 rect（1 / 1.1 / 1.25 三档比）
 *  - PDF canvas rect（页列补偿恒基线——max−min ≤1px）
 *  - textLayer 对位偏移（span 相对 canvas——跨档漂移即对位破坏）
 *  - 全窗截图
 * 配方：真实库拷贝=r2-ui1-forensics.mjs（%APPDATA%/Synapse 数据-bearing 子集）；
 * PDF 兜底工厂=r2-set1-probe.mjs 逐字复用（已修正含 %PDF-1.4 头——真实库
 * 无可开文献时种子一篇，JSON 记 fallbackSeeded）。
 * 用法：node scripts/audits/r2-set1-forensics.mjs（需先 build；无头禁开可见窗口）
 */
import { _electron as electron } from '@playwright/test'
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { copyFile, cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

const ROOT = process.cwd()
const OUT = join(ROOT, 'scripts', 'audits', 'r2-set1-out')
const results = { fallbackSeeded: false, scales: {} }
function log(...a) {
  console.log(`[set1 ${new Date().toISOString().slice(11, 19)}]`, ...a)
}

// ── pdf-factory 逐字复用（r2-set1-probe.mjs 同源——含 %PDF-1.4 头，勿手抄改动）──
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

// ── 双 ABI 种子（r2-set1-probe.mjs 同源）──────────────────────────
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

function launch(userData) {
  return electron.launch({ args: ['out/main/index.js'], env: { ...process.env, SYNAPSE_USER_DATA: userData } })
}

/** 打开首篇文献到阅读器（canvas 就绪） */
async function openFirstPaper(win) {
  await win.locator('.lib-card').first().dblclick()
  await win.waitForSelector('canvas[data-pdf-canvas]', { timeout: 30_000 })
  await win.waitForTimeout(900)
}

/** 每档量取：header 高/nav rect/canvas rect/textLayer 对位/--ui-scale 变量 */
async function measure(win) {
  return win.evaluate(() => {
    const header = document.querySelector('header.app-header')
    const navItem = document.querySelector('.app-nav-item')
    const canvas = document.querySelector('canvas[data-pdf-canvas]')
    const col = document.querySelector('[data-page-column]')
    const span = col?.querySelector('.textLayer span') ?? null
    const cr = canvas?.getBoundingClientRect()
    const sr = span?.getBoundingClientRect()
    return {
      headerH: header ? header.getBoundingClientRect().height : null,
      navRectW: navItem ? navItem.getBoundingClientRect().width : null,
      navRectH: navItem ? navItem.getBoundingClientRect().height : null,
      canvasRectW: cr ? cr.width : null,
      canvasRectH: cr ? cr.height : null,
      canvasBackingW: canvas?.width ?? null,
      colComputedZoom: col ? getComputedStyle(col).zoom : null,
      uiScaleVar: getComputedStyle(document.documentElement).getPropertyValue('--ui-scale').trim(),
      spanInCanvasX: sr && cr ? +(sr.x - cr.x).toFixed(2) : null,
      spanInCanvasY: sr && cr ? +(sr.y - cr.y).toFixed(2) : null
    }
  })
}

async function main() {
  if (!existsSync(join(ROOT, 'out', 'main', 'index.js'))) throw new Error('先 build')
  await mkdir(OUT, { recursive: true })
  const src = join(process.env.APPDATA, 'Synapse')
  const userData = join(tmpdir(), 'synapse-r2set1')
  await rm(userData, { recursive: true, force: true })
  // 真实库副本（⑤f——Cache 系可再生不搬；workspaces/=库本体）
  for (const p of ['workspaces', 'ai-sensor']) {
    if (existsSync(join(src, p))) await cp(join(src, p), join(userData, p), { recursive: true })
  }
  for (const f of ['settings.json', 'workspace.json', 'window-state.json']) {
    if (existsSync(join(src, f))) await cp(join(src, f), join(userData, f))
  }

  let app = await launch(userData)
  let win = await app.firstWindow()
  await win.setDefaultTimeout(30_000)
  await win.setViewportSize({ width: 1280, height: 800 })
  await win.getByRole('button', { name: '文献库' }).waitFor()

  // 真实库无可开文献时兜底：种子探针 PDF（工厂含 %PDF-1.4 头）
  if ((await win.locator('.lib-card').count()) === 0) {
    log('真实库空——种子兜底文献')
    await app.close()
    const title = '智慧水务 SET1 取证兜底文献'
    const bytes = createTinyPdf(`${title} ${PDF_KNOWN_TEXT}`)
    const sha = createHash('sha256').update(bytes).digest('hex')
    const fileRef = `${sha.slice(0, 2)}/${sha.slice(2, 4)}/${sha}.pdf`
    const abs = join(userData, 'files', ...fileRef.split('/'))
    mkdirSync(dirname(abs), { recursive: true })
    writeFileSync(abs, bytes)
    await seedRow(userData, fileRef, sha, title)
    results.fallbackSeeded = true
    app = await launch(userData)
    win = await app.firstWindow()
    await win.setDefaultTimeout(30_000)
    await win.setViewportSize({ width: 1280, height: 800 })
    await win.getByRole('button', { name: '文献库' }).waitFor()
  }

  // small 基线（默认档——真实库 settings.json 可能带档位，先归一 small）
  await win.getByRole('button', { name: '设置' }).click()
  await win.getByRole('button', { name: '小 100%' }).click()
  await win.getByRole('button', { name: '文献库' }).click()
  await win.waitForSelector('.lib-card')
  await openFirstPaper(win)

  const plan = [
    { key: 'small', label: '小 100%', expectVar: '1' },
    { key: 'medium', label: '中 110%', expectVar: '1.1' },
    { key: 'large', label: '大 125%', expectVar: '1.25' }
  ]
  for (const step of plan) {
    if (step.key !== 'small') {
      await win.getByRole('button', { name: '设置' }).click()
      await win.getByRole('button', { name: step.label }).click()
      await win.getByText('界面缩放已保存').waitFor({ timeout: 10_000 })
      // 回阅读器：tab 驻留 store，重挂后 canvas 重渲（补偿态量取点）
      await win.getByRole('button', { name: '阅读器' }).click()
      await win.waitForSelector('canvas[data-pdf-canvas]', { timeout: 30_000 })
      await win.waitForTimeout(900)
    }
    results.scales[step.key] = await measure(win)
    await win.screenshot({ path: join(OUT, `F-${step.key}.png`) })
    log(step.key, JSON.stringify(results.scales[step.key]))
  }
  await win.screenshot({ path: join(OUT, 'F-settings.png') }).catch(() => {})

  // 归一小结：canvas 恒基线差/nav 比/header 恒
  const s = results.scales
  const canvasWs = Object.values(s).map((x) => x.canvasRectW).filter((v) => v !== null)
  results.summary = {
    headerHs: [s.small.headerH, s.medium.headerH, s.large.headerH],
    navHs: [s.small.navRectH, s.medium.navRectH, s.large.navRectH],
    navRatios: [s.medium.navRectH / s.small.navRectH, s.large.navRectH / s.small.navRectH],
    canvasRectW: [s.small.canvasRectW, s.medium.canvasRectW, s.large.canvasRectW],
    canvasMaxDrift: canvasWs.length === 3 ? Math.max(...canvasWs) - Math.min(...canvasWs) : null,
    spanOffsets: [s.small.spanInCanvasX, s.medium.spanInCanvasX, s.large.spanInCanvasX]
  }
  await writeFile(join(OUT, 'r2-set1-forensics.json'), JSON.stringify(results, null, 2), 'utf8')
  await app.close()
  log('完成', JSON.stringify(results.summary))
}

main().catch((e) => {
  console.error('[set1] FAIL', e)
  process.exitCode = 1
})
