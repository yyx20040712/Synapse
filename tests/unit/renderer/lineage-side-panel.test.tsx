// @vitest-environment jsdom
/**
 * [LG-04→F-UIRES-03 B2] LineageSidePanel —— 节点侧板三节新序+片段双击跳
 * 阅读器组件测试（锁定合约，always-active——不经 guardedDescribe）。
 *
 * 覆盖（B2 口径）：文献节点三节新序=全文笔记→片段笔记→AI 评估与建议
 * （DOM 序断标题数组）/AI 双击链退役负锚（dblClick AI 条目零跳转——全应用
 * 唯一保留双击链=片段条目）/片段节（loading/error+重试/空态/条目形态
 * 色点+截断/双击载荷 spy 钉形 anchorPage=Annotation.page 0 基直传/stale
 * 守卫）/后置占位章退役负锚（lineage-side-postpone 不存在）/主题节点空态
 * （三通道零调用）/取数失败 error+重试（AI 面与全文面独立，INV-02 列表型）/
 * 空数据空态文案/换节点 stale 守卫/未选中空态/Page 编排全链（单击节点→
 * 侧板挂载→片段双击→requestOpenPaperAnchored 锚载荷）/[RR1-A] 两节三态
 * 文案字节级+[RR1-C] 键盘等价（Enter 载荷钉形/Space 不触发）+[RR1-D]
 * 排序集成（page×startOffset 双维乱→DOM 序断言）。消费方级 INV-20
 * （open-paper-anchor）4 例=[RR1] 拆出 lineage-open-bus.test.tsx
 * （主件 500 行红线——B1 tag-dropdown 拆件先例）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { AiNote } from '../../../src/shared/models/ai-note'
import type { Annotation } from '../../../src/shared/models/annotation'
import type { LineageNode } from '../../../src/shared/models/lineage'
import { makeApiStub, stubApiEvents } from '../../utils/api-client-mock'

const stubApi = makeApiStub({
  ai_sensor: { listByPaper: vi.fn() },
  notes: { get: vi.fn() },
  reader: { listAnnotations: vi.fn() },
  lineage: { graph: vi.fn() },
  // [F-FOLDER-02·B] LineagePage 页首图切换器文件夹域面
  folders: { list: vi.fn() }
})
stubApiEvents({
  onExportCorpus: vi.fn(() => () => undefined),
  onImportProgress: vi.fn(() => () => undefined),
  // [F-FOLDER-02·B] folders.changed 订阅面（mock 代理未覆盖键透传 undefined，
  // 切换器订阅直调即抛；生产面 preload 恒在场）
  onFoldersChanged: vi.fn(() => () => undefined)
})

const { openPaperStub, locateAnchorStub, requestAnchoredStub } = vi.hoisted(() => ({
  openPaperStub: vi.fn(),
  locateAnchorStub: vi.fn(),
  requestAnchoredStub: vi.fn()
}))

// 消费方级用例（[RR1] 拆出=tests/unit/renderer/lineage-open-bus.test.tsx——
// 主件 500 行红线拆分，B1 tag-dropdown 先例）：reader.store 仅需
// getState().openPaper（open-paper-anchor 面）；本件 mock 沿承供 Page 编排级
vi.mock('../../../src/renderer/features/reader/state/reader.store', () => ({
  useReaderStore: { getState: () => ({ openPaper: openPaperStub }) }
}))
vi.mock('../../../src/renderer/features/reader/anchors/anchor-locate', () => ({
  locateAnchor: locateAnchorStub
}))
// Page 编排用例：总线发送面 mock（消费方级用例不经它）
vi.mock('../../../src/renderer/shared/open-paper-bus', () => ({
  OPEN_PAPER_EVENT: 'synapse:open-paper',
  requestOpenPaper: vi.fn(),
  requestOpenPaperAnchored: requestAnchoredStub,
  takePendingOpenPaper: vi.fn(() => null)
}))

import { LineageSidePanel } from '../../../src/renderer/features/lineage/LineageSidePanel'
import { LineagePage } from '../../../src/renderer/features/lineage/LineagePage'
import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'
import { QUESTION_COLOR } from '../../../src/renderer/features/reader/anchors/ai-note-style'
import { COLOR_SWATCH } from '../../../src/renderer/features/reader/anchors/annotation-style'

function node(id: string, patch: Partial<LineageNode> = {}): LineageNode {
  return {
    id,
    paperId: `paper-${id}`,
    title: `节点${id}`,
    year: 2020,
    x: null,
    y: null,
    month: null,
    slot: null,
    folderId: '__main__',
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

/** 片段条目夹具（Annotation.page 0 基——B2 载荷直传口径） */
function ann(id: string, patch: Partial<Annotation> = {}): Annotation {
  return {
    id,
    paperId: 'paper-A',
    page: 2,
    kind: 'highlight',
    color: 'yellow',
    quoteText: `引文-${id}`,
    prefixText: '前置',
    suffixText: '后置',
    startOffset: 5,
    endOffset: 9,
    rects: [{ page: 2, x: 0.1, y: 0.1, w: 0.3, h: 0.02 }],
    comment: '',
    createdAt: '2026-05-01T00:00:00Z',
    updatedAt: '2026-05-01T00:00:00Z',
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

/** 单击时间线节点卡（[T3-P6 主控裁决 a] pointer 会话→click 派发——
 *  Timeline 卡 onClick 语义适配，断言意图保活） */
function clickNode(el: Element): void {
  click(el)
}

const JUMP = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  for (const fn of Object.values(stubApi.ai_sensor)) fn.mockReset()
  stubApi.notes.get.mockReset()
  stubApi.reader.listAnnotations.mockReset()
  stubApi.lineage.graph.mockReset()
  stubApi.ai_sensor.listByPaper.mockResolvedValue({ ok: true, data: [] })
  stubApi.notes.get.mockResolvedValue({ ok: true, data: null })
  stubApi.reader.listAnnotations.mockResolvedValue({ ok: true, data: [] })
  stubApi.lineage.graph.mockResolvedValue({ ok: true, data: { nodes: [], edges: [], lineTypeNames: ['待命名', '待命名', '待命名', '待命名', '待命名', '待命名'] } })
  locateAnchorStub.mockResolvedValue('exact')
  openPaperStub.mockResolvedValue(undefined)
  useLineageStore.setState({
    nodes: [],
    edges: [],
    status: 'loading',
    error: null,
    saveStatus: 'clean', // [②U1] 会话基线（saved→clean）
    lastWriteError: null,
    queue: [],
    flushing: false,
    undoStack: [],
    redoStack: []
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

// ── 消费方级（open-paper-anchor，INV-20 单入口接缝）：[RR1] 4 例拆出
//    lineage-open-bus.test.tsx（主件 500 行红线）——覆盖清单见该件头注 ──

// ── SidePanel 组件级 ────────────────────────────────────────────────

it('文献节点三节新序：全文笔记→片段笔记→AI 评估与建议（DOM 序断标题数组；[A3] core_idea 区负锚沿承）', async () => {
  stubApi.ai_sensor.listByPaper.mockResolvedValue({
    ok: true,
    data: [aiNote('a1', { question: 'Q1' }), aiNote('c1', { role: 'adjudicate', question: 'divergence' })]
  })
  stubApi.notes.get.mockResolvedValue({
    ok: true,
    data: { id: 'n1', paperId: 'paper-A', title: '', contentMd: '全文总评内容', createdAt: 't', updatedAt: 't' }
  })
  stubApi.reader.listAnnotations.mockResolvedValue({ ok: true, data: [ann('f1')] })
  mount(<LineageSidePanel node={node('A')} onJumpToPaper={JUMP} />)
  await flush()
  expect(stubApi.ai_sensor.listByPaper).toHaveBeenCalledWith({ paperId: 'paper-A' })
  expect(stubApi.notes.get).toHaveBeenCalledWith({ paperId: 'paper-A' })
  expect(stubApi.reader.listAnnotations).toHaveBeenCalledWith({ paperId: 'paper-A' })
  // 区1 元信息
  expect(q('[data-testid="lineage-side-meta"]')?.textContent).toContain('节点A')
  expect(q('[data-testid="lineage-side-meta"]')?.textContent).toContain('2020')
  expect(q('[data-testid="lineage-side-meta"]')?.getAttribute('data-binding')).toBe('paper')
  // [A3] 原「区2 核心 idea」整区随 core_idea 全退役删除——面板无该区（负锚）
  expect(q('[data-testid="lineage-side-idea"]')).toBeNull()
  // B2 三节新序=DOM 序（h4 标题数组）
  const h4s = Array.from(host?.querySelectorAll('h4') ?? []).map((h) => h.textContent)
  expect(h4s).toEqual(['全文笔记', '片段笔记', 'AI 评估与建议'])
  // 全文笔记（现名承「人工笔记」位——contentMd 呈现）
  expect(q('[data-testid="lineage-side-manual-note"]')?.textContent).toContain('全文总评内容')
  // 片段笔记条目（色点+1 基页码显示）
  expect(q('[data-testid="lineage-side-fragments"] [data-fragment-id="f1"]')).not.toBeNull()
  expect(q('[data-testid="lineage-side-fragments"]')?.textContent).toContain('p.3 · 高亮')
  // AI 评估与建议分色分组（question 组头+组内 role 标签——七问分色单源）
  const groups = Array.from(q('[data-testid="lineage-side-ai-notes"]')?.querySelectorAll('[data-question]') ?? [])
  expect(groups.map((g) => g.getAttribute('data-question'))).toEqual(['Q1', 'divergence'])
  expect(groups.map((g) => g.querySelector('h5')?.textContent)).toEqual(['第一问：核心 idea 是什么', '分歧报告'])
  expect(q('[data-ai-note-id="a1"]')?.textContent).toContain('一审')
  expect(q('[data-ai-note-id="c1"]')?.textContent).toContain('裁决')
  const dot = q('[data-ai-note-id="a1"] span[aria-hidden]') as HTMLElement
  expect(dot.style.background).toBe(QUESTION_COLOR.Q1)
  expect(q('[data-ai-note-id="a1"]')?.textContent).toContain('quote-a1')
  expect(q('[data-ai-note-id="a1"]')?.textContent).toContain('内容-a1')
})

it('主题节点：仅元信息区+空态文案；三通道零调用', async () => {
  mount(<LineageSidePanel node={node('T', { paperId: null, year: null })} onJumpToPaper={JUMP} />)
  await flush()
  expect(q('[data-testid="lineage-side-idea"]')).toBeNull() // [A3] 退役区不渲染
  expect(host?.textContent).toContain('主题节点无笔记')
  expect(stubApi.ai_sensor.listByPaper).not.toHaveBeenCalled()
  expect(stubApi.notes.get).not.toHaveBeenCalled()
  expect(stubApi.reader.listAnnotations).not.toHaveBeenCalled()
})

it('R2-LG11 侧板浅色化：白玻璃底+边；三节 h4 accent 左缘条；条目卡白底淡描边（防回退）', async () => {
  stubApi.ai_sensor.listByPaper.mockResolvedValue({ ok: true, data: [aiNote('a1', { question: 'Q1' })] })
  stubApi.reader.listAnnotations.mockResolvedValue({ ok: true, data: [ann('f1')] })
  mount(<LineageSidePanel node={node('A')} onJumpToPaper={JUMP} />)
  await flush()
  // 面板白玻璃底（R2-LG11 浅色严谨板）。backdrop-filter 在 jsdom 不入 style
  // 属性序列化（实证：仅 DOM 属性可读）——经 style.backdropFilter 属性断言
  const rootEl = q('[data-testid="lineage-side-panel"]') as HTMLElement
  // [F-CSS-03] 断言载体随 token 化迁移（值面由 theme.test.ts TOKENS 正锚独立锁定；
  // var() 载体在 jsdom style 序列化原样保留，无 CSSOM rgb 归一）
  expect(rootEl.getAttribute('style')).toContain('var(--panel-a92)')
  expect(rootEl.getAttribute('style')).toContain('var(--border)')
  expect(rootEl.style.backdropFilter).toBe('blur(12px)')
  // 三节 h4 accent 左缘条（B2 三节齐改——去金夜色）
  const h4s = Array.from(host?.querySelectorAll('h4') ?? [])
  expect(h4s.length).toBe(3)
  for (const h of h4s) {
    expect(h.getAttribute('style')).toContain('var(--accent)')
  }
  // AI 条目卡（白底 --panel+沿用淡描边 --note-border）
  const card = q('[data-ai-note-id="a1"]')?.getAttribute('style') ?? ''
  expect(card).toContain('var(--panel)')
  expect(card).toContain('var(--note-border)')
  // QUESTION_COLOR 左缘条零改锚（AI-08 分色单源不因换肤回退）
  expect(q('[data-question="Q1"] h5')?.getAttribute('style')).toContain(QUESTION_COLOR.Q1)
})

it('[B2] AI 双击链退役负锚：dblClick AI 条目→onJumpToPaper 不调（全应用唯一保留双击链=片段条目）', async () => {
  stubApi.ai_sensor.listByPaper.mockResolvedValue({ ok: true, data: [aiNote('a1')] })
  mount(<LineageSidePanel node={node('A')} onJumpToPaper={JUMP} />)
  await flush()
  dblClick(q('[data-ai-note-id="a1"]') as Element)
  expect(JUMP).not.toHaveBeenCalled()
})

it('AI 条目单击不触发跳转（纯展示——防误触）', async () => {
  stubApi.ai_sensor.listByPaper.mockResolvedValue({ ok: true, data: [aiNote('a1')] })
  mount(<LineageSidePanel node={node('A')} onJumpToPaper={JUMP} />)
  await flush()
  click(q('[data-ai-note-id="a1"]') as Element)
  expect(JUMP).not.toHaveBeenCalled()
})

it('片段节：loading→error（role=alert）+重试按钮→重试成功恢复呈现（INV-02 列表型）', async () => {
  stubApi.reader.listAnnotations.mockRejectedValueOnce(new Error('数据库占用'))
  mount(<LineageSidePanel node={node('A')} onJumpToPaper={JUMP} />)
  await flush()
  const err = q('[data-testid="lineage-side-fragments-error"]')
  expect(err?.getAttribute('role')).toBe('alert')
  expect(err?.textContent).toContain('片段笔记加载失败：数据库占用')
  stubApi.reader.listAnnotations.mockResolvedValueOnce({ ok: true, data: [ann('f1')] })
  const retry = err?.querySelector('button[data-action="retry"]') as HTMLButtonElement
  act(() => {
    retry.click()
  })
  await flush()
  expect(stubApi.reader.listAnnotations).toHaveBeenCalledTimes(2)
  expect(q('[data-testid="lineage-side-fragments"] [data-fragment-id="f1"]')).not.toBeNull()
  expect(q('[data-testid="lineage-side-fragments-error"]')).toBeNull()
})

it('片段节：空态文案（空数组非错误）', async () => {
  mount(<LineageSidePanel node={node('A')} onJumpToPaper={JUMP} />)
  await flush()
  expect(q('[data-testid="lineage-side-fragments"]')?.textContent).toContain('暂无片段笔记')
})

it('片段节：条目形态镜像 reader 域（kind 色点单源+1 基页码显示+引文/批注截断+title=comment||quoteText）+排序集成（page×startOffset 双维乱→DOM 序=sortByDocumentOrder 期望）', async () => {
  stubApi.reader.listAnnotations.mockResolvedValue({
    ok: true,
    data: [
      // 双维乱序固件（[k1-W5] 封「删排序调用仍绿」盲区）：f1=page 2/startOffset 1、
      // f2=page 1/startOffset 9——页优先（f2 前）且偏移反向（9>1 不救）——入参序
      // 与文档序全反，DOM 序只可能来自 sortByDocumentOrder 消费
      ann('f1', { kind: 'underline', color: 'blue', comment: '有批注', quoteText: '引文-f1', page: 2, startOffset: 1, endOffset: 5 }),
      ann('f2', {
        id: 'f2',
        kind: 'note',
        page: 1,
        startOffset: 9,
        endOffset: 13,
        quoteText: '长引文'.repeat(21),
        comment: '长批注'.repeat(30)
      })
    ]
  })
  mount(<LineageSidePanel node={node('A')} onJumpToPaper={JUMP} />)
  await flush()
  const section = q('[data-testid="lineage-side-fragments"]')
  // 排序集成断言：DOM 序=文档序（page 升序优先——f2(page1) 先于 f1(page2)，
  // 偏移反向不改变页优先级；删 sortByDocumentOrder 调用→入参序 ['f1','f2'] 即红）
  const items = Array.from(section?.querySelectorAll('[data-fragment-id]') ?? [])
  expect(items.map((el) => el.getAttribute('data-fragment-id'))).toEqual(['f2', 'f1'])
  // kind 色点=COLOR_SWATCH 单源（跨域受控例外——色点单源防双源）
  const dot = items[1]?.querySelector('span[aria-hidden]') as HTMLElement
  expect(dot.style.background).toBe(COLOR_SWATCH.blue)
  expect(items[1]?.textContent).toContain('p.3 · 下划线')
  expect(items[1]?.textContent).toContain('引文-f1')
  expect(items[1]?.textContent).toContain('有批注')
  // title=comment||quoteText
  expect(items[1]?.querySelector('button')?.getAttribute('title')).toBe('有批注')
  expect(items[0]?.querySelector('button')?.getAttribute('title')).toBe('长批注'.repeat(30))
  // 引文截断（EXCERPT_MAX=60——超长省略号收尾；截断镜像 reader 域 FragmentNotesList）
  const quote = items[0]?.querySelectorAll('span.block.truncate')[0]?.textContent ?? ''
  expect(quote.endsWith('…')).toBe(true)
  expect(quote.length).toBeLessThanOrEqual(61)
})

it('片段双击→onJumpToPaper 载荷钉形（anchorPage=Annotation.page 0 基直传——禁 ±1 换算；三元组透传）', async () => {
  stubApi.reader.listAnnotations.mockResolvedValue({ ok: true, data: [ann('f1')] })
  mount(<LineageSidePanel node={node('A')} onJumpToPaper={JUMP} />)
  await flush()
  // onDoubleClick 挂条目 button（形态镜像 reader 域——交互承载元素）
  dblClick(q('[data-fragment-id="f1"] button') as Element)
  expect(JUMP).toHaveBeenCalledTimes(1)
  expect(JUMP).toHaveBeenCalledWith({
    paperId: 'paper-A',
    anchor: { quoteText: '引文-f1', prefixText: '前置', suffixText: '后置', anchorPage: 2 }
  })
})

it('片段单击不触发跳转（双击显式语义——防误触，AI 节先例）', async () => {
  stubApi.reader.listAnnotations.mockResolvedValue({ ok: true, data: [ann('f1')] })
  mount(<LineageSidePanel node={node('A')} onJumpToPaper={JUMP} />)
  await flush()
  click(q('[data-fragment-id="f1"] button') as Element)
  expect(JUMP).not.toHaveBeenCalled()
})

it('[RR1-C] 片段条目 Enter=键盘等价路径→同一上抛单点（载荷钉形与双击同）；Space 不触发+[RR2] e.repeat 不触发', async () => {
  stubApi.reader.listAnnotations.mockResolvedValue({ ok: true, data: [ann('f1')] })
  mount(<LineageSidePanel node={node('A')} onJumpToPaper={JUMP} />)
  await flush()
  const btn = q('[data-fragment-id="f1"] button') as Element
  act(() => {
    btn.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
  })
  expect(JUMP).toHaveBeenCalledTimes(1)
  expect(JUMP).toHaveBeenCalledWith({
    paperId: 'paper-A',
    anchor: { quoteText: '引文-f1', prefixText: '前置', suffixText: '后置', anchorPage: 2 }
  })
  act(() => {
    btn.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
  })
  expect(JUMP).toHaveBeenCalledTimes(1) // Space 不触发（防误触口径沿承）
  // [RR2] 长按 Enter 自动重复（e.repeat=true）不连发跳转上抛
  act(() => {
    btn.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', repeat: true, bubbles: true }))
  })
  expect(JUMP).toHaveBeenCalledTimes(1)
})

it('片段节换节点 stale 守卫：晚到的旧节点响应不覆盖新节点条目', async () => {
  let resolveOld: (v: { ok: boolean; data: Annotation[] }) => void = () => undefined
  stubApi.reader.listAnnotations
    .mockImplementationOnce(() => new Promise((r) => { resolveOld = r }))
    .mockResolvedValueOnce({ ok: true, data: [ann('f-b', { id: 'f-b', paperId: 'paper-B' })] })
  mount(<LineageSidePanel node={node('A')} onJumpToPaper={JUMP} />)
  await flush()
  act(() => {
    root?.render(<LineageSidePanel node={node('B')} onJumpToPaper={JUMP} />)
  })
  await flush()
  expect(q('[data-testid="lineage-side-fragments"] [data-fragment-id="f-b"]')).not.toBeNull()
  act(() => {
    resolveOld({ ok: true, data: [ann('f-old', { id: 'f-old' })] })
  })
  await flush()
  expect(q('[data-testid="lineage-side-fragments"] [data-fragment-id="f-old"]')).toBeNull()
  expect(q('[data-testid="lineage-side-fragments"] [data-fragment-id="f-b"]')).not.toBeNull()
})

it('AI 取数失败→error+重试按钮；重试成功恢复呈现（INV-02 列表型）', async () => {
  stubApi.ai_sensor.listByPaper.mockRejectedValueOnce(new Error('数据库占用'))
  mount(<LineageSidePanel node={node('A')} onJumpToPaper={JUMP} />)
  await flush()
  const err = q('[data-testid="lineage-side-ai-error"]')
  expect(err?.getAttribute('role')).toBe('alert')
  expect(err?.textContent).toContain('AI 评估加载失败：数据库占用')
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

it('全文笔记取数失败→error+重试（与 AI 面独立）', async () => {
  stubApi.notes.get.mockRejectedValueOnce(new Error('IO 失败'))
  mount(<LineageSidePanel node={node('A')} onJumpToPaper={JUMP} />)
  await flush()
  const err = q('[data-testid="lineage-side-note-error"]')
  expect(err?.textContent).toContain('全文笔记加载失败：IO 失败')
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

it('空数据：AI 空态+全文 null 空态+片段空态（非错误）', async () => {
  mount(<LineageSidePanel node={node('A')} onJumpToPaper={JUMP} />)
  await flush()
  expect(q('[data-testid="lineage-side-ai-notes"]')?.textContent).toContain('暂无 AI 评估与建议')
  expect(q('[data-testid="lineage-side-manual-note"]')?.textContent).toContain('暂无全文笔记')
  expect(q('[data-testid="lineage-side-fragments"]')?.textContent).toContain('暂无片段笔记')
})

it('[RR1-A] 全文笔记节三态文案字节级：loading「全文笔记加载中…」（挂起取数期间）→落定空态「暂无全文笔记」（同例收口过渡）', async () => {
  let resolveNote: (v: { ok: boolean; data: unknown }) => void = () => undefined
  stubApi.notes.get.mockImplementationOnce(() => new Promise((r) => { resolveNote = r }))
  mount(<LineageSidePanel node={node('A')} onJumpToPaper={JUMP} />)
  await flush()
  expect(q('[data-testid="lineage-side-manual-note"]')?.textContent).toContain('全文笔记加载中…')
  act(() => {
    resolveNote({ ok: true, data: null })
  })
  await flush()
  expect(q('[data-testid="lineage-side-manual-note"]')?.textContent).toContain('暂无全文笔记')
})

it('[RR1-A] AI 评估与建议节三态文案字节级：loading「AI 评估加载中…」（挂起取数期间）→落定空态「暂无 AI 评估与建议」（loading=「AI 评估」短名/空态=「AI 评估与建议」全名——票面不对称保真；error 态字节级由既有「AI 取数失败」例锁定）', async () => {
  let resolveAi: (v: { ok: boolean; data: AiNote[] }) => void = () => undefined
  stubApi.ai_sensor.listByPaper.mockImplementationOnce(() => new Promise((r) => { resolveAi = r }))
  mount(<LineageSidePanel node={node('A')} onJumpToPaper={JUMP} />)
  await flush()
  expect(q('[data-testid="lineage-side-ai-notes"]')?.textContent).toContain('AI 评估加载中…')
  act(() => {
    resolveAi({ ok: true, data: [] })
  })
  await flush()
  expect(q('[data-testid="lineage-side-ai-notes"]')?.textContent).toContain('暂无 AI 评估与建议')
})

it('未选中节点→空态提示（[②U4/P-16] 占位文案=「点击卡片查看详情」）', async () => {
  mount(<LineageSidePanel node={null} onJumpToPaper={JUMP} />)
  await flush()
  expect(host?.textContent).toContain('点击卡片查看详情')
  expect(stubApi.ai_sensor.listByPaper).not.toHaveBeenCalled()
})

it('换节点 stale 守卫（AI 面）：晚到的旧节点响应不覆盖新节点数据', async () => {
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

it('[B2] 后置占位章退役：lineage-side-postpone 不存在+退役文案零命中（真节已替代）', async () => {
  mount(<LineageSidePanel node={node('A')} onJumpToPaper={JUMP} />)
  await flush()
  expect(q('[data-testid="lineage-side-postpone"]')).toBeNull()
  // 退役文案分段构造（负锚断言不落整词字面量——src+tests 词面零命中口径）
  const retiredBody = ['评估功能', '后置'].join('')
  const retiredHeading = ['AI ', '评 ', '估 ', '笔 ', '记'].join('')
  expect(host?.textContent).not.toContain(retiredBody)
  expect(host?.textContent).not.toContain(retiredHeading)
  // 真节在场（AI 评估与建议——被③替代证据）
  expect(q('[data-testid="lineage-side-ai-notes"]')?.textContent).toContain('AI 评估与建议')
})

// ── [F-UIRES-03 B5①] 头部操作行渲染族+[B5②] Page 手柄键盘接线=拆出
//    lineage-side-jumps.test.tsx（主件 500 行红线——B1 tag-dropdown 拆件先例）──

// ── Page 编排级（全链：单击→侧板→片段双击→总线锚载荷） ──────────────────

async function mountPage(): Promise<void> {
  stubApi.lineage.graph.mockResolvedValue({
    ok: true,
    data: {
      nodes: [node('A'), node('T', { paperId: null })],
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

it('Page 全链：单击节点→侧板挂载呈现节点+Timeline 选中视觉态兑现', async () => {
  await mountPage()
  expect(q('[data-testid="lineage-side-panel"]')?.textContent).toContain('节点A')
  // [T3-P6 主控裁决 a] SVG rect[data-selected]→DOM 卡 .sel 类（选择器适配）
  expect(q('[data-node-id="A"]')?.classList.contains('sel')).toBe(true)
  expect(q('[data-node-id="T"]')?.classList.contains('sel')).toBe(false)
})

it('Page 全链：片段条目双击→requestOpenPaperAnchored 锚载荷（anchorPage 0 基直传）', async () => {
  stubApi.reader.listAnnotations.mockResolvedValue({ ok: true, data: [ann('f1')] })
  await mountPage()
  dblClick(q('[data-fragment-id="f1"] button') as Element)
  expect(requestAnchoredStub).toHaveBeenCalledWith({
    paperId: 'paper-A',
    anchor: { quoteText: '引文-f1', prefixText: '前置', suffixText: '后置', anchorPage: 2 }
  })
})
