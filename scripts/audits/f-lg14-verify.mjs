/**
 * F-LG14 一次性真机复验探针——卡底行含金量+标签组+侧板标签增删持久化
 * （票面 §5 ①~④）。
 * crib f-lg13-verify.mjs（freshUserData 真实库副本+Electron 短暂开窗=LOOP
 * 取证惯例）+f-v2-diag.mjs（SYNAPSE_USER_DATA 隔离）。
 *
 * 复验四值：
 *  ① 含金量节点底行「引 42 · T1档」可见（种子 papers.cited_by_count=42+
 *    venue='Nature Water'→T1 映射）+未映射/无缓存节点「引 — · 未定」占位
 *    +主题节点无含金量段；
 *  ② 带 tags 种子节点→卡面标签块渲染（data-card-tags 外框+data-card-tag
 *    小块计数）——**探针改道申报**：lineage/import 走 main 侧系统文件对话框
 *    （INV-07）不可自动化驱动，draft→落库链由单测真库覆盖
 *    （lineage-tags.test「draft tags 落库/去重」），真机以等价 DB 态驱动
 *    渲染面（graph 通道→store→卡 DOM 全链真实）；
 *  ③ 侧板加删标签持久化：加「侧板新签」→删「早期」→关窗重开→新签在场/
 *    早期缺席（双向重开取证）；
 *  ④ pageerror 0（两次启动合计）。
 * 产物：scripts/audits/f-lg14-verify.json + f-lg14-verify.png。
 * 前置：npm run build（探针消费 out/main/index.js）；探针自管双 ABI
 * （种子相=node 态 better-sqlite3；开窗相=electron 态——sqlite-abi.mjs 切换）。
 */
import { _electron as electron } from '@playwright/test'
import { cp, mkdir, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

const ROOT = process.cwd()
const OUT = join(ROOT, 'scripts', 'audits')
await mkdir(OUT, { recursive: true })

const run = (cmd, args) => {
  const r = spawnSync(cmd, args, { stdio: 'pipe', shell: false })
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(' ')} 失败：${String(r.stderr)}`)
  return String(r.stdout)
}

/** 真实库副本（f-lg13-verify 同法）：保留用户实况 workspaces */
async function freshUserData() {
  const src = join(process.env.APPDATA, 'Synapse')
  const userData = join(tmpdir(), 'synapse-f-lg14-verify')
  await rm(userData, { recursive: true, force: true })
  for (const p of ['workspaces', 'ai-sensor']) await cp(join(src, p), join(userData, p), { recursive: true })
  for (const f of ['settings.json', 'workspace.json', 'window-state.json']) {
    if (existsSync(join(src, f))) await cp(join(src, f), join(userData, f))
  }
  return userData
}

const userData = await freshUserData()
const DB = join(userData, 'workspaces', 'default', 'synapse.db')

// ── 迁移相（electron ABI：真实应用首次启动把真实库副本升到 v7——
//    存量库零迁移兼容链的真机实证；种子前完成，种子脚本随后校验列在场） ──
run('node', ['scripts/sqlite-abi.mjs', 'use', 'electron'])
{
  const app = await electron.launch({
    args: ['out/main/index.js'],
    env: { ...process.env, SYNAPSE_USER_DATA: userData }
  })
  const win = await app.firstWindow()
  win.on('pageerror', (e) => pageErrors.push(String(e)))
  await win.getByRole('button', { name: '文献库' }).waitFor({ timeout: 20_000 })
  await app.close()
}

// ── 种子相（node ABI：better-sqlite3 直插含金量+标签受控数据） ────────
run('node', ['scripts/sqlite-abi.mjs', 'use', 'node'])
const seedPath = join(tmpdir(), 'synapse-f-lg14-seed.cjs')
await writeFile(seedPath, `const Database = require(${JSON.stringify(join(ROOT, 'node_modules', 'better-sqlite3'))})
const db = new Database(${JSON.stringify(DB)})
const version = db.pragma('user_version', { simple: true })
const hasTags = db.prepare("SELECT COUNT(*) AS c FROM pragma_table_info('lineage_nodes') WHERE name='tags'").get()
if (hasTags.c !== 1) throw new Error('迁移 007 未生效：lineage_nodes 无 tags 列（version=' + version + '）')
const now = new Date().toISOString()
const ins = db.prepare(
  "INSERT OR REPLACE INTO papers (id, file_ref, sha256, title, venue, cited_by_count, added_at, updated_at) VALUES (?,?,?,?,?,?,?,?)"
)
ins.run('f-lg14-p-metrics', 'f-lg14/seed-a.pdf', 'f-lg14-seed-a', 'F-LG14含金量验证文献', 'Nature Water', 42, now, now)
ins.run('f-lg14-p-plain', 'f-lg14/seed-b.pdf', 'f-lg14-seed-b', 'F-LG14无指标验证文献', '', null, now, now)
const node = db.prepare(
  "INSERT OR REPLACE INTO lineage_nodes (id, paper_id, title, core_idea, year, x, y, tags, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)"
)
node.run('f-lg14-n-metrics', 'f-lg14-p-metrics', 'F-LG14含金量验证文献', '种子节点（含金量+标签）', 2019, null, null, '["综述","早期"]', now, now)
node.run('f-lg14-n-plain', 'f-lg14-p-plain', 'F-LG14无指标验证文献', '种子节点（无指标占位）', 2021, null, null, null, now, now)
node.run('f-lg14-n-theme', null, 'F-LG14主题验证节点', '主题节点（无含金量面）', null, null, null, '["阶段一"]', now, now)
db.prepare(
  "INSERT OR REPLACE INTO lineage_edges (id, from_node, to_node, label, kind, created_at, updated_at) VALUES (?,?,?,?,?,?,?)"
).run('f-lg14-e-1', 'f-lg14-n-metrics', 'f-lg14-n-plain', '继承', 'tree', now, now)
db.close()
console.log('seeded at user_version=' + version)
`, 'utf8')
run('node', [seedPath])

// ── 开窗相（electron ABI：out/main 的 better-sqlite3 用 electron 预编译） ──
run('node', ['scripts/sqlite-abi.mjs', 'use', 'electron'])

const pageErrors = []
async function launchAndGo() {
  const app = await electron.launch({
    args: ['out/main/index.js'],
    env: { ...process.env, SYNAPSE_USER_DATA: userData }
  })
  app.process()?.stdout?.on('data', (d) => console.log('[main]', String(d).slice(0, 200)))
  const win = await app.firstWindow()
  win.on('pageerror', (e) => pageErrors.push(String(e)))
  await win.getByRole('button', { name: '文献库' }).waitFor({ timeout: 20_000 })
  await win.getByRole('button', { name: '脉络', exact: true }).click()
  await win.locator('svg g[data-node-id="f-lg14-n-metrics"]').waitFor({ timeout: 15_000 })
  await win.waitForTimeout(600)
  return { app, win }
}

const nodeFoot = (win, id) =>
  win.evaluate((nid) => {
    const g = document.querySelector(`svg g[data-node-id="${nid}"]`)
    const footer = g?.querySelector('[data-card-footer]')
    return {
      metrics: footer?.querySelector('[data-card-metrics]')?.textContent ?? null,
      tagTexts: [...(footer?.querySelectorAll('[data-card-tag]') ?? [])].map((t) => t.textContent),
      year: footer?.querySelector('[data-card-year]')?.textContent ?? null
    }
  }, id)

// ── 第 1 次启动：①含金量字面 ②标签块渲染 ③侧板加删 ──────────────────
const { app, win } = await launchAndGo()
const foot1 = await nodeFoot(win, 'f-lg14-n-metrics')
const foot2 = await nodeFoot(win, 'f-lg14-n-plain')
const foot3 = await nodeFoot(win, 'f-lg14-n-theme')

// ③ 侧板加删：单击含金量节点选中→侧板输入「侧板新签」+加→删「早期」
await win.locator('svg g[data-node-id="f-lg14-n-metrics"]').click()
await win.getByTestId('lineage-side-tags').waitFor({ timeout: 5_000 })
const chipsBefore = await win.getByTestId('lineage-side-tags').locator('[data-testid="lineage-tag-chip"]').allTextContents()
await win.getByTestId('lineage-tag-input').fill('侧板新签')
await win.getByTestId('lineage-side-tags').getByRole('button', { name: '+', exact: true }).click()
await win.waitForTimeout(150) // 输入框清空+写通道派发
await win.getByText('侧板新签').first().waitFor({ timeout: 10_000 })
await win.waitForTimeout(800) // autosave 落库（graph 不重取——卡面回填随 upsert 响应）
const chipAfterAdd = await nodeFoot(win, 'f-lg14-n-metrics')
// 删「早期」（移除钮 aria-label 单源定位）
await win.getByRole('button', { name: '移除标签 早期' }).click()
await win.waitForTimeout(1_000)
const chipAfterRemove = await nodeFoot(win, 'f-lg14-n-metrics')
await win.screenshot({ path: join(OUT, 'f-lg14-verify.png'), fullPage: false })
await app.close()

// ── 第 2 次启动：重开在场性（加者在场/删者缺席） ──────────────────────
const second = await launchAndGo()
const footReopen = await nodeFoot(second.win, 'f-lg14-n-metrics')
await second.app.close()

// ── 收尾：ABI 还原 node（后续 npm test 口径） ─────────────────────────
run('node', ['scripts/sqlite-abi.mjs', 'use', 'node'])

const c1 = {
  metricsNode: foot1,
  plainNode: foot2,
  themeNode: foot3,
  pass:
    foot1.metrics === '引 42 · T1档' &&
    foot2.metrics === '引 — · 未定' &&
    foot3.metrics === null
}
const c2 = {
  seedTags: foot1.tagTexts,
  pass: foot1.tagTexts.join(',') === '综述,早期' && foot3.tagTexts.join(',') === '阶段一' && foot2.tagTexts.length === 0
}
const c3 = {
  chipsBefore,
  afterAdd: chipAfterAdd.tagTexts,
  afterRemove: chipAfterRemove.tagTexts,
  reopen: footReopen.tagTexts,
  pass:
    chipAfterAdd.tagTexts.includes('侧板新签') &&
    !chipAfterRemove.tagTexts.includes('早期') &&
    footReopen.tagTexts.includes('侧板新签') &&
    !footReopen.tagTexts.includes('早期')
}
const c4 = { count: pageErrors.length, pass: pageErrors.length === 0, detail: pageErrors.slice(0, 3) }

const result = {
  when: new Date().toISOString(),
  c1_metricsLiteral: c1,
  c2_tagsRender: c2,
  c3_sidePanelPersist: c3,
  c4_pageErrors: c4,
  pass: c1.pass && c2.pass && c3.pass && c4.pass
}
await writeFile(join(OUT, 'f-lg14-verify.json'), JSON.stringify(result, null, 2), 'utf8')
console.log(JSON.stringify(result, null, 2))
process.exit(result.pass ? 0 : 1)
