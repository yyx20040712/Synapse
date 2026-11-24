// @vitest-environment jsdom
/**
 * [F-RECOV-02] needsReload 恢复权威收口锁（INV-175——设计终稿 v3 §6 矩阵 T1-T10
 * +undo/redo 触发面对称锁 T11）。store 级：直接 applyRecoverySession 注入+mock
 * api.lineage.* 派发层；fire 计数口径=loadSpy（spy 于 api.lineage.graph）在每
 * 次 save/undo/redo 前重置；land=图四面（nodes/edges/lineTypeNames/floatingNotes）
 * 实际变更核验（逐一 toEqual；derived 三面不在比较器——服务器计算面随 load 权威
 * 重取域外自然对齐）。T8/T9/T10 用 deferred promise 控制响应时序。调度器不装配
 * （未装配一切入口 no-op+门恒开——存量单测兼容面）。always-active（无
 * guardedDescribe）。
 * [B4 L1 最小迁移——为保持绿所必需（L1 语义迫使，非 L2 per-folder 面）]：flush
 * 尾 `void load()`→链尾和解任务（await 落定；读失败=IO error 位保留）；undo/redo
 * =flush-then-unit（先和解后 history-unit——#13a/#13b）；在途 flush 重复触发=让位
 * 早退/单飞复用（#34a）；飞行期新编辑由同会话 saving 锁前置承担（INV-94），gate
 * 旁路的 Q>0 由和解应用判据丢弃（#10d）。翻转点逐条标注于用例题。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub } from '../../utils/api-client-mock'

const stubApi = makeApiStub({
  recovery: { peek: vi.fn(), save: vi.fn(), read: vi.fn(), release: vi.fn() },
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

import { echoHistoryUnit } from '../../utils/lineage-history-stub'
import { makeHistoryEntry } from '../../utils/factories'
import type { LineageEntityDelta } from '../../../src/shared/ipc/lineage-history.schemas'

import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'
import { defaultLineTypeNames } from '@shared/models/lineage'
import type { LineageEdge, LineageNode, FloatingNote } from '@shared/models/lineage'
import type { LineageRecoveryPayload } from '@shared/recovery/schemas'

function node(id: string, over: Partial<LineageNode> = {}): LineageNode {
  return {
    id,
    paperId: `paper-${id}`,
    title: `节点${id}`,
    year: 2022,
    x: null,
    y: null,
    month: 9,
    slot: 0,
    folderId: '__main__',
    createdAt: 't0',
    updatedAt: 't0',
    ...over
  }
}

/** 库态回包（graph 单读形——四面+派生三面空集） */
function graphOk(nodes: LineageNode[]): { ok: true; data: Record<string, unknown> } {
  return {
    ok: true,
    data: {
      nodes,
      edges: [],
      paperMetrics: {},
      pubNos: {},
      tagNames: {},
      lineTypeNames: defaultLineTypeNames(),
      floatingNotes: []
    }
  }
}

function payloadOf(nodes: LineageNode[], queue: LineageRecoveryPayload['queue']): LineageRecoveryPayload {
  return {
    folderId: '__main__',
    graph: { nodes, edges: [] as LineageEdge[], lineTypeNames: defaultLineTypeNames(), floatingNotes: [] as FloatingNote[] },
    queue,
    draft: null
  }
}

function defer(): { promise: Promise<unknown>; resolve: (v: unknown) => void } {
  let resolve!: (v: unknown) => void
  const promise = new Promise<unknown>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

const store = () => useLineageStore.getState()
const loadSpy = stubApi.lineage.graph
const settle = async (turns = 12): Promise<void> => {
  for (let i = 0; i < turns; i++) await Promise.resolve()
}
const faces = () => ({
  nodes: store().nodes,
  edges: store().edges,
  lineTypeNames: store().lineTypeNames,
  floatingNotes: store().floatingNotes
})

/** land 核验：图四面==库态（A 回库位——残值消解） */
function expectGraphEquals(nodes: LineageNode[]): void {
  expect(faces()).toEqual({
    nodes,
    edges: [],
    lineTypeNames: defaultLineTypeNames(),
    floatingNotes: []
  })
}

/** graph 桩脚本：先按序消费 script 项（deferred/错误回包），耗尽后回退 dbGraph() */
const script: Promise<unknown>[] = []
let dbGraph: () => { ok: true; data: Record<string, unknown> } = () => graphOk([])

beforeEach(() => {
  vi.clearAllMocks()
  script.length = 0
  dbGraph = () => graphOk([])
  stubApi.lineage.graph.mockImplementation(() =>
    script.length > 0 ? script.shift()! : Promise.resolve(dbGraph())
  )
  stubApi.lineage.patchNode.mockImplementation(
    async (req: Partial<LineageNode> & { id: string }) =>
      ({ ok: true, data: { ...node(req.id), ...req } as LineageNode })
  )
  stubApi.lineage.historyUnit.mockImplementation(echoHistoryUnit) // [B4 L1] undo/redo=history-unit
  useLineageStore.setState({
    nodes: [],
    edges: [],
    paperMetrics: {},
    pubNos: {},
    tagNames: {},
    lineTypeNames: defaultLineTypeNames(),
    floatingNotes: [],
    status: 'ready',
    error: null,
    inflight: null,
    folderId: '__main__',
    saveStatus: 'clean',
    lastWriteError: null,
    queue: [],
    flushing: false,
    needsReload: false,
    undoStack: [],
    redoStack: []
  })
})

describe('F-RECOV-02 needsReload 恢复权威收口（INV-175）', () => {
  it('T1 格1/S1：残值载荷载入即置位→全成保存 fire=1→落地清位+四面==库态+clean', async () => {
    const db = [node('A'), node('B', { x: 9, y: 9 })]
    dbGraph = () => graphOk(db)
    store().applyRecoverySession(
      payloadOf([node('A', { x: 100, y: 100 }), node('B')], [
        { kind: 'patch-node', id: 'B', patch: { x: 9, y: 9 } }
      ])
    )
    expect(store().needsReload).toBe(true) // ②置位（恢复会话权威存疑——先红）
    loadSpy.mockClear()
    await store().save()
    await settle()
    expect(loadSpy).toHaveBeenCalledTimes(1) // fire=1
    expect(store().needsReload).toBe(false) // 权威落地即清（主清位）
    expect(store().saveStatus).toBe('clean')
    expectGraphEquals(db) // A 回库位：四面==库态
  })

  it('T2 格4/S2：空队列残值会话 save 零循环直通→fire=1+落地清', async () => {
    const db = [node('A')]
    dbGraph = () => graphOk(db)
    store().applyRecoverySession(payloadOf([node('A', { x: 50, y: 50 })], []))
    expect(store().needsReload).toBe(true)
    loadSpy.mockClear()
    await store().save()
    await settle()
    expect(loadSpy).toHaveBeenCalledTimes(1)
    expect(store().needsReload).toBe(false)
    expectGraphEquals(db)
  })

  it('T2c ②独有锁：干净载荷（无残值无冲突史）仍恒置位→首收尾 fire=1', async () => {
    // 用例注：载荷与库态一致且无冲突史——锁「无条件」性防退化①（载荷携带丢弃记录案）
    dbGraph = () => graphOk([node('A', { x: 1, y: 1 })])
    store().applyRecoverySession(
      payloadOf([node('A', { x: 1, y: 1 })], [{ kind: 'patch-node', id: 'A', patch: { x: 1, y: 1 } }])
    )
    expect(store().needsReload).toBe(true)
    loadSpy.mockClear()
    await store().save()
    await settle()
    expect(loadSpy).toHaveBeenCalledTimes(1)
    expect(store().needsReload).toBe(false)
  })

  it('T2d 完全干净交集格（d1-W3）：queue=[]∧图四面==库态→仍置位→save 直通 fire=1→落地清', async () => {
    const db = [node('A')]
    dbGraph = () => graphOk(db)
    store().applyRecoverySession(payloadOf([node('A')], [])) // 无残值无排队动作
    expect(store().needsReload).toBe(true) // 封死「残值检测退化」最后一格交集
    loadSpy.mockClear()
    await store().save()
    await settle()
    expect(loadSpy).toHaveBeenCalledTimes(1)
    expect(store().needsReload).toBe(false)
    expectGraphEquals(db)
  })

  it('T3 格9：discardSession 清位+零 fire（defer=entry 既有件锚，不新增）', () => {
    store().applyRecoverySession(payloadOf([node('A', { x: 1, y: 1 })], []))
    expect(store().needsReload).toBe(true)
    loadSpy.mockClear()
    store().discardSession()
    expect(store().needsReload).toBe(false) // 用户明示放弃例外清位
    expect(loadSpy).not.toHaveBeenCalled()
  })

  it('T4 格2回归守卫：恢复后保存遇 CONFLICT→丢弃续队→单 if 单次 fire=1', async () => {
    dbGraph = () => graphOk([node('A')])
    store().applyRecoverySession(
      payloadOf([node('A')], [{ kind: 'patch-node', id: 'A', patch: { x: 1, y: 1 } }])
    )
    expect(store().needsReload).toBe(true)
    stubApi.lineage.patchNode.mockResolvedValue({ ok: false, error: { code: 'CONFLICT', message: '冲突' } })
    loadSpy.mockClear()
    await store().save()
    await settle()
    expect(store().queue).toEqual([]) // 丢弃自愈（队空）
    expect(loadSpy).toHaveBeenCalledTimes(1) // conflictTouched∨needsReload 单 if 不双发
    expect(store().needsReload).toBe(false) // [修复轮 k1-N1] CONFLICT 格对针②敏感化（落地清位）
    expectGraphEquals([node('A')]) // 落地后四面==库态
  })

  it('T5 格3/S4前半：系统失败→error 期标志保持 true+零 fire→重试全成重试窗 fire=1+清', async () => {
    const db = [node('A', { x: 1, y: 1 })]
    dbGraph = () => graphOk(db)
    store().applyRecoverySession(
      payloadOf([node('A')], [{ kind: 'patch-node', id: 'A', patch: { x: 1, y: 1 } }])
    )
    stubApi.lineage.patchNode.mockResolvedValue({ ok: false, error: { code: 'DB_ERROR', message: '库失败' } })
    loadSpy.mockClear()
    await store().save()
    await settle()
    expect(store().saveStatus).toBe('error')
    expect(loadSpy).not.toHaveBeenCalled() // 失败窗无干净化点
    expect(store().needsReload).toBe(true) // 标志留驻（无清点——先红）
    stubApi.lineage.patchNode.mockImplementation(
      async (req: Partial<LineageNode> & { id: string }) =>
        ({ ok: true, data: { ...node(req.id), ...req } as LineageNode })
    )
    loadSpy.mockClear()
    await store().save()
    await settle()
    expect(loadSpy).toHaveBeenCalledTimes(1) // 重试窗（收尾触发）
    expect(store().needsReload).toBe(false)
    expectGraphEquals(db)
  })

  it('T6 非恢复负向：常规编辑保存全成→标志恒 false+零 fire', async () => {
    dbGraph = () => graphOk([node('A', { x: 1, y: 2 })])
    useLineageStore.setState({ nodes: [node('A')] })
    store().moveNode('A', 1, 2)
    expect(store().saveStatus).toBe('dirty')
    expect(store().needsReload).toBe(false)
    loadSpy.mockClear()
    await store().save()
    await settle()
    expect(store().saveStatus).toBe('clean')
    expect(store().needsReload).toBe(false)
    expect(loadSpy).not.toHaveBeenCalled() // 非恢复会话零触发零清位面
  })

  it('T7 S4 再崩溃格：连续两次恢复载入仍 true→首收尾 fire=1', async () => {
    // 用例注：同实例注入=等价前提——标志语义与实例身份无关（S4 再崩溃=再载入）
    dbGraph = () => graphOk([node('A')])
    store().applyRecoverySession(payloadOf([node('A', { x: 1, y: 1 })], []))
    store().applyRecoverySession(payloadOf([node('A', { x: 2, y: 2 })], []))
    expect(store().needsReload).toBe(true)
    loadSpy.mockClear()
    await store().save()
    await settle()
    expect(loadSpy).toHaveBeenCalledTimes(1)
    expect(store().needsReload).toBe(false)
  })

  it('T8 格11/S6（B1a）→[B4 L1 迁移；回炉 W-B3·R-B7 翻转（用户裁决 D-2＝甲）] 和解飞行期新编辑被同会话 saving 锁拒绝（INV-94）；gate 旁路注入的待写（Q>0）使在途和解读被丢（不写图态+标志留）→链尾 drain 旁路项→按当前 epoch 续拉恰一次→落地清（#10d/#34d——无需二次 save）', async () => {
    const dbFinal = [node('A', { x: 7, y: 7 })]
    dbGraph = () => graphOk(dbFinal)
    const d1 = defer()
    const d2 = defer() // 第二道闸：把链尾续拉读挂住（断言时点）
    script.push(d1.promise, d2.promise)
    store().applyRecoverySession(
      payloadOf([node('A', { x: 100, y: 100 })], [{ kind: 'patch-node', id: 'A', patch: { x: 3, y: 3 } }])
    )
    loadSpy.mockClear()
    const first = store().save() // drain→链尾和解（deferred 飞行中——flush await 落定）
    await settle()
    expect(loadSpy).toHaveBeenCalledTimes(1)
    store().moveNode('A', 7, 7) // 飞行期新编辑：saving 锁拒绝（原「互锁丢弃」面由锁前置承担）
    expect(store().queue).toHaveLength(0)
    expect(store().nodes[0]?.x).toBe(3) // 编辑无效（乐观应用同拒）
    // gate 旁路（恢复载入/后台事件路径）直注待写：和解应用判据 Q0 不成立→丢弃不写图态
    useLineageStore.setState({ queue: [{ kind: 'patch-node', id: 'A', patch: { x: 9, y: 9 } }] })
    const before = faces()
    d1.resolve(graphOk([node('A')])) // 在途响应到达
    await settle() // 被丢→链尾：drain 旁路项→续拉读（d2 飞行中）
    // [回炉 W-B3·R-B7 翻转] 原「二次手工 save 第二窗 fire=1」→ 链在 drain 新 Q 后自动续拉恰一次
    expect(loadSpy).toHaveBeenCalledTimes(2) // 首读 1＋链尾续拉恰 1（第二读在途——d2 挂住）
    expect(store().queue).toHaveLength(0) // 旁路项已 drain
    // 被丢不写图态：第一读载荷（node('A')——x/y 为 null）未落图；图四面＝旁路项的写回显（x=9,y=9）
    expect(faces()).toEqual({ nodes: [{ ...before.nodes[0]!, x: 9, y: 9 }], edges: before.edges, lineTypeNames: before.lineTypeNames, floatingNotes: before.floatingNotes })
    expect(store().needsReload).toBe(true) // 标志留驻（续读在途——无清点）
    d2.resolve(graphOk(dbFinal)) // 放行链尾续拉读
    await first
    expect(store().needsReload).toBe(false)
    expectGraphEquals(dbFinal) // 权威落地覆盖
    expect(loadSpy).toHaveBeenCalledTimes(2) // 无第二次 save——首 save 的链尾完成续拉
  })

  it('T9 格12（B1b）→[B4 L1 迁移] 和解读失败=IO error+标志留驻（图读面 status 不变）→复绿后二次 save fire=1→落地清', async () => {
    const db = [node('A')]
    dbGraph = () => graphOk(db)
    store().applyRecoverySession(payloadOf([node('A', { x: 5, y: 5 })], []))
    script.push(Promise.resolve({ ok: false, error: { code: 'DB_ERROR', message: '图读失败' } }))
    loadSpy.mockClear()
    await store().save() // 收尾和解 fire#1→读失败
    await settle()
    expect(store().saveStatus).toBe('error') // [B4 L1 翻转] 和解失败=IO error（原断言 status='error'）
    expect(store().lastWriteError).toBe('图读失败')
    expect(store().status).toBe('ready')
    expect(store().needsReload).toBe(true) // 失败不清位
    loadSpy.mockClear()
    await store().save() // 队空直通→第二窗
    await settle()
    expect(loadSpy).toHaveBeenCalledTimes(1)
    expect(store().needsReload).toBe(false)
    expectGraphEquals(db)
  })

  it('T10 格13（B1c）→[B4 L1 翻转] 和解读在途重复触发=让位/单飞（#34a：不并发第二读——原「两发 load 合流+旧 seq 丢弃」退役）', async () => {
    const db2 = [node('A', { x: 8, y: 8 })]
    dbGraph = () => graphOk(db2)
    const d1 = defer()
    script.push(d1.promise)
    store().applyRecoverySession(payloadOf([node('A', { x: 100, y: 100 })], []))
    loadSpy.mockClear()
    const first = store().save() // fire#1（d1 飞行）
    await settle()
    await store().save() // 在途 flush 让位早退——零新增 keyed 读
    expect(loadSpy).toHaveBeenCalledTimes(1)
    expect(store().needsReload).toBe(true) // 未落地不清
    d1.resolve(graphOk(db2))
    await first
    expectGraphEquals(db2)
    expect(store().needsReload).toBe(false)
  })

  it('T11a 格14（undo 面）→[B4 L1 迁移] 恢复会话编辑→undo：先 drain→needsReload 先和解（#13a，fire=1）→history-unit 反向写回编辑前', async () => {
    const db = [node('A')]
    dbGraph = () => graphOk(db)
    store().applyRecoverySession(payloadOf([node('A', { x: 100, y: 100 })], []))
    store().moveNode('A', 1, 1) // E1：恢复会话上的新编辑
    expect(store().saveStatus).toBe('dirty')
    loadSpy.mockClear()
    const undone = store().undo() // flush-then-unit：drain→和解→history-unit
    await settle()
    expect(loadSpy).toHaveBeenCalledTimes(1) // history 前先和解
    expect(store().needsReload).toBe(false)
    expect(await undone).toBe(true)
    expectGraphEquals([node('A', { x: 100, y: 100 })]) // undo=回到编辑前（恢复基线——对 DB 的新反向写）
  })

  it('T11b 格14（redo 对称面）→[B4 L1 迁移] redo 同走先和解（fire=1）→history-unit；IO 回 clean', async () => {
    const db = [node('A')]
    dbGraph = () => graphOk(db)
    store().applyRecoverySession(payloadOf([node('A', { x: 100, y: 100 })], []))
    // redo 栈尾注入（最小 HistoryEntry——UI 流结构性不可达的对称态：锁挂点）
    const delta: LineageEntityDelta = { kind: 'node', id: 'A', before: node('A', { x: 5, y: 5 }), after: node('A', { x: 6, y: 6 }) }
    useLineageStore.setState({ redoStack: [makeHistoryEntry({ changes: [delta] })] })
    loadSpy.mockClear()
    const redone = store().redo()
    await settle()
    expect(store().saveStatus).toBe('clean')
    expect(loadSpy).toHaveBeenCalledTimes(1)
    expect(store().needsReload).toBe(false)
    expect(await redone).toBe(true)
    expectGraphEquals([node('A', { x: 6, y: 6 })]) // history-unit 回显 after
  })

  it('T11c 格14（undo 触发面失败窗，d1-W4/W5）→[B4 L1 迁移] 和解失败=history 不执行不弹栈（#13b）、标志留驻→复绿再编辑再 undo 第二窗 fire=1→落地清', async () => {
    const db = [node('A')]
    dbGraph = () => graphOk(db)
    store().applyRecoverySession(payloadOf([node('A', { x: 100, y: 100 })], []))
    store().moveNode('A', 1, 1)
    script.push(Promise.resolve({ ok: false, error: { code: 'DB_ERROR', message: '图读失败' } }))
    loadSpy.mockClear()
    const first = store().undo() // 先和解：fire#1→读失败
    await settle()
    expect(loadSpy).toHaveBeenCalledTimes(1)
    expect(store().needsReload).toBe(true) // 失败位保留（防早清位）
    expect(await first).toBe(false) // history 不执行、不弹栈
    expect(store().undoStack).toHaveLength(1)
    store().moveNode('A', 2, 2) // 再编辑
    loadSpy.mockClear()
    const second = store().undo() // 再 undo→第二窗（graph 复绿）→和解成功→history-unit
    await settle()
    expect(loadSpy).toHaveBeenCalledTimes(1)
    expect(store().needsReload).toBe(false)
    expect(await second).toBe(true)
    expectGraphEquals([node('A', { x: 1, y: 1 })]) // 撤销「再编辑」=回到 x1
  })
})
