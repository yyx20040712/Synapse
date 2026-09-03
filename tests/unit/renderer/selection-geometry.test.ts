// @vitest-environment jsdom
/**
 * [F-A6-c] selection-geometry —— rAF 对齐调度器直测（always-active——ADR-0017
 * 裁决 3 不经 guardedDescribe）。
 *
 * 调度器测试锚显式声明（设计书 §5.3）：createVisualScheduler 现行（F-A4 B1 节流
 * 形态）无直测——行为锚=selection-paint.test S1b/S1c 组件级（grep tests/ 对
 * selection-geometry 直接 import 零命中，实测在档）。rAF 改形（F-A6-c）后
 * 「帧内合帧去重」=改形中唯一无现行对应物的新逻辑单元，至少锚一 it（本件 C1）
 * ——settle 防抖/cancel 语义随件锁定（票面 §1-A「逐字保持」条款的直测面）。
 *
 * 时序口径：vitest fake timers 默认 fake requestAnimationFrame
 * （advanceTimersByTimeAsync(16) 触发——设计书 §5.2 rAF×React 并发面申报；
 * 本仓实证：t=15 零回调/t=16 双回调）。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createVisualScheduler } from '../../../src/renderer/features/reader/selection-geometry'

describe('F-A6-c createVisualScheduler —— rAF 对齐双路调度', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('C1 帧内合帧去重（改形唯一无现行对应物的新逻辑单元）：同帧多次 selectionchange 恰一次 evaluateVisual；次帧新事件再排程', async () => {
    const onVisual = vi.fn()
    const onSettled = vi.fn()
    const s = createVisualScheduler({ onVisual, onSettled, windowMs: 200 })
    // 帧前三连发（同一帧内——已排程则不重排=帧内合帧去重）
    s.handler()
    s.handler()
    s.handler()
    // 视觉回调挂帧点（rAF 对齐——非事件内同步执行；leading 同步节流的旧形态在此红）
    expect(onVisual).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(16)
    expect(onVisual).toHaveBeenCalledTimes(1)
    // 次帧（rAF 句柄已释放）：新事件再次排程——去重只合帧不吞帧
    s.handler()
    await vi.advanceTimersByTimeAsync(16)
    expect(onVisual).toHaveBeenCalledTimes(2)
  })

  it('C2 leading 首事件即排 rAF（S1b 零反馈红线 ≤16ms）：单事件后一帧内 onVisual 落地', async () => {
    const onVisual = vi.fn()
    const s = createVisualScheduler({ onVisual, onSettled: () => undefined, windowMs: 200 })
    s.handler()
    await vi.advanceTimersByTimeAsync(16)
    expect(onVisual).toHaveBeenCalledTimes(1)
  })

  it('C3 settle 防抖 200ms 逐字保持（票面 §1-A）：窗内连发重置窗（基准=末事件）；距末事件 199ms 未 settle、200ms 到期恰一次（100ms 变异在 199ms 断言红）', async () => {
    const onSettled = vi.fn()
    const s = createVisualScheduler({ onVisual: () => undefined, onSettled, windowMs: 200 })
    s.handler()
    await vi.advanceTimersByTimeAsync(100)
    s.handler() // 窗内再发（t=100）→ 防抖窗重置（工具条弹出语义零变——基准=末事件）
    await vi.advanceTimersByTimeAsync(99) // t=199：距末事件 99ms
    expect(onSettled).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(100) // t=299：距末事件 199ms
    expect(onSettled).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1) // t=300：距末事件 200ms——到期
    expect(onSettled).toHaveBeenCalledTimes(1)
  })

  it('C4 cancel 清 rAF 句柄与防抖（INV-14 同型）：cancel 后推进帧与窗均零回调', async () => {
    const onVisual = vi.fn()
    const onSettled = vi.fn()
    const s = createVisualScheduler({ onVisual, onSettled, windowMs: 200 })
    s.handler()
    s.cancel()
    await vi.advanceTimersByTimeAsync(300)
    expect(onVisual).not.toHaveBeenCalled()
    expect(onSettled).not.toHaveBeenCalled()
  })
})
