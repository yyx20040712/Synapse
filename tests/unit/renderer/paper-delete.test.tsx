// @vitest-environment jsdom
/**
 * [F-UIRES-01 批 B] 文献删除流 renderer 矩阵（设计稿 §2.4 态空间全跨格序列——
 * idle→prechecking→deleting/confirming→收尾两分支）。
 *
 * 覆盖：菜单三项版（删除文献点亮）/静默分支两判据（无节点∨edgeCount=0→直删
 * +无 Dialog）/保护分支（edgeCount>0→Dialog 三要素：标题+连带句+图名+连线数）/
 * 取消零调用/确认+收尾两分支（被删行=选中→selectPaper(null)；他行→保持）/
 * 失败→toast+选中不动/预检失败 fail-closed/在途守卫（同 id 静默早退+异 id info
 * toast）/图名派生（folderId=null→主图）。always-active（不经 guardedDescribe）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub, stubApiEvents, toastSpy } from '../../utils/api-client-mock'
import type { PaperDetail, PaperSummary } from '../../../src/shared/models/paper'

let foldersNow: Array<{ id: string; name: string; position: number; paperCount: number }> = [
  { id: '__main__', name: '主图', position: 0, paperCount: 1 },
  { id: 'f-1', name: '调研计划', position: 1, paperCount: 1 }
]
const stubApi = makeApiStub({
  library: { list: vi.fn(), detail: vi.fn() },
  folders: { list: vi.fn() },
  papers: { moveFolder: vi.fn(), delete: vi.fn() },
  tags: { list: vi.fn() }
})
stubApiEvents({
  onFoldersChanged: vi.fn(() => () => undefined),
  onImportProgress: vi.fn(() => () => undefined)
})

import { LibraryPage } from '../../../src/renderer/features/library/LibraryPage'
import { useLibraryStore } from '../../../src/renderer/features/library/library.store'

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

/** detail 载荷（lineage 省略=无节点——预检判据面）。summary 的 lineage 键
 * （summary 面无 edgeCount）先剥除再摊入——类型面防串型 */
function detailBody(id: string, folderId: string | null, lineage?: { edgeCount: number }): PaperDetail {
  const { lineage: _summaryLineage, ...rest } = summary(id, folderId)
  const d: PaperDetail = {
    ...rest,
    abstract: '',
    arxivId: null,
    source: 'local',
    enrichStatus: 'pending',
    fileUrl: `app-file://${id}`,
    fileName: `${id}.pdf`,
    updatedAt: 't',
    tags: []
  }
  return lineage === undefined
    ? d
    : { ...d, lineage: { year: 2024, month: null, edgeCount: lineage.edgeCount } }
}

let listNow: PaperSummary[]
let root: Root | null = null
let host: HTMLDivElement | null = null

function setPapers(items: PaperSummary[]): void {
  listNow = items
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

async function settle(turns = 8): Promise<void> {
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

function dialog(): HTMLElement | null {
  return host?.querySelector('[role="dialog"]') ?? null
}

function dialogButton(label: string): HTMLButtonElement | undefined {
  return [...(dialog()?.querySelectorAll<HTMLButtonElement>('button') ?? [])].find(
    (b) => (b.textContent ?? '').trim() === label
  )
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

/** 右键行→点菜单「删除文献」（菜单即收起——§2.4） */
async function clickDeleteMenu(id: string): Promise<void> {
  await rightClickRow(id)
  const item = [...(menu()?.querySelectorAll<HTMLButtonElement>('button') ?? [])].find(
    (b) => (b.textContent ?? '').trim() === '删除文献'
  )
  expect(item, '菜单删除项存在').toBeDefined()
  await act(async () => {
    item!.click()
  })
  await settle()
}

beforeEach(() => {
  Element.prototype.scrollIntoView = () => undefined
  vi.clearAllMocks()
  stubApi.library.list.mockReset()
  stubApi.library.detail.mockReset()
  stubApi.folders.list.mockReset()
  stubApi.papers.moveFolder.mockReset()
  stubApi.papers.delete.mockReset()
  stubApi.tags.list.mockReset()
  foldersNow = [
    { id: '__main__', name: '主图', position: 0, paperCount: 1 },
    { id: 'f-1', name: '调研计划', position: 1, paperCount: 1 }
  ]
  listNow = []
  stubApi.library.list.mockImplementation(async () => ({ ok: true, data: { items: listNow, total: listNow.length } }))
  stubApi.folders.list.mockImplementation(async () => ({ ok: true, data: foldersNow }))
  stubApi.tags.list.mockResolvedValue({ ok: true, data: [] })
  stubApi.papers.delete.mockResolvedValue({ ok: true, data: { ok: true } })
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

describe('F-UIRES-01 批 B 菜单三项版（删除项点亮）', () => {
  it('右键行→菜单三项：在阅读器中打开/移动到文件夹/删除文献（danger）；星标项零渲染（DB 窗口）', async () => {
    setPapers([summary('p1', null)])
    await render()
    await rightClickRow('p1')
    expect(menu()).not.toBeNull()
    expect(menu()?.textContent).toContain('在阅读器中打开')
    expect(menu()?.textContent).toContain('移动到文件夹')
    expect(menu()?.textContent).toContain('删除文献')
    expect(menu()?.textContent).not.toContain('星标')
    // danger 色（§3.5——var(--danger)）
    const del = [...(menu()?.querySelectorAll<HTMLButtonElement>('button') ?? [])].find(
      (b) => (b.textContent ?? '').trim() === '删除文献'
    )
    expect(del?.style.color).toBe('var(--danger)')
  })
})

describe('F-UIRES-01 批 B 删除流态空间（§2.4）', () => {
  it('静默判据①：无节点（detail.lineage 省略）→直删+无 Dialog+收尾重载', async () => {
    setPapers([summary('p1', null)])
    stubApi.library.detail.mockResolvedValue({ ok: true, data: detailBody('p1', null) })
    await render()
    const listCallsBefore = stubApi.library.list.mock.calls.length
    await clickDeleteMenu('p1')
    expect(stubApi.library.detail).toHaveBeenCalledWith({ paperId: 'p1' })
    expect(stubApi.papers.delete).toHaveBeenCalledWith({ paperId: 'p1' })
    expect(dialog()).toBeNull()
    expect(stubApi.library.list.mock.calls.length).toBeGreaterThan(listCallsBefore) // 收尾重载
  })

  it('静默判据②：节点无边（edgeCount=0）→直删+无 Dialog', async () => {
    setPapers([summary('p1', 'f-1')])
    stubApi.library.detail.mockResolvedValue({ ok: true, data: detailBody('p1', 'f-1', { edgeCount: 0 }) })
    await render()
    await clickDeleteMenu('p1')
    expect(stubApi.papers.delete).toHaveBeenCalledTimes(1)
    expect(stubApi.papers.delete).toHaveBeenCalledWith({ paperId: 'p1' })
    expect(dialog()).toBeNull()
  })

  it('保护分支：节点有边（edgeCount>0）→Dialog 三要素（标题+连带句+图名+连线数）+零直删', async () => {
    setPapers([summary('p1', 'f-1')])
    stubApi.library.detail.mockResolvedValue({ ok: true, data: detailBody('p1', 'f-1', { edgeCount: 3 }) })
    await render()
    await clickDeleteMenu('p1')
    expect(dialog()).not.toBeNull()
    expect(dialog()?.textContent).toContain('删除文献？')
    expect(dialog()?.textContent).toContain('同时移除其节点与全部连线')
    expect(dialog()?.textContent).toContain('调研计划') // 图名（folders.list 派生）
    expect(dialog()?.textContent).toContain('3 条连线') // [RR1-4] 连线数整句锚（防裸数字误配）
    expect(stubApi.papers.delete).not.toHaveBeenCalled() // 未确认零调用
  })

  it('图名派生：folderId=null（未归档）→「主图」（§2.1 缺省图映射）', async () => {
    setPapers([summary('p1', null)])
    stubApi.library.detail.mockResolvedValue({ ok: true, data: detailBody('p1', null, { edgeCount: 2 }) })
    await render()
    await clickDeleteMenu('p1')
    expect(dialog()).not.toBeNull()
    expect(dialog()?.textContent).toContain('主图')
  })

  it('取消→零 delete 调用+弹窗关闭', async () => {
    setPapers([summary('p1', 'f-1')])
    stubApi.library.detail.mockResolvedValue({ ok: true, data: detailBody('p1', 'f-1', { edgeCount: 3 }) })
    await render()
    await clickDeleteMenu('p1')
    await act(async () => {
      dialogButton('取消')!.click()
    })
    await settle()
    expect(stubApi.papers.delete).not.toHaveBeenCalled()
    expect(dialog()).toBeNull()
  })

  it('确认→delete 调用+收尾：被删行=当前选中→selectPaper(null)（抽屉随清）', async () => {
    setPapers([summary('p1', 'f-1'), summary('p2', null)])
    stubApi.library.detail.mockImplementation(async (q: { paperId: string }) => ({
      ok: true,
      data: detailBody(q.paperId, q.paperId === 'p1' ? 'f-1' : null, q.paperId === 'p1' ? { edgeCount: 3 } : undefined)
    }))
    await render()
    await act(async () => {
      useLibraryStore.setState({ selectedId: 'p1' })
    })
    await clickDeleteMenu('p1')
    // 重载后列表无 p1（被删必离开）
    listNow = [summary('p2', null)]
    await act(async () => {
      dialogButton('删除文献')!.click()
    })
    await settle()
    expect(stubApi.papers.delete).toHaveBeenCalledWith({ paperId: 'p1' })
    expect(useLibraryStore.getState().selectedId).toBeNull()
  })

  it('确认→收尾：他行选中→保持（selectPaper 不动）', async () => {
    setPapers([summary('p1', 'f-1'), summary('p2', null)])
    stubApi.library.detail.mockImplementation(async (q: { paperId: string }) => ({
      ok: true,
      data: detailBody(q.paperId, q.paperId === 'p1' ? 'f-1' : null, q.paperId === 'p1' ? { edgeCount: 3 } : undefined)
    }))
    await render()
    await act(async () => {
      useLibraryStore.setState({ selectedId: 'p2' })
    })
    await clickDeleteMenu('p1')
    listNow = [summary('p2', null)]
    await act(async () => {
      dialogButton('删除文献')!.click()
    })
    await settle()
    expect(stubApi.papers.delete).toHaveBeenCalledTimes(1)
    expect(useLibraryStore.getState().selectedId, '他行选中→保持').toBe('p2')
  })

  it('删除失败→ApiClientError.message 透传 toast+选中不动+列表零动作', async () => {
    setPapers([summary('p1', null)])
    stubApi.library.detail.mockResolvedValue({ ok: true, data: detailBody('p1', null) })
    stubApi.papers.delete.mockResolvedValue({
      ok: false,
      error: { code: 'CONFLICT', message: '脉络图编辑保存中，请先完成保存再操作文献归属' }
    })
    await render()
    await act(async () => {
      useLibraryStore.setState({ selectedId: 'p1' })
    })
    const listCallsBefore = stubApi.library.list.mock.calls.length
    await clickDeleteMenu('p1')
    expect(toastSpy).toHaveBeenCalledWith('脉络图编辑保存中，请先完成保存再操作文献归属', 'error')
    expect(useLibraryStore.getState().selectedId).toBe('p1') // 选中不动
    expect(stubApi.library.list.mock.calls.length).toBe(listCallsBefore) // 列表保持零动作
  })

  it('[裁决部 C1] 弹窗路径删除失败→Dialog 仍开（toast+可重试）——RR1-2b 失败态先例（FolderDeleteDialog 同型）', async () => {
    setPapers([summary('p1', 'f-1')])
    stubApi.library.detail.mockResolvedValue({ ok: true, data: detailBody('p1', 'f-1', { edgeCount: 3 }) })
    // 第一次确认失败（Once 覆盖），回落 beforeEach 缺省成功——重试路径自证
    stubApi.papers.delete.mockResolvedValueOnce({
      ok: false,
      error: { code: 'CONFLICT', message: '脉络图编辑保存中，请先完成保存再操作文献归属' }
    })
    await render()
    await clickDeleteMenu('p1')
    await act(async () => {
      dialogButton('删除文献')!.click()
    })
    await settle()
    expect(toastSpy).toHaveBeenCalledWith('脉络图编辑保存中，请先完成保存再操作文献归属', 'error')
    expect(dialog()).not.toBeNull() // 失败=弹窗保持开可重试（主控裁定随 FolderDeleteDialog 先例）
    // 可重试：busy 已复位，第二次确认走缺省成功→onDone+onClose
    listNow = []
    await act(async () => {
      dialogButton('删除文献')!.click()
    })
    await settle()
    expect(stubApi.papers.delete).toHaveBeenCalledTimes(2)
    expect(dialog()).toBeNull()
  })

  it('预检失败→fail-closed：error toast+零 delete 零 Dialog（useFolderDelete 同判据先例）', async () => {
    setPapers([summary('p1', null)])
    stubApi.library.detail.mockResolvedValue({
      ok: false,
      error: { code: 'NOT_FOUND', message: '文献不存在：p1' }
    })
    await render()
    await clickDeleteMenu('p1')
    expect(toastSpy).toHaveBeenCalledWith('文献不存在：p1', 'error')
    expect(stubApi.papers.delete).not.toHaveBeenCalled()
    expect(dialog()).toBeNull()
  })

  /** 在途挂起桩（detail 悬置——folder-nav hangGraph 同型） */
  function hangDetail(): (v: unknown) => void {
    let resolveDetail!: (v: unknown) => void
    stubApi.library.detail.mockImplementation(
      () => new Promise((res) => { resolveDetail = res })
    )
    return (v: unknown) => resolveDetail(v)
  }

  it('在途守卫：异 id 再点→info toast「上一次删除仍在进行」+不执行（预检都不发）', async () => {
    const resolveDetail = hangDetail()
    setPapers([summary('p1', null), summary('p2', null)])
    await render()
    await clickDeleteMenu('p1')
    // 在途窗内右键删除另一文献
    await rightClickRow('p2')
    const item = [...(menu()?.querySelectorAll<HTMLButtonElement>('button') ?? [])].find(
      (b) => (b.textContent ?? '').trim() === '删除文献'
    )
    await act(async () => {
      item!.click()
    })
    await settle()
    expect(toastSpy).toHaveBeenCalledWith('上一次删除仍在进行，请稍候', 'info')
    expect(stubApi.library.detail).toHaveBeenCalledTimes(1) // 第二请求预检都不发
    // 第一目标照常落定
    resolveDetail({ ok: true, data: detailBody('p1', null) })
    await settle()
    expect(stubApi.papers.delete).toHaveBeenCalledTimes(1)
    expect(stubApi.papers.delete).toHaveBeenCalledWith({ paperId: 'p1' })
  })

  it('在途守卫：同 id 再点→静默早退（无 toast+仅一次预检/删除）', async () => {
    const resolveDetail = hangDetail()
    setPapers([summary('p1', null)])
    await render()
    await clickDeleteMenu('p1')
    await clickDeleteMenu('p1') // 同 id 重复点（菜单已收起→重开再点）
    expect(stubApi.library.detail).toHaveBeenCalledTimes(1)
    expect(toastSpy).not.toHaveBeenCalled()
    resolveDetail({ ok: true, data: detailBody('p1', null) })
    await settle()
    expect(stubApi.papers.delete).toHaveBeenCalledTimes(1)
  })

  /** folders.list 悬置桩（RR1-6a——hangDetail 同型；folders.list 同被
   * FolderNav/行菜单并发消费，悬置窗内全部挂起调用一并决议） */
  function hangFolders(): (v: unknown) => void {
    const resolvers: Array<(v: unknown) => void> = []
    stubApi.folders.list.mockImplementation(
      () => new Promise((res) => { resolvers.push(res) })
    )
    return (v: unknown) => {
      for (const r of resolvers.splice(0)) r(v)
    }
  }

  it('[RR1-1/W1] folders.list 悬置窗同 id 再点→静默早退（detail 仅一次——守卫窗连续覆盖 prechecking 全程）', async () => {
    const resolveFolders = hangFolders()
    setPapers([summary('p1', null)])
    stubApi.library.detail.mockResolvedValue({ ok: true, data: detailBody('p1', null, { edgeCount: 2 }) })
    await render()
    await clickDeleteMenu('p1') // detail 已落→folders.list 悬置（保护分支后半段）
    await clickDeleteMenu('p1') // 同 id 再点——ref 未释放应早退
    expect(stubApi.library.detail).toHaveBeenCalledTimes(1)
    expect(toastSpy).not.toHaveBeenCalled()
    resolveFolders({ ok: true, data: foldersNow })
    await settle()
    expect(dialog()).not.toBeNull() // 第一请求照常落定→保护弹窗
  })

  it('[RR1-2/W4] folders.list 失败→fail-closed：error toast+零 delete+零 Dialog（图名派生数据源同判据）', async () => {
    setPapers([summary('p1', null)])
    stubApi.library.detail.mockResolvedValue({ ok: true, data: detailBody('p1', null, { edgeCount: 2 }) })
    stubApi.folders.list.mockResolvedValue({
      ok: false,
      error: { code: 'NOT_FOUND', message: '文件夹列表暂不可用' }
    })
    await render()
    await clickDeleteMenu('p1')
    expect(toastSpy).toHaveBeenCalledWith('文件夹列表暂不可用', 'error')
    expect(stubApi.papers.delete).not.toHaveBeenCalled()
    expect(dialog()).toBeNull()
  })

  it('[W4·自报⑤补测] 图名派生竞态：folderId 不在 folders.list→Dialog 含「主图」（事务内级联权威——提示值兜底）', async () => {
    setPapers([summary('p1', 'f-x')])
    stubApi.library.detail.mockResolvedValue({ ok: true, data: detailBody('p1', 'f-x', { edgeCount: 1 }) })
    await render()
    await clickDeleteMenu('p1')
    expect(dialog()).not.toBeNull()
    expect(dialog()?.textContent).toContain('主图')
  })
})
