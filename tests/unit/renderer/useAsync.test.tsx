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

  // ── 请求令牌锁定用例（UBS 批四 A3）：被取代调用的迟到 settle 不得污染新状态 ──
  // 缺陷形状（批一核实）：run#1 失败 + run#2 成功时，R1 的迟到 reject 在 run#2
  // setError(null) 之后到达 → error 残留在新鲜 data 上（消费方误报"刷新失败"）

  it('请求令牌：旧 run 的迟到失败不污染新 run 的成功态', async () => {
    vi.resetModules()
    const { useAsync } = await import('../../../src/renderer/shared/hooks/useAsync')
    let rejectOld!: (e: Error) => void
    let resolveNew!: (v: number) => void
    const fn = vi
      .fn()
      .mockImplementationOnce(() => new Promise<number>((_, rej) => (rejectOld = rej)))
      .mockImplementationOnce(() => new Promise<number>((res) => (resolveNew = res)))
    const probe = renderProbe(() => useAsync(fn, []))
    await act(async () => {
      void probe.current().run() // run#1（将失败）
    })
    await act(async () => {
      void probe.current().run() // run#2 起跑：setError(null)、token 前进
    })
    await act(async () => {
      resolveNew(42) // 新请求先成功
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(probe.current().data).toBe(42)
    expect(probe.current().loading).toBe(false)
    await act(async () => {
      rejectOld(new Error('旧请求失败')) // 旧失败此刻才到：必须被令牌丢弃
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(probe.current().error).toBeNull()
    expect(probe.current().data).toBe(42)
    expect(probe.current().loading).toBe(false)
    probe.unmount()
  })

  it('请求令牌：旧 run 的迟到成功不覆盖新 run 的 data', async () => {
    vi.resetModules()
    const { useAsync } = await import('../../../src/renderer/shared/hooks/useAsync')
    let resolveOld!: (v: number) => void
    let resolveNew!: (v: number) => void
    const fn = vi
      .fn()
      .mockImplementationOnce(() => new Promise<number>((res) => (resolveOld = res)))
      .mockImplementationOnce(() => new Promise<number>((res) => (resolveNew = res)))
    const probe = renderProbe(() => useAsync(fn, []))
    await act(async () => {
      void probe.current().run()
    })
    await act(async () => {
      void probe.current().run()
    })
    await act(async () => {
      resolveNew(2)
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(probe.current().data).toBe(2)
    await act(async () => {
      resolveOld(1) // 旧响应此刻才到：不得把 data 拉回旧值
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(probe.current().data).toBe(2)
    expect(probe.current().loading).toBe(false)
    probe.unmount()
  })

  it('请求令牌：新 run 在飞时旧 run 先 settle——loading 不得被旧调用误熄', async () => {
    vi.resetModules()
    const { useAsync } = await import('../../../src/renderer/shared/hooks/useAsync')
    let rejectOld!: (e: Error) => void
    let resolveNew!: (v: number) => void
    const fn = vi
      .fn()
      .mockImplementationOnce(() => new Promise<number>((_, rej) => (rejectOld = rej)))
      .mockImplementationOnce(() => new Promise<number>((res) => (resolveNew = res)))
    const probe = renderProbe(() => useAsync(fn, []))
    await act(async () => {
      void probe.current().run()
    })
    await act(async () => {
      void probe.current().run() // 新请求在飞
    })
    await act(async () => {
      rejectOld(new Error('旧请求失败')) // 旧失败先到：loading 必须保持 true
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(probe.current().loading).toBe(true)
    expect(probe.current().error).toBeNull()
    await act(async () => {
      resolveNew(7)
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(probe.current().loading).toBe(false)
    expect(probe.current().data).toBe(7)
    probe.unmount()
  })
})
