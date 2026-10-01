// b3: T3-P6
/**
 * [T3-P6] LineageTimeline —— 脉络纵向「年+月」时间线滚动容器宿主
 * （LineageCanvas[SVG 画布] 退役后的渲染层宿主——方案切换=删旧方案）。
 *
 * - 分组=lineage-timeline.ts groupTimeline 纯函数（INV-75 消费方不得重排；
 *   骑缝编号/核徽章=shared 单源）。年/月/卡渲染体=TimelineYears 拆件。
 * - 瀑布错位（P-15：(R×82)mod148）——机制本体=timeline-waterfall.ts 拆件。
 * - [T3-P7B] 编辑交互编排（useEdgeComposer 状态机+工具条换装+弹层挂载）：
 *   .timeline 挂 .editing（mode）/.link-pick（picker≠idle）；[F-LGRAPH-01①U3]
 *   模式态单源=lineage-view.store（三模式栏写路径——composer 受控注入
 *   editing=mode==='edit'，内部 view|edit useState 退役随编辑 toggle 退役）；
 *   命中层点击=EdgeOverlay onEdgeHitClick→composer（与 CSS pointer-events
 *   双闸）；拾取态点卡不转发 onNodeClick 选中；工具条（LineageToolbar
 *   换装 .lg-toolbar sticky）自本票移入渲染树——toolbar/actions props 经
 *   Board 下传（本件触 store 仅限 renderer 本地 UI 态 lineage-view.store
 *   ——数据域仍纯 props 编排可直测）。
 * - 空图空态文案保活；工具条空图在场（添加节点=空图 bootstrap 路径；
 *   [F-BAKRET-01] 导入入口随草稿导入链退役删除——用户裁决 2026-09-30）。
 */
import { useMemo, useRef } from 'react'
import { nodePubNoMap, type LineageEdge, type LineageEdgeKind, type LineageNode, type LineTypeGroup } from '@shared/models/lineage'
import type { LineagePaperMetrics } from '@shared/ipc/schemas'
import { isCore } from './lineage-classify'
import { groupTimeline } from './lineage-timeline'
import { EdgeOverlay } from './EdgeOverlay'
import { EdgeTypePopover } from './EdgeTypePopover'
import { TimelineLegend, TimelineYears } from './TimelineYears'
import { LineageToolbar } from './LineageToolbar'
import { useEdgeComposer, type ClickEventLike } from './useEdgeComposer'
import { useCardDrag } from './useCardDrag'
import { MonthPop } from './MonthPop'
import { useLineageViewStore } from './lineage-view.store'
import { useTimelineNavSync } from './timeline-nav-sync'
import { useWaterfallOffsets } from './timeline-waterfall'
import { useTimelinePan } from './timeline-pan'

/** [T3-P7B] 03 编辑层/04 侧板消费的节点交互回调（全可选——缺省即纯只读） */
export interface TimelineCallbacks {
  /** 单击选中（04 侧板消费面上抛；[T3-P7B] 事件透传=拾取定位面） */
  onNodeClick?: (nodeId: string, ev: ClickEventLike) => void
  /** 右键节点开菜单（03 节点菜单锚点） */
  onNodeContextMenu?: (nodeId: string, position: { x: number; y: number }) => void
  /** [T3-P8] 月组槽位全序重排写路径（settle 落定后经 Board 接
   *  store.reorderMonthSlots——slot=0..n-1 透写；边界实现者定=申报） */
  onReorderMonthSlots?: (nodeIds: string[]) => void
  /** [T3-P8] 改月写路径（month+year 载荷、slot 键缺省=服务端组变尾部） */
  onMoveNodeMonth?: (nodeId: string, year: number | null, month: number | null) => void
}

/** [T3-P7B] 工具条 props（Board 下传——P7-H 既有行为面零变） */
export interface TimelineToolbarProps {
  saveStatus: 'saved' | 'saving' | 'error'
  lastWriteError: string | null
  onAddNode(): void
  onRetrySave(): void
}

/** [T3-P7B] 线型编辑写路径（store 三 action+removeEdge——Board 自 store 下传） */
export interface EdgeLineActions {
  applyEdgeLine(edgeId: string, kind: LineageEdgeKind, sub: string | null): void
  linkWithLine(from: string, to: string, kind: LineageEdgeKind, sub: string | null): void
  saveLineTypes(groups: LineTypeGroup[]): void
  removeEdge(id: string): void
}

export function LineageTimeline(props: {
  nodes: LineageNode[]
  edges: LineageEdge[]
  selectedNodeId?: string | null
  /** F-LG14 含金量摘要表（键=paperId；Board 自 store 分发传入；缺省=空表） */
  paperMetrics?: Record<string, LineagePaperMetrics>
  /** [F-FOLDER-01] pubNo 表（键=paperId；INV-92 库级派生——图内节点号与库号
   *  同源单一真相源；Board 自 store 分发传入；缺省=空表） */
  pubNos?: Record<string, number>
  /** [T3-P7A] 线型组（EdgeOverlay sub 覆盖渲染+P7B 弹层消费——缺省=空表） */
  lineTypes?: LineTypeGroup[]
  /** [T3-P7B] 工具条（缺省=saved 静默态） */
  toolbar?: TimelineToolbarProps
  /** [T3-P7B] 线型编辑写路径（缺省=零写只读——弹层 acts 走 no-op） */
  actions?: EdgeLineActions
} & TimelineCallbacks): JSX.Element {
  const { nodes, edges } = props
  const paperMetrics = props.paperMetrics ?? {}
  const pubNos = props.pubNos ?? {}
  const lineTypes = props.lineTypes ?? []
  const groups = useMemo(() => groupTimeline(nodes), [nodes])
  const pubNoByNode = useMemo(() => nodePubNoMap(nodes, pubNos), [nodes, pubNos])
  const coreIds = useMemo(() => new Map(nodes.map((n) => [n.id, isCore(n, edges)])), [nodes, edges])

  // [F-LGRAPH-01①U3] 模式态单源=lineage-view.store（三模式栏 LineageModeBar
  // 写路径）；composer 受控化：editing=mode==='edit' 注入（内部 mode 态退役）
  const viewMode = useLineageViewStore((s) => s.mode)
  // P-8 聚焦集（selector 取稳定数组引用——派生 Set 经 memo 防新引用死循环）
  const focusSet = useLineageViewStore((s) => s.focusSet)
  const focusIds = useMemo(() => new Set(focusSet), [focusSet])
  const composer = useEdgeComposer(edges, { editing: viewMode === 'edit' })

  // 滚动容器 ref 两面：content=.tl-content（瀑布量测）/timeline=根（导航+平移）
  const contentRef = useRef<HTMLDivElement | null>(null)
  const timelineRef = useRef<HTMLDivElement | null>(null)
  // 拖拽清场→瀑布 routeEpoch 前置接线（hook 初始化序约束——ref 晚绑定）
  const bumpRouteRef = useRef<() => void>(() => undefined)

  // [T3-P8] 槽位拖拽+改月状态机（编排本体驻 hook——Timeline 增量红线）
  const drag = useCardDrag({
    nodes,
    groups,
    isEditing: composer.isEditing,
    isPicking: composer.isPicking,
    popOpen: composer.popover.kind !== 'closed',
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
    composer.isEditing ? 'editing' : '',
    composer.isPicking ? 'link-pick' : ''
  ]
    .filter((c) => c !== '')
    .join(' ')

  const handleCardClick = (nodeId: string, ev: ClickEventLike): void => {
    if (drag.consumeClickSuppress()) return // [T3-P8] 拖后 click 抑制（一次性）
    if (composer.handleCardClick(nodeId, ev)) return // 拾取/弹层语义消费——不转发选中
    // [F-LGRAPH-01①U5] focus 点卡=toggle focusSet（再点同卡取消；P-13 选中
    // 照常转发——toggle 与详情面板联动并行不冲突）
    if (viewMode === 'focus') useLineageViewStore.getState().toggleFocus(nodeId)
    props.onNodeClick?.(nodeId, ev)
  }

  const pop = composer.popover

  return (
    <div
      className={timelineCls}
      data-testid="lineage-timeline"
      ref={timelineRef}
      onPointerDown={pan.onPointerDown}
    >
      {/* [T3-P7B] 工具条换装（.lg-toolbar sticky 挂 .timeline 内——D-P7B-1）；
          [F-LGRAPH-01①U3] 编辑 toggle 退役——editing 受控（view.store 单源） */}
      <LineageToolbar
        saveStatus={props.toolbar?.saveStatus ?? 'saved'}
        lastWriteError={props.toolbar?.lastWriteError ?? null}
        onAddNode={() => props.toolbar?.onAddNode()}
        onRetrySave={() => props.toolbar?.onRetrySave()}
        mode={viewMode}
        onNewLink={composer.startLinkPick}
      />
      {nodes.length === 0 ? (
        // 空态不短路滚动容器结构+工具条在场（添加节点=空图 bootstrap 路径）
        <div className="tl-empty">暂无脉络图——添加节点</div>
      ) : (
        <div className="tl-content" ref={contentRef}>
          {/* [T3-P7A] 连线层子组件（D-22）+[T3-P7B] 命中层点击接 composer
              （handler 闸——与 CSS pointer-events 双闸） */}
          <EdgeOverlay
            nodes={nodes}
            edges={edges}
            lineTypes={lineTypes}
            shiftedIds={offsetIds}
            groups={drag.renderGroups}
            routeEpoch={routeEpoch}
            dimmed={drag.phase === 'dragging'}
            onEdgeHitClick={(edgeId, ev) => composer.handleEdgeHitClick(edgeId, ev)}
          />
          <TimelineYears
            groups={drag.renderGroups}
            pubNos={pubNoByNode}
            coreIds={coreIds}
            paperMetrics={paperMetrics}
            selectedNodeId={props.selectedNodeId ?? null}
            focusIds={focusIds}
            offsets={offsets}
            linkSourceId={composer.picker === 'target' ? composer.sourceId : null}
            dragSlot={drag.slot}
            registerFrame={drag.registerFrame}
            flashKey={drag.flashKey}
            onCardClick={handleCardClick}
            onCardPointerDown={drag.handleCardPointerDown}
            onYmClick={drag.handleYmClick}
            onNodeContextMenu={props.onNodeContextMenu}
          />
        </div>
      )}
      {/* [T3-P7A 回炉 1 W7] 图例挂滚动容器 .timeline（视口级恒可见）；非空图才渲染 */}
      {nodes.length > 0 && <TimelineLegend />}
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
      {/* [T3-P7B] 线型弹层（position:fixed——.timeline 滚动容器不裁剪） */}
      {pop.kind !== 'closed' && (
        <EdgeTypePopover
          mode={pop.kind}
          edgeId={pop.kind === 'edit' ? pop.edgeId : undefined}
          from={pop.kind === 'create' ? pop.from : undefined}
          to={pop.kind === 'create' ? pop.to : undefined}
          cx={pop.cx}
          cy={pop.cy}
          lineTypes={lineTypes}
          edges={edges}
          saveStatus={props.toolbar?.saveStatus ?? 'saved'}
          onApplyLine={(id, k, s) => props.actions?.applyEdgeLine(id, k, s)}
          onCreateLine={(f, t, k, s) => props.actions?.linkWithLine(f, t, k, s)}
          onRemoveLine={(id) => props.actions?.removeEdge(id)}
          onSaveLineTypes={(g) => props.actions?.saveLineTypes(g)}
          onClose={composer.closePopover}
        />
      )}
    </div>
  )
}
