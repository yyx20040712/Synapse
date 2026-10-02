/**
 * [F-UIRES-01 批 A U3] TagRowMenu —— 标签下拉行右键菜单（TagDropdown 拆件：
 * 组件 250 行红线；TagLifecycleMenu 先例形态——fixed 锚点+透明遮罩+Esc）。
 * 两件版（P-11 用户终裁）：改名+颜色；merge/delete UI 入口随 TagFilter 退役
 * （IPC 通道与 main 面零触碰）。动作只上抛——对话框宿主在 TagDropdown。
 */
import { useEffect } from 'react'
import { MENU_ITEM_STYLE } from '../../shared/ui-constants'
import type { TagWithCount } from './tags.store'

export function TagRowMenu(props: {
  tag: TagWithCount
  anchor: { x: number; y: number }
  onClose(): void
  onRename(tag: TagWithCount): void
  onColor(tag: TagWithCount): void
}): JSX.Element {
  const { tag, anchor } = props

  // Esc 关闭：挂 document 捕获，unmount 成对移除（TagLifecycleMenu 先例形态；
  // 面板层级裁剪在 TagDropdown 单监听分流——本菜单 Esc 由其先行消化）
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
          className={MENU_ITEM_STYLE}
          style={{ color: 'var(--text)' }}
          onClick={() => props.onColor(tag)}
        >
          颜色…
        </button>
      </div>
    </>
  )
}
