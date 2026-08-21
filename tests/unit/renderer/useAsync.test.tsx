// @vitest-environment jsdom
import { expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { guardedDescribe } from '../../utils/guard'

/** 极简 hook 测试挂具：渲染调用 hook 的探针组件，捕获最新返回值 */
function renderProbe<T>(useHook: () => T): { current: () => T; unmount(): void; root: Root } {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  let value: T = undefined as unknown as T
  function Probe(): null {
    value = useHook()
    return null
  }
  act(() => {
    root.render(<Probe />)
  })
  return { current: () => value, unmount: () => { root.unmount(); host.remove() }, root }
}

guardedDescribe('SR-HK-01', 'useAsync —— 异步 hook', () => {
  it('初始不跑；run 后 loading=true，resolve 后 data 且 loading=false', async () => {
    vi.resetModules()
    const { useAsync } = await import('../../../src/renderer/shared/hooks/useAsync')
    let resolveFn: ((v: number) => void) | null = null
    const fn = vi.fn(
      () => new Promise<number>((res) => (resolveFn = res))
    )
    const probe = renderProbe(() => useAsync(fn, []))

    expect(fn).not.toHaveBeenCalled() // 显式 run 语义，deps 变化/挂载不自动跑
    expect(probe.current().data).toBeNull()
    expect(probe.current().loading).toBe(false)

    await act(async () => {
      void probe.current().run()
    })
    expect(fn).toHaveBeenCalledOnce()
    expect(probe.current().loading).toBe(true)

    await act(async () => {
      resolveFn?.(42)
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(probe.current().loading).toBe(false)
    expect(probe.current().data).toBe(42)
    expect(probe.current().error).toBeNull()
    probe.unmount()
  })

  it('reject 后 error 写中文消息，loading 复位', async () => {
    vi.resetModules()
    const { useAsync } = await import('../../../src/renderer/shared/hooks/useAsync')
    const fn = vi.fn(async () => {
      throw new Error('网络断了')
    })
    const probe = renderProbe(() => useAsync(fn, []))
    await act(async () => {
      await probe.current().run()
    })
    expect(probe.current().error).toBe('网络断了')
    expect(probe.current().loading).toBe(false)
    expect(probe.current().data).toBeNull()
    probe.unmount()
  })

  it('卸载后 resolve 不再 setState（无告警/无崩溃）', async () => {
    vi.resetModules()
    const { useAsync } = await import('../../../src/renderer/shared/hooks/useAsync')
    let resolveFn: ((v: number) => void) | null = null
    const fn = () => new Promise<number>((res) => (resolveFn = res))
    const probe = renderProbe(() => useAsync(fn, []))
    await act(async () => {
      void probe.current().run()
    })
    probe.unmount()
    await act(async () => {
      resolveFn?.(1)
      await Promise.resolve()
    })
    // 到这里没抛即通过
  })
})
