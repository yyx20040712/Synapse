/**
 * P7D-01 批一视觉零差探针（主控验收工具——票面「无头截图 diff 验收」落点）。
 *
 * 用法：node scripts/audits/p7d01-visual-probe.mjs baseline|after
 * 输出：scripts/audits/p7d01-out/<phase>/{*.png,dump.json}；
 *       after 阶段且 baseline 在场 → 自动逐字节（sha256）+计算样式对比
 *       → p7d01-out/compare-report.json，任一不等 exit=1。
 *
 * 原理（⑤b 替代形态=无阈值像素差分+DOM 状态转储，f1-forensics5 先例）：
 * - 迁移面=动效时长/间距/层级三轴（值不变仅载体变）→ 零视觉差铁证=
 *   ①八态截图逐字节相同；②全 DOM 计算样式扫描（transition-duration/
 *   z-index）逐元素相同（截图盖不住时间维——duration 靠计算值锁定）。
 * - 确定性前提：注入 animation:none 冻结常驻渐变流动（syn-pan-* 帧
 *   随机性）+--force-prefers-reduced-motion 双保险；toast 等 3.5s 自灭
 *   面先带 toast 扫描（z-50 契机）再等消失截图；保存状态轮询到稳态。
 * - 实景（⑤f）：种子 3 文献（甲=真 PDF）+脉络草稿导入（3 节点树）
 *   +节点选中侧板+标签添加+课题切换面板+设置页+阅读器——非空态验证。
 *
 * 配方移植：r2-set1-probe.mjs（pdf-factory 内联+双 ABI 种子+launch）、
 * tests/e2e/lineage.spec.ts（dialog 桩+confirm 自动接受+草稿 fixture）。
 */
import { _electron as electron } from '@playwright/test'
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { copyFile, mkdtemp, readdir, readFile, writeFile } from 'node:fs/promises'
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const OUT_ROOT = join(HERE, 'p7d01-out')
const PHASE = process.argv[2]
if (PHASE !== 'baseline' && PHASE !== 'after') {
  console.error('用法: node scripts/audits/p7d01-visual-probe.mjs baseline|after')
  process.exit(2)
}
const OUT = join(OUT_ROOT, PHASE)
mkdirSync(OUT, { recursive: true })

/** 迁移后 token 期望值（票面钉死——after 阶段硬断言；baseline 阶段为空串属预期）。
 * 期望值取 **Chromium 计算值序列化形态**（getPropertyValue 归一：0.08s→"80ms"，
 * 其余 <time> 去前导零 ".12s" 形；z 整数无归一）——源码字面（'0.08s;'）由
 * theme.test.ts TOKENS 锁，此处锁「挂载后计算值」面，两锁互补不矛盾。 */
const EXPECT_TOKENS = {
  '--dur-press': '80ms',
  '--dur-tint': '.12s',
  '--dur-fast': '.14s',
  '--dur-base': '.18s',
  '--dur-lazy': '.2s',
  '--dur-rise': '.22s',
  '--dur-flow': '.3s',
  '--z-float': '10',
  '--z-anchor-pop': '20',
  '--z-pop-veil': '40',
  '--z-pop': '50'
}

const PDF_KNOWN_TEXT = 'SMART WATER TEST DOC'
const PAPERS = [
  { id: 'p7d-lg-root', title: '脉络根文献', year: 2020, real: false },
  { id: 'p7d-lg-a', title: '脉络甲文献', year: 2022, real: true },
  { id: 'p7d-lg-b', title: '脉络乙文献', year: 2023, real: false }
]

function createTinyPdf(text) {
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

async function seedRow(userData, fileRef, sha, title, id) {
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
      const env = {
        ...process.env,
        SEED_DB: join(userData, 'synapse.db'),
        SEED_FILE_REF: fileRef,
        SEED_SHA: sha,
        SEED_TITLE: title
      }
      if (id) env.SEED_ID = id
      const child = spawn(process.execPath, [join(process.cwd(), 'tests', 'e2e', 'seed-paper.mjs')], { env, stdio: 'inherit' })
      child.on('exit', (c) => (c === 0 ? resolve() : reject(new Error(`seed 退出码 ${c}`))))
      child.on('error', reject)
    })
  } finally {
    await writeFile(releaseBinding, electronBinding)
  }
}

function draftJson() {
  return JSON.stringify({
    nodes: PAPERS.map((p) => ({
      paper_id: p.id,
      title: p.title,
      year: p.year,
      core_idea: p.id === 'p7d-lg-a' ? '脉络甲的核心 idea（探针）' : ''
    })),
    edges: [
      { from_paper_id: 'p7d-lg-root', to_paper_id: 'p7d-lg-a', label: '继承甲' },
      { from_paper_id: 'p7d-lg-root', to_paper_id: 'p7d-lg-b', label: '' }
    ]
  })
}

function launch(userData) {
  return electron.launch({
    args: ['out/main/index.js'],
    env: { ...process.env, SYNAPSE_USER_DATA: userData }
  })
}

const DUMP = { phase: PHASE, sweeps: {}, tokens: {} }

/** 全 DOM 计算样式扫描：transition 非 0s / zIndex 非 auto 的元素（path 键=结构稳定，className 仅诊断不入对比） */
async function sweep(win, state) {
  const data = await win.evaluate(() => {
    const pathOf = (el) => {
      const parts = []
      let n = el
      while (n && n.tagName !== 'BODY' && parts.length < 14) {
        const parent = n.parentElement
        const idx = parent ? Array.prototype.indexOf.call(parent.children, n) + 1 : 1
        parts.unshift(`${n.tagName}[${idx}]`)
        n = parent
      }
      return 'BODY/' + parts.join('/')
    }
    const trans = {}
    const zi = {}
    const cls = {}
    for (const el of document.querySelectorAll('*')) {
      const cs = getComputedStyle(el)
      const dur = cs.transitionDuration
      const hasDur = dur !== '0s' && !dur.split(', ').every((d) => d === '0s')
      const key = pathOf(el)
      if (hasDur) {
        trans[key] = `${cs.transitionProperty} | ${dur} | ${cs.transitionTimingFunction}`
        cls[key] = el.className?.toString?.() ?? ''
      }
      if (cs.zIndex !== 'auto') {
        zi[key] = cs.zIndex
        if (!cls[key]) cls[key] = el.className?.toString?.() ?? ''
      }
    }
    return {
      windowSize: { w: window.innerWidth, h: window.innerHeight },
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      trans,
      zi,
      cls
    }
  })
  DUMP.sweeps[state] = { windowSize: data.windowSize, reducedMotion: data.reducedMotion, trans: data.trans, zi: data.zi }
  DUMP[`cls-${state}`] = data.cls
  console.log(`[sweep] ${state}: trans=${Object.keys(data.trans).length} z=${Object.keys(data.zi).length} reducedMotion=${data.reducedMotion}`)
  // 确定性由注入 animation:none 承担（--force-prefers-reduced-motion 在本 Electron
  // 未生效——实测 reducedMotion=false；媒体查询值仅记录诊断，不作硬断言）
  return data
}

async function shot(win, name) {
  await win.screenshot({ path: join(OUT, `${name}.png`) })
  console.log(`[shot] ${name}.png`)
}

const nodeG = (win, title) => win.locator('svg g[data-node-id]').filter({ hasText: title })

// ── 主链 ────────────────────────────────────────────────────────────
const userData = await mkdtemp(join(tmpdir(), 'synapse-p7d01-'))
const seedApp = await launch(userData)
await (await seedApp.firstWindow()).waitForTimeout(500)
await seedApp.close()

for (const p of PAPERS) {
  if (!p.real) {
    const ghostSha = createHash('sha256').update(`p7d-ghost-${p.id}`).digest('hex')
    await seedRow(userData, `${ghostSha.slice(0, 2)}/${ghostSha.slice(2, 4)}/${ghostSha}.pdf`, ghostSha, p.title, p.id)
    continue
  }
  const bytes = createTinyPdf(`${p.title} ${PDF_KNOWN_TEXT}`)
  const sha = createHash('sha256').update(bytes).digest('hex')
  const fileRef = `${sha.slice(0, 2)}/${sha.slice(2, 4)}/${sha}.pdf`
  const abs = join(userData, 'files', ...fileRef.split('/'))
  mkdirSync(dirname(abs), { recursive: true })
  writeFileSync(abs, bytes)
  await seedRow(userData, fileRef, sha, p.title, p.id)
}
const draftPath = join(userData, 'lineage-draft.json')
writeFileSync(draftPath, draftJson(), 'utf8')

const app = await launch(userData)
const win = await app.firstWindow()
await win.getByRole('button', { name: '文献库' }).waitFor({ timeout: 20_000 })
// 确定性冻结：常驻渐变流动（syn-pan-*）帧随机——animation:none 落基底静态帧（两阶段同冻结=公平对比）
await win.addStyleTag({ content: '*, *::before, *::after { animation: none !important; }' })
await win.getByText('脉络甲文献').first().waitFor({ timeout: 10_000 })
await win.waitForTimeout(400)

// 态 1：文献库（lib-card/corner/dropzone/chip 面）
await sweep(win, 'lib')
await shot(win, 'lib')

// 态 2：课题切换面板（ws-trigger/ws-item 面）
await win.getByRole('button', { name: '切换课题' }).click()
await win.locator('.ws-item').first().waitFor({ timeout: 10_000 })
await win.waitForTimeout(300)
await sweep(win, 'wsPanel')
await shot(win, 'ws-panel')
await win.keyboard.press('Escape')
await win.waitForTimeout(200)
if (await win.locator('.ws-item').count()) {
  await win.getByRole('button', { name: '切换课题' }).click()
  await win.waitForTimeout(200)
}

// 态 3：设置页（syn-settings 分节卡/输入面）
await win.getByRole('button', { name: '设置' }).click()
await win.locator('.syn-settings section').first().waitFor({ timeout: 10_000 })
await win.waitForTimeout(300)
await sweep(win, 'settings')
await shot(win, 'settings')

// 态 4：脉络导入（dialog 桩+confirm 自动接受；toast 窗口先扫描再等灭）
await win.getByRole('button', { name: '脉络' }).click()
await win.getByTestId('lineage-import').waitFor({ timeout: 10_000 })
await app.evaluate((electronMod, dir) => {
  ;(electronMod.dialog).showOpenDialog = async () => ({ canceled: false, filePaths: [dir] })
}, draftPath)
win.on('dialog', (d) => { void d.accept() })
await win.getByTestId('lineage-import').click()
await win.getByText('已导入脉络图：3 个节点，2 条连线').waitFor({ timeout: 10_000 })
await sweep(win, 'lineageToast')
for (const p of PAPERS) await nodeG(win, p.title).waitFor({ timeout: 10_000 })
// 保存状态轮询到稳态 + toast 自灭（3500ms）
await win.waitForFunction(
  () => {
    const s = document.querySelector('[data-testid="lineage-save-status"]')?.textContent ?? ''
    return !s.includes('保存中') && !s.includes('失败')
  },
  { timeout: 15_000 }
)
await win.getByText('已导入脉络图：3 个节点，2 条连线').waitFor({ state: 'hidden', timeout: 10_000 })
await win.waitForTimeout(400)
await sweep(win, 'lineageCanvas')
await shot(win, 'lineage-canvas')

// 态 5：节点选中侧板（SidePanel/SideTags/SideManualNote/SideAiNotes 空态面）
await nodeG(win, '脉络甲文献').click()
await win.getByTestId('lineage-side-tags').waitFor({ timeout: 10_000 })
await win.waitForTimeout(600)
await sweep(win, 'lineageSide')
await shot(win, 'lineage-side')

// 态 6：添加标签（chip 渲染——NodeMeta 卡片脚+侧板双面）+失焦防光标闪烁
await win.getByTestId('lineage-tag-input').fill('视觉锚')
await win.keyboard.press('Enter')
await win.getByTestId('lineage-tag-chip').first().waitFor({ timeout: 10_000 })
await win.keyboard.press('Escape')
await win.waitForTimeout(400)
await sweep(win, 'lineageSideTagged')
await shot(win, 'lineage-side-tagged')

// 态 7：添加节点对话框（Dialog overlay z-50 编译实证面）
await win.getByTestId('lineage-add-node').click()
await win.locator('div.fixed.inset-0').first().waitFor({ timeout: 10_000 })
await win.waitForTimeout(300)
await sweep(win, 'dialog')
await shot(win, 'dialog')
await win.getByRole('button', { name: '取消' }).click()
await win.waitForTimeout(300)

// 态 8：阅读器（真 PDF——canvas/textLayer/工具条面）
await win.getByRole('button', { name: '文献库' }).click()
await win.getByText('脉络甲文献').first().waitFor({ timeout: 10_000 })
await win.getByText('脉络甲文献').first().dblclick()
await win.getByText(PDF_KNOWN_TEXT).first().waitFor({ timeout: 20_000 })
await win.waitForTimeout(800)
await sweep(win, 'reader')
await shot(win, 'reader')

// token 值（after 阶段=期望值硬断言；baseline=空串记录）
DUMP.tokens = await win.evaluate((names) => {
  const cs = getComputedStyle(document.documentElement)
  return Object.fromEntries(names.map((n) => [n, cs.getPropertyValue(n).trim()]))
}, Object.keys(EXPECT_TOKENS))

await app.close()

/** 编译面绝对断言（门一 §6(2) 处置——未渲染弹层件的闭环）：bundle CSS 文本必含
 *  全部 4 个 z 变量简写 utility+7 个间距迁移 class 的选择器（CSS 转义形态——
 *  `.z-\(--z-pop\)`/`.gap-0\.75`）。Tailwind 按需生成：规则在=类名被扫描编译,
 *  未渲染 DOM 面的消费件同获编译证据（与 Dialog/Toast 在场计算值互证）。
 *  实现注：document.styleSheets 在 file:// 下 cssRules 抛 SecurityError 全跳过
 *  （首版实测 11 项全 miss）——改 Node 侧直读 bundle CSS 文本。 */
const WANT_RULES = ['z-(--z-float)', 'z-(--z-anchor-pop)', 'z-(--z-pop-veil)', 'z-(--z-pop)',
  'pt-2', 'gap-1', 'px-1', 'pl-1', 'pl-1.5', 'gap-0.75', 'px-0.75']
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const bundleCssFiles = (await readdir(join(process.cwd(), 'out', 'renderer', 'assets')))
  .filter((f) => f.endsWith('.css'))
if (bundleCssFiles.length !== 1) throw new Error(`bundle CSS 应恰 1 份,实得 ${bundleCssFiles.length}`)
const bundleCss = readFileSync(join(process.cwd(), 'out', 'renderer', 'assets', bundleCssFiles[0]), 'utf8')
DUMP.compiledRules = Object.fromEntries(WANT_RULES.map((w) => [w, bundleCss.includes(escRe(w))]))
writeFileSync(join(OUT, 'dump.json'), JSON.stringify(DUMP, null, 2))
console.log(`[${PHASE}] 探针完成 → ${OUT}`)

// ── after 阶段自动对比 ──────────────────────────────────────────────
if (PHASE === 'after') {
  const baseDir = join(OUT_ROOT, 'baseline')
  if (!existsSync(join(baseDir, 'dump.json'))) {
    console.log('[compare] baseline 不在场——跳过对比（仅采集）')
    process.exit(0)
  }
  const base = JSON.parse(readFileSync(join(baseDir, 'dump.json'), 'utf8'))
  const report = { png: {}, sweeps: {}, tokens: null, pass: true }
  const fail = (section, msg) => {
    if (!report[section].failures) report[section].failures = []
    report[section].failures.push(msg)
    report.pass = false
    console.log(`[FAIL] ${section}: ${msg}`)
  }
  // ① token 期望值（零视觉差的值面锚——迁移后必须精确等于票面值）
  const tokenFail = []
  for (const [k, v] of Object.entries(EXPECT_TOKENS)) {
    if (DUMP.tokens[k] !== v) tokenFail.push(`${k}="${DUMP.tokens[k]}" 期望 "${v}"`)
  }
  if (tokenFail.length) { report.tokens = { failures: tokenFail }; report.pass = false; console.log(`[FAIL] tokens: ${tokenFail.join('; ')}`) }
  else { report.tokens = { ok: Object.keys(EXPECT_TOKENS).length }; console.log(`[ok] tokens: ${Object.keys(EXPECT_TOKENS).length} 项精确匹配`) }
  // ⓪ 编译面（绝对断言——4 z 简写 utility+7 间距 class 选择器必须在 bundle CSS 文本）
  const wantRules = ['z-(--z-float)', 'z-(--z-anchor-pop)', 'z-(--z-pop-veil)', 'z-(--z-pop)',
    'pt-2', 'gap-1', 'px-1', 'pl-1', 'pl-1.5', 'gap-0.75', 'px-0.75']
  const missingRules = wantRules.filter((w) => !DUMP.compiledRules[w])
  if (missingRules.length) { report.compiledRules = { missing: missingRules }; report.pass = false; console.log(`[FAIL] compiledRules: 缺 ${missingRules.join(', ')}`) }
  else { report.compiledRules = { ok: wantRules.length }; console.log(`[ok] compiledRules: ${wantRules.length} 项 utility 规则全在场`) }
  // ② 截图逐字节（sha256）
  for (const name of ['lib', 'ws-panel', 'settings', 'lineage-canvas', 'lineage-side', 'lineage-side-tagged', 'dialog', 'reader']) {
    const h = (f) => createHash('sha256').update(readFileSync(f)).digest('hex')
    const a = h(join(OUT, `${name}.png`))
    const b = h(join(baseDir, `${name}.png`))
    report.png[name] = a === b ? 'identical' : 'DIFF'
    if (a !== b) fail('png', `${name}.png 哈希不同（baseline=${b.slice(0, 12)} after=${a.slice(0, 12)}）`)
    else console.log(`[ok] png ${name}.png 逐字节相同`)
  }
  // ③ 计算样式扫描逐态对比（transition/zIndex——时间维铁证）
  for (const [state, afterSweep] of Object.entries(DUMP.sweeps)) {
    const baseSweep = base.sweeps[state]
    if (!baseSweep) { fail('sweeps', `baseline 缺态 ${state}`); continue }
    for (const field of ['windowSize', 'trans', 'zi']) {
      const a = JSON.stringify(afterSweep[field])
      const b = JSON.stringify(baseSweep[field])
      if (a !== b) fail('sweeps', `${state}.${field} 不一致：baseline=${b.slice(0, 300)} after=${a.slice(0, 300)}`)
    }
  }
  if (!report.sweeps.failures?.length) console.log('[ok] sweeps: 全部态 windowSize/trans/zi 逐键相同')
  writeFileSync(join(OUT_ROOT, 'compare-report.json'), JSON.stringify(report, null, 2))
  console.log(report.pass ? '[COMPARE] PASS——零视觉差铁证成立' : '[COMPARE] FAIL')
  process.exit(report.pass ? 0 : 1)
}
