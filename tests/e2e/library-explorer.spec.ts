import { test, expect, type Page } from '@playwright/test'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { bootstrapMigrations, launch, seedLineageGraph, seedPaperRow } from './e2e-env'

/**
 * [F-UIRES-01 批 A→批 B] 库页资源管理器形态 e2e —— §3.9 锚清单补幕（每幕≥2
 * 真实文本/aria 锚）：
 * - S1：左栏「全部文献/未归档」导航行文本+选中行 aria-current；
 * - S4：drop 徽标文本「移入」+导入条「导入到：〈名〉」（合成内部拖拽经
 *   dispatchEvent——HTML5 DnD 手势 e2e 不可原生模拟，合成事件驱动 React
 *   合成 onDragStart/onDragOver/onDrop 同链）；
 * - S5a：行右键菜单「在阅读器中打开/移动到文件夹/删除文献」三项版（批 B
 *   删除项点亮；星标项 DB 窗口点亮不渲染）+子面移动执行；
 * - S5b（批 B）：删除两分支——保护弹窗三要素（「删除文献？」+「同时移除其
 *   节点与全部连线」+图名+连线数）/静默直删（无 Dialog）；
 * - S6：未归档空态句+归档双通道句。
 */

const PAPERS = [
  { id: 'e2e-uix-a', title: '资源管理器甲文献', sha: 'a'.repeat(64) },
  { id: 'e2e-uix-b', title: '资源管理器乙文献', sha: 'b'.repeat(64) }
] as const

const navRow = (win: Page, name: string) => win.locator('.lib-fn-row').filter({ hasText: name })

test('S1：左栏三态导航行+aria-current 选中锚+主图行零特判', async () => {
  const userData = await mkdtemp(join(tmpdir(), 'synapse-uix-s1-'))
  await bootstrapMigrations(userData)
  for (const p of PAPERS) {
    await seedPaperRow(userData, 'a.pdf', p.sha, p.title, p.id)
  }
  const app = await launch(userData)
  const win = await app.firstWindow()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })

  // 默认态：全部文献行选中（aria-current 锚——S1）
  await expect(navRow(win, '全部文献')).toBeVisible({ timeout: 10_000 })
  await expect(navRow(win, '未归档')).toBeVisible()
  await expect(navRow(win, '主图')).toBeVisible() // folders.list 如实渲染（零特判）
  await expect(navRow(win, '全部文献')).toHaveAttribute('aria-current', 'true')
  await expect(navRow(win, '未归档')).not.toHaveAttribute('aria-current', 'true')

  // 切未归档：选中态迁移（aria-current 随 folderScope）
  await navRow(win, '未归档').click()
  await expect(navRow(win, '未归档')).toHaveAttribute('aria-current', 'true')
  await expect(navRow(win, '全部文献')).not.toHaveAttribute('aria-current', 'true')

  await app.close()
})

test('S4：行拖入左栏文件夹=drop「移入」徽标+moveFolder 执行（合成内部拖拽）', async () => {
  const userData = await mkdtemp(join(tmpdir(), 'synapse-uix-s4-'))
  await bootstrapMigrations(userData)
  for (const p of PAPERS) {
    await seedPaperRow(userData, 'a.pdf', p.sha, p.title, p.id)
  }
  const app = await launch(userData)
  const win = await app.firstWindow()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })

  // 建目标文件夹（拖放落点）
  await win.getByRole('button', { name: '+ 新建文件夹' }).click()
  await win.getByLabel('新文件夹名').fill('拖放目标夹')
  await win.getByLabel('新文件夹名').press('Enter')
  await expect(navRow(win, '拖放目标夹')).toBeVisible({ timeout: 10_000 })

  // 合成内部拖拽：行 dragstart（自定义 MIME 载荷）→目标行 dragover（高亮+「移入
  // ↩」徽标——S4 锚）→drop（moveFolder+列表重载）
  const row = win.locator('.lib-row', { hasText: '资源管理器甲文献' })
  await expect(row).toBeVisible({ timeout: 10_000 })
  await row.evaluate((el) => {
    const dt = new DataTransfer()
    el.dispatchEvent(new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer: dt }))
  })
  const target = navRow(win, '拖放目标夹')
  await target.evaluate((el) => {
    const dt = new DataTransfer()
    dt.setData('application/x-synapse-paper', 'e2e-uix-a')
    el.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt }))
  })
  await expect(target).toHaveClass(/drop/)
  await expect(target).toContainText('移入')
  await target.evaluate((el) => {
    const dt = new DataTransfer()
    dt.setData('application/x-synapse-paper', 'e2e-uix-a')
    el.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }))
  })

  // moveFolder 落定：目标夹计数 0→1+未归档态行不可见（归档完成——folders.
  // changed 双失效刷新）
  await expect(navRow(win, '拖放目标夹')).toContainText('1', { timeout: 10_000 })
  await navRow(win, '拖放目标夹').click()
  await expect(win.locator('.lib-row', { hasText: '资源管理器甲文献' })).toBeVisible({
    timeout: 10_000
  })

  // 导入条「导入到：拖放目标夹」（S4 锚第二文本——folder 态目标恒定）
  await expect(win.locator('.lib-import-target')).toContainText('导入到：')
  await expect(win.locator('.lib-import-target')).toContainText('拖放目标夹')

  await app.close()
})

test('S5a：行右键菜单三项版（删除项批 B 点亮+星标项不渲染）+移动子面执行', async () => {
  const userData = await mkdtemp(join(tmpdir(), 'synapse-uix-s5a-'))
  await bootstrapMigrations(userData)
  for (const p of PAPERS) {
    await seedPaperRow(userData, 'a.pdf', p.sha, p.title, p.id)
  }
  const app = await launch(userData)
  const win = await app.firstWindow()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })

  await win.getByRole('button', { name: '+ 新建文件夹' }).click()
  await win.getByLabel('新文件夹名').fill('菜单移动夹')
  await win.getByLabel('新文件夹名').press('Enter')
  await expect(navRow(win, '菜单移动夹')).toBeVisible({ timeout: 10_000 })

  const row = win.locator('.lib-row', { hasText: '资源管理器甲文献' })
  await expect(row).toBeVisible({ timeout: 10_000 })
  await row.click({ button: 'right' })
  const menu = win.getByTestId('paper-row-menu')
  await expect(menu).toBeVisible()
  // 三项版（S5a 锚——批 B 删除项点亮；星标项 DB 窗口点亮，不渲染）
  await expect(menu.getByRole('menuitem', { name: '在阅读器中打开' })).toBeVisible()
  await expect(menu.getByRole('menuitem', { name: '移动到文件夹' })).toBeVisible()
  await expect(menu.getByRole('menuitem', { name: '删除文献' })).toBeVisible()
  await expect(menu.getByRole('menuitem', { name: '星标' })).toHaveCount(0)
  // 命中行=按下即高亮
  await expect(row).toHaveClass(/hit/)

  // 移动子面：folders.list+未归档移出（点目标夹执行 moveFolder）
  await menu.getByRole('menuitem', { name: '移动到文件夹' }).click()
  const sub = win.getByTestId('paper-move-sub')
  await expect(sub).toBeVisible({ timeout: 10_000 })
  await expect(sub.getByRole('menuitem', { name: '菜单移动夹' })).toBeVisible()
  await expect(sub.getByRole('menuitem', { name: '未归档（移出）' })).toBeVisible()
  await sub.getByRole('menuitem', { name: '菜单移动夹' }).click()
  await expect(navRow(win, '菜单移动夹')).toContainText('1', { timeout: 10_000 })

  await app.close()
})

test('S5b-1：删除文献保护分支——有连线弹窗三要素+确认级联（行消失+夹计数减）', async () => {
  const userData = await mkdtemp(join(tmpdir(), 'synapse-uix-s5b1-'))
  await bootstrapMigrations(userData)
  await seedPaperRow(userData, 'a.pdf', 'd'.repeat(64), '保护分支文献', 'e2e-uix-d')
  await seedPaperRow(userData, 'a.pdf', 'e'.repeat(64), '保护邻接文献', 'e2e-uix-e')
  // 夹+两文献节点+一边（seedLineageGraph 同步归夹——INV-88 入图即归档镜像）
  await seedLineageGraph(userData, {
    folders: [{ id: 'f-s5b', name: '删除保护夹' }],
    nodes: [
      { paperId: 'e2e-uix-d', title: '保护分支文献', year: 2024, folderId: 'f-s5b' },
      { paperId: 'e2e-uix-e', title: '保护邻接文献', year: 2024, folderId: 'f-s5b' }
    ],
    edges: [{ from: 'e2e-uix-e', to: 'e2e-uix-d', label: '引证' }]
  })
  const app = await launch(userData)
  const win = await app.firstWindow()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })

  // 夹计数 2（两文献已归夹；[RR1-4] 计数锚=对 mono 计数格 .lib-fn-ct 精确
  // toHaveText——行定位=hasText 全文锚，禁在 filter has 内引行外根链）
  await expect(navRow(win, '删除保护夹').locator('.lib-fn-ct')).toHaveText('2', { timeout: 10_000 })
  const row = win.locator('.lib-row', { hasText: '保护分支文献' })
  await expect(row).toBeVisible({ timeout: 10_000 })

  // 右键→删除文献→保护弹窗（edgeCount>0——§2.4 预检分流）
  await row.click({ button: 'right' })
  await win.getByTestId('paper-row-menu').getByRole('menuitem', { name: '删除文献' }).click()
  const dialog = win.locator('[role="dialog"]')
  await expect(dialog).toBeVisible({ timeout: 10_000 })
  // S5b 三要素（§3.9 锚逐字）：标题+连带句+图名+连线数（[RR1-4] 整句锚防裸数字误配）
  await expect(dialog).toContainText('删除文献？')
  await expect(dialog).toContainText('同时移除其节点与全部连线')
  await expect(dialog).toContainText('删除保护夹')
  await expect(dialog).toContainText('有 1 条连线')

  // 确认→级联删（行消失+夹计数 2→1——folders.changed 双播）
  await dialog.getByRole('button', { name: '删除文献' }).click()
  await expect(win.locator('.lib-row', { hasText: '保护分支文献' })).toHaveCount(0, {
    timeout: 10_000
  })
  await expect(navRow(win, '删除保护夹').locator('.lib-fn-ct')).toHaveText('1', { timeout: 10_000 })
  // 邻接文献不受影响（行在场）
  await expect(win.locator('.lib-row', { hasText: '保护邻接文献' })).toBeVisible()

  await app.close()
})

test('S5b-2：删除文献静默分支——无节点直删（无 Dialog 行消失）', async () => {
  const userData = await mkdtemp(join(tmpdir(), 'synapse-uix-s5b2-'))
  await bootstrapMigrations(userData)
  await seedPaperRow(userData, 'a.pdf', 'f'.repeat(64), '静默分支文献', 'e2e-uix-f')
  const app = await launch(userData)
  const win = await app.firstWindow()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })

  const row = win.locator('.lib-row', { hasText: '静默分支文献' })
  await expect(row).toBeVisible({ timeout: 10_000 })

  // 右键→删除文献→静默直删（无节点——F-DELCONF C5 判据，零弹窗）
  await row.click({ button: 'right' })
  await win.getByTestId('paper-row-menu').getByRole('menuitem', { name: '删除文献' }).click()
  await expect(win.locator('.lib-row', { hasText: '静默分支文献' })).toHaveCount(0, {
    timeout: 10_000
  })
  await expect(win.locator('[role="dialog"]')).toHaveCount(0)

  await app.close()
})

test('S6：未归档空态=空态句+归档双通道句（§3.9 锚逐字）', async () => {
  const userData = await mkdtemp(join(tmpdir(), 'synapse-uix-s6-'))
  await bootstrapMigrations(userData)
  await seedPaperRow(userData, 'a.pdf', 'c'.repeat(64), '已归档文献', 'e2e-uix-c')
  const app = await launch(userData)
  const win = await app.firstWindow()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })

  // [RR1-15/e2e F5] 种子归夹（folders.create+papers.moveFolder 经真实 api）——
  // 种子未归夹则未归档列表非空、S6 空态不渲染
  await win.evaluate(async (pid: string) => {
    const r = await window.api.folders.create({ name: 'S6 归档夹' })
    if (r.ok) {
      await window.api.papers.moveFolder({ paperId: pid, toFolderId: r.data.id })
    }
  }, 'e2e-uix-c')

  // 未归档态+空列表：S6 两句真文本（归档双通道提示）
  await navRow(win, '未归档').click()
  await expect(win.getByText('未归档文献将出现在这里')).toBeVisible({ timeout: 10_000 })
  await expect(
    win.getByText('归档方式：拖拽文献行至左侧文件夹，或右键文献行『移动到文件夹』')
  ).toBeVisible()

  await app.close()
})
