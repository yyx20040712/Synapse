// @vitest-environment jsdom
/**
 * [SR2-C-04] OutlineAside —— 侧栏三栏宿主（测试：锁定合约）
 *
 * 覆盖：三项 tablist 渲染与切换/选中记忆/笔记 tab 挂 ReaderNotesPanel/目录跳页
 * 经 reader.store（props 削减后自取）/片段单击页级定位（C-05 升级前接缝）/
 * 空态。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { guardedDescribe } from '../../utils/guard'
import { makeApiStub } from '../../utils/api-client-mock'
import { makeTab } from '../../utils/factories'

// [F-DBCAMP-01 U3] ai_sessions 桩：本文件覆盖缺省桩（同键后写者胜）——
// open/listMessages 恒 ok 空回包（AI 页签用例断言面）
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

import { OutlineAside } from '../../../src/renderer/features/reader/panels/OutlineAside'
import { useReaderStore } from '../../../src/renderer/features/reader/state/reader.store'
import type { Annotation } from '../../../src/shared/models/annotation'

// jsdom 无 IntersectionObserver（缩略图懒渲染依赖）——最小桩（永不触发回调=不渲染图）
class IntersectionObserverStub {
  observe(): void {}
  disconnect(): void {}
  unobserve(): void {}
}
globalThis.IntersectionObserver = IntersectionObserverStub as unknown as typeof IntersectionObserver

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

/** duck-typed pdfjs 文档句柄（目录一项，目的地=显式页号 3；getOutline=vi.fn 可计数） */
function fakeDoc(): unknown {
  return {
    getOutline: vi.fn(async () => [{ title: 'Section 1', dest: [3], items: [] }]),
    getPage: vi.fn(),
    getDestination: vi.fn(),
    getPageIndex: vi.fn(),
    numPages: 20
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
  return Array.from(host?.querySelectorAll('[data-testid="reader-aside"] [role="tab"]') ?? [])
}

beforeEach(() => {
  vi.clearAllMocks()
  stubApi.notes.get.mockResolvedValue({ ok: true, data: null })
  useReaderStore.setState({ tabs: { 'p-1': makeTab('p-1', { annotations: [ann('a-x', 7)], totalPages: 20 }) }, order: ['p-1'], activeId: 'p-1' })
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
})

guardedDescribe('SR2-C-04', 'OutlineAside —— 三栏宿主', () => {
  it('三项 tablist（目录/缩略图/笔记）；切换到笔记 tab 挂 ReaderNotesPanel；OutlinePanel 常驻（状态不丢）', async () => {
    const doc = fakeDoc()
    mount(<OutlineAside pdfDoc={doc} onCollapse={() => undefined} />)
    const labels = tabsOf().map((b) => b.textContent)
    // [F-DBCAMP-01 U3] 第四页签 'ai'（label「AI 会话」）——数组随扩
    expect(labels).toEqual(['目录', '缩略图', '笔记', 'AI 会话'])
    expect(host?.querySelector('[data-testid="reader-notes-panel"]')).toBeNull()
    // 等目录树加载（getOutline 一次）
    await act(async () => {
      await Promise.resolve()
    })
    expect(host?.querySelector('[data-testid="reader-aside"] button[title="Section 1"]')).not.toBeNull()
    const outlineCalls = (doc as { getOutline: ReturnType<typeof vi.fn> }).getOutline.mock.calls.length
    act(() => {
      tabsOf()[2]?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(host?.querySelector('[data-testid="reader-notes-panel"]')).not.toBeNull()
    // 笔记态：OutlinePanel 仍挂载（CSS 隐藏——目录树保留在 DOM，W1 锚）
    expect(host?.querySelector('[data-testid="reader-aside"] button[title="Section 1"]')).not.toBeNull()
    // 切回目录：选中态恢复+不重新 getOutline（常驻不重挂，deepseek N1）
    act(() => {
      tabsOf()[0]?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(tabsOf()[0]?.getAttribute('aria-selected')).toBe('true')
    expect((doc as { getOutline: ReturnType<typeof vi.fn> }).getOutline.mock.calls.length).toBe(outlineCalls)
  })

  it('目录跳页经 reader.store（props 削减后自取）：点击目录项→setPage', async () => {
    mount(<OutlineAside pdfDoc={fakeDoc()} onCollapse={() => undefined} />)
    await act(async () => {
      await Promise.resolve()
    })
    const item = host?.querySelector('[data-testid="reader-aside"] button[title="Section 1"]') as HTMLButtonElement
    expect(item).not.toBeNull()
    await act(async () => {
      item.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await Promise.resolve()
    })
    expect(useReaderStore.getState().tabs['p-1']?.page).toBe(3)
  })

  it('片段单击页级定位（C-05 前接缝）：FragmentNotesList 条目点击→setPage(该标注页)', async () => {
    mount(<OutlineAside pdfDoc={fakeDoc()} onCollapse={() => undefined} />)
    act(() => {
      tabsOf()[2]?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    const entry = host?.querySelector('[data-fragment-id="a-x"] button') as HTMLButtonElement
    expect(entry).not.toBeNull()
    act(() => {
      entry.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(useReaderStore.getState().tabs['p-1']?.page).toBe(7)
  })

  it('空态：activeId=null 时笔记 tab 显示引导（不崩）', () => {
    useReaderStore.setState({ tabs: {}, order: [], activeId: null })
    mount(<OutlineAside pdfDoc={null} onCollapse={() => undefined} />)
    act(() => {
      tabsOf()[2]?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(host?.textContent).toContain('从文献库打开一篇文献后可写笔记')
  })
})

// [r1′ R2b] AI 页签用例提级裸 describe（always-active 口径——任务书 §四2 字面，
// K3 威胁不经 guardedDescribe 守卫）；[R2a] OutlinePanel 常驻断言改真锁
// （目录树本体锚——k3-W2：reader-aside 根容器恒真废锚退役）
describe('[F-DBCAMP-01 U3] OutlineAside AI 会话页签（always-active）', () => {
  it('切换挂 PaperAiPanel（有锚 open→空会话子态）；OutlinePanel 常驻真锁；activeId=null 空态占位不调 IPC', async () => {
    const doc = fakeDoc()
    mount(<OutlineAside pdfDoc={doc} onCollapse={() => undefined} />)
    // 等目录树加载（getOutline 一次）——Section 1 按钮=OutlinePanel 本体锚
    await act(async () => {
      await Promise.resolve()
    })
    const outlineAnchor = '[data-testid="reader-aside"] button[title="Section 1"]'
    expect(host?.querySelector(outlineAnchor), '切换前目录树本体在场').not.toBeNull()
    act(() => {
      tabsOf()[3]?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(host?.querySelector('[data-testid="ai-session-panel"]'), 'PaperAiPanel 挂载').not.toBeNull()
    // [R2a] 常驻真锁：'ai' 态与 notes 同待遇仅 CSS 隐藏——目录树本体仍在 DOM
    // （卸载即消失；根容器在场为恒真废锚已退役）
    expect(host?.querySelector(outlineAnchor), 'OutlinePanel 本体仍在 DOM（display:none 非卸载）').not.toBeNull()
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

    // 无锚空态：activeId=null →「先打开一篇文献」占位（不调 IPC）
    useReaderStore.setState({ tabs: {}, order: [], activeId: null })
    await act(async () => {
      for (let i = 0; i < 4; i += 1) await Promise.resolve()
    })
    expect(host?.textContent).toContain('先打开一篇文献')
    expect(host?.querySelector('[data-testid="ai-session-panel"]'), '无锚不挂会话壳').toBeNull()
    expect(stubApi.ai_sessions.open, '空态零新增 IPC').toHaveBeenCalledTimes(1)
  })
})
