// @vitest-environment jsdom
/**
 * [回炉 W-B2·R-B2 / 设计稿 §2.5 #30/#32/#37、§9.2「quit/workspace 全量 flush」行、§9.3、
 * §12.2 quit-gate 行「内部 flush 放行」] 拖拽落位的内部 settle 写路径——落位数据写不得被普通
 * 用户编辑闸（quit/recovery/conflict 冻结、同会话 saving 锁）静默吞掉。
 *
 * 锁链（真实 LineageTimeline 拖拽链：card-drag-session→useCardDrag 桥接→store.reorderMonthSlots）：
 * - 态二（FlightJob 已建）quit：await settleFlight 句柄后落位写入原会话并由退出握手落库；
 * - 落位写失败计入 stillDirty（error+队首保留），不得静默算 clean；
 * - recovery 冻结 / conflict 挂起期落位照常成单元入队（冻结闸只拦新用户交互，不拦有界收口的数据写），
 *   随后由 idle-flush 落库；
 * - 同会话写链忙时落位串行：排在在途任务之后入队，不丢；
 * - 会话已失效（恢复替换）＝丢弃并提示，不写新会话（回归守卫）；
 * - 页面切换的态一出口同走该路径（回归守卫）。
 * 落位写自身留在暂存（Q=1）：落库由出口紧随其后的 flush 或 idle timer 承担（lineage-drag-twostate
 * 既有合约「落位后队列非空」不回归）。fake timer 真实计时 1_500（IDLE_FLUSH_MS 单源）。
 * always-active 裸 describe（K3）。（jsdom 零布局：flight 走零位移立即落定分支。）
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { IDLE_FLUSH_MS } from '@shared/constants'
import { makeApiStub, toastStoreSpy } from '../../utils/api-client-mock'
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
import { initRecoveryScheduler, resetRecoveryScheduler } from '../../../src/renderer/features/lineage/recoveryScheduler'
import {
  requestGhostFolderDecision,
  resetConflictResolution,
  resolveGhostFolderDecision
} from '../../../src/renderer/features/lineage/conflictResolution'
import { runQuitFlush } from '../../../src/renderer/app/quit-flush'
import { switchViewWithFlush } from '../../../src/renderer/app/view-flush'
import { setQuitClosing } from '../../../src/renderer/app/quit-closing-gate'
import { useNotesStore } from '../../../src/renderer/features/notes/notes.store'
import { useReaderStore } from '../../../src/renderer/features/reader/state/reader.store'
import { defaultLineTypeNames, MAIN_GRAPH_ID, type LineageNode } from '../../../src/shared/models/lineage'
import type { LineageGraphRes } from '../../../src/shared/ipc/schemas'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

const MAIN = MAIN_GRAPH_ID
const LANDED_TOAST = '拖拽调整的目标图已不在当前会话，本次落位未写入'

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
const patchOk = async (req: Partial<LineageNode>) => ({ ok: true as const, data: { ...node(String(req.id)), ...req, updatedAt: 'server' } })

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
const advance = async (ms: number): Promise<void> => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
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
/** 态一→态二：松手建 FlightJob（settleFlight 句柄在场） */
function releaseIntoStateTwo(): void {
  pUp(350, 40)
  expect(lineageRegistry.dragPending(MAIN)).toBe(true) // 态二在场（FlightJob 已建、飞行未完成）
}
/** 不经退出/切换出口的常规松手落位（非 closing——对照与「链忙」例的落位入口） */
function landNormally(): void {
  dragIntoStateOne()
  releaseIntoStateTwo()
  fireEnd(cardOf('A'))
}

beforeEach(() => {
  vi.useFakeTimers()
  rafs = []
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback): number => {
    rafs.push(cb)
    return rafs.length
  })
  vi.stubGlobal('cancelAnimationFrame', () => undefined)
  for (const fn of Object.values(stubApi.lineage)) fn.mockReset()
  stubApi.lineage.graph.mockResolvedValue({ ok: true, data: graphOf([node('B1', 'f-b')]) })
  stubApi.lineage.patchNode.mockImplementation(patchOk)
  stubApi.recovery.save.mockResolvedValue({ ok: true, data: { status: 'saved', token: 'tok', epoch: 0 } })
  stubApi.recovery.release.mockResolvedValue({ ok: true, data: { status: 'released', epoch: 1 } })
  toastStoreSpy.mockClear()
  setQuitClosing(false)
  resetConflictResolution()
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
  resetConflictResolution()
  resetRecoveryScheduler()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('退出握手中的落位（§9.3 两态出口）', () => {
  it('态二（FlightJob 已建）：quit 等待 settleFlight 句柄→落位写入原会话并由退出握手落库→clean 回执', async () => {
    dragIntoStateOne()
    releaseIntoStateTwo()
    setQuitClosing(true)
    const quit = runQuitFlush()
    await settle()
    fireEnd(cardOf('A')) // 飞行完成（jsdom 无真过渡——事件驱动）
    const stillDirty = await quit
    expect(entry().data.undoStack).toHaveLength(1) // 落位=一复合单元
    expect(stubApi.lineage.patchNode).toHaveBeenCalled()
    expect(entry().data.queue).toEqual([])
    expect(entry().data.saveStatus).toBe('clean')
    expect(stillDirty).toBe(false)
  })

  it('落位写失败计入 stillDirty：error+队首保留，不得静默算 clean', async () => {
    stubApi.lineage.patchNode.mockResolvedValue({ ok: false, error: { code: 'DB_ERROR', message: '落位落库失败' } })
    dragIntoStateOne()
    setQuitClosing(true)
    const quit = runQuitFlush()
    await settle()
    fireEnd(cardOf('A'))
    const stillDirty = await quit
    expect(entry().data.undoStack).toHaveLength(1) // 落位已成编辑单元（未被闸吞）
    expect(stubApi.lineage.patchNode).toHaveBeenCalled() // 确曾尝试落库
    expect(entry().data.saveStatus).toBe('error')
    expect(entry().data.queue.length).toBeGreaterThan(0) // 失败写保留
    expect(stillDirty, '落位未落库=仍有未落库写').toBe(true)
  })

  it('会话已失效（恢复替换）：松手后的落位丢弃并提示，不写新会话（回归守卫）', async () => {
    dragIntoStateOne()
    act(() => {
      state().applyRecoverySession({
        folderId: MAIN,
        graph: { nodes: [node('A'), node('B'), node('C')], edges: [], lineTypeNames: defaultLineTypeNames(), floatingNotes: [] },
        queue: [],
        draft: null
      })
    })
    const generation = entry().data.sessionGeneration
    pUp(350, 40)
    fireEnd(cardOf('A'))
    await settle()
    expect(entry().data.sessionGeneration).toBe(generation)
    expect(entry().data.undoStack).toHaveLength(0)
    expect(entry().data.queue).toEqual([])
    expect(stubApi.lineage.patchNode).not.toHaveBeenCalled()
    expect(toastStoreSpy).toHaveBeenCalledWith(LANDED_TOAST, 'error')
  })
})

describe('冻结闸不拦有界收口的数据写', () => {
  it('recovery 冻结期：落位照常成单元入队，随 idle-flush 落库（闸只拦新用户编辑）', async () => {
    initRecoveryScheduler({
      workspaceId: () => 'ws-1',
      snapshot: () => null,
      loadPayload: () => undefined,
      onRestored: () => undefined,
      openLineageView: () => undefined,
      discardLoadedSession: () => undefined
    }) // 装配即冻结（开门权唯一归 enterWorkspaceRecovery）
    state().moveNode('A', 5, 5)
    expect(state().queue).toHaveLength(0) // 前提：冻结期新用户编辑被拒
    landNormally()
    expect(entry().data.undoStack, '落位不被 recovery 冻结门吞').toHaveLength(1)
    expect(entry().data.queue.length).toBeGreaterThan(0)
    await advance(IDLE_FLUSH_MS)
    await settle()
    expect(stubApi.lineage.patchNode).toHaveBeenCalled()
    expect(entry().data.saveStatus).toBe('clean')
  })

  it('conflict 挂起期：落位照常成单元入队，随 idle-flush 落库', async () => {
    const waiting = requestGhostFolderDecision('f-ghost')
    state().moveNode('A', 5, 5)
    expect(state().queue).toHaveLength(0) // 前提：挂起期新用户编辑被拒
    landNormally()
    expect(entry().data.undoStack).toHaveLength(1)
    await advance(IDLE_FLUSH_MS)
    await settle()
    expect(stubApi.lineage.patchNode).toHaveBeenCalled()
    expect(entry().data.saveStatus).toBe('clean')
    resolveGhostFolderDecision('discard')
    await waiting
  })
})

describe('同会话写链串行', () => {
  it('链忙（前一写 IPC 在途）时落位：排在在途任务之后入队，不丢；随后照常落库', async () => {
    let release: ((v: { ok: true; data: LineageNode }) => void) | null = null
    stubApi.lineage.patchNode.mockImplementationOnce(() => new Promise((r) => { release = r })) // 首写 IPC 挂起
    act(() => {
      state().moveNode('A', 5, 5) // 先入暂存
      void state().save() // 写 IPC 挂起——链忙
    })
    await settle()
    expect(stubApi.lineage.patchNode).toHaveBeenCalledTimes(1)
    landNormally() // 落位到达时会话链忙
    expect(entry().data.undoStack).toHaveLength(1) // 链在途：落位尚未应用（排在在途任务之后）
    release!({ ok: true, data: { ...node('A'), x: 5, y: 5, updatedAt: 'server' } })
    await settle(40)
    expect(entry().data.undoStack, '链忙时的落位不得被 saving 锁吞掉').toHaveLength(2) // moveNode + 落位
    expect(entry().data.queue.length).toBeGreaterThan(0) // 落位写在暂存
    const callsBefore = stubApi.lineage.patchNode.mock.calls.length
    await advance(IDLE_FLUSH_MS)
    await settle()
    expect(stubApi.lineage.patchNode.mock.calls.length).toBeGreaterThan(callsBefore) // 落位的写在前写之后发送
    expect(entry().data.queue).toEqual([])
    expect(entry().data.saveStatus).toBe('clean')
  })

  it('对照：链空闲时落位立即成编辑单元（暂存 Q=1）；其后的收口触发落库', async () => {
    landNormally()
    await settle() // settle 任务起步/收尾的微任务落定
    expect(entry().data.undoStack).toHaveLength(1)
    expect(entry().data.queue.length).toBeGreaterThan(0)
    expect(entry().data.saveStatus).toBe('dirty')
    expect(stubApi.lineage.patchNode).not.toHaveBeenCalled()
    await act(async () => {
      await lineageRegistry.lane(MAIN).save()
    })
    expect(stubApi.lineage.patchNode).toHaveBeenCalled()
    expect(entry().data.saveStatus).toBe('clean')
  })
})

describe('页面切换的态一出口（§2.5 #30）', () => {
  it('离场 lineage：有界 settle 的落位写入原会话并 fire flush（不阻路由）', async () => {
    dragIntoStateOne()
    const setView = vi.fn()
    act(() => { switchViewWithFlush('lineage', 'library', setView) })
    expect(setView).toHaveBeenCalledWith('library') // 不等回执不阻路由
    await settle()
    fireEnd(cardOf('A'))
    await settle(40)
    expect(entry().data.undoStack).toHaveLength(1)
    expect(stubApi.lineage.patchNode).toHaveBeenCalled()
    expect(entry().data.saveStatus).toBe('clean')
  })
})
