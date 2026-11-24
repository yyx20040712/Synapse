// @vitest-environment jsdom
/**
 * [B4 L2 / 设计稿 §2.3 idleTimer 行、§2.5 #3/#5/#6/#8/#11] lineage idle-flush ——
 * 1.5s 空闲落库 timer 锁定合约面（fake timer 真实计时 1_499/1_500——常量
 * IDLE_FLUSH_MS 单源 @shared/constants，不为测试改短）。
 * always-active 裸 describe（K3）。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { IDLE_FLUSH_MS } from '@shared/constants'
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
    removeFloatingNote: vi.fn(),
    historyUnit: vi.fn()
  }
})

import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'
import { echoHistoryUnit } from '../../utils/lineage-history-stub'
import { defaultLineTypeNames, type LineageNode } from '../../../src/shared/models/lineage'

const MAIN = '__main__'

function node(id: string, patch: Partial<LineageNode> = {}): LineageNode {
  return {
    id,
    paperId: `paper-${id}`,
    title: `节点${id}`,
    year: 2020,
    x: 1,
    y: 1,
    month: null,
    slot: null,
    folderId: MAIN,
    createdAt: 't',
    updatedAt: 't',
    ...patch
  }
}

const settle = async (turns = 8): Promise<void> => {
  for (let i = 0; i < turns; i++) await Promise.resolve()
}

const state = () => useLineageStore.getState()
const advance = async (ms: number): Promise<void> => {
  await vi.advanceTimersByTimeAsync(ms)
  await settle()
}

beforeEach(() => {
  vi.useFakeTimers()
  for (const fn of Object.values(stubApi.lineage)) fn.mockReset()
  stubApi.lineage.graph.mockResolvedValue({ ok: true, data: { nodes: [node('B1')], edges: [], lineTypeNames: defaultLineTypeNames(), floatingNotes: [] } })
  stubApi.lineage.patchNode.mockImplementation(async (req: Partial<LineageNode>) =>
    ({ ok: true, data: { ...node(req.id ?? 'X'), ...req, updatedAt: 'server' } })
  )
  stubApi.lineage.historyUnit.mockImplementation(echoHistoryUnit)
  useLineageStore.setState({
    nodes: [node('A1')],
    edges: [],
    floatingNotes: [],
    status: 'ready',
    error: null,
    saveStatus: 'clean',
    lastWriteError: null,
    queue: [],
    flushing: false,
    inflight: null,
    needsReload: false,
    undoStack: [],
    redoStack: [],
    unfinalized: false,
    editRevision: 0,
    folderId: MAIN
  })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('idle-flush 1.5s（§2.5 #3/#5/#8）', () => {
  it('编辑后 1.5s 内不落库（Q=1）；到期 flush 落库——U/undo/redo 全不动（#5/#8：idle-flush≠定稿）', async () => {
    state().moveNode('A1', 10, 10)
    expect(state().queue).toHaveLength(1)
    expect(state().saveStatus).toBe('dirty')
    await advance(IDLE_FLUSH_MS - 1)
    expect(stubApi.lineage.patchNode).not.toHaveBeenCalled() // 1_499：未落库
    expect(state().saveStatus).toBe('dirty')
    await advance(1)
    expect(stubApi.lineage.patchNode).toHaveBeenCalledTimes(1) // 1_500：落库
    expect(state().saveStatus).toBe('clean')
    expect(state().queue).toEqual([])
    // #8：普通写最后一条成功——U 不变、undo 不变、redo 不变
    expect(state().unfinalized).toBe(true)
    expect(state().undoStack).toHaveLength(1)
    expect(state().redoStack).toEqual([])
  })

  it('连续编辑重排：自最后一次编辑起算 1.5s（新编辑重排 §2.3 idleTimer 行）', async () => {
    state().moveNode('A1', 10, 10)
    await advance(IDLE_FLUSH_MS - 500)
    state().moveNode('A1', 20, 20) // 重排：旧 timer 取消，自此刻起算
    await advance(IDLE_FLUSH_MS - 1)
    expect(stubApi.lineage.patchNode).not.toHaveBeenCalled() // 距首次编辑已 2_499ms：旧 timer 未触发
    await advance(1)
    expect(stubApi.lineage.patchNode).toHaveBeenCalledTimes(1) // 第二次编辑后恰 1_500
    expect(state().undoStack).toHaveLength(2)
  })

  it('undo/redo 命令接管写链：先取消 idle timer（#13 取消旧 timer）——命令落定后到期不重复 flush', async () => {
    state().moveNode('A1', 10, 10)
    expect(await state().undo()).toBe(true) // drain+history-unit 落定（Q0）
    const patchCalls = stubApi.lineage.patchNode.mock.calls.length
    expect(patchCalls).toBe(1)
    expect(stubApi.lineage.historyUnit).toHaveBeenCalledTimes(1)
    await advance(IDLE_FLUSH_MS * 2)
    expect(stubApi.lineage.patchNode).toHaveBeenCalledTimes(patchCalls)
    expect(stubApi.lineage.historyUnit).toHaveBeenCalledTimes(1)
  })
})

describe('idle timer 的 no-op 与取消（§2.5 #6/#11）', () => {
  it('无编辑且 Q=0：到期纯 no-op（#6——零 IPC 零链任务）', async () => {
    vi.advanceTimersByTime(IDLE_FLUSH_MS * 3) // 同步推进（不冲微任务——链任务起步即 flushing 可观测）
    expect(state().flushing).toBe(false) // 未起任何链任务（本例无编辑、未排 timer——对「恒 flush」实现无判别力；#6 的判别合约见 lineage-idle-scheduler.test.ts）
    expect(state().inflight).toBeNull()
    await advance(1)
    expect(stubApi.lineage.patchNode).not.toHaveBeenCalled()
    expect(state().saveStatus).toBe('clean')
  })

  it('显式保存不等 timer（先取消）：立即落库+定稿；旧 timer 到期 no-op 不重复 flush（#11/#20/#21）', async () => {
    state().moveNode('A1', 10, 10)
    expect(await state().saveActiveFolder()).toBe(true) // 不推进 timer 即落库
    expect(stubApi.lineage.patchNode).toHaveBeenCalledTimes(1)
    expect(state().unfinalized).toBe(false)
    expect(state().saveStatus).toBe('clean')
    await advance(IDLE_FLUSH_MS * 2)
    expect(stubApi.lineage.patchNode).toHaveBeenCalledTimes(1) // 旧 timer 已失效
    expect(state().saveStatus).toBe('clean')
  })

  it('切换取消离场图 timer：flush-first 落库恰一次，到期不重复（#11/#32）', async () => {
    state().moveNode('A1', 10, 10)
    await advance(500)
    state().setFolder('f-b')
    await settle()
    expect(stubApi.lineage.patchNode).toHaveBeenCalledTimes(1) // flush-first
    await advance(IDLE_FLUSH_MS * 2)
    expect(stubApi.lineage.patchNode).toHaveBeenCalledTimes(1) // A 的旧 timer 已取消
    expect(state().folderId).toBe('f-b')
  })

  it('保存失败不重排：error 态保留失败写，到期不自动重试（#9：重试=用户触发）', async () => {
    stubApi.lineage.patchNode.mockResolvedValueOnce({ ok: false, error: { code: 'DB_ERROR', message: '写失败' } })
    state().moveNode('A1', 10, 10)
    await advance(IDLE_FLUSH_MS)
    expect(state().saveStatus).toBe('error')
    expect(state().queue).toHaveLength(1)
    await advance(IDLE_FLUSH_MS * 3)
    expect(stubApi.lineage.patchNode).toHaveBeenCalledTimes(1) // 不自动重试
  })
})
