// @vitest-environment jsdom
/**
 * [回炉 W-B2b·第 1 项 / 处置单 R-B3「ioDirty 直接按 Q / F / error 计算」、设计稿 §2.4] IO 未落定判据
 * 必须显式包含「队列非空」——不靠相位推断。
 *
 * R-B3 修的就是相位可能不同步（在途而相位停在 clean）；同理 Q 也不应再经 saveStatus 推断。本件用
 * 非法态夹具（queue 非空而 saveStatus='clean'、inflight=null）锁定：
 * - ioUnsettled 纯函数三项并集：Q ∨ F ∨ 相位非 clean（相位项保留——既有合约 app-quit-dirty:215、
 *   workspace-switch.test:134 以只置相位的夹具锁定）；
 * - registry.ioDirty 聚合；
 * - 退出握手与课题切换的等待名单：队列里的写必须被等到并发出（旧判据下该会话不在名单内，回执 clean 而写未落库）。
 * always-active 裸 describe（K3）。
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

import { ioUnsettled, settledIoPhase } from '../../../src/renderer/features/lineage/lineage-io-phase'
import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'
import { lineageRegistry } from '../../../src/renderer/features/lineage/lineage-session-registry'
import { runQuitFlush } from '../../../src/renderer/app/quit-flush'
import { prepareWorkspaceSwitch } from '../../../src/renderer/app/workspace-switch'
import { setQuitClosing } from '../../../src/renderer/app/quit-closing-gate'
import { useNotesStore } from '../../../src/renderer/features/notes/notes.store'
import { useReaderStore } from '../../../src/renderer/features/reader/state/reader.store'
import { defaultLineTypeNames, type LineageNode } from '../../../src/shared/models/lineage'

const MAIN = '__main__'
const QUEUED = [{ kind: 'remove-edge', id: 'e-x' }] as const

function node(id: string): LineageNode {
  return { id, paperId: `paper-${id}`, title: `节点${id}`, year: 2022, x: 1, y: 1, month: 9, slot: 0, folderId: MAIN, createdAt: 't', updatedAt: 't' }
}

beforeEach(() => {
  vi.clearAllMocks()
  for (const fn of Object.values(stubApi.lineage)) fn.mockReset()
  stubApi.lineage.graph.mockResolvedValue({ ok: true, data: { nodes: [node('A')], edges: [], lineTypeNames: defaultLineTypeNames(), floatingNotes: [] } })
  stubApi.lineage.removeEdge.mockResolvedValue({ ok: true, data: { ok: true } })
  setQuitClosing(false)
  useNotesStore.getState().resetEditStateForTests()
  useReaderStore.setState({ tabs: {}, order: [], activeId: null })
  useLineageStore.setState({
    nodes: [node('A')], edges: [], floatingNotes: [], paperMetrics: {}, pubNos: {}, tagNames: {}, lineTypeNames: defaultLineTypeNames(),
    status: 'ready', error: null, saveStatus: 'clean', lastWriteError: null, queue: [], flushing: false, inflight: null,
    needsReload: false, undoStack: [], redoStack: [], unfinalized: false, editRevision: 0, folderId: MAIN
  })
})

afterEach(() => {
  setQuitClosing(false)
})

describe('ioUnsettled：Q ∨ F ∨ 相位非 clean（三项并集）', () => {
  it('队列非空而相位 clean、无在途（非法态夹具）→ 判未落定——Q 直判，不靠相位推断', () => {
    expect(ioUnsettled({ queue: [...QUEUED], inflight: null, saveStatus: 'clean' })).toBe(true)
  })

  it('其余各项仍成立：在途 F（相位 clean）为真；相位非 clean（队列为空、无在途）为真；三项皆无为假', () => {
    expect(ioUnsettled({ queue: [], inflight: { kind: 'history' }, saveStatus: 'clean' })).toBe(true) // F 直判
    expect(ioUnsettled({ queue: [], inflight: null, saveStatus: 'dirty' })).toBe(true) // 相位项保留
    expect(ioUnsettled({ queue: [], inflight: null, saveStatus: 'error' })).toBe(true)
    expect(ioUnsettled({ queue: [], inflight: null, saveStatus: 'saving' })).toBe(true)
    expect(ioUnsettled({ queue: [], inflight: null, saveStatus: 'clean' })).toBe(false)
  })

  it('settledIoPhase 不变：在途收尾后按队列得 dirty，队列空得 clean，error 保留', () => {
    expect(settledIoPhase({ queue: [...QUEUED], inflight: null, saveStatus: 'saving' })).toBe('dirty')
    expect(settledIoPhase({ queue: [], inflight: null, saveStatus: 'saving' })).toBe('clean')
    expect(settledIoPhase({ queue: [], inflight: null, saveStatus: 'error' })).toBe('error')
  })

  it('registry.ioDirty 聚合：队列非空而相位 clean 的会话计入 IO 脏', () => {
    expect(lineageRegistry.ioDirty()).toBe(false)
    useLineageStore.setState({ queue: [...QUEUED], inflight: null, saveStatus: 'clean' })
    try {
      expect(lineageRegistry.ioDirty()).toBe(true)
    } finally {
      useLineageStore.setState({ queue: [] })
    }
    expect(lineageRegistry.ioDirty()).toBe(false)
  })
})

describe('等待名单：队列里的写必须被等到并发出（相位 clean、无在途的非法态夹具）', () => {
  it('退出握手：该会话进入等待名单——队列写发出后才回执', async () => {
    useLineageStore.setState({ queue: [...QUEUED], inflight: null, saveStatus: 'clean' })
    const stillDirty = await runQuitFlush()
    expect(stubApi.lineage.removeEdge).toHaveBeenCalledTimes(1) // 旧判据：不在名单内，写未发出
    expect(stubApi.lineage.removeEdge).toHaveBeenCalledWith({ id: 'e-x' })
    expect(lineageRegistry.entry(MAIN)!.data.queue).toEqual([])
    expect(stillDirty).toBe(false)
  })

  it('课题切换：该会话进入等待名单——队列写在清史之前发出', async () => {
    useLineageStore.setState({ queue: [...QUEUED], inflight: null, saveStatus: 'clean' })
    await expect(prepareWorkspaceSwitch()).resolves.toBe(true)
    expect(stubApi.lineage.removeEdge).toHaveBeenCalledTimes(1) // 旧判据：写未发出即清史
    expect(stubApi.lineage.removeEdge).toHaveBeenCalledWith({ id: 'e-x' })
  })
})
