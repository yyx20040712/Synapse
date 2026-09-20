// @vitest-environment jsdom
/**
 * [F-RDR-01] 选区闪烁修复单测（visual 末行吸附+S5 短路——always-active，
 * ADR-0017 裁决 3 同款不经 guardedDescribe，诞生即锁）。
 *
 * A 路径（anchor-blank-snap.snapVisualBoundary——拖选期视觉边界末行下方
 * 吸附，行尾语义唯一源=rowEndOf）：
 * - 三态：非 textLayer→null / 探测空→null（调用方 fallback 原始边界）/
 *   末行命中对拍 rowEndOf 一致（设计定稿 §终裁修正 1/任务书 TDD 面）；
 * - 主路径（修正 11——守卫假路径回归锁）：textLayer 内+未越末行+探测非空
 *   →不吸附走原边界（页中标记归 mouseup 全量 snapBlankBoundary 语义面）。
 *
 * B 路径（selection-evaluate module-level S5 短路——mouseup 的 full(true)
 * 已同帧渲染正确帧后，TTL 窗内异步 selectionchange→visual 直接丢弃）：
 * - TTL 三点 99/100/101（performance.now stub——含 <=100 边界）；
 * - mousedown 清（SelectionLayer 接线态——新拖选会话硬释放）。
 *
 * 夹具口径 crib anchor-blank-snap.test.ts（jsdom 量测桩=getBoundingClientRect
 * 逐元素打桩 stubRectOf；br 形态按真机 diag3 实测盒形状建模——零宽×2 行高
 * ×栏左缘）/selection-layer-fa12.test.tsx（组件接线态最小夹具）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { stubElementRects, stubRangeGBCR, stubRectOf, type StubBox } from '../../utils/geometry'
import { makeApiStub, stubUnwrap } from '../../utils/api-client-mock'
import { mkItem, mkText, seedRegistry } from '../../utils/factories'
import {
  boxOf,
  rowEndOf,
  snapVisualBoundary,
  visualRows,
  type Box
} from '../../../src/renderer/features/reader/anchors/anchor-blank-snap'
import type { NodeSpan } from '../../../src/renderer/features/reader/anchors/annotation-anchor'
import { usePageItemsStore } from '../../../src/renderer/features/reader/anchors/page-items.store'
import {
  clearAffinityShortcut,
  docOrderPair,
  markAffinityShortcutFlushed,
  shouldSkipVisual
} from '../../../src/renderer/features/reader/interact/selection-evaluate'
import { SelectionLayer } from '../../../src/renderer/features/reader/interact/SelectionLayer'
import { createReaderStoreInitialState, useReaderStore } from '../../../src/renderer/features/reader/state/reader.store'

const saveMock = vi.fn()
makeApiStub({ reader: { saveAnnotation: saveMock } })
stubUnwrap(async (p: Promise<{ ok: boolean; data: unknown }>): Promise<unknown> => {
  const r = await p
  return r.data
})

/** 造一个 pdf.js 文本层形态的 span（文本+量测盒——anchor-blank-snap.test 同款） */
function mkSpan(text: string, b: Box): HTMLSpanElement {
  const s = document.createElement('span')
  s.textContent = text
  stubRectOf(s, b)
  return s
}

/** 造一个 pdf.js 行 break 标记（零宽×2 行高×栏左缘——真机 diag3 实测形态） */
function mkBr(b: Box): HTMLBRElement {
  const br = document.createElement('br')
  br.setAttribute('role', 'presentation')
  stubRectOf(br, b)
  return br
}

/** 真实文本 span 的行构造项（对拍 rowEndOf 的输入面——NodeSpan 补全 start/end） */
function rowItemOf(s: HTMLSpanElement): { span: NodeSpan; box: Box } {
  const t = s.firstChild as Text
  return { span: { node: t, start: 0, end: t.data.length }, box: boxOf(s)! }
}

/** 两行真实文本+末行下 br 的 textLayer（末行=row2 双栏「CD second」+「R2 tail」） */
function mkLastRowFixture(): {
  textLayer: HTMLElement
  s1: HTMLSpanElement
  s2: HTMLSpanElement
  c2: HTMLSpanElement
  br3: HTMLBRElement
} {
  const textLayer = document.createElement('div')
  textLayer.className = 'textLayer'
  const s1 = mkSpan('AB first', { top: 100, bottom: 110, left: 10, right: 80 })
  const s2 = mkSpan('CD second', { top: 120, bottom: 130, left: 10, right: 70 })
  const c2 = mkSpan('R2 tail', { top: 120, bottom: 130, left: 150, right: 240 })
  // 末行下方 br（真机形态：零宽×2 行高×栏左缘；中心 y=152 越过末行盒底 130）
  const br3 = mkBr({ top: 142, bottom: 162, left: 5, right: 5 })
  textLayer.append(s1, s2, c2, br3)
  document.body.append(textLayer)
  return { textLayer, s1, s2, c2, br3 }
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

beforeEach(() => {
  vi.clearAllMocks()
  ;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
  window.getSelection()?.removeAllRanges()
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
  // B 短路 module-level 状态跨用例清零（文件内卫生——防污染后续用例）
  clearAffinityShortcut()
  document.body.replaceChildren()
  window.getSelection()?.removeAllRanges()
  vi.restoreAllMocks()
})

describe('F-RDR-01 A 路径：snapVisualBoundary（末行下方视觉吸附）', () => {
  it('非 textLayer 边界→null（closest 上溯守卫——无深度常量）', () => {
    // 无 .textLayer 祖先的容器（末行下 br 命中形态同款——仅缺 textLayer 类名）
    const rootEl = document.createElement('div')
    const s1 = mkSpan('AB first', { top: 100, bottom: 110, left: 10, right: 80 })
    const br3 = mkBr({ top: 142, bottom: 162, left: 5, right: 5 })
    rootEl.append(s1, br3)
    document.body.append(rootEl)
    // 元素槽位（br3 前）与文本位双形态均守卫零吸附
    expect(snapVisualBoundary(rootEl, 1, 'focus')).toBeNull()
    expect(snapVisualBoundary(s1.firstChild!, 2, 'focus')).toBeNull()
  })

  it('探测空（文本位在非空白 span 内）→null+调用方 fallback 原始边界（空守卫——禁非空断言）', () => {
    const { textLayer, s1 } = mkLastRowFixture()
    void textLayer
    const snap = snapVisualBoundary(s1.firstChild!, 2, 'focus')
    expect(snap).toBeNull()
    // 调用方 fallback 契约（selection-evaluate ?? 合并）：null 时 eff 边界=原始边界
    expect(snap ?? { node: s1.firstChild!, offset: 2 }).toEqual({ node: s1.firstChild!, offset: 2 })
  })

  it('末行下方命中→吸附末行行尾，对拍 rowEndOf 一致（行尾语义唯一源；br 槽位+纯空白 span 文本位双形态）', () => {
    const { textLayer, s1, s2, c2, br3 } = mkLastRowFixture()
    // 形态①元素槽位（br3 前=textLayer.childNodes[3]）——浏览器把末行下方命中
    // 解析为该槽；吸附目标=末行（br x=5 最近左栏组）行尾
    const got = snapVisualBoundary(textLayer, 3, 'focus')
    expect(got).not.toBeNull()
    expect(got!.node).toBe(s2.firstChild)
    expect(got!.offset).toBe('CD second'.length)
    // 对拍：真实文本行构造（空白标记不入行构造）+rowEndOf 直接调用逐位一致
    const rows = visualRows([rowItemOf(s1), rowItemOf(s2), rowItemOf(c2)])
    const lastRow = rows[rows.length - 1]!
    expect(got).toEqual(rowEndOf(lastRow, boxOf(br3)!))
    // 形态②纯空白 span 文本位（末行下方 E3=纯空白项 span——中心 y=157 越末行
    // 盒底）：吸附同一末行行尾（空白标记不得自成「末行」吞掉判据）
    const e4 = mkSpan('   ', { top: 152, bottom: 162, left: 10, right: 22 })
    textLayer.append(e4)
    const got2 = snapVisualBoundary(e4.firstChild!, 1, 'focus')
    expect(got2).toEqual(rowEndOf(lastRow, boxOf(e4)!))
  })

  it('主路径（修正 11 守卫假路径回归锁）：textLayer 内+未越末行+探测非空→不吸附走原边界（页中标记归 mouseup 全量 snapBlankBoundary 语义面）', () => {
    // 页中 br（盒带覆盖 row1/row2 之间——中心 y=122 未越过末行盒底 130）
    const textLayer = document.createElement('div')
    textLayer.className = 'textLayer'
    const s1 = mkSpan('AB first', { top: 100, bottom: 110, left: 10, right: 80 })
    const br1 = mkBr({ top: 112, bottom: 132, left: 5, right: 5 })
    const s2 = mkSpan('CD second', { top: 120, bottom: 130, left: 10, right: 70 })
    textLayer.append(s1, br1, s2)
    document.body.append(textLayer)
    // 探测非空（元素槽位 br1 前命中空白标记）+未越末行→不吸附走原边界
    const snap = snapVisualBoundary(textLayer, 1, 'focus')
    expect(snap).toBeNull()
    expect(snap ?? { node: textLayer, offset: 1 }).toEqual({ node: textLayer, offset: 1 })
  })
})

describe('F-RDR-01 B 路径：S5 短路（module-level TTL 窗）', () => {
  it('TTL 窗内（99ms/100ms 两点——<=100 边界含）→shouldSkipVisual 恒 true（S5 冗余重绘丢弃）', () => {
    const nowSpy = vi.spyOn(performance, 'now')
    nowSpy.mockReturnValue(1000)
    markAffinityShortcutFlushed()
    nowSpy.mockReturnValue(1099)
    expect(shouldSkipVisual()).toBe(true)
    nowSpy.mockReturnValue(1100)
    expect(shouldSkipVisual()).toBe(true)
  })

  it('TTL 过期（101ms）→shouldSkipVisual false（窗口兜底释放）', () => {
    const nowSpy = vi.spyOn(performance, 'now')
    nowSpy.mockReturnValue(1000)
    markAffinityShortcutFlushed()
    nowSpy.mockReturnValue(1101)
    expect(shouldSkipVisual()).toBe(false)
  })

  it('mousedown 清（SelectionLayer 接线态）：mark 后窗口内→真 mousedown→硬释放（新拖选会话）', async () => {
    const page = document.createElement('div')
    page.setAttribute('data-page-root', '1')
    const textLayer = document.createElement('div')
    textLayer.className = 'textLayer'
    page.appendChild(textLayer)
    document.body.appendChild(page)
    await mountLayer(page)
    const nowSpy = vi.spyOn(performance, 'now')
    nowSpy.mockReturnValue(2000)
    markAffinityShortcutFlushed()
    nowSpy.mockReturnValue(2050)
    expect(shouldSkipVisual()).toBe(true)
    // 真实 mousedown（document 面派发——接线在 SelectionLayer onMouseDown）
    act(() => {
      document.dispatchEvent(new MouseEvent('mousedown', { clientX: 10, clientY: 10 }))
    })
    nowSpy.mockReturnValue(2051)
    expect(shouldSkipVisual()).toBe(false)
  })
})

describe('F-RDR-01 W-4 回炉：反向选区端点序（docOrderPair[门一回炉轮 1]）', () => {
  /** 组件级快路径夹具（crib selection-evaluate.test.tsx：A 族查表桩供项几何
   *  pixelBoxOf（x/y/w/h），span/标记用 B 族直挂桩供 boxOf（top/bottom）——两族
   *  共存，B 族自有属性优先于原型 spy） */
  const rects = new Map<Element, StubBox>()
  let rangeStub: { restore(): void } | null = null

  beforeEach(() => {
    vi.useFakeTimers()
    rects.clear()
    usePageItemsStore.getState().clear()
    useReaderStore.setState(createReaderStoreInitialState())
    stubElementRects(rects)
    rangeStub = stubRangeGBCR(() => ({ x: 10, y: 900, width: 200, height: 20 }))
  })

  afterEach(() => {
    rangeStub?.restore()
    vi.useRealTimers()
  })

  it('纯反向（异节点：anchor 晚于 focus）→ docOrderPair 映回文档序 [早,晚]', () => {
    const rootEl = document.createElement('div')
    const s1 = mkSpan('AB', { top: 100, bottom: 110, left: 10, right: 30 })
    const s2 = mkSpan('CD', { top: 120, bottom: 130, left: 10, right: 30 })
    rootEl.append(s1, s2)
    document.body.append(rootEl)
    // a=anchor（span2 文本末=文档序晚）、b=focus（span1 文本首=早）
    const [st, en] = docOrderPair({ node: s2.firstChild!, offset: 2 }, { node: s1.firstChild!, offset: 0 })
    expect(st.node).toBe(s1.firstChild)
    expect(st.offset).toBe(0)
    expect(en.node).toBe(s2.firstChild)
    expect(en.offset).toBe(2)
  })

  it('包含形态（元素槽位边界 vs 其后代文本）→ 槽位语义精确比较非节点树序（W-4③修复判别锚）', () => {
    const rootEl = document.createElement('div')
    const s1 = mkSpan('AB', { top: 100, bottom: 110, left: 10, right: 30 })
    const s2 = mkSpan('CD', { top: 120, bottom: 130, left: 10, right: 30 })
    rootEl.append(s1, s2)
    document.body.append(rootEl)
    // a=槽位 (root,1)（AB 后——节点树序 root 先于后代，但槽位实际在 (s1,0) 之后）
    const [st, en] = docOrderPair({ node: rootEl, offset: 1 }, { node: s1.firstChild!, offset: 0 })
    expect(st.node).toBe(s1.firstChild)
    expect(st.offset).toBe(0)
    expect(en.node).toBe(rootEl)
    expect(en.offset).toBe(1)
    // 反包含：a=后代晚位（s2 文本 1）、b=槽位 (root,1)（在 s2 文本之前）
    const [st2, en2] = docOrderPair({ node: s2.firstChild!, offset: 1 }, { node: rootEl, offset: 1 })
    expect(st2.node).toBe(rootEl)
    expect(st2.offset).toBe(1)
    expect(en2.node).toBe(s2.firstChild)
    expect(en2.offset).toBe(1)
  })

  it('visual 吸附路径反向选区（anchor=末行标记槽[晚]、focus=首行文本[早]）→ 快路径 probe 端点序正确+项几何产物', async () => {
    // DOM：span1 'AB'（视觉上行）/span2 'CD'（末行）/M 空标记（末行下方）
    const page = document.createElement('div')
    page.setAttribute('data-page-root', '1')
    const textLayer = document.createElement('div')
    textLayer.className = 'textLayer'
    const s1 = mkSpan('AB', { top: 100, bottom: 110, left: 72, right: 172 })
    const s2 = mkSpan('CD', { top: 120, bottom: 130, left: 72, right: 172 })
    const m = document.createElement('span')
    m.setAttribute('role', 'presentation')
    stubRectOf(m, { top: 140, bottom: 150, left: 72, right: 192 })
    textLayer.append(s1, s2, m)
    page.appendChild(textLayer)
    document.body.appendChild(page)
    rects.set(page, { x: 500, y: 300, width: 612, height: 792 })
    rects.set(textLayer, { x: 500, y: 300, width: 612, height: 792 })
    // 项链（items='ABCD' 对账通过；首项 transform y=700→top=84/792≈10.61%）
    seedRegistry(1, mkText([mkItem('AB', 72, 700), mkItem('CD', 72, 690)]))
    await mountLayer(page)
    // 反向选区：anchor=槽 2（s2 后、M 前——晚位）、focus=(s1 文本,0)（早位）
    const sel = window.getSelection()
    sel?.setBaseAndExtent(textLayer, 2, s1.firstChild!, 0)
    act(() => {
      document.dispatchEvent(new Event('selectionchange'))
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(16)
    })
    // A 吸附（anchor 槽→末行行尾 s2:2）+docOrderPair（start=(s1,0)/end=(s2,2)）
    // → 快路径 probe 覆盖 'ABCD' → 项链产物（top≈10.6061%——DOM 回退链为
    // 25.25% 判别性区分；不吸附/错序时快路径丢失败回退在此可观测）
    const rect = document.querySelector<HTMLElement>('[data-testid="selection-rect"]')
    expect(rect).not.toBeNull()
    expect(parseFloat(rect!.style.top)).toBeCloseTo((84 / 792) * 100, 2)
  })
})
