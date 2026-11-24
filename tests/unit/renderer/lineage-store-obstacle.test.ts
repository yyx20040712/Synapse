// @vitest-environment jsdom
/**
 * [F-LANEGRID-01 B3] lineage.store 障碍突变复合单元测试（设计稿 §6.4；裁决⑥
 * 月域语义）：applyObstacleReroute=拖放 settle 落位复合动作（单 beginUnit 内
 * 月组槽位全序透写+变化帧 manual 边 via 批清除——一次拖放=一撤销单元）；undo
 * /redo=历史恢复不清 via（恢复的前布局=via 有效布局）；removeNode=删卡同族
 * （同帧存留边 via 清除并入同一单元）；setEdgeVia 编辑口单独调用行为不变。
 * （环境=jsdom：client.ts 顶层读 window.api；夹具/回显 mock 同
 * lineage-store-reorder.test 口径。）
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub } from '../../utils/api-client-mock'

import { echoHistoryUnit } from '../../utils/lineage-history-stub'
const stubApi = makeApiStub({
  lineage: {
    graph: vi.fn(),
    patchNode: vi.fn(),
    removeNode: vi.fn(),
    upsertEdge: vi.fn(),
    removeEdge: vi.fn(),
    upsertLineTypes: vi.fn(),
    historyUnit: vi.fn()
  }
})

import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'
import type { LineageEdge, LineageNode } from '../../../src/shared/models/lineage'

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

function edge(
  id: string,
  from: string,
  to: string,
  via?: Array<{ x: number; y: number }>
): LineageEdge {
  return {
    id,
    fromNode: from,
    toNode: to,
    label: '',
    dashed: false,
    color: '#1e3a8a',
    createdAt: 't',
    updatedAt: 't',
    ...(via !== undefined ? { via } : {})
  }
}

const VIA = [{ x: 76, y: 120 }]

/** 微任务排空：串行 flush 逐动作推进（每动作两级 await：unwrap+回填 set） */
const settle = async (turns = 8): Promise<void> => {
  for (let i = 0; i < turns; i++) await Promise.resolve()
}

const state = () => useLineageStore.getState()
const viaOf = (id: string): Array<{ x: number; y: number }> | undefined =>
  state().edges.find((e) => e.id === id)?.via
const slotsOf = (): Array<[string, number | null | undefined]> =>
  state().nodes.map((n) => [n.id, n.slot] as [string, number | null | undefined])

beforeEach(() => {
  vi.clearAllMocks()
  for (const fn of Object.values(stubApi.lineage)) fn.mockReset()
  stubApi.lineage.historyUnit.mockImplementation(echoHistoryUnit) // [B4 L1] undo/redo=async history-unit
  stubApi.lineage.graph.mockResolvedValue({ ok: true, data: { nodes: [], edges: [] } })
  stubApi.lineage.patchNode.mockImplementation(async (req: Partial<LineageNode>) => {
    const cur = useLineageStore.getState().nodes.find((n) => n.id === (req.id ?? '')) ?? node('X')
    return { ok: true, data: { ...cur, ...req, updatedAt: 'server' } as LineageNode }
  })
  stubApi.lineage.removeNode.mockResolvedValue({ ok: true, data: { ok: true } })
  stubApi.lineage.upsertEdge.mockImplementation(async (req: { from: string; to: string; id?: string }) => {
    const cur = useLineageStore.getState().edges.find((e) => e.id === (req.id ?? '')) ?? edge('X', req.from, req.to)
    return { ok: true, data: { ...cur, ...req, updatedAt: 'server' } as LineageEdge }
  })
  useLineageStore.setState({
    nodes: [],
    edges: [],
    lineTypeNames: ['待命名', '待命名', '待命名', '待命名', '待命名', '待命名'],
    status: 'ready',
    error: null,
    saveStatus: 'clean',
    lastWriteError: null,
    queue: [],
    flushing: false,
    undoStack: [],
    redoStack: []
  })
})

describe('[F-LANEGRID-01 B3] applyObstacleReroute —— 拖放 settle 复合单元（槽位透写+变化帧 via 批清除）', () => {
  /** 夹具：月 9={A,B,C}、月 10={D,E}；manual 边=eAB（月内）/eDA（直连跨月，
   *  端点 A∈月 9）/eDE（月 10——清除域外）；自动边=eBC */
  const mount = (): void => {
    useLineageStore.setState({
      nodes: [
        node('A', { month: 9, slot: 0 }),
        node('B', { month: 9, slot: 1 }),
        node('C', { month: 9, slot: 2 }),
        node('D', { month: 10, slot: 0 }),
        node('E', { month: 10, slot: 1 })
      ],
      edges: [
        edge('eAB', 'A', 'B', VIA),
        edge('eDA', 'D', 'A', VIA),
        edge('eDE', 'D', 'E', VIA),
        edge('eBC', 'B', 'C')
      ]
    })
  }

  it('一次拖放=一撤销单元（栈深 1）：槽位全序透写+清除域 manual 边 via 批置 null；月域外/自动边不动', () => {
    mount()
    state().applyObstacleReroute(['C', 'A', 'B'])
    expect(state().undoStack).toHaveLength(1) // 复合动作单 beginUnit——多载荷一撤销步
    expect(state().saveStatus).toBe('dirty')
    expect(slotsOf()).toEqual([
      ['C', 0],
      ['A', 1],
      ['B', 2],
      ['D', 0],
      ['E', 1]
    ])
    expect(viaOf('eAB'), '月内 manual 边清除').toBeUndefined()
    expect(viaOf('eDA'), '端点卡在变化帧的直连 manual 边清除（月域语义）').toBeUndefined()
    expect(viaOf('eDE'), '月 10 边保留 via（月域外不动）').toEqual(VIA)
    expect(viaOf('eBC'), '自动边无 via 可清').toBeUndefined()
    // 队列形状：3 patch-node（槽位）+2 upsert-edge（via:null）——FIFO 序
    expect(state().queue.map((a) => a.kind)).toEqual([
      'patch-node',
      'patch-node',
      'patch-node',
      'upsert-edge',
      'upsert-edge'
    ])
  })

  it('undo=历史恢复不清 via：槽位与 via 一并回前态；redo=清态恢复', async () => {
    mount()
    const before = slotsOf()
    state().applyObstacleReroute(['C', 'A', 'B'])
    await state().undo()
    expect(slotsOf()).toEqual(before) // 布局恢复
    expect(viaOf('eAB'), '恢复的前布局=via 有效布局（undo 不触发清除）').toEqual(VIA)
    expect(viaOf('eDA')).toEqual(VIA)
    expect(state().redoStack).toHaveLength(1)
    await state().redo()
    expect(viaOf('eAB'), 'redo=清态恢复').toBeUndefined()
    expect(slotsOf()).toEqual([
      ['C', 0],
      ['A', 1],
      ['B', 2],
      ['D', 0],
      ['E', 1]
    ])
  })

  it('落库载荷：slot 透写批+via:null 全载荷 upsert（label/dashed/color 随行——防半更新清字段）', async () => {
    mount()
    state().applyObstacleReroute(['B', 'A', 'C'])
    state().save()
    await settle(24)
    expect(state().saveStatus).toBe('clean')
    const patchCalls = stubApi.lineage.patchNode.mock.calls as unknown as Array<[Partial<LineageNode>]>
    expect(patchCalls.map((c) => [c[0]!.id, c[0]!.slot])).toEqual([
      ['B', 0],
      ['A', 1],
      ['C', 2]
    ])
    const upserts = (stubApi.lineage.upsertEdge.mock.calls as unknown as Array<[Record<string, unknown>]>).map(
      (c) => c[0]!
    )
    expect(upserts.map((u) => u.id)).toEqual(['eAB', 'eDA'])
    for (const u of upserts) {
      expect(u.via).toBeNull() // via 显式 null 落 DB NULL
      expect(u.label).toBe('')
      expect(u.dashed).toBe(false)
    }
  })
})

describe('[F-LANEGRID-01 B3] removeNode —— 删卡障碍突变（同帧存留边 via 清除并入同一单元）', () => {
  it('删 A：级联边 eAD 随亡不载荷；同帧存留 manual 边 eBC 清除；异帧 eDE 保留；单撤销单元', async () => {
    useLineageStore.setState({
      nodes: [
        node('A', { month: 9, slot: 0 }),
        node('B', { month: 9, slot: 1 }),
        node('C', { month: 9, slot: 2 }),
        node('D', { month: 10, slot: 0 }),
        node('E', { month: 10, slot: 1 })
      ],
      edges: [
        edge('eBC', 'B', 'C', VIA),
        edge('eAD', 'A', 'D', VIA),
        edge('eDE', 'D', 'E', VIA)
      ]
    })
    state().removeNode('A')
    expect(state().undoStack).toHaveLength(1)
    expect(state().nodes.map((n) => n.id)).toEqual(['B', 'C', 'D', 'E'])
    expect(state().edges.map((e) => e.id)).toEqual(['eBC', 'eDE']) // eAD 级联随亡
    expect(viaOf('eBC'), '同帧存留 manual 边清除').toBeUndefined()
    expect(viaOf('eDE'), '异帧保留').toEqual(VIA)
    expect(state().queue.map((a) => a.kind)).toEqual(['remove-node', 'upsert-edge'])
    await state().undo()
    expect(viaOf('eBC')).toEqual(VIA) // undo 恢复清前态（含级联边复活）
    expect(state().nodes).toHaveLength(5)
  })
})

describe('[F-LANEGRID-01 B3] setEdgeVia 编辑口沿承（单独调用行为不变）', () => {
  it('单独调用=一单元一动作：via 写入乐观+撤销恢复；与复合动作互不干扰', async () => {
    useLineageStore.setState({
      nodes: [node('A'), node('B')],
      edges: [edge('e1', 'A', 'B')]
    })
    state().setEdgeVia('e1', VIA)
    expect(state().undoStack).toHaveLength(1)
    expect(viaOf('e1')).toEqual(VIA)
    expect(state().queue).toHaveLength(1)
    await state().undo()
    expect(viaOf('e1')).toBeUndefined()
  })
})
