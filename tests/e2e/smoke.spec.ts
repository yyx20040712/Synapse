import { test, expect, _electron as electron } from '@playwright/test'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

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
