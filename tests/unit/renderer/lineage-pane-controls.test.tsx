// @vitest-environment jsdom
/**
 * [B5 设计稿 §3.4 侧栏单态与开关迁移/§10.2/§11.4「新 pane-controls 测试」——wave C 2026-11-25 新增]
 * use-lineage-pane-controls（页面组合层）＋LineagePaneToggles（工具栏左右开关）＋受控 LineageAsideHost。
 *
 * 锁面（always-active 裸 describe；首红后绿）：
 * - 左栏单态：唯一状态源=view.store navCollapsed；工具栏开关 toggle 以「当前 folderId＋当前宽」写
 *   per-folder prefs（nav-pane-prefs）——不只改 Zustand 而丢持久化；无第二 collapsed 态（钩子只回读 store）。
 * - 右栏单态：useSidebarPane 对象由组合层持有，同一对象喂给工具栏开关与 LineageAsideHost（宿主不再内部
 *   调用）；收起=宿主零 DOM（不占 48px 空 rail）；从工具栏恢复时读回原宽。
 * - 开关名称/aria/状态同源：展开态 testid=lineage-nav-collapse／lineage-sidebar-collapse，收起态翻转
 *   lineage-nav-expand／lineage-sidebar-expand；任一时刻同一 testid 至多一个；SVG＋sr-only 可访问名。
 * - 原窗格内无重复开关：LineageNavPane 无头部收起钮/窄条展开钮，SideCapRow 无收起钮。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub, stubApiEvents } from '../../utils/api-client-mock'

const stubApi = makeApiStub({
  folders: { list: vi.fn() },
  lineage: { graph: vi.fn(), upsertNode: vi.fn(), removeNode: vi.fn(), upsertEdge: vi.fn(), removeEdge: vi.fn(), upsertLineTypes: vi.fn() }
})
stubApiEvents({
  // NavGraphPicker 订阅面（mock 代理未覆盖键透传 undefined——直调即抛）
  onFoldersChanged: vi.fn(() => () => undefined)
})

import type { LineageNode } from '../../../src/shared/models/lineage'
import { LineageAsideHost } from '../../../src/renderer/features/lineage/LineageAsideHost'
import { LineageNavPane } from '../../../src/renderer/features/lineage/LineageNavPane'
import { LineagePaneToggles } from '../../../src/renderer/features/lineage/LineagePaneToggles'
import { SideCapRow } from '../../../src/renderer/features/lineage/SideCapRow'
import { readNavPrefs, writeNavPrefs } from '../../../src/renderer/features/lineage/nav-pane-prefs'
import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'
import { useLineageViewStore } from '../../../src/renderer/features/lineage/lineage-view.store'
import { useLineagePaneControls } from '../../../src/renderer/features/lineage/use-lineage-pane-controls'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

const NAV_NODE: LineageNode = {
  id: 'n-1', paperId: 'paper-1', title: '节点甲', year: 2024, x: null, y: null, month: 3, slot: null,
  folderId: '__main__', isStarred: false, createdAt: 't', updatedAt: 't'
}

let root: Root | null = null
let host: HTMLDivElement | null = null
let latest: ReturnType<typeof useLineagePaneControls> | null = null

/** 页面组合层装配（与 LineagePageBody 同构）：一个钩子实例，同一对象喂工具栏开关与宿主 */
function Harness(): JSX.Element {
  const panes = useLineagePaneControls()
  latest = panes
  return (
    <>
      <LineagePaneToggles navCollapsed={panes.navCollapsed} onToggleNav={panes.toggleNav} sidebar={panes.sidebar} />
      <LineageNavPane />
      <LineageAsideHost
        sidebar={panes.sidebar}
        node={null}
        onJumpToPaper={() => undefined}
        pubNo={null}
        metrics={null}
        onGotoLibrary={() => undefined}
        onGotoReader={() => undefined}
      />
    </>
  )
}

function mount(element: JSX.Element): void {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root?.render(element)
  })
}

const q = (sel: string): Element | null => host?.querySelector(sel) ?? null
const req = (sel: string): Element => {
  const el = q(sel)
  if (el === null) throw new Error(`元素未渲染：${sel}`)
  return el
}
const btn = (testid: string): HTMLButtonElement => req(`[data-testid="${testid}"]`) as HTMLButtonElement
const click = (el: Element): void => {
  act(() => {
    ;(el as HTMLElement).click()
  })
}
const flush = async (turns = 4): Promise<void> => {
  for (let i = 0; i < turns; i++) {
    await act(async () => {
      await Promise.resolve()
    })
  }
}
const navPrefsOf = (folderId: string): unknown => {
  const raw = localStorage.getItem('synapse:lineage:nav-pane')
  if (raw === null) return null
  const map = JSON.parse(raw) as Record<string, unknown>
  return Object.prototype.hasOwnProperty.call(map, folderId) ? map[folderId] : null
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  stubApi.folders.list.mockResolvedValue({
    ok: true,
    data: [
      { id: '__main__', name: '主图', position: 0, paperCount: 0 },
      { id: 'f-x', name: '测试图乙', position: 1, paperCount: 0 }
    ]
  })
  stubApi.lineage.graph.mockResolvedValue({ ok: true, data: { nodes: [], edges: [] } })
  useLineageStore.setState({
    nodes: [], edges: [], status: 'ready', error: null, saveStatus: 'clean', lastWriteError: null,
    queue: [], flushing: false, folderId: '__main__'
  })
  useLineageViewStore.setState({
    mode: 'browse', focusSet: [], navCollapsed: false, navWidth: 208, navScrollTarget: null, activeFrameKey: null
  })
  latest = null
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
  localStorage.clear()
})

describe('[B5 §3.4] use-lineage-pane-controls —— 左栏单态与 per-folder prefs 写点', () => {
  it('钩子回读 view.store（无第二 collapsed 态）：navCollapsed 初值=false；toggle 翻转 store 并以当前 folderId＋宽写 prefs', async () => {
    // 宽 260 经该图记忆预置（NavPane 挂载读取效应读回 260——直接拨 store 会被读取效应按记忆复位）
    writeNavPrefs('__main__', { width: 260, collapsed: false })
    mount(<Harness />)
    await flush()
    expect(latest!.navCollapsed).toBe(false)
    expect(latest!.navCollapsed).toBe(useLineageViewStore.getState().navCollapsed) // 同源回读
    act(() => {
      latest!.toggleNav()
    })
    expect(useLineageViewStore.getState().navCollapsed).toBe(true)
    expect(latest!.navCollapsed).toBe(true)
    expect(navPrefsOf('__main__'), 'toggle 写 per-folder prefs（不只改 Zustand）').toEqual({ width: 260, collapsed: true })
    expect(readNavPrefs('__main__')).toEqual({ width: 260, collapsed: true })
    act(() => {
      latest!.toggleNav()
    })
    expect(useLineageViewStore.getState().navCollapsed).toBe(false)
    expect(navPrefsOf('__main__')).toEqual({ width: 260, collapsed: false })
  })

  it('toggle 写入当时的活动图（切图后写目标图 prefs，不串到离场图）', async () => {
    mount(<Harness />)
    await flush()
    act(() => {
      latest!.toggleNav()
    })
    expect(navPrefsOf('__main__')).toEqual({ width: 208, collapsed: true })
    expect(navPrefsOf('f-x')).toBeNull()
    act(() => {
      useLineageStore.setState({ folderId: 'f-x' })
    })
    await flush() // NavPane per-folder 读取效应：f-x 无记忆→缺省展开
    expect(useLineageViewStore.getState().navCollapsed).toBe(false)
    act(() => {
      latest!.toggleNav()
    })
    expect(navPrefsOf('f-x')).toEqual({ width: 208, collapsed: true })
    expect(navPrefsOf('__main__'), '离场图记忆不变').toEqual({ width: 208, collapsed: true })
  })
})

describe('[B5 §3.4/§10.2] LineagePaneToggles —— 左右开关名称/aria/状态同源', () => {
  it('展开态：左=lineage-nav-collapse「收起导航窗格」、右=lineage-sidebar-collapse「收起详情面板」；svg＋sr-only＋公共钮类', async () => {
    mount(<Harness />)
    await flush()
    for (const [id, label] of [['lineage-nav-collapse', '收起导航窗格'], ['lineage-sidebar-collapse', '收起详情面板']] as const) {
      const el = btn(id)
      expect(el.getAttribute('title'), `${id} title`).toBe(label)
      expect(el.getAttribute('aria-label'), `${id} aria-label 与 title 同源`).toBe(label)
      expect(el.textContent, `${id} sr-only 文本`).toBe(label)
      expect(el.querySelector('svg'), `${id} 含 svg`).not.toBeNull()
      expect(el.classList.contains('collapse-btn'), `${id} 公共钮类 collapse-btn`).toBe(true)
      expect(el.classList.contains('syn-icon-btn'), `${id} svg 规格类 syn-icon-btn`).toBe(true)
    }
    // 收起态 testid 不在场；任一时刻同一 testid 至多一个
    for (const id of ['lineage-nav-expand', 'lineage-sidebar-expand']) expect(q(`[data-testid="${id}"]`)).toBeNull()
    for (const id of ['lineage-nav-collapse', 'lineage-sidebar-collapse']) {
      expect(host?.querySelectorAll(`[data-testid="${id}"]`)).toHaveLength(1)
    }
  })

  it('左栏往返：点收起→navCollapsed=true、testid 翻为 lineage-nav-expand「展开导航窗格」→点展开→恢复', async () => {
    mount(<Harness />)
    await flush()
    click(btn('lineage-nav-collapse'))
    expect(useLineageViewStore.getState().navCollapsed).toBe(true)
    expect(q('[data-testid="lineage-nav-collapse"]'), '收起态收起钮退场').toBeNull()
    const expand = btn('lineage-nav-expand')
    expect(expand.getAttribute('aria-label')).toBe('展开导航窗格')
    expect(expand.textContent).toBe('展开导航窗格')
    expect(expand.querySelector('svg')).not.toBeNull()
    click(expand)
    expect(useLineageViewStore.getState().navCollapsed).toBe(false)
    expect(btn('lineage-nav-collapse').getAttribute('aria-label')).toBe('收起导航窗格')
    expect(q('[data-testid="lineage-nav-expand"]')).toBeNull()
  })

  it('右栏往返：点收起→sidebar.collapsed=true、testid 翻为 lineage-sidebar-expand「展开详情面板」→点展开→恢复', async () => {
    mount(<Harness />)
    await flush()
    click(btn('lineage-sidebar-collapse'))
    expect(latest!.sidebar.collapsed).toBe(true)
    expect(q('[data-testid="lineage-sidebar-collapse"]')).toBeNull()
    const expand = btn('lineage-sidebar-expand')
    expect(expand.getAttribute('aria-label')).toBe('展开详情面板')
    expect(expand.textContent).toBe('展开详情面板')
    click(expand)
    expect(latest!.sidebar.collapsed).toBe(false)
    expect(btn('lineage-sidebar-collapse').getAttribute('aria-label')).toBe('收起详情面板')
    expect(q('[data-testid="lineage-sidebar-expand"]')).toBeNull()
    // 旧 rail testid 退役（rail 已不存在——名实相符）
    expect(q('[data-testid="lineage-sidebar-rail"]')).toBeNull()
  })
})

describe('[B5 §3.4/§6.3] 收起不占空 rail＋恢复原宽＋原窗格内无重复开关', () => {
  it('左栏收起=窗格零占位（display:none）；展开读回原宽', async () => {
    // 同上：宽经记忆预置
    writeNavPrefs('__main__', { width: 272, collapsed: false })
    mount(<Harness />)
    await flush()
    const pane = req('[data-testid="lineage-nav-pane"]') as HTMLElement
    expect(pane.style.width).toBe('272px')
    click(btn('lineage-nav-collapse'))
    const hidden = req('[data-testid="lineage-nav-pane"]') as HTMLElement
    expect(hidden.style.display, '收起态不占 40px 窄条').toBe('none')
    expect(q('[data-testid="lineage-nav-collapse"]'), '窄条展开钮不渲染').toBeNull()
    click(btn('lineage-nav-expand'))
    expect((req('[data-testid="lineage-nav-pane"]') as HTMLElement).style.width).toBe('272px') // 记忆宽恢复
  })

  it('右栏收起=宿主零 DOM（不占 48px 空 rail）；展开读回收起前的宽', async () => {
    mount(<Harness />)
    await flush()
    const aside = req('[data-testid="lineage-sidebar"]') as HTMLElement
    expect(aside.style.width).toBe('252px') // useSidebarPane 缺省宽
    act(() => {
      latest!.sidebar.onResizeKey({ key: 'End', preventDefault: () => undefined } as never)
    })
    expect((req('[data-testid="lineage-sidebar"]') as HTMLElement).style.width).toBe('480px')
    click(btn('lineage-sidebar-collapse'))
    expect(q('[data-testid="lineage-sidebar"]'), '收起态宿主零 DOM').toBeNull()
    expect(q('[data-testid="lineage-sidebar-rail"]'), '旧 48px 窄条退役').toBeNull()
    click(btn('lineage-sidebar-expand'))
    expect((req('[data-testid="lineage-sidebar"]') as HTMLElement).style.width, '恢复读回原宽').toBe('480px')
  })

  it('原窗格内无重复开关：LineageNavPane 无头部收起钮/展开钮；SideCapRow 无收起钮', async () => {
    mount(<Harness />)
    await flush()
    const navPane = req('[data-testid="lineage-nav-pane"]')
    expect(navPane.querySelectorAll('button')).toHaveLength(1) // 仅图/文件夹下拉钮
    expect(navPane.querySelector('[data-testid="lineage-nav-collapse"]')).toBeNull()
    expect(navPane.querySelector('[data-testid="lineage-nav-expand"]')).toBeNull()
    expect(navPane.querySelector('.nav-head')).toBeNull()
    act(() => {
      root?.unmount()
    })
    mount(<SideCapRow node={NAV_NODE} pubNo={1} />)
    await flush()
    expect(q('.insp-cap')?.textContent).toContain('节点详情')
    expect(q('[data-testid="lineage-sidebar-collapse"]'), 'SideCapRow 内旧收起钮零在场').toBeNull()
    expect(q('.insp-cap [data-testid="panel-star"]'), '骑缝行星标在场').not.toBeNull()
    expect(q('.insp-cap')?.querySelectorAll('button'), '骑缝行零 button 元素（收起钮退役；星标为 span 承载）').toHaveLength(0)
    expect(q('.insp-cap')?.querySelectorAll('[role="button"]'), '骑缝行恰一个可点面=星标').toHaveLength(1)
  })
})
