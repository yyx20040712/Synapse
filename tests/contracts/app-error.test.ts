import { describe, expect, it } from 'vitest'
import {
  err,
  isOk,
  NotImplementedError,
  ok,
  toAppError,
  unimplementedObject
} from '../../src/shared/app-error'

describe('shared/app-error —— 错误模型', () => {
  it('ok/err 形状正确，isOk 窄化', () => {
    const good = ok(42)
    expect(isOk(good) && good.data).toBe(42)
    const bad = err('NOT_FOUND', '找不到文献')
    expect(!bad.ok && bad.error.code).toBe('NOT_FOUND')
    expect(!bad.ok && bad.error.message).toBe('找不到文献')
  })

  it('toAppError：NotImplementedError → NOT_IMPLEMENTED + 工单号', () => {
    const e = toAppError(new NotImplementedError('SR-DB-01', 'papers.repo'))
    expect(e.code).toBe('NOT_IMPLEMENTED')
    expect(e.detail).toContain('SR-DB-01')
  })

  it('toAppError：普通 Error → INTERNAL，detail 留诊断信息', () => {
    const e = toAppError(new Error('disk full'))
    expect(e.code).toBe('INTERNAL')
    expect(e.detail).toBe('disk full')
  })

  it('unimplementedObject：访问任意方法抛带工单号的 NotImplementedError', () => {
    interface Dummy {
      hello(name: string): string
    }
    const dummy = unimplementedObject<Dummy>('SR-X-00', 'dummy')
    expect(() => dummy.hello('a')).toThrow(NotImplementedError)
    try {
      dummy.hello('a')
    } catch (e) {
      expect((e as NotImplementedError).ticket).toBe('SR-X-00')
      expect((e as Error).message).toContain('dummy.hello')
    }
  })
})
