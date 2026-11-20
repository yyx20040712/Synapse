// @vitest-environment jsdom
/**
 * [B1 审查回炉 B-1] noteHighlight 自动展开装配测试（always-active）。
 *
 * 锁定行为：标注单击反向同步（C-05 N1 方案a）的「开面板+切页签」副作用必须
 * 驻常挂载层（ReaderPageView——researchOpen 挂载条件的拥有层）。回炉前缺陷：
 * 副作用驻 ResearchAside 内而该组件仅 researchOpen=true 时挂载——面板收起即
 * 无订阅者，点标注无任何反应（组件级直挂测试绕过装配条件呈假绿）。
 *
 * 生产装配条件复现：渲染整件 <ReaderPage />（store 布态 researchOpen=false +
 * ready tab），notifyNoteHighlight → 断言右栏出现+笔记页签选中+高亮传递。
 * mock 面（reader-page-open-race.test.tsx 配方同族）：api/client 桩+
 * PdfDocProvider/PageColumn 渲染管线隔离（本测断言面=研究面板，不涉 PDF 渲染）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub } from '../../utils/api-client-mock'
import { makeTab } from '../../utils/factories'

makeApiStub({
  reader: { open: vi.fn(), listAnnotations: vi.fn(), saveProgress: vi.fn() },
  notes: { get: vi.fn(async () => ({ ok: true as const, data: null })), save: vi.fn() }
})

vi.mock('../../../src/renderer/features/reader/state/PdfDocProvider', () => ({
  PdfDocProvider: () => null
}))

vi.mock('../../../src/renderer/features/reader/view/PageColumn', () => ({
  PageColumn: () => null,
  nearestPage: () => 0
}))

import { ReaderPage } from '../../../src/renderer/features/reader/view/ReaderPage'
import { useReaderStore } from '../../../src/renderer/features/reader/state/reader.store'
import type { Annotation } from '../../../src/shared/models/annotation'

// jsdom 无 scrollIntoView（FragmentNotesList 高亮滚动宿主 API 缺位）
Element.prototype.scrollIntoView = () => undefined

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

function mount(element: JSX.Element): void {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root?.render(element)
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  useReaderStore.setState({
    tabs: { 'p-1': makeTab('p-1', { annotations: [ann('a-x', 7)], totalPages: 20 }) },
    order: ['p-1'],
    activeId: 'p-1',
    noteHighlight: null,
    // 生产装配条件：研究面板收起（右栏不挂载——本测的攻击前提）
    researchOpen: false
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

describe('B1 审查回炉 B-1 —— noteHighlight 自动展开驻常挂载层（生产装配）', () => {
  it('收起态点标注：右栏出现+笔记页签选中+高亮传递（seq 触发语义沿旧）', async () => {
    mount(<ReaderPage />)
    // 前置防恒真：面板确处收起（ResearchAside 不在 DOM）
    expect(host?.querySelector('[data-testid="reader-research"]'), '收起态右栏不在场').toBeNull()
    await act(async () => {
      for (let i = 0; i < 4; i += 1) await Promise.resolve()
    })

    act(() => {
      useReaderStore.getState().notifyNoteHighlight('a-x')
    })
    expect(useReaderStore.getState().researchOpen, '面板自动展开').toBe(true)
    expect(useReaderStore.getState().tabs['p-1']?.researchTab, '切笔记页签').toBe('notes')
    const aside = host?.querySelector('[data-testid="reader-research"]')
    expect(aside, '右栏挂载').not.toBeNull()
    const tabs = Array.from(aside!.querySelectorAll('[role="tab"]'))
    expect(tabs.map((b) => b.textContent)).toEqual(['AI 对话', '笔记'])
    expect(tabs[1]?.getAttribute('aria-selected'), '笔记页签选中').toBe('true')
    expect(
      aside!.querySelector('[data-fragment-id="a-x"]')?.getAttribute('data-highlight'),
      '高亮参数传递至 FragmentNotesList'
    ).toBe('true')
  })

  it('无信号零自开：收起态静默挂载不误开面板（负锚——副作用仅由信号驱动）', async () => {
    mount(<ReaderPage />)
    await act(async () => {
      for (let i = 0; i < 4; i += 1) await Promise.resolve()
    })
    expect(useReaderStore.getState().researchOpen, '无信号不自开').toBe(false)
    expect(host?.querySelector('[data-testid="reader-research"]')).toBeNull()
  })
})
