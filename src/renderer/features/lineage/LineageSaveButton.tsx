// b3: P7-H
/**
 * [B4 L1 / 设计稿 §10.1/§11.2] LineageSaveButton —— 保存钮纯受控件（自
 * LineageToolbar 拆出；B4 状态面：IO+U 聚合四态）。
 *
 * 四态（SaveUiState——save-status aggregateSaveUiState 单源推导，本件零态逻辑）：
 * - dirty：软盘角点标记、可点（即使 Q0——idle-flush 落库后 U 仍可定稿）；
 * - saving：spinner+禁用；
 * - saved：灰暗禁用；
 * - failed：可点（title/aria「重试保存」；行内错误文案与重试钮在工具组宿主）。
 * 可用性：disabled=saved ∨ saving ∨ !canSave（finalize/history/reconcile 在途、
 * 图未 ready、冻结——§10.4 canSave）。
 * 受控锚（testid/类名/sr-only 文本沿承）：data-testid=lineage-save-btn、
 * .lg-btn.save、sr-only「保存」。
 */
import type { SaveUiState } from '../../shared/save-status'

export function LineageSaveButton(props: {
  state: SaveUiState
  canSave: boolean
  onSave: () => void
}): JSX.Element {
  const { state, canSave, onSave } = props
  const saving = state === 'saving'
  const failed = state === 'failed'
  const title = failed ? '重试保存' : '保存全部修改（Ctrl+S——落库并标记为已保存）'
  return (
    <button
      type="button"
      className="lg-btn save"
      data-testid="lineage-save-btn"
      disabled={state === 'saved' || saving || !canSave}
      title={title}
      aria-label={title}
      onClick={onSave}
    >
      {saving ? (
        <span className="spinner" aria-label="保存中" />
      ) : (
        <SaveIcon marked={state === 'dirty'} />
      )}
      <span className="sr-only">保存</span>
    </button>
  )
}

/** 软盘保存图标（dirty=角点标记） */
function SaveIcon({ marked }: { marked: boolean }): JSX.Element {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" aria-hidden="true">
      <path d="M1.5 1.5h8.5L11.5 3v8.5h-10z" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <path d="M3.5 1.5v3.5h5V1.5" fill="none" stroke="currentColor" strokeWidth="1" />
      <rect x="3.5" y="7" width="6" height="4.5" fill="none" stroke="currentColor" strokeWidth="1" />
      {marked && <circle cx="10" cy="10" r="1.6" fill="currentColor" />}
    </svg>
  )
}
