// b3: T3-P8
/**
 * [T3-P8] useCardDrag —— 槽位拖拽重排+改月飞行动画状态机编排 hook（mockup
 * L893-1010/L1101-1128 语义）。[F-LGRAPH-01①U2] 拆件四域：pointer 会话=
 * card-drag-session.ts（useDragSession）/FLIP 飞行=card-drag-flight.ts
 * （startFlight）/MonthPop 域=useMonthPop.ts（useMonthPopState）/几何判定=
 * card-drag-geometry.ts——本件=编排+改月写路径（既有导出面不变——
 * insertIndexFromRects/DragPhase/DragSlotPreview 经 re-export 保活）。
 *
 * ── 态空间（宪法状态纪律：三轴枚举）──
 * drag ∈ {idle, pending, dragging, settle(飞行过渡期)} ×
 * mode ∈ {view,edit} × composer ∈ {picker, popover, monthPop}：
 * - **view/edit 双态无 mode 门槛**（mockup pointerdown 无 mode 闸）
 * - picker≠idle 禁拖（[②U3] 画线 armed 态沿承此闸——isPicking 形参语义=
 *   画线工具激活（重命名申报：composer 拾取流退役，闸面复用）；popover/
 *   monthPop 开禁拖
 * - 跨格序列：拾取中拖禁/弹层开拖禁/拖中弹层不可触发（pointer 在飞）/
 *   settle 接新拖忽略/reorderMonthSlots 与同道写错峰=store 队列 FIFO 既有
 *
 * ── 写路径（无乐观写——P7B R5 同族）──
 * settle transitionend 清场后才排队：拖拽→onReorderMonthSlots(月组全序)；
 * 改月→onMoveNodeMonth（slot 键缺省=服务端组变 max+1 尾部）。写失败=error
 * 保存态+toast+重试沿 store 既有，UI 位置不回滚（改月预演驻留至数据落定）。
 */
import { useEffect, useLayoutEffect, useMemo, useState } from 'react'
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent, RefObject } from 'react'
import type { LineageNode } from '@shared/models/lineage'
import { showToast } from '../../shared/ui/toast-store'
import { applyMovePreview, frameKeyOf } from './lineage-timeline'
import type { TimelineYearGroup } from './lineage-timeline'
import { startFlight } from './card-drag-flight'
import { contentScale } from './timeline-zoom'
import { useDragSession } from './card-drag-session'
import type { DragPhase, DragSlotPreview } from './card-drag-session'
import { useMonthPopState } from './useMonthPop'
import type { MonthOption } from './useMonthPop'

export type { DragPhase, DragSlotPreview } from './card-drag-session'
export { insertIndexFromRects } from './card-drag-geometry'

/** 改月飞行预演（写落定前渲染序接管——store 回填重排后自然对齐清除） */
export interface MonthMovePreview {
  nodeId: string
  year: number | null
  month: number | null
}

/** 改月 toast 标签（mockup L1125：「N 年 M 月」/未定月；null 年无 mockup
 *  样本——退「M 月」/未定月，取值申报） */
export function moveTargetLabel(year: number | null, month: number | null): string {
  if (month === null) return '未定月'
  if (year === null) return `${month} 月`
  return `${year} 年 ${month} 月`
}

export function useCardDrag(args: {
  nodes: LineageNode[]
  groups: TimelineYearGroup[]
  isEditing: boolean
  isPicking: boolean
  popOpen: boolean
  contentRef: RefObject<HTMLDivElement | null>
  onReorderMonthSlots?: (nodeIds: string[]) => void
  onMoveNodeMonth?: (nodeId: string, year: number | null, month: number | null) => void
  /** settle 清场后路由重算信号（routeEpoch bump 既有链） */
  onRouteRecalc(): void
}): {
  phase: DragPhase
  slot: DragSlotPreview | null
  movePreview: MonthMovePreview | null
  flashKey: string | null
  monthPop: { nodeId: string; cx: number; cy: number; year: number | null; month: number | null } | null
  monthPopMonths: MonthOption[]
  renderGroups: TimelineYearGroup[]
  handleCardPointerDown(nodeId: string, ev: ReactPointerEvent<HTMLElement>): void
  handleYmClick(nodeId: string, ev: ReactMouseEvent<HTMLElement>): void
  pickMonth(year: number | null, month: number | null): void
  consumeClickSuppress(): boolean
} {
  const { nodes, groups, contentRef } = args
  const [movePreview, setMovePreview] = useState<MonthMovePreview | null>(null)
  const [flashKey, setFlashKey] = useState<string | null>(null)
  const { monthPop, setMonthPop, monthPopMonths } = useMonthPopState(groups)
  const { phase, slot, setPhase, setSlot, flightRef, handleCardPointerDown, consumeClickSuppress } =
    useDragSession({
      nodes,
      groups,
      dragEnabled: args.isEditing, // [U5] 拖卡=edit 专属闸
      isPicking: args.isPicking,
      popOpen: args.popOpen,
      monthPopOpen: monthPop !== null,
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

  // ── 改月预演清除（写落定对齐——UI 位置不回滚的补账时点）────────────
  useEffect(() => {
    const mp = movePreview
    if (mp === null) return
    const n = nodes.find((x) => x.id === mp.nodeId)
    if (n !== undefined && n.year === mp.year && n.month === mp.month) {
      setMovePreview(null)
      setFlashKey(null)
    }
  }, [nodes, movePreview])

  const renderGroups = useMemo(
    () =>
      movePreview === null
        ? groups
        : applyMovePreview(groups, movePreview.nodeId, movePreview.year, movePreview.month),
    [groups, movePreview]
  )

  // [F-LGRAPH-01②U6/挂账③] MonthPop 下降沿对称化：切出 edit 模式=关闭
  //（Esc/外点/切模式三径统一——非对称残留防御）
  useEffect(() => {
    if (!args.isEditing) setMonthPop(null)
  }, [args.isEditing])

  const handleYmClick = (nodeId: string, ev: ReactMouseEvent<HTMLElement>): void => {
    if (!args.isEditing) return // edit 态闸（CSS 显隐+handler 双闸）
    if (phase !== 'idle') return
    // [R7] 拾取/线型弹层互斥（与拖拽闸同源——composer 占用时月标不开层）
    if (args.isPicking || args.popOpen) return
    const n = nodes.find((x) => x.id === nodeId)
    if (n === undefined) return
    setMonthPop({ nodeId, cx: ev.clientX, cy: ev.clientY, year: n.year, month: n.month })
  }

  const pickMonth = (year: number | null, month: number | null): void => {
    const pop = monthPop
    if (pop === null) return
    setMonthPop(null)
    const n = nodes.find((x) => x.id === pop.nodeId)
    if (n === undefined) return
    if (n.year === year && n.month === month) return // 同月=no-op 零写（申报）
    const fromCard = findCard(n.id)
    const fromRaw = fromCard?.getBoundingClientRect()
    // [②U7] 改月飞行起点=内容坐标（视口 rect 逆变换——contentEl 基准）
    const base = contentRef.current?.getBoundingClientRect()
    const z = contentScale()
    const from =
      fromRaw !== undefined && base !== undefined
        ? { left: (fromRaw.left - base.left) / z, top: (fromRaw.top - base.top) / z }
        : undefined
    // [回炉 R8③] 改月飞行同式禁断（settle re-fix 压 0 面的类过渡防线——
    // settle 段 SETTLE_TRANSITION 接管+清场回类值）
    if (fromCard !== null && fromCard !== undefined) fromCard.style.transition = 'none'
    showToast(`已移至 ${moveTargetLabel(year, month)}`, 'success')
    setMovePreview({ nodeId: n.id, year, month })
    setFlashKey(frameKeyOf(year, month))
    flightRef.current = {
      nodeId: n.id,
      fromX: from?.left ?? 0,
      fromY: from?.top ?? 0,
      marginLeft0: findCard(n.id)?.style.marginLeft ?? '',
      finish: () => {
        setPhase('idle')
        setSlot(null)
        args.onRouteRecalc()
        args.onMoveNodeMonth?.(n.id, year, month)
      }
    }
    setPhase('settle')
  }

  return {
    phase,
    slot,
    movePreview,
    flashKey,
    monthPop,
    monthPopMonths,
    renderGroups,
    handleCardPointerDown,
    handleYmClick,
    pickMonth,
    consumeClickSuppress
  }
}
