// @vitest-environment jsdom
/**
 * [SR2-C-05] anchor-locate —— N1 锚点定位服务锁定测试（INV-20 三层防线单入口）。
 * 覆盖：S1 已开同页 exact 快路径/S2 已开跨页（setPage→文本层就绪→验证）/
 * S3 verifyQuote 失败→page 降级+提示/S4 篇级 paper/S5 未开 opening 全链/
 * S6 opening 超时降级/S7 打开失败（error）作废无提示/S8 并发后到胜（序号守卫）/
 * S9 opening 中被关（seen→absent）作废无提示（票面 S6 行两形态）。
 */
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { locateAnchor, LOCATE_OPEN_TIMEOUT_MS } from '../../../src/renderer/features/reader/anchor-locate'
import { useReaderStore, type TabState } from '../../../src/renderer/features/reader/reader.store'
import { OPEN_PAPER_EVENT } from '../../../src/renderer/shared/open-paper-bus'
import { guardedDescribe } from '../../utils/guard'

const { toastSpy } = vi.hoisted(() => ({ toastSpy: vi.fn() }))
vi.mock('../../../src/renderer/shared/ui/toast-store', () => ({ showToast: toastSpy }))
vi.mock('../../../src/renderer/api/client', () => ({
  api: { reader: { saveProgress: vi.fn(async () => ({ ok: true, data: null })) } },
  unwrap: vi.fn(),
  ApiClientError: class extends Error {}
}))

function makeTab(id: string, page = 0): TabState {
  return {
    paperId: id,
    fileUrl: `app-file://${id}`,
    fileName: `${id}.pdf`,
    title: '',
    page,
    totalPages: 10,
    zoom: 1,
    color: 'yellow',
    annotations: [],
    status: 'ready',
    dirty: false
  }
}

/** 构造页根+文本层（单页视图：document 内唯一 .textLayer——与 ReaderPage 结构同型） */
function mountTextLayer(text: string): HTMLElement {
  const root = document.createElement('div')
  root.innerHTML = `<div class="textLayer"><span>${text}</span></div>`
  document.body.appendChild(root)
  return root
}

/** 目标锚元素（AnnotationLayer rect 的替身——data-annotation-id 锚定） */
function mountAnchorEl(id: string): HTMLElement {
  const el = document.createElement('div')
  el.setAttribute('data-annotation-id', id)
  document.body.appendChild(el)
  return el
}

const anchorOf = (quote: string, page: number) => ({
  quoteText: quote,
  prefixText: '',
  suffixText: '',
  anchorPage: page
})

let scrollIntoView: ReturnType<typeof vi.fn>
let originalScroll: Element["scrollIntoView"] | undefined

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  useReaderStore.setState({ tabs: {}, order: [], activeId: null, noteHighlight: null })
  useReaderStore.getState().openPaper = vi.fn(async () => undefined)
  scrollIntoView = vi.fn()
  originalScroll = Element.prototype.scrollIntoView
  Element.prototype.scrollIntoView = scrollIntoView
})

afterEach(() => {
  document.body.innerHTML = ''
  if (originalScroll !== undefined) Element.prototype.scrollIntoView = originalScroll
  vi.useRealTimers()
})

guardedDescribe('SR2-C-05', 'anchor-locate —— INV-20 三层防线', () => {
  it('S1 已开同页：verifyQuote 成功→exact（滚动+闪烁类）', async () => {
    useReaderStore.setState({ tabs: { 'p-1': makeTab('p-1') }, order: ['p-1'], activeId: 'p-1' })
    mountTextLayer('Hello locate world')
    const el = mountAnchorEl('a-1')
    const r = await locateAnchor({ paperId: 'p-1', annotationId: 'a-1', anchor: anchorOf('locate', 0) })
    expect(r).toBe('exact')
    expect(scrollIntoView).toHaveBeenCalled()
    expect(el.classList.contains('locate-flash')).toBe(true)
    expect(toastSpy).not.toHaveBeenCalled()
  })

  it('S2 已开跨页：setPage(annotation.page)→文本层就绪→exact', async () => {
    useReaderStore.setState({ tabs: { 'p-1': makeTab('p-1', 0) }, order: ['p-1'], activeId: 'p-1' })
    mountTextLayer('target quote here')
    mountAnchorEl('a-2')
    const r = await locateAnchor({ paperId: 'p-1', annotationId: 'a-2', anchor: anchorOf('target quote', 3) })
    expect(r).toBe('exact')
    expect(useReaderStore.getState().tabs['p-1']?.page).toBe(3)
  })

  it('S3 verifyQuote 失败：page 降级（停留该页+toast 锚定失效提示）', async () => {
    useReaderStore.setState({ tabs: { 'p-1': makeTab('p-1', 0) }, order: ['p-1'], activeId: 'p-1' })
    mountTextLayer('completely different text')
    const p = locateAnchor({ paperId: 'p-1', anchor: anchorOf('gone quote', 5) })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3200)
    })
    const r = await p
    expect(r).toBe('page')
    expect(useReaderStore.getState().tabs['p-1']?.page).toBe(5)
    expect(toastSpy).toHaveBeenCalledWith('锚定失效，已定位到所在页', 'info')
    expect(scrollIntoView).not.toHaveBeenCalled()
  })

  it('S4 篇级（anchor=null）：paper（回开篇）', async () => {
    useReaderStore.setState({ tabs: { 'p-1': makeTab('p-1', 4) }, order: ['p-1'], activeId: 'p-1' })
    const r = await locateAnchor({ paperId: 'p-1', anchor: null })
    expect(r).toBe('paper')
    expect(useReaderStore.getState().tabs['p-1']?.page).toBe(0)
    expect(toastSpy).not.toHaveBeenCalled()
  })

  it('S5 未开：requestOpenPaper（总线事件）→等 ready→activating→exact 全链', async () => {
    mountTextLayer('cross view quote')
    mountAnchorEl('a-5')
    const events: string[] = []
    window.addEventListener(OPEN_PAPER_EVENT, (e) => events.push((e as CustomEvent).detail?.paperId))
    const p = locateAnchor({ paperId: 'p-9', annotationId: 'a-5', anchor: anchorOf('cross view', 0) })
    // opening：模拟异步打开落地（ReaderPage 真实路径——测试直接置 ready）
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60)
    })
    useReaderStore.setState((s) => ({
      tabs: { ...s.tabs, 'p-9': makeTab('p-9') },
      order: [...s.order, 'p-9'],
      activeId: 'p-9'
    }))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200)
    })
    const r = await p
    expect(events).toEqual(['p-9'])
    expect(r).toBe('exact')
    expect(scrollIntoView).toHaveBeenCalled()
  })

  it('S6 opening 超时：降级 paper+超时提示（不抛错）', async () => {
    const p = locateAnchor({ paperId: 'p-x', anchor: anchorOf('anything', 2) })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(LOCATE_OPEN_TIMEOUT_MS + 200)
    })
    const r = await p
    expect(r).toBe('paper')
    expect(toastSpy).toHaveBeenCalledWith('打开文献超时，已停在当前视图', 'info')
  })

  it('S7 目标 tab 打开失败（status=error）：作废=paper 无提示（失败已由 ReaderPage toast）', async () => {
    const p = locateAnchor({ paperId: 'p-7', anchor: anchorOf('zzz', 1) })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60)
    })
    // 模拟打开失败落地：占位 tab 置 error（真实链=ReaderPage openPaper catch）
    useReaderStore.setState((s) => ({
      tabs: { ...s.tabs, 'p-7': { ...makeTab('p-7'), status: 'error' } },
      order: [...s.order, 'p-7'],
      activeId: 'p-7'
    }))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200)
    })
    const r = await p
    expect(r).toBe('paper')
    expect(toastSpy).not.toHaveBeenCalled()
  })

  it('S9 opening 中被关（seen→absent）：作废=paper 无提示（区别于超时——票面 S6 行）', async () => {
    const p = locateAnchor({ paperId: 'p-7', anchor: anchorOf('zzz', 1) })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60)
    })
    // 模拟打开途中被关：tab 先出现（loading）再消失
    useReaderStore.setState((s) => ({
      tabs: { ...s.tabs, 'p-7': { ...makeTab('p-7'), status: 'loading' } },
      order: [...s.order, 'p-7'],
      activeId: 'p-7'
    }))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60)
    })
    useReaderStore.setState((s) => {
      const next = { ...s.tabs }
      delete next['p-7']
      return { tabs: next, order: s.order.filter((x) => x !== 'p-7'), activeId: null }
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200)
    })
    const r = await p
    expect(r).toBe('paper')
    expect(toastSpy).not.toHaveBeenCalled()
  })

  it('S8 并发后到胜：旧请求副作用被序号守卫截断（不滚动不闪烁），视觉收敛后到者', async () => {
    useReaderStore.setState({ tabs: { 'p-1': makeTab('p-1') }, order: ['p-1'], activeId: 'p-1' })
    mountTextLayer('alpha beta gamma')
    const elA = mountAnchorEl('a-a')
    const elB = mountAnchorEl('a-b')
    // A 引文缺席：首轮同步验证失败→进入轮询睡眠窗（50ms）——B 在此窗内顶替序号
    const pA = locateAnchor({ paperId: 'p-1', anchor: anchorOf('missing-quote', 0) })
    const pB = locateAnchor({ paperId: 'p-1', annotationId: 'a-b', anchor: anchorOf('beta', 0) })
    // 100ms：A 的 50ms 轮询醒来即作废 resolve；B 已同步 exact+闪烁（1200ms 摘除定时器未到）
    const [rA, rB] = await act(async () => {
      await vi.advanceTimersByTimeAsync(100)
      return await Promise.all([pA, pB])
    })
    expect(rA).toBe('paper') // A 醒来时序号已过期：副作用截断，按已到达层作废 resolve
    expect(rB).toBe('exact')
    expect(elA.classList.contains('locate-flash')).toBe(false)
    expect(elB.classList.contains('locate-flash')).toBe(true)
  })
})

/**
 * [SR2-F-02] 页限定回归（受锁扩批 2；always-active——ADR-0017 裁决 3 新测试
 * 不经 guardedDescribe）。F-01 页列后渲染窗（可见±1）内 document 存在多个
 * .textLayer——verifyWhenReady 的全局第一命中=邻页文本层（错误页验证）。
 * 页限定=目标页盒（data-page-root，PageColumn 1 基）内查询。
 */
describe('anchor-locate F-02 页限定（多页列）', () => {
  /** F-01 后阅读器结构：每页盒 data-page-root=N（1 基）内一个 .textLayer */
  function mountPageColumn(pages: ReadonlyArray<[no: number, text: string]>): void {
    for (const [no, text] of pages) {
      const box = document.createElement('div')
      box.setAttribute('data-page-root', String(no))
      box.innerHTML = `<div class="textLayer"><span>${text}</span></div>`
      document.body.appendChild(box)
    }
  }

  it('S10 目标页盒内验证：邻页 textLayer 干扰被页限定挡住（全局第一实现在此红）', async () => {
    useReaderStore.setState({ tabs: { 'p-1': makeTab('p-1') }, order: ['p-1'], activeId: 'p-1' })
    // 页盒 1（邻页）=诱饵文本；页盒 2（目标，anchorPage=1 0 基）=真实引文
    mountPageColumn([[1, 'decoy neighbor text only'], [2, 'target quote here']])
    mountAnchorEl('a-10')
    const r = await locateAnchor({ paperId: 'p-1', annotationId: 'a-10', anchor: anchorOf('target quote', 1) })
    // 全局第一实现拿到页盒 1 的诱饵层→verifyQuote 失败→3s 超时降级 page；
    // 页限定实现首轮同步命中页盒 2→exact
    expect(r).toBe('exact')
    expect(scrollIntoView).toHaveBeenCalled()
  })

  it('S11 邻页恰含引文也不误 exact：目标页盒内验证失败→page 降级+提示（半页错锚防护）', async () => {
    useReaderStore.setState({ tabs: { 'p-1': makeTab('p-1') }, order: ['p-1'], activeId: 'p-1' })
    // 邻页（页盒 1）恰含引文——全局第一实现会误命中错页 exact；页限定只在页盒 2 验证
    mountPageColumn([[1, 'target quote here'], [2, 'unrelated body text']])
    const p = locateAnchor({ paperId: 'p-1', anchor: anchorOf('target quote', 1) })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3200)
    })
    const r = await p
    expect(r).toBe('page')
    expect(useReaderStore.getState().tabs['p-1']?.page).toBe(1)
    expect(toastSpy).toHaveBeenCalledWith('锚定失效，已定位到所在页', 'info')
  })
})
