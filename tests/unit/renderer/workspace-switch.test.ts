// @vitest-environment jsdom
/**
 * [B4-A R2 §2.5 #38] workspace-switch —— 课题切换全量 flush 编排测试（新建，
 * always-active）。锁链：确认通过后先全量 flush（switch IPC 前 DB 落库）；
 * flush 失败=留旧课题（不 switch 不清史不 discard——零副作用）；成功=清全部
 * reader 历史/U+lineage 快照栈+focusSet；lineage IO 脏经 save() 正道收口。
 * [B4-A R2 审查 7 回归] 清史前 drain 各打开 tab 的写链：在途 history/普通写属
 * IO——prepare 等其落定后再做全量 IO clean 判定（不把在途写下的会话清掉）。
 */
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub } from '../../utils/api-client-mock'
import { makeAnnotation, makeTab } from '../../utils/factories'

const mocks = vi.hoisted(() => ({
  notesGet: vi.fn(),
  notesSave: vi.fn(),
  lineageGraph: vi.fn(),
  deleteAnnotation: vi.fn(),
  updateAnnotation: vi.fn(),
  lineageSaveFaces: {} as Record<string, ReturnType<typeof vi.fn>>
}))
const stubApi = makeApiStub({
  notes: { get: mocks.notesGet, save: mocks.notesSave },
  reader: { deleteAnnotation: mocks.deleteAnnotation, updateAnnotation: mocks.updateAnnotation },
  lineage: {
    graph: mocks.lineageGraph,
    upsertNode: vi.fn(),
    removeNode: vi.fn(),
    upsertEdge: vi.fn(),
    removeEdge: vi.fn(),
    upsertLineTypes: vi.fn(),
    upsertFloatingNote: vi.fn(),
    removeFloatingNote: vi.fn()
  }
})
void stubApi
void mocks.lineageSaveFaces

import { prepareWorkspaceSwitch } from '../../../src/renderer/app/workspace-switch'
import { useReaderStore } from '../../../src/renderer/features/reader/state/reader.store'
import { useNotesStore } from '../../../src/renderer/features/notes/notes.store'
import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'
import { useLineageViewStore } from '../../../src/renderer/features/lineage/lineage-view.store'
import { clearStack, pushUndo, stackDepth } from '../../../src/renderer/features/reader/state/annotation-undo'
import { undoTabOperations } from '../../../src/renderer/features/reader/state/reader-history-commands'
import {
  useAnnotationPopupActions,
  type AnnotationPopupActions
} from '../../../src/renderer/features/reader/interact/annotation-popups-actions'
import { resetTabLanes } from '../../../src/renderer/shared/tab-write-lane'
import { setNoteDraftPending } from '../../../src/renderer/features/lineage/lineage-note-draft'
import type { Annotation } from '../../../src/shared/models/annotation'

const noteResult = (paperId: string, contentMd: string) => ({
  ok: true as const,
  data: { id: `n-${paperId}`, paperId, contentMd, createdAt: 't0', updatedAt: 't1' }
})

beforeEach(() => {
  vi.clearAllMocks()
  mocks.notesGet.mockReset()
  mocks.notesSave.mockReset()
  mocks.deleteAnnotation.mockReset()
  mocks.updateAnnotation.mockReset()
  // notes 编辑态清扫（弃改 API 退役——测试隔离锚）
  useNotesStore.getState().resetEditStateForTests()
  for (const id of useReaderStore.getState().order) clearStack(id)
  resetTabLanes()
  useReaderStore.setState({ tabs: {}, order: [], activeId: null })
  ;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
  useLineageStore.setState({
    nodes: [],
    edges: [],
    saveStatus: 'clean',
    queue: [],
    flushing: false,
    lastWriteError: null,
    undoStack: [],
    redoStack: []
  })
  useLineageViewStore.setState({ focusSet: ['n-1'] })
  setNoteDraftPending(false)
})

describe('prepareWorkspaceSwitch —— 全量 flush→清史→release/switch 前置编排（§2.5 #38）', () => {
  it('全净：true——清全部 reader 历史/U+lineage 快照栈+focusSet（reload 前归零）', async () => {
    const anno = makeAnnotation('批注')
    useReaderStore.setState({
      tabs: { 'p-1': makeTab('p-1', { annotations: [anno] }) },
      order: ['p-1'],
      activeId: 'p-1'
    })
    useReaderStore.getState().markTabUnfinalized('p-1')
    pushUndo('p-1', { kind: 'create', annotation: anno })
    // [R2 夹具] 单图旧机制快照栈（SessionSnapshot）——最小合法占位载荷（L1 迁
    // HistoryEntry 时随 registry 接线换形）
    const snap = {} as never
    useLineageStore.setState({ undoStack: [snap], redoStack: [snap] })
    expect(stackDepth('p-1')).toBe(1)
    await expect(prepareWorkspaceSwitch()).resolves.toBe(true)
    // reader 全清（store 复位=历史/U/tabs 归零）
    expect(useReaderStore.getState().order).toHaveLength(0)
    expect(stackDepth('p-1')).toBe(0)
    // lineage 快照栈清+focusSet 清（单图旧机制——L2 扩 registry）
    expect(useLineageStore.getState().undoStack).toHaveLength(0)
    expect(useLineageStore.getState().redoStack).toHaveLength(0)
    expect(useLineageViewStore.getState().focusSet).toHaveLength(0)
  })

  it('flush 失败：false——留旧课题零副作用（不 discard 不清史，草稿/栈/U 原样）', async () => {
    useReaderStore.setState({
      tabs: { 'p-2': makeTab('p-2') },
      order: ['p-2'],
      activeId: 'p-2'
    })
    useReaderStore.getState().markTabUnfinalized('p-2')
    // notes 待写且保存失败（IO 脏）
    mocks.notesGet.mockResolvedValueOnce(noteResult('p-2', '基线'))
    await useNotesStore.getState().load('p-2')
    useNotesStore.getState().edit('p-2', { contentMd: '最新值' })
    mocks.notesSave.mockResolvedValueOnce({ ok: false as const, error: { code: 'E', message: '写失败' } })
    await expect(prepareWorkspaceSwitch()).resolves.toBe(false)
    // 零清账：tab/U/草稿全保留（可重试）
    expect(useReaderStore.getState().tabs['p-2']).toBeDefined()
    expect(useReaderStore.getState().tabs['p-2']?.unfinalized).toBe(true)
    expect(useNotesStore.getState().noteByPaper['p-2']?.contentMd).toBe('最新值')
    expect(useNotesStore.getState().noteByPaper['p-2']?.saveFailed).toBe(true)
    expect(useLineageViewStore.getState().focusSet).toHaveLength(1)
  })

  it('成功格：switch IPC 前真实 DB 落库（notes.save 携最新值；lineage 脏经 save() 正道）', async () => {
    useReaderStore.setState({
      tabs: { 'p-3': makeTab('p-3') },
      order: ['p-3'],
      activeId: 'p-3'
    })
    mocks.notesGet.mockResolvedValueOnce(noteResult('p-3', '基线'))
    await useNotesStore.getState().load('p-3')
    useNotesStore.getState().edit('p-3', { contentMd: '切换前最新值' })
    mocks.notesSave.mockResolvedValueOnce(noteResult('p-3', '切换前最新值'))
    // lineage IO 脏：saveStatus=dirty→编排 await save()（写队列正道）
    useLineageStore.setState({ saveStatus: 'dirty' })
    const saveSpy = vi.spyOn(useLineageStore.getState(), 'save')
    await expect(prepareWorkspaceSwitch()).resolves.toBe(true)
    expect(mocks.notesSave).toHaveBeenCalledWith({ paperId: 'p-3', contentMd: '切换前最新值' })
    expect(saveSpy).toHaveBeenCalledTimes(1)
    saveSpy.mockRestore()
  })
})

/** 覆写 id/paperId 的标注（模块态隔离） */
function annoOf(id: string, paperId: string): Annotation {
  return { ...makeAnnotation(), id, paperId }
}

/** 微任务排空（async 链逐跳） */
async function drain(turns = 30): Promise<void> {
  for (let i = 0; i < turns; i++) await Promise.resolve()
}

/** Probe：取弹层动作 hook 面（普通写入口——真实 annotation-popups-actions） */
function mountActions(paperId: string, a: Annotation): AnnotationPopupActions {
  useReaderStore.setState({
    tabs: { [paperId]: makeTab(paperId, { annotations: [a] }) },
    order: [paperId],
    activeId: paperId
  })
  let actions: AnnotationPopupActions | null = null
  function Probe(): null {
    actions = useAnnotationPopupActions({
      busy: false,
      setBusy: () => undefined,
      closeEditing: () => undefined,
      closeMenu: () => undefined,
      onChanged: () => undefined
    })
    return null
  }
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  popupsRoots.push(root)
  popupsHosts.push(host)
  act(() => {
    root.render(createElement(Probe))
  })
  return actions!
}

const popupsRoots: Root[] = []
const popupsHosts: HTMLElement[] = []

describe('prepareWorkspaceSwitch × reader 写链 drain（§2.5 #38，审查 7 回归）—— 在途写落定后才清史', () => {
  it('reader 操作写在途：prepare 不返回、会话不被清（写落定后才做 clean 判定与清史）', async () => {
    const paperId = 'p-workspace-lane'
    const a = annoOf('a-workspace-lane', paperId)
    useReaderStore.setState({
      tabs: { [paperId]: makeTab(paperId, { annotations: [a] }) },
      order: [paperId],
      activeId: paperId
    })
    pushUndo(paperId, { kind: 'create', annotation: a })
    let resolveDelete!: () => void
    mocks.deleteAnnotation.mockImplementationOnce(
      () =>
        new Promise((r) => {
          resolveDelete = () => r({ ok: true, data: undefined })
        })
    )
    const undoing = undoTabOperations(paperId)
    await drain()
    expect(mocks.deleteAnnotation).toHaveBeenCalledTimes(1)
    let settled = false
    let preparing: Promise<boolean> | null = null
    await act(async () => {
      preparing = prepareWorkspaceSwitch().then((v) => {
        settled = true
        return v
      })
      await drain()
    })
    // 在途写未落定：不返回、不清会话
    expect(settled).toBe(false)
    expect(useReaderStore.getState().tabs[paperId]).toBeDefined()
    resolveDelete()
    await expect(undoing).resolves.toMatchObject({ done: true })
    await expect(preparing).resolves.toBe(true)
    expect(settled).toBe(true)
    // 落定后清史：reader 会话归零
    expect(useReaderStore.getState().order).toHaveLength(0)
    expect(stackDepth(paperId)).toBe(0)
  })

  it('drain 后 IO 仍脏（普通写失败残留）：false 留旧课题——tab/U 保留、不清史', async () => {
    const paperId = 'p-workspace-fail'
    const a = annoOf('a-workspace-fail', paperId)
    let release!: (v: unknown) => void
    const flight = new Promise((r) => {
      release = r
    })
    mocks.updateAnnotation.mockImplementationOnce(() => flight)
    const actions = mountActions(paperId, a)
    useReaderStore.getState().markTabUnfinalized(paperId)
    void actions.autosaveComment(a, '将失败')
    await drain()
    expect(mocks.updateAnnotation).toHaveBeenCalledTimes(1)
    let settled = false
    let preparing: Promise<boolean> | null = null
    await act(async () => {
      preparing = prepareWorkspaceSwitch().then((v) => {
        settled = true
        return v
      })
      await drain()
    })
    expect(settled).toBe(false)
    release({ ok: false, error: { code: 'E', message: '写失败' } })
    await expect(preparing).resolves.toBe(false)
    expect(useReaderStore.getState().tabs[paperId]?.dirty).toBe(true)
    expect(useReaderStore.getState().tabs[paperId]?.unfinalized).toBe(true)
    expect(useLineageViewStore.getState().focusSet).toHaveLength(1)
  })
})

afterEach(() => {
  for (const r of popupsRoots.splice(0)) {
    act(() => {
      r.unmount()
    })
  }
  for (const h of popupsHosts.splice(0)) h.remove()
})
