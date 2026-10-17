// @vitest-environment jsdom
/**
 * [F-VISFB-63] 悬浮笔记编辑草稿收口面测试（always-active——不经
 * guardedDescribe）。62 号 d1 复审 W2 缺陷链：未 blur 草稿驻组件态
 * （editingId/draft）不入暂存队列——编辑中关窗/切图/saving 窗静默丢稿；
 * saving 进入 textarea 卸载无 blur 同链（React 不对已卸载节点派发
 * onBlur）。修法=lineage-note-draft 注册族裁剪版（F-VISFB-15 先例形态）
 * 三收口（quit ②.5/视图离场/切图打断）+一聚合（App quitDirty）。
 * 切图打断族与回炉轮 1 面（R1/R3/R4/R6）拆驻
 * lineage-note-draft-flush-r1.test.tsx（500 行红线——F-VISFB-44 拆件先例）。
 *
 * 状态机跨格序列（票面 T1-T10）：
 * - T1/T2/T3 信号面：进编辑 pending=draft≠note.content；打字翻真恰一次
 *   （等值 no-op 零 emit）；打字回原值翻假；blur 收口清+store 收口；
 * - T7 quit 主轴：runQuitFlush ②.5 fire commit→③ save 正道落库→
 *   stillDirty=false（改稿 upsert/空稿 remove/未变零写三态）；
 * - T4/T5 saving 两序：saving 进入 pending 不清+textarea 卸载（无 blur 同链
 *   零丢稿）；结束 textarea 回挂 draft 保留+pending 仍真（本票靶心）；
 * - T6 视图离场：switchViewWithFlush('lineage'→他) fire-first 不阻路由
 *   （三态同 T7）；unmount 注销后 fire 零触达。
 * 模块态隔离：lineage-note-draft 模块级单例逐用例复位（unregister+pending
 * 清）；lineage store 逐用例 reset；量测桩口径同 rework 件（own 域）。
 */
import { makeApiStub } from '../../utils/api-client-mock'

const stubApi = makeApiStub({
  lineage: { graph: vi.fn(), upsertFloatingNote: vi.fn(), removeFloatingNote: vi.fn() }
})

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FloatingNote } from '../../../src/shared/models/lineage'
import { runQuitFlush } from '../../../src/renderer/app/quit-flush'
import { switchViewWithFlush } from '../../../src/renderer/app/view-flush'
import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'
import { useLineageViewStore } from '../../../src/renderer/features/lineage/lineage-view.store'
import {
  fireLineageNoteCommit,
  noteDraftPending,
  registerNoteDraftFlush,
  setNoteDraftPending,
  subscribeNoteDraft,
  unregisterNoteDraftFlush
} from '../../../src/renderer/features/lineage/lineage-note-draft'
import { LineageFloatingNotes } from '../../../src/renderer/features/lineage/LineageFloatingNotes'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

function makeNote(over: Partial<FloatingNote> = {}): FloatingNote {
  return {
    id: over.id ?? 'fn-1',
    folderId: '__main__',
    x: 100,
    y: 100,
    content: '基线',
    createdAt: 't0',
    updatedAt: 't0',
    ...over
  }
}

let root: Root | null = null
let host: HTMLDivElement | null = null
let contentEl: HTMLDivElement | null = null

/** 直挂组件面（rework 件同型量测桩：rect/offset 全 own 域，1000×800） */
function mountNotes(): void {
  host = document.createElement('div')
  document.body.appendChild(host)
  contentEl = document.createElement('div')
  contentEl.className = 'tl-content'
  host.appendChild(contentEl)
  contentEl.getBoundingClientRect = () =>
    ({ left: 40, top: 20, right: 1040, bottom: 820, width: 1000, height: 800, x: 40, y: 20 }) as DOMRect
  Object.defineProperty(contentEl, 'offsetWidth', { value: 1000, configurable: true })
  Object.defineProperty(contentEl, 'offsetHeight', { value: 800, configurable: true })
  root = createRoot(host)
  act(() => {
    root?.render(<LineageFloatingNotes contentRef={{ current: contentEl }} />)
  })
}

const state = () => useLineageStore.getState()
const noteElOf = (id: string): HTMLElement | null => document.querySelector(`.tl-note[data-note-id="${id}"]`)
const pdown = (el: Element, clientX: number, clientY: number): void => {
  el.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true, button: 0, clientX, clientY }))
}
const openBlankMenu = (clientX: number, clientY: number): void => {
  contentEl!.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX, clientY }))
}
const clickMenuItem = (label: string): void => {
  const btn = Array.from(document.querySelectorAll('[role="menuitem"]')).find((b) => b.textContent === label)
  btn?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
}
const typeInto = (ta: HTMLTextAreaElement, value: string): void => {
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!
  setter.call(ta, value)
  ta.dispatchEvent(new Event('input', { bubbles: true }))
}
const blurTa = (ta: HTMLElement): void => {
  ta.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
}
/** 进编辑态并输入草稿（pdown 笔记本体 → textarea 打字） */
const editDraft = (id: string, text: string): void => {
  act(() => {
    pdown(noteElOf(id)!, 150, 150)
  })
  act(() => {
    typeInto(noteElOf(id)!.querySelector('textarea')! as HTMLTextAreaElement, text)
  })
}
const upsQueue = () => state().queue.filter((a) => a.kind === 'upsert-floating-note')
const rmQueue = () => state().queue.filter((a) => a.kind === 'remove-floating-note')

beforeEach(() => {
  vi.clearAllMocks()
  for (const fn of Object.values(stubApi.lineage)) fn.mockReset()
  stubApi.lineage.graph.mockResolvedValue({ ok: true, data: { nodes: [], edges: [], floatingNotes: [] } })
  stubApi.lineage.upsertFloatingNote.mockImplementation(
    async (req: { id?: string; folderId: string; x: number; y: number; content: string }) =>
      ({ ok: true, data: makeNote({ id: req.id ?? 'fn-new', ...req, createdAt: 't0', updatedAt: 't1' }) })
  )
  stubApi.lineage.removeFloatingNote.mockResolvedValue({ ok: true, data: { ok: true } })
  useLineageStore.setState({
    nodes: [],
    edges: [],
    floatingNotes: [],
    lineTypeNames: ['待命名', '待命名', '待命名', '待命名', '待命名', '待命名'],
    status: 'ready',
    error: null,
    saveStatus: 'clean',
    lastWriteError: null,
    queue: [],
    flushing: false,
    undoStack: [],
    redoStack: [],
    folderId: '__main__'
  })
  useLineageViewStore.setState({ mode: 'edit', tool: 'select', zoom: 1 })
  // 模块级单例复位（annotation-draft-flush 先例——防跨用例泄漏）
  unregisterNoteDraftFlush()
  setNoteDraftPending(false)
  document.documentElement.style.removeProperty('--ui-scale')
})

afterEach(async () => {
  await act(async () => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
  contentEl = null
  unregisterNoteDraftFlush()
  setNoteDraftPending(false)
})

describe('注册族单元（模块级单例——set/clear/订阅/等值 no-op/fire 守卫）', () => {
  it('pending set/clear 沿订阅推送+等值 no-op（零 emit）+退订零推送', () => {
    let emits = 0
    const unsub = subscribeNoteDraft(() => {
      emits += 1
    })
    expect(noteDraftPending()).toBe(false)
    setNoteDraftPending(true)
    expect(emits).toBe(1)
    expect(noteDraftPending()).toBe(true)
    setNoteDraftPending(true)
    expect(emits).toBe(1)
    setNoteDraftPending(false)
    expect(emits).toBe(2)
    unsub()
    setNoteDraftPending(true)
    expect(emits).toBe(2)
    expect(noteDraftPending()).toBe(true)
  })

  it('register/fire 消费句柄+unregister 后零触达+flushing 守卫（真 store set state 驱动）', () => {
    const handle = vi.fn()
    registerNoteDraftFlush(handle)
    act(() => {
      fireLineageNoteCommit()
    })
    expect(handle).toHaveBeenCalledTimes(1)
    act(() => {
      useLineageStore.setState({ flushing: true })
    })
    setNoteDraftPending(true)
    act(() => {
      fireLineageNoteCommit()
    })
    expect(handle).toHaveBeenCalledTimes(1)
    expect(noteDraftPending()).toBe(true)
    act(() => {
      useLineageStore.setState({ flushing: false })
    })
    unregisterNoteDraftFlush()
    act(() => {
      fireLineageNoteCommit()
    })
    expect(handle).toHaveBeenCalledTimes(1)
  })
})

describe('T1/T2/T3 信号面（组件桥——draft≠note.content 求值）', () => {
  it('进编辑 pending 假→打字翻真恰一次→续键零 emit→回原值翻假→blur 收口清+store 收口', () => {
    let emits = 0
    // [R5] 用例毕退订（模块级订阅集不跨用例泄漏）
    const unsub = subscribeNoteDraft(() => {
      emits += 1
    })
    useLineageStore.setState({ floatingNotes: [makeNote({ id: 'fn-s', content: '基线' })] })
    mountNotes()
    act(() => {
      pdown(noteElOf('fn-s')!, 150, 150)
    })
    expect(noteDraftPending()).toBe(false)
    const ta = noteElOf('fn-s')!.querySelector('textarea')! as HTMLTextAreaElement
    act(() => {
      typeInto(ta, '改稿')
    })
    expect(noteDraftPending()).toBe(true)
    expect(emits).toBe(1)
    act(() => {
      typeInto(ta, '改稿更长')
    })
    expect(noteDraftPending()).toBe(true)
    expect(emits).toBe(1)
    act(() => {
      typeInto(ta, '基线')
    })
    expect(noteDraftPending()).toBe(false)
    expect(emits).toBe(2)
    act(() => {
      blurTa(ta)
    })
    expect(noteDraftPending()).toBe(false)
    expect(state().queue).toHaveLength(0)
    expect(state().floatingNotes[0]!.content).toBe('基线')
    unsub()
  })
})

describe('T7 quit 握手主轴（runQuitFlush ②.5 fire→③ save→④ 查态）', () => {
  it('改稿收口：fire commit 入队→save 落库载荷=草稿真值→stillDirty=false 零确认退出', async () => {
    useLineageStore.setState({ floatingNotes: [makeNote({ id: 'fn-q1', content: '基线' })] })
    mountNotes()
    editDraft('fn-q1', '退出前草稿')
    expect(noteDraftPending()).toBe(true)
    let stillDirty = true
    await act(async () => {
      stillDirty = await runQuitFlush()
    })
    expect(stillDirty).toBe(false)
    expect(stubApi.lineage.upsertFloatingNote).toHaveBeenCalledTimes(1)
    expect(stubApi.lineage.upsertFloatingNote).toHaveBeenCalledWith(expect.objectContaining({ content: '退出前草稿' }))
    expect(state().saveStatus).toBe('clean')
    expect(noteDraftPending()).toBe(false)
  })

  it('T8 空稿收口（quit 轴）：新建零输入→runQuitFlush→remove 派发+stillDirty=false', async () => {
    mountNotes()
    act(() => {
      openBlankMenu(240, 220)
    })
    act(() => {
      clickMenuItem('新建悬浮笔记')
    })
    const created = state().floatingNotes[0]!
    let stillDirty = true
    await act(async () => {
      stillDirty = await runQuitFlush()
    })
    expect(stillDirty).toBe(false)
    expect(stubApi.lineage.removeFloatingNote).toHaveBeenCalledTimes(1)
    expect(stubApi.lineage.removeFloatingNote).toHaveBeenCalledWith({ id: created.id })
    expect(state().floatingNotes).toHaveLength(0)
  })

  it('未变稿：零写收口——quit 后无 IPC 派发+stillDirty=false+会话收口（textarea 消失）', async () => {
    useLineageStore.setState({ floatingNotes: [makeNote({ id: 'fn-q3', content: '基线' })] })
    mountNotes()
    act(() => {
      pdown(noteElOf('fn-q3')!, 150, 150)
    })
    expect(noteElOf('fn-q3')!.querySelector('textarea')).not.toBeNull()
    let stillDirty = true
    await act(async () => {
      stillDirty = await runQuitFlush()
    })
    expect(stillDirty).toBe(false)
    expect(stubApi.lineage.upsertFloatingNote).not.toHaveBeenCalled()
    expect(stubApi.lineage.removeFloatingNote).not.toHaveBeenCalled()
    expect(noteElOf('fn-q3')!.querySelector('textarea')).toBeNull()
  })

  it('T10 flushing 窗：fire no-op——pending 保真→stillDirty=true（main confirm 降级不静默丢）', async () => {
    useLineageStore.setState({ floatingNotes: [makeNote({ id: 'fn-q4', content: '基线' })] })
    mountNotes()
    editDraft('fn-q4', '保存窗草稿')
    act(() => {
      useLineageStore.setState({ flushing: true, saveStatus: 'saving', queue: [{ kind: 'remove-edge', id: 'e-x' }] })
    })
    let stillDirty = false
    await act(async () => {
      stillDirty = await runQuitFlush()
    })
    expect(stillDirty).toBe(true)
    expect(stubApi.lineage.upsertFloatingNote).not.toHaveBeenCalled()
    expect(noteDraftPending()).toBe(true)
  })

  it('T9 他径已删：quit 收口静默出会话——零写+pending 清+stillDirty=false', async () => {
    useLineageStore.setState({ floatingNotes: [makeNote({ id: 'fn-q5', content: '基线' })] })
    mountNotes()
    editDraft('fn-q5', '幽灵前草稿')
    expect(noteDraftPending()).toBe(true)
    act(() => {
      useLineageStore.setState({ floatingNotes: [] })
    })
    expect(noteDraftPending()).toBe(false)
    let stillDirty = true
    await act(async () => {
      stillDirty = await runQuitFlush()
    })
    expect(stillDirty).toBe(false)
    expect(stubApi.lineage.upsertFloatingNote).not.toHaveBeenCalled()
    expect(stubApi.lineage.removeFloatingNote).not.toHaveBeenCalled()
    expect(noteDraftPending()).toBe(false)
  })
})

describe('T4/T5 saving 两序（靶心——clean+驻组件=静默丢稿面）', () => {
  it('saving 进入：pending 不清+textarea 卸载；结束：回挂 draft 保留+pending 仍真', () => {
    useLineageStore.setState({ floatingNotes: [makeNote({ id: 'fn-w', content: '基线' })] })
    mountNotes()
    editDraft('fn-w', '跨保存草稿')
    expect(noteDraftPending()).toBe(true)
    act(() => {
      useLineageStore.setState({ flushing: true, saveStatus: 'saving' })
    })
    expect(noteElOf('fn-w')!.querySelector('textarea')).toBeNull()
    expect(noteDraftPending()).toBe(true)
    act(() => {
      useLineageStore.setState({ flushing: false, saveStatus: 'clean' })
    })
    const ta = noteElOf('fn-w')!.querySelector('textarea')! as HTMLTextAreaElement
    expect(ta.value).toBe('跨保存草稿')
    expect(noteDraftPending()).toBe(true)
    expect(state().queue).toHaveLength(0)
  })
})

describe('T6 视图离场（switchViewWithFlush fire-first 不阻路由）', () => {
  it('改稿：切走→commit 入队（upsert 草稿真值）+setView 照调+pending 清', () => {
    useLineageStore.setState({ floatingNotes: [makeNote({ id: 'fn-v1', content: '基线' })] })
    mountNotes()
    editDraft('fn-v1', '切走草稿')
    const setView = vi.fn()
    act(() => {
      switchViewWithFlush('lineage', 'library', setView)
    })
    expect(setView).toHaveBeenCalledWith('library')
    expect(upsQueue()).toHaveLength(1)
    expect(upsQueue()[0]).toMatchObject({ input: { id: 'fn-v1', content: '切走草稿' } })
    expect(state().floatingNotes[0]!.content).toBe('切走草稿')
    expect(noteDraftPending()).toBe(false)
  })

  it('T8 空稿（视图轴）：切走→remove 入队', () => {
    mountNotes()
    act(() => {
      openBlankMenu(240, 220)
    })
    act(() => {
      clickMenuItem('新建悬浮笔记')
    })
    act(() => {
      switchViewWithFlush('lineage', 'library', vi.fn())
    })
    expect(rmQueue()).toHaveLength(1)
    expect(state().floatingNotes).toHaveLength(0)
  })

  it('未变稿：切走→零写（队列空）+会话收口（textarea 消失）', () => {
    useLineageStore.setState({ floatingNotes: [makeNote({ id: 'fn-v3', content: '基线' })] })
    mountNotes()
    act(() => {
      pdown(noteElOf('fn-v3')!, 150, 150)
    })
    expect(noteElOf('fn-v3')!.querySelector('textarea')).not.toBeNull()
    act(() => {
      switchViewWithFlush('lineage', 'library', vi.fn())
    })
    expect(state().queue).toHaveLength(0)
    expect(state().floatingNotes[0]!.content).toBe('基线')
    expect(noteElOf('fn-v3')!.querySelector('textarea')).toBeNull()
  })

  it('unmount 注销：卸载后 fire 零触达 store+pending 随卸载清', async () => {
    // 边界声明：无 fire 的卸载（ErrorBoundary 捕获族窄面）=组件态弃稿——登记
    // 边界不修（本用例锁的是 fire 注销面，非卸载兜底承诺）
    useLineageStore.setState({ floatingNotes: [makeNote({ id: 'fn-v4', content: '基线' })] })
    mountNotes()
    editDraft('fn-v4', '卸载前草稿')
    expect(noteDraftPending()).toBe(true)
    await act(async () => {
      root?.unmount()
    })
    root = null
    expect(noteDraftPending()).toBe(false)
    act(() => {
      switchViewWithFlush('lineage', 'library', vi.fn())
    })
    expect(state().queue).toHaveLength(0)
    expect(state().floatingNotes[0]!.content).toBe('基线')
  })
})
