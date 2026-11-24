// @vitest-environment jsdom
/**
 * [B4 L1 / 设计稿 §5.1/§5.2/§12.2] 13 编辑命令的 changes 构造矩阵——lineage-
 * history-commands（纯函数）+store 接线（recorder→changes）逐行锁定。
 * 覆盖：13 命令各 entry.changes 的 before/after；复合删节点顺序（存留边 via→
 * 相关边→节点；undo 恢复序=节点→相关边→存留边 via）；no-op 不入栈不清 redo；
 * 星标不入历史；深度 10；写回显再锚（会话内新建实体的 createdAt 以服务器为准）。
 * always-active 裸 describe。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub } from '../../../utils/api-client-mock'
import { echoHistoryUnit } from '../../../utils/lineage-history-stub'

const stubApi = makeApiStub({
  lineage: {
    graph: vi.fn(),
    patchNode: vi.fn(),
    removeNode: vi.fn(),
    upsertEdge: vi.fn(),
    removeEdge: vi.fn(),
    upsertLineTypes: vi.fn(),
    upsertFloatingNote: vi.fn(),
    removeFloatingNote: vi.fn(),
    historyUnit: vi.fn(),
    setStarred: vi.fn()
  },
  papers: { setStarred: vi.fn() }
})

import {
  buildChanges,
  entityDelta,
  frameViaClearEdges,
  namesDelta,
  pushHistory,
  reanchorHistory,
  removeNodeWatches
} from '../../../../src/renderer/features/lineage/lineage-history-commands'
import { useLineageStore } from '../../../../src/renderer/features/lineage/lineage.store'
import { LINE_TYPE_COLORS, type FloatingNote, type LineageEdge, type LineageNode } from '../../../../src/shared/models/lineage'
import type { LineageEntityDelta, LineageHistoryUnitReq } from '../../../../src/shared/ipc/lineage-history.schemas'

function node(id: string, patch: Partial<LineageNode> = {}): LineageNode {
  return {
    id,
    paperId: `paper-${id}`,
    title: `节点${id}`,
    year: 2020,
    x: 0,
    y: 0,
    month: 5,
    slot: 0,
    folderId: '__main__',
    createdAt: 't0',
    updatedAt: 't0',
    ...patch
  }
}
function edge(id: string, from: string, to: string, patch: Partial<LineageEdge> = {}): LineageEdge {
  return { id, fromNode: from, toNode: to, label: '', dashed: false, color: LINE_TYPE_COLORS[0], createdAt: 't0', updatedAt: 't0', ...patch }
}
const note = (id: string, patch: Partial<FloatingNote> = {}): FloatingNote => ({
  id, folderId: '__main__', x: 1, y: 2, content: 'c', createdAt: 't0', updatedAt: 't0', ...patch
})
const VIA = [{ x: 76, y: 120 }, { x: 90, y: 130 }]
const ANCHOR = { side: 'bottom' as const, slot: 1 as const }

const state = () => useLineageStore.getState()
const lastEntry = () => state().undoStack[state().undoStack.length - 1]!
/** 窄化取值（断言失败即抛——测试面严格空检查） */
const firstChange = () => {
  const d = lastEntry().changes[0]
  if (d === undefined) throw new Error('changes[0] 缺席')
  return d
}
const changeAt = (entry: { changes: LineageEntityDelta[] }, i: number): LineageEntityDelta => {
  const d = entry.changes[i]
  if (d === undefined) throw new Error(`changes[${String(i)}] 缺席`)
  return d
}
const settle = async (turns = 10): Promise<void> => {
  for (let i = 0; i < turns; i++) await Promise.resolve()
}

/** 语义比较：排除 updatedAt 与派生 isStarred（§5.1 指纹口径） */
function semantic(e: unknown): unknown {
  if (e === null || typeof e !== 'object') return e
  const { updatedAt: _u, isStarred: _s, ...rest } = e as Record<string, unknown>
  void _u
  void _s
  return JSON.parse(JSON.stringify(rest)) // 剥 undefined 键（JSON 往返=跨进程载荷形态）
}

beforeEach(() => {
  for (const fn of Object.values(stubApi.lineage)) fn.mockReset()
  stubApi.papers.setStarred.mockResolvedValue({ ok: true, data: { ok: true } })
  stubApi.lineage.graph.mockResolvedValue({ ok: true, data: { nodes: [], edges: [] } })
  stubApi.lineage.patchNode.mockImplementation(async (req: Partial<LineageNode>) =>
    ({ ok: true, data: { ...node(String(req.id)), ...req, updatedAt: 'server' } as LineageNode })
  )
  stubApi.lineage.removeNode.mockResolvedValue({ ok: true, data: { ok: true } })
  stubApi.lineage.upsertEdge.mockImplementation(async (req: { id?: string; from: string; to: string }) => {
    const cur = state().edges.find((e) => e.id === req.id)
    return { ok: true, data: cur ? { ...cur, createdAt: 'server-created', updatedAt: 'server' } : edge(req.id ?? 'x', req.from, req.to, { createdAt: 'server-created' }) }
  })
  stubApi.lineage.removeEdge.mockResolvedValue({ ok: true, data: { ok: true } })
  stubApi.lineage.upsertLineTypes.mockImplementation(async (req: { names: string[] }) => ({ ok: true, data: [...req.names] }))
  stubApi.lineage.upsertFloatingNote.mockImplementation(async (req: { id?: string }) => {
    const cur = state().floatingNotes.find((n) => n.id === req.id)
    return { ok: true, data: cur ? { ...cur, createdAt: 'server-created', updatedAt: 'server' } : note(req.id ?? 'x', { createdAt: 'server-created' }) }
  })
  stubApi.lineage.removeFloatingNote.mockResolvedValue({ ok: true, data: { ok: true } })
  stubApi.lineage.historyUnit.mockImplementation(echoHistoryUnit)
  useLineageStore.setState({
    nodes: [],
    edges: [],
    floatingNotes: [],
    lineTypeNames: ['待命名', '待命名', '待命名', '待命名', '待命名', '待命名'],
    status: 'ready',
    error: null,
    folderId: '__main__',
    saveStatus: 'clean',
    lastWriteError: null,
    queue: [],
    flushing: false,
    inflight: null,
    needsReload: false,
    undoStack: [],
    redoStack: [],
    unfinalized: false,
    editRevision: 0
  })
})

describe('§5.2 矩阵——13 命令的 changes（redo 顺序；undo 逆序写 before）', () => {
  it('#1 moveNode：该节点 N→N′（仅 x/y 改变——其余字段同值）', () => {
    useLineageStore.setState({ nodes: [node('A', { x: 3, y: 4 })] })
    state().moveNode('A', 30, 40)
    const e = lastEntry()
    expect(e.command).toBe('moveNode')
    expect(e.folderId).toBe('__main__')
    expect(e.changes).toHaveLength(1)
    const d = e.changes[0]!
    expect(d.kind).toBe('node')
    expect(d.kind === 'node' && semantic(d.before)).toEqual(semantic(node('A', { x: 3, y: 4 })))
    expect(d.kind === 'node' && semantic(d.after)).toEqual(semantic(node('A', { x: 30, y: 40 })))
  })

  it('#2 applyObstacleReroute：月组全部传入节点（slot 全序）+被清 via 的变化帧边（via=null）——一次拖放=一项', () => {
    useLineageStore.setState({
      nodes: [node('A', { slot: 0 }), node('B', { slot: 1 }), node('C', { slot: 2 })],
      edges: [edge('eAB', 'A', 'B', { via: VIA }), edge('eBC', 'B', 'C')]
    })
    state().applyObstacleReroute(['C', 'A', 'B'])
    const e = lastEntry()
    expect(e.command).toBe('applyObstacleReroute')
    expect(state().undoStack).toHaveLength(1)
    expect(e.changes.map((d) => (d.kind === 'edge' ? `edge:${d.id}` : d.kind === 'node' ? `node:${d.id}` : d.kind))).toEqual([
      'node:C', 'node:A', 'node:B', // 传入序=槽位序（各 N→N'）
      'edge:eAB' // 变化帧 manual 边 via 清除（E→E'，via=null）；eBC 自动边无 via 可清=不入 changes
    ])
    const slots = e.changes.flatMap((d) => (d.kind === 'node' ? [[d.id, d.kind === 'node' && d.before !== null ? d.before.slot : null, d.after !== null ? d.after.slot : null] as const] : []))
    expect(slots).toEqual([
      ['C', 2, 0],
      ['A', 0, 1],
      ['B', 1, 2]
    ])
    const viaDelta = e.changes.find((d) => d.kind === 'edge')
    if (viaDelta === undefined || viaDelta.kind !== 'edge') throw new Error('via delta 缺席')
    expect(viaDelta.kind === 'edge' && viaDelta.before !== null && viaDelta.before.via).toEqual(VIA)
    expect(viaDelta.kind === 'edge' && viaDelta.after !== null && viaDelta.after.via).toBeUndefined()
  })

  it('#3 drawEdge：新边 null→E′（id 在 renderer 创建时确定——redo 恢复原 id/端点/视觉/双锚）', () => {
    useLineageStore.setState({ nodes: [node('A'), node('B')] })
    const r = state().drawEdge('A', 'B', { dashed: true, color: LINE_TYPE_COLORS[2]!, label: '主线', fromAnchor: ANCHOR, toAnchor: { side: 'top', slot: 0 } })
    expect(r.ok).toBe(true)
    const d = firstChange()
    expect(lastEntry().command).toBe('drawEdge')
    expect(d.kind).toBe('edge')
    expect(d.kind === 'edge' && d.id).toBe(r.ok ? r.id : '')
    expect(d.kind === 'edge' && d.before).toBeNull()
    expect(d.kind === 'edge' && d.after).toMatchObject({
      id: r.ok ? r.id : 'x', fromNode: 'A', toNode: 'B', dashed: true, color: LINE_TYPE_COLORS[2], label: '主线',
      fromAnchor: ANCHOR, toAnchor: { side: 'top', slot: 0 }, createdAt: expect.any(String), updatedAt: expect.any(String)
    })
  })

  it('#4 editManualEdgeLabel：该边 E→E′（仅 label）', () => {
    useLineageStore.setState({ nodes: [node('A'), node('B')], edges: [edge('e1', 'A', 'B', { label: '旧', via: VIA, fromAnchor: ANCHOR, dashed: true })] })
    state().editManualEdgeLabel('e1', '新')
    const d = firstChange()
    expect(lastEntry().command).toBe('editManualEdgeLabel')
    expect(d.kind === 'edge' && semantic(d.before)).toEqual(semantic(edge('e1', 'A', 'B', { label: '旧', via: VIA, fromAnchor: ANCHOR, dashed: true })))
    expect(d.kind === 'edge' && semantic(d.after)).toEqual(semantic(edge('e1', 'A', 'B', { label: '新', via: VIA, fromAnchor: ANCHOR, dashed: true })))
  })

  it('#5 applyEdgeLineStyle：该边 E→E′（dashed/color；via/锚/label 保持）', () => {
    useLineageStore.setState({ nodes: [node('A'), node('B')], edges: [edge('e1', 'A', 'B', { label: 'L', via: VIA })] })
    state().applyEdgeLineStyle('e1', true, LINE_TYPE_COLORS[1]!)
    const d = firstChange()
    expect(lastEntry().command).toBe('applyEdgeLineStyle')
    expect(d.kind === 'edge' && d.after).toMatchObject({ dashed: true, color: LINE_TYPE_COLORS[1], label: 'L', via: VIA })
    expect(d.kind === 'edge' && d.before).toMatchObject({ dashed: false, color: LINE_TYPE_COLORS[0] })
  })

  it('#6 setEdgeVia：该边 E→E′（含 via=null 显式清除）', () => {
    useLineageStore.setState({ nodes: [node('A'), node('B')], edges: [edge('e1', 'A', 'B', { via: VIA })] })
    state().setEdgeVia('e1', null)
    const d = firstChange()
    expect(lastEntry().command).toBe('setEdgeVia')
    expect(d.kind === 'edge' && d.before !== null && d.before.via).toEqual(VIA)
    expect(d.kind === 'edge' && d.after !== null && d.after.via).toBeUndefined()
  })

  it('#7 reconnectEdge：该边 E→E′（新端点+被抓锚+via=null；固定端锚保持）', () => {
    useLineageStore.setState({
      nodes: [node('A'), node('B'), node('C')],
      edges: [edge('e1', 'A', 'B', { via: VIA, fromAnchor: ANCHOR, toAnchor: { side: 'left', slot: 2 } })]
    })
    const r = state().reconnectEdge('e1', { end: 'to', from: 'A', to: 'C', anchor: { side: 'top', slot: 1 } })
    expect(r.ok).toBe(true)
    const d = firstChange()
    expect(lastEntry().command).toBe('reconnectEdge')
    expect(d.kind === 'edge' && semantic(d.after)).toEqual(semantic(edge('e1', 'A', 'C', { fromAnchor: ANCHOR, toAnchor: { side: 'top', slot: 1 } })))
    expect(d.kind === 'edge' && d.before !== null && d.before.fromNode).toBe('A')
    expect(d.kind === 'edge' && d.before !== null && d.before.toNode).toBe('B')
  })

  it('#8 saveLineTypeNames：当前 folder 六行名 names→names′（entry.folderId=会话 folderId）', () => {
    useLineageStore.setState({ folderId: 'f-a' })
    const names = ['主线', '副线', '对比', '支撑', '衍生', '否证']
    state().saveLineTypeNames(names)
    const e = lastEntry()
    expect(e.command).toBe('saveLineTypeNames')
    expect(e.folderId).toBe('f-a') // 历史项绑定该 folderId（§5.4 签名链第 1 段）
    expect(e.changes).toEqual([{ kind: 'line-type-names', before: ['待命名', '待命名', '待命名', '待命名', '待命名', '待命名'], after: names }])
  })

  it('#9 removeNode（复合）：同帧存留边 via 清→相关边 E→null（数组序）→N→null；undo 恢复原 id 与相关边与存留边 via', async () => {
    const nodes = [node('A', { slot: 0 }), node('B', { slot: 1 }), node('C', { slot: 2 }), node('D', { month: 9, slot: 0 })]
    const edges = [
      edge('eBC', 'B', 'C', { via: VIA }), // 同帧存留边（端点落帧、不触达 A）——via 清
      edge('eAB', 'A', 'B', { via: VIA }), // 相关边+端点落帧（触达 A——只按相关边登记一次）
      edge('eDA', 'D', 'A', { label: '跨帧入边' }), // 相关边（异帧端点）
      edge('eDB', 'D', 'B', { via: VIA }) // 异帧端点落帧的直连 manual 边——既有清除域内（via 清）
    ]
    useLineageStore.setState({ nodes, edges })
    state().removeNode('A')
    const e = lastEntry()
    expect(e.changes.map((d) => (d.kind === 'edge' || d.kind === 'node' ? `${d.kind}:${d.id}` : d.kind))).toEqual(['edge:eBC', 'edge:eDB', 'edge:eAB', 'edge:eDA', 'node:A'])
    const kinds = e.changes.map((d) => (d.kind === 'line-type-names' ? 'names' : d.before === null ? 'null→x' : d.after === null ? 'x→null' : 'x→x'))
    expect(kinds).toEqual(['x→x', 'x→x', 'x→null', 'x→null', 'x→null']) // 先存留边→相关边→节点；无重复实体
    expect(new Set(e.changes.map((d) => (d.kind === 'line-type-names' ? 'names' : d.id))).size).toBe(e.changes.length)
    // 乐观态：A 与相关边消失、存留边 via 已清
    expect(state().nodes.map((n) => n.id)).toEqual(['B', 'C', 'D'])
    expect(state().edges.map((x) => x.id)).toEqual(['eBC', 'eDB'])
    expect(state().edges.every((x) => x.via === undefined)).toBe(true)
    // undo：请求携 changes（redo 序）+direction=undo（main 逆序写——节点先恢复）
    await state().undo()
    expect(stubApi.lineage.historyUnit).toHaveBeenCalledTimes(1)
    const req = stubApi.lineage.historyUnit.mock.calls[0]![0] as LineageHistoryUnitReq
    expect(req.direction).toBe('undo')
    expect(req.folderId).toBe('__main__')
    expect(req.changes).toEqual(e.changes)
    expect(state().nodes.map((n) => n.id).sort()).toEqual(['A', 'B', 'C', 'D']) // 原节点恢复
    expect(state().nodes.find((n) => n.id === 'A')).toMatchObject({ id: 'A', paperId: 'paper-A', slot: 0, createdAt: 't0' }) // 原 id+完整字段
    // 相关边恢复（原 id）：store 数组=未触及边原位+响应行按序追加（增量合并——与写回显
    // `[...edges, saved]` 同序；渲染序不依赖 edges 数组序，DB 恢复序由 main 逆序写保证）
    expect(state().edges.map((x) => x.id)).toEqual(['eBC', 'eDB', 'eAB', 'eDA'])
    expect(state().edges.find((x) => x.id === 'eBC')?.via).toEqual(VIA) // 存留边原 via 恢复
    expect(state().edges.find((x) => x.id === 'eDA')?.label).toBe('跨帧入边')
    expect(state().edges.find((x) => x.id === 'eDB')?.via).toEqual(VIA) // 存留边原 via 恢复
  })

  it('#10 removeEdge：该边 E→null', () => {
    useLineageStore.setState({ nodes: [node('A'), node('B')], edges: [edge('e1', 'A', 'B', { via: VIA })] })
    state().removeEdge('e1')
    const d = firstChange()
    expect(lastEntry().command).toBe('removeEdge')
    expect(d.kind === 'edge' && semantic(d.before)).toEqual(semantic(edge('e1', 'A', 'B', { via: VIA })))
    expect(d.kind === 'edge' && d.after).toBeNull()
  })

  it('#11 addFloatingNote：新笔记 null→F′（本地 id 即持久 id）', () => {
    state().addFloatingNote(5, 6, '新笔记')
    const d = firstChange()
    const created = state().floatingNotes[0]!
    expect(lastEntry().command).toBe('addFloatingNote')
    expect(d.kind).toBe('floating-note')
    expect(d.kind === 'floating-note' && d.id).toBe(created.id)
    expect(d.kind === 'floating-note' && d.before).toBeNull()
    expect(d.kind === 'floating-note' && semantic(d.after)).toEqual(semantic(created))
    expect(created).toMatchObject({ folderId: '__main__', x: 5, y: 6, content: '新笔记' })
  })

  it('#12 updateFloatingNote：该笔记 F→F′（全载荷）；空 patch 仍无历史项', () => {
    const before = note('fn-1', { content: '前' })
    useLineageStore.setState({ floatingNotes: [before] })
    state().updateFloatingNote('fn-1', {})
    expect(state().undoStack).toHaveLength(0) // 空 patch=无编辑语义
    state().updateFloatingNote('fn-1', { content: '后', x: 9 })
    const d = firstChange()
    expect(lastEntry().command).toBe('updateFloatingNote')
    expect(d.kind === 'floating-note' && semantic(d.before)).toEqual(semantic(before))
    expect(d.kind === 'floating-note' && semantic(d.after)).toEqual(semantic(note('fn-1', { content: '后', x: 9 })))
  })

  it('#13 removeFloatingNote：该笔记 F→null', () => {
    useLineageStore.setState({ floatingNotes: [note('fn-1')] })
    state().removeFloatingNote('fn-1')
    const d = firstChange()
    expect(lastEntry().command).toBe('removeFloatingNote')
    expect(d.kind === 'floating-note' && semantic(d.before)).toEqual(semantic(note('fn-1')))
    expect(d.kind === 'floating-note' && d.after).toBeNull()
  })
})

describe('no-op 与星标（非撤销维度）', () => {
  it('语义 no-op（仅 updatedAt/派生 isStarred 差异）不产生 delta', () => {
    const base = node('A')
    expect(entityDelta({ kind: 'node', id: 'A' }, base, { ...base, updatedAt: '2999-01-01T00:00:00.000Z', isStarred: true })).toBeNull()
    expect(entityDelta({ kind: 'node', id: 'A' }, null, undefined)).toBeNull() // 退化：双缺席
    expect(entityDelta({ kind: 'node', id: 'A' }, base, { ...base, x: 1 })).not.toBeNull()
    expect(namesDelta(['a', 'b'], ['a', 'b'])).toBeNull()
  })

  it('同值 moveNode/不存在的节点 removeNode：不入栈、不清 redo、不入 history', async () => {
    useLineageStore.setState({ nodes: [node('A', { x: 5, y: 5 })] })
    state().moveNode('A', 1, 1)
    await state().undo() // 产生 redo（栈顶=甲单元）
    expect(state().redoStack).toHaveLength(1)
    state().moveNode('A', 5, 5) // 同值移动（=undo 后现值 x5）=no-op
    expect(state().undoStack).toHaveLength(0)
    expect(state().redoStack).toHaveLength(1) // no-op 不清 redo（RR13 对称锚）
    expect(state().saveStatus).toBe('dirty') // 动作仍入队（沿承现行行为——落库由 flush 收口）
    useLineageStore.setState({ saveStatus: 'clean', queue: [] })
    state().removeNode('ghost') // 图中不存在的节点：零历史项
    expect(state().undoStack).toHaveLength(0)
    expect(state().redoStack).toHaveLength(1)
  })

  it('toggleNodeStar 不入历史（不 editUnit/不入队）；仅星标变化不构成 delta', async () => {
    useLineageStore.setState({ nodes: [node('A', { isStarred: false })] })
    await state().toggleNodeStar({ id: 'A', paperId: 'paper-A', isStarred: false })
    expect(state().nodes[0]?.isStarred).toBe(true)
    expect(state().undoStack).toHaveLength(0)
    expect(state().redoStack).toHaveLength(0)
    expect(state().queue).toHaveLength(0)
    expect(state().saveStatus).toBe('clean')
    expect(state().unfinalized).toBe(false) // 星标=元数据写，不置 U
  })
})

describe('深度与纯函数', () => {
  it('深度 10：第 11 单元起丢最旧（pushHistory 截断+store 接线）', () => {
    useLineageStore.setState({ nodes: [node('A')] })
    for (let i = 1; i <= 11; i++) state().moveNode('A', i, i)
    expect(state().undoStack).toHaveLength(10)
    expect(state().undoStack[0]!.changes[0]).toMatchObject({ kind: 'node', id: 'A' }) // 栈底=第 2 单元（第 1 单元被截断）
    const first = changeAt(state().undoStack[0]!, 0)
    expect(first.kind === 'node' && first.before !== null && first.before.x).toBe(1)
  })

  it('removeNodeWatches/frameViaClearEdges：存留边（端点落帧且携 via）→相关边→节点；无 via 的边不入', () => {
    const nodes = [node('A'), node('B'), node('C'), node('D', { month: 9 })]
    const edges = [edge('eBC', 'B', 'C', { via: VIA }), edge('eAB', 'A', 'B'), edge('eAD', 'A', 'D'), edge('eBC2', 'B', 'C')]
    expect(removeNodeWatches(nodes, edges, 'A')).toEqual([
      { kind: 'edge', id: 'eBC' }, // 存留边（via 清）
      { kind: 'edge', id: 'eAB' }, // 相关边（同时端点落帧——只登记一次）
      { kind: 'edge', id: 'eAD' },
      { kind: 'node', id: 'A' }
    ])
    expect(frameViaClearEdges(edges, new Set(['B', 'C'])).map((e) => e.id)).toEqual(['eBC'])
    expect(frameViaClearEdges(edges, new Set())).toEqual([])
  })

  it('buildChanges：保持登记序；before 缺席且 read 返回 undefined（实体始终不在图中）=退化项剔除', () => {
    const a = node('A', { x: 1 })
    const changes = buildChanges(
      [
        { spec: { kind: 'node', id: 'A' }, before: a },
        { spec: { kind: 'edge', id: 'e1' }, before: null },
        { spec: { kind: 'line-type-names' }, before: ['a', 'b'] }
      ],
      (spec) =>
        spec.kind === 'node' ? { ...a, x: 2 } : spec.kind === 'edge' ? undefined : ['a', 'c']
    )
    expect(changes.map((d) => d.kind)).toEqual(['node', 'line-type-names']) // 退化 edge 项（双缺席）剔除
    expect(changeAt({ changes }, 1)).toEqual({ kind: 'line-type-names', before: ['a', 'b'], after: ['a', 'c'] })
  })

  it('pushHistory：上限截断丢最旧、保留入参不变', () => {
    const mk = (id: string) => ({ id, folderId: 'f', command: 'moveNode' as const, changes: [] })
    const stack = [mk('1'), mk('2'), mk('3')]
    const next = pushHistory(stack, mk('4'), 3)
    expect(next.map((e) => e.id)).toEqual(['2', '3', '4'])
    expect(stack.map((e) => e.id)).toEqual(['1', '2', '3']) // 入参不变
  })

  it('reanchorHistory：会话内新建实体的 createdAt 以服务器为准（同 id 全部历史实体同步）；after 语义相等取服务器 updatedAt', () => {
    const local = edge('e1', 'A', 'B', { createdAt: 'local-now', updatedAt: 'local-now' })
    const server = edge('e1', 'A', 'B', { createdAt: 'server-created', updatedAt: 'server' })
    const entry = { id: 'u1', folderId: '__main__', command: 'drawEdge' as const, changes: [{ kind: 'edge' as const, id: 'e1', before: null, after: local }] }
    const entry2 = { id: 'u2', folderId: '__main__', command: 'editManualEdgeLabel' as const, changes: [{ kind: 'edge' as const, id: 'e1', before: local, after: { ...local, label: 'x' } }] }
    const next = reanchorHistory({ undoStack: [entry, entry2], redoStack: [] }, { kind: 'edge', id: 'e1', server })
    const c1 = changeAt(next.undoStack[0]!, 0)
    const c2 = changeAt(next.undoStack[1]!, 0)
    expect(c1.kind === 'edge' && c1.after).toEqual(server) // after 语义相等→整体取服务器时戳
    expect(c2.kind === 'edge' && c2.before).toMatchObject({ createdAt: 'server-created', updatedAt: 'local-now' }) // before 仅同步 createdAt
    expect(c2.kind === 'edge' && c2.after).toMatchObject({ createdAt: 'server-created', label: 'x' }) // after≠服务器行→仅 createdAt
    // 入参不变
    expect(entry.changes[0]).toMatchObject({ after: { createdAt: 'local-now' } })
  })

  it('reanchorHistory：色行名——服务端归一（trim/空名→待命名）后的回显按同规则再锚 after；全等=no-op 不变引用', () => {
    const entry = { id: 'u1', folderId: '__main__', command: 'saveLineTypeNames' as const, changes: [{ kind: 'line-type-names' as const, before: ['a', 'b'], after: ['  主线 ', ''] }] }
    const next = reanchorHistory({ undoStack: [entry], redoStack: [] }, { kind: 'line-type-names', names: ['主线', '待命名'] })
    const d = changeAt(next.undoStack[0]!, 0)
    expect(d.kind === 'line-type-names' && d.after).toEqual(['主线', '待命名'])
    const same = reanchorHistory({ undoStack: [entry], redoStack: [] }, { kind: 'line-type-names', names: ['别的', '值'] })
    expect(same.undoStack[0]).toBe(entry) // 不匹配=引用不变
  })

  it('store 接线：落库回显把会话内新建实体的 createdAt 再锚到服务器值（保存后 undo 请求指纹与库行一致）', async () => {
    useLineageStore.setState({ nodes: [node('A'), node('B')] })
    const r = state().drawEdge('A', 'B', { dashed: false, color: LINE_TYPE_COLORS[0]!, label: '', fromAnchor: ANCHOR, toAnchor: ANCHOR })
    const id = r.ok ? r.id : ''
    expect(state().undoStack[0]!.changes[0]).toMatchObject({ after: { createdAt: expect.any(String) } })
    await state().save()
    await settle()
    const after = changeAt(state().undoStack[0]!, 0)
    expect(after.kind === 'edge' && after.after).toMatchObject({ id, createdAt: 'server-created' })
    await state().undo()
    const req = stubApi.lineage.historyUnit.mock.calls[0]![0] as LineageHistoryUnitReq
    const sent = changeAt({ changes: req.changes }, 0)
    expect(sent.kind === 'edge' && sent.after !== null && sent.after.createdAt).toBe('server-created')
  })
})
