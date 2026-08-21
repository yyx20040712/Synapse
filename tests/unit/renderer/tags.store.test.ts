import { beforeEach, expect, it, vi } from 'vitest'
import { guardedDescribe } from '../../utils/guard'

async function loadStore(api: unknown) {
  vi.resetModules()
  vi.stubGlobal('window', { api })
  const mod = await import('../../../src/renderer/features/tags/tags.store')
  return mod.useTagsStore
}

guardedDescribe('SR-TAG-03', 'tags.store —— 刷新', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('refresh：写入 tags 数组，loading 翻转复位', async () => {
    const list = vi.fn(async () => ({
      ok: true as const,
      data: [
        { id: 't-1', name: '必读', paperCount: 3 },
        { id: 't-2', name: '略读', paperCount: 1 }
      ]
    }))
    const useStore = await loadStore({ tags: { list } })
    await useStore.getState().refresh()
    expect(useStore.getState().tags).toHaveLength(2)
    expect(useStore.getState().loading).toBe(false)
    expect(list).toHaveBeenCalledWith({})
  })

  it('refresh 失败：保留旧数据且不抛（错误由 toast 层处理）', async () => {
    const list = vi.fn(async () => ({ ok: false as const, error: { code: 'DB_ERROR', message: 'x' } }))
    const useStore = await loadStore({ tags: { list } })
    useStore.setState({ tags: [{ id: 't-1', name: '旧', paperCount: 0 }] })
    await useStore.getState().refresh()
    expect(useStore.getState().tags[0]?.name).toBe('旧')
  })
})
