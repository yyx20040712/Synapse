// @vitest-environment jsdom
/**
 * [F-UIRES-04 批 3d] 公共钮系挂载面 —— W1 collapse-btn 双挂（nav 双钮+侧板
 * 收起钮）+W2 btn-std 设置页统一（jsdom 习语=ai-manage-tabs.test.tsx：
 * createRoot+act+makeApiStub 工厂，always-active 裸 describe——K3）。
 *
 * [B5 设计稿 §3.4/§11.4「uires04-b3d-button-surface:206-230 断言翻转」——wave C 2026-11-25]
 * ①②两例随侧栏单态迁移：原窗格内收起钮/展开钮（SideCapRow 收起钮、NavPane 头部收起钮与窄条
 * 展开钮）退役，开关迁驻工具栏 LineagePaneToggles（页面组合层 use-lineage-pane-controls 驱动）；
 * 公共钮类 collapse-btn/syn-icon-btn、SVG、sr-only/可访问名与真实往返保留为锁面，语义类
 * side-collapse-btn/nav-collapse-btn/nav-expand-btn 随窗格内双钮退役（零消费类名同删）。
 *
 * 锁三面：
 * ①侧栏开关迁工具栏：SideCapRow 内收起钮零在场；工具栏右栏开关 collapse-btn+syn-icon-btn
 *   并挂+testid lineage-sidebar-collapse+点击使受控 sidebar.collapse 生效；
 * ②左栏工具栏动态开关 collapse-btn+syn-icon-btn 并挂+收起→展开真实往返；
 * ③设置页 11 处异形钮改挂 btn-std（tab 三钮/一键装技能/记忆面六钮/取消任务/
 *   取消置顶），tab 钮 role/aria-selected 语义零动（原样保留）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub, stubApiEvents } from '../../utils/api-client-mock'

const tasksList = vi.fn()
const pinsList = vi.fn()
const memList = vi.fn()
const zcodeDetect = vi.fn()
makeApiStub({
  folders: { list: vi.fn() },
  lineage: { graph: vi.fn(), upsertNode: vi.fn(), removeNode: vi.fn(), upsertEdge: vi.fn(), removeEdge: vi.fn(), upsertLineTypes: vi.fn() },
  ai_tasks: { list: tasksList, cancel: vi.fn() },
  ai_messages: { listPinned: pinsList, setPinned: vi.fn() },
  ai_memory: { listByScope: memList, create: vi.fn(), update: vi.fn(), delete: vi.fn(), setPinned: vi.fn() },
  ai_sensor: { zcodeDetect, zcodeInstall: vi.fn() }
})
stubApiEvents({
  // NavGraphPicker 订阅面（mock 代理未覆盖键透传 undefined——直调即抛）
  onFoldersChanged: vi.fn(() => () => undefined)
})

import { SideCapRow } from '../../../src/renderer/features/lineage/SideCapRow'
import { LineageNavPane } from '../../../src/renderer/features/lineage/LineageNavPane'
import { LineagePaneToggles } from '../../../src/renderer/features/lineage/LineagePaneToggles'
import { useLineagePaneControls } from '../../../src/renderer/features/lineage/use-lineage-pane-controls'
import { ZcodeLinkSection } from '../../../src/renderer/features/settings/ZcodeLinkSection'
import { AiManageSection } from '../../../src/renderer/features/ai/manage/AiManageSection'
import { useAiMemoryStore } from '../../../src/renderer/features/ai/aiMemoryStore'
import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'
import { useLineageViewStore } from '../../../src/renderer/features/lineage/lineage-view.store'
import type { LineageNode } from '../../../src/shared/models/lineage'
import type { AiMemoryListItem, AiTask, PinnedMessageItem } from '../../../src/shared/models/ai-domain'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

/** 断言元素 className 含全部指定类（逐类点名实际值——红证可读） */
function expectClasses(el: Element | null | undefined, ...classes: string[]): void {
  expect(el, '目标元素在场').not.toBeNull()
  for (const c of classes) {
    expect(el?.classList.contains(c), `className 含 ${c}（实际=${el?.className ?? ''}）`).toBe(true)
  }
}

const capNode: LineageNode = {
  id: 'n-1',
  paperId: 'paper-1',
  title: '节点甲',
  year: 2024,
  x: null,
  y: null,
  month: 3,
  slot: null,
  folderId: '__main__',
  isStarred: false,
  createdAt: 't',
  updatedAt: 't'
}

/** 任务夹具（queued——取消钮在席面） */
function mtask(over: Partial<AiTask> = {}): AiTask {
  return {
    id: 21,
    scope: 'paper',
    anchorId: 'p-1',
    action: 'memory.create',
    status: 'queued',
    result: null,
    error: null,
    idempotencyKey: null,
    targetTitle: '管理文献甲',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...over
  }
}

/** 置顶消息夹具 */
function pin(over: Partial<PinnedMessageItem> = {}): PinnedMessageItem {
  return {
    id: 51,
    sessionId: 11,
    role: 'assistant',
    content: '置顶消息正文',
    pinned: true,
    createdAt: '2026-01-01T00:00:00Z',
    anchorTitle: '锚文献标题',
    ...over
  }
}

/** 记忆行夹具（manual——行三钮在席面） */
function mmem(over: Partial<AiMemoryListItem> = {}): AiMemoryListItem {
  return {
    id: 31,
    scope: 'global',
    anchorId: null,
    category: 'user_preference',
    label: '',
    title: '记忆甲',
    content: '内容甲',
    pinned: false,
    origin: 'manual',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    anchorTitle: null,
    ...over
  }
}

let root: Root | null = null
let host: HTMLDivElement | null = null

function mount(node: JSX.Element): void {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root?.render(node)
  })
}

/** [B5 §3.4] 页面组合层同构 harness：一个钩子实例喂工具栏开关与窗格 */
function PaneHarness(): JSX.Element {
  const panes = useLineagePaneControls()
  return (
    <>
      <LineagePaneToggles navCollapsed={panes.navCollapsed} onToggleNav={panes.toggleNav} sidebar={panes.sidebar} />
      <LineageNavPane />
    </>
  )
}

async function settle(): Promise<void> {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
  })
}

/** 点 Tab（role=tab 按钮名定位） */
function clickTab(name: string): void {
  const btn = host?.querySelector(`[role="tab"][aria-label="${name}"]`) as HTMLButtonElement | null
  btn?.click()
}

beforeEach(() => {
  vi.clearAllMocks()
  tasksList.mockImplementation(async () => ({ ok: true as const, data: { tasks: [] } }))
  pinsList.mockImplementation(async (req: { scope: string }) => ({
    ok: true as const,
    data: { items: req.scope === 'paper' ? [pin()] : [] }
  }))
  memList.mockImplementation(async () => ({ ok: true as const, data: { items: [mmem()] } }))
  zcodeDetect.mockResolvedValue({
    ok: true as const,
    data: {
      state: 'found-skill-missing',
      status: null,
      overwrite: false
    }
  })
  localStorage.clear()
  useAiMemoryStore.setState({
    panels: {},
    filters: { scope: 'global', category: '', pinnedOnly: false, query: '' },
    draft: { category: 'user_preference', title: '', content: '' },
    editing: null,
    formError: null,
    rowErrors: {},
    creating: false,
    updating: false
  })
  useLineageStore.setState({
    nodes: [],
    edges: [],
    status: 'ready',
    error: null,
    saveStatus: 'clean',
    lastWriteError: null,
    queue: [],
    flushing: false,
    folderId: '__main__'
  })
  useLineageViewStore.setState({
    mode: 'browse',
    focusSet: [],
    navCollapsed: false,
    navWidth: 208,
    navScrollTarget: null,
    activeFrameKey: null
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

describe('[F-UIRES-04 批 3d] 公共钮系挂载面——collapse-btn 双挂+btn-std 设置页统一', () => {
  it('①[B5 §3.4 断言翻转] 侧栏开关迁工具栏：SideCapRow 内收起钮零在场；工具栏右栏开关 collapse-btn+syn-icon-btn 并挂+testid 不变+点击走受控 sidebar.collapse', () => {
    mount(<SideCapRow node={capNode} pubNo={1} />)
    expect(host?.querySelector('[data-testid="lineage-sidebar-collapse"]'), 'SideCapRow 内旧收起钮退役').toBeNull()
    expect(host?.querySelector('.side-collapse-btn'), '语义类 side-collapse-btn 随窗格内收起钮退役').toBeNull()
    const sidebar = {
      width: 252,
      collapsed: false,
      onResizeStart: () => undefined,
      onResizeKey: () => undefined,
      collapse: vi.fn(),
      expand: vi.fn()
    }
    act(() => { root?.unmount() })
    root = null
    host?.remove()
    mount(<LineagePaneToggles navCollapsed={false} onToggleNav={() => undefined} sidebar={sidebar} />)
    const btn = host?.querySelector('[data-testid="lineage-sidebar-collapse"]')
    expectClasses(btn, 'collapse-btn', 'syn-icon-btn')
    expect(btn?.querySelector('svg'), '开关含 svg').not.toBeNull()
    ;(btn as HTMLButtonElement).click()
    expect(sidebar.collapse, '点击=受控收起').toHaveBeenCalledTimes(1)
    expect(sidebar.expand).not.toHaveBeenCalled()
    // 收起态：同一位置翻为展开开关（同一可访问名族）
    act(() => { root?.unmount() })
    root = null
    host?.remove()
    mount(<LineagePaneToggles navCollapsed={false} onToggleNav={() => undefined} sidebar={{ ...sidebar, collapsed: true }} />)
    const expandBtn = host?.querySelector('[data-testid="lineage-sidebar-expand"]')
    expectClasses(expandBtn, 'collapse-btn', 'syn-icon-btn')
    ;(expandBtn as HTMLButtonElement).click()
    expect(sidebar.expand, '点击=受控展开').toHaveBeenCalledTimes(1)
  })

  it('②[B5 §3.4 断言翻转] 左栏工具栏动态开关：collapse-btn+syn-icon-btn 并挂；收起→展开往返（原窗格内 nav 双钮退役）', async () => {
    mount(<PaneHarness />)
    await settle()
    const collapseBtn = host?.querySelector('[data-testid="lineage-nav-collapse"]')
    expectClasses(collapseBtn, 'collapse-btn', 'syn-icon-btn')
    expect(host?.querySelector('[data-testid="lineage-nav-pane"] button[data-testid="lineage-nav-collapse"]'), '窗格内收起钮退役').toBeNull()
    // 收起→工具栏展开开关在席（同款双挂）
    ;(collapseBtn as HTMLButtonElement).click()
    await settle()
    const expandBtn = host?.querySelector('[data-testid="lineage-nav-expand"]')
    expectClasses(expandBtn, 'collapse-btn', 'syn-icon-btn')
    expect(host?.querySelector('[data-testid="lineage-nav-collapse"]'), '收起态收起钮退场').toBeNull()
    expect(useLineageViewStore.getState().navCollapsed).toBe(true)
    // 展开往返→收起钮回归
    ;(expandBtn as HTMLButtonElement).click()
    await settle()
    expectClasses(host?.querySelector('[data-testid="lineage-nav-collapse"]'), 'collapse-btn', 'syn-icon-btn')
    expect(useLineageViewStore.getState().navCollapsed).toBe(false)
  })

  it('③a 设置页 Tab 三钮：btn-std 挂载+role/aria-selected 语义零动（点击切换）', async () => {
    mount(<AiManageSection />)
    await settle()
    const tabs = host?.querySelectorAll('[role="tab"]')
    expect(tabs?.length).toBe(3)
    const tabOf = (name: string): Element | null | undefined => host?.querySelector(`[role="tab"][aria-label="${name}"]`)
    for (const name of ['任务', '置顶消息', '记忆']) expectClasses(tabOf(name), 'btn-std')
    // 语义零动：缺省任务选中、点击置顶消息后翻转
    expect(tabOf('任务')?.getAttribute('aria-selected')).toBe('true')
    expect(tabOf('置顶消息')?.getAttribute('aria-selected')).toBe('false')
    clickTab('置顶消息')
    await settle()
    expect(tabOf('任务')?.getAttribute('aria-selected')).toBe('false')
    expect(tabOf('置顶消息')?.getAttribute('aria-selected')).toBe('true')
  })

  it('③b 一键装技能钮：btn-std 挂载+data-action 受锁锚在席', async () => {
    mount(<ZcodeLinkSection />)
    await settle()
    const btn = host?.querySelector('button[data-action="install"]')
    expect(btn?.textContent).toBe('一键装技能')
    expectClasses(btn, 'btn-std')
  })

  it('③c 记忆面六钮：搜索/新建/行三钮（编辑/置顶/删除）+编辑态两钮（保存/取消编辑）均 btn-std', async () => {
    mount(<AiManageSection />)
    await settle()
    clickTab('记忆')
    await settle()
    expectClasses(host?.querySelector('form button[type="submit"]'), 'btn-std')
    expectClasses(host?.querySelector('[aria-label="新建记忆"]'), 'btn-std')
    const row = host?.querySelector('[data-id="31"]')
    expectClasses(row?.querySelector('[aria-label="编辑"]'), 'btn-std')
    expectClasses(row?.querySelector('[aria-label="置顶"]'), 'btn-std')
    expectClasses(row?.querySelector('[aria-label="删除"]'), 'btn-std')
    // 编辑态展开：保存/取消编辑两钮
    ;(row?.querySelector('[aria-label="编辑"]') as HTMLButtonElement | null)?.click()
    await settle()
    expectClasses(host?.querySelector('[aria-label="保存"]'), 'btn-std')
    expectClasses(host?.querySelector('[aria-label="取消编辑"]'), 'btn-std')
  })

  it('③d 任务取消钮：queued 行取消任务钮 btn-std 挂载', async () => {
    tasksList.mockImplementation(async () => ({ ok: true as const, data: { tasks: [mtask()] } }))
    mount(<AiManageSection />)
    await settle()
    expectClasses(host?.querySelector('[data-id="21"] [aria-label="取消任务"]'), 'btn-std')
  })

  it('③e 取消置顶钮：置顶行钮 btn-std 挂载', async () => {
    mount(<AiManageSection />)
    await settle()
    clickTab('置顶消息')
    await settle()
    expectClasses(host?.querySelector('[data-id="51"] [aria-label="取消置顶"]'), 'btn-std')
  })
})
