import { describe, expect, it, vi } from 'vitest'
import {
  DELIVERED_UNDO_ROLLOUT,
  parseUndoRollout,
  resolveStartupUndoRollout
} from '../../../src/shared/undo-rollout'

describe('undo rollout 启动档', () => {
  it('缺省与合法 off 返回稳定档；本版交付上限为 off', () => {
    expect(parseUndoRollout(undefined)).toEqual({ rollout: 'off', diagnostic: null })
    expect(parseUndoRollout('off')).toEqual({ rollout: 'off', diagnostic: null })
    expect(DELIVERED_UNDO_ROLLOUT).toBe('off')
  })

  it('非法值回退 off 并给出诊断', () => {
    expect(parseUndoRollout('sometimes')).toEqual({
      rollout: 'off',
      diagnostic: 'SYNAPSE_UNDO_ROLLOUT 非法，回退 off'
    })
    expect(parseUndoRollout('OFF')).toEqual({
      rollout: 'off',
      diagnostic: 'SYNAPSE_UNDO_ROLLOUT 非法，回退 off'
    })
  })

  it('有序档位解析，超出本版上限回退 off 并诊断', () => {
    expect(parseUndoRollout('reader', 'reader')).toEqual({ rollout: 'reader', diagnostic: null })
    expect(parseUndoRollout('lineage', 'lineage')).toEqual({ rollout: 'lineage', diagnostic: null })
    expect(parseUndoRollout('reader', 'off')).toEqual({
      rollout: 'off',
      diagnostic: 'SYNAPSE_UNDO_ROLLOUT=reader 超出本版上限 off，回退 off'
    })
    expect(parseUndoRollout('library-basic', 'all')).toEqual({
      rollout: 'library-basic',
      diagnostic: null
    })
  })

  it('renderer 从 query 读取同一解析器，重复读取结果稳定', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    expect(resolveStartupUndoRollout('?theme=sepia&undoRollout=off')).toEqual({ rollout: 'off', diagnostic: null })
    expect(resolveStartupUndoRollout('?undoRollout=reader')).toEqual({
      rollout: 'off',
      diagnostic: 'SYNAPSE_UNDO_ROLLOUT=reader 超出本版上限 off，回退 off'
    })
    expect(resolveStartupUndoRollout('?undoRollout=reader')).toEqual(resolveStartupUndoRollout('?undoRollout=reader'))
    expect(spy).toHaveBeenCalledTimes(0)
    spy.mockRestore()
  })
})
