/**
 * AUDIT0-P1b:多行划选标注取证(用户「最严重的还是标注问题」补充面——
 * 单行高亮已证贴合,多行聚合矩形未取证)。
 * 三种标注(高亮/下划线/备注)各跨 3+ 行划选→近景截图+行间断距量化。
 */
import { _electron as electron } from '@playwright/test'
import { cp, mkdir, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const ROOT = process.cwd()
const OUT = join(ROOT, 'scripts', 'audits', 'audit0-out')
const R = {}
const log = (...a) => console.log(`[p1b ${new Date().toISOString().slice(11, 19)}]`, ...a)

async function main() {
  if (!existsSync(join(ROOT, 'out', 'main', 'index.js'))) throw new Error('先 build')
  await mkdir(OUT, { recursive: true })
  const src = join(process.env.APPDATA, 'Synapse')
  const userData = join(tmpdir(), 'synapse-audit0-p1b')
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

  // 跨多行划选:从第 6 个 span 的 15% 到第 14 个 span 的 85%(覆盖 3+ 行)
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

  // 三种标注各来一次(高亮→下划线→备注),分别截图+量化
  // 三种标注 testid 统一 annotation-rect(AnnotationLayer 结构——kind 靠样式区分:
  // 高亮≈行盒高/下划线=2px 实条/备注=整行色块);按 data-annotation-id 增量取最新
  const kinds = [
    { name: '高亮', btn: '高亮' },
    { name: '下划线', btn: '下划线' },
    { name: '备注', btn: '备注' }
  ]
  for (const k of kinds) {
    await multiSelect(5, 13)
    await win.getByRole('button', { name: k.btn }).click()
    if (k.name === '备注') {
      await win.waitForSelector('[data-testid="annotation-editor"]', { timeout: 5000 }).catch(() => {})
      const ta = win.getByLabel('批注内容')
      if (await ta.count() > 0) {
        await ta.fill('多行备注取证')
        await win.getByRole('button', { name: '保存' }).click()
      }
    }
    await win.waitForTimeout(900)
    // 滚到标注区(rect 可能生成在当前滚动位置之外——y 负数实录)
    await win.evaluate(`(() => {
      const el = [...document.querySelectorAll('[data-testid="annotation-rect"]')].find(e => e.getBoundingClientRect().width > 5)
      el?.scrollIntoView({ block: 'center' })
    })()`)
    await win.waitForTimeout(400)
    const q = await win.evaluate(`(() => {
      const els = [...document.querySelectorAll('[data-testid="annotation-rect"]')]
      const rects = els.map(el => { const r = el.getBoundingClientRect(); return { x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) } })
      // 行间断距:按 y 聚类同 testid 元素,量相邻行块的垂直间隙
      const gaps = []
      const sorted = rects.filter(r => r.w > 5).sort((a, b) => a.y - b.y)
      for (let i = 1; i < sorted.length; i++) gaps.push(+(sorted[i].y - (sorted[i - 1].y + sorted[i - 1].h)).toFixed(2))
      return { count: els.length, rects: rects.slice(0, 8), gaps }
    })()`)
    R[k.name] = q
    log(k.name, JSON.stringify(q))
    // 近景截图:取所有标注元素的整体包围盒
    const shot = await win.evaluate(`(() => {
      const els = [...document.querySelectorAll('[data-testid="annotation-rect"]')]
      if (!els.length) return null
      let x1 = 1e9, y1 = 1e9, x2 = -1e9, y2 = -1e9
      for (const el of els) { const r = el.getBoundingClientRect(); x1 = Math.min(x1, r.x); y1 = Math.min(y1, r.y); x2 = Math.max(x2, r.right); y2 = Math.max(y2, r.bottom) }
      return { x: Math.max(x1 - 60, 0), y: Math.max(y1 - 60, 0), w: Math.min(x2 - x1 + 120, 1280), h: Math.min(y2 - y1 + 120, 900) }
    })()`)
    if (shot && Number.isFinite(shot.w) && Number.isFinite(shot.h) && shot.w > 0 && shot.h > 0) {
      await win.screenshot({ path: join(OUT, `P1b-multi-${k.name}.png`), clip: { x: shot.x, y: shot.y, width: Math.min(shot.w, 1280), height: Math.min(shot.h, 900) } })
    }
    // 清场:删除本页标注(右键菜单太重——直接 evaluate 清空页面标注层?不能动产品数据……副本库,可粗暴)
  }
  await app.close()
  const { writeFileSync } = await import('node:fs')
  writeFileSync(join(OUT, 'audit0-p1b.json'), JSON.stringify(R, null, 2))
  console.log('P1B DONE')
}

await main().catch((e) => { console.error(e); process.exit(1) })
