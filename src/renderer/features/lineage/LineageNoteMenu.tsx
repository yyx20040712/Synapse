// b3: P7-H
/**
 * [F-VISFB-62] LineageNoteMenu —— 悬浮笔记锚定菜单（组件 250 行红线拆件面；
 * LineageNodeMenu 先例同型：fixed 锚点+透明遮罩点击关闭+Esc 自治〔IME 组词
 * 让路〕+role=menu——use-lineage-esc 单口让路探测面）。单项菜单两态
 * （create/delete）由宿主 LineageFloatingNotes 以 NoteMenu 判别联合装配
 * （宿主持态——BoardMenu 持态模式先例）；**portal 出 .tl-content**（transform
 * 祖先劫持 fixed 包含块——EdgeMenuHost 先例）由本件 NoteMenuPortal 承载
 * （[回炉轮 2] 自宿主迁入——主件 250 行红线）。
 */
import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { MENU_ITEM_STYLE } from '../../shared/ui-constants'

/** 菜单态（宿主 LineageFloatingNotes 持有）：create=右键空白（ownPt=右键点
 *  own 坐标快照——创建以右键点为准非菜单点击点）；delete=笔记右键 */
export type NoteMenu =
  | { kind: 'create'; anchor: { x: number; y: number }; ownPt: { x: number; y: number } }
  | { kind: 'delete'; id: string; anchor: { x: number; y: number } }

export function LineageNoteMenu(props: {
  anchor: { x: number; y: number }
  title: string
  itemLabel: string
  onPick(): void
  onClose(): void
}): JSX.Element {
  // Esc 自治（NodeMenu 先例同型——IME 组词期 Esc=取消候选词非关闭）
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.isComposing) return
      if (e.key === 'Escape') props.onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [props])
  return (
    <>
      {/* 透明遮罩：点击任意处关闭（菜单本体 stopPropagation） */}
      <div className="fixed inset-0 z-(--z-pop-veil)" data-testid="note-menu-veil" onClick={props.onClose} />
      <div
        data-testid="note-anchor-menu"
        role="menu"
        aria-label={props.title}
        className="fixed z-(--z-pop) w-40 rounded border py-1 shadow-lg"
        style={{
          left: props.anchor.x,
          top: props.anchor.y,
          background: 'var(--panel)',
          borderColor: 'var(--border)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-3 py-1 text-[10px] tracking-wide" style={{ color: 'var(--faint)' }}>
          {props.title}
        </div>
        <button
          type="button"
          role="menuitem"
          className={MENU_ITEM_STYLE}
          style={{ color: 'var(--text)' }}
          onClick={() => props.onPick()}
        >
          {props.itemLabel}
        </button>
      </div>
    </>
  )
}

/** 菜单 portal 装配（两态分发——宿主传动作回调；onPick 先关菜单再动作，
 *  与首版序一致；宿主 createNoteAt 自带打断收口） */
export function LineageNoteMenuPortal(props: {
  menu: NoteMenu
  onCreateAt(ownPt: { x: number; y: number }): void
  onRemoveNote(id: string): void
  onClose(): void
}): JSX.Element {
  const m = props.menu
  return createPortal(
    m.kind === 'create' ? (
      <LineageNoteMenu
        anchor={m.anchor}
        title="画布"
        itemLabel="新建悬浮笔记"
        onPick={() => {
          const ownPt = m.ownPt
          props.onClose()
          props.onCreateAt(ownPt)
        }}
        onClose={props.onClose}
      />
    ) : (
      <LineageNoteMenu
        anchor={m.anchor}
        title="悬浮笔记"
        itemLabel="删除笔记"
        onPick={() => {
          props.onRemoveNote(m.id)
          props.onClose()
        }}
        onClose={props.onClose}
      />
    ),
    document.body
  )
}
