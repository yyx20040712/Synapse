import { test, expect } from '@playwright/test'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { bootstrapMigrations, launch, seedPaperRow } from './e2e-env'

/**
 * [T3-P3] 文献库密度列表 e2e（always-active，无工单门）。
 *
 * 链路：种子两篇（甲=全值行：年份/venue 命中 T1 档/引用缓存 17；乙=缺值行：
 * 全 NULL → 年月/引用「—」）→五列表头在场+行内真实文本（题名/引用数/
 * 缺值占位；档次列 F-LIBUI-01 退役、序号 # 前缀删）→点击行出规格表抽屉
 * （四格指标真实文本+fld 键值行+关联节退役）→动作区两列 grid 计算样式锚
 * （F-LIBUI-01 ⑥）→选中行挂 sel 类。断言=真实文本+类锚+getComputedStyle
 * （INV-06 口径——禁截图比对）。
 */
test('文献库密度列表：五列表头+行五列真实文本+抽屉四格+动作区 grid+选中态', async () => {
  const userData = await mkdtemp(join(tmpdir(), 'synapse-t3p3-'))

  // 第一跳：应用自建库表（tag-lifecycle.spec 同配方——不 import src 内部模块）
  await bootstrapMigrations(userData)

  const shaA = 'a'.repeat(64)
  const shaB = 'b'.repeat(64)
  await seedPaperRow(
    userData,
    `${shaA.slice(0, 2)}/${shaA.slice(2, 4)}/${shaA}.pdf`,
    shaA,
    'T3P3 甲文献：管网漏损定位',
    'e2e-t3p3-a',
    { year: 2023, venue: 'Nature Water', cited: 17 }
  )
  await seedPaperRow(
    userData,
    `${shaB.slice(0, 2)}/${shaB.slice(2, 4)}/${shaB}.pdf`,
    shaB,
    'T3P3 乙文献：缺值对照',
    'e2e-t3p3-b'
  )

  const app = await launch(userData)
  const win = await app.firstWindow()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })

  // —— 五列表头在场（编号/题名 · 期刊/年月/引用/标签——真实文本；档次列 F-LIBUI-01 退役）——
  const cols = win.locator('.lib-cols')
  await expect(cols).toBeVisible()
  for (const head of ['编号', '题名 · 期刊', '年月', '引用', '标签']) {
    await expect(cols.getByText(head, { exact: true })).toBeVisible()
  }
  await expect(cols.locator('.lib-c-tier')).toHaveCount(0)

  // —— 甲行（全值）：真实题名+期刊副行+年份+引用数（档次徽章已退役）——
  // 序号锚：[F-FOLDER-01 收口亲修] INV-92 pubNo=库级全序派生（year ASC,
  // month ASC NULLS LAST, added_at ASC——PUBNO_ORDER 单源）替旧 catalogNo
  // 图序：甲 year=2023 在前=001，乙缺年 NULLS LAST 殿后=002（probe 实测恒定）
  const rowA = win.locator('.lib-row', { hasText: 'T3P3 甲文献' })
  await expect(rowA).toBeVisible({ timeout: 10_000 })
  await expect(rowA.locator('.lib-r-id')).toHaveText('001')
  await expect(rowA.locator('.lib-r-title')).toHaveText('T3P3 甲文献：管网漏损定位')
  await expect(rowA.locator('.lib-r-j')).toHaveText('Nature Water')
  await expect(rowA.locator('.lib-r-year')).toHaveText('2023')
  await expect(rowA.locator('.lib-r-cite')).toHaveText('17')
  await expect(rowA.locator('.lib-tier')).toHaveCount(0)

  // —— 乙行（缺值对照）：缺年 NULLS LAST 殿后=002+年月/引用两占位「—」 ——
  const rowB = win.locator('.lib-row', { hasText: 'T3P3 乙文献' })
  await expect(rowB).toBeVisible()
  await expect(rowB.locator('.lib-r-id')).toHaveText('002')
  await expect(rowB.locator('.lib-r-year')).toHaveText('—')
  await expect(rowB.locator('.lib-r-cite')).toHaveText('—')

  // —— 点击甲行：规格表抽屉出场（四格指标真实文本+键值行+选中态类）——
  await rowA.click()
  await expect(rowA).toHaveClass(/sel/)
  const drawer = win.locator('.lib-drawer')
  await expect(drawer).toBeVisible()
  const metrics = drawer.locator('.lib-dr-metrics')
  await expect(metrics).toBeVisible()
  await expect(metrics.getByText('引用', { exact: true })).toBeVisible()
  await expect(metrics.locator('.lib-dr-v.acc')).toHaveText('17')
  await expect(metrics.getByText('通读', { exact: true })).toBeVisible()
  await expect(metrics.getByText('标注', { exact: true })).toBeVisible()
  await expect(metrics.getByText('笔记', { exact: true })).toBeVisible()
  // 头区：短号+入库状态点（pending=「待增强」）
  await expect(drawer.locator('.lib-dr-id')).toContainText('e2e-t3p3')
  await expect(drawer.locator('.lib-dr-id')).toContainText('待增强')
  // 键值行：VENUE 真实文本；关联节已退役（无脉络行/AI 评估行——F-LIBUI-01 ⑤）
  await expect(drawer.locator('.lib-fld', { hasText: 'VENUE' })).toContainText('Nature Water')
  await expect(drawer.locator('.lib-dr-sec')).toHaveText('标 签')
  await expect(drawer.locator('.lib-postpone')).toHaveCount(0)

  // —— F-LIBUI-01 ⑥ 动作区两列 grid（真 Chromium 计算样式锚——⑤h③）——
  // primary 首行跨两列（宽≈容器内容宽）；ghost 半行宽
  const gridInfo = await win.evaluate(() => {
    const actions = document.querySelector('.lib-dr-actions')!
    const acs = getComputedStyle(actions)
    const primary = actions.querySelector('.lib-dr-btn-primary') as HTMLElement
    const ghost = actions.querySelector('.lib-dr-btn-ghost') as HTMLElement
    return {
      display: acs.display,
      tracks: acs.gridTemplateColumns.split(' ').filter((t) => t !== '').length,
      actionsWidth: actions.getBoundingClientRect().width,
      primaryWidth: primary.getBoundingClientRect().width,
      ghostWidth: ghost.getBoundingClientRect().width
    }
  })
  expect(gridInfo.display, 'grid 双轨（flex-wrap 退役）').toBe('grid')
  expect(gridInfo.tracks, '两条等宽轨道').toBe(2)
  expect(gridInfo.primaryWidth, 'primary 跨两列首行').toBeGreaterThan(gridInfo.actionsWidth * 0.85)
  expect(gridInfo.ghostWidth, 'ghost 半行宽（双轨对照锚）').toBeLessThan(gridInfo.actionsWidth * 0.6)

  await app.close()
})
