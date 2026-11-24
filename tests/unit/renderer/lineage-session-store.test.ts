// @vitest-environment jsdom
/**
 * [F-LGRAPH-01②U1] 编辑会话域锁定合约面——暂存（enqueue 不 flush）+乐观应用
 * +撤销/重做+save() 落库（mockup §2.2 定案+A7/A8 仲裁）。
 * [B4 L1 迁移——设计稿 docs/design/2026-11-22_b4-save-undo-core-design.md §12.2]：
 * - undo/redo 改 history-unit 异步（flush-then-unit：先 drain 普通写，再经
 *   lineage/history-unit 反向写——不再恢复快照队列）；
 * - 保存（save()=IO 收口）后 undo 有效且栈不重置（原「保存→undo 无效」翻转——
 *   idle-flush≠定稿；显式保存只清 redo 见 lineage-history-unit 测试）；
 * - 栈深 50→10（HISTORY_DEPTH_MAX 单源）；
 * - saving 期编辑仍锁（INV-94）；undo/redo 在 saving 期排队不并发（§2.5 #13/#13d）。
 * always-active 裸 describe（K3）。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub } from '../../utils/api-client-mock'
import { echoHistoryUnit } from '../../utils/lineage-history-stub'

// history-unit 桩=普通 vi.fn（beforeEach 的 mockReset 循环后重挂 echoHistoryUnit 实现）
const stubApi = makeApiStub({
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

import { showToast } from '../../../src/renderer/shared/ui/toast-store'
import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'
import { useLineageViewStore } from '../../../src/renderer/features/lineage/lineage-view.store'
import { LINE_TYPE_COLORS, type LineageEdge, type LineageNode } from '../../../src/shared/models/lineage'

function node(id: string, patch: Partial<LineageNode> = {}): LineageNode {
  return {
    id,
    paperId: `paper-${id}`,
    title: `节点${id}`,
    year: 2020,
    x: null,
    y: null,
    month: null,
    slot: null,
    folderId: '__main__',
    createdAt: 't',
    updatedAt: 't',
    ...patch
  }
}

function edge(id: string, from: string, to: string): LineageEdge {
  return { id, fromNode: from, toNode: to, label: '', dashed: false, color: '#1e3a8a', createdAt: 't', updatedAt: 't' }
}

const settle = async (turns = 8): Promise<void> => {
  for (let i = 0; i < turns; i++) await Promise.resolve()
}

const state = () => useLineageStore.getState()

beforeEach(() => {
  for (const fn of Object.values(stubApi.lineage)) fn.mockReset()
  stubApi.lineage.graph.mockResolvedValue({ ok: true, data: { nodes: [], edges: [] } })
  stubApi.lineage.patchNode.mockImplementation(async (req: Partial<LineageNode>) =>
    ({ ok: true, data: { ...node(req.id ?? 'X'), ...req, updatedAt: 'server' } as LineageNode })
  )
  stubApi.lineage.removeNode.mockResolvedValue({ ok: true, data: { ok: true } })
  stubApi.lineage.upsertEdge.mockImplementation(async (req: { id?: string; from: string; to: string }) =>
    ({ ok: true, data: edge(req.id ?? `e-${req.from}-${req.to}`, req.from, req.to) })
  )
  stubApi.lineage.removeEdge.mockResolvedValue({ ok: true, data: { ok: true } })
  stubApi.lineage.upsertLineTypes.mockImplementation(async (req: { folderId: string; names: string[] }) => ({ ok: true, data: [...req.names] }))
  stubApi.lineage.historyUnit.mockImplementation(echoHistoryUnit)
  useLineageStore.setState({
    nodes: [],
    edges: [],
    lineTypeNames: ['待命名', '待命名', '待命名', '待命名', '待命名', '待命名'],
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
    folderId: '__main__'
  })
  useLineageViewStore.setState({ mode: 'browse', focusSet: [], navCollapsed: false, navWidth: 208 })
})

describe('F-LGRAPH-01②U1 暂存（enqueue 不 flush——A7 单一写路径）', () => {
  it('编辑动作入暂存：不发 IPC+saveStatus=dirty+本地乐观值即时可见+undo 栈入历史项', async () => {
    useLineageStore.setState({ nodes: [node('A', { x: 1, y: 1 })] })
    // [A3 F-CONTRACTA-01] editCoreIdea 随 core_idea 全退役删——节点 patch 触发器
    // 换 moveNode（x/y 数据面未退役；乐观/撤销语义同型承载）
    state().moveNode('A', 30, 40)
    await settle()
    expect(stubApi.lineage.patchNode).not.toHaveBeenCalled() // 不自动落库（A7）
    expect(state().saveStatus).toBe('dirty')
    expect(state().nodes[0]?.x).toBe(30) // 乐观应用即时可见
    expect(state().queue).toHaveLength(1)
    expect(state().undoStack).toHaveLength(1) // 一单元=一撤销步
    expect(state().unfinalized).toBe(true) // [B4 L1] 新编辑置 U（§2.5 #3）
  })

  it('[F-ALIGN-01 改写] 新建类动作乐观生成 id（画线）：drawEdge 乐观边即时在场（uuid=落库 id——无临时 id 漂移；[F-VISFB-66] 单径必携双锚；原 addPaperNode 面随节点新建路径退役删——节点唯一来源=入库/移动两路）', () => {
    useLineageStore.setState({ nodes: [node('A'), node('B')] })
    state().drawEdge('A', 'B', { dashed: false, color: LINE_TYPE_COLORS[0], label: '', fromAnchor: { side: 'bottom', slot: 1 }, toAnchor: { side: 'top', slot: 1 } })
    expect(state().edges).toHaveLength(1)
    expect(state().edges[0]!.fromNode).toBe('A')
    expect(state().saveStatus).toBe('dirty')
  })

  it('删节点乐观级联：本地边随亡（DDL CASCADE 的会话镜像）', () => {
    useLineageStore.setState({ nodes: [node('A'), node('B')], edges: [edge('e1', 'A', 'B')] })
    state().removeNode('A')
    expect(state().nodes.map((n) => n.id)).toEqual(['B'])
    expect(state().edges).toEqual([])
    expect(state().saveStatus).toBe('dirty')
  })

  it('色行名改名=一编辑单元：saveLineTypeNames 乐观应用+入撤销栈（mockup §3.3 行内改名）', () => {
    state().saveLineTypeNames(['主线', '待命名', '待命名', '待命名', '待命名', '待命名'])
    expect(state().lineTypeNames[0]).toBe('主线')
    expect(state().saveStatus).toBe('dirty')
    expect(state().undoStack).toHaveLength(1)
  })
})

describe('F-LGRAPH-01②U1 撤销/重做（[B4 L1] flush-then-unit——反向写经 history-unit）', () => {
  it('undo 逐步回退：编辑甲→编辑乙→undo（先 drain 落库乙，再反向写回乙前）→undo（回甲前）；IO 回 clean、U 保持', async () => {
    useLineageStore.setState({ nodes: [node('A', { x: 0, y: 0 })] })
    state().moveNode('A', 10, 10)
    state().moveNode('A', 20, 20)
    expect(state().undoStack).toHaveLength(2)
    await state().undo()
    expect(state().nodes[0]?.x).toBe(10)
    expect(stubApi.lineage.patchNode).toHaveBeenCalledTimes(1) // 预 drain：乙已落库
    expect(stubApi.lineage.historyUnit).toHaveBeenCalledTimes(1)
    expect(state().saveStatus).toBe('clean') // 队列已落定——反向写不在普通 queue
    expect(state().unfinalized).toBe(true)
    await state().undo()
    expect(state().nodes[0]?.x).toBe(0)
    expect(state().saveStatus).toBe('clean')
    expect(state().queue).toHaveLength(0)
    expect(stubApi.lineage.historyUnit).toHaveBeenCalledTimes(2)
  })

  it('redo 重放：undo 后 redo 恢复编辑值；新编辑即清 redo 栈', async () => {
    useLineageStore.setState({ nodes: [node('A', { x: 0, y: 0 })] })
    state().moveNode('A', 10, 10)
    await state().undo()
    expect(state().redoStack).toHaveLength(1)
    await state().redo()
    expect(state().nodes[0]?.x).toBe(10)
    expect(state().saveStatus).toBe('clean')
    expect(state().unfinalized).toBe(true)
    // 新编辑清 redo
    await state().undo()
    state().moveNode('A', 30, 30)
    expect(state().redoStack).toHaveLength(0)
  })

  it('栈空 undo/redo=no-op（栈长派生判空——不发 history-unit）', async () => {
    expect(state().undoStack).toHaveLength(0)
    expect(state().redoStack).toHaveLength(0)
    expect(await state().undo()).toBe(false)
    expect(await state().redo()).toBe(false)
    expect(stubApi.lineage.historyUnit).not.toHaveBeenCalled()
    expect(state().saveStatus).toBe('clean')
    useLineageStore.setState({ nodes: [node('A')] })
    state().moveNode('A', 1, 1)
    expect(state().undoStack).toHaveLength(1)
    expect(state().redoStack).toHaveLength(0)
  })

  it('[B4 L1 翻转] §2.6-2 保存→undo 有效（栈不重置——idle-flush≠定稿）', async () => {
    useLineageStore.setState({ nodes: [node('A', { x: 0, y: 0 })] })
    state().moveNode('A', 10, 10)
    await state().save()
    expect(state().saveStatus).toBe('clean')
    expect(stubApi.lineage.patchNode).toHaveBeenCalledTimes(1)
    expect(state().undoStack).toHaveLength(1) // 历史跨 flush 存活
    await state().undo()
    expect(state().nodes[0]?.x).toBe(0) // 保存后仍可撤销（对 DB 的新反向写）
  })
})

describe('F-LGRAPH-01②U1 save() 批量落库（IO 收口——§2.5 #8/#9）', () => {
  it('save：saving→clean（成功）+历史引用不变（idle-flush 不清栈）+服务器行回填', async () => {
    useLineageStore.setState({ nodes: [node('A', { x: 0, y: 0 })] })
    const undoBefore = state().undoStack
    state().moveNode('A', 10, 10)
    state().save()
    expect(state().saveStatus).toBe('saving')
    await settle()
    expect(state().saveStatus).toBe('clean')
    expect(state().lastWriteError).toBeNull()
    expect(state().undoStack).toHaveLength(1) // [B4 L1] 栈不因 flush 清空
    expect(state().undoStack).not.toBe(undoBefore)
    expect(state().redoStack).toHaveLength(0)
    expect(state().nodes[0]?.x).toBe(10)
    expect(state().unfinalized).toBe(true) // idle-flush 不清 U
  })

  it('save 失败=队首保留+error 指示+历史不动；重试成功恢复 clean', async () => {
    useLineageStore.setState({ nodes: [node('A')] })
    stubApi.lineage.patchNode
      .mockResolvedValueOnce({ ok: false, error: { code: 'DB_ERROR', message: '写入失败' } })
      .mockResolvedValueOnce({ ok: true, data: { ...node('A'), updatedAt: 'server' } })
    state().moveNode('A', 10, 10)
    state().save()
    await settle()
    expect(state().saveStatus).toBe('error') // 失败≠saved——error 档承载失败指示
    expect(state().queue).toHaveLength(1) // 动作保留
    expect(state().lastWriteError).toBe('写入失败')
    expect(state().undoStack).toHaveLength(1)
    state().retrySave()
    await settle()
    expect(state().saveStatus).toBe('clean')
    expect(state().undoStack).toHaveLength(1)
    expect(state().unfinalized).toBe(false) // retrySave=显式保存：成功即定稿
  })

  it('连续多次编辑一次 save：同实体合并（lazy 载荷读最新行——最后写胜出）', async () => {
    useLineageStore.setState({ nodes: [node('A')] })
    state().moveNode('A', 1, 1)
    state().moveNode('A', 2, 2)
    state().save()
    await settle()
    expect(stubApi.lineage.patchNode).toHaveBeenCalledTimes(1)
    expect(stubApi.lineage.patchNode).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'A', x: 2, y: 2 })
    )
    expect(state().saveStatus).toBe('clean')
  })

  it('CONFLICT 拒绝型：动作丢弃+toast reason+链尾权威和解回填（乐观值不残留——服务器权威）', async () => {
    useLineageStore.setState({ nodes: [node('A'), node('B'), node('C')] })
    stubApi.lineage.upsertEdge.mockResolvedValue({
      ok: false,
      error: { code: 'CONFLICT', message: '成环拒绝：该边将使脉络图出现环路（连线不得成环）' }
    })
    stubApi.lineage.graph.mockResolvedValue({
      ok: true,
      data: { nodes: [node('A'), node('B'), node('C')], edges: [] }
    })
    state().drawEdge('C', 'B', { dashed: false, color: LINE_TYPE_COLORS[0], label: '', fromAnchor: { side: 'bottom', slot: 1 }, toAnchor: { side: 'top', slot: 1 } })
    expect(state().edges).toHaveLength(1) // 乐观边在场
    await state().save() // [B4 L1] 和解=链任务（await 落定——非 fire-and-forget）
    expect(showToast).toHaveBeenCalledWith('成环拒绝：该边将使脉络图出现环路（连线不得成环）', 'error')
    expect(state().saveStatus).toBe('clean')
    expect(state().queue).toHaveLength(0)
    expect(stubApi.lineage.graph).toHaveBeenCalledTimes(1) // 和解读（替代旧 void load()）
    expect(state().edges).toHaveLength(0) // 权威图回填（乐观边消解）
    expect(state().needsReload).toBe(false)
  })
})

describe('F-LGRAPH-01②U1 跨格序列（§2.6 拷问面）', () => {
  it('§2.6-1 edit(dirty)→browse→edit：暂存保留、栈不清、保存钮仍亮（dirty 保持）', () => {
    useLineageStore.setState({ nodes: [node('A')] })
    state().moveNode('A', 10, 10)
    const queueBefore = state().queue
    const undoBefore = state().undoStack.length
    useLineageViewStore.getState().setMode('browse')
    useLineageViewStore.getState().setMode('edit')
    expect(state().queue).toBe(queueBefore) // 同引用=未动
    expect(state().undoStack).toHaveLength(undoBefore)
    expect(state().saveStatus).toBe('dirty')
  })

  it('§2.6 编辑中跳页返回：dirty 时 load 丢弃（暂存保留——load 互锁扩面）', async () => {
    useLineageStore.setState({ nodes: [node('A', { x: 1, y: 1 })] })
    state().moveNode('A', 2, 2)
    await state().load() // 模拟重挂载取数
    expect(state().nodes[0]?.x).toBe(2) // 库读被丢弃
    expect(state().saveStatus).toBe('dirty')
  })

  it('§2.6-3 dirty 切图确认分支：discardSession 清队列+清栈+回 clean+U 清（库态随后重取覆盖）', () => {
    useLineageStore.setState({ nodes: [node('A')] })
    state().moveNode('A', 10, 10)
    state().drawEdge('A', 'Z', { dashed: false, color: LINE_TYPE_COLORS[0], label: '', fromAnchor: { side: 'bottom', slot: 1 }, toAnchor: { side: 'top', slot: 1 } })
    expect(state().queue).toHaveLength(2)
    expect(state().unfinalized).toBe(true)
    state().discardSession()
    expect(state().queue).toHaveLength(0)
    expect(state().undoStack).toHaveLength(0)
    expect(state().redoStack).toHaveLength(0)
    expect(state().saveStatus).toBe('clean')
    expect(state().lastWriteError).toBeNull()
    expect(state().unfinalized).toBe(false)
  })

  it('saving 态编辑锁定（INV-94）；undo 在 saving 期排队不并发（§2.5 #13/#13d——drain 后才执行反向写）', async () => {
    useLineageStore.setState({ nodes: [node('A', { x: 0, y: 0 })] })
    let resolveWrite!: (v: { ok: true; data: LineageNode }) => void
    stubApi.lineage.patchNode.mockImplementationOnce(
      () => new Promise((r) => { resolveWrite = r })
    )
    state().moveNode('A', 10, 10)
    state().save()
    const undoPromise = state().undo() // saving 中——排队（未执行反向写）
    expect(state().nodes[0]?.x).toBe(10)
    expect(stubApi.lineage.historyUnit).not.toHaveBeenCalled()
    resolveWrite({ ok: true, data: { ...node('A', { x: 10, y: 10 }), updatedAt: 'server' } })
    await settle()
    expect(await undoPromise).toBe(true) // 排队的 undo 在 drain 后执行
    expect(state().saveStatus).toBe('clean') // history-unit 在途期为 saving（R-B3）；undo 完成后回到 clean
    expect(state().nodes[0]?.x).toBe(0)
    expect(state().redoStack).toHaveLength(1)
  })

  it('[回炉 R5] saving 中编辑不入栈不入队（INV-94 saving 闸——beginUnit 域 flushing 拒绝）', async () => {
    useLineageStore.setState({ nodes: [node('A')] })
    let resolveWrite!: (v: { ok: true; data: LineageNode }) => void
    stubApi.lineage.patchNode.mockImplementationOnce(
      () => new Promise((r) => { resolveWrite = r })
    )
    state().moveNode('A', 10, 10)
    state().save()
    expect(state().saveStatus).toBe('saving')
    const undoDepth = state().undoStack.length // 1（甲单元）
    const queueLen = state().queue.length // 1（派发中）
    state().moveNode('A', 20, 20) // saving 中编辑=拒绝
    expect(state().undoStack).toHaveLength(undoDepth) // 不入栈
    expect(state().queue).toHaveLength(queueLen) // 不入队
    expect(state().nodes[0]?.x).toBe(10) // 乐观应用同拒（编辑无效）
    resolveWrite({ ok: true, data: { ...node('A', { x: 10, y: 10 }), updatedAt: 'server' } })
    await settle()
    expect(state().saveStatus).toBe('clean')
    state().moveNode('A', 30, 30) // clean 后恢复可编辑
    expect(state().undoStack).toHaveLength(2) // [B4 L1] 甲单元历史跨 flush 存活+新单元
  })

  it('[RRB4→B4 L2 断言翻转] flushing 中 setFolder=切换挂起（§2.5 #32/§8.1：saving 不阻切——旧会话在飞写只回写原会话）', async () => {
    useLineageStore.setState({ nodes: [node('A')] })
    let resolveWrite!: (v: { ok: true; data: LineageNode }) => void
    stubApi.lineage.patchNode.mockImplementationOnce(
      () => new Promise((r) => { resolveWrite = r })
    )
    state().moveNode('A', 10, 10)
    state().save()
    expect(state().flushing).toBe(true) // flush 在飞窗
    stubApi.lineage.graph.mockClear()
    stubApi.lineage.graph.mockImplementationOnce(async () => ({ ok: true, data: { nodes: [node('B')], edges: [] } }))
    state().setFolder('f-1') // flushing 中切图=切换挂起（原 no-op 守卫退役）
    expect(state().folderId).toBe('f-1') // activeFolder 即切（不等 flush 回执）
    expect(stubApi.lineage.graph).toHaveBeenCalledWith({ folderId: 'f-1' }) // 新会话取数不受阻
    expect(state().saveStatus).toBe('clean') // 新会话自身 IO 基线（旧会话在飞写不外溢）
    resolveWrite({ ok: true, data: { ...node('A', { x: 10, y: 10 }), updatedAt: 'server' } })
    await settle()
    expect(state().nodes.map((n) => n.id)).toEqual(['B']) // f-1 夹具图
    expect(state().saveStatus).toBe('clean') // 旧会话 flush 收尾只写原会话
  })

  it('[回炉 R20→B4 L1] undoStack 深度截断 10（HISTORY_DEPTH_MAX 单源）：第 11 单元起丢最旧', async () => {
    useLineageStore.setState({ nodes: [node('A')] })
    for (let i = 1; i <= 55; i++) state().moveNode('A', i, i)
    expect(state().undoStack).toHaveLength(10) // 55 单元→栈深 10
    for (let i = 0; i < 10; i++) await state().undo()
    // 栈底=第 46 单元前值（前 45 步被截断）——undo 到底=x=45
    expect(state().nodes[0]?.x).toBe(45)
    expect(state().undoStack).toHaveLength(0)
    expect(await state().undo()).toBe(false) // 栈空 no-op
    expect(state().nodes[0]?.x).toBe(45)
  })

  it('[回炉 R17] §2.6-5 via 随 undo 恢复：setEdgeVia→undo→via 回前值；redo 重放', async () => {
    useLineageStore.setState({ nodes: [node('A'), node('B')], edges: [edge('e1', 'A', 'B')] })
    state().setEdgeVia('e1', [{ x: 10, y: 10 }])
    expect(state().edges[0]?.via).toEqual([{ x: 10, y: 10 }])
    await state().undo()
    expect(state().edges[0]?.via).toBeUndefined() // via 回前值（自动路由态）
    await state().redo()
    expect(state().edges[0]?.via).toEqual([{ x: 10, y: 10 }])
  })

  it('[回炉 R9] 画线双 toast 合一：暂存提示在场+flush 成功 toast 抑制（drawEdge 动作面）', async () => {
    useLineageStore.setState({ nodes: [node('A'), node('B')] })
    state().drawEdge('A', 'B', { dashed: false, color: LINE_TYPE_COLORS[0], label: '主线', fromAnchor: { side: 'bottom', slot: 1 }, toAnchor: { side: 'top', slot: 1 } })
    expect(showToast).toHaveBeenCalledWith('已画线，保存后生效', 'success') // 暂存提示保留
    vi.mocked(showToast).mockClear()
    state().save()
    await settle()
    expect(state().saveStatus).toBe('clean')
    expect(showToast).not.toHaveBeenCalledWith('连线已保存', 'success') // flush 成功 toast 抑制
    // [F-VISFB-66] 对照面随单径收敛：drawEdge 暂存提示即时（silentSave 恒立
    // ——原 linkNodes「成功 toast 保持」对照随入口退役删除）
  })
})
