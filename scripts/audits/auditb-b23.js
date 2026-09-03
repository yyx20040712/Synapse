/**
 * AUDIT-B B2+B3 取证探针（合并一次 launch——同一阅读器会话先后执行）。
 *
 * B2 = SH3 双击最大化 × F-03 滚动进度记账：
 *   种子 8 页 PDF→开卷→程序滚到中部（scrollTop 直写=真 scroll 事件→防抖 2s
 *   落账）→记录页 P1（视口中心最近页+sr-only store 页）→装 scroll 事件计数器
 *   →双击 drag 区（.app-header 内非交互点）触发 maximize（2s 内 isMaximized
 *   未真则回退三键「最大化」按钮，路径记录在档）→量 P2/scrollTop/事件数→
 *   unmaximize→量 P3→关应用→node ABI 子进程读真库 last_read_page 对照。
 *   判级：|P2−P1|≥1 页=W；瞬时扰动自愈=N。
 * B3 = SH3 drag 区 × 阅读器键位滚动：
 *   PageDown（真键盘 CDP）在三种焦点面下的滚动位移：body 初值/drag 区点击后/
 *   header 可聚焦钮（ws-trigger）focus 面——附 keydown target 捕获转储。
 *   判级：三面全滚=W 无（键位送达）；drag 区吞键且无替代路径=W。
 * 产物：scripts/audits/auditb-out/b23.json + b23-*.png
 * 用法：node scripts/audits/auditb-b23.js（需先 build）
 */
import { _electron as electron } from '@playwright/test'
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { copyFile, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

const ROOT = process.cwd()
const OUT = join(ROOT, 'scripts', 'audits', 'auditb-out')
const R = { meta: { script: 'auditb-b23.js', date: new Date().toISOString() }, b2: {}, b3: {} }
const log = (...a) => console.log(`[b23 ${new Date().toISOString().slice(11, 19)}]`, ...a)
/** 模块级持有——catch 也能关应用（防 electron 进程残留挂死探针） */
let app = null

// ── pdf-factory createMultiPagePdf 内联（tests/utils/pdf-factory.ts 同源）──
const PDF_KNOWN_TEXT = 'SMART WATER TEST DOC'
const esc = (s) => s.replaceAll('\\', '\\\\').replaceAll('(', '\\(').replaceAll(')', '\\)')
function assemblePdf(objects) {
  const enc = new TextEncoder()
  const parts = []
  let byteLen = 0
  const push = (s) => { const b = enc.encode(s); parts.push(b); byteLen += b.length }
  push('%PDF-1.4\n')
  const offsets = []
  objects.forEach((body, i) => { offsets.push(byteLen); push(`${i + 1} 0 obj\n${body}\nendobj\n`) })
  const xrefStart = byteLen
  push(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`)
  for (const off of offsets) push(`${String(off).padStart(10, '0')} 00000 n \n`)
  push(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`)
  const out = new Uint8Array(byteLen)
  let cursor = 0
  for (const part of parts) { out.set(part, cursor); cursor += part.length }
  return out
}
function createMultiPagePdf(pages, text = PDF_KNOWN_TEXT) {
  const kids = []
  for (let n = 1; n <= pages; n += 1) kids.push(`${2 + n} 0 R`)
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', `<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${pages} >>`]
  for (let n = 1; n <= pages; n += 1) {
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${2 * pages + 3} 0 R >> >> /Contents ${pages + 2 + n} 0 R >>`)
  }
  for (let n = 1; n <= pages; n += 1) {
    const stream = `BT /F1 18 Tf 72 ${720 - (n - 1) * 24} Td (P${n} ${esc(text)}) Tj ET`
    objects.push(`<< /Length ${new TextEncoder().encode(stream).length} >>\nstream\n${stream}\nendstream`)
  }
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')
  return assemblePdf(objects)
}

async function seedRow(userData, fileRef, sha, title) {
  const pkgDir = join(ROOT, 'node_modules', 'better-sqlite3')
  const releaseBinding = join(pkgDir, 'build', 'Release', 'better_sqlite3.node')
  const cacheDir = join(pkgDir, 'abi-cache')
  const wanted = `node-v${process.versions.modules}`
  const dirs = (await readdir(cacheDir)).filter((d) => d.startsWith('node-v'))
  const pick = dirs.includes(wanted) ? wanted : (dirs.sort().at(-1) ?? '')
  const electronBinding = await readFile(releaseBinding)
  await copyFile(join(cacheDir, pick, 'better_sqlite3.node'), releaseBinding)
  try {
    await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [join(ROOT, 'tests', 'e2e', 'seed-paper.mjs')], {
        env: { ...process.env, SEED_DB: join(userData, 'synapse.db'), SEED_FILE_REF: fileRef, SEED_SHA: sha, SEED_TITLE: title },
        stdio: 'inherit'
      })
      child.on('exit', (c) => (c === 0 ? resolve() : reject(new Error(`seed 退出码 ${c}`))))
      child.on('error', reject)
    })
  } finally {
    await writeFile(releaseBinding, electronBinding)
  }
}

/** 阅读器滚动容器快照：scrollTop/scrollHeight/clientHeight/视口中心最近页(0基)/sr-only 页 */
function readerSnapshotExpr() {
  return `(() => {
    const sc = document.querySelector('.min-w-0.flex-1.overflow-auto.p-3')
    const boxes = [...sc.querySelectorAll('[data-page-box]')].map((b) => b.getBoundingClientRect())
    const scr = sc.getBoundingClientRect()
    const cy = scr.top + sc.clientHeight / 2
    let best = -1, bd = Infinity
    boxes.forEach((r, i) => { const c = r.top + r.height / 2; const d = Math.abs(c - cy); if (d < bd) { bd = d; best = i } })
    const sr = document.querySelector('.sr-only')
    const m = sr ? /当前第 (\\d+) 页/.exec(sr.textContent || '') : null
    const canvas = document.querySelector('canvas[data-pdf-canvas]')
    return { scrollTop: Math.round(sc.scrollTop), scrollH: Math.round(sc.scrollHeight), clientH: sc.clientHeight, nearestPage0: best, pageCount: boxes.length, srOnlyPage: m ? +m[1] : null, vp: { w: window.innerWidth, h: window.innerHeight }, canvasW: canvas ? Math.round(canvas.getBoundingClientRect().width) : null }
  })()`
}

/** scroll 事件计数器装/读（运行时监听——不改任何源文件） */
const COUNTER_INSTALL = `(() => {
  const sc = document.querySelector('.min-w-0.flex-1.overflow-auto.p-3')
  sc.__auditbScrollCount = 0
  sc.__auditbLastTop = sc.scrollTop
  sc.addEventListener('scroll', () => { sc.__auditbScrollCount += 1; sc.__auditbLastTop = sc.scrollTop }, { passive: true })
  return true
})()`

async function main() {
  if (!existsSync(join(ROOT, 'out', 'main', 'index.js'))) throw new Error('先 build')
  await mkdir(OUT, { recursive: true })
  const userData = join(tmpdir(), 'synapse-auditb-b23')
  await rm(userData, { recursive: true, force: true })
  const PAGES = 8

  // 1) 首启建 schema → 种子 8 页 PDF → 重启 → 开卷
  app = await electron.launch({ args: ['out/main/index.js'], env: { ...process.env, SYNAPSE_USER_DATA: userData } })
  let win = await app.firstWindow()
  await win.getByRole('button', { name: '文献库' }).waitFor({ timeout: 30_000 })
  await app.close()
  app = null
  const title = 'AUDITB B2 多页进度文献'
  const bytes = createMultiPagePdf(PAGES)
  const sha = createHash('sha256').update(bytes).digest('hex')
  const fileRef = `${sha.slice(0, 2)}/${sha.slice(2, 4)}/${sha}.pdf`
  const abs = join(userData, 'files', ...fileRef.split('/'))
  mkdirSync(dirname(abs), { recursive: true })
  writeFileSync(abs, bytes)
  await seedRow(userData, fileRef, sha, title)
  app = await electron.launch({ args: ['out/main/index.js'], env: { ...process.env, SYNAPSE_USER_DATA: userData } })
  win = await app.firstWindow()
  await win.setDefaultTimeout(30_000)
  // 不用 setViewportSize——CDP 设备度量仿真会把内容区锁死在仿真尺寸，
  // maximize 后 innerWidth/innerHeight 不随真窗变（首轮实测 vp 恒 1280×800，
  // reflow 不触发）——B2 的 resize 面必须用真窗口自然尺寸
  await win.getByRole('button', { name: '文献库' }).waitFor()
  await win.locator('.lib-card').first().dblclick()
  await win.waitForSelector('canvas[data-pdf-canvas]', { timeout: 30_000 })
  await win.waitForSelector('[data-page-root] .textLayer span', { timeout: 20_000 })
  await win.waitForTimeout(1200)

  R.b2.initial = await win.evaluate(readerSnapshotExpr())
  R.b2.boundsBefore = await app.evaluate(({ BrowserWindow }) => {
    const w = BrowserWindow.getAllWindows()[0]
    const b = w.getBounds()
    const c = w.getContentBounds()
    return { x: b.x, y: b.y, w: b.width, h: b.height, cw: c.width, ch: c.height }
  })
  log('B2 初始', JSON.stringify(R.b2.initial), 'bounds=', JSON.stringify(R.b2.boundsBefore))

  // 2) 滚到中部（scrollTop 直写真 scroll 事件）→ 等防抖 2s 落账
  await win.evaluate(() => {
    const sc = document.querySelector('.min-w-0.flex-1.overflow-auto.p-3')
    sc.scrollTop = Math.round(sc.scrollHeight * 0.4)
  })
  await win.waitForTimeout(3200)
  R.b2.afterScroll = await win.evaluate(readerSnapshotExpr())
  await win.evaluate(COUNTER_INSTALL)
  log('B2 滚后', JSON.stringify(R.b2.afterScroll))

  // 3) 双击 drag 区触发 maximize（2s 未真→回退三键按钮；路径在档）
  const headerCenter = await win.evaluate(() => {
    const h = document.querySelector('.app-header-name') ?? document.querySelector('.app-header')
    const r = h.getBoundingClientRect()
    return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }
  })
  await win.mouse.dblclick(headerCenter.x, headerCenter.y)
  let maximized = false
  for (let i = 0; i < 10; i++) {
    await win.waitForTimeout(200)
    maximized = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.isMaximized() ?? false)
    if (maximized) break
  }
  R.b2.maximizePath = maximized ? 'dblclick-drag-region' : 'fallback-button'
  if (!maximized) {
    await win.getByRole('button', { name: '最大化' }).click()
    for (let i = 0; i < 10; i++) {
      await win.waitForTimeout(200)
      maximized = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.isMaximized() ?? false)
      if (maximized) break
    }
  }
  R.b2.isMaximized = maximized
  R.b2.boundsAtMax = await app.evaluate(({ BrowserWindow }) => {
    const w = BrowserWindow.getAllWindows()[0]
    const b = w.getBounds()
    const c = w.getContentBounds()
    return { x: b.x, y: b.y, w: b.width, h: b.height, cw: c.width, ch: c.height }
  })
  await win.waitForTimeout(1500) // 重排+canvas 重渲窗口
  R.b2.atMax = await win.evaluate(readerSnapshotExpr())
  R.b2.viewportAtMax = await win.evaluate(`({ w: window.innerWidth, h: window.innerHeight })`)
  R.b2.scrollEventsDuringMaximize = await win.evaluate(`document.querySelector('.min-w-0.flex-1.overflow-auto.p-3').__auditbScrollCount`)
  await win.screenshot({ path: join(OUT, 'b23-maximized.png') })
  log('B2 最大化后', JSON.stringify(R.b2.atMax), 'bounds=', JSON.stringify(R.b2.boundsAtMax), 'vp=', JSON.stringify(R.b2.viewportAtMax), 'scrollEvents=', R.b2.scrollEventsDuringMaximize, 'path=', R.b2.maximizePath)

  // 4) unmaximize（同路径）→ 量终态
  await win.evaluate(COUNTER_INSTALL) // 重装计数器（重置）
  if (R.b2.maximizePath === 'dblclick-drag-region') {
    await win.mouse.dblclick(headerCenter.x, headerCenter.y)
  } else {
    await win.getByRole('button', { name: '向下还原' }).click()
  }
  let restored = false
  for (let i = 0; i < 10; i++) {
    await win.waitForTimeout(200)
    restored = !(await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.isMaximized() ?? false))
    if (restored) break
  }
  await win.waitForTimeout(1500)
  R.b2.atRestore = await win.evaluate(readerSnapshotExpr())
  R.b2.scrollEventsDuringUnmaximize = await win.evaluate(`document.querySelector('.min-w-0.flex-1.overflow-auto.p-3').__auditbScrollCount`)
  await win.waitForTimeout(2500) // 防抖窗：让终态落库
  R.b2.final = await win.evaluate(readerSnapshotExpr())
  log('B2 还原后', JSON.stringify(R.b2.atRestore), 'final=', JSON.stringify(R.b2.final))

  // 5) 关应用 → 真库 last_read_page 对照
  await app.close()
  {
    const pkgDir = join(ROOT, 'node_modules', 'better-sqlite3')
    const releaseBinding = join(pkgDir, 'build', 'Release', 'better_sqlite3.node')
    const cacheDir = join(pkgDir, 'abi-cache')
    const wanted = `node-v${process.versions.modules}`
    const dirs = (await readdir(cacheDir)).filter((d) => d.startsWith('node-v'))
    const pick = dirs.includes(wanted) ? wanted : (dirs.sort().at(-1) ?? '')
    const electronBinding = await readFile(releaseBinding)
    const electronSha = createHash('sha256').update(electronBinding).digest('hex')
    await copyFile(join(cacheDir, pick, 'better_sqlite3.node'), releaseBinding)
    try {
      const dbPathRoot = join(userData, 'synapse.db').replaceAll('\\', '/')
      const dbPathWs = join(userData, 'workspaces', 'default', 'synapse.db').replaceAll('\\', '/')
      // 双路径探测：L0 legacy=根库；二次启动会物化迁移 root→workspaces/default
      //（workspace.service L0 态机）——取含 papers 表者
      const code = `
        import { createRequire } from 'node:module'
        const require = createRequire(${JSON.stringify(join(ROOT, 'package.json'))})
        const Database = require('better-sqlite3')
        const found = []
        for (const p of ${JSON.stringify([dbPathRoot, dbPathWs])}) {
          try {
            const db = new Database(p)
            const has = db.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE type='table' AND name='papers'").get().n > 0
            if (has) {
              found.push({ path: p, papers: db.prepare('SELECT id, last_read_page FROM papers').all() })
            }
            db.close()
          } catch { /* 缺文件/空库——跳过 */ }
        }
        console.log(JSON.stringify(found))
      `
      const out = await new Promise((resolve, reject) => {
        const child = spawn(process.execPath, ['--input-type=module', '-e', code], { stdio: ['ignore', 'pipe', 'pipe'] })
        let o = ''
        let e2 = ''
        child.stdout.on('data', (d) => (o += d))
        child.stderr.on('data', (d) => (e2 += d))
        child.on('exit', (c) => (c === 0 ? resolve(o) : reject(new Error(`退出码 ${c}: ${e2}`))))
        child.on('error', reject)
      })
      R.b2.dbLastReadPage = JSON.parse(out)
    } finally {
      await writeFile(releaseBinding, electronBinding)
    }
    const restoredBinding = await readFile(releaseBinding)
    R.b2.bindingRestored = createHash('sha256').update(restoredBinding).digest('hex') === electronSha
  }
  R.b2.summary = {
    pageJumps: {
      scroll_to_max: R.b2.atMax.nearestPage0 - R.b2.afterScroll.nearestPage0,
      max_to_restore: R.b2.atRestore.nearestPage0 - R.b2.atMax.nearestPage0,
      restore_to_final: R.b2.final.nearestPage0 - R.b2.atRestore.nearestPage0,
      netDrift: R.b2.final.nearestPage0 - R.b2.afterScroll.nearestPage0
    },
    srOnly: { afterScroll: R.b2.afterScroll.srOnlyPage, atMax: R.b2.atMax.srOnlyPage, atRestore: R.b2.atRestore.srOnlyPage, final: R.b2.final.srOnlyPage },
    dbLastRead: R.b2.dbLastReadPage?.[0]?.papers?.[0]?.last_read_page ?? null,
    dbHit: R.b2.dbLastReadPage?.map((d) => ({ path: d.path.split('synapse-auditb-')[1] ?? d.path, lastRead: d.papers?.[0]?.last_read_page })) ?? null
  }
  log('B2 summary', JSON.stringify(R.b2.summary), 'bindingRestored=', R.b2.bindingRestored)

  // ── B3：重开应用（干净焦点面）──
  app = await electron.launch({ args: ['out/main/index.js'], env: { ...process.env, SYNAPSE_USER_DATA: userData } })
  win = await app.firstWindow()
  await win.setDefaultTimeout(30_000)
  // 同上：不用 setViewportSize（B3 焦点面与视口无关，但保持一致）
  await win.getByRole('button', { name: '文献库' }).waitFor()
  await win.locator('.lib-card').first().dblclick()
  await win.waitForSelector('canvas[data-pdf-canvas]', { timeout: 30_000 })
  await win.waitForTimeout(1000)

  const scrollTopNow = `document.querySelector('.min-w-0.flex-1.overflow-auto.p-3').scrollTop`
  const keydownTargetProbe = `(() => {
    window.__auditbKeyTarget = null
    document.addEventListener('keydown', (e) => { window.__auditbKeyTarget = e.target ? (e.target.tagName + '.' + String(e.target.className && e.target.className.split ? e.target.className.split(' ')[0] : '')) : String(e.target) }, { capture: true, once: true })
    return true
  })()`

  // 3a) body 初值焦点面
  R.b3.body = { activeElement: await win.evaluate(`document.activeElement ? document.activeElement.tagName : 'null'`) }
  await win.evaluate(keydownTargetProbe)
  const t0 = await win.evaluate(scrollTopNow)
  await win.keyboard.press('PageDown')
  await win.waitForTimeout(400)
  const t1 = await win.evaluate(scrollTopNow)
  R.b3.body.delta = t1 - t0
  R.b3.body.keyTarget = await win.evaluate(`window.__auditbKeyTarget`)
  log('B3 body', JSON.stringify(R.b3.body))

  // 3b) drag 区点击后（点击落 drag 区=系统窗拖路径，页面不收——焦点应不变）
  const dragPoint = await win.evaluate(() => {
    const h = document.querySelector('.app-header-name') ?? document.querySelector('.app-header')
    const r = h.getBoundingClientRect()
    return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }
  })
  await win.mouse.click(dragPoint.x, dragPoint.y).catch((e) => (R.b3.dragClickError = String(e)))
  await win.waitForTimeout(400)
  R.b3.drag = { activeElement: await win.evaluate(`document.activeElement ? document.activeElement.tagName + (document.activeElement.className ? '.' + String(document.activeElement.className).split(' ')[0] : '') : 'null'`) }
  await win.evaluate(keydownTargetProbe)
  const t2 = await win.evaluate(scrollTopNow)
  await win.keyboard.press('PageDown')
  await win.waitForTimeout(400)
  const t3 = await win.evaluate(scrollTopNow)
  R.b3.drag.delta = t3 - t2
  R.b3.drag.keyTarget = await win.evaluate(`window.__auditbKeyTarget`)
  log('B3 drag', JSON.stringify(R.b3.drag))

  // 3c) header 可聚焦钮（ws-trigger=切换器触发钮——真实可聚焦 header 元素）
  await win.getByRole('button', { name: '切换课题' }).click()
  await win.waitForTimeout(250)
  R.b3.headerBtn = { activeElement: await win.evaluate(`document.activeElement ? document.activeElement.tagName + '.' + String(document.activeElement.className).split(' ')[0] : 'null'`) }
  await win.evaluate(keydownTargetProbe)
  const t4 = await win.evaluate(scrollTopNow)
  await win.keyboard.press('PageDown')
  await win.waitForTimeout(400)
  const t5 = await win.evaluate(scrollTopNow)
  R.b3.headerBtn.delta = t5 - t4
  R.b3.headerBtn.keyTarget = await win.evaluate(`window.__auditbKeyTarget`)
  log('B3 headerBtn', JSON.stringify(R.b3.headerBtn))
  await win.getByRole('button', { name: '切换课题' }).click() // 合上面板

  // 替代路径事实：滚轮在阅读器区（onWheel 接管信号在 ReaderPage JSX——静态证据）
  R.b3.wheelPathStatic = 'ReaderPage.tsx onWheel → spProg.onUserTakeover + 原生滚动（wheel 不依赖焦点）'
  R.b3.summary = {
    pageDownWorks_body: (R.b3.body.delta ?? 0) > 50,
    pageDownWorks_afterDragClick: (R.b3.drag.delta ?? 0) > 50,
    pageDownWorks_headerBtnFocus: (R.b3.headerBtn.delta ?? 0) > 50,
    expectedStepPx: Math.round((R.b2.initial?.clientH ?? 700) * 0.9)
  }
  await app.close()
  writeFileSync(join(OUT, 'b23.json'), JSON.stringify(R, null, 2))
  log('B3 summary', JSON.stringify(R.b3.summary))
}

await main().catch(async (e) => {
  R.error = String(e)
  try { writeFileSync(join(OUT, 'b23.json'), JSON.stringify(R, null, 2)) } catch { /* 原始错误优先 */ }
  console.error('[b23] FAIL', e)
  try { if (app !== null) await app.close() } catch { /* 尽力关 */ }
  process.exit(1)
})
