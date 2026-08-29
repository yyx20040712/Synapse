/**
 * AUDIT0 用户反馈取证(2026-08-30)——两条最高优先级:
 * P1 标注问题(同类二次触发预警):常态档高亮对位量化(对照 v7 修后基线
 *    dBottom≈-0.24)+大档 125% 对偶量化(v10 §3.3 未验对偶#3)+近景截图
 * P2 脉络说明性文字一整行:脉络页长单行文本自动定位(width>350 且单行的
 *    >30 字文本元素→选择器+尺寸)+全页/侧板截图
 * 配方=r2-f-after-forensics(真实库拷贝)+r2-set1(zoom)合体。
 */
import { _electron as electron } from '@playwright/test'
import { cp, mkdir, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const ROOT = process.cwd()
const OUT = join(ROOT, 'scripts', 'audits', 'audit0-out')
const R = {}
const log = (...a) => console.log(`[audit0 ${new Date().toISOString().slice(11, 19)}]`, ...a)

async function prepUserData(tag) {
  const src = join(process.env.APPDATA, 'Synapse')
  const userData = join(tmpdir(), `synapse-audit0-${tag}`)
  await rm(userData, { recursive: true, force: true })
  for (const p of ['workspaces', 'ai-sensor']) await cp(join(src, p), join(userData, p), { recursive: true })
  for (const f of ['settings.json', 'workspace.json', 'window-state.json']) {
    if (existsSync(join(src, f))) await cp(join(src, f), join(userData, f))
  }
  return userData
}

function setScale(userData, uiScale) {
  const p = join(userData, 'settings.json')
  const s = JSON.parse(readFileSync(p, 'utf8'))
  s.uiScale = uiScale
  writeFileSync(p, JSON.stringify(s))
}

const launch = (userData) =>
  electron.launch({ args: ['out/main/index.js'], env: { ...process.env, SYNAPSE_USER_DATA: userData } })

/** 划选→高亮→对位量化(与 r2-f-after 同手法:dTop/dBottom vs 覆盖 span 最大高盒) */
async function annotateAndMeasure(win, label) {
  await win.evaluate(`(() => {
    const spans = [...document.querySelectorAll('[data-page-root] .textLayer span')]
      .filter(sp => sp.firstChild && sp.firstChild.nodeType === 3 && sp.textContent.length > 0)
    const a = spans[2], t = a.firstChild.data
    const r = document.createRange()
    r.setStart(a.firstChild, Math.floor(t.length * 0.1))
    r.setEnd(a.firstChild, Math.floor(t.length * 0.8))
    const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r)
  })()`)
  await win.waitForSelector('[data-testid="selection-toolbar"]', { timeout: 8000 })
  await win.getByRole('button', { name: '高亮' }).click()
  await win.waitForTimeout(900)
  const m = await win.evaluate(`(() => {
    const owners = []
    let full = ''
    const spans = [...document.querySelectorAll('[data-page-root] .textLayer span')]
      .filter(sp => sp.firstChild && sp.firstChild.nodeType === 3 && sp.textContent.length > 0)
    for (const sp of spans) {
      for (let i = 0; i < sp.textContent.length; i++) owners.push(sp)
      full += sp.textContent
    }
    const out = []
    for (const el of document.querySelectorAll('[data-testid="annotation-rect"]')) {
      const quote = (el.getAttribute('aria-label') ?? '').replace(/^标注：/, '')
      const idx = full.indexOf(quote.slice(0, 12))
      if (idx < 0) continue
      const src = [...new Set(owners.slice(idx, idx + quote.length))]
      const dom = src.reduce((b, sp) => (sp.getBoundingClientRect().height > b.getBoundingClientRect().height ? sp : b))
      const eb = el.getBoundingClientRect(), sb = dom.getBoundingClientRect()
      out.push({
        quote: quote.slice(0, 10),
        dTopPx: +(eb.top - sb.top).toFixed(2),
        dBottomPx: +(eb.bottom - sb.bottom).toFixed(2),
        spanH: +sb.height.toFixed(1),
        annotH: +eb.height.toFixed(1)
      })
    }
    return out
  })()`)
  const rect1 = win.locator('[data-testid="annotation-rect"]').first()
  await rect1.scrollIntoViewIfNeeded()
  await win.waitForTimeout(300)
  const fb = await rect1.boundingBox()
  if (fb !== null) {
    await win.screenshot({
      path: join(OUT, `P1-${label}-closeup.png`),
      clip: { x: Math.max(fb.x - 80, 0), y: Math.max(fb.y - 70, 0), width: Math.min(fb.width + 160, 1280), height: fb.height + 140 }
    })
  }
  return m
}

/** 脉络页长单行文本定位:width>350 且 scrollHeight≈单行高 的 >30 字文本元素 */
async function findLongSingleLines(win) {
  return win.evaluate(`(() => {
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    const seen = new Set(), hits = []
    let node
    while ((node = walker_next(walk))) {
      const t = node.textContent.trim()
      if (t.length < 30) continue
      const el = node.parentElement
      if (!el || seen.has(el)) continue
      seen.add(el)
      const r = el.getBoundingClientRect()
      if (r.width < 350) continue
      const cs = getComputedStyle(el)
      const lh = parseFloat(cs.lineHeight) || 18
      if (el.scrollHeight > lh * 1.6) continue // 已多行
      hits.push({
        text: t.slice(0, 40),
        selector: el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\\s+/).slice(0, 3).join('.') : ''),
        w: Math.round(r.width),
        h: Math.round(r.height),
        whiteSpace: cs.whiteSpace,
        inSvg: !!el.closest('svg')
      })
    }
    function walker_next(w) { return w.nextNode() }
    return hits.slice(0, 20)
  })()`)
}

async function main() {
  if (!existsSync(join(ROOT, 'out', 'main', 'index.js'))) throw new Error('先 build')
  await mkdir(OUT, { recursive: true })

  // ── P1 场景A:常态档(small)标注对位 ──
  const udA = await prepUserData('small')
  let app = await launch(udA)
  let win = await app.firstWindow()
  await win.getByRole('button', { name: '阅读器' }).waitFor({ timeout: 20_000 })
  await win.waitForTimeout(600)
  // 开最近文献:阅读器若有已开 tab 直接用;否则回文献库双击首行
  const hasTab = await win.evaluate(() => !!document.querySelector('[data-page-root]'))
  if (!hasTab) {
    await win.getByRole('button', { name: '文献库' }).click()
    await win.waitForTimeout(400)
    const card = win.locator('.lib-card').first()
    if (await card.count() === 0) throw new Error('真实库副本无文献卡——检查拷贝')
    await card.dblclick()
  }
  await win.waitForSelector('[data-page-root] .textLayer span', { timeout: 20_000 })
  await win.waitForTimeout(800)
  R.smallScale = await annotateAndMeasure(win, 'small')
  log('small 档对位', JSON.stringify(R.smallScale))
  await app.close()

  // ── P1 场景B:大档(large=1.25)对偶 ──
  const udB = await prepUserData('large')
  setScale(udB, 'large')
  app = await launch(udB)
  win = await app.firstWindow()
  await win.getByRole('button', { name: '阅读器' }).waitFor({ timeout: 20_000 })
  await win.waitForTimeout(600)
  const hasTab2 = await win.evaluate(() => !!document.querySelector('[data-page-root]'))
  if (!hasTab2) {
    await win.getByRole('button', { name: '文献库' }).click()
    await win.waitForTimeout(400)
    await win.locator('.lib-card').first().dblclick()
  }
  await win.waitForSelector('[data-page-root] .textLayer span', { timeout: 20_000 })
  await win.waitForTimeout(800)
  R.largeScaleUiVar = await win.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--ui-scale'))
  R.largeScale = await annotateAndMeasure(win, 'large')
  log('large 档对位', JSON.stringify(R.largeScale))

  // ── P2:脉络页一整行文本定位(仍在 large 副本上——用户大档复测语境) ──
  await win.getByRole('button', { name: '脉络' }).click()
  await win.waitForTimeout(1200)
  await win.screenshot({ path: join(OUT, 'P2-lineage-full.png') })
  R.longSingleLines = await findLongSingleLines(win)
  log('脉络长单行文本', JSON.stringify(R.longSingleLines, null, 1))

  // 侧板:点首个节点展开详情再扫
  const node = win.locator('g[data-node-id]').first()
  if (await node.count() > 0) {
    await node.click()
    await win.waitForTimeout(500)
    R.sidePanel = await win.evaluate(() => {
      const p = document.querySelector('[data-testid="lineage-side-panel"]')
      return p ? p.getBoundingClientRect().width : null
    })
    R.longSingleLinesWithSide = await findLongSingleLines(win)
    await win.screenshot({ path: join(OUT, 'P2-lineage-side.png') })
    log('侧板开后长单行', JSON.stringify(R.longSingleLinesWithSide, null, 1))
  } else {
    R.longSingleLinesWithSide = null
  }
  await app.close()

  writeFileSync(join(OUT, 'audit0-forensics.json'), JSON.stringify(R, null, 2))
  console.log('AUDIT0 FORENSICS DONE')
}

await main().catch((e) => { console.error(e); process.exit(1) })
