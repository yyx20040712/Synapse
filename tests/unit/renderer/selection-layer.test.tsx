// @vitest-environment jsdom
/**
 * [SR2-F-02] SelectionLayer —— 动态锚定根组件测试（新文件入锁）。
 *
 * 覆盖（票面选区态状态机）：任意可见页划选（F-01 自裁 4 中间态解除——
 * 挂载盒≠选区所在页仍正确）/跨页选区拒绝+toast（主控裁决 5，INV-02 可见）/
 * 工具条落点以选区所在页盒为参照系（坐标换算经页盒 rect——N-C 防层叠污染）/
 * 保存页=选区所在页（0 基，动态推导）/Escape 清/承载选区的页 DOM 卸载
 * （页回收与 zoom 重建同机制）→选区清空防悬空锚/纯函数页盒遍历。
 * [F-A4 改向] P1 定位断言改归一坐标（工具条 left/top=视口差×
 * clientWidth/gBCR.width 比值——c 面坐标系双重放大缺陷的红证锚）；
 * F-08 守卫反转（ADR-0019 R1 修订：划选视觉=自绘并集层，::selection
 * transparent——原「pending 态 selRects 恒 null」防自绘回归守卫反转为
 * 自绘层在场断言；修订依据=F-A4 票面 §0a 用户根治令）。
 * always-active（ADR-0017 裁决 3 新测试不经 guardedDescribe）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub, stubUnwrap, toastSpy } from '../../utils/api-client-mock'
import { stubElementRects, stubRangeGBCR, type StubBox } from '../../utils/geometry'
import {
  SelectionLayer,
  closestPageRoot,
  pageIndexOf
} from '../../../src/renderer/features/reader/SelectionLayer'
import { usePageItemsStore } from '../../../src/renderer/features/reader/page-items.store'
import type { PdfTextContent, PdfTextItem } from '../../../src/renderer/features/reader/PdfPageCanvas'
import type { Annotation } from '@shared/models/annotation'

const saveMock = vi.fn()
makeApiStub({ reader: { saveAnnotation: saveMock } })
// unwrap 透传 Result.data（成功路径——失败路径不经组件分支外的形态）
stubUnwrap(async (p: Promise<{ ok: boolean; data: unknown }>): Promise<unknown> => {
  const r = await p
  return r.data
})

/** jsdom 无布局：元素 rect 按预设表返回（页盒几何——坐标换算断言的输入） */
const rects = new Map<Element, StubBox>()
/** jsdom Range 无布局方法：选区 rect 可变桩（视口坐标） */
let rangeRect = { x: 10, y: 900, width: 200, height: 20 }
let rangeStub: { restore(): void } | null = null

/** F-01 后结构：两页盒（data-page-root 1 基）各含 .textLayer（单 span 文本） */
function mountColumnFixture(): { page1: HTMLElement; page2: HTMLElement; span1: HTMLElement; span2: HTMLElement } {
  const page1 = document.createElement('div')
  page1.setAttribute('data-page-root', '1')
  page1.innerHTML = '<div class="textLayer"><span>page one alpha beta</span></div>'
  const page2 = document.createElement('div')
  page2.setAttribute('data-page-root', '2')
  page2.innerHTML = '<div class="textLayer"><span>page two gamma delta</span></div>'
  document.body.append(page1, page2)
  rects.set(page1, { x: 0, y: 0, width: 600, height: 800 })
  rects.set(page2, { x: 0, y: 812, width: 600, height: 800 })
  // [F-GEOM-01-G2 对账表 A] textLayer 盒桩（同页盒）：项几何链 base（归一化
  // 基准盒）与 G2 健康判定消费 gBCR——缺桩时 pixelBoxOf 兜底 1×1，项盒全越
  // 界 → G2 门误拦项链（回退态不挂工具条）
  rects.set(page1.querySelector('.textLayer')!, { x: 0, y: 0, width: 600, height: 800 })
  rects.set(page2.querySelector('.textLayer')!, { x: 0, y: 812, width: 600, height: 800 })
  return { page1, page2, span1: page1.querySelector('span')!, span2: page2.querySelector('span')! }
}

/** 程序化选选（jsdom 不自动派发 selectionchange——防抖路径需手动 dispatch） */
function selectRange(startNode: Node, startOff: number, endNode: Node, endOff: number): void {
  const sel = window.getSelection()
  const range = document.createRange()
  range.setStart(startNode, startOff)
  range.setEnd(endNode, endOff)
  sel?.removeAllRanges()
  sel?.addRange(range)
}

const fireSelectionChange = (): void => {
  document.dispatchEvent(new Event('selectionchange'))
}

/** 造项：transform=[10,0,0,10,x,y]（PDF 基线 (x,y)、字号 10、宽 100 高 10）
 *  ——[F-GEOM-01-G2 对账表 A] 页项桩三助手（crib selection-item-chain.test:63-76）：
 *  G2 保存门后回退态（item 链失败）不挂工具条，「工具条在场」用例需页项在位
 *  且对账通过（items 拼接==DOM 全文——fixture 页 2 文本 'page two gamma delta'） */
function mkItem(str: string, x: number, y: number): PdfTextItem {
  return { str, dir: 'ltr', width: 100, height: 10, transform: [10, 0, 0, 10, x, y], fontName: 'g1', hasEOL: false }
}

function mkText(items: PdfTextItem[]): PdfTextContent {
  return { items, styles: { g1: { fontFamily: 'serif', ascent: 0.8, descent: -0.2, vertical: false } }, lang: null }
}

/** 注册表写入口（PagesOverlay handlePageRender 的等价载荷——页号 1 基） */
function seedRegistry(no: number, text: PdfTextContent, rotate = 0, view: [number, number, number, number] = [0, 0, 612, 792]): void {
  act(() => {
    usePageItemsStore.getState().setEntry({ page: no, text, geometry: { rotate, view }, box: { w: 612, h: 792 } })
  })
}
const fireMouseUp = (): void => {
  document.dispatchEvent(new MouseEvent('mouseup'))
}
const fireMouseDownAt = (x: number, y: number): void => {
  document.dispatchEvent(new MouseEvent('mousedown', { clientX: x, clientY: y }))
}
const fireMouseUpAt = (x: number, y: number): void => {
  document.dispatchEvent(new MouseEvent('mouseup', { clientX: x, clientY: y }))
}

let root: Root | null = null
let host: HTMLDivElement | null = null
let onSaved: ReturnType<typeof vi.fn>

/** 挂载组件（挂载盒=props.pageRoot——F-01 挂载位：锚定页盒页根） */
async function mountLayer(pageRoot: HTMLElement): Promise<void> {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => {
    root?.render(<SelectionLayer pageRoot={pageRoot} paperId="p-1" page={0} onSaved={onSaved} />)
  })
}

const toolbar = (): HTMLElement | null => host?.querySelector<HTMLElement>('[data-testid="selection-toolbar"]') ?? null

/** 自绘选区并集层查询（F-A4 起 portal 渲染进选区所在页盒——document 级查询；
 *  R1 修订后=pending 态应在场，S5 语义断言归 selection-paint.test） */
const selRects = (): HTMLElement | null => document.querySelector<HTMLElement>('[data-testid="selection-rects"]') ?? null

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  rects.clear()
  usePageItemsStore.getState().clear()
  rangeRect = { x: 10, y: 900, width: 200, height: 20 }
  onSaved = vi.fn()
  ;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
  stubElementRects(rects)
  rangeStub = stubRangeGBCR(() => rangeRect)
  window.getSelection()?.removeAllRanges()
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
  rangeStub?.restore()
  document.body.innerHTML = ''
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('SelectionLayer 纯函数（F-02 页盒遍历）', () => {
  it('closestPageRoot：文本节点向上最近页盒（data-page-root）；页列外/空节点=null', () => {
    const { page2, span2 } = mountColumnFixture()
    expect(closestPageRoot(span2.firstChild)).toBe(page2)
    expect(closestPageRoot(page2)).toBe(page2)
    const aside = document.createElement('aside')
    aside.textContent = '侧栏文本'
    document.body.appendChild(aside)
    expect(closestPageRoot(aside.firstChild)).toBeNull()
    expect(closestPageRoot(null)).toBeNull()
  })

  it('pageIndexOf：data-page-root 值 1 基→0 基；缺失/非法值=null', () => {
    const { page1 } = mountColumnFixture()
    expect(pageIndexOf(page1)).toBe(0)
    const page5 = document.createElement('div')
    page5.setAttribute('data-page-root', '5')
    document.body.appendChild(page5)
    expect(pageIndexOf(page5)).toBe(4)
    expect(pageIndexOf(document.createElement('div'))).toBeNull()
    const bad = document.createElement('div')
    bad.setAttribute('data-page-root', 'x')
    document.body.appendChild(bad)
    expect(pageIndexOf(bad)).toBeNull()
  })
})

describe('SelectionLayer 动态锚定根（选区态状态机）', () => {
  it('P1 挂载盒≠选区页仍正确（F-01 自裁 4 中间态解除）：防抖路径工具条出现+坐标经页盒换算并÷有效 zoom（F-A4 c 面归一）', async () => {
    const { page1, span2 } = mountColumnFixture()
    seedRegistry(2, mkText([mkItem('page two gamma delta', 72, 700)]))
    // [F-A4] mount 有效 zoom 桩：clientWidth 480/gBCR 600=0.8（ui-scale/CSS
    // zoom 子树内的挂载盒——修前 gBCR 视口差直写 left/top 被再放大 1.25 倍）
    Object.defineProperty(page1, 'clientWidth', { value: 480, configurable: true })
    await mountLayer(page1)
    // 选区在页 2（挂载盒=页 1）——旧「固定锚定页」实现在此静默收起
    selectRange(span2.firstChild!, 0, span2.firstChild!, 4)
    fireSelectionChange()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200)
    })
    const bar = toolbar()
    expect(bar).not.toBeNull()
    // 落点以选区所在页盒为参照系（N-C）：视口域 x=10/y=858（900−812−42+812）
    // →÷zoom 归一到挂载盒本地（×0.8）——8/686.4
    expect(parseFloat(bar!.style.left)).toBeCloseTo(8, 2)
    expect(parseFloat(bar!.style.top)).toBeCloseTo(686.4, 1)
    expect(toastSpy).not.toHaveBeenCalled()
  })

  it('P2 跨页选区（anchorNode 页盒≠focusNode 页盒）：mouseup 拒绝+toast，无工具条（INV-02 禁静默）', async () => {
    const { page1, span1, span2 } = mountColumnFixture()
    await mountLayer(page1)
    selectRange(span1.firstChild!, 0, span2.firstChild!, 4)
    act(() => {
      fireMouseUp()
    })
    expect(toolbar()).toBeNull()
    expect(toastSpy).toHaveBeenCalledWith('选区跨页，不支持创建标注', 'info')
  })

  it('P2b 跨页选区的防抖路径不 toast（程序化/拖选中途——toast 只挂用户完成拖选的 mouseup 时刻）', async () => {
    const { page1, span1, span2 } = mountColumnFixture()
    await mountLayer(page1)
    selectRange(span1.firstChild!, 0, span2.firstChild!, 4)
    fireSelectionChange()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200)
    })
    expect(toolbar()).toBeNull()
    expect(toastSpy).not.toHaveBeenCalled()
  })

  it('P3 mouseup 即时评估：页内选区松手即出工具条（不等防抖窗——程序化选选走 P1 防抖，两路径互备）', async () => {
    const { page1, span2 } = mountColumnFixture()
    seedRegistry(2, mkText([mkItem('page two gamma delta', 72, 700)]))
    await mountLayer(page1)
    selectRange(span2.firstChild!, 0, span2.firstChild!, 4)
    act(() => {
      fireMouseUp()
    })
    expect(toolbar()).not.toBeNull()
  })

  it('F-12a 单击/双击误触不出条：mousedown→mouseup 位移 ~1.4px（<3px 阈值）——选区在场也收起（用户令「一点就出选项条」=误触发）', async () => {
    const { page1, span2 } = mountColumnFixture()
    await mountLayer(page1)
    selectRange(span2.firstChild!, 0, span2.firstChild!, 4)
    act(() => {
      fireMouseDownAt(100, 100)
      fireMouseUpAt(101, 101)
    })
    expect(toolbar()).toBeNull()
  })

  it('F-12b 真拖选出条：mousedown→mouseup 位移 ~5.8px（≥3px 阈值）——mouseup 即时评估路径保持', async () => {
    const { page1, span2 } = mountColumnFixture()
    seedRegistry(2, mkText([mkItem('page two gamma delta', 72, 700)]))
    await mountLayer(page1)
    selectRange(span2.firstChild!, 0, span2.firstChild!, 4)
    act(() => {
      fireMouseDownAt(100, 100)
      fireMouseUpAt(105, 103)
    })
    expect(toolbar()).not.toBeNull()
  })

  it('F-12c 无 mousedown 记录的 mouseup 放行（程序化 dispatch/键盘选区无鼠标轨迹——P3 兼容面显式化）', async () => {
    const { page1, span2 } = mountColumnFixture()
    seedRegistry(2, mkText([mkItem('page two gamma delta', 72, 700)]))
    await mountLayer(page1)
    selectRange(span2.firstChild!, 0, span2.firstChild!, 4)
    act(() => {
      fireMouseUp()
    })
    expect(toolbar()).not.toBeNull()
  })

  it('P4 保存页=选区所在页（0 基动态推导，非挂载页）：高亮落库参数+onSaved 回流', async () => {
    const { page1, span2 } = mountColumnFixture()
    seedRegistry(2, mkText([mkItem('page two gamma delta', 72, 700)]))
    await mountLayer(page1)
    selectRange(span2.firstChild!, 0, span2.firstChild!, 4)
    act(() => {
      fireMouseUp()
    })
    const saved: Annotation = {
      id: 'a-1', paperId: 'p-1', page: 1, kind: 'highlight', color: 'yellow',
      quoteText: 'page', prefixText: '', suffixText: '', startOffset: 0, endOffset: 4,
      rects: [], comment: '', createdAt: '2026-08-28T00:00:00Z', updatedAt: '2026-08-28T00:00:00Z'
    }
    saveMock.mockResolvedValue({ ok: true, data: saved })
    await act(async () => {
      const highlight = Array.from(toolbar()!.querySelectorAll<HTMLButtonElement>('button')).find(
        (b) => b.textContent === '高亮'
      )!
      highlight.click()
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(saveMock).toHaveBeenCalledTimes(1)
    const arg = saveMock.mock.calls[0]![0] as { annotation: { page: number; rects: Array<{ page: number }> } }
    expect(arg.annotation.page).toBe(1)
    expect(onSaved).toHaveBeenCalledWith(saved)
    // 保存成功即清选区（原生 removeAllRanges）
    expect(toolbar()).toBeNull()
  })

  it('P5 Escape 清：工具条出现后按 Esc 收起', async () => {
    const { page1, span2 } = mountColumnFixture()
    seedRegistry(2, mkText([mkItem('page two gamma delta', 72, 700)]))
    await mountLayer(page1)
    selectRange(span2.firstChild!, 0, span2.firstChild!, 4)
    act(() => {
      fireMouseUp()
    })
    expect(toolbar()).not.toBeNull()
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    })
    expect(toolbar()).toBeNull()
  })

  it('P6 选区所在页 DOM 卸载（页回收/zoom 文本层重建同机制）→选区清→工具条收（防悬空锚）', async () => {
    const { page1, page2, span2 } = mountColumnFixture()
    seedRegistry(2, mkText([mkItem('page two gamma delta', 72, 700)]))
    await mountLayer(page1)
    selectRange(span2.firstChild!, 0, span2.firstChild!, 4)
    act(() => {
      fireMouseUp()
    })
    expect(toolbar()).not.toBeNull()
    // 页回收：承载选区的页盒整体卸载+选区清空（浏览器原生行为——textLayer 卸载即坍缩）
    page2.remove()
    window.getSelection()?.removeAllRanges()
    fireSelectionChange()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200)
    })
    expect(toolbar()).toBeNull()
  })

  it('P7 页外选区（侧栏等与页盒无关）静默收起：无工具条无 toast', async () => {
    const { page1 } = mountColumnFixture()
    await mountLayer(page1)
    const aside = document.createElement('aside')
    aside.textContent = 'side content'
    document.body.appendChild(aside)
    selectRange(aside.firstChild!, 0, aside.firstChild!, 4)
    act(() => {
      fireMouseUp()
    })
    expect(toolbar()).toBeNull()
    expect(toastSpy).not.toHaveBeenCalled()
  })

  it('F-A4 守卫（反转）：pending 态（mouseup 后工具条在场）自绘并集层在场——ADR-0019 R1 修订', async () => {
    const { page1, span2 } = mountColumnFixture()
    seedRegistry(2, mkText([mkItem('page two gamma delta', 72, 700)]))
    await mountLayer(page1)
    selectRange(span2.firstChild!, 0, span2.firstChild!, 4)
    act(() => {
      fireMouseUp()
    })
    expect(toolbar()).not.toBeNull()
    // 划选视觉=自绘并集层（F-A4/ADR-0019 R1 修订：::selection transparent，
    // 单层单绘不叠深；原 0.20 双通道叠深缺陷的根治）——层缺位即红
    expect(selRects()).not.toBeNull()
    expect(document.querySelectorAll('[data-testid="selection-rect"]').length).toBeGreaterThanOrEqual(1)
  })
})
