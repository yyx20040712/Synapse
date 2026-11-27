/**
 * 统一撤销历史的进程内契约。该文件只声明类型；可写栈、registry 和结算端口
 * 分别在 history-stack、history-registry、run-history。
 */

export type HistoryDomain = 'reader-op' | 'reader-text' | 'lineage' | 'library'
export type HistoryDirection = 'undo' | 'redo'
export type HistoryRedoOrder = 'head' | 'tail'
export type HistorySessionGeneration = number | string

export interface HistoryScope {
  workspaceId: string
  domain: HistoryDomain
  /** 有类型元组；registry 按段匹配，不拼接或解析字符串键。 */
  scopeId: readonly [string, ...string[]]
  sessionGeneration: HistorySessionGeneration
}

export interface HistoryUnit<C> {
  unitId: string
  scope: HistoryScope
  command: string
  changes: C
}

/** selection 与 scope 同一结构展开；回执按完整 scope+方向+unitId 准入。 */
export type HistorySelection<C> = HistoryScope & {
  direction: HistoryDirection
  unitId: string
  unit: HistoryUnit<C>
}

/** keepApplied=操作层缺席时仍保留成功执行项的反向记录；skipMissing=文本层跳过移栈；requireTop=lineage 必须同顶。 */
export type HistoryMissingPolicy = 'keepApplied' | 'skipMissing' | 'requireTop'

export type HistoryOutcome<E> =
  | { status: 'applied'; echo: E }
  | { status: 'noop'; reason: 'empty' | 'unchanged' }
  | { status: 'blocked'; reason: 'gate' | 'notReady' | 'busy' }
  | { status: 'failed'; reason: string; message: string }
  | { status: 'conflict'; reason: 'stale' | 'missing' | 'invalid'; domainReason: string; message: string }
  | { status: 'superseded'; dispatched: boolean }

export type AppliedHistoryOutcome<E> = Extract<HistoryOutcome<E>, { status: 'applied' }>

/** run 端口由领域适配器提供；inLane 必须复用域内既有串行队列。 */
export interface HistoryRunPort<C, E> {
  admitCommand(): boolean
  inLane<T>(task: () => Promise<T>): Promise<T>
  selectAt: 'beforePrepare' | 'afterPrepare'
  prepare(): Promise<HistoryOutcome<void>>
  execute(unit: HistoryUnit<C>, direction: HistoryDirection): Promise<HistoryOutcome<E>>
  /** 领域在回执后给出反向单元、延后正向输入和截断策略；run 不自行补默认结算。 */
  settlement(unit: HistoryUnit<C>, direction: HistoryDirection, outcome: AppliedHistoryOutcome<E>): HistorySettlement<C>
  apply(unit: HistoryUnit<C>, echo: E): void
  /** 可选：领域在移栈后、回显前完成双侧 remap/reanchor。 */
  rewrite?(unit: HistoryUnit<C>, echo: E): void
}

export interface HistorySettlement<C> {
  opposite: HistoryUnit<C>
  pending: readonly HistoryUnit<C>[]
  missingPolicy: HistoryMissingPolicy
}

export function sameHistoryScope(left: HistoryScope, right: HistoryScope): boolean {
  return (
    left.workspaceId === right.workspaceId &&
    left.domain === right.domain &&
    left.scopeId.length === right.scopeId.length &&
    left.scopeId.every((part, index) => part === right.scopeId[index]) &&
    left.sessionGeneration === right.sessionGeneration
  )
}

/** registry/open 捕获完整 scope：外部改 workspace/domain/scopeId/generation 不影响身份。 */
export function freezeHistoryScope(scope: HistoryScope): HistoryScope {
  Object.freeze(scope.scopeId)
  return Object.freeze(scope)
}

/** 消费者拿到的 unit 与载荷浅层结构只读，外部修改不得穿透栈内身份。 */
export function freezeHistoryUnit<C>(unit: HistoryUnit<C>): HistoryUnit<C> {
  const freezeValue = (value: unknown): void => {
    if (Array.isArray(value)) {
      Object.freeze(value)
      for (const item of value) freezeValue(item)
      return
    }
    if (value instanceof Date || value === null || typeof value !== 'object') return
    Object.freeze(value)
    for (const item of Object.values(value)) freezeValue(item)
  }
  freezeValue(unit.changes)
  freezeValue(unit.scope)
  return Object.freeze(unit)
}
