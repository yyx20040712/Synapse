/**
 * F-A8 门 1 取证器——新旧重锚链同页双跑对照（DOM 链 resolveAnnotationRects
 * 形态 vs 项几何链 resolveAnnotationRectsItem 真函数）+病理页项几何真值贴合
 * +selectionHealth 标注域 G2 分离度验收（CR2）。
 *
 * 用法：cd <repo root> && node scripts/audits/f-a8-gate1-diag.mjs
 * 前置：out/main/index.js 在场（npm run build 已绿）；备份库
 *       local-state-backup/.import-20260827-2035/user-data/files 在场。
 * 产物：scripts/audits/f-a8-gate1-out/（JSON——不入 git）；esbuild bundle 落
 *       out/f-a8-bundles/（每次现场生成——check-locks walk 跳过 out/）。
 * 依赖件：f-a6-diag-lib.mjs（复用单源）/f-a6-diag-page.mjs（evalScrollPage）/
 *         f-a8-gate1-page.mjs（页内采集器）/f-a8-gate1-lib.mjs（对比数学）。
 *
 * 架构（f-a6 先例同构——真函数经 esbuild bundle 在 Node 消费）：
 * - 链 B（项几何）=真 resolveAnnotationRectsItem 整函数（entry=Node pdfjs 声明
 *   数据+页内 canvas CSS 盒等价组装——PagesOverlay handlePageRender 写者契约
 *   同形：box=Math.round(canvas gBCR)）；
 * - 链 A（DOM）=真 locateQuote 核（verifyQuoteItem 单项数组喂 DOM 全文——
 *   CR4 oracle 锁定与 verifyQuote 同核）+真 mergeLineRects+真 mergeRects+
 *   真 bandFromMetrics；复刻面=collectSpans/probe/offsetToPoint（页内采集器，
 *   行号锚定见该件头注）+mergeNear（f-a6 §8 复刻先例，语句级对照）；
 * - 双轨守卫=mergeLineRectsReplica vs 真函数逐位 JSON 全等（f-a6 同款）。
 * 纪律：src/tests 零改；Electron 单 launch 批量；页内 Promise 9s 兜底（采集器
 *       重页 20s——f-a6 B 段 25s 先例同型申报）；失败必关 app 再退出；禁 git
 *       commit；零猴子补丁（本票无布局读计数面）。
 */
import { _electron as electron } from '@playwright/test'
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { existsSync, writeFileSync, mkdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { spawn } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import {
  buildSyntheticPdf, baselineRowTruth, rightOverflowPx, overlapMetric, roundBox,
  lowerMedian, mergeLineRectsReplica, mergeNearReplica
} from './f-a6-diag-lib.mjs'
import { evalScrollPage } from './f-a6-diag-page.mjs'
import { evalCollectPage } from './f-a8-gate1-page.mjs'
import {
  areaIou, iou1D, blockIouPairs, bandPairs, itemViewportOfReplica, offsetsOfItems,
  spanBoxesAsItemBoxes, annotationOf
} from './f-a8-gate1-lib.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const OUT = join(ROOT, 'scripts', 'audits', 'f-a8-gate1-out')
const PDFJS_URL = pathToFileURL(join(ROOT, 'node_modules', 'pdfjs-dist', 'legacy', 'build', 'pdf.mjs')).href
const BACKUP_FILES = join(ROOT, 'local-state-backup', '.import-20260827-2035', 'user-data', 'files')
/** 页集（票面 §③-2：健康=真实库两样本代表页；病理=合成 T1/T9+扫描拼合页——
 *  1c2d-p6=库内最稀疏扫描页（10 项/46 字符/中位字高 6px——扫描拼合极端形态，
 *  Node 侧全 38 页扫描实测选取，病理形态申报见裁决表 §1） */
const PAGESET = [
  {
    tag: 'real3882', title: 'F-A8 取证 3882 学术文献',
    abs: join(BACKUP_FILES, '38', '82', '3882dc7df0897792a37ca5c9c6e96988b3f31367464825959e11f28432081e84.pdf'),
    syn: null, pages: [{ p: 2, set: 'healthy' }, { p: 7, set: 'healthy' }]
  },
  {
    tag: 'real1c2d', title: 'F-A8 取证 1c2d 扫描拼合',
    abs: join(BACKUP_FILES, '1c', '2d', '1c2df23f2259401328beacf3fa67f1d9c4aacdf55c0bd93895463a89f7779b3a.pdf'),
    syn: null, pages: [{ p: 4, set: 'healthy' }, { p: 9, set: 'healthy' }, { p: 6, set: 'patho' }]
  },
  { tag: 's1rot', title: 'F-A8 取证 S1 旋转页', abs: null, syn: { rotate: 90 }, pages: [{ p: 1, set: 'patho' }] },
  { tag: 's2crop', title: 'F-A8 取证 S2 CropBox', abs: null, syn: { crop: [36, 36, 540, 720] }, pages: [{ p: 1, set: 'patho' }] }
]

let appRef = null
function log(...a) { console.log(`[f-a8g1 ${new Date().toISOString().slice(11, 19)}]`, ...a) }
async function writeJson(name, data) { await writeFile(join(OUT, name), JSON.stringify(data, null, 1), 'utf8') }
/** 页内/交互 Promise 兜底（f-a6 evalRace 同型；采集器重页 20s 申报） */
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
/** 下中位（归一化域 dy 聚合用） */
function medOfPx(nums) {
  const ok = nums.filter((v) => Number.isFinite(v))
  if (ok.length === 0) return 0
  const s = [...ok].sort((x, y) => x - y)
  return s[Math.floor((s.length - 1) / 2)]
}

/** pdfjs Node 直读（f-a6 同型——声明数据与 renderer 同一 pdf.js） */
async function pdfjsDoc(bytes) {
  const pdfjs = await import(PDFJS_URL)
  return pdfjs.getDocument({
    data: bytes, isEvalSupported: false,
    standardFontDataUrl: pathToFileURL(join(ROOT, 'node_modules', 'pdfjs-dist', 'standard_fonts')).href + '/',
    cMapUrl: pathToFileURL(join(ROOT, 'node_modules', 'pdfjs-dist', 'cmaps')).href + '/',
    cMapPacked: true
  }).promise.then((doc) => ({ doc, pdfjs }))
}

/** 代表页全量（Node 侧 items/styles/geometry——PdfPageCanvas onPageRender 载荷同形） */
async function inspectPage(abs, pageNo) {
  const bytes = new Uint8Array(await readFile(abs))
  const { doc } = await pdfjsDoc(bytes)
  const page = await doc.getPage(pageNo)
  const tc = await page.getTextContent()
  const items = tc.items.filter((i) => 'str' in i).map((i) => ({
    str: i.str, dir: i.dir, width: i.width, height: i.height, transform: i.transform, fontName: i.fontName, hasEOL: !!i.hasEOL
  }))
  const out = { page: pageNo, rotate: page.rotate, view: page.view, items, styles: tc.styles, lang: tc.lang }
  await doc.destroy()
  return out
}

/** 种子落库（f-a6 seedPaperRowFa6 同型——ABI 切换+无条件回写 electron-v146） */
async function seedPaperRow(userData, fileRef, sha, title, id) {
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
  const summary = { startedAt: new Date().toISOString(), pages: {}, notes: [] }

  // ── Node 阶段 1：合成 PDF+代表页声明数据 ──
  for (const t of PAGESET) {
    let abs = t.abs
    if (t.syn !== null) {
      abs = join(OUT, `${t.tag}.pdf`)
      writeFileSync(abs, buildSyntheticPdf(t.syn))
    }
    t.fileAbs = abs
    for (const pg of t.pages) {
      pg.node = await inspectPage(abs, pg.p)
      log(`声明数据 ${t.tag} p${pg.p}: items=${pg.node.items.length} rotate=${pg.node.rotate} view=${JSON.stringify(pg.node.view)}`)
    }
  }

  // ── Electron 阶段（单 launch 批量）──
  const userData = await mkdtemp(join(tmpdir(), 'synapse-fa8g1-'))
  let app = await electron.launch({ args: ['out/main/index.js'], env: { ...process.env, SYNAPSE_USER_DATA: userData } })
  appRef = app
  await (await app.firstWindow()).waitForTimeout(600)
  await app.close()
  appRef = null
  for (const t of PAGESET) {
    const sha = createHash('sha256').update(await readFile(t.fileAbs)).digest('hex')
    const fileRef = `${sha.slice(0, 2)}/${sha.slice(2, 4)}/${sha}.pdf`
    const dst = join(userData, 'files', ...fileRef.split('/'))
    mkdirSync(dirname(dst), { recursive: true })
    await cp(t.fileAbs, dst)
    await seedPaperRow(userData, fileRef, sha, t.title, `f-a8g1-${t.tag}`)
  }
  app = await electron.launch({ args: ['out/main/index.js'], env: { ...process.env, SYNAPSE_USER_DATA: userData } })
  appRef = app
  const win = await app.firstWindow()
  await win.setDefaultTimeout(20_000)
  for (const t of PAGESET) {
    log(`── 打开 ${t.tag}`)
    let opened = false
    for (let attempt = 0; attempt < 2 && !opened; attempt += 1) {
      await win.getByRole('button', { name: '文献库' }).click()
      await win.waitForTimeout(400)
      if (attempt === 0) await win.getByText(t.title).first().dblclick()
      else await win.locator('.lib-card', { hasText: t.title }).first().dblclick()
      try {
        await win.waitForSelector('[data-page-column="ready"]', { timeout: 25_000 })
        opened = true
      } catch { log(`${t.tag} 第 ${attempt + 1} 次双击未打开，重试`) }
    }
    if (!opened) {
      summary.notes.push(`${t.tag} 打开失败（两次双击尝试）`)
      continue
    }
    for (const pg of t.pages) {
      try {
        await evalRace(win, evalScrollPage, pg.p, `${t.tag}-p${pg.p}-scroll`)
        await win.waitForFunction(
          (pp) => { const r = document.querySelector(`[data-page-root="${pp}"]`); return r !== null && r.querySelectorAll('.textLayer span').length > 0 },
          pg.p, { timeout: 40_000 }
        )
        await win.waitForTimeout(1000)
        const cap = await evalRace(win, evalCollectPage, pg.p, `${t.tag}-p${pg.p}-collect`, 20_000)
        pg.cap = cap
        await writeJson(`${t.tag}-p${pg.p}-page.json`, cap)
        const anchorOk = cap.err === undefined ? cap.anchors.filter((a) => a.skipped === undefined).length : -1
        log(`采集 ${t.tag} p${pg.p}: ${cap.err !== undefined ? `err=${cap.err}` : `spans=${cap.spanTotal} chars=${cap.charTotal} anchors=${anchorOk}/${cap.anchors.length}`}`)
      } catch (e) {
        pg.cap = { err: String(e.message ?? e) }
        summary.notes.push(`${t.tag} p${pg.p} 采集异常: ${pg.cap.err}`)
      }
    }
    try { await win.getByRole('button', { name: '关闭标签页', exact: false }).first().click({ timeout: 5000 }) } catch { /* 尽力保下轮干净 */ }
    await win.waitForTimeout(400)
  }
  await app.close()
  appRef = null
  log('Electron 阶段完成')

  // ── Node 阶段 2：真函数 bundle（现场生成——out/ 不入受锁面）──
  const esbuildBin = join(ROOT, 'node_modules', 'esbuild', 'bin', 'esbuild')
  const bundleDir = join(ROOT, 'out', 'f-a8-bundles')
  await mkdir(bundleDir, { recursive: true })
  for (const [src, out] of [
    ['src/renderer/features/reader/anchor-serialize.ts', 'as-bundle.mjs'],
    ['src/renderer/features/reader/annotation-anchor.ts', 'aa-bundle.mjs'],
    ['src/renderer/features/reader/annotation-merge.ts', 'am-bundle.mjs'],
    ['src/renderer/features/reader/annotation-resolve.ts', 'ar-bundle.mjs'],
    ['src/renderer/features/reader/pdf-item-geometry.ts', 'pg-bundle.mjs']
  ]) {
    await runSpawn(process.execPath, [esbuildBin, join(ROOT, src), '--bundle', '--format=esm', '--platform=node', `--outfile=${join(bundleDir, out)}`])
  }
  const as = await import(pathToFileURL(join(bundleDir, 'as-bundle.mjs')).href)
  const aa = await import(pathToFileURL(join(bundleDir, 'aa-bundle.mjs')).href)
  const am = await import(pathToFileURL(join(bundleDir, 'am-bundle.mjs')).href)
  const ar = await import(pathToFileURL(join(bundleDir, 'ar-bundle.mjs')).href)
  const pgm = await import(pathToFileURL(join(bundleDir, 'pg-bundle.mjs')).href)
  const { Util } = await import(PDFJS_URL)

  // ── Node 阶段 3：双链计算+对比+真值+G2 ──
  for (const t of PAGESET) {
    for (const pg of t.pages) {
      const cap = pg.cap
      const key = `${t.tag}-p${pg.p}`
      if (cap === undefined || cap.err !== undefined || cap.__timeout) {
        summary.pages[key] = { set: pg.set, skipped: `采集面缺席: ${JSON.stringify(cap && (cap.err ?? 'timeout'))}` }
        continue
      }
      const tlBox = cap.tlBox
      const base = { x: 0, y: 0, w: tlBox.w, h: tlBox.h }
      const entry = {
        page: pg.p,
        text: { items: pg.node.items, styles: pg.node.styles, lang: pg.node.lang },
        geometry: { rotate: pg.node.rotate, view: pg.node.view },
        box: { w: Math.round(cap.canvasBox.w), h: Math.round(cap.canvasBox.h) }
      }
      const itemsText = entry.text.items.map((it) => it.str).filter((s) => s.length > 0).join('')
      const reconcile = itemsText === cap.domText
      const anchorList = cap.anchors.filter((a) => a.skipped === undefined)
      const annotations = anchorList.map((a, i) => annotationOf(`${t.tag}-p${pg.p}-a${i}`, `f-a8g1-${t.tag}`, pg.p - 1, a, []))
      // 链 B（项几何）=真整函数（rects 参数此处空——存量回退面非本票判据，
      // resolve 成功即产出；annotation.rects 仅失败兜底消费）
      let resolvedB = {}
      try { resolvedB = ar.resolveAnnotationRectsItem(entry, annotations, pg.p - 1) } catch (e) {
        summary.notes.push(`${key} 链 B 整函数异常: ${String(e)}`)
      }
      // 页级 A2 口径 outside（±1px——f-a6 §1 同形）
      const outsidePage = cap.allSpanBoxes.filter((s) =>
        s.x < tlBox.x - 1 || s.y < tlBox.y - 1 || s.x + s.w > tlBox.x + tlBox.w + 1 || s.y + s.h > tlBox.y + tlBox.h + 1).length
      const rows = []
      for (let i = 0; i < cap.anchors.length; i += 1) {
        const a = cap.anchors[i]
        const id = `${t.tag}-p${pg.p}-a${i}`
        if (a.skipped !== undefined) { rows.push({ id, form: a.form, skipped: a.skipped }); continue }
        const annotation = annotations[anchorList.indexOf(a)]
        const selector = { prefix: a.prefix, quote: a.quote, suffix: a.suffix, start: a.start }
        // 链 A：真 locateQuote 核（DOM 全文单项喂入——verifyQuote≡locateQuote(fullTextOf)
        // 与 verifyQuoteItem≡locateQuote(items 拼接) 同核单源，CR4 oracle 锁定等价）
        const atA = as.verifyQuoteItem([{ str: cap.domText }], selector)
        const atB = as.verifyQuoteItem(entry.text.items, selector)
        const lineH = (() => {
          const sizes = a.selected.map((s) => parseFloat(s.fontSize)).filter((v) => Number.isFinite(v) && v > 0).sort((x, y) => x - y)
          return sizes.length > 0 ? sizes[Math.floor((sizes.length - 1) / 2)] : undefined
        })()
        // 链 A rects：真 mergeLineRects+真 mergeRects（复刻守卫=replica 逐位对照）
        const mLRreal = aa.mergeLineRects(a.rawRects, tlBox.w, lineH)
        const mLRreplica = mergeLineRectsReplica(a.rawRects, tlBox.w, lineH)
        const guardEqual = JSON.stringify(mLRreplica.map((r) => roundBox(r, 6))) === JSON.stringify(mLRreal.map((r) => roundBox(r, 6)))
        const rectsA = am.mergeRects(
          mLRreal.map((r) => ({ page: 0, x: clamp01((r.x - tlBox.x) / tlBox.w), y: clamp01((r.y - tlBox.y) / tlBox.h), w: clamp01(r.w / tlBox.w), h: clamp01(r.h / tlBox.h) })),
          lineH !== undefined ? lineH / tlBox.h : undefined
        )
        // 链 A bands：真 bandFromMetrics+mergeNear 复刻（f-a6 §8 守卫形态）
        const bandsA = []
        for (const s of a.selected) {
          if (s.h <= 1) continue
          const m = s.metrics !== null && s.metrics !== undefined
            ? { ascent: s.metrics.ascent, descent: s.metrics.descent, fontAscent: s.metrics.fontAscent, fontDescent: s.metrics.fontDescent }
            : null
          const band = ar.bandFromMetrics({ x: s.x, y: s.y }, parseFloat(s.fontSize), m, tlBox)
          if (band === null) continue
          mergeNearReplica(bandsA, { ...band, x0: (s.x - tlBox.x) / tlBox.w, x1: (s.x + s.w - tlBox.x) / tlBox.w })
        }
        const rb = resolvedB[annotation.id]
        const rectsB = rb !== undefined ? rb.rects : null
        const bandsB = rb !== undefined ? rb.bands : null
        // 对比：1D x 轴 IoU（f-a6 口径——判据 a 主数字）+2D 面积 IoU（申报：
        // 行盒 vs 声明字形盒系统顶偏压制 2D 值）+逐块 IoU+band 逐对差
        const cmp = rectsB === null ? null : {
          io1d: iou1D(rectsA, rectsB, 2 / tlBox.h),
          area: areaIou(rectsA, rectsB),
          blocks: blockIouPairs(rectsA, rectsB, 2 / tlBox.h),
          bands: bandsB === null ? null : bandPairs(bandsA, bandsB),
          countA: rectsA.length, countB: rectsB.length, bandsA: bandsA.length, bandsB: bandsB.length
        }
        // 真值+G2（at=链 B 实际校偏；relocate 申报）
        const at = atB !== null ? atB : a.start
        const vp = itemViewportOfReplica(entry)
        let boxes = []
        let tolPx = 2
        try {
          const r = pgm.rectsForOffsetRange(entry.text.items, entry.text.styles, vp, at, at + a.quote.length)
          boxes = r.boxes
          tolPx = r.tolPx
        } catch (e) {
          summary.notes.push(`${id} rectsForOffsetRange 异常: ${String(e)}`)
        }
        const itemBlocks = pgm.baselineGroupBlocks(boxes, tolPx, base.w)
        const domBlocksLocal = mLRreal.map((r) => ({ x: r.x - tlBox.x, y: r.y - tlBox.y, w: r.w, h: r.h }))
        const offsets = offsetsOfItems(entry.text.items)
        // baselineRowTruth 消费面=viewport.transform 六元数（f-a6-diag-lib:355）——
        // 以真 viewportTransformFor（pdf.mjs 内联数学单源）构造 pdfjs viewport 同形
        const vpPdfLike = { transform: pgm.viewportTransformFor(vp) }
        const truth = baselineRowTruth(entry.text.items, entry.text.styles, vpPdfLike, at, at + a.quote.length, offsets, Util, 2)
        const truthLoose = baselineRowTruth(entry.text.items, entry.text.styles, vpPdfLike, at, at + a.quote.length, offsets, Util, Math.max(2, 0.5 * (lowerMedian(boxes.map((b) => b.fontH).filter((v) => v > 0)) ?? 12)))
        const g2 = {
          healthItem: pgm.selectionHealth(boxes, itemBlocks, base),
          healthDom: pgm.selectionHealth(boxes, domBlocksLocal, base),
          healthSpan: pgm.selectionHealth(spanBoxesAsItemBoxes(a.selected.map((s) => ({ x: s.x - tlBox.x, y: s.y - tlBox.y, w: s.w, h: s.h }))), domBlocksLocal, base)
        }
        rows.push({
          id, form: a.form,
          start: a.start, end: a.end, quoteLen: a.quote.length,
          atA, atB, relocateA: atA !== null ? atA - a.start : null, relocateB: atB !== null ? atB - a.start : null,
          guardEqual,
          rectsA: rectsA.map((r) => roundBox(r, 4)), bandsA,
          rectsB, bandsB, cmp,
          truth: { strict: truth.rows, loose: truthLoose.rows },
          blockCount: { dom: mLRreal.length, domNorm: rectsA.length, item: itemBlocks.length },
          rightOver: { domPx: rightOverflowPx(domBlocksLocal, base.w), itemPx: rightOverflowPx(itemBlocks, base.w) },
          zeroH: { dom: domBlocksLocal.filter((r) => r.h < 0.5).length, item: itemBlocks.filter((r) => r.h < 0.5).length },
          g2,
          overlapDomVsItem: overlapMetric(domBlocksLocal, itemBlocks),
          selectedSpanOutside: a.selected.filter((s) =>
            s.x < tlBox.x - 0.5 || s.y < tlBox.y - 0.5 || s.x + s.w > tlBox.x + tlBox.w + 0.5 || s.y + s.h > tlBox.y + tlBox.h + 0.5).length
        })
      }
      const dual = {
        tag: t.tag, page: pg.p, set: pg.set, reconcile,
        scaleFactor: cap.scaleFactor, tlBox, canvasBox: cap.canvasBox, entryBox: entry.box,
        view: pg.node.view, rotate: pg.node.rotate, items: entry.text.items.length, spanTotal: cap.spanTotal, charTotal: cap.charTotal,
        outsidePage: { count: outsidePage, total: cap.allSpanBoxes.length },
        anchors: rows
      }
      await writeJson(`${key}-dual.json`, dual)
      const oks = rows.filter((r) => r.cmp !== null && r.cmp !== undefined)
      const fmt = (arr) => arr.map((v) => (v === null || v === undefined ? 'null' : v.toFixed(4))).join(',')
      summary.pages[key] = {
        set: pg.set, reconcile,
        anchors: rows.length, resolved: oks.length,
        iou1d: oks.map((r) => r.cmp.io1d.iou),
        iouArea: oks.map((r) => r.cmp.area.iou),
        dyMedianPx: oks.length > 0 ? medOfPx(oks.flatMap((r) => r.cmp.blocks.map((b) => b.dy))) * tlBox.h : null,
        guardAllEqual: rows.every((r) => r.guardEqual !== false)
      }
      log(`双链 ${key}（${pg.set}）: reconcile=${reconcile} anchors=${rows.length} resolved=${oks.length} IoU1D=[${fmt(summary.pages[key].iou1d)}] IoU2D=[${fmt(summary.pages[key].iouArea)}] dyMed=${summary.pages[key].dyMedianPx === null ? 'null' : summary.pages[key].dyMedianPx.toFixed(2)}px guard=${summary.pages[key].guardAllEqual}`)
    }
  }

  summary.finishedAt = new Date().toISOString()
  await writeJson('verdict-summary.json', summary)
  log('完成：产物在', OUT)
}

main().catch(async (e) => {
  console.error('[f-a8g1] FAIL', e)
  process.exitCode = 1
  try { await appRef?.close() } catch { /* 尽力清理（防残留进程） */ }
  process.exit(process.exitCode ?? 1)
})
