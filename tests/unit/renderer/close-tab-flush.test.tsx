// @vitest-environment jsdom
/**
 * [F-VISFB-14→B4-A R2 §2.5 #24-#29/§10.2] 关 tab closing 状态机测试
 * （R2 迁移：普通 dirty 成功且 U=1 从零弹窗改指定二选；flush 失败=真实错误+
 * 重试/留下——旧「确认放弃」路径删除（:140-165,298-332 语义翻案））。
 *
 * 锁链：
 * - clean/U0 直通（零弹窗零写）；dirty 先存最新值——成功且 U=0 关闭零弹窗；
 * - 成功且 U=1 → confirm 相二选（冻结文案）：是=关/否=留（栈 U 原样）；
 * - flush 失败 → error 相（冻结文案含真实原因）：重试成功→按 U 分流；留下→
 *   不关闭不弃改；
 * - 重入（#24）：flush 在途第二击=同一在途关闭 promise（身份相同、单次写、
 *   同一终态——审查阻断 4：旧断言「第二击立即 false」锁的是未返回同一 promise
 *   的缺陷行为，按 §2.5 #24 改断）；
 * - TabBar 装配（关闭叉/Delete 经 requestCloseTab；CloseTabDialogHost 呈现）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub } from '../../utils/api-client-mock'
import { makeAnnotation, makeTab } from '../../utils/factories'
import { requestCloseTab, chooseCloseTabDecision } from '../../../src/renderer/features/reader/state/reader-close-tab'
import { CLOSE_TAB_CONFIRM_TEXT, CloseTabDialogHost, closeTabErrorText } from '../../../src/renderer/features/reader/view/CloseTabDialogHost'
import { TabBar } from '../../../src/renderer/features/reader/view/TabBar'
import { AnnotationPopups } from '../../../src/renderer/features/reader/view/AnnotationPopups'
import { useReaderStore } from '../../../src/renderer/features/reader/state/reader.store'
import { useNotesStore } from '../../../src/renderer/features/notes/notes.store'
import {
  hasPendingAnnotationDrafts,
  registerDraftFlush,
  saveAnnotationDraft,
  takeAnnotationDraft,
  unregisterDraftFlush
} from '../../../src/renderer/features/reader/interact/annotation-draft-registry'
import type { TabState } from '../../../src/renderer/features/reader/state/reader.store'
import type { AnnotationRect } from '../../../src/shared/models/annotation'

const mocks = vi.hoisted(() => ({
  notesGet: vi.fn(),
  notesSave: vi.fn(),
  annoUpdate: vi.fn()
}))
makeApiStub({
  notes: { get: mocks.notesGet, save: mocks.notesSave },
  reader: { updateAnnotation: mocks.annoUpdate }
})

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

function dialogText(): string {
  return document.querySelector('[role="dialog"]')?.textContent ?? ''
}

beforeEach(() => {
  vi.restoreAllMocks()
  vi.clearAllMocks()
  mocks.notesGet.mockReset()
  mocks.notesSave.mockReset()
  mocks.annoUpdate.mockReset()
  // notes 编辑态清扫（弃改 API 退役——测试隔离锚）
  useNotesStore.getState().resetEditStateForTests()
  useReaderStore.setState({ tabs: {}, order: [], activeId: null })
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  host?.remove()
  root = null
  host = null
})

describe('close-tab-flush —— 关 tab closing 状态机（B4-A R2 §2.5 #24-#29）', () => {
  it('clean/U0 直通：true+零弹窗零写（#25）', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm')
    useReaderStore.setState({
      tabs: { 'pc-1': makeTab('pc-1') },
      order: ['pc-1'],
      activeId: 'pc-1'
    })
    await expect(requestCloseTab('pc-1')).resolves.toBe(true)
    expect(confirmSpy).not.toHaveBeenCalled()
    expect(mocks.notesSave).not.toHaveBeenCalled()
    expect(useReaderStore.getState().tabs['pc-1']?.closing?.phase ?? 'none').toBe('none')
  })

  it('普通 dirty 落库成功且 U=0：关闭且零弹窗（旧「必弹窗」路径翻案沿承）', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm')
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

  it('#26/#27/#28 成功且 U=1：confirm 相冻结二选——是=放行；否=留下（U/栈原样）', async () => {
    useReaderStore.setState({
      tabs: { 'pc-u': makeTab('pc-u') },
      order: ['pc-u'],
      activeId: 'pc-u'
    })
    await seedDirtyNote('pc-u', '草稿')
    mocks.notesSave.mockResolvedValueOnce(noteResult('pc-u', '草稿'))
    useReaderStore.getState().markTabUnfinalized('pc-u')
    const closing = requestCloseTab('pc-u')
    await drain()
    // confirm 相就位（挂起等待决策）；TabBar 宿主渲染冻结文案
    expect(useReaderStore.getState().tabs['pc-u']?.closing?.phase).toBe('confirm')
    mountDialogHostProbe()
    // 冻结文案逐字锚（字面量——不引常量防同义反复；主控冻结 §10.2）
    expect(dialogText()).toContain('当前文件未被标记为已保存，是否确认关闭？')
    expect(dialogText()).toContain(CLOSE_TAB_CONFIRM_TEXT)
    // 否：留下（#28）——U/栈原样、tab 不移除语义由调用方承接（返回 false）
    chooseCloseTabDecision('pc-u', false)
    await expect(closing).resolves.toBe(false)
    expect(useReaderStore.getState().tabs['pc-u']?.unfinalized).toBe(true)
    expect(useReaderStore.getState().tabs['pc-u']?.closing?.phase ?? 'none').toBe('none')
    // 是：放行（#27——清史接缝归调用方 closeTab）
    mocks.notesSave.mockClear()
    const closing2 = requestCloseTab('pc-u')
    await drain()
    expect(useReaderStore.getState().tabs['pc-u']?.closing?.phase).toBe('confirm')
    chooseCloseTabDecision('pc-u', true)
    await expect(closing2).resolves.toBe(true)
  })

  it('#29 flush 失败：error 相真实错误+重试/留下——留下=不关闭不弃改（弃改路径删除）', async () => {
    useReaderStore.setState({
      tabs: { 'pc-3': makeTab('pc-3', { fileName: '论文丙.pdf' }) },
      order: ['pc-3'],
      activeId: 'pc-3'
    })
    await seedDirtyNote('pc-3', '会失败')
    mocks.notesSave.mockResolvedValueOnce({ ok: false as const, error: { code: 'E', message: '写失败' } })
    const closing = requestCloseTab('pc-3')
    await drain()
    expect(useReaderStore.getState().tabs['pc-3']?.closing?.phase).toBe('error')
    expect(useReaderStore.getState().tabs['pc-3']?.closing?.error).toBe('笔记保存失败')
    mountDialogHostProbe()
    expect(dialogText()).toContain('有修改未能落库：笔记保存失败。请重试保存后再关闭。')
    expect(dialogText()).toContain(closeTabErrorText('笔记保存失败'))
    // 留下：草稿保留、不关闭
    chooseCloseTabDecision('pc-3', false)
    await expect(closing).resolves.toBe(false)
    const draft = useNotesStore.getState().noteByPaper['pc-3']
    expect(draft?.saveFailed).toBe(true)
    expect(draft?.contentMd).toBe('会失败')
    expect(useReaderStore.getState().tabs['pc-3']).toBeDefined()
  })

  it('#29 重试：失败→重试成功→按 U 分流（U=0 关闭）', async () => {
    useReaderStore.setState({
      tabs: { 'pc-4': makeTab('pc-4') },
      order: ['pc-4'],
      activeId: 'pc-4'
    })
    await seedDirtyNote('pc-4', '先败后成')
    mocks.notesSave
      .mockResolvedValueOnce({ ok: false as const, error: { code: 'E', message: '写失败' } })
      .mockResolvedValueOnce(noteResult('pc-4', '先败后成'))
    const closing = requestCloseTab('pc-4')
    await drain()
    expect(useReaderStore.getState().tabs['pc-4']?.closing?.phase).toBe('error')
    chooseCloseTabDecision('pc-4', 'retry')
    await drain()
    // 重试成功且 U=0 → 直接关闭
    await expect(closing).resolves.toBe(true)
    expect(mocks.notesSave).toHaveBeenCalledTimes(2)
    expect(useNotesStore.getState().noteByPaper['pc-4']?.pending).toBe(false)
  })

  it('annotations 面残留（TabState.dirty，无自动存路径）：error 相承接（旧 confirm 放弃路径删除）', async () => {
    useReaderStore.setState({
      tabs: { 'pc-5': makeTab('pc-5') },
      order: ['pc-5'],
      activeId: 'pc-5'
    })
    useReaderStore.getState().markTabDirty('pc-5')
    const closing = requestCloseTab('pc-5')
    await drain()
    expect(useReaderStore.getState().tabs['pc-5']?.closing?.phase).toBe('error')
    expect(useReaderStore.getState().tabs['pc-5']?.closing?.error).toBe('标注写失败')
    chooseCloseTabDecision('pc-5', false)
    await expect(closing).resolves.toBe(false)
    expect(mocks.notesSave).not.toHaveBeenCalled()
  })

  it('首载门控 dirty：零写派发→error 相（留下=保持不弃改）', async () => {
    useReaderStore.setState({
      tabs: { 'pc-6': makeTab('pc-6') },
      order: ['pc-6'],
      activeId: 'pc-6'
    })
    useNotesStore.getState().edit('pc-6', { contentMd: '门控草稿' })
    const closing = requestCloseTab('pc-6')
    await drain()
    expect(useReaderStore.getState().tabs['pc-6']?.closing?.phase).toBe('error')
    expect(mocks.notesSave).not.toHaveBeenCalled()
    chooseCloseTabDecision('pc-6', false)
    await expect(closing).resolves.toBe(false)
    expect(useNotesStore.getState().noteByPaper['pc-6']?.contentMd).toBe('门控草稿')
  })

  it('重入（#24）：flush 在途时第二击返回同一关闭 promise——身份相同、单次写入、同一终态', async () => {
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
    const second = requestCloseTab('pc-7')
    // 同一在途关闭 promise（对象身份——§2.5 #24「重入只返回同一关闭 promise，不二次写」）
    expect(second).toBe(first)
    expect(mocks.notesSave).toHaveBeenCalledTimes(1)
    // 同一终态：两个引用随同一次关闭流程兑现；收口写恰一次
    resolveSave(noteResult('pc-7', '慢写'))
    await expect(first).resolves.toBe(true)
    expect(await second).toBe(true)
    expect(mocks.notesSave).toHaveBeenCalledTimes(1)
  })

  it('TabBar 装配：U=1 关闭叉→confirm Dialog 点「是」→tab 移除', async () => {
    mountTabBar(
      { 'pc-8': makeTab('pc-8', { fileName: '论文八.pdf' }), 'pc-9': makeTab('pc-9') },
      ['pc-8', 'pc-9'],
      'pc-8'
    )
    useReaderStore.getState().markTabUnfinalized('pc-8')
    await act(async () => {
      closeButtons()[0]?.click()
      await drain()
    })
    // 二选 Dialog 呈现（TabBar 内 CloseTabDialogHost；冻结文案逐字锚）
    expect(dialogText()).toContain('当前文件未被标记为已保存，是否确认关闭？')
    const yes = host?.querySelector<HTMLButtonElement>('[data-testid="close-tab-confirm-yes"]')
    expect(yes).not.toBeNull()
    await act(async () => {
      yes?.click()
      await drain()
    })
    expect(useReaderStore.getState().tabs['pc-8']).toBeUndefined()
    expect(useReaderStore.getState().order).toEqual(['pc-9'])
  })

  it('TabBar 装配：flush 失败→error Dialog 点「留在当前 tab」→不移除', async () => {
    mountTabBar(
      { 'pc-10': makeTab('pc-10'), 'pc-11': makeTab('pc-11') },
      ['pc-10', 'pc-11'],
      'pc-10'
    )
    await seedDirtyNote('pc-10', '连点')
    mocks.notesSave.mockResolvedValueOnce({ ok: false as const, error: { code: 'E', message: '写失败' } })
    await act(async () => {
      closeButtons()[0]?.click()
      await drain()
    })
    expect(dialogText()).toContain('有修改未能落库：笔记保存失败。请重试保存后再关闭。')
    await act(async () => {
      // error Dialog 次钮=留在当前 tab（actions 区第一个 button 为否/留下位）
      const stay = [...(host?.querySelectorAll<HTMLButtonElement>('[role="dialog"] button') ?? [])].find(
        (b) => b.textContent === '留在当前 tab'
      )
      stay?.click()
      await drain()
    })
    expect(useReaderStore.getState().tabs['pc-10']).toBeDefined()
  })

  it('TabBar 连点：flush 在途时第二次点击忽略（单写单关）', async () => {
    mountTabBar(
      { 'pc-12': makeTab('pc-12'), 'pc-13': makeTab('pc-13') },
      ['pc-12', 'pc-13'],
      'pc-12'
    )
    await seedDirtyNote('pc-12', '连点')
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
      resolveSave(noteResult('pc-12', '连点'))
      await drain()
    })
    expect(useReaderStore.getState().tabs['pc-12']).toBeUndefined()
  })

  it('[回炉 B-1] 切 tab flush-first：dirty notes 防抖在排态×switchTabFlushFirst→立即写最新值+切回不丢', async () => {
    const { switchTabFlushFirst } = await import('../../../src/renderer/features/reader/state/tab-dirty')
    useReaderStore.setState({
      tabs: { 'ps-1': makeTab('ps-1'), 'ps-2': makeTab('ps-2') },
      order: ['ps-1', 'ps-2'],
      activeId: 'ps-1'
    })
    await seedDirtyNote('ps-1', '切走前最新值')
    // 防抖在排（1.5s 真实 timer——本用例内永不触发；立存不得依赖 timer 通道）
    useNotesStore.getState().saveSoon('ps-1')
    mocks.notesSave.mockResolvedValueOnce(noteResult('ps-1', '切走前最新值'))
    switchTabFlushFirst('ps-2')
    expect(useReaderStore.getState().activeId).toBe('ps-2')
    await drain()
    expect(mocks.notesSave).toHaveBeenCalledTimes(1)
    expect(mocks.notesSave).toHaveBeenCalledWith({ paperId: 'ps-1', contentMd: '切走前最新值' })
    const draft = useNotesStore.getState().noteByPaper['ps-1']
    expect(draft?.contentMd).toBe('切走前最新值')
    expect(draft?.pending).toBe(false)
  })

  it('[回炉 W-3 迁移] error 相留下=零弃改：注册表残留保留（重挂载恢复面不丢）', async () => {
    const anno = makeAnnotation('批注残留')
    useReaderStore.setState({
      tabs: { 'pw-3': makeTab('pw-3', { annotations: [anno] }) },
      order: ['pw-3'],
      activeId: 'pw-3'
    })
    saveAnnotationDraft(anno.id, '残留草稿', true)
    expect(hasPendingAnnotationDrafts()).toBe(true)
    useReaderStore.getState().markTabDirty('pw-3')
    const closing = requestCloseTab('pw-3')
    await drain()
    expect(useReaderStore.getState().tabs['pw-3']?.closing?.phase).toBe('error')
    chooseCloseTabDecision('pw-3', false)
    await expect(closing).resolves.toBe(false)
    // 留下=不弃改：注册表条目保留（take 消费后回填——恢复面在场）
    expect(hasPendingAnnotationDrafts()).toBe(true)
    expect(takeAnnotationDraft(anno.id)?.comment).toBe('残留草稿')
  })

  it('[回炉 W-4] flushNow rejection→error 相承接（不未处理 rejection）', async () => {
    useReaderStore.setState({
      tabs: { 'pw-4': makeTab('pw-4') },
      order: ['pw-4'],
      activeId: 'pw-4'
    })
    await seedDirtyNote('pw-4', '同步抛稿')
    mocks.notesSave.mockImplementationOnce(() => {
      throw new Error('sync boom')
    })
    const closing = requestCloseTab('pw-4')
    await drain()
    expect(useReaderStore.getState().tabs['pw-4']?.closing?.phase).toBe('error')
    chooseCloseTabDecision('pw-4', false)
    await expect(closing).resolves.toBe(false)
  })
})

describe('F-VISFB-15 ①面1/面2 —— 切 tab fire-first / 关 ACTIVE tab await 挂载句柄', () => {
  it('①面1 切 tab：离场篇挂载句柄 fire-first 消费（不阻切换——activeId 同步已变）', async () => {
    const { switchTabFlushFirst } = await import('../../../src/renderer/features/reader/state/tab-dirty')
    useReaderStore.setState({
      tabs: { 'p15-e': makeTab('p15-e'), 'p15-f': makeTab('p15-f') },
      order: ['p15-e', 'p15-f'],
      activeId: 'p15-e'
    })
    const flush = vi.fn(async () => 'saved' as const)
    registerDraftFlush('anno-p15e', flush)
    try {
      switchTabFlushFirst('p15-f')
      expect(useReaderStore.getState().activeId).toBe('p15-f')
      await drain()
      expect(flush).toHaveBeenCalledTimes(1)
    } finally {
      unregisterDraftFlush('anno-p15e')
    }
  })

  it('①面2 ACTIVE tab clean 两写面：挂载句柄 un-attempted dirty→await 立存→U=0 关闭 true 零弹窗', async () => {
    useReaderStore.setState({
      tabs: { 'p15-a': makeTab('p15-a') },
      order: ['p15-a'],
      activeId: 'p15-a'
    })
    const flush = vi.fn(async () => 'saved' as const)
    registerDraftFlush('anno-p15a', flush)
    try {
      await expect(requestCloseTab('p15-a')).resolves.toBe(true)
      expect(flush).toHaveBeenCalledTimes(1)
    } finally {
      unregisterDraftFlush('anno-p15a')
    }
  })

  it('①面2 句柄 failed 终态：error 相承接（TabState.dirty 置位——IO 失败残留单源）', async () => {
    useReaderStore.setState({
      tabs: { 'p15-b': makeTab('p15-b') },
      order: ['p15-b'],
      activeId: 'p15-b'
    })
    registerDraftFlush('anno-p15b', vi.fn(async () => 'failed' as const))
    try {
      const closing = requestCloseTab('p15-b')
      await drain()
      expect(useReaderStore.getState().tabs['p15-b']?.closing?.phase).toBe('error')
      expect(useReaderStore.getState().tabs['p15-b']?.dirty).toBe(true)
      chooseCloseTabDecision('p15-b', false)
      await expect(closing).resolves.toBe(false)
    } finally {
      unregisterDraftFlush('anno-p15b')
    }
  })

  it('①面2 关非活动 tab：活动篇挂载句柄不被消费不误入仍脏（clean 直通零弹窗）', async () => {
    useReaderStore.setState({
      tabs: { 'p15-c': makeTab('p15-c'), 'p15-d': makeTab('p15-d') },
      order: ['p15-c', 'p15-d'],
      activeId: 'p15-c'
    })
    const flush = vi.fn(async () => 'failed' as const)
    registerDraftFlush('anno-p15c', flush)
    try {
      await expect(requestCloseTab('p15-d')).resolves.toBe(true)
      expect(flush).not.toHaveBeenCalled()
    } finally {
      unregisterDraftFlush('anno-p15c')
    }
  })

  it('①面2 集成：挂载编辑器 un-attempted dirty（<1.5s 窗内值）→关 ACTIVE tab→值经句柄立存（U=1 走二选）', async () => {
    const RECT: AnnotationRect = { page: 0, x: 0.1, y: 0.2, w: 0.3, h: 0.05 }
    const anno = { ...makeAnnotation(''), id: 'anno-p15g', paperId: 'p15-g' }
    useReaderStore.setState({
      tabs: { 'p15-g': makeTab('p15-g', { annotations: [anno] }) },
      order: ['p15-g'],
      activeId: 'p15-g'
    })
    mocks.annoUpdate.mockResolvedValue({ ok: true, data: { ...anno, comment: '窗内值' } })
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    act(() => {
      root?.render(
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
    const ta = host.querySelector('textarea') as HTMLTextAreaElement
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
    act(() => {
      setter?.call(ta, '窗内值')
      ta.dispatchEvent(new Event('input', { bubbles: true }))
    })
    // 不推进 1.5s——un-attempted（防抖窗内值，两写面信号净）；输入已置 U（R2）
    expect(useReaderStore.getState().tabs['p15-g']?.unfinalized).toBe(true)
    const closing = requestCloseTab('p15-g')
    await drain()
    expect(mocks.annoUpdate).toHaveBeenCalledTimes(1)
    expect(mocks.annoUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ annotation: expect.objectContaining({ comment: '窗内值' }) })
    )
    // U=1 → confirm 相；点「是」放行
    expect(useReaderStore.getState().tabs['p15-g']?.closing?.phase).toBe('confirm')
    chooseCloseTabDecision('p15-g', true)
    await expect(closing).resolves.toBe(true)
  })
})

/** confirm/error 相 Dialog 直挂（不经 TabBar——决策注入面用例共用） */
function mountDialogHostProbe(): void {
  const probeHost = document.createElement('div')
  document.body.appendChild(probeHost)
  const probeRoot = createRoot(probeHost)
  act(() => {
    probeRoot.render(<CloseTabDialogHost />)
  })
  probeRoots.push(probeRoot)
  probeHosts.push(probeHost)
}

const probeRoots: Array<Root> = []
const probeHosts: Array<HTMLElement> = []

afterEach(() => {
  for (const r of probeRoots.splice(0)) {
    act(() => {
      r.unmount()
    })
  }
  for (const h of probeHosts.splice(0)) {
    h.remove()
  }
})

/** tab 项节点（TabBar 装配用例消费） */
function tabItems(): HTMLElement[] {
  return [...(host?.querySelectorAll<HTMLElement>('[role="tab"]') ?? [])]
}
void tabItems
