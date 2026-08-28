/**
 * [SR-UI-03] Toast —— 全局通知（已实现）
 *
 * 用法：任意组件 `showToast(err.message, 'error')`（err 为 ApiClientError 时
 * message 已是中文）；App 根部挂一次 `<ToastHost />` 负责渲染（右上角堆叠）。
 *
 * - info/success 3.5s 自动消失，error 6s（错误文案需要更长阅读时间）
 * - 同文案同 kind 1s 内去重（防连点/批量失败刷屏）；按 message+kind 记忆——
 *   A→B→A 穿插序列仍拦第二条 A，不同 kind 同文案不互吞
 * - 自包含模块级订阅，不依赖状态库；Host 未挂载时调用安全（只入队不渲染）
 * - 2026-08-25 拆分：队列纯逻辑移 toast-store.ts（.ts 消费方可导入，不被
 *   tsconfig.node 的 jsx 关卡拦）；本文件再导出 showToast，既有消费方零改动
 */
import { type CSSProperties, useEffect, useState } from 'react'
import { dismiss, getToastItems, subscribeToasts, type ToastItem, type ToastKind } from './toast-store'

export { showToast } from './toast-store'
export type { ToastKind } from './toast-store'

/** 变体主题色：info 强调 / success 成功 / danger 危险（theme.css 变量） */
const KIND_COLOR: Record<ToastKind, string> = {
  info: 'var(--accent)',
  success: 'var(--ok)',
  error: 'var(--danger)'
}

/** 卡面（R3-TH1：玻璃底+blur+shadow-2——票面 P3；kind 色条不变） */
const CARD_STYLE: CSSProperties = {
  background: 'var(--panel-glass)',
  borderColor: 'var(--border)',
  color: 'var(--text)',
  backdropFilter: 'blur(8px)',
  boxShadow: 'var(--shadow-2)'
}

/** 挂在 App 根部：订阅通知队列，右上角堆叠渲染（可手动 × 关闭） */
export function ToastHost(): JSX.Element {
  const [list, setList] = useState<ToastItem[]>(getToastItems)

  useEffect(() => subscribeToasts(setList), [])

  if (list.length === 0) return <></>

  return (
    // 容器穿透（pointer-events-none）：右上 320px 常驻区域不得拦截底层 UI 的点击
    // （此前无卡片处也挡），卡片自身恢复可交互（× 关闭按钮）
    <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-80 flex-col gap-2">
      {list.map((item) => (
        <ToastCard key={item.id} item={item} onClose={() => dismiss(item.id)} />
      ))}
    </div>
  )
}

function ToastCard(props: { item: ToastItem; onClose: () => void }): JSX.Element {
  const { item, onClose } = props
  return (
    <div
      role={item.kind === 'error' ? 'alert' : 'status'}
      className="pointer-events-auto flex items-start gap-2 rounded border px-3 py-2 text-sm"
      style={{ ...CARD_STYLE, borderLeft: `3px solid ${KIND_COLOR[item.kind]}` }}
    >
      <span className="min-w-0 flex-1 break-words">{item.message}</span>
      <button
        type="button"
        aria-label="关闭通知"
        className="shrink-0 rounded px-1 text-xs leading-none"
        style={{ color: 'var(--text-dim)' }}
        onClick={onClose}
      >
        ×
      </button>
    </div>
  )
}
