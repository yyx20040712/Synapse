/**
 * F-R3 排查票 M2 注入+M3 压力——扫描式连开 pageerror 取证（AUDIT-C 票 C-1，
 * 排查不修）。crib f-a3-verify.mjs 运行模式（真实库副本 freshUserData+
 * Electron launch+真鼠标路径）。
 *
 * 机制背景（UI 路径预判，M1 静态面子代理交叉核验）：
 * ReaderPage.tsx:58 fileUrl 仅 active tab ready 时非空——每次 openPaper 新 tab
 * =loading → fileUrl 变 null → PdfDocProvider 卸载 → 在途 loadingTask.destroy()。
 * 连开序列=每篇切换都落在前一篇 pdfjs 流加载窗口内 destroy（单开零窗口）。
 *
 * 场景：
 * - S0 基线：单开一篇等加载完——断言本阶段零 pageerror（「单开零复现」口径复验）
 * - S1 注入（M2）：快速连开 N 篇（文献库↔卡片双击循环；R3_DELAY_MS 分档参数化）
 *   ——r1/r2 实测：错误集中于 S1（S2 重复开=幂等激活，tab 已 ready 无流窗口）
 * - S2 压力（M3）：**开→加载中关 tab** 循环（R3_CLOSE_MS 参数默认 120ms 落在
 *   流窗口内；关闭=destroy 在途 loadingTask——窗口可无限重复，不依赖新卡片）
 * - S3 健康面：错误（若有）后再单开一篇完整渲染（textLayer span 出现）——区分
 *   「噪声型 pageerror」与「破坏型 pageerror」（应用面是否受损）
 *
 * 捕获面（三路）：win.on('pageerror') + console(type=error) + 注入
 * unhandledrejection 监听（pageerror 只收未捕获异常，promise rejection 走
 * console「Uncaught (in promise)」——三路并收防漏）。
 *
 * 排查票纪律：不断言「连开零错误」（那是结论先行）；PASS 判据=S0 零错误 ∧
 * S3 渲染健康——连开错误计数如实落盘供裁决。
 *
 * 参数（环境变量）：R3_N（连开篇数，默认 6）/R3_DELAY_MS（篇间延迟档，
 * 默认 0）/R3_ROUNDS（S2 轮数，默认 3）/R3_CLOSE_MS（S2 开→关延迟，默认 120）。
 * 产物：scripts/audits/f-r3-out/f-r3-probe.json。
 */
import { _electron as electron } from '@playwright/test'
import { cp, mkdir, rm } from 'node:fs/promises'
import { existsSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const ROOT = process.cwd()
const OUT = join(ROOT, 'scripts', 'audits', 'f-r3-out')
const N = Number(process.env.R3_N ?? 6)
const DELAY = Number(process.env.R3_DELAY_MS ?? 0)
const ROUNDS = Number(process.env.R3_ROUNDS ?? 3)
const CLOSE_MS = Number(process.env.R3_CLOSE_MS ?? 120)
const log = (...a) => console.log(`[f-r3 ${new Date().toISOString().slice(11, 19)}]`, ...a)

const R = {
  meta: {
    script: 'f-r3-probe.mjs',
    date: new Date().toISOString(),
    params: { n: N, delayMs: DELAY, rounds: ROUNDS, closeMs: CLOSE_MS },
    pdfjs: '4.10.38 (package.json invariants-checked)'
  },
  capture: { pageErrors: [], consoleErrors: [], unhandled: [] },
  phases: {}
}

// 当前 open 序号（跨场景单调递增——pageerror 指纹含「第几开后」，定位窗口）
let openSeq = 0

async function main() {
  if (!existsSync(join(ROOT, 'out', 'main', 'index.js'))) throw new Error('先 build')
  await mkdir(OUT, { recursive: true })
  const src = join(process.env.APPDATA, 'Synapse')
  const userData = join(tmpdir(), 'synapse-f-r3-probe')
  await rm(userData, { recursive: true, force: true })
  for (const p of ['workspaces', 'ai-sensor']) await cp(join(src, p), join(userData, p), { recursive: true })
  for (const f of ['settings.json', 'workspace.json', 'window-state.json']) {
    if (existsSync(join(src, f))) await cp(join(src, f), join(userData, f))
  }
  const app = await electron.launch({ args: ['out/main/index.js'], env: { ...process.env, SYNAPSE_USER_DATA: userData } })
  const win = await app.firstWindow()
  await win.getByRole('button', { name: '阅读器' }).waitFor({ timeout: 20_000 })

  // [门二条件①实验] 主进程捕获面：worker 世界 unhandled rejection 不经 renderer
  // DOM 事件（unhandledrejection=0 实证）——应用层过滤器的可能宿主=主进程
  // webContents 事件。经 electronApp.evaluate 在主进程挂 console-message 监听
  // 记录（error 级），探针尾段取回——回答「该层能否收到此错误」。
  await app.evaluate(({ BrowserWindow }) => {
    const rec = { consoleMessages: [] }
    BrowserWindow.getAllWindows().forEach((w) => {
      w.webContents.on('console-message', (_e, level, message, line, sourceId) => {
        // [r7 全级采样] 不按 level 过滤——回答「该错误是否以任何级别到达主进程」
        rec.consoleMessages.push({ level, message: String(message).slice(0, 200), line, sourceId: String(sourceId).slice(-60) })
      })
    })
    globalThis.__mainRec = rec
  })
  const mainRec = async () => app.evaluate(() => globalThis.__mainRec.consoleMessages)

  // 三路捕获：phase 标签随场景推进（pageerror 事件晚到也归当前 phase——事件序即证据）
  let phase = 'boot'
  win.on('pageerror', (e) => {
    R.capture.pageErrors.push({ phase, openSeq, msg: String(e), firstLine: String(e?.stack || '').split('\n')[1] || '' })
    log(`pageerror@${phase}#open${openSeq}:`, String(e).slice(0, 160))
  })
  win.on('console', (m) => {
    if (m.type() === 'error') R.capture.consoleErrors.push({ phase, text: m.text().slice(0, 300) })
  })
  await win.evaluate(() => {
    window.__rej = []
    window.addEventListener('unhandledrejection', (ev) => {
      const r = ev.reason
      window.__rej.push(String(r instanceof Error ? `${r.message}\n${String(r.stack || '').split('\n').slice(1, 3).join('\n')}` : r))
    })
  })

  // 进文献库，枚举卡片（真实库副本的采样面如实登记）
  await win.getByRole('button', { name: '文献库' }).click()
  await win.locator('.lib-card').first().waitFor({ timeout: 10_000 })
  const cardCount = await win.locator('.lib-card').count()
  R.library = { cardCount }
  log('文献库卡片数', cardCount)
  if (cardCount < 3) throw new Error(`卡片数 ${cardCount}<3——连开序列采样面不足（真实库副本文献过少）`)

  const openCard = async (i) => {
    await win.getByRole('button', { name: '文献库' }).click()
    if (DELAY > 0) await win.waitForTimeout(DELAY)
    openSeq += 1
    await win.locator('.lib-card').nth(i % cardCount).dblclick()
  }

  // ── S0 基线：单开一篇等加载完 ──
  phase = 'S0-single-open'
  await win.locator('.lib-card').nth(0).dblclick()
  await win.waitForSelector('[data-page-root] .textLayer span', { timeout: 30_000 })
  await win.waitForTimeout(800)
  R.phases.S0 = {
    rendered: true,
    pageErrors: R.capture.pageErrors.filter((e) => e.phase === phase).length,
    consoleErrors: R.capture.consoleErrors.filter((e) => e.phase === phase).length
  }
  log('S0 单开基线', JSON.stringify(R.phases.S0))

  // ── S1 注入（M2）：快速连开 N 篇（每篇不等加载完——destroy 落在流窗口内为注入形态） ──
  phase = 'S1-rapid-open'
  const t1 = Date.now()
  for (let i = 1; i <= N; i += 1) {
    await openCard(i)
    await win.waitForTimeout(60) // 仅动作节流（Playwright actionability 之外的最小间隙）
  }
  const s1ms = Date.now() - t1
  R.phases.S1 = {
    n: N,
    elapsedMs: s1ms,
    pageErrors: R.capture.pageErrors.filter((e) => e.phase === phase).length,
    consoleErrors: R.capture.consoleErrors.filter((e) => e.phase === phase).length,
    msgSamples: [...new Set(R.capture.pageErrors.filter((e) => e.phase === phase).map((e) => e.msg))].slice(0, 5)
  }
  log('S1 快速连开', JSON.stringify(R.phases.S1))

  // ── S1b 单次切换净测（门二条件②）：已加载 A→开 B 一次→静置等待 ──
  // （区别于 S1 连开：无后续开/关动作，排除跨动作归因模糊；R3_SINGLE_WAIT_MS 静置）
  if (process.env.R3_SINGLE_SWITCH === '1') {
    phase = 'S1b-single-switch'
    // 回到已加载态：开 card0 等渲染完（若 S1 已让 card0 tab ready 则为激活）
    await openCard(0)
    await win.waitForSelector('[data-page-root] .textLayer span', { timeout: 30_000 })
    await win.waitForTimeout(800)
    const beforePE = R.capture.pageErrors.length
    await openCard(1) // 已加载 A(card0) → 开 B(card1) 单次切换
    await win.waitForTimeout(Number(process.env.R3_SINGLE_WAIT_MS ?? 5000))
    R.phases.S1b = {
      pageErrors: R.capture.pageErrors.length - beforePE,
      errors: R.capture.pageErrors.slice(beforePE).map((e) => ({ msg: e.msg, openSeq: e.openSeq }))
    }
    log('S1b 单次切换净测', JSON.stringify(R.phases.S1b))
  }

  // ── S2 压力（M3）：开→加载中关 tab 循环——关闭=destroy 在途 loadingTask，
  //    窗口不依赖新卡片（同卡片可反复：关掉后重开=新 loadingTask） ──
  phase = 'S2-open-close'
  const t2 = Date.now()
  let closeFail = 0
  for (let r = 0; r < ROUNDS; r += 1) {
    for (let i = 0; i < N; i += 1) {
      await openCard(i)
      await win.waitForTimeout(CLOSE_MS) // 落在流加载窗口内（分档参数）
      // 关闭刚开的 tab（激活 tab 的关闭叉；confirmCloseDirty 仅 dirty tab 弹窗——加载态不脏）
      const closeBtn = win.locator('[aria-label^="关闭"]').last()
      if (await closeBtn.count() > 0) {
        await closeBtn.click().catch(() => {
          closeFail += 1
        })
      } else {
        closeFail += 1
      }
    }
  }
  R.phases.S2 = {
    mode: `open→${CLOSE_MS}ms→closeTab`,
    rounds: ROUNDS,
    cycles: ROUNDS * N,
    closeFail,
    elapsedMs: Date.now() - t2,
    pageErrors: R.capture.pageErrors.filter((e) => e.phase === phase).length,
    consoleErrors: R.capture.consoleErrors.filter((e) => e.phase === phase).length
  }
  log('S2 开关循环', JSON.stringify(R.phases.S2))

  // ── S3 健康面：错误（若有）后单开完整渲染 ──
  phase = 'S3-health'
  await openCard(0)
  await win.waitForSelector('[data-page-root] .textLayer span', { timeout: 30_000 })
  const spanCount = await win.locator('[data-page-root] .textLayer span').count()
  R.phases.S3 = {
    rendered: spanCount > 0,
    spanCount,
    pageErrors: R.capture.pageErrors.filter((e) => e.phase === phase).length
  }
  log('S3 健康面', JSON.stringify(R.phases.S3))

  R.capture.unhandled = await win.evaluate(() => window.__rej)
  // [门二条件①] 主进程捕获面取回（console-message error 级——过滤器宿主实验）
  R.capture.mainConsole = await mainRec()
  // 全程指纹汇总（跨 phase 去重消息——「同值指纹」=M3 判据底座）
  R.fingerprint = {
    pageErrorMessages: Object.entries(
      R.capture.pageErrors.reduce((acc, e) => {
        const k = e.msg.slice(0, 120)
        acc[k] = (acc[k] ?? 0) + 1
        return acc
      }, {})
    ).map(([msg, count]) => ({ msg, count })),
    consoleErrorSamples: [...new Set(R.capture.consoleErrors.map((e) => e.text))].slice(0, 8),
    unhandledCount: R.capture.unhandled.length
  }
  await win.screenshot({ path: join(OUT, 'f-r3-final.png') })
  await app.close()

  writeFileSync(join(OUT, 'f-r3-probe.json'), JSON.stringify(R, null, 2))
  // [门二 W3] 单文件覆盖改并行留存：R3_TAG 置则另存带标签副本（历史轮栈可追溯）
  if (process.env.R3_TAG) writeFileSync(join(OUT, `f-r3-probe-${process.env.R3_TAG}.json`), JSON.stringify(R, null, 2))
  const totalPE = R.capture.pageErrors.length
  const s1b = R.phases.S1b ? ` | S1b 单次切换=${R.phases.S1b.pageErrors} err` : ''
  console.log(`F-R3 PROBE: S0=${R.phases.S0.pageErrors} err | S1=${R.phases.S1.pageErrors} err(${N} 开/${s1ms}ms)${s1b} | S2=${R.phases.S2.pageErrors} err(${ROUNDS * N} 开关循环/closeFail=${R.phases.S2.closeFail}) | S3 health=${R.phases.S3.rendered ? 'OK' : 'BROKEN'} | 总 pageerror=${totalPE} / unhandled=${R.capture.unhandled.length} / 主进程 console-error=${R.capture.mainConsole.length}`)
  const pass = R.phases.S0.pageErrors === 0 && R.phases.S3.rendered
  if (!pass) process.exit(2)
}

await main().catch((e) => {
  R.error = String(e?.stack || e)
  try {
    writeFileSync(join(OUT, 'f-r3-probe.json'), JSON.stringify(R, null, 2))
  } catch {
    /* 产物目录缺失——原始错误优先 */
  }
  console.error(R.error)
  process.exit(1)
})
