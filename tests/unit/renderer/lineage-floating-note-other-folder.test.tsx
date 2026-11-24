// @vitest-environment jsdom
/**
 * [回炉 W-D1·T-B02 / 设计稿 §12.2 lineage-floating-note-ui 行「其他 folder saving 不锁当前 folder
 * 交互」；§2.2「lineage 保留既有同一会话 saving 编辑锁，但不再用该锁阻止切换到另一个 folder」；
 * INV-149] 悬浮笔记交互门（LineageFloatingNotes：判据=活动会话 IO 在途）的会话域锁定。
 *
 * 既有两件（lineage-floating-note-ui／-rework）只有活动会话自身的 IO 断言——全 tests 无「他会话
 * saving、当前会话 IO clean」场景。本件：
 * - 判别面：挂起会话 f-b 的写 IPC 真在途（lane.save，回显挂起）时，当前图（主图）的笔记可交互——
 *   pointer-events 不让位、书签柄在场、空白右键开菜单、新建进编辑态、blur 提交入**当前会话**队列
 *   （f-b 的队列引用原样、历史不被写入）；
 * - 对照面：当前会话自身的写在途→照旧让位；落定后恢复可达（同会话 saving 锁不因跨会话放行而丢）。
 * always-active 裸 describe（K3）。量测桩口径同首版件（own 域 1000×800，origin 40/20）。
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
import type { FloatingNote, LineageNode } from '../../../src/shared/models/lineage'
import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'
import { useLineageViewStore } from '../../../src/renderer/features/lineage/lineage-view.store'
import { lineageRegistry } from '../../../src/renderer/features/lineage/lineage-session-registry'
import { LineageFloatingNotes } from '../../../src/renderer/features/lineage/LineageFloatingNotes'
import { resetLineageSessionsForTests } from './lineage-test-session-reset'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

const MAIN = '__main__'
const SUSPENDED = 'f-b'

function note(over: Partial<FloatingNote> = {}): FloatingNote {
  return { id: 'fn-1', folderId: MAIN, x: 100, y: 100, content: '内容甲', createdAt: 't0', updatedAt: 't0', ...over }
}
function node(id: string, folderId: string): LineageNode {
  return { id, paperId: `paper-${id}`, title: `节点${id}`, year: 2022, x: 1, y: 1, month: 9, slot: 0, folderId, createdAt: 't', updatedAt: 't' }
}

let root: Root | null = null
let host: HTMLDivElement | null = null
let contentEl: HTMLDivElement | null = null

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
const suspended = () => lineageRegistry.entry(SUSPENDED)!.data
const noteElOf = (id: string): HTMLElement | null => document.querySelector(`.tl-note[data-note-id="${id}"]`)
const menuEl = (): HTMLElement | null => document.querySelector('[data-testid="note-anchor-menu"]')
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
/** 微任务轮转（让写链推进到在途/落定）——每轮包 act（store 变更经已挂载组件提交） */
const flushTurns = async (turns = 10): Promise<void> => {
  for (let i = 0; i < turns; i++) {
    await act(async () => {
      await Promise.resolve()
    })
  }
}

beforeEach(() => {
  resetLineageSessionsForTests()
  vi.clearAllMocks()
  for (const fn of Object.values(stubApi.lineage)) fn.mockReset()
  stubApi.lineage.graph.mockResolvedValue({ ok: true, data: { nodes: [], edges: [], floatingNotes: [] } })
  stubApi.lineage.patchNode.mockImplementation(async (req: Partial<LineageNode>) => ({ ok: true as const, data: { ...node(String(req.id), MAIN), ...req } }))
  stubApi.lineage.upsertFloatingNote.mockImplementation(async (req: Partial<FloatingNote>) => ({ ok: true as const, data: note(req) }))
  useLineageStore.setState({
    nodes: [],
    edges: [],
    floatingNotes: [note()],
    status: 'ready',
    error: null,
    saveStatus: 'clean',
    lastWriteError: null,
    queue: [],
    flushing: false,
    inflight: null,
    undoStack: [],
    redoStack: [],
    unfinalized: false,
    folderId: MAIN
  })
  useLineageViewStore.setState({ mode: 'edit', tool: 'select', zoom: 1 })
})

/** 本例挂起的写回显的放行句柄（收尾一律放行——断言先红时不留悬挂写链） */
const heldWrites: Array<() => void> = []

afterEach(async () => {
  // 先卸载组件（store 变更不再触发已挂载组件的渲染）——放行挂起的写、取消 idle timer、清出会话（未落定写先 flush）
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
  contentEl = null
  for (const release of heldWrites.splice(0)) release()
  await flushTurns()
  lineageRegistry.cancelAllIdle()
  resetLineageSessionsForTests()
})

describe('其他 folder saving 不锁当前 folder 交互（§2.2、INV-149——[回炉 W-D1]）', () => {
  it('挂起会话 f-b 的写在途：当前图笔记可达、可新建、提交入当前会话队列；f-b 的队列与历史不被写入', async () => {
    let release!: (v: { ok: true; data: LineageNode }) => void
    const landB1 = (): void => {
      release({ ok: true, data: { ...node('B1', SUSPENDED), x: 20, y: 20 } })
    }
    heldWrites.push(landB1)
    stubApi.lineage.patchNode.mockImplementation((req: Partial<LineageNode>) =>
      req.id === 'B1' ? new Promise((r) => { release = r }) : Promise.resolve({ ok: true as const, data: { ...node(String(req.id), MAIN), ...req } })
    )
    lineageRegistry.ensure(SUSPENDED)
    lineageRegistry.update(SUSPENDED, { nodes: [node('B1', SUSPENDED)], status: 'ready' })
    lineageRegistry.lane(SUSPENDED).commands.moveNode('B1', 20, 20) // 挂起会话：Q=1、undo 1
    const suspendedQueue = suspended().queue
    const suspendedUndo = suspended().undoStack
    act(() => {
      void lineageRegistry.lane(SUSPENDED).save() // f-b 的写 IPC 起飞（回显挂起）
    })
    await flushTurns()
    expect(suspended().inflight?.kind, '前提：f-b 写在途').toBe('write')
    expect(suspended().saveStatus).toBe('saving')
    expect(stubApi.lineage.patchNode).toHaveBeenCalledTimes(1)
    expect(state().inflight, '当前会话（主图）IO clean、无在途').toBeNull()
    expect(state().folderId).toBe(MAIN)

    mountNotes()
    // 交互门开：不让位、书签柄在场
    expect(noteElOf('fn-1')!.style.pointerEvents, '他会话 saving 不锁当前图笔记').not.toBe('none')
    expect(noteElOf('fn-1')!.querySelector('.tl-note-grip'), '书签柄在场').not.toBeNull()
    // 新建：空白右键开菜单→创建即进编辑态
    act(() => {
      openBlankMenu(240, 220)
    })
    expect(menuEl(), '空白右键菜单可开').not.toBeNull()
    act(() => {
      clickMenuItem('新建悬浮笔记')
    })
    expect(state().floatingNotes, '新建笔记落当前图（他会话在途不拒本会话的编辑单元）').toHaveLength(2)
    const created = state().floatingNotes[1]!
    expect(created.folderId, '新笔记落当前图').toBe(MAIN)
    const ta = noteElOf(created.id)!.querySelector('textarea')
    expect(document.activeElement, '创建即编辑态聚焦').toBe(ta)
    // 编辑提交：入当前会话队列（动作载荷专项）
    act(() => {
      typeInto(ta!, '乙稿')
    })
    act(() => {
      blurTa(ta!)
    })
    expect(state().queue).toEqual([
      { kind: 'upsert-floating-note', input: { id: created.id, folderId: MAIN, x: created.x, y: created.y, content: '乙稿' } }
    ])
    expect(state().undoStack.map((e) => e.command)).toEqual(['addFloatingNote', 'updateFloatingNote'])
    expect(state().saveStatus).toBe('dirty')
    // 其他 folder 不动：f-b 的队列引用原样、历史不被写入；f-b 的写仍在途
    expect(suspended().queue, 'f-b 队列引用原样').toBe(suspendedQueue)
    expect(suspended().undoStack, 'f-b 历史不被写入').toBe(suspendedUndo)
    expect(suspended().floatingNotes, '新笔记不落 f-b 图').toEqual([])
    expect(suspended().inflight?.kind).toBe('write')
    // f-b 落定：当前图的交互门不受其收尾影响
    await act(async () => {
      landB1()
      await flushTurns()
    })
    expect(suspended().saveStatus).toBe('clean')
    expect(noteElOf('fn-1')!.style.pointerEvents).not.toBe('none')
    expect(noteElOf(created.id)!.textContent).toContain('乙稿')
  })

  it('对照：当前会话自身的写在途→照旧让位（pointer-events none、空白右键无菜单）；落定后恢复可达', async () => {
    let release!: (v: { ok: true; data: FloatingNote }) => void
    const landNote = (): void => {
      release({ ok: true, data: note({ content: '甲改' }) })
    }
    heldWrites.push(landNote)
    stubApi.lineage.upsertFloatingNote.mockImplementation(() => new Promise((r) => { release = r }))
    mountNotes()
    act(() => {
      state().updateFloatingNote('fn-1', { content: '甲改' }) // 当前会话：Q=1
      void state().save()
    })
    await flushTurns()
    expect(state().inflight?.kind, '前提：当前会话写在途').toBe('write')
    expect(noteElOf('fn-1')!.style.pointerEvents, '同会话 saving 锁仍在').toBe('none')
    expect(noteElOf('fn-1')!.querySelector('.tl-note-grip')).toBeNull()
    act(() => {
      openBlankMenu(240, 220)
    })
    expect(menuEl()).toBeNull()
    await act(async () => {
      landNote()
      await flushTurns()
    })
    expect(state().saveStatus).toBe('clean')
    expect(noteElOf('fn-1')!.style.pointerEvents, '落定后恢复可达').not.toBe('none')
    expect(noteElOf('fn-1')!.querySelector('.tl-note-text')?.textContent, '服务器回显真实文本').toBe('甲改')
  })
})
