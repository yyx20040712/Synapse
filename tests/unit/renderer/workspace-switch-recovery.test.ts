// @vitest-environment jsdom
/**
 * [F-VISFB-65 回炉 R3/W10] ws 切换 release 时序+屏障×首编辑（store 级）。
 * - R3：onConfirmed（prepareRecoveryWorkspaceSwitch）在 api.workspaces.switch
 *   **之前**完成——release 携旧 ws id（main 侧未切=guardWorkspace 放行），
 *   且 switch 等待 release 收束（零竞窗：release 未决则 switch 不发）；
 * - W10：启动 peek 在途→首编辑被 beginUnitGated 拒（queue 零入）→peek 空
 *   落定→同编辑放行。
 * always-active。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub } from '../../utils/api-client-mock'

const stubApi = makeApiStub({
  workspaces: { list: vi.fn(), create: vi.fn(), rename: vi.fn(), switch: vi.fn() },
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

import { useWorkspaceStore } from '../../../src/renderer/features/workspaces/workspace.store'
import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'
import {
  enterWorkspaceRecovery,
  initRecoveryScheduler,
  prepareRecoveryWorkspaceSwitch,
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

beforeEach(async () => {
  vi.clearAllMocks()
  resetRecoveryScheduler()
  window.confirm = () => true // dirty 确认直过（时序面不在确认框）
  stubApi.workspaces.list.mockResolvedValue({
    ok: true,
    data: { items: [{ id: 'ws-1', name: '一', createdAt: 't', paperCount: 1 }, { id: 'ws-2', name: '二', createdAt: 't', paperCount: 0 }], currentId: 'ws-1' }
  })
  stubApi.workspaces.switch.mockResolvedValue({ ok: true, data: { ok: true } })
  stubApi.recovery.save.mockResolvedValue({ ok: true, data: { status: 'saved', token: 't1', epoch: 0 } })
  stubApi.recovery.peek.mockResolvedValue({
    ok: true,
    data: { slots: { 'lineage-session': { status: 'empty', epoch: 0 } } }
  })
  stubApi.lineage.patchNode.mockImplementation(async (req: Partial<LineageNode>) =>
    ({ ok: true, data: { ...node(String(req.id ?? 'X')), ...req } as LineageNode })
  )
  initRecoveryScheduler({
    workspaceId: () => useWorkspaceStore.getState().currentId,
    snapshot: () => {
      const s = useLineageStore.getState()
      return s.saveStatus === 'clean' ? null : { folderId: s.folderId, graph: { nodes: s.nodes, edges: s.edges, lineTypeNames: s.lineTypeNames, floatingNotes: s.floatingNotes }, queue: s.queue, draft: null }
    },
    loadPayload: () => undefined,
    onRestored: () => undefined,
    openLineageView: () => undefined,
    discardLoadedSession: () => useLineageStore.getState().discardSession()
  })
  await useWorkspaceStore.getState().load()
  await enterWorkspaceRecovery() // 开闸（ws-1）
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
})

afterEach(() => {
  resetRecoveryScheduler()
})

describe('R3 ws 切换 release 时序（onConfirmed 前移）', () => {
  it('release 携旧 ws 且先于 api.workspaces.switch 完成；release 未决则 switch 不发', async () => {
    // 会话脏（有 token 可 release）：编辑+等副本落定
    useLineageStore.getState().moveNode('A', 1, 2)
    await vi.waitFor(() => expect(stubApi.recovery.save).toHaveBeenCalled())
    const calls: string[] = []
    let resolveRelease: (v: unknown) => void = () => undefined
    stubApi.recovery.release.mockImplementation(async () => {
      calls.push('release')
      await new Promise((r) => (resolveRelease = r))
      return { ok: true, data: { status: 'released', epoch: 1 } }
    })
    stubApi.workspaces.switch.mockImplementation(async () => {
      calls.push('switch')
      return { ok: true, data: { ok: true } }
    })
    // jsdom location.reload=只读 no-op（"Not implemented: navigation"）——
    // switched===true 即证明已行至 reload 段
    const switched = useWorkspaceStore.getState().switchTo('ws-2', {
      dirty: true,
      onConfirmed: prepareRecoveryWorkspaceSwitch
    })
    // 负断言（收束序真锁）：release resolve 前 calls 恰 ['release']（switch 未发）
    await vi.waitFor(() => expect(calls).toEqual(['release']))
    expect(stubApi.recovery.release.mock.calls[0]![0].workspaceId).toBe('ws-1') // 旧 ws（guardWorkspace 放行面）
    resolveRelease(undefined)
    await expect(switched).resolves.toBe(true) // 已行至 reload 段（返回 true）
    expect(calls).toEqual(['release', 'switch']) // switch 在 release 收束后
  })
})

describe('W10 启动 peek 在途×首编辑（store 级）', () => {
  it('peek 在途：moveNode 被 beginUnitGated 拒（queue 零入）；peek 空落定后同编辑放行', async () => {
    let resolvePeek: (v: unknown) => void = () => undefined
    stubApi.recovery.peek.mockReturnValue(new Promise((r) => (resolvePeek = r)) as never)
    const entering = enterWorkspaceRecovery()
    useLineageStore.getState().moveNode('A', 1, 2) // 首编辑（peek 在途）
    expect(useLineageStore.getState().queue).toHaveLength(0) // 门拒
    resolvePeek({ ok: true, data: { slots: { 'lineage-session': { status: 'empty', epoch: 0 } } } })
    await entering
    useLineageStore.getState().moveNode('A', 1, 2) // 同编辑重放
    expect(useLineageStore.getState().queue).toHaveLength(1) // 放行
  })
})

// ── [回炉 W-D1·T-B02] 设计稿 §12.2 行 807 增补：多 folder 全成功才 release；失败保旧 ws 与全部历史。
//    既有两例=单会话的 release 顺序与 peek 屏障。本段经生产 owner 装配（RecoveryBarHost 同一
//    init——registry keyed 快照源+owner 状态机）建「主图活动（owner）+ f-b 挂起」两会话各持待写，
//    走 workspace.store.switchTo 的真实编排（prepare→onConfirmed→switch）。
describe('[回炉 W-D1] 多 folder 课题切换：全成功才 release、失败保旧课题与全部历史（§2.5 #38、§8.4 行 10）', () => {
  const MAIN = '__main__'
  const SUSPENDED = 'f-b'
  /** 会话的历史两栈（按历史项 id）／待写数／U／相位（「历史保留」的对照面——按内容比较，不按引用） */
  interface Stacks {
    undo: string[]
    redo: string[]
    queue: number
    unfinalized: boolean
    phase: string
  }
  const stacksOf = (d: { undoStack: Array<{ id: string }>; redoStack: Array<{ id: string }>; queue: unknown[]; unfinalized: boolean; saveStatus: string }): Stacks => ({
    undo: d.undoStack.map((e) => e.id), redo: d.redoStack.map((e) => e.id), queue: d.queue.length, unfinalized: d.unfinalized, phase: d.saveStatus
  })
  /** 生产装配+两会话各一条待写；owner=主图（首次编辑认领，副本 saved 回执后生效） */
  const seedOwnerAndSuspended = async (): Promise<void> => {
    const { buildRecoverySchedulerInit } = await import('../../../src/renderer/features/lineage/recovery-host-ports')
    const { lineageRegistry } = await import('../../../src/renderer/features/lineage/lineage-session-registry')
    const { resetLineageSessionsForTests } = await import('./lineage-test-session-reset')
    resetRecoveryScheduler()
    resetLineageSessionsForTests() // 前例残留的失败写在此先 flush-first（落孤儿 entry 的物理账本）——其后清调用记录，本段计数只含本例
    stubApi.lineage.patchNode.mockClear()
    useLineageStore.setState({
      nodes: [node('A')], edges: [], floatingNotes: [], status: 'ready', error: null, saveStatus: 'clean', lastWriteError: null,
      queue: [], flushing: false, inflight: null, needsReload: false, undoStack: [], redoStack: [], unfinalized: false, folderId: MAIN
    })
    lineageRegistry.ensure(SUSPENDED)
    lineageRegistry.update(SUSPENDED, { nodes: [{ ...node('B'), folderId: SUSPENDED }], status: 'ready' })
    lineageRegistry.setRecoveryOwner(null) // registry 的 owner 发布面不随调度器复位——先清前例残留，下面的等待才是「本例的副本已落」
    initRecoveryScheduler(buildRecoverySchedulerInit(() => Promise.resolve(true), { workspaceId: () => useWorkspaceStore.getState().currentId }))
    await enterWorkspaceRecovery() // 开闸（peek 空槽）
    stubApi.recovery.save.mockClear()
    useLineageStore.getState().moveNode('A', 1, 2) // 活动会话：Q=1、undo 1
    lineageRegistry.lane(SUSPENDED).commands.moveNode('B', 3, 4) // 挂起会话：Q=1、undo 1（owner 未转移——不覆槽）
    const generation = lineageRegistry.entry(MAIN)!.data.sessionGeneration
    await vi.waitFor(() => expect(lineageRegistry.recoveryOwner()).toEqual({ folderId: MAIN, generation })) // 副本已落、owner 生效（saved 回执后才发布——代际=本例会话）
    expect(stubApi.recovery.save).toHaveBeenCalledTimes(1) // 槽里只有主图的快照（回执 token=t1）；f-b 不覆槽
    const snapshot = stubApi.recovery.save.mock.calls[0]![0] as { payload: { folderId: string; queue: unknown[]; draft: unknown } }
    expect({ folderId: snapshot.payload.folderId, queue: snapshot.payload.queue, draft: snapshot.payload.draft })
      .toEqual({ folderId: MAIN, queue: [{ kind: 'patch-node', id: 'A', patch: { x: 1, y: 2 } }], draft: null })
  }
  const switchNow = async (): Promise<boolean> => {
    const { prepareWorkspaceSwitch } = await import('../../../src/renderer/app/workspace-switch')
    return useWorkspaceStore.getState().switchTo('ws-2', { dirty: true, prepare: prepareWorkspaceSwitch, onConfirmed: prepareRecoveryWorkspaceSwitch })
  }
  const patchIds = (): Array<string | undefined> => stubApi.lineage.patchNode.mock.calls.map((c) => (c[0] as { id?: string }).id).sort()
  /** 指定节点 id 的写返回系统失败，其余照常回显 */
  const failWriteOf = (failedId: string, message: string): void => {
    stubApi.lineage.patchNode.mockImplementation(async (req: Partial<LineageNode>) =>
      req.id === failedId
        ? { ok: false as const, error: { code: 'DB_ERROR', message } }
        : { ok: true as const, data: { ...node(String(req.id ?? 'X')), ...req } as LineageNode }
    )
  }

  it('全成功才 release：两图的写全部落库→release（旧 ws id、本会话 token、reason=discard）恰一次→switch；release 未决则 switch 不发；切换后全部会话历史/U/队列清、owner=null', async () => {
    await seedOwnerAndSuspended()
    const { lineageRegistry } = await import('../../../src/renderer/features/lineage/lineage-session-registry')
    stubApi.lineage.patchNode.mockClear()
    stubApi.recovery.release.mockClear()
    stubApi.workspaces.switch.mockClear()
    // release 回执的放行句柄（访问器形——闭包取现值：变量形会被类型窄化判为恒 null）
    let releaseFn: (() => void) | null = null
    const release = { fire: (): void => { releaseFn?.() } }
    stubApi.recovery.release.mockImplementation(async () => {
      await new Promise<void>((r) => { releaseFn = r })
      return { ok: true, data: { status: 'released', epoch: 1 } }
    })
    let settled = false
    const switched = switchNow().then((v) => {
      settled = true
      return v
    })
    try {
      await vi.waitFor(() => expect(stubApi.recovery.release).toHaveBeenCalledTimes(1))
      expect(patchIds(), 'release 之前两图的写都已发出').toEqual(['A', 'B'])
      expect(Math.max(...stubApi.lineage.patchNode.mock.invocationCallOrder), 'release 在全部写之后').toBeLessThan(stubApi.recovery.release.mock.invocationCallOrder[0]!)
      expect(stubApi.workspaces.switch, 'release 未决：switch 不发').not.toHaveBeenCalled()
      expect(settled, 'release 未决：switchTo 不返回').toBe(false)
      release.fire()
      await expect(switched).resolves.toBe(true)
      expect(stubApi.recovery.release).toHaveBeenCalledTimes(1) // 恰一次（flush 的 clean 不另发 release）
      expect(stubApi.recovery.release).toHaveBeenCalledWith({ workspaceId: 'ws-1', type: 'lineage-session', token: 't1', reason: 'discard' })
      expect(stubApi.recovery.release.mock.invocationCallOrder[0]!, 'release 先于 switch 收束').toBeLessThan(stubApi.workspaces.switch.mock.invocationCallOrder[0]!)
      expect(stubApi.workspaces.switch).toHaveBeenCalledWith({ id: 'ws-2' })
      // 成功路径独占：全部会话历史/U/队列随 resetWorkspace 全清（§2.5 #38）；owner 归 null
      expect(lineageRegistry.sessions().map((e) => e.key)).toEqual([MAIN])
      expect(stacksOf(lineageRegistry.entry(MAIN)!.data)).toEqual({ undo: [], redo: [], queue: 0, unfinalized: false, phase: 'clean' })
      expect(lineageRegistry.recoveryOwner()).toBeNull()
    } finally {
      // 断言先红时不留悬挂在途：release 未决则放行并等 switchTo 收束（否则其 1500ms 封顶后的续体泄漏进后续用例）
      release.fire()
      await switched.catch(() => undefined)
    }
  })

  it('挂起会话写失败：false 留旧课题——release 零调用、switch 零调用；全部会话历史与失败写保留、owner 留原会话', async () => {
    await seedOwnerAndSuspended()
    const { lineageRegistry } = await import('../../../src/renderer/features/lineage/lineage-session-registry')
    const mainBefore = stacksOf(lineageRegistry.entry(MAIN)!.data)
    const suspendedBefore = stacksOf(lineageRegistry.entry(SUSPENDED)!.data)
    expect({ main: mainBefore, suspended: suspendedBefore }, '前提：两会话各 undo 1、Q=1').toEqual({
      main: { undo: [expect.any(String)], redo: [], queue: 1, unfinalized: true, phase: 'dirty' },
      suspended: { undo: [expect.any(String)], redo: [], queue: 1, unfinalized: true, phase: 'dirty' }
    })
    stubApi.recovery.release.mockClear()
    stubApi.workspaces.switch.mockClear()
    failWriteOf('B', '挂起会话写失败')
    await expect(switchNow()).resolves.toBe(false)
    expect(stubApi.recovery.release, '任一会话未落库：不 release').not.toHaveBeenCalled()
    expect(stubApi.workspaces.switch, '任一会话未落库：不 switch').not.toHaveBeenCalled()
    expect(patchIds(), '两图的写都确曾发出').toEqual(['A', 'B'])
    // 零清账：两会话的历史（同一批历史项 id）保留；失败写保留在挂起会话队首；活动会话的写已落库
    expect({ sessions: lineageRegistry.sessions().length, main: stacksOf(lineageRegistry.entry(MAIN)!.data), suspended: stacksOf(lineageRegistry.entry(SUSPENDED)!.data) })
      .toEqual({ sessions: 2, main: { ...mainBefore, queue: 0, phase: 'clean' }, suspended: { ...suspendedBefore, queue: 1, phase: 'error' } })
    expect(lineageRegistry.entry(SUSPENDED)!.data.lastWriteError).toBe('挂起会话写失败')
    expect(lineageRegistry.recoveryOwner(), 'owner 留原会话（同代际）').toEqual({ folderId: MAIN, generation: lineageRegistry.entry(MAIN)!.data.sessionGeneration })
    expect(useWorkspaceStore.getState().currentId).toBe('ws-1')
  })

  it('owner 会话自身的写失败（挂起会话成功）：同样 false——release 零调用、switch 零调用；两会话历史保留', async () => {
    await seedOwnerAndSuspended()
    const { lineageRegistry } = await import('../../../src/renderer/features/lineage/lineage-session-registry')
    const mainBefore = stacksOf(lineageRegistry.entry(MAIN)!.data)
    const suspendedBefore = stacksOf(lineageRegistry.entry(SUSPENDED)!.data)
    expect({ main: mainBefore, suspended: suspendedBefore }, '前提：两会话各 undo 1、Q=1').toEqual({
      main: { undo: [expect.any(String)], redo: [], queue: 1, unfinalized: true, phase: 'dirty' },
      suspended: { undo: [expect.any(String)], redo: [], queue: 1, unfinalized: true, phase: 'dirty' }
    })
    stubApi.recovery.release.mockClear()
    stubApi.workspaces.switch.mockClear()
    failWriteOf('A', '主图写失败')
    await expect(switchNow()).resolves.toBe(false)
    expect(stubApi.recovery.release, 'owner 自己的写未落库：不 release').not.toHaveBeenCalled()
    expect(stubApi.workspaces.switch, 'owner 自己的写未落库：不 switch').not.toHaveBeenCalled()
    expect(patchIds(), '两图的写都确曾发出').toEqual(['A', 'B'])
    expect({ main: stacksOf(lineageRegistry.entry(MAIN)!.data), suspended: stacksOf(lineageRegistry.entry(SUSPENDED)!.data) })
      .toEqual({ main: { ...mainBefore, queue: 1, phase: 'error' }, suspended: { ...suspendedBefore, queue: 0, phase: 'clean' } })
    expect(lineageRegistry.entry(MAIN)!.data.lastWriteError).toBe('主图写失败')
    expect(useWorkspaceStore.getState().currentId).toBe('ws-1')
  })
})
