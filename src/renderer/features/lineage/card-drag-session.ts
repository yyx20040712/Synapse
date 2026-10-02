// b3: T3-P8
/**
 * [F-LGRAPH-01①U2] card-drag-session —— pointer 拖拽会话域（自 useCardDrag
 * 拆出，行为零变；几何判定=card-drag-geometry，飞行机制=card-drag-flight）。
 *
 * ── 态空间（宪法状态纪律）──
 * drag ∈ {idle, pending(按下未过 5px), dragging, settle(飞行过渡期——
 * settle 落定编排归 useCardDrag)}：
 * - 拖拽无 Esc 取消（松手恒落当前槽）；settle 期再 pointerdown=忽略；
 *   阈值未过 pointerup=单击选中既有链（click 事件自然派发）
 * - [R5] pointercancel 同松手径：系统取消=落当前候选槽
 * - [R6] 未消费 click 抑制随新会话清零（残留会吞下次真单击）
 *
 * ── 写路径（无乐观写——P7B R5 同族）──
 * settle transitionend 清场后才回调 onSettleFinalize（编排层排队
 * onReorderMonthSlots）；写失败沿 store 既有。
 */
import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, RefObject } from 'react'
import type { LineageNode } from '@shared/models/lineage'
import { frameKeyOf } from './lineage-timeline'
import type { TimelineYearGroup } from './lineage-timeline'
import type { FlightJob } from './card-drag-flight'
import { frameContains, insertIndexFromRects, srcGroupIdsOf } from './card-drag-geometry'
import { contentScale } from './timeline-zoom'

export type DragPhase = 'idle' | 'pending' | 'dragging' | 'settle'

/** 槽位预览（TimelineYears 渲染源：active=拖起[占位槽在场+拖卡离流]；
 *  active=false=settle 落位[卡回文档流@insertIdx+FLIP 飞行]） */
export interface DragSlotPreview {
  nodeId: string
  srcKey: string
  insertIdx: number
  active: boolean
  /** 指针在源月框内（框外槽淡化 .35） */
  overFrame: boolean
  /** [②U6] 框底缘下拉态（拖过底缘 x 带内=框高动画下拉腾新行+插位组末） */
  extend?: boolean
}

/** 激活阈值（px——mockup L944 同值） */
const DRAG_THRESHOLD = 5

interface DragSession {
  nodeId: string
  srcKey: string
  frameEl: HTMLDivElement | null
  srcIds: string[]
  sx: number
  sy: number
  /** [②U7] 抓取偏移=**内容坐标**（拖影 absolute 驻 .tl-content——视口偏移/z） */
  ox: number
  oy: number
  moved: boolean
  /** [②U7] 拖影位置=内容坐标（flight job 同域传递） */
  ghost: { x: number; y: number }
  insertIdx: number
  /** [②U6] 原始槽位（回弹基准——源框外松手飞行落点） */
  srcIdx: number
  overFrame: boolean
  /** [②U6] 框底缘下拉态（源框底缘以下 x 带内） */
  extend: boolean
  /** [回炉 R1] 拖前 React inline marginLeft（瀑布错位）——拖起期压 0 防双计，
   *  清场恢复（React style diff 不重写未变值——须自恢复非赖重渲染） */
  marginLeft0: string
}

/** [②U6] 源框物理域命中=框内 ∪ 底缘 82px 下拉带（x 带内——腾新行面；
 *  onMove 槽相位/onUp 落位判定两处同式单源） */
const overSourceFrame = (frameEl: HTMLDivElement | null, x: number, y: number): boolean => {
  if (frameEl === null) return false
  const fr = frameEl.getBoundingClientRect()
  if (x >= fr.left && x <= fr.right && y >= fr.top && y <= fr.bottom) return true
  return x >= fr.left && x <= fr.right && y > fr.bottom && y <= fr.bottom + 82
}

/** [②U7] 视口点→内容坐标（z 逆变换；base=内容层 rect——判定时点取值） */
const toContent = (content: HTMLElement, clientX: number, clientY: number): { x: number; y: number } => {
  const base = content.getBoundingClientRect()
  const z = contentScale()
  return { x: (clientX - base.left) / z, y: (clientY - base.top) / z }
}

export function useDragSession(args: {
  nodes: LineageNode[]
  groups: TimelineYearGroup[]
  /** [F-LGRAPH-01①U5] 拖拽闸：拖卡=edit 专属（browse/focus pointerdown 即拒
   *  ——现「view/edit 双态无 mode 门槛」退役） */
  dragEnabled: boolean
  /** 互斥闸：拾取中/线型弹层开/改月弹层开（三者任一禁拖） */
  isPicking: boolean
  popOpen: boolean
  monthPopOpen: boolean
  contentRef: RefObject<HTMLDivElement | null>
  /** 松手构造飞行任务落此（编排层 settle effect 消费） */
  onFlightReady(job: FlightJob): void
  /** settle 清场后路由重算信号（routeEpoch bump 既有链） */
  onRouteRecalc(): void
  /** settle 落定后月组全序写路径（无乐观写——飞行窗禁写） */
  onReorderMonthSlots?: (nodeIds: string[]) => void
}): {
  phase: DragPhase
  setPhase(p: DragPhase): void
  slot: DragSlotPreview | null
  setSlot(v: DragSlotPreview | null): void
  flightRef: React.MutableRefObject<FlightJob | null>
  handleCardPointerDown(nodeId: string, ev: ReactPointerEvent<HTMLElement>): void
  registerFrame(key: string, el: HTMLDivElement | null): void
  consumeClickSuppress(): boolean
} {
  const { nodes, groups, contentRef } = args
  const [phase, setPhase] = useState<DragPhase>('idle')
  const [slot, setSlot] = useState<DragSlotPreview | null>(null)

  const sessionRef = useRef<DragSession | null>(null)
  const flightRef = useRef<FlightJob | null>(null)
  const framesRef = useRef(new Map<string, HTMLDivElement>())
  const suppressClickRef = useRef(false)

  const findCard = (nodeId: string): HTMLElement | null =>
    contentRef.current?.querySelector(`.tl-card[data-node-id="${nodeId}"]`) ?? null

  // ── pointer 会话（pending/dragging 期 document 级监听）──────────────
  useEffect(() => {
    if (phase !== 'pending' && phase !== 'dragging') return
    const onMove = (e: PointerEvent): void => {
      const s = sessionRef.current
      if (s === null) return
      const content = contentRef.current
      if (!s.moved) {
        if (Math.hypot(e.clientX - s.sx, e.clientY - s.sy) < DRAG_THRESHOLD) return
        s.moved = true
        const card = findCard(s.nodeId)
        if (card !== null && content !== null) {
          const r = card.getBoundingClientRect()
          // [②U7] 拖影=absolute 驻内容层+内容坐标（transform 祖先劫持 fixed）：
          // 起点/偏移经 z 逆变换（z=1 时与旧视口系同值）；偏移锚=pointerdown
          // 坐标 s.sx/s.sy（激活帧 e=首个 move 事件——非按点位）
          s.ox = (s.sx - r.left) / contentScale()
          s.oy = (s.sy - r.top) / contentScale()
          const ghostContent = toContent(content, r.left, r.top)
          s.ghost = ghostContent
          s.marginLeft0 = card.style.marginLeft
          card.style.position = 'absolute'
          card.style.left = `${ghostContent.x}px`
          card.style.top = `${ghostContent.y}px`
          card.style.width = `${r.width / contentScale()}px`
          // [回炉 R1/B-1] absolute 盒 left 定位 margin edge——压 0 后 left=视觉
          // 位（无双计）；[回炉 R8/d1-B1] 同步禁断过渡（基类 margin-left
          // .25s 在场——不禁断则 82→0 启动 0.25s 过渡=拖起 +82px 滑移）
          card.style.marginLeft = '0'
          card.style.transition = 'none'
        }
        setSlot({ nodeId: s.nodeId, srcKey: s.srcKey, insertIdx: s.insertIdx, active: true, overFrame: true, extend: false })
        setPhase('dragging')
      }
      // [②U7] 指针→内容坐标−内容域抓取偏移（z 判定时点取值——缩放正交）
      const p = content !== null ? toContent(content, e.clientX, e.clientY) : { x: e.clientX, y: e.clientY }
      s.ghost = { x: p.x - s.ox, y: p.y - s.oy }
      const card = findCard(s.nodeId)
      if (card !== null) {
        card.style.left = `${s.ghost.x}px`
        card.style.top = `${s.ghost.y}px`
      }
      // [②U6] 源框物理域命中（框内 ∪ 底缘下拉带）：下拉带=over+extend+插位组末
      const inBand = s.frameEl !== null && !frameContains(s.frameEl, e.clientX, e.clientY)
      const over = overSourceFrame(s.frameEl, e.clientX, e.clientY)
      const extend = over && inBand
      let nextIdx = s.insertIdx
      if (over && s.frameEl !== null) {
        const othersCount = Array.from(s.frameEl.querySelectorAll<HTMLElement>('.tl-card[data-node-id]')).filter(
          (c) => c.dataset.nodeId !== s.nodeId
        ).length
        if (extend) nextIdx = othersCount // 新行空位=组末
        else {
          const rects = Array.from(s.frameEl.querySelectorAll<HTMLElement>('.tl-card[data-node-id]'))
            .filter((c) => c.dataset.nodeId !== s.nodeId)
            .map((c) => c.getBoundingClientRect())
          nextIdx = insertIndexFromRects(rects, e.clientX, e.clientY)
        }
      }
      if (over !== s.overFrame || nextIdx !== s.insertIdx || extend !== s.extend) {
        s.overFrame = over
        s.insertIdx = nextIdx
        s.extend = extend
        setSlot((prev) =>
          prev === null ? prev : { ...prev, overFrame: over, insertIdx: nextIdx, extend }
        )
      }
    }
    const onUp = (e: PointerEvent): void => {
      const s = sessionRef.current
      sessionRef.current = null
      if (s === null) return
      if (!s.moved) {
        setPhase('idle') // 阈值未过=click 链保活（选中由随后的 click 承载）
        return
      }
      suppressClickRef.current = true // 拖后 click 抑制（一次性——click 同步随后到达）
      // [F-LGRAPH-01②U6/退役行 7] 限本月=物理域：源月框外松手=回弹原位
      //（飞行落点=原始槽位 idx）——不写不弹 toast（INV-83 跨月拒绝子句退役，
      // 代码面零残留）；框内∪下拉带松手沿承候选槽落位（overSourceFrame 单源）
      const inSrcFrame = overSourceFrame(s.frameEl, e.clientX, e.clientY)
      const settleIdx = inSrcFrame ? s.insertIdx : s.srcIdx
      const others = s.srcIds.filter((id) => id !== s.nodeId)
      const finalIds = [...others.slice(0, settleIdx), s.nodeId, ...others.slice(settleIdx)]
      const changed = finalIds.join(' ') !== s.srcIds.join(' ')
      args.onFlightReady({
        nodeId: s.nodeId,
        fromX: s.ghost.x,
        fromY: s.ghost.y,
        marginLeft0: s.marginLeft0,
        finish: () => {
          setPhase('idle')
          setSlot(null)
          args.onRouteRecalc()
          if (changed) args.onReorderMonthSlots?.(finalIds)
        }
      })
      setSlot({ nodeId: s.nodeId, srcKey: s.srcKey, insertIdx: settleIdx, active: false, overFrame: true })
      setPhase('settle')
    }
    // [R5] pointercancel 同 onUp 径：系统取消（触控手势/设备抢占）=落当前
    // 候选槽（与松手同式清场——不回滚不写错位；mockup 无 cancel 样本取值申报）
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
    document.addEventListener('pointercancel', onUp)
    return () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
      document.removeEventListener('pointercancel', onUp)
    }
    // args 回调经 ref 闭包稳定（finish 期读回调需最新——依赖注入点整组随会话
    // 读取，phase 之外零重挂）
  }, [phase, nodes, groups])

  const handleCardPointerDown = (nodeId: string, ev: ReactPointerEvent<HTMLElement>): void => {
    // [R6] 未消费抑制随新会话清零（拖后 click 落在祖先时旗标残留会吞下次
    // 真单击一次——清零=抑制只作用于紧随本次拖拽的 click）
    suppressClickRef.current = false
    if (phase !== 'idle') return // settle/dragging/pending 期忽略
    if (!args.dragEnabled) return // [U5] 模式闸：拖卡=edit 专属（pointerdown 即拒）
    if (ev.button !== 0) return
    if ((ev.target as Element).closest('.c-ym') !== null) return // 月标点击面
    if (args.isPicking || args.popOpen || args.monthPopOpen) return // 拾取/弹层互斥
    const cardEl = ev.currentTarget
    const n = nodes.find((x) => x.id === nodeId)
    const frameEl = cardEl.closest('.month-frame') as HTMLDivElement | null
    if (n === undefined || frameEl === null) return
    const r = cardEl.getBoundingClientRect()
    const srcKey = frameKeyOf(n.year, n.month)
    const srcIds = srcGroupIdsOf(groups, nodes, srcKey)
    sessionRef.current = {
      nodeId,
      srcKey,
      frameEl,
      srcIds,
      sx: ev.clientX,
      sy: ev.clientY,
      ox: ev.clientX - r.left,
      oy: ev.clientY - r.top,
      moved: false,
      ghost: { x: r.left, y: r.top },
      insertIdx: srcIds.indexOf(nodeId),
      srcIdx: srcIds.indexOf(nodeId),
      overFrame: true,
      extend: false,
      marginLeft0: ''
    }
    try {
      cardEl.setPointerCapture(ev.pointerId)
    } catch {
      // 合成事件 pointerId 缺席（jsdom）——document 级监听已覆盖移动/松手
    }
    setPhase('pending')
  }

  const registerFrame = (key: string, el: HTMLDivElement | null): void => {
    if (el === null) framesRef.current.delete(key)
    else framesRef.current.set(key, el)
  }

  const consumeClickSuppress = (): boolean => {
    const v = suppressClickRef.current
    suppressClickRef.current = false
    return v
  }

  return {
    phase,
    setPhase,
    slot,
    setSlot,
    flightRef,
    handleCardPointerDown,
    registerFrame,
    consumeClickSuppress
  }
}
