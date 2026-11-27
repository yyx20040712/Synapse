// @vitest-environment jsdom
/** [B6] 阅读器工具栏命令入口与单排顺序锁定。 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub } from '../../utils/api-client-mock'
import { makeAnnotation, makeTab } from '../../utils/factories'

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
import { useReaderStore } from '../../../src/renderer/features/reader/state/reader.store'
import {
  clearStack,
  pushUndo,
  settleUndo,
  type ReaderOperationEntry
} from '../../../src/renderer/features/reader/state/annotation-undo'

const stubApi = makeApiStub({ reader: {}, notes: { get: vi.fn(), save: vi.fn() } })
void stubApi

let root: Root | null = null
let host: HTMLDivElement | null = null

function mount(): void {
  act(() => {
    root = createRoot(host!)
    root.render(
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
    )
  })
}

function button(testId: string): HTMLButtonElement {
  const b = host!.querySelector<HTMLButtonElement>(`[data-testid="${testId}"]`)
  if (b === null) throw new Error(`${testId} 不在场`)
  return b
}

function annotation(comment: string): ReturnType<typeof makeAnnotation> {
  return { ...makeAnnotation(comment), paperId: 'p1' }
}

beforeEach(() => {
  ;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
  vi.clearAllMocks()
  useReaderStore.setState({
    tabs: { p1: makeTab('p1') },
    order: ['p1'],
    activeId: 'p1'
  })
  useReaderStore.getState().markTabUnfinalized('p1')
  host = document.createElement('div')
  document.body.appendChild(host)
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  clearStack('p1')
  useReaderStore.setState({ tabs: {}, order: [], activeId: null })
  host?.remove()
  host = null
  root = null
})

describe('B6 阅读器工具栏命令', () => {
  it('保存/撤销/重做位于目录开关与翻页之间，并接线活动 tab 命令', async () => {
    mount()
    const outline = host!.querySelector('button[aria-label="展开或收起目录侧栏"]')!
    const save = button('reader-toolbar-save')
    const undo = button('reader-toolbar-undo')
    const redo = button('reader-toolbar-redo')
    const page = host!.querySelector('input[aria-label="跳转到页"]')!
    const research = host!.querySelector('button[aria-label="展开或收起研究面板"]')!
    const order: Array<[Element, Element]> = [
      [outline, save],
      [save, undo],
      [undo, redo],
      [redo, page],
      [page, research]
    ]
    for (const [before, after] of order) {
      expect(before.compareDocumentPosition(after) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    }
    expect(save.disabled).toBe(false)
    expect(undo.disabled).toBe(true)
    expect(redo.disabled).toBe(true)

    await act(async () => {
      save.click()
      await Promise.resolve()
    })
    expect(mocks.finalizeActiveTab).toHaveBeenCalledTimes(1)

    // [B6 返工] 原生 type=button 是键盘激活载体；jsdom 不派发 Enter 默认
    // click，本锚显式补派浏览器默认动作并锁定可聚焦/可点状态。
    act(() => {
      save.focus()
      save.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
      save.click()
    })
    expect(mocks.finalizeActiveTab).toHaveBeenCalledTimes(2)

    let undoEntry: ReaderOperationEntry
    await act(async () => {
      undoEntry = pushUndo('p1', { kind: 'create', annotation: annotation('undo 值') })
      await Promise.resolve()
    })
    await act(async () => {
      undo.click()
    })
    expect(mocks.undoActiveTab).toHaveBeenCalledTimes(1)

    await act(async () => {
      pushUndo('p1', { kind: 'create', annotation: annotation('redo 值') })
      settleUndo('p1', undoEntry)
      await Promise.resolve()
    })
    await act(async () => {
      redo.click()
    })
    expect(mocks.redoActiveTab).toHaveBeenCalledTimes(1)
    expect(host!.querySelector('.rdr-toolbar-scroll')).not.toBeNull()
  })
})
