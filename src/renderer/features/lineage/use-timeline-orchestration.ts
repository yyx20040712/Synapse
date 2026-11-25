// b3: T3-P6 / B5 wave C 编排外迁（2026-11-25——自 LineageTimeline.tsx 迁出；代码与锚
// 注释同迁，行为零变）
/**
 * [B5 设计稿 §10.2——wave C 2026-11-25] useTimelineOrchestration —— 时间线交互编排 hook：
 * 布局量测/拖拽/导航联动/平移/缩放的装配点。
 *
 * 迁出缘由：LineageTimeline 行数预算 ≤200（物理行上限）；工具栏/缩放角标/空态文案迁出后仍超
 * 预算，故把六机制的装配段整体迁驻本件（拆文件迁出代码，不靠删注释达标）。各机制本体仍驻原
 * hook（useCardDrag/use-capacity-layout/timeline-nav-sync/timeline-pan/timeline-zoom-hook），本件
 * 内的调用相对次序与迁出前逐句一致——带副作用的 hook（拖拽/量测/联动/缩放）次序未变，只有无
 * 副作用的 state/ref 声明位置后移，行为零变。
 *
 * - 调用方（LineageTimeline）仍自持：view.store 工具态/线色/缩放系数订阅、settings uiScale 档订阅
 *   （check-quality 跨域白名单按文件路径登记 LineageTimeline——订阅面不随本件迁移）、画线子态机
 *   useDrawLine、滚动容器两个 ref。
 * - 本件入参全部由调用方注入（零自取 mode/tool——避免与调用方各读一份状态）。
 *
 * ── 接口层 ── export interface TimelineOrchestrationArgs；
 *   export function useTimelineOrchestration(args): { uiScaleNum; frameW; routeEpoch; pan; zoom; drag }
 *
 * ── 架构层 ── 组合层 hook：只装配本域机制 hook；settings 档位以入参传入（本件不 import settings）。
 */
import { useMemo, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { UI_SCALE, type UiScale } from '@shared/ipc/schemas'
import type { LineageNode } from '@shared/models/lineage'
import { useCardDrag } from './useCardDrag'
import { useCapacityLayout } from './use-capacity-layout'
import { useTimelineNavSync } from './timeline-nav-sync'
import { useTimelinePan } from './timeline-pan'
import { useTimelineZoom } from './timeline-zoom-hook'
import { useLineageStore } from './lineage.store'
import type { LineageViewMode } from './lineage-view.store'
import type { TimelineCallbacks } from './timeline-interactions'
import type { TimelineYearGroup } from './lineage-timeline'

export interface TimelineOrchestrationArgs {
  nodes: LineageNode[]
  /** 渲染分组（layoutKey 组成——分组变=内容布局变） */
  groups: TimelineYearGroup[]
  /** 界面缩放档（调用方订阅 settings 单源后注入） */
  uiScaleTier: UiScale
  viewMode: LineageViewMode
  /** 画线 armed（draw-* 工具态）——拖拽闸（拾取优先） */
  drawing: boolean
  /** 滚动容器 ref 两面：content=.tl-content（W 量测）/timeline=根（导航+平移） */
  contentRef: RefObject<HTMLDivElement | null>
  timelineRef: RefObject<HTMLDivElement | null>
  onReorderMonthSlots?: TimelineCallbacks['onReorderMonthSlots']
}

export function useTimelineOrchestration(args: TimelineOrchestrationArgs): {
  uiScaleNum: number
  frameW: number
  routeEpoch: number
  pan: ReturnType<typeof useTimelinePan>
  zoom: ReturnType<typeof useTimelineZoom>
  drag: ReturnType<typeof useCardDrag>
} {
  const { contentRef, timelineRef, viewMode } = args
  // [F-VISFB-31] uiScale 数值面=高亮补偿与 EdgeOverlay 重算键消费（档→数值映射单源=UI_SCALE）
  const uiScaleNum = UI_SCALE[args.uiScaleTier]
  // [B3 §3.5.4] layoutEpoch=布局终局量测键（layoutFinishOnce 恰一次 bump——
  // 屏障解除后 zoom/useCapacityLayout/nav 以最终布局重跑一次；groups/uiScale 沿承）
  const [layoutEpoch, setLayoutEpoch] = useState(0)
  const layoutKey = useMemo(
    () => [args.groups, args.uiScaleTier, layoutEpoch] as const,
    [args.groups, args.uiScaleTier, layoutEpoch]
  )
  // [B3 §3.5.4] 布局终局 routeEpoch bump 接线（hook 初始化序约束——ref 晚绑定；
  // flight finish 不再直 bump——barrier layoutFinishOnce 触发）
  const bumpRouteRef = useRef<() => void>(() => undefined)

  // [T3-P8] 槽位拖拽状态机（编排本体驻 hook——Timeline 增量红线）；
  // [F-UIRES-03 C3] 改月域（弹层/预演）随改月链退役——groups 直用
  // [B4 L2 §9.3] 拖拽写归属身份捕获面（活动会话 folder+generation——卸载后兜底写仍到原会话）
  const dragFolderId = useLineageStore((s) => s.folderId)
  const dragGeneration = useLineageStore((s) => s.sessionGeneration)
  const drag = useCardDrag({
    nodes: args.nodes,
    folderId: dragFolderId,
    generation: dragGeneration,
    isEditing: viewMode === 'edit',
    isPicking: args.drawing, // [②U3] 画线 armed=拖拽闸（拾取优先沿承——重命名申报）
    popOpen: false,
    contentRef,
    onReorderMonthSlots: args.onReorderMonthSlots,
    onRouteRecalc: () => bumpRouteRef.current(),
    onLayoutSettled: () => setLayoutEpoch((v) => v + 1)
  })
  // [F-SLOTGRID-01 U1] W 量测+布局变更信号（机制本体=use-capacity-layout.ts
  // 拆件——组件 250 行红线；unmeasured 降级/rAF 合并细节见该件头注；
  // [F-VISFB-31] recomputeKey 含 uiScale——档变重读 W+bump routeEpoch）
  const layout = useCapacityLayout({ contentRef, recomputeKey: layoutKey })
  const { frameW, routeEpoch } = layout
  bumpRouteRef.current = layout.bumpRoute
  // [F-LGRAPH-01①U4] 导航窗格联动：索引点击定位+当前月上报（重算键=渲染组
  // +uiScale——档变重排后当前月重对齐）
  useTimelineNavSync(timelineRef, layoutKey)
  // [F-LGRAPH-01①U5] 平移小手：browse/focus 拖空白=滚动跟随（edit 不平移）
  const pan = useTimelinePan({
    enabled: viewMode === 'browse' || viewMode === 'focus',
    scrollerRef: timelineRef
  })
  // [②U7] 缩放：ctrl+滚轮（P-4 三模式均生效——滚动容器非被动监听）+内容层
  // transform+sizer（scale 不改布局盒——sizer 按 z 放大自然尺寸供滚动域）；
  // 机制本体=timeline-zoom-hook.ts 拆件（百分比复位钮=工具栏 LineageZoomControls——
  // [B5 §4.2] 原右下角角标复位退役）；
  // [F-VISFB-31] 量测键含 uiScale（自然尺寸=own px 随档重排——jsdom 无 RO
  // 兜底路径同键覆盖）
  const zoom = useTimelineZoom({ timelineRef, contentRef, recomputeKey: layoutKey, isSuspended: drag.isSuspended })
  return { uiScaleNum, frameW, routeEpoch, pan, zoom, drag }
}
