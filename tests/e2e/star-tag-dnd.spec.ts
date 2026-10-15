import { test, expect, type Page } from '@playwright/test'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { bootstrapMigrations, launch, seedPaperRow } from './e2e-env'

/**
 * [F-DBCAMP-01 DB-4 / F-STAR-01+F-TAGS-02⑥] DB-4 点亮面 e2e：
 * ①库行星标（行首星标钮交互+setStarred 落库+on 高亮——P-9 退出条件）；
 * ②菜单星标（右键行菜单「星标/取消星标」toggle 项——P-10 退出条件）；
 * ③DnD 打标（TagDropdownRow 拖源→PaperRow drop 面：attach 落库+行 tagNames
 * 徽标刷新——B 面）。
 * 合成拖拽=DragEvent+DataTransfer（library-explorer.spec 同型先例；MIME 字面
 * 与 src/renderer/shared/tag-dnd.ts 单源对齐——e2e 面禁 import src 实现细节）；
 * 断言锚=真实渲染文本/类+window.api 读库回对。
 */

interface SummaryFace {
  id: string
  isStarred: boolean
  tagNames: string[]
}

const summaryOf = (win: Page, paperId: string): Promise<SummaryFace | null> =>
  win.evaluate(async (pid: string) => {
    const r = await window.api.library.list({ sort: 'added_desc', limit: 50 })
    if (!r.ok) return null
    const hit = (r.data.items as SummaryFace[]).find((p) => p.id === pid)
    return hit ?? null
  }, paperId)

async function setupLib(title: string): Promise<{ app: Awaited<ReturnType<typeof launch>>; userData: string }> {
  const userData = await mkdtemp(join(tmpdir(), 'synapse-db4-star-'))
  await bootstrapMigrations(userData)
  const sha = 'd'.repeat(64)
  await seedPaperRow(userData, `${sha.slice(0, 2)}/${sha.slice(2, 4)}/${sha}.pdf`, sha, title, 'e2e-db4-a')
  const app = await launch(userData)
  const win = await app.firstWindow()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
  return { app, userData }
}

test('库行星标：行首星标钮 toggle+落库+on 高亮（P-9 退出条件）', async () => {
  const { app } = await setupLib('星标甲文献')
  const win = await app.firstWindow()
  const row = win.locator('.lib-row', { hasText: '星标甲文献' })
  await expect(row).toBeVisible({ timeout: 10_000 })
  const star = row.locator('.lib-r-star')
  await expect(star).toHaveAttribute('title', '星标')
  await star.click()
  await expect(star).toHaveClass(/on/)
  await expect(star).toHaveAttribute('title', '取消星标')
  expect(await summaryOf(win, 'e2e-db4-a')).toMatchObject({ isStarred: true })
  // 反向：取消星标
  await star.click()
  await expect(star).not.toHaveClass(/on/)
  expect(await summaryOf(win, 'e2e-db4-a')).toMatchObject({ isStarred: false })
  await app.close()
})

test('菜单星标：右键行→「星标」项 toggle 落库（P-10 退出条件）', async () => {
  const { app } = await setupLib('星标乙文献')
  const win = await app.firstWindow()
  const row = win.locator('.lib-row', { hasText: '星标乙文献' })
  await expect(row).toBeVisible({ timeout: 10_000 })
  await row.click({ button: 'right' })
  const menu = win.getByTestId('paper-row-menu')
  await expect(menu).toBeVisible()
  await menu.getByRole('menuitem', { name: '星标', exact: true }).click()
  await expect(menu).toBeHidden()
  expect(await summaryOf(win, 'e2e-db4-a')).toMatchObject({ isStarred: true })
  // 再开菜单=「取消星标」文案（本地态回读经 loadLibrary 后行数据刷新）
  await win.locator('.lib-row', { hasText: '星标乙文献' }).click({ button: 'right' })
  await win.getByTestId('paper-row-menu').getByRole('menuitem', { name: '取消星标' }).click()
  expect(await summaryOf(win, 'e2e-db4-a')).toMatchObject({ isStarred: false })
  await app.close()
})

test('DnD 打标：标签下拉行拖到文献行→attach 落库+行徽标刷新（B 面）', async () => {
  const { app } = await setupLib('打标丙文献')
  const win = await app.firstWindow()
  const row = win.locator('.lib-row', { hasText: '打标丙文献' })
  await expect(row).toBeVisible({ timeout: 10_000 })

  // setup：经详情面板 UI 建标签「拖拽打标」并挂到该文献（标签域种子——建后
  // 摘除以铺平 DnD 主断言面：DnD 打标=再挂回）。tags.store 桶刷新时序=挂载
  // 面（TagEditor/Dropdown mount）——页载后建的标签需重挂载才入下拉（既有
  // 刷新时序面，非本批行为）：reload 一次后开面板
  await row.getByText('打标丙文献').click()
  const tagInput = win.getByLabel('新增标签')
  await tagInput.fill('拖拽打标')
  await tagInput.press('Enter')
  await expect(win.getByLabel('移除标签 拖拽打标')).toBeVisible({ timeout: 10_000 })
  await win.getByLabel('移除标签 拖拽打标').click()
  await expect(win.getByLabel('移除标签 拖拽打标')).toBeHidden({ timeout: 10_000 })
  await win.reload()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
  await expect(win.locator('.lib-row', { hasText: '打标丙文献' })).toBeVisible({ timeout: 10_000 })

  // 拖源：标签下拉行 dragstart（真实 handler 设双 MIME）——.lib-dd-btn=筛选
  // 下拉钮（class 锚避开「移除标签 ×」等 aria 命中歧义）
  await win.locator('.lib-dd-btn').click()
  const ddRow = win.locator('.lib-dd-row', { hasText: '拖拽打标' })
  await expect(ddRow).toBeVisible({ timeout: 10_000 })
  const tagInfo = await win.evaluate(async () => {
    const r = await window.api.tags.list({ folderId: '__main__' })
    if (!r.ok) return null
    const hit = (r.data as Array<{ id: string; name: string }>)[0]
    return hit ?? null
  })
  expect(tagInfo?.id ?? '').not.toBe('')
  await ddRow.evaluate((el) => {
    const dt = new DataTransfer()
    el.dispatchEvent(new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer: dt }))
  })
  // 落点：dragover 高亮 → drop
  await row.evaluate(
    (el, payload: { id: string }) => {
      const dt = new DataTransfer()
      dt.setData('application/x-synapse-tag', payload.id)
      dt.setData('application/x-synapse-tag-folder', '__main__')
      el.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt }))
      el.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }))
    },
    { id: tagInfo!.id }
  )
  // 落定：行 tagNames 徽标在场（library load 刷新链）+落库回对
  await expect(row.locator('.lib-t-mini', { hasText: '拖拽打标' })).toBeVisible({ timeout: 10_000 })
  const s = await summaryOf(win, 'e2e-db4-a')
  expect(s?.tagNames).toContain('拖拽打标')
  await app.close()
})
