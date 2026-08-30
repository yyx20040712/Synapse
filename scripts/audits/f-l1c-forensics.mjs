/**
 * F-L1-C 真机取证——用户两保证的验收证据:
 * ①防重叠:注入「正反双 edge(同节点对,标签天然邻近)+穿越第三节点长边」
 *   两条制造碰撞源,断言全部渲染标签盒两两不相交+不与节点卡相交;
 * ②悬停滚动:截断标签(45 字>3 行)hover+滚轮 → scrollTop>0 且画布
 *   viewport transform 不变(zoom 未触发);
 * ③截图:全图+标签近景。
 * 产物:scripts/audits/f-l1-out/f-l1c-verify.json + f-l1c-*.png
 */
import { _electron as electron } from '@playwright/test'
import { cp, mkdir, rm } from 'node:fs/promises'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

const ROOT = process.cwd()
const OUT = join(ROOT, 'scripts', 'audits', 'f-l1-out')
const R = { meta: { script: 'f-l1c-forensics.mjs', date: new Date().toISOString() } }
const log = (...a) => console.log(`[f-l1c ${new Date().toISOString().slice(11, 19)}]`, ...a)

const LONG = '该方法以水锤特征线法为基础引入瞬变流分析框架,为后续管网瞬态模拟奠定了理论前提与数值边界条件'
const LONG2 = '两篇工作在边界条件处理上一脉相承:前者提出阀门关闭分段线性化假设,后者将其推广到复杂拓扑并给出稳定域证明'

function inject(userData) {
  const pointer = JSON.parse(readFileSync(join(userData, 'workspace.json'), 'utf8'))
  const dbPath = join(userData, 'workspaces', pointer.currentId, 'synapse.db')
  const db = new DatabaseSync(dbPath)
  const edges = db.prepare('SELECT from_node, to_node FROM lineage_edges ORDER BY created_at').all()
  const nodes = db.prepare('SELECT id FROM lineage_nodes').all()
  if (edges.length < 1 || nodes.length < 3) throw new Error(`脉络数据不足(edges=${edges.length},nodes=${nodes.length})`)
  const [a, c] = [edges[0].from_node, edges[0].to_node]
  // 碰撞源 1:同节点对正反双 edge(两条长标签,贝塞尔中点天然同 x 近 y)
  // 碰撞源 2:首尾节点跨度最大的一条穿越边(标签大概率落第三节点上)
  const now = new Date().toISOString()
  const ins = db.prepare(
    "INSERT INTO lineage_edges (id, from_node, to_node, label, kind, created_at, updated_at) VALUES (?, ?, ?, ?, 'ref', ?, ?)"
  )
  const n1 = nodes[Math.min(0, nodes.length - 1)].id
  const n2 = nodes[nodes.length - 1].id
  const done = []
  for (const [id, f, t, label] of [
    ['f-l1c-1', a, c, LONG],
    ['f-l1c-2', c, a, LONG2],
    ['f-l1c-3', n1, n2, LONG]
  ]) {
    try { ins.run(id, f, t, label, now, now); done.push(id) } catch (e) { log(`${id} 跳过:`, e.message) }
  }
  db.close()
  return { dbPath, done }
}

/** 两盒相交面积(getBoundingClientRect 左上角语义:x/y=左上,w/h=尺寸) */
function overlap(b1, b2) {
  const ox = Math.min(b1.x + b1.w, b2.x + b2.w) - Math.max(b1.x, b2.x)
  const oy = Math.min(b1.y + b1.h, b2.y + b2.h) - Math.max(b1.y, b2.y)
  return ox > 0 && oy > 0 ? +(ox * oy).toFixed(1) : 0
}

async function main() {
  if (!existsSync(join(ROOT, 'out', 'main', 'index.js'))) throw new Error('先 build')
  await mkdir(OUT, { recursive: true })
  const src = join(process.env.APPDATA, 'Synapse')
  const userData = join(tmpdir(), 'synapse-f-l1c')
  await rm(userData, { recursive: true, force: true })
  for (const p of ['workspaces', 'ai-sensor']) await cp(join(src, p), join(userData, p), { recursive: true })
  for (const f of ['settings.json', 'workspace.json', 'window-state.json']) {
    if (existsSync(join(src, f))) await cp(join(src, f), join(userData, f))
  }
  R.inject = inject(userData)
  log('注入', JSON.stringify(R.inject))

  const app = await electron.launch({ args: ['out/main/index.js'], env: { ...process.env, SYNAPSE_USER_DATA: userData } })
  const win = await app.firstWindow()
  await win.getByRole('button', { name: '脉络' }).waitFor({ timeout: 20_000 })
  await win.waitForTimeout(800)
  await win.getByRole('button', { name: '脉络' }).click()
  await win.waitForSelector('[data-edge-label]', { timeout: 20_000 })
  await win.waitForTimeout(1200)

  // ①防重叠:标签盒(视觉 rect 除以 k?——直接用视觉坐标两两比,同坐标系自洽)
  const audit = await win.evaluate(`(() => {
    const k = (() => { const t = document.querySelector('[data-viewport]')?.getAttribute('transform') || ''; const m = t.match(/scale\\(([\\d.]+)\\)/); return m ? +m[1] : 1 })()
    const labels = [...document.querySelectorAll('[data-edge-label]')].map(e => { const r = e.getBoundingClientRect(); return { text: (e.textContent || '').slice(0, 10), x: r.x, y: r.y, w: r.width, h: r.height } })
    const nodes = [...document.querySelectorAll('[data-node-id]')].map(e => { const r = e.getBoundingClientRect(); return { id: e.dataset.nodeId, x: r.x, y: r.y, w: r.width, h: r.height } })
    return { k: +k.toFixed(3), labels, nodes }
  })()`)
  const labelOverlaps = []
  for (let i = 0; i < audit.labels.length; i++) {
    for (let j = i + 1; j < audit.labels.length; j++) {
      const o = overlap(audit.labels[i], audit.labels[j])
      if (o > 0) labelOverlaps.push({ pair: [audit.labels[i].text, audit.labels[j].text], area: o })
    }
  }
  const nodeOverlaps = []
  for (const l of audit.labels) {
    for (const n of audit.nodes) {
      const o = overlap(l, n)
      if (o > 0) nodeOverlaps.push({ label: l.text, node: n.id, area: o })
    }
  }
  R.noOverlap = { labels: audit.labels, nodes: audit.nodes, k: audit.k, labelOverlaps, nodeOverlaps, pass: labelOverlaps.length === 0 && nodeOverlaps.length === 0 }
  log('①防重叠', JSON.stringify({ labels: audit.labels.length, labelOverlaps: labelOverlaps.length, nodeOverlaps: nodeOverlaps.length, pass: R.noOverlap.pass }))

  await win.screenshot({ path: join(OUT, 'f-l1c-full.png') })

  // ②悬停滚动:取最长(截断)标签,hover+滚轮
  const target = [...audit.labels].sort((a, b) => b.text.length - a.text.length)[0]
  const cx = target.x + target.w / 2
  const cy = target.y + target.h / 2
  const transformBefore = await win.evaluate(`document.querySelector('[data-viewport]')?.getAttribute('transform')`)
  const scrollInfo = await win.evaluate(`(() => {
    const el = [...document.querySelectorAll('[data-edge-label]')].find(e => (e.textContent || '').startsWith(${JSON.stringify(target.text.slice(0, 6))}))
    return { clamped: el ? el.scrollHeight > el.clientHeight + 1 : null, sh: el?.scrollHeight, ch: el?.clientHeight }
  })()`)
  await win.mouse.move(cx, cy)
  await win.waitForTimeout(300)
  await win.mouse.wheel(0, 120)
  await win.waitForTimeout(300)
  const after = await win.evaluate(`(() => {
    const el = [...document.querySelectorAll('[data-edge-label]')].find(e => (e.textContent || '').startsWith(${JSON.stringify(target.text.slice(0, 6))}))
    return { scrollTop: el ? +el.scrollTop.toFixed(1) : null, transform: document.querySelector('[data-viewport]')?.getAttribute('transform') }
  })()`)
  R.hoverScroll = { target: target.text, ...scrollInfo, scrollTopAfterWheel: after.scrollTop, transformUnchanged: transformBefore === after.transform, pass: scrollInfo.clamped === true && after.scrollTop > 0 && transformBefore === after.transform }
  log('②悬停滚动', JSON.stringify(R.hoverScroll))
  await win.screenshot({ path: join(OUT, 'f-l1c-hover-scrolled.png') })

  R.verdict = R.noOverlap.pass && R.hoverScroll.pass ? 'PASS' : 'FAIL'
  await app.close()
  writeFileSync(join(OUT, 'f-l1c-verify.json'), JSON.stringify(R, null, 2))
  console.log(`F-L1C VERIFY: ${R.verdict}`)
  if (R.verdict !== 'PASS') process.exitCode = 1
}

await main().catch((e) => { console.error(e); process.exit(1) })
