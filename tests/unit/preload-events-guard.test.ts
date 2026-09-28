/**
 * preload 事件接收侧守卫行为（SR-IPC-10，D-GOV-4）——buildEvents 三订阅
 * （onImportProgress/onExportCorpus/onWindowState）的接收侧 safeParse 兜底：
 *
 * - 合法帧 → 透传 cb（等值载荷）；
 * - 畸形帧 → console.warn + 丢弃该帧（cb 不调）+ 订阅存活（不退订——事件流
 *   不因单帧死亡；三事件均通知/进度类，丢帧=陈旧一拍自愈）；
 * - 退订函数 → 摘除同一 listener。
 *
 * 变异锚：preload 校验摘除（listener 直通 payload）→ 畸形帧丢帧用例必红。
 * electron 全 mock（contextBridge/ipcRenderer/webUtils）——buildEvents 消费
 * mock ipcRenderer 的 on/removeListener 捕获 listener 直测。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

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

import { buildEvents } from '../../src/preload/index'
import { EVENT_CHANNELS } from '../../src/shared/ipc/api-surface'

type EventListener = (e: unknown, payload: unknown) => void

/** 取本用例内最后注册的 listener（onMock 每次 it 前 clear，单条即目标） */
function lastListener(): EventListener {
  const call = onMock.mock.calls.at(-1)
  if (!call) throw new Error('listener 未注册到 ipcRenderer.on')
  return call[1] as EventListener
}

const validImportProgress = {
  phase: 'copying',
  current: 2,
  total: 5,
  fileName: 'paper.pdf',
  sessionId: 's-1'
}
const validExportProgress = {
  type: 'progress',
  sessionId: 's-1',
  done: 3,
  total: 10,
  phase: 'streaming'
}

let warnSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  vi.clearAllMocks()
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  warnSpy.mockRestore()
})

describe('onImportProgress 守卫', () => {
  it('合法帧透传 cb（等值载荷）', () => {
    const cb = vi.fn()
    buildEvents().onImportProgress(cb)
    lastListener()(null, validImportProgress)
    expect(cb).toHaveBeenCalledTimes(1)
    expect(cb).toHaveBeenCalledWith(validImportProgress)
    expect(warnSpy).not.toHaveBeenCalled()
  })

  it('畸形帧丢帧（cb 不调）且订阅存活（不退订）+ console.warn', () => {
    const cb = vi.fn()
    buildEvents().onImportProgress(cb)
    // 缺 sessionId 的畸形帧
    lastListener()(null, { phase: 'copying', current: 1, total: 2, fileName: 'x.pdf' })
    expect(cb).not.toHaveBeenCalled()
    expect(removeListenerMock).not.toHaveBeenCalled()
    expect(warnSpy).toHaveBeenCalledTimes(1)
    expect(String(warnSpy.mock.calls[0]?.[0])).toContain(EVENT_CHANNELS.importProgress)
  })

  it('退订摘除同一 listener', () => {
    const cb = vi.fn()
    const unsub = buildEvents().onImportProgress(cb)
    const listener = lastListener()
    unsub()
    expect(removeListenerMock).toHaveBeenCalledWith(EVENT_CHANNELS.importProgress, listener)
  })
})

describe('onExportCorpus 守卫', () => {
  it('合法帧透传 cb（progress 分支）', () => {
    const cb = vi.fn()
    buildEvents().onExportCorpus(cb)
    lastListener()(null, validExportProgress)
    expect(cb).toHaveBeenCalledTimes(1)
    expect(cb).toHaveBeenCalledWith(validExportProgress)
  })

  it('畸形帧丢帧且订阅存活（判别键外值）', () => {
    const cb = vi.fn()
    buildEvents().onExportCorpus(cb)
    lastListener()(null, { type: 'unknown' })
    expect(cb).not.toHaveBeenCalled()
    expect(removeListenerMock).not.toHaveBeenCalled()
    expect(warnSpy).toHaveBeenCalledTimes(1)
  })

  it('退订摘除同一 listener', () => {
    const cb = vi.fn()
    const unsub = buildEvents().onExportCorpus(cb)
    const listener = lastListener()
    unsub()
    expect(removeListenerMock).toHaveBeenCalledWith(EVENT_CHANNELS.exportCorpus, listener)
  })
})

describe('onWindowState 守卫', () => {
  it('合法帧透传 cb', () => {
    const cb = vi.fn()
    buildEvents().onWindowState(cb)
    lastListener()(null, { maximized: true })
    expect(cb).toHaveBeenCalledTimes(1)
    expect(cb).toHaveBeenCalledWith({ maximized: true })
  })

  it('畸形帧丢帧且订阅存活（非布尔值）', () => {
    const cb = vi.fn()
    buildEvents().onWindowState(cb)
    lastListener()(null, { maximized: 'yes' })
    expect(cb).not.toHaveBeenCalled()
    expect(removeListenerMock).not.toHaveBeenCalled()
    expect(warnSpy).toHaveBeenCalledTimes(1)
  })

  it('畸形帧后合法帧仍可达（订阅真存活——非一次性）', () => {
    const cb = vi.fn()
    buildEvents().onWindowState(cb)
    const listener = lastListener()
    listener(null, { maximized: 'yes' })
    listener(null, { maximized: false })
    expect(cb).toHaveBeenCalledTimes(1)
    expect(cb).toHaveBeenCalledWith({ maximized: false })
  })

  it('退订摘除同一 listener', () => {
    const cb = vi.fn()
    const unsub = buildEvents().onWindowState(cb)
    const listener = lastListener()
    unsub()
    expect(removeListenerMock).toHaveBeenCalledWith(EVENT_CHANNELS.windowState, listener)
  })
})
