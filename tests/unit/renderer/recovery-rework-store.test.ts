// @vitest-environment jsdom
/**
 * [F-VISFB-65 回炉] R1/R4/W7/W8 —— store·queue·note-draft 恢复面补强锁。
 * - R1 草稿内容变更=调度器触发面（setNoteDraftSnapshot 变更沿 notify——
 *   等值零触发）；
 * - R4 undo 回基线 release 后 redo→副本重建；undo 部分回退→副本收敛；
 * - W7 conflictTouched 持久化（needsReload——CONFLICT 丢弃后系统失败→重试
 *   成功→load 仍被调）；
 * - W8 remap 分支当前图矫正主图（收尾重拉不拉死图空面）。
 * always-active。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub } from '../../utils/api-client-mock'

const stubApi = makeApiStub({
  recovery: { peek: vi.fn(), save: vi.fn(), read: vi.fn(), release: vi.fn() },
  lineage: {
    graph: vi.fn(),
    patchNode: vi.fn(),
    removeNode: vi.fn(),
    upsertEdge: vi.fn(),
    removeEdge: vi.fn(),
    upsertLineTypes: vi.fn(),
    upsertFloatingNote: vi.fn(),
    removeFloatingNote: vi.fn()
  }
})

import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'
import { useLineageViewStore } from '../../../src/renderer/features/lineage/lineage-view.store'
import { noteDraftSnapshot, setNoteDraftSnapshot } from '../../../src/renderer/features/lineage/lineage-note-draft'
import {
  enterWorkspaceRecovery,
  initRecoveryScheduler,
  resetRecoveryScheduler
} from '../../../src/renderer/features/lineage/recoveryScheduler'
import type { LineageNode } from '@shared/models/lineage'

function node(id: string): LineageNode {
  return {
    id,
    paperId: `paper-${id}`,
    title: `节点${id}`,
    year: 2022,
    x: null,
    y: null,
    month: 9,
    slot: 0,
    folderId: '__main__',
    createdAt: 't',
    updatedAt: 't'
  }
}

const state = () => useLineageStore.getState()
const loadSpy = vi.fn(async () => undefined)

beforeEach(async () => {
  vi.clearAllMocks()
  vi.useFakeTimers()
  resetRecoveryScheduler()
  setNoteDraftSnapshot(null)
  stubApi.recovery.save.mockResolvedValue({ ok: true, data: { status: 'saved', token: 't1', epoch: 0 } })
  stubApi.recovery.release.mockResolvedValue({ ok: true, data: { status: 'released', epoch: 1 } })
  stubApi.lineage.patchNode.mockImplementation(async (req: Partial<LineageNode>) =>
    ({ ok: true, data: { ...node(String(req.id ?? 'X')), ...req } as LineageNode })
  )
  stubApi.lineage.upsertFloatingNote.mockResolvedValue({
    ok: true,
    data: { id: 'n1', folderId: '__main__', x: 0, y: 0, content: '', createdAt: 't', updatedAt: 't' }
  })
  stubApi.recovery.peek.mockResolvedValue({
    ok: true,
    data: { slots: { 'lineage-session': { status: 'empty', epoch: 0 } } }
  })
  initRecoveryScheduler({
    workspaceId: () => 'ws-1',
    snapshot: () => {
      const s = useLineageStore.getState()
      return s.saveStatus === 'clean' ? null : { folderId: s.folderId, graph: { nodes: s.nodes, edges: s.edges, lineTypeNames: s.lineTypeNames, floatingNotes: s.floatingNotes }, queue: s.queue, draft: noteDraftSnapshot() }
    },
    loadPayload: () => undefined,
    onRestored: () => undefined,
    openLineageView: () => undefined,
    discardLoadedSession: () => useLineageStore.getState().discardSession()
  })
  await enterWorkspaceRecovery() // [回炉 W9] init 即冻结——开闸
  useLineageStore.setState({
    nodes: [node('A'), node('B')],
    edges: [],
    status: 'ready',
    error: null,
    saveStatus: 'clean',
    lastWriteError: null,
    queue: [],
    flushing: false,
    undoStack: [],
    redoStack: [],
    folderId: '__main__',
    floatingNotes: [],
    needsReload: false,
    load: loadSpy
  })
  useLineageViewStore.setState({ mode: 'edit', focusSet: [], navCollapsed: false, navWidth: 208 })
})

afterEach(() => {
  vi.useRealTimers()
  resetRecoveryScheduler()
  setNoteDraftSnapshot(null)
})

describe('R1 草稿内容变更=调度器触发面', () => {
  it('纯打字（快照变更沿）→300ms 后副本含 draft；等值置位零触发', async () => {
    state().moveNode('A', 1, 2) // 先有会话
    setNoteDraftSnapshot({ noteId: 'f1', text: '第一段' })
    await vi.advanceTimersByTimeAsync(300)
    expect(stubApi.recovery.save).toHaveBeenCalledTimes(1)
    expect(stubApi.recovery.save.mock.calls[0]![0].payload.draft).toEqual({ noteId: 'f1', text: '第一段' })
    // 等值置位：零新触发
    setNoteDraftSnapshot({ noteId: 'f1', text: '第一段' })
    await vi.advanceTimersByTimeAsync(1000)
    expect(stubApi.recovery.save).toHaveBeenCalledTimes(1)
    // 再打字：新触发
    setNoteDraftSnapshot({ noteId: 'f1', text: '第一段续写' })
    await vi.advanceTimersByTimeAsync(300)
    expect(stubApi.recovery.save).toHaveBeenCalledTimes(2)
    expect(stubApi.recovery.save.mock.calls[1]![0].payload.draft).toEqual({ noteId: 'f1', text: '第一段续写' })
  })

  it('清快照（blur 收口后）也触发——副本收敛为无草稿', async () => {
    state().moveNode('A', 1, 2)
    setNoteDraftSnapshot({ noteId: 'f1', text: 'x' })
    await vi.advanceTimersByTimeAsync(300)
    setNoteDraftSnapshot(null)
    await vi.advanceTimersByTimeAsync(300)
    expect(stubApi.recovery.save).toHaveBeenCalledTimes(2)
    expect(stubApi.recovery.save.mock.calls[1]![0].payload.draft).toBeNull()
  })
})

describe('R4 undo/redo 通知调度器（丢稿序列）', () => {
  it('①编辑 A→undo 回基线（release 删副本）→redo→副本重建（save 复来）', async () => {
    state().moveNode('A', 1, 2)
    await vi.advanceTimersByTimeAsync(300)
    expect(stubApi.recovery.save).toHaveBeenCalledTimes(1)
    state().undo() // 回基线→clean→release
    await vi.advanceTimersByTimeAsync(0)
    expect(stubApi.recovery.release).toHaveBeenCalledWith(expect.objectContaining({ reason: 'clean' }))
    expect(state().saveStatus).toBe('clean')
    // redo：dirty 复来且无副本——调度器须被通知重建
    stubApi.recovery.save.mockClear()
    state().redo()
    expect(state().saveStatus).toBe('dirty')
    await vi.advanceTimersByTimeAsync(300)
    expect(stubApi.recovery.save).toHaveBeenCalledTimes(1)
    expect(stubApi.recovery.save.mock.calls[0]![0].payload.queue).toHaveLength(1)
  })

  it('②编辑 A,B→undo B→副本收敛为 [A]（不含已撤销 B）', async () => {
    state().moveNode('A', 1, 2)
    state().moveNode('B', 3, 4)
    await vi.advanceTimersByTimeAsync(300)
    expect(stubApi.recovery.save.mock.calls[0]![0].payload.queue).toHaveLength(2)
    state().undo() // 撤销 B（仍 dirty）
    expect(state().saveStatus).toBe('dirty')
    await vi.advanceTimersByTimeAsync(300)
    const last = stubApi.recovery.save.mock.calls[stubApi.recovery.save.mock.calls.length - 1]![0]
    expect(last.payload.queue).toHaveLength(1)
    expect(last.payload.queue[0]).toMatchObject({ kind: 'patch-node', id: 'A' })
  })
})

describe('W7 conflictTouched 持久化（needsReload）', () => {
  it('CONFLICT 丢弃后下一动作系统失败→重试成功→load 仍被调', async () => {
    useLineageStore.setState({ folderId: 'f-doom' })
    state().addFloatingNote(0, 0, '弃')
    state().moveNode('A', 5, 6)
    stubApi.lineage.upsertFloatingNote.mockResolvedValue({
      ok: false,
      error: { code: 'CONFLICT', message: '冲突' }
    })
    stubApi.lineage.patchNode.mockResolvedValue({ ok: false, error: { code: 'DB_ERROR', message: '库失败' } })
    await state().save()
    // 首轮：upsert 丢弃（touched）+patch 系统失败→error 态（未重拉）
    expect(state().saveStatus).toBe('error')
    expect(loadSpy).not.toHaveBeenCalled()
    // 重试：patch 复绿→成功收尾——needsReload（上轮 touched 持久化）触发 load
    stubApi.lineage.patchNode.mockImplementation(async (req: Partial<LineageNode>) =>
      ({ ok: true, data: { ...node(String(req.id ?? 'X')), ...req } as LineageNode })
    )
    await state().save() // retrySave=fire-and-forget——经可等待 save() 同路径收口
    expect(state().saveStatus).toBe('clean')
    expect(loadSpy).toHaveBeenCalled()
  })
})

describe('W1 恢复后派生面（applyDerivedFields）', () => {
  it('三派生面合并入 store——乐观图三面（nodes/edges/floatingNotes）不被覆盖', () => {
    useLineageStore.setState({ paperMetrics: {}, pubNos: {}, tagNames: {} })
    const before = useLineageStore.getState()
    const nodesBefore = before.nodes
    useLineageStore.getState().applyDerivedFields({
      paperMetrics: { p1: { citedBy: 3 } } as never,
      pubNos: { p1: 7 },
      tagNames: { p1: ['恢复标签'] }
    })
    const after = useLineageStore.getState()
    expect(after.pubNos).toEqual({ p1: 7 })
    expect(after.tagNames).toEqual({ p1: ['恢复标签'] })
    expect(after.nodes).toBe(nodesBefore) // 乐观面引用不变（未覆盖）
  })
})

describe('W8 remap 分支当前图矫正主图', () => {
  it('死图 remap 后 store.folderId=__main__+focus 清（收尾重拉不拉死图空面）', async () => {
    const cr = await import('../../../src/renderer/features/lineage/conflictResolution')
    useLineageViewStore.setState({ focusSet: ['A'], mode: 'edit', navCollapsed: false, navWidth: 208 })
    useLineageStore.setState({ folderId: 'f-doom' })
    state().addFloatingNote(0, 0, '救')
    stubApi.lineage.upsertFloatingNote.mockImplementation(async (req: { folderId: string }) =>
      req.folderId === 'f-doom'
        ? { ok: false as const, error: { code: 'CONFLICT', message: 'x', reason: 'GHOST_FOLDER' } }
        : { ok: true as const, data: { id: 'n1', folderId: req.folderId, x: 0, y: 0, content: '', createdAt: 't', updatedAt: 't' } }
    )
    const p = state().save()
    await vi.advanceTimersByTimeAsync(0)
    expect(cr.getConflictState().pending).toEqual({ folderId: 'f-doom' }) // 挂起中
    cr.resolveGhostFolderDecision('remap-main-graph') // 等效点「保存到主图」
    await p
    expect(useLineageStore.getState().folderId).toBe('__main__') // 图矫正（收尾 load 读主图）
    expect(useLineageViewStore.getState().focusSet).toEqual([]) // 视图域隔离随切
  })
})

describe('Z4 重放幽灵 patch：节点缺席按 CONFLICT 丢弃收口（不死循环）', () => {
  it('恢复载荷 [patch A, remove A]（A 不在图）重放→patch 丢弃+remove 正常→clean+重拉', async () => {
    // 手工构造恢复态队列（applyRecoverySession 等价面——A 缺席图）
    useLineageStore.setState({
      nodes: [],
      queue: [
        { kind: 'patch-node', id: 'A', patch: { x: 1, y: 2 } },
        { kind: 'remove-node', id: 'A' }
      ],
      saveStatus: 'dirty'
    })
    stubApi.lineage.removeNode.mockResolvedValue({ ok: true, data: { ok: true } })
    await state().save()
    // patch 被丢弃（CONFLICT 语义——节点缺席=幽灵重放）；remove 正常派发
    expect(stubApi.lineage.removeNode).toHaveBeenCalledWith({ id: 'A' })
    expect(state().queue).toEqual([])
    expect(state().saveStatus).toBe('clean')
    expect(loadSpy).toHaveBeenCalled() // needsReload 收尾重拉（乐观残值消解）
  })
})
