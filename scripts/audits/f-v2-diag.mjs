/**
 * F-V2 一次性诊断探针——双页模式「适应宽度」两侧空白大（用户图3，2026-08-31）。
 * crib f-a4-diag.mjs 运行模式（Electron 真机/库副本复用/JSON+截图）。
 *
 * 取证四值（定位「zoom 算小」的根因层）：
 *  ① scrollArea 布局宽 clientWidth vs 视觉宽 getBoundingClientRect().width
 *     （两者差=ui-scale 复合干扰面——F-R2 同域嫌疑）；
 *  ② 双页行实际渲染宽（同行两页盒并排 bbox）与 scrollArea 可视宽比值
 *     （用户现象量化：两侧空白=可视宽−行宽）；
 *  ③ 页盒原始宽×当前渲染比例（pdf 页 CSS 宽）——推导实际生效 zoom；
 *  ④ 点「适应宽度」前后行宽变化（按钮是否实际生效——columnBasis<=0
 *     静默 return 嫌疑：点了没反应=行宽零变化）。
 * 真机 Electron 短暂开窗属项目 LOOP 取证惯例（主控指令声明）。
 * 产物：scripts/audits/f-v2-out/diag.png + diag-raw.txt（stdout JSON 落盘，
 * 含结构链 chain 诊断段——CSS zoom 各层口径实证：app-content-row 放大
 * uiScale、[data-page-column] 反向补偿相消、滚动容器 gBCR/offsetWidth=干净比值）。
 */
import { _electron as electron } from '@playwright/test'
import { cp, mkdir, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const ROOT = process.cwd()
const OUT = join(ROOT, 'scripts', 'audits', 'f-v2-out')
await mkdir(OUT, { recursive: true })
/** 真实库副本（f-a4-verify 同法）：uiScale 保留用户实况（large 档——F-V2 复现前提）。
 *  不复用旧副本（synapse-f-a4-after 实测 Chromium 状态损坏→firstWindow Timeout）。 */
async function freshUserData() {
  const src = join(process.env.APPDATA, 'Synapse')
  const userData = join(tmpdir(), 'synapse-f-v2-diag')
  await rm(userData, { recursive: true, force: true })
  for (const p of ['workspaces', 'ai-sensor']) await cp(join(src, p), join(userData, p), { recursive: true })
  for (const f of ['settings.json', 'workspace.json', 'window-state.json']) {
    if (existsSync(join(src, f))) await cp(join(src, f), join(userData, f))
  }
  return userData
}
const userData = await freshUserData()
const app = await electron.launch({ args: ['out/main/index.js'], env: { ...process.env, SYNAPSE_USER_DATA: userData } })
// 诊断：主进程 stdout/stderr 转发（firstWindow Timeout 时看主进程死因）
app.process()?.stdout?.on('data', (d) => console.log('[main]', String(d).slice(0, 300)))
app.process()?.stderr?.on('data', (d) => console.log('[main-err]', String(d).slice(0, 300)))
const win = await app.firstWindow()
await win.getByRole('button', { name: '文献库' }).waitFor({ timeout: 20_000 })
await win.getByRole('button', { name: '文献库' }).click()
await win.waitForTimeout(800)
await win.locator('button.lib-card').first().dblclick()
await win.waitForSelector('[data-page-root]', { timeout: 20_000 })
await win.waitForTimeout(1500)

// 切双页（title 定位——ReaderToolbar aria/title 面）
await win.getByTitle('两页并排阅读（翻页按对步进）').click()
await win.waitForTimeout(1200)

/** 页内取数：行宽/可视宽/zoom 推导/ui-scale */
const measure = async () =>
  await win.evaluate(() => {
    const page = document.querySelector('[data-page-root]')
    if (page === null) return { err: 'no page-root' }
    const scrollArea = page.closest('.overflow-auto') ?? page.parentElement
    const saBox = scrollArea.getBoundingClientRect()
    // 同一行的页盒：y 中心相近（±10px）视为并排行
    const roots = [...document.querySelectorAll('[data-page-root]')]
    const boxes = roots.map((r) => {
      const b = r.getBoundingClientRect()
      return { x: b.x, y: b.y, w: b.width, h: b.height }
    })
    const first = boxes[0]
    const rowMates = boxes.filter((b) => Math.abs(b.y - first.y) < 10)
    const rowLeft = Math.min(...rowMates.map((b) => b.x))
    const rowRight = Math.max(...rowMates.map((b) => b.x + b.w))
    const rowW = rowRight - rowLeft
    const uiScaleEl = document.querySelector('.app-content-row') ?? document.body
    const zoomVal = getComputedStyle(uiScaleEl).zoom
    return {
      scrollArea: {
        clientWidth: scrollArea.clientWidth,
        visualWidth: +saBox.width.toFixed(1),
        // 内容区两侧空白（行相对滚动可视区的左右余量）
        blankLeft: +(rowLeft - saBox.x).toFixed(1),
        blankRight: +(saBox.x + saBox.width - rowRight).toFixed(1)
      },
      row: { pagesInRow: rowMates.length, width: +rowW.toFixed(1) },
      pageBox: first,
      uiScaleZoom: zoomVal,
      rowOverClient: +(rowW / scrollArea.clientWidth).toFixed(3)
    }
  })

const before = await measure()
await win.getByRole('button', { name: '适应宽度' }).click()
await win.waitForTimeout(1800)
const after = await measure()

// 结构诊断：从页盒上溯到 body，每层 clientWidth/gBCR/offsetWidth/computed zoom
// （CSS zoom 参与布局与否、clientWidth 是否 unzoomed——逐层实证）
const chain = await win.evaluate(() => {
  const col = document.querySelector('[data-page-column]')
  const out = []
  let el = col
  for (let i = 0; i < 8 && el !== null; i += 1) {
    const cs = getComputedStyle(el)
    out.push({
      tag: el.tagName,
      cls: String(el.className).slice(0, 40),
      clientW: el.clientWidth,
      offsetW: el.offsetWidth,
      gBCRW: +el.getBoundingClientRect().width.toFixed(1),
      zoom: cs.zoom,
      transform: cs.transform.slice(0, 20)
    })
    el = el.parentElement
  }
  return out
})
const result = { before, after, changed: JSON.stringify(before) !== JSON.stringify(after), chain }
await win.screenshot({ path: join(OUT, 'diag.png') })
console.log(JSON.stringify(result, null, 2))
await app.close()
