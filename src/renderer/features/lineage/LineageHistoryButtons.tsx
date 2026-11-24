// b3: P7-H
/**
 * [B4 L1 / 设计稿 §10.4/§11.2] LineageHistoryButtons —— 撤销/重做钮纯受控件
 * （自 LineageToolbar 拆出）。
 *
 * 可用性=canUndo/canRedo（#12 no-op 判据：栈空/图未 ready/冻结）；reconcile/
 * history 在途不禁用——点击按 #13d 排队不并发（在途仅作 busy 指示）。
 * 受控锚沿承：data-testid=lineage-undo/lineage-redo、.lg-btn.ghost.syn-icon-btn、
 * title/aria-label「撤销（Ctrl+Z）」「重做（Ctrl+Y）」、sr-only「撤销」「重做」。
 */
import { ICON_REDO, ICON_UNDO } from '../../shared/icons'

export function LineageHistoryButtons(props: {
  canUndo: boolean
  canRedo: boolean
  busy: boolean
  onUndo: () => void
  onRedo: () => void
}): JSX.Element {
  const { canUndo, canRedo, busy, onUndo, onRedo } = props
  return (
    <>
      <button
        type="button"
        className="lg-btn ghost syn-icon-btn"
        data-testid="lineage-undo"
        disabled={!canUndo}
        aria-busy={busy}
        title="撤销（Ctrl+Z）"
        aria-label="撤销（Ctrl+Z）"
        onClick={onUndo}
      >
        {ICON_UNDO}
        <span className="sr-only">撤销</span>
      </button>
      <button
        type="button"
        className="lg-btn ghost syn-icon-btn"
        data-testid="lineage-redo"
        disabled={!canRedo}
        aria-busy={busy}
        title="重做（Ctrl+Y）"
        aria-label="重做（Ctrl+Y）"
        onClick={onRedo}
      >
        {ICON_REDO}
        <span className="sr-only">重做</span>
      </button>
    </>
  )
}
