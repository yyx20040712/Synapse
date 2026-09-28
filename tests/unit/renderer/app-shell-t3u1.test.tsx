// @vitest-environment jsdom
/**
 * [T3-U1] UAT 批——状态条自动保存槽+FOUC 启动注入（App 壳消费面）。
 *
 * 落位说明：票面「app-shell.test 扩用例」；实施时 app-shell.test.tsx 有效行数
 * 已近 max-lines 500 顶（追加后 617 行=lint 红），故 T3-U1 两 describe 落
 * 本姊妹件（mock 配方沿 app-quit-dirty.test.tsx / app-shell.test.tsx 同型，
 * harness 复制不共享——受锁件禁为复用改面）。
 *
 * ①自动保存槽：App 组合根 worst-of 聚合（tab 双源分档 ∪ lineage saveStatus，
 * 回炉 R2/W3 终裁：annotations dirty=真失败残留→error 档；notes pending=
 * 在途+失败混合[edit 置 true/save 成功清/失败不动]→saving 档「保存中…」=
 * 未落库统称——打字防抖窗禁假警报）→三态真文本注入 StatusBar 哑件；
 * null（无可写面信号）槽省略——禁假数据（无时间戳）。
 * ②FOUC：jsdom 模拟「挂载前 attr 已在场」＝theme-boot.js 首帧写入位；载入
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

describe('T3-U1 状态条自动保存槽——worst-of 三态真文本（saved/saving/error/null 省略）', () => {
  afterEach(async () => {
    const { useReaderStore } = await import('../../../src/renderer/features/reader/state/reader.store')
    const { useNotesStore } = await import('../../../src/renderer/features/notes/notes.store')
    const { useLineageStore } = await import('../../../src/renderer/features/lineage/lineage.store')
    act(() => {
      useReaderStore.setState({ order: [], tabs: {} })
      useNotesStore.setState({ noteByPaper: {} })
      useLineageStore.setState({ saveStatus: 'saved' })
    })
  })

  /** 开一个 reader tab（dirty=标注保存失败残留位）；store 局部 setState */
  async function openTab(paperId: string, dirty: boolean): Promise<void> {
    const { useReaderStore } = await import('../../../src/renderer/features/reader/state/reader.store')
    act(() => {
      useReaderStore.setState({
        order: [paperId],
        tabs: { [paperId]: { paperId, dirty } }
      } as never)
    })
  }

  it('saved 格：tab 在场全干净（lineage saved）→「自动保存 · 已保存」', async () => {
    mount(<App />)
    await flush()
    await openTab('p1', false)
    const bar = document.querySelector('footer.app-statusbar')!
    expect(bar.textContent, '可写面在场且干净=已保存（真文本——无时间戳）').toContain('自动保存 · 已保存')
  })

  it('saving 格：lineage saveStatus=saving →「自动保存 · 保存中…」', async () => {
    mount(<App />)
    await flush()
    await openTab('p1', false)
    const { useLineageStore } = await import('../../../src/renderer/features/lineage/lineage.store')
    act(() => {
      useLineageStore.setState({ saveStatus: 'saving' })
    })
    const bar = document.querySelector('footer.app-statusbar')!
    expect(bar.textContent, 'lineage 写面在飞=保存中…').toContain('自动保存 · 保存中…')
  })

  it('error 格（lineage）：saveStatus=error →「自动保存 · 保存失败」且槽挂 .sig（--signal 色）', async () => {
    mount(<App />)
    await flush()
    await openTab('p1', false)
    const { useLineageStore } = await import('../../../src/renderer/features/lineage/lineage.store')
    act(() => {
      useLineageStore.setState({ saveStatus: 'error' })
    })
    const bar = document.querySelector('footer.app-statusbar')!
    const slot = Array.from(bar.querySelectorAll('span')).find((s) => s.textContent?.includes('自动保存'))
    expect(slot?.textContent, 'lineage 写失败=保存失败').toContain('自动保存 · 保存失败')
    expect(slot?.classList.contains('sig'), '失败档挂 .sig（--signal 色——theme-shell.css 类）').toBe(true)
  })

  it('error 格（tabDirty）：TabState.dirty（标注失败残留）压过 lineage saved →「自动保存 · 保存失败」', async () => {
    mount(<App />)
    await flush()
    await openTab('p1', true)
    const bar = document.querySelector('footer.app-statusbar')!
    expect(bar.textContent, 'tabDirty（保存失败残留语义）=worst-of 最重档').toContain('自动保存 · 保存失败')
  })

  it('saving 格（notes pending，W3 终裁分档）：pending=在途+失败混合（edit 置 true/save 成功清/失败不动——打字防抖窗常 true）→「保存中…」非假警报', async () => {
    mount(<App />)
    await flush()
    await openTab('p1', false)
    const { useNotesStore } = await import('../../../src/renderer/features/notes/notes.store')
    act(() => {
      useNotesStore.setState({ noteByPaper: { p1: { pending: true } } } as never)
    })
    const bar = document.querySelector('footer.app-statusbar')!
    expect(bar.textContent, '未落库统称=保存中…（打字期不得显红色保存失败）').toContain('自动保存 · 保存中…')
    expect(bar.textContent, 'pending 非失败残留——禁 error 假警报（W3 双席同中警告）').not.toContain('保存失败')
  })

  it('worst-of 跨格：annoDirty(error) 压过 notePending+lineage saving →「保存失败」（error 最重）', async () => {
    mount(<App />)
    await flush()
    await openTab('p1', true)
    const { useNotesStore } = await import('../../../src/renderer/features/notes/notes.store')
    const { useLineageStore } = await import('../../../src/renderer/features/lineage/lineage.store')
    act(() => {
      useNotesStore.setState({ noteByPaper: { p1: { pending: true } } } as never)
      useLineageStore.setState({ saveStatus: 'saving' })
    })
    const bar = document.querySelector('footer.app-statusbar')!
    expect(bar.textContent, 'annotations 失败残留压在途/防抖面（worst-of 序 error > saving > saved）').toContain('自动保存 · 保存失败')
  })

  it('null 格：无 tab 且 lineage 空闲（saved）→ 槽整体省略（无可写面信号，禁假数据）', async () => {
    mount(<App />)
    await flush()
    const bar = document.querySelector('footer.app-statusbar')!
    expect(bar.textContent, '无可写面信号=槽省略（不显「已保存」造作信号）').not.toContain('自动保存')
  })

  it('lineage 独立信号格（无 tab）：saving/error 仍显槽（lineage 写面自持信号源）', async () => {
    mount(<App />)
    await flush()
    const { useLineageStore } = await import('../../../src/renderer/features/lineage/lineage.store')
    act(() => {
      useLineageStore.setState({ saveStatus: 'saving' })
    })
    const bar = document.querySelector('footer.app-statusbar')!
    expect(bar.textContent, '无 tab 但 lineage 在飞=保存中…').toContain('自动保存 · 保存中…')
    act(() => {
      useLineageStore.setState({ saveStatus: 'error' })
    })
    expect(bar.textContent, '无 tab 但 lineage 失败=保存失败').toContain('自动保存 · 保存失败')
  })
})

describe('T3-U1 FOUC 启动注入——挂载前 attr 已在场+运行时单点真源', () => {
  afterEach(() => {
    delete document.documentElement.dataset.theme
  })

  it('挂载前 attr=dark（启动注入）+settings 同值：载入在途窗不回退，载入后保持 dark', async () => {
    // 模拟 theme-boot 首帧写入（挂载前 attr 已在场）
    document.documentElement.dataset.theme = 'dark'
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
      '载入在途窗不得用兜底档覆写启动注入值（dark→light→dark=残余闪烁）'
    ).toBe('dark')
    resolveGet({ ok: true, data: { contactEmail: 'a@b.c', theme: 'dark', uiScale: 'small' } })
    await flush()
    expect(document.documentElement.dataset.theme, '载入后与 settings 一致（INV-71 两者值一致）').toBe('dark')
  })

  it('注入值与 settings 漂移（light→dark）→ App effect 收口为 settings 值（运行时单点真源）', async () => {
    document.documentElement.dataset.theme = 'light'
    const { useSettingsStore } = await import('../../../src/renderer/features/settings/settings.store')
    act(() => {
      useSettingsStore.setState({ settings: null })
    })
    stubApi.settings.get.mockResolvedValue({
      ok: true,
      data: { contactEmail: 'a@b.c', theme: 'dark', uiScale: 'small' }
    })
    mount(<App />)
    await flush()
    expect(
      document.documentElement.dataset.theme,
      '载入后 dataset.theme=settings 值（effect 单点收口——启动注入仅首帧兜底）'
    ).toBe('dark')
  })
})
