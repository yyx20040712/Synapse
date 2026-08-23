import { beforeEach, expect, it, vi } from 'vitest'
import type { AppSettings } from '../../../src/shared/ipc/schemas'
import { guardedDescribe } from '../../utils/guard'

async function loadStore(api: unknown) {
  vi.resetModules()
  vi.stubGlobal('window', { api })
  const mod = await import('../../../src/renderer/features/settings/settings.store')
  return mod.useSettingsStore
}

/** IPC 成功响应形状（stub 用；data 单一真相源取 shared 的 AppSettings，不手写第二份） */
type SettingsOk = { ok: true; data: AppSettings }

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

  // ── stale-guard 锁定用例（INV-03 收口：settings 是跨通道乱序可达面——
  // ipc/settings 的 get/set 是异步处理器，ipcMain.handle 不保证跨通道回复有序，
  // 战役 §5 的 FIFO 假设只对同步处理器成立） ──

  it('乱序守卫：save 派发后，更早发起的 load 响应到达不得覆盖已保存设置', async () => {
    let resolveLoad!: (v: SettingsOk) => void
    const get = vi.fn().mockImplementationOnce(() => new Promise<SettingsOk>((r) => { resolveLoad = r }))
    const set = vi.fn(async () => ({
      ok: true as const,
      data: { contactEmail: 'new@x.y', theme: 'system' as const }
    }))
    const useStore = await loadStore({ settings: { get, set } })
    const pLoad = useStore.getState().load() // 慢读悬挂（快照版本 n）
    await useStore.getState().save({ contactEmail: 'new@x.y' }) // 快速保存落地 S1（成功抬版本）
    resolveLoad({ ok: true, data: { contactEmail: 'old@a.b', theme: 'dark' } }) // 旧快照后到
    await pLoad
    expect(useStore.getState().settings?.contactEmail).toBe('new@x.y')
  })

  it('乱序守卫：save 在途时派发的 load 读到旧态且响应后到，落地时丢弃', async () => {
    let resolveSave!: (v: SettingsOk) => void
    let resolveLoad!: (v: SettingsOk) => void
    const get = vi.fn().mockImplementationOnce(() => new Promise<SettingsOk>((r) => { resolveLoad = r }))
    const set = vi.fn().mockImplementationOnce(() => new Promise<SettingsOk>((r) => { resolveSave = r }))
    const useStore = await loadStore({ settings: { get, set } })
    const pSave = useStore.getState().save({ contactEmail: 'new@x.y' }) // 保存悬挂
    const pLoad = useStore.getState().load() // 在途保存期间派发的读
    resolveSave({ ok: true, data: { contactEmail: 'new@x.y', theme: 'system' } })
    await pSave // 保存落地 S1（成功抬版本）
    resolveLoad({ ok: true, data: { contactEmail: 'old@a.b', theme: 'dark' } }) // 读旧态的后到响应
    await pLoad
    expect(useStore.getState().settings?.contactEmail).toBe('new@x.y')
  })

  it('乱序守卫：save 在途时 load 响应先到——瞬态应用旧读，save 落地后终态正确（格4）', async () => {
    let resolveSave!: (v: SettingsOk) => void
    let resolveLoad!: (v: SettingsOk) => void
    const get = vi.fn().mockImplementationOnce(() => new Promise<SettingsOk>((r) => { resolveLoad = r }))
    const set = vi.fn().mockImplementationOnce(() => new Promise<SettingsOk>((r) => { resolveSave = r }))
    const useStore = await loadStore({ settings: { get, set } })
    const pSave = useStore.getState().save({ contactEmail: 'new@x.y' })
    const pLoad = useStore.getState().load()
    resolveLoad({ ok: true, data: { contactEmail: 'old@a.b', theme: 'dark' } })
    await pLoad
    // 瞬态：save 尚未落地，load 的旧读应用（版本未被无谓抬升作废）
    expect(useStore.getState().settings?.contactEmail).toBe('old@a.b')
    resolveSave({ ok: true, data: { contactEmail: 'new@x.y', theme: 'system' } })
    await pSave
    // 终态：save 落地无条件覆盖（新者恒为用户最新意图）
    expect(useStore.getState().settings?.contactEmail).toBe('new@x.y')
  })

  it('乱序守卫：save 失败不抬版本——在途 load 读到的真值照常应用', async () => {
    let resolveLoad!: (v: SettingsOk) => void
    const get = vi.fn().mockImplementationOnce(() => new Promise<SettingsOk>((r) => { resolveLoad = r }))
    const set = vi.fn(async () => {
      throw new Error('写盘失败')
    })
    const useStore = await loadStore({ settings: { get, set } })
    const pLoad = useStore.getState().load()
    await expect(useStore.getState().save({ contactEmail: 'new@x.y' })).rejects.toThrow('写盘失败')
    resolveLoad({ ok: true, data: { contactEmail: 'old@a.b', theme: 'dark' } })
    await pLoad
    // save 失败：持久层（settings.json）真值就是 old@a.b，在途 load 应用是真话不得丢弃
    expect(useStore.getState().settings?.contactEmail).toBe('old@a.b')
    expect(useStore.getState().saving).toBe(false)
  })
})
