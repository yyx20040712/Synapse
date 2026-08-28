// @vitest-environment jsdom
/**
 * [SR2-F-02] SelectionLayer —— 动态锚定根组件测试（新文件入锁）。
 *
 * 覆盖（票面选区态状态机）：任意可见页划选（F-01 自裁 4 中间态解除——
 * 挂载盒≠选区所在页仍正确）/跨页选区拒绝+toast（主控裁决 5，INV-02 可见）/
 * 工具条落点以选区所在页盒为参照系（坐标换算经页盒 rect——N-C 防层叠污染）/
 * 保存页=选区所在页（0 基，动态推导）/Escape 清/承载选区的页 DOM 卸载
 * （页回收与 zoom 重建同机制）→选区清空防悬空锚/纯函数页盒遍历。
 * [SR2-F-07] 追加自绘选区行为：pending 有 rects→覆盖层渲染+rect 块数+容器几何
 * （textLayer 盒换算到挂载盒）；pending null→层不渲染（初始态/Escape 清）。
 * always-active（ADR-0017 裁决 3 新测试不经 guardedDescribe）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  SelectionLayer,
  closestPageRoot,
  pageIndexOf
} from '../../../src/renderer/features/reader/SelectionLayer'
import type { Annotation } from '@shared/models/annotation'

const { toastSpy, saveMock } = vi.hoisted(() => ({ toastSpy: vi.fn(), saveMock: vi.fn() }))
vi.mock('../../../src/renderer/shared/ui/Toast', () => ({ showToast: toastSpy }))
vi.mock('../../../src/renderer/api/client', () => ({
  api: { reader: { saveAnnotation: saveMock } },
  // unwrap 透传 Result.data（成功路径——失败路径不经组件分支外的形态）
  unwrap: async (p: Promise<{ ok: boolean; data: unknown }>): Promise<unknown> => {
    const r = await p
    return r.data
  },
  ApiClientError: class extends Error {}
}))

/** jsdom 无布局：元素 rect 按预设表返回（页盒几何——坐标换算断言的输入） */
const rects = new Map<Element, { x: number; y: number; width: number; height: number }>()
/** jsdom Range 无布局方法：选区 rect 可变桩（视口坐标） */
let rangeRect = { x: 10, y: 900, width: 200, height: 20 }
let origRangeGBCR: (() => DOMRect) | undefined

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
const fireMouseUp = (): void => {
  document.dispatchEvent(new MouseEvent('mouseup'))
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

/** F-07 自绘选区覆盖层（pending 态挂载；null=层不渲染） */
const selRects = (): HTMLElement | null => host?.querySelector<HTMLElement>('[data-testid="selection-rects"]') ?? null

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  rects.clear()
  rangeRect = { x: 10, y: 900, width: 200, height: 20 }
  onSaved = vi.fn()
  ;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    const r = rects.get(this)
    return { x: r?.x ?? 0, y: r?.y ?? 0, width: r?.width ?? 0, height: r?.height ?? 0 } as DOMRect
  })
  origRangeGBCR = Range.prototype.getBoundingClientRect as () => DOMRect
  Range.prototype.getBoundingClientRect = () => ({ ...rangeRect }) as DOMRect
  window.getSelection()?.removeAllRanges()
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
  if (origRangeGBCR !== undefined) Range.prototype.getBoundingClientRect = origRangeGBCR
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
  it('P1 挂载盒≠选区页仍正确（F-01 自裁 4 中间态解除）：防抖路径工具条出现+坐标经页盒换算', async () => {
    const { page1, span2 } = mountColumnFixture()
    await mountLayer(page1)
    // 选区在页 2（挂载盒=页 1）——旧「固定锚定页」实现在此静默收起
    selectRange(span2.firstChild!, 0, span2.firstChild!, 4)
    fireSelectionChange()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200)
    })
    const bar = toolbar()
    expect(bar).not.toBeNull()
    // 落点以选区所在页盒为参照系（N-C）：页内偏移 (10, 900-812-42=46)+页间偏移 812
    expect(bar!.style.left).toBe('10px')
    expect(bar!.style.top).toBe('858px')
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
    await mountLayer(page1)
    selectRange(span2.firstChild!, 0, span2.firstChild!, 4)
    act(() => {
      fireMouseUp()
    })
    expect(toolbar()).not.toBeNull()
  })

  it('P4 保存页=选区所在页（0 基动态推导，非挂载页）：高亮落库参数+onSaved 回流', async () => {
    const { page1, span2 } = mountColumnFixture()
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

  it('F-07a 自绘选区：pending 有 rects→渲染覆盖层+rect 块数，容器几何=选区页文本层盒换算到挂载盒', async () => {
    const { page1, page2, span2 } = mountColumnFixture()
    // 文本层盒与页盒取不同值——证明参照系是 textLayer 盒（非页盒）
    rects.set(page2.querySelector('.textLayer')!, { x: 6, y: 830, width: 588, height: 776 })
    await mountLayer(page1)
    selectRange(span2.firstChild!, 0, span2.firstChild!, 4)
    act(() => {
      fireMouseUp()
    })
    const layer = selRects()
    expect(layer).not.toBeNull()
    // jsdom 无 Range.getClientRects → selectionToAnchor 走父盒兜底恰产 1 块 rect
    expect(layer!.querySelectorAll('[data-testid="selection-rect"]')).toHaveLength(1)
    // 容器与选区所在页文本层同盒（挂载盒参照系——toolbar :131-135 同型换算）
    expect(layer!.style.left).toBe('6px')
    expect(layer!.style.top).toBe('830px')
    expect(layer!.style.width).toBe('588px')
    expect(layer!.style.height).toBe('776px')
  })

  it('F-07b 自绘选区：pending null→层不渲染（初始态无层；Escape 清 pending 后层卸载）', async () => {
    const { page1, span2 } = mountColumnFixture()
    await mountLayer(page1)
    expect(selRects()).toBeNull()
    selectRange(span2.firstChild!, 0, span2.firstChild!, 4)
    act(() => {
      fireMouseUp()
    })
    expect(selRects()).not.toBeNull()
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    })
    expect(selRects()).toBeNull()
  })
})
