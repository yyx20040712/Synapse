// @vitest-environment jsdom
/**
 * [P7E-03] 页内高亮搜索 —— UI 面（锁定合约，always-active）。
 *
 * 覆盖：ReaderSearchBox 键位三件（Enter 提交/再按下一处/改词重提交、Shift+Enter
 * 上一处、Esc 关闭）+计数展示三态（searching 文案/0 命中文案/序数）+focusSeq
 * 聚焦全选+‹›× 三按钮；SearchHighlightLayer done 态按页过滤渲染+active 强调
 * 属性+几何样式（Range.getClientRects 桩——clientRects 零长面=渲染存在性与
 * px 样式断言，真几何归 e2e）+idle/searching 零渲染+span 数不符跳过；
 * ReaderToolbar slot 传/不传两态（缺席=旧占位 span 兜底）。
 * 形态 crib selection-mode.test.tsx（store setState 直植/mount/remount）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineRangeClientRects, domRect } from '../../utils/geometry'
import { ReaderSearchBox } from '../../../src/renderer/features/reader/view/ReaderSearchBox'
import { SearchHighlightLayer } from '../../../src/renderer/features/reader/view/SearchHighlightLayer'
import { ReaderToolbar } from '../../../src/renderer/features/reader/view/ReaderToolbar'
import {
  createReaderSearchInitialState,
  useReaderSearchStore
} from '../../../src/renderer/features/reader/view/reader-search.store'

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

/** 视口盒桩（Range.getClientRects 返回元素——toPageRelative 只读 x/y/width/height）；
 *  domRect 全字段同形（共享 geometry 单源） */

/** 页根桩：.textLayer 内按序 spans（SearchHighlightLayer 量测输入） */
function makeSpans(spanTexts: string[]): HTMLSpanElement[] {
  return spanTexts.map((t) => {
    const s = document.createElement('span')
    s.textContent = t
    return s
  })
}

function makePageRoot(spanTexts: string[]): HTMLDivElement {
  const root = document.createElement('div')
  const layer = document.createElement('div')
  layer.className = 'textLayer'
  for (const s of makeSpans(spanTexts)) layer.appendChild(s)
  root.appendChild(layer)
  return root
}

function searchBoxInput(): HTMLInputElement {
  const el = host!.querySelector<HTMLInputElement>('[data-testid="reader-search-input"]')
  expect(el).not.toBeNull()
  return el!
}

function pressKey(el: HTMLElement, key: string, opts?: { shift?: boolean; ctrl?: boolean; composing?: boolean }): void {
  act(() => {
    const ev = new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      cancelable: true,
      shiftKey: opts?.shift === true,
      ctrlKey: opts?.ctrl === true
    })
    // IME 组合态：jsdom 构造器 init 不保证透传 isComposing——实例级 defineProperty
    // 桩路径等价实现（门一 W2-新 裁定注明的备选形态），React nativeEvent 直读该实例
    if (opts?.composing === true) {
      Object.defineProperty(ev, 'isComposing', { value: true })
    }
    el.dispatchEvent(ev)
  })
}

function boxProps(over: Partial<Parameters<typeof ReaderSearchBox>[0]>): Parameters<typeof ReaderSearchBox>[0] {
  return {
    state: 'open',
    query: '',
    lastSubmitted: '',
    matchCount: 0,
    activeIndex: 0,
    focusSeq: 1,
    onQueryChange: () => undefined,
    onSubmit: () => undefined,
    onPrev: () => undefined,
    onNext: () => undefined,
    onClose: () => undefined,
    ...over
  }
}

/** defineProperty 桩句柄（门一 N4：afterEach 显式还原不裸留） */
let rangeRectsStub: { mock: ReturnType<typeof vi.fn>; restore(): void } | null = null
let origScrollIntoView: PropertyDescriptor | undefined

beforeEach(() => {
  ;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
  // rAF 同步化（jsdom 假帧——量测 effect 即时收敛）
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback): number => {
    cb(0)
    return 0
  })
  // Range 几何桩：jsdom 无 getClientRects 实现（定义注入）；真布局归 e2e——
  // jsdom 只断渲染存在性与 px 样式映射
  rangeRectsStub = defineRangeClientRects(
    (): DOMRectList => [domRect(110, 60, 40, 12)] as unknown as DOMRectList
  )
  // scrollIntoView jsdom 无实现——active 居中路径的可观测桩
  origScrollIntoView = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollIntoView')
  Object.defineProperty(Element.prototype, 'scrollIntoView', { value: vi.fn(), configurable: true })
  useReaderSearchStore.setState(createReaderSearchInitialState())
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  // 门一 N4：defineProperty 桩按原 descriptor 显式还原（原无实现=删属性）
  rangeRectsStub?.restore()
  if (origScrollIntoView === undefined) {
    delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView
  } else {
    Object.defineProperty(Element.prototype, 'scrollIntoView', origScrollIntoView)
  }
  useReaderSearchStore.setState(createReaderSearchInitialState())
})

describe('P7E-03 ReaderSearchBox —— 键位与展示', () => {
  it('Enter 提交：query≠lastSubmitted（或未 done）→ onSubmit(query)，不触发 onNext', () => {
    const onSubmit = vi.fn()
    const onNext = vi.fn()
    mount(<ReaderSearchBox {...boxProps({ state: 'open', query: 'smart', lastSubmitted: '', onSubmit, onNext })} />)
    pressKey(searchBoxInput(), 'Enter')
    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit).toHaveBeenCalledWith('smart')
    expect(onNext).not.toHaveBeenCalled()
  })

  it('Enter 再按=下一处：done+query===lastSubmitted → onNext（不 onSubmit）', () => {
    const onSubmit = vi.fn()
    const onNext = vi.fn()
    mount(<ReaderSearchBox {...boxProps({ state: 'done', query: 'smart', lastSubmitted: 'smart', matchCount: 3, onSubmit, onNext })} />)
    pressKey(searchBoxInput(), 'Enter')
    expect(onNext).toHaveBeenCalledTimes(1)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('Enter 改词后=重新提交新查询（done+query≠lastSubmitted → onSubmit）', () => {
    const onSubmit = vi.fn()
    const onNext = vi.fn()
    mount(<ReaderSearchBox {...boxProps({ state: 'done', query: 'water', lastSubmitted: 'smart', matchCount: 3, onSubmit, onNext })} />)
    pressKey(searchBoxInput(), 'Enter')
    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit).toHaveBeenCalledWith('water')
    expect(onNext).not.toHaveBeenCalled()
  })

  it('R2-W1 尾空白查询：提交（store 侧已 trim）后 done 再 Enter=onNext（trim 口径一致——旧实现死循环重提交）', () => {
    const onSubmit = vi.fn()
    const onNext = vi.fn()
    mount(<ReaderSearchBox {...boxProps({ state: 'done', query: 'smart ', lastSubmitted: 'smart', matchCount: 3, onSubmit, onNext })} />)
    pressKey(searchBoxInput(), 'Enter')
    expect(onNext).toHaveBeenCalledTimes(1)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('R2-W2 IME 组合态 Enter：零提交零下一处（nativeEvent.isComposing 守卫——拼音确认候选词不进搜索语义）', () => {
    const onSubmit = vi.fn()
    const onNext = vi.fn()
    mount(<ReaderSearchBox {...boxProps({ state: 'done', query: '智慧', lastSubmitted: '智慧', matchCount: 3, onSubmit, onNext })} />)
    pressKey(searchBoxInput(), 'Enter', { composing: true })
    expect(onSubmit).not.toHaveBeenCalled()
    expect(onNext).not.toHaveBeenCalled()
  })

  it('R2-W2 IME 组合态 Esc：不关面板（同守卫——取消候选词≠关闭搜索）', () => {
    const onClose = vi.fn()
    mount(<ReaderSearchBox {...boxProps({ state: 'done', query: '智慧', lastSubmitted: '智慧', matchCount: 3, onClose })} />)
    pressKey(searchBoxInput(), 'Escape', { composing: true })
    expect(onClose).not.toHaveBeenCalled()
  })

  it('Shift+Enter=上一处（同规则：done+同查询 → onPrev；改词则仍提交）', () => {
    const onSubmit = vi.fn()
    const onPrev = vi.fn()
    mount(<ReaderSearchBox {...boxProps({ state: 'done', query: 'smart', lastSubmitted: 'smart', matchCount: 3, onSubmit, onPrev })} />)
    pressKey(searchBoxInput(), 'Enter', { shift: true })
    expect(onPrev).toHaveBeenCalledTimes(1)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('Esc → onClose', () => {
    const onClose = vi.fn()
    mount(<ReaderSearchBox {...boxProps({ onClose })} />)
    pressKey(searchBoxInput(), 'Escape')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('searching 态：计数位显示「搜索中…」', () => {
    mount(<ReaderSearchBox {...boxProps({ state: 'searching', query: 'smart' })} />)
    expect(host!.querySelector('[data-testid="reader-search-count"]')!.textContent).toBe('搜索中…')
  })

  it('done 0 命中：计数「0/0」+「无匹配」提示', () => {
    mount(<ReaderSearchBox {...boxProps({ state: 'done', query: 'zzz', lastSubmitted: 'zzz', matchCount: 0 })} />)
    expect(host!.querySelector('[data-testid="reader-search-count"]')!.textContent).toBe('0/0')
    expect(host!.textContent).toContain('无匹配')
  })

  it('done 命中集：计数 `${activeIndex+1}/${matchCount}`（activeIndex 0 基）', () => {
    mount(<ReaderSearchBox {...boxProps({ state: 'done', query: 'smart', lastSubmitted: 'smart', matchCount: 3, activeIndex: 1 })} />)
    expect(host!.querySelector('[data-testid="reader-search-count"]')!.textContent).toBe('2/3')
  })

  it('focusSeq 变化 → input.focus()+select()（全选 query）', () => {
    mount(<ReaderSearchBox {...boxProps({ state: 'open', query: 'smart', focusSeq: 1 })} />)
    const input = searchBoxInput()
    expect(document.activeElement).toBe(input)
    remount(<ReaderSearchBox {...boxProps({ state: 'open', query: 'smartwater', focusSeq: 2 })} />)
    expect(document.activeElement).toBe(input)
    expect(input.selectionStart).toBe(0)
    expect(input.selectionEnd).toBe('smartwater'.length)
  })

  it('‹ › × 三按钮：aria-label 到位+点击分别调 onPrev/onNext/onClose', () => {
    const onPrev = vi.fn()
    const onNext = vi.fn()
    const onClose = vi.fn()
    mount(<ReaderSearchBox {...boxProps({ state: 'done', matchCount: 2, onPrev, onNext, onClose })} />)
    const byLabel = (label: string): HTMLButtonElement => {
      const b = host!.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)
      expect(b).not.toBeNull()
      return b!
    }
    act(() => {
      byLabel('上一个').click()
    })
    expect(onPrev).toHaveBeenCalledTimes(1)
    act(() => {
      byLabel('下一个').click()
    })
    expect(onNext).toHaveBeenCalledTimes(1)
    act(() => {
      byLabel('关闭搜索').click()
    })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('idle → 零渲染（面板关；受控组件自隐）', () => {
    mount(<ReaderSearchBox {...boxProps({ state: 'idle' })} />)
    expect(host!.querySelector('[data-testid="reader-search-box"]')).toBeNull()
  })
})

describe('P7E-03 SearchHighlightLayer —— 渲染面', () => {
  /** 植入 done 态：两页命中（页 0/页 1 各一）+pageItems 两页 */
  function plantDone(activeIndex: number): void {
    useReaderSearchStore.setState({
      state: 'done',
      query: 'smart',
      lastSubmitted: 'smart',
      matches: [
        { page: 0, itemRanges: [{ itemIndex: 0, s0: 0, s1: 5 }] },
        { page: 1, itemRanges: [{ itemIndex: 1, s0: 2, s1: 7 }] }
      ],
      activeIndex,
      pageItems: {
        0: [
          { str: 'SMART WATER', hasEOL: false, dir: 'ltr', width: 1, height: 1, transform: [], fontName: 'F1' },
          { str: 'x', hasEOL: false, dir: 'ltr', width: 1, height: 1, transform: [], fontName: 'F1' }
        ],
        1: [
          { str: 'a', hasEOL: false, dir: 'ltr', width: 1, height: 1, transform: [], fontName: 'F1' },
          { str: 'b SMART c', hasEOL: false, dir: 'ltr', width: 1, height: 1, transform: [], fontName: 'F1' }
        ]
      },
      focusSeq: 1
    })
  }

  it('done 态按页过滤渲染：本页匹配产 hl 块+px 几何（toPageRelative 数学）+active 强调', () => {
    plantDone(0)
    const pageRoot = makePageRoot(['SMART WATER', 'x'])
    // 页根盒偏移桩：视口盒(110,60)−根盒(100,50)=页内相对(10,10)
    vi.spyOn(pageRoot.querySelector('.textLayer')!, 'getBoundingClientRect').mockReturnValue(domRect(100, 50, 612, 792))
    mount(<SearchHighlightLayer page={0} pageRoot={pageRoot} />)
    const hls = host!.querySelectorAll<HTMLElement>('[data-testid="search-hl"]')
    expect(hls).toHaveLength(1)
    expect(hls[0]!.style.left).toBe('10px')
    expect(hls[0]!.style.top).toBe('10px')
    expect(hls[0]!.style.width).toBe('40px')
    expect(hls[0]!.style.height).toBe('12px')
    // S3：首匹配 active——data-active 强调属性+accent 描边+层序/穿透
    expect(hls[0]!.getAttribute('data-active')).toBe('true')
    expect(hls[0]!.style.outline).toContain('var(--accent)')
    const layer = host!.querySelector<HTMLElement>('[data-testid="search-highlight-layer"]')!
    expect(layer.style.zIndex).toBe('1')
    expect(layer.style.pointerEvents).toBe('none')
    expect(hls[0]!.style.backgroundColor).toBe('var(--accent-soft)')
  })

  it('active 匹配切换：activeIndex=1 时本页（页 0）块非 active；居中滚动只滚 active 块', () => {
    plantDone(0)
    const pageRoot = makePageRoot(['SMART WATER', 'x'])
    mount(<SearchHighlightLayer page={0} pageRoot={pageRoot} />)
    const hl = host!.querySelector<HTMLElement>('[data-testid="search-hl"]')!
    expect(hl.getAttribute('data-active')).toBe('true')
    const scrollIntoView = Element.prototype.scrollIntoView as ReturnType<typeof vi.fn>
    // 切 active 到页 1：本页块转非 active（强调跟 activeIndex 走）
    act(() => {
      useReaderSearchStore.setState({ activeIndex: 1 })
    })
    const hlAfter = host!.querySelector<HTMLElement>('[data-testid="search-hl"]')!
    expect(hlAfter.getAttribute('data-active')).toBe('false')
    expect(hlAfter.style.outline).toBe('')
    expect(scrollIntoView).toHaveBeenCalledTimes(1)
  })

  it('idle/searching 态零渲染', () => {
    plantDone(0)
    const pageRoot = makePageRoot(['SMART WATER', 'x'])
    mount(<SearchHighlightLayer page={0} pageRoot={pageRoot} />)
    expect(host!.querySelectorAll('[data-testid="search-hl"]').length).toBeGreaterThan(0)
    act(() => {
      useReaderSearchStore.setState({ state: 'searching' })
    })
    expect(host!.querySelectorAll('[data-testid="search-hl"]')).toHaveLength(0)
    act(() => {
      useReaderSearchStore.setState({ state: 'idle' })
    })
    expect(host!.querySelectorAll('[data-testid="search-hl"]')).toHaveLength(0)
  })

  it('span 数不符（items 3 vs spans 2）→ 该页跳过高亮（防御：只计数不渲染）', () => {
    useReaderSearchStore.setState({
      state: 'done',
      query: 'smart',
      lastSubmitted: 'smart',
      matches: [{ page: 0, itemRanges: [{ itemIndex: 2, s0: 0, s1: 5 }] }],
      activeIndex: 0,
      pageItems: {
        0: [
          { str: 'a', hasEOL: false, dir: 'ltr', width: 1, height: 1, transform: [], fontName: 'F1' },
          { str: 'b', hasEOL: false, dir: 'ltr', width: 1, height: 1, transform: [], fontName: 'F1' },
          { str: 'c', hasEOL: false, dir: 'ltr', width: 1, height: 1, transform: [], fontName: 'F1' }
        ]
      },
      focusSeq: 1
    })
    mount(<SearchHighlightLayer page={0} pageRoot={makePageRoot(['a', 'b'])} />)
    expect(host!.querySelectorAll('[data-testid="search-hl"]')).toHaveLength(0)
  })

  it('匹配在别页：本页层零渲染（按页过滤）', () => {
    plantDone(0)
    mount(<SearchHighlightLayer page={2} pageRoot={makePageRoot(['别的页'])} />)
    expect(host!.querySelectorAll('[data-testid="search-hl"]')).toHaveLength(0)
  })

  it('S11 文本层重渲（zoom 重排同型：replaceChildren+重挂 span）→MutationObserver+rAF 重算：块仍在+几何随新 clientRects 更新', async () => {
    plantDone(0)
    const pageRoot = makePageRoot(['SMART WATER', 'x'])
    mount(<SearchHighlightLayer page={0} pageRoot={pageRoot} />)
    const hlBefore = host!.querySelector<HTMLElement>('[data-testid="search-hl"]')!
    expect(hlBefore).not.toBeNull()
    expect(hlBefore.style.left).toBe('110px')
    expect(hlBefore.style.width).toBe('40px')
    // 重排后的新视口几何（clientRects 桩换返回值）
    rangeRectsStub!.mock.mockImplementation(
      (): DOMRectList => [domRect(220, 120, 80, 20)] as unknown as DOMRectList
    )
    // zoom 重渲模拟：TextLayer effect 的 container.replaceChildren()+span 重挂同型
    const layer = pageRoot.querySelector('.textLayer')!
    await act(async () => {
      layer.replaceChildren(...makeSpans(['SMART WATER', 'x']))
      await Promise.resolve()
    })
    const hlAfter = host!.querySelector<HTMLElement>('[data-testid="search-hl"]')!
    expect(hlAfter).not.toBeNull()
    expect(hlAfter.style.left).toBe('220px')
    expect(hlAfter.style.top).toBe('120px')
    expect(hlAfter.style.width).toBe('80px')
    expect(hlAfter.style.height).toBe('20px')
  })

  it('W2 居中记账入 store：层卸载重挂+同 matches 同 activeIndex → scrollIntoView 不再触发（跨实例生效）', () => {
    plantDone(0)
    const pageRoot = makePageRoot(['SMART WATER', 'x'])
    mount(<SearchHighlightLayer page={0} pageRoot={pageRoot} />)
    const scrollIntoView = Element.prototype.scrollIntoView as ReturnType<typeof vi.fn>
    expect(scrollIntoView).toHaveBeenCalledTimes(1)
    // 卸载重挂（懒渲染窗口换出换入——层实例重建，实例级记账会归零复活）
    act(() => {
      root?.unmount()
    })
    host!.remove()
    mount(<SearchHighlightLayer page={0} pageRoot={pageRoot} />)
    expect(host!.querySelectorAll('[data-testid="search-hl"]')).toHaveLength(1)
    expect(scrollIntoView).toHaveBeenCalledTimes(1)
  })
})

describe('P7E-03 ReaderToolbar —— searchBox slot', () => {
  function toolbarProps(): Parameters<typeof ReaderToolbar>[0] {
    return {
      page: 0,
      totalPages: 10,
      zoom: 1,
      color: 'yellow',
      onNavigate: () => undefined,
      onZoom: () => undefined,
      onColor: () => undefined
    }
  }

  it('不传 searchBox：旧占位 span 兜底（受锁测试夹具路径零破坏）', () => {
    mount(<ReaderToolbar {...toolbarProps()} />)
    expect(host!.textContent).toContain('全库检索请回文献库')
  })

  it('传 searchBox：渲染 slot 内容+占位缺席（生产装配面恒传）', () => {
    mount(<ReaderToolbar {...toolbarProps()} searchBox={<b data-testid="slot-probe">搜索面板</b>} />)
    expect(host!.querySelector('[data-testid="slot-probe"]')).not.toBeNull()
    expect(host!.textContent).not.toContain('全库检索请回文献库')
  })
})
