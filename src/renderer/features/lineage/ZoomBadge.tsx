// b3: P7-H
/**
 * [F-LGRAPH-01②U7/T9] ZoomBadge —— 缩放角标（右下「N% ▾」——单动作点击=复位
 * 100%；LineageTimeline 拆件——组件 250 行红线；皮肤 .zoom-badge 归
 * theme-lineage.css）。
 */
import { useLineageViewStore } from './lineage-view.store'

export function ZoomBadge(): JSX.Element {
  const zoom = useLineageViewStore((s) => s.zoom)
  return (
    <button
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
