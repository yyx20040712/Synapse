import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  backoffDelayMs,
  createReadingTimeOutbox,
  OUTBOX_BACKOFF_CAP_MS,
  OUTBOX_DEAD_LETTER_MAX,
  OUTBOX_MAX_ATTEMPTS,
  type OutboxEntry,
  type OutboxStore
} from '../../../src/renderer/features/reader/time/reading-time-outbox'
import {
  createLocalStorageOutboxStore,
  OUTBOX_ENTRY_KEY_PREFIX,
  OUTBOX_META_KEY
} from '../../../src/renderer/features/reader/time/reading-time-outbox-store'

/**
 * P7X-02：reading-time-outbox 持久落盘队列锁定测试（终裁版设计书 §3 态空间
 * 逐格+§4 接口草图）。覆盖：T1~T6 迁移+排空闸门+队头阻塞越序拒绝+attempts
 * 拦停+死信 50 上限+dispose 不变量④+localStorage 适配器（每条目独立 key）。
 * 时间/定时器/store 全注入（禁真 timer——reading-time.test 同法）；
 * always-active（三屋纪律不经 guardedDescribe）。
 */

/** 微任务冲刷（resolve→then→链式 pump 的多级微任务链走完） */
async function tick(): Promise<void> {
  for (let i = 0; i < 8; i++) await Promise.resolve()
}

/** 内存 store 桩（存取双副本隔离——快照断言不被镜像变更污染） */
function makeMapStore(seed: OutboxEntry[] = []): OutboxStore & { data: Map<string, OutboxEntry> } {
  const data = new Map(seed.map((e) => [e.id, { ...e }]))
  return {
    data,
    loadAll: () => [...data.values()].map((e) => ({ ...e })),
    put: (e) => data.set(e.id, { ...e }),
    update: (e) => data.set(e.id, { ...e }),
    remove: (id) => data.delete(id)
  }
}

/** 全注入测试台：send 悬停可控（resolve/reject 手动驱动）、时钟可推 */
function makeHarness(opts: { seed?: OutboxEntry[]; store?: OutboxStore } = {}) {
  const store = opts.store ?? makeMapStore(opts.seed ?? [])
  let nowMs = 0
  const warns: Array<{ message: string; kind: 'info' | 'error' }> = []
  const sendCalls: Array<{ paperId: string; page: number; secondsDelta: number; statesAtSend: OutboxEntry[] }> = []
  const flight: Array<{ resolve(): void; reject(err: Error): void }> = []
  /** send 时刻 store 快照（抛错 store 容错——退化面快照为空） */
  const snapStore = (): OutboxEntry[] => {
    try {
      return store.loadAll().map((e) => ({ ...e }))
    } catch {
      return []
    }
  }
  const ob = createReadingTimeOutbox({
    store,
    send: (paperId, page, secondsDelta) => {
      sendCalls.push({ paperId, page, secondsDelta, statesAtSend: snapStore() })
      return new Promise<void>((resolve, reject) => {
        flight.push({ resolve, reject })
      })
    },
    now: () => nowMs,
    timers: {
      setTimeout: (fn, ms) => setTimeout(fn, ms),
      clearTimeout: (h) => clearTimeout(h as ReturnType<typeof setTimeout>)
    },
    onWarn: (message, kind) => {
      warns.push({ message, kind })
    }
  })
  return {
    ob,
    store,
    warns,
    sendCalls,
    flight,
    advance(ms: number): void {
      nowMs += ms
      vi.advanceTimersByTime(ms)
    },
    entry(id: string): OutboxEntry | undefined {
      return store.loadAll().find((e) => e.id === id)
    },
    draft(id: string, paperId: string, page: number | undefined, seconds: number, seq: number) {
      return { id, paperId, page, seconds, seq, createdAt: nowMs }
    }
  }
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('reading-time-outbox 态空间 T1~T6（时间/定时器/store 全注入）', () => {
  it('T1：enqueue 先落 store 为 pending（attempts=0）——队头阻塞时驻留不派发', () => {
    const h = makeHarness()
    h.ob.enqueue(h.draft('ob-1', 'p-1', 3, 45, 1))
    h.ob.enqueue(h.draft('ob-2', 'p-1', 4, 30, 2))
    const persisted = h.entry('ob-2')
    expect(persisted?.state).toBe('pending')
    expect(persisted?.attempts).toBe(0)
    expect(h.sendCalls).toHaveLength(1)
  })

  it('T2（CO-3）：send 时刻 store 快照已持久化 in-flight（先持久化再发 invoke）', () => {
    const h = makeHarness()
    h.ob.enqueue(h.draft('ob-1', 'p-1', 3, 45, 1))
    const atSend = h.sendCalls[0]?.statesAtSend.find((e) => e.id === 'ob-1')
    expect(atSend?.state).toBe('in-flight')
  })

  it('T2 队头阻塞（CR-1）：同 paper 仅队头 in-flight——seq2/3 不得越序派发', async () => {
    const h = makeHarness()
    h.ob.enqueue(h.draft('ob-1', 'p-1', 1, 11, 1))
    h.ob.enqueue(h.draft('ob-2', 'p-1', 2, 22, 2))
    h.ob.enqueue(h.draft('ob-3', 'p-1', 3, 33, 3))
    expect(h.sendCalls).toHaveLength(1)
    expect(h.sendCalls[0]?.secondsDelta).toBe(11)
    h.flight[0]?.resolve()
    await tick()
    expect(h.sendCalls).toHaveLength(2)
    expect(h.sendCalls[1]?.secondsDelta).toBe(22)
    h.flight[1]?.resolve()
    await tick()
    expect(h.sendCalls).toHaveLength(3)
    expect(h.sendCalls[2]?.secondsDelta).toBe(33)
  })

  it('T2 跨 paper 并行（CO-2）：一次 pump 双 paper 各派发一条', () => {
    const h = makeHarness()
    h.ob.enqueue(h.draft('ob-1', 'p-a', 1, 11, 1))
    h.ob.enqueue(h.draft('ob-2', 'p-b', 1, 22, 2))
    expect(h.sendCalls).toHaveLength(2)
  })

  it('T3：send resolve→立即 remove（无 tombstone）+链式派发同 paper 次条', async () => {
    const h = makeHarness()
    h.ob.enqueue(h.draft('ob-1', 'p-1', 1, 11, 1))
    h.ob.enqueue(h.draft('ob-2', 'p-1', 2, 22, 2))
    h.flight[0]?.resolve()
    await tick()
    expect(h.entry('ob-1')).toBeUndefined()
    expect(h.sendCalls).toHaveLength(2)
  })

  it('T4：reject→attempts++/回 pending/lastError 记录+队头保持（新 seq 不越序）', async () => {
    const h = makeHarness()
    h.ob.enqueue(h.draft('ob-1', 'p-1', 1, 11, 1))
    h.ob.enqueue(h.draft('ob-2', 'p-1', 2, 22, 2))
    h.flight[0]?.reject(new Error('db busy'))
    await tick()
    const e1 = h.entry('ob-1')
    expect(e1?.state).toBe('pending')
    expect(e1?.attempts).toBe(1)
    expect(e1?.lastError).toBe('db busy')
    expect(h.sendCalls).toHaveLength(1)
    h.advance(1000)
    expect(h.sendCalls).toHaveLength(2)
    expect(h.sendCalls[1]?.secondsDelta).toBe(11)
  })

  it('T4 指数退避（共享计时器）：1s→2s 序列（999ms 不重试/满期重试）', async () => {
    const h = makeHarness()
    h.ob.enqueue(h.draft('ob-1', 'p-1', 1, 11, 1))
    h.flight[0]?.reject(new Error('fail-1'))
    await tick()
    h.advance(999)
    expect(h.sendCalls).toHaveLength(1)
    h.advance(1)
    expect(h.sendCalls).toHaveLength(2)
    h.flight[1]?.reject(new Error('fail-2'))
    await tick()
    h.advance(1999)
    expect(h.sendCalls).toHaveLength(2)
    h.advance(1)
    expect(h.sendCalls).toHaveLength(3)
  })

  it('T4 共享退避闸门：任一失败后退避窗内新条目不派发（共享计时器自裁语义）', async () => {
    const h = makeHarness()
    h.ob.enqueue(h.draft('ob-1', 'p-a', 1, 11, 1))
    h.flight[0]?.reject(new Error('fail'))
    await tick()
    h.ob.enqueue(h.draft('ob-2', 'p-b', 1, 22, 2))
    expect(h.sendCalls).toHaveLength(1)
    h.advance(1000)
    expect(h.sendCalls).toHaveLength(3)
    expect(h.sendCalls.filter((c) => c.secondsDelta === 11)).toHaveLength(2)
  })

  it('T5：启动恢复驻留 in-flight→attempts++ 后按未达重放', async () => {
    const residue: OutboxEntry = {
      id: 'ob-9',
      paperId: 'p-1',
      page: 4,
      seconds: 90,
      seq: 9,
      attempts: 1,
      state: 'in-flight',
      createdAt: 100
    }
    const h = makeHarness({ seed: [residue] })
    const p = h.ob.replayOnStart()
    await tick()
    expect(h.sendCalls).toHaveLength(1)
    expect(h.sendCalls[0]?.secondsDelta).toBe(90)
    expect(h.entry('ob-9')?.attempts).toBe(2)
    h.flight[0]?.resolve()
    await tick()
    await p
    expect(h.entry('ob-9')).toBeUndefined()
  })

  it('T5×T6：恢复时 attempts≥N→死信+WARN（不重放）', async () => {
    const residue: OutboxEntry = {
      id: 'ob-9',
      paperId: 'p-1',
      page: 4,
      seconds: 90,
      seq: 9,
      attempts: OUTBOX_MAX_ATTEMPTS - 1,
      state: 'in-flight',
      createdAt: 100
    }
    const h = makeHarness({ seed: [residue] })
    await h.ob.replayOnStart()
    expect(h.sendCalls).toHaveLength(0)
    expect(h.entry('ob-9')?.state).toBe('dead-letter')
    expect(h.warns).toHaveLength(1)
    expect(h.warns[0]?.kind).toBe('error')
  })

  it('T6：运行期反复失败 N=5 次→死信留驻+onWarn+不再派发', async () => {
    const h = makeHarness()
    h.ob.enqueue(h.draft('ob-1', 'p-1', 1, 11, 1))
    for (let round = 1; round <= OUTBOX_MAX_ATTEMPTS; round++) {
      h.flight[round - 1]?.reject(new Error(`fail-${round}`))
      await tick()
      if (round < OUTBOX_MAX_ATTEMPTS) h.advance(backoffDelayMs(round))
    }
    expect(h.sendCalls).toHaveLength(OUTBOX_MAX_ATTEMPTS)
    expect(h.entry('ob-1')?.state).toBe('dead-letter')
    expect(h.warns).toHaveLength(1)
    expect(h.warns[0]?.kind).toBe('error')
    h.advance(OUTBOX_BACKOFF_CAP_MS)
    expect(h.sendCalls).toHaveLength(OUTBOX_MAX_ATTEMPTS)
  })

  it('T6 死信=终态不阻塞同 paper 新 seq（CR-1：仅未决条目阻塞）', async () => {
    const residue: OutboxEntry = {
      id: 'ob-1',
      paperId: 'p-1',
      page: 1,
      seconds: 11,
      seq: 1,
      attempts: OUTBOX_MAX_ATTEMPTS - 1,
      state: 'pending',
      createdAt: 100
    }
    const h = makeHarness({ seed: [residue] })
    h.ob.pump()
    expect(h.sendCalls).toHaveLength(1)
    h.flight[0]?.reject(new Error('fatal'))
    await tick()
    expect(h.entry('ob-1')?.state).toBe('dead-letter')
    h.ob.enqueue(h.draft('ob-2', 'p-1', 2, 22, 2))
    expect(h.sendCalls).toHaveLength(2)
    expect(h.sendCalls[1]?.secondsDelta).toBe(22)
  })

  it('T6 死信留驻上限 50：超限逐最老淘汰+WARN（info）', async () => {
    const seed: OutboxEntry[] = Array.from({ length: OUTBOX_DEAD_LETTER_MAX + 1 }, (_, i) => ({
      id: `ob-d${i}`,
      paperId: 'p-1',
      page: 1,
      seconds: 5,
      seq: i + 1,
      attempts: OUTBOX_MAX_ATTEMPTS,
      state: 'dead-letter',
      createdAt: 1000 + i
    }))
    const h = makeHarness({ seed })
    await h.ob.replayOnStart()
    const dead = h.store.loadAll().filter((e) => e.state === 'dead-letter')
    expect(dead).toHaveLength(OUTBOX_DEAD_LETTER_MAX)
    expect(h.entry('ob-d0')).toBeUndefined()
    expect(h.entry(`ob-d${OUTBOX_DEAD_LETTER_MAX}`)).toBeDefined()
    expect(h.warns.some((w) => w.kind === 'info')).toBe(true)
  })

  it('排空闸门：replayOnStart resolve 前新 enqueue 只入队不派发（seq 续增）', async () => {
    const old: OutboxEntry = {
      id: 'ob-1',
      paperId: 'p-1',
      page: 2,
      seconds: 120,
      seq: 1,
      attempts: 0,
      state: 'pending',
      createdAt: 100
    }
    const h = makeHarness({ seed: [old] })
    const p = h.ob.replayOnStart()
    await tick()
    expect(h.sendCalls).toHaveLength(1)
    expect(h.sendCalls[0]?.secondsDelta).toBe(120)
    h.ob.enqueue(h.draft('ob-2', 'p-1', 3, 77, 2))
    await tick()
    expect(h.sendCalls).toHaveLength(1)
    h.flight[0]?.resolve()
    await tick()
    await p
    expect(h.sendCalls).toHaveLength(2)
    expect(h.sendCalls[1]?.secondsDelta).toBe(77)
  })

  it('排空闸门时间语义（回炉 W2）：回放期新 enqueue 不论 seq 一律不派发；resolve 后派发', async () => {
    const old: OutboxEntry = {
      id: 'ob-old',
      paperId: 'p-1',
      page: 2,
      seconds: 120,
      seq: 5,
      attempts: 0,
      state: 'pending',
      createdAt: 100
    }
    const h = makeHarness({ seed: [old] })
    const p = h.ob.replayOnStart()
    await tick()
    expect(h.sendCalls).toHaveLength(1)
    // 新条目携带小 seq（seq 阈值语义会误放行——铸造单调被破坏的稳健性面）
    h.ob.enqueue(h.draft('ob-new', 'p-1', 3, 77, 1))
    await tick()
    expect(h.sendCalls).toHaveLength(1)
    h.flight[0]?.resolve()
    await tick()
    await p
    expect(h.sendCalls).toHaveLength(2)
    expect(h.sendCalls[1]?.secondsDelta).toBe(77)
  })

  it('replayOnStart 幂等：重复调用返回同一 promise；空 store 立即 resolve', async () => {
    const h = makeHarness()
    const p1 = h.ob.replayOnStart()
    const p2 = h.ob.replayOnStart()
    expect(p1).toBe(p2)
    await p1
  })

  it('dispose 不变量④：停扫描但已发 invoke 回调仍更新 store', async () => {
    const h = makeHarness()
    h.ob.enqueue(h.draft('ob-1', 'p-1', 1, 11, 1))
    h.ob.dispose()
    h.ob.enqueue(h.draft('ob-2', 'p-1', 2, 22, 2))
    expect(h.sendCalls).toHaveLength(1)
    h.flight[0]?.resolve()
    await tick()
    expect(h.entry('ob-1')).toBeUndefined()
    expect(h.entry('ob-2')).toBeDefined()
  })

  it('dispose 停退避计时器：reject 后 dispose→满期不再重试', async () => {
    const h = makeHarness()
    h.ob.enqueue(h.draft('ob-1', 'p-1', 1, 11, 1))
    h.flight[0]?.reject(new Error('fail'))
    await tick()
    h.ob.dispose()
    h.advance(OUTBOX_BACKOFF_CAP_MS)
    expect(h.sendCalls).toHaveLength(1)
  })

  it('enqueue 恒不抛：store put 抛错→退化内存重试+强 WARN', () => {
    const throwing: OutboxStore = {
      loadAll: () => [],
      put: () => {
        throw new Error('quota')
      },
      update: () => {
        throw new Error('quota')
      },
      remove: () => {
        throw new Error('quota')
      }
    }
    const h = makeHarness({ store: throwing })
    expect(() => h.ob.enqueue(h.draft('ob-1', 'p-1', 1, 11, 1))).not.toThrow()
    expect(h.sendCalls).toHaveLength(1)
    expect(h.warns).toHaveLength(1)
    expect(h.warns[0]?.kind).toBe('error')
  })

  it('loadAll 抛错→空内存态启动+强 WARN（旧账不可达诚实申报）', async () => {
    const throwing: OutboxStore = {
      loadAll: () => {
        throw new Error('corrupt')
      },
      put: () => undefined,
      update: () => undefined,
      remove: () => undefined
    }
    const h = makeHarness({ store: throwing })
    await h.ob.replayOnStart()
    expect(h.warns).toHaveLength(1)
    h.ob.enqueue(h.draft('ob-1', 'p-1', 1, 11, 1))
    expect(h.sendCalls).toHaveLength(1)
  })
})

describe('OutboxStore localStorage 适配器（CO-1 每条目独立 key+元信息 key）', () => {
  /** Storage 形状桩（node 环境） */
  function makeLs(): Storage {
    const m = new Map<string, string>()
    return {
      get length(): number {
        return m.size
      },
      key: (i) => [...m.keys()][i] ?? null,
      getItem: (k) => m.get(k) ?? null,
      setItem: (k, v) => {
        m.set(k, v)
      },
      removeItem: (k) => {
        m.delete(k)
      },
      clear: () => m.clear()
    } as Storage
  }

  const e1: OutboxEntry = {
    id: 'ob-1',
    paperId: 'p-1',
    page: 3,
    seconds: 45,
    seq: 1,
    attempts: 0,
    state: 'pending',
    createdAt: 123
  }

  it('put/loadAll 往返+独立 key（禁整表 JSON 重写）+meta 首写', () => {
    const ls = makeLs()
    const store = createLocalStorageOutboxStore(ls)
    store.put(e1)
    store.put({ ...e1, id: 'ob-2', seq: 2 })
    expect(ls.length).toBe(3)
    expect(ls.getItem(OUTBOX_META_KEY)).toBe('{"v":1}')
    expect(ls.getItem(OUTBOX_ENTRY_KEY_PREFIX + 'ob-1')).toBe(JSON.stringify(e1))
    expect(store.loadAll()).toEqual([e1, { ...e1, id: 'ob-2', seq: 2 }])
  })

  it('update/remove：同 key 覆写/删除', () => {
    const ls = makeLs()
    const store = createLocalStorageOutboxStore(ls)
    store.put(e1)
    store.update({ ...e1, state: 'in-flight', attempts: 1 })
    expect(store.loadAll()[0]?.state).toBe('in-flight')
    store.remove('ob-1')
    expect(store.loadAll()).toHaveLength(0)
    expect(ls.getItem(OUTBOX_ENTRY_KEY_PREFIX + 'ob-1')).toBeNull()
  })

  it('损坏条目丢弃+onCorrupt+自清（key 移除）', () => {
    const ls = makeLs()
    const corrupt: string[] = []
    const store = createLocalStorageOutboxStore(ls, {
      onCorrupt: (message) => {
        corrupt.push(message)
      }
    })
    ls.setItem(OUTBOX_ENTRY_KEY_PREFIX + 'bad', '{oops')
    ls.setItem(OUTBOX_ENTRY_KEY_PREFIX + 'shapewrong', JSON.stringify({ id: 'x' }))
    expect(store.loadAll()).toHaveLength(0)
    expect(ls.getItem(OUTBOX_ENTRY_KEY_PREFIX + 'bad')).toBeNull()
    expect(ls.getItem(OUTBOX_ENTRY_KEY_PREFIX + 'shapewrong')).toBeNull()
    expect(corrupt).toHaveLength(2)
  })
})

describe('backoffDelayMs 纯函数（指数+5min 上界）', () => {
  it('attempts 1..3 与上界夹取', () => {
    expect(backoffDelayMs(1)).toBe(1000)
    expect(backoffDelayMs(2)).toBe(2000)
    expect(backoffDelayMs(3)).toBe(4000)
    expect(backoffDelayMs(9)).toBe(256_000)
    expect(backoffDelayMs(10)).toBe(OUTBOX_BACKOFF_CAP_MS)
    expect(backoffDelayMs(99)).toBe(OUTBOX_BACKOFF_CAP_MS)
  })
})
