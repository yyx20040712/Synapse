/**
 * [F-UIRES-01 批 A U4] LibraryDragGhost —— 拖拽跟随徽标（§2.3：ghost=
 * 「{题名截断}→目标」——单选模型；mockup .drag-ghost 语汇）。document dragover
 * 跟随指针（坐标消费 library-dnd.store；目标名随 dragover 候选实时更新）。
 * 纯展示组件（无写路径——态由 PaperRow/FolderNav 事件驱动）。
 */
import { useEffect } from 'react'
import { useLibraryDnd } from './library-dnd.store'

/** 题名截断上限（截断+省略号——ghost 宽度预算） */
const TITLE_LIMIT = 12

function truncateTitle(title: string): string {
  return title.length > TITLE_LIMIT ? `${title.slice(0, TITLE_LIMIT)}…` : title
}

export function LibraryDragGhost(): JSX.Element | null {
  const drag = useLibraryDnd((s) => s.drag)
  const over = useLibraryDnd((s) => s.over)
  const ghostPos = useLibraryDnd((s) => s.ghostPos)
  const moveGhost = useLibraryDnd((s) => s.moveGhost)

  // document 级 dragover 跟随（dragstart 后原生 ghost 由 dataTransfer 驱动，
  // 本件为自定义跟随面；unmount 成对清理）
  useEffect(() => {
    if (drag === null) return
    const onDragOver = (e: DragEvent): void => {
      moveGhost(e.clientX, e.clientY)
    }
    document.addEventListener('dragover', onDragOver)
    return () => document.removeEventListener('dragover', onDragOver)
  }, [drag, moveGhost])

  if (drag === null || ghostPos === null) return null
  const targetName = over === null ? '' : over.kind === 'folder' ? over.name : '未归档'
  return (
    <div
      className="lib-drag-ghost"
      aria-hidden="true"
      style={{ left: ghostPos.x + 12, top: ghostPos.y + 12 }}
    >
      <svg viewBox="0 0 24 24">
        <path d="M4 6c0-1 1-2 2-2h4l2 2h6c1 0 2 1 2 2v9c0 1-1 2-2 2H6c-1 0-2-1-2-2z" />
      </svg>
      {`${truncateTitle(drag.title)}${targetName === '' ? '' : ` → ${targetName}`}`}
    </div>
  )
}
