/**
 * [F-LGRAPH-01②U7] timeline-zoom —— 缩放坐标域换算单源（P-4/W-3 坐标口径）。
 *
 * 缩放=transform scale 作用于 .tl-content（transformOrigin 0 0），**内容坐标
 * 不变**——一切几何判定（锚点吸附/磁吸/穿卡/命中/路由快照）均在内容坐标域：
 * 指针/rect 的视口值经本件逆变换换算（(client−rect.origin)/z）。消费方=
 * useDrawLine（锚点命中）/EdgeOverlay（路由快照）/useEdgeEdit（调线域）/
 * card-drag 拖影坐标系（缩放与拖拽正交）。纯读 view.store（零订阅——判定
 * 时点取值）。
 */
import type { Pt, Rect } from './routing/anchors'
import { useLineageViewStore } from './lineage-view.store'

/** 当前内容层缩放系数（1=无变换；判定时点读——zoom 态源=view.store 单源） */
export function contentScale(): number {
  return useLineageViewStore.getState().zoom
}

/** 视口点→内容坐标（除以 z；rect=内容层 getBoundingClientRect 含变换） */
export function toContentPt(
  contentRect: { left: number; top: number },
  clientX: number,
  clientY: number,
  z: number = contentScale()
): Pt {
  return { x: (clientX - contentRect.left) / z, y: (clientY - contentRect.top) / z }
}

/** 视口 rect→内容坐标 rect（宽高同除 z——元素 rect 含 transform 缩放） */
export function toContentRect(r: { left: number; top: number; width: number; height: number }, base: { left: number; top: number }, z: number = contentScale()): Rect {
  return {
    x: (r.left - base.left) / z,
    y: (r.top - base.top) / z,
    w: r.width / z,
    h: r.height / z
  }
}
