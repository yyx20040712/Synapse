// @vitest-environment jsdom
/**
 * [B1 批] ResearchAside —— 右栏研究面板宿主（测试：锁定合约）
 *
 * 覆盖：两页签（AI 对话/笔记）tablist 渲染与 store 驱动切换（researchTab 驻
 * TabState）/默认 ai 挂 PaperAiPanel（open scope='paper' IPC 面——语义自
 * outline-aside.test 旧 AI 页签用例迁移）/切 notes 挂 ReaderNotesPanel 且
 * ai 面卸载（切页签即卸载——INV-106 草稿面条件挂载模式）/noteHighlight
 * 高亮参数纯派生（「开面板+切页签」副作用驻常挂载层，装配面归
 * reader-research-assembly.test.tsx——[B1 审查回炉 B-1]）/片段单击定位经
 * anchor-locate（INV-20 单入口）/空态不崩。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub } from '../../utils/api-client-mock'
import { makeTab } from '../../utils/factories'

// ai_sessions 桩（paper 档形状——AI 页签用例断言面，沿 outline-aside.test
// 旧配方迁移；覆盖缺省桩同键后写者胜）
const stubApi = makeApiStub({
  notes: { get: vi.fn(), save: vi.fn() },
  ai_sessions: {
    open: vi.fn(async () => ({
      ok: true as const,
      data: {
        session: {
          id: 1,
          scope: 'paper' as const,
          anchorId: 'p-1',
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z'
        }
      }
    })),
    listMessages: vi.fn(async () => ({ ok: true as const, data: { messages: [] } }))
  }
})

import { ResearchAside } from '../../../src/renderer/features/reader/panels/ResearchAside'
import { useReaderStore } from '../../../src/renderer/features/reader/state/reader.store'
import type { Annotation } from '../../../src/shared/models/annotation'

function ann(id: string, page: number): Annotation {
  return {
    id,
    paperId: 'p-1',
    page,
    kind: 'highlight',
    color: 'yellow',
    quoteText: `quote-${id}`,
    prefixText: '',
    suffixText: '',
    startOffset: 0,
    endOffset: 1,
    rects: [],
    comment: '',
    createdAt: '2026-05-01T00:00:00Z',
    updatedAt: '2026-05-01T00:00:00Z'
  }
}

let root: Root | null = null
let host: HTMLDivElement | null = null

function mount(node: JSX.Element): void {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root?.render(node)
  })
}

function tabsOf(): HTMLElement[] {
  return Array.from(host?.querySelectorAll('[data-testid="reader-research"] [role="tab"]') ?? [])
}

// jsdom 无 scrollIntoView（FragmentNotesList 高亮滚动宿主 API 缺位——
// library-cards 等同口径最小桩）
Element.prototype.scrollIntoView = () => undefined

beforeEach(() => {
  vi.clearAllMocks()
  stubApi.notes.get.mockResolvedValue({ ok: true, data: null })
  useReaderStore.setState({
    tabs: { 'p-1': makeTab('p-1', { annotations: [ann('a-x', 7)], totalPages: 20 }) },
    order: ['p-1'],
    activeId: 'p-1',
    researchOpen: true,
    // noteHighlight=瞬态信号跨用例复位（残留会让挂载即闪切 notes——
    // F-ARCH1 语义，污染后续用例的默认 ai 断言）
    noteHighlight: null
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

// B1 批结构迁移无独立工单号——always-active 裸 describe（reader.store.test
// F-ARCH1 族先例；K3 威胁不适用：无工单即无状态可翻）
describe('B1 ResearchAside —— 右栏研究面板宿主', () => {
  it('两页签（AI 对话/笔记）；默认 ai 挂 PaperAiPanel；切 notes 挂 ReaderNotesPanel 且 ai 面卸载（researchTab 写 store）', () => {
    mount(<ResearchAside />)
    expect(tabsOf().map((b) => b.textContent)).toEqual(['AI 对话', '笔记'])
    expect(tabsOf()[0]?.getAttribute('aria-selected')).toBe('true')
    expect(host?.querySelector('[data-testid="ai-session-panel"]'), '默认 ai 页签挂 PaperAiPanel').not.toBeNull()
    expect(host?.querySelector('[data-testid="reader-notes-panel"]')).toBeNull()
    act(() => {
      tabsOf()[1]?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(host?.querySelector('[data-testid="reader-notes-panel"]'), '切 notes 挂 ReaderNotesPanel').not.toBeNull()
    expect(host?.querySelector('[data-testid="ai-session-panel"]'), 'ai 面卸载（切页签即卸载——INV-106）').toBeNull()
    expect(useReaderStore.getState().tabs['p-1']?.researchTab).toBe('notes')
    // 切回 ai：页签态经 store 驻留（面板互换）
    act(() => {
      tabsOf()[0]?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(host?.querySelector('[data-testid="ai-session-panel"]')).not.toBeNull()
    expect(useReaderStore.getState().tabs['p-1']?.researchTab).toBe('ai')
  })

  it('noteHighlight 高亮派生（纯渲染面）：notes 页签在场时 highlightAnnotationId 透传条目；ai 页签不挂笔记面', () => {
    // [B1 审查回炉 B-1] 「开面板+切页签」副作用驻常挂载层 ReaderPageView——
    // 组件级直挂不再断言 researchOpen/researchTab（装配面归
    // reader-research-assembly.test.tsx，消灭绕装配条件的假绿路径）；本用例
    // 锁组件残余职责：noteHighlight.annotationId → 条目高亮纯派生
    mount(<ResearchAside />)
    useReaderStore.setState({ noteHighlight: { annotationId: 'a-x', seq: 1 } })
    // 页签态经 store 驻留：切 notes 后高亮参数到达条目（FragmentNotesList 消费面）
    act(() => {
      tabsOf()[1]?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(host?.querySelector('[data-fragment-id="a-x"]')?.getAttribute('data-highlight')).toBe('true')
    // 高亮参数不驱动组件内页签切换（副作用已上移——切回 ai 后笔记面卸载）
    act(() => {
      tabsOf()[0]?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(host?.querySelector('[data-testid="reader-notes-panel"]')).toBeNull()
  })

  it('片段单击定位（INV-20 单入口）：FragmentNotesList 条目点击→locateAnchor→setPage(该标注页)', async () => {
    mount(<ResearchAside />)
    act(() => {
      tabsOf()[1]?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    const entry = host?.querySelector('[data-fragment-id="a-x"] button') as HTMLButtonElement
    expect(entry).not.toBeNull()
    await act(async () => {
      entry.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await Promise.resolve()
    })
    expect(useReaderStore.getState().tabs['p-1']?.page).toBe(7)
  })

  it('空态：activeId=null 时默认 ai 页签显示引导（setResearchTab no-op——store 空态规约，不崩）', () => {
    useReaderStore.setState({ tabs: {}, order: [], activeId: null })
    mount(<ResearchAside />)
    expect(host?.textContent).toContain('先打开一篇文献')
    // activeId=null：setResearchTab no-op（与 setPage 等空态规约一致）——
    // 页签点击不切（生产面 ResearchAside 仅在有文档时挂载，本用例锁防御行为）
    act(() => {
      tabsOf()[1]?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(host?.textContent).toContain('先打开一篇文献')
  })
})

// AI IPC 面用例（always-active——沿 outline-aside.test 旧 r1′ R2b 口径迁移：
// K3 威胁不经 guardedDescribe 守卫）
describe('[B1] ResearchAside AI 对话页签（always-active）', () => {
  it('默认挂 PaperAiPanel：锚=activeTab.paperId 挂载即 open(scope=paper)→空会话子态；activeId=null 空态占位不调 IPC', async () => {
    mount(<ResearchAside />)
    expect(host?.querySelector('[data-testid="ai-session-panel"]'), 'PaperAiPanel 挂载').not.toBeNull()
    // 链路排空（open→listMessages 两跳）→ ready 空消息=「暂无会话消息」+置灰发送框
    await act(async () => {
      for (let i = 0; i < 8; i += 1) await Promise.resolve()
    })
    expect(host?.textContent).toContain('暂无会话消息')
    const composer = host?.querySelector('input[aria-label="对话输入"]') as HTMLInputElement | null
    expect(composer, '置灰发送框在场').not.toBeNull()
    expect(composer!.value, '说明文案驻框内（同形承载）').toBe('对话能力将在后续版本接入')
    expect(composer!.disabled, '输入框恒置灰').toBe(true)
    expect(stubApi.ai_sessions.open, '锚=activeTab.paperId（挂载即 open）').toHaveBeenCalledWith({
      scope: 'paper',
      anchorId: 'p-1'
    })

    // 无锚空态：activeId=null → PaperAiPanel「先打开一篇文献」占位（不调 IPC）
    useReaderStore.setState({ tabs: {}, order: [], activeId: null })
    await act(async () => {
      for (let i = 0; i < 4; i += 1) await Promise.resolve()
    })
    expect(host?.textContent).toContain('先打开一篇文献')
    expect(host?.querySelector('[data-testid="ai-session-panel"]'), '无锚不挂会话壳').toBeNull()
    expect(stubApi.ai_sessions.open, '空态零新增 IPC').toHaveBeenCalledTimes(1)
  })
})
