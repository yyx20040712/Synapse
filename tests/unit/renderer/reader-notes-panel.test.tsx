// @vitest-environment jsdom
/**
 * [SR2-C-03] ReaderNotesPanel+FragmentNotesList —— α 双层阅读器面（测试：锁定合约）
 *
 * 覆盖：总评层（载入/载入失败重试/编辑写草稿 pending 镜像/保存四态消费——
 * save-status 下沉 shared 后的组件级复用）；片段层（C-01 单源序消费/单击
 * onLocate/空态/高亮滚动）；per-tab 语义（换 tab 草稿驻 store 不失忆）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { Annotation, AnnotationKind } from '../../../src/shared/models/annotation'
import type * as clientModule from '../../../src/renderer/api/client'
import type * as toastModule from '../../../src/renderer/shared/ui/Toast'
import { guardedDescribe } from '../../utils/guard'

const { stubApi } = vi.hoisted(() => ({
  stubApi: {
    notes: { get: vi.fn(), save: vi.fn() }
  }
}))
const notesGet = vi.fn()
stubApi.notes.get = notesGet
const notesSave = vi.fn()
stubApi.notes.save = notesSave

vi.mock('../../../src/renderer/api/client', async (importOriginal) => {
  const real = await importOriginal<typeof clientModule>()
  return { ...real, api: stubApi as unknown as typeof clientModule.api }
})
vi.mock('../../../src/renderer/shared/ui/Toast', async (importOriginal) => {
  const real = await importOriginal<typeof toastModule>()
  return { ...real, showToast: vi.fn() }
})

import { ReaderNotesPanel } from '../../../src/renderer/features/reader/ReaderNotesPanel'
import { FragmentNotesList } from '../../../src/renderer/features/reader/FragmentNotesList'
import { useReaderStore, type TabState } from '../../../src/renderer/features/reader/reader.store'
import { useNotesStore } from '../../../src/renderer/features/notes/notes.store'

function ann(id: string, page: number, off: number, kind: AnnotationKind, comment: string): Annotation {
  return {
    id,
    paperId: 'p-1',
    page,
    kind,
    color: 'yellow',
    quoteText: `quote-${id}`,
    prefixText: '',
    suffixText: '',
    startOffset: off,
    endOffset: off + 1,
    rects: [],
    comment,
    createdAt: '2026-05-01T00:00:00Z',
    updatedAt: '2026-05-01T00:00:00Z'
  }
}

function makeTab(id: string): TabState {
  return {
    paperId: id,
    fileUrl: `app-file://${id}`,
    fileName: `${id}.pdf`,
    title: '',
    page: 0,
    totalPages: 10,
    zoom: 1,
    color: 'yellow',
    annotations: [],
    status: 'ready',
    dirty: false
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

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  useReaderStore.setState({ tabs: { 'p-1': makeTab('p-1'), 'p-2': makeTab('p-2') }, order: ['p-1', 'p-2'], activeId: 'p-1' })
  useNotesStore.setState({ noteByPaper: {} })
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
  vi.useRealTimers()
})

/** React 受控输入的 jsdom 驱动法：原生 setter+input 事件（直接赋 value 不生效） */
function typeInto(el: HTMLInputElement | HTMLTextAreaElement, text: string): void {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
  setter?.call(el, text)
  el.dispatchEvent(new Event('input', { bubbles: true }))
}

guardedDescribe('SR2-C-03', 'ReaderNotesPanel —— 总评层（notes.store 消费）', () => {
  it('载入：api.notes.get → 标题/正文回填；pending=false 显示「已保存」', async () => {
    notesGet.mockResolvedValue({ ok: true, data: { id: 'n-1', paperId: 'p-1', title: '标题', contentMd: '正文内容', createdAt: 't', updatedAt: 't' } })
    mount(<ReaderNotesPanel annotations={[]} onLocate={() => undefined} />)
    await act(async () => {
      await vi.runOnlyPendingTimersAsync()
    })
    const title = host?.querySelector('input[aria-label="笔记标题"]') as HTMLInputElement
    const body = host?.querySelector('textarea[aria-label="笔记正文"]') as HTMLTextAreaElement
    expect(title.value).toBe('标题')
    expect(body.value).toBe('正文内容')
    expect(host?.textContent).toContain('已保存')
  })

  it('载入失败：toast+禁用输入+重试按钮可见（动作型失败，INV-02）', async () => {
    notesGet.mockRejectedValue(new Error('boom'))
    mount(<ReaderNotesPanel annotations={[]} onLocate={() => undefined} />)
    await act(async () => {
      await vi.runOnlyPendingTimersAsync()
    })
    const body = host?.querySelector('textarea[aria-label="笔记正文"]') as HTMLTextAreaElement
    expect(body.disabled).toBe(true)
    expect(host?.textContent).toContain('笔记加载失败')
  })

  it('编辑写草稿：pending 镜像置位→「未保存」；防抖保存成功→「已保存」', async () => {
    notesGet.mockResolvedValue({ ok: true, data: null })
    notesSave.mockResolvedValue({ ok: true, data: { id: 'n-1', paperId: 'p-1', title: '', contentMd: '草稿', createdAt: 't', updatedAt: 't2' } })
    mount(<ReaderNotesPanel annotations={[]} onLocate={() => undefined} />)
    await act(async () => {
      await vi.runOnlyPendingTimersAsync()
    })
    const body = host?.querySelector('textarea[aria-label="笔记正文"]') as HTMLTextAreaElement
    await act(async () => {
      typeInto(body, '草稿')
    })
    expect(useNotesStore.getState().noteByPaper['p-1']?.pending).toBe(true)
    expect(host?.textContent).toContain('未保存')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1600)
    })
    expect(notesSave).toHaveBeenCalled()
    expect(useNotesStore.getState().noteByPaper['p-1']?.pending).toBe(false)
    expect(host?.textContent).toContain('已保存')
  })

  it('换 tab 草稿驻 store 不失忆（per-tab 语义——切回即见草稿）', async () => {
    notesGet.mockResolvedValue({ ok: true, data: { id: 'n-1', paperId: 'p-1', title: 'T', contentMd: 'C', createdAt: 't', updatedAt: 't' } })
    mount(<ReaderNotesPanel annotations={[]} onLocate={() => undefined} />)
    await act(async () => {
      await vi.runOnlyPendingTimersAsync()
    })
    const body = host?.querySelector('textarea[aria-label="笔记正文"]') as HTMLTextAreaElement
    await act(async () => {
      typeInto(body, '编辑过')
    })
    // 切走：activeId=p-2（面板随 active tab 换 paperId 重新 load）——只冲微任务，
    // 防抖定时器保持 pending（saveSoon 窗口内切走正是 U2 合并保护的场景）
    notesGet.mockResolvedValue({ ok: true, data: null })
    act(() => {
      useReaderStore.setState({ activeId: 'p-2' })
    })
    await act(async () => {
      await Promise.resolve()
    })
    // p-1 草稿仍驻 store（未丢失）
    expect(useNotesStore.getState().noteByPaper['p-1']?.contentMd).toBe('编辑过')
    // 切回 p-1：合并保护保用户字段（U2 五模块语义——pendingEdit 路径）
    act(() => {
      useReaderStore.setState({ activeId: 'p-1' })
    })
    await act(async () => {
      await Promise.resolve()
    })
    const bodyBack = host?.querySelector('textarea[aria-label="笔记正文"]') as HTMLTextAreaElement
    expect(bodyBack.value).toBe('编辑过')
  })

  it('跨 paper 周期隔离（deepseek B1）：A 保存失败落地于切到 B 之后——B 不得误显「保存失败」', async () => {
    // A：载入既有笔记并让保存周期在飞
    notesGet.mockResolvedValue({ ok: true, data: { id: 'n-1', paperId: 'p-1', title: 'T', contentMd: 'C', createdAt: 't', updatedAt: 't1' } })
    let rejectSave: ((e: Error) => void) | null = null
    notesSave.mockImplementation(
      () => new Promise((_res, rej) => { rejectSave = rej })
    )
    mount(<ReaderNotesPanel annotations={[]} onLocate={() => undefined} />)
    await act(async () => {
      await vi.runOnlyPendingTimersAsync()
    })
    const body = host?.querySelector('textarea[aria-label="笔记正文"]') as HTMLTextAreaElement
    await act(async () => {
      typeInto(body, 'A 的编辑')
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1600)
    })
    // saving 在飞时切到 B（B 载入空笔记）
    notesGet.mockResolvedValue({ ok: true, data: null })
    act(() => {
      useReaderStore.setState({ activeId: 'p-2' })
    })
    await act(async () => {
      await Promise.resolve()
    })
    // A 的保存失败此刻落地（savedAt 未推进+周期终点）——B 面板不得显示保存失败
    await act(async () => {
      rejectSave?.(new Error('A save failed'))
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(host?.textContent).not.toContain('保存失败')
    expect(host?.textContent).toContain('已保存')
    // W3：切回 A——A 的保存失败必须可见（重试入口不失联；周期判定 per-paper 分键）
    notesGet.mockResolvedValue({ ok: true, data: { id: 'n-1', paperId: 'p-1', title: 'T', contentMd: 'A 的编辑', createdAt: 't', updatedAt: 't1' } })
    act(() => {
      useReaderStore.setState({ activeId: 'p-1' })
    })
    await act(async () => {
      await Promise.resolve()
    })
    expect(host?.textContent).toContain('保存失败')
  })
})

guardedDescribe('SR2-C-03', 'FragmentNotesList —— 片段层（C-01 序消费）', () => {
  it('按文档序渲染（乱序入参重排）；单击条目回调 onLocate(id)', () => {
    const a10 = ann('a-10', 10, 1, 'highlight', '')
    const a2 = ann('a-2', 2, 1, 'note', '有批注')
    const onLocate = vi.fn()
    mount(<FragmentNotesList annotations={[a10, a2]} onLocate={onLocate} />)
    const items = Array.from(host?.querySelectorAll('[data-fragment-id]') ?? [])
    expect(items.map((el) => el.getAttribute('data-fragment-id'))).toEqual(['a-2', 'a-10'])
    act(() => {
      items[0]?.querySelector('button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(onLocate).toHaveBeenCalledWith('a-2')
  })

  it('空态文案与高亮滚动（highlightAnnotationId 条目 scrollIntoView）', () => {
    const originalScroll = Element.prototype.scrollIntoView
    const scrollIntoView = vi.fn()
    Element.prototype.scrollIntoView = scrollIntoView
    try {
      mount(<FragmentNotesList annotations={[]} onLocate={() => undefined} />)
      expect(host?.textContent).toContain('在正文中划选即可添加片段笔记')

      const a1 = ann('a-1', 0, 0, 'highlight', '')
      const a2 = ann('a-2', 1, 0, 'highlight', '')
      mount(<FragmentNotesList annotations={[a1, a2]} onLocate={() => undefined} highlightAnnotationId="a-2" />)
      expect(host?.querySelector('[data-fragment-id="a-2"]')?.getAttribute('data-highlight')).toBe('true')
      expect(scrollIntoView).toHaveBeenCalled()
    } finally {
      Element.prototype.scrollIntoView = originalScroll
    }
  })
})
