// @vitest-environment jsdom
/**
 * [F-R1] 阅读器双页阅读模式——票面 5.1 用例 ①~⑦（锁定合约，always-active，
 * 不经 guardedDescribe——ADR-0017 裁决 3）。
 *
 * 覆盖：store 面（setPageLayout 写 active/per-tab 记忆/activeId=null no-op/
 * makeLoadingTab 显式 single+error 重试沿 prev 继承——与 zoom/selectionMode
 * 完全同型）、geometry 纯函数面（layoutRows 行派生/rowWidth 含行内 gap/
 * columnWidthFor/columnTotalHeightFor 双页口径+末行单页不计+single 零变回归）、
 * PageColumn 面（双页行 DOM data-page-row+页盒连续对+末行单页/单页回归/
 * onReady 重报新口径且 getPage 计数不变/段⑥锚双页总高口径）、ReaderToolbar
 * 面（双页按钮 aria-pressed/toggle 上抛/pageStep=2 翻面步进/缺省 1 回归）、
 * fitWidth 分母注入面（basis=双页口径+fit 数学使行宽恰入视口）。
 * jsdom 不可达面（canvas 真渲染/fitWidth 真布局/切换往返视觉）归真机探针
 * scripts/audits/f-r1-verify.mjs（票面分工）。
 * 形态 crib page-column.test.tsx（MockIO/makeDoc/async act flush）+
 * selection-mode.test.tsx（store setState 直植/api client mock/按钮先例）。
 */
import { act } from 'react'
import type { RefObject } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { PageColumn } from '../../../src/renderer/features/reader/PageColumn'
import { ReaderToolbar } from '../../../src/renderer/features/reader/ReaderToolbar'
import {
  anchoredScrollTop,
  columnTotalHeight,
  columnTotalHeightFor,
  columnWidth,
  columnWidthFor,
  layoutRows,
  rowWidth
} from '../../../src/renderer/features/reader/page-column-geometry'
import {
  createReaderStoreInitialState,
  useReaderStore,
  type TabState
} from '../../../src/renderer/features/reader/reader.store'

// store 面 openPaper 链的 api 桩（selection-mode.test 同法：模块 mock，
// 组件面（PageColumn/ReaderToolbar）不消费 api——mock 仅作用于 reader.store）
const { openMock, listMock } = vi.hoisted(() => ({
  openMock: vi.fn(async (req: { paperId: string }) => ({
    ok: true as const,
    data: { fileUrl: `app-file://${req.paperId}`, fileName: `${req.paperId}.pdf`, lastReadPage: 0 }
  })),
  listMock: vi.fn(async () => ({ ok: true as const, data: [] }))
}))
vi.mock('../../../src/renderer/api/client', () => ({
  api: { reader: { open: openMock, listAnnotations: listMock } },
  // 真实 unwrap 契约：收 Promise<Result> 内部 await 再解包（mock 同契约）
  unwrap: async (call: Promise<{ ok: boolean; data?: unknown; error?: { message: string } }>) => {
    const r = await call
    if (!r.ok) throw new Error(r.error?.message ?? 'api error')
    return r.data
  },
  ApiClientError: class extends Error {}
}))

/** 桩 IntersectionObserver（jsdom 无实现——本票不驱动可见性，仅消噪音） */
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
}

/** 混合尺寸文档桩：sizes[i]=[宽,高]（双页几何断言需左右页宽高不同） */
function makeDoc(sizes: Array<[number, number]>): { doc: PDFDocumentProxy; getPage: ReturnType<typeof vi.fn> } {
  const getPage = vi.fn(async (no: number): Promise<{ view: number[] }> => ({
    view: [0, 0, sizes[no - 1]![0], sizes[no - 1]![1]]
  }))
  const doc = { numPages: sizes.length, getPage } as unknown as PDFDocumentProxy
  return { doc, getPage }
}

/** 五页混合夹具：612×792 / 500×600 / 400×300 / 450×350 / 700×800 */
const FIVE: Array<[number, number]> = [
  [612, 792],
  [500, 600],
  [400, 300],
  [450, 350],
  [700, 800]
]
const fiveSizes = FIVE.map(([w, h]) => ({ width: w, height: h }))

let root: Root | null = null
let host: HTMLDivElement | null = null

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

/** ready 态完整 tab（selection-mode.test 同配方+pageLayout 维度） */
function makeTab(id: string, pageLayout?: 'single' | 'double'): TabState {
  return {
    paperId: id,
    fileUrl: `app-file://${id}`,
    fileName: `${id}.pdf`,
    title: '',
    page: 0,
    totalPages: 10,
    zoom: 1,
    color: 'yellow',
    annotations: [],
    status: 'ready',
    dirty: false,
    ...(pageLayout !== undefined ? { pageLayout } : {})
  }
}

beforeEach(() => {
  MockIO.instances = []
  ;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
  vi.stubGlobal('IntersectionObserver', MockIO)
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
  vi.clearAllMocks()
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
  vi.unstubAllGlobals()
  useReaderStore.setState(createReaderStoreInitialState())
})

describe('F-R1 双页 —— store 面（TabState.pageLayout 生命周期）', () => {
  it('①a setPageLayout：double 写入 active tab 再 single 回；activeId=null 时 no-op', () => {
    useReaderStore.setState({ tabs: { 'p-1': makeTab('p-1') }, order: ['p-1'], activeId: 'p-1' })
    useReaderStore.getState().setPageLayout('double')
    expect(useReaderStore.getState().tabs['p-1']?.pageLayout).toBe('double')
    useReaderStore.getState().setPageLayout('single')
    expect(useReaderStore.getState().tabs['p-1']?.pageLayout).toBe('single')
    useReaderStore.setState({ activeId: null })
    const before = useReaderStore.getState().tabs
    useReaderStore.getState().setPageLayout('double')
    expect(useReaderStore.getState().tabs).toBe(before)
  })

  it('①b per-tab 记忆：A(double)/B(single) 切换各自保持；setPageLayout 只动 active', () => {
    useReaderStore.setState({
      tabs: { 'p-a': makeTab('p-a', 'double'), 'p-b': makeTab('p-b') },
      order: ['p-a', 'p-b'],
      activeId: 'p-a'
    })
    useReaderStore.getState().activateTab('p-b')
    expect(useReaderStore.getState().tabs['p-b']?.pageLayout ?? 'single').toBe('single')
    expect(useReaderStore.getState().tabs['p-a']?.pageLayout).toBe('double')
    useReaderStore.getState().setPageLayout('double')
    expect(useReaderStore.getState().tabs['p-b']?.pageLayout).toBe('double')
    expect(useReaderStore.getState().tabs['p-a']?.pageLayout).toBe('double')
    useReaderStore.getState().activateTab('p-a')
    useReaderStore.getState().setPageLayout('single')
    expect(useReaderStore.getState().tabs['p-a']?.pageLayout).toBe('single')
    expect(useReaderStore.getState().tabs['p-b']?.pageLayout).toBe('double')
  })

  it('①c makeLoadingTab：openPaper 新建 tab 显式 pageLayout=single；error 重试沿 prev 继承（与 zoom 同型）', async () => {
    await useReaderStore.getState().openPaper('p-new')
    expect(useReaderStore.getState().tabs['p-new']?.status).toBe('ready')
    expect(useReaderStore.getState().tabs['p-new']?.pageLayout).toBe('single')
    // error 态重开：{...prev, status:'loading'} 继承面——prev=double 沿用（zoom 先例）
    useReaderStore.setState({
      tabs: { 'p-e': { ...makeTab('p-e', 'double'), status: 'error' } },
      order: ['p-e'],
      activeId: 'p-e'
    })
    await useReaderStore.getState().openPaper('p-e')
    expect(useReaderStore.getState().tabs['p-e']?.status).toBe('ready')
    expect(useReaderStore.getState().tabs['p-e']?.pageLayout).toBe('double')
  })
})

describe('F-R1 双页 —— geometry 纯函数面', () => {
  it('②a layoutRows：(1,2)(3,4)… 行派生；末行奇数页 right 缺席；空数组/单页退化', () => {
    const rows = layoutRows(fiveSizes)
    expect(rows).toHaveLength(3)
    expect(rows[0]).toMatchObject({ leftNo: 1, rightNo: 2 })
    expect(rows[0]!.left).toEqual({ width: 612, height: 792 })
    expect(rows[0]!.right).toEqual({ width: 500, height: 600 })
    expect(rows[1]).toMatchObject({ leftNo: 3, rightNo: 4 })
    expect(rows[2]).toMatchObject({ leftNo: 5 })
    expect(rows[2]!.right).toBeUndefined()
    expect(rows[2]!.left).toEqual({ width: 700, height: 800 })
    expect(layoutRows([])).toEqual([])
    const one = layoutRows([{ width: 612, height: 792 }])
    expect(one).toHaveLength(1)
    expect(one[0]!.right).toBeUndefined()
  })

  it('②b rowWidth：左+右+行内 gap（12px 单源常量，zoom 乘页宽不乘 gap）；右缺席=左宽无 gap', () => {
    const rows = layoutRows(fiveSizes)
    expect(rowWidth(rows[0]!, 1)).toBe(612 + 500 + 12)
    expect(rowWidth(rows[0]!, 2)).toBe(612 * 2 + 500 * 2 + 12)
    expect(rowWidth(rows[2]!, 1)).toBe(700)
  })

  it('②c columnWidthFor：single=columnWidth 零变；double=最宽完整行宽（末行单页不计）；单页文档退化；空数组 0', () => {
    expect(columnWidthFor(fiveSizes, 1, 'single')).toBe(columnWidth(fiveSizes, 1))
    expect(columnWidthFor(fiveSizes, 1, 'single')).toBe(700)
    expect(columnWidthFor(fiveSizes, 1, 'double')).toBe(612 + 500 + 12)
    expect(columnWidthFor(fiveSizes, 2, 'double')).toBe(612 * 2 + 500 * 2 + 12)
    // 末行单页不计：最宽页在末行也不抬列宽
    const odd = [
      { width: 300, height: 400 },
      { width: 300, height: 400 },
      { width: 900, height: 500 }
    ]
    expect(columnWidthFor(odd, 1, 'double')).toBe(300 + 300 + 12)
    // 全列无完整行（单页文档双页）：退化最宽页宽
    expect(columnWidthFor([{ width: 612, height: 792 }], 1, 'double')).toBe(612)
    expect(columnWidthFor([], 1, 'double')).toBe(0)
  })

  it('②d columnTotalHeightFor：行高=max(左右页高)+行 gap×(行数−1)（gap 不随 zoom）；single=columnTotalHeight 零变', () => {
    expect(columnTotalHeightFor(fiveSizes, 1, 'single')).toBe(columnTotalHeight(fiveSizes, 1))
    // 行高：max(792,600)=792 / max(300,350)=350 / 800；总=792+350+800+2×12
    expect(columnTotalHeightFor(fiveSizes, 1, 'double')).toBe(792 + 350 + 800 + 24)
    expect(columnTotalHeightFor(fiveSizes, 2, 'double')).toBe(792 * 2 + 350 * 2 + 800 * 2 + 24)
    expect(columnTotalHeightFor([], 1, 'double')).toBe(0)
  })
})

describe('F-R1 双页 —— PageColumn 渲染面', () => {
  it('③ 双页行 DOM：data-page-row 每行一个+行内页盒连续对 (1,2)(3,4)+末行单页；盒宽=自身页宽（左顶对齐口径）', async () => {
    const { doc } = makeDoc(FIVE)
    await mount(
      <PageColumn
        doc={doc}
        totalPages={5}
        zoom={1}
        layout="double"
        renderPage={(no) => <span data-rendered-page={no} />}
        onPageRender={() => undefined}
        onError={() => undefined}
      />
    )
    const rows = host!.querySelectorAll<HTMLElement>('[data-page-row]')
    expect(rows).toHaveLength(3)
    const boxesIn = (row: Element): number[] =>
      Array.from(row.querySelectorAll<HTMLElement>('[data-page-box]')).map((b) => Number(b.dataset.pageBox))
    expect(boxesIn(rows[0]!)).toEqual([1, 2])
    expect(boxesIn(rows[1]!)).toEqual([3, 4])
    expect(boxesIn(rows[2]!)).toEqual([5])
    // 全列盒序连续（懒渲染/回收按页号消费面零改）
    expect(
      Array.from(host!.querySelectorAll<HTMLElement>('[data-page-box]')).map((b) => Number(b.dataset.pageBox))
    ).toEqual([1, 2, 3, 4, 5])
    // 盒宽=自身页宽×zoom（非列宽等宽——行内左顶对齐的几何前提）
    const b1 = host!.querySelector<HTMLElement>('[data-page-box="1"]')!
    const b2 = host!.querySelector<HTMLElement>('[data-page-box="2"]')!
    expect(b1.style.width).toBe('612px')
    expect(b2.style.width).toBe('500px')
    // [W3 门一回炉] S3 末行奇数页渲染面 DOM 锁：末行行内 data-page-box 恰 1 个
    // （盒号 5）+行盒无任何额外子元素（无空占位盒——右盒摘除面）+末行行宽
    // 几何口径=左盒宽（行内唯一盒宽 700px=末页原始宽×zoom；jsdom 无布局，
    // 「行盒宽度==左盒宽」的可达形式=唯一盒+无兄弟+盒宽断言，真布局归探针 E）
    const lastRow = host!.querySelector<HTMLElement>('[data-page-row="5"]')!
    expect(lastRow).not.toBeNull()
    const lastRowBoxes = lastRow.querySelectorAll<HTMLElement>('[data-page-box]')
    expect(lastRowBoxes).toHaveLength(1)
    expect(Number(lastRowBoxes[0]!.dataset.pageBox)).toBe(5)
    expect(lastRow.children).toHaveLength(1)
    expect(lastRowBoxes[0]!.style.width).toBe('700px')
  })

  it('③b 单页分支回归：缺省 layout=无 data-page-row；盒等宽=列宽（最宽页）——既有零变', async () => {
    const { doc } = makeDoc(FIVE)
    await mount(
      <PageColumn
        doc={doc}
        totalPages={5}
        zoom={1}
        renderPage={(no) => <span data-rendered-page={no} />}
        onPageRender={() => undefined}
        onError={() => undefined}
      />
    )
    expect(host!.querySelectorAll('[data-page-row]')).toHaveLength(0)
    expect(host!.querySelectorAll('[data-page-box]')).toHaveLength(5)
    const b1 = host!.querySelector<HTMLElement>('[data-page-box="1"]')!
    const b5 = host!.querySelector<HTMLElement>('[data-page-box="5"]')!
    expect(b1.style.width).toBe('700px')
    expect(b5.style.width).toBe('700px')
  })

  it('④ onReady 重报：single→double→single 各报对应口径 basisWidth；就绪管线不重跑（离屏页 getPage 不再取）', async () => {
    const { doc, getPage } = makeDoc(FIVE)
    const onReady = vi.fn()
    const el = (layout: 'single' | 'double'): JSX.Element => (
      <PageColumn
        doc={doc}
        totalPages={5}
        zoom={1}
        layout={layout}
        renderPage={(no) => <span data-rendered-page={no} />}
        onPageRender={() => undefined}
        onError={() => undefined}
        onReady={onReady}
      />
    )
    await mount(el('single'))
    expect(onReady).toHaveBeenCalledTimes(1)
    expect(onReady).toHaveBeenLastCalledWith(700)
    const calls0 = getPage.mock.calls.length
    remount(el('double'))
    await act(async () => {
      await Promise.resolve()
    })
    expect(onReady).toHaveBeenCalledTimes(2)
    expect(onReady).toHaveBeenLastCalledWith(612 + 500 + 12)
    const afterDouble = getPage.mock.calls.length
    remount(el('single'))
    await act(async () => {
      await Promise.resolve()
    })
    expect(onReady).toHaveBeenCalledTimes(3)
    expect(onReady).toHaveBeenLastCalledWith(700)
    // 布局切换不重跑就绪管线（尺寸缓存单源——只重派生行+重报）：离屏页
    // （初始渲染窗口 {1,2} 外）getPage 恰一次不再取；每次切换的总增量仅来自
    // 渲染窗口页的 canvas 重挂（page-column.test「缓存乘法非重取」同口径上界）
    const countOf = (no: number): number => getPage.mock.calls.filter((c) => c[0] === no).length
    expect(countOf(3)).toBe(1)
    expect(countOf(4)).toBe(1)
    expect(countOf(5)).toBe(1)
    expect(afterDouble - calls0).toBeLessThanOrEqual(2 * 1 + 1)
    expect(getPage.mock.calls.length - afterDouble).toBeLessThanOrEqual(2 * 1 + 1)
  })

  it('④b 初挂载即 double：就绪管线 onReady 直报双页口径（换文献 S7 同型）', async () => {
    const { doc } = makeDoc(FIVE)
    const onReady = vi.fn()
    await mount(
      <PageColumn
        doc={doc}
        totalPages={5}
        zoom={1}
        layout="double"
        renderPage={(no) => <span data-rendered-page={no} />}
        onPageRender={() => undefined}
        onError={() => undefined}
        onReady={onReady}
      />
    )
    expect(onReady).toHaveBeenCalledTimes(1)
    expect(onReady).toHaveBeenCalledWith(612 + 500 + 12)
  })

  it('⑦ 段⑥锚双页总高口径：zoom 1→2 程序修正 scrollTop 按行总高比值（2 行 3 页：1596→3180）', async () => {
    const { doc } = makeDoc([
      [612, 792],
      [612, 792],
      [612, 792]
    ])
    const scrollerEl = document.createElement('div')
    document.body.appendChild(scrollerEl)
    host = scrollerEl
    root = createRoot(scrollerEl)
    const containerRef = { current: scrollerEl } as RefObject<HTMLDivElement | null>
    const el = (z: number): JSX.Element => (
      <PageColumn
        doc={doc}
        totalPages={3}
        zoom={z}
        layout="double"
        scrollContainerRef={containerRef}
        renderPage={(no) => <span data-rendered-page={no} />}
        onPageRender={() => undefined}
        onError={() => undefined}
      />
    )
    await act(async () => {
      root?.render(el(1))
    })
    expect(host!.querySelectorAll('[data-page-box]')).toHaveLength(3)
    scrollerEl.scrollTop = 400
    act(() => {
      scrollerEl.dispatchEvent(new Event('scroll'))
    })
    await act(async () => {
      root?.render(el(2))
    })
    // 双页行总高：792×2+12=1596 → 792×2×2+12=3180；中心比 400/1596（jsdom clientHeight=0）
    expect(scrollerEl.scrollTop).toBeCloseTo((400 / 1596) * 3180, 3)
    expect(scrollerEl.scrollTop).toBe(anchoredScrollTop(400, 0, 1596, 3180))
  })
})

describe('F-R1 双页 —— ReaderToolbar 面', () => {
  function toolbarProps(over: Partial<Parameters<typeof ReaderToolbar>[0]>): Parameters<typeof ReaderToolbar>[0] {
    return {
      page: 0,
      totalPages: 10,
      zoom: 1,
      color: 'yellow',
      onNavigate: () => undefined,
      onZoom: () => undefined,
      onColor: () => undefined,
      ...over
    }
  }

  function findBtn(name: string): HTMLButtonElement {
    const b = [...host!.querySelectorAll('button')].find((x) => x.textContent === name)
    expect(b).toBeDefined()
    return b as HTMLButtonElement
  }

  it('⑤a 双页按钮：aria-pressed 反映 pageLayout；选中态强调边框；点击恰调一次 onTogglePageLayout', async () => {
    const onToggle = vi.fn()
    await mount(
      <ReaderToolbar
        {...toolbarProps({ pageLayout: 'single', onTogglePageLayout: onToggle })}
      />
    )
    const btn = findBtn('双页')
    expect(btn.getAttribute('aria-pressed')).toBe('false')
    act(() => {
      btn.click()
    })
    expect(onToggle).toHaveBeenCalledTimes(1)
    remount(
      <ReaderToolbar
        {...toolbarProps({ pageLayout: 'double', onTogglePageLayout: onToggle })}
      />
    )
    expect(findBtn('双页').getAttribute('aria-pressed')).toBe('true')
    expect(findBtn('双页').style.borderColor).toBe('var(--accent)')
  })

  it('⑤b pageStep=2 翻面步进：下一页 onNavigate(page+2)；上一页 onNavigate(page−2)；首页禁用上一页', async () => {
    const onNavigate = vi.fn()
    await mount(
      <ReaderToolbar {...toolbarProps({ page: 0, pageStep: 2, onNavigate })} />
    )
    expect(findBtn('上一页').disabled).toBe(true)
    act(() => {
      findBtn('下一页').click()
    })
    expect(onNavigate).toHaveBeenCalledWith(2)
    remount(
      <ReaderToolbar {...toolbarProps({ page: 2, pageStep: 2, onNavigate })} />
    )
    act(() => {
      findBtn('上一页').click()
    })
    expect(onNavigate).toHaveBeenCalledWith(0)
    act(() => {
      findBtn('下一页').click()
    })
    expect(onNavigate).toHaveBeenCalledWith(4)
  })

  it('⑤c 缺省 pageStep 回归：不传=±1（既有零变）', async () => {
    const onNavigate = vi.fn()
    await mount(
      <ReaderToolbar {...toolbarProps({ page: 3, onNavigate })} />
    )
    act(() => {
      findBtn('下一页').click()
    })
    expect(onNavigate).toHaveBeenCalledWith(4)
    act(() => {
      findBtn('上一页').click()
    })
    expect(onNavigate).toHaveBeenCalledWith(2)
  })
})

describe('F-R1 双页 —— fitWidth 分母注入面', () => {
  it('⑥ basis=onReady 双页口径单源：fit 数学 (clientWidth−24)/basis 使最宽完整行恰入视口', async () => {
    const { doc } = makeDoc(FIVE)
    const onReady = vi.fn()
    await mount(
      <PageColumn
        doc={doc}
        totalPages={5}
        zoom={1}
        layout="double"
        renderPage={(no) => <span data-rendered-page={no} />}
        onPageRender={() => undefined}
        onError={() => undefined}
        onReady={onReady}
      />
    )
    const basis = onReady.mock.calls[0]![0] as number
    // 分母随口径变：双页 basis=最宽完整行宽（>单页最宽页——S2 双页并排恰入视口的几何前提）
    expect(basis).toBe(columnWidthFor(fiveSizes, 1, 'double'))
    expect(basis).toBeGreaterThan(columnWidthFor(fiveSizes, 1, 'single'))
    // 装配面 fitWidth 公式（F-V2 分子=uiScale×(clientWidth−24)——uiScale 取
    // 滚动容器 gBCR/offsetWidth 比值，页列 R2-SET1 反向补偿使页视觉恒 1 故
    // 按 uiScale 放大分子；本桩 ui-scale=1 → 比值 1 退化同值）：zoom=(clientWidth−24)/basis
    // → 行宽（含行内 gap）恰入内容区（真布局归真机探针场景 B）
    const clientWidth = 1200
    const zoom = (clientWidth - 24) / basis
    const rows = layoutRows(fiveSizes)
    const widest = Math.max(
      ...rows.filter((r) => r.right !== undefined).map((r) => rowWidth(r, zoom))
    )
    expect(widest).toBeLessThanOrEqual(clientWidth - 24)
    expect(widest).toBeGreaterThan(clientWidth - 24 - 2)
  })
})
