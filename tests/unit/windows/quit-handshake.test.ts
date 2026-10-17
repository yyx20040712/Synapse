/**
 * [F-VISFB-14] 退出握手 main 侧测试（新建，always-active；回炉轮 1 增 W-1/W-5）。
 *
 * 锁链（票面三件套+d1 W4 四点之③④）：
 * - clean 放行零变；dirty → preventDefault → renderer flush（有限超时）→
 *   stillDirty=false=destroy 零确认／仍脏=confirm（QUIT_CONFIRM_MESSAGE 同族
 *   新值）→确认 destroy/取消保持；
 * - flushing 重入锁=二次 close 单发（INV-141④：requestQuitFlush 恰一次）——
 *   含 dirty→clean 跨格交错（[回炉 W-1] busy 前置 clean 放行，不穿默认关闭）；
 * - 超时降级回现状 confirm/destroy，迟到回执按 requestId 关联丢弃不误伤；
 * - [回炉 W-5] send 抛错=rejection 同构除名（待答表零遗留）+可再起握手；
 * - IPC 回执通道 reportQuitFlush 透传（system 域装配锚）。
 */
import { describe, expect, it, vi } from 'vitest'
import {
  QUIT_CONFIRM_MESSAGE,
  QUIT_FLUSH_TIMEOUT_MS,
  createQuitFlushRequest,
  handleCloseWithQuitHandshake,
  quitFlushPendingSize,
  reportQuitFlushResult,
  setQuitDirty,
  getQuitDirty
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
    const send = vi.fn((_payload: { requestId: string }) => undefined)
    const request = createQuitFlushRequest(send)
    const requestQuitFlush = vi.fn(() => request())
    const confirmQuit = vi.fn(async () => false)
    const first = handleCloseWithQuitHandshake(true, event1, win, { confirmQuit, requestQuitFlush })
    await drainMicrotasks()
    // 第二 close 不 await——同步前缀（busy 判定/第二笔 flush 发起）即时生效
    const second = handleCloseWithQuitHandshake(true, event2, win, { confirmQuit, requestQuitFlush })
    await drainMicrotasks()
    // [回炉 W-6 m1 重构] 清理先行：send 全部回执（健康态恰一笔；变异态两笔
    // 全清）——断言后置=失败路径也不留悬挂待答，禁 5s 超时充当红证/清理
    for (const call of send.mock.calls) {
      reportQuitFlushResult(call[0].requestId, false)
    }
    await Promise.all([first, second])
    expect(requestQuitFlush).toHaveBeenCalledTimes(1)
    expect(event2.preventDefault).toHaveBeenCalledTimes(1)
    expect(win.destroy).toHaveBeenCalledTimes(1)
    expect(quitFlushPendingSize()).toBe(0)
  })

  it('[回炉 W-1] dirty→clean 跨格：flush 在途 renderer push dirty=false→二次 close 仍拦（不穿默认关闭）+单发', async () => {
    const event1 = makeEvent()
    const event2 = makeEvent()
    const win = makeWin()
    const send = vi.fn((_payload: { requestId: string }) => undefined)
    const request = createQuitFlushRequest(send)
    const requestQuitFlush = vi.fn(() => request())
    const confirmQuit = vi.fn(async () => false)
    const first = handleCloseWithQuitHandshake(true, event1, win, { confirmQuit, requestQuitFlush })
    await drainMicrotasks()
    // flush 在途：renderer push dirty=false（main 缓存翻 clean——bootstrap 实配
    // 读 getQuitDirty() 的交错模拟）
    setQuitDirty(false)
    expect(getQuitDirty()).toBe(false)
    const second = handleCloseWithQuitHandshake(getQuitDirty(), event2, win, { confirmQuit, requestQuitFlush })
    await drainMicrotasks()
    // 清理先行（同 m1 重构形态——失败路径不留悬挂）
    for (const call of send.mock.calls) {
      reportQuitFlushResult(call[0].requestId, false)
    }
    await Promise.all([first, second])
    expect(requestQuitFlush).toHaveBeenCalledTimes(1)
    expect(event2.preventDefault).toHaveBeenCalledTimes(1)
    expect(win.destroy).toHaveBeenCalledTimes(1)
    expect(quitFlushPendingSize()).toBe(0)
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

  it('[回炉 W-5] 真实工厂 send 抛错：rejection 同构除名（待答表零遗留）+可再起握手', async () => {
    const sendThrow = vi.fn((_payload: { requestId: string }) => {
      throw new Error('webContents gone')
    })
    const throwingRequest = createQuitFlushRequest(sendThrow)
    const event1 = makeEvent()
    const win1 = makeWin()
    const confirmQuit = vi.fn(async () => false)
    await handleCloseWithQuitHandshake(true, event1, win1, { confirmQuit, requestQuitFlush: () => throwingRequest() })
    expect(confirmQuit).toHaveBeenCalledTimes(1)
    // 表项已由 rejection 分支除名（quitFlushPendingSize 可观测锚）
    expect(quitFlushPendingSize()).toBe(0)
    // 迟到回执（表项已清）：不抛不复活
    const thrownId = sendThrow.mock.calls[0]![0].requestId
    expect(() => reportQuitFlushResult(thrownId, false)).not.toThrow()
    expect(quitFlushPendingSize()).toBe(0)
    // 可再起握手：换正常工厂→收发正常（同 confirmQuit 计数+1）
    const send = vi.fn()
    const request2 = createQuitFlushRequest(send)
    const event2 = makeEvent()
    const win2 = makeWin()
    const hs2 = handleCloseWithQuitHandshake(true, event2, win2, { confirmQuit, requestQuitFlush: () => request2() })
    await drainMicrotasks()
    reportQuitFlushResult(lastRequestId(send), true)
    await hs2
    expect(confirmQuit).toHaveBeenCalledTimes(2)
    expect(win2.destroy).not.toHaveBeenCalled()
    expect(quitFlushPendingSize()).toBe(0)
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
