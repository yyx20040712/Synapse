/**
 * F-R1 D 场景最小复现（临时诊断脚本，非取证产物）：隔离「fill 页码→程序滚
 * 落点」行为——密集采样 scrollTop 轨迹定位滚动目标。
 */
import { _electron as electron } from '@playwright/test'
import { cp, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const ROOT = process.cwd()
void ROOT
async function freshUserData() {
  const src = join(process.env.APPDATA, 'Synapse')
  const userData = join(tmpdir(), 'synapse-f-r1-dbg')
  await rm(userData, { recursive: true, force: true })
  for (const p of ['workspaces', 'ai-sensor']) await cp(join(src, p), join(userData, p), { recursive: true })
  for (const f of ['settings.json', 'workspace.json', 'window-state.json']) {
    if (existsSync(join(src, f))) await cp(join(src, f), join(userData, f))
  }
  return userData
}
const app = await electron.launch({ args: ['out/main/index.js'], env: { ...process.env, SYNAPSE_USER_DATA: await freshUserData() } })
const win = await app.firstWindow()
await win.getByRole('button', { name: '文献库' }).waitFor({ timeout: 20_000 })
await win.getByRole('button', { name: '文献库' }).click()
await win.waitForTimeout(1000)
await win.locator('button.lib-card').first().dblclick()
await win.waitForSelector('[data-page-column="ready"]', { timeout: 20_000 })
await win.waitForTimeout(1200)
console.log('（单页对照模式——不切双页）')
await win.waitForTimeout(1200)
const S = `(() => {
  const scroller = document.querySelector('[data-page-column]')?.closest('.overflow-auto')
  const input = document.querySelector('input[aria-label="跳转到页"]')
  return { st: scroller ? Math.round(scroller.scrollTop * 10) / 10 : null, page: input ? input.value : null }
})()`
console.log('双页就绪：', JSON.stringify(await win.evaluate(S)))
const GEOM = `(() => {
  const sc = document.querySelector('[data-page-column]')?.closest('.overflow-auto')
  const gs = sc.getBoundingClientRect()
  const rows = [...document.querySelectorAll('[data-page-row]')].slice(0, 4).map((r) => {
    const g = r.getBoundingClientRect()
    return { no: r.dataset.pageRow, contentTop: Math.round((g.top - gs.top + sc.scrollTop) * 10) / 10, h: Math.round(g.height) }
  })
  const boxes = [...document.querySelectorAll('[data-page-box]')].slice(0, 5).map((b) => {
    const g = b.getBoundingClientRect()
    return { no: b.dataset.pageBox, contentTop: Math.round((g.top - gs.top + sc.scrollTop) * 10) / 10, h: Math.round(g.height) }
  })
  return { st: Math.round(sc.scrollTop * 10) / 10, scrollH: sc.scrollHeight, clientH: sc.clientHeight, zoomRow: getComputedStyle(sc).zoom ?? 1, rows, boxes }
})()`
console.log('双页几何全景：', JSON.stringify(await win.evaluate(GEOM)))
await win.screenshot({ path: 'scripts/audits/f-r1-out/dbg-geom.png', fullPage: false })
const TREE = `(() => {
  const sc = document.querySelector('[data-page-column]')?.closest('.overflow-auto')
  const chain = []
  let el = document.querySelector('[data-page-row="1"]')
  while (el && el !== sc) {
    const g = el.getBoundingClientRect()
    chain.push({ tag: el.tagName, cls: String(el.className).slice(0, 40), top: Math.round(g.top), h: Math.round(g.height), display: getComputedStyle(el).display, pos: getComputedStyle(el).position })
    el = el.parentElement
  }
  return chain
})()`
console.log('行1 祖先链：', JSON.stringify(await win.evaluate(TREE), null, 1))
const H = `(() => {
  const col = document.querySelector('[data-page-column]')
  const stable = col.parentElement
  const sc = stable.closest('.overflow-auto')
  const rows = [...col.children]
  return {
    col: { offsetH: col.offsetHeight, scrollH: col.scrollHeight, childCount: rows.length, firstChildTop: rows[0]?.offsetTop, lastChildBottom: rows.at(-1) ? rows.at(-1).offsetTop + rows.at(-1).offsetHeight : null },
    stable: { cls: stable.className, offsetH: stable.offsetHeight, display: getComputedStyle(stable).display, kids: stable.children.length },
    sc: { scrollH: sc.scrollHeight, clientH: sc.clientHeight, kids: sc.children.length }
  }
})()`
console.log('高度构成：', JSON.stringify(await win.evaluate(H)))
await win.locator('input[aria-label="跳转到页"]').fill('1')
await win.locator('input[aria-label="跳转到页"]').press('Enter')
await win.waitForTimeout(800)
console.log('单页 fill(1)：', JSON.stringify(await win.evaluate(S)))
await win.locator('input[aria-label="跳转到页"]').fill('4')
await win.locator('input[aria-label="跳转到页"]').press('Enter')
await win.waitForTimeout(800)
console.log('单页 fill(4)（期望页4顶 12+3×805=2427）：', JSON.stringify(await win.evaluate(S)))
await win.getByRole('button', { name: '下一页' }).click()
await win.waitForTimeout(800)
console.log('单页 下一页(页4→期望页5顶 3232)：', JSON.stringify(await win.evaluate(S)))
await app.close()
