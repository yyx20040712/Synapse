/**
 * [P7E-05] reading-time —— 阅读时长账本（工单：本票实现）。
 *
 * ── 行为层 ──
 * - 计时门（可计时的充要条件）：active tab 就绪（status ready——装配面效应
 *   只在 ready 调 start）且 document.visibilityState==='visible'（visibilitychange
 *   暂停/恢复）；不做输入级 idle 检测（v1 边界：挂后台标签页不算、亮屏不看算
 *   ——诚实申报，票面§4 已知边界①）。
 * - 态空间（per-tab ledger Record<paperId,seconds> + 当前段 {currentPid,liveMs,
 *   lastMark}）：
 *   | 态 | 迁移 | 断言 |
 *   | --- | --- | --- |
 *   | 未计时 | start(pid)（ready×active） | 段起 lastMark=now，tick 循环起 |
 *   | 计时中 | tick 到（门开）→整 tick 入 ledger | 不足 tick 留 liveMs（零头） |
 *   | 计时中 | visibilitychange→hidden | 已计量零头留存，刻度推到当下（hidden 段零累积） |
 *   | hidden | 恢复 visible | lastMark=恢复点起算（续算，零头续接） |
 *   | 计时中 | stop()（切 tab/换文档） | 零头按实结转入 ledger（账留存——R4） |
 *   | 任意 | collectAndZero(pid) | 返回并清零该 tab 账（不 invoke——页码未知，invoke 归复合 flusher） |
 *   | 任意 | dispose() | 清 timer+尾账逐笔经 onFlush 上抛（R7 卸载收尾） |
 * - 跨格序列 R1~R7+R10 见 tests/unit/renderer/reading-time.test.ts（票面§1 表）。
 * - tick=READING_TICK_MS（15s）；不足 tick 的零头随 flush 按实结转（now 注入
 *   差值计，floor 秒——宁少勿多）；节流下长间隔一次入账整段（都是可见段——
 *   不可见段被 onVisibilityChange 刻度隔离）。
 *
 * ── 接口层 ──
 * - createReadingTime(deps:{isVisible,now,timers,onFlush})——时间全注入（禁真
 *   timer，scroll-progress 同法）；
 * - createReaderReadingTime(onFlush)——装配工厂（真 Date.now/setInterval/
 *   document.visibilityState）；
 * - createCompositeProgressFlusher(sp,rt,deps)——装配面复合 flusher（进度页
 *   +时长账一次 invoke=单通道单事务面，Design 裁决）；
 * - useReadingTimeWiring——装配效应集（ready 效应 start/stop+visibilitychange
 *   监听+卸载 dispose）；
 * - formatReadingTime(seconds)——显示纯函数（<60min「N 分钟」按分钟取整；
 *   ≥60min「N 小时 M 分」）单源导出（PaperDetailPanel 消费）。
 *
 * ── 架构层 ──
 * - 与 scroll-progress 互不 import（票面§3 红线）——复合器消费 ProgressAccountView
 *   结构类型（ScrollProgress 加 takePending/pendingIds 口后结构满足），装配面
 *   ReaderPage 同时持两模块复合；依赖单向同惯例。
 * - 落库经 outbox enqueue 搭车 saveProgress 通道（P7X-02：invokeOne 直发+
 *   吞错改道持久队列 at-least-once，失败可恢复）——继承其完整生命周期钩子链
 *   （防抖/关 tab/closeAll/卸载收尾），禁独立通道（两账本两通道=漏一即丢账）。
 * - INV-57（收口主控登记）：时长账本唯一宿主=本模块 ledger；reading_seconds
 *   唯一写点=papers.repo updateReadPage 第三参。
 *
 * ── 生命周期层 ──
 * - 不做：输入级 idle 检测（v2 另立票）、跨设备时长合并（单机单库）。
 *
 * ── 文化层 ──
 * - 测试：tests/unit/renderer/reading-time.test.ts（R1~R7+R10+零头结转+复合
 *   flusher+formatReadingTime 边界，时间全注入）+reading-time-outbox.test
 *   （P7X-02 队列态空间）；e2e reader-reading-time.spec（显示面+迁移升级链
 *   冒烟）+reading-time-replay.spec（P7X-02 重启重放链）。
 */
import { useEffect } from 'react'

// formatReadingTime 定义驻 renderer/shared（quality 跨 feature 关卡指定的下沉
// 位——PaperDetailPanel 直 import shared；此处 re-export 单源转发=受锁测试
// import 面零改，定义唯一）
export { formatReadingTime } from '../../shared/reading-time-format'

/** tick 间隔：15s（票面①——READING_TICK_MS 常量单源） */
export const READING_TICK_MS = 15_000

/** 注入定时器（禁真 timer——测试经 fake timers 驱动） */
export interface ReadingTimeTimers {
  setInterval(fn: () => void, ms: number): unknown
  clearInterval(handle: unknown): void
}

export interface ReadingTimeDeps {
  /** 可见性门（装配注入 document.visibilityState==='visible'） */
  isVisible(): boolean
  now(): number
  timers: ReadingTimeTimers
  /** dispose 尾账上抛口（装配面接 saveProgress 兜底——R7） */
  onFlush(paperId: string, seconds: number): void
}

export interface ReadingTime {
  /** active tab 就绪（装配面 ready 效应调用；换文档旧段零头先结转） */
  start(paperId: string): void
  /** 切 tab/换文档/失焦（零头按实结转留存 ledger——账不丢） */
  stop(): void
  /** visibilitychange 接线（hidden=刻度隔离零累积；visible=恢复点起算） */
  onVisibilityChange(): void
  /** flush 用：返回并清零该 tab 账（页码未知不 invoke——invoke 归复合 flusher） */
  collectAndZero(paperId: string): number
  /** flushAll 用：取走全账并清零 */
  collectAllAndZero(): Record<string, number>
  /** 观察口（测试/装配诊断）：该 tab 已入账秒数 */
  ledgerOf(paperId: string): number
  /** 清 timer+尾账逐笔 onFlush 上抛（卸载/切视图收尾） */
  dispose(): void
}

export function createReadingTime(deps: ReadingTimeDeps): ReadingTime {
  const ledger: Record<string, number> = {}
  let currentPid: string | null = null
  /** 当前连续可见段内已计量未入账的毫秒（零头） */
  let liveMs = 0
  /** 上次计量刻度（ms——now 注入） */
  let lastMark = 0
  let handle: unknown = null

  /** 段结算：**吸收**（liveMs += now-lastMark）仅 visible（R1 回炉——hidden
   *  段时长不得吸收，票面「挂后台标签页不算」全路径）；**结转**（liveMs 入
   *  ledger+清零，force 或 ≥tick 时）不依赖当前可见性（R3 回炉/门二 WARN
   *  解耦——hidden 前已计量的可见零头（<15s）随 force 结转入账不丢，票面
   *  「零头随 flush 按实结转/实转不丢」）；lastMark 无条件推进刻度。节流长
   *  间隔一段清（≥TICK 全入）。liveMs 生命周期终局=dispose/start 重置清零 */
  const settle = (force: boolean): void => {
    const now = deps.now()
    if (currentPid !== null && deps.isVisible()) {
      liveMs += Math.max(0, now - lastMark)
    }
    if (currentPid !== null && (force || liveMs >= READING_TICK_MS)) {
      ledger[currentPid] = (ledger[currentPid] ?? 0) + Math.floor(liveMs / 1000)
      liveMs = 0
    }
    lastMark = now
  }

  /** tick：门关（无 active/不可见）零累积直接返回（刻度不动——hidden 段隔离
   *  由 onVisibilityChange 承担，此处防御冗余） */
  const tick = (): void => {
    if (currentPid === null || !deps.isVisible()) return
    settle(false)
  }

  return {
    start(paperId) {
      if (currentPid !== null) settle(true) // 换文档：旧文档零头先结转（不丢）
      currentPid = paperId
      liveMs = 0
      lastMark = deps.now()
      if (handle === null) handle = deps.timers.setInterval(tick, READING_TICK_MS)
    },

    stop() {
      if (currentPid !== null) settle(true) // 零头按实结转留存（R4 账留存）
      currentPid = null
      if (handle !== null) {
        deps.timers.clearInterval(handle)
        handle = null
      }
    },

    onVisibilityChange() {
      if (deps.isVisible()) {
        // 恢复：从恢复点起算（liveMs 零头保留续算）
        lastMark = deps.now()
      } else {
        // 进入 hidden：已计量零头留存，刻度推到当下——hidden 段零累积
        if (currentPid !== null) liveMs += Math.max(0, deps.now() - lastMark)
        lastMark = deps.now()
      }
    },

    collectAndZero(paperId) {
      if (currentPid === paperId) settle(true) // 当前段零头一并结转
      const sec = ledger[paperId] ?? 0
      delete ledger[paperId]
      return sec
    },

    collectAllAndZero() {
      if (currentPid !== null) settle(true)
      const out = { ...ledger }
      for (const key of Object.keys(ledger)) delete ledger[key]
      return out
    },

    ledgerOf(paperId) {
      return ledger[paperId] ?? 0
    },

    dispose() {
      if (currentPid !== null) settle(true)
      currentPid = null
      if (handle !== null) {
        deps.timers.clearInterval(handle)
        handle = null
      }
      for (const paperId of Object.keys(ledger)) {
        const sec = ledger[paperId] ?? 0
        delete ledger[paperId]
        // R3 回炉/门二 BLOCKING：尾账逐笔分片 onFlush（>1h 账单笔>3600 会被
        // zod 拒+setup 吞错=静默丢账——分片单源 chunkSeconds）
        if (sec > 0) {
          for (const chunk of chunkSeconds(sec)) deps.onFlush(paperId, chunk)
        }
      }
    }
  }
}

/** 进度账视图（结构类型——ScrollProgress 满足；互不 import 红线，票面§3） */
export interface ProgressAccountView {
  /** 取走该 tab 的待落页码（不落库——落库归复合 flusher 单通道） */
  takePending(paperId: string): number | undefined
  /** 待落账 pid 清单（flushAll 并集遍历） */
  pendingIds(): string[]
}

export interface CompositeFlusherDeps {
  /** T1 入队口（装配注入 outbox enqueue 铸造闭包——发送依赖已移交 outbox
   *  单例（P7X-02），单通道不变零新 IPC；签名=原 saveProgress 直发同形） */
  enqueue(paperId: string, page: number, secondsDelta: number): void
  /** 页码缺席时该 tab 的当前页（store tab.page） */
  currentPageOf(paperId: string): number
}

/** 单次 invoke 时长上界（=schemas.ts saveProgressReqSchema secondsDelta
 *  max(3600)——「单次 invoke 上界」契约；受锁面禁动，此处同值分片对齐） */
export const PROGRESS_SECONDS_CHUNK = 3_600

/** 时长分片纯函数（R3 回炉/门二 BLOCKING——分片单源，三消费点共用：
 *  invokeOne（R5/R6 复合 flush）、dispose 逐笔 onFlush（R7 卸载）、setup 侧
 *  onFlush 回调（防御深度——上游已分片则单片透传））：3600 整数片+尾片
 *  （sec=0→[0]=单笔零片=旧载荷省略语义由装配层处理） */
export function chunkSeconds(sec: number): number[] {
  const chunks: number[] = []
  let rest = sec
  while (rest >= PROGRESS_SECONDS_CHUNK) {
    chunks.push(PROGRESS_SECONDS_CHUNK)
    rest -= PROGRESS_SECONDS_CHUNK
  }
  if (rest > 0 || chunks.length === 0) chunks.push(rest)
  return chunks
}

/** 复合 flusher（装配面注册进 store.registerProgressFlusher——closeTab/close
 *  消费）：进度页+时长账一次入队（sec>0||page 在场才入；两账皆空零条目）。
 *  分片（R2 回炉/门一 BLOCKING）：时长账仅收尾口一次性回吐——连续阅读>1h 后
 *  关 tab 回吐值>3600 会被 zod 拒收（吞错静默丢失击穿 INV-57）；故 sec>3600
 *  拆 3600 整数片+尾片依次 enqueue（页码同一 pending page 重复写=
 *  last_read_page set 幂等无害；物理上界 24 片/24h）。
 *  直发改道（P7X-02）：invokeOne 原「直发+吞错」改 outbox.enqueue——页码在
 *  enqueue 时点定死（重放期不取「当前页」防 last_read_page 回退），落盘
 *  失败可恢复性由 outbox 态空间承载（at-least-once） */
export function createCompositeProgressFlusher(
  sp: ProgressAccountView,
  rt: ReadingTime,
  deps: CompositeFlusherDeps
): { flush(paperId: string): void; flushAll(): void } {
  const invokeOne = (paperId: string, page: number | undefined, sec: number): void => {
    if (page === undefined && sec <= 0) return
    const basePage = page ?? deps.currentPageOf(paperId)
    for (const chunk of chunkSeconds(sec)) deps.enqueue(paperId, basePage, chunk)
  }
  return {
    flush(paperId) {
      invokeOne(paperId, sp.takePending(paperId), rt.collectAndZero(paperId))
    },
    flushAll() {
      const rtAll = rt.collectAllAndZero()
      const pids = new Set([...Object.keys(rtAll), ...sp.pendingIds()])
      for (const pid of pids) invokeOne(pid, sp.takePending(pid), rtAll[pid] ?? 0)
    }
  }
}

/** 装配工厂：真实 deps（Date.now/setInterval/document.visibilityState） */
export function createReaderReadingTime(
  onFlush: (paperId: string, seconds: number) => void
): ReadingTime {
  return createReadingTime({
    isVisible: () => document.visibilityState === 'visible',
    now: () => Date.now(),
    timers: {
      setInterval: (fn, ms) => setInterval(fn, ms),
      clearInterval: (h) => clearInterval(h as ReturnType<typeof setInterval>)
    },
    onFlush
  })
}

/** 装配效应集（ReaderPage 组合根消费）：
 * - ready 效应：paperId 就绪（ready×fileUrl 在场）start，否则 stop（R10：
 *   loading/error 零累积；R4：切 tab stop→start 成对）；
 * - visibilitychange 监听成对（hidden 暂停/visible 恢复——R3）；
 * - 卸载：dispose 尾账经 onFlush 上抛（R7）。 */
export function useReadingTimeWiring(
  rt: ReadingTime,
  paperId: string | null,
  ready: boolean
): void {
  useEffect(() => {
    if (paperId !== null && ready) rt.start(paperId)
    else rt.stop()
    return () => rt.stop()
  }, [rt, paperId, ready])
  useEffect(() => {
    const onVis = (): void => rt.onVisibilityChange()
    document.addEventListener('visibilitychange', onVis)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      rt.dispose()
    }
  }, [rt])
}
