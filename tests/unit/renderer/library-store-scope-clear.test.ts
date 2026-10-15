// @vitest-environment jsdom
/**
 * [F-DBCAMP-01 DB-4 / R1] library.store setQuery 换域清残留
 * （folderScope 值级变更→query.tagIds 清空——旧域 id 残留=全局 EXISTS 过滤
 * 缺陷〔papers.queries 无 tag 域限定〕；TagDropdown 选中态随清=selection
 * 单源 query.tagIds）。
 *
 * 覆盖：folder→folder（值级变更）清 tagIds；folder→all 清；all→folder 清；
 * 同值 folderScope 不清；无 folderScope patch 不清；清空后 tagIds 键=缺省。
 * always-active（不经 guardedDescribe）。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

async function loadStore(api: unknown) {
  vi.resetModules()
  vi.stubGlobal('window', { api })
  const mod = await import('../../../src/renderer/features/library/library.store')
  return mod.useLibraryStore
}

beforeEach(() => {
  vi.unstubAllGlobals()
})

describe('F-DBCAMP-01 DB-4 R1 library.store setQuery 换域清 tagIds', () => {
  it('folder→他 folder（值级变更）：tagIds 清空', async () => {
    const list = vi.fn(async () => ({ ok: true as const, data: { items: [], total: 0 } }))
    const useStore = await loadStore({ library: { list } })
    useStore.setState({
      query: { sort: 'added_desc', offset: 0, limit: 50, folderScope: { kind: 'folder', folderId: 'f-a' }, tagIds: ['t-1', 't-2'] }
    })
    await useStore.getState().setQuery({ folderScope: { kind: 'folder', folderId: 'f-b' } })
    expect(useStore.getState().query.tagIds).toBeUndefined()
    expect(useStore.getState().query.folderScope).toEqual({ kind: 'folder', folderId: 'f-b' })
  })

  it('folder→all：清；all→folder：清', async () => {
    const list = vi.fn(async () => ({ ok: true as const, data: { items: [], total: 0 } }))
    const useStore = await loadStore({ library: { list } })
    useStore.setState({
      query: { sort: 'added_desc', offset: 0, limit: 50, folderScope: { kind: 'folder', folderId: 'f-a' }, tagIds: ['t-1'] }
    })
    await useStore.getState().setQuery({ folderScope: { kind: 'all' } })
    expect(useStore.getState().query.tagIds).toBeUndefined()
    useStore.setState({
      query: { sort: 'added_desc', offset: 0, limit: 50, folderScope: { kind: 'all' }, tagIds: ['t-9'] }
    })
    await useStore.getState().setQuery({ folderScope: { kind: 'folder', folderId: 'f-a' } })
    expect(useStore.getState().query.tagIds).toBeUndefined()
  })

  it('同值 folderScope 与无 folderScope patch：tagIds 保留', async () => {
    const list = vi.fn(async () => ({ ok: true as const, data: { items: [], total: 0 } }))
    const useStore = await loadStore({ library: { list } })
    useStore.setState({
      query: { sort: 'added_desc', offset: 0, limit: 50, folderScope: { kind: 'folder', folderId: 'f-a' }, tagIds: ['t-1'] }
    })
    await useStore.getState().setQuery({ folderScope: { kind: 'folder', folderId: 'f-a' } })
    expect(useStore.getState().query.tagIds).toEqual(['t-1'])
    await useStore.getState().setQuery({ search: '水务' })
    expect(useStore.getState().query.tagIds).toEqual(['t-1'])
  })
})
