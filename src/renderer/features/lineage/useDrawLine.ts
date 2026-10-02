// b3: P7-H
/**
 * [F-LGRAPH-01②U3] useDrawLine —— 画线子态机 hook（mockup §2.4 定案）。
 *
 * ── 态空间（宪法状态纪律）──
 * armed=工具态（view.tool ∈ {draw-solid, draw-dashed}——驻 view.store，页面
 * 内持久：切 select/切模式/切图中止=resetTool 承载）× drag ∈ {idle, dragging} ×
 * {from: 源锚, cursor: 指针内容坐标, snap: 吸附指示锚}。
 *
 * ── 迁移表（§2.4 逐条）──
 * - armed+pointerdown 近锚（12 锚/卡±6 内容坐标）→ dragging（预览线+吸附指示
 *   +源卡 .link-src 高亮[回炉 R15]）——**document 级拖拽会话**（[回炉 R1①]
 *   pointermove/up/pointercancel+window blur——use-edge-edit runDragSession
 *   先例：指针离画布仍跟随，中断=取消无残留）
 * - dragging+pointerup 落另一卡近锚 → 建边（drawEdge：manual+dashed/color=
 *   当前工具线型+label=当前色行名快照 P-14）→ idle（tool 回 select）+入撤销栈
 *   （收尾带 armed 闸[回炉 R1③]——工具已非画线不建边）
 * - dragging+pointerup 空白/同卡 → 取消 → idle（**armed 保留**——tool 不动）
 * - 切模式/切 select/切图下降沿：dragging 中止=取消（[回炉 R1②] effect 监听
 *   tool/mode/folderId 三源——会话监听同步拆除）
 * - UI 预检（现行语义沿承）：同卡近邻=自环不建；同端点对无向查重=toast 拒绝；
 *   环检测留 service 保存面（CONFLICT 丢弃+toast）
 * - 拖拽抑制：dragging 会话收尾（pointerup 落定/取消）→ 下一 click 吞（防建
 *   边后误触发卡选中；abort 中断不吞——无后续 click）
 * - [回炉 R13] 近锚 pointerdown 消费即 stopPropagation（防 pan 等容器级
 *   并行激活）
 * - [RR 补批 RR17] 多指针重入 phase 闸：dragging 中第二 pointerdown（触屏
 *   二指/笔）忽略（已消费不覆盖会话）+document 会话事件 pointerId 绑定
 *   （他指 move/up/pointercancel 不驱动不收尾不取消本会话——首指 up 正常
 *   收尾；pid 缺省=鼠标/jsdom MouseEvent 型放行）
 *
 * 坐标域：内容坐标（指针 clientXY−content rect 原点；缩放正交——轮 2 缩放经
 * 逆变换，本批直接内容坐标）。纯几何单源复用 routing/anchors（anchorPoint+
 * Pt/Rect）。jsdom/测试经 DOM rect mock 驱动。
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { RefObject } from 'react'
import { LINE_TYPE_COLORS } from '@shared/models/lineage'
import { anchorPoint, type Pt, type Rect, type Side } from './routing/anchors'
import { contentScale, toContentPt as zoomToContentPt, toContentRect } from './timeline-zoom'
import { showToast } from '../../shared/ui/toast-store'
import { useLineageStore } from './lineage.store'
import { useLineageViewStore } from './lineage-view.store'

/** 吸附半径（内容坐标 px——§2.4 近锚 ±6） */
export const DRAW_SNAP_R = 6

export interface DrawAnchor {
  nodeId: string
  pt: Pt
}

export interface DrawLineState {
  phase: 'idle' | 'dragging'
  from: DrawAnchor | null
  cursor: Pt | null
  snap: DrawAnchor | null
}

/** 卡 rect 采集（.tl-card[data-node-id] getBoundingClientRect→内容坐标；
 *  [②U7] 经逆变换换算（z≠1 时视口 rect 含 transform 缩放——坐标域正交） */
function cardRects(content: HTMLElement): Array<{ nodeId: string; rect: Rect }> {
  const base = content.getBoundingClientRect()
  const z = contentScale()
  const out: Array<{ nodeId: string; rect: Rect }> = []
  for (const el of Array.from(content.querySelectorAll<HTMLElement>('.tl-card[data-node-id]'))) {
    const r = el.getBoundingClientRect()
    out.push({ nodeId: el.dataset.nodeId ?? '', rect: toContentRect(r, base, z) })
  }
  return out
}

/** 指针→内容坐标（[②U7] 逆变换——除以 z） */
function toContentPt(content: HTMLElement, clientX: number, clientY: number): Pt {
  const base = content.getBoundingClientRect()
  return zoomToContentPt(base, clientX, clientY)
}

/** 全图 12 锚最近命中（≤DRAW_SNAP_R）——[side,slot] 遍历取距离最近者 */
function nearestAnchor(
  cards: Array<{ nodeId: string; rect: Rect }>,
  p: Pt,
  excludeNodeId?: string
): DrawAnchor | null {
  let best: DrawAnchor | null = null
  let bestD = DRAW_SNAP_R
  const sides: Side[] = ['top', 'bottom', 'left', 'right']
  for (const { nodeId, rect } of cards) {
    if (excludeNodeId !== undefined && nodeId === excludeNodeId) continue
    for (const side of sides) {
      for (let slot = 0; slot <= 2; slot++) {
        const a = anchorPoint(rect, side, slot)
        const d = Math.hypot(a.x - p.x, a.y - p.y)
        if (d <= bestD) {
          bestD = d
          best = { nodeId, pt: a }
        }
      }
    }
  }
  return best
}

/** 同端点对无向查重（service UNIQUE(from,to) 的 UI 预检面——现行语义沿承） */
function hasPair(from: string, to: string): boolean {
  const edges = useLineageStore.getState().edges
  return edges.some(
    (e) => (e.fromNode === from && e.toNode === to) || (e.fromNode === to && e.toNode === from)
  )
}

export function useDrawLine(args: {
  contentRef: RefObject<HTMLDivElement | null>
}): {
  state: DrawLineState
  /** .tl-content pointerdown（draw 态消费；返回 true=已消费——容器不分发拖拽） */
  handlePointerDown(ev: ReactPointerEvent<HTMLDivElement>): boolean
  /** dragging 收尾后的 click 抑制（一次性——防建边触发卡选中） */
  consumeClickSuppress(): boolean
} {
  const [state, setState] = useState<DrawLineState>({ phase: 'idle', from: null, cursor: null, snap: null })
  const suppressClickRef = useRef(false)
  const stateRef = useRef(state)
  stateRef.current = state
  /** 拖拽会话监听拆除句柄（下降沿/卸载清理共用——[回炉 R1②]） */
  const sessionCleanupRef = useRef<() => void>(() => undefined)

  const armed = (): boolean => {
    const tool = useLineageViewStore.getState().tool
    return tool === 'draw-solid' || tool === 'draw-dashed'
  }

  const cancel = useCallback((): void => {
    setState({ phase: 'idle', from: null, cursor: null, snap: null })
  }, [])

  // [回炉 R1②] 下降沿清理：切模式/切 select/切图（tool/mode/folderId 任一变化）
  // =dragging 中止（取消无残留+会话监听拆除）
  const tool = useLineageViewStore((s) => s.tool)
  const mode = useLineageViewStore((s) => s.mode)
  const folderId = useLineageStore((s) => s.folderId)
  useEffect(() => {
    if (stateRef.current.phase !== 'dragging') return
    sessionCleanupRef.current()
    cancel()
  }, [tool, mode, folderId, cancel])

  // 卸载清理（会话监听不越界驻留）
  useEffect(() => () => sessionCleanupRef.current(), [])

  // [RR4] suppress 旗同手势消费：document click capture 一次性——落点无论
  // 卡/空白皆就地消费（原仅卡点击点消费=click 落非卡面时旗残留吞下一次卡
  // 点击）；画布内落点止泡（防建边误选卡语义沿承），画布外（工具组等）仅
  // 消费不拦（e2e 保存钮点击不受抑）
  useEffect(() => {
    const onCapture = (ev: MouseEvent): void => {
      if (!suppressClickRef.current) return
      suppressClickRef.current = false
      const t = ev.target
      if (t instanceof Element && t.closest('.tl-content') !== null) ev.stopPropagation()
    }
    document.addEventListener('click', onCapture, { capture: true })
    return () => document.removeEventListener('click', onCapture, { capture: true })
  }, [])

  /** 建边收尾（document pointerup——armed 闸+同卡/空白取消+查重预检） */
  const finish = useCallback(
    (clientX: number, clientY: number): void => {
      const from = stateRef.current.from
      suppressClickRef.current = true // click 抑制（一次性）
      setState({ phase: 'idle', from: null, cursor: null, snap: null })
      if (!armed()) return // [回炉 R1③] armed 闸：收尾时工具已非画线=不建边
      if (from === null) return
      const content = args.contentRef.current
      if (content === null) return
      const p = toContentPt(content, clientX, clientY)
      const target = nearestAnchor(cardRects(content), p, from.nodeId)
      if (target === null) return // 空白/同卡=取消（armed 保留——tool 不动）
      // 同卡自环面已由 excludeNodeId 排除（target≠from 卡）；查重预检：
      if (hasPair(from.nodeId, target.nodeId)) {
        showToast('两节点间已存在连线', 'error')
        return
      }
      const view = useLineageViewStore.getState()
      const dashed = view.tool === 'draw-dashed'
      const colorIndex = LINE_TYPE_COLORS.indexOf(view.currentLineColor as (typeof LINE_TYPE_COLORS)[number])
      const label = useLineageStore.getState().lineTypeNames[colorIndex === -1 ? 0 : colorIndex] ?? ''
      useLineageStore.getState().drawEdge(from.nodeId, target.nodeId, { dashed, color: view.currentLineColor, label })
      // 建边后回 select（§2.4——idle(select)）
      useLineageViewStore.getState().resetTool()
    },
    [args.contentRef]
  )

  const handlePointerDown = useCallback(
    (ev: ReactPointerEvent<HTMLDivElement>): boolean => {
      if (!armed() || ev.button !== 0) return false
      // [RR 补批 RR17] 多指针重入 phase 闸：dragging 中第二指忽略——返回
      // true=已消费（不覆盖会话不触发容器拖拽；首指 up 正常收尾）
      if (stateRef.current.phase === 'dragging') {
        ev.stopPropagation() // [RRB5] 消费即止泡（R13 先例对齐——防容器级并行激活）
        return true
      }
      const content = args.contentRef.current
      if (content === null) return false
      const p = toContentPt(content, ev.clientX, ev.clientY)
      const hit = nearestAnchor(cardRects(content), p)
      if (hit === null) return false
      ev.preventDefault()
      ev.stopPropagation() // [回炉 R13] 消费即止泡（防 pan 等并行激活）
      setState({ phase: 'dragging', from: hit, cursor: p, snap: null })
      // [RR 补批 RR17] 会话指针绑定：他指事件（pointerId 异于会话主指）不
      // 驱动不收尾不取消；pid 缺省（鼠标/jsdom MouseEvent 型）放行
      const pid = ev.pointerId
      const sameSession = (e: PointerEvent | MouseEvent): boolean => {
        const id = (e as PointerEvent).pointerId
        return id === undefined || id === pid
      }
      // [回炉 R1①] document 级拖拽会话（runDragSession 先例）：move/up 在
      // document 派发（指针离画布仍跟随）；pointercancel/blur=中断取消无残留
      const move = (e: PointerEvent | MouseEvent): void => {
        if (!sameSession(e)) return // [RR17] 他指 move 忽略
        const s = stateRef.current
        if (s.phase !== 'dragging') return
        const c = args.contentRef.current
        if (c === null) return
        const pt = toContentPt(c, e.clientX, e.clientY)
        const snap = nearestAnchor(cardRects(c), pt, s.from?.nodeId)
        setState({ ...s, cursor: pt, snap })
      }
      const up = (e: PointerEvent | MouseEvent): void => {
        if (!sameSession(e)) return // [RR17] 他指 up 不收尾本会话
        cleanup()
        finish(e.clientX, e.clientY)
      }
      const abort = (e: Event): void => {
        if (!sameSession(e as PointerEvent | MouseEvent)) return // [RR17] 他指 cancel 不取消
        cleanup()
        cancel() // [回炉 R1④] 中断=取消无残留（不吞后续 click）
      }
      const cleanup = (): void => {
        document.removeEventListener('pointermove', move)
        document.removeEventListener('pointerup', up)
        document.removeEventListener('pointercancel', abort)
        window.removeEventListener('blur', abort)
      }
      document.addEventListener('pointermove', move)
      document.addEventListener('pointerup', up)
      document.addEventListener('pointercancel', abort)
      window.addEventListener('blur', abort)
      sessionCleanupRef.current = cleanup
      return true
    },
    [args.contentRef, finish, cancel]
  )

  const consumeClickSuppress = useCallback((): boolean => {
    const v = suppressClickRef.current
    suppressClickRef.current = false
    return v
  }, [])

  return { state, handlePointerDown, consumeClickSuppress }
}
