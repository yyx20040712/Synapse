// @vitest-environment jsdom
/**
 * [F-LGRAPH-01②U1] lineage-write-queue —— 编辑会话暂存机制行为锁（语义翻
 * 转：enqueue 即 flush→暂存+save 批量落库——mockup §2.2/A7）。
 * 本件锁拆件自足性（createWriteQueue 独立实例可运行）+lazy 融合字段级合并
 * 面（不同字段 patch 共存单发）+新建节点不合并面+flush 串行 FIFO。
 * always-active（不经 guardedDescribe——K3 威胁结构性缺位）。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub } from '../../utils/api-client-mock'

const stubApi = makeApiStub({
  lineage: {
    graph: vi.fn(),
    upsertNode: vi.fn(),
    removeNode: vi.fn(),
    upsertEdge: vi.fn(),
    removeEdge: vi.fn(),
    upsertLineTypes: vi.fn()
  }
})

import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'
import { useLineageViewStore } from '../../../src/renderer/features/lineage/lineage-view.store'
import { createWriteQueue, type WriteQueueHost } from '../../../src/renderer/features/lineage/lineage-write-queue'
import type { LineageNode } from '../../../src/shared/models/lineage'

function node(id: string, patch: Partial<LineageNode> = {}): LineageNode {
  return {
    id,
    paperId: `paper-${id}`,
    title: `节点${id}`,
    coreIdea: '',
    year: 2022,
    x: null,
    y: null,
    month: 9,
    slot: null,
    folderId: '__main__',
    createdAt: 't',
    updatedAt: 't',
    ...patch
  }
}

const settle = async (turns = 8): Promise<void> => {
  for (let i = 0; i < turns; i++) await Promise.resolve()
}

const state = () => useLineageStore.getState()

beforeEach(() => {
  vi.clearAllMocks()
  for (const fn of Object.values(stubApi.lineage)) fn.mockReset()
  stubApi.lineage.graph.mockResolvedValue({ ok: true, data: { nodes: [], edges: [] } })
  stubApi.lineage.upsertNode.mockResolvedValue({ ok: true, data: node('X') })
  stubApi.lineage.removeEdge.mockResolvedValue({ ok: true, data: { ok: true } })
  useLineageStore.setState({
    nodes: [],
    edges: [],
    status: 'ready',
    error: null,
    saveStatus: 'clean',
    lastWriteError: null,
    queue: [],
    flushing: false,
    undoStack: [],
    redoStack: [],
    // [F-LGRAPH-01①U4 回炉 R7] folderId 恒有值契约（主图兜底）
    folderId: '__main__'
  })
  useLineageViewStore.setState({ mode: 'browse', focusSet: [], navCollapsed: false, navWidth: 208 })
})

describe('F-LGRAPH-01②U1 lineage-write-queue（编辑会话暂存机制）', () => {
  it('拆件自足性：createWriteQueue 独立实例（不经 store）enqueue→queue 入态+dirty（不派发）；flush=save 派发 api→clean', async () => {
    let host: WriteQueueHost = {
      nodes: [],
      edges: [{ id: 'e1', fromNode: 'a', toNode: 'b', label: '', dashed: false, color: '#3a5bd9', createdAt: 't', updatedAt: 't' }],
      lineTypeNames: ['待命名', '待命名', '待命名', '待命名', '待命名', '待命名'],
      saveStatus: 'clean',
      lastWriteError: null,
      queue: [],
      flushing: false,
      undoStack: [],
      redoStack: [],
      load: async () => undefined
    }
    const wq = createWriteQueue({
      set: (patch) => {
        host = { ...host, ...(typeof patch === 'function' ? patch(host) : patch) }
      },
      get: () => host
    })
    wq.enqueue({ kind: 'remove-edge', id: 'e1' })
    expect(host.queue.length).toBe(1) // 入队驻态（薄壳消费面同源）
    expect(host.saveStatus).toBe('dirty') // 暂存不自动派发（A7）
    expect(host.edges.length).toBe(0) // 乐观应用即时生效
    await settle()
    expect(stubApi.lineage.removeEdge).not.toHaveBeenCalled() // 无自动 flush
    await wq.flush()
    expect(stubApi.lineage.removeEdge).toHaveBeenCalledWith({ id: 'e1' })
    expect(host.queue.length).toBe(0)
    expect(host.saveStatus).toBe('clean')
  })

  it('lazy 融合字段级合并：同节点不同字段 patch（coreIdea×x/y）融合后单发共存（save 时合成读最新行）', async () => {
    const A = node('A', { coreIdea: '旧' })
    useLineageStore.setState({ nodes: [A] })
    stubApi.lineage.upsertNode.mockImplementation(async (req: Partial<LineageNode>) =>
      ({ ok: true, data: { ...A, ...req } as LineageNode })
    )
    state().editCoreIdea('A', '想法') // 入队（lazy：patch={coreIdea}）
    state().moveNode('A', 3, 4) // 入队（lazy：patch={x,y}）——与队中项同 id 融合
    expect(state().queue.length).toBe(1) // 融合单条（拆散即红）
    state().save()
    await settle()
    // 融合单发：两字段共存（拆散即两次派发或字段互吞即红）
    const calls = stubApi.lineage.upsertNode.mock.calls as unknown as Array<[Partial<LineageNode>]>
    expect(calls.length).toBe(1)
    expect(calls[0]![0]).toMatchObject({ id: 'A', coreIdea: '想法', x: 3, y: 4 })
    expect(state().saveStatus).toBe('clean')
  })

  it('P-2 模式切换不丢编辑会话暂存：dirty+queue 非空态 setMode(browse)→setMode(edit) 后原样保留', async () => {
    useLineageStore.setState({ nodes: [node('A')] })
    state().editCoreIdea('A', '暂存想法') // 入暂存（dirty）
    expect(useLineageStore.getState().saveStatus).toBe('dirty') // 前提锁：dirty 态在场
    expect(useLineageStore.getState().queue.length).toBe(1)
    useLineageViewStore.getState().setMode('browse') // 模式切换（P-2：暂存保留）
    useLineageViewStore.getState().setMode('edit')
    expect(useLineageStore.getState().queue.length).toBe(1) // 队列不清
    expect(useLineageStore.getState().saveStatus).toBe('dirty') // 保存态不清
    state().save() // 收尾（防跨用例泄漏）
    await settle()
  })

  it('新建节点不合并：两条 addPaperNode（input 无 id）各自独立派发', async () => {
    stubApi.lineage.upsertNode.mockImplementation(async (req: { paperId?: string; id?: string }) =>
      // 回显同 id（本地 uuid=落库 id——A7 乐观一致性；mock 半行追加即红）
      ({ ok: true, data: node(req.id ?? 'X', req.paperId !== undefined ? { paperId: req.paperId } : {}) })
    )
    state().addPaperNode({ id: 'paper-1', title: '甲', year: 2020 })
    state().addPaperNode({ id: 'paper-2', title: '乙', year: 2021 })
    expect(state().queue.length).toBe(2) // sameTarget id 缺席=不融合（误合即 1 即红）
    expect(state().nodes.length).toBe(2) // 乐观应用即时在场
    state().save()
    await settle()
    expect(stubApi.lineage.upsertNode).toHaveBeenCalledTimes(2)
    expect(state().nodes.length).toBe(2)
  })
})
