// @vitest-environment jsdom
/**
 * [回炉 W-B3·R-B7 / 设计稿 §2.6 #10d、#13c、#20c、#34d、#10a；处置单 R-B7＝用户裁决 D-2 甲；
 * design-inventory 表 2] 和解读被丢后的链尾续拉（原缺陷：flush 尾忽略 reconcile 返回值、
 * finalize 与 history 前遇 'dropped' 直接判失败——一次竞态下保存/撤销无报错结束，需再点一次）。
 *
 * 被丢的构造：和解读在途时经 gate 旁路（恢复载入/后台事件路径——saving 期可达）直注待写，
 * 读到达时应用判据 Q0 不成立→'dropped'（四面未变、位保留）。续拉＝链在 drain 新 Q 之后按
 * 当前 epoch 重新单飞（lineage-reconcile-tail；上界含首次和解）。
 *
 * 覆盖：flush 尾／finalize 前／history 前三处调用点的被丢→续拉成功、续拉仍被丢（上界）、
 * 续拉前新写失败；孤儿会话停止；和解失败不续拉（对照）。flush 尾的恢复会话形见
 * lineage-recovery-authority.test.ts T8（翻转后）。always-active。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
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
import { lineageRegistry } from '../../../src/renderer/features/lineage/lineage-session-registry'
import { resetLineageSessionsForTests } from './lineage-test-session-reset'
import { echoHistoryUnit } from '../../utils/lineage-history-stub'
import { defaultLineTypeNames, type FloatingNote, type LineageEdge, type LineageNode } from '../../../src/shared/models/lineage'
import type { LineageHistoryUnitReq } from '../../../src/shared/ipc/lineage-history.schemas'
import type { LineageRecoveryPayload } from '../../../src/shared/recovery/schemas'

function node(id: string, over: Partial<LineageNode> = {}): LineageNode {
  return {
    id,
    paperId: `paper-${id}`,
    title: `节点${id}`,
    year: 2022,
    x: 0,
    y: 0,
    month: 9,
    slot: 0,
    folderId: '__main__',
    createdAt: 't0',
    updatedAt: 't0',
    ...over
  }
}

type GraphResult ={ ok: true; data: Record<string, unknown> } | { ok: false; error: { code: string; message: string } }
/** 库态回包（graph 单读形——四面+派生三面空集） */
function graphOk(nodes: LineageNode[]): GraphResult {
  return {
    ok: true,
    data: { nodes, edges: [], paperMetrics: {}, pubNos: {}, tagNames: {}, lineTypeNames: defaultLineTypeNames(), floatingNotes: [] }
  }
}
const dbFailure = (): GraphResult => ({ ok: false, error: { code: 'DB_ERROR', message: '图读失败' } })

/** graph 桩脚本：按序消费，每项=一次 keyed 读的回包工厂；耗尽后回 dbNodes() */
const script: Array<() => Promise<GraphResult>> = []
let dbNodes: () => LineageNode[] = () => []

function defer(): { promise: Promise<GraphResult>; resolve: (v: GraphResult) => void } {
  let resolve!: (v: GraphResult) => void
  const promise = new Promise<GraphResult>((res) => {
    resolve = res
  })
  return { promise, resolve }
}
/** 预排一次挂起的 keyed 读（读发起时才 await——用于把某一次和解读挂在在途） */
function pendingRead(): { resolve: (v: GraphResult) => void } {
  const d = defer()
  script.push(() => d.promise)
  return d
}

const loadSpy = stubApi.lineage.graph
const patchSpy = stubApi.lineage.patchNode
const unitSpy = stubApi.lineage.historyUnit
const state = () => useLineageStore.getState()
const settle = async (turns = 14): Promise<void> => {
  for (let i = 0; i < turns; i++) await Promise.resolve()
}
const unitCalls = (): LineageHistoryUnitReq[] => unitSpy.mock.calls.map((c) => c[0] as LineageHistoryUnitReq)
const undoIds = (): string[] => state().undoStack.map((e) => e.id)
const redoIds = (): string[] => state().redoStack.map((e) => e.id)

/** gate 旁路直注待写（恢复载入/后台事件路径——不经编辑闸，saving 期可达） */
const bypass = (x: number, y: number): void => {
  useLineageStore.setState({ queue: [{ kind: 'patch-node', id: 'A', patch: { x, y } }] })
}
/** 旁路项落库失败（系统型） */
const failPatch = (message: string): void => {
  patchSpy.mockResolvedValue({ ok: false, error: { code: 'DB_ERROR', message } })
}

/** 链尾续拉上界（含首次和解）——lineage-reconcile-tail RECONCILE_TAIL_MAX_ROUNDS 的契约值（design-inventory §2.3） */
const TAIL_MAX_ROUNDS = 3

/** 两单元夹具：move→save→undo（undo=0、redo=1、U=1、IO clean），随后置位 */
async function editedThenUndone(): Promise<string> {
  useLineageStore.setState({ nodes: [node('A')] })
  state().moveNode('A', 10, 10)
  await state().save()
  const entryId = state().undoStack[0]!.id
  expect(await state().undo()).toBe(true)
  expect(undoIds()).toEqual([])
  expect(redoIds()).toEqual([entryId])
  expect(state().unfinalized).toBe(true)
  useLineageStore.setState({ needsReload: true })
  return entryId
}

beforeEach(() => {
  resetLineageSessionsForTests() // 跨用例不复用旧会话
  for (const fn of Object.values(stubApi.lineage)) fn.mockReset()
  script.length = 0
  dbNodes = () => []
  loadSpy.mockImplementation(() => (script.length > 0 ? script.shift()!() : Promise.resolve(graphOk(dbNodes()))))
  patchSpy.mockImplementation(async (req: Partial<LineageNode>) => ({ ok: true, data: { ...node(String(req.id)), ...req } }))
  unitSpy.mockImplementation(echoHistoryUnit)
  useLineageStore.setState({
    nodes: [node('A')],
    edges: [],
    floatingNotes: [],
    status: 'ready',
    error: null,
    inflight: null,
    folderId: '__main__',
    saveStatus: 'clean',
    lastWriteError: null,
    queue: [],
    flushing: false,
    needsReload: false,
    undoStack: [],
    redoStack: [],
    unfinalized: false,
    editRevision: 0
  })
})

describe('flush 尾（save()＝IO 收口）：被丢→drain 新 Q→按当前 epoch 续拉', () => {
  it('首读在途被 gate 旁路注入待写→在途读被丢→链尾 drain 旁路项后续拉恰一次→落地清位（无需再次 save）', async () => {
    dbNodes = () => [node('A', { x: 9, y: 9 })]
    useLineageStore.setState({ nodes: [node('A')], needsReload: true })
    const first = pendingRead()
    const second = pendingRead()
    const saving = state().save()
    await settle()
    expect(loadSpy).toHaveBeenCalledTimes(1) // 首读在途
    bypass(9, 9)
    first.resolve(graphOk([node('A')])) // 在途读的快照早于旁路写：应用判据 Q>0→被丢
    await settle()
    expect(loadSpy).toHaveBeenCalledTimes(2) // 链尾续拉恰一次（第二读在途）
    expect(patchSpy).toHaveBeenCalledTimes(1) // 旁路项已 drain
    expect(loadSpy.mock.invocationCallOrder[0]!).toBeLessThan(patchSpy.mock.invocationCallOrder[0]!) // 序：读#1→drain
    expect(patchSpy.mock.invocationCallOrder[0]!).toBeLessThan(loadSpy.mock.invocationCallOrder[1]!) // 序：drain→续读
    expect(state().queue).toHaveLength(0)
    expect(state().needsReload).toBe(true) // 续读在途——位未清
    expect(state().saveStatus).toBe('saving') // 在途必须 saving（§2.4）
    expect(state().inflight?.kind).toBe('reconcile')
    expect(lineageRegistry.entry('__main__')?.inflightGraph).not.toBeNull() // 续读=会话唯一在途单飞句柄
    second.resolve(graphOk([node('A', { x: 9, y: 9 })]))
    await saving
    expect(state().needsReload).toBe(false)
    expect(state().nodes[0]?.x).toBe(9) // 图＝库态
    expect(state().nodes[0]?.y).toBe(9)
    expect(loadSpy).toHaveBeenCalledTimes(2)
    expect(patchSpy).toHaveBeenCalledTimes(1)
    expect(state().saveStatus).toBe('clean')
    expect(state().inflight).toBeNull()
  })

  it('续拉前新写系统型失败：error 态、失败写保留、位保留、不再发读（#9 与 #10d 的交界）', async () => {
    useLineageStore.setState({ nodes: [node('A')], needsReload: true })
    const first = pendingRead()
    const saving = state().save()
    await settle()
    expect(loadSpy).toHaveBeenCalledTimes(1)
    failPatch('写入失败')
    bypass(9, 9)
    first.resolve(graphOk([node('A')]))
    await saving
    expect(loadSpy).toHaveBeenCalledTimes(1) // 新写失败后不再续拉
    expect(patchSpy).toHaveBeenCalledTimes(1)
    expect(state().saveStatus).toBe('error')
    expect(state().lastWriteError).toBe('写入失败')
    expect(state().queue).toHaveLength(1) // 失败写保留（可重试）
    expect(state().needsReload).toBe(true)
  })

  it('上界：每次读在途都有新注入——连续被丢达上界后停止，位保留，写链让出（不无限循环）；下一次命令入链续拉清位', async () => {
    useLineageStore.setState({ nodes: [node('A')], needsReload: true })
    const flights = [pendingRead(), pendingRead(), pendingRead()]
    const saving = state().save()
    await settle()
    expect(loadSpy).toHaveBeenCalledTimes(1)
    for (let round = 1; round <= TAIL_MAX_ROUNDS; round++) {
      bypass(round, round) // 本次读在途注入→该读被丢
      flights[round - 1]!.resolve(graphOk([node('A')]))
      await settle()
      expect(loadSpy).toHaveBeenCalledTimes(Math.min(round + 1, TAIL_MAX_ROUNDS)) // 上界后不再发读
    }
    await saving
    expect(loadSpy).toHaveBeenCalledTimes(TAIL_MAX_ROUNDS)
    expect(patchSpy).toHaveBeenCalledTimes(TAIL_MAX_ROUNDS - 1) // 前两轮被丢后各 drain 一次；第 3 轮被丢即达上界
    expect(state().queue).toHaveLength(1) // 达上界那一轮在途注入的待写留存（不丢）
    expect(state().needsReload).toBe(true) // 位保留——下一次命令入链续拉（#10a）
    expect(state().saveStatus).toBe('dirty') // F=0 相位按 Q
    expect(state().inflight).toBeNull()
    expect(state().flushing).toBe(false)
    await state().save() // 下一次命令：drain 留存待写→和解→清位
    expect(patchSpy).toHaveBeenCalledTimes(TAIL_MAX_ROUNDS)
    expect(state().queue).toHaveLength(0)
    expect(state().needsReload).toBe(false)
    expect(loadSpy).toHaveBeenCalledTimes(TAIL_MAX_ROUNDS + 1)
  })

  it('孤儿会话：首读在途时会话被恢复替换→被丢后续拉停止——不再发读、不派发旧会话的待写；新会话的位与恢复待令标记不动', async () => {
    dbNodes = () => [node('R')]
    useLineageStore.setState({ nodes: [node('A')], needsReload: true })
    const old = lineageRegistry.entry('__main__')!
    const first = pendingRead()
    const saving = state().save()
    await settle()
    expect(loadSpy).toHaveBeenCalledTimes(1)
    bypass(9, 9) // 旁路待写落在当时的活动会话
    state().applyRecoverySession({
      // 首读在途时会话被恢复替换——旧链成孤儿
      folderId: '__main__',
      graph: { nodes: [node('R')], edges: [] as LineageEdge[], lineTypeNames: defaultLineTypeNames(), floatingNotes: [] as FloatingNote[] },
      queue: [],
      draft: null
    } satisfies LineageRecoveryPayload)
    const generation = state().sessionGeneration
    first.resolve(graphOk([node('A')])) // 旧读到达：孤儿会话不准入→被丢
    await saving
    expect(lineageRegistry.isAlive(old)).toBe(false)
    expect(loadSpy).toHaveBeenCalledTimes(1) // 孤儿：不再发 keyed 读
    expect(patchSpy).not.toHaveBeenCalled() // 旧会话的待写不被派发（续拉在 drain 之前停止）
    expect(old.data.queue).toHaveLength(1)
    // 新会话不受旧链收尾影响：图、代际、位、恢复待令标记均为载入时的值
    expect(state().nodes.map((n) => n.id)).toEqual(['R'])
    expect(state().sessionGeneration).toBe(generation)
    expect(state().needsReload).toBe(true)
    expect(state().restoredAwaitingCommand).toBe(true)
  })

  it('对照（#10c）：和解读失败＝error+位保留、零续拉——重试留给下一次命令', async () => {
    script.push(async () => dbFailure())
    useLineageStore.setState({ nodes: [node('A')], needsReload: true })
    await state().save()
    expect(loadSpy).toHaveBeenCalledTimes(1)
    expect(state().saveStatus).toBe('error')
    expect(state().lastWriteError).toBe('图读失败')
    expect(state().needsReload).toBe(true)
  })
})

describe('finalize 前（saveActiveFolder）：和解先行，被丢→续拉成功后才清账（#20c）', () => {
  it('被丢→drain 旁路项→续拉成功→定稿：redo/U 清；旁路写已落库', async () => {
    dbNodes = () => [node('A', { x: 7, y: 7 })]
    await editedThenUndone()
    const first = pendingRead() // 续拉读落在 dbNodes（脚本耗尽）
    const saving = state().saveActiveFolder()
    await settle()
    expect(loadSpy).toHaveBeenCalledTimes(1)
    expect(state().inflight?.kind).toBe('reconcile')
    bypass(7, 7)
    first.resolve(graphOk([node('A')]))
    expect(await saving).toBe(true) // 续拉成功后才定稿
    expect(loadSpy).toHaveBeenCalledTimes(2)
    expect(patchSpy).toHaveBeenCalledTimes(2) // 原编辑 1＋旁路项 1
    expect(state().needsReload).toBe(false)
    expect(state().redoStack).toHaveLength(0) // #21/#22：续拉成功后才清 redo
    expect(state().unfinalized).toBe(false)
    expect(state().nodes[0]?.x).toBe(7)
    expect(state().saveStatus).toBe('clean')
  })

  it('续拉仍被丢（达上界）→不定稿：redo/U 保留、位保留', async () => {
    await editedThenUndone()
    const flights = [pendingRead(), pendingRead(), pendingRead()]
    const saving = state().saveActiveFolder()
    await settle()
    for (let round = 1; round <= TAIL_MAX_ROUNDS; round++) {
      bypass(round, round)
      flights[round - 1]!.resolve(graphOk([node('A')]))
      await settle()
    }
    expect(await saving).toBe(false) // 续拉仍未应用——不按未和解图清 redo/U
    expect(loadSpy).toHaveBeenCalledTimes(TAIL_MAX_ROUNDS)
    expect(patchSpy).toHaveBeenCalledTimes(TAIL_MAX_ROUNDS) // 原编辑 1＋前两轮被丢后各 drain 1；第 3 轮被丢即达上界
    expect(state().queue).toHaveLength(1) // 达上界那一轮在途注入的待写留存
    expect(state().redoStack).toHaveLength(1)
    expect(state().unfinalized).toBe(true)
    expect(state().needsReload).toBe(true)
    expect(state().saveStatus).toBe('dirty')
  })

  it('续拉前 drain 遇 CONFLICT 丢弃：续拉成功后本次 finalize 仍记失败（#10）——error 可见、redo/U 保留', async () => {
    await editedThenUndone()
    stubApi.lineage.upsertEdge.mockResolvedValue({ ok: false, error: { code: 'CONFLICT', message: '该逻辑线已存在（A→A），重复边被拒绝' } })
    const first = pendingRead() // 续拉读落在 dbNodes（脚本耗尽）
    const saving = state().saveActiveFolder()
    await settle()
    expect(loadSpy).toHaveBeenCalledTimes(1)
    // gate 旁路注入一条将被服务器拒绝的动作（画线 A→A）
    useLineageStore.setState({
      queue: [{ kind: 'upsert-edge', input: { id: 'e-x', fromNode: 'A', toNode: 'A', label: '', via: null }, isNew: true }],
      saveStatus: 'dirty'
    })
    first.resolve(graphOk([node('A')]))
    expect(await saving).toBe(false) // 续拉成功，但本次 finalize 有一项被拒——记失败（不报「已保存」）
    expect(loadSpy).toHaveBeenCalledTimes(2)
    expect(stubApi.lineage.upsertEdge).toHaveBeenCalledTimes(1) // 旁路项已派发并被拒
    expect(state().queue).toHaveLength(0)
    expect(state().needsReload).toBe(false) // 续拉已应用
    expect(state().saveStatus).toBe('error')
    expect(state().lastWriteError).toBe('该逻辑线已存在（A→A），重复边被拒绝')
    expect(state().redoStack).toHaveLength(1)
    expect(state().unfinalized).toBe(true)
  })

  it('续拉前新写失败→不定稿：error 可见、失败写保留、redo/U 保留', async () => {
    await editedThenUndone()
    const first = pendingRead()
    const saving = state().saveActiveFolder()
    await settle()
    failPatch('落库失败')
    bypass(7, 7)
    first.resolve(graphOk([node('A')]))
    expect(await saving).toBe(false)
    expect(loadSpy).toHaveBeenCalledTimes(1)
    expect(state().saveStatus).toBe('error')
    expect(state().lastWriteError).toBe('落库失败')
    expect(state().queue).toHaveLength(1)
    expect(state().redoStack).toHaveLength(1)
    expect(state().unfinalized).toBe(true)
    expect(state().needsReload).toBe(true)
  })
})

describe('history 前（undo）：和解先行，被丢→续拉成功后才执行 history-unit（#13c）', () => {
  /** 单单元夹具：move→save（undo=1、U=1、IO clean），随后置位 */
  async function edited(): Promise<string> {
    useLineageStore.setState({ nodes: [node('A')] })
    state().moveNode('A', 10, 10)
    await state().save()
    const entryId = state().undoStack[0]!.id
    expect(undoIds()).toEqual([entryId])
    useLineageStore.setState({ needsReload: true })
    return entryId
  }

  it('被丢→drain 旁路项→续拉成功→执行 history-unit（续读先于 unit）；移栈的正是栈顶历史项', async () => {
    dbNodes = () => [node('A', { x: 20, y: 20 })]
    const entryId = await edited()
    const first = pendingRead()
    const second = pendingRead()
    const undone = state().undo()
    await settle()
    expect(loadSpy).toHaveBeenCalledTimes(1)
    expect(unitCalls()).toHaveLength(0)
    bypass(20, 20)
    first.resolve(graphOk([node('A', { x: 10, y: 10 })]))
    await settle()
    expect(loadSpy).toHaveBeenCalledTimes(2)
    expect(unitCalls()).toHaveLength(0) // 续读在途——history-unit 未发
    expect(patchSpy).toHaveBeenCalledTimes(2)
    second.resolve(graphOk([node('A', { x: 20, y: 20 })]))
    expect(await undone).toBe(true)
    expect(unitCalls()).toHaveLength(1)
    expect(loadSpy.mock.invocationCallOrder[1]!).toBeLessThan(unitSpy.mock.invocationCallOrder[0]!) // 续读先于 unit
    // 历史项 id 专项断言：发出的 unit 与移栈项都是原栈顶历史项
    expect(unitCalls()[0]?.unitId).toBe(entryId)
    expect(unitCalls()[0]?.folderId).toBe('__main__')
    expect(unitCalls()[0]?.direction).toBe('undo')
    expect(undoIds()).toEqual([])
    expect(redoIds()).toEqual([entryId])
    expect(state().needsReload).toBe(false)
    expect(state().nodes[0]?.x).toBe(0) // 撤销「移动到 10,10」＝回到 x0（旁路写不是历史项）
  })

  it('续拉仍被丢（达上界）→不执行 history-unit、两栈不动、位保留', async () => {
    const entryId = await edited()
    const flights = [pendingRead(), pendingRead(), pendingRead()]
    const undone = state().undo()
    await settle()
    for (let round = 1; round <= TAIL_MAX_ROUNDS; round++) {
      bypass(round, round)
      flights[round - 1]!.resolve(graphOk([node('A')]))
      await settle()
    }
    expect(await undone).toBe(false)
    expect(unitCalls()).toHaveLength(0) // 未在未和解的图上执行
    expect(loadSpy).toHaveBeenCalledTimes(TAIL_MAX_ROUNDS)
    expect(patchSpy).toHaveBeenCalledTimes(TAIL_MAX_ROUNDS) // 原编辑 1＋前两轮被丢后各 drain 1；第 3 轮被丢即达上界
    expect(state().queue).toHaveLength(1) // 达上界那一轮在途注入的待写留存
    expect(undoIds()).toEqual([entryId])
    expect(redoIds()).toEqual([])
    expect(state().needsReload).toBe(true)
    // 下一次命令入链：drain 留存待写→和解成功→history-unit 执行（更早被挡住的那条历史项）
    expect(await state().undo()).toBe(true)
    expect(unitCalls()).toHaveLength(1)
    expect(unitCalls()[0]?.unitId).toBe(entryId)
    expect(patchSpy).toHaveBeenCalledTimes(TAIL_MAX_ROUNDS + 1)
    expect(state().needsReload).toBe(false)
  })

  it('续拉前新写失败→不执行 history-unit、两栈不动、error 可见（#14 同型）', async () => {
    const entryId = await edited()
    const first = pendingRead()
    const undone = state().undo()
    await settle()
    failPatch('落库失败')
    bypass(20, 20)
    first.resolve(graphOk([node('A')]))
    expect(await undone).toBe(false)
    expect(unitCalls()).toHaveLength(0)
    expect(loadSpy).toHaveBeenCalledTimes(1)
    expect(state().saveStatus).toBe('error')
    expect(state().lastWriteError).toBe('落库失败')
    expect(state().queue).toHaveLength(1)
    expect(undoIds()).toEqual([entryId])
    expect(redoIds()).toEqual([])
  })
})
