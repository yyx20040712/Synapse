/**
 * F-A12 真机复测探针——事件层浅探 affinity 重定向后两面复测：
 *   ①G2 浅下探释放（y+6 落行间隙/下段盒顶，修复前 focus 下探进下段 span
 *     offset 39 → end=1504 带下段头）→ 重定向后终点=上一行行尾（quote 尾=
 *     「(Mohanty et al., 2016).」，paint 不跨段，落库 end 不含下段首字符）
 *   ②G1 段末行尾空白释放（y 对齐行中，F-A10 已修面）→ 回归不破（end=1465 口径）
 * 保存链经工具条「下划线」按钮落 temp 拷贝库，关库后查 annotations 对照。
 * 配方复用 f-a10-verify-real.mjs（白名单拷库）。
 */
import { _electron as electron } from '@playwright/test'
import { cpSync, mkdtempSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const REAL = join(process.env.APPDATA ?? '', 'Synapse')
const userData = mkdtempSync(join(tmpdir(), 'synapse-a12verify-'))
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
    firstPara: box(spans.find((s) => (s.textContent ?? '').startsWith('Smart cities represent')))
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
    return { top: +b.top.toFixed(1), bottom: +b.bottom.toFixed(1) }
  })
)
const saveUnderline = async () => {
  try {
    await win.getByRole('button', { name: '下划线' }).click({ timeout: 4000 })
    await win.waitForTimeout(700)
    return true
  } catch {
    console.log('SAVE_SKIP 无工具条（选区无效/坍缩）')
    return false
  }
}

const yLast = (geo.last.top + geo.last.bottom) / 2
const yFirst = (geo.firstPara.top + geo.firstPara.bottom) / 2

// ①G1 回归：段首起 → 段末行尾空白释放（y 对齐行中——F-A10 已修面，终点应=段末 1465 口径）
await win.mouse.move(geo.firstPara.left + 2, yFirst)
await win.mouse.down()
await win.mouse.move(geo.last.right + 30, yLast, { steps: 16 })
await win.mouse.up()
await win.waitForTimeout(300)
const p1 = await paintBoxes()
console.log('G1_SEL', JSON.stringify(await readSel()))
console.log('G1_PAINT_MAX_BOTTOM', p1.length > 0 ? Math.max(...p1.map((r) => r.bottom)) : null, 'PARA2_TOP', geo.next.top)
await saveUnderline()

// ②G2 修复面：浅下探释放 y+6（修复前 focus=(With regard span, 39) → end=1504 带下段头）
await win.mouse.move(geo.firstPara.left + 2, yFirst)
await win.mouse.down()
await win.mouse.move(geo.last.right + 30, yLast + 6, { steps: 16 })
await win.mouse.up()
await win.waitForTimeout(300)
const p2 = await paintBoxes()
console.log('G2_SEL', JSON.stringify(await readSel()))
console.log('G2_PAINT_MAX_BOTTOM', p2.length > 0 ? Math.max(...p2.map((r) => r.bottom)) : null, 'PARA2_TOP', geo.next.top)
await saveUnderline()

await app.close()

// ——落库对照：temp 拷贝库查最近两条下划线（G1/G2 保存序）——
const { createRequire } = await import('node:module')
const req = createRequire(join(process.cwd(), 'package.json'))
const Database = req('better-sqlite3')
const { readdirSync: rd, statSync } = await import('node:fs')
const findDbs = (dir, acc) => {
  for (const n of rd(dir)) {
    const p = join(dir, n)
    const st = statSync(p)
    if (st.isDirectory()) findDbs(p, acc)
    else if (n.endsWith('.db')) acc.push(p)
  }
  return acc
}
for (const dbPath of findDbs(userData, [])) {
  try {
    const db = new Database(dbPath, { readonly: true })
    const rows = db.prepare(
      "SELECT a.end_offset, a.suffix_text, substr(a.quote_text, -42) AS quote_tail FROM annotations a JOIN papers p ON p.id = a.paper_id WHERE a.kind = 'underline' AND p.title LIKE '%smart water%' ORDER BY a.created_at DESC, a.rowid DESC LIMIT 2"
    ).all()
    if (rows.length > 0) {
      console.log('DB', dbPath)
      for (const r of rows) console.log('DB_ROW', JSON.stringify(r))
    }
    db.close()
  } catch {
    // 非 annotations 库（如 FTS/其他）——跳过
  }
}
console.log('PROBE_DONE')
