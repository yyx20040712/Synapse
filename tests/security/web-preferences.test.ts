import { describe, expect, it } from 'vitest'
import {
  WINDOW_SECURITY_FLAGS,
  windowOpenPolicy,
  denyAllPermissions
} from '../../src/main/windows/main-window'
import { CSP_POLICY, cspHeaderValue } from '../../src/main/security/csp'

describe('security —— Electron 安全配置（配置即测试，改错即红）', () => {
  it('webPreferences：沙箱/隔离全开，Node 全关', () => {
    expect(WINDOW_SECURITY_FLAGS.sandbox).toBe(true)
    expect(WINDOW_SECURITY_FLAGS.contextIsolation).toBe(true)
    expect(WINDOW_SECURITY_FLAGS.nodeIntegration).toBe(false)
    expect(WINDOW_SECURITY_FLAGS.nodeIntegrationInWorker).toBe(false)
    expect(WINDOW_SECURITY_FLAGS.webSecurity).toBe(true)
    expect(WINDOW_SECURITY_FLAGS.allowRunningInsecureContent).toBe(false)
    expect(WINDOW_SECURITY_FLAGS.webviewTag).toBe(false)
  })

  it('弹窗策略：一律 deny', () => {
    expect(windowOpenPolicy()).toEqual({ action: 'deny' })
  })

  it('权限请求：默认全部拒绝', () => {
    const handler = denyAllPermissions()
    let granted: boolean | null = null
    handler(null, 'notifications', (g) => {
      granted = g
    })
    expect(granted).toBe(false)
  })

  it('CSP：禁 eval/object/frame，pdf.js worker 放行 blob:，出网禁到 self', () => {
    const csp = cspHeaderValue()
    expect(csp).toContain("default-src 'self'")
    expect(csp).toContain("script-src 'self'")
    expect(csp).not.toContain('unsafe-eval')
    expect(csp).toContain("worker-src 'self' blob:")
    expect(csp).toContain("connect-src 'self'")
    expect(csp).toContain("object-src 'none'")
    expect(csp).toContain("frame-src 'none'")
    expect(csp).toContain('app-file:')
    expect(CSP_POLICY.length).toBeGreaterThan(5)
  })
})
