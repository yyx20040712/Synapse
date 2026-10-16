// b3: T3-P6
/**
 * [T3-P6] LineageTimeline —— 纵向「年+月」时间线滚动容器宿主。
 *
 * - 分组=lineage-timeline.ts groupTimeline 纯函数（INV-75 消费方不得重排）；
 *   年/月/卡渲染体=TimelineYears 拆件（核徽章链随②U4 退役）。
 * - [F-SLOTGRID-01 U1] 布局=W 量测（use-capacity-layout 拆件——行容器网格
 *   分行见 TimelineYears/capacity.ts）；瀑布不动点迭代（timeline-waterfall）
 *   随本批退役删除。工具条 sticky 驻渲染树——本件触 store 仅限 view.store
 *   （数据域纯 props 可直测）。
 * - [F-VISFB-22 P2 闸②] 交互域拆件=timeline-interactions.ts（回调契约
 *   TimelineCallbacks+聚焦三派生+根容器类名+卡点击/星标分派——行为零变）。
 */
import { useMemo, useRef } from 'react'
import { nodePubNoMap, type LineageEdge, type LineageNode } from '@shared/models/lineage'
import type { LineagePaperMetrics } from '@shared/ipc/schemas'
import { groupTimeline } from './lineage-timeline'
import { EdgeOverlay } from './EdgeOverlay'
import { TimelineYears } from './TimelineYears'
import { LineageToolbar } from './LineageToolbar'
import { useCardDrag } from './useCardDrag'
import { useDrawLine } from './useDrawLine'
import { DrawLayers } from './DrawLayers'
import { useLineageViewStore } from './lineage-view.store'
import { useTimelineNavSync } from './timeline-nav-sync'
import { useCapacityLayout } from './use-capacity-layout'
import { useTimelinePan } from './timeline-pan'
import { useTimelineZoom } from './timeline-zoom-hook'
import { ZoomBadge } from './ZoomBadge'
import { createTimelineCardHandlers, timelineClassOf, useTimelineFocusSets, type TimelineCallbacks } from './timeline-interactions'

/** [F-ALIGN-01] 工具条 props 面随建点入口退役删除（TimelineToolbarProps
 *  唯一成员=onAddNode 对话框开关——工具组其余控件直连双 store，容器零注入） */

/** [F-SLOTGRID-01 U1] EdgeOverlay shiftedIds 恒空集（瀑布错位卡集随瀑布
 *  退役绝源——prop 面留驻待 U2 走线重基线处置；模块级常量=引用稳定，
 *  EdgeOverlay effect deps 消费面零扰动） */
const EMPTY_SHIFTED: ReadonlySet<string> = new Set()

export function LineageTimeline(props: {
  nodes: LineageNode[]
  edges: LineageEdge[]
  selectedNodeId?: string | null
  /** [F-LGRAPH-01②U5] 右键反馈④：节点菜单在场=目标卡 accent 描边（菜单关
   *  闭即撤——Board menu 态单源） */
  contextNodeId?: string | null
  /** F-LG14 含金量摘要表（键=paperId；Board 自 store 分发传入；缺省=空表） */
  paperMetrics?: Record<string, LineagePaperMetrics>
  /** [F-FOLDER-01] pubNo 表（键=paperId；INV-92 库级派生——图内节点号与库号
   *  同源单一真相源；Board 自 store 分发传入；缺省=空表） */
  pubNos?: Record<string, number>
  /** [A1a] 文献库标签名组表（键=paperId，值=名序标签名——卡标签行数据源
   *  [换源：node.tags 私有域退役接替]；Board 自 store 分发传入；缺省=空表） */
  tagNames?: Record<string, string[]>
} & TimelineCallbacks): JSX.Element {
  const { nodes, edges } = props
  const paperMetrics = props.paperMetrics ?? {}
  const pubNos = props.pubNos ?? {}
  const tagNames = props.tagNames ?? {}
  const groups = useMemo(() => groupTimeline(nodes), [nodes])
  const pubNoByNode = useMemo(() => nodePubNoMap(nodes, pubNos), [nodes, pubNos])

  // [F-LGRAPH-01①U3] 模式态单源=lineage-view.store（三模式栏 LineageModeBar
  // 写路径）
  const viewMode = useLineageViewStore((s) => s.mode)
  // [F-VISFB-22 P2 闸②] 聚焦三派生=timeline-interactions 拆件（行为零变）
  const { focusIds, brightIds, dimActive } = useTimelineFocusSets(edges)
  // [②U3] 画线工具态（draw-*=armed——卡拖拽闸+预览线色源）
  const tool = useLineageViewStore((s) => s.tool)
  const currentLineColor = useLineageViewStore((s) => s.currentLineColor)
  // [F-UIRES-03 C2·P2/P5] 缩放系数（高亮 r=6/z zoom 补偿——屏幕域直径恒 12）
  // +点两卡链锚（迁 view.store——.link-src 消费源；dragging 相位=会话源锚沿承）
  const zoomScale = useLineageViewStore((s) => s.zoom)
  const drawAnchor = useLineageViewStore((s) => s.anchor)

  // 滚动容器 ref 两面：content=.tl-content（W 量测）/timeline=根（导航+平移）
  const contentRef = useRef<HTMLDivElement | null>(null)
  const timelineRef = useRef<HTMLDivElement | null>(null)
  // 拖拽清场→routeEpoch 前置接线（hook 初始化序约束——ref 晚绑定）
  const bumpRouteRef = useRef<() => void>(() => undefined)

  // [②U3] 画线子态机（armed=工具态；容器 pointer 流——拖拽互斥闸）
  const draw = useDrawLine({ contentRef })
  const drawing = tool !== 'select'
  // [T3-P8] 槽位拖拽状态机（编排本体驻 hook——Timeline 增量红线）；
  // [F-UIRES-03 C3] 改月域（弹层/预演）随改月链退役——groups 直用
  const drag = useCardDrag({
    nodes,
    isEditing: viewMode === 'edit',
    isPicking: drawing, // [②U3] 画线 armed=拖拽闸（拾取优先沿承——重命名申报）
    popOpen: false,
    contentRef,
    onReorderMonthSlots: props.onReorderMonthSlots,
    onRouteRecalc: () => bumpRouteRef.current()
  })
  // [F-SLOTGRID-01 U1] W 量测+布局变更信号（机制本体=use-capacity-layout.ts
  // 拆件——组件 250 行红线；unmeasured 降级/rAF 合并细节见该件头注）
  const layout = useCapacityLayout({ contentRef, recomputeKey: groups })
  const { frameW, routeEpoch } = layout
  bumpRouteRef.current = layout.bumpRoute
  // [F-LGRAPH-01①U4] 导航窗格联动：索引点击定位+当前月上报（重算键=渲染组）
  useTimelineNavSync(timelineRef, groups)
  // [F-LGRAPH-01①U5] 平移小手：browse/focus 拖空白=滚动跟随（edit 不平移）
  const pan = useTimelinePan({
    enabled: viewMode === 'browse' || viewMode === 'focus',
    scrollerRef: timelineRef
  })
  // [②U7] 缩放：ctrl+滚轮（P-4 三模式均生效——滚动容器非被动监听）+内容层
  // transform+sizer（scale 不改布局盒——sizer 按 z 放大自然尺寸供滚动域）+
  // 角标复位（T9 单动作）；机制本体=timeline-zoom-hook.ts 拆件
  const zoom = useTimelineZoom({ timelineRef, contentRef, recomputeKey: groups })
  // [F-VISFB-22 P2 闸②] 根容器类名+卡点击/星标分派=timeline-interactions 拆件
  //（行为零变——分派序与守卫逐句保形迁驻）
  const timelineCls = timelineClassOf(viewMode, pan.panning)
  const handlers = createTimelineCardHandlers({
    nodes,
    tool,
    viewMode,
    consumeDragClick: drag.consumeClickSuppress,
    consumeDrawClick: draw.consumeClickSuppress,
    pickCard: draw.handleCardClick,
    onNodeClick: props.onNodeClick
  })

  return (
    <div
      className={timelineCls}
      data-testid="lineage-timeline"
      ref={timelineRef}
      onPointerDown={pan.onPointerDown}
    >
      {/* [②U2] 工具组重做挂接（.lg-toolbar sticky 挂 .timeline 内——仅 edit
          模式可见；保存/撤销/线型=工具组直连 store——[F-ALIGN-01] 建点
          钮随手动建点路径退役，容器零注入面） */}
      <LineageToolbar mode={viewMode} />
      {nodes.length === 0 ? (
        // 空态不短路滚动容器结构+工具条在场（D6 裁决=不引导；[RR1/d1-W2]
        // 文案随建点路径退役去动作指向——渲染行为零改；文献入库经导入链自动入图）
        <div className="tl-empty">暂无脉络图</div>
      ) : (
        <div
          className={drawing ? 'tl-content drawing' : 'tl-content'}
          ref={contentRef}
          style={zoom.contentStyle}
          onPointerDown={(e) => {
            draw.handlePointerDown(e)
          }}
        >
          {/* [T3-P7A] 连线层子组件（D-22）；[F-LGRAPH-01②U8] 命中层点击挂接
              随弹层流退役拆除（线右键菜单=轮 2 手动调线域） */}
          <EdgeOverlay
            nodes={nodes}
            edges={edges}
            shiftedIds={EMPTY_SHIFTED}
            groups={groups}
            routeEpoch={routeEpoch}
            dimmed={drag.phase === 'dragging'}
            focusDim={dimActive}
            brightIds={brightIds}
            editEnabled={viewMode === 'edit' && tool === 'select'}
            browseScan={viewMode === 'browse'}
          />
          {/* [②U3→F-UIRES-03 C2] 画线瞬态层装配（DrawLayers 拆件）：预览线+
              吸附高亮（idle=hint/dragging=snap 单渲染点；色源=per-kind latch） */}
          <DrawLayers
            state={draw.state}
            hint={draw.hint}
            zoom={zoomScale}
            color={tool === 'draw-dashed' ? currentLineColor.dashed : currentLineColor.solid}
          />
          <TimelineYears
            groups={groups}
            pubNos={pubNoByNode}
            paperMetrics={paperMetrics}
            tagNames={tagNames}
            selectedNodeId={props.selectedNodeId ?? null}
            ctxNodeId={props.contextNodeId ?? null}
            focusIds={focusIds}
            brightIds={brightIds}
            frameW={frameW}
            linkSourceId={draw.state.phase === 'dragging' ? draw.state.from?.nodeId ?? null : drawAnchor}
            dragSlot={drag.slot}
            dimUnfocused={dimActive}
            onCardClick={handlers.onCardClick}
            onCardStarClick={handlers.onCardStarClick}
            onCardPointerDown={drag.handleCardPointerDown}
            onNodeContextMenu={props.onNodeContextMenu}
          />
        </div>
      )}
      {/* [②U7] spacer：绝对定位撑滚动域覆盖缩放视觉区（.timeline relative
          ——包裹盒方案会与块级 content 互撑成环，e2e 探针实证 #185） */}
      <div className="tl-zoom-spacer" data-testid="tl-zoom-spacer" style={zoom.spacerStyle} />
      {/* [②U7/T9] 缩放角标（右下——图例上位堆叠：单动作点击=复位；拆件
          ZoomBadge——组件 250 行红线） */}
      <ZoomBadge />
    </div>
  )
}
