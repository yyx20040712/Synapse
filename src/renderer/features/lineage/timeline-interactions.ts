// b3: T3-P7B
// F-VISFB-22: P2 闸②拆件
/**
 * [F-VISFB-22 P2 闸②] timeline-interactions —— LineageTimeline 交互域拆件
 * （组件 250 行红线拆件面；内容自 LineageTimeline 原样迁移，行为零变）：
 * - TimelineCallbacks —— 03 编辑层/04 侧板消费的节点交互回调契约（跨件
 *   单源：TimelineYears/LineageTimelineCard/LineageTimeline 三方消费，
 *   [F-VISFB-22] 自 LineageTimeline 迁驻——消费方 import 随迁）；
 * - useTimelineFocusSets —— P-8 聚焦集/bright 邻接集/dim 激活派生；
 * - timelineClassOf —— 根容器类名装配（模式类/平移/编辑）；
 * - createTimelineCardHandlers —— 卡点击/星标点击分派工厂（纯函数件——
 *   每渲染重建闭包=原组件内联函数同生命周期）。
 */
import { useMemo } from 'react'
import type { LineageEdge, LineageNode } from '@shared/models/lineage'
import { focusBrightSet } from './focus-bright'
import { useLineageStore } from './lineage.store'
import { useLineageViewStore, type LineageViewMode, type LineageTool } from './lineage-view.store'

/** [T3-P7B] 03 编辑层/04 侧板消费的节点交互回调（全可选——缺省即纯只读） */
export interface TimelineCallbacks {
  /** 单击选中（04 侧板消费面上抛；事件透传=拾取定位面） */
  onNodeClick?: (nodeId: string, ev: { clientX: number; clientY: number; stopPropagation(): void }) => void
  /** 右键节点开菜单（03 节点菜单锚点） */
  onNodeContextMenu?: (nodeId: string, position: { x: number; y: number }) => void
  /** [F-UIRES-03 B5①] 卡面两钮回调（onCardGotoLibrary/Reader）随迁移退役删除
   *  （消费面=SidePanel 操作行经 Page 直连——Board→Timeline→Years 传链同删） */
  /** [T3-P8] 月组槽位全序重排写路径（settle 落定后经 Board 接
   *  store.reorderMonthSlots——slot=0..n-1 透写；边界实现者定=申报）。
   *  [F-UIRES-03 C3] 改月回调 prop 随改月链退役删除（INV-107）；
   *  卡双击链（onNodeDblClick）随 v1.7 双击退役删除（全应用唯一保留双击=
   *  详情面板片段条目——B2 终态） */
  onReorderMonthSlots?: (nodeIds: string[]) => void
}

/** [F-VISFB-22 P2 闸②] 聚焦三派生（自 LineageTimeline 迁驻——行为零变）：
 *  focusIds=P-8 accent 边框本集；brightIds=focus∪双向一度邻接（[F-VISFB-21
 *  C4] 判定集单源=focus-bright 纯函数——卡 dim/边 dim 两消费面共用）；
 *  dimActive=[②U7/P-18] 聚焦 dim 激活（focus 模式集非空）。 */
export function useTimelineFocusSets(edges: ReadonlyArray<LineageEdge>): {
  focusIds: ReadonlySet<string>
  brightIds: ReadonlySet<string>
  dimActive: boolean
} {
  const viewMode = useLineageViewStore((s) => s.mode)
  // P-8 聚焦集（selector 取稳定数组引用——派生 Set 经 memo 防新引用死循环）
  const focusSet = useLineageViewStore((s) => s.focusSet)
  const focusIds = useMemo(() => new Set(focusSet), [focusSet])
  const brightIds = useMemo(() => focusBrightSet(edges, focusSet), [edges, focusSet])
  const dimActive = viewMode === 'focus' && focusSet.length > 0
  return { focusIds, brightIds, dimActive }
}

/** [F-VISFB-22 P2 闸②] 根容器类名装配（自 LineageTimeline 迁驻——行为零变）。
 *  [U5] 模式类：仅 browse/focus 挂（CSS 光标域消费）；edit 态由 .editing 承载
 *  （[回炉 R13] mode-edit 零消费类清理——挂类即须有 CSS 消费）；panning=
 *  平移中 grabbing */
export function timelineClassOf(viewMode: LineageViewMode, panning: boolean): string {
  const modeCls = viewMode === 'browse' || viewMode === 'focus' ? `mode-${viewMode}` : ''
  return ['timeline', modeCls, panning ? 'panning' : '', viewMode === 'edit' ? 'editing' : '']
    .filter((c) => c !== '')
    .join(' ')
}

/** [F-VISFB-22 P2 闸②] 卡点击/星标分派工厂（自 LineageTimeline 迁驻——行为
 * 零变：分派序与守卫逐句保形；事件时点读闭包值=原内联函数同源） */
export function createTimelineCardHandlers(deps: {
  nodes: LineageNode[]
  tool: LineageTool
  viewMode: LineageViewMode
  /** [T3-P8] 拖后 click 抑制（一次性——drag 会话） */
  consumeDragClick(): boolean
  /** [②U3] 画线收尾后 click 抑制（防误选——draw 域） */
  consumeDrawClick(): boolean
  onNodeClick?: TimelineCallbacks['onNodeClick']
}): {
  onCardClick: NonNullable<TimelineCallbacks['onNodeClick']>
  onCardStarClick(nodeId: string): void
} {
  const { nodes, tool, viewMode } = deps
  const onCardClick = (
    nodeId: string,
    ev: { clientX: number; clientY: number; stopPropagation(): void }
  ): void => {
    if (deps.consumeDragClick()) return // [T3-P8] 拖后 click 抑制（一次性）
    if (deps.consumeDrawClick()) return // [②U3] 画线收尾后 click 抑制（防误选）
    // [F-VISFB-66 裁定 2·B1a] draw 工具=纯拖拽工具：点卡=吞咽（不 pickCard、
    // 不开详情——裁决 11a 沿承；点两卡连边链退役后唯一建边径=锚点显式拖拽）
    if (tool !== 'select') return
    // [F-LGRAPH-01①U5] focus 点卡=toggle focusSet（再点同卡取消；P-13 选中
    // 照常转发——toggle 与详情面板联动并行不冲突）
    if (viewMode === 'focus') useLineageViewStore.getState().toggleFocus(nodeId)
    deps.onNodeClick?.(nodeId, ev)
  }

  // [F-DBCAMP-01 DB-4 / F-STAR-01 A3 点亮] 星标区分派（卡内已 stopProp——星标域
  // 优先不触发卡身）：三模式（edit/browse/focus）均 toggle 星标（P-11 退出
  // 条件——edit 态 transitional「星标域点击=选中卡」分派随星标语义回归退役：
  // 卡选中经卡身点击既有通道不损失）；仅拖后 click 抑制守卫沿承（T3-P8）。
  // 载荷=props 节点快照（store 节点面解耦——见 lineage.store toggleNodeStar）
  const onCardStarClick = (nodeId: string): void => {
    if (deps.consumeDragClick()) return
    const node = nodes.find((n) => n.id === nodeId)
    if (node === undefined || node.paperId === null) return
    void useLineageStore
      .getState()
      .toggleNodeStar({ id: node.id, paperId: node.paperId, isStarred: node.isStarred })
  }

  return { onCardClick, onCardStarClick }
}
