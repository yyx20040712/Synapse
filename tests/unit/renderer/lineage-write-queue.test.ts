// @vitest-environment jsdom
/**
 * [F-LGRAPH-01①U1] lineage-write-queue —— 写队列机制拆件行为锁（自
 * lineage.store 拆出零变；既有面=lineage-store-write/reorder.test 断言零改，
 * 本件锁拆件自足性（createWriteQueue 独立实例可运行）+lazy 融合字段级
 * 合并面（不同字段 patch 共存单发）+新建节点不合并面。
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

import { showToast } from '../../../src/renderer/shared/ui/toast-store'
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
    saveStatus: 'saved',
    lastWriteError: null,
    queue: [],
    flushing: false,
    // [F-LGRAPH-01①U4 回炉 R7] folderId 恒有值契约（主图兜底）
    folderId: '__main__'
  })
  useLineageViewStore.setState({ mode: 'browse', focusSet: [], navCollapsed: false, navWidth: 208 })
})

describe('F-LGRAPH-01①U1 lineage-write-queue（写队列机制拆件）', () => {
  it('拆件自足性：createWriteQueue 独立实例（不经 store）enqueue→queue 入态+saving+flush 派发 api', async () => {
    let host: WriteQueueHost = {
      nodes: [],
      edges: [{ id: 'e1', fromNode: 'a', toNode: 'b', label: '', kind: 'tree', sub: null, createdAt: 't', updatedAt: 't' }],
      lineTypes: [],
      saveStatus: 'saved',
      lastWriteError: null,
      queue: [],
      flushing: false
    }
    const wq = createWriteQueue({
      set: (patch) => {
        host = { ...host, ...(typeof patch === 'function' ? patch(host) : patch) }
      },
      get: () => host
    })
    wq.enqueue({ kind: 'remove-edge', id: 'e1' })
    expect(host.queue.length).toBe(1) // 入队驻态（薄壳消费面同源）
    expect(host.saveStatus).toBe('saving')
    await settle()
    expect(stubApi.lineage.removeEdge).toHaveBeenCalledWith({ id: 'e1' })
    expect(host.queue.length).toBe(0)
    expect(host.saveStatus).toBe('saved')
    expect(host.edges.length).toBe(0) // 回填经 host.set 生效
  })

  it('lazy 融合字段级合并：同节点不同字段 patch（coreIdea×x/y）融合后单发共存', async () => {
    const A = node('A', { coreIdea: '旧' })
    useLineageStore.setState({ nodes: [A] })
    let release!: (v: unknown) => void
    stubApi.lineage.upsertNode
      .mockImplementationOnce(() => new Promise((r) => { release = r as (v: unknown) => void }))
      .mockImplementationOnce(async (req: Partial<LineageNode>) =>
        ({ ok: true, data: { ...A, ...req } as LineageNode })
      )
    state().moveNode('A', 1, 2) // 首发进入 flight（gate 悬挂）
    state().editCoreIdea('A', '想法') // 入队（lazy：patch={coreIdea}）
    state().moveNode('A', 3, 4) // 入队（lazy：patch={x,y}）——与队中项同 id 融合
    await settle()
    expect(stubApi.lineage.upsertNode).toHaveBeenCalledTimes(1) // 仅首航已派发
    release({ ok: true, data: A })
    await settle()
    // 融合单发：两字段共存（拆散即两次派发或字段互吞即红）
    const calls = stubApi.lineage.upsertNode.mock.calls as unknown as Array<[Partial<LineageNode>]>
    expect(calls.length).toBe(2)
    expect(calls[1]![0]).toMatchObject({ id: 'A', coreIdea: '想法', x: 3, y: 4 })
    expect(state().saveStatus).toBe('saved')
  })

  it('P-2 模式切换不丢编辑会话暂存：saving+queue 非空态 setMode(browse)→setMode(edit) 后原样保留', async () => {
    useLineageStore.setState({ nodes: [node('A')] })
    let release!: (v: unknown) => void
    stubApi.lineage.upsertNode.mockImplementationOnce(
      () => new Promise((r) => { release = r as (v: unknown) => void })
    )
    state().editCoreIdea('A', '暂存想法') // 入队+flush 派发中（saving）
    await settle(2)
    expect(useLineageStore.getState().saveStatus).toBe('saving') // 前提锁：dirty 态在场
    expect(useLineageStore.getState().queue.length).toBe(1)
    useLineageViewStore.getState().setMode('browse') // 模式切换（P-2：暂存保留）
    useLineageViewStore.getState().setMode('edit')
    expect(useLineageStore.getState().queue.length).toBe(1) // 队列不清
    expect(useLineageStore.getState().saveStatus).toBe('saving') // 保存态不清
    release({ ok: true, data: node('A', { coreIdea: '暂存想法' }) }) // 收尾（防跨用例泄漏）
    await settle()
  })

  it('新建节点不合并：两条 addPaperNode（input 无 id）各自独立派发', async () => {
    stubApi.lineage.upsertNode.mockImplementation(async (req: { paperId?: string }) =>
      ({ ok: true, data: node(req.paperId ?? 'X') })
    )
    state().addPaperNode({ id: 'paper-1', title: '甲', year: 2020 })
    state().addPaperNode({ id: 'paper-2', title: '乙', year: 2021 })
    await settle()
    expect(stubApi.lineage.upsertNode).toHaveBeenCalledTimes(2) // sameTarget id 缺席=不融合（误合即 1 次即红）
    expect(state().nodes.length).toBe(2)
    expect(showToast).not.toHaveBeenCalled()
  })
})
