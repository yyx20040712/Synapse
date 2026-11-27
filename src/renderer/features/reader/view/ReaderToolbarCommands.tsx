/**
 * ReaderToolbarCommands —— 阅读器界面级保存与操作层 undo/redo。
 *
 * ── 行为层 ──
 * - [B6] 命令态由 useActiveTabCommandState 响应式投影；入口仍调用
 *   reader-save-coordinator 现有命令。按钮处在目录开关与翻页组之间。
 * - [F-ANNOSAVE-01] 这是 reader 界面的唯一显式保存入口；批注编辑器只保留
 *   自动写、失败反馈与 Escape 失败重试。
 *
 * ── 架构层 ──
 * - 拆出自 ReaderToolbar，保持组件文件预算；命令入口不在本件重复守卫。
 */
import { ICON_REDO, ICON_UNDO } from '../../../shared/icons'
import { keepNativeButtonSpace } from '../../../shared/ui/native-button-keys'
import { SaveStateButton } from '../../../shared/ui/SaveStateButton'
import { finalizeActiveTab, redoActiveTab, undoActiveTab } from '../state/reader-save-coordinator'
import { useActiveTabCommandState } from '../state/tab-dirty'

export function ReaderToolbarCommands(): JSX.Element {
  const command = useActiveTabCommandState()

  return (
    <>
      <SaveStateButton
        testId="reader-toolbar-save"
        state={command.saveState}
        disabled={!command.canSave || command.saveState === 'saved'}
        onClick={() => {
          void finalizeActiveTab()
        }}
      />
      <button
        type="button"
        className="rdr-tool-btn shrink-0 disabled:opacity-50"
        data-testid="reader-toolbar-undo"
        aria-label="撤销"
        title="撤销"
        onKeyDown={keepNativeButtonSpace}
        disabled={!command.canUndo}
        onClick={() => {
          void undoActiveTab()
        }}
      >
        {ICON_UNDO}
        <span className="sr-only">撤销</span>
      </button>
      <button
        type="button"
        className="rdr-tool-btn shrink-0 disabled:opacity-50"
        data-testid="reader-toolbar-redo"
        aria-label="重做"
        title="重做"
        onKeyDown={keepNativeButtonSpace}
        disabled={!command.canRedo}
        onClick={() => {
          void redoActiveTab()
        }}
      >
        {ICON_REDO}
        <span className="sr-only">重做</span>
      </button>
    </>
  )
}
