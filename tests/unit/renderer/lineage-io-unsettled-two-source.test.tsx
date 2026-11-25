// @vitest-environment jsdom
/**
 * [B5 设计稿 §7 C2=B ioUnsettled 两源语义、§2.5 Q×F×phase 全表、§7.3 完整测试迁移清单的新增判别例；§15.1 步骤 2 状态红测先行]
 * 断言 ioUnsettled(session)=queue.length>0 ∨ inflight!==null 的目标语义：Q0/F0 的 error 只保留可见告警
 * 与重试，不单独构成退出 dirty / lineagePending / 等待名单成员（现状实现未满足=红；实现波落地后转绿）。
 *
 * 归属说明：
 * - §7.3「必须红后绿、修改既有断言」的 8 个既有文件（lineage-io-unsettled-queue、app-quit-dirty:215、
 *   workspace-switch:134、quit-flush、lineage-io-phase:197、lineage-io-phase-quit、lineage-history-unit、
 *   lineage-conflict.spec）本波零改——修改既有断言须主控裁决；本件只承载新增判别例与纯函数全表。
 * - e2e 面（真实 CONFLICT/Q0 后结构写互斥信号释放＋Q1 负对照，B5-E08）归后续波。
 *
 * always-active 裸 describe（K3）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
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
    historyUnit: vi.fn()
  }
})

import { ioUnsettled, settledIoPhase } from '../../../src/renderer/features/lineage/lineage-io-phase'
import { useSaveAggregates } from '../../../src/renderer/app/use-save-aggregates'
import { prepareWorkspaceSwitch } from '../../../src/renderer/app/workspace-switch'
import { runQuitFlush } from '../../../src/renderer/app/quit-flush'
import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'
import { lineageRegistry } from '../../../src/renderer/features/lineage/lineage-session-registry'
import { useNotesStore } from '../../../src/renderer/features/notes/notes.store'
import { useReaderStore } from '../../../src/renderer/features/reader/state/reader.store'
import { resetLineageSessionsForTests } from './lineage-test-session-reset'
import { echoHistoryUnit } from '../../utils/lineage-history-stub'
import { defaultLineTypeNames, type LineageNode } from '../../../src/shared/models/lineage'
import type { WriteAction } from '../../../src/shared/recovery/schemas'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

const MAIN = '__main__'
const B = 'f-b'
const QUEUED: WriteAction[] = [{ kind: 'remove-edge', id: 'e-x' }]

function node(id: string): LineageNode {
  return { id, paperId: `paper-${id}`, title: `节点${id}`, year: 2022, x: null, y: null, month: 9, slot: 0, folderId: MAIN, createdAt: 't', updatedAt: 't' }
}
const state = () => useLineageStore.getState()
const entry = () => lineageRegistry.entry(MAIN)!
const settle = async (turns = 12): Promise<void> => {
  for (let i = 0; i < turns; i++) await Promise.resolve()
}

let root: Root | null = null
let host: HTMLDivElement | null = null
/** 挂聚合探针：返回 useSaveAggregates 现值读点（app-quit-dirty 同型） */
function mountProbe(): () => ReturnType<typeof useSaveAggregates> {
  let value: ReturnType<typeof useSaveAggregates> | null = null
  function Probe(): JSX.Element {
    value = useSaveAggregates()
    return <span />
  }
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root!.render(<Probe />)
  })
  return () => value!
}

/** 探针在场时的 store 写：包在 act 内——否则订阅组件不重渲染，读点陈旧（假绿） */
const setStore = (patch: Partial<ReturnType<typeof useLineageStore.getState>>): void => {
  act(() => {
    useLineageStore.setState(patch)
  })
}
/** 活动会话置 Q0/F0 的 error（告警可见、无实际待写） */
const implantSettledError = (): void => {
  useLineageStore.setState({ saveStatus: 'error', lastWriteError: '历史栈未变化', queue: [], flushing: false, inflight: null })
}

beforeEach(() => {
  vi.clearAllMocks()
  for (const fn of Object.values(stubApi.lineage)) fn.mockReset()
  stubApi.lineage.graph.mockResolvedValue({ ok: true, data: { nodes: [node('A')], edges: [], lineTypeNames: defaultLineTypeNames(), floatingNotes: [] } })
  stubApi.lineage.patchNode.mockImplementation(async (req: Partial<LineageNode>) =>
    ({ ok: true, data: { ...node(String(req.id ?? 'X')), ...req, updatedAt: 'server' } as LineageNode }))
  stubApi.lineage.removeEdge.mockResolvedValue({ ok: true, data: { ok: true } })
  stubApi.lineage.historyUnit.mockImplementation(echoHistoryUnit)
  useNotesStore.getState().resetEditStateForTests()
  useReaderStore.setState({ tabs: {}, order: [], activeId: null })
  resetLineageSessionsForTests()
  useLineageStore.setState({
    nodes: [node('A')], edges: [], floatingNotes: [], paperMetrics: {}, pubNos: {}, tagNames: {}, lineTypeNames: defaultLineTypeNames(),
    status: 'ready', error: null, saveStatus: 'clean', lastWriteError: null, queue: [], flushing: false, inflight: null,
    needsReload: false, undoStack: [], redoStack: [], unfinalized: false, editRevision: 0, folderId: MAIN
  })
})

afterEach(async () => {
  await act(async () => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
  resetLineageSessionsForTests() // 被侦听的 lane 随会话一并清出——侦听不跨例
})

describe('纯函数 ioUnsettled=Q∨F（§2.5 Q×F×phase 全表）', () => {
  it('Q0/F0/clean：全净=false', () => {
    expect(ioUnsettled({ queue: [], inflight: null, saveStatus: 'clean' })).toBe(false)
  })

  it.each(['dirty', 'saving', 'error'] as const)('Q0/F0/%s：相位不再独立构成未落定=false（error=合法失败呈现）', (saveStatus) => {
    expect(ioUnsettled({ queue: [], inflight: null, saveStatus }), `Q0/F0/${saveStatus}`).toBe(false)
  })

  it('Q≥1（普通写失败队首保留，相位 error）：仍=true——仍锁退出与结构写', () => {
    expect(ioUnsettled({ queue: [...QUEUED], inflight: null, saveStatus: 'error' })).toBe(true)
    expect(ioUnsettled({ queue: [...QUEUED], inflight: { kind: 'write' }, saveStatus: 'saving' })).toBe(true)
  })

  it('Q0/F≥1（history 在途；相位错停 clean）：直判 F=true', () => {
    expect(ioUnsettled({ queue: [], inflight: { kind: 'history', unitId: 'u', direction: 'undo' }, saveStatus: 'clean' })).toBe(true)
    expect(ioUnsettled({ queue: [], inflight: { kind: 'reconcile', epoch: 0 }, saveStatus: 'clean' })).toBe(true)
  })

  it('settledIoPhase 不变：按 Q 得 dirty/clean，error 保留', () => {
    expect(settledIoPhase({ queue: [...QUEUED], inflight: null, saveStatus: 'saving' })).toBe('dirty')
    expect(settledIoPhase({ queue: [], inflight: null, saveStatus: 'saving' })).toBe('clean')
    expect(settledIoPhase({ queue: [], inflight: null, saveStatus: 'error' })).toBe('error')
  })
})

describe('registry.ioDirty 聚合（全 registry 两源）', () => {
  it('活动会话 Q0/F0 error：ioDirty=false（错误可见性≠仍有待写）', () => {
    expect(lineageRegistry.ioDirty()).toBe(false)
    implantSettledError()
    try {
      expect(lineageRegistry.ioDirty(), 'Q0/F0 error 不构成未落定').toBe(false)
    } finally {
      useLineageStore.setState({ saveStatus: 'clean', lastWriteError: null })
    }
  })

  it('挂起会话 Q0/F0 error：ioDirty=false；活动会话全程 clean', () => {
    lineageRegistry.ensure(B)
    lineageRegistry.update(B, { nodes: [{ ...node('B1'), folderId: B }], status: 'ready', saveStatus: 'error', lastWriteError: '历史栈未变化', queue: [], inflight: null })
    expect(entry().data.saveStatus).toBe('clean') // 前提
    expect(lineageRegistry.ioDirty(), '挂起会话的 Q0/F0 error 不构成未落定').toBe(false)
  })

  it('普通写失败 Q≥1（队首保留）：ioDirty=true（既有拦截不变）', () => {
    useLineageStore.setState({ saveStatus: 'error', lastWriteError: '写入失败', queue: [...QUEUED] })
    expect(lineageRegistry.ioDirty()).toBe(true)
  })
})

describe('App 聚合 useSaveAggregates：quitDirty 的 lineage 部分与 lineagePending 分列两源', () => {
  it('活动会话 Q0/F0 error：lineagePending=false（不再连带锁结构写）、quitDirty=false', () => {
    const read = mountProbe()
    expect(read()).toEqual({ quitDirty: false, readerUnfinalized: false, lineageUnfinalized: false, lineagePending: false }) // 前提：全净
    setStore({ saveStatus: 'error', lastWriteError: '历史栈未变化', queue: [], flushing: false, inflight: null })
    expect(entry().data.saveStatus, '前提：error 已落定').toBe('error')
    expect(read().lineagePending, 'INV-91：Q0/F0 error 不互斥结构写').toBe(false)
    expect(read().quitDirty, 'INV-22：Q0/F0 error 不卡退出').toBe(false)
  })

  it('挂起会话 Q0/F0 error：两假', () => {
    const read = mountProbe()
    expect(read().lineagePending, '前提：建立会话前两假').toBe(false)
    act(() => {
      lineageRegistry.ensure(B)
      lineageRegistry.update(B, { nodes: [{ ...node('B1'), folderId: B }], status: 'ready', saveStatus: 'error', lastWriteError: '历史栈未变化', queue: [], inflight: null })
    })
    expect(lineageRegistry.entry(B)!.data.saveStatus, '前提：挂起会话 error 落定').toBe('error')
    expect([read().quitDirty, read().lineagePending], '挂起会话的 Q0/F0 error 两假').toEqual([false, false])
  })

  it('普通写失败 Q≥1：两真（既有拦截不变）', () => {
    const read = mountProbe()
    expect(read().lineagePending, '前提：置待写前两假').toBe(false)
    setStore({ saveStatus: 'error', lastWriteError: '写入失败', queue: [...QUEUED] })
    expect([read().quitDirty, read().lineagePending], 'Q≥1 仍两真').toEqual([true, true])
  })
})

describe('退出握手 runQuitFlush：等待名单与 stillDirty 按两源', () => {
  it('history 零写失败落定后：stillDirty=false；该会话不进等待名单；告警与两栈保留', async () => {
    state().moveNode('A', 10, 10)
    await state().save()
    await state().undo() // redo=1
    const redoBefore = state().redoStack
    stubApi.lineage.historyUnit.mockResolvedValueOnce({ ok: false, error: { code: 'DB_ERROR', message: '重做事务失败' } })
    expect(await state().redo()).toBe(false)
    expect([state().saveStatus, state().queue.length, state().inflight], '前提：Q0/F0 error').toEqual(['error', 0, null])
    const saveSpy = vi.spyOn(lineageRegistry.lane(MAIN), 'save')
    expect(await runQuitFlush(), 'Q0/F0 history error→stillDirty=false').toBe(false)
    expect(saveSpy, 'Q0/F0 error 不进退出等待名单').not.toHaveBeenCalled()
    expect([state().saveStatus, state().lastWriteError], '告警保留——不得伪称把失败历史写再次落库').toEqual(['error', '重做事务失败'])
    expect(state().redoStack, '两栈不动').toBe(redoBefore)
  })

  it('普通写失败 Q≥1：写被等到并发出；仍失败则 stillDirty=true（既有拦截不变）', async () => {
    useLineageStore.setState({ queue: [...QUEUED], saveStatus: 'dirty' })
    stubApi.lineage.removeEdge.mockResolvedValue({ ok: false, error: { code: 'DB_ERROR', message: '落库失败' } })
    expect(await runQuitFlush()).toBe(true)
    expect(stubApi.lineage.removeEdge).toHaveBeenCalledTimes(1)
    expect(state().queue).toHaveLength(1) // 失败写保留
  })
})

describe('课题切换 prepareWorkspaceSwitch：等待名单按两源（清史时机不变）', () => {
  it('Q0/F0 error：不进等待名单、不中止切换；成功后既有 reset 清内存错误', async () => {
    implantSettledError()
    const saveSpy = vi.spyOn(lineageRegistry.lane(MAIN), 'save')
    await expect(prepareWorkspaceSwitch()).resolves.toBe(true)
    expect(saveSpy, 'Q0/F0 error 不进课题等待名单').not.toHaveBeenCalled()
    expect([state().saveStatus, state().lastWriteError], '成功切换后的全域 reset 清内存错误').toEqual(['clean', null])
  })

  it('普通写失败 Q≥1：切换中止（留旧课题，失败写保留）', async () => {
    useLineageStore.setState({ queue: [...QUEUED], saveStatus: 'dirty', lastWriteError: null })
    stubApi.lineage.removeEdge.mockResolvedValue({ ok: false, error: { code: 'DB_ERROR', message: '落库失败' } })
    await expect(prepareWorkspaceSwitch()).resolves.toBe(false)
    expect(state().queue).toHaveLength(1)
    expect(state().lastWriteError).toBe('落库失败')
  })
})

describe('Q0/F0 的 reconcile / finalize 冲突尾：同一两源语义（不设「除 history 外仍算脏」例外）', () => {
  it('前置和解失败落定（Q0/F0 error）：告警可见、ioUnsettled=false、聚合两假', async () => {
    const read = mountProbe()
    useLineageStore.setState({ needsReload: true })
    stubApi.lineage.graph.mockResolvedValue({ ok: false, error: { code: 'DB_ERROR', message: '图读失败' } })
    await act(async () => {
      expect(await state().saveActiveFolder()).toBe(false)
      await settle()
    })
    expect([state().saveStatus, state().queue.length, state().inflight], '前提：Q0/F0 error').toEqual(['error', 0, null])
    expect(state().lastWriteError, '前提：告警可见').toBe('图读失败')
    expect(ioUnsettled(entry().data), 'reconcile 尾的 Q0/F0 error 同口径').toBe(false)
    expect([read().quitDirty, read().lineagePending]).toEqual([false, false])
  })

  it('finalize CONFLICT 尾（Q0/F0 error）：ioUnsettled=false、stillDirty=false', async () => {
    useLineageStore.setState({
      nodes: [node('A'), node('B')],
      queue: [{ kind: 'upsert-edge', input: { id: 'e-x', fromNode: 'A', toNode: 'B', label: '', via: null }, isNew: true }],
      saveStatus: 'dirty'
    })
    stubApi.lineage.upsertEdge.mockResolvedValue({ ok: false, error: { code: 'CONFLICT', message: '该逻辑线已存在（A→B），重复边被拒绝' } })
    expect(await state().saveActiveFolder()).toBe(false)
    expect([state().saveStatus, state().queue.length, state().inflight], '前提：Q0/F0 error').toEqual(['error', 0, null])
    expect(ioUnsettled(entry().data), 'finalize 冲突尾的 Q0/F0 error 同口径').toBe(false)
    expect(await runQuitFlush()).toBe(false)
  })
})
