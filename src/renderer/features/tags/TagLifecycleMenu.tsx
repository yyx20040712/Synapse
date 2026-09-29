// b3: P7-E
/**
 * [P7E-01] TagLifecycleMenu —— 标签右键菜单（TagFilter 子组件，LineageNodeMenu
 * 同型）。行为：fixed 定位于右键锚点；菜单项=重命名/合并到…（tags.length===1
 * 无其他目标时禁用——S9）/颜色…（F-TAGS-01 取色器入口）/删除。透明遮罩点击
 * 关闭 + Esc 关闭（keydown 挂
 * document，unmount 清理——门一 W3 回炉：菜单轻量面键盘关闭自持，不依赖
 * Dialog 域）。所有动作只上抛回调——对话框宿主与写路径在 TagFilter。
 */
import { useEffect } from 'react'
import { MENU_ITEM_STYLE } from '../../shared/ui-constants'
import type { TagWithCount } from './tags.store'

export function TagLifecycleMenu(props: {
  tag: TagWithCount
  /** tags.length>1 才可合并（无其他目标——S9 禁用态） */
  canMerge: boolean
  anchor: { x: number; y: number }
  onClose(): void
  onRename(tag: TagWithCount): void
  onMerge(tag: TagWithCount): void
  /** [F-TAGS-01] 颜色…（TagColorDialog 入口——宿主在 TagFilter） */
  onColor(tag: TagWithCount): void
  onDelete(tag: TagWithCount): void
}): JSX.Element {
  const { tag, anchor } = props

  // Esc 关闭（W3）：挂 document 捕获 Escape，unmount 成对移除
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
        data-testid="tag-menu"
        role="menu"
        aria-label={`标签菜单：${tag.name}`}
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
          onClick={() => props.onRename(tag)}
        >
          重命名
        </button>
        <button
          type="button"
          role="menuitem"
          className={`${MENU_ITEM_STYLE} disabled:opacity-50`}
          style={{ color: 'var(--text)' }}
          disabled={!props.canMerge}
          onClick={() => props.onMerge(tag)}
        >
          合并到…
        </button>
        <button
          type="button"
          role="menuitem"
          className={MENU_ITEM_STYLE}
          style={{ color: 'var(--text)' }}
          onClick={() => props.onColor(tag)}
        >
          颜色…
        </button>
        <button
          type="button"
          role="menuitem"
          className={MENU_ITEM_STYLE}
          style={{ color: 'var(--danger)' }}
          onClick={() => props.onDelete(tag)}
        >
          删除
        </button>
      </div>
    </>
  )
}
