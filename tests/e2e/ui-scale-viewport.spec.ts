import { test, expect, type Page } from '@playwright/test'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { bootstrapMigrations, launch, seedPaperRow } from './e2e-env'

/**
 * [F-UIRES-VFIX-01] ui-scale 放大档壳层视口完整性回归锁。
 * 缺陷（已诊断定案）：--ui-scale=1.1/1.25 时 .app-shell grid 无显式列模板
 * →隐式 auto 列被 .app-content-row（zoom 参与布局计算）的 max-content 贡献
 * 撑超视口→header/statusbar 被 stretch 到贡献宽→caption 三键出窗+文档横向
 * 溢出。修复=.app-shell 钉死 grid-template-columns: minmax(0, 1fr)——列宽
 * 恒=容器宽，内容溢出由 .app-main（overflow-auto+min-w-0）容器内消化
 * （文档永不滚 INV 不变量在放大档的补全）。
 * 宽标题种子：.lib-r-title white-space:nowrap 的 max-content 沿祖先链
 * 贡献到 grid 轨道尺寸——长题名确定性复现撑破（免依赖字体度量的临界值）；
 * 题名长=370 CJK 字（「视口完整性宽标题种子」10 字+「超长题名填充」×60
 * =360 字）。
 * --ui-scale 直设 documentElement=探针等效快通道：与 App.tsx effect 写的是
 * 同一 documentElement 内联 style 变量、消费面同为 theme-shell.css 两条
 * zoom 规则（.app-content-row/[data-page-column]）——注入点相同即等效；
 * 档位经 settings store 的端到端面由 smoke.spec「R2-SET1 界面缩放」另证。
 * [RR1-W2] (c) 面勘误：documentElement.scrollWidth 在 html/body/#root
 * overflow:hidden 剪辑链下不反映溢出（探针实证：header=1571 出窗时其值恒
 * ==innerW，恒真假阳性）；改锁 .app-content-row rect 宽=撑破源本体——轨道
 * 撑破只反映在被 stretch 的 grid items 上（header/content-row/statusbar
 * 三者实测同值互证；.app-shell 容器自身 border-box 恒=父宽，锁它恒真）。
 * [RR1-W3] 档位切换后无 waitForTimeout：CSS 变量→zoom 属同步布局失效，
 * getBoundingClientRect 强制同步 reflow 即读新值（变异红证跑无等待立现
 * 红值=同步性实证）；zoom 无 transition 面（transition 只挂 background/
 * color）。
 * [RR1-5] 断言组 expect.soft 化：变异态一次跑出 a/b/c/d 全部独立红值——
 * 非 soft 首败即停会掩盖后续面（独立失败证明载体；绿态语义不变=全过才过）。
 */

/** 宽标题（370 CJK 字——nowrap max-content 贡献远超任何窗口宽） */
const WIDE_TITLE = '视口完整性宽标题种子' + '超长题名填充'.repeat(60)

/**
 * 四面断言组：(a) header 宽 ≤ 视口+1（grid 列钉死后恒=容器宽）；
 * (b) caption 三键全在视口（右缘≤视口+1 且左/顶缘≥0）；
 * (c) .app-content-row 宽 ≤ 视口+1（撑破源本体——RR1-W2 改锁面）；
 * (d) .app-statusbar 右缘≤视口+1 且顶缘≥0 且底缘≤视口高+1（状态条被
 * 推出窗/被盖症状锁——垂直面为防御面）。
 */
async function assertShellWithinViewport(win: Page, label: string): Promise<void> {
  const m = await win.evaluate(() => {
    const rect = (sel: string): DOMRect => document.querySelector(sel)!.getBoundingClientRect()
    const header = rect('.app-header')
    const row = rect('.app-content-row')
    const bar = rect('.app-statusbar')
    const btns = Array.from(document.querySelectorAll('.titlebar-btn')).map((b) => {
      const r = b.getBoundingClientRect()
      return { name: b.getAttribute('aria-label'), right: r.right, x: r.x, y: r.y }
    })
    return {
      innerW: window.innerWidth,
      innerH: window.innerHeight,
      headerW: header.width,
      rowW: row.width,
      barRight: bar.right,
      barY: bar.y,
      barBottom: bar.bottom,
      btns
    }
  })
  const cap = `${label}（innerW=${m.innerW}）`
  expect.soft(m.headerW, `${cap} (a) header 宽 ${m.headerW} 应 ≤ 视口+1`).toBeLessThanOrEqual(m.innerW + 1)
  expect.soft(m.btns, `${cap} caption 三键应在场`).toHaveLength(3)
  for (const b of m.btns) {
    expect.soft(b.right, `${cap} (b) 「${b.name}」右缘 ${b.right} 应 ≤ 视口+1`).toBeLessThanOrEqual(m.innerW + 1)
    expect.soft(b.x, `${cap} (b) 「${b.name}」左缘 ${b.x} 应 ≥ 0`).toBeGreaterThanOrEqual(0)
    expect.soft(b.y, `${cap} (b) 「${b.name}」顶缘 ${b.y} 应 ≥ 0`).toBeGreaterThanOrEqual(0)
  }
  expect.soft(m.rowW, `${cap} (c) 内容行宽 ${m.rowW} 应 ≤ 视口+1`).toBeLessThanOrEqual(m.innerW + 1)
  expect.soft(m.barRight, `${cap} (d) 状态条右缘 ${m.barRight} 应 ≤ 视口+1`).toBeLessThanOrEqual(m.innerW + 1)
  expect.soft(m.barY, `${cap} (d) 状态条顶缘 ${m.barY} 应 ≥ 0`).toBeGreaterThanOrEqual(0)
  expect.soft(m.barBottom, `${cap} (d) 状态条底缘 ${m.barBottom} 应 ≤ 视口高+1`).toBeLessThanOrEqual(m.innerH + 1)
}

/** 公共前置：种子破引导态+宽标题文献→launch→进文献库→表行在场 */
async function prepareLibrary(win: Page): Promise<void> {
  await win.getByRole('button', { name: '文献库' }).click({ timeout: 20_000 })
  await expect(
    win.locator('.lib-fn-row').filter({ hasText: '全部文献' })
  ).toBeVisible({ timeout: 10_000 })
  await expect(
    win.locator('.lib-row', { hasText: '视口完整性宽标题种子' })
  ).toBeVisible({ timeout: 10_000 })
}

test('ui-scale 1.1 档：壳层撑破修复——header 恒视口宽+caption 三键在窗+内容行不溢出+状态条在窗', async () => {
  const userData = await mkdtemp(join(tmpdir(), 'synapse-uivfix-110-'))
  await bootstrapMigrations(userData)
  const sha = '1'.repeat(64)
  await seedPaperRow(userData, `${sha.slice(0, 2)}/${sha.slice(2, 4)}/${sha}.pdf`, sha, WIDE_TITLE)
  const app = await launch(userData)
  const win = await app.firstWindow()
  await prepareLibrary(win)

  await win.evaluate("document.documentElement.style.setProperty('--ui-scale','1.1')")
  await assertShellWithinViewport(win, '1.1 档')

  await app.close()
})

test('ui-scale 1.25 档：壳层撑破修复——同四面断言（大档 0/3 出窗的最重灾态）', async () => {
  const userData = await mkdtemp(join(tmpdir(), 'synapse-uivfix-125-'))
  await bootstrapMigrations(userData)
  const sha = '2'.repeat(64)
  await seedPaperRow(userData, `${sha.slice(0, 2)}/${sha.slice(2, 4)}/${sha}.pdf`, sha, WIDE_TITLE)
  const app = await launch(userData)
  const win = await app.firstWindow()
  await prepareLibrary(win)

  await win.evaluate("document.documentElement.style.setProperty('--ui-scale','1.25')")
  await assertShellWithinViewport(win, '1.25 档')

  await app.close()
})
