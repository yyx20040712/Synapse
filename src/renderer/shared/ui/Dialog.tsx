/**
 * [SR-UI-02] Dialog —— 对话框（工单：done / weak）
 *
 * ── 行为层 ──
 * - 模态遮罩 + 居中卡片；ESC/点遮罩关闭（onClose）；内部表单阻止冒泡
 * - 标题栏 + 内容（children）+ 底部按钮槽（actions: ReactNode）
 *
 * ── 接口层 ──
 * - export function Dialog(props: { open: boolean; title: string;
 *     onClose(): void; children: ReactNode; actions?: ReactNode }): JSX.Element | null
 *
 * ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
 * - open=false 返回 null；不用 <dialog> 元素（样式可控性）
 */
import { useEffect } from 'react'
import type { ReactNode } from 'react'

export function Dialog(props: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  actions?: ReactNode
}): JSX.Element | null {
  const { open, title, onClose, children, actions } = props

  useEffect(() => {
    if (!open) {
      return
    }
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) {
    return null
  }
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      // 点遮罩关闭；卡片内部（含表单）阻止冒泡防误关
      onClick={onClose}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex max-h-[80vh] w-[32rem] max-w-full flex-col rounded-lg border shadow-xl"
        style={{ background: 'var(--panel)', borderColor: 'var(--border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between border-b px-4 py-2 text-sm font-medium"
          style={{ borderColor: 'var(--border)' }}
        >
          <span>{title}</span>
          <button
            type="button"
            aria-label="关闭对话框"
            className="rounded px-1 text-xs"
            style={{ color: 'var(--text-dim)' }}
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto px-4 py-3 text-sm">{children}</div>
        {actions !== undefined && (
          <div
            className="flex justify-end gap-2 border-t px-4 py-2"
            style={{ borderColor: 'var(--border)' }}
          >
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}
