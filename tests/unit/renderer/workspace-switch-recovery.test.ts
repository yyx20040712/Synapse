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
