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
  await expect(win.getByText('Synapse')).toBeVisible({ timeout: 20_000 })
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

test('真实 IPC invoke 全链路（ipcMain→zod→service→repo→sqlite）+ app-file:// fetch 不被 CSP 拦截', async () => {
  const userData = await mkdtemp(join(tmpdir(), 'synapse-smoke4-'))
  const app = await electron.launch({
    args: ['out/main/index.js'],
    env: { ...process.env, SYNAPSE_USER_DATA: userData } as Record<string, string>
  })
  const win = await app.firstWindow()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })

  // 盲区补防（升级核查轮 2026-08-22）：e2e 此前只断言桥存在性，从未真实 invoke
  const state = await win.evaluate(async () => {
    const w = window as unknown as {
      api: {
        library: {
          list: (
            req: object
          ) => Promise<{ ok: boolean; data?: { items?: unknown[]; total?: number } }>
          collections: (req: object) => Promise<{ ok: boolean; data?: unknown[] }>
        }
      }
    }
    return { list: await w.api.library.list({}), collections: await w.api.library.collections({}) }
  })
  expect(state.list.ok, 'library/list 全链路 invoke 应 ok').toBe(true)
  expect(state.list.data?.total).toBe(0)
  expect(state.list.data?.items).toEqual([])
  expect(state.collections.ok, 'library/collections 全链路 invoke 应 ok').toBe(true)
  expect(state.collections.data).toEqual([])

  // CSP 回归防线：connect-src 必须放行 app-file:（阅读器 pdf.js 取数通道）。
  // 被拦截时 fetch 抛 TypeError；放行时空库对未知 id 走协议层语义返回 404。
  const fetchProbe = await win.evaluate(async () => {
    try {
      const res = await fetch('app-file://csp-regression-probe')
      return { blocked: false, status: res.status }
    } catch {
      return { blocked: true, status: 0 }
    }
  })
  expect(fetchProbe.blocked, 'app-file:// fetch 被 CSP 拦截——connect-src 缺 app-file:').toBe(false)
  expect(fetchProbe.status, '空库未知 id 的协议语义应是 404').toBe(404)

  await app.close()
})

test('frameless 标题栏：自绘三键可见可交互 + drag/no-drag 区域正确（R2-SH3）', async () => {
  const userData = await mkdtemp(join(tmpdir(), 'synapse-smoke5-'))
  const app = await electron.launch({
    args: ['out/main/index.js'],
    env: { ...process.env, SYNAPSE_USER_DATA: userData } as Record<string, string>
  })
  const win = await app.firstWindow()
  await expect(win.getByText('Synapse')).toBeVisible({ timeout: 20_000 })

  // 三键可见（role=button accessible name）
  await expect(win.getByRole('button', { name: '最小化' })).toBeVisible()
  await expect(win.getByRole('button', { name: '最大化' })).toBeVisible()
  await expect(win.getByRole('button', { name: '关闭' })).toBeVisible()

  // drag/no-drag：整条 header=drag；切换器容器与三键容器=no-drag
  const regions = await win.evaluate(() => {
    const get = (sel: string): string =>
      getComputedStyle(document.querySelector(sel) as Element).getPropertyValue('-webkit-app-region')
    return {
      header: get('.app-header'),
      controls: get('.titlebar-controls'),
      switcher: get('.app-header-switcher')
    }
  })
  expect(regions.header, '.app-header 应为 drag').toBe('drag')
  expect(regions.controls, '三键容器应为 no-drag').toBe('no-drag')
  expect(regions.switcher, '切换器容器应为 no-drag').toBe('no-drag')

  // maximize-toggle 真行为：点「最大化」→ isMaximized true；按钮切「向下还原」→ 点回 false
  await win.getByRole('button', { name: '最大化' }).click()
  await expect
    .poll(() => app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.isMaximized() ?? false))
    .toBe(true)
  await expect(win.getByRole('button', { name: '向下还原' })).toBeVisible()
  await win.getByRole('button', { name: '向下还原' }).click()
  await expect
    .poll(() => app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.isMaximized() ?? false))
    .toBe(false)

  await app.close()
})

test('R2-SET1 界面缩放：点「大 125%」→nav 首项 rect ×1.25（±2px）+header 高恒 56（豁免锁——rect 断言非 computed）', async () => {
  const userData = await mkdtemp(join(tmpdir(), 'synapse-smoke-set1-'))
  const app = await electron.launch({
    args: ['out/main/index.js'],
    env: { ...process.env, SYNAPSE_USER_DATA: userData } as Record<string, string>
  })
  const win = await app.firstWindow()
  await win.getByRole('button', { name: '文献库' }).waitFor({ timeout: 20_000 })

  // 基线（默认 small=100%）：nav 首项高+header 高——getBoundingClientRect
  // （computed fontSize 对 CSS zoom 无感，探针 r2-set1-out-probe.json 实测）
  const base = await win.evaluate(() => ({
    navH: document.querySelector('.app-nav-item')!.getBoundingClientRect().height,
    headerH: document.querySelector('header.app-header')!.getBoundingClientRect().height
  }))
  expect(base.headerH, '基线 header 高=56（R2-SH2 锚；44→56 用户裁决 2026-08-31 增高令——断言随令）').toBe(56)

  // 进设置→点「大 125%」→save 落地→store 替换→App 订阅→--ui-scale→内容行 zoom
  await win.getByRole('button', { name: '设置' }).click()
  await win.getByRole('button', { name: '大 125%' }).click()
  await expect(win.getByText('界面缩放已保存')).toBeVisible()

  // nav 首项 ×1.25±2px（内容行缩放生效）；header 恒 56（结构性豁免）
  await expect
    .poll(
      async () => {
        const navH = await win.evaluate(
          () => document.querySelector('.app-nav-item')!.getBoundingClientRect().height
        )
        return Math.abs(navH - base.navH * 1.25)
      },
      { timeout: 5000 }
    )
    .toBeLessThanOrEqual(2)
  const headerAfter = await win.evaluate(
    () => document.querySelector('header.app-header')!.getBoundingClientRect().height
  )
  expect(headerAfter, 'header 在内容行外——豁免锁（E5：caption/顶栏保持系统观感）').toBe(56)

  await app.close()
})
