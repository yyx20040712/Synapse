// @vitest-environment jsdom
/**
 * [SR2-F-05] scroll-converge —— 程序滚动单容器收敛测试（always-active，
 * ADR-0017 裁决 3——不经 guardedDescribe）。
 *
 * 覆盖：最近滚动祖先选取（含嵌套两滚动容器取最近）/start 数学（盒顶对齐）/
 * center 数学（居中对齐）/顶底夹取/无滚动祖先不动（INV-34 单测锚）。
 * jsdom 无布局：getBoundingClientRect/scrollHeight/clientHeight 全部桩值；
 * scrollTop 赋值 jsdom 不做浏览器级夹取——故实现显式夹取（本文件断言锚）。
 * 数学正确性在此锚定；消费方（PageColumn 段⑤/anchor-locate flashElement）
 * 只断言 (元素, 对齐) 调用形（受锁三文件，P6 口径）；行为终审=e2e。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  nearestScrollAncestor,
  scrollIntoNearestScroller
} from '../../../src/renderer/features/reader/scroll-converge'

/** 桩盒几何：el 的 getBoundingClientRect 固定返回给定矩形 */
function stubRect(el: HTMLElement, top: number, height = 10): void {
  vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
    top, right: top + 10, bottom: top + height, left: 0, width: 10, height, x: 0, y: top,
    toJSON: () => ({})
  } as DOMRect)
}

/** 桩滚动容器的量纲（scrollHeight/clientHeight jsdom 恒 0——显式覆盖） */
function stubScrollDims(el: HTMLElement, scrollHeight: number, clientHeight: number): void {
  Object.defineProperty(el, 'scrollHeight', { value: scrollHeight, configurable: true })
  Object.defineProperty(el, 'clientHeight', { value: clientHeight, configurable: true })
}

interface Fixture {
  outer: HTMLElement
  mid: HTMLElement
  inner: HTMLElement
  target: HTMLElement
}

/** 嵌套两滚动容器夹具：outer(scroll) > mid > inner(auto) > target */
function buildNested(): Fixture {
  document.body.innerHTML = ''
  const outer = document.createElement('div')
  outer.style.overflowY = 'scroll'
  const mid = document.createElement('div')
  const inner = document.createElement('div')
  inner.style.overflowY = 'auto'
  const target = document.createElement('div')
  inner.appendChild(target)
  mid.appendChild(inner)
  outer.appendChild(mid)
  document.body.appendChild(outer)
  return { outer, mid, inner, target }
}

afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('scroll-converge —— 程序滚动单容器收敛（INV-34）', () => {
  it('最近滚动祖先选取：自 parentElement 向上首个 overflowY∈{auto,scroll}（越过 visible 中间层）', () => {
    const { outer, inner, target } = buildNested()
    expect(nearestScrollAncestor(target)).toBe(inner)
    // target 自身可滚也不算（从父级起寻）
    target.style.overflowY = 'auto'
    expect(nearestScrollAncestor(target)).toBe(inner)
    // 换 hidden 中间层：hidden 不入选（程序滚它=泄漏面，本票不变量）
    inner.style.overflowY = 'hidden'
    expect(nearestScrollAncestor(target)).toBe(outer)
  })

  it('无滚动祖先：不滚不抛（原 scrollIntoView 对无滚动容器元素同为无操作）', () => {
    document.body.innerHTML = ''
    const target = document.createElement('div')
    document.body.appendChild(target)
    expect(() => scrollIntoNearestScroller(target, 'start')).not.toThrow()
    expect(document.body.scrollTop).toBe(0)
    expect(document.documentElement.scrollTop).toBe(0)
  })

  it('start 数学：scrollTop += elRect.top − scrollerRect.top（盒顶对齐视口顶）；嵌套取最近——outer 零位移', () => {
    const { outer, inner, target } = buildNested()
    stubRect(inner, 100)
    stubRect(target, 550)
    stubScrollDims(inner, 2000, 400)
    stubScrollDims(outer, 3000, 600)
    inner.scrollTop = 30
    outer.scrollTop = 70
    scrollIntoNearestScroller(target, 'start')
    // 550 − 100 = +450 → 30+450 = 480
    expect(inner.scrollTop).toBe(480)
    expect(outer.scrollTop, '最近滚动祖先语义：更外层滚动容器零位移（INV-34）').toBe(70)
  })

  it('center 数学：scrollTop += (elRect.top + h/2) − (scrollerRect.top + clientH/2)（居中）', () => {
    const { inner, target } = buildNested()
    stubRect(inner, 100)
    stubRect(target, 900, 80)
    stubScrollDims(inner, 2000, 400)
    inner.scrollTop = 0
    scrollIntoNearestScroller(target, 'center')
    // (900+40) − (100+200) = 640
    expect(inner.scrollTop).toBe(640)
  })

  it('顶底夹取：目标在上方越界→夹 0；在下方越界→夹 scrollHeight−clientHeight（显式夹取，jsdom 无浏览器夹取）', () => {
    const f = buildNested()
    stubRect(f.inner, 100)
    stubScrollDims(f.inner, 2000, 400)
    f.inner.scrollTop = 50
    // 目标盒顶 60 < 容器顶 100 → raw 50+(60−100)=10？构造真越界：目标 30
    stubRect(f.target, 30)
    scrollIntoNearestScroller(f.target, 'start')
    expect(f.inner.scrollTop, 'raw=50+(30−100)=−20 → 夹 0').toBe(0)
    // 底夹取：目标盒顶 1900 → raw=0+(1900−100)=1800 > 2000−400=1600 → 夹 1600
    f.inner.scrollTop = 0
    stubRect(f.target, 1900)
    scrollIntoNearestScroller(f.target, 'start')
    expect(f.inner.scrollTop).toBe(1600)
  })

  it('闪烁链消费形：center 对 aside 自身滚动容器同构（el 的最近祖先=aside 列表容器——P3 语义单测锚）', () => {
    document.body.innerHTML = ''
    const aside = document.createElement('aside')
    aside.style.overflowY = 'auto'
    const item = document.createElement('div')
    aside.appendChild(item)
    document.body.appendChild(aside)
    stubRect(aside, 40)
    stubRect(item, 500, 20)
    stubScrollDims(aside, 900, 300)
    scrollIntoNearestScroller(item, 'center')
    // (500+10) − (40+150) = 320
    expect(aside.scrollTop).toBe(320)
    expect(document.documentElement.scrollTop).toBe(0)
  })
})
