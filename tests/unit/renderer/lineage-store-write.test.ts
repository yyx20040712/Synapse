// @vitest-environment jsdom
/**
 * [LG-03] lineage.store 写面 —— 保存态三态/动作排队最后写胜出/dirty 投影/N5
 * 改父部分失败（锁定合约，always-active——不经 guardedDescribe）。
 * （环境=jsdom：client.ts 顶层读 window.api，importOriginal 期即需 DOM 全局。）
 *
 * 写面状态机（宪法前置，票面行为层）：
 * - 态空间：saveStatus ∈ {saved, saving, error} × queue（写动作序列，驻 state）
 * - 迁移：saved+edit→saving（入队+flush 派发）/saving+edit→saving（同实体排队
 *   合并=最后写胜出）/flush 成功且队列空→saved（数据回填）/系统型失败→error
 *   （队首保留+toast+重试按钮）/CONFLICT 拒绝型→丢弃动作继续队列（toast
 *   reason，守卫宿主=LG-01 service INV-27）/error+retry→saving（重发保留队列）
 * - 跨格序列：连续编辑中保存失败→后续编辑不丢（队列保留+合并）；改父删成功
 *   +加失败=合法中间态（节点暂无父，森林语义）+toast 指明+重试只重发加边
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type * as clientModule from '../../../src/renderer/api/client'
import type * as toastStoreModule from '../../../src/renderer/shared/ui/toast-store'

const { stubApi } = vi.hoisted(() => ({
  stubApi: {
    lineage: {
      graph: vi.fn(),
      upsertNode: vi.fn(),
      removeNode: vi.fn(),
      upsertEdge: vi.fn(),
      removeEdge: vi.fn()
    }
  }
}))

vi.mock('../../../src/renderer/api/client', async (importOriginal) => {
  const real = await importOriginal<typeof clientModule>()
  return { ...real, api: stubApi as unknown as typeof clientModule.api }
})

vi.mock('../../../src/renderer/shared/ui/toast-store', async (importOriginal) => {
  const real = await importOriginal<typeof toastStoreModule>()
  return { ...real, showToast: vi.fn(real.showToast) }
})

import { showToast } from '../../../src/renderer/shared/ui/toast-store'
import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'
import type { LineageEdge, LineageNode } from '../../../src/shared/models/lineage'

function node(id: string, patch: Partial<LineageNode> = {}): LineageNode {
  return {
    id,
    paperId: `paper-${id}`,
    title: `节点${id}`,
    coreIdea: '',
    year: 2020,
    x: null,
    y: null,
    createdAt: 't',
    updatedAt: 't',
    ...patch
  }
}

function edge(id: string, from: string, to: string): LineageEdge {
  return { id, fromNode: from, toNode: to, label: '', createdAt: 't', updatedAt: 't' }
}

/** 落库后回传的服务器行（updatedAt 刷新面不参与断言，同形即可） */
const serverNode = (n: LineageNode): LineageNode => ({ ...n, updatedAt: 'server' })

/** 微任务排空：串行 flush 的逐动作推进（每动作两级 await：unwrap+回填 set） */
const settle = async (turns = 6): Promise<void> => {
  for (let i = 0; i < turns; i++) await Promise.resolve()
}

const state = () => useLineageStore.getState()

beforeEach(() => {
  vi.clearAllMocks()
  // once 队列跨用例残留防御（clearAllMocks 不清 once）：逐 fn reset 后重设默认
  for (const fn of Object.values(stubApi.lineage)) fn.mockReset()
  stubApi.lineage.graph.mockResolvedValue({ ok: true, data: { nodes: [], edges: [] } })
  stubApi.lineage.upsertNode.mockResolvedValue({ ok: true, data: node('X') })
  stubApi.lineage.removeNode.mockResolvedValue({ ok: true, data: { ok: true } })
  stubApi.lineage.upsertEdge.mockResolvedValue({ ok: true, data: edge('ex', 'a', 'b') })
  stubApi.lineage.removeEdge.mockResolvedValue({ ok: true, data: { ok: true } })
  useLineageStore.setState({
    nodes: [],
    edges: [],
    status: 'ready',
    error: null,
    saveStatus: 'saved',
    lastWriteError: null,
    queue: [],
    flushing: false
  })
})

describe('lineage.store 写面 —— 保存态三态+排队（INV-04 同型：失败不推进 savedAt）', () => {
  it('加节点两型载荷：文献型 paperId 绑定+元数据默认；主题型 paperId null', async () => {
    stubApi.lineage.upsertNode.mockImplementation(async (req: { title: string }) =>
      ({ ok: true, data: serverNode(node('N1', { title: req.title })) })
    )
    state().addPaperNode({ id: 'paper-X', title: '扩散模型', year: 2021 })
    await settle()
    expect(stubApi.lineage.upsertNode).toHaveBeenCalledWith({
      paperId: 'paper-X',
      title: '扩散模型',
      coreIdea: '',
      year: 2021,
      x: null,
      y: null
    })

    stubApi.lineage.upsertNode.mockImplementation(async (req: { title: string }) =>
      ({ ok: true, data: serverNode(node('N2', { title: req.title, paperId: null })) })
    )
    state().addThemeNode('阶段二')
    await settle()
    expect(stubApi.lineage.upsertNode).toHaveBeenLastCalledWith({
      paperId: null,
      title: '阶段二',
      coreIdea: '',
      year: null,
      x: null,
      y: null
    })
    // 回填：upsert 成功回传行入 store（nodes 追加）
    expect(state().nodes.map((n) => n.title)).toEqual(['扩散模型', '阶段二'])
    expect(state().saveStatus).toBe('saved')
  })

  it('moveNode/editCoreIdea 全字段载荷：x/y 覆盖与 coreIdea 保留互不清空（防半更新丢字段）', async () => {
    useLineageStore.setState({
      nodes: [node('A', { x: 500, y: 400, coreIdea: '原想法', title: '锚点' })]
    })
    // 服务器忠实回显请求行（upsert 语义——回填值即载荷值，防 mock 半行污染后续断言）
    stubApi.lineage.upsertNode.mockImplementation(async (req: Partial<LineageNode>) =>
      ({ ok: true, data: serverNode(node('A', req)) })
    )
    state().moveNode('A', 560, 430)
    await settle()
    expect(stubApi.lineage.upsertNode).toHaveBeenCalledWith({
      id: 'A',
      paperId: 'paper-A',
      title: '锚点',
      coreIdea: '原想法',
      year: 2020,
      x: 560,
      y: 430
    })

    state().editCoreIdea('A', '新想法')
    await settle()
    expect(stubApi.lineage.upsertNode).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'A', coreIdea: '新想法', x: 560, y: 430, title: '锚点' })
    )
  })

  it('连续编辑最后写胜出：flight 中同实体动作排队合并，仅最后值落发', async () => {
    useLineageStore.setState({ nodes: [node('A')] })
    let resolveFirst!: (v: { ok: true; data: LineageNode }) => void
    stubApi.lineage.upsertNode.mockImplementationOnce(
      () => new Promise((r) => { resolveFirst = r })
    )
    stubApi.lineage.upsertNode.mockImplementationOnce(async () =>
      ({ ok: true, data: serverNode(node('A', { x: 300, y: 200 })) })
    )
    state().moveNode('A', 100, 100) // 首发进入 flight（pending）
    state().moveNode('A', 200, 150) // 入队待发
    state().moveNode('A', 300, 200) // 合并替换上一条（最后写胜出）
    await settle()
    expect(stubApi.lineage.upsertNode).toHaveBeenCalledTimes(1)
    resolveFirst({ ok: true, data: serverNode(node('A', { x: 100, y: 100 })) })
    await settle()
    // 队列合并后总调用恰 2 次，第二次=最后值
    expect(stubApi.lineage.upsertNode).toHaveBeenCalledTimes(2)
    expect(stubApi.lineage.upsertNode).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'A', x: 300, y: 200 })
    )
    expect(state().saveStatus).toBe('saved')
  })

  it('系统型失败：saveStatus=error（dirty 投影真）+队列保留+toast；retry 重发成功恢复 saved', async () => {
    useLineageStore.setState({ nodes: [node('A')] })
    stubApi.lineage.upsertNode
      .mockResolvedValueOnce({ ok: false, error: { code: 'DB_ERROR', message: 'database is locked' } })
      .mockResolvedValueOnce({ ok: true, data: serverNode(node('A', { x: 11, y: 22 })) })
    state().moveNode('A', 11, 22)
    await settle()
    expect(state().saveStatus).toBe('error') // 失败≠saved——INV-04 同型不推进
    expect(state().lastWriteError).toBe('database is locked')
    expect(state().queue.length).toBe(1) // 动作保留不丢
    expect(showToast).toHaveBeenCalledWith('database is locked', 'error')
    // retry → 重发 → 成功恢复
    state().retrySave()
    await settle()
    expect(stubApi.lineage.upsertNode).toHaveBeenCalledTimes(2)
    expect(state().saveStatus).toBe('saved')
    expect(state().lastWriteError).toBeNull()
  })

  it('拒绝型（CONFLICT=service 树守卫中文 reason 透传）：动作丢弃+toast reason+保存态回落 saved', async () => {
    useLineageStore.setState({ nodes: [node('A'), node('B'), node('C')] })
    stubApi.lineage.upsertEdge.mockResolvedValue({
      ok: false,
      error: { code: 'CONFLICT', message: '多父边拒绝：节点 B 已有父节点 A（树至多一父）' }
    })
    state().linkNodes('C', 'B')
    await settle()
    expect(showToast).toHaveBeenCalledWith(
      '多父边拒绝：节点 B 已有父节点 A（树至多一父）', 'error'
    )
    expect(state().queue.length).toBe(0) // 永不成功的动作丢弃（不卡队头）
    expect(state().saveStatus).toBe('saved') // 无待保存内容——脏态不误报
    expect(state().edges.length).toBe(0) // 边未落库未回填
  })

  it('removeNode 回填级联：节点与其悬空边一并清除（DDL CASCADE 的 store 镜像）', async () => {
    useLineageStore.setState({
      nodes: [node('A'), node('B')],
      edges: [edge('e1', 'A', 'B'), edge('e2', 'B', 'A')]
    })
    stubApi.lineage.removeNode.mockResolvedValue({ ok: true, data: { ok: true } })
    state().removeNode('A')
    await settle()
    expect(stubApi.lineage.removeNode).toHaveBeenCalledWith({ id: 'A' })
    expect(state().nodes.map((n) => n.id)).toEqual(['B'])
    expect(state().edges).toEqual([]) // 两边都悬空（A 端点）全清
  })

  it('upsertEdge/removeEdge 成功回填：新边追加、删边清除', async () => {
    useLineageStore.setState({ nodes: [node('A'), node('B')], edges: [edge('e1', 'A', 'B')] })
    stubApi.lineage.upsertEdge.mockResolvedValue({
      ok: true, data: edge('e2', 'B', 'A')
    })
    state().linkNodes('B', 'A')
    await settle()
    expect(stubApi.lineage.upsertEdge).toHaveBeenCalledWith({ from: 'B', to: 'A', label: '' })
    expect(state().edges.map((e) => e.id)).toEqual(['e1', 'e2'])

    stubApi.lineage.removeEdge.mockResolvedValue({ ok: true, data: { ok: true } })
    state().removeEdge('e1')
    await settle()
    expect(stubApi.lineage.removeEdge).toHaveBeenCalledWith({ id: 'e1' })
    expect(state().edges.map((e) => e.id)).toEqual(['e2'])
  })

  it('N5 改父部分失败：删旧边成功+加新边失败=合法中间态+toast 指明+retry 只重发加边', async () => {
    useLineageStore.setState({
      nodes: [node('A'), node('B'), node('C')],
      edges: [edge('e-old', 'A', 'B')]
    })
    stubApi.lineage.removeEdge.mockResolvedValue({ ok: true, data: { ok: true } })
    stubApi.lineage.upsertEdge.mockResolvedValueOnce({
      ok: false, error: { code: 'DB_ERROR', message: '写入失败' }
    })
    state().reparentNode('B', 'C') // B 换父：A→C
    await settle()
    // 两调用：删旧+加新（票面 N5=service 两调用，UI 单操作）
    expect(stubApi.lineage.removeEdge).toHaveBeenCalledWith({ id: 'e-old' })
    expect(stubApi.lineage.upsertEdge).toHaveBeenCalledWith({ from: 'C', to: 'B', label: '' })
    expect(state().saveStatus).toBe('error')
    expect(showToast).toHaveBeenCalledWith('旧连线已移除，新连线未建立：写入失败', 'error')
    // 节点暂无父=合法中间态：旧边已出队清除，新边未入
    expect(state().edges).toEqual([])
    // retry：只重发加边（removeEdge 不重发——已成功）
    stubApi.lineage.upsertEdge.mockResolvedValueOnce({ ok: true, data: edge('e-new', 'C', 'B') })
    state().retrySave()
    await settle()
    expect(stubApi.lineage.removeEdge).toHaveBeenCalledTimes(1)
    expect(stubApi.lineage.upsertEdge).toHaveBeenCalledTimes(2)
    expect(state().edges.map((e) => e.id)).toEqual(['e-new'])
    expect(state().saveStatus).toBe('saved')
  })

  it('load 互锁（stale-guard 写面同族）：写队列未清空时 graph 落地丢弃，不覆盖写回填', async () => {
    let resolveGraph!: (v: { ok: true; data: { nodes: LineageNode[]; edges: LineageEdge[] } }) => void
    stubApi.lineage.graph.mockImplementationOnce(
      () => new Promise((r) => { resolveGraph = r })
    )
    let resolveWrite!: (v: { ok: true; data: LineageNode }) => void
    stubApi.lineage.upsertNode.mockImplementationOnce(
      () => new Promise((r) => { resolveWrite = r })
    )
    useLineageStore.setState({ nodes: [node('A', { x: 9, y: 9 })] })
    void state().load() // load 发起（pending）
    state().editCoreIdea('A', '编辑中') // 写入队（首动作 flight）
    resolveGraph({ ok: true, data: { nodes: [node('A')], edges: [] } }) // 旧读晚到
    resolveWrite({ ok: true, data: serverNode(node('A', { coreIdea: '编辑中', x: 9, y: 9 })) })
    await settle()
    // graph 旧读被丢弃（写进行中）——nodes 保持写回填面
    expect(state().nodes[0]?.coreIdea).toBe('编辑中')
    expect(state().status).toBe('ready')
  })
})
