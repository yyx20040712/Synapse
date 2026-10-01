// b3: T3-P7A
/**
 * [T3-P7A] EdgeOverlay —— 连线 SVG overlay（LineageTimeline 子组件——D-22）。
 *
 * - 载体=svg.tl-edges（absolute inset:0 overflow:visible——D-1/D-2：挂
 *   .tl-content 内覆盖全内容高，与卡同文档流滚动零跟随；z 低于卡=连线
 *   永不遮卡）。每边两 path：tl-edge 可见（[F-LGRAPH-01②U8] 色纹=边内联
 *   dashed/color——A3 视觉字段直渲染，data-dashed 软标记）+tl-edge-hit
 *   透明命中层（stroke 8——D-15；**P7a 期 pointer-events:none**，编辑交互
 *   P7b 开启）。
 * - buildSnapshot/edgeVisualStyle=拆件 edge-overlay-geom.ts（路由层零 DOM import）。
 * - 重算触发 rAF 合并：shiftedIds/groups/RO(.tl-content)/edges/nodes/routeEpoch
 *   （父不动点收敛 bump）；测量冻结期（.tl-measure）不采集。
 * - routeAll 降级 onWarn=console.warn（回炉 1 W2/k1-N5——生产不静默）；
 *   paths 按 edgeId Map 配对渲染（回炉 1 W5——禁下标 zip）。
 */
import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { LineageEdge, LineageNode } from '@shared/models/lineage'
import type { TimelineYearGroup } from './lineage-timeline'
import type { EdgeGeomInput, RoutedPath } from './lineage-routing'
import { routeAll } from './lineage-routing'
import { buildSnapshot, edgeVisualStyle } from './edge-overlay-geom'
import { useEdgeEdit } from './use-edge-edit'
import { EdgeHitLayer } from './EdgeHitLayer'
import { EdgeMenuHost } from './EdgeMenuHost'
import { useLineageStore } from './lineage.store'

export function EdgeOverlay(props: {
  nodes: LineageNode[]
  edges: LineageEdge[]
  shiftedIds: ReadonlySet<string>
  groups: TimelineYearGroup[]
  /** 回炉 1 W1/W6：父组件不动点收敛/守卫分支 bump——子 effect 再触发信号 */
  routeEpoch: number
  /** [T3-P8] 拖起态连线层淡化（mockup .dimmed opacity .18——飞行脱节已知
   *  限制的掩盖面：拖起+settle transitionend 单次重算，不帧随动） */
  dimmed?: boolean
  /** [②U7/P-18] 聚焦 dim（全部线 0.3——含聚焦卡邻接线；集空由容器不挂） */
  focusDim?: boolean
  /** [T3-P7B] 命中层点击（Timeline 接 composer——handler 闸与 CSS
   *  pointer-events 双闸；React MouseEvent 结构兼容 ClickEventLike） */
  onEdgeHitClick?: (edgeId: string, ev: { clientX: number; clientY: number; stopPropagation(): void }) => void
  /** [F-LGRAPH-01②U5] 调线编辑态使能（edit 模式+select 工具——宿主注入） */
  editEnabled?: boolean
  /** [②U5] 画布空白菜单「添加节点…」（宿主注入——A11 建卡入口） */
  onAddNode?: () => void
}): JSX.Element {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [paths, setPaths] = useState<RoutedPath[]>([])
  // [回炉 R2] 悬停高亮=命中层驱动：可见层 pointer-events:none 使 :hover 恒
  // 不触发（死样式）——命中层 pointerover/out 联动可见层同键类 .hovered
  //（视觉值不变 v95-6B：宽 2.6+opacity .65 CSS 承载）
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null)
  // [②U5] 调线域 refs：路由骨架（物化/手柄几何源）+内容坐标卡 rect（锚/磁吸/穿卡）
  const pathsRef = useRef<RoutedPath[]>([])
  pathsRef.current = paths
  const edit = useEdgeEdit({ enabled: props.editEnabled === true, pathsRef, hostRef: svgRef })
  // 端点在场的边才路由（写过渡态悬空边不渲染——nodes=防御消费面）
  const live = useMemo(() => {
    const ids = new Set(props.nodes.map((n) => n.id))
    const edges = props.edges.filter((e) => ids.has(e.fromNode) && ids.has(e.toNode))
    const inputs: EdgeGeomInput[] = edges.map((e) => ({
      edgeId: e.id,
      sourceId: e.fromNode,
      targetId: e.toNode,
      // [F-LINEAGE-02] via 在场 ⇒ chain 构造 manual-override 折线（不参与
      // 车道分组与避让链——lane=−1 天然不入 laneRank）
      via: e.via
    }))
    return { edges, inputs }
  }, [props.nodes, props.edges])
  // 回炉 1 W5：paths 按.edgeId 配对（Map 查找替下标 zip）
  const edgeById = useMemo(() => new Map(live.edges.map((e) => [e.id, e] as const)), [live])
  // [F-LINEAGE-02 裁决 6/W-4] manual 边渲染序排 DOM 末位（同层组内稳定分区
  // ——自动边保序在前）：命中层恒最上，手动横段与自动边同带重叠时选中/拖拽
  // 恒先命中手动边
  const orderedPaths = useMemo(() => {
    const auto: RoutedPath[] = []
    const manual: RoutedPath[] = []
    for (const p of paths) (p.route === 'manual-override' ? manual : auto).push(p)
    return [...auto, ...manual]
  }, [paths])
  // [T3-P7B] 同道错峰（D-P7B-8）：lane≥0 路径按车道内 edgeId 字典序排名
  // i≥1 → opacity=max(0.6,1−0.15×i)（同道重叠边视觉可分——纯渲染确定性微差；
  // lane=-1[direct/h-slip/band/fallback/manual-override——甲链非走廊态] 不参与）
  const laneRank = useMemo(() => {
    const byLane = new Map<number, string[]>()
    for (const p of paths) {
      if (p.lane < 0) continue
      const list = byLane.get(p.lane) ?? []
      list.push(p.edgeId)
      byLane.set(p.lane, list)
    }
    const rank = new Map<string, number>()
    for (const ids of byLane.values()) {
      ids.sort().forEach((id, i) => rank.set(id, i))
    }
    return rank
  }, [paths])

  useLayoutEffect(() => {
    const content = svgRef.current?.parentElement
    if (!(content instanceof HTMLElement)) return
    let raf = 0
    const run = (): void => {
      raf = 0
      if (content.classList.contains('tl-measure')) return // 冻结期旧路径由 CSS 隐去
      setPaths(routeAll(live.inputs, buildSnapshot(content), (msg) => console.warn(msg)))
    }
    raf = requestAnimationFrame(run)
    const ro =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(() => {
            if (raf !== 0) cancelAnimationFrame(raf)
            raf = requestAnimationFrame(run)
          })
    ro?.observe(content)
    return () => {
      if (raf !== 0) cancelAnimationFrame(raf)
      ro?.disconnect()
    }
  }, [live, props.shiftedIds, props.groups, props.routeEpoch])

  /** [②U5] 菜单动作收口（store 单口——一动作=一编辑单元沿 store 各方法） */
  const selEdge =
    edit.state.phase === 'idle'
      ? null
      : useLineageStore.getState().edges.find((e) => e.id === (edit.state as { edgeId: string }).edgeId) ?? null

  return (
    <>
    <svg
      className={
        props.dimmed === true
          ? 'tl-edges dimmed'
          : props.focusDim === true
            ? 'tl-edges dimmed-focus'
            : 'tl-edges'
      }
      ref={svgRef}
      data-testid="tl-edges"
    >
      {orderedPaths.map((p) => {
        const e = edgeById.get(p.edgeId)
        if (e === undefined) return null
        const i = laneRank.get(p.edgeId)
        const fade = i !== undefined && i >= 1 ? Math.max(0.6, 1 - 0.15 * i) : undefined
        const selected = edit.state.phase !== 'idle' && edit.state.edgeId === p.edgeId
        const hovered = props.editEnabled === true && hoveredEdgeId === p.edgeId && !selected
        const visual = fade === undefined ? edgeVisualStyle(e) : { ...edgeVisualStyle(e), opacity: fade }
        return (
          <g key={p.edgeId}>
            <path
              className={hovered ? 'tl-edge hovered' : selected ? 'tl-edge selected' : 'tl-edge'}
              data-edge-id={p.edgeId}
              data-dashed={e.dashed ? '1' : '0'}
              d={p.d}
              style={selected ? { ...visual, stroke: 'var(--accent)', strokeWidth: 2.2 } : visual}
            />
          </g>
        )
      })}
    </svg>
    {/* [②U5] 命中层（z4=年段/卡之上——真实浏览器命中可达；编辑态 stroke）
        ——拆件 EdgeHitLayer（[回炉后拆] 组件 250 行红线：命中分派+悬停联动+
        手柄集） */}
    <EdgeHitLayer
      paths={orderedPaths}
      edgeById={edgeById}
      editEnabled={props.editEnabled === true}
      edit={edit}
      hostRef={svgRef}
      onEdgeHitClick={props.onEdgeHitClick}
      onHoverChange={(id, entering) =>
        setHoveredEdgeId((cur) => (entering ? id : cur === id ? null : cur))
      }
    />
    {/* [②U5] 画布空白菜单（右键空白=无对象高亮——mockup §3.6） */}
    {props.editEnabled === true && (
      <div
        style={{ position: 'absolute', inset: 0, zIndex: 0 }}
        data-testid="edge-canvas-ctx"
        onContextMenu={(ev) => {
          const t = ev.target
          if (t instanceof Element && (t.closest('.tl-edge-hit') !== null || t.closest('.edge-handle') !== null || t.closest('.tl-card') !== null)) return
          ev.preventDefault()
          if (props.editEnabled === true) {
            edit.openCanvasMenu(ev.clientX, ev.clientY)
          }
        }}
      />
    )}
    {/* [②U5] 调线菜单宿主（线/顶点/画布三态——动作收口拆件 EdgeMenuHost）；
        [RR1] canvas 态免 selEdge（原 selEdge!==null 恒闸=idle 态画布菜单死路） */}
    {edit.menu !== null && (edit.menu.kind === 'canvas' || selEdge !== null) && (
      <EdgeMenuHost
        target={edit.menu}
        selEdge={selEdge}
        handlesPl={edit.handlesPl}
        onAddNode={() => props.onAddNode?.()}
        onClose={edit.closeMenu}
      />
    )}
    </>
  )
}
