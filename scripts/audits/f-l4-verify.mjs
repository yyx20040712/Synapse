/**
 * F-L4 修复真机取证——视口尺寸变化（svg 布局盒）auto-fit 重触发（RO 方案，
 * 票面 5.3）。crib f-l2-fix-verify.mjs 运行模式（Electron 真机/真实库副本/
 * 断言落 JSON）。
 *
 * 票面-现实接缝声明（实现者自裁取证组合，报主控知悉）：票面场景 A/B 的
 * 「挂载中经 settings 通道切档」在真实 App 不可达——App.tsx:193-198 页面
 * 条件渲染互斥，设置页换档时脉络页必 unmount。故取证分三路：
 * - A（换档 refit，票面主断言）：small 档挂载 fit→设置页点「中 110%」（真实
 *   settings 通道：save→settings.json→store→--ui-scale）→回脉络（重挂载
 *   fit+RO observe 初始通知）→断言 clientWidth 变+transform 更新+全节点
 *   入视口（F-L2 fix-verify 同判据）；
 * - A-resize（RO 端到端裁决点）：脉络挂载中窗口 resize——fit effect deps
 *   未变，refit 只能来自 RO 回调（摘 RO 即红）；
 * - diagnostic（票面 §0 fallback 待证点直取证，信息项不断言）：挂载中直写
 *   --ui-scale（CSS zoom 引起布局盒变化）→wrapper 计数 Chromium 是否派发
 *   RO——回答「Chromium 对 CSS zoom 的布局盒变化不触发 RO」裁决问题（真实
 *   App 换档路径经重挂载，不依赖此路径，故降信息项）。
 * - B 门语义：wheel 置门→挂载中窗口 resize→视口不变（数值断言，等于 wheel
 *   后值——门语义与 resize 触发源正交）；
 * - C 清理：wrapper（内嵌原生 RO 转发——纯 JS 类浏览器不派发）记录实例/
 *   派发计数/disconnect→unmount 断言 disconnect 被调+其后 resize 派发计数
 *   不增（回调不再生效）。
 * 产物：scripts/audits/f-l4-out/f-l4-verify.json；PASS 打印+exit 码。
 */
import { _electron as electron } from '@playwright/test'
import { cp, mkdir, rm, readFile, writeFile } from 'node:fs/promises'
import { existsSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { registerHooks } from 'node:module'

const ROOT = process.cwd()
const OUT = join(ROOT, 'scripts', 'audits', 'f-l4-out')
await mkdir(OUT, { recursive: true })
const log = (...a) => console.log(`[f-l4 ${new Date().toISOString().slice(11, 19)}]`, ...a)

// [回炉 1 W2] node 侧直载源码 fitViewport（门一裁决「import 源码计算精确期望，
// 不 crib 重实现」）：Node 24 type-stripping + registerHooks 解析钩子——
// ①相对导入补 .ts 扩展（node ESM 不做扩展补全）；②@shared/ 别名映射
// src/shared/（tsconfig paths 仅构建器可见；lineage-classify 运行时引用之）。
// 依赖链止于 react/zod（node_modules），无其余别名。
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('@shared/')) {
      return nextResolve(pathToFileURL(join(ROOT, 'src/shared', `${specifier.slice(8)}.ts`)).href, context)
    }
    if (specifier.startsWith('.') && !/\.[cm]?[jt]s$/.test(specifier)) {
      try {
        return nextResolve(`${specifier}.ts`, context)
      } catch {
        /* fallthrough：保持原解析语义报错 */
      }
    }
    return nextResolve(specifier, context)
  }
})
const { fitViewport } = await import(
  pathToFileURL(join(ROOT, 'src/renderer/features/lineage/lineage-viewport.ts')).href
)
const { estimateLabelWidth } = await import(
  pathToFileURL(join(ROOT, 'src/renderer/features/lineage/edge-label-layout.ts')).href
)

/** [回炉 1 W2] 从页面 DOM 重建 fitViewport 输入（nodes/layout/labelBoxes），
 *  与组件同源：节点=g transform（布局坐标）+div[title] 属性（题名全文——
 *  line-clamp 截断不入属性值）；标签盒=FO（x/y=左上角，中心定位
 *  x=cx-130/2）+estimateLabelWidth 复算（Canvas labelBoxes 同公式
 *  hw=est/2、hh=18.5 硬编码——LineageCanvas.tsx:103 同源）。 */
function rebuildFitInput(dump) {
  const nodes = dump.nodeDump.map((n) => ({ id: n.id, title: n.title }))
  const positions = new Map(dump.nodeDump.map((n) => [n.id, { x: n.x, y: n.y }]))
  const labelBoxes = dump.labelDump.map((l) => ({
    x: l.x + l.w / 2,
    y: l.y + l.h / 2,
    hw: estimateLabelWidth(l.label) / 2,
    hh: 18.5
  }))
  return { nodes, layout: { positions }, labelBoxes }
}

/** transform 串解析（与单测/e2e 同式：translate(x, y) scale(k)） */
function parseTransform(s) {
  const m = String(s).match(/^translate\((-?[\d.e+-]+), (-?[\d.e+-]+)\) scale\(([\d.e+-]+)\)$/)
  return m ? { tx: Number(m[1]), ty: Number(m[2]), k: Number(m[3]) } : null
}

/** 两视口是否可感不同（任一分量差>0.5——transform 串由 state 模板生成，同值同串） */
function viewportChanged(a, b) {
  return Math.abs(a.tx - b.tx) > 0.5 || Math.abs(a.ty - b.ty) > 0.5 || Math.abs(a.k - b.k) > 0.5
}

async function freshUserData() {
  const src = join(process.env.APPDATA, 'Synapse')
  const userData = join(tmpdir(), 'synapse-f-l4-verify')
  await rm(userData, { recursive: true, force: true })
  for (const p of ['workspaces', 'ai-sensor']) await cp(join(src, p), join(userData, p), { recursive: true })
  for (const f of ['settings.json', 'workspace.json', 'window-state.json']) {
    if (existsSync(join(src, f))) await cp(join(src, f), join(userData, f))
  }
  // 场景 A 起点：预写 small 档（挂载 small 档 fit；后续经设置页 UI 真实通道切 medium）
  const settingsPath = join(userData, 'settings.json')
  const base = existsSync(settingsPath) ? JSON.parse(await readFile(settingsPath, 'utf8')) : {}
  base.uiScale = 'small'
  await writeFile(settingsPath, JSON.stringify(base), 'utf8')
  return userData
}

const userData = await freshUserData()
const app = await electron.launch({ args: ['out/main/index.js'], env: { ...process.env, SYNAPSE_USER_DATA: userData } })
const win = await app.firstWindow()

// [C-2③ INV-44 备案③] 固定等待（waitFor Timeout 族）→条件轮询（CI 慢机误报防线）：
// - pollUntil：waitForFunction 条件轮询（120ms 采样）；超时不抛错返回 false——
//   红由后续 check 断言承担（保持探针 FAIL 语义而非脚本崩溃）；
// - twoFrames：双 rAF——布局变化经 paint 两帧，RO（帧前派发）与 React 重渲染
//   均已获执行机会，负向断言（「无变化」类）自此采样才有效（等待语义的条件化
//   等价物，非固定 sleep——由帧事件驱动）。
async function pollUntil(pageFn, arg, timeout) {
  try {
    await win.waitForFunction(pageFn, arg, { timeout, polling: 120 })
    return true
  } catch {
    return false
  }
}
const twoFrames = () =>
  win.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(null)))))
/** 脉络图挂载 fit 完成且已稳定：节点>0+transform 非空+连续两次采样同值
 *  （120ms 间隔——初始态 transform=identity（useState 初值）与 nodes 提交
 *  →fit effect→二次提交之间存在中间帧窗口，「非空」条件会在 fit 落地前
 *  放行（2026-09-02 本票实测翻车：t1/t2 采到 identity——A/transform 两红）；
 *  稳定性判据消除该竞态：fit 值一旦提交即不再变（除非用户交互/resize） */
const lineageReady = async () => {
  await win.evaluate(() => {
    delete window.__fitProbe
  })
  return pollUntil(
    () => {
      const vp = document.querySelector('[data-viewport]')
      const t = vp === null ? '' : vp.getAttribute('transform') || ''
      const s = window.__fitProbe === undefined ? (window.__fitProbe = {}) : window.__fitProbe
      if (t === '' || document.querySelectorAll('[data-node-id]').length === 0) {
        s.last = null
        return false
      }
      if (s.last === t) {
        return true
      }
      s.last = t
      return false
    },
    undefined,
    15_000
  )
}

await win.getByRole('button', { name: '脉络' }).waitFor({ timeout: 20_000 })
// [C-2③] 启动 settle 条件化：页面 load 完成（React 渲染已由按钮 waitFor 保证）
await pollUntil(() => document.readyState === 'complete', undefined, 5_000)
await win.getByRole('button', { name: '脉络' }).click()
// [C-2③] 固定 1500→轮询脉络挂载 fit 完成
await lineageReady()

const pageErrors = []
win.on('pageerror', (e) => pageErrors.push(String(e)))

/** 视口态 dump（与 f-l2-fix-verify 同口径：gBCR/client/transform/节点极值；
 *  回炉 1 W2 增 nodeDump/labelDump——fitViewport 输入重建面） */
const DUMP = `(() => {
  const svgEl = document.querySelector('[data-viewport]')?.closest('svg')
  if (!svgEl) return null
  const r = svgEl.getBoundingClientRect()
  const transform = document.querySelector('[data-viewport]')?.getAttribute('transform') || ''
  const nodes = [...document.querySelectorAll('[data-node-id]')].map((e) => {
    const b = e.getBoundingClientRect()
    return { id: e.dataset.nodeId, right: b.right, bottom: b.bottom }
  })
  const nodeDump = [...document.querySelectorAll('[data-node-id]')].map((g) => {
    const m = (g.getAttribute('transform') || '').match(/^translate\\((-?[\\d.e+-]+), (-?[\\d.e+-]+)\\)$/)
    const rect = g.querySelector('rect')
    return {
      id: g.dataset.nodeId,
      x: m ? Number(m[1]) : NaN,
      y: m ? Number(m[2]) : NaN,
      w: Number(rect?.getAttribute('width')),
      h: Number(rect?.getAttribute('height')),
      title: g.querySelector('div[title]')?.getAttribute('title') ?? ''
    }
  })
  const labelDump = [...document.querySelectorAll('[data-edge-label]')].map((d) => {
    const fo = d.closest('foreignObject')
    return {
      label: d.getAttribute('title') ?? '',
      x: Number(fo?.getAttribute('x')),
      y: Number(fo?.getAttribute('y')),
      w: Number(fo?.getAttribute('width')),
      h: Number(fo?.getAttribute('height'))
    }
  })
  return {
    gBCR: { w: r.width, h: r.height, x: r.x, y: r.y, right: r.right, bottom: r.bottom },
    client: { w: svgEl.clientWidth, h: svgEl.clientHeight },
    zoomRow: svgEl.closest('.app-content-row') ? getComputedStyle(svgEl.closest('.app-content-row')).zoom : null,
    transform,
    nodeCount: nodes.length,
    maxNodeRight: Math.max(...nodes.map((n) => n.right)),
    maxNodeBottom: Math.max(...nodes.map((n) => n.bottom)),
    nodeDump,
    labelDump
  }
})()`

const results = []
const check = (id, pass, detail) => {
  results.push({ id, pass, detail })
  log(`${pass ? 'PASS' : 'FAIL'} ${id} — ${detail}`)
}

const winBounds = () => app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].getBounds())
const resizeBy = (dw, dh) =>
  app.evaluate(({ BrowserWindow }, d) => {
    const w = BrowserWindow.getAllWindows()[0]
    const b = w.getBounds()
    w.setSize(b.width + d.dw, b.height + d.dh)
  }, { dw, dh })

const brief = (m) =>
  JSON.stringify({
    zoomRow: m.zoomRow,
    clientW: m.client.w,
    gBCRw: Math.round(m.gBCR.w * 10) / 10,
    v: parseTransform(m.transform),
    maxRight: Math.round(m.maxNodeRight * 10) / 10,
    svgRight: Math.round(m.gBCR.right * 10) / 10
  })

// ── 场景 A（换档 refit，票面主断言）：真实 settings 通道（设置页 UI 点档）──
const t1 = await win.evaluate(DUMP) // small 档挂载 fit
log('A/small 挂载 fit：', brief(t1))
await win.getByRole('button', { name: '设置' }).click()
// [C-2③] 固定 600→locator waitFor 条件轮询：档位钮可见=设置页已渲染
await win.getByRole('button', { name: '中 110%' }).waitFor({ timeout: 8_000 })
await win.getByRole('button', { name: '中 110%' }).click()
// [C-2③] 固定 900→轮询 settings 真实通道终点（save→settings.json→store→
// --ui-scale：small=1→medium=1.1——属性值即通道落地观测点）
await pollUntil(() => document.documentElement.style.getPropertyValue('--ui-scale') === '1.1', undefined, 8_000)
await win.getByRole('button', { name: '脉络' }).click()
// [C-2③] 固定 1200→轮询重挂载（取数+fit effect+RO observe 初始通知）
await lineageReady()
const t2 = await win.evaluate(DUMP)
log('A/medium 换档后：', brief(t2))

check('A/pre/node-count', t2.nodeCount > 0, `真库脉络图节点数=${t2.nodeCount}（>0 前提锚）`)
check('A/client-width-changed', Math.abs(t2.client.w - t1.client.w) > 1, `small→medium clientWidth：${t1.client.w}→${t2.client.w}（F-L2 precheck 同实证口径）`)
const v1 = parseTransform(t1.transform)
const v2 = parseTransform(t2.transform)
check('A/transform-updated', v1 !== null && v2 !== null && viewportChanged(v2, v1), `transform small(${JSON.stringify(v1)})→medium(${JSON.stringify(v2)}) 按新档量测 refit`)
// [回炉 1 W2] 精确断言：期望=node 侧 import 源码 fitViewport 按 medium 档
// clientWidth×clientHeight 与 DOM 重建输入（nodes/layout/labelBoxes）预计算，
// v2 各分量与期望差 <0.5——锁「transform 精确到 fitViewport 数学」非仅行为面。
const fitInput = rebuildFitInput(t2)
const expectedV = fitViewport(fitInput.nodes, fitInput.layout, t2.client.w, t2.client.h, fitInput.labelBoxes)
check(
  'A/transform-equals-fitviewport',
  v2 !== null &&
    Math.abs(v2.tx - expectedV.tx) < 0.5 &&
    Math.abs(v2.ty - expectedV.ty) < 0.5 &&
    Math.abs(v2.k - expectedV.k) < 0.5,
  `v2(${v2?.tx.toFixed(2)},${v2?.ty.toFixed(2)},${v2?.k.toFixed(4)})≈fitViewport 按 medium ${t2.client.w}×${t2.client.h} 期望(${expectedV.tx.toFixed(2)},${expectedV.ty.toFixed(2)},${expectedV.k.toFixed(4)})（nodes=${fitInput.nodes.length}/labels=${fitInput.labelBoxes.length} 重建）`
)
check(
  'A/all-in-viewport',
  t2.maxNodeRight <= t2.gBCR.right + 1 && t2.maxNodeBottom <= t2.gBCR.bottom + 1,
  `maxNodeRight=${t2.maxNodeRight.toFixed(2)}≤svgRight+1=${(t2.gBCR.right + 1).toFixed(2)}，maxNodeBottom=${t2.maxNodeBottom.toFixed(2)}≤svgBottom+1=${(t2.gBCR.bottom + 1).toFixed(2)}（F-L2 同判据）`
)

// ── A-resize（RO 端到端裁决点）：挂载中窗口 resize——fit effect deps 未变，refit 只能来自 RO ──
const bounds0 = await winBounds()
await resizeBy(-240, -160)
// [C-2③] 固定 900→轮询 RO refit 生效（transform 离开 t2 值——摘 RO 即超时，
// 由 A-resize 断言红，不在此崩）
await pollUntil((prev) => (document.querySelector('[data-viewport]')?.getAttribute('transform') || '') !== prev, t2.transform, 8_000)
const t3 = await win.evaluate(DUMP)
log('A-resize/缩窗后：', brief(t3))
const v3 = parseTransform(t3.transform)
check('A-resize/transform-updated', v3 !== null && viewportChanged(v3, v2), `resize(${bounds0.width}x${bounds0.height}→${bounds0.width - 240}x${bounds0.height - 160}) transform 更新（RO 路径——deps 未变，无 RO 即不变→红）`)
check(
  'A-resize/all-in-viewport',
  t3.maxNodeRight <= t3.gBCR.right + 1 && t3.maxNodeBottom <= t3.gBCR.bottom + 1,
  `maxNodeRight=${t3.maxNodeRight.toFixed(2)}/${(t3.gBCR.right + 1).toFixed(2)}，maxNodeBottom=${t3.maxNodeBottom.toFixed(2)}/${(t3.gBCR.bottom + 1).toFixed(2)}`
)

// ── B 门语义：wheel 置门→挂载中 resize→视口不变（数值断言）──
const bx = t3.gBCR.x + t3.gBCR.w / 2
const by = t3.gBCR.y + t3.gBCR.h / 2
await win.mouse.move(bx, by)
await win.mouse.wheel(0, -240) // 用户接管视口（userInteracted=true）
// [C-2③] 固定 400→轮询 wheel 视口更新（transform 离开 t3 值）
await pollUntil((prev) => (document.querySelector('[data-viewport]')?.getAttribute('transform') || '') !== prev, t3.transform, 8_000)
const wb = await win.evaluate(DUMP)
const wv = parseTransform(wb.transform)
check('B/pre/wheel-changed', wv !== null && viewportChanged(wv, v3), `wheel 后视口已变（${JSON.stringify(wv)}≠fit 值——前提锚）`)
await resizeBy(-200, 0)
// [C-2③] 负向等待条件化：先正向轮询布局变化落地（svg clientWidth 离开
// wheel 后值），再双 rAF 给 RO（帧前派发）+React 重渲染执行机会——此刻
// 采样 transform 不变才构成有效负向断言
await pollUntil((w) => (document.querySelector('[data-viewport]')?.closest('svg')?.clientWidth ?? -1) !== w, wb.client.w, 8_000)
await twoFrames()
const wa = await win.evaluate(DUMP)
const wv2 = parseTransform(wa.transform)
check('B/viewport-frozen', wv2 !== null && !viewportChanged(wv2, wv), `resize 后视口保持 wheel 值（${JSON.stringify(wv2)}==${JSON.stringify(wv)}——门语义不抢）`)

// ── RO wrapper（diagnostic+C 前置）：内嵌原生 RO 转发（纯 JS 类浏览器不派发）──
await win.evaluate(() => {
  const Native = window.ResizeObserver
  const rec = { instances: [], callbackCount: 0 }
  class WrappedRO {
    constructor(cb) {
      this.disconnected = false
      this.targets = []
      this.native = new Native((...args) => {
        window.__roRec.callbackCount += 1
        cb(...args)
      })
      rec.instances.push(this)
    }
    observe(t) {
      this.targets.push(t)
      this.native.observe(t)
    }
    disconnect() {
      this.disconnected = true
      this.native.disconnect()
    }
  }
  window.__roRec = rec
  window.ResizeObserver = WrappedRO
})
// 重挂载使新实例经 wrapper（patch 时挂载中的旧实例仍原生——不可观察，无妨）
await win.getByRole('button', { name: '设置' }).click()
// [C-2③] 固定 500→轮询脉络卸载（viewport 不在场=页面互斥切换完成）
await pollUntil(() => document.querySelector('[data-viewport]') === null, undefined, 8_000)
await win.getByRole('button', { name: '脉络' }).click()
// [C-2③] 固定 1200→两段条件轮询：wrapper 实例就位（mount 即注册）→
// 脉络 fit 稳定（lineageReady 稳定性判据——同 t1 竞态防护）
await pollUntil(() => window.__roRec !== undefined && window.__roRec.instances.length > 0, undefined, 8_000)
await lineageReady()
const ro0 = await win.evaluate(() => ({
  instanceCount: window.__roRec.instances.length,
  callbackCount: window.__roRec.callbackCount,
  observeTargets: window.__roRec.instances.flatMap((i) => i.targets.map((t) => t.getAttribute('data-testid')))
}))
log('wrapper 就位：', JSON.stringify(ro0))

// ── diagnostic（票面 §0 fallback 待证点直取证——信息项不断言）：挂载中直写
//    --ui-scale（CSS zoom 引起布局盒变化）→Chromium 是否派发 RO ──
const diagBefore = await win.evaluate(DUMP)
const countBefore = await win.evaluate(() => window.__roRec.callbackCount)
const cssOriginal = await win.evaluate(() => document.documentElement.style.getPropertyValue('--ui-scale') || '1')
const cssFlipped = cssOriginal === '1' ? '1.1' : '1'
await win.evaluate(`document.documentElement.style.setProperty('--ui-scale', '${cssFlipped}')`)
// [C-2③] 诊断观察窗条件化（900ms 上限保持）：轮询布局盒变化落地
// （clientWidth 离开前值）即提前采样；不变则窗口耗尽后采样
// （cssZoomTriggersRO=false 语义保持——信息项不断言）
await pollUntil((w) => (document.querySelector('[data-viewport]')?.closest('svg')?.clientWidth ?? -1) !== w, diagBefore.client.w, 900)
await twoFrames()
const diagAfter = await win.evaluate(DUMP)
const countAfter = await win.evaluate(() => window.__roRec.callbackCount)
await win.evaluate(`document.documentElement.style.setProperty('--ui-scale', '${cssOriginal}')`) // 恢复
// [C-2③] 固定 600→轮询 --ui-scale 恢复回值
await pollUntil((orig) => (document.documentElement.style.getPropertyValue('--ui-scale') || '1') === orig, cssOriginal, 8_000)
const diagnostic = {
  method: '挂载中直写 --ui-scale（非 settings 通道——真实 App 换档经设置页+重挂载，此路径 UI 不可达，仅供 fallback 裁决取证）',
  cssFlipped,
  clientWidth: { before: diagBefore.client.w, after: diagAfter.client.w },
  clientWidthChanged: Math.abs(diagAfter.client.w - diagBefore.client.w) > 1,
  roCallbackCount: { before: countBefore, after: countAfter },
  cssZoomTriggersRO: Math.abs(diagAfter.client.w - diagBefore.client.w) > 1 && countAfter > countBefore
}
log('diagnostic（信息项）：', JSON.stringify(diagnostic))

// ── C 清理（S6）：resize→派发计数增（sanity）→unmount→disconnect 被调→
//    再 resize→计数不增（回调不再生效）──
const c0 = await win.evaluate(() => window.__roRec.callbackCount)
await resizeBy(0, -140)
// [C-2③] 固定 900→轮询 RO 派发计数增加（resize 生效的正向条件）
await pollUntil((c0v) => window.__roRec.callbackCount > c0v, c0, 8_000)
const c1 = await win.evaluate(() => window.__roRec.callbackCount)
check('C/resize-callback-fired', c1 > c0, `resize 后 RO 派发计数 ${c0}→${c1}（浏览器真派发——sanity 前提锚）`)
await win.getByRole('button', { name: '设置' }).click()
// [C-2③] 固定 700→locator waitFor 条件轮询：设置页渲染=脉络 unmount
// （页面互斥）——disconnect 采样前提
await win.getByRole('button', { name: '中 110%' }).waitFor({ timeout: 8_000 })
const roUnmounted = await win.evaluate(() => ({
  disconnected: window.__roRec.instances.every((i) => i.disconnected),
  instanceCount: window.__roRec.instances.length
}))
check('C/disconnect-on-unmount', roUnmounted.disconnected, `unmount 后全部 ${roUnmounted.instanceCount} 个 wrapper 实例 disconnect 被调（成对清理）`)
// [C-2③] 负向等待条件化：resize 前取渲染视口高（脉络已 unmount、svg 不在
// 场——用 documentElement.clientHeight 作布局观测点），正向轮询视口变化
// 落地（离开前值）+双 rAF——此后采样计数不增才构成有效负向断言
const vhPre = await win.evaluate(() => document.documentElement.clientHeight)
await resizeBy(0, 100)
await pollUntil((h) => document.documentElement.clientHeight !== h, vhPre, 8_000)
await twoFrames()
const c2 = await win.evaluate(() => window.__roRec.callbackCount)
check('C/no-callback-after-disconnect', c2 === c1, `disconnect 后再 resize 派发计数不增（${c1}→${c2}——回调不再生效，无泄漏）`)

check('X/no-pageerror', pageErrors.length === 0, `页面错误 ${pageErrors.length} 条${pageErrors.length > 0 ? '：' + pageErrors.join('; ') : ''}`)

writeFileSync(
  join(OUT, 'f-l4-verify.json'),
  JSON.stringify(
    {
      meta: { script: 'f-l4-verify.mjs', date: new Date().toISOString() },
      scenes: { A_small_mount: t1, A_medium_switched: t2, A_resize: t3, B_wheel_before: wb, B_resize_after: wa },
      expectedViewportMedium: { computed: expectedV, input: { clientW: t2.client.w, clientH: t2.client.h, nodeCount: fitInput.nodes.length, labelCount: fitInput.labelBoxes.length } },
      wrapper: ro0,
      diagnostic,
      results
    },
    null,
    2
  )
)
await app.close()

const fails = results.filter((r) => !r.pass)
if (fails.length === 0) console.log(`F-L4 VERIFY: PASS（${results.length}/${results.length} 项断言全过）→ f-l4-out/f-l4-verify.json`)
else console.log(`F-L4 VERIFY: FAIL（${fails.length}/${results.length} 项断言失败——场景 A 红=fallback 触发，报主控裁决）`)
process.exit(fails.length === 0 ? 0 : 1)
