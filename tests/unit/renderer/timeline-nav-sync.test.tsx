// @vitest-environment jsdom
/**
 * [F-LGRAPH-01①回炉 R5/R11] timeline-nav-sync 直测——定位分支（navScrollTarget
 * →月框 scrollIntoView+**消费后清空**——重挂载不重播上次定位）/上报分支（scroll
 * →activeFrameKey；[R5] 参考系=rect 差分——offsetTop 前提不成立：.tl-content
 * position:relative 使月框 offsetParent≠scroller）。always-active。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useTimelineNavSync } from '../../../src/renderer/features/lineage/timeline-nav-sync'
import { useLineageViewStore } from '../../../src/renderer/features/lineage/lineage-view.store'

;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | null = null
let host: HTMLDivElement | null = null

function Probe(props: { recomputeKey: unknown }): null {
  useTimelineNavSync(scrollerRef, props.recomputeKey) // 位置参数（签名同 LineageTimeline 挂载）——行为经 view.store 断言
  return null
}

let scroller: HTMLDivElement | null = null
const scrollerRef: { current: HTMLDivElement | null } = { current: null }

function mount(recomputeKey: unknown = 0): void {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  scroller = document.createElement('div')
  // 月框两枚（rect 差分驱动——jsdom 零布局经 gBCR stub 定值）
  for (const [key, top] of [
    ['2022|9', 100],
    ['2022|10', 400]
  ] as Array<[string, number]>) {
    const f = document.createElement('div')
    f.dataset.frameKey = key
    vi.spyOn(f, 'getBoundingClientRect').mockReturnValue({
      top, bottom: top + 200, left: 0, right: 600, width: 600, height: 200, x: 0, y: top,
      toJSON: () => ({})
    } as unknown as DOMRect)
    scroller.appendChild(f)
  }
  vi.spyOn(scroller, 'getBoundingClientRect').mockReturnValue({
    top: 0, bottom: 800, left: 0, right: 600, width: 600, height: 800, x: 0, y: 0,
    toJSON: () => ({})
  } as unknown as DOMRect)
  host.appendChild(scroller)
  scrollerRef.current = scroller
  act(() => {
    root?.render(<Probe recomputeKey={recomputeKey} />)
  })
}

beforeEach(() => {
  // jsdom 未实现 scrollIntoView——全局 stub（用例级 spy 覆盖断言）
  Element.prototype.scrollIntoView = vi.fn()
  useLineageViewStore.setState({
    mode: 'browse',
    focusSet: [],
    navCollapsed: false,
    navWidth: 208,
    navScrollTarget: null,
    activeFrameKey: null
  })
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
  scroller = null
  scrollerRef.current = null
  vi.restoreAllMocks()
})

describe('F-LGRAPH-01①回炉 timeline-nav-sync —— 定位分支', () => {
  it('[R11] 消费后清空：navScrollTarget 发射→月框 scrollIntoView+target 归 null（重挂载不重播）', () => {
    const intoView = vi.fn()
    mount()
    const frame = scroller!.querySelector('[data-frame-key="2022|10"]')!
    vi.spyOn(frame, 'scrollIntoView').mockImplementation(intoView)
    act(() => {
      useLineageViewStore.getState().requestFrameScroll('2022|10')
    })
    expect(intoView).toHaveBeenCalledWith({ block: 'start' }) // 定位生效
    expect(useLineageViewStore.getState().navScrollTarget).toBeNull() // [R11] 消费即清
  })

  it('target=null 或月框缺席：零动作不抛（防御面）', () => {
    mount()
    act(() => {
      useLineageViewStore.getState().requestFrameScroll('9999|1') // 缺席键
    })
    expect(useLineageViewStore.getState().navScrollTarget).toBeNull() // 清空路径同走（防御收口）
  })
})

describe('F-LGRAPH-01①回炉 timeline-nav-sync —— 上报分支（[R5] rect 差分参考系）', () => {
  it('挂载即上报首月（视口上段含首框）；scroll 事件实时换月', () => {
    mount()
    expect(useLineageViewStore.getState().activeFrameKey).toBe('2022|9') // 首框底缘 300>60=当前
    // 滚动：首框滚出视口（top 100→-400 视口系）→次框当前
    const first = scroller!.querySelector('[data-frame-key="2022|9"]')!
    vi.spyOn(first, 'getBoundingClientRect').mockReturnValue({
      top: -400, bottom: -200, left: 0, right: 600, width: 600, height: 200, x: 0, y: -400,
      toJSON: () => ({})
    } as unknown as DOMRect)
    act(() => {
      scroller!.dispatchEvent(new Event('scroll'))
    })
    expect(useLineageViewStore.getState().activeFrameKey).toBe('2022|10')
  })

  it('全空画布（零月框）：activeFrameKey=null 防御', () => {
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    scroller = document.createElement('div')
    host.appendChild(scroller)
    scrollerRef.current = scroller
    act(() => {
      root?.render(<Probe recomputeKey={0} />)
    })
    expect(useLineageViewStore.getState().activeFrameKey).toBeNull()
  })
})
