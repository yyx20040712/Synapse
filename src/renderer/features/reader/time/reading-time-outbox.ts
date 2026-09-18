/**
 * [P7X-02] reading-time-outbox —— 阅读时长/进度落盘持久 outbox（终裁版设计书
 * docs/design/2026-09-04_p7x02-reading-time-outbox.md 全量落地）。
 *
 * ── 行为层（态空间表逐格）──
 * | # | 迁移 | 触发 | 断言 |
 * | T1 | ∅→pending | enqueue（三收尾口：复合 flusher/onFlush 兜底/sp.dispose 页码） | 先同步落 store 后入调度（写前日志序）；seconds≤3600 由 chunkSeconds 单源保证 |
 * | T2 | pending→in-flight | pump 取 per-paper 队头（最小 seq 未决条目） | 先持久化 in-flight 态再发 invoke（CO-3）；同 paper 至多一条 in-flight 且为队头（CR-1 队头阻塞）；跨 paper 并行（CO-2） |
 * | T3 | in-flight→done | send resolve | 立即 remove（无 tombstone） |
 * | T4 | in-flight→pending | send reject/同步抛错 | attempts++；指数退避（共享计时器，上界 5min）；队头保持不越序 |
 * | T5 | in-flight→pending | replayOnStart 发现驻留 in-flight（崩溃/ack 未达） | attempts++（CR-2 at-least-once：崩溃循环受 N 拦停）；attempts≥N→T6 |
 * | T6 | pending→dead-letter | attempts≥N（N=5） | 留驻+onWarn；不自动重放（T7 已取消）；留驻上限 50 逐老淘汰 |
 * | — | 排空闸门 | replayOnStart resolve 前 | 新 enqueue 只入队不派发（时间语义——回放期新条目不论 seq；回炉 W2） |
 *
 * 不变量（四条）：①store 任一时刻可序列化复原（同步写，每条目独立 key）；
 * ②单 paper 派发序=seq 严格升序（队头阻塞保证）；③outbox 永不回写 ledger
 * （时长账本唯一宿主仍=reading-time.ts ledger）；④dispose 停扫描不停已发
 * invoke 回调（进程未死→回调照常更新 store；进程死→下次启动 T5 接管）。
 *
 * ── 接口层 ── 纯 TS 可单测：store/send/now/timers/onWarn 全注入（禁真
 * timer，reading-time.ts 同法）；id/seq/createdAt 由装配面唯一铸造（seq 全局
 * 续增单源→id=ob-<seq> 跨会话唯一），本模块只按 seq 定序不生成序。
 * localStorage 退化（设计 §7.5）：任一 store 操作抛错→内存重试+强 WARN
 * （F3/F5 失效面诚实申报）；适配器（每条目独立 key+损坏自清）拆驻
 * reading-time-outbox-store.ts（两职责两文件）。
 * 共享退避=单闸门语义（任一失败后退避窗内全部派发暂停——CO-2 共享计时器
 * 的最简可测实现，自裁申报）。
 */
/** 队列条目（设计 §3：跨重启持久的最小账目） */
export interface OutboxEntry {
  id: string
  paperId: string
  page?: number
  seconds: number
  seq: number
  attempts: number
  state: 'pending' | 'in-flight' | 'dead-letter'
  createdAt: number
  lastError?: string
}

/** 持久面（localStorage 适配：每条目独立 key+元信息 key——CO-1 禁整表重写） */
export interface OutboxStore {
  loadAll(): OutboxEntry[]
  put(e: OutboxEntry): void
  update(e: OutboxEntry): void
  remove(id: string): void
}

export interface ReadingTimeOutbox {
  /** T1：三收尾口决意发送的条目入队（先落 store 后入调度） */
  enqueue(e: Omit<OutboxEntry, 'state' | 'attempts'>): void
  /** T2 驱动：per-paper 队头、跨 paper 并行、共享退避闸门 */
  pump(): void
  /** T5 恢复+按序排空；resolve 前排空闸门不开（新 enqueue 只入队） */
  replayOnStart(): Promise<void>
  /** 停扫描不停已发回调（CO-3 不变量④） */
  dispose(): void
}

export interface OutboxTimers {
  setTimeout(fn: () => void, ms: number): unknown
  clearTimeout(handle: unknown): void
}

export interface OutboxDeps {
  store: OutboxStore
  /** 发送依赖（=装配面 saveProgress 原签名注入——单通道不变零新 IPC） */
  send(paperId: string, page: number, secondsDelta: number): void | Promise<void>
  now(): number
  timers: OutboxTimers
  /** WARN 单通道（装配接 toast：死信/退化=error，淘汰=info） */
  onWarn(message: string, kind: 'info' | 'error'): void
}

/** attempts 拦停上限（T6：N=5） */
export const OUTBOX_MAX_ATTEMPTS = 5
/** 死信留驻上限（CO-1：超限逐最老淘汰） */
export const OUTBOX_DEAD_LETTER_MAX = 50
export const OUTBOX_BACKOFF_BASE_MS = 1_000
export const OUTBOX_BACKOFF_CAP_MS = 300_000

/** 指数退避纯函数（共享计时器消费：2^(attempts-1) 秒，上界 5min） */
export function backoffDelayMs(attempts: number): number {
  const exp = OUTBOX_BACKOFF_BASE_MS * Math.pow(2, Math.max(1, attempts) - 1)
  return Math.min(exp, OUTBOX_BACKOFF_CAP_MS)
}

export function createReadingTimeOutbox(deps: OutboxDeps): ReadingTimeOutbox {
  /** 内存镜像（dispatch 定序源；store=同步落盘投影） */
  const mirror = new Map<string, OutboxEntry>()
  let degraded = false
  let disposed = false
  /** 排空闸门（时间语义——回炉 W2）：replaying 期间非旧集合条目一律不派发（回放期
   *  新 enqueue 不论 seq 只入队；seq 阈值语义对非单调载荷误放行=页码序前提击穿） */
  let replaying = false
  let oldIds: Set<string> = new Set() // 旧集合=回放开始镜像 id 快照
  let retryAt: number | null = null
  let timer: unknown = null
  let timerFor: number | null = null
  let active = 0
  let replayPromise: Promise<void> | null = null
  const waiters: Array<() => void> = []

  const warn = (message: string, kind: 'info' | 'error'): void => {
    deps.onWarn(message, kind)
  }
  /** localStorage 退化（一次性强 WARN；此后镜像内存重试——§7.5 诚实申报） */
  const degrade = (): void => {
    if (degraded) return
    degraded = true
    warn('本地进度缓存不可用，改为仅内存重试（重启后未落账数据将丢失）', 'error')
  }
  const storePut = (e: OutboxEntry): void => {
    if (degraded) return
    try {
      deps.store.put(e)
    } catch {
      degrade()
    }
  }
  const storeUpdate = (e: OutboxEntry): void => {
    if (degraded) return
    try {
      deps.store.update(e)
    } catch {
      degrade()
    }
  }
  const storeRemove = (id: string): void => {
    if (degraded) return
    try {
      deps.store.remove(id)
    } catch {
      degrade()
    }
  }
  try {
    for (const e of deps.store.loadAll()) mirror.set(e.id, { ...e })
  } catch {
    degrade()
  }

  const wake = (): void => {
    const ws = waiters.splice(0)
    for (const w of ws) w()
  }
  const onFire = (): void => {
    timer = null
    timerFor = null
    retryAt = null
    wake()
    pump()
  }
  /** 共享退避：取最早到期目标（多失败取 min；单 timer 无 per-entry 计时） */
  const armBackoff = (attempts: number): void => {
    const target = deps.now() + backoffDelayMs(attempts)
    if (retryAt === null || target < retryAt) retryAt = target
    if (timerFor !== null && retryAt >= timerFor) return
    if (timer !== null) deps.timers.clearTimeout(timer)
    timer = deps.timers.setTimeout(onFire, Math.max(0, retryAt - deps.now()))
    timerFor = retryAt
  }
  const toDeadLetter = (e: OutboxEntry): void => {
    e.state = 'dead-letter'
    storeUpdate(e)
    warn('阅读进度落盘连续失败已达上限，条目转入死信停发（不再自动重试）', 'error')
  }
  /** T6 留驻上限：超限逐最老淘汰（createdAt 再 seq 决胜） */
  const enforceDeadCap = (): void => {
    const dead = [...mirror.values()]
      .filter((e) => e.state === 'dead-letter')
      .sort((a, b) => a.createdAt - b.createdAt || a.seq - b.seq)
    let evicted = 0
    while (dead.length > OUTBOX_DEAD_LETTER_MAX) {
      const oldest = dead.shift()
      if (oldest === undefined) break
      mirror.delete(oldest.id)
      storeRemove(oldest.id)
      evicted++
    }
    if (evicted > 0) {
      warn(`阅读进度死信超过 ${OUTBOX_DEAD_LETTER_MAX} 条，已淘汰最老 ${evicted} 条`, 'info')
    }
  }
  const onFail = (e: OutboxEntry, err: unknown): void => {
    e.attempts += 1
    e.lastError = err instanceof Error ? err.message : String(err)
    if (e.attempts >= OUTBOX_MAX_ATTEMPTS) {
      toDeadLetter(e)
      enforceDeadCap()
    } else {
      e.state = 'pending'
      storeUpdate(e)
      if (!disposed) armBackoff(e.attempts)
    }
    wake()
  }
  const dispatch = (e: OutboxEntry): void => {
    e.state = 'in-flight'
    storeUpdate(e)
    active += 1
    let settled = false
    const finish = (ok: boolean, err?: unknown): void => {
      if (settled) return
      settled = true
      active -= 1
      if (ok) {
        mirror.delete(e.id)
        storeRemove(e.id)
        wake()
        if (!disposed) pump()
      } else {
        onFail(e, err)
      }
    }
    try {
      void Promise.resolve(deps.send(e.paperId, e.page ?? 0, e.seconds)).then(
        () => finish(true),
        (err: unknown) => finish(false, err)
      )
    } catch (err) {
      finish(false, err)
    }
  }
  const pump = (): void => {
    if (disposed) return
    if (retryAt !== null && deps.now() < retryAt) return
    /** per-paper 队头（最小 seq 未决条目——死信终态不阻塞新 seq） */
    const heads = new Map<string, OutboxEntry>()
    for (const e of mirror.values()) {
      if (e.state === 'dead-letter') continue
      if (replaying && !oldIds.has(e.id)) continue
      const cur = heads.get(e.paperId)
      if (cur === undefined || e.seq < cur.seq) heads.set(e.paperId, e)
    }
    for (const head of heads.values()) {
      if (head.state !== 'in-flight') dispatch(head)
    }
  }
  const enqueue = (draft: Omit<OutboxEntry, 'state' | 'attempts'>): void => {
    const e: OutboxEntry = { ...draft, attempts: 0, state: 'pending' }
    storePut(e)
    mirror.set(e.id, e)
    pump()
  }
  const undeterminedOld = (): boolean => {
    for (const e of mirror.values()) {
      if (oldIds.has(e.id) && e.state !== 'dead-letter') return true
    }
    return false
  }
  const replayOnStart = (): Promise<void> => {
    if (replayPromise !== null) return replayPromise
    for (const e of mirror.values()) {
      if (e.state === 'in-flight') {
        // T5：崩溃/ack 未达驻留→attempts++ 后按未达重放（CR-2）
        e.attempts += 1
        if (e.lastError === undefined) e.lastError = 'startup-recovery'
        if (e.attempts >= OUTBOX_MAX_ATTEMPTS) {
          toDeadLetter(e)
        } else {
          e.state = 'pending'
          storeUpdate(e)
        }
      }
    }
    enforceDeadCap()
    oldIds = new Set(mirror.keys())
    replaying = true
    replayPromise = (async (): Promise<void> => {
      while (!disposed) {
        pump()
        if (active > 0 || (retryAt !== null && undeterminedOld())) {
          await new Promise<void>((r) => {
            waiters.push(r)
          })
          continue
        }
        break
      }
      replaying = false
      oldIds = new Set()
      wake()
      if (!disposed) pump()
    })()
    return replayPromise
  }
  const dispose = (): void => {
    if (disposed) return
    disposed = true
    if (timer !== null) deps.timers.clearTimeout(timer)
    timer = null
    timerFor = null
    retryAt = null
    wake()
  }
  return { enqueue, pump, replayOnStart, dispose }
}

