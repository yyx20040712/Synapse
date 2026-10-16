/**
 * [F-VISFB-14] 退出握手 main 侧测试（新建，always-active）。
 *
 * 锁链（票面三件套+d1 W4 四点之③④）：
 * - clean 放行零变；dirty → preventDefault → renderer flush（有限超时）→
 *   stillDirty=false=destroy 零确认／仍脏=confirm（QUIT_CONFIRM_MESSAGE 同族
 *   新值）→确认 destroy/取消保持；
 * - flushing 重入锁=二次 close 单发（INV-141④：requestQuitFlush 恰一次）；
 * - 超时降级回现状 confirm/destroy，迟到回执按 requestId 关联丢弃不误伤；
 * - IPC 回执通道 reportQuitFlush 透传（system 域装配锚）。
 */
import { describe, expect, it, vi } from 'vitest'
import {
  QUIT_CONFIRM_MESSAGE,
  QUIT_FLUSH_TIMEOUT_MS,
  createQuitFlushRequest,
  handleCloseWithQuitHandshake,
  reportQuitFlushResult
} from '../../../src/main/windows/main-window'
import { createSystemIpc } from '../../../src/main/ipc/system'
import { makeIpcDeps } from '../../utils/ipc-deps'

function makeEvent(): { preventDefault: ReturnType<typeof vi.fn> } {
  return { preventDefault: vi.fn() }
}

function makeWin(): { destroy: ReturnType<typeof vi.fn> } {
  return { destroy: vi.fn() }
}

/** send 桩捕获最近一次 requestId（模块级 seq 跨用例推进——回执一律动态取 id，
 *  禁硬编码〔硬编码=前序用例推进序贯后失配→超时假路径〕） */
function lastRequestId(send: ReturnType<typeof vi.fn>): string {
  const call = send.mock.calls.at(-1)
  if (!call) throw new Error('send 未被调用——requestId 无从捕获')
  return (call[0] as { requestId: string }).requestId
}

/** 微任务排空（async fn 链固定跳数——requestCloseDirty 面无关，本件链深 ≤4） */
async function drainMicrotasks(turns = 6): Promise<void> {
  for (let i = 0; i < turns; i++) await Promise.resolve()
}

describe('quit-handshake —— main 侧退出握手三件套（F-VISFB-14）', () => {
  it('QUIT_FLUSH_TIMEOUT_MS 预算锚=5000（单用户本地 SQLite——提案量级，主控集成窗核定）', () => {
    expect(QUIT_FLUSH_TIMEOUT_MS).toBe(5000)
  })

  it('QUIT_CONFIRM_MESSAGE 同族改值锚：含「未能自动保存」+「确认退出」（d1 W4④）', () => {
    expect(QUIT_CONFIRM_MESSAGE).toContain('未能自动保存')
    expect(QUIT_CONFIRM_MESSAGE).toContain('确认退出')
  })

  it('clean 态 close：不 preventDefault、不发 flush、不弹确认、不 destroy（现行为零变）', async () => {
    const event = makeEvent()
    const win = makeWin()
    const requestQuitFlush = vi.fn()
    const confirmQuit = vi.fn(async () => true)
    await handleCloseWithQuitHandshake(false, event, win, { confirmQuit, requestQuitFlush })
    expect(event.preventDefault).not.toHaveBeenCalled()
    expect(requestQuitFlush).not.toHaveBeenCalled()
    expect(confirmQuit).not.toHaveBeenCalled()
    expect(win.destroy).not.toHaveBeenCalled()
  })

  it('dirty + flush 回执 stillDirty=false：preventDefault 后 destroy 零确认（数据已存）', async () => {
    const event = makeEvent()
    const win = makeWin()
    const send = vi.fn()
    const request = createQuitFlushRequest(send)
    const requestQuitFlush = vi.fn(() => request())
    const confirmQuit = vi.fn(async () => true)
    const handshake = handleCloseWithQuitHandshake(true, event, win, { confirmQuit, requestQuitFlush })
    await drainMicrotasks()
    expect(requestQuitFlush).toHaveBeenCalledTimes(1)
    reportQuitFlushResult(lastRequestId(send), false)
    await handshake
    expect(event.preventDefault).toHaveBeenCalledTimes(1)
    expect(confirmQuit).not.toHaveBeenCalled()
    expect(win.destroy).toHaveBeenCalledTimes(1)
  })

  it('dirty + stillDirty=true + 确认：confirm 收同族文案 → destroy', async () => {
    const event = makeEvent()
    const win = makeWin()
    const send = vi.fn()
    const request = createQuitFlushRequest(send)
    const confirmQuit = vi.fn(async () => true)
    const handshake = handleCloseWithQuitHandshake(true, event, win, { confirmQuit, requestQuitFlush: () => request() })
    await drainMicrotasks()
    reportQuitFlushResult(lastRequestId(send), true)
    await handshake
    expect(confirmQuit).toHaveBeenCalledTimes(1)
    expect(confirmQuit).toHaveBeenCalledWith(QUIT_CONFIRM_MESSAGE)
    expect(win.destroy).toHaveBeenCalledTimes(1)
  })

  it('dirty + stillDirty=true + 取消：窗口保持（不 destroy）', async () => {
    const event = makeEvent()
    const win = makeWin()
    const send = vi.fn()
    const request = createQuitFlushRequest(send)
    const confirmQuit = vi.fn(async () => false)
    const handshake = handleCloseWithQuitHandshake(true, event, win, { confirmQuit, requestQuitFlush: () => request() })
    await drainMicrotasks()
    reportQuitFlushResult(lastRequestId(send), true)
    await handshake
    expect(win.destroy).not.toHaveBeenCalled()
  })

  it('超时降级：flush 无回执（timeoutMs=30）→ confirm 回现状路径；迟到回执不误伤不抛', async () => {
    const event = makeEvent()
    const win = makeWin()
    const send = vi.fn()
    const request = createQuitFlushRequest(send)
    const confirmQuit = vi.fn(async () => false)
    const handshake = handleCloseWithQuitHandshake(true, event, win, {
      confirmQuit,
      requestQuitFlush: () => request(),
      timeoutMs: 30
    })
    await handshake
    expect(confirmQuit).toHaveBeenCalledTimes(1)
    expect(win.destroy).not.toHaveBeenCalled()
    // 迟到回执：待答表已除名——resolve 无害（不抛、不复活 destroy）
    expect(() => reportQuitFlushResult(lastRequestId(send), false)).not.toThrow()
    await drainMicrotasks()
    expect(win.destroy).not.toHaveBeenCalled()
  })

  it('flushing 重入锁（INV-141④二次 close 单发）：握手中第二 close=再 preventDefault 后忽略，flush 恰一发', async () => {
    const event1 = makeEvent()
    const event2 = makeEvent()
    const win = makeWin()
    const send = vi.fn()
    const request = createQuitFlushRequest(send)
    const requestQuitFlush = vi.fn(() => request())
    const confirmQuit = vi.fn(async () => false)
    const first = handleCloseWithQuitHandshake(true, event1, win, { confirmQuit, requestQuitFlush })
    await drainMicrotasks()
    const second = handleCloseWithQuitHandshake(true, event2, win, { confirmQuit, requestQuitFlush })
    await second
    expect(requestQuitFlush).toHaveBeenCalledTimes(1)
    expect(event2.preventDefault).toHaveBeenCalledTimes(1)
    expect(win.destroy).not.toHaveBeenCalled()
    reportQuitFlushResult(lastRequestId(send), false)
    await first
    expect(win.destroy).toHaveBeenCalledTimes(1)
  })

  it('requestId 关联：旧笔迟到回执不 resolve 新笔（防握手串扰）', async () => {
    const request = createQuitFlushRequest(vi.fn())
    const call1 = request()
    const call2 = request()
    expect(call1.requestId).not.toBe(call2.requestId)
    let resolved2 = false
    void call2.result.then(() => {
      resolved2 = true
    })
    reportQuitFlushResult(call1.requestId, false)
    await drainMicrotasks()
    expect(resolved2).toBe(false)
    reportQuitFlushResult(call2.requestId, true)
    await expect(call2.result).resolves.toBe(true)
  })

  it('发送面异常（send throw）：按未知脏降级 → confirm 路径（窗口保持 on 取消）', async () => {
    const event = makeEvent()
    const win = makeWin()
    const requestQuitFlush = () => {
      throw new Error('webContents gone')
    }
    const confirmQuit = vi.fn(async () => false)
    await handleCloseWithQuitHandshake(true, event, win, { confirmQuit, requestQuitFlush })
    expect(event.preventDefault).toHaveBeenCalledTimes(1)
    expect(confirmQuit).toHaveBeenCalledTimes(1)
    expect(win.destroy).not.toHaveBeenCalled()
  })

  it('confirmQuit reject：按取消处理——窗口保持不抛出（W1 沿承）', async () => {
    const event = makeEvent()
    const win = makeWin()
    const send = vi.fn()
    const request = createQuitFlushRequest(send)
    const confirmQuit = vi.fn(async () => {
      throw new Error('dialog boom')
    })
    const handshake = handleCloseWithQuitHandshake(true, event, win, { confirmQuit, requestQuitFlush: () => request() })
    await drainMicrotasks()
    reportQuitFlushResult(lastRequestId(send), true)
    await expect(handshake).resolves.toBeUndefined()
    expect(win.destroy).not.toHaveBeenCalled()
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
