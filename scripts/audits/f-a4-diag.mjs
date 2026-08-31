/** F-A4 一次性诊断 v2：标注所在页内重演 band 数学（定位断点：量测/匹配/接线） */
import { _electron as electron } from '@playwright/test'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const userData = join(tmpdir(), 'synapse-f-a4-after')
const app = await electron.launch({ args: ['out/main/index.js'], env: { ...process.env, SYNAPSE_USER_DATA: userData } })
const win = await app.firstWindow()
await win.getByRole('button', { name: '文献库' }).waitFor({ timeout: 20_000 })
await win.getByRole('button', { name: '文献库' }).click()
await win.waitForTimeout(800)
await win.locator('button.lib-card').first().dblclick()
await win.waitForSelector('[data-testid="annotation-rect"]', { timeout: 20_000 })
await win.waitForTimeout(1500)

const diag = await win.evaluate(() => {
  // 标注所在页根（annotation-layer 的最近页盒）
  const block = document.querySelector('[data-testid="annotation-rect"]')
  const pageRoot = block?.closest('[data-page-root]')
  const textLayer = pageRoot?.querySelector('.textLayer')
  if (block === null || pageRoot === null || textLayer === null) return { err: 'no block/page/textLayer' }
  const base = textLayer.getBoundingClientRect()
  const blocks = [...pageRoot.querySelectorAll('[data-testid="annotation-rect"]')].map((b) => ({
    top: b.style.top, height: b.style.height, rectY: b.getBoundingClientRect().y, rectH: b.getBoundingClientRect().height
  }))
  // 块行带内的 spans + 页内重演 bandFromMetrics
  const c = document.createElement('canvas')
  const ctx = c.getContext('2d')
  const rows = []
  for (const b of blocks.slice(0, 4)) {
    const by = b.rectY, bh = b.rectH
    const inRow = [...textLayer.querySelectorAll('span')].filter((s) => {
      const g = s.getBoundingClientRect()
      return g.width > 10 && g.y + g.height / 2 >= by - 2 && g.y + g.height / 2 <= by + bh + 2
    })
    const rowInfo = inRow.slice(0, 2).map((s) => {
      const g = s.getBoundingClientRect()
      const cs = getComputedStyle(s)
      ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`
      const m = ctx.measureText((s.textContent || 'x').slice(0, 30))
      const fs = parseFloat(cs.fontSize)
      const half = Math.max(0, (fs - m.fontBoundingBoxAscent - m.fontBoundingBoxDescent) / 2)
      const baseline = g.y + half + m.fontBoundingBoxAscent
      const top = (baseline - m.actualBoundingBoxAscent - base.y) / base.height
      const bottom = (baseline + m.actualBoundingBoxDescent - base.y) / base.height
      return {
        spanBox: { y: +g.y.toFixed(1), h: +g.height.toFixed(1), w: +g.width.toFixed(1) },
        fs, transform: cs.transform.slice(0, 40),
        m: { asc: m.actualBoundingBoxAscent, desc: m.actualBoundingBoxDescent, fbAsc: m.fontBoundingBoxAscent, fbDesc: m.fontBoundingBoxDescent },
        band: { top: +top.toFixed(4), bottom: +bottom.toFixed(4) },
        text: (s.textContent || '').slice(0, 18)
      }
    })
    rows.push({ blockTop: b.top, blockH: b.height, rowInfo })
  }
  return { blocks, rows, base: { y: base.y, h: base.height } }
})
console.log(JSON.stringify(diag, null, 2))
await app.close()
