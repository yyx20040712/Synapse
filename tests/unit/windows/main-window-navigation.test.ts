/**
 * [R1-WS2 回炉 W4] will-navigate 护栏 deny 面纯函数锁定测试（always-active——
 * 安全件 allow+deny 双面锚定，门一裁决：抽纯函数防「同 URL 放行」修正滑向
 * 「全放行」——deny 面必须与 allow 面同文件同锁）。
 * 语义：true=阻止（preventDefault）；false=放行（仅同 URL 重载——R1-WS2
 * 课题切换 reload，ADR-0018）。
 */
import { describe, expect, it } from 'vitest'
import { shouldBlockNavigation } from '../../../src/main/windows/main-window'

const PAGE = 'file:///E:/app/out/renderer/index.html'

describe('shouldBlockNavigation —— 导航护栏判定（安全件双面）', () => {
  it('同 URL 重载放行（课题切换 reload 路径）', () => {
    expect(shouldBlockNavigation(PAGE, PAGE)).toBe(false)
  })

  it('外站导航 deny（护栏意图：内容只来自本地构建产物）', () => {
    expect(shouldBlockNavigation(PAGE, 'https://evil.example.com/')).toBe(true)
    expect(shouldBlockNavigation(PAGE, 'file:///E:/other/app/index.html')).toBe(true)
  })

  it('data: 变体 deny（data: URL 导航不可因 file 同源相似性放行）', () => {
    expect(shouldBlockNavigation(PAGE, 'data:text/html,<script>1</script>')).toBe(true)
    expect(shouldBlockNavigation(PAGE, 'data:image/png;base64,AAAA')).toBe(true)
  })
})
