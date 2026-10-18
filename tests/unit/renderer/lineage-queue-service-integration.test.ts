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
