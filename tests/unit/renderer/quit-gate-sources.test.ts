// @vitest-environment jsdom
/**
 * [F-VISFB-64·回炉 W1/W2/W7] 逐写源 closing gate 判别测试（新建，always-active；
 * 设计稿 §④ 写源清单表+§⑦「逐写源断言」字面——每源至少一红一绿判别对）。
 *
 * 覆盖面（blocked=冻结期拒绝 / allowed=closing 外正常）：
 * - 关 tab/切 tab 用户命令闸（requestCloseTab〔reader-close-tab〕/switchTabFlushFirst）；
 * - 标注命令族（W1）：deleteAnnotation（annotation-popups-actions
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
import { makeAnnotation, makeHistoryEntry, makeTab } from '../../utils/factories'
import { echoHistoryUnit } from '../../utils/lineage-history-stub'

const mocks = vi.hoisted(() => ({
  annoWrite: vi.fn(),
  annoDelete: vi.fn(),
  annoCreate: vi.fn(),
  lineageUpsertNote: vi.fn(),
  // [B4 L1] lineage undo/redo=flush-then-unit：预 drain 回显+history-unit（用户入口同闸）
  lineagePatchNode: vi.fn(),
  lineageHistoryUnit: vi.fn()
}))
makeApiStub({
  reader: { updateAnnotation: mocks.annoWrite, deleteAnnotation: mocks.annoDelete, saveAnnotation: mocks.annoCreate },
  lineage: {
    upsertFloatingNote: mocks.lineageUpsertNote,
    patchNode: mocks.lineagePatchNode,
    historyUnit: mocks.lineageHistoryUnit
  }
})

import { setQuitClosing } from '../../../src/renderer/app/quit-closing-gate'
import { useReaderStore } from '../../../src/renderer/features/reader/state/reader.store'
import { useNotesStore } from '../../../src/renderer/features/notes/notes.store'
import { switchTabFlushFirst } from '../../../src/renderer/features/reader/state/tab-dirty'
import { requestCloseTab } from '../../../src/renderer/features/reader/state/reader-close-tab'
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
  stackDepth
} from '../../../src/renderer/features/reader/state/annotation-undo'
// [B4-A R1 迁移] undo 执行自 annotation-undo 外迁驻 reader-history-commands
import { undoTabOperations as annotationUndo } from '../../../src/renderer/features/reader/state/reader-history-commands'
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
      onChanged: vi.fn()
      // [B4-A R1 迁移·夹具] editingId 实参退役——编辑合并会话改由 blur/卸载终止
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
  // notes 编辑态清扫（弃改 API 退役——测试隔离锚）
  useNotesStore.getState().resetEditStateForTests()
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

  it('[B4-A R2 迁移] 关 tab closing 状态机整体用户命令闸：冻结期 U=1+IO 脏也拒（零 flush 零 closing 相位）；解冻后承接', async () => {
    // 旧 confirmCloseDirty 闸随二选 Dialog 退役——confirm/error 相的入口闸
    // 收敛为 requestCloseTab 入口（ADR-0026 同步 closing gate 挂点保持）
    useNotesStore.getState().edit('p1', { contentMd: '门控草稿' })
    useReaderStore.setState({
      tabs: { p1: makeTab('p1') },
      order: ['p1'],
      activeId: 'p1'
    })
    useReaderStore.getState().markTabUnfinalized('p1')
    setQuitClosing(true)
    await expect(requestCloseTab('p1')).resolves.toBe(false)
    // 冻结期零 flush（notesSave 不发）且 closing 相位不动（none）
    expect(useReaderStore.getState().tabs['p1']?.closing ?? { phase: 'none' }).toEqual({ phase: 'none' })
    setQuitClosing(false)
    // 解冻后走正道：error 相（门控 pending）承接决策
    const closing = requestCloseTab('p1')
    for (let i = 0; i < 20; i++) await Promise.resolve()
    expect(useReaderStore.getState().tabs['p1']?.closing?.phase).toBe('error')
    const { chooseCloseTabDecision } = await import('../../../src/renderer/features/reader/state/reader-close-tab')
    chooseCloseTabDecision('p1', false)
    await expect(closing).resolves.toBe(false)
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

  it('lineage undo：冻结期 no-op（栈不变零 history-unit——用户入口同闸）；closing 外弹栈', async () => {
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
    mocks.lineagePatchNode.mockImplementation(async (req: { id: string; x?: number; y?: number }) =>
      ({ ok: true, data: { ...useLineageStore.getState().nodes.find((n) => n.id === req.id)!, ...req } })
    )
    mocks.lineageHistoryUnit.mockImplementation(echoHistoryUnit)
    setQuitClosing(true)
    await expect(useLineageStore.getState().undo()).resolves.toBe(false)
    expect(useLineageStore.getState().undoStack.length).toBe(1)
    expect(mocks.lineageHistoryUnit).not.toHaveBeenCalled() // history-unit 用户入口同闸
    setQuitClosing(false)
    await expect(useLineageStore.getState().undo()).resolves.toBe(true)
    expect(useLineageStore.getState().undoStack.length).toBe(0)
    expect(useLineageStore.getState().redoStack.length).toBe(1)
    expect(mocks.lineageHistoryUnit).toHaveBeenCalledTimes(1)
  })

  it('lineage redo：冻结期 no-op（redo 栈不变）；closing 外重做', async () => {
    // [B4 L1] 旧 SessionSnapshot 夹具→最小 HistoryEntry（受锁面机械迁移）
    useLineageStore.setState({ undoStack: [], redoStack: [makeHistoryEntry()], status: 'ready', inflight: null, flushing: false })
    mocks.lineageHistoryUnit.mockImplementation(echoHistoryUnit)
    setQuitClosing(true)
    await expect(useLineageStore.getState().redo()).resolves.toBe(false)
    expect(useLineageStore.getState().redoStack.length).toBe(1)
    expect(mocks.lineageHistoryUnit).not.toHaveBeenCalled()
    setQuitClosing(false)
    await expect(useLineageStore.getState().redo()).resolves.toBe(true)
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

// ── [回炉 W-D1·T-B02] 设计稿 §12.2 行 805 增补：lineage 显式保存的 closing gate 拒绝与内部 flush 放行。
//    既有例覆盖 lineage undo/redo 闸；本段补显式保存（saveActiveFolder／retrySave——用户命令面，同闸）
//    与退出握手消费面的内部 flush（save——收口核心路径，放行）的判别对（本文件头注「每源至少一红一绿判别对」）。
describe('quit-gate-sources —— lineage 显式保存闸与内部 flush 放行（[回炉 W-D1] 设计稿 §12.2 行 805、quit-gate 行「内部 flush 放行」）', () => {
  const GATE_NODE = { id: 'n-g2', paperId: 'qp-g2', title: '节点', year: 2024, month: null, slot: 0, x: 0, y: 0, folderId: '__main__', createdAt: 't0', updatedAt: 't0' }
  const patchOk = vi.fn(async (_req: { id: string }) => ({ ok: true as const, data: { ...GATE_NODE, x: 10, y: 20, updatedAt: 't1' } }))
  /** 活动会话一条待写（Q=1、undo 1、U=1）——写链空闲 */
  const seedPendingWrite = (): void => {
    useLineageStore.setState({
      nodes: [{ ...GATE_NODE }],
      status: 'ready',
      floatingNotes: [],
      saveStatus: 'clean',
      lastWriteError: null,
      queue: [],
      flushing: false,
      inflight: null,
      needsReload: false,
      undoStack: [],
      redoStack: [],
      unfinalized: false,
      editRevision: 0
    })
    useLineageStore.getState().moveNode('n-g2', 10, 20)
    expect(useLineageStore.getState().queue).toHaveLength(1)
  }
  /** IO 轴与 U/历史轴快照（判别「拒绝零副作用」的对照面——按内容比较，不按引用） */
  type GateState = ReturnType<typeof useLineageStore.getState>
  interface IoSnapshot extends Pick<GateState, 'unfinalized' | 'saveStatus' | 'lastWriteError' | 'inflight'> {
    queue: number
    undo: string[]
    redo: string[]
  }
  const snapshot = (): IoSnapshot => {
    const s = useLineageStore.getState()
    return {
      queue: s.queue.length,
      undo: s.undoStack.map((e) => e.id),
      redo: s.redoStack.map((e) => e.id),
      unfinalized: s.unfinalized,
      saveStatus: s.saveStatus,
      lastWriteError: s.lastWriteError,
      inflight: s.inflight
    }
  }

  it('显式保存（saveActiveFolder）：冻结期拒绝——false、零写 IPC、不定稿（Q/两栈/U/相位/在途原样）；解冻后同一命令定稿', async () => {
    mocks.lineagePatchNode.mockImplementation(patchOk)
    seedPendingWrite()
    const undoIds = useLineageStore.getState().undoStack.map((e) => e.id)
    expect(undoIds).toHaveLength(1)
    const before = snapshot()
    expect(before).toEqual({ queue: 1, undo: undoIds, redo: [], unfinalized: true, saveStatus: 'dirty', lastWriteError: null, inflight: null })
    setQuitClosing(true)
    await expect(useLineageStore.getState().saveActiveFolder()).resolves.toBe(false)
    expect(mocks.lineagePatchNode).not.toHaveBeenCalled()
    expect(snapshot(), '拒绝零副作用').toEqual(before)
    setQuitClosing(false)
    await expect(useLineageStore.getState().saveActiveFolder()).resolves.toBe(true)
    expect(mocks.lineagePatchNode).toHaveBeenCalledTimes(1)
    expect(mocks.lineagePatchNode).toHaveBeenLastCalledWith({ id: 'n-g2', title: '节点', year: 2024, month: null, slot: 0, x: 10, y: 20 })
    expect(snapshot(), '解冻后定稿：Q0、undo 保留、redo 清、U 清').toEqual({ queue: 0, undo: undoIds, redo: [], unfinalized: false, saveStatus: 'clean', lastWriteError: null, inflight: null })
  })

  it('error 相位的重试入口（retrySave）：冻结期同闸——零写 IPC、失败写与错误行原样；解冻后重试落库并定稿', async () => {
    mocks.lineagePatchNode.mockResolvedValueOnce({ ok: false, error: { code: 'E', message: '写失败' } }).mockImplementation(patchOk)
    seedPendingWrite()
    setQuitClosing(true)
    await useLineageStore.getState().save() // 内部 flush 放行：写以系统失败收场→error 态（重试入口的前置）
    expect(mocks.lineagePatchNode).toHaveBeenCalledTimes(1)
    const before = snapshot()
    expect(before).toEqual({ queue: 1, undo: [useLineageStore.getState().undoStack[0]!.id], redo: [], unfinalized: true, saveStatus: 'error', lastWriteError: '写失败', inflight: null })
    useLineageStore.getState().retrySave() // 保存错误行的重试=显式保存（用户命令面）
    await drain()
    expect(mocks.lineagePatchNode, '重试被闸拒：不发第二次写').toHaveBeenCalledTimes(1)
    expect(snapshot()).toEqual(before)
    setQuitClosing(false)
    useLineageStore.getState().retrySave()
    await drain()
    expect(mocks.lineagePatchNode).toHaveBeenCalledTimes(2)
    const after = snapshot()
    expect(after).toEqual({ ...before, queue: 0, unfinalized: false, saveStatus: 'clean', lastWriteError: null })
  })

  it('内部 flush 放行：closing 中退出握手消费面 save() 照常 drain 落库→clean；IO 收口不定稿（U/undo 不动、零 history-unit）；同期用户写仍被拒', async () => {
    mocks.lineagePatchNode.mockImplementation(patchOk)
    seedPendingWrite()
    setQuitClosing(true)
    await useLineageStore.getState().save()
    expect(mocks.lineagePatchNode).toHaveBeenCalledTimes(1)
    expect(mocks.lineagePatchNode).toHaveBeenLastCalledWith({ id: 'n-g2', title: '节点', year: 2024, month: null, slot: 0, x: 10, y: 20 })
    expect(snapshot(), 'IO 收口不定稿：U 与 undo 保持').toEqual({
      queue: 0, undo: [useLineageStore.getState().undoStack[0]!.id], redo: [], unfinalized: true, saveStatus: 'clean', lastWriteError: null, inflight: null
    })
    expect(mocks.lineageHistoryUnit).not.toHaveBeenCalled()
    useLineageStore.getState().moveNode('n-g2', 30, 40) // 同一 closing 态下的用户写
    expect(useLineageStore.getState().queue).toHaveLength(0)
    expect(useLineageStore.getState().undoStack).toHaveLength(1)
  })
})
