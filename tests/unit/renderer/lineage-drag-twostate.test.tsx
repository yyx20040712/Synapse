// @vitest-environment jsdom
/**
 * [B4 L2 / 设计稿 §9.3、§2.5 #32/#37、§11.2 B3 行] lineage-drag-twostate —— 拖拽两态
 * 四出口锁定（态一 pending/dragging=有界 settle；态二 settle-flight=await 句柄）+
 * 写归属身份（folder+generation+drag id）。
 * always-active 裸 describe（K3）。（jsdom 零布局：flight 走零位移立即落定分支。）
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub } from '../../utils/api-client-mock'
import { stubRowFollowFlow } from '../../utils/live-frame'
import type { LineageNode } from '../../../src/shared/models/lineage'
import { LineageTimeline } from '../../../src/renderer/features/lineage/LineageTimeline'
import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'
import { useLineageViewStore } from '../../../src/renderer/features/lineage/lineage-view.store'
import { lineageRegistry } from '../../../src/renderer/features/lineage/lineage-session-registry'

const stubApi = makeApiStub({
  lineage: { graph: vi.fn(), patchNode: vi.fn(), upsertEdge: vi.fn(), removeEdge: vi.fn(), upsertLineTypes: vi.fn(), upsertFloatingNote: vi.fn(), removeFloatingNote: vi.fn(), historyUnit: vi.fn() }
})

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

const MAIN = '__main__'

function node(id: string, patch: Partial<LineageNode> = {}): LineageNode {
  return { id, paperId: `paper-${id}`, title: `节点${id}`, year: 2022, x: null, y: null, month: 9, slot: null, folderId: MAIN, createdAt: 't', updatedAt: 't', ...patch }
}

let root: Root | null = null
let host: HTMLDivElement | null = null
const cardOf = (id: string): HTMLElement => (host?.querySelector(`.tl-card[data-node-id="${id}"]`) ?? null) as HTMLElement
const settle = async (turns = 10): Promise<void> => {
  for (let i = 0; i < turns; i++) await act(async () => { await Promise.resolve() })
}
const pDown = (el: Element, x: number, y: number): void => {
  act(() => { el.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: x, clientY: y })) })
}
const pMove = (x: number, y: number): void => {
  act(() => { document.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: x, clientY: y })) })
}

function mount(nodes: LineageNode[]): void {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root?.render(
      <LineageTimeline
        nodes={nodes}
        edges={[]}
        onReorderMonthSlots={(ids, target) => {
          useLineageStore.getState().reorderMonthSlots(target, ids)
        }}
      />
    )
  })
}

let rafs: FrameRequestCallback[] = []
const flushRaf = (): void => {
  act(() => {
    rafs.splice(0).forEach((cb) => cb(performance.now()))
  })
}
const fireEnd = (el: Element): void => {
  act(() => {
    el.dispatchEvent(Object.assign(new Event('transitionend'), { propertyName: 'translate' }))
  })
}

beforeEach(() => {
  rafs = []
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback): number => {
    rafs.push(cb)
    return rafs.length
  })
  vi.stubGlobal('cancelAnimationFrame', () => undefined)
  for (const fn of Object.values(stubApi.lineage)) fn.mockReset()
  stubApi.lineage.graph.mockResolvedValue({ ok: true, data: { nodes: [node('B1', { folderId: 'f-b' })], edges: [], floatingNotes: [] } })
  stubApi.lineage.patchNode.mockImplementation(async (req: Partial<LineageNode>) => ({ ok: true, data: { ...node(String(req.id)), ...req, updatedAt: 'server' } }))
  useLineageStore.setState({
    nodes: [node('A'), node('B'), node('C')], edges: [], floatingNotes: [], status: 'ready', error: null,
    saveStatus: 'clean', lastWriteError: null, queue: [], flushing: false, inflight: null, needsReload: false,
    undoStack: [], redoStack: [], unfinalized: false, editRevision: 0, folderId: MAIN
  })
  useLineageViewStore.setState({ mode: 'edit', tool: 'select', paletteFor: null, focusSet: [] })
})

afterEach(() => {
  act(() => { root?.unmount() })
  root = null
  host?.remove()
  host = null
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

const sessionA = () => lineageRegistry.entry(MAIN)

describe('§9.3 两态登记与有界 settle 出口', () => {
  it('态一（激活未松手）：registry.dragPending=true；awaitDragSettle 请求有界 settle→落位数据写落原会话→两态清', async () => {
    mount([node('A'), node('B'), node('C')])
    stubRowFollowFlow((host?.querySelector('.month-frame') ?? null) as HTMLElement)
    expect(lineageRegistry.dragPending(MAIN)).toBe(false)
    pDown(cardOf('A'), 60, 40)
    pMove(66, 44)
    flushRaf() // 激活帧
    pMove(350, 40) // 插位=B 后 C 前（lastClient 判定链输入）
    flushRaf()
    expect(lineageRegistry.dragPending(MAIN)).toBe(true) // 态一在场
    const p = lineageRegistry.awaitDragSettle(MAIN) // quit/切换/页面离场出口（pointercancel 同型）
    await settle() // settle 提交（FlightJob 已建→转态二）
    fireEnd(cardOf('A')) // flight 完成（jsdom 无真过渡——事件驱动；真机=transitionend/600ms 兜底）
    await p
    await settle()
    expect(lineageRegistry.dragPending(MAIN)).toBe(false)
    const entry = sessionA()!
    expect(entry.data.undoStack).toHaveLength(1) // 落位写=一复合单元（applyObstacleReroute）
    expect(entry.data.queue.length).toBeGreaterThan(0)
  })

  it('态一 folder 切换：有界 settle 落位写只到原会话 A——B 零污染（新会话 undo=0/queue=0）', async () => {
    mount([node('A'), node('B'), node('C')])
    stubRowFollowFlow((host?.querySelector('.month-frame') ?? null) as HTMLElement)
    pDown(cardOf('A'), 60, 40)
    pMove(66, 44)
    flushRaf()
    pMove(350, 40)
    flushRaf()
    expect(lineageRegistry.dragPending(MAIN)).toBe(true)
    useLineageStore.getState().setFolder('f-b') // 切换（setFolder 内请求有界 settle）
    await settle() // settle 提交（B 投影换图——A 的卡脱离活动 DOM）
    fireEnd(cardOf('A')) // A 的 flight 完成（脱离流——真机=600ms 兜底/transitionend）
    await lineageRegistry.awaitDragSettle(MAIN)
    await settle()
    expect(useLineageStore.getState().folderId).toBe('f-b')
    expect(useLineageStore.getState().undoStack).toHaveLength(0) // B 新会话
    expect(useLineageStore.getState().queue).toHaveLength(0)
    const a = sessionA()!
    expect(a.data.undoStack).toHaveLength(1) // 落位写落 A
    expect(stubApi.lineage.patchNode).toHaveBeenCalled() // 切换的补位 flush-first 已把 A 的落位写发出
  })

  it('写归属身份：拖拽激活后会话被恢复替换（generation 变）→落位写丢弃（reorderMonthSlots=false）', async () => {
    mount([node('A'), node('B'), node('C')])
    await settle()
    pDown(cardOf('A'), 60, 40)
    pMove(66, 44)
    await settle()
    // 会话替换（恢复载入/删除重建同型——新代际）
    lineageRegistry.replace(MAIN, { nodes: [node('A'), node('B'), node('C')], status: 'ready' })
    const stale = { folderId: MAIN, generation: lineageRegistry.entry(MAIN)!.data.sessionGeneration - 1, dragId: 'drag-x' }
    expect(useLineageStore.getState().reorderMonthSlots(stale, ['B', 'A', 'C'])).toBe(false)
    expect(lineageRegistry.entry(MAIN)!.data.undoStack).toHaveLength(0) // 未写新会话
  })

  it('态二（settle-flight 句柄）：awaitDragSettle 等待句柄 resolve（≤600ms 兜底驻 flight 件）', async () => {
    vi.useFakeTimers()
    try {
      // 态二直挂（jsdom 零布局走零位移立即 finish——句柄语义经 registry 面验证）
      lineageRegistry.dragStart(MAIN, 1, 'drag-f')
      let resolveFlight!: () => void
      const flight = new Promise<void>((r) => { resolveFlight = r })
      lineageRegistry.dragFlight(MAIN, 1, 'drag-f', flight)
      expect(lineageRegistry.dragPending(MAIN)).toBe(true)
      let done = false
      void lineageRegistry.awaitDragSettle(MAIN).then(() => { done = true })
      await vi.advanceTimersByTimeAsync(50)
      expect(done).toBe(false) // 未 resolve 不放行
      resolveFlight()
      await vi.advanceTimersByTimeAsync(0)
      expect(done).toBe(true)
      lineageRegistry.dragEnd(MAIN, 1, 'drag-f')
      expect(lineageRegistry.dragPending(MAIN)).toBe(false)
    } finally {
      vi.useRealTimers()
    }
  })

  it('态一等待有界：FlightJob 未建且无 settle 源→注册表侧 600ms 安全界放行（quit 不永挂）', async () => {
    vi.useFakeTimers()
    try {
      lineageRegistry.dragStart(MAIN, 1, 'drag-orphan')
      let done = false
      void lineageRegistry.awaitDragSettle(MAIN).then(() => { done = true })
      await vi.advanceTimersByTimeAsync(599)
      expect(done).toBe(false)
      await vi.advanceTimersByTimeAsync(1)
      expect(done).toBe(true)
      lineageRegistry.dragEnd(MAIN, 1, 'drag-orphan')
    } finally {
      vi.useRealTimers()
    }
  })
})
