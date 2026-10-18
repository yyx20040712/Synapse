// @vitest-environment jsdom
/**
 * [F-VISFB-66 单元一] 写队列合并键 id 化+整替合并（设计书 v1.2 §D.4——
 * W-01r2③④⑤：合并键=upsert-edge id 判等；同 id 后动作整替（元数据后值胜）；
 * undefined≡缺席 enqueue 归一化；remove×upsert 两格；合成缺 id 动作 throw）。
 * always-active。
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

import { createWriteQueue, type WriteQueueHost, type WriteAction } from '../../../src/renderer/features/lineage/lineage-write-queue'

function makeHost(edges: WriteQueueHost['edges'] = []): { host: WriteQueueHost; setSpy: ReturnType<typeof vi.fn> } {
  const setSpy = vi.fn()
  const host: WriteQueueHost = {
    nodes: [],
    edges,
    floatingNotes: [],
    lineTypeNames: ['待命名', '待命名', '待命名', '待命名', '待命名', '待命名'],
    saveStatus: 'clean',
    lastWriteError: null,
    queue: [],
    flushing: false,
    undoStack: [],
    redoStack: [],
    load: async () => undefined
  }
  return { host, setSpy }
}

const queue = (host: WriteQueueHost): WriteAction[] => host.queue

describe('F-VISFB-66·合并键 id 判等 diff 三格（§D.4-5 表）', () => {
  beforeEach(() => {
    for (const fn of Object.values(stubApi.lineage)) fn.mockReset()
    stubApi.lineage.upsertEdge.mockImplementation(async (req: { id?: string; from: string; to: string }) => ({
      ok: true,
      data: { id: req.id ?? 'e-x', fromNode: req.from, toNode: req.to, label: '', dashed: false, color: '#1e3a8a', createdAt: 't', updatedAt: 't' }
    }))
    stubApi.lineage.removeEdge.mockResolvedValue({ ok: true, data: { ok: true } })
  })

  it('格一：同 id 同 pair → 合并（后动作整替——终态与旧对判等同）', () => {
    const { host } = makeHost()
    const wq = createWriteQueue({
      set: (patch) => {
        const p = typeof patch === 'function' ? patch(host) : patch
        Object.assign(host, p)
      },
      get: () => host
    })
    wq.enqueue({ kind: 'upsert-edge', input: { id: 'e1', fromNode: 'a', toNode: 'b', label: '旧' } })
    wq.enqueue({ kind: 'upsert-edge', input: { id: 'e1', fromNode: 'a', toNode: 'b', label: '新' } })
    expect(queue(host)).toHaveLength(1)
    expect((queue(host)[0] as { input: { label: string } }).input.label).toBe('新')
  })

  it('格二：同 id 异 pair（换端序列）→ 合并整替（旧=不合并顺序应用——行为 diff 表）', () => {
    const { host } = makeHost()
    const wq = createWriteQueue({
      set: (patch) => {
        const p = typeof patch === 'function' ? patch(host) : patch
        Object.assign(host, p)
      },
      get: () => host
    })
    wq.enqueue({ kind: 'upsert-edge', input: { id: 'e1', fromNode: 'a', toNode: 'b', label: 'x', via: null } })
    wq.enqueue({ kind: 'upsert-edge', input: { id: 'e1', fromNode: 'a', toNode: 'c', label: 'x', via: null } })
    expect(queue(host)).toHaveLength(1)
    expect((queue(host)[0] as { input: { toNode: string } }).input.toNode).toBe('c')
  })

  it('格三：异 id → 不合并（两动作独立排队）', () => {
    const { host } = makeHost()
    const wq = createWriteQueue({
      set: (patch) => {
        const p = typeof patch === 'function' ? patch(host) : patch
        Object.assign(host, p)
      },
      get: () => host
    })
    wq.enqueue({ kind: 'upsert-edge', input: { id: 'e1', fromNode: 'a', toNode: 'b', label: '' } })
    wq.enqueue({ kind: 'upsert-edge', input: { id: 'e2', fromNode: 'a', toNode: 'b', label: '' } })
    expect(queue(host)).toHaveLength(2)
  })

  it('整替合并元数据后值胜：silentSave 前真后缺→终态缺（后动作整替非浅并）', () => {
    const { host } = makeHost()
    const wq = createWriteQueue({
      set: (patch) => {
        const p = typeof patch === 'function' ? patch(host) : patch
        Object.assign(host, p)
      },
      get: () => host
    })
    wq.enqueue({ kind: 'upsert-edge', input: { id: 'e1', fromNode: 'a', toNode: 'b', label: '' }, silentSave: true })
    wq.enqueue({ kind: 'upsert-edge', input: { id: 'e1', fromNode: 'a', toNode: 'b', label: '' } })
    const merged = queue(host)[0] as { silentSave?: boolean }
    expect(merged.silentSave).toBeUndefined()
  })

  it('合成缺 id 动作→throw（防御纵深：store 构造层恒物化 id——管线外动作拒收）', () => {
    const { host } = makeHost()
    const wq = createWriteQueue({
      set: (patch) => {
        const p = typeof patch === 'function' ? patch(host) : patch
        Object.assign(host, p)
      },
      get: () => host
    })
    expect(() =>
      wq.enqueue({ kind: 'upsert-edge', input: { fromNode: 'a', toNode: 'b', label: '' } })
    ).toThrowError(/id/)
  })

  it('undefined≡缺席 enqueue 归一化：via/fromAnchor/toAnchor undefined 与缺键载荷等价（同 id 合并后无 undefined 残留）', () => {
    const { host } = makeHost()
    const wq = createWriteQueue({
      set: (patch) => {
        const p = typeof patch === 'function' ? patch(host) : patch
        Object.assign(host, p)
      },
      get: () => host
    })
    wq.enqueue({
      kind: 'upsert-edge',
      input: { id: 'e1', fromNode: 'a', toNode: 'b', label: '', via: undefined, fromAnchor: undefined, toAnchor: undefined }
    })
    const input = (queue(host)[0] as { input: Record<string, unknown> }).input
    expect('via' in input && input.via === undefined).toBe(false)
    expect('fromAnchor' in input && input.fromAnchor === undefined).toBe(false)
    expect('toAnchor' in input && input.toAnchor === undefined).toBe(false)
  })

  it('remove×upsert 第二格（R9+S8）：upsert 后 remove=remove 生效+host 乐观态终值断言+**调用顺序记录**（upsert 先于 remove）', async () => {
    const { host } = makeHost()
    const wq = createWriteQueue({
      set: (patch) => {
        const p = typeof patch === 'function' ? patch(host) : patch
        Object.assign(host, p)
      },
      get: () => host
    })
    wq.enqueue({ kind: 'upsert-edge', input: { id: 'e1', fromNode: 'a', toNode: 'b', label: '' } })
    wq.enqueue({ kind: 'remove-edge', id: 'e1' })
    await wq.flush()
    // 顺序 flush：upsert 先落（重建）→remove 后落（删除）
    expect(stubApi.lineage.upsertEdge).toHaveBeenCalledTimes(1)
    expect(stubApi.lineage.removeEdge).toHaveBeenCalledWith({ id: 'e1' })
    // [S8] 调用顺序记录（invocationCallOrder——upsert 严格先于 remove）
    const ordUp = stubApi.lineage.upsertEdge.mock.invocationCallOrder[0]!
    const ordRm = stubApi.lineage.removeEdge.mock.invocationCallOrder[0]!
    expect(ordUp).toBeLessThan(ordRm)
    expect(host.saveStatus).toBe('clean')
    // [S8] 本面=host 乐观态（直连 queue 无真库）——真持久化顺序面由
    // lineage-queue-service-integration 真库链承载（R15/S7 件）
    expect(host.edges.find((e) => e.id === 'e1')).toBeUndefined() // host 乐观态终值=remove 生效
  })

  it('remove×upsert 两格：异 kind 不合并顺序 flush——remove 后 upsert=重建生效', async () => {
    const { host } = makeHost([
      { id: 'e1', fromNode: 'a', toNode: 'b', label: '', dashed: false, color: '#1e3a8a', createdAt: 't', updatedAt: 't' }
    ])
    const wq = createWriteQueue({
      set: (patch) => {
        const p = typeof patch === 'function' ? patch(host) : patch
        Object.assign(host, p)
      },
      get: () => host
    })
    wq.enqueue({ kind: 'remove-edge', id: 'e1' })
    wq.enqueue({ kind: 'upsert-edge', input: { id: 'e1', fromNode: 'a', toNode: 'b', label: '' } })
    expect(queue(host)).toHaveLength(2)
    await wq.flush()
    const calls = stubApi.lineage.upsertEdge.mock.calls
    const removes = stubApi.lineage.removeEdge.mock.calls
    expect(removes).toHaveLength(1)
    expect(calls).toHaveLength(1)
    expect(removes[0]![0]).toEqual({ id: 'e1' })
    expect(host.saveStatus).toBe('clean')
  })
})
