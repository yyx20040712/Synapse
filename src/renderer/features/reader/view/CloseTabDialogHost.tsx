/**
 * [B4-A R2 §10.2/§11.1] CloseTabDialogHost —— 关 tab 二选与失败 Dialog 宿主
 * （复用共享 Dialog；冻结文案——设计稿 §10.2，不得改字）。
 *
 * ── 行为层（§2.5 #26-#29）──
 * - 订阅 reader.store：找 closing.phase='confirm'/'error' 的 tab（closingTabs
 *   互斥保证至多一个）渲染 Dialog；none/flushing 无渲染（flushing 不弹窗）。
 * - confirm 相（U=1）：文案=「当前文件未被标记为已保存，是否确认关闭？」
 *   操作=是/否——是=关闭并清史（#27）、否=留在当前 tab（#28）；ESC/遮罩=否。
 * - error 相（flush 失败）：文案=「有修改未能落库：<reason>。请重试保存后再
 *   关闭。」操作=重试/留在当前 tab——重试=重走 flush；ESC/遮罩=留下（#29：
 *   无「放弃未落库修改」径）。
 *
 * ── 接口层 ──
 * - export function CloseTabDialogHost(): JSX.Element | null
 * - export const CLOSE_TAB_CONFIRM_TEXT / closeTabErrorText(reason)
 *   （冻结文案单源——单测逐字锚）
 *
 * ── 架构层 ──
 * - reader/view 纯受控件（决策经 reader-close-tab.chooseCloseTabDecision 上交）
 */
import { Dialog } from '../../../shared/ui/Dialog'
import { useShallow } from 'zustand/react/shallow'
import { useReaderStore } from '../state/reader.store'
import { chooseCloseTabDecision } from '../state/reader-close-tab'

/** [B4-A R2 §10.2] 冻结二选文案（主控核可——不得改字） */
export const CLOSE_TAB_CONFIRM_TEXT = '当前文件未被标记为已保存，是否确认关闭？'

/** [B4-A R2 §10.2] 冻结失败文案（<reason>=真实失败原因——reader-close-tab 查态单源） */
export function closeTabErrorText(reason: string): string {
  return `有修改未能落库：${reason}。请重试保存后再关闭。`
}

/** closing 待决 tab 投影（confirm/error 相；至多一个——closingTabs 互斥） */
function useClosingTab(): { paperId: string; phase: 'confirm' | 'error'; error: string | null } | null {
  return useReaderStore(
    useShallow((s) => {
      for (const id of s.order) {
        const closing = s.tabs[id]?.closing
        if (closing?.phase === 'confirm' || closing?.phase === 'error') {
          return { paperId: id, phase: closing.phase, error: closing.error }
        }
      }
      return null
    })
  )
}

export function CloseTabDialogHost(): JSX.Element | null {
  const pending = useClosingTab()
  if (pending === null) return null
  const { paperId, phase } = pending
  if (phase === 'confirm') {
    return (
      <Dialog
        open
        title="关闭确认"
        onClose={() => chooseCloseTabDecision(paperId, false)}
      >
        <p>{CLOSE_TAB_CONFIRM_TEXT}</p>
        <div className="mt-3 flex justify-end gap-2">
          <button
            type="button"
            className="syn-btn syn-btn-secondary"
            onClick={() => chooseCloseTabDecision(paperId, false)}
          >
            否
          </button>
          <button
            type="button"
            className="syn-btn syn-btn-primary"
            data-testid="close-tab-confirm-yes"
            onClick={() => chooseCloseTabDecision(paperId, true)}
          >
            是
          </button>
        </div>
      </Dialog>
    )
  }
  return (
    <Dialog
      open
      title="关闭失败"
      onClose={() => chooseCloseTabDecision(paperId, false)}
    >
      <p>{closeTabErrorText(pending.error ?? '未知错误')}</p>
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          className="syn-btn syn-btn-secondary"
          onClick={() => chooseCloseTabDecision(paperId, false)}
        >
          留在当前 tab
        </button>
        <button
          type="button"
          className="syn-btn syn-btn-primary"
          data-testid="close-tab-retry"
          onClick={() => chooseCloseTabDecision(paperId, 'retry')}
        >
          重试
        </button>
      </div>
    </Dialog>
  )
}
