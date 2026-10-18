// @vitest-environment jsdom
/**
 * [F-VISFB-65 单元二] CONFLICT 降级询问——write-queue flush 分支行为锁
 * （设计书 §7/§8）。覆盖（票面测试面 ①-④+⑥）：
 * ① 三联判据逐维（缺 kind/缺 reason/仅 code=走旧丢弃）；
 * ② 死文件夹级作用域（同 folder 多 upsert 一询全 remap/混合 upsert+remove
 *    只 remap upsert/不同 folder 两询/乐观图态同行 remap）；
 * ③ 两分支队列续走+收尾重拉（remap/discard 均 conflictTouched→load）；
 * ④ modal 期编辑锁（conflictWaitBlocked 挂 beginUnitGated 面）；
 * ⑥ quit×conflict-wait（save 让位早退+runQuitFlush stillDirty=true+强退尽力
 *    saveNow 留副本+modal 不自动选）。
 * always-active。
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
    upsertLineTypes: vi.fn(),
    upsertFloatingNote: vi.fn(),
    removeFloatingNote: vi.fn()
  },
  recovery: { peek: vi.fn(), save: vi.fn(), read: vi.fn(), release: vi.fn() }
})

import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'
import { useLineageViewStore } from '../../../src/renderer/features/lineage/lineage-view.store'
import {
  conflictWaitBlocked,
  getConflictState,
  requestGhostFolderDecision,
  resetConflictResolution,
  resolveGhostFolderDecision
} from '../../../src/renderer/features/lineage/conflictResolution'
import {
  enterWorkspaceRecovery,
  initRecoveryScheduler,
  resetRecoveryScheduler
} from '../../../src/renderer/features/lineage/recoveryScheduler'
import { runQuitFlush } from '../../../src/renderer/app/quit-flush'
import type { LineageNode, FloatingNote } from '@shared/models/lineage'

const conflict = (reason?: string) =>
  ({ ok: false as const, error: { code: 'CONFLICT', message: '冲突', ...(reason !== undefined ? { reason } : {}) } })
const okNote = (input: { id?: string; folderId: string }) => ({
  ok: true as const,
  data: { id: input.id ?? 'note-x', folderId: input.folderId, x: 0, y: 0, content: '', createdAt: 't', updatedAt: 't' }
})

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

const settle = async (turns = 10): Promise<void> => {
  for (let i = 0; i < turns; i++) await Promise.resolve()
}

const state = () => useLineageStore.getState()
const loadSpy = vi.fn(async () => undefined)

beforeEach(async () => {
  vi.clearAllMocks()
  resetConflictResolution()
  resetRecoveryScheduler()
  stubApi.recovery.save.mockResolvedValue({ ok: true, data: { status: 'saved', token: 't', epoch: 0 } })
  stubApi.lineage.upsertFloatingNote.mockResolvedValue(okNote({ folderId: '__main__' }))
  stubApi.lineage.removeFloatingNote.mockResolvedValue({ ok: true, data: { ok: true } })
  stubApi.lineage.patchNode.mockImplementation(async (req: Partial<LineageNode>) =>
    ({ ok: true, data: { ...node(String(req.id ?? 'X')), ...req } as LineageNode })
  )
  useLineageStore.setState({
    nodes: [node('A')],
    edges: [],
    status: 'ready',
    error: null,
    saveStatus: 'clean',
    lastWriteError: null,
    queue: [],
    flushing: false,
    needsReload: false,
    undoStack: [],
    redoStack: [],
    folderId: '__main__',
    floatingNotes: [],
    load: loadSpy
  })
  useLineageViewStore.setState({ mode: 'edit', focusSet: [], navCollapsed: false, navWidth: 208 })
  initRecoveryScheduler({
    workspaceId: () => 'ws-1',
    snapshot: () => {
      const s = useLineageStore.getState()
      return s.saveStatus === 'clean' ? null : { folderId: s.folderId, graph: { nodes: s.nodes, edges: s.edges, lineTypeNames: s.lineTypeNames, floatingNotes: s.floatingNotes }, queue: s.queue, draft: null }
    },
    loadPayload: () => undefined,
    onRestored: () => undefined,
    openLineageView: () => undefined,
    discardLoadedSession: () => undefined
  })
  stubApi.recovery.peek.mockResolvedValue({
    ok: true,
    data: { slots: { 'lineage-session': { status: 'empty', epoch: 0 } } }
  })
  await enterWorkspaceRecovery() // [回炉 W9] init 即冻结——beforeEach 显式开闸
})

describe('① 三联判据（B-07）：kind+code+reason 全中才询问', () => {
  it('remove-floating-note × CONFLICT（无 reason）→旧丢弃：toast+出队+零询问', async () => {
    const note: FloatingNote = { id: 'f1', folderId: '__main__', x: 0, y: 0, content: 'c', createdAt: 't', updatedAt: 't' }
    useLineageStore.setState({ floatingNotes: [note] })
    state().removeFloatingNote('f1')
    stubApi.lineage.removeFloatingNote.mockResolvedValue(conflict())
    const p = state().save()
    await p
    expect(getConflictState().pending).toBeNull() // 零询问
    expect(state().queue).toEqual([]) // 旧丢弃出队
    expect(state().saveStatus).toBe('clean')
    expect(loadSpy).toHaveBeenCalled() // conflictTouched 重拉
  })

  it('upsert-floating-note × CONFLICT 无 reason→旧丢弃；reason≠GHOST_FOLDER→旧丢弃', async () => {
    for (const reason of [undefined, 'SOMETHING_ELSE']) {
      loadSpy.mockClear()
      useLineageStore.setState({ saveStatus: 'clean', queue: [], floatingNotes: [], folderId: 'f-live' })
      state().addFloatingNote(0, 0, '文')
      stubApi.lineage.upsertFloatingNote.mockResolvedValue(conflict(reason))
      await state().save()
      expect(getConflictState().pending).toBeNull()
      expect(state().queue).toEqual([])
      expect(state().saveStatus).toBe('clean')
    }
  })

  it('三联全中→flush 挂起+modal pending（不丢弃不出队）', async () => {
    useLineageStore.setState({ folderId: 'f-doom' })
    state().addFloatingNote(0, 0, '文')
    stubApi.lineage.upsertFloatingNote.mockResolvedValue(conflict('GHOST_FOLDER'))
    const p = state().save()
    await settle()
    expect(getConflictState().pending).toEqual({ folderId: 'f-doom' })
    expect(state().queue).toHaveLength(1) // 未丢弃
    expect(state().flushing).toBe(true) // 挂起中
    resolveGhostFolderDecision('discard')
    await p
  })
})

describe('② 死文件夹级作用域（仅 upsert remap）', () => {
  it('remap 分支：同 folder 全部 upsert remap 主图（一询）+乐观图态同行 remap+其余动作不动', async () => {
    useLineageStore.setState({ folderId: 'f-doom' })
    state().addFloatingNote(0, 0, '甲')
    state().addFloatingNote(10, 10, '乙')
    state().moveNode('A', 3, 4) // 非笔记动作混入
    let asked = 0
    stubApi.lineage.upsertFloatingNote.mockImplementation(async (req: { folderId: string }) =>
      req.folderId === 'f-doom' ? conflict('GHOST_FOLDER') : okNote({ folderId: req.folderId })
    )
    const p = state().save()
    await settle()
    asked += 1
    expect(getConflictState().pending).toEqual({ folderId: 'f-doom' })
    resolveGhostFolderDecision('remap-main-graph')
    await settle()
    expect(getConflictState().pending).toBeNull() // 一询（同 folder 无二询）
    // 乐观图态同行 remap：会话内笔记行归主图（flush 回填前的即时机面）
    expect(state().floatingNotes.every((n) => n.folderId === '__main__')).toBe(true)
    await p
    expect(asked).toBe(1)
    // 队列续走：死 folder 恰派发一次（触发询问的首发），remap 后全按主图派发
    const upsertCalls = stubApi.lineage.upsertFloatingNote.mock.calls.map((c) => (c[0] as { folderId: string }).folderId)
    expect(upsertCalls.filter((f) => f === 'f-doom')).toHaveLength(1)
    expect(upsertCalls.filter((f) => f === '__main__')).toHaveLength(2)
    expect(stubApi.lineage.patchNode).toHaveBeenCalled() // 其余动作续走
    expect(state().queue).toEqual([])
    expect(state().saveStatus).toBe('clean')
    // 乐观图态 remap：会话内笔记行归主图（floatingNotes 不因 flush 回填剩死 folder 行）
    expect(loadSpy).toHaveBeenCalled()
  })

  it('discard 分支：该 folder 全部 upsert 一次性走既有丢弃路径（一询）+其余动作续走', async () => {
    useLineageStore.setState({ folderId: 'f-doom' })
    state().addFloatingNote(0, 0, '甲')
    state().addFloatingNote(10, 10, '乙')
    state().moveNode('A', 3, 4)
    stubApi.lineage.upsertFloatingNote.mockResolvedValue(conflict('GHOST_FOLDER'))
    const p = state().save()
    await settle()
    expect(getConflictState().pending).toEqual({ folderId: 'f-doom' })
    resolveGhostFolderDecision('discard')
    await p
    expect(stubApi.lineage.upsertFloatingNote).toHaveBeenCalledTimes(1) // 只派发过死 folder 首条
    expect(state().queue).toEqual([]) // 两 upsert 一次全弃
    expect(state().saveStatus).toBe('clean')
    expect(stubApi.lineage.patchNode).toHaveBeenCalled()
    expect(loadSpy).toHaveBeenCalled()
  })

  it('remove-floating-note 不入作用域：死 folder 的 remove 照常派发（幂等成功路径零询问）', async () => {
    useLineageStore.setState({
      folderId: 'f-doom',
      floatingNotes: [{ id: 'fn-1', folderId: 'f-doom', x: 0, y: 0, content: 'c', createdAt: 't', updatedAt: 't' }]
    })
    state().removeFloatingNote('fn-1')
    stubApi.lineage.removeFloatingNote.mockResolvedValue({ ok: true, data: { ok: true } })
    await state().save()
    expect(getConflictState().pending).toBeNull()
    expect(stubApi.lineage.removeFloatingNote).toHaveBeenCalledWith({ id: 'fn-1' })
    expect(state().saveStatus).toBe('clean')
  })

  it('不同死文件夹各自一询：f1 remap 后 f2 再询问', async () => {
    useLineageStore.setState({ folderId: 'f1' })
    state().addFloatingNote(0, 0, '一')
    // 手工构造 f2 动作入队（store 面 addFloatingNote 恒用当前图——跨图动作经
    // 队列直构模拟第二死文件夹）
    useLineageStore.setState({
      queue: [
        ...useLineageStore.getState().queue,
        { kind: 'upsert-floating-note', input: { id: 'n2', folderId: 'f2', x: 1, y: 1, content: '二' } }
      ]
    })
    stubApi.lineage.upsertFloatingNote.mockImplementation(async (req: { folderId: string; id?: string }) =>
      req.folderId === '__main__' ? okNote({ folderId: req.folderId, id: req.id }) : conflict('GHOST_FOLDER')
    )
    const p = state().save()
    await settle()
    expect(getConflictState().pending).toEqual({ folderId: 'f1' })
    resolveGhostFolderDecision('remap-main-graph')
    await settle()
    expect(getConflictState().pending).toEqual({ folderId: 'f2' }) // 第二询
    resolveGhostFolderDecision('remap-main-graph')
    await p
    expect(state().queue).toEqual([])
    expect(state().saveStatus).toBe('clean')
  })
})

describe('④ modal 期编辑锁（conflictWaitBlocked 挂 beginUnitGated 面）', () => {
  it('pending 期用户写拒绝（moveNode no-op 零入队）；决策后恢复', async () => {
    useLineageStore.setState({ flushing: false })
    const pending = requestGhostFolderDecision('f-doom') // 无 flush 的孤立 pending——隔离门面
    expect(conflictWaitBlocked()).toBe(true)
    const before = state().queue.length
    state().moveNode('A', 9, 9)
    expect(state().queue.length).toBe(before) // 门拒
    resolveGhostFolderDecision('discard')
    await pending
    expect(conflictWaitBlocked()).toBe(false)
    state().moveNode('A', 9, 9)
    expect(state().queue.length).toBe(before + 1) // 解锁
  })
})

describe('⑥ quit×conflict-wait（§7：强退不自动选不 release）', () => {
  it('modal 挂起期：save() 让位早退+runQuitFlush stillDirty=true+强退尽力 saveNow（副本含队列）+modal 保持', async () => {
    useLineageStore.setState({ folderId: 'f-doom' })
    state().addFloatingNote(0, 0, 'quit 窗草稿')
    stubApi.lineage.upsertFloatingNote.mockResolvedValue(conflict('GHOST_FOLDER'))
    const p = state().save()
    await settle()
    expect(getConflictState().pending).toEqual({ folderId: 'f-doom' })
    // 让位早退：二次 save 不新建 flush
    await state().save()
    expect(getConflictState().pending).toEqual({ folderId: 'f-doom' })
    // quit 收口：stillDirty=true（saving=未知按脏）
    const stillDirty = await runQuitFlush()
    expect(stillDirty).toBe(true)
    expect(getConflictState().pending).toEqual({ folderId: 'f-doom' }) // 不自动选
    // 强退尽力：saveNow 已发（副本载荷含未决队列）
    expect(stubApi.recovery.save).toHaveBeenCalled()
    const req = stubApi.recovery.save.mock.calls[0]![0]
    expect(req.payload.queue.length).toBeGreaterThan(0)
    expect(stubApi.recovery.release).not.toHaveBeenCalled() // 强退不 release
    resolveGhostFolderDecision('discard')
    await p
  })
})
