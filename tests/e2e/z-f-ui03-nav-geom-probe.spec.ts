/**
 * [F-UI-03] 侧栏 nav 满高几何探针（z-*-probe 命名=probe project 专属，
 * 不进默认门）。门二 P1-1 修复的几何实证：SplitPane pane 容器为块级 div
 * （无 flex stretch），nav 从 .app-content-row 直接子项迁入后须自备
 * height:100%——渐变/金线满高与 foot 钉底（margin-top:auto）的前提。
 * jsdom 无布局、smoke 只断言 nav 项 rect——此面唯真浏览器可证。
 */
import { expect, test } from '@playwright/test'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { launch } from './e2e-env'

test('F-UI-03 nav 满高：nav 高=内容行高，foot 钉底', async () => {
  const userData = mkdtempSync(join(tmpdir(), 'f-ui03-probe-'))
  const app = await launch(userData)
  const win = await app.firstWindow()
  await win.waitForTimeout(800)

  const geom = await win.evaluate(() => {
    const row = document.querySelector('.app-content-row') as HTMLElement
    const nav = document.querySelector('nav.app-nav') as HTMLElement
    const foot = document.querySelector('.app-nav-foot') as HTMLElement
    const rowR = row.getBoundingClientRect()
    const navR = nav.getBoundingClientRect()
    const footR = foot.getBoundingClientRect()
    return {
      rowH: rowR.height,
      navH: navR.height,
      navPadBottom: Number(getComputedStyle(nav).paddingBottom.replace('px', '')),
      footBottomGap: rowR.bottom - footR.bottom
    }
  })
  // 满高：nav 高=内容行高（容差 1px 栅格化）；foot 钉底=钉在 nav 内容盒底
  // （margin-top:auto 生效的实证——foot 底距行底≈nav 底 padding，非内容高度处）
  expect(geom.navH, `nav 应满高（navH=${geom.navH} vs rowH=${geom.rowH}）`).toBeGreaterThanOrEqual(geom.rowH - 1)
  expect(
    Math.abs(geom.footBottomGap - geom.navPadBottom),
    `foot 应钉内容盒底（gap=${geom.footBottomGap} vs paddingBottom=${geom.navPadBottom}——若 gap≫padding 则 nav 未满高/foot 未钉底）`
  ).toBeLessThanOrEqual(1)
  console.log('[F-UI-03-GEOM]', JSON.stringify(geom))
  await app.close()
})
