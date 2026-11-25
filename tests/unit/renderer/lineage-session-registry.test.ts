// @vitest-environment jsdom
/**
 * [B4 L2 / 设计稿 §2.3/§8.1/§2.5 #32-#36、§12.2 lineage-session-ui·rr14·b2-remount 行]
 * lineage-session-registry —— per-folder 会话挂起锁定合约面（store 公开 API 驱动；
 * 夹具=api 桩——断言全部经 useLineageStore/useLineageViewStore 现值）。
 * always-active 裸 describe（K3）。
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
import { useLineageViewStore } from '../../../src/renderer/features/lineage/lineage-view.store'
import { echoHistoryUnit } from '../../utils/lineage-history-stub'
import { defaultLineTypeNames, type LineageNode } from '../../../src/shared/models/lineage'
import type { LineageGraphRes } from '../../../src/shared/ipc/schemas'

const MAIN = '__main__'

function node(id: string, folderId: string = MAIN, patch: Partial<LineageNode> = {}): LineageNode {
  return {
    id,
    paperId: `paper-${id}`,
    title: `节点${id}`,
    year: 2020,
    x: 1,
    y: 1,
    month: null,
    slot: null,
    folderId,
    createdAt: 't',
    updatedAt: 't',
    ...patch
  }
}

function graphOf(nodes: LineageNode[]): LineageGraphRes {
  return { nodes, edges: [], paperMetrics: {}, pubNos: {}, tagNames: {}, lineTypeNames: defaultLineTypeNames(), floatingNotes: [] }
}

const graphs: Record<string, () => Promise<{ ok: true; data: LineageGraphRes } | { ok: false; error: { code: string; message: string } }>> = {}

const settle = async (turns = 8): Promise<void> => {
  for (let i = 0; i < turns; i++) await Promise.resolve()
}

const state = () => useLineageStore.getState()
const ids = (): string[] => state().nodes.map((n) => n.id)

beforeEach(() => {
  for (const fn of Object.values(stubApi.lineage)) fn.mockReset()
  graphs[MAIN] = async () => ({ ok: true, data: graphOf([node('A1')]) })
  graphs['f-b'] = async () => ({ ok: true, data: graphOf([node('B1', 'f-b')]) })
  stubApi.lineage.graph.mockImplementation(async (req: { folderId: string }) => (graphs[req.folderId] ?? (async () => ({ ok: true as const, data: graphOf([]) })))())
  stubApi.lineage.patchNode.mockImplementation(async (req: Partial<LineageNode>) =>
    ({ ok: true, data: { ...node(req.id ?? 'X'), ...req, updatedAt: 'server' } })
  )
  stubApi.lineage.historyUnit.mockImplementation(echoHistoryUnit)
  useLineageStore.setState({
    nodes: [node('A1')],
    edges: [],
    floatingNotes: [],
    paperMetrics: {},
    pubNos: {},
    tagNames: {},
    status: 'ready',
    error: null,
    saveStatus: 'clean',
    lastWriteError: null,
    queue: [],
    flushing: false,
    inflight: null,
    needsReload: false,
    undoStack: [],
    redoStack: [],
    unfinalized: false,
    editRevision: 0,
    folderId: MAIN
  })
  useLineageViewStore.setState({ mode: 'browse', focusSet: [], tool: 'select', paletteFor: null })
})

describe('folder 切换 flush-first（§2.5 #32、§8.1 同步段四步）', () => {
  it('A 有待写→切换同步段：activeFolder 即切 B（不等 flush 回执）；A 的落库随即发出且只写 A', async () => {
    state().moveNode('A1', 10, 10) // A：Q=1
    expect(stubApi.lineage.patchNode).not.toHaveBeenCalled()
    state().setFolder('f-b')
    expect(state().folderId).toBe('f-b') // activeFolder 同步变 B
    await settle()
    expect(stubApi.lineage.patchNode).toHaveBeenCalledTimes(1)
    expect(stubApi.lineage.patchNode.mock.calls[0]![0]).toMatchObject({ id: 'A1', x: 10, y: 10 })
    expect(ids()).toEqual(['B1'])
    expect(stubApi.lineage.graph).toHaveBeenCalledWith({ folderId: 'f-b' })
  })

  it('saving 不禁切：A 的 flush 在飞时切 B——立即切换；A 的迟到回显不写 B', async () => {
    let release!: (v: { ok: true; data: LineageNode }) => void
    stubApi.lineage.patchNode.mockImplementationOnce(() => new Promise((r) => (release = r)))
    state().moveNode('A1', 10, 10)
    void state().save()
    await settle()
    expect(state().flushing).toBe(true) // A 在飞（RR14 窗口）
    state().setFolder('f-b')
    expect(state().folderId).toBe('f-b')
    await settle()
    expect(ids()).toEqual(['B1'])
    release({ ok: true, data: node('A1', MAIN, { x: 10, y: 10 }) })
    await settle()
    expect(ids()).toEqual(['B1']) // 迟到回显只回写 A 会话
    expect(state().queue).toEqual([])
    expect(state().flushing).toBe(false)
  })

  it('同值重选=既有会话：零 graph IPC、图态不变（§8.3 返回不双取）', async () => {
    stubApi.lineage.graph.mockClear()
    state().setFolder(MAIN)
    await settle()
    expect(stubApi.lineage.graph).not.toHaveBeenCalled()
    expect(ids()).toEqual(['A1'])
  })

  it('B error 不污染 A：B 读失败驻 B 会话；返回 A=原图 ready，A 不重取', async () => {
    graphs['f-b'] = async () => ({ ok: false, error: { code: 'DB_ERROR', message: '图乙读失败' } })
    state().setFolder('f-b')
    await settle()
    expect(state().status).toBe('error')
    expect(state().error).toBe('图乙读失败')
    const calls = stubApi.lineage.graph.mock.calls.length
    state().setFolder(MAIN)
    await settle()
    expect(state().status).toBe('ready')
    expect(state().error).toBeNull()
    expect(ids()).toEqual(['A1'])
    expect(stubApi.lineage.graph.mock.calls.length).toBe(calls) // A 有内存会话→不 graph IPC
  })

  it('迟到 A graph 不写 B：A 读在途时切 B，A 的响应只落 A 会话；返回 A 不重取（§8.3/#19）', async () => {
    let releaseMain!: (v: { ok: true; data: LineageGraphRes }) => void
    graphs[MAIN] = () => new Promise((r) => (releaseMain = r))
    useLineageStore.setState({ status: 'loading' })
    void state().load() // A 读在途
    state().setFolder('f-b')
    await settle()
    expect(ids()).toEqual(['B1'])
    releaseMain({ ok: true, data: graphOf([node('A1', MAIN, { x: 7, y: 7 })]) })
    await settle()
    expect(ids()).toEqual(['B1']) // B 不被 A 的响应改写
    const calls = stubApi.lineage.graph.mock.calls.length
    state().setFolder(MAIN)
    await settle()
    expect(ids()).toEqual(['A1'])
    expect(state().nodes[0]?.x).toBe(7) // A 的迟到响应已落 A 会话
    expect(state().status).toBe('ready')
    expect(stubApi.lineage.graph.mock.calls.length).toBe(calls) // 返回 A：不重取
  })
})

describe('切图挂起：每图 U/历史/focusSet 驻留（§2.3、§2.5 #32/#33）', () => {
  it('A 编辑→切 B→编辑→返回 A：两图 undo 栈各自驻留、返回不重取；A/B 分别 undo 互不串图', async () => {
    state().moveNode('A1', 10, 10)
    expect(state().undoStack).toHaveLength(1)
    state().setFolder('f-b')
    await settle()
    expect(state().undoStack).toHaveLength(0) // B 新会话 H/R 空
    expect(state().unfinalized).toBe(false)
    state().moveNode('B1', 20, 20)
    expect(state().undoStack).toHaveLength(1)
    const graphCalls = stubApi.lineage.graph.mock.calls.length
    state().setFolder(MAIN)
    await settle()
    expect(state().folderId).toBe(MAIN)
    expect(state().undoStack).toHaveLength(1) // A 历史恢复
    expect(state().unfinalized).toBe(true) // A 的 U 恢复
    expect(state().nodes[0]).toMatchObject({ id: 'A1', x: 10, y: 10 })
    expect(stubApi.lineage.graph.mock.calls.length).toBe(graphCalls) // 返回不双取
    // A 分别 undo：A1 回原位（B 不动）
    expect(await state().undo()).toBe(true)
    expect(state().nodes[0]).toMatchObject({ id: 'A1', x: 1, y: 1 })
    expect(state().redoStack).toHaveLength(1)
    state().setFolder('f-b')
    await settle()
    expect(state().nodes[0]).toMatchObject({ id: 'B1', x: 20, y: 20 }) // B 未被 A 的 undo 波及
    expect(state().undoStack).toHaveLength(1)
    expect(await state().undo()).toBe(true)
    expect(state().nodes[0]).toMatchObject({ id: 'B1', x: 1, y: 1 })
  })

  it('focusSet 按图挂起：A 聚焦集在 A 返回时恢复；B 显示自身（空）集——切图不清其他图', async () => {
    useLineageViewStore.setState({ mode: 'focus' })
    useLineageViewStore.getState().toggleFocus('A1')
    expect(useLineageViewStore.getState().focusSet).toEqual(['A1'])
    state().setFolder('f-b')
    await settle()
    expect(useLineageViewStore.getState().focusSet).toEqual([]) // B 自身集
    expect(useLineageViewStore.getState().mode).toBe('focus') // 模式保持
    state().setFolder(MAIN)
    await settle()
    expect(useLineageViewStore.getState().focusSet).toEqual(['A1'])
  })
})

describe('改键=新身份（§2.3 sessionGeneration、§2.5 #19/#35、§2.6 #43——[回炉 W-B1·R-B4]）', () => {
  it('改键=换新身份：注册表键与 data.folderId 一致、代际已变、旧身份离场', async () => {
    let calls = 0
    stubApi.lineage.graph.mockImplementation((req: { folderId: string }) => {
      calls += 1
      if (calls === 1) return new Promise<{ ok: true; data: LineageGraphRes }>(() => undefined) // f-a 首读挂起
      return Promise.resolve({ ok: true as const, data: graphOf([node('B-NEW', req.folderId)]) })
    })
    useLineageStore.setState({ folderId: 'f-a', status: 'loading', nodes: [], queue: [], inflight: null, flushing: false })
    void state().load() // f-a 首读在途
    await settle()
    expect(stubApi.lineage.graph).toHaveBeenCalledWith({ folderId: 'f-a' })
    const generationBefore = lineageRegistry.entry('f-a')!.data.sessionGeneration
    useLineageStore.setState({ folderId: 'f-b', status: 'loading', nodes: [], queue: [], inflight: null, flushing: false })
    // 改键=换新身份：注册表键与 data.folderId 一致，代际已变，旧身份离场
    expect(lineageRegistry.entry('f-b')?.key).toBe('f-b')
    expect(lineageRegistry.entry('f-b')?.data.folderId).toBe('f-b')
    expect(lineageRegistry.entry('f-b')?.data.sessionGeneration).not.toBe(generationBefore)
    expect(lineageRegistry.entry('f-a')).toBeUndefined()
  })

  it('在读途中改键：旧文件夹的迟到响应不写改键后的会话（按身份键丢弃）；按新身份续拉', async () => {
    let releaseA!: (v: { ok: true; data: LineageGraphRes }) => void
    let calls = 0
    stubApi.lineage.graph.mockImplementation((req: { folderId: string }) => {
      calls += 1
      if (calls === 1) return new Promise((r) => (releaseA = r))
      return Promise.resolve({ ok: true as const, data: graphOf([node('B-NEW', req.folderId)]) })
    })
    useLineageStore.setState({ folderId: 'f-a', status: 'loading', nodes: [], queue: [], inflight: null, flushing: false })
    const loading = state().load() // f-a 首读在途
    await settle()
    expect(stubApi.lineage.graph).toHaveBeenCalledWith({ folderId: 'f-a' })
    useLineageStore.setState({ folderId: 'f-b', status: 'loading', nodes: [], queue: [], inflight: null, flushing: false })
    expect(stubApi.lineage.graph).toHaveBeenCalledTimes(2) // 按新身份续拉（f-b 的读已发出）
    releaseA({ ok: true, data: graphOf([node('A-OLD', 'f-a')]) }) // 旧文件夹的迟到响应
    await loading
    await settle()
    expect(state().folderId).toBe('f-b')
    expect(state().nodes.map((n) => n.id)).toEqual(['B-NEW']) // 迟到响应丢弃；落的是 f-b 的图
    expect(state().status).toBe('ready')
  })

  it('另一文件夹持待写队列：活动会话改键不动它——队列原样保留并照常落库', async () => {
    lineageRegistry.ensure('f-b') // 挂起会话 f-b（update 只写既有会话——先建）
    lineageRegistry.update('f-b', { nodes: [node('B1', 'f-b')], status: 'ready' })
    lineageRegistry.lane('f-b').commands.moveNode('B1', 20, 20) // f-b：Q=1（idle timer 未到——未 flush）
    const queued = lineageRegistry.entry('f-b')!.data.queue
    expect(queued).toHaveLength(1)
    useLineageStore.setState({ folderId: 'f-x' }) // 活动会话（主图）改键
    expect(state().folderId).toBe('f-x')
    expect(stubApi.lineage.patchNode).not.toHaveBeenCalled() // 改键本身不触发 f-b 的写
    expect(lineageRegistry.entry('f-b')?.data.queue).toBe(queued) // 队列引用原样
    await lineageRegistry.lane('f-b').save() // 照常落库
    expect(stubApi.lineage.patchNode).toHaveBeenCalledTimes(1)
    expect(stubApi.lineage.patchNode.mock.calls[0]![0]).toMatchObject({ id: 'B1', x: 20, y: 20 })
    expect(lineageRegistry.entry('f-b')?.data.saveStatus).toBe('clean')
    expect(ids()).toEqual(['A1']) // 改键后的活动会话图态不被 f-b 的回显波及
  })

  it('单一写路径守卫：携异键 folderId 的 patch 不落会话（注册表键=data.folderId 恒等）', () => {
    lineageRegistry.update(MAIN, { folderId: 'f-other', needsReload: true })
    const entry = lineageRegistry.entry(MAIN)!
    expect(entry.data.folderId).toBe(MAIN)
    expect(entry.data.needsReload).toBe(false) // 整条身份越界的 patch 拒收
    expect(state().folderId).toBe(MAIN)
  })
})

// ── [回炉 W-D1·T-B02] 设计稿 §12.2 行 786 增补：「显式清空只清当前图」的独立判别例（§2.3 focusSet 行、
//    §14 终裁 2）。既有「focusSet 按图挂起」例只覆盖切图不清其他图；本段覆盖显式清空的两个消费面
//    （恢复载入=view.store.clearFocus；ghost 降级=registry.clearFocusOf）各自只作用于目标图。
describe('显式清空 focusSet 只清当前图（§2.3 focusSet 行、§14 终裁 2——[回炉 W-D1]）', () => {
  const view = () => useLineageViewStore.getState()
  /** 主图（活动）聚焦 [A1]、f-b 挂起且聚焦 [B1]——两图各有聚焦集，活动图=主图 */
  const seedFocusBoth = async (): Promise<void> => {
    useLineageViewStore.setState({ mode: 'focus' })
    view().toggleFocus('A1')
    state().setFolder('f-b')
    await settle()
    view().toggleFocus('B1')
    state().setFolder(MAIN)
    await settle()
    expect(view().focusSet).toEqual(['A1']) // 前提：返回主图=自身集恢复
  }

  it('恢复载入·目标=活动图：活动图聚焦集清空、模式保持；另一挂起图的聚焦集原样驻留，被清的图不复活', async ({ onTestFinished }) => {
    const { resetLineageSessionsForTests } = await import('./lineage-test-session-reset')
    onTestFinished(() => resetLineageSessionsForTests()) // 本段新建挂起会话——用后清出，不跨例残留
    await seedFocusBoth()
    expect(lineageRegistry.focusSetOf('f-b')).toEqual(['B1'])
    const generationBefore = lineageRegistry.entry(MAIN)!.data.sessionGeneration
    state().applyRecoverySession({ folderId: MAIN, graph: graphOf([node('A1')]), queue: [], draft: null })
    expect(state().folderId).toBe(MAIN) // 目标=活动图：路由不变
    expect(lineageRegistry.entry(MAIN)!.data.sessionGeneration).toBeGreaterThan(generationBefore) // 恢复替换=新代际
    expect(view().focusSet, '显式清空作用于活动图').toEqual([])
    expect(view().mode, '模式保持（切图≠退出聚焦模式）').toBe('focus')
    state().setFolder('f-b')
    await settle()
    expect(view().focusSet, '另一图的聚焦集不被显式清空波及').toEqual(['B1'])
    state().setFolder(MAIN)
    await settle()
    expect(view().focusSet, '被清的图不复活').toEqual([])
  })

  it('恢复载入·目标≠活动图（各有聚焦集）：路由到目标并清目标图的聚焦集；原活动图的聚焦集挂起驻留，返回恢复', async ({ onTestFinished }) => {
    const { resetLineageSessionsForTests } = await import('./lineage-test-session-reset')
    onTestFinished(() => resetLineageSessionsForTests())
    await seedFocusBoth() // 主图活动 [A1]、f-b 挂起 [B1]
    const mainGeneration = lineageRegistry.entry(MAIN)!.data.sessionGeneration
    state().applyRecoverySession({ folderId: 'f-b', graph: graphOf([node('B1', 'f-b')]), queue: [], draft: null })
    expect(state().folderId).toBe('f-b') // 路由到恢复目标
    expect(view().focusSet, '目标图的聚焦集已清').toEqual([])
    expect(view().mode).toBe('focus')
    expect(lineageRegistry.entry(MAIN)!.data.sessionGeneration, '其他 folder 不动：会话未替换').toBe(mainGeneration)
    state().setFolder(MAIN)
    await settle()
    expect(view().focusSet, '原活动图的聚焦集驻留').toEqual(['A1'])
  })

  it('registry.clearFocusOf（ghost 降级消费面）按图清：清挂起图不动活动图的聚焦集；清活动图不动挂起图的聚焦集', async ({ onTestFinished }) => {
    const { resetLineageSessionsForTests } = await import('./lineage-test-session-reset')
    onTestFinished(() => resetLineageSessionsForTests())
    await seedFocusBoth() // 主图活动 [A1]、f-b 挂起 [B1]
    lineageRegistry.clearFocusOf('f-b') // 挂起图被矫正到主图：只清该图
    expect(lineageRegistry.focusSetOf('f-b')).toEqual([])
    expect(view().focusSet, '活动图的聚焦集不动').toEqual(['A1'])
    state().setFolder('f-b')
    await settle()
    view().toggleFocus('B1') // f-b 重新持有聚焦集 [B1]；随后切回主图使其挂起
    state().setFolder(MAIN)
    await settle()
    // [B5 设计稿 §5 C3 断言翻转] 原用不存在的节点 id 'B2' 聚焦并断言其跨挂起存活——锁的是死 id 缺陷本身；
    // 挂起前按离场图 nodes 剪枝后死 id 不再残留，改用 f-b 图内真实节点（意图不变：挂起集合跨切换存活）
    expect(lineageRegistry.focusSetOf('f-b')).toEqual(['B1'])
    lineageRegistry.clearFocusOf(MAIN) // 活动图被矫正：只清活动图
    expect(view().focusSet).toEqual([])
    expect(view().mode).toBe('focus')
    expect(lineageRegistry.focusSetOf('f-b'), '挂起图的聚焦集不动').toEqual(['B1'])
  })
})
