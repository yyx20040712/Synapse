/**
 * [F-UIRES-03 C2] DrawLayers —— 画线瞬态层装配拆件（LineageTimeline 组件
 * 250 行红线收纳）：DrawPreview（拖动预览线）+DrawAnchorHint（吸附高亮）
 * 两瞬态层的单点装配与 phase 分派（idle 待机=hint 通道/dragging=snap 维
 * ——P2 单渲染点合成；P4 预览端点与吸附高亮同源锚心）。
 */
import type { DrawAnchor, DrawLineState } from './useDrawLine'
import { DrawPreview } from './DrawPreview'
import { DrawAnchorHint } from './DrawAnchorHint'

export function DrawLayers(props: {
  state: DrawLineState
  hint: DrawAnchor | null
  zoom: number
  /** 预览线色（active draw kind 的 per-kind 当前色——latch 在途跟随） */
  color: string
}): JSX.Element {
  return (
    <>
      <DrawPreview state={props.state} color={props.color} />
      <DrawAnchorHint
        anchor={props.state.phase === 'dragging' ? props.state.snap : props.hint}
        zoom={props.zoom}
      />
    </>
  )
}
