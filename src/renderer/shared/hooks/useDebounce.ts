/**
 * [SR-HK-02] useDebounce —— 防抖值（工单：open / weak）
 *
 * ── 行为层 ──
 * - const debounced = useDebounce(value, delayMs)：value 变化后 delay 无新变化才更新
 * - 卸载清 timer
 *
 * ── 接口层 ──
 * - export function useDebounce<T>(value: T, delayMs: number): T
 *
 * ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
 * - 测试：tests/unit/renderer/useDebounce.test.ts（已锁定，fake timers）
 */
import { NotImplementedError } from '@shared/app-error'

export function useDebounce<T>(_value: T, _delayMs: number): T {
  throw new NotImplementedError('SR-HK-02', 'useDebounce')
}
