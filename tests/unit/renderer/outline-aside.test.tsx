// @vitest-environment jsdom
/**
 * [SR2-C-04] OutlineAside —— 左侧栏宿主（测试：锁定合约；[B1 批] 结构迁移
 * 重写：笔记/AI 页签迁右栏研究面板 ResearchAside——本件页签只剩 目录/缩略图，
 * 笔记/AI/收起钮/locateFragment/noteHighlight 用例随面退役迁出）。
 *
 * 覆盖：两项 tablist 渲染与切换/选中记忆/OutlinePanel 常驻（目录树跨切换
 * 不重挂）/目录跳页经 reader.store（props 削减后自取）/aside 内不再有
 * 笔记与 AI 面板（B1 迁移负锚）/空态。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { guardedDescribe } from '../../utils/guard'
import { makeApiStub } from '../../utils/api-client-mock'
import { makeTab } from '../../utils/factories'

const stubApi = makeApiStub({ notes: { get: vi.fn(), save: vi.fn() } })
void stubApi

import { OutlineAside } from '../../../src/renderer/features/reader/panels/OutlineAside'
import { useReaderStore } from '../../../src/renderer/features/reader/state/reader.store'

// jsdom 无 IntersectionObserver（缩略图懒渲染依赖）——最小桩（永不触发回调=不渲染图）
class IntersectionObserverStub {
  observe(): void {}
  disconnect(): void {}
  unobserve(): void {}
}
globalThis.IntersectionObserver = IntersectionObserverStub as unknown as typeof IntersectionObserver

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
  useReaderStore.setState({ tabs: { 'p-1': makeTab('p-1', { totalPages: 20 }) }, order: ['p-1'], activeId: 'p-1' })
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
})

guardedDescribe('SR2-C-04', 'OutlineAside —— 左侧栏宿主（B1 迁移后）', () => {
  it('两项 tablist（目录/缩略图）；OutlinePanel 常驻（目录树状态不丢）；aside 内无笔记/AI 面板', async () => {
    const doc = fakeDoc()
    mount(<OutlineAside pdfDoc={doc} />)
    const labels = tabsOf().map((b) => b.textContent)
    // [B1 批] 笔记/AI 页签迁右栏研究面板——数组收缩为两项
    expect(labels).toEqual(['目录', '缩略图'])
    expect(host?.querySelector('[data-testid="reader-notes-panel"]'), 'B1 迁移负锚：笔记面板不在左栏').toBeNull()
    expect(host?.querySelector('[data-testid="ai-session-panel"]'), 'B1 迁移负锚：AI 面板不在左栏').toBeNull()
    // 等目录树加载（getOutline 一次）
    await act(async () => {
      await Promise.resolve()
    })
    expect(host?.querySelector('[data-testid="reader-aside"] button[title="Section 1"]')).not.toBeNull()
    const outlineCalls = (doc as { getOutline: ReturnType<typeof vi.fn> }).getOutline.mock.calls.length
    // 切缩略图：OutlinePanel 组件常驻（mode prop 切换不重挂——缩略图视图下
    // 目录树条件渲染让位，getOutline 不重发）
    act(() => {
      tabsOf()[1]?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(tabsOf()[1]?.getAttribute('aria-selected')).toBe('true')
    expect((doc as { getOutline: ReturnType<typeof vi.fn> }).getOutline.mock.calls.length).toBe(outlineCalls)
    // 切回目录：选中态恢复+目录树回显（组件未重挂，outline 态驻组件）
    act(() => {
      tabsOf()[0]?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(tabsOf()[0]?.getAttribute('aria-selected')).toBe('true')
    expect(host?.querySelector('[data-testid="reader-aside"] button[title="Section 1"]')).not.toBeNull()
    expect((doc as { getOutline: ReturnType<typeof vi.fn> }).getOutline.mock.calls.length).toBe(outlineCalls)
  })

  it('目录跳页经 reader.store（props 削减后自取）：点击目录项→setPage', async () => {
    mount(<OutlineAside pdfDoc={fakeDoc()} />)
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

  it('空态：activeId=null 时目录空态渲染（不崩）', () => {
    useReaderStore.setState({ tabs: {}, order: [], activeId: null })
    mount(<OutlineAside pdfDoc={null} />)
    expect(tabsOf().map((b) => b.textContent)).toEqual(['目录', '缩略图'])
  })
})
