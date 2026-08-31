// b3: P7-H
/**
 * [F-LG14] LineageToolbar —— 脉络编辑工具条（LineageBoard 拆件——组件行数
 * 红线落点；行为面零变：添加节点/导入草稿入口+保存态指示（autosave-first
 * 无「保存」按钮）+error 态重试钮）。
 *
 * R2-LG11 浅色白玻璃浮层（.lineage-toolbar——视觉皮肤级）。导入草稿动作体
 * =lineage-import.ts（Board 原接线保持）。
 */
import type { LineageSaveStatus } from './lineage.store'

export function LineageToolbar(props: {
  saveStatus: LineageSaveStatus
  lastWriteError: string | null
  onAddNode(): void
  onImportDraft(): void
  onRetrySave(): void
}): JSX.Element {
  const { saveStatus, lastWriteError } = props
  return (
    <div className="lineage-toolbar absolute left-2 top-2 z-10">
      <button
        type="button"
        data-testid="lineage-add-node"
        onClick={props.onAddNode}
      >
        添加节点
      </button>
      <button
        type="button"
        data-testid="lineage-import"
        onClick={props.onImportDraft}
      >
        导入草稿
      </button>
      {saveStatus === 'saving' && (
        <span className="rounded px-2 py-1 text-xs" data-testid="lineage-save-status">
          保存中…
        </span>
      )}
      {saveStatus === 'error' && (
        <span
          className="flex items-center gap-2 rounded border px-2 py-1 text-xs"
          role="alert"
          style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
          data-testid="lineage-save-status"
        >
          保存失败：{lastWriteError}
          <button
            type="button"
            data-testid="lineage-retry-save"
            className="rounded px-1.5 py-0.5"
            style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
            onClick={props.onRetrySave}
          >
            重试
          </button>
        </span>
      )}
    </div>
  )
}
