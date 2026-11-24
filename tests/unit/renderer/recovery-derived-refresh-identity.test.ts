// @vitest-environment jsdom
/**
 * [回炉 W-B1·R-W1 / 设计稿 §8.3「旧图响应只回写原会话」、§2.6 #43] 恢复后的派生面补拉
 * （recovery-host-ports refreshDerivedFields）按发起时的 folderId＋sessionGeneration 写回原
 * 会话；会话已不是活动会话、已被替换或已消亡则丢弃。断言读注册表会话数据面。
 * always-active 裸 describe（K3）。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
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
  },
  recovery: { peek: vi.fn(), save: vi.fn(), read: vi.fn(), release: vi.fn() }
})

import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'
import { buildRecoverySchedulerInit } from '../../../src/renderer/features/lineage/recovery-host-ports'
import { lineageRegistry as registry } from '../../../src/renderer/features/lineage/lineage-session-registry'
import { defaultLineTypeNames, type LineageNode } from '@shared/models/lineage'
import type { LineageRecoveryPayload } from '@shared/recovery/schemas'
import type { LineageGraphRes } from '../../../src/shared/ipc/schemas'

const A = 'f-a'
const B = 'f-b'

function node(id: string, folderId: string): LineageNode {
  return { id, paperId: `paper-${id}`, title: `节点${id}`, year: 2022, x: 1, y: 1, month: 9, slot: 0, folderId, createdAt: 't', updatedAt: 't' }
}

const settle = async (turns = 12): Promise<void> => {
  for (let i = 0; i < turns; i++) await Promise.resolve()
}
const state = () => useLineageStore.getState()
const payloadOf = (folderId: string): LineageRecoveryPayload =>
  ({ folderId, graph: { nodes: [], edges: [], lineTypeNames: defaultLineTypeNames(), floatingNotes: [] }, queue: [], draft: null })

/** 派生读桩：挂起至用例放行；回包含可辨识的派生三面 */
function deferredDerivedRead(): { release: () => void } {
  let release!: () => void
  stubApi.lineage.graph.mockImplementation(() => new Promise<{ ok: true; data: LineageGraphRes }>((resolve) => {
    release = () => {
      const data: LineageGraphRes = {
        nodes: [], edges: [], lineTypeNames: defaultLineTypeNames(), floatingNotes: [],
        paperMetrics: { 'paper-A1': { citedByCount: 3, venueTier: null } },
        pubNos: { 'paper-A1': 7 },
        tagNames: { 'paper-A1': ['恢复标签'] }
      }
      resolve({ ok: true as const, data })
    }
  }))
  return { release: () => release() }
}

beforeEach(() => {
  resetLineageSessionsForTests() // 多会话夹具：跨用例不复用旧会话
  vi.clearAllMocks()
  useLineageStore.setState({
    nodes: [node('A1', '__main__')], edges: [], floatingNotes: [], paperMetrics: {}, pubNos: {}, tagNames: {}, lineTypeNames: defaultLineTypeNames(),
    status: 'ready', error: null, saveStatus: 'clean', lastWriteError: null, queue: [], flushing: false, inflight: null,
    needsReload: false, undoStack: [], redoStack: [], unfinalized: false, editRevision: 0, folderId: '__main__'
  })
  for (const folder of [A, B]) {
    registry.ensure(folder)
    registry.update(folder, { nodes: [node(`${folder}-1`, folder)], status: 'ready' })
  }
})

describe('恢复后派生面补拉的身份准入', () => {
  it('恢复 A 后切到 B：A 的派生数据写回 A 会话，不写入 B', async () => {
    const init = buildRecoverySchedulerInit(async () => false, { workspaceId: () => 'ws-1' })
    state().setFolder(A) // A 为活动会话（恢复目标）
    expect(state().folderId).toBe(A)
    const read = deferredDerivedRead()
    init.onRestored(payloadOf(A)) // 派生读在途
    await settle()
    expect(stubApi.lineage.graph).toHaveBeenCalledWith({ folderId: A })
    state().setFolder(B) // 读在途时切到 B
    await settle()
    expect(state().folderId).toBe(B)
    read.release()
    await settle()
    expect(registry.entry(B)?.data.paperMetrics).toEqual({}) // B 不被写入
    expect(registry.entry(B)?.data.pubNos).toEqual({})
    expect(registry.entry(B)?.data.tagNames).toEqual({})
    expect(state().paperMetrics).toEqual({}) // 活动投影（B）同样不被写入
    expect(registry.entry(A)?.data.paperMetrics).toEqual({ 'paper-A1': { citedByCount: 3, venueTier: null } }) // 写回原会话
    expect(registry.entry(A)?.data.pubNos).toEqual({ 'paper-A1': 7 })
    expect(registry.entry(A)?.data.tagNames).toEqual({ 'paper-A1': ['恢复标签'] })
  })

  it('派生读在途时恢复目标会话被替换（换代）：迟到数据不写新会话', async () => {
    const init = buildRecoverySchedulerInit(async () => false, { workspaceId: () => 'ws-1' })
    state().setFolder(A)
    const generationBefore = registry.entry(A)!.data.sessionGeneration
    const read = deferredDerivedRead()
    init.onRestored(payloadOf(A))
    await settle()
    state().discardSession(A) // 同图新代际（迟到写不落新会话）
    expect(registry.entry(A)!.data.sessionGeneration).not.toBe(generationBefore)
    read.release()
    await settle()
    expect(registry.entry(A)!.data.paperMetrics).toEqual({})
    expect(state().paperMetrics).toEqual({})
  })

  it('对照：目标会话仍是发起时的那个会话（未切换、未换代）→派生数据写入', async () => {
    const init = buildRecoverySchedulerInit(async () => false, { workspaceId: () => 'ws-1' })
    state().setFolder(A)
    const read = deferredDerivedRead()
    init.onRestored(payloadOf(A))
    await settle()
    read.release()
    await settle()
    expect(registry.entry(A)!.data.pubNos).toEqual({ 'paper-A1': 7 })
    expect(state().pubNos).toEqual({ 'paper-A1': 7 }) // 活动投影同步
  })
})
