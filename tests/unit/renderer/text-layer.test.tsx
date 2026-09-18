// @vitest-environment jsdom
/**
 * [F-A6-b1] TextLayer —— duckViewport rotation/rawDims 真值化（T1/T9 修复）单测
 * （受锁新增件，always-active——ADR-0017 裁决 3，不经 guardedDescribe）。
 *
 * 取证依据（scripts/audits/f-a6-forensic-verdict.md §2 T1/T9 行）：
 * - T1=/Rotate≠0 页文本层错位（合成 S1 实证 outside 5/8）——根因 duckViewport
 *   硬编码 rotation:0；
 * - T9=CropBox 原点≠0 页整体平移 x+36.01/y−37.40px（合成 S2 实证）——根因
 *   rawDims 硬编码 pageX:0/pageY:0。
 *
 * 消费语义（pdfjs-dist 4.10.38 build/pdf.mjs 源码核对，F-A6-b1 票面强制步骤）：
 * - TextLayer 构造器只读 viewport 三成员：scale（×devicePixelRatio→#scale，仅
 *   #layout 的 scaleX 量测比）、rotation（→#rotation + setLayerDimensions 写容器
 *   data-main-rotation 属性）、rawDims（→#transform=[1,0,0,-1,-pageX,pageY+pageHeight]
 *   与 span 位置百分比分母——PageViewport.rawDims getter 语义=view 跨度×userUnit）。
 * - span 位置恒在【未旋转用户空间】百分比；页旋转由容器 CSS 变换承担（官方
 *   pdf_viewer.css:3104-3112 通用 [data-main-rotation] 规则）——repo 的
 *   text-layer.css 只提取了 .textLayer 系规则，该通用规则无消费者，故修复以
 *   组件内联 transform 等价实现（rotatedContainerBox）。
 *
 * 语义级断言=jsdom 挂真 <TextLayer>（内部真 pdf.js TextLayer 类）渲染 span 断言
 * 位置百分比：jsdom 无 canvas 2d——getContext 桩（measureText/fontBoundingBoxAscent
 *   供 #getAscent/#layout 短路）；jsdom 布局量测恒 0→#minFontSize=0→span fontSize
 *   calc(...*0px)——故不断言字号/scaleX，只断言与 rawDims 数学直连的 left/top 百分比。
 *
 * transform-origin 断言限制（门一 N1）：vitest 默认 css:false 桩化 CSS import
 *   （vitest.config.ts 无 css 字段）——text-layer.css 规则不进入测试 DOM，
 *   getComputedStyle 读不到样式表级 '0px 0px'；故该断言面=组件未内联覆盖
 *   transform-origin（内联一旦出现即以 CSS 级联压掉样式表值，旋转页
 *   rotate+translate 覆盖数学立即失效——变异红证已验），值本体锚=受锁
 *   text-layer.css:58（.textLayer{transform-origin:0 0}，grep 可核）。
 *
 * 自纠记录（门一 N3）：语义级测试 2 处期望值分母笔误（top% 分母应为 792 误写
 *   612）修正于实现轮，非事后放宽——笔误时断言更松，修正后更紧。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { duckViewport, rotatedContainerBox, TextLayer } from '../../../src/renderer/features/reader/view/TextLayer'
import type { PdfPageGeometry, PdfTextContent, PdfTextItem } from '../../../src/renderer/features/reader/view/PdfPageCanvas'

// ── 纯数学域：duckViewport 直测（票面指定断言值） ──────────────────────────

describe('duckViewport rotation/rawDims 真值化（F-A6-b1 T1/T9）', () => {
  it('rotate=90 → rotation 字段 90（T1：非零旋转不再被硬编码 0 抹掉）', () => {
    const vp = duckViewport(1.25, 90, [0, 0, 612, 792])
    expect(vp.rotation).toBe(90)
    expect(vp.scale).toBe(1.25)
  })

  it('view=[36,36,540,720] → rawDims={pageWidth:504,pageHeight:684,pageX:36,pageY:36}（T9：CropBox 原点真值化）', () => {
    const vp = duckViewport(1, 0, [36, 36, 540, 720])
    expect(vp.rawDims).toEqual({ pageWidth: 504, pageHeight: 684, pageX: 36, pageY: 36 })
  })

  it('view=[0,0,612,792] → rawDims={pageWidth:612,pageHeight:792,pageX:0,pageY:0}（原点零页零回归）', () => {
    const vp = duckViewport(1, 0, [0, 0, 612, 792])
    expect(vp.rawDims).toEqual({ pageWidth: 612, pageHeight: 792, pageX: 0, pageY: 0 })
  })
})

// ── 纯数学域：rotatedContainerBox（容器旋转语义=官方 data-main-rotation 内联等价） ──

describe('rotatedContainerBox 容器旋转（官方 pdf_viewer.css [data-main-rotation] 等价）', () => {
  it('rotate=0 → 宽高原样、无变换（46 页真实库形态零行为变）', () => {
    expect(rotatedContainerBox(0, 612, 792)).toEqual({ width: 612, height: 792 })
  })

  it('rotate=90 → 宽高交换+rotate(90deg) translateY(-100%)（未旋转盒旋转后恰覆盖横向 canvas 盒）', () => {
    expect(rotatedContainerBox(90, 792, 612)).toEqual({
      width: 612, height: 792, transform: 'rotate(90deg) translateY(-100%)'
    })
  })

  it('rotate=180 → 宽高不变+rotate(180deg) translate(-100%, -100%)', () => {
    expect(rotatedContainerBox(180, 612, 792)).toEqual({
      width: 612, height: 792, transform: 'rotate(180deg) translate(-100%, -100%)'
    })
  })

  it('rotate=270 → 宽高交换+rotate(270deg) translateX(-100%)', () => {
    expect(rotatedContainerBox(270, 792, 612)).toEqual({
      width: 612, height: 792, transform: 'rotate(270deg) translateX(-100%)'
    })
  })
})

// ── 语义级：jsdom 真 pdf.js TextLayer 消费 duckViewport（span 位置百分比直断言） ──

/** 单文本项载荷（transform=[字缩放10,0,0,10,x,y]——位置数学可控） */
function makeContent(str: string, x: number, y: number): PdfTextContent {
  const item: PdfTextItem = {
    str, dir: 'ltr', width: 20, height: 10, transform: [10, 0, 0, 10, x, y], fontName: 'g1', hasEOL: false
  }
  return { items: [item], styles: { g1: { fontFamily: 'serif', ascent: 0.8, descent: -0.2, vertical: false } }, lang: null }
}

/**
 * canvas 2d 桩：measureText width=10（#layout scaleX 分子）、fontBoundingBoxAscent=8/
 * Descent=-2 → #getAscent 比率 8/10=0.8（fontHeight=10 时 ascent=8px——top 百分比
 * 期望值的唯一量测依赖，可控）。getImageData/strokeText 兜底以防 ascent 旁路被触达。
 */
function stubCanvas2d(): void {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    canvas: {},
    font: '',
    measureText: () => ({ width: 10, fontBoundingBoxAscent: 8, fontBoundingBoxDescent: -2 }),
    clearRect: (): void => undefined,
    strokeText: (): void => undefined,
    getImageData: (): { data: Uint8ClampedArray } => ({ data: new Uint8ClampedArray(4) })
  } as unknown as CanvasRenderingContext2D)
}

let root: Root | null = null
let host: HTMLDivElement | null = null

/** 轮询至真 TextLayer 的 span 落 DOM（render() 为流泵微任务链） */
async function waitForSpans(timeoutMs = 2000): Promise<NodeListOf<HTMLSpanElement>> {
  const t0 = Date.now()
  for (;;) {
    const spans = document.querySelectorAll<HTMLSpanElement>('.textLayer span:not(.endOfContent)')
    if (spans.length > 0) return spans
    if (Date.now() - t0 > timeoutMs) throw new Error('TextLayer span 未在超时内渲染')
    await new Promise((resolve) => setTimeout(resolve, 20))
  }
}

function mountLayer(textContent: PdfTextContent, geometry: PdfPageGeometry, pageWidth: number, pageHeight: number): void {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root?.render(
      <TextLayer textContent={textContent} viewportScale={1} pageWidth={pageWidth} pageHeight={pageHeight} geometry={geometry} />
    )
  })
}

beforeEach(() => {
  ;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
  stubCanvas2d()
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('语义级：真 pdf.js TextLayer 消费 duckViewport（jsdom span 位置断言）', () => {
  it('T9 CropBox（view=[36,36,540,720]）：span left/top 按减 pageX/pageY 后的盒内百分比定位（S2 的 x+36.01px 平移消除）', async () => {
    // 项在用户空间 (136,680)：期望 left=100*(136-36)/504=19.84%；top=100*((36+684-680)-8)/684=4.68%
    // （ascent=字高10*0.8=8）——旧实现 pageX:0 时 left=26.98%（+36px 平移即取证实测形态）
    mountLayer(makeContent('裁盒文本', 136, 680), { rotate: 0, view: [36, 36, 540, 720] }, 504, 684)
    const spans = await waitForSpans()
    expect(spans.length).toBe(1)
    expect(spans[0]!.style.left).toBe('19.84%')
    expect(spans[0]!.style.top).toBe('4.68%')
  })

  it('T9 零原点对照（view=[0,0,612,792]）：span 百分比与旧口径逐位一致（健康页零回归锚）', async () => {
    // left=100*136/612=22.22%；top=100*((792-680)-8)/792=13.13%（top 分母=pageHeight）
    mountLayer(makeContent('零原点文本', 136, 680), { rotate: 0, view: [0, 0, 612, 792] }, 612, 792)
    const spans = await waitForSpans()
    expect(spans[0]!.style.left).toBe('22.22%')
    expect(spans[0]!.style.top).toBe('13.13%')
  })

  it('T1 /Rotate 90：容器 data-main-rotation=90（pdf.js 从 viewport.rotation 写出）+内联旋转变换+宽高交换；span 恒在未旋转空间百分比（S1 错位消除机制）', async () => {
    // canvas CSS 盒=旋转后横向 (792,612)；容器须为未旋转盒 612×792 + 官方 90° 变换
    mountLayer(makeContent('旋转文本', 136, 680), { rotate: 90, view: [0, 0, 612, 792] }, 792, 612)
    const spans = await waitForSpans()
    // span 百分比=未旋转用户空间（与零原点对照页逐位同值——旋转由容器承担，不进 span 数学）
    expect(spans[0]!.style.left).toBe('22.22%')
    expect(spans[0]!.style.top).toBe('13.13%')
    const container = document.querySelector<HTMLElement>('.textLayer')
    expect(container).not.toBeNull()
    expect(container!.getAttribute('data-main-rotation')).toBe('90')
    expect(container!.style.width).toBe('612px')
    expect(container!.style.height).toBe('792px')
    expect(container!.style.transform).toBe('rotate(90deg) translateY(-100%)')
  })

  it('[门一 N1] 容器 transform-origin 锚：0 0 由 text-layer.css:58 承载（旋转覆盖数学前提），组件不得内联覆盖——断言面限制（样式表级联 jsdom 不可读）见头注', async () => {
    mountLayer(makeContent('变换原点锚', 136, 680), { rotate: 90, view: [0, 0, 612, 792] }, 792, 612)
    await waitForSpans()
    const container = document.querySelector<HTMLElement>('.textLayer')
    expect(container).not.toBeNull()
    // 空串=组件未内联设置 transform-origin——内联一旦出现即覆盖样式表值
    // （CSS 级联），rotate(90deg) translateY(-100%) 以原点 0 0 推导的覆盖数学
    // 立即失效；值本体=受锁 text-layer.css:58 '0 0'（注释锚，非本断言面）
    expect(container!.style.transformOrigin).toBe('')
  })
})
