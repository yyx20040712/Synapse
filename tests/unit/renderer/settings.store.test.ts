import { beforeEach, describe, expect, it, vi } from 'vitest'
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

  it('R2-SET1 save({uiScale}) 透传：set 收到的参数恰为补丁（Partial 通道不滤字段）', async () => {
    const set = vi.fn(async () => ({
      ok: true as const,
      data: { contactEmail: 'a@b.c', theme: 'system' as const, uiScale: 'medium' as const }
    }))
    const useStore = await loadStore({ settings: { set } })
    await useStore.getState().save({ uiScale: 'medium' })
    expect(set).toHaveBeenCalledWith({ uiScale: 'medium' })
    expect(useStore.getState().settings?.uiScale).toBe('medium')
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
    resolveLoad({ ok: true, data: { contactEmail: 'old@a.b', theme: 'dark', uiScale: 'small' } }) // 旧快照后到
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
    resolveSave({ ok: true, data: { contactEmail: 'new@x.y', theme: 'system', uiScale: 'small' } })
    await pSave // 保存落地 S1（成功抬版本）
    resolveLoad({ ok: true, data: { contactEmail: 'old@a.b', theme: 'dark', uiScale: 'small' } }) // 读旧态的后到响应
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
    resolveLoad({ ok: true, data: { contactEmail: 'old@a.b', theme: 'dark', uiScale: 'small' } })
    await pLoad
    // 瞬态：save 尚未落地，load 的旧读应用（版本未被无谓抬升作废）
    expect(useStore.getState().settings?.contactEmail).toBe('old@a.b')
    resolveSave({ ok: true, data: { contactEmail: 'new@x.y', theme: 'system', uiScale: 'small' } })
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
    resolveLoad({ ok: true, data: { contactEmail: 'old@a.b', theme: 'dark', uiScale: 'small' } })
    await pLoad
    // save 失败：持久层（settings.json）真值就是 old@a.b，在途 load 应用是真话不得丢弃
    expect(useStore.getState().settings?.contactEmail).toBe('old@a.b')
    expect(useStore.getState().saving).toBe(false)
  })
})

// ── F-SV（2026-09-02 settings.save 并发互斥修票，always-active——不经 guardedDescribe）──
//    病根（AUDIT-C §1.1）：save 间无互斥——saving 仅驱动 UI 不拒并发，
//    ipcMain.handle 对 async handler 不序列化，并发 save 的 invoke 各自在途；
//    INV-39「set 必须组装全量」放大此面：save₁ 旧全量迟到落盘整体覆盖 save₂
//    → 档位回跳。修复=store 层链式全序（INV-03 写方向同族第三变体「同通道
//    写全序」）：save₂ 排队，save₁ settle 后才发 invoke；链永不断（失败只
//    上抛各自调用方）；inflight 归零才复位 saving（排队者不闪断）。UI 守卫
//    （SettingsPage runSave/pickScale 的 if(saving) return）=第一道门防常规
//    重复，store 链=第二道兜毫秒窗+跨入口。 ──
describe('F-SV settings.save 链式全序（并发写互斥）', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  /** 排空微任务队列：让链式回调充分展开后再做时序断言（轮数冗余无副作用） */
  async function flush(times = 10): Promise<void> {
    for (let i = 0; i < times; i += 1) {
      await Promise.resolve()
    }
  }

  it('并发全序：save₁ 挂起中 save₂ 排队——settle 前 save₂ 的 set 不被调，settle 后恰一次；终态=save₂ 值；saving 归零', async () => {
    let resolveSet1!: (v: SettingsOk) => void
    let resolveSet2!: (v: SettingsOk) => void
    const set = vi.fn()
      .mockImplementationOnce(() => new Promise<SettingsOk>((r) => { resolveSet1 = r }))
      .mockImplementationOnce(() => new Promise<SettingsOk>((r) => { resolveSet2 = r }))
    const useStore = await loadStore({ settings: { set } })
    const pSave1 = useStore.getState().save({ contactEmail: 'one@x.y' })
    const pSave2 = useStore.getState().save({ contactEmail: 'two@x.y' })
    await flush()
    // save₁ 在途：save₂ 已进入但必须排队，不得发出第二个 invoke
    expect(set).toHaveBeenCalledTimes(1)
    expect(set).toHaveBeenCalledWith({ contactEmail: 'one@x.y' })
    resolveSet1({ ok: true, data: { contactEmail: 'one@x.y', theme: 'system' as const, uiScale: 'small' } })
    await flush()
    // save₁ settle 后 save₂ 恰补发一次，载荷为 save₂ 自身的补丁
    expect(set).toHaveBeenCalledTimes(2)
    expect(set).toHaveBeenNthCalledWith(2, { contactEmail: 'two@x.y' })
    resolveSet2({ ok: true, data: { contactEmail: 'two@x.y', theme: 'system' as const, uiScale: 'small' } })
    await Promise.all([pSave1, pSave2])
    // 落盘序=发出序：终态恒=最后一次意图（save₂ 的值）
    expect(useStore.getState().settings?.contactEmail).toBe('two@x.y')
    expect(useStore.getState().saving).toBe(false)
  })

  it('链不断：save₁ reject 后排队的 save₂ 照常发出并成功，save₁ 错误上抛其调用方', async () => {
    let rejectSet1!: (e: Error) => void
    let resolveSet2!: (v: SettingsOk) => void
    const set = vi.fn()
      .mockImplementationOnce(() => new Promise<SettingsOk>((_r, rej) => { rejectSet1 = rej }))
      .mockImplementationOnce(() => new Promise<SettingsOk>((r) => { resolveSet2 = r }))
    const useStore = await loadStore({ settings: { set } })
    const pSave1 = useStore.getState().save({ contactEmail: 'one@x.y' })
    const pSave2 = useStore.getState().save({ contactEmail: 'two@x.y' })
    await flush()
    // save₁ 在途（受控悬挂）：save₂ 必须排队不得发出
    expect(set).toHaveBeenCalledTimes(1)
    rejectSet1(new Error('写盘失败'))
    // save₁ 的失败上抛 save₁ 的调用方（动作型契约零变，不吞不串）
    await expect(pSave1).rejects.toThrow('写盘失败')
    await flush()
    // 链未被失败折断：save₂ 照常发出
    expect(set).toHaveBeenCalledTimes(2)
    resolveSet2({ ok: true, data: { contactEmail: 'two@x.y', theme: 'system' as const, uiScale: 'small' } })
    await pSave2
    expect(useStore.getState().settings?.contactEmail).toBe('two@x.y')
    expect(useStore.getState().saving).toBe(false)
  })

  it('saving 连续：save₁ settle 后 save₂ 起跑前不闪 false（订阅帧 false 仅在全部 settle 后出现一次）', async () => {
    let resolveSet1!: (v: SettingsOk) => void
    let resolveSet2!: (v: SettingsOk) => void
    const set = vi.fn()
      .mockImplementationOnce(() => new Promise<SettingsOk>((r) => { resolveSet1 = r }))
      .mockImplementationOnce(() => new Promise<SettingsOk>((r) => { resolveSet2 = r }))
    const useStore = await loadStore({ settings: { set } })
    const frames: boolean[] = []
    const unsubscribe = useStore.subscribe((s) => { frames.push(s.saving) })
    const pSave1 = useStore.getState().save({ contactEmail: 'one@x.y' })
    const pSave2 = useStore.getState().save({ contactEmail: 'two@x.y' })
    await flush()
    resolveSet1({ ok: true, data: { contactEmail: 'one@x.y', theme: 'system' as const, uiScale: 'small' } })
    await flush()
    resolveSet2({ ok: true, data: { contactEmail: 'two@x.y', theme: 'system' as const, uiScale: 'small' } })
    await Promise.all([pSave1, pSave2])
    unsubscribe()
    // 首帧即 true（save 进入立即置位）；false 仅出现在末尾一次（中途闪断=守卫窗）
    expect(frames[0]).toBe(true)
    expect(frames.indexOf(false)).toBe(frames.length - 1)
    expect(frames.lastIndexOf(false)).toBe(frames.length - 1)
    expect(useStore.getState().saving).toBe(false)
  })
})
