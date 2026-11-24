/**
 * [B4 L1 / 设计稿 §10.3/§11.2] use-lineage-history-shortcuts —— 脉络页保存/撤销/重做
 * 快捷键：Ctrl+Z（undo）/Ctrl+Y·Ctrl+Shift+Z（redo）/Ctrl+S（显式保存）在
 * **edit/browse/focus 三模式统一生效**（主控终裁 5——与 mode 门分离：编辑工具是否
 * 可用仍由 mode 控制，二者不共用一个 mode 门）。
 * [ln-W3b-2] Ctrl+Shift+Z=redo（Windows/Linux 惯例——阅读器 AnnotationEditor
 * 同语义先例；Ctrl+Shift+Y 同归 redo=无害超集）
 *
 * ── 行为层（editable 分层）──
 * - 输入焦点内（INPUT/TEXTAREA/contentEditable）的 Ctrl+Z/Y/Shift+Z 不拦截——
 *   脉络 textarea/输入框保留原生文本撤销；悬浮笔记的全局图历史只在焦点离开
 *   文本框后执行。
 * - Ctrl+S 在悬浮笔记编辑中也接管：先 commit 草稿（fireLineageNoteCommit——入
 *   暂存队列）再 finalize 当前 folder（saveActiveFolder）；并阻止浏览器默认
 *   「另存为」。
 * - 命令可用性判据在 store 入口与按钮（#12 no-op/冻结/busy）——快捷键不另立口径。
 * - 组词期（isComposing）与 Alt/Meta 组合不接管（AltGr=Ctrl+Alt 组合键不入本面）。
 *
 * ── 接口层 ──
 * - export function useLineageHistoryShortcuts(): void（页面挂载期成对注册/清理）
 * - export function isEditableTarget(target): boolean
 */
import { useEffect } from 'react'
import { fireLineageNoteCommit } from './lineage-note-draft'
import { useLineageStore } from './lineage.store'

export function isEditableTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
}

export function useLineageHistoryShortcuts(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (!e.ctrlKey || e.altKey || e.metaKey || e.isComposing) return
      const key = e.key.toLowerCase()
      if (key !== 'z' && key !== 'y' && key !== 's') return
      if (key === 's') {
        e.preventDefault()
        fireLineageNoteCommit()
        void useLineageStore.getState().saveActiveFolder()
        return
      }
      if (isEditableTarget(e.target)) return // 输入焦点内=原生文本撤销（mockup §2.2 撤销域=图态）
      e.preventDefault()
      const store = useLineageStore.getState()
      if (key === 'y' || e.shiftKey) void store.redo()
      else void store.undo()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])
}
