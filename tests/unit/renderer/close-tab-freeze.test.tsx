// @vitest-environment jsdom
/**
 * [B4-A R2 审查 3/4 → 回归] 关 tab 冻结门（§2.5 #1/#2/#12/#20/#24-#29、§9.2、
 * §10.1）与关闭重入契约。
 *
 * 锁链（审查反例 4/5 转正 + 补全）：
 * - 冻结按 tab 寻址：关闭流程在途期间该 tab 的文本输入、显式保存、批注手动保存、
 *   操作层/文本层 undo-redo、删除（新标注操作）一律拒绝（零 api、栈/值不变）；
 *   他 tab 不受影响（创建标注的冻结面=selection-layer-lane）；
 * - 冻结不拦关闭流程自身的预 flush：打开单元照常提交并落库（内部 flush 走收口面）；
 * - 「否」留下后冻结解除：输入与命令恢复；
 * - 命令状态投影（useActiveTabCommandState）与命令入口同判据：closing 期禁用；
 * - 重入（#24）：返回同一在途关闭 promise（身份相同、单次写、同终态）；在途表
 *   随流程终结出表；预 flush 在途相位=flushing；TabBar 连点共享同一 promise——
 *   多个等待方同获 true 时 store 收口接缝（closeTab）只执行一次。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub } from '../../utils/api-client-mock'
import { makeAnnotation, makeTab } from '../../utils/factories'

const mocks = vi.hoisted(() => ({
  updateAnnotation: vi.fn(),
  deleteAnnotation: vi.fn(),
  saveAnnotation: vi.fn(),
  notesGet: vi.fn(),
  notesSave: vi.fn()
}))
makeApiStub({
  reader: {
    updateAnnotation: mocks.updateAnnotation,
    deleteAnnotation: mocks.deleteAnnotation,
    saveAnnotation: mocks.saveAnnotation
  },
  notes: { get: mocks.notesGet, save: mocks.notesSave }
})

import { chooseCloseTabDecision, requestCloseTab } from '../../../src/renderer/features/reader/state/reader-close-tab'
import { tabClosingFlight, tabWriteBlocked } from '../../../src/renderer/features/reader/state/tab-closing-gate'
import { finalizeActiveTab, finalizeTab } from '../../../src/renderer/features/reader/state/reader-save-coordinator'
import { useActiveTabCommandState } from '../../../src/renderer/features/reader/state/tab-dirty'
import { TextController } from '../../../src/renderer/features/reader/state/reader-text-controller'
import { clearAllTextHistory } from '../../../src/renderer/features/reader/state/reader-text-history'
import { clearStack, pushUndo, redoDepth, stackDepth } from '../../../src/renderer/features/reader/state/annotation-undo'
import { useAnnotationPopupActions, type AnnotationPopupActions } from '../../../src/renderer/features/reader/interact/annotation-popups-actions'
import { registerDraftFlush, unregisterDraftFlush } from '../../../src/renderer/features/reader/interact/annotation-draft-registry'
import { AnnotationPopups } from '../../../src/renderer/features/reader/view/AnnotationPopups'
import { TabBar } from '../../../src/renderer/features/reader/view/TabBar'
import { useReaderStore } from '../../../src/renderer/features/reader/state/reader.store'
import { useNotesStore } from '../../../src/renderer/features/notes/notes.store'
import { resetTabLanes } from '../../../src/renderer/shared/tab-write-lane'
import type { HistoryCommandState } from '../../../src/renderer/shared/history-command'
import type { Annotation, AnnotationRect } from '../../../src/shared/models/annotation'

const RECT: AnnotationRect = { page: 0, x: 0.1, y: 0.2, w: 0.3, h: 0.05 }
const OK = { ok: true as const, data: undefined as never }

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
let ctl: TextController | null = null

beforeEach(() => {
  vi.restoreAllMocks()
  vi.clearAllMocks()
  mocks.updateAnnotation.mockReset()
  mocks.deleteAnnotation.mockReset()
  mocks.saveAnnotation.mockReset()
  mocks.notesGet.mockReset()
  mocks.notesSave.mockReset()
  resetTabLanes()
  clearAllTextHistory()
  ;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
  useReaderStore.setState({ tabs: {}, order: [], activeId: null })
  useNotesStore.getState().resetEditStateForTests()
})

afterEach(() => {
  for (const id of handleIds.splice(0)) unregisterDraftFlush(id)
  ctl?.dispose()
  ctl = null
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

/** 单 tab 夹具（活动=该篇；U=1 使关闭走 confirm 相——冻结持续到用户决策） */
function seedTab(paperId: string, annotations: Annotation[] = []): void {
  useReaderStore.setState({
    tabs: { [paperId]: makeTab(paperId, { annotations }) },
    order: [paperId],
    activeId: paperId
  })
  useReaderStore.getState().markTabUnfinalized(paperId)
}

/** 注释控制器（真实 TextController——文本输入/undo-redo 入口） */
function makeController(paperId: string, historyWrite?: (v: string) => Promise<boolean>): TextController {
  ctl = new TextController({ paperId, kind: 'annotation-comment', annotationId: `t-${paperId}` }, '', {
    persist: async () => true,
    // [B4-A 回炉 R5 fixture migration] 裸写体端口必选：夹具写体本就不入链，同一桩兼作裸通道
    persistRaw: async () => true,
    historyWriteRaw: historyWrite ?? (async () => true),
    onUserEdit: () => useReaderStore.getState().markTabUnfinalized(paperId),
    onChange: () => undefined
  })
  ctl.attach()
  return ctl
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

function mountEditor(anno: Annotation): void {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root!.render(
      <AnnotationPopups
        menu={null}
        editing={{ annotation: anno, rect: RECT }}
        busy={false}
        setMenu={vi.fn()}
        setEditing={vi.fn()}
        setBusy={vi.fn()}
        onChanged={vi.fn()}
      />
    )
  })
}

function textarea(): HTMLTextAreaElement {
  return host!.querySelector('textarea') as HTMLTextAreaElement
}

function typeInto(text: string): void {
  const ta = textarea()
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
  act(() => {
    setter?.call(ta, text)
    ta.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

function phaseOf(paperId: string): string {
  return useReaderStore.getState().tabs[paperId]?.closing?.phase ?? 'none'
}

describe('关 tab 冻结门 —— 按 tab 寻址、用户命令入口统一拒绝（§2.5 #1/#2/#12/#20）', () => {
  it('tab closing 在途（confirm 相）拒绝新文本输入：值/单元不动', async () => {
    const id = 'p-close-input'
    seedTab(id)
    const c = makeController(id)
    registerDraftFlush('a-close', () => c.flush())
    handleIds.push('a-close')
    const closing = requestCloseTab(id)
    await turns()
    expect(phaseOf(id)).toBe('confirm')
    c.edit('new input during close')
    expect(c.view().comment).toBe('')
    expect(c.view().canUndo).toBe(false)
    chooseCloseTabDecision(id, false)
    expect(await closing).toBe(false)
  })

  it('冻结期用户命令一律拒绝：显式保存/批注手动保存/操作层 undo-redo/文本层 undo-redo/删除（零 api、栈与值不变）', async () => {
    const P = 'p-freeze-commands'
    const a = annoOf('a-cmd', P)
    seedTab(P, [a])
    // 操作层：两条 create 撤一条（可撤 1、可重做 1）
    pushUndo(P, { kind: 'create', annotation: annoOf('a-cmd-1', P) })
    pushUndo(P, { kind: 'create', annotation: annoOf('a-cmd-2', P) })
    mocks.deleteAnnotation.mockResolvedValue(OK)
    mocks.saveAnnotation.mockResolvedValue({ ok: true, data: annoOf('a-cmd-2', P) })
    expect(await useReaderStore.getState().undo()).toBe(true)
    expect(stackDepth(P)).toBe(1)
    expect(redoDepth(P)).toBe(1)
    // 文本层：撤一步（可重做 1）
    const historyWrite = vi.fn(() => Promise.resolve(true))
    const c = makeController(P, historyWrite)
    c.edit('a')
    await c.flush()
    expect(await c.undo()).toBe(true)
    expect(c.view().comment).toBe('')
    mocks.deleteAnnotation.mockClear()
    historyWrite.mockClear()
    const actions = mountActions()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const closing = requestCloseTab(P)
    await turns()
    expect(phaseOf(P)).toBe('confirm')
    // 显式保存（tab 级 finalize）
    expect(await finalizeTab(P)).toBe(false)
    expect(await finalizeActiveTab()).toBe(false)
    // 批注手动保存（saveComment 用户命令入口）
    void actions.saveComment(a, '关闭中保存')
    await turns()
    expect(mocks.updateAnnotation).not.toHaveBeenCalled()
    // 操作层 undo/redo
    expect(await useReaderStore.getState().undo()).toBe(false)
    expect(await useReaderStore.getState().redo()).toBe(false)
    // 文本层 undo/redo
    expect(await c.undo()).toBe(false)
    expect(await c.redo()).toBe(false)
    // 删除（新标注操作）
    void actions.deleteAnnotation(a)
    await turns()
    // 零 api、栈与值不变
    expect(mocks.deleteAnnotation).not.toHaveBeenCalled()
    expect(historyWrite).not.toHaveBeenCalled()
    expect(stackDepth(P)).toBe(1)
    expect(redoDepth(P)).toBe(1)
    expect(c.view().comment).toBe('')
    expect(useReaderStore.getState().tabs[P]?.annotations).toHaveLength(1)
    // 「否」留下：冻结解除，命令恢复
    chooseCloseTabDecision(P, false)
    expect(await closing).toBe(false)
    expect(tabWriteBlocked(P)).toBe(false)
    expect(phaseOf(P)).toBe('none')
    expect(await c.redo()).toBe(true)
    expect(c.view().comment).toBe('a')
    expect(await useReaderStore.getState().redo()).toBe(true)
    expect(mocks.saveAnnotation).toHaveBeenCalledTimes(1)
  })

  it('冻结按 tab 寻址：关 A 在途不冻结 B 的输入', async () => {
    const A = 'p-freeze-a'
    const B = 'p-freeze-b'
    useReaderStore.setState({
      tabs: { [A]: makeTab(A), [B]: makeTab(B) },
      order: [A, B],
      activeId: A
    })
    useReaderStore.getState().markTabUnfinalized(A)
    const closing = requestCloseTab(A)
    await turns()
    expect(phaseOf(A)).toBe('confirm')
    expect(tabWriteBlocked(A)).toBe(true)
    expect(tabWriteBlocked(B)).toBe(false)
    const ctlB = makeController(B)
    ctlB.edit('b 的输入')
    expect(ctlB.view().comment).toBe('b 的输入')
    chooseCloseTabDecision(A, false)
    expect(await closing).toBe(false)
  })

  it('冻结不拦关闭流程自身的预 flush：打开单元照常提交并落库；冻结期再输入被拒；「否」后解冻', async () => {
    const P = 'p-freeze-internal'
    const a = annoOf('a-internal', P)
    seedTab(P, [a])
    mocks.updateAnnotation.mockImplementation((req: { annotation: Annotation }) =>
      Promise.resolve({ ok: true, data: req.annotation })
    )
    mountEditor(a)
    typeInto('窗内值')
    let closing: Promise<boolean> | null = null
    await act(async () => {
      closing = requestCloseTab(P)
      // 冻结即生效（同一同步段）——关闭预 flush 在冻结下照常
      expect(tabWriteBlocked(P)).toBe(true)
      await turns()
    })
    expect(mocks.updateAnnotation).toHaveBeenCalledTimes(1)
    expect(mocks.updateAnnotation).toHaveBeenCalledWith(
      expect.objectContaining({ annotation: expect.objectContaining({ comment: '窗内值' }) })
    )
    expect(phaseOf(P)).toBe('confirm')
    typeInto('关闭中输入')
    expect(textarea().value).toBe('窗内值')
    expect(mocks.updateAnnotation).toHaveBeenCalledTimes(1)
    await act(async () => {
      chooseCloseTabDecision(P, false)
      await turns()
    })
    expect(await closing).toBe(false)
    expect(tabWriteBlocked(P)).toBe(false)
    typeInto('留下后输入')
    expect(textarea().value).toBe('留下后输入')
  })

  it('命令状态投影与命令入口同判据：closing 期 canSave/canUndo/canRedo=false，「否」后恢复', async () => {
    const P = 'p-freeze-projection'
    seedTab(P)
    pushUndo(P, { kind: 'create', annotation: annoOf('a-proj', P) })
    // 访问器形（闭包内赋值——直接 let 会被控制流收窄为 null）
    const seen: { command: HistoryCommandState | null } = { command: null }
    function Probe(): null {
      seen.command = useActiveTabCommandState()
      return null
    }
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    act(() => {
      root!.render(<Probe />)
    })
    const command = (): HistoryCommandState => {
      if (seen.command === null) throw new Error('Probe 未渲染')
      return seen.command
    }
    expect(command().canSave).toBe(true)
    expect(command().canUndo).toBe(true)
    let closing: Promise<boolean> | null = null
    await act(async () => {
      closing = requestCloseTab(P)
      await turns()
    })
    expect(command().canSave).toBe(false)
    expect(command().canUndo).toBe(false)
    expect(command().canRedo).toBe(false)
    await act(async () => {
      chooseCloseTabDecision(P, false)
      await turns()
    })
    expect(await closing).toBe(false)
    expect(command().canSave).toBe(true)
    expect(command().canUndo).toBe(true)
  })
})

describe('关闭重入契约（§2.5 #24）—— 同一在途关闭 promise', () => {
  it('flush 在途重入：返回原 promise（身份相同、单次写、同终态）；流程终结后在途表出表', async () => {
    const id = 'p-close-reentry'
    seedTab(id)
    let release!: (v: string) => void
    const gate = new Promise<string>((r) => {
      release = r
    })
    const handle = vi.fn(() => gate)
    registerDraftFlush('a-reentry', handle)
    handleIds.push('a-reentry')
    expect(tabClosingFlight(id)).toBeUndefined()
    const first = requestCloseTab(id)
    await turns(5)
    expect(handle).toHaveBeenCalledTimes(1)
    expect(tabClosingFlight(id)).toBe(first)
    // 预 flush 在途：相位投影=flushing（#24；none/flushing 不渲染对话框）
    expect(phaseOf(id)).toBe('flushing')
    const second = requestCloseTab(id)
    const third = requestCloseTab(id)
    expect(second).toBe(first)
    expect(third).toBe(first)
    release('saved')
    await turns()
    // confirm 相（U=1）：同一 promise 等同一决策
    expect(phaseOf(id)).toBe('confirm')
    chooseCloseTabDecision(id, true)
    expect(await first).toBe(true)
    expect(await second).toBe(true)
    expect(handle).toHaveBeenCalledTimes(1)
    expect(tabClosingFlight(id)).toBeUndefined()
    expect(tabWriteBlocked(id)).toBe(false)
  })
  it('TabBar 连点：flush 在途两次关闭请求共享同一 promise——closeTab 收口接缝只执行一次', async () => {
    const id = 'p-close-tabbar'
    useReaderStore.setState({
      tabs: { [id]: makeTab(id) },
      order: [id],
      activeId: id
    })
    // 非门控 dirty 篇（load 后 edit）——慢写挂起承载 flush 在途窗
    mocks.notesGet.mockResolvedValueOnce({
      ok: true,
      data: { id: `n-${id}`, paperId: id, contentMd: '基线', createdAt: 't0', updatedAt: 't1' }
    })
    await useNotesStore.getState().load(id)
    useNotesStore.getState().edit(id, { contentMd: '连点' })
    let resolveSave!: (v: unknown) => void
    mocks.notesSave.mockImplementationOnce(
      () =>
        new Promise((r) => {
          resolveSave = r
        })
    )
    const realCloseTab = useReaderStore.getState().closeTab
    const closeTab = vi.fn((paperId: string) => realCloseTab(paperId))
    useReaderStore.setState({ closeTab })
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    await act(async () => {
      root!.render(<TabBar />)
    })
    const close = host.querySelector<HTMLButtonElement>('[aria-label^="关闭"]')!
    await act(async () => {
      close.click()
      await turns(5)
      close.click()
      await turns(5)
    })
    expect(mocks.notesSave).toHaveBeenCalledTimes(1)
    resolveSave({
      ok: true,
      data: { id: `n-${id}`, paperId: id, contentMd: '连点', createdAt: 't0', updatedAt: 't1' }
    })
    await act(async () => {
      await turns()
    })
    // U=0 直接放行：两次请求同获 true，store 收口接缝恰一次
    expect(closeTab).toHaveBeenCalledTimes(1)
    expect(useReaderStore.getState().tabs[id]).toBeUndefined()
    expect(mocks.notesSave).toHaveBeenCalledTimes(1)
  })
})
