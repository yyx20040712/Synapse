// b3: P7-H
/**
 * [F-LGRAPH-01②U5] EdgeHandles —— 选中/拖拽态手柄集+虚影+磁吸指示+穿卡警示
 * （mockup §3.6/P-10：via 顶点=8×8 白方块 accent 边；端点=r4.5 白圆 signal
 * 橙边；hover=放大 1.25 CSS；磁吸=手柄实心+通道中线 signal 虚线；拖动中=
 * 联动虚影 ghost 前后对照；穿卡=signal 红警示层——dragging+selected 态渲染
 * 零持久化[INV-79 手动分句]）。
 *
 * 纯受控子件（EditPolyline 几何+回调经 props；写路径宿主收口）。SVG 内联驻
 * EdgeOverlay（z 序=手柄最上——命中优先）。
 */
import type { Pt } from './routing/anchors'
import type { EditPolyline } from './edge-edit'

/** 磁吸指示线长（通道中线瞬显段——手柄两侧各 160px） */
const SNAP_LINE_HALF = 160

export function EdgeHandles(props: {
  pl: EditPolyline
  /** 拖动中=联动虚影（拖前 via 链） */
  ghost: EditPolyline | null
  /** 磁吸态（手柄实心+中线瞬显） */
  snap: { axis: 'h' | 'v'; line: number; at: Pt } | null
  /** [回炉 R19] 被拖顶点序号（.magnet 实心仅被拖柄——null=非 vertex 拖拽） */
  activeVertexIdx: number | null
  /** 穿卡警示命中段（全链段序——data-edge-warn e2e 软断言锚） */
  warnSegs: number[]
  /** reconnect 预览端（null=非 reconnect） */
  reconnectEnd: 'from' | 'to' | null
  onVertexDown(idx: number, button: number, pt: Pt): void
  onVertexContext(idx: number, ev: { clientX: number; clientY: number }): void
  onEndDown(end: 'from' | 'to', button: number): void
}): JSX.Element {
  const { pl } = props
  const pts: Pt[] = [pl.anchorA, ...pl.via, pl.anchorB]
  const segD = (seg: Pt[]): string =>
    `M ${seg[0]!.x} ${seg[0]!.y} L ${seg[1]!.x} ${seg[1]!.y}`
  const segOf = (i: number): Pt[] => [pts[i]!, pts[i + 1]!]
  return (
    <g data-testid="edge-handles">
      {/* 联动虚影（拖前对照——dashed faint） */}
      {props.ghost !== null &&
        (() => {
          const g: Pt[] = [props.ghost.anchorA, ...props.ghost.via, props.ghost.anchorB]
          const parts: string[] = [`M ${g[0]!.x} ${g[0]!.y}`]
          for (let i = 1; i < g.length; i++) parts.push(`L ${g[i]!.x} ${g[i]!.y}`)
          return <path className="edge-ghost" d={parts.join(' ')} fill="none" />
        })()}
      {/* 磁吸通道中线瞬显（signal 虚线） */}
      {props.snap !== null &&
        (props.snap.axis === 'h' ? (
          <line
            className="edge-snapline"
            x1={props.snap.at.x - SNAP_LINE_HALF}
            y1={props.snap.line}
            x2={props.snap.at.x + SNAP_LINE_HALF}
            y2={props.snap.line}
          />
        ) : (
          <line
            className="edge-snapline"
            x1={props.snap.line}
            y1={props.snap.at.y - SNAP_LINE_HALF}
            x2={props.snap.line}
            y2={props.snap.at.y + SNAP_LINE_HALF}
          />
        ))}
      {/* 穿卡警示层（同段双层：底线+警示——data-attr 软断言锚） */}
      {props.warnSegs.map((i) => (
        <path key={`w${String(i)}`} className="edge-warn" data-edge-warn={String(i)} d={segD(segOf(i))} />
      ))}
      {/* 端点圆柄（r4.5 白圆 signal 边——reconnect 拖拽源） */}
      {(['from', 'to'] as const).map((end, i) => {
        const p = end === 'from' ? pts[0]! : pts[pts.length - 1]!
        return (
          <circle
            key={end}
            data-testid="edge-handle-end"
            data-end={end}
            className="edge-handle end"
            cx={p.x}
            cy={p.y}
            r={4.5}
            onPointerDown={(e) => {
              e.stopPropagation()
              props.onEndDown(end, e.button)
            }}
            style={{ pointerEvents: 'all', cursor: 'grab' }}
            data-active={props.reconnectEnd === end ? '1' : undefined}
            data-anchor={String(i)}
          />
        )
      })}
      {/* via 方柄（8×8 白方块 accent 边——拖顶点/右键删点源）。
          [回炉 R19] magnet 实心仅被拖柄（activeVertexIdx——原吸附态全挂） */}
      {pl.via.map((v, idx) => (
        <rect
          key={`${String(v.x)},${String(v.y)},${String(idx)}`}
          data-testid="edge-handle-vertex"
          data-vertex={String(idx)}
          className={`edge-handle vertex${props.snap !== null && props.activeVertexIdx === idx ? ' magnet' : ''}`}
          x={v.x - 4}
          y={v.y - 4}
          width={8}
          height={8}
          onPointerDown={(e) => {
            e.stopPropagation()
            props.onVertexDown(idx, e.button, { x: v.x, y: v.y })
          }}
          onContextMenu={(e) => {
            e.preventDefault()
            e.stopPropagation()
            props.onVertexContext(idx, { clientX: e.clientX, clientY: e.clientY })
          }}
          style={{ pointerEvents: 'all', cursor: 'move' }}
        />
      ))}
    </g>
  )
}
