import { describe, expect, it } from 'vitest'
import { err, ok, toAppError } from '../../src/shared/app-error'
import { DomainError } from '../../src/main/services/shared/domain-error'

/**
 * [F-VISFB-65 单元二] AppError.reason 结构化拒因透传契约（设计书 §7/W-12：
 * Result 信封=结构化数据序列化，reason 随 error 对象走不丢——非异常通道）。
 * 与 app-error.test/app-error-closure 互补：本件 pin reason 键纪律（在场=串、
 * 缺席=键不存在）。always-active。
 */
describe('contracts/app-error-reason —— 结构化拒因通道（GHOST_FOLDER 首值）', () => {
  it('toAppError：域错误携 reason（串）→透传；无 reason→键不存在；非串 reason→丢弃', () => {
    const withReason = toAppError(Object.assign(new Error('目标文件夹不存在'), { code: 'CONFLICT', reason: 'GHOST_FOLDER' }))
    expect(withReason.code).toBe('CONFLICT')
    expect(withReason.reason).toBe('GHOST_FOLDER')

    const noReason = toAppError(Object.assign(new Error('唯一性冲突'), { code: 'CONFLICT' }))
    expect('reason' in noReason).toBe(false) // 键缺席非 undefined 值位（err() 两形同纪律）

    const bogusReason = toAppError(Object.assign(new Error('m'), { code: 'CONFLICT', reason: 42 }))
    expect('reason' in bogusReason).toBe(false) // 非串拒透传（防任意注入——code 同族防线）
  })

  it('DomainError 第三参 reason：main 侧域错误载体→toAppError 保留', () => {
    const e = new DomainError('CONFLICT', '目标文件夹不存在：f1', 'GHOST_FOLDER')
    const folded = toAppError(e)
    expect(folded.code).toBe('CONFLICT')
    expect(folded.message).toContain('f1')
    expect(folded.reason).toBe('GHOST_FOLDER')

    const plain = toAppError(new DomainError('CONFLICT', '唯一性冲突'))
    expect('reason' in plain).toBe(false)
  })

  it('Result 信封序列化形状：error 携 reason 平面透传（结构化数据——IPC 无损前提）', () => {
    const enveloped = err('NOT_FOUND', '找不到文献')
    expect(JSON.parse(JSON.stringify(enveloped))).toEqual({
      ok: false,
      error: { code: 'NOT_FOUND', message: '找不到文献' }
    })
    const withReason = { ok: false as const, error: { code: 'CONFLICT' as const, message: 'm', reason: 'GHOST_FOLDER' } }
    expect(JSON.parse(JSON.stringify(withReason))).toEqual(withReason)
    expect(ok(1)).toEqual({ ok: true, data: 1 })
  })
})
