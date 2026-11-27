// @vitest-environment jsdom
/**
 * [B6 返工] 工具栏保存竞态：普通笔记写进入 saving 时，一次鼠标点击和
 * textarea Ctrl+S 都必须进入同一个 tab 级 finalize，而不是只落库。
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
import { finalizeInFlight } from '../../../src/renderer/features/reader/state/reader-save-coordinator'
import { useReaderStore } from '../../../src/renderer/features/reader/state/reader.store'
import { useNotesStore } from '../../../src/renderer/features/notes/notes.store'
import { clearAllTextHistory } from '../../../src/renderer/features/reader/state/reader-text-history'
import { clearStack } from '../../../src/renderer/features/reader/state/annotation-undo'
import { resetTabLanes } from '../../../src/renderer/shared/tab-write-lane'
import { setQuitClosing } from '../../../src/renderer/app/quit-closing-gate'

const P = 'p-toolbar-save-race'
let root: Root | null = null
let host: HTMLDivElement | null = null
let pendingSaveResolver: ((value: ReturnType<typeof savedNote>) => void) | null = null

function savedNote(contentMd: string): { id: string; paperId: string; contentMd: string; createdAt: string; updatedAt: string } {
  return { id: `note-${P}`, paperId: P, contentMd, createdAt: '2026-11-27T00:00:00Z', updatedAt: '2026-11-27T00:01:00Z' }
}

function mount(): void {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root?.render(
      <div>
        <ReaderToolbarCommands />
        <ReaderNotesPanel annotations={[]} onLocate={() => undefined} />
      </div>
    )
  })
}

function body(): HTMLTextAreaElement {
  const el = host?.querySelector<HTMLTextAreaElement>('textarea[aria-label="笔记正文"]')
  if (el === null || el === undefined) throw new Error('笔记正文不在场')
  return el
}

function saveButton(): HTMLButtonElement {
  const el = host?.querySelector<HTMLButtonElement>('[data-testid="reader-toolbar-save"]')
  if (el === null || el === undefined) throw new Error('工具栏保存钮不在场')
  return el
}

function typeInto(el: HTMLTextAreaElement, text: string): void {
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
  setter?.call(el, text)
  el.dispatchEvent(new Event('input', { bubbles: true }))
}

async function settleSave(
  resolveSave: (value: ReturnType<typeof savedNote>) => void,
  contentMd: string
): Promise<void> {
  await act(async () => {
    resolveSave(savedNote(contentMd))
    for (let i = 0; i < 16; i += 1) await Promise.resolve()
    await vi.runOnlyPendingTimersAsync()
  })
}

beforeEach(() => {
  vi.useFakeTimers()
  ;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
  vi.clearAllMocks()
  setQuitClosing(false)
  resetTabLanes()
  clearAllTextHistory()
  clearStack(P)
  void finalizeInFlight(P)
  useReaderStore.setState({ tabs: { [P]: makeTab(P) }, order: [P], activeId: P })
  useNotesStore.getState().resetEditStateForTests()
  notesGet.mockResolvedValue({ ok: true, data: null })
})

afterEach(async () => {
  await act(async () => {
    pendingSaveResolver?.(savedNote('__afterEach__'))
    await vi.runOnlyPendingTimersAsync()
  })
  pendingSaveResolver = null
  act(() => {
    root?.unmount()
  })
  resetTabLanes()
  clearAllTextHistory()
  clearStack(P)
  useNotesStore.getState().resetEditStateForTests()
  useReaderStore.setState({ tabs: {}, order: [], activeId: null })
  setQuitClosing(false)
  host?.remove()
  host = null
  root = null
  vi.useRealTimers()
})

describe('B6 工具栏保存命令竞态', () => {
  it('saving 中 mousedown→focus→click 一次进入 finalize 并清 U', async () => {
    mount()
    await act(async () => {
      await vi.runOnlyPendingTimersAsync()
    })
    expect(useNotesStore.getState().noteByPaper[P]?.pending).toBe(false)
    let resolveSave!: (value: ReturnType<typeof savedNote>) => void
    notesSave.mockImplementation(() => {
      if (notesSave.mock.calls.length === 1) {
        return new Promise((resolve) => {
          pendingSaveResolver = resolve
          resolveSave = resolve
        })
      }
      return Promise.resolve(savedNote('点击保存')).then((v) => {
        return v
      })
    })
    act(() => {
      const el = body()
      el.focus()
      typeInto(el, '点击保存')
      el.blur()
    })
    await act(async () => {
      for (let i = 0; i < 8; i += 1) await Promise.resolve()
    })
    expect(notesSave).toHaveBeenCalledWith({ paperId: P, contentMd: '点击保存' })
    expect(useNotesStore.getState().noteByPaper[P]?.saving).toBe(true)
    expect(useReaderStore.getState().tabs[P]?.unfinalized).toBe(true)
    expect(saveButton().disabled).toBe(false)
    act(() => {
      saveButton().dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }))
    })
    act(() => {
      saveButton().focus()
    })
    expect(saveButton().disabled).toBe(false)
    act(() => {
      saveButton().click()
    })
    expect(finalizeInFlight(P)).toBe(true)
    await settleSave(resolveSave, '点击保存')
    expect(finalizeInFlight(P)).toBe(false)
    expect(useReaderStore.getState().tabs[P]?.unfinalized).toBe(false)
  })

  it('saving 中 textarea Ctrl+S 对照同样进入 finalize 并清 U', async () => {
    mount()
    await act(async () => {
      await vi.runOnlyPendingTimersAsync()
    })
    let resolveSave!: (value: ReturnType<typeof savedNote>) => void
    notesSave.mockImplementation(() => {
      if (notesSave.mock.calls.length === 1) {
        return new Promise((resolve) => {
          pendingSaveResolver = resolve
          resolveSave = resolve
        })
      }
      return Promise.resolve(savedNote('Ctrl+S 保存')).then((v) => {
        return v
      })
    })
    const el = body()
    act(() => {
      el.focus()
      typeInto(el, 'Ctrl+S 保存')
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(IDLE_FLUSH_MS)
      for (let i = 0; i < 8; i += 1) await Promise.resolve()
    })
    expect(notesSave).toHaveBeenCalledWith({ paperId: P, contentMd: 'Ctrl+S 保存' })
    expect(useNotesStore.getState().noteByPaper[P]?.saving).toBe(true)
    act(() => {
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true, bubbles: true, cancelable: true }))
    })
    expect(finalizeInFlight(P)).toBe(true)
    await settleSave(resolveSave, 'Ctrl+S 保存')
    expect(finalizeInFlight(P)).toBe(false)
    expect(useReaderStore.getState().tabs[P]?.unfinalized).toBe(false)
  })
})
