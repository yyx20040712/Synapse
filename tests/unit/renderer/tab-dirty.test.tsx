// @vitest-environment jsdom
/**
 * [SR2-TABS-03] tab-dirty 灰点信号聚合锁定测试（工单文化层条款）。
 * 两写面（B3 裁决 α 双层的 tab 粒度投影）：①annotations 面（TabState.dirty，
 * 保存失败置位/重试成功清除）②notes 面（notes.store noteByPaper[].pending——
 * 未落库编辑镜像，保存失败不清即含失败态）。聚合=或语义。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { isTabDirty, useTabDirtyAggregate, confirmCloseDirty } from '../../../src/renderer/features/reader/tab-dirty'
import { TabBar } from '../../../src/renderer/features/reader/TabBar'
import { useReaderStore } from '../../../src/renderer/features/reader/reader.store'
import { useNotesStore } from '../../../src/renderer/features/notes/notes.store'
import type { TabState } from '../../../src/renderer/features/reader/reader.store'
import { guardedDescribe } from '../../utils/guard'

function makeTab(id: string, patch: Partial<TabState> = {}): TabState {
  return {
    paperId: id,
    fileUrl: `app-file://${id}`,
    fileName: `${id}.pdf`,
    title: '',
    page: 0,
    totalPages: 10,
    zoom: 1,
    color: 'yellow',
    annotations: [],
    status: 'ready',
    dirty: false,
    ...patch
  }
}

let root: Root | null = null
let host: HTMLDivElement | null = null

/** 注入 reader store 状态并挂载 TabBar（组件级灰点/确认用例共用） */
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

beforeEach(() => {
  vi.restoreAllMocks()
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

guardedDescribe('SR2-TABS-03', 'tab-dirty —— 两写面灰点信号聚合', () => {
  it('isTabDirty 或语义：任一写面 dirty 即真；双净才假', () => {
    expect(isTabDirty('p-1', { annoDirty: true, notesPending: false })).toBe(true)
    expect(isTabDirty('p-1', { annoDirty: false, notesPending: true })).toBe(true)
    expect(isTabDirty('p-1', { annoDirty: true, notesPending: true })).toBe(true)
    expect(isTabDirty('p-1', { annoDirty: false, notesPending: false })).toBe(false)
  })

  it('annotations 面信号链：markTabDirty 置位 → clearTabDirty 清除（重试成功语义）', () => {
    useReaderStore.setState({
      tabs: { 'p-1': makeTab('p-1'), 'p-2': makeTab('p-2') },
      order: ['p-1', 'p-2'],
      activeId: 'p-1'
    })
    useReaderStore.getState().markTabDirty('p-1')
    expect(useReaderStore.getState().tabs['p-1']?.dirty).toBe(true)
    // 参数化写入：非 active tab 也可置位（异步失败迟到于切换场景）
    useReaderStore.getState().markTabDirty('p-2')
    expect(useReaderStore.getState().tabs['p-2']?.dirty).toBe(true)
    expect(useReaderStore.getState().tabs['p-1']?.dirty).toBe(true)
    useReaderStore.getState().clearTabDirty('p-1')
    expect(useReaderStore.getState().tabs['p-1']?.dirty).toBe(false)
    expect(useReaderStore.getState().tabs['p-2']?.dirty).toBe(true)
  })

  it('notes 面信号：pending 镜像直接映射 tab dirty（失败不清 pending 的不变量由 notes.store.test 锁定）', () => {
    useReaderStore.setState({
      tabs: { 'p-1': makeTab('p-1') },
      order: ['p-1'],
      activeId: 'p-1'
    })
    useNotesStore.setState({ noteByPaper: { 'p-1': { title: '', contentMd: 'x', saving: false, savedAt: null, pending: true } } })
    expect(isTabDirty('p-1', { annoDirty: false, notesPending: useNotesStore.getState().noteByPaper['p-1']?.pending ?? false })).toBe(true)
    // pending 落定（保存成功）后不 dirty
    useNotesStore.setState({ noteByPaper: { 'p-1': { title: '', contentMd: 'x', saving: false, savedAt: 't2', pending: false } } })
    expect(isTabDirty('p-1', { annoDirty: false, notesPending: false })).toBe(false)
  })

  it('useTabDirtyAggregate：任一 tab 任一写面 dirty → true；全净 → false', () => {
    useReaderStore.setState({
      tabs: { 'p-1': makeTab('p-1'), 'p-2': makeTab('p-2') },
      order: ['p-1', 'p-2'],
      activeId: 'p-1'
    })
    // 净态挂载 → false
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    let agg: boolean | null = null
    function Probe(): JSX.Element {
      agg = useTabDirtyAggregate()
      return <span data-testid="probe">{agg ? 'dirty' : 'clean'}</span>
    }
    act(() => {
      root?.render(<Probe />)
    })
    expect(agg).toBe(false)
    // annotations 面：p-2 dirty → true（响应式）
    act(() => {
      useReaderStore.getState().markTabDirty('p-2')
    })
    expect(agg).toBe(true)
    // notes 面：清 p-1 的 annotations 面后，p-1（tab 键集内）pending 仍触发
    act(() => {
      useReaderStore.getState().clearTabDirty('p-2')
      useNotesStore.setState({ noteByPaper: { 'p-1': { title: '', contentMd: '', saving: false, savedAt: null, pending: true } } })
    })
    expect(agg).toBe(true)
    // 非 tab 键集的 pending 残留（已关 tab 草稿）不触发聚合误报（W1 锁定）
    act(() => {
      useNotesStore.setState({
        noteByPaper: { 'p-closed': { title: '', contentMd: '', saving: false, savedAt: null, pending: true } }
      })
    })
    expect(agg).toBe(false)
    // 全清 → false
    act(() => {
      useNotesStore.setState({ noteByPaper: {} })
    })
    expect(agg).toBe(false)
  })

  it('confirmCloseDirty：clean 直接放行（不弹窗）；dirty 弹 confirm——取消不放行/确认放行', () => {
    const confirmSpy = vi.spyOn(window, 'confirm')
    useReaderStore.setState({
      tabs: { 'p-1': makeTab('p-1', { fileName: '论文甲.pdf' }) },
      order: ['p-1'],
      activeId: 'p-1'
    })
    // clean：不弹窗直接放行
    confirmSpy.mockReturnValue(true)
    expect(confirmCloseDirty('p-1')).toBe(true)
    expect(confirmSpy).not.toHaveBeenCalled()
    // dirty：取消 → 不放行
    useReaderStore.getState().markTabDirty('p-1')
    confirmSpy.mockReturnValue(false)
    expect(confirmCloseDirty('p-1')).toBe(false)
    expect(confirmSpy).toHaveBeenCalledTimes(1)
    // 文案含文献名（去扩展名）
    expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining('论文甲'))
    // dirty：确认 → 放行
    confirmSpy.mockReturnValue(true)
    expect(confirmCloseDirty('p-1')).toBe(true)
    confirmSpy.mockRestore()
  })
})

guardedDescribe('SR2-TABS-03', 'TabBar —— 灰点渲染与关闭脏 tab 确认（组件级）', () => {
  function dirtyDots(): HTMLElement[] {
    return [...(host?.querySelectorAll<HTMLElement>('[data-testid="tab-dirty-dot"]') ?? [])]
  }
  function closeButtons(): HTMLButtonElement[] {
    return [...(host?.querySelectorAll<HTMLButtonElement>('[aria-label^="关闭"]') ?? [])]
  }

  it('灰点渲染：annotations 面（TabState.dirty）与 notes 面（pending）任一即渲染 ●；clean 无', () => {
    mountWith({
      tabs: { 'p-1': makeTab('p-1'), 'p-2': makeTab('p-2') },
      order: ['p-1', 'p-2'],
      activeId: 'p-1'
    })
    // clean：无灰点
    expect(dirtyDots()).toHaveLength(0)
    // annotations 面：p-1 dirty → 恰一个灰点（响应式）
    act(() => {
      useReaderStore.getState().markTabDirty('p-1')
    })
    expect(dirtyDots()).toHaveLength(1)
    // notes 面：p-2 pending → 两个灰点（两写面或聚合）
    act(() => {
      useReaderStore.getState().clearTabDirty('p-1')
      useNotesStore.setState({
        noteByPaper: { 'p-2': { title: '', contentMd: 'x', saving: false, savedAt: null, pending: true } }
      })
    })
    expect(dirtyDots()).toHaveLength(1)
    // 全清：无灰点
    act(() => {
      useNotesStore.setState({ noteByPaper: {} })
    })
    expect(dirtyDots()).toHaveLength(0)
  })

  it('关闭确认：dirty tab 取消不放行（confirm false→不关）；确认放行', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    mountWith({
      tabs: { 'p-1': makeTab('p-1', { fileName: '甲.pdf' }), 'p-2': makeTab('p-2') },
      order: ['p-1', 'p-2'],
      activeId: 'p-1'
    })
    act(() => {
      useReaderStore.getState().markTabDirty('p-1')
    })
    act(() => {
      closeButtons()[0]?.click()
    })
    // 取消：p-1 未被关闭
    expect(confirmSpy).toHaveBeenCalledTimes(1)
    expect(useReaderStore.getState().tabs['p-1']).toBeDefined()
    // 确认：关闭落地
    confirmSpy.mockReturnValue(true)
    act(() => {
      closeButtons()[0]?.click()
    })
    expect(useReaderStore.getState().tabs['p-1']).toBeUndefined()
  })

  it('关闭确认：clean tab 直接关（不弹窗）', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    mountWith({
      tabs: { 'p-1': makeTab('p-1'), 'p-2': makeTab('p-2') },
      order: ['p-1', 'p-2'],
      activeId: 'p-1'
    })
    act(() => {
      closeButtons()[0]?.click()
    })
    expect(confirmSpy).not.toHaveBeenCalled()
    expect(useReaderStore.getState().tabs['p-1']).toBeUndefined()
  })
})

// ── 缺陷②回归（2026-08-27 用户视检，always-active——不经 guardedDescribe）──
// 关闭脏 tab 确认文案的标题与 TabBar 同型：title 优先（fileName 为内容寻址
// 哈希基名不可读）；空 title 兜底 fileName 去扩展名
it('confirmCloseDirty 文案标题=title 优先（哈希 fileName 不入文案）；空 title 兜底 fileName 去扩展名', () => {
  const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
  useReaderStore.setState({
    tabs: {
      'p-1': makeTab('p-1', { title: '深度学习综述', fileName: 'a3f9c2e1b0d4f5.pdf' }),
      'p-2': makeTab('p-2', { title: '', fileName: 'b8e7d6c5a4f3.pdf' })
    },
    order: ['p-1', 'p-2'],
    activeId: 'p-1'
  })
  useReaderStore.getState().markTabDirty('p-1')
  useReaderStore.getState().markTabDirty('p-2')
  expect(confirmCloseDirty('p-1')).toBe(false)
  expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining('深度学习综述'))
  expect(confirmSpy).toHaveBeenCalledWith(expect.not.stringContaining('a3f9c2e1b0d4f5'))
  expect(confirmCloseDirty('p-2')).toBe(false)
  expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining('b8e7d6c5a4f3'))
  confirmSpy.mockRestore()
})
