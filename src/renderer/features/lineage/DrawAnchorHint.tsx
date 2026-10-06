/**
 * [lnfix1→F-UIRES-03 C2·P2] DrawAnchorHint —— 吸附高亮层（演化件）：指针
 * 进入任一 12 锚 ±DRAW_SNAP_R（=12 内容坐标）域内时，在最近锚位渲染高亮
 * 指示——圆点直径放大至 12 屏幕 px（屏幕域固定：画布 r=6/z 随 zoom 补偿）
 * +高亮环（r=9/z 环）+类名 .snapped（e2e 断言③锚）；出域=零渲染（DOM
 * 卸载=类撤）。
 *
 * ── 渲染源（单一渲染点——dragging 态 DrawPreview 吸附圆点收敛删除）──
 * - idle 待机：hint 通道（useDrawLine document move 数学命中——leading
 *   节流 50ms，与可起拖判定同一数学，所见即可拖）；
 * - dragging：snap 维（useDrawLine state.snap——预览线端点同源，P4）。
 * 两源由 LineageTimeline 合成（phase 分派）传入 anchor 单 prop。
 *
 * zoom 补偿单点=吸附判定处（屏幕域锚位=画布锚心×zoom+pan——本件按内容
 * 坐标渲染、r=6/z 除缩放补偿，视觉直径恒 12 屏幕 px）。
 */
import type { DrawAnchor } from './useDrawLine'

/** 高亮 dot 屏幕域半径（直径 12 屏幕 px——P2 单位域定稿） */
export const SNAP_DOT_SCREEN_R = 6
/** 高亮环屏幕域半径（dot+3——环宽 1.5 屏幕 px，形态自裁申报） */
export const SNAP_RING_SCREEN_R = 9

export function DrawAnchorHint(props: { anchor: DrawAnchor | null; zoom: number }): JSX.Element | null {
  if (props.anchor === null) return null
  const { x, y } = props.anchor.pt
  const z = props.zoom
  return (
    <svg className="draw-anchor-hint" data-testid="draw-anchor-hint" aria-hidden="true">
      {/* 高亮环（外圈——stroke 主色） */}
      <circle
        className="snapped-ring"
        cx={x}
        cy={y}
        r={SNAP_RING_SCREEN_R / z}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={1.5 / z}
      />
      {/* 高亮 dot（直径 12 屏幕 px——r=6/z zoom 补偿） */}
      <circle className="snapped" cx={x} cy={y} r={SNAP_DOT_SCREEN_R / z} fill="var(--accent)" />
    </svg>
  )
}
