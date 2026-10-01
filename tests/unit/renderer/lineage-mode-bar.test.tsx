// @vitest-environment jsdom
/**
 * [F-LGRAPH-01①U3] LineageModeBar —— 顶部三模式分段控件（mockup §3.1：
 * 图标+文字 笔/手掌/焦点框；当前态 accent 底白字[.on 类承载——色值归 CSS]；
 * 右侧=当前图名 mono 小字；focus 模式「聚焦 N」计数角标）。
 * always-active（不经 guardedDescribe）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { LineageModeBar } from '../../../src/renderer/features/lineage/LineageModeBar'
import { useLineageViewStore } from '../../../src/renderer/features/lineage/lineage-view.store'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
let host: HTMLDivElement | null = null

function mount(graphName?: string): void {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root?.render(<LineageModeBar graphName={graphName} />)
  })
}

const btn = (testid: string): HTMLButtonElement =>
  host?.querySelector(`[data-testid="${testid}"]`) as HTMLButtonElement

beforeEach(() => {
  useLineageViewStore.setState({ mode: 'browse', focusSet: [], navCollapsed: false, navWidth: 208 })
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
})

describe('F-LGRAPH-01①U3 LineageModeBar —— 三键分段控件', () => {
  it('三键渲染（编辑/浏览/聚焦）+P-1 缺省 browse 态 .on；图名 mono 小字（props 注入）', () => {
    mount('调研计划')
    expect(host?.querySelector('[data-testid="lineage-mode-bar"]')).not.toBeNull()
    expect(btn('lineage-mode-edit').textContent).toContain('编辑')
    expect(btn('lineage-mode-browse').textContent).toContain('浏览')
    expect(btn('lineage-mode-focus').textContent).toContain('聚焦')
    expect(btn('lineage-mode-browse').classList.contains('on')).toBe(true)
    expect(btn('lineage-mode-edit').classList.contains('on')).toBe(false)
    expect(host?.querySelector('[data-testid="lineage-mode-bar"] svg')?.querySelectorAll('*').length ?? 0)
      .toBeGreaterThan(0) // 图标面（笔/手掌/焦点框——SVG 真渲染）
    const name = host?.querySelector('[data-testid="lineage-graph-title"]')
    expect(name?.textContent).toBe('调研计划')
    expect(name?.classList.contains('mono')).toBe(true)
  })

  it('点击编辑→mode=edit+.on 迁移；点击聚焦→focus；再点聚焦=no-op 保持（T1）', () => {
    mount()
    act(() => {
      btn('lineage-mode-edit').click()
    })
    expect(useLineageViewStore.getState().mode).toBe('edit')
    expect(btn('lineage-mode-edit').classList.contains('on')).toBe(true)
    act(() => {
      btn('lineage-mode-focus').click()
    })
    expect(useLineageViewStore.getState().mode).toBe('focus')
    act(() => {
      btn('lineage-mode-focus').click() // T1：再点聚焦=no-op
    })
    expect(useLineageViewStore.getState().mode).toBe('focus')
  })

  it('聚焦计数角标：focus 模式且集非空→「聚焦 N」实时；空集/非 focus 模式不显示', () => {
    mount()
    expect(host?.querySelector('[data-testid="lineage-focus-count"]')).toBeNull() // browse 不显示
    act(() => {
      btn('lineage-mode-focus').click()
    })
    expect(host?.querySelector('[data-testid="lineage-focus-count"]')).toBeNull() // focus 空集不显示
    act(() => {
      useLineageViewStore.getState().toggleFocus('A')
    })
    expect(host?.querySelector('[data-testid="lineage-focus-count"]')?.textContent).toBe('聚焦 1')
    act(() => {
      useLineageViewStore.getState().toggleFocus('B')
    })
    expect(host?.querySelector('[data-testid="lineage-focus-count"]')?.textContent).toBe('聚焦 2')
    act(() => {
      useLineageViewStore.getState().toggleFocus('A')
    })
    expect(host?.querySelector('[data-testid="lineage-focus-count"]')?.textContent).toBe('聚焦 1') // toggle 即变
  })
})
