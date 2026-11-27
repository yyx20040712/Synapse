import { describe, expect, it, vi } from 'vitest'
import { HISTORY_DEPTH_MAX } from '../../../src/shared/constants'
import { createHistoryStack } from '../../../src/renderer/shared/history/history-stack'
import type { HistoryUnit } from '../../../src/renderer/shared/history/history-types'
import {
  annotation,
  lineageUnit,
  opScope,
  opUnit,
  payloadOf,
  stackFor,
  textUnit,
  type LineagePayload,
  type OpPayload,
  type TextPayload
} from './history-conformance-fixtures'

describe('HistoryStack 三域 conformance', () => {
  it('第 11 项截断最旧项，最新项仍在 undo 顶', () => {
    const stack = createHistoryStack<OpPayload>(opScope(1), { redoOrder: 'head' })
    for (let i = 0; i <= HISTORY_DEPTH_MAX; i++) stack.push(opUnit(`op-${i}`, String(i)))
    expect(stack.depth('undo')).toBe(HISTORY_DEPTH_MAX)
    expect(stack.peek('undo')?.unitId).toBe(`op-${HISTORY_DEPTH_MAX}`)
    expect(stack.peek('undo')?.scope.sessionGeneration).toBe(1)
    expect(payloadOf(stack.peek('undo')!)).toContain('10')
  })

  it('深度恒为 HISTORY_DEPTH_MAX，调用方传入 maxDepth 不生效', () => {
    const attackerOptions = { redoOrder: 'head', maxDepth: HISTORY_DEPTH_MAX + 1 } as unknown as { redoOrder: 'head' }
    const stack = createHistoryStack<OpPayload>(opScope(1), attackerOptions)
    for (let i = 0; i <= HISTORY_DEPTH_MAX; i++) stack.push(opUnit(`op-${i}`, String(i)))
    expect(stack.depth('undo')).toBe(HISTORY_DEPTH_MAX)
  })

  it('open 配置捕获为标量，后改 options 不改变 redo 策略', () => {
    const options: { redoOrder: 'head' | 'tail' } = { redoOrder: 'head' }
    const stack = createHistoryStack<OpPayload>(opScope(1), options)
    options.redoOrder = 'tail'
    stack.push(opUnit('one', 'one'))
    const selected = stack.peek('undo')!
    stack.settle({ ...selected.scope, direction: 'undo', unitId: selected.unitId, unit: selected }, selected, [], 'requireTop')
    expect(stack.redoOrder).toBe('head')
    expect(stack.peek('redo')?.unitId).toBe('one')
  })

  it('settle 按身份结算，等待窗内 pending 保留原序', () => {
    const stack = stackFor<OpPayload>('reader-op', ['op', 'paper'], 'head')
    stack.push(opUnit('one', 'one'))
    stack.push(opUnit('two', 'two'))
    const selected = stack.peek('undo')!
    stack.push(opUnit('three', 'three'))
    const pending = opUnit('pending', 'four')
    if (selected.changes.kind !== 'comment-edit') throw new Error('测试前提不是 comment-edit')
    const opposite: HistoryUnit<OpPayload> = {
      ...selected,
      changes: { kind: 'comment-edit', before: selected.changes.before, after: annotation('one', 'rebased') }
    }

    expect(stack.settle({ ...selected.scope, direction: 'undo', unitId: selected.unitId, unit: selected }, opposite, [pending], 'keepApplied')).toBe(true)
    expect(stack.depth('undo')).toBe(3)
    expect(stack.peek('undo')?.unitId).toBe('pending')
    expect(stack.depth('redo')).toBe(0)
  })

  it('reader head 连续 redo 取 future 头', () => {
    const stack = stackFor<OpPayload>('reader-op', ['op', 'paper'], 'head')
    stack.push(opUnit('one', 'one'))
    stack.push(opUnit('two', 'two'))
    const firstUndo = stack.peek('undo')!
    stack.settle({ ...firstUndo.scope, direction: 'undo', unitId: firstUndo.unitId, unit: firstUndo }, firstUndo, [], 'keepApplied')
    const secondUndo = stack.peek('undo')!
    stack.settle({ ...secondUndo.scope, direction: 'undo', unitId: secondUndo.unitId, unit: secondUndo }, secondUndo, [], 'keepApplied')

    expect(stack.peek('redo')?.unitId).toBe('one')
    const firstRedo = stack.peek('redo')!
    stack.settle({ ...firstRedo.scope, direction: 'redo', unitId: firstRedo.unitId, unit: firstRedo }, firstRedo, [], 'keepApplied')
    expect(stack.peek('redo')?.unitId).toBe('two')
    expect(stack.depth('undo')).toBe(1)
  })

  it('reader-text head 两步 undo 后连续 redo 复原 A/B', () => {
    const stack = stackFor<TextPayload>('reader-text', ['note', 'paper'], 'head')
    stack.push(textUnit('a', '', 'a'))
    stack.push(textUnit('b', 'a', 'b'))
    for (const id of ['b', 'a']) {
      const unit = stack.peek('undo')!
      expect(unit.unitId).toBe(id)
      stack.settle({ ...unit.scope, direction: 'undo', unitId: unit.unitId, unit }, unit, [], 'skipMissing')
    }
    expect(stack.depth('undo')).toBe(0)
    for (const id of ['a', 'b']) {
      const unit = stack.peek('redo')!
      expect(unit.unitId).toBe(id)
      stack.settle({ ...unit.scope, direction: 'redo', unitId: unit.unitId, unit }, unit, [], 'skipMissing')
    }
    expect(stack.peek('undo')?.unitId).toBe('b')
    expect(stack.depth('redo')).toBe(0)
  })

  it('lineage tail 多步 undo 后按原正向顺序 redo', () => {
    const stack = stackFor<LineagePayload>('lineage', ['folder', 'main'], 'tail')
    stack.push(lineageUnit('one', 't1'))
    stack.push(lineageUnit('two', 't2'))
    for (const id of ['two', 'one']) {
      const unit = stack.peek('undo')!
      expect(unit.unitId).toBe(id)
      stack.settle({ ...unit.scope, direction: 'undo', unitId: unit.unitId, unit }, unit, [], 'requireTop')
    }
    expect(stack.depth('undo')).toBe(0)
    expect(stack.peek('redo')?.unitId).toBe('one')
    const firstRedo = stack.peek('redo')!
    stack.settle({ ...firstRedo.scope, direction: 'redo', unitId: firstRedo.unitId, unit: firstRedo }, firstRedo, [], 'requireTop')
    expect(stack.peek('redo')?.unitId).toBe('two')
  })

  it('文本 pending 首项以反向写落库值重基并清 redo', () => {
    const stack = stackFor<TextPayload>('reader-text', ['note', 'paper'], 'head')
    stack.push(textUnit('one', '', 'one'))
    stack.push(textUnit('two', 'one', 'two'))
    const selected = stack.peek('undo')!
    const pending = textUnit('pending', 'database-two', 'in-flight')
    const opposite: HistoryUnit<TextPayload> = { ...selected, changes: { ...selected.changes, before: 'database-two', after: 'one' } }

    stack.settle({ ...selected.scope, direction: 'undo', unitId: selected.unitId, unit: selected }, opposite, [pending], 'skipMissing')
    expect(stack.peek('undo')?.changes.before).toBe('database-two')
    expect(stack.depth('redo')).toBe(0)
  })

  it('pending 在 undo 与 redo 在途都是新正向历史：清 redo、追加 past、不清 past', () => {
    for (const direction of ['undo', 'redo'] as const) {
      const stack = stackFor<TextPayload>('reader-text', ['note', 'paper'], 'head')
      stack.push(textUnit('old', '', 'old'))
      stack.push(textUnit('selected', 'old', 'selected'))
      const selected = stack.peek('undo')!
      const pending = textUnit('pending', 'database', 'in-flight')
      if (direction === 'undo') {
        stack.settle({ ...selected.scope, direction, unitId: selected.unitId, unit: selected }, selected, [pending], 'skipMissing')
      } else {
        stack.settle({ ...selected.scope, direction: 'undo', unitId: selected.unitId, unit: selected }, selected, [], 'skipMissing')
        stack.settle({ ...selected.scope, direction, unitId: selected.unitId, unit: selected }, selected, [pending], 'skipMissing')
      }
      expect(stack.depth('undo')).toBe(direction === 'undo' ? 2 : 3)
      expect(stack.peek('undo')?.unitId).toBe('pending')
      expect(stack.depth('redo')).toBe(0)
    }
  })

  it('异代 opposite 或 pending 任一存在时零 mutation', () => {
    const stack = stackFor<TextPayload>('reader-text', ['note', 'paper'], 'head')
    stack.push(textUnit('one', '', 'one'))
    const selected = stack.peek('undo')!
    const oldScope = { ...stack.scope, sessionGeneration: 0 }
    const foreignOpposite: HistoryUnit<TextPayload> = { ...selected, scope: oldScope }
    expect(stack.settle({ ...selected.scope, direction: 'undo', unitId: selected.unitId, unit: selected }, foreignOpposite, [], 'skipMissing')).toBe(false)
    const foreignPending: HistoryUnit<TextPayload> = { ...textUnit('pending', '', 'x'), scope: oldScope }
    expect(stack.settle({ ...selected.scope, direction: 'undo', unitId: selected.unitId, unit: selected }, selected, [foreignPending], 'skipMissing')).toBe(false)
    expect(stack.depth('undo')).toBe(1)
    expect(stack.depth('redo')).toBe(0)
  })

  it('requireTop 只接受同方向当前栈顶且同一选中对象', () => {
    const stack = stackFor<LineagePayload>('lineage', ['folder', 'main'], 'tail')
    stack.push(lineageUnit('a', 't1'))
    stack.push(lineageUnit('b', 't2'))
    const clone = { ...lineageUnit('a', 't1'), unitId: 'a' }
    expect(stack.settle({ ...stack.scope, direction: 'undo', unitId: 'a', unit: clone }, stack.peek('undo')!, [], 'requireTop')).toBe(false)
    expect(stack.depth('undo')).toBe(2)
    expect(stack.depth('redo')).toBe(0)
  })

  it('skipMissing 未拥有对象即使 pending 也拒绝', () => {
    const stack = stackFor<TextPayload>('reader-text', ['note', 'paper'], 'head')
    stack.push(textUnit('kept', '', 'kept'))
    stack.push(textUnit('selected', 'kept', 'selected'))
    const selected = stack.peek('undo')!
    stack.settle({ ...selected.scope, direction: 'undo', unitId: selected.unitId, unit: selected }, selected, [], 'skipMissing')
    const absent = textUnit('absent', '', 'absent')
    const pending = textUnit('pending', 'database', 'in-flight')
    expect(stack.settle({ ...stack.scope, direction: 'undo', unitId: absent.unitId, unit: absent }, absent, [pending], 'skipMissing')).toBe(false)
    expect(stack.depth('undo')).toBe(1)
    expect(stack.depth('redo')).toBe(1)
  })

  it('comment-edit 合并只更新最近 past 项并保持 unitId', () => {
    const stack = stackFor<OpPayload>('reader-op', ['op', 'paper'], 'head')
    stack.push(opUnit('comment', 'draft'))
    expect(stack.updateLatestPast({ unitId: 'comment' }, (unit) => ({
      ...unit,
      changes: unit.changes.kind === 'comment-edit'
        ? { kind: 'comment-edit', before: unit.changes.before, after: annotation('comment', 'merged') }
        : unit.changes
    }))).toBe(true)
    expect(stack.peek('undo')?.unitId).toBe('comment')
    expect(payloadOf(stack.peek('undo')!)).toContain('merged')
    expect(stack.updateLatestPast({ unitId: 'absent' }, (unit) => unit)).toBe(false)
  })

  it('rewriteBoth 双侧 remap/reanchor 且保持 unitId 和封装', () => {
    const stack = stackFor<LineagePayload>('lineage', ['folder', 'main'], 'tail')
    stack.push(lineageUnit('live', 't1'))
    stack.push(lineageUnit('other', 't2'))
    const selected = stack.peek('undo')!
    stack.settle({ ...selected.scope, direction: 'undo', unitId: selected.unitId, unit: selected }, selected, [], 'requireTop')
    stack.rewriteBoth((unit) => ({
      ...unit,
      changes: {
        ...unit.changes,
        anchoredAt: `${unit.changes.anchoredAt}-r`,
        changes: unit.changes.changes.map((delta) => ({ ...delta, id: `${delta.id}-remapped` }))
      }
    }))
    expect(stack.peek('undo')?.unitId).toBe('live')
    expect(stack.peek('redo')?.unitId).toBe('other')
    expect(payloadOf(stack.peek('undo')!)).toContain('live-remapped')
    expect(payloadOf(stack.peek('redo')!)).toContain('t2-r')
  })

  it('reader annotation id remap 双侧生效且对象封装不变', () => {
    const stack = stackFor<OpPayload>('reader-op', ['op', 'paper'], 'head')
    const unitWith = (unitId: string, comment: string): HistoryUnit<OpPayload> => ({
      ...opUnit(unitId, comment),
      unitId,
      changes: { kind: 'comment-edit', before: annotation('annotation', ''), after: annotation('annotation', comment) }
    })
    stack.push(unitWith('older', 'one'))
    stack.push(unitWith('selected', 'two'))
    const selected = stack.peek('undo')!
    stack.settle({ ...selected.scope, direction: 'undo', unitId: selected.unitId, unit: selected }, selected, [], 'keepApplied')
    stack.rewriteBoth((unit) => {
      if (unit.changes.kind !== 'comment-edit') return unit
      const before = { ...unit.changes.before, id: 'new-annotation' }
      const after = { ...unit.changes.after, id: 'new-annotation' }
      return { ...unit, changes: { kind: 'comment-edit', before, after } }
    })
    const redoUnit = stack.peek('redo')!
    const undoUnit = stack.peek('undo')!
    expect(redoUnit.unitId).toBe('selected')
    expect(undoUnit.unitId).toBe('older')
    expect(redoUnit.changes.kind === 'comment-edit' && redoUnit.changes.before.id).toBe('new-annotation')
    expect(redoUnit.changes.kind === 'comment-edit' && redoUnit.changes.after.id).toBe('new-annotation')
    expect(undoUnit.changes.kind === 'comment-edit' && undoUnit.changes.before.id).toBe('new-annotation')
    expect(undoUnit.changes.kind === 'comment-edit' && undoUnit.changes.after.id).toBe('new-annotation')
    expect(Object.isFrozen(redoUnit)).toBe(true)
  })

  it('lineage updatedAt reanchor 双侧生效且保留 createdAt', () => {
    const stack = stackFor<LineagePayload>('lineage', ['folder', 'main'], 'tail')
    const unitWith = (unitId: string, anchoredAt: string): HistoryUnit<LineagePayload> => ({
      ...lineageUnit('node', anchoredAt),
      unitId
    })
    stack.push(unitWith('older', 't1'))
    stack.push(unitWith('selected', 't2'))
    const selected = stack.peek('undo')!
    stack.settle({ ...selected.scope, direction: 'undo', unitId: selected.unitId, unit: selected }, selected, [], 'requireTop')
    stack.rewriteBoth((unit) => {
      const changes = unit.changes.changes.map((delta) => {
        if (delta.kind !== 'node') return delta
        return {
          ...delta,
          before: delta.before === null ? null : { ...delta.before, updatedAt: 'r-before' },
          after: delta.after === null ? null : { ...delta.after, updatedAt: 'r-after' }
        }
      })
      return { ...unit, changes: { anchoredAt: 'r-anchor', changes } }
    })
    const payload = stack.peek('undo')!.changes as LineagePayload
    const redoPayload = stack.peek('redo')!.changes as LineagePayload
    const delta = payload.changes[0]!
    const redoDelta = redoPayload.changes[0]!
    expect(delta.before?.updatedAt).toBe('r-before')
    expect(delta.after?.updatedAt).toBe('r-after')
    expect(redoDelta.before?.updatedAt).toBe('r-before')
    expect(redoDelta.after?.updatedAt).toBe('r-after')
    expect(delta.before?.createdAt).toBe(unitWith('older', 't1').changes.changes[0]!.before?.createdAt)
    expect(redoDelta.before?.createdAt).toBe(unitWith('selected', 't2').changes.changes[0]!.before?.createdAt)
    expect(payload.anchoredAt).toBe('r-anchor')
    expect(redoPayload.anchoredAt).toBe('r-anchor')
  })

  it('dropTop 只丢弃同方向确认的当前栈顶', () => {
    const stack = stackFor<OpPayload>('reader-op', ['op', 'paper'], 'head')
    stack.push(opUnit('one', 'one'))
    const unit = stack.peek('undo')!
    stack.settle({ ...unit.scope, direction: 'undo', unitId: unit.unitId, unit }, unit, [], 'keepApplied')
    expect(stack.dropTop('redo', 'absent')).toBe(false)
    expect(stack.dropTop('undo', 'one')).toBe(false)
    expect(stack.dropTop('redo', 'one')).toBe(true)
    expect(stack.depth('redo')).toBe(0)
  })

  it('head 的 dropTop 取 future 头，tail 取 future 尾', () => {
    const head = stackFor<OpPayload>('reader-op', ['op', 'paper'], 'head')
    head.push(opUnit('a', 'a'))
    head.push(opUnit('b', 'b'))
    const headFirst = head.peek('undo')!
    head.settle({ ...headFirst.scope, direction: 'undo', unitId: headFirst.unitId, unit: headFirst }, headFirst, [], 'keepApplied')
    const headSecond = head.peek('undo')!
    head.settle({ ...headSecond.scope, direction: 'undo', unitId: headSecond.unitId, unit: headSecond }, headSecond, [], 'keepApplied')
    expect(head.dropTop('redo', 'a')).toBe(true)
    expect(head.peek('redo')?.unitId).toBe('b')
    const tail = stackFor<LineagePayload>('lineage', ['folder', 'main'], 'tail')
    tail.push(lineageUnit('a', 't1'))
    tail.push(lineageUnit('b', 't2'))
    const tailFirst = tail.peek('undo')!
    tail.settle({ ...tailFirst.scope, direction: 'undo', unitId: tailFirst.unitId, unit: tailFirst }, tailFirst, [], 'requireTop')
    const tailSecond = tail.peek('undo')!
    tail.settle({ ...tailSecond.scope, direction: 'undo', unitId: tailSecond.unitId, unit: tailSecond }, tailSecond, [], 'requireTop')
    expect(tail.dropTop('redo', 'a')).toBe(true)
    expect(tail.peek('redo')?.unitId).toBe('b')
  })

  it('读取不移栈；未选中/跨代/异 scope settle 零动作', () => {
    const stack = stackFor<TextPayload>('reader-text', ['note', 'paper'], 'head')
    stack.push(textUnit('one', '', 'one'))
    const before = stack.depth('undo')
    expect(stack.peek('undo')?.unitId).toBe('one')
    expect(stack.depth('undo')).toBe(before)

    const missing = textUnit('absent', '', 'absent')
    expect(stack.settle({ ...stack.scope, direction: 'undo', unitId: missing.unitId, unit: missing }, missing, [], 'skipMissing')).toBe(false)
    expect(stack.depth('undo')).toBe(before)
    const oldGeneration = { ...stack.scope, sessionGeneration: 0 }
    expect(stack.settle({ ...oldGeneration, direction: 'undo', unitId: 'one', unit: { ...stack.peek('undo')!, scope: oldGeneration } }, stack.peek('undo')!, [], 'requireTop')).toBe(false)
    const foreign = { ...stack.scope, domain: 'lineage' as const }
    expect(stack.settle({ ...foreign, direction: 'undo', unitId: 'one', unit: stack.peek('undo')! }, stack.peek('undo')!, [], 'requireTop')).toBe(false)
    expect(stack.depth('undo')).toBe(before)
  })

  it('直接 mutation 只在实际变化时通知一次', () => {
    const stack = stackFor<OpPayload>('reader-op', ['op', 'paper'], 'head')
    const listener = vi.fn()
    stack.subscribe(listener)
    stack.clearRedo()
    stack.removeWhere(() => false)
    stack.updateLatestPast({ unitId: 'absent' }, (unit) => unit)
    expect(listener).not.toHaveBeenCalled()

    const pushed = stack.push(opUnit('one', 'one'))
    stack.updateLatestPast({ unitId: 'one' }, (unit) => unit)
    expect(listener).toHaveBeenCalledTimes(1)
    stack.clearRedo()
    expect(listener).toHaveBeenCalledTimes(1)
    stack.removeWhere((unit) => unit.unitId === pushed.unitId)
    expect(listener).toHaveBeenCalledTimes(2)
    expect(stack.depth('undo')).toBe(0)
  })

  it('settle 的 rewrite/apply 组合通知抑制，只在实际结算后发布一次', () => {
    const stack = stackFor<LineagePayload>('lineage', ['folder', 'main'], 'tail')
    stack.push(lineageUnit('one', 't1'))
    const selected = stack.peek('undo')!
    const order: string[] = []
    const listener = vi.fn(() => order.push('subscribe'))
    stack.subscribe(listener)
    stack.settle(
      { ...selected.scope, direction: 'undo', unitId: selected.unitId, unit: selected },
      selected,
      [],
      'requireTop',
      () => {
        order.push('rewrite')
        stack.rewriteBoth((unit) => ({
          ...unit,
          changes: { ...unit.changes, anchoredAt: `${unit.changes.anchoredAt}-r` }
        }))
        order.push('apply')
      }
    )
    expect(order).toEqual(['rewrite', 'apply', 'subscribe'])
    expect(listener).toHaveBeenCalledTimes(1)
    expect(stack.settle(
      { ...stack.scope, direction: 'undo', unitId: 'missing', unit: { ...lineageUnit('missing', 't0'), unitId: 'missing' } },
      stack.peek('redo')!,
      [],
      'requireTop'
    )).toBe(false)
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('settle 移栈后先标脏，rewrite 缺失或恒等改写也发布恰一次', () => {
    for (const direction of ['undo', 'redo'] as const) {
      const stack = stackFor<OpPayload>('reader-op', ['op', 'paper'], 'head')
      if (direction === 'undo') {
        stack.push(opUnit('one', 'one'))
        stack.push(opUnit('two', 'two'))
      } else {
        stack.push(opUnit('one', 'one'))
        const first = stack.peek('undo')!
        stack.settle({ ...first.scope, direction: 'undo', unitId: first.unitId, unit: first }, first, [], 'keepApplied')
      }
      const listener = vi.fn()
      stack.subscribe(listener)
      const target = stack.peek(direction)!
      expect(stack.settle(
        { ...target.scope, direction, unitId: target.unitId, unit: target },
        target,
        [],
        'keepApplied',
        () => undefined
      )).toBe(true)
      expect(listener).toHaveBeenCalledTimes(1)
    }

    const identity = stackFor<OpPayload>('reader-op', ['op', 'paper'], 'head')
    identity.push(opUnit('one', 'one'))
    const identitySelected = identity.peek('undo')!
    identity.settle(
      { ...identitySelected.scope, direction: 'undo', unitId: identitySelected.unitId, unit: identitySelected },
      identitySelected,
      [],
      'keepApplied'
    )
    const identityListener = vi.fn()
    identity.subscribe(identityListener)
    const identityTarget = identity.peek('redo')!
    expect(identity.settle(
      { ...identityTarget.scope, direction: 'redo', unitId: identityTarget.unitId, unit: identityTarget },
      identityTarget,
      [],
      'keepApplied',
      () => identity.rewriteBoth((unit) => unit)
    )).toBe(true)
    expect(identityListener).toHaveBeenCalledTimes(1)
  })

  it('深度截断保留身份：keepApplied 写 redo，skipMissing 无移栈', () => {
    const keep = stackFor<OpPayload>('reader-op', ['op', 'paper'], 'head')
    keep.push(opUnit('selected', 'selected'))
    const opSelected = keep.peek('undo')!
    for (let i = 1; i <= HISTORY_DEPTH_MAX; i++) keep.push(opUnit(`op-${i}`, String(i)))
    let keepPublished = 0
    expect(keep.settle({ ...opSelected.scope, direction: 'undo', unitId: opSelected.unitId, unit: opSelected }, opSelected, [], 'keepApplied', () => { keepPublished += 1 })).toBe(true)
    expect(keepPublished).toBe(1)
    expect(keep.depth('undo')).toBe(HISTORY_DEPTH_MAX)
    expect(keep.peek('redo')?.unitId).toBe('selected')

    const skip = stackFor<TextPayload>('reader-text', ['note', 'paper'], 'head')
    skip.push(textUnit('selected', '', 'selected'))
    const textSelected = skip.peek('undo')!
    for (let i = 1; i <= HISTORY_DEPTH_MAX; i++) skip.push(textUnit(`text-${i}`, String(i - 1), String(i)))
    const listener = vi.fn()
    skip.subscribe(listener)
    let skipPublished = 0
    expect(skip.settle({ ...textSelected.scope, direction: 'undo', unitId: textSelected.unitId, unit: textSelected }, textSelected, [], 'skipMissing', () => { skipPublished += 1 })).toBe(true)
    expect(skipPublished).toBe(1)
    expect(listener).not.toHaveBeenCalled()
    expect(skip.depth('undo')).toBe(HISTORY_DEPTH_MAX)
    expect(skip.depth('redo')).toBe(0)
  })

  it('同 unitId 异对象立即拒绝，pending 也不能获得合法缺席', () => {
    const rewritten = stackFor<OpPayload>('reader-op', ['op', 'paper'], 'head')
    rewritten.push(opUnit('same', 'one'))
    const replaced = rewritten.peek('undo')!
    rewritten.settle({ ...replaced.scope, direction: 'undo', unitId: replaced.unitId, unit: replaced }, replaced, [], 'keepApplied')
    rewritten.rewriteBoth((unit) => ({ ...unit, changes: unit.changes.kind === 'comment-edit' ? { ...unit.changes, after: annotation('same', 'mapped') } : unit.changes }))
    const listener = vi.fn()
    rewritten.subscribe(listener)
    expect(rewritten.settle({ ...replaced.scope, direction: 'redo', unitId: replaced.unitId, unit: replaced }, replaced, [], 'keepApplied')).toBe(false)
    expect(listener).not.toHaveBeenCalled()
    expect(rewritten.depth('redo')).toBe(1)

    const cloneStack = stackFor<TextPayload>('reader-text', ['note', 'paper'], 'head')
    cloneStack.push(textUnit('same', '', 'one'))
    const selected = cloneStack.peek('undo')!
    const clone = textUnit('same', '', 'one')
    const pending = textUnit('pending', 'one', 'in-flight')
    expect(cloneStack.settle({ ...selected.scope, direction: 'undo', unitId: selected.unitId, unit: clone }, selected, [pending], 'skipMissing')).toBe(false)
    expect(cloneStack.depth('undo')).toBe(1)
    expect(cloneStack.depth('redo')).toBe(0)
  })
})
