/**
 * [SR-UI-01] Button —— 按钮（工单：open / weak）
 *
 * ── 行为层 ──
 * - 变体：primary（accent 底白字）/ secondary（边框）/ danger（红）/ ghost（无边框）
 * - 尺寸 sm/md；disabled 态；loading 态（转圈符 + 禁点）
 *
 * ── 接口层 ──
 * - export function Button(props: { variant?: 'primary'|'secondary'|'danger'|'ghost';
 *     size?: 'sm'|'md'; loading?: boolean; disabled?: boolean;
 *     onClick(): void; children: ReactNode }): JSX.Element
 *
 * ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
 * - 颜色一律 var(--*)，禁止 Tailwind 调色板硬编码
 */
import type { ReactNode } from 'react'

export function Button(_props: {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md'
  loading?: boolean
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}): JSX.Element {
  return (
    <button data-ticket="SR-UI-01" disabled className="rounded px-2 py-1 text-xs" style={{ color: 'var(--text-dim)' }}>
      工单未完成：SR-UI-01
    </button>
  )
}
