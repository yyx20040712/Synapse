import { describe, expect, it } from 'vitest'
import { APP_ERROR_CODES, err, toAppError } from '../../src/shared/app-error'
import type { AppErrorCode } from '../../src/shared/app-error'

/**
 * [F-TESTREF-W3] src/shared/app-error.ts 直接契约测试——错误码封闭性。
 * 与既有 contracts/app-error.test.ts（错误模型行为）互补：本文件机检
 * 「AppErrorCode 是封闭枚举」这句冻结注释——
 * - 类型级：APP_ERROR_CODES 字面量联合 ⟷ AppErrorCode 双向 Equal（新增码
 *   漏同步任一侧 → 本文件编译红）；
 * - 运行时：全集对账（15 码无重复）+ 逐码 toAppError 识别探针（类型 ⊆
 *   运行时识别集）+ 集外串回落 INTERNAL（无 canonicalize 通道）。
 * 新测试 always-active。
 */
type Expect<T extends true> = T
type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends (<T>() => T extends Y ? 1 : 2) ? true : false
type _ClosureBothWays = Expect<Equal<(typeof APP_ERROR_CODES)[number], AppErrorCode>>

/** 15 码手写清单（运行时全集对账的对照面——双侧漂移即红） */
const CODES = [
  'CANCELLED',
  'CONFLICT',
  'DB_ERROR',
  'DUPLICATE_FILE',
  'EXPORT_BUSY',
  'INTERNAL',
  'INVALID_REQUEST',
  'IO_ERROR',
  'NETWORK_ERROR',
  'NOT_FOUND',
  'NOT_IMPLEMENTED',
  'PARSE_ERROR',
  'RATE_LIMITED',
  'UNSUPPORTED_FILE',
  'UPSTREAM_ERROR'
]

describe('contracts/app-error-closure —— 错误码封闭性（AppErrorCode 封闭枚举机检）', () => {
  it('运行时全集对账：APP_ERROR_CODES 与手写清单一致、15 码无重复', () => {
    expect([...APP_ERROR_CODES].sort()).toEqual([...CODES])
    expect(APP_ERROR_CODES).toHaveLength(15)
    expect(new Set(APP_ERROR_CODES).size).toBe(APP_ERROR_CODES.length)
  })

  it.each(CODES)('码 %s 被 toAppError 结构化识别（类型成员 ⊆ 运行时识别集）', (code) => {
    expect(toAppError(Object.assign(new Error('m'), { code })).code).toBe(code)
  })

  it('封闭集外字符串回落 INTERNAL（含大小写变体与空串——精确匹配，无规范化通道）', () => {
    expect(toAppError(Object.assign(new Error('m'), { code: 'internal' })).code).toBe('INTERNAL')
    expect(toAppError(Object.assign(new Error('m'), { code: 'NOT_FOUND ' })).code).toBe('INTERNAL')
    expect(toAppError(Object.assign(new Error('m'), { code: '' })).code).toBe('INTERNAL')
    expect(toAppError(Object.assign(new Error('m'), { code: 42 })).code).toBe('INTERNAL')
  })

  it('err() 两形：detail 省略形不含 detail 键（键缺席非 undefined 值位）', () => {
    expect(err('NOT_FOUND', '找不到文献')).toEqual({
      ok: false,
      error: { code: 'NOT_FOUND', message: '找不到文献' }
    })
    expect(err('NOT_FOUND', '找不到文献', '库中无 p1')).toEqual({
      ok: false,
      error: { code: 'NOT_FOUND', message: '找不到文献', detail: '库中无 p1' }
    })
    const plain = err('NOT_FOUND', '找不到文献')
    if (!plain.ok) expect('detail' in plain.error).toBe(false)
  })
})
