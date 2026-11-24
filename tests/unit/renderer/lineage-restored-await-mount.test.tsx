// @vitest-environment jsdom
/**
 * [回炉 W-B2c / 设计稿 §2.5 #10a/#34/#39、§8.3「返回不双取」；io-phase-inventory §12]
 * 恢复待令会话（restoredAwaitingCommand——恢复载入后、本会话写链尚无任务起步）在脉络页
 * 挂载／页面返回时不自动和解：恢复图的和解时点=首次命令入链（T1 语义）。
 * - 回归点：W-B2·R-W2 删除「非 clean 会话挂载不同步目标图」的早退后，挂载效应对恢复会话
 *   （needsReload=1、Q=0）调 setFolder→loader 裁决为和解→keyed 读以库态覆盖恢复图（e2e
 *   recovery.spec E7 非确定失败的根因）。
 * - 对照（非恢复的 needsReload 会话挂载仍和解）=既有 lineage-b2-remount-refetch.test.tsx
 *   「needsReload=true 同图挂载仍重取」，本文件不重复。
 * - 边界（任务书第 3 条）：用户在图下拉里显式重选同一图保持现状——loader 裁决为和解（#34
 *   显式返回路径）。
 * mock 面申报：makeApiStub（api/client 展开型）+apiEvents.onFoldersChanged（nav-graph-picker
 * 订阅面）。always-active。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FloatingNote, LineageNode } from '../../../src/shared/models/lineage'
import type { LineageRecoveryPayload } from '../../../src/shared/recovery/schemas'
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

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

const NAMES = ['一', '二', '三', '四', '五', '六']
/** 库态笔记正文与恢复副本笔记正文（同一条笔记 fn——恢复图与库态在此分叉） */
const DB_TEXT = '库态正文——挂载不得读回'
const COPY_TEXT = '旧副本正文——崩溃前未落库的编辑'

function node(id: string, patch: { x?: number | null; y?: number | null } = {}): LineageNode {
  return {
    id,
    paperId: `paper-${id}`,
    title: `节点${id}`,
    year: 2021,
    x: patch.x ?? null,
    y: patch.y ?? null,
    month: 9,
    slot: 0,
    folderId: '__main__',
    createdAt: 't',
    updatedAt: 't'
  }
}

function note(id: string, content: string): FloatingNote {
  return { id, folderId: '__main__', x: 100, y: 100, content, createdAt: 't0', updatedAt: 't0' }
}

/** 库态回包（graph 单读形） */
function dbGraph(): { ok: true; data: Record<string, unknown> } {
  return {
    ok: true,
    data: {
      nodes: [node('A')],
      edges: [],
      paperMetrics: {},
      pubNos: {},
      tagNames: {},
      lineTypeNames: NAMES,
      floatingNotes: [note('fn', DB_TEXT)]
    }
  }
}

/** 恢复副本载荷：图含库中不存在的笔记正文与不同的节点位置 */
function copyPayload(queue: LineageRecoveryPayload['queue'] = []): LineageRecoveryPayload {
  return {
    folderId: '__main__',
    graph: { nodes: [node('A', { x: 100, y: 100 })], edges: [], lineTypeNames: NAMES, floatingNotes: [note('fn', COPY_TEXT)] },
    queue,
    draft: null
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
/** keyed 读的调用实参序列（期望形如 [{ folderId: '__main__' }]） */
const graphCalls = (): unknown[] => stubApi.lineage.graph.mock.calls.map((c) => c[0])
const state = () => useLineageStore.getState()

beforeEach(() => {
  vi.clearAllMocks()
  stubApi.lineage.graph.mockReset()
  stubApi.lineage.graph.mockResolvedValue(dbGraph())
  stubApi.lineage.patchNode.mockReset()
  stubApi.lineage.patchNode.mockImplementation(async (req: Partial<LineageNode> & { id: string }) => ({
    ok: true,
    data: { ...node(String(req.id)), ...req, updatedAt: 'server' }
  }))
  stubApi.folders.list.mockResolvedValue({
    ok: true,
    data: [{ id: '__main__', name: '主图', position: 0, paperCount: 0 }]
  })
  // 模块级 store 跨用例存留：显式复位（lineage-page-mount-flush-first.test.tsx 配方同族）
  resetLineageSessionsForTests()
  useLineageStore.setState({
    nodes: [node('A')],
    edges: [],
    floatingNotes: [],
    status: 'ready',
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
  resetLineageSessionsForTests() // 恢复会话（位=1、相位=dirty）不向后续用例泄漏
})

describe('恢复待令会话：脉络页挂载／页面返回零 keyed 读（和解时点=首次命令入链）', () => {
  it('(i) 恢复载入后挂载：零 keyed 读、恢复图四面保留、needsReload 保持、笔记真实文本渲染', async () => {
    act(() => {
      state().applyRecoverySession(copyPayload())
    })
    expect(state().needsReload).toBe(true) // 前提自证：恢复会话权威存疑位已置（#39）
    expect(state().queue).toHaveLength(0) // 前提自证：Q=0——loader.activate 对它裁决为「和解」
    mount()
    await flush()
    expect(graphCalls(), '恢复载入后的页面挂载不做自动和解——库态不得覆盖恢复图').toEqual([])
    expect(state().floatingNotes.map((n) => n.content)).toEqual([COPY_TEXT])
    expect(state().nodes[0]?.x).toBe(100)
    expect(state().needsReload, '和解位保持——留待首次命令入链').toBe(true)
    expect(host?.textContent, '渲染的是恢复图的真实文本').toContain(COPY_TEXT)
    expect(host?.textContent).not.toContain(DB_TEXT)
  })

  it('(i) 页面返回（卸载再挂载）：同样零 keyed 读，恢复图仍渲染', async () => {
    act(() => {
      state().applyRecoverySession(copyPayload())
    })
    mount()
    await flush()
    unmount()
    mount()
    await flush()
    expect(graphCalls(), '页面返回不是 #34 的「返回 needsReload 会话」——恢复待令会话零 graph IPC').toEqual([])
    expect(state().floatingNotes.map((n) => n.content)).toEqual([COPY_TEXT])
    expect(state().needsReload).toBe(true)
    expect(host?.textContent).toContain(COPY_TEXT)
  })

  it('恢复会话含待写（Q=1）：挂载零 keyed 读，待写原样保留（不被挂载触发落库）', async () => {
    act(() => {
      state().applyRecoverySession(copyPayload([{ kind: 'patch-node', id: 'A', patch: { x: 3, y: 3 } }]))
    })
    mount()
    await flush()
    expect(graphCalls()).toEqual([])
    expect(state().queue).toHaveLength(1)
    expect(stubApi.lineage.patchNode).not.toHaveBeenCalled()
    expect(state().floatingNotes.map((n) => n.content)).toEqual([COPY_TEXT])
    await act(async () => {
      await state().save() // 用例自清：待写落库，不向后续用例泄漏
    })
  })

  it('首次命令入链之后不再豁免：其后 needsReload 再置位（#41／CONFLICT）时，挂载恢复 #34 的单飞和解', async () => {
    act(() => {
      state().applyRecoverySession(copyPayload())
    })
    await act(async () => {
      await state().save() // 首次命令：drain→和解一次→位清
    })
    expect(state().needsReload).toBe(false)
    act(() => {
      useLineageStore.setState({ needsReload: true }) // 其后的失效置位（非恢复载入）
    })
    stubApi.lineage.graph.mockClear()
    mount()
    await flush()
    expect(graphCalls(), '标记已随首次命令入链而清——会话回到 #34「返回 needsReload 会话」的常规路径').toEqual([
      { folderId: '__main__' }
    ])
    expect(state().needsReload).toBe(false)
  })
})

describe('边界：显式同图重选保持现状（#34 显式返回路径——本波不改）', () => {
  it('恢复待令会话上显式重选同一图（setFolder 同值）：和解恰一次、标记清、图=库态', async () => {
    act(() => {
      state().applyRecoverySession(copyPayload())
    })
    mount()
    await flush()
    expect(graphCalls()).toEqual([]) // 前提：挂载零读
    act(() => {
      state().setFolder('__main__') // 用户在图下拉里重选当前图
    })
    await flush()
    expect(graphCalls()).toEqual([{ folderId: '__main__' }])
    expect(state().needsReload).toBe(false)
    expect(state().restoredAwaitingCommand).toBe(false)
    expect(state().floatingNotes.map((n) => n.content)).toEqual([DB_TEXT])
  })
})
