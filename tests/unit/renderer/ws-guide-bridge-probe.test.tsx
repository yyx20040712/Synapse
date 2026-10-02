// @vitest-environment jsdom
/**
 * [W1 小挂账] 导入升格桥无过滤计数探针 App 级测试（always-active）——
 * ws-guide-state.test.tsx 姊妹件（受锁既有件零改动先例族；mock 配方同型）。
 *
 * 锁行为面（v87 P2-W1）：引导态+设筛选+导入不匹配文献 → library total 恒 0
 * （带筛选 load 掩蔽）→ 桥判定改用无过滤计数面（主控裁决案 a：复用
 * library.list 空查询探针——total=COUNT(*) 无过滤；禁方案 b 导入事件重拉）。
 * 载荷判别=探针请求体恰 {}（缺省查询缺省值全空）vs 带筛选查询（search 键在）。
 *
 * 负向面：探针计数 0 → 不重拉（升格只认「库内任一文献」语义）。
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
  onImportProgress: vi.fn(() => () => undefined),
  onFoldersChanged: vi.fn(() => () => undefined)
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

const flush = async (turns = 8): Promise<void> => {
  for (let i = 0; i < turns; i++) {
    await act(async () => {
      await Promise.resolve()
    })
  }
}

/** rail 内按 aria-label 取按钮（ws-guide-state.test 同型） */
function railButton(label: string): HTMLButtonElement | null {
  const rail = document.querySelector('nav.rail')
  return Array.from(rail?.querySelectorAll('button') ?? []).find(
    (b) => b.getAttribute('aria-label') === label
  ) ?? null
}

/** 引导态形状：default+0 篇+默认名（三条件全成立） */
const GUIDE_DEFAULT = { id: 'default', name: '默认课题', createdAt: '2026-01-01T00:00:00Z', paperCount: 0 }
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
  stubApi.settings.get.mockResolvedValue({
    ok: true,
    data: { contactEmail: 'a@b.c', theme: 'light', uiScale: 'small' }
  })
  stubApi.system.setQuitDirty.mockResolvedValue({ ok: true, data: { ok: true } })
  stubApi.system.windowControl.mockResolvedValue({ ok: true, data: { ok: true, maximized: false } })
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

describe('W1 导入升格桥——无过滤计数探针（筛选掩蔽态升格）', () => {
  it('引导态+带筛选 load total 恒 0+探针计数 2 → 重拉课题清单（解禁）；探针载荷=空查询', async () => {
    const { useLibraryStore } = await import('../../../src/renderer/features/library/library.store')
    const { useWorkspaceStore } = await import(
      '../../../src/renderer/features/workspaces/workspace.store'
    )
    // 列表桩分形：探针（载荷 {}，缺省键全空）= total 2；带筛选查询（search 键在）= total 0
    stubApi.library.list.mockImplementation(async (req: { search?: string }) =>
      req.search === undefined
        ? { ok: true, data: { items: [], total: 2 } }
        : { ok: true, data: { items: [], total: 0 } }
    )
    stubApi.workspaces.list.mockResolvedValue({
      ok: true,
      data: { items: [GUIDE_DEFAULT], currentId: 'default' }
    })
    mount(<App />)
    await flush()
    await act(async () => {
      useWorkspaceStore.setState({ items: [GUIDE_DEFAULT], currentId: 'default' })
    })
    await flush(4)
    stubApi.workspaces.list.mockClear()
    stubApi.library.list.mockClear()
    // 升格桩先就位（防探针重拉与桩替换竞态——重拉必须落在 paperCount 2 桩上）
    stubApi.workspaces.list.mockResolvedValue({
      ok: true,
      data: { items: [{ ...GUIDE_DEFAULT, paperCount: 2 }], currentId: 'default' }
    })
    // 设筛选（导入链 onImported→library.load 带筛选——不匹配文献 total 恒 0）
    await act(async () => {
      useLibraryStore.getState().setQuery({ search: '不匹配筛选词' })
    })
    await flush()
    expect(stubApi.library.list, '带筛选 load 已跑（total 恒 0 掩蔽态在场）').toHaveBeenCalled()
    const probeCalls = stubApi.library.list.mock.calls.filter(
      ([req]) => Object.keys(req as object).length === 0
    )
    expect(probeCalls.length, '桥以空查询探针无过滤计数（案 a）').toBeGreaterThan(0)
    // 升格重拉：清单刷新为 paperCount 2 → 解禁
    await flush(4)
    expect(stubApi.workspaces.list, '筛选掩蔽态经探针计数重拉课题清单（W1 修复面）').toHaveBeenCalled()
    expect(railButton('文献库')!.disabled, '计数刷新>0→解禁').toBe(false)
    // 复位防跨测污染（ws+library 两 store）
    await act(async () => {
      useLibraryStore.setState({ total: 0, query: { sort: 'added_desc', offset: 0, limit: 50 } })
      useWorkspaceStore.setState({ items: NORMAL_ITEMS, currentId: 'w1' })
    })
  })

  it('负向：探针计数 0（库内确无文献）→ 不重拉清单、禁用保持', async () => {
    const { useLibraryStore } = await import('../../../src/renderer/features/library/library.store')
    const { useWorkspaceStore } = await import(
      '../../../src/renderer/features/workspaces/workspace.store'
    )
    stubApi.library.list.mockResolvedValue({ ok: true, data: { items: [], total: 0 } })
    stubApi.workspaces.list.mockResolvedValue({
      ok: true,
      data: { items: [GUIDE_DEFAULT], currentId: 'default' }
    })
    mount(<App />)
    await flush()
    await act(async () => {
      useWorkspaceStore.setState({ items: [GUIDE_DEFAULT], currentId: 'default' })
    })
    await flush(4)
    stubApi.workspaces.list.mockClear()
    // [R3 形状处方] 断言窗内制造 dep 值变沿使探针入窗（原 setQuery 真实 load 被
    // act 排干微任务折叠 loading 往返→零 effect 重跑→守卫面无锁——A-mutation2
    // 绿实证）：0→5 沿挂 loading=true 门（挡 libTotal>0 直拉分支），5→0+loading
    // 落沿=「load 收尾 total=0」终态 → effect 重跑+探针入窗（空查询载荷）
    await act(async () => {
      useLibraryStore.setState({ total: 5, loading: true })
    })
    await act(async () => {
      useLibraryStore.setState({ total: 0, loading: false })
    })
    await flush(4)
    expect(stubApi.workspaces.list, '探针计数 0 不重拉（升格只认库内任一文献）').not.toHaveBeenCalled()
    expect(railButton('文献库')!.disabled, '禁用保持').toBe(true)
    await act(async () => {
      useLibraryStore.setState({ total: 0, query: { sort: 'added_desc', offset: 0, limit: 50 } })
      useWorkspaceStore.setState({ items: NORMAL_ITEMS, currentId: 'w1' })
    })
  })
})
