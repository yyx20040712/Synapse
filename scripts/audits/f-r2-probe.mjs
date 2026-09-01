/**
 * F-R2 修票前置真机探针（v18 U1——H1/H2/H3/H4/H5 判据实证）。
 * 复用：f-l2-precheck 库副本+--ui-scale DOM 覆写范式 / f-r1-dbg 开文献链。
 * P1 语义探针（H5/H1 前置）：scrollTop+=100 的 Δst 与内容节点视觉位移 Δvis。
 * P2 落点探针（H1 主判据）：三档 × {fill(1),fill(4),下一页→页5}，记 {s_before,δv,s_after,落点偏移}
 *     判据：Z≠1 档 dSt≈δv（实加视觉量而非 δv/Z）且落点偏移随 δv 放大；Z=1 档基线偏移≈0。
 *     附 overflowAnchor='none' 对照组（H4 排除：漂移不变→锚定无关）。
 * P3 页码误判带（H2）：1.25 档全文档 40px 步进扫 {s, inputPage, trueCenterPage}，聚连续误判段带宽
 *     （每步 sleep 40ms 让 React 受控 input 回显——scroll→store→render 链）。
 * P4 zoom 往返锚（H3）：置中 → ＋→− 各一次 ×3 cycle，|Δst| 两档对照。
 * 产物：scripts/audits/f-r2-out/{f-r2-probe.json, P2-landfill4-large.png}
 * 禁改用户 settings.json（档位全 DOM 覆写）；真实库副本运行。
 */
import { _electron as electron } from '@playwright/test'
import { cp, mkdir, rm } from 'node:fs/promises'
import { existsSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const ROOT = process.cwd()
const OUT = join(ROOT, 'scripts', 'audits', 'f-r2-out')
await mkdir(OUT, { recursive: true })
const log = (...a) => console.log(`[f-r2probe ${new Date().toISOString().slice(11, 19)}]`, ...a)
const r2 = (x) => Math.round(x * 100) / 100

async function freshUserData() {
  const src = join(process.env.APPDATA, 'Synapse')
  const userData = join(tmpdir(), 'synapse-f-r2-probe')
  await rm(userData, { recursive: true, force: true })
  for (const p of ['workspaces', 'ai-sensor']) await cp(join(src, p), join(userData, p), { recursive: true })
  for (const f of ['settings.json', 'workspace.json', 'window-state.json']) {
    if (existsSync(join(src, f))) await cp(join(src, f), join(userData, f))
  }
  return userData
}

const app = await electron.launch({ args: ['out/main/index.js'], env: { ...process.env, SYNAPSE_USER_DATA: await freshUserData() } })
const win = await app.firstWindow()
await win.getByRole('button', { name: '文献库' }).waitFor({ timeout: 20_000 })
await win.getByRole('button', { name: '文献库' }).click()
await win.waitForTimeout(1000)
await win.locator('button.lib-card').first().dblclick()
await win.waitForSelector('[data-page-column="ready"]', { timeout: 20_000 })
await win.waitForTimeout(1500)

const pageErrors = []
win.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 200)))

const INPUT = 'input[aria-label="跳转到页"]'
const R_FN = 'const r=(x)=>Math.round(x*100)/100;'
const evalJS = (expr) => win.evaluate(`(async () => { ${R_FN} ${expr} })()`)

const setScale = async (z) => {
  await win.evaluate(`document.documentElement.style.setProperty('--ui-scale', '${z}')`)
  await win.waitForTimeout(600)
}
const jump = async (kind, arg) => {
  if (kind === 'fill') {
    await win.locator(INPUT).fill(String(arg))
    await win.locator(INPUT).press('Enter')
  } else if (kind === 'next') {
    await win.getByRole('button', { name: '下一页' }).click()
  }
  await win.waitForTimeout(700)
}
// 目标页盒：视觉差（相对滚动容器顶）+当时 scrollTop
const measureAround = (targetBox) => evalJS(`
  const sc = document.querySelector('[data-page-column]')?.closest('.overflow-auto')
  const sr = sc.getBoundingClientRect()
  const b = document.querySelector('[data-page-box="${targetBox}"]')
  if (!b) return { missing: true }
  const br = b.getBoundingClientRect()
  return { deltaV: r(br.top - sr.top), boxH: r(br.height), st: r(sc.scrollTop) }
`)

const R = { meta: { script: 'f-r2-probe.mjs', date: new Date().toISOString() }, p1: null, tiers: {}, p3: null, p4: {} }

// ── P1 语义探针（1.25 档）：scrollTop+=100 → Δst / Δvis ──
await setScale('1.25')
await jump('fill', 1)
R.p1 = await evalJS(`
  const sc = document.querySelector('[data-page-column]')?.closest('.overflow-auto')
  const mark = document.querySelector('[data-page-box="2"]') || document.querySelector('[data-page-box="1"]')
  const before = { st: r(sc.scrollTop), vis: r(mark.getBoundingClientRect().top) }
  sc.scrollTop += 100
  const after = { st: r(sc.scrollTop), vis: r(mark.getBoundingClientRect().top) }
  return { before, after, dSt: r(after.st - before.st), dVis: r(before.vis - after.vis),
    zRow: getComputedStyle(sc.closest('.app-content-row') ?? sc).zoom, zSelf: getComputedStyle(sc).zoom }
`)
log('P1 语义:', JSON.stringify(R.p1))

// ── P2 落点探针：三档 × 三跳 ──
const SEQUENCE = [
  { kind: 'fill', arg: 1, box: 1 },
  { kind: 'fill', arg: 4, box: 4 },
  { kind: 'next', arg: null, box: 5 },
]
const runSeq = async () => {
  const hops = []
  for (const step of SEQUENCE) {
    const pre = await measureAround(step.box)
    const sBefore = pre.missing ? null : pre.st
    const deltaV = pre.missing ? null : pre.deltaV
    await jump(step.kind, step.arg)
    const post = await measureAround(step.box)
    hops.push({
      hop: `${step.kind}${step.arg ?? ''}`, box: step.box,
      sBefore, deltaV, sAfter: post.missing ? null : post.st,
      dSt: sBefore != null && post.st != null ? r2(post.st - sBefore) : null,
      landOffset: post.missing ? null : post.deltaV,
      missingPre: !!pre.missing, boxH: post.boxH,
    })
  }
  return hops
}
for (const [tier, z] of [['small_1', '1'], ['medium_1.1', '1.1'], ['large_1.25', '1.25']]) {
  await setScale(z)
  const hops = await runSeq()
  R.tiers[tier] = { z, hops }
  log(`P2 ${tier}:`, JSON.stringify(hops.map((h) => [h.hop, h.dSt, h.deltaV, h.landOffset])))
}
// H4 对照组：1.25 档 overflowAnchor=none 重跑
await setScale('1.25')
await evalJS(`const sc=document.querySelector('[data-page-column]')?.closest('.overflow-auto'); sc.style.overflowAnchor='none'; return sc.style.overflowAnchor`)
R.tiers['large_1.25_anchorNone'] = { z: '1.25', overflowAnchorNone: true, hops: await runSeq() }
log('P2 anchorNone:', JSON.stringify(R.tiers['large_1.25_anchorNone'].hops.map((h) => [h.hop, h.dSt, h.landOffset])))
await evalJS(`document.querySelector('[data-page-column]')?.closest('.overflow-auto')?.style.removeProperty('overflow-anchor'); return 1`)

// ── P3 页码误判带（H2，1.25 档）：40px 步进全景扫描 ──
await setScale('1.25')
await jump('fill', 1)
R.p3 = await evalJS(`
  const sc = document.querySelector('[data-page-column]')?.closest('.overflow-auto')
  const input = document.querySelector('input[aria-label="跳转到页"]')
  const sr = sc.getBoundingClientRect()
  const sleep = (ms) => new Promise((rf) => setTimeout(rf, ms))
  const samples = []
  const step = 40
  for (let s = 0; s <= sc.scrollHeight - sc.clientHeight; s += step) {
    sc.scrollTop = s
    await sleep(40)
    const cy = sr.top + sr.height / 2
    let tp = null
    for (const bb of document.querySelectorAll('[data-page-box]')) {
      const g = bb.getBoundingClientRect()
      if (cy >= g.top && cy < g.bottom) { tp = Number(bb.dataset.pageBox); break }
    }
    samples.push({ s: r(s), input: input ? Number(input.value) : null, true: tp })
  }
  const mismatch = []
  let run = null
  for (const smp of samples) {
    if (smp.input !== smp.true) { if (!run) run = { from: smp.s, to: smp.s, n: 0, input: smp.input, true: smp.true }; run.to = smp.s; run.n++ }
    else if (run) { mismatch.push(run); run = null }
  }
  if (run) mismatch.push(run)
  return { step, total: samples.length, mismatchBands: mismatch, sampleHead: samples.slice(0, 3) }
`)
log('P3 误判带:', JSON.stringify(R.p3.mismatchBands))

// ── P4 zoom 往返锚（H3）：置中 → ＋→− ×3 cycle，两档对照 ──
for (const [tier, z] of [['small_1', '1'], ['large_1.25', '1.25']]) {
  await setScale(z)
  R.p4[tier] = await evalJS(`
    const sc = document.querySelector('[data-page-column]')?.closest('.overflow-auto')
    const zl = document.querySelector('[data-testid="zoom-label"]')
    const minus = zl ? zl.previousElementSibling : null
    const plus = zl ? zl.nextElementSibling : null
    if (!plus || !minus) return { error: 'zoom 按钮未找到' }
    const sleep = (ms) => new Promise((rf) => setTimeout(rf, ms))
    sc.scrollTop = Math.floor((sc.scrollHeight - sc.clientHeight) / 2)
    await sleep(400)
    const cycles = []
    for (let i = 0; i < 3; i++) {
      const st0 = sc.scrollTop
      plus.click(); await sleep(700)
      minus.click(); await sleep(700)
      cycles.push({ st0: r(st0), st1: r(sc.scrollTop), d: r(sc.scrollTop - st0), zoom: zl.textContent })
    }
    return { cycles, scrollH: sc.scrollHeight, clientH: sc.clientHeight }
  `)
  log(`P4 ${tier}:`, JSON.stringify(R.p4[tier].cycles?.map((c) => c.d)))
}

// 落点错位视觉证据（1.25 档 fill(4) 落点实况）
await setScale('1.25')
await jump('fill', 4)
await win.screenshot({ path: join(OUT, 'P2-landfill4-large.png'), fullPage: false })

R.meta.pageErrors = pageErrors
writeFileSync(join(OUT, 'f-r2-probe.json'), JSON.stringify(R, null, 1), 'utf8')
log('落盘:', join(OUT, 'f-r2-probe.json'), ' pageErrors=', pageErrors.length)
await app.close()
