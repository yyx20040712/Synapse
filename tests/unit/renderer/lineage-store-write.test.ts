// @vitest-environment jsdom
/**
 * [LG-03] lineage.store 写面 —— [F-LGRAPH-01②U1] 编辑会话语义重整版（暂存
 * +save 批量落库；保存态四态/同实体合并/INV-04 同型失败不推进/N5 改父部分
 * 失败。锁定合约，always-active——不经 guardedDescribe）。
 * （环境=jsdom：client.ts 顶层读 window.api，importOriginal 期即需 DOM 全局。）
 *
 * 会话态状态机（宪法前置，票面行为层——单源注释=lineage-write-queue 头注）：
 * - 态空间：saveStatus ∈ {clean, dirty, saving, error} × queue（暂存序列）
 * - 迁移：clean+edit→dirty（乐观+入队不发 IPC）/点保存→saving（flush 串行
 *   派发）/全部成功→clean（回填+栈基线重置）/系统型失败→error（队首保留
 *   +toast+重试）/CONFLICT 拒绝型→丢弃继续（toast reason；队列空→clean+
 *   库态重拉——乐观残值消解）
 * - 跨格序列：连续编辑合并（lazy 载荷读最新行）；改父删成功+加失败=合法
 *   中间态（森林语义）+toast 指明+重试只重发加边
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
    upsertLineTypes: vi.fn()
  }
})

import { showToast } from '../../../src/renderer/shared/ui/toast-store'
import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'
import type { LineageEdge, LineageNode } from '../../../src/shared/models/lineage'

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

function edge(id: string, from: string, to: string, dashed = false, color = '#1e3a8a'): LineageEdge {
  return { id, fromNode: from, toNode: to, label: '', dashed, color, createdAt: 't', updatedAt: 't' }
}

const NAMES_A = ['主线', '待命名', '待命名', '待命名', '待命名', '待命名']
const NAMES_B = ['主线', '副线', '对比', '支撑', '衍生', '否证']

/** [F-CONSOL-11 P3-2] 系统型失败 fixture 单源——双轨锚：code 驱行为轨（saveStatus/队列/retry），
 * message 经 const 驱显示轨（lastWriteError/toast）——英文字面非载荷，改串不破断言语义 */
const DB_LOCKED = { code: 'DB_ERROR', message: 'database is locked' } as const

/** 落库后回传的服务器行（updatedAt 刷新面不参与断言，同形即可） */
const serverNode = (n: LineageNode): LineageNode => ({ ...n, updatedAt: 'server' })

/** 微任务排空：串行 flush 的逐动作推进（每动作两级 await：unwrap+回填 set） */
const settle = async (turns = 8): Promise<void> => {
  for (let i = 0; i < turns; i++) await Promise.resolve()
}

const state = () => useLineageStore.getState()

beforeEach(() => {
  vi.clearAllMocks()
  // once 队列跨用例残留防御（clearAllMocks 不清 once）：逐 fn reset 后重设默认
  for (const fn of Object.values(stubApi.lineage)) fn.mockReset()
  stubApi.lineage.graph.mockResolvedValue({ ok: true, data: { nodes: [], edges: [] } })
  stubApi.lineage.patchNode.mockImplementation(async (req: Partial<LineageNode>) =>
    ({ ok: true, data: serverNode(node(req.id ?? 'X', req)) })
  )
  stubApi.lineage.removeNode.mockResolvedValue({ ok: true, data: { ok: true } })
  stubApi.lineage.upsertEdge.mockImplementation(async (req: { id?: string; from: string; to: string }) =>
    ({ ok: true, data: edge(req.id ?? `e-${req.from}-${req.to}`, req.from, req.to) })
  )
  stubApi.lineage.removeEdge.mockResolvedValue({ ok: true, data: { ok: true } })
  stubApi.lineage.upsertLineTypes.mockResolvedValue({ ok: true, data: [...NAMES_A] })
  useLineageStore.setState({
    nodes: [],
    edges: [],
    lineTypeNames: [...NAMES_A],
    status: 'ready',
    error: null,
    saveStatus: 'clean',
    lastWriteError: null,
    queue: [],
    flushing: false,
    undoStack: [],
    redoStack: [],
    // [F-LGRAPH-01①U4] 图作用域跨用例复位（folderId 恒有值——主图兜底）
    folderId: '__main__'
  })
})

describe('F-FOLDER-02·B 图作用域（folderId）：load 载荷', () => {
  it('[F-LGRAPH-01①U4] folderId 恒有值（并集退役——主图兜底）：初值主图+load 恒显式 {folderId} 载荷；setFolder 切图重取', async () => {
    expect(useLineageStore.getState().folderId).toBe('__main__')
    await state().load()
    expect(stubApi.lineage.graph).toHaveBeenLastCalledWith({ folderId: '__main__' }) // 恒显式（{} 缺省语义退役）
    state().setFolder('f-x')
    await settle()
    expect(useLineageStore.getState().folderId).toBe('f-x')
    expect(stubApi.lineage.graph).toHaveBeenLastCalledWith({ folderId: 'f-x' })
  })
})

describe('lineage.store 写面 —— 会话暂存+save 批量落库（INV-04 同型：失败不推进）', () => {
  // [A1b F-CONTRACTA-01] 「[RR1/k1-W1] tags=null 行全量件载荷恒含 tags:null」用例
  // 随脉络私有标签域退役删除（tags 字段消亡——清空语义面无承载对象）。

  it('[F-ALIGN-01 改写] moveNode 暂存→save 批量落库：暂存期不发 IPC+dirty；成功回填+clean（原加节点两型载荷用例随 addPaperNode/addThemeNode 退役删——节点唯一来源=入库/移动两路）', async () => {
    useLineageStore.setState({ nodes: [node('A', { x: 1, y: 2 })] })
    state().moveNode('A', 560, 430)
    // 暂存期：不发 IPC+dirty（A7）
    expect(stubApi.lineage.patchNode).not.toHaveBeenCalled()
    expect(state().saveStatus).toBe('dirty')
    state().save()
    await settle()
    expect(stubApi.lineage.patchNode).toHaveBeenCalledTimes(1)
    expect(stubApi.lineage.patchNode).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'A', x: 560, y: 430 })
    )
    // 回填：patch 成功回传行入 store（updatedAt 刷新面）
    expect(state().nodes.map((n) => n.id)).toEqual(['A'])
    expect(state().saveStatus).toBe('clean')
  })

  it('moveNode 全字段载荷：x/y 覆盖+白名单六字段随行防半更新清字段（[A3] coreIdea 键不随行负锚）', async () => {
    useLineageStore.setState({
      nodes: [node('A', { x: 500, y: 400, title: '锚点' })]
    })
    state().moveNode('A', 560, 430)
    state().save()
    await settle()
    // [T3-P8] 全字段载荷补 month/slot（防半更新清月——夹具本就 null，语义零变
    //  仅锁新全字段形状；详 lineage-store-reorder.test 同族用例）
    expect(stubApi.lineage.patchNode).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'A', title: '锚点', year: 2020, month: null, slot: null, x: 560, y: 430 })
    )
    // [A3 F-CONTRACTA-01 2026-10-04] core_idea 全退役——patch 载荷无 coreIdea 键
    // （原「coreIdea 保留互不清空」面随字段消亡；null/undefined 任意形态均不得回潮）
    const payload = stubApi.lineage.patchNode.mock.calls[0]![0] as Record<string, unknown>
    expect(Object.prototype.hasOwnProperty.call(payload, 'coreIdea')).toBe(false)
  })

  it('连续编辑最后写胜出：暂存期同实体 lazy 合并，save 单发仅最后值', async () => {
    useLineageStore.setState({ nodes: [node('A')] })
    state().moveNode('A', 100, 100) // 入队（lazy：patch={x:100,y:100}）
    state().moveNode('A', 200, 150) // 融合（同 id）
    state().moveNode('A', 300, 200) // 融合替换（最后写胜出）
    expect(state().queue).toHaveLength(1)
    state().save()
    await settle()
    expect(stubApi.lineage.patchNode).toHaveBeenCalledTimes(1)
    expect(stubApi.lineage.patchNode).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'A', x: 300, y: 200 })
    )
    expect(state().saveStatus).toBe('clean')
  })

  it('系统型失败：saveStatus=error（dirty 投影真）+队列保留+toast；retry 重发成功恢复 clean', async () => {
    useLineageStore.setState({ nodes: [node('A')] })
    stubApi.lineage.patchNode
      .mockResolvedValueOnce({ ok: false, error: { ...DB_LOCKED } })
      .mockResolvedValueOnce({ ok: true, data: serverNode(node('A', { x: 11, y: 22 })) })
    state().moveNode('A', 11, 22)
    state().save()
    await settle()
    expect(state().saveStatus).toBe('error') // 失败≠clean——INV-04 同型不推进
    expect(state().lastWriteError).toBe(DB_LOCKED.message)
    expect(state().queue.length).toBe(1) // 动作保留不丢
    expect(showToast).toHaveBeenCalledWith(DB_LOCKED.message, 'error')
    // retry → 重发 → 成功恢复
    state().retrySave()
    await settle()
    expect(stubApi.lineage.patchNode).toHaveBeenCalledTimes(2)
    expect(state().saveStatus).toBe('clean')
    expect(state().lastWriteError).toBeNull()
  })

  it('拒绝型（CONFLICT=service 守卫中文 reason 透传）：动作丢弃+toast reason+队列空回 clean+库态重拉（乐观残值消解）', async () => {
    useLineageStore.setState({ nodes: [node('A'), node('B'), node('C')] })
    stubApi.lineage.upsertEdge.mockResolvedValue({
      ok: false,
      error: { code: 'CONFLICT', message: '该逻辑线已存在（C→B），重复边被拒绝' }
    })
    stubApi.lineage.graph.mockResolvedValue({
      ok: true, data: { nodes: [node('A'), node('B'), node('C')], edges: [] }
    })
    state().linkNodes('C', 'B')
    expect(state().edges).toHaveLength(1) // 乐观边暂存期在场
    state().save()
    await settle(10)
    expect(showToast).toHaveBeenCalledWith('该逻辑线已存在（C→B），重复边被拒绝', 'error')
    expect(state().queue.length).toBe(0) // 永不成功的动作丢弃（不卡队头）
    expect(state().saveStatus).toBe('clean') // 无待保存内容——脏态不误报
    expect(state().edges.length).toBe(0) // 库态重拉回填（乐观边消解）
  })

  it('[F-CONSOL-10] CONFLICT 多条目续跑（k1-W2 承）：首条丢弃后次条继续派发落库——排空回 clean=数据一致（INV-84 队列面）', async () => {
    useLineageStore.setState({ nodes: [node('A'), node('B'), node('C'), node('D')], edges: [] })
    stubApi.lineage.upsertEdge
      .mockResolvedValueOnce({ ok: false, error: { code: 'CONFLICT', message: '该逻辑线已存在（C→B），重复边被拒绝' } })
      .mockResolvedValueOnce({ ok: true, data: edge('e-d-a', 'D', 'A') })
    stubApi.lineage.graph.mockResolvedValue({
      ok: true, data: { nodes: [node('A'), node('B'), node('C'), node('D')], edges: [edge('e-d-a', 'D', 'A')] }
    })
    state().linkNodes('C', 'B') // 首条：CONFLICT 丢弃（不同实体独立排队不融合）
    state().linkNodes('D', 'A') // 次条：续跑派发成功
    state().save()
    await settle(12)
    expect(stubApi.lineage.upsertEdge).toHaveBeenCalledTimes(2) // 续跑实证：次条仍被派发未被首条拒绝拖停
    expect(state().queue.length).toBe(0)
    expect(state().saveStatus).toBe('clean') // 排空回 clean——次条已落库（库态重拉后回填在场）
    expect(state().edges.map((e) => e.id)).toContain('e-d-a')
    expect(showToast).toHaveBeenCalledWith('该逻辑线已存在（C→B），重复边被拒绝', 'error') // 首条拒绝意图的提示面
  })

  it('[F-CONSOL-05] saveLineTypeNames 系统型失败专测：error 态+toast+队列保留；retry 重发恢复 clean（U8 色行名重整）', async () => {
    // 预置已加载值（区分「失败不回填」与「初始缺省恒真」——弱断言防御）
    const loaded = ['既有名', '乙', '丙', '丁', '戊', '己']
    useLineageStore.setState({ lineTypeNames: loaded })
    stubApi.lineage.upsertLineTypes
      .mockResolvedValueOnce({ ok: false, error: { ...DB_LOCKED } })
      .mockResolvedValueOnce({ ok: true, data: [...NAMES_A] })
    state().saveLineTypeNames(NAMES_A)
    state().save()
    await settle()
    expect(state().saveStatus).toBe('error') // 色行名失败≠clean——INV-04 同型
    expect(state().lastWriteError).toBe(DB_LOCKED.message)
    expect(state().queue.length).toBe(1) // 整批动作保留不丢
    expect(state().lineTypeNames).toEqual(NAMES_A) // [②U1] 乐观值保持（编辑意图不丢——dirty 语义；落库回显/失败重试同值）
    expect(showToast).toHaveBeenCalledWith(DB_LOCKED.message, 'error')
    state().retrySave()
    await settle()
    expect(stubApi.lineage.upsertLineTypes).toHaveBeenCalledTimes(2)
    expect(state().saveStatus).toBe('clean')
    expect(state().lineTypeNames).toEqual(NAMES_A) // 成功回填
  })

  it('[F-CONSOL-05] saveLineTypeNames 拒绝型（CONFLICT=service 校验 reason 透传）：动作丢弃+toast reason+回落 clean（U8 重整）', async () => {
    const loaded = ['既有名', '乙', '丙', '丁', '戊', '己']
    useLineageStore.setState({ lineTypeNames: loaded })
    stubApi.lineage.upsertLineTypes.mockResolvedValue({
      ok: false,
      error: { code: 'CONFLICT', message: '线型色行名校验拒绝：行数越界' }
    })
    stubApi.lineage.graph.mockResolvedValue({
      ok: true, data: { nodes: [], edges: [], lineTypeNames: loaded }
    })
    state().saveLineTypeNames(NAMES_A)
    state().save()
    await settle(10)
    expect(showToast).toHaveBeenCalledWith('线型色行名校验拒绝：行数越界', 'error')
    expect(state().queue.length).toBe(0) // 拒绝型丢弃不卡队头
    expect(state().saveStatus).toBe('clean') // 无待保存内容——脏态不误报
    expect(stubApi.lineage.upsertLineTypes).toHaveBeenCalledTimes(1) // 一次即弃（无隐式重试）
    expect(state().lineTypeNames).toEqual(loaded) // [②U1] 库态重拉回填（乐观值 NAMES_A 消解——服务器权威）
  })

  it('removeNode 回填级联：节点与其悬空边一并清除（DDL CASCADE 的 store 镜像）', async () => {
    useLineageStore.setState({
      nodes: [node('A'), node('B')],
      edges: [edge('e1', 'A', 'B'), edge('e2', 'B', 'A')]
    })
    stubApi.lineage.removeNode.mockResolvedValue({ ok: true, data: { ok: true } })
    state().removeNode('A')
    expect(state().nodes.map((n) => n.id)).toEqual(['B']) // 乐观级联即时
    expect(state().edges).toEqual([]) // 两边都悬空（A 端点）全清
    state().save()
    await settle()
    expect(stubApi.lineage.removeNode).toHaveBeenCalledWith({ id: 'A' })
    expect(state().nodes.map((n) => n.id)).toEqual(['B'])
  })

  it('upsertEdge/removeEdge 成功回填：新边追加、删边清除', async () => {
    useLineageStore.setState({ nodes: [node('A'), node('B')], edges: [edge('e1', 'A', 'B')] })
    state().linkNodes('B', 'A')
    state().save()
    await settle()
    expect(stubApi.lineage.upsertEdge).toHaveBeenCalledWith(expect.objectContaining({ from: 'B', to: 'A', label: '' })) // [②U1] 本地 uuid 随行（A7）
    expect(state().edges.map((e) => e.fromNode)).toEqual(['A', 'B']) // 新边追加（乐观 uuid id——回显同 id 覆盖）
    // 新建边成功 toast=唯一可见反馈（U8 单基型统一文案）
    expect(showToast).toHaveBeenCalledWith('连线已保存', 'success')

    state().removeEdge('e1')
    state().save()
    await settle()
    expect(stubApi.lineage.removeEdge).toHaveBeenCalledWith({ id: 'e1' })
    expect(state().edges.map((e) => e.fromNode)).toEqual(['B'])
  })

  it('新建边成功 toast 统一文案（U8 单基型）；label 后编辑（id 在场）不 toast', async () => {
    useLineageStore.setState({ nodes: [node('A'), node('B')], edges: [edge('e1', 'A', 'B')] })
    state().linkManualParent('B', 'A')
    state().save()
    await settle()
    expect(showToast).toHaveBeenCalledWith('连线已保存', 'success')

    // label 后编辑走 id 更新语义——成功不 toast（防噪）
    vi.mocked(showToast).mockClear()
    const created = state().edges[0]! // 乐观 uuid 行（新建回显同 id）
    state().editManualEdgeLabel(created.id, '新标注')
    state().save()
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
    state().reparentNode('B', 'C') // B 换父：A→C（[②U1] 两动作同一编辑单元）
    state().save()
    await settle()
    // 两调用：删旧+加新（票面 N5=service 两调用，UI 单操作）
    expect(stubApi.lineage.removeEdge).toHaveBeenCalledWith({ id: 'e-old' })
    expect(stubApi.lineage.upsertEdge).toHaveBeenCalledWith(expect.objectContaining({ from: 'C', to: 'B', label: '' }))
    expect(state().saveStatus).toBe('error')
    expect(showToast).toHaveBeenCalledWith('旧连线已移除，新连线未建立：写入失败', 'error')
    // 节点暂无库父=合法中间态：旧边已出队清除；[②U1] 新边乐观在场（编辑
    // 意图保持——失败不回滚暂存，重试同载荷）
    expect(state().edges.map((e) => e.fromNode)).toEqual(['C'])
    // retry：只重发加边（removeEdge 不重发——已成功）
    stubApi.lineage.upsertEdge.mockImplementationOnce(async (req: { id?: string }) =>
      ({ ok: true, data: edge(req.id ?? 'e-new', 'C', 'B') })
    )
    state().retrySave()
    await settle()
    expect(stubApi.lineage.removeEdge).toHaveBeenCalledTimes(1)
    expect(stubApi.lineage.upsertEdge).toHaveBeenCalledTimes(2)
    expect(state().edges.map((e) => e.fromNode)).toEqual(['C'])
    expect(state().saveStatus).toBe('clean')
  })

  it('load 互锁（stale-guard 写面同族）：暂存队列未清空时 graph 落地丢弃，不覆盖乐观值', async () => {
    let resolveGraph!: (v: { ok: true; data: { nodes: LineageNode[]; edges: LineageEdge[] } }) => void
    stubApi.lineage.graph.mockImplementationOnce(
      () => new Promise((r) => { resolveGraph = r })
    )
    useLineageStore.setState({ nodes: [node('A', { x: 9, y: 9 })] })
    void state().load() // load 发起（pending）
    state().moveNode('A', 8, 8) // 暂存（dirty）
    resolveGraph({ ok: true, data: { nodes: [node('A')], edges: [] } }) // 旧读晚到
    await settle()
    // graph 旧读被丢弃（暂存在场）——nodes 保持乐观面
    expect(state().nodes[0]?.x).toBe(8)
    expect(state().status).toBe('ready')
  })
})

describe('lineage.store 写面 —— [F-LGRAPH-01②U8] 线型编辑 action（applyEdgeLineStyle/saveLineTypeNames）', () => {
  it('applyEdgeLineStyle 全载荷：id+from/to/label 读现值+dashed/color 成对置（A8 含 via 携行）', async () => {
    useLineageStore.setState({
      nodes: [node('A'), node('B')],
      edges: [{ ...edge('e1', 'A', 'B', true, '#c07a2a'), label: '继承甲' }]
    })
    stubApi.lineage.upsertEdge.mockResolvedValue({
      ok: true,
      data: { ...edge('e1', 'A', 'B', false, '#0f8a6d'), label: '继承甲' }
    })
    state().applyEdgeLineStyle('e1', false, '#0f8a6d')
    state().save()
    await settle()
    expect(stubApi.lineage.upsertEdge).toHaveBeenCalledWith({
      id: 'e1',
      from: 'A',
      to: 'B',
      label: '继承甲',
      dashed: false,
      color: '#0f8a6d'
    })
    // 回填：saved 行入 store（视觉字段更新面）
    expect(state().edges[0]?.dashed).toBe(false)
    expect(state().edges[0]?.color).toBe('#0f8a6d')
    // id 在场=更新语义不 toast（防噪——editManualEdgeLabel 同款）
    expect(showToast).not.toHaveBeenCalled()

    // 再改虚线橙（成对置回）
    stubApi.lineage.upsertEdge.mockResolvedValue({
      ok: true,
      data: { ...edge('e1', 'A', 'B', true, '#c07a2a'), label: '继承甲' }
    })
    state().applyEdgeLineStyle('e1', true, '#c07a2a')
    state().save()
    await settle()
    expect(stubApi.lineage.upsertEdge).toHaveBeenLastCalledWith({
      id: 'e1',
      from: 'A',
      to: 'B',
      label: '继承甲',
      dashed: true,
      color: '#c07a2a'
    })
  })

  it('linkNodes 新建（U8 单基型）+成功 toast 统一文案', async () => {
    useLineageStore.setState({ nodes: [node('A'), node('B')] })
    state().linkNodes('A', 'B')
    state().save()
    await settle()
    expect(stubApi.lineage.upsertEdge).toHaveBeenCalledWith(expect.objectContaining({
      from: 'A',
      to: 'B',
      label: ''
    })) // [②U1] 本地 uuid 随行（A7 乐观一致性）
    expect(state().edges).toHaveLength(1)
    expect(showToast).toHaveBeenCalledWith('连线已保存', 'success')
  })

  it('linkNodes CONFLICT（service 守卫拒绝）：动作丢弃+toast reason+保存态回落 clean', async () => {
    useLineageStore.setState({ nodes: [node('A'), node('B'), node('C')] })
    stubApi.lineage.upsertEdge.mockResolvedValue({
      ok: false,
      error: { code: 'CONFLICT', message: '该逻辑线已存在（C→B），重复边被拒绝' }
    })
    stubApi.lineage.graph.mockResolvedValue({
      ok: true, data: { nodes: [node('A'), node('B'), node('C')], edges: [] }
    })
    state().linkNodes('C', 'B')
    state().save()
    await settle(10)
    expect(showToast).toHaveBeenCalledWith('该逻辑线已存在（C→B），重复边被拒绝', 'error')
    expect(state().queue.length).toBe(0)
    expect(state().saveStatus).toBe('clean')
    expect(state().edges.length).toBe(0) // 库态重拉消解乐观边
  })

  it('saveLineTypeNames 新队列动作：整批写+成功 set lineTypeNames', async () => {
    stubApi.lineage.upsertLineTypes.mockResolvedValue({ ok: true, data: [...NAMES_B] })
    state().saveLineTypeNames(NAMES_B)
    state().save()
    await settle()
    expect(stubApi.lineage.upsertLineTypes).toHaveBeenCalledWith(NAMES_B)
    expect(state().lineTypeNames).toEqual(NAMES_B)
    expect(state().saveStatus).toBe('clean')
  })

  it('saveLineTypeNames sameTarget 同类合并（整批=单实体——暂存期合并最后写胜出）', async () => {
    const n1 = [...NAMES_A]
    const n2 = [...NAMES_B]
    stubApi.lineage.upsertLineTypes.mockImplementation(async (req: string[]) => ({ ok: true, data: [...req] }))
    state().saveLineTypeNames(n1)
    state().saveLineTypeNames(n2)
    state().saveLineTypeNames(n1)
    expect(state().queue).toHaveLength(1) // 整批单实体（中间值合并）
    state().save()
    await settle()
    expect(stubApi.lineage.upsertLineTypes).toHaveBeenCalledTimes(1)
    expect(stubApi.lineage.upsertLineTypes).toHaveBeenLastCalledWith(n1)
    expect(state().lineTypeNames).toEqual(n1)
  })

  it('队列序 FIFO：saveLineTypeNames 先于随后入队的 edge（串行派发序）', async () => {
    stubApi.lineage.upsertLineTypes.mockResolvedValue({ ok: true, data: [...NAMES_A] })
    stubApi.lineage.upsertEdge.mockResolvedValue({ ok: true, data: edge('e2', 'A', 'B') })
    useLineageStore.setState({ nodes: [node('A'), node('B')] })
    state().saveLineTypeNames(NAMES_A)
    state().linkNodes('A', 'B')
    state().save()
    await settle()
    const orderLt = stubApi.lineage.upsertLineTypes.mock.invocationCallOrder[0]
    const orderEdge = stubApi.lineage.upsertEdge.mock.invocationCallOrder[0]
    expect(orderLt).toBeDefined()
    expect(orderEdge).toBeDefined()
    expect(orderLt!).toBeLessThan(orderEdge!)
    expect(state().saveStatus).toBe('clean')
  })

  it('save 派发窗（saving）后续编辑拒绝（[回炉 R5] INV-94 saving 闸）：saving 中零入队；flight 完成即队列空回 clean', async () => {
    let resolveFirst!: (v: { ok: true; data: LineageEdge }) => void
    stubApi.lineage.upsertEdge
      .mockImplementationOnce(() => new Promise((r) => { resolveFirst = r }))
      .mockImplementation(async (req: { from: string }) =>
        ({ ok: true, data: edge(`e-${req.from}`, req.from, 'B') })
      )
    stubApi.lineage.upsertLineTypes.mockResolvedValue({ ok: true, data: [...NAMES_A] })
    useLineageStore.setState({ nodes: [node('A'), node('B'), node('C')] })
    state().linkNodes('A', 'B')
    state().save() // X 派发（悬挂）
    state().saveLineTypeNames(NAMES_A) // saving 中编辑=拒绝（原排队语义随 R5 闸退役）
    state().linkNodes('C', 'B') // saving 中编辑=拒绝
    expect(state().queue).toHaveLength(1) // 仅 X 在队（零新入队）
    await settle()
    expect(stubApi.lineage.upsertEdge).toHaveBeenCalledTimes(1) // 仅 X 已派发
    expect(stubApi.lineage.upsertLineTypes).not.toHaveBeenCalled()
    resolveFirst({ ok: true, data: edge('e-A', 'A', 'B') })
    await settle(12)
    expect(state().queue).toHaveLength(0) // 无续发=队列空
    expect(state().saveStatus).toBe('clean')
    // clean 后编辑恢复（新单元正常入队）
    state().saveLineTypeNames(NAMES_A)
    expect(state().queue).toHaveLength(1)
  })
})
