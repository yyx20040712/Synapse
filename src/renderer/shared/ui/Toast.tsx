/**
 * [SR-UI-03] Toast —— 全局通知（已实现）
 *
 * 用法：任意组件 `showToast(err.message, 'error')`（err 为 ApiClientError 时
 * message 已是中文）；App 根部挂一次 `<ToastHost />` 负责渲染（右上角堆叠）。
 *
 * - info/success 3.5s 自动消失，error 6s（错误文案需要更长阅读时间）
 * - 同文案 1s 内去重（防连点/批量失败刷屏）
 * - 自包含模块级订阅，不依赖状态库；Host 未挂载时调用安全（只入队不渲染）
 */
import { type CSSProperties, useEffect, useState } from 'react'

export type ToastKind = 'info' | 'error' | 'success'

interface ToastItem {
  id: number
  message: string
  kind: ToastKind
}

/** 自动消失时长（ms） */
const AUTO_DISMISS_MS: Record<ToastKind, number> = {
  info: 3500,
  success: 3500,
  error: 6000
}

/** 同文案去重窗口（ms） */
const DEDUPE_MS = 1000

/** 变体主题色：info 强调 / success 成功 / danger 危险（theme.css 变量） */
const KIND_COLOR: Record<ToastKind, string> = {
  info: 'var(--accent)',
  success: 'var(--ok)',
  error: 'var(--danger)'
}

const CARD_STYLE: CSSProperties = {
  background: 'var(--panel)',
  borderColor: 'var(--border)',
  color: 'var(--text)'
}

// ── 模块级队列（自包含订阅，与 React 树解耦） ──
let items: ToastItem[] = []
let nextId = 1
let lastMessage = ''
let lastShownAt = 0
const listeners = new Set<(snapshot: ToastItem[]) => void>()
const timers = new Map<number, number>()

function notify(): void {
  for (const update of listeners) update(items)
}

function dismiss(id: number): void {
  const timer = timers.get(id)
  if (timer !== undefined) {
    window.clearTimeout(timer)
    timers.delete(id)
  }
  items = items.filter((it) => it.id !== id)
  notify()
}

/**
 * 弹出一条通知。同文案在 1s 窗口内重复调用只生效一次。
 * kind 缺省 info；error 停留 6s，其余 3.5s。
 */
export function showToast(message: string, kind: ToastKind = 'info'): void {
  const now = Date.now()
  if (message === lastMessage && now - lastShownAt < DEDUPE_MS) return
  lastMessage = message
  lastShownAt = now

  const item: ToastItem = { id: nextId, message, kind }
  nextId += 1
  items = [...items, item]
  timers.set(item.id, window.setTimeout(() => dismiss(item.id), AUTO_DISMISS_MS[kind]))
  notify()
}

/** 挂在 App 根部：订阅通知队列，右上角堆叠渲染（可手动 × 关闭） */
export function ToastHost(): JSX.Element {
  const [list, setList] = useState<ToastItem[]>(items)

  useEffect(() => {
    const update = (snapshot: ToastItem[]): void => {
      setList(snapshot)
    }
    listeners.add(update)
    return () => {
      listeners.delete(update)
    }
  }, [])

  if (list.length === 0) return <></>

  return (
    <div className="fixed right-4 top-4 z-50 flex w-80 flex-col gap-2">
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
      className="flex items-start gap-2 rounded border px-3 py-2 text-sm"
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
