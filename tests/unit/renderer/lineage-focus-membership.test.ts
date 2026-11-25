// @vitest-environment jsdom
/**
 * [B5 设计稿 §5 C3 图态写点收口剪枝、§2.1 成员有效性不变量 focusSet(folder) ⊆ ids(session(folder).nodes)、
 * §5.2 落点、§5.3 必测交错；§15.1 步骤 2 状态红测先行]
 * 逐格断言「所有 entry 写按 patch 后 nodes 剪枝、所有活动整幅投影同步 view.store」的目标语义
 * （现状实现未满足=红；实现波落地后转绿）。断言全部经公开面（store 动作/registry 公开方法/
 * LineagePage 挂载），不直接调用内部投影口。
 *
 * 归属说明：
 * - 基态 opacity=1、accent、清空钮禁用等真渲染面=e2e（§12 B5-E05）；清空钮与「聚焦 N」的组件面
 *   断言另见 lineage-mode-focus-table.test.tsx（#12/#13、§5.3-3）。
 * - 设计稿对「活动 entry 的 replace（discardSession）集合读源」只对 rekey 明示捕获自 view.store，
 *   replace 段未明示——本件只立「非活动 entry 的 replace」一例，活动 replace 未立例（报告待裁）。
 *
 * 未落地纯件 lineage-focus-membership 以「目标类型说明＋容错加载」访问：缺失=断言红，不以模块
 * 加载错误充红。夹具首 import=lineage-remap-test-fixture（remap 对照段复用；顺序契约随其成立）。
 * always-active 裸 describe（K3）。
 */
import {
  DOOM, MAIN, cleanupRemapFixture, enterGhostConflict, ghostStubs, mainSessions, node, registry, resetRemapFixture, settle, state, stubApi, useLineageStore
} from './lineage-remap-test-fixture'
import { act, createElement, type ReactElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub, stubApiEvents } from '../../utils/api-client-mock'

/** 夹具桩面不含 folders（NavPane 挂载链）——同一桩状态上补挂（makeApiStub 同键合并） */
const foldersStub = makeApiStub({ folders: { list: vi.fn() } })
stubApiEvents({ onFoldersChanged: vi.fn(() => () => undefined) })

import { LineageModeBar } from '../../../src/renderer/features/lineage/LineageModeBar'
import { LineagePage } from '../../../src/renderer/features/lineage/LineagePage'
import { resolveGhostFolderDecision } from '../../../src/renderer/features/lineage/conflictResolution'
import { useLineageViewStore } from '../../../src/renderer/features/lineage/lineage-view.store'
import { resetLineageSessionsForTests } from './lineage-test-session-reset'
import { echoHistoryUnit } from '../../utils/lineage-history-stub'
import { defaultLineTypeNames, type LineageNode } from '../../../src/shared/models/lineage'
import type { LineageGraphRes } from '../../../src/shared/ipc/schemas'
import type { SessionEntry } from '../../../src/renderer/features/lineage/lineage-session-registry'

/** 目标纯件 lineage-focus-membership 的最小类型说明（B5 未实现——实现波以真实类型替换） */
interface FocusMembershipModule {
  /** §5.2：按 nodes 剪枝——无死 id 返回原引用；有死 id 返回新数组（幸存 id 保相对加入序、不重排） */
  pruneFocusMembers(focusSet: readonly string[], nodes: readonly { id: string }[]): string[]
}
const MEMBERSHIP_MODULE = '../../../src/renderer/features/lineage/lineage-focus-membership'
/** 容错加载：纯件未落地或未导出=null（由用例以断言呈红） */
const loadMembership = async (): Promise<FocusMembershipModule | null> => {
  try {
    const mod = (await vi.importActual<unknown>(MEMBERSHIP_MODULE)) as Partial<FocusMembershipModule> | null
    return typeof mod?.pruneFocusMembers === 'function' ? (mod as FocusMembershipModule) : null
  } catch {
    return null
  }
}

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

const B = 'f-b'
const graphOf = (nodes: LineageNode[]): LineageGraphRes =>
  ({ nodes, edges: [], paperMetrics: {}, pubNos: {}, tagNames: {}, lineTypeNames: defaultLineTypeNames(), floatingNotes: [] })
const ids = (): string[] => state().nodes.map((n) => n.id)
const focus = (): string[] => useLineageViewStore.getState().focusSet

let root: Root | null = null
let host: HTMLDivElement | null = null
async function mount(component: ReactElement): Promise<void> {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => {
    root!.render(component)
    for (let i = 0; i < 10; i++) await Promise.resolve()
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  for (const fn of Object.values(stubApi.lineage)) fn.mockReset()
  stubApi.lineage.graph.mockImplementation(async (req: { folderId: string }) =>
    ({ ok: true, data: graphOf(req.folderId === MAIN ? [node('A'), node('B'), node('C')] : [node('X', req.folderId), node('Y', req.folderId)]) }))
  stubApi.lineage.patchNode.mockImplementation(async (req: Partial<LineageNode>) => ({ ok: true, data: { ...node(String(req.id ?? 'X')), ...req } as LineageNode }))
  stubApi.lineage.removeNode.mockResolvedValue({ ok: true, data: { ok: true } })
  stubApi.lineage.removeEdge.mockResolvedValue({ ok: true, data: { ok: true } })
  stubApi.lineage.historyUnit.mockImplementation(echoHistoryUnit)
  foldersStub.folders.list.mockReset()
  foldersStub.folders.list.mockResolvedValue({ ok: true, data: [{ id: MAIN, name: '主图', position: 0, paperCount: 0 }, { id: B, name: '图乙', position: 1, paperCount: 0 }] })
  resetLineageSessionsForTests()
  useLineageStore.setState({
    nodes: [node('A'), node('B'), node('C')], edges: [], floatingNotes: [], paperMetrics: {}, pubNos: {}, tagNames: {}, lineTypeNames: defaultLineTypeNames(),
    status: 'ready', error: null, saveStatus: 'clean', lastWriteError: null, queue: [], flushing: false, inflight: null,
    needsReload: false, invalidationEpoch: 0, undoStack: [], redoStack: [], unfinalized: false, editRevision: 0,
    staleHistory: null, restoredAwaitingCommand: false, folderId: MAIN
  })
  useLineageViewStore.setState({ mode: 'focus', focusSet: [], navCollapsed: false, navWidth: 208, tool: 'select', paletteFor: null })
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

describe('纯件 lineage-focus-membership（§5.2 pruneFocusMembers）', () => {
  it('纯件存在并导出 pruneFocusMembers(focusSet, nodes)', async () => {
    expect(await loadMembership(), 'lineage-focus-membership.ts 应存在并导出 pruneFocusMembers（§5.2）').not.toBeNull()
  })

  it('死 id 剪除；幸存 id 保相对加入序（不重排）；不自动加入 patch 新增的节点', async () => {
    const m = await loadMembership()
    expect(m, 'lineage-focus-membership 纯件未落地（见本段首例）').not.toBeNull()
    const nodes = [{ id: 'n1' }, { id: 'n2' }, { id: 'n3' }]
    expect(m!.pruneFocusMembers(['n3', 'gone', 'n1', 'n9'], nodes)).toEqual(['n3', 'n1']) // n2 在图但未被聚焦=不加入
  })

  it('无死 id 的 patch 保留 focusSet 原引用（§5.3-5）', async () => {
    const m = await loadMembership()
    expect(m, 'lineage-focus-membership 纯件未落地（见本段首例）').not.toBeNull()
    const set = ['n1', 'n3']
    expect(m!.pruneFocusMembers(set, [{ id: 'n3' }, { id: 'n1' }, { id: 'n2' }])).toBe(set)
  })

  it('边界：空集→空；nodes 空→空；集合全死→空数组', async () => {
    const m = await loadMembership()
    expect(m, 'lineage-focus-membership 纯件未落地（见本段首例）').not.toBeNull()
    expect(m!.pruneFocusMembers([], [{ id: 'n1' }])).toEqual([])
    expect(m!.pruneFocusMembers(['n1'], [])).toEqual([])
    expect(m!.pruneFocusMembers(['n1', 'n2'], [{ id: 'n3' }])).toEqual([])
  })
})

describe('活动会话写点：nodes 与剪枝后的集合在同一写提交生效（§2.2 #19、§5.3-2）', () => {
  it('① 普通删卡：同帧剪除被删卡，其余成员同序', () => {
    useLineageViewStore.setState({ mode: 'focus', focusSet: ['A', 'C'] })
    state().removeNode('A')
    expect(ids()).toEqual(['B', 'C'])
    expect(focus(), '删卡同一写提交内集合收敛').toEqual(['C'])
  })

  it('② graph reload：权威图缺卡即剪', async () => {
    useLineageViewStore.setState({ mode: 'focus', focusSet: ['A', 'C'] })
    stubApi.lineage.graph.mockResolvedValue({ ok: true, data: graphOf([node('B'), node('C')]) })
    await state().load()
    expect(ids()).toEqual(['B', 'C'])
    expect(focus(), 'graph 落地同一写提交内集合收敛').toEqual(['C'])
  })

  it('③ 权威和解：needsReload 位下的 keyed 读应用即剪', async () => {
    useLineageViewStore.setState({ mode: 'focus', focusSet: ['A', 'C'] })
    useLineageStore.setState({ needsReload: true })
    stubApi.lineage.graph.mockResolvedValue({ ok: true, data: graphOf([node('B'), node('C')]) })
    await registry.lane(MAIN).reconcileNow()
    expect(ids()).toEqual(['B', 'C'])
    expect(focus(), '和解应用同一写提交内集合收敛').toEqual(['C'])
  })

  it('④⑤ history 写点·undo：删除→undo 恢复卡，不自动恢复删除前的聚焦关系（§2.2 #21、§5.3-4）', async () => {
    useLineageViewStore.setState({ mode: 'focus', focusSet: ['A', 'C'] })
    state().removeNode('A')
    expect(await state().undo()).toBe(true)
    expect(ids(), '前提：卡已恢复').toEqual(['A', 'B', 'C'])
    expect(focus(), '恢复卡不复活聚焦成员关系').toEqual(['C'])
  })

  it('④⑤ history 写点·redo：删除→undo→重新聚焦→redo 再删除，同帧移出；集合因此为空仍停留 focus（§2.2 #22、§5.3-3）', async () => {
    useLineageViewStore.setState({ mode: 'focus', focusSet: ['A'] })
    state().removeNode('A')
    expect(await state().undo()).toBe(true)
    useLineageViewStore.getState().toggleFocus('A')
    // 前提：删除时该 id 已剪出集合——重新点卡=加入（现状未剪出，再点成了移出：本断言即红）
    expect(focus()).toEqual(['A'])
    expect(await state().redo()).toBe(true)
    expect(ids()).toEqual(['B', 'C'])
    expect(focus(), 'redo 删除同帧从集合移出').toEqual([])
    expect(useLineageViewStore.getState().mode, '停留 focus').toBe('focus')
  })

  it('⑤ 无死 id 的 patch 保留集合引用（活动会话——避免无意义重渲染，§5.3-5）', () => {
    const set = ['A']
    useLineageViewStore.setState({ mode: 'focus', focusSet: set })
    registry.writeEntry(registry.entry(MAIN)!, { nodes: [node('A'), node('B'), node('C')] })
    expect(focus()).toBe(set)
  })
})

describe('挂起会话写点：只剪该会话（§2.2 #20、§5.3-1）', () => {
  /** A（主图）聚焦 [A,B]→切到 B 图并聚焦 [X]——返回两会话句柄与 B 的活动集合引用 */
  async function suspendA(): Promise<{ a: SessionEntry; bFocus: string[] }> {
    useLineageViewStore.setState({ mode: 'focus', focusSet: ['A', 'B'] })
    await act(async () => {
      state().setFolder(B)
      await settle()
    })
    useLineageViewStore.getState().toggleFocus('X')
    return { a: registry.entry(MAIN)!, bFocus: focus() }
  }

  it('§5.3-1 A/B 各有聚焦，A 的后台回写在 B 活动时到达并删节点：只剪 A.data.focusSet，B 的集合不变（同引用）', async () => {
    const { a, bFocus } = await suspendA()
    expect(a.data.focusSet, '前提：A 的集合已挂起').toEqual(['A', 'B'])
    registry.writeEntry(a, { nodes: [node('A'), node('C')] }) // A 的迟到合法回写删节点 B
    expect(a.data.focusSet, '迟到回写只剪 A').toEqual(['A'])
    expect(focus(), 'B 活动集合不动（同引用）').toBe(bFocus)
    expect(bFocus).toEqual(['X'])
  })

  it('§5.3-5 无死 id 的 patch 保留引用（挂起会话）', async () => {
    const { a } = await suspendA()
    const before = a.data.focusSet
    registry.writeEntry(a, { nodes: [node('A'), node('B'), node('C')] })
    expect(a.data.focusSet).toBe(before)
  })
})

describe('replace / activate / rekey / resetWorkspace 写点（§5.2）', () => {
  it('replace 入口（非活动 entry）：patch 内 focusSet 按 patch 后 nodes 剪后写回该 entry', async () => {
    await act(async () => {
      state().setFolder(B)
      await settle()
    })
    useLineageViewStore.getState().toggleFocus('X')
    useLineageViewStore.getState().toggleFocus('Y')
    await act(async () => {
      state().setFolder(MAIN)
      await settle()
    })
    expect(registry.entry(B)!.data.focusSet, '前提：B 挂起集合并集合法').toEqual(['X', 'Y'])
    registry.replace(B, { nodes: [node('X', B)], status: 'ready', focusSet: ['X', 'Y'] })
    expect(registry.entry(B)!.data.focusSet, 'replace 入口归一化').toEqual(['X'])
  })

  it('activate：目标会话集合含既有死 id 时，恢复到活动集合的已按其 nodes 剪', async () => {
    useLineageViewStore.setState({ mode: 'focus', focusSet: ['A'] })
    await act(async () => {
      state().setFolder(B)
      await settle()
    })
    registry.entry(MAIN)!.data.focusSet = ['A', 'A-dead'] // 主图挂起期间预置死 id（遗留态）
    const entry = registry.entry(MAIN)!
    await act(async () => {
      registry.activate(MAIN)
      await settle()
    })
    expect(focus()).toEqual(['A'])
    expect(entry.data.focusSet).toEqual(['A'])
  })

  it('§5.3-6 rekey 同时改键并缩减 nodes：entry.data.focusSet 与活动 view.store.focusSet 同步收敛为 [N1]；计数「聚焦 1」', async () => {
    useLineageStore.setState({ nodes: [node('N1'), node('N2')] })
    useLineageViewStore.setState({ mode: 'focus', focusSet: ['N1', 'N2'] })
    useLineageStore.setState({ folderId: 'f-rk', nodes: [node('N1', 'f-rk')] }) // 植入改键＋缩 nodes
    expect(registry.entry('f-rk')!.data.focusSet, '迁移集合先按 patch 后 nodes 剪').toEqual(['N1'])
    expect(focus(), '切活动键后活动投影同步（不得只剪 registry）').toEqual(['N1'])
    await mount(createElement(LineageModeBar))
    expect(host!.querySelector('[data-testid="lineage-focus-count"]')?.textContent).toBe('聚焦 1')
  })

  it('resetWorkspace：全部会话与集合清空——新课题不带旧 id（§2.2 #26 的数据面）', async () => {
    useLineageViewStore.setState({ mode: 'focus', focusSet: ['A', 'C'] })
    await act(async () => {
      state().setFolder(B)
      await settle()
    })
    useLineageViewStore.getState().toggleFocus('X')
    await act(async () => {
      registry.resetWorkspace('ws-next')
      await settle()
    })
    expect(registry.sessions().map((e) => e.data.focusSet)).toEqual([[]])
    expect(focus()).toEqual([])
  })
})

describe('重挂两例（§5.3-8）', () => {
  it('① 合法 F 在同图 ready 重挂前后同值同引用，graph IPC 增量=0', async () => {
    const set = ['A']
    useLineageViewStore.setState({ mode: 'focus', focusSet: set })
    await mount(createElement(LineagePage))
    expect(focus()).toBe(set)
    expect(stubApi.lineage.graph).not.toHaveBeenCalled()
  })

  it('② 预置含死 id 的 F：resetForMount 单呼不动它（同引用）；完整 Page 挂载只移除死 id——不重置 mode、不清其他成员', async () => {
    const set = ['A', 'A-dead', 'C']
    useLineageViewStore.setState({ mode: 'focus', focusSet: set })
    useLineageViewStore.getState().resetForMount()
    expect(useLineageViewStore.getState().focusSet, 'resetForMount 自身不剪').toBe(set)
    await mount(createElement(LineagePage))
    expect(focus(), '完整挂载经活动投影同步口只剪死 id').toEqual(['A', 'C'])
    expect(useLineageViewStore.getState().mode, '挂载不重置 mode').toBe('focus')
    expect(stubApi.lineage.graph).not.toHaveBeenCalled()
  })
})

describe('§5.3-7 remap 对照：经 core.activate 的终态走统一激活/投影同步口', () => {
  beforeEach(async () => {
    await resetRemapFixture()
    ghostStubs()
  })

  afterEach(() => {
    cleanupRemapFixture()
  })

  it('存活主图会话集合含死 id：remap 终态激活主图时按其 nodes 剪，活动集合同步收敛；归属断言保留', async () => {
    useLineageViewStore.setState({ mode: 'focus' })
    const { flush } = await enterGhostConflict()
    registry.entry(MAIN)!.data.focusSet = ['A', 'A-dead'] // 主图缓存会话（挂起）预置死 id
    resolveGhostFolderDecision('remap-main-graph')
    await flush
    await settle()
    expect(state().folderId, '既有归属：活动=主图').toBe(MAIN)
    expect(registry.entry(DOOM), '既有归属：被矫正会话离场').toBeUndefined()
    expect(mainSessions()).toHaveLength(1)
    expect(focus(), 'remap 终态集合按存活会话 nodes 剪').toEqual(['A'])
    expect(registry.entry(MAIN)!.data.focusSet).toEqual(['A'])
  })
})
