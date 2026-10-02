// @vitest-environment jsdom
/**
 * [F-UIRES-01 批 A U4] 文献行拖拽（§2.3/R13）+ DnD 两域判别（§2.5）。
 * 覆盖：dragstart 设自定义 MIME application/x-synapse-paper+源行 faded 0.3；
 * 合法目标=文件夹行+未归档行（「全部文献」=非目标）；dragover 候选高亮+「移入
 * ↩」徽标；ghost「题名截断→目标」跟随；drop→moveFolder+成功收尾两分支；drag
 * 期目标消失→no-op+toast「目标文件夹已不存在」；跨图边拒/失败→拒因中文
 * toast；busy=dragstart 拒启+drop 双重+busy 上升沿取消进行中拖拽；两域判别
 * （左栏行仅响应内部 MIME；导入条 dragover 仅响应 Files）。
 * always-active（不经 guardedDescribe——K3 威胁结构性缺位）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub, stubApiEvents, toastSpy } from '../../utils/api-client-mock'
import type { PaperSummary } from '../../../src/shared/models/paper'

let foldersNow: Array<{ id: string; name: string; position: number; paperCount: number }> = [
  { id: '__main__', name: '主图', position: 0, paperCount: 1 },
  { id: 'f-1', name: '方法工具箱', position: 1, paperCount: 0 }
]
const stubApi = makeApiStub({
  library: { list: vi.fn() },
  folders: { list: vi.fn() },
  papers: { moveFolder: vi.fn() },
  tags: { list: vi.fn() }
})
/** folders.changed 订阅捕获（drag 期目标消失用例驱动面）——[RR1-1] 后
 * LibraryPage 内两订阅者（FolderNav+ImportDropZone），广播式驱动全量 */
const foldersChangedSubs: Array<() => void> = []
let fireFoldersChanged: () => void = () => undefined
stubApiEvents({
  onFoldersChanged: (cb: () => void) => {
    foldersChangedSubs.push(cb)
    fireFoldersChanged = () => foldersChangedSubs.forEach((f) => f())
    return () => undefined
  },
  onImportProgress: vi.fn(() => () => undefined)
})

import { LibraryPage } from '../../../src/renderer/features/library/LibraryPage'
import { useLibraryStore } from '../../../src/renderer/features/library/library.store'
import { useLibraryDnd, PAPER_DRAG_MIME } from '../../../src/renderer/features/library/library-dnd.store'
import { useImportBusyStore } from '../../../src/renderer/shared/import-busy.store'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

function summary(id: string, folderId: string | null, title: string): PaperSummary {
  return {
    id,
    title,
    authors: [],
    year: 2024,
    venue: '',
    doi: null,
    tagNames: [],
    annotationCount: 0,
    noteCount: 0,
    lastReadPage: 0,
    addedAt: 't',
    folderId,
    impactFactor: null
  }
}

let root: Root | null = null
let host: HTMLDivElement | null = null

async function render(): Promise<void> {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => {
    root?.render(<LibraryPage />)
  })
  await settle()
}

async function settle(turns = 6): Promise<void> {
  for (let i = 0; i < turns; i += 1) {
    await act(async () => {
      await Promise.resolve()
    })
  }
}

function row(title: string): HTMLElement | undefined {
  return [...(host?.querySelectorAll<HTMLElement>('.lib-row') ?? [])].find(
    (r) => r.querySelector('.lib-r-title')?.textContent === title
  )
}

function navRow(label: string): HTMLElement | undefined {
  return [...(host?.querySelectorAll<HTMLElement>('.lib-fn-row') ?? [])].find((b) =>
    (b.textContent ?? '').startsWith(label)
  )
}

/** jsdom 无 DragEvent：Event+dataTransfer 桩（types+setData 记录） */
function dragEvent(type: string, types: string[], files: unknown[] = []): Event {
  const ev = new Event(type, { bubbles: true, cancelable: true })
  const setData = vi.fn()
  const setDragImage = vi.fn()
  Object.defineProperty(ev, 'dataTransfer', {
    value: {
      types,
      files,
      setData,
      setDragImage,
      dropEffect: 'none',
      effectAllowed: 'all'
    }
  })
  return ev
}

function dtOf(ev: Event): { setData: ReturnType<typeof vi.fn> } {
  return (ev as unknown as { dataTransfer: { setData: ReturnType<typeof vi.fn> } }).dataTransfer
}

beforeEach(() => {
  Element.prototype.scrollIntoView = () => undefined
  vi.clearAllMocks()
  stubApi.library.list.mockReset()
  stubApi.folders.list.mockReset()
  stubApi.papers.moveFolder.mockReset()
  stubApi.tags.list.mockReset()
  foldersNow = [
    { id: '__main__', name: '主图', position: 0, paperCount: 1 },
    { id: 'f-1', name: '方法工具箱', position: 1, paperCount: 0 }
  ]
  stubApi.folders.list.mockImplementation(async () => ({ ok: true, data: foldersNow }))
  stubApi.tags.list.mockResolvedValue({ ok: true, data: [] })
  toastSpy.mockClear()
  useImportBusyStore.getState().setBusy(false)
  useLibraryDnd.getState().end()
  useLibraryStore.setState({
    papers: [summary('p1', null, '移动甲文献')],
    total: 1,
    query: { sort: 'added_desc', offset: 0, limit: 50 },
    selectedId: null,
    loading: false,
    error: null
  })
})

afterEach(async () => {
  await act(async () => {
    root?.unmount()
  })
  root = null
  host?.remove()
  root = null
  host = null
})

describe('F-UIRES-01 U4 行拖拽源（dragstart/faded/ghost）', () => {
  it('dragstart：设自定义 MIME（载荷=paperId）+源行挂 faded 态（.dragging）', async () => {
    await render()
    const r = row('移动甲文献')
    expect(r).toBeDefined()
    const ev = dragEvent('dragstart', [])
    act(() => {
      r!.dispatchEvent(ev)
    })
    expect(dtOf(ev).setData).toHaveBeenCalledWith(PAPER_DRAG_MIME, 'p1')
    expect((ev as unknown as { dataTransfer: { setDragImage: ReturnType<typeof vi.fn> } }).dataTransfer.setDragImage, 'RR1-6 原生快照抑制（透明 1×1）').toHaveBeenCalledTimes(1)
    expect(r?.classList.contains('dragging'), '源行 faded 0.3').toBe(true)
  })

  it('ghost 跟随：dragover 更新坐标+目标名（题名截断→目标）', async () => {
    await render()
    act(() => {
      row('移动甲文献')!.dispatchEvent(dragEvent('dragstart', []))
    })
    act(() => {
      document.dispatchEvent(
        Object.assign(new Event('dragover', { bubbles: true }), { clientX: 300, clientY: 200 })
      )
    })
    act(() => {
      navRow('方法工具箱')!.dispatchEvent(dragEvent('dragover', [PAPER_DRAG_MIME]))
    })
    const ghost = host?.querySelector('.lib-drag-ghost')
    expect(ghost).not.toBeNull()
    expect(ghost?.textContent).toContain('移动甲文献')
    expect(ghost?.textContent).toContain('方法工具箱')
  })

  it('题名截断：长题名 ghost 截断（≤12 字符+省略号——TITLE_LIMIT 单源）', async () => {
    useLibraryStore.setState({ papers: [summary('p9', null, '很长的论文标题需要被截断处理的情况甲乙丙丁')], total: 1 })
    await render()
    act(() => {
      row('很长的论文标题需要被截断处理的情况甲乙丙丁')!.dispatchEvent(dragEvent('dragstart', []))
    })
    act(() => {
      document.dispatchEvent(
        Object.assign(new Event('dragover', { bubbles: true }), { clientX: 10, clientY: 10 })
      )
    })
    const ghost = host?.querySelector('.lib-drag-ghost')
    expect(ghost?.textContent).toContain('…')
    expect((ghost?.textContent ?? '').length).toBeLessThan(30)
  })

  it('dragend：拖拽态全清（faded/ghost/候选高亮离场）', async () => {
    await render()
    const r = row('移动甲文献')!
    act(() => {
      r.dispatchEvent(dragEvent('dragstart', []))
    })
    act(() => {
      r.dispatchEvent(dragEvent('dragend', []))
    })
    expect(r.classList.contains('dragging')).toBe(false)
    expect(host?.querySelector('.lib-drag-ghost')).toBeNull()
  })
})

describe('F-UIRES-01 U4 拖放目标（左栏行——仅响应内部 MIME）', () => {
  it('文件夹行 dragover：候选高亮（.drop）+「移入 ↩」徽标；「全部文献」行=非目标', async () => {
    await render()
    act(() => {
      row('移动甲文献')!.dispatchEvent(dragEvent('dragstart', []))
    })
    act(() => {
      navRow('方法工具箱')!.dispatchEvent(dragEvent('dragover', [PAPER_DRAG_MIME]))
    })
    expect(navRow('方法工具箱')?.classList.contains('drop')).toBe(true)
    expect(navRow('方法工具箱')?.textContent).toContain('移入')
    act(() => {
      navRow('全部文献')!.dispatchEvent(dragEvent('dragover', [PAPER_DRAG_MIME]))
    })
    expect(navRow('全部文献')?.classList.contains('drop'), '全部文献=非目标').toBe(false)
  })

  it('未归档行=合法目标（移出——toFolderId:null）', async () => {
    await render()
    act(() => {
      row('移动甲文献')!.dispatchEvent(dragEvent('dragstart', []))
    })
    act(() => {
      navRow('未归档')!.dispatchEvent(dragEvent('dragover', [PAPER_DRAG_MIME]))
    })
    expect(navRow('未归档')?.classList.contains('drop')).toBe(true)
  })

  it('两域判别：OS 文件拖入（types 含 Files 无内部 MIME）左栏行不响应（无高亮零 dropEffect）', async () => {
    await render()
    act(() => {
      navRow('方法工具箱')!.dispatchEvent(dragEvent('dragover', ['Files']))
    })
    expect(navRow('方法工具箱')?.classList.contains('drop'), '文件悬停左栏行不响应').toBe(false)
  })

  it('drop→moveFolder+成功收尾：行离开当前视图→选中清空（folder 视图移出）', async () => {
    useLibraryStore.setState({
      query: { sort: 'added_desc', offset: 0, limit: 50, folderScope: { kind: 'folder', folderId: 'f-1' } },
      selectedId: 'p1'
    })
    await render()
    act(() => {
      row('移动甲文献')!.dispatchEvent(dragEvent('dragstart', []))
    })
    stubApi.papers.moveFolder.mockResolvedValue({ ok: true, data: { ok: true } })
    stubApi.library.list.mockResolvedValue({ ok: true, data: { items: [], total: 0 } })
    await act(async () => {
      navRow('未归档')!.dispatchEvent(dragEvent('drop', [PAPER_DRAG_MIME]))
    })
    await settle()
    expect(stubApi.papers.moveFolder).toHaveBeenCalledWith({ paperId: 'p1', toFolderId: null })
    expect(useLibraryStore.getState().selectedId, '行离开视图→选中清空+抽屉清空').toBeNull()
    expect(host?.querySelector('.lib-drag-ghost'), 'drop 后拖拽态清').toBeNull()
  })

  it('drop→成功收尾：行仍在视图→选中保持', async () => {
    await render()
    await act(async () => {
      useLibraryStore.setState({ selectedId: 'p1' })
    })
    act(() => {
      row('移动甲文献')!.dispatchEvent(dragEvent('dragstart', []))
    })
    stubApi.papers.moveFolder.mockResolvedValue({ ok: true, data: { ok: true } })
    stubApi.library.list.mockResolvedValue({
      ok: true,
      data: { items: [summary('p1', 'f-1', '移动甲文献')], total: 1 }
    })
    await act(async () => {
      navRow('方法工具箱')!.dispatchEvent(dragEvent('drop', [PAPER_DRAG_MIME]))
    })
    await settle()
    expect(stubApi.papers.moveFolder).toHaveBeenCalledWith({ paperId: 'p1', toFolderId: 'f-1' })
    expect(useLibraryStore.getState().selectedId, '仍在视图→保持').toBe('p1')
  })

  it('drag 期目标行消失（folders.changed 后 folderId 不在列表）→no-op+toast「目标文件夹已不存在」', async () => {
    await render()
    act(() => {
      row('移动甲文献')!.dispatchEvent(dragEvent('dragstart', []))
    })
    act(() => {
      navRow('方法工具箱')!.dispatchEvent(dragEvent('dragover', [PAPER_DRAG_MIME]))
    })
    // 外部删除：folders.changed 后列表不再含 f-1（行消失高亮即清——over 态残留）
    foldersNow = [{ id: '__main__', name: '主图', position: 0, paperCount: 1 }]
    stubApi.folders.list.mockImplementation(async () => ({ ok: true, data: foldersNow }))
    await act(async () => {
      fireFoldersChanged()
    })
    await settle()
    expect(navRow('方法工具箱'), '目标行已消失').toBeUndefined()
    // drop 落在左栏容器（stale over 目标 f-1）→no-op+toast「目标文件夹已不存在」
    await act(async () => {
      host?.querySelector('nav.lib-fnav')!.dispatchEvent(dragEvent('drop', [PAPER_DRAG_MIME]))
    })
    await settle()
    expect(stubApi.papers.moveFolder).not.toHaveBeenCalled()
    expect(toastSpy).toHaveBeenCalledWith('目标文件夹已不存在', 'info')
  })

  it('RR1-3 空白释放=取消：dragover 行后 dragleave/移至空白 drop→零 IPC 零 toast', async () => {
    await render()
    act(() => {
      row('移动甲文献')!.dispatchEvent(dragEvent('dragstart', []))
    })
    const target = navRow('方法工具箱')!
    act(() => {
      target.dispatchEvent(dragEvent('dragover', [PAPER_DRAG_MIME]))
    })
    expect(target.classList.contains('drop')).toBe(true)
    // 移出行（dragleave——relatedTarget 在行外）→候选即清
    act(() => {
      target.dispatchEvent(dragEvent('dragleave', [PAPER_DRAG_MIME]))
    })
    expect(target.classList.contains('drop'), 'dragleave 后候选高亮即清').toBe(false)
    // 空白（nav 容器）drop→取消回 idle：零 moveFolder 零 toast
    await act(async () => {
      host?.querySelector('nav.lib-fnav')!.dispatchEvent(dragEvent('drop', [PAPER_DRAG_MIME]))
    })
    await settle()
    expect(stubApi.papers.moveFolder).not.toHaveBeenCalled()
    expect(toastSpy).not.toHaveBeenCalled()
    expect(useLibraryDnd.getState().drag).toBeNull()
  })

  it('RR1-3 原处释放=取消：dragover 行后原地 drop 于行自身 stopPropagation 路径外无残留 over 执行（容器 drop 通道=零 IPC）', async () => {
    await render()
    act(() => {
      row('移动甲文献')!.dispatchEvent(dragEvent('dragstart', []))
    })
    const target = navRow('未归档')!
    act(() => {
      target.dispatchEvent(dragEvent('dragover', [PAPER_DRAG_MIME]))
    })
    act(() => {
      target.dispatchEvent(dragEvent('dragleave', [PAPER_DRAG_MIME]))
    })
    await act(async () => {
      host?.querySelector('nav.lib-fnav')!.dispatchEvent(dragEvent('drop', [PAPER_DRAG_MIME]))
    })
    await settle()
    expect(stubApi.papers.moveFolder).not.toHaveBeenCalled()
  })

  it('失败→拒因中文 toast（非静默 no-op）', async () => {
    await render()
    act(() => {
      row('移动甲文献')!.dispatchEvent(dragEvent('dragstart', []))
    })
    stubApi.papers.moveFolder.mockResolvedValue({
      ok: false,
      error: { code: 'CONFLICT', message: '脉络图编辑保存中，请先完成保存再操作文献归属' }
    })
    await act(async () => {
      navRow('方法工具箱')!.dispatchEvent(dragEvent('drop', [PAPER_DRAG_MIME]))
    })
    await settle()
    expect(toastSpy).toHaveBeenCalledWith('脉络图编辑保存中，请先完成保存再操作文献归属', 'error')
  })
})

describe('F-UIRES-01 U4 busy 双重校验+上升沿取消（§2.5）', () => {
  it('busy 期 dragstart 拒启（dnd 零置位+无 faded）', async () => {
    await render()
    act(() => {
      useImportBusyStore.getState().setBusy(true)
    })
    await settle()
    const r = row('移动甲文献')!
    act(() => {
      r.dispatchEvent(dragEvent('dragstart', []))
    })
    expect(r.classList.contains('dragging')).toBe(false)
    expect(useLibraryDnd.getState().drag).toBeNull()
  })

  it('busy 上升沿取消进行中拖拽（高亮/ghost 即清）', async () => {
    await render()
    act(() => {
      row('移动甲文献')!.dispatchEvent(dragEvent('dragstart', []))
    })
    act(() => {
      navRow('方法工具箱')!.dispatchEvent(dragEvent('dragover', [PAPER_DRAG_MIME]))
    })
    expect(host?.querySelector('.lib-drag-ghost')).not.toBeNull()
    act(() => {
      useImportBusyStore.getState().setBusy(true)
    })
    await settle()
    expect(useLibraryDnd.getState().drag, '拖拽态被取消').toBeNull()
    expect(host?.querySelector('.lib-drag-ghost'), 'ghost 即清').toBeNull()
    expect(navRow('方法工具箱')?.classList.contains('drop'), '候选高亮即清').toBe(false)
  })

  it('busy 期 drop 双重校验：零 moveFolder+短路提示', async () => {
    await render()
    act(() => {
      row('移动甲文献')!.dispatchEvent(dragEvent('dragstart', []))
    })
    act(() => {
      useImportBusyStore.getState().setBusy(true)
    })
    await settle()
    await act(async () => {
      navRow('方法工具箱')!.dispatchEvent(dragEvent('drop', [PAPER_DRAG_MIME]))
    })
    await settle()
    expect(stubApi.papers.moveFolder).not.toHaveBeenCalled()
  })

  it('两域判别（导入条侧）：内部 MIME dragover 导入条不亮（仅 Files 亮）', async () => {
    await render()
    const bar = host?.querySelector('.lib-dropzone')
    act(() => {
      bar!.dispatchEvent(dragEvent('dragover', [PAPER_DRAG_MIME]))
    })
    expect(bar?.classList.contains('lib-dropzone-dragging'), '内部拖拽不触发导入辉光').toBe(false)
    act(() => {
      bar!.dispatchEvent(dragEvent('dragover', ['Files']))
    })
    expect(bar?.classList.contains('lib-dropzone-dragging'), '文件拖入触发导入辉光').toBe(true)
  })
})
