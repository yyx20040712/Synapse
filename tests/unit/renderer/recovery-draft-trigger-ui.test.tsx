// @vitest-environment jsdom
/**
 * [F-VISFB-65 回炉 R1 组件面] 编辑既有笔记纯打字→调度器收到触发（桥
 * effect→快照→save 全链——e2e 判别段的单测锚）。always-active。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { makeApiStub } from '../../utils/api-client-mock'

const stubApi = makeApiStub({
  recovery: { peek: vi.fn(), save: vi.fn(), read: vi.fn(), release: vi.fn() },
  lineage: {
    graph: vi.fn(),
    patchNode: vi.fn(),
    removeNode: vi.fn(),
    upsertEdge: vi.fn(),
    removeEdge: vi.fn(),
    upsertLineTypes: vi.fn(),
    upsertFloatingNote: vi.fn(),
    removeFloatingNote: vi.fn()
  }
})

import { LineageFloatingNotes } from '../../../src/renderer/features/lineage/LineageFloatingNotes'
import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'
import { useLineageViewStore } from '../../../src/renderer/features/lineage/lineage-view.store'
import { noteDraftSnapshot, setNoteDraftSnapshot } from '../../../src/renderer/features/lineage/lineage-note-draft'
import {
  enterWorkspaceRecovery,
  initRecoveryScheduler,
  resetRecoveryScheduler
} from '../../../src/renderer/features/lineage/recoveryScheduler'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
let host: HTMLDivElement | null = null

beforeEach(async () => {
  vi.clearAllMocks()
  vi.useFakeTimers()
  resetRecoveryScheduler()
  setNoteDraftSnapshot(null)
  stubApi.recovery.peek.mockResolvedValue({
    ok: true,
    data: { slots: { 'lineage-session': { status: 'empty', epoch: 0 } } }
  })
  stubApi.recovery.save.mockResolvedValue({ ok: true, data: { status: 'saved', token: 't1', epoch: 0 } })
  stubApi.lineage.upsertFloatingNote.mockResolvedValue({
    ok: true,
    data: { id: 'n1', folderId: '__main__', x: 0, y: 0, content: '', createdAt: 't', updatedAt: 't' }
  })
  initRecoveryScheduler({
    workspaceId: () => 'ws-1',
    snapshot: () => {
      const s = useLineageStore.getState()
      return s.saveStatus === 'clean' && noteDraftSnapshot() === null
        ? null
        : { folderId: s.folderId, graph: { nodes: s.nodes, edges: s.edges, lineTypeNames: s.lineTypeNames, floatingNotes: s.floatingNotes }, queue: s.queue, draft: noteDraftSnapshot() }
    },
    loadPayload: () => undefined,
    onRestored: () => undefined,
    openLineageView: () => undefined,
    discardLoadedSession: () => useLineageStore.getState().discardSession()
  })
  await enterWorkspaceRecovery()
  useLineageStore.setState({
    nodes: [],
    edges: [],
    status: 'ready',
    error: null,
    saveStatus: 'clean',
    lastWriteError: null,
    queue: [],
    flushing: false,
    needsReload: false,
    undoStack: [],
    redoStack: [],
    folderId: '__main__',
    floatingNotes: []
  })
  useLineageViewStore.setState({ mode: 'edit', tool: 'select', focusSet: [], navCollapsed: false, navWidth: 208 })
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  host?.remove()
  root = null
  host = null
  vi.useRealTimers()
  resetRecoveryScheduler()
  setNoteDraftSnapshot(null)
})

describe('R1 组件面：编辑既有笔记纯打字→调度器收到触发（桥 effect→快照→save）', () => {
  it('右键创建→打字→300ms 后副本含草稿；再打字→副本更新', async () => {
    useLineageViewStore.setState({ mode: 'edit', tool: 'select', focusSet: [], navCollapsed: false, navWidth: 208 })
    const host = document.createElement('div')
    document.body.appendChild(host)
    const contentEl = document.createElement('div')
    contentEl.className = 'tl-content'
    host.appendChild(contentEl)
    contentEl.getBoundingClientRect = () => ({ left: 0, top: 0, right: 1000, bottom: 800, width: 1000, height: 800, x: 0, y: 0 }) as DOMRect
    Object.defineProperty(contentEl, 'offsetWidth', { value: 1000, configurable: true })
    Object.defineProperty(contentEl, 'offsetHeight', { value: 800, configurable: true })
    const root = createRoot(host)
    act(() => {
      root.render(<LineageFloatingNotes contentRef={{ current: contentEl }} />)
    })
    try {
      act(() => {
        contentEl.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 900, clientY: 700 }))
      })
      const menu = document.querySelector('[data-testid="note-anchor-menu"]')
      expect(menu).not.toBeNull()
      act(() => {
        ;(Array.from(menu!.querySelectorAll('[role="menuitem"]')).find((b) => b.textContent === '新建悬浮笔记') as HTMLElement)!.click()
      })
      await act(async () => {
        for (let i = 0; i < 6; i++) await Promise.resolve()
      })
      const input = document.querySelector('.tl-note-input') as HTMLTextAreaElement
      expect(input).not.toBeNull()
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!
      await act(async () => {
        setter.call(input, '打字甲')
        input.dispatchEvent(new Event('input', { bubbles: true }))
        for (let i = 0; i < 6; i++) await Promise.resolve()
      })
      await act(async () => {
        await vi.advanceTimersByTimeAsync(300)
      })
      expect(stubApi.recovery.save).toHaveBeenCalled()
      const req1 = stubApi.recovery.save.mock.calls[stubApi.recovery.save.mock.calls.length - 1]![0]
      expect(req1.payload.draft).toEqual({ noteId: expect.any(String), text: '打字甲' })
      // 再打字：副本更新（草稿文本变）
      await act(async () => {
        setter.call(input, '打字甲乙续')
        input.dispatchEvent(new Event('input', { bubbles: true }))
        for (let i = 0; i < 6; i++) await Promise.resolve()
      })
      await act(async () => {
        await vi.advanceTimersByTimeAsync(300)
      })
      const req2 = stubApi.recovery.save.mock.calls[stubApi.recovery.save.mock.calls.length - 1]![0]
      expect(req2.payload.draft).toMatchObject({ text: '打字甲乙续' })
    } finally {
      act(() => {
        root.unmount()
      })
      host.remove()
    }
  })
})
