// @vitest-environment jsdom
/**
 * [B2 红测试] LineagePage 挂载同图重取——现状缺陷红证+语义守卫（plan-v1 §4.1
 * 「LineagePage 返回既有 ready 同图时跳过挂载同步重取」的先红半场）。
 *
 * 现状缺陷（summary §3 路径一③）：LineagePage 挂载 effect 无条件
 * setFolder(库页上下文图)（lineage.store setFolder 注释明文「不做同值守卫」）
 * →每次进页=全图 graph IPC 重取。目标行为：挂载编排层在「store 已 ready+
 * 同 folderId+无 needsReload」时跳过 setFolder（零新增 graph IPC，渲染走
 * store 驻留数据——P-2 数据暂存保留面）；手工同值重选（setFolder 直调）
 * 的当前图域语义本批不改（B4/B5 再统一），故本文件同锁两向互斥守卫。
 *
 * 落地方式（plan §4.3）：实现批把本文件红用例转绿；守卫用例全程保持绿。
 * mock 面申报：makeApiStub（api/client 展开型）+apiEvents.onFoldersChanged
 * （nav-graph-picker 订阅面——lineage-timeline-page.test.tsx 配方同族）。
 * always-active（ADR-0017 裁决 3——不经 guardedDescribe）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { LineageEdge, LineageNode } from '../../../src/shared/models/lineage'
import { makeApiStub, stubApiEvents } from '../../utils/api-client-mock'

const stubApi = makeApiStub({
  lineage: { graph: vi.fn() },
  folders: { list: vi.fn() }
})
stubApiEvents({
  onFoldersChanged: vi.fn(() => () => undefined)
})

import { LineagePage } from '../../../src/renderer/features/lineage/LineagePage'
import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'
import { useLineageViewStore } from '../../../src/renderer/features/lineage/lineage-view.store'
import { useLibraryStore } from '../../../src/renderer/features/library/library.store'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

function node(id: string, patch: Partial<Pick<LineageNode, 'year' | 'month' | 'x' | 'y' | 'paperId' | 'title'>> = {}): LineageNode {
  return {
    id,
    paperId: patch.paperId !== undefined ? patch.paperId : `paper-${id}`,
    title: patch.title ?? `节点${id}`,
    year: patch.year ?? null,
    x: patch.x ?? null,
    y: patch.y ?? null,
    month: patch.month ?? null,
    slot: null,
    folderId: '__main__',
    createdAt: 't',
    updatedAt: 't'
  }
}

function edge(from: string, to: string): LineageEdge {
  return { id: `e-${from}-${to}`, fromNode: from, toNode: to, label: '', dashed: false, color: '#1e3a8a', createdAt: 't', updatedAt: 't' }
}

/** 三节点链：A(2020)→B(2021)→C(2022)——真实文本断言锚=「扩散模型起点」 */
function chain(): { nodes: LineageNode[]; edges: LineageEdge[] } {
  return {
    nodes: [
      node('A', { year: 2020, title: '扩散模型起点' }),
      node('B', { year: 2021, paperId: null, title: '主题分组' }),
      node('C', { year: 2022, title: '最新进展' })
    ],
    edges: [edge('A', 'B'), edge('B', 'C')]
  }
}

let root: Root | null = null
let host: HTMLDivElement | null = null

function mount(tree: JSX.Element): void {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root?.render(tree)
  })
}

function unmount(): void {
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
}

const flush = async (turns = 6): Promise<void> => {
  for (let i = 0; i < turns; i += 1) {
    await act(async () => {
      await Promise.resolve()
    })
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  stubApi.lineage.graph.mockResolvedValue({ ok: true, data: { nodes: [], edges: [] } })
  stubApi.folders.list.mockResolvedValue({
    ok: true,
    data: [
      { id: '__main__', name: '主图', position: 0, paperCount: 0 },
      { id: 'f-x', name: '测试图乙', position: 1, paperCount: 0 }
    ]
  })
  // 模块级 store 跨用例存留：显式复位（lineage-timeline-page.test.tsx 配方同族）
  useLineageStore.setState({
    nodes: [],
    edges: [],
    status: 'loading',
    error: null,
    folderId: '__main__',
    saveStatus: 'clean',
    needsReload: false,
    queue: [],
    flushing: false
  })
  useLineageViewStore.setState({
    mode: 'browse',
    focusSet: [],
    navCollapsed: false,
    navWidth: 208,
    navScrollTarget: null,
    activeFrameKey: null
  })
  useLibraryStore.setState({ query: { sort: 'added_desc', offset: 0, limit: 50 } })
})

afterEach(() => {
  if (root !== null) unmount()
})

describe('[B2] LineagePage 返回既有 ready 同图——挂载同步重取跳过（红→实现批转绿）', () => {
  it('红证：主图 ready 同图返回——再次挂载零新增 graph IPC，节点真实文本仍渲染', async () => {
    stubApi.lineage.graph.mockResolvedValue({ ok: true, data: chain() })
    mount(<LineagePage />)
    await flush()
    // 前提自证（防前提漂移的恒真风险）：首次挂载取数一次且渲染
    expect(stubApi.lineage.graph).toHaveBeenCalledTimes(1)
    expect(host?.textContent).toContain('扩散模型起点')
    unmount()
    stubApi.lineage.graph.mockClear()
    // 返回：store 已 ready+folderId=__main__（库页未选=主图）——目标=零取数
    mount(<LineagePage />)
    await flush()
    expect(
      stubApi.lineage.graph,
      '返回既有 ready 同图=跳过挂载同步重取（现状：setFolder→load→graph 第二次调用，本断言红）'
    ).not.toHaveBeenCalled()
    expect(host?.textContent, '跳过重取不等于白屏——store 驻留数据照常渲染').toContain('扩散模型起点')
  })

  it('红证：folder 作用域 ready 同图返回——再次挂载零新增 graph IPC（判据字段=folderId 非主图特例）', async () => {
    stubApi.lineage.graph.mockResolvedValue({ ok: true, data: chain() })
    useLibraryStore.setState({
      query: { sort: 'added_desc', offset: 0, limit: 50, folderScope: { kind: 'folder', folderId: 'f-x' } }
    })
    mount(<LineagePage />)
    await flush()
    expect(stubApi.lineage.graph).toHaveBeenCalledTimes(1)
    expect(stubApi.lineage.graph).toHaveBeenCalledWith({ folderId: 'f-x' })
    expect(useLineageStore.getState().folderId).toBe('f-x')
    unmount()
    stubApi.lineage.graph.mockClear()
    mount(<LineagePage />)
    await flush()
    expect(
      stubApi.lineage.graph,
      'folder 作用域同图返回=同样跳过（现状红：第二次 {folderId:"f-x"} 取数发生）'
    ).not.toHaveBeenCalled()
    expect(host?.textContent).toContain('扩散模型起点')
  })
})

describe('[B2] 同图跳过判据的互斥守卫（全程保持绿——实现批不得削弱）', () => {
  it('显式切图（不同 folderId）挂载/在页切换仍重取', async () => {
    stubApi.lineage.graph.mockResolvedValue({ ok: true, data: chain() })
    mount(<LineagePage />)
    await flush()
    expect(stubApi.lineage.graph).toHaveBeenCalledTimes(1)
    stubApi.lineage.graph.mockClear()
    act(() => {
      useLineageStore.getState().setFolder('f-x')
    })
    await flush()
    expect(stubApi.lineage.graph, '显式切图=仍重取（同图跳过不扩大到切图写路径）').toHaveBeenCalledTimes(1)
    expect(stubApi.lineage.graph).toHaveBeenCalledWith({ folderId: 'f-x' })
    expect(useLineageStore.getState().folderId).toBe('f-x')
  })

  it('手工同值重选当前图仍重取（setFolder 无同值守卫——本批语义不改，B4/B5 再统一）', async () => {
    stubApi.lineage.graph.mockResolvedValue({ ok: true, data: chain() })
    mount(<LineagePage />)
    await flush()
    expect(stubApi.lineage.graph).toHaveBeenCalledTimes(1)
    stubApi.lineage.graph.mockClear()
    act(() => {
      useLineageStore.getState().setFolder('__main__')
    })
    await flush()
    expect(
      stubApi.lineage.graph,
      'setFolder 同值直调=仍重取（挂载编排层跳过≠store 动作守卫——两向互斥）'
    ).toHaveBeenCalledTimes(1)
    expect(stubApi.lineage.graph).toHaveBeenCalledWith({ folderId: '__main__' })
  })

  it('needsReload=true（INV-175 和解位未清）同图挂载仍重取', async () => {
    useLineageStore.setState({
      status: 'ready',
      folderId: '__main__',
      nodes: chain().nodes,
      edges: chain().edges,
      needsReload: true
    })
    mount(<LineagePage />)
    await flush()
    expect(
      stubApi.lineage.graph,
      'needsReload 未清=图态与库态偏离待和解——同图也不跳过（清位唯二=load 应用分支+discardSession）'
    ).toHaveBeenCalledTimes(1)
    expect(stubApi.lineage.graph).toHaveBeenCalledWith({ folderId: '__main__' })
  })

  it('saveStatus 非 clean（dirty 会话）挂载零取数——暂存图保留（既有 P-2 语义，本批不动）', async () => {
    useLineageStore.setState({
      status: 'ready',
      folderId: '__main__',
      nodes: chain().nodes,
      edges: chain().edges,
      saveStatus: 'dirty'
    })
    mount(<LineagePage />)
    await flush()
    expect(stubApi.lineage.graph, 'dirty 会话跳过库页上下文同步=既有行为（跨页返回不丢编辑）').not.toHaveBeenCalled()
    expect(host?.textContent, '暂存图照常渲染').toContain('扩散模型起点')
  })

  it('status 非 ready（loading/error）挂载仍取数——跳过判据不含非 ready 态', async () => {
    // error 态返回：重试径=挂载取数单点（lineage-timeline-page.test「error：取数失败
    // 呈错误条+重试」同族——重试钮与挂载效应都走 load）
    useLineageStore.setState({ status: 'error', error: 'db locked', folderId: '__main__' })
    stubApi.lineage.graph.mockResolvedValue({ ok: true, data: chain() })
    mount(<LineagePage />)
    await flush()
    expect(stubApi.lineage.graph, 'error 态挂载=仍取数（跳过只适用 ready 同图）').toHaveBeenCalledTimes(1)
    expect(host?.textContent).toContain('扩散模型起点')
  })
})
