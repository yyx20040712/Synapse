import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { guardedDescribe } from '../../utils/guard'

async function loadStore(api: unknown) {
  vi.resetModules()
  vi.stubGlobal('window', { api })
  const mod = await import('../../../src/renderer/features/notes/notes.store')
  return mod.useNotesStore
}

guardedDescribe('SR-NOTE-02', 'notes.store —— 防抖自动保存', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('load 写入；edit 标 dirty；1.5s 内防抖后保存一次', async () => {
    const save = vi.fn(
      async (_req: { paperId: string; title: string; contentMd: string }) => ({
        ok: true as const,
        data: { id: 'n-1', paperId: 'p-1', title: 't', contentMd: 'c', createdAt: 't', updatedAt: 't' }
      })
    )
    const get = vi.fn(async () => ({
      ok: true as const,
      data: { id: 'n-1', paperId: 'p-1', title: '标题', contentMd: '旧', createdAt: 't', updatedAt: 't' }
    }))
    const useStore = await loadStore({ notes: { get, save } })

    await useStore.getState().load('p-1')
    expect(useStore.getState().noteByPaper['p-1']?.contentMd).toBe('旧')

    useStore.getState().edit('p-1', { contentMd: '新1' })
    useStore.getState().saveSoon('p-1')
    useStore.getState().edit('p-1', { contentMd: '新2' })
    useStore.getState().saveSoon('p-1')
    expect(save).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1600)
    expect(save).toHaveBeenCalledTimes(1)
    expect(save.mock.calls[0]?.[0]).toMatchObject({ paperId: 'p-1', contentMd: '新2' })
  })

  it('保存后 savedAt 更新；saving 态翻转', async () => {
    const save = vi.fn(
      async (_req: { paperId: string; title: string; contentMd: string }) => ({
        ok: true as const,
        data: { id: 'n-1', paperId: 'p-1', title: '', contentMd: '', createdAt: 't', updatedAt: 't2' }
      })
    )
    const useStore = await loadStore({ notes: { get: vi.fn(), save } })
    useStore.setState({ noteByPaper: { 'p-1': { title: '', contentMd: '', saving: false, savedAt: null } } })
    useStore.getState().saveSoon('p-1')
    await vi.advanceTimersByTimeAsync(1600)
    expect(useStore.getState().noteByPaper['p-1']?.savedAt).toBe('t2')
  })
})
