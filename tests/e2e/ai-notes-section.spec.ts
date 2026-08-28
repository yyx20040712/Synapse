import { test, expect } from '@playwright/test'
import { createHash } from 'node:crypto'
import { mkdtemp } from 'node:fs/promises'
import { mkdirSync, readdirSync, rmSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { isTicketDone } from '../../tickets/registry'
import { createTinyPdf, PDF_KNOWN_TEXT } from '../utils/pdf-factory'
import { launch, seedPaperRow } from './e2e-env'

/**
 * AI 笔记面板 e2e（SR2-AI-08，受锁）。
 *
 * 全链（AI-04 侧通道同型——e2e 不拉起真工具）：阅读器笔记 tab→「AI 读文献」
 * 写 job（真 IPC→真 fs 落盘）→fixture status.json 模拟心跳（SYNAPSE_USER_DATA
 * 隔离环境 fs 直写——AI-06 协议目录）→状态行 reading→job 移除+corpus-ai
 * 产物落盘→done-unimported→「导入 AI 笔记」（真 07 导入器→真 DB）→分节
 * 渲染真实文本（e2e 断言锚——渲染出真实文本，非 testid 空壳）+archive 归档。
 * 状态行迁移靠组件 5s 轮询消费 fixture 变化——断言超时留 12s 余量。
 */
const DEPS = ['SR2-AI-06', 'SR2-AI-07'] as const
const PAPER_ID = 'e2e-ai-sec'
const PAPER_ID_09 = 'e2e-ai-layer'

test('AI 笔记面板全链：写 job→心跳 fixture→reading→产物落盘→导入→分节渲染真实文本', async () => {
  const pending = DEPS.filter((d) => !isTicketDone(d))
  test.skip(pending.length > 0, `延期：依赖工单未完成 [${pending.join(', ')}]`)

  const userData = await mkdtemp(join(tmpdir(), 'synapse-ai08-'))
  const sensorRoot = join(userData, 'ai-sensor')

  // 第一跳：让应用自己完成建库迁移（reader-text 同型）
  const seedApp = await launch(userData)
  await (await seedApp.firstWindow()).waitForTimeout(500)
  await seedApp.close()

  // 种子：一篇真实 PDF
  const bytes = createTinyPdf(`AI 面板 e2e ${PDF_KNOWN_TEXT}`)
  const sha = createHash('sha256').update(bytes).digest('hex')
  const fileRef = `${sha.slice(0, 2)}/${sha.slice(2, 4)}/${sha}.pdf`
  const abs = join(userData, 'files', ...fileRef.split('/'))
  mkdirSync(dirname(abs), { recursive: true })
  writeFileSync(abs, bytes)
  await seedPaperRow(userData, fileRef, sha, 'AI 面板 e2e 测试文献', PAPER_ID)

  const app = await launch(userData)
  const win = await app.firstWindow()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })

  // 打开阅读器+笔记 tab（AI 面分节挂 ReaderNotesPanel 下部）
  await win.getByText('AI 面板 e2e 测试文献').first().dblclick()
  await expect(win.getByText(PDF_KNOWN_TEXT).first()).toBeVisible({ timeout: 20_000 })
  await win.locator('[data-testid="reader-aside"]').getByRole('tab', { name: '笔记' }).click()
  const readBtn = win.getByRole('button', { name: 'AI 读文献' })
  await expect(readBtn).toBeVisible({ timeout: 10_000 })

  // hidden：无 job 无产物——仅按钮行（无状态行）
  await expect(win.getByTestId('ai-status-line')).toHaveCount(0)

  // 写 job（真 IPC）：pending 态（click 后立即刷新 observe）
  await readBtn.click()
  await expect(win.getByTestId('ai-status-line')).toHaveText('已请求 AI 阅读，等待 zcode 拾取…', {
    timeout: 10_000
  })
  await expect(readBtn).toBeDisabled()
  // 真 fs 断言：pending job 落协议目录
  const pendingDir = join(sensorRoot, 'pending')
  const jobs = readdirSync(pendingDir).filter((f) => f.endsWith('.json'))
  expect(jobs.length).toBe(1)

  // 心跳 fixture（fs 直写——e2e 不拉起真工具）：reading 态（≤12s 轮询余量）
  writeFileSync(
    join(sensorRoot, 'status.json'),
    JSON.stringify({
      state: '一读中',
      currentPaper: PAPER_ID,
      role: 'first-read',
      updatedAt: new Date().toISOString(),
      heartbeatAt: new Date().toISOString()
    })
  )
  await expect(win.getByTestId('ai-status-line')).toHaveText('AI 正在读本文（一读中）', {
    timeout: 12_000
  })

  // 产物落盘+job 移除（工具完成语义）：done-unimported
  const productRows = [
    {
      role: 'first-read',
      question: 'Q1',
      model: 'e2e-test-model',
      quote_text: PDF_KNOWN_TEXT,
      prefix_text: '',
      suffix_text: '',
      anchor_page: 1,
      content_md: 'AI 一读笔记正文内容（e2e 真实文本锚）'
    },
    {
      role: 'adjudicate',
      question: 'divergence',
      model: 'e2e-test-model',
      quote_text: '',
      prefix_text: '',
      suffix_text: '',
      anchor_page: null,
      content_md: '两读者对样本量的分歧评估'
    }
  ]
  mkdirSync(join(sensorRoot, 'corpus-ai'), { recursive: true })
  writeFileSync(join(sensorRoot, 'corpus-ai', `${PAPER_ID}.json`), JSON.stringify(productRows))
  // 工具完成语义另一半：status 移出本篇（currentPaper=null——心跳仍新鲜但不
  // 指 P，reading 判定退出，六态按 fs 事实落 done-unimported）
  writeFileSync(
    join(sensorRoot, 'status.json'),
    JSON.stringify({
      state: '空闲',
      currentPaper: null,
      role: null,
      updatedAt: new Date().toISOString(),
      heartbeatAt: new Date().toISOString()
    })
  )
  for (const f of readdirSync(pendingDir)) rmSync(join(pendingDir, f))
  await expect(win.getByTestId('ai-status-line')).toHaveText('AI 已读完，待导入', { timeout: 12_000 })
  const importBtn = win.getByRole('button', { name: '导入 AI 笔记' })
  await expect(importBtn).toBeVisible()

  // 导入（真 07 导入器→真 DB）：三桶 toast+分节渲染真实文本（idle 稳态）
  await importBtn.click()
  await expect(win.getByText('AI 笔记导入完成：导入 1 篇，跳过 0 篇')).toBeVisible({ timeout: 10_000 })
  await expect(win.getByRole('heading', { name: '一读' })).toBeVisible()
  await expect(win.getByRole('heading', { name: '裁决' })).toBeVisible()
  await expect(win.getByText('AI 一读笔记正文内容（e2e 真实文本锚）')).toBeVisible({ timeout: 10_000 })
  await expect(win.getByText('两读者对样本量的分歧评估')).toBeVisible()
  await expect(win.getByTestId('ai-status-line')).toHaveCount(0) // idle：稳态无状态行
  // archive 账本：产物移入归档区（真 fs）
  expect(existsSync(join(sensorRoot, 'archive', `${PAPER_ID}.json`))).toBe(true)
  expect(readdirSync(join(sensorRoot, 'corpus-ai'))).toHaveLength(0)

  await app.close()
})

/**
 * AI 标注渲染层 e2e（SR2-AI-09，随 08 链扩——受锁 [locked-change]）。
 *
 * fixture 导入含锚行（quote=PDF 已渲染真实文本）→ 阅读器 AI 高亮块可见
 * （真实重锚：verifyQuote 对真 textLayer 命中——渲染真实文本断言）→点击
 * AI 高亮块→侧栏自动切笔记 tab+对应条目高亮（highlightAiNoteId 反向同步）。
 */
test('AI 标注渲染层：含锚行导入→阅读器 AI 高亮块可见→点击跳面板高亮', async () => {
  // F-02 批 2：动态锚定根+跳页兼容后 AI 重锚渲染链回归（页盒结构消费方）
  const pending09 = [...DEPS, 'SR2-F-02'].filter((d) => !isTicketDone(d))
  test.skip(pending09.length > 0, `延期：依赖工单未完成 [${pending09.join(', ')}]`)

  const userData = await mkdtemp(join(tmpdir(), 'synapse-ai09-'))
  const sensorRoot = join(userData, 'ai-sensor')

  const seedApp = await launch(userData)
  await (await seedApp.firstWindow()).waitForTimeout(500)
  await seedApp.close()

  const bytes = createTinyPdf(`AI 渲染层 e2e ${PDF_KNOWN_TEXT}`)
  const sha = createHash('sha256').update(bytes).digest('hex')
  const fileRef = `${sha.slice(0, 2)}/${sha.slice(2, 4)}/${sha}.pdf`
  const abs = join(userData, 'files', ...fileRef.split('/'))
  mkdirSync(dirname(abs), { recursive: true })
  writeFileSync(abs, bytes)
  await seedPaperRow(userData, fileRef, sha, 'AI 渲染层 e2e 测试文献', PAPER_ID_09)

  const app = await launch(userData)
  const win = await app.firstWindow()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })

  await win.getByText('AI 渲染层 e2e 测试文献').first().dblclick()
  await expect(win.getByText(PDF_KNOWN_TEXT).first()).toBeVisible({ timeout: 20_000 })

  // fixture 落盘：job 移除+产物在（工具完成语义）→ 导入
  const readBtn = win.getByRole('button', { name: 'AI 读文献' })
  await win.locator('[data-testid="reader-aside"]').getByRole('tab', { name: '笔记' }).click()
  await expect(readBtn).toBeVisible({ timeout: 10_000 })
  await readBtn.click()
  const pendingDir = join(sensorRoot, 'pending')
  await expect
    .poll(() => readdirSync(pendingDir).filter((f) => f.endsWith('.json')).length, { timeout: 10_000 })
    .toBe(1)
  mkdirSync(join(sensorRoot, 'corpus-ai'), { recursive: true })
  writeFileSync(
    join(sensorRoot, 'corpus-ai', `${PAPER_ID_09}.json`),
    JSON.stringify([
      {
        role: 'first-read',
        question: 'Q1',
        model: 'e2e-test-model',
        // 含锚行：quote=当前页真实渲染文本（重锚命中的充要输入）
        quote_text: PDF_KNOWN_TEXT,
        prefix_text: '',
        suffix_text: '',
        anchor_page: 1,
        content_md: 'AI 一读含锚笔记（渲染层 e2e）'
      }
    ])
  )
  writeFileSync(
    join(sensorRoot, 'status.json'),
    JSON.stringify({ state: '空闲', currentPaper: null, role: null, updatedAt: new Date().toISOString(), heartbeatAt: new Date().toISOString() })
  )
  for (const f of readdirSync(pendingDir)) rmSync(join(pendingDir, f))
  const importBtn = win.getByRole('button', { name: '导入 AI 笔记' })
  await expect(importBtn).toBeVisible({ timeout: 12_000 })
  await importBtn.click()
  await expect(win.getByText('AI 笔记导入完成：导入 1 篇，跳过 0 篇')).toBeVisible({ timeout: 10_000 })

  // 回阅读区（笔记 tab 在侧栏——主区 PDF 常驻）：AI 高亮块经真 textLayer 重锚可见
  const aiRect = win.locator('[data-testid="ai-note-rect"]')
  await expect(aiRect.first()).toBeVisible({ timeout: 10_000 })
  await expect(aiRect.first()).toHaveAttribute('data-ai-note-id', /.+/)

  // 点击→侧栏切笔记 tab+对应条目高亮（highlightAiNoteId 反向同步）
  await aiRect.first().click()
  const entry = win.locator('[data-testid="ai-note-groups"] [data-highlight="true"]')
  await expect(entry).toBeVisible({ timeout: 10_000 })
  await expect(entry).toHaveAttribute('data-ai-note-id', /.+/)
  await expect(win.getByText('AI 一读含锚笔记（渲染层 e2e）')).toBeVisible()

  await app.close()
})
