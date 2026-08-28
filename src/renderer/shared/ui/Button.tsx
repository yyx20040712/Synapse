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
import type { ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'

/** 变体皮肤=theme.css 的 .syn-btn-<variant> 类（回炉 B1：静态与 hover 必须
 *  同层——内联 style 层叠上恒压类选择器，静态在内联+hover 挂类=hover 静默
 *  失效。防线=tests/unit/renderer/theme.test.ts B1 describe） */

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
      className={`syn-btn-${variant} inline-flex items-center gap-1 rounded border ${SIZE_CLASS[size]} disabled:cursor-not-allowed disabled:opacity-50`}
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
