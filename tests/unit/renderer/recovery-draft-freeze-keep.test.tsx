// @vitest-environment jsdom
/**
 * [F-VISFB-65 回炉轮2 Z2] 冻结期收口/卸载清态丢草稿——fireLineageNoteCommit
 * 与桥卸载清理挂 recovery 门：冻结期草稿（pending+快照）保真不静默丢；
 * 解冻后可收口。always-active。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub } from '../../utils/api-client-mock'

const stubApi = makeApiStub({
  recovery: { peek: vi.fn(), save: vi.fn(), read: vi.fn(), release: vi.fn() },
  lineage: {
    graph: vi.fn(), patchNode: vi.fn(), removeNode: vi.fn(), upsertEdge: vi.fn(),
    removeEdge: vi.fn(), upsertLineTypes: vi.fn(), upsertFloatingNote: vi.fn(), removeFloatingNote: vi.fn()
  }
})

import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'
import {
  fireLineageNoteCommit,
  noteDraftPending,
  noteDraftSnapshot,
  registerNoteDraftFlush,
  setNoteDraftPending,
  setNoteDraftSnapshot,
  unregisterNoteDraftFlush
} from '../../../src/renderer/features/lineage/lineage-note-draft'
import {
  enterWorkspaceRecovery,
  initRecoveryScheduler,
  resetRecoveryScheduler
} from '../../../src/renderer/features/lineage/recoveryScheduler'

beforeEach(async () => {
  vi.clearAllMocks()
  resetRecoveryScheduler()
  setNoteDraftSnapshot(null)
  stubApi.recovery.peek.mockResolvedValue({
    ok: true,
    data: { slots: { 'lineage-session': { status: 'empty', epoch: 0 } } }
  })
  initRecoveryScheduler({
    workspaceId: () => 'ws-1',
    snapshot: () => null,
    loadPayload: () => undefined,
    onRestored: () => undefined,
    openLineageView: () => undefined,
    discardLoadedSession: () => undefined
  })
  // 保持冻结（init 即冻结——本件全部用例在冻结窗内断言保真）
  useLineageStore.setState({
    floatingNotes: [{ id: 'fn-1', folderId: '__main__', x: 0, y: 0, content: '底稿', createdAt: 't', updatedAt: 't' }],
    saveStatus: 'clean',
    queue: [],
    flushing: false,
    needsReload: false,
    undoStack: [],
    redoStack: [],
    folderId: '__main__',
    status: 'ready'
  })
})

afterEach(() => {
  unregisterNoteDraftFlush()
  resetRecoveryScheduler()
  setNoteDraftSnapshot(null)
})

describe('Z2 冻结期草稿保真（收口/清态挂 recovery 门）', () => {
  it('冻结期 fireLineageNoteCommit：句柄正常返回但 pending+快照保留；解冻后 fire 清态', async () => {
    setNoteDraftPending(true)
    setNoteDraftSnapshot({ noteId: 'fn-1', text: '冻结窗草稿' })
    registerNoteDraftFlush(() => undefined) // 句柄正常返回（closeEdit 被门拒不抛）
    fireLineageNoteCommit()
    expect(noteDraftPending()).toBe(true) // 未清（d1-B2 主锚：静默丢封死）
    expect(noteDraftSnapshot()).toEqual({ noteId: 'fn-1', text: '冻结窗草稿' })
    // 解冻后可收口
    await enterWorkspaceRecovery()
    fireLineageNoteCommit()
    expect(noteDraftPending()).toBe(false)
    expect(noteDraftSnapshot()).toBeNull()
  })
})
