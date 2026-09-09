/**
 * F-A10 真机诊断探针 3——直测 (textLayer,87) 槽位标记的真身（tag/盒/样式）+
 * 归一化逻辑在页内的逐步量测（哪一步放弃）。证据档。
 */
import { _electron as electron } from '@playwright/test'
import { cpSync, mkdtempSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const REAL = join(process.env.APPDATA ?? '', 'Synapse')
const userData = mkdtempSync(join(tmpdir(), 'synapse-a10diag3-'))
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

const out = await win.evaluate(() => {
  const spans = [...document.querySelectorAll('.textLayer span')]
  const i = spans.findIndex((s) => (s.textContent ?? '').includes('Mohanty et al., 2016'))
  const last = spans[i]
  const tl = last.closest('.textLayer')
  const kids = [...tl.children]
  const mk = kids[87]
  const mkPrev = kids[86]
  const mkNext = kids[88]
  const info = (el, k) => {
    const b = el.getBoundingClientRect()
    const cs = getComputedStyle(el)
    return { k, tag: el.tagName, text: JSON.stringify((el.textContent ?? '').slice(0, 30)), box: { x: +b.x.toFixed(1), y: +b.y.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1), top: +b.top.toFixed(1), bottom: +b.bottom.toFixed(1), left: +b.left.toFixed(1), right: +b.right.toFixed(1) }, pos: cs.position, fontSize: cs.fontSize, attrs: [...el.attributes].map((a) => `${a.name}=${a.value.slice(0, 40)}`).slice(0, 4) }
  }
  // 槽位 87 周围全部子元素的盒（找视觉上贴行尾的）
  const around = []
  for (let k = 84; k <= 90; k++) around.push(info(kids[k], k))
  // 末行 span 与下一段首 span 的盒
  const lastB = last.getBoundingClientRect()
  const nextB = spans[i + 1].getBoundingClientRect()
  // 归一化逐步量测：模拟 snapBlankBoundary 的判据
  const blank = (mk.textContent ?? '').trim().length === 0
  const b = mk.getBoundingClientRect()
  const noMeasure = b.x === 0 && b.y === 0 && b.width === 0 && b.height === 0
  // 行收集：与标记中心同行的文本 span
  const tlSpans = [...tl.querySelectorAll('span')].filter((s) => (s.textContent ?? '').length > 0)
  const cy = (b.top + b.bottom) / 2
  const h = b.bottom - b.top
  const row = []
  for (const s of tlSpans) {
    const sb = s.getBoundingClientRect()
    const textH = sb.bottom - sb.top
    const refH = h > 0 ? Math.min(textH, h) : textH
    if (Math.abs((sb.top + sb.bottom) / 2 - cy) <= Math.max(2, refH * 0.75)) {
      row.push({ text: (s.textContent ?? '').slice(0, 24), top: +sb.top.toFixed(1), right: +sb.right.toFixed(1) })
    }
  }
  const leftRow = row.filter((r) => r.right <= b.left + 1).sort((a, z) => z.right - a.right)[0] ?? null
  return { kidsTotal: kids.length, around, lastBox: { top: +lastB.top.toFixed(1), right: +lastB.right.toFixed(1), bottom: +lastB.bottom.toFixed(1) }, nextBox: { top: +nextB.top.toFixed(1), left: +nextB.left.toFixed(1) }, marker87: info(mk, 87), markerIsBlank: blank, noMeasure, rowSample: row.slice(0, 8), rowCount: row.length, leftRow, mkPrev: info(mkPrev, 86), mkNext: info(mkNext, 88) }
})
console.log(JSON.stringify(out, null, 1))
await app.close()
