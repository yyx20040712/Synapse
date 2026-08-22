/**
 * [SR-UI-01] Button —— 按钮（工单：done / weak）
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
import type { CSSProperties, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'

/** 变体底色/边框（全部走主题变量） */
const VARIANT_STYLE: Record<Variant, CSSProperties> = {
  primary: { background: 'var(--accent)', color: '#ffffff', borderColor: 'var(--accent)' },
  secondary: { background: 'var(--panel)', color: 'var(--text)', borderColor: 'var(--border)' },
  danger: { background: 'var(--panel)', color: 'var(--danger)', borderColor: 'var(--danger)' },
  ghost: { background: 'transparent', color: 'var(--text)' }
}

const SIZE_CLASS: Record<'sm' | 'md', string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-3 py-1.5 text-sm'
}

export function Button(props: {
  variant?: Variant
  size?: 'sm' | 'md'
  loading?: boolean
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}): JSX.Element {
  const { variant = 'secondary', size = 'md', loading = false, disabled = false, onClick, children } = props
  const inactive = disabled || loading
  return (
    <button
      type="button"
      disabled={inactive}
      className={`inline-flex items-center gap-1 rounded border ${SIZE_CLASS[size]} disabled:cursor-not-allowed disabled:opacity-50`}
      style={{ ...VARIANT_STYLE[variant], ...(variant === 'ghost' ? { border: 'none' } : {}) }}
      onClick={() => {
        if (!inactive) onClick()
      }}
    >
      {loading && (
        <span aria-hidden className="inline-block animate-spin">
          ⟳
        </span>
      )}
      {children}
    </button>
  )
}
