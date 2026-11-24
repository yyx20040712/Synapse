// @vitest-environment jsdom
/**
 * [回炉 W-B2·R-B3/R-B2 / 设计稿 §2.4 IO×queue/inflight 合法态表、§2.5 #15/#16/#19/#37/#38、
 * §9.3] IO 相位与退出/课题切换的等待面——判别探针 P1、P2 自审查件（r-renderer/
 * b4b-renderer-probes.test.tsx）并入正式测试。
 *
 * 锁链：
 * - P2：history-unit 在途期间相位必须是 saving、`inflight.kind='history'`、`ioDirty=true`
 *   （§2.4「有在途必须为 saving」）；退出握手在 history 落定前不返回。
 * - 课题切换同面：history 在途=IO 未落定，`prepareWorkspaceSwitch` 等它落定后才清史
 *   （#38「全量 flush 成功→全部 IO idle→再清全部 H/R/U」——提前清史会连同在途撤销一起丢）。
 * - P1：quit closing 时态一（激活未松手）的有界 settle 落位必须写入原会话并落库——不得被
 *   普通用户编辑闸（quit 冻结门）吞掉后按 clean 回执（#37「拖拽两态按 §9.3 有界收口」）。
 * 真实 LineageTimeline 拖拽链（card-drag-session→useCardDrag 桥接→store.reorderMonthSlots）。
 * always-active 裸 describe（K3）。（jsdom 零布局：flight 走零位移立即落定分支。）
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
  },
  notes: { get: vi.fn(), save: vi.fn() },
  recovery: { save: vi.fn(), release: vi.fn() }
})

import { LineageTimeline } from '../../../src/renderer/features/lineage/LineageTimeline'
import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'
import { useLineageViewStore } from '../../../src/renderer/features/lineage/lineage-view.store'
import { lineageRegistry } from '../../../src/renderer/features/lineage/lineage-session-registry'
import { resetRecoveryScheduler } from '../../../src/renderer/features/lineage/recoveryScheduler'
import { runQuitFlush } from '../../../src/renderer/app/quit-flush'
import { prepareWorkspaceSwitch } from '../../../src/renderer/app/workspace-switch'
import { setQuitClosing } from '../../../src/renderer/app/quit-closing-gate'
import { useNotesStore } from '../../../src/renderer/features/notes/notes.store'
import { useReaderStore } from '../../../src/renderer/features/reader/state/reader.store'
import { defaultLineTypeNames, MAIN_GRAPH_ID, type LineageNode } from '../../../src/shared/models/lineage'
import type { LineageGraphRes } from '../../../src/shared/ipc/schemas'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

const MAIN = MAIN_GRAPH_ID

function node(id: string, folderId = MAIN, patch: Partial<LineageNode> = {}): LineageNode {
  return { id, paperId: `paper-${id}`, title: `节点${id}`, year: 2022, x: null, y: null, month: 9, slot: null, folderId, createdAt: 't', updatedAt: 't', ...patch }
}
function graphOf(nodes: LineageNode[]): LineageGraphRes {
  return { nodes, edges: [], paperMetrics: {}, pubNos: {}, tagNames: {}, lineTypeNames: defaultLineTypeNames(), floatingNotes: [] }
}
const settle = async (turns = 12): Promise<void> => {
  for (let i = 0; i < turns; i++) await Promise.resolve()
}
const state = () => useLineageStore.getState()
const entry = () => lineageRegistry.entry(MAIN)!

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
const fireEnd = (el: Element): void => {
  act(() => { el.dispatchEvent(Object.assign(new Event('transitionend'), { propertyName: 'translate' })) })
}
function mountTimeline(): void {
  hostEl = document.createElement('div')
  document.body.appendChild(hostEl)
  root = createRoot(hostEl)
  act(() => {
    root?.render(<LineageTimeline nodes={state().nodes} edges={[]} onReorderMonthSlots={(ids, target) => state().reorderMonthSlots(target, ids)} />)
  })
}
/** 拖卡至态一（激活未松手）：A 由首位移到 B 之后 */
function dragIntoStateOne(): void {
  mountTimeline()
  stubRowFollowFlow(hostEl?.querySelector('.month-frame') as HTMLElement)
  pDown(cardOf('A'), 60, 40)
  pMove(66, 44)
  flushRaf()
  pMove(350, 40)
  flushRaf()
  expect(lineageRegistry.dragPending(MAIN)).toBe(true) // 前提：态一在场
}
/** 挂起一次 undo 的 history-unit IPC，返回放行句柄 */
function holdHistoryUnit(): () => void {
  let release!: () => void
  const gate = new Promise<void>((resolve) => { release = resolve })
  stubApi.lineage.historyUnit.mockImplementation(async (req) => {
    await gate
    return echoHistoryUnit(req)
  })
  return release
}

beforeEach(() => {
  rafs = []
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback): number => {
    rafs.push(cb)
    return rafs.length
  })
  vi.stubGlobal('cancelAnimationFrame', () => undefined)
  for (const fn of Object.values(stubApi.lineage)) fn.mockReset()
  stubApi.lineage.graph.mockResolvedValue({ ok: true, data: graphOf([node('B1', 'f-b')]) })
  stubApi.lineage.patchNode.mockImplementation(async (req: Partial<LineageNode>) => ({ ok: true, data: { ...node(String(req.id)), ...req, updatedAt: 'server' } }))
  stubApi.lineage.historyUnit.mockImplementation(echoHistoryUnit)
  stubApi.recovery.save.mockResolvedValue({ ok: true, data: { status: 'saved', token: 'tok', epoch: 0 } })
  stubApi.recovery.release.mockResolvedValue({ ok: true, data: { status: 'released', epoch: 1 } })
  setQuitClosing(false)
  resetRecoveryScheduler()
  useNotesStore.getState().resetEditStateForTests()
  useReaderStore.setState({ tabs: {}, order: [], activeId: null })
  useLineageStore.setState({
    nodes: [node('A'), node('B'), node('C')], edges: [], floatingNotes: [], paperMetrics: {}, pubNos: {}, tagNames: {},
    status: 'ready', error: null, saveStatus: 'clean', lastWriteError: null, queue: [], flushing: false, inflight: null,
    needsReload: false, undoStack: [], redoStack: [], unfinalized: false, editRevision: 0, folderId: MAIN
  })
  useLineageViewStore.setState({ mode: 'edit', tool: 'select', paletteFor: null, focusSet: [] })
})

afterEach(() => {
  setQuitClosing(false)
  act(() => { root?.unmount() })
  root = null
  hostEl?.remove()
  hostEl = null
  resetRecoveryScheduler()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('[回炉 W-B2·R-B3] history 在途=IO 未落定（P2）', () => {
  it('P2：history 在途期间 phase=saving、inflight=history、ioDirty=true；退出握手在 history 落定前不返回', async () => {
    const release = holdHistoryUnit()
    state().moveNode('A', 10, 10)
    const undoing = state().undo()
    await settle()
    expect(stubApi.lineage.historyUnit).toHaveBeenCalledTimes(1) // 前提：history-unit 已发
    const observed = {
      phase: entry().data.saveStatus,
      inflight: entry().data.inflight?.kind,
      ioDirty: lineageRegistry.ioDirty()
    }
    let quitSettled = false
    const quit = runQuitFlush().then((value) => {
      quitSettled = true
      return value
    })
    await settle()
    const settledBeforeHistory = quitSettled
    release()
    await undoing
    const stillDirty = await quit
    expect({ ...observed, settledBeforeHistory }).toEqual({ phase: 'saving', inflight: 'history', ioDirty: true, settledBeforeHistory: false })
    expect(stillDirty, 'history 落定后 IO 收口：clean 回执').toBe(false)
    expect(entry().data.saveStatus).toBe('clean')
    expect(entry().data.inflight).toBeNull()
    expect(entry().data.redoStack).toHaveLength(1) // 撤销已应用（不是被清史丢掉）
  })

  it('课题切换同面：history 在途时 prepareWorkspaceSwitch 不返回；落定后才清史并放行', async () => {
    const release = holdHistoryUnit()
    state().moveNode('A', 10, 10)
    const undoing = state().undo()
    await settle()
    expect(stubApi.lineage.historyUnit).toHaveBeenCalledTimes(1) // 前提：history-unit 在途
    let settled = false
    const preparing = prepareWorkspaceSwitch().then((value) => {
      settled = true
      return value
    })
    try {
      await settle()
      expect(settled, 'history 在途=IO 未落定：清史与放行都不得先行').toBe(false)
      expect(entry().data.undoStack).toHaveLength(1) // 历史仍在（未被提前清）
    } finally {
      release()
    }
    expect(await undoing).toBe(true)
    await expect(preparing).resolves.toBe(true)
    expect(settled).toBe(true)
  })
})

describe('[回炉 W-B2·R-B2] quit closing 时的拖拽落位（P1）', () => {
  it('P1：态一有界 settle 的落位必须写入原会话并落库，不得被 quit 冻结门吞掉后按 clean 回执', async () => {
    dragIntoStateOne()
    setQuitClosing(true)
    const quit = runQuitFlush()
    await settle()
    fireEnd(cardOf('A')) // flight 完成（jsdom 无真过渡——事件驱动）
    const stillDirty = await quit
    expect(entry().data.undoStack).toHaveLength(1) // 落位=一复合单元（applyObstacleReroute）
    expect(stubApi.lineage.patchNode).toHaveBeenCalled() // 落位数据写已落库（不是被闸吞掉）
    expect(entry().data.queue).toEqual([])
    expect(entry().data.saveStatus).toBe('clean')
    expect(stillDirty).toBe(false) // clean 回执以「落位确已落库」为前提
  })
})
