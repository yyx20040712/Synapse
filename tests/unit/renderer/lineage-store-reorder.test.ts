// @vitest-environment jsdom
/**
 * [T3-P8] lineage.store 槽位重排/改月写面测试（锁定合约，always-active）。
 * 覆盖：reorderMonthSlots 月组全序重写（slot=0..n-1 透写+month 保留+队列
 * FIFO 与同道写错峰）/moveNodeMonth 改月载荷（slot 键缺省——服务端组变
 * max+1 尾部既有分支）/全字段载荷 month/slot 保留（防半更新清月——P8
 * 改月面激活的潜伏缺陷锁）/upsert 回填后 nodes=lineageOrder 全序（INV-75
 * 消费面扩：store 数组序=渲染序单源）/写失败 error+重试（无乐观写）。
 * （环境=jsdom：client.ts 顶层读 window.api；独立于 lineage-store-write.test
 * ——文件 500 行红线拆件。）
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

/** upsertNode 载荷形状（断言面最小投影） */
interface UpsertPayload {
  id?: string
  slot?: number
  month?: number | null
  year?: number
  title?: string
  coreIdea?: string
  tags?: string[]
}

/** 捕获 upsertNode 载荷序列（调用序即派发序——FIFO 面） */
const payloads = (): UpsertPayload[] =>
  (stubApi.lineage.upsertNode.mock.calls as unknown as [UpsertPayload][]).map((c) => c[0])

beforeEach(() => {
  vi.clearAllMocks()
  for (const fn of Object.values(stubApi.lineage)) fn.mockReset()
  stubApi.lineage.graph.mockResolvedValue({ ok: true, data: { nodes: [], edges: [] } })
  stubApi.lineage.upsertNode.mockResolvedValue({ ok: true, data: node('X') })
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

describe('[T3-P8] reorderMonthSlots —— 月组全序重写（slot 透写分支）', () => {
  it('按传入序 slot=0..n-1：三节点全字段载荷逐个排队，month 保留不清', async () => {
    const A = node('A', { month: 9, slot: 0 })
    const B = node('B', { month: 9, slot: 1 })
    const C = node('C', { month: 9, slot: 2 })
    useLineageStore.setState({ nodes: [A, B, C] })
    stubApi.lineage.upsertNode.mockImplementation(async (req: { id?: string; slot?: number }) =>
      ({ ok: true, data: serverNode(useLineageStore.getState().nodes.find((n) => n.id === req.id) ?? A) })
    )
    state().reorderMonthSlots(['C', 'A', 'B'])
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
    expect(state().saveStatus).toBe('saved')
  })

  it('同道错峰 FIFO：飞行中的编辑写先落，重排批按入队序后发', async () => {
    const A = node('A', { month: 9, slot: 0, coreIdea: '旧想法' })
    const B = node('B', { month: 9, slot: 1 })
    useLineageStore.setState({ nodes: [A, B] })
    let release: (() => void) | null = null
    const gate = new Promise<void>((r) => {
      release = r
    })
    stubApi.lineage.upsertNode.mockImplementation(async (req: { id?: string }) => {
      await gate
      return { ok: true, data: serverNode(useLineageStore.getState().nodes.find((n) => n.id === req.id) ?? A) }
    })
    state().editCoreIdea('A', '新想法') // 先入队（flight 中）
    state().reorderMonthSlots(['B', 'A'])
    await settle()
    expect(stubApi.lineage.upsertNode).toHaveBeenCalledTimes(1) // 队首编辑在飞
    release!()
    await settle()
    // 派发序=入队序：edit→slot(B)→slot(A)（FIFO；LIFO 即红）
    expect(payloads().map((c) => [c.id, c.slot ?? null])).toEqual([
      ['A', 0],
      ['B', 0],
      ['A', 1]
    ])
  })

  it('写失败=error 保存态+队首保留+toast；retry 后恢复 saved（无乐观写）', async () => {
    const A = node('A', { month: 9, slot: 0 })
    const B = node('B', { month: 9, slot: 1 })
    useLineageStore.setState({ nodes: [A, B] })
    stubApi.lineage.upsertNode
      .mockRejectedValueOnce(new Error('写入失败'))
      .mockImplementation(async (req: { id?: string }) =>
        ({ ok: true, data: serverNode(useLineageStore.getState().nodes.find((n) => n.id === req.id) ?? A) })
      )
    state().reorderMonthSlots(['B', 'A'])
    await settle()
    expect(state().saveStatus).toBe('error')
    expect(state().queue.length).toBeGreaterThan(0) // 动作保留不丢
    state().retrySave()
    await settle()
    expect(state().saveStatus).toBe('saved')
    expect(state().queue.length).toBe(0)
  })
})

describe('[T3-P8] moveNodeMonth —— 改月载荷（slot 缺省=服务端组变 max+1）', () => {
  it('载荷含目标 year/month 且 slot 键缺省（归一归服务端）；全字段随行', async () => {
    const A = node('A', { year: 2022, month: 9, slot: 2 })
    useLineageStore.setState({ nodes: [A] })
    stubApi.lineage.upsertNode.mockResolvedValue({ ok: true, data: serverNode(A) })
    state().moveNodeMonth('A', 2023, 1)
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
    stubApi.lineage.upsertNode.mockResolvedValue({ ok: true, data: serverNode(A) })
    state().moveNodeMonth('A', 2022, null)
    await settle()
    expect(payloads()[0]!.month).toBeNull()
  })
})

describe('[T3-P8] 全字段载荷 month/slot 保留 + 回填重排（INV-75 消费面扩）', () => {
  it('editCoreIdea/editTags 载荷带现月与槽位（防半更新清月——P8 激活的潜伏缺陷锁）', async () => {
    const A = node('A', { month: 6, slot: 3, tags: ['甲'] })
    useLineageStore.setState({ nodes: [A] })
    stubApi.lineage.upsertNode.mockResolvedValue({ ok: true, data: serverNode(A) })
    state().editCoreIdea('A', '新想法')
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
    stubApi.lineage.upsertNode.mockImplementation(async (req: { id?: string; slot?: number }) => {
      const cur = useLineageStore.getState().nodes.find((n) => n.id === req.id) ?? A
      return { ok: true, data: serverNode({ ...cur, slot: req.slot ?? cur.slot }) }
    })
    state().reorderMonthSlots(['B', 'A'])
    await settle()
    expect(state().nodes.map((n) => n.id)).toEqual(['B', 'A']) // 数组序=新 slot 全序
    expect(state().saveStatus).toBe('saved')
  })
})

describe('[T3-P8 回炉] R3 —— upsert-node lazy 载荷（写窗快照不回写旧值）', () => {
  it('跨格：改月排队→同节点 setNodeTags→落库终值 month=新月+tags 新值（同实体融合派发，载荷合成读执行时点最新行）', async () => {
    const A = node('A', { year: 2022, month: 9, slot: 0 })
    useLineageStore.setState({ nodes: [A] })
    stubApi.lineage.upsertNode.mockImplementation(async (req: Partial<LineageNode>) => {
      const cur = useLineageStore.getState().nodes.find((n) => n.id === (req.id ?? '')) ?? A
      return { ok: true, data: serverNode({ ...cur, ...req } as LineageNode) }
    })
    state().moveNodeMonth('A', 2023, 1) // 首发 flight（inflight）
    state().setNodeTags('A', ['新标签']) // 入队（flight 项不融合→独立排队）
    await settle()
    const calls = payloads()
    // 两段派发（省写合并仅限未派发项）；末段=执行时点合成：month 新月+tags
    // 新值+slot 键缺省——enqueue 快照旧 month 不回写（R3 断言面）
    expect(calls.length).toBe(2)
    const last = calls[1]!
    expect(last.year).toBe(2023)
    expect(last.month).toBe(1)
    // 后继字段写=全字段透写当前槽位（等值无害——组不变保留语义；slot 缺省
    // 语义仅 moveNodeMonth 自身载荷，见 moveNodeMonth describe）
    expect(last.slot).toBe(0)
    expect(last.tags).toEqual(['新标签'])
    expect(state().nodes[0]!.month).toBe(1)
    expect(state().nodes[0]!.tags).toEqual(['新标签'])
    expect(state().saveStatus).toBe('saved')
  })

  it('跨格反序：setNodeTags 先排队→改月后排队 lazy 合成并入先行字段写（终值双对）', async () => {
    const A = node('A', { year: 2022, month: 9, slot: 3 })
    useLineageStore.setState({ nodes: [A] })
    stubApi.lineage.upsertNode.mockImplementation(async (req: Partial<LineageNode>) => {
      const cur = useLineageStore.getState().nodes.find((n) => n.id === (req.id ?? '')) ?? A
      return { ok: true, data: serverNode({ ...cur, ...req } as LineageNode) }
    })
    state().setNodeTags('A', ['早期']) // 首发 flight
    state().moveNodeMonth('A', 2023, 1) // 入队（lazy：合成时点并入先行 tags）
    await settle()
    const calls = payloads()
    expect(calls.length).toBe(2)
    expect(calls[1]!.month).toBe(1)
    expect(calls[1]!.tags).toEqual(['早期'])
    expect(state().nodes[0]!.month).toBe(1)
    expect(state().nodes[0]!.tags).toEqual(['早期'])
  })

  it('reorder 写窗内同节点改月：lazy 融合派发序=改月后落（月对）+slot 透写不被吞', async () => {
    const A = node('A', { year: 2022, month: 9, slot: 0 })
    const B = node('B', { year: 2022, month: 9, slot: 1 })
    useLineageStore.setState({ nodes: [A, B] })
    stubApi.lineage.upsertNode.mockImplementation(async (req: Partial<LineageNode>) => {
      const cur = useLineageStore.getState().nodes.find((n) => n.id === (req.id ?? '')) ?? A
      return { ok: true, data: serverNode({ ...cur, ...req } as LineageNode) }
    })
    state().reorderMonthSlots(['B', 'A']) // B 首发 flight；A 入队（slot 透写）
    state().moveNodeMonth('A', 2023, 1) // A 未派发→融合：改月整替 slot 透写
    await settle()
    const calls = payloads().map((c) => [c.id, c.month ?? null, c.slot ?? null])
    expect(calls).toEqual([
      ['B', 9, 0],
      ['A', 1, null] // A 融合派发：month 新+slot 缺省（改月整替槽位语义）
    ])
    expect(state().nodes.map((n) => n.id)).toEqual(['B', 'A'])
  })
})
