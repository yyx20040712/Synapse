// @vitest-environment jsdom
/**
 * [B4 L2 / 设计稿 §2.3 idleTimer 行、§2.5 #3/#5/#6/#11；回炉 W-D2a·T-W02] lineage-idle-scheduler ——
 * 每 folder 会话 idle-flush 调度纯件的到期分发合约。
 *
 * 背景（T-W02）：原 no-op 例（lineage-idle-flush.test.ts）无编辑、未排 timer，对「到期恒 flush」
 * 实现无判别力（审查变异 M1 存活）。本件两层锁定：
 * - 纯件层：注入端口（会话读面／草稿注册族／flush 入链口）直接驱动到期函数 due——不经计时器，
 *   观察端口调用与重排（setTimeout 调用数）；#6「无单元且 Q=0→不变」由此有判别力。timer 行为另以
 *   fake timer 真实计时 1_499/1_500 锁定（常量 IDLE_FLUSH_MS 单源 @shared/constants，不为测试改短）。
 * - 装配层：真实 registry＋lane 装配下，草稿变更沿排 timer 后草稿清空（Q=0）——真实到达 #6 到期
 *   分支；链任务起步即 flushing 可观测（同步推进 timer、不冲微任务）。
 * always-active 裸 describe（K3）。
 */
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest'
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

import { createIdleScheduler, type IdleView } from '../../../src/renderer/features/lineage/lineage-idle-scheduler'
import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'
import { lineageRegistry } from '../../../src/renderer/features/lineage/lineage-session-registry'
import { noteDraftPending, setNoteDraftSnapshot } from '../../../src/renderer/features/lineage/lineage-note-draft'
import { resetLineageSessionsForTests } from './lineage-test-session-reset'
import type { LineageInflight } from '../../../src/renderer/features/lineage/lineage-session-model'
import { defaultLineTypeNames, type LineageNode } from '../../../src/shared/models/lineage'

const MAIN = '__main__'

function node(id: string): LineageNode {
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
    updatedAt: 't'
  }
}

/** 纯件夹具：可变会话/草稿态＋三个端口的调用记录 */
function rig(view: { queue?: unknown[]; inflight?: LineageInflight | null } = {}) {
  const state = {
    queue: (view.queue ?? []) as unknown[],
    inflight: (view.inflight ?? null) as LineageInflight | null,
    active: true,
    draft: false,
    idleHandle: true
  }
  const flush = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)
  const commitDraft = vi.fn<() => boolean>().mockReturnValue(true)
  const idle = createIdleScheduler({
    read: (): IdleView => ({ queue: state.queue, inflight: state.inflight }),
    isActive: () => state.active,
    draftPending: () => state.draft,
    commitDraft,
    hasDraftIdleHandle: () => state.idleHandle,
    flush
  })
  return { idle, flush, commitDraft, state }
}

let timers: MockInstance<typeof setTimeout>
/** 排 timer 的累计次数（arm 一次=一次；重排可观测） */
const armed = (): number => timers.mock.calls.length

beforeEach(() => {
  vi.useFakeTimers()
  timers = vi.spyOn(globalThis, 'setTimeout')
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('纯件层：直接驱动到期函数 due', () => {
  it('#6 无单元且 Q=0：到期纯 no-op——零链任务、零草稿提交、不重排', () => {
    const r = rig() // Q=0、F=0、无草稿
    r.idle.due(r.idle.generation())
    expect(r.flush).not.toHaveBeenCalled() // 恒 flush 实现即红
    expect(r.commitDraft).not.toHaveBeenCalled()
    expect(armed()).toBe(0)
  })

  it('#6（timer 路径）：排起后到期不重排——三个 IDLE 周期内 flush 恒零、timer 恒一次', async () => {
    const r = rig()
    r.idle.arm()
    await vi.advanceTimersByTimeAsync(IDLE_FLUSH_MS * 3)
    expect(r.flush).not.toHaveBeenCalled()
    expect(r.commitDraft).not.toHaveBeenCalled()
    expect(armed()).toBe(1) // 到期 no-op：未重排（否则每 1.5s 空转）
  })

  it('#5 有待写（Q=1、F=0）：到期启动 flush 恰一次', () => {
    const r = rig({ queue: [{ kind: 'patch-node' }] })
    r.idle.due(r.idle.generation())
    expect(r.flush).toHaveBeenCalledTimes(1)
    expect(r.commitDraft).not.toHaveBeenCalled()
    expect(armed()).toBe(0)
  })

  it('#11 迟到 timer（代际已过期）：到期 no-op——即使有待写也不 flush', () => {
    const r = rig({ queue: [{ kind: 'patch-node' }] })
    r.idle.arm()
    const stale = r.idle.generation()
    r.idle.arm() // 重排：代际推进，旧 timer 判废
    expect(r.idle.generation()).toBe(stale + 1)
    r.idle.due(stale) // 旧代际到期（迟到 timer）
    expect(r.flush).not.toHaveBeenCalled()
    r.idle.due(r.idle.generation()) // 现行代际到期
    expect(r.flush).toHaveBeenCalledTimes(1)
  })

  it('#11 cancel 推进代际：取消前排定的代际到期 no-op；timer 不再触发', async () => {
    const r = rig({ queue: [{ kind: 'patch-node' }] })
    r.idle.arm()
    const before = r.idle.generation()
    r.idle.cancel()
    expect(r.idle.generation()).toBe(before + 1)
    r.idle.due(before)
    expect(r.flush).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(IDLE_FLUSH_MS * 3)
    expect(r.flush).not.toHaveBeenCalled()
  })

  it('F=1 期间到期：不 flush 不提交；无草稿不重排，打开的草稿重排（链落定后再提交）', () => {
    const r = rig({ queue: [{ kind: 'patch-node' }], inflight: { kind: 'write' } })
    r.idle.due(r.idle.generation())
    expect(r.flush).not.toHaveBeenCalled()
    expect(armed()).toBe(0) // 在途链任务自行收口——不重排
    r.state.draft = true
    r.idle.due(r.idle.generation())
    expect(r.flush).not.toHaveBeenCalled()
    expect(r.commitDraft).not.toHaveBeenCalled()
    expect(armed()).toBe(1) // 打开的草稿：重排
  })

  it('打开的草稿、Q=0：到期提交为编辑单元，随同一信号启动 flush 恰一次', () => {
    const r = rig()
    r.state.draft = true
    r.idle.due(r.idle.generation())
    expect(r.commitDraft).toHaveBeenCalledTimes(1)
    expect(r.flush).toHaveBeenCalledTimes(1)
    expect(armed()).toBe(0)
  })

  it('打开的草稿、Q=1：提交与 flush 各恰一次（同一信号——不重复 flush）', () => {
    const r = rig({ queue: [{ kind: 'patch-node' }] })
    r.state.draft = true
    r.idle.due(r.idle.generation())
    expect(r.commitDraft).toHaveBeenCalledTimes(1)
    expect(r.flush).toHaveBeenCalledTimes(1)
  })

  it('草稿提交被拒：有挂载句柄=重排不 flush；无挂载句柄=不重排（残留草稿留给回页再水化）', () => {
    const withHandle = rig()
    withHandle.state.draft = true
    withHandle.commitDraft.mockReturnValue(false)
    withHandle.idle.due(withHandle.idle.generation())
    expect(withHandle.flush).not.toHaveBeenCalled()
    expect(armed()).toBe(1) // 重排待下次到期，不丢稿

    const noHandle = rig({ queue: [{ kind: 'patch-node' }] })
    noHandle.state.draft = true
    noHandle.state.idleHandle = false
    noHandle.commitDraft.mockReturnValue(false)
    noHandle.idle.due(noHandle.idle.generation())
    expect(armed()).toBe(1) // 仅上一夹具的那一次——本夹具未重排
    expect(noHandle.flush).toHaveBeenCalledTimes(1) // 待写照常 flush；草稿不动
  })

  it('草稿只属活动图：非活动会话的草稿不计——Q=0 到期 no-op', () => {
    const r = rig()
    r.state.active = false
    r.state.draft = true
    r.idle.due(r.idle.generation())
    expect(r.commitDraft).not.toHaveBeenCalled()
    expect(r.flush).not.toHaveBeenCalled()
    expect(armed()).toBe(0)
  })

  it('会话消亡（dispose）：到期恒 no-op，在途 timer 取消', async () => {
    const r = rig({ queue: [{ kind: 'patch-node' }], inflight: null })
    r.idle.arm()
    const gen = r.idle.generation()
    r.idle.dispose()
    r.idle.due(gen) // 消亡前排定的代际
    r.idle.due(r.idle.generation()) // 即使代际相符
    r.state.draft = true
    r.idle.due(r.idle.generation()) // 草稿路径同样不重排
    expect(r.flush).not.toHaveBeenCalled()
    expect(r.commitDraft).not.toHaveBeenCalled()
    expect(armed()).toBe(1)
    await vi.advanceTimersByTimeAsync(IDLE_FLUSH_MS * 3)
    expect(r.flush).not.toHaveBeenCalled()
  })

  it('真实计时：排起后 1_499ms 未到期、1_500ms 到期一次', async () => {
    const r = rig({ queue: [{ kind: 'patch-node' }] })
    r.idle.arm()
    await vi.advanceTimersByTimeAsync(IDLE_FLUSH_MS - 1)
    expect(r.flush).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(r.flush).toHaveBeenCalledTimes(1)
  })

  it('重排自最后一次 arm 起算：旧 timer 取消（距首次排起 2_499ms 仍未到期）', async () => {
    const r = rig({ queue: [{ kind: 'patch-node' }] })
    r.idle.arm()
    await vi.advanceTimersByTimeAsync(IDLE_FLUSH_MS - 500)
    r.idle.arm()
    await vi.advanceTimersByTimeAsync(IDLE_FLUSH_MS - 1)
    expect(r.flush).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(r.flush).toHaveBeenCalledTimes(1)
  })
})

describe('装配层：真实 registry＋lane（fake timer 真实计时）', () => {
  const state = () => useLineageStore.getState()
  beforeEach(() => {
    resetLineageSessionsForTests()
    for (const fn of Object.values(stubApi.lineage)) fn.mockReset()
    stubApi.lineage.patchNode.mockImplementation(async (req: Partial<LineageNode>) =>
      ({ ok: true, data: { ...node(req.id ?? 'X'), ...req, updatedAt: 'server' } })
    )
    useLineageStore.setState({
      nodes: [node('A1')],
      edges: [],
      floatingNotes: [],
      lineTypeNames: defaultLineTypeNames(),
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
    setNoteDraftSnapshot(null)
    resetLineageSessionsForTests()
  })

  it('#6 草稿变更沿排 timer 后草稿清空（Q=0）：到期纯 no-op——不起链任务（恒 flush 实现即红）', async () => {
    setNoteDraftSnapshot({ noteId: 'fn-1', text: '甲' }) // 草稿内容变更沿→活动会话排 idle timer
    setNoteDraftSnapshot(null) // 草稿清空（不走变更沿——timer 仍在排）
    expect(noteDraftPending()).toBe(false)
    expect(state().queue).toHaveLength(0)
    expect(state().inflight).toBeNull()
    const notices = vi.fn()
    const unsubscribe = lineageRegistry.subscribe(notices)
    vi.advanceTimersByTime(IDLE_FLUSH_MS) // 同步推进（不冲微任务——链任务起步即 flushing 可观测）
    expect(state().flushing).toBe(false) // 未起任何链任务：#6 到期分支真实到达且为 no-op
    expect(state().inflight).toBeNull()
    expect(state().saveStatus).toBe('clean')
    expect(notices).not.toHaveBeenCalled() // 会话面零写（不变）
    unsubscribe()
    await vi.advanceTimersByTimeAsync(IDLE_FLUSH_MS * 3)
    expect(state().flushing).toBe(false)
    expect(stubApi.lineage.patchNode).not.toHaveBeenCalled()
    expect(state().editRevision).toBe(0)
    expect(state().undoStack).toEqual([])
    expect(state().redoStack).toEqual([])
  })

  it('对照（#5 装配层）：草稿变更沿排 timer 时已有待写——到期 flush 落库恰一次', async () => {
    setNoteDraftSnapshot({ noteId: 'fn-1', text: '甲' }) // 排 timer（Q=0——此时无编辑单元，不经 editUnit）
    lineageRegistry.lane(MAIN).enqueue({ kind: 'patch-node', id: 'A1', patch: { x: 10, y: 10 } }) // 同一排起窗内出现待写（直接入队，不另排 timer）
    expect(state().queue).toHaveLength(1)
    vi.advanceTimersByTime(IDLE_FLUSH_MS)
    expect(state().flushing).toBe(true) // 链任务起步
    await vi.advanceTimersByTimeAsync(IDLE_FLUSH_MS)
    expect(stubApi.lineage.patchNode).toHaveBeenCalledTimes(1)
    expect(state().queue).toEqual([])
    expect(state().flushing).toBe(false)
  })
})
