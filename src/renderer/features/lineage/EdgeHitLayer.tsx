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
 * [F-VISFB-23 N2] browse 态线名扫描：browseScan=true 时 document
 * pointermove rAF 节流+pointerleave 即清，命中上报 BrowseEdgeHover（真实
 * label+指针 client 域坐标）；非 browse 态零监听（效应闸）。
 */
import { useEffect } from 'react'
import type { LineageEdge } from '@shared/models/lineage'
import type { RoutedPath } from './lineage-routing'
import { clientToOwnPt } from './timeline-zoom'
import type { useEdgeEdit } from './use-edge-edit'
import { EdgeHandles } from './EdgeHandles'

type EditApi = ReturnType<typeof useEdgeEdit>

/** [RR5] hover 扫描半径（own 域 px——编辑态命中层 stroke 8 半宽对齐；
 *  [F-VISFB-31] 指针换算÷s_eff=own 域与 path.pts 同系） */
const SCAN_HOVER_R = 4

/** [F-VISFB-23] browse 态悬停载荷（edgeId+真实 label+指针 client 域坐标） */
export interface BrowseEdgeHover {
  edgeId: string
  label: string
  x: number
  y: number
}

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
  /** [F-VISFB-23 N2] browse 态激活线名扫描（rAF 节流——非 browse 零监听） */
  browseScan?: boolean
  /** [F-VISFB-23 N2] browse 悬停上报（null=离线/清场；坐标=指针 client 域） */
  onBrowseHover(hover: BrowseEdgeHover | null): void
}): JSX.Element {
  const { edit } = props

  // [RR5] focus 态 hover 扫描：paths 骨架点链逐段真投影距离（≤4——[回炉1
  // B-1 主控授权接缝同修] 原实现=包围盒独立 clamp（头注自称「投影」与实现
  // 互斥——同 B-1 缺陷族）；指针离线即撤（零 pointer-events 变更）
  useEffect(() => {
    if (props.hoverScan !== true) return
    let lastId: string | null = null
    const onMove = (ev: PointerEvent | MouseEvent): void => {
      const content = props.hostRef.current?.parentElement
      if (!(content instanceof HTMLElement)) return
      const p = clientToOwnPt(content.getBoundingClientRect(), ev.clientX, ev.clientY)
      let bestId: string | null = null
      let bestD = SCAN_HOVER_R
      for (const path of props.paths) {
        for (let i = 0; i < path.pts.length - 1; i++) {
          const a = path.pts[i]!
          const b = path.pts[i + 1]!
          // [回炉1 B-1] 真点到线段投影距离（同 browse 效应——Rule of Three
          // 第 3 处前置同族修：两效应节流/上报面不同构，几何核保持同构重复）
          const abx = b.x - a.x
          const aby = b.y - a.y
          const lenSq = abx * abx + aby * aby
          const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * abx + (p.y - a.y) * aby) / lenSq))
          const qx = a.x + abx * t
          const qy = a.y + aby * t
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

  // [F-VISFB-23 N2] browse 态线名扫描：pointermove 只记最新点+挂单帧 rAF
  // （每帧至多一次扫描——事件合并）+pointerleave 即清；几何命中体与上方
  // [RR5] focus 扫描同构（Rule of Three 第 2 处保持重复——节流/上报不同构）
  useEffect(() => {
    if (props.browseScan !== true) return
    let raf = 0
    let pending: { x: number; y: number } | null = null
    let hoverId: string | null = null
    const clear = (): void => {
      if (hoverId !== null) {
        hoverId = null
        props.onBrowseHover(null)
      }
    }
    const run = (): void => {
      raf = 0
      const pt = pending
      pending = null
      if (pt === null) return
      const content = props.hostRef.current?.parentElement
      if (!(content instanceof HTMLElement)) {
        clear()
        return
      }
      const p = clientToOwnPt(content.getBoundingClientRect(), pt.x, pt.y)
      let bestId: string | null = null
      let bestD = SCAN_HOVER_R
      for (const path of props.paths) {
        for (let i = 0; i < path.pts.length - 1; i++) {
          const a = path.pts[i]!
          const b = path.pts[i + 1]!
          // [回炉1 B-1] 真点到线段投影距离（t=clamp 投影比→最近点→hypot；
          // 零长段 lenSq=0 → t=0=到点距离）——原包围盒独立 clamp 得 bbox
          // 最近角，斜段下误命中（门一 k1）
          const abx = b.x - a.x
          const aby = b.y - a.y
          const lenSq = abx * abx + aby * aby
          const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * abx + (p.y - a.y) * aby) / lenSq))
          const qx = a.x + abx * t
          const qy = a.y + aby * t
          const d = Math.hypot(p.x - qx, p.y - qy)
          if (d < bestD) {
            bestD = d
            bestId = path.edgeId
          }
        }
      }
      if (bestId === null) {
        clear()
        return
      }
      hoverId = bestId
      props.onBrowseHover({ edgeId: bestId, label: props.edgeById.get(bestId)?.label ?? '', x: pt.x, y: pt.y })
    }
    const onMove = (ev: PointerEvent | MouseEvent): void => {
      pending = { x: ev.clientX, y: ev.clientY }
      if (raf === 0) raf = requestAnimationFrame(run)
    }
    const onLeave = (): void => {
      pending = null
      if (raf !== 0) {
        cancelAnimationFrame(raf)
        raf = 0
      }
      clear()
    }
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerleave', onLeave)
    return () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerleave', onLeave)
      if (raf !== 0) cancelAnimationFrame(raf)
      clear()
    }
  }, [props.browseScan, props.paths, props.hostRef, props.onBrowseHover, props.edgeById])

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
              edit.onEdgeHitDbl(p.edgeId, clientToOwnPt(base, ev.clientX, ev.clientY))
            }}
            onPointerDown={(ev) => {
              if (props.editEnabled !== true) return
              // [②U5] 右键按下即高亮=瞬选（菜单随 contextmenu 事件开——两拍）
              if (ev.button === 2) edit.select(p.edgeId)
              else if (ev.button === 0 && edit.state.phase === 'selected' && edit.state.edgeId === p.edgeId) {
                const content = props.hostRef.current?.parentElement
                if (content instanceof HTMLElement) {
                  edit.onSegDown(clientToOwnPt(content.getBoundingClientRect(), ev.clientX, ev.clientY), 0)
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
