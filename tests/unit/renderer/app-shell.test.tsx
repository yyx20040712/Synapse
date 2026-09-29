// @vitest-environment jsdom
/**
 * [T3-P2] App 壳渲染锁——38px 顶栏（wordmark 签名+gsearch 居中+caption 三键）
 * +72px 窄轨（课题/下载+四视图）+课题弹层联动+26px 状态条。
 *
 * 设计真相源=docs/design/2026-09-26_theme-trio-final-design.md §1（应用壳全规格）
 * +视觉基准=docs/design/mockups/2026-09-26_v2_theme-light.html 壳层段。
 * 本用例锁结构面（类名/aria/文案/textContent），视觉值面由 theme.test.ts
 * （CSS 文本锁）+e2e shell-rail.spec.ts（真 Chromium rect/computed）承载。
 * mock 配方沿 app-quit-dirty.test.tsx（App 组合根同型）。
 *
 * e2e 断言面兼容性锚：rail 四视图 aria-label（'文献库' 等=各 e2e getByRole
 * name 断言面）与 wordmark 文本 'Synapse'（smoke.spec .wordmark 断言面）。
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
  workspaces: { list: vi.fn(), switch: vi.fn() }
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
  stubApi.workspaces.switch.mockReset()
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
    data: { contactEmail: 'a@b.c', theme: 'light', uiScale: 'small' }
  })
  stubApi.system.setQuitDirty.mockResolvedValue({ ok: true, data: { ok: true } })
  stubApi.system.windowControl.mockResolvedValue({ ok: true, data: { ok: true, maximized: false } })
  stubApi.workspaces.list.mockResolvedValue({
    ok: true,
    data: {
      items: [
        { id: 'w1', name: '默认课题', createdAt: '2026-08-28T00:00:00Z', paperCount: 3 },
        { id: 'w2', name: '智慧水务水质模型课题', createdAt: '2026-08-29T00:00:00Z', paperCount: 7 }
      ],
      currentId: 'w1'
    }
  })
  stubApi.workspaces.switch.mockResolvedValue({ ok: true, data: { ok: true } })
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
  // 模块级 store 跨 mount 存留：显式复位防跨测污染（lineage dirty 投影会
  // 把 App 的 quitDirty 抬真——弹层 dirty 用例依赖该通道，反过来其他用例
  // 需要复位回 saved）
})

/** rail 内按 aria-label 取按钮（e2e getByRole name 断言面同源） */
function railButton(label: string): HTMLButtonElement | null {
  const rail = document.querySelector('nav.rail')
  return Array.from(rail?.querySelectorAll('button') ?? []).find(
    (b) => b.getAttribute('aria-label') === label
  ) ?? null
}

describe('T3-P2 App 壳——38px 顶栏+72px 窄轨结构锁', () => {
  it('rail 七项：课题/下载/文献库/阅读器/脉络/设置六 button aria-label 齐备，各带内联 SVG 图标', async () => {
    mount(<App />)
    await flush()
    for (const label of ['课题', '下载', '文献库', '阅读器', '脉络', '设置']) {
      const btn = railButton(label)
      expect(btn, `rail 应含 aria-label「${label}」的 button（e2e getByRole name 断言面）`).not.toBeNull()
      expect(
        btn!.querySelector('svg[aria-hidden="true"]'),
        `rail 项「${label}」应含内联 SVG 图标（aria-hidden 不污染 accessible name）`
      ).not.toBeNull()
    }
    // F-LIBUI-01 ①：rail-gap 12px 楔子退役（下载↔文献库归 3px 等距）；
    // rail-foot（设置贴底）结构仍在场
    expect(document.querySelector('nav.rail .rail-gap'), 'rail-gap 分隔段已退役').toBeNull()
    expect(document.querySelector('nav.rail .rail-foot'), 'rail-foot（margin-top:auto 贴底段）在场').not.toBeNull()
  })

  it('默认视图（文献库）带 active 类+aria-current=page；点击设置后随态迁移', async () => {
    mount(<App />)
    await flush()
    expect(railButton('文献库')!.classList.contains('active')).toBe(true)
    expect(railButton('文献库')!.getAttribute('aria-current')).toBe('page')
    expect(railButton('设置')!.classList.contains('active')).toBe(false)
    expect(railButton('设置')!.getAttribute('aria-current')).toBe(null)
    act(() => {
      railButton('设置')!.click()
    })
    expect(railButton('设置')!.classList.contains('active'), '点击后设置项挂 active').toBe(true)
    expect(railButton('设置')!.getAttribute('aria-current'), '当前视图项 aria-current=page').toBe('page')
    expect(railButton('文献库')!.getAttribute('aria-current')).toBe(null)
  })

  it('课题项结构：短名 label（name 前 4 字符；色点已退役 F-LIBUI-01）；未选中课题时兜底「课题」', async () => {
    mount(<App />)
    await flush()
    const btn = railButton('课题')!
    expect(btn.querySelector('span.rail-ws-dot'), '课题项色点 span.rail-ws-dot 已退役（色标身份移入课题管理页=F-WS-02）').toBeNull()
    expect(btn.querySelector('span.lb')!.textContent, '当前课题短名=name 前 4 字符').toBe('默认课题')
    // 长名截断锚：切 currentId=w2 后短名=「智慧水务」
    const { useWorkspaceStore } = await import('../../../src/renderer/features/workspaces/workspace.store')
    act(() => {
      useWorkspaceStore.setState({ currentId: 'w2' })
    })
    expect(railButton('课题')!.querySelector('span.lb')!.textContent, '长课题名截为前 4 字符（CSS ellipsis 兜底）').toBe('智慧水务')
    act(() => {
      useWorkspaceStore.setState({ currentId: '' })
    })
    expect(railButton('课题')!.querySelector('span.lb')!.textContent, '无当前课题兜底「课题」').toBe('课题')
  })

  it('顶栏：wordmark 签名（Syn+a+pse）+gsearch（提示语全局搜索+Ctrl K 键帽）+caption 三键', async () => {
    mount(<App />)
    await flush()
    const header = document.querySelector('header.app-header')
    expect(header, '顶栏 header.app-header 在场（类名保留——smoke/window-control 选择器面）').not.toBeNull()
    expect(header!.querySelector('.wordmark')!.textContent, 'wordmark 文本=Synapse（a 用 accent 色 i 标记）').toBe('Synapse')
    const input = header!.querySelector<HTMLInputElement>('.gsearch input')
    expect(input, 'gsearch 输入框在场（v1 展示性——可聚焦可输入无动作）').not.toBeNull()
    expect(
      header!.querySelector('.gsearch .ph')?.textContent,
      '空值提示语 span.ph=「全局搜索」（mockup .ph 语汇）'
    ).toBe('全局搜索')
    expect(header!.querySelector('.gsearch .k')!.textContent, '右缘键帽提示 Ctrl K').toBe('Ctrl K')
    expect(header!.querySelector('button[aria-label="最小化"]'), 'caption 三键（TitleBarControls）').not.toBeNull()
    expect(header!.textContent, '版本号已退役出壳层（mockup 无位——观察项）').not.toContain('v0.1')
  })

  it('main 挂 .app-main 类（皮肤消费钩——类名被重构丢即红）', async () => {
    mount(<App />)
    await flush()
    expect(document.querySelector('main.app-main')).not.toBeNull()
  })
})

describe('F-WS-02 课题管理视图页——rail 路由+页内切换链（弹层退役承接）', () => {
  let reloadSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    // jsdom location.reload not implemented：整体替换（workspace.store.test 同型）
    reloadSpy = vi.fn()
    Object.defineProperty(window, 'location', { configurable: true, value: { reload: reloadSpy } })
  })

  it('点击课题项路由 workspaces 视图：main 内 .ws-page 在场+课题钮 active/aria-current；弹层零残留；点文献库切回', async () => {
    mount(<App />)
    await flush()
    expect(document.querySelector('.ws-pop'), '课题弹层已退役（F-WS-02 方案切换=删除旧方案）').toBeNull()
    expect(document.querySelector('main .ws-page'), '初始（文献库视图）无课题管理页').toBeNull()
    act(() => {
      railButton('课题')!.click()
    })
    const page = document.querySelector('main .ws-page')
    expect(page, '点击课题钮=路由 workspaces 视图页（非弹层）').not.toBeNull()
    const cards = page!.querySelectorAll('.ws-card')
    expect(cards, '课题卡片列表渲染（两张卡）').toHaveLength(2)
    expect(cards[1]!.textContent, '卡片=实名+篇数').toContain('智慧水务水质模型课题')
    expect(cards[1]!.textContent).toContain('7 篇')
    expect(railButton('课题')!.classList.contains('active'), '课题钮挂 active（视图路由钮）').toBe(true)
    expect(railButton('课题')!.getAttribute('aria-current'), '课题钮 aria-current=page').toBe('page')
    act(() => {
      railButton('文献库')!.click()
    })
    expect(document.querySelector('main .ws-page'), '点文献库切回（视图切换机制内）').toBeNull()
  })

  it('页内点选其他课题卡：switchTo 走 IPC（含 id）并触发 reload（ADR-0018 联动语义维持）', async () => {
    mount(<App />)
    await flush()
    act(() => {
      railButton('课题')!.click()
    })
    const cards = document.querySelectorAll('main .ws-card')
    await act(async () => {
      cards[1]!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    await flush()
    expect(stubApi.workspaces.switch).toHaveBeenCalledWith({ id: 'w2' })
    expect(reloadSpy, '切换成功即 reload（侧栏短名/状态条课题名 reload 后自新）').toHaveBeenCalledTimes(1)
  })

  it('页内点选当前课题卡：幂等零 IPC 零 reload（确认语义不空切）', async () => {
    mount(<App />)
    await flush()
    act(() => {
      railButton('课题')!.click()
    })
    stubApi.workspaces.switch.mockClear()
    const current = document.querySelector('main .ws-card.on')!
    await act(async () => {
      current.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    await flush()
    expect(stubApi.workspaces.switch, '幂等点选=零 IPC（pick 层分流）').not.toHaveBeenCalled()
    expect(reloadSpy).not.toHaveBeenCalled()
  })

  it('dirty=true 且确认取消：confirm 弹切换文案，switch IPC 与 reload 均不被调', async () => {
    // dirty 聚合通道=lineage saveStatus≠saved（App 组合根单点——沿 useLineageDirty）
    const { useLineageStore } = await import('../../../src/renderer/features/lineage/lineage.store')
    act(() => {
      useLineageStore.setState({ saveStatus: 'error' })
    })
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    mount(<App />)
    await flush()
    act(() => {
      railButton('课题')!.click()
    })
    const cards = document.querySelectorAll('main .ws-card')
    await act(async () => {
      cards[1]!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    await flush()
    expect(confirmSpy).toHaveBeenCalledTimes(1)
    expect(String(confirmSpy.mock.calls[0]?.[0])).toContain('切换课题将丢弃未保存')
    expect(stubApi.workspaces.switch, '用户取消=零 IPC 零 reload（拦截即不切）').not.toHaveBeenCalled()
    expect(reloadSpy).not.toHaveBeenCalled()
    expect(document.querySelector('main .ws-page'), 'dirty 取消后留在本页（可换选）').not.toBeNull()
    confirmSpy.mockRestore()
    act(() => {
      useLineageStore.setState({ saveStatus: 'saved' })
    })
  })

  it('失败面：store error 非空时页内渲染错误行+重试，重试走 load（弹层退役后本页=error 契约唯一壳层兑现点）', async () => {
    const { useWorkspaceStore } = await import(
      '../../../src/renderer/features/workspaces/workspace.store'
    )
    mount(<App />)
    await flush()
    act(() => {
      railButton('课题')!.click()
    })
    act(() => {
      useWorkspaceStore.setState({ error: '网络不可达' })
    })
    const errRow = document.querySelector('main .ws-error')
    expect(errRow, 'error 态页内错误行在场').not.toBeNull()
    expect(errRow!.textContent).toContain('课题列表加载失败：网络不可达')
    const retry = errRow!.querySelector<HTMLButtonElement>('button.ws-retry')
    expect(retry, '重试按钮在场').not.toBeNull()
    stubApi.workspaces.list.mockClear()
    await act(async () => {
      retry!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    await flush()
    expect(stubApi.workspaces.list, '重试=重跑 list load').toHaveBeenCalled()
    act(() => {
      useWorkspaceStore.setState({ error: null })
    })
  })

  it('码点安全短名（回炉 1 d1-W5）：emoji 课题名前 4 码点截断，无孤立代理对', async () => {
    const { useWorkspaceStore } = await import(
      '../../../src/renderer/features/workspaces/workspace.store'
    )
    mount(<App />)
    await flush()
    act(() => {
      useWorkspaceStore.setState({
        items: [
          { id: 'w9', name: '💧水质孪生课题', createdAt: '2026-09-01T00:00:00Z', paperCount: 1 }
        ],
        currentId: 'w9'
      })
    })
    const label = railButton('课题')!.querySelector('.lb')!.textContent ?? ''
    // Array.from 码点切：前 4 码点=💧+水+质+孪（UTF-16 slice 会截出孤立代理 U+D83D）
    expect(label).toBe('💧水质孪')
    expect(label, '无孤立代理对（渲染替换符防线）').not.toContain('\uFFFD')
  })
})

describe('T3-P2 状态条——26px 真文本（课题名/篇数/脉络计数/已选/主题名）', () => {
  it('默认态：课题 默认课题 · 3 篇｜脉络 0 节点 / 0 连线｜已选 0｜主题：白天 · 精密仪表', async () => {
    mount(<App />)
    await flush()
    const bar = document.querySelector('footer.app-statusbar')
    expect(bar, 'footer.app-statusbar 在场').not.toBeNull()
    expect(bar!.textContent).toContain('课题 默认课题 · 3 篇')
    expect(bar!.textContent).toContain('脉络 0 节点 / 0 连线')
    expect(bar!.textContent).toContain('已选 0')
    expect(bar!.textContent).toContain('主题：白天 · 精密仪表')
    expect(bar!.querySelector('.sep'), '弹性分隔 .sep 在场').not.toBeNull()
  })

  it('计数随 store 变化沿：脉络 nodes/edges 与已选 1 反映到真文本', async () => {
    mount(<App />)
    await flush()
    const { useLineageStore } = await import('../../../src/renderer/features/lineage/lineage.store')
    act(() => {
      useLineageStore.setState({
        nodes: [{ id: 'n1' }, { id: 'n2' }] as never,
        edges: [{ id: 'e1' }] as never
      })
    })
    const { useLibraryStore } = await import('../../../src/renderer/features/library/library.store')
    act(() => {
      useLibraryStore.setState({ selectedId: 'p1' })
    })
    await flush()
    const bar = document.querySelector('footer.app-statusbar')!
    expect(bar.textContent, '脉络计数=store nodes/edges 长度').toContain('脉络 2 节点 / 1 连线')
    expect(bar.textContent, '已选=selectedId 0/1').toContain('已选 1')
    act(() => {
      useLineageStore.setState({ nodes: [], edges: [] })
      useLibraryStore.setState({ selectedId: null })
    })
  })
})

describe('T3-P2 gsearch——全局 Ctrl K 聚焦（keydown 挂 App，preventDefault）', () => {
  it('Ctrl+K：input 获得焦点且默认行为被拦截', async () => {
    mount(<App />)
    await flush()
    const input = document.querySelector<HTMLInputElement>('.gsearch input')!
    expect(document.activeElement).not.toBe(input)
    const ev = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true, cancelable: true })
    const spy = vi.spyOn(ev, 'preventDefault')
    act(() => {
      window.dispatchEvent(ev)
    })
    expect(document.activeElement, '全局 Ctrl K 聚焦 gsearch 输入框').toBe(input)
    expect(spy).toHaveBeenCalled()
  })

  it('提示语动态显隐（回炉 1 d1-N5）：空值显提示 span，输入后隐藏', async () => {
    mount(<App />)
    await flush()
    const input = document.querySelector<HTMLInputElement>('.gsearch input')!
    const ph = () => document.querySelector('.gsearch .ph')
    expect(ph(), '空值时提示语在场').not.toBeNull()
    // 受控输入：React onChange 经 native setter 驱动（jsdom 直接改 value+input 事件）
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    act(() => {
      setter.call(input, '管网')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(ph(), '有输入时提示语隐藏（受控显隐）').toBeNull()
  })
})

describe('T3-P2 旧面负锚——F-UI-03/nav 族零残留（方案切换=删除旧方案）', () => {
  it('.app-nav 全族/收起钮/SplitPane 手柄/切换器容器在壳层零残留', async () => {
    mount(<App />)
    await flush()
    const stale = document.querySelectorAll(
      '.app-nav, .app-nav-item, .app-nav-toggle, .app-nav-label, .app-nav-foot, .app-nav-collapsed, .app-nav-ver, .app-header-switcher, .app-nav-brand'
    )
    expect(Array.from(stale).map((e) => e.className), '旧 nav 族元素零残留').toEqual([])
    expect(document.querySelector('button[aria-label="收起导航栏"]'), '收起钮退役').toBeNull()
    expect(document.querySelector('button[aria-label="展开导航栏"]'), '展开钮退役').toBeNull()
    expect(
      document.querySelector('.app-content-row [role="separator"]'),
      '壳层不再包 SplitPane（唯一 SplitPane=阅读器侧栏，在 main 内）'
    ).toBeNull()
    expect(document.querySelector('button[aria-label="切换课题"]'), 'WorkspaceSwitcher 顶栏用法退役').toBeNull()
  })
})

describe('R2-SET1 界面缩放——App 挂载 load+--ui-scale 变量（数据通道单点）', () => {
  it('settings.uiScale=medium：挂载后 documentElement --ui-scale=1.1', async () => {
    stubApi.settings.get.mockResolvedValue({
      ok: true,
      data: { contactEmail: 'a@b.c', theme: 'light', uiScale: 'medium' }
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
      data: { contactEmail: 'a@b.c', theme: 'light', uiScale: 'large' }
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
