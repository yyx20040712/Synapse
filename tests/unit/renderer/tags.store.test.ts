import { beforeEach, expect, it, vi } from 'vitest'
import { guardedDescribe } from '../../utils/guard'

async function loadStore(api: unknown) {
  vi.resetModules()
  vi.stubGlobal('window', { api })
  const mod = await import('../../../src/renderer/features/tags/tags.store')
  return mod.useTagsStore
}

// [F-DBCAMP-01 DB-4 / R1] 域分桶随链更新：tags→tagsByFolder[folderId]、
// error→errorByFolder[folderId]（[locked-change]——R1 票面指令契约改写；
// 域分桶行为面扩展断言=tags-store-domains.test.ts〔always-active〕）
guardedDescribe('SR-TAG-03', 'tags.store —— 刷新', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('refresh：写入该域桶，loading 翻转复位', async () => {
    const list = vi.fn(async () => ({
      ok: true as const,
      data: [
        { id: 't-1', name: '必读', paperCount: 3 },
        { id: 't-2', name: '略读', paperCount: 1 }
      ]
    }))
    const useStore = await loadStore({ tags: { list } })
    await useStore.getState().refresh('__main__')
    expect(useStore.getState().tagsByFolder['__main__']).toHaveLength(2)
    expect(useStore.getState().loading).toBe(false)
    expect(list).toHaveBeenCalledWith({ folderId: '__main__' })
  })

  it('refresh 失败：保留旧数据且不抛（错误由 toast 层处理）', async () => {
    const list = vi.fn(async () => ({ ok: false as const, error: { code: 'DB_ERROR', message: 'x' } }))
    const useStore = await loadStore({ tags: { list } })
    useStore.setState({ tagsByFolder: { __main__: [{ id: 't-1', name: '旧', paperCount: 0, color: null }] } })
    await useStore.getState().refresh('__main__')
    expect(useStore.getState().tagsByFolder['__main__']?.[0]?.name).toBe('旧')
  })

  it('refresh 失败：分桶 error 暴露失败信息供消费方 toast；下次 refresh 成功清空', async () => {
    const list = vi.fn()
      .mockImplementationOnce(async () => ({ ok: false as const, error: { code: 'DB_ERROR', message: '数据库暂不可用' } }))
      .mockImplementationOnce(async () => ({ ok: true as const, data: [] }))
    const useStore = await loadStore({ tags: { list } })
    await useStore.getState().refresh('__main__')
    expect(useStore.getState().errorByFolder['__main__']).toBe('数据库暂不可用')
    await useStore.getState().refresh('__main__')
    expect(useStore.getState().errorByFolder['__main__']).toBeNull()
  })

  it('并发 refresh：迟到的旧失败不污染最新结果（同桶竞态——分桶 stale-guard）', async () => {
    let resolveFirst!: (v: unknown) => void
    const list = vi.fn()
      .mockImplementationOnce(() => new Promise((r) => { resolveFirst = r }))
      .mockImplementationOnce(async () => ({ ok: true as const, data: [{ id: 't-1', name: '新', paperCount: 1 }] }))
    const useStore = await loadStore({ tags: { list } })
    const first = useStore.getState().refresh('__main__') // 旧请求：挂起且注定失败
    await useStore.getState().refresh('__main__') // 新请求：立即成功
    resolveFirst({ ok: false, error: { code: 'DB_ERROR', message: '旧失败' } })
    await first.catch(() => undefined)
    expect(useStore.getState().tagsByFolder['__main__']?.[0]?.name).toBe('新') // 旧成功才覆盖；此处旧请求失败无 tags 面
    expect(useStore.getState().errorByFolder['__main__']).toBeNull() // 迟到旧失败不得写 error（不触发误导 toast）
  })
})
