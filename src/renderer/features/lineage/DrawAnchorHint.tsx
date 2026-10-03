/**
 * [lnfix1] DrawAnchorHint —— 画线 armed 待机锚点指示层：指针近锚
 * （≤DRAW_SNAP_R，与可起拖判定同一数学——所见即可拖）时在最近锚位渲染
 * accent 圆点（DrawPreview 吸附圆点同坐标系同画法）。idle 待机态瞬态零持久
 * 化（hint 通道=useDrawLine document move 数学命中，leading 节流 50ms）。
 */
import type { DrawAnchor } from './useDrawLine'

export function DrawAnchorHint(props: { hint: DrawAnchor | null }): JSX.Element | null {
  if (props.hint === null) return null
  return (
    <svg className="draw-anchor-hint" data-testid="draw-anchor-hint" aria-hidden="true">
      <circle cx={props.hint.pt.x} cy={props.hint.pt.y} r={3.2} fill="var(--accent)" />
    </svg>
  )
}
