// @vitest-environment jsdom
/**
 * [回炉 W-B2·R-W2 / 设计稿 §2.5 #30/#32/#33、§8.1、§8.3「离场 flush-first」「返回不双取」]
 * LineagePage 挂载效应的目标 folder 同步策略（flush-first 语义迁移）：
 * - 目标=当前 ∧ ready ∧ needsReload=0 → 零 graph IPC，不论图是否为空（只有悬浮笔记的图也是
 *   ready 会话——「ready 空图挂载重取」例外退役）；
 * - 目标≠当前 → setFolder(target)：离场会话 flush-first（不以 IO 状态阻切——「非 clean 时跳过
 *   目标 folder 同步」的 saving 禁切残留退役），目标会话取数裁决交 registry。
 * 既有同图跳过的互斥守卫见 lineage-b2-remount-refetch.test.tsx。always-active。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { LineageEdge, LineageNode } from '../../../src/shared/models/lineage'
import { makeApiStub, stubApiEvents } from '../../utils/api-client-mock'
import { resetLineageSessionsForTests } from './lineage-test-session-reset'

const stubApi = makeApiStub({
  lineage: { graph: vi.fn(), patchNode: vi.fn(), upsertEdge: vi.fn(), removeEdge: vi.fn() },
  folders: { list: vi.fn() }
})
stubApiEvents({
  onFoldersChanged: vi.fn(() => () => undefined)
})

import { LineagePage } from '../../../src/renderer/features/lineage/LineagePage'
import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'
import { useLineageViewStore } from '../../../src/renderer/features/lineage/lineage-view.store'
import { useLibraryStore } from '../../../src/renderer/features/library/library.store'
import { lineageRegistry } from '../../../src/renderer/features/lineage/lineage-session-registry'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

function node(id: string, patch: Partial<Pick<LineageNode, 'year' | 'month' | 'slot' | 'x' | 'y' | 'paperId' | 'title' | 'folderId'>> = {}): LineageNode {
  return {
    id,
    paperId: patch.paperId !== undefined ? patch.paperId : `paper-${id}`,
    title: patch.title ?? `节点${id}`,
    year: patch.year ?? 2021,
    x: patch.x ?? null,
    y: patch.y ?? null,
    month: patch.month ?? 9,
    slot: patch.slot ?? 0,
    folderId: patch.folderId ?? '__main__',
    createdAt: 't',
    updatedAt: 't'
  }
}

function edge(from: string, to: string): LineageEdge {
  return { id: `e-${from}-${to}`, fromNode: from, toNode: to, label: '', dashed: false, color: '#1e1e1e', createdAt: 't', updatedAt: 't' }
}

/** 三节点链：A→B→C——真实文本断言锚=「扩散模型起点」 */
function chain(): { nodes: LineageNode[]; edges: LineageEdge[] } {
  return {
    nodes: [
      node('A', { title: '扩散模型起点' }),
      node('B', { paperId: null, title: '主题分组' }),
      node('C', { title: '最新进展' })
    ],
    edges: [edge('A', 'B'), edge('B', 'C')]
  }
}

let root: Root | null = null
let host: HTMLDivElement | null = null

function mount(): void {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root?.render(<LineagePage />)
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
const flush = async (turns = 8): Promise<void> => {
  for (let i = 0; i < turns; i += 1) {
    await act(async () => {
      await Promise.resolve()
    })
  }
}
const graphCalls = (): Array<{ folderId: string }> => stubApi.lineage.graph.mock.calls.map((c) => c[0] as { folderId: string })
const state = () => useLineageStore.getState()

beforeEach(() => {
  vi.clearAllMocks()
  stubApi.lineage.graph.mockReset()
  stubApi.lineage.patchNode.mockReset()
  stubApi.folders.list.mockResolvedValue({
    ok: true,
    data: [
      { id: '__main__', name: '主图', position: 0, paperCount: 0 },
      { id: 'f-x', name: '测试图乙', position: 1, paperCount: 0 }
    ]
  })
  stubApi.lineage.patchNode.mockImplementation(async (req: Partial<LineageNode>) => ({ ok: true, data: { ...node(String(req.id)), ...req, updatedAt: 'server' } }))
  // 模块级 store 跨用例存留：显式复位（lineage-timeline-page.test.tsx 配方同族）
  resetLineageSessionsForTests()
  useLineageStore.setState({
    nodes: [],
    edges: [],
    floatingNotes: [],
    status: 'loading',
    error: null,
    folderId: '__main__',
    saveStatus: 'clean',
    lastWriteError: null,
    needsReload: false,
    queue: [],
    flushing: false,
    inflight: null,
    undoStack: [],
    redoStack: []
  })
  useLineageViewStore.setState({ mode: 'browse', focusSet: [], navCollapsed: false, navWidth: 208, navScrollTarget: null, activeFrameKey: null })
  useLibraryStore.setState({ query: { sort: 'added_desc', offset: 0, limit: 50 } })
})

afterEach(() => {
  if (root !== null) unmount()
})

describe('目标=当前 ∧ ready ∧ needsReload=0：零 graph IPC（不论图是否为空）', () => {
  it('ready 空图（无节点无边无笔记）同图返回：零 graph IPC，画布照常渲染（[B5 §3.5] 空态文案已删——任务书 §11 漏列件，最小翻转）', async () => {
    stubApi.lineage.graph.mockResolvedValue({ ok: true, data: { nodes: [], edges: [] } })
    mount()
    await flush()
    expect(stubApi.lineage.graph).toHaveBeenCalledTimes(1) // 前提自证：首次挂载取数一次
    expect(state().status).toBe('ready')
    unmount()
    stubApi.lineage.graph.mockClear()
    mount()
    await flush()
    expect(graphCalls(), 'ready 空图=既有会话，返回不双取（§8.3）').toEqual([])
    expect(host?.querySelector('.tl-content'), '空图画布在场（「暂无脉络图」随 B5 §3.5 删除）').not.toBeNull()
    expect(host?.textContent).not.toContain('暂无脉络图')
  })

  it('只有悬浮笔记的 ready 图同图返回：零 graph IPC，笔记真实文本仍渲染', async () => {
    stubApi.lineage.graph.mockResolvedValue({
      ok: true,
      data: { nodes: [], edges: [], floatingNotes: [{ id: 'fn-only', folderId: '__main__', x: 100, y: 100, content: '空图幸存笔记', createdAt: 't0', updatedAt: 't0' }] }
    })
    mount()
    await flush()
    expect(stubApi.lineage.graph).toHaveBeenCalledTimes(1)
    expect(host?.textContent).toContain('空图幸存笔记')
    unmount()
    stubApi.lineage.graph.mockClear()
    mount()
    await flush()
    expect(graphCalls(), '只有笔记的图也是 ready 会话——不双取').toEqual([])
    expect(host?.textContent).toContain('空图幸存笔记')
  })

  it('会话有未落定写（Q=1）且 ready ∧ needsReload=0：同图返回同样零 graph IPC，暂存写原样保留', async () => {
    stubApi.lineage.graph.mockResolvedValue({ ok: true, data: chain() })
    mount()
    await flush()
    unmount()
    act(() => {
      state().moveNode('C', 5, 5)
    })
    expect(state().queue).toHaveLength(1) // 前提：IO 非 clean（dirty 会话）
    stubApi.lineage.graph.mockClear()
    mount()
    await flush()
    expect(graphCalls()).toEqual([])
    expect(state().queue).toHaveLength(1) // 暂存写不丢、不被挂载同步触发落库
    expect(stubApi.lineage.patchNode).not.toHaveBeenCalled()
    expect(host?.textContent).toContain('扩散模型起点')
    await act(async () => {
      await state().save() // 用例自清：暂存写落库，不向后续用例泄漏待写
    })
  })
})

describe('目标≠当前：setFolder(target)——离场 flush-first，不以 IO 状态阻切', () => {
  function scopeToTestFolder(): void {
    useLibraryStore.setState({ query: { sort: 'added_desc', offset: 0, limit: 50, folderScope: { kind: 'folder', folderId: 'f-x' } } })
  }

  it('离场会话 dirty（Q=1）：挂载即同步目标图——离场写 flush-first 发出、活动会话=目标', async () => {
    stubApi.lineage.graph.mockResolvedValue({ ok: true, data: chain() })
    mount()
    await flush()
    unmount()
    act(() => {
      state().moveNode('C', 5, 5)
    })
    expect(state().saveStatus).toBe('dirty')
    stubApi.lineage.patchNode.mockClear() // 只计本次挂载触发的落库
    scopeToTestFolder()
    mount()
    await flush()
    expect(state().folderId, '非 clean 不再阻切——目标 folder 照常同步（§8.1 步骤 3/4）').toBe('f-x')
    expect(graphCalls().at(-1)).toEqual({ folderId: 'f-x' })
    expect(stubApi.lineage.patchNode).toHaveBeenCalledTimes(1) // 离场会话 flush-first（§8.3）
    expect(stubApi.lineage.patchNode.mock.calls[0]![0]).toMatchObject({ id: 'C' })
    expect(lineageRegistry.entry('__main__')?.data.queue).toEqual([])
    expect(host?.textContent).toContain('扩散模型起点')
  })

  it('离场会话 saving（写 IPC 在途）：挂载即切到目标图（flush-first 挂起，不等回执）', async () => {
    stubApi.lineage.graph.mockResolvedValue({ ok: true, data: chain() })
    mount()
    await flush()
    unmount()
    let release!: (v: { ok: true; data: LineageNode }) => void
    stubApi.lineage.patchNode.mockImplementation(() => new Promise((r) => { release = r }))
    act(() => {
      state().moveNode('C', 5, 5)
      void state().save()
    })
    await flush(2)
    expect(state().saveStatus).toBe('saving') // 前提：写 IPC 在途
    scopeToTestFolder()
    mount()
    await flush()
    expect(state().folderId, 'saving 不阻切（§2.5 #32「不由 saving 阻切」）').toBe('f-x')
    expect(graphCalls().at(-1)).toEqual({ folderId: 'f-x' })
    release({ ok: true, data: { ...node('C'), x: 5, y: 5, updatedAt: 'server' } })
    await flush()
    expect(lineageRegistry.entry('__main__')?.data.saveStatus).toBe('clean')
  })
})
