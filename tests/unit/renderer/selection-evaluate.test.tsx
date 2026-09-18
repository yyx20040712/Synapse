// @vitest-environment jsdom
/**
 * [F-A6-c] selection-evaluate —— 快路径（evaluateVisual）行为面（always-active
 * ——ADR-0017 裁决 3 同款：新测试不经 guardedDescribe；诞生即锁）。
 *
 * 四组（票面 §1-E+门一回炉 W1）：
 * - 快慢等价（INV-58 后半锚）：同夹具下快路径（rAF 帧产物）与全量（settle 产物）
 *   逐位一致——快路径与 settle 同族（项几何链），禁第二几何口径；
 * - 同帧覆盖（票面强制断言）：快路径产物落地后全量评估覆盖——paint 终态=全量
 *   产物（mid-drag zoom 变更形态制造快/全量几何差——非空转断言：快=zoom1 几何、
 *   全量=zoom2 几何，终态必须=zoom2；「快路径跳过同帧覆盖/双链并存」在此红）；
 * - 快路径守卫前置（Kimi 拟定裁决 2-§5①(ii)）：跨页选区 visual 路静默
 *   setPaint(null)——守卫删除的判别性锚（无守卫→快路径把跨页选区偏移归一化进
 *   单页项几何=paint 出块）；
 * - W1 mouseup cancel-before-evaluate 顺序锚（门一回炉）：mouseup 时刻在途
 *   rAF 清除+settle 防抖不补枪——预渲染形态规避 live range 对 DOM 插入的
 *   原生 selectionchange 诱发（S8 态票外行为，机理见 it 内注释）。
 *
 * tick 预算断言（票面可选项）不设独立 it——帧随动语义已由 selection-paint.test
 * S1c（rAF 改写）+selection-geometry.test C1/C2 覆盖，组件级重复锚无增量。
 *
 * 夹具口径 crib selection-item-chain.test.tsx（页项直写 page-items.store；期望值
 * 手算 VP0 scale1：项 transform [10,0,0,10,72,700]→盒 {72,84,100,10}→
 * top=84/792≈10.6061%；zoom2→盒 {144,168,200,20}→top≈21.2121%）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub, stubUnwrap, toastSpy } from '../../utils/api-client-mock'
import { stubElementRects, stubRangeGBCR, type StubBox } from '../../utils/geometry'
import { SelectionLayer } from '../../../src/renderer/features/reader/SelectionLayer'
import { usePageItemsStore } from '../../../src/renderer/features/reader/anchors/page-items.store'
import { createReaderStoreInitialState, useReaderStore } from '../../../src/renderer/features/reader/state/reader.store'
import type { PdfTextContent, PdfTextItem } from '../../../src/renderer/features/reader/PdfPageCanvas'


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

/** 单页夹具（口径 crib item-chain：textLayer 盒置于视口绝对位 (500,300) 域锁；
 *  span 盒视口绝对 y=500=textLayer 盒 y300+盒本地 y200——本地 y=200 与项链
 *  y=84 刻意不同：两条链产物判别性区分，DOM 回退链归一 top≈25.25%=(500−300)/792） */
function mountPageFixture(no: string, itemsText: string): { page: HTMLElement; span: HTMLElement } {
  const page = document.createElement('div')
  page.setAttribute('data-page-root', no)
  const textLayer = document.createElement('div')
  textLayer.className = 'textLayer'
  const span = document.createElement('span')
  span.textContent = itemsText
  textLayer.appendChild(span)
  page.appendChild(textLayer)
  document.body.appendChild(page)
  rects.set(textLayer, { x: 500, y: 300, width: 612, height: 792 })
  rects.set(page, { x: 500, y: 300, width: 612, height: 792 })
  rects.set(span, { x: 572, y: 500, width: 100, height: 10 })
  return { page, span }
}

/** 造项：transform=[10,0,0,10,x,y]（PDF 基线 (x,y)、字号 10、宽 100 高 10） */
function mkItem(str: string, x: number, y: number): PdfTextItem {
  return { str, dir: 'ltr', width: 100, height: 10, transform: [10, 0, 0, 10, x, y], fontName: 'g1', hasEOL: false }
}

function mkText(items: PdfTextItem[]): PdfTextContent {
  return { items, styles: { g1: { fontFamily: 'serif', ascent: 0.8, descent: -0.2, vertical: false } }, lang: null }
}

function seedRegistry(no: number, text: PdfTextContent): void {
  act(() => {
    usePageItemsStore.getState().setEntry({ page: no, text, geometry: { rotate: 0, view: [0, 0, 612, 792] }, box: { w: 612, h: 792 } })
  })
}

/** reader store zoom 写口（mid-drag zoom 差分形态共用——W1/同帧覆盖两 it 的判别轴） */
function setZoom(z: number): void {
  act(() => {
    useReaderStore.setState({
      tabs: {
        'p-1': {
          paperId: 'p-1', fileUrl: '', fileName: '', title: '', page: 0, totalPages: 0, zoom: z,
          color: 'yellow', annotations: [], status: 'ready', dirty: false
        }
      },
      activeId: 'p-1'
    })
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

let root: Root | null = null
let host: HTMLDivElement | null = null

async function mountLayer(pageRoot: HTMLElement): Promise<void> {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => {
    root?.render(<SelectionLayer pageRoot={pageRoot} paperId="p-1" page={0} onSaved={() => undefined} />)
  })
}

const toolbar = (): HTMLElement | null => host?.querySelector<HTMLElement>('[data-testid="selection-toolbar"]') ?? null
const paintBlocks = (): HTMLElement[] => Array.from(document.querySelectorAll<HTMLElement>('[data-testid="selection-rect"]'))
const firstRect = (): HTMLElement | null => document.querySelector<HTMLElement>('[data-testid="selection-rect"]') ?? null
/** 块几何快照（left/top/width/height——快慢产物逐位比对的面） */
const blockStyles = (): Array<Record<string, string>> =>
  paintBlocks().map((b) => ({ left: b.style.left, top: b.style.top, width: b.style.width, height: b.style.height }))

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  rects.clear()
  usePageItemsStore.getState().clear()
  useReaderStore.setState(createReaderStoreInitialState())
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

describe('F-A6-c 快路径 evaluateVisual（rAF 帧×项几何链直取）', () => {
  it('快慢等价（INV-58 后半）：同夹具下 rAF 帧快路径产物与 settle 全量产物逐位一致（块数+四向几何）', async () => {
    const { page, span } = mountPageFixture('1', 'AB')
    seedRegistry(1, mkText([mkItem('AB', 72, 700)]))
    await mountLayer(page)
    selectAllOf(span)
    fireSelectionChange()
    // rAF 帧（t=16）：快路径（轻量 probe→项几何链直取——无 selectionToAnchor）
    await act(async () => {
      await vi.advanceTimersByTimeAsync(16)
    })
    const fast = blockStyles()
    expect(fast.length).toBeGreaterThanOrEqual(1)
    expect(parseFloat(firstRect()!.style.top)).toBeCloseTo((84 / 792) * 100, 2)
    // settle 全量（t=200：selectionToAnchor 锚定三元组+项几何主链——与快路径同族）
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200)
    })
    expect(blockStyles()).toEqual(fast)
  })

  it('同帧覆盖（票面强制断言）：快路径帧产物落地后全量评估覆盖——paint 终态=全量产物（mid-drag zoom 形态：快=zoom1、全量=zoom2，终态必须=zoom2 ≠ 快路径帧）', async () => {
    const { page, span } = mountPageFixture('1', 'AB')
    seedRegistry(1, mkText([mkItem('AB', 72, 700)]))
    await mountLayer(page)
    selectAllOf(span)
    fireSelectionChange()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(16)
    })
    // 快路径帧已落 zoom1 产物（top≈10.6061%）
    expect(parseFloat(firstRect()!.style.top)).toBeCloseTo((84 / 792) * 100, 2)
    // mid-drag zoom 变更（已知边界②形态——快路径帧已渲染，settle 现读新 zoom）
    act(() => {
      useReaderStore.setState({
        tabs: {
          'p-1': {
            paperId: 'p-1', fileUrl: '', fileName: '', title: '', page: 0, totalPages: 0, zoom: 2,
            color: 'yellow', annotations: [], status: 'ready', dirty: false
          }
        },
        activeId: 'p-1'
      })
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200)
    })
    // 全量同帧覆盖：终态=zoom2 几何（21.2121%≠10.6061%——覆盖非并存、非停留快帧）
    const rect = firstRect()
    expect(rect).not.toBeNull()
    expect(parseFloat(rect!.style.top)).toBeCloseTo((168 / 792) * 100, 2)
  })

  it('快路径守卫前置（裁决 2-§5①(ii)）：跨页选区 visual 路 rAF 帧后仍静默 setPaint(null)——无守卫时快路径把跨页偏移归一化进单页=paint 出块在此红', async () => {
    const { page: page1, span: span1 } = mountPageFixture('1', 'AB')
    const { page: page2, span: span2 } = mountPageFixture('2', 'CD')
    void page2
    seedRegistry(1, mkText([mkItem('AB', 72, 700)]))
    seedRegistry(2, mkText([mkItem('CD', 72, 700)]))
    await mountLayer(page1)
    // 跨页选区（anchorNode 页 1/focusNode 页 2）——两页注册表均在位（守卫删除后
    // 快路径可产块的判别前提）
    selectRange(span1.firstChild!, 0, span2.firstChild!, 1)
    fireSelectionChange()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(16)
    })
    expect(firstRect()).toBeNull()
    // settle（防抖全量）同样静默：无 toast（P2b 语义）+无工具条
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200)
    })
    expect(toastSpy).not.toHaveBeenCalled()
    expect(toolbar()).toBeNull()
    expect(firstRect()).toBeNull()
  })

  it('W1 mouseup cancel-before-evaluate 顺序锚（门一回炉——竞态面）：mouseup 时刻在途 rAF 清除+settle 防抖不补枪——mouseup 全量产物为终态（判别形态=预渲染 paint 后重建在途 rAF，mouseup 后改 zoom 推进 300ms 越过帧点与防抖点，paint 仍=mouseup 时刻全量几何；onMouseUp 删 scheduler.cancel() 的变异在此红）', async () => {
    const { page, span } = mountPageFixture('1', 'AB')
    seedRegistry(1, mkText([mkItem('AB', 72, 700)]))
    setZoom(2)
    await mountLayer(page)
    selectAllOf(span)
    fireSelectionChange()
    // 预渲染：快路径帧先落 paint 在场（此后 mouseup 的全量重渲经 React 节点
    // 复用无结构插入——规避 live range 对 DOM 插入的原生 selectionchange 诱发
    // [jsdom/浏览器同语义]——那属 S8 态票外行为，非本锚的 cancel 顺序面）
    await act(async () => {
      await vi.advanceTimersByTimeAsync(16)
    })
    expect(firstRect()).not.toBeNull()
    // 重建在途 rAF：mouseup 时刻恰有一个待触发 rAF（t=32）+新防抖（t=216）
    fireSelectionChange()
    // mouseup（无 mousedown 记录=程序化形态，位移门槛放行）：cancel 先清
    // 在途 rAF+防抖 →full(true) 同步执行（源码顺序 SelectionLayer onMouseUp
    // ——cancel-before-evaluate）
    act(() => {
      document.dispatchEvent(new MouseEvent('mouseup'))
    })
    // 全量恰执行一次的正面锚：mouseup 即时工具条+全量产物（zoom2 几何 168/792）
    expect(toolbar()).not.toBeNull()
    const rect = firstRect()
    expect(rect).not.toBeNull()
    expect(parseFloat(rect!.style.top)).toBeCloseTo((168 / 792) * 100, 2)
    // mouseup 后改 zoom=3：cancel 在位→在途 rAF 已清（(a) 帧点快路径不触发）+
    // settle 防抖已清（(b) 防抖点全量不补枪）——推进 300ms 无任何二次评估
    setZoom(3)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300)
    })
    // 终态=mouseup 时刻全量产物（zoom2 保持）：cancel 删除变异下 (a) 在途 rAF
    // 读 zoom3 覆盖为 252/792≈31.82%、(b) settle 全量读 zoom3 同覆盖——两个
    // 二次评估面任一在场此断言即红（等价形态：rAF 回调零调用的组件级可观察
    // 投影=终态不被 post-mouseup 状态改写；zoom 差分为判别轴）
    const final = firstRect()
    expect(final).not.toBeNull()
    expect(parseFloat(final!.style.top)).toBeCloseTo((168 / 792) * 100, 2)
  })
})
