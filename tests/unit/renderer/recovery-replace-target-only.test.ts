// @vitest-environment jsdom
/**
 * [回炉 W-D1·T-B02 / 设计稿 §12.2 recovery-rework-store／lineage-recovery-authority 行「恢复替换只清目标
 * folder」；§2.5 #39「目标会话 Q=payload.queue、U=1；目标 H/R 清；其他 folder 不动」；§2.3「undoStack/
 * redoStack：恢复替换/删夹/课题切换清」「sessionGeneration：恢复替换递增」] 恢复替换的作用域。
 *
 * 既有直接例只有单会话（recovery-integration「恢复载入：置 dirty+两栈清+queue 恢复」）。本件锁定多会话
 * 下的作用域：替换只作用于目标会话——另一会话的历史两栈/U/待写队列/代际/聚焦集/图原样，目标的后续写
 * 也不触达它。
 * 口径（不以「活动会话面」为前提）：①目标会话=活动会话；②目标会话≠活动会话且各有历史。
 * 前置按 #39：目标 folder 的当前写已落定（Q=0）。always-active 裸 describe（K3）。
 */
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
    upsertFloatingNote: vi.fn(),
    removeFloatingNote: vi.fn(),
    historyUnit: vi.fn()
  }
})

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'
import { useLineageViewStore } from '../../../src/renderer/features/lineage/lineage-view.store'
import { lineageRegistry } from '../../../src/renderer/features/lineage/lineage-session-registry'
import { resetLineageSessionsForTests } from './lineage-test-session-reset'
import { defaultLineTypeNames, type LineageNode } from '../../../src/shared/models/lineage'
import type { LineageRecoveryPayload } from '@shared/recovery/schemas'

const MAIN = '__main__'
const OTHER = 'f-b'

function node(id: string, folderId: string = MAIN, patch: Partial<LineageNode> = {}): LineageNode {
  return { id, paperId: `paper-${id}`, title: `节点${id}`, year: 2022, x: 1, y: 1, month: 9, slot: 0, folderId, createdAt: 't', updatedAt: 't', ...patch }
}
/** 恢复载荷：图=乐观终态，queue=仍需写 DB 的普通动作（§6.3） */
function payloadOf(folderId: string, nodeId: string): LineageRecoveryPayload {
  return {
    folderId,
    graph: { nodes: [node(nodeId, folderId, { x: 99, y: 99 }), node(`${nodeId}-restored`, folderId)], edges: [], lineTypeNames: defaultLineTypeNames(), floatingNotes: [] },
    queue: [{ kind: 'patch-node', id: nodeId, patch: { x: 99, y: 99 } }],
    draft: null
  }
}
/** 会话的身份与内容快照（「其他 folder 不动」的对照面——按内容比较） */
const snapshotOf = (folderId: string): unknown => {
  const d = lineageRegistry.entry(folderId)!.data
  return {
    generation: d.sessionGeneration,
    undo: d.undoStack.map((e) => e.id),
    redo: d.redoStack.map((e) => e.id),
    unfinalized: d.unfinalized,
    queue: d.queue.map((a) => (a as { id?: string }).id ?? a.kind),
    phase: d.saveStatus,
    needsReload: d.needsReload,
    focusSet: [...d.focusSet],
    nodes: d.nodes.map((n) => `${n.id}@${n.x},${n.y}`)
  }
}
const state = () => useLineageStore.getState()
const patchIds = (): Array<string | undefined> => stubApi.lineage.patchNode.mock.calls.map((c) => (c[0] as { id?: string }).id)

beforeEach(() => {
  vi.clearAllMocks()
  for (const fn of Object.values(stubApi.lineage)) fn.mockReset()
  resetLineageSessionsForTests()
  stubApi.lineage.graph.mockResolvedValue({ ok: true, data: { nodes: [node('B1', OTHER)], edges: [], lineTypeNames: defaultLineTypeNames(), floatingNotes: [] } })
  stubApi.lineage.patchNode.mockImplementation(async (req: Partial<LineageNode>) => ({ ok: true as const, data: { ...node(String(req.id)), ...req, updatedAt: 'server' } }))
  stubApi.lineage.historyUnit.mockImplementation(echoHistoryUnit)
  useLineageStore.setState({
    nodes: [node('A1')], edges: [], floatingNotes: [], status: 'ready', error: null, saveStatus: 'clean', lastWriteError: null,
    queue: [], flushing: false, inflight: null, needsReload: false, undoStack: [], redoStack: [], unfinalized: false, editRevision: 0, folderId: MAIN
  })
  useLineageViewStore.setState({ mode: 'browse', focusSet: [], tool: 'select', paletteFor: null })
  lineageRegistry.ensure(OTHER)
  lineageRegistry.update(OTHER, { nodes: [node('B1', OTHER)], status: 'ready' })
})

afterEach(() => {
  lineageRegistry.cancelAllIdle()
  resetLineageSessionsForTests()
})

describe('恢复替换只清目标会话，其他 folder 不动（§2.5 #39、§2.3——[回炉 W-D1]）', () => {
  it('目标=活动会话：目标换代、H/R 清、Q=payload.queue、U=1；挂起会话的历史/U/待写队列（引用原样）/代际/图原样；目标的后续写不触达它', async () => {
    state().moveNode('A1', 10, 10)
    await state().save() // 目标会话：undo 1、U=1、IO clean（#39 前置：当前写已落定）
    lineageRegistry.lane(OTHER).commands.moveNode('B1', 5, 5)
    await lineageRegistry.lane(OTHER).save() // 挂起会话：undo 1
    lineageRegistry.lane(OTHER).commands.moveNode('B1', 6, 6) // 挂起会话：另一条待写（Q=1，未落定）
    const otherQueue = lineageRegistry.entry(OTHER)!.data.queue
    const otherUndoIds = lineageRegistry.entry(OTHER)!.data.undoStack.map((e) => e.id)
    const otherBefore = snapshotOf(OTHER)
    expect(otherUndoIds, '前提：挂起会话有两条历史').toHaveLength(2)
    expect(otherBefore).toEqual({
      generation: lineageRegistry.entry(OTHER)!.data.sessionGeneration, undo: otherUndoIds, redo: [], unfinalized: true,
      queue: ['B1'], phase: 'dirty', needsReload: false, focusSet: [], nodes: ['B1@6,6']
    })
    const mainGeneration = lineageRegistry.entry(MAIN)!.data.sessionGeneration
    const payload = payloadOf(MAIN, 'A1')

    state().applyRecoverySession(payload)

    // 目标会话：恢复替换（§2.5 #39）
    expect(lineageRegistry.activeFolder(), '目标=活动会话：路由不变').toBe(MAIN)
    const target = lineageRegistry.entry(MAIN)!.data
    expect(target.sessionGeneration, '恢复替换=新代际（注册表计数器单调——不等于旧代际）').toBeGreaterThan(mainGeneration)
    // §2.5 #39：目标会话 Q=payload.queue、U=1；目标 H/R 清（只放回副本的普通待写）
    expect({ undo: target.undoStack, redo: target.redoStack, unfinalized: target.unfinalized, queue: target.queue, phase: target.saveStatus, needsReload: target.needsReload })
      .toEqual({ undo: [], redo: [], unfinalized: true, queue: payload.queue, phase: 'dirty', needsReload: true })
    expect(target.nodes.map((n) => `${n.id}@${n.x},${n.y}`), '目标图=副本图（乐观终态）').toEqual(['A1@99,99', 'A1-restored@1,1'])
    // 其他 folder 不动：身份与内容逐项原样
    expect(snapshotOf(OTHER), '挂起会话不被目标的恢复替换波及').toEqual(otherBefore)
    expect(lineageRegistry.entry(OTHER)!.data.queue, '待写队列引用原样').toBe(otherQueue)
    // 目标的后续写（副本 queue 重放）只发目标的动作——挂起会话的待写不被顺带派发
    stubApi.lineage.patchNode.mockClear()
    await state().save()
    expect(patchIds(), '重放只发目标的动作').toEqual(['A1'])
    expect(stubApi.lineage.patchNode).toHaveBeenLastCalledWith({ id: 'A1', title: '节点A1', year: 2022, month: 9, slot: 0, x: 99, y: 99 })
    expect(lineageRegistry.entry(OTHER)!.data.queue, '重放后挂起会话的待写仍原样').toBe(otherQueue)
    expect(snapshotOf(OTHER), '重放后挂起会话不被波及').toEqual(otherBefore)
  })

  it('目标≠活动会话（各有历史）：载入并路由到目标——目标 H/R 清、U=1、换代；原活动会话（现挂起）的 undo/redo/U/代际/聚焦集原样，返回恢复', async () => {
    state().moveNode('A1', 10, 10)
    expect(await state().undo(), '原活动会话取得 redo').toBe(true) // MAIN：undo 0、redo 1、U=1、IO clean
    useLineageViewStore.setState({ mode: 'focus' })
    useLineageViewStore.getState().toggleFocus('A1') // MAIN 聚焦集 [A1]
    state().setFolder(OTHER)
    for (let i = 0; i < 8; i++) await Promise.resolve()
    lineageRegistry.lane(OTHER).commands.moveNode('B1', 5, 5)
    await lineageRegistry.lane(OTHER).save() // 目标会话：undo 1、IO clean
    useLineageViewStore.getState().toggleFocus('B1') // OTHER 聚焦集 [B1]
    state().setFolder(MAIN)
    for (let i = 0; i < 8; i++) await Promise.resolve()
    expect(state().folderId).toBe(MAIN) // 活动会话=MAIN（非目标）
    const mainBefore = snapshotOf(MAIN)
    const mainRedoIds = lineageRegistry.entry(MAIN)!.data.redoStack.map((e) => e.id)
    expect(mainRedoIds).toHaveLength(1)
    expect(mainBefore).toEqual({
      generation: lineageRegistry.entry(MAIN)!.data.sessionGeneration, undo: [], redo: mainRedoIds, unfinalized: true,
      queue: [], phase: 'clean', needsReload: false, focusSet: ['A1'], nodes: ['A1@1,1']
    })
    const targetGeneration = lineageRegistry.entry(OTHER)!.data.sessionGeneration
    const payload = payloadOf(OTHER, 'B1')

    state().applyRecoverySession(payload)

    expect(lineageRegistry.activeFolder(), '路由到恢复的目标会话').toBe(OTHER)
    expect(state().folderId).toBe(OTHER)
    const target = lineageRegistry.entry(OTHER)!.data
    expect(target.sessionGeneration, '恢复替换=新代际（不等于旧代际）').toBeGreaterThan(targetGeneration)
    expect({ undo: target.undoStack, redo: target.redoStack, unfinalized: target.unfinalized, queue: target.queue, needsReload: target.needsReload }, '目标会话：H/R 清、U=1、Q=payload.queue')
      .toEqual({ undo: [], redo: [], unfinalized: true, queue: payload.queue, needsReload: true })
    expect(target.nodes.map((n) => `${n.id}@${n.x},${n.y}`), '目标图=副本图').toEqual(['B1@99,99', 'B1-restored@1,1'])
    expect(snapshotOf(MAIN), '非目标会话不被波及（历史/U/代际/聚焦集/图原样）').toEqual(mainBefore)
    state().setFolder(MAIN)
    for (let i = 0; i < 8; i++) await Promise.resolve()
    expect(state().redoStack.map((e) => e.id), '返回：redo 历史恢复').toEqual(mainRedoIds)
    expect(state().unfinalized).toBe(true)
    expect(useLineageViewStore.getState().focusSet).toEqual(['A1'])
  })
})
