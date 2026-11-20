import { test, expect } from '@playwright/test'
import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { bootstrapMigrations, launch, seedPaperRow, seedAnnotation } from './e2e-env'
import { createTinyPdf, PDF_KNOWN_TEXT } from '../utils/pdf-factory'
import { seedAiSession, seedAiMessage } from './ai-seed'

/**
 * [B2] 研究面板滚动会话记忆 e2e（计划 §4 第三期验收面）：页签滚动→去文献库
 * →回阅读器→断言真实文本可见+scrollTop 恢复。AI/笔记两页签各一条。
 * - 夹具量级：14 片段/14 消息（面板正文可滚——panel 内部滚动容器溢出）。
 * - 有效滚动容器=面板内部自持滚动面（fragment-list 父容器/ai-message-list），
 *   与 use-research-scroll 解析同口径。
 * - 断言=恢复后滚动位回升（expect.poll——浏览器内 rAF 重试窗口）+深处条目
 *   toBeInViewport（真实文本回读，不接受几何全绿文字不可见）。
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

/** 14 条片段标注（正文可滚量级；末条=深处回读锚）。
 *  startOffset 必须逐条递增：sortByDocumentOrder 键=page→startOffset→
 *  createdAt→id，键全同时落到 id 字符串序（'b2-frag-14'<'b2-frag-2'——
 *  第 14 条实际排第 6 位，深处前提坍塌+自校准滚动在高窄视口滚过头把目标
 *  裁剪出列〔CI 1024×720 实测 viewport ratio 0〕）；递增偏移使文档序=
 *  种子序，末条真深处 */
async function seedFragments(userData: string, paperId: string): Promise<void> {
  for (let i = 1; i <= 14; i += 1) {
    await seedAnnotation(userData, {
      id: `b2-frag-${i}`,
      paperId,
      page: 0,
      kind: 'highlight',
      color: 'yellow',
      quoteText: `研究面板滚动片段第${i}条引文文本`,
      prefixText: '',
      suffixText: '',
      startOffset: i,
      endOffset: i + 2,
      comment: ''
    })
  }
}

test('B2 笔记页签：片段列表滚动→去文献库→回阅读器→滚动位恢复+深处片段可见', async () => {
  const userData = await mkdtemp(join(tmpdir(), 'synapse-b2-notes-'))
  await bootstrapMigrations(userData)
  const title = 'B2 滚动记忆笔记文献'
  await seedOpenablePaper(userData, title, 'b2-notes-paper')
  await seedFragments(userData, 'b2-notes-paper')

  const app = await launch(userData)
  const win = await app.firstWindow()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
  await win.getByText(title).first().dblclick()
  await expect(win.getByText(PDF_KNOWN_TEXT).first()).toBeVisible({ timeout: 20_000 })

  const research = win.getByTestId('reader-research')
  await expect(research).toBeVisible({ timeout: 20_000 })
  await research.getByRole('tab', { name: '笔记' }).click()
  await expect(research.locator('[data-fragment-id]')).toHaveCount(14, { timeout: 10_000 })
  const deepText = win.getByText('研究面板滚动片段第14条引文文本')
  const scroller = research.locator('[data-testid="fragment-list"]')
  // 自校准滚动②：目标条目滚到容器顶下 8px。用 boundingRect 差值推增量——
  // offsetTop 相对 offsetParent（静态布局链下非滚动容器）会高估目标位，
  // 高窄视口（CI 1024×720）下夹取到 max 直接把目标滚进容器上方裁剪区；
  // rect 差值与视口/容器位置无关，逐视口精确
  const scrolled = await scroller.evaluate((el) => {
    const target = Array.from(el.querySelectorAll('li')).find((x) =>
      x.getAttribute('data-fragment-id') === 'b2-frag-14'
    ) as HTMLElement | undefined
    const box = el.parentElement as HTMLElement
    if (target === undefined) {
      box.scrollTop = 320
    } else {
      box.scrollTop += target.getBoundingClientRect().top - box.getBoundingClientRect().top - 8
    }
    return box.scrollTop
  })
  expect(scrolled, '夹具自检：目标条目在折叠区下方（容器可滚）').toBeGreaterThan(120)
  await expect(deepText).toBeInViewport()

  // 离开阅读器（ReaderPage 卸载收账）→返回（挂载恢复）
  await win.getByRole('button', { name: '文献库', exact: true }).click()
  await expect(win.locator('.lib-row', { hasText: title })).toBeVisible({ timeout: 20_000 })
  await win.getByRole('button', { name: '阅读器' }).click()
  await expect(research).toBeVisible({ timeout: 20_000 })
  await expect(research.locator('[data-fragment-id]')).toHaveCount(14, { timeout: 10_000 })
  await expect
    .poll(
      async () => scroller.evaluate((el) => (el.parentElement as HTMLElement).scrollTop),
      { timeout: 5_000 }
    )
    .toBeGreaterThanOrEqual(scrolled - 100)
  await expect(deepText, '深处片段真实文本回读可见').toBeInViewport()
  await app.close()
})

test('B2 AI 对话页签：消息列表滚动→去文献库→回阅读器→滚动位恢复+深处消息可见', async () => {
  const userData = await mkdtemp(join(tmpdir(), 'synapse-b2-ai-'))
  await bootstrapMigrations(userData)
  const title = 'B2 滚动记忆AI文献'
  await seedOpenablePaper(userData, title, 'b2-ai-paper')
  const sessionId = await seedAiSession(userData, 'paper', 'b2-ai-paper')
  // 长文消息（探针实证：单行短消息 14 条≈容器高+4px 不可滚——长文撑高气泡
  // 使消息列表真正溢出）
  for (let i = 1; i <= 14; i += 1) {
    await seedAiMessage(userData, sessionId, {
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `AI 滚动记忆消息第${i}条内容文本。${'滚动记忆夹具长文。'.repeat(24)}`
    })
  }

  const app = await launch(userData)
  const win = await app.firstWindow()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
  await win.getByText(title).first().dblclick()
  await expect(win.getByText(PDF_KNOWN_TEXT).first()).toBeVisible({ timeout: 20_000 })

  const research = win.getByTestId('reader-research')
  await expect(research).toBeVisible({ timeout: 20_000 })
  // 默认 ai 页签；等异步会话链落定（消息渲染后列表才可滚）
  const messageList = research.locator('[data-testid="ai-message-list"]')
  await expect(messageList).toBeVisible({ timeout: 10_000 })
  await expect(messageList.getByText(/AI 滚动记忆消息第1条内容文本/)).toBeVisible()
  // 自校准滚动：第 10 条滚到列表顶（长文列表高约数千 px——固定阈值够不到
  // 深处；阈值=设置后读回的实际 scrollTop——offsetTop 相对定位祖先会高估，
  // 夹取后真实值才是可达恢复位）
  const deepText = win.getByText(/AI 滚动记忆消息第10条内容文本/)
  // 自校准滚动：rect 差值增量（同笔记用例——offsetTop 相对 offsetParent
  // 高估，视口无关精确）
  const scrolled = await messageList.evaluate((el) => {
    const target = Array.from(el.querySelectorAll('p')).find((p) =>
      p.textContent?.includes('AI 滚动记忆消息第10条内容文本')
    ) as HTMLElement | undefined
    if (target === undefined) {
      el.scrollTop = 320
    } else {
      el.scrollTop += target.getBoundingClientRect().top - el.getBoundingClientRect().top - 8
    }
    return el.scrollTop
  })
  expect(scrolled, '夹具自检：目标消息在折叠区下方（列表可滚）').toBeGreaterThan(120)
  await expect(deepText).toBeInViewport()

  await win.getByRole('button', { name: '文献库', exact: true }).click()
  await expect(win.locator('.lib-row', { hasText: title })).toBeVisible({ timeout: 20_000 })
  await win.getByRole('button', { name: '阅读器' }).click()
  await expect(research).toBeVisible({ timeout: 20_000 })
  const messageList2 = research.locator('[data-testid="ai-message-list"]')
  await expect(messageList2).toBeVisible({ timeout: 10_000 })
  await expect
    .poll(
      async () => messageList2.evaluate((el) => el.scrollTop),
      { timeout: 5_000 }
    )
    .toBeGreaterThanOrEqual(scrolled - 100)
  await expect(deepText, '深处消息真实文本回读可见').toBeInViewport()
  await app.close()
})

// [计划 §4 第三期验收] 两个收起按钮在 1280 宽度仍可点击，PDF 正文真实文本
// 可见（e2e 默认窗口=DEFAULT_BOUNDS 1280×800——双栏同开即验收视口）
test('B1 双侧栏开关：1280 宽度双钮可点击+双栏开合+PDF 正文可见', async () => {
  const userData = await mkdtemp(join(tmpdir(), 'synapse-b1-toggles-'))
  await bootstrapMigrations(userData)
  const title = '双开关验收文献'
  await seedOpenablePaper(userData, title, 'b1-tgl-paper')

  const app = await launch(userData)
  const win = await app.firstWindow()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
  await win.getByText(title).first().dblclick()
  await expect(win.getByText(PDF_KNOWN_TEXT).first()).toBeVisible({ timeout: 20_000 })

  // 双栏默认同开：左 reader-aside+右 reader-research 在场，PDF 文本可见
  const outlineToggle = win.getByRole('button', { name: '展开或收起目录侧栏' })
  const researchToggle = win.getByRole('button', { name: '展开或收起研究面板' })
  await expect(outlineToggle).toBeVisible()
  await expect(researchToggle).toBeVisible()
  await expect(win.getByTestId('reader-aside')).toBeVisible()
  await expect(win.getByTestId('reader-research')).toBeVisible()
  await expect(win.getByText(PDF_KNOWN_TEXT).first()).toBeVisible()

  // 双钮收起：两栏卸载，PDF 文本仍可见
  await outlineToggle.click()
  await researchToggle.click()
  await expect(win.getByTestId('reader-aside')).toHaveCount(0)
  await expect(win.getByTestId('reader-research')).toHaveCount(0)
  await expect(win.getByText(PDF_KNOWN_TEXT).first()).toBeVisible()

  // 双钮展开：两栏恢复，PDF 文本仍可见
  await outlineToggle.click()
  await researchToggle.click()
  await expect(win.getByTestId('reader-aside')).toBeVisible()
  await expect(win.getByTestId('reader-research')).toBeVisible()
  await expect(win.getByText(PDF_KNOWN_TEXT).first()).toBeVisible()
  await app.close()
})
