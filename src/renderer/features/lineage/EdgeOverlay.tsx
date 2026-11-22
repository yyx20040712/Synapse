// b3: T3-P7A
/**
 * [T3-P7A] EdgeOverlay —— 连线 SVG overlay（LineageTimeline 子组件——D-22）。
 *
 * - 载体=svg.tl-edges（absolute inset:0 overflow:visible——D-1/D-2：挂
 *   .tl-content 内覆盖全内容高，与卡同文档流滚动零跟随；z 低于卡=连线
 *   永不遮卡）。每条可行走线边两 path：tl-edge 可见（[F-LGRAPH-01②U8] 色纹=边内联
 *   dashed/color——A3 视觉字段直渲染，data-dashed 软标记）+tl-edge-hit
 *   透明命中层（stroke 8——D-15；**P7a 期 pointer-events:none**，编辑交互
 *   P7b 开启）。blocked 线/命中区不渲染，无几何元数据保留锚占用；提示与重算归 use-lineage-routes。
 * - buildSnapshot/edgeVisualStyle=拆件 edge-overlay-geom.ts（路由层零 DOM import）。
 * - 重算触发 rAF 合并：shiftedIds/groups/RO(.tl-content)/edges/nodes/routeEpoch
 *   （父布局变更 bump——use-capacity-layout W 变/拖拽 settle；[F-SLOTGRID-01
 *   U1] 瀑布测量冻结期〔.tl-measure〕守卫随瀑布退役删除）。
 *   [F-SLOTGRID-01 U2] shiftedIds=瀑布错位卡集遗留 prop 面：瀑布语义退役后
 *   调用方恒传模块级空集（引用稳定=deps 零扰动）——行为面恒空占位沿承，
 *   删除 prop 须动 LineageTimeline（U1 产出件非本票文件面）故本票保守留驻。
 * - routeAll 降级 onWarn=console.warn（回炉 1 W2/k1-N5——生产不静默）；
 *   paths 按 edgeId Map 配对渲染（回炉 1 W5——禁下标 zip）。
 */
import { useCallback, useMemo, useRef, useState } from 'react'
import type { LineageEdge, LineageNode, LineageViaPoint } from '@shared/models/lineage'
import type { TimelineYearGroup } from './lineage-timeline'
import type { EdgeGeomInput, RoutedPath } from './lineage-routing'
import { commitEdgeVia } from './edge-via-commit'
import { edgeVisualOpacity, edgeVisualStyle, pinOf } from './edge-overlay-geom'
import { isEdgeDimmed } from './focus-bright'
import { useLineageRoutes } from './use-lineage-routes'
import { useEdgeEdit } from './use-edge-edit'
import { EdgeHitLayer, type BrowseEdgeHover } from './EdgeHitLayer'
import { EdgeMenuHost } from './EdgeMenuHost'
import { EdgeTooltip } from './EdgeTooltip'
import { useLineageStore } from './lineage.store'

export function EdgeOverlay(props: {
  nodes: LineageNode[]
  edges: LineageEdge[]
  shiftedIds: ReadonlySet<string>
  groups: TimelineYearGroup[]
  /** 回炉 1 W1/W6：父组件布局变更（W 变/拖拽 settle）bump——子 effect 再触发信号 */
  routeEpoch: number
  /** [T3-P8] 拖起态连线层淡化（mockup .dimmed opacity .18——飞行脱节已知
   *  限制的掩盖面：拖起期挂起路由重算，布局终局单次重算，不帧随动） */
  dimmed?: boolean
  /** [②U7/P-18] 聚焦 dim 激活（根类 .dimmed-focus 态标记；集空由容器不挂）；
   *  [F-VISFB-21 C4] 逐径 dim 判定集=brightIds——两端均非 bright 才 dim（至
   *  少一端 bright 常亮）；缺省（独立渲染无判定集）回落全 dim 沿承 */
  focusDim?: boolean
  /** [F-VISFB-21 C4] bright 集（focus∪双向一度邻接——宿主 LineageTimeline
   *  自 focus-bright 单源传入；focusDim 激活时随附） */
  brightIds?: ReadonlySet<string> | null
  /** [T3-P7B] 命中层点击（Timeline 接 composer——handler 闸与 CSS
   *  pointer-events 双闸；React MouseEvent 结构兼容 ClickEventLike） */
  onEdgeHitClick?: (edgeId: string, ev: { clientX: number; clientY: number; stopPropagation(): void }) => void
  /** [F-LGRAPH-01②U5] 调线编辑态使能（edit 模式+select 工具——宿主注入） */
  editEnabled?: boolean
  /** [F-VISFB-23 N2] browse 态激活线名扫描（rAF 节流 hover→tooltip——宿主注入） */
  browseScan?: boolean
  /** [F-VISFB-31] uiScale 数值（UI_SCALE 档位映射——重算键专用：uiScale 变更
   *  时 W 未必变（布局可同宽），快照÷s_eff 因子仍须重算+调线域卡 rect 重采集；
   *  数值本体不消费（buildSnapshot/换算器判定时点自读 effectiveScale）） */
  uiScale?: number
  /** [B3 §3.5] 挂起窗 getter（拖拽会话 dragging 激活起→布局终局止——宿主
   *  LineageTimeline 经 useCardDrag 稳定引用透传；run/rAF 执行前查位，挂起期
   *  不 buildSnapshot/setPaths/publish，RO 保持连接不 disconnect） */
  isSuspended?: () => boolean
}): JSX.Element {
  const svgRef = useRef<SVGSVGElement | null>(null)
  // [回炉 R2] 悬停高亮=命中层驱动：可见层 pointer-events:none 使 :hover 恒
  // 不触发（死样式）——命中层 pointerover/out 联动可见层同键类 .hovered
  //（视觉值不变 v95-6B：宽 2.6+opacity .65 CSS 承载）；[RR5] focus 态经
  // hoverScan（document pointermove 数学命中）同驱动
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null)
  const handleHoverChange = useCallback(
    (id: string, entering: boolean): void => setHoveredEdgeId((cur) => (entering ? id : cur === id ? null : cur)),
    []
  )
  // [F-VISFB-23 N2] browse 悬停态（线名 tooltip 数据源=真实 label——空串渲染
  // 门在 JSX：空线名零展示面）
  const [browseHover, setBrowseHover] = useState<BrowseEdgeHover | null>(null)
  const handleBrowseHover = useCallback((h: BrowseEdgeHover | null): void => setBrowseHover(h), [])
  const focused = props.focusDim === true
  // 端点在场的边才路由（写过渡态悬空边不渲染——nodes=防御消费面）
  const live = useMemo(() => {
    const ids = new Set(props.nodes.map((n) => n.id))
    const edges = props.edges.filter((e) => ids.has(e.fromNode) && ids.has(e.toNode))
    const inputs: EdgeGeomInput[] = edges.map((e) => {
      // [F-VISFB-66] 端点钉定锚装配（读锚列——pinOf 自检失败按未钉定+warn）
      const fa = pinOf(e.fromAnchor)
      const ta = pinOf(e.toAnchor)
      return {
        edgeId: e.id,
        sourceId: e.fromNode,
        targetId: e.toNode,
        // [F-LINEAGE-02] via 在场 ⇒ chain 构造 manual-override 折线（〔B3b
        // §11-1 甲〕净空段登记车道占用+锚 commit 供后续自动边避让——manual
        // 自身永不被占用阻塞；无 laneMarks 观测=缺省）
        via: e.via,
        ...(fa !== undefined ? { fromAnchor: fa } : {}),
        ...(ta !== undefined ? { toAnchor: ta } : {})
      }
    })
    return { edges, inputs }
  }, [props.nodes, props.edges])
  const paths = useLineageRoutes({
    hostRef: svgRef,
    inputs: live.inputs,
    shiftedIds: props.shiftedIds,
    groups: props.groups,
    routeEpoch: props.routeEpoch,
    uiScale: props.uiScale,
    isSuspended: props.isSuspended
  })
  // [②U5] 调线域 refs：路由骨架（物化/手柄几何源）+内容坐标卡 rect（锚/磁吸/穿卡）
  const pathsRef = useRef<RoutedPath[]>([])
  pathsRef.current = paths
  // [RR8] 调线域重采集键（布局/路由变化信号——卡 rect/换算器刷新闸；状态
  // only 渲染[拖拽 move/悬停]不重采集）；[F-VISFB-31] uiScale 入键（own 域
  // 采集因子随档重读）
  const editRecomputeKey = useMemo(
    () => [props.nodes, props.edges, props.groups, props.routeEpoch, props.shiftedIds, paths, props.uiScale] as const,
    [props.nodes, props.edges, props.groups, props.routeEpoch, props.shiftedIds, paths, props.uiScale]
  )
  const edit = useEdgeEdit({ enabled: props.editEnabled === true, pathsRef, hostRef: svgRef, recomputeKey: editRecomputeKey })
  // 回炉 1 W5：paths 按.edgeId 配对（Map 查找替下标 zip）
  const edgeById = useMemo(() => new Map(live.edges.map((e) => [e.id, e] as const)), [live])
  // [F-LINEAGE-02 裁决 6/W-4] manual 边渲染序排 DOM 末位（同层组内稳定分区
  // ——自动边保序在前）：命中层恒最上，手动横段与自动边同带重叠时选中/拖拽
  // 恒先命中手动边
  const orderedPaths = useMemo(() => {
    const auto: RoutedPath[] = []
    const manual: RoutedPath[] = []
    for (const p of paths) {
      if (p.clearance === 'blocked') continue
      const bucket = p.route === 'manual-override' ? manual : auto
      bucket.push(p)
    }
    return [...auto, ...manual]
  }, [paths])

  /** [②U5] 菜单动作收口（store 单口——一动作=一编辑单元沿 store 各方法） */
  const selEdge =
    edit.state.phase === 'idle'
      ? null
      : useLineageStore.getState().edges.find((e) => e.id === (edit.state as { edgeId: string }).edgeId) ?? null
  /** [R2-C3] 菜单 via 动作（删点/重置）统一提交门（非法回弹+清除回自动） */
  const commitVia = useCallback(
    (via: LineageViaPoint[] | null): void => {
      if (selEdge === null) return
      commitEdgeVia({ host: svgRef.current, edge: selEdge, via })
    },
    [selEdge]
  )

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
      {paths.map((p) =>
        p.clearance === 'blocked' ? (
          // 无几何元数据节点：锚占用跟随边数据，不复活可见线或命中区。
          <g key={`blocked-${p.edgeId}`} className="tl-edge-blocked" data-edge-id={p.edgeId} data-anchors={p.anchorMarks} data-clearance="blocked" />
        ) : null
      )}
      {orderedPaths.map((p) => {
        const e = edgeById.get(p.edgeId)
        if (e === undefined) return null
        const selected = edit.state.phase !== 'idle' && edit.state.edgeId === p.edgeId
        // [RR5] hovered 联动扩 focus 态（P-12/P-18 定案含线——scan 驱动）
        const hovered = hoveredEdgeId === p.edgeId && !selected && (props.editEnabled === true || focused)
        // [F-VISFB-21 C4] 逐径 dim 判定：两端均非 bright 才 dim（至少一端
        // bright 常亮——判定集=brightIds；缺省回落全 dim=独立渲染防御面）
        const dimmed = focused && (props.brightIds == null || isEdgeDimmed(e, props.brightIds))
        // [RR10] hovered 回升 0.65 并入 inline（单源 edge-overlay-geom
        //  edgeVisualOpacity；dim 态恒类承载）
        const opacity = edgeVisualOpacity({ hovered, focusDim: dimmed })
        const visual = opacity === undefined ? edgeVisualStyle(e) : { ...edgeVisualStyle(e), opacity }
        const cls = selected
          ? 'tl-edge selected'
          : hovered
            ? dimmed
              ? 'tl-edge dim hovered'
              : 'tl-edge hovered'
            : dimmed
              ? 'tl-edge dim'
              : 'tl-edge'
        return (
          <g key={p.edgeId}>
            <path
              className={cls}
              data-edge-id={p.edgeId}
              data-dashed={e.dashed ? '1' : '0'}
              data-route={p.route}
              data-lane={p.laneMarks}
              data-anchors={p.anchorMarks}
              data-overlap-exempt={p.overlapExempt === true ? '1' : undefined}
              data-overlap-spans={p.overlapSpans !== undefined && p.overlapSpans.length > 0 ? p.overlapSpans.join(',') : undefined}
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
      onHoverChange={handleHoverChange}
      hoverScan={focused}
      browseScan={props.browseScan === true}
      onBrowseHover={handleBrowseHover}
    />
    {/* [F-VISFB-23 N2] browse 线名 tooltip（portal 出内容层——fixed 视口基准） */}
    {browseHover !== null && browseHover.label !== '' && (
      <EdgeTooltip label={browseHover.label} x={browseHover.x} y={browseHover.y} />
    )}
    {/* [F-ALIGN-01] 画布空白菜单随「建点入口…」唯一菜单项退役删除（组空
        =菜单项区一并处置，禁留空壳组；线/顶点两态菜单不动） */}
    {/* [②U5] 调线菜单宿主（线/顶点两态——动作收口拆件 EdgeMenuHost）；
        [RR1] 顶点/线身态动作经 null 守卫 */}
    {edit.menu !== null && selEdge !== null && (
      <EdgeMenuHost
        target={edit.menu}
        selEdge={selEdge}
        handlesPl={edit.handlesPl}
        onCommitVia={commitVia}
        onClose={edit.closeMenu}
      />
    )}
    </>
  )
}
