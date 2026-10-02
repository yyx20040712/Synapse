// b3: P7-H
/**
 * [F-LGRAPH-01①U5] timeline-pan —— 平移小手（mockup §2.1：browse/focus 拖
 * 画布空白=滚动跟随 scrollLeft/scrollTop+grab/grabbing 光标；edit 不平移）。
 *
 * - 命中面=画布空白（排除卡身/月标/工具条/图例——这些是点选/编辑域）；
 *   指针位移反向滚动（内容随手指）；
 * - [回炉 R12] 激活阈值 5px（DRAG_THRESHOLD 同值先例——微移不滚不进
 *   grabbing 防误触）；[②U7/挂账⑦] 激活帧 re-base（阈值累积不瞬跳）；
 * - 光标域=.panning 类（grabbing）挂滚动容器根——基态 grab 由模式类
 *   （.mode-browse/.mode-focus）承载（theme-lineage.css）。
 */
import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, RefObject } from 'react'

/** 平移排除面（卡/月标/工具条/图例——点选与编辑域不触发平移） */
const PAN_EXCLUDE = '.tl-card, .c-ym, .lg-toolbar, .tl-legend, .month-tag'
/** 激活阈值 px（[R12]——DRAG_THRESHOLD 同值先例） */
const PAN_THRESHOLD = 5

export function useTimelinePan(args: {
  enabled: boolean
  scrollerRef: RefObject<HTMLElement | null>
}): {
  panning: boolean
  onPointerDown(ev: ReactPointerEvent<HTMLElement>): void
} {
  const { enabled, scrollerRef } = args
  const [panning, setPanning] = useState(false)
  const baseRef = useRef<{ startX: number; startY: number; scrollLeft: number; scrollTop: number } | null>(null)
  const armedRef = useRef(false) // [R12] 过阈值armed（阈值内不滚不 grabbing）

  const onPointerDown = (ev: ReactPointerEvent<HTMLElement>): void => {
    if (!enabled) return // edit 不平移（模式闸）
    if (ev.button !== 0) return
    if ((ev.target as Element).closest(PAN_EXCLUDE) !== null) return // 空白命中面
    const sc = scrollerRef.current
    if (sc === null) return
    baseRef.current = {
      startX: ev.clientX,
      startY: ev.clientY,
      scrollLeft: sc.scrollLeft,
      scrollTop: sc.scrollTop
    }
    armedRef.current = false // [R12] 起步未激活（首次过阈值才进平移）
  }

  useEffect(() => {
    const onMove = (e: PointerEvent): void => {
      const base = baseRef.current
      const sc = scrollerRef.current
      if (base === null || sc === null) return
      // [R12] 阈值闸：位移 <5px 不滚不 grabbing；首次过阈值 armed+进 grabbing
      // [②U7/挂账⑦] 激活帧 re-base 起点至当前指针——阈值累积位移不瞬跳（≤5px
      //  跳变消解：内容自激活点起随手指）
      if (!armedRef.current) {
        if (Math.hypot(e.clientX - base.startX, e.clientY - base.startY) < PAN_THRESHOLD) return
        armedRef.current = true
        base.startX = e.clientX
        base.startY = e.clientY
        setPanning(true)
      }
      sc.scrollLeft = base.scrollLeft - (e.clientX - base.startX) // 内容随手指（反向）
      sc.scrollTop = base.scrollTop - (e.clientY - base.startY)
    }
    const onUp = (): void => {
      if (baseRef.current === null) return
      baseRef.current = null
      armedRef.current = false
      setPanning(false)
    }
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
    document.addEventListener('pointercancel', onUp)
    return () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
      document.removeEventListener('pointercancel', onUp)
    }
  }, [scrollerRef])

  return { panning, onPointerDown }
}
