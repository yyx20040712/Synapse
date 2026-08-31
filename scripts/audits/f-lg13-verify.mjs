/**
 * F-LG13 一次性真机复验探针——统一尺寸+紧凑布局+题名滚动（票面 §5 ①~④）。
 * crib f-v2-diag.mjs（freshUserData 真实库副本+Electron 短暂开窗=LOOP 取证
 * 惯例）+f-v1-diag.mjs（evaluate dump 形态）+lineage.spec T2（add-node 主题
 * 节点 UI 链）/T3（右键连线 UI 链）。
 *
 * 复验四值：
 *  ① 全节点卡 rect 宽高集合=单元素 240×110（属性级+gBCR 级方差 0——真实
 *    图节点+合成节点合并计）；
 *  ② 兄弟节点水平间隙：合成三兄弟（同层直接兄弟）相邻中心距/k−240 ≈16
 *    （=新 SIBLING_GAP；且 <40 旧值——「中间没有空地」量化）；
 *  ③ 长题名节点：题名 div scrollHeight>clientHeight（溢出在场）+真鼠标
 *    wheel 后 scrollTop>0（滚轮归题名）+滚到底后文末文字与题名盒相交
 *    （文末可达）；
 *  ④ pageerror 0。
 * 产物：scripts/audits/f-lg13-verify.json + f-lg13-verify.png。
 * 前置：node scripts/sqlite-abi.mjs use electron + npm run build（探针消费
 * out/main/index.js——renderer 改动须已构建）。
 */
import { _electron as electron } from '@playwright/test'
import { cp, mkdir, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const ROOT = process.cwd()
const OUT = join(ROOT, 'scripts', 'audits')
await mkdir(OUT, { recursive: true })

/** 真实库副本（f-v2-diag 同法）：保留用户实况 uiScale/workspaces */
async function freshUserData() {
  const src = join(process.env.APPDATA, 'Synapse')
  const userData = join(tmpdir(), 'synapse-f-lg13-verify')
  await rm(userData, { recursive: true, force: true })
  for (const p of ['workspaces', 'ai-sensor']) await cp(join(src, p), join(userData, p), { recursive: true })
  for (const f of ['settings.json', 'workspace.json', 'window-state.json']) {
    if (existsSync(join(src, f))) await cp(join(src, f), join(userData, f))
  }
  return userData
}

const pageErrors = []
const userData = await freshUserData()
const app = await electron.launch({
  args: ['out/main/index.js'],
  env: { ...process.env, SYNAPSE_USER_DATA: userData }
})
app.process()?.stdout?.on('data', (d) => console.log('[main]', String(d).slice(0, 200)))
app.process()?.stderr?.on('data', (d) => console.log('[main-err]', String(d).slice(0, 200)))
const win = await app.firstWindow()
win.on('pageerror', (e) => pageErrors.push(String(e)))
await win.getByRole('button', { name: '文献库' }).waitFor({ timeout: 20_000 })
await win.getByRole('button', { name: '脉络', exact: true }).click()
await win.waitForTimeout(800)

// 真实图在场性（空图则仅合成节点计）
const emptyState = await win.getByText('暂无脉络图——导入草稿或添加节点').isVisible().catch(() => false)

// ── 合成受控图：根+三兄弟（同「未知年份」层），乙为超长题名（滚动载体）──
const LONG_TAIL = '文末锚点乙乙乙'
const KIDS = [
  { title: '验证子节点甲', long: false },
  { title: '验证子节点乙：' + '超长题名滚动测试逐字占位'.repeat(7) + LONG_TAIL, long: true },
  { title: '验证子节点丙', long: false }
]
const ROOT_TITLE = 'F-LG13验证根节点'
async function addTheme(title) {
  await win.getByTestId('lineage-add-node').click()
  await win.getByTestId('add-node-mode-theme').click()
  await win.getByTestId('add-node-title').fill(title)
  await win.getByRole('button', { name: '添加', exact: true }).click()
  const g = win.locator('svg g[data-node-id]').filter({ hasText: title })
  await g.waitFor({ timeout: 10_000 })
  await win.waitForTimeout(300)
}
await addTheme(ROOT_TITLE)
for (const k of KIDS) await addTheme(k.title)
// 根→三子连线（右键菜单连线模式→点目标——lineage.spec T3 同链）
for (const k of KIDS) {
  const rootG = win.locator('svg g[data-node-id]').filter({ hasText: ROOT_TITLE })
  await rootG.click({ button: 'right' })
  await win.getByTestId('lineage-node-menu').getByRole('menuitem', { name: '连线到…' }).click()
  await win.getByTestId('lineage-pending-link').waitFor({ timeout: 5_000 })
  await win.locator('svg g[data-node-id]').filter({ hasText: k.title }).click()
  await win.waitForTimeout(400)
}
await win.waitForTimeout(800)

/** 视口 scale k（data-viewport transform 解析——e2e 同式） */
const k = Number(
  (await win.locator('svg g[data-viewport]').getAttribute('transform'))?.match(/scale\(([\d.]+)\)$/)?.[1] ?? '1'
)

// ── ① 全节点统一尺寸（属性级+gBCR 级）──
const sizes = await win.evaluate(() => {
  const rects = [...document.querySelectorAll('svg g[data-node-id] > rect')]
  return {
    attr: rects.map((r) => `${r.getAttribute('width')}x${r.getAttribute('height')}`),
    gbcr: rects.map((r) => {
      const b = r.getBoundingClientRect()
      return `${b.width.toFixed(2)}x${b.height.toFixed(2)}`
    }),
    count: rects.length
  }
})

// ── ② 兄弟间隙（三兄弟同层：相邻中心距 − 卡宽，均屏幕 px 再按卡宽自标定
//    归一——rect gBCR 含祖先 uiScale zoom（F-L2 INV-43 根框口径），除视口 k
//    会差 uiScale 倍（首跑实证 16×1.25 读作 80）；screenPerLayout=rect 宽/240
//    自标定对任意嵌套 zoom 免疫）──
const kidCenters = []
for (const kd of KIDS) {
  const b = await win.locator('svg g[data-node-id]').filter({ hasText: kd.title }).locator('rect').boundingBox()
  kidCenters.push({ x: b.x + b.width / 2, w: b.width })
}
kidCenters.sort((a, b) => a.x - b.x)
const screenPerLayout = kidCenters[0].w / 240
const gaps = [0, 1]
  .map((i) => +((kidCenters[i + 1].x - kidCenters[i].x) / screenPerLayout - 240).toFixed(2))

// ── ③ 长题名滚动（真鼠标 wheel+文末可达）──
const longG = win.locator('svg g[data-node-id]').filter({ hasText: '验证子节点乙' })
const longBox = await longG.locator('rect').boundingBox()
await win.mouse.move(longBox.x + longBox.width / 2, longBox.y + longBox.height / 2)
await win.mouse.wheel(0, 600)
await win.waitForTimeout(300)
const scroll = await win.evaluate((tail) => {
  const gs = [...document.querySelectorAll('svg g[data-node-id]')]
  const g = gs.find((el) => (el.textContent ?? '').includes('验证子节点乙'))
  const div = g?.querySelector('foreignObject div div')
  if (div === null || div === undefined) return { err: 'no title div' }
  const before = div.scrollTop
  div.scrollTop = div.scrollHeight // 滚到底（文末可达前置）
  div.dispatchEvent(new Event('scroll'))
  // 文末可达：末 6 字 Range 与题名盒相交
  const textNode = div.firstChild
  const range = document.createRange()
  range.setStart(textNode, textNode.textContent.length - 6)
  range.setEnd(textNode, textNode.textContent.length)
  const tr = range.getBoundingClientRect()
  const dr = div.getBoundingClientRect()
  return {
    scrollHeight: div.scrollHeight,
    clientHeight: div.clientHeight,
    scrollTopAfterWheel: before,
    maxScrollTop: div.scrollTop,
    tailVisible: tr.bottom <= dr.bottom + 1 && tr.top < dr.bottom && tail.split('').every(() => true),
    tailText: textNode.textContent.slice(-6),
    computed: getComputedStyle(div).overflowY + '/' + getComputedStyle(div).scrollbarWidth
  }
}, LONG_TAIL)

await win.screenshot({ path: join(OUT, 'f-lg13-verify.png'), fullPage: false })

const result = {
  when: new Date().toISOString(),
  realGraphEmpty: emptyState,
  nodeCount: sizes.count,
  c1_uniform: {
    attrSet: [...new Set(sizes.attr)],
    gbcrSet: [...new Set(sizes.gbcr)],
    pass: new Set(sizes.attr).size === 1 && sizes.attr[0] === '240x110' && new Set(sizes.gbcr).size === 1
  },
  viewportK: k,
  c2_siblingGap: { gaps, expect: 16, pass: gaps.every((g) => Math.abs(g - 16) <= 1.5 && g < 40) },
  c3_titleScroll: { ...scroll, pass: scroll.err === undefined && scroll.scrollHeight > scroll.clientHeight + 1 && scroll.scrollTopAfterWheel > 0 && scroll.tailVisible },
  c4_pageErrors: { count: pageErrors.length, pass: pageErrors.length === 0 }
}
await writeFile(join(OUT, 'f-lg13-verify.json'), JSON.stringify(result, null, 2), 'utf8')
console.log(JSON.stringify(result, null, 2))
await app.close()
