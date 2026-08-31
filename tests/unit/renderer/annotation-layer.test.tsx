// @vitest-environment jsdom
/**
 * [F-A1] AnnotationLayer 挂 B/INV-E 组件测试（受锁，[locked-change] 授权面）。
 *
 * 锁渲染读时归并：pageRoot=null（跳过重锚 effect）+ 存量缺陷态 rects
 * （T2 交叠+T3 零宽+T4 负间隙手工夹具）→ 断言渲染 annotation-rect 计数=
 * 归并后期望（零宽 0+每行 1 块）+ 任两元素 top/height 计算值垂直分离。
 * annotationMenu/editor 交互面不测（本票只锁归并消费）。
 * React act 环境对齐 selection-layer.test.tsx 既有形态。
 * always-active（ADR-0017 裁决 3 新测试不经 guardedDescribe）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AnnotationLayer } from '../../../src/renderer/features/reader/AnnotationLayer'
import type { Annotation, AnnotationRect } from '@shared/models/annotation'
import { PAGE_LAYER_Z } from '../../../src/renderer/features/reader/page-layer-z'

vi.mock('../../../src/renderer/api/client', () => ({
  api: { reader: {} },
  unwrap: vi.fn(),
  ApiClientError: class extends Error {}
}))
vi.mock('../../../src/renderer/shared/ui/Toast', () => ({ showToast: vi.fn() }))

/** 归一化域矩形夹具 */
function rect(x: number, y: number, w: number, h: number): AnnotationRect {
  return { page: 0, x, y, w, h }
}

/** 存量缺陷态标注（渲染读时归并的输入——库里真实存在的脏形态） */
function defectAnnotation(): Annotation {
  return {
    id: 'a-defect',
    paperId: 'p-1',
    page: 0,
    kind: 'highlight',
    color: 'yellow',
    quoteText: '存量缺陷态矩形',
    prefixText: '',
    suffixText: '',
    startOffset: 0,
    endOffset: 8,
    rects: [
      rect(0, 0.2, 0, 0.021),
      rect(0.1, 0.3, 0.3, 0.02),
      rect(0.35, 0.3, 0.2, 0.02),
      rect(0.1, 0.318, 0.4, 0.02)
    ],
    comment: '',
    createdAt: '2026-08-30T00:00:00Z',
    updatedAt: '2026-08-30T00:00:00Z'
  }
}

/** rectStyle 生成的内联百分比数值（top/height/left/width） */
function inlinePct(el: Element, prop: 'top' | 'height' | 'left' | 'width'): number {
  const style = (el as HTMLElement).style
  return parseFloat(style[prop])
}

let root: Root | null = null
let host: HTMLDivElement | null = null

beforeEach(() => {
  ;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
  document.body.innerHTML = ''
})

describe('F-A1 AnnotationLayer 挂 B —— 渲染读时归并（INV-E）', () => {
  it('存量缺陷态 rects（交叠+零宽+负间隙）读时归并：零宽 0、每行 1 块、两行垂直分离', async () => {
    await act(async () => {
      root?.render(
        <AnnotationLayer
          annotations={[defectAnnotation()]}
          page={0}
          pageRoot={null}
          onChanged={vi.fn()}
        />
      )
    })
    const rects = Array.from(host!.querySelectorAll('[data-testid="annotation-rect"]'))
    // 归并后期望：幽灵滤除（0 块）+ 行1 交叠两块并 1 + 行2 钳制 1 = 2
    expect(rects.length).toBe(2)
    // 行1：x 并集 0.1..0.55（left 10% / width 45%）
    expect(inlinePct(rects[0]!, 'left')).toBeCloseTo(10, 6)
    expect(inlinePct(rects[0]!, 'width')).toBeCloseTo(45, 6)
    // 行2：负间隙钳制后 y=0.32 → top=(0.32+0.002)*100=32.2%
    expect(inlinePct(rects[1]!, 'top')).toBeCloseTo(32.2, 6)
    // INV-A 渲染面：相邻块 top+height ≤ 下一块 top（收边只缩高，更分离）
    const firstBottom = inlinePct(rects[0]!, 'top') + inlinePct(rects[0]!, 'height')
    expect(firstBottom).toBeLessThanOrEqual(inlinePct(rects[1]!, 'top'))
  })

  it('rects 全为零宽幽灵（存量极端态）→ 渲染 0 块不抛错', async () => {
    const ghostOnly: Annotation = { ...defectAnnotation(), rects: [rect(0, 0.2, 0, 0.021)] }
    await act(async () => {
      root?.render(
        <AnnotationLayer
          annotations={[ghostOnly]}
          page={0}
          pageRoot={null}
          onChanged={vi.fn()}
        />
      )
    })
    expect(host!.querySelectorAll('[data-testid="annotation-rect"]').length).toBe(0)
  })
})

describe('F-A5 —— 存量回退经 band（b 面）+色块垫底层序（c 面）', () => {
  /** 页根夹具：textLayer+单 span（gBCR 桩）+canvas 度量桩——bandsNearRects 量测面 */
  function makeBandPage(): { page: HTMLElement; textLayer: HTMLElement; span: HTMLElement } {
    const page = document.createElement('div')
    page.setAttribute('data-page-root', '1')
    const textLayer = document.createElement('div')
    textLayer.className = 'textLayer'
    const span = document.createElement('span')
    span.textContent = 'SMART WATER TEST DOC'
    textLayer.appendChild(span)
    page.appendChild(textLayer)
    const boxes = new Map<Element, { x: number; y: number; width: number; height: number }>()
    boxes.set(page, { x: 0, y: 0, width: 600, height: 800 })
    boxes.set(textLayer, { x: 0, y: 0, width: 600, height: 800 })
    boxes.set(span, { x: 30, y: 200, width: 300, height: 16 })
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
      const r = boxes.get(this)
      return { x: r?.x ?? 0, y: r?.y ?? 0, width: r?.width ?? 0, height: r?.height ?? 0 } as DOMRect
    })
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      font: '',
      measureText: () => ({
        actualBoundingBoxAscent: 10,
        actualBoundingBoxDescent: 3,
        fontBoundingBoxAscent: 14,
        fontBoundingBoxDescent: 4
      })
    } as unknown as CanvasRenderingContext2D)
    return { page, textLayer, span }
  }

  it('存量 rects（重锚失败回退）经行簇 band：块 top/height=band 值（非 F-11 分数）', async () => {
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback): number => {
      cb(0)
      return 0
    })
    const { page } = makeBandPage()
    document.body.appendChild(page)
    // quoteText 与页内全文不符→verifyQuote 失败→回退存量 rects（b 面回退路径核对）
    const ann: Annotation = {
      id: 'a-legacy', paperId: 'p-1', page: 0, kind: 'highlight', color: 'yellow',
      quoteText: '不存在的引文', prefixText: '', suffixText: '', startOffset: 0, endOffset: 6,
      rects: [{ page: 0, x: 0.05, y: 0.25, w: 0.5, h: 0.02 }], comment: '',
      createdAt: '2026-08-31T00:00:00Z', updatedAt: '2026-08-31T00:00:00Z'
    }
    await act(async () => {
      root!.render(<AnnotationLayer annotations={[ann]} page={0} pageRoot={page} onChanged={() => undefined} />)
    })
    const block = host!.querySelector<HTMLElement>('[data-testid="annotation-rect"]')
    expect(block).not.toBeNull()
    // span 盒 (30,200,300,16)+度量 asc10/desc3/fAsc14/fDesc4：半前导 −1 基线 213
    // →band=[203,216]/800：top=25.375%/height=13/800=1.625%（F-11 分数=25.2%/1.56%——可区分）
    expect(inlinePct(block!, 'top')).toBeCloseTo(25.375, 4)
    expect(inlinePct(block!, 'height')).toBeCloseTo(1.625, 4)
  })

  it('c 色块层=背景板序：z=层级常量 colorBlocks 且 multiply 摘除（normal）', async () => {
    await act(async () => {
      root!.render(
        <AnnotationLayer annotations={[defectAnnotation()]} page={0} pageRoot={null} onChanged={vi.fn()} />
      )
    })
    const layer = host!.querySelector<HTMLElement>('[data-testid="annotation-layer"]')
    expect(layer).not.toBeNull()
    expect(layer!.style.zIndex).toBe(String(PAGE_LAYER_Z.colorBlocks))
    expect(layer!.style.mixBlendMode).toBe('')
  })
})
