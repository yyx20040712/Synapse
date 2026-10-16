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
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub } from '../../utils/api-client-mock'
import type { LineageNode } from '../../../src/shared/models/lineage'
import { runQuitFlush } from '../../../src/renderer/app/quit-flush'
import { useNotesStore } from '../../../src/renderer/features/notes/notes.store'
import { useReaderStore } from '../../../src/renderer/features/reader/state/reader.store'
import { useLineageStore } from '../../../src/renderer/features/lineage/lineage.store'
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
})
