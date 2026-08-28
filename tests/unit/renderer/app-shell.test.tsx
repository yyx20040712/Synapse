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
 * getByRole name 断言面）与品牌文本 'Synapse Remake'（smoke.spec:22
 * getByText 断言面——mockup 的 'Synapse' 短名让位给测试面稳定，预裁③口径）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type * as clientModule from '../../../src/renderer/api/client'

const { stubApi } = vi.hoisted(() => ({
  stubApi: {
    lineage: { graph: vi.fn() },
    library: { list: vi.fn() },
    system: { setQuitDirty: vi.fn() },
    workspaces: { list: vi.fn() }
  }
}))

vi.mock('../../../src/renderer/api/client', async (importOriginal) => {
  const real = await importOriginal<typeof clientModule>()
  return {
    ...real,
    api: stubApi as unknown as typeof clientModule.api,
    apiEvents: {
      onExportCorpus: vi.fn(() => () => undefined),
      onImportProgress: vi.fn(() => () => undefined)
    }
  }
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
  stubApi.system.setQuitDirty.mockReset()
  stubApi.workspaces.list.mockReset()
  Object.defineProperty(window, 'api', {
    configurable: true,
    value: { system: { setQuitDirty: stubApi.system.setQuitDirty } }
  })
  stubApi.lineage.graph.mockResolvedValue({ ok: true, data: { nodes: [], edges: [] } })
  stubApi.library.list.mockResolvedValue({ ok: true, data: { items: [], total: 0 } })
  stubApi.system.setQuitDirty.mockResolvedValue({ ok: true, data: { ok: true } })
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

describe('R3-TH1 App 壳——墨青侧栏结构锁', () => {
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

  it('品牌行（Synapse Remake）与 footer（本地学术文献管理）在侧栏内', async () => {
    mount(<App />)
    await flush()
    const nav = document.querySelector('nav')
    expect(nav, 'nav 元素在场').not.toBeNull()
    expect(nav!.textContent, "品牌文本=smoke.spec:22 getByText('Synapse Remake') 断言面——不可改短").toContain(
      'Synapse Remake'
    )
    expect(nav!.textContent, 'footer 文案（票面 P2）').toContain('本地学术文献管理')
  })
})
