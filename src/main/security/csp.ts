/**
 * 内容安全策略（SR-INFRA-06，已完成）。
 *
 * 职责：唯一的 CSP 策略常量 + 注入函数；dev（localhost）与 prod（本地文件）同策略。
 * 禁 unsafe-eval；worker-src blob: 仅为 pdf.js worker；connect-src 'self' 禁止 renderer
 * 直连外网（所有出网经 main 的 http-client，host 白名单校验）。
 * 测试：tests/security/csp.test.ts（策略字符串关键指令断言，配置即测试）。
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
