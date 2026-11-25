// @vitest-environment jsdom
/**
 * [F-LGRAPH-01①U3] LineageModeBar —— 顶部三模式分段控件（mockup §3.1：
 * 图标+文字 笔/手掌/焦点框；当前态 accent 底白字[.on 类承载——色值归 CSS]；
 * focus 模式「聚焦 N」计数角标）。
 * [B5 设计稿 §3.1/§2.2 #12/#13/§2.3/§11.2——wave C 2026-11-25 断言翻转] 图名移出模式栏
 * （由父工具栏在规定槽位承载——图名断言迁 lineage-toolbar-session/lineage-timeline-page；
 * 本件锁「模式栏不再承载图名」）；同文件导出 LineageFocusClearButton（testid
 * lineage-focus-clear）=唯一用户显式清空当前图的入口：可用=focus ∧ 集非空 ∧ 图 ready；
 * 点击只清当前图、停留 focus、计数消失、钮转禁用；非 ready 禁用。
 * always-active（不经 guardedDescribe）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { LineageFocusClearButton, LineageModeBar } from '../../../src/renderer/features/lineage/LineageModeBar'
import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'
import { useLineageViewStore } from '../../../src/renderer/features/lineage/lineage-view.store'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
let host: HTMLDivElement | null = null

/** 模式栏+清空聚焦子件并挂（清空聚焦由父工具栏在规定槽位渲染——本件以同排并挂代位，行为面全在子件） */
function mount(): void {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root?.render(
      <>
        <LineageModeBar />
        <LineageFocusClearButton />
      </>
    )
  })
}

const btn = (testid: string): HTMLButtonElement =>
  host?.querySelector(`[data-testid="${testid}"]`) as HTMLButtonElement
const clearBtn = (): HTMLButtonElement | null => host?.querySelector('[data-testid="lineage-focus-clear"]') ?? null
const focusCount = (): string | null | undefined =>
  host?.querySelector('[data-testid="lineage-focus-count"]')?.textContent
const toggleFocus = (id: string): void => {
  act(() => {
    useLineageViewStore.getState().toggleFocus(id)
  })
}

beforeEach(() => {
  useLineageStore.setState({ status: 'ready' })
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
  it('三键渲染（编辑/浏览/聚焦）+P-1 缺省 browse 态 .on；[B5 §3.1 断言翻转] 模式栏不再承载图名', () => {
    mount()
    expect(host?.querySelector('[data-testid="lineage-mode-bar"]')).not.toBeNull()
    expect(btn('lineage-mode-edit').textContent).toContain('编辑')
    expect(btn('lineage-mode-browse').textContent).toContain('浏览')
    expect(btn('lineage-mode-focus').textContent).toContain('聚焦')
    expect(btn('lineage-mode-browse').classList.contains('on')).toBe(true)
    expect(btn('lineage-mode-edit').classList.contains('on')).toBe(false)
    expect(host?.querySelector('[data-testid="lineage-mode-bar"] svg')?.querySelectorAll('*').length ?? 0)
      .toBeGreaterThan(0) // 图标面（笔/手掌/焦点框——SVG 真渲染）
    // [B5 §3.1] 图名=父工具栏槽位（单排顺序：…｜清空聚焦｜图名｜…），模式栏内零图名节点
    expect(host?.querySelector('[data-testid="lineage-graph-title"]')).toBeNull()
    expect(host?.querySelector('.lg-modebar')?.textContent).not.toContain('主图')
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

describe('[B5 §2.2 #12/#13/§2.3] LineageFocusClearButton —— 唯一用户显式清空当前图的入口', () => {
  it('受控锚：testid=lineage-focus-clear，可访问名「清空聚焦」', () => {
    mount()
    expect(clearBtn()).not.toBeNull()
    expect(clearBtn()!.textContent).toBe('清空聚焦')
  })

  it('可用性：browse/edit 禁用；focus 空集禁用；focus ∧ 集非空 ∧ 图 ready 可用', () => {
    mount()
    expect(clearBtn()!.disabled, 'browse：禁用').toBe(true)
    act(() => {
      btn('lineage-mode-edit').click()
    })
    toggleFocus('A') // edit 态 toggleFocus=no-op（非 focus 不收聚焦事件）
    expect(useLineageViewStore.getState().focusSet).toEqual([])
    act(() => {
      btn('lineage-mode-focus').click()
    })
    expect(clearBtn()!.disabled, 'focus 空集：禁用').toBe(true)
    toggleFocus('A')
    toggleFocus('B')
    expect(clearBtn()!.disabled, 'focus ∧ 集非空 ∧ ready：可用').toBe(false)
    // 切到 browse 再回 focus：集保留（不同模式切换不清集合）→钮仍可用
    act(() => {
      btn('lineage-mode-browse').click()
    })
    expect(clearBtn()!.disabled, 'browse：禁用（集保留但不可用）').toBe(true)
    act(() => {
      btn('lineage-mode-focus').click()
    })
    expect(clearBtn()!.disabled).toBe(false)
  })

  it('点击=只清当前图、停留 focus、计数消失、钮转禁用；再次聚焦后恢复可用', () => {
    mount()
    act(() => {
      btn('lineage-mode-focus').click()
    })
    toggleFocus('A')
    toggleFocus('B')
    expect(focusCount()).toBe('聚焦 2')
    act(() => {
      clearBtn()!.click()
    })
    expect(useLineageViewStore.getState().focusSet).toEqual([])
    expect(useLineageViewStore.getState().mode, '点击后停留 focus（空聚焦合法）').toBe('focus')
    expect(focusCount()).toBeUndefined() // 计数节点消失
    expect(clearBtn()!.disabled).toBe(true)
    toggleFocus('C') // 再聚焦其他卡可用
    expect(useLineageViewStore.getState().focusSet).toEqual(['C'])
    expect(focusCount()).toBe('聚焦 1')
    expect(clearBtn()!.disabled).toBe(false)
  })

  it('[B5 §2.2 #23/§2.3] 图非 ready：即使 focus 且集非空，清空聚焦钮禁用（模式与集合保留）', () => {
    mount()
    act(() => {
      btn('lineage-mode-focus').click()
    })
    toggleFocus('A')
    expect(clearBtn()!.disabled).toBe(false)
    act(() => {
      useLineageStore.setState({ status: 'loading' })
    })
    expect(clearBtn()!.disabled, 'graph loading：禁用').toBe(true)
    expect(useLineageViewStore.getState().mode, '图状态切换不清内存会话').toBe('focus')
    expect(useLineageViewStore.getState().focusSet).toEqual(['A'])
    act(() => {
      useLineageStore.setState({ status: 'error' })
    })
    expect(clearBtn()!.disabled, 'graph error：禁用').toBe(true)
    act(() => {
      useLineageStore.setState({ status: 'ready' })
    })
    expect(clearBtn()!.disabled, 'ready：恢复可用').toBe(false)
  })
})
