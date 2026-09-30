// b3: P7-H
/**
 * [T3-P7B] LineageToolbar —— 脉络工具条（换装 .lg-toolbar——mockup L204-219/
 * L496-507 逐值；sticky 挂 .timeline 内=LineageTimeline 渲染树，Board 经
 * props 下传既有回调）。
 *
 * - 「编辑脉络」ghost toggle（edit 态=「完成编辑」+.lg-btn.editing——D-P7B-1；
 *   mode 单源驻 Timeline，本件纯受控）+「新建连线」.lg-btn.linkbtn
 *   （display:none↔.editing 内 block——D-21 编辑模式内才显；DOM 恒在场）
 *   +添加节点 .lg-btn ghost（repo 特有 mockup 无位）。[F-BAKRET-01]
 *   「导入草稿」按钮随草稿导入链退役删除（用户裁决 2026-09-30）。
 * - 保存态/重试 chip 行尾（[P7-H] 既有语义零变——testid 全保活）；
 *   [T3-P8] drag-hint 双态全时渲染（D-P7B-1 兑现——mockup L507/L1010-1013
 *   逐字）：view「↕ 拖动＝月内调序（虚线槽＝候选文献位）」/edit 全句。
 */
import type { LineageSaveStatus } from './lineage.store'

export function LineageToolbar(props: {
  saveStatus: LineageSaveStatus
  lastWriteError: string | null
  onAddNode(): void
  onRetrySave(): void
  /** [T3-P7B] 编辑模式态（Timeline 单源受控） */
  editing: boolean
  onToggleEdit(): void
  /** 「新建连线」（edit 态才生效——composer 双闸） */
  onNewLink(): void
}): JSX.Element {
  const { saveStatus, lastWriteError, editing } = props
  return (
    <div className="lg-toolbar">
      <button
        type="button"
        className={editing ? 'lg-btn ghost editing' : 'lg-btn ghost'}
        data-testid="lineage-edit-toggle"
        onClick={props.onToggleEdit}
      >
        {editing ? '完成编辑' : '编辑脉络'}
      </button>
      <button
        type="button"
        className="lg-btn ghost linkbtn"
        data-testid="lineage-link-btn"
        onClick={props.onNewLink}
      >
        新建连线
      </button>
      <button type="button" className="lg-btn ghost" data-testid="lineage-add-node" onClick={props.onAddNode}>
        添加节点
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
      {editing ? (
        <span className="drag-hint" data-testid="drag-hint">
          编辑中：点连线改线型 · 点卡片月标改月 · 拖动＝月内调序
        </span>
      ) : (
        <span className="drag-hint" data-testid="drag-hint">
          ↕ 拖动＝月内调序（虚线槽＝候选文献位）
        </span>
      )}
    </div>
  )
}
