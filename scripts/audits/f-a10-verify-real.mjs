/**
 * F-A10 真机复测探针——修复后（anchor-blank-snap 已入 bundle）三面复测：
 *   ①欠达形态（段末行尾空白释放=原终点跳回 7 行前）→ quote 终点=本行行尾+预览带不跨段
 *   ②浅下探释放（行间隙/下一行盒顶）→ 元素槽位路径归一化；文本位=原生语义（已知边界对照）
 *   ③段首缩进空白起点 → quote 无前导空格
 * 保存链经工具条「下划线」按钮落库（temp 拷贝库），关闭后查库对照 quote。
 * 白名单拷库配方复用 f-a9-real.mjs（票面 ④）。
 */
import { _electron as electron } from '@playwright/test'
import { cpSync, mkdtempSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const REAL = join(process.env.APPDATA ?? '', 'Synapse')
const userData = mkdtempSync(join(tmpdir(), 'synapse-a10verify-'))
console.log('USERDATA', userData)
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
    return { text: (el.textContent ?? '').slice(0, 40), top: +b.top.toFixed(1), bottom: +b.bottom.toFixed(1), left: +b.left.toFixed(1), right: +b.right.toFixed(1) }
  }
  return {
    last: box(spans[i]),
    next: box(spans[i + 1]),
    firstPara: box(spans.find((s) => (s.textContent ?? '').startsWith('Smart cities represent'))),
    wsSpans: spans
      .filter((s) => (s.textContent ?? '').length > 0 && (s.textContent ?? '').trim().length === 0)
      .slice(0, 6)
      .map(box)
  }
})
console.log('GEO', JSON.stringify(geo))

const readSel = () => win.evaluate(() => {
  const s = window.getSelection()
  if (s === null || s.rangeCount === 0) return null
  const desc = (n, off) => (n === null ? null : n.nodeType === 3 ? { k: 'text', t: (n.data ?? '').slice(0, 28), off } : { k: `el:${n.nodeName}`, cls: n.className, off })
  return { collapsed: s.isCollapsed, anchor: desc(s.anchorNode, s.anchorOffset), focus: desc(s.focusNode, s.focusOffset), len: s.toString().length, tail: s.toString().slice(-42), head: s.toString().slice(0, 30) }
})
const paintBoxes = () => win.evaluate(() =>
  [...document.querySelectorAll('[data-testid="selection-rect"]')].map((r) => {
    const b = r.getBoundingClientRect()
    return { top: +b.top.toFixed(1), bottom: +b.bottom.toFixed(1), left: +b.left.toFixed(1), right: +b.right.toFixed(1) }
  })
)
const saveUnderline = async () => {
  try {
    await win.getByRole('button', { name: '下划线' }).click({ timeout: 4000 })
    await win.waitForTimeout(600)
    return true
  } catch {
    console.log('SAVE_SKIP 无工具条（选区无效/坍缩）')
    return false
  }
}
/** 与 para1 同 textLayer 且在视口内的 ws-only 标记 span 盒 */
const wsInView = () => win.evaluate(() => {
  const spans = [...document.querySelectorAll('.textLayer span')]
  const ref = spans.find((s) => (s.textContent ?? '').startsWith('Smart cities represent'))
  const tl = ref?.closest('.textLayer')
  if (tl === null || tl === undefined || ref === undefined) return null
  const hit = [...tl.querySelectorAll('span')]
    .filter((s) => (s.textContent ?? '').length > 0 && (s.textContent ?? '').trim().length === 0)
    .map((s) => {
      const b = s.getBoundingClientRect()
      return { text: s.textContent, top: +b.top.toFixed(1), bottom: +b.bottom.toFixed(1), left: +b.left.toFixed(1), right: +b.right.toFixed(1) }
    })
    .filter((b) => b.top > 60 && b.bottom < 780 && b.right - b.left < 30)
  return hit.length > 0 ? hit[0] : null
}, 'Smart cities represent')

const yLast = (geo.last.top + geo.last.bottom) / 2
const yFirst = (geo.firstPara.top + geo.firstPara.bottom) / 2

// ①欠达形态：段首起 → 段末行尾空白释放（修复前终点=7 行前）
await win.mouse.move(geo.firstPara.left + 2, yFirst)
await win.mouse.down()
await win.mouse.move(geo.last.right + 30, yLast, { steps: 16 })
await win.mouse.up()
await win.waitForTimeout(300)
const p1 = await paintBoxes()
console.log('G1_SEL', JSON.stringify(await readSel()))
console.log('G1_PAINT', JSON.stringify(p1))
console.log('G1_PAINT_MAX_BOTTOM', p1.length > 0 ? Math.max(...p1.map((r) => r.bottom)) : null, 'PARA2_TOP', geo.next.top)
await saveUnderline()

// ②浅下探释放：y+6（行间隙/下一行盒顶缘）
await win.mouse.move(geo.firstPara.left + 2, yFirst)
await win.mouse.down()
await win.mouse.move(geo.last.right + 30, yLast + 6, { steps: 16 })
await win.mouse.up()
await win.waitForTimeout(300)
const p2 = await paintBoxes()
console.log('G2_SEL', JSON.stringify(await readSel()))
console.log('G2_PAINT_MAX_BOTTOM', p2.length > 0 ? Math.max(...p2.map((r) => r.bottom)) : null, 'PARA2_TOP', geo.next.top)
await saveUnderline()

// ③段首缩进空白起点（ws-only 标记 span 上起选 → 向右拖）；视口外则滚一屏再找
let w3 = await wsInView()
if (w3 === null) {
  await win.mouse.move(800, 400)
  await win.mouse.wheel(0, 320)
  await win.waitForTimeout(600)
  w3 = await wsInView()
}
if (w3 !== null) {
  const yW = (w3.top + w3.bottom) / 2
  await win.mouse.move(w3.left + 1, yW)
  await win.mouse.down()
  await win.mouse.move(w3.right + 120, yW, { steps: 10 })
  await win.mouse.up()
  await win.waitForTimeout(300)
  console.log('G3_WS_SPAN', JSON.stringify(w3))
  console.log('G3_SEL', JSON.stringify(await readSel()))
  await saveUnderline()
} else {
  console.log('G3_SKIP 同页视口内无 ws-only 标记')
}
await app.close()
