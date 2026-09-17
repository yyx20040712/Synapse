// @vitest-environment jsdom
/**
 * [F-A12] SelectionLayer 接线态测试（门一 R1 W4——新文件非受锁面诞生即入锁）。
 * 组件级锁 dragged 门两态+触发态：mouseup 事件链上「程序化零触/F-12 早退零触/
 * 真划选重定向」三态（jsdom 不自动解析拖选——选区程序化预置为 browser 已解析
 * 的下探态，事件经 document dispatch 驱动 SelectionLayer 处理器）。
 * 断言面=window.getSelection() 终态 focus（重定向在 evaluate.full 之前，
 * evaluate 的 jsdom 零盒守卫早退不影响 selection 终态）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub, stubUnwrap } from '../../utils/api-client-mock'
import { SelectionLayer } from '../../../src/renderer/features/reader/SelectionLayer'


const saveMock = vi.fn()
makeApiStub({ reader: { saveAnnotation: saveMock } })
// unwrap 透传 Result.data（成功路径——失败路径不经组件分支外的形态）
stubUnwrap(async (p: Promise<{ ok: boolean; data: unknown }>): Promise<unknown> => {
  const r = await p
  return r.data
})

interface Box { top: number; bottom: number; left: number; right: number }

/** 打量测桩（真浏览器 getBoundingClientRect 的 jsdom 替身——直挂元素自有属性） */
function rectOf(el: HTMLElement, b: Box): void {
  el.getBoundingClientRect = () =>
    ({ x: b.left, y: b.top, top: b.top, bottom: b.bottom, left: b.left, right: b.right, width: b.right - b.left, height: b.bottom - b.top, toJSON: () => ({}) }) as DOMRect
}

/** 单页夹具：r0「EF third」[80,90]x[10,70] / r1「AB first」[100,110]x[10,80]。
 *  释放点 (75,93)：y 在 r1 上方间隙偏近 r0、x=75 在 r0 行尾空白区（右缘 70 外） */
function mountFixture(): { page: HTMLElement; r0: HTMLSpanElement; r1: HTMLSpanElement } {
  const page = document.createElement('div')
  page.setAttribute('data-page-root', '1')
  const textLayer = document.createElement('div')
  textLayer.className = 'textLayer'
  rectOf(textLayer, { top: 60, bottom: 160, left: 0, right: 300 })
  const r0 = document.createElement('span')
  r0.textContent = 'EF third'
  rectOf(r0, { top: 80, bottom: 90, left: 10, right: 70 })
  const r1 = document.createElement('span')
  r1.textContent = 'AB first'
  rectOf(r1, { top: 100, bottom: 110, left: 10, right: 80 })
  textLayer.append(r0, r1)
  page.append(textLayer)
  document.body.append(page)
  return { page, r0, r1 }
}

/** 预置 browser 已解析的下探态选区（jsdom dispatch 不驱动原生拖选） */
function presetDescended(anchorNode: Node, focusNode: Node): void {
  const sel = window.getSelection()
  sel?.setBaseAndExtent(anchorNode, 0, focusNode, 3)
}

const fireMouseDownAt = (x: number, y: number): void => {
  document.dispatchEvent(new MouseEvent('mousedown', { clientX: x, clientY: y }))
}
const fireMouseUpAt = (x: number, y: number): void => {
  document.dispatchEvent(new MouseEvent('mouseup', { clientX: x, clientY: y }))
}

let root: Root | null = null
let host: HTMLDivElement | null = null
/** jsdom Range 无 getBoundingClientRect 原生实现（受锁 selection-layer.test
 *  同款桩因）：零盒桩→evaluateCore 零宽盒守卫早退（接线断言面=selection 终态，
 *  evaluate 深链不在本件断言面） */
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

describe('F-A12 SelectionLayer 接线态（dragged 门两态+触发态）', () => {
  it('①无 mousedown 记录（程序化 dispatch mouseup）→ 零重定向（focus 保持下探态）', async () => {
    const { page, r1 } = mountFixture()
    await mountLayer(page)
    presetDescended(r1.firstChild!, r1.firstChild!)
    fireMouseUpAt(75, 93)
    const sel = window.getSelection()
    expect(sel?.focusNode).toBe(r1.firstChild)
    expect(sel?.focusOffset).toBe(3)
  })

  it('②moved<3px（mousedown+近距离 mouseup）→ F-12 早退零重定向', async () => {
    const { page, r1 } = mountFixture()
    await mountLayer(page)
    presetDescended(r1.firstChild!, r1.firstChild!)
    fireMouseDownAt(15, 105)
    fireMouseUpAt(16, 105)
    const sel = window.getSelection()
    expect(sel?.focusNode).toBe(r1.firstChild)
    expect(sel?.focusOffset).toBe(3)
  })

  it('③真划选（mousedown 行内→mouseup 于上方间隙行尾空白区）→ focus 重定向上一行行尾、锚定侧原样', async () => {
    const { page, r0, r1 } = mountFixture()
    await mountLayer(page)
    presetDescended(r1.firstChild!, r1.firstChild!)
    fireMouseDownAt(15, 105)
    fireMouseUpAt(75, 93)
    const sel = window.getSelection()
    expect(sel?.focusNode).toBe(r0.firstChild)
    expect(sel?.focusOffset).toBe(8)
    expect(sel?.anchorNode).toBe(r1.firstChild)
    expect(sel?.anchorOffset).toBe(0)
  })
})
