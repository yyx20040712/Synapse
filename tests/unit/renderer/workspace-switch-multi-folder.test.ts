// @vitest-environment jsdom
/**
 * [回炉 W-B2·M12 / 设计稿 §2.5 #38「确认通过后全量 flush 成功→全部 IO idle→再清全部 H/R/U」、
 * §12.2 workspace-switch-recovery 行「多 folder 全成功才 release」] 多 folder 课题切换判别测试。
 *
 * 变异锚 M12（r-tests）：切课题时只 flush 活动 folder（workspace-switch.ts 等待名单过滤收窄为活动
 * 会话）——本件在该变异下必须红：挂起会话 f-b 的待写不会发出，`allIoClean()` 判脏。
 * 判别力证据=仓外副本变异红证（w-b2/logs/mut-m12-*.log）。always-active 裸 describe（K3）。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
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

import { prepareWorkspaceSwitch } from '../../../src/renderer/app/workspace-switch'
import { useNotesStore } from '../../../src/renderer/features/notes/notes.store'
import { useReaderStore } from '../../../src/renderer/features/reader/state/reader.store'
import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'
import { lineageRegistry } from '../../../src/renderer/features/lineage/lineage-session-registry'
import { resetLineageSessionsForTests } from './lineage-test-session-reset'
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
function seedTwoFolders(): { mainHistory: number } {
  resetLineageSessionsForTests()
  useLineageStore.setState({
    nodes: [node('A1')], edges: [], floatingNotes: [], paperMetrics: {}, pubNos: {}, tagNames: {}, lineTypeNames: defaultLineTypeNames(),
    status: 'ready', error: null, saveStatus: 'clean', lastWriteError: null, queue: [], flushing: false, inflight: null,
    needsReload: false, undoStack: [], redoStack: [], unfinalized: false, editRevision: 0, folderId: MAIN
  })
  lineageRegistry.ensure(SUSPENDED)
  lineageRegistry.update(SUSPENDED, { nodes: [node('B1', SUSPENDED)], edges: [], status: 'ready' })
  state().moveNode('A1', 10, 10) // 活动会话：Q=1、undo 1
  lineageRegistry.lane(SUSPENDED).commands.moveNode('B1', 20, 20) // 挂起会话：Q=1、undo 1
  expect(lineageRegistry.entry(MAIN)!.data.queue).toHaveLength(1)
  expect(lineageRegistry.entry(SUSPENDED)!.data.queue).toHaveLength(1)
  return { mainHistory: lineageRegistry.entry(MAIN)!.data.undoStack.length }
}

beforeEach(() => {
  vi.clearAllMocks()
  for (const fn of Object.values(stubApi.lineage)) fn.mockReset()
  stubApi.lineage.graph.mockResolvedValue({ ok: true, data: { nodes: [node('B1', SUSPENDED)], edges: [], lineTypeNames: defaultLineTypeNames(), floatingNotes: [] } })
  stubApi.lineage.patchNode.mockImplementation(patchOk)
  useNotesStore.getState().resetEditStateForTests()
  useReaderStore.setState({ tabs: {}, order: [], activeId: null })
})

describe('多 folder 课题切换：全部 flush（M12 判别）', () => {
  it('活动会话与挂起会话各有待写：准备段把两图的写都发出后才放行', async () => {
    seedTwoFolders()
    await expect(prepareWorkspaceSwitch()).resolves.toBe(true)
    expect(patchIds().sort()).toEqual(['A1', 'B1']) // 两图的写都已发出（变异 M12：只 flush 活动 folder→缺 B1）
    // 成功路径独占：全部会话历史/U/队列随 resetWorkspace 全清（#38）
    expect(lineageRegistry.sessions().every((e) => e.data.undoStack.length === 0 && e.data.queue.length === 0)).toBe(true)
  })

  it('等待面：挂起会话的写 IPC 在途时准备段不返回；落定后才放行', async () => {
    seedTwoFolders()
    let release!: (v: { ok: true; data: LineageNode }) => void
    stubApi.lineage.patchNode.mockImplementation((req: { id?: string }) =>
      req.id === 'B1' ? new Promise((r) => { release = r }) : patchOk(req)
    )
    let settled = false
    const preparing = prepareWorkspaceSwitch().then((v) => {
      settled = true
      return v
    })
    await settle()
    expect(settled, '挂起会话的写在途：准备段不得返回、不得清史').toBe(false)
    expect(lineageRegistry.entry(MAIN)!.data.undoStack).toHaveLength(1) // 历史仍在
    release({ ok: true, data: { ...node('B1', SUSPENDED), x: 20, y: 20, updatedAt: 'server' } })
    await expect(preparing).resolves.toBe(true)
    expect(settled).toBe(true)
  })

  it('挂起会话写失败：false 留旧课题（不清任何会话的历史）', async () => {
    const { mainHistory } = seedTwoFolders()
    stubApi.lineage.patchNode.mockImplementation((req: { id?: string }) =>
      req.id === 'B1' ? Promise.resolve({ ok: false as const, error: { code: 'DB_ERROR', message: '挂起会话写失败' } }) : patchOk(req)
    )
    await expect(prepareWorkspaceSwitch()).resolves.toBe(false)
    expect(lineageRegistry.entry(MAIN)!.data.undoStack).toHaveLength(mainHistory) // 零清账
    expect(lineageRegistry.entry(SUSPENDED)!.data.queue).toHaveLength(1) // 失败写保留
    expect(lineageRegistry.entry(SUSPENDED)!.data.saveStatus).toBe('error')
  })
})
