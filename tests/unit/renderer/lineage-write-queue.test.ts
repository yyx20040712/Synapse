// @vitest-environment jsdom
/**
 * [F-LGRAPH-01②U1] lineage-write-queue —— 编辑会话暂存机制行为锁（语义翻
 * 转：enqueue 即 flush→暂存+save 批量落库——mockup §2.2/A7）。
 * 本件锁拆件自足性（createWriteQueue 独立实例可运行）+lazy 融合字段级合并
 * 面（不同字段 patch 共存单发）+flush 串行 FIFO。[F-ALIGN-01] 新建节点不
 * 合并面随节点新建路径退役删除（节点动作恒=patch——id 型恒可判等合并）。
 * always-active（不经 guardedDescribe——K3 威胁结构性缺位）。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub } from '../../utils/api-client-mock'

const stubApi = makeApiStub({
  lineage: {
    graph: vi.fn(),
    patchNode: vi.fn(),
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
  stubApi.lineage.patchNode.mockResolvedValue({ ok: true, data: node('X') })
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

  it('lazy 融合轴级合并：同节点 patch（x/y）×override（slot 透写语义轴）融合后单发共存（save 时合成读最新行；[F-UIRES-03 C3] 改月 override 形随改月动作退役——例改 reorderMonthSlots 承载，[A3] coreIdea patch 轴退役负锚保持）', async () => {
    const A = node('A', { year: 2020, month: 5, slot: 2 })
    const B = node('B', { year: 2020, month: 5, slot: 1 })
    useLineageStore.setState({ nodes: [A, B] })
    stubApi.lineage.patchNode.mockImplementation(async (req: Partial<LineageNode>) =>
      ({ ok: true, data: { ...A, ...req } as LineageNode })
    )
    state().moveNode('A', 3, 4) // 入队（lazy：patch={x,y}）
    state().reorderMonthSlots(['A', 'B']) // A 入队（lazy：override={slot:0}）——与队中项同 id 融合
    expect(state().queue.length).toBe(2) // A 融合单条+B 一条（非同实体不合并）
    state().save()
    await settle()
    // 融合单发：patch 轴与 override 轴共存（拆散即两次派发或轴互吞即红）
    const calls = stubApi.lineage.patchNode.mock.calls as unknown as Array<[Partial<LineageNode>]>
    expect(calls.length).toBe(2)
    const aCall = calls.find(([c]) => c.id === 'A')
    expect(aCall).toBeDefined()
    expect(aCall![0]).toMatchObject({ id: 'A', x: 3, y: 4, slot: 0 })
    // [A3 F-CONTRACTA-01 2026-10-04] core_idea 全退役——patch 轴无 coreIdea 键负锚
    expect(Object.prototype.hasOwnProperty.call(aCall![0], 'coreIdea')).toBe(false)
    expect(state().saveStatus).toBe('clean')
  })

  it('P-2 模式切换不丢编辑会话暂存：dirty+queue 非空态 setMode(browse)→setMode(edit) 后原样保留', async () => {
    useLineageStore.setState({ nodes: [node('A')] })
    state().moveNode('A', 5, 5) // 入暂存（dirty）
    expect(useLineageStore.getState().saveStatus).toBe('dirty') // 前提锁：dirty 态在场
    expect(useLineageStore.getState().queue.length).toBe(1)
    useLineageViewStore.getState().setMode('browse') // 模式切换（P-2：暂存保留）
    useLineageViewStore.getState().setMode('edit')
    expect(useLineageStore.getState().queue.length).toBe(1) // 队列不清
    expect(useLineageStore.getState().saveStatus).toBe('dirty') // 保存态不清
    state().save() // 收尾（防跨用例泄漏）
    await settle()
  })

})
