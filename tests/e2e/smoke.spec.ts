import { test, expect } from '@playwright/test'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { cspHeaderValue } from '../../src/main/security/csp'
import { API_SURFACE } from '../../src/shared/ipc/api-surface'
import { bootstrapMigrations, launch, seedPaperRow } from './e2e-env'

/**
 * 冒烟 e2e（骨架期即激活）：应用能启动、三入口导航、内容区渲染。
 * 这是"防线通电"的最低验证——CI 上跑不了它等于防线没通电（教训 E1）。
 */
test('应用启动：侧栏三入口可见且可切换', async () => {
  const userData = await mkdtemp(join(tmpdir(), 'synapse-smoke-'))
  // [F-WS-02] 种子破引导态：fresh 启动=default+0 篇+默认名→rail 下方全禁用
  // （设置钮不可点=「可切换」断言空转——workspaces.spec 同配方）
  await bootstrapMigrations(userData)
  const sha = 'a'.repeat(64)
  await seedPaperRow(userData, `${sha.slice(0, 2)}/${sha.slice(2, 4)}/${sha}.pdf`, sha, 'smoke 种子文献')
  const app = await launch(userData)
  const win = await app.firstWindow()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
  // [T3-P2] wordmark 签名（Syn<i>a</i>pse——i 拆分文本节点，getByText 不可靠，
  // 锁 .wordmark 可见+textContent）
  const wm = win.locator('.wordmark')
  await expect(wm).toBeVisible()
  expect(await wm.textContent()).toBe('Synapse')
  await expect(win.getByRole('button', { name: '阅读器' })).toBeVisible()
  await expect(win.getByRole('button', { name: '设置' })).toBeVisible()

  await win.getByRole('button', { name: '设置' }).click()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible()

  await app.close()
})

test('应用启动：主区域渲染了内容（空态或占位均可，白屏即红）', async () => {
  const userData = await mkdtemp(join(tmpdir(), 'synapse-smoke2-'))
  const app = await launch(userData)
  const win = await app.firstWindow()
  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
  const main = win.locator('main')
  await expect(main).not.toBeEmpty()
  await app.close()
})

test('preload 桥已注入：window.api 暴露全部域 + apiEvents 在位 + CSP meta 与策略常量一致', async () => {
  const userData = await mkdtemp(join(tmpdir(), 'synapse-smoke3-'))
  const app = await launch(userData)
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
  const app = await launch(userData)
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
  // [F-FOLDER-01 收口亲修] 012 起空库不再空集合：主图 '__main__' 无条件初始
  // 插入（存量脉络承载锚 INV-93）——恰 1 条且名='主图'
  expect(state.collections.data).toHaveLength(1)
  expect(state.collections.data?.[0]).toMatchObject({ name: '主图' })

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
  const app = await launch(userData)
  const win = await app.firstWindow()
  await expect(win.locator('.wordmark')).toBeVisible({ timeout: 20_000 })

  // 三键可见（role=button accessible name）
  await expect(win.getByRole('button', { name: '最小化' })).toBeVisible()
  await expect(win.getByRole('button', { name: '最大化' })).toBeVisible()
  await expect(win.getByRole('button', { name: '关闭' })).toBeVisible()

  // drag/no-drag：整条 header=drag；wordmark/gsearch/三键容器=no-drag
  // [T3-P2] 切换器容器随 WorkspaceSwitcher 退役——no-drag 面换 wordmark+gsearch
  const regions = await win.evaluate(() => {
    const get = (sel: string): string =>
      getComputedStyle(document.querySelector(sel) as Element).getPropertyValue('-webkit-app-region')
    return {
      header: get('.app-header'),
      controls: get('.titlebar-controls'),
      wordmark: get('.wordmark'),
      gsearch: get('.gsearch')
    }
  })
  expect(regions.header, '.app-header 应为 drag').toBe('drag')
  expect(regions.controls, '三键容器应为 no-drag').toBe('no-drag')
  expect(regions.wordmark, 'wordmark 应为 no-drag（签名区可交互/可选中）').toBe('no-drag')
  expect(regions.gsearch, 'gsearch 应为 no-drag（输入框聚焦不被 drag 吞）').toBe('no-drag')

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

test('R2-SET1 界面缩放：点「大 125%」→rail 首项 rect ×1.25（±2px）+header 高恒 38（豁免锁——rect 断言非 computed）', async () => {
  const userData = await mkdtemp(join(tmpdir(), 'synapse-smoke-set1-'))
  // [F-WS-02] 种子破引导态（设置钮在引导态禁用——测 1 同配方）
  await bootstrapMigrations(userData)
  const sha = 'b'.repeat(64)
  await seedPaperRow(userData, `${sha.slice(0, 2)}/${sha.slice(2, 4)}/${sha}.pdf`, sha, 'smoke 缩放种子文献')
  const app = await launch(userData)
  const win = await app.firstWindow()
  await win.getByRole('button', { name: '文献库' }).waitFor({ timeout: 20_000 })

  // 基线（默认 small=100%）：nav 首项高+header 高——getBoundingClientRect
  // （computed fontSize 对 CSS zoom 无感，探针 r2-set1-out-probe.json 实测）
  const base = await win.evaluate(() => ({
    navH: document.querySelector('.rail-item')!.getBoundingClientRect().height,
    headerH: document.querySelector('header.app-header')!.getBoundingClientRect().height
  }))
  // [T3-P2] 高度裁决链：44→56（2026-08-31 增高令）→38（2026-09-26 theme-trio
  // final-design §1 四轮裁决后规格——后者覆盖前者）
  expect(base.headerH, '基线 header 高=38（T3-P2 壳层规格）').toBe(38)

  // 进设置→点「大 125%」→save 落地→store 替换→App 订阅→--ui-scale→内容行 zoom
  await win.getByRole('button', { name: '设置' }).click()
  await win.getByRole('button', { name: '大 125%' }).click()
  await expect(win.getByText('界面缩放已保存')).toBeVisible()

  // rail 首项 ×1.25±2px（内容行缩放生效——rail+main 同入 .app-content-row zoom）；
  // header 恒 38（结构性豁免）
  await expect
    .poll(
      async () => {
        const navH = await win.evaluate(
          () => document.querySelector('.rail-item')!.getBoundingClientRect().height
        )
        return Math.abs(navH - base.navH * 1.25)
      },
      { timeout: 5000 }
    )
    .toBeLessThanOrEqual(2)
  const headerAfter = await win.evaluate(
    () => document.querySelector('header.app-header')!.getBoundingClientRect().height
  )
  expect(headerAfter, 'header 在内容行外——豁免锁（E5：caption/顶栏保持系统观感）').toBe(38)

  await app.close()
})
