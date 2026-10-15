/**
 * toast-store —— Toast 队列纯逻辑（与 React 树解耦的可导入面）
 *
 * 从 Toast.tsx 拆出（2026-08-25 UNDO-01：reader.store 等非组件 .ts 模块需要
 * showToast，而 .ts 消费方 import Toast.tsx 会被 tsconfig.node（无 jsx）拒绝）。
 * 队列语义：同文案同 kind 在场折叠（重复弹=重置全程停留计时，不叠卡——
 * F-E2EFLK-04/INV-134）+1s recentShown 窗防手动 × 关后连点重弹、info/success
 * 3.5s、error 6s 自动消失、Host 未挂载时调用安全（只入队不渲染）。
 * Toast.tsx 再导出 showToast 保持既有消费方零改动。
 */
export type ToastKind = 'info' | 'error' | 'success'

export interface ToastItem {
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

let items: ToastItem[] = []
let nextId = 1
/** 最近展示记忆：key=`${kind}:${message}` → 展示时刻。单槽会被穿插序列（A→B→A）
 *  洗掉，故用 Map；每次入队顺手清过期项，天然有界。 */
const recentShown = new Map<string, number>()
const listeners = new Set<(snapshot: ToastItem[]) => void>()
/** 计时器句柄类型双环境兼容（DOM 下 number / node 类型下 Timeout） */
const timers = new Map<number, ReturnType<typeof setTimeout>>()

function notify(): void {
  for (const update of listeners) update(items)
}

export function dismiss(id: number): void {
  const timer = timers.get(id)
  if (timer !== undefined) {
    clearTimeout(timer)
    timers.delete(id)
  }
  items = items.filter((it) => it.id !== id)
  notify()
}

/**
 * 弹出一条通知。同文案同 kind 已在场→折叠（fold，INV-134）：清旧计时→
 * 重置全程停留计时，同 id 不新增卡（队列快照零变化）。不在场时 1s
 * recentShown 窗内重复调用只生效一次（防手动 × 关后连点重弹；A→B→A
 * 穿插仍拦第二条 A）；不同 kind 同文案不互吞。
 * kind 缺省 info；error 停留 6s，其余 3.5s。
 */
export function showToast(message: string, kind: ToastKind = 'info'): void {
  const now = Date.now()
  const key = `${kind}:${message}`
  // 在场折叠（先于 1s 窗——窗只对「不在场」的 key 生效）：重置全程停留计时
  const present = items.find((it) => it.message === message && it.kind === kind)
  if (present !== undefined) {
    const old = timers.get(present.id)
    if (old !== undefined) clearTimeout(old)
    timers.set(present.id, setTimeout(() => dismiss(present.id), AUTO_DISMISS_MS[kind]))
    recentShown.set(key, now)
    return // id/message/kind 全同——不 notify，Host 不重渲染
  }
  // 过期项清理：窗口仅 1s，条目天然稀少，Map 保持有界
  for (const [k, at] of recentShown) {
    if (now - at >= DEDUPE_MS) recentShown.delete(k)
  }
  if (now - (recentShown.get(key) ?? -Infinity) < DEDUPE_MS) return
  recentShown.set(key, now)

  const item: ToastItem = { id: nextId, message, kind }
  nextId += 1
  items = [...items, item]
  timers.set(item.id, setTimeout(() => dismiss(item.id), AUTO_DISMISS_MS[kind]))
  notify()
}

/** 队列快照（ToastHost 初值用） */
export function getToastItems(): ToastItem[] {
  return items
}

/** 订阅队列变化（ToastHost 挂载用）；返回退订函数 */
export function subscribeToasts(listener: (snapshot: ToastItem[]) => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
