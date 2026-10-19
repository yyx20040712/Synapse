// b3: P7-H
/**
 * [F-LGRAPH-01②U7/T9] ZoomBadge —— 缩放角标（右下「N% ▾」——单动作点击=复位
 * 100%；LineageTimeline 拆件——组件 250 行红线；皮肤 .zoom-badge 归
 * theme-lineage.css）。
 * [F-LINEUI-01②] 滚动钉住补偿：absolute 锚使角标随内容滚走（漂移=−scroll，
 * 横竖两轴）——useLayoutEffect 监听祖先 .timeline scroll，transform 直写
 * translate(+scrollLeft,+scrollTop)（正号补偿：漂移 −scroll×补偿 +scroll=
 * 恒定初始位；写负号=双倍漂移）。竖向顺带钉住=设计书 §3.3 主控终裁双轴。
 */
import { useLayoutEffect, useRef } from 'react'
import { useLineageViewStore } from './lineage-view.store'

export function ZoomBadge(): JSX.Element {
  const zoom = useLineageViewStore((s) => s.zoom)
  const ref = useRef<HTMLButtonElement>(null)
  // useLayoutEffect=绘制前同步（挂载时容器已滚场景无一帧未补偿位——useEffect
  // 晚一帧）；挂载即同步一次+passive 监听+卸载精确 removeEventListener；
  // resize/zoom 时 absolute 锚自动重解析（transform 仅补 scroll 分量，无需
  // resize 监听）
  useLayoutEffect(() => {
    const el = ref.current
    const scroller = el?.closest('.timeline')
    if (el === null || !(scroller instanceof HTMLElement)) return
    const apply = (): void => {
      el.style.transform = `translate(${scroller.scrollLeft}px, ${scroller.scrollTop}px)`
    }
    apply()
    scroller.addEventListener('scroll', apply, { passive: true })
    return () => scroller.removeEventListener('scroll', apply)
  }, [])
  return (
    <button
      ref={ref}
      type="button"
      className="zoom-badge"
      data-testid="zoom-badge"
      title="复位缩放到 100%"
      onClick={() => useLineageViewStore.getState().resetZoom()}
    >
      {`${Math.round(zoom * 100)}% ▾`}
    </button>
  )
}
