// @vitest-environment jsdom
/**
 * [T3-P8] lineage.store 槽位重排/改月写面测试（[F-LGRAPH-01②U1] 编辑会话
 * 语义重整版：动作入暂存+save 批量落库。锁定合约，always-active）。
 * 覆盖：reorderMonthSlots 月组全序重写（slot=0..n-1 透写+month 保留+队列
 * FIFO）/moveNodeMonth 改月载荷（slot 键缺省——服务端组变 max+1 尾部既有
 * 分支）/全字段载荷 month/slot 保留（防半更新清月）/upsert 回填后 nodes=
 * lineageOrder 全序（INV-75 消费面扩）/写失败 error+重试（乐观值保持）。
 * （环境=jsdom：client.ts 顶层读 window.api；独立于 lineage-store-write.test
 * ——文件 500 行红线拆件。）
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

import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'
import type { LineageNode } from '../../../src/shared/models/lineage'

function node(id: string, patch: Partial<LineageNode> = {}): LineageNode {
  return {
    id,
    paperId: `paper-${id}`,
    title: `节点${id}`,
    coreIdea: '',
    year: 2022,
    x: null,
    y: null,
    month: 9,
    slot: null,
    folderId: '__main__',
    createdAt: 't',
    updatedAt: 't',
    ...patch
  }
}

const serverNode = (n: LineageNode): LineageNode => ({ ...n, updatedAt: 'server' })

/** 微任务排空：串行 flush 逐动作推进（每动作两级 await：unwrap+回填 set） */
const settle = async (turns = 8): Promise<void> => {
  for (let i = 0; i < turns; i++) await Promise.resolve()
}

const state = () => useLineageStore.getState()

/** [F-ALIGN-01] patchNode 载荷形状（断言面最小投影） */
interface PatchPayload {
  id?: string
  slot?: number
  month?: number | null
  year?: number
  title?: string
  coreIdea?: string
  tags?: string[]
}

/** 捕获 patchNode 载荷序列（调用序即派发序——FIFO 面） */
const payloads = (): PatchPayload[] =>
  (stubApi.lineage.patchNode.mock.calls as unknown as [PatchPayload][]).map((c) => c[0])

/** 忠实回显 mock：读 store 现行行+载荷覆盖（含 slot 键缺省语义——缺省键不落） */
const echoMock = (): void => {
  stubApi.lineage.patchNode.mockImplementation(async (req: Partial<LineageNode>) => {
    const cur = useLineageStore.getState().nodes.find((n) => n.id === (req.id ?? '')) ?? node('X')
    return { ok: true, data: serverNode({ ...cur, ...req } as LineageNode) }
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  for (const fn of Object.values(stubApi.lineage)) fn.mockReset()
  stubApi.lineage.graph.mockResolvedValue({ ok: true, data: { nodes: [], edges: [] } })
  echoMock()
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
    redoStack: []
  })
})

describe('[T3-P8] reorderMonthSlots —— 月组全序重写（slot 透写分支；②U1 会话语义）', () => {
  it('按传入序 slot=0..n-1：三节点全字段载荷逐个排队（save 派发），month 保留不清', async () => {
    const A = node('A', { month: 9, slot: 0 })
    const B = node('B', { month: 9, slot: 1 })
    const C = node('C', { month: 9, slot: 2 })
    useLineageStore.setState({ nodes: [A, B, C] })
    state().reorderMonthSlots(['C', 'A', 'B'])
    expect(state().saveStatus).toBe('dirty') // 暂存期不派发（A7）
    expect(stubApi.lineage.patchNode).not.toHaveBeenCalled()
    state().save()
    await settle()
    const calls = payloads()
    expect(calls.length).toBe(3)
    expect(calls.map((c) => [c.id ?? null, c.slot ?? null])).toEqual([
      ['C', 0],
      ['A', 1],
      ['B', 2]
    ])
    // month 透传保留（防半更新清月）+全字段（title/coreIdea 随行）
    for (const c of calls) {
      expect(c.month).toBe(9)
      expect(c.title).toBe(`节点${c.id}`)
      expect(c.year).toBe(2022)
    }
    expect(state().saveStatus).toBe('clean')
  })

  it('派发窗 saving 闸（[回炉 R5] INV-94）：首动作 flight 悬挂中后续重排批拒绝；释放后队列空回 clean，clean 后重排正常入队', async () => {
    const A = node('A', { month: 9, slot: 0, coreIdea: '旧想法' })
    const B = node('B', { month: 9, slot: 1 })
    useLineageStore.setState({ nodes: [A, B] })
    let release: (() => void) | null = null
    const gate = new Promise<void>((r) => {
      release = r
    })
    stubApi.lineage.patchNode.mockImplementation(async (req: { id?: string }) => {
      await gate
      return { ok: true, data: serverNode(useLineageStore.getState().nodes.find((n) => n.id === req.id) ?? A) }
    })
    state().editCoreIdea('A', '新想法') // 先入暂存
    state().save() // 首动作 flight（gate 悬挂）
    state().reorderMonthSlots(['B', 'A']) // saving 中编辑=拒绝（原排队语义随 R5 闸退役）
    await settle()
    expect(stubApi.lineage.patchNode).toHaveBeenCalledTimes(1) // 队首编辑在飞
    expect(state().queue).toHaveLength(1) // 零新入队（重排批被拒）
    release!()
    await settle()
    expect(state().saveStatus).toBe('clean') // 队列空直接回 clean
    // clean 后重排正常入队（载荷序=slot 透写）
    state().reorderMonthSlots(['B', 'A'])
    expect(state().queue.length).toBeGreaterThan(0)
  })

  it('写失败=error 保存态+队首保留+toast；retry 后恢复 clean（乐观值保持）', async () => {
    const A = node('A', { month: 9, slot: 0 })
    const B = node('B', { month: 9, slot: 1 })
    useLineageStore.setState({ nodes: [A, B] })
    stubApi.lineage.patchNode
      .mockRejectedValueOnce(new Error('写入失败'))
    state().reorderMonthSlots(['B', 'A'])
    state().save()
    await settle()
    expect(state().saveStatus).toBe('error')
    expect(state().queue.length).toBeGreaterThan(0) // 动作保留不丢
    state().retrySave()
    await settle()
    expect(state().saveStatus).toBe('clean')
    expect(state().queue.length).toBe(0)
  })
})

describe('[T3-P8] moveNodeMonth —— 改月载荷（slot 缺省=服务端组变 max+1）', () => {
  it('载荷含目标 year/month 且 slot 键缺省（归一归服务端）；全字段随行', async () => {
    const A = node('A', { year: 2022, month: 9, slot: 2 })
    useLineageStore.setState({ nodes: [A] })
    state().moveNodeMonth('A', 2023, 1)
    state().save()
    await settle()
    const req = payloads()[0]!
    expect(req.year).toBe(2023)
    expect(req.month).toBe(1)
    expect(Object.prototype.hasOwnProperty.call(req, 'slot')).toBe(false) // 键缺省非 null
    expect(req.title).toBe('节点A')
  })

  it('未定月目标：month=null 载荷（未定月框收纳）', async () => {
    const A = node('A', { year: 2022, month: 9, slot: 0 })
    useLineageStore.setState({ nodes: [A] })
    state().moveNodeMonth('A', 2022, null)
    state().save()
    await settle()
    expect(payloads()[0]!.month).toBeNull()
  })
})

describe('[T3-P8] 全字段载荷 month/slot 保留 + 回填重排（INV-75 消费面扩）', () => {
  it('editCoreIdea/editTags 载荷带现月与槽位（防半更新清月——P8 激活的潜伏缺陷锁）', async () => {
    const A = node('A', { month: 6, slot: 3, tags: ['甲'] })
    useLineageStore.setState({ nodes: [A] })
    state().editCoreIdea('A', '新想法')
    state().save()
    await settle()
    const req = payloads()[0]!
    expect(req.month).toBe(6)
    expect(req.slot).toBe(3)
    expect(req.coreIdea).toBe('新想法')
  })

  it('回填后 nodes 数组=lineageOrder 全序：重排写落定后渲染序随新 slot（消费方不得重排的单源兑现）', async () => {
    const A = node('A', { month: 9, slot: 0, createdAt: 't1' })
    const B = node('B', { month: 9, slot: 1, createdAt: 't2' })
    useLineageStore.setState({ nodes: [A, B] })
    state().reorderMonthSlots(['B', 'A'])
    expect(state().nodes.map((n) => n.id)).toEqual(['B', 'A']) // 乐观重排即时（lineageOrder 单源）
    state().save()
    await settle()
    expect(state().nodes.map((n) => n.id)).toEqual(['B', 'A']) // 数组序=新 slot 全序
    expect(state().saveStatus).toBe('clean')
  })
})

describe('[T3-P8 回炉] R3 —— patch-node lazy 载荷（②U1 暂存期同实体融合——合成读最新行）', () => {
  it('跨格：改月→同节点 setNodeTags→save 单发终值 month=新月+tags 新值（暂存期融合，载荷合成读执行时点最新行）', async () => {
    const A = node('A', { year: 2022, month: 9, slot: 0 })
    useLineageStore.setState({ nodes: [A] })
    state().moveNodeMonth('A', 2023, 1) // 入暂存（lazy：override={year,month}）
    state().setNodeTags('A', ['新标签']) // 同实体融合（patch 并入）
    expect(state().queue).toHaveLength(1)
    state().save()
    await settle()
    const calls = payloads()
    expect(calls.length).toBe(1) // 融合单发
    const last = calls[0]!
    expect(last.year).toBe(2023)
    expect(last.month).toBe(1)
    expect(last.tags).toEqual(['新标签'])
    expect(state().nodes[0]!.month).toBe(1)
    expect(state().nodes[0]!.tags).toEqual(['新标签'])
    expect(state().saveStatus).toBe('clean')
  })

  it('跨格反序：setNodeTags 先入暂存→改月后入融合（终值双对——无顺序敏感）', async () => {
    const A = node('A', { year: 2022, month: 9, slot: 3 })
    useLineageStore.setState({ nodes: [A] })
    state().setNodeTags('A', ['早期'])
    state().moveNodeMonth('A', 2023, 1)
    state().save()
    await settle()
    const calls = payloads()
    expect(calls.length).toBe(1)
    expect(calls[0]!.month).toBe(1)
    expect(calls[0]!.tags).toEqual(['早期'])
    expect(state().nodes[0]!.month).toBe(1)
    expect(state().nodes[0]!.tags).toEqual(['早期'])
  })

  it('reorder 暂存窗内同节点改月：lazy 融合派发=改月后落（月对）+slot 透写不被吞', async () => {
    const A = node('A', { year: 2022, month: 9, slot: 0 })
    const B = node('B', { year: 2022, month: 9, slot: 1 })
    useLineageStore.setState({ nodes: [A, B] })
    state().reorderMonthSlots(['B', 'A']) // B slot=0、A slot=1（两条 lazy）
    state().moveNodeMonth('A', 2023, 1) // A 融合：改月整替 slot 透写
    state().save()
    await settle()
    const calls = payloads().map((c) => [c.id, c.month ?? null, c.slot ?? null])
    expect(calls).toEqual([
      ['B', 9, 0],
      ['A', 1, null] // A 融合派发：month 新+slot 缺省（改月整替槽位语义）
    ])
    expect(state().nodes.map((n) => n.id)).toEqual(['B', 'A'])
  })
})
