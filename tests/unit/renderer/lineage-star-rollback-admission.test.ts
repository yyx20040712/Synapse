// @vitest-environment jsdom
/**
 * [回炉 W-B2·R-W5 / 设计稿 §2.6 #43「任何迟到响应：身份键全部匹配才写原会话」、
 * lineage-writeback-admission 唯一准入函数] 节点星标（非撤销维度——乐观翻转→API 直写；失败回滚）
 * 的失败回滚接到身份准入：会话换代后迟到的回滚不得写新会话。
 *
 * 原缺陷：toggleNodeStar 的回滚按 folderId 键寻址（registry.update）——回执到达时该键下可能已是
 * 恢复替换/改键后的新会话，新会话的节点被旧回执改写。always-active 裸 describe（K3）。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub, toastStoreSpy } from '../../utils/api-client-mock'

const stubApi = makeApiStub({
  lineage: { graph: vi.fn(), patchNode: vi.fn(), upsertEdge: vi.fn(), removeEdge: vi.fn() },
  papers: { setStarred: vi.fn() }
})

import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'
import { lineageRegistry } from '../../../src/renderer/features/lineage/lineage-session-registry'
import { ApiClientError } from '../../../src/renderer/api/client'
import { defaultLineTypeNames, type LineageNode } from '../../../src/shared/models/lineage'

function node(id: string, patch: Partial<LineageNode> = {}): LineageNode {
  return { id, paperId: `paper-${id}`, title: `节点${id}`, year: 2022, x: 1, y: 1, month: 9, slot: 0, folderId: '__main__', createdAt: 't', updatedAt: 't', ...patch }
}
const MAIN = '__main__'
const state = () => useLineageStore.getState()
const starOf = (nodes: LineageNode[], id: string): boolean | undefined => nodes.find((n) => n.id === id)?.isStarred

beforeEach(() => {
  vi.clearAllMocks()
  for (const fn of Object.values(stubApi.lineage)) fn.mockReset()
  toastStoreSpy.mockClear()
  useLineageStore.setState({
    nodes: [node('A'), node('B')], edges: [], floatingNotes: [], paperMetrics: {}, pubNos: {}, tagNames: {}, lineTypeNames: defaultLineTypeNames(),
    status: 'ready', error: null, saveStatus: 'clean', lastWriteError: null, queue: [], flushing: false, inflight: null,
    needsReload: false, undoStack: [], redoStack: [], unfinalized: false, editRevision: 0, folderId: MAIN
  })
})

/** 挂起一次星标写 IPC，返回拒绝句柄（IPC 发出后可调） */
const holdStarWrite = (): ((e: Error) => void) => {
  let reject: ((e: Error) => void) | null = null
  stubApi.papers.setStarred.mockImplementationOnce(() => new Promise((_, rj) => { reject = rj }))
  return (e) => void reject?.(e)
}

describe('星标失败回滚的身份准入', () => {
  it('会话换代（恢复替换）后迟到的失败回滚不写新会话：新会话节点数组未被改写，错误仍可见', async () => {
    const reject = holdStarWrite()
    const toggling = state().toggleNodeStar({ id: 'A', paperId: 'paper-A', isStarred: undefined })
    expect(starOf(state().nodes, 'A')).toBe(true) // 乐观翻转已应用
    expect(stubApi.papers.setStarred).toHaveBeenCalledTimes(1) // 前提：写 IPC 在途
    // 会话被恢复替换（新代际、新 entry；图态随载入携带）
    lineageRegistry.replace(MAIN, { nodes: state().nodes, edges: [], lineTypeNames: defaultLineTypeNames(), floatingNotes: [], status: 'ready' })
    const fresh = lineageRegistry.entry(MAIN)!
    const generation = fresh.data.sessionGeneration
    const nodesBefore = fresh.data.nodes
    reject(new ApiClientError('DB_ERROR', '星标写失败'))
    await toggling
    expect(lineageRegistry.entry(MAIN)).toBe(fresh)
    expect(fresh.data.sessionGeneration).toBe(generation)
    expect(fresh.data.nodes, '新会话的节点数组不得被旧回执改写（同一引用）').toBe(nodesBefore)
    expect(starOf(fresh.data.nodes, 'A')).toBe(true)
    expect(toastStoreSpy).toHaveBeenCalledWith('星标写失败', 'error') // 失败仍如实呈现
  })

  it('会话就地换代（存活会话换代际——同一 entry）后迟到的失败回滚不写该会话：节点数组未被改写', async () => {
    const reject = holdStarWrite()
    const entry = lineageRegistry.entry(MAIN)!
    const toggling = state().toggleNodeStar({ id: 'A', paperId: 'paper-A', isStarred: undefined })
    expect(starOf(state().nodes, 'A')).toBe(true) // 乐观翻转已应用
    lineageRegistry.update(MAIN, { sessionGeneration: entry.data.sessionGeneration + 1 }) // 就地换代（lineage-session-remap 存活会话同型）
    const generation = entry.data.sessionGeneration
    const nodesBefore = entry.data.nodes
    reject(new ApiClientError('DB_ERROR', '星标写失败'))
    await toggling
    expect(lineageRegistry.entry(MAIN)).toBe(entry) // 仍是同一 entry（非替换）
    expect(entry.data.sessionGeneration).toBe(generation)
    expect(entry.data.nodes, '换代后的会话身份不是发起时的身份——回滚丢弃（§2.6 #43）').toBe(nodesBefore)
    expect(starOf(entry.data.nodes, 'A')).toBe(true)
    expect(toastStoreSpy).toHaveBeenCalledWith('星标写失败', 'error')
  })

  it('对照：会话未换代——失败回滚照常落回原会话', async () => {
    const reject = holdStarWrite()
    const toggling = state().toggleNodeStar({ id: 'A', paperId: 'paper-A', isStarred: undefined })
    expect(starOf(state().nodes, 'A')).toBe(true)
    reject(new ApiClientError('DB_ERROR', '星标写失败'))
    await toggling
    expect(starOf(state().nodes, 'A')).toBeUndefined() // 回滚到翻转前现值
    expect(toastStoreSpy).toHaveBeenCalledWith('星标写失败', 'error')
  })

  it('对照：写成功不回滚', async () => {
    stubApi.papers.setStarred.mockResolvedValue({ ok: true, data: { ok: true } })
    await state().toggleNodeStar({ id: 'B', paperId: 'paper-B', isStarred: undefined })
    expect(starOf(state().nodes, 'B')).toBe(true)
    expect(toastStoreSpy).not.toHaveBeenCalled()
  })
})
