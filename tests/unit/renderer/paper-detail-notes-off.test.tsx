// @vitest-environment jsdom
/**
 * [SR2-C-06] PaperDetailPanel —— 库侧笔记编辑面下线（测试：锁定合约）
 *
 * 覆盖：旧编辑面移除（无「打开笔记」/无 NotesPanel 挂载面）；替代入口
 * 「去阅读器写笔记」→ open-paper-bus 总线事件（App 切视图+ReaderPage 打开链
 * 既有）；导出/增强面不受影响（runAction 面回归锚）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { PaperDetail } from '../../../src/shared/models/paper'
import type * as clientModule from '../../../src/renderer/api/client'
import type * as toastModule from '../../../src/renderer/shared/ui/Toast'
import { guardedDescribe } from '../../utils/guard'

const { stubApi, toastSpy } = vi.hoisted(() => ({
  stubApi: {
    library: { detail: vi.fn() },
    enrich: { fetch: vi.fn() },
    export_: { report: vi.fn(), bibtex: vi.fn(), corpus: vi.fn() },
    system: { openExternal: vi.fn() }
  },
  toastSpy: vi.fn()
}))
vi.mock('../../../src/renderer/api/client', async (importOriginal) => {
  const real = await importOriginal<typeof clientModule>()
  return { ...real, api: stubApi as unknown as typeof clientModule.api }
})
vi.mock('../../../src/renderer/shared/ui/Toast', async (importOriginal) => {
  const real = await importOriginal<typeof toastModule>()
  return { ...real, showToast: toastSpy }
})

import { PaperDetailPanel } from '../../../src/renderer/features/library/PaperDetailPanel'
import { OPEN_PAPER_EVENT } from '../../../src/renderer/shared/open-paper-bus'

function makeDetail(): PaperDetail {
  return {
    id: 'paper-1',
    title: '样例论文',
    authors: ['张三'],
    year: 2026,
    venue: 'Journal of Testing',
    doi: null,
    tagNames: [],
    collectionNames: [],
    annotationCount: 0,
    noteCount: 1,
    lastReadPage: 0,
    addedAt: 't',
    abstract: '',
    arxivId: null,
    source: 'local',
    enrichStatus: 'pending',
    fileUrl: 'app-file://paper-1',
    fileName: 'a.pdf',
    updatedAt: 't',
    tags: [],
    collections: []
  }
}

let root: Root | null = null
let host: HTMLDivElement | null = null

function mountPanel(): void {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root?.render(<PaperDetailPanel paperId="paper-1" />)
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  stubApi.library.detail.mockResolvedValue({ ok: true, data: makeDetail() })
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
})

guardedDescribe('SR2-C-06', 'PaperDetailPanel —— 库侧编辑面下线', () => {
  it('旧编辑面移除：无「打开笔记」按钮、无 NotesPanel 挂载面', async () => {
    mountPanel()
    await act(async () => {
      await Promise.resolve()
    })
    expect(host?.textContent).not.toContain('打开笔记')
    expect(host?.textContent).not.toContain('收起笔记')
    expect(host?.querySelector('textarea[aria-label="笔记正文"]')).toBeNull()
  })

  it('替代入口：点击「去阅读器写笔记」→ open-paper-bus 总线事件（paperId 载荷）', async () => {
    mountPanel()
    await act(async () => {
      await Promise.resolve()
    })
    const opened: string[] = []
    const handler = (e: Event): void => {
      opened.push((e as CustomEvent<{ paperId: string }>).detail?.paperId)
    }
    window.addEventListener(OPEN_PAPER_EVENT, handler)
    try {
      const btn = Array.from(host?.querySelectorAll('button') ?? []).find(
        (b) => b.textContent === '去阅读器写笔记'
      )
      expect(btn).not.toBeUndefined()
      act(() => {
        btn?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      })
      expect(opened).toEqual(['paper-1'])
    } finally {
      window.removeEventListener(OPEN_PAPER_EVENT, handler)
    }
  })

  it('导出面不受影响：三可见入口（报告/BibTeX/语料 md）+DOI 隐藏负向断言', async () => {
    mountPanel()
    await act(async () => {
      await Promise.resolve()
    })
    const text = host?.textContent ?? ''
    expect(text).toContain('导出读书报告')
    expect(text).toContain('导出 BibTeX')
    expect(text).toContain('导出语料 md')
    // DOI 为 null 的夹具下入口必须隐藏（deepseek W1：负向断言补全回归锚）
    expect(text).not.toContain('打开 DOI 页')
  })
})
