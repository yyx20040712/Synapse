/**
 * [F-VISFB-65 单元二] conflictResolution —— GHOST_FOLDER 降级询问待决态
 * （设计书 §7；模块单例——write-queue 挂起点，ConflictDialog 消费/决出）。
 *
 * ── 行为面（§9 轴 conflict-wait）──
 * - requestGhostFolderDecision(folderId)：flush 三联判据命中时调用——置
 *   pending+通知订阅者，返回 Promise（flush 挂起等待决出；每 folder 一询——
 *   同 folder 队内 remap/discard 后不再二询，作用域在 write-queue 一次覆盖）。
 * - resolveGhostFolderDecision(choice)：ConflictDialog 按钮决出——清 pending
 *   （先清后 resolve：订阅面即时收态）+resolve 挂起的 flush。
 * - conflictWaitBlocked()：modal 期编辑门（beginUnitGated 挂点——quit/
 *   recovery 门同型）。真实流程中 flushing 守卫已锁全部写面（INV-94），本门
 *   为显式第二道位（孤立 pending 防御——flush 异常退出未决时门仍在）。
 * - quit 交叠（§7）：conflict-wait 期 quit→runQuitFlush ④ 查态 saving=脏→
 *   main 5s 超时确认框→强退不自动选不 release（modal 保持挂起，窗口随销毁）。
 */
export type GhostFolderChoice = 'remap-main-graph' | 'discard'

export interface ConflictState {
  pending: { folderId: string } | null
}

let resolvePending: ((choice: GhostFolderChoice) => void) | null = null
let state: ConflictState = { pending: null }
const listeners = new Set<() => void>()

function emit(next: ConflictState): void {
  state = next
  for (const cb of listeners) cb()
}

/** flush 挂起点（三联判据命中——write-queue 调用） */
export function requestGhostFolderDecision(folderId: string): Promise<GhostFolderChoice> {
  return new Promise<GhostFolderChoice>((resolve) => {
    resolvePending = resolve
    emit({ pending: { folderId } })
  })
}

/** 决出（ConflictDialog 按钮——先清态后 resolve） */
export function resolveGhostFolderDecision(choice: GhostFolderChoice): void {
  const resolve = resolvePending
  resolvePending = null
  emit({ pending: null })
  resolve?.(choice)
}

/** modal 期编辑门（beginUnitGated 挂点——未决恒真） */
export function conflictWaitBlocked(): boolean {
  return state.pending !== null
}

export function getConflictState(): ConflictState {
  return state
}

export function subscribeConflictState(cb: () => void): () => void {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

/** 复位（测试/装配期；幂等——挂起 resolver 吞弃由调用方语境承接） */
export function resetConflictResolution(): void {
  resolvePending = null
  emit({ pending: null })
}
