import { describe, expect, it } from 'vitest'
import { APP_FILE_SCHEME } from '../../../src/shared/constants'
import { APP_FILE_URL_PREFIX, appFileUrl } from '../../../src/shared/app-file-url'

/**
 * [F-DEDUP-01] src/shared/app-file-url 直接单测——app-file:// URL 拼装单源契约。
 * 收敛前 3 处拼装（papers.repo fileUrl / app-file.protocol prefix 解析 /
 * corpus.export 提取请求 url 硬编码字面量——微扩主目标消灭面）。本件锁定
 * prefix 常量与 APP_FILE_SCHEME 的一致性（双源漂移即红）。新测试 always-active。
 */

describe('src/shared/app-file-url —— URL 拼装单源', () => {
  it('prefix 常量 = APP_FILE_SCHEME + "://"（与协议常量同源对账）', () => {
    expect(APP_FILE_URL_PREFIX).toBe(`${APP_FILE_SCHEME}://`)
    expect(APP_FILE_URL_PREFIX).toBe('app-file://')
  })

  it('appFileUrl：prefix + paperId 拼接', () => {
    expect(appFileUrl('p-abc-123')).toBe('app-file://p-abc-123')
  })

  it('appFileUrl：结果以 prefix 起且去 prefix 后还原 id', () => {
    const id = '0192f0x9'
    expect(appFileUrl(id).startsWith(APP_FILE_URL_PREFIX)).toBe(true)
    expect(appFileUrl(id).slice(APP_FILE_URL_PREFIX.length)).toBe(id)
  })
})
