// @vitest-environment jsdom
/**
 * [F-LGRAPH-01①U4] NavGraphPicker —— 导航窗格图/文件夹下拉（自
 * LineageGraphSwitcher 迁移改写：S2 导入 busy 禁切/S3 folders.changed 联动/
 * S4 当前图删除回退主图——三语义行为面零变；**并集首项退役**：每图只显示
 * 自身，主图恒在列，切换恒 folderId 载荷）。always-active（不经 guardedDescribe）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub, stubApiEvents } from '../../utils/api-client-mock'

type Folder = { id: string; name: string; position: number; paperCount: number }
const folder = (id: string, name: string, paperCount = 0): Folder => ({
  id,
  name,
  position: 0,
  paperCount
})

let foldersNow: Folder[] = [
  folder('__main__', '主图', 2),
  folder('f-1', '调研计划', 1)
]
const stubApi = makeApiStub({
  folders: { list: vi.fn() },
  lineage: {
    graph: vi.fn(),
    upsertNode: vi.fn(),
    removeNode: vi.fn(),
    upsertEdge: vi.fn(),
    removeEdge: vi.fn(),
    upsertLineTypes: vi.fn()
  }
})

/** folders.changed 订阅捕获（S3/S4 驱动面） */
let fireFoldersChanged: () => void = () => undefined
stubApiEvents({
  onFoldersChanged: (cb: () => void) => {
    fireFoldersChanged = () => cb()
    return () => undefined
  }
})

import { NavGraphPicker } from '../../../src/renderer/features/lineage/nav-graph-picker'
import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'
import { useImportBusyStore } from '../../../src/renderer/shared/import-busy.store'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
let host: HTMLDivElement | null = null

async function settle(turns = 6): Promise<void> {
  for (let i = 0; i < turns; i += 1) {
    await act(async () => {
      await Promise.resolve()
    })
  }
}

async function renderPicker(): Promise<void> {
  await act(async () => {
    root?.render(<NavGraphPicker />)
  })
  await settle()
}

const q = (sel: string): Element | null => host?.querySelector(sel) ?? null
const req = (sel: string): Element => {
  const el = q(sel)
  if (el === null) throw new Error(`元素未渲染：${sel}`)
  return el
}

/** 展开下拉（T5 点一下开） */
const openMenu = (): void => {
  act(() => {
    req('[data-testid="lineage-nav-graph"]').dispatchEvent(
      new MouseEvent('click', { bubbles: true })
    )
  })
}

/** 菜单行名列表 */
const optionLabels = (): string[] =>
  Array.from(q('[data-testid="lineage-nav-graph-menu"]')?.querySelectorAll('button') ?? []).map(
    (b) => b.textContent ?? ''
  )

/** 选中行（data-folder-id 驱动） */
const pickFolder = (id: string): void => {
  act(() => {
    req(`[data-testid="lineage-nav-graph-menu"] [data-folder-id="${id}"]`).dispatchEvent(
      new MouseEvent('click', { bubbles: true })
    )
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  for (const fn of Object.values(stubApi.lineage)) fn.mockReset()
  stubApi.lineage.graph.mockResolvedValue({
    ok: true,
    data: { nodes: [], edges: [], lineTypeNames: ['待命名', '待命名', '待命名', '待命名', '待命名', '待命名'] }
  })
  foldersNow = [folder('__main__', '主图', 2), folder('f-1', '调研计划', 1)]
  stubApi.folders.list.mockImplementation(async () => ({ ok: true, data: foldersNow }))
  useLineageStore.setState({
    nodes: [],
    edges: [],
    status: 'ready',
    error: null,
    saveStatus: 'clean', // [②U1] 会话基线（saved→clean）
    lastWriteError: null,
    queue: [],
    flushing: false,
    undoStack: [],
    redoStack: [],
    // [F-LGRAPH-01①U4] folderId 恒有值（主图兜底）
    folderId: '__main__'
  })
  useImportBusyStore.getState().setBusy(false)
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  host?.remove()
  root = null
  host = null
})

describe('F-LGRAPH-01①U4 NavGraphPicker（图/文件夹下拉——并集退役）', () => {
  it('下拉面=folders 平铺（主图恒在列+每图只显示自身）；并集首项退役负锚；当前图名真文本', async () => {
    await renderPicker()
    openMenu()
    expect(optionLabels()).toEqual(['主图', '调研计划']) // 1:1 folders（无「全部图（并集）」行）
    expect(optionLabels()).not.toContain('全部图（并集）') // 并集退役负锚（在场即红）
    expect(req('[data-testid="lineage-nav-graph"]').textContent).toContain('主图') // 当前图名（缺省主图）
  })

  it('切换=setFolder+graph({folderId}) 重取；按钮图名跟随；收起列表', async () => {
    await renderPicker()
    openMenu()
    pickFolder('f-1')
    await settle()
    expect(useLineageStore.getState().folderId).toBe('f-1')
    expect(stubApi.lineage.graph).toHaveBeenLastCalledWith({ folderId: 'f-1' })
    expect(req('[data-testid="lineage-nav-graph"]').textContent).toContain('调研计划')
    expect(q('[data-testid="lineage-nav-graph-menu"]')).toBeNull() // 选行后收起（T5/T6）
  })

  it('S3：folders.changed→列表与图名联动刷新（改名跟随——图名=文件夹名单一真相源）', async () => {
    await renderPicker()
    openMenu()
    pickFolder('f-1')
    await settle()
    foldersNow = [folder('__main__', '主图', 2), folder('f-1', '改名后的图')]
    await act(async () => {
      fireFoldersChanged()
    })
    await settle()
    expect(req('[data-testid="lineage-nav-graph"]').textContent).toContain('改名后的图')
    openMenu()
    expect(optionLabels()).toContain('改名后的图')
  })

  it('S4：当前图文件夹消失（删除级联）→回退主图+graph 重取（__main__ 恒在场不可删）', async () => {
    await renderPicker()
    openMenu()
    pickFolder('f-1')
    await settle()
    stubApi.lineage.graph.mockClear()
    foldersNow = [folder('__main__', '主图', 3)] // f-1 被删除
    await act(async () => {
      fireFoldersChanged()
    })
    await settle()
    expect(useLineageStore.getState().folderId).toBe('__main__')
    expect(req('[data-testid="lineage-nav-graph"]').textContent).toContain('主图')
    expect(stubApi.lineage.graph).toHaveBeenLastCalledWith({ folderId: '__main__' })
  })

  it('S4 挂载路径：store 残留 stale folderId（他页已删该文件夹）→首拉落定即回退主图', async () => {
    useLineageStore.setState({ folderId: 'f-1' })
    foldersNow = [folder('__main__', '主图', 3)] // f-1 已被删
    stubApi.lineage.graph.mockClear()
    await renderPicker()
    expect(useLineageStore.getState().folderId).toBe('__main__')
    expect(req('[data-testid="lineage-nav-graph"]').textContent).toContain('主图')
    expect(stubApi.lineage.graph).toHaveBeenLastCalledWith({ folderId: '__main__' })
  })

  it('S2：导入 busy 态下拉禁切（按钮 disabled）', async () => {
    await renderPicker()
    act(() => {
      useImportBusyStore.getState().setBusy(true)
    })
    await settle()
    expect(
      (req('[data-testid="lineage-nav-graph"]') as HTMLButtonElement).disabled
    ).toBe(true)
  })
})
