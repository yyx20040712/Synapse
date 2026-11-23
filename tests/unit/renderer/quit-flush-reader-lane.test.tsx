// @vitest-environment jsdom
/**
 * [B4-A R2 §2.5 #37 → 审查 6 回归] 退出收口 drain reader 各打开 tab 的写链
 * （tab-write-lane）：在途 history-unit 与普通写属 IO——无人 await 的链任务在
 * 最终 stillDirty 判定前落定。
 *
 * 锁链（审查反例转正 + 补全）：
 * - 操作历史写在途（快捷键 undo 的反向写）：runQuitFlush 不返回，写落定后才回执；
 * - 普通写在途失败：等待落定后按脏呈现（标注失败残留计入 stillDirty）；
 * - 普通写在途成功：等待落定后 clean 回执；
 * - 后台 tab 的在途写同样等待（drain 覆盖全部打开 tab 的链）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub } from '../../utils/api-client-mock'
import { makeAnnotation, makeTab } from '../../utils/factories'

const mocks = vi.hoisted(() => ({
  notesGet: vi.fn(),
  notesSave: vi.fn(),
  deleteAnnotation: vi.fn(),
  updateAnnotation: vi.fn()
}))
makeApiStub({
  notes: { get: mocks.notesGet, save: mocks.notesSave },
  reader: { deleteAnnotation: mocks.deleteAnnotation, updateAnnotation: mocks.updateAnnotation }
})

import { runQuitFlush } from '../../../src/renderer/app/quit-flush'
import { setQuitClosing } from '../../../src/renderer/app/quit-closing-gate'
import { useNotesStore } from '../../../src/renderer/features/notes/notes.store'
import { useReaderStore } from '../../../src/renderer/features/reader/state/reader.store'
import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'
import { clearStack, pushUndo } from '../../../src/renderer/features/reader/state/annotation-undo'
import { undoTabOperations } from '../../../src/renderer/features/reader/state/reader-history-commands'
import {
  useAnnotationPopupActions,
  type AnnotationPopupActions
} from '../../../src/renderer/features/reader/interact/annotation-popups-actions'
import { resetTabLanes } from '../../../src/renderer/shared/tab-write-lane'
import type { Annotation } from '../../../src/shared/models/annotation'

/** 微任务排空（async 链逐跳） */
async function drain(turns = 30): Promise<void> {
  for (let i = 0; i < turns; i++) await Promise.resolve()
}

function annoOf(id: string, paperId: string): Annotation {
  return { ...makeAnnotation(), id, paperId }
}

function seedTabs(main: string, extra: string[] = []): Annotation {
  const a = annoOf(`a-${main}`, main)
  const tabs: Record<string, ReturnType<typeof makeTab>> = {
    [main]: makeTab(main, { annotations: [a] })
  }
  for (const id of extra) tabs[id] = makeTab(id)
  useReaderStore.setState({ tabs, order: [main, ...extra], activeId: extra[0] ?? main })
  return a
}

let root: Root | null = null
let host: HTMLDivElement | null = null

beforeEach(() => {
  vi.restoreAllMocks()
  vi.clearAllMocks()
  mocks.notesGet.mockReset()
  mocks.notesSave.mockReset()
  mocks.deleteAnnotation.mockReset()
  mocks.updateAnnotation.mockReset()
  setQuitClosing(false)
  resetTabLanes()
  ;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
  useNotesStore.getState().resetEditStateForTests()
  useReaderStore.setState({ tabs: {}, order: [], activeId: null })
  useLineageStore.setState({
    nodes: [],
    edges: [],
    saveStatus: 'clean',
    queue: [],
    flushing: false,
    lastWriteError: null,
    undoStack: [],
    redoStack: []
  })
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
  resetTabLanes()
  for (const id of useReaderStore.getState().order) clearStack(id)
  useReaderStore.setState({ tabs: {}, order: [], activeId: null })
  useNotesStore.getState().resetEditStateForTests()
})

/** Probe：取弹层动作 hook 面（普通写入口——真实 annotation-popups-actions） */
function mountActions(): AnnotationPopupActions {
  let actions: AnnotationPopupActions | null = null
  function Probe(): null {
    actions = useAnnotationPopupActions({
      busy: false,
      setBusy: () => undefined,
      closeEditing: () => undefined,
      closeMenu: () => undefined,
      onChanged: () => undefined
    })
    return null
  }
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root!.render(<Probe />)
  })
  return actions!
}

describe('quit-flush × reader 写链 drain（§2.5 #37）—— 在途写属 IO，最终查态前落定', () => {
  it('操作历史写在途：runQuitFlush 不返回（不把在途误报 clean）；写落定后才回执', async () => {
    const paperId = 'qp-lane'
    const a = seedTabs(paperId)
    pushUndo(paperId, { kind: 'create', annotation: a })
    let resolveDelete!: () => void
    mocks.deleteAnnotation.mockImplementationOnce(
      () =>
        new Promise((r) => {
          resolveDelete = () => r({ ok: true, data: undefined })
        })
    )
    const undoing = useReaderStore.getState().undo()
    await drain()
    expect(mocks.deleteAnnotation).toHaveBeenCalledTimes(1)
    let settled = false
    let quit: Promise<boolean> | null = null
    await act(async () => {
      quit = runQuitFlush().then((d) => {
        settled = true
        return d
      })
      await drain()
    })
    // 在途未落定——收口不返回
    expect(settled).toBe(false)
    resolveDelete()
    await expect(undoing).resolves.toBe(true)
    await expect(quit).resolves.toBe(false)
    expect(settled).toBe(true)
    // 在途 undo 的回显已写回原 tab
    expect(useReaderStore.getState().tabs[paperId]?.annotations).toHaveLength(0)
  })

  it('普通写在途失败：等待落定后按脏呈现（标注失败残留计入 stillDirty）', async () => {
    const paperId = 'qp-lane-fail'
    const a = seedTabs(paperId)
    let release!: (v: unknown) => void
    const flight = new Promise((r) => {
      release = r
    })
    mocks.updateAnnotation.mockImplementationOnce(() => flight)
    const actions = mountActions()
    void actions.autosaveComment(a, '将失败')
    await drain()
    expect(mocks.updateAnnotation).toHaveBeenCalledTimes(1)
    let settled = false
    let quit: Promise<boolean> | null = null
    await act(async () => {
      quit = runQuitFlush().then((d) => {
        settled = true
        return d
      })
      await drain()
    })
    expect(settled).toBe(false)
    release({ ok: false, error: { code: 'E', message: '写失败' } })
    await expect(quit).resolves.toBe(true)
    expect(useReaderStore.getState().tabs[paperId]?.dirty).toBe(true)
  })

  it('普通写在途成功：等待落定后 clean 回执', async () => {
    const paperId = 'qp-lane-ok'
    const a = seedTabs(paperId)
    let release!: (v: unknown) => void
    const flight = new Promise((r) => {
      release = r
    })
    mocks.updateAnnotation.mockImplementationOnce(() => flight)
    const actions = mountActions()
    void actions.autosaveComment(a, '在途值')
    await drain()
    let settled = false
    let quit: Promise<boolean> | null = null
    await act(async () => {
      quit = runQuitFlush().then((d) => {
        settled = true
        return d
      })
      await drain()
    })
    expect(settled).toBe(false)
    release({ ok: true, data: { ...a, comment: '在途值' } })
    await expect(quit).resolves.toBe(false)
    expect(useReaderStore.getState().tabs[paperId]?.annotations[0]?.comment).toBe('在途值')
  })

  it('后台 tab 的在途写同样等待（drain 覆盖全部打开 tab 的链）', async () => {
    const paperId = 'qp-lane-bg'
    const a = seedTabs(paperId, ['qp-front'])
    expect(useReaderStore.getState().activeId).toBe('qp-front')
    pushUndo(paperId, { kind: 'create', annotation: a })
    let resolveDelete!: () => void
    mocks.deleteAnnotation.mockImplementationOnce(
      () =>
        new Promise((r) => {
          resolveDelete = () => r({ ok: true, data: undefined })
        })
    )
    // 后台 tab 的操作历史写（执行器按 paperId 寻址——回显归原 tab，不经活动篇）
    const history = undoTabOperations(paperId)
    await drain()
    expect(mocks.deleteAnnotation).toHaveBeenCalledTimes(1)
    let settled = false
    let quit: Promise<boolean> | null = null
    await act(async () => {
      quit = runQuitFlush().then((d) => {
        settled = true
        return d
      })
      await drain()
    })
    expect(settled).toBe(false)
    resolveDelete()
    await expect(history).resolves.toMatchObject({ done: true })
    await expect(quit).resolves.toBe(false)
    expect(settled).toBe(true)
  })
})
