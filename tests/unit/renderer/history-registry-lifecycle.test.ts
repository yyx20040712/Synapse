import { describe, expect, it, vi } from 'vitest'
import { createHistoryRegistry } from '../../../src/renderer/shared/history/history-registry'
import type { HistoryScope, HistoryUnit } from '../../../src/renderer/shared/history/history-types'

const scope = (generation: number): HistoryScope => ({
  workspaceId: 'workspace',
  domain: 'reader-op',
  scopeId: ['op', 'paper'],
  sessionGeneration: generation
})
const foreignScope: HistoryScope = { ...scope(1), domain: 'reader-text', scopeId: ['note', 'paper'] }
const unit: HistoryUnit<{ value: string }> = {
  unitId: 'one',
  scope: scope(1),
  command: 'comment-edit',
  changes: { value: 'one' }
}

describe('HistoryRegistry lifecycle', () => {
  it('读取不创建 scope；open 复用同代际，lookup/admit 精确匹配', () => {
    const registry = createHistoryRegistry()
    expect(registry.lookup<{ value: string }>(scope(1))).toBeUndefined()
    const first = registry.open<{ value: string }>(scope(1), { redoOrder: 'head' })
    first.push(unit)
    expect(registry.lookup<{ value: string }>(scope(1))).toBe(first)
    expect(registry.lookup(scope(2))).toBeUndefined()
    expect(registry.lookup(foreignScope)).toBeUndefined()
    expect(registry.admit(scope(1))).toBe(true)
    expect(registry.admit(scope(2))).toBe(false)
    expect(registry.admit(foreignScope)).toBe(false)
  })

  it('dispose 后 open 新代际；旧回执不能结算新 scope', () => {
    const registry = createHistoryRegistry()
    const old = registry.open<{ value: string }>(scope(1), { redoOrder: 'head' })
    old.push(unit)
    const oldUnit = old.peek('undo')!
    registry.dispose(scope(1))
    expect(registry.admit(scope(1))).toBe(false)
    const next = registry.open<{ value: string }>(scope(2), { redoOrder: 'head' })
    expect(registry.lookup(scope(2))).toBe(next)
    expect(next.depth('undo')).toBe(0)
    expect(next.settle({ ...scope(1), direction: 'undo', unitId: oldUnit.unitId, unit: oldUnit }, oldUnit, [], 'keepApplied')).toBe(false)
    expect(next.depth('undo')).toBe(0)
  })

  it('关闭不遗忘已用 generation；同代和旧代重开拒绝', () => {
    const registry = createHistoryRegistry()
    registry.open<{ value: string }>(scope(1), { redoOrder: 'head' })
    registry.dispose(scope(1))
    expect(() => registry.open<{ value: string }>(scope(1), { redoOrder: 'head' })).toThrow('同键历史 generation 已用过，重开必须换代')
    registry.open<{ value: string }>(scope(2), { redoOrder: 'head' })
    registry.dispose(scope(2))
    expect(() => registry.open<{ value: string }>(scope(1), { redoOrder: 'head' })).toThrow('同键历史 generation 已用过，重开必须换代')
    expect(registry.lookup(scope(1))).toBeUndefined()
    expect(registry.lookup(scope(2))).toBeUndefined()
  })

  it('open 同 active scope 不改变 redoOrder；reset 后可复用 generation', () => {
    const registry = createHistoryRegistry()
    const stack = registry.open<{ value: string }>(scope(1), { redoOrder: 'head' })
    expect(registry.open<{ value: string }>(scope(1), { redoOrder: 'tail' })).toBe(stack)
    expect(stack.redoOrder).toBe('head')
    registry.reset('workspace')
    const reused = registry.open<{ value: string }>(scope(1), { redoOrder: 'head' })
    expect(reused).not.toBe(stack)
  })

  it('generation 记录按 workspace/domain/scopeId 隔离', () => {
    const registry = createHistoryRegistry()
    registry.open<{ value: string }>(scope(1), { redoOrder: 'head' })
    registry.open<{ value: string }>(foreignScope, { redoOrder: 'head' })
    registry.dispose(scope(1))
    expect(() => registry.open<{ value: string }>(scope(1), { redoOrder: 'head' })).toThrow('同键历史 generation 已用过，重开必须换代')
    expect(registry.open<{ value: string }>(foreignScope, { redoOrder: 'head' })).toBeDefined()
  })

  it('dispose 只移除精确 scope；reset 清整个 workspace', () => {
    const registry = createHistoryRegistry()
    registry.open(scope(1), { redoOrder: 'head' })
    const foreign = registry.open(foreignScope, { redoOrder: 'head' })
    registry.dispose(scope(1))
    expect(registry.lookup(scope(1))).toBeUndefined()
    expect(registry.lookup(foreignScope)).toBe(foreign)
    registry.reset('workspace')
    expect(registry.lookup(foreignScope)).toBeUndefined()
  })

  it('订阅按 scope 隔离，结算后通知；退订后不再通知', () => {
    const registry = createHistoryRegistry()
    const target = registry.open<{ value: string }>(scope(1), { redoOrder: 'head' })
    registry.open<{ value: string }>(foreignScope, { redoOrder: 'head' })
    const targetListener = vi.fn()
    const foreignListener = vi.fn()
    const pushed = target.push({ ...unit, scope: scope(1) })
    // 扣掉 push 通知：本例只锁定 settle 的脏标记发布。
    const unsubscribe = registry.subscribe(scope(1), targetListener)
    registry.subscribe(foreignScope, foreignListener)
    target.settle({ ...scope(1), direction: 'undo', unitId: pushed.unitId, unit: pushed }, pushed, [], 'keepApplied')
    expect(targetListener).toHaveBeenCalledTimes(1)
    expect(foreignListener).not.toHaveBeenCalled()
    unsubscribe()
    target.settle({ ...scope(1), direction: 'redo', unitId: pushed.unitId, unit: pushed }, pushed, [], 'keepApplied')
    expect(targetListener).toHaveBeenCalledTimes(1)
  })

  it('dispose 先失活旧句柄；旧句柄读写不穿透新代栈', () => {
    const registry = createHistoryRegistry()
    const old = registry.open<{ value: string }>(scope(1), { redoOrder: 'head' })
    const stored = old.push({ ...unit, scope: scope(1) })
    const listener = vi.fn()
    old.subscribe(listener)
    registry.dispose(scope(1))

    expect(old.depth('undo')).toBe(0)
    expect(old.peek('undo')).toBeNull()
    expect(() => old.push(stored)).toThrow('历史句柄已失活')
    expect(listener).not.toHaveBeenCalled()

    const next = registry.open<{ value: string }>(scope(2), { redoOrder: 'head' })
    const nextUnit = { ...unit, scope: scope(2), unitId: 'next' }
    next.push(nextUnit)
    expect(() => old.settle(
      { ...scope(1), direction: 'undo', unitId: stored.unitId, unit: stored },
      stored,
      [],
      'keepApplied'
    )).toThrow('历史句柄已失活')
    expect(next.depth('undo')).toBe(1)
    expect(next.peek('undo')?.unitId).toBe('next')
  })

  it('reset 先失活全部旧句柄；open 冻结并捕获 scope', () => {
    const registry = createHistoryRegistry()
    const mutableScope: HistoryScope = {
      workspaceId: 'workspace',
      domain: 'reader-op',
      scopeId: ['op', 'paper'],
      sessionGeneration: 1
    }
    const stack = registry.open<{ value: string }>(mutableScope, { redoOrder: 'head' })
    const stored = stack.push({ ...unit, scope: scope(1) })
    expect(() => {
      ;(stack.scope as { sessionGeneration: number }).sessionGeneration = 9
    }).toThrow()
    expect(() => {
      ;(stack.scope.scopeId as unknown as string[])[0] = 'hacked'
    }).toThrow()
    expect(registry.lookup<{ value: string }>(scope(1))).toBe(stack)

    const listener = vi.fn()
    stack.subscribe(listener)
    registry.reset('workspace')
    expect(stack.depth('undo')).toBe(0)
    expect(() => stack.push(stored)).toThrow('历史句柄已失活')
    expect(listener).not.toHaveBeenCalled()
    expect(registry.lookup(scope(1))).toBeUndefined()
  })
})
