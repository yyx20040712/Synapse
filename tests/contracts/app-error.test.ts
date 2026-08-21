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
    const e = toAppError(new NotImplementedError('SAMPLE-1', 'papers.repo'))
    expect(e.code).toBe('NOT_IMPLEMENTED')
    expect(e.detail).toContain('SAMPLE-1')
  })

  it('toAppError：普通 Error → INTERNAL，detail 留诊断信息', () => {
    const e = toAppError(new Error('disk full'))
    expect(e.code).toBe('INTERNAL')
    expect(e.detail).toBe('disk full')
  })

  it('toAppError：带合法 code 的域错误（FileStoreError/HttpFetchError 形状）保留 code', () => {
    const domain = Object.assign(new Error('读取源文件失败：xx.pdf'), { code: 'IO_ERROR' })
    const e = toAppError(domain)
    expect(e.code).toBe('IO_ERROR')
    expect(e.message).toContain('xx.pdf')

    const http = Object.assign(new Error('上游暂不可用'), { code: 'RATE_LIMITED' })
    expect(toAppError(http).code).toBe('RATE_LIMITED')

    // 非法 code 字符串不透传（防任意枚举注入），回落 INTERNAL
    const bogus = Object.assign(new Error('weird'), { code: 'TOTALLY_FAKE' })
    expect(toAppError(bogus).code).toBe('INTERNAL')
  })

  it('unimplementedObject：访问任意方法抛带工单号的 NotImplementedError', () => {
    interface Dummy {
      hello(name: string): string
    }
    // 样例号用非工单号字符串（不匹配 SR-域-编号 格式）：挂真实工单号会随工单
    // 完成而被 check-tickets 的占位桩检查判红（tests 侧只查占位调用模式）
    const dummy = unimplementedObject<Dummy>('SAMPLE-1', 'dummy')
    expect(() => dummy.hello('a')).toThrow(NotImplementedError)
    try {
      dummy.hello('a')
    } catch (e) {
      expect((e as NotImplementedError).ticket).toBe('SAMPLE-1')
      expect((e as Error).message).toContain('dummy.hello')
    }
  })
})
