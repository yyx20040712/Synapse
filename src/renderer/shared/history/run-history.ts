import type { HistoryRegistry } from './history-registry'
import {
  type HistoryDirection,
  type HistoryOutcome,
  type HistoryRunPort,
  type HistoryScope,
  type HistorySelection,
  type HistoryUnit
} from './history-types'

/**
 * 命令结算端口。lane 入口、prepare 后和 execute 前都同时核对原栈与领域门；
 * execute 前失效=未派发，execute 后失效=已派发。成功 settlement 中的移栈、
 * 改写和领域回显处于同一抑制边界，最后只发布一次订阅通知。
 */
export function makeRunHistory(registry: HistoryRegistry) {
  return async function runHistory<C, E>(
    scope: HistoryScope,
    direction: HistoryDirection,
    port: HistoryRunPort<C, E>
  ): Promise<HistoryOutcome<E>> {
    const stack = registry.lookup<C>(scope)
    const initialStackPresent = stack !== undefined
    const initialDomainAdmit = port.admitCommand()
    if (!initialStackPresent || !initialDomainAdmit) return { status: 'superseded', dispatched: false }

    /** 两个条件都求值：领域门不得因栈已失效短路而漏检。 */
    const admitted = (): boolean => {
      const sameStack = registry.lookup<C>(scope) === stack
      const domainAdmit = port.admitCommand()
      return sameStack && domainAdmit
    }
    let selected: HistoryUnit<C> | null = null
    return await port.inLane(async (): Promise<HistoryOutcome<E>> => {
      if (!admitted()) return { status: 'superseded', dispatched: false }
      if (port.selectAt === 'beforePrepare') {
        selected = stack.peek(direction)
        if (selected === null) return { status: 'noop', reason: 'empty' }
      }
      const prepared = await port.prepare()
      if (!admitted()) return { status: 'superseded', dispatched: false }
      if (prepared.status !== 'applied') return { ...prepared } as HistoryOutcome<E>
      if (port.selectAt === 'afterPrepare') {
        selected = stack.peek(direction)
        if (selected === null) return { status: 'noop', reason: 'empty' }
      }
      if (!admitted()) return { status: 'superseded', dispatched: false }
      const unit = selected!
      const outcome = await port.execute(unit, direction)
      if (!admitted()) return { status: 'superseded', dispatched: true }
      if (outcome.status !== 'applied') return outcome

      const settlement = port.settlement(unit, direction, outcome)
      const selection: HistorySelection<C> = { ...scope, direction, unitId: unit.unitId, unit }
      const settled = stack.settle(selection, settlement.opposite, settlement.pending, settlement.missingPolicy, () => {
        port.rewrite?.(unit, outcome.echo)
        port.apply(unit, outcome.echo)
      })
      if (!settled) return { status: 'conflict', reason: 'missing', domainReason: 'HISTORY_STALE', message: '选中的历史单元已离场' }
      return outcome
    })
  }
}
