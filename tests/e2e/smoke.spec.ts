import { test, expect, _electron as electron } from '@playwright/test'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { cspHeaderValue } from '../../src/main/security/csp'
import { API_SURFACE } from '../../src/shared/ipc/api-surface'

/**
 * 冒烟 e2e（骨架期即激活）：应用能启动、三入口导航、内容区渲染。
 * 这是"防线通电"的最低验证——CI 上跑不了它等于防线没通电（教训 E1）。
 */
test('应用启动：侧栏三入口可见且可切换', async () => {
  const userData = await mkdtemp(join(tmpdir(), 'synapse-smoke-'))
  const app = await electron.launch({
    args: ['out/main/index.js'],
    env: {
      ...process.env,
      SYNAPSE_USER_DATA: userData
    } as Record<string, string>
  })
  const win = await app.firstWindow()
  await expect(win.getByText('Synapse Remake')).toBeVisible({ timeout: 20_000 })
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible()
  await expect(win.getByRole('button', { name: '阅读器' })).toBeVisible()
  await expect(win.getByRole('button', { name: '设置' })).toBeVisible()

  await win.getByRole('button', { name: '设置' }).click()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible()

  await app.close()
})

test('应用启动：主区域渲染了内容（空态或占位均可，白屏即红）', async () => {
  const userData = await mkdtemp(join(tmpdir(), 'synapse-smoke2-'))
  const app = await electron.launch({
    args: ['out/main/index.js'],
    env: { ...process.env, SYNAPSE_USER_DATA: userData } as Record<string, string>
  })
  const win = await app.firstWindow()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
  const main = win.locator('main')
  await expect(main).not.toBeEmpty()
  await app.close()
})

test('preload 桥已注入：window.api 暴露全部域 + apiEvents 在位 + CSP meta 与策略常量一致', async () => {
  const userData = await mkdtemp(join(tmpdir(), 'synapse-smoke3-'))
  const app = await electron.launch({
    args: ['out/main/index.js'],
    env: { ...process.env, SYNAPSE_USER_DATA: userData } as Record<string, string>
  })
  const win = await app.firstWindow()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
  const state = await win.evaluate(() => {
    const w = window as unknown as { api?: unknown; apiEvents?: unknown }
    return {
      hasApi: typeof w.api === 'object' && w.api !== null,
      hasEvents: typeof w.apiEvents === 'object' && w.apiEvents !== null,
      domains: Object.keys((w.api ?? {}) as Record<string, unknown>).sort(),
      cspMeta:
        document
          .querySelector('meta[http-equiv="Content-Security-Policy"]')
          ?.getAttribute('content') ?? ''
    }
  })
  expect(state.hasApi, 'window.api 未注入——preload 接线断裂').toBe(true)
  expect(state.hasEvents).toBe(true)
  expect(state.domains).toEqual(Object.keys(API_SURFACE).sort())
  expect(state.cspMeta).toBe(cspHeaderValue())
  await app.close()
})
