import { test, expect, type Page } from '@playwright/test'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { bootstrapMigrations, launch, seedPaperRow } from './e2e-env'

/**
 * [F-FOLDER-02·D/F] meta-year-month e2e —— 元数据编辑全链（MetaEditDialog
 * month/IF 扩字段+onSaved 失效重取=F-LIBUI-01 备案缺口修）：
 * ①改 year+month → 节点排序键更新（脉络时间线年份分组重排）；
 * ②pubNo 库级重派生（INV-92——year 变更后全序重排，详情面板 ·N 徽标变值——F-UIRES-03 B4①）；
 * ③改题名 → 库表格即时跟随（onSaved→library.list 失效重取——滞旧缺陷根治）。
 * 断言锚真实渲染文本。
 */

const P1 = { id: 'e2e-meta-1', title: '排序论文甲', year: 2023 } as const
const P2 = { id: 'e2e-meta-2', title: '排序论文乙', year: 2021 } as const

const nodeCard = (win: Page, title: string) =>
  win.locator('.tl-card[data-node-id]').filter({ hasText: title })

test('改 year/month→节点排序键更新+pubNo 重派生+表格不滞旧', async () => {
  const userData = await mkdtemp(join(tmpdir(), 'synapse-ff02-meta-'))
  await bootstrapMigrations(userData)
  await seedPaperRow(userData, 'a.pdf', `sha-${P1.id}`, P1.title, P1.id, { year: P1.year })
  await seedPaperRow(userData, 'a.pdf', `sha-${P2.id}`, P2.title, P2.id, { year: P2.year })
  const app = await launch(userData)
  const win = await app.firstWindow()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })

  // 两篇入图（[F-ALIGN-01] upsert-node 通道退役→moveFolder 产品路径：移入
  // 主图=无节点分支自动建节点〔节点排序键初值=文献 year 2021/2023——INV-88
  // 移动路〕；节点唯一来源=入库/移动两路 INV-NEW-1）
  for (const p of [P1, P2]) {
    expect(
      await win.evaluate(
        async (arg: { id: string }) =>
          (await window.api.papers.moveFolder({ paperId: arg.id, toFolderId: '__main__' })).ok,
        p
      )
    ).toBe(true)
  }

  // 选中 P1：详情面板 pubNo 徽章=·002（库级全序：乙 2021 在前；F-UIRES-03 B4① #→·）
  await win.getByText(P1.title).first().click()
  const idBadge = win.locator('.lib-dr-id span').first()
  await expect(idBadge).toHaveText('·002', { timeout: 10_000 })

  // 编辑元数据：year 2023→2020+month=5+题名改写（月份扩字段+F-LIBUI-01 缺口面）
  await win.getByRole('button', { name: '编辑元数据' }).click()
  const dialog = win.getByRole('dialog')
  await dialog.locator('label', { hasText: '标题' }).locator('input').fill('排序论文甲（改）')
  await dialog.locator('label', { hasText: '年份' }).locator('input').fill('2020')
  await dialog.locator('label', { hasText: '月份' }).locator('input').fill('5')
  await dialog.getByRole('button', { name: '保存' }).click()
  await expect(dialog).toHaveCount(0, { timeout: 10_000 })

  // ②pubNo 库级重派生：P1（2020）跃居 ·001（乙 2021 顺延 ·002）
  await expect(idBadge).toHaveText('·001', { timeout: 10_000 })
  // 节点排序键更新：YEAR-MO 行携带脉络框 2020-05（month 扩字段落节点；B4② 新格式）
  const yearMo = win.locator('.lib-fld').filter({ hasText: 'YEAR-MO' })
  await expect(yearMo).toContainText('2020（脉络框：2020-05）')

  // ③表格不滞旧：onSaved→library.list 失效重取——新题名行无需手刷即在场
  // （锚列表行 .lib-r-title——详情面板 h2 同名属正常双现，收敛单元素）
  await expect(
    win.locator('.lib-r-title').filter({ hasText: '排序论文甲（改）' })
  ).toBeVisible({ timeout: 10_000 })

  // ①节点排序键（脉络面）：时间线年份分组重排——2020 年组头在场+卡片随组
  // （节点 title=独立列不随 papers.title 同步——票 1 设计仅同步排序键，锚原题名）
  await win.getByRole('button', { name: '脉络', exact: true }).click()
  await expect(nodeCard(win, '排序论文甲')).toBeVisible({ timeout: 10_000 })
  await expect(win.locator('.tl-year-num').first()).toHaveText('2020')

  await app.close()
})
