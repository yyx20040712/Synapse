import { describe, expect, it } from 'vitest'
import { sanitizePathToken } from '../../../../src/main/services/shared/sanitize'

/**
 * [F-DEDUP-01] services/shared/sanitize 直接单测——路径段清洗单源契约。
 * 收敛前 2 处同正则副本（export.service safeId / corpus.export safeName），
 * C-02 家族：renderer 载荷自由串不裸拼路径的纵深防御（id 由应用生成本可信，
 * 防篡改载荷的路径穿越）。白名单 = [a-zA-Z0-9_-]，其余一律 '_'。新测试
 * always-active；it.each 用裸数组字面量（指纹门抽取器硬约束）。
 */

describe('services/shared/sanitize —— 路径段清洗单源', () => {
  it.each([
    ['paper-42_ok', 'paper-42_ok'],
    ['ABCxyz019', 'ABCxyz019'],
    ['../etc/passwd', '___etc_passwd'],
    ['..\\crew', '___crew'],
    ['a b\tc\nd', 'a_b_c_d'],
    ['论文：2024', '___2024'],
    ['', '']
  ])('消毒：%s → %s', (raw, expected) => {
    expect(sanitizePathToken(raw)).toBe(expected)
  })

  it('白名单字符全程保持（混合长串不变）', () => {
    expect(sanitizePathToken('Uuid-9_Ab-z0')).toBe('Uuid-9_Ab-z0')
  })

  it('穿越向量逐段消毒：连续点与多斜杠不存活', () => {
    expect(sanitizePathToken('....//')).toBe('______')
    expect(sanitizePathToken('a/../../b')).toBe('a_______b')
  })
})
