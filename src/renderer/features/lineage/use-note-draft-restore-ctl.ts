// b3: P7-H
/**
 * [F-VISFB-65] useNoteDraftRestoreCtl —— 恢复草稿再水化控制面（§5/N-06：
 * 在场笔记开编辑器；noteId 不在图→新笔记草稿——内容进新建流程+提示
 * 「原笔记已不存在，将作为新笔记」）。LineageFloatingNotes 行数红线拆件
 * （useNoteCreateMenu 同批先例）。
 */
import type { RefObject } from 'react'
import type { NoteDraftRestoreCtl } from './lineage-note-draft'
import { useLineageStore } from './lineage.store'
import { clampToContent, NOTE_H, NOTE_W } from './lineage-note-geom'
import { showToast } from '../../shared/ui/toast-store'

export function useNoteDraftRestoreCtl(
  contentRef: RefObject<HTMLDivElement | null>,
  setEditingId: (id: string | null) => void,
  setDraft: (text: string) => void,
  raise: (id: string) => void
): NoteDraftRestoreCtl {
  const openEditor = (noteId: string, text: string): void => {
    raise(noteId)
    setEditingId(noteId)
    setDraft(text)
  }
  /** [B-ADJ-1 P0 主控亲笔] 长度守卫+结果返回：创建被恢复门拒（冻结窗
   * addFloatingNote 静默拒）时返回 false 且**不得**以 .at(-1) 推断创建
   * 身份（误挂既有笔记编辑器/消费快照丢稿两害封死）——调用方以返回值
   * 决定是否消费承载（快照/计划） */
  const createNewNote = (text: string): boolean => {
    const before = useLineageStore.getState().floatingNotes.length
    // 新建落位：内容区左上钳制（编辑器可视面内——缺省位非恢复位，N-06 语义
    // =内容进新建流程）
    const p = clampToContent(contentRef, { x: 60, y: 60 }, NOTE_W, NOTE_H)
    useLineageStore.getState().addFloatingNote(p.x, p.y, text)
    const notes = useLineageStore.getState().floatingNotes
    if (notes.length === before) return false
    const created = notes[notes.length - 1]!
    openEditor(created.id, text)
    showToast('原笔记已不存在，将作为新笔记', 'info')
    return true
  }
  return { openEditor, createNewNote }
}
