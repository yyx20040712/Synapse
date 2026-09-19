/**
 * reading-time-setup —— ReaderPage 组合根装配件（[F-TIME-02] 时长移除后=outbox
 * 页码通道装配件，件名保留防改名面扩大）。
 *
 * 沿革：P7E-05 阅读时长（计时器本体+复合 flusher）→P7X-02 outbox（时长/进度
 * 持久队列）→2026-09-19 F-TIME-02 用户裁决「阅读时长功能移除」（查证
 * Zotero/Mendeley/EndNote/ReadCube 均无内置时长统计）——reading-time.ts 计时器
 * 本体与 reading-time-format.ts 显示件已整件删除；**outbox 机制保留**（P7X-02
 * 后为页码三收尾口通道），仅删时长载荷（OutboxEntry.seconds 字段/
 * enqueueReaderProgress 三参化二参/chunkSeconds 分片/复合 flusher 退化页码单发）。
 *
 * 现职责：outbox 单例装配（真 localStorage/定时器/saveProgress 发送依赖/WARN=
 * toast 单源；replayOnStart 由 main.tsx void 后台回放——渲染先行，排空闸门由
 * 模块内 replaying 位承载，INV-69）+页码三收尾口共用入队口
 * （store flusher 的 flush/flushAll+spView dispose 页码尾账改道——R7 页码半边
 * 保留）。localStorage 存量条目含旧 seconds 字段=回放时忽略（向后兼容，见
 * reading-time-outbox-store 头注）。
 */
import { useMemo } from 'react'
import { api } from '../../../api/client'
import { showToast } from '../../../shared/ui/toast-store'
import type { ProgressFlusher } from '../state/reader.store'
import {
  createReadingTimeOutbox,
  type OutboxEntry,
  type OutboxStore,
  type ReadingTimeOutbox
} from './reading-time-outbox'
import { createLocalStorageOutboxStore } from './reading-time-outbox-store'

/** sp 的消费面（最小结构——ScrollProgress 结构满足；禁 import scroll-progress
 * 红线沿用 P7E-05 约定，结构同型不引具体类型） */
export interface ReaderSpDisposeView {
  /** 取走该 tab 的待落页码（不落库——落库归 outbox 单通道） */
  takePending(paperId: string): number | undefined
  /** 待落账 pid 清单（dispose 排干遍历） */
  pendingIds(): string[]
  dispose(): void
}

let outboxSingleton: ReadingTimeOutbox | null = null
/** 装配面唯一 id/seq 铸造计数（启动自 store 存量 max 续——seq 全局续增单源，
 * id=ob-<seq>，seq 唯一⇒id 跨会话唯一） */
let seqNext = 0

/** outbox 单例装配（renderer 每会话一份；WARN=toast 单源；localStorage 适配
 * 器损坏条目丢弃自清+toast） */
export function getReaderOutbox(): ReadingTimeOutbox {
  if (outboxSingleton === null) {
    const store: OutboxStore = createLocalStorageOutboxStore(window.localStorage, {
      onCorrupt: (message) => {
        showToast(message, 'error')
      }
    })
    let maxSeq = 0
    try {
      for (const e of store.loadAll()) if (e.seq > maxSeq) maxSeq = e.seq
    } catch {
      // 铸造兜底：读失败从 1 起（outbox 侧另有退化 WARN 申报）
    }
    seqNext = maxSeq
    outboxSingleton = createReadingTimeOutbox({
      store,
      // 发送依赖=saveProgress 页码载荷（F-TIME-02 后无 secondsDelta——单通道
      // 不变零新 IPC；resolve=DB 已提交）
      send: (paperId, page) => api.reader.saveProgress({ paperId, page }).then(() => undefined),
      now: () => Date.now(),
      timers: {
        setTimeout: (fn, ms) => setTimeout(fn, ms),
        clearTimeout: (h) => clearTimeout(h as ReturnType<typeof setTimeout>)
      },
      onWarn: (message, kind) => {
        showToast(message, kind)
      }
    })
  }
  return outboxSingleton
}

/** 入队口（页码三收尾口共用——页码在 enqueue 时点定死，防重放期回退） */
export function enqueueReaderProgress(paperId: string, page: number): void {
  seqNext += 1
  const draft: Omit<OutboxEntry, 'state' | 'attempts'> = {
    id: `ob-${seqNext}`,
    paperId,
    page,
    seq: seqNext,
    createdAt: Date.now()
  }
  getReaderOutbox().enqueue(draft)
}

/** 页码收账 flusher+sp 包装视图一次构建（ReaderPage 组合根消费）：
 * - flusher（ProgressFlusher 形态，store.closeTab/close 经注册口消费）：取走
 *   sp 待落页码→outbox 入队；无待落页码=no-op（时长载荷已随 F-TIME-02 移除，
 *   页码缺席即无账可落——旧复合 flusher 的 currentPageOf 兜底专服务于时长
 *   搭车，随载荷一并退役）；
 * - spView（R7 页码半边保留）：dispose 尾账页码改道 outbox——先经
 *   pendingIds/takePending 排干再调原 dispose（其内部直发落库面随排干恒空转）；
 *   其余面原样直通（spread 拷贝闭包，类型 T 保持） */
export function useReaderProgressOutbox<T extends ReaderSpDisposeView>(sp: T): {
  flusher: ProgressFlusher
  spView: T
} {
  const flusher = useMemo<ProgressFlusher>(
    () => ({
      flush(paperId) {
        const page = sp.takePending(paperId)
        if (page !== undefined) enqueueReaderProgress(paperId, page)
      },
      flushAll() {
        for (const pid of sp.pendingIds()) {
          const page = sp.takePending(pid)
          if (page !== undefined) enqueueReaderProgress(pid, page)
        }
      }
    }),
    [sp]
  )
  const spView = useMemo(() => {
    const view = {
      ...sp,
      dispose(): void {
        for (const pid of sp.pendingIds()) {
          const page = sp.takePending(pid)
          if (page !== undefined) enqueueReaderProgress(pid, page)
        }
        sp.dispose()
      }
    }
    return view as T
  }, [sp])
  return { flusher, spView }
}
