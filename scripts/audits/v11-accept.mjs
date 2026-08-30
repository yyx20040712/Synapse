/**
 * v11 交接书 §2 九项验收——主控代跑(真鼠标用户路径,非开发者取证断言复用):
 * A 面标注(F-A1):A1 多行高亮/A2 多行下划线/A3 旧标注回看(DB 注入修复前碎裂形态,
 *   验挂 B 读时归并 INV-E——真库 annotations 表为空,无存量可看)/A4 叠深(样式均匀+
 *   几何根因)/A5 干净面弹条计时/A6 反向(缝隙几何);
 * B 面脉络(F-L1-C):B7 窄幅换行 ≤3 行(foreignObject DOM 属性断言——getBoundingClientRect
 *   含 SVG 缩放的假象在档,不用于盒尺寸)/B8 密集防叠+适应视图后标签全可见(节点出视口
 *   =验收口径外,降观察项登记)/B9 截断标签悬停滚动+短标签滚轮=缩放。
 * 两幕:B(启动前 sqlite 注入碰撞源+短标签)→A(干净副本+注入旧格式标注+文献库定向打开)。
 * 产物:scripts/audits/v11-accept-out/v11-accept.json + v11-*.png
 * 红线:验收场只登记不修——任何 FAIL 即开票,不顺手改代码。
 */
import { _electron as electron } from '@playwright/test'
import { cp, mkdir, rm } from 'node:fs/promises'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

const ROOT = process.cwd()
const OUT = join(ROOT, 'scripts', 'audits', 'v11-accept-out')
const R = { meta: { script: 'v11-accept.mjs', date: new Date().toISOString() }, items: {}, observations: [] }
const log = (...a) => console.log(`[v11 ${new Date().toISOString().slice(11, 19)}]`, ...a)
const pass = (id, ok, detail) => { R.items[id] = { pass: !!ok, ...detail }; log(id, ok ? 'PASS' : 'FAIL', JSON.stringify(detail).slice(0, 400)) }
const observe = (note, detail) => { R.observations.push({ note, detail }); log('OBS', note, JSON.stringify(detail).slice(0, 300)) }

async function freshUserData(tag) {
  const src = join(process.env.APPDATA, 'Synapse')
  const userData = join(tmpdir(), `synapse-v11-${tag}`)
  await rm(userData, { recursive: true, force: true })
  for (const p of ['workspaces', 'ai-sensor']) await cp(join(src, p), join(userData, p), { recursive: true })
  for (const f of ['settings.json', 'workspace.json', 'window-state.json']) {
    if (existsSync(join(src, f))) await cp(join(src, f), join(userData, f))
  }
  return userData
}

async function launch(userData) {
  const app = await electron.launch({ args: ['out/main/index.js'], env: { ...process.env, SYNAPSE_USER_DATA: userData } })
  const win = await app.firstWindow()
  return { app, win }
}

async function openPaperFromLibrary(win, titlePrefix) {
  await win.getByRole('button', { name: '文献库' }).waitFor({ timeout: 20_000 })
  await win.waitForTimeout(800)
  await win.getByRole('button', { name: '文献库' }).click()
  await win.waitForSelector('.lib-card', { timeout: 20_000 })
  await win.waitForTimeout(1000)
  const target = win.locator('.lib-card').filter({ has: win.locator('.lib-card-title', { hasText: titlePrefix.slice(0, 16) }) }).first()
  let n = await target.count()
  if (n === 0) {
    const dump = await win.evaluate(`(() => [...document.querySelectorAll('.lib-card-title')].map(e => e.textContent.slice(0, 40)))()`)
    log('卡标题 dump', JSON.stringify(dump))
    throw new Error(`文献库无匹配卡:${titlePrefix.slice(0, 30)}`)
  }
  let opened = false
  for (let attempt = 0; attempt < 2 && !opened; attempt++) {
    await target.scrollIntoViewIfNeeded().catch(() => {})
    await target.dblclick()
    try {
      await win.waitForSelector('[data-page-root]', { timeout: 8000 })
      opened = true
    } catch { await win.waitForTimeout(1000) }
  }
  if (!opened) throw new Error(`双击未打开文档:${titlePrefix.slice(0, 30)}`)
  await win.waitForSelector('[data-page-root] .textLayer span', { timeout: 20_000 })
  await win.waitForTimeout(1200)
}

/** 真鼠标跨行拖选(f-a2-retest 配方:12 步插值,视口内) */
async function realDrag(win, x1, y1, x2, y2) {
  await win.mouse.move(x1, y1)
  await win.mouse.down()
  for (let i = 1; i <= 12; i++) {
    await win.waitForTimeout(16)
    await win.mouse.move(x1 + ((x2 - x1) * i) / 12, y1 + ((y2 - y1) * i) / 12)
  }
  await win.mouse.up()
}

/** 标注几何审计(全量或按 id 集):组内「每行一块」+缝隙+相交+同位重复+样式均匀 */
function auditExpr(idFilterExpr) {
  return `(() => {
  const only = ${idFilterExpr || 'null'}
  const byId = new Map()
  for (const el of document.querySelectorAll('[data-testid="annotation-rect"]')) {
    const id = el.dataset.annotationId
    if (only && !only.includes(id)) continue
    const r = el.getBoundingClientRect()
    const cs = getComputedStyle(el)
    if (!byId.has(id)) byId.set(id, [])
    byId.get(id).push({ x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1), fill: cs.fill, opacity: cs.fillOpacity })
  }
  const out = []
  for (const [id, rects] of byId) {
    const real = rects.filter(r => r.w > 1)
    const rows = new Set(real.map(r => Math.round(r.y)))
    const sorted = [...real].sort((a, b) => a.y - b.y)
    const gaps = []
    for (let i = 1; i < sorted.length; i++) gaps.push(+(sorted[i].y - (sorted[i - 1].y + sorted[i - 1].h)).toFixed(2))
    const interFail = []
    for (let i = 0; i < real.length; i++) for (let j = i + 1; j < real.length; j++) {
      const a = real[i], b = real[j]
      const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)
      const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)
      if (ox > 0.6 && oy > 0.6) interFail.push([i, j, +ox.toFixed(1), +oy.toFixed(1)])
    }
    const dupPairs = []
    for (let i = 0; i < sorted.length; i++) for (let j = i + 1; j < sorted.length; j++) {
      const a = sorted[i], b = sorted[j]
      if (Math.abs(a.y - b.y) < 1) {
        const ov = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)
        if (ov > 0.5 * Math.min(a.w, b.w)) dupPairs.push([i, j])
      }
    }
    const styles = new Set(real.map(r => r.fill + '|' + r.opacity))
    const bottoms = {}
    for (const r of real) { const key = Math.round(r.y); (bottoms[key] ||= []).push(+(r.y + r.h).toFixed(1)) }
    const bottomSpread = Math.max(...Object.values(bottoms).map(bs => Math.max(...bs) - Math.min(...bs)), 0)
    out.push({ id, blocks: rects.length, realBlocks: real.length, zeroW: rects.length - real.length, rowGroups: rows.size, perLineOneBlock: real.length === rows.size || real.length === 0, gapsMin: gaps.length ? Math.min(...gaps) : null, interFail, dupPairs, styleUniform: styles.size <= 1, hMax: real.length ? Math.max(...real.map(r => r.h)) : 0, bottomSpread: +bottomSpread.toFixed(2) })
  }
  return out
})()`
}

function sumAnnots(audits) {
  const bad = audits.filter(a => !a.perLineOneBlock || a.zeroW > 0 || a.interFail.length > 0 || a.dupPairs.length > 0 || (a.gapsMin !== null && a.gapsMin < -0.6) || !a.styleUniform)
  return { n: audits.length, bad, ok: bad.length === 0 && audits.length > 0 }
}

/** ============ 幕一:B 面(脉络,启动前注入) ============ */
const LONG = '该方法以水锤特征线法为基础引入瞬变流分析框架,为后续管网瞬态模拟奠定了理论前提与数值边界条件'
const LONG2 = '两篇工作在边界条件处理上一脉相承:前者提出阀门关闭分段线性化假设,后者将其推广到复杂拓扑并给出稳定域证明'

function injectLineage(userData) {
  const pointer = JSON.parse(readFileSync(join(userData, 'workspace.json'), 'utf8'))
  const dbPath = join(userData, 'workspaces', pointer.currentId, 'synapse.db')
  const db = new DatabaseSync(dbPath)
  const edges = db.prepare('SELECT from_node, to_node FROM lineage_edges ORDER BY created_at').all()
  const nodes = db.prepare('SELECT id FROM lineage_nodes').all()
  if (edges.length < 1 || nodes.length < 3) throw new Error(`脉络数据不足(edges=${edges.length},nodes=${nodes.length})`)
  const [a, c] = [edges[0].from_node, edges[0].to_node]
  const now = new Date().toISOString()
  const ins = db.prepare("INSERT INTO lineage_edges (id, from_node, to_node, label, kind, created_at, updated_at) VALUES (?, ?, ?, ?, 'ref', ?, ?)")
  const existing = new Set(db.prepare('SELECT from_node, to_node FROM lineage_edges').all().map(e => e.from_node + '>' + e.to_node))
  let shortPair = null
  outer: for (let i = 0; i < nodes.length; i++) for (let j = 0; j < nodes.length; j++) {
    if (i === j) continue
    const key = nodes[i].id + '>' + nodes[j].id
    if (!existing.has(key)) { shortPair = [nodes[i].id, nodes[j].id]; break outer }
  }
  if (!shortPair) throw new Error('无可用短标签节点对(全部方向已存在)')
  const n1 = nodes[0].id, n2 = nodes[nodes.length - 1].id
  const done = []
  for (const [id, f, t, label] of [['v11-b8', c, a, LONG2], ['v11-b8x', n1, n2, LONG], ['v11-b9s', shortPair[0], shortPair[1], '同源']]) {
    try { ins.run(id, f, t, label, now, now); done.push(id) } catch (e) { log(`${id} 跳过:`, e.message) }
  }
  db.close()
  return { dbPath, done }
}

function overlapArea(b1, b2) {
  const ox = Math.min(b1.x + b1.w, b2.x + b2.w) - Math.max(b1.x, b2.x)
  const oy = Math.min(b1.y + b1.h, b2.y + b2.h) - Math.max(b1.y, b2.y)
  return ox > 0 && oy > 0 ? +(ox * oy).toFixed(1) : 0
}

async function sceneB() {
  const userData = await freshUserData('lineage')
  const injected = injectLineage(userData)
  log('B 面注入', JSON.stringify(injected))
  const { app, win } = await launch(userData)
  await win.getByRole('button', { name: '脉络' }).waitFor({ timeout: 20_000 })
  await win.waitForTimeout(800)
  await win.getByRole('button', { name: '脉络' }).click()
  await win.waitForSelector('[data-edge-label]', { timeout: 20_000 })
  await win.waitForTimeout(1200)

  const audit = await win.evaluate(`(() => {
    const k = (() => { const t = document.querySelector('[data-viewport]')?.getAttribute('transform') || ''; const m = t.match(/scale\\(([\\d.]+)\\)/); return m ? +m[1] : 1 })()
    const labels = [...document.querySelectorAll('[data-edge-label]')].map(e => {
      const r = e.getBoundingClientRect()
      const fo = e.closest('foreignObject')
      const cs = getComputedStyle(e)
      return { text: (e.textContent || '').slice(0, 12), x: r.x, y: r.y, w: r.width, h: r.height, foW: fo ? +fo.getAttribute('width') : null, foH: fo ? +fo.getAttribute('height') : null, clamped: e.scrollHeight > e.clientHeight + 1, sh: e.scrollHeight, ch: e.clientHeight, fontStyle: cs.fontStyle, fontSize: cs.fontSize, color: cs.color, id: e.dataset.edgeLabel }
    })
    const nodes = [...document.querySelectorAll('[data-node-id]')].map(e => { const r = e.getBoundingClientRect(); return { id: e.dataset.nodeId, x: r.x, y: r.y, w: r.width, h: r.height } })
    return { k: +k.toFixed(3), labels, nodes }
  })()`)

  // B7:窄幅换行 ≤3 行——盒尺寸用 foreignObject DOM 属性(坐标无关);长标签截断=3 行装不下;短标签完整;斜体灰字
  const longLabels = audit.labels.filter(l => l.clamped)
  const shortLabel = audit.labels.find(l => l.text.startsWith('同源'))
  const foOK = audit.labels.every(l => l.foW !== null && l.foW <= 130 + 0.01 && l.foH !== null && l.foH <= 37.05 + 0.01)
  const visualK = audit.labels.length && audit.labels[0].foW ? +(audit.labels[0].w / audit.labels[0].foW).toFixed(3) : null
  pass('B7', audit.labels.length > 0 && foOK && longLabels.length >= 1 && shortLabel && !shortLabel.clamped
    && audit.labels.every(l => l.fontStyle === 'italic' && l.color === 'rgb(107, 114, 128)'),
    { labels: audit.labels.length, foOK, foSizes: audit.labels.map(l => [l.foW, l.foH]), visualWH: audit.labels.map(l => [+l.w.toFixed(1), +l.h.toFixed(1)]), viewportK: audit.k, visualK, longClampedN: longLabels.length, shortFull: shortLabel ? !shortLabel.clamped : null, styleOK: audit.labels.every(l => l.fontStyle === 'italic' && l.color === 'rgb(107, 114, 128)') })
  await win.screenshot({ path: join(OUT, 'v11-B7-labels.png') })

  // B8:两两零相交+不盖节点 → 适应视图 → 标签全可见(§2 口径;节点出视口=口径外观察项)
  const labelOverlaps = [], nodeOverlaps = []
  for (let i = 0; i < audit.labels.length; i++) for (let j = i + 1; j < audit.labels.length; j++) {
    const o = overlapArea(audit.labels[i], audit.labels[j]); if (o > 0) labelOverlaps.push({ pair: [audit.labels[i].text, audit.labels[j].text], area: o })
  }
  for (const l of audit.labels) for (const n of audit.nodes) {
    const o = overlapArea(l, n); if (o > 0) nodeOverlaps.push({ label: l.text, node: n.id, area: o })
  }
  await win.getByRole('button', { name: '适应视图' }).click()
  await win.waitForTimeout(1000)
  const fitAudit = await win.evaluate(`(() => {
    const svg = document.querySelector('[data-viewport]')?.closest('svg')?.getBoundingClientRect()
    const labels = [...document.querySelectorAll('[data-edge-label]')].map(e => e.getBoundingClientRect())
    const nodes = [...document.querySelectorAll('[data-node-id]')].map(e => { const r = e.getBoundingClientRect(); return { id: e.dataset.nodeId, r } })
    const inside = (r) => r.x >= svg.x - 1 && r.y >= svg.y - 1 && r.right <= svg.right + 1 && r.bottom <= svg.bottom + 1
    return { svg: { x: +svg.x.toFixed(0), y: +svg.y.toFixed(0), w: +svg.width.toFixed(0), h: +svg.height.toFixed(0) }, labelsIn: labels.filter(inside).length, labelsTotal: labels.length, nodesIn: nodes.filter(n => inside(n.r)).length, nodesTotal: nodes.length, outNodes: nodes.filter(n => !inside(n.r)).map(n => ({ id: n.id, rect: { x: +n.r.x.toFixed(0), y: +n.r.y.toFixed(0), w: +n.r.width.toFixed(0), h: +n.r.height.toFixed(0) } })) }
  })()`)
  if (fitAudit.outNodes.length > 0) {
    observe('适应视图后节点出视口(§2 口径外——口径只要求标签全可见;auto-fit 包围盒疑似未含全部节点,登记待查)', { outNodes: fitAudit.outNodes, svg: fitAudit.svg, k: audit.k })
  }
  pass('B8', labelOverlaps.length === 0 && nodeOverlaps.length === 0 && fitAudit.labelsIn === fitAudit.labelsTotal,
    { labelOverlaps, nodeOverlaps, labelsIn: fitAudit.labelsIn, labelsTotal: fitAudit.labelsTotal, nodesIn: `${fitAudit.nodesIn}/${fitAudit.nodesTotal}` })
  await win.screenshot({ path: join(OUT, 'v11-B8-fitview.png') })

  // B9a:截断标签 hover+滚轮 → 标签内滚动+画布不缩放
  const long = [...audit.labels].filter(l => l.clamped).sort((a, b) => b.sh - a.sh)[0] || audit.labels[0]
  const tBefore = await win.evaluate(`document.querySelector('[data-viewport]')?.getAttribute('transform')`)
  await win.mouse.move(long.x + long.w / 2, long.y + Math.min(long.h / 2, 10))
  await win.waitForTimeout(300)
  await win.mouse.wheel(0, 120)
  await win.waitForTimeout(300)
  const afterA = await win.evaluate(`(() => {
    const el = [...document.querySelectorAll('[data-edge-label]')].find(e => (e.textContent || '').startsWith(${JSON.stringify(long.text.slice(0, 4))}))
    return { scrollTop: el ? +el.scrollTop.toFixed(1) : null, transform: document.querySelector('[data-viewport]')?.getAttribute('transform') }
  })()`)
  pass('B9a', afterA.scrollTop > 0 && tBefore === afterA.transform, { target: long.text, clamped: long.clamped, scrollTop: afterA.scrollTop, transformUnchanged: tBefore === afterA.transform })
  await win.screenshot({ path: join(OUT, 'v11-B9a-hover-scroll.png') })

  // B9b:短标签 hover+滚轮 → 画布缩放触发(transform 变化)+标签自身不滚
  const tBeforeB = await win.evaluate(`document.querySelector('[data-viewport]')?.getAttribute('transform')`)
  await win.mouse.move(shortLabel.x + shortLabel.w / 2, shortLabel.y + shortLabel.h / 2)
  await win.waitForTimeout(300)
  await win.mouse.wheel(0, -120)
  await win.waitForTimeout(400)
  const afterB = await win.evaluate(`(() => {
    const el = [...document.querySelectorAll('[data-edge-label]')].find(e => (e.textContent || '').startsWith('同源'))
    return { scrollTop: el ? +el.scrollTop.toFixed(1) : null, transform: document.querySelector('[data-viewport]')?.getAttribute('transform') }
  })()`)
  pass('B9b', tBeforeB !== afterB.transform, { short: shortLabel.text, zoomed: tBeforeB !== afterB.transform, shortScrollTop: afterB.scrollTop })
  await win.screenshot({ path: join(OUT, 'v11-B9b-short-zoom.png') })
  await app.close()
}

/** ============ 幕二:A 面(阅读器,干净副本+注入旧格式标注) ============ */

/** 注入「修复前碎裂形态」旧标注:7 块(行内错位重叠+零宽幽灵+跨行垂落重叠) */
function injectOldAnnotation(userData) {
  const pointer = JSON.parse(readFileSync(join(userData, 'workspace.json'), 'utf8'))
  const dbPath = join(userData, 'workspaces', pointer.currentId, 'synapse.db')
  const db = new DatabaseSync(dbPath)
  const paper = db.prepare('SELECT id, title FROM papers ORDER BY added_at LIMIT 1').all()[0]
  if (!paper) throw new Error('papers 空')
  const rects = [
    { page: 1, x: 0.10, y: 0.300, w: 0.45, h: 0.018 },
    { page: 1, x: 0.42, y: 0.300, w: 0.48, h: 0.035 },
    { page: 1, x: 0.10, y: 0.330, w: 0.80, h: 0.018 },
    { page: 1, x: 0.55, y: 0.331, w: 0.35, h: 0.018 },
    { page: 1, x: 0.10, y: 0.358, w: 0.60, h: 0.018 },
    { page: 1, x: 0.50, y: 0.360, w: 0.40, h: 0.018 },
    { page: 1, x: 0.95, y: 0.300, w: 0.0001, h: 0.018 }
  ]
  const now = new Date().toISOString()
  db.prepare(`INSERT INTO annotations (id, paper_id, page, kind, color, quote_text, prefix_text, suffix_text, start_offset, end_offset, rects_json, sort_key, comment, created_at, updated_at)
    VALUES ('v11-old-legacy', ?, 1, 'highlight', 'yellow', 'legacy broken rects injected for acceptance', '', '', 0, 10, ?, 'v11-old', '', ?, ?)`).run(paper.id, JSON.stringify(rects), now, now)
  db.close()
  return { paper: paper.title, rectsInjected: rects.length }
}

/** 拖选起止采样:行高估计+跨 targetLines 行;返回 null=无可用干净起点 */
async function pickDrag(win, anchorIdx, targetLines) {
  await win.evaluate(`(() => {
    const spans = [...document.querySelectorAll('[data-page-root] .textLayer span')]
      .filter(sp => sp.firstChild && sp.firstChild.nodeType === 3 && sp.textContent.length > 0)
    spans[${anchorIdx}]?.scrollIntoView({ block: 'center' })
  })()`)
  await win.waitForTimeout(400)
  return win.evaluate(`(() => {
    const spans = [...document.querySelectorAll('[data-page-root] .textLayer span')]
      .filter(sp => sp.firstChild && sp.firstChild.nodeType === 3 && sp.textContent.length > 0)
    const vis = spans.map((s, i) => ({ i, r: s.getBoundingClientRect() })).filter(o => o.r.y > 120 && o.r.y < 620 && o.r.width > 5 && o.r.x > 30)
    if (vis.length < 5) return null
    const a = vis[0]
    const startY = Math.round(a.r.y)
    const ys = [...new Set(vis.map(o => Math.round(o.r.y)))].sort((p, q) => p - q)
    const idx = ys.indexOf(startY)
    if (idx < 0) return null
    const endY = ys[Math.min(idx + ${targetLines}, ys.length - 1)]
    const ends = vis.filter(o => Math.round(o.r.y) === endY)
    const end = ends.length ? ends[Math.floor(ends.length * 0.4)] : vis[vis.length - 1]
    const sx = a.r.x + a.r.width / 2, sy = a.r.y + a.r.height / 2
    const covered = [...document.querySelectorAll('[data-testid="annotation-rect"]')].some(e => { const b2 = e.getBoundingClientRect(); return sx >= b2.x && sx <= b2.right && sy >= b2.y && sy <= b2.bottom })
    return { x1: sx, y1: sy, x2: end.r.x + end.r.width * 0.3, y2: end.r.y + end.r.height / 2, coveredStart: covered, lines: Math.min(idx + ${targetLines}, ys.length - 1) - idx + 1 }
  })()`)
}

async function sceneA() {
  const userData = await freshUserData('reader')
  const inj = injectOldAnnotation(userData)
  log('A 面注入旧格式标注', JSON.stringify(inj))
  const { app, win } = await launch(userData)
  await openPaperFromLibrary(win, inj.paper)

  // A3-open:旧碎裂标注打开即看(挂 B 读时归并——渲染面每行一块/零宽幽灵消失/无叠)
  await win.evaluate(`(() => {
    const el = [...document.querySelectorAll('[data-testid="annotation-rect"]')].find(e => e.getBoundingClientRect().width > 5)
    el?.scrollIntoView({ block: 'center' })
  })()`)
  await win.waitForTimeout(600)
  const oldAudit = (await win.evaluate(auditExpr(`['v11-old-legacy']`)))[0]
  pass('A3-open', !!oldAudit && oldAudit.perLineOneBlock && oldAudit.zeroW === 0 && oldAudit.interFail.length === 0 && oldAudit.dupPairs.length === 0 && oldAudit.rowGroups === 3,
    { found: !!oldAudit, ...(oldAudit || {}) })
  if (oldAudit) await clipShot(win, null, 'v11-A3-old-legacy.png')

  // A5:干净文字处真鼠标跨 3~5 行拖选 → 计时弹条(避开注入行:锚点取远处 span)
  let pts = null
  for (const [anchor, tag] of [[160, 'a160'], [260, 'a260'], [360, 'a360']]) {
    pts = await pickDrag(win, anchor, 4, tag)
    if (pts && !pts.coveredStart) break
  }
  if (!pts) { pass('A5', false, { skipped: true, reason: '无可测干净区段' }) }
  else {
    const t0 = Date.now()
    await realDrag(win, pts.x1, pts.y1, pts.x2, pts.y2)
    await win.waitForSelector('[data-testid="selection-toolbar"]', { timeout: 8000 })
    const popMs = Date.now() - t0
    const tb = await win.evaluate(`(() => {
      const t = document.querySelector('[data-testid="selection-toolbar"]')
      const sel = getSelection()
      return { present: !!t, visible: !!t && t.getBoundingClientRect().height > 0, selLen: sel && !sel.isCollapsed ? sel.toString().length : 0, selText: sel ? sel.toString().slice(0, 30) : '' }
    })()`)
    pass('A5', !pts.coveredStart && tb.present && tb.visible && tb.selLen > 0 && popMs < 1000,
      { coveredStart: pts.coveredStart, dragLines: pts.lines, popMs, ...tb })
    await win.screenshot({ path: join(OUT, 'v11-A5-toolbar.png') })

    // A1:弹条在手 → 点高亮 → 新标注几何断言(每行一块/缝隙/相交/重复)
    const idsBefore = await win.evaluate(`(() => [...document.querySelectorAll('[data-testid="annotation-rect"]')].map(e => e.dataset.annotationId))()`)
    await win.getByRole('button', { name: '高亮' }).click()
    await win.waitForTimeout(900)
    await win.evaluate(`(() => {
      const before = ${JSON.stringify([...idsBefore])}
      const el = [...document.querySelectorAll('[data-testid="annotation-rect"]')].find(e => !before.includes(e.dataset.annotationId) && e.getBoundingClientRect().width > 5)
      el?.scrollIntoView({ block: 'center' })
    })()`)
    await win.waitForTimeout(400)
    const hlAll = await win.evaluate(auditExpr(`null`))
    const h1 = hlAll.find(a => !idsBefore.includes(a.id))
    pass('A1', !!h1 && h1.perLineOneBlock && h1.zeroW === 0 && h1.interFail.length === 0 && h1.dupPairs.length === 0 && h1.rowGroups >= 3 && (h1.gapsMin === null || h1.gapsMin >= -0.6),
      { ...(h1 || { found: false }) })
    await clipShot(win, idsBefore, 'v11-A1-highlight.png')
  }

  // A2:换区段跨 ~4 行拖选 → 下划线 → 每行一条细线/底边平齐/无双线
  let pts2 = null
  for (const anchor of [420, 520, 200, 600]) {
    const cand = await pickDrag(win, anchor, 4, 'u')
    if (cand && !cand.coveredStart && cand.lines >= 4) { pts2 = cand; break }
  }
  if (!pts2) { pass('A2', false, { skipped: true, reason: '无第二干净区段' }) }
  else {
    await realDrag(win, pts2.x1, pts2.y1, pts2.x2, pts2.y2)
    await win.waitForSelector('[data-testid="selection-toolbar"]', { timeout: 8000 })
    const idsB2 = await win.evaluate(`(() => [...document.querySelectorAll('[data-testid="annotation-rect"]')].map(e => e.dataset.annotationId))()`)
    await win.getByRole('button', { name: '下划线' }).click()
    await win.waitForTimeout(900)
    await win.evaluate(`(() => {
      const before = ${JSON.stringify([...idsB2])}
      const el = [...document.querySelectorAll('[data-testid="annotation-rect"]')].find(e => !before.includes(e.dataset.annotationId) && e.getBoundingClientRect().width > 5)
      el?.scrollIntoView({ block: 'center' })
    })()`)
    await win.waitForTimeout(400)
    const ulAll = await win.evaluate(auditExpr(`null`))
    const u1 = ulAll.find(a => !idsB2.includes(a.id))
    pass('A2', !!u1 && u1.perLineOneBlock && u1.dupPairs.length === 0 && u1.zeroW === 0 && u1.bottomSpread < 1.5 && u1.hMax < 6 && u1.rowGroups >= 3,
      { ...(u1 || { found: false }), lineBody: 'hMax<6=细线非色带', dragLines: pts2.lines })
    await clipShot(win, idsB2, 'v11-A2-underline.png')
  }

  // A3-reopen:文献库往返重开同篇 → 全部 id 仍在+归并态保持(挂 A 重开重锚)
  const idsAll = await win.evaluate(`(() => [...document.querySelectorAll('[data-testid="annotation-rect"]')].map(e => e.dataset.annotationId))()`)
  await openPaperFromLibrary(win, inj.paper)
  await win.evaluate(`(() => {
    const el = [...document.querySelectorAll('[data-testid="annotation-rect"]')].find(e => e.getBoundingClientRect().width > 5)
    el?.scrollIntoView({ block: 'center' })
  })()`)
  await win.waitForTimeout(600)
  const reAudits = await win.evaluate(auditExpr(`null`))
  const reSum = sumAnnots(reAudits)
  const kept = idsAll.filter(id => reAudits.some(a => a.id === id)).length
  pass('A3-reopen', kept === idsAll.length && idsAll.length > 0 && reSum.ok, { before: idsAll.length, kept, ...reSum })
  await win.screenshot({ path: join(OUT, 'v11-A3-reopen.png') })

  // A4/A6:叠深(单条内部均匀)+反向(行间深缝=gapsMin/字符间深条=行内单块/盖字感=近景截图)
  const finalGaps = reAudits.map(a => a.gapsMin).filter(g => g !== null)
  pass('A4+A6', reSum.ok && finalGaps.every(g => g >= -0.6), { styleUniformAll: reAudits.every(a => a.styleUniform), gapsMinAll: finalGaps.length ? Math.min(...finalGaps) : null, perLineOneBlockAll: reAudits.every(a => a.perLineOneBlock), dupPairsAll: reAudits.reduce((s, a) => s + a.dupPairs.length, 0) })
  await app.close()
}

/** 新标注近景截图(idsBefore=null 时按 v11-old-legacy 单条 clip) */
async function clipShot(win, idsBefore, name) {
  const shot = await win.evaluate(`(() => {
    const before = ${JSON.stringify([...(idsBefore || [])])}
    const els = [...document.querySelectorAll('[data-testid="annotation-rect"]')].filter(e => ${idsBefore ? `!before.includes(e.dataset.annotationId)` : `e.dataset.annotationId === 'v11-old-legacy'`})
    if (!els.length) return null
    let x1 = 1e9, y1 = 1e9, x2 = -1e9, y2 = -1e9
    for (const el of els) { const r = el.getBoundingClientRect(); x1 = Math.min(x1, r.x); y1 = Math.min(y1, r.y); x2 = Math.max(x2, r.right); y2 = Math.max(y2, r.bottom) }
    return { x: Math.max(x1 - 60, 0), y: Math.max(y1 - 60, 0), w: Math.min(x2 - x1 + 120, 1280), h: Math.min(y2 - y1 + 120, 900) }
  })()`)
  if (shot && Number.isFinite(shot.w) && shot.w > 0) {
    await win.screenshot({ path: join(OUT, name), clip: { x: shot.x, y: shot.y, width: Math.min(shot.w, 1280), height: Math.min(shot.h, 900) } })
  }
}

async function main() {
  if (!existsSync(join(ROOT, 'out', 'main', 'index.js'))) throw new Error('先 build')
  await mkdir(OUT, { recursive: true })
  await sceneB()
  await sceneA()
  const items = Object.entries(R.items)
  const fails = items.filter(([, v]) => !v.pass).map(([k]) => k)
  R.verdict = fails.length === 0 ? 'ALL-PASS' : `FAIL:${fails.join(',')}`
  writeFileSync(join(OUT, 'v11-accept.json'), JSON.stringify(R, null, 2))
  console.log(`\nV11 ACCEPT: ${R.verdict}`)
  if (fails.length) process.exitCode = 1
}

await main().catch((e) => { console.error(e); process.exit(1) })
