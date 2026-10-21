// @vitest-environment jsdom
/**
 * [F-A6-c] selection-evaluate —— 快路径（evaluateVisual）行为面（always-active
 * ——ADR-0017 裁决 3 同款：新测试不经 guardedDescribe；诞生即锁）。
 *
 * 组群（票面 §1-E+门一回炉 W1+[53CI-02] A1/A2 组）：
 * - 快慢等价（INV-58 后半锚）：快路径 rAF 帧产物与 settle 全量逐位一致（同族同链
 *   禁第二几何口径）；[53CI-02 A2] settle 同签名零重画=paint 保持快帧+工具条在场；
 * - 同帧覆盖锚 [A2 语义改写]：同签名 settle 不再 setPaint——mid-drag zoom 变更后
 *   paint 保持快路帧（zoom1）（preservePaint 删除变异下慢路 zoom2 覆盖=红）；
 * - 快路径守卫前置（裁决 2-§5①(ii)）：跨页选区 visual 路静默 setPaint(null)；
 * - W1 mouseup cancel-before-evaluate 顺序锚（机理见 it 内注释）；
 * - [53CI-02] A1/A2 组：区间推导同源探针形态族锚（幂等 3+非幂等 2+翻转 1——P1-B2
 *   经主控裁决由翻转锚替换；构造性等价，双侧同根同侧同调一次）/组件级同源/
 *   A2 终局改写分支/A2 快路缺席形态。
 * tick 预算断言不设独立 it——帧随动语义由 selection-paint.test S1c+selection-geometry
 * C1/C2 覆盖。
 * 夹具口径 crib selection-item-chain.test.tsx（期望值手算 VP0 scale1：项 transform
 * [10,0,0,10,72,700]→盒 {72,84,100,10}→top≈10.6061%；zoom2→盒×2→top≈21.2121%）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeApiStub, stubUnwrap, toastSpy } from '../../utils/api-client-mock'
import { stubElementRects, stubRangeGBCR, domRect, type StubBox } from '../../utils/geometry'
import { mkItem, mkText, seedRegistry } from '../../utils/factories'
import { SelectionLayer } from '../../../src/renderer/features/reader/interact/SelectionLayer'
import { clearAffinityShortcut } from '../../../src/renderer/features/reader/interact/selection-evaluate'
import { normalizedOffsetsOf } from '../../../src/renderer/features/reader/interact/selection-effective-range'
import { rangeToAnchor } from '../../../src/renderer/features/reader/anchors/anchor-serialize'
import { usePageItemsStore } from '../../../src/renderer/features/reader/anchors/page-items.store'
import { createReaderStoreInitialState, useReaderStore } from '../../../src/renderer/features/reader/state/reader.store'

const saveMock = vi.fn()
makeApiStub({ reader: { saveAnnotation: saveMock } })
// unwrap 透传 Result.data（成功路径——失败路径不经组件分支外的形态）
stubUnwrap(async (p: Promise<{ ok: boolean; data: unknown }>): Promise<unknown> => {
  const r = await p
  return r.data
})

/** jsdom 无布局：元素 rect 按预设表返回（textLayer 盒=归一化基准 612×792） */
const rects = new Map<Element, StubBox>()
let rangeStub: { restore(): void } | null = null
const rangeRect = { x: 10, y: 900, width: 200, height: 20 }

/** 单页夹具（口径 crib item-chain：textLayer 盒置于视口绝对位 (500,300) 域锁；
 *  span 盒视口绝对 y=500=textLayer 盒 y300+盒本地 y200——本地 y=200 与项链
 *  y=84 刻意不同：两条链产物判别性区分，DOM 回退链归一 top≈25.25%=(500−300)/792） */
function mountPageFixture(no: string, itemsText: string): { page: HTMLElement; span: HTMLElement } {
  const page = document.createElement('div')
  page.setAttribute('data-page-root', no)
  const textLayer = document.createElement('div')
  textLayer.className = 'textLayer'
  const span = document.createElement('span')
  span.textContent = itemsText
  textLayer.appendChild(span)
  page.appendChild(textLayer)
  document.body.appendChild(page)
  rects.set(textLayer, { x: 500, y: 300, width: 612, height: 792 })
  rects.set(page, { x: 500, y: 300, width: 612, height: 792 })
  rects.set(span, { x: 572, y: 500, width: 100, height: 10 })
  return { page, span }
}

/** reader store zoom 写口（mid-drag zoom 差分形态共用——W1/同帧覆盖两 it 的判别轴） */
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

function selectAllOf(span: HTMLElement): void {
  const sel = window.getSelection()
  const range = document.createRange()
  const textNode = span.firstChild as Text
  range.setStart(textNode, 0)
  range.setEnd(textNode, textNode.data.length)
  sel?.removeAllRanges()
  sel?.addRange(range)
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

const toolbar = (): HTMLElement | null => host?.querySelector<HTMLElement>('[data-testid="selection-toolbar"]') ?? null
const paintBlocks = (): HTMLElement[] => Array.from(document.querySelectorAll<HTMLElement>('[data-testid="selection-rect"]'))
const firstRect = (): HTMLElement | null => document.querySelector<HTMLElement>('[data-testid="selection-rect"]') ?? null
/** 块几何快照（left/top/width/height——快慢产物逐位比对的面） */
const blockStyles = (): Array<Record<string, string>> =>
  paintBlocks().map((b) => ({ left: b.style.left, top: b.style.top, width: b.style.width, height: b.style.height }))

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

describe('F-A6-c 快路径 evaluateVisual（rAF 帧×项几何链直取）', () => {
  it('快慢等价（INV-58 后半）：同夹具下 rAF 帧快路径产物与 settle 全量产物逐位一致（块数+四向几何）', async () => {
    const { page, span } = mountPageFixture('1', 'AB')
    seedRegistry(1, mkText([mkItem('AB', 72, 700)]))
    await mountLayer(page)
    selectAllOf(span)
    fireSelectionChange()
    // rAF 帧（t=16）：快路径（轻量 probe→项几何链直取——无 selectionToAnchor）
    await act(async () => {
      await vi.advanceTimersByTimeAsync(16)
    })
    const fast = blockStyles()
    expect(fast.length).toBeGreaterThanOrEqual(1)
    expect(parseFloat(firstRect()!.style.top)).toBeCloseTo((84 / 792) * 100, 2)
    // settle（t=200）：[A2] 同签名零重画=paint 保持快帧；工具条=慢路语义照常
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200)
    })
    expect(blockStyles()).toEqual(fast)
    expect(toolbar(), 'settle 慢路语义照常（pending/工具条落地——零重画只跳 setPaint）').not.toBeNull()
  })

  it('同帧覆盖锚[A2 语义改写]（票面强制断言改写——53CI-02）：同签名 settle 不再 setPaint，paint 保持快路帧（mid-drag zoom 形态：快=zoom1 帧保持，慢路几何同源不再覆盖）', async () => {
    // [53CI-02 A2 改写] 慢路零重画：同签名 settle 不再 setPaint，paint 保持快路帧
    // （zoom1）——判别性=preservePaint 删除变异下慢路重画 zoom2（21.2121%）红
    const { page, span } = mountPageFixture('1', 'AB')
    seedRegistry(1, mkText([mkItem('AB', 72, 700)]))
    await mountLayer(page)
    selectAllOf(span)
    fireSelectionChange()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(16)
    })
    expect(parseFloat(firstRect()!.style.top)).toBeCloseTo((84 / 792) * 100, 2)
    act(() => {
      useReaderStore.setState({
        tabs: {
          'p-1': {
            paperId: 'p-1', fileUrl: '', fileName: '', title: '', page: 0, totalPages: 0, zoom: 2,
            color: 'yellow', annotations: [], status: 'ready', dirty: false
          }
        },
        activeId: 'p-1'
      })
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200)
    })
    // [A2] paint 保持快路帧（zoom1——非 zoom2）；工具条在场=慢路照常执行
    const rect = firstRect()
    expect(rect).not.toBeNull()
    expect(parseFloat(rect!.style.top), 'A2 零重画：同签名 settle 后 paint 保持快路帧（zoom1）').toBeCloseTo((84 / 792) * 100, 2)
    expect(toolbar(), 'settle 慢路语义照常（工具条落地）').not.toBeNull()
  })

  it('快路径守卫前置（裁决 2-§5①(ii)）：跨页选区 visual 路 rAF 帧后仍静默 setPaint(null)——无守卫时快路径把跨页偏移归一化进单页=paint 出块在此红', async () => {
    const { page: page1, span: span1 } = mountPageFixture('1', 'AB')
    const { page: page2, span: span2 } = mountPageFixture('2', 'CD')
    void page2
    seedRegistry(1, mkText([mkItem('AB', 72, 700)]))
    seedRegistry(2, mkText([mkItem('CD', 72, 700)]))
    await mountLayer(page1)
    // 跨页选区（两页注册表均在位=守卫删除后快路可产块的判别前提）
    selectRange(span1.firstChild!, 0, span2.firstChild!, 1)
    fireSelectionChange()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(16)
    })
    expect(firstRect()).toBeNull()
    // settle（防抖全量）同样静默：无 toast（P2b 语义）+无工具条
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200)
    })
    expect(toastSpy).not.toHaveBeenCalled()
    expect(toolbar()).toBeNull()
    expect(firstRect()).toBeNull()
  })

  it('W1 mouseup cancel-before-evaluate 顺序锚（门一回炉——竞态面）：mouseup 时刻在途 rAF 清除+settle 防抖不补枪——mouseup 全量产物为终态（判别形态=预渲染 paint 后重建在途 rAF，mouseup 后改 zoom 推进 300ms 越过帧点与防抖点，paint 仍=mouseup 时刻全量几何；RR2-1 红证改实——cancel 删除变异实测无判别力〔双路吸收〕，现存判别面=终局几何锚+防抖不补枪面）', async () => {
    const { page, span } = mountPageFixture('1', 'AB')
    seedRegistry(1, mkText([mkItem('AB', 72, 700)]))
    setZoom(2)
    await mountLayer(page)
    selectAllOf(span)
    fireSelectionChange()
    // 预渲染：快路径帧先落 paint 在场（规避 live range 对 DOM 插入的原生
    // selectionchange 诱发——S8 态票外行为）
    await act(async () => {
      await vi.advanceTimersByTimeAsync(16)
    })
    expect(firstRect()).not.toBeNull()
    // 重建在途 rAF：mouseup 时刻恰有一个待触发 rAF（t=32）+新防抖（t=216）
    fireSelectionChange()
    // mouseup（无 mousedown 记录=程序化形态，位移门槛放行）：cancel 先清
    // 在途 rAF+防抖 →full(true) 同步执行
    // [RR2-1 红证改实] cancel 删除变异无判别力（实测仍绿）：在途 rAF 被 S5 窗吞+
    // 防抖 full 被 lastFullSig 吸收=双路吸收；现存判别面=终局几何锚+防抖不补枪面
    act(() => {
      document.dispatchEvent(new MouseEvent('mouseup'))
    })
    // 全量恰执行一次的正面锚：mouseup 即时工具条+全量产物（zoom2 几何 168/792）
    expect(toolbar()).not.toBeNull()
    const rect = firstRect()
    expect(rect).not.toBeNull()
    expect(parseFloat(rect!.style.top)).toBeCloseTo((168 / 792) * 100, 2)
    // mouseup 后改 zoom=3：推进 300ms 无二次评估（cancel 删除形态由 S5 窗+双吸收同果）
    setZoom(3)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300)
    })
    const final = firstRect()
    expect(final).not.toBeNull()
    expect(parseFloat(final!.style.top)).toBeCloseTo((168 / 792) * 100, 2)
  })
})

describe('F-VISFB-53CI-02 A1/A2（区间推导同源+慢路零重画）', () => {
  beforeEach(() => {
    // S5 窗=模块级时刻戳，跨 it 清理防吞快帧；全字段 domRect 桩（boxOf 读四边——
    // 四字段桩 NaN 静默杀归一化链=flicker 同族实证）
    clearAffinityShortcut()
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
      const r = rects.get(this)
      return domRect(r?.x ?? 0, r?.y ?? 0, r?.width ?? 0, r?.height ?? 0)
    })
  })

  /** 工具条「高亮」保存（save 入参=慢路 pending.anchor 区间观测面） */
  async function clickSave(): Promise<void> {
    const saved = {
      id: 'a-53ci2', paperId: 'p-1', page: 0, kind: 'highlight', color: 'yellow',
      quoteText: '', prefixText: '', suffixText: '', startOffset: 0, endOffset: 0,
      rects: [], comment: '', createdAt: '2026-10-20T00:00:00Z', updatedAt: '2026-10-20T00:00:00Z'
    }
    saveMock.mockResolvedValue({ ok: true, data: saved })
    await act(async () => {
      const btn = Array.from(toolbar()!.querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent === '高亮')!
      btn.click()
      await vi.advanceTimersByTimeAsync(0)
    })
  }

  /** A1 探针形态族锚夹具（defs=行内 span/br+量测盒——snapBlankBoundary 量测域） */
  function buildSnapLayer(defs: Array<{ id: string; text?: string; br?: boolean; box: StubBox }>): {
    layer: HTMLElement
    textOf: (id: string) => Text
  } {
    const layer = document.createElement('div')
    layer.className = 'textLayer'
    for (const d of defs) {
      const el = d.br === true ? document.createElement('br') : document.createElement('span')
      el.id = d.id
      if (d.br !== true) el.textContent = d.text ?? ''
      rects.set(el, d.box)
      layer.append(el)
    }
    return { layer, textOf: (id) => layer.querySelector(`#${id}`)!.firstChild as Text }
  }

  it('A1 区间推导同源（构造性等价六形态锚——P1 探针转正）：normalizedOffsetsOf 与 rangeToAnchor 区间恒等（含非幂等形态——双侧同根同侧同调 snapBlankBoundary 一次，不依幂等性）', () => {
    // 形态族=幂等 3（A/C/C2）+非幂等 2（B/D：目标=空白 span 文本位，二次施加再移）
    // +翻转 1（B2）；双侧各调一次 snapBlank=构造性恒等，不依幂等性
    const forms: Array<{
      name: string
      defs: Array<{ id: string; text?: string; br?: boolean; box: StubBox }>
      from: (layer: HTMLElement, textOf: (id: string) => Text) => [Node, number]
      to: (layer: HTMLElement, textOf: (id: string) => Text) => [Node, number]
      want: [number, number]
    }> = [
      {
        name: 'A 单空白行end',
        defs: [
          { id: 'T1', text: 'aa', box: { x: 10, y: 84, width: 50, height: 10 } },
          { id: 'X', text: ' ', box: { x: 60, y: 84, width: 8, height: 10 } },
          { id: 'T2', text: 'bb', box: { x: 68, y: 84, width: 50, height: 10 } }
        ],
        from: (_l, t) => [t('T1'), 0],
        to: (_l, t) => [t('X'), 1],
        want: [0, 2]
      },
      {
        name: 'B 多空白行start',
        defs: [
          { id: 'X', text: ' ', box: { x: 10, y: 84, width: 8, height: 10 } },
          { id: 'W', text: ' ', box: { x: 18, y: 84, width: 8, height: 10 } },
          { id: 'N', text: 'bb', box: { x: 26, y: 84, width: 50, height: 10 } }
        ],
        from: (_l, t) => [t('X'), 0],
        to: (_l, t) => [t('N'), 2],
        want: [1, 4]
      },
      {
        name: 'B2 翻转兜底跨行',
        defs: [
          { id: 'S1', text: 'aa', box: { x: 10, y: 84, width: 50, height: 10 } },
          { id: 'BR', br: true, box: { x: 10, y: 94, width: 0, height: 20 } },
          { id: 'S2', text: 'bb', box: { x: 10, y: 104, width: 50, height: 10 } },
          { id: 'S3', text: 'cc', box: { x: 10, y: 124, width: 50, height: 10 } }
        ],
        from: (l) => [l, 2],
        to: (_l, t) => [t('S2'), 1],
        want: [3, 4]
      },
      {
        name: 'C br-end',
        defs: [
          { id: 'T1', text: 'aa', box: { x: 10, y: 84, width: 50, height: 10 } },
          { id: 'BR', br: true, box: { x: 10, y: 84, width: 0, height: 20 } },
          { id: 'T2', text: 'bb', box: { x: 10, y: 114, width: 50, height: 10 } }
        ],
        from: (_l, t) => [t('T1'), 0],
        to: (l) => [l, 2],
        want: [0, 2]
      },
      {
        name: 'C2 br-start',
        defs: [
          { id: 'T1', text: 'aa', box: { x: 10, y: 84, width: 50, height: 10 } },
          { id: 'BR', br: true, box: { x: 10, y: 84, width: 0, height: 20 } },
          { id: 'T2', text: 'bb', box: { x: 10, y: 114, width: 50, height: 10 } }
        ],
        from: (l) => [l, 2],
        to: (_l, t) => [t('T2'), 2],
        want: [2, 4]
      },
      {
        name: 'D br-end行尾空白项',
        defs: [
          { id: 'T1', text: 'aa', box: { x: 10, y: 84, width: 50, height: 10 } },
          { id: 'W', text: ' ', box: { x: 60, y: 84, width: 12, height: 10 } },
          { id: 'BR', br: true, box: { x: 10, y: 84, width: 0, height: 20 } },
          { id: 'T2', text: 'bb', box: { x: 10, y: 114, width: 50, height: 10 } }
        ],
        from: (_l, t) => [t('T1'), 0],
        to: (l) => [l, 3],
        want: [0, 3]
      }
    ]
    for (const f of forms) {
      const { layer, textOf } = buildSnapLayer(f.defs)
      const range = document.createRange()
      const [sn, so] = f.from(layer, textOf)
      const [en, eo] = f.to(layer, textOf)
      range.setStart(sn, so)
      range.setEnd(en, eo)
      const fast = normalizedOffsetsOf(layer, range)
      const slow = rangeToAnchor(layer, range)
      expect(fast, `${f.name}：快路归一化区间（删 snapBlank 镜像变异在此红）`).toEqual({ start: f.want[0], end: f.want[1] })
      expect(slow?.start, `${f.name}：慢路 rangeToAnchor start 恒等`).toBe(f.want[0])
      expect(slow?.end, `${f.name}：慢路 rangeToAnchor end 恒等`).toBe(f.want[1])
    }
  })

  it('A1/A4 组件级同源锚（多空白行非幂等形态 B）：paint 几何=归一化区间项几何+save 入参区间=慢路同区间（所见即所存恒等投影）', async () => {
    // DOM 量测盒（y384）与项盒（y84）刻意错位——band 校准窗不命中=派生 band 原样
    const page = document.createElement('div')
    page.setAttribute('data-page-root', '1')
    const textLayer = document.createElement('div')
    textLayer.className = 'textLayer'
    const mk = (id: string, text: string, b: StubBox): void => {
      const s = document.createElement('span')
      s.id = id
      s.textContent = text
      textLayer.append(s)
      rects.set(s, b)
    }
    mk('X', ' ', { x: 10, y: 384, width: 8, height: 10 })
    mk('W', ' ', { x: 18, y: 384, width: 8, height: 10 })
    mk('N', 'bb', { x: 26, y: 384, width: 50, height: 10 })
    page.appendChild(textLayer)
    document.body.appendChild(page)
    rects.set(textLayer, { x: 0, y: 0, width: 612, height: 792 })
    rects.set(page, { x: 0, y: 0, width: 612, height: 792 })
    seedRegistry(1, mkText([mkItem(' ', 10, 700), mkItem(' ', 18, 700), mkItem('bb', 26, 700)]))
    await mountLayer(page)
    // start=X 空白文本内（浏览器空白区解析形态）→end=N 尾 → 归一化 [1,4)
    selectRange(document.getElementById('X')!.firstChild!, 0, document.getElementById('N')!.firstChild!, 2)
    fireSelectionChange()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(16)
    })
    // 区间 [1,4)=W+N 项并块 → left=18/612（删镜像变异下裸 probe 含 X→10/612 红）
    const rect = firstRect()
    expect(rect).not.toBeNull()
    expect(parseFloat(rect!.style.left)).toBeCloseTo((18 / 612) * 100, 2)
    expect(parseFloat(rect!.style.top)).toBeCloseTo((84 / 792) * 100, 2)
    // mouseup 终局（同签名=A2 保持快帧；pending 慢路照常）→save 入参=慢路区间
    act(() => {
      document.dispatchEvent(new MouseEvent('mouseup'))
    })
    expect(toolbar()).not.toBeNull()
    expect(parseFloat(firstRect()!.style.left), 'A2：终局 paint 保持快路帧').toBeCloseTo((18 / 612) * 100, 2)
    await clickSave()
    const arg = saveMock.mock.calls[0]![0] as { annotation: { quoteText: string; startOffset: number; endOffset: number } }
    expect(arg.annotation.startOffset).toBe(1)
    expect(arg.annotation.endOffset).toBe(4)
    expect(arg.annotation.quoteText).toBe(' bb')
  })

  it('A2 终局改写分支：mouseup 时刻选区被改写（enforce/release-affinity 形态）→终局签名≠快路已画签名→慢路照常画终态帧', async () => {
    const { page, span } = mountPageFixture('1', 'AB')
    seedRegistry(1, mkText([mkItem('AB', 72, 700)]))
    await mountLayer(page)
    const text = span.firstChild as Text
    // 拖选期快路画 A=全选（width=100/612≈16.34%）
    selectRange(text, 0, text, 2)
    fireSelectionChange()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(16)
    })
    expect(parseFloat(firstRect()!.style.width)).toBeCloseTo((100 / 612) * 100, 2)
    // mouseup 时刻选区=B=半选（模拟终局改写——签名 B≠A；程序化形态 F-12 放行）
    selectRange(text, 0, text, 1)
    act(() => {
      document.dispatchEvent(new MouseEvent('mouseup'))
    })
    // preservePaint=false → 慢路画终态帧 B（恒 true 变异下保持 A 帧红）
    const rect = firstRect()
    expect(rect).not.toBeNull()
    expect(parseFloat(rect!.style.width), '终局签名≠快路签名：慢路画终态帧（半选几何）').toBeCloseTo((50 / 612) * 100, 2)
    expect(toolbar()).not.toBeNull()
  })

  it('A2 快路缺席形态（程序化/键盘选区——visual 未评估该签名）：慢路照常 setPaint', async () => {
    const { page, span } = mountPageFixture('1', 'AB')
    seedRegistry(1, mkText([mkItem('AB', 72, 700)]))
    await mountLayer(page)
    selectRange(span.firstChild as Text, 0, span.firstChild as Text, 2)
    // 无 fireSelectionChange/无 rAF 推进——visual 从未评估该签名（快路缺席）
    act(() => {
      document.dispatchEvent(new MouseEvent('mouseup'))
    })
    const rect = firstRect()
    expect(rect, '快路缺席时慢路照常 setPaint（preservePaint 恒 true 变异下 null 红）').not.toBeNull()
    expect(parseFloat(rect!.style.top)).toBeCloseTo((84 / 792) * 100, 2)
    expect(toolbar()).not.toBeNull()
  })
})
