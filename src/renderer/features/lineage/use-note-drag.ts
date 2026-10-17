// b3: P7-H
/**
 * [F-VISFB-62] use-note-drag —— 悬浮笔记书签柄拖动会话 hook（组件 250 行
 * 红线拆件面；card-drag-session 先例组织法：document 级监听+up/cancel 同径
 * 落定）。会话坐标族全 own 域（lineage-note-geom 单源换算）：
 * - 抓取帧记 p0（指针 own 点）+start（笔记现值）；live=start+指针 own 差，
 *   逐 move 经 clampToContent 钳内容域（防拖出域外不可寻回）；
 * - pointerup/pointercancel：**live!==start 才提交** updateFloatingNote
 *   (id,{x,y})（44 号零位移先例——同值 up 不入队不 dirty 零撤销单元）；
 * - [S6] 会话指针绑定（useDrawLine RR17 先例同型）：他指 move/up 不驱动
 *   不收尾本会话（pointerId 缺省=鼠标/jsdom MouseEvent 型放行）+window
 *   blur=中止丢弃（回弹 store 现值零写）；
 * - [S1②] saving 进入=中止在飞会话丢弃 live（与零位移同族=不提交回弹）；
 * - [R3] pointerup 异步落点写前核在场（他径已删=静默丢弃）；
 * - 渲染面窄读：drag={id,live}（拖动中笔记 left/top=live）。
 */
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from 'react'
import type { FloatingNote } from '@shared/models/lineage'
import type { Pt } from './routing/anchors'
import { useLineageStore } from './lineage.store'
import { clampToContent, NOTE_H, NOTE_W, toOwnPt } from './lineage-note-geom'

interface DragState {
  id: string
  /** 提交基准（笔记现值——live!==start 判别面） */
  start: Pt
  /** 抓取帧指针 own 点（位移量=p−p0） */
  p0: Pt
  live: Pt
  w: number
  h: number
  /** [S6] 会话主指 pointerId（缺省=鼠标/jsdom MouseEvent 型——全放行） */
  pid: number | undefined
}

/** 渲染面消费形（live=钳后现位——拖动中笔记 left/top 源） */
export interface NoteDragView {
  id: string
  live: Pt
}

/** [S6] 会话指针判定（useDrawLine sameSession 先例同型） */
const sameSession = (e: PointerEvent, pid: number | undefined): boolean => {
  const id = (e as { pointerId?: number }).pointerId
  return id === undefined || id === pid
}

export function useNoteDrag(contentRef: RefObject<HTMLDivElement | null>): {
  drag: NoteDragView | null
  onGripDown(n: FloatingNote, e: ReactPointerEvent<HTMLElement>): void
} {
  const [state, setState] = useState<DragState | null>(null)
  const stateRef = useRef<DragState | null>(null)
  stateRef.current = state
  // [S1②] saving 进入=中止在飞会话（丢弃 live 回弹 store 现值——不提交）
  const saving = useLineageStore((s) => s.saveStatus === 'saving')
  useEffect(() => {
    if (!saving) return
    stateRef.current = null
    setState(null)
  }, [saving])

  const dragging = state !== null
  useEffect(() => {
    if (!dragging) return
    const onMove = (e: PointerEvent): void => {
      const d = stateRef.current
      if (d === null || !sameSession(e, d.pid)) return
      const p = toOwnPt(contentRef, e.clientX, e.clientY)
      const next = clampToContent(
        contentRef,
        { x: d.start.x + (p.x - d.p0.x), y: d.start.y + (p.y - d.p0.y) },
        d.w,
        d.h
      )
      if (next.x !== d.live.x || next.y !== d.live.y) setState({ ...d, live: next })
    }
    const onUp = (e: PointerEvent): void => {
      if (!sameSession(e, stateRef.current?.pid)) return
      const d = stateRef.current
      stateRef.current = null
      setState(null)
      if (d === null) return
      // [44 号先例] 零位移守卫：live!==start 才提交（同值 up 不入队不 dirty）；
      // [R3] 幽灵写防御：pointerup 为异步落点——写前核该笔记仍在 store
      //（拖动中他径删除/undo），不在=静默丢弃会话不抛不写
      if (d.live.x !== d.start.x || d.live.y !== d.start.y) {
        const store = useLineageStore.getState()
        if (store.floatingNotes.some((f) => f.id === d.id)) {
          store.updateFloatingNote(d.id, { x: d.live.x, y: d.live.y })
        }
      }
    }
    // [S6] blur=中止丢弃（useDrawLine abort 同型：回弹零写无残留）
    const onAbort = (): void => {
      stateRef.current = null
      setState(null)
    }
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
    document.addEventListener('pointercancel', onUp)
    window.addEventListener('blur', onAbort)
    return () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
      document.removeEventListener('pointercancel', onUp)
      window.removeEventListener('blur', onAbort)
    }
  }, [dragging, contentRef])

  /** 书签柄 pointerdown 开会话（button 0；会话中忽略；宿主收口编辑态后笔记
   *  可能已被回收〔空稿收口=remove〕——在场核不过不开会话；[S6] 记会话主指
   *  pointerId；占位读笔记元素 offsetWidth/Height——own 域，0=未量测回落
   *  NOTE_W/H 基值） */
  const onGripDown = (n: FloatingNote, e: ReactPointerEvent<HTMLElement>): void => {
    if (e.button !== 0 || stateRef.current !== null) return
    if (!useLineageStore.getState().floatingNotes.some((f) => f.id === n.id)) return
    const noteEl = e.currentTarget.closest('.tl-note') as HTMLElement | null
    const w = noteEl !== null && noteEl.offsetWidth > 0 ? noteEl.offsetWidth : NOTE_W
    const h = noteEl !== null && noteEl.offsetHeight > 0 ? noteEl.offsetHeight : NOTE_H
    const start = { x: n.x, y: n.y }
    setState({ id: n.id, start, p0: toOwnPt(contentRef, e.clientX, e.clientY), live: start, w, h, pid: e.pointerId })
  }

  return { drag: state === null ? null : { id: state.id, live: state.live }, onGripDown }
}
