// @vitest-environment jsdom
/**
 * [B5 设计稿 §2.2 mode × focusSet × folder × mount 全事件迁移枚举；§15.1 步骤 2 状态红测先行]
 * 逐格断言 §2.2 全表的目标语义（现状实现未满足=红；实现波落地后转绿）。
 *
 * 覆盖对照（§2.2 行号 → 本件用例；未在本件立例的行注明归属）：
 * - #1/#27 冷启动与不持久化；#5 resetForMount 保 mode/F；#6 同值 setMode 完全 no-op；
 *   #7 不同模式切换保集合（六组）；#8 退出聚焦再进恢复同一集合；
 * - #9/#10/#11 toggle 语义；#12/#13 清空聚焦（清空钮=唯一用户显式入口）；#14 Esc 分层退出；
 * - #2/#3/#4/#23/#24 挂载面（同图重挂、目标图同步、重渲染、graph loading/error、恢复替换）；
 * - #16/#17/#18 切图（per-folder 挂起恢复）；#19/#25/#26 图态写点与课题切换；
 * - 归属 lineage-focus-membership.test.ts（C3 剪枝）：#19 五类 nodes 写点全表、
 *   #20 挂起会话迟到回写只剪该会话、#21 undo 不复活聚焦、#22 redo 删除同帧移除、
 *   §5.3-8 重挂两例的死 id 分支；
 * - 归属既有锁：#15 点画布空白 no-op=lineage-mode-canvas.test（零改）；
 * - 归属 e2e（§12）：数据控件禁用、基态 opacity=1 等真渲染面。
 *
 * 未落地目标 API 以本件「目标类型说明」一层访问（断言失败=红，不以类型/加载错误充红）。
 * always-active 裸 describe（K3）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub, stubApiEvents } from '../../utils/api-client-mock'

const stubApi = makeApiStub({
  notes: { get: vi.fn(), save: vi.fn() },
  lineage: {
    graph: vi.fn(),
    patchNode: vi.fn(),
    removeNode: vi.fn(),
    upsertEdge: vi.fn(),
    removeEdge: vi.fn(),
    upsertLineTypes: vi.fn(),
    upsertFloatingNote: vi.fn(),
    removeFloatingNote: vi.fn(),
    historyUnit: vi.fn()
  },
  folders: { list: vi.fn() }
})
stubApiEvents({ onFoldersChanged: vi.fn(() => () => undefined) })

import * as ModeBarModule from '../../../src/renderer/features/lineage/LineageModeBar'
import { LineagePage } from '../../../src/renderer/features/lineage/LineagePage'
import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'
import { lineageRegistry } from '../../../src/renderer/features/lineage/lineage-session-registry'
import { useLineageViewStore, type LineageViewStore } from '../../../src/renderer/features/lineage/lineage-view.store'
import { writeNavPrefs } from '../../../src/renderer/features/lineage/nav-pane-prefs' // [主控裁决①] #2 夹具种 per-folder nav prefs
import { prepareWorkspaceSwitch } from '../../../src/renderer/app/workspace-switch'
import { useLibraryStore } from '../../../src/renderer/features/library/library.store'
import { useNotesStore } from '../../../src/renderer/features/notes/notes.store'
import { useReaderStore } from '../../../src/renderer/features/reader/state/reader.store'
import { resetLineageSessionsForTests } from './lineage-test-session-reset'
import { echoHistoryUnit } from '../../utils/lineage-history-stub'
import { defaultLineTypeNames, LINE_TYPE_COLORS, type LineageNode } from '../../../src/shared/models/lineage'
import type { LineageGraphRes } from '../../../src/shared/ipc/schemas'

/** 目标 API 的最小类型说明（B5 未实现——实现波以真实类型替换；本件只经这一层访问未落地成员） */
type ViewStoreTarget = LineageViewStore & {
  /** §2.2 #26、§5.2：课题切换复位——清全部集合并归 browse（不复用 resetForMount） */
  resetForWorkspace(): void
}
type ModeBarModuleTarget = typeof ModeBarModule & {
  /** §3.1：LineageModeBar 同文件导出清空聚焦子件（父工具栏在规定槽位渲染） */
  LineageFocusClearButton?: () => JSX.Element
}

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

const MAIN = '__main__'
const B = 'f-b'

function node(id: string, folderId: string = MAIN): LineageNode {
  return { id, paperId: `paper-${id}`, title: `节点${id}`, year: 2022, x: 1, y: 1, month: 9, slot: 0, folderId, createdAt: 't', updatedAt: 't' }
}
const graphOf = (nodes: LineageNode[]): LineageGraphRes =>
  ({ nodes, edges: [], paperMetrics: {}, pubNos: {}, tagNames: {}, lineTypeNames: defaultLineTypeNames(), floatingNotes: [] })
const settle = async (turns = 10): Promise<void> => {
  for (let i = 0; i < turns; i++) await Promise.resolve()
}

const state = () => useLineageStore.getState()
const view = () => useLineageViewStore.getState() as ViewStoreTarget
const graphs: Record<string, () => Promise<{ ok: true; data: LineageGraphRes } | { ok: false; error: { code: string; message: string } }>> = {}

let root: Root | null = null
let host: HTMLDivElement | null = null

async function mountPage(): Promise<void> {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => {
    root!.render(<LineagePage />)
    await settle()
  })
}
const q = (sel: string): Element | null => host?.querySelector(sel) ?? null
/** 清空聚焦子件（§3.1：LineageModeBar 同文件导出）——导出在场是断言面，缺失即红 */
const focusClearButton = (): (() => JSX.Element) => {
  const Clear = (ModeBarModule as ModeBarModuleTarget).LineageFocusClearButton
  expect(Clear, 'LineageModeBar 应导出清空聚焦子件 LineageFocusClearButton（§3.1）').toBeTypeOf('function')
  return Clear as unknown as () => JSX.Element
}
/** 清空聚焦钮（设计稿未指定 testid——按可访问名「清空聚焦」定位：文本或 aria-label 任一命中） */
const CLEAR_NAME = '清空聚焦'
const findClear = (): HTMLButtonElement | null =>
  Array.from(host?.querySelectorAll('button') ?? []).find(
    (b) => b.textContent?.trim() === CLEAR_NAME || b.getAttribute('aria-label') === CLEAR_NAME
  ) ?? null
const scopeTo = (folderId: string): void => {
  useLibraryStore.setState({ query: { sort: 'added_desc', offset: 0, limit: 50, folderScope: { kind: 'folder', folderId } } })
}

beforeEach(() => {
  vi.clearAllMocks()
  for (const fn of Object.values(stubApi.lineage)) fn.mockReset()
  graphs[MAIN] = async () => ({ ok: true, data: graphOf([node('A1')]) })
  graphs[B] = async () => ({ ok: true, data: graphOf([node('B1', B)]) })
  stubApi.lineage.graph.mockImplementation((req: { folderId: string }) => graphs[req.folderId]!())
  stubApi.folders.list.mockResolvedValue({
    ok: true,
    data: [
      { id: MAIN, name: '主图', position: 0, paperCount: 0 },
      { id: B, name: '图乙', position: 1, paperCount: 0 }
    ]
  })
  stubApi.lineage.historyUnit.mockImplementation(echoHistoryUnit)
  stubApi.lineage.removeEdge.mockResolvedValue({ ok: true, data: { ok: true } })
  useNotesStore.getState().resetEditStateForTests()
  useReaderStore.setState({ tabs: {}, order: [], activeId: null })
  resetLineageSessionsForTests()
  useLineageStore.setState({
    nodes: [node('A1')], edges: [], floatingNotes: [], paperMetrics: {}, pubNos: {}, tagNames: {}, lineTypeNames: defaultLineTypeNames(),
    status: 'ready', error: null, saveStatus: 'clean', lastWriteError: null, queue: [], flushing: false, inflight: null,
    needsReload: false, invalidationEpoch: 0, undoStack: [], redoStack: [], unfinalized: false, editRevision: 0,
    staleHistory: null, restoredAwaitingCommand: false, folderId: MAIN
  })
  useLineageViewStore.setState({
    mode: 'browse', focusSet: [], navCollapsed: false, navWidth: 208, navScrollTarget: null, activeFrameKey: null,
    tool: 'select', paletteFor: null, zoom: 1, currentLineColor: { solid: LINE_TYPE_COLORS[0]!, dashed: LINE_TYPE_COLORS[0]! }
  })
  useLibraryStore.setState({ query: { sort: 'added_desc', offset: 0, limit: 50 } })
})

afterEach(async () => {
  await act(async () => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
  resetLineageSessionsForTests()
})

describe('#1/#27 冷启动与不持久化', () => {
  it('#27 运行期驻留≠持久化：mode/focus 的任何迁移都不写 localStorage', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    try {
      view().setMode('focus')
      view().toggleFocus('A1')
      view().setMode('edit')
      view().resetForMount()
      view().clearFocus()
    } finally {
      setItem.mockRestore()
    }
    const keys = setItem.mock.calls.map((c) => String(c[0]))
    expect(keys.filter((k) => /focus|mode/i.test(k))).toEqual([])
  })

  it('#1 冷启动（localStorage 预置伪 mode/focus 键）：新模块实例缺省 browse/空集/select/null', async () => {
    localStorage.setItem('synapse:lineage:mode', 'focus')
    localStorage.setItem('synapse:lineage:focusSet', JSON.stringify(['A1']))
    vi.resetModules() // 本件末例：其后不再有动态 import（已静态导入的 store 单例不受影响）
    try {
      const fresh = await import('../../../src/renderer/features/lineage/lineage-view.store')
      expect(fresh.useLineageViewStore.getState()).toMatchObject({ mode: 'browse', focusSet: [], tool: 'select', paletteFor: null })
    } finally {
      localStorage.clear()
    }
  })
})

describe('#5–#8 view.store 迁移（单 store 面）', () => {
  it('#5 resetForMount 只收 tool/paletteFor：mode 与 focusSet 保原值原引用（含既有死 id 也不剪），nav/zoom/线色不覆写', () => {
    const focus = ['A1', 'A-dead']
    useLineageViewStore.setState({ mode: 'edit', focusSet: focus, tool: 'draw-solid', paletteFor: 'solid', zoom: 1.4, navWidth: 300 })
    view().resetForMount()
    expect(view().mode, '挂载不覆写 mode').toBe('edit')
    expect(view().focusSet, '原值原引用（本 action 不剪枝）').toBe(focus)
    expect(view().tool).toBe('select')
    expect(view().paletteFor).toBeNull()
    expect([view().zoom, view().navWidth]).toEqual([1.4, 300])
  })

  it.each(['edit', 'browse', 'focus'] as const)('#6 mode=%s：setMode 同值=完全 no-op（focusSet 与工具态均不变）', (mode) => {
    useLineageViewStore.setState({ mode, focusSet: ['A1'], tool: 'draw-solid', paletteFor: 'solid' })
    const focus = view().focusSet
    view().setMode(mode)
    expect(view().mode).toBe(mode)
    expect(view().focusSet).toBe(focus)
    expect([view().tool, view().paletteFor]).toEqual(['draw-solid', 'solid'])
  })

  it.each([
    ['edit', 'browse'], ['edit', 'focus'], ['browse', 'edit'], ['browse', 'focus'], ['focus', 'edit'], ['focus', 'browse']
  ] as const)('#7 %s→%s：不同模式切换保集合同引用，工具态归 select/null', (from, to) => {
    useLineageViewStore.setState({ mode: from, focusSet: ['A1', 'A2'], tool: 'draw-dashed', paletteFor: 'dashed' })
    const focus = view().focusSet
    view().setMode(to)
    expect(view().mode).toBe(to)
    expect(view().focusSet, `${from}→${to} 不清集合（同引用）`).toBe(focus)
    expect([view().tool, view().paletteFor]).toEqual(['select', null])
  })

  it.each(['browse', 'edit'] as const)('#8 focus→%s→focus：集合原样保留，再进 focus 恢复同一集合（不重建第二份）', (via) => {
    useLineageViewStore.setState({ mode: 'focus', focusSet: ['A1', 'A2'] })
    const focus = view().focusSet
    view().setMode(via)
    expect(view().focusSet).toBe(focus)
    view().setMode('focus')
    expect(view().focusSet, '再进 focus=同一引用').toBe(focus)
  })
})

describe('#9–#13 toggle 与清空聚焦', () => {
  it('#9 focus＋id∉F：toggleFocus 尾部加入、mode 保持 focus', () => {
    useLineageViewStore.setState({ mode: 'focus', focusSet: ['A1'] })
    view().toggleFocus('A2')
    expect(view().focusSet).toEqual(['A1', 'A2'])
    expect(view().mode).toBe('focus')
  })

  it('#10 focus＋id∈F：再点同卡移出，其余次序不变', () => {
    useLineageViewStore.setState({ mode: 'focus', focusSet: ['A1', 'A2', 'A3'] })
    view().toggleFocus('A2')
    expect(view().focusSet).toEqual(['A1', 'A3'])
  })

  it.each(['edit', 'browse'] as const)('#11 %s：toggleFocus=no-op', (mode) => {
    useLineageViewStore.setState({ mode, focusSet: ['A1'] })
    view().toggleFocus('A2')
    expect(view().focusSet).toEqual(['A1'])
    expect(view().mode).toBe(mode)
  })

  it('#12 focus＋F 非空＋图 ready：点「清空聚焦」→停留 focus、F=[]、计数消失、钮转禁用', async () => {
    const Clear = focusClearButton()
    useLineageViewStore.setState({ mode: 'focus', focusSet: ['A1'] })
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    await act(async () => {
      root!.render(
        <>
          <ModeBarModule.LineageModeBar />
          <Clear />
        </>
      )
    })
    expect(q('[data-testid="lineage-focus-count"]')?.textContent).toBe('聚焦 1') // 前提
    expect(findClear()?.disabled, 'focus 且集合非空=可用').toBe(false)
    await act(async () => {
      findClear()!.click()
    })
    expect(view().mode, '清空后停留 focus').toBe('focus')
    expect(view().focusSet).toEqual([])
    expect(q('[data-testid="lineage-focus-count"]'), '计数消失').toBeNull()
    expect(findClear()?.disabled, '清空后钮禁用').toBe(true)
  })

  it.each([
    ['edit，集合非空', 'edit', ['A1'], 'ready'],
    ['browse，集合非空', 'browse', ['A1'], 'ready'],
    ['focus，集合为空', 'focus', [], 'ready'],
    ['focus＋集合非空，图 loading', 'focus', ['A1'], 'loading'],
    ['focus＋集合非空，图 error', 'focus', ['A1'], 'error']
  ] as const)('#13 %s：清空聚焦钮禁用', async (_label, mode, focusSet, status) => {
    const Clear = focusClearButton()
    useLineageViewStore.setState({ mode, focusSet: [...focusSet] })
    useLineageStore.setState({ status })
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    await act(async () => {
      root!.render(
        <>
          <ModeBarModule.LineageModeBar />
          <Clear />
        </>
      )
    })
    expect(findClear()?.disabled, '非可用条件=禁用').toBe(true)
  })

  it('#13 程序直接调用 clearFocus 不带模式语义：非 focus 下清空不切模式；只清当前图', () => {
    useLineageViewStore.setState({ mode: 'browse', focusSet: ['A1'] })
    lineageRegistry.ensure(B)
    lineageRegistry.update(B, { nodes: [node('B1', B)], status: 'ready', focusSet: ['B1'] })
    view().clearFocus()
    expect(view().mode, '不变成模式切换钮').toBe('browse')
    expect(view().focusSet).toEqual([])
    expect(lineageRegistry.focusSetOf(B), '只清当前图').toEqual(['B1'])
  })
})

describe('#14 Esc 分层退出', () => {
  it('palette 开＋draw armed：Esc 先关板再退画线；mode/focusSet 不变（Esc 不是清空聚焦入口）', () => {
    useLineageViewStore.setState({ mode: 'focus', focusSet: ['A1'], tool: 'draw-solid', paletteFor: 'solid' })
    const focus = view().focusSet
    view().escapeStep()
    expect([view().paletteFor, view().tool]).toEqual([null, 'draw-solid'])
    view().escapeStep()
    expect([view().paletteFor, view().tool]).toEqual([null, 'select'])
    expect([view().mode, view().focusSet]).toEqual(['focus', focus])
  })
})

describe('#2/#3/#4/#23/#24 挂载面（LineagePage）', () => {
  it('#2 同图 ready 重挂：mode 保持、合法集合同值同引用、工具态收、zoom/nav 不动、零新增 graph IPC', async () => {
    const focus = ['A1']
    // §3.4 per-folder 读取效应保留——种 prefs 以测重挂不覆写已记忆宽度（store 单独种宽=真实运行不存在的失同步态）
    writeNavPrefs(MAIN, { width: 250, collapsed: false })
    useLineageViewStore.setState({ mode: 'focus', focusSet: focus, tool: 'draw-solid', paletteFor: 'solid', zoom: 1.3, navWidth: 250 })
    await mountPage()
    expect(view().mode).toBe('focus')
    expect(view().focusSet).toBe(focus)
    expect([view().tool, view().paletteFor]).toEqual(['select', null])
    expect([view().zoom, view().navWidth]).toEqual([1.3, 250])
    expect(stubApi.lineage.graph).not.toHaveBeenCalled()
    localStorage.clear() // [主控裁决①] 用后清 prefs 种子（不跨例残留）
  })

  it('#2 目标仍=活动图 A、F_A 含既有死 id：挂载只移除死 id（其余成员同序保留）', async () => {
    useLineageViewStore.setState({ mode: 'focus', focusSet: ['A1', 'A-dead'] })
    await mountPage()
    expect(view().focusSet, '挂载流程的恒等防御剪枝').toEqual(['A1'])
    expect(view().mode).toBe('focus')
    expect(stubApi.lineage.graph).not.toHaveBeenCalled()
  })

  it('#3 库页目标=B：mode 保持；A 的集合挂起；B 恢复并剪死 id（经 setFolder 与统一活动投影同步口）', async () => {
    useLineageViewStore.setState({ mode: 'focus', focusSet: ['A1', 'A-dead'] })
    lineageRegistry.ensure(B)
    lineageRegistry.update(B, { nodes: [node('B1', B)], status: 'ready' })
    lineageRegistry.entry(B)!.data.focusSet = ['B1', 'B-dead'] // 预置既有死 id（绕过写路径——模拟遗留态）
    scopeTo(B)
    await mountPage()
    expect(state().folderId).toBe(B)
    expect(view().mode).toBe('focus')
    expect(view().focusSet, 'B 的集合按 B.nodes 剪').toEqual(['B1'])
    expect(lineageRegistry.focusSetOf(MAIN), 'A 的集合挂起前按 A.nodes 剪').toEqual(['A1'])
  })

  it('#4 已挂载、focus、集合非空：重渲染与同值效应重跑后全部不变（不隐式清空、不重复剪枝写）', async () => {
    await mountPage()
    // 模式与集合在挂载后置入——本例只锁「已挂载后的重渲染」，不与 #2 的挂载语义耦合
    act(() => {
      useLineageViewStore.setState({ mode: 'focus' })
      useLineageViewStore.getState().toggleFocus('A1')
    })
    const focus = view().focusSet
    expect(focus).toEqual(['A1']) // 前提
    await act(async () => {
      root!.render(<LineagePage />)
      useLineageStore.setState({ editRevision: state().editRevision })
      await settle()
    })
    expect(view().focusSet).toBe(focus)
    expect(view().mode).toBe('focus')
  })

  it.each(['loading', 'error'] as const)('#23 graph %s：mode/focusSet 保留，palette 收起', async (status) => {
    useLineageStore.setState({ status: 'loading' }) // 以 loading 初态挂载（首载经 setFolder）
    await mountPage()
    const seeded = ['A1']
    act(() => {
      useLineageViewStore.setState({ mode: 'focus', focusSet: seeded, tool: 'draw-solid', paletteFor: 'solid' })
    })
    const focus = view().focusSet
    expect(focus).toBe(seeded) // 前提
    await act(async () => {
      useLineageStore.setState({ status, error: status === 'error' ? '图读失败' : null })
      await settle()
    })
    expect(view().mode).toBe('focus')
    expect(view().focusSet).toBe(focus)
    expect(view().paletteFor, 'graph loading/error 收 palette').toBeNull()
  })

  it('#24 恢复替换活动图：mode 不变、恢复载入的默认集合为空、其他 folder 的集合不动', async () => {
    useLineageViewStore.setState({ mode: 'focus', focusSet: ['A1'] })
    lineageRegistry.ensure(B)
    lineageRegistry.update(B, { nodes: [node('B1', B)], status: 'ready', focusSet: ['B1'] })
    await act(async () => {
      state().applyRecoverySession({ folderId: MAIN, graph: graphOf([node('A1')]), queue: [], draft: null })
      await settle()
    })
    expect(view().mode).toBe('focus')
    expect(view().focusSet).toEqual([])
    expect(lineageRegistry.entry(B)!.data.focusSet, '其他 folder 不动').toEqual(['B1'])
  })
})

describe('#16–#18 切图（per-folder 挂起恢复）', () => {
  it('#16 A→B（B 有挂起会话）：A.data.focusSet 按 A.nodes 剪；B 的集合按 B.nodes 剪后恢复；mode 保持；工具态收', async () => {
    useLineageViewStore.setState({ mode: 'focus', focusSet: ['A1', 'A-dead'], tool: 'draw-solid', paletteFor: 'solid' })
    lineageRegistry.ensure(B)
    lineageRegistry.update(B, { nodes: [node('B1', B)], status: 'ready' })
    lineageRegistry.entry(B)!.data.focusSet = ['B1', 'B-dead'] // 预置既有死 id
    await act(async () => {
      state().setFolder(B)
      await settle()
    })
    expect(lineageRegistry.focusSetOf(MAIN), '离场集合挂起前按 A.nodes 剪').toEqual(['A1'])
    expect(view().focusSet, '目标集合按 B.nodes 剪后恢复').toEqual(['B1'])
    expect(view().mode).toBe('focus')
    expect([view().tool, view().paletteFor]).toEqual(['select', null])
  })

  it('#17 A→B（B 无会话）：A 集合挂起；B 新会话集合为空——新图不继承 A 的 id；mode 保持', async () => {
    useLineageViewStore.setState({ mode: 'focus', focusSet: ['A1'] })
    await act(async () => {
      state().setFolder(B)
      await settle()
    })
    expect(lineageRegistry.focusSetOf(MAIN)).toEqual(['A1'])
    expect(view().focusSet).toEqual([])
    expect(view().mode).toBe('focus')
  })

  it('#18 返回 A（A 有挂起集合）：恢复按 A.nodes 剪后的集合；mode 保持；不清 A、不双取', async () => {
    useLineageViewStore.setState({ mode: 'focus', focusSet: ['A1'] })
    await act(async () => {
      state().setFolder(B)
      await settle()
    })
    lineageRegistry.entry(MAIN)!.data.focusSet = ['A1', 'A-dead'] // A 挂起期间预置死 id
    const reads = stubApi.lineage.graph.mock.calls.length
    await act(async () => {
      state().setFolder(MAIN)
      await settle()
    })
    expect(view().focusSet).toEqual(['A1'])
    expect(view().mode).toBe('focus')
    expect(stubApi.lineage.graph.mock.calls.length, '返回 ready 会话不双取').toBe(reads)
  })
})

describe('#19/#25/#26 图态写点与课题切换', () => {
  it('#19 普通删卡：nodes 与剪枝后的集合在同一写提交生效（其余成员同序、同帧可见）', () => {
    useLineageViewStore.setState({ mode: 'focus', focusSet: ['A1', 'A2'] })
    useLineageStore.setState({ nodes: [node('A1'), node('A2')] })
    state().removeNode('A2')
    expect(state().nodes.map((n) => n.id)).toEqual(['A1'])
    expect(view().focusSet, '同帧剪除被删卡').toEqual(['A1'])
  })

  it('#25 课题切换 flush 失败中止：旧 mode、全部集合、历史/U 全保留（不执行半清理）', async () => {
    useLineageViewStore.setState({ mode: 'focus', focusSet: ['A1'] })
    lineageRegistry.ensure(B)
    lineageRegistry.update(B, { nodes: [node('B1', B)], status: 'ready', focusSet: ['B1'] })
    stubApi.lineage.removeEdge.mockResolvedValue({ ok: false, error: { code: 'DB_ERROR', message: '落库失败' } })
    useLineageStore.setState({ queue: [{ kind: 'remove-edge', id: 'e-x' }], saveStatus: 'dirty', undoStack: [], unfinalized: true })
    await expect(prepareWorkspaceSwitch()).resolves.toBe(false)
    expect(view().mode).toBe('focus')
    expect(view().focusSet).toEqual(['A1'])
    expect(lineageRegistry.entry(B)!.data.focusSet).toEqual(['B1'])
    expect([state().unfinalized, state().queue.length], 'U 与失败写保留').toEqual([true, 1])
  })

  it('#26 resetForWorkspace（store 面）：清集合、归 browse、收工具态', () => {
    expect(view().resetForWorkspace, 'view.store 应提供独立的 resetForWorkspace（§5.2——不复用 resetForMount）').toBeTypeOf('function')
    useLineageViewStore.setState({ mode: 'focus', focusSet: ['A1'], tool: 'draw-solid', paletteFor: 'solid' })
    view().resetForWorkspace()
    expect(view().mode).toBe('browse')
    expect(view().focusSet).toEqual([])
    expect([view().tool, view().paletteFor]).toEqual(['select', null])
  })

  it('#26 全量 flush 成功→workspace reset：全部会话与集合清空、mode=browse、工具态归 select/null', async () => {
    useLineageViewStore.setState({ mode: 'focus', focusSet: ['A1'], tool: 'draw-solid', paletteFor: 'solid' })
    lineageRegistry.ensure(B)
    lineageRegistry.update(B, { nodes: [node('B1', B)], status: 'ready', focusSet: ['B1'] })
    await expect(prepareWorkspaceSwitch()).resolves.toBe(true)
    expect(view().mode, '课题切换成功归 browse').toBe('browse')
    expect(view().focusSet).toEqual([])
    expect([view().tool, view().paletteFor]).toEqual(['select', null])
    expect(lineageRegistry.sessions().map((e) => e.data.focusSet)).toEqual([[]])
  })
})
