// b3: P7-H
/**
 * [F-LGRAPH-01①] useWaterfallOffsets —— 瀑布错位不动点迭代+测量冻结+连线层
 * 再触发信号（自 LineageTimeline 拆出 2026-10-01：组件 250 行红线；行为零变）。
 *
 * P-15：82 步/148 节距/年内复位——.tl-measure 冻结量测（d1-W1 三过加固）
 * +迭代上限 8 振荡守卫（k1-W2）；错位量>0 的卡入表（inline margin-left）。
 * routeEpoch=连线层再触发信号（[T3-P7A 回炉 1 W1/W6] 收敛/守卫停分支+拖拽
 * settle 清场两源 bump——EdgeOverlay 消费）。[T3-P8+R2] dragging/settle 两期
 * 跳过冻结迭代：a) dragging 期拖卡 inline fixed 的视口系 offsetTop 混入会
 * 误挂行错位+其行错位 margin 掺入后续 FLIP target；b) settle 期 .tl-measure
 * 的 transition:none 取消飞行过渡（transitionend 永不触发=落定写丢失）。
 * settle→idle 时 dragPhase 入 deps 重跑，冻结量测在终态布局上补齐。
 */
import { useLayoutEffect, useRef, useState } from 'react'
import { collectWaterfallFrameRows, waterfallOffsets } from './lineage-timeline'
import type { DragPhase } from './card-drag-session'

/** 迭代上限（振荡守卫——测量布局抖动回路截断） */
const MAX_ITER = 8

export function useWaterfallOffsets(args: {
  contentRef: React.RefObject<HTMLDivElement | null>
  recomputeKey: unknown
  dragPhase: DragPhase
}): {
  offsets: ReadonlyMap<string, number>
  /** 连线层再触发信号（收敛/守卫停分支+拖拽清场两源 bump） */
  routeEpoch: number
  /** 供拖拽清场回调 bump（宿主 ref 前置接线——两源共用单 state） */
  bumpRoute(): void
} {
  const iterRef = useRef(0)
  const [offsets, setOffsets] = useState<ReadonlyMap<string, number>>(() => new Map())
  const [routeEpoch, setRouteEpoch] = useState(0)

  useLayoutEffect(() => {
    const content = args.contentRef.current
    if (content === null) return
    if (args.dragPhase === 'dragging' || args.dragPhase === 'settle') return
    content.classList.add('tl-measure')
    const next = waterfallOffsets(collectWaterfallFrameRows(content))
    let same = next.size === offsets.size
    if (same) {
      for (const [id, off] of next) {
        if (offsets.get(id) !== off) {
          same = false
          break
        }
      }
    }
    if (same || iterRef.current >= MAX_ITER) {
      iterRef.current = 0
      content.classList.remove('tl-measure')
      setRouteEpoch((v) => v + 1)
      return
    }
    iterRef.current++
    setOffsets(next)
    // 注：deps 采 recomputeKey/dragPhase/offsets 三键（宿主传入渲染组+拖相位；
    // effect 闭包读 offsets 判不变——收敛即停）
  }, [args.recomputeKey, args.dragPhase, offsets])

  return { offsets, routeEpoch, bumpRoute: () => setRouteEpoch((v) => v + 1) }
}
