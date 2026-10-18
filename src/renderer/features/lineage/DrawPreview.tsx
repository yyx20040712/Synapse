// b3: P7-H
/**
 * [F-LGRAPH-01②U3] DrawPreview —— 画线拖动预览层（dragging 态）：源锚→
 * 指针（或吸附锚）临时线。内容坐标 SVG（absolute inset:0 与 EdgeOverlay
 * 同层挂 .tl-content）。零持久化（会话外瞬态）。
 * [F-UIRES-03 C2·P4] 预览线端点=锚心（吸附态 end=snap.pt——T0 收窄正身
 * 锁定）；[C2·P2] 吸附圆点收敛删除——dragging 高亮由 DrawAnchorHint
 * 单渲染点承载（snap 维，12 own 单位形态同源——zoom 补偿屏幕域恒定）。
 * [F-VISFB-66] 起点**恒 from.pt**（按下锚——批 1b「morph 至路由规则
 * 锚」句翻案作废：两端锚用户钉定，预览不 morph，W-09r2）；源卡高亮链
 * 已随点两卡链路退役删除（无源侧高亮=终裁接受项——源锚视觉=预览线起点）。
 */
import type { DrawLineState } from './useDrawLine'

export function DrawPreview(props: { state: DrawLineState; color: string }): JSX.Element | null {
  const { state } = props
  if (state.phase !== 'dragging' || state.from === null || state.cursor === null) return null
  const end = state.snap?.pt ?? state.cursor
  const start = state.from.pt
  return (
    <svg className="draw-preview" data-testid="draw-preview" aria-hidden="true">
      <line
        x1={start.x}
        y1={start.y}
        x2={end.x}
        y2={end.y}
        stroke={props.color}
        strokeWidth="1.8"
        strokeDasharray="4 3"
      />
    </svg>
  )
}
