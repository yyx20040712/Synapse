// @vitest-environment jsdom
/**
 * [B2 批② 探针] App 拆件订阅隔离——写源变化只触达宿主，不连坐视图子树。
 *
 * 设计真相源=docs/design/2026-11-22_b2-resource-subscription.md §3.2/§3.4
 * （待判点 1 采纳方案=React Profiler onRender 计数探针）。本文件独立于
 * app-shell 族——既有真文本/结构断言零触碰。
 *
 * 计数口径（Profiler 嵌入注入的落法申报）：
 * - 生产 App 不透明，无法在 App 与 ViewHost 之间插入 Profiler。本探针经
 *   vi.mock 把 Profiler 包在**真实**页面件外（importOriginal 展开，实际渲染体
 *   零替换），经 App 生产装配挂载：视图子树见证=LibraryPage（默认视图，
 *   ViewHost 的直接子件；App 连坐重渲时它必随之重渲，故其增量=0 ⇒ ViewHost
 *   子树未重渲）。
 * - 断言用**增量**而非绝对值：StrictMode 双跑（React 18 dev 双调用）下
 *   初始计数可能翻倍，增量口径对双跑稳定。
 *
 * [B5 wave C 2026-11-25——用户裁决：App 底部状态条整删（设计稿外）] 原第二见证「状态条
 * 宿主=StatusBar」（仅 AppStatusBarHost 渲染）随状态条整删退役：每例中「状态条宿主
 * 重渲/真文本」断言随之删除；「视图子树零重渲」断言与⑥整例原样保留。原状态条见证兼任
 * 「变化确已传播」的阳性对照，其职责改由两处承载：(a) 各例的 store 状态断言（植入确已
 * 落到活动投影/registry 会话）；(b) 新增阳性对照例⓪——ViewHost 的合法 prop 变化时视图
 * 子树见证计数必须 ≥1，证明见证面在计数，从而使写源变化后的增量 0 具备判别力（恒真
 * 断言比没有测试更危险）。判别力边界（如实声明）：「写源变化不连坐视图子树」由两道
 * 防线共同成立——App 根不订阅数组本体＋ViewHost memo 纯 props；本探针锁的是该性质的
 * 终态，单独拆任一道防线不翻红（另一道仍挡住），两道同拆才红。
 *
 * 两变化沿（§3.4）：
 * ① lineage store setState nodes/edges（计数变化）→视图子树增量=0；
 * ② notes pending 翻转（annotation dirty 已在位=quitDirty 稳定，排除
 *   quitDirty prop 变化对 ViewHost 的合法重渲）→同构断言。
 *
 * 先红留档（拆件前实测计数）见报告；拆件后转绿。always-active（ADR-0017
 * 裁决 3——不经 guardedDescribe）。
 */
import { StrictMode } from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { makeApiStub, stubApiEvents } from '../../utils/api-client-mock'
import type * as LibraryPageModule from '../../../src/renderer/features/library/LibraryPage'

const renderCounts = vi.hoisted(() => ({ page: 0 }))

/** Profiler 注入：包裹真实 LibraryPage（视图子树见证），渲染体零替换 */
vi.mock('../../../src/renderer/features/library/LibraryPage', async () => {
  const React = await import('react')
  const actual = await vi.importActual<typeof LibraryPageModule>(
    '../../../src/renderer/features/library/LibraryPage'
  )
  const Actual = actual.LibraryPage
  return {
    ...actual,
    LibraryPage: (props: Parameters<typeof Actual>[0]) =>
      React.createElement(
        React.Profiler,
        { id: 'view-subtree', onRender: () => { renderCounts.page += 1 } },
        React.createElement(Actual, props)
      )
  }
})

const stubApi = makeApiStub({
  lineage: { graph: vi.fn() },
  library: { list: vi.fn() },
  settings: { get: vi.fn(), set: vi.fn() },
  system: { setQuitDirty: vi.fn(), windowControl: vi.fn() },
  workspaces: { list: vi.fn(), switch: vi.fn() },
  folders: { list: vi.fn() }
})
stubApiEvents({
  onExportCorpus: vi.fn(() => () => undefined),
  onImportProgress: vi.fn(() => () => undefined),
  onFoldersChanged: vi.fn(() => () => undefined)
})

import { App } from '../../../src/renderer/app/App'
import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'
import { useLibraryStore } from '../../../src/renderer/features/library/library.store'
import { useNotesStore } from '../../../src/renderer/features/notes/notes.store'
import { useReaderStore } from '../../../src/renderer/features/reader/state/reader.store'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
let host: HTMLDivElement | null = null

function mount(tree: JSX.Element): void {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root?.render(tree)
  })
}

function unmount(): void {
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
}

const flush = async (turns = 8): Promise<void> => {
  for (let i = 0; i < turns; i += 1) {
    await act(async () => {
      await Promise.resolve()
    })
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  renderCounts.page = 0
  stubApi.lineage.graph.mockReset()
  stubApi.library.list.mockReset()
  stubApi.settings.get.mockReset()
  stubApi.settings.set.mockReset()
  stubApi.system.setQuitDirty.mockReset()
  stubApi.system.windowControl.mockReset()
  stubApi.workspaces.list.mockReset()
  stubApi.workspaces.switch.mockReset()
  stubApi.folders.list.mockReset()
  // App 组合根与 TitleBarControls 直用 window.api/window.apiEvents（非 client
  // 门面）——jsdom 下 stub（app-shell.test 配方同型）
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
  stubApi.folders.list.mockResolvedValue({ ok: true, data: [] })
  // 模块级 store 跨用例存留：显式复位
  useReaderStore.setState({ tabs: {}, order: [], activeId: null })
  useNotesStore.setState({ noteByPaper: {} })
  useLineageStore.setState({
    nodes: [],
    edges: [],
    status: 'loading',
    error: null,
    folderId: '__main__',
    saveStatus: 'clean',
    needsReload: false,
    queue: [],
    flushing: false
  })
  useLibraryStore.setState({ selectedId: null, papers: [], total: 0, loading: false, error: null })
})

afterEach(() => {
  if (root !== null) unmount()
})

/**
 * [B5 wave C] 阳性对照⓪：见证面活性——ViewHost 的合法 prop 变化（quitDirty 聚合布尔：开一个
 * 标注失败残留的 tab→annoDirty 真→quitDirty false→true）使视图子树重渲，见证（LibraryPage 外
 * Profiler）计数必须 ≥1。①—⑤的「增量 0」以本例为前提才有判别力（计数面失能=恒真）。
 * 选 quitDirty 而非 uiScale/theme：后两者只重渲 App 根，ViewHost 为 memo 纯 props 件、props 未变
 * 不连坐视图子树（B2 §6 实施注记），其变化沿的视图增量本就应为 0，不能充当阳性对照。
 */
it('⓪ 阳性对照：ViewHost prop（quitDirty 聚合布尔）合法变化→视图子树见证计数 ≥1（见证面在计数）', async () => {
  mount(
    <StrictMode>
      <App />
    </StrictMode>
  )
  await flush()
  const pageBase = renderCounts.page
  act(() => {
    useReaderStore.setState({
      order: ['p1'],
      tabs: { p1: { paperId: 'p1', dirty: true } } as never
    })
  })
  await flush()
  expect(
    renderCounts.page - pageBase,
    'quitDirty prop 变化经 App 布尔聚合传到 ViewHost——视图子树见证必须计数（否则下方各例的增量 0 恒真）'
  ).toBeGreaterThanOrEqual(1)
})

/** 变化沿①：lineage 写源（nodes/edges 计数）变化 */
/** 变化沿①：lineage 写源（nodes/edges 计数）变化 */
it('① lineage nodes/edges 计数变化：视图子树零重渲', async () => {
  mount(
    <StrictMode>
      <App />
    </StrictMode>
  )
  await flush()
  const pageBase = renderCounts.page
  act(() => {
    useLineageStore.setState({
      nodes: [{ id: 'n1' }, { id: 'n2' }] as never,
      edges: [{ id: 'e1' }] as never
    })
  })
  await flush()
  expect(
    renderCounts.page - pageBase,
    'lineage 写源变化不得连坐 ViewHost 子树（App 根不订阅 nodes/edges 数组本体）'
  ).toBe(0)
  expect(useLineageStore.getState().nodes, '前提：植入确已落到活动投影').toHaveLength(2)
})

/** 变化沿②：notes pending 翻转（annoDirty 在位=quitDirty 稳定） */
it('② notes pending 翻转：视图子树零重渲', async () => {
  mount(
    <StrictMode>
      <App />
    </StrictMode>
  )
  await flush()
  // annotation 面 dirty 在位：quitDirty 恒 true，排除合法 prop 变化对 ViewHost 的重渲
  act(() => {
    useReaderStore.setState({
      order: ['p1'],
      tabs: { p1: { paperId: 'p1', dirty: true } } as never
    })
  })
  await flush()
  const pageBase = renderCounts.page
  act(() => {
    useNotesStore.setState({
      noteByPaper: {
        p1: { contentMd: '总评正文', saving: false, savedAt: null, pending: true, saveFailed: false }
      }
    })
  })
  await flush()
  expect(useNotesStore.getState().noteByPaper.p1?.pending).toBe(true)
  expect(
    renderCounts.page - pageBase,
    'notes 写源变化不得连坐 ViewHost 子树（App 根不订阅 noteByPaper 对象本体）'
  ).toBe(0)
})

/** M4 回炉锚：计数未变时，即使 nodes/edges 数组本体换新，视图子树不得重渲。 */
it('③ lineage 同长度新数组替换：视图子树零重渲（活动投影引用已换新）', async () => {
  mount(
    <StrictMode>
      <App />
    </StrictMode>
  )
  await flush()
  act(() => {
    useLineageStore.setState({
      nodes: [{ id: 'n1' }, { id: 'n2' }] as never,
      edges: [{ id: 'e1' }] as never
    })
  })
  await flush()
  const pageBase = renderCounts.page
  const nodesBefore = useLineageStore.getState().nodes
  const edgesBefore = useLineageStore.getState().edges

  act(() => {
    useLineageStore.setState({
      nodes: [{ id: 'n3' }, { id: 'n4' }] as never,
      edges: [{ id: 'e2' }] as never
    })
  })
  await flush()
  expect(useLineageStore.getState().nodes).not.toBe(nodesBefore)
  expect(useLineageStore.getState().edges).not.toBe(edgesBefore)
  expect(renderCounts.page - pageBase, '同计数数组替换不得连坐 ViewHost 子树').toBe(0)
})

/**
 * [回炉 W-D1·T-B02] registry 投影夹具（设计稿 §12.2 行 796；§2.3「所有写必须经 registry 的单一写路径
 * 同步投影」）。既有①—③经 useLineageStore.setState 植入（现路由=registry.patchActive 写闸）；以下
 * 用例直接经 registry 正式入口（lineageRegistry.update／ensure）写会话——「会话写→活动投影→宿主」
 * 这一段不经过该写闸，并以挂起会话锁定「仅活动会话投影」。
 */
/** registry 单例（经动态 import 取得——既有 import 区零改动；类型由模块导出推断） */
async function registryOf() {
  const { lineageRegistry } = await import('../../../src/renderer/features/lineage/lineage-session-registry')
  return lineageRegistry
}

/** registry 投影夹具④：registry 单一写路径写活动会话 */
it('④ registry 正式入口写活动会话：活动投影同引用更新、视图子树零重渲', async ({ onTestFinished }) => {
  const lineageRegistry = await registryOf()
  const { resetLineageSessionsForTests } = await import('./lineage-test-session-reset')
  onTestFinished(() => resetLineageSessionsForTests())
  mount(
    <StrictMode>
      <App />
    </StrictMode>
  )
  await flush()
  const pageBase = renderCounts.page
  const nodes = [{ id: 'n1' }, { id: 'n2' }] as never
  const edges = [{ id: 'e1' }] as never
  act(() => {
    lineageRegistry.ensure('__main__') // 会话经 registry 正式入口在场（本例不依赖文件级 setState 植入是否落会话）
    lineageRegistry.update('__main__', { nodes, edges, status: 'ready' }) // 不经 useLineageStore.setState
  })
  await flush()
  expect(useLineageStore.getState().nodes, '活动投影随会话数据（同一引用）').toBe(nodes)
  expect(
    renderCounts.page - pageBase,
    'registry 写活动会话不得连坐 ViewHost 子树'
  ).toBe(0)
})

/** registry 投影夹具⑤：挂起会话的写不投影 */
it('⑤ registry 写挂起会话不触达活动投影：视图子树零重渲、活动投影引用不变', async ({ onTestFinished }) => {
  const lineageRegistry = await registryOf()
  const { resetLineageSessionsForTests } = await import('./lineage-test-session-reset')
  onTestFinished(() => resetLineageSessionsForTests())
  mount(
    <StrictMode>
      <App />
    </StrictMode>
  )
  await flush()
  act(() => {
    lineageRegistry.ensure('__main__') // 会话经 registry 正式入口在场（本例不依赖文件级 setState 植入是否落会话）
    lineageRegistry.update('__main__', { nodes: [{ id: 'n1' }, { id: 'n2' }] as never, edges: [] as never, status: 'ready' }) // 活动会话计数基线（非空文本——「不变」可判别）
  })
  await flush()
  const pageBase = renderCounts.page
  const nodesBefore = useLineageStore.getState().nodes
  expect(nodesBefore, '前提：活动会话计数基线非空（「不变」可判别）').toHaveLength(2)
  act(() => {
    lineageRegistry.ensure('f-b') // 挂起会话（无会话的 folder 不自动建）
    lineageRegistry.update('f-b', {
      nodes: [{ id: 'b1' }, { id: 'b2' }, { id: 'b3' }] as never,
      edges: [{ id: 'e9' }] as never,
      status: 'ready'
    })
  })
  await flush()
  expect(lineageRegistry.entry('f-b')!.data.nodes, '前提：挂起会话确已写入').toHaveLength(3)
  expect(lineageRegistry.activeFolder()).toBe('__main__')
  expect(useLineageStore.getState().nodes, '活动投影不被他会话的写改写').toBe(nodesBefore)
  expect(renderCounts.page - pageBase, '挂起会话的写不得连坐 ViewHost 子树').toBe(0)
})

/** registry 投影夹具⑥：夹具植入落在 registry 会话上（数据单源） */
it('⑥ 投影夹具单源：useLineageStore.setState 植入落 registry 活动会话（会话数据=活动投影同一引用）；registry 入口写反向同步', async () => {
  const lineageRegistry = await registryOf()
  const nodes = [{ id: 'n1' }, { id: 'n2' }] as never
  const edges = [{ id: 'e1' }] as never
  act(() => {
    useLineageStore.setState({ nodes, edges, status: 'ready' })
  })
  // 植入落在 registry 的活动会话上：会话在场、键=数据键=活动键；会话数据=活动投影（同一引用）
  expect(lineageRegistry.activeFolder(), '活动键').toBe('__main__')
  const entry = lineageRegistry.entry('__main__')
  expect(entry?.key, '植入后 registry 中有该键的活动会话（夹具不绕过 registry）').toBe('__main__')
  if (entry === undefined) return
  expect(entry.data.folderId).toBe('__main__')
  expect(entry.data.nodes, '植入写到会话数据').toBe(nodes)
  expect(entry.data.edges).toBe(edges)
  expect(entry.data.status).toBe('ready')
  expect(useLineageStore.getState().nodes, '活动投影=会话数据（同一引用）').toBe(nodes)
  const next = [{ id: 'n3' }, { id: 'n4' }] as never
  act(() => {
    lineageRegistry.update('__main__', { nodes: next })
  })
  expect(entry.data.nodes).toBe(next)
  expect(useLineageStore.getState().nodes, 'registry 入口写同步投影（同一引用）').toBe(next)
})
