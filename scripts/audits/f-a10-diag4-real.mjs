/** F-A10 诊断 4：G3 ws 标记点位的元素归属+选区为何坍缩（证据档） */
import { _electron as electron } from '@playwright/test'
import { cpSync, mkdtempSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const REAL = join(process.env.APPDATA ?? '', 'Synapse')
const userData = mkdtempSync(join(tmpdir(), 'synapse-a10diag4-'))
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
const probe = await win.evaluate(() => {
  const spans = [...document.querySelectorAll('.textLayer span')]
  const ref = spans.find((s) => (s.textContent ?? '').startsWith('Smart cities represent'))
  const tl = ref?.closest('.textLayer')
  const hit = [...(tl ?? document).querySelectorAll('span')]
    .filter((s) => (s.textContent ?? '').length > 0 && (s.textContent ?? '').trim().length === 0)
    .map((s) => {
      const b = s.getBoundingClientRect()
      return { text: s.textContent, top: +b.top.toFixed(1), bottom: +b.bottom.toFixed(1), left: +b.left.toFixed(1), right: +b.right.toFixed(1), h: +b.height.toFixed(1) }
    })
    .filter((b) => b.top > 60 && b.bottom < 780)
  // 取第一个 ws 标记周围 60px 内的文本 span 盒（看同行文本与覆盖关系）
  const w = hit[0]
  let neighbors = []
  if (w !== undefined) {
    const yW = (w.top + w.bottom) / 2
    neighbors = [...(tl?.querySelectorAll('span') ?? [])]
      .filter((s) => (s.textContent ?? '').trim().length > 0)
      .map((s) => {
        const b = s.getBoundingClientRect()
        return { text: (s.textContent ?? '').slice(0, 30), top: +b.top.toFixed(1), bottom: +b.bottom.toFixed(1), left: +b.left.toFixed(1), right: +b.right.toFixed(1) }
      })
      .filter((b) => Math.abs((b.top + b.bottom) / 2 - yW) < 8)
      .sort((a, b) => a.left - b.left)
      .slice(0, 8)
    // elementFromPoint 探针
    const el = document.elementFromPoint(w.left + 1, yW)
    return { wsFirst: w, neighbors, hitPoint: w.left + 1, yW: +yW.toFixed(1), topEl: el ? { tag: el.tagName, cls: el.className, text: (el.textContent ?? '').slice(0, 30) } : null }
  }
  return { wsFirst: null, neighbors: [], hitPoint: null, yW: null, topEl: null }
})
console.log(JSON.stringify(probe, null, 1))
await app.close()
