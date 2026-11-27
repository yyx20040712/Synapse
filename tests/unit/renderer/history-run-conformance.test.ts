import { describe, expect, it, vi } from 'vitest'
import { HISTORY_DEPTH_MAX } from '../../../src/shared/constants'
import { createHistoryRegistry } from '../../../src/renderer/shared/history/history-registry'
import { makeRunHistory } from '../../../src/renderer/shared/history/run-history'
import type {
  HistoryOutcome,
  HistoryRunPort,
  HistoryScope,
  HistorySettlement,
  HistoryUnit
} from '../../../src/renderer/shared/history/history-types'
import type {
  HistoryCommandState,
  SaveCommandState,
  UndoCommandState
} from '../../../src/renderer/shared/history-command'

const scope = (generation: number): HistoryScope => ({
  workspaceId: 'workspace',
  domain: 'reader-op',
  scopeId: ['op', 'paper'],
  sessionGeneration: generation
})
type Payload = { value: string }
const unit = (id: string, value: string): HistoryUnit<Payload> => ({
  unitId: id,
  scope: scope(1),
  command: 'comment-edit',
  changes: { value }
})

function port(overrides: Partial<HistoryRunPort<Payload, string>> = {}): HistoryRunPort<Payload, string> {
  return {
    admitCommand: () => true,
    inLane: async (task) => task(),
    selectAt: 'beforePrepare',
    prepare: async () => ({ status: 'applied', echo: undefined }),
    execute: async (selected) => ({ status: 'applied', echo: selected.changes.value }),
    apply: () => undefined,
    settlement: (selected) => ({ opposite: selected, pending: [], missingPolicy: 'keepApplied' }),
    ...overrides
  }
}

describe('runHistory 直接时序 conformance', () => {
  it('conflict.domainReason 是领域开放字符串，四种 HISTORY_* 只是现行映射', () => {
    const domainConflict: HistoryOutcome<string> = {
      status: 'conflict',
      reason: 'invalid',
      domainReason: 'LINEAGE_GRAPH_RULE_V2',
      message: '领域规则拒绝'
    }
    expect(domainConflict.status).toBe('conflict')
    expect(domainConflict.domainReason).toBe('LINEAGE_GRAPH_RULE_V2')
    const legacyConflict: HistoryOutcome<string> = {
      status: 'conflict',
      reason: 'stale',
      domainReason: 'HISTORY_STALE',
      message: '现行映射'
    }
    expect(legacyConflict.domainReason).toBe('HISTORY_STALE')
  })

  it('UndoCommandState 与 SaveCommandState 可独立消费，旧 HistoryCommandState 兼容', () => {
    const undo: UndoCommandState = { canUndo: true, canRedo: false, busy: false }
    const save: SaveCommandState = { saveState: 'dirty', canSave: true }
    const compatible: HistoryCommandState = { ...save, ...undo }
    expect(compatible).toEqual({ canUndo: true, canRedo: false, busy: false, saveState: 'dirty', canSave: true })
  })

  it('beforePrepare 先选顶再 prepare；prepare 失败不 execute 不移栈', async () => {
    const registry = createHistoryRegistry()
    const stack = registry.open<Payload>(scope(1), { redoOrder: 'head' })
    stack.push(unit('one', 'one'))
    const order: string[] = []
    const runHistory = makeRunHistory(registry)
    const outcome = await runHistory(scope(1), 'undo', {
      ...port({
        prepare: async () => {
          order.push('prepare')
          return { status: 'failed', reason: 'io', message: 'prepare failed' }
        },
        execute: async () => {
          order.push('execute')
          return { status: 'failed', reason: 'io', message: 'must not execute' }
        }
      }),
      selectAt: 'beforePrepare'
    })
    expect(outcome.status).toBe('failed')
    expect(order).toEqual(['prepare'])
    expect(stack.depth('undo')).toBe(1)
    expect(stack.depth('redo')).toBe(0)
  })

  it('afterPrepare 在 prepare 后选顶；成功序=settle 改写 apply 订阅', async () => {
    const registry = createHistoryRegistry()
    const stack = registry.open<Payload>(scope(1), { redoOrder: 'head' })
    const order: string[] = []
    registry.subscribe(scope(1), () => order.push('subscribe'))
    stack.push(unit('old', 'old'))
    const runHistory = makeRunHistory(registry)
    const outcome = await runHistory(scope(1), 'undo', {
      ...port({
        prepare: async () => {
          order.push('prepare')
          stack.push(unit('new', 'new'))
          order.length = 0
          return { status: 'applied', echo: undefined }
        },
        execute: async (selected) => {
          order.push(`execute:${selected.unitId}`)
          return { status: 'applied', echo: selected.changes.value }
        },
        rewrite: (selected) => {
          order.push(`rewrite:${selected.unitId}`)
        stack.rewriteBoth((unit) => ({ ...unit, changes: { value: `${unit.changes.value}-remapped` } }))
        },
        apply: (selected) => order.push(`apply:${selected.unitId}`)
      }),
      selectAt: 'afterPrepare'
    })
    expect(outcome).toEqual({ status: 'applied', echo: 'new' })
    expect(order).toEqual(['execute:new', 'rewrite:new', 'apply:new', 'subscribe'])
    expect(stack.depth('undo')).toBe(1)
    expect(stack.depth('redo')).toBe(1)
  })

  it('execute 的 noop/blocked/conflict 不 apply 不移栈；noop 无新历史边界', async () => {
    const outcomes: HistoryOutcome<string>[] = [
      { status: 'noop', reason: 'unchanged' },
      { status: 'blocked', reason: 'busy' },
      { status: 'conflict', reason: 'stale', domainReason: 'HISTORY_STALE' as string, message: 'stale' }
    ]
    for (const executeOutcome of outcomes) {
      const registry = createHistoryRegistry()
      const stack = registry.open<Payload>(scope(1), { redoOrder: 'head' })
      stack.push(unit('one', 'one'))
      const apply = vi.fn()
      const runHistory = makeRunHistory(registry)
    const outcome = await runHistory(scope(1), 'undo', port({ execute: async () => executeOutcome, apply }))
      expect(outcome).toEqual(executeOutcome)
      expect(apply).not.toHaveBeenCalled()
      expect(stack.depth('undo')).toBe(1)
      expect(stack.depth('redo')).toBe(0)
    }
  })

  it('admitCommand 拒绝形成未派发 superseded，零栈移动', async () => {
    const registry = createHistoryRegistry()
    const stack = registry.open<Payload>(scope(1), { redoOrder: 'head' })
    stack.push(unit('one', 'one'))
    const runHistory = makeRunHistory(registry)
    const outcome = await runHistory(scope(1), 'undo', port({ admitCommand: () => false }))
    expect(outcome).toEqual({ status: 'superseded', dispatched: false })
    expect(stack.depth('undo')).toBe(1)
    expect(stack.depth('redo')).toBe(0)
  })

  it('已派发迟到回执不结算新代际，返回 dispatched superseded', async () => {
    const registry = createHistoryRegistry()
    const old = registry.open<Payload>(scope(1), { redoOrder: 'head' })
    old.push(unit('one', 'one'))
    let finish!: () => void
    const runHistory = makeRunHistory(registry)
    const outcomePromise = runHistory(scope(1), 'undo', {
      ...port({
        inLane: async (task) => {
          const result = task()
          await new Promise<void>((resolve) => { finish = resolve })
          return result
        }
      })
    })
    await Promise.resolve()
    registry.dispose(scope(1))
    const next = registry.open<Payload>(scope(2), { redoOrder: 'head' })
    next.push({ ...unit('fresh', 'fresh'), scope: scope(2) })
    finish()
    await expect(outcomePromise).resolves.toEqual({ status: 'superseded', dispatched: true })
    expect(next.depth('undo')).toBe(1)
    expect(next.depth('redo')).toBe(0)
  })

  it('lane 等待期间旧 scope 失效：获得 lane 后不再检查旧栈或派发旧命令', async () => {
    const registry = createHistoryRegistry()
    registry.open<Payload>(scope(1), { redoOrder: 'head' }).push(unit('one', 'one'))
    let release!: () => void
    const execute = vi.fn(async (selected: HistoryUnit<Payload>) => ({ status: 'applied' as const, echo: selected.changes.value }))
    const runHistory = makeRunHistory(registry)
    const promise = runHistory(scope(1), 'undo', port({
      inLane: async (task) => {
        await new Promise<void>((resolve) => { release = resolve })
        const result = task()
        return result
      },
      execute
    }))
    await Promise.resolve()
    registry.dispose(scope(1))
    registry.open<Payload>(scope(2), { redoOrder: 'head' })
    release()
    await expect(promise).resolves.toEqual({ status: 'superseded', dispatched: false })
    expect(execute).not.toHaveBeenCalled()
    expect(registry.lookup<Payload>(scope(2))!.depth('undo')).toBe(0)
  })

  it('prepare 等待期间失效：prepare 后不 execute 不派发不写新栈', async () => {
    const registry = createHistoryRegistry()
    const stack = registry.open<Payload>(scope(1), { redoOrder: 'head' })
    stack.push(unit('one', 'one'))
    let release!: () => void
    const execute = vi.fn(async (selected: HistoryUnit<Payload>) => ({ status: 'applied' as const, echo: selected.changes.value }))
    const runHistory = makeRunHistory(registry)
    const promise = runHistory(scope(1), 'undo', port({
      prepare: () => new Promise<HistoryOutcome<void>>((resolve) => { release = () => resolve({ status: 'applied', echo: undefined }) }),
      execute
    }))
    await Promise.resolve()
    registry.dispose(scope(1))
    const next = registry.open<Payload>(scope(2), { redoOrder: 'head' })
    release()
    await expect(promise).resolves.toEqual({ status: 'superseded', dispatched: false })
    expect(execute).not.toHaveBeenCalled()
    expect(next.depth('undo')).toBe(0)
    expect(stack.depth('undo')).toBe(0)
  })

  it('prepare 返回后与 execute 前都双重准入；失效不 execute 且 dispatched=false', async () => {
    const registry = createHistoryRegistry()
    const stack = registry.open<Payload>(scope(1), { redoOrder: 'head' })
    stack.push(unit('one', 'one'))
    let checks = 0
    const execute = vi.fn(async (selected: HistoryUnit<Payload>) => ({ status: 'applied' as const, echo: selected.changes.value }))
    const runHistory = makeRunHistory(registry)
    const promise = runHistory(scope(1), 'undo', port({
      admitCommand: () => {
        checks += 1
        return true
      },
      prepare: async () => {
        registry.dispose(scope(1))
        registry.open<Payload>(scope(2), { redoOrder: 'head' })
        return { status: 'applied', echo: undefined }
      },
      execute
    }))
    await expect(promise).resolves.toEqual({ status: 'superseded', dispatched: false })
    expect(checks).toBe(3)
    expect(execute).not.toHaveBeenCalled()
    expect(stack.depth('undo')).toBe(0)
  })

  it('execute 已派发后失效：返回 dispatched=true 且不结算新代际', async () => {
    const registry = createHistoryRegistry()
    const stack = registry.open<Payload>(scope(1), { redoOrder: 'head' })
    stack.push(unit('one', 'one'))
    let release!: () => void
    const runHistory = makeRunHistory(registry)
    const promise = runHistory(scope(1), 'undo', port({
      execute: () => new Promise<HistoryOutcome<string>>((resolve) => { release = () => resolve({ status: 'applied', echo: 'one' }) })
    }))
    await Promise.resolve()
    registry.dispose(scope(1))
    const next = registry.open<Payload>(scope(2), { redoOrder: 'head' })
    release()
    await expect(promise).resolves.toEqual({ status: 'superseded', dispatched: true })
    expect(next.depth('undo')).toBe(0)
    expect(next.depth('redo')).toBe(0)
  })

  it('settlement 提供领域 opposite/pending/missingPolicy；skipMissing 截断不 redo 仍入 pending', async () => {
    const registry = createHistoryRegistry()
    const stack = registry.open<Payload>(scope(1), { redoOrder: 'head' })
    stack.push(unit('old', 'old'))
    stack.push(unit('selected', 'selected'))
    const selected = stack.peek('undo')!
    stack.settle({ ...selected.scope, direction: 'undo', unitId: selected.unitId, unit: selected }, selected, [], 'keepApplied')
    // selected 已在 redo 头；构造等待窗内截断：redo settle 后 pending 是新正向编辑。
    const pending = unit('pending', 'database')
    const opposite = unit('opposite', 'opposite')
    let received: HistorySettlement<Payload> | null = null
    const apply = vi.fn()
    const runHistory = makeRunHistory(registry)
    await expect(runHistory(scope(1), 'redo', port({
      execute: async () => ({ status: 'applied', echo: 'selected' }),
      settlement: (unitArg, direction, outcome) => {
        expect(unitArg.unitId).toBe('selected')
        expect(direction).toBe('redo')
        expect(outcome).toEqual({ status: 'applied', echo: 'selected' })
        received = { opposite, pending: [pending], missingPolicy: 'skipMissing' }
        return received
      },
      apply
    }))).resolves.toEqual({ status: 'applied', echo: 'selected' })
    expect(received).not.toBeNull()
    expect(apply).toHaveBeenCalledTimes(1)
    expect(stack.depth('undo')).toBe(3)
    expect(stack.peek('undo')?.unitId).toBe('pending')
    expect(stack.depth('redo')).toBe(0)
  })

  it('execute 内连续 push 截断后，keepApplied 写 redo、skipMissing 无移栈', async () => {
    for (const missingPolicy of ['skipMissing', 'keepApplied'] as const) {
      const registry = createHistoryRegistry()
      const stack = registry.open<Payload>(scope(1), { redoOrder: 'head' })
      stack.push(unit('selected', 'selected'))
      const selected = stack.peek('undo')!
      const apply = vi.fn()
      const runHistory = makeRunHistory(registry)
      await expect(runHistory(scope(1), 'undo', port({
        execute: async () => {
          for (let i = 1; i <= HISTORY_DEPTH_MAX; i++) stack.push(unit(`truncated-${i}`, String(i)))
          return { status: 'applied', echo: 'selected' }
        },
        settlement: () => ({ opposite: selected, pending: [], missingPolicy }),
        apply
      }))).resolves.toEqual({ status: 'applied', echo: 'selected' })
      expect(apply).toHaveBeenCalledTimes(1)
      expect(stack.depth('undo')).toBe(HISTORY_DEPTH_MAX)
      expect(stack.depth('redo')).toBe(missingPolicy === 'keepApplied' ? 1 : 0)
    }
  })

  it('成功路径先结算 mutation，再 rewriteBoth，再 apply，订阅恰一次', async () => {
    const registry = createHistoryRegistry()
    const stack = registry.open<Payload>(scope(1), { redoOrder: 'head' })
    stack.push(unit('one', 'one'))
    const order: string[] = []
    registry.subscribe(scope(1), () => order.push('subscribe'))
    const runHistory = makeRunHistory(registry)
    await expect(runHistory(scope(1), 'undo', port({
      rewrite: () => {
        order.push('rewrite')
        stack.rewriteBoth((unit) => ({ ...unit, changes: { value: `${unit.changes.value}-remapped` } }))
      },
      apply: () => order.push('apply')
    }))).resolves.toEqual({ status: 'applied', echo: 'one' })
    expect(order).toEqual(['rewrite', 'apply', 'subscribe'])
    expect(stack.depth('undo')).toBe(0)
    expect(stack.depth('redo')).toBe(1)
  })
})
