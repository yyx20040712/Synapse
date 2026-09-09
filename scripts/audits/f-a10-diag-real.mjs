/**
 * F-A10 真机诊断探针——img2 边界「行尾空白坐标命中」的浏览器解析行为矩阵。
 * 白名单拷库配方复用 f-a9-real.mjs（票面 ④）。
 * 量：
 *   ①img2 段末 span（…Mohanty et al., 2016).）与下一段首 span（With regard…）几何
 *   ②空白区采样点击（同排 y，x 步进）→ 坍缩光标落点（node+offset）
 *   ③拖选手势（段首起 → 空白收）→ 选区两端落点 + quote 是否带下一段
 *   ④深放（下移 3 行收）→ img2 三行形态复现确认
 */
import { _electron as electron } from '@playwright/test'
import { cpSync, mkdtempSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const REAL = join(process.env.APPDATA ?? '', 'Synapse')
const userData = mkdtempSync(join(tmpdir(), 'synapse-a10diag-'))
const SKIP = new Set(['Cache', 'Code Cache', 'GPUCache', 'DawnGraphiteCache', 'DawnWebGPUCache', 'DIPS', 'blob_storage', 'Shared Dictionary', 'SharedDicts', 'Crashpad', 'SAM', 'OptimizationGuidePNModelStore'])
for (const name of readdirSync(REAL)) {
  if (SKIP.has(name)) continue
  cpSync(join(REAL, name), join(userData, name), { recursive: true })
}

const app = await electron.launch({
  args: ['out/main/index.js'],
  env: { ...process.env, SYNAPSE_USER_DATA: userData }
})
const win = await app.firstWindow()
await win.getByRole('button', { name: '文献库' }).waitFor({ timeout: 60_000 })
const item = win.getByText(/smart water city/i).first()
await item.waitFor({ timeout: 10_000 })
await item.dblclick()
await win.waitForTimeout(3500)

// ①img2 两段 span 几何
const geo = await win.evaluate(() => {
  const spans = [...document.querySelectorAll('.textLayer span')]
  const i = spans.findIndex((s) => (s.textContent ?? '').includes('Mohanty et al., 2016'))
  const box = (el) => {
    const b = el.getBoundingClientRect()
    return { text: (el.textContent ?? '').slice(0, 44), top: +b.top.toFixed(1), bottom: +b.bottom.toFixed(1), left: +b.left.toFixed(1), right: +b.right.toFixed(1), height: +b.height.toFixed(1) }
  }
  const first = spans.findIndex((s) => (s.textContent ?? '').startsWith('Smart cities represent'))
  return { idx: i, total: spans.length, last: box(spans[i]), next: box(spans[i + 1]), firstPara: box(spans[first]) }
})
console.log('GEO', JSON.stringify(geo, null, 1))

const selInfo = () => win.evaluate(() => {
  const s = window.getSelection()
  if (s === null || s.rangeCount === 0) return null
  const desc = (node, off) => {
    if (node === null) return null
    if (node.nodeType === 3) {
      const p = node.parentElement
      return { kind: 'text', parentText: (p?.textContent ?? '').slice(0, 36), off, sibs: p?.parentElement ? [...p.parentElement.children].indexOf(p) : -1 }
    }
    return { kind: `node(${node.nodeType})`, tag: node.nodeName, off }
  }
  return {
    collapsed: s.isCollapsed,
    anchor: desc(s.anchorNode, s.anchorOffset),
    focus: desc(s.focusNode, s.focusOffset),
    text: s.toString().slice(0, 60),
    textEnd: s.toString().slice(-40)
  }
})
const clearSel = () => win.evaluate(() => window.getSelection()?.removeAllRanges())

// ②空白区采样点击矩阵（同排 y=段末行中心；x=行尾右侧步进）
const yLast = (geo.last.top + geo.last.bottom) / 2
const clicks = []
for (const dx of [3, 8, 15, 30, 60, 100, 140]) {
  const x = geo.last.right + dx
  await win.mouse.move(x, yLast)
  await win.mouse.down()
  await win.mouse.up()
  await win.waitForTimeout(120)
  clicks.push({ dx, x: +x.toFixed(0), hit: await selInfo() })
  await clearSel()
}
console.log('CLICK_MATRIX', JSON.stringify(clicks, null, 1))

// ③拖选：段首起 → 空白收（正 img2 手势）
const yFirst = (geo.firstPara.top + geo.firstPara.bottom) / 2
await win.mouse.move(geo.firstPara.left + 2, yFirst)
await win.mouse.down()
await win.mouse.move(geo.last.right + 30, yLast, { steps: 18 })
await win.mouse.up()
await win.waitForTimeout(250)
console.log('DRAG_BLANK_RELEASE', JSON.stringify(await selInfo(), null, 1))
await clearSel()

// ④深放：下移 3 行收（img2 三行形态）
const pitch = geo.next.top - geo.last.top
await win.mouse.move(geo.firstPara.left + 2, yFirst)
await win.mouse.down()
await win.mouse.move(geo.next.left + 100, yLast + 3 * pitch, { steps: 20 })
await win.mouse.up()
await win.waitForTimeout(250)
console.log('DRAG_DEEP_RELEASE', JSON.stringify(await selInfo(), null, 1))
await clearSel()
await app.close()
