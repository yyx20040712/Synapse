/**
 * F-A9 真机复现探针 v4（精准版）——DB 定位实锤：underline 标注（quote
 * 「 systematic literature review...」前导空格+comment「我是奶龙」）在
 * paper a9390ef7《Towards a smart water city》**第 1 页**。
 * 量：①既有 underline 条 vs 同位文字 span（缺陷②——img3 低位切字）
 *     ②第 1 页拖选 → 预览带 vs 被选 span（缺陷①——img1 下移半行）
 */
import { _electron as electron } from '@playwright/test'
import { cpSync, mkdtempSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const REAL = join(process.env.APPDATA ?? '', 'Synapse')
const userData = mkdtempSync(join(tmpdir(), 'synapse-a9real4-'))
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
await win.waitForTimeout(3500) // 渲染+重锚（F-A8 三层编排）

// ① underline 条（aria-label=标注：quote；underline 条 height≈2px）
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
console.log('UNDERLINE_RECTS', JSON.stringify(under, null, 1))

if (under.length > 0) {
  const u = under[0]
  const spans = await win.evaluate((box) => {
    return [...document.querySelectorAll('.textLayer span')]
      .map((s) => {
        const b = s.getBoundingClientRect()
        return {
          text: s.textContent?.slice(0, 44),
          top: b.top, bottom: b.bottom, height: b.height, left: b.left, width: b.width,
          font: `${getComputedStyle(s).fontSize} ${getComputedStyle(s).fontFamily}`
        }
      })
      .filter((s) => s.left < box.right && s.left + s.width > box.left && Math.abs((s.top + s.bottom) / 2 - box.cy) < 30)
  }, { left: u.left, right: u.left + u.width, cy: (u.top + u.bottom) / 2 })
  console.log('UNDERLINE_NEAR_SPANS', JSON.stringify(spans, null, 1))
}

// ② 拖选预览带（同页正文段）
const cands = await win.evaluate(() => {
  return [...document.querySelectorAll('.textLayer span')]
    .filter((s) => {
      const t = (s.textContent ?? '').trim()
      const b = s.getBoundingClientRect()
      return t.length >= 20 && b.top > 100 && b.top < 800 && b.width > 80
    })
    .slice(0, 4)
    .map((s) => {
      const b = s.getBoundingClientRect()
      return { text: s.textContent?.slice(0, 36), top: b.top, bottom: b.bottom, height: b.height, left: b.left, width: b.width }
    })
})
console.log('DRAG_CANDIDATES', JSON.stringify(cands, null, 1))
const target = cands[0]
if (target !== undefined) {
  const y = (target.top + target.bottom) / 2
  await win.mouse.move(target.left + 3, y)
  await win.mouse.down()
  await win.mouse.move(target.left + Math.min(target.width * 0.8, 220), y, { steps: 12 })
  await win.mouse.up()
  await win.waitForTimeout(700)
  const paint = await win.evaluate(() => {
    return [...document.querySelectorAll('[data-testid="selection-rect"]')].map((r) => {
      const b = r.getBoundingClientRect()
      return { top: b.top, bottom: b.bottom, height: b.height, left: b.left, width: b.width }
    })
  })
  console.log('TARGET_SPAN', JSON.stringify(target))
  console.log('PAINT_RECTS', JSON.stringify(paint))
}
await app.close()
