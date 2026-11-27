import { HISTORY_DEPTH_MAX } from '@shared/constants'
import { createHistoryNotifier } from './history-notification'
import { type HistoryStack, type HistoryStackOptions } from './history-stack-contract'
import {
  freezeHistoryUnit, freezeHistoryScope, sameHistoryScope
} from './history-types'
import type { HistoryDirection, HistoryScope, HistoryUnit } from './history-types'

export function createHistoryStack<C>(scope: HistoryScope, options: HistoryStackOptions): HistoryStack<C> & { invalidate(): void } {
  /** 捕获标量配置：调用方后续改 options 对象不得改写策略或深度。 */
  const redoOrder = options.redoOrder
  const frozenScope = freezeHistoryScope(scope)
  let active = true
  let past: HistoryUnit<C>[] = []
  let future: HistoryUnit<C>[] = []
  /** 本 scope 已接受对象身份台账：截断不删除；同 id 异对象一律拒绝。 */
  const ownedUnits = new Set<HistoryUnit<C>>()
  const notifier = createHistoryNotifier()

  const side = (direction: HistoryDirection): HistoryUnit<C>[] => (direction === 'undo' ? past : future)
  const destinationOf = (direction: HistoryDirection): HistoryUnit<C>[] => (direction === 'undo' ? future : past)
  /** 身份台账按对象引用记录；同 unitId 的异对象在当前栈内必须先拒绝。 */
  const topIndex = (units: HistoryUnit<C>[], direction: HistoryDirection): number =>
    direction === 'redo' && redoOrder === 'head' ? 0 : units.length - 1
  const peekUnits = (units: HistoryUnit<C>[], direction: HistoryDirection): HistoryUnit<C> | null =>
    units.length === 0 ? null : units[topIndex(units, direction)]!

  const forgetFuture = (): void => {
    /** 新分支丢弃 future 只移出栈数组；已捕获回执仍按接受身份判定。 */
    future = []
  }

  const requireActive = (): void => {
    if (!active) throw new Error('历史句柄已失活')
  }

  /** 深度截断只移出栈数组；ownedUnits 保留身份供截断结算。 */
  const truncate = (): void => {
    if (past.length > HISTORY_DEPTH_MAX) past.splice(0, past.length - HISTORY_DEPTH_MAX)
    if (future.length > HISTORY_DEPTH_MAX) {
      if (redoOrder === 'head') future.splice(HISTORY_DEPTH_MAX)
      else future.splice(0, future.length - HISTORY_DEPTH_MAX)
    }
  }

  const pushToDestination = (direction: HistoryDirection, unit: HistoryUnit<C>): void => {
    const destination = destinationOf(direction)
    if (direction === 'undo' && redoOrder === 'head') destination.unshift(unit)
    else destination.push(unit)
  }

  return {
    scope: frozenScope,
    redoOrder,
    depth(direction) {
      return active ? side(direction).length : 0
    },
    peek(direction) {
      return active ? peekUnits(side(direction), direction) : null
    },
    push(rawUnit) {
      requireActive()
      if (!sameHistoryScope(rawUnit.scope, frozenScope)) throw new Error('历史单元 scope 不匹配')
      const unit = freezeHistoryUnit(rawUnit)
      forgetFuture()
      past.push(unit)
      ownedUnits.add(unit)
      truncate()
      notifier.notify()
      return unit
    },
    settle(selection, rawOpposite, pending, missingPolicy, publish) {
      const scopeMatches =
        sameHistoryScope(selection, frozenScope) &&
        sameHistoryScope(selection.unit.scope, frozenScope) &&
        sameHistoryScope(rawOpposite.scope, frozenScope) &&
        pending.every((unit) => sameHistoryScope(unit.scope, scope))
      if (!scopeMatches) return false
      requireActive()

      const source = side(selection.direction)
      const destination = destinationOf(selection.direction)
      const index = source.findIndex((unit) => unit.unitId === selection.unitId)
      if (index !== -1 && source[index] !== selection.unit) return false
      if (destination.some((unit) => unit.unitId === selection.unitId)) return false
      const selectedInStack = index !== -1 && source[index] === selection.unit
      if (missingPolicy === 'requireTop') {
        const top = peekUnits(source, selection.direction)
        if (top === null || source[topIndex(source, selection.direction)] !== selection.unit) return false
      }
      const legallyTruncated =
        !selectedInStack &&
        (missingPolicy === 'keepApplied' || missingPolicy === 'skipMissing') &&
        ownedUnits.has(selection.unit)
      if (!selectedInStack && !legallyTruncated) return false

      notifier.begin()
      try {
        const hasSelected = selectedInStack
        let stackChanged = hasSelected
        const opposite = freezeHistoryUnit(rawOpposite)
        /** source→destination 结算要么保留同对象，要么消费旧身份并登记反向身份。 */
        if (opposite !== selection.unit) ownedUnits.delete(selection.unit)
        if (hasSelected) {
          const [removed] = source.splice(index, 1)
          ownedUnits.delete(removed!)
          stackChanged = true
        }
        if (hasSelected || missingPolicy !== 'skipMissing') {
          pushToDestination(selection.direction, opposite)
          ownedUnits.add(opposite)
          truncate()
          stackChanged = true
        }
        if (pending.length > 0) {
          forgetFuture()
          for (const unit of pending) {
            past.push(freezeHistoryUnit(unit))
            ownedUnits.add(unit)
          }
          truncate()
          stackChanged = true
        }
        if (!(stackChanged || legallyTruncated)) return false
        if (stackChanged) notifier.notify()
        publish?.()
      } finally {
        notifier.end()
      }
      return true
    },
    clearRedo() {
      requireActive()
      if (future.length === 0) return
      forgetFuture()
      notifier.notify()
    },
    rewriteBoth(map) {
      requireActive()
      let changed = false
      notifier.begin()
      try {
        for (let index = 0; index < past.length; index++) {
          const oldUnit = past[index]!
          const mapped = freezeHistoryUnit(map(oldUnit))
          if (mapped === oldUnit) continue
          ownedUnits.delete(oldUnit)
          ownedUnits.add(mapped)
          past[index] = mapped
          changed = true
        }
        for (let index = 0; index < future.length; index++) {
          const oldUnit = future[index]!
          const mapped = freezeHistoryUnit(map(oldUnit))
          if (mapped === oldUnit) continue
          ownedUnits.delete(oldUnit)
          ownedUnits.add(mapped)
          future[index] = mapped
          changed = true
        }
        if (!changed) return
        truncate()
        notifier.notify()
      } finally {
        notifier.end()
      }
    },
    updateLatestPast(match, map) {
      requireActive()
      let index = -1
      for (let i = past.length - 1; i >= 0; i--) {
        if (past[i]!.unitId === match.unitId) {
          index = i
          break
        }
      }
      if (index === -1) return false
      const oldUnit = past[index]!
      const mapped = freezeHistoryUnit(map(oldUnit))
      if (mapped === oldUnit) return false
      ownedUnits.delete(oldUnit)
      ownedUnits.add(mapped)
      past[index] = mapped
      truncate()
      notifier.notify()
      return true
    },
    dropTop(direction, expectedId) {
      requireActive()
      const units = side(direction)
      const top = peekUnits(units, direction)
      if (top === null || top.unitId !== expectedId) return false
      const [removed] = units.splice(topIndex(units, direction), 1)
      if (removed !== undefined) ownedUnits.delete(removed)
      notifier.notify()
      return true
    },
    removeWhere(match) {
      requireActive()
      for (const unit of ownedUnits) if (match(unit)) ownedUnits.delete(unit)
      const filteredPast = past.filter((unit) => !match(unit))
      const filteredFuture = future.filter((unit) => !match(unit))
      if (filteredPast.length === past.length && filteredFuture.length === future.length) return
      past = filteredPast
      future = filteredFuture
      notifier.notify()
    },
    subscribe(listener) {
      if (!active) return () => undefined
      return notifier.subscribe(listener)
    },
    invalidate() {
      active = false
      past = []
      future = []
      ownedUnits.clear()
      notifier.clear()
    }
  }
}
