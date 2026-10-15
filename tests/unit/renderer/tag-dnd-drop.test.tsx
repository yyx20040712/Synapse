// @vitest-environment jsdom
/**
 * [F-DBCAMP-01 DB-4 / F-TAGS-02 ⑥] DnD 打标（TagDropdownRow 拖源→PaperRow
 * 落点——B 面；useFolderDrop PAPER_DRAG_MIME 仿体）。
 *
 * 覆盖：拖源 dragstart 设双 MIME（tagId+folderId——renderer 判域用）；行 drop
 * 面=types 判别（与 PAPER_DRAG_MIME/Files 族互斥）；drop→api.tags.attach 逐参
 * +行 tagNames 刷新链（library load）；域一致性预检（tag 域≠paper.folderId
 * →toast 拒绝零请求）；attach 失败 toast（服务端 R3 映射文案透传）；busy 拒收。
 * always-active（不经 guardedDescribe）。
 */
import { makeApiStub, toastSpy } from '../../utils/api-client-mock'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PaperSummary } from '../../../src/shared/models/paper'

const stubApi = makeApiStub({
  tags: {
    list: vi.fn(async () => ({ ok: true as const, data: [] })),
    attach: vi.fn()
  },
  library: { list: vi.fn(async () => ({ ok: true as const, data: { items: [], total: 0 } })) },
  papers: { setStarred: vi.fn() }
})

import { TAG_DRAG_MIME, TAG_DRAG_FOLDER_MIME } from '../../../src/renderer/shared/tag-dnd'
import { TagDropdownRow } from '../../../src/renderer/features/tags/TagDropdownRow'
import { PaperList } from '../../../src/renderer/features/library/PaperList'
import { PAPER_DRAG_MIME } from '../../../src/renderer/features/library/library-dnd.store'
import { useLibraryStore } from '../../../src/renderer/features/library/library.store'
import { useImportBusyStore } from '../../../src/renderer/shared/import-busy.store'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

/** jsdom 无 DragEvent：Event+dataTransfer 桩（types+setData/getData 记录） */
function dragEvent(type: string, types: string[], data: Record<string, string> = {}): Event {
  const ev = new Event(type, { bubbles: true, cancelable: true })
  const setData = vi.fn()
  Object.defineProperty(ev, 'dataTransfer', {
    value: {
      types,
      files: [],
      setData,
      getData: (k: string) => data[k] ?? '',
      setDragImage: vi.fn(),
      dropEffect: 'none',
      effectAllowed: 'all'
    }
  })
  return ev
}

function dtOf(ev: Event): { setData: ReturnType<typeof vi.fn> } {
  return (ev as unknown as { dataTransfer: { setData: ReturnType<typeof vi.fn> } }).dataTransfer
}

function makeSummary(id: string, folderId: string): PaperSummary {
  return {
    id,
    title: `论文 ${id}`,
    authors: [],
    year: 2021,
    venue: 'Journal of Testing',
    doi: null,
    tagNames: [],
    annotationCount: 0,
    noteCount: 0,
    lastReadPage: 0,
    addedAt: 't',
    folderId,
    impactFactor: null,
    isStarred: false
  }
}

let root: Root | null = null
let host: HTMLDivElement | null = null

async function render(node: JSX.Element): Promise<void> {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => {
    root?.render(node)
  })
  await act(async () => {
    await Promise.resolve()
  })
}

beforeEach(() => {
  Element.prototype.scrollIntoView = () => undefined
  toastSpy.mockClear()
  stubApi.tags.attach.mockClear()
  stubApi.library.list.mockClear()
  stubApi.tags.attach.mockImplementation(async () => ({ ok: true as const, data: { ok: true } }))
  useImportBusyStore.getState().setBusy(false)
  useLibraryStore.setState({
    papers: [makeSummary('p-1', 'f-a')],
    total: 1,
    loading: false,
    error: null,
    query: { sort: 'added_desc', offset: 0, limit: 50 }
  })
})

afterEach(async () => {
  await act(async () => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
})

describe('F-TAGS-02 ⑥ B 拖源（TagDropdownRow dragstart）', () => {
  it('dragstart：设双 MIME（tagId+域 folderId——renderer 判域用）+行内 dragging 高亮', async () => {
    await render(
      <TagDropdownRow
        tag={{ id: 't-1', name: '甲', color: null, paperCount: 2, folderId: 'f-a' } as never}
        checked={false}
        editing={false}
        folderId="f-a"
        onToggle={() => undefined}
        onStartEdit={() => undefined}
        onEndEdit={() => undefined}
        onMutated={() => undefined}
      />
    )
    const row = host?.querySelector('.lib-dd-row') as HTMLElement
    const ev = dragEvent('dragstart', [])
    await act(async () => {
      row.dispatchEvent(ev)
    })
    expect(dtOf(ev).setData).toHaveBeenCalledWith(TAG_DRAG_MIME, 't-1')
    expect(dtOf(ev).setData).toHaveBeenCalledWith(TAG_DRAG_FOLDER_MIME, 'f-a')
  })
})

describe('F-TAGS-02 ⑥ B 落点（PaperRow drop 面）', () => {
  function row(): HTMLElement {
    return host?.querySelector('.lib-row') as HTMLElement
  }

  it('dragover：仅 TAG MIME preventDefault+目标高亮（PAPER MIME/Files 互斥不响应）', async () => {
    await render(
      <PaperList papers={useLibraryStore.getState().papers} selectedId={null} onSelect={() => undefined} />
    )
    const evTag = dragEvent('dragover', [TAG_DRAG_MIME])
    await act(async () => {
      row().dispatchEvent(evTag)
    })
    expect(evTag.defaultPrevented).toBe(true)
    expect(row().classList.contains('tag-over'), 'drop 目标高亮').toBe(true)
    const evPaper = dragEvent('dragover', [PAPER_DRAG_MIME])
    await act(async () => {
      row().dispatchEvent(evPaper)
    })
    expect(evPaper.defaultPrevented).toBe(false)
    const evFiles = dragEvent('dragover', ['Files'])
    await act(async () => {
      row().dispatchEvent(evFiles)
    })
    expect(evFiles.defaultPrevented).toBe(false)
  })

  it('drop：api.tags.attach 逐参+行 tagNames 刷新链（library load 同链）', async () => {
    await render(
      <PaperList papers={useLibraryStore.getState().papers} selectedId={null} onSelect={() => undefined} />
    )
    const ev = dragEvent('drop', [TAG_DRAG_MIME, TAG_DRAG_FOLDER_MIME], {
      [TAG_DRAG_MIME]: 't-1',
      [TAG_DRAG_FOLDER_MIME]: 'f-a'
    })
    await act(async () => {
      row().dispatchEvent(ev)
    })
    await act(async () => {
      await Promise.resolve()
    })
    expect(ev.defaultPrevented).toBe(true)
    expect(stubApi.tags.attach).toHaveBeenCalledWith({ paperId: 'p-1', tagId: 't-1' })
    expect(stubApi.library.list).toHaveBeenCalled()
    expect(row().classList.contains('tag-over'), 'drop 后高亮即清').toBe(false)
  })

  it('域一致性预检：tag 域≠paper.folderId →toast 拒绝零请求（all-scope 跨域行混列）', async () => {
    await render(
      <PaperList papers={useLibraryStore.getState().papers} selectedId={null} onSelect={() => undefined} />
    )
    const ev = dragEvent('drop', [TAG_DRAG_MIME, TAG_DRAG_FOLDER_MIME], {
      [TAG_DRAG_MIME]: 't-9',
      [TAG_DRAG_FOLDER_MIME]: 'f-b'
    })
    await act(async () => {
      row().dispatchEvent(ev)
    })
    await act(async () => {
      await Promise.resolve()
    })
    expect(stubApi.tags.attach).not.toHaveBeenCalled()
    expect(toastSpy).toHaveBeenCalledWith('标签与文献不在同一文件夹域——无法挂接', 'error')
  })

  it('attach 失败：toast 服务端文案（R3 映射面透传）', async () => {
    stubApi.tags.attach.mockImplementation(async () => ({
      ok: false as const,
      error: { code: 'CONFLICT', message: '每篇文献最多 6 个标签' }
    }))
    await render(
      <PaperList papers={useLibraryStore.getState().papers} selectedId={null} onSelect={() => undefined} />
    )
    const ev = dragEvent('drop', [TAG_DRAG_MIME, TAG_DRAG_FOLDER_MIME], {
      [TAG_DRAG_MIME]: 't-1',
      [TAG_DRAG_FOLDER_MIME]: 'f-a'
    })
    await act(async () => {
      row().dispatchEvent(ev)
    })
    await act(async () => {
      await Promise.resolve()
    })
    expect(toastSpy).toHaveBeenCalledWith('每篇文献最多 6 个标签', 'error')
  })

  it('busy 拒收：导入中 drop 零请求', async () => {
    useImportBusyStore.getState().setBusy(true)
    await render(
      <PaperList papers={useLibraryStore.getState().papers} selectedId={null} onSelect={() => undefined} />
    )
    const ev = dragEvent('drop', [TAG_DRAG_MIME, TAG_DRAG_FOLDER_MIME], {
      [TAG_DRAG_MIME]: 't-1',
      [TAG_DRAG_FOLDER_MIME]: 'f-a'
    })
    await act(async () => {
      row().dispatchEvent(ev)
    })
    await act(async () => {
      await Promise.resolve()
    })
    expect(stubApi.tags.attach).not.toHaveBeenCalled()
    useImportBusyStore.getState().setBusy(false)
  })
})
