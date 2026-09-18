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
import { makeApiStub, stubUnwrap, toastSpy } from '../../utils/api-client-mock'
import { stubElementRects, stubRangeGBCR, type StubBox } from '../../utils/geometry'
import { mkItem, mkText, seedRegistry } from '../../utils/factories'
import { SelectionLayer } from '../../../src/renderer/features/reader/interact/SelectionLayer'
import { usePageItemsStore } from '../../../src/renderer/features/reader/anchors/page-items.store'
import { createReaderStoreInitialState, useReaderStore } from '../../../src/renderer/features/reader/state/reader.store'
import type { Annotation } from '@shared/models/annotation'


const saveMock = vi.fn()
makeApiStub({ reader: { saveAnnotation: saveMock } })
// unwrap 透传 Result.data（成功路径——失败路径不经组件分支外的形态）
stubUnwrap(async (p: Promise<{ ok: boolean; data: unknown }>): Promise<unknown> => {
  const r = await p
  return r.data
})

/** jsdom 无布局：元素 rect 按预设表返回（textLayer 盒=归一化基准 612×792） */
const rects = new Map<Element, StubBox>()
let rangeStub: { restore(): void } | null = null
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

  it('回退①页项缺失：注册表空 → DOM 回退仅显示不入库（保存门 F-GEOM-01-G2）——paint=span 量测盒 top≈25.25% 视觉连续+工具条 null（无保存入口）+console.warn 不静默', async () => {
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
    expect(toolbar()).toBeNull()
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
