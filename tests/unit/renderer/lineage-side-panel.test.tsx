// @vitest-environment jsdom
/**
 * [LG-04] LineageSidePanel —— 节点侧板+笔记双击跳阅读器组件测试（锁定合约，
 * always-active——不经 guardedDescribe）。
 *
 * 覆盖：文献节点四区渲染（元信息/核心 idea/AI 分节分色单源/人工笔记）/
 * 主题节点空态（仅前两区+「主题节点无笔记」，笔记通道零调用）/AI 条目双击→
 * onJumpToPaper 载荷含锚三元组+aiNoteId（anchorPage 1 基→0 基）/无锚条目→
 * anchor 缺省（篇级防线）/有页码无引文→anchor 保留页码（页级跳转）/
 * 单击不触发跳转/取数失败 error+重试（AI 面与人工面独立，INV-02 列表型）/
 * 空数据空态文案/换节点 stale 守卫（晚到旧响应不覆盖）/未选中空态/
 * Page 编排全链（单击节点→侧板挂载→双击→requestOpenPaperAnchored 锚载荷）/
 * Canvas 选中视觉态（Board selectedNodeId 兑现）/消费方级 INV-20（open-paper-
 * anchor：带锚→locateAnchor 单入口+页级降级静默；无锚→openPaper 既有链路）/
 * 消费方级 LG-06（带 aiNoteId 锚→notifyAiNoteHighlight 先于 locateAnchor
 * +定位照常；无 aiNoteId 锚→notify 不调）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { AiNote } from '../../../src/shared/models/ai-note'
import type { LineageNode } from '../../../src/shared/models/lineage'
import type * as clientModule from '../../../src/renderer/api/client'
import type * as toastStoreModule from '../../../src/renderer/shared/ui/toast-store'

const { stubApi, openPaperStub, locateAnchorStub, requestAnchoredStub, notifyAiNoteStub } = vi.hoisted(() => ({
  stubApi: {
    ai_sensor: { listByPaper: vi.fn() },
    notes: { get: vi.fn() },
    lineage: { graph: vi.fn() }
  },
  openPaperStub: vi.fn(),
  locateAnchorStub: vi.fn(),
  requestAnchoredStub: vi.fn(),
  notifyAiNoteStub: vi.fn()
}))

vi.mock('../../../src/renderer/api/client', async (importOriginal) => {
  const real = await importOriginal<typeof clientModule>()
  return {
    ...real,
    api: stubApi as unknown as typeof clientModule.api,
    apiEvents: {
      onExportCorpus: vi.fn(() => () => undefined),
      onImportProgress: vi.fn(() => () => undefined)
    }
  }
})

vi.mock('../../../src/renderer/shared/ui/toast-store', async (importOriginal) => {
  const real = await importOriginal<typeof toastStoreModule>()
  return { ...real, showToast: vi.fn() }
})

// 消费方级用例：reader.store 仅需 getState().openPaper + notifyAiNoteHighlight
// （open-paper-anchor 面——LG-06 起 anchor 分支亦发面板信号）
vi.mock('../../../src/renderer/features/reader/reader.store', () => ({
  useReaderStore: { getState: () => ({ openPaper: openPaperStub, notifyAiNoteHighlight: notifyAiNoteStub }) }
}))
vi.mock('../../../src/renderer/features/reader/anchor-locate', () => ({
  locateAnchor: locateAnchorStub
}))
// Page 编排用例：总线发送面 mock（消费方级用例不经它）
vi.mock('../../../src/renderer/shared/open-paper-bus', () => ({
  OPEN_PAPER_EVENT: 'synapse:open-paper',
  requestOpenPaper: vi.fn(),
  requestOpenPaperAnchored: requestAnchoredStub,
  takePendingOpenPaper: vi.fn(() => null)
}))

import { showToast } from '../../../src/renderer/shared/ui/toast-store'
import { LineageSidePanel } from '../../../src/renderer/features/lineage/LineageSidePanel'
import { LineagePage } from '../../../src/renderer/features/lineage/LineagePage'
import { openFromBus } from '../../../src/renderer/features/reader/open-paper-anchor'
import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'
import { QUESTION_COLOR } from '../../../src/renderer/features/reader/ai-note-style'

function node(id: string, patch: Partial<LineageNode> = {}): LineageNode {
  return {
    id,
    paperId: `paper-${id}`,
    title: `节点${id}`,
    coreIdea: '',
    year: 2020,
    x: null,
    y: null,
    createdAt: 't',
    updatedAt: 't',
    ...patch
  }
}

function aiNote(id: string, patch: Partial<AiNote> = {}): AiNote {
  return {
    id,
    paperId: 'paper-A',
    annotationId: null,
    role: 'first-read',
    question: 'Q1',
    model: 'test-model',
    quoteText: `quote-${id}`,
    prefixText: '',
    suffixText: '',
    anchorPage: 3,
    contentMd: `内容-${id}`,
    createdAt: 't',
    updatedAt: 't',
    ...patch
  }
}

let root: Root | null = null
let host: HTMLDivElement | null = null

function mount(element: JSX.Element): void {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root?.render(element)
  })
}

const flush = async (turns = 6): Promise<void> => {
  for (let i = 0; i < turns; i++) {
    await act(async () => {
      await Promise.resolve()
    })
  }
}

const q = (sel: string): Element | null => host?.querySelector(sel) ?? null

/** 双击（jsdom dblclick 事件——React onDoubleClick 消费面） */
function dblClick(el: Element): void {
  act(() => {
    el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
  })
}

function click(el: Element): void {
  act(() => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}

/** 单击画布节点（pointer 会话位移 0——board 测试 clickNode 同型） */
function clickNode(el: Element): void {
  act(() => {
    el.dispatchEvent(new MouseEvent('pointerdown', { clientX: 100, clientY: 100, bubbles: true }))
  })
  act(() => {
    window.dispatchEvent(new MouseEvent('pointerup', { clientX: 100, clientY: 100 }))
  })
}

const JUMP = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  for (const fn of Object.values(stubApi.ai_sensor)) fn.mockReset()
  stubApi.notes.get.mockReset()
  stubApi.lineage.graph.mockReset()
  stubApi.ai_sensor.listByPaper.mockResolvedValue({ ok: true, data: [] })
  stubApi.notes.get.mockResolvedValue({ ok: true, data: null })
  stubApi.lineage.graph.mockResolvedValue({ ok: true, data: { nodes: [], edges: [] } })
  locateAnchorStub.mockResolvedValue('exact')
  openPaperStub.mockResolvedValue(undefined)
  useLineageStore.setState({
    nodes: [],
    edges: [],
    status: 'loading',
    error: null,
    saveStatus: 'saved',
    lastWriteError: null,
    queue: [],
    flushing: false
  })
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
})

// ── 消费方级（open-paper-anchor，INV-20 单入口接缝） ──────────────────

it('消费方级：带锚请求→locateAnchor 单入口（锚三元组+aiNoteId 透传；openPaper 不重复调）', async () => {
  openFromBus({
    paperId: 'p-1',
    anchor: { quoteText: 'q', prefixText: 'p', suffixText: 's', anchorPage: 2 },
    aiNoteId: 'a1'
  })
  await flush()
  expect(locateAnchorStub).toHaveBeenCalledWith({
    paperId: 'p-1',
    anchor: { quoteText: 'q', prefixText: 'p', suffixText: 's', anchorPage: 2 },
    aiNoteId: 'a1'
  })
  expect(openPaperStub).not.toHaveBeenCalled()
})

it('消费方级 LG-06：带 aiNoteId 锚请求→notifyAiNoteHighlight("a1") 先于 locateAnchor+定位照常', async () => {
  openFromBus({
    paperId: 'p-1',
    anchor: { quoteText: 'q', prefixText: 'p', suffixText: 's', anchorPage: 2 },
    aiNoteId: 'a1'
  })
  await flush()
  expect(notifyAiNoteStub).toHaveBeenCalledTimes(1)
  expect(notifyAiNoteStub).toHaveBeenCalledWith('a1')
  // 顺序：notify 先于 locateAnchor——面板信号早发（持久 state 非瞬态事件，
  // tab 未开/loading 期间不丢失，挂载后效应补切）
  expect(notifyAiNoteStub.mock.invocationCallOrder[0]).toBeDefined()
  expect(locateAnchorStub.mock.invocationCallOrder[0]).toBeDefined()
  expect(notifyAiNoteStub.mock.invocationCallOrder[0]!).toBeLessThan(
    locateAnchorStub.mock.invocationCallOrder[0]!
  )
  expect(locateAnchorStub).toHaveBeenCalledWith({
    paperId: 'p-1',
    anchor: { quoteText: 'q', prefixText: 'p', suffixText: 's', anchorPage: 2 },
    aiNoteId: 'a1'
  })
})

it('消费方级 LG-06：无 aiNoteId 锚请求（裸锚）→notifyAiNoteHighlight 不调（信号仅 AI 笔记跳转发）', async () => {
  openFromBus({
    paperId: 'p-1',
    anchor: { quoteText: 'q', prefixText: '', suffixText: '' }
  })
  await flush()
  expect(notifyAiNoteStub).not.toHaveBeenCalled()
  // 定位照常（既有透传形状：paperId/anchor/aiNoteId 三字段；OpenPaperRequest
  // 载荷无 annotationId——标注跳转不经本总线消费点）
  expect(locateAnchorStub).toHaveBeenCalledWith({
    paperId: 'p-1',
    anchor: { quoteText: 'q', prefixText: '', suffixText: '' },
    aiNoteId: undefined
  })
})

it('消费方级：无锚请求→openPaper 既有链路（locateAnchor 不介入）', async () => {
  openFromBus({ paperId: 'p-1' })
  await flush()
  expect(openPaperStub).toHaveBeenCalledWith('p-1')
  expect(locateAnchorStub).not.toHaveBeenCalled()
})

it('消费方级：页级降级（resolve page）静默——降级提示归 locateAnchor 内部，不重复 toast', async () => {
  locateAnchorStub.mockResolvedValue('page')
  openFromBus({ paperId: 'p-1', anchor: { quoteText: 'q', prefixText: '', suffixText: '' }, aiNoteId: 'a1' })
  await flush()
  expect(showToast).not.toHaveBeenCalled()
})

it('消费方级：无锚打开失败→动作型 toast（既有文案保持）', async () => {
  openPaperStub.mockRejectedValue(new Error('文件不存在'))
  openFromBus({ paperId: 'p-1' })
  await flush()
  expect(showToast).toHaveBeenCalledWith('文件不存在', 'error')
})

// ── SidePanel 组件级 ────────────────────────────────────────────────

it('文献节点四区渲染：元信息/核心 idea/AI 分节分色单源/人工笔记', async () => {
  stubApi.ai_sensor.listByPaper.mockResolvedValue({
    ok: true,
    data: [aiNote('a1', { question: 'Q1' }), aiNote('c1', { role: 'adjudicate', question: 'divergence' })]
  })
  stubApi.notes.get.mockResolvedValue({
    ok: true,
    data: { id: 'n1', paperId: 'paper-A', title: '', contentMd: '人工总评内容', createdAt: 't', updatedAt: 't' }
  })
  mount(<LineageSidePanel node={node('A', { coreIdea: '核心思想甲' })} onJumpToPaper={JUMP} />)
  await flush()
  expect(stubApi.ai_sensor.listByPaper).toHaveBeenCalledWith({ paperId: 'paper-A' })
  expect(stubApi.notes.get).toHaveBeenCalledWith({ paperId: 'paper-A' })
  // 区1 元信息（title/年份/绑定徽标）
  expect(q('[data-testid="lineage-side-meta"]')?.textContent).toContain('节点A')
  expect(q('[data-testid="lineage-side-meta"]')?.textContent).toContain('2020')
  expect(q('[data-testid="lineage-side-meta"]')?.getAttribute('data-binding')).toBe('paper')
  // 区2 核心 idea
  expect(q('[data-testid="lineage-side-idea"]')?.textContent).toContain('核心思想甲')
  // 区3 AI 分节：question 组中文标签+组内 role 标签+七问分色单源（SR2-AI-11 转置）
  const groups = Array.from(q('[data-testid="lineage-side-ai-notes"]')?.querySelectorAll('[data-question]') ?? [])
  expect(groups.map((g) => g.getAttribute('data-question'))).toEqual(['Q1', 'divergence'])
  expect(groups.map((g) => g.querySelector('h5')?.textContent)).toEqual(['第一问', '分歧报告'])
  expect(q('[data-ai-note-id="a1"]')?.textContent).toContain('一审')
  expect(q('[data-ai-note-id="c1"]')?.textContent).toContain('裁决')
  const dot = q('[data-ai-note-id="a1"] span[aria-hidden]') as HTMLElement
  expect(dot.style.background).toBe(QUESTION_COLOR.Q1)
  expect(q('[data-ai-note-id="a1"]')?.textContent).toContain('quote-a1')
  expect(q('[data-ai-note-id="a1"]')?.textContent).toContain('内容-a1')
  // 区4 人工笔记（总评层）
  expect(q('[data-testid="lineage-side-manual-note"]')?.textContent).toContain('人工总评内容')
})

it('主题节点：仅前两区+空态文案；笔记通道零调用', async () => {
  mount(<LineageSidePanel node={node('T', { paperId: null, year: null })} onJumpToPaper={JUMP} />)
  await flush()
  expect(q('[data-testid="lineage-side-idea"]')).not.toBeNull()
  expect(host?.textContent).toContain('主题节点无笔记')
  expect(stubApi.ai_sensor.listByPaper).not.toHaveBeenCalled()
  expect(stubApi.notes.get).not.toHaveBeenCalled()
})

it('AI 条目双击→onJumpToPaper 载荷含锚三元组+aiNoteId（anchorPage 1 基→0 基）', async () => {
  stubApi.ai_sensor.listByPaper.mockResolvedValue({ ok: true, data: [aiNote('a1')] })
  mount(<LineageSidePanel node={node('A')} onJumpToPaper={JUMP} />)
  await flush()
  dblClick(q('[data-ai-note-id="a1"]') as Element)
  expect(JUMP).toHaveBeenCalledWith({
    paperId: 'paper-A',
    anchor: { quoteText: 'quote-a1', prefixText: '', suffixText: '', anchorPage: 2 },
    aiNoteId: 'a1'
  })
})

it('无锚条目（无引文且无页码）→anchor 缺省（篇级防线）', async () => {
  stubApi.ai_sensor.listByPaper.mockResolvedValue({
    ok: true,
    data: [aiNote('a1', { quoteText: '', anchorPage: null })]
  })
  mount(<LineageSidePanel node={node('A')} onJumpToPaper={JUMP} />)
  await flush()
  dblClick(q('[data-ai-note-id="a1"]') as Element)
  expect(JUMP).toHaveBeenCalledWith({ paperId: 'paper-A', anchor: undefined, aiNoteId: 'a1' })
})

it('有页码无引文→anchor 保留页码（页级跳转不回退第 0 页）', async () => {
  stubApi.ai_sensor.listByPaper.mockResolvedValue({
    ok: true,
    data: [aiNote('a1', { quoteText: '', anchorPage: 3 })]
  })
  mount(<LineageSidePanel node={node('A')} onJumpToPaper={JUMP} />)
  await flush()
  dblClick(q('[data-ai-note-id="a1"]') as Element)
  expect(JUMP).toHaveBeenCalledWith({
    paperId: 'paper-A',
    anchor: { quoteText: '', prefixText: '', suffixText: '', anchorPage: 2 },
    aiNoteId: 'a1'
  })
})

it('条目单击不触发跳转（双击显式语义——防误触）', async () => {
  stubApi.ai_sensor.listByPaper.mockResolvedValue({ ok: true, data: [aiNote('a1')] })
  mount(<LineageSidePanel node={node('A')} onJumpToPaper={JUMP} />)
  await flush()
  click(q('[data-ai-note-id="a1"]') as Element)
  expect(JUMP).not.toHaveBeenCalled()
})

it('AI 取数失败→error+重试按钮；重试成功恢复呈现（INV-02 列表型）', async () => {
  stubApi.ai_sensor.listByPaper.mockRejectedValueOnce(new Error('数据库占用'))
  mount(<LineageSidePanel node={node('A')} onJumpToPaper={JUMP} />)
  await flush()
  const err = q('[data-testid="lineage-side-ai-error"]')
  expect(err?.getAttribute('role')).toBe('alert')
  expect(err?.textContent).toContain('AI 笔记加载失败：数据库占用')
  stubApi.ai_sensor.listByPaper.mockResolvedValueOnce({ ok: true, data: [aiNote('a1')] })
  const retry = err?.querySelector('button[data-action="retry"]') as HTMLButtonElement
  act(() => {
    retry.click()
  })
  await flush()
  expect(stubApi.ai_sensor.listByPaper).toHaveBeenCalledTimes(2)
  expect(q('[data-ai-note-id="a1"]')).not.toBeNull()
  expect(q('[data-testid="lineage-side-ai-error"]')).toBeNull()
})

it('人工笔记取数失败→error+重试（与 AI 面独立）', async () => {
  stubApi.notes.get.mockRejectedValueOnce(new Error('IO 失败'))
  mount(<LineageSidePanel node={node('A')} onJumpToPaper={JUMP} />)
  await flush()
  const err = q('[data-testid="lineage-side-note-error"]')
  expect(err?.textContent).toContain('人工笔记加载失败：IO 失败')
  expect(q('[data-testid="lineage-side-ai-error"]')).toBeNull()
  stubApi.notes.get.mockResolvedValueOnce({
    ok: true,
    data: { id: 'n1', paperId: 'paper-A', title: '', contentMd: '补取内容', createdAt: 't', updatedAt: 't' }
  })
  const retry = err?.querySelector('button[data-action="retry"]') as HTMLButtonElement
  act(() => {
    retry.click()
  })
  await flush()
  expect(q('[data-testid="lineage-side-manual-note"]')?.textContent).toContain('补取内容')
})

it('空数据：AI 空态+人工 null 空态（非错误）', async () => {
  mount(<LineageSidePanel node={node('A')} onJumpToPaper={JUMP} />)
  await flush()
  expect(q('[data-testid="lineage-side-ai-notes"]')?.textContent).toContain('暂无 AI 笔记')
  expect(q('[data-testid="lineage-side-manual-note"]')?.textContent).toContain('暂无人工笔记')
})

it('未选中节点→空态提示', async () => {
  mount(<LineageSidePanel node={null} onJumpToPaper={JUMP} />)
  await flush()
  expect(host?.textContent).toContain('单击节点查看详情')
  expect(stubApi.ai_sensor.listByPaper).not.toHaveBeenCalled()
})

it('换节点 stale 守卫：晚到的旧节点响应不覆盖新节点数据', async () => {
  let resolveOld: (v: { ok: boolean; data: AiNote[] }) => void = () => undefined
  stubApi.ai_sensor.listByPaper
    .mockImplementationOnce(() => new Promise((r) => { resolveOld = r }))
    .mockResolvedValueOnce({ ok: true, data: [aiNote('b1', { paperId: 'paper-B', quoteText: 'quote-b' })] })
  mount(<LineageSidePanel node={node('A')} onJumpToPaper={JUMP} />)
  await flush()
  act(() => {
    root?.render(<LineageSidePanel node={node('B')} onJumpToPaper={JUMP} />)
  })
  await flush()
  expect(q('[data-ai-note-id="b1"]')).not.toBeNull()
  act(() => {
    resolveOld({ ok: true, data: [aiNote('a-old', { quoteText: 'late' })] })
  })
  await flush()
  expect(q('[data-ai-note-id="a-old"]')).toBeNull()
  expect(q('[data-ai-note-id="b1"]')).not.toBeNull()
})

// ── Page 编排级（全链：单击→侧板→双击→总线锚载荷） ────────────────────

async function mountPage(): Promise<void> {
  stubApi.lineage.graph.mockResolvedValue({
    ok: true,
    data: {
      nodes: [node('A', { coreIdea: 'idea-A' }), node('T', { paperId: null })],
      edges: []
    }
  })
  mount(<LineagePage />)
  await flush()
  const el = q('[data-node-id="A"]')
  if (el === null) throw new Error('节点 A 未渲染')
  clickNode(el)
  await flush()
}

it('Page 全链：单击节点→侧板挂载呈现节点+Canvas 选中视觉态兑现', async () => {
  await mountPage()
  expect(q('[data-testid="lineage-side-panel"]')?.textContent).toContain('节点A')
  expect(q('[data-node-id="A"] rect')?.getAttribute('data-selected')).toBe('true')
  expect(q('[data-node-id="T"] rect')?.getAttribute('data-selected')).toBe('false')
})

it('Page 全链：AI 条目双击→requestOpenPaperAnchored 锚载荷（0 基页）', async () => {
  stubApi.ai_sensor.listByPaper.mockResolvedValue({ ok: true, data: [aiNote('a1')] })
  await mountPage()
  dblClick(q('[data-ai-note-id="a1"]') as Element)
  expect(requestAnchoredStub).toHaveBeenCalledWith({
    paperId: 'paper-A',
    anchor: { quoteText: 'quote-a1', prefixText: '', suffixText: '', anchorPage: 2 },
    aiNoteId: 'a1'
  })
})

it('Page 全链：无锚条目双击→载荷 anchor 缺省（仅开篇）', async () => {
  stubApi.ai_sensor.listByPaper.mockResolvedValue({
    ok: true,
    data: [aiNote('a1', { quoteText: '', anchorPage: null })]
  })
  await mountPage()
  dblClick(q('[data-ai-note-id="a1"]') as Element)
  expect(requestAnchoredStub).toHaveBeenCalledWith({ paperId: 'paper-A', aiNoteId: 'a1' })
})
