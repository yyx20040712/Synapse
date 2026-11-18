// b3: P7-H
/**
 * [F-LGRAPH-01①U4] timeline-nav-sync —— 画布侧导航联动（LineageTimeline 挂载）：
 * ①navScrollTarget 消费（时间线索引点击→月框 scrollIntoView 定位）；
 * ②滚动上报（当前视口所在月→view.store activeFrameKey——导航窗格 accent
 * 指示条数据源；「首个底缘越过视口上段的月框」=当前月；[ln-W3b-3] zoom
 * 步进同触发重算——transform 缩放改 gBCR 但不发 scroll 事件）。
 */
import { useEffect } from 'react'
import type { RefObject } from 'react'
import { useLineageViewStore } from './lineage-view.store'
import { effectiveScale } from './timeline-zoom'

/** 视口上段判定偏移（own px——月标带高度量级，首框顶部不完全出视口即仍当前；
 *  [F-VISFB-31] client 判定域×s_eff 换算——旧直加=u≠1 档偏移缩窄 1/s_eff 倍） */
const ACTIVE_TOP_OFFSET = 60

export function useTimelineNavSync(
  scrollerRef: RefObject<HTMLElement | null>,
  recomputeKey: unknown
): void {
  const navScrollTarget = useLineageViewStore((s) => s.navScrollTarget)
  const setActiveFrameKey = useLineageViewStore((s) => s.setActiveFrameKey)
  // [ln-W3b-3] zoom 订阅：transform 缩放改帧 gBCR 底缘但**不发 scroll 事件**，
  // accent 会滞后到下次滚动——订阅入上报 deps（zoom 变更即重跑对齐）。注意
  // 禁止扩进调用方 layoutKey：该键同喂容量量测与 routeEpoch，扩键=每档缩放
  // 全图重走线（zoom 属渲染侧 transform，不改 own 域布局）
  const zoom = useLineageViewStore((s) => s.zoom)

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

  // ②上报：滚动（+内容变化重挂载+[ln-W3b-3] zoom 步进——无 scroll 事件的
  // gBCR 变更源）时计算当前月。[回炉 R5] 参考系=rect 差分
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
        if (f.getBoundingClientRect().bottom > scTop + ACTIVE_TOP_OFFSET * effectiveScale()) {
          active = f.dataset.frameKey ?? null
          break
        }
      }
      setActiveFrameKey(active)
    }
    sc.addEventListener('scroll', onScroll)
    onScroll() // 挂载/重挂载（含 zoom 变更）即对齐（无滚动也有当前月）
    return () => {
      sc.removeEventListener('scroll', onScroll)
    }
  }, [scrollerRef, recomputeKey, setActiveFrameKey, zoom])
}
