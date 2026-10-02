// @vitest-environment jsdom
/**
 * [F-LGRAPH-01②U1] 编辑会话域锁定合约面——暂存（enqueue 不 flush）+乐观应用
 * +撤销/重做快照栈+save() 批量落库（mockup §2.2 定案+A7/A8 仲裁）。
 * 真相源=docs/design/2026-10-01_f-lgraph01-editor-mockup.md §2.2/§2.6+
 * editor-design-final §1（保存粒度=编辑会话暂存+点保存批量落库——Word 式）。
 * always-active 裸 describe（K3）。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub } from '../../utils/api-client-mock'

const stubApi = makeApiStub({
  lineage: {
    graph: vi.fn(),
    upsertNode: vi.fn(),
    removeNode: vi.fn(),
    upsertEdge: vi.fn(),
    removeEdge: vi.fn(),
    upsertLineTypes: vi.fn()
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
    coreIdea: '',
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
  return { id, fromNode: from, toNode: to, label: '', dashed: false, color: '#3a5bd9', createdAt: 't', updatedAt: 't' }
}

const settle = async (turns = 8): Promise<void> => {
  for (let i = 0; i < turns; i++) await Promise.resolve()
}

const state = () => useLineageStore.getState()

beforeEach(() => {
  for (const fn of Object.values(stubApi.lineage)) fn.mockReset()
  stubApi.lineage.graph.mockResolvedValue({ ok: true, data: { nodes: [], edges: [] } })
  stubApi.lineage.upsertNode.mockImplementation(async (req: Partial<LineageNode>) =>
    ({ ok: true, data: { ...node(req.id ?? 'X'), ...req, updatedAt: 'server' } as LineageNode })
  )
  stubApi.lineage.removeNode.mockResolvedValue({ ok: true, data: { ok: true } })
  stubApi.lineage.upsertEdge.mockImplementation(async (req: { id?: string; from: string; to: string }) =>
    ({ ok: true, data: edge(req.id ?? `e-${req.from}-${req.to}`, req.from, req.to) })
  )
  stubApi.lineage.removeEdge.mockResolvedValue({ ok: true, data: { ok: true } })
  stubApi.lineage.upsertLineTypes.mockImplementation(async (req: string[]) => ({ ok: true, data: [...req] }))
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
    undoStack: [],
    redoStack: [],
    folderId: '__main__'
  })
  useLineageViewStore.setState({ mode: 'browse', focusSet: [], navCollapsed: false, navWidth: 208 })
})

describe('F-LGRAPH-01②U1 暂存（enqueue 不 flush——A7 单一写路径）', () => {
  it('编辑动作入暂存：不发 IPC+saveStatus=dirty+本地乐观值即时可见+undo 栈入快照', async () => {
    useLineageStore.setState({ nodes: [node('A', { coreIdea: '原想法' })] })
    state().editCoreIdea('A', '新想法')
    await settle()
    expect(stubApi.lineage.upsertNode).not.toHaveBeenCalled() // 不自动落库（A7）
    expect(state().saveStatus).toBe('dirty')
    expect(state().nodes[0]?.coreIdea).toBe('新想法') // 乐观应用即时可见
    expect(state().queue).toHaveLength(1)
    expect(state().undoStack).toHaveLength(1) // 一单元=一撤销步
  })

  it('新建类动作乐观生成 id：addPaperNode 本地节点立即在场（uuid=落库 id——无临时 id 漂移）', () => {
    state().addPaperNode({ id: 'paper-N', title: '新文献', year: 2024 })
    expect(state().nodes).toHaveLength(1)
    const n = state().nodes[0]!
    expect(n.paperId).toBe('paper-N')
    expect(n.id).toBeTruthy()
    expect(state().saveStatus).toBe('dirty')
    // 画线类新建（linkNodes）：乐观边即时在场
    useLineageStore.setState({ nodes: [node('A'), node('B')] })
    state().linkNodes('A', 'B')
    expect(state().edges).toHaveLength(1)
    expect(state().edges[0]!.fromNode).toBe('A')
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

describe('F-LGRAPH-01②U1 撤销/重做（快照制——每单元前图态全量浅快照）', () => {
  it('undo 逐步回退：编辑甲→编辑乙→undo（回乙前）→undo（回基线=clean）', async () => {
    useLineageStore.setState({ nodes: [node('A', { coreIdea: '基线' })] })
    state().editCoreIdea('A', '甲')
    state().editCoreIdea('A', '乙')
    expect(state().undoStack).toHaveLength(2)
    state().undo()
    expect(state().nodes[0]?.coreIdea).toBe('甲')
    expect(state().saveStatus).toBe('dirty')
    state().undo()
    expect(state().nodes[0]?.coreIdea).toBe('基线')
    expect(state().saveStatus).toBe('clean') // §2.2：undo 回到基线=clean
    expect(state().queue).toHaveLength(0)
    expect(stubApi.lineage.upsertNode).not.toHaveBeenCalled()
  })

  it('redo 重放：undo 后 redo 恢复编辑值+dirty；新编辑即清 redo 栈', async () => {
    useLineageStore.setState({ nodes: [node('A', { coreIdea: '基线' })] })
    state().editCoreIdea('A', '甲')
    state().undo()
    expect(state().redoStack).toHaveLength(1)
    state().redo()
    expect(state().nodes[0]?.coreIdea).toBe('甲')
    expect(state().saveStatus).toBe('dirty')
    // 新编辑清 redo
    state().undo()
    state().editCoreIdea('A', '丙')
    expect(state().redoStack).toHaveLength(0)
  })

  it('栈空 undo/redo=no-op（栈长派生判空）', () => {
    expect(state().undoStack).toHaveLength(0)
    expect(state().redoStack).toHaveLength(0)
    state().undo()
    state().redo()
    expect(state().saveStatus).toBe('clean')
    useLineageStore.setState({ nodes: [node('A')] })
    state().editCoreIdea('A', 'x')
    expect(state().undoStack).toHaveLength(1)
    expect(state().redoStack).toHaveLength(0)
  })

  it('跨格序列 §2.6-2：保存→undo 无效（栈基线重置——Word 式）', async () => {
    useLineageStore.setState({ nodes: [node('A', { coreIdea: '基线' })] })
    state().editCoreIdea('A', '甲')
    state().save()
    await settle()
    expect(state().saveStatus).toBe('clean')
    expect(stubApi.lineage.upsertNode).toHaveBeenCalledTimes(1)
    expect(state().undoStack).toHaveLength(0)
    state().undo() // 栈空——no-op 不回保存前
    expect(state().nodes[0]?.coreIdea).toBe('甲')
  })
})

describe('F-LGRAPH-01②U1 save() 批量落库（§2.2 saving 态+行内错误）', () => {
  it('save：saving→clean（成功）+撤销栈基线重置+服务器行回填', async () => {
    useLineageStore.setState({ nodes: [node('A', { coreIdea: '原' })] })
    state().editCoreIdea('A', '甲')
    state().save()
    expect(state().saveStatus).toBe('saving')
    await settle()
    expect(state().saveStatus).toBe('clean')
    expect(state().lastWriteError).toBeNull()
    expect(state().undoStack).toHaveLength(0)
    expect(state().redoStack).toHaveLength(0)
    expect(state().nodes[0]?.coreIdea).toBe('甲')
  })

  it('save 失败=dirty 保持（队首保留）+error 指示+重试成功恢复 clean', async () => {
    useLineageStore.setState({ nodes: [node('A')] })
    stubApi.lineage.upsertNode
      .mockResolvedValueOnce({ ok: false, error: { code: 'DB_ERROR', message: '写入失败' } })
      .mockResolvedValueOnce({ ok: true, data: { ...node('A'), updatedAt: 'server' } })
    state().editCoreIdea('A', '甲')
    state().save()
    await settle()
    expect(state().saveStatus).toBe('error') // 失败≠saved——dirty 语义由 error 档承载（保存失败指示）
    expect(state().queue).toHaveLength(1) // 动作保留
    expect(state().lastWriteError).toBe('写入失败')
    state().retrySave()
    await settle()
    expect(state().saveStatus).toBe('clean')
    expect(state().undoStack).toHaveLength(0)
  })

  it('连续多次编辑一次 save：同实体合并（lazy 载荷读最新行——最后写胜出）', async () => {
    useLineageStore.setState({ nodes: [node('A', { coreIdea: '原' })] })
    state().editCoreIdea('A', '一')
    state().editCoreIdea('A', '二')
    state().save()
    await settle()
    expect(stubApi.lineage.upsertNode).toHaveBeenCalledTimes(1)
    expect(stubApi.lineage.upsertNode).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'A', coreIdea: '二' })
    )
    expect(state().saveStatus).toBe('clean')
  })

  it('CONFLICT 拒绝型：动作丢弃+toast reason+库态刷新回填（乐观值不残留——服务器权威）', async () => {
    useLineageStore.setState({ nodes: [node('A'), node('B'), node('C')] })
    stubApi.lineage.upsertEdge.mockResolvedValue({
      ok: false,
      error: { code: 'CONFLICT', message: '成环拒绝：该边将使脉络图出现环路（连线不得成环）' }
    })
    stubApi.lineage.graph.mockResolvedValue({
      ok: true,
      data: { nodes: [node('A'), node('B'), node('C')], edges: [] }
    })
    state().linkNodes('C', 'B')
    expect(state().edges).toHaveLength(1) // 乐观边在场
    state().save()
    await settle(10)
    expect(showToast).toHaveBeenCalledWith('成环拒绝：该边将使脉络图出现环路（连线不得成环）', 'error')
    expect(state().saveStatus).toBe('clean')
    expect(state().queue).toHaveLength(0)
    // 乐观边被库态刷新清除（graph 重拉回填——服务器权威）
    expect(state().edges).toHaveLength(0)
  })
})

describe('F-LGRAPH-01②U1 跨格序列（§2.6 拷问面）', () => {
  it('§2.6-1 edit(dirty)→browse→edit：暂存保留、栈不清、保存钮仍亮（dirty 保持）', () => {
    useLineageStore.setState({ nodes: [node('A')] })
    state().editCoreIdea('A', '甲')
    const queueBefore = state().queue
    const undoBefore = state().undoStack.length
    useLineageViewStore.getState().setMode('browse')
    useLineageViewStore.getState().setMode('edit')
    expect(state().queue).toBe(queueBefore) // 同引用=未动
    expect(state().undoStack).toHaveLength(undoBefore)
    expect(state().saveStatus).toBe('dirty')
  })

  it('§2.6 编辑中跳页返回：dirty 时 load 丢弃（暂存保留——load 互锁扩面）', async () => {
    useLineageStore.setState({ nodes: [node('A', { coreIdea: '甲' })] })
    state().editCoreIdea('A', '乙')
    await state().load() // 模拟重挂载取数
    expect(state().nodes[0]?.coreIdea).toBe('乙') // 库读被丢弃
    expect(state().saveStatus).toBe('dirty')
  })

  it('§2.6-3 dirty 切图确认分支：discardSession 清队列+清栈+回 clean（库态随后重取覆盖）', () => {
    useLineageStore.setState({ nodes: [node('A')] })
    state().editCoreIdea('A', '甲')
    state().linkNodes('A', 'Z')
    expect(state().queue).toHaveLength(2)
    state().discardSession()
    expect(state().queue).toHaveLength(0)
    expect(state().undoStack).toHaveLength(0)
    expect(state().redoStack).toHaveLength(0)
    expect(state().saveStatus).toBe('clean')
    expect(state().lastWriteError).toBeNull()
  })

  it('saving 态 undo/redo/编辑锁定（§2.2 工具组锁定）', async () => {
    useLineageStore.setState({ nodes: [node('A')] })
    let resolveWrite!: (v: { ok: true; data: LineageNode }) => void
    stubApi.lineage.upsertNode.mockImplementationOnce(
      () => new Promise((r) => { resolveWrite = r })
    )
    state().editCoreIdea('A', '甲')
    state().save()
    state().undo() // saving 中——no-op
    expect(state().nodes[0]?.coreIdea).toBe('甲')
    resolveWrite({ ok: true, data: { ...node('A', { coreIdea: '甲' }), updatedAt: 'server' } })
    await settle()
    expect(state().saveStatus).toBe('clean')
  })

  it('[回炉 R5] saving 中编辑不入栈不入队（INV-94 saving 闸——beginUnit 域 flushing 拒绝）', async () => {
    useLineageStore.setState({ nodes: [node('A')] })
    let resolveWrite!: (v: { ok: true; data: LineageNode }) => void
    stubApi.lineage.upsertNode.mockImplementationOnce(
      () => new Promise((r) => { resolveWrite = r })
    )
    state().editCoreIdea('A', '甲')
    state().save()
    expect(state().saveStatus).toBe('saving')
    const undoDepth = state().undoStack.length // 1（甲单元）
    const queueLen = state().queue.length // 1（派发中）
    state().editCoreIdea('A', '乙') // saving 中编辑=拒绝
    expect(state().undoStack).toHaveLength(undoDepth) // 不入栈
    expect(state().queue).toHaveLength(queueLen) // 不入队
    expect(state().nodes[0]?.coreIdea).toBe('甲') // 乐观应用同拒（编辑无效）
    resolveWrite({ ok: true, data: { ...node('A', { coreIdea: '甲' }), updatedAt: 'server' } })
    await settle()
    expect(state().saveStatus).toBe('clean')
    state().editCoreIdea('A', '丙') // clean 后恢复可编辑
    expect(state().undoStack).toHaveLength(1)
  })

  it('[回炉 R20] undoStack 深度截断 50（INV-23 先例）：第 51 单元起丢最旧快照', () => {
    useLineageStore.setState({ nodes: [node('A')] })
    for (let i = 1; i <= 55; i++) state().editCoreIdea('A', `想法${String(i)}`)
    expect(state().undoStack).toHaveLength(50) // 55 单元→栈深 50
    for (let i = 0; i < 50; i++) state().undo()
    // 栈底=第 6 单元前快照（前 5 步被截断）——undo 到底=想法5（dirty）
    expect(state().nodes[0]?.coreIdea).toBe('想法5')
    expect(state().saveStatus).toBe('dirty')
  })

  it('[回炉 R17] §2.6-5 via 随 undo 恢复：setEdgeVia→undo→via 回前值；redo 重放', () => {
    useLineageStore.setState({ nodes: [node('A'), node('B')], edges: [edge('e1', 'A', 'B')] })
    state().setEdgeVia('e1', [{ x: 10, y: 10 }])
    expect(state().edges[0]?.via).toEqual([{ x: 10, y: 10 }])
    state().undo()
    expect(state().edges[0]?.via).toBeUndefined() // via 回前值（自动路由态）
    state().redo()
    expect(state().edges[0]?.via).toEqual([{ x: 10, y: 10 }])
  })

  it('[回炉 R9] 画线双 toast 合一：暂存提示在场+flush 成功 toast 抑制（drawEdge 动作面）', async () => {
    useLineageStore.setState({ nodes: [node('A'), node('B')] })
    state().drawEdge('A', 'B', { dashed: false, color: LINE_TYPE_COLORS[0], label: '主线' })
    expect(showToast).toHaveBeenCalledWith('已画线，保存后生效', 'success') // 暂存提示保留
    vi.mocked(showToast).mockClear()
    state().save()
    await settle()
    expect(state().saveStatus).toBe('clean')
    expect(showToast).not.toHaveBeenCalledWith('连线已保存', 'success') // flush 成功 toast 抑制
    // 对照：linkNodes（其余新建边面）成功 toast 保持
    vi.mocked(showToast).mockClear()
    state().linkNodes('A', 'B')
    state().save()
    await settle()
    expect(showToast).toHaveBeenCalledWith('连线已保存', 'success')
  })
})
