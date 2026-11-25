// b3: P7-H
/**
 * [B4 L1 / 设计稿 §10.1/§11.2] LineageSaveButton —— 保存钮纯受控件（自
 * LineageToolbar 拆出；B4 状态面：IO+U 聚合四态）。
 *
 * 四态（SaveUiState——save-status aggregateSaveUiState 单源推导，本件零态逻辑）：
 * - dirty：软盘角点标记、可点（即使 Q0——idle-flush 落库后 U 仍可定稿）；
 * - saving：spinner+禁用；
 * - saved：灰暗禁用；
 * - failed：可点。[B5 设计稿 §6.2——wave C 2026-11-25 断言翻转] title/aria 恒为「保存全部修改
 *   （Ctrl+S——落库并标记为已保存）」——原 failed 态「重试保存」退役：主保存钮只表示显式保存，
 *   不自动代替 history 重试；保存失败的重试入口=告警内 lineage-save-retry（LineageWriteErrorAlert，
 *   只随 save 来源渲染）。
 * - [B5 §2.3] 三模式同一判据（工具栏常驻；保存钮不随 browse/focus 消失）。
 * 可用性：disabled=saved ∨ saving ∨ !canSave（finalize/history/reconcile 在途、
 * 图未 ready、冻结——§10.4 canSave）。
 * 受控锚（testid/类名/sr-only 文本沿承）：data-testid=lineage-save-btn、
 * .lg-btn.save、sr-only「保存」。
 */
import type { SaveUiState } from '../../shared/save-status'

/** [B5 §6.2] 保存钮恒定名称（title 与 aria-label 同源单值） */
const SAVE_ALL_TITLE = '保存全部修改（Ctrl+S——落库并标记为已保存）'

export function LineageSaveButton(props: {
  state: SaveUiState
  canSave: boolean
  onSave: () => void
}): JSX.Element {
  const { state, canSave, onSave } = props
  const saving = state === 'saving'
  // [B5 §6.2] 名称恒定（failed 态不变通用重试——重试入口在告警内，按失败源分流）
  const title = SAVE_ALL_TITLE
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
