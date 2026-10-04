/**
 * [F-UIRES-01 批 A U4] useFolderDrop —— 左栏行拖放目标逻辑（FolderNav 拆件：
 * 组件 250 行红线）。§2.3/§2.5/R13 承接：
 * - 合法目标=文件夹行（「全部文献」=非目标；[F-ALIGN-01 D5] 第三筛选态行随
 *   D5 退役删除——DndTarget 恒 folder 单态）；仅响应内部 MIME
 *   （application/x-synapse-paper）——OS 文件拖入（types 含 Files）不响应；
 * - drop：busy 双重校验+moveFolder 链（收尾两分支在 paper-move）+drag 期目标
 *   消失护栏（folderId 不在现行列表→no-op+toast「目标文件夹已不存在」）；
 * - [RR1-3/k2-B2+d1-W2] 空白/原处释放=取消（§2.3 末行）：行 dragleave 即清
 *   候选——空白 drop 到达容器时 over 恒空=取消回 idle（零 IPC 零 toast）；
 *   「行消失残留位」护栏仅对 over 非空且 folderId 不在现行列表时 toast。
 */
import type { DragEvent } from 'react'
import { showToast } from '../../shared/ui/Toast'
import { useImportBusyStore } from '../../shared/import-busy.store'
import { PAPER_DRAG_MIME, useLibraryDnd, type DndTarget } from './library-dnd.store'
import { movePaperToFolder } from './paper-move'
import type { Folder } from '@shared/models/folder'

/** [R13] drag 期目标消失护栏文案（§2.3） */
const DROP_TARGET_GONE = '目标文件夹已不存在'

type FolderRowDragEvent = DragEvent<HTMLButtonElement>
type NavDragEvent = DragEvent<HTMLElement>

export function useFolderDrop(folders: readonly Folder[] | null): {
  rowDragOver(e: FolderRowDragEvent, target: DndTarget): void
  /** [RR1-3] 行 dragleave：候选即清（子元素内移动不误清）——空白/原处释放=取消 */
  rowDragLeave(e: FolderRowDragEvent): void
  rowDrop(e: FolderRowDragEvent, target: DndTarget): void
  navDragOver(e: NavDragEvent): void
  navDrop(e: NavDragEvent): void
} {
  /** 目标在现行列表在场判定 */
  function folderAlive(folderId: string): boolean {
    return (folders ?? []).some((f) => f.id === folderId)
  }

  function rowDragOver(e: FolderRowDragEvent, target: DndTarget): void {
    if (!e.dataTransfer.types.includes(PAPER_DRAG_MIME)) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    useLibraryDnd.getState().setOver(target)
  }

  function rowDragLeave(e: FolderRowDragEvent): void {
    // relatedTarget 仍在行内（移入子元素）≠离开——不清候选
    const to = e.relatedTarget
    if (to instanceof Node && e.currentTarget.contains(to)) return
    useLibraryDnd.getState().setOver(null)
  }

  function rowDrop(e: FolderRowDragEvent, target: DndTarget): void {
    if (!e.dataTransfer.types.includes(PAPER_DRAG_MIME)) return
    e.preventDefault()
    e.stopPropagation()
    const dnd = useLibraryDnd.getState()
    const paperId = dnd.drag?.paperId
    dnd.end()
    if (paperId === undefined) return
    if (useImportBusyStore.getState().busy) return
    // [F-ALIGN-01 D5] target 恒 folder 单态——直取 folderId（消失护栏同承）
    if (!folderAlive(target.folderId)) {
      showToast(DROP_TARGET_GONE, 'info')
      return
    }
    void movePaperToFolder(paperId, target.folderId)
  }

  function navDragOver(e: NavDragEvent): void {
    if (!e.dataTransfer.types.includes(PAPER_DRAG_MIME)) return
    e.preventDefault()
  }

  function navDrop(e: NavDragEvent): void {
    if (!e.dataTransfer.types.includes(PAPER_DRAG_MIME)) return
    e.preventDefault()
    const dnd = useLibraryDnd.getState()
    const paperId = dnd.drag?.paperId
    const over = dnd.over
    dnd.end()
    if (paperId === undefined || over === null) return
    // over 目标仍有效则按其执行（含消失护栏）；无 over=取消回 idle
    if (!folderAlive(over.folderId)) {
      showToast(DROP_TARGET_GONE, 'info')
      return
    }
    void movePaperToFolder(paperId, over.folderId)
  }

  return { rowDragOver, rowDragLeave, rowDrop, navDragOver, navDrop }
}
