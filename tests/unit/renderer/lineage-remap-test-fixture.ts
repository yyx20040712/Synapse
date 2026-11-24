/**
 * [回炉 W-B1·R-remap/R-B1b] ghost remap 测试夹具（lineage-session-remap*.test 共用）。
 * 顺序契约（tests/utils/api-client-mock）：本件先 import 桩工厂、后 import 被测模块——
 * 测试文件必须把本件写在第一条 import，契约随之成立。
 * 夹具形态沿 lineage-conflict-resolution.test.ts：主图会话植入 ready/clean，调度器以 legacy
 * 形装配并开闸（owner keyed 的生产装配由用例按需重装）。
 */
import { expect, vi } from 'vitest'
import { makeApiStub } from '../../utils/api-client-mock'
import { resetLineageSessionsForTests } from './lineage-test-session-reset'

export const stubApi = makeApiStub({
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
  },
  recovery: { peek: vi.fn(), save: vi.fn(), read: vi.fn(), release: vi.fn() }
})

import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'
import { useLineageViewStore } from '../../../src/renderer/features/lineage/lineage-view.store'
import { getConflictState, resetConflictResolution } from '../../../src/renderer/features/lineage/conflictResolution'
import { enterWorkspaceRecovery, initRecoveryScheduler, resetRecoveryScheduler } from '../../../src/renderer/features/lineage/recoveryScheduler'
import { lineageRegistry as registry } from '../../../src/renderer/features/lineage/lineage-session-registry'
import {
  setNoteDraftPending,
  setNoteDraftSnapshot,
  unregisterNoteDraftFlush
} from '../../../src/renderer/features/lineage/lineage-note-draft'
import { defaultLineTypeNames, type FloatingNote, type LineageNode } from '@shared/models/lineage'

export { registry, useLineageStore, enterWorkspaceRecovery }

export const MAIN = '__main__'
export const DOOM = 'f-doom'
export const CONFLICT_MESSAGE = '原文件夹已删除'

export const conflict = (): { ok: false; error: { code: string; message: string; reason: string } } =>
  ({ ok: false as const, error: { code: 'CONFLICT', message: CONFLICT_MESSAGE, reason: 'GHOST_FOLDER' } })

export function node(id: string, folderId: string = MAIN): LineageNode {
  return { id, paperId: `paper-${id}`, title: `节点${id}`, year: 2022, x: null, y: null, month: 9, slot: 0, folderId, createdAt: 't', updatedAt: 't' }
}

export const settle = async (turns = 10): Promise<void> => {
  for (let i = 0; i < turns; i++) await Promise.resolve()
}
export const state = () => useLineageStore.getState()
export const noteIds = (): string[] => state().floatingNotes.map((n) => n.id)
/** 映射到主图的会话（按键或按 data.folderId——二者不一致时条数>1 即偏离） */
export const mainSessions = () => registry.sessions().filter((e) => e.key === MAIN || e.data.folderId === MAIN)
export const mainReads = (): number => stubApi.lineage.graph.mock.calls.filter((c) => (c[0] as { folderId: string }).folderId === MAIN).length

/** ghost 桩：死夹 upsert→CONFLICT·GHOST_FOLDER；主图 upsert→落库并由主图权威读回显 */
export function ghostStubs(): { savedNote: () => FloatingNote | null } {
  let saved: FloatingNote | null = null
  stubApi.lineage.upsertFloatingNote.mockImplementation(async (req: { folderId: string; id?: string }) => {
    if (req.folderId === DOOM) return conflict()
    saved = { id: req.id ?? 'n1', folderId: MAIN, x: 0, y: 0, content: '甲', createdAt: 't', updatedAt: 't' }
    return { ok: true as const, data: saved }
  })
  stubApi.lineage.graph.mockImplementation(async (req: { folderId: string }) => ({
    ok: true,
    data: {
      nodes: [node('A', req.folderId)], edges: [], lineTypeNames: defaultLineTypeNames(),
      paperMetrics: {}, pubNos: {}, tagNames: {},
      floatingNotes: req.folderId === MAIN && saved !== null ? [saved] : []
    }
  }))
  return { savedNote: () => saved }
}

/** 切到死夹→建笔记→save→撞 CONFLICT（询问挂起）。flush=挂起中的 save（决出后才落定——
 *  返回持有人而非 Promise：本函数是 async，直接返回该 Promise 会让调用方的 await 等到决出之后） */
export async function enterGhostConflict(): Promise<{ flush: Promise<void> }> {
  state().setFolder(DOOM)
  await settle()
  state().addFloatingNote(0, 0, '甲')
  const flush = state().save()
  await settle()
  expect(getConflictState().pending).toEqual({ folderId: DOOM })
  return { flush }
}

/** 用例前复位：跨用例不复用旧会话（多会话夹具）、桩与调度器归零、主图会话植入、legacy 调度器开闸 */
export async function resetRemapFixture(): Promise<void> {
  resetLineageSessionsForTests()
  vi.clearAllMocks()
  resetConflictResolution()
  resetRecoveryScheduler()
  stubApi.recovery.save.mockResolvedValue({ ok: true, data: { status: 'saved', token: 't', epoch: 0 } })
  stubApi.recovery.release.mockResolvedValue({ ok: true, data: { status: 'released', epoch: 1 } })
  stubApi.lineage.patchNode.mockImplementation(async (req: Partial<LineageNode>) => ({ ok: true, data: { ...node(String(req.id ?? 'X')), ...req } as LineageNode }))
  stubApi.lineage.upsertLineTypes.mockImplementation(async (req: { names: string[] }) => ({ ok: true, data: [...req.names] }))
  stubApi.lineage.graph.mockImplementation(async (req: { folderId: string }) =>
    ({ ok: true, data: { nodes: [node('A', req.folderId)], edges: [], lineTypeNames: defaultLineTypeNames(), floatingNotes: [] } })
  )
  useLineageStore.setState({
    nodes: [node('A')], edges: [], floatingNotes: [], paperMetrics: {}, pubNos: {}, tagNames: {},
    status: 'ready', error: null, saveStatus: 'clean', lastWriteError: null, queue: [], flushing: false, inflight: null,
    needsReload: false, undoStack: [], redoStack: [], unfinalized: false, editRevision: 0, folderId: MAIN
  })
  useLineageViewStore.setState({ mode: 'edit', focusSet: [], navCollapsed: false, navWidth: 208 })
  initRecoveryScheduler({
    workspaceId: () => 'ws-1',
    snapshot: () => {
      const s = useLineageStore.getState()
      return s.saveStatus === 'clean'
        ? null
        : { folderId: s.folderId, graph: { nodes: s.nodes, edges: s.edges, lineTypeNames: s.lineTypeNames, floatingNotes: s.floatingNotes }, queue: s.queue, draft: null }
    },
    loadPayload: () => undefined,
    onRestored: () => undefined,
    openLineageView: () => undefined,
    discardLoadedSession: () => undefined
  })
  stubApi.recovery.peek.mockResolvedValue({ ok: true, data: { slots: { 'lineage-session': { status: 'empty', epoch: 0 } } } })
  await enterWorkspaceRecovery()
}

/** 用例后清理：会话清空（未落定写先 flush）、草稿注册归零、真实定时器 */
export function cleanupRemapFixture(): void {
  resetLineageSessionsForTests()
  unregisterNoteDraftFlush()
  setNoteDraftPending(false)
  setNoteDraftSnapshot(null)
  vi.useRealTimers()
}
