/**
 * [B4-A R1] AnnotationEditorActions —— 批注编辑器动作行纯接线件（自
 * AnnotationEditor 拆出 2026-11-23——§11.1 拆件：父件 ≤140/本件 ≤170）。
 *
 * ── 行为层 ──
 * - [F-VISFB-13 A5] 单工具行原样迁驻：撤销/重做 + 右侧（保存/删除/取消）——
 *   撤销/重做/删除/取消图标+title 同源（data-testid 受锁锚零变）；sr-only
 *   span 保 textContent/accessible name；saved/failed 标记=图标+sr-only 态语
 *   （A4 删「已保存」类可见字样——textContent/accessible name 双面保活）。
 * - [B6 F-ANNOSAVE-01] 局部保存钮退役；saved/failed 图标保留写反馈。
 *   failed 重试=二次 Escape（flush）；tab 定稿=工具栏保存/Ctrl+S。
 * - 纯受控：全部动作经 props 上交，零状态零副作用。
 */
import { ICON_CHECK, ICON_REDO, ICON_RETRY, ICON_TRASH, ICON_UNDO, ICON_X } from '../../../shared/icons'
import { ANNOTATION_BTN_CLASS as btn } from '../anchors/annotation-style'
import type { EditorSaveState } from '../../../shared/save-status'

export function AnnotationEditorActions(props: {
  saveState: EditorSaveState
  busy: boolean
  canUndo: boolean
  canRedo: boolean
  onUndo(): void
  onRedo(): void
  onDelete(): void
  onCancel(): void
}): JSX.Element {
  const { saveState, busy, canUndo, canRedo, onUndo, onRedo, onDelete, onCancel } = props
  const flagged = saveState === 'saved' || saveState === 'failed'
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        className={`${btn} syn-icon-btn`}
        style={{ borderColor: 'var(--border)' }}
        data-testid="annotation-editor-undo"
        title="撤销"
        aria-label="撤销"
        disabled={!canUndo}
        onClick={onUndo}
      >
        {ICON_UNDO}
        <span className="sr-only">撤销</span>
      </button>
      <button
        type="button"
        className={`${btn} syn-icon-btn`}
        style={{ borderColor: 'var(--border)' }}
        data-testid="annotation-editor-redo"
        title="重做"
        aria-label="重做"
        disabled={!canRedo}
        onClick={onRedo}
      >
        {ICON_REDO}
        <span className="sr-only">重做</span>
      </button>
      {(saveState === 'saved' || saveState === 'failed') && (
        <span
          data-testid="annotation-saved-flag"
          className="ml-auto syn-status-icon"
          style={{ color: saveState === 'failed' ? 'var(--danger)' : 'var(--text-dim)' }}
        >
          {saveState === 'failed' ? ICON_RETRY : ICON_CHECK}
          <span className="sr-only">{saveState === 'failed' ? '保存失败' : '已保存'}</span>
        </span>
      )}
      {!flagged && <span className="ml-auto" />}
      <button
        type="button"
        className={`${btn} syn-icon-btn`}
        style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
        disabled={busy}
        title="删除"
        aria-label="删除"
        onClick={onDelete}
      >
        {ICON_TRASH}
        <span className="sr-only">删除</span>
      </button>
      <button
        type="button"
        className={`${btn} syn-icon-btn`}
        style={{ borderColor: 'var(--border)' }}
        disabled={busy}
        title="取消"
        aria-label="取消"
        onClick={onCancel}
      >
        {ICON_X}
        <span className="sr-only">取消</span>
      </button>
    </div>
  )
}
