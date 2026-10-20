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
    removeFloatingNote: vi.fn()
  }
})

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

  it('T8 格11/S6（B1a）：收尾 fire 飞行期新编辑→互锁丢弃（四面未变+标志留）→二次 save 第二窗 fire=1→落地清', async () => {
    const dbFinal = [node('A', { x: 7, y: 7 })]
    dbGraph = () => graphOk(dbFinal)
    const d1 = defer()
    script.push(d1.promise)
    store().applyRecoverySession(
      payloadOf([node('A', { x: 100, y: 100 })], [{ kind: 'patch-node', id: 'A', patch: { x: 3, y: 3 } }])
    )
    loadSpy.mockClear()
    await store().save() // 收尾 fire#1（deferred 飞行中）
    expect(loadSpy).toHaveBeenCalledTimes(1)
    store().moveNode('A', 7, 7) // 飞行期新编辑（queue>0 互锁）
    const before = faces()
    d1.resolve(graphOk([node('A')])) // 旧响应落地
    await settle()
    expect(faces()).toEqual(before) // 互锁丢弃：图四面未变
    expect(store().needsReload).toBe(true) // 标志留驻（无清点——先红）
    loadSpy.mockClear()
    await store().save() // 第二触发定死=二次 save（解耦 undo 语义依赖）
    await settle()
    expect(loadSpy).toHaveBeenCalledTimes(1) // 第二窗 fire=1
    expect(store().needsReload).toBe(false)
    expectGraphEquals(dbFinal)
  })

  it('T9 格12（B1b）：graph 读失败不清位→复绿后二次 save fire=1→落地清', async () => {
    const db = [node('A')]
    dbGraph = () => graphOk(db)
    store().applyRecoverySession(payloadOf([node('A', { x: 5, y: 5 })], []))
    script.push(Promise.resolve({ ok: false, error: { code: 'DB_ERROR', message: '图读失败' } }))
    loadSpy.mockClear()
    await store().save() // 收尾 fire#1→load 失败
    await settle()
    expect(store().status).toBe('error')
    expect(store().needsReload).toBe(true) // 失败不清位（先红）
    loadSpy.mockClear()
    await store().save() // 队空直通→第二窗
    await settle()
    expect(loadSpy).toHaveBeenCalledTimes(1)
    expect(store().needsReload).toBe(false)
    expectGraphEquals(db)
  })

  it('T10 格13（B1c）：两发 load 合流→旧 seq 响应丢弃（四面未变+标志留）→最新落地清', async () => {
    const db2 = [node('A', { x: 8, y: 8 })]
    dbGraph = () => graphOk(db2)
    const d1 = defer()
    const d2 = defer()
    script.push(d1.promise, d2.promise)
    store().applyRecoverySession(payloadOf([node('A', { x: 100, y: 100 })], []))
    loadSpy.mockClear()
    await store().save() // fire#1（d1 飞行）
    await store().save() // fire#2（d2 飞行——seq 更新）
    expect(loadSpy).toHaveBeenCalledTimes(2)
    const before = faces()
    d1.resolve(graphOk([node('A')])) // 旧响应：非最新发出者
    await settle()
    expect(faces()).toEqual(before) // seq 旧弃：图四面未变
    expect(store().needsReload).toBe(true) // 未落地不清
    d2.resolve(graphOk(db2)) // 最新响应：落地
    await settle()
    expectGraphEquals(db2)
    expect(store().needsReload).toBe(false)
  })

  it('T11a 格14（undo 面）：恢复空队列会话编辑→undo 回基线 clean→触发 fire=1→落地清', async () => {
    const db = [node('A')]
    dbGraph = () => graphOk(db)
    store().applyRecoverySession(payloadOf([node('A', { x: 100, y: 100 })], []))
    store().moveNode('A', 1, 1) // E1：基线快照 queue=[]（§5 可达形——Q0 空会话）
    expect(store().saveStatus).toBe('dirty')
    loadSpy.mockClear()
    store().undo() // 回基线：queue 空→clean→干净化点触发
    expect(loadSpy).toHaveBeenCalledTimes(1)
    await settle()
    expect(store().needsReload).toBe(false)
    expectGraphEquals(db)
  })

  it('T11b 格14（redo 对称面）：redo 回基线 clean→触发 fire=1（快照对称态注入）', async () => {
    const db = [node('A')]
    dbGraph = () => graphOk(db)
    store().applyRecoverySession(payloadOf([node('A', { x: 100, y: 100 })], []))
    // redo 栈尾=基线态（queue=[]——UI 流结构性不可达、挂点对称放置：注入对称态锁挂点）
    useLineageStore.setState({
      redoStack: [{ nodes: store().nodes, edges: [], lineTypeNames: store().lineTypeNames, queue: [], floatingNotes: [] }]
    })
    loadSpy.mockClear()
    store().redo()
    expect(store().saveStatus).toBe('clean')
    expect(loadSpy).toHaveBeenCalledTimes(1)
    await settle()
    expect(store().needsReload).toBe(false)
    expectGraphEquals(db)
  })

  it('T11c 格14（undo 触发面失败窗，d1-W4/W5）：触发后 load 失败标志留驻→复绿再编辑再回基线第二窗 fire=1→落地清', async () => {
    const db = [node('A')]
    dbGraph = () => graphOk(db)
    store().applyRecoverySession(payloadOf([node('A', { x: 100, y: 100 })], []))
    store().moveNode('A', 1, 1)
    script.push(Promise.resolve({ ok: false, error: { code: 'DB_ERROR', message: '图读失败' } }))
    loadSpy.mockClear()
    store().undo() // 回基线 clean→触发 fire#1→落地失败
    await settle()
    expect(loadSpy).toHaveBeenCalledTimes(1)
    expect(store().needsReload).toBe(true) // undo 触发面只触发不清位（防早清位变异⑦）
    store().moveNode('A', 2, 2) // 再编辑离开基线
    loadSpy.mockClear()
    store().undo() // 再回基线→第二窗（graph 复绿 fallback）
    expect(loadSpy).toHaveBeenCalledTimes(1)
    await settle()
    expect(store().needsReload).toBe(false)
    expectGraphEquals(db)
  })
})
