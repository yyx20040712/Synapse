/**
 * F-L2 排查探针——适应视图后节点出视口(0bd9a528 超 212px)根因定位。
 * 复刻 v11-accept.mjs sceneB 的 B8 链路(真实库副本+注入同三条 ref 边+
 * 打开脉络+点适应视图),dump fit 后完整几何:
 *   transform 串(k/tx/ty)+svg rect+全部节点 rect+全部标签 rect
 * → 反推原始坐标系(除以 k 平移),重建 fitViewport 盒数学,判定出视口
 *   节点的原始位置是否在盒内(盒漏节点 vs 数学另有钳制/量测面)。
 * 排查票红线:只登记不修。产物 scripts/audits/f-l2-out/probe.json
 */
import { _electron as electron } from '@playwright/test'
import { cp, mkdir, rm } from 'node:fs/promises'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

const ROOT = process.cwd()
const OUT = join(ROOT, 'scripts', 'audits', 'f-l2-out')
await mkdir(OUT, { recursive: true })
const log = (...a) => console.log(`[f-l2 ${new Date().toISOString().slice(11, 19)}]`, ...a)

const LONG = '该方法以水锤特征线法为基础引入瞬变流分析框架,为后续管网瞬态模拟奠定了理论前提与数值边界条件'
const LONG2 = '两篇工作在边界条件处理上一脉相承:前者提出阀门关闭分段线性化假设,后者将其推广到复杂拓扑并给出稳定域证明'

async function freshUserData() {
  const src = join(process.env.APPDATA, 'Synapse')
  const userData = join(tmpdir(), 'synapse-f-l2')
  await rm(userData, { recursive: true, force: true })
  for (const p of ['workspaces', 'ai-sensor']) await cp(join(src, p), join(userData, p), { recursive: true })
  for (const f of ['settings.json', 'workspace.json', 'window-state.json']) {
    if (existsSync(join(src, f))) await cp(join(src, f), join(userData, f))
  }
  return userData
}

function injectLineage(userData) {
  const pointer = JSON.parse(readFileSync(join(userData, 'workspace.json'), 'utf8'))
  const dbPath = join(userData, 'workspaces', pointer.currentId, 'synapse.db')
  const db = new DatabaseSync(dbPath)
  const nodes = db.prepare('SELECT id FROM lineage_nodes').all()
  const edges = db.prepare('SELECT from_node, to_node FROM lineage_edges ORDER BY created_at').all()
  const [a, c] = [edges[0].from_node, edges[0].to_node]
  const n1 = nodes[0].id, n2 = nodes[nodes.length - 1].id
  const now = new Date().toISOString()
  const ins = db.prepare("INSERT INTO lineage_edges (id, from_node, to_node, label, kind, created_at, updated_at) VALUES (?, ?, ?, ?, 'ref', ?, ?)")
  const done = []
  for (const [id, f, t, label] of [['f-l2-a', c, a, LONG2], ['f-l2-b', n1, n2, LONG]]) {
    try { ins.run(id, f, t, label, now, now); done.push(id) } catch (e) { log(id, '跳过:', e.message) }
  }
  db.close()
  return done
}

const userData = await freshUserData()
log('注入 ref 边', JSON.stringify(injectLineage(userData)))
const app = await electron.launch({ args: ['out/main/index.js'], env: { ...process.env, SYNAPSE_USER_DATA: userData } })
const win = await app.firstWindow()
await win.getByRole('button', { name: '脉络' }).waitFor({ timeout: 20_000 })
await win.waitForTimeout(800)
await win.getByRole('button', { name: '脉络' }).click()
await win.waitForSelector('[data-edge-label]', { timeout: 20_000 })
await win.waitForTimeout(1200)

await win.getByRole('button', { name: '适应视图' }).click()
await win.waitForTimeout(1000)

const dump = await win.evaluate(`(() => {
  const svgEl = document.querySelector('[data-viewport]')?.closest('svg')
  const svg = svgEl.getBoundingClientRect()
  const t = document.querySelector('[data-viewport]')?.getAttribute('transform') || ''
  const nodes = [...document.querySelectorAll('[data-node-id]')].map(e => {
    const r = e.getBoundingClientRect()
    return { id: e.dataset.nodeId, kind: e.dataset.kind, title: (e.textContent || '').slice(0, 24), x: r.x, y: r.y, w: r.width, h: r.height }
  })
  const labels = [...document.querySelectorAll('[data-edge-label]')].map(e => {
    const r = e.getBoundingClientRect()
    return { id: e.dataset.edgeLabel, text: (e.textContent || '').slice(0, 10), x: r.x, y: r.y, w: r.width, h: r.height }
  })
  return { transform: t, svg: { x: svg.x, y: svg.y, w: svg.width, h: svg.height }, nodes, labels, vw: svgEl.clientWidth, vh: svgEl.clientHeight }
})()`)
await win.screenshot({ path: join(OUT, 'probe-fitview.png') })
await app.close()

// ── 数学反推(本地) ──
const m = dump.transform.match(/translate\((-?[\d.]+), (-?[\d.]+)\) scale\(([\d.]+)\)/)
const k = m ? +m[3] : 1, tx = m ? +m[1] : 0, ty = m ? +m[2] : 0
const toOrig = (r) => ({ x: (r.x - dump.svg.x - tx) / k, y: (r.y - dump.svg.y - ty) / k, w: r.w / k, h: r.h / k })
const nodeOrig = dump.nodes.map((n) => ({ id: n.id, kind: n.kind, ...toOrig(n), title: n.title }))
const labelOrig = dump.labels.map((l) => ({ id: l.id, ...toOrig(l) }))
// fitViewport 盒重建(xMin 含 BAND_LEFT 初值面——先算纯节点/标签盒)
let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity
for (const n of nodeOrig) { xMin = Math.min(xMin, n.x); xMax = Math.max(xMax, n.x + n.w); yMin = Math.min(yMin, n.y); yMax = Math.max(yMax, n.y + n.h) }
for (const l of labelOrig) { xMin = Math.min(xMin, l.x); xMax = Math.max(xMax, l.x + l.w); yMin = Math.min(yMin, l.y); yMax = Math.max(yMax, l.y + l.h) }
const FIT_PAD_X = 48, FIT_PAD_Y = 80
const kMath = Math.min((dump.svg.w - 2 * FIT_PAD_X) / (xMax - xMin), (dump.svg.h - 2 * FIT_PAD_Y) / (yMax - yMin))
const out = {
  meta: { script: 'f-l2-probe.mjs', date: new Date().toISOString() },
  transform: { k, tx, ty }, svg: dump.svg,
  box: { xMin: +xMin.toFixed(1), xMax: +xMax.toFixed(1), yMin: +yMin.toFixed(1), yMax: +yMax.toFixed(1) },
  kMath: +kMath.toFixed(4), kApplied: k, kSelfConsistent: Math.abs(kMath - k) < 0.02,
  impliedTx: +(FIT_PAD_X - (xMin === Infinity ? 0 : xMin) * k).toFixed(1), txApplied: tx, txSelfConsistent: Math.abs(FIT_PAD_X - xMin * k - tx) < 2,
  nodes: nodeOrig.map((n) => ({ ...n, x: +n.x.toFixed(1), y: +n.y.toFixed(1), w: +n.w.toFixed(1), h: +n.h.toFixed(1) })),
  screenOut: dump.nodes.filter((n) => n.x + n.w > dump.svg.x + dump.svg.w + 1 || n.x < dump.svg.x - 1).map((n) => ({ id: n.id, right: +(n.x + n.w).toFixed(0), svgRight: +(dump.svg.x + dump.svg.w).toFixed(0) }))
}
writeFileSync(join(OUT, 'probe.json'), JSON.stringify(out, null, 1))
log('transform', JSON.stringify(out.transform), 'kMath', out.kMath, '自洽', out.kSelfConsistent, 'tx自洽', out.txSelfConsistent)
log('盒', JSON.stringify(out.box))
log('屏幕面出视口', JSON.stringify(out.screenOut))
log('产物', join(OUT, 'probe.json'))
