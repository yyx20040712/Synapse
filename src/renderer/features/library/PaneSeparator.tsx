/**
 * [F-VISFB-41→v2 第二期拆件 2026-11-20] PaneSeparator —— 库页双侧栏分隔条
 * （自 LibraryPage 拆出：组件 250 行红线，LibraryPage 随 v2 第二期详情
 * 收起接线增长超限）。
 *
 * ── 行为层 ──
 * - 拖拽热区+键盘调宽（APG separator——aria 三件+tabIndex）+双击复位默认宽；
 *   会话逻辑驻 use-lib-pane-widths，本件纯承载
 * - 视觉线=.lib-sep::after 中央 1px（皮肤驻 library.css）
 *
 * ── 接口层 ──
 * - export function PaneSeparator(props: { label; now; min; max;
 *     onPointerDown; onKeyDown; onReset }): JSX.Element
 */
import type {
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent
} from 'react'

export function PaneSeparator(props: {
  label: string
  now: number
  min: number
  max: number
  onPointerDown(ev: ReactPointerEvent<HTMLDivElement>): void
  onKeyDown(ev: ReactKeyboardEvent<HTMLDivElement>): void
  onReset(): void
}): JSX.Element {
  return (
    <div
      className="lib-sep"
      role="separator"
      aria-orientation="vertical"
      aria-label={props.label}
      aria-valuenow={Math.round(props.now)}
      aria-valuemin={props.min}
      aria-valuemax={props.max}
      tabIndex={0}
      title="拖拽调宽；双击复位默认宽"
      onPointerDown={props.onPointerDown}
      onKeyDown={props.onKeyDown}
      onDoubleClick={props.onReset}
    />
  )
}
