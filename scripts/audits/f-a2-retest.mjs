/**
 * F-A2 复测——划选后工具条是否弹出(真鼠标路径,非程序化选区)。
 * 候选根因①F-A1 重叠块吞 mouseup 命中——F-A1 落地后先复测;
 * 场景分两档:干净面(无既有标注覆盖)拖选 / 既有标注邻近区拖选。
 * 在档坑:合成事件须视口内落点(v7 出窗 mouseup 丢失)+y>120 避 chrome 遮蔽。
 * 产物:audit0-out/f-a2-retest.json
 */
import { _electron as electron } from '@playwright/test'
import { cp, mkdir, rm } from 'node:fs/promises'
import { existsSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const ROOT = process.cwd()
const OUT = join(ROOT, 'scripts', 'audits', 'audit0-out')
const R = { meta: { script: 'f-a2-retest.mjs', date: new Date().toISOString() }, scenarios: {} }
const log = (...a) => console.log(`[f-a2 ${new Date().toISOString().slice(11, 19)}]`, ...a)

async function main() {
  if (!existsSync(join(ROOT, 'out', 'main', 'index.js'))) throw new Error('先 build')
  await mkdir(OUT, { recursive: true })
  const src = join(process.env.APPDATA, 'Synapse')
  const userData = join(tmpdir(), 'synapse-f-a2-retest')
  await rm(userData, { recursive: true, force: true })
  for (const p of ['workspaces', 'ai-sensor']) await cp(join(src, p), join(userData, p), { recursive: true })
  for (const f of ['settings.json', 'workspace.json', 'window-state.json']) {
    if (existsSync(join(src, f))) await cp(join(src, f), join(userData, f))
  }
  const app = await electron.launch({ args: ['out/main/index.js'], env: { ...process.env, SYNAPSE_USER_DATA: userData } })
  const win = await app.firstWindow()
  await win.getByRole('button', { name: '阅读器' }).waitFor({ timeout: 20_000 })
  await win.waitForTimeout(600)
  if (!(await win.evaluate(() => !!document.querySelector('[data-page-root]')))) {
    await win.getByRole('button', { name: '文献库' }).click()
    await win.waitForTimeout(400)
    await win.locator('.lib-card').first().dblclick()
  }
  await win.waitForSelector('[data-page-root] .textLayer span', { timeout: 20_000 })
  await win.waitForTimeout(800)

  // 视口保障:滚到文本层中部,采样两个跨 ~8 span 的起止点(视口内+y>120)
  await win.evaluate(`(() => {
    const spans = [...document.querySelectorAll('[data-page-root] .textLayer span')]
      .filter(sp => sp.firstChild && sp.firstChild.nodeType === 3 && sp.textContent.length > 0)
    spans[8]?.scrollIntoView({ block: 'center' })
  })()`)
  await win.waitForTimeout(400)
  const inView = await win.evaluate(`(() => {
    const spans = [...document.querySelectorAll('[data-page-root] .textLayer span')]
      .filter(sp => sp.firstChild && sp.firstChild.nodeType === 3 && sp.textContent.length > 0)
    const vis = spans.map((s, i) => ({ i, r: s.getBoundingClientRect() })).filter(o => o.r.y > 120 && o.r.y < 700 && o.r.width > 5)
    return { n: vis.length, first: vis[0]?.i, last: vis[Math.min(vis.length - 1, 9)]?.i }
  })()`)
  log('可见 span 采样', JSON.stringify(inView))
  const a = Math.max(0, inView.first ?? 4)
  const b = inView.last ?? Math.min(a + 8, inView.n - 1)

  // 场景 1:干净面真鼠标拖选(先确认此区无既有标注 rect 覆盖起点)
  const coverA = await win.evaluate(`(() => {
    const spans = [...document.querySelectorAll('[data-page-root] .textLayer span')].filter(sp => sp.firstChild)
    const r = spans[${a}]?.getBoundingClientRect(); if (!r) return true
    const c = { x: r.x + r.width / 2, y: r.y + r.height / 2 }
    return [...document.querySelectorAll('[data-testid="annotation-rect"]')].some(e => { const b2 = e.getBoundingClientRect(); return c.x >= b2.x && c.x <= b2.right && c.y >= b2.y && c.y <= b2.bottom })
  })()`)
  const q1a = await win.evaluate(`(() => {
    const spans = [...document.querySelectorAll('[data-page-root] .textLayer span')].filter(sp => sp.firstChild && sp.firstChild.nodeType === 3)
    const r1 = spans[${a}].getBoundingClientRect(), r2 = spans[${b}].getBoundingClientRect()
    return { x1: r1.x + r1.width / 2, y1: r1.y + r1.height / 2, x2: r2.x + r2.width * 0.3, y2: r2.y + r2.height / 2 }
  })()`)
  await win.mouse.move(q1a.x1, q1a.y1)
  await win.mouse.down()
  for (let i = 1; i <= 12; i++) {
    await win.waitForTimeout(16)
    await win.mouse.move(q1a.x1 + ((q1a.x2 - q1a.x1) * i) / 12, q1a.y1 + ((q1a.y2 - q1a.y1) * i) / 12)
  }
  await win.mouse.up()
  await win.waitForTimeout(1600)
  const toolbar1 = await win.evaluate(`(() => {
    const t = document.querySelector('[data-testid="selection-toolbar"]')
    const sel = getSelection()
    return { present: !!t, visible: !!t && t.getBoundingClientRect().height > 0, selLen: sel && !sel.isCollapsed ? sel.toString().length : 0 }
  })()`)
  R.scenarios.clean = { coveredStart: coverA, drag: q1a, ...toolbar1 }
  log('场景1 干净面', JSON.stringify(R.scenarios.clean))

  // 场景 1 产物:若出条,点高亮落一条标注(为场景 2 制造「既有标注区」);不出条则手工落一条程序化
  if (toolbar1.present) {
    await win.getByRole('button', { name: '高亮' }).click().catch(() => {})
  } else {
    await win.evaluate(`(() => {
      const spans = [...document.querySelectorAll('[data-page-root] .textLayer span')].filter(sp => sp.firstChild && sp.firstChild.nodeType === 3)
      const r = document.createRange()
      r.setStart(spans[${a}].firstChild, 2); r.setEnd(spans[${b}].firstChild, 4)
      const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r)
    })()`)
    await win.waitForSelector('[data-testid="selection-toolbar"]', { timeout: 8000 })
    await win.getByRole('button', { name: '高亮' }).click()
  }
  await win.waitForTimeout(900)

  // 场景 2:先把标注块滚进视口,再取「起点直接压在标注块上」的真鼠标拖选
  // ——候选根因①直测(mousedown 落在 pointerEvents:auto 的标注矩形上,能否成选+出条)
  await win.evaluate(`(() => {
    const el = [...document.querySelectorAll('[data-testid="annotation-rect"]')].find(e => e.getBoundingClientRect().width > 5)
    el?.scrollIntoView({ block: 'center' })
  })()`)
  await win.waitForTimeout(500)
  const q2 = await win.evaluate(`(() => {
    const els = [...document.querySelectorAll('[data-testid="annotation-rect"]')].filter(e => e.getBoundingClientRect().width > 5)
    // 取一个整体在视口内(y 120~700)的标注块作压点
    const target = els.map(e => e.getBoundingClientRect()).find(r => r.y > 140 && r.bottom < 680 && r.width > 20 && r.width < 400)
    if (!target) return null
    // 终点:同页下一行 span 中心(视口内)
    const spans = [...document.querySelectorAll('[data-page-root] .textLayer span')].filter(sp => sp.firstChild && sp.firstChild.nodeType === 3)
    const end = spans.map(s => s.getBoundingClientRect()).find(r => r.y > target.bottom + 2 && r.y > 120 && r.bottom < 700 && r.width > 5)
    if (!end) return null
    return { x1: target.x + Math.min(30, target.width / 2), y1: target.y + target.height / 2, x2: end.x + end.width * 0.5, y2: end.y + end.height / 2, onRect: true }
  })()`)
  if (q2 !== null) {
    await win.mouse.move(q2.x1, q2.y1)
    await win.mouse.down()
    for (let i = 1; i <= 12; i++) {
      await win.waitForTimeout(16)
      await win.mouse.move(q2.x1 + ((q2.x2 - q2.x1) * i) / 12, q2.y1 + ((q2.y2 - q2.y1) * i) / 12)
    }
    await win.mouse.up()
    await win.waitForTimeout(1600)
    const toolbar2 = await win.evaluate(`(() => {
      const t = document.querySelector('[data-testid="selection-toolbar"]')
      const sel = getSelection()
      return { present: !!t, visible: !!t && t.getBoundingClientRect().height > 0, selLen: sel && !sel.isCollapsed ? sel.toString().length : 0 }
    })()`)
    R.scenarios.nearAnnotation = { drag: q2, ...toolbar2 }
    log('场景2 标注邻近区', JSON.stringify(R.scenarios.nearAnnotation))
  } else {
    R.scenarios.nearAnnotation = { skipped: '无可测标注块' }
  }
  await win.screenshot({ path: join(OUT, 'f-a2-final-state.png') })
  await app.close()
  writeFileSync(join(OUT, 'f-a2-retest.json'), JSON.stringify(R, null, 2))
  const clean = R.scenarios.clean
  console.log(`F-A2 RETEST: clean=${clean.present ? 'POP' : 'NO-POP'} near=${R.scenarios.nearAnnotation.present === undefined ? 'skip' : R.scenarios.nearAnnotation.present ? 'POP' : 'NO-POP'}`)
}

await main().catch((e) => { console.error(e); process.exit(1) })
