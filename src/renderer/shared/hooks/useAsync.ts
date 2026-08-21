/**
 * [SR-HK-01] useAsync —— 异步调用 hook（工单：done / weak）
 *
 * ── 行为层 ──
 * - const { data, loading, error, run } = useAsync<T>(fn, deps)
 * - run() 触发；组件卸载后 setState 静默跳过（防泄漏警告）
 * - deps 变化不自动跑（显式 run 语义）；初始不跑
 *
 * ── 接口层 ──
 * - export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]):
 *     { data: T | null; loading: boolean; error: string | null; run(): Promise<void> }
 *
 * ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
 * - 测试：tests/unit/renderer/useAsync.test.tsx（已锁定，jsdom + renderProbe 挂具）
 */
import { useCallback, useEffect, useRef, useState } from 'react'

/** 始终持有入参最新快照：run() 执行时调用最新闭包，但 deps 变化本身不触发执行 */
interface AsyncSnapshot<T> {
  fn: () => Promise<T>
  deps: unknown[]
}

export function useAsync<T>(
  fn: () => Promise<T>,
  deps: unknown[]
): { data: T | null; loading: boolean; error: string | null; run(): Promise<void> } {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const snapshotRef = useRef<AsyncSnapshot<T>>({ fn, deps })
  useEffect(() => {
    snapshotRef.current = { fn, deps }
  })

  // 卸载标记：cleanup 置 false，之后 resolve/reject 一律不再 setState
  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const run = useCallback(async (): Promise<void> => {
    if (!mountedRef.current) return
    setLoading(true)
    setError(null)
    try {
      const result = await snapshotRef.current.fn()
      if (!mountedRef.current) return
      setData(result)
      setLoading(false)
    } catch (err) {
      if (!mountedRef.current) return
      setError(err instanceof Error ? err.message : String(err))
      setLoading(false)
    }
  }, [])

  return { data, loading, error, run }
}
