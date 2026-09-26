import { test, expect } from '@playwright/test'
import { mkdtemp } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { isTicketDone } from '../../tickets/registry'
import { createMultiPagePdf, PDF_KNOWN_TEXT } from '../utils/pdf-factory'
import { bootstrapMigrations, launch, seedPaperRow } from './e2e-env'

/**
 * [P7E-03] 页内高亮搜索 e2e：装配级全链（fixture=createMultiPagePdf(3)，每页
 * 单行 `P<n> SMART WATER TEST DOC`——小写查询跨大小写命中每页恰 1 处）。
 * 链：打开文献→Ctrl+F（面板开+输入框聚焦）→输入小写 `smart water`→Enter
 * （提交搜索）→页 1 高亮块可见（计算样式+几何——jsdom 不可达面在此真机
 * Chromium 断言）+计数 1/3→Enter（下一处）→P2 文本入视口+计数 2/3+页 2
 * 高亮可见（两段式滚动：setPage 页盒顶→active 居中）→Esc→高亮清零+面板关。
 * 形态 crib reader-text.spec.ts（第一跳/双 ABI seed/launch 帮手——W1C 起收
 * 敛于 e2e-env.ts 单源）。
 */
const DEPS = ['SR-RDR-02', 'SR-LIB-01', 'SR-LIB-02', 'SR-RDR-04', 'SR2-F-01'] as const

/** 依赖未就绪则整测延期（翻 done 即激活）；不挂本票自身号——防恒绿假阳 */
function skipIfPending(deps: readonly string[]): void {
  const pending = deps.filter((d) => !isTicketDone(d))
  test.skip(pending.length > 0, `延期：依赖工单未完成 [${pending.join(', ')}]`)
}

test('P7E-03 页内高亮搜索全链：Ctrl+F→小写查询→逐处跳页高亮→Esc 清零', async () => {
  // 两跳 Electron 启动+建库迁移占大头（首跑实测 51.9s 贴 60s 默认线——机器
  // 抖动越界实测一次）；预算提到 120s（z-wg1-probe 先例同款）
  test.setTimeout(120_000)
  skipIfPending(DEPS)
  const title = '智慧水务 e2e 页内搜索文献'
  const userData = await mkdtemp(join(tmpdir(), 'synapse-p7e03-'))

  // 第一跳：让应用自己完成建库迁移（e2e-env.ts 单源——W1C 收敛）
  await bootstrapMigrations(userData)

  // 3 页受管文件（每页单行 P<n> KNOWN——`smart water` 每页恰 1 命中）
  const bytes = createMultiPagePdf(3, PDF_KNOWN_TEXT)
  const sha = createHash('sha256').update(bytes).digest('hex')
  const fileRef = `${sha.slice(0, 2)}/${sha.slice(2, 4)}/${sha}.pdf`
  const abs = join(userData, 'files', ...fileRef.split('/'))
  mkdirSync(dirname(abs), { recursive: true })
  writeFileSync(abs, bytes)
  await seedPaperRow(userData, fileRef, sha, title, 'e2e-seed-p7e03')

  const app = await launch(userData)
  const win = await app.firstWindow()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
  await win.getByText(title).first().dblclick()
  await expect(win.getByText(`P1 ${PDF_KNOWN_TEXT}`).first()).toBeVisible({ timeout: 20_000 })

  // —— S1：Ctrl+F → 面板开+输入框聚焦（keymap 'reader-search'，非 editable 目标）——
  await win.keyboard.press('Control+f')
  const input = win.getByTestId('reader-search-input')
  await expect(input).toBeVisible()
  await expect(input).toBeFocused()

  // —— S3：小写查询提交 → searching→done；首匹配 active；计数 1/3 ——
  await input.fill('smart water')
  await win.keyboard.press('Enter')
  await expect(win.getByTestId('reader-search-count')).toHaveText('1/3')

  // 页 1 高亮块：计算样式防线（Q3b 同族——几何可见≠视觉可见）：
  // 背景=var(--accent-soft) 解析值、层序 z=1（colorBlocks 背景板语言）、穿透
  const hlLayer = win.locator('[data-page-box="1"] [data-testid="search-highlight-layer"]').first()
  await expect(hlLayer).toBeVisible()
  await expect(hlLayer).toHaveCSS('z-index', '1')
  await expect(hlLayer).toHaveCSS('pointer-events', 'none')
  const activeHl = win.locator('[data-page-box="1"] [data-testid="search-hl"][data-active="true"]').first()
  await expect(activeHl).toBeVisible()
  // [T3-P1] --accent-soft 白天族值切换 #dcebf5→#eaeefc——[locked-change] 同步断言值
  await expect(activeHl).toHaveCSS('background-color', 'rgb(234, 238, 252)')
  await expect(activeHl).toHaveCSS('outline-style', 'solid')

  // 几何防线：active 块与被匹配文本行盒垂直同带+水平覆盖过半（滚动平移不变量）
  const hlBox = await activeHl.boundingBox()
  const textBox = await win.getByText(`P1 ${PDF_KNOWN_TEXT}`).first().boundingBox()
  expect(hlBox).not.toBeNull()
  expect(textBox).not.toBeNull()
  expect(Math.abs(hlBox!.y + hlBox!.height / 2 - (textBox!.y + textBox!.height / 2))).toBeLessThanOrEqual(textBox!.height)
  expect(hlBox!.width).toBeGreaterThanOrEqual(textBox!.width * 0.4)

  // —— S4：Enter（再按=下一处）→ active 2/3；两段式滚动：setPage 页 2 盒顶入
  //    视口+active 居中——P2 文本入视口+页 2 高亮可见 ——
  await win.keyboard.press('Enter')
  await expect(win.getByTestId('reader-search-count')).toHaveText('2/3')
  await expect(win.getByText(`P2 ${PDF_KNOWN_TEXT}`).first()).toBeVisible({ timeout: 10_000 })
  const activeHl2 = win.locator('[data-page-box="2"] [data-testid="search-hl"][data-active="true"]').first()
  await expect(activeHl2).toBeVisible({ timeout: 10_000 })

  // —— S6：Esc → idle：面板关+高亮清零 ——
  await win.keyboard.press('Escape')
  await expect(win.getByTestId('reader-search-box')).toHaveCount(0)
  await expect(win.getByTestId('search-hl')).toHaveCount(0)
  await expect(win.getByText(`P2 ${PDF_KNOWN_TEXT}`).first()).toBeVisible({ timeout: 5_000 })
  await app.close()
})
