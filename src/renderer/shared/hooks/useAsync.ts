/**
 * [SR-HK-01] useAsync —— 异步调用 hook（工单：open / weak）
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
 * - 测试：tests/unit/renderer/useAsync.test.ts（已锁定，fake timers + 桩）
 */
import { NotImplementedError } from '@shared/app-error'

export function useAsync<T>(
  _fn: () => Promise<T>,
  _deps: unknown[]
): { data: T | null; loading: boolean; error: string | null; run(): Promise<void> } {
  throw new NotImplementedError('SR-HK-01', 'useAsync')
}
