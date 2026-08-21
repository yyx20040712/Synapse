import { beforeEach, describe, expect, it, vi } from 'vitest'
import { API_SURFACE, EVENT_CHANNELS } from '../../src/shared/ipc/api-surface'

/**
 * preload 暴露面对账（src/preload/index.ts 头部规约指定的契约测试）。
 * preload/index.ts 用双重类型断言把运行时对象交给 PreloadApi——类型层对不上
 * 编译器管不到，因此必须在运行时断言：window 上暴露的 api/apiEvents 与
 * API_SURFACE 接线表逐域逐方法一致（无多无少、通道名正确、请求透传）。
 * preload 属已完成基建（不在工单守卫范围），本组测试立即生效，不做延期。
 */
const exposed = vi.hoisted(() => new Map<string, unknown>())
const mocks = vi.hoisted(() => ({
  invoke: vi.fn<(channel: string, req: unknown) => Promise<unknown>>(),
  on: vi.fn<(channel: string, listener: (e: unknown, payload: unknown) => void) => void>(),
  removeListener: vi.fn<(channel: string, listener: unknown) => void>()
}))

vi.mock('electron', () => ({
  contextBridge: {
    exposeInMainWorld: (key: string, value: unknown): void => {
      exposed.set(key, value)
    }
  },
  ipcRenderer: mocks
}))

await import('../../src/preload/index')

type ApiShape = Record<string, Record<string, (req: unknown) => Promise<unknown>>>

function exposedApi(): ApiShape {
  const api = exposed.get('api')
  if (typeof api !== 'object' || api === null) throw new Error('window.api 未暴露')
  return api as ApiShape
}

describe('contracts/preload-surface —— 运行时暴露面与接线表一致', () => {
  beforeEach(() => {
    mocks.invoke.mockClear()
    mocks.on.mockClear()
    mocks.removeListener.mockClear()
  })

  it('window 只暴露 api 与 apiEvents 两个键（无额外泄漏面）', () => {
    expect([...exposed.keys()].sort()).toEqual(['api', 'apiEvents'])
  })

  it('api 暴露面与 API_SURFACE 逐域逐方法一致（无多无少）', () => {
    const api = exposedApi()
    expect(Object.keys(api).sort()).toEqual(Object.keys(API_SURFACE).sort())
    for (const [domain, methods] of Object.entries(API_SURFACE)) {
      expect(
        Object.keys(api[domain] ?? {}).sort(),
        `域 ${domain} 的方法集与接线表不一致`
      ).toEqual(Object.keys(methods).sort())
    }
  })

  it('每个方法按接线表通道转发且请求原样透传（全量对账，非抽样）', () => {
    const api = exposedApi()
    for (const [domain, methods] of Object.entries(API_SURFACE)) {
      for (const [method, ep] of Object.entries(methods)) {
        const fn = api[domain]?.[method]
        if (typeof fn !== 'function') throw new Error(`api.${domain}.${method} 不是函数`)
        const probe = { __probe: `${domain}.${method}` }
        void fn(probe)
        expect(
          mocks.invoke,
          `api.${domain}.${method} 应转发到通道 ${ep.channel}`
        ).toHaveBeenLastCalledWith(ep.channel, probe)
      }
    }
  })

  it('事件桥：订阅接线表事件通道并透传 payload，退订函数移除同一监听', () => {
    const events = exposed.get('apiEvents') as {
      onImportProgress(cb: (e: unknown) => void): () => void
    }
    let fire: ((payload: unknown) => void) | undefined
    mocks.on.mockImplementation((_channel, listener) => {
      fire = (payload: unknown) => listener(undefined, payload)
    })
    const received: unknown[] = []
    const off = events.onImportProgress((e) => received.push(e))

    expect(mocks.on).toHaveBeenCalledTimes(1)
    expect(mocks.on).toHaveBeenCalledWith(EVENT_CHANNELS.importProgress, expect.any(Function))
    fire?.({ phase: 'extracting', done: 1, total: 3 })
    expect(received).toEqual([{ phase: 'extracting', done: 1, total: 3 }])

    off()
    expect(mocks.removeListener).toHaveBeenCalledWith(
      EVENT_CHANNELS.importProgress,
      expect.any(Function)
    )
  })
})
