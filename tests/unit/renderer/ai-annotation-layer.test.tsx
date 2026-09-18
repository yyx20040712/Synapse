// @vitest-environment jsdom
/**
 * [SR2-AI-09] AiAnnotationLayer —— AI 标注渲染层组件测试（锁定合约）。
 *
 * 覆盖：verifyQuote 真→rects 渲染+七问分色（ai-note-style 单源）/重锚失败→
 * 该段零 rects 且他段不受扰/篇级无锚行不入层/点击→该段全部 rects 高亮+
 * onJumpToNote 上抛/只读断言（无菜单无编辑元素）/翻页重锚缓存失效（paperId+
 * 页键）/anchor-locate exact 层延展（data-ai-note-id 目标滚动+闪烁；data-
 * annotation-id 既有行为不回归）。F-05：滚动副作用经 scrollIntoNearestScroller
 * （单容器收敛，INV-34）——桩=模块 mock，断言调用形（目标元素, 'center'）。
 * always-active（ADR-0017 裁决 3）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { stubElementRects, type StubBox } from '../../utils/geometry'
import { makeTab } from '../../utils/factories'
import type { AiNote } from '../../../src/shared/models/ai-note'
import { AiAnnotationLayer } from '../../../src/renderer/features/reader/AiAnnotationLayer'
import { locateAnchor } from '../../../src/renderer/features/reader/anchor-locate'
import { useReaderStore } from '../../../src/renderer/features/reader/state/reader.store'
import { QUESTION_COLOR } from '../../../src/renderer/features/reader/ai-note-style'
import { PAGE_LAYER_Z } from '../../../src/renderer/features/reader/state/page-layer-z'
import { usePageItemsStore, type PageItemEntry } from '../../../src/renderer/features/reader/page-items.store'
import type { PdfTextItem, PdfTextStyle } from '../../../src/renderer/features/reader/PdfPageCanvas'

// F-05：flashElement 滚动副作用替身（数学在 scroll-converge.test 锚定）
const { scrollerMock } = vi.hoisted(() => ({ scrollerMock: vi.fn() }))
vi.mock('../../../src/renderer/features/reader/state/scroll-converge', () => ({
  scrollIntoNearestScroller: scrollerMock
}))

/** rAF 同步化（jsdom 假帧——重锚 effect 即时收敛，测试确定性） */
function syncRaf(): void {
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback): number => {
    cb(0)
    return 0
  })
}

function note(p: {
  id: string
  question: AiNote['question']
  quote: string
  anchorPage?: number | null
  paperId?: string
}): AiNote {
  return {
    id: p.id,
    paperId: p.paperId ?? 'p-1',
    annotationId: null,
    role: 'first-read',
    question: p.question,
    model: 'test-model',
    quoteText: p.quote,
    prefixText: '',
    suffixText: '',
    anchorPage: p.anchorPage === undefined ? 1 : p.anchorPage,
    contentMd: `内容-${p.id}`,
    createdAt: 't',
    updatedAt: 't'
  }
}

/** 页根：.textLayer 内单 span 全文（重锚管线与生产同构） */
function makePageRoot(text: string): HTMLDivElement {
  const root = document.createElement('div')
  const textLayer = document.createElement('div')
  textLayer.className = 'textLayer'
  const span = document.createElement('span')
  span.textContent = text
  textLayer.appendChild(span)
  root.appendChild(textLayer)
  return root
}

let root: Root | null = null
let host: HTMLDivElement | null = null

function mount(node: JSX.Element): void {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root?.render(node)
  })
}

function remount(node: JSX.Element): void {
  act(() => {
    root?.render(node)
  })
}

const rects = (): NodeListOf<HTMLElement> =>
  host!.querySelectorAll<HTMLElement>('[data-testid="ai-note-rect"]')

beforeEach(() => {
  syncRaf()
  useReaderStore.setState({
    tabs: { 'p-1': makeTab('p-1') },
    order: ['p-1'],
    activeId: 'p-1',
    noteHighlight: null,
    aiNoteHighlight: null
  })
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
  vi.unstubAllGlobals()
})

it('verifyQuote 真：rects 渲染+data-ai-note-id+七问分色（ai-note-style 单源）', () => {
  const pageRoot = makePageRoot('SMART WATER TEST DOC')
  mount(
    <AiAnnotationLayer
      aiNotes={[note({ id: 'n1', question: 'Q1', quote: 'WATER' })]}
      page={0}
      pageRoot={pageRoot}
      onJumpToNote={() => undefined}
    />
  )
  expect(rects().length).toBeGreaterThan(0)
  const r = rects()[0]!
  expect(r.getAttribute('data-ai-note-id')).toBe('n1')
  expect(r.style.background).toBe(QUESTION_COLOR.Q1)
})

it('重锚失败（verifyQuote 假）：该段零 rects 且他段不受扰', () => {
  const pageRoot = makePageRoot('SMART WATER TEST DOC')
  mount(
    <AiAnnotationLayer
      aiNotes={[
        note({ id: 'miss', question: 'Q2', quote: '不存在的引文' }),
        note({ id: 'hit', question: 'Q1', quote: 'WATER' })
      ]}
      page={0}
      pageRoot={pageRoot}
      onJumpToNote={() => undefined}
    />
  )
  const ids = Array.from(rects()).map((r) => r.getAttribute('data-ai-note-id'))
  expect(ids).toEqual(['hit'])
})

it('篇级/无锚行（quoteText 空）不入层', () => {
  const pageRoot = makePageRoot('SMART WATER TEST DOC')
  mount(
    <AiAnnotationLayer
      aiNotes={[note({ id: 'paper-level', question: 'Q7', quote: '', anchorPage: null })]}
      page={0}
      pageRoot={pageRoot}
      onJumpToNote={() => undefined}
    />
  )
  expect(rects().length).toBe(0)
})

it('点击：该段全部 rects 高亮+onJumpToNote 上抛（不弹菜单）', () => {
  const pageRoot = makePageRoot('SMART WATER TEST DOC')
  const onJump = vi.fn()
  mount(
    <AiAnnotationLayer
      aiNotes={[note({ id: 'n1', question: 'Q1', quote: 'WATER' })]}
      page={0}
      pageRoot={pageRoot}
      onJumpToNote={onJump}
    />
  )
  act(() => {
    rects()[0]!.click()
  })
  expect(onJump).toHaveBeenCalledWith('n1')
  for (const r of Array.from(rects())) {
    expect(r.getAttribute('data-highlight')).toBe('true')
  }
  // 只读：无标注菜单/编辑器元素
  expect(host!.querySelectorAll('[data-testid="annotation-menu"], textarea, input').length).toBe(0)
})

it('重锚缓存失效：翻页后按新页重算（anchorPage 不匹配页不渲染）', () => {
  const pageRoot = makePageRoot('SMART WATER TEST DOC')
  // anchorPage=2（1 基）→ 渲染页 index 1；page=0 时不渲染
  const notes = [note({ id: 'n1', question: 'Q1', quote: 'SMART', anchorPage: 2 })]
  mount(
    <AiAnnotationLayer aiNotes={notes} page={0} pageRoot={pageRoot} onJumpToNote={() => undefined} />
  )
  expect(rects().length).toBe(0)
  remount(
    <AiAnnotationLayer aiNotes={notes} page={1} pageRoot={pageRoot} onJumpToNote={() => undefined} />
  )
  expect(rects().length).toBeGreaterThan(0)
})

describe('anchor-locate exact 层延展（data-ai-note-id）', () => {
  let textLayer: HTMLDivElement | null = null
  let target: HTMLElement | null = null

  beforeEach(() => {
    // F-05：滚动副作用消费形 spy 跨用例清账
    scrollerMock.mockClear()
  })

  afterEach(() => {
    textLayer?.remove()
    target?.remove()
    textLayer = null
    target = null
  })

  async function setupTarget(attr: 'data-ai-note-id' | 'data-annotation-id', value: string): Promise<void> {
    textLayer = makePageRoot('SMART WATER TEST DOC')
    document.body.appendChild(textLayer)
    target = document.createElement('div')
    target.setAttribute(attr, value)
    document.body.appendChild(target)
  }

  it('aiNoteId：verifyQuote 成功→exact 滚动+闪烁 data-ai-note-id 元素', async () => {
    await setupTarget('data-ai-note-id', 'n1')
    const result = await locateAnchor({
      paperId: 'p-1',
      anchor: { quoteText: 'WATER', prefixText: '', suffixText: '', anchorPage: 0 },
      aiNoteId: 'n1'
    })
    expect(result).toBe('exact')
    expect(scrollerMock).toHaveBeenCalledWith(target, 'center')
    expect(target!.classList.contains('locate-flash')).toBe(true)
  })

  it('annotationId 既有行为不回归：data-annotation-id 目标仍滚动+闪烁', async () => {
    await setupTarget('data-annotation-id', 'a1')
    const result = await locateAnchor({
      paperId: 'p-1',
      anchor: { quoteText: 'WATER', prefixText: '', suffixText: '', anchorPage: 0 },
      annotationId: 'a1'
    })
    expect(result).toBe('exact')
    expect(scrollerMock).toHaveBeenCalledWith(target, 'center')
    expect(target!.classList.contains('locate-flash')).toBe(true)
  })
})

describe('F-A5 —— AI 段 band 单源（b 面）+色块垫底层序（c 面）', () => {
  it('AI 段垂直=行簇字形带（band 单源——非裸行盒 rects）+层序 z=colorBlocks', () => {
    // gBCR 桩：textLayer (0,0,600,800)/span (30,200,300,16)；canvas 度量桩
    // asc10/desc3/fAsc14/fDesc4 → 半前导 −1 基线 213 → band=[203,216]/800
    const boxes = new Map<Element, StubBox>()
    const pageRoot = makePageRoot('SMART WATER TEST DOC')
    const textLayer = pageRoot.querySelector('.textLayer') as HTMLElement
    const span = textLayer.querySelector('span') as HTMLElement
    boxes.set(pageRoot, { x: 0, y: 0, width: 600, height: 800 })
    boxes.set(textLayer, { x: 0, y: 0, width: 600, height: 800 })
    boxes.set(span, { x: 30, y: 200, width: 300, height: 16 })
    stubElementRects(boxes)
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      font: '',
      measureText: () => ({
        actualBoundingBoxAscent: 10,
        actualBoundingBoxDescent: 3,
        fontBoundingBoxAscent: 14,
        fontBoundingBoxDescent: 4
      })
    } as unknown as CanvasRenderingContext2D)
    mount(
      <AiAnnotationLayer
        aiNotes={[note({ id: 'n1', question: 'Q1', quote: 'WATER' })]}
        page={0}
        pageRoot={pageRoot}
        onJumpToNote={() => undefined}
      />
    )
    const layer = host!.querySelector<HTMLElement>('[data-testid="ai-annotation-layer"]')
    expect(layer).not.toBeNull()
    expect(layer!.style.zIndex).toBe(String(PAGE_LAYER_Z.colorBlocks))
    const r = rects()[0]!
    // 修前=裸行盒（jsdom 回退 span 盒 top 25%/height 2%）；band=25.375%/1.625%
    expect(parseFloat(r.style.top)).toBeCloseTo(25.375, 4)
    expect(parseFloat(r.style.height)).toBeCloseTo(1.625, 4)
  })
})

// ══ F-A8 门2：AI 段三层编排接线（项几何主链+S4 DOM 回退+域标记）══
// 与 AnnotationLayer 共形（设计书 §1.1 态空间+终裁 CR1/CR3）；数值期望手算
// （viewport [0,0,612,792]/scale=1/字号 10/ascent 0.8；quote='正文'@7..9 落
// item['中段正文内容'] span[5,11) f0=2/6 f1=4/6→rect={105.3333,112,33.3333,10}
// →left=17.2113%/top=14.1414%；jsdom DOM 链兜底=0/0/100% 形态可区分）。
/** 门2 样式（门 0 anchor-item-verify.test 同款） */
const FA8_STYLE: PdfTextStyle = { fontFamily: 'serif', ascent: 0.8, descent: -0.2, vertical: false }

function fa8Item(str: string, y: number): PdfTextItem {
  return { str, dir: 'ltr', width: 100, height: 10, transform: [10, 0, 0, 10, 72, y], fontName: 'g1', hasEOL: false }
}

function fa8Entry(items: PdfTextItem[]): PageItemEntry {
  return {
    page: 1,
    text: { items, styles: { g1: FA8_STYLE }, lang: null },
    geometry: { rotate: 0, view: [0, 0, 612, 792] },
    box: { w: 612, h: 792 }
  }
}

describe('F-A8 门2 —— AI 段三层编排接线（项几何主链+域标记）', () => {
  beforeEach(() => {
    usePageItemsStore.getState().clear()
  })

  /** DOM=单 span 三段拼接（与 items 拼接同串——S1 对账通过）；AI note 带
   *  prefix/suffix 双锚（start=0 漂移重定位语义——AI 行无 startOffset） */
  function anchorNote(): AiNote {
    return {
      ...note({ id: 'n-item', question: 'Q1', quote: '正文' }),
      prefixText: '中段',
      suffixText: '内容'
    }
  }

  it('store 空（S0 缺席）→现状 DOM 链（S4）+域标记 dom', () => {
    const pageRoot = makePageRoot('前文第一段中段正文内容后文第三段')
    mount(
      <AiAnnotationLayer aiNotes={[anchorNote()]} page={0} pageRoot={pageRoot} onJumpToNote={() => undefined} />
    )
    const r = rects()[0]!
    expect(r).not.toBeUndefined()
    expect(r.getAttribute('data-source')).toBe('dom')
    expect(parseFloat(r.style.left)).toBeCloseTo(0, 3)
    expect(parseFloat(r.style.width)).toBeCloseTo(100, 3)
  })

  it('store 注入 entry（S1 通过）→项几何主链（S2）+域标记 item+项几何手算数值', () => {
    const pageRoot = makePageRoot('前文第一段中段正文内容后文第三段')
    usePageItemsStore.getState().setEntry(
      fa8Entry(['前文第一段', '中段正文内容', '后文第三段'].map((str, i) => fa8Item(str, 700 - i * 28)))
    )
    mount(
      <AiAnnotationLayer aiNotes={[anchorNote()]} page={0} pageRoot={pageRoot} onJumpToNote={() => undefined} />
    )
    const r = rects()[0]!
    expect(r).not.toBeUndefined()
    expect(r.getAttribute('data-source')).toBe('item')
    expect(parseFloat(r.style.left)).toBeCloseTo(17.2113, 3)
    expect(parseFloat(r.style.top)).toBeCloseTo(14.1414, 3)
  })

  it('S3b：S1 通过但引文不存在于 items 域→该段零 rects（AI 无存量可回退）', () => {
    const pageRoot = makePageRoot('前文第一段中段正文内容后文第三段')
    usePageItemsStore.getState().setEntry(
      fa8Entry(['前文第一段', '中段正文内容', '后文第三段'].map((str, i) => fa8Item(str, 700 - i * 28)))
    )
    mount(
      <AiAnnotationLayer
        aiNotes={[note({ id: 'miss', question: 'Q2', quote: '不存在的引文' })]}
        page={0}
        pageRoot={pageRoot}
        onJumpToNote={() => undefined}
      />
    )
    expect(rects().length).toBe(0)
  })
})

// [F-A8 门2 回炉 W4] AI 侧 CR1 竞态 fixture（AnnotationLayer 同型——store 空挂载
// →S4 dom；注入 entry→订阅触发重 resolve=项几何产物 item；S0 翻转断言）
describe('F-A8 门2 回炉 W4 —— AI 侧 CR1 store 订阅竞态', () => {
  beforeEach(() => {
    usePageItemsStore.getState().clear()
  })

  it('store 空挂载→S4（dom）；注入 entry→订阅触发重 resolve=项几何产物（item）', () => {
    const pageRoot = makePageRoot('前文第一段中段正文内容后文第三段')
    const n = {
      ...note({ id: 'n-race', question: 'Q1', quote: '正文' }),
      prefixText: '中段',
      suffixText: '内容'
    }
    mount(<AiAnnotationLayer aiNotes={[n]} page={0} pageRoot={pageRoot} onJumpToNote={() => undefined} />)
    const before = rects()[0]!
    expect(before).not.toBeUndefined()
    expect(before.getAttribute('data-source')).toBe('dom')
    act(() => {
      usePageItemsStore.getState().setEntry(
        fa8Entry(['前文第一段', '中段正文内容', '后文第三段'].map((str, i) => fa8Item(str, 700 - i * 28)))
      )
    })
    const after = rects()[0]!
    expect(after).not.toBeUndefined()
    expect(after.getAttribute('data-source')).toBe('item')
    expect(parseFloat(after.style.left)).toBeCloseTo(17.2113, 3)
  })
})
