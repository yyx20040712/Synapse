/**
 * F-A9 校准探针——canvas 墨带真值（三方仲裁：item 几何 band vs CSS span 盒
 * vs canvas 位图真实墨带）。canvas=pdf.js 原字体渲染（真值）；span=CSS 回退；
 * band=item 声明几何。量 underline 行（smart water city 第 1 页
 * 「A systematic literature review」行）三方垂直位置对照。
 */
import { _electron as electron } from '@playwright/test'
import { cpSync, mkdtempSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const REAL = join(process.env.APPDATA ?? '', 'Synapse')
const userData = mkdtempSync(join(tmpdir(), 'synapse-a9cal-'))
const SKIP = new Set(['Cache', 'Code Cache', 'GPUCache', 'DawnGraphiteCache', 'DawnWebGPUCache', 'DIPS', 'blob_storage', 'Shared Dictionary', 'SharedDicts', 'Crashpad', 'SAM', 'OptimizationGuidePNModelStore'])
for (const name of readdirSync(REAL)) {
  if (SKIP.has(name)) continue
  cpSync(join(REAL, name), join(userData, name), { recursive: true })
}

const app = await electron.launch({ args: ['out/main/index.js'], env: { ...process.env, SYNAPSE_USER_DATA: userData } })
const win = await app.firstWindow()
await win.getByRole('button', { name: '文献库' }).waitFor({ timeout: 60_000 })
const item = win.getByText(/smart water city/i).first()
await item.waitFor({ timeout: 10_000 })
await item.dblclick()
await win.waitForTimeout(3500)

const cal = await win.evaluate(() => {
  // 目标行 span：正文第一处「systematic literature review」
  const span = [...document.querySelectorAll('.textLayer span')].find((s) =>
    (s.textContent ?? '').includes('systematic literature review')
  )
  if (span === undefined) return { err: 'span not found' }
  const sb = span.getBoundingClientRect()
  // 所在页 canvas（pdf.js 渲染层——.canvas 结构取 textLayer 同页）
  const pageRoot = span.closest('[data-page-root]') ?? span.closest('.textLayer')?.parentElement
  const canvas = pageRoot?.querySelector('canvas') ?? null
  if (canvas === null) return { err: 'canvas not found', sb: { top: sb.top, bottom: sb.bottom } }
  const cb = canvas.getBoundingClientRect()
  // canvas 内部像素坐标换算（device 像素/物理像素比）
  const scaleY = canvas.height / cb.height
  // 墨带扫描：span 垂直区 ±12px、水平=span x 范围，找非白像素行
  const ctx = canvas.getContext('2d')
  const x0 = Math.max(0, Math.floor((sb.left - cb.left) * (canvas.width / cb.width)))
  const x1 = Math.min(canvas.width, Math.ceil((sb.right - cb.left) * (canvas.width / cb.width)))
  const y0 = Math.max(0, Math.floor((sb.top - cb.top - 5) * scaleY))
  const y1 = Math.min(canvas.height, Math.ceil((sb.bottom - cb.top + 5) * scaleY))
  const img = ctx.getImageData(x0, y0, x1 - x0, y1 - y0)
  const rowsWithInk = []
  for (let y = 0; y < img.height; y++) {
    let ink = 0
    for (let x = 0; x < img.width; x++) {
      const i = (y * img.width + x) * 4
      if (img.data[i] < 200 || img.data[i + 1] < 200 || img.data[i + 2] < 200) ink++
    }
    if (ink >= 2) rowsWithInk.push(y0 + y)
  }
  // 墨行分段（连续段=单行墨带；空隙≥2px 断段）——取与 span 盒重叠的那段
  const segs = []
  let segStart = null
  let prev = null
  for (const r of rowsWithInk) {
    if (segStart === null) {
      segStart = r
    } else if (r - prev > 3) {
      segs.push({ firstDev: segStart, lastDev: prev })
      segStart = r
    }
    prev = r
  }
  if (segStart !== null) segs.push({ firstDev: segStart, lastDev: prev })
  const devOf = (cssY) => (cssY - cb.top) * scaleY
  const targetSeg =
    segs.find((s) => devOf(sb.bottom) >= s.firstDev && devOf(sb.top) <= s.lastDev) ?? segs[0] ?? null
  // underline 条（同标注）
  const under = [...document.querySelectorAll('[data-testid="annotation-rect"]')]
    .map((r) => r.getBoundingClientRect())
    .filter((b) => b.height <= 4 && b.width > 30 && Math.abs((b.top + b.bottom) / 2 - (sb.top + sb.bottom) / 2) < 20)
    .sort((a, b) => a.left - b.left)
  return {
    spanBox: { top: sb.top, bottom: sb.bottom, height: sb.height, text: span.textContent?.slice(0, 40) },
    canvasBox: { top: cb.top, bottom: cb.bottom, h: canvas.height, scaleCssToDev: scaleY },
    allSegsCss: segs.map((s) => [Math.round((cb.top + s.firstDev / scaleY) * 10) / 10, Math.round((cb.top + s.lastDev / scaleY) * 10) / 10]),
    inkSegCss:
      targetSeg !== null
        ? { firstCss: cb.top + targetSeg.firstDev / scaleY, lastCss: cb.top + targetSeg.lastDev / scaleY }
        : null,
    underRects: under.map((b) => ({ top: b.top, bottom: b.bottom, left: b.left, width: b.width }))
  }
})
console.log(JSON.stringify(cal, null, 2))
await app.close()
