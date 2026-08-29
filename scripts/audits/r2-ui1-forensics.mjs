/**
 * R2-UI1 + R2-LIB1 真机像素证（⑤f——纯 CSS/皮肤级变更同走真机实景验证）。
 * 取证面：
 *  - 课题切换触发钮：冷蓝边框可见性 + 流光动画（computed animationName/background）
 *  - 下拉面板/新建态/创建钮（primary 渐变+按压）
 *  - 按压态：trigger :active / primary :active / 文献卡 :active（mouse 按住期截图）
 *  - 文献卡网格：default 课题 8 卡实景 + 行高/行距量化（R2-LIB1 minmax 修值）
 * 用法：export PATH="/d/nodejs24:$PATH" && node scripts/audits/r2-ui1-forensics.mjs
 */
import { _electron as electron } from '@playwright/test'
import { cp, mkdir, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const ROOT = process.cwd()
const OUT = join(ROOT, 'scripts', 'audits', 'r2-ui1-out')
const results = {}
function log(...a) {
  console.log(`[ui1 ${new Date().toISOString().slice(11, 19)}]`, ...a)
}

async function main() {
  if (!existsSync(join(ROOT, 'out', 'main', 'index.js'))) throw new Error('先 build')
  await mkdir(OUT, { recursive: true })
  const src = join(process.env.APPDATA, 'Synapse')
  const userData = join(tmpdir(), 'synapse-r2ui1')
  await rm(userData, { recursive: true, force: true })
  // 数据-bearing 子集拷贝（Cache 系可再生不搬；workspaces/=真实库本体）
  for (const p of ['workspaces', 'ai-sensor']) await cp(join(src, p), join(userData, p), { recursive: true })
  for (const f of ['settings.json', 'workspace.json', 'window-state.json']) {
    if (existsSync(join(src, f))) await cp(join(src, f), join(userData, f))
  }
  const app = await electron.launch({
    args: ['out/main/index.js'],
    env: { ...process.env, SYNAPSE_USER_DATA: userData }
  })
  const win = await app.firstWindow()
  await win.setDefaultTimeout(20_000)
  await win.setViewportSize({ width: 1280, height: 800 })

  // ── 1. 文献库基线（顶栏+侧栏+网格全窗）──
  await win.getByRole('button', { name: '文献库' }).click()
  await win.waitForSelector('.lib-card, .lib-grid')
  await win.waitForTimeout(600)
  await win.screenshot({ path: join(OUT, 'S1-library-baseline.png') })
  await win.locator('.app-header').screenshot({ path: join(OUT, 'S2-header-closeup.png') })

  // ── 2. computed 转储：触发钮/渐变/动画/网格行距量化 ──
  results.trigger = await win.evaluate(`(() => {
    const el = document.querySelector('.ws-trigger')
    if (!el) return 'MISSING'
    const cs = getComputedStyle(el)
    return {
      borderColor: cs.borderColor, borderWidth: cs.borderWidth,
      backgroundImage: cs.backgroundImage.slice(0, 120),
      backgroundSize: cs.backgroundSize,
      animationName: cs.animationName, color: cs.color,
      rect: el.getBoundingClientRect().toJSON()
    }
  })()`)
  results.navActiveBar = await win.evaluate(`(() => {
    const el = document.querySelector('.app-nav-item-active')
    if (!el) return 'MISSING'
    const cs = getComputedStyle(el, '::before')
    return { animationName: cs.animationName, backgroundSize: cs.backgroundSize }
  })()`)
  results.navEdgeLine = await win.evaluate(`(() => {
    const cs = getComputedStyle(document.querySelector('.app-nav'), '::after')
    return { animationName: cs.animationName, backgroundSize: cs.backgroundSize }
  })()`)

  // ── 3. 面板展开 + 新建态 ──
  await win.getByRole('button', { name: '切换课题' }).click()
  await win.waitForTimeout(400)
  await win.screenshot({ path: join(OUT, 'S3-panel-open.png') })
  results.panel = await win.evaluate(`(() => {
    const el = document.querySelector('.ws-panel')
    if (!el) return 'MISSING'
    const cs = getComputedStyle(el)
    return { borderColor: cs.borderColor, animationName: cs.animationName,
             bg: cs.backgroundColor, items: el.querySelectorAll('.ws-item').length }
  })()`)
  await win.getByRole('button', { name: '新建课题…' }).click()
  await win.waitForTimeout(300)
  await win.screenshot({ path: join(OUT, 'S4-creating.png') })

  // ── 4. 创建钮（primary）按压态：按住期截图 ──
  const createBtn = win.getByRole('button', { name: '创建' })
  await createBtn.hover()
  await win.mouse.down()
  await win.waitForTimeout(150)
  await win.screenshot({ path: join(OUT, 'S5-primary-active.png') })
  results.primaryActive = await win.evaluate(`(() => {
    const el = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === '创建')
    const cs = getComputedStyle(el)
    return { transform: cs.transform, filter: cs.filter, bgImage: cs.backgroundImage.slice(0, 100),
             bgPos: cs.backgroundPosition, shadow: cs.boxShadow.slice(0, 110) }
  })()`)
  await win.mouse.up()
  // 合上面板（点外不关——v1 轻量面，再点触发钮）
  await win.getByRole('button', { name: '切换课题' }).click()

  // ── 5. 触发钮按压态 ──
  await win.getByRole('button', { name: '切换课题' }).hover()
  await win.waitForTimeout(200)
  await win.mouse.down()
  await win.waitForTimeout(150)
  await win.screenshot({ path: join(OUT, 'S6-trigger-active.png') })
  results.triggerActive = await win.evaluate(`(() => {
    const el = document.querySelector('.ws-trigger')
    const cs = getComputedStyle(el)
    return { transform: cs.transform, filter: cs.filter, shadow: cs.boxShadow.slice(0, 120) }
  })()`)
  await win.mouse.up()

  // ── 6. 切到 default 课题（真实 8 卡）——reload 后量化网格行距（R2-LIB1）──
  await win.getByRole('button', { name: '切换课题' }).click()
  await win.waitForTimeout(300)
  const defaultItem = win.locator('.ws-item', { hasText: '默认课题' })
  if ((await defaultItem.count()) > 0) {
    await defaultItem.first().click()
    await win.waitForTimeout(2500) // 切换成功即 reload
    await win.getByRole('button', { name: '文献库' }).click()
    await win.waitForSelector('.lib-card')
    await win.waitForTimeout(600)
  }
  await win.screenshot({ path: join(OUT, 'S7-grid-default.png') })
  results.grid = await win.evaluate(`(() => {
    const grid = document.querySelector('.lib-grid')
    if (!grid) return 'MISSING'
    const cs = getComputedStyle(grid)
    const rows = new Map()
    for (const c of grid.children) {
      const r = c.getBoundingClientRect()
      const key = Math.round(r.top)
      const cur = rows.get(key)
      if (!cur || r.height > cur.h) rows.set(key, { top: r.top, h: r.height })
    }
    const rs = [...rows.values()].sort((a, b) => a.top - b.top)
    const gaps = []
    for (let i = 1; i < rs.length; i++) gaps.push(+(rs[i].top - (rs[i - 1].top + rs[i - 1].h)).toFixed(1))
    return { gridAutoRows: cs.gridAutoRows, rowCount: rs.length, cardCount: grid.children.length,
             rowHeights: rs.map(r => +r.h.toFixed(0)), interRowGaps: gaps }
  })()`)

  // ── 7. 文献卡按压态 ──
  const card = win.locator('.lib-card').first()
  await card.hover()
  await win.mouse.down()
  await win.waitForTimeout(150)
  await win.screenshot({ path: join(OUT, 'S8-card-active.png') })
  results.cardActive = await win.evaluate(`(() => {
    const el = document.querySelector('.lib-card')
    const cs = getComputedStyle(el)
    return { transform: cs.transform, borderColor: cs.borderColor }
  })()`)
  await win.mouse.up()
  results.dpr = await win.evaluate('window.devicePixelRatio')

  await writeFile(join(OUT, 'r2-ui1-forensics.json'), JSON.stringify(results, null, 2), 'utf8')
  await app.close()
  log('完成', JSON.stringify(results.grid))
}

main().catch((e) => {
  console.error('[ui1] FAIL', e)
  process.exitCode = 1
})
