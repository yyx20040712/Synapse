/**
 * [F-UI-04] 顶栏文字垂直位置像素探针（z-*-probe 命名=probe project 专属，
 * 不进默认门——W2 拆分口径）。主控工具件：测量 .app-header-name/.app-nav-ver
 * 实际墨迹中心相对顶栏的偏移（门一 W1 放行条件①；门二 P1-1 修订版：
 * alpha 判定在不透明截图上恒真会退化为盒中心——改亮度阈值判定+双参考系
 * +dpr 记录）。
 *
 * 手法：元素区域截图 → dataURL 回注浏览器 canvas → ImageData 逐像素亮度
 * （0.299R+0.587G+0.114B）低于阈值为墨迹（背景冷雾灰 ≈242，文字 ≈38，
 * 阈值 128 中分；.app-nav-ver 的文字 #8d95ad 亮度 ≈149 与 border 混色
 * ≈205 以阈值 180 分离，徽章通道单独用 180）。参考系双报：border-box
 * 中心（探针 v1 口径）与 flex 居中轴（content-box 中心——border-bottom
 * 1px 使其恒上偏 0.5px）与 logo 22px 盒中心（相邻视觉锚）。
 */
import { test } from '@playwright/test'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { launch } from './e2e-env'

interface InkReport {
  label: string
  threshold: number
  boxRect: { y: number; h: number }
  dpr: number
  inkMinYCss: number
  inkMaxYCss: number
  inkCenterY: number
  borderBoxCenterY: number
  flexAxisCenterY: number
  logoBoxCenterY: number
  inkVsBorderBox: number
  inkVsFlexAxis: number
  inkVsLogo: number
}

test('F-UI-04 P3 顶栏墨迹垂直位置探针（亮度判定修订版）', async () => {
  const userData = mkdtempSync(join(tmpdir(), 'f-ui04-probe-'))
  const app = await launch(userData)
  const win = await app.firstWindow()
  await win.waitForTimeout(800)

  const base = await win.evaluate(() => {
    const h = document.querySelector('header.app-header') as HTMLElement
    const r = h.getBoundingClientRect()
    const border = Number(getComputedStyle(h).borderBottomWidth.replace('px', ''))
    const logo = document.querySelector('header.app-header > svg') as HTMLElement
    const lr = logo.getBoundingClientRect()
    return {
      headerTop: r.top,
      headerH: r.height,
      borderBottom: border,
      logoBoxCenterY: lr.y + lr.height / 2,
      dpr: window.devicePixelRatio
    }
  })

  async function inkCenterOf(sel: string, label: string, threshold: number): Promise<InkReport> {
    const box = await win.evaluate((s) => {
      const el = document.querySelector(s) as HTMLElement
      const r = el.getBoundingClientRect()
      return { x: r.x, y: r.y, w: r.width, h: r.height }
    }, sel)
    // clip 四向扩 3px：捕获行盒外墨迹（Synapse 的 y 降部可越出 line-height:1 行盒）
    const shot = await win.screenshot({
      clip: { x: box.x - 3, y: box.y - 3, width: box.w + 6, height: box.h + 6 }
    })
    const dataUrl = `data:image/png;base64,${shot.toString('base64')}`
    const ink = await win.evaluate(
      (args) => {
        const [url, thr] = args as [string, number]
        const img = new Image()
        img.src = url
        void img.decode()
        return new Promise<{ minY: number; maxY: number; imgH: number }>((resolve) => {
          img.onload = (): void => {
            const c = document.createElement('canvas')
            c.width = img.width
            c.height = img.height
            const ctx = c.getContext('2d') as CanvasRenderingContext2D
            ctx.drawImage(img, 0, 0)
            const d = ctx.getImageData(0, 0, c.width, c.height).data
            let minY = Infinity
            let maxY = -Infinity
            for (let y = 0; y < c.height; y++) {
              for (let x = 0; x < c.width; x++) {
                const i = (y * c.width + x) * 4
                const lum = 0.299 * (d[i] ?? 0) + 0.587 * (d[i + 1] ?? 0) + 0.114 * (d[i + 2] ?? 0)
                if (lum < thr) {
                  if (y < minY) minY = y
                  if (y > maxY) maxY = y
                }
              }
            }
            resolve({ minY, maxY, imgH: c.height })
          }
        })
      },
      [dataUrl, threshold]
    )
    const pxPerCss = ink.imgH / (box.h + 6)
    const inkMinYCss = ink.minY / pxPerCss - 3
    const inkMaxYCss = ink.maxY / pxPerCss - 3
    const inkCenterY = box.y + (inkMinYCss + inkMaxYCss) / 2
    const borderBoxCenterY = base.headerTop + base.headerH / 2
    const flexAxisCenterY = base.headerTop + (base.headerH - base.borderBottom) / 2
    return {
      label,
      threshold,
      boxRect: { y: box.y, h: box.h },
      dpr: base.dpr,
      inkMinYCss,
      inkMaxYCss,
      inkCenterY,
      borderBoxCenterY,
      flexAxisCenterY,
      logoBoxCenterY: base.logoBoxCenterY,
      inkVsBorderBox: inkCenterY - borderBoxCenterY,
      inkVsFlexAxis: inkCenterY - flexAxisCenterY,
      inkVsLogo: inkCenterY - base.logoBoxCenterY
    }
  }

  const name = await inkCenterOf('.app-header-name', 'Synapse 应用名', 128)
  const ver = await inkCenterOf('header.app-header .app-nav-ver', 'v0.1 版本徽章', 180)
  const switcher = await inkCenterOf('.ws-trigger', '课题切换器胶囊', 128)
  const logo = await inkCenterOf('header.app-header > svg', 'logo 菱形（金线）', 200)
  console.log('[F-UI-04-PROBE-V3]', JSON.stringify({ base, name, ver, switcher, logo }, null, 2))
  await app.close()
})
