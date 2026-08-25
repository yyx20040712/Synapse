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
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { Annotation } from '../../../src/shared/models/annotation'
import type * as clientModule from '../../../src/renderer/api/client'
import type * as toastModule from '../../../src/renderer/shared/ui/Toast'
import { guardedDescribe } from '../../utils/guard'

const { stubApi } = vi.hoisted(() => ({
  stubApi: { notes: { get: vi.fn(), save: vi.fn() } }
}))
vi.mock('../../../src/renderer/api/client', async (importOriginal) => {
  const real = await importOriginal<typeof clientModule>()
  return { ...real, api: stubApi as unknown as typeof clientModule.api }
})
vi.mock('../../../src/renderer/shared/ui/Toast', async (importOriginal) => {
  const real = await importOriginal<typeof toastModule>()
  return { ...real, showToast: vi.fn() }
})

import { OutlineAside } from '../../../src/renderer/features/reader/OutlineAside'
import { useReaderStore, type TabState } from '../../../src/renderer/features/reader/reader.store'

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

function makeTab(id: string, annotations: Annotation[] = []): TabState {
  return {
    paperId: id,
    fileUrl: `app-file://${id}`,
    fileName: `${id}.pdf`,
    page: 0,
    totalPages: 20,
    zoom: 1,
    color: 'yellow',
    annotations,
    status: 'ready',
    dirty: false
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
  useReaderStore.setState({ tabs: { 'p-1': makeTab('p-1', [ann('a-x', 7)]) }, order: ['p-1'], activeId: 'p-1' })
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
    expect(labels).toEqual(['目录', '缩略图', '笔记'])
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
