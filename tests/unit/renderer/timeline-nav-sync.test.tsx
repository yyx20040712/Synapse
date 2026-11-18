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

  it('[ln-W3b-3] zoom 步进（无 scroll 事件）→ accent 立即按同一判定式重算；监听重挂后 scroll 仍实时', () => {
    useLineageViewStore.setState({ zoom: 1 }) // 本文件唯一 zoom 写点——显式归 1 防序内残留
    mount()
    expect(useLineageViewStore.getState().activeFrameKey).toBe('2022|9') // z=1：首框底缘 300>60=当前
    // zoom out 一档（transform 缩放改帧 gBCR——mock 首框滚出判定带）；不发 scroll
    const first = scroller!.querySelector('[data-frame-key="2022|9"]')!
    vi.spyOn(first, 'getBoundingClientRect').mockReturnValue({
      top: -100, bottom: -40, left: 0, right: 600, width: 600, height: 200, x: 0, y: -100,
      toJSON: () => ({})
    } as unknown as DOMRect)
    act(() => {
      useLineageViewStore.getState().zoomStep(-1)
    })
    // z=0.9：判定线 60×0.9=54——首框底缘 -40 已出带，次框（底缘 300>54）=当前
    expect(useLineageViewStore.getState().activeFrameKey).toBe('2022|10')
    // cleanup 成对（effect 随 zoom 重挂=监听器重挂）：scroll 事件仍实时换月
    const second = scroller!.querySelector('[data-frame-key="2022|10"]')!
    vi.spyOn(second, 'getBoundingClientRect').mockReturnValue({
      top: -60, bottom: -20, left: 0, right: 600, width: 600, height: 200, x: 0, y: -60,
      toJSON: () => ({})
    } as unknown as DOMRect)
    act(() => {
      scroller!.dispatchEvent(new Event('scroll'))
    })
    expect(useLineageViewStore.getState().activeFrameKey).toBeNull() // 两框均出带→无当前月
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
