// b3: P7-H
/**
 * [F-LGRAPH-01①U4] timeline-nav-sync —— 画布侧导航联动（LineageTimeline 挂载）：
 * ①navScrollTarget 消费（时间线索引点击→月框 scrollIntoView 定位）；
 * ②滚动上报（当前视口所在月→view.store activeFrameKey——导航窗格 accent
 * 指示条数据源；「首个底缘越过视口上段的月框」=当前月）。
 */
import { useEffect } from 'react'
import type { RefObject } from 'react'
import { useLineageViewStore } from './lineage-view.store'

/** 视口上段判定偏移（月标带高度量级——首框顶部不完全出视口即仍当前） */
const ACTIVE_TOP_OFFSET = 60

export function useTimelineNavSync(
  scrollerRef: RefObject<HTMLElement | null>,
  recomputeKey: unknown
): void {
  const navScrollTarget = useLineageViewStore((s) => s.navScrollTarget)
  const setActiveFrameKey = useLineageViewStore((s) => s.setActiveFrameKey)

  // ①定位：索引点击信号→对应月框滚入视口（同 key 重发 nonce 递增也触发）；
  // [回炉 R11] 消费后清空（不驻留——重挂载不重播上次定位）
  useEffect(() => {
    if (navScrollTarget === null) return
    const sc = scrollerRef.current
    if (sc === null) return
    const frame = sc.querySelector(`[data-frame-key="${navScrollTarget.key}"]`)
    frame?.scrollIntoView({ block: 'start' })
    useLineageViewStore.getState().clearNavScrollTarget()
  }, [navScrollTarget, scrollerRef])

  // ②上报：滚动（+内容变化重挂载）时计算当前月。[回炉 R5] 参考系=rect 差分
  //（getBoundingClientRect 相对视口恒成立——offsetTop 前提不成立：.tl-content
  // position:relative 使月框 offsetParent≠scroller，偏移恒差 content 盒顶）
  useEffect(() => {
    const sc = scrollerRef.current
    if (sc === null) return
    const onScroll = (): void => {
      const scTop = sc.getBoundingClientRect().top
      const frames = sc.querySelectorAll<HTMLElement>('[data-frame-key]')
      let active: string | null = null
      for (const f of frames) {
        if (f.getBoundingClientRect().bottom > scTop + ACTIVE_TOP_OFFSET) {
          active = f.dataset.frameKey ?? null
          break
        }
      }
      setActiveFrameKey(active)
    }
    sc.addEventListener('scroll', onScroll)
    onScroll() // 挂载/重挂载即对齐（无滚动也有当前月）
    return () => {
      sc.removeEventListener('scroll', onScroll)
    }
  }, [scrollerRef, recomputeKey, setActiveFrameKey])
}
