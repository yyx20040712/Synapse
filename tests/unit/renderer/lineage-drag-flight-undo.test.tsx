// @vitest-environment jsdom
/**
 * [回炉 W-D1·T-B02 / 设计稿 §12.2 B3 行「flight×undo 三交错」、§9.3「settle-flight 数据提交完成后，
 * save/undo/redo 可执行」、§2.5 #13/#14/#16、§12.2 quit-gate 行「内部 flush 放行」]
 * 拖拽落位写 L（flight finish→store.reorderMonthSlots→lane.settleEdit）与撤销命令 U
 * （historyCommand→chainTask(history.run)）在同一会话写链上的三种先后——互斥且穷尽 L 相对 U 的时序：
 * ① U 早于 L（态一／态二飞行中）：U 被闸拒（false、零 history-unit、两栈/U 不变、无写链任务入链）；
 *    飞行完成→L 落位成栈顶单元；此后 U 成功且撤的正是落位单元（unitId 专项）；
 * ② U 在途（history-unit 未回）时 L 到达：L 排在 U 之后串行（不被同会话 saving 锁吞）——U 先完成
 *    （E1 出 undo 栈），L 随后成新编辑单元（§2.5 #3 新编辑清 redo）；落位写由其后的收口发出；
 * ③ L 已入暂存后 U：history-unit 前先预 drain（落位写落库）——IPC 序=落位写全部先于 history-unit；
 *    撤销后图回到落位前的槽序。
 * 身份与结果断言：dragId／generation／unitId 专项匹配；history-unit 请求的节点 delta=月组三节点的槽位
 * 前后态；写 IPC 载荷=槽位透写全集。真实 LineageTimeline 拖拽链
 * （card-drag-session→useCardDrag 桥接→store.reorderMonthSlots）。always-active 裸 describe（K3）。
 * （jsdom 零布局：飞行由 transitionend 事件驱动收口——每例都以 fireEnd 终结飞行，600ms 兜底定时器随之清除。）
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub } from '../../utils/api-client-mock'
import { echoHistoryUnit } from '../../utils/lineage-history-stub'
import { stubRowFollowFlow } from '../../utils/live-frame'

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

import { LineageTimeline } from '../../../src/renderer/features/lineage/LineageTimeline'
import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'
import { useLineageViewStore } from '../../../src/renderer/features/lineage/lineage-view.store'
import { lineageRegistry } from '../../../src/renderer/features/lineage/lineage-session-registry'
import { resetRecoveryScheduler } from '../../../src/renderer/features/lineage/recoveryScheduler'
import { resetLineageSessionsForTests } from './lineage-test-session-reset'
import { MAIN_GRAPH_ID, type LineageNode } from '../../../src/shared/models/lineage'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

const MAIN = MAIN_GRAPH_ID

/** 月内三卡（起始槽位未赋——落位写把它们透写为 0/1/2） */
function node(id: string): LineageNode {
  return { id, paperId: `paper-${id}`, title: `节点${id}`, year: 2022, x: 1, y: 1, month: 9, slot: null, folderId: MAIN, createdAt: 't', updatedAt: 't' }
}
const state = () => useLineageStore.getState()
const entry = () => lineageRegistry.entry(MAIN)!
const undoIds = (): string[] => state().undoStack.map((e) => e.id)
const redoIds = (): string[] => state().redoStack.map((e) => e.id)
/** 图的槽序快照（id 序＋各节点 slot——落位写改变的正是月内槽位） */
const slotOrder = (): Array<{ id: string; slot: number | null }> => state().nodes.map((n) => ({ id: n.id, slot: n.slot }))

interface NodeDelta {
  kind: string
  id?: string
  before?: { slot?: number | null; x?: number | null } | null
  after?: { slot?: number | null; x?: number | null } | null
}
/** 第 n 次 history-unit 请求的身份＋各节点 delta 的槽位前后态 */
const unitRequest = (n: number): unknown => {
  const req = stubApi.lineage.historyUnit.mock.calls[n]![0] as { folderId?: string; unitId?: string; direction?: string; changes?: NodeDelta[] }
  return {
    folderId: req.folderId,
    unitId: req.unitId,
    direction: req.direction,
    deltas: (req.changes ?? []).map((d) => [d.kind, d.id, d.before?.slot ?? null, d.after?.slot ?? null])
  }
}
/** 写 IPC 的载荷投影面（id＋槽＋坐标） */
const patchWrites = (): Array<[string, number | null, number | null, number | null]> =>
  stubApi.lineage.patchNode.mock.calls.map((c) => {
    const w = c[0] as { id: string; slot: number | null; x: number | null; y: number | null }
    return [w.id, w.slot, w.x, w.y]
  })
/** 落位写的载荷全集：月组三节点的槽位透写（落位序 B、A、C→槽 0/1/2）；ax/ay=A 的坐标 */
const landingWrites = (ax: number, ay: number): Array<[string, number | null, number | null, number | null]> => [['B', 0, 1, 1], ['A', 1, ax, ay], ['C', 2, 1, 1]]
/** 落位单元的 history-unit delta（撤销落位=三节点槽位回到未赋值） */
const LANDING_UNDO_DELTAS = [['node', 'B', null, 0], ['node', 'A', null, 1], ['node', 'C', null, 2]]

let root: Root | null = null
let hostEl: HTMLDivElement | null = null
let rafs: FrameRequestCallback[] = []
const cardOf = (id: string): HTMLElement => hostEl?.querySelector(`.tl-card[data-node-id="${id}"]`) as HTMLElement
const flushRaf = (): void => {
  act(() => { rafs.splice(0).forEach((cb) => cb(performance.now())) })
}
const pDown = (el: Element, x: number, y: number): void => {
  act(() => { el.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: x, clientY: y })) })
}
const pMove = (x: number, y: number): void => {
  act(() => { document.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: x, clientY: y })) })
}
const pUp = (x: number, y: number): void => {
  act(() => { document.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, clientX: x, clientY: y })) })
}
const fireEnd = (el: Element): void => {
  act(() => { el.dispatchEvent(Object.assign(new Event('transitionend'), { propertyName: 'translate' })) })
}
/** 微任务轮转（写链落定——每轮包 act：已挂载组件随 store 变更提交） */
const turns = async (n = 12): Promise<void> => {
  for (let i = 0; i < n; i++) {
    await act(async () => {
      await Promise.resolve()
    })
  }
}
function mountTimeline(): void {
  hostEl = document.createElement('div')
  document.body.appendChild(hostEl)
  root = createRoot(hostEl)
  act(() => {
    root?.render(<LineageTimeline nodes={state().nodes} edges={[]} onReorderMonthSlots={(ids, target) => state().reorderMonthSlots(target, ids)} />)
  })
}
/** 拖卡至态一（激活未松手）：A 由首位移到 B 之后（lastClient 判定链输入） */
function dragIntoStateOne(): void {
  stubRowFollowFlow(hostEl?.querySelector('.month-frame') as HTMLElement)
  pDown(cardOf('A'), 60, 40)
  pMove(66, 44)
  flushRaf()
  pMove(350, 40)
  flushRaf()
  expect(lineageRegistry.dragPending(MAIN), '前提：态一在场').toBe(true)
}

beforeEach(() => {
  rafs = []
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback): number => {
    rafs.push(cb)
    return rafs.length
  })
  vi.stubGlobal('cancelAnimationFrame', () => undefined)
  for (const fn of Object.values(stubApi.lineage)) fn.mockReset()
  stubApi.lineage.graph.mockResolvedValue({ ok: true, data: { nodes: [node('B1')], edges: [], floatingNotes: [] } })
  stubApi.lineage.patchNode.mockImplementation(async (req: Partial<LineageNode>) => ({ ok: true as const, data: { ...node(String(req.id)), ...req, updatedAt: 'server' } }))
  stubApi.lineage.historyUnit.mockImplementation(echoHistoryUnit)
  resetRecoveryScheduler()
  resetLineageSessionsForTests()
  // 投影与会话身份对齐：测试复位清出活动会话后，部分字段的植入不重投影会话身份字段（活动投影的
  // sessionGeneration 仍是上一个会话的值）；拖拽身份由 LineageTimeline 读活动投影捕获——须与 registry
  // 会话一致，否则「激活时捕获的 generation」断言比较的是两个不同的会话
  const generation = lineageRegistry.ensure(MAIN).data.sessionGeneration
  useLineageStore.setState({
    nodes: [node('A'), node('B'), node('C')], edges: [], floatingNotes: [], status: 'ready', error: null, saveStatus: 'clean', lastWriteError: null,
    queue: [], flushing: false, inflight: null, needsReload: false, undoStack: [], redoStack: [], unfinalized: false, editRevision: 0, folderId: MAIN,
    sessionGeneration: generation, invalidationEpoch: 0, restoredAwaitingCommand: false, staleHistory: null
  })
  useLineageViewStore.setState({ mode: 'edit', tool: 'select', paletteFor: null, focusSet: [] })
})

afterEach(() => {
  act(() => { root?.unmount() })
  root = null
  hostEl?.remove()
  hostEl = null
  lineageRegistry.cancelAllIdle()
  resetRecoveryScheduler()
  resetLineageSessionsForTests() // 未落定的落位写先 flush（不随会话清出丢弃）
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('flight×undo 三交错（§9.3、§2.5 #13/#16——[回炉 W-D1]）', () => {
  it('交错① 撤销早于落位：态一与态二中撤销被闸拒（false、零 history-unit、两栈/U 不变、无写链任务）；飞行完成落位后撤销成功且撤的正是落位单元（dragId／generation／unitId 专项）', async () => {
    const before = slotOrder()
    act(() => { state().moveNode('A', 5, 5) }) // 既有可撤项 E1
    const e1 = undoIds()
    expect(e1).toHaveLength(1)
    mountTimeline()
    dragIntoStateOne()
    const dragId = entry().drag.dragId
    const generation = entry().data.sessionGeneration
    expect(dragId, '前提：拖拽激活已捕获身份').toEqual(expect.any(String))

    // 态一：撤销请求被拒
    await act(async () => { expect(await state().undo()).toBe(false) })
    expect(stubApi.lineage.historyUnit).not.toHaveBeenCalled()
    expect({ undo: undoIds(), redo: redoIds(), unfinalized: state().unfinalized, inflight: entry().data.inflight }).toEqual({ undo: e1, redo: [], unfinalized: true, inflight: null })

    // 态二：松手建 FlightJob——撤销请求仍被拒
    pUp(350, 40)
    expect(lineageRegistry.dragPending(MAIN), '前提：态二在场（飞行未完成）').toBe(true)
    expect(entry().drag.dragId, '态二沿用激活时捕获的 dragId').toBe(dragId)
    await act(async () => { expect(await state().undo()).toBe(false) })
    expect(stubApi.lineage.historyUnit).not.toHaveBeenCalled()
    expect({ undo: undoIds(), redo: redoIds(), unfinalized: state().unfinalized, inflight: entry().data.inflight }).toEqual({ undo: e1, redo: [], unfinalized: true, inflight: null })

    // 飞行完成→落位数据写：成栈顶单元；两态清；收尾记录=激活时捕获的身份
    fireEnd(cardOf('A'))
    await turns()
    expect(lineageRegistry.dragPending(MAIN)).toBe(false)
    expect(entry().drag.settled, '落位准入的重锚记录=激活时捕获的 dragId＋generation').toEqual({ dragId, generation })
    const afterLanding = undoIds()
    expect(afterLanding.slice(0, 1), '既有可撤项仍在栈底').toEqual(e1)
    expect(afterLanding, '落位成栈顶单元').toHaveLength(2)
    const landingId = afterLanding[1]!
    expect(slotOrder(), '落位后的槽序=B、A、C').toEqual([{ id: 'B', slot: 0 }, { id: 'A', slot: 1 }, { id: 'C', slot: 2 }])
    expect(patchWrites(), '落位写留在暂存：尚无写 IPC').toEqual([])

    // 此后撤销成功：撤的正是落位单元——请求身份=落位项 id、delta=月组三节点槽位回到落位前；预 drain 先发落位写
    await act(async () => { expect(await state().undo()).toBe(true) })
    expect(stubApi.lineage.historyUnit).toHaveBeenCalledTimes(1)
    expect(unitRequest(0)).toEqual({ folderId: MAIN, unitId: landingId, direction: 'undo', deltas: LANDING_UNDO_DELTAS })
    // 预 drain 先发落位写：A 的落位动作与暂存中的 E1 移动同实体——lazy 融合为一条（坐标=E1 的值、槽=落位的值），
    // 故首发为 A；其后 B、C 的槽位透写
    expect(patchWrites()).toEqual([['A', 1, 5, 5], ['B', 0, 1, 1], ['C', 2, 1, 1]])
    expect(Math.max(...stubApi.lineage.patchNode.mock.invocationCallOrder), '落位写先于 history-unit').toBeLessThan(stubApi.lineage.historyUnit.mock.invocationCallOrder[0]!)
    expect({ undo: undoIds(), redo: redoIds(), queue: state().queue, unfinalized: state().unfinalized }).toEqual({ undo: e1, redo: [landingId], queue: [], unfinalized: true })
    expect(slotOrder(), '撤销落位后回到落位前的槽序').toEqual(before)
  })

  it('交错② 撤销在途（history-unit 未回）时落位到达：落位排在撤销之后串行、不被同会话 saving 锁吞——撤销先完成（E1 出栈），落位随后成新编辑单元（清 redo）；落位写由其后的收口发出', async ({ onTestFinished }) => {
    mountTimeline()
    act(() => { state().moveNode('A', 5, 5) }) // E1（Q=1）
    const e1 = undoIds()
    let release!: () => void
    const gate = new Promise<void>((resolve) => { release = resolve })
    let undoing: Promise<boolean> = Promise.resolve(false)
    stubApi.lineage.historyUnit.mockImplementation(async (req) => {
      await gate
      return echoHistoryUnit(req)
    })
    // 断言先红时不留悬挂在途：收尾放行 history-unit 并等撤销链收束（重复放行无副作用）
    onTestFinished(async () => {
      release()
      await act(async () => {
        await undoing.catch(() => undefined)
        await turns()
      })
    })
    act(() => { undoing = state().undo() })
    await turns()
    expect(entry().data.inflight?.kind, '前提：撤销的 history-unit 在途').toBe('history')
    expect(stubApi.lineage.historyUnit).toHaveBeenCalledTimes(1)
    const inFlight = stubApi.lineage.historyUnit.mock.calls[0]![0] as { folderId?: string; unitId?: string; direction?: string; changes: NodeDelta[] }
    // 在途的是 E1 的撤销（请求身份＋节点 delta=坐标 1→5，撤销即回到 before）；其预 drain 已把 E1 的写落库
    expect({ folderId: inFlight.folderId, unitId: inFlight.unitId, direction: inFlight.direction, deltas: inFlight.changes.map((d) => [d.kind, d.id, d.before?.x, d.after?.x]) })
      .toEqual({ folderId: MAIN, unitId: e1[0], direction: 'undo', deltas: [['node', 'A', 1, 5]] })
    expect(patchWrites(), 'E1 的预 drain 写').toEqual([['A', null, 5, 5]])

    // 撤销在途时：真实拖拽落位到达（两态→飞行完成→reorderMonthSlots→lane.settleEdit）
    dragIntoStateOne()
    const dragId = entry().drag.dragId
    pUp(350, 40)
    fireEnd(cardOf('A'))
    await turns()
    expect(lineageRegistry.dragPending(MAIN), '落位已收尾：两态清').toBe(false)
    expect(entry().drag.settled).toEqual({ dragId, generation: entry().data.sessionGeneration })
    expect(entry().data.inflight?.kind, '落位排在在途撤销之后（同会话串行）').toBe('history')
    expect(undoIds(), '撤销未回：落位尚未成单元').toEqual(e1)

    // 撤销回显→落位随后应用
    stubApi.lineage.patchNode.mockClear()
    await act(async () => {
      release()
      expect(await undoing).toBe(true)
      await turns()
    })
    const landingId = undoIds().at(-1)!
    expect(landingId).not.toBe(e1[0])
    const staged = state().queue.length
    expect(staged, '落位写在暂存').toBeGreaterThan(0)
    // 撤销先完成（E1 出 undo 栈），落位随后成新编辑单元（§2.5 #3：新编辑清 redo）——undo 栈=仅落位项
    expect({ undo: undoIds(), redo: redoIds(), phase: state().saveStatus }).toEqual({ undo: [landingId], redo: [], phase: 'dirty' })
    expect(patchWrites(), '撤销回显后落位尚未落库').toEqual([])
    expect(slotOrder(), '落位后的槽序').toEqual([{ id: 'B', slot: 0 }, { id: 'A', slot: 1 }, { id: 'C', slot: 2 }])

    // 落位写由其后的收口发出（载荷=落位全集；A 的坐标已是撤销后的值）；不再有第二次 history-unit
    await act(async () => { await state().save() })
    expect(patchWrites()).toEqual(landingWrites(1, 1))
    expect(stubApi.lineage.historyUnit).toHaveBeenCalledTimes(1)
    expect({ queue: entry().data.queue, phase: entry().data.saveStatus, undo: undoIds() }).toEqual({ queue: [], phase: 'clean', undo: [landingId] })
  })

  it('交错③ 落位已入暂存后撤销：history-unit 前先预 drain（落位写落库）——IPC 序=落位写全部先于 history-unit；撤销后图回到落位前的槽序', async () => {
    mountTimeline()
    const before = slotOrder()
    dragIntoStateOne()
    pUp(350, 40)
    fireEnd(cardOf('A'))
    await turns()
    expect(lineageRegistry.dragPending(MAIN)).toBe(false)
    const landingId = undoIds().at(-1)!
    expect(undoIds()).toEqual([landingId])
    expect(slotOrder(), '前提：落位已改变槽序').toEqual([{ id: 'B', slot: 0 }, { id: 'A', slot: 1 }, { id: 'C', slot: 2 }])
    const staged = state().queue.length
    expect(staged, '前提：落位写在暂存').toBeGreaterThan(0)
    expect(patchWrites(), '落位写仍在暂存：尚无写 IPC').toEqual([])

    stubApi.lineage.patchNode.mockClear()
    stubApi.lineage.historyUnit.mockClear()
    await act(async () => { expect(await state().undo()).toBe(true) })

    // IPC 序：落位写（预 drain）全部先于 history-unit；请求身份=落位项 id
    expect(patchWrites(), '预 drain 把暂存的落位写逐条发出').toEqual(landingWrites(1, 1))
    expect(Math.max(...stubApi.lineage.patchNode.mock.invocationCallOrder), '落位写先于 history-unit').toBeLessThan(stubApi.lineage.historyUnit.mock.invocationCallOrder[0]!)
    expect(stubApi.lineage.historyUnit).toHaveBeenCalledTimes(1)
    expect(unitRequest(0)).toEqual({ folderId: MAIN, unitId: landingId, direction: 'undo', deltas: LANDING_UNDO_DELTAS })
    // 结果：撤销落位单元→图回到落位前的槽序；栈迁移；暂存清空
    expect(slotOrder(), '撤销后回到落位前的槽序').toEqual(before)
    expect({ undo: undoIds(), redo: redoIds(), queue: state().queue, phase: state().saveStatus }).toEqual({ undo: [], redo: [landingId], queue: [], phase: 'clean' })
  })
})
