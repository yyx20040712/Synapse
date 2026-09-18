// @vitest-environment jsdom
/**
 * [F-A9] band-calibration —— 标注带垂直几何 DOM span 校准（渲染时刻方案 A）
 * ——always-active，诞生即锁（ADR-2017 裁决 3 同款不经 guardedDescribe）。
 *
 * 覆盖四面：
 * - 纯几何：calibrateBandsWithSpans（项几何派生 band → 同基线行 textLayer span
 *   盒实测校准 calTop/calBottom）+ 窗口语义（span 中心∈band 垂直域+水平重叠
 *   才命中——受锁 item-chain 夹具的「span 与项链刻意错开 116px」形态不命中=
 *   项链产物零变）+ 回退零变（零 span/零宽 span/jsdom 无布局 → cal 域缺席）；
 * - matchBand 替换：cal 域在场 → 返回 top/bottom=校准值（匹配仍按派生 center
 *   ——错绑零风险）；cal 缺席 → 派生值原样（存量回退语义零变）；
 * - 标注链挂载（AnnotationLayer）：真机 β 形态夹具（fontH 8/声明高 4.9/ascent
 *   0.75——band 顶≈span 顶而 band 高<行盒高=underline 低位切字缺陷形态，
 *   f-a9-real6「A systematic literature review」7.97px 行在档）→ highlight 带
 *   y=行盒顶/高=行盒高、underline=底缘下 2px；大字号（18px，f-a9-diag 形态）
 *   校准后=span 行盒值不回退；
 * - 预览链挂载（SelectionLayer）：paint 块 top/height=校准值（img1 灰带偏移
 *   消）+落库 rects 不受校准（INV-58 前半——校准只动显示带不动 rects 派生域）。
 *
 * 夹具口径 crib selection-item-chain.test.tsx（textLayer 盒视口绝对位 (500,300)
 * 域锁；span gBCR 按预设表桩注）。期望值手算见各 it 注。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub, stubUnwrap } from '../../utils/api-client-mock'
import { stubElementRects, stubRangeGBCR, type StubBox } from '../../utils/geometry'
import { AnnotationLayer } from '../../../src/renderer/features/reader/AnnotationLayer'
import { SelectionLayer } from '../../../src/renderer/features/reader/interact/SelectionLayer'
import { calibrateBandsWithSpans } from '../../../src/renderer/features/reader/anchors/annotation-band-calibrate'
import { matchBand, type RowBand } from '../../../src/renderer/features/reader/anchors/annotation-resolve'
import { usePageItemsStore, type PageItemEntry } from '../../../src/renderer/features/reader/anchors/page-items.store'
import { createReaderStoreInitialState, useReaderStore } from '../../../src/renderer/features/reader/state/reader.store'
import type { PdfTextContent, PdfTextItem, PdfTextStyle } from '../../../src/renderer/features/reader/PdfPageCanvas'
import type { Annotation } from '@shared/models/annotation'


const saveMock = vi.fn()
makeApiStub({ reader: { saveAnnotation: saveMock } })
// unwrap 透传 Result.data（成功路径——失败路径不经组件分支外的形态）
stubUnwrap(async (p: Promise<{ ok: boolean; data: unknown }>): Promise<unknown> => {
  const r = await p
  return r.data
})

/** jsdom 无布局：元素 rect 按预设表返回 */
const rects = new Map<Element, StubBox>()
let rangeStub: { restore(): void } | null = null
const rangeRect = { x: 10, y: 900, width: 200, height: 20 }

/** [F-A9 β 形态] 字体样式：ascent 0.75 声明（≠pdf.js span 定位的回退字体量测
 *  ratio——两口径系统差即缺陷根源，pdf.mjs #getAscent 在档） */
const A9_STYLE: PdfTextStyle = { fontFamily: 'serif', ascent: 0.75, descent: -0.25, vertical: false }

/** 三段文本（S1 对账前提：DOM span 文本=剔空串项拼接同串） */
const A9_PARAS = ['前文第一段', '中段正文内容', '后文第三段']

/** [F-A9 β 形态] 造项：字号 8（fontH）、宽 100、**声明高 4.9**（≠fontH——
 *  band 高 4.9<行盒高 8=真机 7.97px 行 item.height 形态）；中段基线 PDF y=672
 *  →css 基线 120、oy=120−0.75×8=114、派生 band 本地 [114,118.9] */
function a9Item(str: string, y: number): PdfTextItem {
  return { str, dir: 'ltr', width: 100, height: 4.9, transform: [8, 0, 0, 8, 72, y], fontName: 'g1', hasEOL: false }
}

function a9Items(): PdfTextItem[] {
  // 三段基线 PDF y=700/672/644（quote '正文' 落中段）
  return A9_PARAS.map((str, i) => a9Item(str, 700 - i * 28))
}

function a9Entry(items: PdfTextItem[], style: PdfTextStyle = A9_STYLE): PageItemEntry {
  return {
    page: 1,
    text: { items, styles: { g1: style }, lang: null } as PdfTextContent,
    geometry: { rotate: 0, view: [0, 0, 612, 792] },
    box: { w: 612, h: 792 }
  }
}

/** 页根+textLayer 单 span（文本=items 拼接——对账前提）。textLayer 盒视口
 *  (500,300,612,792)（gBCR 原点≠0 域锁——校准须以 textLayer 盒做视口→盒本地
 *  换算）；span 盒=β 形态：本地 [114.2,122.2]（行盒高 8=fontH、顶=派生 band 顶
 *  +0.2px——span 中心 118.2∈派生 band 垂直域 [114,118.9] 命中校准窗） */
function mountPage(itemsText: string, spanBox?: { x: number; y: number; width: number; height: number }): { page: HTMLElement; textLayer: HTMLElement; span: HTMLElement } {
  const page = document.createElement('div')
  page.setAttribute('data-page-root', '1')
  const textLayer = document.createElement('div')
  textLayer.className = 'textLayer'
  const span = document.createElement('span')
  span.textContent = itemsText
  textLayer.appendChild(span)
  page.appendChild(textLayer)
  document.body.appendChild(page)
  rects.set(page, { x: 500, y: 300, width: 612, height: 792 })
  rects.set(textLayer, { x: 500, y: 300, width: 612, height: 792 })
  if (spanBox !== undefined) {
    rects.set(span, spanBox)
  }
  return { page, textLayer, span }
}

/** β 形态 span 桩·中段行（本地 [114.2,122.2]→视口 y=300+114.2；水平本地
 *  [72,172] 与 band x0/x1 同区间——水平重叠窗命中） */
const BETA_SPAN_MID = { x: 572, y: 414.2, width: 100, height: 8 }

/** β 形态 span 桩·首行（单 item 'AB' 基线 700→css 92/oy=86：本地 [86.2,94.2]
 *  ——span 中心 90.2∈派生 band 垂直域 [86,90.9] 命中） */
const BETA_SPAN_TOP = { x: 572, y: 386.2, width: 100, height: 8 }

let root: Root | null = null
let host: HTMLDivElement | null = null

async function mountAnnotation(ann: Annotation, pageRoot: HTMLElement): Promise<void> {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => {
    root?.render(<AnnotationLayer annotations={[ann]} page={0} pageRoot={pageRoot} onChanged={() => undefined} />)
  })
}

async function mountSelection(pageRoot: HTMLElement): Promise<void> {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => {
    root?.render(<SelectionLayer pageRoot={pageRoot} paperId="p-1" page={0} onSaved={() => undefined} />)
  })
}

function a9Annotation(kind: 'highlight' | 'underline'): Annotation {
  return {
    id: 'a-a9',
    paperId: 'p-1',
    page: 0,
    kind,
    color: 'yellow',
    quoteText: '正文',
    prefixText: '中段',
    suffixText: '内容',
    startOffset: 7,
    endOffset: 9,
    rects: [{ page: 0, x: 0.05, y: 0.25, w: 0.5, h: 0.02 }],
    comment: '',
    createdAt: '2026-09-09T00:00:00Z',
    updatedAt: '2026-09-09T00:00:00Z'
  }
}

const pct = (el: Element, prop: 'top' | 'height' | 'left' | 'width'): number => parseFloat((el as HTMLElement).style[prop])

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

describe('F-A9 纯几何 —— calibrateBandsWithSpans（窗口+回退零变）', () => {
  /** 中段行派生 band（bandsFromItems 口径手算：top=114/792、bottom=118.9/792） */
  const derived: RowBand[] = [
    { top: 114 / 792, bottom: 118.9 / 792, center: 116.45 / 792, x0: 72 / 612, x1: 172 / 612 }
  ]

  it('β 形态命中：span 中心∈band 垂直域+水平重叠 → calTop/calBottom=span 行盒顶/底（带 y=行盒顶/高=行盒高）', () => {
    const { textLayer } = mountPage(A9_PARAS.join(''), BETA_SPAN_MID)
    const out = calibrateBandsWithSpans(textLayer, derived, { x: 0, y: 0, w: 612, h: 792 })
    expect(out.length).toBe(1)
    expect(out[0]!.calTop).toBeCloseTo(114.2 / 792, 6)
    expect(out[0]!.calBottom).toBeCloseTo(122.2 / 792, 6)
  })

  it('窗口不命中（span 中心域外——受锁 item-chain 夹具形态）→ cal 域缺席（项链产物零变）', () => {
    const { textLayer } = mountPage(A9_PARAS.join(''), { x: 572, y: 500, width: 100, height: 10 })
    const out = calibrateBandsWithSpans(textLayer, derived, { x: 0, y: 0, w: 612, h: 792 })
    expect(out.length).toBe(1)
    expect(out[0]!.calTop).toBeUndefined()
    expect(out[0]!.calBottom).toBeUndefined()
  })

  it('水平不重叠（span 在 band 水平域外）→ cal 缺席', () => {
    const { textLayer } = mountPage(A9_PARAS.join(''), { x: 900, y: 414.2, width: 100, height: 8 })
    const out = calibrateBandsWithSpans(textLayer, derived, { x: 0, y: 0, w: 612, h: 792 })
    expect(out[0]!.calTop).toBeUndefined()
  })

  it('回退零变：零量测 span（零宽/零高——jsdom 无布局形态）与无 span → 原样返回（含派生域全等）', () => {
    const zero = mountPage(A9_PARAS.join(''), { x: 572, y: 414.2, width: 0, height: 0 })
    expect(calibrateBandsWithSpans(zero.textLayer, derived, { x: 0, y: 0, w: 612, h: 792 })).toEqual(derived)
  })

  it('[C3] 域错配回退：量测盒宽与渲染 base 差 >1px（620 vs 612）→不校准（cal 缺席原样——域错配=回退非错校）', () => {
    const { textLayer } = mountPage(A9_PARAS.join(''), BETA_SPAN_MID)
    // textLayer 盒宽桩 620（span 池 base.w=620）——渲染 base 612 差 8px>1：
    // 若无域一致防御，span 仍垂直/水平命中窗 → cal 域在场（本断言红=防御判别力）
    rects.set(textLayer, { x: 500, y: 300, width: 620, height: 792 })
    expect(calibrateBandsWithSpans(textLayer, derived, { x: 0, y: 0, w: 612, h: 792 })).toEqual(derived)
  })

  it('[C3] 盒退化回退：textLayer 盒高 ≤1（jsdom 无布局/空层形态）→不校准原样', () => {
    const { textLayer } = mountPage(A9_PARAS.join(''), BETA_SPAN_MID)
    rects.set(textLayer, { x: 500, y: 300, width: 612, height: 1 })
    expect(calibrateBandsWithSpans(textLayer, derived, { x: 0, y: 0, w: 612, h: 792 })).toEqual(derived)
  })
})

describe('F-A9 matchBand —— cal 域替换（匹配键仍派生 center）', () => {
  it('cal 在场：返回 top/bottom=校准值；匹配按派生 center（rect 绑正确行不受校准位移干扰）', () => {
    const bands: RowBand[] = [
      { top: 114 / 792, bottom: 118.9 / 792, center: 116.45 / 792, x0: 0.1, x1: 0.4, calTop: 114.2 / 792, calBottom: 122.2 / 792 },
      { top: 142 / 792, bottom: 146.9 / 792, center: 144.45 / 792, x0: 0.1, x1: 0.4, calTop: 142.2 / 792, calBottom: 150.2 / 792 }
    ]
    // rect=第二行几何（center 匹配第二派生带——校准后值随该带）
    const r = { page: 0, x: 0.1, y: 142 / 792, w: 0.3, h: 4.9 / 792 }
    const m = matchBand(bands, r)
    expect(m).not.toBeNull()
    expect(m!.top).toBeCloseTo(142.2 / 792, 6)
    expect(m!.bottom).toBeCloseTo(150.2 / 792, 6)
  })

  it('cal 缺席：派生 top/bottom 原样（存量回退语义零变）', () => {
    const bands: RowBand[] = [{ top: 0.2, bottom: 0.25, center: 0.225, x0: 0.1, x1: 0.4 }]
    const m = matchBand(bands, { page: 0, x: 0.1, y: 0.2, w: 0.3, h: 0.05 })
    expect(m!.top).toBeCloseTo(0.2, 6)
    expect(m!.bottom).toBeCloseTo(0.25, 6)
  })
})

describe('F-A9 标注链挂载 —— AnnotationLayer（underline 低位切字/灰带偏移消）', () => {
  it('小字号 β 形态：highlight 带 y=行盒顶/高=行盒高（calTop=114.2/792=14.4192%、高 8/792=1.0101%）', async () => {
    const { page } = mountPage(A9_PARAS.join(''), BETA_SPAN_MID)
    usePageItemsStore.getState().setEntry(a9Entry(a9Items()))
    await mountAnnotation(a9Annotation('highlight'), page)
    const block = host!.querySelector<HTMLElement>('[data-testid="annotation-rect"]')
    expect(block).not.toBeNull()
    expect(block!.getAttribute('data-source')).toBe('item')
    // 修前=派生带 top 14.1414%/高 0.6187%（f-a9-img3 低位切字形态）——判别性差
    expect(pct(block!, 'top')).toBeCloseTo((114.2 / 792) * 100, 3)
    expect(pct(block!, 'height')).toBeCloseTo((8 / 792) * 100, 3)
  })

  it('小字号 β 形态：underline=底缘下 2px 细条（top=calc(15.4293% − 2px)=span 行盒底上 2px）', async () => {
    const { page } = mountPage(A9_PARAS.join(''), BETA_SPAN_MID)
    usePageItemsStore.getState().setEntry(a9Entry(a9Items()))
    await mountAnnotation(a9Annotation('underline'), page)
    const block = host!.querySelector<HTMLElement>('[data-testid="annotation-rect"]')
    expect(block).not.toBeNull()
    // 修前=calc(15.0126% - 2px)（band.bottom=118.9/792——真机 img3 实测条落在行盒
    // 37% 处=本缺陷形态）；修后=span 行盒底 122.2/792=15.4293%
    expect(block!.style.top).toBe('calc(15.4293% - 2px)')
    expect(block!.style.height).toBe('2px')
  })

  it('大字号（18px，f-a9-diag 形态）不回退：校准=span 行盒值（top 13.1566%——非派生 13.3333%）', async () => {
    // 18px/声明高 18/ascent 0.8：中段基线 PDF y=672→css 120、oy=120−14.4=105.6、
    // 派生 band [105.6,123.6]；span 本地 [104.2,122.2]（diag 真机：span 顶在带
    // 顶上方 1.4px、同高 18——中心 113.2∈带垂直域命中）
    const style: PdfTextStyle = { fontFamily: 'serif', ascent: 0.8, descent: -0.2, vertical: false }
    const items: PdfTextItem[] = A9_PARAS.map((str, i) => ({ str, dir: 'ltr', width: 220, height: 18, transform: [18, 0, 0, 18, 72, 700 - i * 28], fontName: 'g1', hasEOL: false }))
    const { page } = mountPage(A9_PARAS.join(''), { x: 572, y: 300 + 104.2, width: 220, height: 18 })
    usePageItemsStore.getState().setEntry(a9Entry(items, style))
    await mountAnnotation(a9Annotation('highlight'), page)
    const block = host!.querySelector<HTMLElement>('[data-testid="annotation-rect"]')
    expect(block).not.toBeNull()
    expect(pct(block!, 'top')).toBeCloseTo((104.2 / 792) * 100, 3)
    expect(pct(block!, 'height')).toBeCloseTo((18 / 792) * 100, 3)
  })
})

describe('F-A9 预览链挂载 —— SelectionLayer（img1 灰预览带偏移消）', () => {
  it('paint 块垂直=校准行盒（top 10.8880%/height 1.0101%）；落库 rects=派生域零变（INV-58 前半）', async () => {
    const { page, span } = mountPage('AB', BETA_SPAN_TOP)
    usePageItemsStore.getState().setEntry(a9Entry([a9Item('AB', 700)]))
    await mountSelection(page)
    const sel = window.getSelection()
    const range = document.createRange()
    range.setStart(span.firstChild!, 0)
    range.setEnd(span.firstChild!, 2)
    sel?.removeAllRanges()
    sel?.addRange(range)
    document.dispatchEvent(new Event('selectionchange'))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200)
    })
    const rect = document.querySelector<HTMLElement>('[data-testid="selection-rect"]')
    expect(rect).not.toBeNull()
    // 修前=派生带 top 10.8586%（oy=86=700 基线行）/高 0.6187%——img1 灰带偏移形态
    expect(pct(rect!, 'top')).toBeCloseTo((86.2 / 792) * 100, 3)
    expect(pct(rect!, 'height')).toBeCloseTo((8 / 792) * 100, 3)
    // 落库 rects 不受校准：y=oy/792=86/792（项几何派生域——校准只动显示带）
    const saved: Annotation = {
      id: 'a-1', paperId: 'p-1', page: 0, kind: 'highlight', color: 'yellow',
      quoteText: 'AB', prefixText: '', suffixText: '', startOffset: 0, endOffset: 2,
      rects: [], comment: '', createdAt: '2026-09-09T00:00:00Z', updatedAt: '2026-09-09T00:00:00Z'
    }
    saveMock.mockResolvedValue({ ok: true, data: saved })
    const bar = host!.querySelector<HTMLElement>('[data-testid="selection-toolbar"]')
    expect(bar).not.toBeNull()
    await act(async () => {
      const highlight = Array.from(bar!.querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent === '高亮')!
      highlight.click()
      await vi.advanceTimersByTimeAsync(0)
    })
    const arg = saveMock.mock.calls[0]![0] as { annotation: { rects: Array<{ y: number }> } }
    expect(arg.annotation.rects[0]!.y).toBeCloseTo(86 / 792, 4)
  })
})
