// @vitest-environment jsdom
/**
 * [回炉 W-B2·R-B8（D-3，用户裁决＝甲） / 设计稿 §2.5 #3/#5/#6、§13.2 INV-149] 悬浮笔记草稿的
 * idle 到期提交——到期把草稿正文提交为编辑单元并入队后 flush；不关闭编辑器、不夺焦点
 * （提交与关闭解耦）。原「申报偏差：到期遇打开的草稿不强制提交、改为重排」退役。
 *
 * 锁链（真实 LineageFloatingNotes 组件；fake timer 真实计时 1_499/1_500——IDLE_FLUSH_MS 单源）：
 * - 打开草稿＋1.5s 到期 → 队列含该写并落库；saving 窗 textarea 仍在场且 document.activeElement
 *   仍是它；提交后草稿=正文 → 草稿信号归零；
 * - 继续输入 → 新的未收口草稿 → 下一次到期提交为新单元（undo 栈 +1、队列新写）；
 * - 空草稿到期不提交（空笔记回收仍由 blur 承接）；
 * - keepOpen 窄口径（任务书 (b)）：只有「自身 idle 提交随之而来的 saving 窗」不卸载 textarea；
 *   其他写触发的 saving 窗保持 R4 让位（textarea 卸载、草稿驻组件态、结束回挂——T4/T5 既有合约）；
 *   keepOpen 窗内 blur 不收口（提交会被 saving 锁静默拒——正文不丢）；
 * - 提交被拒（同会话在途 / 拖拽两态 / quit 冻结）＝重排，不丢稿；
 * - 新交互（开编辑、创建、拖柄、菜单）的 saving 闸不变（INV-149）；
 * - 对照：无草稿时到期行为不变。
 * always-active 裸 describe（K3）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { IDLE_FLUSH_MS } from '@shared/constants'
import { makeApiStub } from '../../utils/api-client-mock'
import type { FloatingNote } from '../../../src/shared/models/lineage'

const stubApi = makeApiStub({
  lineage: {
    graph: vi.fn(),
    patchNode: vi.fn(),
    upsertFloatingNote: vi.fn(),
    removeFloatingNote: vi.fn()
  }
})

import { LineageFloatingNotes } from '../../../src/renderer/features/lineage/LineageFloatingNotes'
import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'
import { useLineageViewStore } from '../../../src/renderer/features/lineage/lineage-view.store'
import { lineageRegistry } from '../../../src/renderer/features/lineage/lineage-session-registry'
import { noteDraftPending, noteDraftSnapshot } from '../../../src/renderer/features/lineage/lineage-note-draft'
import { setQuitClosing } from '../../../src/renderer/app/quit-closing-gate'
import { defaultLineTypeNames, type LineageNode } from '../../../src/shared/models/lineage'
import type { LineageGraphRes } from '../../../src/shared/ipc/schemas'
import type { ReconcileOutcome } from '../../../src/renderer/features/lineage/lineage-write-conflicts'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

const MAIN = '__main__'

function makeNote(over: Partial<FloatingNote> = {}): FloatingNote {
  return { id: over.id ?? 'fn-1', folderId: MAIN, x: 100, y: 100, content: '内容甲', createdAt: 't0', updatedAt: 't0', ...over }
}
function node(id: string): LineageNode {
  return { id, paperId: `paper-${id}`, title: `节点${id}`, year: 2022, x: 1, y: 1, month: 9, slot: 0, folderId: MAIN, createdAt: 't', updatedAt: 't' }
}
const saved = (n: { id?: string; folderId?: string; x?: number; y?: number; content: string }): FloatingNote =>
  ({ id: n.id ?? 'n1', folderId: n.folderId ?? MAIN, x: n.x ?? 0, y: n.y ?? 0, content: n.content, createdAt: 't', updatedAt: 'server' })

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
const noteElOf = (id: string): HTMLElement | null => document.querySelector(`.tl-note[data-note-id="${id}"]`)
const taOf = (id: string): HTMLTextAreaElement | null => noteElOf(id)?.querySelector('textarea') ?? null
/** 笔记写 IPC 的 (id, content) 投影（载荷=全字段 upsert input——此处只投影断言面） */
const noteIpc = (): Array<{ id?: string; content: string }> =>
  stubApi.lineage.upsertFloatingNote.mock.calls.map((c) => {
    const input = c[0] as { id?: string; content: string }
    return { id: input.id, content: input.content }
  })
const openEditor = (id: string): void => {
  act(() => { noteElOf(id)!.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true, button: 0, clientX: 150, clientY: 150 })) })
}
const type = async (ta: HTMLTextAreaElement, value: string): Promise<void> => {
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!
  await act(async () => {
    setter.call(ta, value)
    ta.dispatchEvent(new Event('input', { bubbles: true }))
  })
}
const advance = async (ms: number): Promise<void> => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}
const microtasks = async (turns = 12): Promise<void> => {
  for (let i = 0; i < turns; i++) await Promise.resolve()
}
/** 挂起笔记写 IPC，返回放行句柄（IPC 发出后可调；放行后以请求载荷回显） */
const holdNoteIpc = (): (() => void) => {
  let release: (() => void) | null = null
  stubApi.lineage.upsertFloatingNote.mockImplementation((req: { id?: string; content: string }) => new Promise((r) => { release = () => r({ ok: true as const, data: saved(req) }) }))
  return () => void release?.()
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  for (const fn of Object.values(stubApi.lineage)) fn.mockReset()
  stubApi.lineage.graph.mockResolvedValue({ ok: true, data: { nodes: [], edges: [], floatingNotes: [] } })
  stubApi.lineage.patchNode.mockImplementation(async (req: Partial<LineageNode>) => ({ ok: true, data: { ...node(String(req.id)), ...req, updatedAt: 'server' } }))
  stubApi.lineage.upsertFloatingNote.mockImplementation(async (req: { id?: string; content: string }) => ({ ok: true, data: saved(req) }))
  stubApi.lineage.removeFloatingNote.mockResolvedValue({ ok: true, data: { ok: true } })
  setQuitClosing(false)
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
  vi.useRealTimers()
})

describe('打开草稿＋1.5s 到期：提交为编辑单元并入队落库（§2.5 #5「提交单元」）', () => {
  it('到期提交：队列含该写并落库；saving 窗 textarea 仍在场（同一节点）、焦点不变；提交后草稿信号归零', async () => {
    useLineageStore.setState({ floatingNotes: [makeNote({ id: 'fn-e', content: '旧稿' }), makeNote({ id: 'fn-o', x: 500, content: '他笔记' })] })
    mountNotes()
    openEditor('fn-e')
    const ta = taOf('fn-e')!
    expect(document.activeElement).toBe(ta) // 前提：焦点在编辑器
    await type(ta, '停顿前的正文')
    expect(noteDraftPending()).toBe(true) // 前提：未收口草稿
    const release = holdNoteIpc()
    await advance(IDLE_FLUSH_MS - 1)
    expect(stubApi.lineage.upsertFloatingNote).not.toHaveBeenCalled() // 1_499：未提交
    await advance(1)
    const taSaving = taOf('fn-e')
    try {
      // 1_500：saving 窗（笔记写 IPC 挂起）
      expect(state().queue).toHaveLength(1) // 队列含该写
      expect(noteIpc()).toEqual([{ id: 'fn-e', content: '停顿前的正文' }]) // 并已派发
      expect(state().saveStatus).toBe('saving') // 前提：确在 saving 窗
      expect(taSaving, '提交不关编辑器——textarea 仍在场').not.toBeNull()
      expect(taSaving).toBe(ta) // 同一 DOM 节点（未重挂）
      expect(document.activeElement, '不夺焦点').toBe(ta)
      expect(taSaving!.value).toBe('停顿前的正文')
      expect(noteElOf('fn-o')!.style.pointerEvents, '他笔记的 saving 让位不变（INV-149）').toBe('none')
      expect(noteElOf('fn-e')!.querySelector('.tl-note-grip'), '拖柄属新交互——saving 窗不在场').toBeNull()
    } finally {
      release() // 断言失败也不占链
    }
    await microtasks()
    expect(state().saveStatus).toBe('clean')
    expect(taOf('fn-e')).toBe(ta) // 落定后仍在场
    expect(document.activeElement).toBe(ta)
    expect(state().floatingNotes.find((n) => n.id === 'fn-e')!.content).toBe('停顿前的正文')
    expect(noteDraftPending(), '提交后草稿＝正文 → 草稿信号归零').toBe(false)
    expect(noteDraftSnapshot()).toBeNull()
    expect(state().queue).toEqual([])
    expect(entry().data.undoStack).toHaveLength(1) // 草稿正文=一编辑单元
  })

  it('saving 窗的新交互闸不变：右键空白不开菜单、他笔记不开编辑', async () => {
    useLineageStore.setState({ floatingNotes: [makeNote({ id: 'fn-e', content: '旧稿' }), makeNote({ id: 'fn-o', x: 500, content: '他笔记' })] })
    mountNotes()
    openEditor('fn-e')
    await type(taOf('fn-e')!, '停顿前的正文')
    const release = holdNoteIpc()
    await advance(IDLE_FLUSH_MS)
    try {
      expect(state().saveStatus).toBe('saving') // 前提：idle 提交后的 saving 窗
      act(() => { contentEl!.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 700, clientY: 600 })) })
      expect(document.querySelector('[data-testid="note-anchor-menu"]')).toBeNull()
      act(() => { noteElOf('fn-o')!.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true, button: 0, clientX: 550, clientY: 150 })) })
      expect(taOf('fn-o')).toBeNull()
      expect(taOf('fn-e')).not.toBeNull()
    } finally {
      release() // 断言失败也不占链
    }
    await microtasks()
  })

  it('继续输入 → 新的未收口草稿 → 下一次到期提交为新单元（undo 栈 +1、队列新写）', async () => {
    useLineageStore.setState({ floatingNotes: [makeNote({ id: 'fn-e', content: '旧稿' })] })
    mountNotes()
    openEditor('fn-e')
    const ta = taOf('fn-e')!
    await type(ta, '第一段')
    await advance(IDLE_FLUSH_MS)
    await microtasks()
    expect(noteIpc()).toEqual([{ id: 'fn-e', content: '第一段' }])
    expect(entry().data.undoStack).toHaveLength(1)
    expect(noteDraftPending()).toBe(false)
    expect(taOf('fn-e')).toBe(ta) // 编辑器仍开着
    await type(ta, '第一段续写') // 继续输入
    expect(noteDraftPending(), '继续输入＝新的未收口草稿').toBe(true)
    await advance(IDLE_FLUSH_MS - 1)
    expect(noteIpc()).toHaveLength(1) // 1_499：新草稿未提交
    await advance(1)
    await microtasks()
    expect(noteIpc().map((c) => c.content)).toEqual(['第一段', '第一段续写']) // 新单元的新写
    expect(entry().data.undoStack).toHaveLength(2) // undo 栈 +1
    expect(noteDraftPending()).toBe(false)
    expect(taOf('fn-e')).toBe(ta)
    expect(state().saveStatus).toBe('clean')
  })

  it('首次提交落定 1.5s 之后（提交时排定的 timer 已到期消费）继续输入：靠草稿变更沿重排，下一次到期提交为新单元', async () => {
    useLineageStore.setState({ floatingNotes: [makeNote({ id: 'fn-e', content: '旧稿' })] })
    mountNotes()
    openEditor('fn-e')
    const ta = taOf('fn-e')!
    await type(ta, '第一段')
    await advance(IDLE_FLUSH_MS)
    await microtasks()
    expect(noteIpc().map((c) => c.content)).toEqual(['第一段'])
    await advance(IDLE_FLUSH_MS * 2) // 提交时排定的 timer 到期消费（无待写=纯 no-op）——此后无任何 timer
    expect(noteDraftPending()).toBe(false)
    await type(ta, '很久以后续写') // 继续输入＝新的未收口草稿——只能靠草稿变更沿重排
    expect(noteDraftPending()).toBe(true)
    await advance(IDLE_FLUSH_MS - 1)
    expect(noteIpc()).toHaveLength(1) // 1_499：未提交
    await advance(1)
    await microtasks()
    expect(noteIpc().map((c) => c.content)).toEqual(['第一段', '很久以后续写']) // 1_500：提交为新单元
    expect(entry().data.undoStack).toHaveLength(2)
    expect(noteDraftPending()).toBe(false)
  })

  it('新建笔记→输入→到期：建笔记与正文合并为一条 upsert 落库，编辑器不关', async () => {
    mountNotes()
    act(() => { contentEl!.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 240, clientY: 220 })) })
    act(() => { (Array.from(document.querySelectorAll('[role="menuitem"]')).find((b) => b.textContent === '新建悬浮笔记') as HTMLElement).click() })
    const created = state().floatingNotes[0]!
    const ta = taOf(created.id)!
    expect(document.activeElement).toBe(ta)
    await type(ta, '新笔记正文')
    await advance(IDLE_FLUSH_MS)
    await microtasks()
    expect(noteIpc()).toEqual([{ id: created.id, content: '新笔记正文' }]) // 同 id 合并=一条写
    expect(taOf(created.id)).toBe(ta)
    expect(document.activeElement).toBe(ta)
    expect(state().floatingNotes[0]!.content).toBe('新笔记正文')
  })
})

describe('keepOpen 的口径（任务书 (b)）', () => {
  it('其他写触发的 saving 窗：已开编辑会话照旧让位（textarea 卸载、草稿保留、结束回挂）——R4/T4·T5 既有合约不变', async () => {
    useLineageStore.setState({ floatingNotes: [makeNote({ id: 'fn-e', content: '旧稿' })] })
    mountNotes()
    openEditor('fn-e')
    const ta = taOf('fn-e')!
    await type(ta, '跨保存草稿')
    act(() => {
      useLineageStore.setState({ flushing: true, saveStatus: 'saving', inflight: { kind: 'write' } })
    })
    expect(taOf('fn-e'), '非自身提交触发的 saving 窗：textarea 让位').toBeNull()
    expect(noteDraftPending(), '草稿保真').toBe(true)
    act(() => {
      useLineageStore.setState({ flushing: false, saveStatus: 'clean', inflight: null })
    })
    const back = taOf('fn-e')
    expect(back, 'saving 结束：编辑器回挂').not.toBeNull()
    expect(back!.value).toBe('跨保存草稿')
  })

  it('keepOpen 窗内 blur 不收口：提交会被 saving 锁拒——保会话+pending，窗内续写的正文不丢', async () => {
    useLineageStore.setState({ floatingNotes: [makeNote({ id: 'fn-e', content: '旧稿' })] })
    mountNotes()
    openEditor('fn-e')
    const ta = taOf('fn-e')!
    await type(ta, '停顿前的正文')
    const release = holdNoteIpc()
    try {
      await advance(IDLE_FLUSH_MS) // idle 提交→saving 窗（IPC 挂起）
      expect(state().saveStatus).toBe('saving')
      await type(ta, '停顿前的正文续写') // 窗内继续输入
      expect(noteDraftPending()).toBe(true)
      act(() => { ta.dispatchEvent(new FocusEvent('focusout', { bubbles: true })) }) // 窗内 blur
      expect(taOf('fn-e'), 'saving 窗 blur 不关编辑器——同一 textarea 节点（不关不重挂：残留再水化的兜底不算）').toBe(ta)
      expect(noteDraftPending(), '草稿保真（未静默丢）').toBe(true)
    } finally {
      release()
    }
    await microtasks()
    expect(state().floatingNotes.find((n) => n.id === 'fn-e')!.content).toBe('停顿前的正文') // 首次提交已落库
    expect(noteDraftPending(), '续写部分仍待收口').toBe(true)
    stubApi.lineage.upsertFloatingNote.mockImplementation(async (req: { id?: string; content: string }) => ({ ok: true, data: saved(req) })) // 后续写即时回显
    await advance(IDLE_FLUSH_MS) // 重排后的到期：续写部分提交为新单元
    await microtasks()
    expect(state().floatingNotes.find((n) => n.id === 'fn-e')!.content).toBe('停顿前的正文续写')
    expect(noteDraftPending()).toBe(false)
    expect(entry().data.undoStack).toHaveLength(2)
  })
})

describe('空草稿与对照', () => {
  it('空草稿到期不提交：既有笔记正文清空后到期零写，笔记仍在；回收仍由 blur 承接', async () => {
    useLineageStore.setState({ floatingNotes: [makeNote({ id: 'fn-e', content: '原文' })] })
    mountNotes()
    openEditor('fn-e')
    const ta = taOf('fn-e')!
    await type(ta, '')
    expect(noteDraftPending()).toBe(true) // 空稿对非空正文=未收口
    await advance(IDLE_FLUSH_MS * 2)
    expect(stubApi.lineage.upsertFloatingNote).not.toHaveBeenCalled()
    expect(stubApi.lineage.removeFloatingNote).not.toHaveBeenCalled()
    expect(state().floatingNotes.map((n) => n.id)).toEqual(['fn-e'])
    expect(state().queue).toEqual([])
    expect(entry().data.undoStack).toHaveLength(0)
    expect(taOf('fn-e')).toBe(ta) // 编辑器仍开着
    act(() => { ta.dispatchEvent(new FocusEvent('focusout', { bubbles: true })) }) // blur 回收（既有语义）
    expect(state().floatingNotes).toEqual([])
  })

  it('对照：编辑器开着但正文未变 → 到期零写；无草稿的普通编辑到期照常落库（#5 行为不变）', async () => {
    useLineageStore.setState({ floatingNotes: [makeNote({ id: 'fn-e', content: '旧稿' })] })
    mountNotes()
    openEditor('fn-e')
    await advance(IDLE_FLUSH_MS * 2)
    expect(stubApi.lineage.upsertFloatingNote).not.toHaveBeenCalled()
    expect(state().saveStatus).toBe('clean')
    state().moveNode('A', 10, 10) // 无草稿的普通编辑
    expect(state().queue).toHaveLength(1)
    await advance(IDLE_FLUSH_MS - 1)
    expect(stubApi.lineage.patchNode).not.toHaveBeenCalled()
    await advance(1)
    await microtasks()
    expect(stubApi.lineage.patchNode).toHaveBeenCalledTimes(1)
    expect(state().saveStatus).toBe('clean')
    expect(taOf('fn-e')).not.toBeNull()
  })
})

describe('提交被拒＝重排（不丢稿）', () => {
  it('到期时会话写链在途（F=1）：不提交、重排；链落定后的下一次到期提交', async () => {
    useLineageStore.setState({ floatingNotes: [makeNote({ id: 'fn-e', content: '旧稿' })] })
    mountNotes()
    openEditor('fn-e')
    await type(taOf('fn-e')!, '在途窗草稿')
    // 后台失效事件的和解入链（和解读挂起——F=1；reconcileNow 不动 idle timer）
    let releaseRead: ((v: { ok: true; data: LineageGraphRes }) => void) | null = null
    stubApi.lineage.graph.mockImplementationOnce(() => new Promise((r) => { releaseRead = r }))
    const releaseGraph = (v: { ok: true; data: LineageGraphRes }): void => void releaseRead?.(v)
    useLineageStore.setState({ needsReload: true })
    let reconciling: Promise<ReconcileOutcome> | null = null
    act(() => {
      reconciling = lineageRegistry.lane(MAIN).reconcileNow()
    })
    await advance(IDLE_FLUSH_MS)
    try {
      expect(state().inflight?.kind).toBe('reconcile') // 前提：链在途
      expect(noteIpc()).toEqual([]) // 同会话 saving 锁：到期不提交
      expect(noteDraftPending(), '草稿保真').toBe(true)
    } finally {
      releaseGraph({
        ok: true,
        data: { nodes: [], edges: [], lineTypeNames: defaultLineTypeNames(), paperMetrics: {}, pubNos: {}, tagNames: {}, floatingNotes: [makeNote({ id: 'fn-e', content: '旧稿' })] }
      }) // 断言失败也不占链
    }
    await expect(reconciling).resolves.toBe('applied')
    await microtasks()
    expect(state().saveStatus).toBe('clean')
    expect(noteIpc()).toEqual([]) // 链刚落定：尚未到期
    expect(taOf('fn-e')).not.toBeNull()
    await advance(IDLE_FLUSH_MS)
    await microtasks()
    expect(noteIpc().map((c) => c.content)).toEqual(['在途窗草稿']) // 重排后的到期提交
    expect(noteDraftPending()).toBe(false)
  })

  it('到期时卡片拖拽两态在场：不提交、重排；拖拽收尾后的下一次到期提交', async () => {
    useLineageStore.setState({ floatingNotes: [makeNote({ id: 'fn-e', content: '旧稿' })] })
    mountNotes()
    openEditor('fn-e')
    await type(taOf('fn-e')!, '拖拽窗草稿')
    const generation = entry().data.sessionGeneration
    lineageRegistry.dragStart(MAIN, generation, 'drag-hold') // 态一在场（两态阻塞写起步，§9.3）
    await advance(IDLE_FLUSH_MS)
    expect(noteIpc()).toEqual([])
    expect(noteDraftPending()).toBe(true)
    lineageRegistry.dragEnd(MAIN, generation, 'drag-hold')
    await advance(IDLE_FLUSH_MS)
    await microtasks()
    expect(noteIpc().map((c) => c.content)).toEqual(['拖拽窗草稿'])
    expect(noteDraftPending()).toBe(false)
  })

  it('quit closing 期到期：不提交（草稿保真，由退出握手 ②.5 承接）', async () => {
    useLineageStore.setState({ floatingNotes: [makeNote({ id: 'fn-e', content: '旧稿' })] })
    mountNotes()
    openEditor('fn-e')
    await type(taOf('fn-e')!, '冻结窗草稿')
    setQuitClosing(true)
    try {
      await advance(IDLE_FLUSH_MS * 2)
      expect(noteIpc()).toEqual([])
      expect(noteDraftPending()).toBe(true)
    } finally {
      setQuitClosing(false)
    }
  })
})
