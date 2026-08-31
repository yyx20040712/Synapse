/**
 * F-V1 一次性判别探针——整段多行拖选/标注 band「中间断位与漂移」（用户图1/图2，
 * 2026-08-31 反馈批最高优先）。crib f-a4-verify.mjs（真鼠标拖选/库副本/产物）+
 * f-v2-diag.mjs（freshUserData/ABI 教训——跑前须 sqlite-abi use electron）。
 *
 * 现象（analyze_image 实证）：跨 5-6 行整段拖选后高亮带——某行半行缺失、
 * 某行超文字末端延伸到页边、各行纵向微漂；保存标注（黄）同现。
 * code-explorer 全链报告（四候选根因）判别方向：dump 断位行三元组——
 *   band/rect 右缘 vs 最后【有墨】span 右缘 vs 最后 span（含尾随空白）右缘
 *   → RC1（空白 item band/rect 对称破缺）/RC3（mergeLineRects 簇失联）/
 *      RC4（<br> Range rect 页缘语义）裁决；纵向漂移对照=RC2（matchBand 错绑）。
 *
 * 取证：
 *  A 蓝链（实时自绘）：真鼠标跨 6 行拖选→[data-testid=selection-rect] 逐块
 *    + 同行 textLayer span 逐个（gBCR+textContent repr 空格+有墨性）
 *    + 原生 Range.getClientRects 逐片段（RC3/RC4 原生层证据）；
 *  B 黄链（持久化）：点「高亮」保存→[data-testid=annotation-rect] 同表
 *    （两链共用 rectsBetweenPoints+bandsForTextNodes——同断位则单点根因实锤）。
 * 真机 Electron 短暂开窗属项目 LOOP 取证惯例（主控指令声明）。
 * 产物：scripts/audits/f-v2-out 相邻 f-v1-out/{sel,ann}.png + f-v1-diag.json。
 */
import { _electron as electron } from '@playwright/test'
import { cp, mkdir, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const ROOT = process.cwd()
const OUT = join(ROOT, 'scripts', 'audits', 'f-v1-out')
await mkdir(OUT, { recursive: true })

/** 真实库副本（f-a4-verify/f-v2 同法；uiScale 保留用户实况） */
async function freshUserData() {
  const src = join(process.env.APPDATA, 'Synapse')
  const userData = join(tmpdir(), 'synapse-f-v1-diag')
  await rm(userData, { recursive: true, force: true })
  for (const p of ['workspaces', 'ai-sensor']) await cp(join(src, p), join(userData, p), { recursive: true })
  for (const f of ['settings.json', 'workspace.json', 'window-state.json']) {
    if (existsSync(join(src, f))) await cp(join(src, f), join(userData, f))
  }
  return userData
}

/** 真鼠标跨行拖选（f-a4 同法：8 步插值+700ms 防抖等待） */
async function drag(win, from, to) {
  await win.mouse.move(from.x, from.y)
  await win.mouse.down()
  for (let i = 1; i <= 8; i += 1) {
    await win.mouse.move(from.x + ((to.x - from.x) * i) / 8, from.y + ((to.y - from.y) * i) / 8)
  }
  await win.mouse.up()
  await win.waitForTimeout(700)
}

const userData = await freshUserData()
const app = await electron.launch({ args: ['out/main/index.js'], env: { ...process.env, SYNAPSE_USER_DATA: userData } })
const win = await app.firstWindow()
const pageErrors = []
win.on('pageerror', (e) => pageErrors.push(String(e)))
await win.getByRole('button', { name: '文献库' }).waitFor({ timeout: 20_000 })
await win.getByRole('button', { name: '文献库' }).click()
await win.waitForTimeout(800)
await win.locator('button.lib-card').first().dblclick()
await win.waitForSelector('.textLayer span', { timeout: 20_000 })
await win.waitForTimeout(1500)

/** 页内取证：行表（span gBCR+repr+有墨）+三元组对照（page=选区所在页反查） */
const dump = (sel) => {
  const s0 = window.getSelection()
  const node = s0 !== null && s0.anchorNode !== null ? s0.anchorNode : null
  const el = node !== null ? (node.nodeType === 1 ? node : node.parentElement) : null
  const page = (el !== null ? el.closest('[data-page-root]') : null)
    ?? document.querySelector('[data-page-root]:has([data-testid=annotation-rect])')
    ?? document.querySelector('[data-page-root]')
  const spans = [...page.querySelectorAll('.textLayer span')].map((s) => {
    const g = s.getBoundingClientRect()
    const text = s.textContent ?? ''
    return {
      x: +g.x.toFixed(1), y: +g.y.toFixed(1), w: +g.width.toFixed(1), h: +g.height.toFixed(1),
      text: JSON.stringify(text).slice(0, 40), ink: text.trim().length > 0
    }
  })
  const rects = [...page.querySelectorAll(sel)].map((r) => {
    const g = r.getBoundingClientRect()
    return { x: +g.x.toFixed(1), y: +g.y.toFixed(1), w: +g.width.toFixed(1), h: +g.height.toFixed(1) }
  }).sort((a, b) => a.y - b.y)
  // 行簇：span 按 y 中心聚类（±3px 同行）
  const rows = []
  for (const s of spans) {
    const cy = s.y + s.h / 2
    const row = rows.find((r) => Math.abs(r.cy - cy) < 4)
    if (row === undefined) rows.push({ cy, spans: [s] })
    else { row.spans.push(s); row.cy = (row.cy * (row.spans.length - 1) + cy) / row.spans.length }
  }
  rows.sort((a, b) => a.cy - b.cy)
  // 三元组表：每行 rect 覆盖 vs 有墨 span 边界
  const tri = rows
    .filter((r) => r.spans.some((s) => s.ink))
    .map((r) => {
      const ink = r.spans.filter((s) => s.ink)
      const firstInk = ink[0], lastInk = ink[ink.length - 1], lastAny = r.spans[r.spans.length - 1]
      const hit = rects.filter((x) => Math.abs(x.y + x.h / 2 - r.cy) < x.h)
      return {
        rowCy: +r.cy.toFixed(1),
        spanCount: r.spans.length,
        firstInkLeft: firstInk.x, lastInkRight: +(lastInk.x + lastInk.w).toFixed(1),
        lastAnyRight: +(lastAny.x + lastAny.w).toFixed(1),
        lastAnyIsBlankTail: !lastAny.ink,
        rect: hit.length === 1 ? hit[0] : hit,
        // 判别量：rect 右缘−最后有墨右缘（>0 超界延伸 / <−2 截短缺失）
        overInk: hit.length === 1 ? +(hit[0].x + hit[0].w - (lastInk.x + lastInk.w)).toFixed(1) : null,
        // rect 左缘−首个有墨左缘（行首缺失判别）
        underStart: hit.length === 1 ? +(hit[0].x - firstInk.x).toFixed(1) : null
      }
    })
  return { rects, spanRows: rows.length, tri, spans: spans.slice(0, 80) }
}

// ── A 蓝链：中部连续 6 行整段拖选 ──
const anchors = await win.evaluate(() => {
  const spans = [...document.querySelectorAll('.textLayer span')]
    .filter((s) => (s.textContent ?? '').trim().length > 0)
    .map((s) => { const g = s.getBoundingClientRect(); return { x: g.x, y: g.y, w: g.width, h: g.height, t: (s.textContent ?? '').slice(0, 20) } })
  if (spans.length < 10) return { err: 'spans too few', n: spans.length }
  // 行聚类取中部 6 行：首行第 2 个有墨 span 中心 → 末行倒数第 2 个
  const rows = []
  for (const s of spans) {
    const cy = s.y + s.h / 2
    const row = rows.find((r) => Math.abs(r.cy - cy) < 4)
    if (row === undefined) rows.push({ cy, spans: [s] })
    else { row.spans.push(s) }
  }
  rows.sort((a, b) => a.cy - b.cy)
  const mid = Math.floor(rows.length / 2)
  const firstRow = rows[Math.max(1, mid - 3)], lastRow = rows[Math.min(rows.length - 2, mid + 3)]
  const a = firstRow.spans[1] ?? firstRow.spans[0]
  const b = lastRow.spans[lastRow.spans.length - 2] ?? lastRow.spans[lastRow.spans.length - 1]
  return { x1: a.x + a.w * 0.3, y1: a.y + a.h * 0.5, x2: b.x + b.w * 0.7, y2: b.y + b.h * 0.5, rowsTotal: rows.length }
})
if (anchors.err !== undefined) {
  console.log(JSON.stringify({ err: anchors.err }))
  await app.close()
  process.exit(1)
}
await drag(win, { x: anchors.x1, y: anchors.y1 }, { x: anchors.x2, y: anchors.y2 })
const native = await win.evaluate(() => {
  const sel = window.getSelection()
  if (sel === null || sel.rangeCount === 0) return { err: 'no selection' }
  return [...sel.getRangeAt(0).getClientRects()].map((r) => ({ x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) }))
})
const selDump = await win.evaluate(`(${dump})('[data-testid=selection-rect]')`)
await win.screenshot({ path: join(OUT, 'sel.png') })

// ── B 黄链：保存高亮→持久化渲染 ──
let annDump = { skipped: 'no toolbar' }
try {
  await win.getByTestId('selection-toolbar').getByRole('button', { name: '高亮' }).click({ timeout: 4000 })
  await win.waitForTimeout(800)
  annDump = await win.evaluate(`(${dump})('[data-testid=annotation-rect]')`)
  await win.screenshot({ path: join(OUT, 'ann.png') })
} catch (e) {
  annDump = { skipped: String(e).slice(0, 120) }
}

const result = { anchors, nativeRangeRects: native, sel: selDump, ann: annDump, pageErrors }
await writeFile(join(OUT, 'f-v1-diag.json'), JSON.stringify(result, null, 2))
console.log(JSON.stringify({ anchors, selRects: selDump.rects, selTri: selDump.tri, annRects: annDump.rects ?? annDump, pageErrors }, null, 1))
await app.close()
