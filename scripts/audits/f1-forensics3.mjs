/**
 * F1 取证三号机（2026-08-29 r4）——「自绘选区 DOM 在场但真机不可见」定位。
 * 二号机已证：拖选/双击/程序化全部产生 pending（rects+toolbar 在 DOM）；
 * 像素统计证明四态着色面积相同（词选=全页选）→ 选区块没有实际绘制。
 * 三号机：转储选区块几何/样式/命中元素，并按其 boundingBox 精确采样截图像素。
 *
 * 用法：export PATH="/d/nodejs24:$PATH" && node scripts/audits/f1-forensics3.mjs
 */
import { _electron as electron } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const ROOT = process.cwd()
const OUT = join(ROOT, 'scripts', 'audits', 'f1-out')
const userData = join(tmpdir(), 'synapse-f1-forensics')
const results = {}

function log(...a) { console.log(`[f3 ${new Date().toISOString().slice(11, 19)}]`, ...a) }

async function main() {
  if (!existsSync(userData)) throw new Error('临时 userData 不在')
  await mkdir(OUT, { recursive: true })
  const app = await electron.launch({ args: ['out/main/index.js'], env: { ...process.env, SYNAPSE_USER_DATA: userData } })
  const win = await app.firstWindow()
  await win.setDefaultTimeout(20_000)
  await win.getByRole('button', { name: '文献库' }).click()
  await win.locator('.lib-card').first().dblclick()
  await win.waitForSelector('[data-page-column="ready"]')
  await win.waitForFunction(() => document.querySelectorAll('[data-page-root] .textLayer span').length >= 20, null, { timeout: 25_000 })
  await win.waitForTimeout(1200)

  // 程序化选词（页 19 中部——已知必产 pending）
  await win.evaluate(`(() => {
    const p19 = document.querySelector('[data-page-root="19"]')
    const spans = [...p19.querySelectorAll('.textLayer span')].filter(s => s.firstChild && s.firstChild.nodeType === 3)
    const a = spans[Math.floor(spans.length * 0.5)]
    const r = document.createRange()
    r.setStart(a.firstChild, 0); r.setEnd(a.firstChild, Math.min(8, a.firstChild.data.length))
    const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r)
  })()`)
  await win.waitForSelector('[data-testid="selection-rect"]', { timeout: 8_000, state: 'attached' })
  await win.waitForTimeout(200)

  // 全量转储：容器/首 rect 的几何+计算样式+命中链
  results.geometry = await win.evaluate(`(() => {
    const cont = document.querySelector('[data-testid="selection-rects"]')
    const rect = document.querySelector('[data-testid="selection-rect"]')
    const rc = rect.getBoundingClientRect()
    const cc = cont.getBoundingClientRect()
    const cs = getComputedStyle(rect)
    const cx = Math.round(rc.x + rc.width / 2), cy = Math.round(rc.y + rc.height / 2)
    // 命中链：从 rect 中心向上枚举（elementFromPoint 只给最顶）
    const top = document.elementFromPoint(cx, cy)
    const chain = []
    let el = top
    while (el && chain.length < 6) { chain.push(el.tagName + '.' + String(el.className).slice(0, 30) + '|z:' + getComputedStyle(el).zIndex); el = el.parentElement }
    return {
      contBox: { x: cc.x, y: cc.y, w: cc.width, h: cc.height },
      rectBox: { x: rc.x, y: rc.y, w: rc.width, h: rc.height },
      rectStyle: { display: cs.display, visibility: cs.visibility, opacity: cs.opacity, bg: cs.backgroundColor, pos: cs.position, z: cs.zIndex, blend: cs.mixBlendMode },
      rectCount: document.querySelectorAll('[data-testid="selection-rect"]').length,
      center: { x: cx, y: cy },
      topAtCenter: top ? top.tagName + '.' + String(top.className).slice(0, 40) : 'none',
      chain
    }
  })()`)
  log('geometry', JSON.stringify(results.geometry))
  await win.screenshot({ path: join(OUT, 'T3-word.png') })

  // 对照态：清掉选区再截一张（差分用）
  await win.evaluate(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))`)
  await win.waitForTimeout(300)
  await win.screenshot({ path: join(OUT, 'T3-baseline.png') })

  await writeFile(join(OUT, 'f1-forensics3.json'), JSON.stringify(results, null, 2), 'utf8')
  await app.close()
  log('完成')
}

main().catch((e) => { console.error('[f3] FAIL', e); process.exitCode = 1 })
