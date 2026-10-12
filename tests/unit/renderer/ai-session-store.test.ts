import { describe, expect, it, vi } from 'vitest'
/** 动态导入件的类型面（lint 禁 import() 类型注解——type-only import 消解：
 *  编译期擦除零运行时模块缓存，运行时模块恒经 loadStore 动态取） */
import type { AiSessionStore } from '../../../src/renderer/features/ai/aiSessionStore'


/**
 * [F-DBCAMP-01 DB-2 UI U3] aiSessionStore —— 会话面板态机（always-active 裸
 * describe，K3——不经 guardedDescribe）。
 *
 * 覆盖（票面四轴）：态机（loading→ready 链式 listMessages）/幂等护栏（loading
 * 与 ready 在场不再派发）/竞态丢弃（unload 后旧响应不复活条目）/卸载清 key/
 * 错误码映射（NOT_FOUND→notFound；其余→error）。
 * 配方沿 notes.store.test：vi.resetModules+stubGlobal(window.api) 每用例独立
 * 模块图（node 环境——api-client-mock 工厂禁用面），unwrap 走真实现（ok:false
 * 载荷即真 ApiClientError 抛出路径）。
 */

/** 会话/消息种子形状（shared 投影字面——测试夹具） */
const SESSION = {
  id: 7,
  scope: 'paper',
  anchorId: 'p-1',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z'
} as const

const MESSAGE = {
  id: 11,
  sessionId: 7,
  role: 'assistant',
  content: '你好',
  pinned: false,
  createdAt: '2026-01-01T00:00:01Z'
} as const

interface Deferred<T> {
  promise: Promise<T>
  resolve(v: T): void
}

/** 受控 deferred（竞态序列手工驱动；reject 面不测——ok:false 载荷即错误路径） */
type OpenResult = ReturnType<typeof okSession>

function deferred<T>(): Deferred<T> {
  let resolve!: (v: T) => void
  const promise = new Promise<T>((res) => {
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

interface StoreMod {
  useAiSessionStore: { getState(): AiSessionStore }
  aiSessionKey(scope: 'paper' | 'lineage' | 'global', anchorId: string | null): string
}

async function loadStore(api: unknown): Promise<StoreMod> {
  vi.resetModules()
  vi.stubGlobal('window', { api })
  return (await import('../../../src/renderer/features/ai/aiSessionStore')) as unknown as StoreMod
}

/** ok 回包形状（Result 直写——unwrap 真实现消费） */
function okSession(id = 7) {
  return { ok: true as const, data: { session: { ...SESSION, id } } }
}

describe('F-DBCAMP-01 U3 aiSessionStore —— 态机/幂等/竞态/卸载/错误映射', () => {
  it('态机：open 置 loading→成功落地 sessionId 并链式 listMessages→ready 落消息', async () => {
    const open = vi.fn(async () => okSession())
    const listMessages = vi.fn(async () => ({ ok: true as const, data: { messages: [MESSAGE] } }))
    const mod = await loadStore({ ai_sessions: { open, listMessages } })
    const key = mod.aiSessionKey('paper', 'p-1')
    expect(key).toBe('paper:p-1')

    mod.useAiSessionStore.getState().open('paper', 'p-1')
    expect(mod.useAiSessionStore.getState().panels[key]?.status, '派发即 loading').toBe('loading')
    await flush()

    const entry = mod.useAiSessionStore.getState().panels[key]
    expect(entry?.status, '链式成功→ready').toBe('ready')
    expect(entry?.sessionId).toBe(7)
    expect(entry?.messages).toEqual([MESSAGE])
    expect(open).toHaveBeenCalledWith({ scope: 'paper', anchorId: 'p-1' })
    expect(listMessages).toHaveBeenCalledWith({ sessionId: 7 })
  })

  it('key 口径：global 档 anchorId=null→「global」后缀；不同档互不串扰', async () => {
    const open = vi.fn(async () => okSession(9))
    const listMessages = vi.fn(async () => ({ ok: true as const, data: { messages: [] } }))
    const mod = await loadStore({ ai_sessions: { open, listMessages } })

    expect(mod.aiSessionKey('global', null)).toBe('global:global')
    mod.useAiSessionStore.getState().open('global', null)
    mod.useAiSessionStore.getState().open('paper', 'p-1')
    await flush()
    expect(mod.useAiSessionStore.getState().panels['global:global']?.status).toBe('ready')
    expect(mod.useAiSessionStore.getState().panels['paper:p-1']?.status).toBe('ready')
    expect(open).toHaveBeenCalledTimes(2)
  })

  it('幂等护栏：ready 在场再 open 不派发；loading 在场同样不派发', async () => {
    const open = vi.fn(async () => okSession())
    const listMessages = vi.fn(async () => ({ ok: true as const, data: { messages: [] } }))
    const mod = await loadStore({ ai_sessions: { open, listMessages } })

    mod.useAiSessionStore.getState().open('paper', 'p-1')
    await flush()
    mod.useAiSessionStore.getState().open('paper', 'p-1')
    expect(open, 'ready 幂等').toHaveBeenCalledTimes(1)

    // loading 态（在途 deferred 不 resolve）：二次 open 不派发
    const d = deferred<OpenResult>()
    const open2 = vi.fn(() => d.promise)
    const mod2 = await loadStore({ ai_sessions: { open: open2, listMessages: vi.fn() } })
    mod2.useAiSessionStore.getState().open('paper', 'p-2')
    mod2.useAiSessionStore.getState().open('paper', 'p-2')
    expect(open2, 'loading 幂等').toHaveBeenCalledTimes(1)
  })

  it('卸载清 key：unload 删条目；重挂（再 open）重新派发；在途旧响应被丢弃不复活', async () => {
    const d1 = deferred<OpenResult>()
    const open = vi.fn(() => d1.promise)
    const listMessages = vi.fn(async () => ({ ok: true as const, data: { messages: [] } }))
    const mod = await loadStore({ ai_sessions: { open, listMessages } })
    const key = mod.aiSessionKey('paper', 'p-1')

    mod.useAiSessionStore.getState().open('paper', 'p-1')
    mod.useAiSessionStore.getState().unload(key)
    expect(mod.useAiSessionStore.getState().panels[key], 'unload 即清').toBeUndefined()

    // 重挂：条目已删→重新派发（open 第二次）
    const d2 = deferred<OpenResult>()
    open.mockImplementation(() => d2.promise)
    mod.useAiSessionStore.getState().open('paper', 'p-1')
    expect(open).toHaveBeenCalledTimes(2)

    // 旧响应（d1）晚到：不得把新 loading 覆盖成 ready（seq 守卫丢弃）
    d1.resolve(okSession(7))
    await flush()
    expect(mod.useAiSessionStore.getState().panels[key]?.status, '旧响应丢弃').toBe('loading')

    // 新响应落地：ready+sessionId=8（区分新旧载荷）
    d2.resolve(okSession(8))
    await flush()
    expect(mod.useAiSessionStore.getState().panels[key]?.status).toBe('ready')
    expect(mod.useAiSessionStore.getState().panels[key]?.sessionId).toBe(8)
  })

  it('错误码映射：open NOT_FOUND→notFound；INVALID_REQUEST→error；网络异常（非 Result）→error', async () => {
    const cases = [
      { resp: { ok: false as const, error: { code: 'NOT_FOUND', message: '锚不存在' } }, want: 'notFound' },
      { resp: { ok: false as const, error: { code: 'INVALID_REQUEST', message: '矩阵拒' } }, want: 'error' }
    ]
    for (const c of cases) {
      const open = vi.fn(async () => c.resp)
      const mod = await loadStore({ ai_sessions: { open, listMessages: vi.fn() } })
      mod.useAiSessionStore.getState().open('paper', 'p-1')
      await flush()
      expect(mod.useAiSessionStore.getState().panels['paper:p-1']?.status).toBe(c.want)
    }
    // 网络异常：api 调用本身 reject（非 Result 形状）→ error（不区分 code）
    const open3 = vi.fn(() => Promise.reject(new Error('net down')))
    const mod3 = await loadStore({ ai_sessions: { open: open3, listMessages: vi.fn() } })
    mod3.useAiSessionStore.getState().open('global', null)
    await flush()
    expect(mod3.useAiSessionStore.getState().panels['global:global']?.status).toBe('error')
  })

  it('notFound/error 态可重派：面板重挂（mount→open）允许重试（护栏只锁 loading/ready）', async () => {
    let call = 0
    const open = vi.fn(async () => {
      call += 1
      return call === 1
        ? { ok: false as const, error: { code: 'NOT_FOUND', message: 'x' } }
        : okSession(5)
    })
    const listMessages = vi.fn(async () => ({ ok: true as const, data: { messages: [] } }))
    const mod = await loadStore({ ai_sessions: { open, listMessages } })

    mod.useAiSessionStore.getState().open('paper', 'p-1')
    await flush()
    expect(mod.useAiSessionStore.getState().panels['paper:p-1']?.status).toBe('notFound')
    mod.useAiSessionStore.getState().open('paper', 'p-1')
    await flush()
    expect(mod.useAiSessionStore.getState().panels['paper:p-1']?.status, '错误态重挂可重试').toBe('ready')
    expect(open).toHaveBeenCalledTimes(2)
  })

  it('[r1′ R3a] listMessages 链失败映射（统一口径行为现状锁定）：NOT_FOUND→notFound', async () => {
    const open = vi.fn(async () => okSession())
    const listMessages = vi.fn(async () => ({
      ok: false as const,
      error: { code: 'NOT_FOUND', message: '会话已灭' }
    }))
    const mod = await loadStore({ ai_sessions: { open, listMessages } })

    mod.useAiSessionStore.getState().open('paper', 'p-1')
    await flush()
    expect(open).toHaveBeenCalledTimes(1)
    expect(listMessages).toHaveBeenCalledWith({ sessionId: 7 })
    expect(mod.useAiSessionStore.getState().panels['paper:p-1']?.status, '链上 NOT_FOUND 同映射').toBe('notFound')
  })

  it('[r1′ R3a] listMessages 链失败映射：网络错（非 NOT_FOUND）→error', async () => {
    const open = vi.fn(async () => okSession())
    const listMessages = vi.fn(() => Promise.reject(new Error('net down')))
    const mod = await loadStore({ ai_sessions: { open, listMessages } })

    mod.useAiSessionStore.getState().open('lineage', 'folder-1')
    await flush()
    expect(mod.useAiSessionStore.getState().panels['lineage:folder-1']?.status, '链上其余错同映射').toBe('error')
  })

  it('[r1′ R3b] error 态可重派：INVALID_REQUEST 后重挂重试成功→ready（对偶第 6 用例 notFound 侧）', async () => {
    let call = 0
    const open = vi.fn(async () => {
      call += 1
      return call === 1
        ? { ok: false as const, error: { code: 'INVALID_REQUEST', message: '矩阵拒' } }
        : okSession(6)
    })
    const listMessages = vi.fn(async () => ({ ok: true as const, data: { messages: [] } }))
    const mod = await loadStore({ ai_sessions: { open, listMessages } })

    mod.useAiSessionStore.getState().open('global', null)
    await flush()
    expect(mod.useAiSessionStore.getState().panels['global:global']?.status).toBe('error')
    mod.useAiSessionStore.getState().open('global', null)
    await flush()
    expect(mod.useAiSessionStore.getState().panels['global:global']?.status, 'error 态重挂同样可重试').toBe('ready')
    expect(mod.useAiSessionStore.getState().panels['global:global']?.sessionId).toBe(6)
    expect(open).toHaveBeenCalledTimes(2)
  })

  it('[r1″ R5] 第二道 stale-guard：listMessages 在途晚到不复活已删条目、不污染重挂新链；open 已落地而消息未到=loading 中间态', async () => {
    // 受控 deferred：三链 open（d1/d2/d3）+ 前两链 listMessages（lm1/lm2 在途可控，
    // 第三链即时空回包）——mock 按调用次数切换（沿 open 切换手法）
    type MsgResult = { ok: true; data: { messages: (typeof MESSAGE)[] } }
    const d1 = deferred<OpenResult>()
    const d2 = deferred<OpenResult>()
    const d3 = deferred<OpenResult>()
    const lm1 = deferred<MsgResult>()
    const lm2 = deferred<MsgResult>()
    let openCall = 0
    let lmCall = 0
    const open = vi.fn(() => {
      openCall += 1
      return openCall === 1 ? d1.promise : openCall === 2 ? d2.promise : d3.promise
    })
    const listMessages = vi.fn((): Promise<MsgResult> => {
      lmCall += 1
      if (lmCall === 1) return lm1.promise
      if (lmCall === 2) return lm2.promise
      return Promise.resolve({ ok: true, data: { messages: [] } })
    })
    const mod = await loadStore({ ai_sessions: { open, listMessages } })
    const key = mod.aiSessionKey('paper', 'p-1')

    // ③中间态：open 已落地（d1→sessionId 7）而消息未到（lm1 在途）——loading 可分辨
    mod.useAiSessionStore.getState().open('paper', 'p-1')
    d1.resolve(okSession(7))
    await flush()
    expect(listMessages, 'open 落地后链式派发 listMessages').toHaveBeenCalledTimes(1)
    expect(listMessages).toHaveBeenCalledWith({ sessionId: 7 })
    expect(mod.useAiSessionStore.getState().panels[key]?.status, 'open 已落地、消息未到=loading 中间态').toBe('loading')

    // ①不复活：unload 删条目+自增序号；旧 lm1 晚到不得重建条目（第二道守卫红路径）
    mod.useAiSessionStore.getState().unload(key)
    expect(mod.useAiSessionStore.getState().panels[key], 'unload 即清').toBeUndefined()
    lm1.resolve({ ok: true, data: { messages: [MESSAGE] } })
    await flush()
    expect(mod.useAiSessionStore.getState().panels[key], '旧 listMessages 晚到不复活已删条目').toBeUndefined()

    // ②不污染新链：重挂（第 2 链）落地其 open→lm2 在途→再卸载→再重挂（第 3 链
    // loading）→旧 lm2 晚到不得污染（再构造一次旧链——同手法第二次）
    mod.useAiSessionStore.getState().open('paper', 'p-1')
    d2.resolve(okSession(8))
    await flush()
    expect(mod.useAiSessionStore.getState().panels[key]?.status, '第二链消息未到=loading').toBe('loading')
    mod.useAiSessionStore.getState().unload(key)
    mod.useAiSessionStore.getState().open('paper', 'p-1')
    expect(mod.useAiSessionStore.getState().panels[key]?.status, '第三链重挂=loading').toBe('loading')
    lm2.resolve({ ok: true, data: { messages: [MESSAGE] } })
    await flush()
    expect(mod.useAiSessionStore.getState().panels[key]?.status, '旧 listMessages 晚到不污染新链').toBe('loading')
    expect(mod.useAiSessionStore.getState().panels[key]?.sessionId, 'sessionId 未被旧链改写').toBeNull()

    // 第 3 链落地：ready+sessionId=9+空消息（新载荷，与旧 7/8 区分——旧载荷零泄漏）
    d3.resolve(okSession(9))
    await flush()
    expect(mod.useAiSessionStore.getState().panels[key]?.status, '新链最终落地=ready').toBe('ready')
    expect(mod.useAiSessionStore.getState().panels[key]?.sessionId, 'sessionId=第 3 链新值').toBe(9)
    expect(mod.useAiSessionStore.getState().panels[key]?.messages, '消息面=第 3 链空回包（旧消息零泄漏）').toEqual([])
    expect(open, 'open 恰 3 次（首链+两度重挂）').toHaveBeenCalledTimes(3)
    expect(listMessages, 'listMessages 恰 3 次（每链各一跳）').toHaveBeenCalledTimes(3)
  })
})
