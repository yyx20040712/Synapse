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
import type { AiNote } from '../../../src/shared/models/ai-note'
import { AiAnnotationLayer } from '../../../src/renderer/features/reader/AiAnnotationLayer'
import { locateAnchor } from '../../../src/renderer/features/reader/anchor-locate'
import { useReaderStore, type TabState } from '../../../src/renderer/features/reader/reader.store'
import { QUESTION_COLOR } from '../../../src/renderer/features/reader/ai-note-style'

// F-05：flashElement 滚动副作用替身（数学在 scroll-converge.test 锚定）
const { scrollerMock } = vi.hoisted(() => ({ scrollerMock: vi.fn() }))
vi.mock('../../../src/renderer/features/reader/scroll-converge', () => ({
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
