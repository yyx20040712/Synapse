// @vitest-environment jsdom
/**
 * [SR2-F-01] PageColumn —— 页列几何与懒渲染回收组件/纯函数测试（锁定合约）。
 *
 * 覆盖：布局纯函数（盒高/列宽/窗口/最近页/夹取）+渲染回收调度（桩
 * IntersectionObserver 驱动：窗口展开/离屏回收/渲染集上界）+页列就绪管线
 * （getPage 尺寸→onReady→占位盒全列）+scrollRequest 程序滚动（盒顶，
 * INV-29 单口消费）+zoom 重算（缓存乘法非重取）。
 * always-active（ADR-0017 裁决 3——新测试不经 guardedDescribe）。
 */
import { act, useEffect } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import {
  PageColumn,
  clampPageToColumn,
  columnWidth,
  nearestPage,
  pageBoxHeight,
  recycledPages,
  windowPages
} from '../../../src/renderer/features/reader/PageColumn'

/** 桩 IntersectionObserver：jsdom 无实现；report() 手动驱动可见性回调 */
class MockIO {
  static instances: MockIO[] = []
  cb: IntersectionObserverCallback
  targets = new Set<Element>()
  constructor(cb: IntersectionObserverCallback) {
    this.cb = cb
    MockIO.instances.push(this)
  }
  observe(t: Element): void {
    this.targets.add(t)
  }
  unobserve(t: Element): void {
    this.targets.delete(t)
  }
  disconnect(): void {
    this.targets.clear()
  }
  /** 按 data-page-box 值报告可见页集合（其余一律不可见） */
  report(visibles: number[]): void {
    const entries = [...this.targets].map((t) => ({
      target: t,
      isIntersecting: visibles.includes(Number((t as HTMLElement).dataset.pageBox)),
      intersectionRatio: 0
    }))
    this.cb(entries as unknown as IntersectionObserverEntry[], this as unknown as IntersectionObserver)
  }
}

/** 六页文档桩（全部 612×792） */
function makeDoc(pages: number): { doc: PDFDocumentProxy; getPage: ReturnType<typeof vi.fn> } {
  const getPage = vi.fn(async (no: number): Promise<{ view: number[] }> => ({ view: [0, 0, 612, 792 * (no === 1 ? 1 : 1)] }))
  const doc = { numPages: pages, getPage } as unknown as PDFDocumentProxy
  return { doc, getPage }
}

let root: Root | null = null
let host: HTMLDivElement | null = null

/** mount 即 flush 就绪管线（async getPage→setPageSizes→占位盒入 DOM） */
async function mount(node: JSX.Element): Promise<void> {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => {
    root?.render(node)
  })
}

function remount(node: JSX.Element): void {
  act(() => {
    root?.render(node)
  })
}

const renderedPages = (): number[] =>
  Array.from(host!.querySelectorAll<HTMLElement>('[data-rendered-page]'))
    .map((el) => Number(el.dataset.renderedPage))
    .sort((a, b) => a - b)

const boxCount = (): number => host!.querySelectorAll('[data-page-box]').length

/** 最近一次 IO 实例的 report 快捷入口 */
function report(visibles: number[]): void {
  const io = MockIO.instances.at(-1)
  expect(io).toBeDefined()
  act(() => {
    io!.report(visibles)
  })
}



beforeEach(() => {
  MockIO.instances = []
  // React 18 act 契约：异步 setState 后的 DOM 断言需要 act 环境标志
  // （先例 ai-annotation-layer.test 为同步断言不依赖；本文件就绪管线是异步链）
  ;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
  vi.stubGlobal('IntersectionObserver', MockIO)
  // jsdom 无 canvas 实现：stub getContext 返回 null（渲染单元按防御分支短路，
  // 消 stderr 噪音——真实渲染由 e2e 锚）
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
  Element.prototype.scrollIntoView = vi.fn()
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
  vi.unstubAllGlobals()
  delete (Element.prototype as Partial<Element>).scrollIntoView
})

describe('PageColumn 纯函数（段①②：几何与窗口）', () => {
  it('clampPageToColumn：1 基页码夹取 [1, totalPages]（W-A 越界夹取的 scrollToPage 前哨）', () => {
    expect(clampPageToColumn(5, 10)).toBe(5)
    expect(clampPageToColumn(0, 10)).toBe(1)
    expect(clampPageToColumn(-3, 10)).toBe(1)
    expect(clampPageToColumn(99, 10)).toBe(10)
    expect(clampPageToColumn(4.7, 10)).toBe(4)
    expect(clampPageToColumn(1, 0)).toBe(1)
  })

  it('columnWidth：最宽页×zoom（floor）；pageBoxHeight：页高×zoom（floor）', () => {
    const sizes = [
      { width: 612, height: 792 },
      { width: 300, height: 400 }
    ]
    expect(columnWidth(sizes, 1)).toBe(612)
    expect(columnWidth(sizes, 1.5)).toBe(918)
    expect(columnWidth([], 1)).toBe(0)
    expect(pageBoxHeight({ width: 612, height: 792 }, 1)).toBe(792)
    expect(pageBoxHeight({ width: 612, height: 792 }, 1.5)).toBe(1188)
    expect(pageBoxHeight({ width: 612, height: 792 }, 0.5)).toBe(396)
  })

  it('windowPages：可见页±renderWindow，边界夹 [1,totalPages]；空可见=顶部引导窗口', () => {
    expect(windowPages(new Set([3]), 6, 1)).toEqual([2, 3, 4])
    expect(windowPages(new Set([1]), 6, 1)).toEqual([1, 2])
    expect(windowPages(new Set([6]), 6, 1)).toEqual([5, 6])
    expect(windowPages(new Set([1, 6]), 6, 1)).toEqual([1, 2, 5, 6])
    expect(windowPages(new Set([3]), 6, 2)).toEqual([1, 2, 3, 4, 5])
    // 初始引导：IO 未报可见时从页列顶渲染（renderWindow 窗口）
    expect(windowPages(new Set(), 6, 1)).toEqual([1, 2])
    expect(windowPages(new Set(), 6, 0)).toEqual([1])
    expect(windowPages(new Set(), 0, 1)).toEqual([])
  })

  it('recycledPages：已渲染页距任一可见页≤recycleWindow 才保留（离屏必回收——INV-30）', () => {
    expect([...recycledPages(new Set([2, 3, 4]), new Set([3]), 2)].sort().map(Number)).toEqual([2, 3, 4])
    expect([...recycledPages(new Set([2, 3, 4]), new Set([5]), 2)].sort().map(Number)).toEqual([3, 4])
    expect([...recycledPages(new Set([2, 3, 4]), new Set([8]), 2)].sort().map(Number)).toEqual([])
    expect([...recycledPages(new Set([2, 3, 4]), new Set(), 2)].sort().map(Number)).toEqual([])
  })

  it('nearestPage：视口中心落入盒即该页；盒外取盒中心最近者（F-03 回写的几何前置）', () => {
    const boxes = [
      { top: 0, height: 100 },
      { top: 100, height: 100 },
      { top: 200, height: 100 }
    ]
    expect(nearestPage(50, boxes)).toBe(1)
    expect(nearestPage(150, boxes)).toBe(2)
    expect(nearestPage(250, boxes)).toBe(3)
    expect(nearestPage(-40, boxes)).toBe(1)
    expect(nearestPage(400, boxes)).toBe(3)
    expect(nearestPage(99, boxes)).toBe(1)
    expect(nearestPage(101, boxes)).toBe(2)
    expect(nearestPage(0, [])).toBe(1)
  })
})

describe('PageColumn 组件（段①③⑤：就绪管线+IO 窗口回收+程序滚动）', () => {
  it('就绪管线：doc 就绪→逐页 getPage 尺寸→占位盒全列（总页数个）→onReady', async () => {
    const { doc, getPage } = makeDoc(6)
    const onReady = vi.fn()
    await mount(
      <PageColumn
        doc={doc}
        totalPages={6}
        zoom={1}
        renderPage={(no) => <span data-rendered-page={no} />}
        onPageRender={() => undefined}
        onError={() => undefined}
        onReady={onReady}
      />
    )
        const calledPages = new Set(getPage.mock.calls.map((c) => c[0] as number))
    for (let n = 1; n <= 6; n += 1) expect(calledPages).toContain(n)
    expect(onReady).toHaveBeenCalledTimes(1)
    expect(boxCount()).toBe(6)
    // 占位盒高=页原始高×zoom（未渲染盒空白但几何确定）
    const first = host!.querySelector<HTMLElement>('[data-page-box="1"]')!
    expect(first.style.height).toBe('792px')
    expect(first.style.width).toBe('612px')
  })

  it('初始引导渲染：IO 未报可见时渲染顶部 renderWindow 窗口（第 1 页起步）', async () => {
    const { doc } = makeDoc(6)
    await mount(
      <PageColumn
        doc={doc}
        totalPages={6}
        zoom={1}
        renderPage={(no) => <span data-rendered-page={no} />}
        onPageRender={() => undefined}
        onError={() => undefined}
      />
    )
        expect(renderedPages()).toEqual([1, 2])
  })

  it('IO 报可见 {3}：渲染窗口 {2,3,4}（视口±renderWindow 真渲染）+onVisibleChange 上抛', async () => {
    const { doc } = makeDoc(6)
    const onVisibleChange = vi.fn()
    await mount(
      <PageColumn
        doc={doc}
        totalPages={6}
        zoom={1}
        renderPage={(no) => <span data-rendered-page={no} />}
        onPageRender={() => undefined}
        onError={() => undefined}
        onVisibleChange={onVisibleChange}
      />
    )
        report([3])
    // 初始引导已渲染 {1,2}：页 1 距可见页 3 为 2≤recycleWindow——仍在缓冲内保留
    expect(renderedPages()).toEqual([1, 2, 3, 4])
    expect(onVisibleChange).toHaveBeenCalledWith([3])
  })

  it('快速滚动：可见移至 {8}→旧窗口 {2,3,4} 全回收、新窗口 {7,8,9} 渲染（离屏>recycleWindow 必卸载——INV-30）', async () => {
    const { doc } = makeDoc(9)
    await mount(
      <PageColumn
        doc={doc}
        totalPages={9}
        zoom={1}
        renderPage={(no) => <span data-rendered-page={no} />}
        onPageRender={() => undefined}
        onError={() => undefined}
      />
    )
        report([3])
    expect(renderedPages()).toEqual([1, 2, 3, 4])
    report([8])
    expect(renderedPages()).toEqual([7, 8, 9])
  })

  it('渲染集上界：任意时刻渲染页数 ≤ 可见页数×(2·recycleWindow+1)（canvas 内存断言的组件级锚）', async () => {
    const { doc } = makeDoc(9)
    await mount(
      <PageColumn
        doc={doc}
        totalPages={9}
        zoom={1}
        renderPage={(no) => <span data-rendered-page={no} />}
        onPageRender={() => undefined}
        onError={() => undefined}
      />
    )
    for (const visibles of [[1], [2], [4], [8], [9], [1, 9], [5]]) {
      report(visibles)
      const rendered = renderedPages()
      expect(rendered.length).toBeLessThanOrEqual(visibles.length * (2 * 2 + 1))
      for (const p of rendered) {
        expect(visibles.some((v) => Math.abs(p - v) <= 2)).toBe(true)
      }
    }
  })

  it('scrollRequest 程序滚动：就绪后到达→目标页盒 scrollIntoView（block:start=盒顶，0 基页→1 基盒）', async () => {
    const { doc } = makeDoc(6)
    const req = { paperId: 'p-1', page: 2, seq: 1 }
    await mount(
      <PageColumn
        doc={doc}
        totalPages={6}
        zoom={1}
        renderPage={(no) => <span data-rendered-page={no} />}
        onPageRender={() => undefined}
        onError={() => undefined}
        scrollRequest={req}
      />
    )
    const target = host!.querySelector<HTMLElement>('[data-page-box="3"]')!
    expect(target.scrollIntoView).toHaveBeenCalledWith({ block: 'start' })
  })

  it('scrollRequest 早于就绪到达：页列就绪后补滚（onReady 恢复链的几何前置）', async () => {
    const { doc } = makeDoc(6)
    const req = { paperId: 'p-1', page: 5, seq: 7 }
    const el = (
      <PageColumn
        doc={doc}
        totalPages={6}
        zoom={1}
        renderPage={(no) => <span data-rendered-page={no} />}
        onPageRender={() => undefined}
        onError={() => undefined}
        scrollRequest={req}
      />
    )
    // 同步渲染（不 flush 就绪管线）：loading 分支下不滚——信号挂起
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    act(() => {
      root?.render(el)
    })
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled()
    // 就绪落定（async act flush）：信号补滚到目标页盒顶
    await act(async () => {
      root?.render(el)
    })
    expect(host.querySelector<HTMLElement>('[data-page-box="6"]')!.scrollIntoView).toHaveBeenCalledWith({ block: 'start' })
  })

  it('zoom 变化：盒高按新 zoom 重算且尺寸缓存不重取（getPage 调用数不变——缓存乘法）', async () => {
    const { doc, getPage } = makeDoc(6)
    const el = (
      <PageColumn
        doc={doc}
        totalPages={6}
        zoom={1}
        renderPage={(no) => <span data-rendered-page={no} />}
        onPageRender={() => undefined}
        onError={() => undefined}
      />
    )
    await mount(el)
    const before = getPage.mock.calls.length
    remount(
      <PageColumn
        doc={doc}
        totalPages={6}
        zoom={2}
        renderPage={(no) => <span data-rendered-page={no} />}
        onPageRender={() => undefined}
        onError={() => undefined}
      />
    )
    // 尺寸缓存不重取：增量仅来自渲染窗口页的 canvas 重渲（≤2·renderWindow+1），非全列重取
    await act(async () => {
      await Promise.resolve()
    })
    expect(getPage.mock.calls.length - before).toBeLessThanOrEqual(2 * 1 + 1)
    expect(host!.querySelector<HTMLElement>('[data-page-box="1"]')!.style.height).toBe('1584px')
    expect(host!.querySelector<HTMLElement>('[data-page-box="1"]')!.style.width).toBe('1224px')
  })

  it('doc 置空（换文献窗口）：回 loading——占位清空不渲染任何页', async () => {
    const { doc } = makeDoc(6)
    const el = (d: PDFDocumentProxy | null): JSX.Element => (
      <PageColumn
        doc={d}
        totalPages={d === null ? 0 : 6}
        zoom={1}
        renderPage={(no) => <span data-rendered-page={no} />}
        onPageRender={() => undefined}
        onError={() => undefined}
      />
    )
    await mount(el(doc))
    expect(boxCount()).toBe(6)
    remount(el(null))
    expect(boxCount()).toBe(0)
    expect(renderedPages()).toEqual([])
  })

  it('W2 门一回炉：就绪管线 getPage 失败→onError 被调+不 onReady（error 终态——INV-02 失败可见，无 unhandled rejection）', async () => {
    const getPage = vi.fn(async (_no: number): Promise<{ view: number[] }> => {
      throw new Error('页对象损坏')
    })
    const doc = { numPages: 3, getPage } as unknown as PDFDocumentProxy
    const onError = vi.fn()
    const onReady = vi.fn()
    await mount(
      <PageColumn
        doc={doc}
        totalPages={3}
        zoom={1}
        renderPage={(no) => <span data-rendered-page={no} />}
        onPageRender={() => undefined}
        onError={onError}
        onReady={onReady}
      />
    )
    expect(onError).toHaveBeenCalledTimes(1)
    expect(onError).toHaveBeenCalledWith(expect.stringContaining('页列尺寸'))
    expect(onReady).not.toHaveBeenCalled()
    // error 终态：不渲染占位盒（不再 loading 转圈）
    expect(boxCount()).toBe(0)
  })

  it('W3 门一回炉：页滚出回收窗→该页 renderPage 内容卸载哨触发（pageTexts/pageRoots 条目同删的机制锚——ReaderPage PageFrame 同型）', async () => {
    const { doc } = makeDoc(9)
    const recycled: number[] = []
    /** 卸载哨探针（与 ReaderPage PageFrame 同型：useEffect cleanup=卸载通知） */
    function Probe(props: { no: number; onRecycle: (no: number) => void }): JSX.Element {
      const { no, onRecycle } = props
      useEffect(() => () => onRecycle(no), [no, onRecycle])
      return <span data-rendered-page={no} />
    }
    const stableRecycle = (n: number): void => {
      recycled.push(n)
    }
    await mount(
      <PageColumn
        doc={doc}
        totalPages={9}
        zoom={1}
        renderPage={(no) => <Probe no={no} onRecycle={stableRecycle} />}
        onPageRender={() => undefined}
        onError={() => undefined}
      />
    )
    report([3])
    expect(recycled).toEqual([])
    // 可见移至 {8}：旧窗口 {1,2,3,4} 全部滚出回收窗→renderPage 内容卸载→哨触发
    report([8])
    expect([...recycled].sort((a, b) => a - b)).toEqual([1, 2, 3, 4])
    // 新窗口渲染在位（哨非全局卸载）
    expect(renderedPages()).toEqual([7, 8, 9])
  })
})
