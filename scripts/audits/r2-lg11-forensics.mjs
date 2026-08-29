/**
 * R2-LG11 真机复评取证器（票面 §9 放行线——脉络浅色严谨板）。
 *
 * 配方（f1-forensics5 系列同族）：tmp 空库 firstHop 建库 → seed-paper.mjs
 * 子进程种 5 篇幽灵 papers（ABI 换绑 finally 还原）→ dialog 桩导入脉络
 * fixture（覆盖四类节点+长题名 4→3 行省略面）→ DOM/computed 转储+截图。
 *
 * 放行四线（交接书 §3）逐条量化：
 *  ①换行在框内：长题名卡 foreignObject div clamp 3 行+scrollHeight>
 *    clientHeight（省略生效）+其余卡无纵向溢出
 *  ②边框编码可辨：核心 accent 1.5 实线/普通 branch 1 实线/综述 branch 1
 *    虚线 6 4——stroke/width/dash 三值互异断言（computed 即视觉真值——
 *    SVG 属性渲染无 CSS 链路，ADR-0019 同判）
 *  ③整图不回退：节点 5/边 4/层带 4 计数+data-viewport transform 非初始
 *    （auto-fit 生效）+图例四项真实文本
 *  ④综述右列：综述节点 x > 其余全部自动节点右缘（DOM transform 解析）
 *
 * 取证器三戒遵守：无拖拽进行中截图（无 CDP 输入会话）；页内等待全带
 * timeout 兜底；finally app.close()。
 * 产物：scripts/audits/r2-lg11-out/（json+png）
 * 用法：export PATH="/d/nodejs24:$PATH" && node scripts/audits/r2-lg11-forensics.mjs
 */
import { _electron as electron } from '@playwright/test'
import { spawn } from 'node:child_process'
import { copyFile, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const ROOT = process.cwd()
const OUT = join(ROOT, 'scripts', 'audits', 'r2-lg11-out')
function log(...a) { console.log(`[lg11 ${new Date().toISOString().slice(11, 19)}]`, ...a) }

/** fixture 五节点（树合法单父形态——isCore 出度口径 2026-08-29 修正后）：
 *  根 2020→甲 2021；甲→乙/甲→长题（甲出度 2=核心·开宗）；根→综述 2023。
 *  （初版给甲造双入边=多父非法图，被 service INV-27 守卫拒——实录在案） */
const LONG_TITLE = '多源数据同化方法'.repeat(7) + '框架研究' // 60 字
const NODES = [
  { paper_id: 'r2-lg11-root', title: '扩散理论奠基', year: 2020 },
  { paper_id: 'r2-lg11-core', title: '扩散模型在流域模拟中的方法继承与三次改进的系统研究', year: 2021 },
  { paper_id: 'r2-lg11-early', title: '早期随机漫步模型', year: 2022 },
  { paper_id: 'r2-lg11-long', title: LONG_TITLE, year: 2022 },
  { paper_id: 'r2-lg11-survey', title: '扩散模型研究综述', year: 2023 }
]
const EDGES = [
  { from_paper_id: 'r2-lg11-root', to_paper_id: 'r2-lg11-core', label: '方法继承' },
  { from_paper_id: 'r2-lg11-core', to_paper_id: 'r2-lg11-early', label: '' },
  { from_paper_id: 'r2-lg11-core', to_paper_id: 'r2-lg11-long', label: '' },
  { from_paper_id: 'r2-lg11-root', to_paper_id: 'r2-lg11-survey', label: '' }
]

/** seed-paper.mjs 子进程拉起（e2e-env 同型——Windows 文件锁决定子进程） */
function runSeed(env) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [join(ROOT, 'tests', 'e2e', 'seed-paper.mjs')], { env, stdio: 'inherit' })
    child.on('exit', (c) => (c === 0 ? resolve() : reject(new Error(`seed 退出码 ${c}`))))
    child.on('error', reject)
  })
}

/** 显式恢复 electron ABI（sqlite-abi.mjs use electron 幂等——seed 换绑后的
 *  终态恢复兜底；Windows 文件锁可能使 readFile/writeFile 还原竞态失败，
 *  2026-08-29 首跑实证绑定残留 node-v137 毒化后续 electron.launch） */
function restoreElectronAbi() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [join(ROOT, 'scripts', 'sqlite-abi.mjs'), 'use', 'electron'], { stdio: 'inherit' })
    child.on('exit', (c) => (c === 0 ? resolve() : reject(new Error(`sqlite-abi use electron 退出码 ${c}`))))
    child.on('error', reject)
  })
}

/** 种一篇幽灵 papers 行（脉络 graph 不读文件内容——幽灵 ref 即可）。
 *  Windows 锁竞态防线：copyFile 后 hash 校验，损坏（electron 进程退出延迟
 *  持锁导致写入竞态损坏——2026-08-29 多跑实证间歇 DLOPEN）即重拷最多 3 次 */
async function seedPaper(userData, p) {
  const pkgDir = join(ROOT, 'node_modules', 'better-sqlite3')
  const binding = join(pkgDir, 'build', 'Release', 'better_sqlite3.node')
  const cache = join(pkgDir, 'abi-cache')
  const wanted = `node-v${process.versions.modules}`
  const dirs = (await readdir(cache)).filter((d) => d.startsWith('node-v'))
  const pick = dirs.includes(wanted) ? wanted : (dirs.sort().at(-1) ?? '')
  const src = join(cache, pick, 'better_sqlite3.node')
  const srcHash = createHash('sha256').update(await readFile(src)).digest('hex')
  const bak = await readFile(binding)
  for (let i = 0; i < 3; i++) {
    await copyFile(src, binding)
    const nowHash = createHash('sha256').update(await readFile(binding)).digest('hex')
    if (nowHash === srcHash) break
    log(`绑定拷贝损坏重试 ${i + 1}/3`)
    await new Promise((r) => setTimeout(r, 2000))
  }
  try {
    const sha = createHash('sha256').update(`ghost-${p.paper_id}`).digest('hex')
    await runSeed({
      ...process.env,
      SEED_DB: join(userData, 'synapse.db'),
      SEED_FILE_REF: `${sha.slice(0, 2)}/${sha.slice(2, 4)}/${sha}.pdf`,
      SEED_SHA: sha,
      SEED_TITLE: p.title,
      SEED_ID: p.paper_id
    })
  } finally {
    await writeFile(binding, bak)
  }
}

/** 节点卡 computed 转储（stroke 系=SVG 属性直读——视觉真值）。
 *  题名 div=foreignObject 容器 div 的首个子 div（clamp 驻题名级非容器级
 *  ——容器 overflow=0 恰证换行被钳在卡内；data-node-id=导入时 UUID 非
 *  paper_id，kind 才是稳定定位键） */
const DUMP_NODES = `(() => {
  const out = []
  for (const g of document.querySelectorAll('svg g[data-node-id]')) {
    const r = g.querySelector('rect')
    const foDiv = g.querySelector('foreignObject div')
    const titleEl = foDiv ? foDiv.firstElementChild : null
    out.push({
      id: g.getAttribute('data-node-id'),
      kind: g.getAttribute('data-kind'),
      transform: g.getAttribute('transform'),
      stroke: r?.getAttribute('stroke'),
      strokeWidth: r?.getAttribute('stroke-width'),
      dash: r?.getAttribute('stroke-dasharray'),
      rectH: r?.getAttribute('height'),
      rectW: r?.getAttribute('width'),
      foOverflow: foDiv ? foDiv.scrollHeight - foDiv.clientHeight : null,
      titleClamp: titleEl ? getComputedStyle(titleEl).webkitLineClamp : null,
      titleOverflow: titleEl ? titleEl.scrollHeight - titleEl.clientHeight : null,
      tooltipFull: titleEl ? (titleEl.getAttribute('title') ?? '').length : 0
    })
  }
  return out
})()`

const DUMP_MISC = `(() => {
  const host = document.querySelector('.lineage-host')
  const bands = [...document.querySelectorAll('[data-layer-year]')].map((g) => ({
    year: g.getAttribute('data-layer-year'),
    line: g.querySelector('line')?.getAttribute('stroke'),
    label: g.querySelector('text')?.textContent
  }))
  const edges = [...document.querySelectorAll('path[data-edge-id]')].map((p) => ({
    id: p.getAttribute('data-edge-id'),
    stroke: p.getAttribute('stroke'),
    dash: p.getAttribute('stroke-dasharray')
  }))
  const legend = [...document.querySelectorAll('[data-legend] *, [data-legend]')]
    .map((e) => e.textContent).filter((t) => t && t.trim().length > 1)
  return {
    hostBg: host ? getComputedStyle(host).backgroundColor : null,
    viewport: document.querySelector('[data-viewport]')?.getAttribute('transform'),
    bands, edges, legend
  }
})()`

async function main() {
  if (!existsSync(join(ROOT, 'out', 'main', 'index.js'))) throw new Error('先 npm run build')
  await mkdir(OUT, { recursive: true })
  const userData = join(tmpdir(), 'synapse-lg11-recheck')
  await rm(userData, { recursive: true, force: true })

  // firstHop 建库（迁移链），随后种子
  let app = await electron.launch({ args: ['out/main/index.js'], env: { ...process.env, SYNAPSE_USER_DATA: userData } })
  await (await app.firstWindow()).waitForTimeout(600)
  await app.close()
  // Windows 文件锁缓冲：chromium 子进程退出延迟会持锁 better_sqlite3.node，
  // 立即 copyFile 换绑=写入损坏→seed 子进程 DLOPEN 失败（2026-08-29 两跑实证）
  await new Promise((r) => setTimeout(r, 1500))
  for (const p of NODES) await seedPaper(userData, p)
  await restoreElectronAbi() // 终态恢复兜底（首跑实证换绑残留毒化 launch）

  const fixture = join(userData, 'lg11-draft.json')
  await writeFile(fixture, JSON.stringify({ nodes: NODES.map((n) => ({ ...n, core_idea: '' })), edges: EDGES }), 'utf8')

  const results = {}
  try {
    app = await electron.launch({ args: ['out/main/index.js'], env: { ...process.env, SYNAPSE_USER_DATA: userData } })
    const win = await app.firstWindow()
    await win.setDefaultTimeout(20_000)
    await win.getByRole('button', { name: '文献库' }).waitFor()
    await win.getByRole('button', { name: '脉络', exact: true }).click()
    await win.getByText('暂无脉络图——导入草稿或添加节点').waitFor()

    await app.evaluate((m, path) => {
      ;(m.dialog).showOpenDialog = async () => ({ canceled: false, filePaths: [path] })
    }, fixture)
    win.on('dialog', (d) => { void d.accept() })
    await win.getByTestId('lineage-import').click()
    try {
      // 泛化首 toast 捕获（成功/失败皆命中——失败 toast 带 TTL 会在成功串
      // 等待窗内消失，先抓全文再分判）
      await win.locator('[role=status], [role=alert]').first().waitFor({ timeout: 10_000 })
      const toastTexts = await win.evaluate(() =>
        [...document.querySelectorAll('[role=status], [role=alert]')].map((e) => e.textContent)
      )
      results.importToast = toastTexts
      log('toast=', JSON.stringify(toastTexts))
      if (!toastTexts.some((t) => t.includes('已导入脉络图：5 个节点，4 条连线'))) {
        throw new Error('导入 toast 非成功态——见 results.importToast')
      }
    } catch {
      // 兜底诊断：dump 页面态+截图（校验错误 vs 系统失败的分流证据）
      const dump = await win.evaluate(() => ({
        alerts: [...document.querySelectorAll('[role=alert], [role=status]')].map((e) => e.textContent),
        body: document.body.textContent.replace(/\s+/g, ' ').slice(0, 500)
      }))
      log('IMPORT FAIL dump=', JSON.stringify(dump))
      await win.screenshot({ path: join(OUT, 'lg11-import-fail.png') })
      throw new Error('导入 toast 未出现——诊断已落 lg11-import-fail.png')
    }
    await win.waitForTimeout(800) // auto-fit 瞬时+渲染安定

    results.nodes = await win.evaluate(DUMP_NODES)
    results.misc = await win.evaluate(DUMP_MISC)
    await win.screenshot({ path: join(OUT, 'lg11-full.png') })

    // 放行线④：综述 x > 全部非综述自动节点右缘（kind 定位——id 是 UUID）
    const sv = results.nodes.find((x) => x.kind === 'survey')
    const others = results.nodes.filter((x) => x.kind !== 'survey')
    const txOf = (n) => Number(/translate\((-?[\d.]+),/.exec(n.transform ?? '')?.[1] ?? '0')
    const wOf = (n) => Number(n.rectW ?? 0)
    const othersRightMax = Math.max(...others.map((n) => txOf(n) + wOf(n) / 2))
    results.surveyColumn = {
      surveyX: sv ? txOf(sv) : null,
      surveyLeft: sv ? txOf(sv) - wOf(sv) / 2 : null,
      othersRightMax,
      pass: Boolean(sv && txOf(sv) - wOf(sv) / 2 > othersRightMax)
    }

    // 放行线判定汇总
    const n = results.nodes
    const long = n.find((x) => x.tooltipFull >= 50)
    const core = n.find((x) => x.stroke === 'var(--accent)' && x.strokeWidth === '1.5')
    const normal = n.find((x) => x.stroke === 'var(--node-branch)' && x.strokeWidth === '1' && !x.dash)
    const surveyNode = n.find((x) => x.dash === '6 4' && x.kind === 'survey')
    results.verdict = {
      // 长题名：题名级 clamp=3+容器零溢出（换行在框内）；其余卡容器零溢出
      wrapInBox: long
        ? long.titleClamp === '3' && (long.titleOverflow === null || long.titleOverflow > 0) &&
          n.every((x) => x.foOverflow === null || x.foOverflow <= 0)
        : false,
      borderDiscernible: Boolean(core && normal && surveyNode),
      noRegression: n.length === 5 && results.misc.edges.length === 4 && results.misc.bands.length === 4 && results.misc.viewport !== 'translate(0, 0) scale(1)',
      surveyRight: results.surveyColumn.pass
    }
    await writeFile(join(OUT, 'r2-lg11-forensics.json'), JSON.stringify(results, null, 2), 'utf8')
    log('verdict=', JSON.stringify(results.verdict), 'surveyCol=', JSON.stringify(results.surveyColumn))
  } finally {
    await app.close().catch(() => undefined)
    await restoreElectronAbi().catch(() => undefined) // 异常退出路径的绑定恢复兜底
  }
}

main().catch((e) => { console.error('[lg11] FAIL', e); process.exitCode = 1 })
