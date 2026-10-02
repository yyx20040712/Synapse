// @vitest-environment jsdom
/**
 * [F-UIRES-01 批 A U4] PaperRowMenu 两项版（P-10：批 A 菜单=「在阅读器中
 * 打开」+「移动到文件夹 ▸」；删除项批 B 点亮、星标项 DB 窗口点亮——不渲染
 * 禁用项=零死交互）。覆盖：右键行弹出+命中行高亮（按下即高亮）；两项文本；
 * 移动子面（folders.list+未归档移出）；moveFolder 链+成功收尾两分支（行离开
 * 当前视图→选中清空+抽屉清空；仍在→保持）；失败→拒因中文 toast；「在阅读器
 * 中打开」走 openPaper 通道。always-active（不经 guardedDescribe）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub, stubApiEvents, toastSpy } from '../../utils/api-client-mock'
import type { PaperSummary } from '../../../src/shared/models/paper'

let foldersNow: Array<{ id: string; name: string; position: number; paperCount: number }> = [
  { id: '__main__', name: '主图', position: 0, paperCount: 1 },
  { id: 'f-1', name: '调研计划', position: 1, paperCount: 0 }
]
const stubApi = makeApiStub({
  library: { list: vi.fn() },
  folders: { list: vi.fn() },
  papers: { moveFolder: vi.fn() },
  tags: { list: vi.fn() }
})
stubApiEvents({
  onFoldersChanged: vi.fn(() => () => undefined),
  onImportProgress: vi.fn(() => () => undefined)
})

import { LibraryPage } from '../../../src/renderer/features/library/LibraryPage'
import { useLibraryStore } from '../../../src/renderer/features/library/library.store'
import { OPEN_PAPER_EVENT } from '../../../src/renderer/shared/open-paper-bus'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

function summary(id: string, folderId: string | null): PaperSummary {
  return {
    id,
    title: `论文${id}`,
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

/** 受控列表态：items + total（LibraryPage 全链挂载） */
function setPapers(items: PaperSummary[]): void {
  useLibraryStore.setState({ papers: items, total: items.length, loading: false, error: null })
}

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

function row(id: string): HTMLElement | undefined {
  return [...(host?.querySelectorAll<HTMLElement>('.lib-row') ?? [])].find(
    (r) => r.querySelector('.lib-r-title')?.textContent === `论文${id}`
  )
}

function menu(): HTMLElement | null {
  return host?.querySelector('[data-testid="paper-row-menu"]') ?? null
}

async function rightClickRow(id: string): Promise<void> {
  const r = row(id)
  expect(r, `行存在：论文${id}`).toBeDefined()
  await act(async () => {
    r!.dispatchEvent(
      new MouseEvent('contextmenu', { clientX: 220, clientY: 160, bubbles: true, cancelable: true })
    )
  })
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
    { id: 'f-1', name: '调研计划', position: 1, paperCount: 0 }
  ]
  stubApi.folders.list.mockImplementation(async () => ({ ok: true, data: foldersNow }))
  stubApi.tags.list.mockResolvedValue({ ok: true, data: [] })
  toastSpy.mockClear()
  useLibraryStore.setState({
    papers: [],
    total: 0,
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

describe('F-UIRES-01 U4 PaperRowMenu 两项版（P-10/P-12）', () => {
  it('右键行→菜单弹出：两项文本（在阅读器中打开/移动到文件夹）+删除与星标零渲染', async () => {
    setPapers([summary('p1', null)])
    await render()
    await rightClickRow('p1')
    expect(menu()).not.toBeNull()
    expect(menu()?.textContent).toContain('在阅读器中打开')
    expect(menu()?.textContent).toContain('移动到文件夹')
    expect(menu()?.textContent).not.toContain('删除文献')
    expect(menu()?.textContent).not.toContain('星标')
  })

  it('命中行=按下即高亮（.hit 类挂右键行）；他行不挂', async () => {
    setPapers([summary('p1', null), summary('p2', null)])
    await render()
    await rightClickRow('p2')
    expect(row('p2')?.classList.contains('hit')).toBe(true)
    expect(row('p1')?.classList.contains('hit')).toBe(false)
  })

  it('「在阅读器中打开」→openPaper 通道（open-paper 事件广播）+菜单收起', async () => {
    setPapers([summary('p1', null)])
    const seen: string[] = []
    const listener = (): void => {
      seen.push('fired')
    }
    window.addEventListener(OPEN_PAPER_EVENT, listener)
    await render()
    await rightClickRow('p1')
    await act(async () => {
      ;[...(menu()?.querySelectorAll<HTMLButtonElement>('button') ?? [])]
        .find((b) => (b.textContent ?? '').includes('在阅读器中打开'))!
        .click()
    })
    expect(seen.length).toBe(1)
    expect(menu()).toBeNull()
    window.removeEventListener(OPEN_PAPER_EVENT, listener)
  })

  it('移动子面：folders.list 自取+「未归档（移出）」行尾项', async () => {
    setPapers([summary('p1', null)])
    await render()
    await rightClickRow('p1')
    await act(async () => {
      ;[...(menu()?.querySelectorAll<HTMLButtonElement>('button') ?? [])]
        .find((b) => (b.textContent ?? '').includes('移动到文件夹'))!
        .click()
    })
    await settle()
    const sub = host?.querySelector('[data-testid="paper-move-sub"]')
    expect(sub).not.toBeNull()
    expect(sub?.textContent).toContain('主图')
    expect(sub?.textContent).toContain('调研计划')
    expect(sub?.textContent).toContain('未归档（移出）')
  })
})

describe('F-UIRES-01 U4 菜单移动链（moveFolder+收尾两分支）', () => {
  async function openMoveSub(): Promise<void> {
    await rightClickRow('p1')
    await act(async () => {
      ;[...(menu()?.querySelectorAll<HTMLButtonElement>('button') ?? [])]
        .find((b) => (b.textContent ?? '').includes('移动到文件夹'))!
        .click()
    })
    await settle()
  }

  function subItem(label: string): HTMLButtonElement | undefined {
    return [...(host?.querySelectorAll<HTMLButtonElement>('[data-testid="paper-move-sub"] button') ?? [])].find(
      (b) => (b.textContent ?? '').includes(label)
    )
  }

  it('移入文件夹：moveFolder({paperId,toFolderId})+列表重载+行仍在视图→选中保持', async () => {
    setPapers([summary('p1', null)])
    await render()
    await act(async () => {
      useLibraryStore.setState({ selectedId: 'p1' })
    })
    await openMoveSub()
    stubApi.papers.moveFolder.mockResolvedValue({ ok: true, data: { ok: true } })
    stubApi.library.list.mockResolvedValue({ ok: true, data: { items: [summary('p1', 'f-1')], total: 1 } })
    await act(async () => {
      subItem('调研计划')!.click()
    })
    await settle()
    expect(stubApi.papers.moveFolder).toHaveBeenCalledWith({ paperId: 'p1', toFolderId: 'f-1' })
    expect(useLibraryStore.getState().selectedId, '仍在视图→选中保持').toBe('p1')
    expect(menu()).toBeNull()
  })

  it('移出→未归档（folder 视图）：行离开当前视图→选中清空+抽屉清空', async () => {
    useLibraryStore.setState({
      query: { sort: 'added_desc', offset: 0, limit: 50, folderScope: { kind: 'folder', folderId: 'f-1' } }
    })
    setPapers([summary('p1', 'f-1')])
    await render()
    await act(async () => {
      useLibraryStore.setState({ selectedId: 'p1' })
    })
    await openMoveSub()
    stubApi.papers.moveFolder.mockResolvedValue({ ok: true, data: { ok: true } })
    // 重载后列表为空（行已离开 folder 视图）
    stubApi.library.list.mockResolvedValue({ ok: true, data: { items: [], total: 0 } })
    await act(async () => {
      subItem('未归档')!.click()
    })
    await settle()
    expect(stubApi.papers.moveFolder).toHaveBeenCalledWith({ paperId: 'p1', toFolderId: null })
    expect(useLibraryStore.getState().selectedId, '行离开视图→选中清空（抽屉随清）').toBeNull()
  })

  it('失败→拒因中文 toast（ApiClientError.message 透传）+列表保持', async () => {
    setPapers([summary('p1', null)])
    await render()
    await openMoveSub()
    stubApi.papers.moveFolder.mockResolvedValue({
      ok: false,
      error: { code: 'CONFLICT', message: '脉络图编辑保存中，请先完成保存再操作文献归属' }
    })
    await act(async () => {
      subItem('主图')!.click()
    })
    await settle()
    expect(toastSpy).toHaveBeenCalledWith('脉络图编辑保存中，请先完成保存再操作文献归属', 'error')
  })
})
