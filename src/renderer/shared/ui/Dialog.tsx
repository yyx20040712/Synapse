/**
 * [SR-UI-02] Dialog —— 对话框（工单：open / weak）
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
import type { ReactNode } from 'react'

export function Dialog(_props: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  actions?: ReactNode
}): JSX.Element | null {
  if (!_props.open) return null
  return (
    <div data-ticket="SR-UI-02" className="p-6 text-sm" style={{ color: 'var(--text-dim)' }}>
      工单未完成：SR-UI-02（对话框）
    </div>
  )
}
