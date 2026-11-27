// @vitest-environment jsdom
/**
 * [B6 返工 4] 面板关闭后的工具栏重试：失败总评不在挂载句柄表，finalize 仍须
 * 经现有 notes.flushNow 派发写，不得停在 laneDrain/IO 复查。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub, stubUnwrap } from '../../utils/api-client-mock'
import { makeTab } from '../../utils/factories'
import { IDLE_FLUSH_MS } from '../../../src/shared/constants'

const stubApi = makeApiStub({ notes: { get: vi.fn(), save: vi.fn() } })
const notesGet = vi.fn()
stubApi.notes.get = notesGet
const notesSave = vi.fn()
stubApi.notes.save = notesSave
stubUnwrap(async (call) => await call)

import { ReaderNotesPanel } from '../../../src/renderer/features/reader/panels/ReaderNotesPanel'
import { ReaderToolbarCommands } from '../../../src/renderer/features/reader/view/ReaderToolbarCommands'
import { useReaderStore } from '../../../src/renderer/features/reader/state/reader.store'
import { useNotesStore } from '../../../src/renderer/features/notes/notes.store'
import { clearAllTextHistory } from '../../../src/renderer/features/reader/state/reader-text-history'
import { clearStack } from '../../../src/renderer/features/reader/state/annotation-undo'
import { resetTabLanes } from '../../../src/renderer/shared/tab-write-lane'
import { setQuitClosing } from '../../../src/renderer/app/quit-closing-gate'

const P = 'p-toolbar-note-retry'

function savedNote(contentMd: string) {
  return {
    id: `note-${P}`,
    paperId: P,
    contentMd,
    createdAt: '2026-11-27T00:00:00Z',
    updatedAt: '2026-11-27T00:01:00Z'
  }
}

let panelRoot: Root | null = null
let toolbarRoot: Root | null = null
let panelHost: HTMLDivElement | null = null
let toolbarHost: HTMLDivElement | null = null

function mount(): void {
  panelHost = document.createElement('div')
  toolbarHost = document.createElement('div')
  document.body.append(panelHost, toolbarHost)
  panelRoot = createRoot(panelHost)
  toolbarRoot = createRoot(toolbarHost)
  act(() => {
    panelRoot?.render(<ReaderNotesPanel annotations={[]} onLocate={() => undefined} />)
    toolbarRoot?.render(<ReaderToolbarCommands />)
  })
}

function body(): HTMLTextAreaElement {
  const el = panelHost?.querySelector<HTMLTextAreaElement>('textarea[aria-label="笔记正文"]')
  if (el === null || el === undefined) throw new Error('笔记正文不在场')
  return el
}

function savedText(): string {
  const el = panelHost?.querySelector<HTMLSpanElement>('[aria-live="polite"]')
  if (el === null || el === undefined) throw new Error('保存状态不在场')
  return el.textContent ?? ''
}

function saveButton(): HTMLButtonElement {
  const el = toolbarHost?.querySelector<HTMLButtonElement>('[data-testid="reader-toolbar-save"]')
  if (el === null || el === undefined) throw new Error('工具栏保存钮不在场')
  return el
}

function typeInto(el: HTMLTextAreaElement, text: string): void {
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
  setter?.call(el, text)
  el.dispatchEvent(new Event('input', { bubbles: true }))
}

beforeEach(() => {
  vi.useFakeTimers()
  ;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
  vi.clearAllMocks()
  setQuitClosing(false)
  resetTabLanes()
  clearAllTextHistory()
  clearStack(P)
  useReaderStore.setState({ tabs: { [P]: makeTab(P) }, order: [P], activeId: P })
  useNotesStore.getState().resetEditStateForTests()
  notesGet.mockResolvedValue({ ok: true, data: null })
  notesSave.mockRejectedValue(new Error('保存失败'))
  mount()
})

afterEach(async () => {
  await act(async () => {
    await vi.runOnlyPendingTimersAsync()
    for (let i = 0; i < 8; i += 1) await Promise.resolve()
  })
  act(() => {
    panelRoot?.unmount()
    toolbarRoot?.unmount()
  })
  resetTabLanes()
  clearAllTextHistory()
  clearStack(P)
  useNotesStore.getState().resetEditStateForTests()
  useReaderStore.setState({ tabs: {}, order: [], activeId: null })
  setQuitClosing(false)
  panelHost?.remove()
  toolbarHost?.remove()
  panelRoot = null
  toolbarRoot = null
  panelHost = null
  toolbarHost = null
  vi.useRealTimers()
})

describe('B6 工具栏笔记重试', () => {
  it('面板仍打开时首次失败只写一次，下一次显式重试才成功', async () => {
    await act(async () => {
      await vi.runOnlyPendingTimersAsync()
    })
    expect(useNotesStore.getState().noteByPaper[P]?.pending).toBe(false)

    act(() => {
      const el = body()
      el.focus()
      typeInto(el, '挂载失败重试')
    })
    expect(useReaderStore.getState().tabs[P]?.unfinalized).toBe(true)

    let rejectFirst: ((reason?: unknown) => void) | null = null
    notesSave.mockResolvedValue(savedNote('挂载失败重试'))
    notesSave.mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          rejectFirst = reject
        })
    )
    await act(async () => {
      await vi.advanceTimersByTimeAsync(IDLE_FLUSH_MS)
      for (let i = 0; i < 8; i += 1) await Promise.resolve()
    })
    expect(notesSave).toHaveBeenCalledTimes(1)
    expect(typeof rejectFirst).toBe('function')
    expect(useNotesStore.getState().noteByPaper[P]?.pending).toBe(true)
    expect(useNotesStore.getState().noteByPaper[P]?.saving).toBe(true)
    act(() => {
      saveButton().click()
    })
    await act(async () => {
      rejectFirst?.(new Error('保存失败'))
      for (let i = 0; i < 16; i += 1) await Promise.resolve()
    })
    expect(notesSave).toHaveBeenCalledTimes(1)
    expect(savedText()).toBe('保存失败')
    expect(saveButton().textContent).toContain('重试')
    expect(savedText()).toBe('保存失败')
    expect(saveButton().textContent).toContain('重试')
    expect(useNotesStore.getState().noteByPaper[P]?.pending).toBe(true)
    expect(useNotesStore.getState().noteByPaper[P]?.saveFailed).toBe(true)
    expect(useReaderStore.getState().tabs[P]?.unfinalized).toBe(true)

    act(() => {
      saveButton().click()
    })
    await act(async () => {
      await vi.runOnlyPendingTimersAsync()
      for (let i = 0; i < 16; i += 1) await Promise.resolve()
    })
    expect(notesSave).toHaveBeenCalledTimes(2)
    expect(notesSave).toHaveBeenLastCalledWith({ paperId: P, contentMd: '挂载失败重试' })
    expect(savedText()).toBe('已保存')
    expect(useNotesStore.getState().noteByPaper[P]?.pending).toBe(false)
    expect(useNotesStore.getState().noteByPaper[P]?.saveFailed).toBe(false)
    expect(useReaderStore.getState().tabs[P]?.unfinalized).toBe(false)
  })

  it('面板关闭后仍经 flushNow 重试并按未前进 revision 清 U', async () => {
    await act(async () => {
      await vi.runOnlyPendingTimersAsync()
    })
    expect(useNotesStore.getState().noteByPaper[P]?.pending).toBe(false)

    act(() => {
      const el = body()
      el.focus()
      typeInto(el, '重试这篇总评')
    })
    expect(useReaderStore.getState().tabs[P]?.unfinalized).toBe(true)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(IDLE_FLUSH_MS)
      for (let i = 0; i < 8; i += 1) await Promise.resolve()
    })
    expect(notesSave).toHaveBeenCalledTimes(1)
    expect(useNotesStore.getState().noteByPaper[P]?.pending).toBe(true)
    expect(useNotesStore.getState().noteByPaper[P]?.saveFailed).toBe(true)

    act(() => {
      panelRoot?.unmount()
    })
    await act(async () => {
      for (let i = 0; i < 8; i += 1) await Promise.resolve()
    })
    // 面板卸载已有失败重试；记录其调用数，后续只断言工具栏一次点击继续前进。
    const callsBeforeRetry = notesSave.mock.calls.length
    expect(callsBeforeRetry).toBeGreaterThan(1)
    expect(saveButton().disabled).toBe(false)
    expect(saveButton().textContent).toContain('重试')

    notesSave.mockResolvedValue(savedNote('重试这篇总评'))
    act(() => {
      saveButton().click()
    })
    await act(async () => {
      await vi.runOnlyPendingTimersAsync()
      for (let i = 0; i < 16; i += 1) await Promise.resolve()
    })
    expect(notesSave).toHaveBeenCalledTimes(callsBeforeRetry + 1)
    expect(notesSave).toHaveBeenLastCalledWith({ paperId: P, contentMd: '重试这篇总评' })
    expect(useNotesStore.getState().noteByPaper[P]?.pending).toBe(false)
    expect(useNotesStore.getState().noteByPaper[P]?.saveFailed).toBe(false)
    expect(useReaderStore.getState().tabs[P]?.unfinalized).toBe(false)
  })
})
