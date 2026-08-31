/**
 * F-A4 真机取证探针——票面 §5（选区自绘并集/标注贴行/工具条定位归一三面）。
 * crib f-r1-verify.mjs 运行模式（Electron 真机/真实库副本/JSON+截图）。
 *
 * 相位：--phase baseline（修前基线——三现象数值只记录不断言，票面 §5 要求
 * 修前取证→实现→修后复测）；--phase after（修后复测——票面判据断言）。
 *
 * 会话编排：
 * - S1 主会话（全判据）：100% 下真鼠标跨 3 行拖选→①自绘无叠深+③工具条
 *   定位→保存高亮→②标注贴行对齐；
 * - S2 缩放会话（lite）：开「选择模式」（INV-42 rect 穿透——重选 S1 已存
 *   高亮同一行带，跨会话同源）+ctrl+滚轮 150%→S6 缩放稳定性数据（归一化
 *   几何对比 S1）；
 * - S3 换档会话（lite）：settings.json uiScale→medium 关态改写重开→存量
 *   标注渲染（零迁移）+新行拖选 lite 判据。
 *
 * 判据（after 相位，S1 全量/S2S3 lite）：
 * - ① [data-testid=selection-rect] 在场且两两相交面积=0（INV-40 判据 crib）
 *   +::selection computed=transparent；
 * - ② 标注块与同带 span 行簇顶/底偏差 ≤2px+块两两垂直不相交；
 * - ③ 工具条 bounding 在滚动容器可视区内且距选区顶 <60px；
 * - ④ S6：zoom 100%↔150% 同源行自绘块归一化几何漂移 ≤2%+medium 重开
 *   存量标注在场；
 * - ⑤ pageerror 0。
 * 真机 Electron 短暂开窗属项目 LOOP 取证惯例（主控指令声明）。
 * 产物：scripts/audits/f-a4-out/{phase}-*.png + f-a4-verify-{phase}.json。
 */
import { _electron as electron } from '@playwright/test'
import { cp, mkdir, rm, readFile, writeFile } from 'node:fs/promises'
import { existsSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const PHASE = process.argv.includes('--phase') ? (process.argv[process.argv.indexOf('--phase') + 1] ?? 'after') : 'after'
const BASELINE = PHASE === 'baseline'
const ROOT = process.cwd()
const OUT = join(ROOT, 'scripts', 'audits', 'f-a4-out')
await mkdir(OUT, { recursive: true })
const log = (...a) => console.log(`[f-a4/${PHASE} ${new Date().toISOString().slice(11, 19)}]`, ...a)

/** 真实库副本（f-r1 同法）——[F-A4 差异] uiScale 保留用户实况（large 档），
 *  不删（票面 §5：用户实况 large 档是三面坐标放大缺陷的复现前提）。 */
async function freshUserData() {
  const src = join(process.env.APPDATA, 'Synapse')
  const userData = join(tmpdir(), `synapse-f-a4-${PHASE}`)
  await rm(userData, { recursive: true, force: true })
  for (const p of ['workspaces', 'ai-sensor']) await cp(join(src, p), join(userData, p), { recursive: true })
  for (const f of ['settings.json', 'workspace.json', 'window-state.json']) {
    if (existsSync(join(src, f))) await cp(join(src, f), join(userData, f))
  }
  return userData
}

const results = []
const check = (id, pass, detail) => {
  if (BASELINE) {
    results.push({ id, baselineOnly: true, detail })
    log(`BASE ${id} — ${detail}`)
  } else {
    results.push({ id, pass, detail })
    log(`${pass ? 'PASS' : 'FAIL'} ${id} — ${detail}`)
  }
}
const pageErrors = []

/** 选区/标注/工具条几何快照（视口 px）。span 按宽 >2px 收（原 ≥12 字符
 *  过滤会把窄 span 行——脚注/上标族——整行排除，b 面贴行判据失参照） */
const SELECT_DUMP = `(() => {
  const spans = [...document.querySelectorAll('.textLayer span')]
    .filter((s) => s.getBoundingClientRect().width > 2)
    .map((s) => { const g = s.getBoundingClientRect(); return { x: g.x, y: g.y, w: g.width, h: g.height } })
  const col = document.querySelector('[data-page-column="ready"]')
  const scroller = col?.closest('.overflow-auto')
  const sr = scroller?.getBoundingClientRect()
  return {
    spans, scroller: sr ? { x: sr.x, y: sr.y, w: sr.width, h: sr.height } : null,
    selBg: getComputedStyle(document.querySelector('.textLayer span') ?? document.body, '::selection').backgroundColor,
    paintRects: [...document.querySelectorAll('[data-testid="selection-rect"]')].map((el) => {
      const g = el.getBoundingClientRect()
      return { x: g.x, y: g.y, w: g.width, h: g.height, left: el.style.left, top: el.style.top, widthPct: el.style.width, heightPct: el.style.height }
    }),
    annRects: [...document.querySelectorAll('[data-testid="annotation-rect"]')].map((el) => {
      const g = el.getBoundingClientRect()
      return { x: g.x, y: g.y, w: g.width, h: g.height }
    }),
    toolbar: (() => { const t = document.querySelector('[data-testid="selection-toolbar"]'); if (!t) return null; const g = t.getBoundingClientRect(); return { x: g.x, y: g.y, w: g.width, h: g.height } })()
  }
})()`

const overlapArea = (a, b) => {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)
  return w > 0 && h > 0 ? w * h : 0
}

/** 可视行簇采集（f-r1 教训：渲染窗含离屏缓冲页——只取滚动容器可视区内
 *  且 y>顶栏遮蔽区 130px 的 span；exclude=已存标注块（常规态 rect 拦截
 *  拖选——F-A3 语义）相交行剔除） */
function collectRows(d, exclude = []) {
  const sc = d.scroller
  const vis = d.spans.filter((s) => {
    if (s.w <= 10) return false
    if (sc !== null && (s.y <= Math.max(sc.y + 40, 130) || s.y + s.h >= sc.y + sc.h - 20)) return false
    if (sc === null && s.y <= 130) return false
    return !exclude.some((a) => overlapArea({ x: s.x, y: s.y, w: s.w, h: s.h + 4 }, a) > 0)
  })
  const rows = []
  for (const s of vis) {
    const r = rows.find((row) => Math.abs(row.y - s.y) < 6)
    if (r === undefined) rows.push({ y: s.y, items: [s] })
    else r.items.push(s)
  }
  return rows.sort((a, b) => a.y - b.y)
}

/** 真鼠标跨行拖选（f-r1 教训：合成事件落点必须在视口内；8 步插值） */
async function drag(win, from, to) {
  await win.mouse.move(from.x, from.y)
  await win.mouse.down()
  for (let i = 1; i <= 8; i += 1) {
    await win.mouse.move(from.x + ((to.x - from.x) * i) / 8, from.y + ((to.y - from.y) * i) / 8)
  }
  await win.mouse.up()
  await win.waitForTimeout(700) // selectionchange 200ms 防抖+渲染
}

/** 开文献到就绪（返回 app+首窗；pageerror 全局收集） */
async function openFirstPaper(userData) {
  const app = await electron.launch({ args: ['out/main/index.js'], env: { ...process.env, SYNAPSE_USER_DATA: userData } })
  const win = await app.firstWindow()
  win.on('pageerror', (e) => {
    pageErrors.push(`${String(e)}\n[stack] ${e.stack ?? ''}`)
  })
  await win.getByRole('button', { name: '文献库' }).waitFor({ timeout: 20_000 })
  await win.getByRole('button', { name: '文献库' }).click()
  await win.waitForTimeout(800)
  await win.locator('button.lib-card').first().dblclick()
  await win.waitForSelector('[data-page-column="ready"]', { timeout: 20_000 })
  await win.waitForSelector('.textLayer span', { timeout: 20_000 })
  await win.waitForTimeout(1200)
  return { app, win }
}

/** S1 主会话：全判据（a/c 拖选期+b 保存后） */
async function mainSession(userData) {
  const { app, win } = await openFirstPaper(userData)
  let d0 = await win.evaluate(SELECT_DUMP)
  let rows = collectRows(d0)
  if (rows.length < 3) {
    await win.evaluate(() => {
      const scroller = document.querySelector('[data-page-column]')?.closest('.overflow-auto')
      if (scroller) scroller.scrollTop += Math.round(scroller.clientHeight / 2)
    })
    await win.waitForTimeout(900)
    d0 = await win.evaluate(SELECT_DUMP)
    rows = collectRows(d0)
  }
  if (rows.length < 3) throw new Error(`可视行簇不足 3 行：${rows.length}`)
  const r1 = rows[0].items[0]
  const r3 = rows[2].items.at(-1)
  const from = { x: r1.x + 2, y: r1.y + r1.h / 2 }
  const to = { x: Math.min(r3.x + r3.w - 2, (d0.scroller?.x ?? 0) + (d0.scroller?.w ?? 9999) - 4), y: r3.y + r3.h / 2 }
  await drag(win, from, to)
  let dSel = await win.evaluate(SELECT_DUMP)
  if (dSel.toolbar === null) {
    log('首次拖选未出条，偏移重试一次')
    await drag(win, { x: from.x, y: from.y + r1.h / 3 }, to)
    dSel = await win.evaluate(SELECT_DUMP)
  }
  await win.screenshot({ path: join(OUT, `${PHASE}-select.png`) })

  // —— ① a 面 ——
  check('a/paint-present', dSel.paintRects.length >= 2, `自绘块 ${dSel.paintRects.length} 个（跨 3 行拖选；::selection=${dSel.selBg}）`)
  let maxOv = 0
  for (let i = 0; i < dSel.paintRects.length; i += 1) {
    for (let j = i + 1; j < dSel.paintRects.length; j += 1) {
      maxOv = Math.max(maxOv, overlapArea(dSel.paintRects[i], dSel.paintRects[j]))
    }
  }
  check('a/paint-no-overlap', dSel.paintRects.length >= 2 && maxOv <= 0.5, `自绘块两两相交面积 max=${maxOv.toFixed(2)}px²（≤0.5 吞亚像素）`)
  check('a/native-selection-transparent', dSel.selBg === 'rgba(0, 0, 0, 0)', `::selection computed=${dSel.selBg}（transparent——视觉单通道=自绘层）`)

  // —— ③ c 面 ——
  const tb = dSel.toolbar
  const sc = dSel.scroller
  if (tb !== null && sc !== null) {
    const inside = tb.x >= sc.x - 1 && tb.y >= sc.y - 1 && tb.x + tb.w <= sc.x + sc.w + 1 && tb.y + tb.h <= sc.y + sc.h + 1
    const dist = tb.y <= r1.y ? r1.y - tb.y : Math.max(0, tb.y - (r3.y + r3.h))
    check('c/toolbar-in-viewport', inside, `工具条 (${tb.x.toFixed(0)},${tb.y.toFixed(0)},${tb.w.toFixed(0)}×${tb.h.toFixed(0)}) 在滚动容器 (${sc.x.toFixed(0)},${sc.y.toFixed(0)},${sc.w.toFixed(0)}×${sc.h.toFixed(0)}) 可视区内`)
    check('c/toolbar-near-selection', dist < 60, `工具条距选区顶 ${dist.toFixed(1)}px（<60）`)
  } else {
    check('c/toolbar-present', false, `工具条=${tb === null ? 'null' : 'ok'} scroller=${sc === null ? 'null' : 'ok'}`)
  }

  // —— 保存高亮 → ② b 面 ——
  if (dSel.toolbar !== null) {
    await win.getByTestId('selection-toolbar').getByRole('button', { name: '高亮' }).click({ timeout: 5_000 })
    await win.waitForSelector('[data-testid="annotation-rect"]', { timeout: 10_000 })
    await win.waitForTimeout(400)
  } else {
    log('工具条未出——保存跳过（仅回采存量标注）')
  }
  const dSaved = await win.evaluate(SELECT_DUMP)
  await win.screenshot({ path: join(OUT, `${PHASE}-saved.png`) })
  // —— ② b 面（票面 §5②：保存标注渲染贴行——与同文字行簇 top/height 偏差
  //    ≤2px。判据落点：块顶贴最近行簇 span 盒顶 ≤2px（基线实锤修前 +4px
  //    下偏）；块底落行簇底 [−1,+3]px 内（descender 尾=墨带合法超出行盒底
  //    ~0.25×fs——F-11「底缘悬至基线下」语义；修前单高块/分数收边均越界）。
  //    自绘块 vs 标注块的原始盒差另落信息项（行盒并集 vs 墨带=两有意几何）——
  const paints = dSel.paintRects
  const spansAll = dSaved.spans
  const spansWide = spansAll.filter((s) => s.w > 10)
  let maxTopDev = 0
  let botOutOfRange = 0
  let noRef = 0
  let maxPaintTopDev = 0
  let maxPaintHDev = 0
  for (const b of dSaved.annRects) {
    // 参照行簇 span：x 重叠+中心距 <30px 内取最近；优先宽 span（≥10px），
    // 窄行（逐字窄 span——脚注/上标族）回退全量——仍无参照=跳过计数（另行 log）
    const pickNear = (pool) => {
      const cand = pool.filter((s) => s.x < b.x + b.w && s.x + s.w > b.x && Math.abs(s.y + s.h / 2 - (b.y + b.h / 2)) < 30)
      let near = cand[0]
      for (const s of cand) {
        if (Math.abs(s.y + s.h / 2 - (b.y + b.h / 2)) < Math.abs(near.y + near.h / 2 - (b.y + b.h / 2))) near = s
      }
      return near
    }
    const near = pickNear(spansWide) ?? pickNear(spansAll)
    if (near === undefined) {
      noRef += 1
      continue
    }
    maxTopDev = Math.max(maxTopDev, Math.abs(b.y - near.y))
    const botDev = b.y + b.h - (near.y + near.h)
    if (botDev < -1 || botDev > 3) botOutOfRange += 1
    if (paints.length > 0) {
      let np = paints[0]
      for (const c of paints) {
        if (Math.abs(c.y - b.y) < Math.abs(np.y - b.y)) np = c
      }
      maxPaintTopDev = Math.max(maxPaintTopDev, Math.abs(b.y - np.y))
      maxPaintHDev = Math.max(maxPaintHDev, Math.abs(b.h - np.h))
    }
  }
  if (noRef > 0) log(`b 信息项：${noRef} 块无可参照行簇（窄 span 行）——不计入贴行判据`)
  check('b/ann-align-text', dSaved.annRects.length >= 2 && maxTopDev <= 2 && botOutOfRange === 0, `标注贴行：块顶 vs 行簇顶偏差 max=${maxTopDev.toFixed(2)}px（≤2）+块底落行簇底 desc 尾界 [−1,+3]px（越界 ${botOutOfRange} 块；${dSaved.annRects.length} 块分行——修前并簇 1 块）`)
  let maxAnnOv = 0
  for (let i = 0; i < dSaved.annRects.length; i += 1) {
    for (let j = i + 1; j < dSaved.annRects.length; j += 1) {
      maxAnnOv = Math.max(maxAnnOv, overlapArea(dSaved.annRects[i], dSaved.annRects[j]))
    }
  }
  check('b/ann-no-overlap', dSaved.annRects.length < 2 || maxAnnOv <= 0.5, `标注块两两相交面积 max=${maxAnnOv.toFixed(2)}px²`)
  // [W2 修订·门一回炉+主控裁决双基准] 黄块（标注=字形墨带基准）vs 灰块（自绘
  // =行盒并集基准）：两基准有意几何差上界 ≤4px（防退化——当前实测量级 3.9）
  check('b/ann-vs-paint-bounded', dSaved.annRects.length >= 2 && paints.length >= 2 && maxPaintTopDev <= 4 && maxPaintHDev <= 4, `黄块 vs 灰块（墨带 vs 行盒并集两有意基准）差：top max=${maxPaintTopDev.toFixed(2)}px/height max=${maxPaintHDev.toFixed(2)}px（≤4 上界——票面 §5② W2 修订双基准）`)
  await app.close()
  return { dSel, dSaved }
}

/** S2 缩放会话（lite）：选择模式穿透重选 S1 同一行带（已存高亮）+150% */
async function zoomSession(userData) {
  const { app, win } = await openFirstPaper(userData)
  await win.getByRole('button', { name: '选择模式' }).click()
  await win.waitForTimeout(300)
  await win.keyboard.down('Control')
  for (let i = 0; i < 5; i += 1) await win.mouse.wheel(0, -120)
  await win.keyboard.up('Control')
  await win.waitForTimeout(900)
  log('zoom 滚轮后=', await win.locator('[data-testid="zoom-label"]').textContent())
  const d0 = await win.evaluate(SELECT_DUMP)
  // S1 同源行带=被已存高亮覆盖的区域（选择模式下 rect 穿透可重选）；
  // 滚动带入视口中部（zoom 锚定后高亮可能在视口上方——负视口坐标拖选
  // 事件丢失，f-r1 教训）
  if (d0.annRects.length === 0) throw new Error('S2 前置失败：S1 高亮不在场')
  await win.evaluate(() => {
    const ann = [...document.querySelectorAll('[data-testid="annotation-rect"]')].map((el) => el.getBoundingClientRect())
    if (ann.length === 0) return
    const top = Math.min(...ann.map((a) => a.y))
    const bottom = Math.max(...ann.map((a) => a.y + a.height))
    const scroller = document.querySelector('[data-page-column]')?.closest('.overflow-auto')
    if (scroller === null) return
    const sc = scroller.getBoundingClientRect()
    if (top < sc.y + 80 || bottom > sc.y + sc.height - 40) {
      scroller.scrollTop += (top + bottom) / 2 - (sc.y + sc.height / 2)
    }
  })
  await win.waitForTimeout(600)
  const dz = await win.evaluate(SELECT_DUMP)
  const ax0 = Math.min(...dz.annRects.map((a) => a.x))
  const ay0 = Math.min(...dz.annRects.map((a) => a.y))
  const ax1 = Math.max(...dz.annRects.map((a) => a.x + a.w))
  const ay1 = Math.max(...dz.annRects.map((a) => a.y + a.h))
  await drag(win, { x: ax0 + 4, y: ay0 + 4 }, { x: ax1 - 4, y: ay1 - 4 })
  const dSel = await win.evaluate(SELECT_DUMP)
  await win.screenshot({ path: join(OUT, `${PHASE}-z150.png`) })
  if (!BASELINE) {
    check('s6/z150-paint-present', dSel.paintRects.length >= 2, `150% 下自绘块 ${dSel.paintRects.length} 个（选择模式重选同源行带）`)
    // [W3·票面 §5④ 字面] zoom 下工具条距离：拖选带顶距 <60px
    const tb = dSel.toolbar
    check('s6/z150-toolbar-near', tb !== null && Math.abs(tb.y + tb.h - ay0) < 60, `150% 下工具条距选区带顶 ${tb === null ? 'n/a' : Math.abs(tb.y + tb.h - ay0).toFixed(1)}px（<60；toolbar=${tb === null ? 'null' : `${tb.x.toFixed(0)},${tb.y.toFixed(0)}`}）`)
    // [W3] zoom 下标注贴行：存量黄块（S1 保存）对行簇 span 顶 ≤2px
    const spansWide = dSel.spans.filter((sp) => sp.w > 10)
    let zTopDev = 0
    for (const b of dSel.annRects) {
      const cand = spansWide.filter((sp) => sp.x < b.x + b.w && sp.x + sp.w > b.x && Math.abs(sp.y + sp.h / 2 - (b.y + b.h / 2)) < 30)
      if (cand.length === 0) continue
      let near = cand[0]
      for (const sp of cand) {
        if (Math.abs(sp.y + sp.h / 2 - (b.y + b.h / 2)) < Math.abs(near.y + near.h / 2 - (b.y + b.h / 2))) near = sp
      }
      zTopDev = Math.max(zTopDev, Math.abs(b.y - near.y))
    }
    check('s6/z150-ann-align', dSel.annRects.length >= 2 && zTopDev <= 2, `150% 下存量标注贴行：块顶 vs 行簇顶偏差 max=${zTopDev.toFixed(2)}px（≤2——S6 三面几何稳定）`)
  }
  await app.close()
  return { dSel }
}

/** S3 换档会话（lite）：uiScale→medium 重开→存量渲染+新行拖选 */
async function mediumSession(userData) {
  const { app, win } = await openFirstPaper(userData)
  const dExist = await win.evaluate(SELECT_DUMP)
  await win.screenshot({ path: join(OUT, `${PHASE}-medium.png`) })
  // 滚一屏选新行（避开存量高亮——collectRows exclude）
  await win.evaluate(() => {
    const scroller = document.querySelector('[data-page-column]')?.closest('.overflow-auto')
    if (scroller) scroller.scrollTop += Math.round(scroller.clientHeight)
  })
  await win.waitForTimeout(900)
  const d0 = await win.evaluate(SELECT_DUMP)
  const rows = collectRows(d0, dExist.annRects)
  if (rows.length >= 3) {
    const r1 = rows[0].items[0]
    const r3 = rows[2].items.at(-1)
    const from = { x: r1.x + 2, y: r1.y + r1.h / 2 }
    const to = { x: Math.min(r3.x + r3.w - 2, (d0.scroller?.x ?? 0) + (d0.scroller?.w ?? 9999) - 4), y: r3.y + r3.h / 2 }
    await drag(win, from, to)
  } else {
    log('medium 会话可视新行不足 3——lite 判据按现状回采')
  }
  const dSel = await win.evaluate(SELECT_DUMP)
  if (!BASELINE) {
    check('s6/medium-ann-present', dExist.annRects.length >= 1, `medium 档重开存量标注 ${dExist.annRects.length} 块在场（存量 rects 零迁移）`)
    const sc = dSel.scroller
    const tb = dSel.toolbar
    if (tb !== null && sc !== null) {
      const inside = tb.x >= sc.x - 1 && tb.y >= sc.y - 1 && tb.x + tb.w <= sc.x + sc.w + 1 && tb.y + tb.h <= sc.y + sc.h + 1
      check('s6/medium-toolbar-in-viewport', inside, `medium 档工具条 (${tb.x.toFixed(0)},${tb.y.toFixed(0)}) 在可视区内`)
    }
  }
  await app.close()
  return { dExist, dSel }
}

const userData = await freshUserData()
const settingsPath = join(userData, 'settings.json')
const uiScale = existsSync(settingsPath) ? (JSON.parse(await readFile(settingsPath, 'utf8')).uiScale ?? '(default)') : '(no-settings)'

const s1 = await mainSession(userData)
const s2 = await zoomSession(userData)

// S3 前关态改写 uiScale→medium（换档重开）
if (existsSync(settingsPath)) {
  const base = JSON.parse(await readFile(settingsPath, 'utf8'))
  base.uiScale = 'medium'
  await writeFile(settingsPath, JSON.stringify(base), 'utf8')
}
const s3 = await mediumSession(userData)

// —— ④ S6：zoom 100%↔150% 同源行自绘块归一化几何 ——
if (!BASELINE && s1.dSel.paintRects.length > 0 && s2.dSel.paintRects.length > 0) {
  const norm = (r) => ({ left: parseFloat(r.left), top: parseFloat(r.top), w: parseFloat(r.widthPct), h: parseFloat(r.heightPct) })
  const a = s1.dSel.paintRects.slice(0, 3).map(norm)
  const b = s2.dSel.paintRects.slice(0, 3).map(norm)
  // [W3·块数一致性] 接受域 |Δn|≤1（自裁申报：z150 会话拖选带=S1 已存高亮带
  // 四角，与 S1 原拖选带在行边界处的包含差可四舍五入 ±1 行；超出=行合并随
  // zoom 漂移的真回归，FAIL）
  const n1 = s1.dSel.paintRects.length
  const n2 = s2.dSel.paintRects.length
  check('s6/zoom-block-count', Math.abs(n1 - n2) <= 1 && n1 >= 2 && n2 >= 2, `自绘块数 100%=${n1} vs 150%=${n2}（|Δ|≤1 接受域——重选带与原拖选带的行边界包含差；超出即行合并随 zoom 漂移回归）`)
  const drift = Math.max(...a.map((r, i) => Math.max(Math.abs(r.left - b[i].left), Math.abs(r.top - b[i].top), Math.abs(r.w - b[i].w), Math.abs(r.h - b[i].h))))
  check('s6/zoom-stable', a.length > 0 && b.length > 0 && drift <= 2, `zoom 100%↔150% 同源行自绘块归一化几何漂移 max=${drift.toFixed(2)}%（≤2——缩放量化噪声容差，按 min(n) 前块对齐）`)
}

// —— ⑤ pageerror ——
check('f/no-pageerror', pageErrors.length === 0, `页面错误 ${pageErrors.length} 条${pageErrors.length > 0 ? '：' + pageErrors.join('; ').slice(0, 400) : ''}`)

writeFileSync(
  join(OUT, `f-a4-verify-${PHASE}.json`),
  JSON.stringify(
    {
      meta: { script: 'f-a4-verify.mjs', phase: PHASE, date: new Date().toISOString(), uiScale, note: '真实库副本（uiScale 保留用户实况 large）+真鼠标跨 3 行拖选；baseline=修前三现象数值，after=票面 §5 判据' },
      scenes: { main: s1, zoom150: s2, medium: { existing: s3.dExist, select: s3.dSel } },
      results
    },
    null,
    2
  )
)

const fails = results.filter((r) => r.pass === false)
if (BASELINE) console.log(`F-A4 BASELINE: 记录 ${results.length} 项数值 → f-a4-out/f-a4-verify-baseline.json`)
else if (fails.length === 0) console.log(`F-A4 VERIFY: PASS（${results.length}/${results.length} 项断言全过）`)
else console.log(`F-A4 VERIFY: FAIL（${fails.length}/${results.length} 项失败——红=报主控裁决）`)
process.exit(BASELINE || fails.length === 0 ? 0 : 1)
