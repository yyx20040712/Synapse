// b3: T3-P6
/**
 * [T3-P6] LineageTimeline —— 纵向「年+月」时间线滚动容器宿主。
 *
 * - 分组=lineage-timeline.ts groupTimeline 纯函数（INV-75 消费方不得重排）；
 *   年/月/卡渲染体=TimelineYears 拆件（核徽章链随②U4 退役）。
 * - [F-SLOTGRID-01 U1] 布局=W 量测（use-capacity-layout 拆件——行容器网格
 *   分行见 TimelineYears/capacity.ts）；瀑布不动点迭代（timeline-waterfall）
 *   随本批退役删除。本件触 store 仅限 view.store
 *   （数据域纯 props 可直测）。
 * - [F-VISFB-22 P2 闸②] 交互域拆件=timeline-interactions.ts（回调契约
 *   TimelineCallbacks+聚焦三派生+根容器类名+卡点击/星标分派——行为零变；[B5 §4.2 第 2 条]
 *   聚焦派生收敛为 focusIds 单派生）。
 * - [B5 设计稿 §3.1/§3.3/§3.5/§4——wave C 2026-11-25 断言翻转] 工具栏与右下角缩放角标自本件
 *   渲染树迁出（工具栏=页面顶部稳定外壳 LineageToolbar；右下角缩放角标件退役，百分比复位迁
 *   LineageZoomControls）；空图不再短路 .tl-content 的空态文案节点（「暂无脉络图」删除，
 *   年月编排与笔记层照常）；聚焦无 dim——只派生 focusIds 并按模式门控 .focused；边 hover
 *   扫描改由独立 focusMode 信号驱动（EdgeOverlay prop）。
 *   （原「工具条 sticky 驻渲染树」为 B5 前形态记录）
 */
import { useMemo, useRef } from 'react'
import { nodePubNoMap, type LineageEdge, type LineageNode } from '@shared/models/lineage'
import type { LineagePaperMetrics } from '@shared/ipc/schemas'
import { groupTimeline } from './lineage-timeline'
import { EdgeOverlay } from './EdgeOverlay'
import { TimelineYears } from './TimelineYears'
import { LineageFloatingNotes } from './LineageFloatingNotes'
import { useTimelineOrchestration } from './use-timeline-orchestration'
import { useDrawLine } from './useDrawLine'
import { DrawLayers } from './DrawLayers'
import { useLineageViewStore } from './lineage-view.store'
import { useSettingsStore } from '../settings/settings.store'
import { timelineClassOf, useTimelineCardHandlers, useTimelineFocusIds, type TimelineCallbacks } from './timeline-interactions'

/** [F-ALIGN-01] 工具条 props 面随建点入口退役删除（TimelineToolbarProps
 *  唯一成员=onAddNode 对话框开关——工具组其余控件直连双 store，容器零注入） */

/** [F-SLOTGRID-01 U1] EdgeOverlay shiftedIds 恒空集（瀑布错位卡集随瀑布
 *  退役绝源——prop 面留驻待 U2 走线重基线处置；模块级常量=引用稳定，
 *  EdgeOverlay effect deps 消费面零扰动） */
const EMPTY_SHIFTED: ReadonlySet<string> = new Set()
// [B3 §8] 缺省空表=模块级常量（引用稳定——memo 配套：props 缺省面每渲染新
// 对象会击穿 LineageTimelineCard/TimelineMonthFrame memo；真实缺省=宿主
// store selector 引用面稳定，此处兜底同稳）
const EMPTY_METRICS: Record<string, LineagePaperMetrics> = {}
const EMPTY_PUBNOS: Record<string, number> = {}
const EMPTY_TAGS: Record<string, string[]> = {}
// [B5 §4.1] 非 focus 模式的 accent 集=模块级空集常量（引用稳定——不逐渲染新建 Set；edit/browse 保留
// focusSet 数据但不显示聚焦描边）
const NO_FOCUS: ReadonlySet<string> = new Set()

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
  const paperMetrics = props.paperMetrics ?? EMPTY_METRICS
  const pubNos = props.pubNos ?? EMPTY_PUBNOS
  const tagNames = props.tagNames ?? EMPTY_TAGS
  const groups = useMemo(() => groupTimeline(nodes), [nodes])
  const pubNoByNode = useMemo(() => nodePubNoMap(nodes, pubNos), [nodes, pubNos])

  // [F-LGRAPH-01①U3] 模式态单源=lineage-view.store（三模式栏 LineageModeBar
  // 写路径）
  const viewMode = useLineageViewStore((s) => s.mode)
  // [F-VISFB-22 P2 闸②→B5 设计稿 §4.2 第 2 条] 聚焦派生=timeline-interactions 拆件：focusIds 单派生
  // （不依赖 edges——原 bright 邻接集/dim 激活派生随无 dim 退役）；[B5 §4.1] accent 描边仅 focus 模式显示
  const focusIds = useTimelineFocusIds()
  const accentIds = viewMode === 'focus' ? focusIds : NO_FOCUS
  // [②U3] 画线工具态（draw-*=armed——卡拖拽闸+预览线色源）
  const tool = useLineageViewStore((s) => s.tool)
  const currentLineColor = useLineageViewStore((s) => s.currentLineColor)
  // [F-UIRES-03 C2·P2] 缩放系数（高亮 r=6/s_eff 补偿——屏幕域直径恒 12）
  const zoomScale = useLineageViewStore((s) => s.zoom)
  // [F-VISFB-31] uiScale 入量测/路由重算键（00A §四：每档布局真实重排）——
  // 订阅 settings 单源（App 同法），W 量测/spacer 量测/当前月对齐/路由快照
  // 四键共入；数值面=高亮补偿与 EdgeOverlay 重算键消费
  const uiScaleTier = useSettingsStore((s) => s.settings?.uiScale ?? 'small')

  // 滚动容器 ref 两面：content=.tl-content（W 量测）/timeline=根（导航+平移）
  const contentRef = useRef<HTMLDivElement | null>(null)
  const timelineRef = useRef<HTMLDivElement | null>(null)

  // [②U3] 画线子态机（armed=工具态；容器 pointer 流——拖拽互斥闸）
  const draw = useDrawLine({ contentRef })
  const drawing = tool !== 'select'
  // [B5 设计稿 §10.2——wave C 2026-11-25] 拖拽/布局量测/导航联动/平移/缩放的装配段迁驻
  // use-timeline-orchestration 拆件（行数预算 ≤200——代码与锚注释同迁，带副作用的 hook 次序不变）
  const engine = useTimelineOrchestration({
    nodes,
    groups,
    uiScaleTier,
    viewMode,
    drawing,
    contentRef,
    timelineRef,
    onReorderMonthSlots: props.onReorderMonthSlots
  })
  // [F-VISFB-22 P2 闸②] 根容器类名+卡点击/星标分派=timeline-interactions 拆件
  //（行为零变——分派序与守卫逐句保形迁驻）
  const timelineCls = timelineClassOf(viewMode, engine.pan.panning)
  const handlers = useTimelineCardHandlers({
    nodes,
    tool,
    viewMode,
    consumeDragClick: engine.drag.consumeClickSuppress,
    consumeDrawClick: draw.consumeClickSuppress,
    onNodeClick: props.onNodeClick
  })

  return (
    <div
      className={timelineCls}
      data-testid="lineage-timeline"
      ref={timelineRef}
      onPointerDown={engine.pan.onPointerDown}
    >
      {/* [F-VISFB-62 R1→B5 设计稿 §3.3/§3.5 wave C 2026-11-25] 空图不短路 .tl-content（笔记=图内容一部分：
          notes-only folder 笔记层在场可见可编辑+空白右键可创建）；「暂无脉络图」空态文案随 §3.5 删除
          （原 D6 空态文案节点退役——空图=画布+笔记层，无文字） */}
      <div
        className={drawing ? 'tl-content drawing' : 'tl-content'}
        ref={contentRef}
        style={engine.zoom.contentStyle}
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
          routeEpoch={engine.routeEpoch}
          isSuspended={engine.drag.isSuspended}
          dimmed={engine.drag.phase === 'dragging'}
          focusMode={viewMode === 'focus'}
          editEnabled={viewMode === 'edit' && tool === 'select'}
          browseScan={viewMode === 'browse'}
          uiScale={engine.uiScaleNum}
        />
        {/* [②U3→F-UIRES-03 C2] 画线瞬态层装配（DrawLayers 拆件）：预览线+
            吸附高亮（idle=hint/dragging=snap 单渲染点；色源=per-kind latch）；
            [F-VISFB-31] zoom=effectiveScale（z×uiScale——高亮 r 补偿双因子） */}
        <DrawLayers
          state={draw.state}
          hint={draw.hint}
          zoom={zoomScale * engine.uiScaleNum}
          color={tool === 'draw-dashed' ? currentLineColor.dashed : currentLineColor.solid}
        />
        {/* [B5 §3.3] 空图也照常渲染年月编排（空分组=零节点）——不为空图另造文案节点 */}
        <TimelineYears
          groups={groups}
          pubNos={pubNoByNode}
          paperMetrics={paperMetrics}
          tagNames={tagNames}
          selectedNodeId={props.selectedNodeId ?? null}
          ctxNodeId={props.contextNodeId ?? null}
          focusIds={accentIds}
          frameW={engine.frameW}
          dragSlot={engine.drag.slot}
          onCardClick={handlers.onCardClick}
          onCardStarClick={handlers.onCardStarClick}
          onCardPointerDown={engine.drag.handleCardPointerDown}
          onNodeContextMenu={props.onNodeContextMenu}
        />
        {/* [F-VISFB-62] 悬浮笔记层（.tl-content 内随 zoom transform 缩放；
            交互门=edit+select；坐标换算/菜单 portal 见组件头注） */}
        <LineageFloatingNotes contentRef={contentRef} />
      </div>
      {/* [②U7] spacer：绝对定位撑滚动域覆盖缩放视觉区（.timeline relative
          ——包裹盒方案会与块级 content 互撑成环，e2e 探针实证 #185） */}
      <div className="tl-zoom-spacer" data-testid="tl-zoom-spacer" style={engine.zoom.spacerStyle} />
    </div>
  )
}
