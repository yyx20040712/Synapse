/**
 * [F-VISFB-65 单元二] ConflictDialog —— GHOST_FOLDER 降级询问自绘 modal
 * （设计书 §7）。app 级挂载（App.tsx——quit 交叠期任意视图可见）：
 * - role=alertdialog+aria-modal+aria-labelledby（e2e role/文案选择器稳定）；
 * - 焦点圈禁：初始焦点=首钮，Tab/Shift+Tab 在按钮组内环绕；Esc 阻断（禁
 *   Esc/遮罩关闭——遮罩无 onClick，模态不可逃逸，二选一必答）；
 * - 按钮：〔保存到主图〕=remap-main-graph；〔放弃这条修改〕=discard；
 *   决出经 conflictResolution.resolveGhostFolderDecision（先清态后 resolve
 *   挂起的 flush）。
 */
import { useEffect, useRef, useSyncExternalStore } from 'react'
import {
  getConflictState,
  resolveGhostFolderDecision,
  subscribeConflictState
} from './conflictResolution'

export function ConflictDialog(): JSX.Element | null {
  const state = useSyncExternalStore(subscribeConflictState, getConflictState)
  const dialogRef = useRef<HTMLDivElement>(null)
  const folderId = state.pending?.folderId ?? null

  useEffect(() => {
    if (folderId === null) return
    // 初始焦点=首钮（alertdialog 焦点纪律）
    const first = dialogRef.current?.querySelector<HTMLButtonElement>('button')
    first?.focus()
  }, [folderId])

  // [回炉 W4] 焦点圈禁补口：document 级 capture 拦 Tab/Esc——待决期挂/卸，
  // 事件在到达任何外层目标（含 React 根与 app 级退出链）之前截停；
  // Tab 在按钮组内环绕（两钮循环），Esc 吞停（禁关闭）
  useEffect(() => {
    if (folderId === null) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        return
      }
      if (e.key !== 'Tab') return
      e.preventDefault()
      e.stopPropagation()
      const btns = Array.from(dialogRef.current?.querySelectorAll<HTMLButtonElement>('button') ?? [])
      if (btns.length === 0) return
      const idx = btns.findIndex((b) => b === document.activeElement)
      btns[(idx + (e.shiftKey ? -1 : 1) + btns.length) % btns.length]!.focus()
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [folderId])

  if (folderId === null) return null

  return (
    <div
      className="conflict-overlay"
      data-testid="conflict-overlay"
      onMouseDown={(e) => e.preventDefault()} /* [回炉 W4] 遮罩点击不夺焦——焦点留对话框内 */
    >
      {/* 遮罩不可关：无 onClick——决策只能经两钮 */}
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="conflict-dialog-title"
        data-testid="conflict-dialog"
        tabIndex={-1}
      >
        <div id="conflict-dialog-title">原文件夹已删除</div>
        <p className="conflict-dialog-body">
          一条悬浮笔记的文件夹已不存在，无法保存到原位置。可选择改存到主图，或放弃这条修改。
        </p>
        <div className="conflict-dialog-actions">
          <button
            type="button"
            data-testid="conflict-remap"
            onClick={() => resolveGhostFolderDecision('remap-main-graph')}
          >
            保存到主图
          </button>
          <button
            type="button"
            data-testid="conflict-discard"
            onClick={() => resolveGhostFolderDecision('discard')}
          >
            放弃这条修改
          </button>
        </div>
      </div>
    </div>
  )
}
