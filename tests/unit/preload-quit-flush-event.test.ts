/**
 * [F-VISFB-14] preload onQuitFlush 事件桥测试（新建，always-active）。
 *
 * 锁链：退出握手 main→renderer 事件帧（requestId 关联）经 guardedEventForwarder
 * 接收侧兜底——合法帧透传 cb / 畸形帧 console.warn+丢弃+订阅存活（D-GOV-4
 * 沿承）；订阅通道=EVENT_CHANNELS.quitFlush。
 * [F-VISFB-64] 扩 abort 面：onQuitFlushAbort（C→I 解冻帧——同型接收侧兜底）。
 * electron 全 mock（preload-events-guard.test 同型）。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildEvents } from '../../src/preload/index'
import { EVENT_CHANNELS } from '../../src/shared/ipc/api-surface'

const { onMock, removeListenerMock } = vi.hoisted(() => ({
  onMock: vi.fn(),
  removeListenerMock: vi.fn()
}))

vi.mock('electron', () => ({
  contextBridge: { exposeInMainWorld: vi.fn() },
  ipcRenderer: {
    on: onMock,
    removeListener: removeListenerMock,
    invoke: vi.fn()
  },
  webUtils: { getPathForFile: vi.fn() }
}))

type EventListener = (e: unknown, payload: unknown) => void

function lastListener(): EventListener {
  const call = onMock.mock.calls.at(-1)
  if (!call) throw new Error('listener 未注册到 ipcRenderer.on')
  return call[1] as EventListener
}

let warnSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  vi.clearAllMocks()
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  warnSpy.mockRestore()
})

describe('preload onQuitFlush 桥（F-VISFB-14）', () => {
  it('订阅 quitFlush 通道：合法帧（requestId）等值透传 cb', () => {
    const received: unknown[] = []
    buildEvents().onQuitFlush((e) => received.push(e))
    expect(onMock).toHaveBeenCalledWith(EVENT_CHANNELS.quitFlush, expect.any(Function))
    expect(EVENT_CHANNELS.quitFlush).toBe('system/quit-flush/event')
    lastListener()(undefined, { requestId: 'quit-flush-1' })
    expect(received).toEqual([{ requestId: 'quit-flush-1' }])
  })

  it('畸形帧（缺 requestId）：warn+丢弃（cb 不调）+订阅存活；退订摘除同一 listener', () => {
    const received: unknown[] = []
    const off = buildEvents().onQuitFlush((e) => received.push(e))
    const listener = lastListener()
    listener(undefined, {})
    expect(received).toEqual([])
    expect(warnSpy).toHaveBeenCalledTimes(1)
    // 订阅存活：后续合法帧仍透传
    listener(undefined, { requestId: 'quit-flush-2' })
    expect(received).toEqual([{ requestId: 'quit-flush-2' }])
    off()
    expect(removeListenerMock).toHaveBeenCalledWith(EVENT_CHANNELS.quitFlush, listener)
  })
})

describe('preload onQuitFlushAbort 桥（F-VISFB-64——C→I 解冻帧）', () => {
  it('订阅 quitFlushAbort 通道：合法帧（requestId）等值透传 cb；通道名锚', () => {
    const received: unknown[] = []
    buildEvents().onQuitFlushAbort((e) => received.push(e))
    expect(onMock).toHaveBeenCalledWith(EVENT_CHANNELS.quitFlushAbort, expect.any(Function))
    expect(EVENT_CHANNELS.quitFlushAbort).toBe('system/quit-flush-abort/event')
    lastListener()(undefined, { requestId: 'quit-flush-3' })
    expect(received).toEqual([{ requestId: 'quit-flush-3' }])
  })

  it('畸形帧（空 requestId）：warn+丢弃+订阅存活；退订摘除同一 listener', () => {
    const received: unknown[] = []
    const off = buildEvents().onQuitFlushAbort((e) => received.push(e))
    const listener = lastListener()
    listener(undefined, { requestId: '' })
    expect(received).toEqual([])
    expect(warnSpy).toHaveBeenCalledTimes(1)
    listener(undefined, { requestId: 'quit-flush-4' })
    expect(received).toEqual([{ requestId: 'quit-flush-4' }])
    off()
    expect(removeListenerMock).toHaveBeenCalledWith(EVENT_CHANNELS.quitFlushAbort, listener)
  })
})
