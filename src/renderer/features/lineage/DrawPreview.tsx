// b3: P7-H
/**
 * [F-LGRAPH-01②U3] DrawPreview —— 画线拖动预览层（dragging 态）：源锚→
 * 指针（或吸附锚）临时线+吸附指示（近锚高亮=accent 小圆点——形态拟定申报）
 * +源卡高亮（.link-src 沿承拾取源视觉）。内容坐标 SVG（absolute inset:0 与
 * EdgeOverlay 同层挂 .tl-content）。零持久化（会话外瞬态）。
 */
import type { DrawLineState } from './useDrawLine'

export function DrawPreview(props: { state: DrawLineState; color: string }): JSX.Element | null {
  const { state } = props
  if (state.phase !== 'dragging' || state.from === null || state.cursor === null) return null
  const end = state.snap?.pt ?? state.cursor
  return (
    <svg className="draw-preview" data-testid="draw-preview" aria-hidden="true">
      {/* 吸附指示：目标近锚 accent 圆点（r3.2） */}
      {state.snap !== null && <circle cx={state.snap.pt.x} cy={state.snap.pt.y} r={3.2} fill="var(--accent)" />}
      <line
        x1={state.from.pt.x}
        y1={state.from.pt.y}
        x2={end.x}
        y2={end.y}
        stroke={props.color}
        strokeWidth="1.8"
        strokeDasharray="4 3"
      />
    </svg>
  )
}
