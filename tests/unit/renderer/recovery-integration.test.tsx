// @vitest-environment jsdom
/**
 * [F-VISFB-65 U6] 恢复副本集成（write-queue+store+note-draft+scheduler 真接线）。
 * 覆盖（票面测试清单集成段）：编辑→副本含 queue+draft；commit 窗去重判据；
 * discardSession→release；undo 回基线→release；恢复载入→dirty+两栈清+load
 * 不覆盖；flush 出队即存+clean 收口 release；草稿快照生命周期（桥组件）。
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
import {
  consumeRestoreDraft,
  fireLineageNoteCommit,
  noteDraftSnapshot,
  planDraftRehydration,
  registerNoteDraftFlush,
  setNoteDraftSnapshot,
  stashRestoreDraft,
  unregisterNoteDraftFlush
} from '../../../src/renderer/features/lineage/lineage-note-draft'
import {
  enterWorkspaceRecovery,
  initRecoveryScheduler,
  resetRecoveryScheduler
} from '../../../src/renderer/features/lineage/recoveryScheduler'
import type { LineageNode, FloatingNote } from '@shared/models/lineage'
import type { LineageRecoveryPayload } from '@shared/recovery/schemas'

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

function note(id: string, content: string): FloatingNote {
  return { id, folderId: '__main__', x: 10, y: 10, content, createdAt: 't', updatedAt: 't' }
}

function payloadOf(): LineageRecoveryPayload | null {
  const s = useLineageStore.getState()
  if (s.saveStatus === 'clean' && noteDraftSnapshot() === null) return null
  return {
    folderId: s.folderId,
    graph: {
      nodes: s.nodes,
      edges: s.edges,
      lineTypeNames: s.lineTypeNames,
      floatingNotes: s.floatingNotes
    },
    queue: s.queue,
    draft: noteDraftSnapshot()
  }
}

const settle = async (turns = 8): Promise<void> => {
  for (let i = 0; i < turns; i++) await Promise.resolve()
}

beforeEach(async () => {
  vi.clearAllMocks()
  stubApi.recovery.save.mockResolvedValue({ ok: true, data: { status: 'saved', token: 't1', epoch: 0 } })
  stubApi.recovery.release.mockResolvedValue({ ok: true, data: { status: 'released', epoch: 1 } })
  stubApi.lineage.patchNode.mockImplementation(async (req: Partial<LineageNode>) =>
    ({ ok: true, data: { ...node(String(req.id ?? 'X')), ...req } as LineageNode })
  )
  resetRecoveryScheduler()
  initRecoveryScheduler({
    workspaceId: () => 'ws-1',
    snapshot: payloadOf,
    loadPayload: () => undefined,
    onRestored: () => undefined,
    openLineageView: () => undefined,
    discardLoadedSession: () => useLineageStore.getState().discardSession()
  })
  stubApi.recovery.peek.mockResolvedValue({
    ok: true,
    data: { slots: { 'lineage-session': { status: 'empty', epoch: 0 } } }
  })
  await enterWorkspaceRecovery() // [回炉 W9] init 即冻结——beforeEach 显式开闸
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
    floatingNotes: []
  })
  useLineageViewStore.setState({ mode: 'browse', focusSet: [], navCollapsed: false, navWidth: 208 })
})

afterEach(() => {
  resetRecoveryScheduler()
  setNoteDraftSnapshot(null)
  unregisterNoteDraftFlush()
})

describe('F-VISFB-65 集成：编辑→副本（INV-162/163/164）', () => {
  it('编辑单元+草稿在场→300ms 后副本载荷含 queue+draft（快照=store 现值+草稿注册族）', async () => {
    vi.useFakeTimers()
    try {
      useLineageStore.getState().moveNode('A', 3, 4) // 编辑单元→enqueue→notify
      setNoteDraftSnapshot({ noteId: 'f1', text: '未收口草稿' })
      await vi.advanceTimersByTimeAsync(299)
      expect(stubApi.recovery.save).not.toHaveBeenCalled()
      await vi.advanceTimersByTimeAsync(1)
      expect(stubApi.recovery.save).toHaveBeenCalledTimes(1)
      const req = stubApi.recovery.save.mock.calls[0]![0]
      expect(req.payload.queue).toHaveLength(1)
      expect(req.payload.queue[0]).toMatchObject({ kind: 'patch-node', id: 'A' })
      expect(req.payload.draft).toEqual({ noteId: 'f1', text: '未收口草稿' })
      expect(req.payload.folderId).toBe('__main__')
    } finally {
      vi.useRealTimers()
    }
  })

  it('flush 出队即存（saveNow 不节流）+ 全成功 clean→release(clean)', async () => {
    useLineageStore.getState().moveNode('A', 3, 4)
    await useLineageStore.getState().save()
    await settle()
    // 出队 saveNow：flush 派发成功出队后即时发（时序上早于/伴随 flush 收尾）
    expect(stubApi.recovery.save).toHaveBeenCalled()
    const req = stubApi.recovery.save.mock.calls[0]![0]
    expect(req.payload.queue).toEqual([]) // 出队后快照=剩余队列（空）
    // clean 四源之一：flush 全成功→release
    expect(stubApi.recovery.release).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'clean', token: 't1' })
    )
  })

  it('discardSession→release(discard)（clean 四源：dirty 切图弃置）', async () => {
    useLineageStore.getState().moveNode('A', 3, 4)
    await vi.waitFor(() => expect(stubApi.recovery.save).toHaveBeenCalled())
    useLineageStore.getState().discardSession()
    await settle(20)
    expect(stubApi.recovery.release).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'discard' })
    )
    expect(useLineageStore.getState().saveStatus).toBe('clean')
  })

  it('undo 回基线→release(clean)；undo 未回基线不 release', async () => {
    useLineageStore.getState().moveNode('A', 3, 4)
    await vi.waitFor(() => expect(stubApi.recovery.save).toHaveBeenCalled())
    stubApi.recovery.release.mockClear()
    useLineageStore.getState().undo() // 弹栈恢复基线（queue 空→clean）
    await settle(20)
    expect(useLineageStore.getState().saveStatus).toBe('clean')
    expect(stubApi.recovery.release).toHaveBeenCalledWith(expect.objectContaining({ reason: 'clean' }))
  })

  it('恢复载入：置 dirty+两栈清+queue 恢复+load 不覆盖（dirty 挂载同步跳过——store:283 复用）', async () => {
    const snap: LineageRecoveryPayload = {
      folderId: '__main__',
      graph: {
        nodes: [node('R1'), node('R2')],
        edges: [],
        lineTypeNames: ['一', '二', '三', '四', '五', '六'],
        floatingNotes: [note('f9', '恢复的笔记')]
      },
      queue: [{ kind: 'remove-edge', id: 'e-old' }],
      draft: { noteId: 'f9', text: '未收口草稿' }
    }
    useLineageStore.getState().applyRecoverySession(snap)
    const s = useLineageStore.getState()
    expect(s.saveStatus).toBe('dirty')
    expect(s.undoStack).toEqual([])
    expect(s.redoStack).toEqual([])
    expect(s.queue).toEqual(snap.queue)
    expect(s.floatingNotes[0]!.content).toBe('恢复的笔记')
    // load 不覆盖：dirty 会话在途 load 响应丢弃（挂载同步跳过语义）
    stubApi.lineage.graph.mockResolvedValue({ ok: true, data: { nodes: [], edges: [] } })
    await useLineageStore.getState().load()
    expect(useLineageStore.getState().nodes).toHaveLength(2) // 恢复态保留
  })
})

describe('F-VISFB-65 草稿四态：commit 窗去重判据+快照生命周期（INV-164）', () => {
  it('去重判据：queue 末同 noteId upsert content===draft.text→不水化；异内容/无 upsert→水化；noteId 不在图→asNewNote', () => {
    const graph = { floatingNotes: [note('f1', '旧文')] }
    const mk = (queue: unknown[], draft: { noteId: string; text: string } | null) =>
      planDraftRehydration({
        queue: queue as never,
        draft,
        graph: graph as never
      })
    // commit 窗崩溃：queue 已含 upsert（content=text）→丢弃 draft 不水化
    expect(
      mk([{ kind: 'upsert-floating-note', input: { id: 'f1', folderId: '__main__', x: 0, y: 0, content: '已收口' } }], { noteId: 'f1', text: '已收口' })
    ).toBeNull()
    // 草稿未收口（content≠text）→水化
    expect(
      mk([{ kind: 'upsert-floating-note', input: { id: 'f1', folderId: '__main__', x: 0, y: 0, content: '旧文' } }], { noteId: 'f1', text: '新草稿' })
    ).toMatchObject({ noteId: 'f1', text: '新草稿', asNewNote: false })
    // 队列无该 noteId upsert →水化
    expect(mk([{ kind: 'remove-edge', id: 'e' }], { noteId: 'f1', text: 'x' })).toMatchObject({ asNewNote: false })
    // noteId 不在图（级联蒸发）→新笔记草稿
    expect(mk([], { noteId: 'f-gone', text: '孤儿草稿' })).toMatchObject({ asNewNote: true, text: '孤儿草稿' })
    // draft null →无水化
    expect(mk([], null)).toBeNull()
  })

  it('commit 收口清快照：fireLineageNoteCommit 后 snapshot=null（enqueue 先→清稿后 同步链）', () => {
    setNoteDraftSnapshot({ noteId: 'f1', text: '稿' })
    expect(noteDraftSnapshot()).toEqual({ noteId: 'f1', text: '稿' })
    registerNoteDraftFlush(() => undefined) // 空句柄：commit 链仍清快照
    fireLineageNoteCommit()
    expect(noteDraftSnapshot()).toBeNull()
  })

  it('恢复再水化 stash：consume 单次（幂等防重复水化）', () => {
    stashRestoreDraft({ noteId: 'f1', text: '恢复稿', asNewNote: false })
    expect(consumeRestoreDraft()).toEqual({ noteId: 'f1', text: '恢复稿', asNewNote: false })
    expect(consumeRestoreDraft()).toBeNull()
  })
})
