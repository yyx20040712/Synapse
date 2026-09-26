// @vitest-environment jsdom
/**
 * [R3-TH1] App 壳渲染锁——nav 四入口 + active 态类 + SVG 图标 + 品牌/footer。
 *
 * 设计定稿（docs/design/2026-08-28_visual-system.md §2 R3-U1）：App 壳=
 * 墨青侧栏+金 active 左缘条+菱形品牌标+SVG 图标。本用例锁结构面（类名/
 * 图标存在/文案），视觉值面由 e2e 冒烟承载——两层合起来「视觉基建」改坏
 * 任何一层即红。mock 配方照 app-quit-dirty.test.tsx（App 组合根同型）。
 *
 * e2e 断言面兼容性锚：nav 四项文案（'文献库' 等=smoke.spec/reader-text.spec
 * getByRole name 断言面）与品牌文本 'Synapse'（smoke.spec:22 getByText 断言面——
 * R2-SH1 改名同步：旧全名缩为单名；R2-SH2 决4 品牌行迁顶栏 header，文本
 * 仍唯一在场——getByText 断言面零改）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub, stubApiEvents } from '../../utils/api-client-mock'

const stubApi = makeApiStub({
  lineage: { graph: vi.fn() },
  library: { list: vi.fn() },
  settings: { get: vi.fn(), set: vi.fn() },
  system: { setQuitDirty: vi.fn(), windowControl: vi.fn() },
  workspaces: { list: vi.fn() }
})
stubApiEvents({
  onExportCorpus: vi.fn(() => () => undefined),
  onImportProgress: vi.fn(() => () => undefined)
})

import { App } from '../../../src/renderer/app/App'

let root: Root | null = null
let host: HTMLDivElement | null = null

function mount(element: JSX.Element): void {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root?.render(element)
  })
}

const flush = async (turns = 6): Promise<void> => {
  for (let i = 0; i < turns; i++) {
    await act(async () => {
      await Promise.resolve()
    })
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  stubApi.lineage.graph.mockReset()
  stubApi.library.list.mockReset()
  stubApi.settings.get.mockReset()
  stubApi.settings.set.mockReset()
  stubApi.system.setQuitDirty.mockReset()
  stubApi.system.windowControl.mockReset()
  stubApi.workspaces.list.mockReset()
  // App 组合根与 TitleBarControls 直用 window.api/window.apiEvents（非
  // client 门面）——jsdom 下 stub（R2-SH3：windowControl+onWindowState）
  Object.defineProperty(window, 'api', {
    configurable: true,
    value: {
      system: { setQuitDirty: stubApi.system.setQuitDirty, windowControl: stubApi.system.windowControl }
    }
  })
  Object.defineProperty(window, 'apiEvents', {
    configurable: true,
    value: { onWindowState: vi.fn(() => () => undefined) }
  })
  stubApi.lineage.graph.mockResolvedValue({ ok: true, data: { nodes: [], edges: [] } })
  stubApi.library.list.mockResolvedValue({ ok: true, data: { items: [], total: 0 } })
  stubApi.settings.get.mockResolvedValue({
    ok: true,
    data: { contactEmail: 'a@b.c', theme: 'system', uiScale: 'small' }
  })
  stubApi.system.setQuitDirty.mockResolvedValue({ ok: true, data: { ok: true } })
  stubApi.system.windowControl.mockResolvedValue({ ok: true, data: { ok: true, maximized: false } })
  stubApi.workspaces.list.mockResolvedValue({
    ok: true,
    data: {
      items: [{ id: 'w1', name: '默认课题', createdAt: '2026-08-28T00:00:00Z' }],
      currentId: 'w1'
    }
  })
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
})

/** nav 内按精确可见文本取按钮（Switcher 按钮'默认课题 ▾'等与入口名无碰撞） */
function navButton(label: string): HTMLButtonElement | undefined {
  const nav = document.querySelector('nav')
  return Array.from(nav?.querySelectorAll('button') ?? []).find(
    (b) => b.textContent?.trim() === label
  )
}

describe('R3-TH1 App 壳——顶栏身份区+墨青侧栏结构锁（R2-SH2 扩面）', () => {
  it('nav 四入口各带 aria-hidden SVG 图标，文案与 e2e 断言面一致', async () => {
    mount(<App />)
    await flush()
    for (const label of ['文献库', '阅读器', '设置', '脉络']) {
      const btn = navButton(label)
      expect(btn, `nav 应含入口按钮「${label}」`).toBeDefined()
      expect(
        btn!.querySelector('svg[aria-hidden="true"]'),
        `入口「${label}」应含内联 SVG 图标（aria-hidden 不污染 accessible name——getByRole name 断言面）`
      ).not.toBeNull()
    }
  })

  it('默认视图（文献库）带 active 态类，其余入口不带', async () => {
    mount(<App />)
    await flush()
    expect(navButton('文献库')!.classList.contains('app-nav-item-active')).toBe(true)
    expect(navButton('设置')!.classList.contains('app-nav-item-active')).toBe(false)
    expect(navButton('脉络')!.classList.contains('app-nav-item-active')).toBe(false)
  })

  it('品牌名（Synapse）与版本号在顶栏 header 内，footer（本地学术文献管理）仍在侧栏', async () => {
    mount(<App />)
    await flush()
    const header = document.querySelector('header.app-header')
    expect(header, '顶栏 header 在场（R2-SH2 决4——App 根最前）').not.toBeNull()
    expect(
      header!.textContent,
      "品牌文本=smoke.spec:22 getByText('Synapse') 断言面——R2-SH2 品牌行迁顶栏"
    ).toContain('Synapse')
    expect(header!.textContent, '版本号随品牌行迁顶栏（预裁2：信息保留）').toContain('v0.1')
    const nav = document.querySelector('nav')
    expect(nav, 'nav 元素在场').not.toBeNull()
    expect(nav!.textContent, 'footer 文案（票面 P2——foot 原样留侧栏）').toContain('本地学术文献管理')
  })

  it('顶栏身份区三件：logo svg+品牌名+课题切换器在 header 内（R2-SH2 决4）', async () => {
    mount(<App />)
    await flush()
    const header = document.querySelector('header.app-header')
    expect(header, 'header 在场').not.toBeNull()
    expect(header!.querySelector('svg'), 'logo svg 迁自 .app-nav-brand（资源不删）').not.toBeNull()
    expect(header!.textContent, '应用名在 header 内').toContain('Synapse')
    const switcher = header!.querySelector('button[aria-label="切换课题"]')
    expect(switcher, 'WorkspaceSwitcher 迁挂 header（组件本体零改，props 原样）').not.toBeNull()
  })

  it('侧栏品牌行退役（负锚）：app-nav-brand/app-nav-name 零残留', async () => {
    mount(<App />)
    await flush()
    expect(document.querySelectorAll('.app-nav-brand'), '品牌行整体迁顶栏——侧栏残留即红').toHaveLength(0)
    expect(document.querySelectorAll('.app-nav-name'), 'app-nav-name 类并入顶栏新类不再引用').toHaveLength(0)
  })

  it('main 挂 .app-main 类（F-UI-04 D1=冷雾灰挂 main 挂载锁）', async () => {
    mount(<App />)
    await flush()
    expect(
      document.querySelector('main.app-main'),
      'main 应带 .app-main 类（theme-shell.css .app-main 冷雾灰消费钩——类名被重构丢即红，封静默回归口）'
    ).not.toBeNull()
  })
})

describe('R2-SET1 界面缩放——App 挂载 load+--ui-scale 变量（数据通道单点）', () => {
  it('settings.uiScale=medium：挂载后 documentElement --ui-scale=1.1', async () => {
    stubApi.settings.get.mockResolvedValue({
      ok: true,
      data: { contactEmail: 'a@b.c', theme: 'system', uiScale: 'medium' }
    })
    mount(<App />)
    await flush()
    expect(
      document.documentElement.style.getPropertyValue('--ui-scale'),
      'UI_SCALE.medium=1.1 经 App effect 写 documentElement'
    ).toBe('1.1')
  })

  it('默认 small=1；save({uiScale:large}) 落地后变量更新 1.25（变化沿）', async () => {
    mount(<App />)
    await flush()
    expect(
      document.documentElement.style.getPropertyValue('--ui-scale'),
      '默认档 small → 1'
    ).toBe('1')
    stubApi.settings.set.mockResolvedValueOnce({
      ok: true,
      data: { contactEmail: 'a@b.c', theme: 'system', uiScale: 'large' }
    })
    const { useSettingsStore } = await import('../../../src/renderer/features/settings/settings.store')
    await act(async () => {
      await useSettingsStore.getState().save({ uiScale: 'large' })
    })
    await flush()
    expect(
      document.documentElement.style.getPropertyValue('--ui-scale'),
      'save 落地→store settings 替换→App 订阅重渲→变量更新 1.25'
    ).toBe('1.25')
  })
})

// F-UI-03 导航栏窄条折叠（always-active——三屋新测试不经 guardedDescribe）
describe('F-UI-03 导航栏窄条折叠——收起钮+窄态类+label span（可访问名兼容）', () => {
  it('收起钮 aria-label 随态换名；点击后 nav 挂 app-nav-collapsed；四入口 label span 在（navButton 文本查询不破）', async () => {
    mount(<App />)
    await flush()
    for (const label of ['文献库', '阅读器', '设置', '脉络']) {
      expect(navButton(label), `入口「${label}」按可见文本仍可查（span 包裹后 textContent 兼容）`).toBeDefined()
    }
    expect(document.querySelectorAll('.app-nav-label')).toHaveLength(4)
    const toggle = document.querySelector('button[aria-label="收起导航栏"]') as HTMLButtonElement | null
    expect(toggle, '收起钮在场（nav 首行）').not.toBeNull()
    act(() => {
      toggle!.click()
    })
    const expandBtn = document.querySelector('button[aria-label="展开导航栏"]') as HTMLButtonElement | null
    expect(expandBtn, '收起后 aria-label 切换为「展开导航栏」（TitleBarControls 三元先例）').not.toBeNull()
    expect(
      document.querySelector('nav')!.classList.contains('app-nav-collapsed'),
      'nav 挂窄态类 app-nav-collapsed'
    ).toBe(true)
    act(() => {
      expandBtn!.click()
    })
    expect(document.querySelector('button[aria-label="收起导航栏"]'), '再点展开恢复收起钮名').not.toBeNull()
    expect(
      document.querySelector('nav')!.classList.contains('app-nav-collapsed'),
      '展开后窄态类移除'
    ).toBe(false)
  })
})

// T3-P1 主题三族接线（always-active——三屋新测试不经 guardedDescribe）：
// 沿 R2-SET1 先例 mock settings store 通道，锁 data-theme 单点=App effect
describe('T3-P1 主题接线——documentElement.dataset.theme 随 settings.theme（App effect 单点）', () => {
  afterEach(() => {
    // jsdom 全局态防跨测污染（documentElement 跨 mount 存留——显式清）
    delete document.documentElement.dataset.theme
  })

  it('settings.theme=dark → data-theme=dark', async () => {
    stubApi.settings.get.mockResolvedValue({
      ok: true,
      data: { contactEmail: 'a@b.c', theme: 'dark', uiScale: 'small' }
    })
    mount(<App />)
    await flush()
    expect(
      document.documentElement.dataset.theme,
      'dark 档应写 documentElement data-theme=dark（theme.css 覆写族消费钩）'
    ).toBe('dark')
  })

  it('settings.theme=sepia → data-theme=sepia', async () => {
    stubApi.settings.get.mockResolvedValue({
      ok: true,
      data: { contactEmail: 'a@b.c', theme: 'sepia', uiScale: 'small' }
    })
    mount(<App />)
    await flush()
    expect(document.documentElement.dataset.theme, 'sepia 档应写 data-theme=sepia').toBe('sepia')
  })

  it('settings 未载入（load 失败容忍）→ data-theme=light（?? 兜底档）', async () => {
    // zustand 模块级 store 跨测存留：显式归零 settings 模拟「未载入」态
    const { useSettingsStore } = await import('../../../src/renderer/features/settings/settings.store')
    act(() => {
      useSettingsStore.setState({ settings: null })
    })
    stubApi.settings.get.mockRejectedValue(new Error('settings unreachable'))
    mount(<App />)
    await flush()
    expect(
      document.documentElement.dataset.theme,
      '未载入应兜底 light（默认档——与 App ?? light 同源）'
    ).toBe('light')
  })

  it('save({theme}) 落地后 attr 跟随（dark→sepia 变化沿）', async () => {
    stubApi.settings.get.mockResolvedValue({
      ok: true,
      data: { contactEmail: 'a@b.c', theme: 'dark', uiScale: 'small' }
    })
    mount(<App />)
    await flush()
    expect(document.documentElement.dataset.theme).toBe('dark')
    stubApi.settings.set.mockResolvedValueOnce({
      ok: true,
      data: { contactEmail: 'a@b.c', theme: 'sepia', uiScale: 'small' }
    })
    const { useSettingsStore } = await import('../../../src/renderer/features/settings/settings.store')
    await act(async () => {
      await useSettingsStore.getState().save({ theme: 'sepia' })
    })
    await flush()
    expect(
      document.documentElement.dataset.theme,
      'save 落地→store settings 替换→App 订阅重渲→attr 跟随 sepia'
    ).toBe('sepia')
  })
})
