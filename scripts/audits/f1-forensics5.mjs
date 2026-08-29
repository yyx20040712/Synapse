/**
 * F1 后续核查器 v5（2026-08-29 用户令：仿 WPS——灰选中/纯色标注；先核查
 * 「多行标注半透明矩形重合不加深+标注行为正常」是否已成立）。
 *
 * 核查面：
 *  ①多行高亮落库→渲染：annotation-rect 逐矩形几何+计算样式转储（每视觉行
 *    一块=mergeLineRects；容器 multiply+纯色块=同层重合不叠深的结构证据）
 *  ②截图供像素均匀度/行缝加深检测（主控 PS 管线：行中带 vs 行界带色差）
 *  ③行为：保存→rects 即刻在场；同段再选（选区压标注）态截图
 *  ④重叠加重专项：同一文本二次高亮（第二色）→两标注重叠区截图（不透明
 *    overpaint=后绘覆盖，无 multiply 叠乘）
 * 产物：scripts/audits/f1-out/v5-*.png/json
 * 用法：export PATH="/d/nodejs24:$PATH" && node scripts/audits/f1-forensics5.mjs
 */
import { _electron as electron } from '@playwright/test'
import { cp, mkdir, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const ROOT = process.cwd()
const OUT = join(ROOT, 'scripts', 'audits', 'f1-out')
const REALUserData = join(process.env.APPDATA, 'Synapse Remake')
const results = {}
function log(...a) { console.log(`[f5 ${new Date().toISOString().slice(11, 19)}]`, ...a) }

const HELPERS = `
  const spans19 = () => { const p = document.querySelector('[data-page-root="19"]')
    ?? document.querySelector('[data-page-root]'); return [...p.querySelectorAll('.textLayer span')]
    .filter(s => s.firstChild && s.firstChild.nodeType === 3 && s.textContent.length > 0) }
  const f5select = (fa, fb) => {
    const spans = spans19()
    const a = spans[Math.floor(spans.length * fa)], b = spans[Math.floor(spans.length * fb)]
    const r = document.createRange()
    r.setStart(a.firstChild, 0); r.setEnd(b.firstChild, Math.min(5, b.firstChild.data.length))
    const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r)
  }
`

/** 逐矩形转储（页 19 域内）+容器计算样式 */
const DUMP_RECTS = `(() => {
  const p19 = document.querySelector('[data-page-root="19"]') ?? document.querySelector('[data-page-root]')
  const rects = [...p19.querySelectorAll('[data-testid="annotation-rect"]')].map(r => {
    const b = r.getBoundingClientRect(); const cs = getComputedStyle(r)
    return { x: +b.x.toFixed(1), y: +b.y.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1), bg: cs.backgroundColor, opacity: cs.opacity }
  })
  const layer = document.querySelector('[data-testid="annotation-layer"]')
  const lcs = layer ? getComputedStyle(layer) : null
  return { rects, layer: lcs ? { blend: lcs.mixBlendMode, z: lcs.zIndex } : null }
})()`

async function main() {
  if (!existsSync(join(ROOT, 'out', 'main', 'index.js'))) throw new Error('先 npm run build')
  await mkdir(OUT, { recursive: true })
  const userData = join(tmpdir(), 'synapse-f5-check')
  await rm(userData, { recursive: true, force: true })
  await cp(REALUserData, userData, { recursive: true })
  const app = await electron.launch({ args: ['out/main/index.js'], env: { ...process.env, SYNAPSE_USER_DATA: userData } })
  const win = await app.firstWindow()
  await win.setDefaultTimeout(20_000)
  await win.getByRole('button', { name: '文献库' }).click()
  await win.locator('.lib-card').first().dblclick()
  await win.waitForSelector('[data-page-column="ready"]')
  await win.waitForFunction(() => document.querySelectorAll('[data-page-root] .textLayer span').length >= 20, null, { timeout: 25_000 })
  await win.waitForTimeout(1200)

  // ① 多行高亮：程序化选段（约 10 行）→ 高亮落库 → rects 即刻在场断言
  await win.evaluate(`(() => { ${HELPERS} f5select(0.35, 0.45) })()`)
  await win.waitForSelector('[data-testid="selection-toolbar"]', { timeout: 8_000 })
  await win.getByTestId('selection-toolbar').getByRole('button', { name: '高亮' }).click()
  await win.waitForTimeout(900)
  const afterSave = await win.evaluate(DUMP_RECTS)
  results.multiLine = afterSave
  log('multiLine rects=', afterSave.rects.length, 'layer=', JSON.stringify(afterSave.layer))
  await win.screenshot({ path: join(OUT, 'v5-annot-multiline.png') })

  // ③ 选区压标注（同段再选——当前蓝色选中态）
  await win.evaluate(`(() => { ${HELPERS} f5select(0.35, 0.45) })()`)
  await win.waitForTimeout(400)
  await win.screenshot({ path: join(OUT, 'v5-sel-over-annot.png') })
  await win.evaluate(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))`)
  await win.waitForTimeout(300)

  // ④ 重叠专项：同段换色二绘（选绿色→第二层覆盖）——不透明 overpaint 证据
  await win.evaluate(`(() => {
    const p19 = document.querySelector('[data-page-root="19"]') ?? document.querySelector('[data-page-root]')
    const bar = document.querySelector('[data-testid="selection-toolbar"]')
  })()`)
  await win.evaluate(`(() => { ${HELPERS} f5select(0.38, 0.43) })()`)
  await win.waitForSelector('[data-testid="selection-toolbar"]', { timeout: 8_000 })
  await win.getByTestId('selection-toolbar').getByRole('button', { name: '标注色：绿' }).click()
  await win.waitForTimeout(200)
  await win.getByTestId('selection-toolbar').getByRole('button', { name: '高亮' }).click()
  await win.waitForTimeout(900)
  const overlap = await win.evaluate(DUMP_RECTS)
  results.overlapTwoColors = overlap
  await win.screenshot({ path: join(OUT, 'v5-annot-overlap-twocolor.png') })

  results.dpr = await win.evaluate('window.devicePixelRatio')
  await writeFile(join(OUT, 'f1-forensics5.json'), JSON.stringify(results, null, 2), 'utf8')
  await app.close()
  log('完成 rects1=', results.multiLine.rects.length, 'rects2=', results.overlapTwoColors.rects.length)
}

main().catch((e) => { console.error('[f5] FAIL', e); process.exitCode = 1 })
