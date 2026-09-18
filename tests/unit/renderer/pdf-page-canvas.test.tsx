// @vitest-environment jsdom
/**
 * [F-A5 c 面] PdfPageCanvas+PageBox —— 透明底渲染+层序样式（受锁新增件，
 * [locked-change] 授权面——主控已 unlock）。
 *
 * 锁三断言（票面 §0c「canvas 透明底+色块垫底」的实现面）：
 * - pdf.js render 以 background 'transparent' 调用（透明底——墨带
 *   之外透出下层色块=背景板语义；pdfjs 默认白填充会把色块全遮死；
 *   [F-CSS-03] 原字面 rgba(255,255,255,0) 等价改写为 CSS 关键字）；
 * - canvas 内联 z=PAGE_LAYER_Z.canvas 且 pointer-events:none（墨在色块上，
 *   事件穿透明纸落在标注 rect/文本层——点击与划选手势零回归）；
 * - PageBox 页内容容器（h-fit）白纸承底层+isolation（层序比较域单页内封闭，
 *   跨页不互扰；暗色主题下页纸仍白——PDF 纸面语义）。
 * - [F-A6-b1] onPageRender 第三参下钻页几何 {rotate,view}（T1/T9 修复通道：
 *   TextLayer duckViewport 的 rotation/rawDims 真值来源；判别值 90/CropBox
 *   [36,36,540,720] 防硬编码回退假绿）。
 * always-active（ADR-0017 裁决 3——新测试不经 guardedDescribe）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PDFDocumentProxy } from '../../../src/renderer/features/reader/state/PdfDocProvider'
import { PdfPageCanvas } from '../../../src/renderer/features/reader/PdfPageCanvas'
import { PageBox } from '../../../src/renderer/features/reader/PageBox'
import { PAGE_LAYER_Z } from '../../../src/renderer/features/reader/state/page-layer-z'

/** render 调用参数探针（断言面） */
const renderCalls = vi.hoisted(() => [] as Array<Record<string, unknown>>)

/** onPageRender 载荷探针（F-A6-b1 几何通道断言面——含第三参 geometry） */
const renderReports = vi.hoisted(() => [] as Array<{ page: number; text: unknown; geo: unknown }>)

/** 假 pdf 页（PdfPageCanvas 渲染链最小桩）。rotate/view 取判别值（90/CropBox 原点≠0）
 * ——若实现硬编码 0/[0,0,0,0] 回退，几何断言立红（F-A6-b1 T1/T9 通道） */
function fakePage(): unknown {
  return {
    rotate: 90,
    view: [36, 36, 540, 720],
    getViewport: () => ({ width: 600, height: 800 }),
    render: (opts: Record<string, unknown>) => {
      renderCalls.push(opts)
      return { promise: Promise.resolve(), cancel: (): void => undefined }
    },
    getTextContent: async () => ({ items: [], styles: {}, lang: null })
  }
}

function fakeDoc(): PDFDocumentProxy {
  return { numPages: 1, getPage: async () => fakePage() } as unknown as PDFDocumentProxy
}

let root: Root | null = null
let host: HTMLDivElement | null = null

beforeEach(() => {
  ;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
  // jsdom 无 canvas 2d 实现——PdfPageCanvas 拿不到 ctx 会走 onError 短路
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as unknown as CanvasRenderingContext2D)
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  renderCalls.length = 0
  renderReports.length = 0
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

describe('F-A5 c 面 —— 透明底 canvas+层序样式', () => {
  it('render 以透明背景调用（background transparent——墨外透出下层色块）', async () => {
    await act(async () => {
      root!.render(
        <PdfPageCanvas doc={fakeDoc()} pageNo={1} zoom={1} onPageRender={() => undefined} onError={() => undefined} />
      )
    })
    expect(renderCalls.length).toBe(1)
    // [F-CSS-03] rgba(255,255,255,0) 等价改写 CSS 关键字（alpha 0 渲染零差）
    expect(renderCalls[0]!.background).toBe('transparent')
  })

  it('canvas 内联 z=层级常量+pointer-events none（事件穿透——标注 rect/文本层手势零回归）', async () => {
    await act(async () => {
      root!.render(
        <PdfPageCanvas doc={fakeDoc()} pageNo={1} zoom={1} onPageRender={() => undefined} onError={() => undefined} />
      )
    })
    const canvas = host!.querySelector<HTMLCanvasElement>('canvas[data-pdf-canvas]')
    expect(canvas).not.toBeNull()
    expect(canvas!.style.zIndex).toBe(String(PAGE_LAYER_Z.canvas))
    expect(canvas!.style.pointerEvents).toBe('none')
    expect(canvas!.style.position).toBe('relative')
  })

  it('[F-A6-b1] onPageRender 第三参下钻页几何 rotate/view 原值（T1/T9 通道——TextLayer duckViewport 的真值输入）', async () => {
    await act(async () => {
      root!.render(
        <PdfPageCanvas doc={fakeDoc()} pageNo={1} zoom={1}
          onPageRender={(page, text, geo) => { renderReports.push({ page, text, geo }) }} onError={() => undefined} />
      )
    })
    expect(renderReports.length).toBe(1)
    expect(renderReports[0]!.page).toBe(1)
    // 原值直传（判别值 90/[36,36,540,720]——非 0 原点非零旋转，防硬编码回退假绿）
    expect(renderReports[0]!.geo).toEqual({ rotate: 90, view: [36, 36, 540, 720] })
    // textContent 载荷不受几何通道影响（items/styles/lang 完整形态仍由第二参承载）
    expect(renderReports[0]!.text).toEqual({ items: [], styles: {}, lang: null })
  })

  it('PageBox 页内容容器：白纸承底层+isolation（层序比较域单页内封闭）', () => {
    act(() => {
      root!.render(
        <PageBox no={1} size={{ width: 600, height: 800 }} zoom={1} boxWidth={600} rendered={true}
          doc={fakeDoc()} renderPage={() => <i />} onPageRender={() => undefined} onError={() => undefined} />
      )
    })
    const pageRoot = host!.querySelector<HTMLElement>('[data-page-root="1"]')
    expect(pageRoot).not.toBeNull()
    const sheet = pageRoot!.firstElementChild as HTMLElement
    // [F-CSS-03] 断言载体随 token 化迁移：白纸承底层消费 --panel（值面由
    // theme.test.ts 既有 token 正锚锁定）；var() 载体 jsdom 原样保留无归一
    expect(sheet.style.background).toBe('var(--panel)')
    expect(sheet.style.isolation).toBe('isolate')
  })
})
