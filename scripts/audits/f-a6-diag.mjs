/**
 * F-A6-a 取证器（D1 划选灰块锯齿+右溢 / D2 拖选卡顿——五段探针）。
 *
 * 用法：cd <repo root> && node scripts/audits/f-a6-diag.mjs
 * 前置：out/main/index.js 在场（npm run build 已绿过即可）；备份库
 *       local-state-backup/.import-20260827-2035/user-data/files 在场。
 * 产物：scripts/audits/f-a6-diag-out/（JSON/截图/合成 PDF——不入 git）；
 *       esbuild bundle 产物落 out/f-a6-bundles/（每次运行现场生成）
 * 依赖件：f-a6-diag-lib.mjs（复刻+乙轨+量化）/ f-a6-diag-page.mjs（页内采集器）
 *
 * 段落：A1 全库扫描(纯 Node)→A2/A3 代表页深查+计数(Electron)→B tick 前测→
 *       C 原始 clientRects→D mergeLineRects 五步复算(双轨守卫)→E band 配对→
 *       F 甲/乙 A-B 对照(项声明几何+grapheme 细分)→量化判据(C4)。
 * 纪律：不改 src/tests/任何受锁文件；Electron 单次 launch 批量跑全部文献；
 *       页内 Promise 一律 9s 兜底；失败必关 app 再退出（防残留进程）；
 *       猴子补丁测后还原；禁 git commit。PDF 声明数据 Node 侧直读
 *       （pdfjs-dist/legacy——与 renderer 同一 pdf.js 确定性一致）。
 */
import { _electron as electron } from '@playwright/test'
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { existsSync, writeFileSync, mkdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { spawn } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import {
  buildSyntheticPdf, mergeLineRectsReplica, itemPixelRects, baselineRowTruth, baselineGroupBlocks,
  rightOverflowPx, overlapMetric, blocksPerRow, lowerMedian, roundBox
} from './f-a6-diag-lib.mjs'
import {
  evalA2Deep, evalA3Count, evalBTick, evalCRaw, evalCPaint, evalEBands, evalClear, evalScrollPage
} from './f-a6-diag-page.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const OUT = join(ROOT, 'scripts', 'audits', 'f-a6-diag-out')
const PDFJS_URL = pathToFileURL(join(ROOT, 'node_modules', 'pdfjs-dist', 'legacy', 'build', 'pdf.mjs')).href
const BACKUP_FILES = join(ROOT, 'local-state-backup', '.import-20260827-2035', 'user-data', 'files')
const TAGS = [
  { tag: 'real3882', abs: join(BACKUP_FILES, '38', '82', '3882dc7df0897792a37ca5c9c6e96988b3f31367464825959e11f28432081e84.pdf'), title: 'F-A6 取证 3882 学术文献', syn: null },
  { tag: 'real1c2d', abs: join(BACKUP_FILES, '1c', '2d', '1c2df23f2259401328beacf3fa67f1d9c4aacdf55c0bd93895463a89f7779b3a.pdf'), title: 'F-A6 取证 1c2d 扫描拼合', syn: null },
  { tag: 's1rot', abs: null, title: 'F-A6 取证 S1 旋转页', syn: { rotate: 90 } },
  { tag: 's2crop', abs: null, title: 'F-A6 取证 S2 CropBox', syn: { crop: [36, 36, 540, 720] } },
  { tag: 's3base', abs: null, title: 'F-A6 取证 S3 基线', syn: {} }
]

let appRef = null
function log(...a) { console.log(`[f-a6 ${new Date().toISOString().slice(11, 19)}]`, ...a) }
async function writeJson(name, data) { await writeFile(join(OUT, name), JSON.stringify(data, null, 1), 'utf8') }
/** 页内/交互 Promise 兜底（f1-forensics r2 事故修正同型） */
async function evalRace(win, fn, arg, label, ms = 9000) {
  return await Promise.race([
    win.evaluate(fn, arg),
    new Promise((resolve) => setTimeout(() => resolve({ __timeout: true, label }), ms))
  ])
}
function runSpawn(cmd, args, env) {
  return new Promise((resolve, reject) => {
    const c = spawn(cmd, args, { env: env ?? process.env, stdio: 'inherit' })
    c.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} 退出码 ${code}`))))
    c.on('error', reject)
  })
}
const clamp01 = (v) => Math.min(1, Math.max(0, v))

/** pdfjs Node 直读（声明数据与 renderer 同一 pdf.js——确定性一致） */
async function pdfjsDoc(bytes) {
  const pdfjs = await import(PDFJS_URL)
  return pdfjs.getDocument({
    data: bytes, isEvalSupported: false,
    standardFontDataUrl: pathToFileURL(join(ROOT, 'node_modules', 'pdfjs-dist', 'standard_fonts')).href + '/',
    cMapUrl: pathToFileURL(join(ROOT, 'node_modules', 'pdfjs-dist', 'cmaps')).href + '/',
    cMapPacked: true
  }).promise.then((doc) => ({ doc, pdfjs }))
}

/** 轻量页清单（A1 扫描用；cap 防超大 PDF 拖死）。
 *  注意：getDocument({data}) 会 detach 传入 buffer——sha 必须在交给 pdfjs 前算 */
async function scanPdf(abs) {
  const raw = await readFile(abs)
  const bytes = new Uint8Array(raw)
  const sha = createHash('sha256').update(raw).digest('hex')
  const { doc } = await pdfjsDoc(bytes)
  const cap = Math.min(doc.numPages, 200)
  const pages = []
  for (let p = 1; p <= cap; p += 1) {
    const page = await doc.getPage(p)
    const tc = await page.getTextContent()
    const items = tc.items.filter((i) => 'str' in i)
    pages.push({
      page: p, rotate: page.rotate, view: page.view,
      itemCount: items.length, textLen: items.reduce((n, i) => n + i.str.length, 0)
    })
  }
  const out = { abs, sha: sha.slice(0, 8), shaFull: sha, numPages: doc.numPages, scannedPages: cap, pages }
  await doc.destroy()
  return out
}

/** 代表页全量（Node 侧 items/styles/viewport 素材） */
async function inspectPage(abs, pageNo) {
  const bytes = new Uint8Array(await readFile(abs))
  const { doc } = await pdfjsDoc(bytes)
  const page = await doc.getPage(pageNo)
  const tc = await page.getTextContent()
  const items = tc.items.filter((i) => 'str' in i).map((i) => ({
    str: i.str, dir: i.dir, width: i.width, height: i.height, transform: i.transform, fontName: i.fontName, hasEOL: !!i.hasEOL
  }))
  const out = { abs, page: pageNo, rotate: page.rotate, view: page.view, items, styles: tc.styles, lang: tc.lang }
  await doc.destroy()
  return out
}

/** 种子落库（ABI 切换配方照抄 tests/e2e/reader-text.spec.ts seedPaperRow；
 *  恢复=无条件回写 electron-v146 绑定——第二跳 launch 依赖它） */
async function seedPaperRowFa6(userData, fileRef, sha, title, id) {
  const pkgDir = join(ROOT, 'node_modules', 'better-sqlite3')
  const releaseBinding = join(pkgDir, 'build', 'Release', 'better_sqlite3.node')
  const nodeBinding = join(pkgDir, 'abi-cache', `node-v${process.versions.modules}`, 'better_sqlite3.node')
  const electronBinding = join(pkgDir, 'abi-cache', 'electron-v146', 'better_sqlite3.node')
  if (!existsSync(nodeBinding) || !existsSync(electronBinding)) throw new Error('abi-cache 绑定缺席')
  await cp(nodeBinding, releaseBinding)
  try {
    await runSpawn(process.execPath, [join(ROOT, 'tests', 'e2e', 'seed-paper.mjs')], {
      ...process.env,
      SEED_DB: join(userData, 'synapse.db'), SEED_FILE_REF: fileRef,
      SEED_SHA: sha, SEED_TITLE: title, SEED_ID: id
    })
  } finally {
    await cp(electronBinding, releaseBinding)
  }
}

async function main() {
  if (!existsSync(join(ROOT, 'out', 'main', 'index.js'))) throw new Error('out/main/index.js 缺席——先 npm run build')
  await rm(OUT, { recursive: true, force: true })
  await mkdir(OUT, { recursive: true })
  const summary = { startedAt: new Date().toISOString(), a1: {}, tags: {}, notes: [] }

  // ── A1 全库扫描（纯 Node，零渲染）──
  const scanDirs = [
    join(process.env.APPDATA, 'Synapse Remake', 'user-data', 'files'),
    join(process.env.APPDATA, 'com.synapse.app'),
    BACKUP_FILES
  ].filter((d) => existsSync(d))
  log('A1 扫描目录:', scanDirs.join(' | '))
  const pdfs = []
  for (const dir of scanDirs) {
    const entries = await readdir(dir, { recursive: true })
    for (const rel of entries) {
      if (String(rel).endsWith('.pdf')) pdfs.push(join(dir, rel))
    }
  }
  log('A1 PDF 数:', pdfs.length)
  const scans = []
  for (const abs of pdfs) {
    try { scans.push(await scanPdf(abs)) } catch (e) { summary.notes.push(`A1 扫描失败 ${abs}: ${e.message}`) }
  }
  const anomalies = []
  for (const s of scans) {
    for (const pg of s.pages) {
      if (pg.rotate !== 0 || pg.view[0] !== 0 || pg.view[1] !== 0) {
        anomalies.push({ sha: s.sha, abs: s.abs, ...pg })
      }
    }
  }
  summary.a1 = { dirs: scanDirs, pdfCount: pdfs.length, anomalies, scans }
  await writeJson('a1-scan.json', { dirs: scanDirs, pdfCount: pdfs.length, anomalies, scans })
  log('A1 异常页（rotate≠0 或 view 原点≠0）:', anomalies.length)

  // ── 合成病理性样本 + 代表页 Node 侧数据 ──
  const nodeData = {}
  for (const t of TAGS) {
    let abs = t.abs
    if (t.syn !== null) {
      const bytes = buildSyntheticPdf(t.syn)
      abs = join(OUT, `${t.tag}.pdf`)
      writeFileSync(abs, bytes)
    }
    const scan = scans.find((s) => s.abs === t.abs)
    let repPage = 1
    let reason = '合成样本唯一页'
    if (t.syn === null) {
      const texted = scan.pages.filter((pg) => pg.itemCount > 0)
      if (texted.length === 0) {
        summary.tags[t.tag] = { skipped: '无文本页（扫描纯图）——仅 A1 清单' }
        nodeData[t.tag] = null
        continue
      }
      // 深页懒渲染排队慢（38 页扫描拼合实证）：优先前 8 页内 items 最大者
      const near = texted.filter((pg) => pg.page <= 8).sort((a, b) => b.itemCount - a.itemCount)
      const pick = near.length > 0 ? near[0] : texted.sort((a, b) => b.itemCount - a.itemCount)[0]
      repPage = pick.page
      reason = `${near.length > 0 ? '前 8 页内' : '全文档'}有文本页中 items 最大（${pick.itemCount} 项）`
    }
    nodeData[t.tag] = await inspectPage(abs, repPage)
    nodeData[t.tag].repReason = reason
    nodeData[t.tag].fileAbs = abs
    await writeJson(`${t.tag}-node.json`, nodeData[t.tag])
    log(`代表页 ${t.tag}: page ${repPage}（${reason}）rotate=${nodeData[t.tag].rotate} view=${JSON.stringify(nodeData[t.tag].view)}`)
  }

  // ── Electron 阶段（单次 launch，批量全部文献）──
  const userData = await mkdtemp(join(tmpdir(), 'synapse-fa6-'))
  let app = await electron.launch({ args: ['out/main/index.js'], env: { ...process.env, SYNAPSE_USER_DATA: userData } })
  appRef = app
  await (await app.firstWindow()).waitForTimeout(600)
  await app.close()
  appRef = null
  for (const t of TAGS) {
    if (nodeData[t.tag] === null) continue
    const sha = createHash('sha256').update(await readFile(nodeData[t.tag].fileAbs)).digest('hex')
    const fileRef = `${sha.slice(0, 2)}/${sha.slice(2, 4)}/${sha}.pdf`
    const dst = join(userData, 'files', ...fileRef.split('/'))
    mkdirSync(dirname(dst), { recursive: true })
    await cp(nodeData[t.tag].fileAbs, dst)
    await seedPaperRowFa6(userData, fileRef, sha, t.title, `f-a6-${t.tag}`)
  }
  app = await electron.launch({ args: ['out/main/index.js'], env: { ...process.env, SYNAPSE_USER_DATA: userData } })
  appRef = app
  const win = await app.firstWindow()
  await win.setDefaultTimeout(20_000)

  for (const t of TAGS) {
    if (nodeData[t.tag] === null) continue
    const p = nodeData[t.tag].page
    const tag = t.tag
    log(`── 采集 ${tag} page ${p}`)
    const record = {}
    try {
      // 打开文献（重试 2 次：getByText 双击丢失时改 .lib-card 定位再试——3882 实证
      // 首轮 dblclick 只选中未打开，卡片定位+二击兜底）
      let opened = false
      for (let attempt = 0; attempt < 2 && !opened; attempt += 1) {
        await win.getByRole('button', { name: '文献库' }).click()
        await win.waitForTimeout(400)
        if (attempt === 0) await win.getByText(t.title).first().dblclick()
        else await win.locator('.lib-card', { hasText: t.title }).first().dblclick()
        try {
          await win.waitForSelector('[data-page-column="ready"]', { timeout: 25_000 })
          opened = true
        } catch { log(`${tag} 第 ${attempt + 1} 次双击未打开，重试`) }
      }
      if (!opened) throw new Error('文献打开失败（两次双击尝试）')
      await evalRace(win, evalScrollPage, p, `${tag}-scroll`)
      await win.waitForFunction(
        (pp) => { const r = document.querySelector(`[data-page-root="${pp}"]`); return r !== null && r.querySelectorAll('.textLayer span').length > 0 },
        p, { timeout: 40_000 }
      )
      await win.waitForTimeout(1000)
      record.a2 = await evalRace(win, evalA2Deep, p, `${tag}-A2`)
      record.a3 = await evalRace(win, evalA3Count, { p, nodeStrs: nodeData[t.tag].items.map((i) => i.str).filter((s) => s !== '') }, `${tag}-A3`)
      record.b = await evalRace(win, evalBTick, p, `${tag}-B`, 25_000)
      record.c1 = await evalRace(win, evalCRaw, p, `${tag}-C1`)
      await win.waitForTimeout(700)
      record.c2 = await evalRace(win, evalCPaint, null, `${tag}-C2`)
      await win.screenshot({ path: join(OUT, `shot-${tag}.png`) })
      record.e = await evalRace(win, evalEBands, p, `${tag}-E`)
      await evalRace(win, evalClear, null, `${tag}-clear`)
      await win.waitForTimeout(300)
    } catch (e) {
      record.error = String(e.message ?? e)
      log(`${tag} 采集异常:`, record.error)
      try { await win.screenshot({ path: join(OUT, `shot-${tag}-fail.png`) }) } catch { /* 尽力留证 */ }
    }
    // 关闭标签页（失败也尝试——保下轮干净）
    try { await win.getByRole('button', { name: '关闭标签页', exact: false }).first().click({ timeout: 5000 }) } catch { /* 尽力 */ }
    await win.waitForTimeout(400)
    await writeJson(`${tag}-cap.json`, record)
    summary.tags[tag] = { page: p, ok: record.error === undefined, has: Object.fromEntries(Object.entries(record).map(([k, v]) => [k, v !== null && v !== undefined && v.__timeout !== true])) }
  }
  await app.close()
  appRef = null
  log('Electron 阶段完成')

  // ── Node 复算阶段（D 双轨/E 配对/F 乙轨——真函数=esbuild bundle）──
  // bundle 落 out/（check-locks 的 walk 跳过 out/——落 scripts/ 下会被受锁面
  // 收录而数据目录不入 git，manifest 与 CI 对账必红；out/ 随 build 清空无碍，
  // 每次运行现场重新生成）
  const esbuildBin = join(ROOT, 'node_modules', 'esbuild', 'bin', 'esbuild')
  const bundleDir = join(ROOT, 'out', 'f-a6-bundles')
  await mkdir(bundleDir, { recursive: true })
  for (const [src, out] of [
    ['src/renderer/features/reader/annotation-anchor.ts', 'anchor-bundle.mjs'],
    ['src/renderer/features/reader/annotation-resolve.ts', 'resolve-bundle.mjs'],
    ['src/renderer/features/reader/annotation-style.ts', 'style-bundle.mjs'],
    ['src/renderer/features/reader/annotation-merge.ts', 'merge-bundle.mjs']
  ]) {
    await runSpawn(process.execPath, [esbuildBin, join(ROOT, src), '--bundle', '--format=esm', '--platform=node', `--outfile=${join(bundleDir, out)}`])
  }
  const anchor = await import(pathToFileURL(join(bundleDir, 'anchor-bundle.mjs')).href)
  const resolve = await import(pathToFileURL(join(bundleDir, 'resolve-bundle.mjs')).href)
  const style = await import(pathToFileURL(join(bundleDir, 'style-bundle.mjs')).href)
  const merge2 = await import(pathToFileURL(join(bundleDir, 'merge-bundle.mjs')).href)
  const { Util } = (await import(PDFJS_URL))

  for (const t of TAGS) {
    const tag = t.tag
    const nd = nodeData[tag]
    if (nd === null) continue
    const cap = JSON.parse(await readFile(join(OUT, `${tag}-cap.json`), 'utf8'))
    if (cap.error !== undefined || cap.c1 === undefined || cap.c1.__timeout || cap.c1.err !== undefined) {
      summary.tags[tag].recompute = 'skipped（采集面缺 C 段）'
      continue
    }
    const c1 = cap.c1
    const c2 = cap.c2 && !cap.c2.__timeout ? cap.c2 : { blocks: [], hostBox: null }
    const tlBox = c1.tlBox
    // 两套归一化：视口域（rawRects/realOut——减盒原点）与盒相对域（乙轨块
    // ——viewport 原点=盒左上，不再减）。混用会把甲链 clamp 钉 1（已修的实证 bug）
    const normPxV = (r) => ({ page: 0, x: clamp01((r.x - tlBox.x) / tlBox.w), y: clamp01((r.y - tlBox.y) / tlBox.h), w: clamp01(r.w / tlBox.w), h: clamp01(r.h / tlBox.h) })
    const normPxR = (r) => ({ page: 0, x: clamp01(r.x / tlBox.w), y: clamp01(r.y / tlBox.h), w: clamp01(r.w / tlBox.w), h: clamp01(r.h / tlBox.h) })
    const rel = (r) => ({ x: r.x - tlBox.x, y: r.y - tlBox.y, w: r.w, h: r.h })

    // ── B tick 时长分析（口径：mutation 时刻 − 距其最近一次 dispatch 时刻；间隔序列证节流步进）──
    if (cap.b && !cap.b.__timeout && Array.isArray(cap.b.dispatches)) {
      const { dispatches, mutations, counts } = cap.b
      const deltas = mutations.map((m) => Number((m.t - Math.max(...dispatches.filter((d) => d <= m.t))).toFixed(1)))
      const gaps = mutations.slice(1).map((m, i) => Number((m.t - mutations[i].t).toFixed(1)))
      const med = (a) => (a.length === 0 ? null : [...a].sort((x, y) => x - y)[Math.floor((a.length - 1) / 2)])
      await writeJson(`${tag}-btick.json`, {
        dispatchCount: dispatches.length, mutationCount: mutations.length,
        tickDeltaMs: { min: deltas.length ? Math.min(...deltas) : null, median: med(deltas), max: deltas.length ? Math.max(...deltas) : null, all: deltas },
        mutationGapMs: { median: med(gaps), all: gaps },
        layoutReadCounts: counts, spanTotal: cap.b.spanTotal, charTotal: cap.b.charTotal,
        caliber: 'tick端到端=selection-rects子树mutation时刻−距其最近一次dispatchEvent(selectionchange)时刻；N=20次dispatch间隔50ms；节流窗200ms'
      })
    }

    // ── D 五步复算（双轨守卫：复刻 vs 真函数逐位全等）──
    const trace = {}
    const replicaOut = mergeLineRectsReplica(c1.rawRects, tlBox.w, c1.lineH, trace)
    const realOut = anchor.mergeLineRects(c1.rawRects, tlBox.w, c1.lineH)
    const guardEqual = JSON.stringify(replicaOut.map((r) => roundBox(r, 6))) === JSON.stringify(realOut.map((r) => roundBox(r, 6)))
    const mathNorm = merge2.mergeRects(realOut.map(normPxV), c1.lineH !== undefined ? c1.lineH / tlBox.h : undefined)
    await writeJson(`${tag}-dsteps.json`, { ...trace, realOut: realOut.map((r) => roundBox(r)), guardReplicaEqualsReal: guardEqual, mathNormalized: mathNorm })

    // ── E band 配对（真 matchBand/clampedHorizontal）+bandFromMetrics 双轨校验 ──
    const bands = cap.e && !cap.e.__timeout && cap.e.bands ? cap.e.bands : []
    const pairs = mathNorm.map((r) => {
      const band = resolve.matchBand(bands, r)
      const cl = style.clampedHorizontal(r, band)
      // 门差值数字（诊断 matchBand 失败机理的直接证据：clamp01 钉边带/行盒高差带）
      const nearest = bands.length > 0
        ? bands.reduce((b, x) => (b === null || Math.abs(x.center - (r.y + r.h / 2)) < Math.abs(b.center - (r.y + r.h / 2)) ? x : b), null)
        : null
      return {
        rect: { x: Number(r.x.toFixed(4)), y: Number(r.y.toFixed(4)), w: Number(r.w.toFixed(4)), h: Number(r.h.toFixed(4)) },
        bandMatched: band === undefined ? null : { top: band.top, bottom: band.bottom, x0: band.x0 ?? null, x1: band.x1 ?? null, gatePassed: true },
        gatePassed: band !== undefined,
        gateDelta: nearest === null ? null : Number(Math.abs(nearest.center - (r.y + r.h / 2)).toFixed(4)),
        gateLimit: Number(r.h.toFixed(4)),
        clampedBeforePct: { left: r.x * 100, width: r.w * 100 },
        clampedAfterPct: { left: parseFloat(cl.left), width: parseFloat(cl.width) }
      }
    })
    const bfmChecks = (cap.e && cap.e.samples ? cap.e.samples : []).map((s) => {
      const real = resolve.bandFromMetrics(s.span, s.fs, s.m, s.base)
      const same = JSON.stringify(real) === JSON.stringify(s.expect)
      return { same, real, expect: s.expect }
    })
    await writeJson(`${tag}-epairs.json`, { bands, pairs, bandFromMetricsDualTrack: bfmChecks })

    // ── F 乙轨（项声明几何）+ A/B 对照量化 ──
    const a2 = cap.a2 && !cap.a2.__timeout && cap.a2.scaleFactor ? cap.a2 : { scaleFactor: 1 }
    const bytes = new Uint8Array(await readFile(nd.fileAbs))
    const { doc } = await pdfjsDoc(bytes)
    const page = await doc.getPage(nd.page)
    const viewport = page.getViewport({ scale: a2.scaleFactor })
    const tc = await page.getTextContent()
    const items = tc.items.filter((i) => 'str' in i)
    const offsets = []
    let acc = 0
    for (const it of items) { offsets.push([acc, acc + it.str.length]); acc += it.str.length }
    const { rects: rectsB, perItem } = itemPixelRects(items, tc.styles, viewport, c1.selStart, c1.selEnd, offsets, Util)
    const lineHB = lowerMedian(perItem.map((d) => d.fontH).filter((v) => v > 0))
    const mergedB = anchor.mergeLineRects(rectsB, viewport.width, lineHB)
    const normB = merge2.mergeRects(mergedB.map(normPxR), lineHB !== undefined ? lineHB / tlBox.h : undefined)
    const truth = baselineRowTruth(items, tc.styles, viewport, c1.selStart, c1.selEnd, offsets, Util, 2)
    const truthLoose = baselineRowTruth(items, tc.styles, viewport, c1.selStart, c1.selEnd, offsets, Util, Math.max(2, 0.5 * (lineHB ?? 12)))
    const blocksB = mergedB
    const blocksA_paint = c2.blocks.map(rel)
    const blocksA_math = realOut.map(rel)
    const rightOverB = rightOverflowPx(blocksB, tlBox.w)
    const rightOverA = rightOverflowPx(blocksA_paint, tlBox.w)
    const bprB = blocksPerRow(blocksB)
    const bprA = blocksPerRow(blocksA_paint)
    const ov = overlapMetric(blocksA_paint, blocksB)
    const cleanB = mergedB.length === truth.rows && rightOverB === 0
    const cleanA_strict = blocksA_paint.length === truth.rows && rightOverA === 0
    const cleanA = blocksA_paint.length === truthLoose.rows && rightOverA === 0
    const outcome = cleanB && !cleanA_strict ? '乙净甲错→迁移为主修' : !cleanB && cleanA_strict ? '乙错甲对→维持R-加固' : cleanB && cleanA_strict ? '同净（甲乙均按行成块且零溢出）' : '同错→T8 立案（项数据/两端皆异常）'
    // 第二口径（迁移路线正式形态：基线分组并块——mergeLineRects y 聚类在旋转页有
    // 盲区，s1rot 实证并 1 块；基线分组对 angle 免疫）。判据真值=loose（视觉行，
    // 0.5×主导字号容差）——甲乙两侧同口径对称
    const mergedB2 = baselineGroupBlocks(rectsB, perItem, Math.max(2, 0.5 * (lineHB ?? 12)))
    const normB2 = merge2.mergeRects(mergedB2.map(normPxR), lineHB !== undefined ? lineHB / tlBox.h : undefined)
    const rightOverB2 = rightOverflowPx(mergedB2, tlBox.w)
    const cleanB2 = mergedB2.length === truthLoose.rows && rightOverB2 === 0
    const ov2 = overlapMetric(blocksA_paint, mergedB2)
    const outcome2 = cleanB2 && !cleanA ? '乙净甲错→迁移为主修' : !cleanB2 && cleanA ? '乙错甲对→维持R-加固' : cleanB2 && cleanA ? '同净（甲乙均按行成块且零溢出）' : '同错→T8 立案（项数据/两端皆异常）'
    const fVerdict = {
      rotate: nd.rotate, view: nd.view, scaleFactor: a2.scaleFactor, viewportW: viewport.width,
      selStart: c1.selStart, selEnd: c1.selEnd, selectedGraphemeTotal: null,
      rowsTruth: truth, rowsTruthLoose: truthLoose, lineHB,
      perItemStats: { total: perItem.length, partial: perItem.filter((d) => d.mode === 'partial').length, rtl: perItem.filter((d) => d.dir === 'rtl').length, vertical: perItem.filter((d) => d.vertical).length },
      mergedB: mergedB.map((r) => roundBox(r)), normB,
      mergedB2Baseline: mergedB2.map((r) => roundBox(r)), normB2,
      blockCountB: mergedB.length, blockCountB2: mergedB2.length,
      blockCountA_paint: blocksA_paint.length, blockCountA_math: blocksA_math.length,
      rightOverB, rightOverB2, rightOverA, rightOverA_math: rightOverflowPx(blocksA_math, tlBox.w),
      blocksPerRowB: bprB, blocksPerRowA: bprA,
      overlapPaintVsB: ov,
      overlapPaintVsB2: ov2,
      cleanB, cleanA, cleanA_strict, outcome, cleanB2, outcome2
    }
    await writeJson(`${tag}-fb.json`, fVerdict)
    summary.tags[tag] = { ...(summary.tags[tag] ?? {}), page: nd.page, rotate: nd.rotate, view: nd.view, f: { blocksB: mergedB.length, blocksB2: mergedB2.length, blocksA: blocksA_paint.length, rows: truth.rows, rightOverB, rightOverB2, rightOverA, outcome, outcome2, guardEqual, bands: bands.length } }
    await doc.destroy()
    log(`F ${tag}: 乙块=${mergedB.length}(基线分组=${mergedB2.length}) 甲块=${blocksA_paint.length} 行真值=${truth.rows} 右溢乙/乙2/甲=${rightOverB}/${rightOverB2}/${rightOverA} → ${outcome} | 口径2:${outcome2}`)
  }

  summary.finishedAt = new Date().toISOString()
  await writeJson('verdict-summary.json', summary)
  log('完成：产物在', OUT)
}

main().catch(async (e) => {
  console.error('[f-a6] FAIL', e)
  process.exitCode = 1
  try { await appRef?.close() } catch { /* 尽力清理 */ }
  process.exit(process.exitCode ?? 1)
})
