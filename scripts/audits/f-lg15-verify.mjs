/**
 * F-LG15 一次性真机复验探针——人工第二父文献连线（票面 §5 ①~⑤）。
 * crib f-lg14-verify.mjs（freshUserData 真实库副本+Electron 短暂开窗=LOOP
 * 取证惯例）+f-v2-diag.mjs（SYNAPSE_USER_DATA 隔离）。
 *
 * 复验五值：
 *  ① 菜单连第二父：右键子文献→「连接父文献…」→搜索+选取+逻辑线说明→连接
 *    →琥珀虚线边在场（path stroke=var(--manual-edge)+dasharray 7 5）；
 *  ② label 编辑持久化：「管理人工连线…」改说明→保存→关窗重开→新说明在场
 *    （DB 持久化取证，双向：旧值缺席）；
 *  ③ 再连第三父（不限条数=用户裁决）：第二个 manual 边照常创建（两条 manual
 *    同子共存）；
 *  ④ 造环被拒：子（有 tree 父 P1→P4）反向连 P4 为父→service 环守卫拒
 *    →toast role=alert「成环拒绝」可见；
 *  ⑤ pageerror 0（两次启动合计）。
 * 产物：scripts/audits/f-lg15-verify.json + f-lg15-verify.png。
 * 前置：npm run build（探针消费 out/main/index.js）；探针自管双 ABI
 * （种子相=node 态 better-sqlite3；开窗相=electron 态——sqlite-abi.mjs 切换）。
 * 零迁移申报：kind 列无 CHECK（004/006），本票零迁移——种子直插 kind 值验证。
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

/** 真实库副本（f-lg14-verify 同法）：保留用户实况 workspaces */
async function freshUserData() {
  const src = join(process.env.APPDATA, 'Synapse')
  const userData = join(tmpdir(), 'synapse-f-lg15-verify')
  await rm(userData, { recursive: true, force: true })
  for (const p of ['workspaces', 'ai-sensor']) await cp(join(src, p), join(userData, p), { recursive: true })
  for (const f of ['settings.json', 'workspace.json', 'window-state.json']) {
    if (existsSync(join(src, f))) await cp(join(src, f), join(userData, f))
  }
  return userData
}

const userData = await freshUserData()
const DB = join(userData, 'workspaces', 'default', 'synapse.db')

// ── 种子相（node ABI：better-sqlite3 直插受控四节点+一 tree 边） ────────
run('node', ['scripts/sqlite-abi.mjs', 'use', 'node'])
const seedPath = join(tmpdir(), 'synapse-f-lg15-seed.cjs')
await writeFile(seedPath, `const Database = require(${JSON.stringify(join(ROOT, 'node_modules', 'better-sqlite3'))})
const db = new Database(${JSON.stringify(DB)})
const now = new Date().toISOString()
const ins = db.prepare(
  "INSERT OR REPLACE INTO papers (id, file_ref, sha256, title, venue, cited_by_count, added_at, updated_at) VALUES (?,?,?,?,?,?,?,?)"
)
ins.run('f-lg15-p-origin', 'f-lg15/origin.pdf', 'f-lg15-s-origin', 'F-LG15起源方法', '', null, now, now)
ins.run('f-lg15-p-para1', 'f-lg15/para1.pdf', 'f-lg15-s-para1', 'F-LG15平行路线甲', '', null, now, now)
ins.run('f-lg15-p-para2', 'f-lg15/para2.pdf', 'f-lg15-s-para2', 'F-LG15平行路线乙', '', null, now, now)
ins.run('f-lg15-p-child', 'f-lg15/child.pdf', 'f-lg15-s-child', 'F-LG15子文献', '', null, now, now)
const node = db.prepare(
  "INSERT OR REPLACE INTO lineage_nodes (id, paper_id, title, core_idea, year, x, y, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)"
)
node.run('f-lg15-n-origin', 'f-lg15-p-origin', 'F-LG15起源方法', '种子', 2019, null, null, now, now)
node.run('f-lg15-n-para1', 'f-lg15-p-para1', 'F-LG15平行路线甲', '种子', 2019, null, null, now, now)
node.run('f-lg15-n-para2', 'f-lg15-p-para2', 'F-LG15平行路线乙', '种子', 2020, null, null, now, now)
node.run('f-lg15-n-child', 'f-lg15-p-child', 'F-LG15子文献', '种子', 2021, null, null, now, now)
db.prepare(
  "INSERT OR REPLACE INTO lineage_edges (id, from_node, to_node, label, kind, created_at, updated_at) VALUES (?,?,?,?,?,?,?)"
).run('f-lg15-e-tree', 'f-lg15-n-origin', 'f-lg15-n-child', '主要继承', 'tree', now, now)
db.close()
console.log('seeded 4 nodes + 1 tree edge')
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
  await win.locator('svg g[data-node-id="f-lg15-n-child"]').waitFor({ timeout: 15_000 })
  await win.waitForTimeout(600)
  return { app, win }
}

/** manual 边 DOM 断言数据：全部 path 的 stroke/dasharray（按 data-edge-id） */
const edgeStyles = (win) =>
  win.evaluate(() => {
    const out = {}
    for (const p of document.querySelectorAll('svg path[data-edge-id]')) {
      out[p.getAttribute('data-edge-id')] = {
        stroke: p.getAttribute('stroke'),
        width: p.getAttribute('stroke-width'),
        dash: p.getAttribute('stroke-dasharray')
      }
    }
    return out
  })

/** 右键开菜单（视口内安全锚点——节点卡可能贴视口缘，Playwright 元素中心
 *  右键会使 fixed 菜单越界「outside of the viewport」；dispatchEvent 指定
 *  clientX/Y 与单测同款，锚点恒在视口内） */
const openMenu = (win, nodeId) =>
  win.evaluate((nid) => {
    const g = document.querySelector(`svg g[data-node-id="${nid}"]`)
    g.dispatchEvent(
      new MouseEvent('contextmenu', { clientX: 300, clientY: 220, bubbles: true, cancelable: true })
    )
  }, nodeId)

const edgeLabel = (win, id) =>
  win.evaluate((eid) => document.querySelector(`[data-edge-label="${eid}"]`)?.textContent ?? null, id)

// ── 第 1 次启动：①连第二父 ②label 编辑 ③连第三父 ④造环拒 ──────────────
const { app, win } = await launchAndGo()

// ① 右键子文献→连接父文献…→搜索「甲」→选取→逻辑线说明→连接
await openMenu(win, 'f-lg15-n-child')
await win.getByRole('menuitem', { name: '连接父文献…' }).click()
await win.getByTestId('manual-parent-search').fill('甲')
await win.getByRole('button', { name: /F-LG15平行路线甲/ }).click()
await win.getByTestId('manual-parent-label').fill('研究者补判的方法源头')
await win.getByRole('button', { name: '连接', exact: true }).click()
await win.waitForTimeout(1_200) // autosave 落库+边渲染
const styles1 = await edgeStyles(win)
const manualEdgeId = Object.keys(styles1).find((id) => styles1[id].stroke === 'var(--manual-edge)') ?? null
const c1 = {
  manualEdgeId,
  stroke: manualEdgeId ? styles1[manualEdgeId].stroke : null,
  dash: manualEdgeId ? styles1[manualEdgeId].dash : null,
  width: manualEdgeId ? styles1[manualEdgeId].width : null,
  label: manualEdgeId ? await edgeLabel(win, manualEdgeId) : null,
  pass:
    manualEdgeId !== null &&
    styles1[manualEdgeId].stroke === 'var(--manual-edge)' &&
    styles1[manualEdgeId].dash === '7 5' &&
    (await edgeLabel(win, manualEdgeId)) === '研究者补判的方法源头'
}

// ② label 编辑持久化（先记新边 id 供重开取证）——右键子文献→管理人工连线…
await openMenu(win, 'f-lg15-n-child')
await win.getByRole('menuitem', { name: '管理人工连线…' }).click()
const labelInput = win.getByTestId('manual-edge-label')
await labelInput.fill('再判：修正的逻辑线')
await win.getByRole('button', { name: '保存', exact: true }).click()
await win.waitForTimeout(1_200) // 更新落库
await win.getByRole('dialog').locator('button', { hasText: /^关闭$/ }).click()
const labelAfterEdit = manualEdgeId !== null ? await edgeLabel(win, manualEdgeId) : null

// ③ 再连第三父（不限条数）：平行路线乙
await openMenu(win, 'f-lg15-n-child')
await win.getByRole('menuitem', { name: '连接父文献…' }).click()
await win.getByTestId('manual-parent-search').fill('乙')
await win.getByRole('button', { name: /F-LG15平行路线乙/ }).click()
await win.getByTestId('manual-parent-label').fill('问题同源')
await win.getByRole('button', { name: '连接', exact: true }).click()
await win.waitForTimeout(1_200)
const styles3 = await edgeStyles(win)
const manualCount = Object.values(styles3).filter((s) => s.stroke === 'var(--manual-edge)').length
const c3 = { manualCount, pass: manualCount === 2 }
await win.screenshot({ path: join(OUT, 'f-lg15-verify.png'), fullPage: false })

// ④ 造环被拒：右键起源节点→连接父文献…→选子文献（P1→P4 tree 在，P4→P1 manual
//    成环被 service 拒）→toast role=alert「成环拒绝」
await openMenu(win, 'f-lg15-n-origin')
await win.getByRole('menuitem', { name: '连接父文献…' }).click()
await win.getByTestId('manual-parent-search').fill('子文献')
await win.getByRole('button', { name: /F-LG15子文献/ }).click()
await win.getByRole('button', { name: '连接', exact: true }).click()
await win.getByRole('alert').waitFor({ timeout: 10_000 })
const toastText = await win.getByRole('alert').textContent()
const stylesAfterLoop = await edgeStyles(win)
const manualCountAfterLoop = Object.values(stylesAfterLoop).filter(
  (s) => s.stroke === 'var(--manual-edge)'
).length
const c4 = {
  toastText,
  manualCountAfterLoop,
  pass: (toastText ?? '').includes('成环拒绝') && manualCountAfterLoop === 2
}
await app.close()

// ── 第 2 次启动：重开持久化取证（②的后半——编辑后 label 在场/旧值缺席） ──
const second = await launchAndGo()
const labelReopen = manualEdgeId !== null ? await edgeLabel(second.win, manualEdgeId) : null
const c2 = {
  labelAfterEdit,
  labelReopen,
  pass: labelAfterEdit === '再判：修正的逻辑线' && labelReopen === '再判：修正的逻辑线'
}
await second.app.close()

// ── 收尾：ABI 还原 node（后续 npm test 口径） ─────────────────────────
run('node', ['scripts/sqlite-abi.mjs', 'use', 'node'])

const c5 = { count: pageErrors.length, pass: pageErrors.length === 0, detail: pageErrors.slice(0, 3) }

const result = {
  when: new Date().toISOString(),
  c1_connectSecondParent: c1,
  c2_labelEditPersist: c2,
  c3_thirdParentUnlimited: c3,
  c4_loopRejected: c4,
  c5_pageErrors: c5,
  pass: c1.pass && c2.pass && c3.pass && c4.pass && c5.pass
}
await writeFile(join(OUT, 'f-lg15-verify.json'), JSON.stringify(result, null, 2), 'utf8')
console.log(JSON.stringify(result, null, 2))
process.exit(result.pass ? 0 : 1)
