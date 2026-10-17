// @vitest-environment jsdom
/**
 * [F-VISFB-14] renderer 退出收口序列测试（新建，always-active）。
 *
 * 锁链（INV-141 五要素跨格——退出握手禁把任一 Promise fulfilled 直接等同
 * 「最新值已落库」，一律收口后查态）：
 * - ①普通 dirty 转可等待立存（timer 通道不再承接退出面）；
 * - ②首载门控失败格呈现（gated 无写派发→残留 pending→仍脏→confirm 呈现）；
 * - ③收口后查草稿失败态（notes saveFailed/批注句柄 failed/注册表残留）；
 * - lineage 不旁路队列（save(): Promise<void> 正道——动作经 flush 派发）；
 * - 重启一致性（jsdom 持久化模拟：api 载荷=最新 textarea 文本）。
 * 模块态隔离：notes/lineage store 逐用例复位+pendingEdit 清扫；批注注册表
 * 模块级单例——各用例互异 id+显式回收（annotation-draft-flush 先例）。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { makeApiStub } from '../../utils/api-client-mock'
import { makeAnnotation, makeTab } from '../../utils/factories'
import type { LineageNode } from '../../../src/shared/models/lineage'
import type { Annotation, AnnotationRect } from '../../../src/shared/models/annotation'
import { runQuitFlush } from '../../../src/renderer/app/quit-flush'
import { useNotesStore } from '../../../src/renderer/features/notes/notes.store'
import { useReaderStore } from '../../../src/renderer/features/reader/state/reader.store'
import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'
import { AnnotationPopups } from '../../../src/renderer/features/reader/view/AnnotationPopups'
import {
  discardAnnotationDraft,
  registerDraftFlush,
  saveAnnotationDraft,
  unregisterDraftFlush
} from '../../../src/renderer/features/reader/interact/annotation-draft-registry'

const mocks = vi.hoisted(() => ({
  notesGet: vi.fn(),
  notesSave: vi.fn(),
  patchNode: vi.fn(),
  annoWrite: vi.fn(async () => ({ ok: true as const, data: null }))
}))
makeApiStub({
  notes: { get: mocks.notesGet, save: mocks.notesSave },
  lineage: { patchNode: mocks.patchNode },
  reader: { updateAnnotation: mocks.annoWrite }
})

/** 微任务排空（async 链逐跳——本面链深 ≤12） */
async function drain(turns = 30): Promise<void> {
  for (let i = 0; i < turns; i++) await Promise.resolve()
}

const noteResult = (paperId: string, contentMd: string) => ({
  ok: true as const,
  data: { id: `n-${paperId}`, paperId, contentMd, createdAt: 't0', updatedAt: 't1' }
})

const NODE: LineageNode = {
  id: 'n-1',
  paperId: 'qp-9',
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

/** 非门控 dirty 篇：load 成功（loadedOnce 打点）后 edit（pending 立起） */
async function seedDirtyNote(paperId: string, content: string): Promise<void> {
  mocks.notesGet.mockResolvedValueOnce(noteResult(paperId, '基线'))
  await useNotesStore.getState().load(paperId)
  useNotesStore.getState().edit(paperId, { contentMd: content })
}

beforeEach(() => {
  vi.clearAllMocks()
  // [回炉 W-6 m6 根因修] Once 实现队列跨用例残留（clearAllMocks 只清调用不
  // 清 once 队列——前用例未消费的 mockResolvedValueOnce 会错位消费本用例的
  // deferred 桩→变异下 TypeError 非断言红）：notes/lineage 三桩逐用例 reset
  mocks.notesGet.mockReset()
  mocks.notesSave.mockReset()
  mocks.patchNode.mockReset()
  for (const k of Object.keys(useNotesStore.getState().noteByPaper)) {
    useNotesStore.getState().discardPendingEdit(k)
  }
  useNotesStore.setState({ noteByPaper: {} })
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

describe('quit-flush —— renderer 收口序列（F-VISFB-14）', () => {
  it('①普通 dirty 转可等待立存：防抖窗内 pending → 立即写最新值一次 → 不再脏', async () => {
    await seedDirtyNote('qp-1', '最新值')
    mocks.notesSave.mockResolvedValueOnce(noteResult('qp-1', '最新值'))
    const stillDirty = await runQuitFlush()
    expect(mocks.notesSave).toHaveBeenCalledTimes(1)
    expect(mocks.notesSave).toHaveBeenCalledWith({ paperId: 'qp-1', contentMd: '最新值' })
    expect(stillDirty).toBe(false)
  })

  it('②首载门控失败格呈现：从未 load 的编辑→零写派发→仍脏（不把空 promise 等同已落库）', async () => {
    useNotesStore.getState().edit('qp-2', { contentMd: '门控草稿' })
    const stillDirty = await runQuitFlush()
    expect(mocks.notesSave).not.toHaveBeenCalled()
    expect(stillDirty).toBe(true)
    expect(useNotesStore.getState().noteByPaper['qp-2']?.pending).toBe(true)
  })

  it('③收口后查失败态：写失败→saveFailed 置位→仍脏（收口后查草稿失败态）', async () => {
    await seedDirtyNote('qp-3', '会失败')
    mocks.notesSave.mockResolvedValueOnce({ ok: false as const, error: { code: 'E', message: '写失败' } })
    const stillDirty = await runQuitFlush()
    expect(stillDirty).toBe(true)
    expect(useNotesStore.getState().noteByPaper['qp-3']?.saveFailed).toBe(true)
  })

  it('在途×新编辑跨格：等在途 settle→pending 合并态立存最新值→净', async () => {
    mocks.notesGet.mockResolvedValueOnce(noteResult('qp-4', '基线'))
    await useNotesStore.getState().load('qp-4')
    let resolveFirst!: (v: ReturnType<typeof noteResult>) => void
    mocks.notesSave
      .mockImplementationOnce(() => new Promise((r) => { resolveFirst = r as typeof resolveFirst }))
      .mockResolvedValueOnce(noteResult('qp-4', 'b'))
    useNotesStore.getState().edit('qp-4', { contentMd: 'a' })
    void useNotesStore.getState().saveNow('qp-4')
    useNotesStore.getState().edit('qp-4', { contentMd: 'b' })
    const quit = runQuitFlush()
    await drain()
    resolveFirst(noteResult('qp-4', 'a'))
    const stillDirty = await quit
    expect(mocks.notesSave).toHaveBeenCalledTimes(2)
    expect(mocks.notesSave).toHaveBeenLastCalledWith({ paperId: 'qp-4', contentMd: 'b' })
    expect(stillDirty).toBe(false)
  })

  it('批注挂载句柄 flush：全量句柄被消费，saved 终态→净', async () => {
    const handle = vi.fn(async () => {
      await mocks.annoWrite()
      return 'saved' as const
    })
    registerDraftFlush('anno-b5', handle)
    try {
      const stillDirty = await runQuitFlush()
      expect(handle).toHaveBeenCalledTimes(1)
      expect(stillDirty).toBe(false)
    } finally {
      unregisterDraftFlush('anno-b5')
    }
  })

  it('批注句柄 failed 终态：计入仍脏（fulfilled≠已落库——查态）', async () => {
    registerDraftFlush('anno-b5f', vi.fn(async () => 'failed' as const))
    try {
      const stillDirty = await runQuitFlush()
      expect(stillDirty).toBe(true)
    } finally {
      unregisterDraftFlush('anno-b5f')
    }
  })

  it('注册表残留（已卸载未落盘条目）：计入仍脏', async () => {
    saveAnnotationDraft('anno-b6', '残留草稿', true)
    try {
      const stillDirty = await runQuitFlush()
      expect(stillDirty).toBe(true)
    } finally {
      discardAnnotationDraft('anno-b6')
    }
  })

  it('lineage 不旁路队列：dirty→await save()（动作经队列 flush 派发）→clean→净', async () => {
    useLineageStore.setState({ nodes: [NODE], status: 'ready' })
    useLineageStore.getState().moveNode('n-1', 10, 20)
    expect(useLineageStore.getState().saveStatus).toBe('dirty')
    mocks.patchNode.mockResolvedValueOnce({ ok: true as const, data: { ...NODE, x: 10, y: 20, updatedAt: 't1' } })
    const stillDirty = await runQuitFlush()
    expect(mocks.patchNode).toHaveBeenCalledTimes(1)
    expect(mocks.patchNode).toHaveBeenCalledWith(expect.objectContaining({ id: 'n-1', x: 10, y: 20 }))
    expect(useLineageStore.getState().saveStatus).toBe('clean')
    expect(stillDirty).toBe(false)
  })

  it('lineage 写失败：error 态→仍脏', async () => {
    useLineageStore.setState({ nodes: [NODE], status: 'ready' })
    useLineageStore.getState().moveNode('n-1', 1, 2)
    mocks.patchNode.mockResolvedValueOnce({ ok: false as const, error: { code: 'E', message: '图写失败' } })
    const stillDirty = await runQuitFlush()
    expect(useLineageStore.getState().saveStatus).toBe('error')
    expect(stillDirty).toBe(true)
  })

  it('lineage 在途 flushing：save() 让位早退→仍按脏呈现（不把 fulfilled 等同落库）', async () => {
    useLineageStore.setState({
      saveStatus: 'saving',
      flushing: true,
      queue: [{ kind: 'remove-edge', id: 'e-x' }]
    })
    const stillDirty = await runQuitFlush()
    expect(mocks.patchNode).not.toHaveBeenCalled()
    expect(stillDirty).toBe(true)
  })

  it('重启一致性（jsdom 持久化模拟）：收口写载荷=最新 textarea 文本', async () => {
    await seedDirtyNote('qp-10', '最终文本')
    mocks.notesSave.mockResolvedValueOnce(noteResult('qp-10', '最终文本'))
    await runQuitFlush()
    expect(mocks.notesSave).toHaveBeenLastCalledWith({ paperId: 'qp-10', contentMd: '最终文本' })
  })

  it('组合判定：notes 净+批注 failed 句柄→仍脏（单一失败面即拦）', async () => {
    registerDraftFlush('anno-b11', vi.fn(async () => 'failed' as const))
    try {
      const stillDirty = await runQuitFlush()
      expect(stillDirty).toBe(true)
    } finally {
      unregisterDraftFlush('anno-b11')
    }
  })

  it('[回炉 W-2] 纯在途×pendingEdit 无键（弃改后残余写）：收口等待在途 settle（不写途 destroy）', async () => {
    mocks.notesGet.mockResolvedValueOnce(noteResult('qp-12', '基线'))
    await useNotesStore.getState().load('qp-12')
    let resolveSave!: (v: ReturnType<typeof noteResult>) => void
    mocks.notesSave.mockImplementationOnce(
      () => new Promise((r) => { resolveSave = r as typeof resolveSave })
    )
    useNotesStore.getState().edit('qp-12', { contentMd: '在途值' })
    void useNotesStore.getState().saveNow('qp-12')
    // 弃改收口（代际守卫）——pendingEdit 清空而在途写仍飞（弃改窄窗=写途
    // DB 落地毫秒窗；INV-50「DB 落地毫秒窗票面已接受」的收口侧对应面）
    useNotesStore.getState().discardPendingEdit('qp-12')
    let settled = false
    const quit = runQuitFlush().then((d) => {
      settled = true
      return d
    })
    await drain()
    // 在途未 settle——收口不返回（旧代码此格即返回 false=写途 destroy 面）
    expect(settled).toBe(false)
    resolveSave(noteResult('qp-12', '在途值'))
    await expect(quit).resolves.toBe(false)
    expect(settled).toBe(true)
  })
})

/**
 * [F-VISFB-15 回炉 R6] runQuitFlush×busy 链路（真实 AnnotationPopups 挂载——
 * createElement 形（.ts 件禁 JSX）；静 props 消费形，写链无需 busy 重渲染）。
 * 锁链：手动保存在途→②步句柄 flush 撞 busy→等待 settle→复判→真实写→
 * stillDirty 真实终态（失败格=true 必含；成功格=false——失败写后编辑器 failed
 * 态卸载入册，afterEach 卸载后 discard 显式回收防跨用例泄漏）。
 */
describe('quit-flush × busy —— ②步等待 settle 后真实终态（F-VISFB-15 回炉 R6）', () => {
  const RECT: AnnotationRect = { page: 0, x: 0.1, y: 0.2, w: 0.3, h: 0.05 }
  let root: Root | null = null
  let host: HTMLDivElement | null = null
  const mountedIds: string[] = []
  /** 失败/挂起形结果（annoWrite 原生窄型 {ok:true;data:null} 外的 Once 配置面——
   *  别名仅放宽配置 typing，断言仍打原 mock（运行时同对象） */
  type AnnoResult = { ok: boolean; data?: Annotation; error?: { code: string; message: string } }
  const annoWriteR6 = mocks.annoWrite as unknown as {
    mockImplementationOnce(fn: () => Promise<AnnoResult>): unknown
    mockResolvedValueOnce(v: AnnoResult): unknown
  }

  afterEach(() => {
    act(() => {
      root?.unmount()
    })
    host?.remove()
    root = null
    host = null
    // 卸载后回收（failed 态卸载入册面——R1 注册先于本 discard 完成）
    for (const id of mountedIds.splice(0)) {
      discardAnnotationDraft(id)
    }
  })

  /** 挂载真实弹层+<800ms 窗内值输入（un-attempted 形）+手动保存在途 */
  function mountEditorBusySave(anno: Annotation): void {
    ;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
    mountedIds.push(anno.id)
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    act(() => {
      root!.render(
        createElement(AnnotationPopups, {
          menu: null,
          editing: { annotation: anno, rect: RECT },
          busy: false,
          setMenu: vi.fn(),
          setEditing: vi.fn(),
          setBusy: vi.fn(),
          onChanged: vi.fn()
        })
      )
    })
    const ta = host.querySelector('textarea') as HTMLTextAreaElement
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
    act(() => {
      setter?.call(ta, 'quit 窗内值')
      ta.dispatchEvent(new Event('input', { bubbles: true }))
    })
    const saveBtn = host.querySelector<HTMLButtonElement>('[data-testid="annotation-editor-save"]')!
    act(() => {
      saveBtn.click()
    })
  }

  it('[R6 失败格] 手动保存在途→②步等待 settle→真实写失败→stillDirty=true（真实终态）', async () => {
    const anno = { ...makeAnnotation(''), id: 'anno-r6a' }
    let resolveManual!: (v: AnnoResult) => void
    annoWriteR6.mockImplementationOnce(
      () => new Promise<AnnoResult>((r) => { resolveManual = r })
    )
    annoWriteR6.mockResolvedValueOnce({ ok: false, error: { code: 'E', message: '写失败' } })
    mountEditorBusySave(anno)
    expect(mocks.annoWrite).toHaveBeenCalledTimes(1)
    let settled = false
    const quit = runQuitFlush().then((d) => {
      settled = true
      return d
    })
    await drain()
    // ②步等待 busy——未 settle 不返回（旧代码句柄乐观 'saved'→false=丢稿级面）
    expect(settled).toBe(false)
    resolveManual({ ok: false, error: { code: 'E', message: '手动写失败' } })
    const stillDirty = await quit
    expect(settled).toBe(true)
    // settle 复判：值未落库→真实写 #2（失败）→句柄 failed 终态→仍脏
    expect(mocks.annoWrite).toHaveBeenCalledTimes(2)
    expect(mocks.annoWrite).toHaveBeenLastCalledWith(
      expect.objectContaining({ annotation: expect.objectContaining({ comment: 'quit 窗内值' }) })
    )
    expect(stillDirty).toBe(true)
  })

  it('[R6 成功格] 手动保存同值成功→②步等待 settle→复判命中零冗余写→stillDirty=false', async () => {
    const anno = { ...makeAnnotation(''), id: 'anno-r6b', paperId: 'paper-1' }
    // 活动 tab 在场：手动成功经真 store updateAnnotation（活动篇 upsert）落
    // store 现值——值复判双条件齐（lastPersisted+store 共证）
    useReaderStore.setState({
      tabs: { 'paper-1': makeTab('paper-1', { annotations: [anno] }) },
      order: ['paper-1'],
      activeId: 'paper-1'
    })
    let resolveManual!: (v: AnnoResult) => void
    annoWriteR6.mockImplementationOnce(
      () => new Promise<AnnoResult>((r) => { resolveManual = r })
    )
    mountEditorBusySave(anno)
    expect(mocks.annoWrite).toHaveBeenCalledTimes(1)
    const quit = runQuitFlush()
    await drain()
    resolveManual({ ok: true, data: { ...anno, comment: 'quit 窗内值' } })
    const stillDirty = await quit
    // settle 复判：值+store 双命中→零冗余重写（恰 1 次）→真实终态 saved→净
    expect(mocks.annoWrite).toHaveBeenCalledTimes(1)
    expect(stillDirty).toBe(false)
  })
})
