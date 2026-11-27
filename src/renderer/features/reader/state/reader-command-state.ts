/**
 * [B6] reader-command-state —— 按 paperId 的命令态变更通知。
 *
 * 操作栈、finalize 在途、操作历史在途和冻结门的真相仍驻原模块；本件只持
 * 订阅者集合和通知机制。订阅快照由 useActiveTabCommandState 读原模块真值，
 * 因此通知不携带状态、也不创建第二个状态源。
 *
 * 架构约束：本件不引用命令真值；订阅快照是 per-tab 递增版本号。叶子件
 * 只依赖共享冻结事件；监听器异常不吞入其他订阅。
 */

import { setQuitFreezeChangedListener } from '../../../shared/command-freeze-events'

type CommandStateListener = () => void

const listeners = new Map<string, Set<CommandStateListener>>()
const versions = new Map<string, number>()

/** [B6] 全局退出冻结影响全部已订阅 tab；真值仍由 quit-closing-gate 持有 */
setQuitFreezeChangedListener(() => {
  for (const paperId of listeners.keys()) notifyReaderCommandState(paperId)
})

/**
 * 订阅一个 tab 的命令态变更；返回退订函数，末位退订后不驻留条目。
 *
 * [B6 返工] React 的 useSyncExternalStore 订阅发生在 passive effect；首帧
 * layout effect 中的生产写点可能已先通知并因无监听被丢弃。订阅建立时立即
 * 失效一次，让快照重读原模块真值，但不复制状态。
 */
export function subscribeReaderCommandState(paperId: string, listener: CommandStateListener): () => void {
  let group = listeners.get(paperId)
  if (group === undefined) {
    group = new Set()
    listeners.set(paperId, group)
  }
  group.add(listener)
  notifyReaderCommandState(paperId)
  return () => {
    const current = listeners.get(paperId)
    if (current === undefined) return
    current.delete(listener)
    if (current.size === 0 && listeners.get(paperId) === current) {
      listeners.delete(paperId)
      versions.delete(paperId)
    }
  }
}

/** useSyncExternalStore 的稳定原始快照：同一版本号稳定，每次通知递增 */
export function readerCommandStateVersion(paperId: string): number {
  return versions.get(paperId) ?? 0
}

/** 发布一个 tab 的命令态失效；只订阅过的 tab 收到通知 */
export function notifyReaderCommandState(paperId: string): void {
  const group = listeners.get(paperId)
  if (group === undefined) return
  versions.set(paperId, (versions.get(paperId) ?? 0) + 1)
  for (const listener of [...group]) listener()
}
