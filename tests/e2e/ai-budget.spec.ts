import { test, expect, type Page } from '@playwright/test'
import { createHash } from 'node:crypto'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { bootstrapMigrations, launch, seedPaperRow } from './e2e-env'

/**
 * [F-DBCAMP-01 DB-2 UI U6] E4 预算持久化与校验（设计 §5.1-E4 逐字）：
 * 「于下次对话生效」文案在节；paper 上限 8000→9000→保存→reload（settings.get
 * 挂载回读）→9000；L1=9000（l1+l2Cap+tail=12200>9000 cap）→行内错误+保存
 * 禁用；负数/清空→行内错误；恢复默认→paper cap 回 8000。
 * 保存=set 通道全量落盘（INV-39 全量携带——BudgetSection 组件面已单测锚定，
 * 此处走真实 IPC settings.set→settings.json→reload 回读全链）。
 */

async function openBudgetSection(win: Page): Promise<Page> {
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
  await win.getByRole('button', { name: '设置', exact: true }).click()
  await expect(win.getByRole('heading', { name: 'AI 预算' })).toBeVisible({ timeout: 10_000 })
  await expect(win.getByTestId('ai-budget-section')).toBeVisible()
  return win
}

test('E4 预算节：持久化+校验+恢复默认（真实 settings.set 落盘回读）', async () => {
  const userData = await mkdtemp(join(tmpdir(), 'synapse-dbcamp-e4-'))
  await bootstrapMigrations(userData)
  // 破引导态占位行（rail 设置钮引导态禁用——smoke 同配方）
  const sha = createHash('sha256').update('e4-anchor').digest('hex')
  await seedPaperRow(userData, `${sha.slice(0, 2)}/${sha.slice(2, 4)}/${sha}.pdf`, sha, 'E4 占位文献', 'e2e-e4-anchor')

  const app = await launch(userData)
  const win = await app.firstWindow()
  await openBudgetSection(win)
  const section = win.getByTestId('ai-budget-section')

  // 固定文案（§1.5 逐字）
  await expect(section.getByText('于下次对话生效')).toBeVisible()

  // 默认值投影（§9 表）
  const capInput = section.locator('input[aria-label="文献档 上限"]')
  await expect(capInput).toHaveValue('8000')

  // 8000→9000→保存→reload→9000（settings.get 挂载回读）
  await capInput.fill('9000')
  await section.getByRole('button', { name: '保存预算' }).click()
  await expect(section.getByText('已保存')).toBeVisible({ timeout: 10_000 })
  await win.reload()
  await openBudgetSection(win)
  await expect(win.getByTestId('ai-budget-section').locator('input[aria-label="文献档 上限"]')).toHaveValue('9000', { timeout: 10_000 })

  // L1=9000→12200>9000（cap 已 9000）→行内错误+保存禁用
  const l1Input = win.getByTestId('ai-budget-section').locator('input[aria-label="文献档 L1 上限"]')
  await l1Input.fill('9000')
  await expect(win.getByTestId('ai-budget-section').getByText('预算档内合计超上限')).toBeVisible()
  await expect(win.getByTestId('ai-budget-section').getByRole('button', { name: '保存预算' })).toBeDisabled()

  // 负数→行内错误（整数≥0）
  await l1Input.fill('-1')
  await expect(win.getByTestId('ai-budget-section').getByText('需为非负整数').first()).toBeVisible()
  await expect(win.getByTestId('ai-budget-section').getByRole('button', { name: '保存预算' })).toBeDisabled()

  // 清空→行内错误
  await l1Input.fill('')
  await expect(win.getByTestId('ai-budget-section').getByText('需为非负整数').first()).toBeVisible()
  await expect(win.getByTestId('ai-budget-section').getByRole('button', { name: '保存预算' })).toBeDisabled()

  // 恢复默认→paper cap 回 8000（E4 逐字断言锚）
  await win.getByTestId('ai-budget-section').getByRole('button', { name: '恢复默认' }).click()
  await expect(win.getByTestId('ai-budget-section').locator('input[aria-label="文献档 上限"]')).toHaveValue('8000')
  await app.close()
})
