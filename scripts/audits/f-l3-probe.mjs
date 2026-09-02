/**
 * F-L3 排查探针——保存高亮链滚动漂移分段定位（2026-09-02 B 单元主票）。
 * 现象（f-a3 真机取证副产）：划选→点「高亮」保存前后阅读区滚动容器
 * scrollTop 9971→12113（+2142px≈两屏）。候选源两条（台账 277-290）：
 *   ①Playwright click 的 actionability 滚动（工具面）；②保存链内程序滚动（应用面）。
 * 判别设计=双模式对照：
 *   模式 P（Playwright click）：locator.click()——含 actionability 检查。
 *   模式 M（真鼠标直发）：按钮中心 mouse.move+down+up——跳过 actionability。
 * 分段采样：S0（触发前）→S1（触发返回即采）→S2（+800ms 保存链完成）→
 *   S3（+1500ms 渲染后效）。锚点盒（按钮/页盒）供方向分析。
 * 复现性：click 两轮+mouse 一轮（独立 userData 隔离轮间态）。
 * 进入配方 crib f-a3-verify.mjs：文献库双击第一张卡→等 textLayer span→
 *   程序化拖选（真鼠标插值）→工具条不出现则程序化 Range 兜底。
 * 产物：scripts/audits/f-l3-out/f-l3-probe.json
 */
import { _electron as electron } from '@playwright/test'
import { cp, mkdir, rm } from 'node:fs/promises'
import { existsSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const ROOT = process.cwd()
const OUT = join(ROOT, 'scripts', 'audits', 'f-l3-out')
const R = { meta: { script: 'f-l3-probe.mjs', date: new Date().toISOString() }, rounds: [] }
const log = (...a) => console.log(`[f-l3 ${new Date().toISOString().slice(11, 19)}]`, ...a)

async function freshUserData(tag) {
  const src = join(process.env.APPDATA, 'Synapse')
  const userData = join(tmpdir(), `synapse-f-l3-${tag}`)
  await rm(userData, { recursive: true, force: true })
  for (const p of ['workspaces', 'ai-sensor']) await cp(join(src, p), join(userData, p), { recursive: true })
  for (const f of ['settings.json', 'workspace.json', 'window-state.json']) {
    if (existsSync(join(src, f))) await cp(join(src, f), join(userData, f))
  }
  return userData
}

async function sample(win) {
  return win.evaluate(`(() => {
    const root = document.querySelector('[data-page-root]')
    const scroller = root ? root.closest('.overflow-auto') : null
    const page = document.querySelector('canvas[data-pdf-canvas]')
    return {
      scrollTop: scroller ? scroller.scrollTop : null,
      scrollH: scroller ? scroller.scrollHeight : null,
      clientH: scroller ? scroller.clientHeight : null,
      pageBox: page ? (({ x, y, width, height }) => ({ x, y, width, height }))(page.getBoundingClientRect()) : null,
    }
  })()`)
}

async function selectionState(win) {
  return win.evaluate(`(() => {
    const t = document.querySelector('[data-testid="selection-toolbar"]')
    const sel = getSelection()
    return { present: !!t, visible: !!t && t.getBoundingClientRect().height > 0, selLen: sel && !sel.isCollapsed ? sel.toString().length : 0 }
  })()`)
}

/** 真鼠标拖选（12 步插值——f-a3 同法） */
async function dragSelect(win, x1, y1, x2, y2) {
  await win.mouse.move(x1, y1)
  await win.mouse.down()
  for (let i = 1; i <= 12; i++) {
    await win.waitForTimeout(16)
    await win.mouse.move(x1 + ((x2 - x1) * i) / 12, y1 + ((y2 - y1) * i) / 12)
  }
  await win.mouse.up()
  await win.waitForTimeout(1600)
}

/** 打开文献并滚到中部，返回拖选两端点（f-a3 配方：文本节点 span+scrollIntoView center） */
async function prepSelection(win) {
  if (!(await win.evaluate(() => !!document.querySelector('[data-page-root]')))) {
    await win.getByRole('button', { name: '文献库' }).click()
    await win.waitForTimeout(400)
    await win.locator('.lib-card').first().dblclick()
  }
  await win.waitForSelector('[data-page-root] .textLayer span', { timeout: 20_000 })
  await win.waitForTimeout(800)
  // 滚到文档约 40%（保证漂移有行程）再把目标 span 滚到视口中央
  await win.evaluate(`(() => {
    const root = document.querySelector('[data-page-root]')
    const scroller = root.closest('.overflow-auto')
    if (scroller) scroller.scrollTop = Math.round(scroller.scrollHeight * 0.4)
  })()`)
  await win.waitForTimeout(1200)
  await win.evaluate(`(() => {
    const spans = [...document.querySelectorAll('[data-page-root] .textLayer span')]
      .filter(sp => sp.firstChild && sp.firstChild.nodeType === 3 && sp.textContent.length > 0)
    spans[12]?.scrollIntoView({ block: 'center' })
  })()`)
  await win.waitForTimeout(500)
  return win.evaluate(`(() => {
    const spans = [...document.querySelectorAll('[data-page-root] .textLayer span')]
      .filter(sp => sp.firstChild && sp.firstChild.nodeType === 3 && sp.textContent.length > 0)
    const vis = spans.map((s, i) => ({ i, r: s.getBoundingClientRect() })).filter(o => o.r.y > 140 && o.r.y < innerHeight - 80 && o.r.width > 5)
    if (!vis.length) return null
    const a = vis[0].i
    const b = vis[Math.min(vis.length - 1, 8)].i
    const r1 = spans[a].getBoundingClientRect(), r2 = spans[b].getBoundingClientRect()
    return { a, b, x1: r1.x + r1.width / 2, y1: r1.y + r1.height / 2, x2: r2.x + r2.width * 0.3, y2: r2.y + r2.height / 2, txt: spans[a].textContent.slice(0, 24) }
  })()`)
}

async function round(mode, roundIdx) {
  const userData = await freshUserData('r' + roundIdx)
  const app = await electron.launch({ args: ['out/main/index.js'], env: { ...process.env, SYNAPSE_USER_DATA: userData } })
  try {
    const win = await app.firstWindow()
    const out = { mode, round: roundIdx }
    await win.getByRole('button', { name: '文献库' }).waitFor({ timeout: 20_000 })
    const pts = await prepSelection(win)
    if (!pts) throw new Error('无可划选 span（视口中部）')
    await dragSelect(win, pts.x1, pts.y1, pts.x2, pts.y2)
    let sel = await selectionState(win)
    let fallback = false
    if (!sel.visible) {
      // 程序化 Range 兜底（f-a3 同法）
      await win.evaluate(`(() => {
        const spans = [...document.querySelectorAll('[data-page-root] .textLayer span')]
          .filter(sp => sp.firstChild && sp.firstChild.nodeType === 3 && sp.textContent.length > 0)
        const r = document.createRange()
        r.setStart(spans[${pts.a}].firstChild, 2); r.setEnd(spans[${pts.b}].firstChild, 4)
        const s = getSelection(); s.removeAllRanges(); s.addRange(r)
      })()`)
      await win.waitForSelector('[data-testid="selection-toolbar"]', { timeout: 8000 })
      fallback = true
      sel = await selectionState(win)
    }
    const btnBox = await win.getByRole('button', { name: '高亮' }).boundingBox()
    out.pre = { ...pts, selLen: sel.selLen, fallback, btnBox, S0: await sample(win) }
    // —— 触发保存 ——
    if (mode === 'click') {
      await win.getByRole('button', { name: '高亮' }).click()
    } else {
      await win.mouse.move(btnBox.x + btnBox.width / 2, btnBox.y + btnBox.height / 2)
      await win.mouse.down()
      await win.waitForTimeout(30)
      await win.mouse.up()
    }
    out.S1 = await sample(win)
    await win.waitForTimeout(800)
    out.S2 = await sample(win)
    await win.waitForTimeout(1500)
    out.S3 = await sample(win)
    const d = (a, b) => (a.scrollTop == null || b.scrollTop == null ? null : a.scrollTop - b.scrollTop)
    out.drift = { clickPhase: d(out.S1, out.pre.S0), savePhase: d(out.S2, out.S1), settlePhase: d(out.S3, out.S2), total: d(out.S3, out.pre.S0) }
    log(`round ${roundIdx} [${mode}] drift=${JSON.stringify(out.drift)}`)
    return out
  } finally {
    await app.close()
  }
}

async function main() {
  if (!existsSync(join(ROOT, 'out', 'main', 'index.js'))) throw new Error('先 build')
  await mkdir(OUT, { recursive: true })
  for (const [mode, i] of [['click', 1], ['mouse', 2], ['click', 3]]) {
    R.rounds.push(await round(mode, i))
  }
  writeFileSync(join(OUT, 'f-l3-probe.json'), JSON.stringify(R, null, 1), 'utf8')
  const clickTotal = R.rounds.filter((r) => r.mode === 'click').map((r) => r.drift.total)
  const mouseTotal = R.rounds.filter((r) => r.mode === 'mouse').map((r) => r.drift.total)
  const big = (v) => Math.abs(v ?? 0) > 50
  log(`判别：click 总漂移=${JSON.stringify(clickTotal)} | mouse 总漂移=${JSON.stringify(mouseTotal)}`)
  const verdict = clickTotal.some(big) && mouseTotal.every((v) => !big(v))
    ? '工具面（Playwright actionability）——应用无缺陷，e2e 取证手法修正项'
    : clickTotal.some(big) && mouseTotal.some(big)
      ? '应用面（保存链程序滚动）——F-L3 实锤开修票'
      : '均不漂移——现象不可复现（f-a3 时代取证，可能已被 F-A4/A5/F-V1 渲染改造顺带修复）'
  log('结论：' + verdict)
  R.meta.verdict = verdict
  writeFileSync(join(OUT, 'f-l3-probe.json'), JSON.stringify(R, null, 1), 'utf8')
}

main().catch((e) => {
  console.error('[f-l3] FATAL', e)
  process.exit(1)
})
