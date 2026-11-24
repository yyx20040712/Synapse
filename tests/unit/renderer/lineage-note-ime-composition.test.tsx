// @vitest-environment jsdom
/**
 * [回炉 W-B4·R1（用户裁决 2026-11-24）] 悬浮笔记草稿的 idle 到期提交在输入法合成期不提交，
 * compositionend 后重新计时 1.5s；合成片段不进编辑单元、不写库、不进恢复副本（恢复副本的草稿
 * 字段直读 noteDraftSnapshot——注册族内容快照，recovery-host-ports 快照源）。
 *
 * 锁链（真实 LineageFloatingNotes 组件；fake timer 真实计时 1_499/1_500——IDLE_FLUSH_MS 单源）：
 * - T1/T3/T3b 合成中到期不提交（E7 有未收口草稿／E8 无）：按既有「提交被拒＝重排」承接；
 *   合成期的其他写照常落库且不打断合成（textarea 不让位）；快照＝组词前值（T4 片段不进恢复副本）；
 * - T2 compositionend 后重新计时（E3）：1_499 零写、1_500 恰一次、载荷＝终值；快照＝终值；
 * - T5 compositionend 漏发自愈（E4：isComposing=false 的输入复位标记）；
 * - T6a/T6b/T6c blur 与打断收口（E5）：正常收口提交 draft 实际值、编辑器不以组词前值复活
 *   （收口帧先把快照对齐到提交值——残留再水化效应的判等前提）；被拒不收口的 blur 同样复位；
 * - T8 合成期编辑器让位（E6b：编辑器节点不在场=合成已被浏览器终止）复位。
 * - T7 对照＝lineage-note-idle-commit.test.tsx 既有 12 例与 lineage-note-draft-flush.test.tsx
 *   全量零修改（无合成事件的输入路径行为不变）。
 * 事件序按 Chromium（reader-text-unit 头注同源）：compositionstart →（compositionupdate、
 * input[isComposing=true]）× n → compositionend。
 * always-active 裸 describe（K3）。
 */
import { makeApiStub } from '../../utils/api-client-mock'

const stubApi = makeApiStub({
  lineage: {
    graph: vi.fn(),
    patchNode: vi.fn(),
    upsertFloatingNote: vi.fn(),
    removeFloatingNote: vi.fn()
  }
})

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { IDLE_FLUSH_MS } from '@shared/constants'
import { defaultLineTypeNames, type LineageNode } from '../../../src/shared/models/lineage'
import type { FloatingNote } from '../../../src/shared/models/lineage'

import { LineageFloatingNotes } from '../../../src/renderer/features/lineage/LineageFloatingNotes'
import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'
import { useLineageViewStore } from '../../../src/renderer/features/lineage/lineage-view.store'
import { lineageRegistry } from '../../../src/renderer/features/lineage/lineage-session-registry'
import { noteDraftSnapshot } from '../../../src/renderer/features/lineage/lineage-note-draft'
import { setQuitClosing } from '../../../src/renderer/app/quit-closing-gate'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

const MAIN = '__main__'

function makeNote(over: Partial<FloatingNote> = {}): FloatingNote {
  return { id: over.id ?? 'fn-1', folderId: MAIN, x: 100, y: 100, content: '旧稿', createdAt: 't0', updatedAt: 't0', ...over }
}
function node(id: string): LineageNode {
  return { id, paperId: `paper-${id}`, title: `节点${id}`, year: 2022, x: 1, y: 1, month: 9, slot: 0, folderId: MAIN, createdAt: 't', updatedAt: 't' }
}
const saved = (n: { id?: string; folderId?: string; x?: number; y?: number; content: string }): FloatingNote =>
  ({ id: n.id ?? 'n1', folderId: n.folderId ?? MAIN, x: n.x ?? 0, y: n.y ?? 0, content: n.content, createdAt: 't', updatedAt: 'server' })
const patchEcho = (req: Partial<LineageNode>): { ok: true; data: LineageNode } =>
  ({ ok: true as const, data: { ...node(String(req.id)), ...req, updatedAt: 'server' } })

let root: Root | null = null
let host: HTMLDivElement | null = null
let contentEl: HTMLDivElement | null = null

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
  act(() => {
    root?.render(<LineageFloatingNotes contentRef={{ current: contentEl }} />)
  })
}
const state = () => useLineageStore.getState()
const entry = () => lineageRegistry.entry(MAIN)!
const noteContent = (id: string): string | undefined => state().floatingNotes.find((n) => n.id === id)?.content
const taOf = (id: string): HTMLTextAreaElement | null =>
  document.querySelector(`.tl-note[data-note-id="${id}"] textarea`)
/** 笔记写 IPC 的 (id, content) 投影（载荷=全字段 upsert input——此处只投影断言面） */
const noteIpc = (): Array<{ id?: string; content: string }> =>
  stubApi.lineage.upsertFloatingNote.mock.calls.map((c) => {
    const input = c[0] as { id?: string; content: string }
    return { id: input.id, content: input.content }
  })
const undoCommands = (): string[] => entry().data.undoStack.map((h) => h.command)

const openEditor = (id: string): void => {
  act(() => {
    document.querySelector(`.tl-note[data-note-id="${id}"]`)!.dispatchEvent(
      new MouseEvent('pointerdown', { bubbles: true, cancelable: true, button: 0, clientX: 150, clientY: 150 })
    )
  })
}
/** 普通输入（不带 isComposing——非 InputEvent；lineage-note-idle-commit 同型） */
const type = async (ta: HTMLTextAreaElement, value: string): Promise<void> => {
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!
  await act(async () => {
    setter.call(ta, value)
    ta.dispatchEvent(new Event('input', { bubbles: true }))
  })
}
/** 指定 isComposing 的 input 事件（InputEvent）驱动受控值 */
const inputWith = (ta: HTMLTextAreaElement, value: string, isComposing: boolean): void => {
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!
  act(() => {
    setter.call(ta, value)
    ta.dispatchEvent(new InputEvent('input', { bubbles: true, isComposing }))
  })
}
/** compositionstart（组词开始） */
const composeStart = (ta: HTMLTextAreaElement): void => {
  act(() => {
    ta.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true, data: '' }))
  })
}
/** 合成期片段：compositionupdate → 终值为 value 的 input[isComposing=true] */
const composeInput = (ta: HTMLTextAreaElement, composing: string, value: string): void => {
  act(() => {
    ta.dispatchEvent(new CompositionEvent('compositionupdate', { bubbles: true, data: composing }))
  })
  inputWith(ta, value, true)
}
/** compositionend（组词结束；final=定案文本） */
const composeEnd = (ta: HTMLTextAreaElement, final: string): void => {
  act(() => {
    ta.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: final }))
  })
}
/** textarea blur（React onBlur 监听 focusout——lineage-note-idle-commit 同型） */
const blurTa = (ta: HTMLTextAreaElement): void => {
  act(() => {
    ta.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
  })
}
const advance = async (ms: number): Promise<void> => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}
/** 写链落定所需的微任务轮（包在 act 内——落定写回 store 触发的组件重渲染不外泄为 act 警告） */
const microtasks = async (turns = 12): Promise<void> => {
  await act(async () => {
    for (let i = 0; i < turns; i++) await Promise.resolve()
  })
}
/** 笔记写／节点写的即时回显（缺省桩；放行挂起后的恢复桩同此） */
const echoNoteIpc = async (req: { id?: string; content: string }): Promise<{ ok: true; data: FloatingNote }> =>
  ({ ok: true as const, data: saved(req) })
const echoPatchIpc = async (req: Partial<LineageNode>): Promise<{ ok: true; data: LineageNode }> => patchEcho(req)
/** 挂起笔记写 IPC，返回放行句柄（IPC 发出后可调；放行后以请求载荷回显）。放行同时把桩恢复为
 *  即时回显——挂起桩对**每一次**调用都新挂一个 Promise，不恢复则其后的写永不落定（写链不清空，
 *  既不 dispatch 也不报错，泄漏到后续用例的 flush 让位早退） */
const holdNoteIpc = (): (() => void) => {
  let release: (() => void) | null = null
  stubApi.lineage.upsertFloatingNote.mockImplementation(
    (req: { id?: string; content: string }) => new Promise((r) => { release = () => r({ ok: true as const, data: saved(req) }) })
  )
  return () => {
    release?.()
    stubApi.lineage.upsertFloatingNote.mockImplementation(echoNoteIpc)
  }
}
/** 挂起节点写 IPC（moveNode 的落库）——合成期「其他写的 saving 窗」夹具；放行语义同上 */
const holdPatchIpc = (): (() => void) => {
  let release: (() => void) | null = null
  stubApi.lineage.patchNode.mockImplementation(
    (req: Partial<LineageNode>) => new Promise((r) => { release = () => r(patchEcho(req)) })
  )
  return () => {
    release?.()
    stubApi.lineage.patchNode.mockImplementation(echoPatchIpc)
  }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  for (const fn of Object.values(stubApi.lineage)) fn.mockReset()
  stubApi.lineage.graph.mockResolvedValue({ ok: true, data: { nodes: [], edges: [], floatingNotes: [] } })
  stubApi.lineage.patchNode.mockImplementation(echoPatchIpc)
  stubApi.lineage.upsertFloatingNote.mockImplementation(echoNoteIpc)
  stubApi.lineage.removeFloatingNote.mockResolvedValue({ ok: true, data: { ok: true } })
  useLineageStore.setState({
    nodes: [node('A')], edges: [], floatingNotes: [], paperMetrics: {}, pubNos: {}, tagNames: {}, lineTypeNames: defaultLineTypeNames(),
    status: 'ready', error: null, saveStatus: 'clean', lastWriteError: null, queue: [], flushing: false, inflight: null,
    needsReload: false, undoStack: [], redoStack: [], unfinalized: false, editRevision: 0, folderId: MAIN
  })
  useLineageViewStore.setState({ mode: 'edit', tool: 'select', zoom: 1 })
})

afterEach(async () => {
  await act(async () => { root?.unmount() })
  root = null
  host?.remove()
  host = null
  contentEl = null
  vi.useRealTimers()
})

describe('合成中到期不提交（E7／E8）', () => {
  it('T1 合成中到期不提交：笔记写零调用、editRevision 与 undo 栈不变、textarea 仍在场、快照＝组词前值；仍在合成再到期仍不提交', async () => {
    useLineageStore.setState({ floatingNotes: [makeNote({ id: 'fn-e' })] })
    mountNotes()
    openEditor('fn-e')
    const ta = taOf('fn-e')!
    await type(ta, '组词前')
    expect(noteDraftSnapshot(), '前提：未收口草稿在排').toEqual({ noteId: 'fn-e', text: '组词前' })
    composeStart(ta)
    composeInput(ta, 'n', '组词前n')
    composeInput(ta, 'ni', '组词前ni')
    expect(ta.value, '前提：编辑器显示片段').toBe('组词前ni')
    expect(noteDraftSnapshot(), 'T4 片段不进快照（恢复副本的数据源）').toEqual({ noteId: 'fn-e', text: '组词前' })
    const revision = state().editRevision
    const undoBefore = undoCommands()
    await advance(IDLE_FLUSH_MS)
    expect(stubApi.lineage.upsertFloatingNote, '合成中到期：不提交').not.toHaveBeenCalled()
    expect(stubApi.lineage.removeFloatingNote).not.toHaveBeenCalled()
    expect(noteContent('fn-e'), '乐观图未变').toBe('旧稿')
    expect(state().editRevision).toBe(revision)
    expect(undoCommands()).toEqual(undoBefore)
    expect(state().queue).toEqual([])
    expect(taOf('fn-e'), 'textarea 仍在场（同一节点）').toBe(ta)
    expect(noteDraftSnapshot()).toEqual({ noteId: 'fn-e', text: '组词前' })
    await advance(IDLE_FLUSH_MS) // 被拒后重排的计时器再到期：合成未结束
    composeInput(ta, 'nin', '组词前nin')
    await advance(IDLE_FLUSH_MS)
    expect(stubApi.lineage.upsertFloatingNote, '合成持续：每次到期都不提交').not.toHaveBeenCalled()
    expect(state().editRevision).toBe(revision)
    expect(noteDraftSnapshot()).toEqual({ noteId: 'fn-e', text: '组词前' })
  })

  it('T3 合成期其他写照常落库且不打断：先 moveNode（Q=1）再组词；到期 → patchNode 已派发、笔记写零调用、saving 窗 textarea 同一节点', async () => {
    useLineageStore.setState({ floatingNotes: [makeNote({ id: 'fn-e' })] })
    mountNotes()
    openEditor('fn-e')
    const ta = taOf('fn-e')!
    await type(ta, '组词前')
    act(() => { state().moveNode('A', 10, 10) })
    expect(state().queue, '前提：其他写在队列').toHaveLength(1)
    const undoBefore = undoCommands()
    composeStart(ta)
    composeInput(ta, 'ni', '组词前ni')
    const release = holdPatchIpc()
    try {
      await advance(IDLE_FLUSH_MS)
      expect(stubApi.lineage.patchNode, '其他写照常落库（已派发、挂起中）').toHaveBeenCalledTimes(1)
      expect(noteIpc(), '合成期不提交草稿').toEqual([])
      expect(state().saveStatus, '前提：其他写的 saving 窗').toBe('saving')
      expect(taOf('fn-e'), 'saving 窗不打断合成——textarea 同一节点').toBe(ta)
      expect(ta.value).toBe('组词前ni')
      expect(undoCommands(), '只有位移一个编辑单元').toEqual(undoBefore)
    } finally {
      release() // 断言失败也不占链
    }
    await microtasks()
    expect(state().queue).toEqual([])
    expect(state().saveStatus).toBe('clean')
    expect(noteIpc(), '合成期笔记写零调用（其他写链落定后回看——片段未入队）').toEqual([])
    expect(taOf('fn-e')).toBe(ta)
    expect(noteDraftSnapshot()).toEqual({ noteId: 'fn-e', text: '组词前' })
    composeEnd(ta, 'ni')
    await advance(IDLE_FLUSH_MS)
    await microtasks()
    expect(noteIpc().map((c) => c.content), 'compositionend 后重新计时：到期提交终值').toEqual(['组词前ni'])
  })

  it('T3b 合成期其他写照常落库且不打断（无未收口草稿：组词前值＝正文）', async () => {
    useLineageStore.setState({ floatingNotes: [makeNote({ id: 'fn-e' })] })
    mountNotes()
    openEditor('fn-e')
    const ta = taOf('fn-e')!
    act(() => { state().moveNode('A', 10, 10) })
    composeStart(ta)
    composeInput(ta, 'ni', '旧稿ni')
    expect(ta.value, '前提：编辑器显示片段').toBe('旧稿ni')
    expect(noteDraftSnapshot(), 'T4 片段不进快照：组词前值＝正文 → 合成中无未收口草稿（E8）').toBeNull()
    const release = holdPatchIpc()
    try {
      await advance(IDLE_FLUSH_MS)
      expect(stubApi.lineage.patchNode).toHaveBeenCalledTimes(1)
      expect(noteIpc(), '合成期不提交片段').toEqual([])
      expect(state().saveStatus).toBe('saving')
      expect(taOf('fn-e'), 'saving 窗不打断合成——textarea 同一节点').toBe(ta)
    } finally {
      release()
    }
    await microtasks()
    expect(state().queue).toEqual([])
    composeInput(ta, '你', '旧稿你')
    composeEnd(ta, '你')
    expect(noteDraftSnapshot(), 'T4 compositionend 后快照＝终值').toEqual({ noteId: 'fn-e', text: '旧稿你' })
    await advance(IDLE_FLUSH_MS - 1)
    expect(noteIpc()).toEqual([])
    await advance(1)
    await microtasks()
    expect(noteIpc()).toEqual([{ id: 'fn-e', content: '旧稿你' }])
  })
})

describe('compositionend 后重新计时（E3）', () => {
  it('T2 合成结束重新计时：compositionend 后 1_499ms 零写、1_500ms 恰一次且载荷＝终值；saving 窗 textarea 同一节点', async () => {
    useLineageStore.setState({ floatingNotes: [makeNote({ id: 'fn-e' })] })
    mountNotes()
    openEditor('fn-e')
    const ta = taOf('fn-e')!
    expect(document.activeElement, '前提：焦点在编辑器').toBe(ta)
    composeStart(ta)
    composeInput(ta, 'n', '旧稿n')
    await advance(1_000)
    composeInput(ta, 'ni', '旧稿ni')
    await advance(1_600) // 候选窗停留——合成中跨过一个 1.5s 到期点
    expect(stubApi.lineage.upsertFloatingNote, '合成中到期：不提交').not.toHaveBeenCalled()
    expect(noteDraftSnapshot(), 'E8：组词前值＝正文 → 合成中无未收口草稿').toBeNull()
    composeInput(ta, '你', '旧稿你') // 终值 input[isComposing=true]，先于 compositionend
    composeEnd(ta, '你')
    expect(noteDraftSnapshot(), 'T4 compositionend 后快照＝终值').toEqual({ noteId: 'fn-e', text: '旧稿你' })
    const release = holdNoteIpc()
    try {
      await advance(IDLE_FLUSH_MS - 1)
      expect(noteIpc(), 'compositionend 后 1_499ms：零写').toEqual([])
      await advance(1)
      expect(noteIpc(), '1_500ms：恰一次、载荷＝终值').toEqual([{ id: 'fn-e', content: '旧稿你' }])
      expect(state().saveStatus, '前提：提交后的 saving 窗（IPC 挂起）').toBe('saving')
      expect(taOf('fn-e'), 'saving 窗 textarea 仍在场').toBe(ta)
      expect(document.activeElement, '不夺焦点').toBe(ta)
    } finally {
      release()
    }
    await microtasks()
    expect(state().saveStatus).toBe('clean')
    expect(taOf('fn-e')).toBe(ta)
    expect(noteDraftSnapshot()).toBeNull()
    expect(undoCommands()).toHaveLength(1) // 终值＝一编辑单元
    await advance(IDLE_FLUSH_MS * 2)
    expect(noteIpc(), '恰一次（无重复提交）').toHaveLength(1)
    expect(noteContent('fn-e')).toBe('旧稿你')
  })
})

describe('标记复位的三条路径（E4／E5／E6b）', () => {
  it('T5 compositionend 漏发自愈：合成期输入后来一次 isComposing=false 的输入 → 快照跟随完整文本、到期提交完整文本', async () => {
    useLineageStore.setState({ floatingNotes: [makeNote({ id: 'fn-e' })] })
    mountNotes()
    openEditor('fn-e')
    const ta = taOf('fn-e')!
    await type(ta, '组词前')
    composeStart(ta)
    composeInput(ta, 'ni', '组词前ni')
    inputWith(ta, '组词前ni!', false) // 无 compositionend——非合成输入到达
    expect(noteDraftSnapshot(), '标记复位 → 快照跟随完整文本').toEqual({ noteId: 'fn-e', text: '组词前ni!' })
    await advance(IDLE_FLUSH_MS)
    await microtasks()
    expect(noteIpc(), '到期提交完整文本').toEqual([{ id: 'fn-e', content: '组词前ni!' }])
    expect(noteDraftSnapshot()).toBeNull()
  })

  it('T6a 合成期 blur：closeEdit 提交 draft 实际值；重开编辑后正常输入到期照常提交', async () => {
    useLineageStore.setState({ floatingNotes: [makeNote({ id: 'fn-e' })] })
    mountNotes()
    openEditor('fn-e')
    const ta = taOf('fn-e')!
    await type(ta, '组词前')
    composeStart(ta)
    composeInput(ta, 'zhong', '组词前中')
    blurTa(ta)
    expect(noteContent('fn-e'), 'blur 提交 draft 实际值').toBe('组词前中')
    expect(taOf('fn-e'), '会话收口——编辑器不以组词前值复活（本帧刚收口≠未收口残留）').toBeNull()
    expect(noteDraftSnapshot()).toBeNull()
    await advance(IDLE_FLUSH_MS)
    await microtasks()
    expect(noteIpc()).toEqual([{ id: 'fn-e', content: '组词前中' }])
    openEditor('fn-e')
    const reopened = taOf('fn-e')!
    expect(reopened.value, '重开：正文＝blur 提交的值').toBe('组词前中')
    await type(reopened, '组词前中续')
    await advance(IDLE_FLUSH_MS - 1)
    expect(noteIpc()).toHaveLength(1)
    await advance(1)
    await microtasks()
    expect(noteIpc().map((c) => c.content), '重开后正常输入到期照常提交').toEqual(['组词前中', '组词前中续'])
  })

  it('T6c 合成期打断收口（笔记右键开删除菜单）：会话收口提交 draft 实际值，编辑器不以组词前值复活', async () => {
    useLineageStore.setState({ floatingNotes: [makeNote({ id: 'fn-e' })] })
    mountNotes()
    openEditor('fn-e')
    const ta = taOf('fn-e')!
    await type(ta, '组词前')
    composeStart(ta)
    composeInput(ta, 'zhong', '组词前中')
    act(() => {
      document.querySelector(`.tl-note[data-note-id="fn-e"]`)!.dispatchEvent(
        new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 150, clientY: 150 })
      )
    })
    expect(document.querySelector('[data-testid="note-anchor-menu"]'), '前提：删除菜单已开').not.toBeNull()
    expect(noteContent('fn-e'), '打断收口提交 draft 实际值').toBe('组词前中')
    expect(taOf('fn-e'), '会话收口——编辑器不以组词前值复活').toBeNull()
    expect(noteDraftSnapshot(), '快照清（本帧刚收口——不是未收口残留）').toBeNull()
    await advance(IDLE_FLUSH_MS)
    await microtasks()
    expect(noteIpc()).toEqual([{ id: 'fn-e', content: '组词前中' }])
  })

  it('T6b 合成期 blur 且收口被拒（keepOpen 窗 flushing）：标记复位——快照＝draft 实际值，窗结束后到期提交', async () => {
    useLineageStore.setState({ floatingNotes: [makeNote({ id: 'fn-e' })] })
    mountNotes()
    openEditor('fn-e')
    const ta = taOf('fn-e')!
    await type(ta, '组词前')
    const release = holdNoteIpc()
    try {
      await advance(IDLE_FLUSH_MS) // 首次 idle 提交 → saving 窗（IPC 挂起、keepOpen）
      expect(state().saveStatus, '前提：自身提交的 saving 窗').toBe('saving')
      composeStart(ta)
      composeInput(ta, 'zhong', '组词前中')
      blurTa(ta)
      expect(taOf('fn-e'), 'flushing 窗 blur 不收口——会话与 textarea 保留').toBe(ta)
      expect(noteDraftSnapshot(), 'blur 复位：快照＝draft 实际值').toEqual({ noteId: 'fn-e', text: '组词前中' })
    } finally {
      release() // 断言失败也不占链；放行即恢复即时回显
    }
    await microtasks()
    expect(state().saveStatus).toBe('clean')
    expect(taOf('fn-e')).toBe(ta)
    await advance(IDLE_FLUSH_MS)
    await microtasks()
    expect(noteIpc().map((c) => c.content), '到期提交 blur 时刻的草稿').toEqual(['组词前', '组词前中'])
    expect(state().queue, '写链落定').toEqual([])
    expect(noteDraftSnapshot()).toBeNull()
  })

  it('T8 合成期编辑器让位（切 browse）：标记复位——快照＝编辑器实际文本；回 edit 后到期照常提交', async () => {
    useLineageStore.setState({ floatingNotes: [makeNote({ id: 'fn-e' })] })
    mountNotes()
    openEditor('fn-e')
    const ta = taOf('fn-e')!
    await type(ta, '组词前')
    composeStart(ta)
    composeInput(ta, 'zhong', '组词前中')
    act(() => { useLineageViewStore.setState({ mode: 'browse' }) })
    expect(taOf('fn-e'), 'browse 模式：textarea 让位').toBeNull()
    expect(noteDraftSnapshot(), '编辑器不在场=合成已终止：快照＝编辑器实际文本').toEqual({ noteId: 'fn-e', text: '组词前中' })
    act(() => { useLineageViewStore.setState({ mode: 'edit' }) })
    expect(taOf('fn-e')?.value, '回 edit：编辑器回挂、文本保留').toBe('组词前中')
    await advance(IDLE_FLUSH_MS)
    await microtasks()
    expect(noteIpc(), '到期照常提交').toEqual([{ id: 'fn-e', content: '组词前中' }])
    expect(noteDraftSnapshot()).toBeNull()
  })

  it('T9 合成期 blur 被 closing 门拒（quit 冻结）：标记仍复位——解冻后到期提交实际草稿（复审 review4 阻断回归例）', async () => {
    useLineageStore.setState({ floatingNotes: [makeNote({ id: 'fn-e' })] })
    mountNotes()
    openEditor('fn-e')
    const ta = taOf('fn-e')!
    await type(ta, '组词前')
    composeStart(ta)
    composeInput(ta, 'zhong', '组词前中')
    act(() => { setQuitClosing(true) })
    try {
      blurTa(ta)
      expect(taOf('fn-e'), 'closing 门拒收口——会话与 textarea 保留').toBe(ta)
    } finally {
      act(() => { setQuitClosing(false) })
    }
    expect(noteDraftSnapshot(), '门拒 blur 也复位合成标记：快照＝draft 实际值').toEqual({ noteId: 'fn-e', text: '组词前中' })
    await advance(IDLE_FLUSH_MS)
    await microtasks()
    expect(noteIpc(), '解冻后到期提交实际草稿（标记不滞留）').toEqual([{ id: 'fn-e', content: '组词前中' }])
    expect(noteDraftSnapshot()).toBeNull()
  })
})
