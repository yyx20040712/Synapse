import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * [P7E-01] tags.store 命令型三动作（always-active）。
 *
 * 契约：成功→内部 await refresh()（单一数据源自愈）后返回 {ok:true}；失败
 * 返回 {ok:false,error}（发起方 toast——不经 store.error 字段）；NOT_FOUND
 * （列表陈旧）失败额外 refresh 自愈（S7），其余错误零 refresh（S6）。
 * S1：rename 进行中并发 refresh——链式 refresh 为最新 seq，迟到旧响应丢弃。
 */

async function loadStore(api: unknown) {
  vi.resetModules()
  vi.stubGlobal('window', { api })
  const mod = await import('../../../src/renderer/features/tags/tags.store')
  return mod.useTagsStore
}

const okList = (tags: Array<{ id: string; name: string; paperCount: number }>) => ({
  ok: true as const,
  data: tags
})

beforeEach(() => {
  vi.unstubAllGlobals()
})

describe('P7E-01 tags.store —— 命令型动作', () => {
  it('renameTag 成功：返回 {ok:true} 且链式 refresh（list spy 被调、tags 更新）', async () => {
    const list = vi.fn().mockResolvedValue(okList([{ id: 't-1', name: '新名', paperCount: 1 }]))
    const rename = vi.fn().mockResolvedValue({ ok: true as const, data: { id: 't-1', name: '新名' } })
    const useStore = await loadStore({ tags: { list, rename } })
    const r = await useStore.getState().renameTag('t-1', '新名')
    expect(r).toEqual({ ok: true })
    expect(rename).toHaveBeenCalledWith({ tagId: 't-1', name: '新名' })
    expect(list).toHaveBeenCalledTimes(1) // 成功后链式 refresh（M3 变异锚）
    expect(useStore.getState().tags).toEqual([{ id: 't-1', name: '新名', paperCount: 1 }])
  })

  it('mergeTags/deleteTag 成功：同样链式 refresh + {ok:true}（逐参断言）', async () => {
    const list = vi.fn().mockResolvedValue(okList([]))
    const merge = vi.fn().mockResolvedValue({ ok: true as const, data: { ok: true } })
    const del = vi.fn().mockResolvedValue({ ok: true as const, data: { ok: true } })
    const useStore = await loadStore({ tags: { list, merge, delete: del } })
    await expect(useStore.getState().mergeTags('s-id', 't-id')).resolves.toEqual({ ok: true })
    await expect(useStore.getState().deleteTag('s-id')).resolves.toEqual({ ok: true })
    expect(merge).toHaveBeenCalledWith({ sourceId: 's-id', targetId: 't-id' })
    expect(del).toHaveBeenCalledWith({ tagId: 's-id' })
    expect(list).toHaveBeenCalledTimes(2)
  })

  it('S6 rename CONFLICT：返回 {ok:false,error.code=CONFLICT}；tags 零变更零 refresh', async () => {
    const list = vi.fn()
    const rename = vi
      .fn()
      .mockResolvedValue({ ok: false as const, error: { code: 'CONFLICT', message: '标签名已被占用' } })
    const useStore = await loadStore({ tags: { list, rename } })
    useStore.setState({ tags: [{ id: 't-1', name: '旧', paperCount: 1 }] })
    const r = await useStore.getState().renameTag('t-1', '占用名')
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error.code).toBe('CONFLICT')
      expect(r.error.message).toBe('标签名已被占用')
    }
    expect(useStore.getState().tags[0]?.name).toBe('旧')
    expect(list).not.toHaveBeenCalled() // 零 refresh（S6——用户输入问题不重拉列表）
  })

  it('S7 delete NOT_FOUND：返回 {ok:false} 但 refresh 自愈（列表陈旧重拉）', async () => {
    const list = vi.fn().mockResolvedValue(okList([]))
    const del = vi
      .fn()
      .mockResolvedValue({ ok: false as const, error: { code: 'NOT_FOUND', message: '标签不存在' } })
    const useStore = await loadStore({ tags: { list, delete: del } })
    const r = await useStore.getState().deleteTag('t-gone')
    expect(r.ok).toBe(false)
    expect(list).toHaveBeenCalledTimes(1) // 自愈 refresh（S7）
    expect(useStore.getState().tags).toEqual([])
  })

  it('S1 rename 进行中并发 refresh：链式 refresh 为最新 seq，迟到旧响应丢弃', async () => {
    let resolveRename!: (v: unknown) => void
    const rename = vi.fn(
      () => new Promise((r) => { resolveRename = r })
    )
    let resolveOld!: (v: unknown) => void
    const list = vi
      .fn()
      .mockImplementationOnce(() => new Promise((r) => { resolveOld = r }))
      .mockImplementationOnce(async () => okList([{ id: 't-9', name: '最新', paperCount: 2 }]))
    const useStore = await loadStore({ tags: { list, rename } })
    const mutating = useStore.getState().renameTag('t-1', 'x') // 挂起中（不占 seq）
    const concurrent = useStore.getState().refresh() // 并发 refresh（seq=2，响应将迟到）
    resolveRename({ ok: true, data: { id: 't-1', name: 'x' } }) // 完成后链式 refresh（seq=3 即刻成功）
    await mutating
    resolveOld({ ok: false, error: { code: 'DB_ERROR', message: '旧失败' } }) // seq=2 迟到失败
    await concurrent.catch(() => undefined)
    expect(useStore.getState().tags[0]?.name).toBe('最新') // 只认最新 seq 的结果
    expect(useStore.getState().error).toBeNull() // 迟到旧失败被 loadSeq 丢弃（不触发误导 toast）
  })
})
