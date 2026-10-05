// b3: T3-P8
/**
 * [T3-P8] useCardDrag —— 槽位拖拽重排状态机编排 hook（mockup L893-1010
 * 语义）。[F-LGRAPH-01①U2] 拆件四域：pointer 会话=card-drag-session.ts
 * （useDragSession）/FLIP 飞行=card-drag-flight.ts（startFlight）/几何判定=
 * card-drag-geometry.ts——本件=编排薄壳（既有导出面：insertIndexFromRects/
 * DragPhase/DragSlotPreview 经 re-export 保活）。
 * [F-UIRES-03 C3] 改月链（改月弹层/改月预演/改月写路径）随改月单口裁决
 * 退役删除（INV-107——改月唯一入口=MetaEditDialog 月份字段）；本件收窄为
 * 纯拖拽编排，改月注释典故随符号族清零。
 *
 * ── 态空间（宪法状态纪律）──
 * drag ∈ {idle, pending, dragging, settle(飞行过渡期)} × mode ∈ {view,edit}：
 * - **拖卡=edit 专属闸**（[F-LGRAPH-01①U5] 三模式）
 * - picker≠idle 禁拖（[②U3] 画线 armed 态——isPicking 形参语义=画线工具
 *   激活）；popover 开禁拖
 * - 跨格序列：拾取中拖禁/弹层开拖禁/拖中弹层不可触发（pointer 在飞）/
 *   settle 接新拖忽略/reorderMonthSlots 与同道写错峰=store 队列 FIFO 既有
 *
 * ── 写路径（无乐观写——P7B R5 同族）──
 * settle transitionend 清场后才排队：拖拽→onReorderMonthSlots(月组全序)。
 * 写失败=error 保存态+toast+重试沿 store 既有，UI 位置不回滚。
 */
import { useLayoutEffect } from 'react'
import type { PointerEvent as ReactPointerEvent, RefObject } from 'react'
import type { LineageNode } from '@shared/models/lineage'
import { startFlight } from './card-drag-flight'
import { useDragSession } from './card-drag-session'
import type { DragPhase, DragSlotPreview } from './card-drag-session'

export type { DragPhase, DragSlotPreview } from './card-drag-session'
export { insertIndexFromRects } from './card-drag-geometry'

export function useCardDrag(args: {
  nodes: LineageNode[]
  isEditing: boolean
  isPicking: boolean
  popOpen: boolean
  contentRef: RefObject<HTMLDivElement | null>
  onReorderMonthSlots?: (nodeIds: string[]) => void
  /** settle 清场后路由重算信号（routeEpoch bump 既有链） */
  onRouteRecalc(): void
}): {
  phase: DragPhase
  slot: DragSlotPreview | null
  handleCardPointerDown(nodeId: string, ev: ReactPointerEvent<HTMLElement>): void
  consumeClickSuppress(): boolean
} {
  const { nodes, contentRef } = args
  const { phase, slot, flightRef, handleCardPointerDown, consumeClickSuppress } = useDragSession({
    nodes,
    dragEnabled: args.isEditing, // [U5] 拖卡=edit 专属闸
    isPicking: args.isPicking,
    popOpen: args.popOpen,
    contentRef,
    onFlightReady: (job) => {
      flightRef.current = job
    },
    onRouteRecalc: args.onRouteRecalc,
    onReorderMonthSlots: args.onReorderMonthSlots
  })

  const findCard = (nodeId: string): HTMLElement | null =>
    contentRef.current?.querySelector(`.tl-card[data-node-id="${nodeId}"]`) ?? null

  // ── settle FLIP（机制本体=card-drag-flight startFlight——commit 后同帧执行）──
  useLayoutEffect(() => {
    if (phase !== 'settle') return
    const job = flightRef.current
    flightRef.current = null
    if (job === null) return
    // [②U7] contentEl 传入=飞行坐标域换算基准（内容坐标 absolute）
    startFlight(findCard(job.nodeId), job, contentRef.current)
  }, [phase])

  return {
    phase,
    slot,
    handleCardPointerDown,
    consumeClickSuppress
  }
}
