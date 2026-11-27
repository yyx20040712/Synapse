// @vitest-environment jsdom
/**
 * [B6 返工 4] 工具栏按钮 Space 归原生按钮激活，不冒泡为 PDF 空格滚动。
 * jsdom 不产生原生 keyup→click，这里显式分开模拟浏览器默认动作。
 */
import { act, useRef } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub } from '../../utils/api-client-mock'
import { makeTab, makeAnnotation } from '../../utils/factories'

const mocks = vi.hoisted(() => ({
  finalizeActiveTab: vi.fn(() => Promise.resolve(true)),
  undoActiveTab: vi.fn(() => Promise.resolve(true)),
  redoActiveTab: vi.fn(() => Promise.resolve(true))
}))
vi.mock('../../../src/renderer/features/reader/state/reader-save-coordinator', async (importOriginal) => ({
  ...await importOriginal(),
  finalizeActiveTab: mocks.finalizeActiveTab,
  undoActiveTab: mocks.undoActiveTab,
  redoActiveTab: mocks.redoActiveTab
}))

import { ReaderToolbar } from '../../../src/renderer/features/reader/view/ReaderToolbar'
import { useReaderShortcutHandlers } from '../../../src/renderer/features/reader/view/reader-shortcut-handlers'
import { useReaderStore } from '../../../src/renderer/features/reader/state/reader.store'
import { clearStack, pushUndo, settleUndo } from '../../../src/renderer/features/reader/state/annotation-undo'

const stubApi = makeApiStub({ reader: {}, notes: { get: vi.fn(), save: vi.fn() } })
void stubApi

let root: Root | null = null
let host: HTMLDivElement | null = null

function ReaderShell(): JSX.Element {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  useReaderShortcutHandlers(scrollRef)
  return (
    <div ref={scrollRef} data-testid="pdf-scroll">
      <ReaderToolbar
        page={0}
        totalPages={1}
        zoom={1}
        color="yellow"
        onNavigate={() => undefined}
        onZoom={() => undefined}
        onColor={() => undefined}
        outlineOpen
        onToggleOutline={() => undefined}
        researchOpen
        onToggleResearch={() => undefined}
      />
    </div>
  )
}

function button(testId: string): HTMLButtonElement {
  const el = host?.querySelector<HTMLButtonElement>(`[data-testid="${testId}"]`)
  if (el === null || el === undefined) throw new Error(`${testId} 不在场`)
  return el
}

function annotation(comment: string) {
  return { ...makeAnnotation(comment), paperId: 'p-key' }
}

function assertNativeSpace(el: HTMLButtonElement, scrollBy: ReturnType<typeof vi.fn>): void {
  const keydown = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true })
  const keyup = new KeyboardEvent('keyup', { key: ' ', bubbles: true, cancelable: true })
  act(() => {
    el.focus()
    el.dispatchEvent(keydown)
    el.dispatchEvent(keyup)
  })
  expect(keydown.defaultPrevented).toBe(false)
  expect(keyup.defaultPrevented).toBe(false)
  expect(scrollBy).not.toHaveBeenCalled()
}

beforeEach(() => {
  ;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
  vi.clearAllMocks()
  useReaderStore.setState({ tabs: { 'p-key': makeTab('p-key') }, order: ['p-key'], activeId: 'p-key' })
  useReaderStore.getState().markTabUnfinalized('p-key')
  host = document.createElement('div')
  document.body.appendChild(host)
  act(() => {
    root = createRoot(host!)
    root.render(<ReaderShell />)
  })
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  clearStack('p-key')
  useReaderStore.setState({ tabs: {}, order: [], activeId: null })
  host?.remove()
  host = null
  root = null
})

describe('B6 工具栏键盘路由', () => {
  it('Enter/Space 激活保存；Space 不触发 PDF 滚动', async () => {
    const scroll = host!.querySelector<HTMLDivElement>('[data-testid="pdf-scroll"]')!
    const scrollBy = vi.fn()
    scroll.scrollBy = scrollBy
    const save = button('reader-toolbar-save')
    expect(save.disabled).toBe(false)
    assertNativeSpace(save, scrollBy)
    act(() => {
      save.click()
    })
    expect(mocks.finalizeActiveTab).toHaveBeenCalledTimes(1)
    // jsdom 不合成 Enter 默认 click；原生 keydown 与浏览器默认 click 分开模拟。
    act(() => {
      save.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
      save.click()
    })
    expect(mocks.finalizeActiveTab).toHaveBeenCalledTimes(2)
  })

  it('Undo 的 Space 保持默认动作并激活启用按钮，不触发 PDF 滚动', async () => {
    const scroll = host!.querySelector<HTMLDivElement>('[data-testid="pdf-scroll"]')!
    const scrollBy = vi.fn()
    scroll.scrollBy = scrollBy
    act(() => {
      pushUndo('p-key', { kind: 'create', annotation: annotation('key undo') })
    })
    const undo = button('reader-toolbar-undo')
    expect(undo.disabled).toBe(false)
    assertNativeSpace(undo, scrollBy)
    act(() => {
      undo.click()
    })
    expect(mocks.undoActiveTab).toHaveBeenCalledTimes(1)
  })

  it('Redo 的 Space 保持默认动作并激活启用按钮，不触发 PDF 滚动', async () => {
    const scroll = host!.querySelector<HTMLDivElement>('[data-testid="pdf-scroll"]')!
    const scrollBy = vi.fn()
    scroll.scrollBy = scrollBy
    act(() => {
      settleUndo('p-key', pushUndo('p-key', { kind: 'create', annotation: annotation('key redo') }))
    })
    const redo = button('reader-toolbar-redo')
    expect(redo.disabled).toBe(false)
    assertNativeSpace(redo, scrollBy)
    act(() => {
      redo.click()
    })
    expect(mocks.redoActiveTab).toHaveBeenCalledTimes(1)
  })
})
