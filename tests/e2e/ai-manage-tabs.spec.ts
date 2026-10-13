import { test, expect } from '@playwright/test'
import { createHash } from 'node:crypto'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { bootstrapMigrations, launch, seedPaperRow } from './e2e-env'
import { seedAiMemory, seedAiMessage, seedAiSession } from './ai-seed'

/**
 * [F-DBCAMP-01 DB-2 UI U5] E3 置顶闭环 + E7 记忆手动 CRUD 全链（设计 §5.1）。
 *
 * 承载=设置页「AI 管理」节三 Tab（节序节标=E1 已锁零改动）。种子零改动：
 * E3 锚对象行复用既有 seedPaperRow（W-4）+seedAiSession/seedAiMessage(pinned)；
 * E7 agent 行=app 在跑直写 seedAiMemory+切档重挂（paper→global 经 store
 * setScope 清条目重拉——E2 直写+重挂先例的设置面同型）。真实文本断言
 * （消息正文/锚标题/记忆标题与内容/「代理生成」标全 seed 或交互字面）。
 */

/** 破引导态占位文献行（E1③ 配方——fake fileRef 不落 PDF 文件） */
async function seedGuidePaper(userData: string, id: string): Promise<void> {
  const sha = createHash('sha256').update(id).digest('hex')
  await seedPaperRow(userData, `${sha.slice(0, 2)}/${sha.slice(2, 4)}/${sha}.pdf`, sha, '占位文献', id)
}

test('E3 置顶闭环：置顶 Tab 断言消息文本+锚标题→取消置顶→行消失+空态', async () => {
  const userData = await mkdtemp(join(tmpdir(), 'synapse-dbcamp-e3-'))
  await bootstrapMigrations(userData)
  // 锚对象行=seedPaperRow 复用（W-4）；pinned 消息挂 paper 档会话（服务端
  // anchorTitle=LEFT JOIN papers.title）
  const title = 'E3 锚文献'
  const anchor = 'e2e-e3-anchor'
  const sha = createHash('sha256').update('e3-msg-anchor').digest('hex')
  await seedPaperRow(userData, `${sha.slice(0, 2)}/${sha.slice(2, 4)}/${sha}.pdf`, sha, title, anchor)
  const sessionId = await seedAiSession(userData, 'paper', anchor)
  await seedAiMessage(userData, sessionId, { role: 'assistant', content: 'E3 置顶消息正文', pinned: true })

  const app = await launch(userData)
  const win = await app.firstWindow()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
  await win.getByRole('button', { name: '设置', exact: true }).click()
  await expect(win.getByRole('heading', { name: 'AI 管理' })).toBeVisible({ timeout: 10_000 })

  const section = win.getByTestId('ai-manage-section')
  await section.getByRole('tab', { name: '置顶消息' }).click()
  const pins = win.getByTestId('ai-manage-pins')
  // 文本+锚标题（targetTitle——服务端 JOIN 解析，E3 断言锚）
  await expect(pins.getByText('E3 置顶消息正文')).toBeVisible({ timeout: 10_000 })
  await expect(pins.getByText(title)).toBeVisible()

  // 取消置顶：真实 IPC ai-messages/set-pinned false→行消失+空态
  await pins.getByRole('button', { name: '取消置顶', exact: true }).click()
  await expect(pins.getByText('暂无置顶消息')).toBeVisible({ timeout: 10_000 })
  await expect(pins.getByText('E3 置顶消息正文')).toHaveCount(0)
  await app.close()
})

test('E7 记忆 CRUD 全链：global 档新建→列表→编辑→置顶→删除→空态；agent 行只读', async () => {
  const userData = await mkdtemp(join(tmpdir(), 'synapse-dbcamp-e7-'))
  await bootstrapMigrations(userData)
  await seedGuidePaper(userData, 'e2e-e7-anchor')

  const app = await launch(userData)
  const win = await app.firstWindow()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
  await win.getByRole('button', { name: '设置', exact: true }).click()
  await expect(win.getByRole('heading', { name: 'AI 管理' })).toBeVisible({ timeout: 10_000 })

  const section = win.getByTestId('ai-manage-section')
  await section.getByRole('tab', { name: '记忆' }).click()
  const mem = win.getByTestId('ai-manage-memory')
  await expect(mem.getByText('暂无记忆')).toBeVisible({ timeout: 10_000 })
  const rowOf = (t: string) => mem.locator('li', { hasText: t })

  // 新建：分类下拉（非默认值）+标题+内容（真实 IPC ai-memory/create origin=manual）
  await mem.locator('[aria-label="新建分类"]').selectOption('task_outcome')
  await mem.locator('[aria-label="新建标题"]').fill('E7 手动记忆')
  await mem.locator('[aria-label="新建内容"]').fill('七号内容')
  await mem.getByRole('button', { name: '新建记忆', exact: true }).click()
  await expect(mem.getByText('E7 手动记忆')).toBeVisible({ timeout: 10_000 })

  // 编辑：行内改标题+内容→保存（真实 IPC ai-memory/update；[回炉 R10] 内容
  // 文本回显断言补齐——真实文本断言铁律）
  await rowOf('E7 手动记忆').getByRole('button', { name: '编辑', exact: true }).click()
  await mem.locator('[aria-label="编辑标题"]').fill('E7 改后记忆')
  await mem.locator('[aria-label="编辑内容"]').fill('七号改后内容')
  await mem.getByRole('button', { name: '保存', exact: true }).click()
  await expect(mem.getByText('E7 改后记忆')).toBeVisible({ timeout: 10_000 })
  await expect(mem.getByText('七号改后内容')).toBeVisible({ timeout: 10_000 })
  await expect(mem.getByText('E7 手动记忆')).toHaveCount(0)

  // 置顶：行钉标浮现（真实 IPC ai-memory/set-pinned）
  await rowOf('E7 改后记忆').getByRole('button', { name: '置顶', exact: true }).click()
  await expect(rowOf('E7 改后记忆').getByText('已置顶')).toBeVisible({ timeout: 10_000 })

  // 删除→空态（真实 IPC ai-memory/delete）
  await rowOf('E7 改后记忆').getByRole('button', { name: '删除', exact: true }).click()
  await expect(mem.getByText('暂无记忆')).toBeVisible({ timeout: 10_000 })

  // agent 行：app 在跑直写+切档重挂（paper→global——store setScope 清条目重拉）
  await seedAiMemory(userData, {
    scope: 'global',
    anchorId: null,
    category: 'user_preference',
    title: 'E7 代理记忆',
    content: '代理生成内容',
    origin: 'agent'
  })
  await mem.locator('[aria-label="记忆档位"]').selectOption('paper')
  await expect(mem.getByText('暂无记忆')).toBeVisible({ timeout: 10_000 })
  await mem.locator('[aria-label="记忆档位"]').selectOption('global')
  await expect(mem.getByText('E7 代理记忆')).toBeVisible({ timeout: 10_000 })

  // agent 行只读：「代理生成」标+无编辑/置顶/删除钮（§6——无编辑面）
  const agentRow = mem.locator('li[data-origin="agent"]')
  await expect(agentRow.getByText('代理生成', { exact: true })).toBeVisible()
  await expect(agentRow.getByRole('button', { name: '编辑', exact: true })).toHaveCount(0)
  await expect(agentRow.getByRole('button', { name: '置顶', exact: true })).toHaveCount(0)
  await expect(agentRow.getByRole('button', { name: '删除', exact: true })).toHaveCount(0)
  await app.close()
})
