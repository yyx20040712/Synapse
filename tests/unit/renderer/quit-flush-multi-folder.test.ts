// @vitest-environment jsdom
/**
 * [回炉 W-B2·M11 / 设计稿 §2.5 #37「提交并 flush 所有 tab+所有 folder」、§9.2「quit/workspace
 * 全量 flush」行、§12.2 quit-flush 行「多 tab+多 folder 全 flush」] 多 folder 退出握手判别测试。
 *
 * 变异锚 M11（r-tests）：退出时只 flush 活动 folder（quit-flush.ts 等待名单过滤收窄为活动会话）
 * ——本件在该变异下必须红：挂起会话 f-b 的待写不会被发出，`ioDirty` 判脏。
 * 判别力证据=仓外副本变异红证（w-b2/logs/mut-m11-*.log）。always-active 裸 describe（K3）。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub } from '../../utils/api-client-mock'

const stubApi = makeApiStub({
  notes: { get: vi.fn(), save: vi.fn() },
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

import { runQuitFlush } from '../../../src/renderer/app/quit-flush'
import { setQuitClosing } from '../../../src/renderer/app/quit-closing-gate'
import { useNotesStore } from '../../../src/renderer/features/notes/notes.store'
import { useReaderStore } from '../../../src/renderer/features/reader/state/reader.store'
import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'
import { lineageRegistry } from '../../../src/renderer/features/lineage/lineage-session-registry'
import { defaultLineTypeNames, type LineageNode } from '../../../src/shared/models/lineage'

const MAIN = '__main__'
const SUSPENDED = 'f-b'

function node(id: string, folderId = MAIN, patch: Partial<LineageNode> = {}): LineageNode {
  return { id, paperId: `paper-${id}`, title: `节点${id}`, year: 2022, x: 1, y: 1, month: 9, slot: 0, folderId, createdAt: 't', updatedAt: 't', ...patch }
}
const patchOk = async (req: Partial<LineageNode>) => ({ ok: true as const, data: { ...node(String(req.id)), ...req, updatedAt: 'server' } })
const state = () => useLineageStore.getState()
const patchIds = (): Array<string | undefined> => stubApi.lineage.patchNode.mock.calls.map((c) => (c[0] as { id?: string }).id)
const settle = async (turns = 30): Promise<void> => {
  for (let i = 0; i < turns; i++) await Promise.resolve()
}

/** 主图（活动）与 f-b（挂起）各持一条待写 */
function seedTwoFolders(): void {
  useLineageStore.setState({
    nodes: [node('A1')], edges: [], floatingNotes: [], paperMetrics: {}, pubNos: {}, tagNames: {}, lineTypeNames: defaultLineTypeNames(),
    status: 'ready', error: null, saveStatus: 'clean', lastWriteError: null, queue: [], flushing: false, inflight: null,
    needsReload: false, undoStack: [], redoStack: [], unfinalized: false, editRevision: 0, folderId: MAIN
  })
  lineageRegistry.ensure(SUSPENDED)
  lineageRegistry.update(SUSPENDED, { nodes: [node('B1', SUSPENDED)], edges: [], status: 'ready' })
  state().moveNode('A1', 10, 10) // 活动会话：Q=1
  lineageRegistry.lane(SUSPENDED).commands.moveNode('B1', 20, 20) // 挂起会话：Q=1
  expect(lineageRegistry.entry(MAIN)!.data.queue).toHaveLength(1)
  expect(lineageRegistry.entry(SUSPENDED)!.data.queue).toHaveLength(1)
}

beforeEach(() => {
  vi.clearAllMocks()
  for (const fn of Object.values(stubApi.lineage)) fn.mockReset()
  stubApi.lineage.graph.mockResolvedValue({ ok: true, data: { nodes: [node('B1', SUSPENDED)], edges: [], lineTypeNames: defaultLineTypeNames(), floatingNotes: [] } })
  stubApi.lineage.patchNode.mockImplementation(patchOk)
  setQuitClosing(false)
  useNotesStore.getState().resetEditStateForTests()
  useReaderStore.setState({ tabs: {}, order: [], activeId: null })
})

afterEach(() => {
  setQuitClosing(false)
})

describe('多 folder 退出：全部 flush（M11 判别）', () => {
  it('活动会话与挂起会话各有待写：退出握手把两图的写都发出，回执 clean', async () => {
    seedTwoFolders()
    const stillDirty = await runQuitFlush()
    expect(patchIds().sort()).toEqual(['A1', 'B1']) // 两图的写都已发出（变异 M11：只 flush 活动 folder→缺 B1）
    expect(lineageRegistry.entry(MAIN)!.data.saveStatus).toBe('clean')
    expect(lineageRegistry.entry(SUSPENDED)!.data.saveStatus).toBe('clean')
    expect(stillDirty).toBe(false)
  })

  it('等待面：挂起会话的写 IPC 在途时退出握手不返回；落定后才回执', async () => {
    seedTwoFolders()
    let release!: (v: { ok: true; data: LineageNode }) => void
    stubApi.lineage.patchNode.mockImplementation((req: { id?: string }) =>
      req.id === 'B1' ? new Promise((r) => { release = r }) : patchOk(req)
    )
    let settled = false
    const quit = runQuitFlush().then((v) => {
      settled = true
      return v
    })
    await settle()
    expect(stubApi.lineage.patchNode.mock.calls.some((c) => (c[0] as { id?: string }).id === 'B1'), '前提：挂起会话的写已派发').toBe(true)
    expect(settled, '挂起会话的写在途：退出握手不得返回').toBe(false)
    release({ ok: true, data: { ...node('B1', SUSPENDED), x: 20, y: 20, updatedAt: 'server' } })
    await expect(quit).resolves.toBe(false)
    expect(settled).toBe(true)
  })
})
