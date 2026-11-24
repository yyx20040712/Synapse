// @vitest-environment jsdom
/**
 * [回炉 W-D1·T-B02 / 设计稿 §12.2 B3 行「quit 与页面真实编排」、§2.5 #30/#37、§9.2「quit/workspace
 * 全量 flush」「folder 切换 flush-first」行、§9.3 两态四出口、§8.3「返回不双取」]
 * 拖拽两态经**编排层真实入口**的出口（W-B2 既有例=真 LineageTimeline＋直接调用出口函数
 * runQuitFlush／switchViewWithFlush；本件再往上两层）：
 * - quit：退出握手桥订阅的 onQuitFlush 帧（quit-flush-bridge：同步置 closing→runQuitFlush→
 *   reportQuitFlush 回执）；
 * - 页面切换：`<App />` 的 Rail 点击（App.changeView→switchViewWithFlush→LineagePage 卸载→返回再挂载）。
 * always-active 裸 describe（K3）。（jsdom 零布局：飞行由 transitionend 事件或卸载清场收口。）
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub, stubApiEvents } from '../../utils/api-client-mock'
import { stubRowFollowFlow } from '../../utils/live-frame'

let flushCb: ((e: { requestId: string }) => void) | null = null
let abortCb: ((e: { requestId: string }) => void) | null = null
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
  notes: { get: vi.fn(), save: vi.fn() },
  recovery: { peek: vi.fn(), save: vi.fn(), release: vi.fn() },
  system: { setQuitDirty: vi.fn(), windowControl: vi.fn(), reportQuitFlush: vi.fn() },
  library: { list: vi.fn() },
  settings: { get: vi.fn(), set: vi.fn() },
  workspaces: { list: vi.fn(), switch: vi.fn() },
  folders: { list: vi.fn() }
})
stubApiEvents({
  onExportCorpus: vi.fn(() => () => undefined),
  onImportProgress: vi.fn(() => () => undefined),
  onFoldersChanged: vi.fn(() => () => undefined),
  onQuitFlush: (cb: (e: { requestId: string }) => void) => {
    flushCb = cb
    return () => {
      flushCb = null
    }
  },
  onQuitFlushAbort: (cb: (e: { requestId: string }) => void) => {
    abortCb = cb
    return () => {
      abortCb = null
    }
  }
})

import { installQuitFlushBridge } from '../../../src/renderer/app/quit-flush-bridge'
import { quitWriteBlocked, setQuitClosing } from '../../../src/renderer/app/quit-closing-gate'
import { App } from '../../../src/renderer/app/App'
import { LineageTimeline } from '../../../src/renderer/features/lineage/LineageTimeline'
import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'
import { useLineageViewStore } from '../../../src/renderer/features/lineage/lineage-view.store'
import { lineageRegistry } from '../../../src/renderer/features/lineage/lineage-session-registry'
import { resetRecoveryScheduler } from '../../../src/renderer/features/lineage/recoveryScheduler'
import { resetLineageSessionsForTests } from './lineage-test-session-reset'
import { useNotesStore } from '../../../src/renderer/features/notes/notes.store'
import { useReaderStore } from '../../../src/renderer/features/reader/state/reader.store'
import { useWorkspaceStore } from '../../../src/renderer/features/workspaces/workspace.store'
import { MAIN_GRAPH_ID, type LineageNode } from '../../../src/shared/models/lineage'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

const MAIN = MAIN_GRAPH_ID

/** 月内三卡（槽 0/1/2——落位改变槽序，DOM 序与 store 序同源） */
function node(id: string, slot: number): LineageNode {
  return { id, paperId: `paper-${id}`, title: `节点${id}`, year: 2022, x: 1, y: 1, month: 9, slot, folderId: MAIN, createdAt: 't', updatedAt: 't' }
}
const NODES = (): LineageNode[] => [node('A', 0), node('B', 1), node('C', 2)]
const state = () => useLineageStore.getState()
const entry = () => lineageRegistry.entry(MAIN)!
const undoIds = (): string[] => state().undoStack.map((e) => e.id)
/** 写 IPC 的载荷投影面（id＋槽＋坐标——落位写改变的正是月内槽位；其余字段不入本投影） */
const patchWrites = (): Array<{ id: string; slot: number; x: number; y: number }> =>
  stubApi.lineage.patchNode.mock.calls.map((c) => {
    const w = c[0] as { id: string; slot: number; x: number; y: number }
    return { id: w.id, slot: w.slot, x: w.x, y: w.y }
  })

let root: Root | null = null
let hostEl: HTMLDivElement | null = null
let rafs: FrameRequestCallback[] = []
const cardOf = (id: string): HTMLElement => hostEl?.querySelector(`.tl-card[data-node-id="${id}"]`) as HTMLElement
const cardOrder = (): Array<string | null> => Array.from(document.querySelectorAll('.tl-card[data-node-id]')).map((el) => el.getAttribute('data-node-id'))
const flushRaf = (): void => {
  act(() => { rafs.splice(0).forEach((cb) => cb(performance.now())) })
}
const pDown = (el: Element, x: number, y: number): void => {
  act(() => { el.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: x, clientY: y })) })
}
const pMove = (x: number, y: number): void => {
  act(() => { document.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: x, clientY: y })) })
}
const fireEnd = (el: Element): void => {
  act(() => { el.dispatchEvent(Object.assign(new Event('transitionend'), { propertyName: 'translate' })) })
}
/** 微任务轮转（写链落定——每轮包 act：已挂载组件随 store 变更提交） */
const turns = async (n = 40): Promise<void> => {
  for (let i = 0; i < n; i++) {
    await act(async () => {
      await Promise.resolve()
    })
  }
}
function mount(element: JSX.Element): void {
  hostEl = document.createElement('div')
  document.body.appendChild(hostEl)
  root = createRoot(hostEl)
  act(() => {
    root?.render(element)
  })
}
function mountTimeline(): void {
  mount(<LineageTimeline nodes={state().nodes} edges={[]} onReorderMonthSlots={(ids, target) => state().reorderMonthSlots(target, ids)} />)
}
/** 拖卡至态一（激活未松手）：A 由首位移到 B 之后 */
function dragIntoStateOne(): void {
  stubRowFollowFlow(document.querySelector('.month-frame') as HTMLElement)
  pDown(cardOf('A'), 60, 40)
  pMove(66, 44)
  flushRaf()
  pMove(350, 40)
  flushRaf()
  expect(lineageRegistry.dragPending(MAIN), '前提：态一在场').toBe(true)
}
function railButton(label: string): HTMLButtonElement {
  const rail = document.querySelector('nav.rail')
  const btn = Array.from(rail?.querySelectorAll('button') ?? []).find((b) => b.getAttribute('aria-label') === label)
  if (btn === undefined) throw new Error(`rail 应含 aria-label「${label}」的 button`)
  return btn
}
const fire = (requestId: string): void => {
  if (flushCb === null) throw new Error('onQuitFlush 未订阅')
  flushCb({ requestId })
}
const abort = (requestId: string): void => {
  if (abortCb === null) throw new Error('onQuitFlushAbort 未订阅')
  abortCb({ requestId })
}

beforeEach(() => {
  vi.clearAllMocks()
  for (const fn of Object.values(stubApi.lineage)) fn.mockReset()
  stubApi.lineage.graph.mockReset()
  rafs = []
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback): number => {
    rafs.push(cb)
    return rafs.length
  })
  vi.stubGlobal('cancelAnimationFrame', () => undefined)
  Object.defineProperty(window, 'api', {
    configurable: true,
    value: { system: { setQuitDirty: stubApi.system.setQuitDirty, windowControl: stubApi.system.windowControl } }
  })
  Object.defineProperty(window, 'apiEvents', {
    configurable: true,
    value: { onWindowState: vi.fn(() => () => undefined) }
  })
  stubApi.lineage.graph.mockResolvedValue({ ok: true, data: { nodes: [node('X', 0)], edges: [], floatingNotes: [] } })
  stubApi.lineage.patchNode.mockImplementation(async (req: Partial<LineageNode>) => ({ ok: true as const, data: { ...node(String(req.id), 0), ...req, updatedAt: 'server' } }))
  stubApi.system.reportQuitFlush.mockResolvedValue({ ok: true as const, data: { ok: true } })
  stubApi.system.setQuitDirty.mockResolvedValue({ ok: true, data: { ok: true } })
  stubApi.system.windowControl.mockResolvedValue({ ok: true, data: { ok: true, maximized: false } })
  stubApi.library.list.mockResolvedValue({ ok: true, data: { items: [], total: 0 } })
  stubApi.folders.list.mockResolvedValue({ ok: true, data: [{ id: MAIN, name: '主图', position: 0, paperCount: 0 }] })
  stubApi.recovery.peek.mockResolvedValue({ ok: true, data: { slots: { 'lineage-session': { status: 'empty', epoch: 0 } } } })
  stubApi.recovery.release.mockResolvedValue({ ok: true, data: { status: 'released', epoch: 1 } })
  useWorkspaceStore.setState({ items: [{ id: 'w1', name: '默认课题', createdAt: '2026-08-28T00:00:00Z', paperCount: 3 }], currentId: 'w1', loading: false, error: null })
  useNotesStore.getState().resetEditStateForTests()
  useReaderStore.setState({ tabs: {}, order: [], activeId: null })
  setQuitClosing(false)
  resetRecoveryScheduler()
  resetLineageSessionsForTests()
  // 投影与会话身份对齐（LineageTimeline 读活动投影捕获拖拽身份——须与 registry 会话一致）
  const generation = lineageRegistry.ensure(MAIN).data.sessionGeneration
  useLineageStore.setState({
    nodes: NODES(), edges: [], floatingNotes: [], paperMetrics: {}, pubNos: {}, tagNames: {}, status: 'ready', error: null, saveStatus: 'clean',
    lastWriteError: null, queue: [], flushing: false, inflight: null, needsReload: false, undoStack: [], redoStack: [], unfinalized: false, editRevision: 0,
    folderId: MAIN, sessionGeneration: generation, invalidationEpoch: 0, restoredAwaitingCommand: false, staleHistory: null
  })
  useLineageViewStore.setState({ mode: 'edit', tool: 'select', paletteFor: null, focusSet: [] })
})

afterEach(() => {
  setQuitClosing(false)
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

describe('quit 真实编排：退出握手桥×拖拽两态（[回炉 W-D1] §2.5 #37、§9.3）', () => {
  it('Q1 态一中收到退出帧：桥同步置 closing→握手请求有界 settle（态一→态二）→飞行完成落位写入原会话并由握手落库→回执 stillDirty=false；clean 回执后保持冻结', async () => {
    mountTimeline()
    dragIntoStateOne()
    const dragId = entry().drag.dragId
    const generation = entry().data.sessionGeneration
    const off = installQuitFlushBridge()
    try {
      fire('quit-flush-1')
      expect(quitWriteBlocked(), '帧到达即冻结（同步）').toBe(true)
      await turns()
      // 有界 settle：pointercancel 同型判定→FlightJob 已建（转态二），飞行未完成
      expect(lineageRegistry.dragPending(MAIN), '态二在场').toBe(true)
      expect(entry().interaction.dragging, '有界 settle：态一→态二（dragging 清、FlightJob 已建）').toBe(false)
      expect(entry().interaction.settleFlight, '态二句柄在场').not.toBeNull()
      expect(entry().drag.dragId, '沿用激活时捕获的 dragId').toBe(dragId)
      expect(stubApi.lineage.patchNode).not.toHaveBeenCalled() // 落位未写：握手不前进
      expect(stubApi.system.reportQuitFlush, '落位未落库：不回执').not.toHaveBeenCalled()
      fireEnd(cardOf('A')) // 飞行完成
      await turns()
      expect(stubApi.system.reportQuitFlush, '落位落库后回执恰一次').toHaveBeenCalledTimes(1)
      expect(stubApi.system.reportQuitFlush).toHaveBeenCalledWith({ requestId: 'quit-flush-1', stillDirty: false })
      // 落位写=月组全部节点的槽位透写（落位序 B、A、C→槽 0/1/2），由握手落库；收尾记录=激活时捕获的身份
      expect(patchWrites()).toEqual([
        { id: 'B', slot: 0, x: 1, y: 1 },
        { id: 'A', slot: 1, x: 1, y: 1 },
        { id: 'C', slot: 2, x: 1, y: 1 }
      ])
      expect(entry().drag.settled).toEqual({ dragId, generation })
      expect({ undo: undoIds().length, queue: entry().data.queue, phase: entry().data.saveStatus, inflight: entry().data.inflight }).toEqual({ undo: 1, queue: [], phase: 'clean', inflight: null })
      expect(lineageRegistry.dragPending(MAIN)).toBe(false)
      // clean 回执：保持冻结至 abort——同期用户写仍被拒
      expect(quitWriteBlocked(), 'clean 回执不解冻').toBe(true)
      act(() => { state().moveNode('A', 9, 9) })
      expect(undoIds()).toHaveLength(1)
      expect(entry().data.queue).toEqual([])
    } finally {
      abort('quit-flush-1')
      off()
    }
    expect(quitWriteBlocked(), 'abort 解冻').toBe(false)
  })

  it('Q2 态一中收到退出帧且会话已有一条写在途：落位排在在途写之后——握手等两写都落库才回执；在途写与落位写各恰一次 IPC', async () => {
    mountTimeline()
    let release: ((v: { ok: true; data: LineageNode }) => void) | null = null
    const landW = (): void => {
      release?.({ ok: true, data: { ...node('A', 0), x: 5, y: 5, updatedAt: 'server' } })
    }
    stubApi.lineage.patchNode.mockImplementationOnce(() => new Promise((r) => { release = r }))
    act(() => {
      state().moveNode('A', 5, 5) // 先入暂存
      void state().save() // 写 IPC 挂起——会话写链忙
    })
    await turns()
    expect(stubApi.lineage.patchNode).toHaveBeenCalledTimes(1)
    dragIntoStateOne() // 态一（卡拖拽不受同会话写链在途限制）
    const off = installQuitFlushBridge()
    try {
      fire('quit-flush-1')
      await turns()
      fireEnd(cardOf('A'))
      await turns()
      expect(stubApi.system.reportQuitFlush, '在途写未落定：不回执').not.toHaveBeenCalled()
      expect(stubApi.lineage.patchNode, '落位写排在在途写之后（尚未发出）').toHaveBeenCalledTimes(1)
      expect(undoIds(), '落位尚未成单元').toHaveLength(1)
      await act(async () => {
        landW()
        await turns()
      })
      // 在途写放行后握手收束（落位排在它之后、再由握手落库——链深于 Q1；等回执到达再断言）
      await act(async () => { await vi.waitFor(() => expect(stubApi.system.reportQuitFlush).toHaveBeenCalledTimes(1)) })
      expect(stubApi.system.reportQuitFlush).toHaveBeenCalledWith({ requestId: 'quit-flush-1', stillDirty: false })
      const writes = patchWrites()
      // 落位=月组全部节点的槽位透写（B、A、C→槽 0/1/2，按落位序）——排在在途写 W 之后：W 恰一次、落位三写各恰一次
      expect(writes).toEqual([
        { id: 'A', slot: 0, x: 5, y: 5 }, // W（发起时 A 的槽=0；坐标=移动后的值）
        { id: 'B', slot: 0, x: 1, y: 1 },
        { id: 'A', slot: 1, x: 5, y: 5 }, // 落位写载荷=落位意图（槽 1），坐标=先前写已落的值
        { id: 'C', slot: 2, x: 1, y: 1 }
      ])
      expect({ undo: undoIds().length, queue: entry().data.queue, phase: entry().data.saveStatus }).toEqual({ undo: 2, queue: [], phase: 'clean' })
    } finally {
      // 断言先红时不留悬挂在途：在途写放行、握手链收束（重复放行无副作用）
      landW()
      await turns()
      abort('quit-flush-1')
      off()
    }
  })
})

describe('页面真实编排：App 根 Rail 切离脉络与返回（[回炉 W-D1] §2.5 #30、§8.3、§9.3）', () => {
  it('P1+P2 态一中切到文献库：不阻路由；LineagePage 卸载时落位写落原会话并由离场 flush 落库；返回脉络＝既有会话零 graph IPC、落位后的槽序真实渲染、历史/U 原样', async () => {
    mount(<App />)
    await turns(12)
    act(() => { railButton('脉络').click() })
    await act(async () => { await vi.waitFor(() => expect(cardOrder()).toEqual(['A', 'B', 'C'])) }) // LineagePage 挂载：时间线真实卡片
    expect(cardOf('A').textContent).toContain('节点A')
    act(() => { useLineageViewStore.getState().setMode('edit') }) // 进页缺省 browse（resetForMount）——拖卡=edit 专属
    await turns(4)
    const graphBefore = stubApi.lineage.graph.mock.calls.length
    dragIntoStateOne()
    const dragId = entry().drag.dragId
    const generation = entry().data.sessionGeneration

    act(() => { railButton('文献库').click() })
    // 不阻路由：脉络 DOM 同步消失（不等落位与落库）；壳层仍在
    expect(cardOrder()).toEqual([])
    expect(document.querySelector('main.app-main')).not.toBeNull()
    await turns()
    // 卸载清场：未起飞的 FlightJob 直接 finish——落位携身份落原会话；离场 flush 把它落库
    expect(lineageRegistry.dragPending(MAIN)).toBe(false)
    expect(entry().drag.settled).toEqual({ dragId, generation })
    expect(patchWrites()).toEqual([
      { id: 'B', slot: 0, x: 1, y: 1 },
      { id: 'A', slot: 1, x: 1, y: 1 },
      { id: 'C', slot: 2, x: 1, y: 1 }
    ])
    expect({ undo: undoIds().length, queue: entry().data.queue, phase: entry().data.saveStatus, unfinalized: state().unfinalized }).toEqual({ undo: 1, queue: [], phase: 'clean', unfinalized: true })
    expect(stubApi.lineage.historyUnit).not.toHaveBeenCalled()

    act(() => { railButton('脉络').click() })
    // 返回脉络：既有会话（ready、needsReload=0）——不 graph 双取
    await act(async () => { await vi.waitFor(() => expect(cardOrder()).toEqual(['B', 'A', 'C'])) }) // 落位后的槽序真实渲染
    expect(stubApi.lineage.graph.mock.calls.length, '返回不双取').toBe(graphBefore)
    expect(cardOf('A').textContent).toContain('节点A')
    expect(state().nodes.map((n) => n.id)).toEqual(['B', 'A', 'C'])
    expect({ undo: undoIds().length, unfinalized: state().unfinalized, phase: state().saveStatus, folder: state().folderId }).toEqual({ undo: 1, unfinalized: true, phase: 'clean', folder: MAIN })
  })
})
