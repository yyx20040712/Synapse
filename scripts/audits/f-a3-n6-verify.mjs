/**
 * F-A3 N6 真机取证——INV-42 选择模式点击 rect 零副作用（票 C-2①；crib
 * scripts/audits/f-a3-verify.mjs 运行模式：真实库副本 freshUserData+Electron
 * launch+真鼠标 CDP）。
 * 场景：
 * - 前置：打开有文本文献（f-a3 同法）→ 干净面真鼠标拖选→「高亮」制造一条
 *   既有标注（不出条则程序化兜底——f-a3 场景前置同款）。
 * - B-n6 主断言：点「选择模式」（aria-pressed=true 前提锚）→ 视口内可见
 *   annotation-rect（宽>20 整块在视口内——f-a3 qA 采样法）中心真鼠标单击
 *   （move→down→60ms→up 无拖移，票面处方）→ 断言零副作用：
 *   a. annotation-menu 不出现；b. annotation-editor 不出现；
 *   c. getSelection() isCollapsed（点击不得成选）；
 *   d. 唯一 annotationId 计数（data-annotation-id 去重）前后不变；
 *   e. 穿透证明：click 点 elementFromPoint 非 rect 元素。
 *   另含样式前提锚：选择模式下全 rect 计算样式 pointer-events:none（INV-42
 *   在档语义的声明面）。实现者自裁（票面括注「菜单将出现」的预期修正）：
 *   AnnotationLayer onClick 内有 `if (selectionMode) return` 早退守卫
 *   （守卫兜程序化派发的同时也拦真鼠标），变异 pointer-events→'auto' 时
 *   a/b 仍绿——变异红证由 e+样式锚承担（详见 scripts/audits/c2-impl.report.md）。
 * - 对照（非恒真证明）：切回常规（aria-pressed=false 前提锚）→ 同点位真鼠标
 *   单击 → annotation-menu 出现——证明点击本身有效、零副作用是模式导致。
 * - AI 层同测（如实条件执行）：真实库副本存在 ai-note-rect 则同法直测；
 *   不存在则记 aiRectsPresent:false（不算失败）。
 * 等待纪律（票 C-2 关键纪律 3）：状态等待一律条件轮询（waitForFunction/
 * waitForSelector/locator waitFor），禁固定 waitForTimeout；60ms 按压驻留与
 * dragSelect 16ms 插值步进=手势时序（票面处方的动作序列，非状态等待）。
 * 产物：scripts/audits/f-a3-out/f-a3-n6-verify.json；全过打 PASS，任一断言
 * 失败 exit=2；异常 exit=1。
 */
import { _electron as electron } from '@playwright/test'
import { cp, mkdir, rm } from 'node:fs/promises'
import { existsSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const ROOT = process.cwd()
const OUT = join(ROOT, 'scripts', 'audits', 'f-a3-out')
const R = { meta: { script: 'f-a3-n6-verify.mjs', date: new Date().toISOString() }, scenarios: {} }
const log = (...a) => console.log(`[f-a3-n6 ${new Date().toISOString().slice(11, 19)}]`, ...a)

/** 手势驻留（票面处方 60ms 按压——动作序列时序，非状态等待） */
const hold = (win, ms) => win.evaluate((m) => new Promise((r) => setTimeout(r, m)), ms)

/** 真鼠标单击：move→down→60ms→up，无拖移（票面处方） */
async function realClick(win, x, y) {
  await win.mouse.move(x, y)
  await win.mouse.down()
  await hold(win, 60)
  await win.mouse.up()
}

/** 真鼠标拖选（12 步插值——crib f-a3 dragSelect；16ms 步进=动作序列时序） */
async function dragSelect(win, x1, y1, x2, y2) {
  await win.mouse.move(x1, y1)
  await win.mouse.down()
  for (let i = 1; i <= 12; i++) {
    await hold(win, 16)
    await win.mouse.move(x1 + ((x2 - x1) * i) / 12, y1 + ((y2 - y1) * i) / 12)
  }
  await win.mouse.up()
}

/** 条件轮询：选择器在场（attached）——出现即真，窗口耗尽即假（负向断言的
 *  有界观察窗：出现短路、缺席等满窗——非固定 sleep） */
async function pollAttached(win, selector, timeout) {
  try {
    await win.waitForSelector(selector, { timeout, state: 'attached' })
    return true
  } catch {
    return false
  }
}

/** 条件轮询：「选择模式」按钮 aria-pressed 到达期望值 */
async function pollPressed(win, value, timeout = 5000) {
  try {
    await win.waitForFunction(
      (v) =>
        [...document.querySelectorAll('button')]
          .find((b) => (b.textContent || '').includes('选择模式'))
          ?.getAttribute('aria-pressed') === v,
      value,
      { timeout, polling: 100 }
    )
    return true
  } catch {
    return false
  }
}

/** 唯一 annotationId 计数（一条标注跨多行渲染多块——按 data-annotation-id 去重） */
const uniqueAnnotationCount = (win) =>
  win.evaluate(`new Set([...document.querySelectorAll('[data-testid="annotation-rect"]')].map(e => e.getAttribute('data-annotation-id'))).size`)

/** click 点命中诊断（穿透证明素材）：elementFromPoint + 是否标注 rect */
const hitTestAt = (win, x, y) =>
  win.evaluate(`(() => {
    const el = document.elementFromPoint(${x}, ${y})
    if (el === null) return null
    const tid = el.getAttribute('data-testid')
    return { tag: el.tagName, testid: tid, cls: typeof el.className === 'string' ? el.className : '', inTextLayer: !!el.closest('.textLayer'), isRect: tid === 'annotation-rect' || tid === 'ai-note-rect' }
  })()`)

/** 全 rect 计算样式 pointer-events 采样（INV-42 声明面） */
const rectPointerEvents = (win, selector) =>
  win.evaluate(`(() => {
    const els = [...document.querySelectorAll('${selector}')]
    return { total: els.length, computed: [...new Set(els.map(e => getComputedStyle(e).pointerEvents))] }
  })()`)

/** 零副作用五件套（a-e）+样式锚外的采集体：给定 selector 的 rect 中心真鼠标单击 */
async function clickZeroSideEffects(win, pt) {
  const hit = await hitTestAt(win, pt.x, pt.y)
  const idBefore = await uniqueAnnotationCount(win)
  await realClick(win, pt.x, pt.y)
  const menuAppeared = await pollAttached(win, '[data-testid="annotation-menu"]', 1200)
  const editorAppeared = await pollAttached(win, '[data-testid="annotation-editor"]', 1200)
  const sel = await win.evaluate(`(() => { const s = getSelection(); return { collapsed: s.isCollapsed, selLen: s && !s.isCollapsed ? s.toString().length : 0 } })()`)
  const idAfter = await uniqueAnnotationCount(win)
  return {
    hitTest: hit,
    menuAppeared,
    editorAppeared,
    selectionCollapsed: sel.collapsed,
    selLen: sel.selLen,
    idCount: { before: idBefore, after: idAfter },
    checks: {
      a_noMenu: !menuAppeared,
      b_noEditor: !editorAppeared,
      c_collapsed: sel.collapsed === true,
      d_idCountUnchanged: idAfter === idBefore,
      e_penetrated: hit !== null && hit.isRect === false
    }
  }
}

async function main() {
  if (!existsSync(join(ROOT, 'out', 'main', 'index.js'))) throw new Error('先 build')
  await mkdir(OUT, { recursive: true })
  const src = join(process.env.APPDATA, 'Synapse')
  const userData = join(tmpdir(), 'synapse-f-a3-n6-verify')
  await rm(userData, { recursive: true, force: true })
  for (const p of ['workspaces', 'ai-sensor']) await cp(join(src, p), join(userData, p), { recursive: true })
  for (const f of ['settings.json', 'workspace.json', 'window-state.json']) {
    if (existsSync(join(src, f))) await cp(join(src, f), join(userData, f))
  }
  const app = await electron.launch({ args: ['out/main/index.js'], env: { ...process.env, SYNAPSE_USER_DATA: userData } })
  const win = await app.firstWindow()
  await win.getByRole('button', { name: '阅读器' }).waitFor({ timeout: 20_000 })
  if (!(await win.evaluate(() => !!document.querySelector('[data-page-root]')))) {
    await win.getByRole('button', { name: '文献库' }).click()
    await win.locator('.lib-card').first().dblclick()
  }
  // 条件轮询：文本层 span 就绪且可量测（≥4 个宽>5 的非空 span——替代 crib 固定 800）
  await win.waitForFunction(
    () => {
      const spans = [...document.querySelectorAll('[data-page-root] .textLayer span')].filter(
        (s) => s.firstChild !== null && s.firstChild.nodeType === 3 && (s.textContent || '').length > 0
      )
      return spans.filter((s) => s.getBoundingClientRect().width > 5).length >= 4
    },
    undefined,
    { timeout: 20_000, polling: 200 }
  )

  // ── 前置：制造一条既有标注（干净面真鼠标拖选→高亮；不出条则程序化兜底）──
  await win.evaluate(`(() => {
    const spans = [...document.querySelectorAll('[data-page-root] .textLayer span')]
      .filter(sp => sp.firstChild && sp.firstChild.nodeType === 3 && sp.textContent.length > 0)
    spans[8]?.scrollIntoView({ block: 'center' })
  })()`)
  // 条件轮询：滚定目标（span[8]）入视口（替代 crib 固定 400）
  await win.waitForFunction(
    () => {
      const spans = [...document.querySelectorAll('[data-page-root] .textLayer span')].filter(
        (s) => s.firstChild !== null && s.firstChild.nodeType === 3 && (s.textContent || '').length > 0
      )
      const r = spans[8]?.getBoundingClientRect()
      return r !== undefined && r.y > 120 && r.bottom < 700
    },
    undefined,
    { timeout: 8_000, polling: 100 }
  )
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
  let toolbar = await pollAttached(win, '[data-testid="selection-toolbar"]', 8000)
  R.prep = { drag: cleanPts, toolbarByRealMouse: toolbar }
  if (toolbar) {
    await win.getByRole('button', { name: '高亮' }).click()
  } else {
    await win.evaluate(`(() => {
      const spans = [...document.querySelectorAll('[data-page-root] .textLayer span')].filter(sp => sp.firstChild && sp.firstChild.nodeType === 3)
      const r = document.createRange()
      r.setStart(spans[${a}].firstChild, 2); r.setEnd(spans[${b}].firstChild, 4)
      const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r)
    })()`)
    toolbar = await pollAttached(win, '[data-testid="selection-toolbar"]', 8000)
    if (!toolbar) throw new Error('前置失败：程序化兜底后工具条仍未出现')
    await win.getByRole('button', { name: '高亮' }).click()
  }
  // 条件轮询：标注块渲染落地（宽>5——AnnotationLayer rAF 重锚后可见，替代固定 900）
  await win.waitForFunction(
    () => [...document.querySelectorAll('[data-testid="annotation-rect"]')].some((e) => e.getBoundingClientRect().width > 5),
    undefined,
    { timeout: 10_000, polling: 150 }
  )
  log('前置标注已建', JSON.stringify(R.prep))

  // ── qA 采样：整块在视口内的标注块（宽>20——f-a3 同法）中心作 click 点 ──
  await win.evaluate(`(() => {
    const el = [...document.querySelectorAll('[data-testid="annotation-rect"]')].find(e => e.getBoundingClientRect().width > 5)
    el?.scrollIntoView({ block: 'center' })
  })()`)
  await win.waitForFunction(
    () =>
      [...document.querySelectorAll('[data-testid="annotation-rect"]')].some((e) => {
        const r = e.getBoundingClientRect()
        return r.width > 20 && r.y > 140 && r.bottom < 680
      }),
    undefined,
    { timeout: 8_000, polling: 100 }
  )
  const qA = await win.evaluate(`(() => {
    const boxes = [...document.querySelectorAll('[data-testid="annotation-rect"]')]
      .map(e => e.getBoundingClientRect())
      .filter(r => r.y > 140 && r.bottom < 680 && r.width > 20 && r.width < 400)
    if (boxes.length === 0) return null
    const r = boxes[0]
    return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: Math.round(r.width), h: Math.round(r.height) }
  })()`)
  if (qA === null) throw new Error('无可测标注块（场景前提不成立）')
  log('qA click 点', JSON.stringify(qA))

  // ── B-n6 主断言：选择模式点击 rect 零副作用 ──
  const modeBtn = win.locator('button:has-text("选择模式")')
  await modeBtn.click()
  const pressedTrue = await pollPressed(win, 'true')
  R.scenarios.B_n6 = { ariaPressedOk: pressedTrue, click: qA }
  R.scenarios.B_n6.rectPointerEvents = await rectPointerEvents(win, '[data-testid="annotation-rect"]')
  Object.assign(R.scenarios.B_n6, await clickZeroSideEffects(win, qA))
  R.scenarios.B_n6.styleNone =
    R.scenarios.B_n6.rectPointerEvents.total > 0 && R.scenarios.B_n6.rectPointerEvents.computed.every((v) => v === 'none')
  log('场景 B-n6 选择模式点击', JSON.stringify(R.scenarios.B_n6))

  // ── AI 层同测（如实条件执行——仍处选择模式）──
  R.scenarios.AI_n6 = { aiRectsPresent: await win.evaluate(`!!document.querySelector('[data-testid="ai-note-rect"]')`) }
  if (R.scenarios.AI_n6.aiRectsPresent) {
    const aiQ = await win.evaluate(`(() => {
      const boxes = [...document.querySelectorAll('[data-testid="ai-note-rect"]')]
        .map(e => e.getBoundingClientRect())
        .filter(r => r.y > 140 && r.bottom < 680 && r.width > 20)
      if (boxes.length === 0) return null
      const r = boxes[0]
      return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: Math.round(r.width), h: Math.round(r.height) }
    })()`)
    if (aiQ === null) {
      R.scenarios.AI_n6.skipped = 'ai-note-rect 在场但无整块入视口者'
    } else {
      R.scenarios.AI_n6.click = aiQ
      R.scenarios.AI_n6.rectPointerEvents = await rectPointerEvents(win, '[data-testid="ai-note-rect"]')
      Object.assign(R.scenarios.AI_n6, await clickZeroSideEffects(win, aiQ))
      R.scenarios.AI_n6.styleNone =
        R.scenarios.AI_n6.rectPointerEvents.computed.every((v) => v === 'none')
    }
    log('场景 AI_n6 AI 层点击', JSON.stringify(R.scenarios.AI_n6))
  } else {
    log('场景 AI_n6：真实库副本无 ai-note-rect——aiRectsPresent:false（不算失败）')
  }

  // ── 对照（非恒真证明）：切回常规→同点位单击→菜单出现 ──
  await modeBtn.click()
  R.scenarios.C_contrast = { ariaPressedOk: await pollPressed(win, 'false') }
  R.scenarios.C_contrast.rectPointerEvents = await rectPointerEvents(win, '[data-testid="annotation-rect"]')
  await realClick(win, qA.x, qA.y)
  R.scenarios.C_contrast.menuShown = await pollAttached(win, '[data-testid="annotation-menu"]', 5000)
  log('场景 C 对照常规点击', JSON.stringify(R.scenarios.C_contrast))

  await win.screenshot({ path: join(OUT, 'f-a3-n6-final-state.png') })
  await app.close()
  writeFileSync(join(OUT, 'f-a3-n6-verify.json'), JSON.stringify(R, null, 2))

  // ── 判定 ──
  const B = R.scenarios.B_n6
  const bChecks = Object.values(B.checks)
  const bOk = B.ariaPressedOk && B.styleNone && bChecks.every(Boolean)
  const AI = R.scenarios.AI_n6
  const aiOk = !AI.aiRectsPresent || AI.skipped !== undefined || (AI.styleNone && Object.values(AI.checks).every(Boolean))
  const C = R.scenarios.C_contrast
  const cOk = C.ariaPressedOk && C.menuShown === true
  console.log(
    `F-A3-N6 VERIFY: B-n6(零副作用+穿透)=${bOk ? 'PASS' : 'FAIL'} AI=${!AI.aiRectsPresent ? 'absent' : aiOk ? 'PASS' : 'FAIL'} C(对照菜单出现)=${cOk ? 'PASS' : 'FAIL'} overall=${bOk && aiOk && cOk ? 'PASS' : 'FAIL'}`
  )
  if (!(bOk && aiOk && cOk)) process.exit(2)
}

await main().catch((e) => {
  R.error = String(e)
  try {
    writeFileSync(join(OUT, 'f-a3-n6-verify.json'), JSON.stringify(R, null, 2))
  } catch {
    // 产物目录缺失等——原始错误优先报告
  }
  console.error(e)
  process.exit(1)
})
