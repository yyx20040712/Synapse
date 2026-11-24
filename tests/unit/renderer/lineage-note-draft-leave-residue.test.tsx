// @vitest-environment jsdom
/**
 * [回炉 W-B2b·第 4 项 / 设计稿 §8.1 步骤 1「提交 A 的悬浮笔记草稿」、§2.5 #30/#37/#38、§6.3、
 * io-phase-inventory §11] 键入过且未落库的悬浮笔记草稿正文，在页面离开路径上不得静默丢失；
 * 保留下来的残留快照对收口各面的影响。
 *
 * A 页面离开（真实 LineageFloatingNotes）：编辑器开着且提交后的写 IPC 在途时离开脉络页——
 *   离开前后的快照、回页后编辑器与正文恢复、正文最终落库；句柄抛错而草稿仍在时同样保留。
 * B 无挂载句柄的残留 × 收口各面：idle 不空转 / 退出握手 / 课题切换 / 恢复先落定步 / 切 folder。
 * 既有口径不变（由既有用例锁定，本件不重复）：fire 在 flushing 窗 no-op（lineage-note-draft-flush.test.tsx:180、
 * :299 T10）；无 fire 的卸载清 pending（同文件 :402）。
 * always-active 裸 describe（K3）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { IDLE_FLUSH_MS } from '@shared/constants'
import { makeApiStub } from '../../utils/api-client-mock'
import type { FloatingNote } from '../../../src/shared/models/lineage'
import type { LineageGraphRes } from '../../../src/shared/ipc/schemas'

const stubApi = makeApiStub({
  lineage: {
    graph: vi.fn(),
    patchNode: vi.fn(),
    upsertFloatingNote: vi.fn(),
    removeFloatingNote: vi.fn(),
    upsertEdge: vi.fn(),
    removeEdge: vi.fn(),
    upsertLineTypes: vi.fn(),
    removeNode: vi.fn(),
    historyUnit: vi.fn()
  },
  notes: { get: vi.fn(), save: vi.fn() },
  recovery: { peek: vi.fn(), save: vi.fn(), read: vi.fn(), release: vi.fn() },
  folders: { list: vi.fn() }
})

import { LineageFloatingNotes } from '../../../src/renderer/features/lineage/LineageFloatingNotes'
import { RecoveryBarHost } from '../../../src/renderer/app/RecoveryBarHost'
import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'
import { useLineageViewStore } from '../../../src/renderer/features/lineage/lineage-view.store'
import { lineageRegistry } from '../../../src/renderer/features/lineage/lineage-session-registry'
import { noteDraftPending, noteDraftSnapshot, registerNoteDraftFlush, setNoteDraftSnapshot, unregisterNoteDraftFlush } from '../../../src/renderer/features/lineage/lineage-note-draft'
import { getRecoveryState, initRecoveryScheduler, resetRecoveryScheduler } from '../../../src/renderer/features/lineage/recoveryScheduler'
import { runQuitFlush } from '../../../src/renderer/app/quit-flush'
import { prepareWorkspaceSwitch } from '../../../src/renderer/app/workspace-switch'
import { switchViewWithFlush } from '../../../src/renderer/app/view-flush'
import { setQuitClosing } from '../../../src/renderer/app/quit-closing-gate'
import { useNotesStore } from '../../../src/renderer/features/notes/notes.store'
import { useReaderStore } from '../../../src/renderer/features/reader/state/reader.store'
import { useWorkspaceStore } from '../../../src/renderer/features/workspaces/workspace.store'
import { defaultLineTypeNames, type LineageNode } from '../../../src/shared/models/lineage'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

const MAIN = '__main__'
const OTHER = 'f-b'

function makeNote(over: Partial<FloatingNote> = {}): FloatingNote {
  return { id: over.id ?? 'fn-e', folderId: MAIN, x: 100, y: 100, content: '旧稿', createdAt: 't0', updatedAt: 't0', ...over }
}
function node(id: string): LineageNode {
  return { id, paperId: `paper-${id}`, title: `节点${id}`, year: 2022, x: 1, y: 1, month: 9, slot: 0, folderId: MAIN, createdAt: 't', updatedAt: 't' }
}
const saved = (n: { id?: string; folderId?: string; x?: number; y?: number; content: string }): FloatingNote =>
  ({ id: n.id ?? 'n1', folderId: n.folderId ?? MAIN, x: n.x ?? 0, y: n.y ?? 0, content: n.content, createdAt: 't', updatedAt: 'server' })
const noteEcho = async (req: { id?: string; folderId?: string; x?: number; y?: number; content: string }) => ({ ok: true as const, data: saved(req) })

let root: Root | null = null
let host: HTMLDivElement | null = null
let contentEl: HTMLDivElement | null = null

const state = () => useLineageStore.getState()
const entry = () => lineageRegistry.entry(MAIN)!
const noteElOf = (id: string): HTMLElement | null => document.querySelector(`.tl-note[data-note-id="${id}"]`)
const taOf = (id: string): HTMLTextAreaElement | null => noteElOf(id)?.querySelector('textarea') ?? null
/** 笔记写 IPC 的 (id, folderId, content) 投影 */
const noteIpc = (): Array<[string | undefined, string | undefined, string]> =>
  stubApi.lineage.upsertFloatingNote.mock.calls.map((c) => {
    const input = c[0] as { id?: string; folderId?: string; content: string }
    return [input.id, input.folderId, input.content]
  })
const settle = async (turns = 12): Promise<void> => {
  for (let i = 0; i < turns; i++) await Promise.resolve()
}
const advance = async (ms: number): Promise<void> => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}
const openEditor = (id: string): void => {
  act(() => { noteElOf(id)!.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true, button: 0, clientX: 150, clientY: 150 })) })
}
const type = async (value: string): Promise<void> => {
  const ta = document.querySelector('.tl-note-input')
  if (ta === null) throw new Error('编辑会话 textarea 未挂载')
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!
  await act(async () => {
    setter.call(ta, value)
    ta.dispatchEvent(new Event('input', { bubbles: true }))
  })
}
function mountNotes(): void {
  host = document.createElement('div')
  document.body.appendChild(host)
  contentEl = document.createElement('div')
  contentEl.className = 'tl-content'
  host.appendChild(contentEl)
  contentEl.getBoundingClientRect = () => ({ left: 40, top: 20, right: 1040, bottom: 820, width: 1000, height: 800, x: 40, y: 20 }) as DOMRect
  Object.defineProperty(contentEl, 'offsetWidth', { value: 1000, configurable: true })
  Object.defineProperty(contentEl, 'offsetHeight', { value: 800, configurable: true })
  root = createRoot(host)
  act(() => { root?.render(<LineageFloatingNotes contentRef={{ current: contentEl }} />) })
}
/** 挂起笔记写 IPC，返回放行句柄（IPC 发出后可调；放行后以请求载荷回显） */
const holdNoteIpc = (): (() => void) => {
  let release: (() => void) | null = null
  stubApi.lineage.upsertFloatingNote.mockImplementation((req: { id?: string; folderId?: string; content: string }) => new Promise((r) => { release = () => r({ ok: true as const, data: saved(req) }) }))
  return () => void release?.()
}
/** 残留快照夹具：笔记在场、无挂载句柄（编辑器已卸载） */
function seedResidual(): void {
  useLineageStore.setState({ floatingNotes: [makeNote()] })
  setNoteDraftSnapshot({ noteId: 'fn-e', text: '残留正文' })
}

// ── 恢复条真装配（recovery-host-assembly.test.tsx 同形）──
const btn = (id: string): HTMLButtonElement | null => document.querySelector(`[data-testid="${id}"]`) as HTMLButtonElement | null
const dialog = (): HTMLElement | null => document.querySelector('[role="dialog"]')
async function clickBar(id: string): Promise<void> {
  const b = btn(id)
  expect(b, `确认条应含 [data-testid="${id}"] 按钮`).not.toBeNull()
  await act(async () => { b!.click() })
  await act(async () => { await settle() })
}
async function mountRecoveryHost(): Promise<void> {
  useWorkspaceStore.setState({
    items: [{ id: 'w1', name: '默认课题', createdAt: '2026-08-28T00:00:00Z', paperCount: 3 }],
    currentId: 'w1',
    loading: false,
    error: null
  })
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => { root?.render(<RecoveryBarHost />) })
  await act(async () => { await settle() }) // ws-entry 屏障：enter→peek(available)→确认条
  expect(getRecoveryState().phase).toBe('await-decision')
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  for (const fn of Object.values(stubApi.lineage)) fn.mockReset()
  stubApi.folders.list.mockReset()
  for (const fn of Object.values(stubApi.recovery)) fn.mockReset()
  // 主图权威读回显已落库的主图笔记；其他图空
  stubApi.lineage.graph.mockImplementation(async (req: { folderId: string }) => {
    const main: LineageGraphRes = { nodes: [node('A')], edges: [], lineTypeNames: defaultLineTypeNames(), paperMetrics: {}, pubNos: {}, tagNames: {}, floatingNotes: state().folderId === MAIN ? state().floatingNotes : [] }
    const other: LineageGraphRes = { nodes: [], edges: [], lineTypeNames: defaultLineTypeNames(), paperMetrics: {}, pubNos: {}, tagNames: {}, floatingNotes: [] }
    return { ok: true, data: req.folderId === MAIN ? main : other }
  })
  stubApi.lineage.patchNode.mockImplementation(async (req: Partial<LineageNode>) => ({ ok: true, data: { ...node(String(req.id)), ...req, updatedAt: 'server' } }))
  stubApi.lineage.upsertFloatingNote.mockImplementation(noteEcho)
  stubApi.lineage.removeFloatingNote.mockResolvedValue({ ok: true, data: { ok: true } })
  stubApi.recovery.peek.mockResolvedValue({
    ok: true,
    data: { slots: { 'lineage-session': { status: 'available', epoch: 0, file: { token: 'tok-host', writtenAt: 'w', lastWriterSession: 'old', actionCount: 0, draftPresent: false } } } }
  })
  stubApi.recovery.save.mockResolvedValue({ ok: true, data: { status: 'saved', token: 'tok-new', epoch: 0 } })
  stubApi.recovery.release.mockResolvedValue({ ok: true, data: { status: 'released', epoch: 1 } })
  stubApi.recovery.read.mockResolvedValue({ ok: true, data: { status: 'gone', epoch: 1 } })
  stubApi.folders.list.mockResolvedValue({ ok: true, data: [{ id: 'fold-1', name: '夹', position: 0, createdAt: 't' }] })
  setQuitClosing(false)
  unregisterNoteDraftFlush()
  setNoteDraftSnapshot(null)
  useNotesStore.getState().resetEditStateForTests()
  useReaderStore.setState({ tabs: {}, order: [], activeId: null })
  useLineageStore.setState({
    nodes: [node('A')], edges: [], floatingNotes: [], paperMetrics: {}, pubNos: {}, tagNames: {}, lineTypeNames: defaultLineTypeNames(),
    status: 'ready', error: null, saveStatus: 'clean', lastWriteError: null, queue: [], flushing: false, inflight: null,
    needsReload: false, undoStack: [], redoStack: [], unfinalized: false, editRevision: 0, folderId: MAIN
  })
  useLineageViewStore.setState({ mode: 'edit', tool: 'select', zoom: 1 })
})

afterEach(async () => {
  setQuitClosing(false)
  await act(async () => { root?.unmount() })
  root = null
  host?.remove()
  host = null
  contentEl = null
  resetRecoveryScheduler()
  setNoteDraftSnapshot(null)
  vi.useRealTimers()
})

describe('A 页面离开：提交后的写 IPC 在途时离开脉络页', () => {
  it('A1 离开前后的快照：未落库正文保留；回页后编辑器与正文恢复；正文最终落库', async () => {
    useLineageStore.setState({ floatingNotes: [makeNote()] })
    mountNotes()
    openEditor('fn-e')
    await type('甲')
    const release = holdNoteIpc() // idle 提交的写 IPC 挂起→saving 窗（编辑器保持打开）
    try {
      await advance(IDLE_FLUSH_MS)
      expect(state().saveStatus).toBe('saving')
      await type('甲乙') // 窗内续写＝键入过且未落库
      expect(noteDraftSnapshot()).toEqual({ noteId: 'fn-e', text: '甲乙' })
      // 离开脉络页（setView 真卸载——与 App.changeView 同形）
      await act(async () => { switchViewWithFlush('lineage', 'library', () => void root?.render(null)) })
      expect(noteDraftSnapshot(), '离开页面后：未落库正文的快照保留（不静默丢）').toEqual({ noteId: 'fn-e', text: '甲乙' })
      expect(noteDraftPending()).toBe(true)
    } finally {
      release()
      stubApi.lineage.upsertFloatingNote.mockImplementation(noteEcho) // 其后的写即时回显（断言失败也不占链）
    }
    await settle()
    expect(state().floatingNotes[0]!.content).toBe('甲') // 首次提交已落库
    expect(noteDraftSnapshot(), '在途写落定后：续写部分仍是未落库残留').toEqual({ noteId: 'fn-e', text: '甲乙' })
    await advance(IDLE_FLUSH_MS * 3)
    expect(vi.getTimerCount(), '无挂载句柄的残留：idle 不空转重排').toBe(0)
    expect(noteIpc().map((c) => c[2])).toEqual(['甲'])
    // 回页（同一张图）：再水化恢复编辑器与正文
    mountNotes()
    const ta = taOf('fn-e')
    expect(ta, '回页后编辑器恢复').not.toBeNull()
    expect(ta!.value).toBe('甲乙')
    expect(document.activeElement, '编辑器聚焦').toBe(ta)
    expect(noteDraftPending()).toBe(true)
    await advance(IDLE_FLUSH_MS)
    await settle()
    expect(noteIpc().map((c) => c[2])).toEqual(['甲', '甲乙']) // 正文最终落库
    expect(state().floatingNotes[0]!.content).toBe('甲乙')
    expect(noteDraftPending()).toBe(false)
    expect(entry().data.saveStatus).toBe('clean')
    expect(entry().data.undoStack).toHaveLength(2)
  })

  it('A2 无挂载句柄的残留：idle 到期不重排（不每 1.5s 空转），零写、残留保真', async () => {
    useLineageStore.setState({ floatingNotes: [makeNote()] })
    setNoteDraftSnapshot({ noteId: 'fn-e', text: '残留正文' })
    lineageRegistry.lane(MAIN).draftChanged() // 离开前由键入排下的那一个 idle timer
    expect(vi.getTimerCount()).toBe(1)
    await advance(IDLE_FLUSH_MS)
    expect(vi.getTimerCount(), '无句柄→重试无意义→不重排').toBe(0)
    await advance(IDLE_FLUSH_MS * 3)
    expect(vi.getTimerCount()).toBe(0)
    expect(noteIpc()).toEqual([])
    expect(noteDraftSnapshot()).toEqual({ noteId: 'fn-e', text: '残留正文' })
  })

  it('A3 收口句柄同步抛错而草稿仍在：卸载同样保留快照（不静默丢）', async () => {
    useLineageStore.setState({ floatingNotes: [makeNote()] })
    mountNotes()
    registerNoteDraftFlush(() => { throw new Error('收口句柄抛错') }) // 盖掉组件自带的句柄
    setNoteDraftSnapshot({ noteId: 'fn-e', text: '抛错前草稿' })
    await act(async () => { switchViewWithFlush('lineage', 'library', () => void root?.render(null)) })
    expect(noteDraftSnapshot(), '句柄抛错≠正文可弃').toEqual({ noteId: 'fn-e', text: '抛错前草稿' })
    expect(noteIpc()).toEqual([])
  })
})

describe('B 无挂载句柄的残留 × 收口各面（出口=内部 settle 写路径落库）', () => {
  it('B1 退出握手：残留落库——正文不丢，也不以 stillDirty 把看不见的草稿推给用户确认', async () => {
    seedResidual()
    const stillDirty = await runQuitFlush()
    expect(noteIpc(), '残留正文经离场会话写链落库').toEqual([['fn-e', MAIN, '残留正文']])
    expect(entry().data.floatingNotes[0]!.content).toBe('残留正文')
    expect(noteDraftSnapshot()).toBeNull()
    expect(entry().data.saveStatus).toBe('clean')
    expect(stillDirty).toBe(false)
  })

  it('B1b 出口落库失败：仍按未落库呈现（error+写保留），不谎报 clean', async () => {
    stubApi.lineage.upsertFloatingNote.mockResolvedValue({ ok: false, error: { code: 'DB_ERROR', message: '写失败' } })
    seedResidual()
    const stillDirty = await runQuitFlush()
    expect(stillDirty).toBe(true)
    expect(entry().data.saveStatus).toBe('error')
    expect(entry().data.queue.length).toBeGreaterThan(0)
  })

  it('B2 课题切换：残留先落库再放行（不再「确认框之后无任何动作」）', async () => {
    seedResidual()
    await expect(prepareWorkspaceSwitch()).resolves.toBe(true)
    expect(noteIpc()).toEqual([['fn-e', MAIN, '残留正文']])
    expect(noteDraftSnapshot()).toBeNull()
  })

  it('B3 恢复先落定步：残留被落定→替换确认框出现并注明草稿', async () => {
    await mountRecoveryHost()
    await clickBar('recovery-defer')
    seedResidual()
    await clickBar('recovery-reopen')
    await clickBar('recovery-restore')
    expect(noteIpc()).toEqual([['fn-e', MAIN, '残留正文']])
    expect(noteDraftSnapshot()).toBeNull()
    expect(stubApi.recovery.read).not.toHaveBeenCalled() // 先确认后载入
    expect(dialog()).not.toBeNull()
    expect(dialog()!.textContent).toContain('已保存当前 1 项修改')
    expect(dialog()!.textContent).toContain('草稿')
  })

  it('B3b 对照：残留无法落库（笔记已不在任何会话）→恢复停在 busy=false 可重试，不载入，残留保真', async () => {
    await mountRecoveryHost()
    await clickBar('recovery-defer')
    setNoteDraftSnapshot({ noteId: 'fn-gone', text: '孤儿正文' })
    await clickBar('recovery-reopen')
    await clickBar('recovery-restore')
    expect(getRecoveryState().busy).toBe(false)
    expect(getRecoveryState().phase).toBe('await-decision')
    expect(stubApi.recovery.read).not.toHaveBeenCalled()
    expect(noteIpc()).toEqual([])
    expect(noteDraftSnapshot()).toEqual({ noteId: 'fn-gone', text: '孤儿正文' })
  })

  it('B4 切 folder（离开后回页带不同目标）：残留经离场会话落库，不在目标图错位新建笔记', async () => {
    seedResidual()
    act(() => { useLineageStore.getState().setFolder(OTHER) })
    await settle(40)
    expect(noteIpc()).toEqual([['fn-e', MAIN, '残留正文']])
    expect(noteDraftSnapshot()).toBeNull()
    expect(state().folderId).toBe(OTHER)
    mountNotes() // 回到脉络页（活动图=f-b）
    expect(useLineageStore.getState().floatingNotes, '目标图不得多出一条「原笔记已不存在」的新笔记').toEqual([])
    expect(lineageRegistry.entry(MAIN)!.data.floatingNotes[0]!.content).toBe('残留正文')
  })

  it('B5 在页切 folder 撞提交后的写 IPC 在途窗：续写正文经离场会话落库（不随切图丢）', async () => {
    useLineageStore.setState({ floatingNotes: [makeNote()] })
    mountNotes()
    openEditor('fn-e')
    await type('甲')
    const release = holdNoteIpc()
    try {
      await advance(IDLE_FLUSH_MS)
      expect(state().saveStatus).toBe('saving')
      await type('甲乙')
      act(() => { useLineageStore.getState().setFolder(OTHER) })
    } finally {
      release()
      stubApi.lineage.upsertFloatingNote.mockImplementation(noteEcho) // 其后的写即时回显（断言失败也不占链）
    }
    await settle(40)
    expect(noteIpc().map((c) => [c[0], c[2]])).toEqual([['fn-e', '甲'], ['fn-e', '甲乙']])
    expect(lineageRegistry.entry(MAIN)!.data.floatingNotes[0]!.content).toBe('甲乙')
    expect(noteDraftSnapshot()).toBeNull()
    expect(lineageRegistry.entry(MAIN)!.data.saveStatus).toBe('clean')
  })

  it('B7 出口未能成单元（交接与入链之间笔记被删）：原残留不强行落库，也不覆盖其间的新草稿', async () => {
    seedResidual()
    // 占住写链：一条在途写（patchNode 挂起）——出口的 settle 任务排在它之后
    let releaseWrite: ((v: { ok: true; data: LineageNode }) => void) | null = null
    // 访问器形（闭包取现值——TS 的控制流分析会把只在回调里赋值的变量窄成 never）
    const settleWrite = (v: { ok: true; data: LineageNode }): void => {
      releaseWrite?.(v)
    }
    stubApi.lineage.patchNode.mockImplementationOnce(() => new Promise((r) => { releaseWrite = r }))
    act(() => {
      useLineageStore.getState().moveNode('A', 3, 4)
      void useLineageStore.getState().save()
    })
    let quitSettled = false
    const quit = runQuitFlush().then((v) => {
      quitSettled = true
      return v
    })
    try {
      await settle() // 退出握手走到出口：快照已交接，settle 任务排在在途写之后
      expect(noteDraftSnapshot()).toBeNull()
      // 交接与入链之间：笔记被删、用户另起一条新草稿
      useLineageStore.setState({ floatingNotes: [] })
      setNoteDraftSnapshot({ noteId: 'fn-new', text: '新草稿' })
    } finally {
      settleWrite({ ok: true, data: { ...node('A'), x: 3, y: 4, updatedAt: 'server' } })
    }
    expect(await quit).toBe(true) // 新草稿仍未落库：如实呈现
    expect(quitSettled).toBe(true)
    expect(noteIpc().filter((c) => c[2] === '残留正文'), '笔记已删——原残留不强行落库').toEqual([])
    expect(noteDraftSnapshot(), '不覆盖其间的新草稿').toEqual({ noteId: 'fn-new', text: '新草稿' })
  })

  it('B8 残留属非活动会话（按笔记找到所属会话）：出口落回原会话，不写活动图', async () => {
    useLineageStore.setState({ floatingNotes: [makeNote()] })
    act(() => { useLineageStore.getState().setFolder(OTHER) }) // 活动图=f-b；主图会话缓存
    await settle(40)
    expect(state().folderId).toBe(OTHER)
    setNoteDraftSnapshot({ noteId: 'fn-e', text: '跨图残留' })
    const stillDirty = await runQuitFlush()
    expect(noteIpc()).toEqual([['fn-e', MAIN, '跨图残留']])
    expect(lineageRegistry.entry(MAIN)!.data.floatingNotes[0]!.content).toBe('跨图残留')
    expect(state().floatingNotes, '活动图 f-b 不被写入').toEqual([])
    expect(stillDirty).toBe(false)
  })

  it('B6 对照：笔记已不在任何会话的残留不被强提交——退出仍按未落库呈现（零写）', async () => {
    setNoteDraftSnapshot({ noteId: 'fn-gone', text: '孤儿正文' })
    const stillDirty = await runQuitFlush()
    expect(noteIpc()).toEqual([])
    expect(stillDirty).toBe(true)
    expect(noteDraftSnapshot()).toEqual({ noteId: 'fn-gone', text: '孤儿正文' })
  })

  it('B6b 对照：恢复冻结期不走出口（草稿保真，副本承载）', async () => {
    // 装配即冻结（开门权唯一归 enterWorkspaceRecovery）
    initRecoveryScheduler({ workspaceId: () => 'ws-1', snapshot: () => null, loadPayload: () => undefined, onRestored: () => undefined, openLineageView: () => undefined, discardLoadedSession: () => undefined })
    seedResidual()
    act(() => { useLineageStore.getState().setFolder(OTHER) })
    await settle(40)
    expect(noteIpc()).toEqual([])
    expect(noteDraftSnapshot()).toEqual({ noteId: 'fn-e', text: '残留正文' })
  })
})
