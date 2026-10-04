/**
 * [F-UIRES-01 批 A] FolderMenu —— 文件夹行右键菜单（FolderNav 子组件，三件版：
 * 重命名[行内编辑单源]/删除文件夹…[空夹直删子标注]/在脉络图中打开[P-8]——
 * mockup S2 .menu 逐值；TagLifecycleMenu 先例形态（该件已随 TagFilter 退役）：fixed 锚点+遮罩+
 * Esc 关闭）。动作只上抛——行内编辑/删除流/跳转宿主在 FolderNav。
 */
import { useEffect } from 'react'
import { MENU_ITEM_STYLE } from '../../shared/ui-constants'
import type { Folder } from '@shared/models/folder'

/** 菜单项内容行（主标+右缘子标注两栏——block 按钮内 flex 行） */
function ItemRow(props: { label: string; sub?: string }): JSX.Element {
  return (
    <span className="lib-menu-row">
      <span>{props.label}</span>
      {props.sub !== undefined && <span className="lib-menu-sub">{props.sub}</span>}
    </span>
  )
}

export function FolderMenu(props: {
  folder: Folder
  anchor: { x: number; y: number }
  /** 导入 busy（§2.1 禁用清单——重命名/删除/导航面全锁） */
  busy: boolean
  onClose(): void
  onRename(folder: Folder): void
  onDelete(folder: Folder): void
  /** [P-8] 在脉络图中打开（setQuery folderScope+open-lineage 广播） */
  onOpenLineage(folder: Folder): void
}): JSX.Element {
  const { folder, anchor, busy } = props

  // Esc 关闭：挂 document 捕获，unmount 成对移除（TagLifecycleMenu 先例形态）
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') props.onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [props.onClose])
  return (
    <>
      {/* 透明遮罩：点击任意处关闭（菜单本体 stopPropagation） */}
      <div className="fixed inset-0 z-(--z-pop-veil)" onClick={props.onClose} />
      <div
        role="menu"
        aria-label={`文件夹菜单：${folder.name}`}
        data-testid="folder-menu"
        className="fixed z-(--z-pop) w-44 rounded border py-1 shadow-lg"
        style={{
          left: anchor.x,
          top: anchor.y,
          background: 'var(--panel)',
          borderColor: 'var(--border)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-3 py-1 text-[10px] tracking-wide" style={{ color: 'var(--faint)' }}>
          {`● ${folder.name}`}
        </div>
        <button
          type="button"
          role="menuitem"
          disabled={busy}
          className={MENU_ITEM_STYLE}
          style={{ color: 'var(--text)' }}
          onClick={() => props.onRename(folder)}
        >
          <ItemRow label="重命名" sub="F2" />
        </button>
        <button
          type="button"
          role="menuitem"
          disabled={busy}
          className={MENU_ITEM_STYLE}
          style={{ color: 'var(--danger)' }}
          onClick={() => props.onDelete(folder)}
        >
          <ItemRow label="删除文件夹…" sub="空夹直删" />
        </button>
        <div className="lib-menu-sep" />
        <button
          type="button"
          role="menuitem"
          disabled={busy}
          className={MENU_ITEM_STYLE}
          style={{ color: 'var(--text)' }}
          onClick={() => props.onOpenLineage(folder)}
        >
          在脉络图中打开
        </button>
      </div>
    </>
  )
}
