// @vitest-environment jsdom
/**
 * [B4-A R2 审查 1/2 → 回归] 显式保存 finalize 的 IO 复查与 editRevision 语义。
 *
 * 锁链：
 * - drain 后复查 IO（§4.3 #4、§2.5 #23）：drain 兑现≠落库成功——链上普通写失败
 *   （删除 API 失败→标注失败残留）/总评保存失败/总评待写残留且保存期间无新编辑
 *   → finalize=false，redo/undo/U 全保留；无挂载句柄承载的失败态同样被复查到；
 * - revision 只认用户编辑动作（输入/操作单元提交/undo-redo）：文本写的落库回显
 *   不递增——批注输入后不等 idle 直接显式保存：finalize 成功、灰点清；
 * - 对照（#22）：保存 await 期间的真实新输入推进 revision→finalize 仍定稿、U 保持。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub } from '../../utils/api-client-mock'
import { makeAnnotation, makeTab } from '../../utils/factories'

const mocks = vi.hoisted(() => ({
  updateAnnotation: vi.fn(),
  deleteAnnotation: vi.fn()
}))
makeApiStub({
  reader: { updateAnnotation: mocks.updateAnnotation, deleteAnnotation: mocks.deleteAnnotation }
})

import { finalizeActiveTab, finalizeTab } from '../../../src/renderer/features/reader/state/reader-save-coordinator'
import {
  clearStack,
  peekUndo,
  pushUndo,
  redoDepth,
  settleUndo,
  stackDepth
} from '../../../src/renderer/features/reader/state/annotation-undo'
import {
  canRedoText,
  canUndoText,
  clearAllTextHistory,
  peekTextUndo,
  pushTextCommit,
  settleTextUndo
} from '../../../src/renderer/features/reader/state/reader-text-history'
import {
  registerDraftFlush,
  unregisterDraftFlush
} from '../../../src/renderer/features/reader/interact/annotation-draft-registry'
import {
  useAnnotationPopupActions,
  type AnnotationPopupActions
} from '../../../src/renderer/features/reader/interact/annotation-popups-actions'
import { AnnotationPopups } from '../../../src/renderer/features/reader/view/AnnotationPopups'
import { TabBar } from '../../../src/renderer/features/reader/view/TabBar'
import { useReaderStore } from '../../../src/renderer/features/reader/state/reader.store'
import { useNotesStore } from '../../../src/renderer/features/notes/notes.store'
import { resetTabLanes } from '../../../src/renderer/shared/tab-write-lane'
import type { Annotation, AnnotationRect } from '../../../src/shared/models/annotation'

const RECT: AnnotationRect = { page: 0, x: 0.1, y: 0.2, w: 0.3, h: 0.05 }

/** 覆写 id/paperId 的标注（模块态隔离） */
function annoOf(id: string, paperId: string): Annotation {
  return { ...makeAnnotation(), id, paperId }
}

async function turns(n = 30): Promise<void> {
  for (let i = 0; i < n; i++) await Promise.resolve()
}

let root: Root | null = null
let host: HTMLDivElement | null = null
const handleIds: string[] = []

beforeEach(() => {
  vi.restoreAllMocks()
  vi.clearAllMocks()
  mocks.updateAnnotation.mockReset()
  mocks.deleteAnnotation.mockReset()
  resetTabLanes()
  clearAllTextHistory()
  ;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
  useReaderStore.setState({ tabs: {}, order: [], activeId: null })
  useNotesStore.getState().resetEditStateForTests()
})

afterEach(() => {
  for (const id of handleIds.splice(0)) unregisterDraftFlush(id)
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
  resetTabLanes()
  clearAllTextHistory()
  for (const id of useReaderStore.getState().order) clearStack(id)
  useReaderStore.setState({ tabs: {}, order: [], activeId: null })
  useNotesStore.getState().resetEditStateForTests()
})

/** 单 tab 夹具（活动=该篇） */
function seedTab(paperId: string, annotations: Annotation[] = []): void {
  useReaderStore.setState({
    tabs: { [paperId]: makeTab(paperId, { annotations }) },
    order: [paperId],
    activeId: paperId
  })
}

/** 预置可撤/可重做面：操作层 redo=1、文本层 redo=1（直接栈操作，零 api） */
function seedRedo(paperId: string): void {
  pushUndo(paperId, { kind: 'create', annotation: annoOf('seed-op-1', paperId) })
  pushUndo(paperId, { kind: 'create', annotation: annoOf('seed-op-2', paperId) })
  const top = peekUndo(paperId)
  if (top === null) throw new Error('seed 前置：操作层 past 顶在场')
  settleUndo(paperId, top)
  expect(stackDepth(paperId)).toBe(1)
  const key = { paperId, kind: 'paper-note' } as const
  pushTextCommit(key, 'v0')
  pushTextCommit(key, 'v1')
  const textTop = peekTextUndo(key)
  if (textTop === null) throw new Error('seed 前置：文本层 past 顶在场')
  settleTextUndo(key, textTop, 'v2', [])
  expect(redoDepth(paperId)).toBe(1)
  expect(canRedoText(key)).toBe(true)
}

/** 清账未发生的断言面：操作层/文本层 redo 与 undo 均保留、U 仍在 */
function expectLedgerIntact(paperId: string): void {
  const key = { paperId, kind: 'paper-note' } as const
  expect(redoDepth(paperId)).toBe(1)
  expect(stackDepth(paperId)).toBe(1)
  expect(canRedoText(key)).toBe(true)
  expect(canUndoText(key)).toBe(true)
  expect(useReaderStore.getState().tabs[paperId]?.unfinalized).toBe(true)
}

/** Probe：取弹层动作 hook 面（真实 annotation-popups-actions） */
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

function mountEditorWithTabBar(anno: Annotation): void {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root!.render(
      <>
        <TabBar />
        <AnnotationPopups
          menu={null}
          editing={{ annotation: anno, rect: RECT }}
          busy={false}
          setMenu={vi.fn()}
          setEditing={vi.fn()}
          setBusy={vi.fn()}
          onChanged={vi.fn()}
        />
      </>
    )
  })
}

function dirtyDots(): HTMLElement[] {
  return [...(host?.querySelectorAll<HTMLElement>('[data-testid="tab-dirty-dot"]') ?? [])]
}

function typeInto(text: string): void {
  const ta = host!.querySelector('textarea') as HTMLTextAreaElement
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
  act(() => {
    setter?.call(ta, text)
    ta.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

describe('finalize drain 后复查 IO（§4.3 #4/§2.5 #23）—— 失败不定稿、账目全保留', () => {
  it('链上普通写失败（删除 API 失败）：finalize=false，redo/undo/U 全保留', async () => {
    const P = 'p-finalize-failure'
    const a = annoOf('a-delete-fails', P)
    seedTab(P, [a])
    useReaderStore.getState().markTabUnfinalized(P)
    seedRedo(P)
    let release!: (v: unknown) => void
    const flight = new Promise((r) => {
      release = r
    })
    mocks.deleteAnnotation.mockImplementation(() => flight)
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const actions = mountActions()
    void actions.deleteAnnotation(a)
    await turns()
    expect(mocks.deleteAnnotation).toHaveBeenCalledTimes(1)
    // 删除在途时定稿：句柄面无失败（未挂载编辑器）——失败只能由 drain 后复查 IO 呈现
    const finalizing = finalizeTab(P)
    await turns()
    release({ ok: false, error: { code: 'E', message: 'delete failed' } })
    expect(await finalizing).toBe(false)
    expect(useReaderStore.getState().tabs[P]?.dirty).toBe(true)
    expectLedgerIntact(P)
  })

  it('总评保存失败（无挂载句柄承载）：finalize=false，不清账', async () => {
    const P = 'p-finalize-note-failed'
    seedTab(P)
    useReaderStore.getState().markTabUnfinalized(P)
    seedRedo(P)
    useNotesStore.setState({
      noteByPaper: {
        [P]: { contentMd: '未落库', saving: false, savedAt: null, pending: true, saveFailed: true }
      }
    })
    expect(await finalizeTab(P)).toBe(false)
    expect(useNotesStore.getState().noteByPaper[P]?.saveFailed).toBe(true)
    expectLedgerIntact(P)
  })

  it('总评待写残留且保存期间无新编辑（首载门控篇）：finalize=false，不清账', async () => {
    const P = 'p-finalize-note-pending'
    seedTab(P)
    useReaderStore.getState().markTabUnfinalized(P)
    seedRedo(P)
    // 从未 load 的编辑：首载门控命中——零写派发，pending 残留
    useNotesStore.getState().edit(P, { contentMd: '门控草稿' })
    expect(await finalizeTab(P)).toBe(false)
    expect(useNotesStore.getState().noteByPaper[P]?.pending).toBe(true)
    expectLedgerIntact(P)
  })

  it('对照：全部落库（无 IO 错误/无待写残留）→finalize=true、redo 清、U 清', async () => {
    const P = 'p-finalize-clean'
    seedTab(P)
    useReaderStore.getState().markTabUnfinalized(P)
    seedRedo(P)
    expect(await finalizeTab(P)).toBe(true)
    expect(redoDepth(P)).toBe(0)
    expect(canRedoText({ paperId: P, kind: 'paper-note' })).toBe(false)
    expect(useReaderStore.getState().tabs[P]?.unfinalized).toBe(false)
  })
})

describe('editRevision 只认用户编辑动作（§2.2）—— 落库回显/写回不递增', () => {
  it('批注输入后不等 idle 直接显式保存：finalize 成功、灰点清、revision 不因自身写回前进', async () => {
    const P = 'p-immediate-save'
    const a = annoOf('a-immediate-save', P)
    seedTab(P, [a])
    mocks.updateAnnotation.mockImplementation((req: { annotation: Annotation }) =>
      Promise.resolve({ ok: true, data: req.annotation })
    )
    mountEditorWithTabBar(a)
    typeInto('new comment')
    // 输入刻即 U=1、revision=1（§2.5 #1）
    expect(useReaderStore.getState().tabs[P]?.unfinalized).toBe(true)
    expect(useReaderStore.getState().tabs[P]?.editRevision).toBe(1)
    expect(dirtyDots()).toHaveLength(1)
    await act(async () => {
      await finalizeActiveTab()
    })
    expect(mocks.updateAnnotation).toHaveBeenCalledTimes(1)
    expect(mocks.updateAnnotation).toHaveBeenCalledWith(
      expect.objectContaining({ annotation: expect.objectContaining({ comment: 'new comment' }) })
    )
    // 自身写回已落库：revision 仍=1 → 定稿清 U、灰点清（#21）
    expect(useReaderStore.getState().tabs[P]?.editRevision).toBe(1)
    expect(useReaderStore.getState().tabs[P]?.unfinalized).toBe(false)
    expect(dirtyDots()).toHaveLength(0)
    expect(useReaderStore.getState().tabs[P]?.annotations[0]?.comment).toBe('new comment')
  })

  it('文本写回显不递增 revision；删除成功（操作单元提交）递增', async () => {
    const P = 'p-revision-semantics'
    const a = annoOf('a-rev', P)
    seedTab(P, [a])
    mocks.updateAnnotation.mockImplementation((req: { annotation: Annotation }) =>
      Promise.resolve({ ok: true, data: req.annotation })
    )
    const actions = mountActions()
    // 落库回显（无用户输入先行）：U/revision 不动
    expect(await actions.autosaveComment(a, '回显值')).toBe(true)
    expect(useReaderStore.getState().tabs[P]?.editRevision ?? 0).toBe(0)
    expect(useReaderStore.getState().tabs[P]?.unfinalized ?? false).toBe(false)
    // 用户输入（控制器 onUserEdit 同一写点）→ revision=1；其后的写回不推进
    useReaderStore.getState().markTabUnfinalized(P)
    expect(await actions.autosaveComment(a, '回显值2')).toBe(true)
    expect(useReaderStore.getState().tabs[P]?.editRevision).toBe(1)
    // 删除成功=操作单元提交（§2.5 #2）→ revision=2
    mocks.deleteAnnotation.mockResolvedValue({ ok: true, data: undefined })
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    void actions.deleteAnnotation(a)
    await turns()
    expect(mocks.deleteAnnotation).toHaveBeenCalledTimes(1)
    expect(useReaderStore.getState().tabs[P]?.editRevision).toBe(2)
    expect(useReaderStore.getState().tabs[P]?.unfinalized).toBe(true)
  })
})

describe('对照（§2.5 #22）—— 保存期间的真实新输入保持未定稿', () => {
  it('finalize await 新输入：finalize=true（redo 仍清）、revision 前进、U 保持', async () => {
    const id = 'p-finalize-real-race'
    seedTab(id)
    useReaderStore.getState().markTabUnfinalized(id)
    let release!: (v: string) => void
    const flight = new Promise<string>((r) => {
      release = r
    })
    const handle = vi.fn(() => flight)
    registerDraftFlush(`note:${id}`, handle)
    handleIds.push(`note:${id}`)
    const saving = finalizeActiveTab()
    await turns(5)
    expect(handle).toHaveBeenCalledTimes(1)
    useReaderStore.getState().markTabUnfinalized(id)
    release('saved')
    expect(await saving).toBe(true)
    expect(useReaderStore.getState().tabs[id]?.editRevision).toBe(2)
    expect(useReaderStore.getState().tabs[id]?.unfinalized).toBe(true)
  })

  it('总评待写但保存期间有新编辑：待写归后续调度——finalize 仍定稿、U 保持', async () => {
    const P = 'p-finalize-pending-newedit'
    seedTab(P)
    useReaderStore.getState().markTabUnfinalized(P)
    useNotesStore.getState().edit(P, { contentMd: '门控草稿' })
    registerDraftFlush(`note:${P}`, async () => {
      useReaderStore.getState().markTabUnfinalized(P)
      return 'dirty'
    })
    handleIds.push(`note:${P}`)
    expect(await finalizeTab(P)).toBe(true)
    expect(useReaderStore.getState().tabs[P]?.unfinalized).toBe(true)
    expect(useNotesStore.getState().noteByPaper[P]?.pending).toBe(true)
  })
})
