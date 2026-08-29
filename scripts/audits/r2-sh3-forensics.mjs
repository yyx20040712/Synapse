/**
 * R2-SH3 frameless 标题栏取证(票面 ⑤b):无头真机截图+computed 转储。
 * 面板:
 *  - 顶栏常态截图(三键在场,最大化按钮 aria-label=「最大化」)
 *  - maximize 后截图(图标切换态:aria-label=「向下还原」)
 *  - computed `-webkit-app-region` 转储(header=drag / switcher+controls=no-drag)
 *  - close hover 态 computed background(#e81123 系)——hover 经 :hover 类强制态
 * 用法:先 npm run build,再 node scripts/audits/r2-sh3-forensics.mjs
 * (禁可见窗口——前台保护规则,electron.launch 无头默认)
 */
import { _electron as electron } from '@playwright/test'
import { cp, mkdir, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const ROOT = process.cwd()
const OUT = join(ROOT, 'scripts', 'audits', 'r2-sh3-out')
const results = {}
function log(...a) {
  console.log(`[r2-sh3 ${new Date().toISOString().slice(11, 19)}]`, ...a)
}

async function main() {
  if (!existsSync(join(ROOT, 'out', 'main', 'index.js'))) throw new Error('先 build')
  await mkdir(OUT, { recursive: true })
  // 真实库拷贝(⑤f:实景验证——顶栏切换器消费真实课题清单)
  const src = join(process.env.APPDATA, 'Synapse')
  const userData = join(tmpdir(), 'synapse-r2-sh3')
  await rm(userData, { recursive: true, force: true })
  for (const p of ['workspaces', 'ai-sensor']) {
    if (existsSync(join(src, p))) await cp(join(src, p), join(userData, p), { recursive: true })
  }
  for (const f of ['settings.json', 'workspace.json', 'window-state.json']) {
    if (existsSync(join(src, f))) await cp(join(src, f), join(userData, f))
  }
  const app = await electron.launch({
    args: ['out/main/index.js'],
    env: { ...process.env, SYNAPSE_USER_DATA: userData }
  })
  const win = await app.firstWindow()
  await win.setDefaultTimeout(25_000)
  await win.setViewportSize({ width: 1280, height: 860 })
  await win.getByText('Synapse').waitFor({ timeout: 20_000 })
  await win.waitForTimeout(600)

  // ── 常态态:三键可见+最大化按钮初始 label ──
  results.normalButtons = await win.evaluate(() => {
    const labels = Array.from(document.querySelectorAll('.titlebar-controls button')).map((b) =>
      b.getAttribute('aria-label')
    )
    return labels
  })
  await win.screenshot({ path: join(OUT, 'header-normal.png'), clip: { x: 0, y: 0, width: 1280, height: 44 } })

  // ── computed app-region 转储(header/switcher/controls/三键) ──
  results.appRegions = await win.evaluate(() => {
    const get = (sel) => {
      const el = document.querySelector(sel)
      return el === null ? 'missing' : getComputedStyle(el).getPropertyValue('-webkit-app-region')
    }
    return {
      header: get('.app-header'),
      switcher: get('.app-header-switcher'),
      controls: get('.titlebar-controls'),
      btnMin: get('.titlebar-controls button[aria-label="最小化"]')
    }
  })

  // ── maximize:点「最大化」→ isMaximized true + 按钮切「向下还原」 ──
  await win.getByRole('button', { name: '最大化' }).click()
  await win.waitForFunction(
    () => document.querySelector('.titlebar-controls button[aria-label="向下还原"]') !== null,
    null,
    { timeout: 8000 }
  )
  results.maximizeState = await app.evaluate(({ BrowserWindow }) => {
    const w = BrowserWindow.getAllWindows()[0]
    return { isMaximized: w === undefined ? null : w.isMaximized() }
  })
  await win.waitForTimeout(400)
  await win.screenshot({ path: join(OUT, 'header-maximized.png'), clip: { x: 0, y: 0, width: 1280, height: 44 } })

  // ── 还原(restore 图标在位即点) ──
  await win.getByRole('button', { name: '向下还原' }).click()
  await win.waitForFunction(
    () => document.querySelector('.titlebar-controls button[aria-label="最大化"]') !== null,
    null,
    { timeout: 8000 }
  )
  results.restoreState = await app.evaluate(({ BrowserWindow }) => {
    const w = BrowserWindow.getAllWindows()[0]
    return { isMaximized: w === undefined ? null : w.isMaximized() }
  })

  // ── close hover 态 computed background(:hover 强制态取证) ──
  // 五b 先例:截图回 CDN 时以可量化探针裁定——matches(':hover') 判定事件送达,
  // 再取 computed backgroundColor(CSS 层生效性)
  await win.hover('.titlebar-btn-close')
  await win.waitForTimeout(300)
  results.closeHover = await win.evaluate(() => {
    const el = document.querySelector('.titlebar-btn-close')
    if (el === null) return { present: false }
    return {
      present: true,
      hovered: el.matches(':hover'),
      bg: getComputedStyle(el).backgroundColor,
      rect: el.getBoundingClientRect().toJSON()
    }
  })
  results.closeHoverBg = results.closeHover.bg
  await win.screenshot({ path: join(OUT, 'header-close-hover.png'), clip: { x: 1080, y: 0, width: 200, height: 44 } })

  // ── 版本号+三键排布(右区次序:版本号在键组左) ──
  results.rightOrder = await win.evaluate(() => {
    const header = document.querySelector('.app-header')
    if (header === null) return 'missing'
    const kids = Array.from(header.children).map((el) => ({
      cls: el.className,
      text: el.textContent === null ? '' : el.textContent.trim().slice(0, 20)
    }))
    return kids
  })

  await app.close()
  await writeFile(join(OUT, 'regions.json'), JSON.stringify(results, null, 2), 'utf-8')
  log('done', JSON.stringify(results))
}

main().catch((e) => {
  console.error('[r2-sh3] FAILED', e)
  process.exit(1)
})
