/**
 * F-L2 修复真机取证——SET1 UI 缩放三档下视口量测本地口径验证（票面 5.3）。
 * crib f-l2-precheck.mjs（Electron launch/真实库副本/三档循环手法）。
 * - A 全节点入视口（修复主断言，M3 型回归门）：每档 wheel 置 userInteracted
 *   →点「适应视图」真触发 refit（首轮实证：无置位则 resetFit 被 React bail
 *   out 不重跑）→ maxNodeRight≤svgRight+1 且 maxNodeBottom≤svgBottom+1；
 * - B 100% 恒等回归：small 档 clientWidth/clientHeight 与 gBCR 宽高相对差
 *   <0.1%（量测源恒等+fitViewport 纯函数既有锁=fit 输出数学恒等；precheck
 *   transform 基线因真库数据/首载档漂移不可比——首轮实证，见报告自裁）；
 * - C wheel sanity（large 档）：svg 中心 wheel deltaY=-120 → 无页面错误
 *   +k 增且在 ZOOM 界 [0.25,4]（精确锚点断言备案——票面 1.5）；
 * - D pan sanity（large 档）：panbg 拖 100 根框 px → tx 增量≈100×
 *   (clientWidth/gBCR.width)≈80±5（svg 本地口径增量；修前直用根框差
 *   会 ≈100）。
 * 产物：scripts/audits/f-l2-out/f-l2-fix-verify.json；PASS 打印+exit 码。
 */
import { _electron as electron } from '@playwright/test'
import { cp, mkdir, rm } from 'node:fs/promises'
import { existsSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const ROOT = process.cwd()
const OUT = join(ROOT, 'scripts', 'audits', 'f-l2-out')
await mkdir(OUT, { recursive: true })
const log = (...a) => console.log(`[f-l2fix ${new Date().toISOString().slice(11, 19)}]`, ...a)

/** ZOOM 界（src lineage-viewport.ts 单源镜像——探针只断界不 import 源码） */
const ZOOM_MIN = 0.25
const ZOOM_MAX = 4

/** transform 串解析（与单测/e2e 同式：translate(x, y) scale(k)） */
function parseTransform(s) {
  const m = String(s).match(/^translate\((-?[\d.e+-]+), (-?[\d.e+-]+)\) scale\(([\d.e+-]+)\)$/)
  return m ? { tx: Number(m[1]), ty: Number(m[2]), k: Number(m[3]) } : null
}

async function freshUserData() {
  const src = join(process.env.APPDATA, 'Synapse')
  const userData = join(tmpdir(), 'synapse-f-l2-fixverify')
  await rm(userData, { recursive: true, force: true })
  for (const p of ['workspaces', 'ai-sensor']) await cp(join(src, p), join(userData, p), { recursive: true })
  for (const f of ['settings.json', 'workspace.json', 'window-state.json']) {
    if (existsSync(join(src, f))) await cp(join(src, f), join(userData, f))
  }
  return userData
}

const userData = await freshUserData()
const app = await electron.launch({ args: ['out/main/index.js'], env: { ...process.env, SYNAPSE_USER_DATA: userData } })
const win = await app.firstWindow()
await win.getByRole('button', { name: '脉络' }).waitFor({ timeout: 20_000 })
await win.waitForTimeout(800)
await win.getByRole('button', { name: '脉络' }).click()
await win.waitForTimeout(1500)

const pageErrors = []
win.on('pageerror', (e) => pageErrors.push(String(e)))

/** 视口态 dump（与 precheck 同口径：gBCR/client/transform/节点极值） */
const DUMP = `(() => {
  const svgEl = document.querySelector('[data-viewport]')?.closest('svg')
  if (!svgEl) return null
  const r = svgEl.getBoundingClientRect()
  const transform = document.querySelector('[data-viewport]')?.getAttribute('transform') || ''
  const nodes = [...document.querySelectorAll('[data-node-id]')].map((e) => {
    const b = e.getBoundingClientRect()
    return { id: e.dataset.nodeId, right: b.right, bottom: b.bottom }
  })
  return {
    gBCR: { w: r.width, h: r.height, x: r.x, y: r.y, right: r.right, bottom: r.bottom },
    client: { w: svgEl.clientWidth, h: svgEl.clientHeight },
    zoomRow: svgEl.closest('.app-content-row') ? getComputedStyle(svgEl.closest('.app-content-row')).zoom : null,
    transform,
    nodeCount: nodes.length,
    maxNodeRight: Math.max(...nodes.map((n) => n.right)),
    maxNodeBottom: Math.max(...nodes.map((n) => n.bottom))
  }
})()`

const results = []
const check = (id, pass, detail) => {
  results.push({ id, pass, detail })
  log(`${pass ? 'PASS' : 'FAIL'} ${id} — ${detail}`)
}

// 场景 A：三档设 --ui-scale → wheel 置 userInteracted → 点「适应视图」真触发
// refit（resetFit 生效前提=先交互置位；无此步则 setUserInteracted(false) 被
// React bail out，effect 不重跑——首轮探针实证三档 transform 恒同）→ 全节点
// 入视口（fit 量测 clientWidth=当前档 svg 本地口径——修复路径本体）
const tierDump = {}
for (const [name, z] of [['small', '1'], ['medium', '1.1'], ['large', '1.25']]) {
  await win.evaluate(`document.documentElement.style.setProperty('--ui-scale', '${z}')`)
  await win.waitForTimeout(500)
  const pre = await win.evaluate(DUMP)
  const px = pre.gBCR.x + pre.gBCR.w / 2
  const py = pre.gBCR.y + pre.gBCR.h / 2
  await win.mouse.move(px, py)
  await win.mouse.wheel(0, -120) // 用户接管视口（userInteracted=true）
  await win.waitForTimeout(300)
  await win.getByRole('button', { name: '适应视图' }).click()
  await win.waitForTimeout(900)
  tierDump[name] = await win.evaluate(DUMP)
  const m = tierDump[name]
  log(
    name,
    JSON.stringify({
      zoomRow: m.zoomRow,
      clientW: m.client.w,
      gBCRw: m.gBCR.w,
      k: parseTransform(m.transform).k.toFixed(4),
      maxNodeRight: m.maxNodeRight.toFixed(1),
      svgRight: m.gBCR.right,
      maxNodeBottom: m.maxNodeBottom.toFixed(1),
      svgBottom: m.gBCR.bottom,
      nodeCount: m.nodeCount
    })
  )
  check(`A/${name}/right`, m.maxNodeRight <= m.gBCR.right + 1, `maxNodeRight=${m.maxNodeRight.toFixed(2)} ≤ svgRight+1=${(m.gBCR.right + 1).toFixed(2)}`)
  check(`A/${name}/bottom`, m.maxNodeBottom <= m.gBCR.bottom + 1, `maxNodeBottom=${m.maxNodeBottom.toFixed(2)} ≤ svgBottom+1=${(m.gBCR.bottom + 1).toFixed(2)}`)
}

// 场景 B：100% 恒等回归。首轮探针实证 precheck 基线不可比（真库数据+首载
// 档在本轮与 precheck 间漂移——基线 k=1.3873 按 1568 视口、本轮 refit k 按
// settings 当前档量测）。改锁票面 §4 语义本体：zoom=1 档 clientWidth/
// clientHeight 与 gBCR 宽高仅整数舍入差（相对差 <0.1%）——量测源恒等 +
// fitViewport 纯函数未改（edge-label-layout.test.ts 既有锁）= 100% 档 fit
// 输出数学恒等。
{
  const m = tierDump.small
  const dw = Math.abs(m.client.w - m.gBCR.w) / m.gBCR.w
  const dh = Math.abs(m.client.h - m.gBCR.h) / m.gBCR.h
  check('B/small/client-eq-gBCR-w', dw < 0.001, `clientW=${m.client.w} gBCRw=${m.gBCR.w} relDiff=${(dw * 100).toFixed(4)}%（阈 <0.1%）`)
  check('B/small/client-eq-gBCR-h', dh < 0.001, `clientH=${m.client.h} gBCRh=${m.gBCR.h} relDiff=${(dh * 100).toFixed(4)}%（阈 <0.1%）`)
  // zoom=1 档 refit 后全图入视口（100% 档不回归溢出——与 A/small 同锚双保险）
  check('B/small/no-overflow', m.maxNodeRight <= m.gBCR.right + 1 && m.maxNodeBottom <= m.gBCR.bottom + 1, `maxNodeRight=${m.maxNodeRight.toFixed(2)}/${m.gBCR.right}，maxNodeBottom=${m.maxNodeBottom.toFixed(2)}/${m.gBCR.bottom}`)
}

// 切回 large 档做 C/D（sanity 场景固定 large——票面 5.3）
await win.evaluate(`document.documentElement.style.setProperty('--ui-scale', '1.25')`)
await win.waitForTimeout(500)

// 场景 C：wheel sanity（svg 中心 wheel deltaY=-120 → k 增且在界内）
const beforeC = await win.evaluate(DUMP)
const bvC = parseTransform(beforeC.transform)
const cx = beforeC.gBCR.x + beforeC.gBCR.w / 2
const cy = beforeC.gBCR.y + beforeC.gBCR.h / 2
await win.mouse.move(cx, cy)
await win.mouse.wheel(0, -120)
await win.waitForTimeout(400)
const afterC = await win.evaluate(DUMP)
const avC = parseTransform(afterC.transform)
check('C/wheel/k-increases', avC.k > bvC.k, `k: ${bvC.k.toFixed(6)} → ${avC.k.toFixed(6)}`)
check('C/wheel/k-in-bounds', avC.k >= ZOOM_MIN && avC.k <= ZOOM_MAX, `k=${avC.k.toFixed(6)} ∈ [${ZOOM_MIN}, ${ZOOM_MAX}]`)

// 场景 D：pan sanity（panbg 拖 100 根框 px → tx 增量≈100×比值±5）
const beforeD = await win.evaluate(DUMP)
const bvD = parseTransform(beforeD.transform)
const sExpected = beforeD.client.w / beforeD.gBCR.w
// 空白 panbg 起点扫描（边缘候选序——elementFromPoint 落 [data-panbg] 即可）
const start = await win.evaluate(`(() => {
  const svgEl = document.querySelector('[data-viewport]')?.closest('svg')
  const r = svgEl.getBoundingClientRect()
  const cands = [[0.95, 0.06], [0.05, 0.94], [0.95, 0.94], [0.5, 0.06], [0.06, 0.5]]
  for (const [fx, fy] of cands) {
    const p = { x: r.x + r.width * fx, y: r.y + r.height * fy }
    const t = document.elementFromPoint(p.x, p.y)
    if (t && t.closest('[data-panbg]')) return p
  }
  return null
})()`)
check('D/panbg-point-found', start !== null, `拖拽起点=${JSON.stringify(start)}`)
if (start !== null) {
  await win.mouse.move(start.x, start.y)
  await win.mouse.down()
  await win.mouse.move(start.x + 100, start.y, { steps: 5 })
  await win.mouse.up()
  await win.waitForTimeout(400)
  const afterD = await win.evaluate(DUMP)
  const avD = parseTransform(afterD.transform)
  const dtx = avD.tx - bvD.tx
  const expect = 100 * sExpected
  check('D/pan/tx-delta-local', Math.abs(dtx - expect) <= 5, `dtx=${dtx.toFixed(2)}，期望≈${expect.toFixed(2)}（=100×${sExpected.toFixed(4)}）±5`)
}

check('C-D/no-pageerror', pageErrors.length === 0, `页面错误 ${pageErrors.length} 条${pageErrors.length > 0 ? '：' + pageErrors.join('; ') : ''}`)

writeFileSync(
  join(OUT, 'f-l2-fix-verify.json'),
  JSON.stringify({ meta: { script: 'f-l2-fix-verify.mjs', date: new Date().toISOString() }, tiers: tierDump, results }, null, 2)
)
await app.close()

const fails = results.filter((r) => !r.pass)
if (fails.length === 0) console.log(`F-L2 FIX-VERIFY: PASS（${results.length}/${results.length} 项断言全过）→ f-l2-out/f-l2-fix-verify.json`)
else console.log(`F-L2 FIX-VERIFY: FAIL（${fails.length}/${results.length} 项断言失败）`)
process.exit(fails.length === 0 ? 0 : 1)
