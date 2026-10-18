// b3: P7-H
/**
 * [F-VISFB-65 拆件] use-note-create-menu —— 悬浮笔记右键创建菜单 native 挂载
 * effect（自 LineageFloatingNotes 纯移动——行数红线布线 hook 化，
 * useNoteDraftBridge 同型先例；语义零变：交互门/命中让路/打断先收口〔经
 * commitRef 现值——native 闭包跨渲染取最新收口〕/右键点 own 坐标入菜单；
 * deps=稳定引用〔setMenu/commitRef〕——重订阅频率与原 [contentRef] 等价）。
 */
import { useEffect, type RefObject } from 'react'
import { notesInteractive, toOwnPt } from './lineage-note-geom'
import type { NoteMenu } from './LineageNoteMenu'

export function useNoteCreateMenu(
  contentRef: RefObject<HTMLDivElement | null>,
  commitRef: RefObject<() => void>,
  setMenu: (menu: NoteMenu | null) => void
): void {
  useEffect(() => {
    const el = contentRef.current
    if (el === null) return
    const onCtx = (e: MouseEvent): void => {
      if (!notesInteractive()) return
      const t = e.target as HTMLElement | null
      if (t === null || t.closest('.tl-card, .tl-note, .tl-edge-hit, .tl-edge-hits, .edge-handle') !== null) return
      e.preventDefault()
      commitRef.current?.()
      setMenu({
        kind: 'create',
        anchor: { x: e.clientX, y: e.clientY },
        ownPt: toOwnPt(contentRef, e.clientX, e.clientY)
      })
    }
    el.addEventListener('contextmenu', onCtx)
    return () => el.removeEventListener('contextmenu', onCtx)
  }, [contentRef, setMenu, commitRef])
}
