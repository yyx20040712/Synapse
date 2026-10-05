/**
 * [SR-UI-01] Button —— 按钮（工单：done / weak）
 *
 * ── 行为层 ──
 * - 变体：primary（accent 底白字）/ secondary（边框）/ danger（红）/ ghost（无边框）
 * - 尺寸 sm/md；disabled 态；loading 态（转圈符 + 禁点）
 *
 * ── 接口层 ──
 * - export function Button(props: { variant?: 'primary'|'secondary'|'danger'|'ghost';
 *     size?: 'sm'|'md'; loading?: boolean; disabled?: boolean; title?: string;
 *     ariaLabel?: string; onClick(): void; children: ReactNode }): JSX.Element
 *
 * ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
 * - 颜色一律 var(--*)，禁止 Tailwind 调色板硬编码
 */
import type { ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'

/** 变体皮肤=theme-buttons.css 的 .syn-btn-<variant> 类（回炉 B1：静态与 hover 必须
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
  /** 布局类透传（皮肤类由变体单源——禁经此注入颜色/字号） */
  className?: string
  /** 悬停提示（无障碍名不占用——内容文本优先） */
  title?: string
  /** 显式无障碍名（态语义补充——须以可见文字开头形：WCAG 2.5.3 label-in-name） */
  ariaLabel?: string
  /** 动态区域播报（如保存钮 aria-live=polite——文本变化即 AT 播报，零视觉影响） */
  ariaLive?: 'polite' | 'assertive' | 'off'
  onClick: () => void
  children: ReactNode
}): JSX.Element {
  const { variant = 'secondary', size = 'md', loading = false, disabled = false, className, title, ariaLabel, ariaLive, onClick, children } = props
  const inactive = disabled || loading
  return (
    <button
      type="button"
      disabled={inactive}
      title={title}
      aria-label={ariaLabel}
      aria-live={ariaLive}
      className={`syn-btn-${variant} inline-flex items-center gap-1 rounded border ${SIZE_CLASS[size]}${className !== undefined ? ` ${className}` : ''} disabled:cursor-not-allowed disabled:opacity-50`}
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
