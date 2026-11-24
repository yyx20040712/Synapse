// @vitest-environment jsdom
/**
 * [B4 L1 / 设计稿 §2.5 #12-#23、§2.6 10a-10d/13a-13d/20a-20d/34a-34d、§5.1、§6.2]
 * renderer 侧 history-unit：flush-then-unit、finalize 清账、和解链任务。
 * 覆盖：预 drain→history-unit 调用序；预 flush 失败/反向写失败/CONFLICT 不弹栈；
 * needsReload 先和解；响应只增量应用；迟到响应（会话已替换）不写图态；显式保存
 * #20-#23（无 Q 定稿、revision 前进保 U、重复命令拒绝、失败全保留）；CONFLICT
 * 本次不定稿→和解后二次显式保存才定稿（#10）；和解链任务纯编排（单飞复用/epoch
 * 推进/会话切离/读失败）。main 侧事务语义见
 * tests/unit/services/lineage-history-unit.service.test.ts。always-active。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub } from '../../../utils/api-client-mock'
import { echoHistoryUnit } from '../../../utils/lineage-history-stub'

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

import { useLineageStore } from '../../../../src/renderer/features/lineage/lineage.store'
import {
  createReconcileTask,
  resetInflightRead
} from '../../../../src/renderer/features/lineage/lineage-write-conflicts'
import { showToast } from '../../../../src/renderer/shared/ui/toast-store'
import { LINE_TYPE_COLORS, type LineageEdge, type LineageNode } from '../../../../src/shared/models/lineage'
import type { LineageGraphRes } from '../../../../src/shared/ipc/schemas'
import type { LineageHistoryUnitReq } from '../../../../src/shared/ipc/lineage-history.schemas'
import type { LineageHistoryUnitRes } from '../../../../src/shared/ipc/lineage-history.schemas'

function node(id: string, patch: Partial<LineageNode> = {}): LineageNode {
  return {
    id,
    paperId: `paper-${id}`,
    title: `节点${id}`,
    year: 2020,
    x: 0,
    y: 0,
    month: null,
    slot: null,
    folderId: '__main__',
    createdAt: 't0',
    updatedAt: 't0',
    ...patch
  }
}
const edge = (id: string, from: string, to: string): LineageEdge => ({
  id, fromNode: from, toNode: to, label: '', dashed: false, color: LINE_TYPE_COLORS[0], createdAt: 't0', updatedAt: 't0'
})
/** 库态图（graph 单读形） */
const rawGraph = (nodes: LineageNode[], edges: LineageEdge[] = []): LineageGraphRes =>
  ({ nodes, edges, paperMetrics: {}, pubNos: {}, tagNames: {}, lineTypeNames: ['待命名', '待命名', '待命名', '待命名', '待命名', '待命名'], floatingNotes: [] })
/** graph 回包（Result 信封） */
const graphOf = (nodes: LineageNode[], edges: LineageEdge[] = []): { ok: true; data: LineageGraphRes } => ({ ok: true, data: rawGraph(nodes, edges) })

const state = () => useLineageStore.getState()
const settle = async (turns = 10): Promise<void> => {
  for (let i = 0; i < turns; i++) await Promise.resolve()
}
const unitCalls = (): LineageHistoryUnitReq[] =>
  stubApi.lineage.historyUnit.mock.calls.map((c) => c[0] as LineageHistoryUnitReq)
const ok = (data: LineageHistoryUnitRes) => ({ ok: true as const, data })

beforeEach(() => {
  resetInflightRead()
  for (const fn of Object.values(stubApi.lineage)) fn.mockReset()
  stubApi.lineage.graph.mockResolvedValue(graphOf([node('A')]))
  stubApi.lineage.patchNode.mockImplementation(async (req: Partial<LineageNode>) =>
    ({ ok: true, data: { ...node(String(req.id)), ...req, updatedAt: 'server' } as LineageNode })
  )
  stubApi.lineage.upsertEdge.mockImplementation(async (req: { id?: string; from: string; to: string }) =>
    ({ ok: true, data: { ...edge(req.id ?? 'x', req.from, req.to), createdAt: 'server-created', updatedAt: 'server' } })
  )
  stubApi.lineage.removeEdge.mockResolvedValue({ ok: true, data: { ok: true } })
  stubApi.lineage.upsertLineTypes.mockImplementation(async (req: { names: string[] }) => ({ ok: true, data: [...req.names] }))
  stubApi.lineage.upsertFloatingNote.mockImplementation(async (req: { id?: string; folderId: string; x: number; y: number; content: string }) => ({
    ok: true,
    data: { id: req.id ?? 'x', folderId: req.folderId, x: req.x, y: req.y, content: req.content, createdAt: 'server-created', updatedAt: 'server' }
  }))
  stubApi.lineage.removeFloatingNote.mockResolvedValue({ ok: true, data: { ok: true } })
  stubApi.lineage.historyUnit.mockImplementation(echoHistoryUnit)
  stubApi.papers.setStarred.mockResolvedValue({ ok: true, data: { ok: true } })
  useLineageStore.setState({
    nodes: [],
    edges: [],
    floatingNotes: [],
    lineTypeNames: ['待命名', '待命名', '待命名', '待命名', '待命名', '待命名'],
    status: 'ready',
    error: null,
    folderId: '__main__',
    saveStatus: 'clean',
    lastWriteError: null,
    queue: [],
    flushing: false,
    inflight: null,
    needsReload: false,
    invalidationEpoch: 0,
    undoStack: [],
    redoStack: [],
    unfinalized: false,
    editRevision: 0
  })
})

describe('flush-then-unit（§2.5 #13-#18）', () => {
  it('undo 先 drain 后 history-unit：patchNode（落库在途编辑）先于 historyUnit；队列落定后反向写、IO 回 clean', async () => {
    useLineageStore.setState({ nodes: [node('A')] })
    state().moveNode('A', 10, 10)
    expect(await state().undo()).toBe(true)
    expect(stubApi.lineage.patchNode).toHaveBeenCalledTimes(1)
    expect(unitCalls()).toHaveLength(1)
    expect(stubApi.lineage.patchNode.mock.invocationCallOrder[0]!).toBeLessThan(stubApi.lineage.historyUnit.mock.invocationCallOrder[0]!)
    expect(state().nodes[0]?.x).toBe(0)
    expect(state().queue).toEqual([])
    expect(state().saveStatus).toBe('clean')
    expect(state().undoStack).toHaveLength(0)
    expect(state().redoStack).toHaveLength(1)
    expect(state().unfinalized).toBe(true)
    expect(unitCalls()[0]).toMatchObject({ folderId: '__main__', direction: 'undo', unitId: expect.any(String) })
  })

  it('预 flush 失败（#14）：不弹栈、不执行反向写、redo/U 不变；IO error 可见', async () => {
    useLineageStore.setState({ nodes: [node('A')] })
    stubApi.lineage.patchNode.mockResolvedValue({ ok: false, error: { code: 'DB_ERROR', message: '写入失败' } })
    state().moveNode('A', 10, 10)
    expect(await state().undo()).toBe(false)
    expect(stubApi.lineage.historyUnit).not.toHaveBeenCalled() // 不执行反向写
    expect(state().undoStack).toHaveLength(1) // 不弹栈
    expect(state().redoStack).toHaveLength(0)
    expect(state().unfinalized).toBe(true) // U 不改
    expect(state().saveStatus).toBe('error')
    expect(state().lastWriteError).toBe('写入失败')
  })

  it('history-unit 失败（系统型，#18）：两栈不动、U 不改为已定稿、IO error；重试成功后移栈', async () => {
    useLineageStore.setState({ nodes: [node('A')] })
    state().moveNode('A', 10, 10)
    stubApi.lineage.historyUnit.mockResolvedValueOnce({ ok: false, error: { code: 'DB_ERROR', message: '事务失败' } })
    expect(await state().undo()).toBe(false)
    expect(state().undoStack).toHaveLength(1)
    expect(state().redoStack).toHaveLength(0)
    expect(state().unfinalized).toBe(true)
    expect(state().saveStatus).toBe('error')
    expect(state().lastWriteError).toBe('事务失败')
    expect(showToast).toHaveBeenCalledWith('事务失败', 'error')
    expect(state().needsReload).toBe(false) // 系统型失败≠图态偏离
    expect(await state().undo()).toBe(true) // 原历史可重试
    expect(state().undoStack).toHaveLength(0)
    expect(state().redoStack).toHaveLength(1)
  })

  it('HISTORY_STALE（CONFLICT，#18）：两栈不动、needsReload 置位——下次命令先和解再判', async () => {
    useLineageStore.setState({ nodes: [node('A')] })
    state().moveNode('A', 10, 10)
    await state().save()
    stubApi.lineage.historyUnit.mockResolvedValueOnce({
      ok: false,
      error: { code: 'CONFLICT', message: '节点已被其他操作改变', reason: 'HISTORY_STALE' }
    })
    expect(await state().undo()).toBe(false)
    expect(state().undoStack).toHaveLength(1)
    expect(state().redoStack).toHaveLength(0)
    expect(state().saveStatus).toBe('error')
    expect(state().needsReload).toBe(true) // 图态偏离→和解位置位
    // 下一次 undo：先和解（graph 读）再发 history-unit
    stubApi.lineage.graph.mockClear()
    expect(await state().undo()).toBe(true)
    expect(stubApi.lineage.graph).toHaveBeenCalledTimes(1)
    expect(stubApi.lineage.graph.mock.invocationCallOrder[0]!).toBeLessThan(stubApi.lineage.historyUnit.mock.invocationCallOrder.at(-1)!)
    expect(state().needsReload).toBe(false)
  })

  it('needsReload=1（#13a/#13b）：history 前先等和解；和解失败→history 不执行、不弹栈', async () => {
    useLineageStore.setState({ nodes: [node('A')] })
    state().moveNode('A', 10, 10)
    useLineageStore.setState({ needsReload: true })
    expect(await state().undo()).toBe(true)
    expect(stubApi.lineage.graph).toHaveBeenCalledTimes(1) // 先和解
    expect(state().needsReload).toBe(false)
    expect(unitCalls()).toHaveLength(1) // 和解成功后才开始 history-unit
    // 和解失败：补一个可撤单元后置位——history 不执行、不弹栈（#13b）
    state().moveNode('A', 20, 20)
    useLineageStore.setState({ needsReload: true })
    stubApi.lineage.graph.mockResolvedValueOnce({ ok: false, error: { code: 'DB_ERROR', message: '图读失败' } })
    const undoBefore = state().undoStack.length // 1
    expect(undoBefore).toBe(1)
    expect(await state().undo()).toBe(false)
    expect(unitCalls()).toHaveLength(1) // history 未执行
    expect(state().undoStack).toHaveLength(undoBefore) // 不弹栈
    expect(state().needsReload).toBe(true) // 位保留
    expect(state().saveStatus).toBe('error')
    expect(state().lastWriteError).toBe('图读失败')
  })

  it('保存后全类型 undo/redo：节点移动/画线/删线/调线/悬浮笔记增改删/色行名——显式保存后各步可撤销与重做', async () => {
    useLineageStore.setState({ nodes: [node('A', { year: 2020, month: 1, slot: 0 }), node('B', { year: 2020, month: 1, slot: 1 })], edges: [edge('e1', 'A', 'B')] })
    state().moveNode('A', 10, 10)
    state().setEdgeVia('e1', [{ x: 1, y: 2 }])
    state().removeEdge('e1')
    const drawn = state().drawEdge('B', 'A', { dashed: false, color: LINE_TYPE_COLORS[0]!, label: '', fromAnchor: { side: 'top', slot: 1 }, toAnchor: { side: 'top', slot: 1 } })
    state().saveLineTypeNames(['主线', '副线', '对比', '支撑', '衍生', '否证'])
    state().addFloatingNote(3, 4, '笔记')
    const noteId = state().floatingNotes[0]!.id
    state().updateFloatingNote(noteId, { content: '改' })
    expect(await state().saveActiveFolder()).toBe(true) // 显式保存=定稿
    expect(state().unfinalized).toBe(false)
    const depth = state().undoStack.length
    expect(depth).toBe(7)
    for (let i = 0; i < depth; i++) expect(await state().undo()).toBe(true)
    expect(state().undoStack).toHaveLength(0)
    expect(state().redoStack).toHaveLength(depth)
    expect(state().edges.map((e) => e.id)).toEqual(['e1']) // 画线被撤销、被删的原边 e1 恢复原 id
    expect(state().edges[0]?.via).toBeUndefined() // 调线被撤销（回自动路由）
    expect(state().floatingNotes).toEqual([])
    expect(state().lineTypeNames).toEqual(['待命名', '待命名', '待命名', '待命名', '待命名', '待命名'])
    expect(state().nodes[0]?.x).toBe(0)
    for (let i = 0; i < depth; i++) expect(await state().redo()).toBe(true)
    expect(state().undoStack).toHaveLength(depth)
    expect(state().edges.map((e) => e.id)).toEqual([drawn.ok ? drawn.id : ''])
    expect(state().floatingNotes[0]).toMatchObject({ id: noteId, content: '改' })
    expect(state().lineTypeNames[0]).toBe('主线')
    expect(state().nodes.find((n) => n.id === 'A')?.x).toBe(10)
    expect(state().unfinalized).toBe(true) // undo/redo 重新置 U
  })

  it('响应只增量应用 touched 实体：无关节点原样、节点按 lineageOrder 重排、星标保现值', async () => {
    useLineageStore.setState({
      nodes: [node('A', { year: 2021, month: 3, slot: 0 }), node('Z', { year: 2019, month: 1, slot: 0, isStarred: true })]
    })
    state().moveNode('A', 10, 10)
    await state().save() // 在途编辑先落库（写回显阶段——与 undo 的增量应用分立）
    const zRef = state().nodes.find((n) => n.id === 'Z')
    await state().toggleNodeStar({ id: 'A', paperId: 'paper-A', isStarred: undefined }) // 星标=非撤销维度
    expect(state().nodes.find((n) => n.id === 'A')?.isStarred).toBe(true)
    expect(await state().undo()).toBe(true) // Q0：预 drain 无写回显——history-unit 回显增量应用
    expect(state().nodes.map((n) => n.id)).toEqual(['Z', 'A']) // lineageOrder（2019 在前）
    expect(state().nodes.find((n) => n.id === 'Z')).toBe(zRef) // 无关节点引用不变（未被整图替换）
    expect(state().nodes.find((n) => n.id === 'A')?.isStarred).toBe(true) // 星标现值 overlay
    expect(state().nodes.find((n) => n.id === 'A')?.x).toBe(0)
  })

  it('迟到响应（#19——history 在途时会话被恢复替换）：不写图态、不弹（新会话的）栈、IO 落定', async () => {
    useLineageStore.setState({ nodes: [node('A')] })
    state().moveNode('A', 10, 10)
    let resolveUnit!: (v: { ok: true; data: LineageHistoryUnitRes }) => void
    stubApi.lineage.historyUnit.mockImplementationOnce(() => new Promise((r) => { resolveUnit = r }))
    const pending = state().undo()
    await settle()
    expect(unitCalls()).toHaveLength(1) // history-unit 已发（在途）
    // 会话被替换（恢复载入——代际递增、栈清）
    state().applyRecoverySession({
      folderId: '__main__',
      graph: { nodes: [node('R')], edges: [], lineTypeNames: ['待命名', '待命名', '待命名', '待命名', '待命名', '待命名'], floatingNotes: [] },
      queue: [],
      draft: null
    })
    resolveUnit(ok({ folderId: '__main__', unitId: unitCalls()[0]!.unitId, nodes: [node('A', { x: 0 })], edges: [], floatingNotes: [], lineTypeNames: ['待命名', '待命名', '待命名', '待命名', '待命名', '待命名'] }))
    expect(await pending).toBe(false)
    expect(state().nodes.map((n) => n.id)).toEqual(['R']) // 旧响应不写新会话图态
    expect(state().undoStack).toHaveLength(0)
    expect(state().redoStack).toHaveLength(0)
    expect(state().flushing).toBe(false)
    expect(state().inflight).toBeNull()
  })

  it('[回炉 W-B1·T-B03] 响应身份键不符——folderId（回显属于另一张图）：不应用回显、不移栈、返回 false', async () => {
    useLineageStore.setState({ nodes: [node('A')] })
    state().moveNode('A', 10, 10)
    // 回显内容本身是「撤销后」的行（x 回 0）——只有身份键不符这一项拦它
    stubApi.lineage.historyUnit.mockImplementationOnce(async (req: LineageHistoryUnitReq) => {
      const echoed = await echoHistoryUnit(req)
      return ok({ ...echoed.data, folderId: 'f-other' })
    })
    expect(await state().undo()).toBe(false)
    expect(state().nodes[0]).toMatchObject({ id: 'A', x: 10, y: 10 }) // 图不动（预 drain 落库后的行，撤销未应用）
    expect(state().undoStack).toHaveLength(1)
    expect(state().redoStack).toHaveLength(0)
    expect(unitCalls()[0]).toMatchObject({ folderId: '__main__' }) // 前提：请求身份是本图
  })

  it('[回炉 W-B1·T-B03] 响应身份键不符——unitId（另一条历史项的回显）：不应用回显、不移栈、返回 false', async () => {
    useLineageStore.setState({ nodes: [node('A')] })
    state().moveNode('A', 10, 10)
    stubApi.lineage.historyUnit.mockImplementationOnce(async (req: LineageHistoryUnitReq) => {
      const echoed = await echoHistoryUnit(req)
      return ok({ ...echoed.data, unitId: 'unit-late' })
    })
    expect(await state().undo()).toBe(false)
    expect(state().nodes[0]).toMatchObject({ id: 'A', x: 10, y: 10 })
    expect(state().undoStack).toHaveLength(1)
    expect(state().redoStack).toHaveLength(0)
    // 同一历史项随后可重试（身份相符的回显照常应用）
    expect(await state().undo()).toBe(true)
    expect(state().nodes[0]?.x).toBe(0)
    expect(state().undoStack).toHaveLength(0)
    expect(state().redoStack).toHaveLength(1)
  })

  it('redo 截断 ≤10：undo 12 步后 redoStack 只留最近 10', async () => {
    useLineageStore.setState({ nodes: [node('A')] })
    for (let i = 1; i <= 12; i++) state().moveNode('A', i, i)
    expect(state().undoStack).toHaveLength(10)
    for (let i = 0; i < 10; i++) expect(await state().undo()).toBe(true)
    expect(state().redoStack).toHaveLength(10)
    expect(await state().redo()).toBe(true)
    expect(state().redoStack).toHaveLength(9)
  })

  it('L1 单图：切到不同 folder=换会话（历史与 U 清）；同图重取保留历史', async () => {
    useLineageStore.setState({ nodes: [node('A')] })
    state().moveNode('A', 10, 10)
    stubApi.lineage.graph.mockResolvedValue(graphOf([node('A', { x: 10 })]))
    await state().save()
    expect(state().undoStack).toHaveLength(1)
    state().setFolder('__main__') // 同图重取（既有会话）
    await settle()
    expect(state().undoStack).toHaveLength(1)
    expect(state().unfinalized).toBe(true)
    state().setFolder('f-other') // 切图=换会话
    await settle()
    expect(state().folderId).toBe('f-other')
    expect(state().undoStack).toHaveLength(0)
    expect(state().redoStack).toHaveLength(0)
    expect(state().unfinalized).toBe(false)
  })
})

describe('显式保存 finalize（§2.5 #20-#23、#10）', () => {
  it('无 Q 定稿（#21）：redo 清、U 清、undo 保留；返回 true', async () => {
    useLineageStore.setState({ nodes: [node('A')] })
    state().moveNode('A', 10, 10)
    state().moveNode('A', 20, 20) // 两单元：undo 一步后 undo=1、redo=1
    await state().save()
    await state().undo() // 产生 redo
    expect([state().undoStack.length, state().redoStack.length]).toEqual([1, 1])
    expect(state().unfinalized).toBe(true)
    expect(await state().saveActiveFolder()).toBe(true)
    expect(state().redoStack).toHaveLength(0)
    expect(state().undoStack).toHaveLength(1)
    expect(state().unfinalized).toBe(false)
    expect(state().saveStatus).toBe('clean')
    expect(stubApi.lineage.patchNode).toHaveBeenCalledTimes(1) // 无 Q 不重发（两单元融合单发）
  })

  it('save()（IO 收口）不 finalize：redo/U 不动——退出握手/课题切换消费面', async () => {
    useLineageStore.setState({ nodes: [node('A')] })
    state().moveNode('A', 10, 10)
    await state().save()
    await state().undo()
    await state().save()
    expect(state().redoStack).toHaveLength(1)
    expect(state().unfinalized).toBe(true)
  })

  it('保存期间有新编辑（#22——gate 旁路使 revision 前进）：redo 仍清、U 保持', async () => {
    useLineageStore.setState({ nodes: [node('A')] })
    state().moveNode('A', 10, 10)
    await state().save()
    await state().undo() // redo 在场
    let release!: (v: { ok: true; data: LineageNode }) => void
    useLineageStore.setState({ saveStatus: 'dirty', queue: [{ kind: 'patch-node', id: 'A', patch: { x: 5, y: 5 } }] })
    stubApi.lineage.patchNode.mockImplementationOnce(() => new Promise((r) => { release = r }))
    const saving = state().saveActiveFolder()
    // 旁路编辑（恢复载入/后台事件路径）：revision 前进+U 置真
    useLineageStore.setState({ unfinalized: true, editRevision: state().editRevision + 1 })
    release({ ok: true, data: { ...node('A', { x: 5, y: 5 }), updatedAt: 'server' } })
    expect(await saving).toBe(true)
    expect(state().redoStack).toHaveLength(0) // redo 仍清（旧分支死于定稿）
    expect(state().unfinalized).toBe(true) // 新编辑灰点不被旧回执误清
  })

  it('重复命令拒绝（#20 busy）：和解在途（finalize 等待窗）第二次 saveActiveFolder=false 且不重发；undo 则排队不并发（#13d）', async () => {
    useLineageStore.setState({ nodes: [node('A')] })
    state().moveNode('A', 10, 10)
    state().moveNode('A', 20, 20) // 两单元：undo 一步后 undo=1、redo=1
    await state().save()
    await state().undo()
    stubApi.lineage.historyUnit.mockClear()
    let release!: (v: { ok: true; data: LineageGraphRes }) => void
    useLineageStore.setState({ needsReload: true })
    stubApi.lineage.graph.mockImplementationOnce(() => new Promise((r) => { release = r }))
    const first = state().saveActiveFolder() // drain（Q0）→和解在途=F(reconcile)→busy
    try {
      await settle()
      expect(state().inflight).toMatchObject({ kind: 'reconcile' })
      expect(await state().saveActiveFolder()).toBe(false) // 重复显式保存被拒
      const queued = state().undo() // history 命令：排队（不并发）
      await settle()
      expect(unitCalls()).toHaveLength(0) // 和解落定前不发 history-unit
      release(graphOf([node('A')]))
      expect(await first).toBe(true)
      expect(await queued).toBe(true) // 和解落定后执行
      expect(unitCalls()).toHaveLength(1)
      expect(stubApi.lineage.graph).toHaveBeenCalledTimes(1) // 单飞：不并发第二读
    } finally {
      release(graphOf([node('A')])) // 断言失败也不占链（幂等：已 release 则 no-op）
      await first.catch(() => undefined)
    }
  })

  it('finalize 失败（#23）：redo/U/undo 全保留、error 可见、无 saved 反馈', async () => {
    useLineageStore.setState({ nodes: [node('A')] })
    state().moveNode('A', 10, 10)
    state().moveNode('A', 20, 20) // 两单元：undo 一步后 undo=1、redo=1
    await state().save()
    await state().undo()
    expect([state().undoStack.length, state().redoStack.length]).toEqual([1, 1])
    stubApi.lineage.patchNode.mockResolvedValue({ ok: false, error: { code: 'DB_ERROR', message: '落库失败' } })
    useLineageStore.setState({ saveStatus: 'dirty', queue: [{ kind: 'patch-node', id: 'A', patch: { x: 7, y: 7 } }] })
    expect(await state().saveActiveFolder()).toBe(false)
    expect(state().redoStack).toHaveLength(1)
    expect(state().undoStack).toHaveLength(1)
    expect(state().unfinalized).toBe(true)
    expect(state().saveStatus).toBe('error')
    expect(state().lastWriteError).toBe('落库失败')
  })

  it('CONFLICT 本次不定稿（#10）：U/redo 保留、和解先于定稿判（#20a）、error 可见待重试；二次显式保存才定稿', async () => {
    useLineageStore.setState({ nodes: [node('A'), node('B')] })
    state().moveNode('A', 10, 10)
    state().moveNode('A', 20, 20) // 两单元：undo 一步后 undo=1、redo=1
    await state().save()
    await state().undo()
    expect([state().undoStack.length, state().redoStack.length]).toEqual([1, 1])
    // gate 旁路注入一条将被服务器拒绝的动作
    useLineageStore.setState({ saveStatus: 'dirty', queue: [{ kind: 'upsert-edge', input: { id: 'e-x', fromNode: 'A', toNode: 'B', label: '', via: null }, isNew: true }] })
    stubApi.lineage.upsertEdge.mockResolvedValue({ ok: false, error: { code: 'CONFLICT', message: '该逻辑线已存在（A→B），重复边被拒绝' } })
    stubApi.lineage.graph.mockClear()
    expect(await state().saveActiveFolder()).toBe(false)
    expect(state().redoStack).toHaveLength(1) // redo 保留
    expect(state().unfinalized).toBe(true) // U 保留
    expect(state().undoStack).toHaveLength(1)
    expect(state().saveStatus).toBe('error') // 错误可见待重试（无 saved 反馈）
    expect(state().lastWriteError).toBe('该逻辑线已存在（A→B），重复边被拒绝')
    expect(stubApi.lineage.graph).toHaveBeenCalledTimes(1) // 和解已随链完成（#20a——非 fire-and-forget）
    expect(state().needsReload).toBe(false)
    // 二次显式保存（和解已完成）：定稿
    expect(await state().saveActiveFolder()).toBe(true)
    expect(state().redoStack).toHaveLength(0)
    expect(state().unfinalized).toBe(false)
    expect(state().saveStatus).toBe('clean')
  })

  it('finalize 前和解失败（#20b）：不定稿、redo/U 保留、needsReload 留驻；和解成功后二次保存定稿', async () => {
    useLineageStore.setState({ nodes: [node('A')] })
    state().moveNode('A', 10, 10)
    await state().save()
    await state().undo()
    useLineageStore.setState({ needsReload: true })
    stubApi.lineage.graph.mockResolvedValueOnce({ ok: false, error: { code: 'DB_ERROR', message: '图读失败' } })
    expect(await state().saveActiveFolder()).toBe(false)
    expect(state().redoStack).toHaveLength(1)
    expect(state().unfinalized).toBe(true)
    expect(state().needsReload).toBe(true)
    expect(state().saveStatus).toBe('error')
    expect(await state().saveActiveFolder()).toBe(true)
    expect(state().redoStack).toHaveLength(0)
    expect(state().unfinalized).toBe(false)
    expect(state().needsReload).toBe(false)
  })

  it('保存期间新编辑（#20d）：同会话 saving 锁拒绝新编辑（gate 面）；和解照常完成', async () => {
    useLineageStore.setState({ nodes: [node('A')] })
    let release!: (v: { ok: true; data: LineageGraphRes }) => void
    useLineageStore.setState({ needsReload: true })
    stubApi.lineage.graph.mockImplementationOnce(() => new Promise((r) => { release = r }))
    const saving = state().saveActiveFolder()
    await settle()
    state().moveNode('A', 99, 99) // 和解在途：编辑被拒
    expect(state().queue).toHaveLength(0)
    release(graphOf([node('A', { x: 3 })]))
    expect(await saving).toBe(true)
    expect(state().needsReload).toBe(false)
    expect(state().nodes[0]?.x).toBe(3)
    expect(state().unfinalized).toBe(false)
  })
})

describe('和解链任务（lineage-write-conflicts 纯编排——§2.6 10/34a-34d）', () => {
  interface FakeSession {
    folderId: string
    invalidationEpoch: number
  }
  const setup = (initial: FakeSession) => {
    const session: FakeSession = { ...initial }
    const read = vi.fn(async () => rawGraph([node('A')]))
    const apply = vi.fn((_g: LineageGraphRes, identity: { folderId: string; epoch: number }) => identity.epoch === session.invalidationEpoch && identity.folderId === session.folderId)
    const task = createReconcileTask({ get: () => session, read, apply })
    return { session, read, apply, task }
  }

  it('成功应用（10b）：read 一次、apply 携读捕获身份→applied', async () => {
    const { task, read, apply } = setup({ folderId: 'f-a', invalidationEpoch: 3 })
    expect(await task.run()).toBe('applied')
    expect(read).toHaveBeenCalledTimes(1)
    expect(apply).toHaveBeenCalledWith(expect.anything(), { folderId: 'f-a', epoch: 3 })
  })

  it('在途单飞读复用（34a）：同身份并发两次 run→read 一次；epoch 已推进的旧读不可复用→按当前 epoch 重新单飞（#43：旧读不得应用）', async () => {
    resetInflightRead()
    // 复用面：同身份并发两次 run 共用在途单飞句柄
    let release!: (v: LineageGraphRes) => void
    const session = { folderId: 'f-a', invalidationEpoch: 0 }
    const read = vi.fn(() => new Promise<LineageGraphRes>((r) => { release = r }))
    const apply = vi.fn(() => true)
    const task = createReconcileTask({ get: () => session, read, apply })
    const p1 = task.run()
    const p2 = task.run()
    expect(read).toHaveBeenCalledTimes(1) // 不并发第二读
    release(rawGraph([node('A')]))
    expect(await Promise.all([p1, p2])).toEqual(['applied', 'applied'])
    // epoch 推进面：事件前发起的旧读（epoch 0）不可复用、不得应用
    resetInflightRead()
    const gates: Array<(v: LineageGraphRes) => void> = []
    const read2 = vi.fn(() => new Promise<LineageGraphRes>((r) => { gates.push(r) }))
    const applied: Array<{ epoch: number; firstId: string | undefined }> = []
    const apply2 = vi.fn((g: LineageGraphRes, id: { epoch: number }) => {
      if (id.epoch !== session.invalidationEpoch) return false
      applied.push({ epoch: id.epoch, firstId: g.nodes[0]?.id })
      return true
    })
    const task2 = createReconcileTask({ get: () => session, read: read2, apply: apply2 })
    const old = task2.run() // 捕获 epoch 0
    session.invalidationEpoch = 1 // 事件推进
    const fresh = task2.run() // 旧读不可复用→按当前 epoch 重新单飞
    expect(read2).toHaveBeenCalledTimes(2) // 在途恰两读（各自 epoch）
    gates[1]!(rawGraph([node('B')])) // 新读（epoch 1）先到：应用
    expect(await fresh).toBe('applied')
    gates[0]!(rawGraph([node('A')])) // 旧读（epoch 0）后到：不得应用
    await settle()
    expect(read2).toHaveBeenCalledTimes(3) // 旧读被丢→按当前 epoch 显式续拉一次（#10d/#34a，有界）
    gates[2]!(rawGraph([node('C')]))
    expect(await old).toBe('applied')
    expect(applied.map((a) => a.firstId)).toEqual(['B', 'C']) // 旧 epoch 载荷（A）从未应用
    expect(applied.every((a) => a.epoch === 1)).toBe(true)
  })

  it('会话切离（34c）→dropped 不应用；应用判据失败（34d：Q>0 等）→位保留 dropped；读失败（10c）→抛错', async () => {
    resetInflightRead()
    const session = { folderId: 'f-a', invalidationEpoch: 0 }
    const read = vi.fn(async () => rawGraph([node('A')]))
    const apply = vi.fn((_g: LineageGraphRes, identity: { folderId: string }) => identity.folderId === session.folderId)
    const task = createReconcileTask({ get: () => session, read, apply })
    const p = task.run()
    session.folderId = 'f-b' // 读在途时会话切离
    expect(await p).toBe('dropped')
    expect(apply).toHaveBeenCalledTimes(1) // 读到达时身份不符：apply 判否→任务判会话切离→dropped（不写图态由 apply 守恒）
    // 34d：身份相符但应用判据失败
    resetInflightRead()
    const applyNo = vi.fn(() => false)
    const task2 = createReconcileTask({ get: () => session, read, apply: applyNo })
    expect(await task2.run()).toBe('dropped')
    expect(applyNo).toHaveBeenCalledTimes(1)
    // 10c：读失败原样上抛
    const task3 = createReconcileTask({ get: () => session, read: vi.fn(async () => { throw new Error('图读失败') }), apply })
    await expect(task3.run()).rejects.toThrow('图读失败')
  })
})
