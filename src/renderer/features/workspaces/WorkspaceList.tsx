/**
 * [B4-A R2 §11.1] WorkspaceList —— 课题卡片列表纯拆件（自 WorkspacesPage 拆出；
 * 纯受控：全部动作经 props 上交，零 store 订阅）。
 *
 * ── 行为层 ──
 * - 每课题一张卡（色标片=WS_DOT_PALETTE 索引轮转/实名/N 篇）；当前课题卡挂
 *   .on；点卡=pick(id)（幂等=零 IPC 不空切；成功即 reload——ADR-0018）；
 *   [F-UIRES-02 R4] 双击卡=进入重命名（资源管理器镜像——单击切换两次幂等
 *   无害；「重命名」钮保留）
 * - 行内编辑行=WorkspaceRenameRow（editingId 命中时替换卡片行）
 * - 重命名钮=铅笔图标（title/aria-label 同源+sr-only 保 textContent 恰=
 *   「重命名」——受锁 workspaces-input-maxlength 锚）
 *
 * ── 接口层 ──
 * - export function WorkspaceList(props: { items; currentId; editingId; draft;
 *     onDraftChange; onPick; onOpenRename; onSubmitRename; onCancelRename })
 * - export const WS_DOT_PALETTE（自 WorkspacesPage 迁驻——单一消费=本件色标片）
 */
import type { WorkspaceItem } from '@shared/ipc/schemas'
import { ICON_PENCIL } from '../../shared/icons'
import { WorkspaceRenameRow } from './WorkspaceRenameRow'

/** [T3-P2→F-WS-02] 课题色标 6 色轮转调色板（索引 i%6——族源 token 随主题
 *  换肤；迁自 app/rail-shared，拆件后单一消费=本件色标片） */
export const WS_DOT_PALETTE: readonly string[] = [
  'var(--accent)',
  'var(--sub2)',
  'var(--signal)',
  'var(--ok)',
  'var(--warn)',
  'var(--faint)'
]

export function WorkspaceList(props: {
  items: WorkspaceItem[]
  currentId: string
  editingId: string | null
  draft: string
  onDraftChange(v: string): void
  onPick(id: string): void
  onOpenRename(w: WorkspaceItem): void
  onSubmitRename(id: string, value: string): void
  onCancelRename(): void
}): JSX.Element {
  const { items, currentId, editingId, draft, onDraftChange, onPick, onOpenRename, onSubmitRename, onCancelRename } = props
  return (
    <ul className="ws-list" aria-label="课题列表">
      {items.map((w, i) => (
        <li key={w.id}>
          {editingId === w.id ? (
            // [F-UIRES-02 R2] 行内编辑行拆件（组件 250 行红线）：三键+
            // 组词守卫+按钮 mousedown preventDefault 规约在拆件头注
            <WorkspaceRenameRow
              draft={draft}
              onDraftChange={onDraftChange}
              onSubmit={(value) => onSubmitRename(w.id, value)}
              onCancel={onCancelRename}
            />
          ) : (
            <div className="ws-row">
              <button
                type="button"
                className={`ws-card${w.id === currentId ? ' on' : ''}`}
                onClick={() => onPick(w.id)}
                // [F-UIRES-02 R4] 双击=进入重命名（单击切换语义不动——两次单击幂等）
                onDoubleClick={() => onOpenRename(w)}
              >
                <span
                  className="chip"
                  style={{ background: WS_DOT_PALETTE[i % WS_DOT_PALETTE.length] }}
                  aria-hidden="true"
                />
                <span className="nm">{w.name}</span>
                <span className="ct">{w.paperCount} 篇</span>
              </button>
              {/* [F-UIRES-02 批 B R7] 重命名文字钮→铅笔图标（受锁
                  workspaces-input-maxlength:73 与 e2e accessible name 面） */}
              <button
                type="button"
                className="ws-rename syn-icon-btn"
                aria-label="重命名"
                title="重命名"
                onClick={() => onOpenRename(w)}
              >
                {ICON_PENCIL}
                <span className="sr-only">重命名</span>
              </button>
            </div>
          )}
        </li>
      ))}
    </ul>
  )
}
