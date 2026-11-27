// @vitest-environment jsdom
/**
 * [B6] 活动 tab 命令态响应式锁定测试：模块级栈、finalize/history 在途和
 * 冻结门变化必须在同一 hook 订阅内更新按钮态；Zustand tabs/notes 引用未变。
 */
import { act } from 'react'
import { useLayoutEffect } from 'react'
import { flushSync } from 'react-dom'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub } from '../../utils/api-client-mock'
import { makeTab } from '../../utils/factories'
import { useActiveTabCommandState } from '../../../src/renderer/features/reader/state/tab-dirty'
import {
  notifyReaderCommandState,
  readerCommandStateVersion,
  subscribeReaderCommandState
} from '../../../src/renderer/features/reader/state/reader-command-state'
import { finalizeTab } from '../../../src/renderer/features/reader/state/reader-save-coordinator'
import { registerDraftFlush, unregisterDraftFlush } from '../../../src/renderer/features/reader/interact/annotation-draft-registry'
import { pushUndo, settleUndo, settleRedo, clearRedo, clearStack, stackDepth, type ReaderOperationEntry } from '../../../src/renderer/features/reader/state/annotation-undo'
import { startTabClosing } from '../../../src/renderer/features/reader/state/tab-closing-gate'
import { runQuitInternal, setQuitClosing } from '../../../src/renderer/app/quit-closing-gate'
import { useReaderStore } from '../../../src/renderer/features/reader/state/reader.store'
import { useNotesStore } from '../../../src/renderer/features/notes/notes.store'
import { resetTabLanes } from '../../../src/renderer/shared/tab-write-lane'
import type { HistoryCommandState } from '../../../src/renderer/shared/history-command'
import type { Annotation } from '../../../src/shared/models/annotation'

const mocks = vi.hoisted(() => ({
  deleteAnnotation: vi.fn()
}))
makeApiStub({ reader: { deleteAnnotation: mocks.deleteAnnotation } })

let root: Root | null = null
let host: HTMLDivElement | null = null
const seen: HistoryCommandState[] = []

function CommandProbe(): null {
  seen.push(useActiveTabCommandState())
  return null
}

function FirstRenderPushProbe({ paperId, value }: { paperId: string; value: string }): null {
  useLayoutEffect(() => {
    pushUndo(paperId, {
      kind: 'create',
      annotation: annotation(`a-${value}`, paperId)
    })
  }, [paperId, value])
  seen.push(useActiveTabCommandState())
  return null
}

function mount(_activeId: string | null): void {
  act(() => {
    root = createRoot(host!)
    root.render(<CommandProbe />)
  })
}

function seedReady(id: string): void {
  act(() => {
    useReaderStore.setState({
      tabs: { [id]: makeTab(id) },
      order: [id],
      activeId: id
    })
  })
}

function seedReadyTabs(ids: string[]): void {
  act(() => {
    const tabs = Object.fromEntries(ids.map((id) => [id, makeTab(id)]))
    useReaderStore.setState({ tabs, order: ids, activeId: ids[0] ?? null })
  })
}

function activate(id: string): void {
  act(() => {
    useReaderStore.setState({ activeId: id })
  })
}

function last(): HistoryCommandState {
  const value = seen.at(-1)
  if (value === undefined) throw new Error('命令态 Probe 未渲染')
  return value
}

async function turns(n = 10): Promise<void> {
  for (let i = 0; i < n; i += 1) await Promise.resolve()
}

function annotation(id: string, paperId: string): Annotation {
  return {
    id,
    paperId,
    page: 0,
    kind: 'highlight',
    color: 'yellow',
    quoteText: 'q',
    prefixText: '',
    suffixText: '',
    startOffset: 0,
    endOffset: 1,
    rects: [],
    comment: '',
    createdAt: '2026-11-27T00:00:00.000Z',
    updatedAt: '2026-11-27T00:00:00.000Z'
  }
}

beforeEach(() => {
  ;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
  vi.clearAllMocks()
  seen.length = 0
  resetTabLanes()
  setQuitClosing(false)
  useReaderStore.setState({ tabs: {}, order: [], activeId: null })
  host = document.createElement('div')
  document.body.appendChild(host)
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  for (const id of useReaderStore.getState().order) clearStack(id)
  useReaderStore.setState({ tabs: {}, order: [], activeId: null })
  setQuitClosing(false)
  host?.remove()
  host = null
  root = null
})

describe('B6 活动 tab 命令态订阅', () => {
  it('空 tab 恒禁用；同一 tab 栈变化在无 store 写入时刷新 undo/redo', () => {
    mount(null)
    expect(last().canSave).toBe(false)
    expect(last().canUndo).toBe(false)
    expect(last().canRedo).toBe(false)
    const P = 'p-command'
    seedReady(P)
    const tabsBefore = useReaderStore.getState().tabs
    const notesBefore = useNotesStore.getState()
    expect(last().canSave).toBe(true)
    expect(last().canUndo).toBe(false)
    let firstEntry: ReaderOperationEntry | undefined
    let secondEntry: ReaderOperationEntry | undefined
    act(() => {
      firstEntry = pushUndo(P, { kind: 'create', annotation: annotation('a1', P) })
    })
    expect(last().canUndo).toBe(true)
    expect(last().canRedo).toBe(false)
    act(() => {
      secondEntry = pushUndo(P, { kind: 'create', annotation: annotation('a2', P) })
    })
    expect(last().canUndo).toBe(true)
    expect(last().canRedo).toBe(false)
    act(() => {
      settleUndo(P, secondEntry!)
    })
    expect(last().canUndo).toBe(true)
    expect(last().canRedo).toBe(true)
    act(() => {
      settleRedo(P, secondEntry!)
    })
    expect(last().canUndo).toBe(true)
    expect(last().canRedo).toBe(false)
    act(() => {
      settleUndo(P, secondEntry!)
    })
    expect(last().canUndo).toBe(true)
    expect(last().canRedo).toBe(true)
    act(() => {
      settleUndo(P, firstEntry!)
    })
    expect(last().canUndo).toBe(false)
    expect(last().canRedo).toBe(true)
    act(() => {
      clearRedo(P)
    })
    expect(last().canUndo).toBe(false)
    expect(last().canRedo).toBe(false)
    act(() => {
      clearStack(P)
    })
    expect(last().canUndo).toBe(false)
    expect(last().canRedo).toBe(false)
    expect(useReaderStore.getState().tabs).toBe(tabsBefore)
    expect(useNotesStore.getState()).toBe(notesBefore)
    act(() => {
      clearStack(P)
    })
    expect(last().canUndo).toBe(false)
    expect(useReaderStore.getState().tabs).toBe(tabsBefore)
    expect(useNotesStore.getState()).toBe(notesBefore)
  })

  it('首次挂载 layout effect push 后订阅协议立即重读原模块真值', () => {
    const P = 'p-first-subscribe'
    seedReady(P)
    act(() => {
      root = createRoot(host!)
      root.render(<FirstRenderPushProbe paperId={P} value="first" />)
    })
    expect(stackDepth(P)).toBe(1)
    expect(last().canUndo).toBe(true)
  })

  it('退出冻结内部豁免期间按钮持续禁用，退出豁免后仍禁用', () => {
    const P = 'p-quit-button-freeze'
    seedReady(P)
    mount(P)
    act(() => {
      pushUndo(P, { kind: 'create', annotation: annotation('a-quit-freeze', P) })
    })
    expect(last().canUndo).toBe(true)
    act(() => {
      setQuitClosing(true)
    })
    expect(last().canUndo).toBe(false)
    expect(last().canSave).toBe(false)
    act(() => {
      runQuitInternal(() => {
        flushSync(() => {
          useReaderStore.setState({
            tabs: { [P]: makeTab(P) },
            order: [P],
            activeId: P
          })
        })
      })
    })
    expect(last().canUndo).toBe(false)
    expect(last().canSave).toBe(false)
    act(() => {
      setQuitClosing(false)
    })
    expect(last().canUndo).toBe(true)
    expect(last().canSave).toBe(true)
  })

  it('finalize 进入和退出刷新 busy、canSave 与保存显示态', async () => {
    const P = 'p-finalize'
    seedReady(P)
    mount(P)
    act(() => {
      useReaderStore.getState().markTabUnfinalized(P)
    })
    expect(last().saveState).toBe('dirty')
    let release!: (v: string) => void
    const gate = new Promise<string>((resolve) => { release = resolve })
    const handleId = 'p-command-flush'
    registerDraftFlush(handleId, () => gate)
    let flight: Promise<boolean> | null = null
    act(() => {
      flight = finalizeTab(P)
    })
    expect(last().busy).toBe(true)
    expect(last().canSave).toBe(false)
    expect(last().saveState).toBe('saving')
    await act(async () => {
      release('done')
      await flight
      await turns()
    })
    expect(last().busy).toBe(false)
    expect(last().canSave).toBe(true)
    expect(last().saveState).toBe('saved')
    act(() => {
      unregisterDraftFlush(handleId)
    })
  })

  it('操作历史命令进入和退出刷新 busy，但不禁用对应方向', async () => {
    const P = 'p-op-history'
    seedReady(P)
    mount(P)
    act(() => {
      pushUndo(P, { kind: 'create', annotation: annotation('a-history', P) })
    })
    expect(last().canUndo).toBe(true)
    let resolveDelete!: (value: { ok: true; data: Annotation }) => void
    mocks.deleteAnnotation.mockImplementation(() => new Promise((resolve) => {
      resolveDelete = resolve
    }))
    let flight: Promise<boolean> | null = null
    await act(async () => {
      flight = useReaderStore.getState().undo()
      await turns()
    })
    expect(last().busy).toBe(true)
    expect(last().canSave).toBe(false)
    expect(last().canUndo).toBe(true)
    await act(async () => {
      resolveDelete({ ok: true, data: annotation('a-history', P) })
      await flight
      await turns()
    })
    expect(last().busy).toBe(false)
    expect(last().canSave).toBe(true)
    expect(last().canUndo).toBe(false)
    expect(last().canRedo).toBe(true)
  })

  it('操作历史失败退出恢复 busy 与可用态，栈保持可重试', async () => {
    const P = 'p-op-history-failed'
    seedReady(P)
    mount(P)
    act(() => {
      pushUndo(P, { kind: 'create', annotation: annotation('a-history-failed', P) })
    })
    expect(last().canUndo).toBe(true)
    let resolveDelete!: (value: { ok: false; error: { code: string; message: string } }) => void
    mocks.deleteAnnotation.mockImplementation(() => new Promise((resolve) => {
      resolveDelete = resolve
    }))
    let flight: Promise<boolean> | null = null
    await act(async () => {
      flight = useReaderStore.getState().undo()
      await turns()
    })
    expect(last().busy).toBe(true)
    expect(last().canUndo).toBe(true)
    await act(async () => {
      resolveDelete({ ok: false, error: { code: 'E', message: '撤销写失败' } })
      await flight
      await turns()
    })
    expect(last().busy).toBe(false)
    expect(last().canSave).toBe(true)
    expect(last().canUndo).toBe(true)
    expect(last().canRedo).toBe(false)
  })

  it('finalize 失败退出恢复可重试态，dirty 与栈保留', async () => {
    const P = 'p-finalize-failed'
    seedReady(P)
    mount(P)
    act(() => {
      useReaderStore.getState().markTabUnfinalized(P)
    })
    expect(last().saveState).toBe('dirty')
    const handleId = 'p-command-flush-failed'
    registerDraftFlush(handleId, async () => 'failed')
    let flight: Promise<boolean> | null = null
    await act(async () => {
      flight = finalizeTab(P)
      await turns()
    })
    expect(last().busy).toBe(false)
    expect(last().canSave).toBe(true)
    expect(last().saveState).toBe('dirty')
    await expect(flight).resolves.toBe(false)
    act(() => {
      unregisterDraftFlush(handleId)
    })
  })

  it('异 tab 栈通知不扰动活动投影；activeId 切换后按目标 tab 派生', () => {
    const P = 'p-active-left'
    const Q = 'p-active-right'
    seedReadyTabs([P, Q])
    mount(P)
    expect(last().canUndo).toBe(false)
    const before = seen.length
    const tabsBefore = useReaderStore.getState().tabs
    const notesBefore = useNotesStore.getState()
    act(() => {
      pushUndo(Q, { kind: 'create', annotation: annotation('a-right', Q) })
    })
    expect(seen.length).toBe(before)
    expect(last().canUndo).toBe(false)
    act(() => {
      clearStack(Q)
    })
    expect(seen.length).toBe(before)
    act(() => {
      pushUndo(P, { kind: 'create', annotation: annotation('a-left', P) })
    })
    expect(last().canUndo).toBe(true)
    activate(Q)
    expect(last().canUndo).toBe(false)
    activate(P)
    expect(last().canUndo).toBe(true)
    expect(useReaderStore.getState().tabs).toBe(tabsBefore)
    expect(useNotesStore.getState()).toBe(notesBefore)
  })

  it('loading/error 门禁用预置双栈命令；回到 ready 后按栈恢复', () => {
    const P = 'p-status-gate'
    seedReady(P)
    mount(P)
    act(() => {
      pushUndo(P, { kind: 'create', annotation: annotation('a-status-first', P) })
      const second = pushUndo(P, { kind: 'create', annotation: annotation('a-status-second', P) })
      settleUndo(P, second)
    })
    expect(last().canUndo).toBe(true)
    expect(last().canRedo).toBe(true)
    act(() => {
      const tab = makeTab(P)
      useReaderStore.setState({ tabs: { [P]: { ...tab, status: 'loading' } } })
    })
    expect(last().canSave).toBe(false)
    expect(last().canUndo).toBe(false)
    expect(last().canRedo).toBe(false)
    act(() => {
      const tab = makeTab(P)
      useReaderStore.setState({ tabs: { [P]: { ...tab, status: 'error' } } })
    })
    expect(last().canSave).toBe(false)
    expect(last().canUndo).toBe(false)
    expect(last().canRedo).toBe(false)
    act(() => {
      useReaderStore.setState({ tabs: { [P]: makeTab(P) } })
    })
    expect(last().canSave).toBe(true)
    expect(last().canUndo).toBe(true)
    expect(last().canRedo).toBe(true)
  })

  it('订阅失效一次；末位退订清理版本条目，无监听通知不重建常驻快照', () => {
    const P = 'p-version-cleanup'
    const unsubscribe = subscribeReaderCommandState(P, () => undefined)
    notifyReaderCommandState(P)
    expect(readerCommandStateVersion(P)).toBe(2)
    unsubscribe()
    expect(readerCommandStateVersion(P)).toBe(0)
    notifyReaderCommandState(P)
    expect(readerCommandStateVersion(P)).toBe(0)
  })

  it('同篇关闭冻结进入和解除刷新命令态；切换 loading 后整体禁用', async () => {
    const P = 'p-freeze-hook'
    seedReady(P)
    mount(P)
    act(() => {
      pushUndo(P, { kind: 'create', annotation: annotation('a-freeze', P) })
    })
    expect(last().canUndo).toBe(true)
    let release!: (v: boolean) => void
    const flight = new Promise<boolean>((resolve) => { release = resolve })
    act(() => {
      startTabClosing(P, flight)
    })
    expect(last().canUndo).toBe(false)
    expect(last().canSave).toBe(false)
    await act(async () => {
      release(false)
      await flight
    })
    expect(last().canUndo).toBe(true)
    expect(last().canSave).toBe(true)
    act(() => {
      setQuitClosing(true)
    })
    expect(last().canUndo).toBe(false)
    expect(last().canSave).toBe(false)
    act(() => {
      setQuitClosing(false)
      const tab = makeTab(P)
      useReaderStore.setState({
        tabs: { [P]: { ...tab, status: 'loading' } },
        order: [P],
        activeId: P
      })
    })
    expect(last().canUndo).toBe(false)
    expect(last().canSave).toBe(false)
  })
})
