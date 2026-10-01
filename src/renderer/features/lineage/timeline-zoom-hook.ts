/**
 * [F-LGRAPH-01②U7] useTimelineZoom —— 画布缩放编排 hook（P-4/T9）。
 *
 * - ctrl+滚轮=步进缩放（50%–200% 步 10%；三模式均生效）；非 ctrl 滚轮不拦
 *   （纵向滚动沿承——监听挂滚动容器根，非被动 passive:false 才能 preventDefault
 *   控制页缩放）；机制=transform scale 作用于 .tl-content（transformOrigin
 *   0 0——**内容坐标不变**，几何判定经 timeline-zoom.ts 逆变换换算）。
 * - spacer：transform 不改布局盒（缩放后内容溢出滚动域不可达）——绝对定位
 *   .tl-zoom-spacer（left/top 0+宽高=自然尺寸×z）撑出滚动域覆盖缩放视觉区
 *   （.timeline relative+overflow 滚动含绝对后代）；**不可用包裹盒**——块级
 *   content 会拉伸填满包裹盒→尺寸互撑反馈=React #185 无限重渲染（e2e 探针
 *   实证）。RO 跟随内容布局变化；jsdom 无 RO=逐渲染量测兜底。
 * - 100%=零变换（style.transform 空——基线无扰动）。
 */
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from 'react'
import { useLineageViewStore } from './lineage-view.store'

export function useTimelineZoom(args: {
  timelineRef: RefObject<HTMLDivElement | null>
  contentRef: RefObject<HTMLDivElement | null>
  /** 内容布局变化键（渲染组引用——jsdom 无 RO 的量测兜底触发） */
  recomputeKey: unknown
}): {
  /** .tl-content 内联样式（transform——100%=无变换键） */
  contentStyle: CSSProperties
  /** .tl-zoom-spacer 内联样式（绝对定位宽高=自然尺寸×z——撑滚动域） */
  spacerStyle: CSSProperties
  /** 当前百分比文本（角标——Math.round(z*100)） */
  percent: number
} {
  const z = useLineageViewStore((s) => s.zoom)
  const naturalRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 })
  const [, force] = useState(0)

  // ctrl+滚轮（非被动——preventDefault 拦浏览器页缩放；挂载一次）
  useEffect(() => {
    const el = args.timelineRef.current
    if (el === null) return
    const onWheel = (e: WheelEvent): void => {
      if (!e.ctrlKey) return
      e.preventDefault()
      useLineageViewStore.getState().zoomStep(e.deltaY < 0 ? 1 : -1)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
    // timelineRef 稳定（宿主 useRef）；空挂载期重试由 recomputeKey 渲染兜底
  }, [args.timelineRef, args.recomputeKey])

  // 自然尺寸量测（RO 优先；jsdom 无 RO=重算键变化量测——[RR8] deps 收敛：
  // 原无 deps 逐渲染量测+RO 重建；重算键=内容布局变化（渲染组引用），zoom-only
  // 等状态渲染零重测——自然尺寸缩放不变）
  useLayoutEffect(() => {
    const content = args.contentRef.current
    if (content === null) return
    const measure = (): void => {
      const w = content.offsetWidth
      const h = content.offsetHeight
      if (w !== naturalRef.current.w || h !== naturalRef.current.h) {
        naturalRef.current = { w, h }
        force((v) => v + 1)
      }
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(measure)
    ro.observe(content)
    return () => ro.disconnect()
  }, [args.contentRef, args.recomputeKey])

  const n = naturalRef.current
  return {
    contentStyle: z !== 1 ? { transform: `scale(${z})`, transformOrigin: '0 0' } : {},
    spacerStyle:
      z !== 1 && n.w > 0
        ? { position: 'absolute', left: 0, top: 0, width: n.w * z, height: n.h * z, pointerEvents: 'none' }
        : {},
    percent: Math.round(z * 100)
  }
}
