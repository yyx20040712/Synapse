import { describe, expect, it } from 'vitest'
import {
  parseAppFileUrl
} from '../../../src/main/protocol/app-file.protocol'
import { APP_FILE_SCHEME } from '../../../src/shared/constants'

describe('protocol/app-file —— URL 解析攻击向量', () => {
  it('合法：app-file://<uuid> 解析出 paperId', () => {
    expect(parseAppFileUrl(`${APP_FILE_SCHEME}://a1b2c3d4-e5f6-7890-abcd-ef0123456789`)).toBe(
      'a1b2c3d4-e5f6-7890-abcd-ef0123456789'
    )
  })

  it('合法：简单 id（短哈希）', () => {
    expect(parseAppFileUrl('app-file://paper01')).toBe('paper01')
  })

  it('攻击向量全部返回 null（含带路径/查询/片段的 URL）', () => {
    for (const evil of [
      'app-file://../../etc/passwd',
      'app-file://..%2F..%2Fetc%2Fpasswd',
      'app-file://a/b/c.pdf',
      'app-file://id?x=1',
      'app-file://id#frag',
      'app-file://',
      'app-file://id with space',
      'app-file://中文id',
      'http://evil/id',
      'app-file://' + 'a'.repeat(65)
    ]) {
      expect(parseAppFileUrl(evil), `应拒绝：${evil}`).toBeNull()
    }
    // 合法变体：末尾一个斜杠等价于无斜杠
    expect(parseAppFileUrl('app-file://paper01/')).toBe('paper01')
  })

  it('超长 id（>64）拒绝', () => {
    expect(parseAppFileUrl(`app-file://${'a'.repeat(65)}`)).toBeNull()
    expect(parseAppFileUrl(`app-file://${'a'.repeat(64)}`)).toBe('a'.repeat(64))
  })
})
