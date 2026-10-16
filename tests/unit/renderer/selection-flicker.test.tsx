// @vitest-environment jsdom
/**
 * [F-VISFB-53] 闪烁收口（视检反馈战役 B3·选区泳道——统一快慢 effective
 * boundary+同签名禁重复 paint+W-4 幂等/竞态面；§7 断言面：canonical
 * signature 写 ≤1、慢拖逐 rAF 无空帧、未授权 quote/paint/anchor 无他栏文本）。
 *
 * 判别形态（手算基线——DoD 预期数字条款）：
 * - 标记夹具（乱序 DOM 形——pdf.js transform 乱序真实形态）：textLayer 盒
 *   (0,0,612,120)；DOM 序=行1 'AB' 盒 (10,20)-(110,30)、空文本标记（零长
 *   文本节点）盒 (10,80)-(10,100)、行2 'CD' 盒 (10,60)-(110,70)；标记中心
 *   90>真实末行（行2）底 70=越末行。items ['AB','CD']（零长标记不入拼接）
 *   transform y=120-domTop-8（AB 92/CD 52）→rects 归一 top≈20/120≈16.67%
 *   与 60/120=50%（zoom2 盒×2→16.67→33.33——B 组幂等判别轴）。
 *   闪烁机理（d1 归因实证）：focus=(标记零长文本,0) 时 visual 吸附末行行尾
 *   =(CD 尾)→两行块；改动前 settle full 的 raw 边界经 snapBlankBoundary('end')
 *   栏分流把边界解到行2 行首 (CD,0)→tail=2→end=2→quote='AB' 单行块——
 *   双几何交替（探针 53-impl 实证 1 块≠2 块）。
 * - 双栏夹具：textLayer 盒 (0,0,300,120)；title/L1-L3/R1-R3 行盒
 *   (10,0..290,12)/(10,20..90,30)/(10,60..90,70)/(210,20..290,30)...；items
 *   偏移手算 title 0-12、L1 12-21、L2 21-30、L3 30-39、R1 39-48（各 9 字符）
 *   ——L1..L3 全选 quote=slice(12,39) 长 27；左栏块归一域 left+width≤30%
 *   （x10+w80 / 300），右栏块 left≥70%——45% 为判别界。
 * 幂等判据=52 号 canonical signature 四元组（selection-drag-controller 域
 * 导出面——禁第二套签名）；失效点=save 清选区+mousedown 新会话。
 * 桩形状=全字段 domRect（控制器 boxOf 读四边——stubElementRects 四字段桩
 * 量测 NaN 会静默杀钳制，探针实证）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub, stubUnwrap } from '../../utils/api-client-mock'
import { domRect, stubRangeGBCR, type StubBox } from '../../utils/geometry'
import { mkText, seedRegistry } from '../../utils/factories'
import type { PdfTextItem } from '../../../src/renderer/features/reader/anchors/geometry-types'
import { SelectionLayer } from '../../../src/renderer/features/reader/interact/SelectionLayer'
import { clearAffinityShortcut } from '../../../src/renderer/features/reader/interact/selection-evaluate'
import { usePageItemsStore } from '../../../src/renderer/features/reader/anchors/page-items.store'
import { createReaderStoreInitialState, useReaderStore } from '../../../src/renderer/features/reader/state/reader.store'

const saveMock = vi.fn()
makeApiStub({ reader: { saveAnnotation: saveMock } })
stubUnwrap(async (p: Promise<{ ok: boolean; data: unknown }>): Promise<unknown> => {
  const r = await p
  return r.data
})

/** jsdom 无布局：元素 rect 按预设表返回（全字段 domRect——控制器 boxOf 读
 *  四边、evaluate 链读 x/y/width/height，两链同桩通吃） */
const rects = new Map<Element, StubBox>()
let rangeStub: { restore(): void } | null = null
const rangeRect = { x: 10, y: 900, width: 200, height: 20 }

/** 标记夹具（A1/B/C 组判别轴）：乱序 DOM 形（mk 夹在 DOM 中段、视觉序在
 *  末行下方——pdf.js transform 乱序真实形态）。行1 'AB' (10,20)-(110,30)、
 *  行2 'CD' (10,60)-(110,70)、末行下方空文本标记 (10,80)-(10,100)。 */
function mountMarkerFixture(): { page: HTMLElement; span1: HTMLElement; span2: HTMLElement; marker: HTMLElement } {
  const page = document.createElement('div')
  page.setAttribute('data-page-root', '1')
  const textLayer = document.createElement('div')
  textLayer.className = 'textLayer'
  const span1 = document.createElement('span')
  span1.textContent = 'AB'
  const marker = document.createElement('span')
  marker.appendChild(document.createTextNode(''))
  const span2 = document.createElement('span')
  span2.textContent = 'CD'
  textLayer.append(span1, marker, span2)
  page.appendChild(textLayer)
  document.body.appendChild(page)
  rects.set(textLayer, { x: 0, y: 0, width: 612, height: 120 })
  rects.set(page, { x: 0, y: 0, width: 612, height: 120 })
  rects.set(span1, { x: 10, y: 20, width: 100, height: 10 })
  rects.set(marker, { x: 10, y: 80, width: 0, height: 20 })
  rects.set(span2, { x: 10, y: 60, width: 100, height: 10 })
  return { page, span1, span2, marker }
}

/** 标记夹具页项（view=[0,0,612,120]；DOM 全文='AB'+'CD'——零长标记不入；
 *  y=120-domTop-8 手算：AB 行 top20→92、CD 行 top60→52） */
function seedMarkerPage(): void {
  const items: PdfTextItem[] = [
    { str: 'AB', dir: 'ltr', width: 100, height: 10, transform: [10, 0, 0, 10, 10, 92], fontName: 'g1', hasEOL: false },
    { str: 'CD', dir: 'ltr', width: 100, height: 10, transform: [10, 0, 0, 10, 10, 52], fontName: 'g1', hasEOL: false }
  ]
  seedRegistry(1, mkText(items), 0, [0, 0, 612, 120])
}

/** 双栏夹具（A2/D1 组）：title+左 L1-L3+右 R1-R3（中缝 90-210 宽 120>阈值） */
function mountTwocolFixture(): { page: HTMLElement; spanOf: (id: string) => HTMLSpanElement; textOf: (id: string) => Text } {
  const page = document.createElement('div')
  page.setAttribute('data-page-root', '1')
  const textLayer = document.createElement('div')
  textLayer.className = 'textLayer'
  rects.set(textLayer, { x: 0, y: 0, width: 300, height: 120 })
  rects.set(page, { x: 0, y: 0, width: 300, height: 120 })
  const mk = (id: string, text: string, x: number, y: number, w: number): void => {
    const s = document.createElement('span')
    s.id = id
    s.textContent = text
    rects.set(s, { x, y, width: w, height: y === 0 ? 12 : 10 })
    textLayer.append(s)
  }
  mk('T', 'TWOCOL TITLE', 10, 0, 280)
  mk('L1', 'LCOLSENT1', 10, 20, 80)
  mk('L2', 'LCOLSENT2', 10, 40, 80)
  mk('L3', 'LCOLSENT3', 10, 60, 80)
  mk('R1', 'RCOLSENT1', 210, 20, 80)
  mk('R2', 'RCOLSENT2', 210, 40, 80)
  mk('R3', 'RCOLSENT3', 210, 60, 80)
  page.appendChild(textLayer)
  document.body.appendChild(page)
  return {
    page,
    spanOf: (id) => document.getElementById(id) as HTMLSpanElement,
    textOf: (id) => document.getElementById(id)!.firstChild as Text
  }
}

/** 双栏页项（items 序=DOM 序对账；y=120-domTop-8 手算；title 12 字/行 9 字） */
function seedTwocolPage(): void {
  const row = (str: string, x: number, domTop: number): PdfTextItem => ({
    str, dir: 'ltr', width: x === 10 && domTop === 0 ? 280 : 80, height: 10,
    transform: [10, 0, 0, 10, x, 120 - domTop - 8], fontName: 'g1', hasEOL: false
  })
  seedRegistry(1, mkText([
    row('TWOCOL TITLE', 10, 0),
    row('LCOLSENT1', 10, 20), row('LCOLSENT2', 10, 40), row('LCOLSENT3', 10, 60),
    row('RCOLSENT1', 210, 20), row('RCOLSENT2', 210, 40), row('RCOLSENT3', 210, 60)
  ]), 0, [0, 0, 300, 120])
}

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

function selectRange(startNode: Node, startOff: number, endNode: Node, endOff: number): void {
  window.getSelection()!.setBaseAndExtent(startNode, startOff, endNode, endOff)
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
const advance = async (ms: number): Promise<void> => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

let root: Root | null = null
let host: HTMLDivElement | null = null

async function mountLayer(pageRoot: HTMLElement): Promise<void> {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => {
    root?.render(<SelectionLayer pageRoot={pageRoot} paperId="p-1" page={0} onSaved={vi.fn()} />)
  })
}

const toolbar = (): HTMLElement | null => host?.querySelector<HTMLElement>('[data-testid="selection-toolbar"]') ?? null
const paintBlocks = (): HTMLElement[] => Array.from(document.querySelectorAll<HTMLElement>('[data-testid="selection-rect"]'))
const firstRect = (): HTMLElement | null => document.querySelector<HTMLElement>('[data-testid="selection-rect"]') ?? null
/** 块几何快照（left/top/width/height——停顿帧判别面） */
const blockStyles = (): Array<Record<string, string>> =>
  paintBlocks().map((b) => ({ left: b.style.left, top: b.style.top, width: b.style.width, height: b.style.height }))
/** 双栏左域判定：每块 left+width（%）≤45（左栏域 30%+余量；右栏块 left≥70% 在此红） */
const allBlocksInLeftColumn = (): boolean =>
  paintBlocks().every((b) => parseFloat(b.style.left) + parseFloat(b.style.width) <= 45)

/** 点击工具条「高亮」并走完保存（quote/anchor 通道经 saveMock 入参锚） */
async function clickHighlightSave(): Promise<void> {
  const saved = {
    id: 'a-53', paperId: 'p-1', page: 0, kind: 'highlight', color: 'yellow',
    quoteText: '', prefixText: '', suffixText: '', startOffset: 0, endOffset: 0,
    rects: [], comment: '', createdAt: '2026-10-17T00:00:00Z', updatedAt: '2026-10-17T00:00:00Z'
  }
  saveMock.mockResolvedValue({ ok: true, data: saved })
  await act(async () => {
    const highlight = Array.from(toolbar()!.querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent === '高亮')!
    highlight.click()
    await vi.advanceTimersByTimeAsync(0)
  })
}

beforeEach(() => {
  // [回炉轮1 W1] performance 纳入 fake 集：S5 短路窗（AFFINITY_SHORTCUT_TTL_MS
  // 用 performance.now）须随 advance 推进——默认集不含 performance 时窗外判
  // 定恒假（真实时钟毫秒级），「窗外 echo」锚永不真出窗（门一 W1 实证）
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'setImmediate', 'clearImmediate', 'requestAnimationFrame', 'cancelAnimationFrame', 'Date', 'performance'] })
  vi.clearAllMocks()
  rects.clear()
  usePageItemsStore.getState().clear()
  useReaderStore.setState(createReaderStoreInitialState())
  clearAffinityShortcut()
  ;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    const r = rects.get(this)
    return domRect(r?.x ?? 0, r?.y ?? 0, r?.width ?? 0, r?.height ?? 0)
  })
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

describe('F-VISFB-53 闪烁收口（统一快慢 effective boundary+同签名禁重复 paint）', () => {
  it('A1 快慢统一（标记形态）：末行下方标记 focus 的 visual 帧经 settle 全量后不清帧不跳变（现状 full 把 end 解到行2 行首→丢行2=双几何交替在此红）', async () => {
    const f = mountMarkerFixture()
    seedMarkerPage()
    await mountLayer(f.page)
    selectRange((f.span1.firstChild as Text), 0, (f.marker.firstChild as Text), 0)
    fireSelectionChange()
    await advance(16)
    const visualFrame = blockStyles()
    expect(visualFrame.length).toBe(2)
    expect(parseFloat(firstRect()!.style.top)).toBeCloseTo((20 / 120) * 100, 2)
    expect(parseFloat(paintBlocks()[1]!.style.top)).toBeCloseTo((60 / 120) * 100, 2)
    await advance(200)
    expect(firstRect(), 'settle 全量不清 visual 帧（无空帧）').not.toBeNull()
    expect(blockStyles(), 'settle 全量产物=visual 帧同几何（双行块保持——无双几何交替）').toEqual(visualFrame)
    expect(toolbar(), 'settle 后工具条在场（quote=ABCD 未退化）').not.toBeNull()
  })

  it('A2 双栏哨兵同源（0C 同构）：授权拖选左栏——quote/paint/anchor 三通道无右栏文本（quote=slice(12,39) 长 27+块域左栏+偏移锚）', async () => {
    const f = mountTwocolFixture()
    seedTwocolPage()
    await mountLayer(f.page)
    const ev = fireDown(f.spanOf('L1'), 20, 25)
    expect(ev.defaultPrevented).toBe(false)
    selectRange(f.textOf('L1'), 0, f.textOf('L3'), 9)
    fireSelectionChange()
    await advance(16)
    await advance(200)
    expect(toolbar()).not.toBeNull()
    expect(paintBlocks().length).toBe(3)
    expect(allBlocksInLeftColumn()).toBe(true)
    await clickHighlightSave()
    const arg = saveMock.mock.calls[0]![0] as { annotation: { quoteText: string; startOffset: number; endOffset: number } }
    expect(arg.annotation.quoteText).toBe('LCOLSENT1LCOLSENT2LCOLSENT3')
    expect(arg.annotation.quoteText).not.toContain('RCOL')
    expect(arg.annotation.startOffset).toBe(12)
    expect(arg.annotation.endOffset).toBe(39)
  })

  it('A2b 入栏出现退回消失（§7）：会话内外部写 focus 入右栏→selectionchange 钳制回锚栏→paint 无右栏块+quote 无 RCOL', async () => {
    const f = mountTwocolFixture()
    seedTwocolPage()
    await mountLayer(f.page)
    fireDown(f.spanOf('L1'), 20, 25)
    fireMove(20, 65)
    selectRange(f.textOf('L1'), 0, f.textOf('R2'), 2)
    fireSelectionChange()
    fireSelectionChange()
    await advance(16)
    expect(paintBlocks().length).toBeGreaterThanOrEqual(1)
    expect(allBlocksInLeftColumn()).toBe(true)
    await advance(200)
    expect(allBlocksInLeftColumn()).toBe(true)
    await clickHighlightSave()
    const arg = saveMock.mock.calls[0]![0] as { annotation: { quoteText: string } }
    expect(arg.annotation.quoteText).not.toContain('RCOL')
  })

  it('B1 visual 同签名禁重复 paint（zoom 差分轴）：同签名重复 selectionchange 到达前改 zoom——重画则几何漂移、幂等则保持 zoom1', async () => {
    const f = mountMarkerFixture()
    seedMarkerPage()
    await mountLayer(f.page)
    selectRange((f.span1.firstChild as Text), 0, (f.span1.firstChild as Text), 2)
    fireSelectionChange()
    await advance(16)
    expect(parseFloat(firstRect()!.style.top)).toBeCloseTo((20 / 120) * 100, 2)
    setZoom(2)
    fireSelectionChange()
    fireSelectionChange()
    await advance(16)
    expect(parseFloat(firstRect()!.style.top), '同签名不触发第二次 paint（保持 zoom1 几何 16.67%）').toBeCloseTo((20 / 120) * 100, 2)
  })

  it('B2 终局 echo 调度器幂等（W-4）：mouseup 终态后 S5 窗外多次到达的同签名 selectionchange 不覆盖终态', async () => {
    const f = mountMarkerFixture()
    seedMarkerPage()
    await mountLayer(f.page)
    selectRange((f.span1.firstChild as Text), 0, (f.span1.firstChild as Text), 2)
    fireSelectionChange()
    await advance(16)
    act(() => {
      fireUp(20, 25)
    })
    expect(toolbar()).not.toBeNull()
    setZoom(2)
    fireSelectionChange()
    await advance(16)
    fireSelectionChange()
    await advance(200)
    expect(parseFloat(firstRect()!.style.top), '终局 echo 同签名跳过（终态保持 mouseup 时刻 zoom1）').toBeCloseTo((20 / 120) * 100, 2)
  })

  it('B3 settle 路同签名幂等：停顿 settle 已评估后同签名再到达——全量不重排（zoom 差分轴保持）', async () => {
    const f = mountMarkerFixture()
    seedMarkerPage()
    await mountLayer(f.page)
    selectRange((f.span1.firstChild as Text), 0, (f.span1.firstChild as Text), 2)
    fireSelectionChange()
    await advance(16)
    await advance(200)
    expect(toolbar()).not.toBeNull()
    setZoom(2)
    fireSelectionChange()
    await advance(16)
    await advance(200)
    expect(parseFloat(firstRect()!.style.top), 'settle 同签名跳过（保持 zoom1）').toBeCloseTo((20 / 120) * 100, 2)
    expect(toolbar()).not.toBeNull()
  })

  it('B4 保存清选区后同段再选有 paint（签名缓存失效锚：save 的 removeAllRanges 路径不残留旧签名）', async () => {
    const f = mountMarkerFixture()
    seedMarkerPage()
    await mountLayer(f.page)
    selectRange((f.span1.firstChild as Text), 0, (f.span1.firstChild as Text), 2)
    fireSelectionChange()
    await advance(16)
    await advance(200)
    expect(toolbar()).not.toBeNull()
    await clickHighlightSave()
    expect(toolbar()).toBeNull()
    selectRange((f.span1.firstChild as Text), 0, (f.span1.firstChild as Text), 2)
    fireSelectionChange()
    await advance(16)
    expect(firstRect(), '同段再选=新会话域，paint 必须出').not.toBeNull()
    await advance(200)
    expect(toolbar()).not.toBeNull()
  })

  it('C1 慢拖逐 rAF+>200ms 停顿无空帧（§7）：逐帧拖到末行下方标记——每帧块在场+停顿帧几何=停顿前帧+终局工具条', async () => {
    const f = mountMarkerFixture()
    seedMarkerPage()
    await mountLayer(f.page)
    fireDown(f.span1, 20, 25)
    const text1 = f.span1.firstChild as Text
    const textMk = f.marker.firstChild as Text
    selectRange(text1, 0, text1, 1)
    fireSelectionChange()
    await advance(16)
    expect(paintBlocks().length).toBeGreaterThanOrEqual(1)
    selectRange(text1, 0, text1, 2)
    fireSelectionChange()
    await advance(16)
    expect(paintBlocks().length).toBeGreaterThanOrEqual(1)
    selectRange(text1, 0, textMk, 0)
    fireSelectionChange()
    await advance(16)
    expect(paintBlocks().length, '末行下方帧：visual 吸附帧双行块在场').toBe(2)
    const beforePause = blockStyles()
    await advance(250)
    expect(paintBlocks().length, '停顿 >200ms：settle 后无空帧').toBe(2)
    expect(blockStyles(), '停顿帧几何=停顿前帧（无双几何交替）').toEqual(beforePause)
    fireUp(20, 30)
    await advance(16)
    expect(toolbar(), '终局 mouseup 工具条在场（quote=ABCD 未退化）').not.toBeNull()
  })

  it('D1 双写竞态交错（W-4 观察面）：控制器投影写与外部写多轮交错——中途每帧 paint 左域+终态 quote/选区锚栏一致', async () => {
    const f = mountTwocolFixture()
    seedTwocolPage()
    await mountLayer(f.page)
    fireDown(f.spanOf('L1'), 20, 25)
    fireMove(20, 65)
    selectRange(f.textOf('L1'), 0, f.textOf('R1'), 4)
    fireSelectionChange()
    fireSelectionChange()
    await advance(16)
    expect(paintBlocks().length, 'W4：第一轮块在场（空集恒绿缺陷）').toBeGreaterThanOrEqual(1)
    expect(allBlocksInLeftColumn()).toBe(true)
    selectRange(f.textOf('L1'), 0, f.textOf('R2'), 5)
    fireSelectionChange()
    fireSelectionChange()
    await advance(16)
    expect(paintBlocks().length, 'W4：第二轮块在场').toBeGreaterThanOrEqual(1)
    expect(allBlocksInLeftColumn()).toBe(true)
    selectRange(f.textOf('L1'), 0, f.textOf('R3'), 6)
    fireSelectionChange()
    fireSelectionChange()
    await advance(16)
    expect(paintBlocks().length, 'W4：第三轮块在场').toBeGreaterThanOrEqual(1)
    expect(allBlocksInLeftColumn()).toBe(true)
    fireUp(20, 65)
    await advance(16)
    expect(toolbar()).not.toBeNull()
    expect(window.getSelection()!.focusNode, '终局选区 focus=锚栏（钳制终态保持）').toBe(f.textOf('L3'))
    // 新纪同签名帧（mousedown invalidate 判别锚——置于 save 之前防失效面互掩）：
    // 第二纪 mousedown 后同签名选区必须重评估（zoom2 几何）；先越 S5 窗
    // （fireUp 的 markFlushed TTL 100ms——窗内帧会被短路吞，非签名面）
    await advance(150)
    fireDown(f.spanOf('L1'), 20, 25)
    setZoom(2)
    selectRange(f.textOf('L1'), 0, f.textOf('L3'), 0)
    fireSelectionChange()
    await advance(16)
    expect(parseFloat(paintBlocks()[0]!.style.top), '新纪首帧读新 zoom（zoom2 → 40/120）').toBeCloseTo((40 / 120) * 100, 1)
    await clickHighlightSave()
    const arg = saveMock.mock.calls[0]![0] as { annotation: { quoteText: string } }
    expect(arg.annotation.quoteText).not.toContain('RCOL')
  })

  it('W1 终局 echo 双缓存同步（回炉轮1 B）：affinity 改写终局签名 A≠拖选期 R 后，S5 窗外到达的签名 A echo 两路均吸收（零重画——zoom 差分轴保持终局几何）', async () => {
    const f = mountMarkerFixture()
    seedMarkerPage()
    await mountLayer(f.page)
    // 拖选期：down 行1→move 行2→选区 R=(AB,0)-(CD,2)→visual 评估 R（2 块）
    fireDown(f.span1, 20, 25)
    fireMove(20, 65)
    selectRange((f.span1.firstChild as Text), 0, (f.span2.firstChild as Text), 2)
    fireSelectionChange()
    await advance(16)
    expect(paintBlocks().length).toBe(2)
    // mouseup 释放点 (150,35)：focus 行2 盒顶 60 上方、距行1 底 30 为 5≤max(25,4)、
    // upX=150>行1 右缘 110+1 容差=111（该处无文本）——F-A12 浅探 affinity 触发：
    // focus 重定向行1 行尾 (AB,2)→终局签名 A=(AB,0)-(AB,2)≠R；full(true) 终局帧
    // （1 块 zoom1）
    fireUp(150, 35)
    await advance(16)
    expect(toolbar()).not.toBeNull()
    expect(paintBlocks().length).toBe(1)
    expect(parseFloat(firstRect()!.style.top)).toBeCloseTo((20 / 120) * 100, 2)
    // 出 S5 窗（markFlushed TTL=100ms）+环境变更（zoom2 判别轴）
    setZoom(2)
    await advance(150)
    // 终局 echo（签名 A）窗外到达：visual 路须吸收（A==lastVisualSig）——重画
    // 则读 zoom2 几何漂移（33.33%）在此红（删 full(true) 双缓存同步的变异锚）
    fireSelectionChange()
    await advance(16)
    expect(paintBlocks().length).toBe(1)
    expect(parseFloat(firstRect()!.style.top), '终局 echo visual 路零重画（保持 mouseup 终局 zoom1 几何）').toBeCloseTo((20 / 120) * 100, 2)
    expect(toolbar()).not.toBeNull()
    // [微回炉 N-2] settle 路吸收实证（标题「两路均吸收」补全）：echo 的防抖
    // 冲 200ms settle 窗——full(false) 须被 lastFullSig=A 吸收零重评估（重评估
    // 读 zoom2 覆盖则 top 漂移在此红）
    await advance(200)
    expect(paintBlocks().length).toBe(1)
    expect(parseFloat(firstRect()!.style.top), '终局 echo settle 路零重评估（两路均吸收实证）').toBeCloseTo((20 / 120) * 100, 2)
    expect(toolbar()).not.toBeNull()
  })

  it('W1b settle 路同步残余（微回炉 W-1）：S5 窗内程序化改选 B 被 visual 吞（签名不更新）→settle full(false) 完成 B 权威帧→窗外同签名 B echo 零重画', async () => {
    const f = mountMarkerFixture()
    seedMarkerPage()
    await mountLayer(f.page)
    // 拖选期 visual 评估 R→mouseup affinity 终局 A（双缓存 A/A——回炉轮1 B 面）
    fireDown(f.span1, 20, 25)
    fireMove(20, 65)
    selectRange((f.span1.firstChild as Text), 0, (f.span2.firstChild as Text), 2)
    fireSelectionChange()
    await advance(16)
    fireUp(150, 35)
    await advance(16)
    expect(toolbar()).not.toBeNull()
    // S5 窗内程序化改选 B=(AB,0)-(CD,1)（markFlushed 后 16ms<100ms）：rAF 的
    // visual 被 shouldSkipVisual 吞（签名不更新）——仅 settle 防抖在途
    selectRange((f.span1.firstChild as Text), 0, (f.span2.firstChild as Text), 1)
    fireSelectionChange()
    await advance(16)
    // settle full(false) 执行：B≠A 评估渲染（B 权威帧：2 块 zoom1——首块 16.67%）
    await advance(200)
    expect(toolbar()).not.toBeNull()
    expect(paintBlocks().length).toBe(2)
    expect(parseFloat(firstRect()!.style.top)).toBeCloseTo((20 / 120) * 100, 2)
    // 环境变更（zoom2 判别轴）后同签名 B echo 窗外到达：visual 路须命中吸收
    // （B==lastVisualSig——settle 完成后同步）——重画则读 zoom2 漂移在此红
    // （删 full(false) 的 lastVisualSig 同步=微回炉 W-1 变异锚）
    setZoom(2)
    fireSelectionChange()
    await advance(16)
    expect(paintBlocks().length).toBe(2)
    expect(parseFloat(firstRect()!.style.top), 'settle 权威帧后同签名 echo 零重画（保持 zoom1）').toBeCloseTo((20 / 120) * 100, 2)
    expect(toolbar()).not.toBeNull()
  })

  it('W2 invalidate 后空选区事件正常清理（回炉轮1——null 双义修复锚）：mousedown invalidate→外部 removeAllRanges 的 selectionchange 须清 paint/pending（残留即红）', async () => {
    const f = mountMarkerFixture()
    seedMarkerPage()
    await mountLayer(f.page)
    selectRange((f.span1.firstChild as Text), 0, (f.span2.firstChild as Text), 2)
    fireSelectionChange()
    await advance(16)
    await advance(200)
    expect(toolbar()).not.toBeNull()
    expect(firstRect()).not.toBeNull()
    // mousedown invalidate（缓存置「未评估」）后外部清选区（sig=null 事件）
    fireDown(f.span1, 20, 25)
    window.getSelection()!.removeAllRanges()
    fireSelectionChange()
    await advance(16)
    expect(firstRect(), 'visual 路空选区守卫须执行清帧（null==null 早退=旧帧残留）').toBeNull()
    await advance(200)
    expect(toolbar(), 'settle 路空选区清理须执行（pending 残留即红）').toBeNull()
  })
})
