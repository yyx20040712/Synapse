/**
 * [F-VISFB-64] quit-dirty-guard 改写（契约变更随 F-VISFB-64——clean 直放/
 * quitDirtyGuard/handleCloseWithQuitGuard 纯函数族随无条件握手退役删除，设计稿
 * §⑪-6 豁免预批；断言强度沿承=判定面改 policy 自持快照+分级计时）。
 *
 * 锁链：
 * - setQuitDirty IPC 落点=quit-close-policy dirty-push（自持快照单一状态源——
 *   close 首快照的分级判定源，非放行依据）；
 * - 分级：clean→WC 1000ms/dirty→WD 5000ms/WC 内 push 升级换臂/WD 不降级；
 * - C 态 push 仅缓存+确认不叠；
 * - INV-91 lineagePending 缓存保留面（folders.service 消费零改）+IPC 透传。
 */
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import {
  installQuitCloseInterception,
  setLineagePending,
  getLineagePending,
  setQuitDirty
} from '../../../src/main/windows/main-window'
import { QUIT_CLEAN_GRACE_MS, QUIT_FLUSH_TIMEOUT_MS } from '../../../src/shared/constants'
import { createSystemIpc } from '../../../src/main/ipc/system'
import { makeIpcDeps } from '../../utils/ipc-deps'
import { guardedDescribe } from '../../utils/guard'

type CloseListener = (event: { preventDefault(): void }) => void

function makeHarness() {
  let clock = 0
  const closeLs: CloseListener[] = []
  const confirms = vi.fn(async () => false)
  const frames: { requestId: string }[] = []
  const win = {
    on(event: string, listener: (...args: never[]) => void): void {
      if (event === 'close') closeLs.push(listener as CloseListener)
    },
    removeListener(): void {},
    destroy(): void {},
    // [64-e2e-hang] QuitInterceptionWindow 补形（teardown 销毁态守卫所需）：
    // 本 harness 无销毁路径，恒 false——纯形状补齐，零断言面（门二 W1 轮：
    // QuitEventSink 亦补 isDestroyed，webContents 同形）
    isDestroyed(): boolean {
      return false
    },
    webContents: { on(): void {}, removeListener(): void {}, isDestroyed(): boolean { return false } }
  }
  const handle = installQuitCloseInterception(win, {
    now: () => clock,
    sendQuitFlushFrame: (p) => {
      frames.push(p)
    },
    sendAbortFrame: () => undefined,
    confirmQuit: confirms
  })
  return {
    confirms,
    frames,
    handle,
    fireClose() {
      const event = { preventDefault: vi.fn() }
      for (const l of [...closeLs]) l(event)
      return event
    },
    async advance(ms: number): Promise<void> {
      clock += ms
      await vi.advanceTimersByTimeAsync(ms)
      for (let i = 0; i < 6; i++) await Promise.resolve()
    }
  }
}

let h: ReturnType<typeof makeHarness> | null = null

beforeEach(() => {
  vi.useFakeTimers()
  h = makeHarness()
})

afterEach(() => {
  h?.handle.dispose()
  h = null
  vi.useRealTimers()
})

guardedDescribe('SR2-TABS-04', '退出拦截 dirty 链 —— policy 自持快照分级（F-VISFB-64 改写）', () => {
  it('setQuitDirty(true)→close=WD 分级：5000ms 计时（1000ms 不确认、5000ms 确认恰一次）', async () => {
    const harness = h!
    setQuitDirty(true)
    harness.fireClose()
    await harness.advance(QUIT_CLEAN_GRACE_MS)
    expect(harness.confirms).not.toHaveBeenCalled()
    await harness.advance(QUIT_FLUSH_TIMEOUT_MS - QUIT_CLEAN_GRACE_MS)
    expect(harness.confirms).toHaveBeenCalledTimes(1)
  })

  it('setQuitDirty 往返：true→false 后 close=WC 1000ms 分级（快照跟随最新 push）', async () => {
    const harness = h!
    setQuitDirty(true)
    setQuitDirty(false)
    harness.fireClose()
    await harness.advance(QUIT_CLEAN_GRACE_MS)
    expect(harness.confirms).toHaveBeenCalledTimes(1)
  })

  it('WC 内 dirty push 升级：clean close 后 push(true) 换臂——grace 到点不确认、t0+5000 确认', async () => {
    const harness = h!
    harness.fireClose()
    setQuitDirty(true)
    await harness.advance(QUIT_CLEAN_GRACE_MS)
    expect(harness.confirms).not.toHaveBeenCalled()
    await harness.advance(QUIT_FLUSH_TIMEOUT_MS - QUIT_CLEAN_GRACE_MS)
    expect(harness.confirms).toHaveBeenCalledTimes(1)
  })

  it('WD 不降级：dirty close 后 push(false) 计时不变（仍 5000ms 到点确认）', async () => {
    const harness = h!
    setQuitDirty(true)
    harness.fireClose()
    setQuitDirty(false)
    await harness.advance(QUIT_CLEAN_GRACE_MS)
    expect(harness.confirms).not.toHaveBeenCalled()
    await harness.advance(QUIT_FLUSH_TIMEOUT_MS - QUIT_CLEAN_GRACE_MS)
    expect(harness.confirms).toHaveBeenCalledTimes(1)
  })

  it('C 态 push 仅缓存+确认不叠：超时入 C 后 push 零新框', async () => {
    const harness = h!
    harness.fireClose()
    await harness.advance(QUIT_CLEAN_GRACE_MS)
    expect(harness.confirms).toHaveBeenCalledTimes(1)
    setQuitDirty(true)
    setQuitDirty(false)
    expect(harness.confirms).toHaveBeenCalledTimes(1)
  })
})

guardedDescribe(
  'SR2-TABS-04',
  'ipc/system 通道 —— dirty/pending 上报透传（头注「system.test.ts 扩展」的落位处置沿承）',
  () => {
    it('上报 dirty=true/false：透传注入的 setQuitDirty 并返回 { ok: true }', async () => {
      const seen: boolean[] = []
      const ipc = createSystemIpc(makeIpcDeps({ setQuitDirty: (d) => void seen.push(d) }))
      await expect(ipc.setQuitDirty({ dirty: true })).resolves.toEqual({ ok: true })
      await expect(ipc.setQuitDirty({ dirty: false })).resolves.toEqual({ ok: true })
      expect(seen).toEqual([true, false])
    })

    it('[F-FOLDER-01·回炉码 7] lineagePending 装配契约锚：同载荷透传注入的 setLineagePending（缺省 false=旧载荷兼容）', async () => {
      const seenPending: boolean[] = []
      const ipc = createSystemIpc(
        makeIpcDeps({ setLineagePending: (v) => void seenPending.push(v) })
      )
      await expect(ipc.setQuitDirty({ dirty: true, lineagePending: true })).resolves.toEqual({ ok: true })
      await expect(ipc.setQuitDirty({ dirty: false })).resolves.toEqual({ ok: true })
      expect(seenPending).toEqual([true, false])
    })
  }
)

guardedDescribe('SR2-TABS-04', 'lineagePending 缓存保留面（INV-91 S1 队列闸——folders.service 消费零改）', () => {
  it('setLineagePending/getLineagePending 往返（模块级缓存）', () => {
    setLineagePending(true)
    expect(getLineagePending()).toBe(true)
    setLineagePending(false)
    expect(getLineagePending()).toBe(false)
  })
})
