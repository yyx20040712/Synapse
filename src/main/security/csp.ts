/**
 * 内容安全策略（SR-INFRA-06，已完成）。
 *
 * 职责：唯一的 CSP 策略常量。两个生效通道共用本常量（禁止第二份手写）：
 * 1. 构建期：electron.vite.config.ts 的 cspMetaPlugin 把完整策略注入 index.html
 *    meta——生产走 file://，webRequest 不拦截本地文件，meta 是实际防线
 * 2. 运行期：applyCsp 给 dev server 响应补响应头（防中间层剥离）
 * 禁 unsafe-eval；worker-src blob: 仅为 pdf.js worker；connect-src 'self' 禁止
 * renderer 直连外网（所有出网经 main 的 http-client，host 白名单校验）。
 * 测试：tests/security/csp-meta.test.ts（单真相源 + 指令完整性）+ e2e 运行时断言。
 */
import type { Session } from 'electron'

export const CSP_POLICY: readonly string[] = [
  "default-src 'self'",
  "script-src 'self'",
  "worker-src 'self' blob:",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' app-file: data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "frame-src 'none'",
  "base-uri 'none'",
  "form-action 'none'"
]

export function cspHeaderValue(): string {
  return CSP_POLICY.join('; ')
}

/** 注入到默认会话的所有响应头（bootstrap 装配时调用一次） */
export function applyCsp(session: Session): void {
  session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [cspHeaderValue()]
      }
    })
  })
}
