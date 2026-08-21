import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CSP_POLICY, cspHeaderValue } from '../../src/main/security/csp'

/**
 * CSP 单真相源契约：
 * 生产走 file://，webRequest/onHeadersReceived 不拦截本地文件请求——实际生效的
 * CSP 是 index.html 的 meta（构建期由 cspMetaPlugin 从 csp.ts 注入）。
 * 漂移后果实例：meta 手写版缺 worker-src blob: 会直接挡死 pdf.js worker。
 */
describe('security/csp-meta —— CSP 单真相源', () => {
  it('源码 index.html 禁止手写 CSP meta（唯一来源是 csp.ts，构建期注入）', () => {
    const html = readFileSync(join(process.cwd(), 'src/renderer/index.html'), 'utf-8')
    expect(html).not.toContain('http-equiv="Content-Security-Policy"')
  })

  it('策略覆盖生产必需指令（file:// 下 meta 是唯一防线）', () => {
    const policy = cspHeaderValue()
    for (const directive of [
      "default-src 'self'",
      "script-src 'self'",
      "worker-src 'self' blob:", // pdf.js worker 依赖
      // 阅读器 pdf.js getDocument 经 fetch 拉 PDF 的唯一取数通道——
      // 被移除时 e2e 的 app-file 探测会红，这里收紧到完整指令形态双保险
      "connect-src 'self' app-file:",
      "object-src 'none'",
      "frame-src 'none'",
      "base-uri 'none'",
      "form-action 'none'"
    ]) {
      expect(policy, `缺指令：${directive}`).toContain(directive)
    }
    expect(policy).not.toContain('unsafe-eval')
    expect(policy.split(';').map((s: string) => s.trim()).length).toBe(CSP_POLICY.length)
  })
})
