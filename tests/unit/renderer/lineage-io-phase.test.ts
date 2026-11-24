// @vitest-environment jsdom
/**
 * [回炉 W-B2·R-B3 / 设计稿 §2.4 IO×queue/inflight 合法态表、§2.5 #10d/#13a/#19/#20a、§2.6 10a]
 * IO 相位合法性的单会话锁定——补 P2（lineage-io-phase-quit.test.tsx）之外的相位写点：
 * - 和解读在途（flush 尾 / history 前 / 显式保存前）：F=reconcile 期间相位必须是 saving
 *   （§2.4「有在途必须为 saving」——runReconcile 起步只写 inflight 不写 saving 是同类缺口）；
 * - #19 迟到/身份不符分支：返回前收 F=0 相位，不得把相位留在 saving（回归守卫——判别力见仓外变异红证）；
 * - ioDirty=队列非空 ∨ 在途 F≠null ∨ 相位非 clean：Q/F 直判不依赖 saveStatus 与 inflight 的一致性
 *   （原缺陷形态「在途而相位停在 clean」必须判脏）；相位项保留（既有合约 app-quit-dirty
 *   「lineagePending=lineage IO（saveStatus≠clean）」）。Q 直判的判别例见
 *   lineage-io-unsettled-queue.test.ts（[回炉 W-B2b·第 1 项]）。
 * always-active 裸 describe（K3）。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub } from '../../utils/api-client-mock'
import { echoHistoryUnit } from '../../utils/lineage-history-stub'

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
  papers: { setStarred: vi.fn() }
})

import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'
import { lineageRegistry } from '../../../src/renderer/features/lineage/lineage-session-registry'
import { defaultLineTypeNames, type LineageNode } from '../../../src/shared/models/lineage'
import type { LineageGraphRes } from '../../../src/shared/ipc/schemas'
import type { LineageHistoryUnitReq } from '../../../src/shared/ipc/lineage-history.schemas'

const MAIN = '__main__'

function node(id: string, patch: Partial<LineageNode> = {}): LineageNode {
  return { id, paperId: `paper-${id}`, title: `节点${id}`, year: 2020, x: 0, y: 0, month: null, slot: null, folderId: MAIN, createdAt: 't0', updatedAt: 't0', ...patch }
}
const graphOf = (nodes: LineageNode[]): LineageGraphRes => ({ nodes, edges: [], paperMetrics: {}, pubNos: {}, tagNames: {}, lineTypeNames: defaultLineTypeNames(), floatingNotes: [] })

const state = () => useLineageStore.getState()
const entry = () => lineageRegistry.entry(MAIN)!
const settle = async (turns = 12): Promise<void> => {
  for (let i = 0; i < turns; i++) await Promise.resolve()
}
/** 挂起下一次 keyed graph 读，返回放行句柄（回 Result 信封；读发起后可调，读未发起时为 no-op） */
const holdGraphRead = (): ((g: LineageGraphRes) => void) => {
  let release: ((v: { ok: true; data: LineageGraphRes }) => void) | null = null
  stubApi.lineage.graph.mockImplementationOnce(() => new Promise((r) => { release = r }))
  return (g) => void release?.({ ok: true, data: g })
}
/** 挂起下一次 history-unit IPC，返回放行句柄（同上） */
const holdHistoryUnit = (): (() => void) => {
  let release: (() => void) | null = null
  stubApi.lineage.historyUnit.mockImplementationOnce((req: LineageHistoryUnitReq) => new Promise((r) => {
    release = async () => r(await echoHistoryUnit(req))
  }))
  return () => void release?.()
}
const inflightReconcile = { kind: 'reconcile', epoch: 0 } as const

beforeEach(() => {
  for (const fn of Object.values(stubApi.lineage)) fn.mockReset()
  stubApi.lineage.graph.mockResolvedValue(graphOf([node('A')]))
  stubApi.lineage.patchNode.mockImplementation(async (req: Partial<LineageNode>) => ({ ok: true, data: { ...node(String(req.id)), ...req, updatedAt: 'server' } as LineageNode }))
  stubApi.lineage.historyUnit.mockImplementation(echoHistoryUnit)
  useLineageStore.setState({
    nodes: [], edges: [], floatingNotes: [], lineTypeNames: defaultLineTypeNames(),
    status: 'ready', error: null, folderId: MAIN, saveStatus: 'clean', lastWriteError: null,
    queue: [], flushing: false, inflight: null, needsReload: false, invalidationEpoch: 0,
    undoStack: [], redoStack: [], unfinalized: false, editRevision: 0
  })
})

describe('和解读在途的相位（§2.6 10a「saving/F=reconcile」）', () => {
  it('history 前置和解：keyed 读在途期间 phase=saving、inflight=reconcile、ioDirty=true；落定后执行 history', async () => {
    useLineageStore.setState({ nodes: [node('A')] })
    state().moveNode('A', 10, 10)
    await state().save()
    useLineageStore.setState({ needsReload: true })
    const release = holdGraphRead()
    const undoing = state().undo()
    await settle()
    try {
      expect(stubApi.lineage.graph).toHaveBeenCalledTimes(1) // 前提：和解读在途
      expect(entry().data.inflight).toEqual(inflightReconcile)
      expect(entry().data.saveStatus, '有在途必须为 saving（§2.4）').toBe('saving')
      expect(lineageRegistry.ioDirty()).toBe(true)
      expect(stubApi.lineage.historyUnit).not.toHaveBeenCalled() // 和解落定前不发 history-unit（#13a）
    } finally {
      release(graphOf([node('A', { x: 10 })])) // 断言失败也不占链（幂等：读未发起则 no-op）
    }
    expect(await undoing).toBe(true)
    expect(entry().data.saveStatus).toBe('clean')
    expect(entry().data.inflight).toBeNull()
  })

  it('显式保存前置和解（#20a）：和解读在途期间 phase=saving', async () => {
    useLineageStore.setState({ nodes: [node('A')] })
    useLineageStore.setState({ needsReload: true })
    const release = holdGraphRead()
    const saving = state().saveActiveFolder()
    await settle()
    try {
      expect(entry().data.inflight).toEqual(inflightReconcile)
      expect(entry().data.saveStatus).toBe('saving')
    } finally {
      release(graphOf([node('A')]))
    }
    expect(await saving).toBe(true)
    expect(entry().data.saveStatus).toBe('clean')
  })

  it('flush 尾和解：写落定后的 keyed 读在途期间 phase=saving（不得停在 clean）', async () => {
    useLineageStore.setState({ nodes: [node('A')] })
    state().moveNode('A', 10, 10)
    useLineageStore.setState({ needsReload: true })
    const release = holdGraphRead()
    const saving = state().save()
    await settle()
    try {
      expect(entry().data.queue).toEqual([]) // 前提：普通写已落定、链尾和解读在途
      expect(entry().data.inflight).toEqual(inflightReconcile)
      expect(entry().data.saveStatus).toBe('saving')
      expect(lineageRegistry.ioDirty()).toBe(true)
    } finally {
      release(graphOf([node('A', { x: 10 })]))
    }
    await saving
    expect(entry().data.saveStatus).toBe('clean')
    expect(entry().data.inflight).toBeNull()
    expect(entry().data.needsReload).toBe(false)
  })

  it('和解失败收相位：error/F0（needsReload 保留）', async () => {
    useLineageStore.setState({ nodes: [node('A')] })
    useLineageStore.setState({ needsReload: true })
    stubApi.lineage.graph.mockResolvedValueOnce({ ok: false, error: { code: 'DB_ERROR', message: '图读失败' } })
    expect(await state().saveActiveFolder()).toBe(false)
    expect(entry().data.saveStatus).toBe('error')
    expect(entry().data.inflight).toBeNull()
    expect(entry().data.needsReload).toBe(true)
  })
})

describe('#19 迟到/身份不符分支收相位（回归守卫）', () => {
  it('history 在途期间会话就地换代：迟到回显不写图态、不移栈，相位不滞留 saving', async () => {
    useLineageStore.setState({ nodes: [node('A')] })
    state().moveNode('A', 10, 10)
    const releaseUnit = holdHistoryUnit()
    const undoing = state().undo()
    await settle()
    try {
      expect(entry().data.inflight?.kind).toBe('history') // 前提：history 在途
      lineageRegistry.update(MAIN, { sessionGeneration: entry().data.sessionGeneration + 1 }) // 就地换代（身份键不符）
    } finally {
      releaseUnit()
    }
    expect(await undoing).toBe(false)
    expect(entry().data.nodes[0]).toMatchObject({ id: 'A', x: 10, y: 10 }) // 回显未应用
    expect(entry().data.undoStack).toHaveLength(1) // 未弹栈
    expect(entry().data.inflight).toBeNull()
    expect(entry().data.saveStatus, 'F=0 不得停留在 saving（§2.4）').not.toBe('saving')
    expect(['clean', 'dirty']).toContain(entry().data.saveStatus) // Q0→idle
    expect(lineageRegistry.ioDirty()).toBe(false)
  })

  it('响应身份键不符（unitId 错配）：不移栈、相位回 clean', async () => {
    useLineageStore.setState({ nodes: [node('A')] })
    state().moveNode('A', 10, 10)
    stubApi.lineage.historyUnit.mockImplementationOnce(async (req: LineageHistoryUnitReq) => ({ ok: true as const, data: { ...(await echoHistoryUnit(req)).data, unitId: 'unit-late' } }))
    expect(await state().undo()).toBe(false)
    expect(entry().data.undoStack).toHaveLength(1)
    expect(entry().data.saveStatus).toBe('clean')
    expect(entry().data.inflight).toBeNull()
  })
})

describe('ioDirty：队列非空 ∨ 在途 F≠null ∨ 相位非 clean', () => {
  it('任一会话 inflight 非空即 IO 脏——不依赖 saveStatus 是否同步成 saving', () => {
    expect(lineageRegistry.ioDirty()).toBe(false)
    useLineageStore.setState({ inflight: { kind: 'history', unitId: 'u', direction: 'undo' }, saveStatus: 'clean' }) // 相位未同步的非法组合（R-B3 原缺陷形态）
    try {
      expect(lineageRegistry.ioDirty(), 'F≠null 即未落定').toBe(true)
    } finally {
      useLineageStore.setState({ inflight: null })
    }
    expect(lineageRegistry.ioDirty()).toBe(false)
  })

  it('error/Q0 会话计入 IO 脏；dirty 与 saving 相位计入（相位口径保留）；clean/Q0/F0 为净', () => {
    useLineageStore.setState({ saveStatus: 'error', queue: [] })
    expect(lineageRegistry.ioDirty()).toBe(true)
    useLineageStore.setState({ saveStatus: 'dirty', queue: [{ kind: 'remove-edge', id: 'e-x' }] })
    expect(lineageRegistry.ioDirty()).toBe(true)
    useLineageStore.setState({ saveStatus: 'saving', flushing: true, queue: [], inflight: { kind: 'write' } })
    expect(lineageRegistry.ioDirty()).toBe(true)
    useLineageStore.setState({ saveStatus: 'clean', flushing: false, queue: [], inflight: null })
    expect(lineageRegistry.ioDirty()).toBe(false)
  })
})
