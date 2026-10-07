// b3: P7-H
/**
 * [F-LGRAPH-01②U3] DrawPreview —— 画线拖动预览层（dragging 态）：源锚→
 * 指针（或吸附锚）临时线+源卡高亮（.link-src 沿承拾取源视觉）。内容坐标
 * SVG（absolute inset:0 与 EdgeOverlay 同层挂 .tl-content）。零持久化
 * （会话外瞬态）。
 * [F-UIRES-03 C2·P4] 预览线端点=锚心（吸附态 end=snap.pt——T0 收窄正身
 * 锁定）；[C2·P2] 吸附圆点收敛删除——dragging 高亮由 DrawAnchorHint
 * 单渲染点承载（snap 维，12 屏幕 px 形态同源）。
 * [F-ANCHFIX-01 批 1b] 起点=有效源锚 fromEff.pt（目标识别后 morph 至
 * selectAnchor 规则锚——所见即所得）；未命中目标回落 from.pt（起拖锚）。
 */
import type { DrawLineState } from './useDrawLine'

export function DrawPreview(props: { state: DrawLineState; color: string }): JSX.Element | null {
  const { state } = props
  if (state.phase !== 'dragging' || state.from === null || state.cursor === null) return null
  const end = state.snap?.pt ?? state.cursor
  const start = state.fromEff?.pt ?? state.from.pt
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
