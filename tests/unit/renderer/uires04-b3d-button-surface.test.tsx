// @vitest-environment jsdom
/**
 * [F-UIRES-04 批 3d] 公共钮系挂载面 —— W1 collapse-btn 双挂（nav 双钮+侧板
 * 收起钮）+W2 btn-std 设置页统一（jsdom 习语=ai-manage-tabs.test.tsx：
 * createRoot+act+makeApiStub 工厂，always-active 裸 describe——K3）。
 *
 * 锁三面（语义类/testid/aria 全零动——纯视觉类追加的防回退锁）：
 * ①侧板收起钮 className 含 collapse-btn+side-collapse-btn+syn-icon-btn
 *   三类并挂+testid 不变+onCollapse 行为链在席；
 * ②nav 展开钮/收起钮均 collapse-btn 双挂+各自语义类在席+收起→展开往返；
 * ③设置页 11 处异形钮改挂 btn-std（tab 三钮/一键装技能/记忆面六钮/取消任务/
 *   取消置顶），tab 钮 role/aria-selected 语义零动。
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
  it('①侧板收起钮：collapse-btn+side-collapse-btn+syn-icon-btn 三类并挂+testid 不变+onCollapse 链在席', () => {
    const onCollapse = vi.fn()
    mount(<SideCapRow node={capNode} pubNo={1} onCollapse={onCollapse} />)
    const btn = host?.querySelector('[data-testid="lineage-sidebar-collapse"]')
    expectClasses(btn, 'collapse-btn', 'side-collapse-btn', 'syn-icon-btn')
    ;(btn as HTMLButtonElement).click()
    expect(onCollapse).toHaveBeenCalledTimes(1)
  })

  it('②nav 双钮：收起/展开两钮均 collapse-btn 双挂+语义类在席；收起→展开往返', async () => {
    mount(<LineageNavPane />)
    await settle()
    const collapseBtn = host?.querySelector('[data-testid="lineage-nav-collapse"]')
    expectClasses(collapseBtn, 'collapse-btn', 'nav-collapse-btn', 'syn-icon-btn')
    // 收起→窄条展开钮在席（同款双挂）
    ;(collapseBtn as HTMLButtonElement).click()
    await settle()
    const expandBtn = host?.querySelector('[data-testid="lineage-nav-expand"]')
    expectClasses(expandBtn, 'collapse-btn', 'nav-expand-btn', 'syn-icon-btn')
    expect(host?.querySelector('[data-testid="lineage-nav-collapse"]'), '收起态收起钮退场').toBeNull()
    // 展开往返→收起钮回归
    ;(expandBtn as HTMLButtonElement).click()
    await settle()
    expectClasses(host?.querySelector('[data-testid="lineage-nav-collapse"]'), 'collapse-btn', 'nav-collapse-btn', 'syn-icon-btn')
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
