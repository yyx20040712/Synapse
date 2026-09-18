import { describe, expect, it } from 'vitest'
import { toAppError, type AppErrorCode } from '../../../../src/shared/app-error'
import { DomainError } from '../../../../src/main/services/shared/domain-error'
import { HttpFetchError } from '../../../../src/main/http/http-client'

/**
 * [F-DEDUP-01] services/shared/domain-error 直接单测——服务层域错误基类契约。
 * 15 处同构子类收敛为「一行继承零样板」，本件锁定基类的三条行为底线：
 * ①name 经 new.target.name 自动落子类名（迁移前各文件手写 this.name 的保真面
 * ②instanceof 链成立（子类消费方可按基类统一窄化）；③register 出口经
 * toAppError 按 code 字段折叠（鸭子类型，不按类名——非法码回落 INTERNAL）。
 * 新测试 always-active；测试桩子类=各域子类的最小消费代表。
 */

/** 测试桩子类：一行继承（各域子类迁移后的标准形态） */
class StubDomainError extends DomainError {}

describe('services/shared/domain-error —— 域错误基类', () => {
  it('基类直构：name=DomainError，code 与 message 保留', () => {
    const e = new DomainError('NOT_FOUND', '文献不存在：p-1')
    expect(e.name).toBe('DomainError')
    expect(e.code).toBe('NOT_FOUND')
    expect(e.message).toBe('文献不存在：p-1')
  })

  it('子类 name 自动继承（无手写 this.name）：测试桩与 HttpFetchError 实物', () => {
    const stub = new StubDomainError('IO_ERROR', '桩错误')
    expect(stub.name).toBe('StubDomainError')
    const http = new HttpFetchError('NETWORK_ERROR', '网络错误')
    expect(http.name).toBe('HttpFetchError')
  })

  it('instanceof 链：子类 instanceof 基类与 Error，基类 instanceof Error', () => {
    const stub = new StubDomainError('IO_ERROR', '桩错误')
    expect(stub instanceof DomainError).toBe(true)
    expect(stub instanceof Error).toBe(true)
    expect(new DomainError('INTERNAL', 'x') instanceof Error).toBe(true)
  })

  it('toAppError 按 code 折叠：合法码保留 code 与中文 message', () => {
    const app = toAppError(new StubDomainError('CONFLICT', '标签名已被占用'))
    expect(app.code).toBe('CONFLICT')
    expect(app.message).toBe('标签名已被占用')
  })

  it('toAppError 按 code 折叠：非法码回落 INTERNAL（鸭子类型不认类名）', () => {
    const e = new StubDomainError('NOT_A_REAL_CODE' as AppErrorCode, '带非法码的域错误')
    const app = toAppError(e)
    expect(app.code).toBe('INTERNAL')
    expect(app.message).toBe('发生未预期的内部错误')
    expect(app.detail).toBe('带非法码的域错误')
  })

  it('HttpFetchError 三参形态：status 字段保留且 code 仍可折叠', () => {
    const e = new HttpFetchError('UPSTREAM_ERROR', '上游返回 HTTP 503', 503)
    expect(e.status).toBe(503)
    expect(e.code).toBe('UPSTREAM_ERROR')
    const app = toAppError(e)
    expect(app.code).toBe('UPSTREAM_ERROR')
  })
})
