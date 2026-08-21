// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { guardedDescribe } from '../../utils/guard'

guardedDescribe('SR-HK-02', 'useDebounce —— 防抖值', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('延迟内多次变化只取最后值', async () => {
    vi.resetModules()
    const { useDebounce } = await import('../../../src/renderer/shared/hooks/useDebounce')
    const values: Array<string | null> = []
    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)
    let setter: ((v: string) => void) | null = null
    function Probe({ value }: { value: string }): null {
      const debounced = useDebounce(value, 300)
      values.push(debounced)
      return null
    }
    // 受控外层模拟：用一个内部状态容器
    let current = 'a'
    setter = (v: string) => {
      current = v
      act(() => {
        root.render(<Probe value={current} />)
      })
    }
    act(() => {
      root.render(<Probe value={current} />)
    })
    setter('ab')
    setter('abc')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(310)
    })
    expect(values.at(-1)).toBe('abc')
    // 中途值不应出现 300ms 窗口外的中间态
    expect(values).not.toContain('ab')
    root.unmount()
    host.remove()
  })
})
