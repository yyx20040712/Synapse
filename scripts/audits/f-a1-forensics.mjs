/**
 * F-A1 归并重构取证复跑——验收设计文档 §5 量化线:
 * 同一跨 9-span 划选(与 audit0-p1b-multi.mjs 同配方,结果可直接对照):
 * ①块数 7→行数(零宽幽灵块消失);②零宽块=0;③gaps 全 ≥0;
 * ④任意两块相交面积=0(程序断言,渲染 rect 级,含 %→px 舍入容差 0.6px);
 * ⑤下划线同位重复块消失(每行一条)。
 * 产物:audit0-out/f-a1-verify.json + f-a1-multi-*.png 近景。
 */
import { _electron as electron } from '@playwright/test'
import { cp, mkdir, rm } from 'node:fs/promises'
import { existsSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const ROOT = process.cwd()
const OUT = join(ROOT, 'scripts', 'audits', 'audit0-out')
const R = { meta: { script: 'f-a1-forensics.mjs', date: new Date().toISOString() }, kinds: {}, verdict: null }
const log = (...a) => console.log(`[f-a1 ${new Date().toISOString().slice(11, 19)}]`, ...a)

/** 两两相交面积(视口 px;重叠宽/高取正部) */
function pairwiseIntersections(rects) {
  const out = []
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i], b = rects[j]
      const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)
      const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)
      if (ox > 0 && oy > 0) out.push({ i, j, ox: +ox.toFixed(2), oy: +oy.toFixed(2), area: +(ox * oy).toFixed(2) })
    }
  }
  return out
}

async function main() {
  if (!existsSync(join(ROOT, 'out', 'main', 'index.js'))) throw new Error('先 build')
  await mkdir(OUT, { recursive: true })
  const src = join(process.env.APPDATA, 'Synapse')
  const userData = join(tmpdir(), 'synapse-f-a1-verify')
  await rm(userData, { recursive: true, force: true })
  for (const p of ['workspaces', 'ai-sensor']) await cp(join(src, p), join(userData, p), { recursive: true })
  for (const f of ['settings.json', 'workspace.json', 'window-state.json']) {
    if (existsSync(join(src, f))) await cp(join(src, f), join(userData, f))
  }
  const app = await electron.launch({ args: ['out/main/index.js'], env: { ...process.env, SYNAPSE_USER_DATA: userData } })
  const win = await app.firstWindow()
  await win.getByRole('button', { name: '阅读器' }).waitFor({ timeout: 20_000 })
  await win.waitForTimeout(600)
  if (!(await win.evaluate(() => !!document.querySelector('[data-page-root]')))) {
    await win.getByRole('button', { name: '文献库' }).click()
    await win.waitForTimeout(400)
    await win.locator('.lib-card').first().dblclick()
  }
  await win.waitForSelector('[data-page-root] .textLayer span', { timeout: 20_000 })
  await win.waitForTimeout(800)

  async function multiSelect(from, to, a = 0.15, b = 0.85) {
    await win.evaluate(`(() => {
      const spans = [...document.querySelectorAll('[data-page-root] .textLayer span')]
        .filter(sp => sp.firstChild && sp.firstChild.nodeType === 3 && sp.textContent.length > 0)
      const s = spans[${from}], e = spans[${to}]
      const r = document.createRange()
      r.setStart(s.firstChild, Math.floor(s.firstChild.data.length * ${a}))
      r.setEnd(e.firstChild, Math.floor(e.firstChild.data.length * ${b}))
      const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r)
    })()`)
    await win.waitForSelector('[data-testid="selection-toolbar"]', { timeout: 8000 })
  }

  const kinds = [
    { name: '高亮', btn: '高亮' },
    { name: '下划线', btn: '下划线' }
  ]
  let allPass = true
  for (const k of kinds) {
    // 本轮前已在场的标注 id 集——保存后按新 id 过滤(只量本轮产物,p1b 原稿口径缺陷修正)
    const idsBefore = await win.evaluate(`(() => [...document.querySelectorAll('[data-testid="annotation-rect"]')].map(e => e.dataset.annotationId))()`)
    await multiSelect(5, 13)
    await win.getByRole('button', { name: k.btn }).click()
    await win.waitForTimeout(900)
    await win.evaluate(`(() => {
      const el = [...document.querySelectorAll('[data-testid="annotation-rect"]')].find(e => e.getBoundingClientRect().width > 5)
      el?.scrollIntoView({ block: 'center' })
    })()`)
    await win.waitForTimeout(400)
    const q = await win.evaluate(`(() => {
      const before = ${JSON.stringify([...idsBefore])}
      const newIds = new Set([...document.querySelectorAll('[data-testid="annotation-rect"]')].map(e => e.dataset.annotationId).filter(id => !before.includes(id)))
      const els = [...document.querySelectorAll('[data-testid="annotation-rect"]')].filter(e => newIds.has(e.dataset.annotationId))
      const rects = els.map(el => { const r = el.getBoundingClientRect(); return { x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) } })
      const real = rects.filter(r => r.w > 1)
      const zeroW = rects.filter(r => r.w <= 1).length
      const gaps = []
      const sorted = [...real].sort((a, b) => a.y - b.y)
      for (let i = 1; i < sorted.length; i++) gaps.push(+(sorted[i].y - (sorted[i - 1].y + sorted[i - 1].h)).toFixed(2))
      // 同位重复检测:同行(y 差 <1px)且 x 区间重合度 >50% 的块对
      const dupPairs = []
      for (let i = 0; i < sorted.length; i++) for (let j = i + 1; j < sorted.length; j++) {
        const a = sorted[i], b = sorted[j]
        if (Math.abs(a.y - b.y) < 1) {
          const ov = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)
          if (ov > 0.5 * Math.min(a.w, b.w)) dupPairs.push([i, j])
        }
      }
      return { count: rects.length, realCount: real.length, zeroW, rects, gaps, dupPairs }
    })()`)
    const inter = pairwiseIntersections(q.rects.filter((r) => r.w > 1))
    // 渲染 %→px 舍入可留 ≤0.6px 视觉不可见交叠;>0.6px 判失败
    const interFail = inter.filter((p) => p.ox > 0.6 && p.oy > 0.6)
    const pass = q.zeroW === 0 && interFail.length === 0 && q.dupPairs.length === 0 && q.gaps.every((g) => g >= -0.6)
    allPass = allPass && pass
    R.kinds[k.name] = { ...q, intersections: inter, interFail, pass }
    log(k.name, JSON.stringify({ count: q.count, zeroW: q.zeroW, gaps: q.gaps, inter: inter.length, interFail: interFail.length, dupPairs: q.dupPairs.length, pass }))
    const shot = await win.evaluate(`(() => {
      const before = ${JSON.stringify([...idsBefore])}
      const newIds = new Set([...document.querySelectorAll('[data-testid="annotation-rect"]')].map(e => e.dataset.annotationId).filter(id => !before.includes(id)))
      const els = [...document.querySelectorAll('[data-testid="annotation-rect"]')].filter(e => newIds.has(e.dataset.annotationId))
      if (!els.length) return null
      let x1 = 1e9, y1 = 1e9, x2 = -1e9, y2 = -1e9
      for (const el of els) { const r = el.getBoundingClientRect(); x1 = Math.min(x1, r.x); y1 = Math.min(y1, r.y); x2 = Math.max(x2, r.right); y2 = Math.max(y2, r.bottom) }
      return { x: Math.max(x1 - 60, 0), y: Math.max(y1 - 60, 0), w: Math.min(x2 - x1 + 120, 1280), h: Math.min(y2 - y1 + 120, 900) }
    })()`)
    if (shot && Number.isFinite(shot.w) && shot.w > 0) {
      await win.screenshot({ path: join(OUT, `f-a1-multi-${k.name}.png`), clip: { x: shot.x, y: shot.y, width: Math.min(shot.w, 1280), height: Math.min(shot.h, 900) } })
    }
  }
  R.verdict = allPass ? 'PASS' : 'FAIL'
  await app.close()
  writeFileSync(join(OUT, 'f-a1-verify.json'), JSON.stringify(R, null, 2))
  console.log(`F-A1 VERIFY: ${R.verdict}`)
  if (!allPass) process.exitCode = 1
}

await main().catch((e) => { console.error(e); process.exit(1) })
