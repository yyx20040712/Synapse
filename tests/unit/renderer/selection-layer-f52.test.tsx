// @vitest-environment jsdom
/**
 * [F-VISFB-52] SelectionLayer 接线态测试（fa12 接线件同款手法）。
 *
 * 断言面=selection-drag-controller 在 SelectionLayer 事件链上的接线行为：
 *  ①中缝 mousedown → preventDefault（§0-4 跨双栏需指针明确入栏授权——不启动）；
 *  ②授权拖选：document 级 selectionchange 经门（echo 抑制/转发）驱动违例钳制
 *    （visual-full-mouseup 共用 effective selection 的会话内写路径）；
 *  ③mouseup 会话终局后外部选区不被拦截/清除（B4 加严 3——S5 窗内外部选区
 *    零吞：只抑制自写精确匹配事件）。
 * jsdom 不自动解析拖选——选区程序化预置为 browser 已解析态（fa12 同款）；
 * Range.gBCR 零盒桩 → evaluate 深链零宽盒守卫早退（断言面=selection 终态）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { stubRectOf } from '../../utils/geometry'
import { makeApiStub, stubUnwrap } from '../../utils/api-client-mock'
import { SelectionLayer } from '../../../src/renderer/features/reader/interact/SelectionLayer'

const saveMock = vi.fn()
makeApiStub({ reader: { saveAnnotation: saveMock } })
stubUnwrap(async (p: Promise<{ ok: boolean; data: unknown }>): Promise<unknown> => {
  const r = await p
  return r.data
})

/** 双栏夹具（控制器直测件同构：左 L1..L3/右 R1..R3/中缝 [90,210]） */
function mountFixture(): { page: HTMLElement; spanOf: (id: string) => HTMLSpanElement; textOf: (id: string) => Text } {
  const page = document.createElement('div')
  page.setAttribute('data-page-root', '1')
  const textLayer = document.createElement('div')
  textLayer.className = 'textLayer'
  stubRectOf(textLayer, { top: 0, bottom: 120, left: 0, right: 300 })
  const mk = (id: string, text: string, b: { top: number; bottom: number; left: number; right: number }): void => {
    const s = document.createElement('span')
    s.id = id
    s.textContent = text
    stubRectOf(s, b)
    textLayer.append(s)
  }
  mk('L1', 'LEFT ONE', { top: 10, bottom: 20, left: 10, right: 90 })
  mk('L2', 'LEFT TWO', { top: 34, bottom: 44, left: 10, right: 90 })
  mk('L3', 'LEFT THREE', { top: 58, bottom: 68, left: 10, right: 90 })
  mk('R1', 'RIGHT ONE', { top: 10, bottom: 20, left: 210, right: 290 })
  mk('R2', 'RIGHT TWO', { top: 34, bottom: 44, left: 210, right: 290 })
  mk('R3', 'RIGHT THREE', { top: 58, bottom: 68, left: 210, right: 290 })
  page.append(textLayer)
  document.body.append(page)
  return {
    page,
    spanOf: (id) => document.getElementById(id) as HTMLSpanElement,
    textOf: (id) => document.getElementById(id)!.firstChild as Text
  }
}

const fireDown = (target: Element, x: number, y: number): MouseEvent => {
  const ev = new MouseEvent('mousedown', { bubbles: true, cancelable: true, clientX: x, clientY: y })
  target.dispatchEvent(ev)
  return ev
}
const fireMove = (x: number, y: number): void => {
  document.dispatchEvent(new MouseEvent('mousemove', { clientX: x, clientY: y }))
}
const fireUp = (x: number, y: number): void => {
  document.dispatchEvent(new MouseEvent('mouseup', { clientX: x, clientY: y }))
}
const fireSelectionChange = (): void => {
  document.dispatchEvent(new Event('selectionchange'))
}

let root: Root | null = null
let host: HTMLDivElement | null = null
let origRangeGBCR: (() => DOMRect) | undefined

async function mountLayer(pageRoot: HTMLElement): Promise<void> {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => {
    root?.render(<SelectionLayer pageRoot={pageRoot} paperId="p-1" page={0} onSaved={vi.fn()} />)
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  ;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
  window.getSelection()?.removeAllRanges()
  origRangeGBCR = Range.prototype.getBoundingClientRect as (() => DOMRect) | undefined
  Range.prototype.getBoundingClientRect = () => ({ x: 0, y: 0, top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0, toJSON: () => ({}) }) as DOMRect
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
  window.getSelection()?.removeAllRanges()
})

describe('F-VISFB-52 SelectionLayer 接线态（指针授权手势）', () => {
  it('①中缝 mousedown → preventDefault（不启动拖选）', async () => {
    const f = mountFixture()
    await mountLayer(f.page)
    const ev = fireDown(f.spanOf('L2').parentElement as Element, 150, 39)
    expect(ev.defaultPrevented).toBe(true)
  })

  it('②授权拖选：selectionchange 经门驱动违例钳制（focus 投影回锚栏行尾）', async () => {
    const f = mountFixture()
    await mountLayer(f.page)
    const ev = fireDown(f.spanOf('L1'), 20, 15)
    expect(ev.defaultPrevented).toBe(false)
    fireMove(250, 39)
    window.getSelection()!.setBaseAndExtent(f.textOf('L1'), 0, f.textOf('R2'), 4)
    await act(async () => {
      fireSelectionChange()
    })
    const sel = window.getSelection()
    expect(sel?.anchorNode).toBe(f.textOf('L1'))
    expect(sel?.anchorOffset).toBe(0)
    expect(sel?.focusNode).toBe(f.textOf('L2'))
    expect(sel?.focusOffset).toBe(8)
  })

  it('③mouseup 会话终局后外部选区不被拦截/清除（B4-3：只抑制自写精确匹配）', async () => {
    const f = mountFixture()
    await mountLayer(f.page)
    fireDown(f.spanOf('L1'), 20, 15)
    fireMove(250, 39)
    window.getSelection()!.setBaseAndExtent(f.textOf('L1'), 0, f.textOf('R2'), 4)
    await act(async () => {
      fireSelectionChange()
    })
    await act(async () => {
      fireUp(250, 39)
    })
    // 会话终局（mouseup 链走完）后外部（非本控制器发起）选区：原样保留
    window.getSelection()!.setBaseAndExtent(f.textOf('L1'), 0, f.textOf('R2'), 6)
    await act(async () => {
      fireSelectionChange()
    })
    const sel = window.getSelection()
    expect(sel?.focusNode).toBe(f.textOf('R2'))
    expect(sel?.focusOffset).toBe(6)
  })
})
