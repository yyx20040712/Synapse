/**
 * F-A10 真机诊断探针 2——直测焦点 DIV 身份与 child 序（解开 (DIV,87) vs
 * quote 尾矛盾）+ L 形路径对照。证据档。
 */
import { _electron as electron } from '@playwright/test'
import { cpSync, mkdtempSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const REAL = join(process.env.APPDATA ?? '', 'Synapse')
const userData = mkdtempSync(join(tmpdir(), 'synapse-a10diag2-'))
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

const geo = await win.evaluate(() => {
  const spans = [...document.querySelectorAll('.textLayer span')]
  const i = spans.findIndex((s) => (s.textContent ?? '').includes('Mohanty et al., 2016'))
  const box = (el) => {
    const b = el.getBoundingClientRect()
    return { text: (el.textContent ?? '').slice(0, 44), top: +b.top.toFixed(1), bottom: +b.bottom.toFixed(1), left: +b.left.toFixed(1), right: +b.right.toFixed(1) }
  }
  return { last: box(spans[i]), next: box(spans[i + 1]), firstPara: box(spans.find((s) => (s.textContent ?? '').startsWith('Smart cities represent'))) }
})
console.log('GEO', JSON.stringify(geo))

const deepInfo = () => win.evaluate(() => {
  const s = window.getSelection()
  if (s === null || s.rangeCount === 0) return null
  const f = s.focusNode
  const info = {
    collapsed: s.isCollapsed,
    selLen: s.toString().length,
    tail: s.toString().slice(-46),
    focus: null,
    focusDiv: null,
    kids: null,
    leadLen: null
  }
  if (f !== null) {
    if (f.nodeType === 3) {
      info.focus = { kind: 'text', text: f.data.slice(0, 40), off: s.focusOffset }
    } else {
      info.focus = { kind: `node${f.nodeType}`, tag: f.nodeName, cls: f.className, off: s.focusOffset }
      info.focusDiv = { childCount: f.childElementCount, cls: f.className }
      const kids = []
      for (let k = Math.max(0, s.focusOffset - 4); k <= Math.min(f.childElementCount - 1, s.focusOffset + 4); k++) {
        kids.push({ k, text: (f.children[k]?.textContent ?? '').slice(0, 40) })
      }
      info.kids = kids
    }
  }
  // 焦点前导长度（probe 口径：Range [textLayer..focus) 的 toString 长度）
  try {
    const tl = f && f.nodeType === 1 && f.classList?.contains('textLayer') ? f : (f?.parentElement?.closest('.textLayer') ?? null)
    if (tl !== null && f !== null) {
      const r = document.createRange()
      r.selectNodeContents(tl)
      r.setEnd(s.focusNode, s.focusOffset)
      info.leadLen = r.toString().length
      info.tlText = tl.textContent.slice(Math.max(0, (info.leadLen ?? 0) - 40), (info.leadLen ?? 0) + 40)
    }
  } catch { /* 忽略 */ }
  return info
})
const clearSel = () => win.evaluate(() => window.getSelection()?.removeAllRanges())

// ①同排空白点击（单点直读）
const yLast = (geo.last.top + geo.last.bottom) / 2
await win.mouse.move(geo.last.right + 30, yLast)
await win.mouse.down()
await win.mouse.up()
await win.waitForTimeout(120)
console.log('CLICK_DX30', JSON.stringify(await deepInfo(), null, 1))
await clearSel()

// ②直线拖选（复现 diag1 ③）
const yFirst = (geo.firstPara.top + geo.firstPara.bottom) / 2
await win.mouse.move(geo.firstPara.left + 2, yFirst)
await win.mouse.down()
await win.mouse.move(geo.last.right + 30, yLast, { steps: 18 })
await win.mouse.up()
await win.waitForTimeout(250)
console.log('DRAG_STRAIGHT', JSON.stringify(await deepInfo(), null, 1))
await clearSel()

// ③L 形拖选（沿左缘下行到末行 y，再右移入空白）
await win.mouse.move(geo.firstPara.left + 2, yFirst)
await win.mouse.down()
await win.mouse.move(geo.firstPara.left + 2, yLast, { steps: 14 })
await win.mouse.move(geo.last.right + 30, yLast, { steps: 8 })
await win.mouse.up()
await win.waitForTimeout(250)
console.log('DRAG_LSHAPE', JSON.stringify(await deepInfo(), null, 1))
await clearSel()

// ④页全文长度与段尾句核对
const pageText = await win.evaluate(() => document.querySelector('.textLayer')?.textContent?.length ?? -1)
console.log('TEXTLAYER_LEN', pageText)
await app.close()
