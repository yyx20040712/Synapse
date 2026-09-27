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
import type { LineageEdge, LineageNode, LineTypeGroup } from '../../../src/shared/models/lineage'

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
    createdAt: 't',
    updatedAt: 't',
    ...patch
  }
}

function edge(id: string, from: string, to: string, kind: LineageEdge['kind'] = 'tree'): LineageEdge {
  return { id, fromNode: from, toNode: to, label: '', kind, sub: null, createdAt: 't', updatedAt: 't' }
}

/** [T3-P7B] 恒四组空线型夹具（saveLineTypes 消费面） */
const EMPTY_GROUPS: LineTypeGroup[] = [
  { base: 'tree', subs: [] },
  { base: 'inferred', subs: [] },
  { base: 'ref', subs: [] },
  { base: 'manual', subs: [] }
]

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
  stubApi.lineage.upsertLineTypes.mockResolvedValue({ ok: true, data: EMPTY_GROUPS })
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
    // [T3-P6 回炉 d1-W5] 新建边成功 toast=P6 连线视觉退役至 P7 期间唯一
    // 可见反馈（tree 默认文案）
    expect(showToast).toHaveBeenCalledWith('父子连线已保存', 'success')

    stubApi.lineage.removeEdge.mockResolvedValue({ ok: true, data: { ok: true } })
    state().removeEdge('e1')
    await settle()
    expect(stubApi.lineage.removeEdge).toHaveBeenCalledWith({ id: 'e1' })
    expect(state().edges.map((e) => e.id)).toEqual(['e2'])
  })

  it('新建边成功 toast 按 kind 分文案（ref/manual）；label 后编辑（id 在场）不 toast', async () => {
    useLineageStore.setState({ nodes: [node('A'), node('B')], edges: [edge('e1', 'A', 'B')] })
    stubApi.lineage.upsertEdge.mockResolvedValue({ ok: true, data: edge('e2', 'B', 'A') })
    state().linkRefNodes('B', 'A')
    await settle()
    expect(showToast).toHaveBeenCalledWith('综述关联已保存', 'success')

    vi.mocked(showToast).mockClear()
    stubApi.lineage.upsertEdge.mockResolvedValue({ ok: true, data: edge('e3', 'A', 'B', 'manual') })
    state().linkManualParent('B', 'A')
    await settle()
    expect(showToast).toHaveBeenCalledWith('人工父线已保存', 'success')

    // label 后编辑走 id 更新语义——成功不 toast（防噪）
    vi.mocked(showToast).mockClear()
    stubApi.lineage.upsertEdge.mockResolvedValue({ ok: true, data: edge('e3', 'A', 'B', 'manual') })
    state().editManualEdgeLabel('e3', '新标注')
    await settle()
    expect(showToast).not.toHaveBeenCalled()
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

describe('lineage.store 写面 —— [T3-P7B] 线型编辑三 action（applyEdgeLine/linkWithLine/saveLineTypes）', () => {
  it('applyEdgeLine 全载荷：id+from/to/label 读现值+kind/sub 成对置（sub null=回退基础型）', async () => {
    useLineageStore.setState({
      nodes: [node('A'), node('B')],
      edges: [edge('e1', 'A', 'B', 'ref')]
    })
    // 既有 label 读现值（全载荷防半更新清字段——沿 fullRowInput 惯例）
    useLineageStore.setState({
      edges: [{ ...edge('e1', 'A', 'B', 'ref'), label: '继承甲' }]
    })
    stubApi.lineage.upsertEdge.mockResolvedValue({
      ok: true,
      data: { ...edge('e1', 'A', 'B', 'manual'), label: '继承甲', sub: 't1' }
    })
    state().applyEdgeLine('e1', 'manual', 't1')
    await settle()
    expect(stubApi.lineage.upsertEdge).toHaveBeenCalledWith({
      id: 'e1',
      from: 'A',
      to: 'B',
      label: '继承甲',
      kind: 'manual',
      sub: 't1'
    })
    // 回填：saved 行入 store（kind/sub 更新面）
    expect(state().edges[0]?.kind).toBe('manual')
    expect(state().edges[0]?.sub).toBe('t1')
    // id 在场=更新语义不 toast（防噪——editManualEdgeLabel 同款）
    expect(showToast).not.toHaveBeenCalled()

    // sub null 合法=回退基础型（载荷显式 sub:null——服务端归一同义）
    state().applyEdgeLine('e1', 'tree', null)
    await settle()
    expect(stubApi.lineage.upsertEdge).toHaveBeenLastCalledWith({
      id: 'e1',
      from: 'A',
      to: 'B',
      label: '继承甲',
      kind: 'tree',
      sub: null
    })
  })

  it('linkWithLine 新建四 kind（inferred 产生入口落位——INV-27 P7 备案兑现）+成功 toast 分文案', async () => {
    useLineageStore.setState({ nodes: [node('A'), node('B')] })
    stubApi.lineage.upsertEdge.mockResolvedValue({
      ok: true,
      data: { ...edge('e2', 'A', 'B', 'inferred'), sub: 'i1' }
    })
    state().linkWithLine('A', 'B', 'inferred', 'i1')
    await settle()
    expect(stubApi.lineage.upsertEdge).toHaveBeenCalledWith({
      from: 'A',
      to: 'B',
      label: '',
      kind: 'inferred',
      sub: 'i1'
    })
    expect(state().edges.map((e) => e.kind)).toEqual(['inferred'])
    expect(showToast).toHaveBeenCalledWith('推断连线已保存', 'success')

    // kind 缺省面沿四 kind：manual+sub null（基础型）
    stubApi.lineage.upsertEdge.mockResolvedValue({ ok: true, data: edge('e3', 'B', 'A', 'manual') })
    state().linkWithLine('B', 'A', 'manual', null)
    await settle()
    expect(stubApi.lineage.upsertEdge).toHaveBeenLastCalledWith({
      from: 'B',
      to: 'A',
      label: '',
      kind: 'manual',
      sub: null
    })
  })

  it('linkWithLine CONFLICT（service 树守卫拒绝）：动作丢弃+toast reason+保存态回落 saved（沿 linkRefNodes 先例）', async () => {
    useLineageStore.setState({ nodes: [node('A'), node('B'), node('C')] })
    stubApi.lineage.upsertEdge.mockResolvedValue({
      ok: false,
      error: { code: 'CONFLICT', message: '多父边拒绝：节点 B 已有父节点 A（树至多一父）' }
    })
    state().linkWithLine('C', 'B', 'inferred', null)
    await settle()
    expect(showToast).toHaveBeenCalledWith('多父边拒绝：节点 B 已有父节点 A（树至多一父）', 'error')
    expect(state().queue.length).toBe(0)
    expect(state().saveStatus).toBe('saved')
    expect(state().edges.length).toBe(0)
  })

  it('saveLineTypes 新队列动作 upsert-line-types：整批写+成功 set lineTypes', async () => {
    const groups: LineTypeGroup[] = [
      { base: 'tree', subs: [{ id: 'tree-s1', name: '线型 1', color: '#3a5bd9', dash: '', w: 1.7 }] },
      { base: 'inferred', subs: [] },
      { base: 'ref', subs: [] },
      { base: 'manual', subs: [] }
    ]
    // 服务端回显=校验后恒四组枚举序（同组形状）
    stubApi.lineage.upsertLineTypes.mockResolvedValue({ ok: true, data: groups })
    state().saveLineTypes(groups)
    await settle()
    expect(stubApi.lineage.upsertLineTypes).toHaveBeenCalledWith(groups)
    expect(state().lineTypes).toEqual(groups)
    expect(state().saveStatus).toBe('saved')
  })

  it('saveLineTypes sameTarget 同类合并（整批=单实体——flight 中排队合并最后写胜出）', async () => {
    const g1: LineTypeGroup[] = [...EMPTY_GROUPS]
    const g2: LineTypeGroup[] = [
      { base: 'tree', subs: [{ id: 'tree-s1', name: '线型 1', color: '#3a5bd9', dash: '', w: 1.7 }] },
      { base: 'inferred', subs: [] },
      { base: 'ref', subs: [] },
      { base: 'manual', subs: [] }
    ]
    const g3: LineTypeGroup[] = [
      { base: 'tree', subs: [{ id: 'tree-s1', name: '线型 1', color: '#3a5bd9', dash: '', w: 1.7 }, { id: 'tree-s2', name: '线型 2', color: '#0f8a6d', dash: '6 3', w: 1.7 }] },
      { base: 'inferred', subs: [] },
      { base: 'ref', subs: [] },
      { base: 'manual', subs: [] }
    ]
    // 首航悬挂（既有「连续编辑最后写胜出」it 同型探针）：g1 派发中 g2/g3 排队
    let resolveFirst!: (v: { ok: true; data: LineTypeGroup[] }) => void
    stubApi.lineage.upsertLineTypes
      .mockImplementationOnce(() => new Promise((r) => { resolveFirst = r }))
      .mockImplementationOnce(async () => ({ ok: true, data: g3 }))
    state().saveLineTypes(g1)
    state().saveLineTypes(g2)
    state().saveLineTypes(g3)
    await settle()
    expect(stubApi.lineage.upsertLineTypes).toHaveBeenCalledTimes(1) // g2 被合并未派发
    resolveFirst({ ok: true, data: g1 })
    await settle()
    expect(stubApi.lineage.upsertLineTypes).toHaveBeenCalledTimes(2)
    expect(stubApi.lineage.upsertLineTypes).toHaveBeenLastCalledWith(g3)
    expect(state().lineTypes).toEqual(g3)
  })

  it('队列序保证 lineTypes 先于引用其的 edge（saveLineTypes→linkWithLine 串行派发序）', async () => {
    const groups: LineTypeGroup[] = [
      { base: 'tree', subs: [{ id: 'tree-s1', name: '线型 1', color: '#3a5bd9', dash: '', w: 1.7 }] },
      { base: 'inferred', subs: [] },
      { base: 'ref', subs: [] },
      { base: 'manual', subs: [] }
    ]
    stubApi.lineage.upsertLineTypes.mockResolvedValue({ ok: true, data: groups })
    stubApi.lineage.upsertEdge.mockResolvedValue({
      ok: true,
      data: { ...edge('e2', 'A', 'B', 'tree'), sub: 'tree-s1' }
    })
    useLineageStore.setState({ nodes: [node('A'), node('B')] })
    state().saveLineTypes(groups)
    state().linkWithLine('A', 'B', 'tree', 'tree-s1')
    await settle()
    // 派发序：upsertLineTypes 先于 upsertEdge（FIFO——引用完整性写序）
    const orderLt = stubApi.lineage.upsertLineTypes.mock.invocationCallOrder[0]
    const orderEdge = stubApi.lineage.upsertEdge.mock.invocationCallOrder[0]
    expect(orderLt).toBeDefined()
    expect(orderEdge).toBeDefined()
    expect(orderLt!).toBeLessThan(orderEdge!)
    expect(state().saveStatus).toBe('saved')
  })

  it('flight 堆积面派发序=FIFO：三动作同驻队列时按入队序派发（LIFO 即红）', async () => {
    // 首航悬挂（边 X in flight）→lineTypes/边 Y 相继入队（三动作同驻队列）
    // ——释放后派发序=入队序：X→lineTypes→Y（引用完整性写序的堆积相位证据）
    const groups: LineTypeGroup[] = [
      { base: 'tree', subs: [{ id: 'tree-s1', name: '线型 1', color: '#3a5bd9', dash: '', w: 1.7 }] },
      { base: 'inferred', subs: [] },
      { base: 'ref', subs: [] },
      { base: 'manual', subs: [] }
    ]
    let resolveFirst!: (v: { ok: true; data: LineageEdge }) => void
    stubApi.lineage.upsertEdge
      .mockImplementationOnce(() => new Promise((r) => { resolveFirst = r }))
      .mockImplementation(async (req: { from: string }) =>
        ({ ok: true, data: edge(`e-${req.from}`, req.from, 'B', 'tree') })
      )
    stubApi.lineage.upsertLineTypes.mockResolvedValue({ ok: true, data: groups })
    useLineageStore.setState({ nodes: [node('A'), node('B'), node('C')] })
    state().linkWithLine('A', 'B', 'tree', null) // X：in flight（悬挂）
    state().saveLineTypes(groups) // 排队（入队序第 2）
    state().linkWithLine('C', 'B', 'tree', 'tree-s1') // 排队（入队序第 3）
    await settle()
    expect(stubApi.lineage.upsertEdge).toHaveBeenCalledTimes(1) // 仅 X 已派发
    resolveFirst({ ok: true, data: edge('e-A', 'A', 'B', 'tree') })
    await settle(12)
    // FIFO：lineTypes 先于入队更晚的边 Y
    const orderLt = stubApi.lineage.upsertLineTypes.mock.invocationCallOrder[0]
    const orderY = stubApi.lineage.upsertEdge.mock.invocationCallOrder[1]
    expect(orderLt).toBeDefined()
    expect(orderY).toBeDefined()
    expect(orderLt!).toBeLessThan(orderY!)
    expect(state().saveStatus).toBe('saved')
  })
})
