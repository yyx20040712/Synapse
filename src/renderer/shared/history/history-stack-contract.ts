import type {
  HistoryDirection,
  HistoryMissingPolicy,
  HistoryRedoOrder,
  HistoryScope,
  HistorySelection,
  HistoryUnit
} from './history-types'

/** 创建后只捕获 redoOrder 标量；深度固定为 HISTORY_DEPTH_MAX，公开面不提供覆盖。 */
export interface HistoryStackOptions {
  redoOrder: HistoryRedoOrder
}

/** 统一栈公开合约；registry 只暴露该合约，栈实现内部的失活入口不进入消费方类型。 */
export interface HistoryStack<C> {
  readonly scope: HistoryScope
  readonly redoOrder: HistoryRedoOrder
  depth(direction: HistoryDirection): number
  peek(direction: HistoryDirection): HistoryUnit<C> | null
  push(unit: HistoryUnit<C>): HistoryUnit<C>
  /** settle 用领域返回的完整载荷结算；publish 是移栈后、通知结束前的领域发布回调。 */
  settle(
    selection: HistorySelection<C>,
    opposite: HistoryUnit<C>,
    pending: readonly HistoryUnit<C>[],
    missingPolicy: HistoryMissingPolicy,
    publish?: () => void
  ): boolean
  clearRedo(): void
  rewriteBoth(map: (unit: HistoryUnit<C>) => HistoryUnit<C>): void
  updateLatestPast(match: { unitId: string }, map: (unit: HistoryUnit<C>) => HistoryUnit<C>): boolean
  dropTop(direction: HistoryDirection, expectedId: string): boolean
  removeWhere(match: (unit: HistoryUnit<C>) => boolean): void
  subscribe(listener: () => void): () => void
}
