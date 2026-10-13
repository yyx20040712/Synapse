import { test, expect } from '@playwright/test'
import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { bootstrapMigrations, launch, seedPaperRow } from './e2e-env'
import { createTinyPdf, PDF_KNOWN_TEXT } from '../utils/pdf-factory'
import { seedAiAuditRow, seedAiTask } from './ai-seed'

/**
 * [F-DBCAMP-01 DB-2 UI U4] E2 任务卡六态与取消 + E6 审计抽屉（设计 §5.1——
 * 主控预裁同件分段：E2=§5.1-E2 六态/取消/running 无取消钮/终态三态；E6=§5.1-E6
 * seq 升序+类型标+摘要+before/after+空态）。
 *
 * 种子挂 paper 档锚（D7：AiTask 无 global 档无 sessionId——行级平铺 scope+
 * anchorId；UI 按 scope+anchorId 过滤，list 传显式非空 anchorId）。锚=paper id
 * （seedPaperRow 第 5 参显式传——E1 先例）；任务 action 五值互异=卡片定位键。
 * 真实文本断言（六态文案/错误文案/result 摘要/审计 detail 全部 seed 字面）。
 */

/** 造一篇可打开的 PDF 文献（E1① 配方——sha/fileRef/落盘） */
async function seedOpenablePaper(userData: string, title: string, id: string): Promise<void> {
  const bytes = createTinyPdf(`${title} ${PDF_KNOWN_TEXT}`)
  const sha = createHash('sha256').update(bytes).digest('hex')
  const fileRef = `${sha.slice(0, 2)}/${sha.slice(2, 4)}/${sha}.pdf`
  const abs = join(userData, 'files', ...fileRef.split('/'))
  mkdirSync(dirname(abs), { recursive: true })
  writeFileSync(abs, bytes)
  await seedPaperRow(userData, fileRef, sha, title, id)
}

test('E2 任务卡六态与取消：queued 取消→已取消；running 执行中无取消钮；终态三态文案', async () => {
  const userData = await mkdtemp(join(tmpdir(), 'synapse-dbcamp-e2-'))
  await bootstrapMigrations(userData)
  const title = 'E2 任务卡文献'
  const anchor = 'e2e-e2-anchor'
  await seedOpenablePaper(userData, title, anchor)
  // 四任务挂同锚（action 互异=卡片定位键）；running 不可 launch 前种——启动恢复
  // 扫描（bootstrap 期单次）把 running 迁 failed(interrupted)，故 running 行在
  // app 启动后直写+reload 重挂呈现（cancelled 由取消闭环到达）
  await seedAiTask(userData, 'paper', anchor, { action: 'memory.create', status: 'queued' })
  await seedAiTask(userData, 'paper', anchor, { action: 'memory.delete', status: 'succeeded', result: '已归档 2 条记忆' })
  await seedAiTask(userData, 'paper', anchor, { action: 'memory.pin', status: 'failed', error: '记忆服务暂不可用' })
  await seedAiTask(userData, 'paper', anchor, { action: 'memory.search', status: 'timeout' })

  const app = await launch(userData)
  const win = await app.firstWindow()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
  await win.getByText(title).first().dblclick()
  const aside = win.getByTestId('reader-aside')
  await expect(aside).toBeVisible({ timeout: 20_000 })
  await aside.getByRole('tab', { name: 'AI 会话' }).click()

  const section = aside.getByTestId('ai-tasks-section')
  await expect(section).toBeVisible({ timeout: 10_000 })
  const card = (action: string) => section.locator(`[data-action="${action}"]`)

  // 五态文案（真实文本断言——设计 §1.2；running 第二段补）
  await expect(card('memory.create').getByTestId('ai-task-status')).toHaveText('排队中')
  await expect(card('memory.delete').getByTestId('ai-task-status')).toHaveText('已完成')
  await expect(card('memory.pin').getByTestId('ai-task-status')).toHaveText('失败')
  await expect(card('memory.search').getByTestId('ai-task-status')).toHaveText('超时')

  // 取消钮：queued 在场（running 无钮面见第二段）
  await expect(card('memory.create').getByRole('button', { name: '取消任务' })).toBeVisible()

  // succeeded=结果摘要行；failed=错误文案行（seed 字面）
  await expect(card('memory.delete').getByTestId('ai-task-result')).toHaveText('已归档 2 条记忆')
  await expect(card('memory.pin').getByTestId('ai-task-error')).toHaveText('记忆服务暂不可用')

  // targetTitle 行：服务端 JOIN 解析的锚标题（设计 §1.2 目标描述符行）
  await expect(card('memory.create').getByTestId('ai-task-target')).toContainText(title)

  // 取消闭环：queued 点取消→已取消（真实 IPC ai-tasks/cancel→行替换）
  await card('memory.create').getByRole('button', { name: '取消任务' }).click()
  await expect(card('memory.create').getByTestId('ai-task-status')).toHaveText('已取消')

  // running 段：app 在跑时直写 running 行（恢复扫描已过不再迁移）+reload 重挂
  // （'ai' 页签 CSS 隐藏不卸载——切 tab 不重派，reload 是唯一重挂面）
  await seedAiTask(userData, 'paper', anchor, { action: 'memory.update', status: 'running' })
  await win.reload()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
  await win.getByText(title).first().dblclick()
  const aside2 = win.getByTestId('reader-aside')
  await expect(aside2).toBeVisible({ timeout: 20_000 })
  await aside2.getByRole('tab', { name: 'AI 会话' }).click()
  const section2 = aside2.getByTestId('ai-tasks-section')
  await expect(section2).toBeVisible({ timeout: 10_000 })
  const card2 = (action: string) => section2.locator(`[data-action="${action}"]`)

  await expect(card2('memory.update').getByTestId('ai-task-status')).toHaveText('执行中')
  await expect(card2('memory.update').getByRole('button', { name: '取消任务' })).toHaveCount(0)
  // 取消已持久化（DB 行 cancelled——reload 后仍「已取消」）
  await expect(card2('memory.create').getByTestId('ai-task-status')).toHaveText('已取消')
  await app.close()
})

test('R1-B1 跨格序列：开 paper A 抽屉→双击换 paper B（换锚重挂）→新面板无抽屉浮现', async () => {
  const userData = await mkdtemp(join(tmpdir(), 'synapse-dbcamp-b1-'))
  await bootstrapMigrations(userData)
  const titleA = 'B1 抽屉文献甲'
  const titleB = 'B1 抽屉文献乙'
  const anchorA = 'e2e-b1-anchor-a'
  const anchorB = 'e2e-b1-anchor-b'
  await seedOpenablePaper(userData, titleA, anchorA)
  await seedOpenablePaper(userData, titleB, anchorB)
  const taskA = await seedAiTask(userData, 'paper', anchorA, { action: 'memory.create', status: 'succeeded' })
  await seedAiTask(userData, 'paper', anchorB, { action: 'memory.search', status: 'queued' })
  await seedAiAuditRow(userData, taskA, 1, 'submitted', 'B1 抽屉首行')

  const app = await launch(userData)
  const win = await app.firstWindow()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
  // 开文献 A→AI 会话→开任务 A 抽屉（行落地）
  await win.getByText(titleA).first().dblclick()
  const aside = win.getByTestId('reader-aside')
  await expect(aside).toBeVisible({ timeout: 20_000 })
  await aside.getByRole('tab', { name: 'AI 会话' }).click()
  const section = aside.getByTestId('ai-tasks-section')
  await expect(section).toBeVisible({ timeout: 10_000 })
  await section.locator('[data-action="memory.create"]').getByRole('button', { name: '审计' }).click()
  await expect(win.getByTestId('ai-audit-drawer')).toBeVisible({ timeout: 10_000 })
  await expect(win.getByText('B1 抽屉首行')).toBeVisible({ timeout: 10_000 })

  // 换锚重挂：关 reader tab（回阅读器空态）→点 rail 文献库切回列表→双击文献 B
  // →activeTab 切换→aside 面板换锚（effect cleanup 关抽屉）。列表行显式等待可见
  // 再双击（防异步渲染悬死）
  await win.getByRole('button', { name: `关闭 ${titleA}` }).click()
  await win.getByRole('button', { name: '文献库', exact: true }).click()
  await expect(win.getByText(titleB).first()).toBeVisible({ timeout: 20_000 })
  await win.getByText(titleB).first().dblclick()
  const aside2 = win.getByTestId('reader-aside')
  await expect(aside2).toBeVisible({ timeout: 20_000 })
  await aside2.getByRole('tab', { name: 'AI 会话' }).click()
  // 新锚任务区就绪（换锚生效锚）——抽屉不得浮现（单抽屉全局语义：归属面消失必关）
  const section2 = aside2.getByTestId('ai-tasks-section')
  await expect(section2).toBeVisible({ timeout: 10_000 })
  await expect(section2.locator('[data-action="memory.search"]').getByTestId('ai-task-status')).toHaveText('排队中')
  await expect(win.getByTestId('ai-audit-drawer'), '换锚重挂后旧抽屉不浮现').toHaveCount(0)
  await app.close()
})

test('E6 审计抽屉：seq 升序+类型标+摘要与 before/after；无审计行任务→暂无审计记录', async () => {
  const userData = await mkdtemp(join(tmpdir(), 'synapse-dbcamp-e6-'))
  await bootstrapMigrations(userData)
  const title = 'E6 审计文献'
  const anchor = 'e2e-e6-anchor'
  await seedOpenablePaper(userData, title, anchor)
  const taskA = await seedAiTask(userData, 'paper', anchor, { action: 'memory.create', status: 'succeeded' })
  // taskB 不接返回 id（无审计行——空态面按 action 定位卡，无需 id）
  await seedAiTask(userData, 'paper', anchor, { action: 'memory.update', status: 'succeeded' })
  // 变更×2（mutated+result_overflow）+权限决策×1（submitted）——展示映射自裁
  // 申报；seq 从 1 起（写入侧 appendAudit=MAX(seq)+1 语义——0 起行会被首载
  // afterSeq=0 游标排除）
  await seedAiAuditRow(userData, taskA, 1, 'submitted', '提交任务 memory.create')
  await seedAiAuditRow(userData, taskA, 2, 'mutated', 'before={"title":"旧标题"} after={"title":"新标题"}')
  await seedAiAuditRow(userData, taskA, 3, 'result_overflow', '结果摘要超限被截断')
  // taskB 不种审计行（空态面）

  const app = await launch(userData)
  const win = await app.firstWindow()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
  await win.getByText(title).first().dblclick()
  const aside = win.getByTestId('reader-aside')
  await expect(aside).toBeVisible({ timeout: 20_000 })
  await aside.getByRole('tab', { name: 'AI 会话' }).click()

  const section = aside.getByTestId('ai-tasks-section')
  await expect(section).toBeVisible({ timeout: 10_000 })

  // 开任务 A 抽屉（真实 IPC ai-tasks/list-audit）
  await section.locator('[data-action="memory.create"]').getByRole('button', { name: '审计' }).click()
  const drawer = aside.getByTestId('ai-audit-drawer')
  await expect(drawer).toBeVisible({ timeout: 10_000 })
  await expect(drawer.getByText('审计记录')).toBeVisible()
  // 首行 detail 锚定 IPC 落地后断言行集（摘要文本=seed 字面）
  await expect(drawer.getByText('提交任务 memory.create')).toBeVisible({ timeout: 10_000 })
  await expect(drawer.getByText('before={"title":"旧标题"} after={"title":"新标题"}')).toBeVisible()
  await expect(drawer.getByText('结果摘要超限被截断')).toBeVisible()

  // 类型标（真实文本）：变更×2+权限决策×1（exact 防互含）
  await expect(drawer.getByText('变更', { exact: true })).toHaveCount(2)
  await expect(drawer.getByText('权限决策', { exact: true })).toHaveCount(1)

  // seq 升序（DOM 序=data-seq 属性序列）
  const seqs = await drawer.getByTestId('ai-audit-row').evaluateAll((rows) =>
    rows.map((r) => Number(r.getAttribute('data-seq')))
  )
  expect(seqs).toEqual([1, 2, 3])

  // 首载即尽（3 行<100）——「加载更多」不渲染（终裁 N-2 翻页口隐藏面）
  await expect(drawer.getByRole('button', { name: '加载更多' })).toHaveCount(0)

  // 关闭抽屉→开无审计行任务 B→空态
  await drawer.getByRole('button', { name: '关闭审计' }).click()
  await expect(drawer).toHaveCount(0)
  await section.locator('[data-action="memory.update"]').getByRole('button', { name: '审计' }).click()
  await expect(aside.getByTestId('ai-audit-drawer').getByText('暂无审计记录')).toBeVisible({ timeout: 10_000 })
  await app.close()
})
