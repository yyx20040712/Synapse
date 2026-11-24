// @vitest-environment jsdom
/**
 * [B4 L2 / 设计稿 §2.6 #41-#43、§2.5 #40、§8.3、§12.2 lineage-folder-reconcile 行]
 * lineage-folder-reconcile —— 后台结构事件的全 registry 失效矩阵（store 公开 API+
 * lineageFolderReconcile 单例驱动；事件=直调 onStructureChanged——App 级接线的
 * 事件回调本体）。always-active 裸 describe（K3）。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { IDLE_FLUSH_MS } from '@shared/constants'
import { makeApiStub } from '../../utils/api-client-mock'
import { resetLineageSessionsForTests } from './lineage-test-session-reset'

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
    historyUnit: vi.fn()
  }
})

import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'
import { lineageRegistry } from '../../../src/renderer/features/lineage/lineage-session-registry'
import { lineageFolderReconcile } from '../../../src/renderer/features/lineage/lineage-folder-reconcile'
import { echoHistoryUnit } from '../../utils/lineage-history-stub'
import { defaultLineTypeNames, type LineageNode } from '../../../src/shared/models/lineage'
import type { LineageGraphRes } from '../../../src/shared/ipc/schemas'

const MAIN = '__main__'

function node(id: string, folderId: string = MAIN, patch: Partial<LineageNode> = {}): LineageNode {
  return { id, paperId: `paper-${id}`, title: `节点${id}`, year: 2020, x: 1, y: 1, month: null, slot: null, folderId, createdAt: 't', updatedAt: 't', ...patch }
}
function graphOf(nodes: LineageNode[]): LineageGraphRes {
  return { nodes, edges: [], paperMetrics: {}, pubNos: {}, tagNames: {}, lineTypeNames: defaultLineTypeNames(), floatingNotes: [] }
}
type GraphResult = { ok: true; data: LineageGraphRes } | { ok: false; error: { code: string; message: string } }
const graphs: Record<string, () => Promise<GraphResult>> = {}

const settle = async (turns = 10): Promise<void> => {
  for (let i = 0; i < turns; i++) await Promise.resolve()
}
const state = () => useLineageStore.getState()
const ids = () => state().nodes.map((n) => n.id)
const event = () => lineageFolderReconcile.onStructureChanged()

beforeEach(() => {
  vi.useFakeTimers()
  resetLineageSessionsForTests() // [回炉 W-B1·R-B4] 跨用例不复用旧会话（f-b 等挂起会话——原由植入隐式清空承担）
  for (const fn of Object.values(stubApi.lineage)) fn.mockReset()
  graphs[MAIN] = async () => ({ ok: true, data: graphOf([node('A1')]) })
  graphs['f-b'] = async () => ({ ok: true, data: graphOf([node('B1', 'f-b')]) })
  stubApi.lineage.graph.mockImplementation(async (req: { folderId: string }) => (graphs[req.folderId] ?? (async (): Promise<GraphResult> => ({ ok: true, data: graphOf([]) })))())
  stubApi.lineage.patchNode.mockImplementation(async (req: Partial<LineageNode>) => ({ ok: true, data: { ...node(req.id ?? 'X'), ...req, updatedAt: 'server' } }))
  stubApi.lineage.historyUnit.mockImplementation(echoHistoryUnit)
  useLineageStore.setState({
    nodes: [node('A1')], edges: [], floatingNotes: [], paperMetrics: {}, pubNos: {}, tagNames: {},
    status: 'ready', error: null, saveStatus: 'clean', lastWriteError: null, queue: [], flushing: false, inflight: null,
    needsReload: false, undoStack: [], redoStack: [], unfinalized: false, editRevision: 0, folderId: MAIN
  })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('#41 结构事件失效（全 registry）', () => {
  it('A/B 均缓存→库页移动文献→分别返回各自权威图；历史与 U 不动；挂起会话返回时恰一次单飞读', async () => {
    state().moveNode('A1', 10, 10)
    await state().save() // A：undo 1、U=1、IO clean
    state().setFolder('f-b')
    await settle()
    state().moveNode('B1', 20, 20)
    await state().save() // B：undo 1、U=1、IO clean
    graphs[MAIN] = async () => ({ ok: true, data: graphOf([node('A1', MAIN, { x: 1, y: 1 }), node('A2')]) })
    graphs['f-b'] = async () => ({ ok: true, data: graphOf([node('B9', 'f-b')]) })
    event()
    await settle()
    expect(ids()).toEqual(['B9']) // 活动会话 B IO clean→立即和解
    expect(state().needsReload).toBe(false)
    expect(state().undoStack).toHaveLength(1) // 和解≠定稿：历史/U 不动
    expect(state().unfinalized).toBe(true)
    const calls = stubApi.lineage.graph.mock.calls.length
    state().setFolder(MAIN)
    await settle()
    expect(stubApi.lineage.graph.mock.calls.length).toBe(calls + 1) // 返回 A：恰一次权威读
    expect(stubApi.lineage.graph).toHaveBeenLastCalledWith({ folderId: MAIN })
    expect(ids()).toEqual(['A1', 'A2'])
    expect(state().needsReload).toBe(false)
    expect(state().undoStack).toHaveLength(1)
    expect(state().unfinalized).toBe(true)
  })

  it('无会话 folder 不创建会话', () => {
    event()
    expect(lineageRegistry.sessions().map((e) => e.key)).toEqual([MAIN])
  })

  it('IO Q 会话不被权威响应覆盖：位保留至 drain 后链尾续拉（#41/#10a）', async () => {
    state().moveNode('A1', 10, 10) // Q=1（乐观应用）
    graphs[MAIN] = async () => ({ ok: true, data: graphOf([node('A1', MAIN, { x: 99, y: 99 })]) })
    event()
    await settle()
    expect(stubApi.lineage.graph).not.toHaveBeenCalled() // Q=1：不立即和解
    expect(state().needsReload).toBe(true)
    expect(state().nodes[0]?.x).toBe(10) // 乐观值未被权威覆盖
    await vi.advanceTimersByTimeAsync(IDLE_FLUSH_MS) // idle flush→drain→链尾和解
    await settle()
    expect(stubApi.lineage.graph).toHaveBeenCalledTimes(1)
    expect(state().needsReload).toBe(false)
    expect(state().nodes[0]?.x).toBe(99)
  })
})

describe('#43 迟到响应归属（事件前发起的旧读不得应用）', () => {
  it('请求已发→结构事件→事件前旧响应到达：旧响应不清 needsReload 不写图态；链尾按新 epoch 重新单飞', async () => {
    const reads: Array<(v: GraphResult) => void> = []
    graphs[MAIN] = () => new Promise((r) => reads.push(r))
    event() // 首次事件：needsReload=1+epoch=1→活动会话立即和解（读 R1 在途）
    await settle()
    expect(reads).toHaveLength(1)
    expect(state().needsReload).toBe(true)
    event() // 第二次事件：epoch=2
    await settle()
    reads[0]!({ ok: true, data: graphOf([node('OLD')]) }) // 事件前旧响应到达
    await settle()
    expect(state().needsReload).toBe(true) // 不清位
    expect(ids()).toEqual(['A1']) // 不写图态
    expect(reads.length).toBe(2) // 按新 epoch 重新单飞（不并发第三读）
    reads[1]!({ ok: true, data: graphOf([node('NEW')]) })
    await settle()
    expect(state().needsReload).toBe(false)
    expect(ids()).toEqual(['NEW'])
    expect(state().saveStatus).toBe('clean')
    expect(state().flushing).toBe(false)
  })

  it('loading 会话 epoch 纳入：事件后旧 graph 响应不写图（续拉后落新图）', async () => {
    const reads: Array<(v: GraphResult) => void> = []
    graphs['f-b'] = () => new Promise((r) => reads.push(r))
    state().setFolder('f-b') // B 新会话：读 R1 在途（loading）
    await settle()
    expect(reads).toHaveLength(1)
    event()
    await settle()
    reads[0]!({ ok: true, data: graphOf([node('OLD-B', 'f-b')]) })
    await settle()
    expect(state().status).toBe('loading') // 旧响应不写图
    expect(reads.length).toBe(2) // 续拉
    reads[1]!({ ok: true, data: graphOf([node('NEW-B', 'f-b')]) })
    await settle()
    expect(state().status).toBe('ready')
    expect(ids()).toEqual(['NEW-B'])
  })

  it('迟到响应只写原会话：挂起会话的和解读在途时切图，其响应不写活动投影', async () => {
    const reads: Array<(v: GraphResult) => void> = []
    graphs[MAIN] = () => new Promise((r) => reads.push(r))
    event() // A（活动）和解读在途
    await settle()
    expect(reads).toHaveLength(1)
    state().setFolder('f-b') // 切 B
    await settle()
    expect(ids()).toEqual(['B1'])
    reads[0]!({ ok: true, data: graphOf([node('A-LATE')]) })
    await settle()
    expect(ids()).toEqual(['B1']) // A 的响应只落 A 会话
    expect(state().needsReload).toBe(false)
    expect(state().flushing).toBe(false)
    const calls = stubApi.lineage.graph.mock.calls.length
    state().setFolder(MAIN)
    await settle()
    expect(ids()).toEqual(['A-LATE']) // 返回 A：已和解的权威图，不重取
    expect(stubApi.lineage.graph.mock.calls.length).toBe(calls)
  })
})

describe('#41 活动会话按读面状态分流（status===ready 守卫的判别面——[回炉 W-B1·T-B06]）', () => {
  it('loading 的活动会话遇 #41：不立即和解（无并发第二读——#34a）；旧读判废后恰一次续拉且捕获新 epoch', async () => {
    const reads: Array<(v: GraphResult) => void> = []
    graphs['f-b'] = () => new Promise((r) => reads.push(r))
    state().setFolder('f-b') // B 新会话：首读 R1 在途（epoch 0）
    await settle()
    expect(reads).toHaveLength(1)
    expect(lineageRegistry.entry('f-b')?.inflightGraph?.identity.epoch).toBe(0)
    event() // #41：needsReload=1、epoch 0→1
    await settle()
    expect(lineageRegistry.entry('f-b')?.data.invalidationEpoch).toBe(1)
    expect(reads).toHaveLength(1) // 判别点①：未并发第二读（和解任务未起步——loading 会话已有在途 keyed 读）
    expect(state().inflight).toBeNull() // 判别点②：无和解任务在途
    expect(state().flushing).toBe(false)
    expect(state().status).toBe('loading')
    reads[0]!({ ok: true, data: graphOf([node('OLD-B', 'f-b')]) }) // 事件前发起的旧读到达
    await settle()
    expect(reads).toHaveLength(2) // 由 loader 按新 epoch 续拉：恰一次
    expect(lineageRegistry.entry('f-b')?.inflightGraph?.identity.epoch).toBe(1) // 续拉读捕获新 epoch
    expect(state().nodes).toEqual([]) // 旧响应未写图
    expect(state().status).toBe('loading')
    reads[1]!({ ok: true, data: graphOf([node('NEW-B', 'f-b')]) })
    await settle()
    expect(ids()).toEqual(['NEW-B'])
    expect(state().needsReload).toBe(false)
    expect(state().saveStatus).toBe('clean')
  })

  it('图读面 error 的活动会话遇 #41：不立即和解（#34b——重试=返回/下次命令重载）；needsReload 保留', async () => {
    graphs['f-b'] = async () => ({ ok: false, error: { code: 'DB_ERROR', message: '图乙读失败' } })
    state().setFolder('f-b')
    await settle()
    expect(state().status).toBe('error') // 前置：B 首读失败、驻 error
    const calls = stubApi.lineage.graph.mock.calls.length
    event()
    await settle()
    expect(stubApi.lineage.graph.mock.calls.length).toBe(calls) // 未发和解读
    expect(state().status).toBe('error')
    expect(state().needsReload).toBe(true)
    expect(state().inflight).toBeNull()
    expect(state().flushing).toBe(false)
  })
})

describe('#42/#40 后台删夹', () => {
  it('活动会话 IO clean→清会话（历史清）+回退主图', async () => {
    state().setFolder('f-b')
    await settle()
    state().moveNode('B1', 5, 5)
    await state().save() // B 有历史、IO clean
    expect(state().undoStack).toHaveLength(1)
    expect(lineageFolderReconcile.onFoldersRefreshed([MAIN])).toBe('fallback')
    expect(state().folderId).toBe(MAIN)
    expect(ids()).toEqual(['A1'])
    expect(lineageRegistry.entry('f-b')).toBeUndefined() // 会话已清（历史随会话消亡）
  })

  it('有未决写不得静默清：会话保留（kept），活动图不切', async () => {
    state().setFolder('f-b')
    await settle()
    state().moveNode('B1', 5, 5) // Q=1
    expect(lineageFolderReconcile.onFoldersRefreshed([MAIN])).toBe('kept')
    expect(state().folderId).toBe('f-b')
    expect(state().queue).toHaveLength(1)
    expect(lineageRegistry.entry('f-b')).toBeDefined()
  })

  it('挂起会话被删：IO clean 清、活动图不动', async () => {
    state().setFolder('f-b')
    await settle()
    state().setFolder(MAIN)
    await settle()
    expect(lineageFolderReconcile.onFoldersRefreshed([MAIN])).toBe('none')
    expect(lineageRegistry.entry('f-b')).toBeUndefined()
    expect(state().folderId).toBe(MAIN)
    expect(ids()).toEqual(['A1'])
  })
})
