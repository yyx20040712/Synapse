// @vitest-environment jsdom
/**
 * [F-VISFB-66 单元一] store 边动作物化纪律扩面（设计书 v1.2 §0.3/§C.3——
 * W-01r2①②：恒全载荷物化（含 via/双锚 null 归一）；setEdgeVia「undefined=
 * 键缺省=清除」旧约定迁移为显式 via:null；drawEdge 可选参锚扩（向后兼容）；
 * linkNodes 物化 id（enqueue id 必填前置——构造层恒携 id）。always-active。
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
import type { LineageEdge, LineageNode } from '../../../src/shared/models/lineage'

function node(id: string): LineageNode {
  return {
    id,
    paperId: `paper-${id}`,
    title: `节点${id}`,
    year: 2020,
    x: null,
    y: null,
    month: null,
    slot: null,
    folderId: '__main__',
    createdAt: 't',
    updatedAt: 't'
  }
}

function edge(id: string, from: string, to: string, patch: Partial<LineageEdge> = {}): LineageEdge {
  return { id, fromNode: from, toNode: to, label: '', dashed: false, color: '#1e3a8a', createdAt: 't', updatedAt: 't', ...patch }
}

const settle = async (turns = 8): Promise<void> => {
  for (let i = 0; i < turns; i++) await Promise.resolve()
}

const state = () => useLineageStore.getState()

beforeEach(() => {
  for (const fn of Object.values(stubApi.lineage)) fn.mockReset()
  stubApi.lineage.graph.mockResolvedValue({ ok: true, data: { nodes: [], edges: [] } })
  stubApi.lineage.upsertEdge.mockImplementation(async (req: { id?: string; from: string; to: string }) => ({
    ok: true,
    data: edge(req.id ?? 'e-x', req.from, req.to)
  }))
  stubApi.lineage.removeEdge.mockResolvedValue({ ok: true, data: { ok: true } })
  useLineageStore.setState({
    nodes: [node('A'), node('B'), node('C')],
    edges: [],
    lineTypeNames: ['主线', '待命名', '待命名', '待命名', '待命名', '待命名'],
    status: 'ready',
    error: null,
    saveStatus: 'clean',
    lastWriteError: null,
    queue: [],
    flushing: false,
    undoStack: [],
    redoStack: [],
    folderId: '__main__'
  })
})

describe('F-VISFB-66·setEdgeVia 约定迁移（undefined=清除→显式 via:null）', () => {
  it('setEdgeVia(id, null)=显式清除：enqueue 载荷 via:null 恒在（IPC 面 null 透传）', async () => {
    useLineageStore.setState({
      edges: [edge('e1', 'A', 'B', { via: [{ x: 10, y: 10 }, { x: 40, y: 10 }] })]
    })
    state().setEdgeVia('e1', null)
    const input = (state().queue[0] as { kind: string; input: LineageEdge & { via?: unknown } }).input
    expect(input.via).toBeNull()
    state().save()
    await settle()
    const payload = stubApi.lineage.upsertEdge.mock.calls[0]![0] as Record<string, unknown>
    expect(payload.via).toBeNull()
  })

  it('setEdgeVia(id, via)=值路径：全载荷含双锚 null 归一（未钉定边物化=NULL 幂等）', async () => {
    useLineageStore.setState({ edges: [edge('e1', 'A', 'B')] })
    state().setEdgeVia('e1', [{ x: 10, y: 10 }, { x: 40, y: 10 }])
    state().save()
    await settle()
    const payload = stubApi.lineage.upsertEdge.mock.calls[0]![0] as Record<string, unknown>
    expect(payload.via).toEqual([{ x: 10, y: 10 }, { x: 40, y: 10 }])
    expect(payload.fromAnchor).toBeNull()
    expect(payload.toAnchor).toBeNull()
  })
})

describe('F-VISFB-66·style 类动作物化（editManualEdgeLabel/applyEdgeLineStyle）', () => {
  it('applyEdgeLineStyle 全载荷：via 与双锚随现值物化（值保留/null 归一）', async () => {
    useLineageStore.setState({
      edges: [
        edge('e1', 'A', 'B', {
          via: [{ x: 5, y: 5 }],
          fromAnchor: { side: 'bottom', slot: 1 }
        })
      ]
    })
    state().applyEdgeLineStyle('e1', true, '#c07a2a')
    const input = (state().queue[0] as { input: Record<string, unknown> }).input
    expect(input.via).toEqual([{ x: 5, y: 5 }])
    expect(input.fromAnchor).toEqual({ side: 'bottom', slot: 1 })
    expect(input.toAnchor).toBeNull()
  })

  it('[R14-④ 迁回] editManualEdgeLabel：保存回填+payload label（原 manual-edit 件用例补回）', async () => {
    useLineageStore.setState({
      edges: [edge('e-man1', 'P1', 'B', { label: '旧说明' })]
    })
    stubApi.lineage.upsertEdge.mockImplementation(async (req: { id?: string; from: string; to: string; label?: string }) => ({
      ok: true,
      data: { ...edge(req.id ?? 'e-x', req.from, req.to), label: req.label ?? '' }
    }))
    state().editManualEdgeLabel('e-man1', '新说明')
    await state().save()
    await settle()
    expect(stubApi.lineage.upsertEdge).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'e-man1', from: 'P1', to: 'B', label: '新说明' })
    )
    expect(state().edges[0]!.label).toBe('新说明') // 回填（服务器行覆盖乐观行）
    expect(state().edges).toHaveLength(1) // 更新非新建
  })

  it('editManualEdgeLabel 同物化纪律（全载荷含 via/双锚）', () => {
    useLineageStore.setState({ edges: [edge('e1', 'A', 'B', { toAnchor: { side: 'top', slot: 0 } })] })
    state().editManualEdgeLabel('e1', '新名')
    const input = (state().queue[0] as { input: Record<string, unknown> }).input
    expect(input.label).toBe('新名')
    expect(input.fromAnchor).toBeNull()
    expect(input.toAnchor).toEqual({ side: 'top', slot: 0 })
  })
})

describe('F-VISFB-66·drawEdge 单径必携双锚（单元二签名重写——查重单点结果枚举）', () => {
  it('携双锚：载荷透传 fromAnchor/toAnchor+构造层物化 id（A7 乐观一致性）', () => {
    const r = state().drawEdge('A', 'B', {
      dashed: false,
      color: '#1e3a8a',
      label: '主线',
      fromAnchor: { side: 'bottom', slot: 1 },
      toAnchor: { side: 'top', slot: 1 }
    })
    expect(r.ok).toBe(true)
    const action = state().queue[0] as { kind: string; input: { id?: string; fromAnchor?: unknown; toAnchor?: unknown } }
    expect(action.kind).toBe('upsert-edge')
    expect(action.input.id).toBe(r.ok ? r.id : '')
    expect(action.input.fromAnchor).toEqual({ side: 'bottom', slot: 1 })
    expect(action.input.toAnchor).toEqual({ side: 'top', slot: 1 })
  })

  it('查重单点：同对再画=结果枚举 duplicate+零入队零 dirty 增量（toast 由调用面承载）', () => {
    useLineageStore.setState({ edges: [edge('e-old', 'B', 'A')] })
    const r = state().drawEdge('A', 'B', {
      dashed: false,
      color: '#1e3a8a',
      label: '',
      fromAnchor: { side: 'bottom', slot: 1 },
      toAnchor: { side: 'top', slot: 1 }
    })
    expect(r).toEqual({ ok: false, reason: 'duplicate' })
    expect(state().queue).toHaveLength(0)
    expect(useLineageStore.getState().edges).toHaveLength(1)
  })

  it('reconnectEdge end-导向签名（R3）：被抓端新锚+固定端保持现值（legacy NULL 边仍 NULL）+via 恒 null 清', () => {
    useLineageStore.setState({
      edges: [edge('e1', 'A', 'B', { via: [{ x: 5, y: 5 }] })]
    })
    const r = state().reconnectEdge('e1', {
      end: 'from',
      from: 'C',
      to: 'B',
      anchor: { side: 'top', slot: 2 }
    })
    expect(r).toEqual({ ok: true })
    const input = (state().queue[0] as { input: Record<string, unknown> }).input
    expect(input.fromNode).toBe('C')
    expect(input.toNode).toBe('B')
    expect(input.via).toBeNull()
    expect(input.fromAnchor).toEqual({ side: 'top', slot: 2 }) // 被抓端新锚
    expect(input.toAnchor).toBeNull() // 固定端保持现值（未钉定=NULL 派生）
  })

  it('reconnectEdge 固定端已钉定→保持（R3：物化另端现值——null/?? 二义消除）', () => {
    useLineageStore.setState({
      edges: [edge('e1', 'A', 'B', { toAnchor: { side: 'left', slot: 1 }, via: [{ x: 5, y: 5 }] })]
    })
    const r = state().reconnectEdge('e1', {
      end: 'from',
      from: 'C',
      to: 'B',
      anchor: { side: 'bottom', slot: 0 }
    })
    expect(r).toEqual({ ok: true })
    const input = (state().queue[0] as { input: Record<string, unknown> }).input
    expect(input.fromAnchor).toEqual({ side: 'bottom', slot: 0 })
    expect(input.toAnchor).toEqual({ side: 'left', slot: 1 }) // 固定端钉定保持
    expect(input.via).toBeNull()
  })

  it('reconnectEdge 被抓端新锚落库（flush 载荷直证）', async () => {
    useLineageStore.setState({ edges: [edge('e1', 'A', 'B')] })
    state().reconnectEdge('e1', { end: 'to', from: 'A', to: 'C', anchor: { side: 'top', slot: 1 } })
    state().save()
    await settle()
    const payload = stubApi.lineage.upsertEdge.mock.calls[0]![0] as Record<string, unknown>
    expect(payload.to).toBe('C')
    expect(payload.toAnchor).toEqual({ side: 'top', slot: 1 })
    expect(payload.via).toBeNull()
  })

  it('reconnectEdge 自环/查重结果枚举沿承（end 形）', () => {
    useLineageStore.setState({ edges: [edge('e1', 'A', 'B'), edge('e2', 'C', 'B')] })
    expect(
      state().reconnectEdge('e1', { end: 'from', from: 'B', to: 'B', anchor: { side: 'top', slot: 0 } })
    ).toEqual({ ok: false, reason: 'self-loop' })
    expect(
      state().reconnectEdge('e1', { end: 'from', from: 'C', to: 'B', anchor: { side: 'top', slot: 0 } })
    ).toEqual({ ok: false, reason: 'duplicate' })
    expect(state().queue).toHaveLength(0)
  })

  it('busy 假成功消除（R6）：saving 窗 drawEdge/reconnectEdge 返回 reason:busy（非假成功）', () => {
    useLineageStore.setState({ edges: [edge('e1', 'A', 'B')], flushing: true })
    const d = state().drawEdge('A', 'C', {
      dashed: false,
      color: '#1e3a8a',
      label: '',
      fromAnchor: { side: 'bottom', slot: 1 },
      toAnchor: { side: 'top', slot: 1 }
    })
    expect(d).toEqual({ ok: false, reason: 'busy' })
    expect(state().queue).toHaveLength(0) // 不入队
    const r = state().reconnectEdge('e1', { end: 'from', from: 'C', to: 'B', anchor: { side: 'top', slot: 0 } })
    expect(r).toEqual({ ok: false, reason: 'busy' })
    expect(state().undoStack).toHaveLength(0) // 不入撤销栈
  })

  it('drawEdge 新边载荷 via:null 显式（R23——INV-151「含 via」措辞对齐）', () => {
    const r = state().drawEdge('A', 'B', {
      dashed: false,
      color: '#1e3a8a',
      label: '',
      fromAnchor: { side: 'bottom', slot: 1 },
      toAnchor: { side: 'top', slot: 1 }
    })
    expect(r.ok).toBe(true)
    const input = (state().queue[0] as { input: Record<string, unknown> }).input
    expect(input.via).toBeNull()
    expect(input.fromAnchor).toEqual({ side: 'bottom', slot: 1 })
    expect(input.toAnchor).toEqual({ side: 'top', slot: 1 })
  })

})

describe('F-VISFB-66·[定点修 W-01-r4] undo 快照五元组原值直断言（store 级——非渲染投影）', () => {
  it('undo 后 edges[0] 全字段=编辑前原值（from/to/双锚钉定与 NULL 之别/via 内容）+redo 重放', () => {
    const state = useLineageStore.getState()
    const via0 = [{ x: 10, y: 20 }, { x: 10, y: 30 }]
    const e0 = edge('e5', 'A', 'B', {
      fromAnchor: { side: 'bottom', slot: 1 },
      toAnchor: undefined,
      via: via0
    })
    useLineageStore.setState({
      nodes: [node('A'), node('B')],
      edges: [e0],
      lineTypeNames: ['待命名', '待命名', '待命名', '待命名', '待命名', '待命名'],
      status: 'ready', error: null, saveStatus: 'clean', lastWriteError: null,
      queue: [], flushing: false, undoStack: [], redoStack: [], folderId: '__main__'
    })
    // 编辑：换端（from 抓端换 C 卡顶中锚——双锚/via 全变）→undo→原值逐字段回归
    useLineageStore.setState({ nodes: [node('A'), node('B'), node('C')], edges: [e0] })
    const r = useLineageStore.getState().reconnectEdge('e5', { end: 'from', from: 'C', to: 'B', anchor: { side: 'top', slot: 1 } })
    expect(r.ok).toBe(true)
    expect(useLineageStore.getState().edges[0]!.via).toBeUndefined()
    useLineageStore.getState().undo()
    expect(useLineageStore.getState().edges[0]).toEqual(e0)
    // redo=restore 共用快照语义——重放同组恒等（换端态）
    useLineageStore.getState().redo()
    const eRc = useLineageStore.getState().edges[0]!
    expect(eRc.fromNode).toBe('C')
    expect(eRc.fromAnchor).toEqual({ side: 'top', slot: 1 })
    expect(eRc.toAnchor).toBeUndefined()
    expect(eRc.via).toBeUndefined()
    void state
  })
})
