/**
 * [F-FOLDER-02·A] FolderMenu —— 文件夹 chip 右键菜单（FolderFilter 子组件，
 * TagLifecycleMenu 同型：fixed 定位锚点+透明遮罩关闭；菜单项=重命名/删除——
 * 动作只上抛，对话框宿主与写路径在 FolderFilter）。
 */
import { MENU_ITEM_STYLE } from '../../shared/ui-constants'
import type { Folder } from '@shared/models/folder'

export function FolderMenu(props: {
  folder: Folder
  anchor: { x: number; y: number }
  onClose(): void
  onRename(folder: Folder): void
  onDelete(folder: Folder): void
}): JSX.Element {
  const { folder, anchor } = props
  return (
    <>
      {/* 透明遮罩：点击任意处关闭（菜单本体 stopPropagation） */}
      <div className="fixed inset-0 z-(--z-pop-veil)" onClick={props.onClose} />
      <div
        role="menu"
        aria-label={`文件夹菜单：${folder.name}`}
        data-testid="folder-menu"
        className="fixed z-(--z-pop) w-40 rounded border py-1 shadow-lg"
        style={{
          left: anchor.x,
          top: anchor.y,
          background: 'var(--panel)',
          borderColor: 'var(--border)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          role="menuitem"
          className={MENU_ITEM_STYLE}
          style={{ color: 'var(--text)' }}
          onClick={() => props.onRename(folder)}
        >
          重命名
        </button>
        <button
          type="button"
          role="menuitem"
          className={MENU_ITEM_STYLE}
          style={{ color: 'var(--danger)' }}
          onClick={() => props.onDelete(folder)}
        >
          删除
        </button>
      </div>
    </>
  )
}
