/**
 * [F-VISFB-64] 退出握手 main 侧装配测试（quit-handshake 改写——契约变更随
 * F-VISFB-64 无条件握手化，豁免预批=设计稿 §⑪-6）。
 *
 * 锁链（main-window installQuitCloseInterception 装配面=quit-close-policy
 * 端口与订阅——设计稿 §⑦ 事件源所有权表）：
 * - 无条件握手：clean close=preventDefault+发帧（旧 clean 直放断言改握手断言
 *   ——强度不降：放行面收敛为「握手回执 clean」单一销毁面）；
 * - 分级等待：clean=QUIT_CLEAN_GRACE_MS 1000/dirty=QUIT_FLUSH_TIMEOUT_MS 5000
 *   （超时只确认不静默销毁）；WC 内 dirty push 升级换臂；
 * - 确认/取消：确认=destroy 恰一次/取消=窗口保持+abort 帧（requestId 载荷）；
 * - 重入：握手中二次 close=再 preventDefault+单发；迟到旧 id 回执不误伤；
 * - send 抛错/renderer-gone→confirm 降级；dispose 退订幂等。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  QUIT_CONFIRM_MESSAGE,
  installQuitCloseInterception,
  reportQuitFlushResult,
  setQuitDirty
} from '../../../src/main/windows/main-window'
import { QUIT_CLEAN_GRACE_MS, QUIT_FLUSH_TIMEOUT_MS } from '../../../src/shared/constants'
import { createSystemIpc } from '../../../src/main/ipc/system'
import { makeIpcDeps } from '../../utils/ipc-deps'

type CloseListener = (event: { preventDefault(): void }) => void

interface Harness {
  setClock(t: number): void
  advance(ms: number): void
  fireClose(): { preventDefault(): void }
  fireGone(): void
  destroyWin(): void
  killWebContents(): void
  frames: { requestId: string }[]
  aborts: { requestId: string }[]
  confirms: ReturnType<typeof vi.fn>
  destroys: number
  removed: string[]
  handle: { dispose(): void }
  lastId(): string
}

function makeHarness(confirmResult = false, neverResolve = false): Harness {
  let clock = 0
  const closeLs: CloseListener[] = []
  const closedLs: (() => void)[] = []
  const goneLs: (() => void)[] = []
  const removed: string[] = []
  const frames: { requestId: string }[] = []
  const aborts: { requestId: string }[] = []
  const confirms = vi.fn(() =>
    neverResolve ? new Promise<boolean>(() => {}) : Promise.resolve(confirmResult)
  )
  let destroys = 0
  // [64-e2e-hang] Electron 销毁语义建模：destroy 即置 destroyed 旗标，此后
  // removeListener/webContents 访问一律抛（真 BrowserWindow 语义——此前 fake
  // 未建模销毁态，掩盖了 closed 回调内 teardown 触摸已亡窗的未捕获异常）。
  // wc 独亡形（门二 W1）：win 活而 webContents 已亡（render-process-gone 等），
  // killWebContents() 置 wcDead——wc 各法抛、isDestroyed() 回读真值（真
  // WebContents 语义：isDestroyed 销毁后仍可调）
  let destroyed = false
  let wcDead = false
  const wc = {
    on(event: string, listener: (...args: never[]) => void): void {
      if (wcDead) throw new Error('Object has been destroyed')
      if (event === 'render-process-gone') goneLs.push(listener as () => void)
    },
    removeListener(event: string): void {
      if (wcDead) throw new Error('Object has been destroyed')
      removed.push(`webContents:${event}`)
    },
    isDestroyed(): boolean {
      return wcDead
    }
  }
  const win = {
    on(event: string, listener: (...args: never[]) => void): void {
      if (event === 'close') closeLs.push(listener as CloseListener)
      else if (event === 'closed') closedLs.push(listener as () => void)
    },
    removeListener(event: string): void {
      if (destroyed) throw new Error('Object has been destroyed')
      removed.push(event)
    },
    destroy(): void {
      destroyed = true
      destroys += 1
      for (const l of closedLs.splice(0)) l()
    },
    get webContents(): typeof wc {
      if (destroyed) throw new Error('Object has been destroyed')
      return wc
    },
    isDestroyed(): boolean {
      return destroyed
    }
  }
  const handle = installQuitCloseInterception(win, {
    now: () => clock,
    sendQuitFlushFrame: (p) => {
      frames.push(p)
    },
    sendAbortFrame: (p) => {
      aborts.push(p)
    },
    confirmQuit: confirms
  })
  return {
    setClock: (t) => (clock = t),
    advance(ms) {
      clock += ms
      vi.advanceTimersByTime(ms)
    },
    fireClose() {
      const event = { preventDefault: vi.fn() }
      for (const l of [...closeLs]) l(event)
      return event
    },
    fireGone() {
      for (const l of [...goneLs]) l()
    },
    destroyWin() {
      win.destroy()
    },
    killWebContents() {
      wcDead = true
    },
    frames,
    aborts,
    confirms,
    get destroys() {
      return destroys
    },
    removed,
    handle,
    lastId: () => {
      const f = frames.at(-1)
      if (!f) throw new Error('flush 帧未发出')
      return f.requestId
    }
  }
}

/** 微任务排空（confirm 适配回调链 ≤6 跳） */
async function drain(turns = 8): Promise<void> {
  for (let i = 0; i < turns; i++) await Promise.resolve()
}

let harness: Harness | null = null

beforeEach(() => {
  vi.useFakeTimers()
  harness = makeHarness()
})

afterEach(() => {
  harness?.handle.dispose()
  harness = null
  vi.useRealTimers()
})

describe('quit-handshake —— main 侧无条件握手装配（F-VISFB-64）', () => {
  it('常量锚：QUIT_FLUSH_TIMEOUT_MS=5000/QUIT_CLEAN_GRACE_MS=1000（shared 单源）+确认文案', () => {
    expect(QUIT_FLUSH_TIMEOUT_MS).toBe(5000)
    expect(QUIT_CLEAN_GRACE_MS).toBe(1000)
    expect(QUIT_CONFIRM_MESSAGE).toContain('未能自动保存')
    expect(QUIT_CONFIRM_MESSAGE).toContain('确认退出')
  })

  it('clean 态 close：preventDefault+发 quit-flush 帧（无条件握手）+零确认零销毁', () => {
    const h = harness!
    const event = h.fireClose()
    expect(event.preventDefault).toHaveBeenCalledTimes(1)
    expect(h.frames).toEqual([{ requestId: 'quit-flush-1' }])
    expect(h.confirms).not.toHaveBeenCalled()
    expect(h.destroys).toBe(0)
  })

  it('clean→回执 stillDirty=false：destroy 恰一次零确认（唯一 clean 销毁面）', async () => {
    const h = harness!
    h.fireClose()
    reportQuitFlushResult('quit-flush-1', false)
    await drain()
    expect(h.destroys).toBe(1)
    expect(h.confirms).not.toHaveBeenCalled()
  })

  it('clean→grace 超时（1000ms）→confirm（QUIT_CONFIRM_MESSAGE）→确认=destroy', async () => {
    const h = makeHarness(true)
    h.fireClose()
    await h.advance(QUIT_CLEAN_GRACE_MS - 1)
    expect(h.confirms).not.toHaveBeenCalled()
    await h.advance(1)
    expect(h.confirms).toHaveBeenCalledTimes(1)
    expect(h.confirms).toHaveBeenCalledWith(QUIT_CONFIRM_MESSAGE)
    await drain()
    expect(h.destroys).toBe(1)
    h.handle.dispose()
  })

  it('超时→取消：窗口保持+abort 帧发出（requestId 载荷=C→I 解冻）', async () => {
    const h = harness!
    h.fireClose()
    await h.advance(QUIT_CLEAN_GRACE_MS)
    await drain()
    expect(h.destroys).toBe(0)
    expect(h.aborts).toEqual([{ requestId: 'quit-flush-1' }])
  })

  it('取消后 reclose：新 requestId（单调序跨取消唯一）+单发沿承', async () => {
    const h = harness!
    h.fireClose()
    await h.advance(QUIT_CLEAN_GRACE_MS)
    await drain()
    expect(h.aborts).toEqual([{ requestId: 'quit-flush-1' }])
    h.fireClose()
    expect(h.frames.map((f) => f.requestId)).toEqual(['quit-flush-1', 'quit-flush-2'])
  })

  it('dirty 态 close（setQuitDirty 喂 policy 快照）→回执 false=destroy（分级不影响销毁面）', async () => {
    const h = harness!
    setQuitDirty(true)
    h.fireClose()
    reportQuitFlushResult('quit-flush-1', false)
    await drain()
    expect(h.destroys).toBe(1)
  })

  it('dirty→回执 true→confirm；取消=窗口保持', async () => {
    const h = harness!
    setQuitDirty(true)
    h.fireClose()
    reportQuitFlushResult('quit-flush-1', true)
    await drain()
    expect(h.confirms).toHaveBeenCalledTimes(1)
    expect(h.destroys).toBe(0)
  })

  it('握手中二次 close：再 preventDefault+flush 恰一发（busy 重入单发）', () => {
    const h = harness!
    h.fireClose()
    const second = h.fireClose()
    expect(second.preventDefault).toHaveBeenCalledTimes(1)
    expect(h.frames).toHaveLength(1)
  })

  it('迟到旧 id 回执不误伤：cancel→reclose→旧 id receipt(false) 不销毁', async () => {
    const h = harness!
    h.fireClose()
    await h.advance(QUIT_CLEAN_GRACE_MS)
    await drain()
    h.fireClose()
    reportQuitFlushResult('quit-flush-1', false)
    await drain()
    expect(h.destroys).toBe(0)
    expect(h.frames).toHaveLength(2)
  })

  it('发送面异常（sendQuitFlushFrame throw）：confirm 降级（窗口保持 on 取消）', () => {
    const clock = 0
    const confirms = vi.fn(async () => false)
    const closeListeners: CloseListener[] = []
    const win = {
      on(event: string, listener: (...args: never[]) => void): void {
        if (event === 'close') closeListeners.push(listener as CloseListener)
      },
      removeListener(): void {},
      destroy(): void {},
      isDestroyed(): boolean {
        return false
      },
      webContents: { on(): void {}, removeListener(): void {}, isDestroyed(): boolean { return false } }
    }
    const handle = installQuitCloseInterception(win, {
      now: () => clock,
      sendQuitFlushFrame: () => {
        throw new Error('webContents gone')
      },
      sendAbortFrame: () => undefined,
      confirmQuit: confirms
    })
    const event = { preventDefault: vi.fn() }
    for (const l of closeListeners) l(event)
    expect(event.preventDefault).toHaveBeenCalledTimes(1)
    expect(confirms).toHaveBeenCalledTimes(1)
    handle.dispose()
  })

  it('render-process-gone（握手等待中）：confirm 降级承接', () => {
    const h = harness!
    h.fireClose()
    h.fireGone()
    expect(h.confirms).toHaveBeenCalledTimes(1)
  })

  it('dirty 分级锚：5000ms 计时（1000ms 不确认、5000ms 确认恰一次）', async () => {
    const h = harness!
    setQuitDirty(true)
    h.fireClose()
    await h.advance(QUIT_CLEAN_GRACE_MS)
    expect(h.confirms).not.toHaveBeenCalled()
    await h.advance(QUIT_FLUSH_TIMEOUT_MS - QUIT_CLEAN_GRACE_MS)
    expect(h.confirms).toHaveBeenCalledTimes(1)
  })

  it('WC 内 dirty push 升级：clean close→setQuitDirty(true) 后 grace 到点不确认、t0+5000 确认', async () => {
    const h = harness!
    h.fireClose()
    h.setClock(100)
    h.advance(0)
    setQuitDirty(true)
    await h.advance(QUIT_CLEAN_GRACE_MS - 100)
    expect(h.confirms).not.toHaveBeenCalled()
    await h.advance(QUIT_FLUSH_TIMEOUT_MS - QUIT_CLEAN_GRACE_MS)
    expect(h.confirms).toHaveBeenCalledTimes(1)
  })

  it('dispose：三订阅摘除+幂等；dispose 后 close 零作用（policy 死面）', () => {
    const h = harness!
    h.handle.dispose()
    h.handle.dispose()
    expect(h.removed).toEqual(
      expect.arrayContaining(['close', 'closed', 'webContents:render-process-gone'])
    )
    const event = h.fireClose()
    expect(event.preventDefault).toHaveBeenCalledTimes(1)
    expect(h.frames).toHaveLength(0)
  })

  it('[轮2 W-r1-01·主控亲笔] 窗毁真驱动（真 C 态）：confirm 永不 resolve+同步 advance 不让出微任务→policy 持 C→destroyWin→closed 订阅链派发——closeConfirm 面零 abort 帧（C≠I 判别锚）+D+退订', () => {
    const h = makeHarness(false, true)
    h.fireClose()
    h.advance(QUIT_CLEAN_GRACE_MS)
    // confirm promise 在途（neverResolve）——policy 持 C 态（真 C 窗毁直证）
    expect(h.confirms).toHaveBeenCalledTimes(1)
    expect(h.aborts).toHaveLength(0)
    expect(() => h.destroyWin()).not.toThrow()
    // closed 派发→policy.windowDestroyed（C 态）→closeConfirm(no-op 效应)+D
    // +dispose→装配 teardown；emitDestroy=false——destroys 仅外部这一次
    expect(h.destroys).toBe(1)
    // C 态窗毁不走 C→I 解冻：全程零 abort 帧（对照=取消/同步抛错路径有 abort）
    expect(h.aborts).toHaveLength(0)
    // [64-e2e-hang 修复随语义变更]：销毁态订阅随对象消亡，teardown 零触摸——
    // removed 恒空（原 arrayContaining 三项断言基于「fake removeListener 永不抛
    // 且照常记录」的旧建模，在 Electron 销毁语义下不再成立）
    expect(h.removed).toEqual([])
  })

  it('[64-e2e-hang] clean 回执→destroy→closed 链全程不抛（销毁窗 teardown 零触摸）', async () => {
    const h = harness!
    h.fireClose()
    // 生产链复刻：receipt(clean)→destroyWindow→win.destroy()→closed 同步回调
    // →windowDestroyed→disposePolicy→teardown——此时窗已销毁，任何
    // removeListener/webContents 触摸抛 Object has been destroyed（未捕获异常
    // →Electron 原生 Error 框→e2e 无人点挂死）。修复=teardown 销毁态守卫。
    expect(() => reportQuitFlushResult('quit-flush-1', false)).not.toThrow()
    await drain()
    expect(h.destroys).toBe(1)
    expect(h.removed).toEqual([])
    // teardown 无条件段（timer+quitPolicy 引用清）不论销毁态必经——timer 面由
    // 此锚钉住；quitPolicy 残留死引用（D 态全 no-op）为良性面，不变量登记随
    // 后续票
    expect(vi.getTimerCount()).toBe(0)
    // 已知测试债（d1 W1 第三针实验实录，2026-10-18）：变异针「disposed=true
    // 后销毁态早退（跳过 timer+quitPolicy 清）」在本文件全断言面不可观测——
    // 本例 clean 回执路径 policy 已先行 clearCurrent（receipt→clearTimer 对冲
    // pending timer），teardown 到达时 timer.handle 已 null；quitPolicy 残留
    // 为 D 态死引用全 no-op。锚钉 timer 终态面（终态非零即红），清理面早退针
    // 留待不变量票（quitPolicy 清面）补可观测锚
  })

  it('[64-e2e-hang] wc 独亡（win 活）：dispose 零抛+win 侧订阅照拆+wc 侧跳过', () => {
    const h = harness!
    // 门二 W1 形：render-process-gone/行为位移下 webContents 先亡而窗仍活——
    // teardown 直触 wc.removeListener 同抛 Object has been destroyed。三格齐：
    // win 亡零触摸（上例）/wc 独亡 win 侧照拆（本例）/活窗全拆（既有 dispose 例）
    h.killWebContents()
    expect(() => h.handle.dispose()).not.toThrow()
    expect(h.removed).toEqual(expect.arrayContaining(['close', 'closed']))
    expect(h.removed).not.toContain('webContents:render-process-gone')
  })

  it('[回炉 W4] confirmQuit 同步抛错：按取消语义处理——窗口保持+abort 帧发出（C→I）', async () => {
    const clock = 0
    const closeLs: CloseListener[] = []
    const aborts: { requestId: string }[] = []
    const win = {
      on(event: string, listener: (...args: never[]) => void): void {
        if (event === 'close') closeLs.push(listener as CloseListener)
      },
      removeListener(): void {},
      destroy(): void {},
      isDestroyed(): boolean {
        return false
      },
      webContents: { on(): void {}, removeListener(): void {}, isDestroyed(): boolean { return false } }
    }
    const handle = installQuitCloseInterception(win, {
      now: () => clock,
      sendQuitFlushFrame: () => undefined,
      sendAbortFrame: (p) => {
        aborts.push(p)
      },
      confirmQuit: () => {
        throw new Error('dialog sync boom')
      }
    })
    const event = { preventDefault: vi.fn() }
    for (const l of closeLs) l(event)
    await vi.advanceTimersByTimeAsync(QUIT_CLEAN_GRACE_MS)
    for (let i = 0; i < 8; i++) await Promise.resolve()
    expect(aborts).toEqual([{ requestId: 'quit-flush-1' }])
    handle.dispose()
  })

  it('ipc/system reportQuitFlush 通道：回执透传注入并返回 { ok: true }', async () => {
    const seen: Array<{ requestId: string; stillDirty: boolean }> = []
    const ipc = createSystemIpc(
      makeIpcDeps({ reportQuitFlush: (requestId, stillDirty) => void seen.push({ requestId, stillDirty }) })
    )
    await expect(ipc.reportQuitFlush({ requestId: 'q-1', stillDirty: true })).resolves.toEqual({ ok: true })
    expect(seen).toEqual([{ requestId: 'q-1', stillDirty: true }])
  })
})
