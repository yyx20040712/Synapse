// @vitest-environment jsdom
/**
 * [F-A4] selection-paint —— 选区视觉并集自绘+标注贴行自适应+工具条定位
 * 归一（票面 §5 文化层新测试，always-active——ADR-0017 裁决 3 不经
 * guardedDescribe）。
 *
 * 覆盖三面：
 * - a 面（S1~S5）：拖选防抖路径自绘并集层渲染（相邻行重叠输入→块数=行数
 *   +块两两垂直分离=「单层单绘不叠深」）+保存 rects 与自绘块同源（所见即
 *   所存 S2）+Escape 工具条收而自绘留至选区真清（INV-37 修订语义 S5）；
 *   [F-A6-c] S1b/S1c 两 it 改写为 rAF 语义（调度 rAF 对齐——帧前零渲染/单帧
 *   渲染/帧随动断言面；S1/S2/S5 走 mouseup/防抖零改）；
 * - b 面：rectStyle band 自适应（顶贴字形带顶/底贴底——F-11 分数语义的
 *   自适应实现）+缺省 band 分数路径回归锚+bandFromMetrics 纯几何+
 *   AnnotationLayer 挂 B 接线（resolve→band→渲染）；
 * - c 面：定位差值÷有效 zoom（clientWidth/gBCR.width 归一）+滚动容器
 *   可视区夹取+选区近顶下翻转。
 * 形态 crib selection-layer.test.tsx（jsdom 指令/api mock/rects 桩表/
 * getClientRects 桩——多行夹具经 Range.getClientRects 注入）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub, stubUnwrap } from '../../utils/api-client-mock'
import {
  stubElementRects,
  stubRangeClientRects,
  stubRangeGBCR,
  type StubBox
} from '../../utils/geometry'
import { mkItem, mkText, seedRegistry } from '../../utils/factories'
import { SelectionLayer } from '../../../src/renderer/features/reader/interact/SelectionLayer'
import { AnnotationLayer } from '../../../src/renderer/features/reader/view/AnnotationLayer'
import { rectStyle } from '../../../src/renderer/features/reader/anchors/annotation-style'
import { bandFromMetrics } from '../../../src/renderer/features/reader/anchors/annotation-resolve'
import { PAGE_LAYER_Z } from '../../../src/renderer/features/reader/state/page-layer-z'
import { usePageItemsStore } from '../../../src/renderer/features/reader/anchors/page-items.store'
import type { Annotation, AnnotationRect } from '@shared/models/annotation'


const saveMock = vi.fn()
makeApiStub({ reader: { saveAnnotation: saveMock } })
// unwrap 透传 Result.data（成功路径——失败路径不经组件分支外的形态）
stubUnwrap(async (p: Promise<{ ok: boolean; data: unknown }>): Promise<unknown> => {
  const r = await p
  return r.data
})

/** jsdom 无布局：元素 rect 按预设表返回 */
const rects = new Map<Element, StubBox>()
/** Range 客户端矩形桩（多行选区夹具的输入面——视口坐标） */
let clientRects: StubBox[] = []
/** 选区 range rect 桩（工具条定位输入——视口坐标） */
let rangeRect = { x: 10, y: 900, width: 200, height: 20 }
let rangeStub: { restore(): void } | null = null
let clientRectsStub: { restore(): void } | null = null

/** 单页夹具：页盒（data-page-root）+textLayer+单 span；rect 桩按参数注入 */
function makePage(no: string, box: { x: number; y: number; width: number; height: number }, text: string): { page: HTMLElement; textLayer: HTMLElement; span: HTMLElement } {
  const page = document.createElement('div')
  page.setAttribute('data-page-root', no)
  const textLayer = document.createElement('div')
  textLayer.className = 'textLayer'
  const span = document.createElement('span')
  span.textContent = text
  textLayer.appendChild(span)
  page.appendChild(textLayer)
  rects.set(page, box)
  rects.set(textLayer, box)
  return { page, textLayer, span }
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
const fireMouseUp = (): void => {
  document.dispatchEvent(new MouseEvent('mouseup'))
}

let root: Root | null = null
let host: HTMLDivElement | null = null
let onSaved: ReturnType<typeof vi.fn>

async function mountLayer(pageRoot: HTMLElement): Promise<void> {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => {
    root?.render(<SelectionLayer pageRoot={pageRoot} paperId="p-1" page={0} onSaved={onSaved} />)
  })
}

const toolbar = (): HTMLElement | null => host?.querySelector<HTMLElement>('[data-testid="selection-toolbar"]') ?? null
/** 自绘层经 portal 渲染进选区所在页盒（宿主树外）——document 级查询 */
const paintLayer = (): HTMLElement | null => document.querySelector<HTMLElement>('[data-testid="selection-rects"]')
const paintBlocks = (): HTMLElement[] => Array.from(document.querySelectorAll<HTMLElement>('[data-testid="selection-rect"]'))

/** 内联百分比数值（top/height/left——几何断言共用） */
const pct = (el: HTMLElement, prop: 'top' | 'height' | 'left' | 'width'): number => parseFloat(el.style[prop])

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  rects.clear()
  usePageItemsStore.getState().clear()
  clientRects = []
  rangeRect = { x: 10, y: 900, width: 200, height: 20 }
  onSaved = vi.fn()
  ;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
  stubElementRects(rects)
  rangeStub = stubRangeGBCR(() => rangeRect)
  clientRectsStub = stubRangeClientRects(() => clientRects)
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
  clientRectsStub?.restore()
  document.body.innerHTML = ''
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('F-A4 a 面 —— 自绘并集层（单层单绘不叠深）', () => {
  it('S1 拖选防抖路径渲染自绘层：跨 3 行重叠输入（行间 4px 垂直重叠）→块数=行数+两两垂直分离+色 token 载体（--reader-selection-paint）', async () => {
    const { page, span } = makePage('1', { x: 100, y: 200, width: 600, height: 800 }, 'alpha beta gamma delta')
    document.body.appendChild(page)
    await mountLayer(page)
    // 相邻行盒 4px 垂直重叠（重叠率 0.2<0.25 行间判别带）——CSS 回退度量下
    // native ::selection 会 0.20×2 叠深的输入形态
    clientRects = [
      { x: 100, y: 200, width: 300, height: 20 },
      { x: 100, y: 216, width: 280, height: 20 },
      { x: 100, y: 232, width: 260, height: 20 }
    ]
    selectRange(span.firstChild!, 0, span.firstChild!, 4)
    fireSelectionChange()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200)
    })
    expect(paintLayer()).not.toBeNull()
    const blocks = paintBlocks()
    expect(blocks.length).toBe(3)
    for (const b of blocks) {
      // [F-CSS-03] 断言载体随 token 化迁移（值面由 theme.test.ts TOKENS 正锚独立锁定）
      expect(b.style.background).toBe('var(--reader-selection-paint)')
    }
    // 归并后行间钳制：按 top 排序两两 bottom ≤ next.top+1e-9（输入重叠被
    // 消除——「重叠部分渲染不加深」的构造性保证）
    const byTop = [...blocks].sort((a, b) => pct(a, 'top') - pct(b, 'top'))
    for (let i = 1; i < byTop.length; i += 1) {
      expect(pct(byTop[i - 1]!, 'top') + pct(byTop[i - 1]!, 'height')).toBeLessThanOrEqual(pct(byTop[i]!, 'top') + 1e-9)
    }
  })

  it('S1b 拖选期零视觉反馈回归守卫（B1/门一回炉→F-A6-c rAF 语义改写）：首 selectionchange 即排 rAF——单帧（16ms）内自绘层渲染且帧前零渲染（rAF 对齐非同步节流），工具条防抖 200ms 语义保持（t=150 仍不出条——防抖窗改短在此红）', async () => {
    const { page, span } = makePage('1', { x: 100, y: 200, width: 600, height: 800 }, 'alpha beta gamma delta')
    document.body.appendChild(page)
    seedRegistry(1, mkText([mkItem('alpha beta gamma delta', 72, 700)]))
    await mountLayer(page)
    clientRects = [{ x: 100, y: 200, width: 300, height: 20 }]
    selectRange(span.firstChild!, 0, span.firstChild!, 4)
    // 拖选首事件（无 mouseup）。修前纯防抖下 paint 到停顿 200ms 才出现
    // （=SR2-F-08 病根复活）；rAF 改形后首事件即排程、帧前零同步渲染
    fireSelectionChange()
    expect(paintLayer()).toBeNull()
    // 单帧（t=16）：leading 首事件即排 rAF——≤16ms 零反馈红线
    await act(async () => {
      await vi.advanceTimersByTimeAsync(16)
    })
    expect(paintLayer()).not.toBeNull()
    expect(paintBlocks().length).toBeGreaterThanOrEqual(1)
    // 工具条=防抖路径（既有弹出语义零变——末事件后 200ms 内不出条；t=150 锚
    // 防抖窗逐字保持，100ms 变异在此红）
    expect(toolbar()).toBeNull()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(134)
    })
    expect(toolbar()).toBeNull()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(66)
    })
    expect(toolbar()).not.toBeNull()
  })

  it('S1c 帧随动（B1/W6·门一 r2→F-A6-c rAF 语义改写）：拖选中窗口内末事件变更选区→下一帧自绘块几何随动到新位置（非首帧）——节流窗丢帧/只渲染首帧的退化在此红', async () => {
    const { page, span } = makePage('1', { x: 100, y: 200, width: 600, height: 800 }, 'alpha beta gamma delta')
    document.body.appendChild(page)
    await mountLayer(page)
    // 首帧行 A：选区 alpha（0..4），行盒 y=200 → 归一 top=0%
    clientRects = [{ x: 100, y: 200, width: 300, height: 20 }]
    selectRange(span.firstChild!, 0, span.firstChild!, 4)
    fireSelectionChange()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(16)
    })
    expect(paintBlocks().length).toBe(1)
    expect(pct(paintBlocks()[0]!, 'top')).toBeCloseTo(0, 6)
    // 拖选中（防抖 200ms 窗内，未松手）变更选区到行 B（ta b 不同文字范围 2..6，
    // 行盒 y=400 → 归一 top=25%）再发一事件——rAF 下一帧读**当下**选区随动
    //（节流窗内丢帧/只渲染首帧的旧退化在此红；旧口径 trailing 窗尾断言随 rAF
    // 改形逐帧化，语义面=「窗口内末事件必随动」保持）
    clientRects = [{ x: 100, y: 400, width: 300, height: 20 }]
    selectRange(span.firstChild!, 2, span.firstChild!, 6)
    fireSelectionChange()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(16)
    })
    const blocks = paintBlocks()
    expect(blocks.length).toBe(1)
    // 随动到新行位置（25%）——非首帧位置（0%）：首帧后不再渲染的退化在此红
    expect(pct(blocks[0]!, 'top')).toBeCloseTo(25, 4)
  })

  it('S2 所见即所存：保存 rects 与自绘块同源（块数/left/top 一致——同一 evaluate 管线产物）', async () => {
    const { page, span } = makePage('1', { x: 100, y: 200, width: 600, height: 800 }, 'alpha beta gamma delta')
    document.body.appendChild(page)
    seedRegistry(1, mkText([mkItem('alpha beta gamma delta', 72, 700)]))
    await mountLayer(page)
    clientRects = [
      { x: 100, y: 200, width: 300, height: 20 },
      { x: 100, y: 216, width: 280, height: 20 },
      { x: 100, y: 232, width: 260, height: 20 }
    ]
    selectRange(span.firstChild!, 0, span.firstChild!, 4)
    act(() => {
      fireMouseUp()
    })
    const blocks = paintBlocks()
    const saved: Annotation = {
      id: 'a-1', paperId: 'p-1', page: 0, kind: 'highlight', color: 'yellow',
      quoteText: 'alph', prefixText: '', suffixText: '', startOffset: 0, endOffset: 4,
      rects: [], comment: '', createdAt: '2026-08-31T00:00:00Z', updatedAt: '2026-08-31T00:00:00Z'
    }
    saveMock.mockResolvedValue({ ok: true, data: saved })
    await act(async () => {
      const highlight = Array.from(toolbar()!.querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent === '高亮')!
      highlight.click()
      await vi.advanceTimersByTimeAsync(0)
    })
    const arg = saveMock.mock.calls[0]![0] as { annotation: { rects: AnnotationRect[] } }
    expect(arg.annotation.rects.length).toBe(blocks.length)
    for (let i = 0; i < blocks.length; i += 1) {
      expect(pct(blocks[i]!, 'left')).toBeCloseTo(arg.annotation.rects[i]!.x * 100, 6)
      expect(pct(blocks[i]!, 'top')).toBeCloseTo(arg.annotation.rects[i]!.y * 100, 6)
    }
    // 保存落地即清（选区 removeAllRanges 同步语义）
    expect(paintLayer()).toBeNull()
  })

  it('S5 Escape：工具条收而自绘层保留；选区真清除（坍缩+selectionchange）→自绘随清（INV-37 视觉-状态严格同步）', async () => {
    const { page, span } = makePage('1', { x: 100, y: 200, width: 600, height: 800 }, 'alpha beta gamma delta')
    document.body.appendChild(page)
    seedRegistry(1, mkText([mkItem('alpha beta gamma delta', 72, 700)]))
    await mountLayer(page)
    clientRects = [{ x: 100, y: 200, width: 300, height: 20 }]
    selectRange(span.firstChild!, 0, span.firstChild!, 4)
    act(() => {
      fireMouseUp()
    })
    expect(toolbar()).not.toBeNull()
    expect(paintLayer()).not.toBeNull()
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    })
    expect(toolbar()).toBeNull()
    expect(paintLayer()).not.toBeNull()
    window.getSelection()?.removeAllRanges()
    fireSelectionChange()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200)
    })
    expect(paintLayer()).toBeNull()
  })
})

describe('F-A4 b 面 —— rectStyle 行盒自适应（band）', () => {
  it('band 在场：highlight 顶=band.top、高=band.bottom−band.top（顶贴字形顶缘底贴底缘）', () => {
    const r: AnnotationRect = { page: 0, x: 0.1, y: 0.2, w: 0.3, h: 0.02 }
    const s = rectStyle('highlight', 'yellow', r, { top: 0.205, bottom: 0.238 })
    expect(parseFloat(s.top as string)).toBeCloseTo(20.5, 6)
    expect(parseFloat(s.height as string)).toBeCloseTo(3.3, 6)
  })

  it('band 在场：underline 实条贴 band.bottom 上方 2px（calc 形态）', () => {
    const r: AnnotationRect = { page: 0, x: 0.1, y: 0.2, w: 0.3, h: 0.02 }
    const s = rectStyle('underline', 'yellow', r, { top: 0.205, bottom: 0.238 })
    expect(s.top).toBe('calc(23.8% - 2px)')
    expect(s.height).toBe('2px')
  })

  it('band 缺省：F-11 分数路径原样（回归锚——存量 rects 无 band 时的兜底）', () => {
    const r: AnnotationRect = { page: 0, x: 0.1, y: 0.2, w: 0.3, h: 0.02 }
    const s = rectStyle('highlight', 'yellow', r)
    expect(parseFloat(s.top as string)).toBeCloseTo(20.2, 6)
    expect(parseFloat(s.height as string)).toBeCloseTo(1.56, 6)
  })

  it('bandFromMetrics 纯几何：span 盒+字体度量→归一化字形带（fs<布局带高时半前导为负——基线随 CSS 负前导下沉）', () => {
    const band = bandFromMetrics(
      { x: 100, y: 200, w: 300, h: 16 },
      16,
      { ascent: 12, descent: 4, fontAscent: 14, fontDescent: 4 },
      { x: 100, y: 200, w: 600, h: 800 }
    )
    expect(band).not.toBeNull()
    // 半前导=(16−18)/2=−1（内容区溢出行盒，负值不钳 0——钳 0 即带整体下偏
    // 1px，真机 diag 实锤方向）；基线=200−1+14=213；带 [201,217]→[0.00125,0.02125]
    expect(band!.top).toBeCloseTo(0.00125, 10)
    expect(band!.bottom).toBeCloseTo(0.02125, 10)
    expect(band!.center).toBeCloseTo(0.01125, 10)
  })

  it('AnnotationLayer 挂 B 接线：resolve→band 匹配→渲染顶/高=band 值（非 F-11 分数）', async () => {
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback): number => {
      cb(0)
      return 0
    })
    const { page, span } = makePage('1', { x: 0, y: 0, width: 600, height: 800 }, 'SMART WATER TEST DOC')
    document.body.appendChild(page)
    // span 实测盒（b② 行盒量测源——bandFromMetrics 输入；与 textLayer 盒同坐标系）
    rects.set(span, { x: 30, y: 200, width: 300, height: 16 })
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      font: '',
      measureText: () => ({
        actualBoundingBoxAscent: 12,
        actualBoundingBoxDescent: 4,
        fontBoundingBoxAscent: 14,
        fontBoundingBoxDescent: 4
      })
    } as unknown as CanvasRenderingContext2D)
    const ann: Annotation = {
      id: 'a-1', paperId: 'p-1', page: 0, kind: 'highlight', color: 'yellow',
      quoteText: 'SMART WATER TEST DOC', prefixText: '', suffixText: '', startOffset: 0, endOffset: 20,
      rects: [{ page: 0, x: 0.05, y: 0.25, w: 0.5, h: 0.02 }], comment: '',
      createdAt: '2026-08-31T00:00:00Z', updatedAt: '2026-08-31T00:00:00Z'
    }
    const h2 = document.createElement('div')
    document.body.appendChild(h2)
    const r2 = createRoot(h2)
    await act(async () => {
      r2.render(<AnnotationLayer annotations={[ann]} page={0} pageRoot={page} onChanged={() => undefined} />)
    })
    const block = h2.querySelector<HTMLElement>('[data-testid="annotation-rect"]')
    expect(block).not.toBeNull()
    // span 盒 (30,200,300,16)——重锚 resolve 后 band 匹配：半前导 −1→基线 213
    // →顶 201/800=25.125%/高 16/800=2%（F-11 分数路径=顶 25.2%/高 1.56%——可区分）
    expect(pct(block!, 'top')).toBeCloseTo(25.125, 4)
    expect(pct(block!, 'height')).toBeCloseTo(2, 4)
    act(() => {
      r2.unmount()
    })
    h2.remove()
    vi.unstubAllGlobals()
  })
})

describe('F-A4 c 面 —— 工具条定位归一（÷有效 zoom+视口夹取+近顶下翻转）', () => {
  /** 滚动容器夹具：scroller(overflow-auto) > mount > page1（页盒）；rects 桩 */
  function makeScrollerFixture(mountBox: { x: number; y: number; width: number; height: number }): HTMLElement {
    const scroller = document.createElement('div')
    scroller.className = 'overflow-auto'
    const mount = document.createElement('div')
    scroller.appendChild(mount)
    document.body.appendChild(scroller)
    rects.set(scroller, { x: 0, y: 600, width: 1200, height: 500 })
    rects.set(mount, mountBox)
    return mount
  }

  it('归一：mount 有效 zoom=0.8（clientWidth 480/gBCR 600）→工具条 left/top=视口差×0.8', async () => {
    const mount = makeScrollerFixture({ x: 0, y: 600, width: 600, height: 2000 })
    Object.defineProperty(mount, 'clientWidth', { value: 480, configurable: true })
    const { page, span } = makePage('1', { x: 0, y: 620, width: 600, height: 800 }, 'alpha beta')
    mount.appendChild(page)
    seedRegistry(1, mkText([mkItem('alpha beta', 72, 700)]))
    await mountLayer(mount)
    rangeRect = { x: 10, y: 630, width: 200, height: 20 }
    selectRange(span.firstChild!, 0, span.firstChild!, 4)
    act(() => {
      fireMouseUp()
    })
    const bar = toolbar()
    expect(bar).not.toBeNull()
    expect(parseFloat(bar!.style.left)).toBeCloseTo(8, 2)
    // 选区顶距 scroller 顶 30px<42 → 翻转到选区下方：y_vp=630+20+8=658→(658−600)×0.8=46.4
    expect(parseFloat(bar!.style.top)).toBeCloseTo(46.4, 1)
  })

  it('近顶下翻转：选区顶距滚动容器顶 <42px →工具条放选区下方（top ≥ 选区底）', async () => {
    const mount = makeScrollerFixture({ x: 0, y: 600, width: 1200, height: 2000 })
    const { page, span } = makePage('1', { x: 0, y: 620, width: 600, height: 800 }, 'alpha beta')
    mount.appendChild(page)
    seedRegistry(1, mkText([mkItem('alpha beta', 72, 700)]))
    await mountLayer(mount)
    rangeRect = { x: 10, y: 630, width: 200, height: 20 }
    selectRange(span.firstChild!, 0, span.firstChild!, 4)
    act(() => {
      fireMouseUp()
    })
    const bar = toolbar()
    expect(bar).not.toBeNull()
    // 翻转后 y_vp=658；选区底 650——工具条顶 58（mount 本地）≥ 选区底本地 50
    expect(parseFloat(bar!.style.top)).toBeCloseTo(58, 6)
  })

  it('视口夹取：选区右缘越滚动容器右缘 → left 夹到容器内（1200−180=1020）', async () => {
    const mount = makeScrollerFixture({ x: 0, y: 600, width: 1200, height: 2000 })
    const { page, span } = makePage('1', { x: 0, y: 620, width: 600, height: 800 }, 'alpha beta')
    mount.appendChild(page)
    seedRegistry(1, mkText([mkItem('alpha beta', 72, 700)]))
    await mountLayer(mount)
    rangeRect = { x: 1150, y: 1000, width: 200, height: 20 }
    selectRange(span.firstChild!, 0, span.firstChild!, 4)
    act(() => {
      fireMouseUp()
    })
    const bar = toolbar()
    expect(bar).not.toBeNull()
    expect(parseFloat(bar!.style.left)).toBeCloseTo(1020, 6)
  })
})

describe('F-A5 —— band 单源自绘（a 面）+水平夹取+层序常量（c 面）', () => {
  /** 公共夹具：span 实测盒 (100,200,300,16)+canvas 字体度量桩
   *  （半前导=(16−18)/2=−1 基线=213 band=[201,217]→归一 [0.125%,2.125%]；
   *  行盒路径（修前）=clientRect 原样 top 0%/height 2.5%——可区分） */
  async function mountBandPage(): Promise<{ span: HTMLElement }> {
    const { page, span } = makePage('1', { x: 100, y: 200, width: 600, height: 800 }, 'alpha beta gamma delta')
    document.body.appendChild(page)
    // span 簇 [200,500]（归一 x0=16.667%/x1=66.667%——a2 夹取差的构造前提）
    rects.set(span, { x: 200, y: 200, width: 300, height: 16 })
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      font: '',
      measureText: () => ({
        actualBoundingBoxAscent: 12,
        actualBoundingBoxDescent: 4,
        fontBoundingBoxAscent: 14,
        fontBoundingBoxDescent: 4
      })
    } as unknown as CanvasRenderingContext2D)
    await mountLayer(page)
    return { span }
  }

  it('a1 自绘块垂直=行簇字形带（band 单源——非 CSS 回退行盒）：top/height=band 值', async () => {
    const { span } = await mountBandPage()
    // 行盒（CSS 回退度量）高 20——修前自绘块=top 0%/height 2.5%
    clientRects = [{ x: 100, y: 200, width: 300, height: 20 }]
    selectRange(span.firstChild!, 0, span.firstChild!, 4)
    act(() => {
      fireMouseUp()
    })
    const blocks = paintBlocks()
    expect(blocks.length).toBe(1)
    // band=[201,217]/800：top=0.125%/height=2%（与标注层同基准——三消费点同源）
    expect(pct(blocks[0]!, 'top')).toBeCloseTo(0.125, 4)
    expect(pct(blocks[0]!, 'height')).toBeCloseTo(2, 4)
  })

  it('a2 自绘块水平界=行簇 span 实际端点：行盒越出 span 簇→左右夹入 [x0,x1]', async () => {
    const { span } = await mountBandPage()
    // 行盒 x∈[40,440] 左越 span 簇 [200,500]——修前 left=0%/width=56.67% 原样
    clientRects = [{ x: 40, y: 200, width: 400, height: 20 }]
    selectRange(span.firstChild!, 0, span.firstChild!, 4)
    act(() => {
      fireMouseUp()
    })
    const blocks = paintBlocks()
    expect(blocks.length).toBe(1)
    // 夹入 span 簇实际端点：left=(100−100)/600=16.667%/right=(400−100)/600→width=50%
    expect(pct(blocks[0]!, 'left')).toBeCloseTo(100 / 6, 4)
    expect(pct(blocks[0]!, 'width')).toBeCloseTo(50, 4)
  })

  it('c1 自绘层 z=层级常量最上（选区交互视觉保持最上——票面 §0c）', async () => {
    const { span } = await mountBandPage()
    clientRects = [{ x: 100, y: 200, width: 300, height: 20 }]
    selectRange(span.firstChild!, 0, span.firstChild!, 4)
    act(() => {
      fireMouseUp()
    })
    expect(paintLayer()!.style.zIndex).toBe(String(PAGE_LAYER_Z.selectionPaint))
  })

  it('c2 层序常量单源（防回归序）：色块垫底 < canvas < 自绘最上；textLayer 官方 z0 在色块下（视觉透明无碍）', () => {
    expect(PAGE_LAYER_Z.canvas).toBeGreaterThan(PAGE_LAYER_Z.colorBlocks)
    expect(PAGE_LAYER_Z.selectionPaint).toBeGreaterThan(PAGE_LAYER_Z.canvas)
    expect(PAGE_LAYER_Z.text).toBe(0)
  })
})
