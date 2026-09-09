/**
 * F-UI-01 顶栏左簇垂直居中——开工实证探针（一次性，主控）。
 * 问：.app-header 已有 align-items:center（theme-shell.css:17），用户实锤
 * 左簇偏贴顶（f-ui01-img4 判读：上留白~10px/下留白~30px）——矛盾点定性：
 * Q1 header/svg/name/switcher 各自 rect 与中心差（几何层是否真居中）
 * Q2 文字 ink 盒（Range.getBoundingClientRect）vs 行盒——字形 metrics 偏移量
 * Q3 computed：align-items/height/padding/line-height/font-size（规则面核对）
 */
import { _electron as electron } from '@playwright/test'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const userData = await mkdtemp(join(tmpdir(), 'synapse-ui01-'))
const app = await electron.launch({
  args: ['out/main/index.js'],
  env: { ...process.env, SYNAPSE_USER_DATA: userData },
})
const win = await app.firstWindow()
await win.waitForTimeout(800)

const m = await win.evaluate(() => {
  const q = (s) => document.querySelector(s)
  const r = (el) => {
    const b = el.getBoundingClientRect()
    return { top: b.top, bottom: b.bottom, h: b.height, cy: (b.top + b.bottom) / 2 }
  }
  const header = q('.app-header')
  const svg = q('.app-header svg')
  const name = q('.app-header-name')
  const switcher = q('.app-header-switcher')
  const range = document.createRange()
  range.selectNodeContents(name)
  const ink = range.getBoundingClientRect()
  const hcs = getComputedStyle(header)
  const ncs = getComputedStyle(name)
  return {
    header: r(header),
    svg: r(svg),
    name: r(name),
    nameInk: { top: ink.top, bottom: ink.bottom, h: ink.height, cy: (ink.top + ink.bottom) / 2 },
    switcher: r(switcher),
    headerAlignItems: hcs.alignItems,
    headerH: hcs.height,
    headerPad: hcs.padding,
    nameFontSize: ncs.fontSize,
    nameLineHeight: ncs.lineHeight,
    nameDisplay: ncs.display,
    dpr: window.devicePixelRatio,
  }
})
const clTop = Math.min(m.svg.top, m.nameInk.top)
const clBot = Math.max(m.svg.bottom, m.nameInk.bottom)
const out = {
  ...m,
  cluster: { top: clTop, bottom: clBot, cy: (clTop + clBot) / 2 },
  clusterCenterDelta: (clTop + clBot) / 2 - m.header.cy,
  svgCenterDelta: m.svg.cy - m.header.cy,
  nameInkCenterDelta: m.nameInk.cy - m.header.cy,
}
console.log(JSON.stringify(out, null, 2))
await app.close()
