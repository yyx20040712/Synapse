/**
 * F-A9 标注带垂直几何——诊断探针（夹具复现 img1/img3 两形态）。
 * 缺陷①（img1 预览带下移半行）：划选→量 [data-testid=selection-rect] 的
 *   top/height vs 被选文字 span 的 top/height（带应=行盒顶/高——票面验收）。
 * 缺陷②（img3 underline 低位切字）：点「下划线」→量 annotation-rect（underline
 *   条）top vs 文字 span 底（应=行盒下方 2px 细线）。
 * 附带取证：span computed font（回退字体证据）/快慢路径 warn 捕获/
 *   page-items 注册表在场（项几何链 vs DOM 回退链分流证据）。
 */
import { _electron as electron } from '@playwright/test'
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { copyFile, mkdtemp, readdir, readFile, writeFile } from 'node:fs/promises'
import { mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

const LINE1 = 'SMART WATER TEST DOC'
const LINE2 = 'SECOND LINE SAMPLE'
const warns = []

function createTwoLinePdf() {
  const esc = (s) => s.replaceAll('\\', '\\\\').replaceAll('(', '\\(').replaceAll(')', '\\)')
  const stream = `BT /F1 18 Tf 72 720 Td (${esc(LINE1)}) Tj 0 -24 Td (${esc(LINE2)}) Tj ET`
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${new TextEncoder().encode(stream).length} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Title (f-a9 diag) /Producer (synapse-probe) >>'
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
  push('xref\n0 6\n0000000000 65535 f \n')
  for (const off of offsets) push(`${String(off).padStart(10, '0')} 00000 n \n`)
  push('trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF')
  const out = new Uint8Array(byteLen)
  let cursor = 0
  for (const part of parts) { out.set(part, cursor); cursor += part.length }
  return out
}

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

const launch = (userData) =>
  electron.launch({ args: ['out/main/index.js'], env: { ...process.env, SYNAPSE_USER_DATA: userData } })

const title = 'F-A9 几何诊断文献'
const userData = await mkdtemp(join(tmpdir(), 'synapse-a9diag-'))
const seedApp = await launch(userData)
await (await seedApp.firstWindow()).waitForTimeout(500)
await seedApp.close()
const bytes = createTwoLinePdf()
const sha = createHash('sha256').update(bytes).digest('hex')
const fileRef = `${sha.slice(0, 2)}/${sha.slice(2, 4)}/${sha}.pdf`
const abs = join(userData, 'files', ...fileRef.split('/'))
mkdirSync(dirname(abs), { recursive: true })
writeFileSync(abs, bytes)
await seedRow(userData, fileRef, sha, title)

const app = await launch(userData)
const win = await app.firstWindow()
win.on('console', (msg) => {
  const t = msg.text()
  if (t.includes('回退') || t.includes('SelectionLayer')) warns.push(t)
})
await win.getByRole('button', { name: '文献库' }).waitFor({ timeout: 20_000 })
await win.getByText(title).first().waitFor({ timeout: 10_000 })
await win.getByText(title).first().dblclick()
await win.getByText(LINE1).first().waitFor({ timeout: 20_000 })
await win.waitForTimeout(1200)

// 文字 span 几何（两行各自的 span 盒+字体证据）
const spanInfo = await win.evaluate(() => {
  const spans = [...document.querySelectorAll('.textLayer span')]
  return spans.map((s) => {
    const b = s.getBoundingClientRect()
    const cs = getComputedStyle(s)
    return {
      text: s.textContent?.slice(0, 30),
      top: b.top, bottom: b.bottom, height: b.height, left: b.left, width: b.width,
      font: `${cs.fontSize} ${cs.fontFamily}`,
      lh: cs.lineHeight
    }
  })
})

// 真实鼠标拖选第一行中部 → 预览带
const line1 = spanInfo.find((s) => s.text?.includes(LINE1))
const y = (line1.top + line1.bottom) / 2
const x0 = line1.left + line1.width * 0.25
const x1 = line1.left + line1.width * 0.75
await win.mouse.move(x0, y)
await win.mouse.down()
await win.mouse.move(x1, y, { steps: 8 })
await win.mouse.up()
await win.waitForTimeout(600)

const paintInfo = await win.evaluate(() => {
  const rects = [...document.querySelectorAll('[data-testid="selection-rect"]')]
  return rects.map((r) => {
    const b = r.getBoundingClientRect()
    return { top: b.top, bottom: b.bottom, height: b.height, left: b.left, width: b.width }
  })
})

// 点「下划线」→ 标注条
await win.getByRole('button', { name: '下划线' }).click()
await win.waitForTimeout(1000)
const underInfo = await win.evaluate(() => {
  const rects = [...document.querySelectorAll('[data-testid="annotation-rect"]')]
  return rects.map((r) => {
    const b = r.getBoundingClientRect()
    return {
      top: b.top, bottom: b.bottom, height: b.height, left: b.left, width: b.width,
      kind: r.getAttribute('data-annotation-id')?.slice(0, 8), source: r.getAttribute('data-source')
    }
  })
})

console.log(JSON.stringify({ spanInfo, paintInfo, underInfo, warns }, null, 2))
await app.close()
