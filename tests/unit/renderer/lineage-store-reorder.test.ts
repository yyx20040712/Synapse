// @vitest-environment jsdom
/**
 * [T3-P8] lineage.store 槽位重排写面测试（[F-LGRAPH-01②U1] 编辑会话
 * 语义重整版：动作入暂存+save 批量落库。锁定合约，always-active）。
 * 覆盖：reorderMonthSlots 月组全序重写（slot=0..n-1 透写+month 保留+队列
 * FIFO）/全字段载荷 month/slot 保留（防半更新清月）/upsert 回填后 nodes=
 * lineageOrder 全序（INV-75 消费面扩）/写失败 error+重试（乐观值保持）。
 * [F-UIRES-03 C3] 改月动作用例组随改月单口裁决退役删除（INV-107——改月
 * 唯一入口=MetaEditDialog；meta-edit-dialog.test 既有承载）；lazy 融合
 * 机制锁改以 reorder×reorder 同节点融合承载（override 轴生产者收窄）。
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

/** [F-ALIGN-01] patchNode 载荷形状（断言面最小投影；[A1b] tags 键随标签域退役删；
 *  [A3 F-CONTRACTA-01] coreIdea 键随 core_idea 全退役删） */
interface PatchPayload {
  id?: string
  slot?: number
  month?: number | null
  year?: number
  title?: string
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
    // month 透传保留（防半更新清月）+全字段（title 随行；[A3] coreIdea 键随退役消失）
    for (const c of calls) {
      expect(c.month).toBe(9)
      expect(c.title).toBe(`节点${c.id}`)
      expect(c.year).toBe(2022)
      expect(Object.prototype.hasOwnProperty.call(c, 'coreIdea')).toBe(false)
    }
    expect(state().saveStatus).toBe('clean')
  })

  it('派发窗 saving 闸（[回炉 R5] INV-94）：首动作 flight 悬挂中后续重排批拒绝；释放后队列空回 clean，clean 后重排正常入队', async () => {
    const A = node('A', { month: 9, slot: 0, x: 1, y: 1 })
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
    state().moveNode('A', 2, 2) // 先入暂存
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

describe('[T3-P8] 全字段载荷 month/slot 保留 + 回填重排（INV-75 消费面扩）', () => {
  it('moveNode 载荷带现月与槽位（防半更新清月——P8 激活的潜伏缺陷锁；[A1b] editTags/[A3] editCoreIdea 面随退役域删——触发器换 moveNode 同型承载）', async () => {
    const A = node('A', { month: 6, slot: 3 })
    useLineageStore.setState({ nodes: [A] })
    state().moveNode('A', 7, 8)
    state().save()
    await settle()
    const req = payloads()[0]!
    expect(req.month).toBe(6)
    expect(req.slot).toBe(3)
    expect(Object.prototype.hasOwnProperty.call(req, 'coreIdea')).toBe(false) // [A3] 退役键负锚
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
  // [A1b F-CONTRACTA-01] 两用例「跨格：改月→同节点 setNodeTags→save 单发终值」
  // 「跨格反序：setNodeTags 先入暂存→改月后入融合」随脉络私有标签域退役删除
  // （setNodeTags 写路径消亡=唯一 override+patch 混轴生产者；融合机制两半边
  // 仍各在锁：override 轴=本组 reorder 融合用例、patch 轴=lineage-store-write
  // 连续编辑合并用例）。[F-UIRES-03 C3] 改月×reorder 跨轴融合例随改月动作
  // 退役删除——改写为 reorder×reorder 同轴融合承载（override 整替胜出语义
  // 门二 C4 终裁保持锁定）。

  it('reorder 暂存窗内同节点再 reorder：lazy 融合派发=末次 override 整替胜出（slot 末次透写）', async () => {
    const A = node('A', { year: 2022, month: 9, slot: 0 })
    const B = node('B', { year: 2022, month: 9, slot: 1 })
    useLineageStore.setState({ nodes: [A, B] })
    state().reorderMonthSlots(['B', 'A']) // B slot=0、A slot=1（两条 lazy 入队）
    state().reorderMonthSlots(['A', 'B']) // 同节点融合：末次 override 整替（A=0、B=1）
    expect(state().queue.length).toBe(2) // 融合按 id 保持两条（非同实体不合并）
    state().save()
    await settle()
    const calls = payloads().map((c) => [c.id, c.slot ?? null])
    expect(calls).toEqual([
      ['B', 1], // B 末次 override={slot:1} 整替首次 {slot:0}
      ['A', 0]
    ])
    expect(state().nodes.map((n) => n.id)).toEqual(['A', 'B'])
  })
})
