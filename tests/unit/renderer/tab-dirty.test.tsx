// @vitest-environment jsdom
/**
 * [SR2-TABS-03→B4-A R2 §10.1] tab-dirty 灰点信号聚合锁定测试（R2 迁移：
 * 灰点输入由 annoDirty/notesPending 改 unfinalized 单源；IO 两源只作 quitDirty/
 * 状态条输入——§12.2 tab-dirty 行）。
 * 锁面：U 轴生命周期（markTabUnfinalized/finalizeTabUnfinalized revision 规则）；
 * TabBar 灰点随 U（idle 后 Q0 灰点仍在/显式保存清/后台 tab OR）；真实输入链
 * （控制器 edit→U、idle-flush 不清 U、finalize 清 U）经 AnnotationPopups 集成；
 * 文本 undo/redo 成功=新编辑事件（§2.5 #16/#17——控制器 onUserEdit 端口置 U）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { makeApiStub } from '../../utils/api-client-mock'
import { makeAnnotation, makeTab } from '../../utils/factories'
import { useTabUnfinalizedAggregate, useTabAutosaveSignals, switchTabFlushFirst } from '../../../src/renderer/features/reader/state/tab-dirty'
import { finalizeActiveTab } from '../../../src/renderer/features/reader/state/reader-save-coordinator'
import { TabBar } from '../../../src/renderer/features/reader/view/TabBar'
import { AnnotationPopups } from '../../../src/renderer/features/reader/view/AnnotationPopups'
import { useReaderStore } from '../../../src/renderer/features/reader/state/reader.store'
import { useNotesStore } from '../../../src/renderer/features/notes/notes.store'
import type { TabState } from '../../../src/renderer/features/reader/state/reader.store'
import type { Annotation, AnnotationRect } from '../../../src/shared/models/annotation'

const mocks = vi.hoisted(() => ({
  annoUpdate: vi.fn(),
  notesGet: vi.fn(),
  notesSave: vi.fn()
}))
makeApiStub({
  reader: { updateAnnotation: mocks.annoUpdate },
  notes: { get: mocks.notesGet, save: mocks.notesSave }
})

let root: Root | null = null
let host: HTMLDivElement | null = null

/** 注入 reader store 状态并挂载 TabBar（组件级灰点用例共用） */
function mountWith(props: {
  tabs: Record<string, TabState>
  order: string[]
  activeId: string | null
}): void {
  useReaderStore.setState(props)
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root?.render(<TabBar />)
  })
}

function dirtyDots(): HTMLElement[] {
  return [...(host?.querySelectorAll<HTMLElement>('[data-testid="tab-dirty-dot"]') ?? [])]
}

beforeEach(() => {
  vi.restoreAllMocks()
  vi.clearAllMocks()
  mocks.annoUpdate.mockReset()
  mocks.notesGet.mockReset()
  mocks.notesSave.mockReset()
  useReaderStore.setState({ tabs: {}, order: [], activeId: null })
  useNotesStore.setState({ noteByPaper: {} })
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  host?.remove()
  root = null
  host = null
})

// ── U 轴生命周期（store 写点）──
it('U 生命周期：markTabUnfinalized 置位+revision 递增（参数化写入后台 tab）；finalizeTabUnfinalized 仅 revision 未前进才清', () => {
  useReaderStore.setState({
    tabs: { 'p-1': makeTab('p-1'), 'p-2': makeTab('p-2') },
    order: ['p-1', 'p-2'],
    activeId: 'p-1'
  })
  useReaderStore.getState().markTabUnfinalized('p-2')
  expect(useReaderStore.getState().tabs['p-2']?.unfinalized).toBe(true)
  expect(useReaderStore.getState().tabs['p-2']?.editRevision).toBe(1)
  // 同 tab 再编辑：revision 前进（§2.2 editRevision）
  useReaderStore.getState().markTabUnfinalized('p-2')
  expect(useReaderStore.getState().tabs['p-2']?.editRevision).toBe(2)
  // finalize 回执携旧 revision：不清（§2.5 #22——保存期间新编辑灰点不被旧回执误清）
  useReaderStore.getState().finalizeTabUnfinalized('p-2', 1)
  expect(useReaderStore.getState().tabs['p-2']?.unfinalized).toBe(true)
  // 携当前 revision：清（§2.5 #21）
  useReaderStore.getState().finalizeTabUnfinalized('p-2', 2)
  expect(useReaderStore.getState().tabs['p-2']?.unfinalized).toBe(false)
  // 缺席 tab no-op 不抛
  useReaderStore.getState().markTabUnfinalized('p-absent')
  expect(useReaderStore.getState().tabs['p-absent']).toBeUndefined()
})

// ── TabBar 灰点=U 单源（§10.1「TabBar 灰点直接读 tab.unfinalized」）──
it('灰点渲染：U=1 即渲染（IO 双净或脏不参与）；U=0 无灰点（旧 annoDirty/notesPending 双源语义退役）', () => {
  mountWith({
    tabs: { 'p-1': makeTab('p-1'), 'p-2': makeTab('p-2') },
    order: ['p-1', 'p-2'],
    activeId: 'p-1'
  })
  // U 全 0：无灰点——即使 IO 面脏（annotations 失败残留/notes pending）也不出灰点
  act(() => {
    useReaderStore.getState().markTabDirty('p-1')
    useNotesStore.setState({
      noteByPaper: { 'p-2': { contentMd: 'x', saving: false, savedAt: null, pending: true, saveFailed: false } }
    })
  })
  expect(dirtyDots()).toHaveLength(0)
  // U=1（后台 tab）→ 恰一个灰点（响应式）
  act(() => {
    useReaderStore.getState().markTabUnfinalized('p-2')
  })
  expect(dirtyDots()).toHaveLength(1)
  // 前台 tab 也 U=1 → 两个（后台 tab OR——每 tab 各自灰点）
  act(() => {
    useReaderStore.getState().markTabUnfinalized('p-1')
  })
  expect(dirtyDots()).toHaveLength(2)
  // IO 面清除不动灰点（idle-flush 落库 ≠ 定稿——§2.5 #8「U 不变」）
  act(() => {
    useReaderStore.getState().clearTabDirty('p-1')
    useNotesStore.setState({ noteByPaper: {} })
  })
  expect(dirtyDots()).toHaveLength(2)
  // finalize 清账（revision 匹配）→ 灰点清
  act(() => {
    useReaderStore.getState().finalizeTabUnfinalized('p-1', 1)
    useReaderStore.getState().finalizeTabUnfinalized('p-2', 1)
  })
  expect(dirtyDots()).toHaveLength(0)
})

// ── rail 阅读器角标输入（useTabUnfinalizedAggregate：后台 tab OR）──
it('useTabUnfinalizedAggregate：任一打开 tab U=1 → true；全 0/已关 → false', () => {
  useReaderStore.setState({
    tabs: { 'p-1': makeTab('p-1'), 'p-2': makeTab('p-2') },
    order: ['p-1', 'p-2'],
    activeId: 'p-1'
  })
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  let agg: boolean | null = null
  function Probe(): JSX.Element {
    agg = useTabUnfinalizedAggregate()
    return <span data-testid="probe">{agg ? 'unfinalized' : 'clean'}</span>
  }
  act(() => {
    root?.render(<Probe />)
  })
  expect(agg).toBe(false)
  // 后台 tab U=1 → 聚合 true（rail 角标=全 tab OR——§2.1）
  act(() => {
    useReaderStore.getState().markTabUnfinalized('p-2')
  })
  expect(agg).toBe(true)
  // 关掉该 tab → 聚合回 false
  act(() => {
    useReaderStore.getState().closeTab('p-2')
  })
  expect(agg).toBe(false)
})

// ── IO 两源分列（quitDirty 输入不消费 U——INV-22/187）──
it('useTabAutosaveSignals（IO 输入）：U=1 且 IO 双净 → 两信号均 false（灰点不进 quitDirty）', () => {
  useReaderStore.setState({
    tabs: { 'p-1': makeTab('p-1') },
    order: ['p-1'],
    activeId: 'p-1'
  })
  useReaderStore.getState().markTabUnfinalized('p-1')
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  let signals: { annoDirty: boolean; notePending: boolean } | null = null
  function Probe(): JSX.Element {
    signals = useTabAutosaveSignals()
    return <span />
  }
  act(() => {
    root?.render(<Probe />)
  })
  expect(signals).toEqual({ annoDirty: false, notePending: false })
})

// ── 真实输入链集成：输入→U=1；idle 落库（Q0）灰点仍在；显式保存灰点清 ──
it('集成链：批注输入→U=1 灰点出；1.5s idle 落库（Q0/句柄 saved）灰点仍在；finalizeActiveTab→灰点清', async () => {
  vi.useFakeTimers()
  try {
    const RECT: AnnotationRect = { page: 0, x: 0.1, y: 0.2, w: 0.3, h: 0.05 }
    const anno = { ...makeAnnotation(''), id: 'anno-u1', paperId: 'p-u1' }
    useReaderStore.setState({
      tabs: { 'p-u1': makeTab('p-u1', { annotations: [anno] }) },
      order: ['p-u1'],
      activeId: 'p-u1'
    })
    mocks.annoUpdate.mockResolvedValue({ ok: true, data: { ...anno, comment: '新文' } })
    mountWith({
      tabs: useReaderStore.getState().tabs,
      order: ['p-u1'],
      activeId: 'p-u1'
    })
    host2Mount(anno, RECT)
    const ta = host?.querySelector('textarea') as HTMLTextAreaElement
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
    act(() => {
      setter?.call(ta, '新文')
      ta.dispatchEvent(new Event('input', { bubbles: true }))
    })
    // 立即 U=1（§2.5 #1——不等单元提交/落库）
    expect(useReaderStore.getState().tabs['p-u1']?.unfinalized).toBe(true)
    expect(dirtyDots()).toHaveLength(1)
    // 1.5s idle：单元提交+落库（Q→0——句柄 saved）；灰点仍在（idle-flush≠定稿）
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_500)
    })
    expect(mocks.annoUpdate).toHaveBeenCalledTimes(1)
    expect(useReaderStore.getState().tabs['p-u1']?.dirty).toBe(false)
    expect(useNotesStore.getState().noteByPaper['p-u1']).toBeUndefined()
    expect(dirtyDots()).toHaveLength(1)
    // 显式保存：finalize 成功清 U（#21）→ 灰点清
    await act(async () => {
      await finalizeActiveTab()
    })
    expect(useReaderStore.getState().tabs['p-u1']?.unfinalized).toBe(false)
    expect(dirtyDots()).toHaveLength(0)
  } finally {
    vi.useRealTimers()
  }
})

// ── 文本 undo/redo 成功=新编辑事件（§2.5 #16/#17）：各自推进 revision 并置 U（redo 死于定稿——
// redo 紧随 undo 验证，不经第二次显式保存）──
it('集成链：显式保存清 U 后文本 undo 成功→revision 前进、U=1 灰点出；redo 成功→revision 再前进、U 保持', async () => {
  vi.useFakeTimers()
  try {
    const RECT: AnnotationRect = { page: 0, x: 0.1, y: 0.2, w: 0.3, h: 0.05 }
    const anno = { ...makeAnnotation(''), id: 'anno-u2', paperId: 'p-u2' }
    useReaderStore.setState({
      tabs: { 'p-u2': makeTab('p-u2', { annotations: [anno] }) },
      order: ['p-u2'],
      activeId: 'p-u2'
    })
    mocks.annoUpdate.mockResolvedValue({ ok: true, data: { ...anno, comment: '可撤文本' } })
    mountWith({
      tabs: useReaderStore.getState().tabs,
      order: ['p-u2'],
      activeId: 'p-u2'
    })
    host2Mount(anno, RECT)
    const ta = host?.querySelector('textarea') as HTMLTextAreaElement
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
    act(() => {
      setter?.call(ta, '可撤文本')
      ta.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_500)
    })
    await act(async () => {
      await finalizeActiveTab()
    })
    expect(useReaderStore.getState().tabs['p-u2']?.unfinalized).toBe(false)
    expect(useReaderStore.getState().tabs['p-u2']?.editRevision).toBe(1)
    expect(dirtyDots()).toHaveLength(0)
    // 文本 undo 成功（反向写经真实弹层链）=新编辑事件：revision 前进、U=1、灰点出
    const undoBtn = host!.querySelector<HTMLButtonElement>('[data-testid="annotation-editor-undo"]')!
    await act(async () => {
      undoBtn.click()
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(ta.value).toBe('')
    expect(mocks.annoUpdate).toHaveBeenCalledTimes(2)
    expect(useReaderStore.getState().tabs['p-u2']?.editRevision).toBe(2)
    expect(useReaderStore.getState().tabs['p-u2']?.unfinalized).toBe(true)
    expect(dirtyDots()).toHaveLength(1)
    // redo 成功=新编辑事件：revision 再前进、U 保持
    const redoBtn = host!.querySelector<HTMLButtonElement>('[data-testid="annotation-editor-redo"]')!
    await act(async () => {
      redoBtn.click()
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(ta.value).toBe('可撤文本')
    expect(mocks.annoUpdate).toHaveBeenCalledTimes(3)
    expect(useReaderStore.getState().tabs['p-u2']?.editRevision).toBe(3)
    expect(useReaderStore.getState().tabs['p-u2']?.unfinalized).toBe(true)
    expect(dirtyDots()).toHaveLength(1)
  } finally {
    vi.useRealTimers()
  }
})

/** 集成链用：在 TabBar 同 host 内补挂 AnnotationPopups（编辑器挂载=U 输入链） */
function host2Mount(anno: Annotation, rect: AnnotationRect): void {
  const popupHost = document.createElement('div')
  host?.appendChild(popupHost)
  const popupRoot = createRoot(popupHost)
  act(() => {
    popupRoot.render(
      <AnnotationPopups
        menu={null}
        editing={{ annotation: anno, rect }}
        busy={false}
        setMenu={vi.fn()}
        setEditing={vi.fn()}
        setBusy={vi.fn()}
        onChanged={vi.fn()}
      />
    )
  })
  rootsToUnmount.push(popupRoot)
  hostsToRemove.push(popupHost)
}

const rootsToUnmount: Array<Root> = []
const hostsToRemove: Array<HTMLElement> = []

afterEach(() => {
  for (const r of rootsToUnmount.splice(0)) {
    act(() => {
      r.unmount()
    })
  }
  for (const h of hostsToRemove.splice(0)) {
    h.remove()
  }
})

// ── 切 tab flush-first（迁移沿承：两 tab 栈/U 均不动）──
it('switchTabFlushFirst：离场篇 pending 立存 fire-first 不阻切换；U 不因切换清除', async () => {
  useReaderStore.setState({
    tabs: { 'ps-1': makeTab('ps-1'), 'ps-2': makeTab('ps-2') },
    order: ['ps-1', 'ps-2'],
    activeId: 'ps-1'
  })
  useReaderStore.getState().markTabUnfinalized('ps-1')
  mocks.notesGet.mockResolvedValueOnce({ ok: true, data: { id: 'n-ps1', paperId: 'ps-1', contentMd: '基线', createdAt: 't0', updatedAt: 't1' } })
  await useNotesStore.getState().load('ps-1')
  useNotesStore.getState().edit('ps-1', { contentMd: '切走前最新值' })
  mocks.notesSave.mockResolvedValueOnce({ ok: true, data: { id: 'n-ps1', paperId: 'ps-1', contentMd: '切走前最新值', createdAt: 't0', updatedAt: 't2' } })
  switchTabFlushFirst('ps-2')
  expect(useReaderStore.getState().activeId).toBe('ps-2')
  for (let i = 0; i < 12; i++) await Promise.resolve()
  expect(mocks.notesSave).toHaveBeenCalledWith({ paperId: 'ps-1', contentMd: '切走前最新值' })
  // §2.5 #31：切换不是定稿——U 保留
  expect(useReaderStore.getState().tabs['ps-1']?.unfinalized).toBe(true)
})
