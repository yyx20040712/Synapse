/**
 * [F-UIRES-04 批 3a] paperInfoStore —— M1 detail 取数机单测（always-active 裸
 * describe，K3——不经 guardedDescribe）。
 *
 * 覆盖=设计书 §4.11-M1 跨格序列 S1-S9 逐格 + LRU 容量格（S10——LRU 归本模块
 * 票面面，逐例申报）。配方沿 ai-session-store.test：vi.resetModules+
 * stubGlobal(window.api) 每用例独立模块图（node 环境——api-client-mock 工厂
 * 禁用面），window.api mock 计数通道（S5 断言 IPC 计数=1）。
 */
import { describe, expect, it, vi } from 'vitest'
import type { PaperDetail } from '../../../src/shared/models/paper'

type Res = { ok: true; data: PaperDetail } | { ok: false; error: { code: string; message: string } }

interface Deferred {
  promise: Promise<Res>
  resolve(v: Res): void
}

function deferred(): Deferred {
  let resolve!: (v: Res) => void
  const promise = new Promise<Res>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

/** 微任务排空（unwrap 链两跳 then——8 tick 富余） */
async function flush(ticks = 8): Promise<void> {
  for (let i = 0; i < ticks; i += 1) {
    await Promise.resolve()
  }
}

/** detail 载荷字面（schema 必填全量——shared 投影） */
function detailOf(id: string, title = `题-${id}`): PaperDetail {
  return {
    id,
    title,
    authors: [`作者-${id}`],
    year: 2024,
    venue: 'Water Res.',
    doi: null,
    tagNames: [],
    annotationCount: 0,
    noteCount: 0,
    lastReadPage: 0,
    addedAt: '2026-01-01T00:00:00Z',
    folderId: '__main__',
    impactFactor: null,
    isStarred: false,
    abstract: `摘要-${id}`,
    arxivId: null,
    source: 'local',
    enrichStatus: 'done',
    fileUrl: `app-file://${id}`,
    fileName: `${id}.pdf`,
    updatedAt: '2026-01-01T00:00:00Z',
    tags: []
  }
}

interface StoreShape {
  entries: Map<string, { status: string; data?: PaperDetail; stale?: boolean }>
  currentPId: string | null
  view: { status: string; data?: PaperDetail; error?: string }
  select(pId: string): void
  retry(pId: string): void
  unmount(): void
  invalidate(pId: string): void
}

interface StoreMod {
  usePaperInfoStore: { getState(): StoreShape }
}

/**
 * 每用例独立模块图+桩 window.api（api/client 模块加载期取 window.api）。
 * st()=zustand 现取快照（状态更新换引用——持旧快照断言必假，ai-session-store
 * 同款形态）。
 */
async function loadStore(): Promise<{ st(): StoreShape; detail: ReturnType<typeof vi.fn> }> {
  vi.resetModules()
  const detail = vi.fn()
  vi.stubGlobal('window', { api: { library: { detail } } })
  const mod = (await import('../../../src/renderer/shared/paperInfoStore')) as unknown as StoreMod
  return { st: () => mod.usePaperInfoStore.getState(), detail }
}

describe('F-UIRES-04 批 3a paperInfoStore —— M1 状态机 S1-S9+LRU', () => {
  it('S1 乱序接受判据：RESOLVE(s1) 恒写缓存但不落 B 选中态；RESOLVE(s2) 才落 ready(B)', async () => {
    const { st, detail } = await loadStore()
    const dA = deferred()
    const dB = deferred()
    detail.mockImplementation((req: { paperId: string }) => (req.paperId === 'A' ? dA.promise : dB.promise))
    st().select('A')
    st().select('B')
    dA.resolve({ ok: true, data: detailOf('A') })
    await flush()
    expect(st().view.status).toBe('loading')
    expect(st().view.data).toBeUndefined()
    expect(st().entries.get('A')?.status).toBe('ready')
    dB.resolve({ ok: true, data: detailOf('B') })
    await flush()
    expect(st().view.status).toBe('ready')
    expect(st().view.data?.id).toBe('B')
    expect(detail).toHaveBeenCalledTimes(2)
  })

  it('S2 RETRY 界：仅 error 态接受；loading 态 RETRY 零效果幂等（单 in-flight）', async () => {
    const { st, detail } = await loadStore()
    detail
      .mockResolvedValueOnce({ ok: false, error: { code: 'NOT_FOUND', message: '查无该文献' } })
      .mockResolvedValueOnce({ ok: true, data: detailOf('A') })
    st().select('A')
    await flush()
    expect(st().view.status).toBe('error')
    st().retry('A')
    expect(st().view.status).toBe('loading')
    st().retry('A')
    expect(detail).toHaveBeenCalledTimes(2)
    await flush()
    expect(st().view.status).toBe('ready')
  })

  it('S3 切换帧零残留：ready(A)→SELECT(B) 展示即清（view 无 A 数据）', async () => {
    const { st, detail } = await loadStore()
    detail.mockResolvedValue({ ok: true, data: detailOf('A') })
    st().select('A')
    await flush()
    expect(st().view.status).toBe('ready')
    detail.mockReturnValueOnce(deferred().promise)
    st().select('B')
    expect(st().view.status).toBe('loading')
    expect(st().view.data).toBeUndefined()
  })

  it('S4 卸载免疫：UNMOUNT 后 RESOLVE 写缓存但零 view 更新；重挂 HIT 缓存驻留', async () => {
    const { st, detail } = await loadStore()
    const dA = deferred()
    detail.mockReturnValueOnce(dA.promise)
    st().select('A')
    st().unmount()
    expect(st().view.status).toBe('idle')
    dA.resolve({ ok: true, data: detailOf('A') })
    await flush()
    expect(st().entries.get('A')?.status).toBe('ready')
    expect(st().view.status).toBe('idle')
    st().select('A')
    expect(st().view.status).toBe('ready')
    expect(st().view.data?.id).toBe('A')
    expect(detail).toHaveBeenCalledTimes(1)
  })

  it('S5 去重：loading(A) 中同 pId 再触发=复用 in-flight（IPC 计数=1）', async () => {
    const { st, detail } = await loadStore()
    detail.mockResolvedValue({ ok: true, data: detailOf('A') })
    st().select('A')
    st().select('A')
    st().select('A')
    await flush()
    expect(detail).toHaveBeenCalledTimes(1)
    expect(st().view.status).toBe('ready')
  })

  it('S6 INVALIDATE：loading 中到达=落缓存即标失效+选中滚动新 seq 重取；完成态=逐出零陈旧 HIT', async () => {
    const { st, detail } = await loadStore()
    const d1 = deferred()
    const d2 = deferred()
    const d3 = deferred()
    detail.mockReturnValueOnce(d1.promise).mockReturnValueOnce(d2.promise).mockReturnValueOnce(d3.promise)
    st().select('A')
    st().invalidate('A')
    d1.resolve({ ok: true, data: detailOf('A') })
    await flush()
    expect(st().entries.get('A')?.status).toBe('loading') // 旧值不落缓存（零陈旧 HIT）——条目=滚动新 seq 重取
    expect(detail).toHaveBeenCalledTimes(2)
    expect(st().view.status).toBe('loading')
    d2.resolve({ ok: true, data: detailOf('A') })
    await flush()
    expect(st().view.status).toBe('ready')
    st().invalidate('A')
    expect(st().entries.get('A')?.status).toBe('loading') // 完成态=逐出+选中立即重取（旧值不驻）
    expect(detail).toHaveBeenCalledTimes(3)
    expect(st().view.status).toBe('loading')
  })

  it('S7 回绑令牌：loading(A,s1)→SELECT(B)→SELECT(A) 复用 s1，RESOLVE(s1) 终态必非 loading', async () => {
    const { st, detail } = await loadStore()
    const dA = deferred()
    const dB = deferred()
    detail.mockImplementation((req: { paperId: string }) => (req.paperId === 'A' ? dA.promise : dB.promise))
    st().select('A')
    st().select('B')
    st().select('A')
    expect(detail).toHaveBeenCalledTimes(2)
    dA.resolve({ ok: true, data: detailOf('A') })
    await flush()
    expect(st().view.status).toBe('ready')
    expect(st().view.data?.id).toBe('A')
    dB.resolve({ ok: true, data: detailOf('B') })
    await flush()
    expect(st().entries.get('B')?.status).toBe('ready')
    expect(st().view.data?.id).toBe('A')
  })

  it('S8 HIT：命中完成态缓存=同步 ready 无闪烁（零 IPC 零 loading 帧）', async () => {
    const { st, detail } = await loadStore()
    detail.mockResolvedValue({ ok: true, data: detailOf('A') })
    st().select('A')
    await flush()
    st().select('A')
    expect(st().view.status).toBe('ready')
    expect(st().view.data?.id).toBe('A')
    expect(detail).toHaveBeenCalledTimes(1)
  })

  it('S9 幂等/维持：ready(A)→SELECT(A) 零迁移；error(A)→SELECT(A) 维持 error（重试钮在）', async () => {
    const { st, detail } = await loadStore()
    detail.mockResolvedValueOnce({ ok: true, data: detailOf('A') })
    st().select('A')
    await flush()
    st().select('A')
    expect(st().view.status).toBe('ready')
    expect(detail).toHaveBeenCalledTimes(1)
    detail.mockResolvedValueOnce({ ok: false, error: { code: 'DB_ERROR', message: '库错误' } })
    st().select('B')
    await flush()
    expect(st().view.status).toBe('error')
    st().select('B')
    expect(st().view.status).toBe('error')
    expect(detail).toHaveBeenCalledTimes(2)
  })

  it('S10 LRU 容量 20：超容淘汰最旧完成态，当前选中与在飞永不淘汰', async () => {
    const { st, detail } = await loadStore()
    detail.mockImplementation((req: { paperId: string }) =>
      Promise.resolve({ ok: true, data: detailOf(req.paperId) })
    )
    for (let i = 1; i <= 20; i += 1) {
      st().select(`p${i}`)
      await flush()
    }
    expect(st().entries.size).toBe(20)
    st().select('p21')
    await flush()
    expect(st().entries.size).toBe(20)
    expect(st().entries.get('p1')).toBeUndefined()
    expect(st().entries.get('p21')?.status).toBe('ready')
  })
})
