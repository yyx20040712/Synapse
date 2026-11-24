// @vitest-environment jsdom
/**
 * [回炉 R15] service×write-queue 集成测试（真 service 链——非 stub 行为）：
 * 真库夹具（createTestDb）+真 lineage.service 接到 api 桩位（仅传输层桩，
 * 业务守卫=真 service）→画线成环边 flush→**真 CONFLICT**（成环守卫）→队列
 * conflict-drop（toast reason+队列空回 clean+库态重拉）；真系统型（库连接
 * 关闭→真异常）→error 态+动作保留（INV-04）。
 * e2e 级 T3 旧链维持删除+豁免；本件=unit 级集成登记。always-active。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub, toastStoreSpy } from '../../utils/api-client-mock'

const stubApi = makeApiStub({
  lineage: { graph: vi.fn(), patchNode: vi.fn(), removeNode: vi.fn(), upsertEdge: vi.fn(), removeEdge: vi.fn(), upsertLineTypes: vi.fn() }
})

import type { SqliteDb } from '../../../src/main/db/connection'
import { createTestDb } from '../../utils/fixtures'
import { createLineageRepo } from '../../../src/main/db/repos/lineage.repo'
import { createLineageService } from '../../../src/main/services/lineage/lineage.service'
import { DomainError } from '../../../src/main/services/shared/domain-error'
import type { LineageEdge, LineageNode } from '../../../src/shared/models/lineage'
import { LINE_TYPE_COLORS } from '../../../src/shared/models/lineage'
import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

function node(id: string): LineageNode {
  return {
    id, paperId: `paper-${id}`, title: `节点${id}`, year: 2020,
    x: null, y: null, month: null, slot: null, folderId: '__main__', createdAt: 't', updatedAt: 't'
  }
}

function edge(id: string, from: string, to: string): LineageEdge {
  return { id, fromNode: from, toNode: to, label: '', dashed: false, color: '#1e3a8a', createdAt: 't', updatedAt: 't' }
}

const settle = async (turns = 10): Promise<void> => {
  for (let i = 0; i < turns; i++) await Promise.resolve()
}

const state = () => useLineageStore.getState()
let db: SqliteDb

/** 真 service 接桩：api 桩仅承载传输（Req→service→Res/Error 折叠） */
function wireRealService(): ReturnType<typeof createLineageService> {
  const repo = createLineageRepo(db)
  const svc = createLineageService({ repo })
  stubApi.lineage.upsertEdge.mockImplementation(async (req: {
    id?: string; from: string; to: string; label?: string; dashed?: boolean; color?: string
    via?: unknown; fromAnchor?: unknown; toAnchor?: unknown
  }) => {
    try {
      const saved = svc.upsertEdge({
        id: req.id,
        fromNode: req.from,
        toNode: req.to,
        label: req.label ?? '',
        dashed: req.dashed,
        color: req.color,
        // [定点修 W-r3-05] 全字段透传（锚/via——真链覆盖锚持久化校验面）
        ...(req.via !== undefined ? { via: req.via as never } : {}),
        ...(req.fromAnchor !== undefined ? { fromAnchor: req.fromAnchor as never } : {}),
        ...(req.toAnchor !== undefined ? { toAnchor: req.toAnchor as never } : {})
      })
      return { ok: true as const, data: saved }
    } catch (e) {
      if (e instanceof DomainError) return { ok: false as const, error: { code: e.code, message: e.message } }
      throw e
    }
  })
  return svc
}
/** [S7③] graph 桩=repo.listGraph() 代理（库态重拉真值面——禁固定数据假称） */
function wireGraphProxy(repo: ReturnType<typeof createLineageRepo>): void {
  stubApi.lineage.graph.mockImplementation(async () => {
    const g = repo.listGraph()
    return {
      ok: true as const,
      data: {
        nodes: g.nodes as unknown as LineageNode[],
        edges: g.edges as unknown as LineageEdge[]
      }
    }
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  for (const fn of Object.values(stubApi.lineage)) fn.mockReset()
  db = createTestDb()
  // 真库种子：三节点+两真边（A→B/B→C——画 C→A 即成环）
  const repo0 = createLineageRepo(db)
  const svc0 = wireRealService()
  wireGraphProxy(repo0)
  for (const id of ['A', 'B', 'C']) {
    db.prepare(
      `INSERT INTO lineage_nodes (id, paper_id, title, core_idea, year, x, y, created_at, updated_at) VALUES (?, NULL, ?, '', 2020, NULL, NULL, 't', 't')`
    ).run(id, `节点${id}`)
  }
  svc0.upsertEdge({ fromNode: 'A', toNode: 'B', label: '' })
  svc0.upsertEdge({ fromNode: 'B', toNode: 'C', label: '' })
  useLineageStore.setState({
    nodes: [node('A'), node('B'), node('C')],
    edges: [edge('e-ab', 'A', 'B'), edge('e-bc', 'B', 'C')],
    lineTypeNames: ['待命名', '待命名', '待命名', '待命名', '待命名', '待命名'],
    status: 'ready', error: null, saveStatus: 'clean', lastWriteError: null,
    queue: [], flushing: false, undoStack: [], redoStack: [], folderId: '__main__'
  })
  toastStoreSpy.mockClear()
})
describe('F-VISFB-66·[回炉 R15] 真 service×write-queue 集成（unit 级——e2e T3 旧链维持删除+豁免）', () => {
  it('真成环 CONFLICT：画线 C→A（store 对查重通过）→flush→真 service 成环守卫拒→conflict-drop（toast+队列空+库态重拉消解乐观边）', async () => {
    wireRealService()
    // store 面预置 A→B/B→C；画 C→A：pair 新（过 store 查重）——真 service 成环守卫触发
    const r = state().drawEdge('C', 'A', {
      dashed: false,
      color: LINE_TYPE_COLORS[0],
      label: '',
      fromAnchor: { side: 'bottom', slot: 1 },
      toAnchor: { side: 'top', slot: 1 }
    })
    expect(r.ok).toBe(true)
    expect(state().edges).toHaveLength(3) // 乐观边在场
    await state().save()
    await settle(14)
    // 真 CONFLICT：成环拒绝 toast+动作丢弃+库态重拉（乐观边消解回 2）
    expect(toastStoreSpy).toHaveBeenCalledWith('成环拒绝：该边将使脉络图出现环路（连线不得成环）', 'error')
    expect(state().queue).toHaveLength(0)
    expect(state().saveStatus).toBe('clean')
    expect(state().edges).toHaveLength(2)
  })

  it('真系统型失败（库连接关闭→真异常）：error 态+动作保留（INV-04——重试窗在）', async () => {
    wireRealService()
    db.close() // 真系统型：底层库失联（非 DomainError——保留动作）
    const r = state().drawEdge('C', 'A', {
      dashed: false,
      color: LINE_TYPE_COLORS[0],
      label: '',
      fromAnchor: { side: 'bottom', slot: 1 },
      toAnchor: { side: 'top', slot: 1 }
    })
    expect(r.ok).toBe(true)
    await state().save()
    await settle(14)
    expect(state().saveStatus).toBe('error')
    expect(state().queue).toHaveLength(1) // 动作保留不丢
    expect(state().lastWriteError).toBeTruthy()
  })

  it('[S7①] 真 service UNIQUE 拒：DB 已有 A→B 而 renderer 乐观缺该边→画 B→A（store 查重过）→flush→真重复边拒绝', async () => {
    wireRealService()
    useLineageStore.setState({
      nodes: [node('A'), node('B'), node('C')],
      edges: [edge('e-bc', 'B', 'C')]
    })
    const r = state().drawEdge('A', 'B', {  // 同序对（service UNIQUE=有序判——反向对合法不入本案）
      dashed: false,
      color: LINE_TYPE_COLORS[0],
      label: '',
      fromAnchor: { side: 'bottom', slot: 1 },
      toAnchor: { side: 'top', slot: 1 }
    })
    expect(r.ok).toBe(true)
    await state().save()
    await settle(14)
    expect(toastStoreSpy.mock.calls.filter((c) => c[0] === '该逻辑线已存在（A→B），重复边被拒绝' && c[1] === 'error').length).toBeGreaterThan(0)  // [S7①] 真守卫中文 reason 透传（filter 形容双写面）
    expect(state().queue).toHaveLength(0)
    expect(state().saveStatus).toBe('clean')
  })

  it('[S7②] 真 service 自环拒：A→A 直 upsert（防御径）→中文自环 reason（真守卫——替换文案 mock）', () => {
    const svc = wireRealService()
    expect(() => svc.upsertEdge({ fromNode: 'A', toNode: 'A', label: '' })).toThrowError(/自环边不允许/)
  })
})

describe('F-VISFB-66·[定点修 W-r3-05] 桩透传锚：drawEdge 双锚经真 service 落库往返（fromAnchor/toAnchor 回读）', () => {
  it('drawEdge 载荷锚落库→repo 回读恒等（真链锚持久化面）', async () => {
    const repo = createLineageRepo(db)
    wireRealService()
    const r = state().drawEdge('A', 'C', {
      dashed: false,
      color: LINE_TYPE_COLORS[0],
      label: '',
      fromAnchor: { side: 'bottom', slot: 1 },
      toAnchor: { side: 'top', slot: 0 }
    })
    expect(r.ok).toBe(true)
    await state().save()
    await settle(20)
    const e = repo.listGraph().edges.find((x) => x.fromNode === 'A' && x.toNode === 'C')
    expect(e, '真库含 A→C 新边').toBeDefined()
    expect(e!.fromAnchor).toEqual({ side: 'bottom', slot: 1 })
    expect(e!.toAnchor).toEqual({ side: 'top', slot: 0 })
  })
})

describe('F-VISFB-66·[定点修] 真库 remove×upsert 持久化顺序（S8 补格——非仅 host 乐观态）', () => {
  it('upsert→remove 顺序 flush：真库终态=缺席+调用序 upsert 先于 remove（listGraph 直证）', async () => {
    const repo = createLineageRepo(db)
    const svc = wireRealService()
    stubApi.lineage.removeEdge.mockImplementation(async (req: { id: string }) => {
      return { ok: true as const, data: repo.removeEdge(req.id) }
    })
    // 真库种 A→C 边（provided id——store/DB 同一身份）
    svc.upsertEdge({ id: 'e-x', fromNode: 'A', toNode: 'C', label: '' })
    useLineageStore.setState({ edges: [...state().edges, edge('e-x', 'A', 'C')] })
    // 队列顺序：upsert（via 物化）→remove（同 id）——FIFO flush
    state().setEdgeVia('e-x', [{ x: 100, y: 200 }, { x: 100, y: 300 }])
    state().removeEdge('e-x')
    await state().save()
    await settle(20)
    const g = repo.listGraph()
    expect(g.edges.some((e) => e.id === 'e-x'), '真库终态=remove 后缺席（listGraph 直证——非 host 乐观态）').toBe(false)
    // [定点修 W-02-r4] 顺序断言取**测试期**调用（末次 upsert）——beforeEach 种子
    // 调用污染 invocationCallOrder[0]，取首值则测试期 upsert 漏发仍绿（k1 r4）
    const calls = stubApi.lineage.upsertEdge.mock.calls
    const last = calls[calls.length - 1]
    expect(last?.[0], '测试期 upsert 载荷=e-x 全字段（种子后末次）').toMatchObject({ id: 'e-x', from: 'A', to: 'C' })
    expect(Array.isArray(last?.[0]?.via), '测试期 upsert 载荷含 via（setEdgeVia 物化）').toBe(true)
    expect(stubApi.lineage.removeEdge).toHaveBeenCalledWith({ id: 'e-x' })
    const orders = stubApi.lineage.upsertEdge.mock.invocationCallOrder
    const upOrder = orders[orders.length - 1] ?? 0
    const rmOrder = stubApi.lineage.removeEdge.mock.invocationCallOrder[0] ?? 0
    expect(upOrder, '调用序=测试期 upsert 先于 remove（FIFO 真序）').toBeLessThan(rmOrder)
  })
})

// ── [回炉 W-D1·T-B02] 设计稿 §12.2 行 779 增补：真 service 链的 needsReload／显式重发／finalize
//    断言（依据 §6.2「权威和解是链任务，不是 fire-and-forget」、§2.5 #10/#20-#23、§2.6
//    #10a-#10d/#20a-#20c/#43）。既有六例原样不动；本段新增依赖经动态 import 取得（import 区零改动）。
describe('F-VISFB-66·[回炉 W-D1] 真 service×显式保存：丢弃续拉（needsReload 保留+显式重发）与失败不定稿（§6.2／§2.5 #10/#20-#23）', () => {
  const MAIN = '__main__'
  type GraphOk = { ok: true; data: { nodes: LineageNode[]; edges: LineageEdge[] } }

  /** patch-node 接真 service（本段新增面——既有六例不经节点写通道；非 DomainError 原样上抛=真系统型失败） */
  const wirePatchNode = (svc: ReturnType<typeof createLineageService>): void => {
    stubApi.lineage.patchNode.mockImplementation(async (req: { id: string } & Record<string, unknown>) => {
      const { id, ...patch } = req
      try {
        return { ok: true as const, data: svc.patchNode(id, patch as Parameters<typeof svc.patchNode>[1]) }
      } catch (e) {
        if (e instanceof DomainError) return { ok: false as const, error: { code: e.code, message: e.message } }
        throw e
      }
    })
  }
  const dbGraph = (repo: ReturnType<typeof createLineageRepo>): GraphOk => {
    const g = repo.listGraph()
    return { ok: true, data: { nodes: g.nodes as unknown as LineageNode[], edges: g.edges as unknown as LineageEdge[] } }
  }
  /** 画 C→A（store 查重通过——真 service 成环守卫拒） */
  const drawCycleEdge = (): void => {
    expect(state().drawEdge('C', 'A', {
      dashed: false, color: LINE_TYPE_COLORS[0], label: '',
      fromAnchor: { side: 'bottom', slot: 1 }, toAnchor: { side: 'top', slot: 1 }
    }).ok).toBe(true)
  }

  beforeEach(() => {
    // 本段用例断言位/在途/相位/U 四面——会话面整幅复位（文件级 beforeEach 未含这四项，防跨例残留）
    useLineageStore.setState({ needsReload: false, inflight: null, flushing: false, unfinalized: false, editRevision: 0 })
  })

  /** 边的端点对（种子边 id 由 repo 生成——按端点对比较） */
  const pairs = (edges: Array<{ fromNode: string; toNode: string }>): string[] =>
    edges.map((e) => `${e.fromNode}>${e.toNode}`).sort()

  it('丢弃续拉（flush 收口路径）：save() 遇真成环 CONFLICT→动作丢弃+needsReload 置位→链尾和解＝keyed 读恰一次（显式重发）→位清；flush 收口不清栈不定稿；随后显式保存直接定稿', async () => {
    const svc = wireRealService()
    wirePatchNode(svc)
    const repo = createLineageRepo(db)
    wireGraphProxy(repo)
    const graphBefore = stubApi.lineage.graph.mock.calls.length
    state().moveNode('A', 10, 10) // 编辑单元①（普通写——落库成功）
    drawCycleEdge() // 编辑单元②（乐观边在场）
    expect(state().edges).toHaveLength(3)
    expect(state().undoStack).toHaveLength(2)
    await state().save() // flush 收口（IO 轴）——不定稿
    // 显式重发：链尾和解任务恰一次 keyed 读（fire-and-forget load 收口退役）；权威应用=唯一清位点
    expect(stubApi.lineage.graph.mock.calls.length - graphBefore).toBe(1)
    expect(stubApi.lineage.graph).toHaveBeenLastCalledWith({ folderId: '__main__' })
    expect(state().needsReload).toBe(false)
    // 权威应用消解乐观冲突边；节点移动已落库（真库回读）
    expect(pairs(state().edges)).toEqual(['A>B', 'B>C'])
    const g = repo.listGraph()
    const moved = g.nodes.find((n) => n.id === 'A')
    expect({ x: moved?.x, y: moved?.y }, '真库：节点移动已落库').toEqual({ x: 10, y: 10 })
    expect(pairs(g.edges), '真库：成环边未落库').toEqual(['A>B', 'B>C'])
    // flush 收口：不记失败（#10 的记失败属显式保存）、不清栈、不定稿
    expect({ phase: state().saveStatus, error: state().lastWriteError, undo: state().undoStack.length, redo: state().redoStack.length, unfinalized: state().unfinalized, queue: state().queue.length })
      .toEqual({ phase: 'clean', error: null, undo: 2, redo: 0, unfinalized: true, queue: 0 })
    // 随后显式保存：和解已完成——直接定稿；零再读、零重写
    const patchAfterFlush = stubApi.lineage.patchNode.mock.calls.length
    await expect(state().saveActiveFolder()).resolves.toBe(true)
    expect(stubApi.lineage.graph.mock.calls.length - graphBefore).toBe(1)
    expect(stubApi.lineage.patchNode.mock.calls.length).toBe(patchAfterFlush)
    expect({ undo: state().undoStack.length, redo: state().redoStack.length, unfinalized: state().unfinalized }).toEqual({ undo: 2, redo: 0, unfinalized: false })
  })

  it('丢弃续拉（显式保存路径）：显式保存遇真成环 CONFLICT→链尾和解＝keyed 读恰一次→位清；本次 finalize 记失败（错误可见），和解后二次显式保存才定稿', async () => {
    const svc = wireRealService()
    wirePatchNode(svc)
    const repo = createLineageRepo(db)
    wireGraphProxy(repo)
    const graphBefore = stubApi.lineage.graph.mock.calls.length
    state().moveNode('A', 10, 10)
    drawCycleEdge()
    await expect(state().saveActiveFolder()).resolves.toBe(false) // #10：本次 finalize 记失败
    expect(stubApi.lineage.graph.mock.calls.length - graphBefore).toBe(1)
    expect(stubApi.lineage.graph).toHaveBeenLastCalledWith({ folderId: '__main__' })
    expect(state().needsReload).toBe(false)
    expect(pairs(state().edges)).toEqual(['A>B', 'B>C'])
    expect(pairs(repo.listGraph().edges), '真库：成环边未落库').toEqual(['A>B', 'B>C'])
    // 失败可见；历史与 U 不因 CONFLICT 丢弃而清
    expect(state().saveStatus).toBe('error')
    expect(state().lastWriteError).toBe('成环拒绝：该边将使脉络图出现环路（连线不得成环）')
    expect({ undo: state().undoStack.length, redo: state().redoStack.length, unfinalized: state().unfinalized, queue: state().queue.length })
      .toEqual({ undo: 2, redo: 0, unfinalized: true, queue: 0 })
    // 和解完成后二次显式保存定稿：零写 IPC、零再读；undo 保留、redo 清、U 清
    const patchAfterFirst = stubApi.lineage.patchNode.mock.calls.length
    await expect(state().saveActiveFolder()).resolves.toBe(true)
    expect(stubApi.lineage.patchNode.mock.calls.length).toBe(patchAfterFirst)
    expect(stubApi.lineage.graph.mock.calls.length - graphBefore).toBe(1)
    expect({ phase: state().saveStatus, error: state().lastWriteError, undo: state().undoStack.length, redo: state().redoStack.length, unfinalized: state().unfinalized })
      .toEqual({ phase: 'clean', error: null, undo: 2, redo: 0, unfinalized: false })
  })

  it('needsReload 保留：真 CONFLICT 后的和解读在途遇结构事件（epoch 推进）→事件前旧读被丢不清位不写图→按新 epoch 显式续拉恰一次→位清', async () => {
    wireRealService()
    const repo = createLineageRepo(db)
    const { lineageRegistry } = await import('../../../src/renderer/features/lineage/lineage-session-registry')
    const { lineageFolderReconcile } = await import('../../../src/renderer/features/lineage/lineage-folder-reconcile')
    const reads: Array<(v: GraphOk) => void> = []
    stubApi.lineage.graph.mockImplementation(() => new Promise((r) => { reads.push(r) }))
    drawCycleEdge()
    const saving = state().saveActiveFolder()
    try {
      await vi.waitFor(() => expect(stubApi.lineage.graph).toHaveBeenCalledTimes(1)) // 链尾和解读已发（在途）
      expect(state().needsReload, '位保留至权威应用').toBe(true)
      expect(state().inflight?.kind).toBe('reconcile')
      expect(state().saveStatus).toBe('saving') // §2.4：有在途必须为 saving
      let settled = false
      void saving.then(() => { settled = true })
      lineageFolderReconcile.onStructureChanged() // §2.6 #41：全 registry 置位+epoch 推进
      expect(lineageRegistry.entry(MAIN)!.data.invalidationEpoch).toBe(1)
        reads[0]!(dbGraph(repo)) // 事件前发起的旧读到达
        await settle(20)
        expect(state().needsReload, '事件前旧读不得清位').toBe(true)
        expect(state().edges, '事件前旧读不写图态（乐观冲突边仍在场）').toHaveLength(3)
        expect(reads, '#43：旧读不可应用→按当前 epoch 显式续拉恰一次（不并发第三读）').toHaveLength(2)
        expect(lineageRegistry.entry(MAIN)!.inflightGraph?.identity.epoch, '续拉读捕获新 epoch').toBe(1)
      expect(settled, '位未清：finalize 不返回').toBe(false)
      reads[1]!(dbGraph(repo))
      await expect(saving).resolves.toBe(false) // #10：CONFLICT 丢弃仍记失败（和解完成≠定稿）
      expect(stubApi.lineage.graph).toHaveBeenCalledTimes(2)
      expect(stubApi.lineage.graph.mock.calls[1]![0]).toEqual({ folderId: MAIN })
      expect(state().needsReload).toBe(false)
      expect(state().edges, '续拉应用后乐观冲突边消解').toHaveLength(2)
        expect(state().inflight).toBeNull()
    } finally {
      // 断言先红时不留悬挂在途：未到达的读一律以库态收束（重复 resolve 无副作用），等 finalize 落定
      for (let i = 0; i < 3; i++) {
        for (const r of reads) r(dbGraph(repo))
        await settle(14)
      }
      await saving.catch(() => undefined)
    }
  })

  it('失败不定稿（和解读失败）：真实 undo 后（redo=1）结构事件置位、和解读失败→显式保存 finalize=false；redo/U/undo 全保留、位保留、错误可见；读面复绿后二次保存定稿', async () => {
    const svc = wireRealService()
    wirePatchNode(svc)
    const repo = createLineageRepo(db)
    const { echoHistoryUnit } = await import('../../utils/lineage-history-stub')
    // history-unit 回显桩挂到 api 桩位（本文件桩形状未含该通道——运行期补键；经真实 undo 产生 redo，不植入伪造栈）
    ;(stubApi.lineage as unknown as { historyUnit: unknown }).historyUnit = vi.fn(echoHistoryUnit)
    const { lineageFolderReconcile } = await import('../../../src/renderer/features/lineage/lineage-folder-reconcile')
    state().moveNode('A', 10, 10)
    expect(await state().undo()).toBe(true) // 真实撤销：undo 0、redo 1、U=1、IO clean
    expect(state().redoStack).toHaveLength(1)
    expect(state().saveStatus).toBe('clean')
    const redoId = state().redoStack[0]!.id
    stubApi.lineage.graph.mockResolvedValue({ ok: false, error: { code: 'DB_ERROR', message: '权威读失败' } })
    lineageFolderReconcile.onStructureChanged() // §2.6 #41：活动会话 IO clean→立即和解→读失败（error、位保留）
    await settle(14)
    expect(state().needsReload).toBe(true)
    expect(stubApi.lineage.graph).toHaveBeenCalledTimes(1)
    await expect(state().saveActiveFolder()).resolves.toBe(false) // #20b：和解失败不进入定稿清账
    expect(stubApi.lineage.graph).toHaveBeenCalledTimes(2)
    expect(state().needsReload, '和解失败位保留').toBe(true)
    expect(state().saveStatus).toBe('error')
    expect(state().lastWriteError).toBe('权威读失败')
    expect(state().undoStack, 'undo 保留').toHaveLength(0)
    expect(state().redoStack.map((e) => e.id), 'redo 保留（同一历史项）').toEqual([redoId])
    expect(state().unfinalized, 'U 保留').toBe(true)
    expect(state().queue).toEqual([])
    expect(state().inflight).toBeNull()
    wireGraphProxy(repo) // 读面复绿
    await expect(state().saveActiveFolder()).resolves.toBe(true) // 和解完成后二次显式保存定稿
    expect(state().needsReload).toBe(false)
    expect(state().redoStack, '定稿清 redo').toHaveLength(0)
    expect(state().unfinalized, '定稿清 U').toBe(false)
    expect(state().saveStatus).toBe('clean')
  })

  it('失败不定稿（预 flush 系统型失败）：真库失联→显式保存 finalize=false；失败写保留（队首）、undo/U 不动', async () => {
    const svc = wireRealService()
    wirePatchNode(svc)
    state().moveNode('A', 10, 10) // Q=1、undo 1、U=1
    const undoId = state().undoStack[0]!.id
    db.close() // 真系统型：底层库失联（非 DomainError）
    await expect(state().saveActiveFolder()).resolves.toBe(false) // #23：预 flush 失败
    expect(stubApi.lineage.patchNode).toHaveBeenCalledTimes(1) // 确曾尝试落库
    expect(stubApi.lineage.graph).not.toHaveBeenCalled() // 未进入和解与定稿
    expect(state().saveStatus).toBe('error')
    expect(state().lastWriteError, '真系统型失败的原文透传（库已关闭）').toMatch(/database connection is not open/i)
    expect(state().queue, '失败写保留').toHaveLength(1)
    expect(state().inflight).toBeNull()
    expect(state().unfinalized, 'U 不改为已定稿').toBe(true)
    expect(state().undoStack.map((e) => e.id), 'undo 保留（同一历史项）').toEqual([undoId])
  })
})
