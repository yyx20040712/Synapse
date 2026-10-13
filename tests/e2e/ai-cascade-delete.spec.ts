import { test, expect, type Page } from '@playwright/test'
import { createHash } from 'node:crypto'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { bootstrapMigrations, launch, seedPaperRow, seedLineageGraph } from './e2e-env'
import { seedAiSession, seedAiMessage, seedAiMemory, seedAiTask, seedAiAuditRow, readAiAuditCount } from './ai-seed'

/**
 * [F-DBCAMP-01 DB-2 UI U6] E5 级联两次确认（设计 §5.1-E5 三场景）：
 * 场景一 paper 弹窗路径——图边驱动第一窗+AI 资源四计数第二窗（取消中止/
 * 再双确认级联删+审计恒存 readAiAuditCount=2）；场景二零计数——有图边无 AI
 * 资源仅第一窗（第二窗负锚）；场景三 folder 删——paper 档与 lineage 档（锚=
 * collections.id）AI 资源各一套→第二窗断言双面合计→确认→两档资源俱灭（记忆
 * Tab 两档空态）+审计恒存。种子零新函数（ai-seed 函数面全在）。
 */

async function readyLibrary(win: Page): Promise<void> {
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
}

/** 占位文献行（破引导态——fake fileRef 不落 PDF 文件） */
async function seedGuidePaper(userData: string, id: string, title: string): Promise<void> {
  const sha = createHash('sha256').update(id).digest('hex')
  await seedPaperRow(userData, `${sha.slice(0, 2)}/${sha.slice(2, 4)}/${sha}.pdf`, sha, title, id)
}

test('E5 场景一 paper 删：第一窗→第二窗四计数+审计保留提示→取消中止→再双确认级联删+审计恒存', async () => {
  const userData = await mkdtemp(join(tmpdir(), 'synapse-dbcamp-e5a-'))
  await bootstrapMigrations(userData)
  // 两文献+一边（edgeCount=1→保护弹窗路径——第一窗前提）
  await seedGuidePaper(userData, 'e5a-target', 'E5 场景一文献')
  await seedGuidePaper(userData, 'e5a-neighbor', 'E5 场景一邻接')
  await seedLineageGraph(userData, {
    folders: [{ id: 'f-e5a', name: 'E5 场景一夹' }],
    nodes: [
      { paperId: 'e5a-target', title: 'E5 场景一文献', year: 2024, folderId: 'f-e5a' },
      { paperId: 'e5a-neighbor', title: 'E5 场景一邻接', year: 2024, folderId: 'f-e5a' }
    ],
    edges: [{ from: 'e5a-neighbor', to: 'e5a-target', label: '引证' }]
  })
  // AI 资源：1 会话/2 消息/1 记忆/1 任务+2 审计行
  const sessionId = await seedAiSession(userData, 'paper', 'e5a-target')
  await seedAiMessage(userData, sessionId, { role: 'user', content: 'E5 场景一消息甲' })
  await seedAiMessage(userData, sessionId, { role: 'assistant', content: 'E5 场景一消息乙' })
  await seedAiMemory(userData, {
    scope: 'paper', anchorId: 'e5a-target', category: 'method_note',
    title: 'E5 场景一记忆', content: '记忆内容'
  })
  const taskId = await seedAiTask(userData, 'paper', 'e5a-target', {
    action: 'memory.create', status: 'succeeded'
  })
  await seedAiAuditRow(userData, taskId, 0, 'submitted', '提交')
  await seedAiAuditRow(userData, taskId, 1, 'succeeded', '完成')

  const app = await launch(userData)
  const win = await app.firstWindow()
  await readyLibrary(win)
  const row = win.locator('.lib-row', { hasText: 'E5 场景一文献' })
  await expect(row).toBeVisible({ timeout: 10_000 })

  // 删→第一窗→确认→第二窗四计数+「审计记录将保留」→取消→整体中止
  await row.click({ button: 'right' })
  await win.getByTestId('paper-row-menu').getByRole('menuitem', { name: '删除文献' }).click()
  const firstDialog = win.locator('[role="dialog"]', { hasText: '删除文献？' })
  await expect(firstDialog).toBeVisible({ timeout: 10_000 })
  await firstDialog.getByRole('button', { name: '删除文献' }).click()
  const second = win.locator('[role="dialog"]', { hasText: '将同时删除' })
  await expect(second).toBeVisible({ timeout: 10_000 })
  await expect(second).toContainText('会话 1 个')
  await expect(second).toContainText('消息 2 条')
  await expect(second).toContainText('记忆 1 条')
  await expect(second).toContainText('任务 1 个')
  await expect(second).toContainText('审计记录将保留')
  await second.getByRole('button', { name: '取消', exact: true }).click()
  await expect(win.locator('[role="dialog"]')).toHaveCount(0)
  await expect(win.locator('.lib-row', { hasText: 'E5 场景一文献' }), '取消=对象保留').toBeVisible()

  // 消息仍在（取消后未级联——reader 侧栏 AI 会话页签真实回读）
  await win.locator('.lib-row', { hasText: 'E5 场景一文献' }).dblclick()
  const aside = win.getByTestId('reader-aside')
  await expect(aside).toBeVisible({ timeout: 20_000 })
  await aside.getByRole('tab', { name: 'AI 会话' }).click()
  await expect(win.getByText('E5 场景一消息甲')).toBeVisible({ timeout: 10_000 })
  await win.getByRole('button', { name: '文献库' }).click()
  await expect(win.locator('.lib-row', { hasText: 'E5 场景一文献' })).toBeVisible({ timeout: 10_000 })

  // 再双确认→文献删+审计恒存（readAiAuditCount=2——任务灭审计在）
  await win.locator('.lib-row', { hasText: 'E5 场景一文献' }).click({ button: 'right' })
  await win.getByTestId('paper-row-menu').getByRole('menuitem', { name: '删除文献' }).click()
  const firstAgain = win.locator('[role="dialog"]', { hasText: '删除文献？' })
  await expect(firstAgain).toBeVisible({ timeout: 10_000 })
  await firstAgain.getByRole('button', { name: '删除文献' }).click()
  const secondAgain = win.locator('[role="dialog"]', { hasText: '将同时删除' })
  await expect(secondAgain).toBeVisible({ timeout: 10_000 })
  await secondAgain.getByRole('button', { name: '确认删除' }).click()
  await expect(win.locator('.lib-row', { hasText: 'E5 场景一文献' }), '双确认后级联删').toHaveCount(0, { timeout: 10_000 })
  await app.close()

  expect(await readAiAuditCount(userData, taskId), '审计恒存').toBe(2)
})

test('E5 场景二 零计数：有图边无 AI 资源——仅第一窗无第二窗', async () => {
  const userData = await mkdtemp(join(tmpdir(), 'synapse-dbcamp-e5b-'))
  await bootstrapMigrations(userData)
  await seedGuidePaper(userData, 'e5b-target', 'E5 场景二文献')
  await seedGuidePaper(userData, 'e5b-neighbor', 'E5 场景二邻接')
  await seedLineageGraph(userData, {
    folders: [{ id: 'f-e5b', name: 'E5 场景二夹' }],
    nodes: [
      { paperId: 'e5b-target', title: 'E5 场景二文献', year: 2024, folderId: 'f-e5b' },
      { paperId: 'e5b-neighbor', title: 'E5 场景二邻接', year: 2024, folderId: 'f-e5b' }
    ],
    edges: [{ from: 'e5b-neighbor', to: 'e5b-target' }]
  })

  const app = await launch(userData)
  const win = await app.firstWindow()
  await readyLibrary(win)
  const row = win.locator('.lib-row', { hasText: 'E5 场景二文献' })
  await expect(row).toBeVisible({ timeout: 10_000 })

  await row.click({ button: 'right' })
  await win.getByTestId('paper-row-menu').getByRole('menuitem', { name: '删除文献' }).click()
  const dialog = win.locator('[role="dialog"]', { hasText: '删除文献？' })
  await expect(dialog).toBeVisible({ timeout: 10_000 })
  await dialog.getByRole('button', { name: '删除文献' }).click()
  // 零计数：第二窗不出现（旧单确认流外部行为不变）+直接删除
  await expect(win.locator('.lib-row', { hasText: 'E5 场景二文献' })).toHaveCount(0, { timeout: 10_000 })
  await expect(win.getByText('将同时删除'), '第二窗负锚').toHaveCount(0)
  await app.close()
})

test('E5 场景三 folder 删：paper 档+lineage 档（锚=collections.id）双面合计→确认→两档资源俱灭+审计恒存', async () => {
  const userData = await mkdtemp(join(tmpdir(), 'synapse-dbcamp-e5c-'))
  await bootstrapMigrations(userData)
  // 夹+夹内文献（seedLineageGraph assignFolder——INV-88 入图即归档镜像）
  await seedGuidePaper(userData, 'e5c-paper', 'E5 夹内文献')
  await seedLineageGraph(userData, {
    folders: [{ id: 'e5c-folder', name: 'E5 级联夹' }],
    nodes: [{ paperId: 'e5c-paper', title: 'E5 夹内文献', year: 2024, folderId: 'e5c-folder' }]
  })
  // paper 档（锚=夹内文献）与 lineage 档（锚=collections.id）AI 资源各一套
  const paperSession = await seedAiSession(userData, 'paper', 'e5c-paper')
  await seedAiMessage(userData, paperSession, { role: 'user', content: 'E5 夹内档消息' })
  await seedAiMemory(userData, {
    scope: 'paper', anchorId: 'e5c-paper', category: 'reading_insight',
    title: 'E5 夹内档记忆', content: '内容'
  })
  const paperTask = await seedAiTask(userData, 'paper', 'e5c-paper', {
    action: 'memory.pin', status: 'succeeded'
  })
  await seedAiAuditRow(userData, paperTask, 0, 'succeeded', '完成')
  const lineageSession = await seedAiSession(userData, 'lineage', 'e5c-folder')
  await seedAiMessage(userData, lineageSession, { role: 'assistant', content: 'E5 脉络档消息' })
  await seedAiMemory(userData, {
    scope: 'lineage', anchorId: 'e5c-folder', category: 'node_role',
    title: 'E5 脉络档记忆', content: '内容'
  })
  const lineageTask = await seedAiTask(userData, 'lineage', 'e5c-folder', {
    action: 'message.pin', status: 'succeeded'
  })
  await seedAiAuditRow(userData, lineageTask, 0, 'succeeded', '完成')

  const app = await launch(userData)
  const win = await app.firstWindow()
  await readyLibrary(win)
  const folderRow = win.locator('.lib-fn-row', { hasText: 'E5 级联夹' })
  await expect(folderRow).toBeVisible({ timeout: 10_000 })

  // 删夹→第一窗（域删预告——paperCount=1 保护）→确认→第二窗双面合计
  await folderRow.click({ button: 'right' })
  await win.getByTestId('folder-menu').getByRole('menuitem', { name: '删除文件夹' }).click()
  const firstDialog = win.locator('[role="dialog"]', { hasText: '删除文件夹' })
  await expect(firstDialog).toBeVisible({ timeout: 10_000 })
  await firstDialog.getByRole('button', { name: '删除文件夹' }).click()
  const second = win.locator('[role="dialog"]', { hasText: '将同时删除' })
  await expect(second).toBeVisible({ timeout: 10_000 })
  await expect(second).toContainText('会话 2 个')
  await expect(second).toContainText('消息 2 条')
  await expect(second).toContainText('记忆 2 条')
  await expect(second).toContainText('任务 2 个')
  await second.getByRole('button', { name: '确认删除' }).click()

  // 夹灭（夹行+夹内文献行俱灭）
  await expect(win.locator('.lib-fn-row', { hasText: 'E5 级联夹' })).toHaveCount(0, { timeout: 10_000 })
  await expect(win.locator('.lib-row', { hasText: 'E5 夹内文献' })).toHaveCount(0, { timeout: 10_000 })

  // 两档资源俱灭：设置页记忆 Tab 两档空态（scope 级全列——本库零残留）
  await win.getByRole('button', { name: '设置', exact: true }).click()
  await expect(win.getByRole('heading', { name: 'AI 管理' })).toBeVisible({ timeout: 10_000 })
  const section = win.getByTestId('ai-manage-section')
  await section.getByRole('tab', { name: '记忆' }).click()
  const mem = win.getByTestId('ai-manage-memory')
  await expect(mem.getByText('暂无记忆')).toBeVisible({ timeout: 10_000 })
  await mem.locator('[aria-label="记忆档位"]').selectOption('paper')
  await expect(mem.getByText('暂无记忆')).toBeVisible({ timeout: 10_000 })
  await mem.locator('[aria-label="记忆档位"]').selectOption('lineage')
  await expect(mem.getByText('暂无记忆')).toBeVisible({ timeout: 10_000 })
  await app.close()

  // 审计恒存（两任务行已灭——审计行留档）
  expect(await readAiAuditCount(userData, paperTask), 'paper 档审计恒存').toBe(1)
  expect(await readAiAuditCount(userData, lineageTask), 'lineage 档审计恒存').toBe(1)
})
