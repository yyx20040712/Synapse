/**
 * reading-time-setup —— P7E-05 ReaderPage 组合根装配 hook（拆自 reading-time.ts：
 * 顶层 import api（window.api 模块级求值）会毒化 node 环境纯模块单测——拆出后
 * reading-time.ts 零 window 依赖；scroll-progress 装配工厂同型的细化形态）。
 * 装配块驻模块文件=组件 ≤250 行关卡配套（组件只持引用）。
 */
import { useMemo } from 'react'
import { api } from '../../api/client'
import { useReaderStore } from './reader.store'
import type { ProgressFlusher } from './reader.store'
import {
  chunkSeconds,
  createCompositeProgressFlusher,
  createReaderReadingTime,
  type ProgressAccountView,
  type ReadingTime
} from './reading-time'

/** 时长账本+复合 flusher 一次构建：onFlush 兜底=dispose 尾账单通道
 *  saveProgress（R7 卸载收尾；分片单源消费——上游 dispose 已逐笔分片则
 *  单笔≤3600 经 chunkSeconds 单片透传=防御深度）；每片恒>0=恒带
 *  secondsDelta 字段（0 省略语义由 invokeOne 装配层维持） */
export function useReaderReadingTime(
  sp: ProgressAccountView
): { rt: ReadingTime; flusher: ProgressFlusher } {
  const rt = useMemo(
    () =>
      createReaderReadingTime((paperId, seconds) => {
        for (const chunk of chunkSeconds(seconds)) {
          void api.reader
            .saveProgress({
              paperId,
              page: useReaderStore.getState().tabs[paperId]?.page ?? 0,
              secondsDelta: chunk
            })
            .then(() => undefined, () => undefined)
        }
      }),
    []
  )
  const flusher = useMemo(
    () =>
      createCompositeProgressFlusher(sp, rt, {
        saveProgress: (paperId, page, secondsDelta) =>
          api.reader
            .saveProgress({ paperId, page, ...(secondsDelta > 0 ? { secondsDelta } : {}) })
            .then(() => undefined),
        currentPageOf: (paperId) => useReaderStore.getState().tabs[paperId]?.page ?? 0
      }),
    [sp, rt]
  )
  return { rt, flusher }
}
