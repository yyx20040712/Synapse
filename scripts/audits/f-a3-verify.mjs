/**
 * F-A3 真机取证——选择模式三场景（crib f-a2-retest.mjs：真实库副本
 * freshUserData+Electron launch+真鼠标 CDP）。
 * 场景 A（负向对照）：常规模式，起点压在既有标注 rect 上的真鼠标拖选→
 *   selLen=0+无工具条（现状保持，不回归）。
 * 场景 B（F-A2 根治）：点「选择模式」→aria-pressed=true+全 annotation-rect
 *   计算样式 pointer-events:none→同点位真鼠标拖选→selLen>0+selection-toolbar
 *   出现→点「高亮」→rect 计数+1。
 * 场景 C（现状不破）：切回常规→pointer-events 恢复 auto→点击标注→
 *   annotation-menu 出现。
 * 在档坑（f-a2 实证）：视口内落点+y>120 避 chrome 遮蔽；滚块进视口。
 * 产物：scripts/audits/f-a3-out/f-a3-verify.json（raw log 另落
 * f-a3-verify-probe.raw.txt——由调用侧 tee）。
 */
import { _electron as electron } from '@playwright/test'
import { cp, mkdir, rm } from 'node:fs/promises'
import { existsSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const ROOT = process.cwd()
const OUT = join(ROOT, 'scripts', 'audits', 'f-a3-out')
const R = { meta: { script: 'f-a3-verify.mjs', date: new Date().toISOString() }, scenarios: {} }
const log = (...a) => console.log(`[f-a3 ${new Date().toISOString().slice(11, 19)}]`, ...a)

/** 真鼠标拖选（12 步插值—— crib f-a2 场景手法） */
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

/** 选区+工具条状态采样 */
async function selectionState(win) {
  return win.evaluate(`(() => {
    const t = document.querySelector('[data-testid="selection-toolbar"]')
    const sel = getSelection()
    return { present: !!t, visible: !!t && t.getBoundingClientRect().height > 0, selLen: sel && !sel.isCollapsed ? sel.toString().length : 0 }
  })()`)
}

async function main() {
  if (!existsSync(join(ROOT, 'out', 'main', 'index.js'))) throw new Error('先 build')
  await mkdir(OUT, { recursive: true })
  const src = join(process.env.APPDATA, 'Synapse')
  const userData = join(tmpdir(), 'synapse-f-a3-verify')
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

  // 前置：制造一条既有标注（干净面真鼠标拖选→高亮；不出条则程序化兜底）
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
  const b = inView.last ?? Math.min(a + 8, Math.max(inView.n - 1, a))
  const cleanPts = await win.evaluate(`(() => {
    const spans = [...document.querySelectorAll('[data-page-root] .textLayer span')].filter(sp => sp.firstChild && sp.firstChild.nodeType === 3)
    const r1 = spans[${a}].getBoundingClientRect(), r2 = spans[${b}].getBoundingClientRect()
    return { x1: r1.x + r1.width / 2, y1: r1.y + r1.height / 2, x2: r2.x + r2.width * 0.3, y2: r2.y + r2.height / 2 }
  })()`)
  await dragSelect(win, cleanPts.x1, cleanPts.y1, cleanPts.x2, cleanPts.y2)
  const preState = await selectionState(win)
  R.prep = { drag: cleanPts, ...preState }
  log('前置干净面拖选', JSON.stringify(R.prep))
  if (preState.present) {
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

  // 既有标注块滚进视口,取「整体在视口内的标注块」作压点(场景 A/B 同点位)
  await win.evaluate(`(() => {
    const el = [...document.querySelectorAll('[data-testid="annotation-rect"]')].find(e => e.getBoundingClientRect().width > 5)
    el?.scrollIntoView({ block: 'center' })
  })()`)
  await win.waitForTimeout(500)
  const qA = await win.evaluate(`(() => {
    const els = [...document.querySelectorAll('[data-testid="annotation-rect"]')].filter(e => e.getBoundingClientRect().width > 5)
    const boxes = els.map(e => e.getBoundingClientRect()).filter(r => r.y > 140 && r.bottom < 680 && r.width > 20 && r.width < 400)
    const spans = [...document.querySelectorAll('[data-page-root] .textLayer span')]
      .filter(sp => sp.firstChild && sp.firstChild.nodeType === 3 && (sp.textContent || '').length > 0)
      .map(sp => sp.getBoundingClientRect())
    // 压点=标注块×非空文本 span 交叠区中心:该点既压块(负向对照语义)又必落
    // 实文本上(空 span 上浏览器无法锚定选区,拖选不成——且常规模式下
    // elementFromPoint 返回 rect 本身不可扫描,故用几何求交,切模式前可算)
    let down = null
    let target = null
    for (const r of boxes) {
      const s = spans.find(sr => sr.width > 5 && sr.y < r.bottom && sr.bottom > r.y && sr.x < r.right && sr.right > r.x)
      if (s !== undefined) {
        target = r
        down = {
          x: (Math.max(r.x, s.x) + Math.min(r.right, s.right)) / 2,
          y: (Math.max(r.y, s.y) + Math.min(r.bottom, s.bottom)) / 2
        }
        break
      }
    }
    if (down === null) return null
    // 终点距压点纵向 ≥40px(下方 2~3 行):拖选位移不足则选区不成——A/B 同点位
    // 同距离,唯一变量=模式(f-a2 场景2 的紧邻行终点距离 ~17px 不足以成选,实证)
    const end = spans.find(r => r.y > target.bottom + 40 && r.y > 120 && r.bottom < 700 && r.width > 5)
    if (end === undefined) return null
    return { x1: down.x, y1: down.y, x2: end.x + end.width * 0.5, y2: end.y + end.height / 2, onRect: true }
  })()`)
  if (qA === null) throw new Error('无可测标注块(场景前提不成立)')

  // 场景 A:常规模式,压点拖选(负向对照:selLen=0+无工具条)
  await dragSelect(win, qA.x1, qA.y1, qA.x2, qA.y2)
  R.scenarios.A_normalOnRect = { drag: qA, ...(await selectionState(win)) }
  log('场景A 常规压点拖选', JSON.stringify(R.scenarios.A_normalOnRect))

  // 场景 B:切选择模式→断言按钮态+全 rect 穿透→同点位拖选→工具条→高亮→计数+1
  // 标注计数按唯一 annotationId(一条标注跨多行渲染多块,rect 数≠条数)
  const beforeCount = await win.evaluate(`new Set([...document.querySelectorAll('[data-testid="annotation-rect"]')].map(e => e.getAttribute('data-annotation-id'))).size`)
  const modeBtn = win.locator('button:has-text("选择模式")')
  await modeBtn.click()
  await win.waitForTimeout(300)
  R.scenarios.B_selectionMode = {}
  R.scenarios.B_selectionMode.ariaPressed = await modeBtn.getAttribute('aria-pressed')
  R.scenarios.B_selectionMode.rectPointerEvents = await win.evaluate(`(() => {
    const els = [...document.querySelectorAll('[data-testid="annotation-rect"]')]
    const vals = [...new Set(els.map(e => getComputedStyle(e).pointerEvents))]
    return { total: els.length, computed: vals }
  })()`)
  // 诊断:压点命中元素(穿透验证——annotation rect 不在场,应落 textLayer;
  // txt=命中 span 文本长度——空 span 上浏览器无法锚定选区,拖选不成)
  R.scenarios.B_selectionMode.hitTest = await win.evaluate(`(() => {
    const el = document.elementFromPoint(${qA.x1}, ${qA.y1})
    if (el === null) return null
    const cls = typeof el.className === 'string' ? el.className : ''
    return { tag: el.tagName, cls, inTextLayer: !!el.closest('.textLayer'), selectable: getComputedStyle(el).userSelect, txt: (el.textContent || '').length }
  })()`)
  log('场景B 切模式后按钮+rect 态', JSON.stringify(R.scenarios.B_selectionMode))
  // B0 分解实验:选择模式下干净区(非压点)拖选——区分系统性/压点区特性
  await dragSelect(win, cleanPts.x1, cleanPts.y1, cleanPts.x2, cleanPts.y2)
  R.scenarios.B_selectionMode.cleanAreaProbe = { drag: cleanPts, ...(await selectionState(win)) }
  log('场景B0 选择模式干净区拖选', JSON.stringify(R.scenarios.B_selectionMode.cleanAreaProbe))
  await dragSelect(win, qA.x1, qA.y1, qA.x2, qA.y2)
  R.scenarios.B_selectionMode.drag = qA
  Object.assign(R.scenarios.B_selectionMode, await selectionState(win))
  log('场景B 压点拖选', JSON.stringify(R.scenarios.B_selectionMode))
  if (!R.scenarios.B_selectionMode.present) throw new Error('场景B 工具条未弹出')
  const scrollTopOf = async () => {
    const v = await win.evaluate(`(() => { const el = document.querySelector('.min-w-0.flex-1.overflow-auto.p-3'); return el ? Math.round(el.scrollTop) : -1 })()`)
    return v
  }
  R.scenarios.B_selectionMode.scrollTop = { beforeSave: await scrollTopOf() }
  await win.getByRole('button', { name: '高亮' }).click()
  await win.waitForTimeout(900)
  R.scenarios.B_selectionMode.scrollTop.afterSave = await scrollTopOf()
  log('场景B 保存前后滚动', JSON.stringify(R.scenarios.B_selectionMode.scrollTop))
  const afterCount = await win.evaluate(`new Set([...document.querySelectorAll('[data-testid="annotation-rect"]')].map(e => e.getAttribute('data-annotation-id'))).size`)
  R.scenarios.B_selectionMode.rectCount = { before: beforeCount, after: afterCount }
  R.scenarios.B_selectionMode.saved = afterCount === beforeCount + 1
  log('场景B 高亮保存计数', JSON.stringify(R.scenarios.B_selectionMode.rectCount))

  // 场景 C:切回常规→pointer-events 恢复+点击标注→菜单出现
  const scrollProbe = async (label) => {
    const v = await win.evaluate(`(() => {
      const els = [...document.querySelectorAll('div')].filter(e => e.className && String(e.className).includes('overflow-auto'))
      return els.map(e => ({ cls: String(e.className).slice(0, 40), top: Math.round(e.scrollTop), h: e.clientHeight }))
    })()`)
    log(`scroll@${label}`, JSON.stringify(v))
  }
  await scrollProbe('C-before-toggle')
  await modeBtn.click()
  await scrollProbe('C-after-toggle')
  await win.waitForTimeout(300)
  R.scenarios.C_backToNormal = {}
  R.scenarios.C_backToNormal.ariaPressed = await modeBtn.getAttribute('aria-pressed')
  R.scenarios.C_backToNormal.rectPointerEvents = await win.evaluate(`(() => {
    const els = [...document.querySelectorAll('[data-testid="annotation-rect"]')]
    const vals = [...new Set(els.map(e => getComputedStyle(e).pointerEvents))]
    return { total: els.length, computed: vals }
  })()`)
  // 视口保障:保存链后滚动位可能漂移(采样在档),先把标注块滚回视口再点击
  await win.evaluate(`(() => {
    const el = [...document.querySelectorAll('[data-testid="annotation-rect"]')].find(e => e.getBoundingClientRect().width > 5)
    el?.scrollIntoView({ block: 'center' })
  })()`)
  await win.waitForTimeout(500)
  const clickTarget = await win.evaluate(`(() => {
    const boxes = [...document.querySelectorAll('[data-testid="annotation-rect"]')].map(e => e.getBoundingClientRect())
    const r = boxes.find(b => b.y > 140 && b.bottom < 680 && b.width > 20)
    // 诊断:视口内块几何样本(失败定位用)
    const sample = boxes.slice(0, 6).map(b => ({ y: Math.round(b.y), bottom: Math.round(b.bottom), w: Math.round(b.width) }))
    return r ? { x: r.x + r.width / 2, y: r.y + r.height / 2, sample } : { none: true, sample }
  })()`)
  if (clickTarget.none === true || clickTarget.x === undefined) {
    R.scenarios.C_backToNormal.clickTargetDebug = clickTarget
  }
  if (clickTarget.x !== undefined) {
    await win.mouse.move(clickTarget.x, clickTarget.y)
    await win.mouse.down()
    await win.waitForTimeout(60)
    await win.mouse.up()
    await win.waitForTimeout(500)
    R.scenarios.C_backToNormal.menuShown = await win.evaluate(`!!document.querySelector('[data-testid="annotation-menu"]')`)
  } else {
    R.scenarios.C_backToNormal.menuShown = 'skipped:无可点击块'
  }
  log('场景C 切回常规+点击', JSON.stringify(R.scenarios.C_backToNormal))

  await win.screenshot({ path: join(OUT, 'f-a3-final-state.png') })
  await app.close()
  writeFileSync(join(OUT, 'f-a3-verify.json'), JSON.stringify(R, null, 2))

  const A = R.scenarios.A_normalOnRect
  const B = R.scenarios.B_selectionMode
  const C = R.scenarios.C_backToNormal
  const pass =
    A.selLen === 0 && A.present === false &&
    B.ariaPressed === 'true' && B.rectPointerEvents.computed.join() === 'none' &&
    B.selLen > 0 && B.present === true && B.saved === true &&
    C.ariaPressed === 'false' && C.rectPointerEvents.computed.every(v => v === 'auto') && C.menuShown === true
  console.log(`F-A3 VERIFY: A(neg)=${A.selLen === 0 && !A.present ? 'PASS' : 'FAIL'} B(root)=${B.ariaPressed === 'true' && B.selLen > 0 && B.present && B.saved ? 'PASS' : 'FAIL'} C(regress)=${C.ariaPressed === 'false' && C.menuShown === true ? 'PASS' : 'FAIL'} overall=${pass ? 'PASS' : 'FAIL'}`)
  if (!pass) process.exit(2)
}

await main().catch((e) => {
  R.error = String(e)
  try {
    writeFileSync(join(OUT, 'f-a3-verify.json'), JSON.stringify(R, null, 2))
  } catch {
    // 产物目录缺失等——原始错误优先报告
  }
  console.error(e)
  process.exit(1)
})
