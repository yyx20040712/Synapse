/**
 * identity-ledger conformance: acceptance, invalidation and truncated settlement
 * are separated so unrelated removals cannot invalidate retained receipts.
 */
import { describe, expect, it, vi } from 'vitest'
import { HISTORY_DEPTH_MAX } from '../../../src/shared/constants'
import { opUnit, stackFor, textUnit, type OpPayload, type TextPayload } from './history-conformance-fixtures'

describe('HistoryStack ownedUnits 身份台账', () => {
  it('forgetFuture 保留身份，已捕获截断回执仍可结算', () => {
    const stack = stackFor<TextPayload>('reader-text', ['note', 'paper'], 'head')
    stack.push(textUnit('selected', '', 'selected'))
    const selected = stack.peek('undo')!
    stack.settle({ ...selected.scope, direction: 'undo', unitId: selected.unitId, unit: selected }, selected, [], 'skipMissing')
    stack.push(textUnit('new-input', 'selected', 'next'))

    const listener = vi.fn()
    stack.subscribe(listener)
    let published = 0
    expect(stack.settle({ ...selected.scope, direction: 'undo', unitId: selected.unitId, unit: selected }, selected, [], 'skipMissing', () => { published += 1 })).toBe(true)
    expect(published).toBe(1)
    expect(listener).not.toHaveBeenCalled()
    expect(stack.depth('undo')).toBe(1)
    expect(stack.depth('redo')).toBe(0)
  })

  it('dropTop 使身份失效，旧截断回执拒绝且零 mutation', () => {
    const stack = stackFor<OpPayload>('reader-op', ['op', 'paper'], 'head')
    stack.push(opUnit('selected', 'selected'))
    const selected = stack.peek('undo')!
    expect(stack.dropTop('undo', selected.unitId)).toBe(true)

    const listener = vi.fn()
    stack.subscribe(listener)
    expect(stack.settle({ ...selected.scope, direction: 'undo', unitId: selected.unitId, unit: selected }, selected, [], 'skipMissing')).toBe(false)
    expect(listener).not.toHaveBeenCalled()
    expect(stack.depth('undo')).toBe(0)
    expect(stack.depth('redo')).toBe(0)
  })

  it('removeWhere 只使匹配项失效，不误伤无关截断身份', () => {
    const stack = stackFor<TextPayload>('reader-text', ['note', 'paper'], 'head')
    stack.push(textUnit('selected', '', 'selected'))
    const selected = stack.peek('undo')!
    for (let i = 1; i <= HISTORY_DEPTH_MAX; i++) stack.push(textUnit(`text-${i}`, String(i - 1), String(i)))
    stack.removeWhere((unit) => unit.unitId === 'text-10')

    expect(stack.settle({ ...selected.scope, direction: 'undo', unitId: selected.unitId, unit: selected }, selected, [], 'skipMissing')).toBe(true)
    expect(stack.depth('undo')).toBe(HISTORY_DEPTH_MAX - 1)
    expect(stack.depth('redo')).toBe(0)
    const removed = textUnit('text-10', String(HISTORY_DEPTH_MAX - 1), String(HISTORY_DEPTH_MAX))
    expect(stack.settle({ ...removed.scope, direction: 'undo', unitId: removed.unitId, unit: removed }, removed, [], 'skipMissing')).toBe(false)
  })

  it('rewriteBoth/updateLatestPast 使旧对象失效并登记新对象', () => {
    const rewrite = stackFor<OpPayload>('reader-op', ['op', 'paper'], 'head')
    rewrite.push(opUnit('selected', 'old'))
    const oldRewrite = rewrite.peek('undo')!
    rewrite.rewriteBoth((unit) => ({ ...unit, changes: unit.changes.kind === 'comment-edit' ? { ...unit.changes, after: { ...unit.changes.after, comment: 'new' } } : unit.changes }))
    const newRewrite = rewrite.peek('undo')!
    expect(rewrite.settle({ ...oldRewrite.scope, direction: 'undo', unitId: oldRewrite.unitId, unit: oldRewrite }, oldRewrite, [], 'keepApplied')).toBe(false)
    expect(rewrite.settle({ ...newRewrite.scope, direction: 'undo', unitId: newRewrite.unitId, unit: newRewrite }, newRewrite, [], 'keepApplied')).toBe(true)

    const update = stackFor<OpPayload>('reader-op', ['op', 'paper'], 'head')
    update.push(opUnit('selected', 'old'))
    const oldUpdate = update.peek('undo')!
    expect(update.updateLatestPast({ unitId: oldUpdate.unitId }, (unit) => ({ ...unit, changes: unit.changes.kind === 'comment-edit' ? { ...unit.changes, after: { ...unit.changes.after, comment: 'new' } } : unit.changes }))).toBe(true)
    const newUpdate = update.peek('undo')!
    expect(update.settle({ ...oldUpdate.scope, direction: 'undo', unitId: oldUpdate.unitId, unit: oldUpdate }, oldUpdate, [], 'keepApplied')).toBe(false)
    expect(update.settle({ ...newUpdate.scope, direction: 'undo', unitId: newUpdate.unitId, unit: newUpdate }, newUpdate, [], 'keepApplied')).toBe(true)
  })

  it('选中对象已在另一方向时拒绝重复结算', () => {
    const stack = stackFor<OpPayload>('reader-op', ['op', 'paper'], 'head')
    stack.push(opUnit('selected', 'selected'))
    const selected = stack.peek('undo')!
    stack.settle({ ...selected.scope, direction: 'undo', unitId: selected.unitId, unit: selected }, selected, [], 'keepApplied')

    const listener = vi.fn()
    stack.subscribe(listener)
    expect(stack.settle({ ...selected.scope, direction: 'undo', unitId: selected.unitId, unit: selected }, selected, [], 'keepApplied')).toBe(false)
    expect(listener).not.toHaveBeenCalled()
    expect(stack.depth('undo')).toBe(0)
    expect(stack.depth('redo')).toBe(1)
  })

  it('undo→redo 后再次 execute 截断保留已消费身份', () => {
    const stack = stackFor<OpPayload>('reader-op', ['op', 'paper'], 'head')
    stack.push(opUnit('selected', 'selected'))
    const selected = stack.peek('undo')!
    expect(stack.settle({ ...selected.scope, direction: 'undo', unitId: selected.unitId, unit: selected }, selected, [], 'keepApplied')).toBe(true)
    expect(stack.settle({ ...selected.scope, direction: 'redo', unitId: selected.unitId, unit: selected }, selected, [], 'keepApplied')).toBe(true)
    for (let i = 1; i <= HISTORY_DEPTH_MAX; i++) stack.push(opUnit(`next-${i}`, String(i)))

    let published = 0
    expect(stack.settle({ ...selected.scope, direction: 'undo', unitId: selected.unitId, unit: selected }, selected, [], 'keepApplied', () => { published += 1 })).toBe(true)
    expect(published).toBe(1)
    expect(stack.depth('redo')).toBe(1)
    expect(stack.depth('undo')).toBe(HISTORY_DEPTH_MAX)
  })

  it('截断项由不同反向对象承接后旧回执拒绝', () => {
    const stack = stackFor<OpPayload>('reader-op', ['op', 'paper'], 'head')
    stack.push(opUnit('selected', 'selected'))
    const selected = stack.peek('undo')!
    for (let i = 1; i <= HISTORY_DEPTH_MAX; i++) stack.push(opUnit(`op-${i}`, String(i)))

    const reverse = opUnit('reverse', 'reverse')
    expect(stack.settle({ ...selected.scope, direction: 'undo', unitId: selected.unitId, unit: selected }, reverse, [], 'keepApplied')).toBe(true)

    const listener = vi.fn()
    stack.subscribe(listener)
    let published = 0
    expect(stack.settle({ ...selected.scope, direction: 'undo', unitId: selected.unitId, unit: selected }, selected, [], 'keepApplied', () => { published += 1 })).toBe(false)
    expect(published).toBe(0)
    expect(listener).not.toHaveBeenCalled()
    expect(stack.depth('undo')).toBe(HISTORY_DEPTH_MAX)
    expect(stack.depth('redo')).toBe(1)
  })

  it('removeWhere 使命中的截断身份失效且不误伤无关截断身份', () => {
    const stack = stackFor<OpPayload>('reader-op', ['op', 'paper'], 'head')
    stack.push(opUnit('matched-truncated', 'matched'))
    const matched = stack.peek('undo')!
    stack.push(opUnit('kept-truncated', 'kept'))
    const kept = stack.depth('undo') === 2 ? stack.peek('undo')! : null
    for (let i = 1; i <= HISTORY_DEPTH_MAX; i++) stack.push(opUnit(`op-${i}`, String(i)))

    stack.removeWhere((unit) => unit.unitId === 'matched-truncated' || unit.unitId === 'op-10')
    const keptTruncated = kept!
    const listener = vi.fn()
    stack.subscribe(listener)

    expect(stack.settle({ ...keptTruncated.scope, direction: 'undo', unitId: keptTruncated.unitId, unit: keptTruncated }, keptTruncated, [], 'keepApplied')).toBe(true)
    expect(stack.settle({ ...matched.scope, direction: 'undo', unitId: matched.unitId, unit: matched }, matched, [], 'keepApplied')).toBe(false)
    expect(stack.depth('undo')).toBe(HISTORY_DEPTH_MAX - 1)
    expect(stack.depth('redo')).toBe(1)
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('removeWhere 只命中截断身份时也使其失效', () => {
    const stack = stackFor<OpPayload>('reader-op', ['op', 'paper'], 'head')
    stack.push(opUnit('matched-truncated', 'matched'))
    const matched = stack.peek('undo')!
    stack.push(opUnit('kept-truncated', 'kept'))
    const kept = stack.depth('undo') === 2 ? stack.peek('undo')! : null
    for (let i = 1; i <= HISTORY_DEPTH_MAX; i++) stack.push(opUnit(`op-${i}`, String(i)))

    stack.removeWhere((unit) => unit.unitId === 'matched-truncated')
    const keptTruncated = kept!
    expect(stack.settle({ ...keptTruncated.scope, direction: 'undo', unitId: keptTruncated.unitId, unit: keptTruncated }, keptTruncated, [], 'keepApplied')).toBe(true)
    expect(stack.settle({ ...matched.scope, direction: 'undo', unitId: matched.unitId, unit: matched }, matched, [], 'keepApplied')).toBe(false)
    expect(stack.depth('undo')).toBe(HISTORY_DEPTH_MAX)
    expect(stack.depth('redo')).toBe(1)
  })

  it('destination 同 ID 异对象也使截断结算拒绝', () => {
    const stack = stackFor<OpPayload>('reader-op', ['op', 'paper'], 'head')
    stack.push(opUnit('same', 'selected'))
    const selected = stack.peek('undo')!
    for (let i = 1; i <= HISTORY_DEPTH_MAX; i++) stack.push(opUnit(`op-${i}`, String(i)))
    const current = stack.peek('undo')!
    const destinationClone = { ...opUnit('same', 'destination'), unitId: 'same' }
    stack.settle({ ...current.scope, direction: 'undo', unitId: current.unitId, unit: current }, destinationClone, [], 'keepApplied')

    expect(stack.settle({ ...selected.scope, direction: 'undo', unitId: selected.unitId, unit: selected }, selected, [], 'keepApplied')).toBe(false)
    expect(stack.depth('redo')).toBe(1)
  })
})
