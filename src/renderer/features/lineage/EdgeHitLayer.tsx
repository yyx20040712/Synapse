// b3: P7-H
/**
 * [F-LGRAPH-01②U5] EdgeHitLayer —— 连线命中层（EdgeOverlay 拆件——组件
 * 250 行红线）：z4 层透明命中 path 集（编辑态 pointer-events:stroke——CSS
 * 双闸）+点击/双击/右键/按下分派+[回炉 R2] 悬停联动（hoveredEdgeId 上浮
 * 可见层挂同键类）+手柄集驻层内最上（EdgeHandles）。
 * [RR5] focus 态 hover 扫描：hoverScan=true 时 document pointermove 数学
 * 命中（段投影距离 ≤SCAN_R 内容坐标）驱动同一 onHoverChange 联动——
 * pointer-events 策略=命中层保持 focus 态关闭（.timeline.editing 专属开
 * 启），零 pointer-events 变更=卡点击零抢占（扫描只读不消费事件）。
 */
import { useEffect } from 'react'
import type { LineageEdge } from '@shared/models/lineage'
import type { RoutedPath } from './lineage-routing'
import { contentScale, toContentPt } from './timeline-zoom'
import type { useEdgeEdit } from './use-edge-edit'
import { EdgeHandles } from './EdgeHandles'

type EditApi = ReturnType<typeof useEdgeEdit>

/** [RR5] hover 扫描半径（内容坐标——编辑态命中层 stroke 8 半宽对齐） */
const SCAN_HOVER_R = 4

export function EdgeHitLayer(props: {
  paths: RoutedPath[]
  edgeById: Map<string, LineageEdge>
  editEnabled: boolean
  edit: EditApi
  /** 可见层 svg ref（parentElement=.tl-content——坐标换算锚） */
  hostRef: React.RefObject<SVGSVGElement | null>
  onEdgeHitClick?: (edgeId: string, ev: { clientX: number; clientY: number; stopPropagation(): void }) => void
  /** [R2] 悬停联动（entering=false 撤同键——仅当前键）；[RR5] focus 扫描同驱动 */
  onHoverChange(edgeId: string, entering: boolean): void
  /** [RR5] focus dim 态激活 hover 扫描（document pointermove 数学命中） */
  hoverScan?: boolean
}): JSX.Element {
  const { edit } = props

  // [RR5] focus 态 hover 扫描：paths 骨架点链逐段投影距离（≤4）取最近边；
  // 指针离线即撤（同 document 面驱动——零 pointer-events 变更）
  useEffect(() => {
    if (props.hoverScan !== true) return
    let lastId: string | null = null
    const onMove = (ev: PointerEvent | MouseEvent): void => {
      const content = props.hostRef.current?.parentElement
      if (!(content instanceof HTMLElement)) return
      const p = toContentPt(content.getBoundingClientRect(), ev.clientX, ev.clientY, contentScale())
      let bestId: string | null = null
      let bestD = SCAN_HOVER_R
      for (const path of props.paths) {
        for (let i = 0; i < path.pts.length - 1; i++) {
          const a = path.pts[i]!
          const b = path.pts[i + 1]!
          const qx = Math.max(Math.min(a.x, b.x), Math.min(p.x, Math.max(a.x, b.x)))
          const qy = Math.max(Math.min(a.y, b.y), Math.min(p.y, Math.max(a.y, b.y)))
          const d = Math.hypot(p.x - qx, p.y - qy)
          if (d < bestD) {
            bestD = d
            bestId = path.edgeId
          }
        }
      }
      if (bestId !== lastId) {
        if (lastId !== null) props.onHoverChange(lastId, false)
        if (bestId !== null) props.onHoverChange(bestId, true)
        lastId = bestId
      }
    }
    document.addEventListener('pointermove', onMove)
    return () => {
      document.removeEventListener('pointermove', onMove)
      if (lastId !== null) props.onHoverChange(lastId, false)
    }
  }, [props.hoverScan, props.paths, props.hostRef, props.onHoverChange])

  return (
    <svg className="tl-edge-hits" data-testid="tl-edge-hits">
      {props.paths.map((p) => {
        const e = props.edgeById.get(p.edgeId)
        if (e === undefined) return null
        return (
          <path
            key={p.edgeId}
            className="tl-edge-hit"
            data-edge-id={p.edgeId}
            d={p.d}
            onClick={(ev) => {
              props.onEdgeHitClick?.(p.edgeId, ev)
              if (props.editEnabled) edit.onEdgeHitClick(p.edgeId)
            }}
            onDoubleClick={(ev) => {
              if (props.editEnabled !== true) return
              const content = props.hostRef.current?.parentElement
              if (!(content instanceof HTMLElement)) return
              const base = content.getBoundingClientRect()
              edit.onEdgeHitDbl(p.edgeId, toContentPt(base, ev.clientX, ev.clientY))
            }}
            onPointerDown={(ev) => {
              if (props.editEnabled !== true) return
              // [②U5] 右键按下即高亮=瞬选（菜单随 contextmenu 事件开——两拍）
              if (ev.button === 2) edit.select(p.edgeId)
              else if (ev.button === 0 && edit.state.phase === 'selected' && edit.state.edgeId === p.edgeId) {
                const content = props.hostRef.current?.parentElement
                if (content instanceof HTMLElement) {
                  edit.onSegDown(toContentPt(content.getBoundingClientRect(), ev.clientX, ev.clientY), 0)
                }
              }
            }}
            onContextMenu={(ev) => {
              if (props.editEnabled !== true) return
              ev.preventDefault()
              // 菜单开=选中+目标标识（标题行「线「名」● 命中」——onEdgeHitDown 承载）
              edit.onEdgeHitDown(p.edgeId, { x: 0, y: 0 }, 2, ev.clientX, ev.clientY)
            }}
            onPointerOver={() => {
              if (props.editEnabled !== true) return
              props.onHoverChange(p.edgeId, true)
            }}
            onPointerOut={() => {
              if (props.editEnabled !== true) return
              props.onHoverChange(p.edgeId, false)
            }}
          />
        )
      })}
      {/* [②U5] 手柄集（驻命中层最上——selected/dragging/reconnect：via 方柄+
          端点圆柄+虚影+磁吸指示+穿卡警示；零持久化） */}
      {edit.handlesPl !== null && (
        <EdgeHandles
          pl={edit.handlesPl}
          ghost={edit.ghostPl}
          snap={edit.snapLine !== null && edit.snapAt !== null ? { ...edit.snapLine, at: edit.snapAt } : null}
          activeVertexIdx={edit.activeVertexIdx}
          warnSegs={edit.warnSegs}
          reconnectEnd={edit.state.phase === 'reconnect' ? edit.state.end : null}
          onVertexDown={edit.onVertexDown}
          onVertexContext={(idx, ev) => edit.onVertexContext(idx, ev.clientX, ev.clientY)}
          onEndDown={edit.onEndDown}
        />
      )}
    </svg>
  )
}
