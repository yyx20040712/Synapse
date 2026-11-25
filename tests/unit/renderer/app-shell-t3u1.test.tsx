// @vitest-environment jsdom
/**
 * [T3-U1] UAT 批——FOUC 启动注入（App 壳消费面）。
 *
 * 落位说明：票面「app-shell.test 扩用例」；实施时 app-shell.test.tsx 有效行数
 * 已近 max-lines 500 顶（追加后 617 行=lint 红），故 T3-U1 两 describe 落
 * 本姊妹件（mock 配方沿 app-quit-dirty.test.tsx / app-shell.test.tsx 同型，
 * harness 复制不共享——受锁件禁为复用改面）。文件名沿 T3-U1 工单名不改。
 *
 * [B5 wave C 2026-11-25——用户裁决：App 底部状态条整删（设计稿外）] 原①「状态条自动
 * 保存槽」describe（worst-of 聚合三态真文本/null 省略共 8 例）随状态条删除——
 * 聚合宿主 AppStatusBarHost 与 StatusBar 哑件同批整删，槽面无承接面。本件现只承载②。
 *
 * FOUC：jsdom 模拟「挂载前 attr 已在场」＝theme-boot.js 首帧写入位；载入
 * 在途窗不回退=零闪烁的行为契约面（真首帧时序面=实机，INV-71）。
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
  // client 门面）——jsdom 下 stub（沿 app-shell.test 同型）
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
        { id: 'w1', name: '默认课题', createdAt: '2026-08-28T00:00:00Z', paperCount: 3 }
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
  // 模块级 store 跨 mount 存留：显式复位防跨测污染（沿 app-shell.test 尾注先例）
})

describe('T3-U1 FOUC 启动注入——挂载前 attr 已在场+运行时单点真源', () => {
  afterEach(() => {
    delete document.documentElement.dataset.theme
  })

  it('挂载前 attr=sepia（启动注入）+settings 同值：载入在途窗不回退，载入后保持 sepia', async () => {
    // 模拟 theme-boot 首帧写入（挂载前 attr 已在场）
    document.documentElement.dataset.theme = 'sepia'
    // 模块级 settings store 跨 mount 存留：显式归零模拟「未载入」态（沿
    // app-shell.test 受锁用例「settings 未载入」同款先例）
    const { useSettingsStore } = await import('../../../src/renderer/features/settings/settings.store')
    act(() => {
      useSettingsStore.setState({ settings: null })
    })
    // settings.get 悬置（载入在途窗——mount effect 先跑、值未回）
    let resolveGet!: (v: unknown) => void
    stubApi.settings.get.mockImplementation(
      () => new Promise((resolve) => { resolveGet = resolve })
    )
    mount(<App />)
    await act(async () => { await Promise.resolve() })
    expect(
      document.documentElement.dataset.theme,
      '载入在途窗不得用兜底档覆写启动注入值（sepia→light→sepia=残余闪烁）'
    ).toBe('sepia')
    resolveGet({ ok: true, data: { contactEmail: 'a@b.c', theme: 'sepia', uiScale: 'small' } })
    await flush()
    expect(document.documentElement.dataset.theme, '载入后与 settings 一致（INV-71 两者值一致）').toBe('sepia')
  })

  it('注入值与 settings 漂移（light→sepia）→ App effect 收口为 settings 值（运行时单点真源）', async () => {
    document.documentElement.dataset.theme = 'light'
    const { useSettingsStore } = await import('../../../src/renderer/features/settings/settings.store')
    act(() => {
      useSettingsStore.setState({ settings: null })
    })
    stubApi.settings.get.mockResolvedValue({
      ok: true,
      data: { contactEmail: 'a@b.c', theme: 'sepia', uiScale: 'small' }
    })
    mount(<App />)
    await flush()
    expect(
      document.documentElement.dataset.theme,
      '载入后 dataset.theme=settings 值（effect 单点收口——启动注入仅首帧兜底）'
    ).toBe('sepia')
  })
})
