import { beforeEach, expect, it, vi } from 'vitest'
import { guardedDescribe } from '../../utils/guard'

async function loadStore(api: unknown) {
  vi.resetModules()
  vi.stubGlobal('window', { api })
  const mod = await import('../../../src/renderer/features/settings/settings.store')
  return mod.useSettingsStore
}

guardedDescribe('SR-SET-02', 'settings.store —— 载入与保存', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('load 写入 settings', async () => {
    const get = vi.fn(async () => ({
      ok: true as const,
      data: { contactEmail: 'a@b.c', theme: 'dark' as const }
    }))
    const useStore = await loadStore({ settings: { get } })
    await useStore.getState().load()
    expect(useStore.getState().settings).toEqual({ contactEmail: 'a@b.c', theme: 'dark' })
  })

  it('save：发送补丁，成功后本地合并；saving 复位', async () => {
    const set = vi.fn(async () => ({
      ok: true as const,
      data: { contactEmail: 'new@x.y', theme: 'system' as const }
    }))
    const useStore = await loadStore({ settings: { set } })
    await useStore.getState().save({ contactEmail: 'new@x.y' })
    expect(set).toHaveBeenCalledWith({ contactEmail: 'new@x.y' })
    expect(useStore.getState().settings?.contactEmail).toBe('new@x.y')
    expect(useStore.getState().saving).toBe(false)
  })
})
