// @vitest-environment jsdom
/**
 * [F-VISFB-64·回炉 W1/W2/W7] 逐写源 closing gate 判别测试（新建，always-active；
 * 设计稿 §④ 写源清单表+§⑦「逐写源断言」字面——每源至少一红一绿判别对）。
 *
 * 覆盖面（blocked=冻结期拒绝 / allowed=closing 外正常）：
 * - tab-dirty 三用户命令：requestCloseTab/switchTabFlushFirst/confirmCloseDirty；
 * - 标注命令族（W1）：saveComment/deleteAnnotation（annotation-popups-actions
 *   用户入口）+ annotation-undo 逆写；autosaveComment 不闸=timer/收口驱动非
 *   用户命令入口（quit flush ② 经 draft.flush→onAutosave 消费——闸则自锁，
 *   回炉申报依据）；
 * - lineage undo/redo 逆写闸；
 * - noteDraft 置真向拒绝；
 * - 悬浮笔记草稿内容写入口（W2）：LineageFloatingNotes textarea onChange
 *   （组件本地态先行于 pending 置真——内容写入口补挂）。
 * [轮2] 增：②句柄 flush 全链性质锁（B-r1-01②——闸点引入②链即红）。
 * [门二 P0-2 拆件] ②.5 真实链判别对/全链+SelectionLayer create 链+批注值入口
 * （门二 P0-1）迁 tests/unit/renderer/quit-gate-realchain.test.ts（≤500 红线）。
 */
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub } from '../../utils/api-client-mock'
import { makeAnnotation, makeTab } from '../../utils/factories'

const mocks = vi.hoisted(() => ({
  annoWrite: vi.fn(),
  annoDelete: vi.fn(),
  annoCreate: vi.fn(),
  lineageUpsertNote: vi.fn()
}))
makeApiStub({
  reader: { updateAnnotation: mocks.annoWrite, deleteAnnotation: mocks.annoDelete, saveAnnotation: mocks.annoCreate },
  lineage: { upsertFloatingNote: mocks.lineageUpsertNote }
})

import { setQuitClosing } from '../../../src/renderer/app/quit-closing-gate'
import { useReaderStore } from '../../../src/renderer/features/reader/state/reader.store'
import { useNotesStore } from '../../../src/renderer/features/notes/notes.store'
import {
  confirmCloseDirty,
  requestCloseTab,
  switchTabFlushFirst
} from '../../../src/renderer/features/reader/state/tab-dirty'
import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'
import { useLineageViewStore } from '../../../src/renderer/features/lineage/lineage-view.store'
import { noteDraftPending, setNoteDraftPending } from '../../../src/renderer/features/lineage/lineage-note-draft'
import {
  hasPendingAnnotationDrafts,
  registerDraftFlush,
  saveAnnotationDraft,
  unregisterDraftFlush
} from '../../../src/renderer/features/reader/interact/annotation-draft-registry'
import { runQuitFlush } from '../../../src/renderer/app/quit-flush'
import {
  useAnnotationPopupActions,
  type AnnotationPopupActions
} from '../../../src/renderer/features/reader/interact/annotation-popups-actions'
import {
  clearStack,
  pushUndo,
  stackDepth,
  undo as annotationUndo
} from '../../../src/renderer/features/reader/state/annotation-undo'
import { LineageFloatingNotes } from '../../../src/renderer/features/lineage/LineageFloatingNotes'
import type { FloatingNote } from '../../../src/shared/models/lineage'

async function drain(turns = 8): Promise<void> {
  for (let i = 0; i < turns; i++) await Promise.resolve()
}

const NOTE: FloatingNote = {
  id: 'fn-1',
  folderId: '__main__',
  x: 10,
  y: 10,
  content: '基线内容',
  createdAt: 't0',
  updatedAt: 't0'
}

let root: Root | null = null
let host: HTMLDivElement | null = null
let confirmSpy: { mockRestore(): void } | null = null

function mountProbe(): AnnotationPopupActions {
  let captured!: AnnotationPopupActions
  function Probe(): JSX.Element | null {
    captured = useAnnotationPopupActions({
      busy: false,
      setBusy: vi.fn(),
      closeEditing: vi.fn(),
      closeMenu: vi.fn(),
      onChanged: vi.fn(),
      editingId: null
    })
    return null
  }
  ;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root!.render(createElement(Probe))
  })
  return captured
}

/** 挂真实 LineageFloatingNotes（edit+select 交互门开——beginEdit/textarea 可达） */
function mountNotes(contentEl: HTMLDivElement): void {
  ;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root!.render(createElement(LineageFloatingNotes, { contentRef: { current: contentEl } }))
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  setQuitClosing(false)
  useReaderStore.setState({ tabs: {}, order: [], activeId: null })
  for (const k of Object.keys(useNotesStore.getState().noteByPaper)) {
    useNotesStore.getState().discardPendingEdit(k)
  }
  useNotesStore.setState({ noteByPaper: {} })
  useLineageStore.setState({
    floatingNotes: [NOTE],
    nodes: [],
    edges: [],
    saveStatus: 'clean',
    queue: [],
    flushing: false,
    lastWriteError: null,
    undoStack: [],
    redoStack: []
  })
  useLineageViewStore.setState({ mode: 'edit', tool: 'select' })
  setNoteDraftPending(false)
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  host?.remove()
  root = null
  host = null
  confirmSpy?.mockRestore()
  confirmSpy = null
  setQuitClosing(false)
  setNoteDraftPending(false)
})

describe('quit-gate-sources —— 逐写源判别（F-VISFB-64 回炉 W1/W2/W7）', () => {
  it('tab-dirty requestCloseTab：冻结期拒绝（返回 false）；closing 外 clean 非活动 tab 放行', async () => {
    useReaderStore.setState({
      tabs: { p1: makeTab('p1'), p2: makeTab('p2') },
      order: ['p1', 'p2'],
      activeId: 'p1'
    })
    setQuitClosing(true)
    await expect(requestCloseTab('p2')).resolves.toBe(false)
    setQuitClosing(false)
    await expect(requestCloseTab('p2')).resolves.toBe(true)
  })

  it('tab-dirty switchTabFlushFirst：冻结期拒绝（不激活）；closing 外激活目标 tab', () => {
    useReaderStore.setState({
      tabs: { p1: makeTab('p1'), p2: makeTab('p2') },
      order: ['p1', 'p2'],
      activeId: 'p1'
    })
    setQuitClosing(true)
    switchTabFlushFirst('p2')
    expect(useReaderStore.getState().activeId).toBe('p1')
    setQuitClosing(false)
    switchTabFlushFirst('p2')
    expect(useReaderStore.getState().activeId).toBe('p2')
  })

  it('tab-dirty confirmCloseDirty：冻结期拒绝（返回 false）；closing 外 clean 直通 true', () => {
    useReaderStore.setState({
      tabs: { p1: makeTab('p1') },
      order: ['p1'],
      activeId: 'p1'
    })
    setQuitClosing(true)
    expect(confirmCloseDirty('p1')).toBe(false)
    setQuitClosing(false)
    expect(confirmCloseDirty('p1')).toBe(true)
  })

  it('标注 saveComment（W1 用户入口）：冻结期拒绝零 api 写；closing 外真实写', async () => {
    const actions = mountProbe()
    const anno = { ...makeAnnotation(''), id: 'anno-w1a', paperId: 'paper-1' }
    useReaderStore.setState({
      tabs: { 'paper-1': makeTab('paper-1', { annotations: [anno] }) },
      order: ['paper-1'],
      activeId: 'paper-1'
    })
    setQuitClosing(true)
    await actions.saveComment(anno, '冻结窗内保存')
    expect(mocks.annoWrite).not.toHaveBeenCalled()
    setQuitClosing(false)
    mocks.annoWrite.mockImplementationOnce(async () => ({
      ok: true as const,
      data: { ...anno, comment: '正常保存' }
    }))
    await actions.saveComment(anno, '正常保存')
    await drain()
    expect(mocks.annoWrite).toHaveBeenCalledTimes(1)
  })

  it('标注 deleteAnnotation（W1 用户入口）：冻结期拒绝（零 confirm 零 api）；closing 外删除链达 api', async () => {
    const actions = mountProbe()
    const anno = { ...makeAnnotation(''), id: 'anno-w1b', paperId: 'paper-1' }
    useReaderStore.setState({
      tabs: { 'paper-1': makeTab('paper-1', { annotations: [anno] }) },
      order: ['paper-1'],
      activeId: 'paper-1'
    })
    confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    setQuitClosing(true)
    await actions.deleteAnnotation(anno)
    expect(window.confirm).not.toHaveBeenCalled()
    expect(mocks.annoDelete).not.toHaveBeenCalled()
    setQuitClosing(false)
    mocks.annoDelete.mockResolvedValueOnce({ ok: true as const, data: { ok: true } })
    await actions.deleteAnnotation(anno)
    await drain()
    expect(mocks.annoDelete).toHaveBeenCalledTimes(1)
  })

  it('标注 undo 逆写（W1）：冻结期 busy 拒绝（栈不变零 api）；closing 外逆写达 api', async () => {
    const anno = { ...makeAnnotation(''), id: 'anno-w1c', paperId: 'paper-undo' }
    clearStack('paper-undo')
    pushUndo('paper-undo', { kind: 'delete', annotation: anno })
    expect(stackDepth('paper-undo')).toBe(1)
    setQuitClosing(true)
    await expect(annotationUndo('paper-undo')).resolves.toEqual({ done: false, reason: 'busy' })
    expect(stackDepth('paper-undo')).toBe(1)
    expect(mocks.annoCreate).not.toHaveBeenCalled()
    setQuitClosing(false)
    mocks.annoCreate.mockImplementationOnce(async () => ({
      ok: true as const,
      data: { ...anno, id: 'anno-recreated' }
    }))
    const outcome = await annotationUndo('paper-undo')
    expect(outcome.done).toBe(true)
    expect(mocks.annoCreate).toHaveBeenCalledTimes(1)
    expect(stackDepth('paper-undo')).toBe(0)
  })

  it('lineage undo：冻结期 no-op（栈不变）；closing 外弹栈', () => {
    // 造一格可撤快照：moveNode 编辑单元（closing 外）
    useLineageStore.setState({
      nodes: [
        {
          id: 'n-g1',
          paperId: 'qp-g1',
          title: '节点',
          year: 2024,
          month: null,
          slot: 0,
          x: 0,
          y: 0,
          folderId: '__main__',
          createdAt: 't0',
          updatedAt: 't0'
        }
      ],
      status: 'ready'
    })
    useLineageStore.getState().moveNode('n-g1', 10, 20)
    expect(useLineageStore.getState().undoStack.length).toBe(1)
    setQuitClosing(true)
    useLineageStore.getState().undo()
    expect(useLineageStore.getState().undoStack.length).toBe(1)
    setQuitClosing(false)
    useLineageStore.getState().undo()
    expect(useLineageStore.getState().undoStack.length).toBe(0)
    expect(useLineageStore.getState().redoStack.length).toBe(1)
  })

  it('lineage redo：冻结期 no-op（redo 栈不变）；closing 外重做', () => {
    useLineageStore.setState({ undoStack: [], redoStack: [{
      nodes: [],
      edges: [],
      lineTypeNames: [],
      queue: [],
      floatingNotes: [NOTE]
    }] })
    setQuitClosing(true)
    useLineageStore.getState().redo()
    expect(useLineageStore.getState().redoStack.length).toBe(1)
    setQuitClosing(false)
    useLineageStore.getState().redo()
    expect(useLineageStore.getState().redoStack.length).toBe(0)
  })

  it('noteDraft 置真向：冻结期拒绝（pending 不立起）；closing 外置真', () => {
    setQuitClosing(true)
    setNoteDraftPending(true)
    expect(noteDraftPending()).toBe(false)
    setQuitClosing(false)
    setNoteDraftPending(true)
    expect(noteDraftPending()).toBe(true)
  })

  it('悬浮笔记草稿内容写入口（W2）：冻结期 textarea 输入被拒（draft 不变→pending 不立起）；closing 外置真', () => {
    const contentEl = document.createElement('div')
    document.body.appendChild(contentEl)
    mountNotes(contentEl)
    // 进入编辑会话（pointerdown→beginEdit——UI 态开关非数据写）
    const noteEl = host!.querySelector<HTMLDivElement>('.tl-note')!
    act(() => {
      noteEl.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }))
    })
    const ta = host!.querySelector<HTMLTextAreaElement>('textarea')
    if (ta === null) throw new Error('编辑会话 textarea 未挂载')
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
    const type = (v: string): void => {
      act(() => {
        setter?.call(ta, v)
        ta.dispatchEvent(new Event('input', { bubbles: true }))
      })
    }
    setQuitClosing(true)
    type('冻结窗内输入')
    expect(noteDraftPending()).toBe(false)
    setQuitClosing(false)
    type('正常输入')
    expect(noteDraftPending()).toBe(true)
    contentEl.remove()
  })

  it('[轮2 B-r1-01②·主控亲笔] 性质锁：closing=true 下②批注句柄 flush 全链可跑通（句柄执行+failed 返回态喂④——未来闸点引入②链即红）', async () => {
    const ran: number[] = []
    registerDraftFlush('anno-prop-64', async () => {
      await Promise.resolve()
      ran.push(1)
      return 'failed' as const
    })
    try {
      setQuitClosing(true)
      // 对照面：同一 closing 态下用户入口写被拒（卸载草稿入表=用户命令面——②判别的红绿分界）
      saveAnnotationDraft('anno-prop-64', '冻结期卸载草稿', true)
      expect(hasPendingAnnotationDrafts()).toBe(false)
      const stillDirty = await runQuitFlush()
      expect(ran).toEqual([1])
      expect(stillDirty).toBe(true)
    } finally {
      setQuitClosing(false)
      unregisterDraftFlush('anno-prop-64')
    }
  })

})
