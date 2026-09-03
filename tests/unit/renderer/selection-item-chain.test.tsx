// @vitest-environment jsdom
/**
 * [F-A6-b2] 项几何链接线测试（SelectionLayer evaluate×page-items.store 通道——
 * always-active，诞生即锁；超票面申报件：票面 §1-C 的 TDD 全程义务落在接线面，
 * 纯函数面已由 pdf-item-geometry.test 覆盖，本文件锁「通道生效/回退/抑制/保存
 * 同源/zoom 现读」五行为）。
 *
 * 夹具口径：页项 {items,styles,geometry} 直写 page-items.store（PagesOverlay 写
 * 口的等价载荷）；textLayer DOM 文本=剔空串项拼接（对账前提——取证 A3）；jsdom
 * 无布局故 gBCR 按预设表返回（textLayer 盒 612×792=归一化基准；span 盒 y=200
 * 与项链 y=84 刻意不同——两条链产物判别性区分）。
 * 期望值手算（VP0 scale1：项 transform [10,0,0,10,72,700]→盒 {72,84,100,10}→
 * top=84/792≈10.6061%；zoom2→盒 {144,168,200,20}→top≈21.2121%；DOM 回退链
 * 产物=span 量测盒 top≈25.25%）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SelectionLayer } from '../../../src/renderer/features/reader/SelectionLayer'
import { usePageItemsStore } from '../../../src/renderer/features/reader/page-items.store'
import { createReaderStoreInitialState, useReaderStore } from '../../../src/renderer/features/reader/reader.store'
import type { PdfTextContent, PdfTextItem } from '../../../src/renderer/features/reader/PdfPageCanvas'
import type { Annotation } from '@shared/models/annotation'

const { toastSpy, saveMock } = vi.hoisted(() => ({ toastSpy: vi.fn(), saveMock: vi.fn() }))
vi.mock('../../../src/renderer/shared/ui/Toast', () => ({ showToast: toastSpy }))
vi.mock('../../../src/renderer/api/client', () => ({
  api: { reader: { saveAnnotation: saveMock } },
  unwrap: async (p: Promise<{ ok: boolean; data: unknown }>): Promise<unknown> => {
    const r = await p
    return r.data
  },
  ApiClientError: class extends Error {}
}))

/** jsdom 无布局：元素 rect 按预设表返回（textLayer 盒=归一化基准 612×792） */
const rects = new Map<Element, { x: number; y: number; width: number; height: number }>()
let origRangeGBCR: (() => DOMRect) | undefined
const rangeRect = { x: 10, y: 900, width: 200, height: 20 }

/** 页根+textLayer（span 文本=itemsText——对账前提）。textLayer 盒置于视口
 *  绝对位 (500,300)——gBCR 原点≠0 的域锁（项链=盒本地帧不受平移影响；
 *  r3a 域差缺陷的接线面回归锚）。span 盒=DOM 量测域值（本地 y=200——与
 *  项链 y=84 刻意不同：两条链产物判别性区分——项链 top≈10.61%、DOM 回退
 *  链 top≈25.25%） */
function mountPageFixture(itemsText: string): { page1: HTMLElement; textLayer: HTMLElement; span: HTMLElement } {
  const page1 = document.createElement('div')
  page1.setAttribute('data-page-root', '1')
  const textLayer = document.createElement('div')
  textLayer.className = 'textLayer'
  const span = document.createElement('span')
  span.textContent = itemsText
  textLayer.appendChild(span)
  page1.appendChild(textLayer)
  document.body.appendChild(page1)
  rects.set(textLayer, { x: 500, y: 300, width: 612, height: 792 })
  rects.set(page1, { x: 500, y: 300, width: 612, height: 792 })
  rects.set(span, { x: 572, y: 500, width: 100, height: 10 })
  return { page1, textLayer, span }
}

/** 造项：transform=[10,0,0,10,x,y]（PDF 基线 (x,y)、字号 10、宽 100 高 10） */
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

function selectAllOf(span: HTMLElement): void {
  const sel = window.getSelection()
  const range = document.createRange()
  const textNode = span.firstChild as Text
  range.setStart(textNode, 0)
  range.setEnd(textNode, textNode.data.length)
  sel?.removeAllRanges()
  sel?.addRange(range)
}

const fireSelectionChange = (): void => {
  document.dispatchEvent(new Event('selectionchange'))
}

let root: Root | null = null
let host: HTMLDivElement | null = null
let warnSpy: ReturnType<typeof vi.spyOn>

async function mountLayer(pageRoot: HTMLElement): Promise<void> {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => {
    root?.render(<SelectionLayer pageRoot={pageRoot} paperId="p-1" page={0} onSaved={() => undefined} />)
  })
}

const toolbar = (): HTMLElement | null => host?.querySelector<HTMLElement>('[data-testid="selection-toolbar"]') ?? null
const firstRect = (): HTMLElement | null => document.querySelector<HTMLElement>('[data-testid="selection-rect"]') ?? null

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  rects.clear()
  usePageItemsStore.getState().clear()
  useReaderStore.setState(createReaderStoreInitialState())
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
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

describe('F-A6-b2 项几何链接线（SelectionLayer×page-items.store 通道）', () => {
  it('通道生效：注册表条目在位+对账通过 → paint 块=项声明几何（top≈10.6061%=84/792，DOM 量测链给 25.25% 必红——判别性）', async () => {
    const { page1, span } = mountPageFixture('AB')
    seedRegistry(1, mkText([mkItem('AB', 72, 700)]))
    await mountLayer(page1)
    selectAllOf(span)
    fireSelectionChange()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200)
    })
    expect(toolbar()).not.toBeNull()
    const rect = firstRect()
    expect(rect).not.toBeNull()
    expect(parseFloat(rect!.style.top)).toBeCloseTo((84 / 792) * 100, 2)
    expect(parseFloat(rect!.style.left)).toBeCloseTo((72 / 612) * 100, 2)
    expect(parseFloat(rect!.style.height)).toBeCloseTo((10 / 792) * 100, 2)
    expect(toastSpy).not.toHaveBeenCalled()
  })

  it('保存链同源（INV-58 前半）：落库 rects=pending.anchor.rects=项几何链产物（y≈84/792）', async () => {
    const { page1, span } = mountPageFixture('AB')
    seedRegistry(1, mkText([mkItem('AB', 72, 700)]))
    await mountLayer(page1)
    selectAllOf(span)
    act(() => {
      document.dispatchEvent(new MouseEvent('mouseup'))
    })
    const saved: Annotation = {
      id: 'a-1', paperId: 'p-1', page: 0, kind: 'highlight', color: 'yellow',
      quoteText: 'AB', prefixText: '', suffixText: '', startOffset: 0, endOffset: 2,
      rects: [], comment: '', createdAt: '2026-09-04T00:00:00Z', updatedAt: '2026-09-04T00:00:00Z'
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
    const arg = saveMock.mock.calls[0]![0] as { annotation: { rects: Array<{ x: number; y: number }> } }
    expect(arg.annotation.rects.length).toBeGreaterThanOrEqual(1)
    expect(arg.annotation.rects[0]!.y).toBeCloseTo(84 / 792, 4)
    expect(arg.annotation.rects[0]!.x).toBeCloseTo(72 / 612, 4)
  })

  it('zoom 现读：tab.zoom=2 → 项盒按 scale2 计算（top≈21.2121%=168/792——zoom 通道接线锚）', async () => {
    const { page1, span } = mountPageFixture('AB')
    seedRegistry(1, mkText([mkItem('AB', 72, 700)]))
    useReaderStore.setState({
      tabs: {
        'p-1': {
          paperId: 'p-1', fileUrl: '', fileName: '', title: '', page: 0, totalPages: 0, zoom: 2,
          color: 'yellow', annotations: [], status: 'ready', dirty: false
        }
      },
      activeId: 'p-1'
    })
    await mountLayer(page1)
    selectAllOf(span)
    fireSelectionChange()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200)
    })
    const rect = firstRect()
    expect(rect).not.toBeNull()
    expect(parseFloat(rect!.style.top)).toBeCloseTo((168 / 792) * 100, 2)
  })

  it('回退①页项缺失：注册表空 → DOM 量测链兜底（span 量测盒 top≈25.25%=200/792≠项链 10.61%——判别性）+console.warn 不静默+零功能损失（工具条在）', async () => {
    const { page1, span } = mountPageFixture('AB')
    await mountLayer(page1)
    selectAllOf(span)
    fireSelectionChange()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200)
    })
    const rect = firstRect()
    expect(rect).not.toBeNull()
    expect(parseFloat(rect!.style.top)).toBeCloseTo((200 / 792) * 100, 2)
    expect(toolbar()).not.toBeNull()
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('页项数据缺失'))
    expect(toastSpy).not.toHaveBeenCalled()
  })

  it('回退②偏移对账失败：items 拼接≠DOM 全文 → DOM 量测链兜底+warn（回退触发面收敛的第二因）', async () => {
    const { page1, span } = mountPageFixture('AX')
    seedRegistry(1, mkText([mkItem('AB', 72, 700)]))
    await mountLayer(page1)
    selectAllOf(span)
    fireSelectionChange()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200)
    })
    const rect = firstRect()
    expect(rect).not.toBeNull()
    expect(parseFloat(rect!.style.top)).toBeCloseTo((200 / 792) * 100, 2)
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('偏移对账失败'))
  })

  it('G2 降级门（active，门一 W2 口径）：病理页项（盒 x=700 全出 612 盒，偏离率 1≥5%）→ 拖选/防抖路径静默抑制（settle 不 toast——对齐跨页拒绝形态防拖选中途刷屏）+mouseup 时刻 toast 拒绝（INV-02）', async () => {
    const { page1, span } = mountPageFixture('XY')
    seedRegistry(1, mkText([mkItem('XY', 700, 700)]))
    await mountLayer(page1)
    selectAllOf(span)
    act(() => {
      fireSelectionChange()
    })
    // 拖选期（visual tick）：抑制渲染。[F-A6-c 时序适配申告] rAF 改形后视觉评估
    // 挂帧点——帧前断言恒真退化，推进 16ms（rAF 帧后）断言快路径 G2 门非空转
    await act(async () => {
      await vi.advanceTimersByTimeAsync(16)
    })
    expect(firstRect()).toBeNull()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200)
    })
    // settle（拖选停顿 200ms 的全量评估）：静默——不 toast（旧 !visualOnly 门在此弹=本断言的牙）+无工具条无层
    expect(toastSpy).not.toHaveBeenCalled()
    expect(toolbar()).toBeNull()
    expect(firstRect()).toBeNull()
    // mouseup 完成时刻：toast 拒绝（INV-02 可见）
    act(() => {
      document.dispatchEvent(new MouseEvent('mouseup'))
    })
    expect(toastSpy).toHaveBeenCalledTimes(1)
    expect(toastSpy).toHaveBeenCalledWith('选区几何异常，无法创建标注', 'info')
    expect(toolbar()).toBeNull()
    expect(firstRect()).toBeNull()
  })
})
