/**
 * reading-time-setup —— P7E-05/P7X-02 ReaderPage 组合根装配 hook（拆自
 * reading-time.ts：顶层 import api（window.api 模块级求值）会毒化 node 环境
 * 纯模块单测——拆出后 reading-time.ts 零 window 依赖；scroll-progress 装配
 * 工厂同型的细化形态）。装配块驻模块文件=组件 ≤250 行关卡配套（组件只持引用）。
 *
 * P7X-02 改道：三收尾口（复合 flusher invokeOne/onFlush 卸载兜底/sp.dispose
 * 页码尾账）全部经 enqueueReaderProgress 入 outbox（R7 并入——页码旁路消除，
 * seconds=0 合法载荷）；outbox 单例（真 localStorage/定时器/saveProgress 发送
 * 依赖/WARN=toast 单源）在此装配，启动闸门 replayOnStart 由 main.tsx await。
 */
import { useMemo } from 'react'
import { api } from '../../api/client'
import { showToast } from '../../shared/ui/toast-store'
import { useReaderStore } from './reader.store'
import type { ProgressFlusher } from './reader.store'
import {
  chunkSeconds,
  createCompositeProgressFlusher,
  createReaderReadingTime,
  type ProgressAccountView,
  type ReadingTime
} from './reading-time'
import {
  createReadingTimeOutbox,
  type OutboxEntry,
  type OutboxStore,
  type ReadingTimeOutbox
} from './reading-time-outbox'
import { createLocalStorageOutboxStore } from './reading-time-outbox-store'

/** sp 的 dispose 消费面（最小结构——ScrollProgress 结构满足；禁 import
 * scroll-progress 红线沿用 reading-time 约定，结构同型） */
export interface ReaderSpDisposeView extends ProgressAccountView {
  dispose(): void
}

let outboxSingleton: ReadingTimeOutbox | null = null
/** 装配面唯一 id/seq 铸造计数（启动自 store 存量 max 续——seq 全局续增单源，
 * id=ob-<seq>，seq 唯一⇒id 跨会话唯一） */
let seqNext = 0

function currentPageOf(paperId: string): number {
  return useReaderStore.getState().tabs[paperId]?.page ?? 0
}

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
      // 发送依赖=saveProgress 原签名（单通道不变零新 IPC；resolve=DB 已提交）
      send: (paperId, page, secondsDelta) =>
        api.reader
          .saveProgress({ paperId, page, ...(secondsDelta > 0 ? { secondsDelta } : {}) })
          .then(() => undefined),
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

/** T1 入队口（三收尾口共用——页码在 enqueue 时点定死，防重放期回退） */
export function enqueueReaderProgress(paperId: string, page: number, secondsDelta: number): void {
  seqNext += 1
  const draft: Omit<OutboxEntry, 'state' | 'attempts'> = {
    id: `ob-${seqNext}`,
    paperId,
    page,
    seconds: secondsDelta,
    seq: seqNext,
    createdAt: Date.now()
  }
  getReaderOutbox().enqueue(draft)
}

/** 时长账本+复合 flusher+sp 包装视图一次构建：onFlush 兜底=dispose 尾账经
 * outbox enqueue（R7 卸载收尾；分片单源消费——上游 dispose 已逐笔分片则
 * 单笔≤3600 经 chunkSeconds 单片透传=防御深度）；每片恒>0=恒带 seconds */
export function useReaderReadingTime<T extends ReaderSpDisposeView>(sp: T): {
  rt: ReadingTime
  flusher: ProgressFlusher
  /** R7 并入（CR-3）：dispose 尾账页码改道 outbox（seconds=0 合法载荷）——
   * 先经 pendingIds/takePending 排干再调原 dispose（其内部直发落库面随排干
   * 恒空转）；其余面原样直通（spread 拷贝闭包，类型 T 保持） */
  spView: T
} {
  const rt = useMemo(
    () =>
      createReaderReadingTime((paperId, seconds) => {
        for (const chunk of chunkSeconds(seconds)) {
          enqueueReaderProgress(paperId, currentPageOf(paperId), chunk)
        }
      }),
    []
  )
  const flusher = useMemo(
    () =>
      createCompositeProgressFlusher(sp, rt, {
        enqueue: enqueueReaderProgress,
        currentPageOf
      }),
    [sp, rt]
  )
  const spView = useMemo(() => {
    const view = {
      ...sp,
      dispose(): void {
        for (const pid of sp.pendingIds()) {
          const page = sp.takePending(pid)
          if (page !== undefined) enqueueReaderProgress(pid, page, 0)
        }
        sp.dispose()
      }
    }
    return view as T
  }, [sp])
  return { rt, flusher, spView }
}
