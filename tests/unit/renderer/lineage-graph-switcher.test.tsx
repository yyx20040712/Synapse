// @vitest-environment jsdom
/**
 * [F-FOLDER-02·B] LineageGraphSwitcher —— 脉络页图切换器（design §4.2）。
 *
 * 覆盖：①下拉=全部图（并集）+folders.list 1:1 选项+标题「脉络图：{名}」真文本；
 * ②切换=setFolder+graph({folderId}) 重取；③S3=folders.changed→列表与标题联动
 * 刷新（改名跟随）；④S4=当前图文件夹消失→回退主图（__main__ 恒在场）+
 * graph 重取；⑤S2=导入 busy 态下拉禁用。
 * always-active（不经 guardedDescribe——K3 威胁结构性缺位）。
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

import { LineageGraphSwitcher } from '../../../src/renderer/features/lineage/LineageGraphSwitcher'
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

async function renderSwitcher(): Promise<void> {
  await act(async () => {
    root?.render(<LineageGraphSwitcher />)
  })
  await settle()
}

function select(): HTMLSelectElement {
  const el = host?.querySelector('select[aria-label="脉络图切换"]')
  expect(el, '切换器下拉在场').toBeDefined()
  return el as HTMLSelectElement
}

function optionLabels(sel: HTMLSelectElement): string[] {
  return Array.from(sel.querySelectorAll('option')).map((o) => o.textContent ?? '')
}

function setSelectValue(sel: HTMLSelectElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')!.set!
  act(() => {
    setter.call(sel, value)
    sel.dispatchEvent(new Event('change', { bubbles: true }))
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  for (const fn of Object.values(stubApi.lineage)) fn.mockReset()
  stubApi.lineage.graph.mockResolvedValue({
    ok: true,
    data: { nodes: [], edges: [], lineTypes: [] }
  })
  foldersNow = [folder('__main__', '主图', 2), folder('f-1', '调研计划', 1)]
  stubApi.folders.list.mockImplementation(async () => ({ ok: true, data: foldersNow }))
  useLineageStore.setState({
    nodes: [],
    edges: [],
    status: 'ready',
    error: null,
    saveStatus: 'saved',
    lastWriteError: null,
    queue: [],
    flushing: false,
    folderId: undefined
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

describe('F-FOLDER-02·B LineageGraphSwitcher', () => {
  it('下拉面=全部图（并集）+folders 1:1；标题真文本「脉络图：全部图（并集）」', async () => {
    await renderSwitcher()
    const sel = select()
    expect(optionLabels(sel)).toEqual(['全部图（并集）', '主图', '调研计划'])
    const title = host?.querySelector('[data-testid="lineage-graph-title"]')
    expect(title?.textContent).toBe('脉络图：全部图（并集）')
  })

  it('切换=setFolder+graph({folderId}) 重取；标题跟随图名', async () => {
    await renderSwitcher()
    setSelectValue(select(), 'f-1')
    await settle()
    expect(useLineageStore.getState().folderId).toBe('f-1')
    expect(stubApi.lineage.graph).toHaveBeenLastCalledWith({ folderId: 'f-1' })
    expect(
      host?.querySelector('[data-testid="lineage-graph-title"]')?.textContent
    ).toBe('脉络图：调研计划')
  })

  it('S3：folders.changed→列表与标题联动刷新（改名跟随——图名=文件夹名单一真相源）', async () => {
    await renderSwitcher()
    setSelectValue(select(), 'f-1')
    await settle()
    foldersNow = [folder('__main__', '主图', 2), folder('f-1', '改名后的图')]
    await act(async () => {
      fireFoldersChanged()
    })
    await settle()
    const title = host?.querySelector('[data-testid="lineage-graph-title"]')?.textContent
    expect(title).toBe('脉络图：改名后的图')
    expect(optionLabels(select())).toContain('改名后的图')
  })

  it('S4：当前图文件夹消失（删除级联）→回退主图+graph 重取（__main__ 恒在场不可删）', async () => {
    await renderSwitcher()
    setSelectValue(select(), 'f-1')
    await settle()
    stubApi.lineage.graph.mockClear()
    foldersNow = [folder('__main__', '主图', 3)] // f-1 被删除
    await act(async () => {
      fireFoldersChanged()
    })
    await settle()
    expect(useLineageStore.getState().folderId).toBe('__main__')
    expect(
      host?.querySelector('[data-testid="lineage-graph-title"]')?.textContent
    ).toBe('脉络图：主图')
    expect(stubApi.lineage.graph).toHaveBeenLastCalledWith({ folderId: '__main__' })
  })

  it('S4 挂载路径：store 残留 stale folderId（他页已删该文件夹）→首拉落定即回退主图', async () => {
    // 删除 UI 在库页——脉络页不在场是 S4 常态路径（store 驻留跨挂载）
    useLineageStore.setState({ folderId: 'f-1' })
    foldersNow = [folder('__main__', '主图', 3)] // f-1 已被删
    stubApi.lineage.graph.mockClear()
    await renderSwitcher()
    expect(useLineageStore.getState().folderId).toBe('__main__')
    expect(
      host?.querySelector('[data-testid="lineage-graph-title"]')?.textContent
    ).toBe('脉络图：主图')
    expect(stubApi.lineage.graph).toHaveBeenLastCalledWith({ folderId: '__main__' })
  })

  it('S2：导入 busy 态下拉禁用（禁切图）', async () => {
    await renderSwitcher()
    act(() => {
      useImportBusyStore.getState().setBusy(true)
    })
    await settle()
    expect(select().disabled).toBe(true)
  })
})
