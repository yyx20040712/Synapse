// @vitest-environment jsdom
/**
 * [F-VISFB-14] 关 tab flush-first 测试（新建，always-active）。
 *
 * 锁链（C-A3 翻案落法+d1 W4②③）：
 * - flush-first：dirty 关 tab 先存最新值，成功才关闭（零弹窗）——旧「必弹窗
 *   丢弃」路径翻案；
 * - 失败分支：不自动关闭→confirmCloseDirty 显式放弃路径（确认=discard+关/
 *   取消=保持+failed 四态钮可见）；
 * - 关 tab 异步重入锁：连点关闭叉第二击忽略（单 flush）；
 * - TabBar 装配：关闭叉/Delete 双位经 requestCloseTab（异步收口）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub } from '../../utils/api-client-mock'
import { makeAnnotation, makeTab } from '../../utils/factories'
import { requestCloseTab, switchTabFlushFirst } from '../../../src/renderer/features/reader/state/tab-dirty'
import { TabBar } from '../../../src/renderer/features/reader/view/TabBar'
import { useReaderStore } from '../../../src/renderer/features/reader/state/reader.store'
import { useNotesStore } from '../../../src/renderer/features/notes/notes.store'
import { runQuitFlush } from '../../../src/renderer/app/quit-flush'
import {
  hasPendingAnnotationDrafts,
  saveAnnotationDraft,
  takeAnnotationDraft
} from '../../../src/renderer/features/reader/interact/annotation-draft-registry'
import type { TabState } from '../../../src/renderer/features/reader/state/reader.store'

const mocks = vi.hoisted(() => ({
  notesGet: vi.fn(),
  notesSave: vi.fn()
}))
makeApiStub({ notes: { get: mocks.notesGet, save: mocks.notesSave } })

let root: Root | null = null
let host: HTMLDivElement | null = null

/** 微任务排空（async 链逐跳） */
async function drain(turns = 30): Promise<void> {
  for (let i = 0; i < turns; i++) await Promise.resolve()
}

const noteResult = (paperId: string, contentMd: string) => ({
  ok: true as const,
  data: { id: `n-${paperId}`, paperId, contentMd, createdAt: 't0', updatedAt: 't1' }
})

/** 非门控 dirty 篇（loadedOnce 后 edit） */
async function seedDirtyNote(paperId: string, content: string): Promise<void> {
  mocks.notesGet.mockResolvedValueOnce(noteResult(paperId, '基线'))
  await useNotesStore.getState().load(paperId)
  useNotesStore.getState().edit(paperId, { contentMd: content })
}

function mountTabBar(tabs: Record<string, TabState>, order: string[], activeId: string): void {
  useReaderStore.setState({ tabs, order, activeId })
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root?.render(<TabBar />)
  })
}

function closeButtons(): HTMLButtonElement[] {
  return [...(host?.querySelectorAll<HTMLButtonElement>('[aria-label^="关闭"]') ?? [])]
}

beforeEach(() => {
  vi.restoreAllMocks()
  vi.clearAllMocks()
  // [回炉 W-6 同型] Once 实现队列逐用例 reset（clearAllMocks 不清 once 队列）
  mocks.notesGet.mockReset()
  mocks.notesSave.mockReset()
  for (const k of Object.keys(useNotesStore.getState().noteByPaper)) {
    useNotesStore.getState().discardPendingEdit(k)
  }
  useNotesStore.setState({ noteByPaper: {} })
  useReaderStore.setState({ tabs: {}, order: [], activeId: null })
})

describe('close-tab-flush —— 关 tab flush-first（F-VISFB-14）', () => {
  it('clean 直通：true+零弹窗零写（discard 幂等收口沿承）', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    useReaderStore.setState({
      tabs: { 'pc-1': makeTab('pc-1') },
      order: ['pc-1'],
      activeId: 'pc-1'
    })
    await expect(requestCloseTab('pc-1')).resolves.toBe(true)
    expect(confirmSpy).not.toHaveBeenCalled()
    expect(mocks.notesSave).not.toHaveBeenCalled()
  })

  it('C-A3 翻案核心：普通 dirty → 先存最新值成功 → 关闭且零弹窗', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    useReaderStore.setState({
      tabs: { 'pc-2': makeTab('pc-2', { fileName: '论文乙.pdf' }) },
      order: ['pc-2'],
      activeId: 'pc-2'
    })
    await seedDirtyNote('pc-2', '最新草稿')
    mocks.notesSave.mockResolvedValueOnce(noteResult('pc-2', '最新草稿'))
    await expect(requestCloseTab('pc-2')).resolves.toBe(true)
    expect(mocks.notesSave).toHaveBeenCalledTimes(1)
    expect(mocks.notesSave).toHaveBeenCalledWith({ paperId: 'pc-2', contentMd: '最新草稿' })
    expect(confirmSpy).not.toHaveBeenCalled()
    expect(useNotesStore.getState().noteByPaper['pc-2']?.pending).toBe(false)
  })

  it('flush 失败×取消：不关闭+failed 呈现（saveFailed 置位、草稿保留）', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    useReaderStore.setState({
      tabs: { 'pc-3': makeTab('pc-3', { fileName: '论文丙.pdf' }) },
      order: ['pc-3'],
      activeId: 'pc-3'
    })
    await seedDirtyNote('pc-3', '会失败')
    mocks.notesSave.mockResolvedValueOnce({ ok: false as const, error: { code: 'E', message: '写失败' } })
    await expect(requestCloseTab('pc-3')).resolves.toBe(false)
    expect(confirmSpy).toHaveBeenCalledTimes(1)
    expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining('论文丙'))
    const draft = useNotesStore.getState().noteByPaper['pc-3']
    expect(draft?.saveFailed).toBe(true)
    expect(draft?.contentMd).toBe('会失败')
  })

  it('flush 失败×确认放弃：discard 收口+关闭（显式放弃路径保留）', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    useReaderStore.setState({
      tabs: { 'pc-4': makeTab('pc-4') },
      order: ['pc-4'],
      activeId: 'pc-4'
    })
    await seedDirtyNote('pc-4', '放弃我')
    mocks.notesSave.mockResolvedValueOnce({ ok: false as const, error: { code: 'E', message: '写失败' } })
    await expect(requestCloseTab('pc-4')).resolves.toBe(true)
    expect(confirmSpy).toHaveBeenCalledTimes(1)
    expect(useNotesStore.getState().noteByPaper['pc-4']).toBeUndefined()
  })

  it('annotations 面残留（TabState.dirty，无 notes 面）：无自动存路径→confirm 显式放弃承接', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    useReaderStore.setState({
      tabs: { 'pc-5': makeTab('pc-5') },
      order: ['pc-5'],
      activeId: 'pc-5'
    })
    useReaderStore.getState().markTabDirty('pc-5')
    await expect(requestCloseTab('pc-5')).resolves.toBe(true)
    expect(confirmSpy).toHaveBeenCalledTimes(1)
    expect(mocks.notesSave).not.toHaveBeenCalled()
  })

  it('首载门控 dirty：零写派发→confirm 路径（取消=保持不弃改）', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    useReaderStore.setState({
      tabs: { 'pc-6': makeTab('pc-6') },
      order: ['pc-6'],
      activeId: 'pc-6'
    })
    useNotesStore.getState().edit('pc-6', { contentMd: '门控草稿' })
    await expect(requestCloseTab('pc-6')).resolves.toBe(false)
    expect(mocks.notesSave).not.toHaveBeenCalled()
    expect(confirmSpy).toHaveBeenCalledTimes(1)
    expect(useNotesStore.getState().noteByPaper['pc-6']?.contentMd).toBe('门控草稿')
  })

  it('重入锁（d1 W4②）：flush 在途时第二击立即 false 且零二次写', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    useReaderStore.setState({
      tabs: { 'pc-7': makeTab('pc-7') },
      order: ['pc-7'],
      activeId: 'pc-7'
    })
    await seedDirtyNote('pc-7', '慢写')
    let resolveSave!: (v: ReturnType<typeof noteResult>) => void
    mocks.notesSave.mockImplementationOnce(
      () => new Promise((r) => { resolveSave = r as typeof resolveSave })
    )
    const first = requestCloseTab('pc-7')
    await drain()
    await expect(requestCloseTab('pc-7')).resolves.toBe(false)
    expect(mocks.notesSave).toHaveBeenCalledTimes(1)
    resolveSave(noteResult('pc-7', '慢写'))
    await expect(first).resolves.toBe(true)
    expect(mocks.notesSave).toHaveBeenCalledTimes(1)
  })

  it('TabBar 装配：dirty tab 点关闭叉→flush 成功后关闭（异步收口）', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    mountTabBar(
      { 'pc-8': makeTab('pc-8', { fileName: '论文八.pdf' }), 'pc-9': makeTab('pc-9') },
      ['pc-8', 'pc-9'],
      'pc-8'
    )
    await seedDirtyNote('pc-8', '集成草稿')
    mocks.notesSave.mockResolvedValueOnce(noteResult('pc-8', '集成草稿'))
    await act(async () => {
      closeButtons()[0]?.click()
      await drain()
    })
    expect(useReaderStore.getState().tabs['pc-8']).toBeUndefined()
    expect(useReaderStore.getState().order).toEqual(['pc-9'])
  })

  it('TabBar 连点：flush 在途时第二次点击忽略（单写单关）', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    mountTabBar(
      { 'pc-10': makeTab('pc-10'), 'pc-11': makeTab('pc-11') },
      ['pc-10', 'pc-11'],
      'pc-10'
    )
    await seedDirtyNote('pc-10', '连点')
    let resolveSave!: (v: ReturnType<typeof noteResult>) => void
    mocks.notesSave.mockImplementationOnce(
      () => new Promise((r) => { resolveSave = r as typeof resolveSave })
    )
    await act(async () => {
      closeButtons()[0]?.click()
      await drain(5)
      closeButtons()[0]?.click()
      await drain(5)
    })
    expect(mocks.notesSave).toHaveBeenCalledTimes(1)
    await act(async () => {
      resolveSave(noteResult('pc-10', '连点'))
      await drain()
    })
    expect(useReaderStore.getState().tabs['pc-10']).toBeUndefined()
  })

  it('[回炉 B-1] 切 tab flush-first：dirty notes（600s 防抖在排态）×switchTabFlushFirst→立即写最新值+切回不丢', async () => {
    useReaderStore.setState({
      tabs: { 'ps-1': makeTab('ps-1'), 'ps-2': makeTab('ps-2') },
      order: ['ps-1', 'ps-2'],
      activeId: 'ps-1'
    })
    await seedDirtyNote('ps-1', '切走前最新值')
    // 防抖在排（600s 真实 timer——本用例内永不触发；立存不得依赖 timer 通道）
    useNotesStore.getState().saveSoon('ps-1')
    mocks.notesSave.mockResolvedValueOnce(noteResult('ps-1', '切走前最新值'))
    switchTabFlushFirst('ps-2')
    expect(useReaderStore.getState().activeId).toBe('ps-2')
    await drain()
    expect(mocks.notesSave).toHaveBeenCalledTimes(1)
    expect(mocks.notesSave).toHaveBeenCalledWith({ paperId: 'ps-1', contentMd: '切走前最新值' })
    // 切回不丢：store 草稿驻留+pending 清（最新值已落库）
    const draft = useNotesStore.getState().noteByPaper['ps-1']
    expect(draft?.contentMd).toBe('切走前最新值')
    expect(draft?.pending).toBe(false)
  })

  it('[回炉 B-1] TabBar 装配：点击他 tab→离场篇立存（fire-first 不阻切换）', async () => {
    mountTabBar(
      { 'ps-3': makeTab('ps-3', { fileName: '论文三.pdf' }), 'ps-4': makeTab('ps-4') },
      ['ps-3', 'ps-4'],
      'ps-3'
    )
    await seedDirtyNote('ps-3', '离场草稿')
    mocks.notesSave.mockResolvedValueOnce(noteResult('ps-3', '离场草稿'))
    await act(async () => {
      tabItems()[1]?.click()
      await drain()
    })
    expect(useReaderStore.getState().activeId).toBe('ps-4')
    expect(mocks.notesSave).toHaveBeenCalledWith({ paperId: 'ps-3', contentMd: '离场草稿' })
  })

  it('[回炉 B-1] flushNow rejection：切换不抛不阻（unhandled 零）+灰点保留', async () => {
    useReaderStore.setState({
      tabs: { 'ps-5': makeTab('ps-5'), 'ps-6': makeTab('ps-6') },
      order: ['ps-5', 'ps-6'],
      activeId: 'ps-5'
    })
    await seedDirtyNote('ps-5', '会失败')
    mocks.notesSave.mockImplementationOnce(() => {
      throw new Error('sync boom')
    })
    expect(() => switchTabFlushFirst('ps-6')).not.toThrow()
    expect(useReaderStore.getState().activeId).toBe('ps-6')
    await drain()
    expect(useNotesStore.getState().noteByPaper['ps-5']?.pending).toBe(true)
  })

  it('[回炉 W-3] 确认放弃=完整弃改：批注注册表残留随篇清（重挂载不复活+退出判定不残留）', async () => {
    const anno = makeAnnotation('批注残留')
    useReaderStore.setState({
      tabs: { 'pw-3': makeTab('pw-3', { annotations: [anno] }) },
      order: ['pw-3'],
      activeId: 'pw-3'
    })
    saveAnnotationDraft(anno.id, '残留草稿', true)
    expect(hasPendingAnnotationDrafts()).toBe(true)
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    useReaderStore.getState().markTabDirty('pw-3')
    await expect(requestCloseTab('pw-3')).resolves.toBe(true)
    // 注册表按篇清空：无残留、重挂载不复活（take=null）
    expect(hasPendingAnnotationDrafts()).toBe(false)
    expect(takeAnnotationDraft(anno.id)).toBeNull()
    // 真实接线尾：确认放弃后 TabBar 落 closeTab（tab 移除）→退出判定不残留
    useReaderStore.getState().closeTab('pw-3')
    await expect(runQuitFlush()).resolves.toBe(false)
  })

  it('[回炉 W-4] flushNow rejection→显式放弃路径（confirm 承接，不未处理 rejection）', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    useReaderStore.setState({
      tabs: { 'pw-4': makeTab('pw-4') },
      order: ['pw-4'],
      activeId: 'pw-4'
    })
    await seedDirtyNote('pw-4', '同步抛稿')
    mocks.notesSave.mockImplementationOnce(() => {
      throw new Error('sync boom')
    })
    await expect(requestCloseTab('pw-4')).resolves.toBe(true)
    expect(confirmSpy).toHaveBeenCalledTimes(1)
    expect(useNotesStore.getState().noteByPaper['pw-4']).toBeUndefined()
  })
})

/** tab 项节点（[回炉 B-1] TabBar 切换装配用例消费） */
function tabItems(): HTMLElement[] {
  return [...(host?.querySelectorAll<HTMLElement>('[role="tab"]') ?? [])]
}

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  host?.remove()
  root = null
  host = null
})
