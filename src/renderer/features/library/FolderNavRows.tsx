/**
 * [F-UIRES-01 批 A U4] FolderNavRows —— FolderNav 列表段拆件（组件 250 行
 * 红线；R9 拆件预案）：未归档行/分隔线/文件夹列表（含行内重命名编辑行）/
 * 底部新建内联输入。行为与皮肤零变（拆件纯搬家——注释契约在 FolderNav 头）。
 */
import type { DragEvent, KeyboardEvent } from 'react'
import type { Folder } from '@shared/models/folder'
import type { LibraryQuery } from '@shared/models/paper'
import type { DndTarget } from './library-dnd.store'

/** 行内重命名在途态（value 持父态——外部重拉不卸载不丢输入） */
export interface RenameState {
  folderId: string
  value: string
}

/** 行内输入三键范式共通 keydown（isComposing 守卫——F-UIRES-02 范式即面即守） */
function inlineKeyDown(
  e: KeyboardEvent<HTMLInputElement>,
  onEnter: () => void,
  onEsc: () => void,
  skipBlur: () => void
): void {
  if (e.nativeEvent.isComposing) return
  if (e.key === 'Enter') {
    e.preventDefault()
    onEnter()
  }
  if (e.key === 'Escape') {
    e.preventDefault()
    // Esc 收起前标记跳过失焦提交（unmount 不触发 blur，防御窗口在）
    skipBlur()
    onEsc()
  }
}

export function FolderNavRows(props: {
  folders: readonly Folder[]
  scope: LibraryQuery['folderScope']
  unfiledCount: number
  importBusy: boolean
  renaming: RenameState | null
  creating: boolean
  dndOver: DndTarget | null
  setRenaming(state: RenameState | null): void
  setCreating(v: boolean): void
  /** [RR2-4] 会话开口版（清 skipBlur 标记）——F2/底部入口进入编辑用 */
  openRenaming(state: RenameState): void
  openCreating(): void
  /** [RR1-4] 提交回调（viaBlur：Enter 直提=false/失焦过标记门=true） */
  submitCreate(name: string, viaBlur: boolean): void
  submitRename(state: RenameState, viaBlur: boolean): void
  skipBlur(): void
  onChange(patch: Partial<LibraryQuery>): void
  onFolderContextMenu(folder: Folder, pos: { x: number; y: number }): void
  onRowDragOver(e: DragEvent<HTMLButtonElement>, target: DndTarget): void
  onRowDragLeave(e: DragEvent<HTMLButtonElement>): void
  onRowDrop(e: DragEvent<HTMLButtonElement>, target: DndTarget): void
}): JSX.Element {
  const { folders, scope, importBusy, renaming, creating, dndOver } = props
  const isUnfiled = scope?.kind === 'unfiled'
  const rowClass = (selected: boolean): string => `lib-fn-row${selected ? ' sel' : ''}`

  return (
    <>
      <button
        type="button"
        className={`${rowClass(isUnfiled)}${dndOver?.kind === 'unfiled' ? ' drop' : ''}`}
        aria-current={isUnfiled ? 'true' : undefined}
        data-unfiled="true"
        disabled={importBusy}
        onClick={() => props.onChange({ folderScope: { kind: 'unfiled' } })}
        onDragOver={(e) => props.onRowDragOver(e, { kind: 'unfiled' })}
        onDragLeave={props.onRowDragLeave}
        onDrop={(e) => props.onRowDrop(e, { kind: 'unfiled' })}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path d="M4 6c0-1 1-2 2-2h4l2 2h6c1 0 2 1 2 2v9c0 1-1 2-2 2H6c-1 0-2-1-2-2z" />
          <path d="M9 14h6M12 11v6" />
        </svg>
        <span className="lib-fn-nm">未归档</span>
        <span className="lib-fn-ct">{props.unfiledCount}</span>
      </button>
      <div className="lib-fn-sep" />
      {folders.map((f) => {
        const selected = scope?.kind === 'folder' && scope.folderId === f.id
        if (renaming !== null && renaming.folderId === f.id) {
          return (
            <div className="lib-fn-edit" key={f.id}>
              <input
                aria-label="重命名文件夹名"
                value={renaming.value}
                autoFocus
                disabled={importBusy}
                onChange={(e) => props.setRenaming({ ...renaming, value: e.target.value })}
                onKeyDown={(e) =>
                  inlineKeyDown(
                    e,
                    () => props.submitRename(renaming, false),
                    () => props.setRenaming(null),
                    props.skipBlur
                  )
                }
                onBlur={() => props.submitRename(renaming, true)}
              />
              <span className="lib-fn-kb" aria-hidden="true">
                ↵ 确定 · Esc 取消
              </span>
            </div>
          )
        }
        const overThis = dndOver?.kind === 'folder' && dndOver.folderId === f.id
        return (
          <button
            key={f.id}
            type="button"
            className={`${rowClass(selected)}${overThis ? ' drop' : ''}`}
            aria-current={selected ? 'true' : undefined}
            data-folder-id={f.id}
            disabled={importBusy}
            onClick={() => props.onChange({ folderScope: { kind: 'folder', folderId: f.id } })}
            onContextMenu={(e) => {
              e.preventDefault()
              props.onFolderContextMenu(f, { x: e.clientX, y: e.clientY })
            }}
            onKeyDown={(e) => {
              if (!importBusy && e.key === 'F2') {
                e.preventDefault()
                props.openRenaming({ folderId: f.id, value: f.name })
              }
            }}
            onDragOver={(e) =>
              props.onRowDragOver(e, { kind: 'folder', folderId: f.id, name: f.name })
            }
            onDragLeave={props.onRowDragLeave}
            onDrop={(e) => props.onRowDrop(e, { kind: 'folder', folderId: f.id, name: f.name })}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="M4 6c0-1 1-2 2-2h4l2 2h6c1 0 2 1 2 2v9c0 1-1 2-2 2H6c-1 0-2-1-2-2z" />
            </svg>
            <span className="lib-fn-nm">{f.name}</span>
            <span className="lib-fn-ct">{f.paperCount}</span>
            {overThis && (
              <span className="lib-fn-drop-hint" aria-hidden="true">
                移入 ↩
              </span>
            )}
          </button>
        )
      })}
      <div className="lib-fn-new">
        {creating ? (
          <div className="lib-fn-edit">
            <input
              aria-label="新文件夹名"
              autoFocus
              disabled={importBusy}
              onKeyDown={(e) =>
                inlineKeyDown(
                  e,
                  () => props.submitCreate((e.target as HTMLInputElement).value, false),
                  () => props.setCreating(false),
                  props.skipBlur
                )
              }
              onBlur={(e) => props.submitCreate(e.target.value, true)}
            />
            <span className="lib-fn-kb" aria-hidden="true">
              ↵ 确定 · Esc 取消
            </span>
          </div>
        ) : (
          <button
            type="button"
            className="lib-fn-new-btn"
            disabled={importBusy}
            onClick={props.openCreating}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="M12 5v14M5 12h14" />
            </svg>
            + 新建文件夹
          </button>
        )}
      </div>
    </>
  )
}
