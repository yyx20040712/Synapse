/**
 * F-A9 真机复测探针（修复后）——配方 crib scripts/audits/f-a9-real.mjs v4
 * （白名单拷贝用户库副本；跑前须 node scripts/sqlite-abi.mjs use electron——
 * build 已含）。量修复判据（修前基线=f-a9-real6.raw.txt）：
 * - 缺陷② underline（img3）：条 top ≈ span 行盒底 −2px（修前条落在行盒 37%
 *   处——top 514.34 vs span [511.43,519.40]）；
 * - 缺陷① 预览带（img1）：paint 块 top/bottom ≈ 被选 span 盒（修前整体上移
 *   2.5px——177.05 vs 179.55）。
 * 输出 VERDICT 判定（亚像素容差 0.75px）供 f-a9-verify-real.raw.txt 落档。
 */
import { _electron as electron } from '@playwright/test'
import { cpSync, mkdtempSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const REAL = join(process.env.APPDATA ?? '', 'Synapse')
const userData = mkdtempSync(join(tmpdir(), 'synapse-a9verify-'))
const SKIP = new Set(['Cache', 'Code Cache', 'GPUCache', 'DawnGraphiteCache', 'DawnWebGPUCache', 'DIPS', 'blob_storage', 'Shared Dictionary', 'SharedDicts', 'Crashpad', 'SAM', 'OptimizationGuidePNModelStore'])
for (const name of readdirSync(REAL)) {
  if (SKIP.has(name)) continue
  cpSync(join(REAL, name), join(userData, name), { recursive: true })
}

const app = await electron.launch({
  args: ['out/main/index.js'],
  env: { ...process.env, SYNAPSE_USER_DATA: userData },
})
const win = await app.firstWindow()
await win.getByRole('button', { name: '文献库' }).waitFor({ timeout: 60_000 })

const item = win.getByText(/smart water city/i).first()
await item.waitFor({ timeout: 10_000 })
await item.dblclick()
await win.waitForTimeout(3500) // 渲染+重锚+校准

const EPS = 0.75

// ── 缺陷②：underline 条 vs 同位文字 span ──
const under = await win.evaluate(() => {
  return [...document.querySelectorAll('[data-testid="annotation-rect"]')]
    .map((r) => {
      const b = r.getBoundingClientRect()
      return {
        id: r.getAttribute('data-annotation-id')?.slice(0, 10),
        source: r.getAttribute('data-source'),
        top: b.top, bottom: b.bottom, height: b.height, left: b.left, width: b.width,
        label: r.getAttribute('aria-label')?.slice(0, 44)
      }
    })
    .filter((r) => r.height <= 4 && r.width > 30)
})
const targetSpan = await win.evaluate(() => {
  return [...document.querySelectorAll('.textLayer span')]
    .map((s) => {
      const b = s.getBoundingClientRect()
      return { text: s.textContent?.slice(0, 44), top: b.top, bottom: b.bottom, height: b.height, left: b.left, width: b.width, font: `${getComputedStyle(s).fontSize} ${getComputedStyle(s).fontFamily}` }
    })
    .find((s) => (s.text ?? '').includes('A systematic literature review'))
})
// 该行 underline 条=与目标 span 水平重叠的条
const rowUnder = under.filter((u) => targetSpan && u.left < targetSpan.left + targetSpan.width && u.left + u.width > targetSpan.left)
const uVerdict = (await win.evaluate((rows) => {
  // 逐条配对：条 y 中心 ±30px 内水平重叠的 span 中取垂直最近者——判据=条 top
  // ≈ 该行 span 底 −2px（修前条落在行盒 37% 处）
  const spans = [...document.querySelectorAll('.textLayer span')].map((s) => {
    const b = s.getBoundingClientRect()
    return { top: b.top, bottom: b.bottom, left: b.left, width: b.width, height: b.height }
  }).filter((s) => s.height > 1 && s.width > 5)
  return rows.map((u) => {
    const cy = (u.top + u.bottom) / 2
    const cands = spans.filter((s) => s.left < u.left + u.width && s.left + s.width > u.left && Math.abs((s.top + s.bottom) / 2 - cy) < 30)
    const near = cands.sort((a, b) => Math.abs((a.top + a.bottom) / 2 - cy) - Math.abs((b.top + b.bottom) / 2 - cy))[0] ?? null
    return {
      top: u.top,
      spanTop: near?.top ?? null,
      spanBottom: near?.bottom ?? null,
      expectedTop: near !== undefined && near !== null ? near.bottom - 2 : null,
      ok: near != null && Math.abs(u.top - (near.bottom - 2)) <= 0.75
    }
  })
}, rowUnder)).filter((v) => v.spanBottom !== null)

// ── 缺陷①：拖选预览带 vs 被选 span ──
const dragTarget = await win.evaluate(() => {
  return [...document.querySelectorAll('.textLayer span')]
    .filter((s) => {
      const t = (s.textContent ?? '').trim()
      const b = s.getBoundingClientRect()
      return t.length >= 20 && b.top > 100 && b.top < 800 && b.width > 80
    })
    .map((s) => {
      const b = s.getBoundingClientRect()
      return { text: s.textContent?.slice(0, 36), top: b.top, bottom: b.bottom, height: b.height, left: b.left, width: b.width }
    })
    .find((s) => (s.text ?? '').startsWith('Sustainable')) ?? null
})
let paint = null
if (dragTarget !== null) {
  const y = (dragTarget.top + dragTarget.bottom) / 2
  await win.mouse.move(dragTarget.left + 3, y)
  await win.mouse.down()
  await win.mouse.move(dragTarget.left + Math.min(dragTarget.width * 0.8, 220), y, { steps: 12 })
  await win.mouse.up()
  await win.waitForTimeout(700)
  paint = await win.evaluate(() => {
    return [...document.querySelectorAll('[data-testid="selection-rect"]')].map((r) => {
      const b = r.getBoundingClientRect()
      return { top: b.top, bottom: b.bottom, height: b.height, left: b.left, width: b.width }
    })
  })
}
const pVerdict = paint !== null && paint.length > 0 && dragTarget !== null
  ? paint.map((p) => ({
      top: p.top, bottom: p.bottom, spanTop: dragTarget.top, spanBottom: dragTarget.bottom,
      // 判据：块顶/底 ≈ span 盒（修前整体上移 2.5px）
      okTop: Math.abs(p.top - dragTarget.top) <= EPS,
      okBottom: Math.abs(p.bottom - dragTarget.bottom) <= EPS
    }))
  : []

console.log('TARGET_UNDERLINE_SPAN', JSON.stringify(targetSpan ?? null))
console.log('UNDERLINE_RECTS_ON_ROW', JSON.stringify(rowUnder, null, 1))
console.log('UNDERLINE_VERDICT', JSON.stringify(uVerdict))
console.log('DRAG_TARGET_SPAN', JSON.stringify(dragTarget))
console.log('PAINT_RECTS', JSON.stringify(paint))
console.log('PAINT_VERDICT', JSON.stringify(pVerdict))
console.log('VERDICT_UNDERLINE_ALL_OK', JSON.stringify(uVerdict.length > 0 && uVerdict.every((v) => v.ok)))
console.log('VERDICT_PAINT_ALL_OK', JSON.stringify(pVerdict.length > 0 && pVerdict.every((v) => v.okTop && v.okBottom)))
await app.close()
