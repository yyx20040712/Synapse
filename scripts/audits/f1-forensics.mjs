/**
 * F1 划选修正役·真机取证脚本（2026-08-29 主控直做——LOOP v2 §2F1「票面前必做」）
 *
 * 用法：export PATH="/d/nodejs24:$PATH" && node scripts/audits/f1-forensics.mjs
 * 前置：npm run build 已绿（out/main/index.js 在场）；真实 userData 存在。
 *
 * 取证面（对应交接 §2F1 取证步骤）：
 *  ①页面密度统计（span 数/字符数——O(n) 遍历成本的输入规模）
 *  ②分因子计时：TreeWalker 全遍历 / 双 probe.toString（selectionToAnchor 同型
 *    DOM 操作，页内实测）/ 程序化选选→自绘层入 DOM（防抖路径 200ms+evaluate+
 *    React commit）/ 真实鼠标拖选（mouseup 路径）+ longtask 观测
 *  ③六形态截图：单词/跨行/大段/拖选中途持按/与标注重叠/缩放 150%
 *  ④R1 视觉模拟 A/B：注入原生半透明 ::selection+隐藏自绘层，同形态截图对照
 *
 * 产物：scripts/audits/f1-out/{f1-forensics.json, *.png}
 * 纪律：只读真实数据（整体复制到临时目录后挂 SYNAPSE_USER_DATA）；不动仓库源码。
 * 版本：r2——修 r1 三缺陷（拖选观测 arm 自锁死/无兜底 Promise 永悬/文献打开无容错）；
 *       页内 Promise 一律 6s 兜底；清理走 Escape（React 正常卸载，不手删 DOM）。
 */
import { _electron as electron } from '@playwright/test'
import { cp, mkdir, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const ROOT = process.cwd()
const OUT = join(ROOT, 'scripts', 'audits', 'f1-out')
const REALUserData = join(process.env.APPDATA, 'Synapse Remake')
const results = { env: {}, pageStats: {}, factors: {}, progLatency: {}, mouse: {}, notes: [] }
/** 失败兜底关 app（r2b：失败不关→electron 残留进程挂住脚本退出） */
let appRef = null

function log(...a) { console.log(`[f1 ${new Date().toISOString().slice(11, 19)}]`, ...a) }

/** 页内通用：可见页的文本 span 列表（带非空文本节点）；Escape 清 pending（React 正常卸载） */
const PAGE_HELPERS = `
  const f1spans = () => [...document.querySelectorAll('[data-page-root] .textLayer span')]
    .filter(s => s.firstChild && s.firstChild.nodeType === 3 && s.textContent.length > 0)
  const f1clear = () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    getSelection().removeAllRanges()
  }
`

/** 页内 Promise 兜底：6s 未达成按 timeout 解析（防永悬——r1 事故修正） */
const RACE_TIMEOUT = `;(function(){ const t = setTimeout(() => resolve({ timeout: true }), 6000) ;
  const origResolve = resolve ; resolve = (v) => { clearTimeout(t) ; origResolve(v) } })()`

async function main() {
  if (!existsSync(join(ROOT, 'out', 'main', 'index.js'))) throw new Error('先 npm run build')
  if (!existsSync(REALUserData)) throw new Error('真实 userData 不存在：' + REALUserData)
  await rm(OUT, { recursive: true, force: true })
  await mkdir(OUT, { recursive: true })
  const userData = join(tmpdir(), 'synapse-f1-forensics')
  await rm(userData, { recursive: true, force: true })
  log('复制真实 userData →', userData)
  await cp(REALUserData, userData, { recursive: true })

  const app = await electron.launch({
    args: ['out/main/index.js'],
    env: { ...process.env, SYNAPSE_USER_DATA: userData }
  })
  appRef = app
  const win = await app.firstWindow()
  await win.setDefaultTimeout(20_000)
  await win.getByRole('button', { name: '文献库' }).click()
  // 逐卡尝试打开文献：文本层 span≥20 才算适格素材（防首卡为扫描封面）
  const cards = await win.locator('.lib-card').count()
  log('库卡片数', cards)
  let opened = false
  for (let i = 0; i < Math.min(cards, 3) && !opened; i++) {
    await win.locator('.lib-card').nth(i).dblclick()
    try {
      await win.waitForSelector('[data-page-column="ready"]', { timeout: 15_000 })
      await win.waitForFunction(() => document.querySelectorAll('[data-page-root] .textLayer span').length >= 20, null, { timeout: 25_000 })
      opened = true
    } catch {
      log(`第 ${i + 1} 卡不适格（无文本层），关闭重试`)
      await win.getByRole('button', { name: '关闭标签页', exact: false }).first().click().catch(() => {})
      await win.getByRole('button', { name: '文献库' }).click()
    }
  }
  if (!opened) throw new Error('前三卡均无文本层——取证素材不适格')
  await win.waitForTimeout(1200) // 文本层/标注层重锚稳定
  results.env.window = { w: win.viewportSize()?.width, h: win.viewportSize()?.height }

  // ①页面密度统计
  results.pageStats = await win.evaluate(`(() => {
    ${PAGE_HELPERS}
    const pages = [...document.querySelectorAll('[data-page-root]')].map(r => ({
      no: r.getAttribute('data-page-root'),
      spans: r.querySelectorAll('.textLayer span').length,
      chars: r.textContent.length
    }))
    return { pages, totalSpans: f1spans().length }
  })()`)
  log('pageStats', JSON.stringify(results.pageStats))

  // longtask 观测（全程）
  await win.evaluate(`(() => {
    window.__f1LT = []
    new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__f1LT.push(Math.round(e.duration)) })
      .observe({ entryTypes: ['longtask'] })
  })()`)

  // ②分因子计时：TreeWalker 遍历 + 双 probe + getClientRects（selectionToAnchor 同型操作，10 轮取中位）
  results.factors = await win.evaluate(`(() => {
    ${PAGE_HELPERS}
    const tl = document.querySelector('[data-page-root] .textLayer')
    const med = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)] }
    const walks = [], probes = [], rectss = []
    for (let i = 0; i < 10; i++) {
      let t0 = performance.now()
      const walker = document.createTreeWalker(tl, NodeFilter.SHOW_TEXT)
      let n = 0
      while (walker.nextNode()) n++
      walks.push(performance.now() - t0)
      const spans = f1spans()
      const first = spans[0].firstChild, last = spans[spans.length - 1].firstChild
      t0 = performance.now()
      const p1 = document.createRange(); p1.selectNodeContents(tl); p1.setEnd(first, 2)
      const p2 = document.createRange(); p2.selectNodeContents(tl); p2.setStart(last, 1)
      const l1 = p1.toString().length, l2 = p2.toString().length
      probes.push(performance.now() - t0)
      t0 = performance.now()
      const r = document.createRange()
      r.setStart(spans[Math.floor(spans.length * 0.3)].firstChild, 0)
      const mid = spans[Math.floor(spans.length * 0.7)].firstChild
      r.setEnd(mid, Math.min(5, mid.data.length)) // 短 span clamp——r2b：offset 越界事故
      const rc = r.getClientRects().length
      rectss.push(performance.now() - t0)
      if (i === 0) window.__f1probeLen = [l1, l2, rc]
    }
    return { walkMs: +med(walks).toFixed(2), probeMs: +med(probes).toFixed(2), clientRectsMs: +med(rectss).toFixed(2), probeSample: window.__f1probeLen }
  })()`)
  log('factors', JSON.stringify(results.factors))

  // ③程序化选选延迟（防抖路径）：单词/中段跨行/大段 ×5 轮（6s 兜底防永悬）
  const measureProg = async (name, fromFrac, toFrac) => {
    const rounds = []
    for (let i = 0; i < 5; i++) {
      const r = await win.evaluate(`new Promise((resolve) => {
        ${RACE_TIMEOUT}
        ${PAGE_HELPERS}
        const spans = f1spans()
        const a = spans[Math.floor(spans.length * ${fromFrac})]
        const b = spans[Math.floor(spans.length * ${toFrac})]
        if (!a || !b) { resolve({ err: 'span 缺席' }); return }
        const t0 = performance.now()
        const obs = new MutationObserver(() => {
          if (document.querySelector('[data-testid="selection-rect"]')) {
            obs.disconnect()
            requestAnimationFrame(() => resolve({ t0, tDom: performance.now(), selLen: getSelection().toString().length }))
          }
        })
        obs.observe(document.body, { childList: true, subtree: true })
        const r = document.createRange()
        r.setStart(a.firstChild, 0); r.setEnd(b.firstChild, Math.min(5, b.firstChild.data.length))
        const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r)
      })`)
      if (r.err || r.timeout) { rounds.push(r); break }
      rounds.push(+((r.tDom - r.t0).toFixed(1)))
      await win.evaluate(`(() => { ${PAGE_HELPERS} f1clear() })()`)
      await win.waitForTimeout(350)
    }
    const nums = rounds.filter((x) => typeof x === 'number')
    results.progLatency[name] = nums.length
      ? { rounds, min: Math.min(...nums), med: nums.sort((a, b) => a - b)[Math.floor(nums.length / 2)], max: Math.max(...nums) }
      : { rounds, fail: true }
    log('progLatency', name, JSON.stringify(results.progLatency[name]))
  }
  await measureProg('word', 0.50, 0.50)
  await measureProg('crossLine', 0.40, 0.45)
  await measureProg('large', 0.15, 0.85)

  // ④真实鼠标拖选（mouseup 路径）+ 拖选中途持按截图
  // r2 修正：arm 立即返回（mouseup 回调只写全局——r1 在此 await 事件 Promise 自锁死）
  const pts = await win.evaluate(`(() => {
    ${PAGE_HELPERS}
    const spans = f1spans()
    const a = spans[Math.floor(spans.length * 0.55)], b = spans[Math.floor(spans.length * 0.62)]
    const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect()
    return { x1: Math.round(ra.x + 2), y1: Math.round(ra.y + ra.height / 2), x2: Math.round(rb.x + rb.width - 2), y2: Math.round(rb.y + rb.height / 2) }
  })()`)
  await win.evaluate(`(() => {
    window.__f1drag = { up: null, dom: null }
    document.addEventListener('mouseup', () => {
      window.__f1drag.up = performance.now()
      const obs = new MutationObserver(() => {
        if (document.querySelector('[data-testid="selection-rect"]')) {
          obs.disconnect(); window.__f1drag.dom = performance.now()
        }
      })
      obs.observe(document.body, { childList: true, subtree: true })
    }, { once: true })
  })()`)
  await win.mouse.move(pts.x1, pts.y1)
  await win.mouse.down()
  await win.mouse.move(pts.x2, pts.y2, { steps: 12 })
  await win.waitForTimeout(600) // 静止持按——防抖应触发 evaluate（拖选中途的“停顿”反馈）
  results.mouse.duringHoldRects = await win.evaluate(`document.querySelector('[data-testid="selection-rect"]') !== null`)
  await win.screenshot({ path: join(OUT, 'S4-drag-hold.png') })
  await win.mouse.move(Math.round((pts.x1 + pts.x2) / 2), pts.y2 + 8, { steps: 4 })
  await win.mouse.up()
  await win.waitForTimeout(1500)
  results.mouse.upToDomMs = await win.evaluate(`window.__f1drag.dom !== null && window.__f1drag.up !== null ? +(window.__f1drag.dom - window.__f1drag.up).toFixed(1) : null`)
  await win.screenshot({ path: join(OUT, 'S3-after-mouseup.png') })
  results.mouse.longtasksDuringDrag = await win.evaluate(`window.__f1LT`)
  log('mouse', JSON.stringify(results.mouse))

  // ⑤形态截图（程序化选选——每轮 Escape 清理走 React）
  const shotSelect = async (name, fromFrac, toFrac) => {
    await win.evaluate(`(() => {
      ${PAGE_HELPERS}
      f1clear()
      const spans = f1spans()
      const a = spans[Math.floor(spans.length * ${fromFrac})], b = spans[Math.floor(spans.length * ${toFrac})]
      const r = document.createRange()
      r.setStart(a.firstChild, 0); r.setEnd(b.firstChild, Math.min(5, b.firstChild.data.length))
      const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r)
    })()`)
    // R1 模拟下自绘层被 display:none——等待一律 attached 态（visible 会永等）
    await win.waitForSelector('[data-testid="selection-rect"]', { timeout: 8_000, state: 'attached' })
    await win.waitForTimeout(150)
    await win.screenshot({ path: join(OUT, name) })
    await win.evaluate(`(() => { ${PAGE_HELPERS} f1clear() })()`)
    await win.waitForTimeout(300)
  }
  await shotSelect('S1-word.png', 0.50, 0.50)
  await shotSelect('S2-crossline.png', 0.40, 0.46)

  // ⑥与标注重叠：程序化选段落→高亮落库→重选同段
  await win.evaluate(`(() => {
    ${PAGE_HELPERS}
    f1clear()
    const spans = f1spans()
    const a = spans[Math.floor(spans.length * 0.40)], b = spans[Math.floor(spans.length * 0.46)]
    const r = document.createRange()
    r.setStart(a.firstChild, 0); r.setEnd(b.firstChild, Math.min(5, b.firstChild.data.length))
    const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r)
  })()`)
  await win.getByTestId('selection-toolbar').getByRole('button', { name: '高亮' }).click()
  await win.waitForTimeout(800)
  await shotSelect('S5-annot-overlap.png', 0.40, 0.46)

  // ⑦缩放 150%（zoom-label 父容器的第 2 个按钮=＋，×5 次）
  for (let i = 0; i < 5; i++) {
    await win.evaluate(`document.querySelector('[data-testid="zoom-label"]').parentElement.querySelectorAll('button').item(1).click()`)
    await win.waitForTimeout(120)
  }
  await win.waitForTimeout(1000)
  await shotSelect('S6-zoom150.png', 0.40, 0.46)

  // ⑧R1 视觉模拟：原生半透明 ::selection + 隐藏自绘层（A/B 对照同三形态）
  await win.addStyleTag({ content: '.textLayer ::selection { background: rgba(0,0,255,0.25) !important } [data-testid="selection-rects"] { display: none !important }' })
  await shotSelect('R1a-word.png', 0.50, 0.50)
  await shotSelect('R1b-crossline.png', 0.40, 0.46)
  await shotSelect('R1c-large.png', 0.15, 0.85)
  results.r1Sim = { injected: true }

  results.longtasksTotal = await win.evaluate(`window.__f1LT`)
  await writeFile(join(OUT, 'f1-forensics.json'), JSON.stringify(results, null, 2), 'utf8')
  await app.close()
  log('完成：产物在', OUT)
}

main().catch(async (e) => {
  console.error('[f1] FAIL', e)
  process.exitCode = 1
  try { await writeFile(join(OUT, 'f1-forensics.json'), JSON.stringify(results, null, 2), 'utf8') } catch { /* 尽力留档 */ }
  try { await appRef?.close() } catch { /* 尽力清理 */ }
})

