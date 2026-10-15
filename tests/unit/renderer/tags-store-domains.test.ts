// @vitest-environment jsdom
/**
 * [F-DBCAMP-01 DB-4 / R1] tags.store 域分桶（Map<folderId, Tag[]>+分桶请求
 * 序号——双挂载两域互不覆写；头注「只认最后一次发起的请求」自认面消除）。
 *
 * 覆盖：双域 refresh 互不覆写（tagsByFolder 两桶并存）；分桶 stale-guard
 * （迟到的旧域响应不覆写他桶/本桶最新）；error 分桶（A 域失败不污染 B 域
 * error 面）；mutate 链式 refresh 显式域参（renameTag(tagId, name, folderId)
 * ——刷新发起域而非「最近一次 refresh 域」）。
 * always-active（不经 guardedDescribe）。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

async function loadStore(api: unknown) {
  vi.resetModules()
  vi.stubGlobal('window', { api })
  const mod = await import('../../../src/renderer/features/tags/tags.store')
  return mod.useTagsStore
}

beforeEach(() => {
  vi.unstubAllGlobals()
})

describe('F-DBCAMP-01 DB-4 R1 tags.store 域分桶', () => {
  it('双域 refresh：两桶并存互不覆写（FilterBar 域 vs detail.folderId 域双挂载）', async () => {
    const list = vi.fn(async (req: { folderId: string }) => ({
      ok: true as const,
      data: [{ id: `t-${req.folderId}`, name: `标签-${req.folderId}`, paperCount: 1 }]
    }))
    const useStore = await loadStore({ tags: { list } })
    await useStore.getState().refresh('f-a')
    await useStore.getState().refresh('f-b')
    expect(useStore.getState().tagsByFolder['f-a']).toHaveLength(1)
    expect(useStore.getState().tagsByFolder['f-a']?.[0]?.name).toBe('标签-f-a')
    expect(useStore.getState().tagsByFolder['f-b']?.[0]?.name).toBe('标签-f-b')
  })

  it('分桶 stale-guard：迟到的旧域响应只落本桶且不覆写本桶最新（他桶零波及）', async () => {
    let resolveA1!: (v: unknown) => void
    const list = vi
      .fn()
      .mockImplementationOnce(() => new Promise((r) => { resolveA1 = r }))
      .mockImplementationOnce(async () => ({ ok: true as const, data: [{ id: 't-a2', name: 'A桶新', paperCount: 1 }] }))
      .mockImplementationOnce(async () => ({ ok: true as const, data: [{ id: 't-b', name: 'B桶', paperCount: 1 }] }))
    const useStore = await loadStore({ tags: { list } })
    const slow = useStore.getState().refresh('f-a') // A 桶旧请求：挂起
    await useStore.getState().refresh('f-a') // A 桶新请求：立即成功
    await useStore.getState().refresh('f-b') // B 桶
    resolveA1({ ok: false, error: { code: 'DB_ERROR', message: '旧失败' } })
    await slow.catch(() => undefined)
    expect(useStore.getState().tagsByFolder['f-a']?.[0]?.name).toBe('A桶新') // A 桶旧失败不覆写
    expect(useStore.getState().tagsByFolder['f-b']?.[0]?.name).toBe('B桶') // B 桶零波及
    expect(useStore.getState().errorByFolder['f-b']).toBeNull()
    expect(useStore.getState().errorByFolder['f-a']).toBeNull() // 迟到旧失败被分桶 seq 丢弃（不触发误导 toast）
  })

  it('error 分桶：A 域失败只写 A 桶 error（B 域 error 面零污染）', async () => {
    const list = vi.fn(async (req: { folderId: string }) =>
      req.folderId === 'f-a'
        ? { ok: false as const, error: { code: 'DB_ERROR', message: 'A 域挂了' } }
        : { ok: true as const, data: [] }
    )
    const useStore = await loadStore({ tags: { list } })
    await useStore.getState().refresh('f-a')
    await useStore.getState().refresh('f-b')
    expect(useStore.getState().errorByFolder['f-a']).toBe('A 域挂了')
    expect(useStore.getState().errorByFolder['f-b']).toBeNull()
  })

  it('mutate 链式 refresh 显式域参：renameTag(tagId, name, folderId) 刷新该域桶', async () => {
    const list = vi.fn(async () => ({ ok: true as const, data: [] }))
    const rename = vi.fn(async () => ({ ok: true as const }))
    const useStore = await loadStore({ tags: { list, rename } })
    await useStore.getState().renameTag('t-1', '新名', 'f-detail')
    expect(rename).toHaveBeenCalledWith({ tagId: 't-1', name: '新名' })
    expect(list).toHaveBeenLastCalledWith({ folderId: 'f-detail' })
  })
})
