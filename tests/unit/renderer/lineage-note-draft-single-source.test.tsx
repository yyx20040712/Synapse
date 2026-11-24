// @vitest-environment jsdom
/**
 * [回炉 W-B2·R-W3 / 设计稿 §8.1 恢复价值谓词「三源同源」、§2.5 #37/#38] 悬浮笔记草稿待写判定的
 * 单源——内容快照是数据单源，pending 布尔只作派生投影。
 *
 * 原缺陷：pending 布尔与内容快照是两个独立变量（桥接层同点位双写，但恢复路径只写快照）——
 * 仅快照在场时 host-ports 的恢复价值谓词判「有草稿」，而 lineage.store/quit-flush/workspace-switch
 * 读 pending 布尔判「无草稿」。本件锁定：只写快照，全部读面结论一致。
 * always-active 裸 describe（K3）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub } from '../../utils/api-client-mock'

const stubApi = makeApiStub({
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
  notes: { get: vi.fn(), save: vi.fn() }
})

import {
  noteDraftPending,
  noteDraftSnapshot,
  setNoteDraftPending,
  setNoteDraftSnapshot,
  subscribeNoteDraft,
  unregisterNoteDraftFlush,
  useNoteDraftPending
} from '../../../src/renderer/features/lineage/lineage-note-draft'
import { runQuitFlush } from '../../../src/renderer/app/quit-flush'
import { prepareWorkspaceSwitch } from '../../../src/renderer/app/workspace-switch'
import { setQuitClosing } from '../../../src/renderer/app/quit-closing-gate'
import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'
import { lineageRegistry } from '../../../src/renderer/features/lineage/lineage-session-registry'
import { useNotesStore } from '../../../src/renderer/features/notes/notes.store'
import { useReaderStore } from '../../../src/renderer/features/reader/state/reader.store'
import { defaultLineTypeNames, type LineageNode } from '../../../src/shared/models/lineage'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

const DRAFT = { noteId: 'fn-1', text: '未收口草稿' }

function node(id: string): LineageNode {
  return { id, paperId: `paper-${id}`, title: `节点${id}`, year: 2022, x: null, y: null, month: 9, slot: 0, folderId: '__main__', createdAt: 't', updatedAt: 't' }
}
const state = () => useLineageStore.getState()
const entry = () => lineageRegistry.entry('__main__')!

/** 订阅面探针：把 useNoteDraftPending 的现值渲染成真实文本 */
function Probe(): JSX.Element {
  return <span data-testid="pending-probe">{String(useNoteDraftPending())}</span>
}
const probeText = (): string | null => document.querySelector('[data-testid="pending-probe"]')?.textContent ?? null

let root: Root | null = null
let host: HTMLDivElement | null = null

beforeEach(() => {
  vi.clearAllMocks()
  for (const fn of Object.values(stubApi.lineage)) fn.mockReset()
  stubApi.lineage.graph.mockResolvedValue({ ok: true, data: { nodes: [node('B1')], edges: [], lineTypeNames: defaultLineTypeNames(), floatingNotes: [] } })
  stubApi.lineage.patchNode.mockImplementation(async (req: Partial<LineageNode>) => ({ ok: true, data: { ...node(String(req.id)), ...req, updatedAt: 'server' } }))
  setQuitClosing(false)
  unregisterNoteDraftFlush()
  setNoteDraftSnapshot(null)
  useNotesStore.getState().resetEditStateForTests()
  useReaderStore.setState({ tabs: {}, order: [], activeId: null })
  useLineageStore.setState({
    nodes: [node('A')], edges: [], floatingNotes: [], paperMetrics: {}, pubNos: {}, tagNames: {}, lineTypeNames: defaultLineTypeNames(),
    status: 'ready', error: null, saveStatus: 'clean', lastWriteError: null, queue: [], flushing: false, inflight: null,
    needsReload: false, undoStack: [], redoStack: [], unfinalized: false, editRevision: 0, folderId: '__main__'
  })
})

afterEach(async () => {
  setQuitClosing(false)
  if (root !== null) await act(async () => { root?.unmount() })
  root = null
  host?.remove()
  host = null
  setNoteDraftSnapshot(null)
  setNoteDraftPending(false)
  vi.restoreAllMocks()
})

describe('pending 是内容快照的派生投影', () => {
  it('只写内容快照（不经 pending 入口）：noteDraftPending() 即为真；清快照即假', () => {
    expect(noteDraftPending()).toBe(false)
    setNoteDraftSnapshot(DRAFT) // 恢复路径同型：只写快照
    expect(noteDraftSnapshot()).toEqual(DRAFT)
    expect(noteDraftPending(), '快照在场=草稿在场（两源不得给出相反结论）').toBe(true)
    setNoteDraftSnapshot(null)
    expect(noteDraftPending()).toBe(false)
    expect(noteDraftSnapshot()).toBeNull()
  })

  it('订阅面（useNoteDraftPending——App quitDirty 聚合第三项）随快照置位/清除重渲染', async () => {
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    await act(async () => { root?.render(<Probe />) })
    expect(probeText()).toBe('false')
    await act(async () => { setNoteDraftSnapshot(DRAFT) })
    expect(probeText(), '快照置位后订阅面须读到真').toBe('true')
    await act(async () => { setNoteDraftSnapshot(null) })
    expect(probeText()).toBe('false')
  })

  it('等值置位零触发；内容变更只走变更沿——派生布尔未翻转不推送订阅面', () => {
    const changes: number[] = []
    const unsubscribe = subscribeNoteDraft(() => { changes.push(changes.length) })
    setNoteDraftSnapshot(DRAFT)
    expect(changes).toHaveLength(1) // false→true：推送
    setNoteDraftSnapshot({ ...DRAFT }) // 等值：不推送
    setNoteDraftSnapshot({ noteId: DRAFT.noteId, text: '续写' }) // 内容变更：true→true 不推送
    expect(changes).toHaveLength(1)
    expect(noteDraftSnapshot()).toEqual({ noteId: DRAFT.noteId, text: '续写' }) // 内容已更新
    setNoteDraftSnapshot(null)
    expect(changes).toHaveLength(2) // true→false：推送
    unsubscribe()
  })

  it('兼容入口保留：无快照的在场标记（仅测试夹具使用）——pending 真、快照 null；置假清空', () => {
    setNoteDraftPending(true)
    expect(noteDraftPending()).toBe(true)
    expect(noteDraftSnapshot()).toBeNull()
    setNoteDraftSnapshot(null) // null=清空任意草稿状态
    expect(noteDraftPending()).toBe(false)
    setNoteDraftPending(true)
    setQuitClosing(true)
    setNoteDraftPending(true) // 等值零 emit；置真仍受 closing gate 拒绝（语义不变）
    setQuitClosing(false)
    setNoteDraftPending(false)
    expect(noteDraftPending()).toBe(false)
  })
})

describe('各读面结论一致（只写快照）', () => {
  it('退出握手 ④：仅快照在场（无收口句柄）=未收口草稿残留 → stillDirty', async () => {
    setNoteDraftSnapshot(DRAFT)
    expect(await runQuitFlush()).toBe(true)
  })

  it('课题切换：仅快照在场 → 留旧课题（false），不清史', async () => {
    state().moveNode('A', 3, 4)
    await state().save() // 一条已落库历史（U/H 在场——验证失败路径零清账）
    setNoteDraftSnapshot(DRAFT)
    expect(await prepareWorkspaceSwitch()).toBe(false)
    expect(entry().data.undoStack).toHaveLength(1) // 历史未被清
  })

  it('切图：仅快照在场 → 离场会话按「有未落定写」处置（flush-first）', () => {
    setNoteDraftSnapshot(DRAFT)
    const flushFirst = vi.spyOn(lineageRegistry.lane('__main__'), 'flushFirst')
    state().setFolder('f-b')
    expect(flushFirst, '草稿属恢复价值谓词三源之一（§8.1 步骤 2）').toHaveBeenCalledTimes(1)
  })

  it('对照：无草稿、无待写 → 各读面均为净', async () => {
    expect(noteDraftPending()).toBe(false)
    expect(noteDraftSnapshot()).toBeNull()
    expect(await runQuitFlush()).toBe(false)
    expect(await prepareWorkspaceSwitch()).toBe(true)
  })
})
