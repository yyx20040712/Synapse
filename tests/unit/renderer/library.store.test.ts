import { beforeEach, expect, it, vi } from 'vitest'
import type { PaperSummary } from '../../../src/shared/models/paper'
import { guardedDescribe } from '../../utils/guard'

const summary: PaperSummary = {
  id: 'p-1',
  title: '智慧水务',
  authors: ['张三'],
  year: 2025,
  venue: '',
  doi: null,
  tagNames: [],
  collectionNames: [],
  annotationCount: 0,
  noteCount: 0,
  lastReadPage: 0,
  addedAt: 't'
}

/** 动态导入 + 桩掉 window.api（store 经 api/client 引用 window） */
async function loadStore(api: unknown) {
  vi.resetModules()
  vi.stubGlobal('window', { api })
  const mod = await import('../../../src/renderer/features/library/library.store')
  return mod.useLibraryStore
}

guardedDescribe('SR-LIB-07', 'library.store —— 列表/筛选/选中', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('load：调用 api.library.list 并写入 papers/total；loading 正确翻转', async () => {
    const list = vi.fn(async () => ({ ok: true as const, data: { items: [summary], total: 1 } }))
    const useStore = await loadStore({ library: { list } })
    const loadingFlip: boolean[] = []
    const p = useStore.getState().load()
    loadingFlip.push(useStore.getState().loading)
    await p
    expect(loadingFlip).toEqual([true])
    const s = useStore.getState()
    expect(s.loading).toBe(false)
    expect(s.papers).toEqual([summary])
    expect(s.total).toBe(1)
  })

  it('load 失败：error 写入中文消息且不抛', async () => {
    const list = vi.fn(async () => ({ ok: false as const, error: { code: 'DB_ERROR', message: '数据库错误' } }))
    const useStore = await loadStore({ library: { list } })
    await useStore.getState().load()
    expect(useStore.getState().error).toBe('数据库错误')
    expect(useStore.getState().papers).toEqual([])
  })

  it('setQuery 合并查询并重载（offset 归零）', async () => {
    const list = vi.fn(async () => ({ ok: true as const, data: { items: [], total: 0 } }))
    const useStore = await loadStore({ library: { list } })
    useStore.setState({ query: { sort: 'added_desc', offset: 40, limit: 50 } })
    await useStore.getState().setQuery({ search: '水务', sort: 'year_desc' })
    const q = useStore.getState().query
    expect(q).toMatchObject({ search: '水务', sort: 'year_desc', offset: 0 })
    expect(list).toHaveBeenCalledTimes(1)
  })

  it('selectPaper 更新选中', async () => {
    const useStore = await loadStore({ library: { list: vi.fn() } })
    useStore.getState().selectPaper('p-9')
    expect(useStore.getState().selectedId).toBe('p-9')
  })
})
