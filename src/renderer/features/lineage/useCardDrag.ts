// b3: T3-P8
/**
 * [T3-P8] useCardDrag —— 槽位拖拽重排状态机编排 hook（mockup L893-1010
 * 语义）。[F-LGRAPH-01①U2] 拆件四域：pointer 会话=card-drag-session.ts
 * （useDragSession）/FLIP 飞行=card-drag-flight.ts（startFlight；审查回炉批屏障
 * 迁 drag-layout-barrier.ts createLayoutBarrier）/几何判定=card-drag-geometry.ts
 * ——本件=编排薄壳（既有导出面：DragPhase/DragSlotPreview 经 re-export 保活）。
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
 *   settle 接新拖忽略/applyObstacleReroute 与同道写错峰=store 队列 FIFO 既有
 *
 * ── 写路径（无乐观写——P7B R5 同族）──
 * settle flight finish 清场后才排队：拖拽→onReorderMonthSlots(月组全序——
 * Board 接 store.applyObstacleReroute 复合单元)；routeEpoch bump 时点=
 * 布局终局 layoutFinishOnce（[B3 §3.5.4] 子波 2——flight finish 只置
 * flightDone，padding 在途会话等回落终局后由 barrier 回调统一 bump 两 epoch）。
 * 写失败=error 保存态+toast+重试沿 store 既有，UI 位置不回滚。
 */
import { useEffect, useLayoutEffect, useRef } from 'react'
import type { PointerEvent as ReactPointerEvent, RefObject } from 'react'
import type { LineageNode } from '@shared/models/lineage'
import { startFlight } from './card-drag-flight'
import { createLayoutBarrier, type LayoutBarrier } from './drag-layout-barrier'
import { useDragSession } from './card-drag-session'
import type { DragPhase, DragSlotPreview } from './card-drag-session'

export type { DragPhase, DragSlotPreview } from './card-drag-session'

export function useCardDrag(args: {
  nodes: LineageNode[]
  isEditing: boolean
  isPicking: boolean
  popOpen: boolean
  contentRef: RefObject<HTMLDivElement | null>
  onReorderMonthSlots?: (nodeIds: string[]) => void
  /** [B3 §3.5.4] 布局终局 routeEpoch bump（layoutFinishOnce 触发——flight finish 不再直 bump） */
  onRouteRecalc(): void
  /** [B3 §3.5.4] 布局终局回调（layoutFinishOnce 恰一次——宿主 bump layoutEpoch 入 recomputeKey） */
  onLayoutSettled?: () => void
}): {
  phase: DragPhase
  slot: DragSlotPreview | null
  handleCardPointerDown(nodeId: string, ev: ReactPointerEvent<HTMLElement>): void
  consumeClickSuppress(): boolean
  /** [B3 §3.5.5] 挂起窗 getter（dragging 激活起→布局终局止——稳定引用读屏障 ref-latest 位） */
  isSuspended(): boolean
} {
  const { nodes, contentRef } = args
  // [B3 §2/§3.5] 布局终局屏障实例（ref 持有——跨 phase 重挂/渲染存活；
  // pointerdown 锁与挂起窗读其内部位，dispose 归组件卸载=迁移 15）
  const barrierRef = useRef<LayoutBarrier | null>(null)
  if (barrierRef.current === null) barrierRef.current = createLayoutBarrier()
  const barrier = barrierRef.current
  // [B3 §3.5.5] layoutFinishOnce 动作=两 epoch bump（ref-latest——终局时读最新闭包）
  const settledRef = useRef<() => void>(() => undefined)
  settledRef.current = () => {
    args.onRouteRecalc()
    args.onLayoutSettled?.()
  }
  const { phase, slot, flightRef, handleCardPointerDown, consumeClickSuppress } = useDragSession({
    nodes,
    dragEnabled: args.isEditing, // [U5] 拖卡=edit 专属闸
    isPicking: args.isPicking,
    popOpen: args.popOpen,
    contentRef,
    barrier,
    onFlightReady: (job) => {
      flightRef.current = job
    },
    onReorderMonthSlots: args.onReorderMonthSlots
  })
  // [B3 §3.5] 屏障订阅+卸载清理（挂载一次——barrier 引用稳定）
  useEffect(() => {
    barrier.onLayoutFinish(() => settledRef.current())
    return () => barrier.dispose()
  }, [barrier])

  const findCard = (nodeId: string): HTMLElement | null =>
    contentRef.current?.querySelector(`.tl-card[data-node-id="${nodeId}"]`) ?? null

  // ── settle FLIP（机制本体=card-drag-flight startFlight——commit 后同帧执行）──
  useLayoutEffect(() => {
    if (phase !== 'settle') return
    const job = flightRef.current
    flightRef.current = null
    if (job === null) return
    const card = findCard(job.nodeId)
    // [B3 §3.4/§7] settle 提交摘 .stretch（React——slot.active=false 类摘除）**后**的 layout effect 直写清 frame 的 --lg-pull：
    // pullPx 帧批直写脱离 React 后的清场载体（承担无后续 move 帧时的清场——G7 锁）；摘类在先则 var 已无消费，随后清变量零视觉
    //（§7 清序定式——先清变量再摘类的反序禁止）；padding-bottom 回落过渡事件=布局屏障 padding 跟踪的事件源（§3.5.1）
    card?.closest<HTMLElement>('.month-frame')?.style.removeProperty('--lg-pull')
    // [②U7] contentEl 传入=飞行坐标域换算基准（内容坐标 absolute）
    startFlight(card, job, contentRef.current)
  }, [phase])

  return {
    phase,
    slot,
    handleCardPointerDown,
    consumeClickSuppress,
    isSuspended: barrier.isSuspended
  }
}
