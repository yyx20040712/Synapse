/**
 * [SR-HK-02] useDebounce —— 防抖值（工单：done / weak）
 *
 * ── 行为层 ──
 * - const debounced = useDebounce(value, delayMs)：value 变化后 delay 无新变化才更新
 * - 卸载清 timer（effect cleanup）
 *
 * ── 接口层 ──
 * - export function useDebounce<T>(value: T, delayMs: number): T
 *
 * ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
 * - 测试：tests/unit/renderer/useDebounce.test.tsx（已锁定，fake timers）
 */
import { useEffect, useState } from 'react'

export function useDebounce<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])

  return debounced
}
