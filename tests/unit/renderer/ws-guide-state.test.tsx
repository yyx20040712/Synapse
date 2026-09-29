// @vitest-environment jsdom
/**
 * [F-WS-02] 默认课题引导态（INV-87）App 级锁定测试（always-active，不经
 * guardedDescribe）——App 全挂载（Rail 禁用/状态条待选择/导入升格桥都在
 * 组合根，须挂真 App 非 WorkspacesPage 单件）。
 *
 * 拆件先例=app-shell-t3u1.test.tsx（App 级同域拆件——app-shell.test.tsx
 * max-lines 防线）；mock 配方沿 app-shell.test.tsx（makeApiStub+mount/flush/
 * railButton 同型）。
 *
 * 锁行为面（D2 批语「默认课题显示为待选择，其余听你的」）：
 * - 三条件（id=default ∧ paperCount=0 ∧ name=默认名[DEFAULT_WS_NAME 单源]）
 *   成立：课题钮 label=待选择（仍可用=引导出路）、下方五钮全 disabled、
 *   状态条课题名=待选择
 * - 升格三路：改名/导入计数/切非 default——任一打破即解禁+实名显示
 * - 导入升格桥（App 组合根）：引导态∧library total>0 → 重拉 workspaces
 *   list（paperCount 刷新→解禁）；跨格导入中（total 仍 0）不重拉禁用保持；
 *   象限③升格态计数变化不重拉（桥仅引导态窗口内触发——R1 补）
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

/** rail 内按 aria-label 取按钮（app-shell.test 同型——e2e 断言面同源） */
function railButton(label: string): HTMLButtonElement | null {
  const rail = document.querySelector('nav.rail')
  return Array.from(rail?.querySelectorAll('button') ?? []).find(
    (b) => b.getAttribute('aria-label') === label
  ) ?? null
}

/** 常态清单形状（升格态复位用——与 stub 默认回填同形） */
const NORMAL_ITEMS = [
  { id: 'w1', name: '默认课题', createdAt: '2026-08-28T00:00:00Z', paperCount: 3 },
  { id: 'w2', name: '智慧水务水质模型课题', createdAt: '2026-08-29T00:00:00Z', paperCount: 7 }
]

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
  // App 组合根与 TitleBarControls 直用 window.api/window.apiEvents——jsdom stub
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
    data: { items: NORMAL_ITEMS, currentId: 'w1' }
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
})

describe('F-WS-02 引导态（INV-87）——rail 禁用浅色+待选择显示+升格三路', () => {
  /** 引导态形状：default+0 篇+默认名（三条件全成立） */
  const GUIDE_DEFAULT = { id: 'default', name: '默认课题', createdAt: '2026-01-01T00:00:00Z', paperCount: 0 }

  /** 引导态注入+复位助手（store 模块级跨 mount 存留——每用例显式复位） */
  async function setWsItems(items: typeof NORMAL_ITEMS, currentId: string): Promise<void> {
    const { useWorkspaceStore } = await import(
      '../../../src/renderer/features/workspaces/workspace.store'
    )
    act(() => {
      useWorkspaceStore.setState({ items, currentId })
    })
  }

  it('三条件成立：课题钮 label=待选择（仍可用=引导出路）、下方五钮全 disabled；状态条课题名=待选择', async () => {
    mount(<App />)
    await flush()
    await setWsItems([GUIDE_DEFAULT], 'default')
    const wsBtn = railButton('课题')!
    expect(wsBtn.querySelector('span.lb')!.textContent, '课题名显示位=待选择（不显示默认课题字样——D2 批语）').toBe('待选择')
    expect(wsBtn.disabled, '课题钮=引导出路恒可用（路由管理页）').toBe(false)
    for (const label of ['下载', '文献库', '阅读器', '脉络', '设置']) {
      expect(railButton(label)!.disabled, `引导态 rail「${label}」全禁用（D2 下方按钮全禁用）`).toBe(true)
    }
    const bar = document.querySelector('footer.app-statusbar')!
    expect(bar.textContent, '状态条课题名=待选择').toContain('课题 待选择 · 0 篇')
    await setWsItems(NORMAL_ITEMS, 'w1')
  })

  it('升格三路：改名（名≠默认名）/导入计数（paperCount>0）/切非 default——任一打破即解禁+实名显示', async () => {
    mount(<App />)
    await flush()
    // 路 1：改名打破（名≠默认名单源常量）
    await setWsItems([{ ...GUIDE_DEFAULT, name: '我的课题' }], 'default')
    expect(railButton('文献库')!.disabled, '改名后解禁（升格）').toBe(false)
    expect(railButton('课题')!.querySelector('.lb')!.textContent, '升格后实名显示').toBe('我的课题')
    // 路 2：导入计数打破（paperCount>0，名未改）
    await setWsItems([{ ...GUIDE_DEFAULT, paperCount: 3 }], 'default')
    expect(railButton('设置')!.disabled, 'paperCount>0 后解禁（升格）').toBe(false)
    expect(railButton('课题')!.querySelector('.lb')!.textContent, '升格后实名显示（默认课题=实名）').toBe('默认课题')
    // 路 3：切非 default 课题打破（currentId≠default）
    await setWsItems([GUIDE_DEFAULT, NORMAL_ITEMS[1]!], 'w2')
    expect(railButton('阅读器')!.disabled, '切非 default 后解禁').toBe(false)
    expect(railButton('课题')!.querySelector('.lb')!.textContent, '当前课题短名（前 4 字符）').toBe('智慧水务')
    await setWsItems(NORMAL_ITEMS, 'w1')
  })

  it('导入升格桥：引导态+library total>0 → App 组合根重拉 workspaces list（计数刷新→解禁——D2 导入过文献即升格）', async () => {
    const { useLibraryStore } = await import('../../../src/renderer/features/library/library.store')
    mount(<App />)
    await flush()
    await setWsItems([GUIDE_DEFAULT], 'default')
    expect(railButton('文献库')!.disabled, '桥前引导态禁用在场').toBe(true)
    // 导入落地：library total 0→2（LibraryPage onImported→library.load 链的终态信号）
    stubApi.workspaces.list.mockClear()
    stubApi.workspaces.list.mockResolvedValue({
      ok: true,
      data: { items: [{ ...GUIDE_DEFAULT, paperCount: 2 }], currentId: 'default' }
    })
    act(() => {
      useLibraryStore.setState({ total: 2 })
    })
    await flush()
    expect(stubApi.workspaces.list, '导入后组合根重拉课题清单（paperCount 刷新）').toHaveBeenCalledTimes(1)
    expect(railButton('文献库')!.disabled, '计数刷新>0→解禁（升格三路之导入路）').toBe(false)
    expect(railButton('课题')!.querySelector('.lb')!.textContent, '升格后实名显示').toBe('默认课题')
    // 复位防跨测污染（ws+library 两 store）
    act(() => {
      useLibraryStore.setState({ total: 0 })
    })
    await setWsItems(NORMAL_ITEMS, 'w1')
  })

  it('跨格：导入中（library total 仍 0）不重拉清单、禁用保持——升格只认导入落地', async () => {
    const { useLibraryStore } = await import('../../../src/renderer/features/library/library.store')
    act(() => {
      useLibraryStore.setState({ total: 0 })
    })
    mount(<App />)
    await flush()
    // mockClear 前移（R1——d1-W1/k1-W2：清于引导态注入之前，使 setWsItems 触发
    // 的 effect 运行落入断言窗口——「删 total 条件」变异（if(wsGuide)）在此翻红）
    stubApi.workspaces.list.mockClear()
    await setWsItems([GUIDE_DEFAULT], 'default')
    await flush()
    expect(stubApi.workspaces.list, '导入中（total 仍 0）不重拉清单').not.toHaveBeenCalled()
    expect(railButton('文献库')!.disabled, '导入中禁用保持（跨格：在途×禁用态）').toBe(true)
    expect(railButton('课题')!.querySelector('.lb')!.textContent, '导入中仍待选择').toBe('待选择')
    await setWsItems(NORMAL_ITEMS, 'w1')
  })

  it('象限③：升格态（非引导）∧ library total 0→N → 不重拉清单——桥仅在引导态窗口内触发（R1 补，k1-W2：删 wsGuide 条件变异在此翻红）', async () => {
    const { useLibraryStore } = await import('../../../src/renderer/features/library/library.store')
    mount(<App />)
    await flush()
    // 升格态复位（guide=false）——窗口外计数变化不触发桥（频率最小化语义）
    await setWsItems(NORMAL_ITEMS, 'w1')
    stubApi.workspaces.list.mockClear()
    act(() => {
      useLibraryStore.setState({ total: 5 })
    })
    await flush()
    expect(stubApi.workspaces.list, '非引导态计数变化不重拉清单').not.toHaveBeenCalled()
    expect(railButton('文献库')!.disabled, '升格态本就解禁').toBe(false)
    act(() => {
      useLibraryStore.setState({ total: 0 })
    })
    await setWsItems(NORMAL_ITEMS, 'w1')
  })
})
