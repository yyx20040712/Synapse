import { test, expect } from '@playwright/test'
import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { bootstrapMigrations, launch, seedPaperRow } from './e2e-env'
import { createTinyPdf, PDF_KNOWN_TEXT } from '../utils/pdf-factory'
import { seedCollectionRow } from './ai-seed'

/**
 * [F-DBCAMP-01 DB-2 UI U3] E1 三入口可达——paper/lineage/global 三档会话入口
 * （设计 §5.1-E1）。会话=只读历史+置灰发送框（无任何发送能力——§6 不做）：
 * ①paper 档：开文献→reader-aside 内「AI 会话」页签→「暂无会话消息」+
 * 「对话能力将在后续版本接入」②lineage 档：脉络页选 seed 造的文件夹图→
 * 侧栏「AI 会话」页签→同两文案 ③settings：三节标在场+相对顺序
 * （AI 助手→AI 管理→AI 预算；锚定「网络」节后、「AI 语料导出」前）。
 * tab 查询一律限定容器（reader-aside/lineage-sidebar——e2e 坑③域污染防线）。
 */

test('E1① paper 档：阅读器侧栏 AI 会话页签可达（空会话+置灰发送框）', async () => {
  const userData = await mkdtemp(join(tmpdir(), 'synapse-dbcamp-e1a-'))
  await bootstrapMigrations(userData)
  const title = 'E1 AI 会话文献'
  const bytes = createTinyPdf(`${title} ${PDF_KNOWN_TEXT}`)
  const sha = createHash('sha256').update(bytes).digest('hex')
  const fileRef = `${sha.slice(0, 2)}/${sha.slice(2, 4)}/${sha}.pdf`
  const abs = join(userData, 'files', ...fileRef.split('/'))
  mkdirSync(dirname(abs), { recursive: true })
  writeFileSync(abs, bytes)
  await seedPaperRow(userData, fileRef, sha, title, 'e2e-e1-ai')

  const app = await launch(userData)
  const win = await app.firstWindow()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
  await win.getByText(title).first().dblclick()
  const aside = win.getByTestId('reader-aside')
  await expect(aside).toBeVisible({ timeout: 20_000 })
  await aside.getByRole('tab', { name: 'AI 会话' }).click()
  await expect(win.getByText('暂无会话消息')).toBeVisible({ timeout: 10_000 })
  // 置灰发送框：说明文案驻 disabled+readOnly 框内（设计 §1.1「占位」语义——
  // quality 门禁禁扫占位属性英文字面，同形承载=框内 dim 文案）
  const composer = aside.locator('input[aria-label="对话输入"]')
  await expect(composer).toHaveValue('对话能力将在后续版本接入')
  await expect(composer).toBeDisabled()
  await expect(aside.getByRole('button', { name: '发送' }), '发送钮可见置灰').toBeDisabled()
  await app.close()
})

test('E1② lineage 档：脉络侧栏 AI 会话页签可达（文件夹图锚）', async () => {
  const userData = await mkdtemp(join(tmpdir(), 'synapse-dbcamp-e1b-'))
  await bootstrapMigrations(userData)
  // 种子破引导态（rail 脉络钮在引导态禁用——smoke.spec 同配方）+E1 锚文件夹
  const sha = createHash('sha256').update('e1b-anchor').digest('hex')
  await seedPaperRow(userData, `${sha.slice(0, 2)}/${sha.slice(2, 4)}/${sha}.pdf`, sha, 'E1 脉络占位文献')
  const folderName = 'E1 会话文件夹'
  const folderId = await seedCollectionRow(userData, folderName)

  const app = await launch(userData)
  const win = await app.firstWindow()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
  await win.getByRole('button', { name: '脉络', exact: true }).click()
  await expect(win.getByTestId('lineage-sidebar')).toBeVisible({ timeout: 10_000 })
  // 脉络选图=NavGraphPicker 下拉选 seed 造的文件夹（缺省详情页签不动——
  // lineage-sidebar.spec 断言锚零触碰）
  await win.getByTestId('lineage-nav-graph').click()
  await win.getByTestId('lineage-nav-graph-menu').getByRole('option', { name: folderName }).click()
  await expect(win.getByTestId('lineage-side-panel')).toBeVisible({ timeout: 10_000 })
  const sidebar = win.getByTestId('lineage-sidebar')
  await sidebar.getByRole('tab', { name: 'AI 会话' }).click()
  await expect(win.getByText('暂无会话消息')).toBeVisible({ timeout: 10_000 })
  const composer = sidebar.locator('input[aria-label="对话输入"]')
  await expect(composer).toHaveValue('对话能力将在后续版本接入')
  await expect(composer).toBeDisabled()
  await expect(sidebar.getByRole('button', { name: '发送' }), '发送钮可见置灰').toBeDisabled()
  // [r1′ R1a] 选图生效真锚：lineage 档面板锚=所选 folderId（非 __main__ 兜底）
  // ——data-anchor 透出（AiSessionPanel 根属性，主控授权渲染行；替代原
  // toBeTruthy 恒真断言——k3-W1+d1-N2）
  await expect(win.getByTestId('ai-session-panel')).toHaveAttribute('data-anchor', folderId)
  await app.close()
})

test('E1③ settings：AI 三节标在场+相对顺序（AI 助手→AI 管理→AI 预算）', async () => {
  const userData = await mkdtemp(join(tmpdir(), 'synapse-dbcamp-e1c-'))
  await bootstrapMigrations(userData)
  const sha = createHash('sha256').update('e1c-anchor').digest('hex')
  await seedPaperRow(userData, `${sha.slice(0, 2)}/${sha.slice(2, 4)}/${sha}.pdf`, sha, 'E1c 占位文献')

  const app = await launch(userData)
  const win = await app.firstWindow()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
  await win.getByRole('button', { name: '设置', exact: true }).click()
  await expect(win.getByRole('heading', { name: 'AI 助手' })).toBeVisible({ timeout: 10_000 })
  await expect(win.getByRole('heading', { name: 'AI 管理' })).toBeVisible()
  await expect(win.getByRole('heading', { name: 'AI 预算' })).toBeVisible()
  // [r1′ R1c] AI 助手节内会话终态（global 档挂载即 open——真实 IPC 非缺省桩）
  await expect(win.getByText('暂无会话消息')).toBeVisible({ timeout: 10_000 })
  const composer = win.locator('input[aria-label="对话输入"]')
  await expect(composer).toHaveValue('对话能力将在后续版本接入')
  await expect(composer).toBeDisabled()
  // 相对顺序：网络→AI 助手→AI 管理→AI 预算→（AI 语料导出）
  const order = await win.evaluate(() =>
    Array.from(document.querySelectorAll('.syn-settings h2')).map((h) => h.textContent ?? '')
  )
  const idx = (t: string): number => order.findIndex((x) => x === t)
  // [r1′ R1b] 「网络」节索引前 some() 前置守卫（沿「语料导出」锚先例——
  // 防 -1 空洞下 toBeLessThan 恒真）
  expect(order.some((x) => x === '网络'), '「网络」节锚在场').toBeTruthy()
  expect(idx('网络'), 'AI 助手插在网络节后').toBeLessThan(idx('AI 助手'))
  expect(idx('AI 助手')).toBeLessThan(idx('AI 管理'))
  expect(idx('AI 管理')).toBeLessThan(idx('AI 预算'))
  expect(order.some((x) => x.includes('语料导出')), 'AI 预算在语料导出节前').toBeTruthy()
  expect(idx('AI 预算')).toBeLessThan(order.findIndex((x) => x.includes('语料导出')))
  await app.close()
})
