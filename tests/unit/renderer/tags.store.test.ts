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

  it('refresh 失败：error 暴露失败信息供消费方 toast；下次 refresh 成功清空', async () => {
    const list = vi.fn()
      .mockImplementationOnce(async () => ({ ok: false as const, error: { code: 'DB_ERROR', message: '数据库暂不可用' } }))
      .mockImplementationOnce(async () => ({ ok: true as const, data: [] }))
    const useStore = await loadStore({ tags: { list } })
    await useStore.getState().refresh()
    expect(useStore.getState().error).toBe('数据库暂不可用')
    await useStore.getState().refresh()
    expect(useStore.getState().error).toBeNull()
  })

  it('并发 refresh：迟到的旧失败不污染最新结果（双挂载竞态）', async () => {
    let resolveFirst!: (v: unknown) => void
    const list = vi.fn()
      .mockImplementationOnce(() => new Promise((r) => { resolveFirst = r }))
      .mockImplementationOnce(async () => ({ ok: true as const, data: [{ id: 't-1', name: '新', paperCount: 1 }] }))
    const useStore = await loadStore({ tags: { list } })
    const first = useStore.getState().refresh() // 旧请求：挂起且注定失败
    await useStore.getState().refresh() // 新请求：立即成功
    resolveFirst({ ok: false, error: { code: 'DB_ERROR', message: '旧失败' } })
    await first.catch(() => undefined)
    expect(useStore.getState().tags[0]?.name).toBe('新') // 旧成功才覆盖；此处旧请求失败无 tags 面
    expect(useStore.getState().error).toBeNull() // 迟到旧失败不得写 error（不触发误导 toast）
  })
})
