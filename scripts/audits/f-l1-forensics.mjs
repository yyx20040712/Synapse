/**
 * F-L1 脉络边标签换行变体取证——案册(docs/design/2026-08-30_edge-label-wrap-
 * options.md)截图产物生成器。
 * 配方:真实库副本+node:sqlite 直插 2 条长 label ref 边(AI 笔记导入形态
 * 40+ 字阐述句;直插绕 service 守卫=副本取证惯例)→启动应用→脉络视图→
 * 临时变体开关 window.__edgeVariant(补丁读取,A/B/C)逐态截图+量测。
 * 产物:scripts/audits/f-l1-out/variant-{A,B,C}.png + f-l1-forensics.json
 */
import { _electron as electron } from '@playwright/test'
import { cp, mkdir, rm } from 'node:fs/promises'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

const ROOT = process.cwd()
const OUT = join(ROOT, 'scripts', 'audits', 'f-l1-out')
const R = { meta: { script: 'f-l1-forensics.mjs', date: new Date().toISOString() }, variants: {} }
const log = (...a) => console.log(`[f-l1 ${new Date().toISOString().slice(11, 19)}]`, ...a)

/** AI 笔记导入形态的关系阐述长句 */
const LONG_LABELS = [
  '该方法以水锤特征线法为基础引入瞬变流分析框架,为后续管网瞬态模拟奠定了理论前提与数值边界条件',
  '两篇工作在边界条件处理上一脉相承:前者提出阀门关闭分段线性化假设,后者将其推广到复杂拓扑并给出稳定域证明'
]

function injectLongLabelEdges(userData) {
  const pointer = JSON.parse(readFileSync(join(userData, 'workspace.json'), 'utf8'))
  const dbPath = join(userData, 'workspaces', pointer.currentId, 'synapse.db')
  if (!existsSync(dbPath)) throw new Error(`库不存在: ${dbPath}`)
  const db = new DatabaseSync(dbPath)
  const edges = db.prepare('SELECT from_node, to_node FROM lineage_edges ORDER BY created_at').all()
  const nodes = db.prepare('SELECT id FROM lineage_nodes').all()
  if (edges.length < 2 || nodes.length < 2) throw new Error(`脉络数据不足(edges=${edges.length})`)
  // 复用既有边的端点交叉组合(两端必在树内;ref 边不参与布局,渲染面等价)
  const pairs = [
    [edges[0].from_node, edges[1].to_node],
    [edges[1].from_node, edges[0].to_node]
  ]
  const now = new Date().toISOString()
  const ins = db.prepare(
    "INSERT INTO lineage_edges (id, from_node, to_node, label, kind, created_at, updated_at) VALUES (?, ?, ?, ?, 'ref', ?, ?)"
  )
  let n = 0
  for (let i = 0; i < pairs.length; i++) {
    const [f, t] = pairs[i]
    if (f === t) continue
    try {
      ins.run(`f-l1-forensics-${i}`, f, t, LONG_LABELS[i], now, now)
      n += 1
    } catch (e) {
      log(`边 ${i} 插入跳过(UNIQUE 冲突等):`, e.message)
    }
  }
  db.close()
  return { dbPath, inserted: n }
}

async function main() {
  // 单变体模式:变体默认值由调用方 sed 进补丁后重建(React 无状态可借——
  // viewport transform 命令式直写/节点 pointerdown 不必然重渲,构建期定值唯一可靠)
  const VARIANT = process.argv[2] ?? 'A'
  if (!existsSync(join(ROOT, 'out', 'main', 'index.js'))) throw new Error('先 build')
  await mkdir(OUT, { recursive: true })
  const src = join(process.env.APPDATA, 'Synapse')
  const userData = join(tmpdir(), 'synapse-f-l1')
  await rm(userData, { recursive: true, force: true })
  for (const p of ['workspaces', 'ai-sensor']) await cp(join(src, p), join(userData, p), { recursive: true })
  for (const f of ['settings.json', 'workspace.json', 'window-state.json']) {
    if (existsSync(join(src, f))) await cp(join(src, f), join(userData, f))
  }
  R.inject = injectLongLabelEdges(userData)
  log('注入', JSON.stringify(R.inject))

  const app = await electron.launch({ args: ['out/main/index.js'], env: { ...process.env, SYNAPSE_USER_DATA: userData } })
  const win = await app.firstWindow()
  await win.getByRole('button', { name: '脉络' }).waitFor({ timeout: 20_000 })
  await win.waitForTimeout(800)
  await win.getByRole('button', { name: '脉络' }).click()
  await win.waitForSelector('[data-edge-id]', { timeout: 20_000 })
  await win.waitForTimeout(1200)

  const m = await win.evaluate(`(() => {
    const els = [...document.querySelectorAll('[data-edge-label]')]
    return els.map(e => {
      const fo = e.closest('foreignObject')
      const cs = getComputedStyle(e)
      const r = e.getBoundingClientRect()
      const foW = fo ? +fo.getAttribute('width') : null
      return { text: (e.textContent || '').slice(0, 14), foW, foH: fo ? +fo.getAttribute('height') : null, clamp: cs.webkitLineClamp, fs: cs.fontSize, visual: { w: +r.width.toFixed(1), h: +r.height.toFixed(1) } }
    })
  })()`)
  R.variants[VARIANT] = m
  log(`变体 ${VARIANT}`, JSON.stringify(m))
  await win.screenshot({ path: join(OUT, `variant-${VARIANT}.png`) })
  await app.close()
  writeFileSync(join(OUT, `f-l1-variant-${VARIANT}.json`), JSON.stringify(R, null, 2))
  console.log(`F-L1 VARIANT ${VARIANT} DONE`)
}

await main().catch((e) => { console.error(e); process.exit(1) })
