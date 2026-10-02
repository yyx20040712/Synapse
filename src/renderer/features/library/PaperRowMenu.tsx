/**
 * [F-UIRES-01 批 A U4→批 B 三项版] PaperRowMenu —— 文献行右键菜单（R12/P-10：
 * 「在阅读器中打开」+「移动到文件夹 ▸」+「删除文献」（danger——批 B 点亮，
 * §3.5）；星标项 DB 窗口点亮——不渲染禁用项=零死交互）。移动子面=folders.list+
 * 未归档移出（原地展开子列表——飞出子面板形态自裁申报）；移动执行走宿主注入
 * 的 onMove（movePaperToFolder 收尾两分支收口链）；删除执行走宿主注入的
 * onDelete（usePaperDelete 预检分流——静默直删/保护弹窗两分支在 hook+宿主）。
 * TagLifecycleMenu 先例形态：fixed 锚点+透明遮罩关闭+Esc。
 */
import { useEffect, useState } from 'react'
import { MENU_ITEM_STYLE } from '../../shared/ui-constants'
import { api, unwrap } from '../../api/client'
import { useAsync } from '../../shared/hooks/useAsync'

export function PaperRowMenu(props: {
  paper: { id: string; title: string }
  anchor: { x: number; y: number }
  onClose(): void
  /** 「在阅读器中打开」（openPaper 既有通道——宿主接 store.openPaper） */
  onOpen(paperId: string): void
  /** 移动执行（movePaperToFolder 收口链——宿主注入） */
  onMove(paperId: string, toFolderId: string | null): void
  /** [批 B] 删除执行（usePaperDelete.requestDelete 预检分流——宿主注入） */
  onDelete(paperId: string): void
}): JSX.Element {
  const { paper, anchor } = props
  const [expanded, setExpanded] = useState(false)
  // folders.list 自取（移动子面数据——useAsync 静态参考数据先例）
  const { data: folders, run: loadFolders } = useAsync(() => unwrap(api.folders.list({})), [])
  useEffect(() => {
    void loadFolders()
  }, [loadFolders])

  // Esc 关闭：挂 document 捕获，unmount 成对移除
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
        aria-label={`文献菜单：${paper.title}`}
        data-testid="paper-row-menu"
        className="fixed z-(--z-pop) w-48 rounded border py-1 shadow-lg"
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
          onClick={() => {
            props.onClose()
            props.onOpen(paper.id)
          }}
        >
          在阅读器中打开
        </button>
        <button
          type="button"
          role="menuitem"
          className={MENU_ITEM_STYLE}
          style={{ color: 'var(--text)' }}
          onClick={() => setExpanded(!expanded)}
        >
          <span className="lib-menu-row">
            <span>移动到文件夹</span>
            <span className="lib-menu-sub">或拖拽至左栏</span>
          </span>
        </button>
        {expanded && (
          <div data-testid="paper-move-sub" className="lib-move-sub">
            {(folders ?? []).map((f) => (
              <button
                key={f.id}
                type="button"
                role="menuitem"
                className={MENU_ITEM_STYLE}
                style={{ color: 'var(--text)' }}
                onClick={() => {
                  props.onClose()
                  props.onMove(paper.id, f.id)
                }}
              >
                <span className="lib-menu-row">
                  <span>{f.name}</span>
                  <span className="lib-menu-sub">{f.paperCount}</span>
                </span>
              </button>
            ))}
            <button
              type="button"
              role="menuitem"
              className={MENU_ITEM_STYLE}
              style={{ color: 'var(--text)' }}
              onClick={() => {
                props.onClose()
                props.onMove(paper.id, null)
              }}
            >
              未归档（移出）
            </button>
          </div>
        )}
        <button
          type="button"
          role="menuitem"
          className={MENU_ITEM_STYLE}
          style={{ color: 'var(--danger)' }}
          onClick={() => {
            props.onClose()
            props.onDelete(paper.id)
          }}
        >
          删除文献
        </button>
      </div>
    </>
  )
}
