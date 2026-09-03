/**
 * AUDIT-B B4 取证探针 —— UI1 常驻流光 × 性能/功耗（A/B 量化）。
 *
 * 配方（简报 B4 行）：无头 launch 库视图静止窗口（5s×2 相）：
 *   A 相=流光在场（ws-trigger syn-pan-x 6s infinite 常驻动画）；
 *   B 相=同元素 animation:none（运行时 style 注入——不改源文件）。
 *   每相量：rAF 帧计数+帧间隔分位（p50/p95/max）+PerformanceObserver
 *   longtask（>50ms）计数+时长。判级：常驻动画致 longtask>0 或帧间隔
 *   显著劣化（主线程被动画占用）=W；纯合成器动画（零 longtask、A/B 同
 *   帧轮廓）=N 记档。
 * 产物：scripts/audits/auditb-out/b4.json
 * 用法：node scripts/audits/auditb-b4.js（需先 build；无 setViewportSize）
 */
import { _electron as electron } from '@playwright/test'
import { mkdir, rm } from 'node:fs/promises'
import { existsSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const ROOT = process.cwd()
const OUT = join(ROOT, 'scripts', 'audits', 'auditb-out')
const R = { meta: { script: 'auditb-b4.js', date: new Date().toISOString() }, phases: {} }
const log = (...a) => console.log(`[b4 ${new Date().toISOString().slice(11, 19)}]`, ...a)
let app = null

/** 5s 静止采样：rAF 帧计数+间隔分位+longtask（渲染进程内探针——运行时注入） */
const SAMPLE_EXPR = `new Promise((resolve) => {
  const DURATION = 5000
  const frames = []
  let longtasks = 0
  let longtaskMs = 0
  let po = null
  try {
    po = new PerformanceObserver((list) => {
      for (const e of list.getEntries()) { longtasks += 1; longtaskMs += e.duration }
    })
    po.observe({ entryTypes: ['longtask'] })
  } catch { po = null }
  let alive = true
  const tick = (t) => {
    if (!alive) return
    frames.push(t)
    window.requestAnimationFrame(tick)
  }
  window.requestAnimationFrame(tick)
  setTimeout(() => {
    alive = false
    if (po !== null) po.disconnect()
    const gaps = []
    for (let i = 1; i < frames.length; i++) gaps.push(frames[i] - frames[i - 1])
    gaps.sort((a, b) => a - b)
    const q = (p) => (gaps.length > 0 ? gaps[Math.min(gaps.length - 1, Math.floor(gaps.length * p))] : null)
    resolve({ frameCount: frames.length, gapP50: q(0.5), gapP95: q(0.95), gapMax: gaps.length > 0 ? gaps[gaps.length - 1] : null, gapsOver50: gaps.filter((g) => g > 50).length, gapsOver100: gaps.filter((g) => g > 100).length, avgFps: +(1000 * frames.length / DURATION).toFixed(1), longtasks, longtaskMs: +longtaskMs.toFixed(1) })
  }, DURATION)
})`

async function main() {
  if (!existsSync(join(ROOT, 'out', 'main', 'index.js'))) throw new Error('先 build')
  await mkdir(OUT, { recursive: true })
  const userData = join(tmpdir(), 'synapse-auditb-b4')
  await rm(userData, { recursive: true, force: true })
  app = await electron.launch({ args: ['out/main/index.js'], env: { ...process.env, SYNAPSE_USER_DATA: userData } })
  const win = await app.firstWindow()
  await win.setDefaultTimeout(30_000)
  await win.getByRole('button', { name: '文献库' }).waitFor()
  await win.waitForTimeout(1200) // 库视图渲染静置（首屏懒加载余波出窗）

  // 流光在场断言：ws-trigger 常驻动画名（syn-pan-x）
  R.phases.animState = await win.evaluate(() => {
    const t = document.querySelector('.ws-trigger')
    return t ? { animationName: getComputedStyle(t).animationName, animationDuration: getComputedStyle(t).animationDuration, iterationCount: getComputedStyle(t).animationIterationCount, reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches } : null
  })
  log('流光态', JSON.stringify(R.phases.animState))

  // A 相：流光在场
  R.phases.A_animOn = await win.evaluate(SAMPLE_EXPR)
  log('A 相(流光在场)', JSON.stringify(R.phases.A_animOn))

  // B 相：关流光（运行时 style——animation:none）
  await win.evaluate(() => {
    const t = document.querySelector('.ws-trigger')
    if (t !== null) t.style.animation = 'none'
  })
  await win.waitForTimeout(400)
  R.phases.B_animOff = await win.evaluate(SAMPLE_EXPR)
  R.phases.B_animOffVerify = await win.evaluate(() => {
    const t = document.querySelector('.ws-trigger')
    return t ? getComputedStyle(t).animationName : null
  })
  log('B 相(流光关闭)', JSON.stringify(R.phases.B_animOff), 'verify=', R.phases.B_animOffVerify)

  // 归一：A/B 对照
  const A = R.phases.A_animOn
  const B = R.phases.B_animOff
  R.summary = {
    animOn: R.phases.animState,
    frameCount: { A: A.frameCount, B: B.frameCount },
    gapP50: { A: A.gapP50, B: B.gapP50 },
    gapP95: { A: A.gapP95, B: B.gapP95 },
    gapMax: { A: A.gapMax, B: B.gapMax },
    longtasks: { A: A.longtasks, B: B.longtasks },
    longtaskMs: { A: A.longtaskMs, B: B.longtaskMs },
    frameCountDelta: B.frameCount - A.frameCount,
    verdictHint: A.longtasks === 0 && B.longtasks === 0 ? 'zero-longtask-both' : 'longtask-present'
  }
  await app.close()
  app = null
  writeFileSync(join(OUT, 'b4.json'), JSON.stringify(R, null, 2))
  log('summary', JSON.stringify(R.summary))
}

await main().catch(async (e) => {
  R.error = String(e)
  try { writeFileSync(join(OUT, 'b4.json'), JSON.stringify(R, null, 2)) } catch { /* 原始错误优先 */ }
  console.error('[b4] FAIL', e)
  try { if (app !== null) await app.close() } catch { /* 尽力关 */ }
  process.exit(1)
})
