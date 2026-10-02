// b3: T3-P6
/**
 * [T3-P6] LineageTimeline —— 纵向「年+月」时间线滚动容器宿主。
 *
 * - 分组=lineage-timeline.ts groupTimeline 纯函数（INV-75 消费方不得重排）；
 *   年/月/卡渲染体=TimelineYears 拆件（核徽章链随②U4 退役）。
 * - 瀑布错位（P-15）=timeline-waterfall 拆件；工具条 sticky 驻渲染树——本件
 *   触 store 仅限 view.store（数据域纯 props 可直测）。
 */
import { useMemo, useRef } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'
import { nodePubNoMap, type LineageEdge, type LineageNode } from '@shared/models/lineage'
import type { LineagePaperMetrics } from '@shared/ipc/schemas'
import { groupTimeline } from './lineage-timeline'
import { EdgeOverlay } from './EdgeOverlay'
import { TimelineLegend, TimelineYears } from './TimelineYears'
import { LineageToolbar } from './LineageToolbar'
import { useCardDrag } from './useCardDrag'
import { useDrawLine } from './useDrawLine'
import { DrawPreview } from './DrawPreview'
import { MonthPop } from './MonthPop'
import { useLineageViewStore } from './lineage-view.store'
import { useTimelineNavSync } from './timeline-nav-sync'
import { useWaterfallOffsets } from './timeline-waterfall'
import { useTimelinePan } from './timeline-pan'
import { useTimelineZoom } from './timeline-zoom-hook'
import { ZoomBadge } from './ZoomBadge'

/** [T3-P7B] 03 编辑层/04 侧板消费的节点交互回调（全可选——缺省即纯只读） */
export interface TimelineCallbacks {
  /** 单击选中（04 侧板消费面上抛；事件透传=拾取定位面） */
  onNodeClick?: (nodeId: string, ev: { clientX: number; clientY: number; stopPropagation(): void }) => void
  /** [F-LGRAPH-01②U4/A6] 双击卡=跳阅读器（paperId 在场才上抛——主题节点
   *  no-op；消费面=Page 编排→OPEN_PAPER_EVENT 总线单入口 INV-20） */
  onNodeDblClick?: (nodeId: string) => void
  /** 右键节点开菜单（03 节点菜单锚点） */
  onNodeContextMenu?: (nodeId: string, position: { x: number; y: number }) => void
  /** [T3-P8] 月组槽位全序重排写路径（settle 落定后经 Board 接
   *  store.reorderMonthSlots——slot=0..n-1 透写；边界实现者定=申报） */
  onReorderMonthSlots?: (nodeIds: string[]) => void
  /** [T3-P8] 改月写路径（month+year 载荷、slot 键缺省=服务端组变尾部） */
  onMoveNodeMonth?: (nodeId: string, year: number | null, month: number | null) => void
}

/** [②U2] 工具条 props（Board 下传最小面——保存/撤销/色行名=工具组直连
 * lineage.store；容器只注入模式与添加节点对话框开关） */
export interface TimelineToolbarProps {
  onAddNode(): void
}

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
  /** [T3-P7B] 工具条（缺省=saved 静默态） */
  toolbar?: TimelineToolbarProps
} & TimelineCallbacks): JSX.Element {
  const { nodes, edges } = props
  const paperMetrics = props.paperMetrics ?? {}
  const pubNos = props.pubNos ?? {}
  const groups = useMemo(() => groupTimeline(nodes), [nodes])
  const pubNoByNode = useMemo(() => nodePubNoMap(nodes, pubNos), [nodes, pubNos])

  // [F-LGRAPH-01①U3] 模式态单源=lineage-view.store（三模式栏 LineageModeBar
  // 写路径）
  const viewMode = useLineageViewStore((s) => s.mode)
  // P-8 聚焦集（selector 取稳定数组引用——派生 Set 经 memo 防新引用死循环）
  const focusSet = useLineageViewStore((s) => s.focusSet)
  const focusIds = useMemo(() => new Set(focusSet), [focusSet])
  // [②U3] 画线工具态（draw-*=armed——卡拖拽闸+预览线色源）
  const tool = useLineageViewStore((s) => s.tool)
  const currentLineColor = useLineageViewStore((s) => s.currentLineColor)

  // 滚动容器 ref 两面：content=.tl-content（瀑布量测）/timeline=根（导航+平移）
  const contentRef = useRef<HTMLDivElement | null>(null)
  const timelineRef = useRef<HTMLDivElement | null>(null)
  // 拖拽清场→瀑布 routeEpoch 前置接线（hook 初始化序约束——ref 晚绑定）
  const bumpRouteRef = useRef<() => void>(() => undefined)

  // [②U3] 画线子态机（armed=工具态；容器 pointer 流——拖拽互斥闸）
  const draw = useDrawLine({ contentRef })
  const drawing = tool !== 'select'
  // [T3-P8] 槽位拖拽+改月状态机（编排本体驻 hook——Timeline 增量红线）
  const drag = useCardDrag({
    nodes,
    groups,
    isEditing: viewMode === 'edit',
    isPicking: drawing, // [②U3] 画线 armed=拖拽闸（拾取优先沿承——重命名申报）
    popOpen: false,
    contentRef,
    onReorderMonthSlots: props.onReorderMonthSlots,
    onMoveNodeMonth: props.onMoveNodeMonth,
    onRouteRecalc: () => bumpRouteRef.current()
  })
  // 瀑布错位不动点迭代（P-15：机制本体=timeline-waterfall.ts 拆件——组件
  // 250 行红线；冻结跳过/收敛 bump 细节见该件头注）
  const waterfall = useWaterfallOffsets({
    contentRef,
    recomputeKey: drag.renderGroups,
    dragPhase: drag.phase
  })
  const { offsets, routeEpoch } = waterfall
  bumpRouteRef.current = waterfall.bumpRoute
  // [F-LGRAPH-01①U4] 导航窗格联动：索引点击定位+当前月上报（重算键=渲染组）
  useTimelineNavSync(timelineRef, drag.renderGroups)
  // [F-LGRAPH-01①U5] 平移小手：browse/focus 拖空白=滚动跟随（edit 不平移）
  const pan = useTimelinePan({
    enabled: viewMode === 'browse' || viewMode === 'focus',
    scrollerRef: timelineRef
  })
  // [②U7] 缩放：ctrl+滚轮（P-4 三模式均生效——滚动容器非被动监听）+内容层
  // transform+sizer（scale 不改布局盒——sizer 按 z 放大自然尺寸供滚动域）+
  // 角标复位（T9 单动作）；机制本体=timeline-zoom-hook.ts 拆件
  const zoom = useTimelineZoom({ timelineRef, contentRef, recomputeKey: drag.renderGroups })
  // [②U7/P-18] 聚焦 dim 激活=focus 模式集非空（非聚焦卡+全部线 0.3）
  const dimActive = viewMode === 'focus' && focusSet.length > 0

  // EdgeOverlay 再触发信号（错位量>0 的卡集——引用稳定；[回炉 R10/d1-N3]
  // 局部语义名 offsetIds——EdgeOverlay prop 名 shiftedIds 遗留（改名波及
  // overlay 测试 4+ 处超 3 文件预算，申报）
  const offsetIds = useMemo(() => new Set(offsets.keys()), [offsets])

  // [U5] 模式类：仅 browse/focus 挂（CSS 光标域消费）；edit 态由 .editing 承载
  //（[回炉 R13] mode-edit 零消费类清理——挂类即须有 CSS 消费）
  const modeCls = viewMode === 'browse' || viewMode === 'focus' ? `mode-${viewMode}` : ''
  const timelineCls = [
    'timeline',
    modeCls,
    pan.panning ? 'panning' : '', // [U5] 平移中 grabbing
    viewMode === 'edit' ? 'editing' : ''
  ]
    .filter((c) => c !== '')
    .join(' ')

  const handleCardClick = (nodeId: string, ev: { clientX: number; clientY: number; stopPropagation(): void }): void => {
    if (drag.consumeClickSuppress()) return // [T3-P8] 拖后 click 抑制（一次性）
    if (draw.consumeClickSuppress()) return // [②U3] 画线收尾后 click 抑制（防误选）
    // [F-LGRAPH-01①U5] focus 点卡=toggle focusSet（再点同卡取消；P-13 选中
    // 照常转发——toggle 与详情面板联动并行不冲突）
    if (viewMode === 'focus') useLineageViewStore.getState().toggleFocus(nodeId)
    props.onNodeClick?.(nodeId, ev)
  }

  // [F-LGRAPH-01②U4/A4] 星标区分派（卡内已 stopProp——星标域优先不触发卡身）：
  // edit=选中卡（P-6）；browse/focus=no-op（P-11 静态禁用态——title 行内提示）
  const handleStarClick = (nodeId: string, ev: ReactMouseEvent<HTMLElement>): void => {
    if (viewMode !== 'edit') return
    if (drag.consumeClickSuppress()) return
    props.onNodeClick?.(nodeId, ev)
  }

  return (
    <div
      className={timelineCls}
      data-testid="lineage-timeline"
      ref={timelineRef}
      onPointerDown={pan.onPointerDown}
    >
      {/* [②U2] 工具组重做挂接（.lg-toolbar sticky 挂 .timeline 内——仅 edit
          模式可见；保存/撤销/线型=工具组直连 store） */}
      <LineageToolbar
        mode={viewMode}
        onAddNode={() => props.toolbar?.onAddNode()}
      />
      {nodes.length === 0 ? (
        // 空态不短路滚动容器结构+工具条在场（添加节点=空图 bootstrap 路径）
        <div className="tl-empty">暂无脉络图——添加节点</div>
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
            shiftedIds={offsetIds}
            groups={drag.renderGroups}
            routeEpoch={routeEpoch}
            dimmed={drag.phase === 'dragging'}
            focusDim={dimActive}
            editEnabled={viewMode === 'edit' && tool === 'select'}
            onAddNode={() => props.toolbar?.onAddNode()}
          />
          {/* [②U3] 画线拖动预览（dragging 态瞬态——零持久化） */}
          <DrawPreview state={draw.state} color={currentLineColor} />
          <TimelineYears
            groups={drag.renderGroups}
            pubNos={pubNoByNode}
            paperMetrics={paperMetrics}
            selectedNodeId={props.selectedNodeId ?? null}
            ctxNodeId={props.contextNodeId ?? null}
            focusIds={focusIds}
            offsets={offsets}
            linkSourceId={draw.state.phase === 'dragging' ? draw.state.from?.nodeId ?? null : null}
            dragSlot={drag.slot}
            registerFrame={drag.registerFrame}
            flashKey={drag.flashKey}
            dimUnfocused={dimActive}
            onCardClick={handleCardClick}
            onCardStarClick={handleStarClick}
            onCardDblClick={props.onNodeDblClick}
            onCardPointerDown={drag.handleCardPointerDown}
            onYmClick={drag.handleYmClick}
            onNodeContextMenu={props.onNodeContextMenu}
          />
        </div>
      )}
      {/* [T3-P7A 回炉 1 W7] 图例挂滚动容器 .timeline（视口级恒可见）；非空图才渲染 */}
      {nodes.length > 0 && <TimelineLegend />}
      {/* [②U7] spacer：绝对定位撑滚动域覆盖缩放视觉区（.timeline relative
          ——包裹盒方案会与块级 content 互撑成环，e2e 探针实证 #185） */}
      <div className="tl-zoom-spacer" data-testid="tl-zoom-spacer" style={zoom.spacerStyle} />
      {/* [②U7/T9] 缩放角标（右下——图例上位堆叠：单动作点击=复位；拆件
          ZoomBadge——组件 250 行红线） */}
      <ZoomBadge />
      {/* [T3-P8] 改月弹层（position:fixed——沿 popover-shared 钳制） */}
      {drag.monthPop !== null && (
        <MonthPop
          cx={drag.monthPop.cx}
          cy={drag.monthPop.cy}
          current={{ year: drag.monthPop.year, month: drag.monthPop.month }}
          months={drag.monthPopMonths}
          onPick={drag.pickMonth}
        />
      )}
    </div>
  )
}
